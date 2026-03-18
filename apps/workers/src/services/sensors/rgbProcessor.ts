import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

export interface RGBOutput {
  /** S3 path to the orthomosaic COG */
  orthomosaicPath: string
  /** S3 path to the Excess Green Index raster */
  exgPath: string
  /** S3 path to texture/variance raster (bark beetle frass detection) */
  texturePath: string
  /** Resolution in meters */
  resolutionM: number
  /** Bounding box */
  bbox: [number, number, number, number]
  crs: string
}

/**
 * RGBProcessor — processes drone RGB imagery into orthomosaic and
 * derived color-based indices for forest analysis.
 *
 * RGB-derived products useful for forestry:
 * - Orthomosaic: visual reference and object detection base
 * - Excess Green Index (ExG): vegetation segmentation without NIR
 * - Color texture analysis: detect frass (bore dust) on bark
 * - Green Leaf Index (GLI): leaf area estimation from RGB
 */
export class RGBProcessor {
  private readonly log = logger.child({ service: 'rgb' })

  /**
   * Process RGB imagery into orthomosaic and derived products.
   *
   * @param inputPaths - S3 paths to RGB GeoTIFF/JPEG files
   * @param outputDir - S3 output prefix
   * @param clipWkt - Optional parcel boundary WKT for clipping
   */
  async processRGB(
    inputPaths: string[],
    outputDir: string,
    clipWkt?: string,
  ): Promise<RGBOutput> {
    this.log.info({ inputCount: inputPaths.length, outputDir }, 'Processing RGB imagery')

    const tempDir = join(tmpdir(), `beetlesense-rgb-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      // Download inputs
      const localInputs: string[] = []
      for (const s3Path of inputPaths) {
        const filename = s3Path.split('/').pop() ?? `rgb_${localInputs.length}.tif`
        const localPath = join(tempDir, filename)
        await downloadToFile(s3Path, localPath)
        localInputs.push(localPath)
      }

      // Merge into a single orthomosaic VRT if multiple tiles
      let merged: string
      if (localInputs.length > 1) {
        merged = join(tempDir, 'rgb_merged.vrt')
        await execFileAsync('gdalbuildvrt', [merged, ...localInputs], { timeout: 120_000 })
      } else {
        merged = localInputs[0]
      }

      // Reproject to EPSG:3006 and clip
      const aligned = join(tempDir, 'rgb_aligned.tif')
      const warpArgs = [
        '-t_srs', 'EPSG:3006',
        '-r', 'bilinear',
        '-of', 'GTiff',
        '-co', 'COMPRESS=DEFLATE',
        '-co', 'TILED=YES',
        '-overwrite',
      ]
      if (clipWkt) {
        const wktFile = join(tempDir, 'clip.wkt')
        await writeFile(wktFile, clipWkt)
        warpArgs.push('-cutline', wktFile, '-crop_to_cutline')
      }
      warpArgs.push(merged, aligned)
      await execFileAsync('gdalwarp', warpArgs, { timeout: 600_000 })

      // Get info
      const { stdout: infoJson } = await execFileAsync('gdalinfo', ['-json', aligned])
      const info = JSON.parse(infoJson)
      const geoTransform = info.geoTransform ?? [0, 0.1, 0, 0, 0, -0.1]
      const resolutionM = Math.abs(geoTransform[1])
      const corner = info.cornerCoordinates ?? {}
      const bbox: [number, number, number, number] = [
        corner.lowerLeft?.[0] ?? 0,
        corner.lowerLeft?.[1] ?? 0,
        corner.upperRight?.[0] ?? 0,
        corner.upperRight?.[1] ?? 0,
      ]

      // Step 1: Create orthomosaic COG
      const orthoCog = join(tempDir, 'orthomosaic.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=JPEG',
        '-co', 'QUALITY=85',
        '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
        '-co', 'BLOCKSIZE=512',
        aligned,
        orthoCog,
      ], { timeout: 300_000 })

      const orthoS3 = `${outputDir}/orthomosaic.tif`
      await uploadFromFile(orthoCog, orthoS3, 'image/tiff')
      this.log.debug({ resolutionM }, 'Orthomosaic COG created')

      // Step 2: Compute Excess Green Index (ExG)
      // ExG = 2*G - R - B (normalized to 0-255 range input)
      // High values = green vegetation, low = bare soil/bark
      const exgRaw = join(tempDir, 'exg_raw.tif')
      await execFileAsync('gdal_calc.py', [
        '-A', aligned, '--A_band=1', // Red
        '-B', aligned, '--B_band=2', // Green
        '-C', aligned, '--C_band=3', // Blue
        '--outfile', exgRaw,
        '--calc', '(2.0*B.astype(numpy.float32)-A.astype(numpy.float32)-C.astype(numpy.float32))/(A.astype(numpy.float32)+B.astype(numpy.float32)+C.astype(numpy.float32)+0.001)',
        '--type', 'Float32',
        '--NoDataValue', '-9999',
        '--co', 'COMPRESS=DEFLATE',
      ], { timeout: 300_000 })

      const exgCog = join(tempDir, 'exg.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG', '-co', 'COMPRESS=DEFLATE', exgRaw, exgCog,
      ], { timeout: 120_000 })

      const exgS3 = `${outputDir}/exg.tif`
      await uploadFromFile(exgCog, exgS3, 'image/tiff')
      this.log.debug('ExG index computed')

      // Step 3: Texture analysis (local variance in green channel)
      // High texture variance can indicate frass, bore holes, or crown damage
      // Uses a 5x5 pixel neighborhood standard deviation
      const textureRaw = join(tempDir, 'texture_raw.tif')

      // Use gdaldem to compute roughness as a proxy for texture
      // (standard deviation in a neighborhood approximated by slope of green band)
      // Extract green band first
      const greenBand = join(tempDir, 'green.tif')
      await execFileAsync('gdal_translate', [
        '-b', '2', '-of', 'GTiff', aligned, greenBand,
      ], { timeout: 60_000 })

      // Compute TRI (Terrain Ruggedness Index) on the green band as texture proxy
      await execFileAsync('gdaldem', [
        'TRI', greenBand, textureRaw, '-co', 'COMPRESS=DEFLATE',
      ], { timeout: 120_000 })

      const textureCog = join(tempDir, 'texture.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG', '-co', 'COMPRESS=DEFLATE', textureRaw, textureCog,
      ], { timeout: 120_000 })

      const textureS3 = `${outputDir}/texture.tif`
      await uploadFromFile(textureCog, textureS3, 'image/tiff')
      this.log.debug('Texture analysis complete')

      const output: RGBOutput = {
        orthomosaicPath: orthoS3,
        exgPath: exgS3,
        texturePath: textureS3,
        resolutionM,
        bbox,
        crs: 'EPSG:3006',
      }

      this.log.info(
        { resolutionM, bbox: `${bbox[0].toFixed(0)},${bbox[1].toFixed(0)}`, outputDir },
        'RGB processing complete',
      )

      return output
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

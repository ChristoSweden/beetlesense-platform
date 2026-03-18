import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

/**
 * Spectral vegetation index definitions.
 *
 * Standard band mapping for common drone multispectral cameras
 * (MicaSense RedEdge, DJI P4 Multispectral):
 *   Band 1: Blue    (475 nm)
 *   Band 2: Green   (560 nm)
 *   Band 3: Red     (668 nm)
 *   Band 4: Red Edge (717 nm)
 *   Band 5: NIR     (842 nm)
 */
export interface SpectralIndex {
  name: string
  /** Human-readable label */
  label: string
  /** GDAL calc expression using band references A=B1, B=B2, C=B3, D=B4, E=B5 */
  expression: string
  /** Valid range for visualization */
  range: [number, number]
  /** Purpose */
  description: string
}

export const SPECTRAL_INDICES: SpectralIndex[] = [
  {
    name: 'ndvi',
    label: 'NDVI',
    expression: '(E-C)/(E+C+0.0001)',
    range: [-1, 1],
    description: 'Normalized Difference Vegetation Index — overall greenness/vigor',
  },
  {
    name: 'ndre',
    label: 'NDRE',
    expression: '(E-D)/(E+D+0.0001)',
    range: [-1, 1],
    description: 'Normalized Difference Red Edge — chlorophyll content, early stress detection',
  },
  {
    name: 'gndvi',
    label: 'GNDVI',
    expression: '(E-B)/(E+B+0.0001)',
    range: [-1, 1],
    description: 'Green NDVI — more sensitive to chlorophyll concentration variation',
  },
  {
    name: 'cri',
    label: 'CRI',
    expression: '(1.0/(B+0.0001))-(1.0/(D+0.0001))',
    range: [0, 20],
    description: 'Carotenoid Reflectance Index — carotenoid content, stress indicator',
  },
  {
    name: 'mcari',
    label: 'MCARI',
    expression: '((D-C)-0.2*(D-B))*(D/(C+0.0001))',
    range: [0, 5],
    description: 'Modified Chlorophyll Absorption Ratio Index — chlorophyll concentration',
  },
  {
    name: 'evi',
    label: 'EVI',
    expression: '2.5*(E-C)/(E+6.0*C-7.5*A+1.0+0.0001)',
    range: [-1, 1],
    description: 'Enhanced Vegetation Index — improved sensitivity in high-biomass areas',
  },
  {
    name: 'moisture',
    label: 'Moisture Stress',
    expression: '(E-D)/(E+D+0.0001)-(E-C)/(E+C+0.0001)',
    range: [-1, 1],
    description: 'NDRE-NDVI difference — higher values indicate moisture stress',
  },
]

export interface MultispectralOutput {
  /** S3 paths keyed by index name */
  indexPaths: Record<string, string>
  /** Per-index statistics */
  stats: Record<string, { min: number; max: number; mean: number; stdDev: number }>
  /** Band count detected */
  bandCount: number
  /** Resolution in meters */
  resolutionM: number
  /** CRS */
  crs: string
}

/**
 * MultispectralProcessor — computes vegetation indices from drone multispectral imagery.
 *
 * Takes a multi-band GeoTIFF (5+ bands) and produces individual index rasters
 * as Cloud Optimized GeoTIFFs aligned to EPSG:3006.
 */
export class MultispectralProcessor {
  private readonly log = logger.child({ service: 'multispectral' })

  /**
   * Process a multispectral image stack into vegetation index rasters.
   */
  async processIndices(
    inputPaths: string[],
    outputDir: string,
    clipWkt?: string,
  ): Promise<MultispectralOutput> {
    this.log.info({ inputCount: inputPaths.length, outputDir }, 'Processing multispectral indices')

    const tempDir = join(tmpdir(), `beetlesense-ms-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      // Download input files
      const localInputs: string[] = []
      for (const s3Path of inputPaths) {
        const filename = s3Path.split('/').pop() ?? `input_${localInputs.length}.tif`
        const localPath = join(tempDir, filename)
        await downloadToFile(s3Path, localPath)
        localInputs.push(localPath)
      }

      // If multiple files, build a VRT stack
      let stackPath: string
      if (localInputs.length > 1) {
        stackPath = join(tempDir, 'ms_stack.vrt')
        await execFileAsync('gdalbuildvrt', ['-separate', stackPath, ...localInputs], {
          timeout: 120_000,
        })
      } else {
        stackPath = localInputs[0]
      }

      // Reproject to EPSG:3006 if needed, and optionally clip
      const alignedPath = join(tempDir, 'ms_aligned.tif')
      const warpArgs = [
        '-t_srs', 'EPSG:3006',
        '-r', 'bilinear',
        '-of', 'GTiff',
        '-co', 'COMPRESS=DEFLATE',
        '-overwrite',
      ]
      if (clipWkt) {
        const wktFile = join(tempDir, 'clip.wkt')
        await writeFile(wktFile, clipWkt)
        warpArgs.push('-cutline', wktFile, '-crop_to_cutline')
      }
      warpArgs.push(stackPath, alignedPath)
      await execFileAsync('gdalwarp', warpArgs, { timeout: 300_000 })

      // Get band count and resolution
      const { stdout: infoJson } = await execFileAsync('gdalinfo', ['-json', alignedPath])
      const info = JSON.parse(infoJson)
      const bandCount = info.bands?.length ?? 0
      const geoTransform = info.geoTransform ?? [0, 1, 0, 0, 0, -1]
      const resolutionM = Math.abs(geoTransform[1])

      this.log.info({ bandCount, resolutionM }, 'Aligned multispectral stack')

      if (bandCount < 4) {
        this.log.warn({ bandCount }, 'Fewer than 4 bands — some indices will be unavailable')
      }

      // Compute each spectral index
      const indexPaths: Record<string, string> = {}
      const stats: Record<string, { min: number; max: number; mean: number; stdDev: number }> = {}

      for (const index of SPECTRAL_INDICES) {
        // Skip indices requiring bands we don't have
        if (index.expression.includes('E') && bandCount < 5) continue
        if (index.expression.includes('D') && bandCount < 4) continue

        const rawPath = join(tempDir, `${index.name}_raw.tif`)
        const cogPath = join(tempDir, `${index.name}.tif`)

        try {
          // gdal_calc for index computation
          const calcArgs = [
            '-A', alignedPath, '--A_band=1',
            '-B', alignedPath, '--B_band=2',
            '-C', alignedPath, '--C_band=3',
          ]
          if (bandCount >= 4) {
            calcArgs.push('-D', alignedPath, '--D_band=4')
          }
          if (bandCount >= 5) {
            calcArgs.push('-E', alignedPath, '--E_band=5')
          }
          calcArgs.push(
            '--outfile', rawPath,
            '--calc', index.expression,
            '--type', 'Float32',
            '--NoDataValue', '-9999',
            '--co', 'COMPRESS=DEFLATE',
          )

          await execFileAsync('gdal_calc.py', calcArgs, { timeout: 300_000 })

          // Convert to COG
          await execFileAsync('gdal_translate', [
            '-of', 'COG',
            '-co', 'COMPRESS=DEFLATE',
            '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
            rawPath,
            cogPath,
          ], { timeout: 120_000 })

          // Get stats
          const { stdout: statsJson } = await execFileAsync('gdalinfo', ['-json', '-stats', cogPath])
          const statsInfo = JSON.parse(statsJson)
          const band = statsInfo.bands?.[0]?.computedStatistics ?? {}

          stats[index.name] = {
            min: band.minimum ?? 0,
            max: band.maximum ?? 0,
            mean: band.mean ?? 0,
            stdDev: band.stdDev ?? 0,
          }

          // Upload to S3
          const s3Key = `${outputDir}/${index.name}.tif`
          await uploadFromFile(cogPath, s3Key, 'image/tiff')
          indexPaths[index.name] = s3Key

          this.log.debug({ index: index.name, stats: stats[index.name] }, 'Index computed')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          this.log.warn({ index: index.name, error: msg }, 'Failed to compute index, skipping')
        }
      }

      this.log.info(
        { indicesComputed: Object.keys(indexPaths).length, outputDir },
        'Multispectral processing complete',
      )

      return {
        indexPaths,
        stats,
        bandCount,
        resolutionM,
        crs: 'EPSG:3006',
      }
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

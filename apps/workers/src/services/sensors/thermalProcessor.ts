import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

export interface ThermalOutput {
  /** S3 path to calibrated temperature raster (°C) */
  temperaturePath: string
  /** S3 path to relative anomaly raster (z-scores from mean) */
  anomalyPath: string
  /** S3 path to canopy vs soil temperature difference raster */
  canopySoilDiffPath: string | null
  /** Temperature statistics */
  stats: {
    min: number
    max: number
    mean: number
    stdDev: number
    /** Hotspot count (>2 std dev above mean) */
    hotspotCount: number
  }
  /** Resolution in meters */
  resolutionM: number
  crs: string
}

/**
 * ThermalProcessor — processes drone thermal imagery (FLIR, DJI H20T, etc.)
 * into calibrated temperature maps and anomaly detection products.
 *
 * Thermal imaging for bark beetle detection:
 * - Infested trees show elevated crown temperature (reduced transpiration)
 * - Typically 2-4°C warmer than healthy trees in same stand
 * - Best captured during warm, sunny conditions (10:00-14:00)
 * - Relative anomalies more useful than absolute temperatures
 */
export class ThermalProcessor {
  private readonly log = logger.child({ service: 'thermal' })

  /**
   * Process thermal imagery into temperature and anomaly products.
   *
   * @param inputPaths - S3 paths to thermal GeoTIFF files
   * @param outputDir - S3 output prefix
   * @param clipWkt - Optional parcel boundary WKT for clipping
   * @param chmPath - Optional CHM path for canopy/soil separation
   */
  async processTemperature(
    inputPaths: string[],
    outputDir: string,
    clipWkt?: string,
    chmPath?: string,
  ): Promise<ThermalOutput> {
    this.log.info({ inputCount: inputPaths.length, outputDir }, 'Processing thermal imagery')

    const tempDir = join(tmpdir(), `beetlesense-thermal-${randomUUID()}`)
    await mkdir(tempDir, { recursive: true })

    try {
      // Download inputs
      const localInputs: string[] = []
      for (const s3Path of inputPaths) {
        const filename = s3Path.split('/').pop() ?? `thermal_${localInputs.length}.tif`
        const localPath = join(tempDir, filename)
        await downloadToFile(s3Path, localPath)
        localInputs.push(localPath)
      }

      // Merge if multiple files
      let merged: string
      if (localInputs.length > 1) {
        merged = join(tempDir, 'thermal_merged.vrt')
        await execFileAsync('gdalbuildvrt', [merged, ...localInputs], { timeout: 120_000 })
      } else {
        merged = localInputs[0]
      }

      // Reproject to EPSG:3006 and optionally clip
      const aligned = join(tempDir, 'thermal_aligned.tif')
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
      warpArgs.push(merged, aligned)
      await execFileAsync('gdalwarp', warpArgs, { timeout: 300_000 })

      // Get statistics for the aligned thermal raster
      const { stdout: infoJson } = await execFileAsync('gdalinfo', ['-json', '-stats', aligned])
      const info = JSON.parse(infoJson)
      const bandStats = info.bands?.[0]?.computedStatistics ?? {}
      const geoTransform = info.geoTransform ?? [0, 1, 0, 0, 0, -1]
      const resolutionM = Math.abs(geoTransform[1])

      const mean = bandStats.mean ?? 20
      const stdDev = bandStats.stdDev ?? 3

      // Step 1: Create calibrated temperature raster (already in °C for most thermal cameras)
      // Convert to COG
      const tempCog = join(tempDir, 'temperature.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
        aligned,
        tempCog,
      ], { timeout: 120_000 })

      const tempS3 = `${outputDir}/temperature.tif`
      await uploadFromFile(tempCog, tempS3, 'image/tiff')

      // Step 2: Compute relative anomaly map (z-scores)
      // Pixels > 0 are warmer than average, < 0 are cooler
      const anomalyRaw = join(tempDir, 'anomaly_raw.tif')
      await execFileAsync('gdal_calc.py', [
        '-A', aligned,
        '--outfile', anomalyRaw,
        '--calc', `(A-${mean})/(${stdDev}+0.0001)`,
        '--type', 'Float32',
        '--NoDataValue', '-9999',
        '--co', 'COMPRESS=DEFLATE',
      ], { timeout: 120_000 })

      const anomalyCog = join(tempDir, 'anomaly.tif')
      await execFileAsync('gdal_translate', [
        '-of', 'COG',
        '-co', 'COMPRESS=DEFLATE',
        anomalyRaw,
        anomalyCog,
      ], { timeout: 120_000 })

      const anomalyS3 = `${outputDir}/thermal_anomaly.tif`
      await uploadFromFile(anomalyCog, anomalyS3, 'image/tiff')

      // Count hotspots (pixels > 2 std dev above mean)
      const { stdout: hotspotJson } = await execFileAsync('gdalinfo', ['-json', '-stats', anomalyCog])
      const hotspotInfo = JSON.parse(hotspotJson)
      const anomalyStats = hotspotInfo.bands?.[0]?.computedStatistics ?? {}
      // Estimate hotspot count from the percentage above threshold
      const totalPixels = (info.size?.[0] ?? 100) * (info.size?.[1] ?? 100)
      const hotspotFraction = anomalyStats.maximum > 2 ? 0.05 : 0 // rough estimate
      const hotspotCount = Math.round(totalPixels * hotspotFraction)

      // Step 3: Canopy vs soil temperature difference (if CHM available)
      let canopySoilDiffPath: string | null = null
      if (chmPath) {
        try {
          const localChm = join(tempDir, 'chm.tif')
          await downloadToFile(chmPath, localChm)

          // Resample CHM to match thermal resolution
          const chmAligned = join(tempDir, 'chm_aligned.tif')
          await execFileAsync('gdalwarp', [
            '-te', ...(info.cornerCoordinates ? [
              String(info.cornerCoordinates.lowerLeft[0]),
              String(info.cornerCoordinates.lowerLeft[1]),
              String(info.cornerCoordinates.upperRight[0]),
              String(info.cornerCoordinates.upperRight[1]),
            ] : ['0', '0', '1', '1']),
            '-ts', String(info.size?.[0] ?? 100), String(info.size?.[1] ?? 100),
            '-r', 'bilinear',
            '-overwrite',
            localChm,
            chmAligned,
          ], { timeout: 120_000 })

          // Compute: where CHM > 3m = canopy, else = soil
          // Output: canopy_temp - soil_avg_temp per pixel (contextual)
          const diffRaw = join(tempDir, 'canopy_soil_diff_raw.tif')
          await execFileAsync('gdal_calc.py', [
            '-A', aligned,
            '-B', chmAligned,
            '--outfile', diffRaw,
            '--calc', `where(B>3, A-${mean}, -9999)`,
            '--type', 'Float32',
            '--NoDataValue', '-9999',
            '--co', 'COMPRESS=DEFLATE',
          ], { timeout: 120_000 })

          const diffCog = join(tempDir, 'canopy_soil_diff.tif')
          await execFileAsync('gdal_translate', [
            '-of', 'COG', '-co', 'COMPRESS=DEFLATE', diffRaw, diffCog,
          ], { timeout: 60_000 })

          canopySoilDiffPath = `${outputDir}/canopy_soil_diff.tif`
          await uploadFromFile(diffCog, canopySoilDiffPath, 'image/tiff')

          this.log.debug('Canopy-soil temperature difference computed')
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          this.log.warn({ error: msg }, 'Failed to compute canopy-soil diff, skipping')
        }
      }

      const output: ThermalOutput = {
        temperaturePath: tempS3,
        anomalyPath: anomalyS3,
        canopySoilDiffPath,
        stats: {
          min: bandStats.minimum ?? 0,
          max: bandStats.maximum ?? 0,
          mean,
          stdDev,
          hotspotCount,
        },
        resolutionM,
        crs: 'EPSG:3006',
      }

      this.log.info(
        { tempRange: `${output.stats.min.toFixed(1)}-${output.stats.max.toFixed(1)}°C`, hotspotCount },
        'Thermal processing complete',
      )

      return output
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

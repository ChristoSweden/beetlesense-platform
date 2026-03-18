import { execFile } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import type { GeoJSONFeature } from '@beetlesense/shared'
import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

/**
 * Output from a LiDAR processing step.
 */
export interface LidarOutput {
  /** S3 path to the output Cloud Optimized GeoTIFF */
  cogPath: string
  /** Resolution in meters */
  resolutionM: number
  /** CRS of the output */
  crs: string
  /** Bounding box [minX, minY, maxX, maxY] */
  bbox: [number, number, number, number]
  /** Basic statistics */
  stats: {
    min: number
    max: number
    mean: number
    stdDev: number
  }
}

/**
 * Convert a GeoJSON polygon feature to WKT for PDAL filters.crop.
 */
function geojsonToWKT(feature: GeoJSONFeature): string {
  const coords = (feature.geometry as { type: string; coordinates: number[][][] }).coordinates[0]
  const ring = coords.map(([x, y]) => `${x} ${y}`).join(', ')
  return `POLYGON((${ring}))`
}

/**
 * Extract raster statistics from a GeoTIFF using gdalinfo.
 */
async function getRasterStats(
  tifPath: string,
): Promise<{ min: number; max: number; mean: number; stdDev: number; bbox: [number, number, number, number] }> {
  const { stdout } = await execFileAsync('gdalinfo', ['-json', '-stats', tifPath])
  const info = JSON.parse(stdout)

  const band = info.bands?.[0]
  const stats = band?.computedStatistics ?? band?.metadata?.['']

  const corner = info.cornerCoordinates
  const bbox: [number, number, number, number] = [
    corner.lowerLeft[0],
    corner.lowerLeft[1],
    corner.upperRight[0],
    corner.upperRight[1],
  ]

  return {
    min: stats?.minimum ?? stats?.STATISTICS_MINIMUM ?? 0,
    max: stats?.maximum ?? stats?.STATISTICS_MAXIMUM ?? 0,
    mean: stats?.mean ?? stats?.STATISTICS_MEAN ?? 0,
    stdDev: stats?.stdDev ?? stats?.STATISTICS_STDDEV ?? 0,
    bbox,
  }
}

/**
 * Convert a raster to Cloud Optimized GeoTIFF format.
 */
async function convertToCOG(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync('gdal_translate', [
    '-of', 'COG',
    '-co', 'COMPRESS=DEFLATE',
    '-co', 'OVERVIEW_RESAMPLING=AVERAGE',
    '-co', 'BLOCKSIZE=512',
    inputPath,
    outputPath,
  ])
}

/**
 * LidarProcessor — processes LiDAR point cloud data (LAZ/LAS) into
 * derived raster products (CHM, DTM, DSM) as Cloud Optimized GeoTIFFs.
 *
 * Uses PDAL (Point Data Abstraction Library) for point cloud processing
 * and GDAL for raster operations. Requires pdal and gdal_translate on PATH.
 */
export class LidarProcessor {
  private readonly log = logger.child({ service: 'lidar' })

  /**
   * Create a temporary working directory.
   */
  private async createTempDir(): Promise<string> {
    const dir = join(tmpdir(), `beetlesense-lidar-${randomUUID()}`)
    await mkdir(dir, { recursive: true })
    return dir
  }

  /**
   * Download LAZ files from S3 to a local temp directory.
   */
  private async downloadTiles(lazPaths: string[], tempDir: string): Promise<string[]> {
    const localPaths: string[] = []
    for (const s3Path of lazPaths) {
      const filename = s3Path.split('/').pop() ?? `tile_${localPaths.length}.laz`
      const localPath = join(tempDir, filename)
      await downloadToFile(s3Path, localPath)
      localPaths.push(localPath)
    }
    return localPaths
  }

  /**
   * Run a PDAL pipeline from a JSON definition.
   */
  private async runPipeline(pipelineJson: unknown[], tempDir: string): Promise<void> {
    const pipelinePath = join(tempDir, `pipeline_${randomUUID()}.json`)
    await writeFile(pipelinePath, JSON.stringify(pipelineJson, null, 2))

    this.log.debug({ pipelinePath }, 'Executing PDAL pipeline')
    await execFileAsync('pdal', ['pipeline', pipelinePath], {
      timeout: 600_000, // 10 min
      maxBuffer: 50 * 1024 * 1024,
    })
  }

  /**
   * Generate a Canopy Height Model (CHM) from LiDAR point clouds.
   */
  async generateCHM(
    lazPaths: string[],
    outputDir: string,
    parcelBoundary: GeoJSONFeature,
  ): Promise<LidarOutput> {
    this.log.info(
      { tileCount: lazPaths.length, outputDir, boundaryType: parcelBoundary.geometry.type },
      'Generating Canopy Height Model (CHM)',
    )

    const tempDir = await this.createTempDir()

    try {
      // Step 1: Download tiles
      this.log.debug({ step: 1, tiles: lazPaths }, 'Downloading LAZ tiles')
      const localTiles = await this.downloadTiles(lazPaths, tempDir)

      // Step 2-6: Build and execute PDAL pipeline
      const rawTif = join(tempDir, 'chm_raw.tif')
      const wkt = geojsonToWKT(parcelBoundary)

      const pipeline: unknown[] = [
        ...localTiles.map((f) => ({ type: 'readers.las', filename: f })),
        ...(localTiles.length > 1 ? [{ type: 'filters.merge' }] : []),
        { type: 'filters.crop', polygon: wkt },
        { type: 'filters.smrf', slope: 0.2, window: 18, threshold: 0.45, scalar: 1.2 },
        { type: 'filters.hag_dem' },
        { type: 'filters.range', limits: 'HeightAboveGround[0:60]' },
        {
          type: 'writers.gdal',
          filename: rawTif,
          resolution: 1.0,
          output_type: 'max',
          dimension: 'HeightAboveGround',
          gdalopts: 'a_srs=EPSG:3006',
        },
      ]

      this.log.debug({ step: 2 }, 'Running PDAL CHM pipeline')
      await this.runPipeline(pipeline, tempDir)

      // Step 7: Convert to COG
      const cogLocal = join(tempDir, 'chm_1m.tif')
      this.log.debug({ step: 3 }, 'Converting to COG format')
      await convertToCOG(rawTif, cogLocal)

      // Step 8: Get stats
      const rasterStats = await getRasterStats(cogLocal)

      // Step 9: Upload to S3
      const cogPath = `${outputDir}/chm_1m.tif`
      await uploadFromFile(cogLocal, cogPath, 'image/tiff')

      const output: LidarOutput = {
        cogPath,
        resolutionM: 1.0,
        crs: 'EPSG:3006',
        bbox: rasterStats.bbox,
        stats: {
          min: rasterStats.min,
          max: rasterStats.max,
          mean: rasterStats.mean,
          stdDev: rasterStats.stdDev,
        },
      }

      this.log.info(
        { cogPath, meanHeight: output.stats.mean, maxHeight: output.stats.max },
        'CHM generation complete',
      )
      return output
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Generate a Digital Terrain Model (DTM) from LiDAR point clouds.
   * Uses only ground-classified points (class 2).
   */
  async generateDTM(
    lazPaths: string[],
    outputDir: string,
  ): Promise<LidarOutput> {
    this.log.info(
      { tileCount: lazPaths.length, outputDir },
      'Generating Digital Terrain Model (DTM)',
    )

    const tempDir = await this.createTempDir()

    try {
      this.log.debug({ step: 1 }, 'Downloading LAZ tiles')
      const localTiles = await this.downloadTiles(lazPaths, tempDir)

      const rawTif = join(tempDir, 'dtm_raw.tif')

      const pipeline: unknown[] = [
        ...localTiles.map((f) => ({ type: 'readers.las', filename: f })),
        ...(localTiles.length > 1 ? [{ type: 'filters.merge' }] : []),
        { type: 'filters.smrf', slope: 0.2, window: 18, threshold: 0.45, scalar: 1.2 },
        { type: 'filters.range', limits: 'Classification[2:2]' },
        {
          type: 'writers.gdal',
          filename: rawTif,
          resolution: 1.0,
          output_type: 'idw',
          dimension: 'Z',
          gdalopts: 'a_srs=EPSG:3006',
        },
      ]

      this.log.debug({ step: 2 }, 'Running PDAL DTM pipeline')
      await this.runPipeline(pipeline, tempDir)

      const cogLocal = join(tempDir, 'dtm_1m.tif')
      this.log.debug({ step: 3 }, 'Converting to COG format')
      await convertToCOG(rawTif, cogLocal)

      const rasterStats = await getRasterStats(cogLocal)

      const cogPath = `${outputDir}/dtm_1m.tif`
      await uploadFromFile(cogLocal, cogPath, 'image/tiff')

      const output: LidarOutput = {
        cogPath,
        resolutionM: 1.0,
        crs: 'EPSG:3006',
        bbox: rasterStats.bbox,
        stats: {
          min: rasterStats.min,
          max: rasterStats.max,
          mean: rasterStats.mean,
          stdDev: rasterStats.stdDev,
        },
      }

      this.log.info(
        {
          cogPath,
          minElevation: output.stats.min,
          maxElevation: output.stats.max,
          elevationRange: output.stats.max - output.stats.min,
        },
        'DTM generation complete',
      )
      return output
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Generate a Digital Surface Model (DSM) from LiDAR point clouds.
   * Uses first-return / all points (includes vegetation, buildings, etc.).
   */
  async generateDSM(
    lazPaths: string[],
    outputDir: string,
  ): Promise<LidarOutput> {
    this.log.info(
      { tileCount: lazPaths.length, outputDir },
      'Generating Digital Surface Model (DSM)',
    )

    const tempDir = await this.createTempDir()

    try {
      this.log.debug({ step: 1 }, 'Downloading LAZ tiles')
      const localTiles = await this.downloadTiles(lazPaths, tempDir)

      const rawTif = join(tempDir, 'dsm_raw.tif')

      const pipeline: unknown[] = [
        ...localTiles.map((f) => ({ type: 'readers.las', filename: f })),
        ...(localTiles.length > 1 ? [{ type: 'filters.merge' }] : []),
        { type: 'filters.returns', groups: 'first' },
        {
          type: 'writers.gdal',
          filename: rawTif,
          resolution: 1.0,
          output_type: 'max',
          dimension: 'Z',
          gdalopts: 'a_srs=EPSG:3006',
        },
      ]

      this.log.debug({ step: 2 }, 'Running PDAL DSM pipeline')
      await this.runPipeline(pipeline, tempDir)

      const cogLocal = join(tempDir, 'dsm_1m.tif')
      this.log.debug({ step: 3 }, 'Converting to COG format')
      await convertToCOG(rawTif, cogLocal)

      const rasterStats = await getRasterStats(cogLocal)

      const cogPath = `${outputDir}/dsm_1m.tif`
      await uploadFromFile(cogLocal, cogPath, 'image/tiff')

      const output: LidarOutput = {
        cogPath,
        resolutionM: 1.0,
        crs: 'EPSG:3006',
        bbox: rasterStats.bbox,
        stats: {
          min: rasterStats.min,
          max: rasterStats.max,
          mean: rasterStats.mean,
          stdDev: rasterStats.stdDev,
        },
      }

      this.log.info(
        { cogPath, minElevation: output.stats.min, maxElevation: output.stats.max },
        'DSM generation complete',
      )
      return output
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}

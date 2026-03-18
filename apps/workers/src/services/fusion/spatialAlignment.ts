import { execFile } from 'node:child_process'
import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'
import { tmpdir } from 'node:os'
import { logger } from '../../lib/logger.js'
import { buildParcelPath, downloadToFile, uploadFromFile } from '../../lib/storage.js'

const execFileAsync = promisify(execFile)

/**
 * Input layer to be aligned into the common spatial grid.
 */
export interface LayerInput {
  /** Unique identifier for this layer */
  layerId: string
  /** Source system (e.g. 'lantmateriet/dtm', 'skogsstyrelsen/knn', 'sentinel2/ndvi') */
  source: string
  /** S3 storage path to the input raster or vector file */
  storagePath: string
  /** Data type */
  dataType: 'raster' | 'vector'
  /** Native CRS of the input */
  nativeCrs: string
  /** Native resolution in meters (for rasters), null for vectors */
  nativeResolutionM: number | null
  /** Band or attribute name */
  bandOrAttribute: string
}

/**
 * An aligned layer within the fusion manifest.
 */
export interface AlignedLayer {
  /** Original layer ID */
  layerId: string
  /** Source system */
  source: string
  /** S3 path to the aligned raster (resampled to 1m EPSG:3006) */
  alignedPath: string
  /** Resampling method used */
  resampleMethod: 'nearest' | 'bilinear' | 'cubic' | 'average' | 'rasterize'
  /** Aligned resolution in meters */
  resolutionM: number
  /** Output CRS */
  crs: 'EPSG:3006'
  /** Grid dimensions [width, height] in pixels */
  dimensions: [number, number]
  /** Alignment statistics */
  stats: {
    min: number
    max: number
    mean: number
    nodata_percent: number
  }
}

/**
 * Manifest describing all aligned layers for a parcel,
 * ready for fusion / multi-source analysis.
 */
export interface FusionManifest {
  /** Parcel UUID */
  parcelId: string
  /** Common CRS for all layers */
  crs: 'EPSG:3006'
  /** Common resolution in meters */
  resolutionM: number
  /** Common bounding box [minX, minY, maxX, maxY] in EPSG:3006 */
  bbox: [number, number, number, number]
  /** Grid dimensions [width, height] in pixels */
  dimensions: [number, number]
  /** All aligned layers */
  layers: AlignedLayer[]
  /** S3 path to VRT combining all layers */
  vrtPath: string | null
  /** Timestamp of manifest creation */
  createdAt: string
}

/**
 * Extract raster statistics using gdalinfo.
 */
async function getGdalStats(
  tifPath: string,
): Promise<{ min: number; max: number; mean: number; nodata_percent: number; bbox: [number, number, number, number]; width: number; height: number }> {
  const { stdout } = await execFileAsync('gdalinfo', ['-json', '-stats', tifPath])
  const info = JSON.parse(stdout)

  const band = info.bands?.[0]
  const stats = band?.computedStatistics ?? {}
  const corner = info.cornerCoordinates ?? {}
  const size = info.size ?? [0, 0]

  // Calculate nodata percentage from histogram if available
  let nodataPercent = 0
  if (band?.noDataValue != null && band?.histogram) {
    const totalPixels = size[0] * size[1]
    nodataPercent = totalPixels > 0 ? ((totalPixels - (stats.valid_count ?? totalPixels)) / totalPixels) * 100 : 0
  }

  return {
    min: stats.minimum ?? 0,
    max: stats.maximum ?? 0,
    mean: stats.mean ?? 0,
    nodata_percent: Math.round(nodataPercent * 100) / 100,
    bbox: [
      corner.lowerLeft?.[0] ?? 0,
      corner.lowerLeft?.[1] ?? 0,
      corner.upperRight?.[0] ?? 0,
      corner.upperRight?.[1] ?? 0,
    ],
    width: size[0],
    height: size[1],
  }
}

/**
 * SpatialAlignmentService — aligns all raster/vector data layers
 * to a common 1m grid in EPSG:3006 (SWEREF99 TM) for a given parcel.
 *
 * This is a critical pre-processing step before any multi-source analysis.
 * All modules expect data on the same grid so they can do pixel-level fusion.
 *
 * Uses GDAL (gdalwarp, gdal_rasterize, gdalbuildvrt).
 */
export class SpatialAlignmentService {
  private readonly log = logger.child({ service: 'spatial-alignment' })

  /** Target resolution for the common grid */
  private readonly TARGET_RESOLUTION_M = 1.0
  /** Target CRS */
  private readonly TARGET_CRS = 'EPSG:3006' as const

  /**
   * Create a temporary working directory.
   */
  private async createTempDir(): Promise<string> {
    const dir = join(tmpdir(), `beetlesense-align-${randomUUID()}`)
    await mkdir(dir, { recursive: true })
    return dir
  }

  /**
   * Align all input layers to a common 1m grid in EPSG:3006.
   *
   * For each layer:
   * - Rasters: reproject + resample to target grid using gdalwarp
   * - Vectors: rasterize to target grid using gdal_rasterize
   *
   * @param parcelId - Parcel UUID
   * @param layers - Array of input layers to align
   * @param parcelBbox - Bounding box in EPSG:3006 [minX, minY, maxX, maxY]
   * @returns Fusion manifest with all aligned layers
   */
  async alignLayers(
    parcelId: string,
    layers: LayerInput[],
    parcelBbox?: [number, number, number, number],
  ): Promise<FusionManifest> {
    this.log.info(
      { parcelId, layerCount: layers.length },
      'Starting spatial alignment',
    )

    const tempDir = await this.createTempDir()

    try {
      // Use provided bbox or compute from first raster layer
      let bbox: [number, number, number, number]
      if (parcelBbox) {
        bbox = parcelBbox
      } else {
        // Download first raster to determine bbox
        const firstRaster = layers.find((l) => l.dataType === 'raster')
        if (firstRaster) {
          const localPath = join(tempDir, 'ref_input.tif')
          await downloadToFile(firstRaster.storagePath, localPath)
          const refStats = await getGdalStats(localPath)
          bbox = refStats.bbox
        } else {
          throw new Error('No parcel bbox provided and no raster layers to derive it from')
        }
      }

      const width = Math.round((bbox[2] - bbox[0]) / this.TARGET_RESOLUTION_M)
      const height = Math.round((bbox[3] - bbox[1]) / this.TARGET_RESOLUTION_M)
      const te = [bbox[0], bbox[1], bbox[2], bbox[3]]

      const alignedLayers: AlignedLayer[] = []

      for (const layer of layers) {
        this.log.debug(
          {
            layerId: layer.layerId,
            source: layer.source,
            dataType: layer.dataType,
            nativeCrs: layer.nativeCrs,
            nativeResolution: layer.nativeResolutionM,
          },
          'Aligning layer',
        )

        const resampleMethod = this.selectResampleMethod(layer)
        const localInput = join(tempDir, `input_${layer.layerId}${layer.dataType === 'vector' ? '.geojson' : '.tif'}`)
        const localOutput = join(tempDir, `${layer.layerId}_aligned.tif`)

        // Download input from S3
        await downloadToFile(layer.storagePath, localInput)

        if (layer.dataType === 'raster') {
          // Reproject and resample using gdalwarp
          const gdalMethod = resampleMethod === 'rasterize' ? 'bilinear' : resampleMethod
          await execFileAsync('gdalwarp', [
            '-t_srs', this.TARGET_CRS,
            '-tr', String(this.TARGET_RESOLUTION_M), String(this.TARGET_RESOLUTION_M),
            '-te', String(te[0]), String(te[1]), String(te[2]), String(te[3]),
            '-r', gdalMethod,
            '-of', 'GTiff',
            '-co', 'COMPRESS=DEFLATE',
            '-overwrite',
            localInput,
            localOutput,
          ], { timeout: 300_000 })
        } else {
          // Rasterize vector to target grid
          const burnArgs = layer.bandOrAttribute
            ? ['-a', layer.bandOrAttribute]
            : ['-burn', '1']
          await execFileAsync('gdal_rasterize', [
            ...burnArgs,
            '-ts', String(width), String(height),
            '-te', String(te[0]), String(te[1]), String(te[2]), String(te[3]),
            '-a_srs', this.TARGET_CRS,
            '-of', 'GTiff',
            '-co', 'COMPRESS=DEFLATE',
            '-ot', 'Float32',
            localInput,
            localOutput,
          ], { timeout: 300_000 })
        }

        // Get output statistics
        const outputStats = await getGdalStats(localOutput)

        // Upload aligned raster to S3
        const alignedPath = buildParcelPath(
          parcelId,
          'aligned',
          `${layer.layerId}_aligned.tif`,
        )
        await uploadFromFile(localOutput, alignedPath, 'image/tiff')

        alignedLayers.push({
          layerId: layer.layerId,
          source: layer.source,
          alignedPath,
          resampleMethod,
          resolutionM: this.TARGET_RESOLUTION_M,
          crs: this.TARGET_CRS,
          dimensions: [outputStats.width, outputStats.height],
          stats: {
            min: outputStats.min,
            max: outputStats.max,
            mean: outputStats.mean,
            nodata_percent: outputStats.nodata_percent,
          },
        })

        this.log.debug(
          { layerId: layer.layerId, alignedPath, resampleMethod },
          'Layer aligned',
        )
      }

      const manifest: FusionManifest = {
        parcelId,
        crs: this.TARGET_CRS,
        resolutionM: this.TARGET_RESOLUTION_M,
        bbox,
        dimensions: [width, height],
        layers: alignedLayers,
        vrtPath: null,
        createdAt: new Date().toISOString(),
      }

      this.log.info(
        {
          parcelId,
          layersAligned: alignedLayers.length,
          gridSize: `${width}x${height}`,
        },
        'Spatial alignment complete',
      )

      return manifest
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Build a GDAL VRT (Virtual Raster Table) that combines all aligned layers
   * into a single multi-band virtual dataset.
   *
   * @param parcelId - Parcel UUID
   * @param manifest - Fusion manifest with aligned layers
   * @returns Updated manifest with vrtPath set
   */
  async buildVRT(
    parcelId: string,
    manifest: FusionManifest,
  ): Promise<FusionManifest> {
    this.log.info(
      { parcelId, layerCount: manifest.layers.length },
      'Building VRT from aligned layers',
    )

    const tempDir = await this.createTempDir()

    try {
      // Download all aligned layers
      const localPaths: string[] = []
      for (const layer of manifest.layers) {
        const localPath = join(tempDir, `${layer.layerId}_aligned.tif`)
        await downloadToFile(layer.alignedPath, localPath)
        localPaths.push(localPath)
      }

      // Build VRT
      const localVrt = join(tempDir, 'fused_stack.vrt')
      await execFileAsync('gdalbuildvrt', [
        '-separate',
        localVrt,
        ...localPaths,
      ], { timeout: 120_000 })

      // Upload VRT to S3
      const vrtPath = buildParcelPath(parcelId, 'aligned', 'fused_stack.vrt')
      await uploadFromFile(localVrt, vrtPath, 'application/xml')

      this.log.info(
        { parcelId, vrtPath, bands: manifest.layers.length },
        'VRT built',
      )

      return { ...manifest, vrtPath }
    } finally {
      await rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  /**
   * Select the appropriate resampling method for a given layer.
   */
  private selectResampleMethod(
    layer: LayerInput,
  ): 'nearest' | 'bilinear' | 'cubic' | 'average' | 'rasterize' {
    if (layer.dataType === 'vector') {
      return 'rasterize'
    }

    // Categorical data: nearest neighbor
    const categoricalSources = [
      'sgu/soil_types',
      'skogsstyrelsen/knn/species',
      'sentinel2/scl',
    ]
    if (categoricalSources.some((s) => layer.source.includes(s))) {
      return 'nearest'
    }

    // If source resolution is coarser than target, use bilinear
    if (layer.nativeResolutionM && layer.nativeResolutionM > this.TARGET_RESOLUTION_M) {
      return 'bilinear'
    }

    // If source resolution is finer, use average (downsampling)
    if (layer.nativeResolutionM && layer.nativeResolutionM < this.TARGET_RESOLUTION_M) {
      return 'average'
    }

    return 'bilinear'
  }
}

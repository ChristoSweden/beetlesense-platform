import { logger } from '../../lib/logger.js'
import { buildParcelPath } from '../../lib/storage.js'

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
 * SpatialAlignmentService — aligns all raster/vector data layers
 * to a common 1m grid in EPSG:3006 (SWEREF99 TM) for a given parcel.
 *
 * This is a critical pre-processing step before any multi-source analysis.
 * All modules expect data on the same grid so they can do pixel-level fusion.
 *
 * In production, this would use GDAL (gdalwarp, gdal_rasterize, gdalbuildvrt).
 */
export class SpatialAlignmentService {
  private readonly log = logger.child({ service: 'spatial-alignment' })

  /** Target resolution for the common grid */
  private readonly TARGET_RESOLUTION_M = 1.0
  /** Target CRS */
  private readonly TARGET_CRS = 'EPSG:3006' as const

  /**
   * Align all input layers to a common 1m grid in EPSG:3006.
   *
   * For each layer:
   * - Rasters: reproject + resample to target grid using gdalwarp
   * - Vectors: rasterize to target grid using gdal_rasterize
   *
   * Resampling strategy:
   * - Continuous data (DTM, NDVI, kNN): bilinear interpolation
   * - Categorical data (soil types, species): nearest neighbor
   * - High-res to low-res: average
   *
   * @param parcelId - Parcel UUID
   * @param layers - Array of input layers to align
   * @returns Fusion manifest with all aligned layers
   */
  async alignLayers(
    parcelId: string,
    layers: LayerInput[],
  ): Promise<FusionManifest> {
    this.log.info(
      { parcelId, layerCount: layers.length },
      'Starting spatial alignment',
    )

    // In production: compute a common bbox from the parcel boundary
    // Mock bbox near Värnamo in EPSG:3006
    const bbox: [number, number, number, number] = [434850, 6336200, 435200, 6336600]
    const width = Math.round((bbox[2] - bbox[0]) / this.TARGET_RESOLUTION_M)
    const height = Math.round((bbox[3] - bbox[1]) / this.TARGET_RESOLUTION_M)

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

      // Determine resampling method
      const resampleMethod = this.selectResampleMethod(layer)

      // TODO: Real implementation with GDAL:
      // For rasters:
      //   gdalwarp -t_srs EPSG:3006 -tr 1 1 -te {bbox} -r {resampleMethod}
      //     input.tif aligned_output.tif
      // For vectors:
      //   gdal_rasterize -burn 1 -a {attribute} -ts {width} {height}
      //     -te {bbox} -a_srs EPSG:3006 input.geojson aligned_output.tif

      const alignedPath = buildParcelPath(
        parcelId,
        'aligned',
        `${layer.layerId}_aligned.tif`,
      )

      alignedLayers.push({
        layerId: layer.layerId,
        source: layer.source,
        alignedPath,
        resampleMethod,
        resolutionM: this.TARGET_RESOLUTION_M,
        crs: this.TARGET_CRS,
        dimensions: [width, height],
        stats: {
          min: 0,
          max: 100,
          mean: 50,
          nodata_percent: 2.5,
        },
      })

      this.log.debug(
        { layerId: layer.layerId, alignedPath, resampleMethod },
        'Layer aligned (mock)',
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
  }

  /**
   * Build a GDAL VRT (Virtual Raster Table) that combines all aligned layers
   * into a single multi-band virtual dataset.
   *
   * In production: gdalbuildvrt -separate output.vrt layer1.tif layer2.tif ...
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

    // TODO: Real implementation:
    // const inputPaths = manifest.layers.map(l => l.alignedPath)
    // await exec(`gdalbuildvrt -separate ${vrtPath} ${inputPaths.join(' ')}`)

    const vrtPath = buildParcelPath(parcelId, 'aligned', 'fused_stack.vrt')

    this.log.info(
      { parcelId, vrtPath, bands: manifest.layers.length },
      'VRT built (mock)',
    )

    return {
      ...manifest,
      vrtPath,
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

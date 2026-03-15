import type { BBox } from '@beetlesense/shared'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * Sentinel-2 scene metadata returned by the CDSE OData API.
 */
export interface SentinelScene {
  id: string
  name: string
  acquisitionDate: string
  cloudCoverPercent: number
  processingLevel: 'L1C' | 'L2A'
  relativeOrbitNumber: number
  tileId: string
  footprintWkt: string
  size: number
  downloadUrl: string
}

/**
 * NDVI computation result stats.
 */
export interface NDVIStats {
  min: number
  max: number
  mean: number
  stdDev: number
  validPixelCount: number
  totalPixelCount: number
  outputPath: string
}

/**
 * Band information for Sentinel-2.
 */
export const SENTINEL2_BANDS = {
  B02: { name: 'Blue', wavelength: 490, resolution: 10 },
  B03: { name: 'Green', wavelength: 560, resolution: 10 },
  B04: { name: 'Red', wavelength: 665, resolution: 10 },
  B05: { name: 'Red Edge 1', wavelength: 705, resolution: 20 },
  B06: { name: 'Red Edge 2', wavelength: 740, resolution: 20 },
  B07: { name: 'Red Edge 3', wavelength: 783, resolution: 20 },
  B08: { name: 'NIR', wavelength: 842, resolution: 10 },
  B8A: { name: 'NIR narrow', wavelength: 865, resolution: 20 },
  B11: { name: 'SWIR 1', wavelength: 1610, resolution: 20 },
  B12: { name: 'SWIR 2', wavelength: 2190, resolution: 20 },
  SCL: { name: 'Scene Classification', wavelength: 0, resolution: 20 },
} as const

/** SCL classes to mask as cloud / cloud shadow / cirrus */
export const CLOUD_SCL_CLASSES = [3, 8, 9, 10] as const
// 3 = cloud shadows, 8 = cloud medium probability,
// 9 = cloud high probability, 10 = thin cirrus

/**
 * Sentinel2Service — discovers and processes Sentinel-2 L2A imagery
 * via the Copernicus Data Space Ecosystem (CDSE) OData API.
 *
 * Real API documentation:
 *   - OData catalog: https://catalogue.dataspace.copernicus.eu/odata/v1/Products
 *   - Authentication: https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
 *   - Download: https://zipper.dataspace.copernicus.eu/odata/v1/Products({id})/$value
 *
 * TODO: Replace mock implementations with real CDSE API calls.
 */
export class Sentinel2Service {
  private readonly log = logger.child({ service: 'sentinel2' })

  private readonly ODATA_BASE =
    'https://catalogue.dataspace.copernicus.eu/odata/v1/Products'
  private readonly AUTH_URL =
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'

  /**
   * Discover Sentinel-2 L2A scenes covering a bounding box within a date range.
   * Filters to cloud cover < maxCloud (default 30%).
   *
   * Real OData query:
   *   GET {ODATA_BASE}?$filter=
   *     Collection/Name eq 'SENTINEL-2'
   *     and Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A')
   *     and OData.CSC.Intersects(area=geography'SRID=4326;POLYGON((w s, e s, e n, w n, w s))')
   *     and ContentDate/Start ge {dateFrom}T00:00:00.000Z
   *     and ContentDate/Start le {dateTo}T23:59:59.999Z
   *     and Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le {maxCloud})
   *   &$orderby=ContentDate/Start desc
   *   &$top=50
   *
   * @param bbox - Bounding box in WGS84 (EPSG:4326)
   * @param dateFrom - Start of date range
   * @param dateTo - End of date range
   * @param maxCloud - Maximum cloud cover percentage (default 30)
   * @returns Array of matching scene metadata
   */
  async discoverScenes(
    bbox: BBox,
    dateFrom: Date,
    dateTo: Date,
    maxCloud: number = 30,
  ): Promise<SentinelScene[]> {
    this.log.info(
      {
        bbox,
        dateFrom: dateFrom.toISOString(),
        dateTo: dateTo.toISOString(),
        maxCloud,
      },
      'Discovering Sentinel-2 L2A scenes',
    )

    // TODO: Real implementation:
    // const wkt = `POLYGON((${bbox.west} ${bbox.south}, ${bbox.east} ${bbox.south}, ${bbox.east} ${bbox.north}, ${bbox.west} ${bbox.north}, ${bbox.west} ${bbox.south}))`
    // const filter = [
    //   `Collection/Name eq 'SENTINEL-2'`,
    //   `Attributes/OData.CSC.StringAttribute/any(att:att/Name eq 'productType' and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A')`,
    //   `OData.CSC.Intersects(area=geography'SRID=4326;${wkt}')`,
    //   `ContentDate/Start ge ${dateFrom.toISOString()}`,
    //   `ContentDate/Start le ${dateTo.toISOString()}`,
    //   `Attributes/OData.CSC.DoubleAttribute/any(att:att/Name eq 'cloudCover' and att/OData.CSC.DoubleAttribute/Value le ${maxCloud})`,
    // ].join(' and ')
    // const url = `${this.ODATA_BASE}?$filter=${encodeURIComponent(filter)}&$orderby=ContentDate/Start desc&$top=50`
    // const response = await fetch(url)
    // const data = await response.json()

    // Mock: Return realistic scene metadata for southern Sweden
    const mockScenes: SentinelScene[] = [
      {
        id: 'c3e1a4f2-9b8c-4d6e-a1f3-b5c7d9e0f2a4',
        name: 'S2B_MSIL2A_20240815T102559_N0510_R108_T33VWG_20240815T142011',
        acquisitionDate: '2024-08-15T10:25:59.000Z',
        cloudCoverPercent: 8.2,
        processingLevel: 'L2A',
        relativeOrbitNumber: 108,
        tileId: '33VWG',
        footprintWkt:
          'POLYGON((13.5 56.8, 14.8 56.8, 14.8 57.8, 13.5 57.8, 13.5 56.8))',
        size: 814_572_544,
        downloadUrl: `https://zipper.dataspace.copernicus.eu/odata/v1/Products(c3e1a4f2-9b8c-4d6e-a1f3-b5c7d9e0f2a4)/$value`,
      },
      {
        id: 'a7b2c3d4-e5f6-7890-abcd-ef1234567890',
        name: 'S2A_MSIL2A_20240810T102601_N0510_R108_T33VWG_20240810T160547',
        acquisitionDate: '2024-08-10T10:26:01.000Z',
        cloudCoverPercent: 15.7,
        processingLevel: 'L2A',
        relativeOrbitNumber: 108,
        tileId: '33VWG',
        footprintWkt:
          'POLYGON((13.5 56.8, 14.8 56.8, 14.8 57.8, 13.5 57.8, 13.5 56.8))',
        size: 780_000_000,
        downloadUrl: `https://zipper.dataspace.copernicus.eu/odata/v1/Products(a7b2c3d4-e5f6-7890-abcd-ef1234567890)/$value`,
      },
      {
        id: 'f1e2d3c4-b5a6-9870-fedc-ba0987654321',
        name: 'S2B_MSIL2A_20240805T102559_N0510_R108_T33VWG_20240805T141938',
        acquisitionDate: '2024-08-05T10:25:59.000Z',
        cloudCoverPercent: 22.1,
        processingLevel: 'L2A',
        relativeOrbitNumber: 108,
        tileId: '33VWG',
        footprintWkt:
          'POLYGON((13.5 56.8, 14.8 56.8, 14.8 57.8, 13.5 57.8, 13.5 56.8))',
        size: 820_000_000,
        downloadUrl: `https://zipper.dataspace.copernicus.eu/odata/v1/Products(f1e2d3c4-b5a6-9870-fedc-ba0987654321)/$value`,
      },
    ]

    // Filter by maxCloud (mock data is already under 30%)
    const filtered = mockScenes.filter((s) => s.cloudCoverPercent <= maxCloud)

    this.log.info(
      { total: mockScenes.length, filtered: filtered.length },
      'Scene discovery complete',
    )
    return filtered
  }

  /**
   * Download specified bands from a Sentinel-2 scene.
   *
   * Real implementation would:
   * 1. Authenticate with CDSE token endpoint
   * 2. Download the full product ZIP or individual bands via S3/HTTP
   * 3. Extract the requested band JP2 files
   * 4. Convert to GeoTIFF if needed
   *
   * @param sceneId - CDSE product UUID
   * @param bands - Band names to download (e.g. ['B04', 'B08', 'SCL'])
   * @param outputDir - S3 prefix for storing downloaded bands
   * @returns Map of band name to storage path
   */
  async downloadBands(
    sceneId: string,
    bands: string[],
    outputDir: string,
  ): Promise<Record<string, string>> {
    this.log.info({ sceneId, bands, outputDir }, 'Downloading Sentinel-2 bands')

    // TODO: Real implementation:
    // 1. POST to AUTH_URL for access token
    // 2. GET download URL for product
    // 3. Stream download, extract requested bands
    // 4. Upload extracted bands to S3

    const bandPaths: Record<string, string> = {}

    for (const band of bands) {
      const path = `${outputDir}/${band}.tif`
      bandPaths[band] = path

      this.log.debug({ sceneId, band, path }, 'Band downloaded (mock)')
    }

    this.log.info(
      { sceneId, bandCount: bands.length },
      'Band download complete (mock)',
    )
    return bandPaths
  }

  /**
   * Compute NDVI from Red (B04) and NIR (B08) bands.
   *
   * Formula: NDVI = (B08 - B04) / (B08 + B04)
   * Range: -1.0 to +1.0
   *   - < 0: water, bare soil, cloud
   *   - 0 - 0.2: sparse vegetation
   *   - 0.2 - 0.5: moderate vegetation
   *   - > 0.5: dense vegetation (healthy forest)
   *
   * Real implementation would use GDAL or rasterio to:
   * 1. Read both bands as float32 arrays
   * 2. Apply the NDVI formula pixel by pixel
   * 3. Handle nodata values
   * 4. Write output as GeoTIFF with proper CRS and metadata
   *
   * @param b04Path - S3 path to Red band GeoTIFF
   * @param b08Path - S3 path to NIR band GeoTIFF
   * @param outputPath - S3 path for the output NDVI raster
   * @returns NDVI statistics
   */
  async computeNDVI(
    b04Path: string,
    b08Path: string,
    outputPath: string,
  ): Promise<NDVIStats> {
    this.log.info({ b04Path, b08Path, outputPath }, 'Computing NDVI')

    // TODO: Real implementation with GDAL/rasterio:
    // import gdal from 'gdal-async'
    // const dsB04 = await gdal.openAsync(b04Path)
    // const dsB08 = await gdal.openAsync(b08Path)
    // const red = await dsB04.bands.get(1).pixels.readAsync(...)
    // const nir = await dsB08.bands.get(1).pixels.readAsync(...)
    // ndvi[i] = (nir[i] - red[i]) / (nir[i] + red[i]) where (nir[i] + red[i]) !== 0

    // Mock: Realistic NDVI stats for a Swedish forest parcel in summer
    const stats: NDVIStats = {
      min: -0.12,
      max: 0.89,
      mean: 0.62,
      stdDev: 0.18,
      validPixelCount: 145_280,
      totalPixelCount: 160_000,
      outputPath,
    }

    this.log.info(
      { mean: stats.mean, min: stats.min, max: stats.max, validPixels: stats.validPixelCount },
      'NDVI computation complete (mock)',
    )
    return stats
  }

  /**
   * Apply cloud mask using the Scene Classification Layer (SCL).
   *
   * SCL classes to mask (set to nodata):
   *   3  - Cloud shadows
   *   8  - Cloud medium probability
   *   9  - Cloud high probability
   *   10 - Thin cirrus
   *
   * Real implementation would:
   * 1. Read SCL raster (20m resolution)
   * 2. Resample SCL to match target raster resolution if needed
   * 3. Set all pixels in target raster to nodata where SCL is in CLOUD_SCL_CLASSES
   * 4. Write masked raster
   *
   * @param sclPath - S3 path to the SCL band
   * @param rasterPath - S3 path to the raster to mask
   * @returns Path to the masked raster and mask statistics
   */
  async applyCloudMask(
    sclPath: string,
    rasterPath: string,
  ): Promise<{ maskedPath: string; cloudPercent: number; maskedPixels: number }> {
    this.log.info({ sclPath, rasterPath }, 'Applying cloud mask from SCL')

    // TODO: Real implementation:
    // 1. Read SCL raster
    // 2. Create binary mask: mask = SCL in [3, 8, 9, 10]
    // 3. If SCL is 20m and target is 10m, resample mask with nearest neighbor
    // 4. Apply mask to target raster (set masked pixels to NaN/nodata)
    // 5. Write output

    const maskedPath = rasterPath.replace('.tif', '_masked.tif')

    // Mock: Realistic cloud masking stats
    const totalPixels = 160_000
    const maskedPixels = Math.round(totalPixels * 0.09) // ~9% cloud
    const cloudPercent = Math.round((maskedPixels / totalPixels) * 1000) / 10

    this.log.info(
      { maskedPath, cloudPercent, maskedPixels },
      'Cloud mask applied (mock)',
    )

    return { maskedPath, cloudPercent, maskedPixels }
  }
}

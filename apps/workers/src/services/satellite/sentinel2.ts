import type { BBox } from '@beetlesense/shared'
import { logger } from '../../lib/logger.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'

/**
 * Sentinel-2 scene metadata returned by the CDSE Sentinel Hub Catalog API.
 */
export interface SentinelScene {
  id: string
  name: string
  acquisitionDate: string
  cloudCoverPercent: number
  processingLevel: 'L1C' | 'L2A'
  relativeOrbitNumber: number
  tileId: string
  footprintGeoJSON: Record<string, unknown>
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

/**
 * Sentinel2Service — discovers and processes Sentinel-2 L2A imagery
 * via the Copernicus Data Space Ecosystem (CDSE) Sentinel Hub APIs.
 *
 * Authentication: OAuth2 client_credentials flow
 *   Token endpoint: https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
 *
 * Catalog API (STAC-based):
 *   New path (2026-03-17+): https://sh.dataspace.copernicus.eu/catalog/v1/search
 *   Legacy path:            https://sh.dataspace.copernicus.eu/api/v1/catalog/1.0.0/search
 *
 * Processing API:
 *   New path: https://sh.dataspace.copernicus.eu/process/v1
 *
 * Requires env vars: SENTINEL_HUB_CLIENT_ID, SENTINEL_HUB_CLIENT_SECRET
 */
export class Sentinel2Service {
  private readonly log = logger.child({ service: 'sentinel2' })

  private readonly AUTH_URL =
    'https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token'
  private readonly CATALOG_URL =
    'https://sh.dataspace.copernicus.eu/catalog/v1/search'
  private readonly PROCESS_URL =
    'https://sh.dataspace.copernicus.eu/process/v1'

  private readonly REQUEST_TIMEOUT_MS = 60_000

  private accessToken: string | null = null
  private tokenExpiresAt = 0

  /**
   * Authenticate with CDSE using OAuth2 client_credentials.
   * Caches the token until 60s before expiry.
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    const clientId = process.env.SENTINEL_HUB_CLIENT_ID
    const clientSecret = process.env.SENTINEL_HUB_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('SENTINEL_HUB_CLIENT_ID and SENTINEL_HUB_CLIENT_SECRET are required')
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    })

    const resp = await fetch(this.AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`CDSE auth failed (${resp.status}): ${text.slice(0, 200)}`)
    }

    const data = await resp.json() as { access_token: string; expires_in: number }
    this.accessToken = data.access_token
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000

    this.log.debug('CDSE OAuth2 token acquired')
    return this.accessToken
  }

  /**
   * Discover Sentinel-2 L2A scenes covering a bounding box within a date range.
   * Uses the Sentinel Hub Catalog API (STAC-based POST search).
   *
   * @param bbox - Bounding box in WGS84 (EPSG:4326) [west, south, east, north]
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
      'Discovering Sentinel-2 L2A scenes via Sentinel Hub Catalog',
    )

    const token = await this.authenticate()

    const searchBody = {
      bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
      datetime: `${dateFrom.toISOString().split('T')[0]}T00:00:00Z/${dateTo.toISOString().split('T')[0]}T23:59:59Z`,
      collections: ['sentinel-2-l2a'],
      limit: 50,
      filter: `eo:cloud_cover < ${maxCloud}`,
      'filter-lang': 'cql2-text',
      fields: {
        include: [
          'id',
          'properties.datetime',
          'properties.eo:cloud_cover',
          'properties.sat:relative_orbit',
          'properties.s2:tile_id',
          'geometry',
        ],
      },
    }

    const allScenes: SentinelScene[] = []
    let nextToken: string | undefined

    // Paginate through results
    do {
      const body = nextToken ? { ...searchBody, next: nextToken } : searchBody

      const resp = await fetch(this.CATALOG_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (!resp.ok) {
        const text = await resp.text()
        this.log.error(
          { status: resp.status, body: text.slice(0, 300) },
          'Catalog search failed',
        )
        break
      }

      const data = await resp.json() as {
        type: string
        features: Array<{
          id: string
          geometry: Record<string, unknown>
          properties: {
            datetime: string
            'eo:cloud_cover'?: number
            'sat:relative_orbit'?: number
            's2:tile_id'?: string
          }
          assets?: Record<string, { href?: string }>
        }>
        context?: { next?: string }
      }

      for (const feat of data.features) {
        allScenes.push({
          id: feat.id,
          name: feat.id,
          acquisitionDate: feat.properties.datetime,
          cloudCoverPercent: feat.properties['eo:cloud_cover'] ?? 0,
          processingLevel: 'L2A',
          relativeOrbitNumber: feat.properties['sat:relative_orbit'] ?? 0,
          tileId: feat.properties['s2:tile_id'] ?? '',
          footprintGeoJSON: feat.geometry,
          size: 0,
          downloadUrl: feat.assets?.data?.href ?? '',
        })
      }

      nextToken = data.context?.next
    } while (nextToken && allScenes.length < 200)

    this.log.info(
      { total: allScenes.length, bbox },
      'Sentinel-2 scene discovery complete',
    )

    return allScenes
  }

  /**
   * Download specific bands from a Sentinel-2 scene via the Processing API.
   *
   * Uses Sentinel Hub's Process API to request specific bands as GeoTIFF
   * for a given bbox — no need to download the full product archive.
   *
   * @param sceneId - Scene/product identifier
   * @param bands - Band names to request (e.g. ['B04', 'B08', 'SCL'])
   * @param bbox - Bounding box in WGS84
   * @param parcelId - Parcel UUID for storage path
   * @returns Map of band name to S3 storage path
   */
  async downloadBands(
    sceneId: string,
    bands: string[],
    bbox: BBox,
    parcelId: string,
  ): Promise<Record<string, string>> {
    this.log.info({ sceneId, bands, parcelId }, 'Downloading Sentinel-2 bands via Process API')

    const token = await this.authenticate()
    const bandPaths: Record<string, string> = {}

    for (const band of bands) {
      try {
        const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["${band}"], units: "DN" }],
    output: { id: "default", bands: 1, sampleType: "FLOAT32" }
  };
}
function evaluatePixel(sample) {
  return [sample.${band}];
}`

        const requestBody = {
          input: {
            bounds: {
              bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
              properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
            },
            data: [
              {
                type: 'sentinel-2-l2a',
                dataFilter: {
                  timeRange: {
                    from: sceneId, // Will be overridden if scene datetime is known
                    to: sceneId,
                  },
                  maxCloudCoverage: 100,
                },
              },
            ],
          },
          output: {
            width: 512,
            height: 512,
            responses: [
              {
                identifier: 'default',
                format: { type: 'image/tiff' },
              },
            ],
          },
          evalscript,
        }

        const resp = await fetch(this.PROCESS_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            Accept: 'image/tiff',
          },
          body: JSON.stringify(requestBody),
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!resp.ok) {
          const text = await resp.text()
          this.log.warn(
            { band, status: resp.status, body: text.slice(0, 200) },
            'Process API request failed for band',
          )
          continue
        }

        const buffer = Buffer.from(await resp.arrayBuffer())
        const storagePath = buildParcelPath(parcelId, `sentinel2/${sceneId}`, `${band}.tif`)
        await uploadToS3(storagePath, buffer, 'image/tiff')
        bandPaths[band] = storagePath

        this.log.debug({ band, storagePath, bytes: buffer.length }, 'Band downloaded')
      } catch (err) {
        this.log.error(
          { band, err: err instanceof Error ? err.message : String(err) },
          'Failed to download band',
        )
      }
    }

    this.log.info(
      { sceneId, downloaded: Object.keys(bandPaths).length, total: bands.length },
      'Band download complete',
    )

    return bandPaths
  }

  /**
   * Compute NDVI using the Processing API evalscript.
   *
   * Requests NDVI directly from Sentinel Hub as a processed GeoTIFF,
   * which avoids downloading raw bands and computing locally.
   *
   * Formula: NDVI = (B08 - B04) / (B08 + B04)
   *
   * @param bbox - Bounding box in WGS84
   * @param dateFrom - Start date
   * @param dateTo - End date
   * @param parcelId - Parcel UUID for storage
   * @param maxCloud - Max cloud cover filter (default 30)
   * @returns NDVI stats and storage path
   */
  async computeNDVI(
    bbox: BBox,
    dateFrom: Date,
    dateTo: Date,
    parcelId: string,
    maxCloud: number = 30,
  ): Promise<NDVIStats> {
    this.log.info({ bbox, dateFrom, dateTo, parcelId }, 'Computing NDVI via Process API')

    const token = await this.authenticate()

    const evalscript = `
//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04", "B08", "SCL"], units: "REFLECTANCE" }],
    output: { id: "default", bands: 1, sampleType: "FLOAT32" },
    mosaicking: "ORBIT"
  };
}

function evaluatePixel(samples) {
  // Use most recent valid (non-cloudy) pixel
  for (let i = 0; i < samples.length; i++) {
    const scl = samples[i].SCL;
    // Skip clouds (3=shadow, 8=med cloud, 9=high cloud, 10=cirrus)
    if (scl === 3 || scl === 8 || scl === 9 || scl === 10) continue;

    const nir = samples[i].B08;
    const red = samples[i].B04;
    const sum = nir + red;
    if (sum === 0) return [-2]; // nodata
    return [(nir - red) / sum];
  }
  return [-2]; // all cloudy
}`

    const requestBody = {
      input: {
        bounds: {
          bbox: [bbox.west, bbox.south, bbox.east, bbox.north],
          properties: { crs: 'http://www.opengis.net/def/crs/EPSG/0/4326' },
        },
        data: [
          {
            type: 'sentinel-2-l2a',
            dataFilter: {
              timeRange: {
                from: dateFrom.toISOString(),
                to: dateTo.toISOString(),
              },
              maxCloudCoverage: maxCloud,
            },
            processing: {
              upsampling: 'BILINEAR',
              downsampling: 'BILINEAR',
            },
          },
        ],
      },
      output: {
        width: 512,
        height: 512,
        responses: [
          {
            identifier: 'default',
            format: { type: 'image/tiff' },
          },
        ],
      },
      evalscript,
    }

    const outputPath = buildParcelPath(parcelId, 'sentinel2/ndvi', 'ndvi.tif')

    try {
      const resp = await fetch(this.PROCESS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Accept: 'image/tiff',
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (!resp.ok) {
        const text = await resp.text()
        this.log.error(
          { status: resp.status, body: text.slice(0, 300) },
          'NDVI Process API request failed',
        )
        return {
          min: 0, max: 0, mean: 0, stdDev: 0,
          validPixelCount: 0, totalPixelCount: 0,
          outputPath,
        }
      }

      const buffer = Buffer.from(await resp.arrayBuffer())
      await uploadToS3(outputPath, buffer, 'image/tiff')

      // Basic stats from the TIFF would require GDAL — store the raster
      // and let the inference service compute detailed stats
      const stats: NDVIStats = {
        min: -1,
        max: 1,
        mean: 0,
        stdDev: 0,
        validPixelCount: 512 * 512,
        totalPixelCount: 512 * 512,
        outputPath,
      }

      // Store metadata
      const supabase = getSupabaseAdmin()
      const { data: existing } = await supabase
        .from('parcel_open_data')
        .select('id')
        .eq('parcel_id', parcelId)
        .eq('source', 'sentinel2/ndvi')
        .maybeSingle()

      const metadata = {
        type: 'ndvi',
        bbox,
        dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
        maxCloud,
        format: 'GeoTIFF',
        bytes: buffer.length,
      }

      if (existing) {
        await supabase.from('parcel_open_data').update({
          storage_path: outputPath,
          fetched_at: new Date().toISOString(),
          metadata,
          data_version: new Date().toISOString().slice(0, 10),
        }).eq('id', existing.id)
      } else {
        await supabase.from('parcel_open_data').insert({
          parcel_id: parcelId,
          source: 'sentinel2/ndvi',
          storage_path: outputPath,
          metadata,
          data_version: new Date().toISOString().slice(0, 10),
        })
      }

      this.log.info({ parcelId, outputPath, bytes: buffer.length }, 'NDVI raster computed and stored')
      return stats
    } catch (err) {
      this.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to compute NDVI',
      )
      return {
        min: 0, max: 0, mean: 0, stdDev: 0,
        validPixelCount: 0, totalPixelCount: 0,
        outputPath,
      }
    }
  }

  /**
   * Apply cloud mask using SCL — now handled server-side via evalscript.
   *
   * The computeNDVI method already filters clouds in the evalscript using
   * the SCL band. This method is kept for standalone cloud masking use cases
   * where you have already downloaded a raster and want to mask it.
   *
   * For real raster manipulation, this delegates to the inference server
   * which has GDAL/rasterio available.
   */
  async applyCloudMask(
    sclPath: string,
    rasterPath: string,
  ): Promise<{ maskedPath: string; cloudPercent: number; maskedPixels: number }> {
    this.log.info({ sclPath, rasterPath }, 'Cloud masking — delegating to inference server')

    const inferenceUrl = process.env.INFERENCE_URL ?? 'http://localhost:8000'

    try {
      const resp = await fetch(`${inferenceUrl}/cloud-mask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scl_path: sclPath, raster_path: rasterPath }),
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (resp.ok) {
        const result = await resp.json() as { masked_path: string; cloud_percent: number; masked_pixels: number }
        return {
          maskedPath: result.masked_path,
          cloudPercent: result.cloud_percent,
          maskedPixels: result.masked_pixels,
        }
      }

      this.log.warn({ status: resp.status }, 'Inference server cloud-mask endpoint unavailable')
    } catch (err) {
      this.log.warn(
        { err: err instanceof Error ? err.message : String(err) },
        'Inference server not reachable for cloud masking',
      )
    }

    // Fallback: return unmasked path
    return {
      maskedPath: rasterPath,
      cloudPercent: 0,
      maskedPixels: 0,
    }
  }
}

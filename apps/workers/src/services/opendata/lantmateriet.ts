import type { BBox, GeoJSONFeature } from '@beetlesense/shared'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * LantmaterietFetcher — integrates with Lantmäteriet (Swedish Land Survey) APIs.
 *
 * Open data services (free, no auth):
 *   - Höjddata 2m DTM: https://download-opendata.lantmateriet.se/api/v1/
 *   - LiDAR point clouds: https://download-opendata.lantmateriet.se/api/v1/
 *   - Ortofoto (open WMS): https://minkarta.lantmateriet.se/map/ortofoto/
 *
 * Authenticated services (require API key from lantmateriet.se/tjanster/):
 *   - Fastighetsregister Direkt: https://api.lantmateriet.se/distribution/produkter/fastighet/v3.2/
 *
 * CRS: EPSG:3006 (SWEREF99 TM)
 */
export class LantmaterietFetcher {
  private readonly log = logger.child({ service: 'lantmateriet' })

  private readonly OPEN_DATA_BASE = 'https://download-opendata.lantmateriet.se/api/v1'
  private readonly ORTOFOTO_WMS = 'https://minkarta.lantmateriet.se/map/ortofoto/'
  private readonly REQUEST_TIMEOUT_MS = 120_000

  /**
   * Fetch property boundary as GeoJSON from Lantmäteriet Fastighetsregister.
   *
   * NOTE: This endpoint requires an API key from Lantmäteriet.
   * If LANTMATERIET_API_KEY is not set, returns a minimal placeholder feature.
   */
  async fetchPropertyBoundary(
    fastighetsId: string,
    parcelId: string,
  ): Promise<GeoJSONFeature> {
    this.log.info({ fastighetsId, parcelId }, 'Fetching property boundary')

    const apiKey = process.env.LANTMATERIET_API_KEY

    let feature: GeoJSONFeature

    if (apiKey) {
      try {
        // Search for the property by designation
        const searchUrl =
          `https://api.lantmateriet.se/distribution/produkter/fastighet/v3.2/registerenhet` +
          `?beteckning=${encodeURIComponent(fastighetsId)}`

        const searchResp = await fetch(searchUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!searchResp.ok) {
          throw new Error(`Fastighetsregister search returned ${searchResp.status}`)
        }

        const searchData = await searchResp.json() as { features?: Array<{ properties?: { objektidentitet?: string } }> }
        const uuid = searchData.features?.[0]?.properties?.objektidentitet

        if (!uuid) {
          throw new Error(`No property found for designation: ${fastighetsId}`)
        }

        // Fetch geometry for the property
        const geoUrl =
          `https://api.lantmateriet.se/distribution/produkter/fastighet/v3.2/registerenhet/${uuid}/geometri`

        const geoResp = await fetch(geoUrl, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!geoResp.ok) {
          throw new Error(`Geometry fetch returned ${geoResp.status}`)
        }

        const geoData = await geoResp.json() as GeoJSONFeature
        feature = {
          type: 'Feature',
          geometry: geoData.geometry,
          properties: {
            ...geoData.properties,
            fastighetsId,
            source: 'lantmateriet',
            fetchedAt: new Date().toISOString(),
            crs: 'EPSG:3006',
          },
        }
      } catch (err) {
        this.log.error(
          { err: err instanceof Error ? err.message : String(err) },
          'Failed to fetch property boundary from Lantmäteriet API',
        )
        // Fallback: store a placeholder
        feature = this.placeholderFeature(fastighetsId)
      }
    } else {
      this.log.warn('LANTMATERIET_API_KEY not set — using placeholder boundary')
      feature = this.placeholderFeature(fastighetsId)
    }

    const key = buildParcelPath(parcelId, 'lantmateriet/boundary', 'boundary.geojson')
    await uploadToS3(key, Buffer.from(JSON.stringify(feature, null, 2)), 'application/geo+json')

    await this.upsertOpenData(parcelId, 'lantmateriet/boundary', key, {
      fastighetsId,
      type: 'property_boundary',
      crs: 'EPSG:3006',
      hasApiKey: !!apiKey,
    })

    this.log.info({ parcelId, key }, 'Property boundary stored')
    return feature
  }

  /**
   * Download 2m DTM (Digital Terrain Model) GeoTIFF tiles for a bounding box.
   *
   * Uses the Lantmäteriet open data download API (free, no auth).
   * Product: hojddata_2m (2m resolution height grid)
   * Format: GeoTIFF
   */
  async fetchDTM(bbox: BBox, parcelId: string): Promise<string> {
    this.log.info({ bbox, parcelId }, 'Fetching DTM 2m GeoTIFF')

    const outputKey = buildParcelPath(parcelId, 'lantmateriet/dtm', 'dtm_2m.tif')

    try {
      // List available tiles intersecting the bbox
      const listUrl =
        `${this.OPEN_DATA_BASE}/produkter/hojddata2?` +
        `bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}` +
        `&format=json`

      const listResp = await fetch(listUrl, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (!listResp.ok) {
        // Try alternative endpoint pattern
        const altUrl =
          `${this.OPEN_DATA_BASE}/download?` +
          `produkttyp=hojddata_2m` +
          `&bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}` +
          `&format=geotiff`

        const altResp = await fetch(altUrl, {
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!altResp.ok) {
          this.log.warn(
            { status: altResp.status },
            'DTM download endpoint returned error — storing metadata only',
          )
          await this.upsertOpenData(parcelId, 'lantmateriet/dtm', outputKey, {
            type: 'dtm',
            resolution_m: 2,
            bbox,
            crs: 'EPSG:3006',
            format: 'GeoTIFF',
            status: 'endpoint_unavailable',
          })
          return outputKey
        }

        const buffer = Buffer.from(await altResp.arrayBuffer())
        await uploadToS3(outputKey, buffer, 'image/tiff')

        this.log.info({ parcelId, outputKey, bytes: buffer.length }, 'DTM raster stored')
      } else {
        const tileList = await listResp.json() as { files?: Array<{ url: string; name: string }> }
        const tiles = tileList.files ?? []

        if (tiles.length === 0) {
          this.log.warn({ bbox }, 'No DTM tiles found for bbox')
          await this.upsertOpenData(parcelId, 'lantmateriet/dtm', outputKey, {
            type: 'dtm',
            resolution_m: 2,
            bbox,
            crs: 'EPSG:3006',
            format: 'GeoTIFF',
            status: 'no_tiles_found',
          })
          return outputKey
        }

        // Download first tile (for single-parcel use, usually 1-2 tiles)
        const tileUrl = tiles[0]!.url
        const tileResp = await fetch(tileUrl, {
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (tileResp.ok) {
          const buffer = Buffer.from(await tileResp.arrayBuffer())
          await uploadToS3(outputKey, buffer, 'image/tiff')
          this.log.info({ parcelId, outputKey, bytes: buffer.length, tileCount: tiles.length }, 'DTM raster stored')
        }
      }
    } catch (err) {
      this.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to fetch DTM data',
      )
    }

    await this.upsertOpenData(parcelId, 'lantmateriet/dtm', outputKey, {
      type: 'dtm',
      resolution_m: 2,
      bbox,
      crs: 'EPSG:3006',
      format: 'GeoTIFF',
    })

    return outputKey
  }

  /**
   * Resolve and download LiDAR point cloud tiles (LAZ) covering the given bbox.
   *
   * Uses the Lantmäteriet open data API (free, no auth).
   * Tile grid: 2.5km x 2.5km blocks in SWEREF99 TM.
   */
  async fetchLidarTiles(
    bbox: BBox,
    parcelId: string,
  ): Promise<{ tileId: string; storagePath: string }[]> {
    this.log.info({ bbox, parcelId }, 'Resolving LiDAR tile coverage')

    // Compute 2.5km tile IDs intersecting the bbox
    const tileMinX = Math.floor(bbox.west / 2500) * 2500
    const tileMinY = Math.floor(bbox.south / 2500) * 2500
    const tileMaxX = Math.ceil(bbox.east / 2500) * 2500
    const tileMaxY = Math.ceil(bbox.north / 2500) * 2500

    const tiles: { tileId: string; storagePath: string }[] = []

    for (let x = tileMinX; x < tileMaxX; x += 2500) {
      for (let y = tileMinY; y < tileMaxY; y += 2500) {
        const tileId = `${x}_${y}_2500`
        const storagePath = buildParcelPath(parcelId, 'lantmateriet/lidar', `${tileId}.laz`)

        try {
          // Lantmäteriet open data LiDAR download
          const url =
            `${this.OPEN_DATA_BASE}/produkter/punktmoln?` +
            `tileid=${tileId}` +
            `&format=laz`

          const resp = await fetch(url, {
            signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
          })

          if (resp.ok) {
            const contentType = resp.headers.get('content-type') ?? ''
            if (!contentType.includes('xml') && !contentType.includes('html')) {
              const buffer = Buffer.from(await resp.arrayBuffer())
              await uploadToS3(storagePath, buffer, 'application/octet-stream')
              tiles.push({ tileId, storagePath })
              this.log.debug({ tileId, bytes: buffer.length }, 'LiDAR tile downloaded')
            } else {
              this.log.warn({ tileId, contentType }, 'LiDAR endpoint returned non-LAZ content')
              tiles.push({ tileId, storagePath })
            }
          } else {
            this.log.warn({ tileId, status: resp.status }, 'LiDAR tile download failed')
            tiles.push({ tileId, storagePath })
          }
        } catch (err) {
          this.log.error(
            { tileId, err: err instanceof Error ? err.message : String(err) },
            'Failed to download LiDAR tile',
          )
          tiles.push({ tileId, storagePath })
        }
      }
    }

    this.log.info(
      { parcelId, tileCount: tiles.length, tiles: tiles.map((t) => t.tileId) },
      'LiDAR tiles resolved',
    )

    await this.upsertOpenData(parcelId, 'lantmateriet/lidar', tiles[0]?.storagePath ?? '', {
      type: 'lidar_pointcloud',
      tileCount: tiles.length,
      tileIds: tiles.map((t) => t.tileId),
      bbox,
      format: 'LAZ',
    })

    return tiles
  }

  /**
   * Fetch ortofoto (aerial imagery) via Lantmäteriet's open WMS service.
   *
   * Uses GetMap request to download a georeferenced image for the bbox.
   * Service: https://minkarta.lantmateriet.se/map/ortofoto/
   * Layer: Ortofoto_0.5, Format: image/tiff
   */
  async fetchOrtofoto(bbox: BBox, parcelId: string): Promise<string> {
    this.log.info({ bbox, parcelId }, 'Fetching ortofoto via WMS')

    const outputKey = buildParcelPath(parcelId, 'lantmateriet/ortofoto', 'ortofoto.tif')

    try {
      // Calculate pixel dimensions (~0.5m resolution)
      const widthM = bbox.east - bbox.west
      const heightM = bbox.north - bbox.south
      const pixelWidth = Math.min(Math.round(widthM / 0.5), 4096)
      const pixelHeight = Math.min(Math.round(heightM / 0.5), 4096)

      const url =
        `${this.ORTOFOTO_WMS}?service=WMS&version=1.1.1&request=GetMap` +
        `&layers=Ortofoto_0.5` +
        `&srs=EPSG:3006` +
        `&bbox=${bbox.west},${bbox.south},${bbox.east},${bbox.north}` +
        `&width=${pixelWidth}&height=${pixelHeight}` +
        `&format=image/tiff`

      const resp = await fetch(url, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (!resp.ok) {
        this.log.warn({ status: resp.status }, 'Ortofoto WMS request failed')
        await this.upsertOpenData(parcelId, 'lantmateriet/ortofoto', outputKey, {
          type: 'ortofoto',
          bbox,
          crs: 'EPSG:3006',
          format: 'GeoTIFF',
          status: 'fetch_failed',
        })
        return outputKey
      }

      const contentType = resp.headers.get('content-type') ?? ''

      // WMS may return XML error
      if (contentType.includes('xml') || contentType.includes('html')) {
        const text = await resp.text()
        this.log.warn(
          { contentType, body: text.slice(0, 200) },
          'WMS returned XML/error instead of image',
        )
        await this.upsertOpenData(parcelId, 'lantmateriet/ortofoto', outputKey, {
          type: 'ortofoto',
          bbox,
          crs: 'EPSG:3006',
          status: 'wms_error',
        })
        return outputKey
      }

      const buffer = Buffer.from(await resp.arrayBuffer())
      await uploadToS3(outputKey, buffer, 'image/tiff')

      this.log.info(
        { parcelId, outputKey, bytes: buffer.length, pixelWidth, pixelHeight },
        'Ortofoto stored',
      )
    } catch (err) {
      this.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to fetch ortofoto',
      )
    }

    await this.upsertOpenData(parcelId, 'lantmateriet/ortofoto', outputKey, {
      type: 'ortofoto',
      bbox,
      crs: 'EPSG:3006',
      format: 'GeoTIFF',
      year: new Date().getFullYear(),
    })

    return outputKey
  }

  /**
   * Returns a placeholder GeoJSON feature when no API key is available.
   */
  private placeholderFeature(fastighetsId: string): GeoJSONFeature {
    return {
      type: 'Feature',
      geometry: { type: 'Polygon', coordinates: [] },
      properties: {
        fastighetsId,
        source: 'lantmateriet',
        fetchedAt: new Date().toISOString(),
        crs: 'EPSG:3006',
        placeholder: true,
      },
    }
  }

  /**
   * Upserts a row into the parcel_open_data table for tracking fetched layers.
   */
  private async upsertOpenData(
    parcelId: string,
    source: string,
    storagePath: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('parcel_open_data')
      .select('id')
      .eq('parcel_id', parcelId)
      .eq('source', source)
      .maybeSingle()

    if (existing) {
      await supabase
        .from('parcel_open_data')
        .update({
          storage_path: storagePath,
          fetched_at: new Date().toISOString(),
          metadata,
          data_version: new Date().toISOString().slice(0, 10),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('parcel_open_data').insert({
        parcel_id: parcelId,
        source,
        storage_path: storagePath,
        metadata,
        data_version: new Date().toISOString().slice(0, 10),
      })
    }
  }
}

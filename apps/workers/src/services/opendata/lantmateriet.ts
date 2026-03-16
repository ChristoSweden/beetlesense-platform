import type { BBox, GeoJSONFeature } from '@beetlesense/shared'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * LantmaterietFetcher — integrates with Lantmäteriet (Swedish Land Survey) APIs.
 *
 * Real API endpoints (require OAuth2 client credentials):
 *   - Fastighetsregister Direkt: https://api.lantmateriet.se/distribution/produkter/fastighet/v3.2/
 *   - Ortofoto WMTS: https://minkarta.lantmateriet.se/map/ortofoto/
 *   - Höjddata (DTM/DSM): https://download-opendata.lantmateriet.se/api/v1/
 *   - LiDAR: https://download-opendata.lantmateriet.se/api/v1/
 *
 * TODO: Replace mock implementations with real API calls once API keys are provisioned.
 */
export class LantmaterietFetcher {
  private readonly log = logger.child({ service: 'lantmateriet' })

  /**
   * Fetch property boundary as GeoJSON from Lantmäteriet Fastighetsregister.
   *
   * Real API: GET https://api.lantmateriet.se/distribution/produkter/fastighet/v3.2/registerenhet/{uuid}
   * Headers: Authorization: Bearer {token}
   *
   * @param fastighetsId - Swedish property designation (e.g. "Värnamo Gummifabriken 1:3")
   * @param parcelId - Internal parcel UUID for storage
   * @returns GeoJSON feature with property boundary
   */
  async fetchPropertyBoundary(
    fastighetsId: string,
    parcelId: string,
  ): Promise<GeoJSONFeature> {
    this.log.info({ fastighetsId, parcelId }, 'Fetching property boundary')

    // TODO: Real implementation:
    // 1. Authenticate via OAuth2 client_credentials to https://api.lantmateriet.se/token
    // 2. Search for property: GET /fastighet/v3.2/registerenhet?q={fastighetsId}
    // 3. Fetch geometry: GET /fastighet/v3.2/registerenhet/{uuid}/geometri

    // Mock: Realistic polygon near Värnamo in SWEREF99 TM (EPSG:3006)
    const mockFeature: GeoJSONFeature = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [434850, 6336200],
            [435200, 6336200],
            [435200, 6336550],
            [435050, 6336600],
            [434850, 6336500],
            [434850, 6336200],
          ],
        ],
      },
      properties: {
        fastighetsId,
        kommun: 'Värnamo',
        lan: 'Jönköpings län',
        areaHectares: 12.5,
        source: 'lantmateriet',
        fetchedAt: new Date().toISOString(),
        crs: 'EPSG:3006',
      },
    }

    // Store to S3
    const key = buildParcelPath(parcelId, 'lantmateriet/boundary', 'boundary.geojson')
    await uploadToS3(
      key,
      Buffer.from(JSON.stringify(mockFeature, null, 2)),
      'application/geo+json',
    )

    // Upsert metadata to parcel_open_data
    await this.upsertOpenData(parcelId, 'lantmateriet/boundary', key, {
      fastighetsId,
      type: 'property_boundary',
      crs: 'EPSG:3006',
    })

    this.log.info({ parcelId, key }, 'Property boundary stored')
    return mockFeature
  }

  /**
   * Download 2m DTM (Digital Terrain Model) GeoTIFF for a bounding box.
   *
   * Real API: Lantmäteriet open download service
   *   GET https://download-opendata.lantmateriet.se/api/v1/producttype/hojddata_2m/
   *   with bbox parameter
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID for storage path
   * @returns Path to the stored GeoTIFF
   */
  async fetchDTM(bbox: BBox, parcelId: string): Promise<string> {
    this.log.info({ bbox, parcelId }, 'Fetching DTM 2m GeoTIFF')

    // TODO: Real implementation:
    // 1. GET https://download-opendata.lantmateriet.se/api/v1/producttype/hojddata_2m/?bbox={w},{s},{e},{n}
    // 2. Download the GeoTIFF tiles
    // 3. Merge tiles if multiple, crop to bbox
    // 4. Upload merged raster to S3

    const outputKey = buildParcelPath(parcelId, 'lantmateriet/dtm', 'dtm_2m.tif')

    this.log.info(
      { parcelId, outputKey, bbox },
      'DTM fetch complete (mock — no real download)',
    )

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
   * Real API: Lantmäteriet open download via index map
   *   https://download-opendata.lantmateriet.se/api/v1/producttype/punktmoln/
   *   Tile grid: 2.5km x 2.5km blocks
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID for storage
   * @returns Array of tile IDs and their mock storage paths
   */
  async fetchLidarTiles(
    bbox: BBox,
    parcelId: string,
  ): Promise<{ tileId: string; storagePath: string }[]> {
    this.log.info({ bbox, parcelId }, 'Resolving LiDAR tile coverage')

    // TODO: Real implementation:
    // 1. Compute which 2.5km tiles intersect the bbox
    // 2. Download each tile from the open data API
    // 3. Upload to S3

    // Mock: Compute approximate tile IDs based on SWEREF99 TM grid
    const tileMinX = Math.floor(bbox.west / 2500) * 2500
    const tileMinY = Math.floor(bbox.south / 2500) * 2500
    const tileMaxX = Math.ceil(bbox.east / 2500) * 2500
    const tileMaxY = Math.ceil(bbox.north / 2500) * 2500

    const tiles: { tileId: string; storagePath: string }[] = []
    for (let x = tileMinX; x < tileMaxX; x += 2500) {
      for (let y = tileMinY; y < tileMaxY; y += 2500) {
        const tileId = `${x}_${y}_2500`
        const storagePath = buildParcelPath(
          parcelId,
          'lantmateriet/lidar',
          `${tileId}.laz`,
        )
        tiles.push({ tileId, storagePath })
      }
    }

    this.log.info(
      { parcelId, tileCount: tiles.length, tiles: tiles.map((t) => t.tileId) },
      'LiDAR tiles resolved (mock)',
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
   * Fetch ortofoto (aerial imagery) WMTS tiles for a bounding box.
   *
   * Real service: Lantmäteriet WMTS
   *   https://minkarta.lantmateriet.se/map/ortofoto/?request=GetCapabilities&service=WMTS
   *   Layer: ortofoto, Format: image/jpeg, TileMatrixSet: 3006
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID
   * @returns Storage path for the stitched ortofoto
   */
  async fetchOrtofoto(bbox: BBox, parcelId: string): Promise<string> {
    this.log.info({ bbox, parcelId }, 'Fetching ortofoto WMTS tiles')

    // TODO: Real implementation:
    // 1. Compute WMTS tile matrix level based on bbox area
    // 2. Enumerate tiles covering the bbox
    // 3. Fetch each tile via WMTS GetTile
    // 4. Stitch tiles into a single GeoTIFF
    // 5. Upload to S3

    const outputKey = buildParcelPath(parcelId, 'lantmateriet/ortofoto', 'ortofoto.tif')

    this.log.info(
      { parcelId, outputKey },
      'Ortofoto fetch complete (mock — no real download)',
    )

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
   * Upserts a row into the parcel_open_data table for tracking fetched layers.
   */
  private async upsertOpenData(
    parcelId: string,
    source: string,
    storagePath: string,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    const supabase = getSupabaseAdmin()

    // Check if a record exists for this parcel + source combination
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

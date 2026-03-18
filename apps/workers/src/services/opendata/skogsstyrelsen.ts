import type { BBox, GeoJSONFeatureCollection } from '@beetlesense/shared'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * SkogsstyrelsenFetcher — integrates with Skogsstyrelsen (Swedish Forest Agency)
 * WFS/WCS services for real forest data.
 *
 * All services are free and public, no authentication required.
 * CRS: EPSG:3006 (SWEREF99 TM)
 *
 * Endpoints:
 *   WFS: https://geodpags.skogsstyrelsen.se/geodataport/wfs
 *   WCS: https://geodpags.skogsstyrelsen.se/geodataport/wcs
 */
export class SkogsstyrelsenFetcher {
  private readonly log = logger.child({ service: 'skogsstyrelsen' })

  private readonly WFS_BASE = 'https://geodpags.skogsstyrelsen.se/geodataport/wfs'
  private readonly WCS_BASE = 'https://geodpags.skogsstyrelsen.se/geodataport/wcs'

  private readonly REQUEST_TIMEOUT_MS = 60_000

  /**
   * Fetch kNN forest variable rasters via WCS GetCoverage.
   *
   * Downloads real GeoTIFF rasters for:
   *   - Volume (m³/ha)
   *   - Height (dm)
   *   - Age (years)
   *   - Species (code)
   */
  async fetchKNN(
    bbox: BBox,
    parcelId: string,
  ): Promise<Record<string, string>> {
    this.log.info({ bbox, parcelId }, 'Fetching kNN forest variable rasters')

    const variables = [
      { coverageId: 'skogligagrunddata:Volym', name: 'volume', unit: 'm3/ha' },
      { coverageId: 'skogligagrunddata:Hojd', name: 'height', unit: 'dm' },
      { coverageId: 'skogligagrunddata:Alder', name: 'age', unit: 'years' },
      { coverageId: 'skogligagrunddata:Tradslag', name: 'species', unit: 'code' },
    ]

    const storagePaths: Record<string, string> = {}

    for (const variable of variables) {
      const url =
        `${this.WCS_BASE}?service=WCS&version=2.0.1&request=GetCoverage` +
        `&coverageId=${variable.coverageId}` +
        `&subset=E(${bbox.west},${bbox.east})` +
        `&subset=N(${bbox.south},${bbox.north})` +
        `&format=image/tiff`

      try {
        const response = await fetch(url, {
          signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
        })

        if (!response.ok) {
          const text = await response.text()
          this.log.warn(
            { variable: variable.name, status: response.status, body: text.slice(0, 200) },
            'WCS GetCoverage request failed, skipping variable',
          )
          continue
        }

        const contentType = response.headers.get('content-type') ?? ''

        // WCS may return XML error instead of GeoTIFF
        if (contentType.includes('xml') || contentType.includes('html')) {
          const text = await response.text()
          this.log.warn(
            { variable: variable.name, contentType, body: text.slice(0, 200) },
            'WCS returned XML/error instead of raster',
          )
          continue
        }

        const buffer = Buffer.from(await response.arrayBuffer())

        const key = buildParcelPath(
          parcelId,
          'skogsstyrelsen/knn',
          `${variable.name}.tif`,
        )

        await uploadToS3(key, buffer, 'image/tiff')
        storagePaths[variable.name] = key

        this.log.debug(
          { parcelId, variable: variable.name, key, bytes: buffer.length },
          'kNN raster fetched and stored',
        )
      } catch (err) {
        this.log.error(
          { variable: variable.name, err: err instanceof Error ? err.message : String(err) },
          'Failed to fetch kNN raster',
        )
      }
    }

    // Upsert metadata
    if (Object.keys(storagePaths).length > 0) {
      await this.upsertOpenData(parcelId, 'skogsstyrelsen/knn', storagePaths.volume ?? Object.values(storagePaths)[0]!, {
        type: 'knn_forest_variables',
        variables: Object.keys(storagePaths),
        bbox,
        resolution_m: 12.5,
        crs: 'EPSG:3006',
        format: 'GeoTIFF',
        storagePaths,
      })
    }

    this.log.info({ parcelId, fetched: Object.keys(storagePaths).length }, 'kNN rasters complete')
    return storagePaths
  }

  /**
   * Fetch avverkningsanmälningar (harvest notifications) via WFS GetFeature.
   * Returns real GeoJSON from Skogsstyrelsen's public WFS.
   */
  async fetchHarvestNotifications(
    bbox: BBox,
    parcelId: string,
  ): Promise<GeoJSONFeatureCollection> {
    this.log.info({ bbox, parcelId }, 'Fetching harvest notifications (avverkningsanmälningar)')

    const url =
      `${this.WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature` +
      `&typeName=Avverkningsanmalan` +
      `&srsName=EPSG:3006` +
      `&bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east},EPSG:3006` +
      `&outputFormat=application/json` +
      `&maxFeatures=500`

    let collection: GeoJSONFeatureCollection

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`WFS returned ${response.status}: ${await response.text().then(t => t.slice(0, 200))}`)
      }

      const data = (await response.json()) as { features?: unknown[] }

      // WFS GeoJSON response may be wrapped differently
      collection = {
        type: 'FeatureCollection',
        features: (data.features ?? []) as GeoJSONFeatureCollection['features'],
      }
    } catch (err) {
      this.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to fetch harvest notifications, returning empty collection',
      )
      collection = { type: 'FeatureCollection', features: [] }
    }

    // Store to S3
    const key = buildParcelPath(
      parcelId,
      'skogsstyrelsen/harvest_notifications',
      'avverkningsanmalningar.geojson',
    )
    await uploadToS3(key, Buffer.from(JSON.stringify(collection, null, 2)), 'application/geo+json')

    await this.upsertOpenData(parcelId, 'skogsstyrelsen/harvest_notifications', key, {
      type: 'harvest_notifications',
      featureCount: collection.features.length,
      bbox,
      crs: 'EPSG:3006',
    })

    this.log.info({ parcelId, featureCount: collection.features.length }, 'Harvest notifications fetched')
    return collection
  }

  /**
   * Fetch nyckelbiotoper (key habitats) via WFS GetFeature.
   * Returns real GeoJSON from Skogsstyrelsen's public WFS.
   */
  async fetchKeyHabitats(
    bbox: BBox,
    parcelId: string,
  ): Promise<GeoJSONFeatureCollection> {
    this.log.info({ bbox, parcelId }, 'Fetching nyckelbiotoper (key habitats)')

    const url =
      `${this.WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature` +
      `&typeName=Nyckelbiotop` +
      `&srsName=EPSG:3006` +
      `&bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east},EPSG:3006` +
      `&outputFormat=application/json` +
      `&maxFeatures=500`

    let collection: GeoJSONFeatureCollection

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
      })

      if (!response.ok) {
        throw new Error(`WFS returned ${response.status}: ${await response.text().then(t => t.slice(0, 200))}`)
      }

      const data = (await response.json()) as { features?: unknown[] }

      collection = {
        type: 'FeatureCollection',
        features: (data.features ?? []) as GeoJSONFeatureCollection['features'],
      }
    } catch (err) {
      this.log.error(
        { err: err instanceof Error ? err.message : String(err) },
        'Failed to fetch key habitats, returning empty collection',
      )
      collection = { type: 'FeatureCollection', features: [] }
    }

    const key = buildParcelPath(
      parcelId,
      'skogsstyrelsen/key_habitats',
      'nyckelbiotoper.geojson',
    )
    await uploadToS3(key, Buffer.from(JSON.stringify(collection, null, 2)), 'application/geo+json')

    await this.upsertOpenData(parcelId, 'skogsstyrelsen/key_habitats', key, {
      type: 'key_habitats',
      featureCount: collection.features.length,
      bbox,
      crs: 'EPSG:3006',
    })

    this.log.info({ parcelId, featureCount: collection.features.length }, 'Key habitats fetched')
    return collection
  }

  /**
   * Upserts a row into the parcel_open_data table.
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

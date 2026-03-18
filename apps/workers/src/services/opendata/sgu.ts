import type { BBox, GeoJSONFeatureCollection, GeoJSONFeature } from '@beetlesense/shared'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * SGUFetcher — integrates with SGU (Sveriges geologiska undersökning / Geological Survey of Sweden).
 *
 * Real service endpoints:
 *   - WFS: https://resource.sgu.se/service/wfs/130/jordarter
 *   - WMS: https://resource.sgu.se/service/wms/130/jordarter
 *   - Open data: https://www.sgu.se/produkter-och-tjanster/geologiska-databaser/oppna-data/
 *
 * All services are free and public, no authentication required.
 * Data: Jordartskarta 1:25 000 / 1:100 000
 * CRS: EPSG:3006 (SWEREF99 TM)
 */
export class SGUFetcher {
  private readonly log = logger.child({ service: 'sgu' })

  /** WFS endpoint for jordarter (soil types) */
  private readonly WFS_BASE = 'https://resource.sgu.se/service/wfs/130/jordarter'

  /** Maximum features per WFS request */
  private readonly MAX_FEATURES = 5000

  /** Request timeout in ms */
  private readonly TIMEOUT_MS = 30_000

  /**
   * Fetch soil type data (jordarter) at 1:25 000 scale via WFS GetFeature.
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID
   * @returns GeoJSON FeatureCollection of soil polygons
   */
  async fetchSoilTypes(
    bbox: BBox,
    parcelId: string,
  ): Promise<GeoJSONFeatureCollection> {
    this.log.info({ bbox, parcelId }, 'Fetching soil types from SGU')

    const params = new URLSearchParams({
      service: 'WFS',
      version: '2.0.0',
      request: 'GetFeature',
      typeName: 'jordarter_25:JordartYta',
      srsName: 'EPSG:3006',
      bbox: `${bbox.south},${bbox.west},${bbox.north},${bbox.east},EPSG:3006`,
      outputFormat: 'application/json',
      count: String(this.MAX_FEATURES),
    })

    const url = `${this.WFS_BASE}?${params.toString()}`
    this.log.debug({ url }, 'WFS GetFeature request')

    let collection: GeoJSONFeatureCollection

    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), this.TIMEOUT_MS)

      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })
      clearTimeout(timeout)

      if (!response.ok) {
        throw new Error(`SGU WFS responded with ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (contentType.includes('xml') || contentType.includes('html')) {
        const body = await response.text()
        this.log.error({ contentType, body: body.slice(0, 500) }, 'SGU returned non-JSON response')
        throw new Error(`SGU WFS returned unexpected content-type: ${contentType}`)
      }

      const data = (await response.json()) as Record<string, unknown>

      // SGU WFS may return a FeatureCollection or an error object
      if (data.type !== 'FeatureCollection') {
        this.log.error({ responseType: data.type }, 'Unexpected WFS response type')
        throw new Error(`Expected FeatureCollection, got: ${data.type}`)
      }

      collection = data as unknown as GeoJSONFeatureCollection

      // Normalize feature properties to our standard schema
      collection.features = collection.features.map((f: GeoJSONFeature) => ({
        ...f,
        properties: {
          jordart_kod: f.properties.jordart ?? f.properties.jordart_kod ?? f.properties.JORDART ?? '',
          jordart_namn: f.properties.jordart_namn ?? f.properties.JORDART_NAMN ?? '',
          jordart_beskrivning: f.properties.beskrivning ?? f.properties.jordart_beskrivning ?? '',
          skala: '1:25000',
          textur: f.properties.textur ?? '',
          kornstorlek: f.properties.kornstorlek ?? '',
          vattenhallande: f.properties.vattenhallande ?? '',
          // Preserve original properties under _raw for debugging
          _raw_keys: Object.keys(f.properties),
        },
      }))

      this.log.info(
        { parcelId, featureCount: collection.features.length },
        'SGU WFS response received',
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.log.error({ parcelId, error: message }, 'Failed to fetch soil types from SGU')
      throw err
    }

    // Store to S3
    const key = buildParcelPath(
      parcelId,
      'sgu/soil_types',
      'jordarter.geojson',
    )
    await uploadToS3(
      key,
      Buffer.from(JSON.stringify(collection, null, 2)),
      'application/geo+json',
    )

    // Upsert to parcel_open_data
    const supabase = getSupabaseAdmin()

    const { data: existing } = await supabase
      .from('parcel_open_data')
      .select('id')
      .eq('parcel_id', parcelId)
      .eq('source', 'sgu/soil_types')
      .maybeSingle()

    const soilTypes = collection.features.map((f) => f.properties.jordart_kod).filter(Boolean)

    const metadata = {
      type: 'soil_types',
      scale: '1:25000',
      featureCount: collection.features.length,
      soilTypes: [...new Set(soilTypes)],
      bbox,
      crs: 'EPSG:3006',
    }

    if (existing) {
      await supabase
        .from('parcel_open_data')
        .update({
          storage_path: key,
          fetched_at: new Date().toISOString(),
          metadata,
          data_version: new Date().toISOString().slice(0, 10),
        })
        .eq('id', existing.id)
    } else {
      await supabase.from('parcel_open_data').insert({
        parcel_id: parcelId,
        source: 'sgu/soil_types',
        storage_path: key,
        metadata,
        data_version: new Date().toISOString().slice(0, 10),
      })
    }

    this.log.info(
      { parcelId, featureCount: collection.features.length, uniqueSoilTypes: soilTypes.length },
      'Soil types fetched and stored',
    )
    return collection
  }
}

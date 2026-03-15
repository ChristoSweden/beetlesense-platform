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

  /**
   * Fetch soil type data (jordarter) at 1:25 000 scale via WFS GetFeature.
   *
   * Real WFS request:
   *   GET {WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature
   *     &typeName=jordarter_25:JordartYta
   *     &srsName=EPSG:3006
   *     &bbox={south},{west},{north},{east},EPSG:3006
   *     &outputFormat=application/json
   *
   * Soil type codes (jordartskoder) follow SGU's classification system:
   *   - Mo  = Moränlera (till clay)
   *   - Sa  = Sand
   *   - Gr  = Grus (gravel)
   *   - Sv  = Svallsediment (wave-washed)
   *   - To  = Torv (peat)
   *   - Be  = Berg (bedrock)
   *   - Le  = Lera (clay)
   *   - Mo  = Morän (till)
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

    // TODO: Real implementation:
    // const url = `${this.WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature`
    //   + `&typeName=jordarter_25:JordartYta`
    //   + `&srsName=EPSG:3006`
    //   + `&bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east},EPSG:3006`
    //   + `&outputFormat=application/json`
    // const response = await fetch(url)
    // const geojson = await response.json()

    // Mock: Realistic soil type features for the Småland area
    const mockFeatures: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [bbox.west, bbox.south],
              [bbox.west + (bbox.east - bbox.west) * 0.6, bbox.south],
              [bbox.west + (bbox.east - bbox.west) * 0.6, bbox.north],
              [bbox.west, bbox.north],
              [bbox.west, bbox.south],
            ],
          ],
        },
        properties: {
          jordart_kod: 'Mo',
          jordart_namn: 'Morän',
          jordart_beskrivning: 'Sandig-siltig morän',
          skala: '1:25000',
          textur: 'sandig',
          kornstorlek: 'blandad',
          vattenhallande: 'medium',
        },
      },
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [bbox.west + (bbox.east - bbox.west) * 0.6, bbox.south],
              [bbox.east, bbox.south],
              [bbox.east, bbox.north],
              [bbox.west + (bbox.east - bbox.west) * 0.6, bbox.north],
              [bbox.west + (bbox.east - bbox.west) * 0.6, bbox.south],
            ],
          ],
        },
        properties: {
          jordart_kod: 'To',
          jordart_namn: 'Torv',
          jordart_beskrivning: 'Kärrtorv',
          skala: '1:25000',
          textur: 'organisk',
          kornstorlek: 'ej tillämplig',
          vattenhallande: 'hög',
        },
      },
    ]

    const collection: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: mockFeatures,
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

    const metadata = {
      type: 'soil_types',
      scale: '1:25000',
      featureCount: mockFeatures.length,
      soilTypes: mockFeatures.map((f) => f.properties.jordart_kod),
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
      { parcelId, featureCount: mockFeatures.length },
      'Soil types fetched and stored',
    )
    return collection
  }
}

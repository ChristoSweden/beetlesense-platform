import type { BBox, GeoJSONFeatureCollection, GeoJSONFeature } from '@beetlesense/shared'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3, buildParcelPath } from '../../lib/storage.js'
import { logger } from '../../lib/logger.js'

/**
 * SkogsstyrelsenFetcher — integrates with Skogsstyrelsen (Swedish Forest Agency) WFS/WCS services.
 *
 * Real service endpoints:
 *   - WFS: https://geodpags.skogsstyrelsen.se/geodataport/wfs
 *   - WCS (kNN rasters): https://geodpags.skogsstyrelsen.se/geodataport/wcs
 *   - Open data portal: https://www.skogsstyrelsen.se/sjalvservice/karttjanster/geodatatjanster/
 *
 * All services are free and public, no authentication required.
 * CRS: EPSG:3006 (SWEREF99 TM)
 */
export class SkogsstyrelsenFetcher {
  private readonly log = logger.child({ service: 'skogsstyrelsen' })

  /** Base WFS endpoint for Skogsstyrelsen */
  private readonly WFS_BASE = 'https://geodpags.skogsstyrelsen.se/geodataport/wfs'
  /** Base WCS endpoint for kNN rasters */
  private readonly WCS_BASE = 'https://geodpags.skogsstyrelsen.se/geodataport/wcs'

  /**
   * Fetch kNN (k Nearest Neighbour) forest variable rasters via WCS GetCoverage.
   *
   * Variables available as separate coverages:
   *   - skogligagrunddata:Volym       (timber volume, m3/ha)
   *   - skogligagrunddata:Hojd        (average tree height, dm)
   *   - skogligagrunddata:Alder       (stand age, years)
   *   - skogligagrunddata:Tradslag    (dominant species, coded)
   *
   * Real WCS request pattern:
   *   GET {WCS_BASE}?service=WCS&version=2.0.1&request=GetCoverage
   *     &coverageId=skogligagrunddata:Volym
   *     &subset=E({west},{east})&subset=N({south},{north})
   *     &format=image/tiff
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID
   * @returns Record of variable name to storage path
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
      // TODO: Real implementation:
      // const url = `${this.WCS_BASE}?service=WCS&version=2.0.1&request=GetCoverage`
      //   + `&coverageId=${variable.coverageId}`
      //   + `&subset=E(${bbox.west},${bbox.east})&subset=N(${bbox.south},${bbox.north})`
      //   + `&format=image/tiff`
      // const response = await fetch(url)
      // const buffer = Buffer.from(await response.arrayBuffer())

      const key = buildParcelPath(
        parcelId,
        'skogsstyrelsen/knn',
        `${variable.name}.tif`,
      )

      storagePaths[variable.name] = key

      this.log.debug(
        { parcelId, variable: variable.name, key },
        'kNN raster fetched (mock)',
      )
    }

    // Upsert metadata
    await this.upsertOpenData(parcelId, 'skogsstyrelsen/knn', storagePaths.volume!, {
      type: 'knn_forest_variables',
      variables: variables.map((v) => v.name),
      bbox,
      resolution_m: 12.5,
      crs: 'EPSG:3006',
      format: 'GeoTIFF',
      storagePaths,
    })

    this.log.info({ parcelId, variables: variables.length }, 'kNN rasters fetched')
    return storagePaths
  }

  /**
   * Fetch avverkningsanmälningar (harvest notifications) via WFS GetFeature.
   *
   * Real WFS request:
   *   GET {WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature
   *     &typeName=Avverkningsanmalan
   *     &srsName=EPSG:3006
   *     &bbox={south},{west},{north},{east},EPSG:3006
   *     &outputFormat=application/json
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID
   * @returns GeoJSON FeatureCollection of harvest notifications
   */
  async fetchHarvestNotifications(
    bbox: BBox,
    parcelId: string,
  ): Promise<GeoJSONFeatureCollection> {
    this.log.info({ bbox, parcelId }, 'Fetching harvest notifications (avverkningsanmälningar)')

    // TODO: Real implementation:
    // const url = `${this.WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature`
    //   + `&typeName=Avverkningsanmalan&srsName=EPSG:3006`
    //   + `&bbox=${bbox.south},${bbox.west},${bbox.north},${bbox.east},EPSG:3006`
    //   + `&outputFormat=application/json`
    // const response = await fetch(url)
    // const geojson = await response.json()

    // Mock: Realistic harvest notification features
    const mockFeatures: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [bbox.west + 50, bbox.south + 50],
              [bbox.west + 200, bbox.south + 50],
              [bbox.west + 200, bbox.south + 180],
              [bbox.west + 50, bbox.south + 180],
              [bbox.west + 50, bbox.south + 50],
            ],
          ],
        },
        properties: {
          arende_id: 'A-2024-12345',
          avverkningstyp: 'Föryngringsavverkning',
          anmald_areal_ha: 3.2,
          anmalt_datum: '2024-08-15',
          skogstyp: 'Barrskog',
          tradslag: 'Gran',
          status: 'Aktiv',
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
      'skogsstyrelsen/harvest_notifications',
      'avverkningsanmalningar.geojson',
    )
    await uploadToS3(key, Buffer.from(JSON.stringify(collection, null, 2)), 'application/geo+json')

    await this.upsertOpenData(parcelId, 'skogsstyrelsen/harvest_notifications', key, {
      type: 'harvest_notifications',
      featureCount: mockFeatures.length,
      bbox,
      crs: 'EPSG:3006',
    })

    this.log.info({ parcelId, featureCount: mockFeatures.length }, 'Harvest notifications fetched')
    return collection
  }

  /**
   * Fetch nyckelbiotoper (key habitats) via WFS GetFeature.
   *
   * Real WFS request:
   *   GET {WFS_BASE}?service=WFS&version=2.0.0&request=GetFeature
   *     &typeName=Nyckelbiotop
   *     &srsName=EPSG:3006
   *     &bbox={south},{west},{north},{east},EPSG:3006
   *     &outputFormat=application/json
   *
   * @param bbox - Bounding box in EPSG:3006
   * @param parcelId - Parcel UUID
   * @returns GeoJSON FeatureCollection of key habitats
   */
  async fetchKeyHabitats(
    bbox: BBox,
    parcelId: string,
  ): Promise<GeoJSONFeatureCollection> {
    this.log.info({ bbox, parcelId }, 'Fetching nyckelbiotoper (key habitats)')

    // TODO: Real implementation via WFS GetFeature

    const mockFeatures: GeoJSONFeature[] = [
      {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [bbox.west + 100, bbox.south + 200],
              [bbox.west + 250, bbox.south + 200],
              [bbox.west + 250, bbox.south + 350],
              [bbox.west + 100, bbox.south + 350],
              [bbox.west + 100, bbox.south + 200],
            ],
          ],
        },
        properties: {
          biotop_id: 'NB-2019-54321',
          biotop_typ: 'Bäckravinsskog',
          naturvardesklass: 'Klass 1',
          areal_ha: 1.8,
          inventerad_datum: '2019-06-20',
          arter: ['Hänglav', 'Plattlummer', 'Lunglav'],
        },
      },
    ]

    const collection: GeoJSONFeatureCollection = {
      type: 'FeatureCollection',
      features: mockFeatures,
    }

    const key = buildParcelPath(
      parcelId,
      'skogsstyrelsen/key_habitats',
      'nyckelbiotoper.geojson',
    )
    await uploadToS3(key, Buffer.from(JSON.stringify(collection, null, 2)), 'application/geo+json')

    await this.upsertOpenData(parcelId, 'skogsstyrelsen/key_habitats', key, {
      type: 'key_habitats',
      featureCount: mockFeatures.length,
      bbox,
      crs: 'EPSG:3006',
    })

    this.log.info({ parcelId, featureCount: mockFeatures.length }, 'Key habitats fetched')
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

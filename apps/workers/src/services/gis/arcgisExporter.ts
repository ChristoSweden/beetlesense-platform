import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { ArcGISClient, type ArcGISField, type ArcGISFeature } from './arcgisClient.js'

/**
 * ArcGIS Exporter — exports BeetleSense data to ArcGIS Online.
 *
 * Each export function creates or updates an ArcGIS Online item
 * and returns the sharing URL for the ArcGIS Map Viewer.
 *
 * Spatial data is converted from SWEREF99 TM (EPSG:3006) to WGS84 (EPSG:4326)
 * at the API boundary per project conventions.
 */

// ─── Types ───

export interface ArcGISExportResult {
  itemId: string
  serviceUrl: string
  mapViewerUrl: string
  featureCount: number
}

// ─── Exporter ───

export class ArcGISExporter {
  private readonly log = logger.child({ service: 'arcgis-exporter' })
  private readonly client = new ArcGISClient()
  private readonly supabase = getSupabaseAdmin()

  /**
   * Export a parcel boundary and its analysis results as a feature layer.
   *
   * Creates a polygon feature layer with the parcel boundary and attaches
   * key analysis attributes (area, volume, health score, tree species mix).
   *
   * @param parcelId - BeetleSense parcel UUID
   * @returns Export result with ArcGIS item ID and viewer URL
   */
  async exportParcelToArcGIS(parcelId: string): Promise<ArcGISExportResult> {
    this.log.info({ parcelId }, 'Exporting parcel to ArcGIS Online')

    // Fetch parcel data with geometry as GeoJSON (WGS84)
    const { data: parcel, error } = await this.supabase
      .from('parcels')
      .select(`
        id,
        name,
        area_ha,
        municipality,
        county,
        geometry_geojson,
        created_at,
        updated_at
      `)
      .eq('id', parcelId)
      .single()

    if (error || !parcel) {
      throw new Error(`Parcel not found: ${parcelId} — ${error?.message}`)
    }

    // Fetch latest analysis results
    const { data: analysis } = await this.supabase
      .from('parcel_analysis')
      .select('health_score, volume_m3_ha, dominant_species, beetle_risk_level, ndvi_mean, analyzed_at')
      .eq('parcel_id', parcelId)
      .order('analyzed_at', { ascending: false })
      .limit(1)
      .single()

    // Define fields
    const fields: ArcGISField[] = [
      { name: 'parcel_id', alias: 'Skifte-ID', type: 'esriFieldTypeString', length: 64 },
      { name: 'name', alias: 'Namn', type: 'esriFieldTypeString', length: 255 },
      { name: 'area_ha', alias: 'Areal (ha)', type: 'esriFieldTypeDouble' },
      { name: 'municipality', alias: 'Kommun', type: 'esriFieldTypeString', length: 100 },
      { name: 'county', alias: 'Län', type: 'esriFieldTypeString', length: 100 },
      { name: 'health_score', alias: 'Hälsoindex', type: 'esriFieldTypeDouble' },
      { name: 'volume_m3_ha', alias: 'Volym (m³/ha)', type: 'esriFieldTypeDouble' },
      { name: 'dominant_species', alias: 'Dominerande trädslag', type: 'esriFieldTypeString', length: 100 },
      { name: 'beetle_risk', alias: 'Barkborre-risk', type: 'esriFieldTypeString', length: 50 },
      { name: 'ndvi_mean', alias: 'NDVI medel', type: 'esriFieldTypeDouble' },
      { name: 'analyzed_at', alias: 'Senast analyserad', type: 'esriFieldTypeDate' },
    ]

    const serviceName = `BeetleSense_Parcel_${parcel.name?.replace(/[^a-zA-Z0-9]/g, '_') ?? parcelId.slice(0, 8)}`
    const serviceResult = await this.client.createFeatureService(serviceName, fields)

    // Convert GeoJSON geometry to ArcGIS format
    const geojson = parcel.geometry_geojson as { type: string; coordinates: unknown } | null
    const arcgisGeometry = geojson ? this.geoJsonToEsriGeometry(geojson) : undefined

    const feature: ArcGISFeature = {
      attributes: {
        parcel_id: parcel.id,
        name: parcel.name,
        area_ha: parcel.area_ha,
        municipality: parcel.municipality,
        county: parcel.county,
        health_score: analysis?.health_score ?? null,
        volume_m3_ha: analysis?.volume_m3_ha ?? null,
        dominant_species: analysis?.dominant_species ?? null,
        beetle_risk: analysis?.beetle_risk_level ?? null,
        ndvi_mean: analysis?.ndvi_mean ?? null,
        analyzed_at: analysis?.analyzed_at ? new Date(analysis.analyzed_at).getTime() : null,
      },
      geometry: arcgisGeometry,
    }

    const layerUrl = `${serviceResult.serviceurl}/0`
    await this.client.addFeatures(layerUrl, [feature])

    const mapViewerUrl = ArcGISClient.mapViewerUrl(serviceResult.itemId)

    this.log.info({ parcelId, itemId: serviceResult.itemId }, 'Parcel exported to ArcGIS')

    return {
      itemId: serviceResult.itemId,
      serviceUrl: serviceResult.serviceurl,
      mapViewerUrl,
      featureCount: 1,
    }
  }

  /**
   * Upload orthomosaic, DSM, and NDVI rasters from a survey as hosted imagery layers.
   *
   * @param surveyId - BeetleSense survey UUID
   * @returns Export result for the first published product
   */
  async exportSensorProducts(surveyId: string): Promise<ArcGISExportResult> {
    this.log.info({ surveyId }, 'Exporting sensor products to ArcGIS Online')

    // Fetch sensor products for the survey
    const { data: products, error } = await this.supabase
      .from('sensor_products')
      .select('id, survey_id, product_type, storage_path, file_size_bytes, created_at')
      .eq('survey_id', surveyId)
      .in('product_type', ['orthomosaic', 'dsm', 'ndvi', 'thermal'])

    if (error || !products || products.length === 0) {
      throw new Error(`No sensor products found for survey: ${surveyId} — ${error?.message}`)
    }

    let firstResult: ArcGISExportResult | null = null

    for (const product of products) {
      this.log.info(
        { productId: product.id, type: product.product_type },
        'Uploading sensor product',
      )

      // Download raster from S3 storage
      const { data: fileData, error: downloadError } = await this.supabase
        .storage
        .from('sensor-products')
        .download(product.storage_path)

      if (downloadError || !fileData) {
        this.log.warn(
          { productId: product.id, error: downloadError?.message },
          'Failed to download sensor product, skipping',
        )
        continue
      }

      const buffer = Buffer.from(await fileData.arrayBuffer())
      const filename = `BeetleSense_${product.product_type}_${surveyId.slice(0, 8)}.tif`

      // Upload to ArcGIS
      const uploadResult = await this.client.uploadItem(filename, buffer, 'GeoTIFF')

      // Publish as a tile layer
      const publishResult = await this.client.publishTileLayer(uploadResult.id)
      const publishedService = publishResult.services[0]

      if (!firstResult && publishedService) {
        firstResult = {
          itemId: publishedService.serviceItemId,
          serviceUrl: publishedService.serviceurl,
          mapViewerUrl: ArcGISClient.mapViewerUrl(publishedService.serviceItemId),
          featureCount: products.length,
        }
      }
    }

    if (!firstResult) {
      throw new Error(`Failed to export any sensor products for survey: ${surveyId}`)
    }

    this.log.info({ surveyId, itemId: firstResult.itemId }, 'Sensor products exported')
    return firstResult
  }

  /**
   * Export the tree inventory for a parcel as a point feature layer.
   *
   * Each tree becomes a point feature with species, height, diameter,
   * volume, health status, and bark beetle indicators.
   *
   * @param parcelId - BeetleSense parcel UUID
   * @returns Export result with ArcGIS item ID and viewer URL
   */
  async exportTreeInventory(parcelId: string): Promise<ArcGISExportResult> {
    this.log.info({ parcelId }, 'Exporting tree inventory to ArcGIS Online')

    // Fetch tree inventory
    const { data: trees, error } = await this.supabase
      .from('tree_inventory')
      .select(`
        id,
        parcel_id,
        species,
        height_m,
        diameter_cm,
        volume_m3,
        health_status,
        beetle_damage,
        crown_density,
        latitude,
        longitude,
        detected_at
      `)
      .eq('parcel_id', parcelId)

    if (error || !trees || trees.length === 0) {
      throw new Error(`No trees found for parcel: ${parcelId} — ${error?.message}`)
    }

    // Define fields
    const fields: ArcGISField[] = [
      { name: 'tree_id', alias: 'Träd-ID', type: 'esriFieldTypeString', length: 64 },
      { name: 'species', alias: 'Trädslag', type: 'esriFieldTypeString', length: 100 },
      { name: 'height_m', alias: 'Höjd (m)', type: 'esriFieldTypeDouble' },
      { name: 'diameter_cm', alias: 'Diameter (cm)', type: 'esriFieldTypeDouble' },
      { name: 'volume_m3', alias: 'Volym (m³)', type: 'esriFieldTypeDouble' },
      { name: 'health_status', alias: 'Hälsostatus', type: 'esriFieldTypeString', length: 50 },
      { name: 'beetle_damage', alias: 'Barkborreskada', type: 'esriFieldTypeString', length: 50 },
      { name: 'crown_density', alias: 'Krontäthet', type: 'esriFieldTypeDouble' },
      { name: 'detected_at', alias: 'Detekterad', type: 'esriFieldTypeDate' },
    ]

    const serviceName = `BeetleSense_Trees_${parcelId.slice(0, 8)}`
    const serviceResult = await this.client.createFeatureService(serviceName, fields)

    // Convert trees to ArcGIS features
    const features: ArcGISFeature[] = trees.map((tree) => ({
      attributes: {
        tree_id: tree.id,
        species: tree.species,
        height_m: tree.height_m,
        diameter_cm: tree.diameter_cm,
        volume_m3: tree.volume_m3,
        health_status: tree.health_status,
        beetle_damage: tree.beetle_damage,
        crown_density: tree.crown_density,
        detected_at: tree.detected_at ? new Date(tree.detected_at).getTime() : null,
      },
      geometry: {
        x: tree.longitude,
        y: tree.latitude,
        spatialReference: { wkid: 4326 },
      },
    }))

    const layerUrl = `${serviceResult.serviceurl}/0`
    await this.client.addFeatures(layerUrl, features)

    const mapViewerUrl = ArcGISClient.mapViewerUrl(serviceResult.itemId)

    this.log.info(
      { parcelId, itemId: serviceResult.itemId, treeCount: trees.length },
      'Tree inventory exported',
    )

    return {
      itemId: serviceResult.itemId,
      serviceUrl: serviceResult.serviceurl,
      mapViewerUrl,
      featureCount: trees.length,
    }
  }

  /**
   * Export beetle stress classification as a hosted feature layer.
   *
   * Creates a polygon feature layer with beetle risk zones, stress levels,
   * and recommended actions.
   *
   * @param parcelId - BeetleSense parcel UUID
   * @returns Export result with ArcGIS item ID and viewer URL
   */
  async exportBeetleRiskMap(parcelId: string): Promise<ArcGISExportResult> {
    this.log.info({ parcelId }, 'Exporting beetle risk map to ArcGIS Online')

    // Fetch beetle risk zones
    const { data: zones, error } = await this.supabase
      .from('beetle_risk_zones')
      .select(`
        id,
        parcel_id,
        risk_level,
        stress_class,
        confidence,
        area_ha,
        tree_count_affected,
        recommended_action,
        geometry_geojson,
        detected_at
      `)
      .eq('parcel_id', parcelId)

    if (error || !zones || zones.length === 0) {
      throw new Error(`No beetle risk zones found for parcel: ${parcelId} — ${error?.message}`)
    }

    // Define fields
    const fields: ArcGISField[] = [
      { name: 'zone_id', alias: 'Zon-ID', type: 'esriFieldTypeString', length: 64 },
      { name: 'risk_level', alias: 'Risknivå', type: 'esriFieldTypeString', length: 50 },
      { name: 'stress_class', alias: 'Stressklass', type: 'esriFieldTypeString', length: 50 },
      { name: 'confidence', alias: 'Konfidens', type: 'esriFieldTypeDouble' },
      { name: 'area_ha', alias: 'Areal (ha)', type: 'esriFieldTypeDouble' },
      { name: 'trees_affected', alias: 'Drabbade träd', type: 'esriFieldTypeInteger' },
      { name: 'action', alias: 'Rekommenderad åtgärd', type: 'esriFieldTypeString', length: 255 },
      { name: 'detected_at', alias: 'Detekterad', type: 'esriFieldTypeDate' },
    ]

    const serviceName = `BeetleSense_BeetleRisk_${parcelId.slice(0, 8)}`
    const serviceResult = await this.client.createFeatureService(serviceName, fields)

    // Convert zones to ArcGIS features
    const features: ArcGISFeature[] = zones.map((zone) => {
      const geojson = zone.geometry_geojson as { type: string; coordinates: unknown } | null

      return {
        attributes: {
          zone_id: zone.id,
          risk_level: zone.risk_level,
          stress_class: zone.stress_class,
          confidence: zone.confidence,
          area_ha: zone.area_ha,
          trees_affected: zone.tree_count_affected,
          action: zone.recommended_action,
          detected_at: zone.detected_at ? new Date(zone.detected_at).getTime() : null,
        },
        geometry: geojson ? this.geoJsonToEsriGeometry(geojson) : undefined,
      }
    })

    const layerUrl = `${serviceResult.serviceurl}/0`
    await this.client.addFeatures(layerUrl, features)

    const mapViewerUrl = ArcGISClient.mapViewerUrl(serviceResult.itemId)

    this.log.info(
      { parcelId, itemId: serviceResult.itemId, zoneCount: zones.length },
      'Beetle risk map exported',
    )

    return {
      itemId: serviceResult.itemId,
      serviceUrl: serviceResult.serviceurl,
      mapViewerUrl,
      featureCount: zones.length,
    }
  }

  // ─── Helpers ───

  /**
   * Convert a GeoJSON geometry to Esri JSON geometry format.
   * Handles Point, Polygon, MultiPolygon, LineString, and MultiPoint.
   */
  private geoJsonToEsriGeometry(
    geojson: { type: string; coordinates: unknown },
  ): ArcGISFeature['geometry'] {
    const sr: { wkid: number } = { wkid: 4326 }

    switch (geojson.type) {
      case 'Point': {
        const coords = geojson.coordinates as [number, number]
        return { x: coords[0], y: coords[1], spatialReference: sr }
      }
      case 'Polygon': {
        const rings = geojson.coordinates as number[][][]
        return { rings, spatialReference: sr }
      }
      case 'MultiPolygon': {
        const multiRings = geojson.coordinates as number[][][][]
        const flatRings = multiRings.flat()
        return { rings: flatRings, spatialReference: sr }
      }
      case 'LineString': {
        const path = geojson.coordinates as number[][]
        return { paths: [path], spatialReference: sr }
      }
      case 'MultiPoint': {
        const pts = geojson.coordinates as number[][]
        return { points: pts, spatialReference: sr }
      }
      default:
        this.log.warn({ geometryType: geojson.type }, 'Unsupported GeoJSON geometry type')
        return undefined
    }
  }
}

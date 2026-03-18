import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3 } from '../../lib/storage.js'
import {
  DroneDeployClient,
  type DroneDeployMap,
  type DroneDeployExport,
  type DroneDeployLayer,
} from './dronedeployClient.js'

/**
 * DroneDeploy Sync Service — bridges DroneDeploy maps with the
 * BeetleSense analysis pipeline.
 *
 * Capabilities:
 * - Pull all maps from a DroneDeploy account into BeetleSense
 * - Import a specific DD map: export layers, download, upload to S3,
 *   create sensor_products records, and trigger analysis
 * - Push BeetleSense analysis results back to DroneDeploy as annotations
 */
export class DroneDeploySyncService {
  private readonly log = logger.child({ service: 'dronedeploy-sync' })
  private readonly client: DroneDeployClient

  constructor(client?: DroneDeployClient) {
    this.client = client ?? new DroneDeployClient()
  }

  /**
   * Pull all maps from DroneDeploy into BeetleSense for an organization.
   *
   * Creates or updates dd_maps records so users can browse and selectively import.
   */
  async syncFromDroneDeploy(organizationId: string): Promise<{
    totalMaps: number
    newMaps: number
    updatedMaps: number
  }> {
    this.log.info({ organizationId }, 'Starting full DroneDeploy sync')

    const supabase = getSupabaseAdmin()
    let newMaps = 0
    let updatedMaps = 0

    // Fetch all maps from the DroneDeploy account
    const ddMaps = await this.client.listMaps({ limit: 200 })
    this.log.info({ mapCount: ddMaps.length }, 'Fetched maps from DroneDeploy')

    for (const ddMap of ddMaps) {
      const record = {
        organization_id: organizationId,
        dd_map_id: ddMap.id,
        dd_plan_id: ddMap.plan_id,
        name: ddMap.name,
        status: ddMap.status,
        location: ddMap.location
          ? `SRID=4326;POINT(${ddMap.location.lng} ${ddMap.location.lat})`
          : null,
        date_created: ddMap.date_creation,
        area_m2: ddMap.area_m2,
        resolution_cm: ddMap.resolution_cm,
        image_count: ddMap.image_count,
        available_layers: ddMap.layers,
        synced_at: new Date().toISOString(),
      }

      const { data: existing } = await supabase
        .from('dd_maps')
        .select('id')
        .eq('dd_map_id', ddMap.id)
        .eq('organization_id', organizationId)
        .maybeSingle()

      if (existing) {
        await supabase.from('dd_maps').update(record).eq('id', existing.id)
        updatedMaps++
      } else {
        await supabase.from('dd_maps').insert(record)
        newMaps++
      }
    }

    this.log.info(
      { organizationId, totalMaps: ddMaps.length, newMaps, updatedMaps },
      'DroneDeploy sync complete',
    )

    return { totalMaps: ddMaps.length, newMaps, updatedMaps }
  }

  /**
   * Import a specific DroneDeploy map into BeetleSense.
   *
   * Steps:
   * 1. Request exports of orthomosaic + DSM + plant health as GeoTIFF
   * 2. Poll until exports are ready
   * 3. Download via signed URL
   * 4. Upload to BeetleSense S3 storage
   * 5. Create sensor_products records
   * 6. Trigger the BeetleSense analysis pipeline
   */
  async importMap(
    mapId: string,
    parcelId: string,
    surveyId: string,
  ): Promise<{
    importedLayers: string[]
    totalSizeBytes: number
    sensorProductIds: string[]
  }> {
    this.log.info({ mapId, parcelId, surveyId }, 'Importing DroneDeploy map')

    const supabase = getSupabaseAdmin()
    const importedLayers: string[] = []
    const sensorProductIds: string[] = []
    let totalSizeBytes = 0

    // Verify the map is ready
    const ddMap = await this.client.getMap(mapId)
    if (ddMap.status !== 'complete') {
      throw new Error(`DroneDeploy map ${mapId} is not yet processed (status: ${ddMap.status})`)
    }

    // Define the layers we want to export
    const layerSets: Array<{ layers: DroneDeployLayer[]; productType: string }> = [
      { layers: ['orthomosaic'], productType: 'drone_rgb' },
      { layers: ['elevation'], productType: 'drone_dsm' },
      { layers: ['plant_health'], productType: 'drone_plant_health' },
    ]

    // Filter to only available layers
    const availableSets = layerSets.filter(set =>
      set.layers.every(layer => ddMap.layers.includes(layer)),
    )

    // Request all exports in parallel
    const exportRequests = await Promise.all(
      availableSets.map(set => this.client.createExport(mapId, 'geotiff', set.layers)),
    )

    // Poll for export completion
    const completedExports = await Promise.all(
      exportRequests.map(exp => this.waitForExport(exp.id)),
    )

    // Download and upload each completed export
    for (let i = 0; i < completedExports.length; i++) {
      const ddExport = completedExports[i]
      const { productType } = availableSets[i]

      if (!ddExport || ddExport.status !== 'complete' || !ddExport.download_url) {
        this.log.warn(
          { exportId: ddExport?.id, status: ddExport?.status },
          'Skipping failed/incomplete export',
        )
        continue
      }

      try {
        // Download the exported file
        const response = await fetch(ddExport.download_url)
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())
        const fileSize = buffer.length

        // Build storage path
        const layerSlug = availableSets[i].layers.join('_')
        const storagePath = `surveys/${surveyId}/dronedeploy_${layerSlug}_${mapId}.tif`

        // Upload to S3
        await uploadToS3(storagePath, buffer, 'image/tiff')

        // Create sensor_products record
        const { data: product } = await supabase
          .from('sensor_products')
          .insert({
            survey_id: surveyId,
            parcel_id: parcelId,
            product_type: productType,
            storage_path: storagePath,
            file_size_bytes: fileSize,
            mime_type: 'image/tiff',
            status: 'uploaded',
            source: 'dronedeploy',
            metadata: {
              dd_map_id: mapId,
              dd_export_id: ddExport.id,
              dd_layers: availableSets[i].layers,
              resolution_cm: ddMap.resolution_cm,
              area_m2: ddMap.area_m2,
            },
          })
          .select('id')
          .single()

        if (product) {
          sensorProductIds.push(product.id)
        }

        importedLayers.push(...availableSets[i].layers)
        totalSizeBytes += fileSize

        this.log.info(
          { productType, layerSlug, sizeMB: Math.round(fileSize / 1048576) },
          'Layer imported from DroneDeploy',
        )
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.log.error({ productType, error: msg }, 'Failed to import DroneDeploy layer')
      }
    }

    // Trigger the analysis pipeline for each sensor product
    if (sensorProductIds.length > 0) {
      for (const productId of sensorProductIds) {
        await supabase.from('analysis_queue').insert({
          survey_id: surveyId,
          sensor_product_id: productId,
          analysis_type: 'bark_beetle_detection',
          status: 'pending',
          priority: 5,
          metadata: { source: 'dronedeploy_import', dd_map_id: mapId },
        })
      }

      this.log.info(
        { surveyId, queuedProducts: sensorProductIds.length },
        'Analysis pipeline triggered for DroneDeploy imports',
      )
    }

    // Update the dd_maps record to reflect the import
    await supabase
      .from('dd_maps')
      .update({
        imported_at: new Date().toISOString(),
        linked_survey_id: surveyId,
        linked_parcel_id: parcelId,
        imported_layers: importedLayers,
      })
      .eq('dd_map_id', mapId)

    this.log.info(
      { mapId, importedLayers, totalSizeMB: Math.round(totalSizeBytes / 1048576), sensorProductIds },
      'DroneDeploy map import complete',
    )

    return { importedLayers, totalSizeBytes, sensorProductIds }
  }

  /**
   * Push BeetleSense analysis results back to DroneDeploy as annotations.
   *
   * Creates marker annotations for detected infestations and area annotations
   * for affected zones on the corresponding DroneDeploy map.
   */
  async pushToDroneDeploy(surveyId: string): Promise<{
    annotationsCreated: number
    ddMapId: string | null
  }> {
    this.log.info({ surveyId }, 'Pushing analysis results to DroneDeploy')

    const supabase = getSupabaseAdmin()
    let annotationsCreated = 0

    // Find the DD map linked to this survey
    const { data: ddMapRecord } = await supabase
      .from('dd_maps')
      .select('dd_map_id')
      .eq('linked_survey_id', surveyId)
      .maybeSingle()

    if (!ddMapRecord?.dd_map_id) {
      this.log.warn({ surveyId }, 'No DroneDeploy map linked to this survey')
      return { annotationsCreated: 0, ddMapId: null }
    }

    const ddMapId = ddMapRecord.dd_map_id

    // Fetch analysis results (detections) for this survey
    const { data: detections } = await supabase
      .from('detections')
      .select('id, detection_type, confidence, severity, geometry, area_m2, metadata')
      .eq('survey_id', surveyId)
      .gte('confidence', 0.7)
      .order('confidence', { ascending: false })

    if (!detections || detections.length === 0) {
      this.log.info({ surveyId }, 'No detections to push to DroneDeploy')
      return { annotationsCreated: 0, ddMapId }
    }

    // Severity to color mapping
    const severityColors: Record<string, string> = {
      critical: '#ff0000',
      high: '#ff6600',
      medium: '#ffaa00',
      low: '#ffff00',
    }

    for (const detection of detections) {
      try {
        const geometry = detection.geometry as GeoJSON.Point | GeoJSON.Polygon
        const isPoint = geometry.type === 'Point'

        await this.client.createAnnotation(ddMapId, {
          type: isPoint ? 'marker' : 'area',
          geometry,
          properties: {
            title: `BeetleSense: ${detection.detection_type}`,
            description: [
              `Konfidensgrad: ${Math.round(detection.confidence * 100)}%`,
              `Allvarlighetsgrad: ${detection.severity}`,
              detection.area_m2 ? `Area: ${detection.area_m2.toFixed(1)} m2` : null,
              `Detektions-ID: ${detection.id}`,
            ].filter(Boolean).join('\n'),
            color: severityColors[detection.severity] ?? '#ffaa00',
            value: detection.confidence,
          },
        })

        annotationsCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.log.error({ detectionId: detection.id, error: msg }, 'Failed to create DD annotation')
      }
    }

    this.log.info(
      { surveyId, ddMapId, annotationsCreated, totalDetections: detections.length },
      'DroneDeploy annotation push complete',
    )

    return { annotationsCreated, ddMapId }
  }

  // ─── Helpers ───

  /**
   * Poll a DroneDeploy export until it completes or fails.
   */
  private async waitForExport(
    exportId: string,
    maxWaitMs = 300_000,
    intervalMs = 5_000,
  ): Promise<DroneDeployExport> {
    const start = Date.now()

    while (Date.now() - start < maxWaitMs) {
      const exp = await this.client.getExport(exportId)

      if (exp.status === 'complete' || exp.status === 'failed') {
        return exp
      }

      this.log.debug({ exportId, status: exp.status }, 'Waiting for DroneDeploy export')
      await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error(`DroneDeploy export ${exportId} timed out after ${maxWaitMs / 1000}s`)
  }
}

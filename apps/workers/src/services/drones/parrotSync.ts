import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3 } from '../../lib/storage.js'
import { ParrotCloudClient, type ParrotMediaFile, type ParrotModel } from './parrotClient.js'

/**
 * Parrot Media Sync Service — downloads media files from Parrot Cloud
 * and ingests them into the BeetleSense processing pipeline.
 *
 * After a Parrot ANAFI flight completes:
 * 1. Lists all media files captured during the flight
 * 2. Downloads each file via signed URL from Parrot Cloud
 * 3. Uploads to BeetleSense S3 storage
 * 4. Creates survey_uploads records for the processing pipeline
 *
 * Handles Parrot-specific image metadata:
 * - ANAFI USA/Thermal: separate RGB and FLIR thermal channels
 * - ANAFI Ai: high-res 48MP images with 4G upload metadata
 * - All models: gimbal orientation from XMP metadata
 */
export class ParrotMediaSyncService {
  private readonly log = logger.child({ service: 'parrot-media-sync' })
  private readonly client: ParrotCloudClient

  constructor(client?: ParrotCloudClient) {
    this.client = client ?? new ParrotCloudClient()
  }

  /**
   * Sync all media from a Parrot drone flight into BeetleSense.
   */
  async syncFlightMedia(
    deviceId: string,
    flightId: string,
    surveyId: string,
    droneModel: ParrotModel,
  ): Promise<{ syncedCount: number; failedCount: number; totalSizeBytes: number }> {
    this.log.info({ deviceId, flightId, surveyId, droneModel }, 'Starting Parrot media sync')

    const supabase = getSupabaseAdmin()
    let syncedCount = 0
    let failedCount = 0
    let totalSizeBytes = 0

    // List all media files from the device
    const mediaFiles = await this.client.listMedia(deviceId)
    this.log.info({ fileCount: mediaFiles.length }, 'Found Parrot media files to sync')

    for (const file of mediaFiles) {
      try {
        // Download the file from Parrot Cloud
        const downloadUrl = await this.client.getMediaDownloadUrl(deviceId, file.id)
        const response = await fetch(downloadUrl)
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())

        // Determine BeetleSense upload type from Parrot file metadata
        const uploadType = this.mapFileTypeToUploadType(file, droneModel)
        const storagePath = `surveys/${surveyId}/${file.id}_${file.filename}`

        // Upload to BeetleSense S3
        await uploadToS3(storagePath, buffer, file.mime_type)

        // Register in parrot_media table
        await supabase.from('parrot_media').upsert({
          flight_id: flightId,
          device_id: deviceId,
          parrot_media_id: file.id,
          filename: file.filename,
          file_type: file.file_type,
          mime_type: file.mime_type,
          file_size_bytes: file.file_size,
          storage_path: storagePath,
          location: file.gps
            ? `SRID=4326;POINT(${file.gps.longitude} ${file.gps.latitude})`
            : null,
          altitude_m: file.gps?.altitude ?? null,
          drone_model: droneModel,
          sync_status: 'downloaded',
          synced_at: new Date().toISOString(),
          captured_at: file.created_at,
          metadata: this.extractParrotMetadata(file, droneModel),
        }, { onConflict: 'parrot_media_id' })

        // Create survey_upload record for the processing pipeline
        await supabase.from('survey_uploads').insert({
          survey_id: surveyId,
          upload_type: uploadType,
          storage_path: storagePath,
          file_name: file.filename,
          file_size: file.file_size,
          mime_type: file.mime_type,
          upload_status: 'uploaded',
          metadata: {
            source: 'parrot_cloud_sync',
            parrot_media_id: file.id,
            parrot_flight_id: flightId,
            parrot_device_id: deviceId,
            drone_model: droneModel,
            capture_time: file.created_at,
            gps: file.gps,
            gimbal: {
              pitch: file.metadata.gimbal_pitch,
              roll: file.metadata.gimbal_roll,
              yaw: file.metadata.gimbal_yaw,
            },
          },
        })

        syncedCount++
        totalSizeBytes += file.file_size
        this.log.debug(
          { filename: file.filename, uploadType },
          'Parrot media file synced',
        )
      } catch (err) {
        failedCount++
        const msg = err instanceof Error ? err.message : String(err)
        this.log.error({ filename: file.filename, error: msg }, 'Failed to sync Parrot media file')

        // Record failure
        try { await supabase.from('parrot_media').upsert({
          flight_id: flightId,
          device_id: deviceId,
          parrot_media_id: file.id,
          filename: file.filename,
          file_type: file.file_type,
          file_size_bytes: file.file_size,
          drone_model: droneModel,
          sync_status: 'failed',
          metadata: { error: msg },
          captured_at: file.created_at,
        }, { onConflict: 'parrot_media_id' })
        } catch { /* ignore upsert failure */ }
      }
    }

    this.log.info(
      { flightId, syncedCount, failedCount, totalSizeMB: Math.round(totalSizeBytes / 1048576) },
      'Parrot media sync complete',
    )

    return { syncedCount, failedCount, totalSizeBytes }
  }

  /**
   * Sync flight logs from a Parrot drone.
   */
  async syncFlightLogs(
    deviceId: string,
    surveyId: string,
    options?: { start?: string; end?: string },
  ): Promise<number> {
    this.log.info({ deviceId, surveyId }, 'Syncing Parrot flight logs')

    const supabase = getSupabaseAdmin()
    const logs = await this.client.listFlightLogs(deviceId, options)
    let syncedCount = 0

    for (const flightLog of logs) {
      try {
        const downloadUrl = await this.client.getFlightLogDownloadUrl(deviceId, flightLog.id)
        const response = await fetch(downloadUrl)
        if (!response.ok) continue

        const buffer = Buffer.from(await response.arrayBuffer())
        const storagePath = `surveys/${surveyId}/flight-logs/${flightLog.id}.gutma`

        await uploadToS3(storagePath, buffer, 'application/json')

        await supabase.from('parrot_flight_logs').upsert({
          parrot_log_id: flightLog.id,
          flight_id: flightLog.flight_id,
          device_id: deviceId,
          survey_id: surveyId,
          start_time: flightLog.start_time,
          end_time: flightLog.end_time,
          duration_s: flightLog.duration_s,
          max_altitude_m: flightLog.max_altitude_m,
          max_distance_m: flightLog.max_distance_m,
          total_distance_m: flightLog.total_distance_m,
          battery_consumed_pct: flightLog.battery_consumed_pct,
          storage_path: storagePath,
          synced_at: new Date().toISOString(),
        }, { onConflict: 'parrot_log_id' })

        syncedCount++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        this.log.warn({ logId: flightLog.id, error: msg }, 'Failed to sync flight log')
      }
    }

    this.log.info({ deviceId, syncedCount, totalLogs: logs.length }, 'Parrot flight log sync complete')
    return syncedCount
  }

  /**
   * Map Parrot file type to BeetleSense upload type.
   *
   * Parrot-specific mappings:
   * - ANAFI USA/Thermal thermal images -> drone_thermal
   * - DNG raw files -> drone_rgb (raw)
   * - Regular photos -> drone_rgb
   * - Videos -> drone_video
   */
  private mapFileTypeToUploadType(file: ParrotMediaFile, model: ParrotModel): string {
    if (file.file_type === 'thermal') return 'drone_thermal'
    if (file.file_type === 'video') return 'drone_video'
    if (file.file_type === 'dng') return 'drone_rgb'

    // For thermal-capable models, check if filename contains thermal indicators
    if (
      (model === 'anafi_usa' || model === 'anafi_thermal') &&
      (file.filename.toLowerCase().includes('flir') || file.filename.toLowerCase().includes('thermal'))
    ) {
      return 'drone_thermal'
    }

    return 'drone_rgb'
  }

  /**
   * Extract Parrot-specific metadata for the survey processing pipeline.
   *
   * Parrot drones embed metadata in XMP/EXIF:
   * - Gimbal orientation (pitch/roll/yaw) for photogrammetry alignment
   * - GPS coordinates and altitude for geotagging
   * - Exposure settings for radiometric calibration
   * - ANAFI Ai: 4G upload status and connection quality
   */
  private extractParrotMetadata(
    file: ParrotMediaFile,
    model: ParrotModel,
  ): Record<string, unknown> {
    return {
      source_manufacturer: 'parrot',
      drone_model: model,
      ndaa_compliant: true,
      capture_time: file.created_at,
      gps: file.gps,
      gimbal: {
        pitch: file.metadata.gimbal_pitch,
        roll: file.metadata.gimbal_roll,
        yaw: file.metadata.gimbal_yaw,
      },
      camera: {
        exposure_time: file.metadata.exposure_time,
        iso: file.metadata.iso,
        focal_length_mm: file.metadata.focal_length_mm,
      },
      is_thermal: file.file_type === 'thermal',
      has_4g_upload: model === 'anafi_ai',
    }
  }

  /**
   * Get MIME type from filename extension.
   */
  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg': case 'jpeg': return 'image/jpeg'
      case 'tif': case 'tiff': return 'image/tiff'
      case 'png': return 'image/png'
      case 'dng': return 'image/x-adobe-dng'
      case 'mp4': return 'video/mp4'
      case 'mov': return 'video/quicktime'
      default: return 'application/octet-stream'
    }
  }
}

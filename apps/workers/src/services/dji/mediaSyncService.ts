import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3 } from '../../lib/storage.js'
import { DjiCloudApiClient } from './cloudApiClient.js'

/**
 * DJI Media Sync Service — downloads media files from DJI Cloud
 * and ingests them into the BeetleSense processing pipeline.
 *
 * After a mission completes:
 * 1. Lists all media files captured during the mission
 * 2. Downloads each file via signed URL from DJI Cloud
 * 3. Uploads to BeetleSense S3 storage
 * 4. Creates survey_uploads records for each file
 * 5. Triggers the sensor processing pipeline
 */
export class MediaSyncService {
  private readonly log = logger.child({ service: 'dji-media-sync' })
  private readonly client: DjiCloudApiClient

  constructor(client?: DjiCloudApiClient) {
    this.client = client ?? new DjiCloudApiClient()
  }

  /**
   * Sync all media from a completed DJI mission into BeetleSense.
   */
  async syncMissionMedia(
    missionId: string,
    workspaceId: string,
    deviceSn: string,
    surveyId: string,
  ): Promise<{ syncedCount: number; failedCount: number; totalSizeBytes: number }> {
    this.log.info({ missionId, workspaceId, deviceSn, surveyId }, 'Starting media sync')

    const supabase = getSupabaseAdmin()
    let syncedCount = 0
    let failedCount = 0
    let totalSizeBytes = 0

    // List all media files from the mission
    const mediaFiles = await this.client.listMedia(workspaceId, deviceSn)
    this.log.info({ fileCount: mediaFiles.length }, 'Found media files to sync')

    // Map DJI sensor types to BeetleSense upload types
    const sensorToUploadType: Record<string, string> = {
      rgb: 'drone_rgb',
      multispectral: 'drone_multispectral',
      thermal: 'drone_thermal',
      ir: 'drone_thermal',
      lidar: 'drone_lidar',
    }

    for (const file of mediaFiles) {
      try {
        // Get download URL from DJI Cloud
        const downloadUrl = await this.client.getMediaDownloadUrl(workspaceId, deviceSn, file.file_id)

        // Download the file
        const response = await fetch(downloadUrl)
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())

        // Determine storage path
        const uploadType = sensorToUploadType[file.payload_index.includes('thermal') ? 'thermal' : file.payload_index] ?? 'drone_rgb'
        const storagePath = `surveys/${surveyId}/${file.file_id}_${file.file_name}`

        // Upload to BeetleSense S3
        await uploadToS3(storagePath, buffer, this.getMimeType(file.file_name))

        // Register in dji_media table
        await supabase.from('dji_media').upsert({
          mission_id: missionId,
          filename: file.file_name,
          file_type: file.media_type,
          sensor_type: this.mapPayloadToSensor(file.payload_index),
          mime_type: this.getMimeType(file.file_name),
          file_size_bytes: file.file_size,
          storage_path: storagePath,
          location: file.geo ? `SRID=4326;POINT(${file.geo.longitude} ${file.geo.latitude})` : null,
          altitude_m: file.geo?.altitude,
          sync_status: 'downloaded',
          synced_at: new Date().toISOString(),
          captured_at: new Date(file.created_time * 1000).toISOString(),
          metadata: { dji_file_id: file.file_id },
        }, { onConflict: 'id' })

        // Create survey_upload record for the processing pipeline
        await supabase.from('survey_uploads').insert({
          survey_id: surveyId,
          upload_type: uploadType,
          storage_path: storagePath,
          file_name: file.file_name,
          file_size: file.file_size,
          mime_type: this.getMimeType(file.file_name),
          upload_status: 'uploaded',
          metadata: {
            source: 'dji_cloud_sync',
            dji_file_id: file.file_id,
            dji_mission_id: missionId,
            capture_time: file.created_time,
            gps: file.geo,
          },
        })

        syncedCount++
        totalSizeBytes += file.file_size
        this.log.debug(
          { filename: file.file_name, sensorType: this.mapPayloadToSensor(file.payload_index) },
          'File synced',
        )
      } catch (err) {
        failedCount++
        const msg = err instanceof Error ? err.message : String(err)
        this.log.error({ filename: file.file_name, error: msg }, 'Failed to sync file')

        // Record failure
        await supabase.from('dji_media').upsert({
          mission_id: missionId,
          filename: file.file_name,
          file_type: file.media_type,
          sensor_type: this.mapPayloadToSensor(file.payload_index),
          file_size_bytes: file.file_size,
          sync_status: 'failed',
          metadata: { error: msg, dji_file_id: file.file_id },
          captured_at: new Date(file.created_time * 1000).toISOString(),
        }, { onConflict: 'id' }).then(() => {}, () => {})
      }
    }

    // Update mission media count
    await supabase
      .from('dji_missions')
      .update({ media_count: syncedCount })
      .eq('id', missionId)

    this.log.info(
      { missionId, syncedCount, failedCount, totalSizeMB: Math.round(totalSizeBytes / 1048576) },
      'Media sync complete',
    )

    return { syncedCount, failedCount, totalSizeBytes }
  }

  private mapPayloadToSensor(payloadIndex: string): string {
    if (payloadIndex.includes('thermal') || payloadIndex.includes('ir')) return 'thermal'
    if (payloadIndex.includes('multispectral') || payloadIndex.includes('ms')) return 'multispectral'
    if (payloadIndex.includes('lidar') || payloadIndex.includes('L1') || payloadIndex.includes('L2')) return 'lidar'
    return 'rgb'
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg': case 'jpeg': return 'image/jpeg'
      case 'tif': case 'tiff': return 'image/tiff'
      case 'png': return 'image/png'
      case 'dng': return 'image/x-adobe-dng'
      case 'mp4': return 'video/mp4'
      case 'mov': return 'video/quicktime'
      case 'las': case 'laz': return 'application/vnd.las'
      default: return 'application/octet-stream'
    }
  }
}

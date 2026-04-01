import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { uploadToS3 } from '../../lib/storage.js'
import { AutelCloudApiClient, type AutelMediaFile } from './autelClient.js'

/**
 * Autel Media Sync Service — downloads media files from Autel Cloud
 * and ingests them into the BeetleSense processing pipeline.
 *
 * Follows the same flow as the DJI MediaSyncService:
 * 1. Lists all media files captured during the mission
 * 2. Downloads each file via signed URL from Autel Cloud
 * 3. Uploads to BeetleSense S3 storage
 * 4. Creates survey_uploads records for each file
 * 5. Triggers the sensor processing pipeline
 *
 * Handles Autel-specific differences:
 * - Different EXIF tag names (XMP:AutelDrone vs DJI-specific tags)
 * - Different media type naming (thermal_photo vs photo with thermal payload)
 * - Autel geo data includes heading alongside lat/lng/alt
 */

/**
 * Map Autel media types to BeetleSense upload types.
 *
 * Autel uses explicit media_type values like 'thermal_photo' and
 * 'thermal_video', whereas DJI uses payload_index to identify sensor.
 */
const AUTEL_MEDIA_TYPE_MAP: Record<string, string> = {
  photo: 'drone_rgb',
  video: 'drone_rgb',
  thermal_photo: 'drone_thermal',
  thermal_video: 'drone_thermal',
}

/**
 * Map Autel sensor_type strings to BeetleSense sensor categories.
 */
const AUTEL_SENSOR_MAP: Record<string, string> = {
  rgb: 'rgb',
  wide: 'rgb',
  zoom: 'rgb',
  thermal: 'thermal',
  ir: 'thermal',
  infrared: 'thermal',
  multispectral: 'multispectral',
  ms: 'multispectral',
  lidar: 'lidar',
  laser: 'lidar',
}

export class AutelMediaSyncService {
  private readonly log = logger.child({ service: 'autel-media-sync' })
  private readonly client: AutelCloudApiClient

  constructor(client?: AutelCloudApiClient) {
    this.client = client ?? new AutelCloudApiClient()
  }

  /**
   * Sync all media from a completed Autel mission into BeetleSense.
   *
   * Same interface contract as DJI MediaSyncService.syncMissionMedia.
   */
  async syncAutelMedia(
    missionId: string,
    deviceSn: string,
    surveyId: string,
  ): Promise<{ syncedCount: number; failedCount: number; totalSizeBytes: number }> {
    this.log.info({ missionId, deviceSn, surveyId }, 'Starting Autel media sync')

    const supabase = getSupabaseAdmin()
    let syncedCount = 0
    let failedCount = 0
    let totalSizeBytes = 0

    // List all media files from the device
    const mediaFiles = await this.client.listMedia(deviceSn)
    this.log.info({ fileCount: mediaFiles.length }, 'Found Autel media files to sync')

    for (const file of mediaFiles) {
      try {
        // Get download URL from Autel Cloud
        const { url: downloadUrl } = await this.client.downloadMedia(file.file_id)

        // Download the file
        const response = await fetch(downloadUrl)
        if (!response.ok) {
          throw new Error(`Download failed: ${response.status}`)
        }
        const buffer = Buffer.from(await response.arrayBuffer())

        // Determine upload type from Autel media type + sensor
        const uploadType = this.resolveUploadType(file)
        const storagePath = `surveys/${surveyId}/${file.file_id}_${file.file_name}`

        // Upload to BeetleSense S3
        await uploadToS3(storagePath, buffer, this.getMimeType(file.file_name))

        // Register in autel_media table
        await supabase.from('autel_media').upsert({
          mission_id: missionId,
          filename: file.file_name,
          file_type: file.media_type,
          sensor_type: this.mapSensorType(file.sensor_type),
          mime_type: this.getMimeType(file.file_name),
          file_size_bytes: file.file_size,
          storage_path: storagePath,
          location: file.geo ? `SRID=4326;POINT(${file.geo.longitude} ${file.geo.latitude})` : null,
          altitude_m: file.geo?.altitude,
          heading: file.geo?.heading,
          sync_status: 'downloaded',
          synced_at: new Date().toISOString(),
          captured_at: new Date(file.created_at * 1000).toISOString(),
          metadata: {
            autel_file_id: file.file_id,
            exif: this.normalizeAutelExif(file.exif),
          },
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
            source: 'autel_cloud_sync',
            manufacturer: 'autel',
            autel_file_id: file.file_id,
            autel_mission_id: missionId,
            capture_time: file.created_at,
            gps: file.geo,
            heading: file.geo?.heading,
          },
        })

        syncedCount++
        totalSizeBytes += file.file_size
        this.log.debug(
          { filename: file.file_name, sensorType: this.mapSensorType(file.sensor_type) },
          'Autel file synced',
        )
      } catch (err) {
        failedCount++
        const msg = err instanceof Error ? err.message : String(err)
        this.log.error({ filename: file.file_name, error: msg }, 'Failed to sync Autel file')

        // Record failure
        await supabase.from('autel_media').upsert({
          mission_id: missionId,
          filename: file.file_name,
          file_type: file.media_type,
          sensor_type: this.mapSensorType(file.sensor_type),
          file_size_bytes: file.file_size,
          sync_status: 'failed',
          metadata: { error: msg, autel_file_id: file.file_id },
          captured_at: new Date(file.created_at * 1000).toISOString(),
        }, { onConflict: 'id' }).then(() => {}, () => {})
      }
    }

    // Update mission media count
    await supabase
      .from('autel_missions')
      .update({ media_count: syncedCount })
      .eq('id', missionId)

    this.log.info(
      { missionId, syncedCount, failedCount, totalSizeMB: Math.round(totalSizeBytes / 1048576) },
      'Autel media sync complete',
    )

    return { syncedCount, failedCount, totalSizeBytes }
  }

  /**
   * Resolve the BeetleSense upload type from Autel media metadata.
   *
   * Autel uses explicit media_type values ('thermal_photo', 'thermal_video')
   * unlike DJI which relies on payload_index.
   */
  private resolveUploadType(file: AutelMediaFile): string {
    // First try explicit media type mapping
    const fromMediaType = AUTEL_MEDIA_TYPE_MAP[file.media_type]
    if (fromMediaType && fromMediaType !== 'drone_rgb') {
      return fromMediaType
    }

    // Then check sensor type for multispectral / lidar
    const sensorCategory = this.mapSensorType(file.sensor_type)
    if (sensorCategory === 'multispectral') return 'drone_multispectral'
    if (sensorCategory === 'lidar') return 'drone_lidar'
    if (sensorCategory === 'thermal') return 'drone_thermal'

    return fromMediaType ?? 'drone_rgb'
  }

  /**
   * Map Autel sensor_type strings to normalized BeetleSense categories.
   */
  private mapSensorType(sensorType: string): string {
    const normalized = sensorType?.toLowerCase() ?? ''
    return AUTEL_SENSOR_MAP[normalized] ?? 'rgb'
  }

  /**
   * Normalize Autel-specific EXIF metadata to a consistent format.
   *
   * Autel drones use different EXIF/XMP tag names than DJI:
   * - XMP:AutelDrone:GpsLatitude vs DJI XMP-drone-dji:GpsLatitude
   * - XMP:AutelDrone:AbsoluteAltitude vs DJI XMP-drone-dji:AbsoluteAltitude
   * - XMP:AutelDrone:RelativeAltitude vs DJI XMP-drone-dji:RelativeAltitude
   * - XMP:AutelDrone:GimbalRollDegree vs DJI XMP-drone-dji:GimbalRollDegree
   * - XMP:AutelDrone:FlightPitchDegree vs DJI XMP-drone-dji:FlightPitchDegree
   * - XMP:AutelDrone:CalibratedFocalLength
   * - XMP:AutelDrone:CalibratedOpticalCenterX/Y
   */
  private normalizeAutelExif(exif?: Record<string, unknown>): Record<string, unknown> | null {
    if (!exif) return null

    const normalized: Record<string, unknown> = {}

    // Map Autel XMP tags to a canonical format
    const tagMapping: Record<string, string> = {
      'AutelDrone:GpsLatitude': 'gps_latitude',
      'AutelDrone:GpsLongitude': 'gps_longitude',
      'AutelDrone:AbsoluteAltitude': 'absolute_altitude',
      'AutelDrone:RelativeAltitude': 'relative_altitude',
      'AutelDrone:GimbalRollDegree': 'gimbal_roll',
      'AutelDrone:GimbalPitchDegree': 'gimbal_pitch',
      'AutelDrone:GimbalYawDegree': 'gimbal_yaw',
      'AutelDrone:FlightRollDegree': 'flight_roll',
      'AutelDrone:FlightPitchDegree': 'flight_pitch',
      'AutelDrone:FlightYawDegree': 'flight_yaw',
      'AutelDrone:FlightXSpeed': 'flight_x_speed',
      'AutelDrone:FlightYSpeed': 'flight_y_speed',
      'AutelDrone:FlightZSpeed': 'flight_z_speed',
      'AutelDrone:CalibratedFocalLength': 'calibrated_focal_length',
      'AutelDrone:CalibratedOpticalCenterX': 'calibrated_optical_center_x',
      'AutelDrone:CalibratedOpticalCenterY': 'calibrated_optical_center_y',
      'AutelDrone:SensorWidth': 'sensor_width',
      'AutelDrone:SensorHeight': 'sensor_height',
    }

    for (const [autelTag, canonicalKey] of Object.entries(tagMapping)) {
      if (exif[autelTag] !== undefined) {
        normalized[canonicalKey] = exif[autelTag]
      }
    }

    // Pass through any unmapped keys as-is
    for (const [key, value] of Object.entries(exif)) {
      if (!Object.keys(tagMapping).includes(key)) {
        normalized[key] = value
      }
    }

    return normalized
  }

  private getMimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'jpg': case 'jpeg': return 'image/jpeg'
      case 'tif': case 'tiff': return 'image/tiff'
      case 'png': return 'image/png'
      case 'dng': return 'image/x-adobe-dng'
      case 'r-jpeg': return 'image/jpeg'
      case 'mp4': return 'video/mp4'
      case 'mov': return 'video/quicktime'
      case 'las': case 'laz': return 'application/vnd.las'
      default: return 'application/octet-stream'
    }
  }
}

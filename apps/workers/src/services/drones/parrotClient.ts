import { logger } from '../../lib/logger.js'

/**
 * Parrot Cloud API client for ANAFI FreeFlight Enterprise integration.
 *
 * Supports:
 * - Device management (list, status, firmware updates)
 * - Flight plan creation (Mavlink-compatible Parrot format)
 * - Media management (list, download photos and flight logs)
 * - Supported models: ANAFI USA, ANAFI Ai, ANAFI Thermal
 *
 * Parrot Cloud API base: https://api.parrot.com/v1
 * Authentication: API Key (Bearer token)
 */

// ─── Model Capabilities ───

export type ParrotModel = 'anafi_usa' | 'anafi_ai' | 'anafi_thermal'

export interface ParrotModelCapabilities {
  displayName: string
  ndaaCompliant: boolean
  thermal: boolean
  connectivity4G: boolean
  maxFlightTimeMin: number
  maxRangeKm: number
  photoResolution: string
  videoResolution: string
  sensorWidthMm: number
  focalLengthMm: number
  imageWidthPx: number
  imageHeightPx: number
}

export const PARROT_MODEL_CAPABILITIES: Record<ParrotModel, ParrotModelCapabilities> = {
  anafi_usa: {
    displayName: 'Parrot ANAFI USA',
    ndaaCompliant: true,
    thermal: true,
    connectivity4G: false,
    maxFlightTimeMin: 32,
    maxRangeKm: 4,
    photoResolution: '21 MP (5344x4016)',
    videoResolution: '4K HDR',
    sensorWidthMm: 6.3,
    focalLengthMm: 4.04,
    imageWidthPx: 5344,
    imageHeightPx: 4016,
  },
  anafi_ai: {
    displayName: 'Parrot ANAFI Ai',
    ndaaCompliant: true,
    thermal: false,
    connectivity4G: true,
    maxFlightTimeMin: 32,
    maxRangeKm: 0, // unlimited via 4G
    photoResolution: '48 MP (8000x6000)',
    videoResolution: '4K HDR',
    sensorWidthMm: 7.66,
    focalLengthMm: 6.3,
    imageWidthPx: 8000,
    imageHeightPx: 6000,
  },
  anafi_thermal: {
    displayName: 'Parrot ANAFI Thermal',
    ndaaCompliant: true,
    thermal: true,
    connectivity4G: false,
    maxFlightTimeMin: 26,
    maxRangeKm: 4,
    photoResolution: '21 MP (5344x4016)',
    videoResolution: '4K HDR',
    sensorWidthMm: 6.3,
    focalLengthMm: 4.04,
    imageWidthPx: 5344,
    imageHeightPx: 4016,
  },
}

// ─── Interfaces ───

export interface ParrotCloudConfig {
  apiKey: string
  apiBase: string
}

export interface ParrotDeviceInfo {
  id: string
  serial_number: string
  model: ParrotModel
  name: string
  firmware_version: string
  status: 'online' | 'offline' | 'in_flight'
  battery_level: number
  last_seen: string
  latitude: number | null
  longitude: number | null
  controller_serial: string | null
}

export interface ParrotFirmwareUpdate {
  current_version: string
  available_version: string
  release_notes: string
  mandatory: boolean
  download_url: string
}

export interface ParrotMavlinkWaypoint {
  /** MAV_CMD — 16 = NAV_WAYPOINT, 205 = NAV_LAND */
  command: number
  /** Sequence index in the mission */
  seq: number
  /** Coordinate frame — 3 = MAV_FRAME_GLOBAL_RELATIVE_ALT */
  frame: number
  latitude: number
  longitude: number
  altitude: number
  /** Hold time in seconds (param1 for NAV_WAYPOINT) */
  param1: number
  /** Accept radius in meters (param2) */
  param2: number
  /** Pass through (0) or stop (param3) */
  param3: number
  /** Yaw angle in degrees (param4) */
  param4: number
  autocontinue: boolean
}

export interface ParrotFlightPlan {
  name: string
  type: 'mavlink'
  takeoff_altitude: number
  return_to_home: boolean
  waypoints: ParrotMavlinkWaypoint[]
  camera_action: 'photo' | 'timelapse' | 'gps_lapse' | 'video'
  /** Photo interval distance in meters (for gps_lapse mode) */
  photo_interval_m?: number
  /** Photo interval time in seconds (for timelapse mode) */
  photo_interval_s?: number
}

export interface ParrotMediaFile {
  id: string
  filename: string
  file_type: 'photo' | 'video' | 'thermal' | 'dng'
  file_size: number
  mime_type: string
  created_at: string
  download_url: string
  thumbnail_url: string | null
  gps: {
    latitude: number
    longitude: number
    altitude: number
  } | null
  /** EXIF/XMP metadata embedded in the image */
  metadata: {
    exposure_time?: string
    iso?: number
    focal_length_mm?: number
    drone_model?: string
    gimbal_pitch?: number
    gimbal_roll?: number
    gimbal_yaw?: number
    flight_id?: string
  }
}

export interface ParrotFlightLog {
  id: string
  flight_id: string
  start_time: string
  end_time: string
  duration_s: number
  max_altitude_m: number
  max_distance_m: number
  total_distance_m: number
  battery_consumed_pct: number
  download_url: string
}

// ─── BeetleSense Waypoint Format ───

export interface BeetleSenseWaypoint {
  latitude: number
  longitude: number
  altitudeM: number
  speedMs: number
  heading: number
  gimbalPitch: number
  actions: Array<{
    action_type: 'take_photo' | 'start_record' | 'stop_record' | 'hover'
    params?: Record<string, unknown>
  }>
}

// ─── Client ───

export class ParrotCloudClient {
  private readonly log = logger.child({ service: 'parrot-cloud' })
  private readonly config: ParrotCloudConfig

  constructor(config?: Partial<ParrotCloudConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? process.env.PARROT_API_KEY ?? '',
      apiBase: config?.apiBase ?? 'https://api.parrot.com/v1',
    }
  }

  /**
   * Make an authenticated API request to Parrot Cloud.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.apiBase}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        'X-Api-Version': '1',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      this.log.error({ path, status: response.status, body }, 'Parrot API error')
      throw new Error(`Parrot API error ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
  }

  // ─── Device Management ───

  /**
   * List all registered Parrot drones in the account.
   */
  async listDevices(): Promise<ParrotDeviceInfo[]> {
    const data = await this.request<{ devices: ParrotDeviceInfo[] }>('/devices')
    this.log.info({ count: data.devices.length }, 'Listed Parrot devices')
    return data.devices
  }

  /**
   * Get detailed status for a specific device.
   */
  async getDeviceStatus(deviceId: string): Promise<ParrotDeviceInfo> {
    return this.request<ParrotDeviceInfo>(`/devices/${deviceId}`)
  }

  /**
   * Check for available firmware updates for a device.
   */
  async checkFirmwareUpdate(deviceId: string): Promise<ParrotFirmwareUpdate | null> {
    try {
      const data = await this.request<ParrotFirmwareUpdate>(`/devices/${deviceId}/firmware`)
      if (data.available_version && data.available_version !== data.current_version) {
        this.log.info(
          { deviceId, current: data.current_version, available: data.available_version },
          'Firmware update available',
        )
        return data
      }
      return null
    } catch {
      this.log.warn({ deviceId }, 'Could not check firmware update')
      return null
    }
  }

  /**
   * Trigger firmware update on a device (must be idle and connected).
   */
  async triggerFirmwareUpdate(deviceId: string): Promise<{ status: string }> {
    this.log.info({ deviceId }, 'Triggering firmware update')
    return this.request(`/devices/${deviceId}/firmware/update`, { method: 'POST' })
  }

  // ─── Flight Plans ───

  /**
   * Create a Parrot-format Mavlink flight plan from raw waypoints.
   */
  async createFlightPlan(
    deviceId: string,
    plan: ParrotFlightPlan,
  ): Promise<{ plan_id: string }> {
    this.log.info(
      { deviceId, name: plan.name, waypointCount: plan.waypoints.length },
      'Creating Parrot flight plan',
    )

    return this.request(`/devices/${deviceId}/flightplans`, {
      method: 'POST',
      body: JSON.stringify(plan),
    })
  }

  /**
   * List flight plans uploaded to a device.
   */
  async listFlightPlans(deviceId: string): Promise<Array<{ plan_id: string; name: string; created_at: string; waypoint_count: number }>> {
    const data = await this.request<{ plans: Array<Record<string, unknown>> }>(`/devices/${deviceId}/flightplans`)
    return data.plans as never
  }

  /**
   * Delete a flight plan from a device.
   */
  async deleteFlightPlan(deviceId: string, planId: string): Promise<void> {
    await this.request(`/devices/${deviceId}/flightplans/${planId}`, { method: 'DELETE' })
    this.log.info({ deviceId, planId }, 'Deleted Parrot flight plan')
  }

  // ─── Media Management ───

  /**
   * List media files from a device.
   */
  async listMedia(
    deviceId: string,
    options?: { after?: string; limit?: number; type?: 'photo' | 'video' | 'thermal' },
  ): Promise<ParrotMediaFile[]> {
    const params = new URLSearchParams()
    if (options?.after) params.set('after', options.after)
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.type) params.set('type', options.type)

    const data = await this.request<{ media: ParrotMediaFile[] }>(
      `/devices/${deviceId}/media?${params}`,
    )
    return data.media
  }

  /**
   * Get a signed download URL for a specific media file.
   */
  async getMediaDownloadUrl(deviceId: string, mediaId: string): Promise<string> {
    const data = await this.request<{ url: string }>(
      `/devices/${deviceId}/media/${mediaId}/download`,
    )
    return data.url
  }

  // ─── Flight Logs ───

  /**
   * List flight logs from a device.
   */
  async listFlightLogs(
    deviceId: string,
    options?: { start?: string; end?: string; limit?: number },
  ): Promise<ParrotFlightLog[]> {
    const params = new URLSearchParams()
    if (options?.start) params.set('start', options.start)
    if (options?.end) params.set('end', options.end)
    if (options?.limit) params.set('limit', String(options.limit))

    const data = await this.request<{ logs: ParrotFlightLog[] }>(
      `/devices/${deviceId}/flight-logs?${params}`,
    )
    return data.logs
  }

  /**
   * Download a specific flight log.
   */
  async getFlightLogDownloadUrl(deviceId: string, logId: string): Promise<string> {
    const data = await this.request<{ url: string }>(
      `/devices/${deviceId}/flight-logs/${logId}/download`,
    )
    return data.url
  }

  // ─── Waypoint Format Conversion ───

  /**
   * Convert BeetleSense internal waypoint format to Parrot Mavlink format.
   *
   * Maps BeetleSense actions to Mavlink commands:
   * - Navigation waypoints use MAV_CMD_NAV_WAYPOINT (16)
   * - Photo actions are handled via camera_action on the flight plan level
   * - The return-to-home is handled by the flight plan RTH flag
   */
  convertToParrotFlightPlan(
    name: string,
    waypoints: BeetleSenseWaypoint[],
    options?: {
      photoIntervalM?: number
      returnToHome?: boolean
    },
  ): ParrotFlightPlan {
    const mavlinkWaypoints: ParrotMavlinkWaypoint[] = waypoints.map((wp, index) => ({
      command: 16, // MAV_CMD_NAV_WAYPOINT
      seq: index,
      frame: 3, // MAV_FRAME_GLOBAL_RELATIVE_ALT
      latitude: wp.latitude,
      longitude: wp.longitude,
      altitude: wp.altitudeM,
      param1: wp.actions.some(a => a.action_type === 'hover') ? 2 : 0, // hold time
      param2: 1, // accept radius 1m
      param3: 0, // pass through
      param4: wp.heading, // yaw angle
      autocontinue: true,
    }))

    // Determine camera action: if waypoints have take_photo actions, use gps_lapse
    const hasPhotoActions = waypoints.some(wp =>
      wp.actions.some(a => a.action_type === 'take_photo'),
    )
    const hasVideoActions = waypoints.some(wp =>
      wp.actions.some(a => a.action_type === 'start_record'),
    )

    const cameraAction: ParrotFlightPlan['camera_action'] = hasVideoActions
      ? 'video'
      : hasPhotoActions
        ? 'gps_lapse'
        : 'photo'

    // Default takeoff altitude from first waypoint
    const takeoffAlt = waypoints.length > 0 ? waypoints[0].altitudeM : 80

    const plan: ParrotFlightPlan = {
      name,
      type: 'mavlink',
      takeoff_altitude: takeoffAlt,
      return_to_home: options?.returnToHome ?? true,
      waypoints: mavlinkWaypoints,
      camera_action: cameraAction,
    }

    if (cameraAction === 'gps_lapse' && options?.photoIntervalM) {
      plan.photo_interval_m = options.photoIntervalM
    }

    this.log.info(
      { name, waypointCount: mavlinkWaypoints.length, cameraAction, takeoffAlt },
      'Converted BeetleSense waypoints to Parrot Mavlink format',
    )

    return plan
  }

  /**
   * Get model capabilities for a Parrot drone model.
   */
  getModelCapabilities(model: ParrotModel): ParrotModelCapabilities {
    return PARROT_MODEL_CAPABILITIES[model]
  }

  /**
   * Check if a model is NDAA compliant (all Parrot ANAFI models are).
   */
  isNdaaCompliant(model: ParrotModel): boolean {
    return PARROT_MODEL_CAPABILITIES[model]?.ndaaCompliant ?? false
  }
}

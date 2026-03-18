import { logger } from '../../lib/logger.js'

/**
 * Autel Enterprise Cloud API client for drone fleet management.
 *
 * Supports:
 * - Device management (listing, status, firmware)
 * - Waypoint mission upload and execution
 * - Media file management (download, sync)
 * - Flight log retrieval
 *
 * Supported models:
 * - EVO II Pro V3 (RGB 6K, 1" CMOS)
 * - EVO II Dual 640T (RGB + thermal 640×512)
 * - EVO Max 4T (wide + zoom + thermal + laser rangefinder)
 * - EVO II RTK (centimeter-level positioning)
 *
 * Authentication: OAuth2 with AUTEL_APP_KEY + AUTEL_APP_SECRET
 * Base URL: https://open.autelrobotics.com/api/v1
 */

// ─── Model Capabilities ───

export type AutelModel =
  | 'evo_ii_pro_v3'
  | 'evo_ii_dual_640t'
  | 'evo_max_4t'
  | 'evo_ii_rtk'

export interface AutelModelCapabilities {
  modelName: string
  thermal: boolean
  lidar: boolean
  rtk: boolean
  multispectral: boolean
  maxFlightTimeMin: number
  maxPayloadG: number
  sensorResolution: string
}

export const AUTEL_MODEL_CAPABILITIES: Record<AutelModel, AutelModelCapabilities> = {
  evo_ii_pro_v3: {
    modelName: 'Autel EVO II Pro V3',
    thermal: false,
    lidar: false,
    rtk: false,
    multispectral: false,
    maxFlightTimeMin: 42,
    maxPayloadG: 0,
    sensorResolution: '6K 1" CMOS 20MP',
  },
  evo_ii_dual_640t: {
    modelName: 'Autel EVO II Dual 640T',
    thermal: true,
    lidar: false,
    rtk: false,
    multispectral: false,
    maxFlightTimeMin: 38,
    maxPayloadG: 0,
    sensorResolution: '8K RGB + 640×512 thermal',
  },
  evo_max_4t: {
    modelName: 'Autel EVO Max 4T',
    thermal: true,
    lidar: true,
    rtk: false,
    multispectral: false,
    maxFlightTimeMin: 42,
    maxPayloadG: 0,
    sensorResolution: 'Wide + Zoom + 640×512 thermal + laser RF',
  },
  evo_ii_rtk: {
    modelName: 'Autel EVO II RTK',
    thermal: false,
    lidar: false,
    rtk: true,
    multispectral: true,
    maxFlightTimeMin: 36,
    maxPayloadG: 200,
    sensorResolution: '8K 20MP + RTK centimeter positioning',
  },
}

// ─── Types ───

export interface AutelCloudConfig {
  appKey: string
  appSecret: string
  apiBase: string
}

export interface AutelAccessToken {
  access_token: string
  expires_in: number
  token_type: string
  obtained_at: number
}

export interface AutelDeviceInfo {
  device_sn: string
  device_name: string
  model: AutelModel
  firmware_version: string
  status: 'online' | 'offline' | 'flying' | 'idle'
  battery_percent: number
  latitude: number
  longitude: number
  altitude: number
  signal_strength: number
  payloads: Array<{
    payload_type: string
    model: string
    firmware_version: string
  }>
}

export interface AutelDeviceStatus {
  battery_percent: number
  battery_voltage: number
  latitude: number
  longitude: number
  altitude: number
  speed_ms: number
  heading: number
  signal_strength: number
  gps_count: number
  flight_mode: string
  firmware_version: string
  storage_remaining_mb: number
  temperature_c: number
}

export interface AutelWaypoint {
  latitude: number
  longitude: number
  altitude: number
  speed: number
  heading: number
  gimbal_pitch: number
  actions: Array<{
    action_type: 'take_photo' | 'start_record' | 'stop_record' | 'hover' | 'rotate'
    params?: Record<string, unknown>
  }>
}

export interface AutelMission {
  mission_name: string
  drone_sn: string
  flight_speed: number
  finish_action: 'go_home' | 'hover' | 'land'
  waypoints: AutelWaypoint[]
  global_altitude: number
  heading_mode: 'auto' | 'manual' | 'waypoint_heading'
  camera_settings?: {
    photo_format: 'jpeg' | 'raw' | 'raw+jpeg'
    interval_s?: number
    resolution?: string
  }
}

export interface AutelMissionStatus {
  mission_id: string
  status: 'uploaded' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'
  progress_percent: number
  current_waypoint: number
  total_waypoints: number
  elapsed_s: number
}

export interface AutelMediaFile {
  file_id: string
  file_name: string
  file_path: string
  file_size: number
  media_type: 'photo' | 'video' | 'thermal_photo' | 'thermal_video'
  sensor_type: string
  created_at: number
  download_url?: string
  thumbnail_url?: string
  geo: {
    latitude: number
    longitude: number
    altitude: number
    heading: number
  }
  exif?: Record<string, unknown>
}

export interface AutelFlightLog {
  log_id: string
  device_sn: string
  start_time: string
  end_time: string
  duration_s: number
  max_altitude_m: number
  max_distance_m: number
  max_speed_ms: number
  total_distance_m: number
  takeoff_location: { latitude: number; longitude: number }
  download_url: string
}

// ─── Client ───

/**
 * Autel Enterprise Cloud API client.
 *
 * Handles OAuth2 authentication, device management, mission control,
 * and media synchronization with Autel's cloud infrastructure.
 */
export class AutelCloudApiClient {
  private readonly log = logger.child({ service: 'autel-cloud' })
  private readonly config: AutelCloudConfig
  private token: AutelAccessToken | null = null

  constructor(config?: Partial<AutelCloudConfig>) {
    this.config = {
      appKey: config?.appKey ?? process.env.AUTEL_APP_KEY ?? '',
      appSecret: config?.appSecret ?? process.env.AUTEL_APP_SECRET ?? '',
      apiBase: config?.apiBase ?? 'https://open.autelrobotics.com/api/v1',
    }
  }

  /**
   * Get a valid access token, refreshing if expired.
   */
  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.obtained_at + (this.token.expires_in - 60) * 1000) {
      return this.token.access_token
    }

    this.log.info('Refreshing Autel Cloud API access token')

    const response = await fetch(`${this.config.apiBase}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: this.config.appKey,
        app_secret: this.config.appSecret,
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      throw new Error(`Autel auth failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as AutelAccessToken
    this.token = { ...data, obtained_at: Date.now() }
    this.log.info({ expires_in: data.expires_in }, 'Autel access token obtained')
    return data.access_token
  }

  /**
   * Make an authenticated API request.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getAccessToken()
    const url = `${this.config.apiBase}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      this.log.error({ path, status: response.status, body }, 'Autel API error')
      throw new Error(`Autel API error ${response.status}: ${body}`)
    }

    const result = await response.json() as { code: number; data: T; message?: string }

    // Autel APIs typically wrap responses in { code, data, message }
    if (result.code !== undefined && result.code !== 0) {
      throw new Error(`Autel API error code ${result.code}: ${result.message ?? 'unknown'}`)
    }

    return result.data !== undefined ? result.data : result as unknown as T
  }

  // ─── Device Management ───

  /**
   * List all devices bound to the account.
   */
  async listDevices(): Promise<AutelDeviceInfo[]> {
    const data = await this.request<{ devices: AutelDeviceInfo[] }>('/devices')
    this.log.info({ count: data.devices.length }, 'Listed Autel devices')
    return data.devices
  }

  /**
   * Get device details by serial number.
   */
  async getDevice(sn: string): Promise<AutelDeviceInfo> {
    return this.request<AutelDeviceInfo>(`/devices/${sn}`)
  }

  /**
   * Get real-time device status (battery, GPS, signal, storage).
   */
  async getDeviceStatus(sn: string): Promise<AutelDeviceStatus> {
    return this.request<AutelDeviceStatus>(`/devices/${sn}/status`)
  }

  /**
   * Get the capabilities for a given Autel model.
   */
  getModelCapabilities(model: AutelModel): AutelModelCapabilities {
    return AUTEL_MODEL_CAPABILITIES[model]
  }

  // ─── Mission Control ───

  /**
   * Upload a waypoint mission to Autel Cloud for a specific device.
   */
  async uploadMission(
    deviceSn: string,
    waypoints: AutelWaypoint[],
    options?: {
      missionName?: string
      flightSpeed?: number
      globalAltitude?: number
      finishAction?: 'go_home' | 'hover' | 'land'
      headingMode?: 'auto' | 'manual' | 'waypoint_heading'
      cameraSettings?: AutelMission['camera_settings']
    },
  ): Promise<{ mission_id: string }> {
    const mission: AutelMission = {
      mission_name: options?.missionName ?? `BeetleSense Mission ${new Date().toISOString()}`,
      drone_sn: deviceSn,
      flight_speed: options?.flightSpeed ?? 5,
      finish_action: options?.finishAction ?? 'go_home',
      waypoints,
      global_altitude: options?.globalAltitude ?? 80,
      heading_mode: options?.headingMode ?? 'auto',
      camera_settings: options?.cameraSettings,
    }

    this.log.info(
      { deviceSn, name: mission.mission_name, waypointCount: waypoints.length },
      'Uploading waypoint mission to Autel Cloud',
    )

    return this.request<{ mission_id: string }>(`/devices/${deviceSn}/missions`, {
      method: 'POST',
      body: JSON.stringify(mission),
    })
  }

  /**
   * Start mission execution on a device.
   */
  async startMission(deviceSn: string, missionId: string): Promise<void> {
    this.log.info({ deviceSn, missionId }, 'Starting Autel mission')
    await this.request(`/devices/${deviceSn}/missions/${missionId}/start`, {
      method: 'POST',
    })
  }

  /**
   * Pause mission execution.
   */
  async pauseMission(deviceSn: string, missionId: string): Promise<void> {
    this.log.info({ deviceSn, missionId }, 'Pausing Autel mission')
    await this.request(`/devices/${deviceSn}/missions/${missionId}/pause`, {
      method: 'POST',
    })
  }

  /**
   * Resume a paused mission.
   */
  async resumeMission(deviceSn: string, missionId: string): Promise<void> {
    this.log.info({ deviceSn, missionId }, 'Resuming Autel mission')
    await this.request(`/devices/${deviceSn}/missions/${missionId}/resume`, {
      method: 'POST',
    })
  }

  /**
   * Get current mission status and progress.
   */
  async getMissionStatus(deviceSn: string, missionId: string): Promise<AutelMissionStatus> {
    return this.request<AutelMissionStatus>(
      `/devices/${deviceSn}/missions/${missionId}/status`,
    )
  }

  // ─── Media Management ───

  /**
   * List media files from a device.
   */
  async listMedia(
    deviceSn: string,
    options?: { after?: number; limit?: number; media_type?: string },
  ): Promise<AutelMediaFile[]> {
    const params = new URLSearchParams()
    if (options?.after) params.set('after', String(options.after))
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.media_type) params.set('media_type', options.media_type)

    const data = await this.request<{ files: AutelMediaFile[] }>(
      `/devices/${deviceSn}/media?${params}`,
    )
    return data.files
  }

  /**
   * Get a temporary download URL for a media file.
   */
  async downloadMedia(fileId: string): Promise<{ url: string; expires_at: number }> {
    return this.request<{ url: string; expires_at: number }>(
      `/media/${fileId}/download`,
    )
  }

  // ─── Flight Logs ───

  /**
   * Get flight logs for a device within a date range.
   */
  async getFlightLogs(
    deviceSn: string,
    dateRange?: { start: string; end: string },
  ): Promise<AutelFlightLog[]> {
    const params = new URLSearchParams()
    if (dateRange?.start) params.set('start_date', dateRange.start)
    if (dateRange?.end) params.set('end_date', dateRange.end)

    const data = await this.request<{ logs: AutelFlightLog[] }>(
      `/devices/${deviceSn}/flight-logs?${params}`,
    )
    return data.logs
  }
}

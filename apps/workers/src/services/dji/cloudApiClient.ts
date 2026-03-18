import { logger } from '../../lib/logger.js'

/**
 * DJI Cloud API client for enterprise drone fleet management.
 *
 * Supports:
 * - Device management (pairing, status, firmware)
 * - Waypoint mission upload and execution
 * - Real-time telemetry via MQTT/WebSocket
 * - Media file management (download, sync)
 * - Flight log retrieval
 *
 * DJI Cloud API docs: https://developer.dji.com/doc/cloud-api-tutorial/en/
 *
 * Authentication: App Key + App Secret → access_token (OAuth2)
 * Workspace: Each organization maps to a DJI FlightHub workspace
 */

export interface DjiCloudConfig {
  appKey: string
  appSecret: string
  apiBase: string
  mqttBroker: string
}

export interface DjiAccessToken {
  access_token: string
  expires_in: number
  token_type: string
  obtained_at: number
}

export interface DjiDeviceInfo {
  sn: string
  device_name: string
  model: string
  firmware_version: string
  status: 'online' | 'offline'
  battery_level: number
  latitude: number
  longitude: number
  payloads: Array<{
    payload_index: string
    model: string
    firmware_version: string
  }>
}

export interface DjiWaypointMission {
  mission_name: string
  waylines: Array<{
    wayline_id: number
    speed: number
    waypoints: Array<{
      latitude: number
      longitude: number
      height: number
      speed: number
      heading: number
      gimbal_pitch: number
      actions: Array<{
        action_type: 'take_photo' | 'start_record' | 'stop_record' | 'hover'
        params?: Record<string, unknown>
      }>
    }>
  }>
  out_of_control_action: 'go_home' | 'hover' | 'land'
  global_height: number
  auto_flight_speed: number
}

export interface DjiMediaFile {
  file_id: string
  file_name: string
  file_path: string
  file_size: number
  media_type: 'photo' | 'video'
  payload_index: string
  created_time: number
  download_url?: string
  thumbnail_url?: string
  geo: {
    latitude: number
    longitude: number
    altitude: number
  }
}

/**
 * DJI Cloud API client.
 *
 * Handles OAuth2 authentication, device management, mission control,
 * and media synchronization with DJI's cloud infrastructure.
 */
export class DjiCloudApiClient {
  private readonly log = logger.child({ service: 'dji-cloud' })
  private readonly config: DjiCloudConfig
  private token: DjiAccessToken | null = null

  constructor(config?: Partial<DjiCloudConfig>) {
    this.config = {
      appKey: config?.appKey ?? process.env.DJI_APP_KEY ?? '',
      appSecret: config?.appSecret ?? process.env.DJI_APP_SECRET ?? '',
      apiBase: config?.apiBase ?? 'https://openapi.dji.com/v1',
      mqttBroker: config?.mqttBroker ?? 'mqtts://mqtt.dji.com:8883',
    }
  }

  /**
   * Get a valid access token, refreshing if expired.
   */
  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.token.obtained_at + (this.token.expires_in - 60) * 1000) {
      return this.token.access_token
    }

    this.log.info('Refreshing DJI Cloud API access token')

    const response = await fetch(`${this.config.apiBase}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_key: this.config.appKey,
        app_secret: this.config.appSecret,
        grant_type: 'client_credentials',
      }),
    })

    if (!response.ok) {
      throw new Error(`DJI auth failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as DjiAccessToken
    this.token = { ...data, obtained_at: Date.now() }
    this.log.info({ expires_in: data.expires_in }, 'DJI access token obtained')
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
      this.log.error({ path, status: response.status, body }, 'DJI API error')
      throw new Error(`DJI API error ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
  }

  // ─── Device Management ───

  /**
   * List all devices in the workspace.
   */
  async listDevices(workspaceId: string): Promise<DjiDeviceInfo[]> {
    const data = await this.request<{ list: DjiDeviceInfo[] }>(
      `/workspaces/${workspaceId}/devices`,
    )
    this.log.info({ count: data.list.length }, 'Listed DJI devices')
    return data.list
  }

  /**
   * Get device details by serial number.
   */
  async getDevice(workspaceId: string, deviceSn: string): Promise<DjiDeviceInfo> {
    return this.request<DjiDeviceInfo>(
      `/workspaces/${workspaceId}/devices/${deviceSn}`,
    )
  }

  /**
   * Get device real-time status (battery, GPS, signal).
   */
  async getDeviceStatus(workspaceId: string, deviceSn: string): Promise<{
    battery: number
    latitude: number
    longitude: number
    altitude: number
    signal_quality: number
    gps_satellites: number
    firmware_version: string
  }> {
    return this.request(
      `/workspaces/${workspaceId}/devices/${deviceSn}/status`,
    )
  }

  // ─── Mission Management ───

  /**
   * Upload a waypoint mission to DJI Cloud for a specific device.
   */
  async uploadMission(
    workspaceId: string,
    deviceSn: string,
    mission: DjiWaypointMission,
  ): Promise<{ mission_id: string }> {
    this.log.info(
      { workspaceId, deviceSn, name: mission.mission_name, waypointCount: mission.waylines[0]?.waypoints.length },
      'Uploading waypoint mission to DJI Cloud',
    )

    return this.request(`/workspaces/${workspaceId}/devices/${deviceSn}/missions`, {
      method: 'POST',
      body: JSON.stringify(mission),
    })
  }

  /**
   * Start mission execution on a device.
   */
  async startMission(
    workspaceId: string,
    deviceSn: string,
    missionId: string,
  ): Promise<void> {
    this.log.info({ deviceSn, missionId }, 'Starting DJI mission')
    await this.request(
      `/workspaces/${workspaceId}/devices/${deviceSn}/missions/${missionId}/start`,
      { method: 'POST' },
    )
  }

  /**
   * Pause mission execution.
   */
  async pauseMission(workspaceId: string, deviceSn: string, missionId: string): Promise<void> {
    await this.request(
      `/workspaces/${workspaceId}/devices/${deviceSn}/missions/${missionId}/pause`,
      { method: 'POST' },
    )
  }

  /**
   * Resume paused mission.
   */
  async resumeMission(workspaceId: string, deviceSn: string, missionId: string): Promise<void> {
    await this.request(
      `/workspaces/${workspaceId}/devices/${deviceSn}/missions/${missionId}/resume`,
      { method: 'POST' },
    )
  }

  // ─── Media Management ───

  /**
   * List media files from a device after a mission.
   */
  async listMedia(
    workspaceId: string,
    deviceSn: string,
    options?: { after?: number; limit?: number },
  ): Promise<DjiMediaFile[]> {
    const params = new URLSearchParams()
    if (options?.after) params.set('after', String(options.after))
    if (options?.limit) params.set('limit', String(options.limit))

    const data = await this.request<{ list: DjiMediaFile[] }>(
      `/workspaces/${workspaceId}/devices/${deviceSn}/media?${params}`,
    )
    return data.list
  }

  /**
   * Get a temporary download URL for a media file.
   */
  async getMediaDownloadUrl(
    workspaceId: string,
    deviceSn: string,
    fileId: string,
  ): Promise<string> {
    const data = await this.request<{ url: string }>(
      `/workspaces/${workspaceId}/devices/${deviceSn}/media/${fileId}/download`,
    )
    return data.url
  }

  // ─── Flight Logs ───

  /**
   * List flight logs for a device.
   */
  async listFlightLogs(
    workspaceId: string,
    deviceSn: string,
    options?: { start?: string; end?: string },
  ): Promise<Array<{
    log_id: string
    start_time: string
    end_time: string
    duration_s: number
    max_altitude_m: number
    max_distance_m: number
    download_url: string
  }>> {
    const params = new URLSearchParams()
    if (options?.start) params.set('start', options.start)
    if (options?.end) params.set('end', options.end)

    const data = await this.request<{ list: Array<Record<string, unknown>> }>(
      `/workspaces/${workspaceId}/devices/${deviceSn}/flight-logs?${params}`,
    )
    return data.list as never
  }
}

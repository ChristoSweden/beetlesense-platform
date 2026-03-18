import { logger } from '../../lib/logger.js'

/**
 * DroneDeploy API v2 client for aerial mapping integration.
 *
 * Supports:
 * - Flight plan creation and management
 * - Map processing (orthomosaic, DSM, DTM, NDVI, plant health)
 * - Export creation in multiple formats
 * - Annotations (issue markers, measurements)
 * - Webhook registration for async events
 *
 * DroneDeploy API docs: https://developer.dronedeploy.com/reference
 *
 * Authentication: OAuth2 bearer token via DRONEDEPLOY_API_KEY
 */

// ─── Types ───

export interface DroneDeployConfig {
  apiKey: string
  apiBase: string
}

export type DroneDeployLayer =
  | 'orthomosaic'
  | 'elevation'
  | 'plant_health'
  | 'ndvi'
  | 'thermal'
  | 'zones'

export type DroneDeployExportFormat = 'geotiff' | 'obj' | 'las' | 'shapefile' | 'csv' | 'jpg'

export type DroneDeployWebhookEvent = 'processing_complete' | 'export_ready'

export interface DroneDeployPlan {
  id: string
  name: string
  geometry: GeoJSON.Polygon
  altitude: number
  overlap_front: number
  overlap_side: number
  status: 'draft' | 'ready' | 'in_progress' | 'completed'
  created_at: string
  updated_at: string
}

export interface DroneDeployMap {
  id: string
  plan_id: string
  name: string
  status: 'queued' | 'processing' | 'complete' | 'failed'
  location: {
    lat: number
    lng: number
  }
  date_creation: string
  tile_url: string | null
  layers: DroneDeployLayer[]
  area_m2: number
  resolution_cm: number
  image_count: number
}

export interface DroneDeployTile {
  layer: DroneDeployLayer
  url: string
  min_zoom: number
  max_zoom: number
  bounds: [number, number, number, number]
  format: string
}

export interface DroneDeployExport {
  id: string
  map_id: string
  status: 'queued' | 'processing' | 'complete' | 'failed'
  format: DroneDeployExportFormat
  layers: DroneDeployLayer[]
  download_url: string | null
  file_size_bytes: number | null
  created_at: string
  completed_at: string | null
}

export interface DroneDeployAnnotation {
  id: string
  map_id: string
  type: 'marker' | 'measurement' | 'area' | 'volume' | 'note'
  geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon
  properties: {
    title?: string
    description?: string
    color?: string
    value?: number
    unit?: string
    images?: string[]
  }
  created_at: string
  updated_at: string
  created_by: string
}

export interface DroneDeployWebhook {
  id: string
  url: string
  events: DroneDeployWebhookEvent[]
  active: boolean
  created_at: string
  secret: string
}

export interface DroneDeployProject {
  id: string
  name: string
  description: string
  location: { lat: number; lng: number }
  maps: DroneDeployMap[]
  created_at: string
}

// ─── Client ───

/**
 * DroneDeploy API v2 client.
 *
 * Handles OAuth2 bearer authentication, flight plan management,
 * map processing, exports, annotations, and webhook registration.
 */
export class DroneDeployClient {
  private readonly log = logger.child({ service: 'dronedeploy' })
  private readonly config: DroneDeployConfig

  constructor(config?: Partial<DroneDeployConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? process.env.DRONEDEPLOY_API_KEY ?? '',
      apiBase: config?.apiBase ?? 'https://public-api.dronedeploy.com/v2',
    }
  }

  /**
   * Make an authenticated API request.
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.config.apiBase}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text().catch(() => 'unknown')
      this.log.error({ path, status: response.status, body }, 'DroneDeploy API error')
      throw new Error(`DroneDeploy API error ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
  }

  // ─── Plans ───

  /**
   * Create a flight plan from a boundary polygon.
   */
  async createPlan(
    name: string,
    geometry: GeoJSON.Polygon,
    altitude: number,
    overlap: { front: number; side: number },
  ): Promise<DroneDeployPlan> {
    this.log.info({ name, altitude, overlapFront: overlap.front, overlapSide: overlap.side }, 'Creating DroneDeploy flight plan')

    return this.request<DroneDeployPlan>('/plans', {
      method: 'POST',
      body: JSON.stringify({
        name,
        geometry,
        altitude,
        overlap_front: overlap.front,
        overlap_side: overlap.side,
      }),
    })
  }

  /**
   * Get a flight plan by ID.
   */
  async getPlan(planId: string): Promise<DroneDeployPlan> {
    return this.request<DroneDeployPlan>(`/plans/${planId}`)
  }

  /**
   * List all flight plans.
   */
  async listPlans(): Promise<DroneDeployPlan[]> {
    const data = await this.request<{ data: DroneDeployPlan[] }>('/plans')
    return data.data
  }

  // ─── Maps ───

  /**
   * Create a new map (initiate processing) for a flight plan.
   */
  async createMap(planId: string): Promise<DroneDeployMap> {
    this.log.info({ planId }, 'Creating DroneDeploy map from plan')

    return this.request<DroneDeployMap>('/maps', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
    })
  }

  /**
   * Get map details and processing status.
   */
  async getMap(mapId: string): Promise<DroneDeployMap> {
    return this.request<DroneDeployMap>(`/maps/${mapId}`)
  }

  /**
   * List all maps for the account.
   */
  async listMaps(options?: { limit?: number; offset?: number }): Promise<DroneDeployMap[]> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.offset) params.set('offset', String(options.offset))

    const query = params.toString()
    const data = await this.request<{ data: DroneDeployMap[] }>(`/maps${query ? `?${query}` : ''}`)
    return data.data
  }

  /**
   * Get tile URLs for a specific map layer (for display on web map).
   */
  async getMapTiles(mapId: string, layer: DroneDeployLayer): Promise<DroneDeployTile> {
    return this.request<DroneDeployTile>(`/maps/${mapId}/tiles/${layer}`)
  }

  // ─── Exports ───

  /**
   * Create an export of map data in a specific format.
   *
   * Supported layers: orthomosaic, elevation, plant_health, ndvi, thermal, zones
   * Supported formats: geotiff, obj, las, shapefile, csv, jpg
   */
  async createExport(
    mapId: string,
    format: DroneDeployExportFormat,
    layers: DroneDeployLayer[],
  ): Promise<DroneDeployExport> {
    this.log.info({ mapId, format, layers }, 'Creating DroneDeploy export')

    return this.request<DroneDeployExport>('/exports', {
      method: 'POST',
      body: JSON.stringify({
        map_id: mapId,
        format,
        layers,
      }),
    })
  }

  /**
   * Get export status and download URL.
   */
  async getExport(exportId: string): Promise<DroneDeployExport> {
    return this.request<DroneDeployExport>(`/exports/${exportId}`)
  }

  /**
   * List all exports for a map.
   */
  async listExports(mapId: string): Promise<DroneDeployExport[]> {
    const data = await this.request<{ data: DroneDeployExport[] }>(`/maps/${mapId}/exports`)
    return data.data
  }

  // ─── Annotations ───

  /**
   * Get all annotations (markers, measurements, areas) on a map.
   */
  async getAnnotations(mapId: string): Promise<DroneDeployAnnotation[]> {
    const data = await this.request<{ data: DroneDeployAnnotation[] }>(`/maps/${mapId}/annotations`)
    this.log.info({ mapId, count: data.data.length }, 'Fetched DroneDeploy annotations')
    return data.data
  }

  /**
   * Create a new annotation on a map.
   */
  async createAnnotation(
    mapId: string,
    annotation: {
      type: DroneDeployAnnotation['type']
      geometry: GeoJSON.Point | GeoJSON.LineString | GeoJSON.Polygon
      properties?: DroneDeployAnnotation['properties']
    },
  ): Promise<DroneDeployAnnotation> {
    this.log.info({ mapId, type: annotation.type }, 'Creating DroneDeploy annotation')

    return this.request<DroneDeployAnnotation>(`/maps/${mapId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(annotation),
    })
  }

  // ─── Webhooks ───

  /**
   * Register a webhook URL for DroneDeploy events.
   *
   * Events: processing_complete, export_ready
   */
  async registerWebhook(
    url: string,
    events: DroneDeployWebhookEvent[],
  ): Promise<DroneDeployWebhook> {
    this.log.info({ url, events }, 'Registering DroneDeploy webhook')

    return this.request<DroneDeployWebhook>('/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, events }),
    })
  }

  /**
   * List all registered webhooks.
   */
  async listWebhooks(): Promise<DroneDeployWebhook[]> {
    const data = await this.request<{ data: DroneDeployWebhook[] }>('/webhooks')
    return data.data
  }

  /**
   * Delete a registered webhook.
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.request(`/webhooks/${webhookId}`, { method: 'DELETE' })
    this.log.info({ webhookId }, 'Deleted DroneDeploy webhook')
  }

  // ─── Projects ───

  /**
   * List all projects (organizations/folders) in the DroneDeploy account.
   */
  async listProjects(): Promise<DroneDeployProject[]> {
    const data = await this.request<{ data: DroneDeployProject[] }>('/projects')
    return data.data
  }

  /**
   * Get a single project with its maps.
   */
  async getProject(projectId: string): Promise<DroneDeployProject> {
    return this.request<DroneDeployProject>(`/projects/${projectId}`)
  }
}

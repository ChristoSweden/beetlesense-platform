import { logger } from '../../lib/logger.js'

/**
 * ArcGIS Online / Portal REST API client.
 *
 * Authenticates via OAuth2 app login (client_credentials) using
 * ARCGIS_CLIENT_ID and ARCGIS_CLIENT_SECRET environment variables.
 *
 * Base URL: https://www.arcgis.com/sharing/rest
 *
 * Reference: https://developers.arcgis.com/rest/
 */

// ─── Types ───

export interface ArcGISField {
  name: string
  alias: string
  type:
    | 'esriFieldTypeOID'
    | 'esriFieldTypeString'
    | 'esriFieldTypeInteger'
    | 'esriFieldTypeDouble'
    | 'esriFieldTypeDate'
    | 'esriFieldTypeSmallInteger'
    | 'esriFieldTypeSingle'
    | 'esriFieldTypeGlobalID'
  length?: number
  editable?: boolean
  nullable?: boolean
}

export interface ArcGISSpatialReference {
  wkid: number
  latestWkid?: number
}

export interface ArcGISFeature {
  attributes: Record<string, unknown>
  geometry?: {
    x?: number
    y?: number
    rings?: number[][][]
    paths?: number[][][]
    points?: number[][]
    spatialReference?: ArcGISSpatialReference
  }
}

export interface ArcGISItem {
  id: string
  title: string
  type: string
  url: string | null
  owner: string
  created: number
  modified: number
  tags: string[]
  description: string | null
  extent: number[][] | null
}

export interface ArcGISSearchResult {
  query: string
  total: number
  start: number
  num: number
  results: ArcGISItem[]
}

export interface AddFeaturesResult {
  addResults: Array<{
    objectId: number
    globalId: string | null
    success: boolean
    error?: { code: number; description: string }
  }>
}

export interface CreateServiceResult {
  encodedServiceURL: string
  itemId: string
  name: string
  serviceItemId: string
  serviceurl: string
  size: number
  success: boolean
  type: string
}

export interface UploadItemResult {
  success: boolean
  id: string
  folder: string | null
}

// ─── Client ───

export class ArcGISClient {
  private readonly log = logger.child({ service: 'arcgis' })

  private readonly BASE_URL = 'https://www.arcgis.com/sharing/rest'
  private readonly TOKEN_URL = 'https://www.arcgis.com/sharing/rest/oauth2/token'
  private readonly REQUEST_TIMEOUT_MS = 60_000

  private accessToken: string | null = null
  private tokenExpiresAt = 0

  // ─── Authentication ───

  /**
   * Authenticate via OAuth2 client_credentials (app login).
   * Caches token until 60s before expiry.
   */
  private async authenticate(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken
    }

    const clientId = process.env.ARCGIS_CLIENT_ID
    const clientSecret = process.env.ARCGIS_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      throw new Error('ARCGIS_CLIENT_ID and ARCGIS_CLIENT_SECRET are required')
    }

    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials',
      expiration: '120', // 2 hours
    })

    const resp = await fetch(this.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(15_000),
    })

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`ArcGIS OAuth2 failed (${resp.status}): ${text.slice(0, 300)}`)
    }

    const data = (await resp.json()) as { access_token: string; expires_in: number }
    this.accessToken = data.access_token
    // Cache until 60s before expiry
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000

    this.log.debug('ArcGIS OAuth2 token acquired')
    return this.accessToken
  }

  /**
   * Make an authenticated request to the ArcGIS REST API.
   */
  private async request<T>(
    url: string,
    options: {
      method?: 'GET' | 'POST'
      params?: Record<string, string>
      body?: URLSearchParams | FormData
    } = {},
  ): Promise<T> {
    const token = await this.authenticate()
    const method = options.method ?? 'POST'

    let fullUrl = url
    if (method === 'GET') {
      const qs = new URLSearchParams({ f: 'json', token, ...options.params })
      fullUrl = `${url}?${qs.toString()}`
    }

    const fetchOptions: RequestInit = {
      method,
      signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS),
    }

    if (method === 'POST') {
      if (options.body instanceof FormData) {
        options.body.append('f', 'json')
        options.body.append('token', token)
        fetchOptions.body = options.body
      } else {
        const formBody = options.body ?? new URLSearchParams()
        formBody.append('f', 'json')
        formBody.append('token', token)
        fetchOptions.headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
        fetchOptions.body = formBody.toString()
      }
    }

    const resp = await fetch(fullUrl, fetchOptions)

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`ArcGIS request failed (${resp.status}): ${text.slice(0, 300)}`)
    }

    const json = (await resp.json()) as T & { error?: { code: number; message: string } }

    if (json.error) {
      throw new Error(`ArcGIS API error ${json.error.code}: ${json.error.message}`)
    }

    return json
  }

  // ─── Feature Service Management ───

  /**
   * Create a hosted feature service in ArcGIS Online.
   *
   * @param name - Service name (must be unique per user)
   * @param fields - Field definitions for the layer
   * @param spatialReference - Spatial reference (default: WGS84 / 4326)
   * @returns Service creation result with item ID and service URL
   */
  async createFeatureService(
    name: string,
    fields: ArcGISField[],
    spatialReference: ArcGISSpatialReference = { wkid: 4326 },
  ): Promise<CreateServiceResult> {
    this.log.info({ name, fieldCount: fields.length }, 'Creating ArcGIS feature service')

    // Step 1: Create the service
    const createParams = new URLSearchParams({
      createParameters: JSON.stringify({
        name,
        serviceDescription: `BeetleSense.ai — ${name}`,
        hasStaticData: false,
        maxRecordCount: 10000,
        supportedQueryFormats: 'JSON',
        capabilities: 'Create,Delete,Query,Update,Editing',
        spatialReference,
        initialExtent: {
          xmin: 11.0,
          ymin: 55.0,
          xmax: 24.0,
          ymax: 69.5,
          spatialReference,
        },
        allowGeometryUpdates: true,
      }),
      outputType: 'featureService',
    })

    const result = await this.request<CreateServiceResult>(
      `${this.BASE_URL}/content/users/self/createService`,
      { body: createParams },
    )

    // Step 2: Add the layer definition to the service
    const layerDefinition = {
      layers: [
        {
          id: 0,
          name,
          type: 'Feature Layer',
          geometryType: 'esriGeometryPoint',
          objectIdField: 'OBJECTID',
          fields: [
            {
              name: 'OBJECTID',
              alias: 'Object ID',
              type: 'esriFieldTypeOID',
            },
            ...fields,
          ],
          extent: {
            xmin: 11.0,
            ymin: 55.0,
            xmax: 24.0,
            ymax: 69.5,
            spatialReference,
          },
        },
      ],
    }

    const adminUrl = result.serviceurl.replace('/rest/services/', '/rest/admin/services/')
    await this.request(`${adminUrl}/addToDefinition`, {
      body: new URLSearchParams({
        addToDefinition: JSON.stringify(layerDefinition),
      }),
    })

    this.log.info({ itemId: result.itemId, serviceUrl: result.serviceurl }, 'Feature service created')
    return result
  }

  /**
   * Add GeoJSON-compatible features to an existing feature service layer.
   *
   * @param serviceUrl - The feature service URL (e.g., .../FeatureServer/0)
   * @param features - Array of features with attributes and geometry
   * @returns Result with objectIds and success status per feature
   */
  async addFeatures(
    serviceUrl: string,
    features: ArcGISFeature[],
  ): Promise<AddFeaturesResult> {
    this.log.info({ serviceUrl, featureCount: features.length }, 'Adding features to ArcGIS')

    // Process in batches of 1000 (ArcGIS limit)
    const BATCH_SIZE = 1000
    const allResults: AddFeaturesResult['addResults'] = []

    for (let i = 0; i < features.length; i += BATCH_SIZE) {
      const batch = features.slice(i, i + BATCH_SIZE)
      const result = await this.request<AddFeaturesResult>(
        `${serviceUrl}/addFeatures`,
        {
          body: new URLSearchParams({
            features: JSON.stringify(batch),
            rollbackOnFailure: 'true',
          }),
        },
      )
      allResults.push(...result.addResults)
    }

    const successCount = allResults.filter((r) => r.success).length
    const failCount = allResults.length - successCount
    this.log.info({ successCount, failCount }, 'Features added')

    if (failCount > 0) {
      const firstError = allResults.find((r) => !r.success)
      this.log.warn({ firstError }, 'Some features failed to add')
    }

    return { addResults: allResults }
  }

  // ─── Item Management ───

  /**
   * Upload a file (GeoTIFF, Shapefile ZIP, GeoJSON) to ArcGIS Online as an item.
   *
   * @param filename - Name for the item
   * @param data - File contents as a Buffer
   * @param type - ArcGIS item type (e.g., 'GeoTIFF', 'Shapefile', 'GeoJson')
   * @returns Upload result with item ID
   */
  async uploadItem(
    filename: string,
    data: Buffer,
    type: 'GeoTIFF' | 'Shapefile' | 'GeoJson' | 'Tile Package' | 'Image Service',
  ): Promise<UploadItemResult> {
    this.log.info({ filename, type, sizeBytes: data.length }, 'Uploading item to ArcGIS Online')

    const token = await this.authenticate()

    const formData = new FormData()
    formData.append('file', new Blob([data]), filename)
    formData.append('title', filename.replace(/\.[^.]+$/, ''))
    formData.append('type', type)
    formData.append('tags', 'BeetleSense,forestry,bark-beetle')
    formData.append('description', `Uploaded from BeetleSense.ai — ${filename}`)
    formData.append('f', 'json')
    formData.append('token', token)

    const resp = await fetch(
      `${this.BASE_URL}/content/users/self/addItem`,
      {
        method: 'POST',
        body: formData,
        signal: AbortSignal.timeout(this.REQUEST_TIMEOUT_MS * 3), // longer timeout for uploads
      },
    )

    if (!resp.ok) {
      const text = await resp.text()
      throw new Error(`ArcGIS upload failed (${resp.status}): ${text.slice(0, 300)}`)
    }

    const result = (await resp.json()) as UploadItemResult & {
      error?: { code: number; message: string }
    }

    if (result.error) {
      throw new Error(`ArcGIS upload error ${result.error.code}: ${result.error.message}`)
    }

    this.log.info({ itemId: result.id, filename }, 'Item uploaded successfully')
    return result
  }

  /**
   * Publish a tile layer from an uploaded raster item (e.g., GeoTIFF).
   *
   * @param itemId - The item ID of the uploaded raster
   * @returns The published item result
   */
  async publishTileLayer(itemId: string): Promise<{ services: Array<{ serviceItemId: string; serviceurl: string }> }> {
    this.log.info({ itemId }, 'Publishing tile layer from raster')

    const publishParams = new URLSearchParams({
      itemId,
      filetype: 'tileService',
      publishParameters: JSON.stringify({
        name: `beetlesense_tiles_${itemId.slice(0, 8)}`,
        maxRecordCount: 2000,
        tileInfo: {
          format: 'Mixed',
          compressionQuality: 75,
          origin: { x: -2.0037508342787E7, y: 2.0037508342787E7 },
          spatialReference: { wkid: 102100, latestWkid: 3857 },
          lods: [
            { level: 0, resolution: 156543.033928, scale: 591657527.591555 },
            { level: 1, resolution: 78271.5169639999, scale: 295828763.795777 },
            { level: 2, resolution: 39135.7584820001, scale: 147914381.897889 },
          ],
        },
      }),
      outputType: 'tileService',
    })

    const result = await this.request<{
      services: Array<{ serviceItemId: string; serviceurl: string; type: string }>
    }>(`${this.BASE_URL}/content/users/self/publish`, {
      body: publishParams,
    })

    this.log.info(
      { publishedItemId: result.services[0]?.serviceItemId },
      'Tile layer published',
    )

    return result
  }

  /**
   * Get item metadata by ID.
   *
   * @param itemId - ArcGIS item ID
   * @returns Item metadata
   */
  async getItem(itemId: string): Promise<ArcGISItem> {
    return this.request<ArcGISItem>(
      `${this.BASE_URL}/content/items/${itemId}`,
      { method: 'GET' },
    )
  }

  /**
   * Search for items in ArcGIS Online.
   *
   * @param query - ArcGIS search query (e.g., 'owner:myuser AND tags:BeetleSense')
   * @param num - Number of results (max 100)
   * @returns Search results
   */
  async searchItems(query: string, num = 25): Promise<ArcGISSearchResult> {
    return this.request<ArcGISSearchResult>(
      `${this.BASE_URL}/search`,
      {
        method: 'GET',
        params: { q: query, num: String(num), sortField: 'modified', sortOrder: 'desc' },
      },
    )
  }

  /**
   * Returns the ArcGIS Map Viewer URL for an item.
   */
  static mapViewerUrl(itemId: string): string {
    return `https://www.arcgis.com/home/webmap/viewer.html?useExisting=1&layers=${itemId}`
  }
}

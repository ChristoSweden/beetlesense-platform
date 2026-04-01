import { logger } from '../../lib/logger.js'
import { stat } from 'node:fs/promises'
import { basename } from 'node:path'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'

export type OutputType =
  | 'orthophoto.tif'
  | 'dsm.tif'
  | 'dtm.tif'
  | 'all.zip'
  | 'textured_model.zip'
  | 'georeferenced_model.laz'

export type PointCloudQuality = 'ultra' | 'high' | 'medium' | 'low'
export type FeatureQuality = 'ultra' | 'high' | 'medium' | 'low' | 'lowest'

/**
 * Processing options accepted by the NodeODM `/task/new` endpoint.
 * See https://docs.opendronemap.org/arguments/ for full reference.
 */
export interface ProcessingOptions {
  /** Generate Digital Surface Model */
  dsm?: boolean
  /** Generate Digital Terrain Model */
  dtm?: boolean
  /** Orthophoto resolution in cm/px (0 = auto) */
  'orthophoto-resolution'?: number
  /** DEM resolution in cm/px (0 = auto) */
  'dem-resolution'?: number
  /** Point cloud quality preset */
  'pc-quality'?: PointCloudQuality
  /** Feature extraction quality preset */
  'feature-quality'?: FeatureQuality
  /** Mesh octree depth (higher = more detail, slower) */
  'mesh-octree-depth'?: number
  /** Crop the output to the dataset boundary (metres buffer, 0 = auto crop) */
  crop?: number
  /** Auto-detect dataset boundary */
  'auto-boundary'?: boolean
  /** Enable radiometric calibration (for multispectral cameras) */
  'radiometric-calibration'?: 'none' | 'camera' | 'camera+sun'
  /** Additional raw options forwarded to ODM */
  [key: string]: unknown
}

/**
 * Task info returned by NodeODM GET /task/{uuid}/info.
 */
export interface TaskInfo {
  uuid: string
  name: string
  status: {
    code: number
  }
  dateCreated: number
  processingTime: number
  imagesCount: number
  progress: number
  options: ProcessingOptions
  output: string[]
}

/**
 * Normalised task status that our code works with.
 */
export interface NormalisedTaskStatus {
  uuid: string
  status: TaskStatus
  progress: number
  imagesCount: number
  processingTimeMs: number
  output: string[]
}

/**
 * Status code mapping from NodeODM numeric codes to our string enum.
 * See https://github.com/OpenDroneMap/NodeODM/blob/master/libs/statusCodes.js
 */
const STATUS_MAP: Record<number, TaskStatus> = {
  10: 'QUEUED',
  20: 'RUNNING',
  30: 'FAILED',
  40: 'COMPLETED',
  50: 'CANCELED',
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

export class WebODMClient {
  private readonly baseUrl: string
  private readonly token: string | undefined
  private readonly log = logger.child({ service: 'webodm-client' })

  constructor(
    baseUrl?: string,
    token?: string,
  ) {
    this.baseUrl = (
      baseUrl ?? process.env['WEBODM_URL'] ?? 'http://localhost:3000'
    ).replace(/\/+$/, '')
    this.token = token ?? process.env['WEBODM_TOKEN']

    this.log.info({ baseUrl: this.baseUrl }, 'WebODM client initialised')
  }

  // -----------------------------------------------------------------------
  // Internal helpers
  // -----------------------------------------------------------------------

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = { ...extra }
    if (this.token) {
      h['Authorization'] = `Bearer ${this.token}`
    }
    return h
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: string | Buffer | URLSearchParams | FormData
      headers?: Record<string, string>
      timeout?: number
    },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const controller = new AbortController()
    const timeoutMs = options?.timeout ?? 30_000
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const res = await fetch(url, {
        method,
        headers: this.headers(options?.headers),
        body: options?.body,
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'no body')
        throw new Error(
          `WebODM ${method} ${path} failed: ${res.status} ${res.statusText} — ${text}`,
        )
      }

      const contentType = res.headers.get('content-type') ?? ''
      if (contentType.includes('application/json')) {
        return (await res.json()) as T
      }
      return (await res.text()) as unknown as T
    } finally {
      clearTimeout(timer)
    }
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Create a new processing task.
   *
   * This sends image files and processing options to NodeODM via
   * `POST /task/new`. Images are streamed from local filesystem paths.
   *
   * @param projectName - Human-readable project / task name
   * @param imagePaths  - Absolute local filesystem paths to the images
   * @param options     - ODM processing options
   * @returns The UUID of the created task
   */
  async createTask(
    projectName: string,
    imagePaths: string[],
    options: ProcessingOptions = {},
  ): Promise<string> {
    this.log.info(
      { projectName, imageCount: imagePaths.length, options },
      'Creating WebODM task',
    )

    // Build multipart/form-data body with native FormData (Node 18+)
    const form = new FormData()

    // Task name
    form.append('name', projectName)

    // Processing options as JSON string array of {name, value}
    const optionsList = Object.entries(options)
      .filter(([, v]) => v !== undefined)
      .map(([name, value]) => ({ name, value }))
    form.append('options', JSON.stringify(optionsList))

    // Append each image as a Blob
    for (const imgPath of imagePaths) {
      const filename = basename(imgPath)
      const fileStat = await stat(imgPath)
      const blob = new Blob([await readFileAsBuffer(imgPath)], {
        type: mimeForImage(filename),
      })
      form.append('images', blob, filename)
      this.log.debug(
        { filename, sizeBytes: fileStat.size },
        'Appending image to task',
      )
    }

    const url = `${this.baseUrl}/task/new`
    const controller = new AbortController()
    // Long timeout — uploads can take a while
    const timer = setTimeout(() => controller.abort(), 600_000)

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
        body: form,
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'no body')
        throw new Error(
          `WebODM task creation failed: ${res.status} ${res.statusText} — ${text}`,
        )
      }

      const data = (await res.json()) as { uuid: string }
      this.log.info({ uuid: data.uuid, projectName }, 'WebODM task created')
      return data.uuid
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Poll the current status of a task.
   */
  async getTaskStatus(taskId: string): Promise<NormalisedTaskStatus> {
    const info = await this.request<TaskInfo>(
      'GET',
      `/task/${taskId}/info`,
    )

    const status = STATUS_MAP[info.status.code] ?? 'QUEUED'

    return {
      uuid: info.uuid,
      status,
      progress: info.progress ?? 0,
      imagesCount: info.imagesCount ?? 0,
      processingTimeMs: info.processingTime ?? 0,
      output: info.output ?? [],
    }
  }

  /**
   * Download a task output asset (orthophoto, DSM, DTM, etc.).
   *
   * Returns the response body as a ReadableStream that can be piped to disk.
   */
  async downloadOutput(
    taskId: string,
    outputType: OutputType,
  ): Promise<ReadableStream<Uint8Array>> {
    const url = `${this.baseUrl}/task/${taskId}/download/${outputType}`
    const controller = new AbortController()
    // Long timeout for large file downloads
    const timer = setTimeout(() => controller.abort(), 1_800_000)

    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: this.headers(),
        signal: controller.signal,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => 'no body')
        throw new Error(
          `WebODM download ${outputType} failed: ${res.status} — ${text}`,
        )
      }

      if (!res.body) {
        throw new Error(
          `WebODM download ${outputType}: empty response body`,
        )
      }

      this.log.info({ taskId, outputType }, 'Downloading WebODM output')
      return res.body
    } finally {
      clearTimeout(timer)
    }
  }

  /**
   * Cancel a running or queued task.
   */
  async cancelTask(taskId: string): Promise<void> {
    await this.request<{ success: boolean }>(
      'POST',
      `/task/${taskId}/cancel`,
    )
    this.log.info({ taskId }, 'WebODM task cancelled')
  }

  /**
   * Remove a task and all its data from NodeODM.
   */
  async removeTask(taskId: string): Promise<void> {
    await this.request<{ success: boolean }>(
      'POST',
      `/task/${taskId}/remove`,
    )
    this.log.info({ taskId }, 'WebODM task removed')
  }

  /**
   * Get NodeODM server info (useful for health checks).
   */
  async getServerInfo(): Promise<{
    version: string
    taskQueueCount: number
    maxParallelTasks: number
    availableMemory: number
  }> {
    return this.request('GET', '/info')
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  const { readFile } = await import('node:fs/promises')
  return readFile(filePath)
}

function mimeForImage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'tif':
    case 'tiff':
      return 'image/tiff'
    case 'dng':
      return 'image/x-adobe-dng'
    default:
      return 'application/octet-stream'
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

let _client: WebODMClient | null = null

export function getWebODMClient(): WebODMClient {
  if (!_client) {
    _client = new WebODMClient()
  }
  return _client
}

import { logger } from '../../lib/logger.js'

/**
 * Pix4Dengine REST API client för headless fotogrammetri-bearbetning.
 *
 * Stöder:
 * - Skapa bearbetningsprojekt med drönarbilder
 * - Ladda upp bilder för ortofoto/DSM/punktmoln-generering
 * - Starta bearbetningspipeline (full, fast, volume)
 * - Pollning av bearbetningsstatus
 * - Hämta signerade nedladdningslänkar för resultat
 *
 * API-dokumentation: https://developer.pix4d.com/
 */

// ─── Konfiguration ───

export interface Pix4dConfig {
  apiKey: string
  apiBase: string
}

// ─── Bearbetningsalternativ ───

export type Pix4dPipeline = 'full' | 'fast' | 'volume'
export type Pix4dQualityLevel = 'low' | 'medium' | 'high' | 'ultra'

export interface Pix4dProcessingOptions {
  /** Önskad markupplösning i cm/pixel */
  gsd?: number
  /** Koordinatsystem för utdata (standard: EPSG:3006 SWEREF99 TM) */
  outputCrs?: string
  /** Utdataformat för ortomosaik */
  outputFormat?: 'geotiff' | 'jpg' | 'png'
  /** Kvalitetsnivå — påverkar bearbetningstid och precision */
  qualityLevel?: Pix4dQualityLevel
  /** Multispektral kalibrering — MicaSense reflektanspanel */
  calibrationPanel?: {
    enabled: boolean
    panelAlbedo?: number[]
  }
}

// ─── API-svar ───

export interface Pix4dProject {
  id: string
  name: string
  status: Pix4dProjectStatus
  created_at: string
  updated_at: string
  image_count: number
  processing_options: Record<string, unknown>
}

export type Pix4dProjectStatus =
  | 'created'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'complete'
  | 'failed'

export interface Pix4dStatusResponse {
  project_id: string
  status: Pix4dProjectStatus
  progress_percent: number
  current_step?: string
  error_message?: string
  started_at?: string
  completed_at?: string
  quality_report?: Pix4dQualityReport
}

export interface Pix4dQualityReport {
  gsd_achieved_cm: number
  overlap_frontal_percent: number
  overlap_lateral_percent: number
  tie_points: number
  calibrated_images: number
  total_images: number
  gcp_residuals?: Array<{
    name: string
    x_error_m: number
    y_error_m: number
    z_error_m: number
  }>
  processing_time_s: number
}

export interface Pix4dResultUrls {
  orthomosaic?: string
  dsm?: string
  dtm?: string
  pointcloud?: string
  quality_report?: string
}

export interface Pix4dUploadResult {
  uploaded: number
  failed: string[]
}

// ─── Pipeline-mappning till Pix4D-processtyper ───

const PIPELINE_CONFIG: Record<Pix4dPipeline, string[]> = {
  full: ['orthomosaic', 'dsm', 'pointcloud'],
  fast: ['orthomosaic'],
  volume: ['dtm', 'dsm', 'volume'],
}

/**
 * Pix4Dengine REST API client.
 *
 * Autentisering via API-nyckel (PIX4D_API_KEY).
 * Alla koordinater hanteras i SWEREF99 TM (EPSG:3006) som standard.
 */
export class Pix4dClient {
  private readonly log = logger.child({ service: 'pix4d' })
  private readonly config: Pix4dConfig

  constructor(config?: Partial<Pix4dConfig>) {
    this.config = {
      apiKey: config?.apiKey ?? process.env.PIX4D_API_KEY ?? '',
      apiBase: config?.apiBase ?? 'https://api.pix4d.com/v1',
    }
  }

  /**
   * Autentiserad API-begäran mot Pix4Dengine.
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
      this.log.error({ path, status: response.status, body }, 'Pix4D API-fel')
      throw new Error(`Pix4D API error ${response.status}: ${body}`)
    }

    return response.json() as Promise<T>
  }

  // ─── Projekthantering ───

  /**
   * Skapa ett nytt bearbetningsprojekt.
   *
   * @param name - Projektnamn (t.ex. "BeetleSense_{parcelId}_{datum}")
   * @param images - Lista med bild-URLar eller S3-nycklar
   * @param options - Bearbetningsalternativ (GSD, CRS, kvalitet)
   */
  async createProject(
    name: string,
    images: string[],
    options?: Pix4dProcessingOptions,
  ): Promise<Pix4dProject> {
    this.log.info(
      { name, imageCount: images.length, crs: options?.outputCrs },
      'Skapar Pix4D-projekt',
    )

    return this.request<Pix4dProject>('/projects', {
      method: 'POST',
      body: JSON.stringify({
        name,
        images,
        processing_options: {
          gsd: options?.gsd,
          output_crs: options?.outputCrs ?? 'EPSG:3006',
          output_format: options?.outputFormat ?? 'geotiff',
          quality: options?.qualityLevel ?? 'high',
          calibration: options?.calibrationPanel ?? { enabled: false },
        },
      }),
    })
  }

  /**
   * Ladda upp drönarbilder till ett befintligt projekt.
   *
   * @param projectId - Pix4D projekt-ID
   * @param imagePaths - S3-sökvägar eller URLar till bilderna
   */
  async uploadImages(
    projectId: string,
    imagePaths: string[],
  ): Promise<Pix4dUploadResult> {
    this.log.info(
      { projectId, imageCount: imagePaths.length },
      'Laddar upp bilder till Pix4D-projekt',
    )

    return this.request<Pix4dUploadResult>(`/projects/${projectId}/images`, {
      method: 'POST',
      body: JSON.stringify({ images: imagePaths }),
    })
  }

  // ─── Bearbetning ───

  /**
   * Starta bearbetning med vald pipeline.
   *
   * Pipelines:
   * - 'full': ortomosaik + DSM + punktmoln (standard för skogsinventering)
   * - 'fast': enbart ortomosaik (snabb förhandsgranskning)
   * - 'volume': DTM + DSM + volymberäkning (virkesvolym)
   *
   * @param projectId - Pix4D projekt-ID
   * @param pipeline - Bearbetningspipeline att köra
   */
  async startProcessing(
    projectId: string,
    pipeline: Pix4dPipeline = 'full',
  ): Promise<{ job_id: string }> {
    const outputs = PIPELINE_CONFIG[pipeline]

    this.log.info(
      { projectId, pipeline, outputs },
      'Startar Pix4D-bearbetning',
    )

    return this.request<{ job_id: string }>(`/projects/${projectId}/process`, {
      method: 'POST',
      body: JSON.stringify({
        pipeline,
        outputs,
      }),
    })
  }

  // ─── Statusövervakning ───

  /**
   * Hämta bearbetningsstatus för ett projekt.
   *
   * Returnerar status (queued/processing/complete/failed) och
   * framsteg i procent.
   *
   * @param projectId - Pix4D projekt-ID
   */
  async getStatus(projectId: string): Promise<Pix4dStatusResponse> {
    return this.request<Pix4dStatusResponse>(`/projects/${projectId}/status`)
  }

  // ─── Resultat ───

  /**
   * Hämta signerade nedladdningslänkar för bearbetningsresultat.
   *
   * Möjliga resultatfiler:
   * - orthomosaic.tif — Ortomosaik (georefererad sammansatt bild)
   * - dsm.tif — Digital ytmodell (Digital Surface Model)
   * - dtm.tif — Digital terrängmodell (Digital Terrain Model)
   * - pointcloud.laz — Komprimerat punktmoln (LAZ-format)
   * - quality_report.pdf — Kvalitetsrapport med statistik
   *
   * @param projectId - Pix4D projekt-ID
   */
  async downloadResults(projectId: string): Promise<Pix4dResultUrls> {
    this.log.info({ projectId }, 'Hämtar bearbetningsresultat från Pix4D')

    return this.request<Pix4dResultUrls>(`/projects/${projectId}/results`)
  }

  // ─── Hjälpmetoder ───

  /**
   * Radera ett projekt och alla dess data.
   */
  async deleteProject(projectId: string): Promise<void> {
    this.log.info({ projectId }, 'Raderar Pix4D-projekt')
    await this.request(`/projects/${projectId}`, { method: 'DELETE' })
  }

  /**
   * Lista alla projekt (med paginering).
   */
  async listProjects(options?: {
    limit?: number
    offset?: number
    status?: Pix4dProjectStatus
  }): Promise<{ projects: Pix4dProject[]; total: number }> {
    const params = new URLSearchParams()
    if (options?.limit) params.set('limit', String(options.limit))
    if (options?.offset) params.set('offset', String(options.offset))
    if (options?.status) params.set('status', options.status)

    return this.request<{ projects: Pix4dProject[]; total: number }>(
      `/projects?${params}`,
    )
  }
}

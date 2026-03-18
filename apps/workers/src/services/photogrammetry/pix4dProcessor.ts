import { logger } from '../../lib/logger.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import { downloadFromS3, uploadToS3, getPresignedUrl } from '../../lib/storage.js'
import {
  Pix4dClient,
  type Pix4dPipeline,
  type Pix4dProcessingOptions,
  type Pix4dQualityReport,
  type Pix4dResultUrls,
} from './pix4dClient.js'

/**
 * Fotogrammetri-bearbetningstjänst.
 *
 * Hanterar hela flödet från drönarbilder till georefererade produkter:
 * 1. Skapa Pix4D-projekt med namnkonvention "BeetleSense_{skifte}_{datum}"
 * 2. Ladda upp bilder från S3
 * 3. Starta bearbetning med SWEREF99 TM (EPSG:3006) som utdata-CRS
 * 4. Pollning var 30:e sekund tills bearbetningen är klar
 * 5. Ladda ned resultat till S3
 * 6. Skapa sensor_products-poster för varje utdatafil
 * 7. Trigga sensorbearbetningspipelinen för vidare analys
 */

const log = logger.child({ service: 'pix4d-processor' })

// ─── Konfiguration ───

/** Pollningsintervall i millisekunder (30 sekunder) */
const POLL_INTERVAL_MS = 30_000

/** Max antal pollningsförsök (~2 timmar med 30s intervall) */
const MAX_POLL_ATTEMPTS = 240

/** MIME-typer för bearbetningsresultat */
const RESULT_CONTENT_TYPES: Record<string, string> = {
  orthomosaic: 'image/tiff',
  dsm: 'image/tiff',
  dtm: 'image/tiff',
  pointcloud: 'application/octet-stream',
  quality_report: 'application/pdf',
}

/** Filnamn för bearbetningsresultat */
const RESULT_FILENAMES: Record<string, string> = {
  orthomosaic: 'orthomosaic.tif',
  dsm: 'dsm.tif',
  dtm: 'dtm.tif',
  pointcloud: 'pointcloud.laz',
  quality_report: 'quality_report.pdf',
}

// ─── Typer ───

export interface PhotogrammetryProcessingOptions {
  /** Bearbetningspipeline: full (ortho+dsm+punktmoln), fast (ortho), volume (dtm+dsm+volym) */
  pipeline?: Pix4dPipeline
  /** Önskad markupplösning (GSD) i cm/pixel */
  gsd?: number
  /** Koordinatsystem — standard EPSG:3006 (SWEREF99 TM) */
  outputCrs?: string
  /** Kvalitetsnivå */
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra'
  /** MicaSense multispektral kalibrering */
  calibrationPanel?: {
    enabled: boolean
    /** Albedovärden per band för reflektanspanelen */
    panelAlbedo?: number[]
  }
}

export interface PhotogrammetryResult {
  projectId: string
  products: Record<string, string>
  qualityReport?: Pix4dQualityReport
  processingTimeS: number
}

/**
 * Bearbeta drönarbilder genom Pix4Dengine.
 *
 * Hela flödet: S3-bilder → Pix4D → bearbetning → resultat tillbaka i S3
 * och registrerade som sensor_products i databasen.
 *
 * @param surveyId - Undersöknings-ID
 * @param parcelId - Skiftes-ID
 * @param imagePaths - S3-sökvägar till drönarbilder
 * @param options - Bearbetningsalternativ
 * @param onProgress - Callback för framstegsrapportering (0-100)
 */
export async function processImages(
  surveyId: string,
  parcelId: string,
  imagePaths: string[],
  options: PhotogrammetryProcessingOptions = {},
  onProgress?: (percent: number) => void,
): Promise<PhotogrammetryResult> {
  const client = new Pix4dClient()
  const supabase = getSupabaseAdmin()

  const pipeline = options.pipeline ?? 'full'
  const date = new Date().toISOString().slice(0, 10)
  const projectName = `BeetleSense_${parcelId}_${date}`

  log.info(
    { surveyId, parcelId, imageCount: imagePaths.length, pipeline, projectName },
    'Startar fotogrammetri-bearbetning',
  )

  // ─── 1. Generera presignerade URLar för bilderna i S3 ───
  onProgress?.(5)
  const presignedUrls = await Promise.all(
    imagePaths.map((path) => getPresignedUrl(path, 7200)), // 2 timmars giltighet
  )

  log.info(
    { imageCount: presignedUrls.length },
    'Presignerade URLar genererade för drönarbilder',
  )

  // ─── 2. Skapa Pix4D-projekt ───
  onProgress?.(10)
  const processingOptions: Pix4dProcessingOptions = {
    gsd: options.gsd,
    outputCrs: options.outputCrs ?? 'EPSG:3006',
    outputFormat: 'geotiff',
    qualityLevel: options.qualityLevel ?? 'high',
    calibrationPanel: options.calibrationPanel,
  }

  const project = await client.createProject(projectName, presignedUrls, processingOptions)
  log.info({ projectId: project.id, projectName }, 'Pix4D-projekt skapat')

  // ─── 3. Ladda upp bilder (om API kräver separat uppladdning) ───
  onProgress?.(15)
  const uploadResult = await client.uploadImages(project.id, presignedUrls)

  if (uploadResult.failed.length > 0) {
    log.warn(
      { projectId: project.id, failedCount: uploadResult.failed.length, failed: uploadResult.failed },
      'Vissa bilder kunde inte laddas upp till Pix4D',
    )
  }

  log.info(
    { projectId: project.id, uploaded: uploadResult.uploaded },
    'Bilder uppladdade till Pix4D',
  )

  // ─── 4. Starta bearbetning ───
  onProgress?.(20)
  const { job_id } = await client.startProcessing(project.id, pipeline)
  log.info({ projectId: project.id, jobId: job_id, pipeline }, 'Bearbetning startad')

  // ─── 5. Pollning av bearbetningsstatus ───
  const startTime = Date.now()
  let attempts = 0

  while (attempts < MAX_POLL_ATTEMPTS) {
    await sleep(POLL_INTERVAL_MS)
    attempts++

    const status = await client.getStatus(project.id)

    // Rapportera framsteg: 20-80% mappad till bearbetningens framsteg
    const mappedProgress = 20 + Math.round(status.progress_percent * 0.6)
    onProgress?.(mappedProgress)

    log.info(
      {
        projectId: project.id,
        status: status.status,
        progress: status.progress_percent,
        step: status.current_step,
        attempt: attempts,
      },
      'Bearbetningsstatus uppdaterad',
    )

    if (status.status === 'complete') {
      log.info(
        { projectId: project.id, processingTimeS: (Date.now() - startTime) / 1000 },
        'Pix4D-bearbetning slutförd',
      )
      break
    }

    if (status.status === 'failed') {
      const errorMsg = status.error_message ?? 'Okänt bearbetningsfel'
      log.error({ projectId: project.id, error: errorMsg }, 'Pix4D-bearbetning misslyckades')
      throw new Error(`Pix4D processing failed: ${errorMsg}`)
    }
  }

  if (attempts >= MAX_POLL_ATTEMPTS) {
    throw new Error(`Pix4D processing timeout after ${MAX_POLL_ATTEMPTS} attempts (~${MAX_POLL_ATTEMPTS * POLL_INTERVAL_MS / 60000} min)`)
  }

  // ─── 6. Hämta kvalitetsrapport ───
  onProgress?.(82)
  const finalStatus = await client.getStatus(project.id)
  const qualityReport = finalStatus.quality_report

  if (qualityReport) {
    logQualityReport(project.id, qualityReport)
  }

  // ─── 7. Ladda ned resultat till S3 ───
  onProgress?.(85)
  const resultUrls = await client.downloadResults(project.id)
  const products = await downloadResultsToS3(surveyId, parcelId, resultUrls)

  log.info(
    { projectId: project.id, productCount: Object.keys(products).length },
    'Bearbetningsresultat nedladdade till S3',
  )

  // ─── 8. Registrera sensor_products i databasen ───
  onProgress?.(90)
  for (const [productName, storagePath] of Object.entries(products)) {
    await supabase.from('sensor_products').upsert(
      {
        survey_id: surveyId,
        parcel_id: parcelId,
        sensor_type: 'photogrammetry',
        product_name: productName,
        storage_path: storagePath,
        metadata: {
          source: 'pix4d',
          pipeline,
          projectId: project.id,
          qualityReport,
        },
        created_at: new Date().toISOString(),
      },
      {
        onConflict: 'survey_id,sensor_type,product_name',
      },
    )
  }

  log.info(
    { surveyId, parcelId, productCount: Object.keys(products).length },
    'Sensorprodukter registrerade i databasen',
  )

  // ─── 9. Trigga sensorbearbetning för vidare analys ───
  onProgress?.(95)
  await triggerDownstreamProcessing(surveyId, parcelId, products)

  const processingTimeS = Math.round((Date.now() - startTime) / 1000)
  onProgress?.(100)

  log.info(
    { surveyId, parcelId, projectId: project.id, processingTimeS, products: Object.keys(products) },
    'Fotogrammetri-bearbetning fullständigt avslutad',
  )

  return {
    projectId: project.id,
    products,
    qualityReport: qualityReport ?? undefined,
    processingTimeS,
  }
}

// ─── Hjälpfunktioner ───

/**
 * Ladda ned bearbetningsresultat från Pix4D till S3.
 */
async function downloadResultsToS3(
  surveyId: string,
  parcelId: string,
  resultUrls: Pix4dResultUrls,
): Promise<Record<string, string>> {
  const products: Record<string, string> = {}

  for (const [productName, url] of Object.entries(resultUrls)) {
    if (!url) continue

    const filename = RESULT_FILENAMES[productName] ?? `${productName}.bin`
    const contentType = RESULT_CONTENT_TYPES[productName] ?? 'application/octet-stream'
    const s3Key = `surveys/${surveyId}/photogrammetry/${parcelId}/${filename}`

    try {
      // Hämta fil från Pix4D:s signerade URL
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Failed to download ${productName}: ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      await uploadToS3(s3Key, buffer, contentType)

      products[productName] = s3Key
      log.info({ productName, s3Key, sizeBytes: buffer.length }, 'Resultatfil sparad i S3')
    } catch (err) {
      log.error({ productName, url, err }, 'Kunde inte ladda ned resultatfil')
      // Fortsätt med övriga filer — en misslyckad nedladdning ska inte stoppa allt
    }
  }

  return products
}

/**
 * Logga kvalitetsrapport med varningar för dålig kvalitet.
 */
function logQualityReport(projectId: string, report: Pix4dQualityReport): void {
  log.info(
    {
      projectId,
      gsdCm: report.gsd_achieved_cm,
      overlapFrontal: report.overlap_frontal_percent,
      overlapLateral: report.overlap_lateral_percent,
      tiePoints: report.tie_points,
      calibratedImages: `${report.calibrated_images}/${report.total_images}`,
      processingTimeS: report.processing_time_s,
    },
    'Pix4D kvalitetsrapport',
  )

  // Varna om dålig överlappning (< 60% rekommenderas för skog)
  if (report.overlap_frontal_percent < 60) {
    log.warn(
      { projectId, overlap: report.overlap_frontal_percent },
      'Låg frontal överlappning — kan ge dålig kvalitet i skogsmiljö',
    )
  }

  if (report.overlap_lateral_percent < 40) {
    log.warn(
      { projectId, overlap: report.overlap_lateral_percent },
      'Låg lateral överlappning — risk för luckor i ortomosaiken',
    )
  }

  // Varna om många bilder inte kalibrerades
  const calibrationRate = report.calibrated_images / report.total_images
  if (calibrationRate < 0.9) {
    log.warn(
      { projectId, calibrated: report.calibrated_images, total: report.total_images },
      'Låg kalibreringsgrad — kontrollera bildkvalitet och GPS-data',
    )
  }

  // Logga GCP-residualer om tillgängliga
  if (report.gcp_residuals && report.gcp_residuals.length > 0) {
    for (const gcp of report.gcp_residuals) {
      const totalError = Math.sqrt(gcp.x_error_m ** 2 + gcp.y_error_m ** 2 + gcp.z_error_m ** 2)
      if (totalError > 0.05) {
        log.warn(
          { projectId, gcp: gcp.name, totalErrorM: totalError.toFixed(3) },
          'Hög GCP-residual — kontrollera markpunktens position',
        )
      }
    }
  }
}

/**
 * Trigga nedströms sensorbearbetning för de genererade produkterna.
 *
 * Ortomosaiken skickas till RGB-processorn, DSM/DTM kan användas
 * för höjdanalys och volymberäkningar.
 */
async function triggerDownstreamProcessing(
  surveyId: string,
  parcelId: string,
  products: Record<string, string>,
): Promise<void> {
  // Importera dynamiskt för att undvika cirkulära beroenden
  const { createSensorProcessingQueue, addSensorProcessingJob } = await import(
    '../../queues/sensorProcessing.queue.js'
  )

  const queue = createSensorProcessingQueue()

  try {
    // Om ortomosaik genererades — skicka till RGB-bearbetning
    if (products.orthomosaic) {
      await addSensorProcessingJob(queue, {
        surveyId,
        parcelId,
        sensorType: 'rgb',
        inputPaths: [products.orthomosaic],
        outputDir: `surveys/${surveyId}/indices/${parcelId}`,
      })
      log.info({ surveyId, parcelId }, 'RGB-bearbetning triggrad för ortomosaik')
    }
  } finally {
    await queue.close()
  }
}

/**
 * Vänta en specificerad tid (ms).
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

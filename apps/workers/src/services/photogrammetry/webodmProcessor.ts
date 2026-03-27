import { mkdir, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { randomUUID } from 'node:crypto'
import { createWriteStream } from 'node:fs'

import { logger } from '../../lib/logger.js'
import { downloadToFile, uploadFromFile, buildParcelPath } from '../../lib/storage.js'
import { getSupabaseAdmin } from '../../lib/supabase.js'
import {
  getWebODMClient,
  type ProcessingOptions,
  type TaskStatus,
  type OutputType,
} from './webodmClient.js'

// ---------------------------------------------------------------------------
// Forestry-optimised processing presets
// ---------------------------------------------------------------------------

export type ForestryPreset = 'beetle_survey' | 'general_mapping' | 'quick_check'

/**
 * Pre-configured processing option sets tuned for different forestry use-cases.
 *
 * - `beetle_survey` — Ultra quality, 2 cm/px GSD. Best for detecting bark
 *   beetle (granbarkborre) crown discolouration and bore-hole patterns.
 * - `general_mapping` — High quality, 5 cm/px GSD. Good balance of speed and
 *   detail for routine forest inventory flights.
 * - `quick_check` — Medium quality, 10 cm/px GSD. Fast turnaround for large
 *   area overviews and pre-screening.
 */
export const FORESTRY_PRESETS: Record<ForestryPreset, ProcessingOptions> = {
  beetle_survey: {
    dsm: true,
    dtm: true,
    'orthophoto-resolution': 2,
    'dem-resolution': 5,
    'pc-quality': 'ultra',
    'feature-quality': 'ultra',
    'mesh-octree-depth': 12,
    crop: 0,
    'auto-boundary': true,
    'radiometric-calibration': 'camera+sun',
  },
  general_mapping: {
    dsm: true,
    dtm: true,
    'orthophoto-resolution': 5,
    'dem-resolution': 10,
    'pc-quality': 'high',
    'feature-quality': 'high',
    'mesh-octree-depth': 10,
    crop: 0,
    'auto-boundary': true,
    'radiometric-calibration': 'camera',
  },
  quick_check: {
    dsm: true,
    dtm: false,
    'orthophoto-resolution': 10,
    'dem-resolution': 20,
    'pc-quality': 'medium',
    'feature-quality': 'medium',
    'mesh-octree-depth': 8,
    crop: 0,
    'auto-boundary': true,
    'radiometric-calibration': 'none',
  },
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProcessWithWebODMOptions {
  /** Processing preset name — overrides individual options */
  preset?: ForestryPreset
  /** Raw processing options (merged on top of preset if both given) */
  processingOptions?: ProcessingOptions
  /** Enable multispectral radiometric calibration */
  multispectral?: boolean
  /** Callback invoked on each poll to report progress externally */
  onProgress?: (progress: number, status: TaskStatus) => void | Promise<void>
  /** Poll interval in ms (default: 10 000) */
  pollIntervalMs?: number
}

export interface ProcessingResult {
  webodmTaskId: string
  outputs: UploadedOutput[]
  processingTimeMs: number
}

interface UploadedOutput {
  type: OutputType
  s3Key: string
  sensorProductId?: string
}

// ---------------------------------------------------------------------------
// Output mappings
// ---------------------------------------------------------------------------

/** Content-type map for S3 uploads */
const OUTPUT_CONTENT_TYPES: Record<OutputType, string> = {
  'orthophoto.tif': 'image/tiff',
  'dsm.tif': 'image/tiff',
  'dtm.tif': 'image/tiff',
  'all.zip': 'application/zip',
  'textured_model.zip': 'application/zip',
  'georeferenced_model.laz': 'application/octet-stream',
}

/** Which outputs to download and store by default */
const DEFAULT_OUTPUTS: OutputType[] = [
  'orthophoto.tif',
  'dsm.tif',
  'dtm.tif',
]

/** sensor_products.product_type values corresponding to each output */
const PRODUCT_TYPE_MAP: Partial<Record<OutputType, string>> = {
  'orthophoto.tif': 'drone_orthophoto',
  'dsm.tif': 'drone_dsm',
  'dtm.tif': 'drone_dtm',
}

// ---------------------------------------------------------------------------
// Processor
// ---------------------------------------------------------------------------

/**
 * End-to-end WebODM processing orchestrator.
 *
 * 1. Downloads drone images from S3 to a local temp directory.
 * 2. Creates a WebODM task with forestry-optimised settings.
 * 3. Polls for completion, reporting progress via `onProgress`.
 * 4. Downloads output rasters, converts to Cloud-Optimised GeoTIFF (COG),
 *    and uploads back to S3.
 * 5. Creates `sensor_products` records in Supabase.
 * 6. Cleans up temp files and (optionally) the WebODM task.
 *
 * @param surveyId   - BeetleSense survey UUID
 * @param parcelId   - BeetleSense parcel UUID
 * @param imagePaths - S3 keys for the drone images
 * @param options    - Processing options / preset / callbacks
 */
export async function processWithWebODM(
  surveyId: string,
  parcelId: string,
  imagePaths: string[],
  options: ProcessWithWebODMOptions = {},
): Promise<ProcessingResult> {
  const log = logger.child({
    service: 'webodm-processor',
    surveyId,
    parcelId,
  })

  const {
    preset = 'beetle_survey',
    processingOptions = {},
    multispectral = false,
    onProgress,
    pollIntervalMs = 10_000,
  } = options

  // Merge preset defaults with any explicit overrides
  const mergedOptions: ProcessingOptions = {
    ...FORESTRY_PRESETS[preset],
    ...processingOptions,
  }

  // Force radiometric calibration for multispectral sensors
  if (multispectral && !processingOptions['radiometric-calibration']) {
    mergedOptions['radiometric-calibration'] = 'camera+sun'
  }

  const client = getWebODMClient()
  const workDir = join(tmpdir(), `beetlesense-webodm-${randomUUID()}`)

  try {
    // ------------------------------------------------------------------
    // Step 1: Download images from S3 to temp directory
    // ------------------------------------------------------------------
    log.info(
      { imageCount: imagePaths.length, workDir },
      'Downloading images from S3',
    )
    await mkdir(workDir, { recursive: true })

    const localPaths: string[] = []
    for (const s3Key of imagePaths) {
      const filename = s3Key.split('/').pop() ?? `img_${randomUUID()}.jpg`
      const localPath = join(workDir, filename)
      await downloadToFile(s3Key, localPath)
      localPaths.push(localPath)
    }

    log.info(
      { downloadedCount: localPaths.length },
      'All images downloaded from S3',
    )

    // ------------------------------------------------------------------
    // Step 2: Create WebODM task
    // ------------------------------------------------------------------
    const taskName = `beetlesense_${surveyId}_${parcelId}`
    const taskId = await client.createTask(taskName, localPaths, mergedOptions)

    log.info({ taskId, preset, mergedOptions }, 'WebODM task created')

    // ------------------------------------------------------------------
    // Step 3: Poll until completion
    // ------------------------------------------------------------------
    const finalStatus = await pollUntilDone(
      client,
      taskId,
      pollIntervalMs,
      onProgress,
      log,
    )

    if (finalStatus.status === 'FAILED') {
      throw new Error(
        `WebODM task ${taskId} failed. Last output: ${finalStatus.output.slice(-5).join('\n')}`,
      )
    }
    if (finalStatus.status === 'CANCELED') {
      throw new Error(`WebODM task ${taskId} was cancelled.`)
    }

    log.info(
      {
        taskId,
        processingTimeMs: finalStatus.processingTimeMs,
      },
      'WebODM processing complete',
    )

    // ------------------------------------------------------------------
    // Step 4: Download outputs, convert to COG, upload to S3
    // ------------------------------------------------------------------
    const outputDir = join(workDir, 'outputs')
    await mkdir(outputDir, { recursive: true })

    const outputs: UploadedOutput[] = []

    for (const outputType of DEFAULT_OUTPUTS) {
      try {
        const uploaded = await downloadConvertUpload(
          client,
          taskId,
          outputType,
          outputDir,
          surveyId,
          parcelId,
          log,
        )
        outputs.push(uploaded)
      } catch (err) {
        // DTM may not always be generated (e.g. quick_check preset)
        log.warn(
          { outputType, error: (err as Error).message },
          'Failed to download output — skipping',
        )
      }
    }

    // ------------------------------------------------------------------
    // Step 5: Create sensor_products records in Supabase
    // ------------------------------------------------------------------
    const supabase = getSupabaseAdmin()

    for (const output of outputs) {
      const productType = PRODUCT_TYPE_MAP[output.type]
      if (!productType) continue

      const { data, error } = await supabase
        .from('sensor_products')
        .insert({
          survey_id: surveyId,
          parcel_id: parcelId,
          product_type: productType,
          storage_path: output.s3Key,
          source: 'webodm',
          processing_preset: preset,
          metadata: {
            webodm_task_id: taskId,
            processing_options: mergedOptions,
            processing_time_ms: finalStatus.processingTimeMs,
          },
        })
        .select('id')
        .single()

      if (error) {
        log.error({ error, productType }, 'Failed to create sensor_product')
      } else {
        output.sensorProductId = data.id
        log.info(
          { sensorProductId: data.id, productType },
          'Created sensor_product record',
        )
      }
    }

    // ------------------------------------------------------------------
    // Step 6: Cleanup
    // ------------------------------------------------------------------
    try {
      await client.removeTask(taskId)
    } catch (err) {
      log.warn({ error: (err as Error).message }, 'Failed to remove WebODM task — non-fatal')
    }

    return {
      webodmTaskId: taskId,
      outputs,
      processingTimeMs: finalStatus.processingTimeMs,
    }
  } finally {
    // Always clean up temp directory
    await rm(workDir, { recursive: true, force: true }).catch(() => {})
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function pollUntilDone(
  client: ReturnType<typeof getWebODMClient>,
  taskId: string,
  intervalMs: number,
  onProgress: ProcessWithWebODMOptions['onProgress'],
  log: typeof logger,
) {
  const TERMINAL: TaskStatus[] = ['COMPLETED', 'FAILED', 'CANCELED']

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const status = await client.getTaskStatus(taskId)

    log.debug(
      { taskId, status: status.status, progress: status.progress },
      'Polled WebODM task',
    )

    if (onProgress) {
      await onProgress(status.progress, status.status)
    }

    if (TERMINAL.includes(status.status)) {
      return status
    }

    await sleep(intervalMs)
  }
}

async function downloadConvertUpload(
  client: ReturnType<typeof getWebODMClient>,
  taskId: string,
  outputType: OutputType,
  outputDir: string,
  surveyId: string,
  parcelId: string,
  log: typeof logger,
): Promise<UploadedOutput> {
  const localPath = join(outputDir, outputType)

  // Download from WebODM
  log.info({ taskId, outputType }, 'Downloading output from WebODM')
  const body = await client.downloadOutput(taskId, outputType)

  // Write ReadableStream to file
  await writeStreamToFile(body, localPath)

  // Convert GeoTIFFs to Cloud-Optimised GeoTIFF via GDAL
  let uploadPath = localPath
  if (outputType.endsWith('.tif')) {
    uploadPath = await convertToCOG(localPath, log)
  }

  // Upload to S3
  const s3Key = buildParcelPath(
    parcelId,
    `surveys/${surveyId}/photogrammetry`,
    outputType,
  )
  await uploadFromFile(uploadPath, s3Key, OUTPUT_CONTENT_TYPES[outputType])

  log.info({ s3Key, outputType }, 'Uploaded output to S3')

  return { type: outputType, s3Key }
}

/**
 * Convert a GeoTIFF to Cloud-Optimised GeoTIFF using GDAL.
 *
 * Requires `gdal_translate` to be available on PATH (installed in the
 * worker Docker image).
 */
async function convertToCOG(
  inputPath: string,
  log: typeof logger,
): Promise<string> {
  const cogPath = inputPath.replace(/\.tif$/, '_cog.tif')

  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const execFileAsync = promisify(execFile)

  try {
    await execFileAsync('gdal_translate', [
      inputPath,
      cogPath,
      '-of',
      'COG',
      '-co',
      'COMPRESS=DEFLATE',
      '-co',
      'PREDICTOR=2',
      '-co',
      'OVERVIEWS=IGNORE_EXISTING',
      '-co',
      'BLOCKSIZE=512',
      '-co',
      'BIGTIFF=IF_SAFER',
    ])

    log.info({ inputPath, cogPath }, 'Converted to COG')
    return cogPath
  } catch (err) {
    log.warn(
      { error: (err as Error).message },
      'GDAL COG conversion failed — using original GeoTIFF',
    )
    return inputPath
  }
}

async function writeStreamToFile(
  readableStream: ReadableStream<Uint8Array>,
  filePath: string,
): Promise<void> {
  const writer = createWriteStream(filePath)
  const reader = readableStream.getReader()

  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        const canContinue = writer.write(value)
        if (!canContinue) {
          await new Promise<void>((resolve) => writer.once('drain', resolve))
        }
      }
    }
  } finally {
    writer.end()
    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

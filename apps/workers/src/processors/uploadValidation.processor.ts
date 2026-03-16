import type { Job} from 'bullmq';
import { Worker } from 'bullmq'
import { createRedisConnection } from '../lib/redis.js'
import { getSupabaseAdmin } from '../lib/supabase.js'
import { createJobLogger } from '../lib/logger.js'
import {
  UPLOAD_VALIDATION_QUEUE,
  type UploadValidationJobData,
} from '../queues/uploadValidation.queue.js'

/** Allowed MIME types for survey uploads */
const ALLOWED_MIME_TYPES = new Set([
  // Raster imagery
  'image/tiff',
  'image/jpeg',
  'image/png',
  'image/webp',
  // GeoTIFF variants
  'application/geo+json',
  'application/x-geotiff',
  // Video (drone footage)
  'video/mp4',
  'video/quicktime',
  // Point cloud
  'application/vnd.las',
  'application/octet-stream', // .laz files often come as this
  // Shapefiles / GeoPackage
  'application/x-shapefile',
  'application/geopackage+sqlite3',
  // ZIP archives (shapefiles)
  'application/zip',
])

/** Max file size: 5 GB */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024

interface ValidationResult {
  valid: boolean
  errors: string[]
  metadata: Record<string, unknown>
}

function validateMimeType(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType)
}

function validateFileSize(sizeBytes: number): boolean {
  return sizeBytes > 0 && sizeBytes <= MAX_FILE_SIZE_BYTES
}

function extractMetadata(
  data: UploadValidationJobData,
): Record<string, unknown> {
  // Placeholder: in production, this would download the file header and extract
  // EXIF data, GeoTIFF CRS, image dimensions, GPS coordinates, etc.
  const ext = data.fileName.split('.').pop()?.toLowerCase() ?? ''

  return {
    fileExtension: ext,
    mimeType: data.mimeType,
    fileSizeBytes: data.fileSizeBytes,
    validatedAt: new Date().toISOString(),
    // In a real implementation:
    // - For TIFF/GeoTIFF: CRS, bounds, resolution, band count
    // - For JPEG/PNG: dimensions, EXIF GPS, camera model
    // - For video: duration, resolution, frame rate
    // - For point clouds: point count, CRS, bounds
  }
}

/**
 * Upload Validation Worker
 *
 * Validates uploaded files:
 * 1. Check MIME type against allowlist
 * 2. Validate file size
 * 3. Extract metadata (placeholder)
 * 4. Update survey_uploads row with status and metadata
 */
export function createUploadValidationWorker(): Worker<UploadValidationJobData> {
  const worker = new Worker<UploadValidationJobData>(
    UPLOAD_VALIDATION_QUEUE,
    async (job: Job<UploadValidationJobData>) => {
      const log = createJobLogger(job.id!, UPLOAD_VALIDATION_QUEUE)
      const supabase = getSupabaseAdmin()
      const { uploadId, surveyId, fileName, mimeType, fileSizeBytes } =
        job.data

      log.info(
        { uploadId, surveyId, fileName, mimeType, fileSizeBytes },
        'Validating upload',
      )

      const result: ValidationResult = {
        valid: true,
        errors: [],
        metadata: {},
      }

      await job.updateProgress(10)

      // Validate MIME type
      if (!validateMimeType(mimeType)) {
        result.valid = false
        result.errors.push(
          `Unsupported file type: ${mimeType}. Allowed types: ${[...ALLOWED_MIME_TYPES].join(', ')}`,
        )
      }

      await job.updateProgress(30)

      // Validate file size
      if (!validateFileSize(fileSizeBytes)) {
        result.valid = false
        if (fileSizeBytes <= 0) {
          result.errors.push('File is empty (0 bytes)')
        } else {
          result.errors.push(
            `File too large: ${(fileSizeBytes / (1024 * 1024 * 1024)).toFixed(2)} GB. Maximum is 5 GB.`,
          )
        }
      }

      await job.updateProgress(50)

      // Extract metadata
      result.metadata = extractMetadata(job.data)

      await job.updateProgress(70)

      // Update the survey_uploads record
      const newStatus = result.valid ? 'uploaded' : 'failed'
      const updateData: Record<string, unknown> = {
        upload_status: newStatus,
        metadata: {
          ...result.metadata,
          validation: {
            valid: result.valid,
            errors: result.errors,
          },
        },
      }

      const { error: updateError } = await supabase
        .from('survey_uploads')
        .update(updateData)
        .eq('id', uploadId)

      if (updateError) {
        throw new Error(
          `Failed to update upload status: ${updateError.message}`,
        )
      }

      await job.updateProgress(100)

      if (!result.valid) {
        log.warn(
          { uploadId, errors: result.errors },
          'Upload validation failed',
        )
      } else {
        log.info({ uploadId, fileName }, 'Upload validated successfully')
      }

      return result
    },
    {
      connection: createRedisConnection(),
      concurrency: 10,
    },
  )

  worker.on('completed', (job) => {
    const log = createJobLogger(job.id!, UPLOAD_VALIDATION_QUEUE)
    log.info({ uploadId: job.data.uploadId }, 'Upload validation completed')
  })

  worker.on('failed', async (job, err) => {
    if (!job) return
    const log = createJobLogger(job.id!, UPLOAD_VALIDATION_QUEUE)
    log.error({ uploadId: job.data.uploadId, err }, 'Upload validation failed')

    // Mark upload as failed
    try {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('survey_uploads')
        .update({
          upload_status: 'failed',
          metadata: { error: err.message },
        })
        .eq('id', job.data.uploadId)
    } catch {
      log.error('Failed to update upload status after worker failure')
    }
  })

  worker.on('error', (err) => {
    createJobLogger('unknown', UPLOAD_VALIDATION_QUEUE).error(
      { err },
      'Worker error',
    )
  })

  return worker
}

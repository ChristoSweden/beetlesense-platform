import { z } from 'zod'

export const uploadMetadataSchema = z.object({
  surveyId: z.string().uuid('Invalid survey ID'),
  fileName: z.string().min(1, 'File name is required').max(500),
  fileType: z.enum([
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/geotiff',
    'application/geo+json',
    'application/zip',
    'video/mp4',
  ]),
  fileSizeBytes: z
    .number()
    .int()
    .positive('File size must be positive')
    .max(5_368_709_120, 'File exceeds maximum upload size of 5GB'),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/, 'Invalid SHA-256 checksum').optional(),
  captureLocation: z
    .object({
      type: z.literal('Point'),
      coordinates: z.tuple([z.number(), z.number()]),
    })
    .nullable()
    .optional(),
  capturedAt: z.string().datetime().nullable().optional(),
  metadata: z
    .record(z.string(), z.unknown())
    .default({})
    .describe('EXIF data, camera settings, or flight telemetry'),
})

export type UploadMetadataInput = z.infer<typeof uploadMetadataSchema>

export const uploadCompleteSchema = z.object({
  uploadId: z.string().uuid(),
  storagePath: z.string().min(1),
  checksumSha256: z.string().regex(/^[a-f0-9]{64}$/),
})

export type UploadCompleteInput = z.infer<typeof uploadCompleteSchema>

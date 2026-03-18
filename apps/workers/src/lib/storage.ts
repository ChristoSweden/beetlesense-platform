import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from '../config.js'
import { logger } from './logger.js'
import type { Readable } from 'node:stream'
import { createWriteStream } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { pipeline } from 'node:stream/promises'

let s3Client: S3Client | null = null

/**
 * Returns a singleton S3 client configured for Hetzner Object Storage
 * (or any S3-compatible endpoint).
 */
function getS3Client(): S3Client {
  if (s3Client) return s3Client

  s3Client = new S3Client({
    endpoint: config.s3.endpoint,
    region: config.s3.region,
    credentials: {
      accessKeyId: config.s3.accessKey,
      secretAccessKey: config.s3.secretKey,
    },
    forcePathStyle: true, // Required for S3-compatible stores like Hetzner, MinIO
  })

  logger.info(
    { endpoint: config.s3.endpoint, bucket: config.s3.bucket },
    'S3 client initialized',
  )

  return s3Client
}

/**
 * Upload a file to S3-compatible storage.
 *
 * @param key - Object key (path within the bucket)
 * @param data - File contents as Buffer or ReadableStream
 * @param contentType - MIME type for the object
 * @returns The full S3 key that was written
 */
export async function uploadToS3(
  key: string,
  data: Buffer | Readable,
  contentType: string,
): Promise<string> {
  const client = getS3Client()

  const params: PutObjectCommandInput = {
    Bucket: config.s3.bucket,
    Key: key,
    Body: data,
    ContentType: contentType,
  }

  await client.send(new PutObjectCommand(params))

  logger.info({ key, contentType }, 'Uploaded to S3')
  return key
}

/**
 * Download a file from S3-compatible storage.
 *
 * @param key - Object key to download
 * @returns The response body as a Readable stream
 */
export async function downloadFromS3(key: string): Promise<Readable> {
  const client = getS3Client()

  const response = await client.send(
    new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }),
  )

  if (!response.Body) {
    throw new Error(`Empty response body for S3 key: ${key}`)
  }

  logger.info({ key }, 'Downloaded from S3')
  return response.Body as Readable
}

/**
 * Download a file from S3 to a local filesystem path.
 *
 * @param key - Object key to download
 * @param localPath - Local filesystem path to write to
 */
export async function downloadToFile(key: string, localPath: string): Promise<void> {
  const stream = await downloadFromS3(key)
  const writeStream = createWriteStream(localPath)
  await pipeline(stream, writeStream)
  logger.debug({ key, localPath }, 'Downloaded S3 object to file')
}

/**
 * Upload a local file to S3-compatible storage.
 *
 * @param localPath - Local filesystem path to read from
 * @param key - S3 object key
 * @param contentType - MIME type for the object
 * @returns The full S3 key that was written
 */
export async function uploadFromFile(
  localPath: string,
  key: string,
  contentType: string,
): Promise<string> {
  const data = await readFile(localPath)
  return uploadToS3(key, data, contentType)
}

/**
 * Generate a presigned URL for temporary direct access to an S3 object.
 *
 * @param key - Object key
 * @param expiresIn - Expiry in seconds (default: 3600 = 1 hour)
 * @returns Presigned URL string
 */
export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600,
): Promise<string> {
  const client = getS3Client()

  const url = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: key,
    }),
    { expiresIn },
  )

  logger.debug({ key, expiresIn }, 'Generated presigned URL')
  return url
}

/**
 * Build a consistent storage path for parcel data.
 *
 * Format: `data/{parcelId}/{source}/{filename}`
 *
 * @example buildParcelPath('abc-123', 'lantmateriet/dtm', 'elevation.tif')
 *   => 'data/abc-123/lantmateriet/dtm/elevation.tif'
 */
export function buildParcelPath(
  parcelId: string,
  source: string,
  filename: string,
): string {
  return `data/${parcelId}/${source}/${filename}`
}

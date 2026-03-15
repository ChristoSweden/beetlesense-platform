import 'dotenv/config'

export interface WorkerConfig {
  redis: {
    url: string
  }
  supabase: {
    url: string
    serviceKey: string
  }
  s3: {
    endpoint: string
    bucket: string
    accessKey: string
    secretKey: string
    region: string
  }
  inference: {
    url: string
  }
  bullBoard: {
    port: number
  }
  logLevel: string
  nodeEnv: string
}

function requireEnv(key: string): string {
  const value = process.env[key]
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`)
  }
  return value
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

export function loadConfig(): WorkerConfig {
  return {
    redis: {
      url: requireEnv('REDIS_URL'),
    },
    supabase: {
      url: requireEnv('SUPABASE_URL'),
      serviceKey: requireEnv('SUPABASE_SERVICE_KEY'),
    },
    s3: {
      endpoint: optionalEnv('S3_ENDPOINT', 'http://localhost:9000'),
      bucket: optionalEnv('S3_BUCKET', 'beetlesense-uploads'),
      accessKey: optionalEnv('S3_ACCESS_KEY', ''),
      secretKey: optionalEnv('S3_SECRET_KEY', ''),
      region: optionalEnv('S3_REGION', 'eu-north-1'),
    },
    inference: {
      url: optionalEnv('INFERENCE_URL', 'http://localhost:8000'),
    },
    bullBoard: {
      port: parseInt(optionalEnv('BULL_BOARD_PORT', '3001'), 10),
    },
    logLevel: optionalEnv('LOG_LEVEL', 'info'),
    nodeEnv: optionalEnv('NODE_ENV', 'development'),
  }
}

export const config = loadConfig()

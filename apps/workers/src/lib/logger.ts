import pino from 'pino'

const isProduction = process.env['NODE_ENV'] === 'production'

/** Keys whose values should be redacted from log output. */
const REDACT_PATHS = [
  'api_key',
  'apiKey',
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'secret',
  'secretKey',
  'authorization',
  'cookie',
  'email',
  'phone',
  'creditCard',
  'ssn',
]

export const logger = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',
  redact: {
    paths: REDACT_PATHS.flatMap((key) => [key, `*.${key}`, `*.*.${key}`]),
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {
        // Structured JSON in production
        formatters: {
          level(label: string) {
            return { level: label }
          },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }
    : {
        // Pretty-print in development
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss.l',
            ignore: 'pid,hostname',
          },
        },
      }),
})

/**
 * Create a child logger with job context.
 * Use this in processors to automatically include jobId in every log line.
 */
export function createJobLogger(jobId: string, queueName: string) {
  return logger.child({ jobId, queue: queueName })
}

/**
 * Create a child logger with arbitrary context bindings.
 */
export function createChildLogger(bindings: Record<string, unknown>) {
  return logger.child(bindings)
}

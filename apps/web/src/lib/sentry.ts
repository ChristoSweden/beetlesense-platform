/**
 * Sentry Error Tracking Integration for BeetleSense.ai
 *
 * Every exception capture includes an error code tag.
 * See /docs/error-codes.md for the full code catalog.
 */

import * as Sentry from '@sentry/react';
import { ERROR_CODES, type AppError } from './errorCodes';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string;

let initialized = false;

export function initSentry(): void {
  if (initialized || !SENTRY_DSN || SENTRY_DSN === 'https://your-dsn@sentry.io/0') {
    if (import.meta.env.DEV) {
      console.info('[Sentry] Skipped — no valid DSN. Set VITE_SENTRY_DSN in .env');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: `beetlesense@${import.meta.env.VITE_APP_VERSION || '0.1.0'}`,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Strip PII from breadcrumbs in production
      if (import.meta.env.PROD && event.breadcrumbs) {
        event.breadcrumbs = event.breadcrumbs.map((b) => ({
          ...b,
          data: undefined,
        }));
      }
      return event;
    },
  });

  initialized = true;

  if (import.meta.env.DEV) {
    console.info('[Sentry] Initialized');
  }
}

export function setSentryUser(userId: string, email?: string, role?: string): void {
  if (!initialized) return;
  Sentry.setUser({ id: userId, email, role });
}

export function clearSentryUser(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}

/**
 * Capture an exception with the BeetleSense error code system.
 * Every Sentry event includes the error code as a tag.
 */
export function captureWithCode(
  error: unknown,
  code: string,
  extra?: Record<string, unknown>,
): void {
  const appError: AppError | undefined = ERROR_CODES[code];
  const err = error instanceof Error ? error : new Error(String(error));

  if (!initialized) {
    if (import.meta.env.DEV) {
      console.error(`[Sentry] Would capture [${code}]:`, err.message, extra);
    }
    return;
  }

  Sentry.captureException(err, {
    tags: {
      code,
      module: appError?.module || 'UNKNOWN',
    },
    extra: {
      errorCode: code,
      userMessage: appError?.userMessage,
      action: appError?.action,
      ...extra,
    },
  });
}

/**
 * Capture a message (non-exception) with error code.
 */
export function captureMessage(message: string, code: string, level: Sentry.SeverityLevel = 'warning'): void {
  if (!initialized) {
    if (import.meta.env.DEV) {
      console.warn(`[Sentry] Would capture message [${code}]: ${message}`);
    }
    return;
  }

  Sentry.captureMessage(message, {
    level,
    tags: { code, module: ERROR_CODES[code]?.module || 'UNKNOWN' },
  });
}

export { Sentry };

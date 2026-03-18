/**
 * Client-side error tracking service for BeetleSense.ai
 *
 * Captures unhandled errors, promise rejections, and manually reported errors.
 * Stores them in a ring buffer and supports flushing to a backend.
 * No external dependencies.
 */

import { useAuthStore } from '@/stores/authStore';

/* ─── Types ─── */

export interface TrackedError {
  message: string;
  stack: string | undefined;
  timestamp: number;
  url: string;
  userAgent: string;
  userId: string | null;
  context?: Record<string, unknown>;
}

/* ─── Constants ─── */

const MAX_BUFFER_SIZE = 50;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;

/* ─── State ─── */

const errorBuffer: TrackedError[] = [];
const recentTimestamps: number[] = [];
const seenMessages = new Set<string>();

let initialized = false;

/* ─── Helpers ─── */

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove timestamps outside the current window
  while (recentTimestamps.length > 0 && recentTimestamps[0]! < now - RATE_LIMIT_WINDOW_MS) {
    recentTimestamps.shift();
  }
  return recentTimestamps.length >= RATE_LIMIT_MAX;
}

function recordTimestamp(): void {
  recentTimestamps.push(Date.now());
}

function getCurrentUserId(): string | null {
  try {
    const state = useAuthStore.getState();
    return state.user?.id ?? null;
  } catch {
    return null;
  }
}

function pushToBuffer(entry: TrackedError): void {
  if (errorBuffer.length >= MAX_BUFFER_SIZE) {
    errorBuffer.shift();
  }
  errorBuffer.push(entry);
}

/* ─── Core ─── */

/**
 * Manually capture an error with optional context metadata.
 * Deduplicates by message and respects the rate limit (10/min).
 */
export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error));

  // Deduplicate by message
  if (seenMessages.has(err.message)) return;

  // Rate limit
  if (isRateLimited()) return;

  seenMessages.add(err.message);
  recordTimestamp();

  // Expire dedup entry after the rate-limit window so the same error
  // can be captured again later if it resurfaces.
  setTimeout(() => {
    seenMessages.delete(err.message);
  }, RATE_LIMIT_WINDOW_MS);

  const entry: TrackedError = {
    message: err.message,
    stack: err.stack,
    timestamp: Date.now(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    userId: getCurrentUserId(),
    ...(context ? { context } : {}),
  };

  pushToBuffer(entry);

  if (import.meta.env.DEV) {
    console.error('[ErrorTracking] Captured:', entry);
  }
}

/**
 * Capture a component error forwarded from a React error boundary.
 */
export function captureComponentError(
  error: Error,
  componentStack?: string | null,
): void {
  captureError(error, {
    source: 'error-boundary',
    componentStack: componentStack ?? undefined,
  });
}

/**
 * Returns a shallow copy of the current error buffer (newest last).
 */
export function getRecentErrors(): readonly TrackedError[] {
  return [...errorBuffer];
}

/**
 * Flush errors to a backend.
 * In this demo implementation it logs to the console and clears the buffer.
 * Replace the body with a `fetch`/`sendBeacon` call for production.
 */
export function flushErrors(): TrackedError[] {
  const flushed = [...errorBuffer];

  if (flushed.length > 0) {
    console.info('[ErrorTracking] Flushing', flushed.length, 'error(s):', flushed);
  }

  // Clear buffer
  errorBuffer.length = 0;

  return flushed;
}

/**
 * Install global `error` and `unhandledrejection` handlers.
 * Safe to call multiple times — only initializes once.
 */
export function initErrorTracking(): void {
  if (initialized || typeof window === 'undefined') return;
  initialized = true;

  window.addEventListener('error', (event: ErrorEvent) => {
    captureError(event.error ?? event.message, { source: 'window.onerror' });
  });

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    captureError(event.reason ?? 'Unhandled promise rejection', {
      source: 'unhandledrejection',
    });
  });

  if (import.meta.env.DEV) {
    console.info('[ErrorTracking] Initialized — global handlers installed.');
  }
}

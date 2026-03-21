/**
 * Supabase Error Logger
 *
 * Fire-and-forget error logging to the `error_logs` table.
 * Rate-limited to max 5 inserts per minute to avoid flooding.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/* ─── Rate limiter ─── */
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60_000;
const timestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove entries older than the window
  while (timestamps.length > 0 && timestamps[0]! <= now - RATE_WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= RATE_LIMIT) return true;
  timestamps.push(now);
  return false;
}

/* ─── Extract module prefix from error code (e.g. 'AUTH' from 'AUTH-001') ─── */
function extractModule(code: string): string {
  const dash = code.indexOf('-');
  return dash > 0 ? code.slice(0, dash) : code;
}

/* ─── Public API ─── */

/**
 * Log an error to the Supabase `error_logs` table.
 * Fire-and-forget — never throws, never blocks the UI.
 */
export function logErrorToSupabase(
  code: string,
  message: string,
  stack?: string,
  extra?: Record<string, unknown>,
): void {
  try {
    if (!isSupabaseConfigured) return;
    if (isRateLimited()) return;

    const user = useAuthStore.getState().user;

    const row = {
      error_code: code,
      module: extractModule(code),
      message,
      stack: stack ?? null,
      user_id: user?.id ?? null,
      route: typeof window !== 'undefined' ? window.location.pathname : null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      metadata: extra ?? {},
    };

    // Fire-and-forget — intentionally not awaited
    supabase
      .from('error_logs')
      .insert(row)
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          console.warn('[errorLogger] Failed to log to Supabase:', error.message);
        }
      });
  } catch {
    // Swallow any unexpected error — logging must never crash the app
  }
}

/**
 * Connection Status Service — monitors Supabase connectivity
 *
 * Checks Supabase reachability on app start and every 60 seconds.
 * Emits events on status change so UI components can react.
 * When Supabase is unreachable, pages should fall back to demo data.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

type ConnectionState = 'connected' | 'disconnected' | 'checking' | 'unconfigured';

type ConnectionListener = (state: ConnectionState) => void;

const listeners = new Set<ConnectionListener>();
let currentState: ConnectionState = isSupabaseConfigured ? 'checking' : 'unconfigured';
let lastCheckTime: Date | null = null;
let checkIntervalId: ReturnType<typeof setInterval> | null = null;

const CHECK_INTERVAL_MS = 60_000; // 60 seconds

function notify(state: ConnectionState) {
  if (state === currentState) return;
  currentState = state;
  listeners.forEach((fn) => {
    try {
      fn(state);
    } catch {
      // listener errors should not break the service
    }
  });
}

async function performCheck(): Promise<boolean> {
  if (!isSupabaseConfigured) {
    notify('unconfigured');
    return false;
  }

  try {
    // Lightweight health check — select a single row from a system table
    // If the project has no tables yet, this will still succeed with an empty result
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);

    const { error } = await supabase
      .from('parcels')
      .select('id', { count: 'exact', head: true })
      .limit(1)
      .abortSignal(controller.signal);

    clearTimeout(timeout);

    if (error) {
      // 42P01 = relation does not exist — Supabase is reachable but table missing
      // This still counts as "connected" since the service itself is up
      if (error.code === '42P01' || error.code === 'PGRST116') {
        notify('connected');
        lastCheckTime = new Date();
        return true;
      }
      notify('disconnected');
      return false;
    }

    notify('connected');
    lastCheckTime = new Date();
    return true;
  } catch {
    notify('disconnected');
    return false;
  }
}

// ─── Public API ───

/** Current connection state */
export function getConnectionState(): ConnectionState {
  return currentState;
}

/** Whether Supabase is currently reachable */
export function isSupabaseConnected(): boolean {
  return currentState === 'connected';
}

/** When the last successful check happened */
export function getLastCheckTime(): Date | null {
  return lastCheckTime;
}

/** Subscribe to connection state changes. Returns an unsubscribe function. */
export function onConnectionChange(listener: ConnectionListener): () => void {
  listeners.add(listener);
  // Immediately notify of current state
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

/** Force a connectivity check right now */
export async function checkConnection(): Promise<boolean> {
  return performCheck();
}

/** Start the periodic connectivity check (called once at app startup) */
export function startConnectionMonitor(): void {
  if (checkIntervalId) return; // already running

  // Initial check
  performCheck();

  // Periodic re-check
  checkIntervalId = setInterval(performCheck, CHECK_INTERVAL_MS);

  // Also check when the browser comes back online
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      performCheck();
    });
    window.addEventListener('offline', () => {
      notify('disconnected');
    });
  }
}

/** Stop the periodic check (for cleanup/testing) */
export function stopConnectionMonitor(): void {
  if (checkIntervalId) {
    clearInterval(checkIntervalId);
    checkIntervalId = null;
  }
}

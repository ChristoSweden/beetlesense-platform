/**
 * Supabase Health Check & Connection Monitor
 *
 * Verifies Supabase is reachable and responsive before queries.
 * Used in critical paths to prevent cascading failures.
 *
 * Usage:
 *   const isHealthy = await checkSupabaseHealth();
 *   if (!isHealthy) {
 *     // Show offline banner, fall back to cache, etc.
 *   }
 */

import { supabase, isSupabaseConfigured, isBypassAuthEnabled } from './supabase';

// Cache health status for 30 seconds to avoid hammering the API
let lastHealthCheck = 0;
let lastHealthStatus = false;
const HEALTH_CHECK_TTL = 30_000;

/**
 * Quick health check: attempt a lightweight query
 * Returns true if Supabase is reachable and responsive
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    // In demo/bypass mode, always healthy
    if (isBypassAuthEnabled) {
      return true;
    }

    if (!isSupabaseConfigured) {
      return false;
    }

    // Use cached result if fresh
    const now = Date.now();
    if (now - lastHealthCheck < HEALTH_CHECK_TTL) {
      return lastHealthStatus;
    }

    // Lightweight query: just hit the auth endpoint
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Health check timeout')), 3000),
    );

    const healthPromise = supabase.auth.getUser();

    await Promise.race([healthPromise, timeout]);

    lastHealthStatus = true;
    lastHealthCheck = now;
    return true;
  } catch {
    lastHealthStatus = false;
    lastHealthCheck = Date.now();
    return false;
  }
}

/**
 * Force a fresh health check (bypasses cache)
 */
export async function forceHealthCheck(): Promise<boolean> {
  lastHealthCheck = 0;
  return checkSupabaseHealth();
}

/**
 * Get cached health status without making a new request
 */
export function getHealthStatus(): boolean {
  return lastHealthStatus;
}

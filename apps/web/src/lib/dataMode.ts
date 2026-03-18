/**
 * Unified data mode configuration for BeetleSense.
 *
 * Centralizes the logic for determining whether the app runs in demo mode
 * or connects to live data sources. All hooks/components should use this
 * instead of directly checking isDemo() + isSupabaseConfigured.
 *
 * Data source readiness:
 * ┌──────────────────┬───────────┬──────────────────────────────────────┐
 * │ Source           │ Status    │ Notes                                │
 * ├──────────────────┼───────────┼──────────────────────────────────────┤
 * │ Supabase DB/Auth │ ✅ LIVE   │ Connected to hosted instance         │
 * │ SMHI Weather     │ ✅ LIVE   │ Free API, no auth needed             │
 * │ Google Embeddings│ 🔑 READY  │ Needs GOOGLE_API_KEY                 │
 * │ Anthropic/Claude │ 🔑 READY  │ Needs ANTHROPIC_API_KEY              │
 * │ Sentinel-2/CDSE  │ 🔑 READY  │ Needs SENTINEL_HUB_CLIENT_ID/SECRET  │
 * │ Lantmäteriet     │ ✅ LIVE   │ Open data (DTM/LiDAR/ortofoto) free  │
 * │ Skogsstyrelsen   │ ✅ LIVE   │ WCS/WFS public, no auth needed       │
 * └──────────────────┴───────────┴──────────────────────────────────────┘
 */

import { isSupabaseConfigured } from './supabase';
import { useAuthStore } from '@/stores/authStore';

export type DataMode = 'live' | 'demo';

/**
 * Current data mode. Returns 'demo' when:
 * - Supabase is not configured (missing env vars), OR
 * - User is logged in as the demo user
 *
 * Otherwise returns 'live'.
 */
export function getDataMode(): DataMode {
  if (!isSupabaseConfigured) return 'demo';
  const profile = useAuthStore.getState().profile;
  if (profile?.id === 'demo-user') return 'demo';
  return 'live';
}

/**
 * Convenience: true when running against real backend.
 */
export function isLive(): boolean {
  return getDataMode() === 'live';
}

/**
 * Convenience: true when running with demo/mock data.
 * Equivalent to the old isDemo() function.
 */
export function isDemoMode(): boolean {
  return getDataMode() === 'demo';
}

/**
 * Execute live or demo logic based on current data mode.
 * Provides a clean pattern for hooks/components:
 *
 * ```ts
 * const parcels = await dataSwitch({
 *   live: () => supabase.from('parcels').select('*'),
 *   demo: () => DEMO_PARCELS,
 * });
 * ```
 */
export async function dataSwitch<T>(options: {
  live: () => T | Promise<T>;
  demo: () => T | Promise<T>;
}): Promise<T> {
  return getDataMode() === 'live' ? options.live() : options.demo();
}

/**
 * Integration status for each external data source.
 * Used by the admin dashboard and settings page.
 */
export interface IntegrationStatus {
  id: string;
  name: string;
  status: 'live' | 'ready' | 'mock';
  description: string;
  requiresKey?: string;
}

export function getIntegrationStatuses(): IntegrationStatus[] {
  return [
    {
      id: 'supabase',
      name: 'Supabase (DB/Auth)',
      status: isSupabaseConfigured ? 'live' : 'mock',
      description: isSupabaseConfigured
        ? 'Connected to hosted Supabase instance'
        : 'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY',
    },
    {
      id: 'smhi',
      name: 'SMHI Weather',
      status: 'live',
      description: 'Free open API, no authentication required',
    },
    {
      id: 'google',
      name: 'Google Gemini Embeddings',
      status: 'ready',
      description: 'RAG knowledge base with 502 sources (text-embedding-004)',
      requiresKey: 'GOOGLE_API_KEY',
    },
    {
      id: 'anthropic',
      name: 'Claude AI Companion',
      status: 'ready',
      description: 'Streaming chat with Swedish forestry expertise',
      requiresKey: 'ANTHROPIC_API_KEY',
    },
    {
      id: 'sentinel2',
      name: 'Sentinel-2 / CDSE',
      status: 'ready',
      description: 'Sentinel Hub Catalog + Process API (NDVI, bands)',
      requiresKey: 'SENTINEL_HUB_CLIENT_ID',
    },
    {
      id: 'lantmateriet',
      name: 'Lantmäteriet',
      status: 'live',
      description: 'Open data: DTM 2m, LiDAR, ortofoto WMS (free, no auth)',
    },
    {
      id: 'skogsstyrelsen',
      name: 'Skogsstyrelsen kNN',
      status: 'live',
      description: 'WCS kNN rasters + WFS harvest/habitats (free, no auth)',
    },
  ];
}

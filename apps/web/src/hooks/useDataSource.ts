/**
 * useDataSource — standardized demo/real data hook with caching
 *
 * Provides a unified pattern for all pages:
 * - Demo mode: returns demoData immediately, no loading spinner
 * - Real mode: runs Supabase query with stale-while-revalidate caching
 * - On error: falls back to cache, then to demo data
 * - Shows loading only on first fetch (not on cache-hit refetch)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { isDemoMode } from '@/lib/dataMode';
import { isSupabaseConnected } from '@/services/connectionStatus';

// ─── In-memory cache ───

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string, ttl: number): { data: T; fresh: boolean } | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;
  const age = Date.now() - entry.timestamp;
  return { data: entry.data, fresh: age < ttl };
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ─── Types ───

export interface UseDataSourceOptions<T> {
  /** Supabase query function */
  queryFn: () => Promise<T>;
  /** Demo data fallback */
  demoData: T;
  /** Cache key for stale-while-revalidate */
  cacheKey?: string;
  /** Cache TTL in ms (default: 5 min) */
  cacheTTL?: number;
  /** Whether to skip auto-fetching (useful for conditional queries) */
  enabled?: boolean;
}

export interface UseDataSourceResult<T> {
  data: T;
  isLoading: boolean;
  error: string | null;
  isDemo: boolean;
  refetch: () => Promise<void>;
  lastUpdated: Date | null;
}

// ─── Hook ───

export function useDataSource<T>(options: UseDataSourceOptions<T>): UseDataSourceResult<T> {
  const { queryFn, demoData, cacheKey, cacheTTL = DEFAULT_TTL, enabled = true } = options;

  const isDemo = isDemoMode();
  const [data, setData] = useState<T>(() => {
    // Initialize from cache or demo data
    if (isDemo) return demoData;
    if (cacheKey) {
      const cached = getCached<T>(cacheKey, cacheTTL);
      if (cached) return cached.data;
    }
    return demoData;
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (isDemo) return false;
    // Only show loading if we have no cached data
    if (cacheKey) {
      const cached = getCached<T>(cacheKey, cacheTTL);
      return !cached;
    }
    return true;
  });

  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(() => {
    if (cacheKey) {
      const entry = cache.get(cacheKey);
      if (entry) return new Date(entry.timestamp);
    }
    return null;
  });
  const [usingDemo, setUsingDemo] = useState(isDemo);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async () => {
    // Demo mode — return immediately
    if (isDemoMode()) {
      setData(demoData);
      setUsingDemo(true);
      setIsLoading(false);
      setError(null);
      return;
    }

    // If Supabase is disconnected, use cache or demo
    if (!isSupabaseConnected()) {
      if (cacheKey) {
        const cached = getCached<T>(cacheKey, Infinity); // accept any age when offline
        if (cached) {
          setData(cached.data);
          setUsingDemo(false);
          setError('Offline — showing cached data');
          setIsLoading(false);
          return;
        }
      }
      setData(demoData);
      setUsingDemo(true);
      setError('Offline — showing demo data');
      setIsLoading(false);
      return;
    }

    // Check for fresh cache before fetching
    if (cacheKey) {
      const cached = getCached<T>(cacheKey, cacheTTL);
      if (cached?.fresh) {
        setData(cached.data);
        setUsingDemo(false);
        setLastUpdated(new Date(cache.get(cacheKey)!.timestamp));
        setIsLoading(false);
        setError(null);
        // Still refetch in background for stale-while-revalidate
        // but don't show loading state
      } else if (cached) {
        // Stale cache — show it but refetch
        setData(cached.data);
        setUsingDemo(false);
        // Don't set loading — we have stale data to show
      } else {
        setIsLoading(true);
      }
    } else {
      setIsLoading(true);
    }

    try {
      const result = await queryFn();
      if (!mountedRef.current) return;

      setData(result);
      setUsingDemo(false);
      setError(null);
      setLastUpdated(new Date());

      if (cacheKey) {
        setCache(cacheKey, result);
      }
    } catch (err: unknown) {
      if (!mountedRef.current) return;

      const message = err instanceof Error ? err.message : 'Failed to load data';
      console.error(`[useDataSource] ${cacheKey ?? 'unknown'}: ${message}`);

      // Fall back to cache
      if (cacheKey) {
        const cached = getCached<T>(cacheKey, Infinity);
        if (cached) {
          setData(cached.data);
          setUsingDemo(false);
          setError(`${message} — showing cached data`);
          setIsLoading(false);
          return;
        }
      }

      // Fall back to demo data
      setData(demoData);
      setUsingDemo(true);
      setError(`${message} — showing demo data`);
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [queryFn, demoData, cacheKey, cacheTTL]);

  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      fetchData();
    }
    return () => {
      mountedRef.current = false;
    };
  }, [fetchData, enabled]);

  return {
    data,
    isLoading,
    error,
    isDemo: usingDemo,
    refetch: fetchData,
    lastUpdated,
  };
}

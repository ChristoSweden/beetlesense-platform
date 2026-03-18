import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo, DEMO_NEWS, type DemoNewsItem } from '@/lib/demoData';

export type NewsCategory =
  | 'BEETLE_OUTBREAKS'
  | 'FOREST_HEALTH'
  | 'CLIMATE_IMPACT'
  | 'REGULATIONS'
  | 'TECHNOLOGY'
  | 'MARKET_PRICES';

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  source_url: string;
  category: NewsCategory;
  combined_score: number;
  published_at: string | null;
  created_at: string;
  metadata: { source_name?: string } | null;
}

interface UseForestryNewsReturn {
  news: NewsItem[];
  isLoading: boolean;
  isRefreshing: boolean;
  lastRefreshed: Date | null;
  refresh: () => Promise<void>;
}

const STALE_MS = 3 * 60 * 60 * 1000; // 3 hours — matches Edge Function threshold

/**
 * Hook to fetch fresh forestry news on login.
 *
 * On mount:
 * 1. Loads latest news from curated_news table
 * 2. If stale (>3h), triggers the news-refresh Edge Function
 * 3. Reloads after refresh completes
 */
export function useForestryNews(limit = 8): UseForestryNewsReturn {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadNews = useCallback(async () => {
    if (isDemo() || !isSupabaseConfigured) {
      setNews(
        DEMO_NEWS.map((n: DemoNewsItem) => ({
          id: n.id,
          title: n.title,
          summary: n.snippet,
          source_url: n.source_url || '#',
          category: n.category as NewsCategory,
          combined_score: n.combined_score,
          published_at: n.published_at,
          created_at: n.published_at,
          metadata: { source_name: n.source },
        }))
          .slice(0, limit),
      );
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from('curated_news')
      .select('id, title, summary, source_url, category, combined_score, published_at, created_at, metadata')
      .order('combined_score', { ascending: false })
      .limit(limit);

    if (!error && data) {
      setNews(data as NewsItem[]);
      if (data.length > 0) {
        setLastRefreshed(new Date(data[0].created_at));
      }
    }
    setIsLoading(false);
  }, [limit]);

  const triggerRefresh = useCallback(async () => {
    if (isDemo() || !isSupabaseConfigured) return;

    setIsRefreshing(true);
    try {
      await supabase.functions.invoke('news-refresh', { method: 'POST' });
      // Reload news after refresh
      await loadNews();
    } catch {
      // Silent fail — user still sees whatever was cached
    } finally {
      setIsRefreshing(false);
    }
  }, [loadNews]);

  const refresh = useCallback(async () => {
    await triggerRefresh();
  }, [triggerRefresh]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      await loadNews();

      if (!mounted || isDemo() || !isSupabaseConfigured) return;

      // Check staleness
      const { data: latest } = await supabase
        .from('curated_news')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const isStale = !latest || (Date.now() - new Date(latest.created_at).getTime() > STALE_MS);

      if (isStale && mounted) {
        await triggerRefresh();
      }
    }

    init();
    return () => { mounted = false; };
  }, [loadNews, triggerRefresh]);

  return { news, isLoading, isRefreshing, lastRefreshed, refresh };
}

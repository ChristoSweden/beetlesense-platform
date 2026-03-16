import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_NEWS } from '@/lib/demoData';
import {
  ExternalLink,
  Sparkles,
  RefreshCw,
  Filter,
  Clock,
  TrendingUp,
} from 'lucide-react';

// ─── Types ───

type NewsCategory =
  | 'BEETLE_OUTBREAKS'
  | 'FOREST_HEALTH'
  | 'CLIMATE_IMPACT'
  | 'REGULATIONS'
  | 'TECHNOLOGY'
  | 'MARKET_PRICES';

interface NewsItem {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  published_date: string | null;
  category: NewsCategory;
  combined_score: number;
  curated_at: string;
}

interface NewsFeedProps {
  /** Callback when user clicks "Ask AI about this" */
  onAskAI?: (article: { title: string; snippet: string; url: string }) => void;
}

// ─── Category config ───

const CATEGORY_CONFIG: Record<
  NewsCategory,
  { label: string; color: string; bgColor: string }
> = {
  BEETLE_OUTBREAKS: { label: 'Beetle Outbreaks', color: '#ef4444', bgColor: '#ef444415' },
  FOREST_HEALTH: { label: 'Forest Health', color: '#4ade80', bgColor: '#4ade8015' },
  CLIMATE_IMPACT: { label: 'Climate Impact', color: '#f97316', bgColor: '#f9731615' },
  REGULATIONS: { label: 'Regulations', color: '#8b5cf6', bgColor: '#8b5cf615' },
  TECHNOLOGY: { label: 'Technology', color: '#06b6d4', bgColor: '#06b6d415' },
  MARKET_PRICES: { label: 'Market Prices', color: '#eab308', bgColor: '#eab30815' },
};

const ALL_CATEGORIES: NewsCategory[] = [
  'BEETLE_OUTBREAKS',
  'FOREST_HEALTH',
  'CLIMATE_IMPACT',
  'REGULATIONS',
  'TECHNOLOGY',
  'MARKET_PRICES',
];

// ─── Auto-refresh interval (30 min) ───
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

// ─── Component ───

export function NewsFeed({ onAskAI }: NewsFeedProps) {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<NewsCategory | 'ALL'>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async () => {
    // Demo mode: use static demo data
    if (isDemo()) {
      let items = DEMO_NEWS.map((n) => ({
        id: n.id,
        title: n.title,
        snippet: n.snippet,
        url: n.source_url,
        source: n.source,
        published_date: n.published_at,
        category: n.category as NewsCategory,
        combined_score: n.combined_score,
        curated_at: n.published_at,
      }));
      if (activeCategory !== 'ALL') {
        items = items.filter((n) => n.category === activeCategory);
      }
      setNews(items);
      return;
    }

    let query = supabase
      .from('curated_news')
      .select('*')
      .order('combined_score', { ascending: false })
      .limit(50);

    if (activeCategory !== 'ALL') {
      query = query.eq('category', activeCategory);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch news:', error.message);
      return;
    }

    setNews((data ?? []) as NewsItem[]);
  }, [activeCategory]);

  // Initial load and category change
  useEffect(() => {
    setLoading(true);
    fetchNews().finally(() => setLoading(false));
  }, [fetchNews]);

  // Auto-refresh via Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel('curated-news-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'curated_news' },
        () => {
          fetchNews();
        },
      )
      .subscribe();

    // Fallback: poll every 30 minutes
    const interval = setInterval(fetchNews, REFRESH_INTERVAL_MS);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchNews]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchNews();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return 'Recent';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Recent';
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getRelevanceBadge = (score: number): { label: string; color: string } => {
    if (score >= 0.8) return { label: 'High', color: '#4ade80' };
    if (score >= 0.5) return { label: 'Medium', color: '#fbbf24' };
    return { label: 'Low', color: '#94a3b8' };
  };

  return (
    <div className="space-y-4">
      {/* Header with filter and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-[var(--text3)]" />
          <span className="text-xs font-medium text-[var(--text2)]">Filter</span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveCategory('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            activeCategory === 'ALL'
              ? 'bg-[var(--green)] text-forest-950'
              : 'bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)]'
          }`}
        >
          All
        </button>
        {ALL_CATEGORIES.map((cat) => {
          const config = CATEGORY_CONFIG[cat];
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat
                  ? 'text-white'
                  : 'text-[var(--text2)] hover:text-[var(--text)]'
              }`}
              style={{
                backgroundColor:
                  activeCategory === cat ? config.color : 'var(--bg3)',
              }}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* News cards */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="h-4 bg-[var(--bg3)] rounded w-3/4 mb-3" />
              <div className="h-3 bg-[var(--bg3)] rounded w-full mb-2" />
              <div className="h-3 bg-[var(--bg3)] rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div
          className="rounded-xl border border-[var(--border)] p-8 text-center"
          style={{ background: 'var(--bg2)' }}
        >
          <p className="text-sm text-[var(--text3)]">
            No news articles found. Check back later or try a different category.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item) => {
            const catConfig = CATEGORY_CONFIG[item.category];
            const relevance = getRelevanceBadge(item.combined_score);

            return (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-colors"
                style={{ background: 'var(--bg2)' }}
              >
                {/* Top row: category badge + relevance */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider"
                    style={{
                      color: catConfig?.color,
                      backgroundColor: catConfig?.bgColor,
                    }}
                  >
                    {catConfig?.label ?? item.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} style={{ color: relevance.color }} />
                    <span
                      className="text-[10px] font-mono"
                      style={{ color: relevance.color }}
                    >
                      {relevance.label}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1.5 line-clamp-2">
                  {item.title}
                </h3>

                {/* Snippet */}
                <p className="text-xs text-[var(--text3)] mb-3 line-clamp-3">
                  {item.snippet}
                </p>

                {/* Meta row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                    <span className="font-medium">{item.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} />
                      {formatDate(item.published_date)}
                    </span>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1">
                    {onAskAI && (
                      <button
                        onClick={() =>
                          onAskAI({
                            title: item.title,
                            snippet: item.snippet,
                            url: item.url,
                          })
                        }
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                      >
                        <Sparkles size={12} />
                        Ask AI
                      </button>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
                    >
                      <ExternalLink size={12} />
                      Source
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default NewsFeed;

import { useTranslation } from 'react-i18next';
import { useForestryNews } from '@/hooks/useForestryNews';
import { Newspaper, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CATEGORY_COLORS: Record<string, string> = {
  BEETLE_OUTBREAKS: '#ef4444',
  FOREST_HEALTH: '#4ade80',
  CLIMATE_IMPACT: '#f97316',
  REGULATIONS: '#8b5cf6',
  TECHNOLOGY: '#06b6d4',
  MARKET_PRICES: '#eab308',
};

const CATEGORY_LABELS: Record<string, string> = {
  BEETLE_OUTBREAKS: 'Barkborre',
  FOREST_HEALTH: 'Skogshälsa',
  CLIMATE_IMPACT: 'Klimat',
  REGULATIONS: 'Regelverk',
  TECHNOLOGY: 'Teknik',
  MARKET_PRICES: 'Marknad',
};

/**
 * Compact news widget for the owner dashboard.
 * Shows latest 4 forestry news items with category badges.
 */
export function NewsWidget() {
  const { t } = useTranslation();
  const { news, isLoading, isRefreshing, refresh } = useForestryNews(4);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {t('news.title', 'Skogsnyheter')}
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={isRefreshing}
            className="p-1 rounded-md hover:bg-[var(--bg3)] transition-colors disabled:opacity-40"
            aria-label={t('news.refresh', 'Uppdatera nyheter')}
          >
            <RefreshCw
              size={12}
              className={`text-[var(--text3)] ${isRefreshing ? 'animate-spin' : ''}`}
            />
          </button>
          <Link
            to="/owner/news"
            className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-0.5"
          >
            {t('news.viewAll', 'Alla')}
            <ChevronRight size={10} />
          </Link>
        </div>
      </div>

      {/* Body */}
      <div className="divide-y divide-[var(--border)]">
        {isLoading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-5 h-5 border-2 border-[var(--green)]/30 border-t-[var(--green)] rounded-full animate-spin mx-auto" />
          </div>
        ) : news.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs text-[var(--text3)]">
            {t('news.empty', 'Inga nyheter just nu')}
          </div>
        ) : (
          news.map((item) => (
            <a
              key={item.id}
              href={item.source_url !== '#' ? item.source_url : undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg2)] transition-colors group"
            >
              {/* Category dot */}
              <div
                className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                style={{ backgroundColor: CATEGORY_COLORS[item.category] ?? '#4ade80' }}
              />

              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] line-clamp-2 leading-relaxed">
                  {item.title}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                    style={{
                      color: CATEGORY_COLORS[item.category] ?? '#4ade80',
                      backgroundColor: `${CATEGORY_COLORS[item.category] ?? '#4ade80'}15`,
                    }}
                  >
                    {CATEGORY_LABELS[item.category] ?? item.category}
                  </span>
                  {item.metadata?.source_name && (
                    <span className="text-[9px] text-[var(--text3)]">
                      {item.metadata.source_name}
                    </span>
                  )}
                  {item.published_at && (
                    <span className="text-[9px] text-[var(--text3)]">
                      {formatRelativeDate(item.published_at)}
                    </span>
                  )}
                </div>
              </div>

              {item.source_url !== '#' && (
                <ExternalLink
                  size={10}
                  className="text-[var(--text3)] opacity-0 group-hover:opacity-100 transition-opacity mt-1 flex-shrink-0"
                />
              )}
            </a>
          ))
        )}
      </div>
    </div>
  );
}

function formatRelativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Nu';
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

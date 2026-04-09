/**
 * WikiWidget — compact dashboard card showing the parcel's LLM wiki.
 *
 * Displays recent wiki pages with category badges and a link to the full wiki.
 * Uses demo data when Supabase is not configured.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, RefreshCw, Sparkles, AlertTriangle, Heart, Eye } from 'lucide-react';
import { listWikiPages, triggerWikiIngest, WIKI_CATEGORY_LABELS, type WikiPageSummary, type WikiCategory } from '@/services/wikiService';
import { isDemo } from '@/lib/demoData';

const CATEGORY_COLORS: Record<WikiCategory, string> = {
  health:      'bg-green-100 text-green-800',
  threat:      'bg-red-100 text-red-800',
  observation: 'bg-blue-100 text-blue-800',
  plan:        'bg-purple-100 text-purple-800',
  financial:   'bg-yellow-100 text-yellow-800',
  regulatory:  'bg-orange-100 text-orange-800',
  insight:     'bg-cyan-100 text-cyan-800',
  index:       'bg-gray-100 text-gray-600',
  log:         'bg-gray-100 text-gray-600',
};

const CATEGORY_ICONS: Partial<Record<WikiCategory, React.ReactNode>> = {
  health:  <Heart size={10} />,
  threat:  <AlertTriangle size={10} />,
  insight: <Sparkles size={10} />,
  observation: <Eye size={10} />,
};

interface WikiWidgetProps {
  parcelId?: string;
  parcelName?: string;
}

export function WikiWidget({ parcelId, parcelName }: WikiWidgetProps) {
  const [pages, setPages] = useState<WikiPageSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  const effectiveParcelId = parcelId ?? (isDemo() ? 'demo' : null);

  useEffect(() => {
    if (!effectiveParcelId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    listWikiPages(effectiveParcelId)
      .then((data) => setPages(data.slice(0, 4)))
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [effectiveParcelId]);

  async function handleIngest() {
    if (!effectiveParcelId || ingesting) return;
    setIngesting(true);
    try {
      await triggerWikiIngest(effectiveParcelId, 'manual');
      const data = await listWikiPages(effectiveParcelId);
      setPages(data.slice(0, 4));
    } catch {
      // fail silently — wiki is supplementary
    } finally {
      setIngesting(false);
    }
  }

  const wikiPath = effectiveParcelId
    ? `/owner/parcel/${effectiveParcelId}/wiki`
    : '/owner/parcels';

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[var(--green)]" />
          <h3 className="text-xs font-semibold text-[var(--text)]">
            {parcelName ? `${parcelName} Wiki` : 'Forest Wiki'}
          </h3>
          <span className="text-[10px] text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">
            AI-maintained
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleIngest}
            disabled={ingesting || !effectiveParcelId}
            title="Update wiki from latest data"
            className="p-1 rounded-md hover:bg-[var(--bg3)] transition-colors disabled:opacity-40"
          >
            <RefreshCw size={12} className={`text-[var(--text3)] ${ingesting ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to={wikiPath}
            className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-0.5"
          >
            Full wiki
            <ChevronRight size={10} />
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y divide-[var(--border)]">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="px-4 py-3 flex items-start gap-3">
              <div className="h-3 w-3 rounded bg-[var(--bg3)] skeleton-shimmer mt-0.5" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded bg-[var(--bg3)] skeleton-shimmer" />
                <div className="h-2 w-1/2 rounded bg-[var(--bg3)] skeleton-shimmer" />
              </div>
            </div>
          ))
        ) : pages.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <BookOpen size={20} className="mx-auto mb-2 text-[var(--text3)]" />
            <p className="text-xs text-[var(--text3)]">No wiki pages yet</p>
            {effectiveParcelId && (
              <button
                onClick={handleIngest}
                className="mt-2 text-xs text-[var(--green)] hover:underline"
              >
                Build wiki from surveys
              </button>
            )}
          </div>
        ) : (
          pages.map((page) => (
            <Link
              key={page.slug}
              to={`${wikiPath}?page=${page.slug}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-[var(--bg2)] transition-colors"
            >
              <div className="mt-0.5 shrink-0 text-[var(--text3)]">
                {CATEGORY_ICONS[page.category] ?? <BookOpen size={10} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate leading-tight">
                  {page.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[page.category]}`}>
                    {WIKI_CATEGORY_LABELS[page.category]}
                  </span>
                  <span className="text-[10px] text-[var(--text3)]">
                    {page.updated_at?.slice(0, 10)}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-[var(--border)] bg-[var(--bg2)]">
        <p className="text-[10px] text-[var(--text3)] leading-snug">
          The AI compiles your surveys and insights into this wiki automatically.{' '}
          <Link to={wikiPath} className="text-[var(--green)] hover:underline">Browse all pages →</Link>
        </p>
      </div>
    </div>
  );
}

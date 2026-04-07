/**
 * WikiViewer — renders a wiki page with markdown, cross-reference links,
 * source badges, and navigation between pages.
 *
 * Cross-references ([[slug]]) are rendered as clickable links.
 * Used in ParcelWikiPage.
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BookOpen, Search, ChevronRight, Clock, Tag, Link2,
  ArrowLeft, RefreshCw, Sparkles, AlertTriangle, Heart,
  Eye, FileText, TrendingUp, Shield, BarChart2,
} from 'lucide-react';
import {
  listWikiPages,
  getWikiPage,
  getWikiIndex,
  searchWikiPages,
  triggerWikiIngest,
  WIKI_CATEGORY_LABELS,
  WIKI_SOURCE_LABELS,
  type WikiPage,
  type WikiPageSummary,
  type WikiCategory,
} from '@/services/wikiService';

// ── Category styling ──────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<WikiCategory, string> = {
  health:      'bg-green-100 text-green-800 border-green-200',
  threat:      'bg-red-100 text-red-800 border-red-200',
  observation: 'bg-blue-100 text-blue-800 border-blue-200',
  plan:        'bg-purple-100 text-purple-800 border-purple-200',
  financial:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  regulatory:  'bg-orange-100 text-orange-800 border-orange-200',
  insight:     'bg-cyan-100 text-cyan-800 border-cyan-200',
  index:       'bg-gray-100 text-gray-600 border-gray-200',
  log:         'bg-gray-100 text-gray-600 border-gray-200',
};

const CATEGORY_ICONS: Record<WikiCategory, React.ReactNode> = {
  health:      <Heart size={13} />,
  threat:      <AlertTriangle size={13} />,
  observation: <Eye size={13} />,
  plan:        <FileText size={13} />,
  financial:   <TrendingUp size={13} />,
  regulatory:  <Shield size={13} />,
  insight:     <Sparkles size={13} />,
  index:       <BookOpen size={13} />,
  log:         <BarChart2 size={13} />,
};

// ── Markdown renderer ─────────────────────────────────────────────────────────

/**
 * Minimal markdown renderer.
 * Handles: headings, bold, italic, lists, hr, cross-references [[slug]], [Source:].
 */
function renderMarkdown(content: string, onNavigate: (slug: string) => void): React.ReactNode[] {
  const lines = content.split('\n');
  const nodes: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let key = 0;

  function flushList() {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 my-2 space-y-0.5 text-sm text-[var(--text2)]">
          {listItems}
        </ul>
      );
      listItems = [];
    }
  }

  function renderInline(text: string): React.ReactNode[] {
    // Cross-references: [[slug]]
    const crossRef = /\[\[([^\]]+)\]\]/g;
    // Source citations: [Source: ...]  [Wiki: ...]
    const citation = /\[(Source|Wiki):\s*([^\]]+)\]/g;
    // Bold: **text**
    const bold = /\*\*([^*]+)\*\*/g;

    const parts: React.ReactNode[] = [];
    let last = 0;
    const allPatterns = [
      { re: crossRef, type: 'crossref' as const },
      { re: citation, type: 'citation' as const },
      { re: bold, type: 'bold' as const },
    ];

    // Combine all matches, sorted by index
    const matches: { index: number; length: number; node: React.ReactNode }[] = [];
    for (const { re, type } of allPatterns) {
      let m: RegExpExecArray | null;
      const copy = new RegExp(re.source, re.flags);
      while ((m = copy.exec(text)) !== null) {
        if (type === 'crossref') {
          const slug = m[1];
          matches.push({
            index: m.index, length: m[0].length,
            node: (
              <button
                key={`cr-${key++}`}
                onClick={() => onNavigate(slug)}
                className="text-[var(--green)] hover:underline font-medium text-[13px]"
              >
                {slug}
              </button>
            ),
          });
        } else if (type === 'citation') {
          matches.push({
            index: m.index, length: m[0].length,
            node: (
              <span key={`cit-${key++}`} className="text-[10px] text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded font-mono">
                [{m[1]}: {m[2]}]
              </span>
            ),
          });
        } else if (type === 'bold') {
          matches.push({
            index: m.index, length: m[0].length,
            node: <strong key={`b-${key++}`} className="font-semibold text-[var(--text)]">{m[1]}</strong>,
          });
        }
      }
    }

    matches.sort((a, b) => a.index - b.index);

    for (const m of matches) {
      if (m.index > last) {
        parts.push(text.slice(last, m.index));
      }
      parts.push(m.node);
      last = m.index + m.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts.length > 0 ? parts : [text];
  }

  for (const line of lines) {
    if (line.startsWith('### ')) {
      flushList();
      nodes.push(<h3 key={key++} className="text-sm font-semibold text-[var(--text)] mt-4 mb-1.5">{renderInline(line.slice(4))}</h3>);
    } else if (line.startsWith('## ')) {
      flushList();
      nodes.push(<h2 key={key++} className="text-base font-bold text-[var(--text)] mt-5 mb-2 border-b border-[var(--border)] pb-1">{renderInline(line.slice(3))}</h2>);
    } else if (line.startsWith('# ')) {
      flushList();
      nodes.push(<h1 key={key++} className="text-lg font-bold text-[var(--text)] mt-2 mb-3">{renderInline(line.slice(2))}</h1>);
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(<li key={key++}>{renderInline(line.slice(2))}</li>);
    } else if (line === '---') {
      flushList();
      nodes.push(<hr key={key++} className="border-[var(--border)] my-4" />);
    } else if (line.trim() === '') {
      flushList();
      nodes.push(<div key={key++} className="h-2" />);
    } else {
      flushList();
      nodes.push(
        <p key={key++} className="text-sm text-[var(--text2)] leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return nodes;
}

// ── WikiViewer component ──────────────────────────────────────────────────────

interface WikiViewerProps {
  parcelId: string;
  parcelName?: string;
}

export function WikiViewer({ parcelId, parcelName }: WikiViewerProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSlug = searchParams.get('page') ?? 'index';

  const [allPages, setAllPages] = useState<WikiPageSummary[]>([]);
  const [currentPage, setCurrentPage] = useState<WikiPage | null>(null);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WikiPageSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [ingesting, setIngesting] = useState(false);

  // Load sidebar pages
  useEffect(() => {
    listWikiPages(parcelId)
      .then(setAllPages)
      .catch(() => setAllPages([]));
  }, [parcelId]);

  // Load current page
  const loadPage = useCallback(async (slug: string) => {
    setLoading(true);
    setCurrentSlug(slug);
    setSearchParams({ page: slug }, { replace: true });
    try {
      const page = slug === 'index'
        ? await getWikiIndex(parcelId)
        : await getWikiPage(parcelId, slug);
      setCurrentPage(page);
    } catch {
      setCurrentPage(null);
    } finally {
      setLoading(false);
    }
  }, [parcelId, setSearchParams]);

  useEffect(() => {
    loadPage(initialSlug);
  }, [initialSlug, loadPage]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      searchWikiPages(parcelId, searchQuery)
        .then(setSearchResults)
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, parcelId]);

  async function handleIngest() {
    if (ingesting) return;
    setIngesting(true);
    try {
      await triggerWikiIngest(parcelId, 'manual');
      const [pages] = await Promise.all([listWikiPages(parcelId)]);
      setAllPages(pages);
      await loadPage(currentSlug);
    } catch {
      // fail silently
    } finally {
      setIngesting(false);
    }
  }

  // Group pages by category for sidebar
  const grouped = allPages.reduce<Record<string, WikiPageSummary[]>>((acc, p) => {
    if (!acc[p.category]) acc[p.category] = [];
    acc[p.category].push(p);
    return acc;
  }, {});

  const sidebarItems = searchResults ?? [];
  const showSearch = searchQuery.trim().length > 0;

  return (
    <div className="flex h-full min-h-[600px] rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg)' }}>
      {/* ── Sidebar ── */}
      <aside className="w-56 shrink-0 border-r border-[var(--border)] flex flex-col" style={{ background: 'var(--bg2)' }}>
        {/* Sidebar header */}
        <div className="px-3 py-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen size={13} className="text-[var(--green)]" />
            <span className="text-xs font-bold text-[var(--text)]">
              {parcelName ? `${parcelName}` : 'Forest Wiki'}
            </span>
          </div>
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search wiki..."
              className="w-full pl-6 pr-2 py-1.5 text-[11px] rounded-md border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:ring-1 focus:ring-[var(--green)]"
            />
          </div>
        </div>

        {/* Sidebar nav */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {showSearch ? (
            <div>
              <p className="text-[10px] text-[var(--text3)] px-1 mb-1 font-medium uppercase tracking-wide">Results</p>
              {sidebarItems.length === 0 ? (
                <p className="text-[11px] text-[var(--text3)] px-1 py-2">No pages found</p>
              ) : (
                sidebarItems.map((p) => (
                  <SidebarItem key={p.slug} page={p} active={p.slug === currentSlug} onClick={() => loadPage(p.slug)} />
                ))
              )}
            </div>
          ) : (
            <>
              {/* Index link */}
              <button
                onClick={() => loadPage('index')}
                className={`w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md text-left text-[11px] font-medium transition-colors mb-1 ${
                  currentSlug === 'index'
                    ? 'bg-[var(--green)] text-white'
                    : 'text-[var(--text2)] hover:bg-[var(--bg3)]'
                }`}
              >
                <BookOpen size={11} />
                Index
              </button>

              {/* Categories */}
              {Object.entries(grouped).map(([cat, ps]) => (
                <div key={cat} className="mb-3">
                  <p className="text-[10px] text-[var(--text3)] px-1 mb-0.5 font-semibold uppercase tracking-wide">
                    {WIKI_CATEGORY_LABELS[cat as WikiCategory] ?? cat}
                  </p>
                  {ps.map((p) => (
                    <SidebarItem key={p.slug} page={p} active={p.slug === currentSlug} onClick={() => loadPage(p.slug)} />
                  ))}
                </div>
              ))}

              {allPages.length === 0 && !loading && (
                <p className="text-[11px] text-[var(--text3)] px-1 py-4 text-center">
                  No pages yet.{' '}
                  <button onClick={handleIngest} className="text-[var(--green)] hover:underline">Build wiki</button>
                </p>
              )}
            </>
          )}
        </nav>

        {/* Build wiki button */}
        <div className="px-3 py-2 border-t border-[var(--border)]">
          <button
            onClick={handleIngest}
            disabled={ingesting}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-[11px] font-medium text-[var(--green)] border border-[var(--green)] hover:bg-[var(--green)] hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={ingesting ? 'animate-spin' : ''} />
            {ingesting ? 'Building...' : 'Update wiki'}
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`h-3 rounded bg-[var(--bg3)] skeleton-shimmer ${i % 3 === 0 ? 'w-1/3' : i % 2 === 0 ? 'w-2/3' : 'w-full'}`} />
            ))}
          </div>
        ) : !currentPage ? (
          <div className="flex flex-col items-center justify-center h-full py-16 text-center px-6">
            <BookOpen size={32} className="mb-3 text-[var(--text3)]" />
            <p className="text-sm text-[var(--text2)] font-medium mb-1">Page not found</p>
            <p className="text-xs text-[var(--text3)] mb-4">This wiki page doesn't exist yet.</p>
            <button
              onClick={() => loadPage('index')}
              className="text-xs text-[var(--green)] hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={11} /> Back to index
            </button>
          </div>
        ) : (
          <article className="max-w-2xl mx-auto px-6 py-6">
            {/* Page header */}
            <div className="mb-5">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-lg font-bold text-[var(--text)] leading-tight">{currentPage.title}</h1>
                <span className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${CATEGORY_COLORS[currentPage.category]}`}>
                  {CATEGORY_ICONS[currentPage.category]}
                  {WIKI_CATEGORY_LABELS[currentPage.category]}
                </span>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-3 text-[11px] text-[var(--text3)] flex-wrap">
                <span className="flex items-center gap-1">
                  <Clock size={10} />
                  Updated {currentPage.updated_at?.slice(0, 10)}
                </span>
                <span className="flex items-center gap-1">
                  <Sparkles size={10} />
                  {WIKI_SOURCE_LABELS[currentPage.source_type]}
                </span>
                {currentPage.tags.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag size={10} />
                    {currentPage.tags.slice(0, 3).join(', ')}
                  </span>
                )}
              </div>

              {/* Related pages */}
              {currentPage.related_slugs.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Link2 size={10} className="text-[var(--text3)]" />
                  {currentPage.related_slugs.map((slug) => (
                    <button
                      key={slug}
                      onClick={() => loadPage(slug)}
                      className="text-[11px] text-[var(--green)] hover:underline flex items-center gap-0.5"
                    >
                      {slug} <ChevronRight size={9} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Page content */}
            <div className="prose-sm">
              {renderMarkdown(currentPage.content, loadPage)}
            </div>
          </article>
        )}
      </main>
    </div>
  );
}

// ── Sidebar item ──────────────────────────────────────────────────────────────

function SidebarItem({
  page,
  active,
  onClick,
}: {
  page: WikiPageSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-1.5 px-2 py-1.5 rounded-md text-left transition-colors ${
        active ? 'bg-[var(--green)] text-white' : 'text-[var(--text2)] hover:bg-[var(--bg3)]'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${active ? 'text-white' : 'text-[var(--text3)]'}`}>
        {CATEGORY_ICONS[page.category] ?? <BookOpen size={11} />}
      </span>
      <span className="text-[11px] font-medium leading-tight line-clamp-2">{page.title}</span>
    </button>
  );
}

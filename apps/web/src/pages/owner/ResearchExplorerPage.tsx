import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen,
  Search,
  Sparkles,
  SlidersHorizontal,
  X,
  ArrowUpDown,
  Library,
} from 'lucide-react';
import { useResearchSources, type ResearchSource, type SourceCategory, type SortMode } from '@/hooks/useResearchSources';
import { ResearchCard } from '@/components/research/ResearchCard';
import { ResearchDetail } from '@/components/research/ResearchDetail';
import { CompanionPanel } from '@/components/companion/CompanionPanel';

// ─── Category filter config ───

interface CategoryOption {
  key: SourceCategory;
  labelKey: string;
  color: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'research_papers', labelKey: 'research.categories.papers', color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  { key: 'open_datasets', labelKey: 'research.categories.datasets', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  { key: 'satellite_platforms', labelKey: 'research.categories.satellite', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
  { key: 'regulatory_documents', labelKey: 'research.categories.regulatory', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  { key: 'technology_references', labelKey: 'research.categories.technology', color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/20' },
  { key: 'app_references', labelKey: 'research.categories.apps', color: 'bg-pink-500/15 text-pink-400 border-pink-500/20' },
];

// ─── Component ───

/**
 * ResearchExplorerPage — browsable, searchable interface to the BeetleSense
 * knowledge base showing the science behind every insight.
 *
 * Route: /owner/research
 */
export default function ResearchExplorerPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const {
    filteredSources,
    categories,
    topicTags,
    filters,
    setFilters,
    isLoading,
    totalCount,
    getRelatedSources,
  } = useResearchSources();

  const [selectedSource, setSelectedSource] = useState<ResearchSource | null>(null);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [_companionContext, setCompanionContext] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // ─── Handlers ───

  const handleAskAI = useCallback(
    (source: ResearchSource) => {
      setCompanionContext(
        `I'd like to discuss this research source from the BeetleSense knowledge base:\n\n` +
          `Title: ${source.title}\n` +
          `Authors: ${source.authors.join(', ')}\n` +
          `Year: ${source.year ?? 'N/A'}\n` +
          `Abstract: ${source.description}\n\n` +
          `How does this research relate to forest health monitoring and bark beetle detection in Swedish forests?`,
      );
      setCompanionOpen(true);
    },
    [],
  );

  const handleSelectSource = useCallback((source: ResearchSource) => {
    setSelectedSource(source);
  }, []);

  const toggleCategory = useCallback(
    (cat: SourceCategory) => {
      const current = filters.categories;
      const next = current.includes(cat)
        ? current.filter((c) => c !== cat)
        : [...current, cat];
      setFilters({ categories: next });
    },
    [filters.categories, setFilters],
  );

  const toggleTopicTag = useCallback(
    (tag: string) => {
      const current = filters.topicTags;
      const next = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      setFilters({ topicTags: next });
    },
    [filters.topicTags, setFilters],
  );

  const clearFilters = useCallback(() => {
    setFilters({ search: '', categories: [], topicTags: [], sort: 'relevance' });
  }, [setFilters]);

  const hasActiveFilters =
    filters.search.length > 0 ||
    filters.categories.length > 0 ||
    filters.topicTags.length > 0;

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-5">
          {/* ─── Header ─── */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: '#4ade8015', color: '#4ade80' }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                  {t('research.title')}
                </h1>
                <p className="text-xs text-[var(--text3)]">
                  {t('research.subtitle', { count: totalCount })}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCompanionOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/10 transition-colors"
            >
              <Sparkles size={14} />
              {t('owner.dashboard.askAi')}
            </button>
          </div>

          {/* ─── Search bar ─── */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
              />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ search: e.target.value })}
                placeholder={t('research.searchPlaceholder')}
                className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 focus:ring-1 focus:ring-[var(--green)]/20 transition-colors"
              />
              {filters.search && (
                <button
                  onClick={() => setFilters({ search: '' })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)]"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-colors ${
                showFilters || hasActiveFilters
                  ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/5'
                  : 'border-[var(--border)] text-[var(--text2)] hover:border-[var(--border2)]'
              }`}
            >
              <SlidersHorizontal size={14} />
              {lang === 'sv' ? 'Filter' : 'Filters'}
              {hasActiveFilters && (
                <span className="w-4 h-4 rounded-full bg-[var(--green)] text-[#030d05] text-[10px] font-bold flex items-center justify-center">
                  {filters.categories.length + filters.topicTags.length}
                </span>
              )}
            </button>

            {/* Sort selector */}
            <div className="relative">
              <select
                value={filters.sort}
                onChange={(e) => setFilters({ sort: e.target.value as SortMode })}
                className="appearance-none pl-8 pr-6 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-xs font-medium text-[var(--text2)] focus:outline-none focus:border-[var(--green)]/40 cursor-pointer"
              >
                <option value="relevance">{lang === 'sv' ? 'Relevans' : 'Relevance'}</option>
                <option value="year">{lang === 'sv' ? 'År' : 'Year'}</option>
                <option value="title">{lang === 'sv' ? 'Titel' : 'Title'}</option>
              </select>
              <ArrowUpDown
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text3)] pointer-events-none"
              />
            </div>
          </div>

          {/* ─── Filter panel ─── */}
          {showFilters && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 mb-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              {/* Categories */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">
                  {lang === 'sv' ? 'Kategorier' : 'Categories'}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.filter((opt) => categories.includes(opt.key)).map((opt) => {
                    const active = filters.categories.includes(opt.key);
                    return (
                      <button
                        key={opt.key}
                        onClick={() => toggleCategory(opt.key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-colors ${
                          active
                            ? opt.color
                            : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
                        }`}
                      >
                        {t(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Topic tags */}
              <div>
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">
                  {lang === 'sv' ? 'Ämnesord' : 'Topics'}
                </h3>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {topicTags.slice(0, 30).map((tag) => {
                    const active = filters.topicTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTopicTag(tag)}
                        className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                          active
                            ? 'bg-[var(--green)]/15 text-[var(--green)] border-[var(--green)]/20'
                            : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)] hover:text-[var(--text2)]'
                        }`}
                      >
                        {tag.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Clear filters */}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--green)] hover:underline font-medium"
                >
                  {lang === 'sv' ? 'Rensa alla filter' : 'Clear all filters'}
                </button>
              )}
            </div>
          )}

          {/* ─── Results count ─── */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--text3)]">
              {filteredSources.length === totalCount
                ? `${totalCount} ${lang === 'sv' ? 'källor' : 'sources'}`
                : `${filteredSources.length} ${lang === 'sv' ? 'av' : 'of'} ${totalCount} ${lang === 'sv' ? 'källor' : 'sources'}`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors"
              >
                {t('research.showAll')}
              </button>
            )}
          </div>

          {/* ─── Loading state ─── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
              <span className="text-xs text-[var(--text3)] font-mono uppercase tracking-widest">
                {lang === 'sv' ? 'Laddar forskning...' : 'Loading research...'}
              </span>
            </div>
          )}

          {/* ─── Empty state ─── */}
          {!isLoading && filteredSources.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[var(--bg3)] border border-[var(--border)]">
                <Library size={28} className="text-[var(--text3)]" />
              </div>
              <p className="text-sm text-[var(--text3)]">
                {t('common.noResults')}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-[var(--green)] hover:underline font-medium"
                >
                  {lang === 'sv' ? 'Rensa filter' : 'Clear filters'}
                </button>
              )}
            </div>
          )}

          {/* ─── Card grid ─── */}
          {!isLoading && filteredSources.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredSources.map((source) => (
                <ResearchCard
                  key={source.id}
                  source={source}
                  onSelect={handleSelectSource}
                  onAskAI={handleAskAI}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Detail slide-out ─── */}
      {selectedSource && (
        <ResearchDetail
          source={selectedSource}
          relatedSources={getRelatedSources(selectedSource)}
          onClose={() => setSelectedSource(null)}
          onAskAI={handleAskAI}
          onSelectRelated={(s) => setSelectedSource(s)}
        />
      )}

      {/* ─── AI Companion Panel ─── */}
      <CompanionPanel
        isOpen={companionOpen}
        onToggle={() => setCompanionOpen(!companionOpen)}
      />
    </div>
  );
}

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquareQuote,
  Plus,
  Search,
  List,
  Map as MapIcon,
  SlidersHorizontal,
} from 'lucide-react';
import {
  useKnowledgeCapture,
  CATEGORY_CONFIG,
  type KnowledgeCategory,
  type SortMode,
} from '@/hooks/useKnowledgeCapture';
import { NoteCard } from '@/components/knowledge/NoteCard';
import { RecordNote } from '@/components/knowledge/RecordNote';
import { KnowledgeMap } from '@/components/knowledge/KnowledgeMap';

const ALL_CATEGORIES: KnowledgeCategory[] = [
  'terrain',
  'water',
  'wildlife',
  'history',
  'operations',
  'warnings',
  'traditions',
];

const SORT_OPTIONS: { value: SortMode; labelKey: string }[] = [
  { value: 'newest', labelKey: 'knowledge.sortNewest' },
  { value: 'oldest', labelKey: 'knowledge.sortOldest' },
  { value: 'category', labelKey: 'knowledge.sortCategory' },
];

export default function KnowledgeCapturePage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  const {
    filteredNotes,
    isLoading,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortMode,
    setSortMode,
    addNote,
    getCurrentLocation,
    totalCount,
  } = useKnowledgeCapture();

  const [view, setView] = useState<'map' | 'list'>('map');
  const [recordOpen, setRecordOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Categories enabled for map display
  const [enabledCategories, setEnabledCategories] = useState<Set<KnowledgeCategory>>(
    new Set(ALL_CATEGORIES),
  );

  const toggleMapCategory = useCallback((cat: KnowledgeCategory) => {
    setEnabledCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-[var(--border)] px-5 py-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
              <MessageSquareQuote size={18} className="text-[var(--green)]" />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('knowledge.pageTitle')}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {t('knowledge.pageSubtitle')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
              {totalCount} {t('knowledge.notes')}
            </span>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 mt-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('knowledge.searchPlaceholder')}
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)] placeholder:text-[var(--text3)]"
            />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg overflow-hidden border border-[var(--border)]">
            <button
              onClick={() => setView('map')}
              className={`p-2 text-xs transition-colors ${
                view === 'map'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
              aria-label="Map view"
            >
              <MapIcon size={16} />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-2 text-xs transition-colors ${
                view === 'list'
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
              aria-label="List view"
            >
              <List size={16} />
            </button>
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg border transition-colors ${
              showFilters
                ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>

        {/* Filters bar */}
        {showFilters && (
          <div className="mt-3 space-y-2">
            {/* Category filters */}
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setCategoryFilter(null)}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                  !categoryFilter
                    ? 'border-[var(--green)] bg-[var(--green)]/10 text-[var(--green)]'
                    : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {t('knowledge.allCategories')}
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const isActive = categoryFilter === cat;
                const label = lang === 'sv' ? cfg.labelSv : cfg.labelEn;
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(isActive ? null : cat)}
                    className={`px-2.5 py-1 rounded-lg border text-[10px] font-medium transition-colors ${
                      isActive
                        ? 'border-current'
                        : 'border-[var(--border)] text-[var(--text3)] hover:text-[var(--text2)]'
                    }`}
                    style={isActive ? { color: cfg.color, background: cfg.colorBg } : undefined}
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Sort */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-[var(--text3)]">{t('knowledge.sortBy')}:</span>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSortMode(opt.value)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                    sortMode === opt.value
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  {t(opt.labelKey)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 relative overflow-hidden">
        {view === 'map' ? (
          <div className="absolute inset-0">
            <KnowledgeMap
              notes={filteredNotes}
              enabledCategories={enabledCategories}
            />

            {/* Map category toggles */}
            <div className="absolute top-4 left-4 z-10 space-y-1">
              {ALL_CATEGORIES.map((cat) => {
                const cfg = CATEGORY_CONFIG[cat];
                const enabled = enabledCategories.has(cat);
                const label = lang === 'sv' ? cfg.labelSv : cfg.labelEn;
                return (
                  <button
                    key={cat}
                    onClick={() => toggleMapCategory(cat)}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-all ${
                      enabled
                        ? 'border border-current'
                        : 'border border-[var(--border)] text-[var(--text3)] opacity-50'
                    }`}
                    style={
                      enabled
                        ? { color: cfg.color, background: cfg.colorBg }
                        : { background: 'var(--surface)' }
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-5">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 rounded-xl bg-[var(--bg2)] animate-pulse border border-[var(--border)]" />
                ))}
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <MessageSquareQuote size={40} className="text-[var(--text3)] mb-3" />
                <p className="text-sm text-[var(--text2)] mb-1">{t('knowledge.noResults')}</p>
                <p className="text-xs text-[var(--text3)]">{t('knowledge.noResultsHint')}</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-2xl">
                {filteredNotes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAB — Record Knowledge */}
        <button
          onClick={() => setRecordOpen(true)}
          className="absolute bottom-6 right-6 z-20 flex items-center gap-2 px-5 py-3 rounded-full bg-[var(--green)] text-forest-950 shadow-lg shadow-[var(--green)]/20 hover:bg-[var(--green2)] transition-colors text-sm font-semibold"
        >
          <Plus size={18} />
          {t('knowledge.recordKnowledge')}
        </button>
      </div>

      {/* Record modal */}
      <RecordNote
        isOpen={recordOpen}
        onClose={() => setRecordOpen(false)}
        onSave={addNote}
        getCurrentLocation={getCurrentLocation}
      />
    </div>
  );
}

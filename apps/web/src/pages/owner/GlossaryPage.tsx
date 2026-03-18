import { useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { BookA, Search, X, Filter } from 'lucide-react';
import { useGlossary } from '@/hooks/useGlossary';
import { GlossaryTermCard } from '@/components/glossary/GlossaryTermCard';
import { CATEGORY_COLORS, type GlossaryCategory } from '@/data/forestryGlossaryData';

const ALL_CATEGORIES: GlossaryCategory[] = [
  'general',
  'tree_species',
  'operations',
  'legal',
  'pests_disease',
  'measurement',
];

const CATEGORY_LABELS: Record<GlossaryCategory, { sv: string; en: string }> = {
  general: { sv: 'Allmänt', en: 'General' },
  tree_species: { sv: 'Trädslag', en: 'Tree Species' },
  operations: { sv: 'Åtgärder', en: 'Operations' },
  legal: { sv: 'Juridik & Regler', en: 'Legal & Regulatory' },
  pests_disease: { sv: 'Skador & Sjukdomar', en: 'Pests & Disease' },
  measurement: { sv: 'Mätning', en: 'Measurement' },
};

/**
 * GlossaryPage — Searchable A-Z glossary of Swedish forestry terms.
 *
 * Route: /owner/glossary
 */
export default function GlossaryPage() {
  const { i18n, t } = useTranslation();
  const lang = i18n.language === 'sv' ? 'sv' : 'en';
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    activeCategories,
    toggleCategory,
    clearCategories,
    filteredTerms,
    lookupTerm: _lookupTerm,
    alphabet,
    groupedTerms,
  } = useGlossary();

  const scrollToLetter = useCallback((letter: string) => {
    const el = document.getElementById(`letter-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  const scrollToTerm = useCallback((termId: string) => {
    const el = document.getElementById(`term-${termId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Brief highlight
      el.classList.add('ring-2', 'ring-[var(--green)]');
      setTimeout(() => el.classList.remove('ring-2', 'ring-[var(--green)]'), 2000);
    }
  }, []);

  return (
    <div className="flex h-full">
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="max-w-3xl mx-auto p-5">
          {/* Header */}
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: '#4ade8015', color: '#4ade80' }}
            >
              <BookA size={18} />
            </div>
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {lang === 'sv' ? 'Skogsordlista' : 'Forestry Glossary'}
              </h1>
              <p className="text-xs text-[var(--text3)]">
                {lang === 'sv'
                  ? 'Sök och lär dig viktiga skogsbruksbegrepp'
                  : 'Search and learn key forestry terminology'}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative mt-5 mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'sv'
                  ? 'Sök term, t.ex. "gallring" eller "bark beetle"...'
                  : 'Search terms, e.g. "thinning" or "gallring"...'
              }
              className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)]
                text-sm text-[var(--text)] placeholder:text-[var(--text3)]
                focus:outline-none focus:ring-2 focus:ring-[var(--green)]/30 focus:border-[var(--green)]/50
                transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text3)] hover:text-[var(--text)] transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Category filters */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-2">
              <Filter size={12} className="text-[var(--text3)]" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)]">
                {lang === 'sv' ? 'Kategorier' : 'Categories'}
              </span>
              {activeCategories.length > 0 && (
                <button
                  onClick={clearCategories}
                  className="text-[10px] font-medium text-[var(--green)] hover:text-[var(--green)]/80 ml-auto transition-colors"
                >
                  {lang === 'sv' ? 'Rensa filter' : 'Clear filters'}
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_CATEGORIES.map((cat) => {
                const isActive = activeCategories.includes(cat);
                const color = CATEGORY_COLORS[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150"
                    style={{
                      color: isActive ? color : 'var(--text3)',
                      background: isActive ? `${color}15` : 'var(--bg3)',
                      border: `1px solid ${isActive ? `${color}40` : 'var(--border)'}`,
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full mr-2 shrink-0"
                      style={{ background: color }}
                    />
                    {CATEGORY_LABELS[cat][lang]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Alphabetical jump nav */}
          {alphabet.length > 0 && !searchQuery && (
            <div className="flex flex-wrap gap-1 mb-5 pb-4 border-b border-[var(--border)]">
              {alphabet.map((letter) => (
                <button
                  key={letter}
                  onClick={() => scrollToLetter(letter)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold
                    text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--green)]/10
                    border border-transparent hover:border-[var(--green)]/20 transition-all"
                >
                  {letter}
                </button>
              ))}
            </div>
          )}

          {/* Results count */}
          <p className="text-xs text-[var(--text3)] mb-4">
            {lang === 'sv'
              ? `${filteredTerms.length} begrepp`
              : `${filteredTerms.length} terms`}
            {activeCategories.length > 0 &&
              ` (${lang === 'sv' ? 'filtrerade' : 'filtered'})`}
          </p>

          {/* Term list, grouped by letter */}
          {filteredTerms.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[var(--text3)]">
                {t('common.noResults')}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {alphabet.map((letter) => (
                <div key={letter} id={`letter-${letter}`}>
                  <div className="sticky top-0 z-10 flex items-center gap-3 py-2 mb-3 bg-[var(--bg)]/80 backdrop-blur-sm">
                    <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-[var(--green)] bg-[var(--green)]/10 border border-[var(--green)]/20">
                      {letter}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[10px] font-mono text-[var(--text3)]">
                      {groupedTerms[letter].length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {groupedTerms[letter].map((term) => (
                      <GlossaryTermCard
                        key={term.id}
                        term={term}
                        onRelatedClick={scrollToTerm}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Bottom spacer */}
          <div className="h-16" />
        </div>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';
import type { GlossaryTerm, GlossaryCategory } from '@/data/forestryGlossaryData';
import { CATEGORY_COLORS } from '@/data/forestryGlossaryData';

interface GlossaryTermCardProps {
  term: GlossaryTerm;
  /** Called when a related term is clicked */
  onRelatedClick?: (termId: string) => void;
}

const CATEGORY_I18N: Record<GlossaryCategory, { sv: string; en: string }> = {
  general: { sv: 'Allmänt', en: 'General' },
  tree_species: { sv: 'Trädslag', en: 'Tree Species' },
  operations: { sv: 'Åtgärder', en: 'Operations' },
  legal: { sv: 'Juridik & Regler', en: 'Legal & Regulatory' },
  pests_disease: { sv: 'Skador & Sjukdomar', en: 'Pests & Disease' },
  measurement: { sv: 'Mätning', en: 'Measurement' },
};

export function GlossaryTermCard({ term, onRelatedClick }: GlossaryTermCardProps) {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'sv' ? 'sv' : 'en';
  const catColor = CATEGORY_COLORS[term.category];
  const catLabel = CATEGORY_I18N[term.category][lang];

  return (
    <div
      id={`term-${term.id}`}
      className="group rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 transition-all duration-200 hover:border-[var(--border2)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-serif font-bold text-[var(--text)] leading-tight">
            {term.term_sv}
          </h3>
          <p className="text-sm text-[var(--green)] mt-0.5 font-medium">
            {term.term_en}
          </p>
        </div>
        <span
          className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider"
          style={{
            color: catColor,
            background: `${catColor}15`,
            border: `1px solid ${catColor}30`,
          }}
        >
          {catLabel}
        </span>
      </div>

      {/* Definition */}
      <p className="text-sm text-[var(--text2)] leading-relaxed mb-3">
        {lang === 'sv' ? term.definition_sv : term.definition_en}
      </p>

      {/* Example */}
      <div className="rounded-lg bg-[var(--bg3)] border border-[var(--border)] px-4 py-3 mb-3">
        <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mb-1">
          {lang === 'sv' ? 'Exempel' : 'Example'}
        </p>
        <p className="text-sm text-[var(--text2)] italic leading-relaxed">
          &ldquo;{lang === 'sv' ? term.example_sv : term.example_en}&rdquo;
        </p>
      </div>

      {/* Related terms */}
      {term.related_terms.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text3)] mr-1">
            {lang === 'sv' ? 'Relaterat' : 'Related'}
          </span>
          {term.related_terms.map((relId) => (
            <button
              key={relId}
              onClick={() => onRelatedClick?.(relId)}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium
                text-[var(--green)] bg-[var(--green)]/5 border border-[var(--green)]/15
                hover:bg-[var(--green)]/10 hover:border-[var(--green)]/30 transition-colors cursor-pointer"
            >
              <ArrowRight size={10} />
              {relId}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

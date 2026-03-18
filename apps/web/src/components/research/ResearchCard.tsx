import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import type { ResearchSource, SourceCategory } from '@/hooks/useResearchSources';

// ─── Category styling ───

const CATEGORY_STYLES: Record<SourceCategory, { bg: string; text: string; label_en: string; label_sv: string }> = {
  research_papers: { bg: 'bg-blue-500/15', text: 'text-blue-400', label_en: 'Research Paper', label_sv: 'Forskningsartikel' },
  open_datasets: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', label_en: 'Open Dataset', label_sv: 'Öppet dataset' },
  satellite_platforms: { bg: 'bg-purple-500/15', text: 'text-purple-400', label_en: 'Satellite Platform', label_sv: 'Satellitplattform' },
  regulatory_documents: { bg: 'bg-amber-500/15', text: 'text-amber-400', label_en: 'Regulation', label_sv: 'Regelverk' },
  technology_references: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', label_en: 'Technology', label_sv: 'Teknikreferens' },
  app_references: { bg: 'bg-pink-500/15', text: 'text-pink-400', label_en: 'App Reference', label_sv: 'Appreferens' },
};

export function getCategoryStyle(category: SourceCategory) {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.research_papers;
}

interface ResearchCardProps {
  source: ResearchSource;
  onSelect: (source: ResearchSource) => void;
  onAskAI: (source: ResearchSource) => void;
}

export function ResearchCard({ source, onSelect, onAskAI }: ResearchCardProps) {
  const { t, i18n } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const style = getCategoryStyle(source.category);
  const lang = i18n.language;

  const descriptionLimit = 180;
  const isLong = source.description.length > descriptionLimit;
  const displayDescription = expanded
    ? source.description
    : source.description.slice(0, descriptionLimit) + (isLong ? '...' : '');

  const authorsDisplay = source.authors.length > 0
    ? source.authors.join(', ')
    : source.source ?? source.institution ?? '';

  return (
    <div
      className="group rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 transition-all duration-200 hover:border-[var(--border2)] hover:shadow-lg hover:shadow-black/20 hover:-translate-y-0.5 cursor-pointer"
      onClick={() => onSelect(source)}
    >
      {/* Header: category badge + year */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
        >
          {lang === 'sv' ? style.label_sv : style.label_en}
        </span>
        {source.year && (
          <span className="text-xs text-[var(--text3)] font-mono tabular-nums flex-shrink-0">
            {source.year}
          </span>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-[var(--text)] leading-snug mb-1.5 line-clamp-2 group-hover:text-[var(--green)] transition-colors">
        {source.url ? (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="hover:underline inline-flex items-center gap-1"
          >
            {source.title}
            <ExternalLink size={12} className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0" />
          </a>
        ) : (
          source.title
        )}
      </h3>

      {/* Authors / source */}
      {authorsDisplay && (
        <p className="text-xs text-[var(--text3)] mb-2 truncate">
          {authorsDisplay}
          {source.journal ? ` — ${source.journal}` : ''}
        </p>
      )}

      {/* Description */}
      <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
        {displayDescription}
        {isLong && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="inline-flex items-center gap-0.5 ml-1 text-[var(--green)] hover:underline font-medium"
          >
            {expanded ? (
              <>
                {lang === 'sv' ? 'Visa mindre' : 'Show less'}
                <ChevronUp size={12} />
              </>
            ) : (
              <>
                {lang === 'sv' ? 'Läs mer' : 'Read more'}
                <ChevronDown size={12} />
              </>
            )}
          </button>
        )}
      </p>

      {/* Topic tags */}
      {source.topicTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {source.topicTags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)]"
            >
              {tag.replace(/_/g, ' ')}
            </span>
          ))}
          {source.topicTags.length > 5 && (
            <span className="text-[10px] text-[var(--text3)]">
              +{source.topicTags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Ask AI button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onAskAI(source);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/10 transition-colors"
      >
        <Sparkles size={12} />
        {t('research.askAi')}
      </button>
    </div>
  );
}

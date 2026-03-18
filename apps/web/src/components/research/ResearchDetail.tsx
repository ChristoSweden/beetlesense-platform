import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  ExternalLink,
  Sparkles,
  BookOpen,
  Calendar,
  Building2,
  Globe,
  Tag,
} from 'lucide-react';
import type { ResearchSource } from '@/hooks/useResearchSources';
import { getCategoryStyle } from './ResearchCard';
import { ResearchCard } from './ResearchCard';

interface ResearchDetailProps {
  source: ResearchSource;
  relatedSources: ResearchSource[];
  onClose: () => void;
  onAskAI: (source: ResearchSource) => void;
  onSelectRelated: (source: ResearchSource) => void;
}

export function ResearchDetail({
  source,
  relatedSources,
  onClose,
  onAskAI,
  onSelectRelated,
}: ResearchDetailProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const style = getCategoryStyle(source.category);
  const [showAIExplanation, setShowAIExplanation] = useState(false);

  // AI explanation placeholder (would call companion-chat edge function in production)
  const aiExplanation =
    lang === 'sv'
      ? `Denna forskning informerar BeetleSense genom att tillhandahålla vetenskaplig grund för plattformens detektions- och riskbedömningsalgoritmer. Specifikt bidrar den till: datavalidering av sensoravläsningar, kalibrering av AI-modeller för skogshälsobedömning, och evidensbaserade rekommendationer till skogsägare.`
      : `This research informs BeetleSense by providing the scientific foundation for the platform's detection and risk assessment algorithms. Specifically, it contributes to: data validation of sensor readings, calibration of AI models for forest health assessment, and evidence-based recommendations to forest owners.`;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div className="relative w-full max-w-lg h-full overflow-y-auto bg-[var(--bg)] border-l border-[var(--border)] shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
        >
          <X size={18} />
        </button>

        <div className="p-6 space-y-6">
          {/* Category badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
            >
              {lang === 'sv' ? style.label_sv : style.label_en}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-lg font-serif font-bold text-[var(--text)] leading-tight">
            {source.title}
          </h2>

          {/* Metadata grid */}
          <div className="grid grid-cols-1 gap-3">
            {source.authors.length > 0 && (
              <MetadataRow
                icon={<BookOpen size={14} />}
                label={lang === 'sv' ? 'Författare' : 'Authors'}
                value={source.authors.join(', ')}
              />
            )}
            {source.institution && (
              <MetadataRow
                icon={<Building2 size={14} />}
                label={lang === 'sv' ? 'Institution' : 'Institution'}
                value={source.institution}
              />
            )}
            {source.journal && (
              <MetadataRow
                icon={<BookOpen size={14} />}
                label={lang === 'sv' ? 'Tidskrift' : 'Journal'}
                value={source.journal}
              />
            )}
            {source.year && (
              <MetadataRow
                icon={<Calendar size={14} />}
                label={lang === 'sv' ? 'År' : 'Year'}
                value={String(source.year)}
              />
            )}
            {source.jurisdiction && (
              <MetadataRow
                icon={<Globe size={14} />}
                label={lang === 'sv' ? 'Jurisdiktion' : 'Jurisdiction'}
                value={source.jurisdiction}
              />
            )}
          </div>

          {/* Full description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)] mb-2">
              {lang === 'sv' ? 'Sammanfattning' : 'Abstract'}
            </h3>
            <p className="text-sm text-[var(--text2)] leading-relaxed">
              {source.description}
            </p>
          </div>

          {/* Topic tags */}
          {source.topicTags.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)] mb-2 flex items-center gap-1.5">
                <Tag size={12} />
                {lang === 'sv' ? 'Ämnesord' : 'Topics'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {source.topicTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)]"
                  >
                    {tag.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* AI explanation */}
          <div className="rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5 p-4">
            <button
              onClick={() => setShowAIExplanation(!showAIExplanation)}
              className="flex items-center gap-2 text-sm font-medium text-[var(--green)] w-full"
            >
              <Sparkles size={16} />
              {lang === 'sv'
                ? 'Hur denna forskning informerar BeetleSense'
                : 'How this research informs BeetleSense'}
            </button>
            {showAIExplanation && (
              <p className="mt-3 text-xs text-[var(--text2)] leading-relaxed">
                {aiExplanation}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-[var(--bg3)] text-[var(--text)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
              >
                <ExternalLink size={14} />
                {lang === 'sv' ? 'Öppna originalkälla' : 'Open original source'}
              </a>
            )}
            <button
              onClick={() => onAskAI(source)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/10 transition-colors"
            >
              <Sparkles size={14} />
              {t('research.askAi')}
            </button>
          </div>

          {/* Related sources */}
          {relatedSources.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text3)] mb-3">
                {t('research.related')}
              </h3>
              <div className="space-y-3">
                {relatedSources.slice(0, 3).map((related) => (
                  <ResearchCard
                    key={related.id}
                    source={related}
                    onSelect={onSelectRelated}
                    onAskAI={onAskAI}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Helper ───

function MetadataRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-[var(--text3)] mt-0.5 flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-[var(--text3)] font-semibold block">
          {label}
        </span>
        <span className="text-sm text-[var(--text2)]">{value}</span>
      </div>
    </div>
  );
}

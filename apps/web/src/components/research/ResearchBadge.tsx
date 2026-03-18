import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react';
import type { ResearchSource } from '@/hooks/useResearchSources';
import { getCategoryStyle } from './ResearchCard';

interface ResearchBadgeProps {
  /** The sources that back this insight */
  sources: ResearchSource[];
  /** Optional classname override */
  className?: string;
}

/**
 * ResearchBadge — inline badge showing "Based on X research sources"
 * with an expandable citation list on click.
 *
 * Reusable on any insight, report section, or AI Companion response.
 */
export function ResearchBadge({ sources, className = '' }: ResearchBadgeProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  if (sources.length === 0) return null;

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      {/* Badge trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-[var(--green)]/8 text-[var(--green)] border border-[var(--green)]/15 hover:bg-[var(--green)]/15 transition-colors"
      >
        <BookOpen size={12} />
        {t('research.basedOn', { count: sources.length })}
        <ChevronDown
          size={11}
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded citation list */}
      {open && (
        <div className="absolute z-50 mt-1.5 left-0 w-80 max-h-80 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--bg2)] shadow-xl shadow-black/30 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="p-3 space-y-2">
            {sources.map((source) => {
              const style = getCategoryStyle(source.category);
              return (
                <div
                  key={source.id}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg)] p-2.5 hover:border-[var(--border2)] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider ${style.bg} ${style.text}`}
                    >
                      {style.label_en}
                    </span>
                    {source.year && (
                      <span className="text-[10px] text-[var(--text3)] font-mono">
                        {source.year}
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-medium text-[var(--text)] leading-snug mb-0.5">
                    {source.url ? (
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-[var(--green)] hover:underline inline-flex items-center gap-1"
                      >
                        {source.title}
                        <ExternalLink size={10} className="opacity-50 flex-shrink-0" />
                      </a>
                    ) : (
                      source.title
                    )}
                  </p>
                  {source.authors.length > 0 && (
                    <p className="text-[10px] text-[var(--text3)] truncate">
                      {source.authors.join(', ')}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

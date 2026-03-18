import { useState, type ReactNode } from 'react';
import { useExpertise, type ExpertiseLevel } from '@/contexts/ExpertiseContext';

/* ─── Types ─── */
export interface ReadingGuideStep {
  /** Short label for the annotation */
  label: string;
  /** Explanation text */
  description: string;
}

export interface WhatDoesThisMeanProps {
  /** Explanations per expertise level */
  explanations: {
    beginner: string;
    intermediate: string;
    expert: string;
  };
  /** Visual reading guide steps ("Sa har laser du denna graf") */
  readingGuide?: ReadingGuideStep[];
  /** Academy lesson link (relative path like "/owner/academy/ndvi-101") */
  academyLink?: string;
  /** Academy lesson title */
  academyTitle?: string;
  /** Override expertise level */
  expertiseLevel?: ExpertiseLevel;
  /** Custom title (default: "Vad betyder detta?") */
  title?: string;
  /** Render custom content below the explanation */
  children?: ReactNode;
  className?: string;
}

export function WhatDoesThisMean({
  explanations,
  readingGuide,
  academyLink,
  academyTitle,
  expertiseLevel,
  title = 'Vad betyder detta?',
  children,
  className = '',
}: WhatDoesThisMeanProps) {
  const { level: contextLevel } = useExpertise();
  const level = expertiseLevel ?? contextLevel;
  const [isExpanded, setIsExpanded] = useState(false);

  const explanationText = explanations[level];

  return (
    <div
      className={`rounded-lg border border-[var(--border)] transition-colors ${
        isExpanded ? 'bg-[var(--bg2)] border-[var(--border2)]' : 'bg-transparent hover:bg-[var(--bg2)]/50'
      } ${className}`}
    >
      {/* Collapsed trigger */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
        aria-expanded={isExpanded}
      >
        <svg
          className={`h-4 w-4 flex-shrink-0 text-[var(--green-dim)] transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-xs text-[var(--text3)] transition-colors group-hover:text-[var(--text2)]">
          {title}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--border)] px-3 pb-3 pt-2 space-y-3">
          {/* Main explanation */}
          <p className="text-sm leading-relaxed text-[var(--text2)]">{explanationText}</p>

          {/* Reading guide */}
          {readingGuide && readingGuide.length > 0 && (
            <div className="rounded-md bg-[var(--bg3)] p-2.5">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-[var(--text3)]">
                Sa har laser du denna graf
              </p>
              <ol className="space-y-1.5">
                {readingGuide.map((step, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[var(--green)]/15 text-[10px] font-bold text-[var(--green)]">
                      {i + 1}
                    </span>
                    <div className="flex-1">
                      <span className="text-xs font-medium text-[var(--text)]">
                        {step.label}
                      </span>
                      <span className="text-xs text-[var(--text3)]">
                        {' '}\u2014 {step.description}
                      </span>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Custom content */}
          {children}

          {/* Academy link */}
          {academyLink && (
            <a
              href={academyLink}
              className="inline-flex items-center gap-1.5 rounded-md bg-[var(--green)]/10 px-2.5 py-1.5 text-xs font-medium text-[var(--green)] transition-colors hover:bg-[var(--green)]/20"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.331 0 4.486.89 6.096 2.354M12 6.042A8.967 8.967 0 0118 3.75c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18c-2.331 0-4.486.89-6.096 2.354M12 6.042V20.354" />
              </svg>
              Lar dig mer: {academyTitle ?? 'Akademi'}
            </a>
          )}
        </div>
      )}
    </div>
  );
}

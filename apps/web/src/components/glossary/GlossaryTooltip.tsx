import { useState, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BookOpen } from 'lucide-react';
import { useGlossary } from '@/hooks/useGlossary';
import type { GlossaryTerm } from '@/data/forestryGlossaryData';

// ─── Tooltip Popup ───

interface TooltipPopupProps {
  term: GlossaryTerm;
  anchorRect: DOMRect | null;
  onClose: () => void;
}

function TooltipPopup({ term, anchorRect, onClose }: TooltipPopupProps) {
  const { i18n, t: _t } = useTranslation();
  const lang = i18n.language === 'sv' ? 'sv' : 'en';

  if (!anchorRect) return null;

  return (
    <>
      {/* Backdrop (invisible, catches outside clicks) */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Tooltip */}
      <div
        className="fixed z-50 w-72 rounded-xl border border-[var(--border2)] bg-[var(--bg2)] shadow-xl shadow-black/30 p-4 animate-in fade-in slide-in-from-bottom-1 duration-150"
        style={{
          left: Math.min(anchorRect.left, window.innerWidth - 300),
          top: anchorRect.bottom + 8,
        }}
      >
        <div className="mb-2">
          <p className="text-sm font-serif font-bold text-[var(--text)]">
            {term.term_sv}
          </p>
          <p className="text-xs text-[var(--green)] font-medium">
            {term.term_en}
          </p>
        </div>

        <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
          {lang === 'sv' ? term.definition_sv : term.definition_en}
        </p>

        <Link
          to={`/owner/glossary#term-${term.id}`}
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--green)] hover:text-[var(--green)]/80 transition-colors"
        >
          <BookOpen size={12} />
          {lang === 'sv' ? 'Se full definition' : 'See full definition'}
        </Link>
      </div>
    </>
  );
}

// ─── Term Span ───

interface TermSpanProps {
  text: string;
  term: GlossaryTerm;
}

function TermSpan({ text, term }: TermSpanProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  const handleClick = useCallback(() => {
    setShowTooltip((v) => !v);
  }, []);

  const rect = showTooltip && ref.current ? ref.current.getBoundingClientRect() : null;

  return (
    <>
      <span
        ref={ref}
        onClick={handleClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className="cursor-help border-b border-dotted border-[var(--green)]/40 text-[var(--text)] hover:border-[var(--green)] hover:text-[var(--green)] transition-colors"
        role="button"
        tabIndex={0}
        aria-label={`Glossary term: ${term.term_sv}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setShowTooltip((v) => !v);
          }
        }}
      >
        {text}
      </span>
      {showTooltip && rect && (
        <TooltipPopup
          term={term}
          anchorRect={rect}
          onClose={() => setShowTooltip(false)}
        />
      )}
    </>
  );
}

// ─── GlossaryTooltip ───

interface GlossaryTooltipProps {
  /** The text content to scan for glossary terms */
  children: string;
  /** Optional className for the wrapper */
  className?: string;
}

/**
 * GlossaryTooltip — wraps a text string and auto-detects glossary terms.
 * Detected terms are rendered with a dotted underline; hovering or tapping
 * shows a tooltip with the definition and a link to the full glossary entry.
 *
 * Usage:
 *   <GlossaryTooltip>
 *     Granbarkborren har angripit beståndet efter senaste gallringen.
 *   </GlossaryTooltip>
 */
export function GlossaryTooltip({ children, className }: GlossaryTooltipProps) {
  const { detectTerms } = useGlossary();

  const segments = useMemo(() => {
    if (!children) return [{ type: 'text' as const, text: '' }];

    const detected = detectTerms(children);

    if (detected.length === 0) {
      return [{ type: 'text' as const, text: children }];
    }

    const parts: Array<
      | { type: 'text'; text: string }
      | { type: 'term'; text: string; term: GlossaryTerm }
    > = [];

    let cursor = 0;
    for (const d of detected) {
      if (d.start > cursor) {
        parts.push({ type: 'text', text: children.slice(cursor, d.start) });
      }
      parts.push({
        type: 'term',
        text: children.slice(d.start, d.end),
        term: d.term,
      });
      cursor = d.end;
    }
    if (cursor < children.length) {
      parts.push({ type: 'text', text: children.slice(cursor) });
    }

    return parts;
  }, [children, detectTerms]);

  return (
    <span className={className}>
      {segments.map((seg, i) =>
        seg.type === 'text' ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <TermSpan key={i} text={seg.text} term={seg.term} />
        ),
      )}
    </span>
  );
}

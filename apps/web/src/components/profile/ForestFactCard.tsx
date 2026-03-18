import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

interface ForestFactCardProps {
  icon: ReactNode;
  iconColor?: string;
  title: string;
  description: string;
  children?: ReactNode;
  expandedContent?: ReactNode;
  didYouKnow?: string;
  companionPrompt?: string;
}

export function ForestFactCard({
  icon,
  iconColor = 'var(--green)',
  title,
  description,
  children,
  expandedContent,
  didYouKnow,
  companionPrompt,
}: ForestFactCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `color-mix(in srgb, ${iconColor} 12%, transparent)`, color: iconColor }}
          >
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-[var(--text)] mb-1">{title}</h3>
            <p className="text-xs leading-relaxed text-[var(--text2)]">{description}</p>
          </div>
        </div>

        {/* Data visualization / content slot */}
        {children && <div className="mt-4">{children}</div>}

        {/* Did you know? */}
        {didYouKnow && (
          <div
            className="mt-4 flex items-start gap-2.5 p-3 rounded-lg border border-[var(--border)]"
            style={{ background: 'color-mix(in srgb, var(--amber) 6%, transparent)' }}
          >
            <Lightbulb size={14} className="text-[var(--amber)] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] leading-relaxed text-[var(--text2)]">
              <span className="font-semibold text-[var(--amber)]">{t('forestProfile.didYouKnow')}</span>{' '}
              {didYouKnow}
            </p>
          </div>
        )}
      </div>

      {/* Expandable section */}
      {expandedContent && (
        <>
          {expanded && (
            <div className="px-5 pb-4 border-t border-[var(--border)] pt-4">
              {expandedContent}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 border-t border-[var(--border)] text-[11px] font-medium text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
          >
            {expanded ? (
              <>
                {t('forestProfile.showLess')} <ChevronUp size={12} />
              </>
            ) : (
              <>
                {t('forestProfile.showMore')} <ChevronDown size={12} />
              </>
            )}
          </button>
        </>
      )}

      {/* Learn more link */}
      {companionPrompt && (
        <Link
          to="/owner/vision"
          state={{ prompt: companionPrompt }}
          className="flex items-center justify-center gap-1.5 w-full py-2.5 border-t border-[var(--border)] text-[11px] font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
        >
          <Sparkles size={12} />
          {t('forestProfile.learnMore')}
        </Link>
      )}
    </div>
  );
}

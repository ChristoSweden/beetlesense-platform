import { useState } from 'react';
import { ShieldCheck, X, Info } from 'lucide-react';

/**
 * FiduciaryBadge — trust indicator showing the AI advisor works solely
 * in the forest owner's interest. Key differentiator vs Södra/SCA.
 *
 * Displays a small banner with a tooltip explaining:
 * - No affiliate commissions
 * - No buyer partnerships
 * - Transparent recommendation methodology
 */

interface FiduciaryBadgeProps {
  /** 'banner' shows full-width strip, 'inline' shows compact pill */
  variant?: 'banner' | 'inline';
  lang?: 'sv' | 'en';
}

const CONTENT = {
  sv: {
    badge: 'AI Kompanjon arbetar enbart i ditt intresse',
    badgeShort: 'Fiduciär AI',
    tooltipTitle: 'Din oberoende rådgivare',
    tooltipPoints: [
      'Inga provisioner från virkesköpare',
      'Inga partnerskap med Södra, SCA eller andra uppköpare',
      'Alla rekommendationer baseras på din skogs bästa',
      'Transparent metodik — du ser alltid varför vi rekommenderar',
      'Vi tjänar pengar på prenumerationen, inte på dina affärer',
    ],
    learnMore: 'Läs mer om vår oberoendepolicy',
    close: 'Stäng',
  },
  en: {
    badge: 'AI Companion works solely in YOUR interest',
    badgeShort: 'Fiduciary AI',
    tooltipTitle: 'Your independent advisor',
    tooltipPoints: [
      'No commissions from timber buyers',
      'No partnerships with Södra, SCA, or other buyers',
      'All recommendations based on your forest\'s best interest',
      'Transparent methodology — you always see why we recommend',
      'We earn from subscriptions, not your deals',
    ],
    learnMore: 'Read more about our independence policy',
    close: 'Close',
  },
};

export function FiduciaryBadge({ variant = 'banner', lang = 'sv' }: FiduciaryBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const t = CONTENT[lang];

  if (variant === 'inline') {
    return (
      <div className="relative inline-flex">
        <button
          onClick={() => setShowTooltip(!showTooltip)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors border"
          style={{
            background: 'rgba(74, 222, 128, 0.08)',
            color: '#4ade80',
            borderColor: 'rgba(74, 222, 128, 0.2)',
          }}
          aria-label={t.tooltipTitle}
          aria-expanded={showTooltip}
        >
          <ShieldCheck size={12} />
          <span>{t.badgeShort}</span>
        </button>

        {showTooltip && (
          <FiduciaryTooltip t={t} onClose={() => setShowTooltip(false)} position="below" lang={lang} />
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowTooltip(!showTooltip)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all hover:border-[#4ade80]/40"
        style={{
          background: 'rgba(74, 222, 128, 0.06)',
          borderColor: 'rgba(74, 222, 128, 0.2)',
        }}
        aria-label={t.tooltipTitle}
        aria-expanded={showTooltip}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(74, 222, 128, 0.15)' }}
        >
          <ShieldCheck size={16} style={{ color: '#4ade80' }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-xs font-medium" style={{ color: '#4ade80' }}>
            {t.badge}
          </p>
          <p className="text-[10px] text-[var(--text3)] mt-0.5">
            {lang === 'sv'
              ? 'Klicka för att läsa mer om vårt oberoende'
              : 'Click to learn more about our independence'}
          </p>
        </div>
        <Info size={14} className="text-[var(--text3)] flex-shrink-0" />
      </button>

      {showTooltip && (
        <FiduciaryTooltip t={t} onClose={() => setShowTooltip(false)} position="below" lang={lang} />
      )}
    </div>
  );
}

function FiduciaryTooltip({
  t,
  onClose,
  position,
  lang: _lang = 'sv',
}: {
  t: (typeof CONTENT)['sv'];
  onClose: () => void;
  position: 'below' | 'above';
  lang?: 'sv' | 'en';
}) {
  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Tooltip */}
      <div
        className={`absolute z-50 w-80 rounded-xl border border-[var(--border)] shadow-2xl p-4 ${
          position === 'below' ? 'top-full mt-2' : 'bottom-full mb-2'
        } left-0`}
        style={{ background: 'var(--bg2)' }}
        role="tooltip"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} style={{ color: '#4ade80' }} />
            <h4 className="text-sm font-serif font-bold text-[var(--text)]">
              {t.tooltipTitle}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
            aria-label={t.close}
          >
            <X size={14} className="text-[var(--text3)]" />
          </button>
        </div>

        <ul className="space-y-2">
          {t.tooltipPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-2 text-[11px] text-[var(--text2)]">
              <span className="mt-0.5 flex-shrink-0" style={{ color: '#4ade80' }}>
                &#10003;
              </span>
              {point}
            </li>
          ))}
        </ul>

        <div className="mt-3 pt-3 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--text3)] italic">
            {(navigator.language || 'sv').startsWith('sv')
              ? 'BeetleSense har ingen ekonomisk relation med virkesköpare. Vår affärsmodell bygger uteslutande på prenumerationsavgifter från skogsägare.'
              : 'BeetleSense has no financial relationship with timber buyers. Our business model is based exclusively on subscription fees from forest owners.'}
          </p>
        </div>
      </div>
    </>
  );
}

// Re-export a minimal variant for use inside the companion chat panel header
export function FiduciaryInlineBadge({ lang = 'sv' }: { lang?: 'sv' | 'en' }) {
  return <FiduciaryBadge variant="inline" lang={lang} />;
}

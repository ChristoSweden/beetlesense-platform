import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSwarmingRiskDemo } from '@/services/swarmingProbabilityModel';

// ─── Types ───

interface ForestPostcardProps {
  onOpenCompanion: () => void;
}

type StatusTier = 'ok' | 'watch' | 'warning' | 'critical';

interface PostcardState {
  tier: StatusTier;
  headline: string;
  subtitle: string;
  bigNumber: string;
  bigNumberLabel: string;
  bigNumberSubtext: string;
  statusLabel: string;
  heroImage: string;
}

// ─── Constants & Dynamic Demo Values ───

const DEMO_PARCEL = 'Norra Skiftet';
const DEMO_EXPOSURE = 520_000;
const DEMO_DAYS_TO_ACT = 14;

/** Earnings grow with the day-of-year: 0 on Jan 1, ~287,000 by Dec 31 */
function getDemoAnnualEarnings(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear(), 11, 31);
  const totalDays = (endOfYear.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  const dayOfYear = (now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24);
  return Math.round((dayOfYear / totalDays) * 287_000);
}

/** Next visit is always "next Friday" from today */
function getDemoNextVisit(): string {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 5=Fri
  const daysUntilFriday = ((5 - dayOfWeek) + 7) % 7 || 7; // if today is Friday, show next Friday
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  return nextFriday.toISOString().slice(0, 10);
}

// ─── Hero Images by State ───

const HERO_IMAGES: Record<StatusTier, string> = {
  ok: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
  watch: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=80',
  warning: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1200&q=80',
  critical: 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1200&q=80',
};

const OVERLAY_CLASS: Record<StatusTier, string> = {
  ok: 'hero-overlay-ok',
  watch: 'hero-overlay-ok',
  warning: 'hero-overlay-warning',
  critical: 'hero-overlay-critical',
};

// ─── Helpers ───

function formatKr(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M kr`;
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(value) + ' kr';
}

function getTier(riskScore: number): StatusTier {
  if (riskScore > 70) return 'critical';
  if (riskScore > 50) return 'warning';
  if (riskScore > 30) return 'watch';
  return 'ok';
}

function buildState(riskScore: number, t: (key: string, defaultValue: string, options?: Record<string, string | number>) => string): PostcardState {
  const tier = getTier(riskScore);
  const earnings = getDemoAnnualEarnings();

  switch (tier) {
    case 'ok':
      return {
        tier,
        headline: t('postcard.ok.headline', 'Your forest is doing well.'),
        subtitle: t('postcard.ok.subtitle', 'Everything looks calm across your stands today.'),
        bigNumber: formatKr(earnings),
        bigNumberLabel: t('postcard.accumulatedValue', 'ACCUMULATED VALUE'),
        bigNumberSubtext: t('postcard.earnedThisYear', 'Earned this year'),
        statusLabel: t('postcard.lowRisk', 'Low risk'),
        heroImage: HERO_IMAGES.ok,
      };
    case 'watch':
      return {
        tier,
        headline: t('postcard.watch.headline', 'Keep an eye on things.'),
        subtitle: t('postcard.watch.subtitle', 'Elevated risk at {{parcel}} \u2014 we\u2019re watching.', { parcel: DEMO_PARCEL }),
        bigNumber: formatKr(earnings),
        bigNumberLabel: t('postcard.accumulatedValue', 'ACCUMULATED VALUE'),
        bigNumberSubtext: t('postcard.earnedThisYear', 'Earned this year'),
        statusLabel: t('postcard.watching', 'Watching'),
        heroImage: HERO_IMAGES.watch,
      };
    case 'warning':
      return {
        tier,
        headline: t('postcard.warning.headline', 'Your forest needs you.'),
        subtitle: t('postcard.warning.subtitle', 'Bark beetle risk rising at {{parcel}} \u2014 {{days}} days to act.', { parcel: DEMO_PARCEL, days: DEMO_DAYS_TO_ACT }),
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: t('postcard.atRisk', 'AT RISK'),
        bigNumberSubtext: t('postcard.actWithinDays', 'Act within {{days}} days', { days: DEMO_DAYS_TO_ACT }),
        statusLabel: t('postcard.warningLabel', 'Warning'),
        heroImage: HERO_IMAGES.warning,
      };
    case 'critical':
      return {
        tier,
        headline: t('postcard.critical.headline', 'Act now.'),
        subtitle: t('postcard.critical.subtitle', '{{amount}} of timber at risk in {{parcel}}.', { amount: formatKr(DEMO_EXPOSURE), parcel: DEMO_PARCEL }),
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: t('postcard.atRisk', 'AT RISK'),
        bigNumberSubtext: t('postcard.immediateAction', 'Immediate action required'),
        statusLabel: t('postcard.criticalLabel', 'Critical'),
        heroImage: HERO_IMAGES.critical,
      };
  }
}

// ─── Status Dot Colors ───

const STATUS_DOT: Record<StatusTier, string> = {
  ok: '#4ADE80',
  watch: '#fbbf24',
  warning: '#f97316',
  critical: '#ef4444',
};

const STATUS_SENTENCE_KEYS: Record<StatusTier, { key: string; fallback: string }> = {
  ok: { key: 'postcard.status.ok', fallback: 'Nothing urgent right now \u2014 your forest looks good.' },
  watch: { key: 'postcard.status.watch', fallback: 'We\u2019re keeping an eye on one thing, but nothing to worry about yet.' },
  warning: { key: 'postcard.status.warning', fallback: 'Part of your forest needs attention soon.' },
  critical: { key: 'postcard.status.critical', fallback: 'Something requires your action \u2014 read more below.' },
};

// ─── Component ───

export function ForestPostcard({ onOpenCompanion }: ForestPostcardProps) {
  const { t } = useTranslation();
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const state = useMemo(() => buildState(risk.overallScore, t), [risk.overallScore, t]);
  const [imageLoaded, setImageLoaded] = useState(false);

  const isCritical = state.tier === 'critical';
  const isWarning = state.tier === 'warning';

  return (
    <div className="flex flex-col items-stretch space-y-5">
      {/* ─── Hero Image Section ─── */}
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{ minHeight: '420px' }}
      >
        {/* Background image with Ken Burns effect */}
        <img
          src={state.heroImage}
          alt={t('postcard.heroAlt', 'Forest landscape')}
          onLoad={() => setImageLoaded(true)}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            animation: imageLoaded ? 'ken-burns 20s ease-in-out infinite alternate' : 'none',
          }}
        />

        {/* Gradient overlay — tinted by state */}
        <div className={`absolute inset-0 ${OVERLAY_CLASS[state.tier]} transition-all duration-700`} />

        {/* Hero content — centered text */}
        <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 pt-16 pb-24" style={{ minHeight: '420px' }}>
          <h1
            className={`text-white leading-tight mb-4 transition-all duration-500 ${
              isCritical ? 'text-6xl md:text-7xl font-bold' : isWarning ? 'text-5xl md:text-6xl font-bold' : 'text-4xl md:text-5xl'
            }`}
            style={{ fontFamily: "'DM Serif Display', serif", textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}
          >
            {state.headline}
          </h1>

          <p
            className="text-white/80 text-lg md:text-xl italic max-w-md"
            style={{ fontFamily: "'Cormorant Garamond', serif", textShadow: '0 1px 8px rgba(0,0,0,0.2)' }}
          >
            {state.subtitle}
          </p>
        </div>

        {/* Financial card — floating over bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 z-10">
          <div
            className={`rounded-xl p-5 text-center backdrop-blur-sm transition-all duration-300 ${
              isCritical ? 'bg-white/90 pulse-critical' : 'bg-white/90'
            }`}
            style={{
              boxShadow: '0 8px 32px -4px rgba(0, 0, 0, 0.15)',
            }}
          >
            <p
              className="text-[10px] uppercase tracking-widest text-[#707a70] mb-1"
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {state.bigNumberLabel}
            </p>
            <p
              className={`text-3xl font-bold ${isCritical ? 'text-red-600' : 'text-[#1A6B3C]'}`}
              style={{ fontFamily: "'DM Mono', monospace" }}
            >
              {state.bigNumber}
            </p>
            <p className="text-sm text-[#707a70] mt-0.5">
              {state.bigNumberSubtext}
            </p>
          </div>
        </div>
      </div>

      {/* ─── CTA Button ─── */}
      <button
        type="button"
        onClick={onOpenCompanion}
        className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
          isCritical
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-white text-[#1A6B3C] hover:bg-gray-50 border border-[#1A6B3C]/20'
        }`}
        style={{
          boxShadow: isCritical
            ? '0 4px 24px -2px rgba(239, 68, 68, 0.3)'
            : '0 4px 24px -2px rgba(26, 107, 60, 0.12)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v1m0 16v1m8.66-13.5l-.87.5M4.21 16l-.87.5M20.66 16l-.87-.5M4.21 8l-.87-.5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
        </svg>
        {isCritical ? t('postcard.getHelpNow', 'Get Help Now') : t('postcard.askTheForest', 'Ask the Forest')}
      </button>

      {/* AI disclaimer */}
      <p className="text-xs text-[#707a70] text-center">
        {t('postcard.aiDisclaimer', 'AI analysis based on latest satellite data')}
      </p>

      {/* ─── Status Bar ─── */}
      <div
        className="w-full rounded-2xl p-5 flex items-center gap-4 hover-lift-premium"
        style={{
          background: 'white',
          boxShadow: '0 4px 16px rgba(26, 46, 28, 0.06)',
        }}
      >
        <span
          className={`w-3.5 h-3.5 rounded-full shrink-0 ${
            isWarning ? 'pulse-warning' : isCritical ? 'pulse-critical' : ''
          }`}
          style={{ background: STATUS_DOT[state.tier] }}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text)]">
            {t(STATUS_SENTENCE_KEYS[state.tier].key, STATUS_SENTENCE_KEYS[state.tier].fallback)}
          </p>
          <p className="text-xs text-[#707a70] mt-0.5">
            {t('postcard.nextVisit', 'Next visit planned {{date}}', { date: getDemoNextVisit() })}
          </p>
        </div>
      </div>
    </div>
  );
}

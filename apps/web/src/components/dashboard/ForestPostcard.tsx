import { useMemo } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { getSwarmingRiskDemo } from '@/services/swarmingProbabilityModel';

// ─── Types ───

interface ForestPostcardProps {
  onOpenCompanion: () => void;
  onShowMore: () => void;
}

type StatusTier = 'ok' | 'watch' | 'warning' | 'critical';

interface PostcardState {
  tier: StatusTier;
  headlineSv: string;
  headlineEn: string;
  bigNumber: string;
  bigNumberLabel: string;
  bigNumberSubtext: string;
}

// ─── Constants ───

const DEMO_PARCEL = 'Norra Skiftet';
const DEMO_ANNUAL_EARNINGS = 287_000;
const DEMO_GROWTH_PCT = 3.2;
const DEMO_FOREST_VALUE = 3_500_000;
const DEMO_EXPOSURE = 520_000;
const DEMO_DAYS_TO_ACT = 14;

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

const TIER_STYLES: Record<StatusTier, { border: string; bg: string }> = {
  ok:       { border: '#4ade80', bg: 'rgba(74, 222, 128, 0.06)' },
  watch:    { border: '#fbbf24', bg: 'rgba(251, 191, 36, 0.06)' },
  warning:  { border: '#f97316', bg: 'rgba(249, 115, 22, 0.06)' },
  critical: { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.06)' },
};

function buildState(riskScore: number): PostcardState {
  const tier = getTier(riskScore);

  switch (tier) {
    case 'ok':
      return {
        tier,
        headlineSv: 'Din skog mar bra. Inget kraver din uppmarksamhet idag.',
        headlineEn: 'Your forest is doing well. Nothing needs your attention today.',
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'Din skog tjanade',
        bigNumberSubtext: `+${DEMO_GROWTH_PCT}% tillvaxt i ar`,
      };
    case 'watch':
      return {
        tier,
        headlineSv: `Hall koll \u2014 forhojd risk pa ${DEMO_PARCEL}. Vi bevakar.`,
        headlineEn: `Keep an eye \u2014 elevated risk on ${DEMO_PARCEL}. We're monitoring.`,
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'Din skog tjanade',
        bigNumberSubtext: `+${DEMO_GROWTH_PCT}% tillvaxt i ar`,
      };
    case 'warning':
      return {
        tier,
        headlineSv: `Barkborrerisk okar pa ${DEMO_PARCEL} \u2014 ${formatKr(DEMO_EXPOSURE)} exponerat, ${DEMO_DAYS_TO_ACT} dagar att agera.`,
        headlineEn: `Beetle risk rising on ${DEMO_PARCEL} \u2014 ${formatKr(DEMO_EXPOSURE)} exposed, ${DEMO_DAYS_TO_ACT} days to act.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'i riskzonen',
        bigNumberSubtext: `Agera inom ${DEMO_DAYS_TO_ACT} dagar`,
      };
    case 'critical':
      return {
        tier,
        headlineSv: `Agera nu: ${formatKr(DEMO_EXPOSURE)} virke i riskzon pa ${DEMO_PARCEL}.`,
        headlineEn: `Act now: ${formatKr(DEMO_EXPOSURE)} timber at risk on ${DEMO_PARCEL}.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'i riskzonen',
        bigNumberSubtext: 'Omedelbar atgard kravs',
      };
  }
}

// ─── Component ───

export function ForestPostcard({ onOpenCompanion, onShowMore }: ForestPostcardProps) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const state = useMemo(() => buildState(risk.overallScore), [risk.overallScore]);
  const style = TIER_STYLES[state.tier];

  return (
    <div
      className="flex flex-col items-center justify-center h-full px-6 py-8"
      style={{ minHeight: '100%' }}
    >
      {/* ── Headline ── */}
      <div
        className="w-full rounded-xl p-5"
        style={{
          borderLeft: `4px solid ${style.border}`,
          background: style.bg,
        }}
      >
        <p
          className="text-lg leading-relaxed text-[var(--text)]"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          {state.headlineSv}
        </p>
        <p className="text-sm text-[var(--text3)] mt-2 leading-relaxed">
          {state.headlineEn}
        </p>
      </div>

      {/* ── Big Number ── */}
      <div className="mt-8 text-center">
        <p className="text-sm text-[var(--text3)] mb-1">{state.bigNumberLabel}</p>
        <p
          className="text-3xl font-bold font-mono tabular-nums"
          style={{
            color: state.tier === 'ok' || state.tier === 'watch'
              ? 'var(--text)'
              : style.border,
          }}
        >
          {state.bigNumber}
        </p>
        <p
          className="text-sm mt-1"
          style={{
            color: state.tier === 'ok' || state.tier === 'watch'
              ? '#4ade80'
              : style.border,
          }}
        >
          {state.bigNumberSubtext}
        </p>
      </div>

      {/* ── CTA Button ── */}
      <div className="mt-10 w-full max-w-xs mx-auto">
        <button
          type="button"
          onClick={onOpenCompanion}
          className="w-full flex items-center justify-center gap-2 bg-[var(--green)] text-white rounded-xl px-6 py-3 text-sm font-semibold transition-opacity hover:opacity-90 active:opacity-80"
        >
          <Sparkles size={16} aria-hidden="true" />
          Fraga skogen
        </button>
        <button
          type="button"
          onClick={onShowMore}
          className="w-full flex items-center justify-center gap-1 mt-3 text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
        >
          <ChevronDown size={14} aria-hidden="true" />
          <span>eller svep nedat for mer</span>
        </button>
      </div>
    </div>
  );
}

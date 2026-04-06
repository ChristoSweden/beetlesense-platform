import { useMemo } from 'react';
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
}

// ─── Constants ───

const DEMO_PARCEL = 'Norra Skiftet';
const DEMO_ANNUAL_EARNINGS = 287_000;
const DEMO_EXPOSURE = 520_000;
const DEMO_DAYS_TO_ACT = 14;
const DEMO_NEXT_VISIT = '2026-04-18';

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

function buildState(riskScore: number): PostcardState {
  const tier = getTier(riskScore);

  switch (tier) {
    case 'ok':
      return {
        tier,
        headline: 'Your forest is doing well.',
        subtitle: 'Everything looks calm across your stands today.',
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'ACCUMULATED VALUE',
        bigNumberSubtext: 'Earned this year',
        statusLabel: 'Low risk',
      };
    case 'watch':
      return {
        tier,
        headline: 'Keep an eye on things.',
        subtitle: `Elevated risk at ${DEMO_PARCEL} \u2014 we\u2019re watching.`,
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'ACCUMULATED VALUE',
        bigNumberSubtext: 'Earned this year',
        statusLabel: 'Watching',
      };
    case 'warning':
      return {
        tier,
        headline: 'Your forest needs you.',
        subtitle: `Bark beetle risk rising at ${DEMO_PARCEL} \u2014 ${DEMO_DAYS_TO_ACT} days to act.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'AT RISK',
        bigNumberSubtext: `Act within ${DEMO_DAYS_TO_ACT} days`,
        statusLabel: 'Warning',
      };
    case 'critical':
      return {
        tier,
        headline: 'Act now.',
        subtitle: `${formatKr(DEMO_EXPOSURE)} of timber at risk in ${DEMO_PARCEL}.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'AT RISK',
        bigNumberSubtext: 'Immediate action required',
        statusLabel: 'Critical',
      };
  }
}

// ─── Forest Treeline SVG ───

function ForestTreeline() {
  return (
    <div className="w-full rounded-xl bg-[#f3f4f1] p-6 overflow-hidden">
      <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <path
          d="M0 120 L0 80 Q50 40 100 65 Q150 30 200 55 Q250 25 300 50 Q350 35 400 60 L400 120 Z"
          fill="#1A6B3C"
          fillOpacity="0.2"
        />
        <path
          d="M0 120 L0 90 Q40 60 80 78 Q120 50 160 70 Q200 45 240 65 Q280 42 320 62 Q360 50 400 72 L400 120 Z"
          fill="#1A6B3C"
          fillOpacity="0.4"
        />
        <path
          d="M0 120 L0 100 Q30 82 60 92 Q90 75 120 88 Q150 70 180 85 Q210 72 240 82 Q270 68 300 80 Q330 72 360 85 Q380 78 400 88 L400 120 Z"
          fill="#1A6B3C"
          fillOpacity="1"
        />
      </svg>
    </div>
  );
}

// ─── Status Dot Colors ───

const STATUS_DOT: Record<StatusTier, string> = {
  ok: '#4ADE80',
  watch: '#fbbf24',
  warning: '#f97316',
  critical: '#ef4444',
};

const STATUS_SENTENCE: Record<StatusTier, string> = {
  ok: 'Nothing urgent right now \u2014 your forest looks good.',
  watch: 'We\u2019re keeping an eye on one thing, but nothing to worry about yet.',
  warning: 'Part of your forest needs attention soon.',
  critical: 'Something requires your action \u2014 read more below.',
};

// ─── Component ───

export function ForestPostcard({ onOpenCompanion }: ForestPostcardProps) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const state = useMemo(() => buildState(risk.overallScore), [risk.overallScore]);

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto py-12 px-4 space-y-8">
      {/* Serif headline */}
      <h1
        className="text-5xl md:text-6xl text-center text-[var(--text)] leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        {state.headline}
      </h1>

      {/* Italic subtitle */}
      <p
        className="text-xl italic text-[#404940] text-center"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {state.subtitle}
      </p>

      {/* Forest treeline illustration */}
      <ForestTreeline />

      {/* Financial summary card */}
      <div className="w-full bg-white rounded-xl p-8 border-l-4 border-[#1A6B3C] text-center"
        style={{ boxShadow: '0 24px 40px -4px rgba(26, 46, 28, 0.04)' }}
      >
        <p
          className="text-[10px] uppercase tracking-widest text-[#707a70] mb-2"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {state.bigNumberLabel}
        </p>
        <p
          className="text-3xl font-bold text-[#1A6B3C]"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {state.bigNumber}
        </p>
        <p className="text-sm text-[#707a70] mt-1">
          {state.bigNumberSubtext}
        </p>
      </div>

      {/* CTA button */}
      <button
        type="button"
        onClick={onOpenCompanion}
        className="w-full bg-[#1a6b3c] text-white py-5 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all hover:bg-[#155e33] active:scale-[0.98]"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v1m0 16v1m8.66-13.5l-.87.5M4.21 16l-.87.5M20.66 16l-.87-.5M4.21 8l-.87-.5M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
        </svg>
        Ask the Forest
      </button>

      {/* AI disclaimer */}
      <p className="text-xs text-[#707a70] text-center">
        AI analysis based on latest satellite data
      </p>

      {/* Plain-language status */}
      <div
        className="w-full rounded-xl p-5 flex items-center gap-4"
        style={{
          background: 'white',
          boxShadow: '0 2px 8px rgba(26, 46, 28, 0.04)',
        }}
      >
        <span
          className="w-3 h-3 rounded-full shrink-0"
          style={{ background: STATUS_DOT[state.tier] }}
        />
        <div className="flex-1">
          <p className="text-sm font-medium text-[var(--text)]">
            {STATUS_SENTENCE[state.tier]}
          </p>
          <p className="text-xs text-[#707a70] mt-0.5">
            Next visit planned {DEMO_NEXT_VISIT}
          </p>
        </div>
      </div>
    </div>
  );
}

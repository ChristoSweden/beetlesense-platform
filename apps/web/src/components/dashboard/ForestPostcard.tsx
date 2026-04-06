import { useMemo } from 'react';
import { Sparkles, ChevronDown, TreePine, Shield, Leaf } from 'lucide-react';
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

const TIER_COLORS: Record<StatusTier, { primary: string; glow: string }> = {
  ok:       { primary: '#4ade80', glow: 'rgba(74, 222, 128, 0.12)' },
  watch:    { primary: '#fbbf24', glow: 'rgba(251, 191, 36, 0.10)' },
  warning:  { primary: '#f97316', glow: 'rgba(249, 115, 22, 0.10)' },
  critical: { primary: '#ef4444', glow: 'rgba(239, 68, 68, 0.10)' },
};

function buildState(riskScore: number): PostcardState {
  const tier = getTier(riskScore);

  switch (tier) {
    case 'ok':
      return {
        tier,
        headlineSv: 'Din skog m\u00e5r bra. Inget kr\u00e4ver din uppm\u00e4rksamhet idag.',
        headlineEn: 'Your forest is doing well. Nothing needs your attention today.',
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'Din skog tj\u00e4nade i \u00e5r',
        bigNumberSubtext: `+${DEMO_GROWTH_PCT}% tillv\u00e4xt`,
      };
    case 'watch':
      return {
        tier,
        headlineSv: `H\u00e5ll koll \u2014 f\u00f6rh\u00f6jd risk p\u00e5 ${DEMO_PARCEL}. Vi bevakar.`,
        headlineEn: `Keep an eye \u2014 elevated risk on ${DEMO_PARCEL}. We\u2019re monitoring.`,
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'Din skog tj\u00e4nade i \u00e5r',
        bigNumberSubtext: `+${DEMO_GROWTH_PCT}% tillv\u00e4xt`,
      };
    case 'warning':
      return {
        tier,
        headlineSv: `Barkborrerisk \u00f6kar p\u00e5 ${DEMO_PARCEL} \u2014 ${formatKr(DEMO_EXPOSURE)} exponerat, ${DEMO_DAYS_TO_ACT} dagar att agera.`,
        headlineEn: `Beetle risk rising on ${DEMO_PARCEL} \u2014 ${formatKr(DEMO_EXPOSURE)} exposed, ${DEMO_DAYS_TO_ACT} days to act.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'i riskzonen',
        bigNumberSubtext: `Agera inom ${DEMO_DAYS_TO_ACT} dagar`,
      };
    case 'critical':
      return {
        tier,
        headlineSv: `Agera nu: ${formatKr(DEMO_EXPOSURE)} virke i riskzon p\u00e5 ${DEMO_PARCEL}.`,
        headlineEn: `Act now: ${formatKr(DEMO_EXPOSURE)} timber at risk on ${DEMO_PARCEL}.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'i riskzonen',
        bigNumberSubtext: 'Omedelbar \u00e5tg\u00e4rd kr\u00e4vs',
      };
  }
}

// ─── Forest Illustration SVG ───

function ForestIllustration({ tier }: { tier: StatusTier }) {
  const color = TIER_COLORS[tier].primary;
  return (
    <svg viewBox="0 0 320 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full opacity-40">
      {/* Ground line */}
      <path d="M0 72 Q80 65 160 70 Q240 75 320 68" stroke={color} strokeWidth="1" strokeOpacity="0.3" />
      {/* Tree 1 */}
      <path d="M40 70 L40 50 M30 58 L40 45 L50 58 M28 65 L40 50 L52 65" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      {/* Tree 2 — taller */}
      <path d="M100 70 L100 38 M86 52 L100 35 L114 52 M84 60 L100 42 L116 60 M82 68 L100 50 L118 68" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.6" />
      {/* Tree 3 */}
      <path d="M160 70 L160 46 M148 56 L160 42 L172 56 M146 64 L160 48 L174 64" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.4" />
      {/* Tree 4 — birch */}
      <path d="M210 70 L210 40 M205 50 Q210 46 215 50 M203 56 Q210 52 217 56" stroke={color} strokeWidth="1.2" strokeLinecap="round" strokeOpacity="0.35" />
      {/* Tree 5 */}
      <path d="M270 70 L270 44 M258 55 L270 40 L282 55 M256 63 L270 46 L284 63" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.5" />
      {/* Subtle sun/moon */}
      <circle cx="290" cy="20" r="8" stroke={color} strokeWidth="0.8" strokeOpacity="0.2" fill={color} fillOpacity="0.05" />
    </svg>
  );
}

// ─── Component ───

export function ForestPostcard({ onOpenCompanion, onShowMore }: ForestPostcardProps) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const state = useMemo(() => buildState(risk.overallScore), [risk.overallScore]);
  const colors = TIER_COLORS[state.tier];

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-2">
      {/* Forest OS badge */}
      <div className="flex items-center gap-1.5 mb-6 opacity-60">
        <Leaf size={12} style={{ color: colors.primary }} />
        <span className="text-[10px] font-mono tracking-widest uppercase text-[var(--text3)]">
          Forest OS
        </span>
      </div>

      {/* Illustration */}
      <div className="w-full mb-6">
        <ForestIllustration tier={state.tier} />
      </div>

      {/* Status indicator dot */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: colors.primary,
            boxShadow: `0 0 8px ${colors.glow}`,
          }}
        />
        <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: colors.primary }}>
          {state.tier === 'ok' ? 'Allt v\u00e4l' : state.tier === 'watch' ? 'Bevakning' : state.tier === 'warning' ? 'Varning' : 'Kritiskt'}
        </span>
      </div>

      {/* Headline — the one sentence */}
      <div className="w-full rounded-2xl p-6 mb-2" style={{ background: colors.glow }}>
        <p
          className="text-lg leading-relaxed text-[var(--text)] text-center"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 500 }}
        >
          {state.headlineSv}
        </p>
        <p className="text-xs text-[var(--text3)] mt-3 text-center leading-relaxed">
          {state.headlineEn}
        </p>
      </div>

      {/* Big number */}
      <div className="mt-6 text-center">
        <p className="text-[11px] text-[var(--text3)] tracking-wide uppercase mb-1">
          {state.bigNumberLabel}
        </p>
        <p
          className="text-4xl font-bold font-mono tabular-nums tracking-tight"
          style={{
            color: state.tier === 'ok' || state.tier === 'watch' ? 'var(--text)' : colors.primary,
          }}
        >
          {state.bigNumber}
        </p>
        <p
          className="text-sm mt-1 font-medium"
          style={{ color: state.tier === 'ok' || state.tier === 'watch' ? '#4ade80' : colors.primary }}
        >
          {state.bigNumberSubtext}
        </p>
      </div>

      {/* CTA Button */}
      <div className="mt-8 w-full max-w-xs mx-auto">
        <button
          type="button"
          onClick={onOpenCompanion}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl px-6 py-4 text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: `linear-gradient(135deg, var(--green), ${colors.primary})`,
            color: 'white',
            boxShadow: `0 4px 20px ${colors.glow}`,
          }}
        >
          <Sparkles size={16} />
          Fr\u00e5ga skogen
        </button>

        <button
          type="button"
          onClick={onShowMore}
          className="w-full flex items-center justify-center gap-1.5 mt-4 py-2 text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
        >
          <ChevronDown size={14} className="animate-bounce" style={{ animationDuration: '2s' }} />
          <span>eller svep ned\u00e5t f\u00f6r mer</span>
        </button>
      </div>
    </div>
  );
}

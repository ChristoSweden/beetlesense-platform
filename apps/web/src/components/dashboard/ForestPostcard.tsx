import { useMemo } from 'react';
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
  subtitleSv: string;
  bigNumber: string;
  bigNumberLabel: string;
  bigNumberSubtext: string;
  statusLabel: string;
}

// ─── Constants ───

const DEMO_PARCEL = 'Norra Skiftet';
const DEMO_ANNUAL_EARNINGS = 287_000;
const DEMO_GROWTH_PCT = 3.2;
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
        headlineSv: 'Din skog m\u00e5r bra.',
        subtitleSv: 'Allt \u00e4r lugnt i dina best\u00e5nd idag.',
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'ACKUMULERAT V\u00c4RDE',
        bigNumberSubtext: 'Intj\u00e4nat under \u00e5ret',
        statusLabel: 'L\u00e5g risk',
      };
    case 'watch':
      return {
        tier,
        headlineSv: 'H\u00e5ll koll p\u00e5 skogen.',
        subtitleSv: `F\u00f6rh\u00f6jd risk p\u00e5 ${DEMO_PARCEL} \u2014 vi bevakar.`,
        bigNumber: formatKr(DEMO_ANNUAL_EARNINGS),
        bigNumberLabel: 'ACKUMULERAT V\u00c4RDE',
        bigNumberSubtext: 'Intj\u00e4nat under \u00e5ret',
        statusLabel: 'Bevakning',
      };
    case 'warning':
      return {
        tier,
        headlineSv: 'Skogen beh\u00f6ver dig.',
        subtitleSv: `Barkborrerisk \u00f6kar p\u00e5 ${DEMO_PARCEL} \u2014 ${DEMO_DAYS_TO_ACT} dagar att agera.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'I RISKZONEN',
        bigNumberSubtext: `Agera inom ${DEMO_DAYS_TO_ACT} dagar`,
        statusLabel: 'Varning',
      };
    case 'critical':
      return {
        tier,
        headlineSv: 'Agera nu.',
        subtitleSv: `${formatKr(DEMO_EXPOSURE)} virke i riskzon p\u00e5 ${DEMO_PARCEL}.`,
        bigNumber: formatKr(DEMO_EXPOSURE),
        bigNumberLabel: 'I RISKZONEN',
        bigNumberSubtext: 'Omedelbar \u00e5tg\u00e4rd kr\u00e4vs',
        statusLabel: 'Kritiskt',
      };
  }
}

// ─── Forest Treeline SVG ───

function ForestTreeline() {
  return (
    <div className="w-full rounded-xl bg-[#f3f4f1] p-6 overflow-hidden">
      <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
        {/* Back mountain layer — lightest */}
        <path
          d="M0 120 L0 80 Q50 40 100 65 Q150 30 200 55 Q250 25 300 50 Q350 35 400 60 L400 120 Z"
          fill="#1A6B3C"
          fillOpacity="0.2"
        />
        {/* Middle tree layer */}
        <path
          d="M0 120 L0 90 Q40 60 80 78 Q120 50 160 70 Q200 45 240 65 Q280 42 320 62 Q360 50 400 72 L400 120 Z"
          fill="#1A6B3C"
          fillOpacity="0.4"
        />
        {/* Front treeline — full opacity */}
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
  ok: 'Inget akut just nu \u2014 din skog ser bra ut.',
  watch: 'Vi h\u00e5ller koll p\u00e5 en sak, men inget att oroa sig f\u00f6r \u00e4n.',
  warning: 'En del av skogen beh\u00f6ver uppm\u00e4rksamhet snart.',
  critical: 'N\u00e5got kr\u00e4ver din \u00e5tg\u00e4rd \u2014 l\u00e4s mer nedan.',
};

// ─── Component ───

export function ForestPostcard({ onOpenCompanion, onShowMore: _onShowMore }: ForestPostcardProps) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const state = useMemo(() => buildState(risk.overallScore), [risk.overallScore]);

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto py-12 px-4 space-y-8">
      {/* Serif headline */}
      <h1
        className="text-5xl md:text-6xl text-center text-[var(--text)] leading-tight"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        {state.headlineSv}
      </h1>

      {/* Italic subtitle */}
      <p
        className="text-xl italic text-[#404940] text-center"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        {state.subtitleSv}
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
        Fr\u00e5ga skogen
      </button>

      {/* AI disclaimer */}
      <p className="text-xs text-[#707a70] text-center">
        AI-analys baserad p\u00e5 senaste satellitdata
      </p>

      {/* Plain-language status — one reassuring sentence instead of badges/numbers */}
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
            N\u00e4sta bes\u00f6k planerad {DEMO_NEXT_VISIT}
          </p>
        </div>
      </div>
    </div>
  );
}

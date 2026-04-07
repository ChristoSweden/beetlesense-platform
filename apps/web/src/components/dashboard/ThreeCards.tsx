import { useMemo } from 'react';
import { AlertTriangle, ArrowUpRight } from 'lucide-react';
import { getSwarmingRiskDemo } from '@/services/swarmingProbabilityModel';

// ─── Types ───

interface ThreeCardsProps {
  onOpenCompanion: () => void;
}

// ─── Constants ───

const DEMO_HEALTH_SCORE = 92;
const DEMO_TREES_ATTENTION = 3;
const DEMO_FOREST_VALUE = '12.4M kr';
const DEMO_GROWTH_PCT = 4.2;

// ─── Health Gauge SVG ───

function HealthGauge({ score }: { score: number }) {
  const radius = 44;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  // Gradient colors based on score
  const gradientId = 'health-gauge-gradient';

  return (
    <div className="relative w-28 h-28 flex items-center justify-center mx-auto my-4">
      <svg width="112" height="112" viewBox="0 0 112 112" className="absolute">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#15803d" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx="56" cy="56" r={radius}
          stroke="#f0f4f0"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Filled arc */}
        <circle
          cx="56" cy="56" r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 56 56)"
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
      </svg>
      <span
        className="text-4xl font-bold text-[#1A6B3C]"
        style={{ fontFamily: "'DM Mono', monospace" }}
      >
        {score}
      </span>
    </div>
  );
}

// ─── Card 1: Health ───

function HealthCard() {
  return (
    <div
      className="rounded-2xl p-7 relative overflow-hidden hover-lift-premium cursor-default"
      style={{
        background: 'linear-gradient(145deg, #f0f7f1 0%, #e8f5e9 50%, #f5f7f4 100%)',
        boxShadow: '0 8px 32px -4px rgba(26, 107, 60, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
      }}
    >
      <h3
        className="text-lg text-[#2e4a30] font-medium"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        Forest Health
      </h3>
      <HealthGauge score={DEMO_HEALTH_SCORE} />
      <p className="text-sm font-semibold text-[var(--text)] text-center">
        {DEMO_TREES_ATTENTION} trees need attention
      </p>
      <p className="text-xs text-[#707a70] text-center mt-1">
        Section C, northern slope
      </p>
    </div>
  );
}

// ─── Card 2: Money ───

function MoneyCard() {
  return (
    <div
      className="rounded-2xl overflow-hidden hover-lift-premium cursor-default"
      style={{
        boxShadow: '0 8px 32px -4px rgba(26, 107, 60, 0.1), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Green header */}
      <div
        className="px-7 pt-6 pb-5"
        style={{
          background: 'linear-gradient(135deg, #1A6B3C 0%, #0d4a26 100%)',
        }}
      >
        <h3
          className="text-sm text-white/70 mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Forest Value
        </h3>
        <p
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "'DM Mono', monospace" }}
        >
          {DEMO_FOREST_VALUE}
        </p>
      </div>
      {/* White body */}
      <div className="bg-white px-7 py-5">
        <div className="flex items-center gap-2 mb-4">
          <ArrowUpRight size={16} className="text-[#22c55e]" />
          <span className="text-sm">
            <span className="text-[#22c55e] font-bold">+{DEMO_GROWTH_PCT}%</span>
            <span className="text-[#707a70] ml-1">growth (YTD)</span>
          </span>
        </div>
        <div className="flex gap-2">
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              background: '#f0f7f1',
              color: '#2e4a30',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            Timber
          </span>
          <span
            className="text-xs font-medium px-3 py-1.5 rounded-full"
            style={{
              background: '#f0f7f1',
              color: '#2e4a30',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}
          >
            Carbon
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Card 3: Action ───

function ActionCard({ onOpenCompanion }: { onOpenCompanion: () => void }) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const _needsAction = risk.overallScore > 50;

  return (
    <div
      className="rounded-2xl p-7 relative overflow-hidden hover-lift-premium cursor-default bg-white"
      style={{
        borderLeft: '4px solid #f97316',
        boxShadow: '0 8px 32px -4px rgba(249, 115, 22, 0.08), 0 2px 8px -2px rgba(0, 0, 0, 0.06)',
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="pulse-warning w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center">
          <AlertTriangle size={18} className="text-orange-500" />
        </div>
        <h3
          className="text-lg text-[#404940] font-medium"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          Next Action
        </h3>
      </div>
      <p className="font-bold text-[var(--text)] mb-2 text-base">
        Book drone survey for Section B.
      </p>
      <p
        className="text-sm text-[#707a70] italic mb-5"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        Suspected infestation detected in western edge.
      </p>
      <button
        type="button"
        onClick={onOpenCompanion}
        className="group flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-all duration-200"
      >
        Schedule now
        <span className="inline-block transition-transform duration-200 group-hover:translate-x-2">&rarr;</span>
      </button>
    </div>
  );
}

// ─── Main Component ───

export function ThreeCards({ onOpenCompanion }: ThreeCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <HealthCard />
      <MoneyCard />
      <ActionCard onOpenCompanion={onOpenCompanion} />
    </div>
  );
}

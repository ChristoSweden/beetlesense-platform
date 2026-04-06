import { useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
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

// ─── Health Ring SVG ───

function HealthRing({ score }: { score: number }) {
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-20 h-20 flex items-center justify-center mx-auto my-4">
      <svg width="80" height="80" viewBox="0 0 80 80" className="absolute">
        <circle cx="40" cy="40" r={radius} stroke="#f3f4f1" strokeWidth="4" fill="none" />
        <circle
          cx="40" cy="40" r={radius}
          stroke="#1A6B3C"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 40 40)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <span
        className="text-xl font-bold text-[var(--text)]"
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
    <div className="bg-white rounded-xl p-8 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#4ADE80]" />
      <h3 className="text-xl text-[#404940]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Forest Health
      </h3>
      <HealthRing score={DEMO_HEALTH_SCORE} />
      <p className="text-sm font-medium text-[var(--text)] text-center">
        {DEMO_TREES_ATTENTION} trees need attention
      </p>
      <p className="text-sm text-[#707a70] text-center mt-1">
        Section C, northern slope
      </p>
    </div>
  );
}

// ─── Card 2: Money ───

function MoneyCard() {
  return (
    <div className="bg-white rounded-xl p-8 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#1A6B3C]" />
      <h3 className="text-xl text-[#404940]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Forest Value
      </h3>
      <p className="text-3xl font-bold mt-4 mb-2" style={{ fontFamily: "'DM Mono', monospace" }}>
        {DEMO_FOREST_VALUE}
      </p>
      <p className="text-sm mb-4">
        <span className="text-[#1A6B3C] font-semibold">+{DEMO_GROWTH_PCT}%</span>
        <span className="text-[#707a70]"> growth (YTD)</span>
      </p>
      <div className="flex gap-2">
        <span className="bg-[#f3f4f1] text-[#404940] text-xs font-medium px-3 py-1 rounded-full">Timber</span>
        <span className="bg-[#f3f4f1] text-[#404940] text-xs font-medium px-3 py-1 rounded-full">Carbon</span>
      </div>
    </div>
  );
}

// ─── Card 3: Action ───

function ActionCard({ onOpenCompanion }: { onOpenCompanion: () => void }) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const _needsAction = risk.overallScore > 50;

  return (
    <div className="bg-white rounded-xl p-8 shadow-sm relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#005129]" />
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl text-[#404940]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
          Next Action
        </h3>
        <AlertTriangle size={16} className="text-[#f97316]" />
      </div>
      <p className="font-bold text-[var(--text)] mb-2">
        Book drone survey for Section B.
      </p>
      <p className="text-sm text-[#707a70] italic mb-4" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Suspected infestation detected in western edge.
      </p>
      <button
        type="button"
        onClick={onOpenCompanion}
        className="group text-[#1A6B3C] font-semibold text-sm flex items-center gap-1 hover:underline"
      >
        Schedule now
        <span className="inline-block transition-transform group-hover:translate-x-2">&rarr;</span>
      </button>
    </div>
  );
}

// ─── Main Component ───

export function ThreeCards({ onOpenCompanion }: ThreeCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <HealthCard />
      <MoneyCard />
      <ActionCard onOpenCompanion={onOpenCompanion} />
    </div>
  );
}

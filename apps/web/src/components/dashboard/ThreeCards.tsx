import { useMemo } from 'react';
import {
  Shield,
  TreePine,
  TrendingUp,
  Calendar,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { getSwarmingRiskDemo } from '@/services/swarmingProbabilityModel';

// ─── Types ───

interface ThreeCardsProps {
  onOpenCompanion: () => void;
}

// ─── Constants ───

const DEMO_HEALTH_SCORE = 92;
const DEMO_TREES_ATTENTION = 3;
const DEMO_FOREST_VALUE = '3.5M kr';
const DEMO_GROWTH_PCT = 3.2;

// ─── Helpers ───

function getHealthColor(score: number): string {
  if (score <= 33) return '#ef4444';
  if (score <= 66) return '#fbbf24';
  return '#4ade80';
}

function getShieldColor(score: number): string {
  if (score <= 33) return '#ef4444';
  if (score <= 66) return '#fbbf24';
  return 'var(--green)';
}

// ─── Card Shell ───

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {children}
    </div>
  );
}

// ─── Card 1: Health ───

function HealthCard() {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  // Invert risk to health score for demo, but cap at our demo constant
  const score = DEMO_HEALTH_SCORE;
  const color = getHealthColor(score);
  const shieldColor = getShieldColor(score);

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <Shield size={20} style={{ color: shieldColor }} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text3)] font-medium">Skogshalsa</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className="text-2xl font-bold font-mono tabular-nums"
              style={{ color }}
            >
              {score}
            </span>
            <span className="text-sm text-[var(--text3)]">/100</span>
          </div>
          <p className="text-xs text-[var(--text2)] mt-1">
            {DEMO_TREES_ATTENTION} trad behover uppmarksamhet
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─── Card 2: Money ───

function MoneyCard() {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <TreePine size={20} style={{ color: 'var(--green)' }} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text3)] font-medium">Skogsvarde</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--text)]">
              {DEMO_FOREST_VALUE}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <TrendingUp size={12} className="text-[#4ade80]" aria-hidden="true" />
            <p className="text-xs text-[#4ade80]">
              +{DEMO_GROWTH_PCT}% tillvaxt per ar
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

// ─── Card 3: Next Action ───

function ActionCard({ onOpenCompanion }: { onOpenCompanion: () => void }) {
  const risk = useMemo(() => getSwarmingRiskDemo(), []);
  const needsAction = risk.overallScore > 50;

  return (
    <Card>
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {needsAction ? (
            <Calendar size={20} style={{ color: '#f97316' }} aria-hidden="true" />
          ) : (
            <CheckCircle size={20} style={{ color: 'var(--green)' }} aria-hidden="true" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--text3)] font-medium">Nasta atgard</p>
          {needsAction ? (
            <>
              <p className="text-sm font-medium text-[var(--text)] mt-1">
                Boka dronarsurvey
              </p>
              <button
                type="button"
                onClick={onOpenCompanion}
                className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white bg-[var(--green)] rounded-lg px-3 py-1.5 transition-opacity hover:opacity-90 active:opacity-80"
              >
                <Sparkles size={12} aria-hidden="true" />
                Fraga AI
              </button>
            </>
          ) : (
            <p className="text-sm text-[var(--text2)] mt-1">
              Inget behovs just nu
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

// ─── Main Component ───

export function ThreeCards({ onOpenCompanion }: ThreeCardsProps) {
  return (
    <div className="flex flex-col gap-3">
      <HealthCard />
      <MoneyCard />
      <ActionCard onOpenCompanion={onOpenCompanion} />
    </div>
  );
}

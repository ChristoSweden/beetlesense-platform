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

// ─── Card Shell ───

function Card({
  children,
  accentColor,
}: {
  children: React.ReactNode;
  accentColor?: string;
}) {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] p-5 transition-all hover:border-[var(--border2)]"
      style={{
        background: 'var(--bg2)',
        borderTop: accentColor ? `2px solid ${accentColor}20` : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ─── Health Ring SVG ───

function HealthRing({ score, color }: { score: number; color: string }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
      <svg width="56" height="56" viewBox="0 0 56 56" className="absolute">
        {/* Background ring */}
        <circle
          cx="28" cy="28" r={radius}
          stroke="var(--border)"
          strokeWidth="3"
          fill="none"
        />
        {/* Score ring */}
        <circle
          cx="28" cy="28" r={radius}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 28 28)"
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <Shield size={16} style={{ color }} />
    </div>
  );
}

// ─── Card 1: Health ───

function HealthCard() {
  const score = DEMO_HEALTH_SCORE;
  const color = getHealthColor(score);

  return (
    <Card accentColor={color}>
      <div className="flex items-center gap-4">
        <HealthRing score={score} color={color} />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[var(--text3)] font-medium tracking-wide uppercase">
            Skogsh\u00e4lsa
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span
              className="text-2xl font-bold font-mono tabular-nums"
              style={{ color }}
            >
              {score}
            </span>
            <span className="text-sm text-[var(--text3)] font-mono">/100</span>
          </div>
          <p className="text-xs text-[var(--text2)] mt-1">
            {DEMO_TREES_ATTENTION} tr\u00e4d beh\u00f6ver uppm\u00e4rksamhet
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─── Card 2: Money ───

function MoneyCard() {
  return (
    <Card accentColor="#4ade80">
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(74, 222, 128, 0.08)' }}
        >
          <TreePine size={20} style={{ color: 'var(--green)' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[var(--text3)] font-medium tracking-wide uppercase">
            Skogsv\u00e4rde
          </p>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-2xl font-bold font-mono tabular-nums text-[var(--text)]">
              {DEMO_FOREST_VALUE}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <TrendingUp size={12} className="text-[#4ade80]" />
            <p className="text-xs text-[#4ade80] font-medium">
              +{DEMO_GROWTH_PCT}% tillv\u00e4xt per \u00e5r
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
    <Card accentColor={needsAction ? '#f97316' : '#4ade80'}>
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
          style={{
            background: needsAction ? 'rgba(249, 115, 22, 0.08)' : 'rgba(74, 222, 128, 0.08)',
          }}
        >
          {needsAction ? (
            <Calendar size={20} style={{ color: '#f97316' }} />
          ) : (
            <CheckCircle size={20} style={{ color: 'var(--green)' }} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-[var(--text3)] font-medium tracking-wide uppercase">
            N\u00e4sta \u00e5tg\u00e4rd
          </p>
          {needsAction ? (
            <>
              <p className="text-sm font-semibold text-[var(--text)] mt-1">
                Boka dr\u00f6narsurvey
              </p>
              <button
                type="button"
                onClick={onOpenCompanion}
                className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-white rounded-xl px-4 py-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{
                  background: 'linear-gradient(135deg, var(--green), #22c55e)',
                  boxShadow: '0 2px 10px rgba(74, 222, 128, 0.15)',
                }}
              >
                <Sparkles size={12} />
                Fr\u00e5ga AI
              </button>
            </>
          ) : (
            <p className="text-sm text-[var(--text2)] mt-1 font-medium">
              Inget beh\u00f6vs just nu
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

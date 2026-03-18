import { useState, useMemo } from 'react';
import { Bug, Clock, AlertTriangle, Thermometer, Calendar, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ───

type SeasonPhase = 'dormant' | 'pre-swarm' | 'first-gen' | 'peak' | 'second-gen' | 'winding-down';

interface PhaseConfig {
  phase: SeasonPhase;
  label: string;
  description: string;
  color: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  cta: string;
  ctaAction: string;
}

interface BeetleCountdownProps {
  currentTemp?: number;
  forecastDaysToThreshold?: number;
  onAction?: (action: string) => void;
}

// ─── Phase logic ───

function getCurrentPhase(month: number): PhaseConfig {
  if (month >= 11 || month <= 1) {
    return {
      phase: 'dormant',
      label: 'Övervintring',
      description: 'Barkborren övervintrar under bark och i marken. Planera inför nästa säsong.',
      color: '#60a5fa',
      urgency: 'low',
      cta: 'Planera nästa år',
      ctaAction: 'plan',
    };
  }
  if (month === 2) {
    return {
      phase: 'dormant',
      label: 'Övervintring',
      description: 'Svärmningen närmar sig. Förbered din bevakningsplan och boka tidig inventering.',
      color: '#60a5fa',
      urgency: 'low',
      cta: 'Förbered bevakning',
      ctaAction: 'prepare',
    };
  }
  if (month === 3 || month === 4) {
    return {
      phase: 'pre-swarm',
      label: 'Försvärming',
      description: 'Svärmningen börjar snart. Barkborren aktiveras vid 18°C+. Bevaka temperaturen.',
      color: '#fbbf24',
      urgency: 'medium',
      cta: 'Boka screening',
      ctaAction: 'book-screening',
    };
  }
  if (month === 5 || month === 6) {
    return {
      phase: 'first-gen',
      label: 'Första generationen AKTIV',
      description: 'Första generationen svärmar och angriper. Varje dag utan åtgärd = 50 fler angripna träd.',
      color: '#f97316',
      urgency: 'high',
      cta: 'Akut åtgärd krävs',
      ctaAction: 'emergency',
    };
  }
  if (month === 7 || month === 8) {
    return {
      phase: 'second-gen',
      label: 'Andra generationen kläcks',
      description: 'Kritisk period. Andra generationen förstärker angreppen. Omedelbara insatser krävs.',
      color: '#ef4444',
      urgency: 'critical',
      cta: 'Akut åtgärd krävs',
      ctaAction: 'emergency',
    };
  }
  // Sep-Oct
  return {
    phase: 'winding-down',
    label: 'Säsongen avslutas',
    description: 'Angreppen avtar. Sammanfatta säsongens skador och planera sanering.',
    color: '#4ade80',
    urgency: 'low',
    cta: 'Visa sammanfattning',
    ctaAction: 'summary',
  };
}

function getSeasonProgress(month: number, day: number): number {
  // Beetle season is roughly March (3) through October (10) = 8 months
  if (month < 3) return 0;
  if (month > 10) return 100;
  const seasonMonths = month - 3; // 0-7
  const pct = ((seasonMonths * 30 + day) / (8 * 30)) * 100;
  return Math.min(100, Math.max(0, pct));
}

function getDaysUntilSwarm(month: number, day: number): number | null {
  // Swarm typically begins mid-April to early May in Småland
  if (month >= 5) return null; // Already swarming
  if (month < 3) return null; // Too far away
  const targetDate = new Date(new Date().getFullYear(), 4, 1); // May 1
  const now = new Date(new Date().getFullYear(), month - 1, day);
  const diff = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : null;
}

// ─── Circular progress ring ───

function ProgressRing({ progress, color, size = 80, strokeWidth = 6 }: {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--bg)"
        strokeWidth={strokeWidth}
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000"
      />
    </svg>
  );
}

// ─── Main Component ───

export function BeetleCountdown({ currentTemp, forecastDaysToThreshold, onAction }: BeetleCountdownProps) {
  const [expanded, setExpanded] = useState(false);

  const now = new Date();
  const month = now.getMonth() + 1;
  const day = now.getDate();

  const phase = useMemo(() => getCurrentPhase(month), [month]);
  const seasonProgress = useMemo(() => getSeasonProgress(month, day), [month, day]);
  const daysUntilSwarm = useMemo(() => getDaysUntilSwarm(month, day), [month, day]);

  const temp = currentTemp ?? 8;
  const forecastDays = forecastDaysToThreshold ?? (month >= 3 && month <= 4 ? 12 : null);

  const urgencyBorder = {
    low: 'var(--border)',
    medium: '#fbbf2430',
    high: '#f9731640',
    critical: '#ef444440',
  };

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{
        background: 'var(--bg2)',
        borderColor: urgencyBorder[phase.urgency],
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: `${phase.color}15`, color: phase.color }}
          >
            <Bug size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Barkborreklockan</h3>
            <p className="text-[10px] font-medium" style={{ color: phase.color }}>
              {phase.label}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {daysUntilSwarm !== null && (
            <span className="text-xs font-mono font-medium text-[#fbbf24]">
              {daysUntilSwarm}d
            </span>
          )}
          {expanded ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Progress ring + phase info */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <ProgressRing progress={seasonProgress} color={phase.color} size={72} strokeWidth={5} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-mono font-bold text-[var(--text)]">
                  {Math.round(seasonProgress)}%
                </span>
                <span className="text-[8px] text-[var(--text3)]">säsong</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-[var(--text2)] leading-relaxed">
                {phase.description}
              </p>
            </div>
          </div>

          {/* Countdown or active warning */}
          {daysUntilSwarm !== null && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#fbbf2408', border: '1px solid #fbbf2420' }}>
              <Clock size={16} className="text-[#fbbf24] flex-shrink-0" />
              <p className="text-xs text-[var(--text2)]">
                <span className="font-semibold text-[#fbbf24]">Svärmningen börjar om ~{daysUntilSwarm} dagar</span>
                {' '}baserat på historiska data för Småland.
              </p>
            </div>
          )}

          {(phase.phase === 'first-gen' || phase.phase === 'second-gen') && (
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: '#ef444408', border: '1px solid #ef444420' }}>
              <AlertTriangle size={16} className="text-[#ef4444] flex-shrink-0" />
              <p className="text-xs text-[var(--text2)]">
                <span className="font-semibold text-[#ef4444]">Varje dag utan åtgärd = ~50 fler angripna träd.</span>
                {' '}Omedelbar inventering rekommenderas.
              </p>
            </div>
          )}

          {/* Temperature indicator */}
          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
            <Thermometer size={16} className="text-[var(--text3)] flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[var(--text2)]">Aktuell temperatur</span>
                <span className="text-[11px] font-mono font-medium text-[var(--text)]">{temp}°C</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (temp / 25) * 100)}%`,
                    background: temp >= 18
                      ? 'linear-gradient(90deg, #f97316, #ef4444)'
                      : temp >= 12
                      ? 'linear-gradient(90deg, #fbbf24, #f97316)'
                      : 'linear-gradient(90deg, #60a5fa, #fbbf24)',
                  }}
                />
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[9px] text-[var(--text3)]">0°C</span>
                <span className="text-[9px] text-[var(--text3)] font-medium" style={{ color: temp >= 18 ? '#ef4444' : 'var(--text3)' }}>
                  Svärm: 18°C+
                </span>
              </div>
            </div>
          </div>

          {/* Forecast */}
          {forecastDays !== null && temp < 18 && (
            <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
              <Calendar size={14} className="text-[var(--text3)] flex-shrink-0" />
              <p className="text-[11px] text-[var(--text2)]">
                Barkborren svärmar vid 18°C+ — prognos:{' '}
                <span className="font-semibold text-[var(--text)]">{forecastDays} dagar kvar</span>
              </p>
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={() => onAction?.(phase.ctaAction)}
            className="w-full py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: phase.urgency === 'critical' || phase.urgency === 'high'
                ? phase.color
                : `${phase.color}20`,
              color: phase.urgency === 'critical' || phase.urgency === 'high'
                ? '#fff'
                : phase.color,
            }}
          >
            {phase.cta}
          </button>

          {/* Season timeline */}
          <div className="pt-1">
            <div className="flex items-center gap-0.5">
              {['Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt'].map((m, i) => {
                const mNum = i + 3;
                const isActive = mNum === month;
                const isPast = mNum < month;
                const phaseColor = getCurrentPhase(mNum).color;
                return (
                  <div key={m} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full h-1.5 rounded-full transition-all"
                      style={{
                        background: isPast ? phaseColor : isActive ? phaseColor : 'var(--bg)',
                        opacity: isPast ? 0.5 : isActive ? 1 : 0.3,
                      }}
                    />
                    <span
                      className="text-[8px]"
                      style={{ color: isActive ? phase.color : 'var(--text3)' }}
                    >
                      {m}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default BeetleCountdown;

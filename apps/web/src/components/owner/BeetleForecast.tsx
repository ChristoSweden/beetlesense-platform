import { useMemo } from 'react';
import { Bug, Thermometer, AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { isDemoMode } from '@/lib/dataMode';

// ─── Science: Ips typographus degree-day model ───
// Bark beetles swarm when accumulated degree-days (base 5 C) reach ~600.
// We use realistic Smaland region monthly average temperatures for demo mode.

const SMALAND_MONTHLY_AVG: Record<number, number> = {
  1: -2.5,  // Jan
  2: -2.0,  // Feb
  3: 1.5,   // Mar
  4: 6.5,   // Apr
  5: 12.0,  // May
  6: 16.0,  // Jun
  7: 18.0,  // Jul
  8: 17.0,  // Aug
  9: 12.5,  // Sep
  10: 7.0,  // Oct
  11: 2.5,  // Nov
  12: -1.0, // Dec
};

const BASE_TEMP = 5;
const SWARM_THRESHOLD = 600;

type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

interface ForecastData {
  currentDD: number;
  estimatedSwarmDate: string;
  riskLevel: RiskLevel;
  progressPct: number;
  recommendation: string;
}

function getDailyAvgForDate(date: Date): number {
  const month = date.getMonth() + 1;
  const dayOfMonth = date.getDate();
  const daysInMonth = new Date(date.getFullYear(), month, 0).getDate();

  // Interpolate between this month and next for smoother curve
  const currentAvg = SMALAND_MONTHLY_AVG[month] ?? 5;
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextAvg = SMALAND_MONTHLY_AVG[nextMonth] ?? 5;
  const fraction = dayOfMonth / daysInMonth;
  return currentAvg + (nextAvg - currentAvg) * fraction;
}

function computeForecast(): ForecastData {
  const now = new Date();
  const year = now.getFullYear();
  // Start accumulation from March 1 (when temps start rising)
  const startDate = new Date(year, 2, 1);
  const endDate = now > startDate ? now : startDate;

  let accDD = 0;

  // Accumulate degree-days from start to today
  const d = new Date(startDate);
  while (d <= endDate) {
    const dailyAvg = getDailyAvgForDate(d);
    if (dailyAvg > BASE_TEMP) {
      accDD += dailyAvg - BASE_TEMP;
    }
    d.setDate(d.getDate() + 1);
  }

  // Project forward to find estimated swarm date
  let projDD = accDD;
  const projDate = new Date(endDate);
  let safetyLimit = 365;
  while (projDD < SWARM_THRESHOLD && safetyLimit > 0) {
    projDate.setDate(projDate.getDate() + 1);
    const dailyAvg = getDailyAvgForDate(projDate);
    if (dailyAvg > BASE_TEMP) {
      projDD += dailyAvg - BASE_TEMP;
    }
    safetyLimit--;
  }

  const estimatedSwarmDate = projDate.toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  let riskLevel: RiskLevel;
  if (accDD >= SWARM_THRESHOLD) {
    riskLevel = 'critical';
  } else if (accDD >= 500) {
    riskLevel = 'high';
  } else if (accDD >= 300) {
    riskLevel = 'medium';
  } else {
    riskLevel = 'low';
  }

  const recommendations: Record<RiskLevel, string> = {
    low: 'No immediate action needed. Monitor temperatures.',
    medium: 'Prepare pheromone traps. Schedule inspection within 2 weeks.',
    high: 'Swarming imminent. Deploy traps and inspect vulnerable stands.',
    critical: 'Active swarming likely. Immediate inspection and sanitation harvesting recommended.',
  };

  return {
    currentDD: Math.round(accDD),
    estimatedSwarmDate,
    riskLevel,
    progressPct: Math.min(100, (accDD / SWARM_THRESHOLD) * 100),
    recommendation: recommendations[riskLevel],
  };
}

const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#4ade80',
  medium: '#fbbf24',
  high: '#f97316',
  critical: '#ef4444',
};

const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical',
};

export function BeetleForecast() {
  const forecast = useMemo(() => computeForecast(), []);
  const demo = isDemoMode();
  // TODO: fetch from Supabase in live mode
  // For now, fall back to demo data gracefully in both modes
  void demo;
  const color = RISK_COLORS[forecast.riskLevel];

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Bug size={16} style={{ color }} />
          <span className="text-sm font-semibold text-[var(--text)]">
            Beetle Swarming Forecast
          </span>
        </div>
        <span
          className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {RISK_LABELS[forecast.riskLevel]}
        </span>
      </div>

      {/* Degree-day progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-[var(--text3)]">Accumulated degree-days</span>
          <span className="text-xs font-mono font-semibold text-[var(--text)]">
            {forecast.currentDD} / {SWARM_THRESHOLD} DD
          </span>
        </div>
        <div className="w-full h-3 rounded-full bg-[var(--bg)] border border-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${forecast.progressPct}%`,
              background: `linear-gradient(90deg, #4ade80, ${color})`,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text3)]">0 DD</span>
          <span className="text-[10px] text-[var(--text3)]">300</span>
          <span className="text-[10px] text-[var(--text3)]">500</span>
          <span className="text-[10px] font-semibold" style={{ color }}>600 DD</span>
        </div>
      </div>

      {/* Key stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1 mb-0.5">
            <Thermometer size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">Current DD</span>
          </div>
          <span className="text-sm font-bold font-mono text-[var(--text)]">{forecast.currentDD}</span>
        </div>
        <div className="rounded-lg p-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-1 mb-0.5">
            <AlertTriangle size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] text-[var(--text3)]">Est. Swarm Date</span>
          </div>
          <span className="text-xs font-bold text-[var(--text)]">{forecast.estimatedSwarmDate}</span>
        </div>
      </div>

      {/* Recommendation */}
      <div
        className="rounded-lg p-2.5 border"
        style={{ background: `${color}08`, borderColor: `${color}30` }}
      >
        <div className="flex items-start gap-2">
          <Shield size={14} style={{ color, flexShrink: 0, marginTop: 1 }} />
          <p className="text-xs text-[var(--text2)] leading-relaxed">
            {forecast.recommendation}
          </p>
        </div>
      </div>

      {/* Base temp note */}
      <p className="text-[10px] text-[var(--text3)] mt-2">
        Model: Ips typographus degree-day accumulation (base 5 C). Data: Smaland regional averages.
      </p>
    </div>
  );
}

import { Bug, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { BeetleSwarmingPrediction, BeetleRiskLevel } from '@/hooks/useMicroclimate';

// ─── Helpers ───

function riskColor(level: BeetleRiskLevel): string {
  switch (level) {
    case 'low': return '#4ade80';
    case 'medium': return '#fbbf24';
    case 'high': return '#f97316';
    case 'critical': return '#ef4444';
  }
}

function _riskGradient(score: number): string {
  if (score >= 75) return 'linear-gradient(90deg, #f97316, #ef4444)';
  if (score >= 50) return 'linear-gradient(90deg, #fbbf24, #f97316)';
  if (score >= 25) return 'linear-gradient(90deg, #4ade80, #fbbf24)';
  return 'linear-gradient(90deg, #4ade80, #86efac)';
}

// ─── Factor Bar ───

function FactorBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-[var(--text3)] w-28 flex-shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
      <span className="text-[10px] font-mono text-[var(--text2)] w-8 text-right">{value}</span>
    </div>
  );
}

// ─── Timeline Bar ───

function TimelineBar({ data }: { data: { date: string; riskScore: number; riskLevel: BeetleRiskLevel }[] }) {
  const _maxScore = Math.max(...data.map((d) => d.riskScore), 1);

  return (
    <div className="flex items-end gap-px h-16">
      {data.map((d, i) => {
        const height = Math.max(4, (d.riskScore / 100) * 64);
        const color = riskColor(d.riskLevel);
        const isWeekStart = new Date(d.date).getDay() === 1;
        return (
          <div key={i} className="flex-1 flex flex-col items-center" title={`${d.date}: ${d.riskScore}`}>
            <div
              className="w-full rounded-t transition-all"
              style={{ height: `${height}px`, background: color, opacity: 0.8 }}
            />
            {isWeekStart && (
              <span className="text-[7px] text-[var(--text3)] mt-0.5">
                {new Date(d.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ───

interface BeetleRiskModelProps {
  prediction: BeetleSwarmingPrediction;
  parcelName: string;
}

export function BeetleRiskModel({ prediction, parcelName }: BeetleRiskModelProps) {
  const [expanded, setExpanded] = useState(false);

  const overallScore = prediction.riskTimeline.length > 0
    ? Math.round(prediction.riskTimeline.reduce((s, d) => s + d.riskScore, 0) / prediction.riskTimeline.length)
    : 0;
  const peakDay = prediction.riskTimeline.reduce((max, d) => d.riskScore > max.riskScore ? d : max, prediction.riskTimeline[0]);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bug size={16} className="text-[var(--text2)]" />
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Barkborreriskmodell
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text3)]">Träffsäkerhet</span>
            <span className="text-[10px] font-mono text-[var(--green)]">{prediction.historicalAccuracy}%</span>
          </div>
        </div>

        {/* Overall risk score */}
        <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
          <div className="relative w-14 h-14 flex-shrink-0">
            <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
              <circle
                cx="28" cy="28" r="24"
                fill="none"
                stroke="var(--bg3)"
                strokeWidth="4"
              />
              <circle
                cx="28" cy="28" r="24"
                fill="none"
                stroke={riskColor(peakDay?.riskLevel ?? 'low')}
                strokeWidth="4"
                strokeDasharray={`${(overallScore / 100) * 150.8} 150.8`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold font-mono text-[var(--text)]">{overallScore}</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-[var(--text)]">{parcelName}</p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">{prediction.generationPrediction}</p>
            {prediction.firstSwarmingWeek && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--yellow)]/10 text-[var(--yellow)]">
                  1:a gen v.{prediction.firstSwarmingWeek}
                </span>
                {prediction.secondGenerationWeek && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--red)]/10 text-[var(--red)]">
                    2:a gen v.{prediction.secondGenerationWeek}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 30-day risk timeline */}
        <div className="mb-4">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
            Svärmningsrisk — Nästa 30 dagar
          </p>
          <TimelineBar data={prediction.riskTimeline} />
          {/* Legend */}
          <div className="flex items-center gap-3 mt-2">
            {(['low', 'medium', 'high', 'critical'] as BeetleRiskLevel[]).map((level) => (
              <div key={level} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: riskColor(level) }} />
                <span className="text-[8px] text-[var(--text3)]">
                  {level === 'low' ? 'Låg' : level === 'medium' ? 'Medel' : level === 'high' ? 'Hög' : 'Kritisk'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Factor breakdown */}
        <div className="mb-3">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
            Riskfaktorer
          </p>
          <div className="space-y-1.5">
            <FactorBar label="Temperatur" value={prediction.factors.temperature} color="#f97316" />
            <FactorBar label="GDD-ackumulation" value={prediction.factors.gddProgress} color="#fbbf24" />
            <FactorBar label="Torkstress" value={prediction.factors.droughtStress} color="#ef4444" />
            <FactorBar label="Stormskador" value={prediction.factors.recentStorms} color="#a78bfa" />
            <FactorBar label="Grannaktivitet" value={prediction.factors.neighborActivity} color="#f97316" />
            <FactorBar label="Granandel" value={prediction.factors.spruceVulnerability} color="#4ade80" />
          </div>
        </div>

        {/* Expand for recommendations */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Shield size={13} className="text-[var(--green)]" />
            <span className="text-xs font-medium text-[var(--text)]">
              Åtgärdsrekommendationer ({prediction.recommendations.length})
            </span>
          </div>
          {expanded ? <ChevronUp size={14} className="text-[var(--text3)]" /> : <ChevronDown size={14} className="text-[var(--text3)]" />}
        </button>

        {expanded && (
          <div className="mt-2 space-y-1.5">
            {prediction.recommendations.map((rec, i) => (
              <div
                key={i}
                className="flex items-start gap-2 p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
              >
                <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 bg-[var(--green)]/10">
                  <span className="text-[9px] font-bold text-[var(--green)]">{i + 1}</span>
                </div>
                <span className="text-[11px] text-[var(--text2)]">{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

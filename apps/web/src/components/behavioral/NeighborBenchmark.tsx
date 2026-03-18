import { useState, useMemo } from 'react';
import { Users, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Award } from 'lucide-react';

// ─── Types ───

interface BenchmarkMetric {
  label: string;
  yourScore: number;
  regionAvg: number;
  top10: number;
  unit: string;
}

interface NeighborBenchmarkProps {
  region?: string;
  healthScore?: number;
  surveyFrequency?: number;
  responseTimeDays?: number;
}

// ─── Demo data for Småland/Kronoberg ───

function getDemoMetrics(props: NeighborBenchmarkProps): BenchmarkMetric[] {
  return [
    {
      label: 'Hälsopoäng',
      yourScore: props.healthScore ?? 72,
      regionAvg: 68,
      top10: 89,
      unit: '/100',
    },
    {
      label: 'Inventeringsfrekvens',
      yourScore: props.surveyFrequency ?? 2.4,
      regionAvg: 1.8,
      top10: 4.2,
      unit: '/år',
    },
    {
      label: 'Svarstid vid larm',
      yourScore: props.responseTimeDays ?? 5,
      regionAvg: 11,
      top10: 2,
      unit: ' dagar',
    },
  ];
}

function getPercentile(score: number, avg: number, top10: number): number {
  // Simple percentile estimation based on where score falls
  if (score >= top10) return 92 + Math.min(8, ((score - top10) / top10) * 8);
  if (score >= avg) return 50 + ((score - avg) / (top10 - avg)) * 40;
  return Math.max(5, (score / avg) * 50);
}

function getPercentileInverted(score: number, avg: number, top10: number): number {
  // For metrics where lower is better (e.g., response time)
  if (score <= top10) return 92 + Math.min(8, ((top10 - score) / top10) * 8);
  if (score <= avg) return 50 + ((avg - score) / (avg - top10)) * 40;
  return Math.max(5, (avg / score) * 50);
}

// ─── Bar component ───

function HorizontalBar({ metric, inverted = false }: { metric: BenchmarkMetric; inverted?: boolean }) {
  const max = inverted
    ? Math.max(metric.yourScore, metric.regionAvg) * 1.3
    : Math.max(metric.yourScore, metric.regionAvg, metric.top10) * 1.15;

  const yourPct = inverted
    ? ((max - metric.yourScore) / max) * 100
    : (metric.yourScore / max) * 100;
  const avgPct = inverted
    ? ((max - metric.regionAvg) / max) * 100
    : (metric.regionAvg / max) * 100;
  const topPct = inverted
    ? ((max - metric.top10) / max) * 100
    : (metric.top10 / max) * 100;

  const isAboveAvg = inverted
    ? metric.yourScore < metric.regionAvg
    : metric.yourScore > metric.regionAvg;

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[var(--text2)]">{metric.label}</span>
        <span className="text-[11px] font-mono font-medium text-[var(--text)]">
          {metric.yourScore}{metric.unit}
        </span>
      </div>
      <div className="relative h-5 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
        {/* Your score bar */}
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all duration-700"
          style={{
            width: `${Math.min(yourPct, 100)}%`,
            background: isAboveAvg
              ? 'linear-gradient(90deg, #166534, #4ade80)'
              : 'linear-gradient(90deg, #92400e, #fbbf24)',
          }}
        />
        {/* Region avg marker */}
        <div
          className="absolute top-0 h-full w-0.5 bg-[var(--text3)] opacity-60"
          style={{ left: `${Math.min(avgPct, 98)}%` }}
          title={`Regionsnitt: ${metric.regionAvg}${metric.unit}`}
        />
        {/* Top 10% marker */}
        {!inverted && (
          <div
            className="absolute top-0 h-full w-0.5 opacity-40"
            style={{ left: `${Math.min(topPct, 98)}%`, background: '#4ade80' }}
            title={`Topp 10%: ${metric.top10}${metric.unit}`}
          />
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-[9px] text-[var(--text3)]">Regionsnitt: {metric.regionAvg}{metric.unit}</span>
        {!inverted && (
          <span className="text-[9px] text-[var(--text3)]">Topp 10%: {metric.top10}{metric.unit}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───

export function NeighborBenchmark(props: NeighborBenchmarkProps) {
  const [expanded, setExpanded] = useState(false);
  const region = props.region ?? 'Småland';
  const metrics = useMemo(() => getDemoMetrics(props), [props.healthScore, props.surveyFrequency, props.responseTimeDays]);

  // Overall percentile (average of all metric percentiles)
  const overallPercentile = useMemo(() => {
    const p1 = getPercentile(metrics[0].yourScore, metrics[0].regionAvg, metrics[0].top10);
    const p2 = getPercentile(metrics[1].yourScore, metrics[1].regionAvg, metrics[1].top10);
    const p3 = getPercentileInverted(metrics[2].yourScore, metrics[2].regionAvg, metrics[2].top10);
    return Math.round((p1 + p2 + p3) / 3);
  }, [metrics]);

  const isAboveAverage = overallPercentile > 50;
  const isTop25 = overallPercentile >= 75;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#4ade8015', color: '#4ade80' }}>
            <Users size={18} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">Din skog vs grannar</h3>
            <p className="text-[10px] text-[var(--text3)]">Jämförelse med bestånd i {region}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-[var(--text2)]">
            Topp {100 - overallPercentile}%
          </span>
          {expanded ? (
            <ChevronUp size={14} className="text-[var(--text3)]" />
          ) : (
            <ChevronDown size={14} className="text-[var(--text3)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Percentile statement */}
          <div className="flex items-start gap-2 p-3 rounded-lg" style={{ background: 'var(--bg)' }}>
            {isAboveAverage ? (
              <TrendingUp size={16} className="text-[#4ade80] mt-0.5 flex-shrink-0" />
            ) : (
              <TrendingDown size={16} className="text-[#fbbf24] mt-0.5 flex-shrink-0" />
            )}
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              Du presterar bättre än <span className="font-semibold text-[var(--text)]">{overallPercentile}%</span> av
              likvärdiga bestånd i {region}.
            </p>
          </div>

          {/* Metric bars */}
          <div>
            <HorizontalBar metric={metrics[0]} />
            <HorizontalBar metric={metrics[1]} />
            <HorizontalBar metric={metrics[2]} inverted />
          </div>

          {/* Motivational nudge */}
          <div
            className="p-3 rounded-lg border"
            style={{
              background: isTop25 ? '#4ade8008' : '#fbbf2408',
              borderColor: isTop25 ? '#4ade8020' : '#fbbf2420',
            }}
          >
            {isTop25 ? (
              <div className="flex items-start gap-2">
                <Award size={14} className="text-[#4ade80] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                  <span className="font-semibold text-[#4ade80]">Topp 25%!</span> Ditt bestånd tillhör de bäst skötta
                  i regionen. Fortsätt med regelbundna inventeringar för att behålla din position.
                </p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Users size={14} className="text-[#fbbf24] mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-[var(--text2)] leading-relaxed">
                  <span className="font-semibold text-[#fbbf24]">4 av 7</span> skogsägare nära dig har redan
                  genomfört vårens screening. Boka din inventering för att ligga steget före.
                </p>
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-1.5 rounded-full bg-gradient-to-r from-[#166534] to-[#4ade80]" />
              <span className="text-[9px] text-[var(--text3)]">Din skog</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[var(--text3)] opacity-60" />
              <span className="text-[9px] text-[var(--text3)]">Regionsnitt</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-[#4ade80] opacity-40" />
              <span className="text-[9px] text-[var(--text3)]">Topp 10%</span>
            </div>
          </div>

          <p className="text-[9px] text-[var(--text3)] italic">
            Anonymiserad jämförelse. Ingen persondata delas.
          </p>
        </div>
      )}
    </div>
  );
}

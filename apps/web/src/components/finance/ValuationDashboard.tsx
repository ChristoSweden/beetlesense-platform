/**
 * ValuationDashboard — Real-time forest valuation with hero number,
 * donut breakdown, trend chart, and per-parcel cards.
 */

import { useMemo } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Clock,
  FileText,
  ChevronUp,
  Info,
} from 'lucide-react';
import type {
  ValuationBreakdown,
  QuarterlySnapshot,
  ParcelValuation,
} from '@/hooks/useForestFinance';

// ─── Helpers ───

function formatSEK(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)} MSEK`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} TSEK`;
  return `${value} SEK`;
}

function formatNumber(n: number): string {
  return n.toLocaleString('sv-SE');
}

// ─── Donut Chart (pure SVG) ───

function DonutChart({ breakdown }: { breakdown: ValuationBreakdown[] }) {
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let cumulativeOffset = 0;
  const segments = breakdown.map((b) => {
    const segLen = (b.percentage / 100) * circumference;
    const offset = cumulativeOffset;
    cumulativeOffset += segLen;
    return { ...b, segLen, offset };
  });

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {segments.map((seg) => (
          <circle
            key={seg.category}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${seg.segLen} ${circumference - seg.segLen}`}
            strokeDashoffset={-seg.offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Totalt</span>
        <span className="text-lg font-bold font-mono text-[var(--text)]">12.5</span>
        <span className="text-[10px] text-[var(--text2)]">MSEK</span>
      </div>
    </div>
  );
}

// ─── Mini Trend Chart (pure SVG) ───

function TrendChart({ history }: { history: QuarterlySnapshot[] }) {
  const w = 400;
  const h = 120;
  const pad = { top: 10, right: 10, bottom: 24, left: 50 };

  const values = history.map((q) => q.totalValueSEK);
  const minV = Math.min(...values) * 0.95;
  const maxV = Math.max(...values) * 1.02;

  const xScale = (i: number) => pad.left + (i / (values.length - 1)) * (w - pad.left - pad.right);
  const yScale = (v: number) => pad.top + ((maxV - v) / (maxV - minV)) * (h - pad.top - pad.bottom);

  const pathD = values
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i).toFixed(1)} ${yScale(v).toFixed(1)}`)
    .join(' ');

  const areaD = `${pathD} L ${xScale(values.length - 1).toFixed(1)} ${h - pad.bottom} L ${pad.left} ${h - pad.bottom} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="valuation-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4ade80" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#valuation-gradient)" />
      <path d={pathD} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinejoin="round" />
      {values.map((v, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(v)} r="3" fill="#4ade80" />
      ))}
      {/* X-axis labels — show every other quarter */}
      {history.map((q, i) =>
        i % 2 === 0 ? (
          <text key={q.quarter} x={xScale(i)} y={h - 4} textAnchor="middle" className="fill-[var(--text3)]" style={{ fontSize: 9, fontFamily: 'monospace' }}>
            {q.quarter}
          </text>
        ) : null,
      )}
      {/* Y-axis labels */}
      {[minV, (minV + maxV) / 2, maxV].map((v, i) => (
        <text key={i} x={pad.left - 4} y={yScale(v) + 3} textAnchor="end" className="fill-[var(--text3)]" style={{ fontSize: 9, fontFamily: 'monospace' }}>
          {(v / 1_000_000).toFixed(1)}M
        </text>
      ))}
    </svg>
  );
}

// ─── Component ───

interface Props {
  totalValue: number;
  confidenceInterval: number;
  breakdown: ValuationBreakdown[];
  quarterlyHistory: QuarterlySnapshot[];
  parcelValuations: ParcelValuation[];
  lastUpdated: string;
}

export function ValuationDashboard({
  totalValue,
  confidenceInterval,
  breakdown,
  quarterlyHistory,
  parcelValuations,
  lastUpdated,
}: Props) {
  const change = useMemo(() => {
    if (quarterlyHistory.length < 2) return 0;
    const prev = quarterlyHistory[quarterlyHistory.length - 2].totalValueSEK;
    return ((totalValue - prev) / prev) * 100;
  }, [totalValue, quarterlyHistory]);

  const updatedStr = new Date(lastUpdated).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      {/* Hero valuation */}
      <div className="rounded-xl border border-[var(--border)] p-6" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)]">
                <ShieldCheck size={12} />
                BeetleSense Verified Valuation&trade;
              </span>
            </div>
            <h2 className="text-sm text-[var(--text3)]">Total skogsvärdering</h2>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
            <Clock size={12} />
            {updatedStr}
          </div>
        </div>

        <div className="flex items-baseline gap-3 mb-1">
          <span className="text-4xl font-bold font-mono text-[var(--text)]">
            {formatNumber(totalValue)}
          </span>
          <span className="text-lg text-[var(--text2)]">SEK</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-0.5 text-xs font-mono text-[var(--green)]">
            <ChevronUp size={14} />
            +{change.toFixed(1)}% detta kvartal
          </span>
          <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
            <Info size={10} />
            Konfidensintervall: &plusmn;{confidenceInterval}%
          </span>
        </div>
      </div>

      {/* Donut + Breakdown */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Värderingsfördelning</h3>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <DonutChart breakdown={breakdown} />
          <div className="flex-1 space-y-3 w-full">
            {breakdown.map((b) => (
              <div key={b.category} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: b.color }} />
                  <div>
                    <span className="text-xs font-medium text-[var(--text)]">{b.label}</span>
                    <span className="text-[10px] text-[var(--text3)] ml-2">{b.percentage}%</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-[var(--text2)]">{formatSEK(b.valueSEK)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Trend chart */}
      <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text)]">Kvartalsvis värdering</h3>
          <div className="flex items-center gap-1 text-[10px] text-[var(--green)]">
            <TrendingUp size={12} />
            +{((totalValue / quarterlyHistory[0].totalValueSEK - 1) * 100).toFixed(1)}% sedan {quarterlyHistory[0].quarter}
          </div>
        </div>
        <TrendChart history={quarterlyHistory} />
      </div>

      {/* Per-parcel cards */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Värdering per skifte</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {parcelValuations.map((p) => (
            <div
              key={p.parcelId}
              className="rounded-lg border border-[var(--border)] p-4"
              style={{ background: 'var(--surface)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text)]">{p.parcelName}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    p.healthScore >= 80
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : p.healthScore >= 50
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  Hälsa: {p.healthScore}%
                </span>
              </div>
              <p className="text-lg font-bold font-mono text-[var(--text)] mb-1">
                {formatSEK(p.totalValueSEK)}
              </p>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
                <span>{p.areaHa} ha</span>
                <span>{formatNumber(p.perHectareSEK)} SEK/ha</span>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--text3)]">
                <span>{formatNumber(p.timberVolumeM3)} m&sup3; virke</span>
                <span>{formatNumber(p.carbonTonsCO2)} ton CO&sub2;</span>
              </div>
              <p className="text-[10px] text-[var(--text3)] mt-1">{p.municipality}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Generate report button */}
      <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-[var(--green)] text-white font-medium text-sm hover:brightness-110 transition">
        <FileText size={16} />
        Generera värderingsrapport
      </button>
    </div>
  );
}

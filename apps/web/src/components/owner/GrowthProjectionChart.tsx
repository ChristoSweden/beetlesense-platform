/**
 * GrowthProjectionChart
 *
 * 20-year forest growth projection showing three management scenarios:
 *   1. No action
 *   2. 30% thinning at year 5
 *   3. Clear cut + replant
 *
 * Y-axis togglable between: timber volume (m³), carbon (tonne CO₂), value (SEK).
 * Uses inline SVG — no chart library dependency.
 */

import { useState, useMemo } from 'react';
import { TrendingUp, Leaf, Banknote, Scissors, TreePine, AlertTriangle, Star } from 'lucide-react';
import {
  projectAllScenarios,
  type Parcel,
  type ProjectionResult,
  type ManagementScenario,
} from '@/services/growthProjectionService';

// ─── Types ────────────────────────────────────────────────────────────────────

type YAxisMode = 'volume' | 'carbon' | 'value';

interface Props {
  parcelId?: string;
  areaHa?: number;
  species?: string;
  currentAgeYears?: number;
  currentVolumeM3PerHa?: number;
  siteIndex?: number;
  className?: string;
}

// ─── Scenario styling ─────────────────────────────────────────────────────────

const SCENARIO_STYLE: Record<ManagementScenario, { color: string; stroke: string; label: string; icon: React.ReactNode }> = {
  no_action: {
    color: '#1B5E20',
    stroke: 'stroke-[var(--green)]',
    label: 'No action',
    icon: <TreePine size={12} />,
  },
  thinning_30pct: {
    color: '#2E7D32',
    stroke: 'stroke-emerald-500',
    label: '30% thinning at year 5',
    icon: <Scissors size={12} />,
  },
  clear_cut_replant: {
    color: '#B87333',
    stroke: 'stroke-amber-600',
    label: 'Clear cut + replant',
    icon: <AlertTriangle size={12} />,
  },
};

// ─── SVG chart ────────────────────────────────────────────────────────────────

function LineChart({
  results,
  mode,
}: {
  results: ProjectionResult[];
  mode: YAxisMode;
}) {
  const W = 560;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 36, left: 64 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const getValue = (r: ProjectionResult, i: number): number => {
    const p = r.points[i];
    if (mode === 'volume') return p.totalVolumeM3;
    if (mode === 'carbon') return p.carbonTonnes;
    return p.estimatedValueSEK;
  };

  const allValues = results.flatMap((r) => r.points.map((_, i) => getValue(r, i)));
  const maxVal = Math.max(...allValues, 1);
  const years = results[0]?.points.length ?? 21;

  const xScale = (i: number) => PAD.left + (i / (years - 1)) * chartW;
  const yScale = (v: number) => PAD.top + chartH - (v / maxVal) * chartH;

  const formatY = (v: number) => {
    if (mode === 'value') {
      return v >= 1_000_000
        ? `${(v / 1_000_000).toFixed(1)}M`
        : v >= 1_000
        ? `${(v / 1_000).toFixed(0)}k`
        : `${v}`;
    }
    return v >= 1_000 ? `${(v / 1_000).toFixed(0)}k` : `${Math.round(v)}`;
  };

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((f) => ({
    v: maxVal * f,
    y: yScale(maxVal * f),
  }));

  // X-axis ticks: every 5 years
  const xTicks = results[0]?.points
    .filter((_, i) => i % 5 === 0)
    .map((p, idx) => ({ label: `${p.year}`, x: xScale(idx * 5) })) ?? [];

  const pathFor = (result: ProjectionResult): string => {
    return result.points
      .map((_, i) => {
        const x = xScale(i);
        const y = yScale(getValue(result, i));
        return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // Find milestone points to annotate
  const milestones: { x: number; y: number; label: string; color: string }[] = [];
  results.forEach((r) => {
    if (r.optimalHarvestYear) {
      const idx = r.points.findIndex((p) => p.year === r.optimalHarvestYear);
      if (idx >= 0) {
        milestones.push({
          x: xScale(idx),
          y: yScale(getValue(r, idx)),
          label: 'Harvest',
          color: '#1B5E20',
        });
      }
    }
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      style={{ height: H }}
      aria-label="Growth projection chart"
    >
      {/* Y-axis grid lines & labels */}
      {yTicks.map(({ v, y }) => (
        <g key={v}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y}
            y2={y}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text
            x={PAD.left - 6}
            y={y + 4}
            textAnchor="end"
            fontSize={9}
            fill="#9ca3af"
          >
            {formatY(v)}
          </text>
        </g>
      ))}

      {/* X-axis ticks */}
      {xTicks.map(({ label, x }) => (
        <text key={label} x={x} y={H - 8} textAnchor="middle" fontSize={9} fill="#9ca3af">
          {label}
        </text>
      ))}

      {/* Data lines */}
      {results.map((r, ri) => {
        const colors = ['#1B5E20', '#059669', '#B87333'];
        const dashes = ['none', '6 3', '4 4'];
        return (
          <path
            key={r.scenario}
            d={pathFor(r)}
            fill="none"
            stroke={colors[ri]}
            strokeWidth={2}
            strokeDasharray={dashes[ri]}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Milestone dots */}
      {milestones.map((m, i) => (
        <g key={i}>
          <circle cx={m.x} cy={m.y} r={5} fill={m.color} />
          <text x={m.x + 7} y={m.y + 4} fontSize={8} fill={m.color} fontWeight="600">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function SummaryCards({ results }: { results: ProjectionResult[] }) {
  const noAction = results.find((r) => r.scenario === 'no_action');
  const thinning = results.find((r) => r.scenario === 'thinning_30pct');

  if (!noAction) return null;

  const yearsToHarvest =
    noAction.optimalHarvestYear != null
      ? noAction.optimalHarvestYear - new Date().getFullYear()
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
      {yearsToHarvest != null && (
        <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Star size={12} className="text-[var(--green)]" />
            <p className="text-[11px] font-semibold text-[var(--green)] uppercase tracking-wide">Optimal harvest</p>
          </div>
          <p className="text-lg font-bold text-[var(--text)]">
            In {yearsToHarvest} year{yearsToHarvest !== 1 ? 's' : ''}
          </p>
          <p className="text-[11px] text-[var(--text3)]">
            Expected yield {noAction.optimalHarvestVolume.toLocaleString('sv-SE')} m³
          </p>
          <p className="text-xs font-semibold text-[var(--green)]">
            ~{(noAction.optimalHarvestValueSEK / 1000).toFixed(0)}k SEK
          </p>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <Leaf size={12} className="text-[var(--green)]" />
          <p className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wide">Peak carbon</p>
        </div>
        <p className="text-lg font-bold text-[var(--text)]">
          {noAction.peakCarbonTonnes.toLocaleString('sv-SE', { maximumFractionDigits: 0 })} t CO₂
        </p>
        <p className="text-[11px] text-[var(--text3)]">
          Year {noAction.peakCarbonYear} (no-action scenario)
        </p>
        <p className="text-xs text-[var(--text2)]">
          +{noAction.totalCarbonTonnesOver20y.toLocaleString('sv-SE')} t over 20 yrs
        </p>
      </div>

      {thinning && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Scissors size={12} className="text-[var(--green)]" />
            <p className="text-[11px] font-semibold text-[var(--text3)] uppercase tracking-wide">Thinning benefit</p>
          </div>
          <p className="text-lg font-bold text-[var(--text)]">
            +{Math.max(0, Math.round(
              ((thinning.optimalHarvestValueSEK - noAction.optimalHarvestValueSEK) / Math.max(noAction.optimalHarvestValueSEK, 1)) * 100
            ))}%
          </p>
          <p className="text-[11px] text-[var(--text3)]">
            Estimated value uplift from 30% thinning
          </p>
          <p className="text-xs text-[var(--text2)]">
            vs no-action scenario
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GrowthProjectionChart({
  areaHa = 12.4,
  species = 'Spruce',
  currentAgeYears = 45,
  currentVolumeM3PerHa = 185,
  siteIndex = 24,
  className = '',
}: Props) {
  const [mode, setMode] = useState<YAxisMode>('volume');

  const parcel: Parcel = useMemo(() => ({
    id: 'chart-parcel',
    name: 'Current parcel',
    areaHa,
    species,
    currentAgeYears,
    currentVolumeM3PerHa,
    siteIndex,
  }), [areaHa, species, currentAgeYears, currentVolumeM3PerHa, siteIndex]);

  const results = useMemo(() => projectAllScenarios(parcel, 20), [parcel]);

  const modeButtons: { key: YAxisMode; label: string; icon: React.ReactNode; unit: string }[] = [
    { key: 'volume', label: 'Volume', icon: <TrendingUp size={12} />, unit: 'm³' },
    { key: 'carbon', label: 'Carbon', icon: <Leaf size={12} />, unit: 'tonne CO₂' },
    { key: 'value', label: 'Value', icon: <Banknote size={12} />, unit: 'SEK' },
  ];

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
        <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
          <TrendingUp size={14} className="text-[var(--green)]" />
          20-Year Growth Projection
        </h2>

        {/* Y-axis toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[var(--bg3)] border border-[var(--border)]">
          {modeButtons.map((btn) => (
            <button
              key={btn.key}
              onClick={() => setMode(btn.key)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                mode === btn.key
                  ? 'bg-[var(--green)] text-white'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {btn.icon}
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full overflow-x-auto">
        <LineChart results={results} mode={mode} />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        {results.map((r, i) => {
          const colors = ['#1B5E20', '#059669', '#B87333'];
          const dashes = ['none', '6px 3px', '4px 4px'];
          return (
            <div key={r.scenario} className="flex items-center gap-1.5">
              <div
                className="w-6 h-0.5 flex-shrink-0"
                style={{
                  backgroundColor: colors[i],
                  backgroundImage:
                    dashes[i] !== 'none'
                      ? `repeating-linear-gradient(to right, ${colors[i]} 0, ${colors[i]} 6px, transparent 6px, transparent 9px)`
                      : 'none',
                }}
              />
              <span className="text-[11px] text-[var(--text3)]">{r.scenarioLabel}</span>
            </div>
          );
        })}
        <span className="text-[11px] text-[var(--text3)] ml-auto">
          Unit: {modeButtons.find((b) => b.key === mode)?.unit}
        </span>
      </div>

      {/* Summary cards */}
      <SummaryCards results={results} />

      {/* Methodology note */}
      <p className="text-[10px] text-[var(--text3)] mt-4 border-t border-[var(--border)] pt-3">
        Projections based on Hägglund &amp; Lundmark site index tables (H100) + SLU production curves for Swedish forests.
        Timber value: stumpage prices 2024. Carbon: 1 m³ ≈ 0.73 tonne CO₂ (above-ground biomass only).
      </p>
    </div>
  );
}

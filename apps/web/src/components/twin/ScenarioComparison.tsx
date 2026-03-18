/**
 * ScenarioComparison — Compare 4 management scenarios across key metrics.
 * Charts: timber volume, cumulative revenue, carbon, risk evolution.
 * Table: key metrics at milestone years with "winner" highlighted.
 */

import { useMemo, useState } from 'react';
import type { ScenarioData, ScenarioId, AggregateSnapshot } from '@/hooks/useDigitalTwin';

interface ScenarioComparisonProps {
  scenarios: ScenarioData[];
  currentYear: number;
  getAggregateForYear: (year: number, scenario?: ScenarioId) => AggregateSnapshot;
}

type ChartMetric = 'volume' | 'revenue' | 'carbon' | 'risk';

const METRIC_LABELS: Record<ChartMetric, string> = {
  volume: 'Virkesvolym (m³)',
  revenue: 'Kumulativ intäkt (SEK)',
  carbon: 'Kol lagrat (ton)',
  risk: 'Barkborre-risk',
};

const MILESTONE_YEARS = [2030, 2040, 2060, 2080];

function formatCompact(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}k`;
  return value.toFixed(0);
}

function MiniChart({
  scenarios,
  metric,
  getAggregateForYear,
  currentYear,
}: {
  scenarios: ScenarioData[];
  metric: ChartMetric;
  getAggregateForYear: (year: number, scenario?: ScenarioId) => AggregateSnapshot;
  currentYear: number;
}) {
  const years = useMemo(() => {
    const arr: number[] = [];
    for (let y = 2026; y <= 2080; y += 2) arr.push(y);
    return arr;
  }, []);

  const seriesData = useMemo(() => {
    return scenarios.map(s => {
      const values = years.map(y => {
        const agg = getAggregateForYear(y, s.id);
        const rev = s.cumulativeRevenueSEK.get(y) || 0;
        switch (metric) {
          case 'volume': return agg.totalVolume;
          case 'revenue': return rev;
          case 'carbon': return agg.totalCarbon;
          case 'risk': return agg.avgBeetleRisk * 100;
        }
      });
      return { id: s.id, color: s.color, values };
    });
  }, [scenarios, years, metric, getAggregateForYear]);

  // Find global min/max for scaling
  const allValues = seriesData.flatMap(s => s.values);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;

  const svgW = 400;
  const svgH = 120;
  const pad = { top: 10, right: 10, bottom: 20, left: 50 };
  const chartW = svgW - pad.left - pad.right;
  const chartH = svgH - pad.top - pad.bottom;

  const xScale = (i: number) => pad.left + (i / (years.length - 1)) * chartW;
  const yScale = (v: number) => pad.top + chartH - ((v - minVal) / range) * chartH;

  // Current year marker position
  const currentIdx = years.findIndex(y => y >= currentYear);
  const currentX = currentIdx >= 0 ? xScale(currentIdx) : null;

  return (
    <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(f => {
        const val = minVal + f * range;
        const y = yScale(val);
        return (
          <g key={f}>
            <line x1={pad.left} y1={y} x2={svgW - pad.right} y2={y} stroke="var(--border)" strokeWidth="0.5" />
            <text x={pad.left - 4} y={y + 3} fill="var(--text3)" fontSize="7" textAnchor="end" fontFamily="monospace">
              {formatCompact(val)}
            </text>
          </g>
        );
      })}

      {/* Current year indicator */}
      {currentX && (
        <line x1={currentX} y1={pad.top} x2={currentX} y2={svgH - pad.bottom} stroke="var(--text3)" strokeWidth="0.5" strokeDasharray="3,3" />
      )}

      {/* Lines per scenario */}
      {seriesData.map(series => {
        const points = series.values.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
        return (
          <g key={series.id}>
            <polyline
              points={points}
              fill="none"
              stroke={series.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
              opacity="0.8"
            />
            {/* Filled area */}
            <polygon
              points={`${xScale(0)},${yScale(minVal)} ${points} ${xScale(years.length - 1)},${yScale(minVal)}`}
              fill={series.color}
              opacity="0.08"
            />
          </g>
        );
      })}

      {/* Decade labels */}
      {[2030, 2040, 2050, 2060, 2070, 2080].map(decade => {
        const idx = years.indexOf(decade);
        if (idx < 0) return null;
        return (
          <text key={decade} x={xScale(idx)} y={svgH - 4} fill="var(--text3)" fontSize="7" textAnchor="middle" fontFamily="monospace">
            {decade}
          </text>
        );
      })}
    </svg>
  );
}

export function ScenarioComparison({ scenarios, currentYear, getAggregateForYear }: ScenarioComparisonProps) {
  const [activeChart, setActiveChart] = useState<ChartMetric>('volume');

  // Table data at milestone years
  const tableData = useMemo(() => {
    return MILESTONE_YEARS.map(year => {
      const rows = scenarios.map(s => {
        const agg = getAggregateForYear(year, s.id);
        const rev = s.cumulativeRevenueSEK.get(year) || 0;
        return {
          scenarioId: s.id,
          name: s.name,
          color: s.color,
          volume: agg.totalVolume,
          carbon: agg.totalCarbon,
          value: agg.totalTimberValue,
          revenue: rev,
          health: agg.avgHealthScore,
          biodiversity: agg.avgBiodiversity,
          beetleRisk: agg.avgBeetleRisk,
        };
      });

      // Find winners (highest/lowest for each metric)
      const maxVolume = Math.max(...rows.map(r => r.volume));
      const maxCarbon = Math.max(...rows.map(r => r.carbon));
      const maxRevenue = Math.max(...rows.map(r => r.revenue));
      const maxBio = Math.max(...rows.map(r => r.biodiversity));
      const minRisk = Math.min(...rows.map(r => r.beetleRisk));

      return {
        year,
        rows: rows.map(r => ({
          ...r,
          winVolume: r.volume === maxVolume,
          winCarbon: r.carbon === maxCarbon,
          winRevenue: r.revenue === maxRevenue,
          winBio: r.biodiversity === maxBio,
          winRisk: r.beetleRisk === minRisk,
        })),
      };
    });
  }, [scenarios, getAggregateForYear]);

  return (
    <div className="space-y-4">
      {/* Chart selector */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text)]">Scenariojämförelse</h3>
          <div className="flex gap-1">
            {(Object.keys(METRIC_LABELS) as ChartMetric[]).map(m => (
              <button
                key={m}
                onClick={() => setActiveChart(m)}
                className="text-[10px] px-2 py-1 rounded-md font-medium transition-colors"
                style={{
                  background: activeChart === m ? 'var(--green)' : 'transparent',
                  color: activeChart === m ? '#000' : 'var(--text3)',
                }}
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        <div className="p-4">
          <MiniChart
            scenarios={scenarios}
            metric={activeChart}
            getAggregateForYear={getAggregateForYear}
            currentYear={currentYear}
          />

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-3">
            {scenarios.map(s => (
              <span key={s.id} className="flex items-center gap-1.5 text-[10px] text-[var(--text2)]">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text)]">Nyckeltal per milstolpe</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-2 text-left text-[var(--text3)] font-medium">År</th>
                <th className="px-3 py-2 text-left text-[var(--text3)] font-medium">Scenario</th>
                <th className="px-3 py-2 text-right text-[var(--text3)] font-medium">Volym (m³)</th>
                <th className="px-3 py-2 text-right text-[var(--text3)] font-medium">Kol (ton)</th>
                <th className="px-3 py-2 text-right text-[var(--text3)] font-medium">Intäkt (SEK)</th>
                <th className="px-3 py-2 text-right text-[var(--text3)] font-medium">Biodiversitet</th>
                <th className="px-3 py-2 text-right text-[var(--text3)] font-medium">Barkborre</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map(({ year, rows }) => (
                rows.map((r, i) => (
                  <tr
                    key={`${year}-${r.scenarioId}`}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg3)] transition-colors"
                  >
                    {i === 0 && (
                      <td className="px-3 py-1.5 font-mono font-bold text-[var(--text)]" rowSpan={rows.length}>
                        {year}
                      </td>
                    )}
                    <td className="px-3 py-1.5">
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                        <span className="text-[var(--text2)]">{r.name}</span>
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--text)]">
                      <CellValue value={formatCompact(r.volume)} isWinner={r.winVolume} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--text)]">
                      <CellValue value={formatCompact(r.carbon)} isWinner={r.winCarbon} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--text)]">
                      <CellValue value={formatCompact(r.revenue)} isWinner={r.winRevenue} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--text)]">
                      <CellValue value={`${(r.biodiversity * 100).toFixed(0)}%`} isWinner={r.winBio} />
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono text-[var(--text)]">
                      <CellValue value={`${(r.beetleRisk * 100).toFixed(0)}%`} isWinner={r.winRisk} invert />
                    </td>
                  </tr>
                ))
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CellValue({ value, isWinner, invert: _invert }: { value: string; isWinner: boolean; invert?: boolean }) {
  if (!isWinner) return <span>{value}</span>;
  return (
    <span className="font-bold px-1 py-0.5 rounded" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80' }}>
      {value}
    </span>
  );
}

import { useState } from 'react';
import { Thermometer, TrendingUp } from 'lucide-react';
import type { GDDComparison } from '@/hooks/useMicroclimate';

// ─── SVG Chart ───

function GDDChart({ data, selectedParcels }: { data: GDDComparison[]; selectedParcels: string[] }) {
  const visibleData = data.filter((d) => selectedParcels.includes(d.parcelId));
  if (visibleData.length === 0) return null;

  const width = 480;
  const height = 200;
  const margin = { top: 10, right: 10, bottom: 24, left: 40 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Find max GDD across all series
  const allValues = visibleData.flatMap((d) => [
    ...d.monthlyAccumulation.map((m) => m.fiveYearAvg),
    ...d.monthlyAccumulation.map((m) => m.current),
    ...d.monthlyAccumulation.map((m) => m.lastYear),
  ]);
  const maxGDD = Math.max(...allValues, 1200);

  const months = visibleData[0].monthlyAccumulation.map((m) => m.month);

  function xScale(i: number): number {
    return margin.left + (i / 11) * plotW;
  }
  function yScale(v: number): number {
    return margin.top + plotH - (v / maxGDD) * plotH;
  }

  // Color per parcel
  const parcelColors = ['#4ade80', '#60a5fa', '#f97316', '#a78bfa', '#f43f5e'];

  function linePath(values: number[]): string {
    return values.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(v)}`).join(' ');
  }

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: '220px' }}>
      {/* Grid lines */}
      {[0, 300, 600, 900, 1200].map((v) => (
        <g key={v}>
          <line
            x1={margin.left} y1={yScale(v)}
            x2={width - margin.right} y2={yScale(v)}
            stroke="var(--border)" strokeWidth="0.5"
            strokeDasharray={v === 600 || v === 900 ? '4,3' : ''}
          />
          <text x={margin.left - 4} y={yScale(v) + 3} textAnchor="end"
            fill="var(--text3)" fontSize="8" fontFamily="monospace">
            {v}
          </text>
        </g>
      ))}

      {/* 600 threshold label */}
      <text x={width - margin.right + 2} y={yScale(600) + 3} fill="#fbbf24" fontSize="7" fontFamily="monospace">
        600
      </text>
      {/* 900 threshold label */}
      <text x={width - margin.right + 2} y={yScale(900) + 3} fill="#ef4444" fontSize="7" fontFamily="monospace">
        900
      </text>

      {/* Month labels */}
      {months.map((m, i) => (
        <text key={m} x={xScale(i)} y={height - 4} textAnchor="middle"
          fill="var(--text3)" fontSize="8" fontFamily="monospace">
          {m}
        </text>
      ))}

      {/* 5-year average (first parcel only, dashed) */}
      <path
        d={linePath(visibleData[0].monthlyAccumulation.map((m) => m.fiveYearAvg))}
        fill="none" stroke="var(--text3)" strokeWidth="1" strokeDasharray="4,3"
      />

      {/* Per-parcel current year lines */}
      {visibleData.map((parcel, pIdx) => {
        const currentValues = parcel.monthlyAccumulation.map((m) => m.current);
        // Only draw up to the last non-zero point
        const lastNonZero = currentValues.reduce((last, v, i) => v > 0 ? i : last, 0);
        const trimmed = currentValues.slice(0, lastNonZero + 1);
        return (
          <path
            key={parcel.parcelId}
            d={trimmed.map((v, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yScale(v)}`).join(' ')}
            fill="none"
            stroke={parcelColors[pIdx % parcelColors.length]}
            strokeWidth="2"
            strokeLinecap="round"
          />
        );
      })}

      {/* Threshold lines (colored) */}
      <line x1={margin.left} y1={yScale(600)} x2={width - margin.right} y2={yScale(600)}
        stroke="#fbbf24" strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />
      <line x1={margin.left} y1={yScale(900)} x2={width - margin.right} y2={yScale(900)}
        stroke="#ef4444" strokeWidth="1" strokeDasharray="6,4" opacity="0.5" />
    </svg>
  );
}

// ─── Component ───

interface GrowingDegreeDaysProps {
  comparisons: GDDComparison[];
}

export function GrowingDegreeDays({ comparisons }: GrowingDegreeDaysProps) {
  const [selectedParcels, setSelectedParcels] = useState<string[]>(
    comparisons.slice(0, 3).map((c) => c.parcelId)
  );

  const parcelColors = ['#4ade80', '#60a5fa', '#f97316', '#a78bfa', '#f43f5e'];

  function toggleParcel(id: string) {
    setSelectedParcels((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={16} className="text-[var(--text2)]" />
            <h3 className="text-sm font-semibold text-[var(--text)]">
              Dygnsgradssumma (GDD)
            </h3>
          </div>
          <Thermometer size={14} className="text-[var(--text3)]" />
        </div>

        {/* Parcel selector pills */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {comparisons.map((c, i) => {
            const selected = selectedParcels.includes(c.parcelId);
            const color = parcelColors[i % parcelColors.length];
            return (
              <button
                key={c.parcelId}
                onClick={() => toggleParcel(c.parcelId)}
                className={`text-[10px] px-2.5 py-1 rounded-full border transition-all ${
                  selected
                    ? 'border-transparent font-semibold'
                    : 'border-[var(--border)] text-[var(--text3)]'
                }`}
                style={selected ? { background: `${color}20`, color } : {}}
              >
                {c.parcelName}
              </button>
            );
          })}
        </div>

        {/* Chart */}
        <div className="mb-3">
          <GDDChart data={comparisons} selectedParcels={selectedParcels} />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[var(--text3)]" style={{ borderTop: '1px dashed var(--text3)' }} />
            <span className="text-[9px] text-[var(--text3)]">5-årssnitt</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[var(--yellow)]" />
            <span className="text-[9px] text-[var(--yellow)]">600 GDD (1:a flygning)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 bg-[var(--red)]" />
            <span className="text-[9px] text-[var(--red)]">900 GDD (2:a generation)</span>
          </div>
        </div>

        {/* Parcel comparison table */}
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-[var(--text3)]">
                <th className="text-left py-1.5 font-medium">Skifte</th>
                <th className="text-right py-1.5 font-medium">Nuvarande</th>
                <th className="text-right py-1.5 font-medium">5-årssnitt</th>
                <th className="text-right py-1.5 font-medium">Förra året</th>
                <th className="text-right py-1.5 font-medium">Till 600 GDD</th>
              </tr>
            </thead>
            <tbody>
              {comparisons.map((c, i) => {
                const diff = c.currentGDD - c.fiveYearAvg;
                const diffColor = diff > 0 ? '#f97316' : diff < -20 ? '#60a5fa' : 'var(--text3)';
                return (
                  <tr key={c.parcelId} className="border-t border-[var(--border)]">
                    <td className="py-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: parcelColors[i % parcelColors.length] }} />
                        <span className="text-[var(--text)]">{c.parcelName}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono font-semibold text-[var(--text)]">{c.currentGDD}</td>
                    <td className="text-right font-mono text-[var(--text2)]">{c.fiveYearAvg}</td>
                    <td className="text-right font-mono text-[var(--text2)]">{c.lastYear}</td>
                    <td className="text-right font-mono" style={{ color: diffColor }}>
                      {c.currentGDD >= 600 ? (
                        <span className="text-[var(--red)]">Uppnådd</span>
                      ) : (
                        <span>{c.threshold600Date ?? '—'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

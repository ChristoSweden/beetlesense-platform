/**
 * RevenueBreakdown — Stacked bar chart showing revenue by stream over time
 * with toggle between absolute (kr) and percentage views.
 */
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';
import {
  type StrategyResult,
  formatKr,
} from '@/services/longRotationService';

interface Props {
  strategy: StrategyResult;
}

const STREAM_COLORS = {
  timber: '#4ade80',
  carbon: '#a78bfa',
  hunting: '#fbbf24',
  biodiversity: '#34d399',
  recreation: '#60a5fa',
};

const STREAM_KEYS = ['timber', 'carbon', 'hunting', 'biodiversity', 'recreation'] as const;
type StreamKey = typeof STREAM_KEYS[number];

const PADDING = { top: 20, right: 15, bottom: 40, left: 65 };
const CHART_HEIGHT = 280;
const CHART_WIDTH = 700;

export function RevenueBreakdown({ strategy }: Props) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState<'absolute' | 'percentage'>('absolute');

  // Aggregate into 5-year buckets for readability
  const buckets = useMemo(() => {
    const result: { yearStart: number; yearEnd: number; streams: Record<StreamKey, number> }[] = [];
    const step = 5;
    for (let i = 0; i < strategy.projections.length; i += step) {
      const slice = strategy.projections.slice(i, i + step);
      const streams: Record<StreamKey, number> = {
        timber: 0, carbon: 0, hunting: 0, biodiversity: 0, recreation: 0,
      };
      for (const p of slice) {
        for (const key of STREAM_KEYS) {
          streams[key] += Math.max(0, p.revenueByStream[key]);
        }
      }
      result.push({
        yearStart: slice[0].year,
        yearEnd: slice[slice.length - 1].year,
        streams,
      });
    }
    return result;
  }, [strategy]);

  // Find max for Y scale
  const maxTotal = useMemo(() => {
    if (viewMode === 'percentage') return 100;
    return Math.max(...buckets.map(b =>
      STREAM_KEYS.reduce((sum, k) => sum + b.streams[k], 0)
    ));
  }, [buckets, viewMode]);

  // Hidden revenue detection
  const hiddenRevenue = useMemo(() => {
    const totals = strategy.totalRevenueByStream;
    const missing: { key: StreamKey; potential: number }[] = [];
    if (totals.carbon === 0) {
      // Estimate what carbon could be worth
      const annualCO2 = strategy.projections.reduce(
        (max, p) => Math.max(max, p.co2Stored), 0
      ) / (strategy.projections.length || 1);
      if (annualCO2 > 0) missing.push({ key: 'carbon', potential: annualCO2 * 50 * 11.2 });
    }
    if (totals.hunting === 0) {
      missing.push({ key: 'hunting', potential: 55 * 45 * 40 }); // rough estimate
    }
    return missing;
  }, [strategy]);

  const innerW = CHART_WIDTH - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const barWidth = Math.max(8, (innerW / buckets.length) - 4);

  return (
    <div>
      {/* View toggle */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setViewMode('absolute')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'absolute'
              ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
              : 'text-[var(--text3)] hover:text-[var(--text2)] border border-[var(--border)]'
          }`}
        >
          {t('rotation.revenue.absolute')}
        </button>
        <button
          onClick={() => setViewMode('percentage')}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'percentage'
              ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
              : 'text-[var(--text3)] hover:text-[var(--text2)] border border-[var(--border)]'
          }`}
        >
          {t('rotation.revenue.percentage')}
        </button>
      </div>

      {/* Chart */}
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          className="w-full"
          style={{ minWidth: 500 }}
        >
          {/* Y-axis gridlines */}
          {[0, 0.25, 0.5, 0.75, 1.0].map(frac => {
            const v = maxTotal * frac;
            const y = PADDING.top + innerH * (1 - frac);
            return (
              <g key={frac}>
                <line
                  x1={PADDING.left} x2={CHART_WIDTH - PADDING.right}
                  y1={y} y2={y}
                  stroke="var(--border)" strokeWidth={0.5} strokeDasharray="4,4"
                />
                <text
                  x={PADDING.left - 6} y={y + 4}
                  textAnchor="end" fill="var(--text3)" fontSize={9} fontFamily="monospace"
                >
                  {viewMode === 'percentage' ? `${Math.round(v)}%` : formatKr(v)}
                </text>
              </g>
            );
          })}

          {/* Stacked bars */}
          {buckets.map((bucket, bi) => {
            const total = STREAM_KEYS.reduce((s, k) => s + bucket.streams[k], 0);
            const x = PADDING.left + (bi / buckets.length) * innerW + 2;
            let yOffset = 0;

            return (
              <g key={bi}>
                {STREAM_KEYS.map(key => {
                  const value = bucket.streams[key];
                  if (value <= 0) return null;
                  const normalizedValue = viewMode === 'percentage'
                    ? (total > 0 ? (value / total) * 100 : 0)
                    : value;
                  const barH = (normalizedValue / maxTotal) * innerH;
                  const y = PADDING.top + innerH - yOffset - barH;
                  yOffset += barH;

                  return (
                    <rect
                      key={key}
                      x={x}
                      y={y}
                      width={barWidth}
                      height={Math.max(0, barH)}
                      fill={STREAM_COLORS[key]}
                      rx={1}
                      opacity={0.85}
                    >
                      <title>{`${key}: ${formatKr(value)}`}</title>
                    </rect>
                  );
                })}
                {/* X label */}
                {bi % 2 === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={CHART_HEIGHT - PADDING.bottom + 14}
                    textAnchor="middle"
                    fill="var(--text3)"
                    fontSize={9}
                    fontFamily="monospace"
                  >
                    {t('rotation.chart.yearLabel', { year: bucket.yearStart })}
                  </text>
                )}
              </g>
            );
          })}

          {/* Axes */}
          <line
            x1={PADDING.left} x2={PADDING.left}
            y1={PADDING.top} y2={CHART_HEIGHT - PADDING.bottom}
            stroke="var(--border2)" strokeWidth={1}
          />
          <line
            x1={PADDING.left} x2={CHART_WIDTH - PADDING.right}
            y1={CHART_HEIGHT - PADDING.bottom} y2={CHART_HEIGHT - PADDING.bottom}
            stroke="var(--border2)" strokeWidth={1}
          />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3">
        {STREAM_KEYS.map(key => (
          <div key={key} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: STREAM_COLORS[key] }} />
            <span className="text-[10px] text-[var(--text2)]">
              {t(`rotation.revenue.stream.${key}`)}
            </span>
          </div>
        ))}
      </div>

      {/* Totals summary */}
      <div className="grid grid-cols-5 gap-2 mt-4">
        {STREAM_KEYS.map(key => {
          const total = strategy.totalRevenueByStream[key];
          return (
            <div key={key} className="text-center p-2 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
              <p className="text-xs font-mono font-semibold text-[var(--text)]">{formatKr(total)}</p>
              <p className="text-[9px] text-[var(--text3)] mt-0.5">
                {t(`rotation.revenue.stream.${key}`)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Hidden revenue callout */}
      {hiddenRevenue.length > 0 && (
        <div className="mt-4 p-3 rounded-lg border border-[var(--amber)]/30 bg-[var(--amber)]/5">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="text-[var(--amber)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-[var(--amber)]">
                {t('rotation.revenue.hiddenRevenue')}
              </p>
              {hiddenRevenue.map(h => (
                <p key={h.key} className="text-[10px] text-[var(--text2)] mt-1">
                  {t(`rotation.revenue.hiddenHint.${h.key}`, { amount: formatKr(h.potential) })}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { BenchmarkMetric } from '@/services/benchmarkService';
import { formatNumber } from '@/services/benchmarkService';

interface ComparisonChartProps {
  metrics: BenchmarkMetric[];
  countyName: string;
}

interface TooltipData {
  x: number;
  y: number;
  label: string;
  value: string;
  color: string;
}

export function ComparisonChart({ metrics, countyName }: ComparisonChartProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(0);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const metric = metrics[activeTab];
  if (!metric) return null;

  // Normalize values for bar heights
  const maxVal = Math.max(metric.userValue, metric.countyAvg, metric.nationalAvg) * 1.15;

  function formatVal(value: number, key: string): string {
    if (key === 'timberValue') return formatNumber(value) + ' kr';
    if (key === 'speciesDiversity') return value.toFixed(2);
    if (key === 'carbonSequestration') return value.toFixed(1);
    return value.toFixed(1);
  }

  const barData = [
    {
      label: t('benchmark.yourParcel'),
      value: metric.userValue,
      color: metric.userValue >= metric.countyAvg ? '#4ade80' : '#ef4444',
    },
    {
      label: t('benchmark.countyAvgLabel', { county: countyName }),
      value: metric.countyAvg,
      color: '#86efac60',
    },
    {
      label: t('benchmark.nationalAvgLabel'),
      value: metric.nationalAvg,
      color: '#86efac30',
    },
  ];

  const chartWidth = 400;
  const chartHeight = 200;
  const barGroupWidth = chartWidth / barData.length;
  const barWidth = 60;
  const topPadding = 20;
  const bottomPadding = 40;
  const drawableHeight = chartHeight - topPadding - bottomPadding;

  return (
    <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">
        {t('benchmark.comparison')}
      </h3>

      {/* Metric tabs */}
      <div className="flex flex-wrap gap-1 mb-5">
        {metrics.map((m, i) => (
          <button
            key={m.key}
            onClick={() => { setActiveTab(i); setTooltip(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              i === activeTab
                ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] border border-transparent'
            }`}
          >
            {t(`benchmark.metrics.${m.key}`)}
          </button>
        ))}
      </div>

      {/* SVG Chart */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full max-w-lg mx-auto"
          aria-label={t('benchmark.comparisonChartLabel')}
          role="img"
        >
          {/* Grid lines */}
          {[0.25, 0.5, 0.75, 1].map((frac) => {
            const y = topPadding + drawableHeight * (1 - frac);
            return (
              <line
                key={frac}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="var(--border)"
                strokeWidth="0.5"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Bars */}
          {barData.map((bar, i) => {
            const barHeight = (bar.value / maxVal) * drawableHeight;
            const x = barGroupWidth * i + (barGroupWidth - barWidth) / 2;
            const y = topPadding + drawableHeight - barHeight;

            return (
              <g key={bar.label}>
                {/* Bar */}
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={bar.color}
                  className="transition-all duration-500 ease-out cursor-pointer"
                  onMouseEnter={(e) => {
                    const rect = (e.target as SVGRectElement).getBoundingClientRect();
                    const svgRect = (e.target as SVGRectElement).ownerSVGElement?.getBoundingClientRect();
                    if (svgRect) {
                      setTooltip({
                        x: rect.left - svgRect.left + rect.width / 2,
                        y: rect.top - svgRect.top - 8,
                        label: bar.label,
                        value: formatVal(bar.value, metric.key) + ' ' + metric.unit,
                        color: bar.color,
                      });
                    }
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />

                {/* Value label on bar */}
                <text
                  x={x + barWidth / 2}
                  y={y - 6}
                  textAnchor="middle"
                  fill="var(--text2)"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {formatVal(bar.value, metric.key)}
                </text>

                {/* Bar label below */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="var(--text3)"
                  fontSize="9"
                >
                  {bar.label.length > 18 ? bar.label.slice(0, 16) + '...' : bar.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="absolute pointer-events-none px-2 py-1 rounded-lg border border-[var(--border)] text-xs"
            style={{
              background: 'var(--bg)',
              left: tooltip.x,
              top: tooltip.y,
              transform: 'translate(-50%, -100%)',
            }}
          >
            <p className="text-[var(--text)] font-medium">{tooltip.label}</p>
            <p className="font-mono" style={{ color: tooltip.color }}>{tooltip.value}</p>
          </div>
        )}
      </div>

      {/* Unit label */}
      <p className="text-[10px] text-[var(--text3)] text-center mt-2 font-mono">
        {metric.unit}
      </p>
    </div>
  );
}

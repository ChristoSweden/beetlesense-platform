import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { YearProjection } from '@/services/scenarioEngine';

// ─── Types ───

interface ProjectionChartProps {
  /** "Do Nothing" baseline */
  baseline: YearProjection[];
  /** "Take Action" scenario */
  action: YearProjection[];
  /** Which metric to display */
  metric: 'health' | 'timberValue' | 'beetleRisk' | 'biodiversity' | 'carbonSeq';
  /** Chart title i18n key */
  titleKey: string;
  /** Value formatter */
  formatValue?: (v: number) => string;
  /** Height in px */
  height?: number;
}

// ─── Helpers ───

function defaultFormat(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(Math.round(v));
}

function getMetricValue(proj: YearProjection, metric: ProjectionChartProps['metric']): number {
  return proj[metric];
}

// ─── Component ───

export function ProjectionChart({
  baseline,
  action,
  metric,
  titleKey,
  formatValue = defaultFormat,
  height = 200,
}: ProjectionChartProps) {
  const { t } = useTranslation();
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  const padding = { top: 24, right: 16, bottom: 32, left: 52 };
  const width = 480;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute data ranges
  const { minVal, maxVal, years } = useMemo(() => {
    const allVals = [
      ...baseline.map((p) => getMetricValue(p, metric)),
      ...action.map((p) => getMetricValue(p, metric)),
    ];
    // Include confidence bands
    for (const p of [...baseline, ...action]) {
      const v = getMetricValue(p, metric);
      allVals.push(v * p.confidenceLow, v * p.confidenceHigh);
    }
    const min = Math.min(...allVals);
    const max = Math.max(...allVals);
    const range = max - min || 1;
    return {
      minVal: min - range * 0.08,
      maxVal: max + range * 0.08,
      years: baseline.length - 1,
    };
  }, [baseline, action, metric]);

  const toX = useCallback(
    (year: number) => padding.left + (year / Math.max(years, 1)) * chartW,
    [years, chartW, padding.left],
  );
  const toY = useCallback(
    (val: number) => padding.top + chartH - ((val - minVal) / (maxVal - minVal)) * chartH,
    [minVal, maxVal, chartH, padding.top],
  );

  // Build SVG path strings
  const buildPath = useCallback(
    (data: YearProjection[]) =>
      data
        .map((p, i) => {
          const x = toX(p.year);
          const y = toY(getMetricValue(p, metric));
          return `${i === 0 ? 'M' : 'L'}${x},${y}`;
        })
        .join(' '),
    [toX, toY, metric],
  );

  // Build confidence band polygon path
  const buildBand = useCallback(
    (data: YearProjection[]) => {
      const upperPoints = data.map((p) => {
        const v = getMetricValue(p, metric);
        return `${toX(p.year)},${toY(v * p.confidenceHigh)}`;
      });
      const lowerPoints = [...data].reverse().map((p) => {
        const v = getMetricValue(p, metric);
        return `${toX(p.year)},${toY(v * p.confidenceLow)}`;
      });
      return `M${upperPoints.join(' L')} L${lowerPoints.join(' L')} Z`;
    },
    [toX, toY, metric],
  );

  const baselinePath = useMemo(() => buildPath(baseline), [buildPath, baseline]);
  const actionPath = useMemo(() => buildPath(action), [buildPath, action]);
  const baselineBand = useMemo(() => buildBand(baseline), [buildBand, baseline]);
  const actionBand = useMemo(() => buildBand(action), [buildBand, action]);

  // Annotations from action scenario
  const annotations = useMemo(
    () => action.filter((p) => p.annotationKey),
    [action],
  );

  // Hovered data
  const hoveredData = useMemo(() => {
    if (hoveredYear === null) return null;
    const b = baseline.find((p) => p.year === hoveredYear);
    const a = action.find((p) => p.year === hoveredYear);
    return b && a ? { baseline: getMetricValue(b, metric), action: getMetricValue(a, metric) } : null;
  }, [hoveredYear, baseline, action, metric]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const count = 4;
    const step = (maxVal - minVal) / count;
    return Array.from({ length: count + 1 }, (_, i) => minVal + step * i);
  }, [minVal, maxVal]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const svgX = ((e.clientX - rect.left) / rect.width) * width;
      const relX = svgX - padding.left;
      const yearF = (relX / chartW) * years;
      const year = Math.round(Math.max(0, Math.min(years, yearF)));
      setHoveredYear(year);
    },
    [width, padding.left, chartW, years],
  );

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
          {t(titleKey)}
        </h3>
        {/* Legend */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#ef4444] opacity-60" style={{ borderTop: '2px dashed #ef4444' }} />
            <span className="text-[10px] text-[var(--text3)]">{t('scenarios.legend.baseline')}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 bg-[#4ade80]" />
            <span className="text-[10px] text-[var(--text3)]">{t('scenarios.legend.action')}</span>
          </div>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        style={{ maxHeight: `${height}px` }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredYear(null)}
        role="img"
        aria-label={t(titleKey)}
      >
        {/* Y-axis grid lines & labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={toY(tick)}
              y2={toY(tick)}
              stroke="var(--border)"
              strokeWidth={0.5}
              opacity={0.4}
            />
            <text
              x={padding.left - 6}
              y={toY(tick) + 3}
              textAnchor="end"
              className="text-[10px] fill-[var(--text3)]"
              style={{ fontFamily: 'monospace', fontSize: '9px' }}
            >
              {formatValue(tick)}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {baseline.map((p) => (
          <text
            key={p.year}
            x={toX(p.year)}
            y={height - 6}
            textAnchor="middle"
            className="text-[10px] fill-[var(--text3)]"
            style={{ fontFamily: 'monospace', fontSize: '9px' }}
          >
            {t('scenarios.yearLabel', { year: p.year })}
          </text>
        ))}

        {/* Confidence bands */}
        <path d={baselineBand} fill="#ef4444" opacity={0.06} />
        <path d={actionBand} fill="#4ade80" opacity={0.08} />

        {/* Baseline line (red dashed) */}
        <path
          d={baselinePath}
          fill="none"
          stroke="#ef4444"
          strokeWidth={2}
          strokeDasharray="6,4"
          opacity={0.7}
        />

        {/* Action line (green solid) */}
        <path d={actionPath} fill="none" stroke="#4ade80" strokeWidth={2.5} />

        {/* Data points on action line */}
        {action.map((p) => (
          <circle
            key={p.year}
            cx={toX(p.year)}
            cy={toY(getMetricValue(p, metric))}
            r={hoveredYear === p.year ? 5 : 3}
            fill="#4ade80"
            stroke="var(--bg2)"
            strokeWidth={2}
          />
        ))}

        {/* Data points on baseline */}
        {baseline.map((p) => (
          <circle
            key={p.year}
            cx={toX(p.year)}
            cy={toY(getMetricValue(p, metric))}
            r={hoveredYear === p.year ? 4 : 2.5}
            fill="#ef4444"
            stroke="var(--bg2)"
            strokeWidth={1.5}
            opacity={0.7}
          />
        ))}

        {/* Annotation markers */}
        {annotations.map((p) => {
          const x = toX(p.year);
          const y = toY(getMetricValue(p, metric));
          return (
            <g key={`ann-${p.year}`}>
              <line
                x1={x}
                y1={y - 8}
                x2={x}
                y2={padding.top}
                stroke="var(--amber)"
                strokeWidth={1}
                strokeDasharray="2,2"
                opacity={0.5}
              />
              <circle cx={x} cy={y - 8} r={3} fill="var(--amber)" />
              <text
                x={x}
                y={padding.top - 4}
                textAnchor="middle"
                style={{ fontSize: '8px', fill: 'var(--amber)' }}
              >
                {t(p.annotationKey!)}
              </text>
            </g>
          );
        })}

        {/* Hover line */}
        {hoveredYear !== null && (
          <line
            x1={toX(hoveredYear)}
            x2={toX(hoveredYear)}
            y1={padding.top}
            y2={height - padding.bottom}
            stroke="var(--text3)"
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.5}
          />
        )}
      </svg>

      {/* Tooltip */}
      {hoveredData && hoveredYear !== null && (
        <div
          className="mt-2 flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-mono"
          style={{ background: 'var(--bg3)' }}
          aria-live="polite"
        >
          <span className="text-[var(--text3)]">
            {t('scenarios.yearLabel', { year: hoveredYear })}
          </span>
          <div className="flex items-center gap-4">
            <span className="text-[#ef4444]">
              {t('scenarios.legend.baseline')}: {formatValue(hoveredData.baseline)}
            </span>
            <span className="text-[#4ade80]">
              {t('scenarios.legend.action')}: {formatValue(hoveredData.action)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

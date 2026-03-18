/**
 * ProjectionChart — SVG chart showing cumulative NPV over 80-120 years
 * for multiple forestry strategies with sensitivity bands and event markers.
 */
import { useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  type StrategyResult,
  STRATEGY_COLORS,
  formatKr,
  type StrategyId,
} from '@/services/longRotationService';

interface Props {
  strategies: StrategyResult[];
  horizonYears: number;
  /** Optional sensitivity bands (low/high NPV per year per strategy) */
  sensitivityBands?: Record<StrategyId, { low: number[]; high: number[] }>;
}

const PADDING = { top: 30, right: 20, bottom: 50, left: 75 };
const CHART_HEIGHT = 380;

export function ProjectionChart({ strategies, horizonYears, sensitivityBands }: Props) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    year: number;
    values: { id: StrategyId; label: string; npv: number; color: string }[];
  } | null>(null);
  const [hoveredStrategy, setHoveredStrategy] = useState<StrategyId | null>(null);

  const { width, xScale, yScale, yMin, yMax } = useMemo(() => {
    const w = 800;
    const innerW = w - PADDING.left - PADDING.right;
    const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

    // Find min/max NPV across all strategies
    let min = 0;
    let max = 0;
    for (const s of strategies) {
      for (const p of s.projections) {
        if (p.cumulativeNPV < min) min = p.cumulativeNPV;
        if (p.cumulativeNPV > max) max = p.cumulativeNPV;
      }
    }
    // Add some padding
    min = min * 1.1;
    max = max * 1.15;

    const xScale = (year: number) => PADDING.left + (year / horizonYears) * innerW;
    const yScale = (npv: number) => PADDING.top + innerH - ((npv - min) / (max - min)) * innerH;

    return { width: w, xScale, yScale, yMin: min, yMax: max };
  }, [strategies, horizonYears]);

  // Build SVG paths for each strategy
  const paths = useMemo(() => {
    return strategies.map(s => {
      const points = s.projections.map(
        p => `${xScale(p.year)},${yScale(p.cumulativeNPV)}`
      );
      return {
        id: s.id,
        color: STRATEGY_COLORS[s.id],
        d: `M ${points.join(' L ')}`,
        label: s.label,
      };
    });
  }, [strategies, xScale, yScale]);

  // Sensitivity bands
  const bands = useMemo(() => {
    if (!sensitivityBands) return [];
    return Object.entries(sensitivityBands).map(([id, band]) => {
      const upper = band.high.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' L ');
      const lower = band.low.map((v, i) => `${xScale(i)},${yScale(v)}`).reverse().join(' L ');
      return {
        id: id as StrategyId,
        color: STRATEGY_COLORS[id as StrategyId],
        d: `M ${upper} L ${lower} Z`,
      };
    });
  }, [sensitivityBands, xScale, yScale]);

  // Event markers (thinning, clearfell)
  const eventMarkers = useMemo(() => {
    const markers: { x: number; y: number; type: string; label: string; strategyId: StrategyId }[] = [];
    for (const s of strategies) {
      for (const p of s.projections) {
        for (const e of p.events) {
          if (e.type === 'thinning' || e.type === 'clearfell' || e.type === 'selective_harvest') {
            markers.push({
              x: xScale(p.year),
              y: yScale(p.cumulativeNPV),
              type: e.type,
              label: e.label,
              strategyId: s.id,
            });
          }
        }
      }
    }
    return markers;
  }, [strategies, xScale, yScale]);

  // X-axis ticks
  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = horizonYears <= 80 ? 10 : 20;
    for (let y = 0; y <= horizonYears; y += step) ticks.push(y);
    return ticks;
  }, [horizonYears]);

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const range = yMax - yMin;
    const step = range > 5_000_000 ? 1_000_000 :
                 range > 2_000_000 ? 500_000 :
                 range > 500_000 ? 200_000 : 100_000;
    const ticks: number[] = [];
    const start = Math.ceil(yMin / step) * step;
    for (let v = start; v <= yMax; v += step) ticks.push(v);
    return ticks;
  }, [yMin, yMax]);

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const innerW = width - PADDING.left - PADDING.right;
    const relX = mouseX - PADDING.left;
    const year = Math.round((relX / innerW) * horizonYears);
    if (year < 0 || year > horizonYears) {
      setTooltip(null);
      return;
    }

    const values = strategies.map(s => {
      const p = s.projections[year] ?? s.projections[s.projections.length - 1];
      return {
        id: s.id,
        label: s.label,
        npv: p?.cumulativeNPV ?? 0,
        color: STRATEGY_COLORS[s.id],
      };
    }).sort((a, b) => b.npv - a.npv);

    setTooltip({ x: xScale(year), y: PADDING.top + 10, year, values });
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
        className="w-full"
        style={{ minWidth: 600 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {yTicks.map(v => (
          <line
            key={`grid-${v}`}
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={yScale(v)}
            y2={yScale(v)}
            stroke="var(--border)"
            strokeWidth={0.5}
            strokeDasharray="4,4"
          />
        ))}

        {/* Zero line */}
        {yMin < 0 && yMax > 0 && (
          <line
            x1={PADDING.left}
            x2={width - PADDING.right}
            y1={yScale(0)}
            y2={yScale(0)}
            stroke="var(--text3)"
            strokeWidth={0.5}
          />
        )}

        {/* Sensitivity bands */}
        {bands.map(b => (
          <path
            key={`band-${b.id}`}
            d={b.d}
            fill={b.color}
            fillOpacity={0.08}
          />
        ))}

        {/* Strategy lines */}
        {paths.map(p => (
          <path
            key={p.id}
            d={p.d}
            fill="none"
            stroke={p.color}
            strokeWidth={hoveredStrategy === p.id ? 3 : 2}
            opacity={hoveredStrategy && hoveredStrategy !== p.id ? 0.3 : 1}
            className="transition-opacity duration-200"
          />
        ))}

        {/* Event markers */}
        {eventMarkers.map((m, i) => (
          <g key={`event-${i}`} opacity={hoveredStrategy && hoveredStrategy !== m.strategyId ? 0.1 : 0.7}>
            <circle
              cx={m.x}
              cy={m.y}
              r={m.type === 'clearfell' ? 5 : 3}
              fill={m.type === 'clearfell' ? '#ef4444' : STRATEGY_COLORS[m.strategyId]}
              stroke="var(--bg)"
              strokeWidth={1}
            />
          </g>
        ))}

        {/* X-axis */}
        <line
          x1={PADDING.left}
          x2={width - PADDING.right}
          y1={CHART_HEIGHT - PADDING.bottom}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="var(--border2)"
          strokeWidth={1}
        />
        {xTicks.map(yr => (
          <g key={`xtick-${yr}`}>
            <line
              x1={xScale(yr)}
              x2={xScale(yr)}
              y1={CHART_HEIGHT - PADDING.bottom}
              y2={CHART_HEIGHT - PADDING.bottom + 5}
              stroke="var(--text3)"
              strokeWidth={1}
            />
            <text
              x={xScale(yr)}
              y={CHART_HEIGHT - PADDING.bottom + 18}
              textAnchor="middle"
              fill="var(--text3)"
              fontSize={10}
              fontFamily="monospace"
            >
              {t('rotation.chart.yearLabel', { year: yr })}
            </text>
          </g>
        ))}
        <text
          x={PADDING.left + (width - PADDING.left - PADDING.right) / 2}
          y={CHART_HEIGHT - 5}
          textAnchor="middle"
          fill="var(--text3)"
          fontSize={11}
        >
          {t('rotation.chart.xAxis')}
        </text>

        {/* Y-axis */}
        <line
          x1={PADDING.left}
          x2={PADDING.left}
          y1={PADDING.top}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="var(--border2)"
          strokeWidth={1}
        />
        {yTicks.map(v => (
          <text
            key={`ytick-${v}`}
            x={PADDING.left - 8}
            y={yScale(v) + 4}
            textAnchor="end"
            fill="var(--text3)"
            fontSize={10}
            fontFamily="monospace"
          >
            {formatKr(v)}
          </text>
        ))}

        {/* Tooltip hover line */}
        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PADDING.top}
              y2={CHART_HEIGHT - PADDING.bottom}
              stroke="var(--text3)"
              strokeWidth={1}
              strokeDasharray="4,2"
              opacity={0.5}
            />
            {tooltip.values.map(v => {
              const p = strategies.find(s => s.id === v.id)?.projections[tooltip.year];
              if (!p) return null;
              return (
                <circle
                  key={v.id}
                  cx={tooltip.x}
                  cy={yScale(v.npv)}
                  r={4}
                  fill={v.color}
                  stroke="var(--bg)"
                  strokeWidth={2}
                />
              );
            })}
          </>
        )}
      </svg>

      {/* Tooltip overlay */}
      {tooltip && (
        <div
          className="absolute z-10 pointer-events-none px-3 py-2 rounded-lg border border-[var(--border)] shadow-xl"
          style={{
            background: 'var(--bg2)',
            left: `${Math.min(tooltip.x + 12, width - 200)}px`,
            top: `${tooltip.y}px`,
          }}
        >
          <p className="text-[10px] font-mono text-[var(--text3)] mb-1.5">
            {t('rotation.chart.yearLabel', { year: tooltip.year })}
          </p>
          {tooltip.values.map(v => (
            <div key={v.id} className="flex items-center gap-2 mb-0.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.color }} />
              <span className="text-[10px] text-[var(--text2)] flex-1">{v.label}</span>
              <span className="text-[10px] font-mono font-semibold text-[var(--text)]">
                {formatKr(v.npv)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-3 px-2">
        {strategies.map(s => (
          <button
            key={s.id}
            className="flex items-center gap-1.5 text-xs transition-opacity"
            style={{ opacity: hoveredStrategy && hoveredStrategy !== s.id ? 0.4 : 1 }}
            onMouseEnter={() => setHoveredStrategy(s.id)}
            onMouseLeave={() => setHoveredStrategy(null)}
          >
            <div className="w-3 h-0.5 rounded" style={{ background: STRATEGY_COLORS[s.id] }} />
            <span className="text-[var(--text2)]">{s.label}</span>
          </button>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-[var(--text3)]">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>{t('rotation.chart.clearfell')}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-[var(--text3)]">
          <div className="w-2 h-2 rounded-full bg-[var(--green)]" />
          <span>{t('rotation.chart.thinning')}</span>
        </div>
      </div>
    </div>
  );
}

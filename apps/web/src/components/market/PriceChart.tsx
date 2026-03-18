import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ASSORTMENTS,
  HISTORICAL_PRICES,
  type Assortment,
} from '@/services/timberMarketService';

const CHART_W = 720;
const CHART_H = 320;
const PAD = { top: 20, right: 20, bottom: 40, left: 64 };
const PLOT_W = CHART_W - PAD.left - PAD.right;
const PLOT_H = CHART_H - PAD.top - PAD.bottom;

interface TooltipData {
  x: number;
  y: number;
  month: string;
  prices: { name: string; color: string; value: number }[];
}

export function PriceChart() {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const svgRef = useRef<SVGSVGElement>(null);

  const [enabledAssortments, setEnabledAssortments] = useState<Set<Assortment>>(
    new Set(['gran_timmer', 'gran_massa', 'tall_timmer', 'tall_massa']),
  );
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const data = HISTORICAL_PRICES;

  // Calculate Y-axis range from enabled assortments
  const { yMin, yMax, yTicks } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    for (const month of data) {
      for (const id of enabledAssortments) {
        const v = month.prices[id];
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    // Round to nice numbers
    min = Math.floor(min / 50) * 50;
    max = Math.ceil(max / 50) * 50;
    if (min === max) max = min + 100;
    const step = Math.ceil((max - min) / 5 / 50) * 50;
    const ticks: number[] = [];
    for (let v = min; v <= max; v += step) ticks.push(v);
    return { yMin: min, yMax: max, yTicks: ticks };
  }, [data, enabledAssortments]);

  const xScale = useCallback(
    (i: number) => PAD.left + (i / (data.length - 1)) * PLOT_W,
    [data.length],
  );
  const yScale = useCallback(
    (v: number) => PAD.top + PLOT_H - ((v - yMin) / (yMax - yMin)) * PLOT_H,
    [yMin, yMax],
  );

  const toggleAssortment = (id: Assortment) => {
    setEnabledAssortments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size > 1) next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const scaleX = CHART_W / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleX;

    // Find nearest month
    let nearestIdx = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < data.length; i++) {
      const dist = Math.abs(xScale(i) - mouseX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }

    const month = data[nearestIdx];
    const prices = ASSORTMENTS.filter((a) => enabledAssortments.has(a.id)).map((a) => ({
      name: lang === 'sv' ? a.nameSv : a.nameEn,
      color: a.color,
      value: month.prices[a.id],
    }));

    setTooltip({
      x: xScale(nearestIdx),
      y: PAD.top,
      month: month.label,
      prices,
    });
  };

  const handleMouseLeave = () => setTooltip(null);

  // Build line paths
  const lines = useMemo(() => {
    return ASSORTMENTS.filter((a) => enabledAssortments.has(a.id)).map((a) => {
      const points = data.map((m, i) => `${xScale(i)},${yScale(m.prices[a.id])}`);
      return { id: a.id, color: a.color, d: `M${points.join('L')}` };
    });
  }, [data, enabledAssortments, xScale, yScale]);

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Legend / toggles */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ASSORTMENTS.map((a) => {
          const active = enabledAssortments.has(a.id);
          return (
            <button
              key={a.id}
              onClick={() => toggleAssortment(a.id)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all
                ${active
                  ? 'border-[var(--border2)] text-[var(--text)]'
                  : 'border-[var(--border)] text-[var(--text3)] opacity-50'
                }
              `}
              style={active ? { background: `${a.color}15` } : undefined}
            >
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: a.color, opacity: active ? 1 : 0.3 }}
              />
              {lang === 'sv' ? a.nameSv : a.nameEn}
            </button>
          );
        })}
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${CHART_W} ${CHART_H}`}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          role="img"
          aria-label="Timber price chart showing 12-month price history"
        >
          {/* Grid lines */}
          {yTicks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                y1={yScale(v)}
                x2={CHART_W - PAD.right}
                y2={yScale(v)}
                stroke="var(--border)"
                strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 8}
                y={yScale(v) + 4}
                textAnchor="end"
                className="text-[10px]"
                fill="var(--text3)"
                fontFamily="monospace"
              >
                {v}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {data.map((m, i) => (
            <text
              key={m.month}
              x={xScale(i)}
              y={CHART_H - 8}
              textAnchor="middle"
              className="text-[10px]"
              fill="var(--text3)"
              fontFamily="monospace"
            >
              {m.label}
            </text>
          ))}

          {/* Y-axis label */}
          <text
            x={12}
            y={PAD.top + PLOT_H / 2}
            textAnchor="middle"
            transform={`rotate(-90, 12, ${PAD.top + PLOT_H / 2})`}
            className="text-[10px]"
            fill="var(--text3)"
            fontFamily="monospace"
          >
            kr/m³fub
          </text>

          {/* Lines */}
          {lines.map((line) => (
            <path
              key={line.id}
              d={line.d}
              fill="none"
              stroke={line.color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}

          {/* Current price dots (last data point) */}
          {lines.map((line) => {
            const lastIdx = data.length - 1;
            const lastPrice = data[lastIdx].prices[line.id as Assortment];
            return (
              <circle
                key={`dot-${line.id}`}
                cx={xScale(lastIdx)}
                cy={yScale(lastPrice)}
                r={4}
                fill={line.color}
                stroke="var(--bg2)"
                strokeWidth={2}
              />
            );
          })}

          {/* Tooltip crosshair */}
          {tooltip && (
            <line
              x1={tooltip.x}
              y1={PAD.top}
              x2={tooltip.x}
              y2={PAD.top + PLOT_H}
              stroke="var(--text3)"
              strokeWidth={1}
              strokeDasharray="3 3"
              style={{ pointerEvents: 'none' }}
            />
          )}
        </svg>

        {/* Tooltip overlay */}
        {tooltip && (
          <div
            className="absolute z-10 pointer-events-none rounded-lg border border-[var(--border2)] p-2.5 shadow-lg text-[11px]"
            style={{
              background: 'var(--bg)',
              left: `${(tooltip.x / CHART_W) * 100}%`,
              top: '20px',
              transform: tooltip.x > CHART_W * 0.7 ? 'translateX(-110%)' : 'translateX(10%)',
            }}
          >
            <p className="font-mono font-semibold text-[var(--text)] mb-1.5">{tooltip.month}</p>
            {tooltip.prices.map((p) => (
              <div key={p.name} className="flex items-center gap-2 py-0.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                <span className="text-[var(--text2)]">{p.name}</span>
                <span className="ml-auto font-mono text-[var(--text)]">{p.value} kr</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

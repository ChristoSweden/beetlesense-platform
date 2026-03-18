import { useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { GrowthProjection, ScenarioResult, ClimateScenario } from '@/services/growthModelService';

interface GrowthChartProps {
  scenarios: ScenarioResult[];
  standardProjection: GrowthProjection[];
  currentAge: number;
  rotationAge: number;
  maxAge?: number;
  /** Which age range to display */
  viewRange?: [number, number];
}

const SCENARIO_COLORS: Record<ClimateScenario, string> = {
  rcp45: '#4ade80',  // green
  rcp60: '#facc15',  // amber
  rcp85: '#f87171',  // red
};

const SCENARIO_LABELS: Record<ClimateScenario, string> = {
  rcp45: 'RCP 4.5',
  rcp60: 'RCP 6.0',
  rcp85: 'RCP 8.5',
};

interface TooltipData {
  x: number;
  y: number;
  age: number;
  year: number;
  values: { scenario: string; volume: number; mai: number; color: string }[];
  standard: { volume: number; mai: number };
}

export function GrowthChart({
  scenarios,
  standardProjection,
  currentAge,
  rotationAge,
  maxAge = 120,
  viewRange,
}: GrowthChartProps) {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const startAge = viewRange?.[0] ?? 1;
  const endAge = viewRange?.[1] ?? maxAge;

  // Chart dimensions
  const width = 700;
  const height = 360;
  const padding = { top: 20, right: 20, bottom: 50, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Compute scales
  const { xScale, yScale, maxVol } = useMemo(() => {
    let maxV = 0;
    for (const s of scenarios) {
      for (const p of s.projections) {
        if (p.age >= startAge && p.age <= endAge && p.volume > maxV) maxV = p.volume;
      }
    }
    for (const p of standardProjection) {
      if (p.age >= startAge && p.age <= endAge && p.volume > maxV) maxV = p.volume;
    }
    maxV = Math.ceil(maxV / 50) * 50 + 50; // nice ceiling

    return {
      xScale: (age: number) => padding.left + ((age - startAge) / (endAge - startAge)) * chartW,
      yScale: (vol: number) => padding.top + chartH - (vol / maxV) * chartH,
      maxVol: maxV,
    };
  }, [scenarios, standardProjection, startAge, endAge, chartW, chartH, padding.left, padding.top]);

  // Build path data
  const buildPath = useCallback(
    (projections: GrowthProjection[]) => {
      const points = projections.filter((p) => p.age >= startAge && p.age <= endAge);
      if (points.length === 0) return '';
      return points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.age)} ${yScale(p.volume)}`)
        .join(' ');
    },
    [xScale, yScale, startAge, endAge],
  );

  // Confidence band (area between RCP 4.5 and RCP 8.5)
  const confidenceBand = useMemo(() => {
    const low = scenarios.find((s) => s.scenario === 'rcp45')?.projections ?? [];
    const high = scenarios.find((s) => s.scenario === 'rcp85')?.projections ?? [];
    const lowFiltered = low.filter((p) => p.age >= startAge && p.age <= endAge);
    const highFiltered = high.filter((p) => p.age >= startAge && p.age <= endAge);
    if (lowFiltered.length === 0 || highFiltered.length === 0) return '';

    const topLine = highFiltered
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.age)} ${yScale(p.volume)}`)
      .join(' ');
    const bottomLine = [...lowFiltered]
      .reverse()
      .map((p) => `L ${xScale(p.age)} ${yScale(p.volume)}`)
      .join(' ');

    return `${topLine} ${bottomLine} Z`;
  }, [scenarios, xScale, yScale, startAge, endAge]);

  // X axis ticks
  const xTicks = useMemo(() => {
    const step = endAge - startAge > 60 ? 20 : 10;
    const ticks: number[] = [];
    for (let a = Math.ceil(startAge / step) * step; a <= endAge; a += step) {
      ticks.push(a);
    }
    return ticks;
  }, [startAge, endAge]);

  // Y axis ticks
  const yTicks = useMemo(() => {
    const step = maxVol > 500 ? 100 : 50;
    const ticks: number[] = [];
    for (let v = 0; v <= maxVol; v += step) {
      ticks.push(v);
    }
    return ticks;
  }, [maxVol]);

  // Hover handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Convert to age
      const age = Math.round(startAge + ((mouseX - padding.left) / chartW) * (endAge - startAge));
      if (age < startAge || age > endAge) {
        setTooltip(null);
        return;
      }

      const values = scenarios.map((s) => {
        const proj = s.projections.find((p) => p.age === age);
        return {
          scenario: SCENARIO_LABELS[s.scenario],
          volume: proj?.volume ?? 0,
          mai: proj?.mai ?? 0,
          color: SCENARIO_COLORS[s.scenario],
        };
      });

      const stdProj = standardProjection.find((p) => p.age === age);

      setTooltip({
        x: mouseX,
        y: mouseY,
        age,
        year: stdProj?.year ?? new Date().getFullYear() + (age - currentAge),
        values,
        standard: { volume: stdProj?.volume ?? 0, mai: stdProj?.mai ?? 0 },
      });
    },
    [scenarios, standardProjection, startAge, endAge, chartW, padding.left, currentAge],
  );

  const handleMouseLeave = useCallback(() => setTooltip(null), []);

  // Rotation age marker
  const rotX = xScale(rotationAge);
  const rotInView = rotationAge >= startAge && rotationAge <= endAge;

  // Current age marker
  const curX = xScale(currentAge);
  const curInView = currentAge >= startAge && currentAge <= endAge;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Grid lines */}
        {yTicks.map((v) => (
          <line
            key={`grid-y-${v}`}
            x1={padding.left}
            y1={yScale(v)}
            x2={width - padding.right}
            y2={yScale(v)}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        ))}

        {/* Confidence band */}
        {confidenceBand && (
          <path d={confidenceBand} fill="#4ade80" opacity={0.06} />
        )}

        {/* Standard SLU yield table line (dashed) */}
        <path
          d={buildPath(standardProjection)}
          fill="none"
          stroke="var(--text3)"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          opacity={0.7}
        />

        {/* Scenario lines */}
        {scenarios.map((s) => (
          <path
            key={s.scenario}
            d={buildPath(s.projections)}
            fill="none"
            stroke={SCENARIO_COLORS[s.scenario]}
            strokeWidth={2}
            opacity={0.9}
          />
        ))}

        {/* Current age marker */}
        {curInView && (
          <>
            <line
              x1={curX}
              y1={padding.top}
              x2={curX}
              y2={padding.top + chartH}
              stroke="var(--text3)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.5}
            />
            <text
              x={curX}
              y={padding.top - 5}
              textAnchor="middle"
              className="text-[9px] fill-[var(--text3)]"
              fontFamily="monospace"
            >
              {t('growth.chart.now')}
            </text>
          </>
        )}

        {/* Rotation age vertical marker */}
        {rotInView && (
          <>
            <line
              x1={rotX}
              y1={padding.top}
              x2={rotX}
              y2={padding.top + chartH}
              stroke="#4ade80"
              strokeWidth={1.5}
              strokeDasharray="4 3"
              opacity={0.8}
            />
            <circle
              cx={rotX}
              cy={yScale(
                scenarios[1]?.projections.find((p) => p.age === rotationAge)?.volume ?? 0,
              )}
              r={4}
              fill="#4ade80"
              stroke="var(--bg)"
              strokeWidth={2}
            />
          </>
        )}

        {/* X axis */}
        <line
          x1={padding.left}
          y1={padding.top + chartH}
          x2={width - padding.right}
          y2={padding.top + chartH}
          stroke="var(--border2)"
          strokeWidth={1}
        />
        {xTicks.map((age) => (
          <g key={`x-${age}`}>
            <line
              x1={xScale(age)}
              y1={padding.top + chartH}
              x2={xScale(age)}
              y2={padding.top + chartH + 5}
              stroke="var(--border2)"
            />
            <text
              x={xScale(age)}
              y={padding.top + chartH + 18}
              textAnchor="middle"
              className="text-[10px] fill-[var(--text3)]"
              fontFamily="monospace"
            >
              {age}
            </text>
          </g>
        ))}
        <text
          x={padding.left + chartW / 2}
          y={height - 5}
          textAnchor="middle"
          className="text-[10px] fill-[var(--text3)]"
        >
          {t('growth.chart.ageAxis')}
        </text>

        {/* Y axis */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartH}
          stroke="var(--border2)"
          strokeWidth={1}
        />
        {yTicks.map((v) => (
          <g key={`y-${v}`}>
            <text
              x={padding.left - 8}
              y={yScale(v) + 3}
              textAnchor="end"
              className="text-[10px] fill-[var(--text3)]"
              fontFamily="monospace"
            >
              {v}
            </text>
          </g>
        ))}
        <text
          x={14}
          y={padding.top + chartH / 2}
          textAnchor="middle"
          className="text-[10px] fill-[var(--text3)]"
          transform={`rotate(-90, 14, ${padding.top + chartH / 2})`}
        >
          m³sk/ha
        </text>

        {/* Hover line */}
        {tooltip && (
          <line
            x1={xScale(tooltip.age)}
            y1={padding.top}
            x2={xScale(tooltip.age)}
            y2={padding.top + chartH}
            stroke="var(--text3)"
            strokeWidth={0.5}
            strokeDasharray="2 2"
          />
        )}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 rounded-lg border border-[var(--border)] p-3 text-xs shadow-lg"
          style={{
            background: 'var(--bg2)',
            left: Math.min(tooltip.x + 12, width - 200),
            top: Math.max(tooltip.y - 80, 0),
          }}
        >
          <p className="font-semibold text-[var(--text)] mb-1">
            {t('growth.chart.age')}: {tooltip.age} &middot; {tooltip.year}
          </p>
          <div className="space-y-1">
            {tooltip.values.map((v) => (
              <div key={v.scenario} className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: v.color }}
                />
                <span className="text-[var(--text2)]">{v.scenario}:</span>
                <span className="font-mono text-[var(--text)]">
                  {v.volume.toFixed(0)} m³sk
                </span>
                <span className="text-[var(--text3)] font-mono">
                  MAI {v.mai.toFixed(1)}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 border-t border-[var(--border)] pt-1 mt-1">
              <span className="w-2 h-0.5 bg-[var(--text3)] flex-shrink-0" />
              <span className="text-[var(--text3)]">SLU:</span>
              <span className="font-mono text-[var(--text3)]">
                {tooltip.standard.volume.toFixed(0)} m³sk
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-1">
        {scenarios.map((s) => (
          <div key={s.scenario} className="flex items-center gap-1.5">
            <span
              className="w-3 h-[2px] rounded-full"
              style={{ background: SCENARIO_COLORS[s.scenario] }}
            />
            <span className="text-[10px] text-[var(--text2)]">
              {SCENARIO_LABELS[s.scenario]} — {t(`growth.scenario.${s.scenario}`)}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-[2px] rounded-full bg-[var(--text3)] opacity-60" style={{ borderTop: '1px dashed' }} />
          <span className="text-[10px] text-[var(--text3)]">
            {t('growth.chart.sluBaseline')}
          </span>
        </div>
      </div>
    </div>
  );
}

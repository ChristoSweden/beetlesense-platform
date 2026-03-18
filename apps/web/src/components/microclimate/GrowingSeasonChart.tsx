import { useTranslation } from 'react-i18next';
import type { MonthData, MonthlyNormals } from '@/services/microclimateService';

interface GrowingSeasonChartProps {
  months: MonthData[];
  countyAverage: MonthlyNormals[];
  growingSeasonStart: number; // month (1-indexed)
  growingSeasonEnd: number;
}

export function GrowingSeasonChart({
  months,
  countyAverage,
  growingSeasonStart,
  growingSeasonEnd,
}: GrowingSeasonChartProps) {
  const { t } = useTranslation();

  const width = 720;
  const height = 320;
  const padL = 50;
  const padR = 30;
  const padT = 30;
  const padB = 50;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  // Temperature range
  const allTemps = months.flatMap((m) => [m.adjustedMinTemp, m.adjustedMaxTemp]);
  const minT = Math.floor(Math.min(...allTemps, -10) / 5) * 5;
  const maxT = Math.ceil(Math.max(...allTemps, 25) / 5) * 5;
  const rangeT = maxT - minT;

  const xForMonth = (m: number) => padL + ((m - 0.5) / 12) * chartW;
  const yForTemp = (t: number) => padT + chartH - ((t - minT) / rangeT) * chartH;

  // Growing season shaded region
  const gsStartX = padL + ((growingSeasonStart - 1) / 12) * chartW;
  const gsEndX = padL + (growingSeasonEnd / 12) * chartW;

  // Temperature curves as smooth paths
  function tempPath(data: { month: number; temp: number }[]): string {
    return data
      .map((d, i) => {
        const x = xForMonth(d.month);
        const y = yForTemp(d.temp);
        return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
      })
      .join(' ');
  }

  const parcelAvgPath = tempPath(months.map((m) => ({ month: m.month, temp: m.adjustedAvgTemp })));
  const countyAvgPath = tempPath(countyAverage.map((m) => ({ month: m.month, temp: m.avgTemp })));

  // Min/Max area
  const parcelMinPath = months.map((m) => ({ month: m.month, temp: m.adjustedMinTemp }));
  const parcelMaxPath = months.map((m) => ({ month: m.month, temp: m.adjustedMaxTemp }));
  const areaPath =
    parcelMaxPath.map((d, i) => {
      const x = xForMonth(d.month);
      const y = yForTemp(d.temp);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ') +
    ' ' +
    [...parcelMinPath].reverse().map((d) => {
      const x = xForMonth(d.month);
      const y = yForTemp(d.temp);
      return `L ${x} ${y}`;
    }).join(' ') +
    ' Z';

  // GDD overlay (scaled to right axis)
  const maxGDD = months[months.length - 1].gddAccumulated || 1;
  const gddPath = months
    .map((m, i) => {
      const x = xForMonth(m.month);
      const y = padT + chartH - (m.gddAccumulated / maxGDD) * chartH;
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // 5°C threshold line
  const thresholdY = yForTemp(5);

  // Grid lines
  const gridTemps: number[] = [];
  for (let t = minT; t <= maxT; t += 5) gridTemps.push(t);

  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3">
        {t('microclimate.growingSeasonChart')}
      </h3>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={t('microclimate.growingSeasonChart')}>
        {/* Growing season shaded area */}
        <rect
          x={gsStartX}
          y={padT}
          width={gsEndX - gsStartX}
          height={chartH}
          fill="#4ade80"
          opacity={0.06}
        />

        {/* Grid lines */}
        {gridTemps.map((temp) => (
          <g key={temp}>
            <line
              x1={padL}
              x2={padL + chartW}
              y1={yForTemp(temp)}
              y2={yForTemp(temp)}
              stroke="var(--border)"
              strokeWidth={temp === 0 ? 1.5 : 0.5}
              strokeDasharray={temp === 0 ? '' : '4,4'}
            />
            <text
              x={padL - 8}
              y={yForTemp(temp) + 4}
              textAnchor="end"
              fill="var(--text3)"
              fontSize="10"
              fontFamily="monospace"
            >
              {temp}°
            </text>
          </g>
        ))}

        {/* 5°C threshold */}
        <line
          x1={padL}
          x2={padL + chartW}
          y1={thresholdY}
          y2={thresholdY}
          stroke="#4ade80"
          strokeWidth={1}
          strokeDasharray="6,3"
          opacity={0.5}
        />
        <text
          x={padL + chartW + 4}
          y={thresholdY + 3}
          fill="#4ade80"
          fontSize="9"
          fontFamily="monospace"
        >
          5°C
        </text>

        {/* Min-max temperature band */}
        <path d={areaPath} fill="#4ade80" opacity={0.08} />

        {/* County average line (dashed) */}
        <path
          d={countyAvgPath}
          fill="none"
          stroke="var(--text3)"
          strokeWidth={1.5}
          strokeDasharray="4,4"
          opacity={0.5}
        />

        {/* Parcel average line */}
        <path
          d={parcelAvgPath}
          fill="none"
          stroke="#4ade80"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* GDD accumulation (secondary) */}
        <path
          d={gddPath}
          fill="none"
          stroke="#fbbf24"
          strokeWidth={1.5}
          strokeDasharray="2,3"
          opacity={0.6}
        />

        {/* Data points */}
        {months.map((m) => (
          <circle
            key={m.month}
            cx={xForMonth(m.month)}
            cy={yForTemp(m.adjustedAvgTemp)}
            r={3}
            fill="#4ade80"
            stroke="var(--bg2)"
            strokeWidth={1.5}
          />
        ))}

        {/* Month labels */}
        {monthLabels.map((label, i) => (
          <text
            key={i}
            x={xForMonth(i + 1)}
            y={padT + chartH + 20}
            textAnchor="middle"
            fill="var(--text3)"
            fontSize="11"
            fontFamily="monospace"
            fontWeight={i + 1 >= growingSeasonStart && i + 1 <= growingSeasonEnd ? 'bold' : 'normal'}
          >
            {label}
          </text>
        ))}

        {/* Growing season label */}
        <text
          x={(gsStartX + gsEndX) / 2}
          y={padT + chartH + 40}
          textAnchor="middle"
          fill="#4ade80"
          fontSize="9"
          fontFamily="monospace"
        >
          {t('microclimate.growingSeason')}
        </text>
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-3 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#4ade80] rounded-full" />
          <span className="text-[10px] text-[var(--text3)]">{t('microclimate.legend.yourParcel')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[var(--text3)] rounded-full opacity-50" style={{ borderTop: '1px dashed' }} />
          <span className="text-[10px] text-[var(--text3)]">{t('microclimate.legend.countyAverage')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#4ade80]/10 rounded" />
          <span className="text-[10px] text-[var(--text3)]">{t('microclimate.legend.growingSeason')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-[#fbbf24] rounded-full opacity-60" />
          <span className="text-[10px] text-[var(--text3)]">{t('microclimate.legend.gdd')}</span>
        </div>
      </div>
    </div>
  );
}

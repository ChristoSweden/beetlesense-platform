import { useTranslation } from 'react-i18next';
import type { MonthData } from '@/services/microclimateService';

interface SoilTemperatureProps {
  months: MonthData[];
  soilType: string;
}

export function SoilTemperature({ months, soilType }: SoilTemperatureProps) {
  const { t } = useTranslation();

  const width = 720;
  const height = 260;
  const padL = 50;
  const padR = 30;
  const padT = 25;
  const padB = 45;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const allTemps = months.map((m) => m.soilTemp10cm);
  const minT = Math.floor(Math.min(...allTemps, -5) / 5) * 5;
  const maxT = Math.ceil(Math.max(...allTemps, 20) / 5) * 5;
  const rangeT = maxT - minT;

  const xForMonth = (m: number) => padL + ((m - 0.5) / 12) * chartW;
  const yForTemp = (temp: number) => padT + chartH - ((temp - minT) / rangeT) * chartH;

  // Soil temp path
  const soilPath = months
    .map((m, i) => {
      const x = xForMonth(m.month);
      const y = yForTemp(m.soilTemp10cm);
      return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    })
    .join(' ');

  // Fill area under curve to 0°C
  const zeroY = yForTemp(0);
  const _frozenAreaPath =
    months
      .filter((m) => m.soilTemp10cm < 0)
      .map((m, i) => {
        const x = xForMonth(m.month);
        const y = yForTemp(m.soilTemp10cm);
        return i === 0 ? `M ${x} ${Math.min(y, zeroY)}` : `L ${x} ${Math.min(y, zeroY)}`;
      })
      .join(' ');

  // Thresholds
  const freezeY = yForTemp(0);
  const growthY = yForTemp(6);

  const gridTemps: number[] = [];
  for (let temp = minT; temp <= maxT; temp += 5) gridTemps.push(temp);

  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  // "Safe to drive" months — frozen ground
  const frozenMonths = months.filter((m) => m.soilTemp10cm < 0);
  // "Growth active" months — soil > 6°C
  const activeMonths = months.filter((m) => m.soilTemp10cm >= 6);

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
          {t('microclimate.soilChart.title')}
        </h3>
        <span className="text-[10px] text-[var(--text3)] font-mono">
          {t('microclimate.soilChart.depth')} &middot; {t(`microclimate.soil.${soilType}`)}
        </span>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={t('microclimate.soilChart.title')}>
        {/* Grid */}
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

        {/* Frozen ground zone (below 0) */}
        <rect
          x={padL}
          y={freezeY}
          width={chartW}
          height={padT + chartH - freezeY}
          fill="#60a5fa"
          opacity={0.04}
        />

        {/* Growth active zone (above 6) */}
        {growthY > padT && (
          <rect
            x={padL}
            y={padT}
            width={chartW}
            height={growthY - padT}
            fill="#4ade80"
            opacity={0.04}
          />
        )}

        {/* 0°C threshold */}
        <line
          x1={padL}
          x2={padL + chartW}
          y1={freezeY}
          y2={freezeY}
          stroke="#60a5fa"
          strokeWidth={1}
          strokeDasharray="6,3"
          opacity={0.6}
        />
        <text
          x={padL + chartW + 4}
          y={freezeY + 3}
          fill="#60a5fa"
          fontSize="9"
          fontFamily="monospace"
        >
          0°C
        </text>

        {/* 6°C growth threshold */}
        <line
          x1={padL}
          x2={padL + chartW}
          y1={growthY}
          y2={growthY}
          stroke="#4ade80"
          strokeWidth={1}
          strokeDasharray="6,3"
          opacity={0.5}
        />
        <text
          x={padL + chartW + 4}
          y={growthY + 3}
          fill="#4ade80"
          fontSize="9"
          fontFamily="monospace"
        >
          6°C
        </text>

        {/* Soil temperature line */}
        <path
          d={soilPath}
          fill="none"
          stroke="#a78bfa"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {months.map((m) => (
          <g key={m.month}>
            <circle
              cx={xForMonth(m.month)}
              cy={yForTemp(m.soilTemp10cm)}
              r={3.5}
              fill={m.soilTemp10cm < 0 ? '#60a5fa' : m.soilTemp10cm >= 6 ? '#4ade80' : '#a78bfa'}
              stroke="var(--bg2)"
              strokeWidth={1.5}
            />
            <text
              x={xForMonth(m.month)}
              y={yForTemp(m.soilTemp10cm) - 8}
              textAnchor="middle"
              fill="var(--text2)"
              fontSize="9"
              fontFamily="monospace"
            >
              {m.soilTemp10cm}°
            </text>
          </g>
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
          >
            {label}
          </text>
        ))}
      </svg>

      {/* Summary */}
      <div className="flex flex-wrap gap-3 mt-3">
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-[#60a5fa]/5 border border-[#60a5fa]/20">
          <div className="w-2 h-2 rounded-full bg-[#60a5fa]" />
          <span className="text-[10px] text-[var(--text2)]">
            {t('microclimate.soilChart.frozenGround')}: {frozenMonths.length > 0
              ? frozenMonths.map((m) => t(`microclimate.monthsShort.${m.name}`)).join(', ')
              : t('microclimate.soilChart.none')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 bg-[#4ade80]/5 border border-[#4ade80]/20">
          <div className="w-2 h-2 rounded-full bg-[#4ade80]" />
          <span className="text-[10px] text-[var(--text2)]">
            {t('microclimate.soilChart.growthActive')}: {activeMonths.length > 0
              ? activeMonths.map((m) => t(`microclimate.monthsShort.${m.name}`)).join(', ')
              : t('microclimate.soilChart.none')}
          </span>
        </div>
      </div>
    </div>
  );
}

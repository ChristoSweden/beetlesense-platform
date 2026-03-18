import { useTranslation } from 'react-i18next';
import { Bug, Flower2, Leaf, TreePine, Wind } from 'lucide-react';
import type { PhenologicalEvent } from '@/services/microclimateService';

interface PhenologyTimelineProps {
  events: PhenologicalEvent[];
}

const CATEGORY_COLORS: Record<string, string> = {
  budburst: '#4ade80',
  growth: '#86efac',
  cessation: '#fbbf24',
  beetle: '#ef4444',
  pollen: '#a78bfa',
};

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  budburst: Flower2,
  growth: TreePine,
  cessation: Leaf,
  beetle: Bug,
  pollen: Wind,
};

function parseMonthDay(dateStr: string): { month: number; day: number } {
  const [m, d] = dateStr.split('/').map(Number);
  return { month: m, day: d };
}

function dayOfYear(month: number, day: number): number {
  const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = day;
  for (let i = 0; i < month - 1; i++) doy += daysInMonth[i];
  return doy;
}

export function PhenologyTimeline({ events }: PhenologyTimelineProps) {
  const { t } = useTranslation();

  const width = 720;
  const height = 200;
  const padL = 20;
  const padR = 20;
  const padT = 30;
  const trackY = 90;
  const chartW = width - padL - padR;

  // Timeline spans Jan 1 to Dec 31
  const xForDOY = (doy: number) => padL + (doy / 365) * chartW;

  const monthStarts = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  const monthLabels = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  // Sort events by adjusted date
  const sortedEvents = [...events].sort((a, b) => {
    const aDate = parseMonthDay(a.adjustedDate);
    const bDate = parseMonthDay(b.adjustedDate);
    return dayOfYear(aDate.month, aDate.day) - dayOfYear(bDate.month, bDate.day);
  });

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-1">
        {t('microclimate.phenologyTimeline.title')}
      </h3>
      <p className="text-[10px] text-[var(--text3)] mb-3">
        {t('microclimate.phenologyTimeline.subtitle')}
      </p>

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label={t('microclimate.phenologyTimeline.title')}>
        {/* Month dividers */}
        {monthStarts.map((doy, i) => (
          <g key={i}>
            <line
              x1={xForDOY(doy)}
              x2={xForDOY(doy)}
              y1={padT}
              y2={height - 15}
              stroke="var(--border)"
              strokeWidth={0.5}
              strokeDasharray="2,4"
            />
            <text
              x={xForDOY(doy) + (i < 11 ? (monthStarts[i + 1] - doy) / 2 : 15) * (chartW / 365)}
              y={padT - 8}
              textAnchor="middle"
              fill="var(--text3)"
              fontSize="10"
              fontFamily="monospace"
            >
              {monthLabels[i]}
            </text>
          </g>
        ))}

        {/* Main timeline track */}
        <line
          x1={padL}
          x2={padL + chartW}
          y1={trackY}
          y2={trackY}
          stroke="var(--border2)"
          strokeWidth={2}
          strokeLinecap="round"
        />

        {/* Events */}
        {sortedEvents.map((event, i) => {
          const { month, day } = parseMonthDay(event.adjustedDate);
          const doy = dayOfYear(month, day);
          const x = xForDOY(doy);
          const color = CATEGORY_COLORS[event.category] ?? '#4ade80';
          const above = i % 2 === 0;
          const yOffset = above ? trackY - 30 : trackY + 30;

          return (
            <g key={event.id}>
              {/* Connector line */}
              <line
                x1={x}
                x2={x}
                y1={trackY}
                y2={yOffset}
                stroke={color}
                strokeWidth={1}
                opacity={0.5}
              />
              {/* Event dot */}
              <circle
                cx={x}
                cy={trackY}
                r={5}
                fill={color}
                stroke="var(--bg2)"
                strokeWidth={2}
              />
              {/* Label */}
              <text
                x={x}
                y={above ? yOffset - 4 : yOffset + 12}
                textAnchor="middle"
                fill="var(--text2)"
                fontSize="8"
                fontFamily="sans-serif"
              >
                {t(event.name)}
              </text>
              {/* Date */}
              <text
                x={x}
                y={above ? yOffset + 6 : yOffset + 22}
                textAnchor="middle"
                fill="var(--text3)"
                fontSize="7"
                fontFamily="monospace"
              >
                {event.adjustedDate}
              </text>
              {/* Temperature threshold indicator */}
              {event.tempThreshold && (
                <text
                  x={x}
                  y={above ? yOffset + 15 : yOffset + 31}
                  textAnchor="middle"
                  fill={color}
                  fontSize="7"
                  fontFamily="monospace"
                >
                  {'>'}  {event.tempThreshold}°C
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Category legend */}
      <div className="flex flex-wrap items-center gap-3 mt-2">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => {
          const Icon = CATEGORY_ICONS[cat] ?? TreePine;
          return (
            <div key={cat} className="flex items-center gap-1">
              <Icon size={10} style={{ color }} />
              <span className="text-[9px] text-[var(--text3)]">
                {t(`microclimate.phenologyTimeline.category.${cat}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

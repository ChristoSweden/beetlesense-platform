import { useTranslation } from 'react-i18next';
import { TrendingUp, TreePine, Bug, Leaf } from 'lucide-react';
import type { HistoricalYearSnapshot, TimelineEvent } from '@/hooks/useComparisonData';

interface HistoricalTrendProps {
  snapshots: HistoricalYearSnapshot[];
  events?: TimelineEvent[];
  className?: string;
}

/* ── Simple SVG sparkline ── */
function Sparkline({
  values,
  color,
  width = 200,
  height = 40,
}: {
  values: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
    const y = height - padding - ((v - min) / range) * (height - 2 * padding);
    return `${x},${y}`;
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p}`).join(' ');

  // Area fill
  const areaD = `${pathD} L${padding + ((values.length - 1) / (values.length - 1)) * (width - 2 * padding)},${height - padding} L${padding},${height - padding} Z`;

  return (
    <svg width={width} height={height} className="block">
      {/* Gradient area */}
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {values.map((v, i) => {
        const x = padding + (i / (values.length - 1)) * (width - 2 * padding);
        const y = height - padding - ((v - min) / range) * (height - 2 * padding);
        return (
          <circle key={i} cx={x} cy={y} r="2.5" fill={color} stroke="#030d05" strokeWidth="1" />
        );
      })}
    </svg>
  );
}

/* ── Placeholder satellite thumbnail ── */
function SatelliteThumbnail({ year, ndvi }: { year: number; ndvi: number }) {
  // Generate a deterministic green gradient based on NDVI
  const greenIntensity = Math.round(ndvi * 200);
  const brownComponent = Math.round((1 - ndvi) * 80);

  return (
    <div
      className="w-full aspect-square rounded-lg border border-[var(--border)] overflow-hidden relative"
      style={{
        background: `linear-gradient(135deg,
          rgb(${brownComponent}, ${greenIntensity}, ${brownComponent / 2}) 0%,
          rgb(${brownComponent / 2}, ${Math.round(greenIntensity * 0.8)}, ${brownComponent / 3}) 50%,
          rgb(${brownComponent}, ${Math.round(greenIntensity * 0.9)}, ${brownComponent / 2}) 100%)`,
      }}
    >
      {/* Simulated texture */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: `radial-gradient(circle at 30% 40%, rgba(0,100,0,0.5) 1px, transparent 1px),
                          radial-gradient(circle at 70% 60%, rgba(0,80,0,0.4) 1px, transparent 1px),
                          radial-gradient(circle at 50% 20%, rgba(0,120,0,0.3) 2px, transparent 2px)`,
        backgroundSize: '12px 12px, 8px 8px, 16px 16px',
      }} />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
        <span className="text-[10px] font-mono text-white/90">{year}</span>
      </div>
    </div>
  );
}

export function HistoricalTrend({ snapshots, events = [], className = '' }: HistoricalTrendProps) {
  const { t } = useTranslation();

  if (snapshots.length === 0) return null;

  const ndviValues = snapshots.map((s) => s.ndvi);
  const canopyValues = snapshots.map((s) => s.canopyCoverPct);
  const damageValues = snapshots.map((s) => s.damageAreaHa);

  // Find events that fall within the snapshot range
  const minYear = snapshots[0].year;
  const maxYear = snapshots[snapshots.length - 1].year;
  const relevantEvents = events.filter((e) => {
    const y = new Date(e.date).getFullYear();
    return y >= minYear && y <= maxYear;
  });

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('comparison.historicalTrend.title')}
        </h3>
      </div>

      {/* Satellite thumbnails — small multiples */}
      <div className="grid grid-cols-5 gap-2 mb-5">
        {snapshots.map((snap) => (
          <div key={snap.year} className="flex flex-col items-center">
            <SatelliteThumbnail year={snap.year} ndvi={snap.ndvi} />
          </div>
        ))}
      </div>

      {/* Sparkline metrics */}
      <div className="space-y-4">
        {/* NDVI */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
              <Leaf size={12} className="text-[var(--green)]" />
              NDVI
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {ndviValues[ndviValues.length - 1]?.toFixed(2)}
            </span>
          </div>
          <Sparkline values={ndviValues} color="#22c55e" width={320} height={36} />
          {/* Year labels */}
          <div className="flex justify-between mt-0.5">
            {snapshots.map((s) => (
              <span key={s.year} className="text-[9px] text-[var(--text3)]">{s.year}</span>
            ))}
          </div>
        </div>

        {/* Canopy Cover */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
              <TreePine size={12} className="text-blue-400" />
              {t('comparison.historicalTrend.canopyCover')}
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {canopyValues[canopyValues.length - 1]?.toFixed(0)}%
            </span>
          </div>
          <Sparkline values={canopyValues} color="#3b82f6" width={320} height={36} />
          <div className="flex justify-between mt-0.5">
            {snapshots.map((s) => (
              <span key={s.year} className="text-[9px] text-[var(--text3)]">{s.year}</span>
            ))}
          </div>
        </div>

        {/* Damage Area */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-[11px] text-[var(--text2)]">
              <Bug size={12} className="text-red-400" />
              {t('comparison.historicalTrend.damageArea')}
            </span>
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {damageValues[damageValues.length - 1]?.toFixed(1)} ha
            </span>
          </div>
          <Sparkline values={damageValues} color="#ef4444" width={320} height={36} />
          <div className="flex justify-between mt-0.5">
            {snapshots.map((s) => (
              <span key={s.year} className="text-[9px] text-[var(--text3)]">{s.year}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Annotated events */}
      {relevantEvents.length > 0 && (
        <div className="mt-4 pt-3 border-t border-[var(--border)]">
          <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
            {t('comparison.historicalTrend.events')}
          </span>
          <div className="mt-2 space-y-1.5">
            {relevantEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px]">
                <span className="text-[var(--text3)] font-mono w-10">
                  {new Date(ev.date).getFullYear()}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ev.type === 'pest-outbreak'
                      ? 'bg-red-400'
                      : ev.type === 'storm'
                        ? 'bg-blue-400'
                        : ev.type === 'drought'
                          ? 'bg-[var(--amber)]'
                          : 'bg-[var(--green)]'
                  }`}
                />
                <span className="text-[var(--text2)]">{ev.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Satellite } from 'lucide-react';
import type { NDVIDataPoint } from '@/hooks/useEarlyWarning';

// ─── Helpers ───

function getTrendArrow(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '\u2191';
    case 'down':
      return '\u2193';
    case 'stable':
      return '\u2192';
  }
}

function getNdviColor(value: number): string {
  if (value >= 0.7) return '#4ade80';
  if (value >= 0.55) return '#fbbf24';
  if (value >= 0.4) return '#f97316';
  return '#ef4444';
}

function formatTimelineDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === 'sv' ? 'sv-SE' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// ─── Component ───

interface AnomalyTimelineProps {
  dataPoints: NDVIDataPoint[];
  selectedIndex?: number;
  onSelectIndex?: (index: number) => void;
}

export function AnomalyTimeline({ dataPoints, selectedIndex, onSelectIndex }: AnomalyTimelineProps) {
  const { t, i18n } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = direction === 'left' ? -200 : 200;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  if (!dataPoints || dataPoints.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <p className="text-xs text-[var(--text3)] text-center">{t('earlyWarning.timeline.noData')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Satellite size={14} className="text-[var(--text3)]" />
          <span className="text-xs font-semibold text-[var(--text)]">
            {t('earlyWarning.timeline.title')}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => scroll('left')}
            className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
            aria-label="Scroll left"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
            aria-label="Scroll right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="overflow-x-auto scrollbar-thin">
        <div className="flex gap-0 min-w-max">
          {dataPoints.map((point, index) => {
            const isSelected = selectedIndex === index;
            const color = getNdviColor(point.value);
            const trendArrow = getTrendArrow(point.trend);

            return (
              <button
                key={point.date}
                onClick={() => onSelectIndex?.(index)}
                className={`flex flex-col items-center gap-1.5 px-4 py-3 border-r border-[var(--border)] transition-colors min-w-[90px] ${
                  isSelected ? 'bg-[var(--bg3)]' : 'hover:bg-[var(--bg3)]/50'
                }`}
              >
                {/* Date */}
                <span className="text-[9px] font-mono text-[var(--text3)] uppercase tracking-wider">
                  {formatTimelineDate(point.date, i18n.language)}
                </span>

                {/* NDVI mini preview bar */}
                <div className="w-full h-1.5 rounded-full bg-[var(--bg)] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.max(10, point.value * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>

                {/* NDVI value + trend */}
                <div className="flex items-center gap-1">
                  <span className="text-xs font-mono font-semibold" style={{ color }}>
                    {point.value.toFixed(2)}
                  </span>
                  <span className="text-[10px]" style={{ color }}>
                    {trendArrow}
                  </span>
                </div>

                {/* Anomaly indicator dot */}
                {point.isAnomaly && (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                    title={t('earlyWarning.timeline.anomalyDetected')}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* NDVI scale legend */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-3">
          {[
            { label: '0.7+', color: '#4ade80' },
            { label: '0.55-0.7', color: '#fbbf24' },
            { label: '0.4-0.55', color: '#f97316' },
            { label: '<0.4', color: '#ef4444' },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[9px] font-mono text-[var(--text3)]">{item.label}</span>
            </div>
          ))}
        </div>
        <span className="text-[9px] text-[var(--text3)]">NDVI</span>
      </div>
    </div>
  );
}

import { useRef, useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { SatelliteDate, TimelineEvent } from '@/hooks/useComparisonData';
import { Cloud, TreePine, Droplets, Bug, Sprout, Wind } from 'lucide-react';

interface TimelineSelectorProps {
  dates: SatelliteDate[];
  events: TimelineEvent[];
  selectedBefore: string | null;
  selectedAfter: string | null;
  onSelectBefore: (date: string) => void;
  onSelectAfter: (date: string) => void;
  className?: string;
}

const EVENT_ICONS: Record<TimelineEvent['type'], typeof Wind> = {
  storm: Wind,
  harvest: TreePine,
  drought: Droplets,
  'pest-outbreak': Bug,
  planting: Sprout,
};

const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  storm: 'text-blue-400',
  harvest: 'text-[var(--green)]',
  drought: 'text-[var(--amber)]',
  'pest-outbreak': 'text-red-400',
  planting: 'text-emerald-400',
};

export function TimelineSelector({
  dates,
  events,
  selectedBefore,
  selectedAfter,
  onSelectBefore,
  onSelectAfter,
  className = '',
}: TimelineSelectorProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectingMode, setSelectingMode] = useState<'before' | 'after'>('before');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Sort dates chronologically (oldest first)
  const sortedDates = [...dates].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  // Compute timeline range
  const allTimestamps = sortedDates.map((d) => new Date(d.date).getTime());
  const minTime = allTimestamps.length > 0 ? Math.min(...allTimestamps) : Date.now();
  const maxTime = allTimestamps.length > 0 ? Math.max(...allTimestamps) : Date.now();
  const range = maxTime - minTime || 1;

  const getPosition = (dateStr: string) => {
    const t = new Date(dateStr).getTime();
    return ((t - minTime) / range) * 100;
  };

  const handleDateClick = useCallback(
    (date: string) => {
      if (selectingMode === 'before') {
        onSelectBefore(date);
        setSelectingMode('after');
      } else {
        onSelectAfter(date);
        setSelectingMode('before');
      }
    },
    [selectingMode, onSelectBefore, onSelectAfter],
  );

  const formatShort = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: '2-digit',
        month: 'short',
      });
    } catch {
      return iso;
    }
  };

  const formatFull = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  // Auto-scroll to center the timeline when mounted
  useEffect(() => {
    if (scrollRef.current) {
      const el = scrollRef.current;
      el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
    }
  }, [dates.length]);

  if (dates.length === 0) {
    return (
      <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 text-center ${className}`}>
        <Cloud size={20} className="mx-auto text-[var(--text3)] mb-2" />
        <p className="text-xs text-[var(--text3)]">{t('comparison.noImages')}</p>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border border-[var(--border)] bg-[var(--bg2)] ${className}`}>
      {/* Header with selection mode */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
        <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">
          {t('comparison.selectDates')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectingMode('before')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              selectingMode === 'before'
                ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {t('comparison.before')}
            {selectedBefore && (
              <span className="ml-1.5 text-[10px] opacity-75">{formatShort(selectedBefore)}</span>
            )}
          </button>
          <button
            onClick={() => setSelectingMode('after')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              selectingMode === 'after'
                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                : 'text-[var(--text3)] hover:text-[var(--text2)]'
            }`}
          >
            {t('comparison.after')}
            {selectedAfter && (
              <span className="ml-1.5 text-[10px] opacity-75">{formatShort(selectedAfter)}</span>
            )}
          </button>
        </div>
      </div>

      {/* Timeline track */}
      <div ref={scrollRef} className="px-4 py-4 overflow-x-auto">
        <div className="relative min-w-[500px] h-20">
          {/* Main horizontal line */}
          <div className="absolute left-0 right-0 top-8 h-px bg-[var(--border)]" />

          {/* Year markers */}
          {(() => {
            const years = new Set(
              sortedDates.map((d) => new Date(d.date).getFullYear()),
            );
            return [...years].map((year) => {
              const yearDate = `${year}-01-01`;
              const yearTime = new Date(yearDate).getTime();
              if (yearTime < minTime || yearTime > maxTime) return null;
              const pos = ((yearTime - minTime) / range) * 100;
              return (
                <div
                  key={year}
                  className="absolute top-10 -translate-x-1/2 text-[10px] text-[var(--text3)]"
                  style={{ left: `${pos}%` }}
                >
                  {year}
                </div>
              );
            });
          })()}

          {/* Event markers (below the line) */}
          {events.map((event, i) => {
            const eventTime = new Date(event.date).getTime();
            if (eventTime < minTime || eventTime > maxTime) return null;
            const pos = getPosition(event.date);
            const Icon = EVENT_ICONS[event.type] ?? Wind;
            const color = EVENT_COLORS[event.type] ?? 'text-[var(--text3)]';
            return (
              <div
                key={`${event.date}-${i}`}
                className="absolute -translate-x-1/2 group"
                style={{ left: `${pos}%`, top: '36px' }}
              >
                <div className="w-px h-3 bg-[var(--border)] mx-auto" />
                <div className={`flex items-center justify-center ${color}`}>
                  <Icon size={12} />
                </div>
                {/* Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-8 hidden group-hover:block z-30 whitespace-nowrap">
                  <div className="px-2 py-1 rounded bg-black/80 text-white text-[10px]">
                    {event.label}
                    <span className="block text-[9px] opacity-70">{formatFull(event.date)}</span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Date dots */}
          {sortedDates.map((sd) => {
            const pos = getPosition(sd.date);
            const isBefore = sd.date === selectedBefore;
            const isAfter = sd.date === selectedAfter;
            const isHovered = sd.date === hoveredDate;

            return (
              <button
                key={sd.date}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all z-10 ${
                  isBefore || isAfter ? 'z-20' : ''
                }`}
                style={{ left: `${pos}%`, top: '32px' }}
                onClick={() => handleDateClick(sd.date)}
                onMouseEnter={() => setHoveredDate(sd.date)}
                onMouseLeave={() => setHoveredDate(null)}
                title={formatFull(sd.date)}
              >
                {/* Outer ring for selected */}
                {(isBefore || isAfter) && (
                  <div
                    className={`absolute inset-[-4px] rounded-full border-2 ${
                      isBefore ? 'border-[var(--green)]' : 'border-blue-400'
                    }`}
                  />
                )}
                {/* Dot */}
                <div
                  className={`w-3 h-3 rounded-full transition-transform ${
                    isBefore
                      ? 'bg-[var(--green)] scale-125'
                      : isAfter
                        ? 'bg-blue-400 scale-125'
                        : isHovered
                          ? 'bg-[var(--text2)] scale-110'
                          : 'bg-[var(--text3)]'
                  }`}
                />
                {/* Label on hover/selected */}
                {(isHovered || isBefore || isAfter) && (
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-5 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                        isBefore
                          ? 'bg-[var(--green)]/15 text-[var(--green)]'
                          : isAfter
                            ? 'bg-blue-500/15 text-blue-400'
                            : 'bg-black/60 text-white'
                      }`}
                    >
                      {formatShort(sd.date)}
                    </span>
                  </div>
                )}
              </button>
            );
          })}

          {/* Selected range highlight */}
          {selectedBefore && selectedAfter && (() => {
            const posA = getPosition(selectedBefore);
            const posB = getPosition(selectedAfter);
            const left = Math.min(posA, posB);
            const width = Math.abs(posB - posA);
            return (
              <div
                className="absolute top-[30px] h-1 rounded-full bg-gradient-to-r from-[var(--green)] to-blue-400 opacity-40"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })()}
        </div>
      </div>
    </div>
  );
}

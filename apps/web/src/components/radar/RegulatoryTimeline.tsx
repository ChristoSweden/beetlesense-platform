import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock } from 'lucide-react';
import type { RegulatoryChange, ImpactSeverity } from '@/data/regulatoryChanges';

interface Props {
  changes: RegulatoryChange[];
  onSelectChange?: (change: RegulatoryChange) => void;
}

const SEVERITY_COLORS: Record<ImpactSeverity, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#4ade80',
  informational: '#60a5fa',
};

export function RegulatoryTimeline({ changes, onSelectChange }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const now = Date.now();

  // Sort by effective date and deduplicate
  const sorted = [...changes]
    .filter((c) => c.effectiveDate || c.complianceDeadline)
    .sort((a, b) => new Date(a.effectiveDate).getTime() - new Date(b.effectiveDate).getTime());

  if (sorted.length === 0) return null;

  // Compute timeline range
  const earliest = new Date(sorted[0].effectiveDate).getTime();
  const latest = Math.max(
    ...sorted.map((c) => {
      const dates = [new Date(c.effectiveDate).getTime()];
      if (c.complianceDeadline) dates.push(new Date(c.complianceDeadline).getTime());
      return Math.max(...dates);
    }),
  );
  const range = Math.max(latest - earliest, 86400000 * 30); // At least 30 days range

  // Position of "now" on the timeline
  const nowPos = ((now - earliest) / range) * 100;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
        <Clock size={14} className="text-[var(--text3)]" />
        {t('radar.timeline.title')}
      </h3>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="overflow-x-auto pb-2">
        <div className="relative min-w-[600px] h-32">
          {/* Timeline bar */}
          <div className="absolute top-12 left-0 right-0 h-[2px] bg-[var(--border)]" />

          {/* "Now" indicator */}
          {nowPos >= 0 && nowPos <= 100 && (
            <div
              className="absolute top-6 z-10"
              style={{ left: `${Math.min(Math.max(nowPos, 2), 98)}%` }}
            >
              <div className="flex flex-col items-center">
                <span className="text-[9px] font-mono text-[var(--green)] uppercase tracking-wider mb-1">
                  {lang === 'sv' ? 'Idag' : 'Today'}
                </span>
                <div className="w-[2px] h-4 bg-[var(--green)]" />
                <div className="w-3 h-3 rounded-full bg-[var(--green)] border-2 border-[var(--bg2)]" />
                <div className="w-[2px] h-4 bg-[var(--green)] opacity-30" />
              </div>
            </div>
          )}

          {/* Change markers */}
          {sorted.map((change) => {
            const effectiveTime = new Date(change.effectiveDate).getTime();
            const pos = ((effectiveTime - earliest) / range) * 100;
            const isPast = effectiveTime < now;
            const color = SEVERITY_COLORS[change.severity];
            const isHovered = hoveredId === change.id;
            const title = lang === 'sv' ? change.title_sv : change.title_en;

            return (
              <div key={change.id}>
                {/* Effective date marker */}
                <button
                  className="absolute z-20 group cursor-pointer"
                  style={{
                    left: `${Math.min(Math.max(pos, 1), 99)}%`,
                    top: '36px',
                    transform: 'translateX(-50%)',
                  }}
                  onMouseEnter={() => setHoveredId(change.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => onSelectChange?.(change)}
                >
                  <div
                    className={`w-4 h-4 rounded-full border-2 transition-all ${isPast ? 'opacity-40' : ''}`}
                    style={{
                      backgroundColor: color,
                      borderColor: 'var(--bg2)',
                      transform: isHovered ? 'scale(1.4)' : 'scale(1)',
                    }}
                  />
                </button>

                {/* Date label below */}
                <div
                  className={`absolute text-center ${isPast ? 'opacity-40' : ''}`}
                  style={{
                    left: `${Math.min(Math.max(pos, 1), 99)}%`,
                    top: '56px',
                    transform: 'translateX(-50%)',
                  }}
                >
                  <span className="text-[8px] font-mono text-[var(--text3)] whitespace-nowrap">
                    {formatDate(change.effectiveDate)}
                  </span>
                </div>

                {/* Compliance deadline marker (red) */}
                {change.complianceDeadline && (
                  (() => {
                    const deadlineTime = new Date(change.complianceDeadline).getTime();
                    const deadlinePos = ((deadlineTime - earliest) / range) * 100;
                    const deadlinePast = deadlineTime < now;
                    return (
                      <div
                        className={`absolute z-15 ${deadlinePast ? 'opacity-30' : ''}`}
                        style={{
                          left: `${Math.min(Math.max(deadlinePos, 1), 99)}%`,
                          top: '36px',
                          transform: 'translateX(-50%)',
                        }}
                      >
                        <div className="w-3 h-3 rotate-45 border-2 border-red-500 bg-red-500/20" />
                      </div>
                    );
                  })()
                )}

                {/* Hover tooltip */}
                {isHovered && (
                  <div
                    className="absolute z-30 w-56 p-2.5 rounded-lg border border-[var(--border)] shadow-lg"
                    style={{
                      left: `${Math.min(Math.max(pos, 10), 90)}%`,
                      top: '72px',
                      transform: 'translateX(-50%)',
                      background: 'var(--bg)',
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-[10px] font-mono text-[var(--text3)]">
                        {change.source}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-[var(--text)] leading-snug line-clamp-2">
                      {title}
                    </p>
                    <p className="text-[9px] text-[var(--text3)] mt-1">
                      {t('radar.effective')}: {formatDate(change.effectiveDate)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-[9px] text-[var(--text3)]">{lang === 'sv' ? 'Hög' : 'High'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-[9px] text-[var(--text3)]">{lang === 'sv' ? 'Medel' : 'Medium'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" />
          <span className="text-[9px] text-[var(--text3)]">{lang === 'sv' ? 'Låg' : 'Low'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-[9px] text-[var(--text3)]">Info</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rotate-45 border border-red-500 bg-red-500/20" />
          <span className="text-[9px] text-[var(--text3)]">{t('radar.timeline.complianceDeadline')}</span>
        </div>
      </div>
    </div>
  );
}

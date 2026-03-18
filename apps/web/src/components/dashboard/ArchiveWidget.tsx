import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Clock } from 'lucide-react';
import { useForestArchive, EVENT_TYPE_COLORS } from '@/hooks/useForestArchive';

export function ArchiveWidget() {
  const { t } = useTranslation();
  const { allEvents, totalYears, isLoading } = useForestArchive();

  const latestEvent = useMemo(() => {
    if (allEvents.length === 0) return null;
    const sorted = [...allEvents].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0];
  }, [allEvents]);

  if (isLoading) {
    return (
      <div
        className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
        style={{ background: 'var(--bg2)' }}
      >
        <div className="h-4 w-32 bg-[var(--bg3)] rounded mb-3" />
        <div className="h-8 w-20 bg-[var(--bg3)] rounded mb-2" />
        <div className="h-3 w-48 bg-[var(--bg3)] rounded" />
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('archive.widget.title')}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          {allEvents.length} {t('archive.widget.events')}
        </span>
      </div>

      {/* Years headline */}
      {totalYears > 0 && (
        <div className="mb-3">
          <p className="text-2xl font-mono font-bold text-[var(--green)]">
            {totalYears} {t('archive.widget.yearsOfForestry')}
          </p>
          <p className="text-[11px] text-[var(--text3)]">
            {t('archive.widget.familyHistory')}
          </p>
        </div>
      )}

      {/* Latest event */}
      {latestEvent && (
        <div className="flex items-start gap-2 p-2.5 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
          <div
            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
            style={{ backgroundColor: EVENT_TYPE_COLORS[latestEvent.type] }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-medium text-[var(--text)] truncate">
              {latestEvent.title}
            </p>
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={10} className="text-[var(--text3)]" />
              <span className="text-[10px] text-[var(--text3)]">
                {new Date(latestEvent.date).getFullYear()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <Link
          to="/owner/archive"
          className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
        >
          {t('archive.widget.viewTimeline')}
          <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}

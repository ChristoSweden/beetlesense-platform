import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Radar,
  ChevronRight,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { useRegulatoryRadar } from '@/hooks/useRegulatoryRadar';

export function RegulatoryRadarWidget() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { filteredChanges, unreadHighImpactCount, unreadCount, isLoading } = useRegulatoryRadar();

  const latestChange = filteredChanges.find((c) => !c.isRead) ?? filteredChanges[0] ?? null;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-36 bg-[var(--bg3)] rounded mb-3" />
        <div className="h-8 w-full bg-[var(--bg3)] rounded" />
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
          <Radar size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('radar.widget.title')}
          </h3>
          {unreadHighImpactCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white">
              {unreadHighImpactCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
            {unreadCount} {lang === 'sv' ? 'olästa' : 'unread'}
          </span>
        )}
      </div>

      {/* Status */}
      {unreadHighImpactCount === 0 ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20">
          <Shield size={14} className="text-[var(--green)]" />
          <span className="text-[11px] font-medium text-[var(--green)]">
            {t('radar.widget.allClear')}
          </span>
        </div>
      ) : latestChange ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
          <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-red-300 block truncate">
              {lang === 'sv' ? latestChange.title_sv : latestChange.title_en}
            </span>
            <span className="text-[9px] text-red-400/70">
              {unreadHighImpactCount} {t('radar.widget.highImpactChanges')}
            </span>
          </div>
        </div>
      ) : null}

      {/* Link to full page */}
      <Link
        to="/owner/regulatory-radar"
        className="flex items-center justify-center gap-1.5 w-full py-2 mt-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {t('radar.widget.viewAll')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { useCompliance } from '@/hooks/useCompliance';

export function ComplianceWidget() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const { activePermits, isLoading } = useCompliance();

  const nearestDeadline = useMemo(() => {
    const upcoming = activePermits
      .filter((p) => p.reviewDeadline)
      .map((p) => ({
        parcelName: p.parcelName,
        deadline: new Date(p.reviewDeadline!),
        daysLeft: Math.ceil((new Date(p.reviewDeadline!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      }))
      .filter((d) => d.daysLeft > 0)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    return upcoming[0] ?? null;
  }, [activePermits]);

  const hasWarning = nearestDeadline && nearestDeadline.daysLeft <= 7;
  const allClear = activePermits.length === 0;

  if (isLoading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4 animate-pulse" style={{ background: 'var(--bg2)' }}>
        <div className="h-4 w-32 bg-[var(--bg3)] rounded mb-3" />
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
          <ClipboardCheck size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('compliance.widget.title')}
          </h3>
        </div>
        {activePermits.length > 0 && (
          <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
            {activePermits.length} {lang === 'sv' ? 'aktiva' : 'active'}
          </span>
        )}
      </div>

      {/* Status */}
      {allClear ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20">
          <CheckCircle2 size={14} className="text-[var(--green)]" />
          <span className="text-[11px] font-medium text-[var(--green)]">
            {t('compliance.widget.allClear')}
          </span>
        </div>
      ) : hasWarning ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle size={14} className="text-amber-400" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-amber-300 block truncate">
              {nearestDeadline.parcelName}
            </span>
            <span className="text-[9px] text-amber-400/70">
              {nearestDeadline.daysLeft} {t('compliance.widget.daysLeft')}
            </span>
          </div>
        </div>
      ) : nearestDeadline ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <Clock size={14} className="text-[var(--text3)]" />
          <div className="flex-1 min-w-0">
            <span className="text-[11px] font-medium text-[var(--text)] block truncate">
              {nearestDeadline.parcelName}
            </span>
            <span className="text-[9px] text-[var(--text3)]">
              {nearestDeadline.daysLeft} {t('compliance.widget.daysLeft')}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)]">
          <ClipboardCheck size={14} className="text-[var(--text3)]" />
          <span className="text-[11px] text-[var(--text2)]">
            {activePermits.length} {t('compliance.widget.pendingPermits')}
          </span>
        </div>
      )}

      {/* Link to full page */}
      <Link
        to="/owner/compliance"
        className="flex items-center justify-center gap-1.5 w-full py-2 mt-3 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {t('compliance.widget.viewAll')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

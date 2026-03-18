import { useTranslation } from 'react-i18next';
import { AlertTriangle, Shield, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEarlyWarning } from '@/hooks/useEarlyWarning';
import { WarningCard } from '@/components/earlywarning/WarningCard';

export function EarlyWarningWidget() {
  const { t } = useTranslation();
  const { warnings, severityCounts, loading } = useEarlyWarning();

  const totalActive = severityCounts.red + severityCounts.orange + severityCounts.yellow;
  const newestWarning = warnings[0] ?? null;

  if (loading) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            {t('earlyWarning.widget.title')}
          </span>
        </div>
        <div className="animate-pulse space-y-2">
          <div className="h-3 w-2/3 rounded bg-[var(--bg3)]" />
          <div className="h-3 w-1/2 rounded bg-[var(--bg3)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            {t('earlyWarning.widget.title')}
          </span>
        </div>
        <Link
          to="/owner/early-warning"
          className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-0.5 font-medium"
        >
          {t('earlyWarning.widget.viewAll')}
          <ChevronRight size={12} />
        </Link>
      </div>

      {totalActive === 0 ? (
        /* Healthy state */
        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(74,222,128,0.06)' }}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74,222,128,0.12)' }}>
            <Shield size={16} className="text-[#4ade80]" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#4ade80]">
              {t('earlyWarning.widget.healthy')}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {t('earlyWarning.widget.healthyDesc')}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Severity summary bar */}
          <div className="flex items-center gap-3 mb-3">
            {severityCounts.red > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs font-mono font-semibold text-[var(--text)]">{severityCounts.red}</span>
                <span className="text-[10px] text-[var(--text3)]">{t('earlyWarning.severity.confirmedDamage')}</span>
              </div>
            )}
            {severityCounts.orange > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span className="text-xs font-mono font-semibold text-[var(--text)]">{severityCounts.orange}</span>
                <span className="text-[10px] text-[var(--text3)]">{t('earlyWarning.severity.likelyInfestation')}</span>
              </div>
            )}
            {severityCounts.yellow > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-mono font-semibold text-[var(--text)]">{severityCounts.yellow}</span>
                <span className="text-[10px] text-[var(--text3)]">{t('earlyWarning.severity.stressDetected')}</span>
              </div>
            )}
          </div>

          {/* Newest warning preview */}
          {newestWarning && (
            <Link to="/owner/early-warning">
              <WarningCard warning={newestWarning} compact />
            </Link>
          )}
        </>
      )}
    </div>
  );
}

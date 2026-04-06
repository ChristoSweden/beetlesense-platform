import { useTranslation } from 'react-i18next';
import { ScanEye, ChevronRight, ShieldCheck, AlertCircle, Eye, GitCompareArrows } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DEMO_OBSERVATIONS } from '@/services/satelliteValidationService';
import type { VerdictStatus } from '@/services/satelliteValidationService';

const VERDICT_COLORS: Record<VerdictStatus, string> = {
  confirmed: '#ef4444',
  monitoring: '#f59e0b',
  normal: '#4ade80',
};

const VERDICT_ICONS: Record<VerdictStatus, React.ReactNode> = {
  confirmed: <AlertCircle size={12} />,
  monitoring: <Eye size={12} />,
  normal: <ShieldCheck size={12} />,
};

export function SatelliteCheckWidget() {
  const { t } = useTranslation();

  // Demo data: use pre-saved observations
  const observations = DEMO_OBSERVATIONS;
  const lastCheck = observations[observations.length - 1];
  const seasonCount = observations.length;

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ScanEye size={16} className="text-[var(--text3)]" />
          <span className="text-sm font-semibold text-[var(--text)]">
            {t('satelliteCheck.widget.title')}
          </span>
        </div>
        <Link
          to="/owner/satellite-check"
          className="text-[10px] text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-0.5 font-medium"
        >
          {t('satelliteCheck.widget.openTool')}
          <ChevronRight size={12} />
        </Link>
      </div>

      {/* Last check result */}
      {lastCheck && (
        <div className="mb-3 p-3 rounded-lg border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="flex items-center gap-1 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full"
              style={{
                background: `${VERDICT_COLORS[lastCheck.verdict]}12`,
                color: VERDICT_COLORS[lastCheck.verdict],
              }}
            >
              {VERDICT_ICONS[lastCheck.verdict]}
              {t(`satelliteCheck.verdicts.${lastCheck.verdict}`)}
            </span>
            <span className="text-[10px] text-[var(--text3)]">
              {new Date(lastCheck.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          </div>
          <p className="text-xs text-[var(--text2)]">
            {t(`satelliteCheck.types.${lastCheck.observationType}`)} — {lastCheck.parcelName}
          </p>
          <p className="text-[10px] font-mono text-[var(--text3)] mt-1">
            {lastCheck.primaryMetric}: {lastCheck.primaryValue.toFixed(2)} ({lastCheck.changePercent > 0 ? '+' : ''}{lastCheck.changePercent.toFixed(1)}%)
          </p>
        </div>
      )}

      {/* Season summary */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[var(--text3)]">
          {seasonCount} {t('satelliteCheck.widget.observationsThisSeason')}
        </span>
      </div>

      {/* CTAs */}
      <div className="mt-3 flex flex-col gap-2">
        <Link
          to="/owner/satellite-check"
          className="w-full py-2.5 px-4 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20
            text-xs font-semibold text-[var(--green)] hover:bg-[var(--green)]/15
            transition-colors flex items-center justify-center gap-2"
        >
          <ScanEye size={14} />
          {t('satelliteCheck.widget.quickCheck')}
        </Link>
        <Link
          to="/owner/satellite-compare"
          className="w-full py-2 px-4 rounded-lg border border-[var(--border)]
            text-[10px] font-semibold text-[var(--text2)] hover:bg-[var(--bg3)]
            transition-colors flex items-center justify-center gap-1.5"
          style={{ background: 'var(--bg)' }}
        >
          <GitCompareArrows size={12} />
          Compare over time
        </Link>
      </div>
    </div>
  );
}

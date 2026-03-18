import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  MapPin,
  Calendar,
  TrendingDown,
  Radar,
  Sparkles,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { EarlyWarning, WarningSeverity } from '@/hooks/useEarlyWarning';

// ─── Severity Config ───

const SEVERITY_CONFIG: Record<
  WarningSeverity,
  { color: string; bg: string; border: string; label: string }
> = {
  green: { color: '#4ade80', bg: 'rgba(74,222,128,0.1)', border: 'rgba(74,222,128,0.2)', label: 'healthy' },
  yellow: { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)', label: 'stressDetected' },
  orange: { color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)', label: 'likelyInfestation' },
  red: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', label: 'confirmedDamage' },
};

interface WarningCardProps {
  warning: EarlyWarning;
  onViewOnMap?: (warning: EarlyWarning) => void;
  onOrderDrone?: () => void;
  onAskAi?: () => void;
  compact?: boolean;
}

export function WarningCard({ warning, onViewOnMap, onOrderDrone, onAskAi, compact = false }: WarningCardProps) {
  const { t } = useTranslation();
  const config = SEVERITY_CONFIG[warning.severity];

  if (compact) {
    return (
      <div
        className="rounded-lg border p-3 transition-colors hover:border-[var(--border2)]"
        style={{ borderColor: config.border, background: 'var(--bg2)' }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
            style={{ backgroundColor: config.color }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[var(--text)] truncate">
              {warning.parcelName} — {warning.standNumber}
            </p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              NDVI {warning.ndviDeviation > 0 ? '-' : ''}{warning.ndviDeviation}% &middot;{' '}
              {t(`earlyWarning.severity.${config.label}`)}
            </p>
          </div>
          <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0 mt-0.5" />
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border p-4 transition-all hover:border-[var(--border2)]"
      style={{ borderColor: config.border, background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: config.color }} />
          <span
            className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ color: config.color, background: config.bg }}
          >
            {t(`earlyWarning.severity.${config.label}`)}
          </span>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)]">
          {warning.areaHectares} ha
        </span>
      </div>

      {/* Location */}
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={13} className="text-[var(--text3)]" />
        <span className="text-sm font-medium text-[var(--text)]">
          {warning.parcelName} — {warning.standNumber}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
          <TrendingDown size={12} />
          <span>
            NDVI: <span className="font-mono text-[var(--text2)]">{warning.ndviDeviation > 0 ? '-' : ''}{warning.ndviDeviation}%</span>{' '}
            ({warning.currentNdvi.toFixed(2)})
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
          <Calendar size={12} />
          <span>
            {t('earlyWarning.detected')}: {new Date(warning.detectionDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
          <Clock size={12} />
          <span>
            {warning.daysSinceFirstAnomaly} {t('earlyWarning.daysSinceFirst')}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
          <Radar size={12} />
          <span>
            {t('earlyWarning.spreadRate')}: {warning.estimatedSpreadRate} ha/{t('earlyWarning.week')}
          </span>
        </div>
      </div>

      {/* Early warning messaging for yellow alerts */}
      {warning.severity === 'yellow' && (
        <div className="rounded-lg px-3 py-2 mb-3 text-[10px] text-amber-300/80" style={{ background: 'rgba(251,191,36,0.06)' }}>
          {t('earlyWarning.earlyDetectionMessage')}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]">
        {onViewOnMap && (
          <button
            onClick={() => onViewOnMap(warning)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <MapPin size={12} />
            {t('earlyWarning.viewOnMap')}
          </button>
        )}
        {onOrderDrone && (
          <Link
            to="/owner/surveys"
            onClick={onOrderDrone}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
          >
            <Radar size={12} />
            {t('earlyWarning.orderDroneSurvey')}
          </Link>
        )}
        {onAskAi && (
          <button
            onClick={onAskAi}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors ml-auto"
          >
            <Sparkles size={12} />
            {t('earlyWarning.askAiAdvisor')}
          </button>
        )}
      </div>
    </div>
  );
}

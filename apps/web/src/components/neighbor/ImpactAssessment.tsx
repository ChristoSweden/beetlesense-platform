import { useTranslation } from 'react-i18next';
import {
  Wind,
  Bug,
  Droplets,
  Route,
  TreePine,
  Radio,
  ArrowRight,
  Shield,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import type { NeighborActivity, ImpactDetail, ImpactLevel, RiskType } from '@/services/neighborActivityService';
import { getImpactDetails, getImpactColor, getActivityColor } from '@/services/neighborActivityService';
import { getActivityIcon } from './ActivityCard';

function getRiskIcon(riskType: RiskType, size = 16) {
  switch (riskType) {
    case 'windthrow': return <Wind size={size} />;
    case 'beetle_spread': return <Bug size={size} />;
    case 'drainage_change': return <Droplets size={size} />;
    case 'access_change': return <Route size={size} />;
    case 'edge_exposure': return <TreePine size={size} />;
    case 'regional_awareness': return <Radio size={size} />;
  }
}

function ImpactLevelBadge({ level }: { level: ImpactLevel }) {
  const { t } = useTranslation();
  const color = getImpactColor(level);
  return (
    <span
      className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase"
      style={{ color, background: `${color}15` }}
    >
      {t(`neighbor.impact.${level}`)}
    </span>
  );
}

interface ImpactAssessmentProps {
  activity: NeighborActivity;
  onClose: () => void;
}

export function ImpactAssessment({ activity, onClose }: ImpactAssessmentProps) {
  const { t } = useTranslation();
  const details = getImpactDetails(activity);
  const actColor = getActivityColor(activity.type);
  const impactColor = getImpactColor(activity.impactLevel);

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: `${actColor}15`, color: actColor }}
            >
              {getActivityIcon(activity.type, 18)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">
                {t(`neighbor.activityType.${activity.type}`)}
              </h3>
              <p className="text-[10px] text-[var(--text3)]">
                {activity.distanceKm} km {t(`neighbor.direction.${activity.direction}`)} &middot; {activity.areaHa} ha
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[var(--text3)] hover:text-[var(--text)] transition-colors px-2 py-1"
          >
            {t('common.close')}
          </button>
        </div>

        {/* Overall impact */}
        <div
          className="flex items-center gap-2 rounded-lg px-3 py-2"
          style={{ background: `${impactColor}10` }}
        >
          <AlertTriangle size={14} style={{ color: impactColor }} />
          <span className="text-xs font-medium" style={{ color: impactColor }}>
            {t('neighbor.overallImpact')}: {t(`neighbor.impact.${activity.impactLevel}`)}
          </span>
        </div>
      </div>

      {/* Impact explanation */}
      <div className="px-4 py-3 border-b border-[var(--border)]">
        <p className="text-xs text-[var(--text2)] leading-relaxed">
          {t(activity.impactExplanation)}
        </p>
      </div>

      {/* Risk details */}
      {details.length > 0 ? (
        <div className="divide-y divide-[var(--border)]">
          {details.map((detail) => (
            <ImpactDetailRow key={detail.riskType} detail={detail} />
          ))}
        </div>
      ) : (
        <div className="px-4 py-6 text-center">
          <Shield size={24} className="mx-auto text-[var(--green)] mb-2" />
          <p className="text-xs text-[var(--text3)]">
            {t('neighbor.noDirectImpact')}
          </p>
        </div>
      )}

      {/* Recommended action */}
      {activity.recommendedAction && (
        <div className="px-4 py-3 border-t border-[var(--border)]" style={{ background: 'var(--bg)' }}>
          <div className="flex items-start gap-2">
            <AlertTriangle size={14} className="text-[var(--amber)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-semibold text-[var(--amber)] uppercase tracking-wider mb-1">
                {t('neighbor.recommendedAction')}
              </p>
              <p className="text-xs text-[var(--text2)]">
                {t(activity.recommendedAction)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImpactDetailRow({ detail }: { detail: ImpactDetail }) {
  const { t } = useTranslation();
  const afterColor = getImpactColor(detail.riskAfter);

  return (
    <div className="px-4 py-3">
      {/* Risk type header */}
      <div className="flex items-center gap-2 mb-2">
        <span style={{ color: afterColor }}>{getRiskIcon(detail.riskType, 14)}</span>
        <span className="text-xs font-semibold text-[var(--text)]">
          {t(detail.riskLabel)}
        </span>
      </div>

      {/* Risk transition */}
      <div className="flex items-center gap-2 mb-2">
        <ImpactLevelBadge level={detail.riskBefore} />
        <ArrowRight size={12} className="text-[var(--text3)]" />
        <ImpactLevelBadge level={detail.riskAfter} />
      </div>

      {/* Affected stands */}
      {detail.affectedStands.length > 0 && (
        <p className="text-[10px] text-[var(--text3)] mb-1.5">
          <span className="text-[var(--text2)] font-medium">{t('neighbor.affectedStands')}:</span>{' '}
          {detail.affectedStands.join(', ')}
        </p>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
        <span className="flex items-center gap-1">
          <Clock size={10} />
          {t('neighbor.peakRisk')}: {detail.peakRiskMonths}
        </span>
        {detail.durationYears > 0 && (
          <span>
            {t('neighbor.duration')}: ~{detail.durationYears} {t('neighbor.years')}
          </span>
        )}
      </div>

      {/* Mitigation */}
      <div className="mt-2 rounded-lg px-3 py-2 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
        <p className="text-[10px] text-[var(--text3)] font-semibold uppercase tracking-wider mb-0.5">
          {t('neighbor.mitigation')}
        </p>
        <p className="text-[11px] text-[var(--text2)]">
          {t(detail.mitigation)}
        </p>
      </div>
    </div>
  );
}

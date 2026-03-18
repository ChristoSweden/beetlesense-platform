import { useTranslation } from 'react-i18next';
import {
  Axe,
  TreePine,
  Construction,
  Sprout,
  Bug,
  CloudLightning,
  Trees,
  MapPin,
  Calendar,
  Ruler,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';
import type { NeighborActivity, ActivityType } from '@/services/neighborActivityService';
import { getActivityColor, getImpactColor } from '@/services/neighborActivityService';

function getActivityIcon(type: ActivityType, size = 16) {
  switch (type) {
    case 'felling_notification': return <Axe size={size} />;
    case 'clearcut_detected': return <TreePine size={size} />;
    case 'road_construction': return <Construction size={size} />;
    case 'planting': return <Sprout size={size} />;
    case 'beetle_damage': return <Bug size={size} />;
    case 'storm_damage': return <CloudLightning size={size} />;
    case 'thinning': return <Trees size={size} />;
  }
}

interface ActivityCardProps {
  activity: NeighborActivity;
  onSelect?: (activity: NeighborActivity) => void;
  compact?: boolean;
}

export function ActivityCard({ activity, onSelect, compact = false }: ActivityCardProps) {
  const { t } = useTranslation();
  const color = getActivityColor(activity.type);
  const impactColor = getImpactColor(activity.impactLevel);

  return (
    <button
      onClick={() => onSelect?.(activity)}
      className="w-full text-left rounded-xl border border-[var(--border)] hover:border-[var(--border2)] transition-all duration-150 overflow-hidden group"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Impact stripe */}
      <div className="h-1" style={{ background: impactColor }} />

      <div className={compact ? 'px-3 py-2.5' : 'px-4 py-3'}>
        {/* Header: type + impact badge */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${color}15`, color }}
            >
              {getActivityIcon(activity.type, compact ? 14 : 16)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[var(--text)] truncate">
                {t(`neighbor.activityType.${activity.type}`)}
              </p>
              {!compact && (
                <p className="text-[10px] text-[var(--text3)] mt-0.5">
                  {t(activity.description)}
                </p>
              )}
            </div>
          </div>
          <span
            className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase flex-shrink-0"
            style={{ color: impactColor, background: `${impactColor}15` }}
          >
            {t(`neighbor.impact.${activity.impactLevel}`)}
          </span>
        </div>

        {/* Meta row */}
        <div className="flex items-center gap-3 text-[10px] text-[var(--text3)] mb-2">
          <span className="flex items-center gap-1">
            <MapPin size={10} />
            {activity.distanceKm} km {t(`neighbor.direction.${activity.direction}`)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar size={10} />
            {new Date(activity.detectedDate).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })}
          </span>
          <span className="flex items-center gap-1">
            <Ruler size={10} />
            {activity.areaHa} ha
          </span>
        </div>

        {/* Impact explanation */}
        {!compact && activity.impactLevel !== 'none' && (
          <div className="rounded-lg px-3 py-2 mb-2" style={{ background: `${impactColor}08` }}>
            <p className="text-[11px] text-[var(--text2)] leading-relaxed">
              {t(activity.impactExplanation)}
            </p>
          </div>
        )}

        {/* Recommended action */}
        {!compact && activity.recommendedAction && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 border border-[var(--border)]">
            <AlertTriangle size={12} className="text-[var(--amber)] flex-shrink-0" />
            <p className="text-[10px] text-[var(--text2)] flex-1">
              {t(activity.recommendedAction)}
            </p>
            <ChevronRight size={12} className="text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors" />
          </div>
        )}

        {/* Compact: show affected stand */}
        {compact && activity.affectedStand && (
          <p className="text-[10px] text-[var(--amber)]">
            {t('neighbor.affects')}: {activity.affectedStand}
          </p>
        )}
      </div>
    </button>
  );
}

export { getActivityIcon };

import { useTranslation } from 'react-i18next';
import { Eye, AlertTriangle, ChevronRight, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getActivitiesWithinRadius,
  countHighImpact,
  getImpactColor,
} from '@/services/neighborActivityService';

export function NeighborWidget() {
  const { t } = useTranslation();
  const activities = getActivitiesWithinRadius(5);
  const highCount = countHighImpact(activities);
  const totalCount = activities.length;

  const hasHighImpact = highCount > 0;

  return (
    <div
      className="rounded-xl border border-[var(--border)] overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Alert banner for high-impact */}
      {hasHighImpact && (
        <div className="flex items-center gap-2 px-4 py-2 bg-[#ef4444]/10 border-b border-[#ef4444]/30">
          <AlertTriangle size={14} className="text-[#ef4444]" />
          <span className="text-[11px] font-semibold text-[#ef4444]">
            {t('neighbor.widget.highImpactAlert', { count: highCount })}
          </span>
        </div>
      )}

      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
            {t('neighbor.widget.title')}
          </h3>
          <Eye size={14} className="text-[var(--text3)]" />
        </div>

        {totalCount > 0 ? (
          <div className="mb-3">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold font-mono text-[var(--text)]">
                {totalCount}
              </span>
              <span className="text-xs text-[var(--text3)]">
                {t('neighbor.widget.activitiesNearby')}
              </span>
            </div>

            {/* Impact summary */}
            <div className="flex items-center gap-2 mt-2">
              {highCount > 0 && (
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: getImpactColor('high'), background: `${getImpactColor('high')}15` }}
                >
                  {highCount} {t('neighbor.widget.highImpact')}
                </span>
              )}
              {activities.filter((a) => a.impactLevel === 'medium').length > 0 && (
                <span
                  className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={{ color: getImpactColor('medium'), background: `${getImpactColor('medium')}15` }}
                >
                  {activities.filter((a) => a.impactLevel === 'medium').length} {t('neighbor.widget.mediumImpact')}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-3 py-2">
            <Shield size={16} className="text-[var(--green)]" />
            <span className="text-xs text-[var(--text3)]">
              {t('neighbor.widget.noActivity')}
            </span>
          </div>
        )}

        {/* Health comparison bar chart */}
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-[var(--text3)] mb-2 font-semibold">
            Forest Health Comparison
          </p>

          {/* Your forest */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text)]">Your forest</span>
              <span className="text-[11px] font-mono font-bold text-[var(--green)]">92/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg)]">
              <div
                className="h-2 rounded-full"
                style={{ width: '92%', background: 'var(--green)' }}
              />
            </div>
          </div>

          {/* Neighbors avg */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] text-[var(--text)]">Neighbors avg</span>
              <span className="text-[11px] font-mono font-bold text-[var(--text3)]">78/100</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg)]">
              <div
                className="h-2 rounded-full"
                style={{ width: '78%', background: 'var(--text3)' }}
              />
            </div>
          </div>

          <p className="text-[9px] text-[var(--text3)] italic">Within 5 km radius</p>
        </div>

        {/* Link to full page */}
        <Link
          to="/owner/neighbor-activity"
          className="flex items-center justify-between p-2.5 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
        >
          <span className="text-xs font-medium text-[var(--text)]">
            {t('neighbor.widget.viewAll')}
          </span>
          <ChevronRight size={14} className="text-[var(--text3)]" />
        </Link>
      </div>
    </div>
  );
}

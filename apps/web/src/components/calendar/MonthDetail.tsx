import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Bug,
  TreePine,
  Sprout,
  Axe,
  Route,
  ClipboardList,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  BookOpen,
  MapPin,
} from 'lucide-react';
import type { ForestryActivity, ActivityCategory, SwedishRegion } from '@/data/forestryCalendarData';
import { CATEGORY_COLORS, MONTH_I18N_KEYS } from '@/data/forestryCalendarData';

// ─── Helpers ───

function getCategoryIcon(category: ActivityCategory, size = 16) {
  switch (category) {
    case 'beetle_monitoring':
      return <Bug size={size} />;
    case 'harvest':
      return <Axe size={size} />;
    case 'planting':
      return <Sprout size={size} />;
    case 'thinning':
      return <TreePine size={size} />;
    case 'road_maintenance':
      return <Route size={size} />;
    case 'inventory':
      return <ClipboardList size={size} />;
  }
}

function getUrgencyBadge(urgency: string, t: (key: string) => string) {
  switch (urgency) {
    case 'high':
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">
          <AlertTriangle size={10} />
          {t('calendar.urgency.high')}
        </span>
      );
    case 'medium':
      return (
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
          {t('calendar.urgency.medium')}
        </span>
      );
    case 'low':
      return (
        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)]">
          {t('calendar.urgency.low')}
        </span>
      );
  }
}

function getRegionLabel(region: SwedishRegion, t: (key: string) => string) {
  return t(`calendar.regions.${region}`);
}

// ─── Component ───

interface MonthDetailProps {
  month: number;
  activities: ForestryActivity[];
  region?: SwedishRegion;
}

export function MonthDetail({ month, activities, region }: MonthDetailProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  if (activities.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] p-6 text-center" style={{ background: 'var(--bg2)' }}>
        <p className="text-sm text-[var(--text3)]">{t('calendar.noActivities')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
        {t(MONTH_I18N_KEYS[month])}
        {region && (
          <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full flex items-center gap-1">
            <MapPin size={10} />
            {getRegionLabel(region, t)}
          </span>
        )}
      </h3>

      <div className="space-y-2">
        {activities.map((activity) => {
          const color = CATEGORY_COLORS[activity.category];
          const title = lang === 'sv' ? activity.title_sv : activity.title_en;
          const description = lang === 'sv' ? activity.description_sv : activity.description_en;

          return (
            <div
              key={activity.id}
              className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-colors"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: `${color}15`, color }}
                >
                  {getCategoryIcon(activity.category, 18)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-medium text-[var(--text)]">{title}</h4>
                    {getUrgencyBadge(activity.urgency, t)}
                  </div>

                  <p className="text-xs text-[var(--text3)] mt-1.5 leading-relaxed">
                    {description}
                  </p>

                  {/* Region tags */}
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    {activity.regions.map((r) => (
                      <span
                        key={r}
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          r === region
                            ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                            : 'border-[var(--border)] text-[var(--text3)] bg-[var(--bg3)]'
                        }`}
                      >
                        {getRegionLabel(r, t)}
                      </span>
                    ))}

                    {/* Reference citation */}
                    {activity.reference && (
                      <span className="text-[10px] text-[var(--text3)] flex items-center gap-1 ml-auto">
                        <BookOpen size={10} />
                        {activity.reference}
                      </span>
                    )}
                  </div>

                  {/* Ask AI link */}
                  <Link
                    to="/owner/dashboard"
                    state={{ openCompanion: true, question: title }}
                    className="inline-flex items-center gap-1.5 mt-3 text-[11px] font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors"
                  >
                    <Sparkles size={12} />
                    {t('calendar.askAiAbout')}
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

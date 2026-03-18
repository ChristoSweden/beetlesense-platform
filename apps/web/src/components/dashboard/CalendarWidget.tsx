import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  CalendarDays,
  ChevronRight,
  Bug,
  Axe,
  Sprout,
  TreePine,
  Route,
  ClipboardList,
} from 'lucide-react';
import {
  getUrgentActivities,
  CATEGORY_COLORS,
  MONTH_I18N_KEYS,
  type ActivityCategory,
} from '@/data/forestryCalendarData';

function getCategoryIcon(category: ActivityCategory, size = 14) {
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

export function CalendarWidget() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const currentMonth = new Date().getMonth() + 1;

  const topActivities = useMemo(
    () => getUrgentActivities(currentMonth, undefined, 3),
    [currentMonth],
  );

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('calendar.widgetTitle')}
          </h3>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
          {t(MONTH_I18N_KEYS[currentMonth])}
        </span>
      </div>

      {/* Activities */}
      <div className="space-y-2 mb-3">
        {topActivities.map((activity) => {
          const color = CATEGORY_COLORS[activity.category];
          const title = lang === 'sv' ? activity.title_sv : activity.title_en;

          return (
            <div
              key={activity.id}
              className="flex items-center gap-2.5 p-2 rounded-lg border border-[var(--border)]"
              style={{ background: 'var(--bg)' }}
            >
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0"
                style={{ background: `${color}15`, color }}
              >
                {getCategoryIcon(activity.category, 14)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-[var(--text)] block truncate">
                  {title}
                </span>
                {activity.urgency === 'high' && (
                  <span className="text-[9px] font-mono text-red-400">
                    {t('calendar.urgency.high')}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Link to full calendar */}
      <Link
        to="/owner/calendar"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {t('calendar.viewFullCalendar')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Bug,
  TreePine,
  Sprout,
  Axe,
  Route,
  ClipboardList,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  getActivitiesByMonthAndRegion,
  getUrgentActivities,
  CATEGORY_COLORS,
  CATEGORY_I18N_KEYS,
  MONTH_I18N_KEYS,
  type ActivityCategory,
  type SwedishRegion,
} from '@/data/forestryCalendarData';
import { MonthDetail } from './MonthDetail';

// ─── Helpers ───

function getCategoryIcon(category: ActivityCategory, size = 12) {
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

/** Get unique categories present in a given month */
function getMonthCategories(month: number, region?: SwedishRegion): ActivityCategory[] {
  const activities = getActivitiesByMonthAndRegion(month, region);
  const seen = new Set<ActivityCategory>();
  return activities.reduce<ActivityCategory[]>((acc, a) => {
    if (!seen.has(a.category)) {
      seen.add(a.category);
      acc.push(a.category);
    }
    return acc;
  }, []);
}

// ─── Component ───

interface ForestryCalendarProps {
  /** User's parcel region for personalization */
  region?: SwedishRegion;
}

export function ForestryCalendar({ region }: ForestryCalendarProps) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  // Current month's urgent activities
  const urgentNow = useMemo(
    () => getUrgentActivities(currentMonth, region, 3),
    [currentMonth, region],
  );

  // Selected month's full activity list
  const selectedActivities = useMemo(
    () => getActivitiesByMonthAndRegion(selectedMonth, region),
    [selectedMonth, region],
  );

  return (
    <div className="space-y-6">
      {/* ─── "What to do now" hero ─── */}
      <div
        className="rounded-2xl border border-[var(--green)]/20 p-5 relative overflow-hidden"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Subtle glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[var(--green)] opacity-[0.04] blur-3xl pointer-events-none" />

        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={16} className="text-[var(--green)]" />
          <h2 className="text-sm font-semibold text-[var(--text)]">
            {t('calendar.whatToDoNow')}
          </h2>
          <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
            {t(MONTH_I18N_KEYS[currentMonth])}
          </span>
        </div>

        <div className="space-y-2">
          {urgentNow.map((activity) => {
            const color = CATEGORY_COLORS[activity.category];
            const title = lang === 'sv' ? activity.title_sv : activity.title_en;
            const desc = lang === 'sv' ? activity.description_sv : activity.description_en;

            return (
              <button
                key={activity.id}
                onClick={() => setSelectedMonth(activity.month)}
                className="flex items-start gap-3 w-full p-3 rounded-lg border border-[var(--border)] text-left hover:border-[var(--border2)] transition-colors"
                style={{ background: 'var(--bg)' }}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, color }}
                >
                  {getCategoryIcon(activity.category, 16)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--text)]">{title}</span>
                    {activity.urgency === 'high' && (
                      <span className="text-[10px] font-mono text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded-full">
                        {t('calendar.urgency.high')}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--text3)] mt-0.5 line-clamp-2">{desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 12-month calendar grid ─── */}
      <div>
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">
          {t('calendar.title')}
        </h2>

        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
            const isCurrentMonth = month === currentMonth;
            const isSelected = month === selectedMonth;
            const categories = getMonthCategories(month, region);

            return (
              <button
                key={month}
                onClick={() => setSelectedMonth(month)}
                className={`
                  relative rounded-xl border p-3 text-left transition-all duration-150
                  ${
                    isSelected
                      ? 'border-[var(--green)] bg-[var(--green)]/5 ring-1 ring-[var(--green)]/20'
                      : isCurrentMonth
                        ? 'border-[var(--green)]/30 bg-[var(--bg2)] hover:border-[var(--green)]/50'
                        : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
                  }
                `}
              >
                {/* Current month indicator */}
                {isCurrentMonth && (
                  <div className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--green)]" />
                )}

                {/* Month name */}
                <span
                  className={`text-xs font-medium block mb-2 ${
                    isSelected ? 'text-[var(--green)]' : 'text-[var(--text)]'
                  }`}
                >
                  {t(MONTH_I18N_KEYS[month])}
                </span>

                {/* Category tags */}
                <div className="flex flex-wrap gap-1">
                  {categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-0.5 text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                      style={{
                        background: `${CATEGORY_COLORS[cat]}15`,
                        color: CATEGORY_COLORS[cat],
                      }}
                    >
                      {getCategoryIcon(cat, 9)}
                      {t(CATEGORY_I18N_KEYS[cat])}
                    </span>
                  ))}
                  {categories.length > 3 && (
                    <span className="text-[9px] text-[var(--text3)] px-1">
                      +{categories.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Category legend ─── */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(CATEGORY_COLORS) as ActivityCategory[]).map((cat) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 text-[10px] font-mono text-[var(--text3)]"
          >
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: CATEGORY_COLORS[cat] }}
            />
            {t(CATEGORY_I18N_KEYS[cat])}
          </span>
        ))}
      </div>

      {/* ─── Selected month detail ─── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ChevronDown size={14} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text3)]">
            {t('calendar.detailsFor', { month: t(MONTH_I18N_KEYS[selectedMonth]) })}
          </span>
        </div>
        <MonthDetail month={selectedMonth} activities={selectedActivities} region={region} />
      </div>
    </div>
  );
}

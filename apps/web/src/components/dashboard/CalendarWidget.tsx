import { useMemo, useState, useRef, useEffect } from 'react';
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
  ExternalLink,
  Download,
} from 'lucide-react';
import {
  getUrgentActivities,
  CATEGORY_COLORS,
  MONTH_I18N_KEYS,
  type ActivityCategory,
  type ForestryActivity,
} from '@/data/forestryCalendarData';
import {
  downloadICS,
  generateGoogleCalendarURL,
  generateOutlookURL,
  type CalendarEvent,
} from '@/services/calendarExport';

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

function activityToEvent(activity: ForestryActivity, lang: string): CalendarEvent {
  const title = lang === 'sv' ? activity.title_sv : activity.title_en;
  const description = lang === 'sv' ? activity.description_sv : activity.description_en;
  const year = new Date().getFullYear();
  const startDate = new Date(year, activity.month - 1, 1, 8, 0, 0);
  const endDate = new Date(year, activity.month - 1, 1, 9, 0, 0);
  return {
    title: `[BeetleSense] ${title}`,
    description,
    startDate,
    endDate,
    reminder: activity.urgency === 'high' ? 60 : 30,
  };
}

function MiniSyncMenu({ activity, lang }: { activity: ForestryActivity; lang: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const event = activityToEvent(activity, lang);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="w-6 h-6 rounded flex items-center justify-center text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
        title="Add to calendar"
      >
        <CalendarDays size={12} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-lg z-50 py-1 animate-in fade-in duration-150">
          <button
            onClick={() => {
              window.open(generateGoogleCalendarURL(event), '_blank');
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ExternalLink size={11} className="text-[var(--text3)]" />
            Google Calendar
          </button>
          <button
            onClick={() => {
              window.open(generateOutlookURL(event), '_blank');
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ExternalLink size={11} className="text-[var(--text3)]" />
            Outlook
          </button>
          <div className="border-t border-[var(--border)] my-0.5" />
          <button
            onClick={() => {
              downloadICS([event], `${activity.id}.ics`);
              setOpen(false);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Download size={11} className="text-[var(--text3)]" />
            Download .ics
          </button>
        </div>
      )}
    </div>
  );
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
              <MiniSyncMenu activity={activity} lang={lang} />
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

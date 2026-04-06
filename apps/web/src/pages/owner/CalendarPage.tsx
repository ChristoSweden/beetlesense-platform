import { useState, useRef, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin, Download, ExternalLink, ChevronDown } from 'lucide-react';
import { ForestryCalendar } from '@/components/calendar/ForestryCalendar';
import {
  getActivitiesByMonthAndRegion,
  type SwedishRegion,
  type ForestryActivity,
} from '@/data/forestryCalendarData';
import {
  downloadICS,
  generateGoogleCalendarURL,
  generateOutlookURL,
  type CalendarEvent,
} from '@/services/calendarExport';
import { useToast } from '@/components/common/Toast';

const REGIONS: SwedishRegion[] = ['south', 'central', 'north'];

/** Convert a ForestryActivity to a CalendarEvent for a given year */
function activityToCalendarEvent(
  activity: ForestryActivity,
  lang: string,
  year: number,
): CalendarEvent {
  const title = lang === 'sv' ? activity.title_sv : activity.title_en;
  const description = lang === 'sv' ? activity.description_sv : activity.description_en;
  // Place the event on the 1st of the activity month, 08:00-09:00 local
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

/** Sync dropdown for a single event or all events */
function SyncDropdown({
  events,
  label,
  className,
}: {
  events: CalendarEvent[];
  label: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const handleGoogle = () => {
    if (events.length === 1) {
      window.open(generateGoogleCalendarURL(events[0]), '_blank');
    } else {
      // For multiple events, open first one and download .ics for all
      window.open(generateGoogleCalendarURL(events[0]), '_blank');
      downloadICS(events, 'beetlesense-calendar.ics');
      toast('Opened first event in Google Calendar. ICS file downloaded for the rest.', 'info');
    }
    setOpen(false);
  };

  const handleOutlook = () => {
    if (events.length === 1) {
      window.open(generateOutlookURL(events[0]), '_blank');
    } else {
      window.open(generateOutlookURL(events[0]), '_blank');
      downloadICS(events, 'beetlesense-calendar.ics');
      toast('Opened first event in Outlook. ICS file downloaded for the rest.', 'info');
    }
    setOpen(false);
  };

  const handleICS = () => {
    downloadICS(events, 'beetlesense-calendar.ics');
    toast('Calendar file downloaded', 'success');
    setOpen(false);
  };

  return (
    <div ref={ref} className={`relative ${className ?? ''}`}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        <CalendarDays size={14} />
        <span>{label}</span>
        <ChevronDown size={12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 w-52 rounded-lg border border-[var(--border)] bg-[var(--bg2)] shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <button
            onClick={handleGoogle}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ExternalLink size={13} className="text-[var(--text3)]" />
            Google Calendar
          </button>
          <button
            onClick={handleOutlook}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ExternalLink size={13} className="text-[var(--text3)]" />
            Outlook
          </button>
          <div className="border-t border-[var(--border)] my-1" />
          <button
            onClick={handleICS}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Download size={13} className="text-[var(--text3)]" />
            Download .ics file
          </button>
        </div>
      )}
    </div>
  );
}

export default function CalendarPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [region, setRegion] = useState<SwedishRegion | undefined>(undefined);
  const year = new Date().getFullYear();

  // Get all events for the current year to enable "Export all"
  const allEvents = useMemo(() => {
    const activities: ForestryActivity[] = [];
    for (let m = 1; m <= 12; m++) {
      activities.push(...getActivitiesByMonthAndRegion(m, region));
    }
    return activities.map((a) => activityToCalendarEvent(a, lang, year));
  }, [region, lang, year]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={20} className="text-[var(--green)]" />
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('calendar.pageTitle')}
              </h1>
            </div>
            <p className="text-xs text-[var(--text3)]">
              {t('calendar.pageSubtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Sync to Calendar */}
            <SyncDropdown
              events={allEvents}
              label="Sync to Calendar"
            />

            {/* Region filter */}
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-[var(--text3)]" />
              <div className="flex rounded-lg border border-[var(--border)] overflow-hidden">
                <button
                  onClick={() => setRegion(undefined)}
                  className={`px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    !region
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                  }`}
                >
                  {t('calendar.allRegions')}
                </button>
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRegion(r)}
                    className={`px-3 py-1.5 text-[11px] font-medium border-l border-[var(--border)] transition-colors ${
                      region === r
                        ? 'bg-[var(--green)]/10 text-[var(--green)]'
                        : 'text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)]'
                    }`}
                  >
                    {t(`calendar.regions.${r}`)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <ForestryCalendar region={region} />
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, MapPin } from 'lucide-react';
import { ForestryCalendar } from '@/components/calendar/ForestryCalendar';
import type { SwedishRegion } from '@/data/forestryCalendarData';

const REGIONS: SwedishRegion[] = ['south', 'central', 'north'];

export default function CalendarPage() {
  const { t } = useTranslation();
  const [region, setRegion] = useState<SwedishRegion | undefined>(undefined);

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

          {/* Region filter */}
          <div className="flex items-center gap-2 flex-shrink-0">
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

        {/* Calendar */}
        <ForestryCalendar region={region} />
      </div>
    </div>
  );
}

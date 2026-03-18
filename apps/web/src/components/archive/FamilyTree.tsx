import { useTranslation } from 'react-i18next';
import { User, Crown, Calendar, ChevronRight } from 'lucide-react';
import type { FamilySteward, ArchiveEvent } from '@/hooks/useForestArchive';

interface FamilyTreeProps {
  stewards: FamilySteward[];
  events: ArchiveEvent[];
}

export function FamilyTree({ stewards, events }: FamilyTreeProps) {
  const { t } = useTranslation();

  // Get key events during each steward's tenure
  function getEventsForSteward(steward: FamilySteward) {
    return events.filter((e) => {
      const year = new Date(e.date).getFullYear();
      const end = steward.endYear ?? new Date().getFullYear();
      return year >= steward.startYear && year <= end;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <User size={16} className="text-[var(--green)]" />
        <h3 className="text-sm font-semibold text-[var(--text)]">
          {t('archive.familyStewardship')}
        </h3>
      </div>

      <div className="space-y-3">
        {stewards.map((steward) => {
          const tenure = getEventsForSteward(steward);
          const years = steward.endYear
            ? steward.endYear - steward.startYear
            : new Date().getFullYear() - steward.startYear;

          return (
            <div
              key={steward.id}
              className={`rounded-xl border p-4 transition-colors ${
                steward.isCurrent
                  ? 'border-[var(--green)]/30 bg-[var(--green)]/5'
                  : 'border-[var(--border)]'
              }`}
              style={{ background: steward.isCurrent ? undefined : 'var(--bg2)' }}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border ${
                      steward.isCurrent
                        ? 'border-[var(--green)]/40 bg-[var(--green)]/10'
                        : 'border-[var(--border)] bg-[var(--bg3)]'
                    }`}
                  >
                    {steward.isCurrent ? (
                      <Crown size={18} className="text-[var(--green)]" />
                    ) : (
                      <User size={18} className="text-[var(--text3)]" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-[var(--text)]">
                      {steward.name}
                    </h4>
                    <p className="text-[11px] text-[var(--text3)]">
                      {steward.relation}
                      {steward.isCurrent && (
                        <span className="ml-2 text-[var(--green)] font-medium">
                          {t('archive.currentSteward')}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tenure bar */}
              <div className="flex items-center gap-2 mt-3">
                <Calendar size={12} className="text-[var(--text3)]" />
                <span className="text-[11px] font-mono text-[var(--text2)]">
                  {steward.startYear} — {steward.endYear ?? t('archive.present')}
                </span>
                <span className="text-[10px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-2 py-0.5 rounded-full">
                  {years} {t('archive.years')}
                </span>
              </div>

              {/* Key events */}
              {tenure.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <span className="text-[10px] font-mono text-[var(--text3)] uppercase">
                    {t('archive.keyEvents')} ({tenure.length})
                  </span>
                  {tenure.slice(0, 4).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 text-[11px] text-[var(--text2)]"
                    >
                      <ChevronRight size={10} className="text-[var(--text3)]" />
                      <span className="font-mono text-[var(--text3)]">
                        {new Date(event.date).getFullYear()}
                      </span>
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                  {tenure.length > 4 && (
                    <span className="text-[10px] text-[var(--text3)] italic pl-5">
                      +{tenure.length - 4} {t('archive.moreEvents')}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

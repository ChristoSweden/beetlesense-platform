import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Truck, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { useContractors } from '@/hooks/useContractors';

export function ContractorWidget() {
  const { t } = useTranslation();
  const { getNextBooking, loading } = useContractors();
  const nextBooking = getNextBooking();

  // Calculate days until next booking
  const daysUntil = nextBooking?.start_date
    ? Math.max(0, Math.ceil((new Date(nextBooking.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Truck size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            {t('contractor.widget.title')}
          </h3>
        </div>
      </div>

      {loading ? (
        <div className="h-16 rounded-lg bg-[var(--bg3)] animate-pulse" />
      ) : nextBooking ? (
        <div className="p-3 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-medium text-[var(--text)]">
              {nextBooking.contractor_name}
            </span>
            <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
              {t(`contractor.serviceType.${nextBooking.service_type}`)}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[var(--text3)]">
            <div className="flex items-center gap-1">
              <CalendarDays size={11} />
              {nextBooking.start_date
                ? new Date(nextBooking.start_date).toLocaleDateString('sv-SE')
                : t('contractor.bookings.datesPending')}
            </div>
            {daysUntil !== null && (
              <div className="flex items-center gap-1">
                <Clock size={11} />
                {daysUntil === 0
                  ? t('contractor.widget.today')
                  : t('contractor.widget.daysUntil', { count: daysUntil })}
              </div>
            )}
          </div>
          <p className="text-[10px] text-[var(--text3)] mt-1">
            {nextBooking.parcel_name}
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--border)] mb-3" style={{ background: 'var(--bg)' }}>
          <CalendarDays size={14} className="text-[var(--text3)]" />
          <span className="text-xs text-[var(--text3)]">
            {t('contractor.widget.noBookings')}
          </span>
        </div>
      )}

      <Link
        to="/owner/contractors"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--green)] hover:bg-[var(--green)]/5 transition-colors"
      >
        {nextBooking ? t('contractor.widget.viewBookings') : t('contractor.widget.findContractor')}
        <ChevronRight size={14} />
      </Link>
    </div>
  );
}

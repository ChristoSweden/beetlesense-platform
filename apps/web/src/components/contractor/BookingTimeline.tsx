import { useTranslation } from 'react-i18next';
import {
  Clock,
  FileText,
  CheckCircle2,
  Loader2,
  CircleDot,
  CalendarDays,
  TreePine,
  Banknote,
} from 'lucide-react';
import type { Booking, BookingStatus } from '@/hooks/useContractors';

interface BookingTimelineProps {
  bookings: Booking[];
}

const STATUS_CONFIG: Record<BookingStatus, {
  icon: typeof Clock;
  color: string;
  bg: string;
  border: string;
}> = {
  requested: {
    icon: Clock,
    color: 'text-blue-400',
    bg: 'bg-blue-500/15',
    border: 'border-blue-500/30',
  },
  quoted: {
    icon: FileText,
    color: 'text-amber-400',
    bg: 'bg-amber-500/15',
    border: 'border-amber-500/30',
  },
  confirmed: {
    icon: CheckCircle2,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-500/30',
  },
  in_progress: {
    icon: Loader2,
    color: 'text-purple-400',
    bg: 'bg-purple-500/15',
    border: 'border-purple-500/30',
  },
  completed: {
    icon: CircleDot,
    color: 'text-[var(--text3)]',
    bg: 'bg-[var(--bg3)]',
    border: 'border-[var(--border)]',
  },
};

export function BookingTimeline({ bookings }: BookingTimelineProps) {
  const { t } = useTranslation();

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-14 h-14 rounded-full bg-[var(--bg3)] flex items-center justify-center mb-4">
          <CalendarDays size={24} className="text-[var(--text3)]" />
        </div>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
          {t('contractor.bookings.empty')}
        </h3>
        <p className="text-xs text-[var(--text3)] max-w-xs">
          {t('contractor.bookings.emptyDesc')}
        </p>
      </div>
    );
  }

  // Sort: active first, then by date
  const sortedBookings = [...bookings].sort((a, b) => {
    const statusOrder: Record<BookingStatus, number> = {
      in_progress: 0,
      confirmed: 1,
      quoted: 2,
      requested: 3,
      completed: 4,
    };
    const orderDiff = statusOrder[a.status] - statusOrder[b.status];
    if (orderDiff !== 0) return orderDiff;
    return (a.start_date ?? a.requested_date).localeCompare(b.start_date ?? b.requested_date);
  });

  return (
    <div className="space-y-1">
      {sortedBookings.map((booking, index) => {
        const config = STATUS_CONFIG[booking.status];
        const Icon = config.icon;
        const isLast = index === sortedBookings.length - 1;

        return (
          <div key={booking.id} className="flex gap-3">
            {/* Timeline rail */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center border ${config.border}`}>
                <Icon size={14} className={config.color} />
              </div>
              {!isLast && (
                <div className="w-px flex-1 min-h-[16px] bg-[var(--border)]" />
              )}
            </div>

            {/* Booking card */}
            <div
              className="flex-1 mb-3 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
              style={{ background: 'var(--bg2)' }}
            >
              {/* Status badge + contractor */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-[var(--text)]">
                  {booking.contractor_name}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${config.bg} ${config.color} border ${config.border}`}>
                  {t(`contractor.bookings.status.${booking.status}`)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
                  <TreePine size={12} className="text-[var(--text3)]" />
                  <span>{booking.parcel_name}</span>
                  <span className="text-[var(--text3)]">&middot;</span>
                  <span className="text-[var(--green)]">
                    {t(`contractor.serviceType.${booking.service_type}`)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
                  <CalendarDays size={12} />
                  {booking.start_date && booking.end_date ? (
                    <span>
                      {new Date(booking.start_date).toLocaleDateString('sv-SE')} &ndash;{' '}
                      {new Date(booking.end_date).toLocaleDateString('sv-SE')}
                    </span>
                  ) : (
                    <span>{t('contractor.bookings.datesPending')}</span>
                  )}
                </div>

                {booking.volume_estimate > 0 && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text3)]">
                    <span>{t('contractor.bookings.volume')}: {booking.volume_estimate} m&sup3;fub</span>
                  </div>
                )}

                {booking.price_estimate && (
                  <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
                    <Banknote size={12} className="text-[var(--green)]" />
                    <span className="font-mono">
                      {booking.price_estimate.toLocaleString('sv-SE')} SEK
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {booking.notes && (
                <p className="mt-2 text-[11px] text-[var(--text3)] leading-relaxed border-t border-[var(--border)] pt-2">
                  {booking.notes}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

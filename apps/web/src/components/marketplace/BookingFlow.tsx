import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, CalendarDays, Clock, FileText, Check, Mail, Phone } from 'lucide-react';
import type { MarketplaceListing, MarketplaceBooking } from '@/hooks/useMarketplace';

type BookingStep = 'schedule' | 'confirm' | 'done';

interface BookingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  listing: MarketplaceListing | null;
  onBook: (listingId: string, date: string, time: string, notes: string) => MarketplaceBooking;
}

export function BookingFlow({ isOpen, onClose, listing, onBook }: BookingFlowProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState<BookingStep>('schedule');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [notes, setNotes] = useState('');
  const [booking, setBooking] = useState<MarketplaceBooking | null>(null);

  if (!isOpen || !listing) return null;

  const handleConfirm = () => {
    const result = onBook(listing.id, date, time, notes);
    setBooking(result);
    setStep('done');
  };

  const handleClose = () => {
    setStep('schedule');
    setDate('');
    setTime('09:00');
    setNotes('');
    setBooking(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--border)] shadow-2xl mx-4"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border)]">
          <h2 className="text-base font-serif font-bold text-[var(--text)]">
            {step === 'done' ? t('marketplace.bookingConfirmed') : t('marketplace.bookNow')}
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        <div className="p-5">
          {/* Listing preview */}
          <div className="p-3 rounded-lg border border-[var(--border)] mb-5" style={{ background: 'var(--bg)' }}>
            <p className="text-xs font-medium text-[var(--text)]">{listing.title}</p>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">
              {listing.seller.name} &middot; {listing.location}
            </p>
            {listing.price !== null && (
              <p className="text-xs font-semibold text-[var(--green)] mt-1">
                {listing.price} kr {listing.price_unit}
              </p>
            )}
          </div>

          {/* Step: Schedule */}
          {step === 'schedule' && (
            <div className="space-y-4">
              {/* Date */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] mb-1.5">
                  <CalendarDays size={13} />
                  {t('marketplace.selectDate')}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                />
              </div>

              {/* Time */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] mb-1.5">
                  <Clock size={13} />
                  {t('marketplace.selectTime')}
                </label>
                <select
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
                >
                  {['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] mb-1.5">
                  <FileText size={13} />
                  {t('marketplace.bookingNotes')}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder={t('marketplace.bookingNotesPlaceholder')}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)] resize-none"
                />
              </div>

              <button
                onClick={() => setStep('confirm')}
                disabled={!date}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('marketplace.reviewBooking')}
              </button>
            </div>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[var(--border)] space-y-3" style={{ background: 'var(--bg)' }}>
                <div className="flex items-center gap-2">
                  <CalendarDays size={14} className="text-[var(--green)]" />
                  <span className="text-xs text-[var(--text)]">
                    {new Date(date).toLocaleDateString('sv-SE', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-[var(--green)]" />
                  <span className="text-xs text-[var(--text)]">{time}</span>
                </div>
                {notes && (
                  <div className="flex items-start gap-2">
                    <FileText size={14} className="text-[var(--green)] mt-0.5" />
                    <span className="text-xs text-[var(--text3)]">{notes}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep('schedule')}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
                >
                  {t('common.back')}
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors"
                >
                  {t('marketplace.confirmBooking')}
                </button>
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && booking && (
            <div className="space-y-4 text-center">
              <div className="w-14 h-14 rounded-full bg-[var(--green)]/10 flex items-center justify-center mx-auto">
                <Check size={28} className="text-[var(--green)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1">
                  {t('marketplace.bookingSuccess')}
                </h3>
                <p className="text-xs text-[var(--text3)]">
                  {t('marketplace.bookingSuccessDesc')}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-[var(--border)] text-left space-y-2" style={{ background: 'var(--bg)' }}>
                <p className="text-xs font-medium text-[var(--text2)]">
                  {t('marketplace.contactDetails')}
                </p>
                <div className="flex items-center gap-2">
                  <Mail size={13} className="text-[var(--green)]" />
                  <span className="text-xs text-[var(--text)]">{booking.contact_email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone size={13} className="text-[var(--green)]" />
                  <span className="text-xs text-[var(--text)]">{booking.contact_phone}</span>
                </div>
              </div>

              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-[var(--green)] text-[#030d05] hover:bg-[var(--green2)] transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Star,
  MapPin,
  Phone,
  Mail,
  Globe,
  Shield,
  ChevronLeft,
  ChevronRight,
  Wrench,
  Calendar,
} from 'lucide-react';
import type { Contractor } from '@/hooks/useContractors';

interface ContractorProfileProps {
  contractor: Contractor;
  onClose: () => void;
  onRequestQuote: (contractor: Contractor) => void;
}

type ProfileTab = 'overview' | 'machines' | 'reviews' | 'calendar';

export function ContractorProfile({ contractor, onClose, onRequestQuote }: ContractorProfileProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ProfileTab>('overview');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const tabs: { key: ProfileTab; label: string }[] = [
    { key: 'overview', label: t('contractor.profile.overview') },
    { key: 'machines', label: t('contractor.profile.machines') },
    { key: 'reviews', label: t('contractor.profile.reviews') },
    { key: 'calendar', label: t('contractor.profile.calendar') },
  ];

  // Calendar logic
  const calendarDays = useMemo(() => {
    const { year, month } = calendarMonth;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDow = (firstDay.getDay() + 6) % 7; // Monday = 0

    const days: Array<{ date: string; day: number; status: 'available' | 'booked' | 'tentative' | 'empty' }> = [];

    // Padding
    for (let i = 0; i < startDow; i++) {
      days.push({ date: '', day: 0, status: 'empty' });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const calEntry = contractor.availabilityCalendar.find((c) => c.date === dateStr);
      days.push({
        date: dateStr,
        day: d,
        status: calEntry?.status ?? 'available',
      });
    }

    return days;
  }, [calendarMonth, contractor.availabilityCalendar]);

  const monthLabel = new Date(calendarMonth.year, calendarMonth.month).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
  });

  const prevMonth = () => {
    setCalendarMonth((prev) => {
      const m = prev.month - 1;
      return m < 0 ? { year: prev.year - 1, month: 11 } : { year: prev.year, month: m };
    });
  };

  const nextMonth = () => {
    setCalendarMonth((prev) => {
      const m = prev.month + 1;
      return m > 11 ? { year: prev.year + 1, month: 0 } : { year: prev.year, month: m };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-[var(--border)] overflow-hidden flex flex-col"
        style={{ background: 'var(--bg)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--green)]">
                {contractor.company_name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text)]">{contractor.company_name}</h2>
              <p className="text-xs text-[var(--text3)]">{contractor.contact_person} &middot; Org.nr {contractor.org_number}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} className="text-[var(--text3)]" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] px-5" style={{ background: 'var(--bg2)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-[var(--green)] text-[var(--green)]'
                  : 'border-transparent text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'overview' && (
            <>
              {/* Description */}
              <p className="text-sm text-[var(--text2)] leading-relaxed">{contractor.description}</p>

              {/* Contact */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">{t('contractor.profile.contact')}</h3>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
                    <Phone size={13} className="text-[var(--text3)]" />
                    {contractor.phone}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
                    <Mail size={13} className="text-[var(--text3)]" />
                    {contractor.email}
                  </div>
                  {contractor.website && (
                    <div className="flex items-center gap-2 text-xs text-[var(--green)]">
                      <Globe size={13} className="text-[var(--text3)]" />
                      <a href={contractor.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {contractor.website.replace('https://', '')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
                    <MapPin size={13} className="text-[var(--text3)]" />
                    {contractor.service_counties.join(', ')}
                  </div>
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">{t('contractor.profile.certifications')}</h3>
                <div className="flex flex-wrap gap-2">
                  {contractor.certifications.map((cert) => (
                    <div
                      key={cert}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20"
                    >
                      <Shield size={12} className="text-[var(--green)]" />
                      <span className="text-[11px] font-medium text-[var(--green)]">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Services */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">{t('contractor.profile.services')}</h3>
                <div className="flex flex-wrap gap-1.5">
                  {contractor.service_types.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
                    >
                      {t(`contractor.serviceType.${s}`)}
                    </span>
                  ))}
                </div>
              </div>

              {/* Rating summary */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      size={16}
                      className={star <= Math.round(contractor.rating) ? 'text-amber-400 fill-amber-400' : 'text-[var(--border2)]'}
                    />
                  ))}
                </div>
                <span className="text-sm font-semibold text-[var(--text)]">{contractor.rating.toFixed(1)}</span>
                <span className="text-xs text-[var(--text3)]">
                  ({contractor.review_count} {t('contractor.profile.reviewCount')})
                </span>
              </div>
            </>
          )}

          {activeTab === 'machines' && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider flex items-center gap-2">
                <Wrench size={14} className="text-[var(--green)]" />
                {t('contractor.profile.machineFleet')}
              </h3>
              {contractor.machines.map((machine, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border)]"
                  style={{ background: 'var(--bg2)' }}
                >
                  <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center flex-shrink-0">
                    <Wrench size={16} className="text-[var(--green)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text)]">{machine.model}</p>
                    <p className="text-[11px] text-[var(--text3)]">
                      {t(`contractor.machineType.${machine.type}`)} &middot; {machine.year}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-3">
              {contractor.reviews.length === 0 ? (
                <p className="text-sm text-[var(--text3)] text-center py-8">{t('contractor.profile.noReviews')}</p>
              ) : (
                contractor.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 rounded-xl border border-[var(--border)]"
                    style={{ background: 'var(--bg2)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[var(--bg3)] flex items-center justify-center">
                          <span className="text-[10px] font-semibold text-[var(--green)]">
                            {review.author_name.charAt(0)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[var(--text)]">{review.author_name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={11}
                            className={star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--border2)]'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text2)] leading-relaxed">{review.comment}</p>
                    <p className="text-[10px] text-[var(--text3)] mt-2">{review.date}</p>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'calendar' && (
            <div>
              {/* Month nav */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors">
                  <ChevronLeft size={16} className="text-[var(--text3)]" />
                </button>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--green)]" />
                  <span className="text-sm font-medium text-[var(--text)] capitalize">{monthLabel}</span>
                </div>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--bg3)] transition-colors">
                  <ChevronRight size={16} className="text-[var(--text3)]" />
                </button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'].map((d) => (
                  <div key={d} className="text-center text-[10px] font-mono text-[var(--text3)] py-1">
                    {d}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, i) => {
                  if (day.status === 'empty') {
                    return <div key={i} className="h-9" />;
                  }

                  const statusStyles = {
                    available: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
                    booked: 'bg-red-500/15 text-red-400 border-red-500/20',
                    tentative: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
                  };

                  return (
                    <div
                      key={i}
                      className={`h-9 rounded-lg border flex items-center justify-center text-[11px] font-mono ${statusStyles[day.status]}`}
                    >
                      {day.day}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 justify-center">
                {[
                  { label: t('contractor.profile.calAvailable'), color: 'bg-emerald-400' },
                  { label: t('contractor.profile.calBooked'), color: 'bg-red-400' },
                  { label: t('contractor.profile.calTentative'), color: 'bg-amber-400' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                    <span className="text-[10px] text-[var(--text3)]">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer action */}
        <div className="px-5 py-4 border-t border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
          <button
            onClick={() => onRequestQuote(contractor)}
            className="w-full py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            {t('contractor.requestQuote')}
          </button>
        </div>
      </div>
    </div>
  );
}

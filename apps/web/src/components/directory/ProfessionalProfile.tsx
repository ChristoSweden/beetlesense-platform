/**
 * ProfessionalProfile — Full profile modal/page for a professional.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  Star,
  MapPin,
  Mail,
  Phone,
  Globe,
  Award,
  Wrench,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { Professional, ProfessionalCategory } from '@/hooks/useProfessionals';

interface ProfessionalProfileProps {
  professional: Professional;
  distance: number | null;
  onClose: () => void;
  onRequestQuote: (professional: Professional) => void;
}

const CATEGORY_I18N: Record<ProfessionalCategory, string> = {
  forest_inspector: 'professionals.categories.forestInspector',
  logging_contractor: 'professionals.categories.loggingContractor',
  planting_service: 'professionals.categories.plantingService',
  drone_pilot: 'professionals.categories.dronePilot',
  forest_advisor: 'professionals.categories.forestAdvisor',
  transport_company: 'professionals.categories.transportCompany',
};

const CATEGORY_COLORS: Record<ProfessionalCategory, string> = {
  forest_inspector: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  logging_contractor: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  planting_service: 'bg-green-500/10 text-green-400 border-green-500/20',
  drone_pilot: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  forest_advisor: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  transport_company: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
};

function AvatarFallback({ name, size = 'lg' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const sizeClass = size === 'lg' ? 'w-16 h-16 text-lg' : 'w-8 h-8 text-xs';

  return (
    <div className={`${sizeClass} rounded-full bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center flex-shrink-0`}>
      <span className="font-semibold text-[var(--green)]">{initials}</span>
    </div>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={14}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-[var(--text3)]'}
        />
      ))}
    </div>
  );
}

function AvailabilityCalendar({ availability }: { availability: Professional['availability'] }) {
  const { t } = useTranslation();
  const [weekOffset, setWeekOffset] = useState(0);

  const DAYS_PER_PAGE = 14;
  const start = weekOffset * DAYS_PER_PAGE;
  const visibleSlots = availability.slice(start, start + DAYS_PER_PAGE);

  const dayLabels = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-[var(--text)]">
          {t('professionals.profile.availability')}
        </h4>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setWeekOffset((o) => Math.max(0, o - 1))}
            disabled={weekOffset === 0}
            className="p-1 rounded text-[var(--text3)] hover:text-[var(--text2)] disabled:opacity-30 transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            onClick={() => setWeekOffset((o) => (start + DAYS_PER_PAGE < availability.length ? o + 1 : o))}
            disabled={start + DAYS_PER_PAGE >= availability.length}
            className="p-1 rounded text-[var(--text3)] hover:text-[var(--text2)] disabled:opacity-30 transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {visibleSlots.map((slot) => {
          const d = new Date(slot.date);
          const dayLabel = dayLabels[d.getDay() === 0 ? 6 : d.getDay() - 1];
          const dateLabel = d.getDate().toString();
          return (
            <div
              key={slot.date}
              className={`flex flex-col items-center py-1.5 rounded-lg text-[10px] border
                ${slot.available
                  ? 'bg-[var(--green)]/5 border-[var(--green)]/20 text-[var(--green)]'
                  : 'bg-[var(--bg)] border-[var(--border)] text-[var(--text3)]'
                }`}
              title={`${slot.date}: ${slot.available ? 'Available' : 'Unavailable'}`}
            >
              <span className="font-medium">{dayLabel}</span>
              <span className="font-mono">{dateLabel}</span>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[var(--text3)]">
        <span className="flex items-center gap-1">
          <CheckCircle size={10} className="text-[var(--green)]" />
          {t('professionals.profile.available')}
        </span>
        <span className="flex items-center gap-1">
          <XCircle size={10} />
          {t('professionals.profile.unavailable')}
        </span>
      </div>
    </div>
  );
}

export function ProfessionalProfile({ professional, distance, onClose, onRequestQuote }: ProfessionalProfileProps) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={professional.name}
    >
      <div
        className="relative w-full max-w-2xl mx-4 my-8 bg-[var(--bg2)] border border-[var(--border)] rounded-2xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg3)] text-[var(--text3)] hover:text-[var(--text)] transition-colors"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
          <button
            onClick={() => onRequestQuote(professional)}
            className="px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            {t('professionals.requestQuote')}
          </button>
        </div>

        {/* Profile content */}
        <div className="p-5 space-y-6">
          {/* Top section: avatar + name */}
          <div className="flex items-start gap-4">
            {professional.avatar_url ? (
              <img
                src={professional.avatar_url}
                alt={professional.name}
                className="w-16 h-16 rounded-full object-cover border border-[var(--border)]"
              />
            ) : (
              <AvatarFallback name={professional.name} />
            )}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-serif font-bold text-[var(--text)]">
                {professional.name}
              </h2>
              <p className="text-sm text-[var(--text2)]">{professional.company}</p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-1">
                <StarRating rating={professional.rating} />
                <span className="text-xs text-[var(--text2)] font-mono">{professional.rating.toFixed(1)}</span>
                <span className="text-xs text-[var(--text3)]">({professional.review_count} {t('professionals.profile.reviews')})</span>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 mt-1.5 text-xs text-[var(--text3)]">
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {professional.location}, {professional.county}
                </span>
                {distance !== null && (
                  <span className="font-mono">{distance} km {t('professionals.profile.fromYourForest')}</span>
                )}
              </div>

              {/* Category badges */}
              <div className="flex flex-wrap gap-1 mt-2">
                {professional.categories.map((cat) => (
                  <span
                    key={cat}
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${CATEGORY_COLORS[cat]}`}
                  >
                    {t(CATEGORY_I18N[cat])}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text)] mb-2">
              {t('professionals.profile.about')}
            </h3>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              {professional.description}
            </p>
          </div>

          {/* Services */}
          {professional.services.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text)] mb-2">
                {t('professionals.profile.services')}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {professional.services.map((service) => (
                  <span
                    key={service}
                    className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] text-[var(--text2)] bg-[var(--bg)] border border-[var(--border)]"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Certifications */}
          {professional.certifications.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text)] mb-2">
                {t('professionals.profile.certifications')}
              </h3>
              <div className="space-y-1.5">
                {professional.certifications.map((cert) => (
                  <div
                    key={cert}
                    className="flex items-center gap-2 text-xs text-[var(--text2)]"
                  >
                    <Award size={14} className="text-[var(--green)] flex-shrink-0" />
                    {cert}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Equipment */}
          {professional.equipment.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text)] mb-2">
                {t('professionals.profile.equipment')}
              </h3>
              <div className="space-y-1.5">
                {professional.equipment.map((eq) => (
                  <div
                    key={eq}
                    className="flex items-center gap-2 text-xs text-[var(--text2)]"
                  >
                    <Wrench size={14} className="text-[var(--text3)] flex-shrink-0" />
                    {eq}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Service area */}
          <div>
            <h3 className="text-sm font-medium text-[var(--text)] mb-2">
              {t('professionals.profile.serviceArea')}
            </h3>
            <div className="flex items-center gap-2 text-xs text-[var(--text2)]">
              <MapPin size={14} className="text-[var(--text3)]" />
              {professional.location} ({professional.county}) &mdash;{' '}
              <span className="font-mono">{professional.service_area_km} km</span> {t('professionals.profile.radius')}
            </div>
            {/* Map placeholder */}
            <div className="mt-2 h-32 rounded-lg bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-xs text-[var(--text3)]">
              <MapPin size={20} className="mr-2 opacity-40" />
              {t('professionals.profile.mapPlaceholder')}
            </div>
          </div>

          {/* Availability calendar */}
          {professional.availability.length > 0 && (
            <AvailabilityCalendar availability={professional.availability} />
          )}

          {/* Reviews */}
          {professional.reviews.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-[var(--text)] mb-3">
                {t('professionals.profile.reviewsTitle')} ({professional.reviews.length})
              </h3>
              <div className="space-y-3">
                {professional.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <AvatarFallback name={review.author_name} size="sm" />
                        <span className="text-xs font-medium text-[var(--text)]">
                          {review.author_name}
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--text3)]">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-0.5 mb-1.5 ml-10">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Star
                          key={i}
                          size={10}
                          className={i <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-[var(--text3)]'}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-[var(--text2)] ml-10">{review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contact section */}
          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[var(--border)]">
            {professional.email && (
              <a
                href={`mailto:${professional.email}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors"
              >
                <Mail size={14} />
                {professional.email}
              </a>
            )}
            {professional.phone && (
              <a
                href={`tel:${professional.phone}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors"
              >
                <Phone size={14} />
                {professional.phone}
              </a>
            )}
            {professional.website && (
              <a
                href={professional.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] text-xs text-[var(--text2)] hover:text-[var(--text)] transition-colors"
              >
                <Globe size={14} />
                {t('professionals.profile.website')}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

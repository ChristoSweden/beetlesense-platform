/**
 * ProfessionalCard — Compact card for the professional directory list view.
 */

import { useTranslation } from 'react-i18next';
import { Star, MapPin, Mail, Phone, ChevronRight, Award } from 'lucide-react';
import type { Professional, ProfessionalCategory } from '@/hooks/useProfessionals';

interface ProfessionalCardProps {
  professional: Professional;
  distance: number | null;
  onSelect: (professional: Professional) => void;
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

function AvatarFallback({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 border border-[var(--border2)] flex items-center justify-center flex-shrink-0">
      <span className="text-sm font-semibold text-[var(--green)]">{initials}</span>
    </div>
  );
}

function StarRating({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={12}
            className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-[var(--text3)]'}
          />
        ))}
      </div>
      <span className="text-[11px] text-[var(--text2)] font-mono">
        {rating.toFixed(1)}
      </span>
      <span className="text-[11px] text-[var(--text3)]">({reviewCount})</span>
    </div>
  );
}

export function ProfessionalCard({ professional, distance, onSelect, onRequestQuote }: ProfessionalCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className="p-4 rounded-xl border border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg2)] hover:bg-[var(--bg3)] transition-all group cursor-pointer"
      onClick={() => onSelect(professional)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(professional);
        }
      }}
      aria-label={`${professional.name}, ${professional.company}`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {professional.avatar_url ? (
          <img
            src={professional.avatar_url}
            alt={professional.name}
            className="w-12 h-12 rounded-full object-cover border border-[var(--border)] flex-shrink-0"
          />
        ) : (
          <AvatarFallback name={professional.name} />
        )}

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-[var(--text)] truncate">
                {professional.name}
              </h3>
              <p className="text-[11px] text-[var(--text3)] truncate">
                {professional.company}
              </p>
            </div>
            <ChevronRight
              size={16}
              className="text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors flex-shrink-0 mt-0.5"
            />
          </div>

          {/* Rating */}
          <div className="mt-1.5">
            <StarRating rating={professional.rating} reviewCount={professional.review_count} />
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

          {/* Location + distance */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <MapPin size={10} />
              {professional.location}, {professional.county}
            </span>
            {distance !== null && (
              <span className="font-mono">{distance} km</span>
            )}
          </div>

          {/* Certifications */}
          {professional.certifications.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {professional.certifications.slice(0, 2).map((cert) => (
                <span
                  key={cert}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-[var(--text2)] bg-[var(--bg)] border border-[var(--border)]"
                >
                  <Award size={9} className="text-[var(--green-dim)]" />
                  {cert}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          <p className="text-xs text-[var(--text2)] mt-2 line-clamp-2">
            {professional.description}
          </p>

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRequestQuote(professional);
              }}
              className="px-3 py-1.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              {t('professionals.requestQuote')}
            </button>
            {professional.email && (
              <a
                href={`mailto:${professional.email}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
                aria-label={t('professionals.contact')}
              >
                <Mail size={14} />
              </a>
            )}
            {professional.phone && (
              <a
                href={`tel:${professional.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
                aria-label={t('professionals.call')}
              >
                <Phone size={14} />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

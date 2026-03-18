import { useTranslation } from 'react-i18next';
import { Star, MapPin, Truck, ChevronRight } from 'lucide-react';
import type { Contractor } from '@/hooks/useContractors';

interface ContractorCardProps {
  contractor: Contractor;
  distance: number | null;
  onRequestQuote: (contractor: Contractor) => void;
  onViewProfile: (contractor: Contractor) => void;
}

const AVAILABILITY_STYLES = {
  available: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  limited: { bg: 'bg-amber-500/15', text: 'text-amber-400', dot: 'bg-amber-400' },
  unavailable: { bg: 'bg-red-500/15', text: 'text-red-400', dot: 'bg-red-400' },
};

export function ContractorCard({ contractor, distance, onRequestQuote, onViewProfile }: ContractorCardProps) {
  const { t } = useTranslation();
  const avail = AVAILABILITY_STYLES[contractor.availability];

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-all duration-200"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
          <Truck size={20} className="text-[var(--green)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">
            {contractor.company_name}
          </h3>
          <p className="text-[11px] text-[var(--text3)]">{contractor.contact_person}</p>
        </div>
        {/* Availability */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${avail.bg}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${avail.dot}`} />
          <span className={`text-[10px] font-mono ${avail.text}`}>
            {t(`contractor.availability.${contractor.availability}`)}
          </span>
        </div>
      </div>

      {/* Rating & Location */}
      <div className="flex items-center gap-3 mb-3 text-[11px]">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber-400 fill-amber-400" />
          <span className="font-medium text-[var(--text)]">{contractor.rating.toFixed(1)}</span>
          <span className="text-[var(--text3)]">({contractor.review_count})</span>
        </div>
        <div className="flex items-center gap-1 text-[var(--text3)]">
          <MapPin size={11} />
          <span>{contractor.service_counties.slice(0, 2).join(', ')}</span>
          {contractor.service_counties.length > 2 && (
            <span>+{contractor.service_counties.length - 2}</span>
          )}
        </div>
        {distance !== null && (
          <span className="text-[var(--text3)] font-mono">{distance} km</span>
        )}
      </div>

      {/* Service type badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {contractor.service_types.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20"
          >
            {t(`contractor.serviceType.${s}`)}
          </span>
        ))}
      </div>

      {/* Machines */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {contractor.machines.slice(0, 3).map((m, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-md text-[10px] text-[var(--text3)] bg-[var(--bg3)] border border-[var(--border)]"
          >
            {t(`contractor.machineType.${m.type}`)} &middot; {m.model.split(' ').pop()}
          </span>
        ))}
        {contractor.machines.length > 3 && (
          <span className="px-2 py-0.5 text-[10px] text-[var(--text3)]">
            +{contractor.machines.length - 3}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onRequestQuote(contractor)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
        >
          {t('contractor.requestQuote')}
        </button>
        <button
          onClick={() => onViewProfile(contractor)}
          className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          {t('contractor.viewProfile')}
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

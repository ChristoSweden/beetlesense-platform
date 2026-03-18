/**
 * ContractorCard — Rich profile card for the open contractor marketplace.
 *
 * Shows company info, services, rating, certifications, equipment,
 * availability calendar (month-level), price range, and distance.
 */

import {
  Star,
  MapPin,
  Shield,
  Wrench,
  Calendar,
  Building2,
  ChevronRight,
  Phone,
  Mail,
} from 'lucide-react';
import {
  SERVICE_LABELS,
  type MarketplaceContractor,
  type MonthAvailability,
  type ForestryService,
} from '@/hooks/useContractorMarketplace';

interface ContractorCardProps {
  contractor: MarketplaceContractor;
  distance: number;
  onRequestQuote: (contractor: MarketplaceContractor) => void;
  expanded?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

const AVAILABILITY_COLORS: Record<MonthAvailability, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

const _PRICE_RANGE_LABEL: Record<string, string> = {
  '€': 'Budget',
  '€€': 'Medel',
  '€€€': 'Premium',
};

function ServiceBadge({ service }: { service: ForestryService }) {
  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20">
      {SERVICE_LABELS[service]}
    </span>
  );
}

export function ContractorCard({
  contractor,
  distance,
  onRequestQuote,
  expanded = false,
}: ContractorCardProps) {
  // Get next 6 months of availability
  const now = new Date();
  const upcomingMonths: { key: string; label: string; status: MonthAvailability }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    upcomingMonths.push({
      key,
      label: MONTH_NAMES[d.getMonth()],
      status: contractor.availability_months[key] ?? 'red',
    });
  }

  return (
    <div
      className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-all duration-200"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header: Avatar + Company */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
          {contractor.photo_url ? (
            <img src={contractor.photo_url} alt="" className="w-full h-full rounded-lg object-cover" />
          ) : (
            <Building2 size={22} className="text-[var(--green)]" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-[var(--text)] truncate">
            {contractor.company_name}
          </h3>
          <p className="text-[11px] text-[var(--text3)]">
            {contractor.contact_person} &middot; Org.nr {contractor.org_number}
          </p>
        </div>
        {/* Price range */}
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[var(--bg3)] border border-[var(--border)]">
          <span className="text-[11px] font-mono font-bold text-[var(--green)]">
            {contractor.price_range}
          </span>
        </div>
      </div>

      {/* Rating, Location, Distance, Years */}
      <div className="flex items-center gap-3 mb-3 text-[11px] flex-wrap">
        <div className="flex items-center gap-1">
          <Star size={12} className="text-amber-400 fill-amber-400" />
          <span className="font-medium text-[var(--text)]">{contractor.rating.toFixed(1)}</span>
          <span className="text-[var(--text3)]">({contractor.review_count})</span>
        </div>
        <div className="flex items-center gap-1 text-[var(--text3)]">
          <MapPin size={11} />
          <span>{contractor.location}</span>
        </div>
        <span className="text-[var(--text3)] font-mono">{distance} km</span>
        <span className="text-[var(--text3)]">{contractor.years_in_business} år</span>
      </div>

      {/* Services */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {contractor.services.map((s) => (
          <ServiceBadge key={s} service={s} />
        ))}
      </div>

      {/* Certifications */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {contractor.certifications.map((cert) => (
          <span
            key={cert}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20"
          >
            <Shield size={9} />
            {cert}
          </span>
        ))}
      </div>

      {/* Equipment */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {contractor.equipment.slice(0, expanded ? undefined : 3).map((eq, i) => (
          <span
            key={i}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] text-[var(--text3)] bg-[var(--bg3)] border border-[var(--border)]"
          >
            <Wrench size={9} />
            {eq}
          </span>
        ))}
        {!expanded && contractor.equipment.length > 3 && (
          <span className="px-2 py-0.5 text-[10px] text-[var(--text3)]">
            +{contractor.equipment.length - 3}
          </span>
        )}
      </div>

      {/* Availability calendar (month-level) */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Calendar size={11} className="text-[var(--text3)]" />
          <span className="text-[10px] font-mono text-[var(--text3)] uppercase">Tillgänglighet</span>
        </div>
        <div className="flex gap-1">
          {upcomingMonths.map((m) => (
            <div key={m.key} className="flex-1 text-center">
              <div
                className={`h-2 rounded-full ${AVAILABILITY_COLORS[m.status]} mb-0.5`}
                title={`${m.label}: ${m.status === 'green' ? 'Ledig' : m.status === 'yellow' ? 'Begränsad' : 'Fullbokad'}`}
              />
              <span className="text-[9px] text-[var(--text3)]">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[9px] text-[var(--text3)]">Ledig</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[9px] text-[var(--text3)]">Begränsad</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-[9px] text-[var(--text3)]">Fullbokad</span>
          </div>
        </div>
      </div>

      {/* Expanded: description + contact */}
      {expanded && (
        <>
          <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
            {contractor.description}
          </p>
          <div className="flex items-center gap-4 mb-3 text-[11px] text-[var(--text3)]">
            <div className="flex items-center gap-1">
              <Phone size={11} />
              <span>{contractor.phone}</span>
            </div>
            <div className="flex items-center gap-1">
              <Mail size={11} />
              <span>{contractor.email}</span>
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onRequestQuote(contractor)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[var(--green)] text-forest-950 text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
        >
          Begär offert
        </button>
        {!expanded && (
          <button
            onClick={() => onRequestQuote(contractor)}
            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-lg border border-[var(--border)] text-xs font-medium text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            Profil
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

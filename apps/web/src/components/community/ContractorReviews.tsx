import { useState } from 'react';
import {
  Star,
  MapPin,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  ArrowUpDown,
} from 'lucide-react';
import {
  type Contractor,
  type ContractorSort,
  type ContractorService,
  SERVICE_LABELS,
} from '@/hooks/useCommunity';

// ─── Helpers ───

function StarRating({ rating, size = 12 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(rating) ? 'text-amber-400 fill-amber-400' : 'text-[var(--text3)]/30'}
        />
      ))}
    </div>
  );
}

const SERVICE_COLORS: Record<ContractorService, string> = {
  avverkning: '#ef4444',
  markberedning: '#f59e0b',
  plantering: '#4ade80',
  gallring: '#60a5fa',
  rojning: '#a78bfa',
};

// ─── Props ───

interface ContractorReviewsProps {
  contractors: Contractor[];
  isLoading: boolean;
  sort: ContractorSort;
  onSortChange: (s: ContractorSort) => void;
}

const SORT_OPTIONS: { value: ContractorSort; label: string }[] = [
  { value: 'rating', label: 'Betyg' },
  { value: 'recent', label: 'Antal' },
  { value: 'price', label: 'Pris' },
  { value: 'distance', label: 'Närhet' },
];

export function ContractorReviews({ contractors, isLoading, sort, onSortChange }: ContractorReviewsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [serviceFilter, setServiceFilter] = useState<ContractorService | null>(null);

  const filtered = serviceFilter
    ? contractors.filter((c) => c.services.includes(serviceFilter))
    : contractors;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        {/* Service filter */}
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setServiceFilter(null)}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
              serviceFilter === null
                ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
            }`}
          >
            Alla tjänster
          </button>
          {(Object.keys(SERVICE_LABELS) as ContractorService[]).map((svc) => (
            <button
              key={svc}
              onClick={() => setServiceFilter(serviceFilter === svc ? null : svc)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-colors ${
                serviceFilter === svc
                  ? 'border-[var(--green)]/30 text-[var(--green)] bg-[var(--green)]/10'
                  : 'border-[var(--border)] text-[var(--text3)] hover:border-[var(--border2)]'
              }`}
            >
              {SERVICE_LABELS[svc]}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 sm:ml-auto">
          <ArrowUpDown size={11} className="text-[var(--text3)]" />
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`px-2 py-1 rounded-md text-[10px] font-medium transition-colors ${
                sort === opt.value
                  ? 'bg-[var(--green)]/15 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-[var(--border)] p-4 animate-pulse"
              style={{ background: 'var(--bg2)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-[var(--bg3)]" />
                <div>
                  <div className="h-3 w-40 bg-[var(--bg3)] rounded mb-1" />
                  <div className="h-2 w-24 bg-[var(--bg3)] rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="text-center py-12">
          <p className="text-sm text-[var(--text3)]">Inga entreprenörer matchade dina filter</p>
        </div>
      )}

      {/* Contractor cards */}
      {!isLoading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((contractor) => {
            const isExpanded = expandedId === contractor.id;

            return (
              <article
                key={contractor.id}
                className="rounded-xl border border-[var(--border)] overflow-hidden transition-colors hover:border-[var(--border2)]"
                style={{ background: 'var(--bg2)' }}
              >
                {/* Card header */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border border-[var(--border)]"
                        style={{ background: 'var(--bg3)' }}
                      >
                        <span className="text-sm font-bold text-[var(--green)]">
                          {contractor.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[var(--text)]">{contractor.name}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <StarRating rating={contractor.avg_rating} />
                          <span className="text-[10px] text-[var(--text3)]">
                            {contractor.avg_rating.toFixed(1)} ({contractor.review_count} recensioner)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {contractor.services.map((svc) => (
                      <span
                        key={svc}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          background: `${SERVICE_COLORS[svc]}15`,
                          color: SERVICE_COLORS[svc],
                        }}
                      >
                        {SERVICE_LABELS[svc]}
                      </span>
                    ))}
                  </div>

                  {/* Price + location */}
                  <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
                    <span className="font-mono">{contractor.price_range}</span>
                    <div className="flex items-center gap-1">
                      <MapPin size={10} />
                      {contractor.municipality}
                    </div>
                  </div>

                  {/* Expand reviews button */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : contractor.id)}
                    className="flex items-center gap-1 mt-3 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green)]/80 transition-colors"
                  >
                    {isExpanded ? (
                      <>
                        Dölj recensioner <ChevronUp size={12} />
                      </>
                    ) : (
                      <>
                        Visa {contractor.reviews.length} recensioner <ChevronDown size={12} />
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded reviews */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] divide-y divide-[var(--border)]">
                    {contractor.reviews.map((review) => (
                      <div key={review.id} className="p-4">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <StarRating rating={review.rating} size={10} />
                            <span
                              className="text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{
                                background: `${SERVICE_COLORS[review.service]}15`,
                                color: SERVICE_COLORS[review.service],
                              }}
                            >
                              {SERVICE_LABELS[review.service]}
                            </span>
                            {review.verified_job && (
                              <span className="flex items-center gap-0.5 text-[9px] font-medium text-[var(--green)]">
                                <BadgeCheck size={10} />
                                Verifierat jobb
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[var(--text3)]">
                            {new Date(review.date).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text2)] leading-relaxed mb-1">
                          {review.text}
                        </p>
                        <p className="text-[10px] text-[var(--text3)]">{review.author_label}</p>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <p className="mt-4 text-center text-[10px] text-[var(--text3)]">
          {filtered.length} entreprenörer i Smålandsregionen
        </p>
      )}
    </div>
  );
}

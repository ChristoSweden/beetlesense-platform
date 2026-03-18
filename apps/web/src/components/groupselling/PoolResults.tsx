/**
 * PoolResults — Historical results card showing achieved premiums and transparency.
 */

import { TrendingUp, Award, Star, Building2, Percent, User } from 'lucide-react';
import type { PoolResult } from '@/hooks/useGroupSelling';

interface PoolResultsProps {
  results: PoolResult[];
}

function formatSEK(n: number): string {
  return n.toLocaleString('sv-SE') + ' SEK';
}

function ResultCard({ result }: { result: PoolResult }) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">{result.poolName}</h3>
          <p className="text-xs text-[var(--text3)] mt-0.5">{result.assortmentLabel} — {result.region}</p>
        </div>
        {result.rating && (
          <div className="flex items-center gap-0.5">
            {Array.from({ length: result.rating }).map((_, i) => (
              <Star key={i} size={12} className="text-[var(--yellow)] fill-[var(--yellow)]" />
            ))}
          </div>
        )}
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-2.5 rounded-lg bg-[var(--green)]/8 border border-[var(--green)]/15 text-center">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">Uppnått pris</p>
          <p className="text-base font-mono font-bold text-[var(--green)]">{result.achievedPriceM3}</p>
          <p className="text-[10px] text-[var(--text3)]">SEK/m³</p>
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">Individuellt snitt</p>
          <p className="text-base font-mono font-medium text-[var(--text2)]">{result.individualAvgPriceM3}</p>
          <p className="text-[10px] text-[var(--text3)]">SEK/m³</p>
        </div>
        <div className="p-2.5 rounded-lg bg-[var(--green)]/8 border border-[var(--green)]/15 text-center">
          <p className="text-[10px] text-[var(--text3)] mb-0.5">Premium</p>
          <p className="text-base font-mono font-bold text-[var(--green)]">+{result.premiumPercent}%</p>
          <p className="text-[10px] text-[var(--green)]">{formatSEK(result.totalPremiumSEK)} mer</p>
        </div>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg)]">
          <Building2 size={12} className="text-[var(--text3)]" />
          <div>
            <p className="text-[10px] text-[var(--text3)]">Vinnande köpare</p>
            <p className="text-xs font-medium text-[var(--text)]">{result.winnerBuyer}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg)]">
          <User size={12} className="text-[var(--text3)]" />
          <div>
            <p className="text-[10px] text-[var(--text3)]">Deltagare</p>
            <p className="text-xs font-medium text-[var(--text)]">{result.memberCount} skogsägare</p>
          </div>
        </div>
      </div>

      {/* My breakdown (if available) */}
      {result.myVolumeM3 && (
        <div className="p-3 rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 mb-4">
          <p className="text-[10px] font-medium text-[var(--green)] mb-2">Din andel</p>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[10px] text-[var(--text3)]">Volym</p>
              <p className="text-xs font-mono font-medium text-[var(--text)]">{result.myVolumeM3} m³</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)]">Intäkter</p>
              <p className="text-xs font-mono font-medium text-[var(--text)]">{formatSEK(result.myEarningsSEK!)}</p>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text3)]">Din bonus</p>
              <p className="text-xs font-mono font-medium text-[var(--green)]">+{formatSEK(result.myPremiumSEK!)}</p>
            </div>
          </div>
        </div>
      )}

      {/* BeetleSense fee — transparency */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg)] border border-[var(--border)] mb-3">
        <div className="flex items-center gap-1.5">
          <Percent size={11} className="text-[var(--text3)]" />
          <span className="text-[10px] text-[var(--text3)]">BeetleSense avgift: {result.beetlesenseFeePercent}%</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--text3)]">{formatSEK(result.beetlesenseFeeSEK)}</span>
      </div>

      {/* Testimonial */}
      {result.testimonial && (
        <div className="p-3 rounded-lg border-l-2 border-[var(--green)]/30 bg-[var(--bg)]">
          <p className="text-xs text-[var(--text2)] italic leading-relaxed">"{result.testimonial}"</p>
        </div>
      )}

      {/* Completion date */}
      <p className="text-[10px] text-[var(--text3)] mt-3">
        Avslutad {new Date(result.completedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
}

export function PoolResultsList({ results }: PoolResultsProps) {
  if (results.length === 0) {
    return (
      <div className="text-center py-12">
        <Award size={32} className="mx-auto mb-3 text-[var(--text3)]" />
        <p className="text-sm text-[var(--text3)]">Inga avslutade pooler ännu</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--green)]/20 bg-[var(--green)]/5">
        <TrendingUp size={20} className="text-[var(--green)]" />
        <div>
          <p className="text-sm font-semibold text-[var(--green)]">
            Totalt +{formatSEK(results.reduce((s, r) => s + r.totalPremiumSEK, 0))} mer än individuell försäljning
          </p>
          <p className="text-xs text-[var(--text3)]">
            Genomsnittlig premium: +{(results.reduce((s, r) => s + r.premiumPercent, 0) / results.length).toFixed(1)}% över {results.length} genomförda pooler
          </p>
        </div>
      </div>

      {results.map((r) => (
        <ResultCard key={r.id} result={r} />
      ))}
    </div>
  );
}

/**
 * HuntingManager — Hunting lease management component.
 *
 * Shows current leases, market rate comparisons, hunting seasons,
 * lease renewal alerts, and revenue optimization advice.
 */

import { useState } from 'react';
import {
  Target,
  Calendar,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  Users,
  MapPin,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import type { HuntingLease, HuntingSeason, HuntingSpecies } from '@/hooks/useNonTimberIncome';

interface HuntingManagerProps {
  leases: HuntingLease[];
  seasons: HuntingSeason[];
  speciesRates: HuntingSpecies[];
  expiringLeases: HuntingLease[];
  underMarketLeases: HuntingLease[];
  totalIncome: number;
}

function formatSEK(v: number): string {
  return v.toLocaleString('sv-SE');
}

function statusBadge(status: HuntingLease['status']) {
  const map: Record<string, { label: string; cls: string }> = {
    active: { label: 'Aktivt', cls: 'bg-[var(--green)]/10 text-[var(--green)]' },
    expiring_soon: { label: 'Löper ut snart', cls: 'bg-amber-500/10 text-amber-400' },
    expired: { label: 'Utgånget', cls: 'bg-red-500/10 text-red-400' },
    available: { label: 'Tillgängligt', cls: 'bg-blue-500/10 text-blue-400' },
  };
  const s = map[status] ?? map.active;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>
  );
}

function LeaseCard({ lease }: { lease: HuntingLease }) {
  const [expanded, setExpanded] = useState(false);
  const underMarket = lease.feePerHa < lease.marketRateMin * lease.species.length;
  const potentialIncrease = underMarket
    ? Math.round(lease.areaHa * lease.marketRateMin * lease.species.length - lease.annualFeeSEK)
    : 0;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-[var(--green)] flex-shrink-0" />
            <span className="text-sm font-semibold text-[var(--text)] truncate">{lease.jaktlag}</span>
            {statusBadge(lease.status)}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {lease.parcelName}
            </span>
            <span>{lease.areaHa} ha</span>
            <span className="font-mono text-[var(--green)]">{formatSEK(lease.annualFeeSEK)} SEK/år</span>
          </div>
        </div>
        {expanded ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
          {/* Species */}
          <div>
            <p className="text-[10px] text-[var(--text3)] mb-1.5 uppercase tracking-wider">Viltarter i arrendet</p>
            <div className="flex flex-wrap gap-1.5">
              {lease.species.map(s => (
                <span key={s.nameSv} className="text-[10px] bg-[var(--bg3)] text-[var(--text2)] px-2 py-0.5 rounded-full">
                  {s.nameSv} ({s.season})
                </span>
              ))}
            </div>
          </div>

          {/* Market comparison */}
          <div className="rounded-lg p-3 border border-[var(--border)]" style={{ background: 'var(--bg)' }}>
            <p className="text-[10px] text-[var(--text3)] mb-2 uppercase tracking-wider">Marknadsanalys</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-[var(--text3)]">Ditt arrende</p>
                <p className="text-sm font-mono font-semibold text-[var(--text)]">{Math.round(lease.feePerHa)} SEK/ha</p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text3)]">Marknadspris</p>
                <p className="text-sm font-mono font-semibold text-[var(--text)]">
                  {lease.marketRateMin}-{lease.marketRateMax} SEK/ha
                </p>
              </div>
            </div>

            {underMarket && (
              <div className="mt-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-start gap-2">
                  <TrendingUp size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-amber-400">Höj ditt arrende</p>
                    <p className="text-[10px] text-amber-400/80 mt-0.5">
                      Möjlig höjning: +{formatSEK(potentialIncrease)} SEK/år vid marknadspris
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contract info */}
          <div className="flex items-center gap-4 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <Clock size={10} /> Avtal löper ut: {new Date(lease.contractExpires).toLocaleDateString('sv-SE')}
            </span>
            <span>Jaktsäsong: {new Date(lease.seasonStart).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })} - {new Date(lease.seasonEnd).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}</span>
          </div>

          {lease.notes && (
            <p className="text-[10px] text-[var(--text3)] italic">{lease.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}

export function HuntingManager({
  leases,
  seasons,
  speciesRates,
  expiringLeases,
  underMarketLeases,
  totalIncome,
}: HuntingManagerProps) {
  const [showSeasons, setShowSeasons] = useState(false);
  const [showRates, setShowRates] = useState(false);

  return (
    <div className="space-y-4">
      {/* Revenue header */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <Target size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Jaktarrende</p>
              <p className="text-[10px] text-[var(--text3)]">{leases.length} aktiva arrenden</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-[var(--green)]">{formatSEK(totalIncome)} <span className="text-xs text-[var(--text3)]">SEK/år</span></p>
          </div>
        </div>

        {/* Alerts */}
        {expiringLeases.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-400">Avtal löper ut snart</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">
                  {expiringLeases.map(l => l.jaktlag).join(', ')} — förhandla om nytt avtal innan utgång.
                </p>
              </div>
            </div>
          </div>
        )}

        {underMarketLeases.length > 0 && (
          <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <ArrowUpRight size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-blue-400">Under marknadspris</p>
                <p className="text-[10px] text-blue-400/80 mt-0.5">
                  {underMarketLeases.length} arrende{underMarketLeases.length > 1 ? 'n' : ''} under marknadsnivå. Överväg att omförhandla vid nästa tillfälle.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Leases */}
      <div className="space-y-2">
        {leases.map(lease => (
          <LeaseCard key={lease.id} lease={lease} />
        ))}
      </div>

      {/* Hunting seasons */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <button
          onClick={() => setShowSeasons(!showSeasons)}
          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">Jaktsäsonger 2025/2026</span>
          </div>
          {showSeasons ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
        </button>
        {showSeasons && (
          <div className="px-4 pb-4">
            <div className="rounded-lg border border-[var(--border)] overflow-hidden">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="bg-[var(--bg3)]">
                    <th className="text-left px-3 py-2 text-[var(--text3)] font-medium">Art</th>
                    <th className="text-left px-3 py-2 text-[var(--text3)] font-medium">Start</th>
                    <th className="text-left px-3 py-2 text-[var(--text3)] font-medium">Slut</th>
                    <th className="text-left px-3 py-2 text-[var(--text3)] font-medium">Notering</th>
                  </tr>
                </thead>
                <tbody>
                  {seasons.map(s => {
                    const now = new Date();
                    const start = new Date(s.start);
                    const end = new Date(s.end);
                    const isActive = now >= start && now <= end;
                    return (
                      <tr key={s.speciesSv} className="border-t border-[var(--border)]">
                        <td className="px-3 py-2 text-[var(--text)]">
                          <div className="flex items-center gap-1.5">
                            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />}
                            {s.speciesSv}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-[var(--text2)] font-mono">{new Date(s.start).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-3 py-2 text-[var(--text2)] font-mono">{new Date(s.end).toLocaleDateString('sv-SE', { month: 'short', day: 'numeric' })}</td>
                        <td className="px-3 py-2 text-[var(--text3)]">{s.notes ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Market rates reference */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <button
          onClick={() => setShowRates(!showRates)}
          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <TrendingUp size={14} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">Marknadsarrendenivåer</span>
          </div>
          {showRates ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
        </button>
        {showRates && (
          <div className="px-4 pb-4 space-y-2">
            {speciesRates.map(s => (
              <div key={s.nameSv} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">{s.nameSv}</p>
                  <p className="text-[10px] text-[var(--text3)]">{s.name} &middot; Säsong: {s.season}</p>
                </div>
                <p className="text-xs font-mono text-[var(--text)]">{s.rateMin}-{s.rateMax} <span className="text-[var(--text3)]">SEK/ha/år</span></p>
              </div>
            ))}
            <div className="p-2.5 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
              <p className="text-[10px] text-[var(--green)]">
                Total jaktarrendepotential: 50-150 SEK/ha/år beroende på region, viltdensitet och arrendevillkor.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Viltförvaltningsplan note */}
      <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--bg2)]">
        <p className="text-[10px] text-[var(--text3)]">
          <span className="font-semibold text-[var(--text2)]">Viltförvaltningsplan:</span> Dina skiften ingår i Värnamo Älgförvaltningsområde (ÄFO).
          Tilldelning 2025/2026: 3 vuxna + 2 kalvar. Kontakta länsstyrelsen för aktuell förvaltningsplan.
        </p>
      </div>
    </div>
  );
}

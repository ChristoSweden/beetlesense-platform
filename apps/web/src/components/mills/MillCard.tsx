/**
 * MillCard — Individual mill detail card showing capacity, demand, prices, and transport cost.
 */

import { Factory, MapPin, TrendingUp, TrendingDown, Minus, Phone, Mail, Truck, ArrowRight } from 'lucide-react';
import type { MillWithDistance, DemandLevel, DemandTrend, MillType } from '@/hooks/useMillDemand';

const DEMAND_COLORS: Record<DemandLevel, string> = {
  high: 'var(--green)',
  normal: 'var(--yellow)',
  low: 'var(--red)',
};

const DEMAND_LABELS: Record<DemandLevel, string> = {
  high: 'Hög efterfrågan',
  normal: 'Normal',
  low: 'Låg efterfrågan',
};

const TREND_ICONS: Record<DemandTrend, React.ReactNode> = {
  increasing: <TrendingUp size={14} />,
  stable: <Minus size={14} />,
  decreasing: <TrendingDown size={14} />,
};

const TREND_LABELS: Record<DemandTrend, string> = {
  increasing: 'Stigande',
  stable: 'Stabil',
  decreasing: 'Sjunkande',
};

const TYPE_LABELS: Record<MillType, string> = {
  sawmill: 'Sågverk',
  pulp: 'Massabruk',
  board: 'Kartongbruk',
  energy: 'Energi',
  furniture: 'Möbel',
};

interface MillCardProps {
  mill: MillWithDistance;
  onSelectForNegotiation?: (millId: string, assortment: string) => void;
}

export function MillCard({ mill, onSelectForNegotiation }: MillCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: `${DEMAND_COLORS[mill.demandLevel]}15`, color: DEMAND_COLORS[mill.demandLevel] }}
            >
              <Factory size={20} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text)]">{mill.name}</h3>
              <p className="text-xs text-[var(--text3)]">{mill.company}</p>
            </div>
          </div>
          <span
            className="text-[10px] font-mono px-2 py-0.5 rounded-full"
            style={{
              background: `${DEMAND_COLORS[mill.demandLevel]}15`,
              color: DEMAND_COLORS[mill.demandLevel],
            }}
          >
            {DEMAND_LABELS[mill.demandLevel]}
          </span>
        </div>

        <div className="flex items-center gap-2 mt-2 text-[10px] text-[var(--text3)]">
          <MapPin size={10} />
          <span>{mill.municipality}, {mill.region}</span>
          <span className="mx-1">|</span>
          {mill.type.map((t) => TYPE_LABELS[t]).join(' + ')}
        </div>
      </div>

      {/* Capacity & Utilization */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Kapacitet</span>
          <span className="text-xs font-mono text-[var(--text)]">
            {mill.annualCapacity.toLocaleString('sv-SE')} {mill.capacityUnit}/år
          </span>
        </div>

        {/* Utilization gauge */}
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
            style={{
              width: `${mill.utilization}%`,
              background:
                mill.utilization >= 85
                  ? 'var(--green)'
                  : mill.utilization >= 65
                    ? 'var(--yellow)'
                    : 'var(--red)',
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[var(--text3)]">Beläggning</span>
          <span className="text-xs font-mono text-[var(--text)]">{mill.utilization}%</span>
        </div>

        {/* Demand trend */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-[var(--text3)]">Trend:</span>
          <span
            className="flex items-center gap-1 text-[10px] font-medium"
            style={{ color: DEMAND_COLORS[mill.demandLevel] }}
          >
            {TREND_ICONS[mill.demandTrend]}
            {TREND_LABELS[mill.demandTrend]}
          </span>
        </div>
      </div>

      {/* Assortments & Prices */}
      <div className="p-4 border-b border-[var(--border)]">
        <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-2 block">
          Sortiment & Priser
        </span>
        <div className="space-y-2">
          {mill.assortments.map((a) => (
            <div
              key={a.name}
              className="flex items-center justify-between p-2 rounded-lg"
              style={{ background: 'var(--bg3)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: DEMAND_COLORS[a.demandLevel] }}
                />
                <span className="text-xs text-[var(--text)]">{a.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-[var(--text)]">
                  {a.currentPrice} SEK/{a.unit}
                </span>
                {onSelectForNegotiation && (
                  <button
                    onClick={() => onSelectForNegotiation(mill.id, a.name)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--green)]/10 text-[var(--green)] hover:bg-[var(--green)]/20 transition-colors"
                  >
                    Förhandla
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transport */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-[var(--text3)]" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text)]">
                {mill.distanceKm} km från {mill.nearestParcel}
              </span>
              <span className="text-xs font-mono text-[var(--yellow)]">
                ~{mill.transportCostSEK} SEK/m³
              </span>
            </div>
            <p className="text-[10px] text-[var(--text3)] mt-0.5">Beräknad transportkostnad</p>
          </div>
        </div>
      </div>

      {/* Contact & Actions */}
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <a
            href={`mailto:${mill.contactEmail}`}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
          >
            <Mail size={10} />
            {mill.contactEmail}
          </a>
          <a
            href={`tel:${mill.contactPhone}`}
            className="flex items-center gap-1.5 text-[10px] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
          >
            <Phone size={10} />
            {mill.contactPhone}
          </a>
        </div>
        <button
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-colors"
          style={{ background: 'var(--green)', color: '#030d05' }}
        >
          <span>Begär offert</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}

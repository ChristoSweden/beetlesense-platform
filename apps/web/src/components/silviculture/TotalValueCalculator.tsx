/**
 * TotalValueCalculator — Beyond timber value breakdown.
 *
 * Shows all income sources per strategy: timber, carbon credits,
 * biodiversity premiums, hunting, recreation, water quality,
 * storm protection. Key insight: the whole is worth 40% more than timber alone.
 */

import {
  TreePine,
  Cloud,
  Leaf,
  Target,
  Mountain,
  Droplets,
  Shield,
  Sparkles,
} from 'lucide-react';
import type { StrategyId, Strategy, TotalValueBreakdown } from '@/hooks/useSilviculture';

interface Props {
  strategies: Strategy[];
  totalValues: Record<StrategyId, TotalValueBreakdown>;
  selectedStrategy: StrategyId;
}

const VALUE_CATEGORIES = [
  { key: 'timberRevenue' as const, label: 'Timber Revenue', labelSv: 'Virkesintakts', icon: TreePine, color: '#a3a3a3' },
  { key: 'carbonCredits' as const, label: 'Carbon Credits', labelSv: 'Kolkrediter', icon: Cloud, color: '#4ade80' },
  { key: 'biodiversityPremium' as const, label: 'Biodiversity Premium', labelSv: 'Biodiversitetsstod', icon: Leaf, color: '#a78bfa' },
  { key: 'huntingLease' as const, label: 'Hunting Lease', labelSv: 'Jaktarrende', icon: Target, color: '#f97316' },
  { key: 'recreationEcotourism' as const, label: 'Recreation / Ecotourism', labelSv: 'Rekreation / Ekoturism', icon: Mountain, color: '#38bdf8' },
  { key: 'waterQuality' as const, label: 'Water Quality Services', labelSv: 'Vattentjanster', icon: Droplets, color: '#06b6d4' },
  { key: 'stormProtection' as const, label: 'Storm Protection', labelSv: 'Stormskydd', icon: Shield, color: '#fbbf24' },
];

function formatSEK(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(Math.round(value));
}

export function TotalValueCalculator({ strategies, totalValues, selectedStrategy }: Props) {
  const selected = totalValues[selectedStrategy];
  const strat = strategies.find(s => s.id === selectedStrategy)!;

  // Find the strategy with highest beyond-timber percentage
  const bestBeyondTimber = Object.values(totalValues)
    .reduce((a, b) => a.beyondTimberPct > b.beyondTimberPct ? a : b);

  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={16} className="text-[var(--green)]" />
        <h2 className="text-sm font-semibold text-[var(--text)]">Total Value Calculator</h2>
      </div>
      <p className="text-[10px] text-[var(--text3)] mb-4">
        {strat.nameSv} &middot; All income sources per hectare per year (SEK/ha/ar)
      </p>

      {/* Strategy tabs */}
      <div className="flex gap-1 mb-4 p-0.5 rounded-lg bg-[var(--bg3)] overflow-x-auto">
        {strategies.map(s => {
          const tv = totalValues[s.id];
          return (
            <div
              key={s.id}
              className={`flex-1 min-w-0 text-center py-1.5 rounded-md text-[10px] transition-colors cursor-default ${
                selectedStrategy === s.id
                  ? 'bg-[var(--surface)] text-[var(--text)] font-medium shadow-sm'
                  : 'text-[var(--text3)]'
              }`}
            >
              <span className="block truncate">{s.shortName}</span>
              <span className="block font-mono text-[9px]">{formatSEK(tv.totalPerHaYear)}</span>
            </div>
          );
        })}
      </div>

      {/* Value bars */}
      <div className="space-y-2.5">
        {VALUE_CATEGORIES.map(cat => {
          const value = selected[cat.key];
          const maxValue = Math.max(
            ...Object.values(totalValues).map(tv => tv[cat.key]),
            1,
          );
          const pct = (value / selected.totalPerHaYear) * 100;
          const barPct = (value / maxValue) * 100;
          const Icon = cat.icon;

          return (
            <div key={cat.key}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon size={11} style={{ color: cat.color }} />
                  <span className="text-[10px] text-[var(--text2)]">{cat.labelSv}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-[var(--text)]">
                    {formatSEK(value)} SEK
                  </span>
                  <span className="text-[9px] text-[var(--text3)] w-8 text-right">
                    {pct > 0 ? `${pct.toFixed(0)}%` : '-'}
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--bg3)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${barPct}%`,
                    background: cat.color,
                    opacity: 0.7,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div className="mt-4 pt-3 border-t border-[var(--border)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--text)]">Total value per ha/year</span>
          <span className="text-lg font-mono font-bold text-[var(--green)]">
            {formatSEK(selected.totalPerHaYear)} SEK
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-[var(--text3)]">Value beyond timber</span>
          <span className="text-xs font-mono font-semibold text-[var(--green)]">
            {selected.beyondTimberPct}%
          </span>
        </div>
      </div>

      {/* Key insight */}
      <div className="mt-4 p-3 rounded-lg bg-[var(--green)]/10 border border-[var(--green)]/20">
        <p className="text-xs text-[var(--text)]">
          <span className="font-semibold text-[var(--green)]">
            Helheten ar vard {bestBeyondTimber.beyondTimberPct}% mer an bara virket
          </span>
        </p>
        <p className="text-[10px] text-[var(--text2)] mt-1">
          When you count carbon credits, biodiversity subsidies, hunting leases, and ecosystem
          services, the total value of your forest is significantly higher than what timber buyers
          show you. Stora Enso and Sodra only talk about timber volume — BeetleSense shows you everything.
        </p>
      </div>

      {/* All strategies comparison table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-[var(--text3)] border-b border-[var(--border)]">
              <th className="text-left py-1.5 pr-2 font-medium">Strategy</th>
              <th className="text-right py-1.5 px-1 font-medium">Timber</th>
              <th className="text-right py-1.5 px-1 font-medium">Carbon</th>
              <th className="text-right py-1.5 px-1 font-medium">Other</th>
              <th className="text-right py-1.5 pl-1 font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map(s => {
              const tv = totalValues[s.id];
              const other = tv.biodiversityPremium + tv.huntingLease + tv.recreationEcotourism + tv.waterQuality + tv.stormProtection;
              const isSelected = s.id === selectedStrategy;
              return (
                <tr
                  key={s.id}
                  className={`border-b border-[var(--border)]/50 ${isSelected ? 'bg-[var(--green)]/5' : ''}`}
                >
                  <td className="py-1.5 pr-2 text-[var(--text)]">
                    <span className="mr-1">{s.icon}</span>{s.shortName}
                  </td>
                  <td className="py-1.5 px-1 text-right font-mono text-[var(--text2)]">{formatSEK(tv.timberRevenue)}</td>
                  <td className="py-1.5 px-1 text-right font-mono text-[var(--green)]">{formatSEK(tv.carbonCredits)}</td>
                  <td className="py-1.5 px-1 text-right font-mono text-purple-400">{formatSEK(other)}</td>
                  <td className="py-1.5 pl-1 text-right font-mono font-semibold text-[var(--text)]">{formatSEK(tv.totalPerHaYear)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

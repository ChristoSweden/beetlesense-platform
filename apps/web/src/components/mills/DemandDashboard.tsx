/**
 * DemandDashboard — Industry intelligence: heat map, hot markets, trends, and regional balance.
 */

import { Flame, TrendingUp, TrendingDown, Minus, Globe, BarChart3, ArrowUpRight } from 'lucide-react';
import type { MillWithDistance, HotMarket, IndustryTrend, RegionBalance, DemandLevel } from '@/hooks/useMillDemand';

const DEMAND_BG: Record<DemandLevel, string> = {
  high: 'rgba(74,222,128,0.25)',
  normal: 'rgba(251,191,36,0.2)',
  low: 'rgba(239,68,68,0.15)',
};

const DEMAND_TEXT: Record<DemandLevel, string> = {
  high: '#4ade80',
  normal: '#fbbf24',
  low: '#ef4444',
};

// All unique assortment names across mills
function getAssortmentNames(mills: MillWithDistance[]): string[] {
  const names = new Set<string>();
  for (const m of mills) for (const a of m.assortments) names.add(a.name);
  return Array.from(names).sort();
}

interface DemandDashboardProps {
  mills: MillWithDistance[];
  hotMarkets: HotMarket[];
  trends: IndustryTrend[];
  regionBalances: RegionBalance[];
  onSelectMill?: (millId: string) => void;
}

export function DemandDashboard({ mills, hotMarkets, trends, regionBalances, onSelectMill }: DemandDashboardProps) {
  const assortments = getAssortmentNames(mills);

  return (
    <div className="space-y-5">
      {/* Hot Markets */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Flame size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Hetaste marknaden just nu</h3>
        </div>
        <div className="grid gap-2">
          {hotMarkets.slice(0, 4).map((h, i) => (
            <button
              key={`${h.millId}-${h.assortment}`}
              onClick={() => onSelectMill?.(h.millId)}
              className="flex items-center gap-3 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--green)]/30 transition-colors text-left w-full"
              style={{ background: 'var(--bg3)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-sm font-bold flex-shrink-0"
                style={{ background: 'var(--green)', color: '#030d05' }}
              >
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--text)] truncate">{h.millName}</p>
                <p className="text-[10px] text-[var(--text3)]">{h.assortment}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-mono font-semibold text-[var(--green)]">
                  {h.price} SEK
                </p>
                <p className="text-[10px] text-[var(--text3)]">/{h.unit}</p>
              </div>
              <ArrowUpRight size={14} className="text-[var(--text3)] flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Heat Map Grid */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Efterfrågan per bruk & sortiment</h3>
        </div>
        <div className="overflow-x-auto -mx-4 px-4">
          <table className="w-full text-[10px]">
            <thead>
              <tr>
                <th className="text-left py-2 pr-3 text-[var(--text3)] font-normal sticky left-0" style={{ background: 'var(--bg2)' }}>
                  Bruk
                </th>
                {assortments.map((a) => (
                  <th key={a} className="text-center py-2 px-2 text-[var(--text3)] font-normal whitespace-nowrap">
                    {a}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {mills.slice(0, 10).map((mill) => (
                <tr
                  key={mill.id}
                  className="border-t border-[var(--border)] hover:bg-[var(--bg3)]/50 cursor-pointer"
                  onClick={() => onSelectMill?.(mill.id)}
                >
                  <td className="py-2 pr-3 text-[var(--text)] font-medium whitespace-nowrap sticky left-0" style={{ background: 'var(--bg2)' }}>
                    {mill.company} {mill.name.length > 15 ? mill.name.slice(0, 15) + '...' : mill.name}
                  </td>
                  {assortments.map((aName) => {
                    const found = mill.assortments.find((a) => a.name === aName);
                    if (!found) {
                      return (
                        <td key={aName} className="text-center py-2 px-2">
                          <span className="text-[var(--text3)]">—</span>
                        </td>
                      );
                    }
                    return (
                      <td key={aName} className="text-center py-2 px-2">
                        <span
                          className="inline-block px-2 py-0.5 rounded font-mono"
                          style={{
                            background: DEMAND_BG[found.demandLevel],
                            color: DEMAND_TEXT[found.demandLevel],
                          }}
                        >
                          {found.currentPrice}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[var(--border)]">
          <span className="text-[10px] text-[var(--text3)]">Priserna i SEK. Färg = efterfrågan:</span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: '#4ade80' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(74,222,128,0.25)' }} /> Hög
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: '#fbbf24' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(251,191,36,0.2)' }} /> Normal
          </span>
          <span className="flex items-center gap-1 text-[10px]" style={{ color: '#ef4444' }}>
            <span className="w-2 h-2 rounded-sm" style={{ background: 'rgba(239,68,68,0.15)' }} /> Låg
          </span>
        </div>
      </div>

      {/* Industry Trends */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-[var(--green)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">Branschtrender & signaler</h3>
        </div>
        <div className="space-y-2">
          {trends.map((t) => (
            <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: 'var(--bg3)' }}>
              <div className="flex-shrink-0 mt-0.5">
                {t.impact === 'positive' ? (
                  <TrendingUp size={14} className="text-[var(--green)]" />
                ) : t.impact === 'negative' ? (
                  <TrendingDown size={14} className="text-[var(--red)]" />
                ) : (
                  <Minus size={14} className="text-[var(--text3)]" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--text)]">{t.text}</p>
                <p className="text-[10px] text-[var(--text3)] mt-0.5">{t.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Regional Balance */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <h3 className="text-sm font-semibold text-[var(--text)] mb-3">Utbud/efterfrågan per region</h3>
        <div className="space-y-3">
          {regionBalances.map((rb) => (
            <div key={rb.region}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[var(--text)]">{rb.region}</span>
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    background:
                      rb.balance === 'deficit'
                        ? 'rgba(74,222,128,0.15)'
                        : rb.balance === 'surplus'
                          ? 'rgba(239,68,68,0.15)'
                          : 'rgba(251,191,36,0.15)',
                    color:
                      rb.balance === 'deficit'
                        ? '#4ade80'
                        : rb.balance === 'surplus'
                          ? '#ef4444'
                          : '#fbbf24',
                  }}
                >
                  {rb.balance === 'deficit' ? 'Underskott (bra för säljare)' : rb.balance === 'surplus' ? 'Överskott' : 'Balanserad'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-[var(--text3)] w-12">Utbud</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                  <div className="h-full rounded-full" style={{ width: `${rb.supplyLevel}%`, background: '#60a5fa' }} />
                </div>
                <span className="text-[var(--text3)] w-12">Efterfr.</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${rb.demandLevel}%`,
                      background: rb.demandLevel > rb.supplyLevel ? '#4ade80' : '#fbbf24',
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

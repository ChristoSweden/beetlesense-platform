/**
 * ContractPortfolio — Overview of active timber contracts with traffic light status.
 */

import { FileText, Calendar, TrendingDown, ChevronRight, AlertTriangle } from 'lucide-react';
import type { Contract, ValueLeakage } from '@/hooks/useContractAnalysis';
import { formatSEK } from '@/hooks/useContractAnalysis';
import { ASSORTMENTS } from '@/services/timberMarketService';

interface Props {
  contracts: Contract[];
  valueLeakages: ValueLeakage[];
  totalLeakage: number;
  onSelectContract: (id: string) => void;
  selectedContractId: string | null;
}

function getTrafficLight(leakage: ValueLeakage): { color: string; label: string; bg: string } {
  const avgSpread = leakage.assortmentBreakdown.reduce(
    (sum, a) => sum + (a.spotPrice - a.contractPrice) / a.contractPrice,
    0,
  ) / leakage.assortmentBreakdown.length;

  if (avgSpread > 0.08) return { color: '#f87171', label: 'Betydande värdeförlust', bg: '#f8717115' };
  if (avgSpread > 0.03) return { color: '#fbbf24', label: 'Under marknadspris', bg: '#fbbf2415' };
  return { color: '#4ade80', label: 'Bra affär', bg: '#4ade8015' };
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date('2026-03-17');
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function ContractPortfolio({ contracts, valueLeakages, totalLeakage, onSelectContract, selectedContractId }: Props) {
  return (
    <div>
      {/* Summary banner */}
      <div
        className="rounded-xl border border-[var(--red)]/30 p-4 mb-5 flex items-center gap-4"
        style={{ background: '#f8717110' }}
      >
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-[var(--red)]/15">
          <TrendingDown size={20} className="text-[var(--red)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">
            Total värdeförlust senaste 12 månader
          </p>
          <p className="text-xs text-[var(--text3)] mt-0.5">
            Beräknat mot spotmarknadspriser
          </p>
        </div>
        <p className="text-xl font-mono font-bold text-[var(--red)]">
          {formatSEK(totalLeakage)}
        </p>
      </div>

      {/* Contract cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {contracts.map((contract) => {
          const leakage = valueLeakages.find((v) => v.contractId === contract.id);
          const traffic = leakage ? getTrafficLight(leakage) : { color: '#4ade80', label: 'OK', bg: '#4ade8015' };
          const isSelected = selectedContractId === contract.id;
          const days = daysUntil(contract.endDate);
          const isExpiring = days < 180;

          return (
            <div
              key={contract.id}
              className={`rounded-xl border p-4 transition-all cursor-pointer hover:border-[var(--green)]/40 ${
                isSelected ? 'border-[var(--green)]/50 ring-1 ring-[var(--green)]/20' : 'border-[var(--border)]'
              }`}
              style={{ background: 'var(--bg2)' }}
              onClick={() => onSelectContract(contract.id)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg3)] flex items-center justify-center">
                    <FileText size={18} className="text-[var(--text2)]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[var(--text)]">{contract.buyer}</h3>
                    <p className="text-[10px] text-[var(--text3)] font-mono">
                      {new Date(contract.startDate).toLocaleDateString('sv-SE')} — {new Date(contract.endDate).toLocaleDateString('sv-SE')}
                    </p>
                  </div>
                </div>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: traffic.bg, color: traffic.color }}
                >
                  {traffic.label}
                </span>
              </div>

              {/* Assortments */}
              <div className="space-y-1.5 mb-3">
                {contract.assortments.map((a) => {
                  const info = ASSORTMENTS.find((x) => x.id === a.assortment);
                  const priceDiff = a.spotPrice - a.contractPrice;
                  const diffPct = Math.round((priceDiff / a.contractPrice) * 100);

                  return (
                    <div key={a.assortment} className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: info?.color }}
                        />
                        <span className="text-[var(--text2)]">{info?.nameSv}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[var(--text3)]">
                          {a.contractPrice} kr
                        </span>
                        <span className="font-mono text-[var(--red)]">
                          −{diffPct}%
                        </span>
                        <span className="font-mono text-[var(--text3)] text-[10px]">
                          {a.committedVolume} m³/år
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-4">
                  {isExpiring && (
                    <div className="flex items-center gap-1 text-[var(--yellow)]">
                      <AlertTriangle size={12} />
                      <span className="text-[10px] font-mono">{days} dagar kvar</span>
                    </div>
                  )}
                  {!isExpiring && (
                    <div className="flex items-center gap-1 text-[var(--text3)]">
                      <Calendar size={12} />
                      <span className="text-[10px] font-mono">{days} dagar kvar</span>
                    </div>
                  )}
                  {leakage && (
                    <span className="text-[10px] font-mono text-[var(--red)]">
                      −{formatSEK(leakage.totalLeakage12Months)}/12 mån
                    </span>
                  )}
                </div>
                <button
                  className="flex items-center gap-1 text-[10px] font-semibold text-[var(--green)] hover:text-[var(--green)]/80 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectContract(contract.id);
                  }}
                >
                  Analysera
                  <ChevronRight size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

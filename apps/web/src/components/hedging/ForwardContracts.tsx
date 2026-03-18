/**
 * ForwardContracts — Browse and sign forward contracts to lock in timber prices.
 * Shows available contracts with guaranteed price, delivery window, counterparty,
 * premium/discount vs spot, and a volume selector to sign.
 */

import { useState } from 'react';
import { Lock, ArrowUpRight, ArrowDownRight, Info, Check } from 'lucide-react';
import type { ForwardContract } from '@/hooks/useTimberHedging';

interface Props {
  contracts: ForwardContract[];
  onSign: (contractId: string, volumeM3: number) => void;
}

function formatSEK(val: number): string {
  return val.toLocaleString('sv-SE');
}

export function ForwardContracts({ contracts, onSign }: Props) {
  const [selectedContract, setSelectedContract] = useState<string | null>(null);
  const [volumes, setVolumes] = useState<Record<string, number>>({});
  const [signedIds, setSignedIds] = useState<Set<string>>(new Set());

  const handleSign = (contract: ForwardContract) => {
    const vol = volumes[contract.id] || contract.minVolumeM3;
    onSign(contract.id, vol);
    setSignedIds((prev) => new Set(prev).add(contract.id));
    setSelectedContract(null);
  };

  return (
    <div className="space-y-5">
      {/* Explanation */}
      <div className="rounded-xl border border-[var(--green)]/20 p-4" style={{ background: 'rgba(74,222,128,0.03)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center flex-shrink-0">
            <Lock size={18} className="text-[var(--green)]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--green)] mb-1">Terminskontrakt</p>
            <p className="text-sm text-[var(--text2)]">
              Du garanterar ett pris oavsett vad marknaden gor. Om priserna faller ar du skyddad.
              Om priserna stiger har du dock last in ett lagre pris (alternativkostnad).
            </p>
          </div>
        </div>
      </div>

      {/* Contract cards */}
      <div className="space-y-3">
        {contracts.map((contract) => {
          const premiumDiscount = contract.guaranteedPriceSEK - contract.spotPriceSEK;
          const premiumPct = ((premiumDiscount / contract.spotPriceSEK) * 100).toFixed(1);
          const isPremium = premiumDiscount >= 0;
          const isSelected = selectedContract === contract.id;
          const isSigned = signedIds.has(contract.id);
          const volume = volumes[contract.id] || contract.minVolumeM3;
          const totalValue = volume * contract.guaranteedPriceSEK;
          const fee = Math.round(totalValue * (contract.feePct / 100));

          return (
            <div
              key={contract.id}
              className={`rounded-xl border p-4 transition-all ${
                isSigned
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                  : isSelected
                    ? 'border-[var(--green)]/30 bg-[var(--bg2)]'
                    : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-[var(--text)]">{contract.label}</p>
                    <span className="text-[10px] font-mono text-[var(--text3)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {contract.deliveryWindow}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text3)]">
                    Las {contract.guaranteedPriceSEK} SEK/m³fub for {contract.label.toLowerCase()}, leverans {contract.deliveryWindow}
                  </p>
                </div>
                {isSigned ? (
                  <div className="flex items-center gap-1 text-[var(--green)]">
                    <Check size={14} />
                    <span className="text-[10px] font-semibold">Tecknad</span>
                  </div>
                ) : (
                  <div className={`flex items-center gap-1 ${isPremium ? 'text-[var(--green)]' : 'text-amber-400'}`}>
                    {isPremium ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    <span className="text-xs font-mono">
                      {isPremium ? '+' : ''}{premiumPct}% vs spot
                    </span>
                  </div>
                )}
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Garanterat pris</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">
                    {contract.guaranteedPriceSEK} SEK
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Spotpris nu</p>
                  <p className="text-sm font-mono text-[var(--text2)]">{contract.spotPriceSEK} SEK</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Motpart</p>
                  <p className="text-xs text-[var(--text)]">{contract.counterparty}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Avgift</p>
                  <p className="text-xs text-[var(--text)]">{contract.feePct}%</p>
                </div>
              </div>

              {/* Volume and sign */}
              {!isSigned && (
                <>
                  {isSelected ? (
                    <div className="border-t border-[var(--border)] pt-3 mt-3 space-y-3">
                      <div>
                        <label className="text-[10px] text-[var(--text3)] block mb-1">
                          Volym (m³) — min {contract.minVolumeM3}, max {contract.maxVolumeM3}
                        </label>
                        <input
                          type="range"
                          min={contract.minVolumeM3}
                          max={contract.maxVolumeM3}
                          step={10}
                          value={volume}
                          onChange={(e) =>
                            setVolumes((prev) => ({ ...prev, [contract.id]: Number(e.target.value) }))
                          }
                          className="w-full accent-[var(--green)]"
                        />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-mono text-[var(--text)]">{volume} m³</span>
                          <span className="text-xs font-mono text-[var(--text2)]">
                            = {formatSEK(totalValue)} SEK (avgift: {formatSEK(fee)} SEK)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                        <Info size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-amber-400/80">
                          Om marknadspriset stiger over {contract.guaranteedPriceSEK} SEK/m³ gar du miste om den uppsidan.
                          Du garanterar dock {contract.guaranteedPriceSEK} SEK oavsett vad som hander.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSign(contract)}
                          className="flex-1 py-2 rounded-lg bg-[var(--green)] text-sm font-semibold text-white hover:brightness-110 transition"
                        >
                          Teckna kontrakt
                        </button>
                        <button
                          onClick={() => setSelectedContract(null)}
                          className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition"
                        >
                          Avbryt
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedContract(contract.id)}
                      className="w-full mt-2 py-2 rounded-lg border border-[var(--green)]/30 text-xs font-semibold text-[var(--green)] hover:bg-[var(--green)]/5 transition"
                    >
                      Teckna kontrakt
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * PriceInsurance — Price floor protection ("prisforsakring").
 * Pay a small premium to guarantee a minimum price; keep upside if prices stay above floor.
 * Includes a premium calculator and payout scenario visualization.
 */

import { useState, useMemo } from 'react';
import { Shield, ArrowDown, ArrowUp, Calculator, CheckCircle2 } from 'lucide-react';
import type { InsuranceQuote } from '@/hooks/useTimberHedging';

interface Props {
  quotes: InsuranceQuote[];
  onPurchase: (quoteId: string, volumeM3: number, floorPriceSEK: number) => void;
}

function formatSEK(val: number): string {
  return val.toLocaleString('sv-SE');
}

export function PriceInsurance({ quotes, onPurchase }: Props) {
  const [activeQuote, setActiveQuote] = useState<string | null>(null);
  const [calcVolume, setCalcVolume] = useState(100);
  const [calcFloor, setCalcFloor] = useState(0);
  const [purchasedIds, setPurchasedIds] = useState<Set<string>>(new Set());

  const selectedQuote = quotes.find((q) => q.id === activeQuote);

  // When a new quote is selected, reset calculator values
  const selectQuote = (id: string) => {
    const q = quotes.find((quote) => quote.id === id);
    if (q) {
      setActiveQuote(id);
      setCalcVolume(Math.min(100, q.maxVolumeM3));
      setCalcFloor(q.floorPriceSEK);
    }
  };

  const premiumSEK = useMemo(() => {
    if (!selectedQuote) return 0;
    return Math.round(calcVolume * calcFloor * (selectedQuote.premiumPct / 100));
  }, [selectedQuote, calcVolume, calcFloor]);

  const insuredValueSEK = calcVolume * calcFloor;

  const handlePurchase = () => {
    if (!selectedQuote) return;
    onPurchase(selectedQuote.id, calcVolume, calcFloor);
    setPurchasedIds((prev) => new Set(prev).add(selectedQuote.id));
    setActiveQuote(null);
  };

  // Scenario visualization data
  const scenarios = useMemo(() => {
    if (!selectedQuote) return [];
    const spot = selectedQuote.spotPriceSEK;
    return [
      { label: 'Pris -30%', price: Math.round(spot * 0.7), below: true },
      { label: 'Pris -15%', price: Math.round(spot * 0.85), below: Math.round(spot * 0.85) < calcFloor },
      { label: 'Golv', price: calcFloor, below: false },
      { label: 'Spotpris', price: spot, below: false },
      { label: 'Pris +15%', price: Math.round(spot * 1.15), below: false },
    ];
  }, [selectedQuote, calcFloor]);

  return (
    <div className="space-y-5">
      {/* Explanation */}
      <div className="rounded-xl border border-[var(--green)]/20 p-4" style={{ background: 'rgba(74,222,128,0.03)' }}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--green)]/10 flex items-center justify-center flex-shrink-0">
            <Shield size={18} className="text-[var(--green)]" />
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--green)] mb-1">Prisforsakring</p>
            <p className="text-sm text-[var(--text2)] mb-2">
              Betala en liten premie for att garantera ett minimipris. Om priset faller under golvet
              betalar forsakringen mellanskillnaden. Om priset stannar over golvet behaller du hela
              marknadspriset (minus premien).
            </p>
            <p className="text-xs text-[var(--green)] font-medium">
              Battre an terminskontrakt — du behaller uppsidan
            </p>
          </div>
        </div>
      </div>

      {/* Available quotes */}
      <div className="space-y-3">
        {quotes.map((quote) => {
          const isPurchased = purchasedIds.has(quote.id);
          const isActive = activeQuote === quote.id;
          const examplePremium = Math.round(100 * quote.floorPriceSEK * (quote.premiumPct / 100));

          return (
            <div
              key={quote.id}
              className={`rounded-xl border p-4 transition-all ${
                isPurchased
                  ? 'border-[var(--green)]/40 bg-[var(--green)]/5'
                  : isActive
                    ? 'border-[var(--green)]/30 bg-[var(--bg2)]'
                    : 'border-[var(--border)] bg-[var(--bg2)] hover:border-[var(--border2)]'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-[var(--text)]">{quote.label}</p>
                    <span className="text-[10px] font-mono text-[var(--text3)] px-2 py-0.5 rounded-full border border-[var(--border)]">
                      {quote.coveragePeriod}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text3)]">
                    Prisgolv {quote.floorPriceSEK} SEK/m³ &middot; Premie {quote.premiumPct}% &middot; Max {quote.maxVolumeM3} m³
                  </p>
                </div>
                {isPurchased && (
                  <div className="flex items-center gap-1 text-[var(--green)]">
                    <CheckCircle2 size={14} />
                    <span className="text-[10px] font-semibold">Tecknad</span>
                  </div>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Prisgolv</p>
                  <p className="text-sm font-mono font-semibold text-[var(--text)]">{quote.floorPriceSEK} SEK</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Spotpris nu</p>
                  <p className="text-sm font-mono text-[var(--text2)]">{quote.spotPriceSEK} SEK</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text3)]">Premie (100 m³)</p>
                  <p className="text-sm font-mono text-[var(--text2)]">{formatSEK(examplePremium)} SEK</p>
                </div>
              </div>

              {!isPurchased && !isActive && (
                <button
                  onClick={() => selectQuote(quote.id)}
                  className="w-full py-2 rounded-lg border border-[var(--green)]/30 text-xs font-semibold text-[var(--green)] hover:bg-[var(--green)]/5 transition"
                >
                  Rakna premie & teckna
                </button>
              )}

              {/* Premium calculator */}
              {isActive && selectedQuote && (
                <div className="border-t border-[var(--border)] pt-3 mt-3 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Calculator size={14} className="text-[var(--green)]" />
                    <h4 className="text-xs font-semibold text-[var(--text)]">Premiekalkylator</h4>
                  </div>

                  {/* Volume slider */}
                  <div>
                    <label className="text-[10px] text-[var(--text3)] block mb-1">
                      Volym: {calcVolume} m³ (max {selectedQuote.maxVolumeM3})
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={selectedQuote.maxVolumeM3}
                      step={10}
                      value={calcVolume}
                      onChange={(e) => setCalcVolume(Number(e.target.value))}
                      className="w-full accent-[var(--green)]"
                    />
                  </div>

                  {/* Floor price slider */}
                  <div>
                    <label className="text-[10px] text-[var(--text3)] block mb-1">
                      Prisgolv: {calcFloor} SEK/m³
                    </label>
                    <input
                      type="range"
                      min={Math.round(selectedQuote.spotPriceSEK * 0.7)}
                      max={selectedQuote.spotPriceSEK}
                      step={5}
                      value={calcFloor}
                      onChange={(e) => setCalcFloor(Number(e.target.value))}
                      className="w-full accent-[var(--green)]"
                    />
                  </div>

                  {/* Cost summary */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-lg" style={{ background: 'var(--bg3)' }}>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Forsakrat varde</p>
                      <p className="text-sm font-mono font-semibold text-[var(--text)]">{formatSEK(insuredValueSEK)} SEK</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Premie ({selectedQuote.premiumPct}%)</p>
                      <p className="text-sm font-mono font-semibold text-amber-400">{formatSEK(premiumSEK)} SEK</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Per m³</p>
                      <p className="text-sm font-mono text-[var(--text2)]">
                        {calcVolume > 0 ? Math.round(premiumSEK / calcVolume) : 0} SEK
                      </p>
                    </div>
                  </div>

                  {/* Scenario visualization */}
                  <div>
                    <p className="text-[10px] text-[var(--text3)] mb-2">Utbetalningsscenarier:</p>
                    <div className="space-y-1.5">
                      {scenarios.map((s) => {
                        const payout = s.price < calcFloor ? (calcFloor - s.price) * calcVolume : 0;
                        const netIncome = s.price * calcVolume + payout - premiumSEK;
                        const barWidth = Math.min(100, (s.price / (selectedQuote.spotPriceSEK * 1.2)) * 100);

                        return (
                          <div key={s.label} className="flex items-center gap-2">
                            <span className="text-[10px] text-[var(--text3)] w-16 text-right">{s.label}</span>
                            <div className="flex-1 h-5 rounded bg-[var(--bg3)] overflow-hidden relative">
                              <div
                                className={`h-full rounded transition-all ${
                                  s.price < calcFloor ? 'bg-amber-500/40' : 'bg-[var(--green)]/40'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-[var(--text)]">
                                {s.price} SEK/m³
                                {payout > 0 && (
                                  <span className="ml-1 text-amber-400">
                                    +{formatSEK(payout)} utbet.
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="w-24 text-right">
                              {payout > 0 ? (
                                <div className="flex items-center gap-0.5 justify-end text-amber-400">
                                  <ArrowDown size={10} />
                                  <span className="text-[10px] font-mono">Netto: {formatSEK(netIncome)}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-0.5 justify-end text-[var(--green)]">
                                  <ArrowUp size={10} />
                                  <span className="text-[10px] font-mono">Netto: {formatSEK(netIncome)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handlePurchase}
                      className="flex-1 py-2 rounded-lg bg-[var(--green)] text-sm font-semibold text-white hover:brightness-110 transition"
                    >
                      Teckna prisforsakring — {formatSEK(premiumSEK)} SEK
                    </button>
                    <button
                      onClick={() => setActiveQuote(null)}
                      className="px-4 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition"
                    >
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

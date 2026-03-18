/**
 * ForagingRights — Berry & mushroom foraging rights management.
 *
 * Covers allemansrätten, commercial harvesting permits,
 * inventory per parcel, guided foraging tours, and svampskog certification.
 */

import { useState } from 'react';
import {
  Flower2,
  Info,
  AlertTriangle,
  MapPin,
  ChevronDown,
  ChevronUp,
  Award,
  Users,
  ShoppingBag,
} from 'lucide-react';
import type { ForagingItem } from '@/hooks/useNonTimberIncome';

interface ForagingRightsProps {
  items: ForagingItem[];
  totalIncome: number;
}

function formatSEK(v: number): string {
  return v.toLocaleString('sv-SE');
}

function abundanceBadge(a: ForagingItem['abundance']) {
  const map = {
    high: { label: 'Riklig', cls: 'bg-[var(--green)]/10 text-[var(--green)]' },
    medium: { label: 'Medel', cls: 'bg-amber-500/10 text-amber-400' },
    low: { label: 'Begränsad', cls: 'bg-red-500/10 text-red-400' },
  };
  const s = map[a];
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function typeBadge(type: ForagingItem['type']) {
  const map = {
    berry: { label: 'Bär', cls: 'bg-pink-500/10 text-pink-400' },
    mushroom: { label: 'Svamp', cls: 'bg-orange-500/10 text-orange-400' },
  };
  const s = map[type];
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

export function ForagingRights({ items, totalIncome }: ForagingRightsProps) {
  const [showAllemansratten, setShowAllemansratten] = useState(false);
  const [showCertification, setShowCertification] = useState(false);
  const [showCommercial, setShowCommercial] = useState(false);

  const totalEstimatedValue = items.reduce((s, f) => s + f.annualValueSEK, 0);
  const berryItems = items.filter(f => f.type === 'berry');
  const mushroomItems = items.filter(f => f.type === 'mushroom');

  // Group by parcel
  const byParcel = items.reduce<Record<string, ForagingItem[]>>((acc, item) => {
    const key = item.parcelName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--green)]/10 flex items-center justify-center">
              <Flower2 size={16} className="text-[var(--green)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)]">Svamp & Bär</p>
              <p className="text-[10px] text-[var(--text3)]">{items.length} inventerade resurser</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-mono font-bold text-[var(--green)]">{formatSEK(totalIncome)} <span className="text-xs text-[var(--text3)]">SEK/år</span></p>
            <p className="text-[10px] text-[var(--text3)]">från kommersiella aktiviteter</p>
          </div>
        </div>

        {/* Value note */}
        <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <div className="flex items-start gap-2">
            <Info size={14} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-blue-400">Beräknat skogsvärde</p>
              <p className="text-[10px] text-blue-400/80 mt-0.5">
                Totalt bär- och svampvärde: ~{formatSEK(totalEstimatedValue)} SEK/år. Av detta kan ca 15% generera direkt intäkt via kommersiella tillstånd och organiserade turer.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Allemansrätten */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <button
          onClick={() => setShowAllemansratten(!showAllemansratten)}
          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Info size={14} className="text-blue-400" />
            <span className="text-sm font-semibold text-[var(--text)]">Allemansrätten &mdash; vad gäller?</span>
          </div>
          {showAllemansratten ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
        </button>
        {showAllemansratten && (
          <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-400">
                  <span className="font-semibold">Viktigt:</span> Allemansrätten ger alla rätt att plocka bär och svamp för eget bruk. Du kan INTE ta betalt för casual plockning.
                </p>
              </div>
            </div>
            <div className="space-y-2 text-[10px] text-[var(--text2)]">
              <div className="flex items-start gap-2">
                <span className="text-[var(--green)] font-bold mt-0.5">&#10003;</span>
                <p><span className="font-semibold text-[var(--text)]">Du KAN:</span> Erbjuda guidade svamp- och bärturer (du säljer upplevelsen, inte bären)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--green)] font-bold mt-0.5">&#10003;</span>
                <p><span className="font-semibold text-[var(--text)]">Du KAN:</span> Kräva tillstånd för kommersiell storskalig plockning (organiserade plockare)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-[var(--green)] font-bold mt-0.5">&#10003;</span>
                <p><span className="font-semibold text-[var(--text)]">Du KAN:</span> Sälja produkter gjorda av dina skogars råvaror (sylt, torkade svampar)</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">&#10007;</span>
                <p><span className="font-semibold text-[var(--text)]">Du KAN INTE:</span> Stänga av din mark för privatpersoner som plockar för eget bruk</p>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold mt-0.5">&#10007;</span>
                <p><span className="font-semibold text-[var(--text)]">Du KAN INTE:</span> Ta betalt av enskilda bärplockare</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Inventory per parcel */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-[var(--text)] flex items-center gap-1.5">
          <MapPin size={12} className="text-[var(--green)]" /> Inventering per skifte
        </p>
        {Object.entries(byParcel).map(([parcelName, parcelItems]) => (
          <div key={parcelName} className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
            <div className="px-4 py-2.5 bg-[var(--bg3)] border-b border-[var(--border)]">
              <p className="text-xs font-semibold text-[var(--text)]">{parcelName}</p>
            </div>
            <div className="p-3 space-y-2">
              {parcelItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <div className="flex items-center gap-2 min-w-0">
                    {typeBadge(item.type)}
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-[var(--text)] truncate">{item.nameSv}</p>
                      <p className="text-[10px] text-[var(--text3)]">Säsong: {item.season} &middot; ~{item.estimatedYieldKg} kg/år</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    {abundanceBadge(item.abundance)}
                    <p className="text-[10px] font-mono text-[var(--text2)] mt-0.5">{item.marketPriceSEKPerKg} SEK/kg</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Commercial picker management */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <button
          onClick={() => setShowCommercial(!showCommercial)}
          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users size={14} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">Kommersiell plockning</span>
          </div>
          {showCommercial ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
        </button>
        {showCommercial && (
          <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
            <p className="text-xs text-[var(--text2)]">
              Kommersiella plockare (ofta organiserade grupper) behöver markägarens tillstånd om de bedriver storskalig plockning som stör markägaren eller skadar marken.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
                <ShoppingBag size={16} className="text-[var(--green)] mx-auto mb-1" />
                <p className="text-xs font-semibold text-[var(--text)]">Tillståndsavgift</p>
                <p className="text-[10px] text-[var(--text3)]">500-2 000 SEK/säsong per grupp</p>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] text-center">
                <Users size={16} className="text-[var(--green)] mx-auto mb-1" />
                <p className="text-xs font-semibold text-[var(--text)]">Guidade turer</p>
                <p className="text-[10px] text-[var(--text3)]">800-1 500 SEK/person</p>
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--green)]/5 border border-[var(--green)]/20">
              <p className="text-[10px] text-[var(--green)]">
                Guidade svampturer: populärt bland turister och nybörjare. Kombinera med matlagning i skogen för premium-prissättning (1 500-2 500 SEK/person).
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Svampskog certification */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <button
          onClick={() => setShowCertification(!showCertification)}
          className="w-full p-4 flex items-center justify-between hover:bg-[var(--bg3)] transition-colors"
        >
          <div className="flex items-center gap-2">
            <Award size={14} className="text-[var(--green)]" />
            <span className="text-sm font-semibold text-[var(--text)]">&quot;Svampskog&quot; certifiering</span>
          </div>
          {showCertification ? <ChevronUp size={16} className="text-[var(--text3)]" /> : <ChevronDown size={16} className="text-[var(--text3)]" />}
        </button>
        {showCertification && (
          <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
            <p className="text-xs text-[var(--text2)]">
              Potentiell certifiering som &quot;Svampskog&quot; &mdash; en kvalitetsmärkning för skogar med rika svampmarker. Kan öka attraktiviteten för guidade turer och samarbeten med restauranger.
            </p>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">Ekbacken</p>
                  <p className="text-[10px] text-[var(--text3)]">Kantarell, blandskog med ek</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green)]/10 text-[var(--green)]">Bra kandidat</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                <div>
                  <p className="text-xs font-medium text-[var(--text)]">Tallmon</p>
                  <p className="text-[10px] text-[var(--text3)]">Kantarell, Karl-Johan, tallskog</p>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">Möjlig</span>
              </div>
            </div>
            <ul className="space-y-1 text-[10px] text-[var(--text3)]">
              <li className="flex items-start gap-1.5">
                <span className="text-[var(--green)] mt-0.5">&bull;</span>
                Krav: dokumenterad svampförekomst minst 3 säsonger
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[var(--green)] mt-0.5">&bull;</span>
                Skonsam skogsskötsel som bevarar mykorrhiza-nätverket
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-[var(--green)] mt-0.5">&bull;</span>
                Potentiell premie: 20-30% på guideturer med certifiering
              </li>
            </ul>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)] mb-1">Bär (totalt estimat)</p>
          <p className="text-sm font-mono font-semibold text-pink-400">
            {formatSEK(berryItems.reduce((s, b) => s + b.annualValueSEK, 0))} SEK
          </p>
          <p className="text-[10px] text-[var(--text3)]">{berryItems.reduce((s, b) => s + b.estimatedYieldKg, 0)} kg/år</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg2)' }}>
          <p className="text-[10px] text-[var(--text3)] mb-1">Svamp (totalt estimat)</p>
          <p className="text-sm font-mono font-semibold text-orange-400">
            {formatSEK(mushroomItems.reduce((s, m) => s + m.annualValueSEK, 0))} SEK
          </p>
          <p className="text-[10px] text-[var(--text3)]">{mushroomItems.reduce((s, m) => s + m.estimatedYieldKg, 0)} kg/år</p>
        </div>
      </div>
    </div>
  );
}

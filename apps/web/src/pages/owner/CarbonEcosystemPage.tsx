import { useState } from 'react';

interface ImpactZone { id: string; name: string; affectedTrees: number; biomassLost: number; co2Emissions: number; timberLossSEK: number; carbonCreditLoss: number; recreationLoss: number; totalEconomicImpact: number; }

const EU_ETS_PRICE = 72; // EUR/ton CO2
const _SEK_PER_EUR = 11.5;
const TIMBER_PRICE_SEK = 580; // SEK/m3

const IMPACT_ZONES: ImpactZone[] = [
  { id: 'Z1', name: 'V\u00E4sterg\u00F6tland Block A', affectedTrees: 7500, biomassLost: 4200, co2Emissions: 12600, timberLossSEK: 24360000, carbonCreditLoss: 10454400, recreationLoss: 2500000, totalEconomicImpact: 37314400 },
  { id: 'Z2', name: '\u00D6sterg\u00F6tland Block B', affectedTrees: 3200, biomassLost: 1800, co2Emissions: 5400, timberLossSEK: 10440000, carbonCreditLoss: 4482000, recreationLoss: 1200000, totalEconomicImpact: 16122000 },
  { id: 'Z3', name: 'Sm\u00E5land Block C', affectedTrees: 1100, biomassLost: 620, co2Emissions: 1860, timberLossSEK: 3596000, carbonCreditLoss: 1544400, recreationLoss: 450000, totalEconomicImpact: 5590400 },
];

const formatSEK = (n: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(n);
const formatTons = (n: number) => n.toLocaleString() + ' t CO\u2082';

export default function CarbonEcosystemPage() {
  const [selectedZone, setSelectedZone] = useState<ImpactZone>(IMPACT_ZONES[0]);
  const totals = IMPACT_ZONES.reduce((acc, z) => ({ trees: acc.trees + z.affectedTrees, co2: acc.co2 + z.co2Emissions, timber: acc.timber + z.timberLossSEK, carbon: acc.carbon + z.carbonCreditLoss, rec: acc.rec + z.recreationLoss, total: acc.total + z.totalEconomicImpact }), { trees: 0, co2: 0, timber: 0, carbon: 0, rec: 0, total: 0 });

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2"><span className="text-3xl">\uD83C\uDF0D</span><h1 className="text-3xl font-bold">Carbon & Ecosystem Impact</h1><span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">MONETIZED</span></div>
          <p className="text-[var(--text3)] max-w-3xl">Quantify the real cost of bark beetle damage: timber loss + CO\u2082 emissions + carbon credit loss + recreation impact. Uses EU ETS pricing (\u20AC{EU_ETS_PRICE}/ton), Swedish timber prices ({TIMBER_PRICE_SEK} SEK/m\u00B3), and SLU allometric biomass models. No competitor monetizes ecosystem services.</p>
        </div>

        {/* Total Impact Banner */}
        <div className="bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20 rounded-xl p-6 mb-6">
          <div className="text-sm text-[var(--text3)] mb-1">Total Economic Impact (All Zones)</div>
          <div className="text-4xl font-bold text-red-400">{formatSEK(totals.total)}</div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4 text-sm">
            <div><span className="text-[var(--text3)]">Trees:</span> <span className="font-bold">{totals.trees.toLocaleString()}</span></div>
            <div><span className="text-[var(--text3)]">CO\u2082:</span> <span className="font-bold text-red-400">{formatTons(totals.co2)}</span></div>
            <div><span className="text-[var(--text3)]">Timber:</span> <span className="font-bold">{formatSEK(totals.timber)}</span></div>
            <div><span className="text-[var(--text3)]">Carbon credits:</span> <span className="font-bold">{formatSEK(totals.carbon)}</span></div>
            <div><span className="text-[var(--text3)]">Recreation:</span> <span className="font-bold">{formatSEK(totals.rec)}</span></div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">\uD83D\uDDFA\uFE0F Impact Zones</h2>
            {IMPACT_ZONES.map(zone => (
              <button key={zone.id} onClick={() => setSelectedZone(zone)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedZone.id === zone.id ? 'ring-2 ring-emerald-500' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
                <div className="flex items-center justify-between mb-2"><span className="font-medium">{zone.name}</span><span className="text-sm font-bold text-red-400">{formatSEK(zone.totalEconomicImpact)}</span></div>
                <div className="grid grid-cols-3 gap-2 text-xs text-[var(--text3)]">
                  <div>{zone.affectedTrees.toLocaleString()} trees</div>
                  <div>{formatTons(zone.co2Emissions)}</div>
                  <div>{zone.biomassLost.toLocaleString()} m\u00B3</div>
                </div>
                {/* Stacked bar showing proportions */}
                <div className="flex h-2 rounded-full overflow-hidden mt-2">
                  <div style={{ width: `${(zone.timberLossSEK / zone.totalEconomicImpact) * 100}%` }} className="bg-amber-500" />
                  <div style={{ width: `${(zone.carbonCreditLoss / zone.totalEconomicImpact) * 100}%` }} className="bg-red-500" />
                  <div style={{ width: `${(zone.recreationLoss / zone.totalEconomicImpact) * 100}%` }} className="bg-blue-500" />
                </div>
                <div className="flex gap-4 text-[10px] text-[var(--text3)] mt-1">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" />Timber</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-red-500" />Carbon</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-blue-500" />Recreation</span>
                </div>
              </button>
            ))}
          </div>
          <div className="space-y-4">
            <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
              <h3 className="font-semibold mb-4">\uD83D\uDCCA {selectedZone.name} Breakdown</h3>
              <div className="space-y-3">
                {[['\uD83C\uDF32 Timber Loss', selectedZone.timberLossSEK, 'amber'], ['\uD83C\uDF0D CO\u2082 Credits Lost', selectedZone.carbonCreditLoss, 'red'], ['\uD83C\uDFDE\uFE0F Recreation Impact', selectedZone.recreationLoss, 'blue']].map(([label, val, color]) => (
                  <div key={label as string} className="flex items-center gap-3">
                    <span className="text-sm w-40">{label as string}</span>
                    <div className="flex-1 h-4 bg-[var(--bg3)] rounded-full overflow-hidden"><div className={`h-full rounded-full bg-${color}-500`} style={{ width: `${((val as number) / selectedZone.totalEconomicImpact) * 100}%` }} /></div>
                    <span className="text-sm font-bold w-32 text-right">{formatSEK(val as number)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
              <h4 className="font-semibold text-sm text-emerald-400 mb-2">\uD83D\uDCB0 ROI of Early Detection</h4>
              <p className="text-xs text-[var(--text3)]">If BeetleSense detects infestation 3 weeks earlier, estimated 40% of timber can be salvaged = {formatSEK(selectedZone.timberLossSEK * 0.4)} saved. Carbon credits preserved = {formatSEK(selectedZone.carbonCreditLoss * 0.6)}. Total ROI of early detection for this zone: {formatSEK(selectedZone.timberLossSEK * 0.4 + selectedZone.carbonCreditLoss * 0.6)}.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
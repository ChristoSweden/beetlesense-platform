import { useState } from 'react';

const DEMO_STAND = {
  name: 'Falun Nord - Block A3', area: 50, species: 'Norway Spruce', avgAge: 65,
  volumePerHa: 280, totalVolume: 14000, carbonPerM3: 0.26,
  timberPrice: 580, fellingCost: 180, euEtsPrice: 72,
};

export default function CarbonImpactPage() {
  const [daysUntilHarvest, setDays] = useState(14);
  const degradation = Math.min(daysUntilHarvest / 90, 1);
  const timberLoss = Math.round(DEMO_STAND.totalVolume * degradation * 0.45);
  const salvageVolume = DEMO_STAND.totalVolume - timberLoss;
  const salvageValue = Math.round(salvageVolume * DEMO_STAND.timberPrice);
  const totalLossValue = Math.round(DEMO_STAND.totalVolume * DEMO_STAND.timberPrice);
  const co2IfDies = Math.round(DEMO_STAND.totalVolume * DEMO_STAND.carbonPerM3 * 3.67);
  const co2IfHarvested = Math.round(co2IfDies * 0.3);
  const co2Saved = co2IfDies - co2IfHarvested;
  const carbonCreditValue = Math.round(co2Saved * DEMO_STAND.euEtsPrice);
  const fellingCost = Math.round(salvageVolume * DEMO_STAND.fellingCost);
  const netRevenue = salvageValue - fellingCost;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Carbon Impact Calculator</h1>
      <p className="text-gray-600 mb-6">See the environmental and economic cost of delayed action. Based on EU ETS carbon pricing (\u20AC{DEMO_STAND.euEtsPrice}/ton CO\u2082).</p>

      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
        <h2 className="font-semibold text-lg mb-1">{DEMO_STAND.name}</h2>
        <p className="text-sm text-gray-500 mb-4">{DEMO_STAND.area} ha \u00B7 {DEMO_STAND.species} \u00B7 Avg age {DEMO_STAND.avgAge} years \u00B7 {DEMO_STAND.totalVolume.toLocaleString()} m\u00B3</p>

        <label className="block text-sm font-medium text-gray-700 mb-2">Days until harvest: <span className="font-bold text-green-700">{daysUntilHarvest}</span></label>
        <input type="range" min="0" max="90" value={daysUntilHarvest} onChange={e => setDays(Number(e.target.value))} className="w-full mb-6 accent-green-600" />

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-red-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-red-700">{co2IfDies.toLocaleString()}</div>
            <div className="text-xs text-red-600">tons CO\u2082 if trees die</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{co2Saved.toLocaleString()}</div>
            <div className="text-xs text-green-600">tons CO\u2082 saved by harvesting</div>
          </div>
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">\u20AC{carbonCreditValue.toLocaleString()}</div>
            <div className="text-xs text-blue-600">Carbon credit value (EU ETS)</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <div className="text-2xl font-bold text-amber-700">{salvageValue.toLocaleString()} SEK</div>
            <div className="text-xs text-amber-600">Timber salvage value</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h3 className="font-semibold mb-3">Economic Summary</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Total timber value (if healthy)</span><span className="font-mono">{totalLossValue.toLocaleString()} SEK</span></div>
          <div className="flex justify-between"><span>Salvageable volume at day {daysUntilHarvest}</span><span className="font-mono">{salvageVolume.toLocaleString()} m\u00B3</span></div>
          <div className="flex justify-between"><span>Salvage revenue</span><span className="font-mono">{salvageValue.toLocaleString()} SEK</span></div>
          <div className="flex justify-between"><span>Felling cost</span><span className="font-mono text-red-600">-{fellingCost.toLocaleString()} SEK</span></div>
          <div className="flex justify-between border-t pt-2 font-bold"><span>Net revenue</span><span className="font-mono text-green-700">{netRevenue.toLocaleString()} SEK</span></div>
        </div>
      </div>
    </div>
  );
}

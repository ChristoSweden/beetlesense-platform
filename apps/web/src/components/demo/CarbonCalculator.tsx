import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Car, TrendingUp, ArrowRight } from 'lucide-react';

interface CarbonImpact {
  hectares: number;
  co2PerYear: number;
  carEquivalent: number;
  carbonValue: number;
}

const CarbonCalculator: React.FC = () => {
  const [hectares, setHectares] = useState<number>(100);

  // Constants for Scandinavian forest
  const CO2_PER_HA_PER_YEAR = 2.86; // tonnes
  const CAR_EMISSIONS_PER_YEAR = 4.6; // tonnes CO2/car/year
  const CARBON_CREDIT_VALUE = 25; // EUR per tonne CO2

  const impact = useMemo<CarbonImpact>(() => {
    const co2 = hectares * CO2_PER_HA_PER_YEAR;
    const carEq = Math.round(co2 / CAR_EMISSIONS_PER_YEAR);
    const value = Math.round(co2 * CARBON_CREDIT_VALUE);

    return {
      hectares,
      co2PerYear: Math.round(co2 * 10) / 10,
      carEquivalent: carEq,
      carbonValue: value,
    };
  }, [hectares]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHectares(parseInt(e.target.value, 10));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 1 && value <= 10000) {
      setHectares(value);
    }
  };

  return (
    <div className="border border-gray-800 rounded-lg p-6 bg-gray-900">
      <div className="flex items-center gap-2 mb-4">
        <Leaf className="w-5 h-5 text-emerald-400" />
        <h2 className="text-xl font-semibold">Carbon Impact Calculator</h2>
      </div>

      <p className="text-sm text-gray-400 mb-8">
        Beräkna din skogsägning miljöpåverkan och kolsekvesteringsvärde
      </p>

      {/* Input Section */}
      <div className="mb-8 p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
        <label className="block text-sm font-semibold text-gray-300 mb-4">
          Hur många hektar skogsmark äger du?
        </label>

        {/* Slider */}
        <div className="mb-6">
          <input
            type="range"
            min="1"
            max="10000"
            value={hectares}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${(hectares / 10000) * 100}%, #374151 ${(hectares / 10000) * 100}%, #374151 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-gray-500 mt-2">
            <span>1 ha</span>
            <span>10 000 ha</span>
          </div>
        </div>

        {/* Number Input */}
        <div className="flex gap-3">
          <input
            type="number"
            min="1"
            max="10000"
            value={hectares}
            onChange={handleInputChange}
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            placeholder="Ange hektar"
          />
          <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/50 rounded text-emerald-300 font-semibold">
            {hectares.toLocaleString('sv-SE')} ha
          </div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* CO2 Sequestration */}
        <div className="bg-gradient-to-br from-emerald-950/40 to-emerald-900/20 border border-emerald-800/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-emerald-300">CO2 Sekvesteringskapacitet</h3>
          </div>
          <div className="text-4xl font-bold text-emerald-400 mb-2">
            {impact.co2PerYear.toLocaleString('sv-SE')}
          </div>
          <div className="text-sm text-gray-300">
            ton CO<sub>2</sub> sekvestererad per år
          </div>
          <div className="text-xs text-gray-500 mt-3 p-3 bg-black/30 rounded">
            Baserat på Skandinavisk skogssnitt: {CO2_PER_HA_PER_YEAR} ton/ha/år
          </div>
        </div>

        {/* Car Equivalent */}
        <div className="bg-gradient-to-br from-blue-950/40 to-blue-900/20 border border-blue-800/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-blue-300">Motsvarig bilsutsläpp</h3>
          </div>
          <div className="text-4xl font-bold text-blue-400 mb-2">
            {impact.carEquivalent.toLocaleString('sv-SE')}
          </div>
          <div className="text-sm text-gray-300">
            bilar uttryckliga per år*
          </div>
          <div className="text-xs text-gray-500 mt-3 p-3 bg-black/30 rounded">
            *Baserat på genomsnittlig bils årliga utsläpp: {CAR_EMISSIONS_PER_YEAR} ton
          </div>
        </div>

        {/* Economic Value */}
        <div className="md:col-span-2 bg-gradient-to-br from-amber-950/40 to-amber-900/20 border border-amber-800/50 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-2xl">💶</span>
            <h3 className="font-semibold text-amber-300">Estimated Carbon Credit Value</h3>
          </div>
          <div className="text-4xl font-bold text-amber-400 mb-2">
            {impact.carbonValue.toLocaleString('sv-SE')} EUR
          </div>
          <div className="text-sm text-gray-300">
            årligt värde vid €{CARBON_CREDIT_VALUE}/ton CO<sub>2</sub> (aktuell marknadspris)
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-black/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{(impact.carbonValue * 5).toLocaleString('sv-SE')}</div>
              <div className="text-xs text-gray-400">5-årigt värde</div>
            </div>
            <div className="bg-black/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{(impact.carbonValue * 10).toLocaleString('sv-SE')}</div>
              <div className="text-xs text-gray-400">10-årigt värde</div>
            </div>
            <div className="bg-black/30 rounded p-3 text-center">
              <div className="text-2xl font-bold text-amber-400">{(impact.carbonValue * 20).toLocaleString('sv-SE')}</div>
              <div className="text-xs text-gray-400">20-årigt värde</div>
            </div>
          </div>
        </div>
      </div>

      {/* Impact Breakdown */}
      <div className="mb-8 p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
        <h3 className="font-semibold text-gray-300 mb-4">Din miljöpåverkan</h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">CO2-sekvesteringskapacitet</span>
              <span className="font-semibold text-emerald-400">{impact.co2PerYear.toLocaleString('sv-SE')} ton/år</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2 rounded-full"
                style={{ width: `${Math.min(100, (impact.co2PerYear / 500) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">Bilsutsläpp motsvarig</span>
              <span className="font-semibold text-blue-400">{impact.carEquivalent} bilar</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full"
                style={{ width: `${Math.min(100, (impact.carEquivalent / 100) * 100)}%` }}
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-300">Möjligt årligt intäkter (krediter)</span>
              <span className="font-semibold text-amber-400">{impact.carbonValue.toLocaleString('sv-SE')} EUR</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-amber-500 to-amber-400 h-2 rounded-full"
                style={{ width: `${Math.min(100, (impact.carbonValue / 5000) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gradient-to-r from-emerald-950/50 to-emerald-900/30 border border-emerald-800/50 rounded-lg p-6 text-center">
        <h3 className="text-lg font-bold text-emerald-300 mb-2">Starta övervakningen av din skog idag</h3>
        <p className="text-sm text-gray-300 mb-4">
          BeetleSense ger dig realtidsövervakning, försäljningsallerter och automatisk rapportering för kolkrediter.
        </p>
        <Link
          to="/signup"
          className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition"
        >
          Kom igång nu
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Data Attribution */}
      <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700/50 rounded text-xs text-gray-500">
        <p>
          Beräkningarna baseras på Scandinavian Forest Growth och EU-standard för kolsekvesteringsprognoser.
          Värdena är illustrativa och kan variera beroende på skogstyp, ålder och lokalfaktorer.
        </p>
      </div>
    </div>
  );
};

export default CarbonCalculator;

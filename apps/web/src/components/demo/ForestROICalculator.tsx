import React, { useState, useMemo } from 'react';
import { Leaf, BarChart3, Download, TrendingUp } from 'lucide-react';

interface ROICalculation {
  forestArea: number;
  currentMethod: 'manual' | 'drone' | 'satellite';
  beetleDamageRate: number;
  timberValuePerHa: number;
  damageCostWithout: number;
  damageCostWith: number;
  costSavings: number;
  beetlesenseCostPerYear: number;
  roi1Year: number;
  roi3Year: number;
  roi5Year: number;
  carbonValuePreserved: number;
  traditionalCostPerYear: number;
}

const ForestROICalculator: React.FC = () => {
  const [forestArea, setForestArea] = useState<number>(500);
  const [currentMethod, setCurrentMethod] = useState<'manual' | 'drone' | 'satellite'>('manual');
  const [beetleDamageRate, setBeetleDamageRate] = useState<number>(3.5);
  const [timberValue, setTimberValue] = useState<number>(2500);

  // Constants
  const BEETLESENSE_COST_PER_HA_PER_YEAR = 45; // SEK per hectare per year
  const EARLY_DETECTION_BENEFIT = 0.5; // 50% damage reduction
  const _DAMAGE_REDUCTION_RANGE = { min: 0.4, max: 0.6 }; // 40-60% range
  const CO2_PER_HA_PER_YEAR = 2.86; // tonnes
  const CARBON_CREDIT_VALUE = 25; // EUR per tonne, ~275 SEK
  const SEK_PER_EUR = 11;

  const methodCosts: Record<'manual' | 'drone' | 'satellite', number> = {
    manual: 800,
    drone: 350,
    satellite: 200,
  };

  const calculation = useMemo<ROICalculation>(() => {
    const totalArea = forestArea;
    const methodCost = methodCosts[currentMethod];
    const traditionalCostPerYear = (totalArea / 100) * methodCost; // Cost per 100 hectares

    // Damage calculation
    const totalTimberValue = totalArea * timberValue;
    const damageLossRate = beetleDamageRate / 100;
    const damageCostWithout = totalTimberValue * damageLossRate; // Without BeetleSense
    const damageCostWith = damageCostWithout * (1 - EARLY_DETECTION_BENEFIT); // With 50% reduction

    // Cost savings from reduced damage
    const costSavings = damageCostWithout - damageCostWith;

    // BeetleSense implementation cost
    const beetlesenseCostPerYear = totalArea * BEETLESENSE_COST_PER_HA_PER_YEAR;

    // Net savings
    const netSavings1Year = costSavings - beetlesenseCostPerYear;
    const netSavings3Year = (costSavings * 3) - (beetlesenseCostPerYear * 3) + (traditionalCostPerYear * 3);
    const netSavings5Year = (costSavings * 5) - (beetlesenseCostPerYear * 5) + (traditionalCostPerYear * 5);

    // ROI calculation
    const roi1Year = netSavings1Year > 0 ? ((netSavings1Year - beetlesenseCostPerYear) / beetlesenseCostPerYear) * 100 : 0;
    const roi3Year = netSavings3Year > 0 ? ((netSavings3Year - (beetlesenseCostPerYear * 3)) / (beetlesenseCostPerYear * 3)) * 100 : 0;
    const roi5Year = netSavings5Year > 0 ? ((netSavings5Year - (beetlesenseCostPerYear * 5)) / (beetlesenseCostPerYear * 5)) * 100 : 0;

    // Carbon value preserved (avoided timber loss preserves CO2 sequestration)
    const co2Sequestered = totalArea * CO2_PER_HA_PER_YEAR;
    const co2PreservedFromDamagePrevention = (damageCostWithout / totalTimberValue) * co2Sequestered * (EARLY_DETECTION_BENEFIT / damageLossRate);
    const carbonValuePreserved = co2PreservedFromDamagePrevention * CARBON_CREDIT_VALUE * SEK_PER_EUR;

    return {
      forestArea: totalArea,
      currentMethod,
      beetleDamageRate,
      timberValuePerHa: timberValue,
      damageCostWithout: Math.round(damageCostWithout),
      damageCostWith: Math.round(damageCostWith),
      costSavings: Math.round(costSavings),
      beetlesenseCostPerYear: Math.round(beetlesenseCostPerYear),
      roi1Year: Math.max(0, roi1Year),
      roi3Year: Math.max(0, roi3Year),
      roi5Year: Math.max(0, roi5Year),
      carbonValuePreserved: Math.round(carbonValuePreserved),
      traditionalCostPerYear: Math.round(traditionalCostPerYear),
    };
  }, [forestArea, currentMethod, beetleDamageRate, timberValue]);

  const handleForestAreaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 10 && value <= 50000) {
      setForestArea(value);
    }
  };

  const handleForestAreaSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForestArea(parseInt(e.target.value, 10));
  };

  const handleBeetleDamageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0.1 && value <= 20) {
      setBeetleDamageRate(value);
    }
  };

  const handleTimberValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 500 && value <= 10000) {
      setTimberValue(value);
    }
  };

  const downloadReport = () => {
    const reportContent = `
FOREST ROI & INVESTMENT CALCULATOR REPORT
===========================================
Generated: ${new Date().toLocaleDateString('sv-SE')}

INPUTS
------
Forest Area: ${calculation.forestArea.toLocaleString('sv-SE')} hectares
Current Monitoring Method: ${calculation.currentMethod.toUpperCase()}
Annual Beetle Damage Rate: ${calculation.beetleDamageRate}%
Timber Value per Hectare: ${calculation.timberValuePerHa.toLocaleString('sv-SE')} SEK

KEY METRICS
-----------
Annual Damage Cost (Without BeetleSense): ${calculation.damageCostWithout.toLocaleString('sv-SE')} SEK
Annual Damage Cost (With BeetleSense): ${calculation.damageCostWith.toLocaleString('sv-SE')} SEK
Annual Cost Savings from Early Detection: ${calculation.costSavings.toLocaleString('sv-SE')} SEK
BeetleSense Annual Implementation Cost: ${calculation.beetlesenseCostPerYear.toLocaleString('sv-SE')} SEK
Traditional Monitoring Annual Cost: ${calculation.traditionalCostPerYear.toLocaleString('sv-SE')} SEK

RETURN ON INVESTMENT
--------------------
1-Year ROI: ${calculation.roi1Year.toFixed(1)}%
3-Year ROI: ${calculation.roi3Year.toFixed(1)}%
5-Year ROI: ${calculation.roi5Year.toFixed(1)}%

ENVIRONMENTAL VALUE
-------------------
Carbon Value Preserved: ${calculation.carbonValuePreserved.toLocaleString('sv-SE')} SEK

RECOMMENDATION
--------------
This analysis demonstrates significant economic value from AI-powered forest monitoring.
BeetleSense enables early beetle detection, reducing timber loss by 40-60% while
simultaneously preserving carbon sequestration value.

Funded by EU FORWARDS Programme & ROB4GREEN Initiative
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(reportContent));
    element.setAttribute('download', `ForestROI_Report_${new Date().toISOString().split('T')[0]}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="border border-gray-800 rounded-lg p-6 bg-gray-900 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-400" />
          <h2 className="text-xl font-semibold">Forest ROI & Investment Calculator</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-emerald-900/50 border border-emerald-700/30 text-emerald-300 text-xs font-medium">
          Funded by EU FORWARDS
        </div>
      </div>

      <p className="text-sm text-gray-400 mb-8">
        Calculate the economic value and return on investment for AI-powered forest monitoring with BeetleSense
      </p>

      {/* Input Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Left Column - Basic Inputs */}
        <div className="space-y-6">
          {/* Forest Area */}
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
            <label className="block text-sm font-semibold text-gray-300 mb-4">
              Forest Area (hectares)
            </label>
            <div className="mb-4">
              <input
                type="range"
                min="10"
                max="50000"
                value={forestArea}
                onChange={handleForestAreaSlider}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>10 ha</span>
                <span>50,000 ha</span>
              </div>
            </div>
            <input
              type="number"
              min="10"
              max="50000"
              value={forestArea}
              onChange={handleForestAreaChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Monitoring Method */}
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
            <label className="block text-sm font-semibold text-gray-300 mb-4">
              Current Monitoring Method
            </label>
            <div className="space-y-2">
              {(['manual', 'drone', 'satellite'] as const).map(method => (
                <label key={method} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="method"
                    value={method}
                    checked={currentMethod === method}
                    onChange={(e) => setCurrentMethod(e.target.value as 'manual' | 'drone' | 'satellite')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm capitalize text-gray-300">
                    {method === 'manual' ? 'Manual Inspections' : method === 'drone' ? 'Drone Surveys' : 'Satellite Data'}
                  </span>
                  <span className="text-xs text-gray-500">
                    (~{methodCosts[method].toLocaleString('sv-SE')} SEK/100ha)
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Advanced Inputs */}
        <div className="space-y-6">
          {/* Beetle Damage Rate */}
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
            <label className="block text-sm font-semibold text-gray-300 mb-4">
              Annual Beetle Damage Rate (%)
            </label>
            <div className="flex items-center gap-3 mb-2">
              <input
                type="range"
                min="0.1"
                max="20"
                step="0.1"
                value={beetleDamageRate}
                onChange={handleBeetleDamageChange}
                className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="px-4 py-2 bg-orange-500/20 border border-orange-500/50 rounded text-orange-300 font-semibold min-w-20 text-center">
                {beetleDamageRate.toFixed(1)}%
              </div>
            </div>
            <div className="text-xs text-gray-500">0.1% to 20% typical range</div>
          </div>

          {/* Timber Value per Hectare */}
          <div className="p-6 bg-gray-800/50 border border-gray-700 rounded-lg">
            <label className="block text-sm font-semibold text-gray-300 mb-4">
              Timber Value per Hectare (SEK)
            </label>
            <input
              type="number"
              min="500"
              max="10000"
              value={timberValue}
              onChange={handleTimberValueChange}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 mb-2"
            />
            <div className="text-xs text-gray-500">Typical Scandinavian forest: 1,500 - 3,500 SEK/ha</div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      <div className="space-y-6">
        {/* Cost Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-950/30 border border-red-800/50 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Annual Damage (Without)</div>
            <div className="text-2xl font-bold text-red-400">
              {(calculation.damageCostWithout / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-gray-500 mt-1">SEK/year</div>
          </div>
          <div className="bg-orange-950/30 border border-orange-800/50 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Annual Damage (With)</div>
            <div className="text-2xl font-bold text-orange-400">
              {(calculation.damageCostWith / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-gray-500 mt-1">SEK/year</div>
          </div>
          <div className="bg-emerald-950/30 border border-emerald-800/50 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-1">Annual Savings</div>
            <div className="text-2xl font-bold text-emerald-400">
              {(calculation.costSavings / 1000000).toFixed(1)}M
            </div>
            <div className="text-xs text-gray-500 mt-1">SEK/year</div>
          </div>
        </div>

        {/* ROI Comparison Chart */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-6 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            Return on Investment Over Time
          </h3>

          <div className="space-y-4">
            {[
              { label: '1-Year ROI', value: calculation.roi1Year, period: '1 year' },
              { label: '3-Year ROI', value: calculation.roi3Year, period: '3 years' },
              { label: '5-Year ROI', value: calculation.roi5Year, period: '5 years' },
            ].map(item => (
              <div key={item.label}>
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm text-gray-400">{item.label}</span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-emerald-400">{item.value.toFixed(0)}%</span>
                    <span className="text-xs text-gray-500">over {item.period}</span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded h-2.5">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-2.5 rounded"
                    style={{ width: `${Math.min(100, (item.value / 100) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cost Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-2">BeetleSense Annual Cost</div>
            <div className="text-xl font-bold text-white">
              {(calculation.beetlesenseCostPerYear / 1000).toFixed(0)}K SEK
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(calculation.beetlesenseCostPerYear / calculation.forestArea).toFixed(0)} SEK/ha/year
            </div>
          </div>
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
            <div className="text-xs text-gray-400 mb-2">Traditional Monitoring Annual Cost</div>
            <div className="text-xl font-bold text-white">
              {(calculation.traditionalCostPerYear / 1000).toFixed(0)}K SEK
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {calculation.currentMethod.charAt(0).toUpperCase() + calculation.currentMethod.slice(1)} method
            </div>
          </div>
        </div>

        {/* Environmental Impact */}
        <div className="bg-gradient-to-br from-teal-950/40 to-emerald-950/40 border border-emerald-800/50 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <Leaf className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-gray-300 mb-2">Carbon Preservation Value</h4>
              <div className="text-2xl font-bold text-emerald-400 mb-1">
                {(calculation.carbonValuePreserved / 1000000).toFixed(1)}M SEK
              </div>
              <p className="text-xs text-gray-400">
                Economic value of CO2 sequestration preserved through reduced timber loss
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <div className="mt-8 flex justify-center">
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
        >
          <Download className="w-4 h-4" />
          Download ROI Report
        </button>
      </div>

      {/* Footer Message */}
      <div className="mt-6 p-4 bg-emerald-900/20 border border-emerald-800/30 rounded-lg text-center">
        <p className="text-xs text-emerald-300">
          Funded by EU FORWARDS Programme & ROB4GREEN Initiative • AI-powered sustainable forest monitoring
        </p>
      </div>
    </div>
  );
};

export default ForestROICalculator;

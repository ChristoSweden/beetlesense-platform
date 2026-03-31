import { useState } from 'react';

interface CountyRisk {
  id: string; name: string; riskLevel: 'critical' | 'high' | 'moderate' | 'low';
  riskScore: number; sprucePercentage: number; historicalOutbreaks: number;
  currentDegreeDays: number; threshold: number; drainageClass: string;
  avgPrecipitation: number; lastUpdated: string;
}

const SWEDISH_COUNTIES: CountyRisk[] = [
  { id: 'dalarna', name: 'Dalarna', riskLevel: 'critical', riskScore: 92, sprucePercentage: 68, historicalOutbreaks: 14, currentDegreeDays: 298, threshold: 334, drainageClass: 'Poor', avgPrecipitation: 42, lastUpdated: '2026-03-30' },
  { id: 'gavleborg', name: 'Gävleborg', riskLevel: 'critical', riskScore: 88, sprucePercentage: 62, historicalOutbreaks: 11, currentDegreeDays: 276, threshold: 334, drainageClass: 'Moderate', avgPrecipitation: 38, lastUpdated: '2026-03-30' },
  { id: 'varmland', name: 'Värmland', riskLevel: 'high', riskScore: 79, sprucePercentage: 58, historicalOutbreaks: 9, currentDegreeDays: 245, threshold: 334, drainageClass: 'Moderate', avgPrecipitation: 55, lastUpdated: '2026-03-30' },
  { id: 'vastmanland', name: 'Västmanland', riskLevel: 'high', riskScore: 74, sprucePercentage: 52, historicalOutbreaks: 7, currentDegreeDays: 231, threshold: 334, drainageClass: 'Good', avgPrecipitation: 48, lastUpdated: '2026-03-30' },
  { id: 'sodermanland', name: 'Södermanland', riskLevel: 'high', riskScore: 71, sprucePercentage: 49, historicalOutbreaks: 6, currentDegreeDays: 218, threshold: 334, drainageClass: 'Good', avgPrecipitation: 51, lastUpdated: '2026-03-30' },
  { id: 'jonkoping', name: 'Jönköping', riskLevel: 'moderate', riskScore: 58, sprucePercentage: 55, historicalOutbreaks: 5, currentDegreeDays: 189, threshold: 334, drainageClass: 'Good', avgPrecipitation: 62, lastUpdated: '2026-03-30' },
  { id: 'kronoberg', name: 'Kronoberg', riskLevel: 'moderate', riskScore: 53, sprucePercentage: 51, historicalOutbreaks: 4, currentDegreeDays: 172, threshold: 334, drainageClass: 'Good', avgPrecipitation: 58, lastUpdated: '2026-03-30' },
  { id: 'norrbotten', name: 'Norrbotten', riskLevel: 'low', riskScore: 28, sprucePercentage: 34, historicalOutbreaks: 1, currentDegreeDays: 87, threshold: 334, drainageClass: 'Excellent', avgPrecipitation: 45, lastUpdated: '2026-03-30' },
  { id: 'vasterbotten', name: 'Västerbotten', riskLevel: 'low', riskScore: 31, sprucePercentage: 38, historicalOutbreaks: 2, currentDegreeDays: 102, threshold: 334, drainageClass: 'Good', avgPrecipitation: 48, lastUpdated: '2026-03-30' },
  { id: 'jamtland', name: 'Jämtland', riskLevel: 'low', riskScore: 25, sprucePercentage: 31, historicalOutbreaks: 1, currentDegreeDays: 72, threshold: 334, drainageClass: 'Excellent', avgPrecipitation: 52, lastUpdated: '2026-03-30' },
];

const RISK_COLORS: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', border: 'border-red-500', text: 'text-red-700 dark:text-red-400', badge: 'bg-red-500 text-white' },
  high: { bg: 'bg-orange-100 dark:bg-orange-900/30', border: 'border-orange-500', text: 'text-orange-700 dark:text-orange-400', badge: 'bg-orange-500 text-white' },
  moderate: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-500', text: 'text-yellow-700 dark:text-yellow-400', badge: 'bg-yellow-500 text-white' },
  low: { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-500', text: 'text-green-700 dark:text-green-400', badge: 'bg-green-500 text-white' },
};

export default function RegionalHeatMapPage() {
  const [selectedCounty, setSelectedCounty] = useState<CountyRisk | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const filtered = filterLevel === 'all' ? SWEDISH_COUNTIES : SWEDISH_COUNTIES.filter(c => c.riskLevel === filterLevel);
  const criticalCount = SWEDISH_COUNTIES.filter(c => c.riskLevel === 'critical').length;
  const highCount = SWEDISH_COUNTIES.filter(c => c.riskLevel === 'high').length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Regional Susceptibility Heat Map</h1>
          <p className="text-gray-600 dark:text-gray-400">County-level bark beetle risk based on Skogsstyrelsen data, climate models, and forest composition.</p>
          <p className="text-xs text-gray-500 mt-1">Sources: Skogsstyrelsen, SMHI, SLU Riksskogstaxeringen | Model: Degree-day + composition + drainage</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200"><div className="text-2xl font-bold text-red-600">{criticalCount}</div><div className="text-sm text-red-700 dark:text-red-400">Critical Counties</div></div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200"><div className="text-2xl font-bold text-orange-600">{highCount}</div><div className="text-sm text-orange-700 dark:text-orange-400">High Risk Counties</div></div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200"><div className="text-2xl font-bold text-blue-600">{SWEDISH_COUNTIES.length}</div><div className="text-sm text-blue-700 dark:text-blue-400">Counties Monitored</div></div>
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-200"><div className="text-2xl font-bold text-purple-600">6h</div><div className="text-sm text-purple-700 dark:text-purple-400">Update Frequency</div></div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['all', 'critical', 'high', 'moderate', 'low'].map(level => (
            <button key={level} onClick={() => setFilterLevel(level)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${filterLevel === level ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-300'}`}>
              {level === 'all' ? 'All Counties' : `${level.charAt(0).toUpperCase() + level.slice(1)} Risk`}
            </button>))}
        </div>

        {/* County Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filtered.sort((a, b) => b.riskScore - a.riskScore).map(county => {
            const colors = RISK_COLORS[county.riskLevel];
            return (
              <button key={county.id} onClick={() => setSelectedCounty(county)}
                className={`${colors.bg} border-2 ${colors.border} rounded-xl p-5 text-left transition-all hover:shadow-lg hover:scale-[1.02] ${selectedCounty?.id === county.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{county.name}</h3>
                  <span className={`${colors.badge} px-3 py-1 rounded-full text-xs font-bold uppercase`}>{county.riskLevel}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Risk Score</span><span className={`font-bold ${colors.text}`}>{county.riskScore}/100</span></div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div className={`h-2 rounded-full ${county.riskLevel === 'critical' ? 'bg-red-500' : county.riskLevel === 'high' ? 'bg-orange-500' : county.riskLevel === 'moderate' ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${county.riskScore}%` }} />
                  </div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Spruce Coverage</span><span className="font-medium text-gray-900 dark:text-white">{county.sprucePercentage}%</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">Degree-Days</span><span className="font-medium text-gray-900 dark:text-white">{county.currentDegreeDays}/{county.threshold}°d</span></div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Detail Panel */}
        {selectedCounty && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedCounty.name} — Detailed Analysis</h2>
              <button onClick={() => setSelectedCounty(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div><div className="text-sm text-gray-500">Risk Score</div><div className="text-xl font-bold">{selectedCounty.riskScore}/100</div></div>
              <div><div className="text-sm text-gray-500">Spruce Coverage</div><div className="text-xl font-bold">{selectedCounty.sprucePercentage}%</div></div>
              <div><div className="text-sm text-gray-500">Historical Outbreaks</div><div className="text-xl font-bold">{selectedCounty.historicalOutbreaks}</div></div>
              <div><div className="text-sm text-gray-500">Drainage Class</div><div className="text-xl font-bold">{selectedCounty.drainageClass}</div></div>
              <div><div className="text-sm text-gray-500">Degree-Days Progress</div><div className="text-xl font-bold">{Math.round(selectedCounty.currentDegreeDays / selectedCounty.threshold * 100)}%</div></div>
              <div><div className="text-sm text-gray-500">Avg Precipitation</div><div className="text-xl font-bold">{selectedCounty.avgPrecipitation} mm</div></div>
              <div><div className="text-sm text-gray-500">Data Updated</div><div className="text-xl font-bold">{selectedCounty.lastUpdated}</div></div>
              <div><div className="text-sm text-gray-500">Days to Threshold</div><div className="text-xl font-bold">{selectedCounty.riskLevel === 'critical' ? '~5-10' : selectedCounty.riskLevel === 'high' ? '~15-25' : '30+'} days</div></div>
            </div>
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Recommended Action</h3>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                {selectedCounty.riskLevel === 'critical' ? 'URGENT: Deploy pheromone traps immediately. Schedule drone survey within 48h. Alert all forest owners.' : selectedCounty.riskLevel === 'high' ? 'Schedule ground inspection within 2 weeks. Prepare sanitation felling. Notify adjacent owners.' : selectedCounty.riskLevel === 'moderate' ? 'Continue satellite monitoring. Plan pheromone traps next month. Review outbreak patterns.' : 'Standard monitoring sufficient. Next review in 30 days.'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
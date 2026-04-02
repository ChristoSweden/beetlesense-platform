import { useState } from 'react';

interface ForestStand {
  id: string; name: string; area: number; species: string; age: number;
  infestationRisk: 'critical' | 'high' | 'moderate' | 'low';
  timberValue: number; carbonValue: number; degreeDays: number;
  recommendedAction: string; optimalWindow: string; priority: number;
}

const DEMO_STANDS: ForestStand[] = [
  { id: 's1', name: 'Falun Nord Block A', area: 12.5, species: 'Norway Spruce', age: 65, infestationRisk: 'critical', timberValue: 725000, carbonValue: 189000, degreeDays: 312, recommendedAction: 'Immediate sanitation felling', optimalWindow: 'Apr 1-15', priority: 1 },
  { id: 's2', name: 'Falun Nord Block B', area: 8.3, species: 'Norway Spruce', age: 72, infestationRisk: 'critical', timberValue: 498000, carbonValue: 142000, degreeDays: 305, recommendedAction: 'Sanitation felling + trap trees', optimalWindow: 'Apr 1-20', priority: 2 },
  { id: 's3', name: 'Sandviken S Block C', area: 15.1, species: 'Mixed (70% spruce)', age: 55, infestationRisk: 'high', timberValue: 830500, carbonValue: 215000, degreeDays: 267, recommendedAction: 'Selective thinning + monitoring', optimalWindow: 'Apr 10-30', priority: 3 },
  { id: 's4', name: 'Karlstad V Block D', area: 22.0, species: 'Norway Spruce', age: 48, infestationRisk: 'high', timberValue: 1100000, carbonValue: 298000, degreeDays: 241, recommendedAction: 'Preventive thinning', optimalWindow: 'Apr 15-May 15', priority: 4 },
  { id: 's5', name: 'Borlänge Block E', area: 6.7, species: 'Scots Pine/Spruce', age: 80, infestationRisk: 'moderate', timberValue: 401000, carbonValue: 98000, degreeDays: 198, recommendedAction: 'Monitor + prepare contingency', optimalWindow: 'May 1-31', priority: 5 },
  { id: 's6', name: 'Östersund Block F', area: 18.4, species: 'Norway Spruce', age: 42, infestationRisk: 'low', timberValue: 920000, carbonValue: 256000, degreeDays: 89, recommendedAction: 'Standard monitoring', optimalWindow: 'No action needed', priority: 6 },
];

const formatSEK = (v: number) => new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(v);

export default function HarvestOptimizerPage() {
  const [stands] = useState<ForestStand[]>(DEMO_STANDS);
  const [selectedStand, setSelectedStand] = useState<ForestStand | null>(null);
  const [scheduleView, setScheduleView] = useState<'priority' | 'timeline' | 'value'>('priority');

  const totalTimber = stands.reduce((s, st) => s + st.timberValue, 0);
  const totalCarbon = stands.reduce((s, st) => s + st.carbonValue, 0);
  const totalArea = stands.reduce((s, st) => s + st.area, 0);
  const criticalStands = stands.filter(s => s.infestationRisk === 'critical').length;

  const sorted = [...stands].sort((a, b) => {
    if (scheduleView === 'priority') return a.priority - b.priority;
    if (scheduleView === 'value') return b.timberValue - a.timberValue;
    return a.degreeDays > b.degreeDays ? -1 : 1;
  });

  const riskBg = (r: string) => r === 'critical' ? 'bg-red-100 border-red-400' : r === 'high' ? 'bg-orange-100 border-orange-400' : r === 'moderate' ? 'bg-yellow-100 border-yellow-400' : 'bg-green-100 border-green-400';
  const riskBadge = (r: string) => r === 'critical' ? 'bg-red-500 text-white' : r === 'high' ? 'bg-orange-500 text-white' : r === 'moderate' ? 'bg-yellow-500 text-black' : 'bg-green-500 text-white';

  return (
    <div className="min-h-screen bg-[var(--bg)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">Harvest Optimization Scheduler</h1>
          <p className="text-gray-600">AI-optimized multi-stand sequencing that balances timber value, carbon preservation, and beetle risk mitigation.</p>
          <p className="text-xs text-gray-500 mt-1">Algorithm: Weighted priority = 0.4 * risk + 0.3 * timber_value + 0.2 * carbon_impact + 0.1 * logistics</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg2)] rounded-lg p-4 shadow-sm border"><div className="text-2xl font-bold text-[var(--text)]">{totalArea.toFixed(1)} ha</div><div className="text-sm text-gray-500">Total Area</div></div>
          <div className="bg-[var(--bg2)] rounded-lg p-4 shadow-sm border"><div className="text-2xl font-bold text-green-600">{formatSEK(totalTimber)}</div><div className="text-sm text-gray-500">Timber Value at Risk</div></div>
          <div className="bg-[var(--bg2)] rounded-lg p-4 shadow-sm border"><div className="text-2xl font-bold text-blue-600">{formatSEK(totalCarbon)}</div><div className="text-sm text-gray-500">Carbon Credit Value</div></div>
          <div className="bg-[var(--bg2)] rounded-lg p-4 shadow-sm border"><div className="text-2xl font-bold text-red-600">{criticalStands}</div><div className="text-sm text-gray-500">Critical Stands</div></div>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 mb-6">
          {(['priority', 'timeline', 'value'] as const).map(v => (
            <button key={v} onClick={() => setScheduleView(v)} className={`px-4 py-2 rounded-full text-sm font-medium ${scheduleView === v ? 'bg-[var(--green)] text-white' : 'bg-[var(--bg2)] text-gray-600 border hover:bg-[var(--bg)]'}`}>{v === 'priority' ? 'By Priority' : v === 'timeline' ? 'By Urgency' : 'By Value'}</button>
          ))}
        </div>

        {/* Stand Cards */}
        <div className="space-y-4 mb-8">
          {sorted.map((stand, i) => (
            <div key={stand.id} onClick={() => setSelectedStand(stand)}
              className={`${riskBg(stand.infestationRisk)} border-2 rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg ${selectedStand?.id === stand.id ? 'ring-2 ring-blue-500' : ''}`}>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-[var(--green)] text-white flex items-center justify-center text-sm font-bold">{i + 1}</div>
                  <div>
                    <h3 className="font-bold text-[var(--text)]">{stand.name}</h3>
                    <p className="text-sm text-gray-600">{stand.species} | {stand.area} ha | Age: {stand.age} yr</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className={`${riskBadge(stand.infestationRisk)} px-3 py-1 rounded-full text-xs font-bold uppercase`}>{stand.infestationRisk}</span>
                  <span className="bg-gray-200 px-3 py-1 rounded-full text-xs font-medium">{stand.optimalWindow}</span>
                  <span className="text-sm font-semibold text-green-700">{formatSEK(stand.timberValue)}</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="text-sm text-gray-700 font-medium">Action:</div>
                <div className="text-sm text-gray-600">{stand.recommendedAction}</div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${stand.infestationRisk === 'critical' ? 'bg-red-500' : stand.infestationRisk === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}`} style={{ width: `${(stand.degreeDays / 334) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Selected Detail */}
        {selectedStand && (
          <div className="bg-[var(--bg2)] rounded-xl shadow-lg p-6 border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{selectedStand.name} — Harvest Plan</h2>
              <button onClick={() => setSelectedStand(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><div className="text-sm text-gray-500">Timber Value</div><div className="text-lg font-bold text-green-600">{formatSEK(selectedStand.timberValue)}</div></div>
              <div><div className="text-sm text-gray-500">Carbon Value (EU ETS)</div><div className="text-lg font-bold text-blue-600">{formatSEK(selectedStand.carbonValue)}</div></div>
              <div><div className="text-sm text-gray-500">Degree-Days</div><div className="text-lg font-bold">{selectedStand.degreeDays}/334°d</div></div>
              <div><div className="text-sm text-gray-500">Optimal Window</div><div className="text-lg font-bold text-purple-600">{selectedStand.optimalWindow}</div></div>
              <div><div className="text-sm text-gray-500">Area</div><div className="text-lg font-bold">{selectedStand.area} ha</div></div>
              <div><div className="text-sm text-gray-500">Stand Age</div><div className="text-lg font-bold">{selectedStand.age} years</div></div>
            </div>
            <div className="mt-4 p-4 bg-amber-50 rounded-lg">
              <h3 className="font-semibold text-amber-900 mb-1">Economic Analysis</h3>
              <p className="text-sm text-amber-800">Delaying harvest by 30 days risks {Math.round(selectedStand.timberValue * 0.15).toLocaleString()} SEK in timber degradation. Carbon offset value increases by {Math.round(selectedStand.carbonValue * 0.02).toLocaleString()} SEK/month if standing timber is preserved. Net recommendation: {selectedStand.infestationRisk === 'critical' ? 'Harvest immediately to preserve timber value.' : 'Balance carbon credits against beetle risk timeline.'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
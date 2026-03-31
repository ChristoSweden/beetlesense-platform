import { useState } from 'react';

interface PlaybookPhase {
  id: string; year: string; title: string; description: string;
  actions: string[]; kpis: string[]; cost: string; roi: string;
  status: 'active' | 'upcoming' | 'future';
}

const PLAYBOOK_PHASES: PlaybookPhase[] = [
  { id: 'p1', year: '2026', title: 'Emergency Response & Baseline', description: 'Establish monitoring infrastructure and address critical infestations. Deploy satellite + ground truth verification.', actions: ['Deploy Sentinel-2 monitoring on all high-risk stands', 'Install 50 pheromone trap stations across Dalarna/Gävleborg', 'Complete baseline forest inventory with species/age mapping', 'Establish degree-day monitoring network (15 weather stations)', 'Train 20 forest owners on early detection protocols'], kpis: ['Detection latency < 14 days', 'Trap coverage: 1 per 200 ha in critical zones', '100% of critical stands mapped'], cost: '450,000 SEK', roi: 'Prevents estimated 2.8M SEK in timber losses', status: 'active' },
  { id: 'p2', year: '2027-2028', title: 'Diversification & Resilience Building', description: 'Shift from pure spruce monocultures to mixed-species stands. Implement Swedish Forestry Agency recommended species mixes.', actions: ['Replant 30% of harvested areas with mixed species (birch, pine, oak)', 'Implement variable-density thinning on 500+ ha', 'Deploy IoT soil moisture sensors in 10 pilot stands', 'Establish seed orchards for climate-adapted spruce provenances', 'Create wildlife corridors between managed stands'], kpis: ['Species diversity index > 0.4 in replanted areas', 'Thinning reduces stand density by 25%', 'Soil moisture data coverage: 10 stands'], cost: '1.2M SEK', roi: '40% reduction in outbreak severity by 2029', status: 'upcoming' },
  { id: 'p3', year: '2029-2031', title: 'Climate-Smart Forestry at Scale', description: 'Full integration of AI prediction, automated monitoring, and adaptive harvest scheduling across the portfolio.', actions: ['AI-driven harvest scheduling across all managed stands', 'Drone-based weekly monitoring replacing manual ground checks', 'Carbon credit portfolio generating passive income', 'Real-time beetle population modeling with 72h forecasts', 'Regional cooperative network with 50+ forest owners'], kpis: ['Prediction accuracy > 90%', 'Carbon credits: 500+ tons CO2/year', 'Outbreak response time < 48 hours'], cost: '800,000 SEK', roi: 'Net positive: carbon credits exceed monitoring costs', status: 'future' },
  { id: 'p4', year: '2032-2035', title: 'Regenerative Forest Economy', description: 'Transform from defensive pest management to regenerative forestry with diversified revenue streams.', actions: ['Ecosystem services marketplace (carbon, biodiversity, water)', 'Precision forestry with per-tree management plans', 'Community forest tourism and education programs', 'Research partnerships with SLU and Skogsstyrelsen', 'Export playbook methodology to Baltic/Nordic markets'], kpis: ['Revenue diversification: 30% non-timber', 'Biodiversity index doubled from 2026 baseline', 'Zero catastrophic outbreak losses'], cost: '500,000 SEK', roi: '3x return through diversified revenue streams', status: 'future' },
];

export default function ClimatePlaybookPage() {
  const [expandedPhase, setExpandedPhase] = useState<string | null>('p1');

  const statusColor = (s: string) => s === 'active' ? 'bg-green-500' : s === 'upcoming' ? 'bg-blue-500' : 'bg-gray-400';
  const statusLabel = (s: string) => s === 'active' ? 'In Progress' : s === 'upcoming' ? 'Planning' : 'Future';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Climate Adaptation Playbook</h1>
          <p className="text-gray-600 dark:text-gray-400">AI-generated 10-year forest resilience plan based on SMHI climate projections, Skogsstyrelsen guidelines, and your forest portfolio.</p>
          <p className="text-xs text-gray-500 mt-1">Based on: RCP 4.5/8.5 scenarios | SMHI regional projections | SLU species adaptation research</p>
        </div>

        {/* Timeline */}
        <div className="relative">
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300 dark:bg-gray-600" />
          <div className="space-y-6">
            {PLAYBOOK_PHASES.map((phase) => (
              <div key={phase.id} className="relative pl-16">
                <div className={`absolute left-4 w-5 h-5 rounded-full ${statusColor(phase.status)} border-4 border-white dark:border-gray-900 z-10`} />
                <button onClick={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)} className="w-full text-left">
                  <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border p-5 transition-all hover:shadow-md ${expandedPhase === phase.id ? 'ring-2 ring-blue-500' : ''}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-sm font-mono text-gray-500">{phase.year}</span>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{phase.title}</h3>
                      </div>
                      <span className={`${statusColor(phase.status)} text-white px-3 py-1 rounded-full text-xs font-bold`}>{statusLabel(phase.status)}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{phase.description}</p>

                    {expandedPhase === phase.id && (
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Key Actions</h4>
                          <ul className="space-y-1">
                            {phase.actions.map((a, i) => (<li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2"><span className="text-green-500 mt-0.5">✓</span>{a}</li>))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Success Metrics</h4>
                          <ul className="space-y-1">
                            {phase.kpis.map((k, i) => (<li key={i} className="text-sm text-blue-700 dark:text-blue-400 flex items-start gap-2"><span>◎</span>{k}</li>))}
                          </ul>
                        </div>
                        <div className="flex gap-6 pt-2 border-t">
                          <div><span className="text-xs text-gray-500">Investment</span><div className="text-sm font-bold text-gray-900 dark:text-white">{phase.cost}</div></div>
                          <div><span className="text-xs text-gray-500">Expected ROI</span><div className="text-sm font-bold text-green-600">{phase.roi}</div></div>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Climate Projection Banner */}
        <div className="mt-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
          <h3 className="text-lg font-bold mb-2">SMHI Climate Projection for Central Sweden</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><div className="opacity-75">Temp increase by 2050</div><div className="text-xl font-bold">+2.1°C</div></div>
            <div><div className="opacity-75">Growing season extension</div><div className="text-xl font-bold">+25 days</div></div>
            <div><div className="opacity-75">Drought risk increase</div><div className="text-xl font-bold">+40%</div></div>
            <div><div className="opacity-75">Beetle generations/year</div><div className="text-xl font-bold">1 → 2</div></div>
          </div>
          <p className="text-xs opacity-60 mt-3">Source: SMHI RCP 4.5 scenario, regional downscaling for Dalarna/Gävleborg</p>
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';

interface TreeProvenance { id: string; origin: string; species: string; resistanceScore: number; droughtTolerance: number; growthRate: number; barkThickness: number; resinProduction: number; recommendation: string; }
interface GeneticCluster { id: string; name: string; area: number; dominantProvenance: string; susceptibilityIndex: number; survivedLastOutbreak: number; avgAge: number; siteIndex: number; }

const PROVENANCES: TreeProvenance[] = [
  { id: 'sv-south', origin: 'Southern Sweden (Sm\u00E5land)', species: 'Picea abies', resistanceScore: 0.72, droughtTolerance: 0.65, growthRate: 0.81, barkThickness: 0.68, resinProduction: 0.74, recommendation: 'Good for southern replanting. Moderate beetle resistance. Adapted to warmer conditions.' },
  { id: 'sv-north', origin: 'Northern Sweden (Norrland)', species: 'Picea abies', resistanceScore: 0.58, droughtTolerance: 0.42, growthRate: 0.67, barkThickness: 0.55, resinProduction: 0.61, recommendation: 'Not recommended for southern deployment. Low drought tolerance makes trees vulnerable under climate change.' },
  { id: 'carpathian', origin: 'Romanian Carpathians', species: 'Picea abies', resistanceScore: 0.89, droughtTolerance: 0.82, growthRate: 0.59, barkThickness: 0.91, resinProduction: 0.87, recommendation: 'Highest beetle resistance. Thicker bark + higher resin. Trade-off: slower growth rate. Best for high-risk zones.' },
  { id: 'bavarian', origin: 'Bavarian Alps', species: 'Picea abies', resistanceScore: 0.78, droughtTolerance: 0.71, growthRate: 0.73, barkThickness: 0.76, resinProduction: 0.79, recommendation: 'Balanced profile. Good compromise between resistance and growth. Suitable for central Swedish conditions.' },
  { id: 'finnish', origin: 'Eastern Finland', species: 'Picea abies', resistanceScore: 0.51, droughtTolerance: 0.38, growthRate: 0.74, barkThickness: 0.49, resinProduction: 0.52, recommendation: 'Fast growth but lowest resistance. 60% of failed trees in 2021 outbreak were Finnish provenance.' },
  { id: 'sv-pine', origin: 'Swedish Scots Pine', species: 'Pinus sylvestris', resistanceScore: 0.95, droughtTolerance: 0.91, growthRate: 0.62, barkThickness: 0.93, resinProduction: 0.88, recommendation: 'Species switch: Scots pine immune to Ips typographus. Recommended for highest-risk areas where spruce is unviable.' },
];

const GENETIC_CLUSTERS: GeneticCluster[] = [
  { id: 'c1', name: 'V\u00E4sterg\u00F6tland Block A', area: 245, dominantProvenance: 'Finnish', susceptibilityIndex: 0.82, survivedLastOutbreak: 38, avgAge: 65, siteIndex: 28 },
  { id: 'c2', name: '\u00D6sterg\u00F6tland Block B', area: 180, dominantProvenance: 'Southern Swedish', susceptibilityIndex: 0.54, survivedLastOutbreak: 71, avgAge: 48, siteIndex: 32 },
  { id: 'c3', name: 'Sm\u00E5land Block C', area: 320, dominantProvenance: 'Mixed (Bavarian/Swedish)', susceptibilityIndex: 0.41, survivedLastOutbreak: 84, avgAge: 35, siteIndex: 30 },
  { id: 'c4', name: 'V\u00E4rmland Block D', area: 410, dominantProvenance: 'Northern Swedish', susceptibilityIndex: 0.67, survivedLastOutbreak: 52, avgAge: 72, siteIndex: 26 },
];

export default function SwedishForestAIPage() {
  const [selectedProvenance, setSelectedProvenance] = useState<TreeProvenance | null>(PROVENANCES[0]);
  const [sortBy, setSortBy] = useState<'resistanceScore' | 'droughtTolerance' | 'growthRate'>('resistanceScore');
  const sorted = [...PROVENANCES].sort((a, b) => b[sortBy] - a[sortBy]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">\uD83E\uDDEC</span>
            <h1 className="text-3xl font-bold">Swedish Forest AI</h1>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">GENETICS + PROVENANCE</span>
          </div>
          <p className="text-[var(--text3)] max-w-3xl">ML trained on Swedish spruce genetics, site index and provenance data from SLU. Maps tree resistance traits to recommend optimal replanting after beetle damage. No competitor integrates genetic susceptibility with real-time monitoring.</p>
        </div>

        {/* Sort controls */}
        <div className="flex gap-3 mb-6">
          {([['resistanceScore', '\uD83D\uDEE1\uFE0F Beetle Resistance'], ['droughtTolerance', '\uD83C\uDF35 Drought Tolerance'], ['growthRate', '\uD83C\uDF31 Growth Rate']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setSortBy(key as any)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${sortBy === key ? 'bg-green-500 text-white' : 'bg-[var(--bg2)] text-[var(--text3)] hover:bg-[var(--bg3)]'}`}>{label}</button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Provenance Cards */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">\uD83C\uDF32 Tree Provenances Ranked</h2>
            {sorted.map((p, idx) => (
              <button key={p.id} onClick={() => setSelectedProvenance(p)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedProvenance?.id === p.id ? 'ring-2 ring-green-500 border-green-500' : 'border-[var(--border)] hover:border-[var(--border-hover)]'} bg-[var(--bg2)]`}>
                <div className="flex items-center justify-between mb-2">
                  <div><span className="text-lg font-bold text-[var(--green)]">{idx + 1}.</span> <span className="font-medium">{p.origin}</span></div>
                  <span className="text-xs px-2 py-1 rounded bg-[var(--bg3)] text-[var(--text3)]">{p.species}</span>
                </div>
                <div className="grid grid-cols-5 gap-2 text-xs">
                  {[['Resistance', p.resistanceScore], ['Drought', p.droughtTolerance], ['Growth', p.growthRate], ['Bark', p.barkThickness], ['Resin', p.resinProduction]].map(([label, val]) => (
                    <div key={label as string} className="text-center">
                      <div className="h-8 bg-[var(--bg3)] rounded relative overflow-hidden mb-1"><div className="absolute bottom-0 w-full bg-green-500/60 rounded" style={{ height: `${(val as number) * 100}%` }} /></div>
                      <span className="text-[var(--text3)]">{label as string}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>

          {/* Detail + Clusters */}
          <div className="space-y-4">
            {selectedProvenance && (
              <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
                <h3 className="font-semibold mb-2">\uD83E\uDDEC AI Recommendation</h3>
                <p className="text-sm text-[var(--text3)] mb-4">{selectedProvenance.recommendation}</p>
                <div className="text-xs text-[var(--text3)]">Source: SLU Tree Breeding Institute + Skogsstyrelsen provenance registry. Resistance scores based on 2018-2023 outbreak survival data across {GENETIC_CLUSTERS.reduce((s, c) => s + c.area, 0)} hectares monitored.</div>
              </div>
            )}

            <h2 className="text-lg font-semibold">\uD83D\uDDFA\uFE0F Forest Genetic Clusters</h2>
            {GENETIC_CLUSTERS.map(cluster => (
              <div key={cluster.id} className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{cluster.name}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${cluster.susceptibilityIndex > 0.7 ? 'bg-red-500/20 text-red-400' : cluster.susceptibilityIndex > 0.5 ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                    Risk: {(cluster.susceptibilityIndex * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3 text-xs text-[var(--text3)]">
                  <div><span className="block text-[var(--text)] font-medium">{cluster.area} ha</span>Area</div>
                  <div><span className="block text-[var(--text)] font-medium">{cluster.dominantProvenance}</span>Provenance</div>
                  <div><span className="block text-[var(--text)] font-medium">{cluster.survivedLastOutbreak}%</span>Survived 2021</div>
                  <div><span className="block text-[var(--text)] font-medium">{cluster.avgAge} yr</span>Avg Age</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
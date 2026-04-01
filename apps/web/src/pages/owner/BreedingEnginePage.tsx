import { useState } from 'react';
interface BreedingTrial { id: string; location: string; provenances: { name: string; survivalRate: number; resinYield: number; barkThickness: number }[]; yearPlanted: number; notes: string; }
const TRIALS: BreedingTrial[] = [
  { id: 'BT-001', location: 'Asa Research Forest (Sm\u00E5land)', yearPlanted: 2019, notes: 'Carpathian provenance showing 35% higher resin production. Thicker bark correlates with survival (r=0.82).', provenances: [{ name: 'Carpathian (Romania)', survivalRate: 0.91, resinYield: 0.87, barkThickness: 0.93 }, { name: 'Southern Swedish', survivalRate: 0.74, resinYield: 0.71, barkThickness: 0.68 }, { name: 'Finnish', survivalRate: 0.42, resinYield: 0.52, barkThickness: 0.45 }] },
  { id: 'BT-002', location: 'Tiveden National Park Edge', yearPlanted: 2020, notes: 'Mixed planting trial. Pine buffer zones reduce spruce beetle attack by 60% in adjacent stands.', provenances: [{ name: 'Bavarian Alps', survivalRate: 0.83, resinYield: 0.79, barkThickness: 0.81 }, { name: 'Northern Swedish', survivalRate: 0.56, resinYield: 0.58, barkThickness: 0.52 }, { name: 'Scots Pine (control)', survivalRate: 0.97, resinYield: 0.91, barkThickness: 0.95 }] },
];
export default function BreedingEnginePage() {
  const [selectedTrial, setSelectedTrial] = useState(TRIALS[0]);
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6"><div className="max-w-7xl mx-auto">
      <div className="mb-8"><div className="flex items-center gap-3 mb-2"><span className="text-3xl">\uD83E\uDDEC</span><h1 className="text-3xl font-bold">Resistance Trait Breeding</h1><span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30">10-YEAR MOAT</span></div>
        <p className="text-[var(--text3)] max-w-3xl">Track which tree genetics survive infestations and recommend resistant provenances for replanting. Links real-time monitoring to SLU breeding programs. Accelerates breeding cycle from 15 years to 3 by feeding field survival data directly into selection models.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">{TRIALS.map(trial => (
          <button key={trial.id} onClick={() => setSelectedTrial(trial)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTrial.id === trial.id ? 'ring-2 ring-green-500' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
            <div className="flex items-center justify-between mb-2"><span className="font-medium">{trial.location}</span><span className="text-xs text-[var(--text3)]">{trial.yearPlanted}</span></div>
            <div className="space-y-1">{trial.provenances.map(p => (
              <div key={p.name} className="flex items-center gap-2"><span className="text-xs w-36 truncate">{p.name}</span><div className="flex-1 h-2 bg-[var(--bg3)] rounded-full"><div className="h-full rounded-full bg-green-500" style={{ width: `${p.survivalRate * 100}%` }} /></div><span className="text-xs font-mono">{(p.survivalRate * 100).toFixed(0)}%</span></div>
            ))}</div>
          </button>))}</div>
        <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
          <h3 className="font-semibold mb-4">\uD83C\uDF31 Trial: {selectedTrial.location}</h3>
          <div className="space-y-4">{selectedTrial.provenances.map(p => (
            <div key={p.name} className="bg-[var(--bg3)] rounded-lg p-3"><div className="font-medium text-sm mb-2">{p.name}</div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>Survival <span className="font-bold text-[var(--green)]">{(p.survivalRate * 100).toFixed(0)}%</span></div>
                <div>Resin <span className="font-bold text-amber-400">{(p.resinYield * 100).toFixed(0)}%</span></div>
                <div>Bark <span className="font-bold text-blue-400">{(p.barkThickness * 100).toFixed(0)}%</span></div></div></div>))}</div>
          <div className="mt-4 bg-[var(--bg3)] rounded-lg p-3 text-sm text-[var(--text3)]">{selectedTrial.notes}</div>
        </div>
      </div></div></div>);
}
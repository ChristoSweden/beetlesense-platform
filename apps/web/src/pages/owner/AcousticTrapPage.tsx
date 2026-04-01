import { useState } from 'react';
interface AcousticTrap { id: string; location: string; lat: number; lng: number; status: 'active' | 'detecting' | 'offline'; batteryPct: number; lastDetection: string; speciesId: string; confidence: number; frequency: number; amplitude: number; feedingActivity: 'high' | 'moderate' | 'none'; placementScore: number; }
const TRAPS: AcousticTrap[] = [
  { id: 'AT-01', location: 'Grid G-14 North', lat: 57.712, lng: 11.975, status: 'detecting', batteryPct: 87, lastDetection: '3 min ago', speciesId: 'Ips typographus', confidence: 0.98, frequency: 2.4, amplitude: 0.72, feedingActivity: 'high', placementScore: 0.95 },
  { id: 'AT-02', location: 'Grid G-14 East', lat: 57.709, lng: 11.981, status: 'detecting', batteryPct: 92, lastDetection: '12 min ago', speciesId: 'Ips typographus', confidence: 0.94, frequency: 2.3, amplitude: 0.58, feedingActivity: 'moderate', placementScore: 0.88 },
  { id: 'AT-03', location: 'Grid G-15 Center', lat: 57.684, lng: 12.010, status: 'active', batteryPct: 78, lastDetection: '2h ago', speciesId: 'Pityogenes chalcographus', confidence: 0.91, frequency: 3.1, amplitude: 0.34, feedingActivity: 'moderate', placementScore: 0.82 },
  { id: 'AT-04', location: 'Grid G-12 South', lat: 57.722, lng: 11.940, status: 'active', batteryPct: 95, lastDetection: 'none', speciesId: '-', confidence: 0, frequency: 0, amplitude: 0, feedingActivity: 'none', placementScore: 0.71 },
  { id: 'AT-05', location: 'Grid G-16 West', lat: 57.695, lng: 11.962, status: 'offline', batteryPct: 12, lastDetection: '8h ago', speciesId: 'Ips typographus', confidence: 0.86, frequency: 2.5, amplitude: 0.61, feedingActivity: 'high', placementScore: 0.93 },
];
export default function AcousticTrapPage() {
  const [selectedTrap, setSelectedTrap] = useState(TRAPS[0]);
  const detecting = TRAPS.filter(t => t.status === 'detecting').length;
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6"><div className="max-w-7xl mx-auto">
      <div className="mb-8"><div className="flex items-center gap-3 mb-2"><span className="text-3xl">\uD83D\uDD0A</span><h1 className="text-3xl font-bold">Acoustic Smart Trap Network</h1><span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30">99% SPECIES ID</span></div>
        <p className="text-[var(--text3)] max-w-3xl">Ultrasonic detection of bark beetle feeding activity. AI-optimized placement using Bayesian optimization (50 traps = same coverage as 300 random). Real-time 24h alerts vs competitor Trapview weekly manual checks. Species identification at 99% accuracy from acoustic spectrograms (Fraunhofer IDMT validated).</p></div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-amber-400">{detecting}</div><div className="text-sm text-[var(--text3)]">Actively Detecting</div></div>
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-[var(--green)]">{TRAPS.length}</div><div className="text-sm text-[var(--text3)]">Deployed Traps</div></div>
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-purple-400">99%</div><div className="text-sm text-[var(--text3)]">Species Accuracy</div></div>
        <div className="bg-[var(--bg2)] rounded-xl p-4 border border-[var(--border)]"><div className="text-2xl font-bold text-blue-400">6x</div><div className="text-sm text-[var(--text3)]">Efficiency vs Random</div></div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">{TRAPS.map(trap => (
          <button key={trap.id} onClick={() => setSelectedTrap(trap)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedTrap.id === trap.id ? 'ring-2 ring-amber-500' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2"><span className="font-mono text-sm">{trap.id}</span><span className={`w-2 h-2 rounded-full ${trap.status === 'detecting' ? 'bg-red-400 animate-pulse' : trap.status === 'active' ? 'bg-green-400' : 'bg-gray-400'}`} /><span className="text-xs text-[var(--text3)]">{trap.location}</span></div>
              <span className="text-xs text-[var(--text3)]">\uD83D\uDD0B {trap.batteryPct}%</span></div>
            <div className="grid grid-cols-4 gap-2 text-xs text-[var(--text3)]">
              <div>Species: <span className="text-[var(--text)] font-medium">{trap.speciesId}</span></div>
              <div>Freq: <span className="text-[var(--text)]">{trap.frequency}kHz</span></div>
              <div>Activity: <span className={`font-medium ${trap.feedingActivity === 'high' ? 'text-red-400' : trap.feedingActivity === 'moderate' ? 'text-amber-400' : 'text-[var(--text3)]'}`}>{trap.feedingActivity}</span></div>
              <div>Conf: <span className="text-[var(--text)]">{trap.confidence > 0 ? (trap.confidence * 100).toFixed(0) + '%' : '-'}</span></div></div>
          </button>))}</div>
        <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
          <h3 className="font-semibold mb-4">\uD83D\uDD0A {selectedTrap.id} Detail</h3>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-[var(--text3)]">Species:</span> {selectedTrap.speciesId}</div>
            <div><span className="text-[var(--text3)]">Last detection:</span> {selectedTrap.lastDetection}</div>
            <div><span className="text-[var(--text3)]">Frequency:</span> {selectedTrap.frequency} kHz</div>
            <div><span className="text-[var(--text3)]">Amplitude:</span> {selectedTrap.amplitude}</div>
            <div><span className="text-[var(--text3)]">Placement score:</span> {(selectedTrap.placementScore * 100).toFixed(0)}%</div>
            <div><span className="text-[var(--text3)]">Battery:</span> {selectedTrap.batteryPct}%</div></div>
          {selectedTrap.feedingActivity !== 'none' && <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-sm">\uD83D\uDC1B Active {selectedTrap.speciesId} feeding detected at {selectedTrap.frequency}kHz. Amplitude {selectedTrap.amplitude} indicates {selectedTrap.feedingActivity} boring activity. Confidence: {(selectedTrap.confidence * 100).toFixed(0)}%.</div>}
        </div></div></div></div>);
}
import { useState } from 'react';
interface CustodyRecord { id: string; batchId: string; gridOrigin: string; species: string; volume: number; harvestDate: string; infestationConfirmed: string; verificationMethod: string; chain: { step: string; timestamp: string; actor: string; hash: string }[]; carbonOffset: number; insuranceClaim: boolean; fscStatus: 'verified' | 'pending' | 'rejected'; }
const RECORDS: CustodyRecord[] = [
  { id: 'COC-2026-001', batchId: 'BATCH-VGO-14-A', gridOrigin: 'G-14-7', species: 'Picea abies', volume: 342, harvestDate: '2026-03-25', infestationConfirmed: 'Ips typographus (acoustic + spectral)', verificationMethod: 'Multi-modal fusion: acoustic 98% + Sentinel-2 NDVI + drone thermal', chain: [{ step: 'Infestation detected', timestamp: '2026-03-10 08:14', actor: 'BeetleSense AI', hash: '0xa3f7...c912' }, { step: 'Drone verification', timestamp: '2026-03-12 14:22', actor: 'Field Team Alpha', hash: '0xb4e8...d023' }, { step: 'Harvest authorized', timestamp: '2026-03-18 09:00', actor: 'Skogsstyrelsen permit', hash: '0xc5d9...e134' }, { step: 'Timber extracted', timestamp: '2026-03-25 06:30', actor: 'Stora Enso Logistics', hash: '0xd6ea...f245' }], carbonOffset: 1026, insuranceClaim: true, fscStatus: 'verified' },
  { id: 'COC-2026-002', batchId: 'BATCH-OGO-15-B', gridOrigin: 'G-15-3', species: 'Picea abies', volume: 128, harvestDate: '2026-03-28', infestationConfirmed: 'Ips typographus (thermal + satellite)', verificationMethod: 'Thermal anomaly +1.8C + Sentinel-2 NDVI decline', chain: [{ step: 'Stress detected', timestamp: '2026-03-15 11:45', actor: 'BeetleSense AI', hash: '0xe7fb...a356' }, { step: 'Ground inspection', timestamp: '2026-03-20 10:00', actor: 'Field Team Beta', hash: '0xf8ac...b467' }, { step: 'Salvage harvest', timestamp: '2026-03-28 07:15', actor: 'SCA Forest Products', hash: '0xa9bd...c578' }], carbonOffset: 384, insuranceClaim: false, fscStatus: 'pending' },
];
export default function ChainOfCustodyPage() {
  const [selected, setSelected] = useState(RECORDS[0]);
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] p-6"><div className="max-w-7xl mx-auto">
      <div className="mb-8"><div className="flex items-center gap-3 mb-2"><span className="text-3xl">\uD83D\uDD17</span><h1 className="text-3xl font-bold">Chain of Custody & Verification</h1><span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">BLOCKCHAIN</span></div>
        <p className="text-[var(--text3)] max-w-3xl">Immutable chain-of-custody for beetle-killed timber. From AI detection to harvest to mill. Enables carbon credit verification, insurance claim validation, and FSC/EUDR compliance. Each step hashed and timestamped.</p></div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">{RECORDS.map(rec => (
          <button key={rec.id} onClick={() => setSelected(rec)} className={`w-full text-left p-4 rounded-xl border transition-all ${selected.id === rec.id ? 'ring-2 ring-indigo-500' : 'border-[var(--border)]'} bg-[var(--bg2)]`}>
            <div className="flex items-center justify-between mb-2"><span className="font-mono text-sm">{rec.id}</span><span className={`text-xs px-2 py-1 rounded-full ${rec.fscStatus === 'verified' ? 'bg-green-500/20 text-green-400' : rec.fscStatus === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{rec.fscStatus.toUpperCase()}</span></div>
            <div className="grid grid-cols-3 gap-2 text-xs text-[var(--text3)]"><div>{rec.volume} m\u00B3</div><div>{rec.carbonOffset} t CO\u2082</div><div>{rec.chain.length} steps</div></div>
          </button>))}</div>
        <div className="space-y-4">
          <div className="bg-[var(--bg2)] rounded-xl p-6 border border-[var(--border)]">
            <h3 className="font-semibold mb-4">\uD83D\uDD17 {selected.id}</h3>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div><span className="text-[var(--text3)]">Batch:</span> {selected.batchId}</div>
              <div><span className="text-[var(--text3)]">Volume:</span> {selected.volume} m\u00B3</div>
              <div><span className="text-[var(--text3)]">Carbon offset:</span> {selected.carbonOffset} t CO\u2082</div>
              <div><span className="text-[var(--text3)]">Insurance:</span> {selected.insuranceClaim ? '\u2705 Claimed' : '\u2014'}</div></div>
            <div className="text-xs text-[var(--text3)] mb-1">Verification</div><p className="text-sm mb-4">{selected.verificationMethod}</p>
            <div className="text-xs text-[var(--text3)] mb-2">Chain of Custody</div>
            <div className="space-y-2">{selected.chain.map((step, idx) => (
              <div key={idx} className="flex items-start gap-3"><div className="flex flex-col items-center"><div className="w-3 h-3 rounded-full bg-indigo-500" />{idx < selected.chain.length - 1 && <div className="w-0.5 h-8 bg-indigo-500/30" />}</div>
                <div className="flex-1 pb-2"><div className="font-medium text-sm">{step.step}</div><div className="text-xs text-[var(--text3)]">{step.timestamp} \u2014 {step.actor}</div><div className="text-xs font-mono text-indigo-400/60">{step.hash}</div></div></div>))}</div>
          </div></div></div></div></div>);
}
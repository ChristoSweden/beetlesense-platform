import { useState } from 'react';
import { Download, CheckCircle2, WifiOff, Map as MapIcon, Database, HardDrive, Trash2 } from 'lucide-react';
import { useDataStore } from '@/stores/dataStore';

interface OfflineParcel {
  id: string;
  name: string;
  status: 'ready' | 'downloading' | 'pending';
  size: string;
  version: string;
}

export function OfflineMapManager() {
  const { parcels } = useDataStore();
  const [offlineParcels, setOfflineParcels] = useState<OfflineParcel[]>([
    { id: parcels[0]?.id || '1', name: parcels[0]?.name || 'Granudden', status: 'ready', size: '42.5 MB', version: '2026-04-03' },
    { id: parcels[1]?.id || '2', name: parcels[1]?.name || 'Tallbacken', status: 'pending', size: '18.2 MB', version: 'N/A' },
  ]);

  const handleDownload = (id: string) => {
    setOfflineParcels(prev => prev.map(p => p.id === id ? { ...p, status: 'downloading' } : p));
    setTimeout(() => {
      setOfflineParcels(prev => prev.map(p => p.id === id ? { ...p, status: 'ready', version: new Date().toISOString().split('T')[0] } : p));
    }, 2000);
  };

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/20">
            <WifiOff size={20} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
              Offline Field Maps
            </h3>
            <p className="text-[10px] font-bold text-blue-400/70 uppercase tracking-[0.2em] mt-1">
              Field Readiness Manager
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end">
            <span className="text-2xl font-mono font-bold text-white leading-none">60.7 <span className="text-[10px] text-white/30 font-sans">MB</span></span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Total Local Cache</span>
        </div>
      </div>

      <div className="space-y-3">
        {offlineParcels.map((p) => (
          <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${p.status === 'ready' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-white/5 text-white/30'}`}>
                <MapIcon size={18} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white leading-none mb-1">{p.name}</h4>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-mono text-white/40">{p.size}</span>
                   <span className="text-[10px] text-white/20">•</span>
                   <span className="text-[10px] font-mono text-white/40">v{p.version}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {p.status === 'ready' ? (
                <>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    <CheckCircle2 size={12} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Offline Ready</span>
                  </div>
                  <button className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </>
              ) : p.status === 'downloading' ? (
                <div className="flex items-center gap-2 px-3 py-1.5">
                  <div className="w-12 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-1/2 animate-[pulse_1s_infinite]" />
                  </div>
                  <span className="text-[10px] font-bold text-blue-400 animate-pulse">SYNCING...</span>
                </div>
              ) : (
                <button 
                  onClick={() => handleDownload(p.id)}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider hover:bg-blue-600 active:scale-95 transition-all"
                >
                  <Download size={14} />
                  Download
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
         <HardDrive size={16} className="text-amber-400 shrink-0 mt-0.5" />
         <p className="text-[11px] text-amber-200/60 leading-relaxed">
           <strong>Storage Tip:</strong> Downloading high-resolution NDVI layers for all 4 parcels will require approximately 240 MB. Ensure you are on a Wi-Fi connection.
         </p>
      </div>
    </div>
  );
}

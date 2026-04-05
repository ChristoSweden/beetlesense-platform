import { useState, Suspense } from 'react';
import { 
  Database, 
  Satellite, 
  Map as MapIcon, 
  Zap, 
  Search, 
  BarChart3, 
  History, 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight,
  RefreshCw,
  HardDrive,
  Leaf
} from 'lucide-react';
import { useApiHealthStore } from '@/services/apiHealthService';
import { ForestPulse } from '@/components/dashboard/ForestPulse';
import { ApiStatusPanel } from '@/components/ux/ApiStatusPanel';
import { BiodiversityScore } from '@/components/charts/BiodiversityScore';

export default function IntelHubPage() {
  const { services, checkAll } = useApiHealthStore();
  const [isSyncing, setIsSyncing] = useState(false);

  const handleGlobalSync = async () => {
    setIsSyncing(true);
    await checkAll();
    // Simulate deep sync
    await new Promise(r => setTimeout(r, 2000));
    setIsSyncing(false);
  };

  const connectors = [
    { id: 'smhi', name: 'SMHI Meteorological', desc: 'Real-time FWI & Precipitation', icon: <Satellite size={20} /> },
    { id: 'skogsstyrelsen', name: 'Forestry Agency', desc: 'Trap readings & WFS features', icon: <Database size={20} /> },
    { id: 'lantmateriet', name: 'Lantmäteriet', desc: 'Legal property boundaries', icon: <MapIcon size={20} /> },
    { id: 'copernicus', name: 'Copernicus Sentinel', desc: 'Biomass & NVDI analytics', icon: <Satellite size={20} /> },
    { id: 'artdatabanken', name: 'Artdatabanken', desc: 'Biodiversity & red-listed species', icon: <Leaf size={20} className="text-emerald-400" /> },
    { id: 'gfw', name: 'Global Forest Watch', desc: 'Glad deforestation alerts', icon: <AlertTriangle size={20} className="text-amber-400" /> },
    { id: 'nasa', name: 'NASA GEDI', desc: 'ISS space-borne LiDAR profiles', icon: <Satellite size={20} className="text-blue-400" /> },
    { id: 'effis', name: 'Copernicus EFFIS', desc: 'Advanced fire intelligence', icon: <Database size={20} className="text-red-400" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)] pb-32">
      <div className="max-w-4xl mx-auto px-4 pt-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-[0.2em]">Live Operation Hub</span>
            </div>
            <h1 className="text-4xl font-serif font-bold text-white tracking-tight">Institutional Intel Hub</h1>
            <p className="text-white/40 text-sm mt-1 max-w-md">Multi-source synchronized data stream for industrial forest management.</p>
          </div>
          
          <button 
            onClick={handleGlobalSync}
            disabled={isSyncing}
            className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-white text-black font-bold shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isSyncing ? <RefreshCw className="animate-spin" size={20} /> : <Zap size={20} />}
            {isSyncing ? 'Synchronizing Cluster...' : 'Global Sync Now'}
          </button>
        </div>

        {/* Dynamic Pulse Visualization */}
        <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          <ForestPulse />
          <BiodiversityScore parcelId="demo-parcel" />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Connector Grid */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <Database size={12} /> Active Connector Registry
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {connectors.map((c) => {
                const status = (services as any)[c.id]?.status || 'offline';
                const statusColor = status === 'online' ? 'text-emerald-400' : status === 'degraded' ? 'text-amber-400' : 'text-red-400';
                
                return (
                  <div key={c.id} className="glass-panel p-5 rounded-2xl border border-white/5 hover:border-white/20 transition-all flex flex-col justify-between group cursor-pointer">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`p-2.5 rounded-xl bg-white/5 ${statusColor}`}>
                        {c.icon}
                      </div>
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5">
                        <div className={`w-1.5 h-1.5 rounded-full ${status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span className={`text-[9px] font-bold uppercase ${statusColor}`}>{status}</span>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-md font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">{c.name}</h3>
                      <p className="text-[11px] text-white/30 tracking-tight leading-snug">{c.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Actions / Integration Status */}
            <div className="mt-8 glass-panel rounded-3xl p-6 border border-white/5">
               <div className="flex items-center justify-between mb-6">
                 <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sync Log</h3>
                 <button className="text-[10px] text-emerald-400 font-bold hover:underline">View manifest</button>
               </div>
               <div className="space-y-3">
                 {[
                   { t: 'Lantmäteriet Boundaries', d: 'Updated 4 parcels from register', icon: <MapIcon /> },
                   { t: 'Sentinel-2 Biomass', d: 'Analysis complete for Granudden', icon: <Satellite /> },
                   { t: 'Skogsstyrelsen WFS', d: 'Trap data sync complete (Week 14)', icon: <Database /> },
                 ].map((log, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                      <div className="p-1.5 text-white/40">{log.icon}</div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-white/80">{log.t}</p>
                        <p className="text-[10px] text-white/30">{log.d}</p>
                      </div>
                      <CheckCircle2 size={14} className="text-emerald-500/50" />
                    </div>
                 ))}
               </div>
            </div>
          </div>

          {/* Right Sidebar - High Level Metrics */}
          <div className="space-y-6">
            <h2 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
              <BarChart3 size={12} /> Aggregate Insights
            </h2>

            <div className="glass-panel rounded-3xl p-6 border border-white/5 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1 block">Institutional Sync Status</span>
              <div className="text-3xl font-mono font-bold text-white mb-4">100%</div>
              <p className="text-xs text-white/40 leading-relaxed mb-6">All 5 forestry data connectors are operational. Institutional pipelines are locked.</p>
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <HardDrive size={16} className="text-blue-400" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Cloud Storage</h4>
              </div>
              <div className="flex items-baseline gap-1">
                 <span className="text-lg font-mono font-bold text-white">425.8</span>
                 <span className="text-[10px] text-white/30">MB USED</span>
              </div>
              <div className="flex justify-between items-center mt-4">
                 <span className="text-[9px] text-white/40">Syncing NDVI layers...</span>
                 <span className="text-[9px] font-bold text-white/70">82%</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-500" />
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Operational Alert</span>
              </div>
              <p className="text-[11px] text-amber-200/60 leading-relaxed">
                Skogsstyrelsen WFS services are reporting maintenance on April 12th. Plan heavy syncs accordingly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <ApiStatusPanel />
    </div>
  );
}

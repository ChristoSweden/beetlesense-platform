import { useEffect, useState, memo } from 'react';
import { Box, Layers, Zap } from 'lucide-react';
import { lidarConnector } from '@/services/connectors/LidarConnector';

export const StructuralInsightCard = memo(function StructuralInsightCard() {
  const [data, setData] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const res = await lidarConnector.getCanopyGrid([57.12, 14.12, 57.13, 14.13], 15);
      if (res.data) {
        setData(res.data[0]);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="w-full aspect-video bg-black/40 rounded-2xl animate-pulse flex items-center justify-center">
       <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="w-full mt-4 bg-black/90 rounded-2xl border border-emerald-500/20 overflow-hidden relative group">
      {/* Scanning Line */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-pulse-scan z-20 pointer-events-none" />
      
      <div className="p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-2">
              <Box size={14} className="text-emerald-400 animate-emerald-glow" />
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Structural Recon Scan</span>
           </div>
           <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20">
              <Zap size={10} className="text-emerald-400" />
              <span className="text-[8px] font-bold text-emerald-400 uppercase">Live LiDAR</span>
           </div>
        </div>

        <div className="h-24 flex items-end justify-center gap-1 px-4 relative">
           {data?.map((h, i) => (
              <div 
                key={i} 
                className="w-full bg-gradient-to-t from-emerald-600/20 via-emerald-400/40 to-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.3)] rounded-full"
                style={{ height: `${(h / 35) * 100}%` }}
              />
           ))}
           {/* Ground plane */}
           <div className="absolute bottom-0 left-4 right-4 h-px bg-emerald-500/20" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/5">
           <div className="flex gap-4">
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-white/30 uppercase tracking-tight">Mean Height</span>
                 <span className="text-xs font-mono font-bold text-white">24.2m</span>
              </div>
              <div className="flex flex-col">
                 <span className="text-[8px] font-bold text-white/30 uppercase tracking-tight">Density</span>
                 <span className="text-xs font-mono font-bold text-white">0.78</span>
              </div>
           </div>
           <Layers size={14} className="text-emerald-500/40" />
        </div>
      </div>
    </div>
  );
});

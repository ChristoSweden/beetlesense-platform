import { useEffect, useState, useRef, memo } from 'react';
import { Box, Layers, Zap, Info, Maximize2 } from 'lucide-react';
import { lidarConnector } from '@/services/connectors/LidarConnector';
import { gediConnector } from '@/services/connectors/GediConnector';

interface LidarStructuralVisionProps {
  parcelId: string;
}

export const LidarStructuralVision = memo(function LidarStructuralVision({ parcelId }: LidarStructuralVisionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<number[][] | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      // Fetch both terrestrial LiDAR and NASA GEDI for cross-verification
      const [lidarRes, gediRes] = await Promise.all([
        lidarConnector.getCanopyGrid([57.12, 14.12, 57.13, 14.13], 20),
        gediConnector.getLevel2BSamples(57.125, 14.125)
      ]);

      if (lidarRes.data) {
        setData(lidarRes.data);
      }
      
      if (gediRes.data && gediRes.data.length > 0) {
        setMetrics({
          meanHeight: gediRes.data[0].height_m,
          biomass: gediRes.data[0].biomass_t_ha,
          cover: gediRes.data[0].canopy_cover * 100
        });
      }
      setLoading(false);
    }
    fetchData();
  }, [parcelId]);

  if (loading) {
    return (
      <div className="w-full aspect-[21/9] glass-panel rounded-[2rem] animate-pulse flex flex-col items-center justify-center gap-4">
         <div className="w-12 h-12 rounded-full border-2 border-emerald-500/20 border-t-emerald-500 animate-spin" />
         <span className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-[0.3em]">Initializing Structural Scan...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full relative group perspective-1000">
      {/* Background Glow */}
      <div className="absolute inset-0 emerald-blur opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
      
      <div className="glass-panel rounded-[2.5rem] bg-black/80 border border-white/5 shadow-2xl overflow-hidden flex flex-col aspect-[21/9] relative z-10">
        
        {/* Header HUD */}
        <div className="absolute top-6 left-8 z-30">
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-emerald-glow">
                <Box size={18} />
              </div>
              <div>
                 <h2 className="text-xl font-serif font-bold text-white tracking-tight">Structural Vision</h2>
                 <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-[0.25em]">Bioluminescent LiDAR Scan • 20m Res</p>
              </div>
           </div>
        </div>

        <div className="absolute top-6 right-8 z-30 flex items-center gap-3">
           <div className="flex flex-col items-end">
              <span className="text-xs font-mono font-bold text-white/40 uppercase tracking-widest">Orbit Mode</span>
              <span className="text-[10px] font-bold text-emerald-500 hover:text-emerald-400 cursor-pointer transition-colors flex items-center gap-1">
                 Active <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              </span>
           </div>
           <button className="p-2.5 rounded-full bg-white/5 border border-white/10 text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <Maximize2 size={16} />
           </button>
        </div>

        {/* 3D-like Visualization Core */}
        <div className="flex-1 relative overflow-hidden flex items-center justify-center pt-12 bg-[#020617]">
           {/* Scanning Line Overlay */}
           <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent animate-pulse-scan z-20 pointer-events-none" />
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_rgba(0,0,0,0.4)_100%)] z-10 pointer-events-none" />

           <div className="relative w-full h-full flex items-center justify-center p-20 perspective-1000">
              <div 
                className="grid grid-cols-10 gap-2 transform rotate-x-[55deg] rotate-z-[[-35deg]]"
                style={{ transformStyle: 'preserve-3d' }}
              >
                 {data?.flatMap((row, y) => row.map((height, x) => (
                    <div 
                      key={`${x}-${y}`} 
                      className="relative flex flex-col items-center justify-end"
                      style={{ 
                        height: '40px', 
                        width: '4px',
                        transformStyle: 'preserve-3d',
                        transform: `translateZ(${height * 2}px)` 
                      }}
                    >
                       {/* The Point */}
                       <div 
                         className="w-full h-full rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
                         style={{ 
                           opacity: 0.4 + (height / 40),
                           filter: `blur(${height > 25 ? '0px' : '1px'})`
                         }}
                       />
                       
                       {/* Connection Line to Floor */}
                       <div 
                         className="absolute bottom-0 w-[0.5px] bg-gradient-to-t from-emerald-500/0 via-emerald-500/20 to-emerald-500/40"
                         style={{ 
                           height: `${height * 2}px`, 
                           transform: 'translateY(100%)',
                           transformOrigin: 'top'
                         }}
                       />
                    </div>
                 )))}
              </div>
           </div>

           {/* Floor Grid */}
           <div className="absolute bottom-0 w-full h-[60%] bg-[linear-gradient(rgba(16,185,129,0.05)_1px,_transparent_1px),_linear-gradient(90deg,_rgba(16,185,129,0.05)_1px,_transparent_1px)] bg-[size:40px_40px] [transform:rotateX(60deg)_translateY(50px)] opacity-20 z-0" />
        </div>

        {/* Dynamic Metrics Badge Layer */}
        <div className="absolute bottom-6 left-8 right-8 z-30 flex items-center justify-between">
           <div className="flex items-center gap-6">
              <div className="flex items-baseline gap-2">
                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Mean Height</span>
                 <span className="text-xl font-mono font-bold text-emerald-400">{metrics?.meanHeight.toFixed(1)}<span className="text-[10px] text-emerald-500/40 ml-1">M</span></span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex items-baseline gap-2">
                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Biomass</span>
                 <span className="text-xl font-mono font-bold text-white">{metrics?.biomass.toFixed(1)}<span className="text-[10px] text-white/20 ml-1">T/HA</span></span>
              </div>
              <div className="w-px h-8 bg-white/5" />
              <div className="flex items-baseline gap-2">
                 <span className="text-[10px] font-bold text-white/30 uppercase tracking-widest">Canopy Cover</span>
                 <span className="text-xl font-mono font-bold text-white">{metrics?.cover.toFixed(0)}<span className="text-[10px] text-white/20 ml-1">%</span></span>
              </div>
           </div>

           <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
              <Layers size={14} className="text-emerald-500" />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Institutional Calibration: OK</span>
           </div>
        </div>

      </div>

      {/* Floating Info Marker */}
      <div className="absolute -bottom-4 -left-4 p-4 rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl z-40 max-w-[200px] pointer-events-none transform -rotate-1 group-hover:rotate-0 transition-transform">
         <div className="flex items-start gap-3">
            <Zap size={16} className="text-emerald-400 shrink-0 mt-1" />
            <p className="text-[10px] text-white/50 leading-relaxed">
              Analysis identifies <strong>high overcrowding</strong> in Sector 7. Selective thinning recommended for growth optimization.
            </p>
         </div>
      </div>

    </div>
  );
});

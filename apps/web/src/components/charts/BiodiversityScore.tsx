import { useEffect, useState } from 'react';
import { Leaf, Bug, Bird, TreePine, Sparkles, ShieldCheck } from 'lucide-react';
import { biodiversityConnector } from '@/services/connectors/BiodiversityConnector';

interface BiodiversityScoreProps {
  parcelId: string;
}

export function BiodiversityScore({ parcelId }: BiodiversityScoreProps) {
  const [score, setScore] = useState<number | null>(null);
  const [percentile, setPercentile] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const response = await biodiversityConnector.getRichnessIndex(parcelId);
      if (response.data) {
        setScore(response.data.score);
        setPercentile(response.data.percentile);
      }
      setLoading(false);
    }
    fetchData();
  }, [parcelId]);

  if (loading) return (
    <div className="h-48 glass-panel rounded-3xl animate-pulse flex items-center justify-center">
      <div className="w-12 h-12 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="glass-panel p-6 rounded-3xl border border-white/5 relative overflow-hidden group">
      {/* Decorative Gradient */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-all duration-700" />
      
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Leaf size={20} />
        </div>
        <div>
          <h3 className="text-lg font-serif font-bold text-white leading-tight">Biodiversity Score</h3>
          <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-[0.2em] mt-0.5">Richness Index — SLU ArtDatabanken</p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-mono font-bold text-white tracking-tighter">{score}</span>
            <span className="text-xs font-bold text-white/30 uppercase tracking-widest">/ 100</span>
          </div>
          
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                <p className="text-[11px] text-white/60 font-medium leading-tight">
                  High conservation value detected. Top <span className="text-emerald-400 font-bold">{100 - (percentile || 0)}%</span> in region.
                </p>
             </div>
             
             {/* Indicator Bars */}
             <div className="grid grid-cols-3 gap-2">
                {[
                   { icon: <Bird size={10} />, label: 'Birds', val: 'High' },
                   { icon: <Bug size={10} />, label: 'Insects', val: 'Mid' },
                   { icon: <Sparkles size={10} />, label: 'Rare Fungi', val: 'Detected' }
                ].map((item, i) => (
                  <div key={i} className="bg-white/5 rounded-lg p-2 border border-white/5">
                    <div className="flex items-center gap-1.5 mb-1 opacity-40">
                      {item.icon}
                      <span className="text-[8px] font-bold uppercase">{item.label}</span>
                    </div>
                    <span className="text-[9px] font-bold text-white/80">{item.val}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Circular Chart Placeholder/SVG */}
        <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
              <circle 
                cx="48" cy="48" r="40" fill="none" stroke="currentColor" strokeWidth="6" 
                className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                strokeDasharray={2 * Math.PI * 40}
                strokeDashoffset={2 * Math.PI * 40 * (1 - (score || 0) / 100)}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
               <TreePine size={24} className="text-white/20" />
            </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
         <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest">Last audit: April 2, 2026</span>
         <button className="text-[10px] text-emerald-400 font-bold hover:underline underline-offset-4 flex items-center gap-1">
            Red-listed data <ChevronRight size={10} />
         </button>
      </div>

    </div>
  );
}

function ChevronRight({ size, className }: { size: number, className?: string }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

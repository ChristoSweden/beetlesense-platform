import { useMemo, memo } from 'react';
import { Activity, Thermometer, Wind, Zap } from 'lucide-react';

export const ForestPulse = memo(function ForestPulse() {
  const points = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => {
      const x = (i / 39) * 100;
      const y = 50 + Math.sin(i * 0.4) * 20 + Math.random() * 10;
      return `${x},${y}`;
    }).join(' ');
  }, []);

  return (
    <div className="glass-panel rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-110 transition-transform duration-700">
        <Activity size={160} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Zap size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight leading-none" style={{ fontFamily: 'var(--font-serif)' }}>
                Forest Health Pulse
              </h3>
              <p className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-[0.2em] mt-1">
                Real-time Intelligence Stream
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-mono font-bold text-white leading-none">88.4</span>
            <span className="text-[9px] font-bold text-white/40 uppercase tracking-widest mt-1">Live Index</span>
          </div>
        </div>

        {/* Dynamic Waveform */}
        <div className="h-24 w-full mb-8 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full preserve-3d" preserveAspectRatio="none">
            <defs>
              <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(16,185,129,0.1)" />
                <stop offset="50%" stopColor="rgba(16,185,129,0.4)" />
                <stop offset="100%" stopColor="rgba(16,185,129,0.1)" />
              </linearGradient>
            </defs>
            <polyline
              points={points}
              fill="none"
              stroke="url(#pulseGradient)"
              strokeWidth="2"
              strokeLinecap="round"
              className="animate-pulse"
            />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg2)]/50 to-transparent pointer-events-none" />
        </div>

        {/* Micro Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 opacity-50">
               <Thermometer size={12} className="text-orange-400" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-white">Degree Days</span>
            </div>
            <span className="text-lg font-mono font-bold text-white">412 <span className="text-[10px] text-white/30 tracking-normal font-sans">/ 600</span></span>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 opacity-50">
               <Wind size={12} className="text-sky-400" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-white">Gust Speed</span>
            </div>
            <span className="text-lg font-mono font-bold text-white">12.4 <span className="text-[10px] text-white/30 tracking-normal font-sans">m/s</span></span>
          </div>
          <div className="flex flex-col gap-1 p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-1.5 opacity-50">
               <Activity size={12} className="text-emerald-400" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-white">Pest Outbreaks</span>
            </div>
            <span className="text-lg font-mono font-bold text-white">4 <span className="text-[10px] text-white/30 tracking-normal font-sans">regional</span></span>
          </div>
        </div>
      </div>
    </div>
  );
});

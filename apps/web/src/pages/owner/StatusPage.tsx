import { Link } from 'react-router-dom';
import {
  Satellite,
  Users,
  Bug,
  BookOpen,
  Thermometer,
  ArrowRight,
  CloudRain,
  TreePine,
  Scissors,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type HealthLabel = 'Good' | 'Watch' | 'At Risk' | 'Critical';

interface Parcel {
  name: string;
  area: number;
  health: 'good' | 'watch' | 'risk';
  status: string;
}

interface FeedItem {
  id: number;
  source: 'satellite' | 'weather' | 'community' | 'traps' | 'research' | 'observatory';
  message: string;
  time: string;
}

// ── Demo Data ───────────────────────────────────────────────────────────────

const healthScore = 87;

function getHealthLabel(score: number): HealthLabel {
  if (score >= 80) return 'Good';
  if (score >= 60) return 'Watch';
  if (score >= 40) return 'At Risk';
  return 'Critical';
}

function getHealthColor(score: number): string {
  if (score >= 80) return '#10b981'; // emerald-500
  if (score >= 60) return '#f59e0b'; // amber-500
  return '#ef4444'; // red-500
}

const parcels: Parcel[] = [
  { name: 'Bjorkbacken', area: 45, health: 'good', status: 'Healthy' },
  { name: 'Granudden', area: 22, health: 'watch', status: 'NDVI declining' },
  { name: 'Tallmon', area: 31, health: 'good', status: 'Stable' },
  { name: 'Mossebacken', area: 18, health: 'good', status: 'Recovering' },
];

const healthDotColors: Record<string, string> = {
  good: '#10b981',
  watch: '#f59e0b',
  risk: '#ef4444',
};

const feedItems: FeedItem[] = [
  { id: 1, source: 'satellite', message: 'Sentinel-2 pass completed — NDVI within normal range for 3 of 4 parcels', time: '2h ago' },
  { id: 2, source: 'weather', message: 'SMHI: 18C, GDD accumulated to 487/557 (87% of swarming threshold)', time: '3h ago' },
  { id: 3, source: 'community', message: '2 beetle sightings reported within 5km by community members', time: '4h ago' },
  { id: 4, source: 'traps', message: 'Your trap station Bjorkbacken: 8,400 beetles (regional avg: 5,200)', time: '6h ago' },
  { id: 5, source: 'satellite', message: 'Landsat confirms stable vegetation trend over 10-year baseline', time: '8h ago' },
  { id: 6, source: 'weather', message: 'EUMETSAT soil moisture: Low — drought stress indicator active', time: '10h ago' },
  { id: 7, source: 'observatory', message: 'ForestWard Observatory: Pan-Nordic beetle wave advisory issued', time: '12h ago' },
  { id: 8, source: 'research', message: 'Netherer & Schopf (2010) cited: bivoltine activity likely at current GDD', time: '1d ago' },
];

const sourceConfig: Record<string, { icon: any; label: string; color: string }> = {
  satellite: { icon: Satellite, label: 'Satellite', color: '#2563eb' },
  weather: { icon: Thermometer, label: 'Weather', color: '#d97706' },
  community: { icon: Users, label: 'Community', color: '#7c3aed' },
  traps: { icon: Bug, label: 'Traps', color: '#dc2626' },
  research: { icon: BookOpen, label: 'Research', color: '#059669' },
  observatory: { icon: Satellite, label: 'Observatory', color: '#0891b2' },
};

// ── Components ──────────────────────────────────────────────────────────────

function HealthHero() {
  const label = getHealthLabel(healthScore);
  const color = getHealthColor(healthScore);

  return (
    <div
      className="rounded-[40px] p-10 mb-8 overflow-hidden relative group"
      style={{ 
        background: '#ffffff',
        boxShadow: '0 20px 50px -12px rgba(0, 0, 0, 0.08), 0 8px 16px -8px rgba(0, 0, 0, 0.04)'
      }}
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#006b2a1a] to-transparent rounded-full -mr-20 -mt-20 blur-3xl" />
      
      <div className="flex flex-col items-center text-center relative z-10">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-stone-400 mb-6 font-['Manrope']">
          Aggregate Forest Health
        </p>
        
        <div className="relative mb-6">
          <p
            className="text-8xl font-black transition-transform duration-700 group-hover:scale-105"
            style={{ fontFamily: 'var(--font-serif, "Newsreader", serif)', color, letterSpacing: '-0.02em' }}
          >
            {healthScore}
          </p>
          <span className="absolute -top-2 -right-4 text-xl font-bold opacity-30 text-stone-400">%</span>
        </div>

        <div className="w-full max-w-sm mb-6 h-1.5 rounded-full overflow-hidden bg-stone-100 p-0.5">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(0,107,42,0.2)]"
            style={{
              width: `${healthScore}%`,
              background: `linear-gradient(90deg, #ef4444, #f59e0b 50%, #10b981)`,
            }}
          />
        </div>

        <div 
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold shadow-sm border transition-all duration-300 group-hover:px-7"
          style={{ 
            background: 'white', 
            color,
            borderColor: 'rgba(0,0,0,0.04)' 
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ background: color }} />
          {label.toUpperCase()}
        </div>

        <p className="text-[11px] text-stone-400 mt-6 font-medium tracking-wide">
          SYNCHRONIZED WITH 6 REAL-TIME LAYERS &middot; <span className="font-bold text-stone-500 uppercase tracking-tighter">2H AGO</span>
        </p>
      </div>
    </div>
  );
}

function ParcelRow() {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-lg font-bold tracking-tight font-['Newsreader']" style={{ fontSize: '1.25rem' }}>Your Parcels</h2>
        <Link to="/owner/parcels" className="text-xs font-bold text-[#006b2a] flex items-center gap-1.5 hover:gap-2 transition-all uppercase tracking-widest">
          View all <ArrowRight size={14} />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1 no-scrollbar scroll-smooth">
        {parcels.map((p) => (
          <Link
            key={p.name}
            to="/owner/parcels"
            className="shrink-0 w-44 rounded-[32px] p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            style={{ background: '#ffffff', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)' }}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full shrink-0 ring-4 ring-white shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                style={{ background: healthDotColors[p.health] }}
              />
              <span className="text-sm font-bold text-stone-800 truncate font-['Manrope']">{p.name}</span>
            </div>
            <p className="text-[11px] text-stone-400 font-bold uppercase tracking-wider">{p.area} Hectares</p>
            <div 
              className="text-[10px] mt-3 font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-md inline-block" 
              style={{ background: `${healthDotColors[p.health]}12`, color: healthDotColors[p.health] }}
            >
              {p.status}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function IntelFeed() {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-5 px-1">
        <h2 className="text-lg font-bold tracking-tight font-['Newsreader']">Intelligence Feed</h2>
        <span className="text-[10px] font-black text-stone-300 uppercase tracking-[0.2em]">Live Stream</span>
      </div>
      <div className="space-y-4">
        {feedItems.map((item, idx) => {
          const cfg = sourceConfig[item.source];
          const Icon = cfg.icon;
          return (
            <div
              key={item.id}
              className="rounded-[24px] p-4 flex items-start gap-4 transition-all hover:scale-[1.01]"
              style={{
                background: '#ffffff',
                boxShadow: '0 2px 12px -2px rgba(0,0,0,0.03)',
                borderLeft: `6px solid ${cfg.color}15`,
                animation: `fadeInCard 400ms ease-out ${idx * 60}ms both`,
              }}
            >
              <div
                className="flex items-center justify-center w-10 h-10 rounded-2xl shrink-0 shadow-sm"
                style={{ background: `${cfg.color}10` }}
              >
                <Icon size={18} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] leading-relaxed text-stone-700 font-medium">{item.message}</p>
                <div className="flex items-center gap-3 mt-3">
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.15em] px-2 py-1 rounded-md"
                    style={{ background: `${cfg.color}08`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-stone-400 font-bold italic" style={{ fontFamily: 'var(--font-mono)' }}>
                    {item.time}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuickStats() {
  const stats = [
    { icon: <CloudRain size={20} />, label: 'Weather', value: '18C', sub: 'Rain Thu' },
    { icon: <TreePine size={20} />, label: 'Parcels', value: '116 ha', sub: '4 parcels' },
    { icon: <Scissors size={20} />, label: 'Next Action', value: 'Thin stand', sub: 'May 15' },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 pb-12">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-[28px] p-5 text-center transition-all hover:shadow-lg"
          style={{ background: '#ffffff', boxShadow: '0 4px 15px -2px rgba(0,0,0,0.03)' }}
        >
          <div className="flex justify-center text-stone-300 mb-3">{s.icon}</div>
          <p className="text-sm font-black text-stone-800 font-['Manrope']" style={{ letterSpacing: '-0.01em' }}>
            {s.value}
          </p>
          <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mt-1">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

export default function StatusPage() {
  return (
    <div className="p-6 sm:p-8 max-w-3xl mx-auto min-h-screen bg-[#fcfcfb] overflow-x-hidden">
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <div className="mb-8 pt-4">
        <h1
          className="text-4xl font-black text-stone-900 tracking-tight"
          style={{ fontFamily: 'var(--font-serif, "Newsreader", serif)', letterSpacing: '-0.02em' }}
        >
          Forest Status
        </h1>
        <p className="text-[10px] font-black text-stone-400 mt-2 uppercase tracking-[0.3em]">
          INTELLIGENCE DASHBOARD V2.3.0
        </p>
      </div>

      <HealthHero />
      <ParcelRow />
      <IntelFeed />
      <QuickStats />
    </div>
  );
}

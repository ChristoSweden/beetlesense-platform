import { Link } from 'react-router-dom';
import {
  Satellite,
  CloudSun,
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
  if (score >= 80) return 'var(--risk-low)';
  if (score >= 60) return 'var(--risk-moderate)';
  return 'var(--risk-high)';
}

const parcels: Parcel[] = [
  { name: 'Bjorkbacken', area: 45, health: 'good', status: 'Healthy' },
  { name: 'Granudden', area: 22, health: 'watch', status: 'NDVI declining' },
  { name: 'Tallmon', area: 31, health: 'good', status: 'Stable' },
  { name: 'Mossebacken', area: 18, health: 'good', status: 'Recovering' },
];

const healthDotColors: Record<string, string> = {
  good: 'var(--risk-low)',
  watch: 'var(--risk-moderate)',
  risk: 'var(--risk-high)',
};

const feedItems: FeedItem[] = [
  { id: 1, source: 'satellite', message: 'Sentinel-2 pass completed — NDVI within normal range for 3 of 4 parcels', time: '2h ago' },
  { id: 2, source: 'weather', message: 'SMHI: 18\u00B0C, GDD accumulated to 487/557 (87% of swarming threshold)', time: '3h ago' },
  { id: 3, source: 'community', message: '2 beetle sightings reported within 5km by community members', time: '4h ago' },
  { id: 4, source: 'traps', message: 'Your trap station Bjorkbacken: 8,400 beetles (regional avg: 5,200)', time: '6h ago' },
  { id: 5, source: 'satellite', message: 'Landsat confirms stable vegetation trend over 10-year baseline', time: '8h ago' },
  { id: 6, source: 'weather', message: 'EUMETSAT soil moisture: Low — drought stress indicator active', time: '10h ago' },
  { id: 7, source: 'observatory', message: 'ForestWard Observatory: Pan-Nordic beetle wave advisory issued', time: '12h ago' },
  { id: 8, source: 'research', message: 'Netherer & Schopf (2010) cited: bivoltine activity likely at current GDD', time: '1d ago' },
];

const sourceConfig: Record<string, { icon: typeof Satellite; label: string; color: string }> = {
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
      className="rounded-xl p-6 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex flex-col items-center text-center">
        <p
          className="text-5xl font-bold"
          style={{ fontFamily: 'var(--font-serif)', color }}
        >
          {healthScore}
        </p>
        <div className="w-full max-w-xs mt-3 h-2.5 rounded-full overflow-hidden bg-[var(--bg3)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${healthScore}%`,
              background: 'linear-gradient(90deg, var(--risk-high), var(--risk-moderate) 50%, var(--risk-low))',
            }}
          />
        </div>
        <span
          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <p className="text-xs text-[var(--text3)] mt-2">
          Based on 6 data layers &middot; Updated 2h ago
        </p>
      </div>
    </div>
  );
}

function ParcelRow() {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-[var(--text)]">Your Parcels</h2>
        <Link to="/owner/parcels" className="text-xs font-medium text-[var(--green)] flex items-center gap-1">
          View all <ArrowRight size={12} />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
        {parcels.map((p) => (
          <Link
            key={p.name}
            to="/owner/parcels"
            className="shrink-0 w-36 rounded-xl p-3"
            style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ background: healthDotColors[p.health] }}
              />
              <span className="text-sm font-semibold text-[var(--text)] truncate">{p.name}</span>
            </div>
            <p className="text-xs text-[var(--text3)]">{p.area} ha</p>
            <p className="text-[10px] mt-1" style={{ color: healthDotColors[p.health] }}>{p.status}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

function IntelFeed() {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Today&apos;s Intelligence Feed</h2>
      <div className="space-y-2">
        {feedItems.map((item, idx) => {
          const cfg = sourceConfig[item.source];
          const Icon = cfg.icon;
          return (
            <div
              key={item.id}
              className="rounded-xl p-3 flex items-start gap-3"
              style={{
                background: 'var(--bg2)',
                boxShadow: 'var(--shadow-card)',
                borderLeft: `3px solid ${cfg.color}`,
                animation: `fadeInCard 300ms ease-out ${idx * 50}ms both`,
              }}
            >
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
                style={{ background: `color-mix(in srgb, ${cfg.color} 12%, transparent)` }}
              >
                <Icon size={16} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-[var(--text)]">{item.message}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{ background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`, color: cfg.color }}
                  >
                    {cfg.label}
                  </span>
                  <span className="text-[10px] text-[var(--text3)]" style={{ fontFamily: 'var(--font-mono)' }}>
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
    { icon: <CloudRain size={18} />, label: 'Weather', value: '18\u00B0C', sub: 'Rain Thu' },
    { icon: <TreePine size={18} />, label: 'Parcels', value: '116 ha', sub: '4 parcels' },
    { icon: <Scissors size={18} />, label: 'Next Action', value: 'Thin Parcel 2', sub: 'May 15' },
  ];

  return (
    <div className="grid grid-cols-3 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl p-3 text-center"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          <div className="flex justify-center text-[var(--text3)] mb-1">{s.icon}</div>
          <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-mono)' }}>
            {s.value}
          </p>
          <p className="text-[10px] text-[var(--text3)]">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function StatusPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold text-[var(--text)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Forest Status
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">Is my forest okay?</p>
      </div>

      <HealthHero />
      <ParcelRow />
      <IntelFeed />
      <QuickStats />

      {/* Staggered fade-in animation */}
      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

import { Link } from 'react-router-dom';
import {
  Bug,
  Flame,
  Scan,
  Leaf,
  TreePine,
  TrendingUp,
  Globe,
  Shield,
  Sprout,
  Wind,
  ArrowRight,
  Activity,
} from 'lucide-react';
import type { ReactNode } from 'react';

type RiskLevel = 'low' | 'moderate' | 'high' | 'info';

interface IntelCard {
  icon: ReactNode;
  title: string;
  metric: string;
  status: string;
  risk: RiskLevel;
  link: string;
}

const riskColors: Record<RiskLevel, string> = {
  low: 'var(--risk-low)',
  moderate: 'var(--risk-moderate)',
  high: 'var(--risk-high)',
  info: 'var(--risk-info)',
};

const riskLabels: Record<RiskLevel, string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  info: 'Info',
};

const cards: IntelCard[] = [
  { icon: <Bug size={20} />, title: 'Beetle Forecast', metric: '487 DD', status: 'Approaching swarming (557 DD)', risk: 'moderate', link: '/owner/microclimate' },
  { icon: <Flame size={20} />, title: 'Fire Risk (FWI)', metric: '22.6', status: 'High danger', risk: 'high', link: '/owner/fire-risk' },
  { icon: <Scan size={20} />, title: 'NDVI Health', metric: '0.78', status: 'Healthy vegetation', risk: 'low', link: '/owner/satellite-check' },
  { icon: <Leaf size={20} />, title: 'Carbon Stock', metric: '245.8 t/ha', status: 'Above national avg', risk: 'info', link: '/owner/carbon' },
  { icon: <TreePine size={20} />, title: 'Biodiversity', metric: "H' 2.14", status: 'Below regional avg', risk: 'moderate', link: '/owner/biodiversity' },
  { icon: <TrendingUp size={20} />, title: 'Timber Market', metric: 'SEK 580/m\u00B3', status: 'Spruce sawlog stable', risk: 'info', link: '/owner/timber-market' },
  { icon: <Globe size={20} />, title: 'ForestWard', metric: '3 alerts', status: 'Pan-Nordic beetle wave', risk: 'high', link: '/owner/forestward-observatory' },
  { icon: <Shield size={20} />, title: 'Compliance', metric: '2 pending', status: 'EUDR deadline approaching', risk: 'moderate', link: '/owner/compliance' },
  { icon: <Sprout size={20} />, title: 'Growth Model', metric: '5.2 MAI', status: 'G28 optimal rotation 65yr', risk: 'low', link: '/owner/growth-model' },
  { icon: <Wind size={20} />, title: 'Storm Risk', metric: 'Low', status: 'No wind warnings', risk: 'low', link: '/owner/storm-risk' },
];

function CompoundRiskBanner() {
  const overallScore = 42;
  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{
        background: 'var(--bg2)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: 'var(--green-wash)' }}
          >
            <Activity size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Compound Risk Score</h2>
            <p className="text-xs text-[var(--text3)]">Fused analysis from all monitoring sources</p>
          </div>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-mono)', color: 'var(--risk-moderate)' }}
            >
              {overallScore}
            </span>
            <span className="text-xs text-[var(--text3)]">/ 100</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--bg3)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${overallScore}%`,
                  background: `linear-gradient(90deg, var(--risk-low), var(--risk-moderate) 50%, var(--risk-high))`,
                }}
              />
            </div>
          </div>
        </div>

        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{
            background: 'var(--green-wash)',
            color: 'var(--green)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
          All Sources Active
        </span>
      </div>
    </div>
  );
}

export default function IntelCenterPage() {
  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold text-[var(--text)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Bevakning
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">
          Live intelligence across all monitoring services
        </p>
      </div>

      {/* Compound Risk Banner */}
      <CompoundRiskBanner />

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card, idx) => (
          <Link
            key={card.title}
            to={card.link}
            className="block rounded-xl overflow-hidden transition-all"
            style={{
              background: 'var(--bg2)',
              boxShadow: 'var(--shadow-card)',
              borderLeft: `4px solid ${riskColors[card.risk]}`,
              animation: `fadeInCard 300ms ease-out ${idx * 50}ms both`,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              e.currentTarget.style.transform = 'scale(1.01)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = 'var(--shadow-card)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div className="p-4">
              {/* Icon + Title */}
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[var(--text3)]">{card.icon}</span>
                <span className="text-sm font-semibold text-[var(--text)]">{card.title}</span>
              </div>

              {/* Hero Metric */}
              <div
                className="text-2xl font-bold text-[var(--text)] mb-1"
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {card.metric}
              </div>

              {/* Status */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    background: `color-mix(in srgb, ${riskColors[card.risk]} 15%, transparent)`,
                    color: riskColors[card.risk],
                  }}
                >
                  {riskLabels[card.risk]}
                </span>
                <span className="text-xs text-[var(--text3)]">{card.status}</span>
              </div>

              {/* Link */}
              <div className="flex items-center gap-1 text-xs font-medium text-[var(--green)]">
                View details
                <ArrowRight size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Staggered fade-in animation */}
      <style>{`
        @keyframes fadeInCard {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

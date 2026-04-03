import { Link } from 'react-router-dom';
import {
  Activity,
  Bug,
  Flame,
  Scan,
  Shield,
  Sprout,
  ArrowRight,
  Satellite,
  Users,
  Camera,
  Eye,
  BookOpen,
  CloudSun,
  CheckCircle,
  BrainCircuit,
} from 'lucide-react';

// ── Types ───────────────────────────────────────────────────────────────────

type ThreatLevel = 'high' | 'moderate' | 'info' | 'low';

interface Threat {
  id: number;
  icon: typeof Bug;
  emoji: string;
  title: string;
  level: ThreatLevel;
  levelLabel: string;
  description: string;
  sources: number;
  action: string;
  actionLabel: string;
  link: string;
}

interface EvidenceLayer {
  icon: typeof Satellite;
  name: string;
  count: string;
  active: boolean;
}

// ── Demo Data ───────────────────────────────────────────────────────────────

const compoundScore = 62;

const riskColors: Record<ThreatLevel, string> = {
  high: 'var(--risk-high)',
  moderate: 'var(--risk-moderate)',
  info: 'var(--risk-info)',
  low: 'var(--risk-low)',
};

const threats: Threat[] = [
  {
    id: 1,
    icon: Bug,
    emoji: '\uD83D\uDD34',
    title: 'BEETLE RISK',
    level: 'high',
    levelLabel: 'HIGH',
    description: 'GDD 487/557. Swarming in ~8 days. Trap counts 62% above baseline. 2 community sightings within 5km. Satellite confirms NDVI decline in Parcel Granudden.',
    sources: 4,
    action: 'Take action within 7 days',
    actionLabel: 'View beetle forecast',
    link: '/owner/microclimate',
  },
  {
    id: 2,
    icon: Flame,
    emoji: '\uD83D\uDFE1',
    title: 'FIRE RISK',
    level: 'moderate',
    levelLabel: 'MODERATE',
    description: 'FWI 22.6 (High danger class). Drought Code 280. Soil moisture low per EUMETSAT. No active fires within 50km.',
    sources: 3,
    action: 'Monitor',
    actionLabel: 'View fire risk',
    link: '/owner/fire-risk',
  },
  {
    id: 3,
    icon: Scan,
    emoji: '\uD83D\uDFE1',
    title: 'NDVI ANOMALY',
    level: 'moderate',
    levelLabel: 'MODERATE',
    description: 'Sentinel-2 + Landsat agree: -12% NDVI in Granudden NE. No ground observation yet. SAR shows stable canopy structure.',
    sources: 2,
    action: 'Monitor',
    actionLabel: 'View satellite data',
    link: '/owner/satellite-check',
  },
  {
    id: 6,
    icon: Scan,
    emoji: '\uD83D\uDD34',
    title: 'CANOPY HEIGHT LOSS',
    level: 'high',
    levelLabel: 'HIGH',
    description: 'Granudden NE: -3.4m mean height loss over 12 months. Beetle-induced mortality confirmed by GEDI + Sentinel fusion.',
    sources: 5,
    action: 'Take action within 7 days',
    actionLabel: 'View canopy height',
    link: '/owner/canopy-height',
  },
  {
    id: 4,
    icon: Shield,
    emoji: '\uD83D\uDD35',
    title: 'COMPLIANCE',
    level: 'info',
    levelLabel: 'INFO',
    description: 'EUDR deadline in 45 days. 2 parcels need geolocation documentation. Avverkningsanmalan for Tallmon due in 3 weeks.',
    sources: 1,
    action: 'No action needed now',
    actionLabel: 'View compliance',
    link: '/owner/compliance',
  },
  {
    id: 5,
    icon: Sprout,
    emoji: '\uD83D\uDFE2',
    title: 'GROWTH',
    level: 'low',
    levelLabel: 'NORMAL',
    description: 'G28 spruce on track. MAI 5.2 m\u00B3/ha/yr. Optimal rotation at 65yr.',
    sources: 2,
    action: 'No action needed',
    actionLabel: 'View growth model',
    link: '/owner/growth-model',
  },
];

const evidenceLayers: EvidenceLayer[] = [
  { icon: Satellite, name: 'Satellites', count: '9', active: true },
  { icon: Bug, name: 'Traps', count: '3', active: true },
  { icon: Camera, name: 'Photos', count: '15', active: true },
  { icon: Eye, name: 'Observations', count: '47', active: true },
  { icon: BookOpen, name: 'Research', count: '2,000+', active: true },
  { icon: CloudSun, name: 'Weather', count: '', active: true },
];

// ── Components ──────────────────────────────────────────────────────────────

function CompoundThreatBanner() {
  const label = compoundScore >= 70 ? 'High' : compoundScore >= 50 ? 'Elevated' : compoundScore >= 30 ? 'Moderate' : 'Low';
  const color = compoundScore >= 70 ? 'var(--risk-high)' : compoundScore >= 50 ? 'var(--risk-moderate)' : 'var(--risk-low)';

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-lg"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            <Activity size={20} style={{ color }} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Compound Threat Score</h2>
            <p className="text-xs text-[var(--text3)]">Drought x Beetle interaction active</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: 'var(--font-mono)', color }}
            >
              {compoundScore}
            </span>
            <span className="text-xs text-[var(--text3)]">/ 100</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--bg3)]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${compoundScore}%`,
                  background: 'linear-gradient(90deg, var(--risk-low), var(--risk-moderate) 50%, var(--risk-high))',
                }}
              />
            </div>
          </div>
        </div>
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
          style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
          {label}
        </span>
      </div>
    </div>
  );
}

function ThreatCard({ threat, index }: { threat: Threat; index: number }) {
  const color = riskColors[threat.level];
  const Icon = threat.icon;

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg2)',
        boxShadow: 'var(--shadow-card)',
        borderLeft: `4px solid ${color}`,
        animation: `fadeInCard 300ms ease-out ${index * 50}ms both`,
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Icon size={18} style={{ color }} />
          <span className="text-sm font-bold text-[var(--text)]">{threat.title}</span>
          <span
            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
            style={{ background: color }}
          >
            {threat.levelLabel}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[var(--text2)] mb-3 leading-relaxed">{threat.description}</p>

        {/* Evidence + action */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
              <CheckCircle size={10} style={{ color: 'var(--risk-low)' }} />
              {threat.sources} source{threat.sources > 1 ? 's' : ''} confirm
            </span>
            <span className="text-[10px] font-medium" style={{ color }}>
              &rarr; {threat.action}
            </span>
          </div>
          <Link
            to={threat.link}
            className="text-xs font-medium flex items-center gap-1"
            style={{ color: 'var(--green)' }}
          >
            {threat.actionLabel} <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function EvidenceLayerRow() {
  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Evidence Layers</h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {evidenceLayers.map((layer) => {
          const Icon = layer.icon;
          return (
            <div
              key={layer.name}
              className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg"
              style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
            >
              <Icon size={14} className="text-[var(--text3)]" />
              <span className="text-xs text-[var(--text2)]">{layer.name}</span>
              {layer.count && (
                <span className="text-[10px] text-[var(--text3)]" style={{ fontFamily: 'var(--font-mono)' }}>
                  ({layer.count})
                </span>
              )}
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: layer.active ? 'var(--risk-low)' : 'var(--text3)' }}
              />
            </div>
          );
        })}
      </div>
      <Link
        to="/owner/satellite-constellation"
        className="text-xs font-medium text-[var(--green)] flex items-center gap-1 mt-2"
      >
        View all data sources <ArrowRight size={12} />
      </Link>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

export default function ThreatsPage() {
  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1
          className="text-xl sm:text-2xl font-bold text-[var(--text)]"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          Threats
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">What should I worry about?</p>
      </div>

      <CompoundThreatBanner />

      {/* Active Threats */}
      <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Active Threats</h2>
      <div className="space-y-3">
        {threats.map((t, idx) => (
          <ThreatCard key={t.id} threat={t} index={idx} />
        ))}
      </div>

      <EvidenceLayerRow />

      {/* AI Lab link */}
      <Link
        to="/owner/ai-lab"
        className="mt-4 rounded-xl p-4 flex items-center gap-3 transition-colors hover:bg-[var(--bg3)]"
        style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
      >
        <div
          className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0"
          style={{ background: 'color-mix(in srgb, var(--green) 12%, transparent)' }}
        >
          <BrainCircuit size={18} className="text-[var(--green)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text)]">AI Intelligence Lab</p>
          <p className="text-[11px] text-[var(--text3)]">Research curation, model validation, and intelligence writing</p>
        </div>
        <ArrowRight size={14} className="text-[var(--green)]" />
      </Link>

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

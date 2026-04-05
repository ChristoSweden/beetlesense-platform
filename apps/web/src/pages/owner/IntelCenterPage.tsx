import { useState } from 'react';
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
  ArrowRight,
  Activity,
  Satellite,
  ChevronDown,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { FAB } from '@/components/ui/FAB';
import SourceProvenance from '@/components/fusion/SourceProvenance';
import DataFreshnessStrip from '@/components/fusion/DataFreshnessStrip';
import CompoundThreatDiagram from '@/components/fusion/CompoundThreatDiagram';
import CascadingAlertAnimation from '@/components/fusion/CascadingAlertAnimation';
import { FusionComparisonToggle } from '@/components/fusion/FusionComparisonToggle';
import { ConfidenceBand } from '@/components/fusion/ConfidenceBand';
import type { DataSource } from '@/services/fusionEngine';


type RiskLevel = 'low' | 'moderate' | 'high' | 'info';

interface IntelCard {
  icon: ReactNode;
  title: string;
  metric: string;
  status: string;
  risk: RiskLevel;
  link: string;
  confidence?: { value: number; min: number; max: number; unit: string; level: 'high' | 'medium' | 'low'; sourceCount: number };
  sources?: Array<{ source: DataSource; label: string; weight: number; confidence: number; lastUpdated: string }>;
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

const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const cards: IntelCard[] = [
  {
    icon: <Bug size={20} />, title: 'Beetle Forecast', metric: '487 DD', status: 'Approaching swarming (557 DD)', risk: 'moderate', link: '/owner/microclimate',
    confidence: { value: 487, min: 462, max: 512, unit: 'DD', level: 'high', sourceCount: 4 },
    sources: [
      { source: 'SMHI', label: 'SMHI Temperature', weight: 0.30, confidence: 0.92, lastUpdated: hoursAgo(2) },
      { source: 'SKOGSSTYRELSEN', label: 'Trap Network', weight: 0.28, confidence: 0.87, lastUpdated: daysAgo(1) },
      { source: 'FORESTWARD', label: 'EFI Phenology', weight: 0.22, confidence: 0.84, lastUpdated: daysAgo(2) },
      { source: 'COMMUNITY', label: 'Field Sightings', weight: 0.20, confidence: 0.71, lastUpdated: hoursAgo(6) },
    ],
  },
  {
    icon: <Flame size={20} />, title: 'Fire Risk (FWI)', metric: '22.6', status: 'High danger', risk: 'high', link: '/owner/fire-risk',
    confidence: { value: 22.6, min: 19.8, max: 25.4, unit: 'FWI', level: 'medium', sourceCount: 3 },
    sources: [
      { source: 'SMHI', label: 'SMHI Weather', weight: 0.45, confidence: 0.94, lastUpdated: hoursAgo(1) },
      { source: 'NASA_FIRMS', label: 'NASA FIRMS', weight: 0.35, confidence: 0.88, lastUpdated: hoursAgo(4) },
      { source: 'SENTINEL', label: 'Sentinel-2 Dryness', weight: 0.20, confidence: 0.76, lastUpdated: daysAgo(3) },
    ],
  },
  {
    icon: <Shield size={20} />, title: 'Insurance Risk', metric: 'B+', status: 'Eligible for premium discount', risk: 'low', link: '/owner/insurance',
    sources: [
      { source: 'SENTINEL', label: 'Satellite Health', weight: 0.25, confidence: 0.89, lastUpdated: daysAgo(3) },
      { source: 'SMHI', label: 'Climate Risk', weight: 0.25, confidence: 0.91, lastUpdated: hoursAgo(2) },
      { source: 'SKOGSSTYRELSEN', label: 'Damage History', weight: 0.30, confidence: 0.85, lastUpdated: daysAgo(7) },
      { source: 'FORESTWARD', label: 'Storm Exposure', weight: 0.20, confidence: 0.78, lastUpdated: daysAgo(5) },
    ],
  },
  {
    icon: <Activity size={20} />, title: 'Compound Threat', metric: 'Level 4', status: 'Drought-Beetle interaction', risk: 'high', link: '/owner/compound-threats',
    sources: [
      { source: 'SMHI', label: 'Drought Index', weight: 0.23, confidence: 0.91, lastUpdated: hoursAgo(2) },
      { source: 'SENTINEL', label: 'NDVI Anomaly', weight: 0.18, confidence: 0.82, lastUpdated: daysAgo(3) },
      { source: 'SKOGSSTYRELSEN', label: 'Trap Trend', weight: 0.22, confidence: 0.87, lastUpdated: daysAgo(1) },
      { source: 'NASA_FIRMS', label: 'Fire Proximity', weight: 0.14, confidence: 0.90, lastUpdated: hoursAgo(4) },
      { source: 'FORESTWARD', label: 'GDD Tracking', weight: 0.13, confidence: 0.84, lastUpdated: daysAgo(2) },
      { source: 'COMMUNITY', label: 'Field Reports', weight: 0.10, confidence: 0.68, lastUpdated: hoursAgo(12) },
    ],
  },
  {
    icon: <Scan size={20} />, title: 'NDVI Health', metric: '0.78', status: 'Healthy vegetation', risk: 'low', link: '/owner/satellite-check',
    confidence: { value: 0.78, min: 0.73, max: 0.83, unit: 'NDVI', level: 'high', sourceCount: 3 },
    sources: [
      { source: 'SENTINEL', label: 'Sentinel-2', weight: 0.50, confidence: 0.91, lastUpdated: daysAgo(3) },
      { source: 'SENTINEL', label: 'Landsat 9', weight: 0.30, confidence: 0.86, lastUpdated: daysAgo(8) },
      { source: 'SENTINEL', label: 'MODIS Daily', weight: 0.20, confidence: 0.74, lastUpdated: daysAgo(1) },
    ],
  },
  {
    icon: <Leaf size={20} />, title: 'Carbon Stock', metric: '245.8 t/ha', status: 'Above national avg', risk: 'info', link: '/owner/carbon',
    confidence: { value: 245.8, min: 228, max: 264, unit: 't CO₂e/ha', level: 'medium', sourceCount: 4 },
  },
  {
    icon: <TreePine size={20} />, title: 'Biodiversity', metric: "H' 2.14", status: 'Below regional avg', risk: 'moderate', link: '/owner/biodiversity',
    confidence: { value: 2.14, min: 1.92, max: 2.36, unit: "H'", level: 'medium', sourceCount: 2 },
  },
  { icon: <TrendingUp size={20} />, title: 'Timber Market', metric: 'SEK 580/m³', status: 'Spruce sawlog stable', risk: 'info', link: '/owner/timber-market' },
  {
    icon: <Globe size={20} />, title: 'ForestWard', metric: '3 alerts', status: 'Pan-Nordic beetle wave', risk: 'high', link: '/owner/forestward-observatory',
    sources: [
      { source: 'FORESTWARD', label: 'EFI BBOA Alerts', weight: 0.60, confidence: 0.88, lastUpdated: daysAgo(1) },
      { source: 'SENTINEL', label: 'Disturbance Maps', weight: 0.25, confidence: 0.82, lastUpdated: daysAgo(4) },
      { source: 'COMMUNITY', label: 'Cross-border Reports', weight: 0.15, confidence: 0.65, lastUpdated: daysAgo(3) },
    ],
  },
  { icon: <Shield size={20} />, title: 'Compliance', metric: '2 pending', status: 'EUDR deadline approaching', risk: 'moderate', link: '/owner/compliance' },
  { icon: <Sprout size={20} />, title: 'Growth Model', metric: '5.2 MAI', status: 'G28 optimal rotation 65yr', risk: 'low', link: '/owner/growth-model' },
  { icon: <Satellite size={20} />, title: 'Satellite Constellation', metric: '9 sources', status: 'Multi-sensor consensus active', risk: 'info', link: '/owner/satellite-constellation' },
];

// Compound threat diagram data
const threatNodes = [
  { id: 'beetle', name: 'Bark Beetle', icon: 'Bug', riskScore: 68, active: true },
  { id: 'drought', name: 'Drought', icon: 'Droplets', riskScore: 55, active: true },
  { id: 'fire', name: 'Wildfire', icon: 'Flame', riskScore: 72, active: true },
  { id: 'storm', name: 'Storm', icon: 'Wind', riskScore: 30, active: false },
];

const threatInteractions = [
  { from: 'drought', to: 'beetle', amplification: 1.35, active: true, mechanism: 'Drought reduces resin production, increasing bark beetle susceptibility by 2-4×' },
  { from: 'drought', to: 'fire', amplification: 1.30, active: true, mechanism: 'Extended drought increases fuel dryness and FWI fire danger rating' },
  { from: 'beetle', to: 'fire', amplification: 1.25, active: true, mechanism: 'Dead standing timber from beetle kill increases fire fuel load' },
  { from: 'storm', to: 'beetle', amplification: 1.40, active: false, mechanism: 'Windthrow creates fresh breeding substrate for Ips typographus' },
];

// Cascading alert data
const cascadingSteps = [
  { source: 'Sentinel-2', signal: 'NDVI drop detected — 0.82 → 0.71 in parcel NE sector', timestamp: hoursAgo(48), confidence: 'medium' as const },
  { source: 'SMHI', signal: 'Precipitation deficit 42% below 10-year average', timestamp: hoursAgo(36), confidence: 'high' as const },
  { source: 'Skogsstyrelsen', signal: 'Trap count spike: 3.2× baseline in Jönköping region', timestamp: hoursAgo(24), confidence: 'high' as const },
  { source: 'Community', signal: 'Nearby owner reports bore dust on spruce trunks (2.3 km away)', timestamp: hoursAgo(6), confidence: 'medium' as const },
];

// Data freshness sources
const freshnessSources = [
  { source: 'SMHI' as DataSource, label: 'SMHI', lastUpdated: hoursAgo(2), expectedIntervalMinutes: 60 },
  { source: 'SENTINEL' as DataSource, label: 'Sentinel-2', lastUpdated: daysAgo(3), expectedIntervalMinutes: 5 * 24 * 60 },
  { source: 'SKOGSSTYRELSEN' as DataSource, label: 'Traps', lastUpdated: daysAgo(1), expectedIntervalMinutes: 7 * 24 * 60 },
  { source: 'NASA_FIRMS' as DataSource, label: 'FIRMS', lastUpdated: hoursAgo(4), expectedIntervalMinutes: 6 * 60 },
  { source: 'FORESTWARD' as DataSource, label: 'ForestWard', lastUpdated: daysAgo(2), expectedIntervalMinutes: 24 * 60 },
  { source: 'COMMUNITY' as DataSource, label: 'Community', lastUpdated: hoursAgo(6), expectedIntervalMinutes: 12 * 60 },
];

function CompoundRiskBanner() {
  const overallScore = 42;
  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg" style={{ background: 'var(--green-wash)' }}>
            <Activity size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-[var(--text)]">Compound Risk Score</h2>
            <p className="text-xs text-[var(--text3)]">Fused analysis from all monitoring sources</p>
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--risk-moderate)' }}>
              {overallScore}
            </span>
            <span className="text-xs text-[var(--text3)]">/ 100</span>
            <div className="flex-1 h-2 rounded-full overflow-hidden bg-[var(--bg3)]">
              <div className="h-full rounded-full" style={{ width: `${overallScore}%`, background: `linear-gradient(90deg, var(--risk-low), var(--risk-moderate) 50%, var(--risk-high))` }} />
            </div>
          </div>
        </div>
        <SourceProvenance
          sources={[
            { source: 'SMHI', label: 'SMHI Weather & Drought', weight: 0.23, confidence: 0.91, lastUpdated: hoursAgo(2) },
            { source: 'SENTINEL', label: 'Sentinel-2 NDVI', weight: 0.18, confidence: 0.82, lastUpdated: daysAgo(3) },
            { source: 'SKOGSSTYRELSEN', label: 'Trap Network', weight: 0.22, confidence: 0.87, lastUpdated: daysAgo(1) },
            { source: 'NASA_FIRMS', label: 'NASA FIRMS Fire', weight: 0.14, confidence: 0.90, lastUpdated: hoursAgo(4) },
            { source: 'FORESTWARD', label: 'ForestWard Phenology', weight: 0.13, confidence: 0.84, lastUpdated: daysAgo(2) },
            { source: 'COMMUNITY', label: 'Community Intel', weight: 0.10, confidence: 0.68, lastUpdated: hoursAgo(12) },
          ]}
          activeSources={5}
          totalSources={6}
        />
      </div>
    </div>
  );
}

export default function IntelCenterPage() {
  const navigate = useNavigate();
  const [showFusionInsights, setShowFusionInsights] = useState(false);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-serif)' }}>
          Bevakning
        </h1>
        <p className="text-sm text-[var(--text3)] mt-1">
          Live intelligence across all monitoring sources — fused, weighted, confidence-scored
        </p>
      </div>

      {/* Compound Risk Banner with Source Provenance */}
      <CompoundRiskBanner />

      {/* Card Grid with Confidence Bands + Source Provenance */}
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
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'scale(1.01)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-card)'; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <div className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-[var(--text3)]">{card.icon}</span>
                <span className="text-sm font-semibold text-[var(--text)]">{card.title}</span>
              </div>

              {/* Confidence Band or plain metric */}
              {card.confidence ? (
                <div className="mb-2">
                  <ConfidenceBand
                    value={card.confidence.value}
                    min={card.confidence.min}
                    max={card.confidence.max}
                    unit={card.confidence.unit}
                    label={card.title}
                    confidence={card.confidence.level}
                    sourceCount={card.confidence.sourceCount}
                  />
                </div>
              ) : (
                <div className="text-2xl font-bold text-[var(--text)] mb-1" style={{ fontFamily: 'var(--font-mono)' }}>
                  {card.metric}
                </div>
              )}

              {/* Status + Risk Badge */}
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                  style={{ background: `color-mix(in srgb, ${riskColors[card.risk]} 15%, transparent)`, color: riskColors[card.risk] }}
                >
                  {riskLabels[card.risk]}
                </span>
                <span className="text-xs text-[var(--text3)]">{card.status}</span>
              </div>

              {/* Source Provenance (inline on cards that have it) */}
              {card.sources && (
                <div className="mb-2" onClick={(e) => e.preventDefault()}>
                  <SourceProvenance
                    sources={card.sources}
                    activeSources={card.sources.length}
                    totalSources={card.sources.length}
                  />
                </div>
              )}

              <div className="flex items-center gap-1 text-xs font-medium text-[var(--green)]">
                View details <ArrowRight size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Fusion Intelligence Section — expandable */}
      <div className="mt-8">
        <button
          onClick={() => setShowFusionInsights(!showFusionInsights)}
          className="flex items-center gap-2 w-full px-4 py-3 rounded-xl text-left transition-all"
          style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
        >
          <Activity size={18} className="text-[var(--green)]" />
          <span className="text-sm font-semibold text-[var(--text)] flex-1">
            Fusion Intelligence — Compound Threats & Cascading Alerts
          </span>
          <ChevronDown size={16} className={`text-[var(--text3)] transition-transform ${showFusionInsights ? 'rotate-180' : ''}`} />
        </button>

        {showFusionInsights && (
          <div className="mt-4 space-y-6" style={{ animation: 'fadeInCard 400ms ease-out' }}>
            {/* Row 1: Compound Threat Diagram + Cascading Alert */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Compound Threat Interaction Diagram */}
              <div className="rounded-xl p-5" style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
                  Threat Interaction Network
                </h3>
                <p className="text-xs text-[var(--text3)] mb-4">
                  How forest threats amplify each other — thicker lines = stronger interaction
                </p>
                <CompoundThreatDiagram threats={threatNodes} interactions={threatInteractions} />
              </div>

              {/* Cascading Alert Timeline */}
              <div className="rounded-xl p-5" style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-1" style={{ fontFamily: 'var(--font-serif)' }}>
                  Cascading Threat Detection
                </h3>
                <p className="text-xs text-[var(--text3)] mb-4">
                  Multi-source corroboration escalates alert confidence
                </p>
                <CascadingAlertAnimation
                  steps={cascadingSteps}
                  alertLevel="confirmed"
                  isAnimating
                />
              </div>
            </div>

            {/* Row 2: Fusion Comparison */}
            <FusionComparisonToggle
              parcelName="Eksjö Fårhult 3:7"
              satelliteOnly={{
                ndvi: 0.71,
                riskLevel: 'Moderate (unconfirmed)',
                confidence: 0.58,
                detectionDelay: '3-4 weeks',
                resolution: '10m',
                sources: 1,
              }}
              beetlesenseFusion={{
                ndvi: 0.78,
                riskLevel: 'High (confirmed)',
                confidence: 0.91,
                detectionDelay: '2-3 days',
                resolution: '1-5cm',
                sources: 6,
                eNoseActive: true,
              }}
            />
          </div>
        )}
      </div>

      {/* Data Freshness Strip — sticky at bottom */}
      <div className="fixed bottom-16 lg:bottom-0 left-0 right-0 z-30">
        <DataFreshnessStrip sources={freshnessSources} />
      </div>

      {/* Mobile FAB */}
      <FAB onClick={() => navigate('/owner/capture')} label="Fältrapport" />

      <style>{`
        @keyframes fadeInCard {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Satellite,
  Globe,
  Flame,
  TreePine,
  Mountain,
  Cloud,
  Leaf,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Clock,
  Activity,
  Radar,
  Eye,
  Layers,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { getDemoConstellation, calculateSatelliteConsensus } from '@/services/fusionEngine';
import type { SatelliteConstellation, SatelliteConsensus } from '@/services/fusionEngine';

// ─── Types ───

type FreshnessLevel = 'fresh' | 'recent' | 'stale';

interface SatelliteSourceCard {
  id: string;
  name: string;
  icon: ReactNode;
  resolution: string;
  revisit: string;
  type: string;
  provider: string;
  lastAcquisition: string;
  freshness: FreshnessLevel;
  coverage: string;
}

// ─── Helpers ───

function getFreshnessColor(level: FreshnessLevel): string {
  switch (level) {
    case 'fresh': return 'var(--risk-low)';
    case 'recent': return 'var(--risk-moderate)';
    case 'stale': return 'var(--risk-high)';
  }
}

function getFreshnessLabel(level: FreshnessLevel): string {
  switch (level) {
    case 'fresh': return 'Fresh';
    case 'recent': return 'Recent';
    case 'stale': return 'Stale';
  }
}

function getAgeLabel(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  return 'Just now';
}

function classifyFreshness(dateStr: string, revisitDays: number): FreshnessLevel {
  const ageDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= revisitDays) return 'fresh';
  if (ageDays <= revisitDays * 2) return 'recent';
  return 'stale';
}

// ─── Demo Source Generation ───

function generateSources(): SatelliteSourceCard[] {
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  return [
    {
      id: 'sentinel-2', name: 'Sentinel-2', icon: <Satellite size={20} />,
      resolution: '10m', revisit: '5 days', type: 'Optical MSI',
      provider: 'ESA Copernicus', lastAcquisition: daysAgo(Math.floor(Math.random() * 4) + 1),
      freshness: 'fresh', coverage: 'Global land',
    },
    {
      id: 'sentinel-1', name: 'Sentinel-1 SAR', icon: <Radar size={20} />,
      resolution: '5x20m', revisit: '6 days', type: 'C-band SAR Radar',
      provider: 'ESA Copernicus', lastAcquisition: daysAgo(Math.floor(Math.random() * 5) + 1),
      freshness: 'fresh', coverage: 'Global land',
    },
    {
      id: 'landsat', name: 'Landsat 8/9', icon: <Globe size={20} />,
      resolution: '30m', revisit: '8 days', type: 'Optical OLI/TIRS',
      provider: 'USGS / NASA', lastAcquisition: daysAgo(Math.floor(Math.random() * 10) + 3),
      freshness: 'recent', coverage: 'Global land (40yr archive)',
    },
    {
      id: 'modis', name: 'MODIS Terra/Aqua', icon: <Eye size={20} />,
      resolution: '250m-1km', revisit: 'Daily', type: 'Multi-instrument',
      provider: 'NASA EOSDIS', lastAcquisition: daysAgo(1),
      freshness: 'fresh', coverage: 'Global',
    },
    {
      id: 'firms', name: 'NASA FIRMS', icon: <Flame size={20} />,
      resolution: '375m', revisit: 'Near real-time', type: 'Active Fire (VIIRS)',
      provider: 'NASA EOSDIS', lastAcquisition: daysAgo(0),
      freshness: 'fresh', coverage: 'Global',
    },
    {
      id: 'gfw', name: 'Global Forest Watch', icon: <TreePine size={20} />,
      resolution: '30m', revisit: 'Weekly', type: 'Deforestation Alerts',
      provider: 'WRI', lastAcquisition: daysAgo(Math.floor(Math.random() * 5) + 2),
      freshness: 'fresh', coverage: 'Global tropics + boreal',
    },
    {
      id: 'gedi', name: 'GEDI (NASA LiDAR)', icon: <Layers size={20} />,
      resolution: '25m footprint \u2192 10m wall-to-wall', revisit: 'Continuous archive (2019-present)', type: 'LiDAR Altimetry',
      provider: 'NASA / CH-GEE', lastAcquisition: daysAgo(Math.floor(Math.random() * 14) + 5),
      freshness: 'recent', coverage: 'Global (51.6\u00B0N-51.6\u00B0S)',
    },
    {
      id: 'dem', name: 'Copernicus DEM', icon: <Mountain size={20} />,
      resolution: '30m', revisit: 'Static', type: 'Digital Elevation',
      provider: 'ESA / DLR', lastAcquisition: '2021-12-01',
      freshness: 'fresh', coverage: 'Global',
    },
    {
      id: 'smhi', name: 'SMHI Weather', icon: <Cloud size={20} />,
      resolution: 'Station-level', revisit: 'Hourly', type: 'Meteorological Obs.',
      provider: 'SMHI', lastAcquisition: daysAgo(0),
      freshness: 'fresh', coverage: 'Sweden',
    },
    {
      id: 'forestward', name: 'ForestWard Observatory', icon: <Leaf size={20} />,
      resolution: 'Network', revisit: 'Daily', type: 'Phenology Network',
      provider: 'EFI / BeetleSense', lastAcquisition: daysAgo(0),
      freshness: 'fresh', coverage: 'Pan-Nordic',
    },
  ];
}

// ─── Components ───

function SourceCard({ source }: { source: SatelliteSourceCard }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-lg"
            style={{ background: 'var(--green-wash)' }}
          >
            <span className="text-[var(--green)]">{source.icon}</span>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text)]">{source.name}</h3>
            <p className="text-xs text-[var(--text3)]">{source.provider}</p>
          </div>
        </div>
        <span
          className="text-xs font-medium px-2 py-0.5 rounded-full"
          style={{
            background: `${getFreshnessColor(source.freshness)}20`,
            color: getFreshnessColor(source.freshness),
          }}
        >
          {getFreshnessLabel(source.freshness)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-[var(--text3)]">Resolution</span>
          <p className="font-mono font-medium text-[var(--text)]">{source.resolution}</p>
        </div>
        <div>
          <span className="text-[var(--text3)]">Revisit</span>
          <p className="font-mono font-medium text-[var(--text)]">{source.revisit}</p>
        </div>
        <div>
          <span className="text-[var(--text3)]">Type</span>
          <p className="font-medium text-[var(--text)]">{source.type}</p>
        </div>
        <div>
          <span className="text-[var(--text3)]">Last Acquisition</span>
          <p className="font-mono font-medium text-[var(--text)]">{getAgeLabel(source.lastAcquisition)}</p>
        </div>
      </div>

      <div className="mt-3 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <span className="text-xs text-[var(--text3)]">{source.coverage}</span>
      </div>
    </div>
  );
}

function ConsensusPanel({ consensus, constellation }: { consensus: SatelliteConsensus; constellation: SatelliteConstellation }) {
  const healthPct = Math.round(consensus.vegetationHealth * 100);
  const healthColor = healthPct >= 65 ? 'var(--risk-low)' : healthPct >= 45 ? 'var(--risk-moderate)' : 'var(--risk-high)';

  return (
    <div
      className="rounded-xl p-5 mb-6"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ background: 'var(--green-wash)' }}
        >
          <Activity size={20} className="text-[var(--green)]" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--text)]">Multi-Sensor Consensus</h2>
          <p className="text-xs text-[var(--text3)]">Cross-validation from {consensus.dataSources.length} satellite sources</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg p-3" style={{ background: 'var(--bg)' }}>
          <p className="text-xs text-[var(--text3)] mb-1">Vegetation Health</p>
          <p className="text-2xl font-mono font-bold" style={{ color: healthColor }}>{healthPct}%</p>
        </div>
        <div className="rounded-lg p-3" style={{ background: 'var(--bg)' }}>
          <p className="text-xs text-[var(--text3)] mb-1">Change Confidence</p>
          <div className="flex items-center gap-2">
            {consensus.changeConfidence === 'high' ? (
              <CheckCircle size={18} style={{ color: 'var(--risk-low)' }} />
            ) : consensus.changeConfidence === 'medium' ? (
              <AlertTriangle size={18} style={{ color: 'var(--risk-moderate)' }} />
            ) : (
              <Clock size={18} style={{ color: 'var(--text3)' }} />
            )}
            <span className="text-lg font-semibold text-[var(--text)] capitalize">{consensus.changeConfidence}</span>
          </div>
        </div>
        <div className="rounded-lg p-3" style={{ background: 'var(--bg)' }}>
          <p className="text-xs text-[var(--text3)] mb-1">Phenology Phase</p>
          <p className="text-lg font-semibold text-[var(--text)]">{constellation.modis.phenologyPhase}</p>
        </div>
      </div>

      {consensus.threatType && (
        <div
          className="rounded-lg p-3 flex items-start gap-2"
          style={{ background: 'var(--risk-high)', color: '#fff' }}
        >
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold">Threat Detected</p>
            <p className="text-xs opacity-90">{consensus.threatType}</p>
          </div>
        </div>
      )}

      {!consensus.threatType && (
        <div
          className="rounded-lg p-3 flex items-center gap-2"
          style={{ background: `${healthColor}15`, color: healthColor }}
        >
          <CheckCircle size={16} />
          <p className="text-sm font-medium">
            {consensus.dataSources.length}/{consensus.dataSources.length} sensors confirm healthy vegetation status
          </p>
        </div>
      )}

      {consensus.gapsCovered.length > 0 && (
        <div className="mt-3 text-xs text-[var(--text3)]">
          <Layers size={12} className="inline mr-1" />
          {consensus.gapsCovered[0]}
        </div>
      )}
    </div>
  );
}

function AcquisitionTimeline({ sources }: { sources: SatelliteSourceCard[] }) {
  // Sort by last acquisition (most recent first), exclude static sources
  const dynamic = sources
    .filter(s => s.revisit !== 'Static')
    .sort((a, b) => new Date(b.lastAcquisition).getTime() - new Date(a.lastAcquisition).getTime());

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--bg2)', boxShadow: 'var(--shadow-card)' }}
    >
      <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Acquisition Timeline</h3>
      <div className="space-y-2">
        {dynamic.map(source => {
          const ageHours = (Date.now() - new Date(source.lastAcquisition).getTime()) / (1000 * 60 * 60);
          const barWidth = Math.max(5, Math.min(100, 100 - ageHours * 2));

          return (
            <div key={source.id} className="flex items-center gap-3">
              <span className="text-xs text-[var(--text3)] w-28 flex-shrink-0 truncate">{source.name}</span>
              <div className="flex-1 h-4 rounded-full overflow-hidden" style={{ background: 'var(--bg)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${barWidth}%`,
                    background: getFreshnessColor(source.freshness),
                    opacity: 0.7,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-[var(--text3)] w-16 text-right">{getAgeLabel(source.lastAcquisition)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page ───

export default function SatelliteConstellationPage() {
  const [sources, setSources] = useState<SatelliteSourceCard[]>([]);
  const [constellation, setConstellation] = useState<SatelliteConstellation | null>(null);
  const [consensus, setConsensus] = useState<SatelliteConsensus | null>(null);

  useEffect(() => {
    const srcs = generateSources();
    // Recalculate freshness
    const revisitMap: Record<string, number> = {
      'sentinel-2': 5, 'sentinel-1': 6, 'landsat': 8, 'modis': 1,
      'firms': 0.5, 'gfw': 7, 'gedi': 14, 'dem': 9999, 'smhi': 0.04, 'forestward': 1,
    };
    const updated = srcs.map(s => ({
      ...s,
      freshness: classifyFreshness(s.lastAcquisition, revisitMap[s.id] ?? 7),
    }));
    setSources(updated);

    const c = getDemoConstellation();
    setConstellation(c);
    setConsensus(calculateSatelliteConsensus(c));
  }, []);

  const freshCount = sources.filter(s => s.freshness === 'fresh').length;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/owner/intel" className="p-2 rounded-lg hover:bg-[var(--bg2)]">
            <ArrowLeft size={20} className="text-[var(--text3)]" />
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--text)]" style={{ fontFamily: 'var(--font-serif, "DM Serif Display", serif)' }}>
                Satellite Constellation
              </h1>
              <span
                className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: 'var(--green-wash)', color: 'var(--green)' }}
              >
                {sources.length} Sources
              </span>
            </div>
            <p className="text-sm text-[var(--text3)] mt-0.5">
              {freshCount}/{sources.length} sources reporting fresh data for your area
            </p>
          </div>
        </div>

        {/* Consensus Panel */}
        {constellation && consensus && (
          <ConsensusPanel consensus={consensus} constellation={constellation} />
        )}

        {/* Source Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {sources.map(source => (
            <SourceCard key={source.id} source={source} />
          ))}
        </div>

        {/* Timeline */}
        <AcquisitionTimeline sources={sources} />
      </div>
    </div>
  );
}

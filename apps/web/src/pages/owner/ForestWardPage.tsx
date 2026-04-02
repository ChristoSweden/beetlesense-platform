import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Satellite,
  Wifi,
  TreePine,
  Eye,
  ShieldCheck,
  Network,
  RefreshCw,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Activity,
} from 'lucide-react';
import { DEMO_PARCELS } from '@/lib/demoData';

// ── Demo data for ForestWard Observatory ───────────────────────────────────

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function getNextScheduled(): string {
  const d = new Date();
  d.setDate(d.getDate() + 5);
  return d.toISOString().slice(0, 10);
}

interface DataSource {
  id: string;
  name: string;
  icon: typeof Satellite;
  type: string;
  coverage: string;
  lastUpdate: string;
  metrics: string;
  confidence: number;
  color: string;
}

interface ResearchPartner {
  id: string;
  name: string;
  abbreviation: string;
  dataShared: string;
  lastSync: string;
  collaboration: string;
  url: string;
}

function useDemoForestWardData() {
  return useMemo(() => {
    const totalHectares = DEMO_PARCELS.reduce((sum, p) => sum + p.area_hectares, 0);

    const dataSources: DataSource[] = [
      {
        id: 'sentinel2',
        name: 'Copernicus Sentinel-2',
        icon: Satellite,
        type: 'Satellite',
        coverage: '100%',
        lastUpdate: getYesterday(),
        metrics: 'NDVI, change detection, canopy stress',
        confidence: 0.35,
        color: '#3b82f6',
      },
      {
        id: 'drone',
        name: 'Drone Surveys',
        icon: Eye,
        type: 'Aerial',
        coverage: '72%',
        lastUpdate: '2026-03-28',
        metrics: 'High-res orthomosaic, tree-level analysis',
        confidence: 0.30,
        color: '#8b5cf6',
      },
      {
        id: 'iot',
        name: 'IoT Sensor Network',
        icon: Wifi,
        type: 'Ground',
        coverage: '45%',
        lastUpdate: getToday(),
        metrics: 'Temperature, humidity, soil moisture',
        confidence: 0.20,
        color: '#10b981',
      },
      {
        id: 'field',
        name: 'Field Observations',
        icon: TreePine,
        type: 'Field',
        coverage: '38%',
        lastUpdate: '2026-03-30',
        metrics: 'Manual inspections, camera traps',
        confidence: 0.15,
        color: '#f59e0b',
      },
    ];

    const observatory = {
      detectionAccuracy: 94.2,
      hectaresMonitored: Math.round(totalHectares * 10) / 10,
      avgResponseDays: 3.2,
      emergencePredictionDays: 5,
      activeSensors: 3,
      droneSurveys: 12,
      fieldObservations: 47,
      sentinelLastPass: getYesterday(),
      lastAnalysis: getToday(),
      nextAnalysis: getNextScheduled(),
      dataQuality: 87,
      fusionConfidence: 91.4,
    };

    const compliance = [
      { id: 'eudr', label: 'EU Deforestation Regulation (EUDR)', status: 'compliant' as const, detail: 'Due diligence statements up to date' },
      { id: 'biodiversity', label: 'EU Biodiversity Strategy 2030', status: 'aligned' as const, detail: 'Monitoring protocols aligned with targets' },
      { id: 'lulucf', label: 'LULUCF Reporting', status: 'ready' as const, detail: 'Carbon stock data export-ready' },
      { id: 'export', label: 'Data Export Formats', status: 'available' as const, detail: 'GeoJSON, CSV, PDF, Shapefile' },
    ];

    const partners: ResearchPartner[] = [
      {
        id: 'efi',
        name: 'European Forest Institute',
        abbreviation: 'EFI',
        dataShared: 'Bark beetle risk models, climate projections',
        lastSync: '2026-03-31',
        collaboration: 'Research partnership',
        url: 'https://efi.int',
      },
      {
        id: 'slu',
        name: 'Swedish University of Agricultural Sciences',
        abbreviation: 'SLU',
        dataShared: 'National Forest Inventory data, growth models',
        lastSync: '2026-03-28',
        collaboration: 'Data exchange agreement',
        url: 'https://slu.se',
      },
      {
        id: 'skogsstyrelsen',
        name: 'Skogsstyrelsen (Swedish Forest Agency)',
        abbreviation: 'SKS',
        dataShared: 'kNN rasters, harvest notifications, habitat data',
        lastSync: getToday(),
        collaboration: 'Open data integration',
        url: 'https://skogsstyrelsen.se',
      },
      {
        id: 'smhi',
        name: 'SMHI (Swedish Meteorological Institute)',
        abbreviation: 'SMHI',
        dataShared: 'Weather forecasts, climate normals, precipitation',
        lastSync: getToday(),
        collaboration: 'Open API integration',
        url: 'https://smhi.se',
      },
    ];

    return { dataSources, observatory, compliance, partners };
  }, []);
}

// ── Status badge helper ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    compliant: { bg: 'rgba(74,222,128,0.12)', text: 'var(--green)', label: 'Compliant' },
    aligned: { bg: 'rgba(74,222,128,0.12)', text: 'var(--green)', label: 'Aligned' },
    ready: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', label: 'Ready' },
    available: { bg: 'rgba(139,92,246,0.12)', text: '#8b5cf6', label: 'Available' },
  };
  const c = config[status] ?? config.ready;
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function ForestWardPage() {
  const { i18n } = useTranslation();
  const lang = i18n.language === 'sv' ? 'sv' : 'en';
  const { dataSources, observatory, compliance, partners } = useDemoForestWardData();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto p-5 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--green)' }}
          >
            <Network size={20} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              {lang === 'sv' ? 'ForestWard Observatorium' : 'ForestWard Observatory'}
            </h1>
            <p className="text-xs text-[var(--text3)] mt-0.5">
              {lang === 'sv'
                ? 'BeetleSense integrerat med European Forest Institutes ForestWard Observatory -- AI, fjärranalys och markobservationer i samverkan.'
                : "BeetleSense integrated with the European Forest Institute's ForestWard Observatory -- coordinating AI, remote sensing, and ground observations."}
            </p>
          </div>
        </div>

        {/* Section 1: ForestWard Status Dashboard */}
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Activity size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'Statusoversikt' : 'Status Dashboard'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Sentinel-2 */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Satellite size={14} style={{ color: '#3b82f6' }} />
                <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">Sentinel-2</span>
              </div>
              <p className="text-xs text-[var(--text)]">
                {lang === 'sv' ? 'Senaste satellit-pass' : 'Last satellite pass'}:
                <span className="font-semibold ml-1">{observatory.sentinelLastPass}</span>
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                <RefreshCw size={10} className="text-[var(--green)] animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-[10px] text-[var(--green)]">
                  {lang === 'sv' ? 'Data uppdateras' : 'Data refreshing'}
                </span>
              </div>
            </div>

            {/* Sensors */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Wifi size={14} style={{ color: '#10b981' }} />
                <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
                  {lang === 'sv' ? 'Sensornätverk' : 'Sensor Network'}
                </span>
              </div>
              <p className="text-xs text-[var(--text)]">
                <span className="text-lg font-bold text-[var(--green)]">{observatory.activeSensors}</span>{' '}
                {lang === 'sv' ? 'aktiva sensorer' : 'sensors active'}
              </p>
            </div>

            {/* AI Pipeline */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} style={{ color: '#8b5cf6' }} />
                <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
                  {lang === 'sv' ? 'AI-pipeline' : 'AI Pipeline'}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text3)]">
                {lang === 'sv' ? 'Senaste analys' : 'Last analysis'}: <span className="text-[var(--text)] font-medium">{observatory.lastAnalysis}</span>
              </p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                {lang === 'sv' ? 'Nästa planerad' : 'Next scheduled'}: <span className="text-[var(--text)] font-medium">{observatory.nextAnalysis}</span>
              </p>
            </div>

            {/* Data Quality */}
            <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck size={14} style={{ color: '#f59e0b' }} />
                <span className="text-[10px] font-semibold text-[var(--text2)] uppercase tracking-wider">
                  {lang === 'sv' ? 'Datakvalitet' : 'Data Quality'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-[var(--text)]">{observatory.dataQuality}%</span>
                <span className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'täckning' : 'coverage'}</span>
              </div>
              <div className="w-full h-1.5 rounded-full mt-2" style={{ background: 'var(--border)' }}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${observatory.dataQuality}%`, background: 'var(--green)' }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Multi-Source Data Fusion */}
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Satellite size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'Multi-källa Datafusion' : 'Multi-Source Data Fusion'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dataSources.map((src) => {
              const Icon = src.icon;
              return (
                <div
                  key={src.id}
                  className="rounded-xl border border-[var(--border)] p-4"
                  style={{ background: 'var(--bg)' }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ background: `${src.color}15`, color: src.color }}
                      >
                        <Icon size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text)]">{src.name}</p>
                        <p className="text-[10px] text-[var(--text3)]">{src.type}</p>
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-full text-[9px] font-semibold"
                      style={{ background: `${src.color}15`, color: src.color }}
                    >
                      {src.coverage} {lang === 'sv' ? 'täckning' : 'coverage'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mb-2">{src.metrics}</p>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[var(--text3)]">
                      <Clock size={10} className="inline mr-1" />
                      {lang === 'sv' ? 'Senast' : 'Updated'}: {src.lastUpdate}
                    </span>
                    <span className="text-[var(--text2)] font-medium">
                      {lang === 'sv' ? 'Konfidensbidrag' : 'Confidence'}: {Math.round(src.confidence * 100)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Fusion score */}
          <div
            className="mt-3 rounded-xl border border-[var(--border)] p-4 flex items-center justify-between"
            style={{ background: 'var(--bg)' }}
          >
            <div>
              <p className="text-xs font-semibold text-[var(--text)]">
                {lang === 'sv' ? 'Fusionskonfidenspoäng' : 'Fusion Confidence Score'}
              </p>
              <p className="text-[10px] text-[var(--text3)] mt-0.5">
                {lang === 'sv'
                  ? 'Viktad kombination av alla datakällor'
                  : 'Weighted combination of all data sources'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[var(--green)]">{observatory.fusionConfidence}%</span>
              <CheckCircle2 size={18} className="text-[var(--green)]" />
            </div>
          </div>
        </section>

        {/* Section 3: Observatory Metrics */}
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Eye size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'Nyckeltal' : 'Observatory Metrics'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label={lang === 'sv' ? 'Detektionsnoggrannhet' : 'Detection Accuracy'}
              value={`${observatory.detectionAccuracy}%`}
              detail={lang === 'sv' ? 'Tidig barkborredetektion (Sentinel-2 + AI)' : 'Early beetle detection (Sentinel-2 + AI)'}
              icon={<ShieldCheck size={16} />}
              color="var(--green)"
            />
            <MetricCard
              label={lang === 'sv' ? 'Bevakning' : 'Coverage'}
              value={`${observatory.hectaresMonitored} ha`}
              detail={lang === 'sv' ? 'Under kontinuerlig övervakning' : 'Under continuous monitoring'}
              icon={<Satellite size={16} />}
              color="#3b82f6"
            />
            <MetricCard
              label={lang === 'sv' ? 'Responstid' : 'Response Time'}
              value={`${observatory.avgResponseDays} ${lang === 'sv' ? 'dagar' : 'days'}`}
              detail={lang === 'sv' ? 'Snittid larm till inspektion' : 'Average alert-to-inspection'}
              icon={<Clock size={16} />}
              color="#f59e0b"
            />
            <MetricCard
              label={lang === 'sv' ? 'Prediktion' : 'Predictions'}
              value={`±${observatory.emergencePredictionDays} ${lang === 'sv' ? 'dagar' : 'days'}`}
              detail={lang === 'sv' ? 'Precision för svärmningsprognos' : 'Beetle emergence prediction accuracy'}
              icon={<AlertTriangle size={16} />}
              color="#8b5cf6"
            />
          </div>
          {/* Additional counts */}
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-bold text-[var(--text)]">{observatory.droneSurveys}</p>
              <p className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Drönarflygningar' : 'Drone Surveys'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-bold text-[var(--text)]">{observatory.fieldObservations}</p>
              <p className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'Fältobservationer' : 'Field Observations'}</p>
            </div>
            <div className="rounded-xl border border-[var(--border)] p-3 text-center" style={{ background: 'var(--bg)' }}>
              <p className="text-lg font-bold text-[var(--text)]">{observatory.activeSensors}</p>
              <p className="text-[10px] text-[var(--text3)]">{lang === 'sv' ? 'IoT-sensorer' : 'IoT Sensors'}</p>
            </div>
          </div>
        </section>

        {/* Section 4: EU Compliance & Reporting */}
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <ShieldCheck size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'EU-efterlevnad & Rapportering' : 'EU Compliance & Reporting'}
          </h2>
          <div className="space-y-2">
            {compliance.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[var(--border)] p-3 flex items-center justify-between"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-[var(--text)]">{item.label}</p>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">{item.detail}</p>
                </div>
                {item.id === 'export' && (
                  <button className="ml-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:border-[var(--green)] transition-colors">
                    <Download size={10} />
                    {lang === 'sv' ? 'Exportera' : 'Export'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Section 5: Research Network */}
        <section>
          <h2 className="text-sm font-serif font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
            <Network size={14} className="text-[var(--green)]" />
            {lang === 'sv' ? 'Forskningsnätverk' : 'Research Network'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {partners.map((p) => (
              <div
                key={p.id}
                className="rounded-xl border border-[var(--border)] p-4"
                style={{ background: 'var(--bg)' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-[var(--text)]">{p.name}</p>
                    <span className="text-[10px] text-[var(--text3)] font-mono">{p.abbreviation}</span>
                  </div>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text3)] hover:text-[var(--green)] transition-colors"
                    aria-label={`Visit ${p.name}`}
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
                <p className="text-[10px] text-[var(--text2)] mb-2">{p.dataShared}</p>
                <div className="flex items-center justify-between text-[10px] text-[var(--text3)]">
                  <span>{p.collaboration}</span>
                  <span>
                    <Clock size={10} className="inline mr-1" />
                    {lang === 'sv' ? 'Synk' : 'Sync'}: {p.lastSync}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Metric Card ────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  detail,
  icon,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg)' }}>
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-lg font-bold text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)] mt-0.5">{detail}</p>
    </div>
  );
}

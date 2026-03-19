import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Scan,
  Sparkles,
  Upload,
  FileText,
  MapPin,
  Calendar,
  Loader2,
  Download,
  Layers,
  Thermometer,
  Camera,
  Radar,
  Trees,
  Bug,
  Heart,
  Droplets,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Activity,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_SURVEYS, DEMO_PARCELS } from '@/lib/demoData';
import { SurveyStatusTracker } from '@/components/survey/SurveyStatusTracker';
import { CompanionPanel } from '@/components/companion/CompanionPanel';
import { BaseMap } from '@/components/map/BaseMap';
import { ANALYSIS_MODULES, type AnalysisModule } from '@/components/survey/ModuleCard';
import { useSensorProducts, type SensorType, type SensorProduct, type FusionProduct } from '@/hooks/useSensorProducts';
import { useTreeInventory } from '@/hooks/useTreeInventory';
import type maplibregl from 'maplibre-gl';

// Behavioral science components (lazy-loaded)
const PeakEndSummary = React.lazy(() => import('@/components/behavioral/PeakEndSummary'));

function BehavioralFallback() {
  return <div className="h-16 rounded-xl bg-[var(--bg3)] animate-pulse" />;
}

interface SurveyDetail {
  id: string;
  name: string;
  status: string;
  priority: string;
  modules: AnalysisModule[];
  created_at: string;
  parcel_id: string;
  parcel_name: string;
  parcel_area: number;
}

export default function SurveyDetailPage() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [survey, setSurvey] = useState<SurveyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [_map, setMap] = useState<maplibregl.Map | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const {
    bySensorType,
    fusionProducts,
    loading: sensorLoading,
    getDownloadUrl,
  } = useSensorProducts({ surveyId: id });

  const {
    stats: treeStats,
    loading: treeLoading,
  } = useTreeInventory({ surveyId: id });

  const handleDownload = useCallback(async (storagePath: string) => {
    const url = await getDownloadUrl(storagePath);
    if (url) {
      window.open(url, '_blank');
    }
  }, [getDownloadUrl]);

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m);
  }, []);

  // Fetch survey detail
  useEffect(() => {
    async function loadSurvey() {
      if (!id) return;
      setIsLoading(true);

      if (isDemo()) {
        const demoSurvey = DEMO_SURVEYS.find((s) => s.id === id);
        if (demoSurvey) {
          const demoParcel = DEMO_PARCELS.find((p) => p.id === demoSurvey.parcel_id);
          setSurvey({
            id: demoSurvey.id,
            name: demoSurvey.name,
            status: demoSurvey.status,
            priority: demoSurvey.priority,
            modules: demoSurvey.modules as AnalysisModule[],
            created_at: demoSurvey.created_at,
            parcel_id: demoSurvey.parcel_id,
            parcel_name: demoSurvey.parcel_name,
            parcel_area: demoParcel?.area_hectares ?? 0,
          });
        }
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('surveys')
        .select('id, name, status, priority, modules, created_at, parcel_id, parcels(name, area_hectares)')
        .eq('id', id)
        .single();

      if (!error && data) {
        const parcels = data.parcels as unknown as Record<string, unknown> | null;
        setSurvey({
          id: data.id,
          name: data.name ?? 'Untitled Survey',
          status: data.status ?? 'draft',
          priority: data.priority ?? 'standard',
          modules: (data.modules as AnalysisModule[]) ?? [],
          created_at: data.created_at,
          parcel_id: data.parcel_id,
          parcel_name: (parcels?.name as string) ?? 'Unknown',
          parcel_area: (parcels?.area_hectares as number) ?? 0,
        });
      }

      setIsLoading(false);
    }

    loadSurvey();
  }, [id]);

  const handleGenerateReport = async () => {
    if (!survey) return;
    setIsGenerating(true);
    setReportError(null);
    setReportGenerated(false);

    const { error } = await supabase.from('reports').insert({
      survey_id: survey.id,
      report_type: 'standard',
      language: 'sv',
    });

    setIsGenerating(false);

    if (error) {
      setReportError('Failed to generate report. Please try again.');
    } else {
      setReportGenerated(true);
    }
  };

  const dateStr = survey
    ? new Date(survey.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : '';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <p className="text-sm text-[var(--text2)]">Survey not found</p>
        </div>
      </div>
    );
  }

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: 'Draft', color: 'text-[var(--text3)]', bg: 'bg-forest-700/50' },
    processing: { label: 'Processing', color: 'text-amber', bg: 'bg-amber/10' },
    complete: { label: 'Complete', color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10' },
    failed: { label: 'Failed', color: 'text-danger', bg: 'bg-danger/10' },
  };

  const sc = statusConfig[survey.status] ?? statusConfig.draft;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/surveys" className="hover:text-[var(--text2)]">
          {t('nav.surveys')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{survey.name}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center flex-shrink-0">
            <Scan size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <h1 className="text-xl font-serif font-bold text-[var(--text)]">{survey.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${sc.color} ${sc.bg}`}>
                {sc.label}
              </span>
              {survey.priority === 'priority' && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-semibold bg-amber/10 text-amber">
                  PRIORITY
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setCompanionOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Sparkles size={14} className="text-[var(--green)]" />
            Ask AI
          </button>
          {survey.status === 'complete' && (
            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors disabled:opacity-50"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <FileText size={14} />
              )}
              Generate Report
            </button>
          )}
        </div>
      </div>

      {/* Report feedback */}
      {reportGenerated && (
        <div className="mb-6 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/10 px-4 py-3 text-xs text-[var(--green)]">
          Report generation started. You will be notified when it is ready.
        </div>
      )}
      {reportError && (
        <div className="mb-6 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-xs text-danger">
          {reportError}
        </div>
      )}

      {/* Info cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex items-center gap-2 mb-1">
            <MapPin size={12} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Parcel</span>
          </div>
          <p className="text-xs font-medium text-[var(--text)]">{survey.parcel_name}</p>
          <p className="text-[10px] text-[var(--text3)] font-mono">{survey.parcel_area.toFixed(1)} ha</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={12} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Date</span>
          </div>
          <p className="text-xs font-medium text-[var(--text)]">{dateStr}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Scan size={12} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Modules</span>
          </div>
          <p className="text-xs font-medium text-[var(--text)]">{survey.modules.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
          <div className="flex items-center gap-2 mb-1">
            <Upload size={12} className="text-[var(--green)]" />
            <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Data</span>
          </div>
          <Link
            to="/owner/capture"
            className="text-xs font-medium text-[var(--green)] hover:underline"
          >
            Upload Photos
          </Link>
        </div>
      </div>

      {/* Map showing survey area */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden mb-6 h-64 lg:h-80">
        <BaseMap onMapReady={handleMapReady} />
      </div>

      {/* Module badges */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">Analysis Modules</h2>
        <div className="flex flex-wrap gap-2">
          {survey.modules.map((modId) => {
            const mod = ANALYSIS_MODULES.find((m) => m.id === modId);
            return mod ? (
              <span
                key={modId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-800 text-xs text-[var(--text2)] border border-[var(--border)]"
              >
                {mod.icon} {mod.title}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* ─── Bearbetningsstatus ─── */}
      {survey.status === 'processing' && <ProcessingStatusCard />}

      {/* ─── Peak-End Summary — emotional highlight of sensor results ─── */}
      <div className="mb-6">
        <Suspense fallback={<BehavioralFallback />}>
          <PeakEndSummary />
        </Suspense>
      </div>

      {/* ─── Sensordata & Analyser ─── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Layers size={16} className="text-[var(--green)]" />
          Sensordata &amp; Analyser
        </h2>

        {sensorLoading ? (
          <SensorSkeleton />
        ) : (
          <>
            {/* Sensor products by type */}
            <SensorTypeGrid
              sensorType="multispectral"
              label="Multispektral"
              icon={<Layers size={14} className="text-emerald-400" />}
              products={bySensorType.multispectral}
              onDownload={handleDownload}
            />
            <SensorTypeGrid
              sensorType="thermal"
              label="Termisk"
              icon={<Thermometer size={14} className="text-orange-400" />}
              products={bySensorType.thermal}
              onDownload={handleDownload}
            />
            <SensorTypeGrid
              sensorType="rgb"
              label="RGB"
              icon={<Camera size={14} className="text-blue-400" />}
              products={bySensorType.rgb}
              onDownload={handleDownload}
            />
            <SensorTypeGrid
              sensorType="lidar"
              label="LiDAR"
              icon={<Radar size={14} className="text-violet-400" />}
              products={bySensorType.lidar}
              onDownload={handleDownload}
            />

            {/* Fusion products */}
            {fusionProducts.length > 0 && (
              <div className="mt-6">
                <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Sparkles size={12} className="text-[var(--green)]" />
                  Fusionprodukter
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {fusionProducts.map((fp) => (
                    <FusionCard key={fp.id} product={fp} onDownload={handleDownload} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── Trädbestånd (Tree Inventory) ─── */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
          <Trees size={16} className="text-[var(--green)]" />
          Trädbestånd
        </h2>

        {treeLoading ? (
          <TreeSkeleton />
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <StatCard label="Antal träd" value={treeStats.count.toLocaleString('sv-SE')} />
              <StatCard label="Medelhöjd" value={treeStats.avgHeight != null ? `${treeStats.avgHeight} m` : '–'} />
              <StatCard label="Medelhälsa" value={`${treeStats.avgHealth}/100`} color={treeStats.avgHealth >= 70 ? 'text-[var(--green)]' : treeStats.avgHealth >= 40 ? 'text-amber' : 'text-danger'} />
              <StatCard label="Stressade träd" value={`${treeStats.stressedCount} (${treeStats.stressedPct}%)`} color={treeStats.stressedCount > 0 ? 'text-amber' : 'text-[var(--green)]'} icon={treeStats.stressedCount > 0 ? <AlertTriangle size={12} className="text-amber" /> : undefined} />
            </div>

            {/* Extra stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
              <StatCard label="Total volym" value={`${treeStats.totalVolume.toLocaleString('sv-SE')} m\u00B3`} />
              <StatCard label="Medel-DBH" value={treeStats.avgDbh != null ? `${treeStats.avgDbh} cm` : '–'} />
              {Object.keys(treeStats.stressTypes).length > 0 && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
                  <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Stresstyper</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(treeStats.stressTypes).map(([type, count]) => (
                      <span key={type} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber/10 text-amber text-[10px] font-medium">
                        {STRESS_TYPE_LABELS[type] ?? type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Species breakdown */}
            {treeStats.speciesBreakdown.length > 0 && (
              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
                <h3 className="text-xs font-semibold text-[var(--text2)] mb-3 flex items-center gap-2">
                  <BarChart3 size={12} className="text-[var(--green)]" />
                  Artfördelning
                </h3>
                <div className="space-y-2">
                  {treeStats.speciesBreakdown.map((sp) => (
                    <div key={sp.species} className="flex items-center gap-3">
                      <span className="text-xs text-[var(--text)] w-16 flex-shrink-0 font-medium">{sp.species}</span>
                      <div className="flex-1 h-2 rounded-full bg-forest-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--green)]"
                          style={{ width: `${sp.percentage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[var(--text3)] w-12 text-right font-mono">{sp.percentage}%</span>
                      <span className="text-[10px] text-[var(--text3)] w-16 text-right">{sp.count} st</span>
                      <span className="text-[10px] text-[var(--text3)] w-16 text-right">H: {sp.avgHealth}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Real-time status tracker */}
      <SurveyStatusTracker surveyId={survey.id} selectedModules={survey.modules} />

      {/* AI Companion */}
      <CompanionPanel
        isOpen={companionOpen}
        onToggle={() => setCompanionOpen(!companionOpen)}
        parcelId={survey.parcel_id}
      />
    </div>
  );
}

// ─── Constants ───

const STRESS_TYPE_LABELS: Record<string, string> = {
  beetle: 'Barkborre',
  drought: 'Torka',
  disease: 'Sjukdom',
  mechanical: 'Mekanisk',
};

const PRODUCT_NAME_LABELS: Record<string, string> = {
  ndvi: 'NDVI',
  ndre: 'NDRE',
  evi: 'EVI',
  chlorophyll_index: 'Klorofyllindex',
  temperature: 'Temperatur',
  thermal_anomaly: 'Termisk anomali',
  orthomosaic: 'Ortomosaik',
  dsm: 'Digital ytmodell (DSM)',
  canopy_height_model: 'Kronhöjdsmodell (CHM)',
  dtm: 'Digital terrängmodell (DTM)',
  classified_pointcloud: 'Klassificerat punktmoln',
  beetle_stress: 'Barkborrestress',
  crown_health: 'Kronhälsa',
  moisture_stress: 'Fuktstress',
  tree_inventory: 'Trädbestånd',
};

const FUSION_ICONS: Record<string, React.ReactNode> = {
  beetle_stress: <Bug size={16} className="text-red-400" />,
  crown_health: <Heart size={16} className="text-emerald-400" />,
  moisture_stress: <Droplets size={16} className="text-blue-400" />,
  tree_inventory: <Trees size={16} className="text-[var(--green)]" />,
};

// ─── Helper components ───

function SensorSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3, 4].map((i) => (
        <div key={i}>
          <div className="h-4 w-28 rounded bg-forest-800 mb-2" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2].map((j) => (
              <div key={j} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 h-24" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 h-16" />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 h-32" />
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
      <p className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">{label}</p>
      <div className="flex items-center gap-1.5">
        {icon}
        <p className={`text-sm font-semibold ${color ?? 'text-[var(--text)]'}`}>{value}</p>
      </div>
    </div>
  );
}

function SensorTypeGrid({
  sensorType: _sensorType,
  label,
  icon,
  products,
  onDownload,
}: {
  sensorType: SensorType;
  label: string;
  icon: React.ReactNode;
  products: SensorProduct[];
  onDownload: (path: string) => void;
}) {
  if (products.length === 0) return null;

  return (
    <div className="mb-4">
      <h3 className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider mb-2 flex items-center gap-2">
        {icon}
        {label}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {products.map((product) => (
          <SensorProductCard key={product.id} product={product} onDownload={onDownload} />
        ))}
      </div>
    </div>
  );
}

function SensorProductCard({
  product,
  onDownload,
}: {
  product: SensorProduct;
  onDownload: (path: string) => void;
}) {
  const meta = product.metadata;
  const displayName = PRODUCT_NAME_LABELS[product.product_name] ?? product.product_name;

  // Extract min/max/mean from metadata (various key patterns)
  const min = (meta.min ?? meta.min_celsius) as number | undefined;
  const max = (meta.max ?? meta.max_celsius) as number | undefined;
  const mean = (meta.mean ?? meta.mean_celsius) as number | undefined;
  const unit = (meta.unit as string) ?? (meta.min_celsius != null ? '\u00B0C' : '');

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3 flex flex-col justify-between hover:border-[var(--green)]/30 transition-colors">
      <div>
        <p className="text-xs font-medium text-[var(--text)] mb-1">{displayName}</p>
        {(min != null || max != null || mean != null) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-[var(--text3)] font-mono">
            {min != null && <span>Min: {min}{unit}</span>}
            {max != null && <span>Max: {max}{unit}</span>}
            {mean != null && <span>Med: {mean}{unit}</span>}
          </div>
        )}
        {meta.resolution_cm != null && (
          <p className="text-[10px] text-[var(--text3)] mt-0.5">{meta.resolution_cm as number} cm upplösning</p>
        )}
      </div>
      <button
        onClick={() => onDownload(product.storage_path)}
        className="mt-2 flex items-center gap-1 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors self-start"
      >
        <Download size={10} />
        Ladda ner
      </button>
    </div>
  );
}

function FusionCard({
  product,
  onDownload,
}: {
  product: FusionProduct;
  onDownload: (path: string) => void;
}) {
  const displayName = PRODUCT_NAME_LABELS[product.product_name] ?? product.product_name;
  const icon = FUSION_ICONS[product.product_name] ?? <Sparkles size={16} className="text-[var(--green)]" />;
  const meta = product.metadata;

  // Build key stats from metadata
  const stats: Array<{ label: string; value: string }> = [];

  if (meta.affected_area_pct != null) stats.push({ label: 'Drabbat', value: `${meta.affected_area_pct}%` });
  if (meta.confidence_mean != null) stats.push({ label: 'Konfidens', value: `${Math.round((meta.confidence_mean as number) * 100)}%` });
  if (meta.total_crowns != null) stats.push({ label: 'Kronor', value: `${meta.total_crowns}` });
  if (meta.healthy_pct != null) stats.push({ label: 'Friska', value: `${meta.healthy_pct}%` });
  if (meta.stressed_pct != null) stats.push({ label: 'Stressade', value: `${meta.stressed_pct}%` });
  if (meta.cwsi_mean != null) stats.push({ label: 'CWSI medel', value: `${meta.cwsi_mean}` });
  if (meta.drought_risk_area_pct != null) stats.push({ label: 'Torkrisk', value: `${meta.drought_risk_area_pct}%` });
  if (meta.tree_count != null) stats.push({ label: 'Träd', value: `${meta.tree_count}` });
  if (meta.mean_height_m != null) stats.push({ label: 'Medelhöjd', value: `${meta.mean_height_m} m` });

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 hover:border-[var(--green)]/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-xs font-semibold text-[var(--text)]">{displayName}</p>
      </div>
      <div className="flex items-center gap-1 mb-2 flex-wrap">
        {product.sensors_used.map((s) => (
          <span key={s} className="px-1.5 py-0.5 rounded bg-forest-800 text-[9px] text-[var(--text3)]">
            {s}
          </span>
        ))}
      </div>
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 mb-2">
          {stats.map((s) => (
            <div key={s.label} className="flex justify-between text-[10px]">
              <span className="text-[var(--text3)]">{s.label}</span>
              <span className="text-[var(--text)] font-mono">{s.value}</span>
            </div>
          ))}
        </div>
      )}
      {meta.model_version && (
        <p className="text-[9px] text-[var(--text3)] mb-2">Modell v{String(meta.model_version)}</p>
      )}
      <button
        onClick={() => onDownload(product.storage_path)}
        className="flex items-center gap-1 text-[10px] font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors"
      >
        <Download size={10} />
        Ladda ner
      </button>
    </div>
  );
}

// ─── Processing Status ───

type ProcessingState = 'queued' | 'processing' | 'complete';

interface SensorProcessingStatus {
  key: string;
  label: string;
  icon: React.ReactNode;
  state: ProcessingState;
  progress: number; // 0–100
  estimatedMinutes: number | null;
}

const DEMO_PROCESSING_STATUS: SensorProcessingStatus[] = [
  {
    key: 'multispectral',
    label: 'Multispektral',
    icon: <Layers size={14} className="text-emerald-400" />,
    state: 'complete',
    progress: 100,
    estimatedMinutes: null,
  },
  {
    key: 'thermal',
    label: 'Termisk',
    icon: <Thermometer size={14} className="text-orange-400" />,
    state: 'processing',
    progress: 65,
    estimatedMinutes: 4,
  },
  {
    key: 'rgb',
    label: 'RGB',
    icon: <Camera size={14} className="text-blue-400" />,
    state: 'queued',
    progress: 0,
    estimatedMinutes: 12,
  },
  {
    key: 'lidar',
    label: 'LiDAR',
    icon: <Radar size={14} className="text-violet-400" />,
    state: 'queued',
    progress: 0,
    estimatedMinutes: 8,
  },
];

function ProcessingStatusCard() {
  const [statuses, setStatuses] = useState<SensorProcessingStatus[]>(DEMO_PROCESSING_STATUS);
  const [allComplete, setAllComplete] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  // Calculate overall progress
  const overallProgress = Math.round(
    statuses.reduce((sum, s) => sum + s.progress, 0) / statuses.length,
  );

  // Simulate progress advancing
  useEffect(() => {
    const interval = setInterval(() => {
      setStatuses((prev) => {
        const next = prev.map((s) => {
          if (s.state === 'complete') return s;
          if (s.state === 'processing') {
            const newProgress = Math.min(s.progress + Math.random() * 3, 100);
            if (newProgress >= 100) {
              return { ...s, state: 'complete' as ProcessingState, progress: 100, estimatedMinutes: null };
            }
            const remaining = s.estimatedMinutes != null ? Math.max(0, s.estimatedMinutes - 0.1) : null;
            return { ...s, progress: Math.round(newProgress), estimatedMinutes: remaining != null ? Math.round(remaining * 10) / 10 : null };
          }
          // queued: start processing once the previous sensor is complete
          const idx = prev.findIndex((x) => x.key === s.key);
          const prevSensor = idx > 0 ? prev[idx - 1] : null;
          if (!prevSensor || prevSensor.state === 'complete') {
            return { ...s, state: 'processing' as ProcessingState, progress: 1 };
          }
          return s;
        });
        return next;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Detect all complete
  useEffect(() => {
    if (statuses.every((s) => s.state === 'complete') && !allComplete) {
      setAllComplete(true);
      setShowBanner(true);
      const timer = setTimeout(() => setShowBanner(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [statuses, allComplete]);

  const stateLabel: Record<ProcessingState, string> = {
    queued: 'I kö',
    processing: 'Bearbetar',
    complete: 'Klar',
  };

  const stateBadgeClasses: Record<ProcessingState, string> = {
    queued: 'bg-forest-700/50 text-[var(--text3)]',
    processing: 'bg-amber/10 text-amber',
    complete: 'bg-[var(--green)]/10 text-[var(--green)]',
  };

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-[var(--text)] mb-4 flex items-center gap-2">
        <Activity size={16} className="text-amber" />
        Bearbetningsstatus
      </h2>

      {/* Success banner */}
      {showBanner && (
        <div
          className="mb-4 rounded-lg border border-[var(--green)]/30 bg-[var(--green)]/10 px-4 py-3 text-xs text-[var(--green)] flex items-center gap-2"
          style={{ animation: 'fade-in 0.3s ease-out' }}
        >
          <CheckCircle2 size={14} />
          All bearbetning slutförd! Sensordata är nu tillgänglig.
        </div>
      )}

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4">
        {/* Overall progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[var(--text2)]">Total framsteg</span>
            <span className="text-xs font-mono text-[var(--text)]">{overallProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-forest-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-500 ease-out"
              style={{
                width: `${overallProgress}%`,
                animation: overallProgress < 100 ? 'pulse-bar 2s ease-in-out infinite' : 'none',
              }}
            />
          </div>
        </div>

        {/* Per-sensor statuses */}
        <div className="space-y-3">
          {statuses.map((sensor) => (
            <div
              key={sensor.key}
              className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] p-3 transition-all duration-300"
              style={sensor.state === 'processing' ? { animation: 'pulse-subtle 2s ease-in-out infinite' } : undefined}
            >
              {/* Icon */}
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-forest-800 flex items-center justify-center">
                {sensor.state === 'complete' ? (
                  <CheckCircle2 size={14} className="text-[var(--green)]" />
                ) : (
                  sensor.icon
                )}
              </div>

              {/* Label + progress bar */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-[var(--text)]">{sensor.label}</span>
                  <div className="flex items-center gap-2">
                    {sensor.state === 'processing' && sensor.estimatedMinutes != null && (
                      <span className="text-[10px] text-[var(--text3)] flex items-center gap-1">
                        <Clock size={10} />
                        ~{Math.ceil(sensor.estimatedMinutes)} min kvar
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${stateBadgeClasses[sensor.state]}`}>
                      {stateLabel[sensor.state]}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-forest-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ease-out ${
                      sensor.state === 'complete'
                        ? 'bg-[var(--green)]'
                        : sensor.state === 'processing'
                          ? 'bg-amber'
                          : 'bg-forest-700'
                    }`}
                    style={{ width: `${sensor.progress}%` }}
                  />
                </div>
                {sensor.state === 'processing' && (
                  <span className="text-[10px] font-mono text-[var(--text3)] mt-0.5 block">{sensor.progress}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyframe animations for pulsing and fade-in */}
      <style>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes pulse-bar {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

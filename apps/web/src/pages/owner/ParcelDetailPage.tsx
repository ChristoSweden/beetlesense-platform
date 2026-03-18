import React, { useState, useEffect, Suspense } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  TreePine,
  MapPin,
  Mountain,
  Layers,
  Calendar,
  ClipboardList,
  Plus,
  AlertCircle,
  Loader2,
  SplitSquareHorizontal,
  Users,
  BarChart3,
  AlertTriangle,
  Camera,
  Thermometer,
  Scan,
  Satellite,
  Activity,
} from 'lucide-react';
import { isDemo, DEMO_PARCELS, DEMO_SURVEYS } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { BeforeAfterSlider } from '@/components/comparison/BeforeAfterSlider';
import { TimelineSelector } from '@/components/comparison/TimelineSelector';
import { NeighborBenchmark } from '@/components/comparison/NeighborBenchmark';
import { HistoricalTrend } from '@/components/comparison/HistoricalTrend';
import { useComparisonData } from '@/hooks/useComparisonData';
import { useRegulatoryData } from '@/hooks/useRegulatoryData';
import { RegulatoryCheckButton } from '@/components/regulatory/RegulatoryCheckButton';
import { RegulatoryPanel } from '@/components/regulatory/RegulatoryPanel';
import { ShareParcelModal } from '@/components/sharing/ShareParcelModal';
import { ExportButton } from '@/components/export/ExportButton';
import { useTreeInventory } from '@/hooks/useTreeInventory';
import { useSensorProducts } from '@/hooks/useSensorProducts';
import type { SensorType } from '@/hooks/useSensorProducts';

// Behavioral science components (lazy-loaded)
const PeakEndSummary = React.lazy(() => import('@/components/behavioral/PeakEndSummary'));
const AnchoringComparison = React.lazy(() => import('@/components/behavioral/AnchoringComparison'));

function BehavioralFallback() {
  return <div className="h-16 rounded-xl bg-[var(--bg3)] animate-pulse" />;
}

/* ── Types ── */

interface ParcelDetail {
  id: string;
  name: string;
  area_hectares: number;
  status: 'healthy' | 'at_risk' | 'infested' | 'unknown';
  last_survey: string | null;
  municipality: string;
  species_mix: { species: string; pct: number }[];
  elevation_m: number;
  soil_type: string;
  registered_at: string;
}

interface Survey {
  id: string;
  parcel_id: string;
  name: string;
  status: string;
  modules: string[];
  priority?: string;
  created_at: string;
  updated_at: string;
  results_summary?: string | null;
}

/* ── Status helpers ── */

const STATUS_STYLES: Record<string, string> = {
  healthy: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  at_risk: 'bg-[var(--amber)]/10 text-[var(--amber)] border-[var(--amber)]/20',
  infested: 'bg-red-500/10 text-red-400 border-red-500/20',
  unknown: 'bg-[var(--text3)]/10 text-[var(--text3)] border-[var(--text3)]/20',
};

const STATUS_DOT: Record<string, string> = {
  healthy: 'bg-[var(--green)]',
  at_risk: 'bg-[var(--amber)]',
  infested: 'bg-red-400',
  unknown: 'bg-[var(--text3)]',
};

function statusLabel(status: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    healthy: t('owner.parcels.healthy'),
    at_risk: t('owner.parcels.atRisk'),
    infested: t('owner.parcels.infested'),
    unknown: t('owner.parcels.unknown'),
  };
  return labels[status] ?? labels.unknown;
}

function statusBadge(status: string, t: (key: string) => string) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${STATUS_STYLES[status] ?? STATUS_STYLES.unknown}`}
    >
      {statusLabel(status, t)}
    </span>
  );
}

const SURVEY_STATUS_STYLES: Record<string, string> = {
  complete: 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/20',
  processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  draft: 'bg-[var(--text3)]/10 text-[var(--text3)] border-[var(--text3)]/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
};

function surveyStatusBadge(status: string) {
  const label = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${SURVEY_STATUS_STYLES[status] ?? SURVEY_STATUS_STYLES.draft}`}
    >
      {label}
    </span>
  );
}

/* ── Page ── */

export default function ParcelDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const [parcel, setParcel] = useState<ParcelDetail | null>(null);
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'compare'>('overview');
  const [selectedBefore, setSelectedBefore] = useState<string | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<string | null>(null);
  const comparison = useComparisonData(id);
  const [regulatoryPanelOpen, setRegulatoryPanelOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const { zones, constraintCount, isLoading: regulatoryLoading } = useRegulatoryData(id);
  const { stats: treeStats, loading: treeLoading } = useTreeInventory({ parcelId: id });
  const { bySensorType, fusionProducts, loading: sensorLoading } = useSensorProducts({ parcelId: id });

  // Resolve parcel center for the map (demo parcels have center, otherwise default)
  const parcelCenter: [number, number] = (() => {
    if (isDemo() || !isSupabaseConfigured) {
      const demo = DEMO_PARCELS.find((p) => p.id === id);
      return demo?.center ?? [15.0, 57.2];
    }
    return [15.0, 57.2];
  })();

  // Auto-select first two dates when data loads
  useEffect(() => {
    if (comparison.availableDates.length >= 2 && !selectedBefore && !selectedAfter) {
      const sorted = [...comparison.availableDates].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );
      setSelectedBefore(sorted[sorted.length - 2].date);
      setSelectedAfter(sorted[sorted.length - 1].date);
    }
  }, [comparison.availableDates, selectedBefore, selectedAfter]);

  useEffect(() => {
    let cancelled = false;

    async function loadParcel() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          // Demo fallback
          const demo = DEMO_PARCELS.find((p) => p.id === id);
          if (!cancelled) {
            if (demo) {
              setParcel({
                id: demo.id,
                name: demo.name,
                area_hectares: demo.area_hectares,
                status: demo.status,
                last_survey: demo.last_survey,
                municipality: demo.municipality,
                species_mix: demo.species_mix,
                elevation_m: demo.elevation_m,
                soil_type: demo.soil_type,
                registered_at: demo.registered_at,
              });
              setSurveys(DEMO_SURVEYS.filter((s) => s.parcel_id === demo.id));
            } else {
              setParcel(null);
            }
          }
        } else {
          // Fetch from Supabase
          const { data: row, error: parcelError } = await supabase
            .from('parcels')
            .select('id, name, area_ha, status, municipality, metadata, created_at, updated_at')
            .eq('id', id!)
            .single();

          if (parcelError) throw parcelError;

          if (!cancelled && row) {
            const meta = (row.metadata as Record<string, any>) ?? {};
            setParcel({
              id: row.id,
              name: row.name,
              area_hectares: row.area_ha ?? 0,
              status: row.status ?? 'unknown',
              last_survey: row.updated_at ?? null,
              municipality: row.municipality ?? '',
              species_mix: meta.species_mix ?? [],
              elevation_m: meta.elevation_m ?? 0,
              soil_type: meta.soil_type ?? 'Unknown',
              registered_at: row.created_at
                ? new Date(row.created_at).toLocaleDateString()
                : '',
            });
          }

          // Fetch related surveys
          const { data: surveyRows, error: surveyError } = await supabase
            .from('surveys')
            .select('id, parcel_id, status, modules, flight_date, created_at')
            .eq('parcel_id', id!)
            .order('created_at', { ascending: false });

          if (surveyError) throw surveyError;

          if (!cancelled) {
            setSurveys(
              (surveyRows ?? []).map((s) => ({
                id: s.id,
                parcel_id: s.parcel_id,
                name: `Survey ${s.flight_date ? new Date(s.flight_date).toLocaleDateString() : new Date(s.created_at).toLocaleDateString()}`,
                status: s.status ?? 'draft',
                modules: Array.isArray(s.modules) ? s.modules : [],
                created_at: s.created_at,
                updated_at: s.created_at,
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load parcel');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadParcel();
    return () => { cancelled = true; };
  }, [id]);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
          <Link to="/owner/parcels" className="hover:text-[var(--text2)]">
            {t('nav.parcels')}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">…</span>
        </nav>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (error) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
          <Link to="/owner/parcels" className="hover:text-[var(--text2)]">
            {t('nav.parcels')}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">Error</span>
        </nav>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-red-400 mb-3" />
          <p className="text-sm text-red-400">{error}</p>
          <Link
            to="/owner/parcels"
            className="inline-block mt-4 text-xs text-[var(--green)] hover:underline"
          >
            {t('owner.parcelDetail.backToParcels')}
          </Link>
        </div>
      </div>
    );
  }

  /* ── Not found state ── */
  if (!parcel) {
    return (
      <div className="p-4 lg:p-6 max-w-5xl">
        <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
          <Link to="/owner/parcels" className="hover:text-[var(--text2)]">
            {t('nav.parcels')}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text)]">Not found</span>
        </nav>
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-12 text-center">
          <AlertCircle size={32} className="mx-auto text-[var(--text3)] mb-3" />
          <p className="text-sm text-[var(--text2)]">{t('owner.parcelDetail.notFound')}</p>
          <Link
            to="/owner/parcels"
            className="inline-block mt-4 text-xs text-[var(--green)] hover:underline"
          >
            {t('owner.parcelDetail.backToParcels')}
          </Link>
        </div>
      </div>
    );
  }

  const speciesStr = parcel.species_mix.length > 0
    ? parcel.species_mix.map((s) => `${s.species} ${s.pct}%`).join(', ')
    : 'N/A';

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/parcels" className="hover:text-[var(--text2)]">
          {t('nav.parcels')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{parcel.name}</span>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--green)]/10 border border-[var(--border)] flex items-center justify-center">
            <TreePine size={20} className="text-[var(--green)]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">{parcel.name}</h1>
              {statusBadge(parcel.status, t)}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--text3)]">
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {parcel.municipality}
              </span>
              <span className="font-mono">
                {parcel.area_hectares.toFixed(1)} {t('owner.parcels.hectares')}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export button */}
          <ExportButton
            parcels={[{
              id: parcel.id,
              name: parcel.name,
              municipality: parcel.municipality,
              county: '',
              area_hectares: parcel.area_hectares,
              health_score: 0,
              timber_value_kr: 0,
              warnings: 0,
              last_survey_date: parcel.last_survey,
              center: parcelCenter,
              boundary: [parcelCenter, parcelCenter, parcelCenter],
              status: parcel.status,
            }]}
            filenamePrefix={`beetlesense-${parcel.name.toLowerCase().replace(/\s+/g, '-')}`}
            variant="compact"
          />

          {/* Share button */}
          <button
            onClick={() => setShareModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
          >
            <Users size={14} />
            {t('sharing.shareParcel')}
          </button>

          {/* Regulatory check button */}
          <RegulatoryCheckButton
            constraintCount={constraintCount}
            isLoading={regulatoryLoading}
            onClick={() => setRegulatoryPanelOpen(true)}
          />

          {/* Compare toggle button */}
          <button
            onClick={() => setActiveTab(activeTab === 'compare' ? 'overview' : 'compare')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'compare'
                ? 'bg-[var(--green)] text-[var(--bg)]'
                : 'border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30'
            }`}
          >
            <SplitSquareHorizontal size={14} />
            {t('comparison.compare')}
          </button>
        </div>
      </div>

      {/* ── Comparison View ── */}
      {activeTab === 'compare' && (
        <div className="mb-6 space-y-4">
          {/* Before/After Slider */}
          {selectedBefore && selectedAfter ? (
            <div className="h-[400px] lg:h-[500px]">
              <BeforeAfterSlider
                center={parcelCenter}
                zoom={14}
                beforeDate={selectedBefore}
                afterDate={selectedAfter}
              />
            </div>
          ) : (
            <div className="h-[300px] rounded-xl border border-[var(--border)] bg-[var(--bg2)] flex items-center justify-center">
              {comparison.isLoading ? (
                <Loader2 size={24} className="animate-spin text-[var(--green)]" />
              ) : (
                <p className="text-sm text-[var(--text3)]">{t('comparison.selectDates')}</p>
              )}
            </div>
          )}

          {/* Timeline selector */}
          <TimelineSelector
            dates={comparison.availableDates}
            events={comparison.timelineEvents}
            selectedBefore={selectedBefore}
            selectedAfter={selectedAfter}
            onSelectBefore={setSelectedBefore}
            onSelectAfter={setSelectedAfter}
          />

          {/* Benchmark + Historical side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {comparison.benchmarks && (
              <NeighborBenchmark benchmark={comparison.benchmarks} />
            )}
            {comparison.historicalTrend.length > 0 && (
              <HistoricalTrend
                snapshots={comparison.historicalTrend}
                events={comparison.timelineEvents}
              />
            )}
          </div>
        </div>
      )}

      {/* Info Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
        <InfoCard
          icon={<Layers size={14} className="text-[var(--green)]" />}
          label={t('owner.parcelDetail.area')}
          value={`${parcel.area_hectares.toFixed(1)} ha`}
        />
        <InfoCard
          icon={<Mountain size={14} className="text-[var(--green)]" />}
          label={t('owner.parcelDetail.elevation')}
          value={`${parcel.elevation_m} m`}
        />
        <InfoCard
          icon={<Layers size={14} className="text-[var(--green)]" />}
          label={t('owner.parcelDetail.soilType')}
          value={parcel.soil_type}
        />
        <InfoCard
          icon={<TreePine size={14} className="text-[var(--green)]" />}
          label={t('owner.parcelDetail.speciesMix')}
          value={speciesStr}
          small
        />
        <InfoCard
          icon={<Calendar size={14} className="text-[var(--green)]" />}
          label={t('owner.parcelDetail.registered')}
          value={parcel.registered_at}
        />
      </div>

      {/* Health Status */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 mb-6">
        <h2 className="text-sm font-semibold text-[var(--text)] mb-3">{t('owner.parcelDetail.healthStatus')}</h2>
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${STATUS_DOT[parcel.status] ?? STATUS_DOT.unknown}`}
          />
          <span className="text-sm text-[var(--text2)]">
            {statusLabel(parcel.status, t)}
          </span>
          {parcel.last_survey && (
            <span className="text-[11px] text-[var(--text3)] ml-auto">
              {t('owner.parcelDetail.lastSurveyed')}: {parcel.last_survey}
            </span>
          )}
        </div>
        {parcel.status === 'infested' && (
          <p className="text-xs text-red-400 mt-2">
            {t('owner.parcelDetail.infestedWarning')}
          </p>
        )}
        {parcel.status === 'at_risk' && (
          <p className="text-xs text-[var(--amber)] mt-2">
            {t('owner.parcelDetail.atRiskWarning')}
          </p>
        )}
        {parcel.status === 'unknown' && (
          <p className="text-xs text-[var(--text3)] mt-2">
            {t('owner.parcelDetail.unknownWarning')}
          </p>
        )}
      </div>

      {/* ── Peak-End Summary — emotional highlight of analysis ── */}
      <div className="mb-6">
        <Suspense fallback={<BehavioralFallback />}>
          <PeakEndSummary />
        </Suspense>
      </div>

      {/* ── Tree Inventory & Sensor Summary ── */}
      {treeLoading || sensorLoading ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 mb-6 flex items-center justify-center py-10">
          <Loader2 size={20} className="animate-spin text-[var(--green)]" />
        </div>
      ) : (
        <>
          {/* Tree Inventory Summary */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 mb-6">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
              <TreePine size={14} className="text-[var(--green)]" />
              Trädbestånd
            </h2>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--text)]">{treeStats.count.toLocaleString('sv-SE')}</p>
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wide">Träd totalt</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--text)]">{treeStats.avgHeight != null ? `${treeStats.avgHeight}` : '—'}</p>
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wide">Medelhöjd (m)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--text)]">{treeStats.avgDbh != null ? `${treeStats.avgDbh}` : '—'}</p>
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wide">Medel-DBH (cm)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--text)]">{treeStats.totalVolume.toLocaleString('sv-SE')}</p>
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wide">Volym (m³)</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-[var(--text)]">{treeStats.avgHealth > 0 ? treeStats.avgHealth : '—'}</p>
                <p className="text-[10px] text-[var(--text3)] uppercase tracking-wide">Hälsopoäng</p>
              </div>
            </div>

            {/* Species breakdown bar */}
            {treeStats.speciesBreakdown.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] text-[var(--text3)] mb-1.5">Artfördelning</p>
                <div className="flex h-3 rounded-full overflow-hidden border border-[var(--border)]">
                  {treeStats.speciesBreakdown.map((sp, i) => {
                    const colors = ['bg-[var(--green)]', 'bg-emerald-500', 'bg-teal-400', 'bg-cyan-400'];
                    return (
                      <div
                        key={sp.species}
                        className={`${colors[i % colors.length]} transition-all`}
                        style={{ width: `${sp.percentage}%` }}
                        title={`${sp.species}: ${sp.percentage}%`}
                      />
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  {treeStats.speciesBreakdown.map((sp, i) => {
                    const dotColors = ['bg-[var(--green)]', 'bg-emerald-500', 'bg-teal-400', 'bg-cyan-400'];
                    return (
                      <span key={sp.species} className="flex items-center gap-1 text-[11px] text-[var(--text2)]">
                        <span className={`w-2 h-2 rounded-full ${dotColors[i % dotColors.length]}`} />
                        {sp.species} {sp.percentage}%
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Stressed trees alert */}
            {treeStats.stressedCount > 0 && (
              <div className="rounded-lg border border-[var(--amber)]/20 bg-[var(--amber)]/5 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-[var(--amber)] mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-[var(--amber)]">
                    {treeStats.stressedCount} stressade träd ({treeStats.stressedPct}%)
                  </p>
                  {Object.keys(treeStats.stressTypes).length > 0 && (
                    <p className="text-[11px] text-[var(--text3)] mt-0.5">
                      {Object.entries(treeStats.stressTypes).map(([type, count]) => {
                        const labels: Record<string, string> = {
                          beetle: 'Barkborre',
                          drought: 'Torka',
                          disease: 'Sjukdom',
                          mechanical: 'Mekanisk',
                        };
                        return `${labels[type] ?? type}: ${count}`;
                      }).join(' · ')}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sensor Products & Fusion Results */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5 mb-6">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
              <Satellite size={14} className="text-[var(--green)]" />
              Sensorprodukter
            </h2>

            {/* Sensor type icons */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              {([
                { type: 'multispectral' as SensorType, label: 'Multispektral', icon: <Scan size={16} className="text-[var(--green)]" /> },
                { type: 'thermal' as SensorType, label: 'Termisk', icon: <Thermometer size={16} className="text-[var(--green)]" /> },
                { type: 'rgb' as SensorType, label: 'RGB', icon: <Camera size={16} className="text-[var(--green)]" /> },
                { type: 'lidar' as SensorType, label: 'LiDAR', icon: <BarChart3 size={16} className="text-[var(--green)]" /> },
              ]).map(({ type, label, icon }) => {
                const count = bySensorType[type].length;
                return (
                  <div
                    key={type}
                    className={`flex items-center gap-2 rounded-lg border p-2.5 ${
                      count > 0
                        ? 'border-[var(--green)]/20 bg-[var(--green)]/5'
                        : 'border-[var(--border)] bg-[var(--bg3)] opacity-50'
                    }`}
                  >
                    {icon}
                    <div>
                      <p className="text-xs font-medium text-[var(--text)]">{label}</p>
                      <p className="text-[10px] text-[var(--text3)]">{count} produkt{count !== 1 ? 'er' : ''}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Latest fusion results */}
            {fusionProducts.length > 0 && (
              <div>
                <p className="text-[11px] text-[var(--text3)] mb-2 uppercase tracking-wide flex items-center gap-1">
                  <Activity size={10} />
                  Fusionsresultat
                </p>
                <div className="flex flex-wrap gap-2">
                  {fusionProducts
                    .filter(fp => fp.product_name === 'beetle_stress' || fp.product_name === 'crown_health')
                    .map(fp => {
                      const meta = fp.metadata as Record<string, any>;
                      const labels: Record<string, string> = {
                        beetle_stress: 'Barkborreskador',
                        crown_health: 'Kronhälsa',
                      };
                      const values: Record<string, string> = {
                        beetle_stress: meta.affected_area_pct != null ? `${meta.affected_area_pct}% drabbad` : '—',
                        crown_health: meta.healthy_pct != null ? `${meta.healthy_pct}% frisk` : '—',
                      };
                      const isGood = fp.product_name === 'crown_health'
                        ? (meta.healthy_pct ?? 0) >= 70
                        : (meta.affected_area_pct ?? 0) <= 10;
                      return (
                        <div
                          key={fp.id}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                            isGood
                              ? 'border-[var(--green)]/20 bg-[var(--green)]/5'
                              : 'border-[var(--amber)]/20 bg-[var(--amber)]/5'
                          }`}
                        >
                          <span className={`w-2 h-2 rounded-full ${isGood ? 'bg-[var(--green)]' : 'bg-[var(--amber)]'}`} />
                          <div>
                            <p className="text-xs font-medium text-[var(--text)]">{labels[fp.product_name] ?? fp.product_name}</p>
                            <p className="text-[10px] text-[var(--text3)]">{values[fp.product_name] ?? '—'}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Anchoring Comparison — manual cost vs BeetleSense ── */}
      <div className="mb-6">
        <Suspense fallback={<BehavioralFallback />}>
          <AnchoringComparison />
        </Suspense>
      </div>

      {/* Survey History */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-[var(--text)] flex items-center gap-2">
            <ClipboardList size={14} className="text-[var(--green)]" />
            {t('owner.parcelDetail.surveyHistory')}
          </h2>
          <Link
            to="/owner/surveys"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--green)] text-[var(--bg)] text-xs font-semibold hover:bg-[var(--green2)] transition-colors"
          >
            <Plus size={12} />
            {t('owner.parcelDetail.requestNewSurvey')}
          </Link>
        </div>

        {surveys.length === 0 ? (
          <div className="text-center py-8">
            <ClipboardList size={24} className="mx-auto text-[var(--text3)] mb-2" />
            <p className="text-sm text-[var(--text2)]">{t('owner.parcelDetail.noSurveysYet')}</p>
            <p className="text-xs text-[var(--text3)] mt-1">
              {t('owner.parcelDetail.requestSurveyPrompt')}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {surveys.map((survey) => (
              <div
                key={survey.id}
                className="flex items-center gap-4 p-3 rounded-lg border border-[var(--border)] hover:border-[var(--border2)] bg-[var(--bg3)] transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-[var(--text)] truncate">
                      {survey.name}
                    </p>
                    {surveyStatusBadge(survey.status)}
                    {survey.priority === 'priority' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-[var(--amber)]/10 text-[var(--amber)] border border-[var(--amber)]/20">
                        Priority
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[var(--text3)]">
                    <span>
                      {survey.modules.length} module{survey.modules.length !== 1 ? 's' : ''}
                    </span>
                    <span>Created: {new Date(survey.created_at).toLocaleDateString()}</span>
                    {survey.updated_at !== survey.created_at && (
                      <span>Updated: {new Date(survey.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                  {survey.results_summary && (
                    <p className="text-xs text-[var(--text2)] mt-1.5 line-clamp-2">
                      {survey.results_summary}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-[var(--text3)] flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Regulatory Panel */}
      <RegulatoryPanel
        isOpen={regulatoryPanelOpen}
        onClose={() => setRegulatoryPanelOpen(false)}
        zones={zones}
        constraintCount={constraintCount}
        isLoading={regulatoryLoading}
        parcelName={parcel.name}
      />

      {/* Share Parcel Modal */}
      <ShareParcelModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        parcelId={parcel.id}
        parcelName={parcel.name}
      />
    </div>
  );
}

/* ── Sub-components ── */

function InfoCard({
  icon,
  label,
  value,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-[var(--bg2)] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] text-[var(--text3)] uppercase tracking-wide">{label}</span>
      </div>
      <p className={`font-medium text-[var(--text)] ${small ? 'text-[11px]' : 'text-sm'}`}>
        {value}
      </p>
    </div>
  );
}

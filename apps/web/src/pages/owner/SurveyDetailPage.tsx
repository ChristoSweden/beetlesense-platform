import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_SURVEYS, DEMO_PARCELS } from '@/lib/demoData';
import { SurveyStatusTracker } from '@/components/survey/SurveyStatusTracker';
import { CompanionPanel } from '@/components/companion/CompanionPanel';
import { BaseMap } from '@/components/map/BaseMap';
import { ParcelLayer } from '@/components/map/ParcelLayer';
import { ANALYSIS_MODULES, type AnalysisModule } from '@/components/survey/ModuleCard';
import type maplibregl from 'maplibre-gl';

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
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

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
    setIsGenerating(true);
    // Simulate report generation
    setTimeout(() => {
      setIsGenerating(false);
      alert('Report generation triggered. You will be notified when ready.');
    }, 2000);
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
        <BaseMap onMapReady={handleMapReady}>
          <ParcelLayer map={map} />
        </BaseMap>
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

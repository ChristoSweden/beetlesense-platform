import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Scan, ChevronRight, Plus, Search, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SurveyCard, type SurveyData, type SurveyStatus } from '@/components/survey/SurveyCard';
import { type AnalysisModule } from '@/components/survey/ModuleCard';
import { CreateSurveyWizard } from '@/components/survey/CreateSurveyWizard';

const STATUS_FILTERS: { value: SurveyStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'complete', label: 'Complete' },
  { value: 'failed', label: 'Failed' },
];

export default function SurveysPage() {
  const { t } = useTranslation();
  const [surveys, setSurveys] = useState<SurveyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SurveyStatus | 'all'>('all');
  const [showWizard, setShowWizard] = useState(false);

  // Fetch surveys
  useEffect(() => {
    async function loadSurveys() {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('surveys')
        .select('id, name, modules, status, priority, created_at, parcels(name)')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setSurveys(
          data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: (s.name as string) ?? 'Untitled Survey',
            parcel_name:
              ((s.parcels as Record<string, unknown> | null)?.name as string) ?? 'Unknown Parcel',
            created_at: s.created_at as string,
            modules: (s.modules as AnalysisModule[]) ?? [],
            status: (s.status as SurveyStatus) ?? 'draft',
            priority: (s.priority as 'standard' | 'priority') ?? 'standard',
          })),
        );
      }

      setIsLoading(false);
    }

    loadSurveys();
  }, []);

  // Filtered surveys
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      // Status filter
      if (statusFilter !== 'all' && s.status !== statusFilter) return false;
      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.parcel_name.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [surveys, statusFilter, searchQuery]);

  const handleSurveyCreated = (surveyId: string) => {
    // Reload surveys
    window.location.reload();
    console.log('Survey created:', surveyId);
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/owner/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.surveys')}</span>
      </nav>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">{t('nav.surveys')}</h1>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Create Survey</span>
        </button>
      </div>

      {/* Search and filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or parcel..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder-[var(--text3)] outline-none focus:border-[var(--green)]/50"
          />
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <Filter size={14} className="text-[var(--text3)] flex-shrink-0" />
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setStatusFilter(filter.value)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
                statusFilter === filter.value
                  ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/30'
                  : 'bg-[var(--bg)] text-[var(--text3)] border border-[var(--border)] hover:border-[var(--border2)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Survey list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--border2)] border-t-[var(--green)] animate-spin" />
        </div>
      ) : filteredSurveys.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <Scan size={32} className="mx-auto text-[var(--text3)] mb-3" />
          <p className="text-sm text-[var(--text2)] mb-1">
            {surveys.length === 0
              ? 'No surveys yet'
              : 'No surveys match your filters'}
          </p>
          <p className="text-xs text-[var(--text3)]">
            {surveys.length === 0
              ? 'Create your first survey to get started with forest analysis.'
              : 'Try adjusting your search or filter criteria.'}
          </p>
          {surveys.length === 0 && (
            <button
              onClick={() => setShowWizard(true)}
              className="mt-4 px-4 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold hover:bg-[var(--green2)] transition-colors"
            >
              Create First Survey
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filteredSurveys.map((survey) => (
            <SurveyCard key={survey.id} survey={survey} />
          ))}
        </div>
      )}

      {/* Create Survey Wizard */}
      {showWizard && (
        <CreateSurveyWizard
          onClose={() => setShowWizard(false)}
          onCreated={handleSurveyCreated}
        />
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_SURVEYS } from '@/lib/demoData';
import {
  ClipboardCheck,
  ChevronRight,
  MapPin,
  Calendar,
  Loader2,
  Search,
  Eye,
} from 'lucide-react';

interface SharedSurvey {
  id: string;
  title: string;
  parcel_name: string;
  owner_name: string;
  status: string;
  completed_at: string | null;
  created_at: string;
}

export default function InspectorSurveysPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [surveys, setSurveys] = useState<SharedSurvey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!profile) return;

    // Demo mode — show demo surveys as shared with inspector
    if (isDemo()) {
      const owners = ['Anna Svensson', 'Erik Lindgren', 'Maria Karlsson'];
      setSurveys(
        DEMO_SURVEYS.filter((s) => s.status === 'complete').map((s, i) => ({
          id: s.id,
          title: s.name,
          parcel_name: s.parcel_name,
          owner_name: owners[i % owners.length],
          status: 'completed',
          completed_at: s.updated_at,
          created_at: s.created_at,
        })),
      );
      setLoading(false);
      return;
    }

    async function load() {
      const { data, error } = await supabase
        .from('inspector_survey_access')
        .select('surveys(id, title, parcel_name, status, completed_at, created_at), owner_name')
        .eq('inspector_id', profile!.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped = data.map((d: any) => ({
          ...d.surveys,
          owner_name: d.owner_name,
        }));
        setSurveys(mapped);
      }
      setLoading(false);
    }
    load();
  }, [profile]);

  const filtered = search.trim()
    ? surveys.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.parcel_name.toLowerCase().includes(search.toLowerCase()) ||
          s.owner_name.toLowerCase().includes(search.toLowerCase()),
      )
    : surveys;

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <nav className="flex items-center gap-2 text-xs text-[var(--text3)] mb-6">
        <Link to="/inspector/dashboard" className="hover:text-[var(--text2)]">
          {t('nav.dashboard')}
        </Link>
        <ChevronRight size={12} />
        <span className="text-[var(--text)]">{t('nav.surveys')}</span>
      </nav>

      <div className="flex items-center justify-between gap-3 mb-4">
        <h1 className="text-xl font-serif font-bold text-[var(--text)]">{t('nav.surveys')}</h1>
        <div className="relative w-48">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="input-field pl-8 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
          <ClipboardCheck size={24} className="mx-auto text-[var(--text3)] mb-2" />
          <p className="text-sm text-[var(--text2)]">
            {search
              ? 'No surveys match your search.'
              : 'No surveys shared with you yet. Your clients can share their parcel surveys for your review.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((survey) => (
            <div
              key={survey.id}
              className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-4 hover:bg-[var(--bg3)] transition-colors"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-[var(--text)] truncate">
                      {survey.title}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        survey.status === 'completed'
                          ? 'bg-[var(--green)]/10 text-[var(--green)]'
                          : survey.status === 'processing'
                            ? 'bg-blue-500/10 text-blue-400'
                            : 'bg-amber-500/10 text-amber-400'
                      }`}
                    >
                      {survey.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-[var(--text3)]">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} />
                      {survey.parcel_name}
                    </span>
                    <span>Client: {survey.owner_name}</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={10} />
                      {new Date(survey.completed_at || survey.created_at).toLocaleDateString(
                        'sv-SE',
                      )}
                    </span>
                  </div>
                </div>

                <button className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors">
                  <Eye size={12} />
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

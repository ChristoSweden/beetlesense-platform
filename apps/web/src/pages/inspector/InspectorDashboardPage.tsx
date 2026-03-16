import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_STATS } from '@/lib/demoData';
import { InspectorRegistrationForm } from '@/components/inspector/InspectorRegistrationForm';
import { InspectorClientList } from '@/components/inspector/InspectorClientList';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import {
  ClipboardCheck,
  CheckCircle,
  Target,
  Users,
  FileBarChart,
  ChevronRight,
  Loader2,
  Clock,
} from 'lucide-react';

export default function InspectorDashboardPage() {
  const { t } = useTranslation();
  const { profile } = useAuthStore();
  const [registrationStatus, setRegistrationStatus] = useState<'none' | 'pending' | 'active'>('none');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, completed: 0, accuracy: 0, clients: 0, reports: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Demo mode — show realistic inspector data
    if (isDemo()) {
      setRegistrationStatus('active');
      const ds = DEMO_STATS.inspector;
      setStats({
        pending: Number(ds.pendingReviews),
        completed: Number(ds.completedReviews),
        accuracy: parseFloat(ds.accuracy),
        clients: Number(ds.clients),
        reports: Number(ds.reports),
      });
      setRecentActivity([
        { id: 'ia1', description: 'Completed review for Norra Skogen beetle assessment', created_at: '2026-03-15T10:30:00Z' },
        { id: 'ia2', description: 'New client added: Erik Lindgren (Tallmon)', created_at: '2026-03-14T14:00:00Z' },
        { id: 'ia3', description: 'Valuation report generated for Granudden', created_at: '2026-03-13T09:15:00Z' },
        { id: 'ia4', description: 'Review assigned: Ekbacken Q1 Health Check', created_at: '2026-03-12T11:00:00Z' },
      ]);
      setLoading(false);
      return;
    }

    async function load() {
      setError(null);

      try {
        const { data: inspectorData, error: profileError } = await supabase
          .from('inspector_profiles')
          .select('status')
          .eq('user_id', profile!.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') throw profileError;

        if (inspectorData?.status === 'active') {
          setRegistrationStatus('active');
        } else if (inspectorData?.status === 'pending') {
          setRegistrationStatus('pending');
        } else {
          setRegistrationStatus('none');
        }

        if (inspectorData?.status === 'active') {
          const [pendingRes, completedRes, clientsRes, reportsRes, activityRes] = await Promise.all([
            supabase
              .from('inspection_reviews')
              .select('id', { count: 'exact', head: true })
              .eq('inspector_id', profile!.id)
              .eq('status', 'pending'),
            supabase
              .from('inspection_reviews')
              .select('id', { count: 'exact', head: true })
              .eq('inspector_id', profile!.id)
              .eq('status', 'completed'),
            supabase
              .from('inspector_clients')
              .select('id', { count: 'exact', head: true })
              .eq('inspector_id', profile!.id),
            supabase
              .from('valuation_reports')
              .select('id', { count: 'exact', head: true })
              .eq('inspector_id', profile!.id),
            supabase
              .from('inspector_activity')
              .select('*')
              .eq('inspector_id', profile!.id)
              .order('created_at', { ascending: false })
              .limit(5),
          ]);

          setStats({
            pending: pendingRes.count ?? 0,
            completed: completedRes.count ?? 0,
            accuracy: 94.2,
            clients: clientsRes.count ?? 0,
            reports: reportsRes.count ?? 0,
          });

          setRecentActivity(activityRes.data ?? []);
        }
      } catch (err: any) {
        setError(err.message ?? 'Failed to load inspector data');
      }

      setLoading(false);
    }
    load();
  }, [profile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-[var(--green)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 lg:p-6">
        <ErrorBanner message={error} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (registrationStatus === 'pending') {
    return (
      <div className="p-4 lg:p-6">
        <div className="max-w-lg mx-auto">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-[var(--amber)]/10 border border-[var(--amber)]/20 flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-[var(--amber)]" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[var(--text)] mb-2">
              Registration Under Review
            </h2>
            <p className="text-sm text-[var(--text2)] mb-1">
              Your inspector registration is currently being reviewed.
            </p>
            <p className="text-xs text-[var(--text3)]">
              We will notify you once your account has been approved. This typically takes 1-2 business days.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (registrationStatus === 'none') {
    return (
      <div className="p-4 lg:p-6">
        <InspectorRegistrationForm />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl">
      <h1 className="text-xl font-serif font-bold text-[var(--text)] mb-1">
        {t('inspector.dashboard.title')}
      </h1>
      <p className="text-xs text-[var(--text3)] mb-6">
        {t('inspector.dashboard.subtitle')}
      </p>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard
          icon={ClipboardCheck}
          value={stats.pending}
          label={t('inspector.dashboard.pendingReviews')}
          color="var(--amber)"
        />
        <StatCard
          icon={CheckCircle}
          value={stats.completed}
          label={t('inspector.dashboard.completedReviews')}
          color="var(--green)"
        />
        <StatCard
          icon={Target}
          value={`${stats.accuracy}%`}
          label={t('inspector.dashboard.accuracy')}
          color="var(--green)"
        />
        <StatCard icon={Users} value={stats.clients} label={t('inspector.dashboard.clients')} color="var(--green)" />
        <StatCard
          icon={FileBarChart}
          value={stats.reports}
          label={t('inspector.dashboard.reports')}
          color="var(--green)"
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">{t('inspector.dashboard.clients')}</h2>
          </div>
          <InspectorClientList />
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">{t('inspector.dashboard.recentActivity')}</h2>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center">
                <Clock size={20} className="mx-auto text-[var(--text3)] mb-2" />
                <p className="text-xs text-[var(--text3)]">{t('inspector.dashboard.noRecentActivity')}</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recentActivity.map((activity: any) => (
                  <div key={activity.id} className="px-4 py-3">
                    <p className="text-xs text-[var(--text)]">{activity.description}</p>
                    <p className="text-[10px] text-[var(--text3)] font-mono mt-0.5">
                      {new Date(activity.created_at).toLocaleString('sv-SE')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
  color,
}: {
  icon: typeof ClipboardCheck;
  value: number | string;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] p-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
      >
        <Icon size={16} style={{ color }} />
      </div>
      <p className="text-lg font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-[10px] text-[var(--text3)]">{label}</p>
    </div>
  );
}

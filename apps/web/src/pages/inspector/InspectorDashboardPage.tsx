import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { InspectorRegistrationForm } from '@/components/inspector/InspectorRegistrationForm';
import { InspectorClientList } from '@/components/inspector/InspectorClientList';
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
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, completed: 0, accuracy: 0, clients: 0, reports: 0 });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (!profile) return;

    async function load() {
      const { data: inspectorData } = await supabase
        .from('inspector_profiles')
        .select('status')
        .eq('user_id', profile!.id)
        .single();

      const registered = !!inspectorData && inspectorData.status === 'active';
      setIsRegistered(registered);

      if (registered) {
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

  if (!isRegistered) {
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
        Client management, reports, and verification metrics
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
        <StatCard icon={Users} value={stats.clients} label="Clients" color="var(--green)" />
        <StatCard
          icon={FileBarChart}
          value={stats.reports}
          label="Reports"
          color="var(--green)"
        />
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">Clients</h2>
          </div>
          <InspectorClientList />
        </div>

        {/* Recent Activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">Recent Activity</h2>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg2)] overflow-hidden">
            {recentActivity.length === 0 ? (
              <div className="p-6 text-center">
                <Clock size={20} className="mx-auto text-[var(--text3)] mb-2" />
                <p className="text-xs text-[var(--text3)]">No recent activity.</p>
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

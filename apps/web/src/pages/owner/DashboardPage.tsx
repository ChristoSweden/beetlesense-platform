import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseMap } from '@/components/map/BaseMap';
import { CompanionPanel } from '@/components/companion/CompanionPanel';
import {
  TreePine,
  Scan,
  AlertTriangle,
  Heart,
  ChevronRight,
  Camera,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { isDemo, DEMO_STATS, DEMO_ACTIVITIES, type DemoActivity } from '@/lib/demoData';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import type maplibregl from 'maplibre-gl';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  color: string;
}

function StatCard({ icon, label, value, change, color }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {change && (
          <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full">
            {change}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold font-mono text-[var(--text)]">{value}</p>
      <p className="text-xs text-[var(--text3)] mt-1">{label}</p>
    </div>
  );
}

interface ActivityItem {
  id: string;
  type: 'survey_complete' | 'alert' | 'survey_started';
  message: string;
  parcel_name: string;
  time: string;
  color: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [map, setMap] = useState<maplibregl.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(false);

  // Dashboard stats
  const [stats, setStats] = useState({
    totalParcels: '...',
    activeSurveys: '...',
    recentAlerts: '...',
    aiSessions: '0',
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleMapReady = useCallback((m: maplibregl.Map) => {
    setMap(m);
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (isDemo()) {
      setStats(DEMO_STATS.owner);
      setActivities(DEMO_ACTIVITIES);
      return;
    }

    async function loadStats() {
      try {
        const [parcelsRes, surveysRes] = await Promise.allSettled([
          supabase.from('parcels').select('id', { count: 'exact', head: true }),
          supabase.from('surveys').select('id, status', { count: 'exact' }).in('status', ['processing', 'draft']),
        ]);

        const parcelCount =
          parcelsRes.status === 'fulfilled' ? (parcelsRes.value.count ?? 0) : 0;
        const surveyCount =
          surveysRes.status === 'fulfilled' ? (surveysRes.value.count ?? 0) : 0;

        // Count parcels with alert-worthy status
        const { count: alertCount } = await supabase
          .from('parcels')
          .select('id', { count: 'exact', head: true })
          .in('status', ['at_risk', 'infested']);

        // Count companion sessions for this user
        const { count: sessionCount } = await supabase
          .from('companion_sessions')
          .select('id', { count: 'exact', head: true });

        setStats({
          totalParcels: String(parcelCount),
          activeSurveys: String(surveyCount),
          recentAlerts: String(alertCount ?? 0),
          aiSessions: String(sessionCount ?? 0),
        });
      } catch (err: any) {
        setError(err.message ?? 'Failed to load dashboard stats');
      }
    }

    async function loadActivity() {
      const { data } = await supabase
        .from('surveys')
        .select('id, name, status, updated_at, parcels(name)')
        .order('updated_at', { ascending: false })
        .limit(5);

      if (data) {
        setActivities(
          data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            type:
              s.status === 'complete'
                ? ('survey_complete' as const)
                : ('survey_started' as const),
            message:
              s.status === 'complete'
                ? `Survey "${s.name}" completed`
                : `Survey "${s.name}" ${s.status}`,
            parcel_name:
              ((s.parcels as Record<string, unknown> | null)?.name as string) ?? 'Unknown',
            time: new Date(s.updated_at as string).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
            }),
            color: s.status === 'complete' ? '#4ade80' : '#fbbf24',
          })),
        );
      }
    }

    loadStats();
    loadActivity();
  }, []);

  return (
    <div className="flex h-full relative">
      {/* Left sidebar (collapsible) */}
      <div
        className={`absolute top-0 left-0 bottom-0 z-20 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-80 xl:w-96 border-r border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              {t('owner.dashboard.title')}
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:flex hidden items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg3)] transition-colors"
            >
              <PanelLeftClose size={16} className="text-[var(--text3)]" />
            </button>
          </div>
          <p className="text-xs text-[var(--text3)] mb-5">
            {t('owner.dashboard.subtitle')}
          </p>

          {error && (
            <div className="mb-4">
              <ErrorBanner message={error} onRetry={() => window.location.reload()} />
            </div>
          )}

          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <StatCard
              icon={<TreePine size={18} />}
              label={t('owner.dashboard.totalParcels')}
              value={stats.totalParcels}
              color="#4ade80"
            />
            <StatCard
              icon={<Scan size={18} />}
              label={t('owner.dashboard.activeSurveys')}
              value={stats.activeSurveys}
              change={stats.activeSurveys !== '0' ? `+${stats.activeSurveys}` : undefined}
              color="#86efac"
            />
            <StatCard
              icon={<AlertTriangle size={18} />}
              label={t('owner.dashboard.recentAlerts')}
              value={stats.recentAlerts}
              color="#fbbf24"
            />
            <StatCard
              icon={<MessageSquare size={18} />}
              label={t('owner.dashboard.aiSessions')}
              value={stats.aiSessions}
              color="#4ade80"
            />
          </div>

          {/* Quick actions */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-[var(--text)] mb-3">{t('owner.dashboard.quickActions')}</h2>
            <div className="space-y-2">
              <Link
                to="/owner/surveys"
                className="flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Scan size={16} className="text-[var(--green)]" />
                  <span className="text-xs font-medium text-[var(--text)]">{t('owner.dashboard.newSurvey')}</span>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </Link>
              <Link
                to="/owner/capture"
                className="flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Camera size={16} className="text-[var(--green)]" />
                  <span className="text-xs font-medium text-[var(--text)]">{t('owner.dashboard.capturePhotos')}</span>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </Link>
              <button
                onClick={() => setCompanionOpen(true)}
                className="flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sparkles size={16} className="text-[var(--green)]" />
                  <span className="text-xs font-medium text-[var(--text)]">{t('owner.dashboard.askAi')}</span>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </button>
            </div>
          </div>

          {/* Recent activity feed */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--text)]">{t('owner.dashboard.recentActivity')}</h2>
              <Link
                to="/owner/surveys"
                className="text-xs text-[var(--green)] hover:text-[var(--green2)] flex items-center gap-1"
              >
                {t('owner.dashboard.viewAll')}
                <ChevronRight size={12} />
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="space-y-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--amber)] mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)]">
                      Elevated bark beetle risk detected
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">
                      Parcel: Norra Skogen &middot; 2h ago
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--green)] mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)]">
                      Survey completed successfully
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">
                      Parcel: Ekbacken &middot; 1d ago
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {activities.map((activity) => (
                  <Link
                    key={activity.id}
                    to={`/owner/surveys/${activity.id}`}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: activity.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--text)]">
                        {activity.message}
                      </p>
                      <p className="text-[10px] text-[var(--text3)] mt-0.5">
                        {activity.parcel_name} &middot; {activity.time}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map - full screen background */}
      <div className="flex-1 relative">
        <BaseMap onMapReady={handleMapReady} />

        {/* Sidebar open button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            style={{ background: 'var(--surface)' }}
          >
            <PanelLeftOpen size={18} />
          </button>
        )}

        {/* Mobile FAB for capture */}
        <Link
          to="/owner/capture"
          className="lg:hidden fixed bottom-20 left-4 z-30 w-12 h-12 rounded-full bg-[var(--green)] text-forest-950 shadow-lg shadow-[var(--green)]/20 flex items-center justify-center"
        >
          <Camera size={20} />
        </Link>
      </div>

      {/* AI Companion Panel */}
      <CompanionPanel isOpen={companionOpen} onToggle={() => setCompanionOpen(!companionOpen)} />
    </div>
  );
}

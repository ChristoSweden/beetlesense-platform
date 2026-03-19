import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { BaseMap } from '@/components/map/BaseMap';
import { CompanionPanel } from '@/components/companion/CompanionPanel';
import {
  TreePine,
  Scan,
  AlertTriangle,
  ChevronRight,
  Camera,
  Sparkles,
  PanelLeftClose,
  PanelLeftOpen,
  MessageSquare,
  X,
  Map,
  Activity,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { isDemo, DEMO_STATS, DEMO_ACTIVITIES } from '@/lib/demoData';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { AnimatedNumber } from '@/components/common/AnimatedNumber';
import { ForestHealthScore } from '@/components/dashboard/ForestHealthScore';
import { HealthScoreBreakdown } from '@/components/dashboard/HealthScoreBreakdown';
import { RegionalBenchmark } from '@/components/dashboard/RegionalBenchmark';
import { useForestHealthScore } from '@/hooks/useForestHealthScore';
import { TimberValueEstimator } from '@/components/dashboard/TimberValueEstimator';
import { CalendarWidget } from '@/components/dashboard/CalendarWidget';
import { FirstYearWidget } from '@/components/dashboard/FirstYearWidget';
import { WeatherWidget } from '@/components/dashboard/WeatherWidget';
import { RegulatoryAlertBanner } from '@/components/regulatory/RegulatoryAlertBanner';
import { SharedWithMeSection } from '@/components/sharing/SharedWithMeSection';
import { AcademyWidget } from '@/components/dashboard/AcademyWidget';
import { EmergencyHistoryWidget } from '@/components/emergency/EmergencyHistory';
import { EarlyWarningWidget } from '@/components/dashboard/EarlyWarningWidget';
import { MarketWidget } from '@/components/market/MarketWidget';
import { BenchmarkWidget } from '@/components/dashboard/BenchmarkWidget';
import { GrowthWidget } from '@/components/dashboard/GrowthWidget';
import { ContractorWidget } from '@/components/dashboard/ContractorWidget';
import { StormWidget } from '@/components/dashboard/StormWidget';
import { CarbonWidget } from '@/components/carbon/CarbonWidget';
import { ComplianceWidget } from '@/components/compliance/ComplianceWidget';
import { AdvisorWidget } from '@/components/dashboard/AdvisorWidget';
import { ArchiveWidget } from '@/components/dashboard/ArchiveWidget';
import { SatelliteCheckWidget } from '@/components/dashboard/SatelliteCheckWidget';
import { MicroclimateWidget } from '@/components/dashboard/MicroclimateWidget';
import { NeighborWidget } from '@/components/dashboard/NeighborWidget';
import { KnowledgeWidget } from '@/components/dashboard/KnowledgeWidget';
import { LogisticsWidget } from '@/components/dashboard/LogisticsWidget';
import { RotationWidget } from '@/components/dashboard/RotationWidget';
import { MarketplaceWidget } from '@/components/dashboard/MarketplaceWidget';
import { RegulatoryRadarWidget } from '@/components/dashboard/RegulatoryRadarWidget';
import { ReportsWidget } from '@/components/dashboard/ReportsWidget';
import { NewsWidget } from '@/components/dashboard/NewsWidget';
import type maplibregl from 'maplibre-gl';

// Behavioral science components (lazy-loaded)
const ForestNarrative = React.lazy(() => import('@/components/behavioral/ForestNarrative'));
const OwnershipMetrics = React.lazy(() => import('@/components/behavioral/OwnershipMetrics'));
const BeetleCountdown = React.lazy(() => import('@/components/behavioral/BeetleCountdown'));
const NeighborBenchmark = React.lazy(() => import('@/components/behavioral/NeighborBenchmark'));
const ForestPlanProgress = React.lazy(() => import('@/components/behavioral/ForestPlanProgress'));
const ScarfDashboard = React.lazy(() => import('@/components/behavioral/ScarfDashboard'));
const ForestIntelligenceSummary = React.lazy(() => import('@/components/disclosure/ForestIntelligenceSummary'));

function BehavioralFallback() {
  return <div className="h-16 rounded-xl bg-[var(--bg3)] animate-pulse" />;
}

/* ═══ Demo Welcome Banner ═══ */
function DemoWelcomeBanner({ onOpenCompanion }: { onOpenCompanion: () => void }) {
  const [visible, setVisible] = useState(true);
  const [entering, setEntering] = useState(true);
  const navigate = useNavigate();

  // Animated entrance
  useEffect(() => {
    const t = requestAnimationFrame(() => setEntering(false));
    return () => cancelAnimationFrame(t);
  }, []);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 15000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`relative mb-5 rounded-xl border border-[var(--green)]/30 p-4 transition-all duration-500 ease-out ${
        entering ? 'opacity-0 -translate-y-3' : 'opacity-100 translate-y-0'
      }`}
      style={{ background: 'linear-gradient(135deg, var(--green)/8, var(--bg2))' }}
    >
      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        aria-label="Stäng"
      >
        <X size={14} />
      </button>

      <h3 className="text-sm font-semibold text-[var(--green)] mb-1 pr-6">
        Välkommen till BeetleSense demo!
      </h3>
      <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
        Du tittar på demodata för 3 skogsskiften i Småland. Utforska kartan, fråga AI-rådgivaren, eller se sensordata.
      </p>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('/owner/map')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/25 transition-colors"
        >
          <Map size={12} />
          Öppna kartan
        </button>
        <button
          onClick={() => onOpenCompanion()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/25 transition-colors"
        >
          <Sparkles size={12} />
          Fråga AI
        </button>
        <button
          onClick={() => navigate('/owner/surveys/s1')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/25 transition-colors"
        >
          <Activity size={12} />
          Se sensordata
        </button>
      </div>
    </div>
  );
}

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
      <p className="mt-3 text-2xl font-semibold font-mono text-[var(--text)]">
        {/^\d+$/.test(value) ? <AnimatedNumber value={Number(value)} /> : value}
      </p>
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
  const [_map, setMap] = useState<maplibregl.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(false);
  const isDemoMode = isDemo() || !isSupabaseConfigured;

  // Dashboard stats
  const [stats, setStats] = useState({
    totalParcels: '...',
    activeSurveys: '...',
    recentAlerts: '...',
    aiSessions: '0',
  });

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Forest Health Score
  const healthData = useForestHealthScore();

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
          <div className="flex items-center justify-between mb-1" data-tour="welcome">
            <h1 className="text-lg font-serif font-bold text-[var(--text)]">
              {t('owner.dashboard.title')}
            </h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:flex hidden items-center justify-center w-7 h-7 rounded-lg hover:bg-[var(--bg3)] transition-colors"
              aria-label="Close dashboard sidebar"
            >
              <PanelLeftClose size={16} className="text-[var(--text3)]" aria-hidden="true" />
            </button>
          </div>
          <p className="text-xs text-[var(--text3)] mb-5">
            {t('owner.dashboard.subtitle')}
          </p>

          {/* Demo welcome banner — first thing investors see */}
          {isDemoMode && (
            <DemoWelcomeBanner onOpenCompanion={() => setCompanionOpen(true)} />
          )}

          {error && (
            <div className="mb-4">
              <ErrorBanner message={error} onRetry={() => window.location.reload()} />
            </div>
          )}

          {/* ═══ STORY FIRST: Forest Narrative ═══ */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <ForestIntelligenceSummary />
            </Suspense>
          </div>
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <ForestNarrative />
            </Suspense>
          </div>

          {/* ═══ TIER 1: "Is my forest OK?" — first thing you see ═══ */}

          {/* Forest Health Score — THE emotional centerpiece, answers #1 question */}
          <div className="mb-5" data-tour="health-score">
            <ForestHealthScore data={healthData} />
          </div>
          <div className="mb-5 space-y-3">
            <HealthScoreBreakdown breakdown={healthData.breakdown} isLoading={healthData.isLoading} />
            <RegionalBenchmark score={healthData.score} benchmark={healthData.benchmark} isLoading={healthData.isLoading} />
          </div>

          {/* Regulatory alert banner — urgent compliance */}
          <RegulatoryAlertBanner />

          {/* ═══ TIER 2: "Any immediate threats?" ═══ */}

          {/* Early Warning Detection — beetle/disease signals */}
          <div className="mb-5">
            <EarlyWarningWidget />
          </div>

          {/* Beetle Countdown — urgency framing */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <BeetleCountdown />
            </Suspense>
          </div>

          {/* Emergency reports — active incidents */}
          <div className="mb-5">
            <EmergencyHistoryWidget />
          </div>

          {/* Storm & Wind Risk */}
          <div className="mb-5">
            <StormWidget />
          </div>

          {/* ═══ TIER 3: "What should I do today?" ═══ */}

          {/* AI Silvicultural Decision Advisor — actionable recommendations */}
          <div className="mb-5">
            <AdvisorWidget />
          </div>

          {/* Weather + beetle flight conditions */}
          <div className="mb-5">
            <WeatherWidget parcelId="p1" />
          </div>

          {/* Forestry Calendar — what's due this month */}
          <div className="mb-5">
            <CalendarWidget />
          </div>

          {/* ═══ TIER 4: "What's happening?" — fresh intelligence ═══ */}

          {/* Forestry News — refreshed on each login */}
          <div className="mb-5">
            <NewsWidget />
          </div>

          {/* Satellite imagery status */}
          <div className="mb-5">
            <SatelliteCheckWidget />
          </div>

          {/* Neighbor Activity */}
          <div className="mb-5">
            <NeighborWidget />
          </div>

          {/* Neighbor Benchmark — social proof */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <NeighborBenchmark />
            </Suspense>
          </div>

          {/* ═══ TIER 5: "What's my forest worth?" — financial picture ═══ */}

          {/* Timber Value Estimator */}
          <div className="mb-5" data-tour="timber-value">
            <TimberValueEstimator onOpenCompanion={() => setCompanionOpen(true)} />
          </div>

          {/* Timber Market — current prices + harvest signal */}
          <div className="mb-5">
            <MarketWidget />
          </div>

          {/* Carbon Credits & Revenue */}
          <div className="mb-5">
            <CarbonWidget />
          </div>

          {/* ═══ TIER 6: Stats & Quick Actions ═══ */}

          {/* Ownership Metrics — behavioral framing of stats */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <OwnershipMetrics />
            </Suspense>
          </div>

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

          {/* ═══ TIER 7: Deep-dive tools (below the fold) ═══ */}

          {/* Growth Model */}
          <div className="mb-5">
            <GrowthWidget />
          </div>

          {/* Long-Rotation Economic Modeling */}
          <div className="mb-5">
            <RotationWidget />
          </div>

          {/* Peer Benchmark — ranking vs county */}
          <div className="mb-5">
            <BenchmarkWidget />
          </div>

          {/* Microclimate & Almanac */}
          <div className="mb-5">
            <MicroclimateWidget />
          </div>

          {/* ═══ TIER 8: Compliance & Operations ═══ */}

          {/* Regulatory Compliance */}
          <div className="mb-5">
            <ComplianceWidget />
          </div>

          {/* Regulatory Change Radar */}
          <div className="mb-5">
            <RegulatoryRadarWidget />
          </div>

          {/* Contractor & Machine Coordination */}
          <div className="mb-5">
            <ContractorWidget />
          </div>

          {/* Harvest Logistics */}
          <div className="mb-5">
            <LogisticsWidget />
          </div>

          {/* ═══ TIER 9: Community & Learning ═══ */}

          {/* Expert Marketplace */}
          <div className="mb-5">
            <MarketplaceWidget />
          </div>

          {/* Learning Academy */}
          <div className="mb-5">
            <AcademyWidget />
          </div>

          {/* First Year Checklist */}
          <div className="mb-5">
            <FirstYearWidget />
          </div>

          {/* ═══ TIER 10: Archive & History ═══ */}

          {/* Generational Forest Archive */}
          <div className="mb-5">
            <ArchiveWidget />
          </div>

          {/* Cross-Generational Knowledge Capture */}
          <div className="mb-5">
            <KnowledgeWidget />
          </div>

          {/* Reports Quick Action */}
          <div className="mb-5">
            <ReportsWidget />
          </div>

          {/* Forest Plan Progress — goal gradient */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <ForestPlanProgress />
            </Suspense>
          </div>

          {/* SCARF Dashboard — collapsible autonomy/relatedness panel */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <ScarfDashboard />
            </Suspense>
          </div>

          {/* Shared with me */}
          <div className="mb-5">
            <SharedWithMeSection />
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
      <div className="flex-1 relative" data-tour="map">
        <BaseMap onMapReady={handleMapReady} />

        {/* Sidebar open button (when closed) */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 rounded-lg border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
            style={{ background: 'var(--surface)' }}
            aria-label="Open dashboard sidebar"
          >
            <PanelLeftOpen size={18} aria-hidden="true" />
          </button>
        )}

        {/* Mobile FAB for capture */}
        <Link
          to="/owner/capture"
          className="lg:hidden fixed bottom-20 left-4 z-30 w-12 h-12 rounded-full bg-[var(--green)] text-forest-950 shadow-lg shadow-[var(--green)]/20 flex items-center justify-center"
          aria-label="Capture photos"
        >
          <Camera size={20} aria-hidden="true" />
        </Link>
      </div>

      {/* AI Companion Panel */}
      <CompanionPanel isOpen={companionOpen} onToggle={() => setCompanionOpen(!companionOpen)} />
    </div>
  );
}

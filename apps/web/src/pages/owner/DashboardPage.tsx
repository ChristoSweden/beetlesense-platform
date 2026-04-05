import React, { useState, useCallback, useEffect, Suspense, memo } from 'react';
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
import { useScrollReveal } from '@/hooks/useScrollReveal';
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
import { BeetleForecast } from '@/components/owner/BeetleForecast';
import { HarvestOptimizer } from '@/components/owner/HarvestOptimizer';
import { InsuranceRisk } from '@/components/owner/InsuranceRisk';
import { MarketplaceWidget } from '@/components/dashboard/MarketplaceWidget';
import { RegulatoryRadarWidget } from '@/components/dashboard/RegulatoryRadarWidget';
import { ReportsWidget } from '@/components/dashboard/ReportsWidget';
import { NewsWidget } from '@/components/dashboard/NewsWidget';
import { LiveDataPanel } from '@/components/dashboard/LiveDataPanel';
import { ForestAssetCard } from '@/components/dashboard/ForestAssetCard';
import { DroughtMonitorWidget } from '@/components/dashboard/DroughtMonitorWidget';
import { FireBeetleRiskWidget } from '@/components/dashboard/FireBeetleRiskWidget';
import { WoodpeckerIndexWidget } from '@/components/dashboard/WoodpeckerIndexWidget';
import { ThreatFusionCard } from '@/components/dashboard/ThreatFusionCard';
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
  return <div className="h-16 rounded-xl bg-[var(--bg3)] skeleton-shimmer" />;
}

/** Wrapper that animates children into view on scroll */
function RevealWidget({ children, delay = '0ms' }: { children: React.ReactNode; delay?: string }) {
  const { ref, isVisible } = useScrollReveal({ threshold: 0.1 });
  return (
    <div
      ref={ref}
      className={`reveal-stagger ${isVisible ? 'revealed' : ''} mb-5`}
      style={{ transitionDelay: delay }}
    >
      {children}
    </div>
  );
}

/* ═══ Demo Welcome Banner ═══ */
function DemoWelcomeBanner({ onOpenCompanion }: { onOpenCompanion: () => void }) {
  const { t } = useTranslation();
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
      className={`card-shine relative mb-5 rounded-xl border border-[var(--green)]/30 p-4 transition-all duration-500 ease-out ${
        entering ? 'opacity-0 -translate-y-3 scale-95' : 'opacity-100 translate-y-0 scale-100'
      }`}
      style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), var(--bg2))' }}
    >
      {/* Close button */}
      <button
        onClick={() => setVisible(false)}
        className="absolute top-3 right-3 p-1 rounded-lg text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors press-effect"
        aria-label={t('owner.dashboard.closeBanner')}
      >
        <X size={14} />
      </button>

      <h3 className="text-sm font-semibold text-[var(--green)] mb-1 pr-6">
        {t('owner.dashboard.demoWelcomeTitle')}
      </h3>
      <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
        {t('owner.dashboard.demoWelcomeDesc')}
      </p>

      {/* Quick action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => navigate('/owner/map')}
          className="btn-ripple flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/25 transition-colors press-effect"
        >
          <Map size={12} />
          {t('owner.dashboard.openMap')}
        </button>
        <button
          onClick={() => onOpenCompanion()}
          className="btn-ripple flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/25 transition-colors press-effect"
        >
          <Sparkles size={12} />
          {t('owner.dashboard.askAiShort')}
        </button>
        <button
          onClick={() => navigate('/owner/surveys/s1')}
          className="btn-ripple flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/20 hover:bg-[var(--green)]/25 transition-colors press-effect"
        >
          <Activity size={12} />
          {t('owner.dashboard.viewSensorData')}
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

const StatCard = memo(function StatCard({ icon, label, value, change, color }: StatCardProps) {
  return (
    <div
      className="card-depth card-shine rounded-xl border border-[var(--border)] p-4 cursor-default"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center icon-breathe"
          style={{ background: `${color}15`, color }}
        >
          {icon}
        </div>
        {change && (
          <span className="text-[10px] font-mono text-[var(--green)] bg-[var(--green)]/10 px-2 py-0.5 rounded-full animate-number-pop">
            {change}
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold font-mono text-[var(--text)] animate-number-pop">
        {/^\d+$/.test(value) ? <AnimatedNumber value={Number(value)} /> : value}
      </p>
      <p className="text-xs text-[var(--text3)] mt-1">{label}</p>
    </div>
  );
});

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
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('owner.dashboard.title', 'Forest OS')}
              </h1>
              <span className="text-[9px] font-mono text-[var(--text3)] tracking-wider uppercase">
                Operating system for your land
              </span>
            </div>
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

          {/* ═══ FOREST OS: Threat Fusion — financial impact from converging signals ═══ */}
          <div className="mb-5" data-tour="threat-fusion">
            <ThreatFusionCard />
          </div>

          {/* ═══ TIER 1: "Is my forest OK?" — health score detail ═══ */}
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

          <RevealWidget>
            <EarlyWarningWidget />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <Suspense fallback={<BehavioralFallback />}>
              <BeetleCountdown />
            </Suspense>
          </RevealWidget>

          <RevealWidget delay="90ms">
            <BeetleForecast />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <EmergencyHistoryWidget />
          </RevealWidget>

          <RevealWidget delay="180ms">
            <StormWidget />
          </RevealWidget>

          <RevealWidget delay="240ms">
            <DroughtMonitorWidget />
          </RevealWidget>

          <RevealWidget delay="300ms">
            <FireBeetleRiskWidget />
          </RevealWidget>

          {/* ═══ INTELLIGENCE: Biological beetle proxy ═══ */}

          <RevealWidget delay="360ms">
            <WoodpeckerIndexWidget />
          </RevealWidget>

          {/* ═══ LIVE DATA: Real-time open data from SMHI, Sentinel-2, Skogsstyrelsen, GFW ═══ */}

          <RevealWidget>
            <LiveDataPanel />
          </RevealWidget>

          {/* ═══ TIER 3: "What should I do today?" ═══ */}

          <RevealWidget>
            <AdvisorWidget />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <WeatherWidget parcelId="p1" />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <CalendarWidget />
          </RevealWidget>

          {/* ═══ TIER 4: "What's happening?" — fresh intelligence ═══ */}

          <RevealWidget>
            <NewsWidget />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <SatelliteCheckWidget />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <NeighborWidget />
          </RevealWidget>

          <RevealWidget delay="180ms">
            <Suspense fallback={<BehavioralFallback />}>
              <NeighborBenchmark />
            </Suspense>
          </RevealWidget>

          {/* ═══ TIER 5: "What's my forest worth?" — financial picture ═══ */}

          <RevealWidget>
            <div data-tour="timber-value">
              <TimberValueEstimator onOpenCompanion={() => setCompanionOpen(true)} />
            </div>
          </RevealWidget>

          <RevealWidget delay="60ms">
            <MarketWidget />
          </RevealWidget>

          <RevealWidget delay="90ms">
            <HarvestOptimizer />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <CarbonWidget />
          </RevealWidget>

          <RevealWidget delay="180ms">
            <ForestAssetCard />
          </RevealWidget>

          {/* ═══ TIER 6: Stats & Quick Actions ═══ */}

          {/* Ownership Metrics — behavioral framing of stats */}
          <div className="mb-5">
            <Suspense fallback={<BehavioralFallback />}>
              <OwnershipMetrics areaHa={0} />
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
                className="card-depth flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)]"
              >
                <div className="flex items-center gap-3">
                  <Scan size={16} className="text-[var(--green)]" />
                  <span className="text-xs font-medium text-[var(--text)]">{t('owner.dashboard.newSurvey')}</span>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </Link>
              <Link
                to="/owner/capture"
                className="card-depth flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)]"
              >
                <div className="flex items-center gap-3">
                  <Camera size={16} className="text-[var(--green)]" />
                  <span className="text-xs font-medium text-[var(--text)]">{t('owner.dashboard.capturePhotos')}</span>
                </div>
                <ChevronRight size={14} className="text-[var(--text3)]" />
              </Link>
              <button
                onClick={() => setCompanionOpen(true)}
                className="card-depth flex items-center justify-between w-full p-3 rounded-lg border border-[var(--border)] text-left hover:bg-[var(--bg3)]"
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

          <RevealWidget>
            <GrowthWidget />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <RotationWidget />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <BenchmarkWidget />
          </RevealWidget>

          <RevealWidget delay="180ms">
            <MicroclimateWidget />
          </RevealWidget>

          {/* ═══ TIER 8: Compliance & Operations ═══ */}

          <RevealWidget>
            <ComplianceWidget />
          </RevealWidget>

          <RevealWidget delay="30ms">
            <InsuranceRisk />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <RegulatoryRadarWidget />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <ContractorWidget />
          </RevealWidget>

          <RevealWidget delay="180ms">
            <LogisticsWidget />
          </RevealWidget>

          {/* ═══ TIER 9: Community & Learning ═══ */}

          <RevealWidget>
            <MarketplaceWidget />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <AcademyWidget />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <FirstYearWidget />
          </RevealWidget>

          {/* ═══ TIER 10: Archive & History ═══ */}

          <RevealWidget>
            <ArchiveWidget />
          </RevealWidget>

          <RevealWidget delay="60ms">
            <KnowledgeWidget />
          </RevealWidget>

          <RevealWidget delay="120ms">
            <ReportsWidget />
          </RevealWidget>

          <RevealWidget delay="180ms">
            <Suspense fallback={<BehavioralFallback />}>
              <ForestPlanProgress />
            </Suspense>
          </RevealWidget>

          <RevealWidget delay="240ms">
            <Suspense fallback={<BehavioralFallback />}>
              <ScarfDashboard />
            </Suspense>
          </RevealWidget>

          <RevealWidget delay="300ms">
            <SharedWithMeSection />
          </RevealWidget>

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
                      {t('owner.dashboard.demoBeetleAlert')}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">
                      Parcel: Norra Skogen &middot; {t('owner.dashboard.demoTimeAgo2h')}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[var(--bg)] border border-[var(--border)]">
                  <div className="w-2 h-2 rounded-full bg-[var(--green)] mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--text)]">
                      {t('owner.dashboard.demoSurveyComplete')}
                    </p>
                    <p className="text-[10px] text-[var(--text3)] mt-0.5">
                      Parcel: Ekbacken &middot; {t('owner.dashboard.demoTimeAgo1d')}
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

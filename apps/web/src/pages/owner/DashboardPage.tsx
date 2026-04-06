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
import { WidgetSkeleton } from '@/components/common/WidgetSkeleton';
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
import { WikiWidget } from '@/components/wiki/WikiWidget';
import { ProfitSummaryWidget } from '@/components/dashboard/ProfitSummaryWidget';
import { LogisticsWidget } from '@/components/dashboard/LogisticsWidget';
import { RotationWidget } from '@/components/dashboard/RotationWidget';
import { BeetleForecast } from '@/components/owner/BeetleForecast';
import { HarvestOptimizer } from '@/components/owner/HarvestOptimizer';
import { InsuranceRisk } from '@/components/owner/InsuranceRisk';
import { MarketplaceWidget } from '@/components/dashboard/MarketplaceWidget';
import { RegulatoryRadarWidget } from '@/components/dashboard/RegulatoryRadarWidget';
import { ReportsWidget } from '@/components/dashboard/ReportsWidget';
import { NewsWidget } from '@/components/dashboard/NewsWidget';
import { initPushNotifications } from '@/lib/pushNotifications';
import { useAuthStore } from '@/stores/authStore';
import { LiveDataPanel } from '@/components/dashboard/LiveDataPanel';
import { ForestAssetCard } from '@/components/dashboard/ForestAssetCard';
import { DroughtMonitorWidget } from '@/components/dashboard/DroughtMonitorWidget';
import { FireBeetleRiskWidget } from '@/components/dashboard/FireBeetleRiskWidget';
import { WoodpeckerIndexWidget } from '@/components/dashboard/WoodpeckerIndexWidget';
import { ThreatFusionCard } from '@/components/dashboard/ThreatFusionCard';
import { ForestProfitLoss } from '@/components/dashboard/ForestProfitLoss';
import { ForestPostcard } from '@/components/dashboard/ForestPostcard';
import { ThreeCards } from '@/components/dashboard/ThreeCards';
import { ExportReportButton } from '@/components/dashboard/ExportReportButton';
import { LeaseWidget } from '@/components/dashboard/LeaseWidget';
import type maplibregl from 'maplibre-gl';
import { ChevronDown } from 'lucide-react';

// Behavioral science components (lazy-loaded)
const ForestNarrative = React.lazy(() => import('@/components/behavioral/ForestNarrative'));
const OwnershipMetrics = React.lazy(() => import('@/components/behavioral/OwnershipMetrics'));
const BeetleCountdown = React.lazy(() => import('@/components/behavioral/BeetleCountdown'));
const NeighborBenchmark = React.lazy(() => import('@/components/behavioral/NeighborBenchmark'));
const ForestPlanProgress = React.lazy(() => import('@/components/behavioral/ForestPlanProgress'));
const ScarfDashboard = React.lazy(() => import('@/components/behavioral/ScarfDashboard'));
const ForestIntelligenceSummary = React.lazy(() => import('@/components/disclosure/ForestIntelligenceSummary'));

function BehavioralFallback() {
  return <WidgetSkeleton variant="card" />;
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

/* ═══ Collapsible Dashboard Section ═══ */

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between py-3 px-1 text-sm font-semibold text-[var(--text2)] hover:text-[var(--text)] transition-colors"
      >
        <span>{title}</span>
        <ChevronDown
          size={16}
          className={`transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
          {children}
        </div>
      )}
    </div>
  );
}

/* ═══ Wingman Auto-Greeting — shows once on first visit ═══ */

const GREETING_STORAGE_KEY = 'beetlesense-wingman-greeted';

function WingmanGreeting({ onOpenCompanion }: { onOpenCompanion: () => void }) {
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(GREETING_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(GREETING_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  const handleAsk = () => {
    handleDismiss();
    onOpenCompanion();
  };

  if (!visible) return null;

  return (
    <div
      className="mb-5 rounded-xl p-5 border border-[var(--green)]/30 animate-in fade-in slide-in-from-top-2 duration-500"
      style={{ background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.08), var(--bg2))' }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--green)]/15 flex items-center justify-center shrink-0">
          <Sparkles size={20} className="text-[var(--green)]" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text)] mb-1">
            Welcome! I'm your forest assistant.
          </p>
          <p className="text-xs text-[var(--text2)] leading-relaxed mb-3">
            I can see your forest at Norra Skiftet is looking good today. Ask me anything —
            from beetle risk to timber value, I'll find the answer.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleAsk}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
            >
              Ask a question
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══ Onboarding Tour — 3-step walkthrough for new users ═══ */

const TOUR_STORAGE_KEY = 'beetlesense-tour-completed';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'This is your forest',
    description: 'The postcard shows the overall health and value of your land. Green means everything is fine.',
    icon: <TreePine size={24} className="text-[var(--green)]" />,
  },
  {
    title: 'Meet your AI assistant',
    description: 'Ask the forest anything — beetle risks, timber value, what to do next. Just type a question.',
    icon: <Sparkles size={24} className="text-[var(--green)]" />,
  },
  {
    title: 'Choose your path',
    description: 'Pick a question below the postcard to see only what matters to you. No need to explore everything.',
    icon: <Map size={24} className="text-[var(--green)]" />,
  },
];

function OnboardingTour({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => {
    try {
      return !localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      return true;
    }
  });

  const handleFinish = () => {
    setVisible(false);
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    onComplete();
  };

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
      <div
        className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl animate-in fade-in zoom-in-95 duration-300"
      >
        <div className="w-16 h-16 rounded-2xl bg-[var(--green)]/10 flex items-center justify-center mx-auto mb-5">
          {current.icon}
        </div>
        <h2 className="text-xl font-bold text-[var(--text)] mb-2">{current.title}</h2>
        <p className="text-sm text-[var(--text2)] leading-relaxed mb-6">{current.description}</p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step ? 'bg-[var(--green)] w-6' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleFinish}
            className="px-4 py-2 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
          >
            Skip tour
          </button>
          <button
            onClick={() => isLast ? handleFinish() : setStep((s) => s + 1)}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all"
          >
            {isLast ? 'Get started' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══ Weekly Digest Settings ═══ */

function WeeklyDigestCard() {
  const [enabled, setEnabled] = useState(false);
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    // In production this would call a Supabase edge function
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="rounded-xl border border-[var(--border)] p-5" style={{ background: 'var(--bg2)' }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Weekly Forest Digest</h3>
          <p className="text-xs text-[var(--text3)]">Get a plain-language summary every Monday</p>
        </div>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
            enabled ? 'bg-[var(--green)]' : 'bg-gray-200'
          }`}
          role="switch"
          aria-checked={enabled}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${
              enabled ? 'translate-x-5' : ''
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:border-[var(--green)]"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={!email}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--green)] text-white hover:brightness-110 transition-all disabled:opacity-50"
            >
              {saved ? 'Saved!' : 'Save'}
            </button>
            <span className="text-[10px] text-[var(--text3)]">
              Example: "Your forest is healthy. No action needed this week."
            </span>
          </div>
        </div>
      )}
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

/* ═══ Guided Journeys — question-based paths instead of "Show all" ═══ */

interface JourneyOption {
  id: string;
  question: string;
  icon: string;
  description: string;
  /** Risk threshold: show this journey prominently when risk >= this value */
  riskPriority?: number;
}

const JOURNEYS: JourneyOption[] = [
  { id: 'health', question: 'How is my forest doing?', icon: '🌲', description: 'Health data, threats and satellite images', riskPriority: 50 },
  { id: 'money', question: 'What is my forest worth?', icon: '💰', description: 'Timber prices, growth and carbon credits' },
  { id: 'todo', question: 'What should I do now?', icon: '📋', description: 'Next action, calendar and advice', riskPriority: 30 },
  { id: 'learn', question: 'I want to learn more', icon: '📚', description: 'Academy, glossary and research' },
];

function GuidedJourneys({
  onSelectJourney,
  onShowFullDashboard,
  riskScore,
}: {
  onSelectJourney: (id: string | null) => void;
  onShowFullDashboard: () => void;
  riskScore: number;
}) {
  // Sort journeys: if risk is high, push health/action to top
  const sorted = [...JOURNEYS].sort((a, b) => {
    const aPriority = a.riskPriority && riskScore >= a.riskPriority ? 1 : 0;
    const bPriority = b.riskPriority && riskScore >= b.riskPriority ? 1 : 0;
    return bPriority - aPriority;
  });

  // If risk is high, show a highlighted prompt
  const urgentJourney = riskScore >= 50 ? sorted[0] : null;

  return (
    <div className="mt-6 space-y-3">
      <p
        className="text-sm text-[#707a70] text-center"
        style={{ fontFamily: "'Cormorant Garamond', serif" }}
      >
        What would you like to know?
      </p>

      {/* Highlighted journey when risk is elevated */}
      {urgentJourney && (
        <button
          onClick={() => onSelectJourney(urgentJourney.id)}
          className="w-full text-left p-5 rounded-xl border-2 border-[var(--green)] bg-[var(--green)]/5 transition-all duration-300 group"
        >
          <span className="text-lg block mb-1">{urgentJourney.icon}</span>
          <p className="text-base font-bold text-[var(--green)]">
            {urgentJourney.question}
          </p>
          <p className="text-xs text-[var(--text3)] mt-0.5">{urgentJourney.description}</p>
        </button>
      )}

      <div className="grid grid-cols-2 gap-3">
        {sorted.filter((j) => j.id !== urgentJourney?.id).map((j) => (
          <button
            key={j.id}
            onClick={() => onSelectJourney(j.id)}
            className="text-left p-4 rounded-xl border border-[var(--border)] hover:border-[var(--green)]/40 hover:bg-[var(--green)]/5 transition-all duration-300 group"
            style={{ background: 'var(--bg2)' }}
          >
            <span className="text-lg block mb-1">{j.icon}</span>
            <p className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--green)] transition-colors">
              {j.question}
            </p>
            <p className="text-[11px] text-[var(--text3)] mt-0.5">{j.description}</p>
          </button>
        ))}
      </div>

      <button
        onClick={onShowFullDashboard}
        className="w-full py-2 text-[11px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
      >
        Show full dashboard
      </button>
    </div>
  );
}

/* ═══ Journey-filtered widget sets ═══ */

function JourneyView({
  journey,
  onBack,
  onOpenCompanion,
  healthData,
}: {
  journey: string;
  onBack: () => void;
  onOpenCompanion: () => void;
  healthData: ReturnType<typeof useForestHealthScore>;
}) {
  const title = JOURNEYS.find((j) => j.id === journey)?.question ?? '';

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-xs text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
      >
        &larr; Back
      </button>
      <h2
        className="text-2xl text-[var(--text)]"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        {title}
      </h2>

      {journey === 'health' && (
        <>
          <ForestHealthScore data={healthData} />
          <HealthScoreBreakdown breakdown={healthData.breakdown} isLoading={healthData.isLoading} />
          <EarlyWarningWidget />
          <BeetleForecast />
          <SatelliteCheckWidget />
          <WeatherWidget parcelId="p1" />
        </>
      )}

      {journey === 'money' && (
        <>
          <TimberValueEstimator onOpenCompanion={onOpenCompanion} />
          <MarketWidget />
          <CarbonWidget />
          <ForestAssetCard />
          <ForestProfitLoss />
          <HarvestOptimizer />
        </>
      )}

      {journey === 'todo' && (
        <>
          <AdvisorWidget />
          <CalendarWidget />
          <Suspense fallback={<BehavioralFallback />}>
            <BeetleCountdown />
          </Suspense>
          <ContractorWidget />
          <StormWidget />
        </>
      )}

      {journey === 'learn' && (
        <>
          <AcademyWidget />
          <FirstYearWidget />
          <KnowledgeWidget />
          <WikiWidget />
          <NewsWidget />
        </>
      )}

      {/* CTA to ask Wingman for more */}
      <button
        onClick={onOpenCompanion}
        className="w-full mt-4 py-4 rounded-xl bg-[var(--green)]/10 text-[var(--green)] font-semibold text-sm hover:bg-[var(--green)]/15 transition-colors flex items-center justify-center gap-2"
      >
        <Sparkles size={16} />
        Ask Wingman for more
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const [_map, setMap] = useState<maplibregl.Map | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [companionOpen, setCompanionOpen] = useState(false);
  const [showFullDashboard, setShowFullDashboard] = useState(false);
  const [activeJourney, setActiveJourney] = useState<string | null>(null);
  const isDemoMode = isDemo() || !isSupabaseConfigured;
  const user = useAuthStore((s) => s.user);

  // Initialize push notifications for authenticated (non-demo) users
  useEffect(() => {
    if (isDemoMode || !user?.id) return;
    try {
      initPushNotifications(user.id);
    } catch {
      // Silently fail — push notifications are not critical
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* Left sidebar (collapsible) — full-width on mobile, sidebar on desktop */}
      <div
        className={`lg:absolute lg:top-0 lg:left-0 lg:bottom-0 lg:z-20 lg:border-r transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-full lg:w-80 xl:w-96 border-[var(--border)] overflow-y-auto`}
        style={{ background: 'var(--bg2)' }}
      >
        <div className="p-5">
          <div className="flex items-center justify-between mb-1" data-tour="welcome">
            <div>
              <h1 className="text-lg font-serif font-bold text-[var(--text)]">
                {t('owner.dashboard.title', 'Forest OS')}
              </h1>
              <span className="text-[9px] font-mono text-[var(--text3)] tracking-wider uppercase">
                Operating system for your land &middot; v2.7.0
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
          <p className="text-xs text-[var(--text3)] mb-4">
            {t('owner.dashboard.subtitle')}
          </p>

          {/* ═══ Wingman Quick Ask — the front door to everything ═══ */}
          <button
            onClick={() => setCompanionOpen(true)}
            className="w-full mb-5 flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--green)]/40 hover:bg-[var(--green)]/5 transition-all duration-300 group"
            style={{ background: 'var(--bg)' }}
          >
            <Sparkles size={16} className="text-[var(--green)] shrink-0 group-hover:scale-110 transition-transform" />
            <span className="text-sm text-[var(--text3)] group-hover:text-[var(--text2)] transition-colors">
              Ask anything about your forest...
            </span>
          </button>

          {error && (
            <div className="mb-4">
              <ErrorBanner message={error} onRetry={() => window.location.reload()} />
            </div>
          )}

          {/* Wingman greeting for first-time visitors */}
          <WingmanGreeting onOpenCompanion={() => setCompanionOpen(true)} />

          {/* ═══ LAYER 1: The Postcard — one screen, one sentence, one button ═══ */}
          {!showFullDashboard && !activeJourney && (
            <>
              <ForestPostcard
                onOpenCompanion={() => setCompanionOpen(true)}
              />
              <ExportReportButton
                healthScore={healthData.score ?? 92}
                forestValue="12.4M kr"
                riskLevel={healthData.isLoading ? 'Loading...' : 'Low'}
                parcelName="Norra Skiftet"
              />

              {/* ═══ LAYER 2: Three Cards — Health, Money, Next Action ═══ */}
              <div className="mt-5">
                <ThreeCards onOpenCompanion={() => setCompanionOpen(true)} />
              </div>

              {/* ═══ Guided Journeys — contextual paths instead of "Visa allt" ═══ */}
              <GuidedJourneys
                onSelectJourney={setActiveJourney}
                onShowFullDashboard={() => setShowFullDashboard(true)}
                riskScore={healthData.score ?? 0}
              />
            </>
          )}

          {/* ═══ LAYER 1b: Journey View — filtered widgets for chosen question ═══ */}
          {!showFullDashboard && activeJourney && (
            <JourneyView
              journey={activeJourney}
              onBack={() => setActiveJourney(null)}
              onOpenCompanion={() => setCompanionOpen(true)}
              healthData={healthData}
            />
          )}

          {/* ═══ LAYER 3: Full Dashboard — for power users and investors ═══ */}
          {showFullDashboard && (
            <>
              {/* Collapse button */}
              <button
                onClick={() => setShowFullDashboard(false)}
                className="w-full mb-5 py-2 rounded-lg text-[10px] font-medium text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
              >
                &larr; Back to overview
              </button>

              {/* Demo welcome banner */}
              {isDemoMode && (
                <DemoWelcomeBanner onOpenCompanion={() => setCompanionOpen(true)} />
              )}

              {/* ═══ SECTION 1: Health & Threats (open by default) ═══ */}
              <CollapsibleSection title="Health & Threats" defaultOpen>
                <Suspense fallback={<BehavioralFallback />}>
                  <ForestIntelligenceSummary />
                </Suspense>
                <Suspense fallback={<BehavioralFallback />}>
                  <ForestNarrative />
                </Suspense>
                <ThreatFusionCard />
                <ForestHealthScore data={healthData} />
                <HealthScoreBreakdown breakdown={healthData.breakdown} isLoading={healthData.isLoading} />
                <RegionalBenchmark score={healthData.score} benchmark={healthData.benchmark} isLoading={healthData.isLoading} />
                <RegulatoryAlertBanner />
                <EarlyWarningWidget />
                <Suspense fallback={<BehavioralFallback />}>
                  <BeetleCountdown />
                </Suspense>
                <BeetleForecast />
                <EmergencyHistoryWidget />
                <StormWidget />
                <DroughtMonitorWidget />
                <FireBeetleRiskWidget />
                <WoodpeckerIndexWidget />
                <LiveDataPanel />
              </CollapsibleSection>

              {/* ═══ SECTION 2: Actions & Planning ═══ */}
              <CollapsibleSection title="Actions & Planning">
                <AdvisorWidget />
                <WeatherWidget parcelId="p1" />
                <CalendarWidget />
                <NewsWidget />
                <SatelliteCheckWidget />
                <NeighborWidget />
                <Suspense fallback={<BehavioralFallback />}>
                  <NeighborBenchmark />
                </Suspense>
              </CollapsibleSection>

              {/* ═══ SECTION 3: Financial Picture ═══ */}
              <CollapsibleSection title="Financial Picture">
                <ProfitSummaryWidget />
                <TimberValueEstimator onOpenCompanion={() => setCompanionOpen(true)} />
                <MarketWidget />
                <HarvestOptimizer />
                <CarbonWidget />
                <ForestAssetCard />
                <ForestProfitLoss />
                <LeaseWidget />
                <Suspense fallback={<BehavioralFallback />}>
                  <OwnershipMetrics areaHa={0} />
                </Suspense>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-3">
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
                <div>
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
              </CollapsibleSection>

              {/* ═══ SECTION 4: Deep Dive & Operations ═══ */}
              <CollapsibleSection title="Deep Dive & Operations">
                <GrowthWidget />
                <RotationWidget />
                <BenchmarkWidget />
                <MicroclimateWidget />
                <ComplianceWidget />
                <InsuranceRisk />
                <RegulatoryRadarWidget />
                <ContractorWidget />
                <LogisticsWidget />
                <MarketplaceWidget />
                <AcademyWidget />
                <FirstYearWidget />
                <ArchiveWidget />
                <KnowledgeWidget />
                <WikiWidget />
                <ReportsWidget />
                <Suspense fallback={<BehavioralFallback />}>
                  <ForestPlanProgress />
                </Suspense>
                <Suspense fallback={<BehavioralFallback />}>
                  <ScarfDashboard />
                </Suspense>
                <SharedWithMeSection />
              </CollapsibleSection>

              {/* ═══ Weekly Digest Settings ═══ */}
              <WeeklyDigestCard />

              {/* Recent activity feed */}
              <div className="mt-4">
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
            </>
          )}
        </div>
      </div>

      {/* Map - full screen background (desktop only) */}
      <div className="hidden lg:flex lg:flex-1 relative" data-tour="map">
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

      {/* Onboarding Tour — 3-step walkthrough for new users */}
      <OnboardingTour onComplete={() => {}} />
    </div>
  );
}

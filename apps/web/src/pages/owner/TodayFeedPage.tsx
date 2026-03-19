import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bug,
  Satellite,
  TrendingUp,
  Wallet,
  Thermometer,
  TreePine,
  ListChecks,
  BookOpen,
  Leaf,
  ClipboardCheck,
  Bell,
  Users,
  MessageSquare,
  ClipboardList,
  Camera,
  ShieldAlert,
  X,
  ChevronDown,
  ChevronUp,
  Flame,
  CloudSun,
  Droplets,
  Wind,
  RefreshCw,
  Plus,
  Search,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Behavioral science components (lazy-loaded)
const LossAversionCard = React.lazy(() => import('@/components/behavioral/LossAversionCard'));
const BeetleCountdown = React.lazy(() => import('@/components/behavioral/BeetleCountdown'));

function BehavioralFallback() {
  return <div className="h-16 rounded-xl bg-white/[0.03] animate-pulse" />;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Priority = 'critical' | 'warning' | 'info' | 'insight';

interface FeedItem {
  id: string;
  priority: Priority;
  icon: React.ReactNode;
  category: string;
  title: string;
  description: string;
  action: string;
  route: string;
  time: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DISMISSED_KEY = 'beetlesense_today_dismissed';
const STREAK_KEY = 'beetlesense_streak';
const LAST_VISIT_KEY = 'beetlesense_last_visit';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'God natt';
  if (h < 10) return 'God morgon';
  if (h < 17) return 'God eftermiddag';
  return 'God kväll';
}

function getTodaySwedish(): string {
  const d = new Date();
  const days = ['söndag', 'måndag', 'tisdag', 'onsdag', 'torsdag', 'fredag', 'lördag'];
  const months = [
    'januari', 'februari', 'mars', 'april', 'maj', 'juni',
    'juli', 'augusti', 'september', 'oktober', 'november', 'december',
  ];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function loadDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

function getStreak(): number {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const last = localStorage.getItem(LAST_VISIT_KEY);
    let streak = parseInt(localStorage.getItem(STREAK_KEY) || '0', 10);

    if (last === today) return streak;

    const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    if (last === yesterday) {
      streak += 1;
    } else {
      streak = 1;
    }
    localStorage.setItem(STREAK_KEY, String(streak));
    localStorage.setItem(LAST_VISIT_KEY, today);
    return streak;
  } catch {
    return 1;
  }
}

// ---------------------------------------------------------------------------
// Priority styling
// ---------------------------------------------------------------------------

const priorityConfig: Record<Priority, { border: string; badge: string; badgeText: string; stripe: string }> = {
  critical: {
    border: 'border-red-500/60',
    badge: 'bg-red-500/20 text-red-400',
    badgeText: 'Kritisk',
    stripe: 'bg-red-500',
  },
  warning: {
    border: 'border-amber-500/50',
    badge: 'bg-amber-500/20 text-amber-400',
    badgeText: 'Varning',
    stripe: 'bg-amber-500',
  },
  info: {
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/15 text-emerald-400',
    badgeText: 'Info',
    stripe: 'bg-emerald-500',
  },
  insight: {
    border: 'border-blue-500/40',
    badge: 'bg-blue-500/20 text-blue-400',
    badgeText: 'Insikt',
    stripe: 'bg-blue-500',
  },
};

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const DEMO_NAME = 'Erik';

const DEMO_FEED: FeedItem[] = [
  {
    id: 'f1',
    priority: 'critical',
    icon: <Bug className="w-5 h-5" />,
    category: 'Barkborre',
    title: 'Bark beetle risk elevated in Värnamo',
    description: 'Ips typographus svärmning detekterad — hög risk i ditt område baserat på temperatur och vindförhållanden.',
    action: 'Visa karta',
    route: '/owner/map',
    time: '2h sedan',
  },
  {
    id: 'f2',
    priority: 'warning',
    icon: <Satellite className="w-5 h-5" />,
    category: 'Satellit',
    title: 'NDVI dropped 3 points in Granudden this week',
    description: 'Vegetationsindex sjönk från 0.74 till 0.71 — kan indikera stress eller tidig angrepp.',
    action: 'Analysera',
    route: '/owner/satellite-check',
    time: '4h sedan',
  },
  {
    id: 'f3',
    priority: 'info',
    icon: <TrendingUp className="w-5 h-5" />,
    category: 'Marknad',
    title: 'Timber prices rose 4% for gran sagtimmer',
    description: 'Genomsnittspris nu 685 kr/m³fub — högsta nivån sedan Q2 2025.',
    action: 'Se marknad',
    route: '/owner/timber-market',
    time: '6h sedan',
  },
  {
    id: 'f4',
    priority: 'insight',
    icon: <Wallet className="w-5 h-5" />,
    category: 'Portfölj',
    title: 'Your portfolio value increased by 12,400 kr this month',
    description: 'Totalvärde: 2,847,000 kr (+0.4%). Drivet av ökade timmerpriser och tillväxt.',
    action: 'Se portfölj',
    route: '/owner/portfolio',
    time: '1d sedan',
  },
  {
    id: 'f5',
    priority: 'info',
    icon: <Thermometer className="w-5 h-5" />,
    category: 'Väder',
    title: 'Frost risk tonight: -2°C expected in your area',
    description: 'Markfrost väntas mellan 02:00–06:00. Nyplanterade plantor kan behöva skydd.',
    action: 'Skyddsåtgärder',
    route: '/owner/microclimate-almanac',
    time: '1h sedan',
  },
  {
    id: 'f6',
    priority: 'info',
    icon: <TreePine className="w-5 h-5" />,
    category: 'Grannar',
    title: 'Neighbor filed avverkningsanmälan 800m from Tallbacken',
    description: 'Slutavverkning planerad på 4.2 ha gran — kan påverka vindexponering på din mark.',
    action: 'Visa aktivitet',
    route: '/owner/neighbor-activity',
    time: '8h sedan',
  },
  {
    id: 'f7',
    priority: 'insight',
    icon: <ListChecks className="w-5 h-5" />,
    category: 'Första året',
    title: "You've completed 3 of 24 first-year tasks",
    description: 'Nästa steg: Markbered för plantering i Björklund (deadline: april).',
    action: 'Fortsätt',
    route: '/owner/first-year',
    time: '12h sedan',
  },
  {
    id: 'f8',
    priority: 'info',
    icon: <BookOpen className="w-5 h-5" />,
    category: 'Forskning',
    title: 'New research: Early detection of Ips typographus using Sentinel-2',
    description: 'Ny studie från SLU visar 89% detektionsnoggrannhet med multispektral analys.',
    action: 'Läs mer',
    route: '/owner/research',
    time: '1d sedan',
  },
  {
    id: 'f9',
    priority: 'insight',
    icon: <Leaf className="w-5 h-5" />,
    category: 'Kol',
    title: 'Your carbon sequestration: 47 tonnes CO₂ this year',
    description: 'Dina skogsbestånd binder aktivt koldioxid — motsvarar 12 flygresor Stockholm–London.',
    action: 'Se detaljer',
    route: '/owner/carbon',
    time: '2d sedan',
  },
  {
    id: 'f10',
    priority: 'info',
    icon: <ClipboardCheck className="w-5 h-5" />,
    category: 'Inventering',
    title: 'Survey for Björklund completed — results ready',
    description: 'Dröneinventering klar: 2,340 stammar kartlagda, medeldiameter 24cm.',
    action: 'Visa resultat',
    route: '/owner/surveys',
    time: '3d sedan',
  },
  {
    id: 'f11',
    priority: 'insight',
    icon: <Bell className="w-5 h-5" />,
    category: 'Tips',
    title: 'Tip: Enable push notifications to get bark beetle alerts instantly',
    description: 'Få realtidsvarningar direkt på mobilen när risknivåer ändras i ditt område.',
    action: 'Aktivera',
    route: '/owner/notification-settings',
    time: '5d sedan',
  },
  {
    id: 'f12',
    priority: 'info',
    icon: <Users className="w-5 h-5" />,
    category: 'Community',
    title: 'Community: 3 new posts from forest owners in your region',
    description: 'Diskussioner om planteringstid, markberedning och viltskador i Värnamo-trakten.',
    action: 'Öppna',
    route: '/owner/community',
    time: '4h sedan',
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DailyScoreRing({ score, expanded, onToggle }: { score: number; expanded: boolean; onToggle: () => void }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <button
      onClick={onToggle}
      className="flex flex-col items-center w-full rounded-2xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md p-6 transition-all duration-300 hover:bg-white/[0.05] cursor-pointer"
    >
      <div className="flex items-center gap-6 w-full">
        <div className="relative shrink-0">
          <svg width="128" height="128" viewBox="0 0 128 128" className="drop-shadow-lg">
            <circle cx="64" cy="64" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
            <circle
              cx="64"
              cy="64"
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              transform="rotate(-90 64 64)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{score}</span>
            <span className="text-[10px] text-emerald-400/70 uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        <div className="flex-1 text-left">
          <h3 className="text-lg font-semibold text-white">Skogshälsa</h3>
          <p className="text-sm text-white/50 mt-1">Samlat hälsoindex för alla dina skiften</p>
          <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{expanded ? 'Dölj detaljer' : 'Visa fördelning per skifte'}</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-5 w-full border-t border-white/[0.06] pt-4 grid grid-cols-2 gap-3">
          {[
            { name: 'Granudden', score: 72, ha: 12.4 },
            { name: 'Tallbacken', score: 91, ha: 8.7 },
            { name: 'Björklund', score: 94, ha: 5.2 },
            { name: 'Stenmuren', score: 88, ha: 15.1 },
          ].map((p) => {
            const c = p.score >= 75 ? 'text-emerald-400' : p.score >= 50 ? 'text-amber-400' : 'text-red-400';
            return (
              <div key={p.name} className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
                <div>
                  <span className="text-sm text-white/80">{p.name}</span>
                  <span className="block text-[10px] text-white/30">{p.ha} ha</span>
                </div>
                <span className={`text-lg font-bold ${c}`}>{p.score}</span>
              </div>
            );
          })}
        </div>
      )}
    </button>
  );
}

function FeedCard({
  item,
  index,
  onDismiss,
  onAction,
}: {
  item: FeedItem;
  index: number;
  onDismiss: (id: string) => void;
  onAction: (route: string) => void;
}) {
  const cfg = priorityConfig[item.priority];
  const [dismissed, setDismissed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const diff = e.touches[0].clientX - touchStart;
    if (diff < 0) setOffset(Math.max(diff, -160));
  };
  const handleTouchEnd = () => {
    if (offset < -100) {
      setDismissed(true);
      setTimeout(() => onDismiss(item.id), 300);
    } else {
      setOffset(0);
    }
    setTouchStart(null);
  };

  return (
    <div
      ref={cardRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`
        relative overflow-hidden rounded-xl border backdrop-blur-md
        bg-white/[0.03] transition-all duration-300
        ${cfg.border}
        ${dismissed ? 'opacity-0 translate-x-[-100%] max-h-0 mb-0 border-0 p-0' : 'max-h-[300px] mb-3'}
      `}
      style={{
        transform: dismissed ? 'translateX(-100%)' : `translateX(${offset}px)`,
        animationDelay: `${index * 60}ms`,
        animationFillMode: 'both',
      }}
    >
      {/* Priority color stripe */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.stripe}`} />

      <div className="pl-4 pr-3 py-3.5">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`shrink-0 mt-0.5 p-2 rounded-lg ${cfg.badge}`}>
            {item.icon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>
                {cfg.badgeText}
              </span>
              <span className="text-[10px] text-white/30">{item.category}</span>
              <span className="text-[10px] text-white/20 ml-auto shrink-0">{item.time}</span>
            </div>
            <h4 className="text-sm font-semibold text-white/90 leading-snug">{item.title}</h4>
            <p className="text-xs text-white/40 mt-1 leading-relaxed line-clamp-2">{item.description}</p>

            {/* Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAction(item.route);
              }}
              className="mt-2.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold
                bg-emerald-500/20 text-emerald-400 rounded-lg
                hover:bg-emerald-500/30 transition-colors duration-150"
            >
              {item.action}
            </button>
          </div>

          {/* Dismiss */}
          <button
            onClick={() => {
              setDismissed(true);
              setTimeout(() => onDismiss(item.id), 300);
            }}
            className="shrink-0 mt-0.5 p-1 rounded-md text-white/20 hover:text-white/50 hover:bg-white/[0.05] transition-colors"
            aria-label="Stäng"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function WeatherMicro() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.03] backdrop-blur-md px-5 py-3">
      <CloudSun className="w-8 h-8 text-amber-400" />
      <div className="flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white">14°C</span>
          <span className="text-xs text-white/40">Växlande molnighet</span>
        </div>
        <div className="flex items-center gap-4 mt-1 text-[11px] text-white/30">
          <span className="flex items-center gap-1"><Droplets className="w-3 h-3" />62%</span>
          <span className="flex items-center gap-1"><Wind className="w-3 h-3" />3 m/s NV</span>
          <span>Natt: -2°C</span>
          <span>Imorgon: 16°C</span>
        </div>
      </div>
    </div>
  );
}

function QuickActions({ onNavigate }: { onNavigate: (r: string) => void }) {
  const actions = [
    { label: 'Fråga AI', icon: <MessageSquare className="w-5 h-5" />, route: '/owner/dashboard', color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { label: 'Rapportera', icon: <ClipboardList className="w-5 h-5" />, route: '/owner/report', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { label: 'Skanna', icon: <Camera className="w-5 h-5" />, route: '/owner/capture', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
    { label: 'SOS', icon: <ShieldAlert className="w-5 h-5" />, route: '/owner/alerts', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  ];

  return (
    <>
      {/* Mobile: fixed bottom bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 lg:hidden bg-[#030d05]/90 backdrop-blur-xl border-t border-white/[0.06]">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {actions.map((a) => (
            <button
              key={a.label}
              onClick={() => onNavigate(a.route)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl border transition-all
                hover:scale-105 active:scale-95 ${a.color}`}
            >
              {a.icon}
              <span className="text-[10px] font-semibold">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: floating right panel */}
      <div className="hidden lg:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-3">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={() => onNavigate(a.route)}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-md
              bg-[#030d05]/80 transition-all hover:scale-105 active:scale-95 ${a.color}`}
          >
            {a.icon}
            <span className="text-sm font-semibold">{a.label}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak < 2) return null;
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/20">
      <Flame className="w-4 h-4 text-amber-400" />
      <span className="text-xs font-semibold text-amber-400">{streak} dagars streak</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Personalized feed builder
// ---------------------------------------------------------------------------

interface RealDataState {
  parcels: { id: string; name: string | null; area_ha: number; municipality: string | null; status: string }[];
  surveyCount: number;
  latestSurvey: { id: string; status: string; created_at: string } | null;
  alertCount: number;
}

function buildPersonalizedFeed(data: RealDataState, _userName: string): FeedItem[] {
  const items: FeedItem[] = [];
  const now = new Date();

  // Parcel summary
  if (data.parcels.length > 0) {
    const totalHa = data.parcels.reduce((s, p) => s + (p.area_ha ?? 0), 0);
    items.push({
      id: 'real-parcels',
      priority: 'info',
      icon: <TreePine className="w-5 h-5" />,
      category: 'Skiften',
      title: `${data.parcels.length} skifte${data.parcels.length > 1 ? 'n' : ''} registrerade (${totalHa.toFixed(1)} ha)`,
      description: data.parcels.map((p) => p.name || p.municipality || 'Namnlöst').join(', '),
      action: 'Visa skiften',
      route: '/owner/parcels',
      time: 'Nu',
    });
  }

  // Alerts
  if (data.alertCount > 0) {
    items.push({
      id: 'real-alerts',
      priority: 'warning',
      icon: <Bug className="w-5 h-5" />,
      category: 'Varningar',
      title: `${data.alertCount} aktiva varningar kräver uppmärksamhet`,
      description: 'Granbarkborre- eller stressvarningar har utlösts för dina skiften.',
      action: 'Visa varningar',
      route: '/owner/alerts',
      time: 'Idag',
    });
  }

  // Latest survey
  if (data.latestSurvey) {
    const surveyDate = new Date(data.latestSurvey.created_at);
    const daysDiff = Math.floor((now.getTime() - surveyDate.getTime()) / 86_400_000);
    const timeLabel = daysDiff === 0 ? 'Idag' : daysDiff === 1 ? 'Igår' : `${daysDiff}d sedan`;
    const statusLabel = data.latestSurvey.status === 'completed' ? 'klar' : data.latestSurvey.status === 'processing' ? 'bearbetas' : data.latestSurvey.status;

    items.push({
      id: 'real-latest-survey',
      priority: data.latestSurvey.status === 'processing' ? 'info' : 'insight',
      icon: <ClipboardCheck className="w-5 h-5" />,
      category: 'Inventering',
      title: `Senaste undersökning: ${statusLabel}`,
      description: `Totalt ${data.surveyCount} undersökning${data.surveyCount > 1 ? 'ar' : ''} genomförda.`,
      action: 'Visa resultat',
      route: '/owner/surveys',
      time: timeLabel,
    });
  }

  // CTA: no surveys yet
  if (data.surveyCount === 0 && data.parcels.length > 0) {
    items.push({
      id: 'real-cta-first-survey',
      priority: 'insight',
      icon: <Search className="w-5 h-5" />,
      category: 'Kom igång',
      title: 'Skapa din första undersökning',
      description: 'Beställ en drönarinventering eller satellitkontroll för att få detaljerad hälsodata om din skog.',
      action: 'Skapa undersökning',
      route: '/owner/surveys/create',
      time: 'Nu',
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// First-survey CTA card
// ---------------------------------------------------------------------------

function FirstSurveyCTA({ onNavigate }: { onNavigate: (r: string) => void }) {
  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] backdrop-blur-md p-5 mb-3">
      <div className="flex items-start gap-3">
        <div className="shrink-0 p-2.5 rounded-lg bg-emerald-500/20">
          <Plus className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-white/90">Skapa din första undersökning</h4>
          <p className="text-xs text-white/40 mt-1 leading-relaxed">
            Beställ en drönarinventering eller satellitkontroll för att övervaka din skogs hälsa.
          </p>
          <button
            onClick={() => onNavigate('/owner/surveys/create')}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold
              bg-emerald-500/20 text-emerald-400 rounded-lg
              hover:bg-emerald-500/30 transition-colors duration-150"
          >
            Kom igång
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function TodayFeedPage() {
  const navigate = useNavigate();
  const { profile, user } = useAuthStore();
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed);
  const [scoreExpanded, setScoreExpanded] = useState(false);
  const [streak] = useState(getStreak);
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pullStart = useRef<number | null>(null);

  // Real data state
  const [realData, setRealData] = useState<RealDataState | null>(null);
  const [isRealUser, setIsRealUser] = useState(false);

  // Fetch real user data from Supabase
  useEffect(() => {
    if (!user || !isSupabaseConfigured || user.id === 'demo-user') {
      setIsRealUser(false);
      return;
    }

    setIsRealUser(true);

    const fetchData = async () => {
      const [parcelsRes, surveysRes, alertsRes] = await Promise.all([
        supabase
          .from('parcels')
          .select('id, name, area_ha, municipality, status')
          .eq('owner_id', user.id)
          .eq('status', 'active'),
        supabase
          .from('surveys')
          .select('id, status, created_at')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('alerts')
          .select('id', { count: 'exact', head: true })
          .eq('resolved', false),
      ]);

      const parcels = parcelsRes.data ?? [];
      const latestSurvey = surveysRes.data?.[0] ?? null;

      // Get total survey count
      const { count: surveyCount } = await supabase
        .from('surveys')
        .select('id', { count: 'exact', head: true });

      setRealData({
        parcels,
        surveyCount: surveyCount ?? 0,
        latestSurvey,
        alertCount: alertsRes.count ?? 0,
      });
    };

    fetchData();
  }, [user]);

  // CSS animation keyframes injected once
  useEffect(() => {
    const id = 'today-feed-animations';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes todaySlideUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .today-card-enter {
        animation: todaySlideUp 0.4s ease-out;
      }
    `;
    document.head.appendChild(style);
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(next);
      return next;
    });
  }, []);

  // Use real data when available, demo data as fallback
  const userName = profile?.full_name?.split(' ')[0] ?? DEMO_NAME;
  const hasRealParcels = isRealUser && realData && realData.parcels.length > 0;

  const feedItems: FeedItem[] = hasRealParcels
    ? [...buildPersonalizedFeed(realData, userName), ...DEMO_FEED]
    : DEMO_FEED;

  const visibleFeed = feedItems.filter((f) => !dismissed.has(f.id));
  const showFirstSurveyCTA = hasRealParcels && realData.surveyCount === 0;

  // Pull-to-refresh
  const handlePtrStart = (e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop <= 0) {
      pullStart.current = e.touches[0].clientY;
    }
  };
  const handlePtrMove = (e: React.TouchEvent) => {
    if (pullStart.current === null) return;
    const diff = e.touches[0].clientY - pullStart.current;
    if (diff > 0) setPullY(Math.min(diff * 0.4, 80));
  };
  const handlePtrEnd = () => {
    if (pullY > 50) {
      setRefreshing(true);
      setTimeout(() => {
        setRefreshing(false);
        setPullY(0);
      }, 1200);
    } else {
      setPullY(0);
    }
    pullStart.current = null;
  };

  return (
    <div className="relative min-h-screen bg-[#030d05] text-white">
      {/* Pull-to-refresh indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-300"
        style={{ height: refreshing ? 48 : pullY > 10 ? pullY : 0 }}
      >
        <RefreshCw className={`w-5 h-5 text-emerald-400 ${refreshing ? 'animate-spin' : ''}`} />
      </div>

      <div
        ref={scrollRef}
        onTouchStart={handlePtrStart}
        onTouchMove={handlePtrMove}
        onTouchEnd={handlePtrEnd}
        className="max-w-2xl mx-auto px-4 pt-8 pb-28 lg:pb-8 lg:pr-48"
      >
        {/* ---- Header ---- */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                {getGreeting()}, {userName}
              </h1>
              <p className="text-sm text-white/40 mt-1 capitalize">{getTodaySwedish()}</p>
            </div>
            <StreakBadge streak={streak} />
          </div>
        </header>

        {/* ---- Loss Aversion — what's at risk today ---- */}
        <section className="mb-5 today-card-enter">
          <Suspense fallback={<BehavioralFallback />}>
            <LossAversionCard />
          </Suspense>
        </section>

        {/* ---- Beetle Countdown — urgency below greeting ---- */}
        <section className="mb-5 today-card-enter" style={{ animationDelay: '40ms', animationFillMode: 'both' }}>
          <Suspense fallback={<BehavioralFallback />}>
            <BeetleCountdown />
          </Suspense>
        </section>

        {/* ---- Weather ---- */}
        <section className="mb-5 today-card-enter">
          <WeatherMicro />
        </section>

        {/* ---- Daily Score ---- */}
        <section className="mb-6 today-card-enter" style={{ animationDelay: '80ms', animationFillMode: 'both' }}>
          <DailyScoreRing score={87} expanded={scoreExpanded} onToggle={() => setScoreExpanded((p) => !p)} />
        </section>

        {/* ---- First Survey CTA ---- */}
        {showFirstSurveyCTA && (
          <section className="mb-5 today-card-enter" style={{ animationDelay: '120ms', animationFillMode: 'both' }}>
            <FirstSurveyCTA onNavigate={(r) => navigate(r)} />
          </section>
        )}

        {/* ---- Feed ---- */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">Dagens händelser</h2>
            {dismissed.size > 0 && (
              <button
                onClick={() => { setDismissed(new Set()); saveDismissed(new Set()); }}
                className="text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
              >
                Återställ alla ({dismissed.size})
              </button>
            )}
          </div>

          {visibleFeed.length === 0 ? (
            <div className="text-center py-16 text-white/30">
              <ListChecks className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Inga händelser kvar — allt hanterat!</p>
            </div>
          ) : (
            visibleFeed.map((item, i) => (
              <FeedCard
                key={item.id}
                item={item}
                index={i}
                onDismiss={handleDismiss}
                onAction={(route) => navigate(route)}
              />
            ))
          )}
        </section>
      </div>

      {/* ---- Quick Actions ---- */}
      <QuickActions onNavigate={(r) => navigate(r)} />
    </div>
  );
}

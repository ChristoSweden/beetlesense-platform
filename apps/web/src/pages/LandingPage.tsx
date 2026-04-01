import React, { useState, useEffect, useRef, useCallback, Suspense, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  Bug,
  TreePine,
  Sparkles,
  Plane,
  ShieldCheck,
  MapPin,
  Satellite,
  BrainCircuit,
  Home,
  Send,
  ChevronDown,
  ArrowRight,
  Star,
  Check,
  X,
  Menu,
  Zap,
  BookOpen,
  BarChart3,
  Mail,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';

// Lazy-loaded heavy components
const AnchoringComparison = React.lazy(() => import('@/components/behavioral/AnchoringComparison'));
const Forest3D = React.lazy(() => import('@/components/Forest3D'));

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
   INLINE DATA Ã¢ÂÂ self-contained, no external file imports
   ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */

const FEATURES = [
  {
    icon: Bug,
    title: 'Barkborredetektion',
    titleEn: 'Bark Beetle Detection',
    desc: 'AI-driven tidig varning for granbarkborre (Ips typographus) via satellitbilder och drÃÂ¶nare. UpptÃÂ¤ck angrepp 2-4 veckor fÃÂ¶re synliga symptom.',
    descEn: 'AI-powered early warning for European spruce bark beetle via satellite and drone imagery. Detect infestations 2-4 weeks before visible symptoms.',
    demoUrl: '/owner/early-detection',
  },
  {
    icon: TreePine,
    title: 'SkogshÃÂ¤lsoÃÂ¶vervakning',
    titleEn: 'Forest Health Monitoring',
    desc: 'Kontinuerlig NDVI-analys, fuktnivÃÂ¥er och tillvÃÂ¤xttakt. HÃÂ¤lsopoÃÂ¤ng per skifte uppdateras var 5:e dag under vÃÂ¤xtsÃÂ¤songen.',
    descEn: 'Continuous NDVI analysis, moisture levels and growth rates. Per-parcel health scores updated every 5 days during the growing season.',
    demoUrl: '/owner/dashboard',
  },
  {
    icon: BarChart3,
    title: 'Virkesvolymuppskattning',
    titleEn: 'Timber Volume Estimation',
    desc: 'Kombinera LiDAR, satellitdata och fÃÂ¤ltmÃÂ¤tningar fÃÂ¶r att berÃÂ¤kna stÃÂ¥ende volym, tillvÃÂ¤xt och optimala avverkningstidpunkter.',
    descEn: 'Combine LiDAR, satellite data and field measurements to estimate standing volume, growth and optimal harvest timing.',
    demoUrl: '/owner/parcels/p1',
  },
  {
    icon: Sparkles,
    title: 'AI-kompanjon (SkogsrÃÂ¥dgivaren)',
    titleEn: 'AI Companion (SkogsrÃÂ¥dgivaren)',
    desc: 'StÃÂ¤ll frÃÂ¥gor om din skog pÃÂ¥ naturligt sprÃÂ¥k. Personliga rÃÂ¥d baserade pÃÂ¥ dina skiften, lokalt klimat och 241+ vetenskapliga kÃÂ¤llor.',
    descEn: 'Ask questions about your forest in natural language. Personalized advice based on your parcels, local climate and 241+ scientific sources.',
    demoUrl: '/owner/advisor',
  },
  {
    icon: Plane,
    title: 'DrÃÂ¶narintegration',
    titleEn: 'Drone Integration',
    desc: 'BestÃÂ¤ll drÃÂ¶narundersÃÂ¶kningar via plattformen. Automatiserade flygplaner, bildbearbetning och centimeternivÃÂ¥detektering.',
    descEn: 'Order drone surveys through the platform. Automated flight plans, image processing and centimeter-level detection.',
    demoUrl: '/owner/surveys',
  },
  {
    icon: ShieldCheck,
    title: 'Regelefterlevnad',
    titleEn: 'Regulatory Compliance',
    desc: 'HÃÂ¥ll koll pÃÂ¥ SVL-krav, Skogsstyrelsens regler och EU:s avskogningsfÃÂ¶rordning (EUDR). Automatisk rapportering och dokumentation.',
    descEn: 'Stay on top of SVL requirements, Swedish Forest Agency rules and EU Deforestation Regulation (EUDR). Automated reporting.',
    demoUrl: '/owner/compliance',
  },
] as const;

const STEPS = [
  {
    num: '01',
    icon: MapPin,
    title: 'Registrera dina skiften',
    titleEn: 'Register your parcels',
    desc: 'Ange din fastighetsbeteckning eller rita grÃÂ¤nser pÃÂ¥ kartan. Vi hÃÂ¤mtar data frÃÂ¥n LantmÃÂ¤teriet automatiskt.',
    descEn: 'Enter your property designation or draw boundaries on the map. We fetch data from LantmÃÂ¤teriet automatically.',
  },
  {
    num: '02',
    icon: Satellite,
    title: 'Ladda upp drÃÂ¶nardata eller anvÃÂ¤nd satellit',
    titleEn: 'Upload drone data or use satellite',
    desc: 'Sentinel-2 satellitbilder analyseras automatiskt. Vill du ha hÃÂ¶gre upplÃÂ¶sning? BestÃÂ¤ll en drÃÂ¶narundersÃÂ¶kning.',
    descEn: 'Sentinel-2 satellite imagery is analyzed automatically. Want higher resolution? Order a drone survey.',
  },
  {
    num: '03',
    icon: BrainCircuit,
    title: 'FÃÂ¥ AI-drivna insikter',
    titleEn: 'Get AI-powered insights',
    desc: 'Varningar fÃÂ¶r upptÃÂ¤ckta risker, hÃÂ¤lsotrender och handlingsbara rekommendationer anpassade till just din skog.',
    descEn: 'Alerts for detected risks, health trends and actionable recommendations tailored to your specific forest.',
  },
] as const;

const PERSONAS = [
  {
    icon: Home,
    title: 'SkogsÃÂ¤gare',
    titleEn: 'Forest Owners',
    desc: 'ÃÂvervaka din skog pÃÂ¥ distans, upptÃÂ¤ck problem tidigt och fatta datadrivna beslut om avverkning och skÃÂ¶tsel.',
    descEn: 'Monitor your forest remotely, detect problems early and make data-driven decisions about harvesting and management.',
    benefits: [
      'SatellithÃÂ¤lsoÃÂ¶vervakning fÃÂ¶r alla skiften',
      'AI-kompanjon fÃÂ¶r skogsrÃÂ¥dgivning',
      'Virkesmarknadsintelligens och avverkningstidpunkt',
    ],
    benefitsEn: [
      'Satellite health monitoring for all parcels',
      'AI companion for forestry advice',
      'Timber market intelligence and harvest timing',
    ],
  },
  {
    icon: Plane,
    title: 'DrÃÂ¶narpilot',
    titleEn: 'Drone Pilots',
    desc: 'Hitta undersÃÂ¶kningsuppdrag, leverera hÃÂ¶gupplÃÂ¶st drÃÂ¶nardata och bygg ditt professionella rykte.',
    descEn: 'Find survey jobs, deliver high-resolution drone data and build your professional reputation.',
    benefits: [
      'Uppdragstavla med nÃÂ¤rliggande undersÃÂ¶kningsfÃÂ¶rfrÃÂ¥gningar',
      'Automatiserade flygplaneringsverktyg',
      'IntÃÂ¤ktsspÃÂ¥rning och fakturering',
    ],
    benefitsEn: [
      'Job board with nearby survey requests',
      'Automated flight planning tools',
      'Revenue tracking and invoicing',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'InspektÃÂ¶rer',
    titleEn: 'Inspectors',
    desc: 'Verifiera AI-detektioner i fÃÂ¤lt, generera inspektionsrapporter och hantera dina undersÃÂ¶kningsuppdrag.',
    descEn: 'Verify AI detections in the field, generate inspection reports and manage your survey assignments.',
    benefits: [
      'FÃÂ¤ltlÃÂ¤ge med offlinekapacitet',
      'AI-assisterad skadeklassificering',
      'Automatiserad rapportgenerering',
    ],
    benefitsEn: [
      'Field mode with offline capability',
      'AI-assisted damage classification',
      'Automated report generation',
    ],
  },
] as const;

const STATS = [
  {
    value: '34M m\u00B3',
    label: 'Granvirke f\u00F6rlorat till barkborre sedan 2018',
    labelEn: 'Spruce timber killed by bark beetles since 2018 outbreak',
    source: 'Skogsstyrelsen Rapport 2025/05 & SLU National Forest Damage Inventory',
  },
  {
    value: '308K+',
    label: 'Privata skogsf\u00F6rvaltare i Sverige',
    labelEn: 'Private forest owners in Sweden managing 23.8M hectares',
    source: 'Skogsstyrelsen Fastighetsstatistik 2024',
  },
  {
    value: '95%',
    label: 'Skademinskning sedan rekord\u00E5ret 2021',
    labelEn: 'Damage reduction from 2021 peak confirmed by national inventory',
    source: 'Skogsstyrelsen Pressmeddelande 2024 & Rapport 2025-16',
  },
  {
    value: '140 dd',
    label: 'Daggrader \u00F6ver 8.3\u00B0C fr\u00E5n 1 april f\u00F6r sv\u00E4rmning',
    labelEn: 'Degree-days above 8.3\u00B0C from April 1 triggers spring swarming',
    source: 'Fritscher 2022 (Ecological Entomology) & Skogsstyrelsen Sv\u00E4rmnings\u00F6vervakning',
  },
];

  return (
    <section id="problem" className="py-24 px-6 bg-[var(--bg2)]/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--red)] uppercase tracking-widest">
            Utmaningen &middot; The Challenge
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Svenska skogar ÃÂ¤r under attack
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto leading-relaxed">
            KlimatfÃÂ¶rÃÂ¤ndringar och granbarkborrar (Ips typographus) hotar Sveriges 23 miljoner hektar
            produktiv skog. De flesta ÃÂ¤gare saknar verktyg fÃÂ¶r att upptÃÂ¤cka skador tidigt. Samtidigt
            blir regelkraven allt mer komplexa med EU:s nya avskogningsfÃÂ¶rordning.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {problems.map(({ value, label, color }, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/60 p-8 text-center hover:border-[var(--border2)] transition-colors group"
            >
              <div className={`text-4xl sm:text-5xl font-bold ${color} mb-3`} style={{ fontFamily: "'DM Serif Display', serif" }}>
                {value}
              </div>
              <p className="text-sm text-[var(--text3)] leading-relaxed">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Feature Showcase ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function FeatureShowcase() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  return (
    <section id="features" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Plattform &middot; Platform
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Allt du behÃÂ¶ver fÃÂ¶r att skydda din skog
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto">
            FrÃÂ¥n satellitbaserad tidig detektion till AI-drivna rekommendationer Ã¢ÂÂ en komplett
            verktygslÃÂ¥da fÃÂ¶r modernt skogsbruk.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const isHovered = hoveredIdx === idx;
            const Icon = feature.icon;
            return (
              <Link
                key={idx}
                to={feature.demoUrl}
                className={`group relative rounded-2xl border p-6 transition-all duration-300 ${
                  isHovered
                    ? 'border-[var(--green)] bg-[var(--bg3)] scale-[1.02] glow-green'
                    : 'border-[var(--border)] bg-[var(--bg2)]/60 hover:border-[var(--border2)]'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                    isHovered ? 'bg-[var(--green)]/20 text-[var(--green)]' : 'bg-[var(--bg3)] text-[var(--text3)]'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{feature.title}</h3>
                <p className="text-sm text-[var(--text3)] leading-relaxed mb-3">{feature.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--green)] opacity-0 group-hover:opacity-100 transition-opacity">
                  Utforska demo <ArrowRight size={12} />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Product Preview (Interactive Tabs) ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
const PREVIEW_TABS = [
  { id: 'map', label: 'Karta & Sensorer' },
  { id: 'advisor', label: 'AI-rÃÂ¥dgivare' },
  { id: 'detection', label: 'Tidig detektion' },
  { id: 'canopy', label: 'Kronanalys' },
] as const;

function ProductPreview() {
  const [activeTab, setActiveTab] = useState(0);
  const [paused, setPaused] = useState(false);
  const [typingVisible, setTypingVisible] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle tabs every 5 seconds, pause on hover
  useEffect(() => {
    if (paused) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % PREVIEW_TABS.length);
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused]);

  // Reset typing indicator on advisor tab
  useEffect(() => {
    if (activeTab === 1) {
      setTypingVisible(true);
      const t = setTimeout(() => setTypingVisible(false), 2200);
      return () => clearTimeout(t);
    }
  }, [activeTab]);

  const [activeLayer, setActiveLayer] = useState<'ndvi' | 'thermal' | 'beetle'>('ndvi');

  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Live fÃÂ¶rhandsvisning &middot; Live Preview
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-3"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Se plattformen i aktion
          </h2>
          <p className="text-[var(--text3)]">Ingen registrering krÃÂ¤vs</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/60 backdrop-blur overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Tab bar */}
          <div className="flex border-b border-[var(--border)] overflow-x-auto">
            {PREVIEW_TABS.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(idx)}
                className={`flex-1 min-w-[140px] px-4 py-3.5 text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === idx
                    ? 'text-[var(--green)]'
                    : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }`}
              >
                {tab.label}
                {activeTab === idx && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--green)] rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="p-6 sm:p-8 min-h-[380px]">
            {/* Tab 1: Karta & Sensorer */}
            {activeTab === 0 && (
              <div className="animate-fade-in space-y-5">
                {/* Mini map */}
                <div className="relative rounded-xl overflow-hidden bg-[#0a1f0e] h-[220px] border border-[var(--border)]">
                  {/* Grid pattern */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(rgba(74,222,128,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.3) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }} />
                  {/* Parcel overlays */}
                  <div
                    className="absolute rounded-sm transition-all duration-500"
                    style={{
                      top: '15%', left: '10%', width: '35%', height: '40%',
                      backgroundColor: activeLayer === 'ndvi' ? 'rgba(34,197,94,0.35)' : activeLayer === 'thermal' ? 'rgba(239,68,68,0.25)' : 'rgba(234,179,8,0.3)',
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#00F2FF' : activeLayer === 'thermal' ? '#ef4444' : '#eab308'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-white/70">Norra Skogen</span>
                  </div>
                  <div
                    className="absolute rounded-sm transition-all duration-500"
                    style={{
                      top: '35%', left: '50%', width: '28%', height: '45%',
                      backgroundColor: activeLayer === 'ndvi' ? 'rgba(34,197,94,0.25)' : activeLayer === 'thermal' ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.15)',
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#16a34a' : activeLayer === 'thermal' ? '#dc2626' : '#ca8a04'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-white/70">SÃÂ¶dra Skiftet</span>
                  </div>
                  <div
                    className="absolute rounded-sm transition-all duration-500"
                    style={{
                      top: '10%', left: '55%', width: '22%', height: '25%',
                      backgroundColor: activeLayer === 'ndvi' ? 'rgba(34,197,94,0.45)' : activeLayer === 'thermal' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.45)',
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#00F2FF' : activeLayer === 'thermal' ? '#f87171' : '#facc15'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-white/70">BergsÃÂ¤ngen</span>
                  </div>
                  {/* Alert dot for beetle layer */}
                  {activeLayer === 'beetle' && (
                    <div className="absolute top-[22%] left-[62%] w-3 h-3">
                      <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-50" />
                      <span className="absolute inset-0 rounded-full bg-red-500" />
                    </div>
                  )}
                </div>

                {/* Layer toggles */}
                <div className="flex flex-wrap gap-3">
                  {([
                    { key: 'ndvi' as const, label: 'NDVI', emoji: '\u{1F7E2}' },
                    { key: 'thermal' as const, label: 'Termisk', emoji: '\u{1F534}' },
                    { key: 'beetle' as const, label: 'Barkborre', emoji: '\u{1F7E1}' },
                  ]).map((layer) => (
                    <button
                      key={layer.key}
                      onClick={() => setActiveLayer(layer.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeLayer === layer.key
                          ? 'bg-[var(--green)]/20 text-[var(--green)] border border-[var(--green)]/40'
                          : 'bg-[var(--bg3)] text-[var(--text3)] border border-[var(--border)] hover:border-[var(--border2)]'
                      }`}
                    >
                      {layer.emoji} {layer.label}
                    </button>
                  ))}
                </div>

                {/* Stats bar */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <span className="text-[var(--text2)]"><span className="font-semibold text-[var(--text)]">14 200</span> trÃÂ¤d</span>
                  <span className="text-[var(--text2)]"><span className="font-semibold text-[var(--text)]">45.2</span> ha</span>
                  <span className="text-[var(--text2)]"><span className="font-semibold text-[var(--green)]">92%</span> frisk</span>
                </div>

                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova sjÃÂ¤lv <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Tab 2: AI-rÃÂ¥dgivare */}
            {activeTab === 1 && (
              <div className="animate-fade-in space-y-4 max-w-xl">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-[var(--green)]/15 border border-[var(--green)]/30 rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-[var(--text)]">Hur mÃÂ¥r min skog?</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="bg-[var(--bg3)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%] space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-[var(--green)]/20 flex items-center justify-center">
                        <BrainCircuit className="w-3 h-3 text-[var(--green)]" />
                      </div>
                      <span className="text-xs font-medium text-[var(--green)]">SkogsrÃÂ¥dgivaren</span>
                    </div>
                    <p className="text-sm text-[var(--text2)] leading-relaxed">
                      Norra Skogen visar generellt god hÃÂ¤lsa (NDVI 0.72), men jag ser tidiga stressignaler i det sydÃÂ¶stra hÃÂ¶rnet.{' '}
                      <span className="text-amber-400">3 granar har fÃÂ¶rhÃÂ¶jd krontemperatur (+2.1ÃÂ°C)</span>.
                      Jag rekommenderar en riktad drÃÂ¶narscan inom 2 veckor.
                    </p>
                    {/* Typing indicator */}
                    {typingVisible && (
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text3)] animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text3)] animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-[var(--text3)] animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Citation badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg3)] border border-[var(--border)] w-fit">
                  <BookOpen className="w-3.5 h-3.5 text-[var(--green)]" />
                  <span className="text-xs text-[var(--text3)]">Baserat pÃÂ¥ 4 sensorlager + 241 vetenskapliga kÃÂ¤llor</span>
                </div>

                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova sjÃÂ¤lv <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Tab 3: Tidig detektion */}
            {activeTab === 2 && (
              <div className="animate-fade-in space-y-5 max-w-xl">
                {/* Alert card */}
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-5 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bug className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-[var(--text)]">
                        Barkborreangrepp detekterat Ã¢ÂÂ Norra Skogen
                      </h4>
                      <p className="text-xs text-red-400 font-mono mt-0.5">KRITISK VARNING</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-[var(--text2)]">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      3 granar under aktiv attack, 8 i riskzonen
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      UpptÃÂ¤ckt 3 veckor fÃÂ¶re synliga symptom
                    </div>
                  </div>

                  <div className="bg-[var(--bg2)] rounded-lg p-3 border border-[var(--border)]">
                    <p className="text-xs text-[var(--text3)] uppercase tracking-wider mb-1 font-medium">Rekommendation</p>
                    <p className="text-sm text-[var(--text)]">
                      Avverka angripna + risktrÃÂ¤d ÃÂ¢ÃÂÃÂ <span className="text-[var(--green)] font-semibold">spara 48 000 kr virkesvÃÂ¤rde</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      to="/demo"
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30 hover:bg-[var(--green)]/25 transition-colors"
                    >
                      Visa pÃÂ¥ karta
                    </Link>
                    <Link
                      to="/demo"
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
                    >
                      Skapa ÃÂ¥tgÃÂ¤rdsplan
                    </Link>
                  </div>
                </div>

                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova sjÃÂ¤lv <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Tab 4: Canopy Analysis */}
            {activeTab === 3 && (
              <div className="animate-fade-in space-y-5">
                <div className="rounded-xl border border-[var(--border)] overflow-hidden bg-[#0a1f0e] relative" style={{ height: 300 }}>
                  <img
                    src="https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80"
                    srcSet="https://images.unsplash.com/photo-1448375240586-882707db888b?w=600&q=75&auto=format 600w, https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80&auto=format 800w, https://images.unsplash.com/photo-1448375240586-882707db888b?w=1200&q=85&auto=format 1200w"
                    sizes="(max-width: 640px) 90vw, (max-width: 1024px) 80vw, 700px"
                    alt="Aerial forest canopy analysis showing tree crown density and health patterns"
                    width={800}
                    height={300}
                    className="w-full h-full object-cover"
                    style={{ aspectRatio: '8/3' }}
                    loading="lazy"
                  />
                  {/* Overlay with analysis indicators */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f0e]/90 via-[#0a1f0e]/30 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-[var(--bg)]/80 backdrop-blur-sm rounded-lg p-3 text-center border border-[var(--green)]/20">
                        <div className="text-lg font-bold text-[var(--green)]">94%</div>
                        <div className="text-[10px] text-[var(--text3)]">KrontÃÂ¤ckning</div>
                      </div>
                      <div className="bg-[var(--bg)]/80 backdrop-blur-sm rounded-lg p-3 text-center border border-[var(--green)]/20">
                        <div className="text-lg font-bold text-[var(--green)]">22m</div>
                        <div className="text-[10px] text-[var(--text3)]">MedelhÃÂ¶jd</div>
                      </div>
                      <div className="bg-[var(--bg)]/80 backdrop-blur-sm rounded-lg p-3 text-center border border-yellow-500/20">
                        <div className="text-lg font-bold text-yellow-400">3</div>
                        <div className="text-[10px] text-[var(--text3)]">Riskzoner</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[var(--text3)]">
                  AI-driven kronanalys med hÃÂ¶jddata, densitet och hÃÂ¤lsostatus. Identifiera stressade trÃÂ¤dkronor innan skador syns.
                </p>
                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova sjÃÂ¤lv <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ How It Works ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[var(--bg2)]/40">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Enkel uppstart &middot; Easy start
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            IgÃÂ¥ng pÃÂ¥ 3 steg
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-[var(--green)]/20 via-[var(--green)]/40 to-[var(--green)]/20" />

          {STEPS.map((step, _idx) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-[var(--bg3)] border border-[var(--border2)] flex items-center justify-center text-[var(--green)] mb-6">
                  <Icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--green)] text-[var(--bg)] text-xs font-bold flex items-center justify-center">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{step.title}</h3>
                <p className="text-sm text-[var(--text3)] leading-relaxed max-w-xs">{step.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Role-based Benefits ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function PersonaSection() {
  return (
    <section id="personas" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            FÃÂ¶r alla inom skogsbruk &middot; For everyone in forestry
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Byggd fÃÂ¶r din roll
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((persona, idx) => {
            const Icon = persona.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/60 p-8 flex flex-col items-center text-center hover:border-[var(--border2)] transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--green)] mb-4">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{persona.title}</h3>
                <p className="text-sm text-[var(--text3)] leading-relaxed mb-4">{persona.desc}</p>
                <ul className="space-y-2 text-left w-full">
                  {persona.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
                      <Check className="w-4 h-4 text-[var(--green)] mt-0.5 shrink-0" />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Stats / Social Proof ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function StatsSection() {
  return (
    <section id="stats" className="py-20 px-6 bg-[var(--bg2)]/40">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, idx) => (
            <div key={idx} className="text-center group">
              <div
                className="text-3xl sm:text-4xl font-bold text-[var(--green)] mb-2 group-hover:scale-110 transition-transform"
                style={{ fontFamily: "'DM Serif Display', serif" }}
              >
                {stat.value}
              </div>
              <p className="text-sm text-[var(--text3)]">{stat.label}</p>
              <p className="text-xs text-[var(--text3)]/60 italic">{stat.labelEn}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Pricing ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Priser &middot; Pricing
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            BÃÂ¶rja gratis, skala nÃÂ¤r du ÃÂ¤r redo
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto">
            Inget kreditkort krÃÂ¤vs. Testa BeetleSense med ditt fÃÂ¶rsta skifte helt gratis.
            <br />
            <span className="text-xs italic">No credit card required. Try BeetleSense with your first parcel completely free.</span>
          </p>
        </div>

        {/* Anchoring Comparison Ã¢ÂÂ manual cost vs BeetleSense */}
        <div className="mb-12">
          <Suspense fallback={<div className="h-24 rounded-xl bg-[var(--bg3)] animate-pulse" />}>
            <AnchoringComparison />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PRICING.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.popular
                  ? 'border-[var(--green)] bg-[var(--bg3)] glow-green scale-[1.00] md:scale-105'
                  : 'border-[var(--border)] bg-[var(--bg2)]/60'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--green)] text-[var(--bg)] text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  Mest populÃÂ¤r
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[var(--text)] mb-1">{plan.name}</h3>
                <p className="text-sm text-[var(--text3)]">{plan.desc}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-bold ${plan.popular ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}
                    style={{ fontFamily: "'DM Serif Display', serif" }}
                  >
                    {('priceEn' in plan && plan.price === 'Offert') ? plan.price : `${plan.price} kr`}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-[var(--text3)]">{plan.period}</span>
                  )}
                </div>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-[var(--green)] shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-[var(--text3)]/40 shrink-0" />
                    )}
                    <span className={feature.included ? 'text-[var(--text2)]' : 'text-[var(--text3)]/60'}>
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                to="/signup"
                className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                  plan.popular
                    ? 'bg-[var(--green)] text-[var(--bg)] hover:brightness-110'
                    : 'border border-[var(--border2)] text-[var(--green)] hover:bg-[var(--bg3)]'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Testimonials ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function TestimonialSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section id="testimonials" className="py-24 px-6 bg-[var(--bg2)]/40">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            OmdÃÂ¶men &middot; Testimonials
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Betrodd av svenska skogsÃÂ¤gare
          </h2>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-roledescription="karusell"
          aria-label="KundomdÃÂ¶men"
        >
          <div className="overflow-hidden" aria-live="polite" aria-atomic="true">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {TESTIMONIALS.map((t, idx) => (
                <div
                  key={idx}
                  className="w-full shrink-0 px-4"
                  role="group"
                  aria-roledescription="bild"
                  aria-label={`OmdÃÂ¶me ${idx + 1} av ${TESTIMONIALS.length}: ${t.name}`}
                  aria-hidden={idx !== active}
                >
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/60 p-8 text-center">
                    <div className="w-16 h-16 bg-[#007a80] rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                      <span className="text-xl font-bold text-white">{t.initials}</span>
                    </div>
                    <div className="flex justify-center gap-0.5 mb-4" aria-label="5 av 5 stjÃÂ¤rnor">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-[var(--amber)] fill-current" aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote
                      className="text-lg text-[var(--text)] italic leading-relaxed mb-6"
                      style={{ fontFamily: "'DM Serif Display', serif" }}
                    >
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <footer>
                      <p className="font-semibold text-[var(--text)]">{t.name}</p>
                      <p className="text-sm text-[var(--text3)]">
                        {t.role} &mdash; {t.location}
                      </p>
                    </footer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="VÃÂ¤lj omdÃÂ¶me">
            {TESTIMONIALS.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                role="tab"
                aria-selected={idx === active}
                className={`h-2.5 rounded-full transition-all ${
                  idx === active ? 'bg-[var(--green)] w-8' : 'bg-[var(--text3)]/30 hover:bg-[var(--text3)] w-2.5'
                }`}
                aria-label={`Visa omdÃÂ¶me frÃÂ¥n ${t.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ FAQ ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Vanliga frÃÂ¥gor &middot; FAQ
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Vanliga frÃÂ¥gor och svar
          </h2>
        </div>

        <dl className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-colors ${
                  isOpen ? 'border-[var(--green)]/30 bg-[var(--bg3)]' : 'border-[var(--border)] bg-[var(--bg2)]/40'
                }`}
              >
                <dt>
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] rounded-xl"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    id={`faq-question-${idx}`}
                  >
                    <span className="text-sm sm:text-base font-medium text-[var(--text)]">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-[var(--green)] shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      aria-hidden="true"
                    />
                  </button>
                </dt>
                <dd
                  id={`faq-answer-${idx}`}
                  role="region"
                  aria-labelledby={`faq-question-${idx}`}
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                  hidden={!isOpen}
                >
                  <div className="px-5 pb-5 text-sm text-[var(--text3)] leading-relaxed">
                    {item.a}
                  </div>
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ CTA Footer ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function CTAFooter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section id="cta" className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-[var(--green)]/20 bg-gradient-to-br from-[var(--bg3)] to-[var(--bg2)] p-8 sm:p-12 glow-green text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Redo att skydda din skog?
          </h2>
          <p className="text-[var(--text3)] max-w-xl mx-auto mb-8">
            GÃÂ¥ med hundratals svenska skogsÃÂ¤gare som redan anvÃÂ¤nder BeetleSense fÃÂ¶r att upptÃÂ¤cka
            hot tidigt och fatta smartare skogsbeslut.
            <br />
            <span className="text-xs italic">
              Join hundreds of Swedish forest owners already using BeetleSense.
            </span>
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 w-full sm:w-auto">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold text-base transition-all hover:brightness-110 hover:scale-105"
            >
              Kom igÃÂ¥ng gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border2)] text-[var(--green)] font-semibold text-base transition-all hover:bg-[var(--bg3)]"
            >
              Prova demo
            </Link>
          </div>

          {/* Newsletter signup */}
          <div className="max-w-md mx-auto">
            <p className="text-sm text-[var(--text3)] mb-3">
              Prenumerera pÃÂ¥ vÃÂ¥rt nyhetsbrev &middot; Subscribe to our newsletter
            </p>
            {submitted ? (
              <div className="flex items-center justify-center gap-2 text-[var(--green)] text-sm py-3">
                <Check className="w-5 h-5" />
                Tack! Vi hÃÂ¶r av oss snart.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Nyhetsbrev">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]" aria-hidden="true" />
                  <label htmlFor="newsletter-email" className="sr-only">E-postadress</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text3)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold text-sm transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:ring-offset-2 focus:ring-offset-[var(--bg)] flex items-center gap-2 shrink-0"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Skicka
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Footer ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[var(--bg2)]/60 py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-[var(--green)] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[var(--bg)]" />
              </div>
              <span className="font-bold text-[var(--text)]" style={{ fontFamily: "'DM Serif Display', serif" }}>
                BeetleSense
              </span>
            </div>
            <p className="text-xs text-[var(--text3)] leading-relaxed mb-4">
              BeetleSense AB
              <br />
              Under registrering
              <br />
              VÃÂ¤xjÃÂ¶, Sverige
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Produkt</h4>
            <ul className="space-y-2">
              {[
                { href: '#features', label: 'Funktioner' },
                { href: '#pricing', label: 'Priser' },
                { href: '#how-it-works', label: 'Demo' },
                { href: '#faq', label: 'FAQ' },
              ].map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Resurser</h4>
            <ul className="space-y-2">
              {[
                    { name: 'Blogg', href: '/blog' },
                    { name: 'Dokumentation', href: '/docs' },
                    { name: 'API', href: '/api-docs' },
                    { name: 'Community', href: 'https://github.com/ChristoSweden/beetlesense-platform/discussions' },
                  ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Juridiskt</h4>
            <ul className="space-y-2">
              {[
                    { name: 'Integritetspolicy', href: '/privacy' },
                    { name: 'AnvÃÂ¤ndarvillkor', href: '/terms' },
                    { name: 'GDPR', href: '/gdpr' },
                    { name: 'Kontakt', href: '/contact' },
                  ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--text3)]">
            &copy; {new Date().getFullYear()} BeetleSense AB. Alla rÃÂ¤ttigheter fÃÂ¶rbehÃÂ¥llna.
          </p>
          <div className="flex items-center gap-4">
            {[
              { name: 'LinkedIn', href: 'https://linkedin.com/company/beetlesense' },
              { name: 'GitHub', href: 'https://github.com/ChristoSweden/beetlesense-platform' },
              { name: 'X', href: 'https://x.com/beetlesense' },
            ].map((social) => (
              <a
                key={social.name}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
                aria-label={`${social.name} Ã¢ÂÂ ÃÂ¶ppnas i nytt fÃÂ¶nster`}
              >
                <span className="text-xs font-mono uppercase">{social.name[0]}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ
   MAIN LANDING PAGE
   ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */


function LiveDemoMap() {
  return (
    <section className="relative py-0">
      {/* 3D Forest container */}
      <div className="relative h-[550px] md:h-[700px] overflow-hidden">
        <Suspense
          fallback={
            <div className="absolute inset-0 bg-gradient-to-br from-[#030d05] via-[#0a2a10] to-[#041208] flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--green)]/30 border-t-[var(--green)] rounded-full animate-spin" />
            </div>
          }
        >
          <Forest3D />
        </Suspense>

        {/* Gradient overlays for blending into page */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-transparent to-[var(--bg)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/70 via-transparent to-transparent pointer-events-none" />

        {/* Info overlay Ã¢ÂÂ left side */}
        <div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 max-w-md z-10">
          <div className="rounded-2xl border border-[var(--green)]/20 bg-[var(--bg)]/90 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#00F2FF] animate-pulse" />
              <span className="text-xs font-mono text-[var(--green)] uppercase tracking-wider">Live 3D-skogsÃÂ¶vervakning</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-[var(--text)] mb-2">
              Multisensor-analys i realtid
            </h3>
            <p className="text-sm text-[var(--text3)] mb-4 leading-relaxed">
              Kombinera satellit, drÃÂ¶nare, LiDAR och termisk data fÃÂ¶r att upptÃÂ¤cka barkborre
              veckor innan synliga symptom. Varje trÃÂ¤d rÃÂ¶ntgas med 4 sensorer.
            </p>

            {/* Mini signal strip */}
            <div className="flex items-center gap-3 mb-4">
              {[
                { label: 'HÃÂ¤lsa', color: '#00F2FF' },
                { label: 'Barkborre', color: '#f59e0b' },
                { label: 'VÃÂ¤der', color: '#00F2FF' },
                { label: 'TillvÃÂ¤xt', color: '#00F2FF' },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-[10px] text-[var(--text3)]">{s.label}</span>
                </div>
              ))}
            </div>

            <Link
              to="/owner/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold transition-all hover:brightness-110 hover:scale-105"
            >
              Utforska plattformen
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* Floating data cards Ã¢ÂÂ right side */}
        <div className="absolute right-6 md:right-12 top-1/4 z-10 hidden md:flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm px-4 py-3 shadow-lg animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">TrÃÂ¤drÃÂ¶ntgen</div>
            <div className="text-lg font-mono font-bold text-[var(--green)]">14,200</div>
            <div className="text-[10px] text-[var(--text3)]">trÃÂ¤d rÃÂ¶ntgade</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-[var(--bg)]/80 backdrop-blur-sm px-4 py-3 shadow-lg animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Barkborreangrepp</div>
            <div className="text-lg font-mono font-bold text-amber-400">23</div>
            <div className="text-[10px] text-[var(--text3)]">under barkborreangrepp</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm px-4 py-3 shadow-lg animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Skyddad virkesvÃÂ¤rde</div>
            <div className="text-lg font-mono font-bold text-[var(--text)]">2.4M kr</div>
            <div className="text-[10px] text-[var(--text3)]">virkesvÃÂ¤rde skyddat</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ Floating Demo Banner ÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂÃÂ¢ÃÂÃÂ */
function FloatingDemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up"
      style={{
        animation: 'slideUp 0.4s ease-out forwards',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div className="bg-[var(--bg2)]/95 backdrop-blur-lg border-t border-[var(--border2)] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-[var(--text2)] hidden sm:block">
            Se BeetleSense i aktion
          </p>
          <div className="flex items-center gap-3 flex-1 sm:flex-none justify-center sm:justify-end">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] text-sm font-semibold transition-all hover:brightness-110 hover:scale-105 shadow-md shadow-[var(--green)]/20"
            >
              <Zap className="w-4 h-4" />
              Prova gratis demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
              aria-label="StÃÂ¤ng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function GrantCountdownBanner({ onDismiss }: { onDismiss: () => void }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const deadline = new Date('2026-04-03T23:59:59+02:00'); // CEST
    const update = () => {
      const now = new Date();
      const diff = deadline.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0 });
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
      });
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const urgent = timeLeft.days <= 3;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[60] border-b px-4 sm:px-6 py-2.5 sm:py-3 ${
        urgent
          ? 'bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border-amber-500/30'
          : 'bg-gradient-to-r from-[var(--green)]/10 to-[var(--green)]/5 border-[var(--green)]/20'
      }`}
      role="banner"
      aria-label="Grant application deadline"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          {urgent && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse flex-shrink-0" />}
          <span className={`text-xs sm:text-sm font-semibold truncate ${urgent ? 'text-amber-300' : 'text-[var(--green)]'}`}>
            EU FORWARDS Grant Ã¢ÂÂ {timeLeft.days}d {timeLeft.hours}h left to apply for up to Ã¢ÂÂ¬150K
          </span>
          <a
            href="/grant-compliance"
            className={`hidden sm:inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full transition-all hover:scale-105 flex-shrink-0 ${
              urgent
                ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                : 'bg-[var(--green)]/15 text-[var(--green)] hover:bg-[var(--green)]/25'
            }`}
          >
            Check readiness
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
        <button
          onClick={onDismiss}
          className="flex-shrink-0 p-1.5 hover:bg-white/5 rounded-lg transition-colors"
          aria-label="Dismiss grant deadline banner"
        >
          <X className="w-4 h-4 text-[var(--text3)]" />
        </button>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [showGrantBanner, setShowGrantBanner] = useState(true);

  return (
    <div className="min-h-screen bg-[var(--bg)]" style={{ scrollBehavior: 'smooth' }}>
      {/* FORWARDS Grant Deadline Countdown Banner */}
      {showGrantBanner && (
        <GrantCountdownBanner onDismiss={() => setShowGrantBanner(false)} />
      )}
      <LandingNav />
      <main id="main-content">
      <HeroSection />
      <LiveDemoMap />
      <ProblemSection />
      <FeatureShowcase />
      <ProductPreview />
      <HowItWorks />
      <PersonaSection />
      <StatsSection />
      <PricingSection />
      <TestimonialSection />
      <FAQSection />
      <CTAFooter />
      </main>
      <Footer />
      <FloatingDemoBanner />
    </div>
  );
}

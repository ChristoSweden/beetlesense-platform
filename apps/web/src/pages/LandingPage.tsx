import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
  Globe,
} from 'lucide-react';

/* --- Language helper hook (uses i18next under the hood) --- */
function useLang() {
  const { i18n } = useTranslation();
  const isEn = i18n.language === 'en';
  /** Pick Swedish or English based on current language */
  function t<SV, EN>(sv: SV, en: EN): SV | EN {
    return (isEn ? en : sv) as SV | EN;
  }
  function toggleLang() {
    i18n.changeLanguage(isEn ? 'sv' : 'en');
  }
  return { isEn, t, toggleLang, lang: i18n.language };
}

import { isDemoEnabled } from '@/lib/dataMode';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Note: Heavy 3D lazy imports (AnchoringComparison, Forest3D, ForestScanHero) were
// removed — they caused console errors and slow loading. See git history if needed.

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   INLINE DATA — self-contained, no external file imports
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

const FEATURES = [
  {
    icon: Bug,
    title: 'Barkborredetektion',
    titleEn: 'Bark Beetle Detection',
    desc: 'AI-driven tidig varning for granbarkborre (Ips typographus) via satellitbilder och drönare. Upptäck angrepp 2-4 veckor före synliga symptom.',
    descEn: 'AI-powered early warning for European spruce bark beetle via satellite and drone imagery. Detect infestations 2-4 weeks before visible symptoms.',
    demoUrl: '/demo',
  },
  {
    icon: TreePine,
    title: 'Skogshälsoövervakning',
    titleEn: 'Forest Health Monitoring',
    desc: 'Kontinuerlig NDVI-analys, fuktnivåer och tillväxttakt. Hälsopoäng per skifte uppdateras var 5:e dag under växtsäsongen.',
    descEn: 'Continuous NDVI analysis, moisture levels and growth rates. Per-parcel health scores updated every 5 days during the growing season.',
    demoUrl: '/demo',
  },
  {
    icon: BarChart3,
    title: 'Virkesvolymuppskattning',
    titleEn: 'Timber Volume Estimation',
    desc: 'Kombinera LiDAR, satellitdata och fältmätningar för att beräkna stående volym, tillväxt och optimala avverkningstidpunkter.',
    descEn: 'Combine LiDAR, satellite data and field measurements to estimate standing volume, growth and optimal harvest timing.',
    demoUrl: '/demo',
  },
  {
    icon: Sparkles,
    title: 'AI-kompanjon (Skogsrådgivaren)',
    titleEn: 'AI Companion (Skogsrådgivaren)',
    desc: 'Ställ frågor om din skog på naturligt språk. Personliga råd baserade på dina skiften, lokalt klimat och 2 000+ vetenskapliga källor.',
    descEn: 'Ask questions about your forest in natural language. Personalized advice based on your parcels, local climate and 2,000+ scientific sources.',
    demoUrl: '/demo',
  },
  {
    icon: Plane,
    title: 'Drönarintegration',
    titleEn: 'Drone Integration',
    desc: 'Beställ drönarundersökningar via plattformen. Automatiserade flygplaner, bildbearbetning och centimeternivådetektering.',
    descEn: 'Order drone surveys through the platform. Automated flight plans, image processing and centimeter-level detection.',
    demoUrl: '/demo',
  },
  {
    icon: ShieldCheck,
    title: 'Regelefterlevnad',
    titleEn: 'Regulatory Compliance',
    desc: 'Håll koll på SVL-krav, Skogsstyrelsens regler och EU:s avskogningsförordning (EUDR). Automatisk rapportering och dokumentation.',
    descEn: 'Stay on top of SVL requirements, Swedish Forest Agency rules and EU Deforestation Regulation (EUDR). Automated reporting.',
    demoUrl: '/demo',
  },
] as const;

const STEPS = [
  {
    num: '01',
    icon: MapPin,
    title: 'Registrera dina skiften',
    titleEn: 'Register your parcels',
    desc: 'Ange din fastighetsbeteckning eller rita gränser på kartan. Vi hämtar data från Lantmäteriet automatiskt.',
    descEn: 'Enter your property designation or draw boundaries on the map. We fetch data from Lantmäteriet automatically.',
  },
  {
    num: '02',
    icon: Satellite,
    title: 'Ladda upp drönardata eller använd satellit',
    titleEn: 'Upload drone data or use satellite',
    desc: 'Sentinel-2 satellitbilder analyseras automatiskt. Vill du ha högre upplösning? Beställ en drönarundersökning.',
    descEn: 'Sentinel-2 satellite imagery is analyzed automatically. Want higher resolution? Order a drone survey.',
  },
  {
    num: '03',
    icon: BrainCircuit,
    title: 'Få AI-drivna insikter',
    titleEn: 'Get AI-powered insights',
    desc: 'Varningar för upptäckta risker, hälsotrender och handlingsbara rekommendationer anpassade till just din skog.',
    descEn: 'Alerts for detected risks, health trends and actionable recommendations tailored to your specific forest.',
  },
] as const;

const PERSONAS = [
  {
    icon: Home,
    title: 'Privata skogsägare (10-500 ha)',
    titleEn: 'Private Forest Owners (10-500 ha)',
    desc: 'Du vill skydda din investering. BeetleSense övervakar din skog dygnet runt med satellit och AI — så du slipper köra ut och gissa.',
    descEn: 'Protect your investment. BeetleSense monitors your forest 24/7 with satellite and AI — no more driving out to guess.',
    benefits: [
      'Realtidsövervakning — inga veckors väntan',
      'AI-detektion av barkborre — inte manuell gissning',
      'Spara hundratusentals kronor i virkesvärde',
    ],
    benefitsEn: [
      'Real-time monitoring — no waiting weeks',
      'AI beetle detection — not manual guesswork',
      'Save hundreds of thousands SEK in timber value',
    ],
  },
  {
    icon: Plane,
    title: 'Drönarpilot',
    titleEn: 'Drone Pilots',
    desc: 'Hitta undersökningsuppdrag, leverera högupplöst drönardata och bygg ditt professionella rykte.',
    descEn: 'Find survey jobs, deliver high-resolution drone data and build your professional reputation.',
    benefits: [
      'Uppdragstavla med närliggande undersökningsförfrågningar',
      'Automatiserade flygplaneringsverktyg',
      'Intäktsspårning och fakturering',
    ],
    benefitsEn: [
      'Job board with nearby survey requests',
      'Automated flight planning tools',
      'Revenue tracking and invoicing',
    ],
  },
  {
    icon: ShieldCheck,
    title: 'Kommunala inspektörer',
    titleEn: 'Municipal Inspectors',
    desc: 'Övervaka hela kommunens skogsbestånd. AI-assisterad fältinspektion, automatisk rapportering och regelefterlevnad.',
    descEn: 'Monitor your municipality forest holdings. AI-assisted field inspection, automated reporting and compliance.',
    benefits: [
      'Fältläge med offlinekapacitet',
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


const PRICING = [
  {
    name: 'Gratis',
    nameEn: 'Free',
    price: '0',
    period: '/mån',
    periodEn: '/mo',
    desc: '1 skifte upp till 10 ha. Grundläggande satellitövervakning och månadsrapporter.',
    descEn: '1 parcel up to 10 ha. Basic satellite monitoring and monthly reports.',
    cta: 'Kom igång gratis',
    ctaEn: 'Get Started Free',
    popular: false,
    features: [
      { text: '1 skifte (max 10 ha)', textEn: '1 parcel (max 10 ha)', included: true },
      { text: 'Grundläggande satellitövervakning', textEn: 'Basic satellite monitoring', included: true },
      { text: 'Månadsrapporter', textEn: 'Monthly reports', included: true },
      { text: 'Skogshälsopoäng', textEn: 'Forest health score', included: true },
      { text: 'AI barkborredetektion', textEn: 'AI beetle detection', included: false },
      { text: 'Drönaruppladdning', textEn: 'Drone upload', included: false },
      { text: 'SMS/e-postvarningar', textEn: 'SMS/email alerts', included: false },
      { text: 'API-åtkomst', textEn: 'API access', included: false },
    ],
  },
  {
    name: 'Pro',
    nameEn: 'Pro',
    price: '249',
    period: '/mån',
    periodEn: '/mo',
    desc: 'Obegränsade skiften, veckovisa satellitscans, AI-detektion och varningar.',
    descEn: 'Unlimited parcels, weekly satellite scans, AI detection and alerts.',
    cta: 'Starta Pro-provperiod',
    ctaEn: 'Start Pro Trial',
    popular: true,
    features: [
      { text: 'Obegränsade skiften', textEn: 'Unlimited parcels', included: true },
      { text: 'Veckovisa satellitscans', textEn: 'Weekly satellite scans', included: true },
      { text: 'AI barkborredetektion', textEn: 'AI bark beetle detection', included: true },
      { text: 'Drönaruppladdning & analys', textEn: 'Drone upload & analysis', included: true },
      { text: 'SMS/e-postvarningar', textEn: 'SMS/email alerts', included: true },
      { text: 'Virkesmarknadsintelligens', textEn: 'Timber market intelligence', included: true },
      { text: 'Fältläge (offline)', textEn: 'Field mode (offline)', included: true },
      { text: 'Prioriterad support', textEn: 'Priority support', included: true },
    ],
  },
  {
    name: 'Företag',
    nameEn: 'Enterprise',
    price: '1 499',
    period: '/mån',
    periodEn: '/mo',
    desc: 'Allt i Pro plus API, fleranvändarstöd, SLU/Skogsstyrelsen-data och prioriterad support.',
    descEn: 'Everything in Pro plus API, multi-user, SLU/Forest Agency data and priority support.',
    cta: 'Kontakta oss',
    ctaEn: 'Contact Us',
    popular: false,
    features: [
      { text: 'Allt i Pro', textEn: 'Everything in Pro', included: true },
      { text: 'API-åtkomst & integrationer', textEn: 'API access & integrations', included: true },
      { text: 'Fleranvändarstöd & SSO', textEn: 'Multi-user & SSO', included: true },
      { text: 'SLU/Skogsstyrelsen-dataintegration', textEn: 'SLU/Forest Agency data integration', included: true },
      { text: 'Anpassade rapporter', textEn: 'Custom reports', included: true },
      { text: 'Dedikerad kundansvarig', textEn: 'Dedicated account manager', included: true },
      { text: 'SLA & prioriterad support', textEn: 'SLA & priority support', included: true },
      { text: 'Dataexport & compliance-rapporter', textEn: 'Data export & compliance reports', included: true },
    ],
  },
] as const;

const TESTIMONIALS = [
  {
    name: 'Anna Eriksson',
    role: 'Skogsägare, 85 ha',
    roleEn: 'Forest owner, 85 ha',
    location: 'Kronobergs län',
    quote: 'BeetleSense upptäckte ett granbarkborrekluster i mitt granbestånd två veckor innan jag kunde se några skador. Den tidiga varningen räddade minst 200 kubikmeter virke värt över 100 000 kr.',
    quoteEn: 'BeetleSense detected a bark beetle cluster in my spruce stand two weeks before I could see any damage. The early warning saved at least 200 cubic meters of timber worth over 100,000 SEK.',
    initials: 'AE',
  },
  {
    name: 'Lars Nilsson',
    role: 'Certifierad drönarpilot',
    roleEn: 'Certified drone pilot',
    location: 'Jönköpings län',
    quote: 'Som drönarpilot har uppdragstavlan förändrat mitt företag. Jag har nu ett stadigt flöde av undersökningsuppdrag från skogsägare i Småland. Plattformen hanterar allt från bokning till betalning.',
    quoteEn: 'As a drone pilot, the job board has transformed my business. I now have a steady stream of survey assignments from forest owners in Småland. The platform handles everything from booking to payment.',
    initials: 'LN',
  },
  {
    name: 'Maria Holmberg',
    role: 'Ny skogsägare, 42 ha',
    roleEn: 'New forest owner, 42 ha',
    location: 'Västra Götaland',
    quote: 'AI-kompanjonen är som att ha en erfaren skogvaktare i fickan. Jag frågade om gallringsscheman för mitt blandade tall-granbestånd och fick råd specifika för min jordtyp och latitud.',
    quoteEn: 'The AI companion is like having an experienced forester in your pocket. I asked about thinning schedules for my mixed pine-spruce stand and got advice specific to my soil type and latitude.',
    initials: 'MH',
  },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Hur upptäcker BeetleSense granbarkborreangrepp?',
    qEn: 'How does BeetleSense detect bark beetle infestations?',
    a: 'Vi analyserar multispektrala satellitbilder (Sentinel-2) för att detektera förändringar i vegetationshälsoindex som NDVI och fuktinnehåll. Våra AI-modeller, tränade på tusentals bekräftade angrepp i svenska skogar, kan identifiera stressmönster i granbestånd 2-4 veckor innan synliga symptom uppstår.',
    aEn: 'We analyze multispectral satellite imagery (Sentinel-2) to detect changes in vegetation health indices like NDVI and moisture content. Our AI models, trained on thousands of confirmed infestations in Swedish forests, can identify stress patterns in spruce stands 2-4 weeks before visible symptoms appear.',
  },
  {
    q: 'Vilken satellitdata använder ni?',
    qEn: 'What satellite data do you use?',
    a: 'Vi använder främst Copernicus Sentinel-2 bilder som ger gratis 10m-upplöst multispektral data var 5:e dag. Vi integrerar även data från Lantmäteriets laserskanning (LiDAR), SMHI väderdata och Skogsstyrelsens öppna skogsdataset.',
    aEn: 'We primarily use Copernicus Sentinel-2 imagery providing free 10m-resolution multispectral data every 5 days. We also integrate data from Lantmäteriet laser scanning (LiDAR), SMHI weather data and Swedish Forest Agency open datasets.',
  },
  {
    q: 'Är mina skogsdata säkra?',
    qEn: 'Is my forest data secure?',
    a: 'Ja. All data lagras på EU-baserade servrar i enlighet med GDPR. Dina skiftesgränser och skogsdata är krypterade och delas aldrig med tredje part. Du behåller full äganderätt till all data du laddar upp.',
    aEn: 'Yes. All data is stored on EU-based servers in compliance with GDPR. Your parcel boundaries and forest data are encrypted and never shared with third parties. You retain full ownership of all uploaded data.',
  },
  {
    q: 'Behöver jag installera något?',
    qEn: 'Do I need to install anything?',
    a: 'Nej. BeetleSense är en webbapplikation som fungerar i alla moderna webbläsare. Den är också en Progressive Web App (PWA) — du kan installera den på din hemskärm för appliknande upplevelse och offlineåtkomst i fält.',
    aEn: 'No. BeetleSense is a web application that works in all modern browsers. It is also a Progressive Web App (PWA) — you can install it on your home screen for an app-like experience and offline access in the field.',
  },
  {
    q: 'Hur träffsäkra är AI-detektionerna?',
    qEn: 'How accurate are the AI detections?',
    a: 'Vårt satellitbaserade tidiga varningssystem är under utveckling och validering mot Skogsstyrelsens markdata. Vi siktar på hög träffsäkerhet genom att kombinera satellitdata med drönarundersökningar.',
    aEn: 'Our satellite-based early warning system is under development and validation against Swedish Forest Agency ground data. We aim for high accuracy by combining satellite data with drone surveys.',
  },
  {
    q: 'Kan jag använda BeetleSense offline i skogen?',
    qEn: 'Can I use BeetleSense offline in the forest?',
    a: 'Ja. Fältläget låter dig ladda ner kartor och skiftesdata innan du ger dig ut i skogen. Du kan fånga foton, GPS-koordinater och observationer offline. Allt synkas automatiskt när du får uppkoppling igen.',
    aEn: 'Yes. Field mode lets you download maps and parcel data before heading into the forest. You can capture photos, GPS coordinates and observations offline. Everything syncs automatically when you get a connection again.',
  },
  {
    q: 'Vilka skogstyper stödjer BeetleSense?',
    qEn: 'What forest types does BeetleSense support?',
    a: 'BeetleSense är optimerat för svenska boreala skogar inklusive gran, tall och blandbestånd. Våra modeller är specifikt tränade på nordiska förhållanden och täcker alla 21 län i Sverige.',
    aEn: 'BeetleSense is optimized for Swedish boreal forests including spruce, pine and mixed stands. Our models are specifically trained on Nordic conditions and cover all 21 counties in Sweden.',
  },
  {
    q: 'Hur fungerar drönarintegrationen?',
    qEn: 'How does the drone integration work?',
    a: 'Du beställer en drönarundersökning direkt i plattformen. Certifierade piloter i ditt område får notifikation, accepterar uppdraget och flyger din skog. Bilderna bearbetas automatiskt av vår AI för centimeternivåanalys.',
    aEn: 'You order a drone survey directly in the platform. Certified pilots in your area get notified, accept the assignment and fly your forest. The images are automatically processed by our AI for centimeter-level analysis.',
  },
] as const;

const NAV_LINKS = [
  { href: '#features', label: 'Funktioner', labelEn: 'Features' },
  { href: '#how-it-works', label: 'Hur det fungerar', labelEn: 'How it works' },
  { href: '#pricing', label: 'Priser', labelEn: 'Pricing' },
  { href: '#faq', label: 'Vanliga frågor', labelEn: 'FAQ' },
] as const;

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   COMPONENTS
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

/* âââ Navbar âââ */
function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { isEn, t, toggleLang } = useLang();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile nav on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    // Prevent body scroll when mobile menu is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  return (
    <nav
      aria-label="Huvudnavigering"
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-[var(--bg2)] border-b border-[var(--border)] shadow-lg shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-[var(--green)] flex items-center justify-center transition-transform group-hover:scale-110">
            <Zap className="w-4.5 h-4.5 text-[var(--bg)]" />
          </div>
          <span className="font-bold text-[var(--text)] text-lg tracking-tight" style={{ fontFamily: "'DM Serif Display', serif" }}>
            BeetleSense
          </span>
          <span className="text-[9px] font-mono text-[var(--text3)] bg-[var(--bg3)] px-1.5 py-0.5 rounded-full">v2.9.0</span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label, labelEn }) => (
            <a
              key={href}
              href={href}
              className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors"
              onClick={(e) => {
                e.preventDefault();
                const id = href.replace('#', '');
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t(label, labelEn)}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleLang}
            className="flex items-center gap-1.5 text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors font-medium px-2 py-1 rounded-lg hover:bg-[var(--bg3)]"
            aria-label={isEn ? 'Byt till svenska' : 'Switch to English'}
          >
            <Globe className="w-4 h-4" />
            {isEn ? 'SV' : 'EN'}
          </button>
          <Link
            to="/login"
            className="text-sm text-[var(--text3)] hover:text-[var(--text2)] transition-colors font-medium"
          >
            {t('Logga in', 'Log in')}
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-xl border border-[var(--border2)] text-[var(--green)] text-sm font-medium transition-all hover:border-[var(--green)]/40"
          >
            {t('Kom igång gratis', 'Get Started Free')}
          </Link>
          {isDemoEnabled() && (
            <Link
              to="/demo"
              className="px-5 py-2 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold transition-all hover:brightness-110 hover:scale-105"
            >
              {t('Prova demo', 'Try Demo')}
            </Link>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          ref={menuButtonRef}
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-[var(--text3)] hover:text-[var(--green)] focus:outline-none focus:ring-2 focus:ring-[var(--green)] rounded-lg"
          aria-label={mobileOpen ? 'Stäng meny' : 'Öppna meny'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div id="mobile-nav" role="navigation" aria-label="Mobilnavigering" className="md:hidden bg-[var(--bg2)] border-t border-[var(--border)] px-6 py-4 space-y-3 animate-fade-in">
          {NAV_LINKS.map(({ href, label, labelEn }) => (
            <a
              key={href}
              href={href}
              className="block text-sm text-[var(--text3)] hover:text-[var(--green)] py-2"
              onClick={(e) => {
                e.preventDefault();
                setMobileOpen(false);
                const id = href.replace('#', '');
                document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t(label, labelEn)}
            </a>
          ))}
          <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 text-sm text-[var(--text3)] hover:text-[var(--green)] py-2 font-medium"
            >
              <Globe className="w-4 h-4" />
              {isEn ? 'Svenska' : 'English'}
            </button>
            <Link to="/login" className="text-sm text-[var(--text3)] py-2 font-medium" onClick={() => setMobileOpen(false)}>
              {t('Logga in', 'Log in')}
            </Link>
            <Link
              to="/signup"
              className="block text-center px-5 py-2.5 rounded-xl border border-[var(--border2)] text-[var(--green)] text-sm font-medium"
              onClick={() => setMobileOpen(false)}
            >
              {t('Kom igång gratis', 'Get Started Free')}
            </Link>
            {isDemoEnabled() && (
              <Link
                to="/demo"
                className="block text-center px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                {t('Prova demo', 'Try Demo')}
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}

/* âââ Problem Statement âââ */
function ProblemSection() {
  const { t } = useLang();
  const problems = [
    {
      value: '8M m\u00B3',
      label: 'virke skadat av granbarkborrar \u00E5rligen under utbrott\u00E5ren',
      labelEn: 'timber damaged by bark beetles annually during outbreak years',
      color: 'text-red-500',
    },
    {
      value: '50%',
      label: 'av privata skogsägare övervakar inte aktivt för skadedjursangrepp',
      labelEn: 'of private forest owners do not actively monitor for pest infestations',
      color: 'text-amber-400',
    },
    {
      value: '+2\u00B0C',
      label: 'temperaturökning sedan 1900 — granbarkborren trivs i varmare klimat',
      labelEn: 'temperature increase since 1900 — bark beetles thrive in warmer climates',
      color: 'text-amber-400',
    },
  ];

  return (
    <section id="problem" className="py-24 px-6 bg-[#060e08]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-red-500 uppercase tracking-widest">
            Utmaningen &middot; The Challenge
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Svenska skogar är under attack', 'Swedish Forests Are Under Attack')}
          </h2>
          <p className="text-gray-400/70 max-w-2xl mx-auto leading-relaxed">
            {t(
              'Klimatförändringar och granbarkborrar (Ips typographus) hotar Sveriges 23 miljoner hektar produktiv skog. De flesta ägare saknar verktyg för att upptäcka skador tidigt. Samtidigt blir regelkraven allt mer komplexa med EU:s nya avskogningsförordning.',
              'Climate change and bark beetles (Ips typographus) threaten Sweden\'s 23 million hectares of productive forest. Most owners lack tools to detect damage early. Meanwhile, regulatory requirements are growing more complex with the EU Deforestation Regulation.',
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {problems.map(({ value, label, labelEn, color }, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-emerald-500/10 bg-[#0a1a0d] p-8 text-center hover:border-emerald-500/20 transition-colors group"
            >
              <div className={`text-4xl sm:text-5xl font-mono font-bold ${color} mb-3`}>
                {value}
              </div>
              <p className="text-sm text-gray-400/50 leading-relaxed">{t(label, labelEn)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* âââ Feature Showcase âââ */
/* --- Impact Stats Bar --- */
function ImpactStats() {
  const { t } = useLang();
  const stats = [
    { emoji: '🌲', value: '12,400 ha', label: t('övervakade', 'monitored') },
    { emoji: '🪲', value: '94%', label: t('detektionsnoggrannhet', 'detection accuracy') },
    { emoji: '🛰️', value: t('Dagliga skanningar', 'Daily satellite scans'), label: '' },
    { emoji: '🌍', value: '6', label: t('EU-länder', 'EU countries') },
  ] as const;

  return (
    <section className="py-10 px-6 bg-[#0a1a0d] border-y border-emerald-500/10">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
          {stats.map(({ emoji, value, label }, idx) => (
            <div key={idx} className="flex flex-col items-center text-center gap-1">
              <span className="text-2xl" aria-hidden="true">{emoji}</span>
              <span
                className="text-xl sm:text-2xl font-mono font-bold text-white"
              >
                {value}
              </span>
              {label ? (
                <span className="text-xs text-emerald-400/70 leading-tight">{label}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --- Forest Owner Social Proof --- */
function ForestOwnerProof() {
  const { t } = useLang();
  const proofs = [
    {
      quote: t(
        'BeetleSense hittade ett angrepp 3 veckor innan vår årsinspektion skulle ha gjort det.',
        'BeetleSense caught an infestation 3 weeks before our annual inspection would have.',
      ),
      name: t('Skogsägare, Småland', 'Forest owner, Småland'),
    },
    {
      quote: t(
        'Satellitbilderna visar vad markrundor missar. Värt varje krona.',
        'The satellite view shows what ground surveys miss. Worth every krona.',
      ),
      name: t('Certifierad skogsinspektör, Dalarna', 'Certified forestry inspector, Dalarna'),
    },
  ] as const;

  return (
    <section className="py-12 px-6 bg-[#060e08]">
      <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
        {proofs.map(({ quote, name }, idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-emerald-500/10 bg-[#0a1a0d] p-6 flex flex-col gap-4"
          >
            <blockquote
              className="text-lg text-gray-300/90 italic leading-relaxed"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
            <footer className="text-sm text-gray-400/50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <div className="flex items-center gap-2">
                <div className="w-1 h-8 rounded-full bg-emerald-400" aria-hidden="true" />
                <span>— {name}</span>
              </div>
            </footer>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureShowcase() {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const { t } = useLang();

  return (
    <section id="features" className="py-24 px-6 bg-[#0d1f10]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Plattform &middot; Platform
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Allt du behöver för att skydda din skog', 'Everything You Need to Protect Your Forest')}
          </h2>
          <p className="text-gray-400/70 max-w-2xl mx-auto">
            {t(
              'Från satellitbaserad tidig detektion till AI-drivna rekommendationer — en komplett verktygslåda för modernt skogsbruk.',
              'From satellite-based early detection to AI-powered recommendations — a complete toolkit for modern forestry.',
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feature, idx) => {
            const isHovered = hoveredIdx === idx;
            const Icon = feature.icon;
            const Wrapper = isDemoEnabled() ? Link : 'div';
            const wrapperProps = isDemoEnabled() ? { to: feature.demoUrl } : {};
            return (
              <Wrapper
                key={idx}
                {...(wrapperProps as any)}
                className={`group relative rounded-2xl border p-6 transition-all duration-300 ${
                  isHovered
                    ? 'border-emerald-500/40 bg-[#0a1a0d] scale-[1.02]'
                    : 'border-emerald-500/10 bg-[#0a1a0d] hover:border-emerald-500/20'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors ${
                    isHovered ? 'bg-emerald-400/20 text-emerald-400' : 'bg-emerald-500/5 text-gray-400/50'
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t(feature.title, feature.titleEn)}</h3>
                <p className="text-sm text-gray-400/70 leading-relaxed mb-3">{t(feature.desc, feature.descEn)}</p>
                {isDemoEnabled() && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    {t('Utforska demo', 'Explore demo')} <ArrowRight size={12} />
                  </span>
                )}
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* âââ Product Preview (Interactive Tabs) âââ */
const PREVIEW_TABS = [
  { id: 'map', label: 'Karta & Sensorer' },
  { id: 'advisor', label: 'AI-rådgivare' },
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
    <section className="py-24 px-6 bg-[#060e08]">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Live förhandsvisning &middot; Live Preview
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-3"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Se plattformen i aktion
          </h2>
          <p className="text-gray-400/50">Ingen registrering krävs</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-emerald-500/10 bg-[#0a1a0d] overflow-hidden"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {/* Tab bar */}
          <div className="flex border-b border-emerald-500/10 overflow-x-auto">
            {PREVIEW_TABS.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(idx)}
                className={`flex-1 min-w-[140px] px-4 py-3.5 text-sm font-medium transition-all relative whitespace-nowrap ${
                  activeTab === idx
                    ? 'text-emerald-400'
                    : 'text-gray-400/50 hover:text-gray-300'
                }`}
              >
                {tab.label}
                {activeTab === idx && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
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
                <div className="relative rounded-xl overflow-hidden bg-[#0d1f10] h-[220px] border border-emerald-500/10">
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
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#4ade80' : activeLayer === 'thermal' ? '#ef4444' : '#eab308'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-gray-300/80">Norra Skogen</span>
                  </div>
                  <div
                    className="absolute rounded-sm transition-all duration-500"
                    style={{
                      top: '35%', left: '50%', width: '28%', height: '45%',
                      backgroundColor: activeLayer === 'ndvi' ? 'rgba(34,197,94,0.25)' : activeLayer === 'thermal' ? 'rgba(239,68,68,0.35)' : 'rgba(234,179,8,0.15)',
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#16a34a' : activeLayer === 'thermal' ? '#dc2626' : '#ca8a04'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-gray-300/80">Södra Skiftet</span>
                  </div>
                  <div
                    className="absolute rounded-sm transition-all duration-500"
                    style={{
                      top: '10%', left: '55%', width: '22%', height: '25%',
                      backgroundColor: activeLayer === 'ndvi' ? 'rgba(34,197,94,0.45)' : activeLayer === 'thermal' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.45)',
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#4ade80' : activeLayer === 'thermal' ? '#f87171' : '#facc15'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-gray-300/80">Bergsängen</span>
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
                          ? 'bg-emerald-400/20 text-emerald-400 border border-emerald-400/40'
                          : 'bg-[#0d1f10] text-gray-400/50 border border-emerald-500/10 hover:border-emerald-500/20'
                      }`}
                    >
                      {layer.emoji} {layer.label}
                    </button>
                  ))}
                </div>


                {isDemoEnabled() && (
                  <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    Prova själv <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}

            {/* Tab 2: AI-rådgivare */}
            {activeTab === 1 && (
              <div className="animate-fade-in space-y-4 max-w-xl">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-white">Hur mår min skog?</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="bg-[#0d1f10] border border-emerald-500/10 rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%] space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-emerald-400/20 flex items-center justify-center">
                        <BrainCircuit className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-xs font-medium text-emerald-400">Skogsrådgivaren</span>
                    </div>
                    <p className="text-sm text-gray-300/80 leading-relaxed">
                      Norra Skogen visar generellt god hälsa (NDVI 0.72), men jag ser tidiga stressignaler i det sydöstra hörnet.{' '}
                      <span className="text-amber-400">3 granar har förhöjd krontemperatur (+2.1°C)</span>.
                      Jag rekommenderar en riktad drönarscan inom 2 veckor.
                    </p>
                    {/* Typing indicator */}
                    {typingVisible && (
                      <div className="flex gap-1 py-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    )}
                  </div>
                </div>

                {/* Citation badge */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0d1f10] border border-emerald-500/10 w-fit">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-xs text-gray-400/50">Baserat på 4 sensorlager + 2 000+ vetenskapliga källor</span>
                </div>

                {isDemoEnabled() && (
                  <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    Prova själv <ArrowRight size={14} />
                  </Link>
                )}
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
                      <h4 className="text-base font-semibold text-white">
                        Barkborreangrepp detekterat — Norra Skogen
                      </h4>
                      <p className="text-xs text-red-400 font-mono mt-0.5">KRITISK VARNING</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-300/80">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                      3 granar under aktiv attack, 8 i riskzonen
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                      Upptäckt 3 veckor före synliga symptom
                    </div>
                  </div>

                  <div className="bg-[#0d1f10] rounded-lg p-3 border border-emerald-500/10">
                    <p className="text-xs text-gray-400/50 uppercase tracking-wider mb-1 font-medium">Rekommendation</p>
                    <p className="text-sm text-white">
                      Avverka angripna + riskträd â <span className="text-emerald-400 font-semibold">spara 48 000 kr virkesvärde</span>
                    </p>
                  </div>

                  {isDemoEnabled() && (
                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link
                        to="/demo"
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-400/15 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/25 transition-colors"
                      >
                        Visa på karta
                      </Link>
                      <Link
                        to="/demo"
                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[#0d1f10] text-gray-300 border border-emerald-500/10 hover:border-emerald-500/20 transition-colors"
                      >
                        Skapa åtgärdsplan
                      </Link>
                    </div>
                  )}
                </div>

                {isDemoEnabled() && (
                  <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    Prova själv <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}

            {/* Tab 4: Canopy Analysis */}
            {activeTab === 3 && (
              <div className="animate-fade-in space-y-5">
                <div className="rounded-xl border border-emerald-500/10 overflow-hidden bg-[#0d1f10] relative" style={{ height: 300 }}>
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
                      <div className="bg-[#0a1a0d]/90 rounded-lg p-3 text-center border border-emerald-500/10">
                        <div className="text-lg font-mono font-bold text-emerald-400">94%</div>
                        <div className="text-[10px] text-gray-400/50">Krontäckning</div>
                      </div>
                      <div className="bg-[#0a1a0d]/90 rounded-lg p-3 text-center border border-emerald-500/10">
                        <div className="text-lg font-mono font-bold text-emerald-400">22m</div>
                        <div className="text-[10px] text-gray-400/50">Medelhöjd</div>
                      </div>
                      <div className="bg-[#0a1a0d]/90 rounded-lg p-3 text-center border border-emerald-500/10">
                        <div className="text-lg font-mono font-bold text-yellow-400">3</div>
                        <div className="text-[10px] text-gray-400/50">Riskzoner</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-gray-400/70">
                  AI-driven kronanalys med höjddata, densitet och hälsostatus. Identifiera stressade trädkronor innan skador syns.
                </p>
                {isDemoEnabled() && (
                  <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors">
                    Prova själv <ArrowRight size={14} />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* âââ How It Works âââ */
function HowItWorks() {
  const { t } = useLang();
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#0a1a0d]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Enkel uppstart &middot; Easy start
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Igång på 3 steg', 'Up and Running in 3 Steps')}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[16.67%] right-[16.67%] h-0.5 bg-gradient-to-r from-emerald-500/20 via-emerald-500/40 to-emerald-500/20" />

          {STEPS.map((step, _idx) => {
            const Icon = step.icon;
            return (
              <div key={step.num} className="relative flex flex-col items-center text-center">
                <div className="relative z-10 w-16 h-16 rounded-2xl bg-[#0d1f10] border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6">
                  <Icon className="w-7 h-7" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-emerald-500 text-[#060e08] text-xs font-mono font-bold flex items-center justify-center">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t(step.title, step.titleEn)}</h3>
                <p className="text-sm text-gray-400/70 leading-relaxed max-w-xs">{t(step.desc, step.descEn)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* âââ Role-based Benefits âââ */
function PersonaSection() {
  const { t } = useLang();
  return (
    <section id="personas" className="py-24 px-6 bg-[#060e08]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Vem är det för? &middot; Who is it for?
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Byggd för svenska skogsägare', 'Built for Swedish Forest Owners')}
          </h2>
          <p className="text-gray-400/70 max-w-2xl mx-auto">
            {t(
              'BeetleSense är i första hand för privata skogsägare med 10-500 hektar som vill skydda sitt virkesvärde. Vi stödjer även drönarpilot som erbjuder inspektionstjänster och kommunala inspektörer.',
              'BeetleSense is primarily for private forest owners with 10-500 hectares who want to protect their timber value. We also support drone pilots offering inspection services and municipal inspectors.',
            )}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((persona, idx) => {
            const Icon = persona.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-emerald-500/10 bg-[#0a1a0d] p-8 flex flex-col items-center text-center hover:border-emerald-500/20 transition-colors"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-center text-emerald-400 mb-4">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{t(persona.title, persona.titleEn)}</h3>
                <p className="text-sm text-gray-400/70 leading-relaxed mb-4">{t(persona.desc, persona.descEn)}</p>
                <ul className="space-y-2 text-left w-full">
                  {(t(persona.benefits, persona.benefitsEn) as readonly string[]).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-300/80">
                      <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
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


/* âââ Pricing âââ */
function PricingSection() {
  const { t } = useLang();
  return (
    <section id="pricing" className="py-24 px-6 bg-[#0d1f10]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Priser &middot; Pricing
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Börja gratis, skala när du är redo', 'Start Free, Scale When Ready')}
          </h2>
          <p className="text-gray-400/70 max-w-2xl mx-auto">
            {t(
              'Inget kreditkort krävs. Testa BeetleSense med ditt första skifte helt gratis.',
              'No credit card required. Try BeetleSense with your first parcel completely free.',
            )}
          </p>
        </div>

        {/* Note: AnchoringComparison component was removed — see git history */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {PRICING.map((plan, idx) => (
            <div
              key={idx}
              className={`relative rounded-2xl border p-8 flex flex-col ${
                plan.popular
                  ? 'border-emerald-500/40 bg-[#0a1a0d] scale-[1.00] md:scale-105'
                  : 'border-emerald-500/10 bg-[#0a1a0d]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider whitespace-nowrap text-[#060e08]" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                  {t('Mest populär', 'Most Popular')}
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-1">{t(plan.name, plan.nameEn)}</h3>
                <p className="text-sm text-gray-400/50">{t(plan.desc, plan.descEn)}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-mono font-bold ${plan.popular ? 'text-emerald-400' : 'text-white'}`}
                  >
                    {`${plan.price} kr`}
                  </span>
                  {plan.period && (
                    <span className="text-sm text-gray-400/50">{t(plan.period, plan.periodEn)}</span>
                  )}
                </div>
              </div>

              <ul className="flex-1 space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-600 shrink-0" />
                    )}
                    <span className={feature.included ? 'text-gray-300/80' : 'text-gray-500/40'}>
                      {t(feature.text, feature.textEn)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* Enterprise plan links to contact email, others to signup */}
              {plan.nameEn === 'Enterprise' ? (
                <a
                  href="mailto:hello@beetlesense.ai?subject=Enterprise%20Plan%20Inquiry"
                  className="block text-center py-3 rounded-xl font-semibold text-sm transition-all border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5"
                >
                  {t(plan.cta, plan.ctaEn)}
                </a>
              ) : (
                <Link
                  to="/signup"
                  className={`block text-center py-3 rounded-xl font-semibold text-sm transition-all ${
                    plan.popular
                      ? 'text-[#060e08] hover:brightness-110'
                      : 'border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5'
                  }`}
                  style={plan.popular ? { background: 'linear-gradient(135deg, #22c55e, #16a34a)' } : undefined}
                >
                  {t(plan.cta, plan.ctaEn)}
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* âââ Testimonials âââ */
function TestimonialSection() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const { t } = useLang();

  const next = useCallback(() => {
    setActive((prev) => (prev + 1) % TESTIMONIALS.length);
  }, []);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [paused, next]);

  return (
    <section id="testimonials" className="py-24 px-6 bg-[#060e08]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Omdömen &middot; Testimonials
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Betrodd av svenska skogsägare', 'Trusted by Swedish Forest Owners')}
          </h2>
        </div>

        <div
          className="relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-roledescription="karusell"
          aria-label="Kundomdömen"
        >
          <div className="overflow-hidden" aria-live="polite" aria-atomic="true">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {TESTIMONIALS.map((testimonial, idx) => (
                <div
                  key={idx}
                  className="w-full shrink-0 px-4"
                  role="group"
                  aria-roledescription="bild"
                  aria-label={`Omdöme ${idx + 1} av ${TESTIMONIALS.length}: ${testimonial.name}`}
                  aria-hidden={idx !== active}
                >
                  <div className="rounded-2xl border border-emerald-500/10 bg-[#0a1a0d] p-8 text-center">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }} aria-hidden="true">
                      <span className="text-xl font-bold text-[#060e08]">{testimonial.initials}</span>
                    </div>
                    <div className="flex justify-center gap-0.5 mb-4" aria-label="5 av 5 stjärnor">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-400 fill-current" aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote
                      className="text-lg text-gray-300/90 italic leading-relaxed mb-6"
                      style={{ fontFamily: "'DM Serif Display', serif" }}
                    >
                      &ldquo;{t(testimonial.quote, testimonial.quoteEn)}&rdquo;
                    </blockquote>
                    <footer>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm text-gray-400/50">
                        {t(testimonial.role, testimonial.roleEn)} &mdash; {testimonial.location}
                      </p>
                    </footer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Välj omdöme">
            {TESTIMONIALS.map((testimonial, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                role="tab"
                aria-selected={idx === active}
                className={`h-2.5 rounded-full transition-all ${
                  idx === active ? 'bg-emerald-400 w-8' : 'bg-gray-600 hover:bg-gray-500 w-2.5'
                }`}
                aria-label={`Visa omdöme från ${testimonial.name}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* âââ FAQ âââ */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const { t } = useLang();

  return (
    <section id="faq" className="py-24 px-6 bg-[#0a1a0d]">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-widest">
            Vanliga frågor &middot; FAQ
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Vanliga frågor och svar', 'Frequently Asked Questions')}
          </h2>
        </div>

        <dl className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-colors ${
                  isOpen ? 'border-emerald-500/30 bg-[#0d1f10]' : 'border-emerald-500/10 bg-[#060e08]'
                }`}
              >
                <dt>
                  <button
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${idx}`}
                    id={`faq-question-${idx}`}
                  >
                    <span className="text-sm sm:text-base font-medium text-white">
                      {t(item.q, item.qEn)}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-emerald-400 shrink-0 transition-transform duration-300 ${
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
                  <div className="px-5 pb-5 text-sm text-gray-400/70 leading-relaxed">
                    {t(item.a, item.aEn)}
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

/* âââ CTA Footer âââ */
function CTAFooter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { t } = useLang();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      if (isSupabaseConfigured) {
        await supabase.from('newsletter_subscribers').insert({ email });
      }
      setSubmitted(true);
      setEmail('');
    } catch {
      // Still show success — we don't want to block the UX
      setSubmitted(true);
      setEmail('');
    }
  };

  return (
    <section id="cta" className="py-24 px-6 bg-[#060e08]">
      <div className="max-w-4xl mx-auto">
        <div className="rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-[#0d1f10] to-[#0a1a0d] p-8 sm:p-12 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold text-white mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {t('Redo att skydda din skog?', 'Ready to Protect Your Forest?')}
          </h2>
          <p className="text-gray-400/70 max-w-xl mx-auto mb-8">
            {t(
              'Gå med hundratals svenska skogsägare som redan använder BeetleSense för att upptäcka hot tidigt och fatta smartare skogsbeslut.',
              'Join hundreds of Swedish forest owners already using BeetleSense to detect threats early and make smarter forest decisions.',
            )}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10 w-full sm:w-auto">
            <Link
              to="/signup"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-[#060e08] font-semibold text-base transition-all hover:brightness-110 hover:scale-105"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              {t('Kom igång gratis', 'Get Started Free')}
              <ArrowRight className="w-5 h-5" />
            </Link>
            {isDemoEnabled() && (
              <Link
                to="/demo"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-emerald-500/20 text-emerald-400 font-semibold text-base transition-all hover:bg-emerald-500/5"
              >
                {t('Prova demo', 'Try Demo')}
              </Link>
            )}
          </div>

          {/* Newsletter signup */}
          <div className="max-w-md mx-auto">
            <p className="text-sm text-gray-400/50 mb-3">
              {t('Prenumerera på vårt nyhetsbrev', 'Subscribe to our newsletter')}
            </p>
            {submitted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 text-sm py-3">
                <Check className="w-5 h-5" />
                {t('Tack! Vi hör av oss snart.', 'Thanks! We\'ll be in touch soon.')}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex gap-2" aria-label="Nyhetsbrev">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" aria-hidden="true" />
                  <label htmlFor="newsletter-email" className="sr-only">E-postadress</label>
                  <input
                    id="newsletter-email"
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#060e08] border border-emerald-500/10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl text-[#060e08] font-semibold text-sm transition-all hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#060e08] flex items-center gap-2 shrink-0"
                  style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
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

/* âââ Footer âââ */
function Footer() {
  return (
    <footer className="border-t border-emerald-500/10 bg-[#060e08] py-16 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}>
                <Zap className="w-5 h-5 text-[#060e08]" />
              </div>
              <span className="font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>
                BeetleSense
              </span>
            </div>
            <p className="text-xs text-gray-400/50 leading-relaxed mb-4">
              BeetleSense AB
              <br />
              Under registrering
              <br />
              Växjö, Sverige
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Produkt</h4>
            <ul className="space-y-2">
              {[
                { href: '#features', label: 'Funktioner' },
                { href: '#pricing', label: 'Priser' },
                { href: '#how-it-works', label: 'Demo' },
                { href: '#faq', label: 'FAQ' },
              ].map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-gray-400/50 hover:text-emerald-400 transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      const id = item.href.replace('#', '');
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Resurser</h4>
            <ul className="space-y-2">
              {[
                    { name: 'Blogg', href: '/blog' },
                    { name: 'Dokumentation', href: '/api-docs' },
                    { name: 'API', href: '/api-docs' },
                    { name: 'Community', href: 'https://github.com/ChristoSweden/beetlesense-platform/discussions' },
                  ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-gray-400/50 hover:text-emerald-400 transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-4">Juridiskt</h4>
            <ul className="space-y-2">
              {[
                    { name: 'Integritetspolicy', href: '/privacy' },
                    { name: 'Användarvillkor', href: '/terms' },
                    { name: 'GDPR', href: 'mailto:gdpr@beetlesense.ai?subject=GDPR%20Request' },
                    { name: 'Kontakt', href: 'mailto:hello@beetlesense.ai?subject=Contact%20BeetleSense' },
                  ].map((item) => (
                <li key={item.name}>
                  <a href={item.href} className="text-sm text-gray-400/50 hover:text-emerald-400 transition-colors">
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-emerald-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400/50">
            &copy; {new Date().getFullYear()} BeetleSense AB. Alla rättigheter förbehållna.
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
                className="w-8 h-8 rounded-lg bg-[#0a1a0d] border border-emerald-500/10 flex items-center justify-center text-gray-400/50 hover:text-emerald-400 hover:border-emerald-500/20 transition-colors"
                aria-label={`${social.name} — öppnas i nytt fönster`}
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

/* âââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   MAIN LANDING PAGE
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââ */


// LiveDemoMap removed — rendered a 3D forest section whose heavy imports were
// already deleted, leaving an empty Suspense shell. See git history to restore.

/* âââ Floating Demo Banner âââ */
function FloatingDemoBanner() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!isDemoEnabled() || dismissed || !visible) return null;

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
      <div className="bg-[#0a1a0d] border-t border-emerald-500/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-gray-300 hidden sm:block">
            Se BeetleSense i aktion
          </p>
          <div className="flex items-center gap-3 flex-1 sm:flex-none justify-center sm:justify-end">
            <Link
              to="/demo"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-lg text-[#060e08] text-sm font-semibold transition-all hover:brightness-110 hover:scale-105 shadow-md shadow-emerald-500/20"
              style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              <Zap className="w-4 h-4" />
              Prova gratis demo
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setDismissed(true)}
              className="p-1.5 rounded-lg text-gray-400/50 hover:text-white hover:bg-[#0d1f10] transition-colors"
              aria-label="Stäng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#060e08]" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav />
      <main id="main-content">
      <HeroSection />
      <ProblemSection />
      <ImpactStats />
      <ForestOwnerProof />
      <FeatureShowcase />
      <ProductPreview />
      <HowItWorks />
      <PersonaSection />
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

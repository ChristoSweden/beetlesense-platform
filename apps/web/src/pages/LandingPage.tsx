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

// Lazy-loaded heavy components
const AnchoringComparison = React.lazy(() => import('@/components/behavioral/AnchoringComparison'));
const Forest3D = React.lazy(() => import('@/components/Forest3D'));
const ForestScanHero = React.lazy(() => import('@/components/landing/ForestScanHero'));

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
    demoUrl: '/owner/early-detection',
  },
  {
    icon: TreePine,
    title: 'Skogshälsoövervakning',
    titleEn: 'Forest Health Monitoring',
    desc: 'Kontinuerlig NDVI-analys, fuktnivåer och tillväxttakt. Hälsopoäng per skifte uppdateras var 5:e dag under växtsäsongen.',
    descEn: 'Continuous NDVI analysis, moisture levels and growth rates. Per-parcel health scores updated every 5 days during the growing season.',
    demoUrl: '/owner/dashboard',
  },
  {
    icon: BarChart3,
    title: 'Virkesvolymuppskattning',
    titleEn: 'Timber Volume Estimation',
    desc: 'Kombinera LiDAR, satellitdata och fältmätningar för att beräkna stående volym, tillväxt och optimala avverkningstidpunkter.',
    descEn: 'Combine LiDAR, satellite data and field measurements to estimate standing volume, growth and optimal harvest timing.',
    demoUrl: '/owner/parcels/p1',
  },
  {
    icon: Sparkles,
    title: 'AI-kompanjon (Skogsrådgivaren)',
    titleEn: 'AI Companion (Skogsrådgivaren)',
    desc: 'Ställ frågor om din skog på naturligt språk. Personliga råd baserade på dina skiften, lokalt klimat och 241+ vetenskapliga källor.',
    descEn: 'Ask questions about your forest in natural language. Personalized advice based on your parcels, local climate and 241+ scientific sources.',
    demoUrl: '/owner/advisor',
  },
  {
    icon: Plane,
    title: 'Drönarintegration',
    titleEn: 'Drone Integration',
    desc: 'Beställ drönarundersökningar via plattformen. Automatiserade flygplaner, bildbearbetning och centimeternivådetektering.',
    descEn: 'Order drone surveys through the platform. Automated flight plans, image processing and centimeter-level detection.',
    demoUrl: '/owner/surveys',
  },
  {
    icon: ShieldCheck,
    title: 'Regelefterlevnad',
    titleEn: 'Regulatory Compliance',
    desc: 'Håll koll på SVL-krav, Skogsstyrelsens regler och EU:s avskogningsförordning (EUDR). Automatisk rapportering och dokumentation.',
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

const STATS = [
  { value: '34M m\u00B3', label: 'granvirke f\u00F6rlorat sedan 2018', labelEn: 'spruce timber lost to bark beetles since 2018', source: 'Skogsstyrelsen 2025' },
  { value: '308K+', label: 'privata skogsf\u00F6rvaltare', labelEn: 'private forest owners in Sweden', source: 'Skogsstyrelsen 2024' },
  { value: '140 dd', label: 'daggrader f\u00F6r sv\u00E4rmning', labelEn: 'degree-days above 8.3\u00B0C triggers swarming', source: 'Fritscher 2022' },
  { value: '95%', label: 'skademinskning sedan 2021', labelEn: 'damage reduction from 2021 peak', source: 'Skogsstyrelsen 2025' },
] as const;

const PRICING = [
  {
    name: 'Gratis',
    nameEn: 'Free',
    price: '0',
    period: ' kr/mån',
    periodEn: ' SEK/mo',
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
    period: ' kr/mån',
    periodEn: ' SEK/mo',
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
    period: ' kr/mån',
    periodEn: ' SEK/mo',
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
    a: 'Vårt satellitbaserade tidiga varningssystem uppnår cirka 87% träffsäkerhet för granbarkborredetektion, validerat mot Skogsstyrelsens markdata. Drönarundersökningar ökar träffsäkerheten till över 95%.',
    aEn: 'Our satellite-based early warning system achieves approximately 87% accuracy for bark beetle detection, validated against Swedish Forest Agency ground data. Drone surveys increase accuracy to over 95%.',
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
        scrolled ? 'bg-[#0a1f0d] border-b border-[#1a3a1d] shadow-lg shadow-black/20' : 'bg-transparent'
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
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors"
            >
              {label}
            </a>
          ))}
        </div>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-[var(--text3)] hover:text-[var(--text2)] transition-colors font-medium"
          >
            Logga in
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 rounded-xl border border-[var(--border2)] text-[var(--green)] text-sm font-medium transition-all hover:border-[var(--green)]/40"
          >
            Kom igång gratis
          </Link>
          <Link
            to="/demo"
            className="px-5 py-2 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold transition-all hover:brightness-110 hover:scale-105"
          >
            Prova demo
          </Link>
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
        <div id="mobile-nav" role="navigation" aria-label="Mobilnavigering" className="md:hidden bg-[#0a1f0d] border-t border-[#1a3a1d] px-6 py-4 space-y-3 animate-in">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="block text-sm text-[var(--text3)] hover:text-[var(--green)] py-2"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </a>
          ))}
          <div className="pt-3 border-t border-[var(--border)] flex flex-col gap-2">
            <Link to="/login" className="text-sm text-[var(--text3)] py-2 font-medium">
              Logga in
            </Link>
            <Link
              to="/signup"
              className="block text-center px-5 py-2.5 rounded-xl border border-[var(--border2)] text-[var(--green)] text-sm font-medium"
            >
              Kom igång gratis
            </Link>
            <Link
              to="/demo"
              className="block text-center px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold"
            >
              Prova demo
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* âââ Hero Section âââ */
function _HeroSection() {
  const tagline = 'Skydda din skog med satellit och AI';
  const [typedText, setTypedText] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const typingDone = useRef(false);

  useEffect(() => {
    if (typingDone.current) return;
    let i = 0;
    const interval = setInterval(() => {
      if (i < tagline.length) {
        setTypedText(tagline.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
        typingDone.current = true;
        setTimeout(() => setShowCursor(false), 2000);
      }
    }, 45);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="hero" className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden">
      {/* Realistic forest background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <img
          src="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80&auto=format&fit=crop"
          srcSet="https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=640&q=70&auto=format&fit=crop 640w, https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1280&q=75&auto=format&fit=crop 1280w, https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=1920&q=80&auto=format&fit=crop 1920w"
          sizes="100vw"
          alt="Dense green forest landscape with tall spruce trees"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ animation: 'ken-burns 30s ease-in-out infinite alternate', aspectRatio: '16/9' }}
          fetchPriority="high"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/40 to-[var(--bg)]/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/50 via-transparent to-[var(--bg)]/50" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#1a3a1d] bg-[#0a1f0d] mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Nu i beta &middot; Now in beta
          </span>
        </div>

        <h1
          className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          <span className="text-[var(--text)]">Stoppa barkborren</span>
          <br />
          <span className="text-gradient">innan den stoppar din skog</span>
        </h1>

        <p
          className="text-lg sm:text-xl md:text-2xl text-[var(--text2)] italic mb-2 min-h-[2em]"
          style={{ fontFamily: "'DM Serif Display', serif" }}
          aria-live="polite"
          aria-label={tagline}
        >
          <span aria-hidden="true">{typedText}</span>
          {showCursor && <span className="landing-cursor" aria-hidden="true">|</span>}
        </p>

        <p className="text-sm sm:text-base text-[var(--text3)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Granbarkborren har orsakat miljarder kronor i skador på svensk skog. BeetleSense kombinerar
          satellitbilder och AI för att upptäcka angrepp 2-4 veckor innan de syns — så du kan agera i tid
          och skydda ditt virkesvärde.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col items-center w-full sm:w-auto">
            <Link
              to="/demo"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-[var(--green)] text-[var(--bg)] font-bold text-lg transition-all hover:brightness-110 hover:scale-105 glow-green shadow-lg shadow-[var(--green)]/25"
            >
              <BookOpen className="w-5 h-5" />
              Prova demo
              <ArrowRight className="w-5 h-5" />
            </Link>
            <span className="text-xs text-[var(--green)]/70 mt-2 font-medium">Ingen registrering krävs</span>
          </div>
          <Link
            to="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border2)] text-[var(--green)] font-semibold text-base transition-all hover:bg-[var(--bg3)] hover:border-[var(--green)]"
          >
            Kom igång gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 opacity-50">
          <span className="text-xs font-mono text-[var(--text3)] uppercase tracking-wider">Data från</span>
          {['Skogsstyrelsen', 'SLU', 'Lantmäteriet', 'SMHI', 'Copernicus'].map((name) => (
            <span key={name} className="text-sm text-[var(--text3)]">{name}</span>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <a href="#problem" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-xs text-[var(--text3)] font-mono">Scrolla</span>
        <ChevronDown className="w-5 h-5 text-[var(--green)]" />
      </a>
    </section>
  );
}

/* âââ Problem Statement âââ */
function ProblemSection() {
  const problems = [
    {
      value: '8M m\u00B3',
      label: 'virke skadat av granbarkborrar \u00E5rligen under utbrott\u00E5ren',
      labelEn: 'timber damaged by bark beetles annually during outbreak years',
      color: 'text-[var(--red)]',
    },
    {
      value: '50%',
      label: 'av privata skogsägare övervakar inte aktivt för skadedjursangrepp',
      labelEn: 'of private forest owners do not actively monitor for pest infestations',
      color: 'text-[var(--amber)]',
    },
    {
      value: '+2\u00B0C',
      label: 'temperaturökning sedan 1900 — granbarkborren trivs i varmare klimat',
      labelEn: 'temperature increase since 1900 — bark beetles thrive in warmer climates',
      color: 'text-[var(--amber)]',
    },
  ];

  return (
    <section id="problem" className="py-24 px-6 bg-[#071509]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--red)] uppercase tracking-widest">
            Utmaningen &middot; The Challenge
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Svenska skogar är under attack
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto leading-relaxed">
            Klimatförändringar och granbarkborrar (Ips typographus) hotar Sveriges 23 miljoner hektar
            produktiv skog. De flesta ägare saknar verktyg för att upptäcka skador tidigt. Samtidigt
            blir regelkraven allt mer komplexa med EU:s nya avskogningsförordning.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {problems.map(({ value, label, color }, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border)] bg-[#0a1f0d] p-8 text-center hover:border-[var(--border2)] transition-colors group"
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

/* âââ Feature Showcase âââ */
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
            Allt du behöver för att skydda din skog
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto">
            Från satellitbaserad tidig detektion till AI-drivna rekommendationer — en komplett
            verktygslåda för modernt skogsbruk.
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
                    : 'border-[var(--border)] bg-[#0a1f0d] hover:border-[var(--border2)]'
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
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Live förhandsvisning &middot; Live Preview
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-3"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Se plattformen i aktion
          </h2>
          <p className="text-[var(--text3)]">Ingen registrering krävs</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl border border-[#1a3a1d] bg-[#0a1f0d] overflow-hidden"
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
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-white/70">Södra Skiftet</span>
                  </div>
                  <div
                    className="absolute rounded-sm transition-all duration-500"
                    style={{
                      top: '10%', left: '55%', width: '22%', height: '25%',
                      backgroundColor: activeLayer === 'ndvi' ? 'rgba(34,197,94,0.45)' : activeLayer === 'thermal' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.45)',
                      border: `1.5px solid ${activeLayer === 'ndvi' ? '#00F2FF' : activeLayer === 'thermal' ? '#f87171' : '#facc15'}`,
                    }}
                  >
                    <span className="absolute top-1 left-2 text-[10px] font-mono text-white/70">Bergsängen</span>
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
                  <span className="text-[var(--text2)]"><span className="font-semibold text-[var(--text)]">14 200</span> träd</span>
                  <span className="text-[var(--text2)]"><span className="font-semibold text-[var(--text)]">45.2</span> ha</span>
                  <span className="text-[var(--text2)]"><span className="font-semibold text-[var(--green)]">92%</span> frisk</span>
                </div>

                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova själv <ArrowRight size={14} />
                </Link>
              </div>
            )}

            {/* Tab 2: AI-rådgivare */}
            {activeTab === 1 && (
              <div className="animate-fade-in space-y-4 max-w-xl">
                {/* User message */}
                <div className="flex justify-end">
                  <div className="bg-[var(--green)]/15 border border-[var(--green)]/30 rounded-2xl rounded-br-md px-4 py-3 max-w-[80%]">
                    <p className="text-sm text-[var(--text)]">Hur mår min skog?</p>
                  </div>
                </div>

                {/* AI response */}
                <div className="flex justify-start">
                  <div className="bg-[var(--bg3)] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3 max-w-[90%] space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 rounded-full bg-[var(--green)]/20 flex items-center justify-center">
                        <BrainCircuit className="w-3 h-3 text-[var(--green)]" />
                      </div>
                      <span className="text-xs font-medium text-[var(--green)]">Skogsrådgivaren</span>
                    </div>
                    <p className="text-sm text-[var(--text2)] leading-relaxed">
                      Norra Skogen visar generellt god hälsa (NDVI 0.72), men jag ser tidiga stressignaler i det sydöstra hörnet.{' '}
                      <span className="text-amber-400">3 granar har förhöjd krontemperatur (+2.1°C)</span>.
                      Jag rekommenderar en riktad drönarscan inom 2 veckor.
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
                  <span className="text-xs text-[var(--text3)]">Baserat på 4 sensorlager + 241 vetenskapliga källor</span>
                </div>

                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova själv <ArrowRight size={14} />
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
                        Barkborreangrepp detekterat — Norra Skogen
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
                      Upptäckt 3 veckor före synliga symptom
                    </div>
                  </div>

                  <div className="bg-[var(--bg2)] rounded-lg p-3 border border-[var(--border)]">
                    <p className="text-xs text-[var(--text3)] uppercase tracking-wider mb-1 font-medium">Rekommendation</p>
                    <p className="text-sm text-[var(--text)]">
                      Avverka angripna + riskträd â <span className="text-[var(--green)] font-semibold">spara 48 000 kr virkesvärde</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Link
                      to="/demo"
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30 hover:bg-[var(--green)]/25 transition-colors"
                    >
                      Visa på karta
                    </Link>
                    <Link
                      to="/demo"
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)] hover:border-[var(--border2)] transition-colors"
                    >
                      Skapa åtgärdsplan
                    </Link>
                  </div>
                </div>

                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova själv <ArrowRight size={14} />
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
                      <div className="bg-[#030d05] rounded-lg p-3 text-center border border-[#1a3a1d]">
                        <div className="text-lg font-bold text-[#22c55e]">94%</div>
                        <div className="text-[10px] text-[#4a7c59]">Krontäckning</div>
                      </div>
                      <div className="bg-[#030d05] rounded-lg p-3 text-center border border-[#1a3a1d]">
                        <div className="text-lg font-bold text-[#22c55e]">22m</div>
                        <div className="text-[10px] text-[#4a7c59]">Medelhöjd</div>
                      </div>
                      <div className="bg-[#030d05] rounded-lg p-3 text-center border border-[#1a3a1d]">
                        <div className="text-lg font-bold text-yellow-400">3</div>
                        <div className="text-[10px] text-[#4a7c59]">Riskzoner</div>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-[var(--text3)]">
                  AI-driven kronanalys med höjddata, densitet och hälsostatus. Identifiera stressade trädkronor innan skador syns.
                </p>
                <Link to="/demo" className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--green)] hover:text-[var(--green2)] transition-colors">
                  Prova själv <ArrowRight size={14} />
                </Link>
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
  return (
    <section id="how-it-works" className="py-24 px-6 bg-[#071509]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Enkel uppstart &middot; Easy start
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Igång på 3 steg
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

/* âââ Role-based Benefits âââ */
function PersonaSection() {
  return (
    <section id="personas" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Vem är det för? &middot; Who is it for?
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Byggd för svenska skogsägare
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto">
            BeetleSense är i första hand för privata skogsägare med 10-500 hektar som vill skydda sitt
            virkesvärde. Vi stödjer även drönarpilot som erbjuder inspektionstjänster och kommunala inspektörer.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PERSONAS.map((persona, idx) => {
            const Icon = persona.icon;
            return (
              <div
                key={idx}
                className="rounded-2xl border border-[var(--border)] bg-[#0a1f0d] p-8 flex flex-col items-center text-center hover:border-[var(--border2)] transition-colors"
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

/* âââ Stats / Social Proof âââ */
function StatsSection() {
  return (
    <section id="stats" className="py-20 px-6 bg-[#071509]">
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

/* âââ Pricing âââ */
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
            Börja gratis, skala när du är redo
          </h2>
          <p className="text-[var(--text3)] max-w-2xl mx-auto">
            Inget kreditkort krävs. Testa BeetleSense med ditt första skifte helt gratis.
            <br />
            <span className="text-xs italic">No credit card required. Try BeetleSense with your first parcel completely free.</span>
          </p>
        </div>

        {/* Anchoring Comparison — manual cost vs BeetleSense */}
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
                  : 'border-[var(--border)] bg-[#0a1f0d]'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--green)] text-[var(--bg)] text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                  Mest populär
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
                    {`${plan.price} kr`}
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

/* âââ Testimonials âââ */
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
    <section id="testimonials" className="py-24 px-6 bg-[#071509]">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Omdömen &middot; Testimonials
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Betrodd av svenska skogsägare
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
              {TESTIMONIALS.map((t, idx) => (
                <div
                  key={idx}
                  className="w-full shrink-0 px-4"
                  role="group"
                  aria-roledescription="bild"
                  aria-label={`Omdöme ${idx + 1} av ${TESTIMONIALS.length}: ${t.name}`}
                  aria-hidden={idx !== active}
                >
                  <div className="rounded-2xl border border-[var(--border)] bg-[#0a1f0d] p-8 text-center">
                    <div className="w-16 h-16 bg-[#007a80] rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                      <span className="text-xl font-bold text-white">{t.initials}</span>
                    </div>
                    <div className="flex justify-center gap-0.5 mb-4" aria-label="5 av 5 stjärnor">
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
          <div className="flex items-center justify-center gap-2 mt-6" role="tablist" aria-label="Välj omdöme">
            {TESTIMONIALS.map((t, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                role="tab"
                aria-selected={idx === active}
                className={`h-2.5 rounded-full transition-all ${
                  idx === active ? 'bg-[var(--green)] w-8' : 'bg-[var(--text3)]/30 hover:bg-[var(--text3)] w-2.5'
                }`}
                aria-label={`Visa omdöme från ${t.name}`}
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

  return (
    <section id="faq" className="py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Vanliga frågor &middot; FAQ
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Vanliga frågor och svar
          </h2>
        </div>

        <dl className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-colors ${
                  isOpen ? 'border-[var(--green)]/30 bg-[var(--bg3)]' : 'border-[var(--border)] bg-[#071509]'
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

/* âââ CTA Footer âââ */
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
            Gå med hundratals svenska skogsägare som redan använder BeetleSense för att upptäcka
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
              Kom igång gratis
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
              Prenumerera på vårt nyhetsbrev &middot; Subscribe to our newsletter
            </p>
            {submitted ? (
              <div className="flex items-center justify-center gap-2 text-[var(--green)] text-sm py-3">
                <Check className="w-5 h-5" />
                Tack! Vi hör av oss snart.
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[#030d05] border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text3)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--green)] focus:border-[var(--green)] transition-colors"
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

/* âââ Footer âââ */
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] bg-[#0a1f0d] py-16 px-6">
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
              Växjö, Sverige
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
                    { name: 'Användarvillkor', href: '/terms' },
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
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
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

        {/* Info overlay — left side */}
        <div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 max-w-md z-10">
          <div className="rounded-2xl border border-[#1a3a1d] bg-[#030d05] p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-[#00F2FF] animate-pulse" />
              <span className="text-xs font-mono text-[var(--green)] uppercase tracking-wider">Live 3D-skogsövervakning</span>
            </div>
            <h3 className="text-xl font-serif font-bold text-[var(--text)] mb-2">
              Multisensor-analys i realtid
            </h3>
            <p className="text-sm text-[var(--text3)] mb-4 leading-relaxed">
              Kombinera satellit, drönare, LiDAR och termisk data för att upptäcka barkborre
              veckor innan synliga symptom. Varje träd röntgas med 4 sensorer.
            </p>

            {/* Mini signal strip */}
            <div className="flex items-center gap-3 mb-4">
              {[
                { label: 'Hälsa', color: '#00F2FF' },
                { label: 'Barkborre', color: '#f59e0b' },
                { label: 'Väder', color: '#00F2FF' },
                { label: 'Tillväxt', color: '#00F2FF' },
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

        {/* Floating data cards — right side */}
        <div className="absolute right-6 md:right-12 top-1/4 z-10 hidden md:flex flex-col gap-3">
          <div className="rounded-xl border border-[#1a3a1d] bg-[#0a1f0d] px-4 py-3 shadow-lg animate-[fadeInUp_0.6s_ease-out_0.2s_both]">
            <div className="text-[10px] text-[#4a7c59] uppercase tracking-wider mb-1">Trädröntgen</div>
            <div className="text-lg font-mono font-bold text-[#22c55e]">14,200</div>
            <div className="text-[10px] text-[#4a7c59]">träd röntgade</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-[#0a1f0d] px-4 py-3 shadow-lg animate-[fadeInUp_0.6s_ease-out_0.4s_both]">
            <div className="text-[10px] text-[#4a7c59] uppercase tracking-wider mb-1">Barkborreangrepp</div>
            <div className="text-lg font-mono font-bold text-amber-400">23</div>
            <div className="text-[10px] text-[#4a7c59]">under barkborreangrepp</div>
          </div>
          <div className="rounded-xl border border-[#1a3a1d] bg-[#0a1f0d] px-4 py-3 shadow-lg animate-[fadeInUp_0.6s_ease-out_0.6s_both]">
            <div className="text-[10px] text-[#4a7c59] uppercase tracking-wider mb-1">Skyddad virkesvärde</div>
            <div className="text-lg font-mono font-bold text-[#e8f5e9]">2.4M kr</div>
            <div className="text-[10px] text-[#4a7c59]">virkesvärde skyddat</div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* âââ Floating Demo Banner âââ */
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
      <div className="bg-[#0a1f0d] border-t border-[#1a3a1d] px-4 py-3">
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
            EU FORWARDS Grant — {timeLeft.days}d {timeLeft.hours}h left to apply for up to €150K
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
          className="flex-shrink-0 p-1.5 hover:bg-[#1a3a1d] rounded-lg transition-colors"
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
      <Suspense fallback={<div className="min-h-[100dvh] bg-[#030d05]" />}>
        <ForestScanHero />
      </Suspense>
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

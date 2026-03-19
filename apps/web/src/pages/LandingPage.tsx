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

// Behavioral science components (lazy-loaded)
const AnchoringComparison = React.lazy(() => import('@/components/behavioral/AnchoringComparison'));

/* ═══════════════════════════════════════════════════════
   INLINE DATA — self-contained, no external file imports
   ═══════════════════════════════════════════════════════ */

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
    title: 'Skogsägare',
    titleEn: 'Forest Owners',
    desc: 'Övervaka din skog på distans, upptäck problem tidigt och fatta datadrivna beslut om avverkning och skötsel.',
    descEn: 'Monitor your forest remotely, detect problems early and make data-driven decisions about harvesting and management.',
    benefits: [
      'Satellithälsoövervakning för alla skiften',
      'AI-kompanjon för skogsrådgivning',
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
    title: 'Inspektörer',
    titleEn: 'Inspectors',
    desc: 'Verifiera AI-detektioner i fält, generera inspektionsrapporter och hantera dina undersökningsuppdrag.',
    descEn: 'Verify AI detections in the field, generate inspection reports and manage your survey assignments.',
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
  { value: '241+', label: 'forskningskällor', labelEn: 'research sources' },
  { value: '55+', label: 'funktioner', labelEn: 'features' },
  { value: '21', label: 'län täckta', labelEn: 'counties covered' },
  { value: 'SWEREF99 TM', label: 'precision', labelEn: 'precision' },
] as const;

const PRICING = [
  {
    name: 'Gratis',
    nameEn: 'Free',
    price: '0',
    period: '/mån',
    periodEn: '/mo',
    desc: 'Perfekt för att komma igång med ett skogsskifte.',
    descEn: 'Perfect to get started with one forest parcel.',
    cta: 'Kom igång gratis',
    ctaEn: 'Get Started Free',
    popular: false,
    features: [
      { text: '1 skogsskifte', textEn: '1 forest parcel', included: true },
      { text: 'Satellitövervakning (Sentinel-2)', textEn: 'Satellite monitoring (Sentinel-2)', included: true },
      { text: 'Skogshälsopoäng', textEn: 'Forest health score', included: true },
      { text: 'AI-kompanjon (begränsad)', textEn: 'AI companion (limited)', included: true },
      { text: 'Virkesmarknadsintelligens', textEn: 'Timber market intelligence', included: false },
      { text: 'Tidig varning & varningar', textEn: 'Early warning & alerts', included: false },
      { text: 'Fältläge (offline)', textEn: 'Field mode (offline)', included: false },
      { text: 'API-åtkomst', textEn: 'API access', included: false },
    ],
  },
  {
    name: 'Pro',
    nameEn: 'Pro',
    price: '299',
    period: ' kr/mån',
    periodEn: ' SEK/mo',
    desc: 'För aktiva skogsägare som vill ha full intelligens.',
    descEn: 'For active forest owners who want full intelligence.',
    cta: 'Starta Pro-provperiod',
    ctaEn: 'Start Pro Trial',
    popular: true,
    features: [
      { text: 'Obegränsade skiften', textEn: 'Unlimited parcels', included: true },
      { text: 'Satellitövervakning (Sentinel-2)', textEn: 'Satellite monitoring (Sentinel-2)', included: true },
      { text: 'Skogshälsopoäng', textEn: 'Forest health score', included: true },
      { text: 'AI-kompanjon (obegränsad)', textEn: 'AI companion (unlimited)', included: true },
      { text: 'Virkesmarknadsintelligens', textEn: 'Timber market intelligence', included: true },
      { text: 'Tidig varning & varningar', textEn: 'Early warning & alerts', included: true },
      { text: 'Fältläge (offline)', textEn: 'Field mode (offline)', included: true },
      { text: 'Prioriterad support', textEn: 'Priority support', included: true },
    ],
  },
  {
    name: 'Företag',
    nameEn: 'Enterprise',
    price: 'Offert',
    priceEn: 'Custom',
    period: '',
    periodEn: '',
    desc: 'För skogsföretag, kommuner och organisationer.',
    descEn: 'For forestry companies, municipalities and organizations.',
    cta: 'Kontakta oss',
    ctaEn: 'Contact Us',
    popular: false,
    features: [
      { text: 'Allt i Pro', textEn: 'Everything in Pro', included: true },
      { text: 'API-åtkomst & integrationer', textEn: 'API access & integrations', included: true },
      { text: 'SSO & teamhantering', textEn: 'SSO & team management', included: true },
      { text: 'Anpassade AI-modeller', textEn: 'Custom AI models', included: true },
      { text: 'Dedikerad kundansvarig', textEn: 'Dedicated account manager', included: true },
      { text: 'SLA & prioriterad support', textEn: 'SLA & priority support', included: true },
      { text: 'On-premise möjlighet', textEn: 'On-premise option', included: true },
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

/* ═══════════════════════════════════════════════════════
   COMPONENTS
   ═══════════════════════════════════════════════════════ */

/* ─── Navbar ─── */
function LandingNav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'glass shadow-lg shadow-black/20' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16 px-6">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group">
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
            className="text-sm text-[var(--green)] hover:text-[var(--green2)] transition-colors font-medium"
          >
            Logga in
          </Link>
          <Link
            to="/signup"
            className="px-5 py-2 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold transition-all hover:brightness-110 hover:scale-105"
          >
            Kom igång gratis
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-[var(--text3)] hover:text-[var(--green)]"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-[var(--border)] px-6 py-4 space-y-3 animate-in">
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
            <Link to="/login" className="text-sm text-[var(--green)] py-2 font-medium">
              Logga in
            </Link>
            <Link
              to="/signup"
              className="block text-center px-5 py-2.5 rounded-xl bg-[var(--green)] text-[var(--bg)] text-sm font-semibold"
            >
              Kom igång gratis
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

/* ─── Hero Section ─── */
function HeroSection() {
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
      {/* Parallax forest layers */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 landing-stars" />
        <div className="absolute bottom-0 left-0 right-0 h-[45%] landing-mountain-back" />
        <div className="absolute bottom-0 left-0 right-0 h-[35%] landing-forest-mid" />
        <div className="absolute bottom-0 left-0 right-0 h-[25%] landing-forest-front" />
        <div className="landing-satellite">
          <div className="landing-satellite-body">
            <div className="landing-satellite-panel landing-satellite-panel-left" />
            <div className="landing-satellite-core" />
            <div className="landing-satellite-panel landing-satellite-panel-right" />
          </div>
          <div className="landing-satellite-beam" />
        </div>
        <div className="landing-scan-line" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-transparent to-[var(--bg)]/60" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border2)] bg-[var(--bg2)]/80 backdrop-blur mb-8 animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            Nu i beta &middot; Now in beta
          </span>
        </div>

        <h1
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          <span className="text-gradient">AI-Powered</span>
          <br />
          <span className="text-[var(--text)]">Forest Intelligence</span>
        </h1>

        <p className="text-lg sm:text-xl md:text-2xl text-[var(--text2)] italic mb-2 min-h-[2em]" style={{ fontFamily: "'DM Serif Display', serif" }}>
          {typedText}
          {showCursor && <span className="landing-cursor">|</span>}
        </p>

        <p className="text-sm sm:text-base text-[var(--text3)] max-w-2xl mx-auto mb-10 leading-relaxed">
          BeetleSense kombinerar satellitbilder, drönarundersökningar och AI för att upptäcka
          granbarkborreangrepp tidigt, övervaka skogens hälsa och hjälpa dig fatta smartare skogsbeslut.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold text-base transition-all hover:brightness-110 hover:scale-105 glow-green"
          >
            Kom igång gratis
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border2)] text-[var(--green)] font-semibold text-base transition-all hover:bg-[var(--bg3)] hover:border-[var(--green)]"
          >
            <BookOpen className="w-5 h-5" />
            Boka demo
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

/* ─── Problem Statement ─── */
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

/* ─── Feature Showcase ─── */
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

/* ─── How It Works ─── */
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

/* ─── Role-based Benefits ─── */
function PersonaSection() {
  return (
    <section id="personas" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-mono text-[var(--green)] uppercase tracking-widest">
            För alla inom skogsbruk &middot; For everyone in forestry
          </span>
          <h2
            className="text-3xl sm:text-4xl font-bold text-[var(--text)] mt-3 mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            Byggd för din roll
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

/* ─── Stats / Social Proof ─── */
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

/* ─── Pricing ─── */
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
                  : 'border-[var(--border)] bg-[var(--bg2)]/60'
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

/* ─── Testimonials ─── */
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
        >
          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {TESTIMONIALS.map((t, idx) => (
                <div key={idx} className="w-full shrink-0 px-4">
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg2)]/60 p-8 text-center">
                    <div className="w-16 h-16 bg-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-xl font-bold text-white">{t.initials}</span>
                    </div>
                    <div className="flex justify-center gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-[var(--amber)] fill-current" />
                      ))}
                    </div>
                    <blockquote
                      className="text-lg text-[var(--text)] italic leading-relaxed mb-6"
                      style={{ fontFamily: "'DM Serif Display', serif" }}
                    >
                      &ldquo;{t.quote}&rdquo;
                    </blockquote>
                    <div>
                      <p className="font-semibold text-[var(--text)]">{t.name}</p>
                      <p className="text-sm text-[var(--text3)]">
                        {t.role} &mdash; {t.location}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mt-6">
            {TESTIMONIALS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActive(idx)}
                className={`h-2.5 rounded-full transition-all ${
                  idx === active ? 'bg-[var(--green)] w-8' : 'bg-[var(--text3)]/30 hover:bg-[var(--text3)] w-2.5'
                }`}
                aria-label={`Visa omdöme ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── FAQ ─── */
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

        <div className="space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={idx}
                className={`rounded-xl border transition-colors ${
                  isOpen ? 'border-[var(--green)]/30 bg-[var(--bg3)]' : 'border-[var(--border)] bg-[var(--bg2)]/40'
                }`}
              >
                <button
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm sm:text-base font-medium text-[var(--text)]">
                    {item.q}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-[var(--green)] shrink-0 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="px-5 pb-5 text-sm text-[var(--text3)] leading-relaxed">
                    {item.a}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─── CTA Footer ─── */
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

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold text-base transition-all hover:brightness-110 hover:scale-105"
            >
              Kom igång gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-[var(--border2)] text-[var(--green)] font-semibold text-base transition-all hover:bg-[var(--bg3)]"
            >
              Boka demo
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
              <form onSubmit={handleSubmit} className="flex gap-2">
                <div className="flex-1 relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text3)]" />
                  <input
                    type="email"
                    placeholder="din@email.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--bg)]/60 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text3)]/50 focus:outline-none focus:border-[var(--green)] transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold text-sm transition-all hover:brightness-110 flex items-center gap-2 shrink-0"
                >
                  <Send className="w-4 h-4" />
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

/* ─── Footer ─── */
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
              Org.nr: 559XXX-XXXX
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
              {['Blogg', 'Dokumentation', 'API', 'Community'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors">
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-semibold text-[var(--text)] mb-4">Juridiskt</h4>
            <ul className="space-y-2">
              {['Integritetspolicy', 'Användarvillkor', 'GDPR', 'Kontakt'].map((item) => (
                <li key={item}>
                  <a href="#" className="text-sm text-[var(--text3)] hover:text-[var(--green)] transition-colors">
                    {item}
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
            {['LinkedIn', 'GitHub', 'X'].map((social) => (
              <a
                key={social}
                href="#"
                className="w-8 h-8 rounded-lg bg-[var(--bg3)] border border-[var(--border)] flex items-center justify-center text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
                aria-label={social}
              >
                <span className="text-xs font-mono uppercase">{social[0]}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN LANDING PAGE
   ═══════════════════════════════════════════════════════ */

/* ─── Live Demo Map ─── */
function LiveDemoMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapRef.current || mapLoaded) return;

    import('maplibre-gl').then(({ default: maplibregl }) => {
      const map = new maplibregl.Map({
        container: mapRef.current!,
        style: {
          version: 8,
          name: 'BeetleSense Demo',
          sources: {
            satellite: {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              maxzoom: 18,
            },
          },
          layers: [
            { id: 'bg', type: 'background', paint: { 'background-color': '#030d05' } },
            { id: 'sat', type: 'raster', source: 'satellite', paint: { 'raster-brightness-max': 0.8, 'raster-brightness-min': 0.05, 'raster-saturation': -0.1 } },
          ],
        },
        center: [14.04, 57.19],
        zoom: 13,
        pitch: 45,
        bearing: -15,
        interactive: true,
        attributionControl: false,
      });

      map.on('load', () => {
        // Demo parcels
        const parcels = {
          type: 'FeatureCollection' as const,
          features: [
            { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[[14.02,57.195],[14.06,57.195],[14.06,57.21],[14.02,57.21],[14.02,57.195]]] }, properties: { name: 'Norra Skogen', health: 72, risk: 'active', color: '#f97316' } },
            { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[[14.10,57.22],[14.14,57.22],[14.14,57.235],[14.10,57.235],[14.10,57.22]]] }, properties: { name: 'Granudden', health: 91, risk: 'none', color: '#22c55e' } },
            { type: 'Feature' as const, geometry: { type: 'Polygon' as const, coordinates: [[[13.50,57.29],[13.56,57.29],[13.56,57.31],[13.50,57.31],[13.50,57.29]]] }, properties: { name: 'Ekbacken', health: 85, risk: 'none', color: '#22c55e' } },
          ],
        };

        map.addSource('parcels', { type: 'geojson', data: parcels });
        map.addLayer({ id: 'parcel-fill', type: 'fill', source: 'parcels', paint: { 'fill-color': ['get', 'color'], 'fill-opacity': 0.25 } });
        map.addLayer({ id: 'parcel-border', type: 'line', source: 'parcels', paint: { 'line-color': ['get', 'color'], 'line-width': 2, 'line-opacity': 0.8 } });

        // Risk zones
        const riskZones = {
          type: 'FeatureCollection' as const,
          features: [
            { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [14.04, 57.20] }, properties: { severity: 'active', label: 'Barkborre detekterad', score: 0.72 } },
            { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [14.03, 57.198] }, properties: { severity: 'early', label: 'Tidig stress', score: 0.35 } },
          ],
        };

        map.addSource('risks', { type: 'geojson', data: riskZones });
        map.addLayer({ id: 'risk-circles', type: 'circle', source: 'risks', paint: {
          'circle-radius': 20, 'circle-color': ['case', ['==', ['get', 'severity'], 'active'], '#ef4444', '#f59e0b'],
          'circle-opacity': 0.5, 'circle-stroke-width': 2, 'circle-stroke-color': ['case', ['==', ['get', 'severity'], 'active'], '#ef4444', '#f59e0b'],
        }});

        // Animate a slow rotation
        let bearing = -15;
        const rotate = () => {
          bearing += 0.03;
          map.setBearing(bearing);
          requestAnimationFrame(rotate);
        };
        rotate();

        setMapLoaded(true);
      });

      return () => map.remove();
    });
  }, [mapLoaded]);

  return (
    <section className="relative py-0">
      {/* Map container */}
      <div className="relative h-[500px] md:h-[600px] overflow-hidden">
        <div ref={mapRef} className="absolute inset-0" />

        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg)] via-transparent to-[var(--bg)] pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)]/80 via-transparent to-transparent pointer-events-none" />

        {/* Info overlay */}
        <div className="absolute left-6 md:left-12 top-1/2 -translate-y-1/2 max-w-md z-10">
          <div className="rounded-2xl border border-[var(--green)]/20 bg-[var(--bg)]/90 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-mono text-[var(--green)] uppercase tracking-wider">Live skogsövervakning</span>
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
                { label: 'Hälsa', color: '#22c55e' },
                { label: 'Barkborre', color: '#f59e0b' },
                { label: 'Väder', color: '#22c55e' },
                { label: 'Tillväxt', color: '#22c55e' },
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

        {/* Floating data cards on the right */}
        <div className="absolute right-6 md:right-12 top-1/4 z-10 hidden md:flex flex-col gap-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm px-4 py-3 shadow-lg">
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Trädröntgen</div>
            <div className="text-lg font-mono font-bold text-[var(--green)]">14,200</div>
            <div className="text-[10px] text-[var(--text3)]">träd analyserade</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm px-4 py-3 shadow-lg">
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Barkborrerisk</div>
            <div className="text-lg font-mono font-bold text-amber-400">23</div>
            <div className="text-[10px] text-[var(--text3)]">träd under attack</div>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg)]/80 backdrop-blur-sm px-4 py-3 shadow-lg">
            <div className="text-[10px] text-[var(--text3)] uppercase tracking-wider mb-1">Skyddad virkesvärde</div>
            <div className="text-lg font-mono font-bold text-[var(--text)]">2.4M kr</div>
            <div className="text-[10px] text-[var(--text3)]">tack vare tidig detektion</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)]" style={{ scrollBehavior: 'smooth' }}>
      <LandingNav />
      <HeroSection />
      <LiveDemoMap />
      <ProblemSection />
      <FeatureShowcase />
      <HowItWorks />
      <PersonaSection />
      <StatsSection />
      <PricingSection />
      <TestimonialSection />
      <FAQSection />
      <CTAFooter />
      <Footer />
    </div>
  );
}

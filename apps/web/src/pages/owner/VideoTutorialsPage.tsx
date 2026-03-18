import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Play,
  Clock,
  Award,
  BookOpen,
  ChevronRight,
  Check,
  Video,
  Bookmark,
  X,
  Search,
  SkipForward,
  SkipBack,
  StickyNote,
  ListChecks,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type Category =
  | 'getting-started'
  | 'drone-ops'
  | 'map-analysis'
  | 'ai-companion'
  | 'reports-export'
  | 'advanced';

type Difficulty = 'beginner' | 'intermediate' | 'advanced';

interface Chapter {
  time: string;
  label: string;
}

interface DemoVideo {
  id: string;
  title: string;
  description: string;
  category: Category;
  difficulty: Difficulty;
  durationSeconds: number;
  durationLabel: string;
  chapters: Chapter[];
}

interface LearningPath {
  id: string;
  title: string;
  description: string;
  videoIds: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES: { key: Category | 'all'; label: string }[] = [
  { key: 'all', label: 'Alla' },
  { key: 'getting-started', label: 'Komma igång' },
  { key: 'drone-ops', label: 'Drönare' },
  { key: 'map-analysis', label: 'Karta & Analys' },
  { key: 'ai-companion', label: 'AI-kompanjon' },
  { key: 'reports-export', label: 'Rapporter & Export' },
  { key: 'advanced', label: 'Avancerat' },
];

const CATEGORY_GRADIENTS: Record<Category, string> = {
  'getting-started': 'from-emerald-700 to-green-500',
  'drone-ops': 'from-cyan-700 to-teal-500',
  'map-analysis': 'from-lime-700 to-emerald-500',
  'ai-companion': 'from-violet-700 to-purple-500',
  'reports-export': 'from-amber-700 to-yellow-500',
  advanced: 'from-rose-700 to-orange-500',
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Nybörjare',
  intermediate: 'Medel',
  advanced: 'Avancerad',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: 'bg-green-800/60 text-green-300',
  intermediate: 'bg-amber-800/60 text-amber-300',
  advanced: 'bg-rose-800/60 text-rose-300',
};

/* ------------------------------------------------------------------ */
/*  Demo video data (30 videos)                                        */
/* ------------------------------------------------------------------ */

const VIDEOS: DemoVideo[] = [
  // --- Getting Started (5) ---
  {
    id: 'gs-01',
    title: 'Skapa ditt BeetleSense-konto',
    description: 'Steg-för-steg guide för kontoregistrering, profiluppgifter och första inloggning.',
    category: 'getting-started',
    difficulty: 'beginner',
    durationSeconds: 245,
    durationLabel: '4:05',
    chapters: [
      { time: '0:00', label: 'Introduktion' },
      { time: '0:45', label: 'Registrering' },
      { time: '2:10', label: 'Profilinställningar' },
      { time: '3:30', label: 'Översikt av gränssnittet' },
    ],
  },
  {
    id: 'gs-02',
    title: 'Registrera ditt första skifte',
    description: 'Lägg till skiften via kartan eller Lantmäteriets fastighetsdata.',
    category: 'getting-started',
    difficulty: 'beginner',
    durationSeconds: 372,
    durationLabel: '6:12',
    chapters: [
      { time: '0:00', label: 'Öppna skifteshanteraren' },
      { time: '1:30', label: 'Importera från Lantmäteriet' },
      { time: '3:00', label: 'Rita manuellt på kartan' },
      { time: '5:00', label: 'Spara och bekräfta' },
    ],
  },
  {
    id: 'gs-03',
    title: 'Din första inventering',
    description: 'Beställ din första dröneinventering och förstå arbetsflödet.',
    category: 'getting-started',
    difficulty: 'beginner',
    durationSeconds: 310,
    durationLabel: '5:10',
    chapters: [
      { time: '0:00', label: 'Vad är en inventering?' },
      { time: '1:20', label: 'Beställ inventering' },
      { time: '3:00', label: 'Status och notifieringar' },
      { time: '4:20', label: 'Resultat och nästa steg' },
    ],
  },
  {
    id: 'gs-04',
    title: 'Navigera i dashboarden',
    description: 'Översikt av alla widgets, snabbval och anpassning av startsidan.',
    category: 'getting-started',
    difficulty: 'beginner',
    durationSeconds: 275,
    durationLabel: '4:35',
    chapters: [
      { time: '0:00', label: 'Dashboardöversikt' },
      { time: '1:15', label: 'Widgets och kort' },
      { time: '2:40', label: 'Anpassa layout' },
      { time: '3:50', label: 'Snabbåtgärder' },
    ],
  },
  {
    id: 'gs-05',
    title: 'Notifieringar och varningar',
    description: 'Konfigurera push-notiser, e-postlarm och tröskelgränser.',
    category: 'getting-started',
    difficulty: 'beginner',
    durationSeconds: 198,
    durationLabel: '3:18',
    chapters: [
      { time: '0:00', label: 'Notifieringscenter' },
      { time: '1:00', label: 'Push-inställningar' },
      { time: '2:00', label: 'E-postvarningar' },
      { time: '2:45', label: 'Anpassade trösklar' },
    ],
  },
  // --- Drone Operations (5) ---
  {
    id: 'dr-01',
    title: 'Planera en drönflygning',
    description: 'Skapa flygplan med waypoints, höjd, överlapp och säkerhetszoner.',
    category: 'drone-ops',
    difficulty: 'intermediate',
    durationSeconds: 432,
    durationLabel: '7:12',
    chapters: [
      { time: '0:00', label: 'Flygplanering grundläggande' },
      { time: '1:45', label: 'Waypoints och rutt' },
      { time: '3:30', label: 'Höjd och överlapp' },
      { time: '5:20', label: 'Säkerhetszoner' },
      { time: '6:30', label: 'Spara och exportera plan' },
    ],
  },
  {
    id: 'dr-02',
    title: 'Ladda upp drönardata',
    description: 'Importera bilder och metadata efter avslutad flygning.',
    category: 'drone-ops',
    difficulty: 'beginner',
    durationSeconds: 295,
    durationLabel: '4:55',
    chapters: [
      { time: '0:00', label: 'Anslut enheten' },
      { time: '1:10', label: 'Välj filer' },
      { time: '2:30', label: 'Ladda upp och validera' },
      { time: '4:00', label: 'Bearbetningskö' },
    ],
  },
  {
    id: 'dr-03',
    title: 'Kamerakalibrering',
    description: 'Kalibrera multispektralkameran för NDVI-analys.',
    category: 'drone-ops',
    difficulty: 'advanced',
    durationSeconds: 520,
    durationLabel: '8:40',
    chapters: [
      { time: '0:00', label: 'Varför kalibrering?' },
      { time: '2:00', label: 'Referenspanel' },
      { time: '4:10', label: 'Mjukvaruinställningar' },
      { time: '6:30', label: 'Verifiering' },
    ],
  },
  {
    id: 'dr-04',
    title: 'Automatiska flygmönster',
    description: 'Använd fördefinierade mönster för effektiv täckning av stora skiften.',
    category: 'drone-ops',
    difficulty: 'intermediate',
    durationSeconds: 365,
    durationLabel: '6:05',
    chapters: [
      { time: '0:00', label: 'Mönstertyper' },
      { time: '1:40', label: 'Grid-flygning' },
      { time: '3:10', label: 'Spiralmönster' },
      { time: '4:45', label: 'Terrängföljning' },
    ],
  },
  {
    id: 'dr-05',
    title: 'Väderplanering för flygning',
    description: 'Kontrollera SMHI-data och förstå optimala flygförhållanden.',
    category: 'drone-ops',
    difficulty: 'beginner',
    durationSeconds: 215,
    durationLabel: '3:35',
    chapters: [
      { time: '0:00', label: 'Väderöversikt' },
      { time: '1:00', label: 'Vind och regn' },
      { time: '2:10', label: 'Ljusförhållanden' },
      { time: '3:00', label: 'Rekommendationer' },
    ],
  },
  // --- Map & Analysis (5) ---
  {
    id: 'ma-01',
    title: 'Kartnavigering och lager',
    description: 'Byt mellan kartlager, zoom till skiften och använd mätverktyg.',
    category: 'map-analysis',
    difficulty: 'beginner',
    durationSeconds: 340,
    durationLabel: '5:40',
    chapters: [
      { time: '0:00', label: 'Kartöversikt' },
      { time: '1:30', label: 'Kartlager' },
      { time: '3:00', label: 'Mätverktyg' },
      { time: '4:30', label: 'Bokmärken' },
    ],
  },
  {
    id: 'ma-02',
    title: 'Förstå NDVI-resultat',
    description: 'Tolka vegetationsindex och identifiera stressade områden.',
    category: 'map-analysis',
    difficulty: 'intermediate',
    durationSeconds: 485,
    durationLabel: '8:05',
    chapters: [
      { time: '0:00', label: 'Vad är NDVI?' },
      { time: '2:00', label: 'Färgskala' },
      { time: '4:00', label: 'Identifiera stress' },
      { time: '6:00', label: 'Jämföra perioder' },
      { time: '7:20', label: 'Exportera resultat' },
    ],
  },
  {
    id: 'ma-03',
    title: 'Hälsopoäng och trender',
    description: 'Använd BeetleSense hälsoindex för att följa skogens tillstånd.',
    category: 'map-analysis',
    difficulty: 'intermediate',
    durationSeconds: 390,
    durationLabel: '6:30',
    chapters: [
      { time: '0:00', label: 'Hälsoindex förklarat' },
      { time: '1:45', label: 'Poängsättning' },
      { time: '3:30', label: 'Trendanalys' },
      { time: '5:00', label: 'Varningsgränser' },
    ],
  },
  {
    id: 'ma-04',
    title: 'Satellitjämförelse',
    description: 'Jämför drönardata med Sentinel-2 satellitbilder för bredare perspektiv.',
    category: 'map-analysis',
    difficulty: 'intermediate',
    durationSeconds: 420,
    durationLabel: '7:00',
    chapters: [
      { time: '0:00', label: 'Satellitdata vs drönardata' },
      { time: '2:00', label: 'Tidsserie' },
      { time: '4:00', label: 'Fusionsanalys' },
      { time: '5:45', label: 'Praktiska tillämpningar' },
    ],
  },
  {
    id: 'ma-05',
    title: 'Barkborredetektion på kartan',
    description: 'Lokalisera och klassificera granbarkborreangrepp med AI-stöd.',
    category: 'map-analysis',
    difficulty: 'advanced',
    durationSeconds: 540,
    durationLabel: '9:00',
    chapters: [
      { time: '0:00', label: 'Detektionsmodellen' },
      { time: '2:30', label: 'Faser av angrepp' },
      { time: '4:30', label: 'Kartering av hotspots' },
      { time: '6:30', label: 'Handlingsrekommendationer' },
      { time: '8:00', label: 'Rapportera till Skogsstyrelsen' },
    ],
  },
  // --- AI Companion (5) ---
  {
    id: 'ai-01',
    title: 'Introduktion till AI-kompanjonen',
    description: 'Börja chatta med din skogsrådgivare — vad kan den hjälpa till med?',
    category: 'ai-companion',
    difficulty: 'beginner',
    durationSeconds: 272,
    durationLabel: '4:32',
    chapters: [
      { time: '0:00', label: 'Vad är AI-kompanjonen?' },
      { time: '1:15', label: 'Starta en konversation' },
      { time: '2:30', label: 'Typ av frågor' },
      { time: '3:45', label: 'Tips för bästa resultat' },
    ],
  },
  {
    id: 'ai-02',
    title: 'Prompttips för skogsägare',
    description: 'Formulera effektiva frågor för att få specifika och användbara svar.',
    category: 'ai-companion',
    difficulty: 'intermediate',
    durationSeconds: 355,
    durationLabel: '5:55',
    chapters: [
      { time: '0:00', label: 'Grundprinciper' },
      { time: '1:30', label: 'Specifika frågor' },
      { time: '3:00', label: 'Kontext och data' },
      { time: '4:30', label: 'Uppföljningsfrågor' },
    ],
  },
  {
    id: 'ai-03',
    title: 'AI-analys av drönarbilder',
    description: 'Låt AI-kompanjonen tolka dina drönarbilder och ge rekommendationer.',
    category: 'ai-companion',
    difficulty: 'intermediate',
    durationSeconds: 410,
    durationLabel: '6:50',
    chapters: [
      { time: '0:00', label: 'Ladda upp bild i chatten' },
      { time: '1:45', label: 'AI-tolkning' },
      { time: '3:30', label: 'Fråga vidare' },
      { time: '5:10', label: 'Spara rekommendationer' },
    ],
  },
  {
    id: 'ai-04',
    title: 'Skogsrådgivning med AI',
    description: 'Använd AI för skötselråd, röjning, gallring och slutavverkning.',
    category: 'ai-companion',
    difficulty: 'intermediate',
    durationSeconds: 475,
    durationLabel: '7:55',
    chapters: [
      { time: '0:00', label: 'Skötselplanering' },
      { time: '2:00', label: 'Röjningsråd' },
      { time: '3:45', label: 'Gallringsoptimering' },
      { time: '5:30', label: 'Slutavverkning' },
      { time: '7:00', label: 'Sammanfattning' },
    ],
  },
  {
    id: 'ai-05',
    title: 'AI och regelefterlevnad',
    description: 'Fråga AI om Skogsvårdslagens krav, certifiering och avverkningsanmälan.',
    category: 'ai-companion',
    difficulty: 'advanced',
    durationSeconds: 380,
    durationLabel: '6:20',
    chapters: [
      { time: '0:00', label: 'Skogsvårdslagen' },
      { time: '1:40', label: 'FSC/PEFC-certifiering' },
      { time: '3:20', label: 'Avverkningsanmälan' },
      { time: '5:00', label: 'Rapportmallar' },
    ],
  },
  // --- Reports & Export (5) ---
  {
    id: 're-01',
    title: 'Generera skogsbruksplan',
    description: 'Skapa en komplett skogsbruksplan med alla bestånd och åtgärdsförslag.',
    category: 'reports-export',
    difficulty: 'intermediate',
    durationSeconds: 445,
    durationLabel: '7:25',
    chapters: [
      { time: '0:00', label: 'Vad ingår?' },
      { time: '1:50', label: 'Välj skiften' },
      { time: '3:30', label: 'Generera rapport' },
      { time: '5:10', label: 'Granska resultat' },
      { time: '6:30', label: 'Redigera och spara' },
    ],
  },
  {
    id: 're-02',
    title: 'Exportera data som CSV/GeoJSON',
    description: 'Ladda ner rådata för egna analyser i GIS-programvara.',
    category: 'reports-export',
    difficulty: 'intermediate',
    durationSeconds: 260,
    durationLabel: '4:20',
    chapters: [
      { time: '0:00', label: 'Exportalternativ' },
      { time: '1:10', label: 'CSV-export' },
      { time: '2:20', label: 'GeoJSON/Shapefile' },
      { time: '3:30', label: 'Öppna i QGIS' },
    ],
  },
  {
    id: 're-03',
    title: 'Skapa PDF-rapport',
    description: 'Designa professionella PDF-rapporter med kartor, diagram och tabeller.',
    category: 'reports-export',
    difficulty: 'beginner',
    durationSeconds: 315,
    durationLabel: '5:15',
    chapters: [
      { time: '0:00', label: 'Rapportmall' },
      { time: '1:20', label: 'Välj innehåll' },
      { time: '2:40', label: 'Anpassa utseende' },
      { time: '4:00', label: 'Ladda ner PDF' },
    ],
  },
  {
    id: 're-04',
    title: 'Dela rapporter med rådgivare',
    description: 'Skicka rapporter till skogskonsulter, banker eller myndigheter.',
    category: 'reports-export',
    difficulty: 'beginner',
    durationSeconds: 188,
    durationLabel: '3:08',
    chapters: [
      { time: '0:00', label: 'Delningsfunktioner' },
      { time: '0:55', label: 'Länk eller bilaga' },
      { time: '1:50', label: 'Behörigheter' },
      { time: '2:40', label: 'Spårning' },
    ],
  },
  {
    id: 're-05',
    title: 'Automatiska rapporter och schemaläggning',
    description: 'Ställ in månatliga eller kvartalsvisa automatiska rapporter.',
    category: 'reports-export',
    difficulty: 'intermediate',
    durationSeconds: 285,
    durationLabel: '4:45',
    chapters: [
      { time: '0:00', label: 'Automatisering' },
      { time: '1:20', label: 'Schema' },
      { time: '2:30', label: 'Mottagare' },
      { time: '3:40', label: 'Villkor och filter' },
    ],
  },
  // --- Advanced Features (5) ---
  {
    id: 'av-01',
    title: 'Tillväxtmodeller och prognoser',
    description: 'Simulera framtida virkesvolymer och tillväxt med BeetleSense modeller.',
    category: 'advanced',
    difficulty: 'advanced',
    durationSeconds: 560,
    durationLabel: '9:20',
    chapters: [
      { time: '0:00', label: 'Modellöversikt' },
      { time: '2:15', label: 'Indata och parametrar' },
      { time: '4:30', label: 'Simulering' },
      { time: '6:45', label: 'Tolka resultat' },
      { time: '8:30', label: 'Scenariojämförelse' },
    ],
  },
  {
    id: 'av-02',
    title: 'Timmermarknaden i realtid',
    description: 'Följ virkespriser, hitta köpare och optimera försäljningstidpunkt.',
    category: 'advanced',
    difficulty: 'intermediate',
    durationSeconds: 395,
    durationLabel: '6:35',
    chapters: [
      { time: '0:00', label: 'Marknadspanel' },
      { time: '1:40', label: 'Prishistorik' },
      { time: '3:20', label: 'Köpare i närheten' },
      { time: '5:00', label: 'Optimera tidpunkt' },
    ],
  },
  {
    id: 'av-03',
    title: 'Kolkreditskalkylatorn',
    description: 'Beräkna koldioxidbindning och utforska potentiella kolkrediter.',
    category: 'advanced',
    difficulty: 'advanced',
    durationSeconds: 480,
    durationLabel: '8:00',
    chapters: [
      { time: '0:00', label: 'Kolbindning i skog' },
      { time: '2:00', label: 'Kalkylatorn' },
      { time: '4:00', label: 'Certifieringskrav' },
      { time: '6:00', label: 'Intäktsprognoser' },
    ],
  },
  {
    id: 'av-04',
    title: 'Stormriskanalys',
    description: 'Identifiera vindutsatta bestånd och planera förebyggande åtgärder.',
    category: 'advanced',
    difficulty: 'advanced',
    durationSeconds: 425,
    durationLabel: '7:05',
    chapters: [
      { time: '0:00', label: 'Riskfaktorer' },
      { time: '1:50', label: 'Riskkartan' },
      { time: '3:40', label: 'Historiska stormar' },
      { time: '5:20', label: 'Åtgärdsplan' },
    ],
  },
  {
    id: 'av-05',
    title: 'API och integrationer',
    description: 'Koppla BeetleSense till andra system via REST API och webhooks.',
    category: 'advanced',
    difficulty: 'advanced',
    durationSeconds: 510,
    durationLabel: '8:30',
    chapters: [
      { time: '0:00', label: 'API-översikt' },
      { time: '2:00', label: 'Autentisering' },
      { time: '3:45', label: 'Endpoints' },
      { time: '5:30', label: 'Webhooks' },
      { time: '7:00', label: 'Exempel: Excel-integration' },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Learning paths                                                     */
/* ------------------------------------------------------------------ */

const LEARNING_PATHS: LearningPath[] = [
  {
    id: 'path-new-owner',
    title: 'Ny skogsägare',
    description: 'Perfekt startpaket för nya användare — lär dig grunderna på under en timme.',
    videoIds: ['gs-01', 'gs-02', 'gs-03', 'gs-04', 'ma-01', 're-03'],
  },
  {
    id: 'path-drone-pilot',
    title: 'Drönarpilot',
    description: 'Allt du behöver för att flyga, ladda upp och bearbeta drönardata.',
    videoIds: ['dr-01', 'dr-02', 'dr-04', 'dr-05', 'dr-03'],
  },
  {
    id: 'path-advanced-analysis',
    title: 'Avancerad analys',
    description: 'Fördjupa dig i NDVI-tolkning, tillväxtmodeller och marknadsanalys.',
    videoIds: ['ma-02', 'ma-05', 'av-01', 'av-03'],
  },
];

/* ------------------------------------------------------------------ */
/*  localStorage helpers                                               */
/* ------------------------------------------------------------------ */

const LS_PROGRESS = 'beetlesense_video_progress';
const LS_NOTES = 'beetlesense_video_notes';
const LS_BOOKMARKS = 'beetlesense_video_bookmarks';

interface VideoProgress {
  /** 0-100 */
  percent: number;
  completed: boolean;
}

function loadProgress(): Record<string, VideoProgress> {
  try {
    return JSON.parse(localStorage.getItem(LS_PROGRESS) || '{}');
  } catch {
    return {};
  }
}

function saveProgress(p: Record<string, VideoProgress>) {
  localStorage.setItem(LS_PROGRESS, JSON.stringify(p));
}

function loadNotes(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_NOTES) || '{}');
  } catch {
    return {};
  }
}

function saveNotes(n: Record<string, string>) {
  localStorage.setItem(LS_NOTES, JSON.stringify(n));
}

function loadBookmarks(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_BOOKMARKS) || '[]');
  } catch {
    return [];
  }
}

function saveBookmarks(b: string[]) {
  localStorage.setItem(LS_BOOKMARKS, JSON.stringify(b));
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

/**
 * VideoTutorialsPage — Comprehensive video learning center for BeetleSense.
 *
 * Route: /owner/video-tutorials
 */
export default function VideoTutorialsPage() {
  const [activeCategory, setActiveCategory] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'videos' | 'paths'>('videos');
  const [selectedVideo, setSelectedVideo] = useState<DemoVideo | null>(null);
  const [progress, setProgress] = useState<Record<string, VideoProgress>>(loadProgress);
  const [notes, setNotes] = useState<Record<string, string>>(loadNotes);
  const [bookmarks, setBookmarks] = useState<string[]>(loadBookmarks);

  // Persist to localStorage
  useEffect(() => saveProgress(progress), [progress]);
  useEffect(() => saveNotes(notes), [notes]);
  useEffect(() => saveBookmarks(bookmarks), [bookmarks]);

  // Filtered videos
  const filteredVideos = useMemo(() => {
    return VIDEOS.filter((v) => {
      if (activeCategory !== 'all' && v.category !== activeCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (
          !v.title.toLowerCase().includes(q) &&
          !v.description.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [activeCategory, searchQuery]);

  // Stats
  const totalDuration = VIDEOS.reduce((s, v) => s + v.durationSeconds, 0);
  const totalHours = Math.floor(totalDuration / 3600);
  const totalMinutes = Math.round((totalDuration % 3600) / 60);
  const completedCount = Object.values(progress).filter((p) => p.completed).length;

  // Video navigation within filtered list
  const currentIndex = selectedVideo
    ? VIDEOS.findIndex((v) => v.id === selectedVideo.id)
    : -1;

  const prevVideo = currentIndex > 0 ? VIDEOS[currentIndex - 1] : null;
  const nextVideo = currentIndex < VIDEOS.length - 1 ? VIDEOS[currentIndex + 1] : null;

  const handleMarkComplete = useCallback(
    (id: string) => {
      setProgress((prev) => ({
        ...prev,
        [id]: { percent: 100, completed: true },
      }));
    },
    [],
  );

  const handleToggleBookmark = useCallback(
    (id: string) => {
      setBookmarks((prev) =>
        prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
      );
    },
    [],
  );

  const handleUpdateNote = useCallback((id: string, text: string) => {
    setNotes((prev) => ({ ...prev, [id]: text }));
  }, []);

  const handleSimulateProgress = useCallback((id: string) => {
    setProgress((prev) => {
      const cur = prev[id]?.percent ?? 0;
      const next = Math.min(cur + 25, 100);
      return {
        ...prev,
        [id]: { percent: next, completed: next >= 100 },
      };
    });
  }, []);

  return (
    <div className="min-h-screen p-5 max-w-7xl mx-auto">
      {/* ===== Hero ===== */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#4ade8018', color: '#4ade80' }}
          >
            <Video size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Lär dig BeetleSense</h1>
            <p className="text-sm text-gray-400">
              Videotutorials för skogsägare, piloter och analytiker
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mt-4">
          <StatBadge icon={<Video size={15} />} label="Videor" value={String(VIDEOS.length)} />
          <StatBadge
            icon={<Clock size={15} />}
            label="Total tid"
            value={`${totalHours}h ${totalMinutes}m`}
          />
          <StatBadge
            icon={<Check size={15} />}
            label="Avklarade"
            value={`${completedCount}/${VIDEOS.length}`}
          />
          <StatBadge
            icon={<Bookmark size={15} />}
            label="Sparade"
            value={String(bookmarks.length)}
          />
        </div>
      </div>

      {/* ===== Tab switcher: Videos / Learning Paths ===== */}
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setActiveTab('videos')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'videos'
              ? 'bg-green-800/50 text-green-300 border border-green-700/60'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <Video size={16} />
          Alla videor
        </button>
        <button
          onClick={() => setActiveTab('paths')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'paths'
              ? 'bg-green-800/50 text-green-300 border border-green-700/60'
              : 'text-gray-400 hover:text-gray-200 border border-transparent'
          }`}
        >
          <ListChecks size={16} />
          Lärstigar
        </button>
      </div>

      {/* ===== Videos tab ===== */}
      {activeTab === 'videos' && (
        <>
          {/* Search bar */}
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Sök bland videor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-green-700/60"
            />
          </div>

          {/* Category tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {CATEGORIES.map((cat) => {
              const count =
                cat.key === 'all'
                  ? VIDEOS.length
                  : VIDEOS.filter((v) => v.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-green-700/50 text-green-200 border border-green-600/50'
                      : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Video grid */}
          {filteredVideos.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <Video size={40} className="mx-auto mb-3 opacity-40" />
              <p>Inga videor matchar din sökning.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVideos.map((video) => (
                <VideoCard
                  key={video.id}
                  video={video}
                  progress={progress[video.id]}
                  isBookmarked={bookmarks.includes(video.id)}
                  onPlay={() => setSelectedVideo(video)}
                  onBookmark={() => handleToggleBookmark(video.id)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ===== Learning paths tab ===== */}
      {activeTab === 'paths' && (
        <div className="space-y-5">
          {LEARNING_PATHS.map((path) => (
            <LearningPathCard
              key={path.id}
              path={path}
              progress={progress}
              onPlayVideo={(id) => {
                const v = VIDEOS.find((v) => v.id === id);
                if (v) setSelectedVideo(v);
              }}
            />
          ))}
        </div>
      )}

      {/* ===== Video player modal ===== */}
      {selectedVideo && (
        <VideoPlayerModal
          video={selectedVideo}
          progress={progress[selectedVideo.id]}
          note={notes[selectedVideo.id] ?? ''}
          isBookmarked={bookmarks.includes(selectedVideo.id)}
          prevVideo={prevVideo}
          nextVideo={nextVideo}
          onClose={() => setSelectedVideo(null)}
          onMarkComplete={() => handleMarkComplete(selectedVideo.id)}
          onSimulateProgress={() => handleSimulateProgress(selectedVideo.id)}
          onBookmark={() => handleToggleBookmark(selectedVideo.id)}
          onUpdateNote={(text) => handleUpdateNote(selectedVideo.id, text)}
          onNavigate={(v) => setSelectedVideo(v)}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function StatBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm">
      <span className="text-green-400">{icon}</span>
      <span className="text-gray-400">{label}:</span>
      <span className="text-white font-medium">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VideoCard                                                          */
/* ------------------------------------------------------------------ */

function VideoCard({
  video,
  progress,
  isBookmarked,
  onPlay,
  onBookmark,
}: {
  video: DemoVideo;
  progress?: VideoProgress;
  isBookmarked: boolean;
  onPlay: () => void;
  onBookmark: () => void;
}) {
  const pct = progress?.percent ?? 0;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden hover:border-green-700/50 transition-colors group">
      {/* Thumbnail */}
      <button
        onClick={onPlay}
        className={`relative w-full aspect-video bg-gradient-to-br ${CATEGORY_GRADIENTS[video.category]} flex items-center justify-center cursor-pointer`}
      >
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />
        <div className="relative z-10 w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play size={28} className="text-white ml-1" fill="white" />
        </div>
        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-xs font-mono text-white">
          {video.durationLabel}
        </span>
        {/* Completed badge */}
        {progress?.completed && (
          <span className="absolute top-2 left-2 px-2 py-0.5 rounded bg-green-600/90 text-xs text-white flex items-center gap-1">
            <Check size={12} /> Klar
          </span>
        )}
      </button>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3
            className="text-sm font-semibold text-gray-100 line-clamp-2 cursor-pointer hover:text-green-300 transition-colors"
            onClick={onPlay}
          >
            {video.title}
          </h3>
          <button
            onClick={onBookmark}
            className="shrink-0 mt-0.5"
            title={isBookmarked ? 'Ta bort bokmärke' : 'Spara'}
          >
            <Bookmark
              size={16}
              className={
                isBookmarked
                  ? 'text-green-400 fill-green-400'
                  : 'text-gray-600 hover:text-gray-400'
              }
            />
          </button>
        </div>
        <p className="text-xs text-gray-500 line-clamp-2 mb-2">{video.description}</p>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${DIFFICULTY_COLORS[video.difficulty]}`}
          >
            {DIFFICULTY_LABELS[video.difficulty]}
          </span>
          <span className="text-[10px] text-gray-600">
            {CATEGORIES.find((c) => c.key === video.category)?.label}
          </span>
        </div>

        {/* Progress bar */}
        {pct > 0 && (
          <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  LearningPathCard                                                   */
/* ------------------------------------------------------------------ */

function LearningPathCard({
  path,
  progress,
  onPlayVideo,
}: {
  path: LearningPath;
  progress: Record<string, VideoProgress>;
  onPlayVideo: (id: string) => void;
}) {
  const completedInPath = path.videoIds.filter((id) => progress[id]?.completed).length;
  const totalInPath = path.videoIds.length;
  const pct = Math.round((completedInPath / totalInPath) * 100);
  const totalSeconds = path.videoIds.reduce((s, id) => {
    const v = VIDEOS.find((v) => v.id === id);
    return s + (v?.durationSeconds ?? 0);
  }, 0);
  const mins = Math.round(totalSeconds / 60);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen size={18} className="text-green-400" />
            <h3 className="text-lg font-semibold text-white">{path.title}</h3>
          </div>
          <p className="text-sm text-gray-400">{path.description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-medium text-white">
            {completedInPath}/{totalInPath}
          </div>
          <div className="text-xs text-gray-500">~{mins} min</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full bg-white/10 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-green-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Video list */}
      <div className="space-y-2">
        {path.videoIds.map((id, idx) => {
          const video = VIDEOS.find((v) => v.id === id);
          if (!video) return null;
          const done = progress[id]?.completed;
          return (
            <button
              key={id}
              onClick={() => onPlayVideo(id)}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
                  done
                    ? 'bg-green-600 text-white'
                    : 'bg-white/10 text-gray-400'
                }`}
              >
                {done ? <Check size={14} /> : idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm truncate ${done ? 'text-gray-400 line-through' : 'text-gray-200'}`}
                >
                  {video.title}
                </p>
              </div>
              <span className="text-xs text-gray-600 font-mono shrink-0">
                {video.durationLabel}
              </span>
              <ChevronRight size={14} className="text-gray-600 shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  VideoPlayerModal                                                   */
/* ------------------------------------------------------------------ */

function VideoPlayerModal({
  video,
  progress,
  note,
  isBookmarked,
  prevVideo,
  nextVideo,
  onClose,
  onMarkComplete,
  onSimulateProgress,
  onBookmark,
  onUpdateNote,
  onNavigate,
}: {
  video: DemoVideo;
  progress?: VideoProgress;
  note: string;
  isBookmarked: boolean;
  prevVideo: DemoVideo | null;
  nextVideo: DemoVideo | null;
  onClose: () => void;
  onMarkComplete: () => void;
  onSimulateProgress: () => void;
  onBookmark: () => void;
  onUpdateNote: (text: string) => void;
  onNavigate: (video: DemoVideo) => void;
}) {
  const pct = progress?.percent ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1a0d] shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <X size={16} className="text-gray-300" />
        </button>

        {/* Video player placeholder */}
        <div
          className={`w-full aspect-video bg-gradient-to-br ${CATEGORY_GRADIENTS[video.category]} relative flex items-center justify-center`}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 text-center">
            <button
              onClick={onSimulateProgress}
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors mx-auto mb-3"
            >
              <Play size={40} className="text-white ml-1.5" fill="white" />
            </button>
            <p className="text-white/60 text-sm">Klicka för att simulera uppspelning</p>
          </div>

          {/* Progress bar overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">{video.title}</h2>
              <p className="text-sm text-gray-400">{video.description}</p>
            </div>
            <button onClick={onBookmark} className="shrink-0 mt-1">
              <Bookmark
                size={20}
                className={
                  isBookmarked
                    ? 'text-green-400 fill-green-400'
                    : 'text-gray-500 hover:text-gray-300'
                }
              />
            </button>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Clock size={12} /> {video.durationLabel}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-xs font-medium ${DIFFICULTY_COLORS[video.difficulty]}`}
            >
              {DIFFICULTY_LABELS[video.difficulty]}
            </span>
            <span className="text-xs text-gray-600">
              {CATEGORIES.find((c) => c.key === video.category)?.label}
            </span>
            {progress?.completed && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-800/50 text-green-300 text-xs">
                <Check size={12} /> Avklarad
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left: Chapters */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
                <Award size={15} className="text-green-400" />
                Kapitel
              </h3>
              <div className="space-y-1">
                {video.chapters.map((ch, idx) => (
                  <button
                    key={idx}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  >
                    <span className="text-xs font-mono text-green-400 w-10 shrink-0">
                      {ch.time}
                    </span>
                    <span className="text-sm text-gray-300">{ch.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Notes */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-3">
                <StickyNote size={15} className="text-green-400" />
                Mina anteckningar
              </h3>
              <textarea
                value={note}
                onChange={(e) => onUpdateNote(e.target.value)}
                placeholder="Skriv anteckningar här..."
                rows={6}
                className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-green-700/50 resize-none"
              />
            </div>
          </div>

          {/* Actions row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pt-4 border-t border-white/10">
            <div className="flex gap-2">
              {prevVideo && (
                <button
                  onClick={() => onNavigate(prevVideo)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                >
                  <SkipBack size={14} />
                  Föregående
                </button>
              )}
              {nextVideo && (
                <button
                  onClick={() => onNavigate(nextVideo)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-sm text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Nästa
                  <SkipForward size={14} />
                </button>
              )}
            </div>

            {!progress?.completed ? (
              <button
                onClick={onMarkComplete}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-700 text-sm font-medium text-white hover:bg-green-600 transition-colors"
              >
                <Check size={16} />
                Markera som klar
              </button>
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-800/40 text-sm text-green-300">
                <Check size={16} />
                Avklarad
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

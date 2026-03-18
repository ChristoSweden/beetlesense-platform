import { useState, useEffect, useCallback } from 'react';
import { isDemo } from '@/lib/demoData';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

// ─── Sighting Types ───

export type SightingType =
  | 'barkborre'
  | 'stormskada'
  | 'algskada'
  | 'brand'
  | 'svampangrepp'
  | 'invasiv_art';

export interface Sighting {
  id: string;
  type: SightingType;
  description: string;
  location_label: string; // anonymized to ~1km grid
  lat: number;
  lng: number;
  timestamp: string;
  photo_url?: string | null;
  verification_count: number;
  reporter_label: string;
}

export interface NewSightingPayload {
  type: SightingType;
  description: string;
  location_label: string;
}

// ─── Neighbor Alerts ───

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertRadius = 2 | 5 | 10;

export interface NeighborAlert {
  id: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  distance_km: number;
  direction: string;
  source: 'community' | 'satellite' | 'combined';
  timestamp: string;
  lat: number;
  lng: number;
}

// ─── Contractor Reviews ───

export type ContractorService =
  | 'avverkning'
  | 'markberedning'
  | 'plantering'
  | 'gallring'
  | 'rojning';

export interface ContractorReview {
  id: string;
  rating: number;
  service: ContractorService;
  text: string;
  date: string;
  verified_job: boolean;
  author_label: string;
}

export interface Contractor {
  id: string;
  name: string;
  services: ContractorService[];
  avg_rating: number;
  review_count: number;
  price_range: string;
  municipality: string;
  reviews: ContractorReview[];
}

export type ContractorSort = 'rating' | 'distance' | 'price' | 'recent';

// ─── Price Sharing ───

export interface PriceReport {
  id: string;
  timber_type: string;
  price_sek: number;
  unit: string;
  buyer: string;
  region: string;
  date: string;
  reporter_label: string;
}

export interface AggregatedPrice {
  timber_type: string;
  buyer: string;
  region: string;
  min_price: number;
  max_price: number;
  avg_price: number;
  report_count: number;
  official_price: number;
}

export interface NewPricePayload {
  timber_type: string;
  price_sek: number;
  buyer: string;
  region: string;
}

// ─── Demo Data ───

const DEMO_SIGHTINGS: Sighting[] = [
  {
    id: 'sight-1',
    type: 'barkborre',
    description: 'Borrmjöl vid basen av 6-7 granar i sydsluttning. Typiska gallerier under barken. Troligen Ips typographus, tidigt angrepp.',
    location_label: 'Värnamo NV (1km raster)',
    lat: 57.19,
    lng: 14.02,
    timestamp: '2026-03-16T07:30:00Z',
    verification_count: 8,
    reporter_label: 'Skogsägare i Småland',
  },
  {
    id: 'sight-2',
    type: 'stormskada',
    description: 'Cirka 15 vindfällen efter nattens storm. Mestadels gran, 25-30m höga. Blockerar skogsvägen mot Kvarnamåla.',
    location_label: 'Gislaved S (1km raster)',
    lat: 57.28,
    lng: 13.55,
    timestamp: '2026-03-15T06:15:00Z',
    verification_count: 12,
    reporter_label: 'Skogsägare i Småland',
  },
  {
    id: 'sight-3',
    type: 'algskada',
    description: 'Omfattande älgbetning på tallplantering, ca 3 år gammal. Uppskattningsvis 40% av plantorna skadade. Behöver stängsling.',
    location_label: 'Nässjö Ö (1km raster)',
    lat: 57.65,
    lng: 14.72,
    timestamp: '2026-03-14T14:20:00Z',
    verification_count: 5,
    reporter_label: 'Skogsägare i Jönköping',
  },
  {
    id: 'sight-4',
    type: 'svampangrepp',
    description: 'Rotröta (Heterobasidion) upptäckt vid gallring. Flera granstubbar visar tydlig brunröta i centrum. Stubbbehandling rekommenderas.',
    location_label: 'Värnamo Ö (1km raster)',
    lat: 57.20,
    lng: 14.08,
    timestamp: '2026-03-13T10:45:00Z',
    verification_count: 3,
    reporter_label: 'Skogsägare i Småland',
  },
  {
    id: 'sight-5',
    type: 'barkborre',
    description: 'Hackspettsarbete på flera granar — tyder på larvaktivitet under barken. Kronorna fortfarande gröna men tecken på stress.',
    location_label: 'Jönköping SV (1km raster)',
    lat: 57.76,
    lng: 14.14,
    timestamp: '2026-03-12T16:00:00Z',
    verification_count: 6,
    reporter_label: 'Skogsägare i Jönköping',
  },
  {
    id: 'sight-6',
    type: 'brand',
    description: 'Röklukt och sotfläckar upptäckt i hyggesrester. Troligen självantändning i torrt ris. Räddningstjänsten kontaktad.',
    location_label: 'Alvesta N (1km raster)',
    lat: 56.93,
    lng: 14.55,
    timestamp: '2026-03-11T18:30:00Z',
    verification_count: 15,
    reporter_label: 'Skogsägare i Kronoberg',
  },
  {
    id: 'sight-7',
    type: 'invasiv_art',
    description: 'Stort bestånd av jättebalsamin längs bäcken vid skogskanten. Sprider sig snabbt in i hygget. Bör bekämpas före fröspridning.',
    location_label: 'Gislaved N (1km raster)',
    lat: 57.32,
    lng: 13.54,
    timestamp: '2026-03-10T09:00:00Z',
    verification_count: 4,
    reporter_label: 'Skogsägare i Småland',
  },
  {
    id: 'sight-8',
    type: 'stormskada',
    description: 'Enstaka rotryckta tallar efter vindbyar. Torra sandiga marker, ytliga rotsystem. 3-4 träd vid vägkant.',
    location_label: 'Nässjö V (1km raster)',
    lat: 57.64,
    lng: 14.66,
    timestamp: '2026-03-09T11:45:00Z',
    verification_count: 2,
    reporter_label: 'Skogsägare i Jönköping',
  },
  {
    id: 'sight-9',
    type: 'algskada',
    description: 'Färska barkgnag på unga rönnstammar. Troligen älg, höjden stämmer. Pågår sedan januari men verkar öka.',
    location_label: 'Värnamo S (1km raster)',
    lat: 57.17,
    lng: 14.05,
    timestamp: '2026-03-08T08:20:00Z',
    verification_count: 3,
    reporter_label: 'Skogsägare i Småland',
  },
  {
    id: 'sight-10',
    type: 'barkborre',
    description: 'Massivt barkborreangrepp i granskog med sydväst-exposition. Minst 30 angripna träd. Området gränsar till fjolårets hygge.',
    location_label: 'Gislaved Ö (1km raster)',
    lat: 57.30,
    lng: 13.60,
    timestamp: '2026-03-07T15:30:00Z',
    verification_count: 18,
    reporter_label: 'Skogsägare i Småland',
  },
];

const DEMO_NEIGHBOR_ALERTS: NeighborAlert[] = [
  {
    id: 'alert-1',
    severity: 'critical',
    title: 'Bekräftat barkborreangrepp',
    description: 'Aktivt barkborreangrepp bekräftat av flera observatörer. Satellitdata visar NDVI-nedgång i området. Inspektera dina granar omgående.',
    distance_km: 2.3,
    direction: 'norr',
    source: 'combined',
    timestamp: '2026-03-16T08:00:00Z',
    lat: 57.21,
    lng: 14.04,
  },
  {
    id: 'alert-2',
    severity: 'warning',
    title: 'Stormskador rapporterade',
    description: 'Flera rapporter om vindfällen efter nattens storm. Vindfällen kan bli yngelplatser för barkborre — kontrollera och upparbeta snarast.',
    distance_km: 4.1,
    direction: 'sydväst',
    source: 'community',
    timestamp: '2026-03-15T10:00:00Z',
    lat: 57.16,
    lng: 13.98,
  },
  {
    id: 'alert-3',
    severity: 'warning',
    title: 'Misstänkt barkborresvärmning',
    description: 'Feromonfällor i området visar ökade fångster. Temperaturen har överstigit 18°C tre dagar i rad. Svärmningsperiod kan ha inletts.',
    distance_km: 3.7,
    direction: 'öst',
    source: 'satellite',
    timestamp: '2026-03-14T12:00:00Z',
    lat: 57.19,
    lng: 14.10,
  },
  {
    id: 'alert-4',
    severity: 'info',
    title: 'Avverkning pågår i närheten',
    description: 'Slutavverkning av gran pågår 5km väster. Kan locka barkborrar under transport av virke. Håll koll på dina granbestånd.',
    distance_km: 5.2,
    direction: 'väst',
    source: 'community',
    timestamp: '2026-03-13T07:30:00Z',
    lat: 57.19,
    lng: 13.94,
  },
  {
    id: 'alert-5',
    severity: 'critical',
    title: 'Satellit-detekterad NDVI-anomali',
    description: 'Sentinel-2 analys visar 15% NDVI-nedgång i granskog inom din radie. Kan indikera torka, sjukdom eller tidig barkborreattack.',
    distance_km: 1.8,
    direction: 'nordöst',
    source: 'satellite',
    timestamp: '2026-03-12T14:00:00Z',
    lat: 57.20,
    lng: 14.06,
  },
  {
    id: 'alert-6',
    severity: 'info',
    title: 'Älgobservationer ökar',
    description: 'Ökad älgaktivitet rapporterad i området. Flera skogsägare rapporterar färsk betning på tallplanteringar. Överväg viltskydd.',
    distance_km: 6.8,
    direction: 'nordväst',
    source: 'community',
    timestamp: '2026-03-11T16:00:00Z',
    lat: 57.23,
    lng: 13.98,
  },
  {
    id: 'alert-7',
    severity: 'warning',
    title: 'Markberedningsmaskin nära ditt område',
    description: 'Entreprenör kör markberedning i området. Bra tillfälle att planera egen markberedning för kostnadsdelning av transport.',
    distance_km: 3.2,
    direction: 'syd',
    source: 'community',
    timestamp: '2026-03-10T09:00:00Z',
    lat: 57.16,
    lng: 14.03,
  },
];

const DEMO_CONTRACTORS: Contractor[] = [
  {
    id: 'c-1',
    name: 'Smålands Skogsservice AB',
    services: ['avverkning', 'gallring', 'rojning'],
    avg_rating: 4.7,
    review_count: 23,
    price_range: '85-120 SEK/m³fub',
    municipality: 'Värnamo',
    reviews: [
      {
        id: 'cr-1a',
        rating: 5,
        service: 'gallring',
        text: 'Utmärkt arbete med förstagallring av 12ha granskog. Snygga stickvägar, minimal markskada trots svår terräng. Rekommenderas varmt.',
        date: '2026-03-10',
        verified_job: true,
        author_label: 'Skogsägare i Värnamo',
      },
      {
        id: 'cr-1b',
        rating: 4,
        service: 'avverkning',
        text: 'Bra slutavverkning, men lite försenad start p.g.a. maskinproblem. Virket apterades korrekt och vägen reparerades efteråt.',
        date: '2026-02-15',
        verified_job: true,
        author_label: 'Skogsägare i Gislaved',
      },
      {
        id: 'cr-1c',
        rating: 5,
        service: 'rojning',
        text: 'Proffsig röjning av 8ha ungskog. Kom i tid, jobbet klart på två dagar. Lämnade bra blandskog.',
        date: '2026-01-20',
        verified_job: false,
        author_label: 'Skogsägare i Värnamo',
      },
    ],
  },
  {
    id: 'c-2',
    name: 'Jönköpings Skogsentreprenad',
    services: ['avverkning', 'markberedning', 'gallring'],
    avg_rating: 4.4,
    review_count: 18,
    price_range: '90-135 SEK/m³fub',
    municipality: 'Jönköping',
    reviews: [
      {
        id: 'cr-2a',
        rating: 5,
        service: 'avverkning',
        text: 'Mycket professionella. Slutavverkning av 25ha blandskog gick smidigt. Bra kommunikation genom hela projektet.',
        date: '2026-02-28',
        verified_job: true,
        author_label: 'Skogsägare i Jönköping',
      },
      {
        id: 'cr-2b',
        rating: 4,
        service: 'markberedning',
        text: 'Bra markberedning med harvmetoden. Lite djupa spår på vissa ställen men annars godkänt.',
        date: '2026-01-15',
        verified_job: true,
        author_label: 'Skogsägare i Nässjö',
      },
    ],
  },
  {
    id: 'c-3',
    name: 'Erikssons Plantering & Röjning',
    services: ['plantering', 'rojning'],
    avg_rating: 4.9,
    review_count: 31,
    price_range: '3.50-5.00 SEK/planta',
    municipality: 'Gislaved',
    reviews: [
      {
        id: 'cr-3a',
        rating: 5,
        service: 'plantering',
        text: 'Fantastiskt jobb! 4000 granplantor satta på 2 dagar. Perfekt djup, alla plantor ser friska ut efter 6 månader.',
        date: '2026-03-05',
        verified_job: true,
        author_label: 'Skogsägare i Gislaved',
      },
      {
        id: 'cr-3b',
        rating: 5,
        service: 'plantering',
        text: 'Bästa planteringsresultatet vi haft. 97% överlevnad efter första sommaren. Använder erfarna planterare.',
        date: '2026-02-10',
        verified_job: true,
        author_label: 'Skogsägare i Värnamo',
      },
      {
        id: 'cr-3c',
        rating: 5,
        service: 'rojning',
        text: 'Röjde 15ha på en vecka. Noggrant arbete, bra lövsly-hantering. Pris som avtalat.',
        date: '2026-01-08',
        verified_job: false,
        author_label: 'Skogsägare i Gislaved',
      },
    ],
  },
  {
    id: 'c-4',
    name: 'Norra Smålands Maskinring',
    services: ['avverkning', 'markberedning', 'gallring', 'rojning'],
    avg_rating: 4.2,
    review_count: 14,
    price_range: '80-125 SEK/m³fub',
    municipality: 'Nässjö',
    reviews: [
      {
        id: 'cr-4a',
        rating: 4,
        service: 'gallring',
        text: 'Bra gallring till rimligt pris. Lite sena med leveransen av mätbesked men jobbet i fält var bra.',
        date: '2026-03-01',
        verified_job: true,
        author_label: 'Skogsägare i Nässjö',
      },
      {
        id: 'cr-4b',
        rating: 3,
        service: 'avverkning',
        text: 'Okej slutresultat men kommunikationen kunde vara bättre. Fick inte besked om startdatum förrän dagen innan.',
        date: '2026-01-25',
        verified_job: true,
        author_label: 'Skogsägare i Jönköping',
      },
    ],
  },
  {
    id: 'c-5',
    name: 'GreenForest Plantering AB',
    services: ['plantering', 'markberedning'],
    avg_rating: 4.6,
    review_count: 27,
    price_range: '3.80-4.50 SEK/planta',
    municipality: 'Alvesta',
    reviews: [
      {
        id: 'cr-5a',
        rating: 5,
        service: 'plantering',
        text: 'Planterade 8000 blandskogsplantor (gran + björk) på svår mark. Imponerade av kvaliteten. Proffsigt lag.',
        date: '2026-02-20',
        verified_job: true,
        author_label: 'Skogsägare i Alvesta',
      },
      {
        id: 'cr-5b',
        rating: 4,
        service: 'markberedning',
        text: 'Bra högläggsmarkberedning. Lite trångt i kantzonen mot bäcken men annars toppjobb.',
        date: '2026-01-30',
        verified_job: true,
        author_label: 'Skogsägare i Kronoberg',
      },
    ],
  },
  {
    id: 'c-6',
    name: 'Vimmerby Skog & Mark',
    services: ['avverkning', 'gallring'],
    avg_rating: 4.3,
    review_count: 11,
    price_range: '90-140 SEK/m³fub',
    municipality: 'Vimmerby',
    reviews: [
      {
        id: 'cr-6a',
        rating: 5,
        service: 'avverkning',
        text: 'Snabb och effektiv slutavverkning. Bra dialog om vilka träd som skulle sparas för miljöhänsyn.',
        date: '2026-03-12',
        verified_job: true,
        author_label: 'Skogsägare i Vimmerby',
      },
      {
        id: 'cr-6b',
        rating: 4,
        service: 'gallring',
        text: 'Duglig gallring men stickvägsbredden var ibland mer än 4m. Bör diskuteras innan start.',
        date: '2026-02-05',
        verified_job: false,
        author_label: 'Skogsägare i Kalmar',
      },
    ],
  },
  {
    id: 'c-7',
    name: 'Tabergs Skogsröjning HB',
    services: ['rojning'],
    avg_rating: 4.8,
    review_count: 19,
    price_range: '3500-5500 SEK/ha',
    municipality: 'Jönköping',
    reviews: [
      {
        id: 'cr-7a',
        rating: 5,
        service: 'rojning',
        text: 'Specialister på röjning. Fantastiskt resultat i svårtillgänglig terräng. Rimligt pris.',
        date: '2026-03-08',
        verified_job: true,
        author_label: 'Skogsägare i Jönköping',
      },
      {
        id: 'cr-7b',
        rating: 5,
        service: 'rojning',
        text: 'Tredje året vi anlitar dem. Alltid pålitliga och levererar hög kvalitet. Rekommenderas!',
        date: '2026-02-14',
        verified_job: true,
        author_label: 'Skogsägare i Jönköping',
      },
    ],
  },
  {
    id: 'c-8',
    name: 'Sydved Entreprenad',
    services: ['avverkning', 'gallring', 'markberedning', 'plantering'],
    avg_rating: 4.5,
    review_count: 42,
    price_range: '85-130 SEK/m³fub',
    municipality: 'Växjö',
    reviews: [
      {
        id: 'cr-8a',
        rating: 5,
        service: 'avverkning',
        text: 'Helhetslösning från avverkning till plantering. Mycket smidig process och bra slutresultat.',
        date: '2026-03-14',
        verified_job: true,
        author_label: 'Skogsägare i Växjö',
      },
      {
        id: 'cr-8b',
        rating: 4,
        service: 'gallring',
        text: 'Stor organisation med bra resurser. Gallringen gick snabbt men lite opersonligt jämfört med mindre firmor.',
        date: '2026-01-18',
        verified_job: true,
        author_label: 'Skogsägare i Alvesta',
      },
    ],
  },
];

const DEMO_PRICE_REPORTS: PriceReport[] = [
  { id: 'pr-1', timber_type: 'Grantimmer', price_sek: 620, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-15', reporter_label: 'Skogsägare' },
  { id: 'pr-2', timber_type: 'Grantimmer', price_sek: 595, unit: 'SEK/m³fub', buyer: 'Vida', region: 'Småland', date: '2026-03-14', reporter_label: 'Skogsägare' },
  { id: 'pr-3', timber_type: 'Grantimmer', price_sek: 640, unit: 'SEK/m³fub', buyer: 'Stora Enso', region: 'Småland', date: '2026-03-12', reporter_label: 'Skogsägare' },
  { id: 'pr-4', timber_type: 'Talltimmer', price_sek: 680, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-15', reporter_label: 'Skogsägare' },
  { id: 'pr-5', timber_type: 'Talltimmer', price_sek: 660, unit: 'SEK/m³fub', buyer: 'Vida', region: 'Småland', date: '2026-03-13', reporter_label: 'Skogsägare' },
  { id: 'pr-6', timber_type: 'Granmassa', price_sek: 335, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-14', reporter_label: 'Skogsägare' },
  { id: 'pr-7', timber_type: 'Granmassa', price_sek: 320, unit: 'SEK/m³fub', buyer: 'Stora Enso', region: 'Småland', date: '2026-03-11', reporter_label: 'Skogsägare' },
  { id: 'pr-8', timber_type: 'Granmassa', price_sek: 340, unit: 'SEK/m³fub', buyer: 'Holmen', region: 'Småland', date: '2026-03-10', reporter_label: 'Skogsägare' },
  { id: 'pr-9', timber_type: 'Tallmassa', price_sek: 310, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-15', reporter_label: 'Skogsägare' },
  { id: 'pr-10', timber_type: 'Tallmassa', price_sek: 300, unit: 'SEK/m³fub', buyer: 'Vida', region: 'Småland', date: '2026-03-12', reporter_label: 'Skogsägare' },
  { id: 'pr-11', timber_type: 'Björktimmer', price_sek: 520, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-13', reporter_label: 'Skogsägare' },
  { id: 'pr-12', timber_type: 'Björktimmer', price_sek: 495, unit: 'SEK/m³fub', buyer: 'Stora Enso', region: 'Småland', date: '2026-03-09', reporter_label: 'Skogsägare' },
  { id: 'pr-13', timber_type: 'Björkmassa', price_sek: 290, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-14', reporter_label: 'Skogsägare' },
  { id: 'pr-14', timber_type: 'Grantimmer', price_sek: 610, unit: 'SEK/m³fub', buyer: 'Holmen', region: 'Småland', date: '2026-03-08', reporter_label: 'Skogsägare' },
  { id: 'pr-15', timber_type: 'Talltimmer', price_sek: 700, unit: 'SEK/m³fub', buyer: 'Stora Enso', region: 'Småland', date: '2026-03-07', reporter_label: 'Skogsägare' },
  { id: 'pr-16', timber_type: 'Grantimmer', price_sek: 630, unit: 'SEK/m³fub', buyer: 'Södra', region: 'Småland', date: '2026-03-06', reporter_label: 'Skogsägare' },
];

const DEMO_AGGREGATED_PRICES: AggregatedPrice[] = [
  { timber_type: 'Grantimmer', buyer: 'Södra', region: 'Småland', min_price: 600, max_price: 645, avg_price: 625, report_count: 12, official_price: 620 },
  { timber_type: 'Grantimmer', buyer: 'Vida', region: 'Småland', min_price: 580, max_price: 610, avg_price: 595, report_count: 8, official_price: 600 },
  { timber_type: 'Grantimmer', buyer: 'Stora Enso', region: 'Småland', min_price: 620, max_price: 660, avg_price: 640, report_count: 6, official_price: 635 },
  { timber_type: 'Grantimmer', buyer: 'Holmen', region: 'Småland', min_price: 595, max_price: 625, avg_price: 610, report_count: 4, official_price: 615 },
  { timber_type: 'Talltimmer', buyer: 'Södra', region: 'Småland', min_price: 660, max_price: 700, avg_price: 680, report_count: 10, official_price: 675 },
  { timber_type: 'Talltimmer', buyer: 'Vida', region: 'Småland', min_price: 640, max_price: 680, avg_price: 660, report_count: 7, official_price: 655 },
  { timber_type: 'Talltimmer', buyer: 'Stora Enso', region: 'Småland', min_price: 680, max_price: 720, avg_price: 700, report_count: 5, official_price: 690 },
  { timber_type: 'Granmassa', buyer: 'Södra', region: 'Småland', min_price: 320, max_price: 350, avg_price: 335, report_count: 15, official_price: 330 },
  { timber_type: 'Granmassa', buyer: 'Stora Enso', region: 'Småland', min_price: 310, max_price: 335, avg_price: 320, report_count: 9, official_price: 325 },
  { timber_type: 'Granmassa', buyer: 'Holmen', region: 'Småland', min_price: 325, max_price: 355, avg_price: 340, report_count: 6, official_price: 335 },
  { timber_type: 'Tallmassa', buyer: 'Södra', region: 'Småland', min_price: 295, max_price: 325, avg_price: 310, report_count: 11, official_price: 305 },
  { timber_type: 'Björktimmer', buyer: 'Södra', region: 'Småland', min_price: 500, max_price: 540, avg_price: 520, report_count: 7, official_price: 515 },
  { timber_type: 'Björkmassa', buyer: 'Södra', region: 'Småland', min_price: 275, max_price: 305, avg_price: 290, report_count: 8, official_price: 285 },
];

// ─── Sighting type labels & colors ───

export const SIGHTING_TYPE_CONFIG: Record<SightingType, { label: string; icon: string; color: string }> = {
  barkborre: { label: 'Barkborre', icon: '🪲', color: '#ef4444' },
  stormskada: { label: 'Stormskada', icon: '🌪️', color: '#f59e0b' },
  algskada: { label: 'Älgskada', icon: '🫎', color: '#a78bfa' },
  brand: { label: 'Brand', icon: '🔥', color: '#f97316' },
  svampangrepp: { label: 'Svampangrepp', icon: '🍄', color: '#ec4899' },
  invasiv_art: { label: 'Invasiv art', icon: '🌿', color: '#14b8a6' },
};

export const SERVICE_LABELS: Record<ContractorService, string> = {
  avverkning: 'Avverkning',
  markberedning: 'Markberedning',
  plantering: 'Plantering',
  gallring: 'Gallring',
  rojning: 'Röjning',
};

// ─── Hook ───

interface UseCommunityOptions {
  sightingTypeFilter?: SightingType | null;
  alertRadius?: AlertRadius;
  contractorSort?: ContractorSort;
  priceTimberFilter?: string | null;
}

interface UseCommunityReturn {
  // Sightings
  sightings: Sighting[];
  sightingsLoading: boolean;
  verifySighting: (id: string) => void;
  addSighting: (payload: NewSightingPayload) => void;
  verifiedSet: Set<string>;

  // Neighbor alerts
  alerts: NeighborAlert[];
  alertsLoading: boolean;
  alertRadius: AlertRadius;
  setAlertRadius: (r: AlertRadius) => void;

  // Contractors
  contractors: Contractor[];
  contractorsLoading: boolean;
  contractorSort: ContractorSort;
  setContractorSort: (s: ContractorSort) => void;

  // Price sharing
  priceReports: PriceReport[];
  aggregatedPrices: AggregatedPrice[];
  pricesLoading: boolean;
  addPriceReport: (payload: NewPricePayload) => void;
}

export function useCommunity(options: UseCommunityOptions = {}): UseCommunityReturn {
  const {
    sightingTypeFilter = null,
    alertRadius: initialRadius = 5,
    contractorSort: initialSort = 'rating',
    priceTimberFilter = null,
  } = options;

  // Sightings
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [sightingsLoading, setSightingsLoading] = useState(true);
  const [verifiedSet, setVerifiedSet] = useState<Set<string>>(new Set());

  // Alerts
  const [alerts, setAlerts] = useState<NeighborAlert[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(true);
  const [alertRadius, setAlertRadius] = useState<AlertRadius>(initialRadius);

  // Contractors
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [contractorsLoading, setContractorsLoading] = useState(true);
  const [contractorSort, setContractorSort] = useState<ContractorSort>(initialSort);

  // Prices
  const [priceReports, setPriceReports] = useState<PriceReport[]>([]);
  const [aggregatedPrices, setAggregatedPrices] = useState<AggregatedPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);

  // ── Load sightings ──
  useEffect(() => {
    setSightingsLoading(true);
    if (isDemo() || !isSupabaseConfigured) {
      const timer = setTimeout(() => {
        let filtered = [...DEMO_SIGHTINGS];
        if (sightingTypeFilter) {
          filtered = filtered.filter((s) => s.type === sightingTypeFilter);
        }
        setSightings(filtered);
        setSightingsLoading(false);
      }, 250);
      return () => clearTimeout(timer);
    }

    // Live: fetch from Supabase
    async function fetch() {
      try {
        let query = supabase.from('community_sightings').select('*').order('timestamp', { ascending: false }).limit(50);
        if (sightingTypeFilter) query = query.eq('type', sightingTypeFilter);
        const { data } = await query;
        setSightings((data as Sighting[]) ?? []);
      } catch {
        setSightings([]);
      } finally {
        setSightingsLoading(false);
      }
    }
    fetch();
  }, [sightingTypeFilter]);

  // ── Load alerts ──
  useEffect(() => {
    setAlertsLoading(true);
    if (isDemo() || !isSupabaseConfigured) {
      const timer = setTimeout(() => {
        setAlerts(DEMO_NEIGHBOR_ALERTS.filter((a) => a.distance_km <= alertRadius));
        setAlertsLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }

    async function fetch() {
      try {
        const { data } = await supabase
          .from('neighbor_alerts')
          .select('*')
          .lte('distance_km', alertRadius)
          .order('timestamp', { ascending: false })
          .limit(30);
        setAlerts((data as NeighborAlert[]) ?? []);
      } catch {
        setAlerts([]);
      } finally {
        setAlertsLoading(false);
      }
    }
    fetch();
  }, [alertRadius]);

  // ── Load contractors ──
  useEffect(() => {
    setContractorsLoading(true);
    if (isDemo() || !isSupabaseConfigured) {
      const timer = setTimeout(() => {
        const sorted = [...DEMO_CONTRACTORS];
        switch (contractorSort) {
          case 'rating':
            sorted.sort((a, b) => b.avg_rating - a.avg_rating);
            break;
          case 'recent':
            sorted.sort((a, b) => b.review_count - a.review_count);
            break;
          case 'price':
            sorted.sort((a, b) => a.price_range.localeCompare(b.price_range));
            break;
          case 'distance':
            // Shuffle for demo
            sorted.sort((a, b) => a.municipality.localeCompare(b.municipality));
            break;
        }
        setContractors(sorted);
        setContractorsLoading(false);
      }, 250);
      return () => clearTimeout(timer);
    }

    async function fetch() {
      try {
        const { data } = await supabase.from('contractors').select('*').order('avg_rating', { ascending: false });
        setContractors((data as Contractor[]) ?? []);
      } catch {
        setContractors([]);
      } finally {
        setContractorsLoading(false);
      }
    }
    fetch();
  }, [contractorSort]);

  // ── Load prices ──
  useEffect(() => {
    setPricesLoading(true);
    if (isDemo() || !isSupabaseConfigured) {
      const timer = setTimeout(() => {
        let reports = [...DEMO_PRICE_REPORTS];
        let agg = [...DEMO_AGGREGATED_PRICES];
        if (priceTimberFilter) {
          reports = reports.filter((r) => r.timber_type === priceTimberFilter);
          agg = agg.filter((a) => a.timber_type === priceTimberFilter);
        }
        setPriceReports(reports);
        setAggregatedPrices(agg);
        setPricesLoading(false);
      }, 200);
      return () => clearTimeout(timer);
    }

    async function fetch() {
      try {
        const [reportsRes, aggRes] = await Promise.all([
          supabase.from('price_reports').select('*').order('date', { ascending: false }).limit(50),
          supabase.from('aggregated_prices').select('*'),
        ]);
        setPriceReports((reportsRes.data as PriceReport[]) ?? []);
        setAggregatedPrices((aggRes.data as AggregatedPrice[]) ?? []);
      } catch {
        setPriceReports([]);
        setAggregatedPrices([]);
      } finally {
        setPricesLoading(false);
      }
    }
    fetch();
  }, [priceTimberFilter]);

  // ── Actions ──

  const verifySighting = useCallback(
    (id: string) => {
      setVerifiedSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      setSightings((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;
          const already = verifiedSet.has(id);
          return { ...s, verification_count: already ? s.verification_count - 1 : s.verification_count + 1 };
        }),
      );
      if (isSupabaseConfigured && !isDemo()) {
        supabase.rpc('toggle_sighting_verification', { sighting_id: id });
      }
    },
    [verifiedSet],
  );

  const addSighting = useCallback((payload: NewSightingPayload) => {
    const newSighting: Sighting = {
      id: `local-${Date.now()}`,
      type: payload.type,
      description: payload.description,
      location_label: payload.location_label || 'Okänd plats',
      lat: 57.19,
      lng: 14.04,
      timestamp: new Date().toISOString(),
      verification_count: 0,
      reporter_label: 'Du',
    };
    setSightings((prev) => [newSighting, ...prev]);
    if (isSupabaseConfigured && !isDemo()) {
      supabase.from('community_sightings').insert(payload);
    }
  }, []);

  const addPriceReport = useCallback((payload: NewPricePayload) => {
    const newReport: PriceReport = {
      id: `local-${Date.now()}`,
      timber_type: payload.timber_type,
      price_sek: payload.price_sek,
      unit: 'SEK/m³fub',
      buyer: payload.buyer,
      region: payload.region || 'Småland',
      date: new Date().toISOString().split('T')[0],
      reporter_label: 'Du',
    };
    setPriceReports((prev) => [newReport, ...prev]);
    if (isSupabaseConfigured && !isDemo()) {
      supabase.from('price_reports').insert(payload);
    }
  }, []);

  return {
    sightings,
    sightingsLoading,
    verifySighting,
    addSighting,
    verifiedSet,
    alerts,
    alertsLoading,
    alertRadius,
    setAlertRadius,
    contractors,
    contractorsLoading,
    contractorSort,
    setContractorSort,
    priceReports,
    aggregatedPrices,
    pricesLoading,
    addPriceReport,
  };
}

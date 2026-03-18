/**
 * useContractorMarketplace — Open Contractor Marketplace hook.
 *
 * Unlike Södra's closed contractor model, this marketplace lets ANY contractor
 * bid on jobs posted by forest owners. Provides contractor listings, job CRUD,
 * bid management, and job status tracking with realistic Småland demo data.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ───

export type ForestryService =
  | 'avverkning'
  | 'markberedning'
  | 'plantering'
  | 'gallring'
  | 'rojning'
  | 'dikesrensning';

export const ALL_FORESTRY_SERVICES: ForestryService[] = [
  'avverkning',
  'markberedning',
  'plantering',
  'gallring',
  'rojning',
  'dikesrensning',
];

export const SERVICE_LABELS: Record<ForestryService, string> = {
  avverkning: 'Avverkning',
  markberedning: 'Markberedning',
  plantering: 'Plantering',
  gallring: 'Gallring',
  rojning: 'Röjning',
  dikesrensning: 'Dikesrensning',
};

export type PriceRange = '€' | '€€' | '€€€';
export type MonthAvailability = 'green' | 'yellow' | 'red';

export interface MarketplaceContractor {
  id: string;
  company_name: string;
  contact_person: string;
  org_number: string;
  photo_url: string | null;
  services: ForestryService[];
  location: string;
  coordinates: [number, number];
  rating: number;
  review_count: number;
  years_in_business: number;
  certifications: string[];
  equipment: string[];
  availability_months: Record<string, MonthAvailability>; // e.g. '2026-04': 'green'
  price_range: PriceRange;
  description: string;
  phone: string;
  email: string;
  website: string | null;
}

export type JobStatus =
  | 'posted'
  | 'bids_received'
  | 'contractor_selected'
  | 'work_started'
  | 'inspection'
  | 'complete';

export const JOB_STATUS_ORDER: JobStatus[] = [
  'posted',
  'bids_received',
  'contractor_selected',
  'work_started',
  'inspection',
  'complete',
];

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  posted: 'Publicerad',
  bids_received: 'Offerter inkomna',
  contractor_selected: 'Entreprenör vald',
  work_started: 'Arbete påbörjat',
  inspection: 'Besiktning',
  complete: 'Slutfört',
};

export interface JobPosting {
  id: string;
  services: ForestryService[];
  parcel_id: string;
  parcel_name: string;
  area_ha: number;
  estimated_volume_m3: number | null;
  preferred_timeline: string;
  requirements: string[];
  budget_min: number | null;
  budget_max: number | null;
  description: string;
  status: JobStatus;
  created_at: string;
  bids: JobBid[];
  selected_bid_id: string | null;
  photos: string[];
  invoice_status: 'none' | 'sent' | 'paid';
}

export interface JobBid {
  id: string;
  job_id: string;
  contractor_id: string;
  contractor_name: string;
  contractor_rating: number;
  price_sek: number;
  timeline: string;
  included_services: string[];
  equipment: string[];
  message: string;
  submitted_at: string;
}

export interface JobPostFormData {
  services: ForestryService[];
  parcel_id: string;
  area_ha: number;
  estimated_volume_m3: number | null;
  preferred_timeline: string;
  requirements: string[];
  budget_min: number | null;
  budget_max: number | null;
  description: string;
}

export interface MarketplaceFilters {
  search: string;
  services: ForestryService[];
  location: string;
  minRating: number;
  priceRange: PriceRange | null;
  availableMonth: string | null;
  sortBy: 'distance' | 'rating' | 'price' | 'name';
}

export interface UseContractorMarketplaceReturn {
  // Contractors
  contractors: MarketplaceContractor[];
  filteredContractors: MarketplaceContractor[];
  filters: MarketplaceFilters;
  setFilters: (f: Partial<MarketplaceFilters>) => void;
  getDistance: (contractor: MarketplaceContractor) => number;
  // Jobs
  jobs: JobPosting[];
  activeJobs: JobPosting[];
  postJob: (data: JobPostFormData) => void;
  // Bids
  acceptBid: (jobId: string, bidId: string) => void;
  rejectBid: (jobId: string, bidId: string) => void;
  // Job tracking
  advanceJobStatus: (jobId: string) => void;
  // State
  loading: boolean;
  error: string | null;
}

// ─── Haversine distance ───

function haversineKm(
  [lng1, lat1]: [number, number],
  [lng2, lat2]: [number, number],
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Availability month generator ───

function generateMonthAvailability(): Record<string, MonthAvailability> {
  const months: Record<string, MonthAvailability> = {};
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const r = Math.random();
    months[key] = r > 0.6 ? 'green' : r > 0.25 ? 'yellow' : 'red';
  }
  return months;
}

// ─── Demo Contractors ───

const DEMO_MARKETPLACE_CONTRACTORS: MarketplaceContractor[] = [
  {
    id: 'mc-1',
    company_name: 'Johansons Skogsentreprenad AB',
    contact_person: 'Per Johanson',
    org_number: '556789-1234',
    photo_url: null,
    services: ['avverkning', 'gallring', 'rojning'],
    location: 'Värnamo',
    coordinates: [14.04, 57.19],
    rating: 4.8,
    review_count: 42,
    years_in_business: 28,
    certifications: ['FSC', 'PEFC', 'ISO 14001'],
    equipment: ['John Deere 1270G skördare', 'John Deere 1210G skotare', 'Husqvarna 572XP'],
    availability_months: generateMonthAvailability(),
    price_range: '€€',
    description: 'Familjeföretag sedan 1998 med fokus på skonsam avverkning och gallring i Småland. Modern maskinpark och erfarna förare. Vi tar hand om din skog som om den vore vår egen.',
    phone: '+46 70 234 5678',
    email: 'per@johansonsskog.se',
    website: 'https://johansonsskog.se',
  },
  {
    id: 'mc-2',
    company_name: 'Ekströms Maskin',
    contact_person: 'Lars Ekström',
    org_number: '556823-5678',
    photo_url: null,
    services: ['avverkning'],
    location: 'Jönköping',
    coordinates: [14.16, 57.78],
    rating: 4.9,
    review_count: 67,
    years_in_business: 35,
    certifications: ['FSC', 'PEFC'],
    equipment: ['Ponsse Scorpion King skördare', 'Ponsse Elephant skotare'],
    availability_months: generateMonthAvailability(),
    price_range: '€€€',
    description: 'Avverkningsspecialister sedan 1991. Vi hanterar allt från förstagallring till slutavverkning. Känd för kvalitet och minimala markskador.',
    phone: '+46 73 456 7890',
    email: 'lars@ekstromsmaskin.se',
    website: 'https://ekstromsmaskin.se',
  },
  {
    id: 'mc-3',
    company_name: 'GreenForest Gallring',
    contact_person: 'Anna Lindberg',
    org_number: '556901-2345',
    photo_url: null,
    services: ['gallring', 'rojning'],
    location: 'Växjö',
    coordinates: [14.81, 56.88],
    rating: 4.7,
    review_count: 31,
    years_in_business: 12,
    certifications: ['FSC', 'PEFC', 'ISO 14001'],
    equipment: ['Komatsu 931XC skördare', 'Komatsu 855 skotare'],
    availability_months: generateMonthAvailability(),
    price_range: '€',
    description: 'Specialister på gallring och röjning. Vi optimerar din framtidsskog med rätt uttag och omsorg om markens bärkraft. Hållbart skogsbruk i fokus.',
    phone: '+46 72 567 8901',
    email: 'anna@greenforestgallring.se',
    website: null,
  },
  {
    id: 'mc-4',
    company_name: 'Smålands Markberedning HB',
    contact_person: 'Erik Svensson',
    org_number: '969712-6789',
    photo_url: null,
    services: ['markberedning', 'plantering'],
    location: 'Alvesta',
    coordinates: [14.55, 56.90],
    rating: 4.5,
    review_count: 23,
    years_in_business: 18,
    certifications: ['PEFC', 'Skogsstyrelsen Certifierad Plantör'],
    equipment: ['Bracke T26.a markberedare', 'Bracke P11.a planteringsmaskin'],
    availability_months: generateMonthAvailability(),
    price_range: '€',
    description: 'Erfaren markberedning och maskinell plantering i hela Kronoberg och Jönköpings län. Hög planteringsöverlevnad tack vare noggrann markberedning.',
    phone: '+46 76 789 0123',
    email: 'erik@smalandsmark.se',
    website: null,
  },
  {
    id: 'mc-5',
    company_name: 'Vätterbyns Skogstjänst AB',
    contact_person: 'Karin Gustafsson',
    org_number: '556834-3456',
    photo_url: null,
    services: ['avverkning', 'gallring', 'markberedning', 'plantering'],
    location: 'Tranås',
    coordinates: [14.97, 58.04],
    rating: 4.6,
    review_count: 38,
    years_in_business: 22,
    certifications: ['FSC', 'PEFC', 'ISO 14001', 'ISO 9001'],
    equipment: ['Ponsse Ergo skördare', 'Ponsse Elk skotare', 'Bracke T35.a markberedare'],
    availability_months: generateMonthAvailability(),
    price_range: '€€',
    description: 'Komplett skogsentreprenad från avverkning till plantering. Stor erfarenhet av alla typer av skogsmark i östra Småland och Östergötland.',
    phone: '+46 70 890 1234',
    email: 'karin@vatterbynsskog.se',
    website: 'https://vatterbynsskog.se',
  },
  {
    id: 'mc-6',
    company_name: 'Nässjö Röj & Gallring',
    contact_person: 'Stefan Nilsson',
    org_number: '556945-7890',
    photo_url: null,
    services: ['rojning', 'gallring', 'dikesrensning'],
    location: 'Nässjö',
    coordinates: [14.70, 57.65],
    rating: 4.4,
    review_count: 19,
    years_in_business: 8,
    certifications: ['PEFC'],
    equipment: ['Husqvarna 545 Mark II', 'Komatsu 835 skotare', 'Grävmaskin Volvo EC140E'],
    availability_months: generateMonthAvailability(),
    price_range: '€',
    description: 'Specialiserade på ungskogsskötsel, röjning och dikesrensning. Vi sköter de jobben som de stora firmorna inte tar. Flexibla och snabba.',
    phone: '+46 73 012 3456',
    email: 'stefan@nassjorojning.se',
    website: null,
  },
  {
    id: 'mc-7',
    company_name: 'Gislaved Skog & Anläggning',
    contact_person: 'Johan Petersson',
    org_number: '556867-4567',
    photo_url: null,
    services: ['avverkning', 'markberedning', 'dikesrensning'],
    location: 'Gislaved',
    coordinates: [13.53, 57.30],
    rating: 4.3,
    review_count: 27,
    years_in_business: 15,
    certifications: ['FSC', 'PEFC'],
    equipment: ['John Deere 1470G skördare', 'John Deere 1510G skotare', 'Volvo EC220E grävmaskin'],
    availability_months: generateMonthAvailability(),
    price_range: '€€',
    description: 'Helhetslösningar för skogsbruk och anläggning. Avverkning, markberedning, vägbygge och dikesrensning. Allt under ett tak.',
    phone: '+46 70 678 9012',
    email: 'johan@gislavedskog.se',
    website: 'https://gislavedskog.se',
  },
  {
    id: 'mc-8',
    company_name: 'Kronobergs Planteringsservice',
    contact_person: 'Maria Andersson',
    org_number: '556778-8901',
    photo_url: null,
    services: ['plantering', 'rojning'],
    location: 'Ljungby',
    coordinates: [13.94, 56.83],
    rating: 4.8,
    review_count: 15,
    years_in_business: 10,
    certifications: ['PEFC', 'Skogsstyrelsen Certifierad Plantör'],
    equipment: ['Pottiputki planteringsrör', 'Husqvarna 535RXT röjsåg'],
    availability_months: generateMonthAvailability(),
    price_range: '€',
    description: 'Specialister på manuell och maskinell plantering. Vi planterar rätt sort på rätt plats. Erbjuder även röjning av ungskog och plantskötsel.',
    phone: '+46 72 123 4567',
    email: 'maria@kronobergsplantering.se',
    website: null,
  },
  {
    id: 'mc-9',
    company_name: 'Sydsvensk Skogsentreprenad',
    contact_person: 'Henrik Larsson',
    org_number: '556890-1122',
    photo_url: null,
    services: ['avverkning', 'gallring', 'markberedning', 'plantering', 'rojning', 'dikesrensning'],
    location: 'Kalmar',
    coordinates: [16.36, 56.66],
    rating: 4.2,
    review_count: 53,
    years_in_business: 30,
    certifications: ['FSC', 'PEFC', 'ISO 14001', 'ISO 9001', 'AFS 2001:1'],
    equipment: [
      'Ponsse Bear skördare',
      'Ponsse Buffalo skotare',
      'Bracke T26.a markberedare',
      'Volvo EC250E grävmaskin',
    ],
    availability_months: generateMonthAvailability(),
    price_range: '€€€',
    description: 'Sydöstra Sveriges mest kompletta skogsentreprenadföretag. 30 års erfarenhet och 15 anställda. Vi hanterar allt från röjning till slutavverkning.',
    phone: '+46 70 234 5599',
    email: 'henrik@sydsvenskskog.se',
    website: 'https://sydsvenskskog.se',
  },
  {
    id: 'mc-10',
    company_name: 'Vetlanda Gallringstjänst',
    contact_person: 'Ove Magnusson',
    org_number: '556912-3344',
    photo_url: null,
    services: ['gallring'],
    location: 'Vetlanda',
    coordinates: [15.08, 57.43],
    rating: 4.9,
    review_count: 11,
    years_in_business: 6,
    certifications: ['PEFC'],
    equipment: ['Ponsse Ergo 8W skördare', 'Ponsse Wisent skotare'],
    availability_months: generateMonthAvailability(),
    price_range: '€€',
    description: 'Ung firma med engagemang och precision. Vi gallrar med omsorg om framtidsstammarna. Specialiserade på förstagallring och andragallring i gran och tall.',
    phone: '+46 73 987 6543',
    email: 'ove@vetlandagallring.se',
    website: null,
  },
];

// ─── Demo Jobs ───

const DEMO_JOBS: JobPosting[] = [
  {
    id: 'mj-1',
    services: ['gallring'],
    parcel_id: 'p1',
    parcel_name: 'Norra Skogen',
    area_ha: 42.5,
    estimated_volume_m3: 180,
    preferred_timeline: 'April–Maj 2026',
    requirements: ['FSC-certifierad', 'Skördare med gallringsaggregat'],
    budget_min: 55000,
    budget_max: 75000,
    description: 'Förstagallring i 35-årig granskog. Terrängen är kuperad med god bärighet. Tillgång via skogsbilväg norr. Behöver erfaren operatör.',
    status: 'bids_received',
    created_at: '2026-03-05T08:00:00Z',
    selected_bid_id: null,
    photos: [],
    invoice_status: 'none',
    bids: [
      {
        id: 'bid-1',
        job_id: 'mj-1',
        contractor_id: 'mc-1',
        contractor_name: 'Johansons Skogsentreprenad AB',
        contractor_rating: 4.8,
        price_sek: 67500,
        timeline: '7–11 april 2026',
        included_services: ['Gallring', 'Utkörning till avlägg', 'Upparbetning'],
        equipment: ['John Deere 1270G skördare', 'John Deere 1210G skotare'],
        message: 'Vi har lång erfarenhet av gallring i Värnamo-området. Kan starta vecka 15. Priset inkluderar all utkörning till avlägg vid skogsbilvägen.',
        submitted_at: '2026-03-07T14:30:00Z',
      },
      {
        id: 'bid-2',
        job_id: 'mj-1',
        contractor_id: 'mc-3',
        contractor_name: 'GreenForest Gallring',
        contractor_rating: 4.7,
        price_sek: 58000,
        timeline: '14–18 april 2026',
        included_services: ['Gallring', 'Utkörning', 'Stämpling'],
        equipment: ['Komatsu 931XC skördare', 'Komatsu 855 skotare'],
        message: 'Gallring är vår specialitet. Vi inkluderar stämpling före start utan extra kostnad. Markskonsam teknik med band på alla maskiner.',
        submitted_at: '2026-03-08T09:15:00Z',
      },
      {
        id: 'bid-3',
        job_id: 'mj-1',
        contractor_id: 'mc-10',
        contractor_name: 'Vetlanda Gallringstjänst',
        contractor_rating: 4.9,
        price_sek: 71000,
        timeline: '21–25 april 2026',
        included_services: ['Gallring', 'Utkörning', 'Slutbesiktning'],
        equipment: ['Ponsse Ergo 8W skördare', 'Ponsse Wisent skotare'],
        message: 'Vi erbjuder högkvalitativ gallring med fokus på framtidsstammar. Något högre pris men inkl. slutbesiktning med rapport.',
        submitted_at: '2026-03-09T11:00:00Z',
      },
    ],
  },
  {
    id: 'mj-2',
    services: ['avverkning', 'markberedning'],
    parcel_id: 'p4',
    parcel_name: 'Granudden',
    area_ha: 31.9,
    estimated_volume_m3: 450,
    preferred_timeline: 'Mars–April 2026',
    requirements: ['FSC-certifierad', 'Markberedare'],
    budget_min: null,
    budget_max: null,
    description: 'Slutavverkning av barkborreskadad granskog. Akut behov. Markberedning direkt efter avverkning för att säkra föryngring. Delar av beståndet har stående döda träd.',
    status: 'contractor_selected',
    created_at: '2026-03-01T06:00:00Z',
    selected_bid_id: 'bid-4',
    photos: [],
    invoice_status: 'none',
    bids: [
      {
        id: 'bid-4',
        job_id: 'mj-2',
        contractor_id: 'mc-2',
        contractor_name: 'Ekströms Maskin',
        contractor_rating: 4.9,
        price_sek: 165000,
        timeline: '17–28 mars 2026',
        included_services: ['Slutavverkning', 'Utkörning', 'Upparbetning av stormskador'],
        equipment: ['Ponsse Scorpion King skördare', 'Ponsse Elephant skotare'],
        message: 'Vi har erfarenhet av avverkning i barkborreskadad skog. Kan prioritera detta jobb. Markberedning utförs av samarbetspartner.',
        submitted_at: '2026-03-02T10:00:00Z',
      },
    ],
  },
  {
    id: 'mj-3',
    services: ['plantering'],
    parcel_id: 'p3',
    parcel_name: 'Tallmon',
    area_ha: 15.0,
    estimated_volume_m3: null,
    preferred_timeline: 'Maj 2026',
    requirements: ['Skogsstyrelsen certifierad plantör'],
    budget_min: 20000,
    budget_max: 35000,
    description: 'Plantering av 4000 tallplantor efter förra höstens avverkning. Markberedd med harvning. Lätt terräng, sandig moränmark.',
    status: 'work_started',
    created_at: '2026-02-15T10:00:00Z',
    selected_bid_id: 'bid-5',
    photos: [],
    invoice_status: 'none',
    bids: [
      {
        id: 'bid-5',
        job_id: 'mj-3',
        contractor_id: 'mc-8',
        contractor_name: 'Kronobergs Planteringsservice',
        contractor_rating: 4.8,
        price_sek: 28000,
        timeline: '5–8 maj 2026',
        included_services: ['Plantering', 'Planthantering', 'Kvalitetskontroll'],
        equipment: ['Pottiputki planteringsrör'],
        message: 'Vi har mycket erfarenhet av tallplantering i sandig mark. Priset inkluderar kvalitetskontroll efter plantering. Plantor ingår ej.',
        submitted_at: '2026-02-18T13:00:00Z',
      },
    ],
  },
  {
    id: 'mj-4',
    services: ['dikesrensning'],
    parcel_id: 'p5',
    parcel_name: 'Björklund',
    area_ha: 55.0,
    estimated_volume_m3: null,
    preferred_timeline: 'Sommar 2026',
    requirements: [],
    budget_min: 40000,
    budget_max: 60000,
    description: 'Dikesrensning av ca 2 km skogsdiken. Dikena har inte rensats på 15+ år och är igenvuxna. Torvmark med risk för körskador vid fel tidpunkt.',
    status: 'posted',
    created_at: '2026-03-14T12:00:00Z',
    selected_bid_id: null,
    photos: [],
    invoice_status: 'none',
    bids: [],
  },
];

// ─── Hook ───

export function useContractorMarketplace(): UseContractorMarketplaceReturn {
  const [contractors, setContractors] = useState<MarketplaceContractor[]>([]);
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<MarketplaceFilters>({
    search: '',
    services: [],
    location: '',
    minRating: 0,
    priceRange: null,
    availableMonth: null,
    sortBy: 'rating',
  });

  // Parcel centers for distance calculation
  const parcelCenters = useMemo(
    () => DEMO_PARCELS.map((p) => p.center as [number, number]),
    [],
  );

  // Load data
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          if (!cancelled) {
            setContractors(DEMO_MARKETPLACE_CONTRACTORS);
            setJobs(DEMO_JOBS);
          }
        } else {
          const [contractorRes, jobRes] = await Promise.allSettled([
            supabase.from('marketplace_contractors').select('*').order('rating', { ascending: false }),
            supabase.from('marketplace_jobs').select('*, marketplace_bids(*)').order('created_at', { ascending: false }),
          ]);

          if (!cancelled) {
            if (contractorRes.status === 'fulfilled' && contractorRes.value.data) {
              setContractors(contractorRes.value.data as unknown as MarketplaceContractor[]);
            }
            if (jobRes.status === 'fulfilled' && jobRes.value.data) {
              setJobs(jobRes.value.data as unknown as JobPosting[]);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load marketplace data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Distance from nearest parcel
  const getDistance = useCallback(
    (contractor: MarketplaceContractor): number => {
      if (parcelCenters.length === 0) return 0;
      let minDist = Infinity;
      for (const center of parcelCenters) {
        const d = haversineKm(center, contractor.coordinates);
        if (d < minDist) minDist = d;
      }
      return Math.round(minDist * 10) / 10;
    },
    [parcelCenters],
  );

  // Filter & sort contractors
  const filteredContractors = useMemo(() => {
    let result = [...contractors];

    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.contact_person.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q),
      );
    }

    if (filters.services.length > 0) {
      result = result.filter((c) =>
        c.services.some((s) => filters.services.includes(s)),
      );
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      result = result.filter((c) => c.location.toLowerCase().includes(loc));
    }

    if (filters.minRating > 0) {
      result = result.filter((c) => c.rating >= filters.minRating);
    }

    if (filters.priceRange) {
      result = result.filter((c) => c.price_range === filters.priceRange);
    }

    if (filters.availableMonth) {
      result = result.filter(
        (c) => c.availability_months[filters.availableMonth!] === 'green',
      );
    }

    switch (filters.sortBy) {
      case 'distance':
        result.sort((a, b) => getDistance(a) - getDistance(b));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'price': {
        const priceOrder: Record<PriceRange, number> = { '€': 1, '€€': 2, '€€€': 3 };
        result.sort((a, b) => priceOrder[a.price_range] - priceOrder[b.price_range]);
        break;
      }
      case 'name':
        result.sort((a, b) => a.company_name.localeCompare(b.company_name, 'sv'));
        break;
    }

    return result;
  }, [contractors, filters, getDistance]);

  const setFilters = (partial: Partial<MarketplaceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  // Active jobs (not complete)
  const activeJobs = useMemo(
    () => jobs.filter((j) => j.status !== 'complete'),
    [jobs],
  );

  // Post a new job
  const postJob = useCallback((data: JobPostFormData) => {
    const parcel = DEMO_PARCELS.find((p) => p.id === data.parcel_id);
    const newJob: JobPosting = {
      id: `mj-${Date.now()}`,
      ...data,
      parcel_name: parcel?.name ?? 'Okänt skifte',
      status: 'posted',
      created_at: new Date().toISOString(),
      bids: [],
      selected_bid_id: null,
      photos: [],
      invoice_status: 'none',
    };
    setJobs((prev) => [newJob, ...prev]);
  }, []);

  // Accept bid
  const acceptBid = useCallback((jobId: string, bidId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, selected_bid_id: bidId, status: 'contractor_selected' as JobStatus }
          : j,
      ),
    );
  }, []);

  // Reject bid
  const rejectBid = useCallback((jobId: string, bidId: string) => {
    setJobs((prev) =>
      prev.map((j) =>
        j.id === jobId
          ? { ...j, bids: j.bids.filter((b) => b.id !== bidId) }
          : j,
      ),
    );
  }, []);

  // Advance job status
  const advanceJobStatus = useCallback((jobId: string) => {
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id !== jobId) return j;
        const idx = JOB_STATUS_ORDER.indexOf(j.status);
        if (idx < JOB_STATUS_ORDER.length - 1) {
          return { ...j, status: JOB_STATUS_ORDER[idx + 1] };
        }
        return j;
      }),
    );
  }, []);

  return {
    contractors,
    filteredContractors,
    filters,
    setFilters,
    getDistance,
    jobs,
    activeJobs,
    postJob,
    acceptBid,
    rejectBid,
    advanceJobStatus,
    loading,
    error,
  };
}

/**
 * useContractors — Fetch and filter forestry contractors with demo data.
 *
 * Provides 8 Swedish forestry contractors in Smaland/Gotaland region,
 * 3 demo bookings at different stages, and filtering/sorting logic.
 */

import { useState, useEffect, useMemo } from 'react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ───

export type ServiceType =
  | 'avverkning'
  | 'gallring'
  | 'markberedning'
  | 'plantering'
  | 'transport';

export type MachineType =
  | 'skordare'
  | 'skotare'
  | 'lastbil'
  | 'markberedare'
  | 'planteringsmaskin';

export type AvailabilityStatus = 'available' | 'limited' | 'unavailable';

export type BookingStatus =
  | 'requested'
  | 'quoted'
  | 'confirmed'
  | 'in_progress'
  | 'completed';

export const ALL_SERVICE_TYPES: ServiceType[] = [
  'avverkning',
  'gallring',
  'markberedning',
  'plantering',
  'transport',
];

export const ALL_MACHINE_TYPES: MachineType[] = [
  'skordare',
  'skotare',
  'lastbil',
  'markberedare',
  'planteringsmaskin',
];

export interface ContractorReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Machine {
  type: MachineType;
  model: string;
  year: number;
}

export interface Contractor {
  id: string;
  company_name: string;
  contact_person: string;
  logo_url: string | null;
  service_types: ServiceType[];
  machines: Machine[];
  service_counties: string[];
  coordinates: [number, number]; // [lng, lat] WGS84
  rating: number;
  review_count: number;
  availability: AvailabilityStatus;
  certifications: string[];
  description: string;
  phone: string;
  email: string;
  website: string | null;
  org_number: string; // Swedish org number
  reviews: ContractorReview[];
  availabilityCalendar: AvailabilityDay[];
}

export interface AvailabilityDay {
  date: string; // YYYY-MM-DD
  status: 'available' | 'booked' | 'tentative';
}

export interface Booking {
  id: string;
  contractor_id: string;
  contractor_name: string;
  parcel_id: string;
  parcel_name: string;
  service_type: ServiceType;
  status: BookingStatus;
  requested_date: string;
  start_date: string | null;
  end_date: string | null;
  volume_estimate: number; // m3fub
  price_estimate: number | null; // SEK
  notes: string;
}

export interface ContractorFilters {
  search: string;
  serviceTypes: ServiceType[];
  county: string | null;
  availability: AvailabilityStatus | null;
  sortBy: 'distance' | 'rating' | 'name';
}

export interface UseContractorsReturn {
  contractors: Contractor[];
  filteredContractors: Contractor[];
  bookings: Booking[];
  loading: boolean;
  error: string | null;
  filters: ContractorFilters;
  setFilters: (f: Partial<ContractorFilters>) => void;
  getDistance: (contractor: Contractor) => number | null;
  getContractorById: (id: string) => Contractor | undefined;
  getNextBooking: () => Booking | null;
}

// ─── Distance helper (Haversine) ───

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

// ─── Calendar generator ───

function generateCalendar(): AvailabilityDay[] {
  const days: AvailabilityDay[] = [];
  const today = new Date();
  for (let i = 0; i < 60; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const rand = Math.random();
    days.push({
      date: d.toISOString().split('T')[0],
      status: rand > 0.6 ? 'available' : rand > 0.3 ? 'booked' : 'tentative',
    });
  }
  return days;
}

// ─── Demo Data ───

const DEMO_CONTRACTORS: Contractor[] = [
  {
    id: 'ctr-1',
    company_name: 'Johanssons Skogsentreprenad AB',
    contact_person: 'Per Johansson',
    logo_url: null,
    service_types: ['avverkning', 'gallring'],
    machines: [
      { type: 'skordare', model: 'John Deere 1270G', year: 2022 },
      { type: 'skotare', model: 'John Deere 1210G', year: 2023 },
      { type: 'skordare', model: 'John Deere 1170G', year: 2020 },
    ],
    service_counties: ['Jönköping', 'Kronoberg'],
    coordinates: [14.16, 57.35],
    rating: 4.8,
    review_count: 37,
    availability: 'available',
    certifications: ['PEFC', 'FSC Chain of Custody', 'ISO 14001'],
    description: 'Familjeföretag sedan 1978 med fokus på skonsam avverkning och gallring i Småland. Modern maskinpark och erfarna förare.',
    phone: '+46 70 234 5678',
    email: 'per@johanssonsskog.se',
    website: 'https://johanssonsskog.se',
    org_number: '556789-1234',
    reviews: [
      { id: 'cr1', author_name: 'Anna L.', rating: 5, comment: 'Utmärkt gallringsarbete. Minimala markskador trots blöt höst.', date: '2026-02-20' },
      { id: 'cr2', author_name: 'Erik S.', rating: 5, comment: 'Professionella och punktliga. Rekommenderas varmt.', date: '2026-01-15' },
      { id: 'cr3', author_name: 'Gunnar T.', rating: 4, comment: 'Bra jobb med slutavverkningen. Lite sena med uppstarten.', date: '2025-12-01' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-2',
    company_name: 'Sydskog Maskin AB',
    contact_person: 'Maria Andersson',
    logo_url: null,
    service_types: ['avverkning', 'gallring', 'markberedning'],
    machines: [
      { type: 'skordare', model: 'Ponsse Scorpion King', year: 2024 },
      { type: 'skotare', model: 'Ponsse Elephant', year: 2023 },
      { type: 'markberedare', model: 'Bracke T26.a', year: 2021 },
    ],
    service_counties: ['Jönköping', 'Kronoberg', 'Kalmar'],
    coordinates: [14.53, 57.12],
    rating: 4.6,
    review_count: 52,
    availability: 'limited',
    certifications: ['PEFC', 'FSC Chain of Custody'],
    description: 'Södra Smålands största skogsentreprenadföretag. Komplett maskinpark för alla typer av skogsarbeten.',
    phone: '+46 73 456 7890',
    email: 'maria@sydskog.se',
    website: 'https://sydskog.se',
    org_number: '556823-5678',
    reviews: [
      { id: 'cr4', author_name: 'Lars P.', rating: 5, comment: 'Effektiv markberedning. Bra resultat.', date: '2026-03-05' },
      { id: 'cr5', author_name: 'Karin M.', rating: 4, comment: 'Bra maskinpark men lite svårt att boka under högsäsong.', date: '2026-01-20' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-3',
    company_name: 'Vätterbygdens Skogsservice',
    contact_person: 'Anders Eriksson',
    logo_url: null,
    service_types: ['gallring', 'plantering'],
    machines: [
      { type: 'skordare', model: 'Komatsu 931XC', year: 2021 },
      { type: 'skotare', model: 'Komatsu 855', year: 2022 },
      { type: 'planteringsmaskin', model: 'Bracke P11.a', year: 2020 },
    ],
    service_counties: ['Jönköping', 'Östergötland'],
    coordinates: [14.28, 57.78],
    rating: 4.9,
    review_count: 21,
    availability: 'available',
    certifications: ['PEFC', 'Skogsstyrelsen Certifierad Plantör'],
    description: 'Specialister på gallring och föryngringsarbeten kring Vättern. Hög kvalitet och omsorg om framtidsskogen.',
    phone: '+46 72 567 8901',
    email: 'anders@vatterbygden.se',
    website: null,
    org_number: '556901-2345',
    reviews: [
      { id: 'cr6', author_name: 'Birgit K.', rating: 5, comment: 'Fantastisk gallring! Skogen ser jättefin ut.', date: '2026-02-10' },
      { id: 'cr7', author_name: 'Ola N.', rating: 5, comment: 'Bästa planteringen vi haft. 96% överlevnad efter ett år.', date: '2026-01-08' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-4',
    company_name: 'Kronobergs Skogstransport',
    contact_person: 'Stefan Nilsson',
    logo_url: null,
    service_types: ['transport'],
    machines: [
      { type: 'lastbil', model: 'Scania R660 Timmerbil', year: 2023 },
      { type: 'lastbil', model: 'Scania R660 Timmerbil', year: 2024 },
      { type: 'lastbil', model: 'Volvo FH16 Timmerbil', year: 2022 },
    ],
    service_counties: ['Kronoberg', 'Jönköping', 'Kalmar', 'Halland'],
    coordinates: [14.80, 56.88],
    rating: 4.4,
    review_count: 44,
    availability: 'available',
    certifications: ['PEFC Chain of Custody', 'ADR'],
    description: 'Pålitlig timmertransport i hela Götaland. Fyra moderna timmervagnar med kran. Snabb och flexibel leverans till sågverk och massabruk.',
    phone: '+46 70 678 9012',
    email: 'stefan@kbgtransport.se',
    website: 'https://kbgtransport.se',
    org_number: '556712-6789',
    reviews: [
      { id: 'cr8', author_name: 'Magnus A.', rating: 5, comment: 'Alltid i tid. Bra kommunikation.', date: '2026-03-01' },
      { id: 'cr9', author_name: 'Svea L.', rating: 4, comment: 'Pålitlig transport. Rimliga priser.', date: '2026-02-05' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-5',
    company_name: 'Eksjö Skog & Mark AB',
    contact_person: 'Henrik Larsson',
    logo_url: null,
    service_types: ['markberedning', 'plantering'],
    machines: [
      { type: 'markberedare', model: 'Bracke T26.a', year: 2023 },
      { type: 'planteringsmaskin', model: 'Bracke P11.a', year: 2022 },
      { type: 'skotare', model: 'Ponsse Wisent', year: 2021 },
    ],
    service_counties: ['Jönköping', 'Östergötland', 'Kalmar'],
    coordinates: [14.97, 57.67],
    rating: 4.7,
    review_count: 19,
    availability: 'limited',
    certifications: ['PEFC', 'Skogsstyrelsen Certifierad Plantör'],
    description: 'Specialiserade på markberedning och plantering i östra Småland. Hög planteringsöverlevnad tack vare noggrann markberedning.',
    phone: '+46 76 789 0123',
    email: 'henrik@eksjoskog.se',
    website: 'https://eksjoskog.se',
    org_number: '556834-3456',
    reviews: [
      { id: 'cr10', author_name: 'Eva B.', rating: 5, comment: 'Perfekt markberedning för vår granplantering.', date: '2026-02-15' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-6',
    company_name: 'Gislaved Entreprenad',
    contact_person: 'Johan Svensson',
    logo_url: null,
    service_types: ['avverkning', 'gallring', 'transport'],
    machines: [
      { type: 'skordare', model: 'John Deere 1470G', year: 2024 },
      { type: 'skotare', model: 'John Deere 1510G', year: 2024 },
      { type: 'lastbil', model: 'Scania R580 Timmerbil', year: 2023 },
    ],
    service_counties: ['Jönköping', 'Halland', 'Västra Götaland'],
    coordinates: [13.54, 57.30],
    rating: 4.5,
    review_count: 33,
    availability: 'unavailable',
    certifications: ['PEFC', 'FSC Chain of Custody', 'ISO 9001'],
    description: 'Helhetslösning från stubbe till sågverk. Vi sköter avverkning, gallring och transport i ett paket.',
    phone: '+46 70 890 1234',
    email: 'johan@gislavedentreprenad.se',
    website: 'https://gislavedentreprenad.se',
    org_number: '556945-7890',
    reviews: [
      { id: 'cr11', author_name: 'Nils G.', rating: 5, comment: 'Smidigt med allt i ett paket. Bra pris.', date: '2026-01-25' },
      { id: 'cr12', author_name: 'Margareta H.', rating: 4, comment: 'Professionellt jobb. Snabb leverans till sågverket.', date: '2025-12-15' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-7',
    company_name: 'Norra Smålands Gallring',
    contact_person: 'Karl Gustafsson',
    logo_url: null,
    service_types: ['gallring'],
    machines: [
      { type: 'skordare', model: 'Ponsse Ergo', year: 2022 },
      { type: 'skotare', model: 'Ponsse Elk', year: 2023 },
    ],
    service_counties: ['Jönköping', 'Östergötland'],
    coordinates: [14.69, 57.92],
    rating: 4.8,
    review_count: 16,
    availability: 'available',
    certifications: ['PEFC'],
    description: 'Gallringsspecialister. Vi optimerar din framtidsskog med rätt uttag och minimal markpåverkan.',
    phone: '+46 73 012 3456',
    email: 'karl@nsggallring.se',
    website: null,
    org_number: '556867-4567',
    reviews: [
      { id: 'cr13', author_name: 'Ingvar F.', rating: 5, comment: 'Bästa gallringsresultatet jag sett. Rätt stammar kvarlämnade.', date: '2026-03-10' },
    ],
    availabilityCalendar: generateCalendar(),
  },
  {
    id: 'ctr-8',
    company_name: 'Alvesta Skogsmaskin',
    contact_person: 'Lena Bergström',
    logo_url: null,
    service_types: ['avverkning', 'markberedning', 'plantering', 'transport'],
    machines: [
      { type: 'skordare', model: 'Komatsu 951XC', year: 2024 },
      { type: 'skotare', model: 'Komatsu 895', year: 2023 },
      { type: 'markberedare', model: 'Bracke T35.a', year: 2022 },
      { type: 'lastbil', model: 'Volvo FH16 Timmerbil', year: 2024 },
    ],
    service_counties: ['Kronoberg', 'Jönköping', 'Kalmar', 'Blekinge'],
    coordinates: [14.56, 56.90],
    rating: 4.3,
    review_count: 28,
    availability: 'limited',
    certifications: ['PEFC', 'FSC Chain of Custody', 'ISO 14001', 'ADR'],
    description: 'Komplett skogsentreprenad med allt från avverkning till transport. Stort verksamhetsområde i södra Sverige.',
    phone: '+46 72 123 4567',
    email: 'lena@alvestaskog.se',
    website: 'https://alvestaskog.se',
    org_number: '556778-8901',
    reviews: [
      { id: 'cr14', author_name: 'Bengt O.', rating: 4, comment: 'Bra att kunna boka hela kedjan. Smidig process.', date: '2026-02-28' },
      { id: 'cr15', author_name: 'Stig R.', rating: 4, comment: 'Bra maskiner och kunnig personal. Lite lång väntetid.', date: '2026-01-10' },
    ],
    availabilityCalendar: generateCalendar(),
  },
];

const DEMO_BOOKINGS: Booking[] = [
  {
    id: 'bk-1',
    contractor_id: 'ctr-1',
    contractor_name: 'Johanssons Skogsentreprenad AB',
    parcel_id: 'p1',
    parcel_name: 'Norra Skogen',
    service_type: 'gallring',
    status: 'confirmed',
    requested_date: '2026-02-15',
    start_date: '2026-04-07',
    end_date: '2026-04-11',
    volume_estimate: 180,
    price_estimate: 67500,
    notes: 'Förstagallring i 35-årig granskog. Tillgång via skogsbilväg norr.',
  },
  {
    id: 'bk-2',
    contractor_id: 'ctr-2',
    contractor_name: 'Sydskog Maskin AB',
    parcel_id: 'p2',
    parcel_name: 'Ekbacken',
    service_type: 'avverkning',
    status: 'quoted',
    requested_date: '2026-03-01',
    start_date: null,
    end_date: null,
    volume_estimate: 450,
    price_estimate: 157500,
    notes: 'Slutavverkning av stormskadad gran. Behöver markberedning efter.',
  },
  {
    id: 'bk-3',
    contractor_id: 'ctr-5',
    contractor_name: 'Eksjö Skog & Mark AB',
    parcel_id: 'p3',
    parcel_name: 'Söderängarna',
    service_type: 'plantering',
    status: 'in_progress',
    requested_date: '2026-01-10',
    start_date: '2026-03-15',
    end_date: '2026-03-18',
    volume_estimate: 0,
    price_estimate: 28000,
    notes: 'Plantering av 3000 granplantor efter förra årets slutavverkning.',
  },
];

// ─── Hook ───

export function useContractors(): UseContractorsReturn {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ContractorFilters>({
    search: '',
    serviceTypes: [],
    county: null,
    availability: null,
    sortBy: 'distance',
  });

  // Owner's parcel centers for distance calculation
  const parcelCenters = useMemo(
    () => DEMO_PARCELS.map((p) => p.center as [number, number]),
    [],
  );

  // Load contractors
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          if (!cancelled) {
            setContractors(DEMO_CONTRACTORS);
            setBookings(DEMO_BOOKINGS);
          }
        } else {
          const { data, error: dbError } = await supabase
            .from('contractors')
            .select('*')
            .order('rating', { ascending: false });

          if (dbError) throw dbError;

          if (!cancelled && data) {
            setContractors(data as unknown as Contractor[]);
          }

          const { data: bookingData, error: bookingError } = await supabase
            .from('contractor_bookings')
            .select('*')
            .order('requested_date', { ascending: false });

          if (bookingError) throw bookingError;

          if (!cancelled && bookingData) {
            setBookings(bookingData as unknown as Booking[]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load contractors');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Calculate min distance from owner's parcels
  const getDistance = (contractor: Contractor): number | null => {
    if (parcelCenters.length === 0) return null;
    let minDist = Infinity;
    for (const center of parcelCenters) {
      const d = haversineKm(center, contractor.coordinates);
      if (d < minDist) minDist = d;
    }
    return Math.round(minDist * 10) / 10;
  };

  // Filter and sort
  const filteredContractors = useMemo(() => {
    let result = [...contractors];

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (c) =>
          c.company_name.toLowerCase().includes(q) ||
          c.contact_person.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q),
      );
    }

    // Service type filter
    if (filters.serviceTypes.length > 0) {
      result = result.filter((c) =>
        c.service_types.some((s) => filters.serviceTypes.includes(s)),
      );
    }

    // County filter
    if (filters.county) {
      result = result.filter((c) => c.service_counties.includes(filters.county!));
    }

    // Availability filter
    if (filters.availability) {
      result = result.filter((c) => c.availability === filters.availability);
    }

    // Sort
    switch (filters.sortBy) {
      case 'distance':
        result.sort((a, b) => (getDistance(a) ?? Infinity) - (getDistance(b) ?? Infinity));
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'name':
        result.sort((a, b) => a.company_name.localeCompare(b.company_name, 'sv'));
        break;
    }

    return result;
  }, [contractors, filters, parcelCenters]);

  const setFilters = (partial: Partial<ContractorFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  const getContractorById = (id: string) => contractors.find((c) => c.id === id);

  const getNextBooking = (): Booking | null => {
    const active = bookings.filter((b) =>
      ['confirmed', 'in_progress'].includes(b.status),
    );
    if (active.length === 0) return null;
    return active.sort((a, b) => {
      const da = a.start_date ?? a.requested_date;
      const db = b.start_date ?? b.requested_date;
      return da.localeCompare(db);
    })[0];
  };

  return {
    contractors,
    filteredContractors,
    bookings,
    loading,
    error,
    filters,
    setFilters,
    getDistance,
    getContractorById,
    getNextBooking,
  };
}

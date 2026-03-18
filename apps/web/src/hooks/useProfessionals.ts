/**
 * useProfessionals — Fetch and filter professionals from Supabase or demo data.
 *
 * Supports filtering by category, location (län), search query, and sorting
 * by distance from the owner's nearest parcel or rating.
 */

import { useState, useEffect, useMemo } from 'react';
import { isDemo, DEMO_PARCELS } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ───

export type ProfessionalCategory =
  | 'forest_inspector'
  | 'logging_contractor'
  | 'planting_service'
  | 'drone_pilot'
  | 'forest_advisor'
  | 'transport_company';

export const ALL_CATEGORIES: ProfessionalCategory[] = [
  'forest_inspector',
  'logging_contractor',
  'planting_service',
  'drone_pilot',
  'forest_advisor',
  'transport_company',
];

export interface ProfessionalReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Professional {
  id: string;
  name: string;
  company: string;
  avatar_url: string | null;
  categories: ProfessionalCategory[];
  rating: number;
  review_count: number;
  location: string;         // city/town
  county: string;           // län
  coordinates: [number, number]; // [lng, lat] WGS84
  certifications: string[];
  description: string;
  phone: string | null;
  email: string;
  website: string | null;
  services: string[];
  equipment: string[];
  service_area_km: number;
  gallery_urls: string[];
  availability: AvailabilitySlot[];
  reviews: ProfessionalReview[];
}

export interface AvailabilitySlot {
  date: string;         // YYYY-MM-DD
  available: boolean;
}

export interface ProfessionalFilters {
  search: string;
  categories: ProfessionalCategory[];
  county: string | null;
  sortBy: 'distance' | 'rating' | 'name';
}

export interface UseProfessionalsReturn {
  professionals: Professional[];
  filteredProfessionals: Professional[];
  loading: boolean;
  error: string | null;
  filters: ProfessionalFilters;
  setFilters: (f: Partial<ProfessionalFilters>) => void;
  getDistance: (professional: Professional) => number | null;
}

// ─── Swedish Counties (Län) ───

export const SWEDISH_COUNTIES = [
  'Blekinge', 'Dalarna', 'Gävleborg', 'Gotland', 'Halland',
  'Jämtland', 'Jönköping', 'Kalmar', 'Kronoberg', 'Norrbotten',
  'Skåne', 'Stockholm', 'Södermanland', 'Uppsala', 'Värmland',
  'Västerbotten', 'Västernorrland', 'Västmanland', 'Västra Götaland',
  'Örebro', 'Östergötland',
];

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

// ─── Demo Data ───

function generateAvailability(): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    slots.push({
      date: d.toISOString().split('T')[0],
      available: Math.random() > 0.3,
    });
  }
  return slots;
}

const DEMO_PROFESSIONALS: Professional[] = [
  {
    id: 'pro-1',
    name: 'Erik Lindqvist',
    company: 'Lindqvist Skogsinspektion AB',
    avatar_url: null,
    categories: ['forest_inspector', 'forest_advisor'],
    rating: 4.8,
    review_count: 23,
    location: 'Värnamo',
    county: 'Jönköping',
    coordinates: [14.04, 57.18],
    certifications: ['Skogsstyrelsen Registered Inspector', 'FSC Auditor'],
    description: 'Experienced forest inspector with 15+ years in Småland. Specializing in bark beetle assessment, timber valuation, and forest management plans.',
    phone: '+46 70 123 4567',
    email: 'erik@lindqvistsskog.se',
    website: 'https://lindqvistsskog.se',
    services: ['Forest inspection', 'Timber valuation', 'Management plans', 'Bark beetle assessment', 'FSC certification audits'],
    equipment: ['Field measurement tools', 'GPS survey equipment', 'Increment borers'],
    service_area_km: 80,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r1', author_name: 'Anna K.', rating: 5, comment: 'Excellent and thorough inspection. Identified beetle damage early.', date: '2026-02-15' },
      { id: 'r2', author_name: 'Magnus S.', rating: 5, comment: 'Very knowledgeable about local forest conditions. Great management plan.', date: '2026-01-20' },
      { id: 'r3', author_name: 'Lars G.', rating: 4, comment: 'Professional and punctual. Good valuation report.', date: '2025-12-10' },
    ],
  },
  {
    id: 'pro-2',
    name: 'Maria Johansson',
    company: 'SydVäst Avverkning',
    avatar_url: null,
    categories: ['logging_contractor'],
    rating: 4.6,
    review_count: 41,
    location: 'Gislaved',
    county: 'Jönköping',
    coordinates: [13.54, 57.30],
    certifications: ['PEFC Certified Contractor', 'Motorsågskörkort A+B'],
    description: 'Full-service logging contractor covering southern Småland. Modern machinery fleet including harvesters and forwarders. Specializing in thinning and final felling.',
    phone: '+46 73 456 7890',
    email: 'maria@sydvastavverkning.se',
    website: 'https://sydvastavverkning.se',
    services: ['Final felling', 'Thinning', 'Storm damage clearing', 'Road construction', 'Biomass harvesting'],
    equipment: ['John Deere 1270G Harvester', 'John Deere 1210G Forwarder', 'Volvo EC220E Excavator'],
    service_area_km: 100,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r4', author_name: 'Per A.', rating: 5, comment: 'Efficient thinning, minimal ground damage. Very satisfied.', date: '2026-03-01' },
      { id: 'r5', author_name: 'Karin H.', rating: 4, comment: 'Good work but scheduling could be more flexible.', date: '2026-02-05' },
    ],
  },
  {
    id: 'pro-3',
    name: 'Anders Björk',
    company: 'GreenForest Plantering',
    avatar_url: null,
    categories: ['planting_service'],
    rating: 4.9,
    review_count: 18,
    location: 'Jönköping',
    county: 'Jönköping',
    coordinates: [14.16, 57.78],
    certifications: ['Skogsstyrelsen Certified Planter'],
    description: 'Professional planting service with focus on quality and survival rates. Handling everything from site preparation to follow-up care.',
    phone: '+46 72 789 0123',
    email: 'anders@greenforest.se',
    website: null,
    services: ['Machine planting', 'Manual planting', 'Site preparation', 'Scarification', 'Seedling procurement'],
    equipment: ['Bracke P11.a planting machine', 'Scarification equipment'],
    service_area_km: 120,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r6', author_name: 'Eva N.', rating: 5, comment: 'Outstanding survival rate on our spruce replanting. 95%+ after first year.', date: '2026-01-30' },
    ],
  },
  {
    id: 'pro-4',
    name: 'Sofia Ekström',
    company: 'SkyView Drone AB',
    avatar_url: null,
    categories: ['drone_pilot'],
    rating: 4.7,
    review_count: 34,
    location: 'Nässjö',
    county: 'Jönköping',
    coordinates: [14.70, 57.65],
    certifications: ['Certified Drone Pilot (A2)', 'Transportstyrelsen UAS Certificate'],
    description: 'Professional drone operator specializing in forestry surveys. High-resolution orthomosaics, NDVI mapping, and 3D point clouds for forest inventory.',
    phone: '+46 76 345 6789',
    email: 'sofia@skyviewdrone.se',
    website: 'https://skyviewdrone.se',
    services: ['Orthomosaic mapping', 'NDVI surveys', '3D point cloud generation', 'Bark beetle detection flights', 'Storm damage assessment'],
    equipment: ['DJI Matrice 350 RTK', 'DJI Mavic 3 Multispectral', 'MicaSense RedEdge-P'],
    service_area_km: 150,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r7', author_name: 'Johan L.', rating: 5, comment: 'Incredible detail in the orthomosaic. Found beetle damage we missed on foot.', date: '2026-02-28' },
      { id: 'r8', author_name: 'Ulf B.', rating: 4, comment: 'Fast delivery of data products. Good communication.', date: '2026-01-15' },
    ],
  },
  {
    id: 'pro-5',
    name: 'Gustav Holm',
    company: 'Holms Skogsrådgivning',
    avatar_url: null,
    categories: ['forest_advisor', 'forest_inspector'],
    rating: 4.5,
    review_count: 15,
    location: 'Växjö',
    county: 'Kronoberg',
    coordinates: [14.81, 56.88],
    certifications: ['SLU Forest Science MSc', 'Skogsstyrelsen Registered Inspector'],
    description: 'Independent forest advisor with deep expertise in sustainable forestry, climate adaptation, and biodiversity management.',
    phone: '+46 70 567 8901',
    email: 'gustav@holmsskog.se',
    website: 'https://holmsskog.se',
    services: ['Forest management plans', 'Climate adaptation strategy', 'Biodiversity assessment', 'Investment analysis', 'Succession planning'],
    equipment: [],
    service_area_km: 100,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r9', author_name: 'Birgitta F.', rating: 5, comment: 'Gave us a solid 10-year management plan. Very thorough.', date: '2025-11-20' },
    ],
  },
  {
    id: 'pro-6',
    name: 'Karl-Fredrik Nilsson',
    company: 'NordTransport Skog AB',
    avatar_url: null,
    categories: ['transport_company'],
    rating: 4.4,
    review_count: 29,
    location: 'Ljungby',
    county: 'Kronoberg',
    coordinates: [13.94, 56.83],
    certifications: ['ADR Certified', 'PEFC Chain of Custody'],
    description: 'Timber transport and logistics covering southern Sweden. Fleet of modern timber trucks with crane loading. Reliable and punctual delivery to sawmills and pulp mills.',
    phone: '+46 73 890 1234',
    email: 'kf@nordtransport.se',
    website: 'https://nordtransport.se',
    services: ['Timber transport', 'Bioenergy transport', 'Crane loading/unloading', 'Logistics planning'],
    equipment: ['Scania R650 timber trucks (4)', 'Loglift crane systems'],
    service_area_km: 200,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r10', author_name: 'Sven M.', rating: 5, comment: 'Always on time. Great communication about pickup schedules.', date: '2026-03-05' },
    ],
  },
  {
    id: 'pro-7',
    name: 'Ingrid Petersson',
    company: 'Petersson Skogsentreprenad',
    avatar_url: null,
    categories: ['logging_contractor', 'planting_service'],
    rating: 4.3,
    review_count: 22,
    location: 'Eksjö',
    county: 'Jönköping',
    coordinates: [14.97, 57.67],
    certifications: ['PEFC Certified', 'Skogsstyrelsen Certified Planter'],
    description: 'Family-run forestry contractor since 1985. We handle the full cycle from felling to replanting. Known for careful work that respects the forest.',
    phone: '+46 70 234 5678',
    email: 'ingrid@peterssonskog.se',
    website: null,
    services: ['Final felling', 'Thinning', 'Manual planting', 'Scarification', 'Fuel wood processing'],
    equipment: ['Komatsu 931XC Harvester', 'Komatsu 855 Forwarder', 'Bracke planting head'],
    service_area_km: 90,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r11', author_name: 'Nils T.', rating: 4, comment: 'Careful thinning work. Good at preserving valuable trees.', date: '2026-02-10' },
    ],
  },
  {
    id: 'pro-8',
    name: 'Henrik Larsson',
    company: 'DrönareNord',
    avatar_url: null,
    categories: ['drone_pilot'],
    rating: 4.9,
    review_count: 12,
    location: 'Linköping',
    county: 'Östergötland',
    coordinates: [15.62, 58.41],
    certifications: ['Certified Drone Pilot (A2)', 'Transportstyrelsen UAS Certificate', 'LiDAR Processing Specialist'],
    description: 'Drone pilot and remote sensing specialist. Expert in LiDAR-equipped drone surveys for forest inventory, terrain modeling, and individual tree detection.',
    phone: '+46 76 012 3456',
    email: 'henrik@dronarenord.se',
    website: 'https://dronarenord.se',
    services: ['LiDAR forest inventory', 'Individual tree detection', 'Terrain modeling', 'Volume estimation', 'Change detection'],
    equipment: ['DJI Matrice 300 RTK', 'Zenmuse L2 LiDAR', 'DJI Mavic 3E', 'Pix4D + TerraScan processing'],
    service_area_km: 200,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r12', author_name: 'Göran W.', rating: 5, comment: 'The LiDAR inventory was amazingly detailed. Better than traditional methods.', date: '2026-03-10' },
    ],
  },
  {
    id: 'pro-9',
    name: 'Lena Gustafsson',
    company: 'Smålands Skogsservice',
    avatar_url: null,
    categories: ['forest_advisor', 'planting_service'],
    rating: 4.6,
    review_count: 27,
    location: 'Vetlanda',
    county: 'Jönköping',
    coordinates: [15.08, 57.43],
    certifications: ['SLU Certified Forest Manager', 'FSC Group Manager'],
    description: 'Comprehensive forest service provider. From initial consultation and planning to planting and ongoing management. Strong focus on mixed-species forestry for climate resilience.',
    phone: '+46 72 456 7890',
    email: 'lena@smalandskog.se',
    website: 'https://smalandskog.se',
    services: ['Forest management', 'Planting design', 'Mixed forest consultation', 'Grant applications', 'Succession planning', 'Nature conservation assessments'],
    equipment: [],
    service_area_km: 80,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r13', author_name: 'Mats P.', rating: 5, comment: 'Helped us transition to mixed forest. Great advice on species selection.', date: '2026-01-25' },
      { id: 'r14', author_name: 'Helena R.', rating: 4, comment: 'Very knowledgeable about grant opportunities for replanting.', date: '2025-12-01' },
    ],
  },
  {
    id: 'pro-10',
    name: 'Olof Svensson',
    company: 'Svenssons Skogstransport',
    avatar_url: null,
    categories: ['transport_company', 'logging_contractor'],
    rating: 4.2,
    review_count: 35,
    location: 'Alvesta',
    county: 'Kronoberg',
    coordinates: [14.56, 56.90],
    certifications: ['ADR Certified', 'PEFC Certified Contractor'],
    description: 'Combined logging and transport service — from stump to mill. Efficient operations with integrated planning to minimize costs and environmental impact.',
    phone: '+46 73 567 8901',
    email: 'olof@svenssonskog.se',
    website: null,
    services: ['Integrated logging + transport', 'Final felling', 'Forwarding', 'Timber transport', 'Road maintenance'],
    equipment: ['Ponsse Scorpion King Harvester', 'Ponsse Elephant Forwarder', 'Volvo FH16 timber truck (3)'],
    service_area_km: 130,
    gallery_urls: [],
    availability: generateAvailability(),
    reviews: [
      { id: 'r15', author_name: 'Bengt A.', rating: 4, comment: 'Good value having logging and transport in one package.', date: '2026-02-20' },
    ],
  },
];

// ─── Hook ───

export function useProfessionals(): UseProfessionalsReturn {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ProfessionalFilters>({
    search: '',
    categories: [],
    county: null,
    sortBy: 'distance',
  });

  // Owner's parcel centers for distance calculation
  const parcelCenters = useMemo(
    () => DEMO_PARCELS.map((p) => p.center as [number, number]),
    [],
  );

  // Load professionals
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          if (!cancelled) setProfessionals(DEMO_PROFESSIONALS);
        } else {
          // Real Supabase fetch
          const { data, error: dbError } = await supabase
            .from('professionals')
            .select('*')
            .order('rating', { ascending: false });

          if (dbError) throw dbError;

          if (!cancelled && data) {
            setProfessionals(
              data.map((row: Record<string, unknown>) => ({
                id: row.id as string,
                name: row.name as string,
                company: (row.company as string) ?? '',
                avatar_url: (row.avatar_url as string) ?? null,
                categories: (row.categories as ProfessionalCategory[]) ?? [],
                rating: (row.rating as number) ?? 0,
                review_count: (row.review_count as number) ?? 0,
                location: (row.location as string) ?? '',
                county: (row.county as string) ?? '',
                coordinates: (row.coordinates as [number, number]) ?? [0, 0],
                certifications: (row.certifications as string[]) ?? [],
                description: (row.description as string) ?? '',
                phone: (row.phone as string) ?? null,
                email: (row.email as string) ?? '',
                website: (row.website as string) ?? null,
                services: (row.services as string[]) ?? [],
                equipment: (row.equipment as string[]) ?? [],
                service_area_km: (row.service_area_km as number) ?? 50,
                gallery_urls: (row.gallery_urls as string[]) ?? [],
                availability: (row.availability as AvailabilitySlot[]) ?? [],
                reviews: (row.reviews as ProfessionalReview[]) ?? [],
              })),
            );
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load professionals');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Calculate min distance from owner's parcels
  const getDistance = (professional: Professional): number | null => {
    if (parcelCenters.length === 0) return null;
    let minDist = Infinity;
    for (const center of parcelCenters) {
      const d = haversineKm(center, professional.coordinates);
      if (d < minDist) minDist = d;
    }
    return Math.round(minDist * 10) / 10;
  };

  // Filter and sort
  const filteredProfessionals = useMemo(() => {
    let result = [...professionals];

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.company.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.services.some((s) => s.toLowerCase().includes(q)),
      );
    }

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter((p) =>
        p.categories.some((c) => filters.categories.includes(c)),
      );
    }

    // County filter
    if (filters.county) {
      result = result.filter((p) => p.county === filters.county);
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
        result.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
        break;
    }

    return result;
  }, [professionals, filters, parcelCenters]);

  const setFilters = (partial: Partial<ProfessionalFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  return {
    professionals,
    filteredProfessionals,
    loading,
    error,
    filters,
    setFilters,
    getDistance,
  };
}

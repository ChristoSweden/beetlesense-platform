/**
 * useMarketplace — Expert-to-Expert Marketplace hook.
 *
 * Provides demo listings, CRUD operations, filtering/sorting,
 * and booking flow state for the forest owner marketplace.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { isDemo } from '@/lib/demoData';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// ─── Types ───

export type ListingCategory = 'services' | 'equipment' | 'materials' | 'knowledge';
export type PriceType = 'fixed' | 'free' | 'exchange';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface SellerInfo {
  id: string;
  name: string;
  county: string;
  experience_years: number;
  rating: number;
  review_count: number;
  forest_ha: number;
  specialties: string[];
  response_time: string; // e.g. "< 2 hours"
  avatar_url: string | null;
}

export interface SellerReview {
  id: string;
  author_name: string;
  rating: number;
  comment: string;
  date: string;
}

export interface MarketplaceListing {
  id: string;
  category: ListingCategory;
  title: string;
  description: string;
  price_type: PriceType;
  price: number | null; // SEK, null if free/exchange
  price_unit: string | null; // e.g. "per day", "per hour", "per piece", "per plant"
  duration: string | null; // for services
  availability_start: string | null;
  availability_end: string | null;
  location: string;
  coordinates: [number, number]; // [lng, lat] WGS84
  photos: string[];
  seller: SellerInfo;
  created_at: string;
  qualification_notes: string | null;
}

export interface MarketplaceBooking {
  id: string;
  listing_id: string;
  listing_title: string;
  seller_name: string;
  date: string;
  time: string;
  notes: string;
  status: BookingStatus;
  created_at: string;
  contact_email: string;
  contact_phone: string;
}

export interface MarketplaceFilters {
  search: string;
  category: ListingCategory | null;
  county: string | null;
  maxDistance: number | null; // km
  priceRange: [number, number] | null;
  priceType: PriceType | null;
  sortBy: 'newest' | 'price_asc' | 'price_desc' | 'distance' | 'rating';
}

export interface CreateListingData {
  category: ListingCategory;
  title: string;
  description: string;
  price_type: PriceType;
  price: number | null;
  price_unit: string | null;
  duration: string | null;
  availability_start: string | null;
  availability_end: string | null;
  location: string;
  photos: string[];
  qualification_notes: string | null;
}

export interface UseMarketplaceReturn {
  listings: MarketplaceListing[];
  filteredListings: MarketplaceListing[];
  bookings: MarketplaceBooking[];
  loading: boolean;
  error: string | null;
  filters: MarketplaceFilters;
  setFilters: (f: Partial<MarketplaceFilters>) => void;
  getDistance: (listing: MarketplaceListing) => number | null;
  getListingById: (id: string) => MarketplaceListing | undefined;
  getSellerListings: (sellerId: string) => MarketplaceListing[];
  getSellerReviews: (sellerId: string) => SellerReview[];
  createListing: (data: CreateListingData) => void;
  createBooking: (listingId: string, date: string, time: string, notes: string) => MarketplaceBooking;
  nearbyCount: number;
  featuredListing: MarketplaceListing | null;
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

// User's approximate location (Småland/Kronoberg)
const USER_LOCATION: [number, number] = [14.80, 56.88];

// ─── Demo Sellers ───

const DEMO_SELLERS: Record<string, SellerInfo> = {
  erik: {
    id: 'seller-1',
    name: 'Erik Lindqvist',
    county: 'Kronoberg',
    experience_years: 40,
    rating: 4.9,
    review_count: 24,
    forest_ha: 120,
    specialties: ['Gallring', 'Naturvård', 'Viltförvaltning'],
    response_time: '< 2 timmar',
    avatar_url: null,
  },
  anna: {
    id: 'seller-2',
    name: 'Anna Karlsson',
    county: 'Jönköping',
    experience_years: 15,
    rating: 4.7,
    review_count: 18,
    forest_ha: 85,
    specialties: ['Förstagallring', 'Ungskogsskötsel', 'Röjning'],
    response_time: '< 4 timmar',
    avatar_url: null,
  },
  lars: {
    id: 'seller-3',
    name: 'Lars Petersson',
    county: 'Kalmar',
    experience_years: 25,
    rating: 4.5,
    review_count: 12,
    forest_ha: 200,
    specialties: ['Maskinarbete', 'Vägar', 'Dränering'],
    response_time: '< 1 dag',
    avatar_url: null,
  },
  maja: {
    id: 'seller-4',
    name: 'Maja Johansson',
    county: 'Kronoberg',
    experience_years: 10,
    rating: 4.8,
    review_count: 9,
    forest_ha: 45,
    specialties: ['Inventering', 'Skogsbruksplan', 'Mätning'],
    response_time: '< 2 timmar',
    avatar_url: null,
  },
  sven: {
    id: 'seller-5',
    name: 'Sven Olofsson',
    county: 'Kronoberg',
    experience_years: 35,
    rating: 4.6,
    review_count: 31,
    forest_ha: 180,
    specialties: ['Plantering', 'Markberedning', 'Föryngring'],
    response_time: '< 6 timmar',
    avatar_url: null,
  },
  gunilla: {
    id: 'seller-6',
    name: 'Gunilla Svensson',
    county: 'Jönköping',
    experience_years: 20,
    rating: 4.4,
    review_count: 7,
    forest_ha: 65,
    specialties: ['Vedproduktion', 'Biobränsle', 'GROT'],
    response_time: '< 1 dag',
    avatar_url: null,
  },
  per: {
    id: 'seller-7',
    name: 'Per Andersson',
    county: 'Östergötland',
    experience_years: 30,
    rating: 4.9,
    review_count: 42,
    forest_ha: 150,
    specialties: ['Hyggesfritt skogsbruk', 'Kontinuitetsskogsbruk', 'Naturlig föryngring'],
    response_time: '< 2 timmar',
    avatar_url: null,
  },
  karin: {
    id: 'seller-8',
    name: 'Karin Bergström',
    county: 'Kronoberg',
    experience_years: 22,
    rating: 4.8,
    review_count: 35,
    forest_ha: 95,
    specialties: ['Mentorskap', 'Generationsskifte', 'Ekonomi'],
    response_time: '< 3 timmar',
    avatar_url: null,
  },
  johan: {
    id: 'seller-9',
    name: 'Johan Nilsson',
    county: 'Småland',
    experience_years: 8,
    rating: 4.7,
    review_count: 19,
    forest_ha: 30,
    specialties: ['Drönare', 'Fotografi', 'Skogsbruksplan'],
    response_time: '< 1 timme',
    avatar_url: null,
  },
  birgitta: {
    id: 'seller-10',
    name: 'Birgitta Ek',
    county: 'Kalmar',
    experience_years: 18,
    rating: 4.3,
    review_count: 6,
    forest_ha: 110,
    specialties: ['Viltskydd', 'Stängsling', 'Viltvård'],
    response_time: '< 1 dag',
    avatar_url: null,
  },
};

// ─── Demo Listings ───

const DEMO_LISTINGS: MarketplaceListing[] = [
  {
    id: 'mpl-1',
    category: 'services',
    title: 'Guidad skogsvandring med 40 års erfarenhet',
    description: 'Jag visar dig din skog med erfarna ögon. Vi går igenom gallringsbehov, naturvärden, viltspår och skadeinsekter. Perfekt för nya skogsägare eller dig som vill ha ett andra par ögon. Tar max 4 personer per tillfälle.',
    price_type: 'fixed',
    price: 500,
    price_unit: 'per halvdag',
    duration: 'Halvdag (4 tim)',
    availability_start: '2026-04-01',
    availability_end: '2026-10-31',
    location: 'Kronoberg, Växjö-trakten',
    coordinates: [14.81, 56.88],
    photos: [],
    seller: DEMO_SELLERS.erik,
    created_at: '2026-03-10T09:00:00Z',
    qualification_notes: '40 års erfarenhet som skogsägare. Deltagit i SLU:s kurser i naturvårdande skötsel.',
  },
  {
    id: 'mpl-2',
    category: 'services',
    title: 'Hjälp att planera din första gallring',
    description: 'Erfaren skogsägare hjälper dig planera förstagallringen rätt. Vi går igenom stamval, stickvägar, timing och kontakt med entreprenörer. Jag kan även vara med vid uppstart för att säkerställa kvaliteten.',
    price_type: 'fixed',
    price: 800,
    price_unit: 'per dag',
    duration: 'Heldag',
    availability_start: '2026-04-15',
    availability_end: '2026-09-30',
    location: 'Jönköping, Vetlanda-området',
    coordinates: [15.08, 57.43],
    photos: [],
    seller: DEMO_SELLERS.anna,
    created_at: '2026-03-08T14:30:00Z',
    qualification_notes: '15 års erfarenhet, har planerat 30+ gallringar. Certifierad skogsbruksplanerare.',
  },
  {
    id: 'mpl-3',
    category: 'equipment',
    title: 'ATV med släp för lån — vardagar',
    description: 'Polaris Sportsman 570 med tippbart släp. Perfekt för att köra ut plantor, stängselvirke eller verktyg i skogen. Kan hämtas i Kalmar eller så kör jag ut den mot milersättning. Försäkrad och servad.',
    price_type: 'fixed',
    price: 200,
    price_unit: 'per dag',
    duration: null,
    availability_start: '2026-03-15',
    availability_end: '2026-12-31',
    location: 'Kalmar, Nybro',
    coordinates: [15.90, 56.74],
    photos: [],
    seller: DEMO_SELLERS.lars,
    created_at: '2026-03-12T08:15:00Z',
    qualification_notes: null,
  },
  {
    id: 'mpl-4',
    category: 'equipment',
    title: 'Klave (caliper) + höjdmätare för lån',
    description: 'Haglöf Mantax Blue dataklave och Vertex IV höjdmätare. Perfekt om du vill göra egen inventering eller kolla volym inför avverkning. Kan lånas gratis mot att du hämtar och lämnar i Växjö.',
    price_type: 'free',
    price: null,
    price_unit: null,
    duration: null,
    availability_start: '2026-03-01',
    availability_end: null,
    location: 'Kronoberg, Växjö',
    coordinates: [14.82, 56.88],
    photos: [],
    seller: DEMO_SELLERS.maja,
    created_at: '2026-03-05T11:45:00Z',
    qualification_notes: null,
  },
  {
    id: 'mpl-5',
    category: 'materials',
    title: '2000 granplantor redo för upphämtning',
    description: 'Picea abies, 2-åriga pluggplantor från Södra. Frö från zon 2. Förvaras i kylcontainer till planteringssäsongen. Minsta köp 100 st. Hämtas på gården i Alvesta.',
    price_type: 'fixed',
    price: 3,
    price_unit: 'per planta',
    duration: null,
    availability_start: '2026-04-01',
    availability_end: '2026-05-31',
    location: 'Kronoberg, Alvesta',
    coordinates: [14.55, 56.90],
    photos: [],
    seller: DEMO_SELLERS.sven,
    created_at: '2026-03-11T07:00:00Z',
    qualification_notes: null,
  },
  {
    id: 'mpl-6',
    category: 'materials',
    title: 'Gratis ved — kom och hämta',
    description: 'Björkved från röjning, ca 5 kubikmeter. Kapat i 50 cm längd men ej kluvet. Ligger vid skogsbilväg ca 3 km från Skillingaryd. Först till kvarn! Tar gärna hjälp att forsla bort.',
    price_type: 'free',
    price: null,
    price_unit: null,
    duration: null,
    availability_start: '2026-03-01',
    availability_end: '2026-04-30',
    location: 'Jönköping, Skillingaryd',
    coordinates: [14.09, 57.43],
    photos: [],
    seller: DEMO_SELLERS.gunilla,
    created_at: '2026-03-14T16:20:00Z',
    qualification_notes: null,
  },
  {
    id: 'mpl-7',
    category: 'knowledge',
    title: 'Fråga mig om hyggesfritt skogsbruk',
    description: 'Jag har brukat 150 ha hyggesfritt i 20 år och delar gärna med mig av erfarenheter, misstag och framgångar. Öppen för frågor via meddelande, telefonsamtal eller besök i min skog i Östergötland.',
    price_type: 'free',
    price: null,
    price_unit: null,
    duration: null,
    availability_start: null,
    availability_end: null,
    location: 'Östergötland, Ydre',
    coordinates: [15.27, 57.86],
    photos: [],
    seller: DEMO_SELLERS.per,
    created_at: '2026-03-09T10:00:00Z',
    qualification_notes: '30 års skogsbruk, varav 20 år hyggesfritt. Föreläser för Skogsstyrelsen och LRF.',
  },
  {
    id: 'mpl-8',
    category: 'knowledge',
    title: 'Mentor för nya skogsägare',
    description: 'Har du ärvt eller köpt skog och känner dig osäker? Jag erbjuder mentorskap: vi går igenom skogsbruksplanen, diskuterar mål och strategi, och jag följer dig genom ditt första verksamhetsår. Både digitalt och på plats.',
    price_type: 'fixed',
    price: 400,
    price_unit: 'per timme',
    duration: 'Per timme',
    availability_start: '2026-03-01',
    availability_end: null,
    location: 'Kronoberg, Ljungby',
    coordinates: [13.94, 56.83],
    photos: [],
    seller: DEMO_SELLERS.karin,
    created_at: '2026-03-07T13:10:00Z',
    qualification_notes: '22 års erfarenhet, skogsbruksplanerare och föreningsaktiv i Södra Skogsägarna. Certifierad coach.',
  },
  {
    id: 'mpl-9',
    category: 'services',
    title: 'Drönefotografering för skogsbruksplan',
    description: 'Professionell drönefotografering av dina skogsskiften. Du får ortofoto, 3D-modell och volymuppskattning. Perfekt underlag för ny skogsbruksplan eller innan gallring/avverkning. DJI Mavic 3 Enterprise med RTK.',
    price_type: 'fixed',
    price: 1500,
    price_unit: 'per uppdrag',
    duration: 'Halvdag',
    availability_start: '2026-04-01',
    availability_end: '2026-10-31',
    location: 'Småland, Gnosjö-trakten',
    coordinates: [13.73, 57.36],
    photos: [],
    seller: DEMO_SELLERS.johan,
    created_at: '2026-03-13T09:45:00Z',
    qualification_notes: 'A2-certifierad drönarpilot. 200+ uppdrag genomförda. Samarbetar med Skogsstyrelsen.',
  },
  {
    id: 'mpl-10',
    category: 'materials',
    title: 'Viltskydd (tubskydd), begagnade',
    description: 'Ca 500 st Plantek tubskydd, 120 cm, bruna. Använda en säsong, i gott skick. Skyddar plantorna mot rådjur och hare. Kan hämtas i Emmaboda eller levereras mot frakt.',
    price_type: 'fixed',
    price: 5,
    price_unit: 'per styck',
    duration: null,
    availability_start: '2026-03-01',
    availability_end: '2026-06-30',
    location: 'Kalmar, Emmaboda',
    coordinates: [15.53, 56.63],
    photos: [],
    seller: DEMO_SELLERS.birgitta,
    created_at: '2026-03-06T15:30:00Z',
    qualification_notes: null,
  },
];

// ─── Demo Reviews ───

const DEMO_REVIEWS: Record<string, SellerReview[]> = {
  'seller-1': [
    { id: 'r1', author_name: 'Magnus L.', rating: 5, comment: 'Fantastisk vandring! Erik lärde mig mer på 4 timmar än jag lärt mig på 2 år.', date: '2026-02-20' },
    { id: 'r2', author_name: 'Sara K.', rating: 5, comment: 'Otrolig kunskap om skadeinsekter. Hittade granbarkborre som jag helt missat.', date: '2026-01-15' },
    { id: 'r3', author_name: 'Thomas B.', rating: 4, comment: 'Mycket lärorikt. Erik är tålmodig och pedagogisk.', date: '2025-12-10' },
  ],
  'seller-2': [
    { id: 'r4', author_name: 'Ola P.', rating: 5, comment: 'Anna hjälpte oss planera gallringen perfekt. Entreprenören var imponerad av stämplingsplanen.', date: '2026-02-28' },
    { id: 'r5', author_name: 'Lena M.', rating: 4, comment: 'Bra rådgivning. Sparade oss säkert 20 000 kr genom att tajma gallringen rätt.', date: '2026-01-20' },
  ],
  'seller-7': [
    { id: 'r6', author_name: 'Henrik S.', rating: 5, comment: 'Per är en levande encyklopedi om hyggesfritt. Hans skog är beviset att det fungerar.', date: '2026-03-05' },
    { id: 'r7', author_name: 'Maria A.', rating: 5, comment: 'Tack för all tid och kunskap. Helt avgörande för vår omställning.', date: '2026-02-10' },
  ],
  'seller-8': [
    { id: 'r8', author_name: 'Gustav N.', rating: 5, comment: 'Karin är den bästa mentorn man kan tänka sig som ny skogsägare.', date: '2026-03-01' },
    { id: 'r9', author_name: 'Ingrid F.', rating: 5, comment: 'Strukturerad och varm. Hjälpte mig förstå min skogsbruksplan från A till Ö.', date: '2026-02-15' },
    { id: 'r10', author_name: 'Björn E.', rating: 4, comment: 'Bra stöd under generationsskiftet. Rekommenderas.', date: '2026-01-05' },
  ],
  'seller-9': [
    { id: 'r11', author_name: 'Fredrik L.', rating: 5, comment: 'Fantastiska bilder och 3D-modell. Skogsbruksplaneraren var mycket nöjd med underlaget.', date: '2026-03-10' },
  ],
};

// ─── Hook ───

export function useMarketplace(): UseMarketplaceReturn {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [bookings, setBookings] = useState<MarketplaceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<MarketplaceFilters>({
    search: '',
    category: null,
    county: null,
    maxDistance: null,
    priceRange: null,
    priceType: null,
    sortBy: 'newest',
  });

  // Load listings
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isDemo() || !isSupabaseConfigured) {
          if (!cancelled) {
            setListings(DEMO_LISTINGS);
          }
        } else {
          const { data, error: dbError } = await supabase
            .from('marketplace_listings')
            .select('*')
            .order('created_at', { ascending: false });

          if (dbError) throw dbError;

          if (!cancelled && data) {
            setListings(data as unknown as MarketplaceListing[]);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load marketplace');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  const getDistance = useCallback((listing: MarketplaceListing): number | null => {
    return Math.round(haversineKm(USER_LOCATION, listing.coordinates) * 10) / 10;
  }, []);

  // Filter and sort
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Category filter
    if (filters.category) {
      result = result.filter((l) => l.category === filters.category);
    }

    // Search filter
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.description.toLowerCase().includes(q) ||
          l.seller.name.toLowerCase().includes(q) ||
          l.location.toLowerCase().includes(q),
      );
    }

    // County filter
    if (filters.county) {
      result = result.filter((l) => l.seller.county === filters.county);
    }

    // Distance filter
    if (filters.maxDistance) {
      result = result.filter((l) => {
        const d = getDistance(l);
        return d !== null && d <= filters.maxDistance!;
      });
    }

    // Price type filter
    if (filters.priceType) {
      result = result.filter((l) => l.price_type === filters.priceType);
    }

    // Price range filter
    if (filters.priceRange) {
      const [min, max] = filters.priceRange;
      result = result.filter((l) => {
        if (l.price === null) return min === 0;
        return l.price >= min && l.price <= max;
      });
    }

    // Sort
    switch (filters.sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'price_asc':
        result.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price_desc':
        result.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'distance':
        result.sort((a, b) => (getDistance(a) ?? Infinity) - (getDistance(b) ?? Infinity));
        break;
      case 'rating':
        result.sort((a, b) => b.seller.rating - a.seller.rating);
        break;
    }

    return result;
  }, [listings, filters, getDistance]);

  const setFilters = (partial: Partial<MarketplaceFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  };

  const getListingById = (id: string) => listings.find((l) => l.id === id);

  const getSellerListings = (sellerId: string) =>
    listings.filter((l) => l.seller.id === sellerId);

  const getSellerReviews = (sellerId: string): SellerReview[] =>
    DEMO_REVIEWS[sellerId] ?? [];

  const createListing = (data: CreateListingData) => {
    const newListing: MarketplaceListing = {
      id: `mpl-${Date.now()}`,
      ...data,
      coordinates: USER_LOCATION,
      seller: {
        id: 'current-user',
        name: 'Du',
        county: 'Kronoberg',
        experience_years: 5,
        rating: 0,
        review_count: 0,
        forest_ha: 50,
        specialties: [],
        response_time: '< 1 dag',
        avatar_url: null,
      },
      created_at: new Date().toISOString(),
    };
    setListings((prev) => [newListing, ...prev]);
  };

  const createBooking = (
    listingId: string,
    date: string,
    time: string,
    notes: string,
  ): MarketplaceBooking => {
    const listing = getListingById(listingId);
    const booking: MarketplaceBooking = {
      id: `bk-${Date.now()}`,
      listing_id: listingId,
      listing_title: listing?.title ?? '',
      seller_name: listing?.seller.name ?? '',
      date,
      time,
      notes,
      status: 'pending',
      created_at: new Date().toISOString(),
      contact_email: `${listing?.seller.name.split(' ')[0].toLowerCase()}@skog.se`,
      contact_phone: '+46 70 123 4567',
    };
    setBookings((prev) => [booking, ...prev]);
    return booking;
  };

  // Nearby listings (within 50 km)
  const nearbyCount = useMemo(
    () => listings.filter((l) => (getDistance(l) ?? Infinity) <= 50).length,
    [listings, getDistance],
  );

  // Featured listing: highest-rated with most recent
  const featuredListing = useMemo(() => {
    if (listings.length === 0) return null;
    return [...listings].sort((a, b) => b.seller.rating - a.seller.rating)[0];
  }, [listings]);

  return {
    listings,
    filteredListings,
    bookings,
    loading,
    error,
    filters,
    setFilters,
    getDistance,
    getListingById,
    getSellerListings,
    getSellerReviews,
    createListing,
    createBooking,
    nearbyCount,
    featuredListing,
  };
}

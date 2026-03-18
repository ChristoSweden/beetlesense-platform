/**
 * useNonTimberIncome — Non-timber revenue streams hook.
 *
 * Provides hunting leases, recreation activities, foraging rights,
 * and other non-timber income data for Swedish forest owners.
 *
 * Swedish market rates (2026):
 * - Hunting leases: 50-150 SEK/ha/year total
 * - Wind power lease: 20,000-50,000 SEK/turbine/year
 * - Telecom tower: 15,000-40,000 SEK/tower/year
 * - Guided nature tours: 500-2,000 SEK/person/event
 */

import { useState, useMemo } from 'react';
import { DEMO_PARCELS } from '@/lib/demoData';

// ─── Types ───

export type IncomeCategory = 'hunting' | 'recreation' | 'foraging' | 'other';

export interface HuntingLease {
  id: string;
  jaktlag: string;
  parcelId: string;
  parcelName: string;
  areaHa: number;
  annualFeeSEK: number;
  feePerHa: number;
  marketRateMin: number;
  marketRateMax: number;
  species: HuntingSpecies[];
  seasonStart: string;
  seasonEnd: string;
  contractExpires: string;
  status: 'active' | 'expiring_soon' | 'expired' | 'available';
  notes?: string;
}

export interface HuntingSpecies {
  name: string;
  nameSv: string;
  rateMin: number;
  rateMax: number;
  season: string;
}

export interface RecreationActivity {
  id: string;
  name: string;
  nameSv: string;
  type: 'guided_tour' | 'camping' | 'birdwatching' | 'forest_bathing' | 'mtb' | 'hunting_experience' | 'photography';
  revenuePerEvent: number;
  eventsPerYear: number;
  annualRevenueSEK: number;
  bestMonths: number[];
  difficulty: 'easy' | 'medium' | 'hard';
  requiresPermit: boolean;
  insuranceRequired: boolean;
  description: string;
  descriptionSv: string;
  status: 'active' | 'planned' | 'potential';
}

export interface ForagingItem {
  id: string;
  name: string;
  nameSv: string;
  type: 'berry' | 'mushroom';
  parcelId: string;
  parcelName: string;
  estimatedYieldKg: number;
  marketPriceSEKPerKg: number;
  annualValueSEK: number;
  season: string;
  abundance: 'high' | 'medium' | 'low';
  commercialPermit: boolean;
}

export interface OtherRevenueStream {
  id: string;
  name: string;
  nameSv: string;
  type: 'wind_power' | 'telecom' | 'gravel' | 'water' | 'solar' | 'events';
  annualRevenueSEK: number;
  potentialRevenueSEK: number;
  status: 'active' | 'under_negotiation' | 'potential' | 'not_suitable';
  description: string;
  descriptionSv: string;
  requirements?: string[];
  parcelId?: string;
  parcelName?: string;
}

export interface HuntingSeason {
  species: string;
  speciesSv: string;
  start: string;
  end: string;
  notes?: string;
}

export interface NonTimberSummary {
  totalAnnualIncome: number;
  huntingIncome: number;
  recreationIncome: number;
  foragingIncome: number;
  otherIncome: number;
  potentialAdditional: number;
  incomePerHa: number;
  totalAreaHa: number;
}

// ─── Demo Data ───

const HUNTING_SPECIES: HuntingSpecies[] = [
  { name: 'Moose', nameSv: 'Älg', rateMin: 30, rateMax: 100, season: 'Okt-Jan' },
  { name: 'Red deer', nameSv: 'Kronhjort', rateMin: 20, rateMax: 60, season: 'Okt-Jan' },
  { name: 'Wild boar', nameSv: 'Vildsvin', rateMin: 15, rateMax: 50, season: 'Apr-Jan' },
  { name: 'Small game', nameSv: 'Småvilt', rateMin: 10, rateMax: 30, season: 'Sep-Feb' },
];

const DEMO_HUNTING_LEASES: HuntingLease[] = [
  {
    id: 'hl-1',
    jaktlag: 'Värnamo Älgjaktlag',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    areaHa: 42.5,
    annualFeeSEK: 17_000,
    feePerHa: 400,
    marketRateMin: 50,
    marketRateMax: 80,
    species: [HUNTING_SPECIES[0], HUNTING_SPECIES[3]],
    seasonStart: '2025-10-08',
    seasonEnd: '2026-01-31',
    contractExpires: '2027-06-30',
    status: 'active',
    notes: 'Avtal förnyas automatiskt om det inte sägs upp senast 6 månader före utgång.',
  },
  {
    id: 'hl-2',
    jaktlag: 'Gislaved Jaktförening',
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    areaHa: 18.3,
    annualFeeSEK: 9_500,
    feePerHa: 519,
    marketRateMin: 60,
    marketRateMax: 90,
    species: [HUNTING_SPECIES[1], HUNTING_SPECIES[2], HUNTING_SPECIES[3]],
    seasonStart: '2025-10-01',
    seasonEnd: '2026-01-31',
    contractExpires: '2026-06-30',
    status: 'expiring_soon',
    notes: 'Kontraktet löper ut snart. Marknadspriset har ökat — överväg omförhandling.',
  },
  {
    id: 'hl-3',
    jaktlag: 'Tallmons Jaktlag',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    areaHa: 67.1,
    annualFeeSEK: 18_500,
    feePerHa: 276,
    marketRateMin: 50,
    marketRateMax: 80,
    species: [HUNTING_SPECIES[0], HUNTING_SPECIES[2], HUNTING_SPECIES[3]],
    seasonStart: '2025-10-08',
    seasonEnd: '2026-01-31',
    contractExpires: '2028-06-30',
    status: 'active',
  },
];

const DEMO_RECREATION: RecreationActivity[] = [
  {
    id: 'rec-1',
    name: 'Guided nature walk',
    nameSv: 'Guidad naturvandring',
    type: 'guided_tour',
    revenuePerEvent: 1_500,
    eventsPerYear: 12,
    annualRevenueSEK: 18_000,
    bestMonths: [5, 6, 7, 8, 9],
    difficulty: 'easy',
    requiresPermit: false,
    insuranceRequired: true,
    description: 'Guided walks through the forest focusing on local ecology, wildlife tracks, and seasonal highlights.',
    descriptionSv: 'Guidade vandringar genom skogen med fokus på lokal ekologi, djurspår och säsongens höjdpunkter.',
    status: 'active',
  },
  {
    id: 'rec-2',
    name: 'Forest bathing (Shinrin-yoku)',
    nameSv: 'Skogsbad (Shinrin-yoku)',
    type: 'forest_bathing',
    revenuePerEvent: 800,
    eventsPerYear: 20,
    annualRevenueSEK: 16_000,
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
    difficulty: 'easy',
    requiresPermit: false,
    insuranceRequired: true,
    description: 'Mindfulness-based forest immersion sessions. Growing wellness trend with high demand.',
    descriptionSv: 'Mindfulnessbaserade skogsupplevelser. Växande wellnesstrend med hög efterfrågan.',
    status: 'active',
  },
  {
    id: 'rec-3',
    name: 'Birdwatching excursion',
    nameSv: 'Fågelskådning',
    type: 'birdwatching',
    revenuePerEvent: 1_200,
    eventsPerYear: 8,
    annualRevenueSEK: 9_600,
    bestMonths: [4, 5, 6, 7, 8],
    difficulty: 'easy',
    requiresPermit: false,
    insuranceRequired: false,
    description: 'Guided birdwatching focusing on owls, woodpeckers, and seasonal migrants.',
    descriptionSv: 'Guidad fågelskådning med fokus på ugglor, hackspettar och säsongsflytt.',
    status: 'active',
  },
  {
    id: 'rec-4',
    name: 'Wilderness camping spots',
    nameSv: 'Vildmarkscamping',
    type: 'camping',
    revenuePerEvent: 350,
    eventsPerYear: 40,
    annualRevenueSEK: 14_000,
    bestMonths: [5, 6, 7, 8],
    difficulty: 'medium',
    requiresPermit: true,
    insuranceRequired: true,
    description: 'Designated wilderness camping spots with fire pits and basic facilities. Bookable via outdoor platforms.',
    descriptionSv: 'Vildmarkscamping med eldplats och enklare faciliteter. Bokningsbar via friluftsplattformar.',
    status: 'planned',
  },
  {
    id: 'rec-5',
    name: 'Mountain biking trails',
    nameSv: 'Mountainbikestigar',
    type: 'mtb',
    revenuePerEvent: 200,
    eventsPerYear: 60,
    annualRevenueSEK: 12_000,
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
    difficulty: 'hard',
    requiresPermit: true,
    insuranceRequired: true,
    description: 'Maintained MTB trails through the forest. Revenue from trail passes and organized events.',
    descriptionSv: 'Underhållna MTB-stigar genom skogen. Intäkter från trailkort och organiserade event.',
    status: 'potential',
  },
  {
    id: 'rec-6',
    name: 'Wildlife photography hide',
    nameSv: 'Viltfotograferingsgömsle',
    type: 'photography',
    revenuePerEvent: 2_000,
    eventsPerYear: 15,
    annualRevenueSEK: 30_000,
    bestMonths: [3, 4, 5, 6, 9, 10, 11],
    difficulty: 'medium',
    requiresPermit: false,
    insuranceRequired: true,
    description: 'Professional photography hides near feeding stations. Premium pricing for moose and bird of prey sessions.',
    descriptionSv: 'Professionella gömslen vid utfodringsplatser. Premiumpriser för älg- och rovfågelfoto.',
    status: 'potential',
  },
];

const DEMO_FORAGING: ForagingItem[] = [
  {
    id: 'for-1',
    name: 'Blueberry',
    nameSv: 'Blåbär',
    type: 'berry',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    estimatedYieldKg: 450,
    marketPriceSEKPerKg: 45,
    annualValueSEK: 20_250,
    season: 'Jul-Aug',
    abundance: 'high',
    commercialPermit: false,
  },
  {
    id: 'for-2',
    name: 'Lingonberry',
    nameSv: 'Lingon',
    type: 'berry',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    estimatedYieldKg: 600,
    marketPriceSEKPerKg: 35,
    annualValueSEK: 21_000,
    season: 'Aug-Sep',
    abundance: 'high',
    commercialPermit: false,
  },
  {
    id: 'for-3',
    name: 'Chanterelle',
    nameSv: 'Kantarell',
    type: 'mushroom',
    parcelId: 'p2',
    parcelName: 'Ekbacken',
    estimatedYieldKg: 80,
    marketPriceSEKPerKg: 250,
    annualValueSEK: 20_000,
    season: 'Jul-Okt',
    abundance: 'medium',
    commercialPermit: false,
  },
  {
    id: 'for-4',
    name: 'Porcini',
    nameSv: 'Karl-Johan',
    type: 'mushroom',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
    estimatedYieldKg: 45,
    marketPriceSEKPerKg: 180,
    annualValueSEK: 8_100,
    season: 'Aug-Okt',
    abundance: 'medium',
    commercialPermit: false,
  },
  {
    id: 'for-5',
    name: 'Blueberry',
    nameSv: 'Blåbär',
    type: 'berry',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    estimatedYieldKg: 800,
    marketPriceSEKPerKg: 45,
    annualValueSEK: 36_000,
    season: 'Jul-Aug',
    abundance: 'high',
    commercialPermit: false,
  },
  {
    id: 'for-6',
    name: 'Chanterelle',
    nameSv: 'Kantarell',
    type: 'mushroom',
    parcelId: 'p3',
    parcelName: 'Tallmon',
    estimatedYieldKg: 60,
    marketPriceSEKPerKg: 250,
    annualValueSEK: 15_000,
    season: 'Jul-Okt',
    abundance: 'medium',
    commercialPermit: false,
  },
];

const DEMO_OTHER_REVENUE: OtherRevenueStream[] = [
  {
    id: 'oth-1',
    name: 'Wind power lease',
    nameSv: 'Vindkraftarrende',
    type: 'wind_power',
    annualRevenueSEK: 0,
    potentialRevenueSEK: 85_000,
    status: 'potential',
    description: 'Two potential turbine sites on Tallmon ridge at 290m elevation with good wind exposure.',
    descriptionSv: 'Två potentiella turbinplatser på Tallmons höjdrygg vid 290 m höjd med bra vindexponering.',
    requirements: ['Miljöprövning', 'Kommunalt tillstånd', 'Minst 500 m till närmaste bostad'],
    parcelId: 'p3',
    parcelName: 'Tallmon',
  },
  {
    id: 'oth-2',
    name: 'Telecom tower rental',
    nameSv: 'Telekommast',
    type: 'telecom',
    annualRevenueSEK: 28_000,
    potentialRevenueSEK: 28_000,
    status: 'active',
    description: 'Existing Telia tower on Norra Skogen with 10-year lease. Reliable passive income.',
    descriptionSv: 'Befintlig Telia-mast på Norra Skogen med 10-årigt avtal. Pålitlig passiv inkomst.',
    parcelId: 'p1',
    parcelName: 'Norra Skogen',
  },
  {
    id: 'oth-3',
    name: 'Gravel extraction',
    nameSv: 'Grustäkt',
    type: 'gravel',
    annualRevenueSEK: 0,
    potentialRevenueSEK: 45_000,
    status: 'not_suitable',
    description: 'Moraine deposits present but protected groundwater area limits extraction possibilities.',
    descriptionSv: 'Moränavlagringar finns men skyddat grundvattenområde begränsar brytningsmöjligheter.',
    parcelId: 'p4',
    parcelName: 'Granudden',
  },
  {
    id: 'oth-4',
    name: 'Solar park on clearcut',
    nameSv: 'Solpark på hygge',
    type: 'solar',
    annualRevenueSEK: 0,
    potentialRevenueSEK: 35_000,
    status: 'under_negotiation',
    description: 'Vattenfall has expressed interest in a 2 ha solar installation on the Granudden clearcut area.',
    descriptionSv: 'Vattenfall har visat intresse för en 2 ha solinstallation på Granuddens hygge.',
    parcelId: 'p4',
    parcelName: 'Granudden',
  },
  {
    id: 'oth-5',
    name: 'Water rights',
    nameSv: 'Vattentäkt',
    type: 'water',
    annualRevenueSEK: 12_000,
    potentialRevenueSEK: 12_000,
    status: 'active',
    description: 'Municipal water extraction point on Björklund. Annual compensation from Nässjö kommun.',
    descriptionSv: 'Kommunal vattenutttagspunkt på Björklund. Årlig ersättning från Nässjö kommun.',
    parcelId: 'p5',
    parcelName: 'Björklund',
  },
  {
    id: 'oth-6',
    name: 'Event venue rental',
    nameSv: 'Eventplats',
    type: 'events',
    annualRevenueSEK: 15_000,
    potentialRevenueSEK: 40_000,
    status: 'active',
    description: 'Forest clearing used for corporate team-building events, weddings, and midsommar celebrations.',
    descriptionSv: 'Skogsglänta används för företagsevent, bröllop och midsommarfiranden.',
    parcelId: 'p2',
    parcelName: 'Ekbacken',
  },
];

const HUNTING_SEASONS: HuntingSeason[] = [
  { species: 'Moose', speciesSv: 'Älg', start: '2025-10-08', end: '2026-01-31', notes: 'Licens A-område. Tilldelning: 3 vuxna, 2 kalvar.' },
  { species: 'Red deer', speciesSv: 'Kronhjort', start: '2025-10-01', end: '2026-01-31' },
  { species: 'Wild boar', speciesSv: 'Vildsvin', start: '2025-04-16', end: '2026-01-31', notes: 'Åretrunt på jordbruksmark vid skadeförebyggande.' },
  { species: 'Roe deer', speciesSv: 'Rådjur', start: '2025-08-16', end: '2026-01-31' },
  { species: 'Hare', speciesSv: 'Hare', start: '2025-09-01', end: '2026-02-28' },
  { species: 'Fox', speciesSv: 'Räv', start: '2025-09-01', end: '2026-03-31' },
  { species: 'Pheasant', speciesSv: 'Fasan', start: '2025-10-01', end: '2026-01-31' },
  { species: 'Capercaillie', speciesSv: 'Tjäder', start: '2025-08-25', end: '2026-01-31', notes: 'Hanfågel. Licenskrav.' },
];

// ─── Hook ───

export function useNonTimberIncome() {
  const [activeTab, setActiveTab] = useState<IncomeCategory>('hunting');

  // Hunting leases
  const huntingLeases = useMemo(() => DEMO_HUNTING_LEASES, []);
  const huntingSeasons = useMemo(() => HUNTING_SEASONS, []);
  const huntingSpeciesRates = useMemo(() => HUNTING_SPECIES, []);

  // Recreation
  const recreationActivities = useMemo(() => DEMO_RECREATION, []);

  // Foraging
  const foragingItems = useMemo(() => DEMO_FORAGING, []);

  // Other revenue
  const otherRevenue = useMemo(() => DEMO_OTHER_REVENUE, []);

  // Summary
  const summary = useMemo<NonTimberSummary>(() => {
    const huntingIncome = huntingLeases
      .filter(l => l.status === 'active' || l.status === 'expiring_soon')
      .reduce((s, l) => s + l.annualFeeSEK, 0);

    const recreationIncome = recreationActivities
      .filter(a => a.status === 'active')
      .reduce((s, a) => s + a.annualRevenueSEK, 0);

    // Foraging: only count commercial/tour revenue, not allemansrätten value
    const foragingIncome = Math.round(
      foragingItems.reduce((s, f) => s + f.annualValueSEK, 0) * 0.15
    ); // ~15% from organized tours/commercial permits

    const otherIncome = otherRevenue
      .filter(r => r.status === 'active')
      .reduce((s, r) => s + r.annualRevenueSEK, 0);

    const totalAnnualIncome = huntingIncome + recreationIncome + foragingIncome + otherIncome;

    const potentialAdditional =
      recreationActivities
        .filter(a => a.status !== 'active')
        .reduce((s, a) => s + a.annualRevenueSEK, 0) +
      otherRevenue
        .filter(r => r.status !== 'active' && r.status !== 'not_suitable')
        .reduce((s, r) => s + r.potentialRevenueSEK, 0);

    const totalAreaHa = DEMO_PARCELS.reduce((s, p) => s + p.area_hectares, 0);

    return {
      totalAnnualIncome,
      huntingIncome,
      recreationIncome,
      foragingIncome,
      otherIncome,
      potentialAdditional,
      incomePerHa: totalAreaHa > 0 ? Math.round(totalAnnualIncome / totalAreaHa) : 0,
      totalAreaHa,
    };
  }, [huntingLeases, recreationActivities, foragingItems, otherRevenue]);

  // Lease renewal check
  const expiringLeases = useMemo(
    () => huntingLeases.filter(l => l.status === 'expiring_soon'),
    [huntingLeases],
  );

  // Under-market leases
  const underMarketLeases = useMemo(
    () => huntingLeases.filter(l => l.feePerHa < l.marketRateMin * l.species.length),
    [huntingLeases],
  );

  return {
    activeTab,
    setActiveTab,
    huntingLeases,
    huntingSeasons,
    huntingSpeciesRates,
    recreationActivities,
    foragingItems,
    otherRevenue,
    summary,
    expiringLeases,
    underMarketLeases,
  };
}

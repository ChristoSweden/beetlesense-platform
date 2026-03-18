/**
 * useCarbonMarket — Carbon marketplace data & calculations hook.
 *
 * Provides carbon inventory, market prices, available programs,
 * transaction history, and listing flow for the carbon credit marketplace.
 *
 * Swedish carbon market data based on:
 * - Voluntary carbon market: 500-1200 SEK/tonne CO₂
 * - Swedish Klimatklivsmedel subsidy schedules
 * - EU ETS reference pricing (future eligibility)
 * - Gold Standard, Verra VCS, Plan Vivo certification programs
 */

import { useState, useMemo, useCallback } from 'react';
import {
  CARBON_COEFFICIENTS,
  DEMO_PARCELS as CARBON_PARCELS,
  getAgeModifier,
  getSiteIndexModifier,
  type CarbonParcel,
  type CertificationProgram,
} from '@/services/carbonService';

// ─── Types ───

export type CreditStatus = 'verified' | 'pending' | 'listed' | 'sold' | 'retired';
export type ProgramId = 'voluntary' | 'eu_ets' | 'klimatklivsmedel' | 'gold_standard' | 'verra' | 'plan_vivo';

export interface CarbonInventory {
  /** Total CO₂ stored across all parcels (tonnes) */
  totalStored: number;
  /** Annual sequestration rate (tonnes CO₂/year) */
  annualSequestration: number;
  /** Verified credits available for sale (tonnes) */
  verifiedCredits: number;
  /** Credits currently listed on market */
  listedCredits: number;
  /** Credits sold to date */
  soldCredits: number;
  /** Per-parcel breakdown */
  parcelBreakdown: ParcelInventory[];
}

export interface ParcelInventory {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  stored: number;
  annualRate: number;
  verifiedCredits: number;
  certification: CertificationProgram | null;
}

export interface CarbonProgram {
  id: ProgramId;
  name: string;
  nameSv: string;
  description: string;
  descriptionSv: string;
  priceRange: { min: number; max: number }; // SEK/tonne
  status: 'active' | 'coming_soon' | 'eligible';
  requirements: string[];
  requirementsSv: string[];
  certificationCostSEK: number;
  annualCostSEK: number;
  timelineMonths: number;
}

export interface CarbonBuyer {
  id: string;
  name: string;
  type: 'corporate' | 'municipality' | 'broker' | 'fund';
  currentPrice: number; // SEK/tonne
  minVolume: number; // tonnes
  maxVolume: number;
  contractLength: string;
  rating: number; // 1-5
  verified: boolean;
}

export interface CarbonTransaction {
  id: string;
  date: string;
  type: 'sale' | 'verification' | 'listing' | 'retirement';
  buyer?: string;
  tonnes: number;
  priceSEK: number;
  totalSEK: number;
  program: ProgramId;
  status: 'completed' | 'pending' | 'cancelled';
}

export interface CertificationStatus {
  program: CertificationProgram;
  name: string;
  status: 'certified' | 'in_progress' | 'not_started';
  validUntil?: string;
  nextAudit?: string;
  creditsIssued: number;
  methodology: string;
}

export interface RevenueProjection {
  year: number;
  voluntaryRevenue: number;
  klimatklivRevenue: number;
  totalRevenue: number;
  cumulativeRevenue: number;
}

export interface ListingDraft {
  tonnes: number;
  pricePerTonne: number;
  program: ProgramId;
  minBuyerRating: number;
}

// ─── Demo Data ───

const DEMO_PROGRAMS: CarbonProgram[] = [
  {
    id: 'voluntary',
    name: 'Voluntary Carbon Market',
    nameSv: 'Frivilliga kolmarknaden',
    description: 'International voluntary carbon credits for corporate buyers seeking offsets.',
    descriptionSv: 'Internationella frivilliga kolkrediter för företag som söker klimatkompensation.',
    priceRange: { min: 500, max: 1200 },
    status: 'active',
    requirements: [
      'Third-party verification (Gold Standard or Verra)',
      'Annual monitoring report',
      'Additionality demonstration',
      'Minimum 20 ha contiguous forest',
    ],
    requirementsSv: [
      'Tredjepartsverifiering (Gold Standard eller Verra)',
      'Årlig övervakningsrapport',
      'Additionalitetspåvisande',
      'Minst 20 ha sammanhängande skog',
    ],
    certificationCostSEK: 180_000,
    annualCostSEK: 40_000,
    timelineMonths: 12,
  },
  {
    id: 'eu_ets',
    name: 'EU Emissions Trading System',
    nameSv: 'EU:s utsläppshandel (EU ETS)',
    description: 'Future eligibility for forest carbon under EU ETS expansion. Currently in pilot phase for LULUCF sector.',
    descriptionSv: 'Framtida behörighet för skogskollagring under EU ETS-utvidgning. Pilotfas för LULUCF-sektorn.',
    priceRange: { min: 800, max: 1100 },
    status: 'coming_soon',
    requirements: [
      'EU LULUCF regulation compliance',
      'National registry enrollment',
      'MRV (Monitoring, Reporting, Verification)',
      'Minimum 50 ha managed forest',
    ],
    requirementsSv: [
      'Efterlevnad av EU LULUCF-förordningen',
      'Registrering i nationellt register',
      'MRV (Övervakning, rapportering, verifiering)',
      'Minst 50 ha brukad skog',
    ],
    certificationCostSEK: 250_000,
    annualCostSEK: 60_000,
    timelineMonths: 24,
  },
  {
    id: 'klimatklivsmedel',
    name: 'Swedish Klimatklivsmedel',
    nameSv: 'Klimatklivsmedel (Naturvårdsverket)',
    description: 'Swedish government climate investment support. Grants for forest carbon projects that reduce national emissions.',
    descriptionSv: 'Statligt klimatinvesteringsstöd. Bidrag för skogsprojekt som minskar nationella utsläpp.',
    priceRange: { min: 600, max: 900 },
    status: 'eligible',
    requirements: [
      'Swedish forest ownership (Skogsstyrelsen registration)',
      'Forest management plan (skogsbruksplan)',
      'Commitment to extended rotation or continuous cover',
      'Annual reporting to Naturvårdsverket',
    ],
    requirementsSv: [
      'Svenskt skogsägande (registrering hos Skogsstyrelsen)',
      'Skogsbruksplan',
      'Åtagande om förlängd omloppstid eller hyggesfritt',
      'Årlig rapportering till Naturvårdsverket',
    ],
    certificationCostSEK: 45_000,
    annualCostSEK: 15_000,
    timelineMonths: 6,
  },
];

const DEMO_BUYERS: CarbonBuyer[] = [
  {
    id: 'buyer-1',
    name: 'Volvo Group',
    type: 'corporate',
    currentPrice: 1050,
    minVolume: 100,
    maxVolume: 5000,
    contractLength: '3-5 years',
    rating: 5,
    verified: true,
  },
  {
    id: 'buyer-2',
    name: 'Stockholms Stad',
    type: 'municipality',
    currentPrice: 880,
    minVolume: 50,
    maxVolume: 2000,
    contractLength: '1-3 years',
    rating: 5,
    verified: true,
  },
  {
    id: 'buyer-3',
    name: 'South Pole Nordic',
    type: 'broker',
    currentPrice: 750,
    minVolume: 20,
    maxVolume: 10000,
    contractLength: 'Spot / annual',
    rating: 4,
    verified: true,
  },
  {
    id: 'buyer-4',
    name: 'IKEA Climate Fund',
    type: 'fund',
    currentPrice: 1180,
    minVolume: 200,
    maxVolume: 50000,
    contractLength: '5-10 years',
    rating: 5,
    verified: true,
  },
  {
    id: 'buyer-5',
    name: 'Göteborgs Kommun',
    type: 'municipality',
    currentPrice: 820,
    minVolume: 30,
    maxVolume: 1500,
    contractLength: '2-4 years',
    rating: 4,
    verified: true,
  },
  {
    id: 'buyer-6',
    name: 'H&M Foundation',
    type: 'fund',
    currentPrice: 960,
    minVolume: 100,
    maxVolume: 8000,
    contractLength: '3-7 years',
    rating: 4,
    verified: true,
  },
  {
    id: 'buyer-7',
    name: 'ZeroMission AB',
    type: 'broker',
    currentPrice: 680,
    minVolume: 10,
    maxVolume: 5000,
    contractLength: 'Spot market',
    rating: 3,
    verified: true,
  },
  {
    id: 'buyer-8',
    name: 'Vattenfall',
    type: 'corporate',
    currentPrice: 920,
    minVolume: 500,
    maxVolume: 20000,
    contractLength: '5 years',
    rating: 5,
    verified: true,
  },
];

const DEMO_TRANSACTIONS: CarbonTransaction[] = [
  {
    id: 'tx-1',
    date: '2026-03-01',
    type: 'verification',
    tonnes: 487,
    priceSEK: 0,
    totalSEK: -45_000,
    program: 'voluntary',
    status: 'completed',
  },
  {
    id: 'tx-2',
    date: '2026-02-15',
    type: 'sale',
    buyer: 'South Pole Nordic',
    tonnes: 120,
    priceSEK: 750,
    totalSEK: 90_000,
    program: 'voluntary',
    status: 'completed',
  },
  {
    id: 'tx-3',
    date: '2026-01-20',
    type: 'sale',
    buyer: 'Stockholms Stad',
    tonnes: 85,
    priceSEK: 880,
    totalSEK: 74_800,
    program: 'voluntary',
    status: 'completed',
  },
  {
    id: 'tx-4',
    date: '2025-12-10',
    type: 'listing',
    tonnes: 200,
    priceSEK: 900,
    totalSEK: 0,
    program: 'voluntary',
    status: 'pending',
  },
  {
    id: 'tx-5',
    date: '2025-11-05',
    type: 'sale',
    buyer: 'Volvo Group',
    tonnes: 250,
    priceSEK: 1050,
    totalSEK: 262_500,
    program: 'voluntary',
    status: 'completed',
  },
  {
    id: 'tx-6',
    date: '2025-09-20',
    type: 'retirement',
    tonnes: 32,
    priceSEK: 0,
    totalSEK: 0,
    program: 'klimatklivsmedel',
    status: 'completed',
  },
];

const DEMO_CERTIFICATIONS: CertificationStatus[] = [
  {
    program: 'gold_standard',
    name: 'Gold Standard',
    status: 'certified',
    validUntil: '2028-06-30',
    nextAudit: '2027-03-15',
    creditsIssued: 487,
    methodology: 'A/R Methodology for Afforestation/Reforestation (GS4GG)',
  },
  {
    program: 'verra',
    name: 'Verra VCS',
    status: 'in_progress',
    nextAudit: '2026-09-01',
    creditsIssued: 0,
    methodology: 'VM0047 Improved Forest Management',
  },
  {
    program: 'plan_vivo',
    name: 'Plan Vivo',
    status: 'not_started',
    creditsIssued: 0,
    methodology: 'Plan Vivo Standard v4.0',
  },
];

// ─── Calculation Functions ───

function calculateParcelInventory(parcel: CarbonParcel): ParcelInventory {
  const coeff = CARBON_COEFFICIENTS[parcel.species];
  const ageMod = getAgeModifier(parcel.ageYears);
  const siMod = getSiteIndexModifier(parcel.siteIndex);

  // Total stored
  let stored = 0;
  for (let yr = 1; yr <= parcel.ageYears; yr++) {
    stored += coeff.peakSequestration * getAgeModifier(yr) * siMod;
  }
  stored *= parcel.areaHa;

  // Annual rate
  const annualRate = coeff.peakSequestration * ageMod * siMod * parcel.areaHa;

  // Verified credits (assume ~60% of last year's sequestration is verified)
  const verifiedCredits = Math.round(annualRate * 0.6);

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    areaHa: parcel.areaHa,
    stored: Math.round(stored),
    annualRate: Math.round(annualRate),
    verifiedCredits,
    certification: parcel.areaHa >= 50 ? 'gold_standard' : parcel.areaHa >= 20 ? 'verra' : 'plan_vivo',
  };
}

function buildRevenueProjection(annualSeq: number, years: number = 10): RevenueProjection[] {
  const projections: RevenueProjection[] = [];
  let cumulative = 0;
  const voluntaryPrice = 850; // SEK/tonne mid-market
  const klimatklivPrice = 700;

  for (let yr = 1; yr <= years; yr++) {
    // Assume 2% annual growth in carbon prices
    const priceMod = Math.pow(1.02, yr - 1);
    const volRev = annualSeq * 0.6 * voluntaryPrice * priceMod;
    const klimRev = annualSeq * 0.3 * klimatklivPrice * priceMod;
    const total = volRev + klimRev;
    cumulative += total;

    projections.push({
      year: yr,
      voluntaryRevenue: Math.round(volRev),
      klimatklivRevenue: Math.round(klimRev),
      totalRevenue: Math.round(total),
      cumulativeRevenue: Math.round(cumulative),
    });
  }

  return projections;
}

// ─── Hook ───

export function useCarbonMarket() {
  const [listingDraft, setListingDraft] = useState<ListingDraft | null>(null);
  const [sortBuyersBy, setSortBuyersBy] = useState<'price' | 'volume' | 'rating'>('price');

  // Calculate inventory from demo parcels
  const inventory = useMemo<CarbonInventory>(() => {
    const breakdown = CARBON_PARCELS.map(calculateParcelInventory);
    const totalStored = breakdown.reduce((s, p) => s + p.stored, 0);
    const annualSequestration = breakdown.reduce((s, p) => s + p.annualRate, 0);
    const verifiedCredits = breakdown.reduce((s, p) => s + p.verifiedCredits, 0);

    // Demo: some credits already listed/sold
    const soldCredits = DEMO_TRANSACTIONS
      .filter(t => t.type === 'sale' && t.status === 'completed')
      .reduce((s, t) => s + t.tonnes, 0);
    const listedCredits = DEMO_TRANSACTIONS
      .filter(t => t.type === 'listing' && t.status === 'pending')
      .reduce((s, t) => s + t.tonnes, 0);

    return {
      totalStored,
      annualSequestration,
      verifiedCredits,
      listedCredits,
      soldCredits,
      parcelBreakdown: breakdown,
    };
  }, []);

  // Programs
  const programs = useMemo(() => DEMO_PROGRAMS, []);

  // Sorted buyers
  const buyers = useMemo(() => {
    const sorted = [...DEMO_BUYERS];
    switch (sortBuyersBy) {
      case 'price': sorted.sort((a, b) => b.currentPrice - a.currentPrice); break;
      case 'volume': sorted.sort((a, b) => b.maxVolume - a.maxVolume); break;
      case 'rating': sorted.sort((a, b) => b.rating - a.rating); break;
    }
    return sorted;
  }, [sortBuyersBy]);

  // Transaction history
  const transactions = useMemo(() => DEMO_TRANSACTIONS, []);

  // Certifications
  const certifications = useMemo(() => DEMO_CERTIFICATIONS, []);

  // Revenue projection
  const revenueProjection = useMemo(
    () => buildRevenueProjection(inventory.annualSequestration),
    [inventory.annualSequestration],
  );

  // Total revenue from completed sales
  const totalRevenue = useMemo(
    () => transactions
      .filter(t => t.type === 'sale' && t.status === 'completed')
      .reduce((s, t) => s + t.totalSEK, 0),
    [transactions],
  );

  // Average price from completed sales
  const avgSalePrice = useMemo(() => {
    const sales = transactions.filter(t => t.type === 'sale' && t.status === 'completed');
    if (sales.length === 0) return 0;
    const totalTonnes = sales.reduce((s, t) => s + t.tonnes, 0);
    const totalSEK = sales.reduce((s, t) => s + t.totalSEK, 0);
    return Math.round(totalSEK / totalTonnes);
  }, [transactions]);

  const startListing = useCallback((draft: ListingDraft) => {
    setListingDraft(draft);
  }, []);

  const cancelListing = useCallback(() => {
    setListingDraft(null);
  }, []);

  return {
    inventory,
    programs,
    buyers,
    transactions,
    certifications,
    revenueProjection,
    totalRevenue,
    avgSalePrice,
    listingDraft,
    startListing,
    cancelListing,
    sortBuyersBy,
    setSortBuyersBy,
  };
}

/**
 * Carbon Marketplace Service
 *
 * Connects Swedish forest owners to carbon credit buyers.
 * Simulated buyers — replace with real API (e.g. Xpansiv, ACX) when live.
 *
 * Pricing in SEK/tonne CO₂. Sequestration calculations use the same
 * SLU-based coefficients as carbonService.ts.
 */

import { CARBON_COEFFICIENTS, SEK_PER_EUR } from './carbonService';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CarbonBuyer {
  id: string;
  name: string;
  pricePerTonne: number;   // SEK/tonne CO₂
  minCredits: number;      // minimum annual tonnes
  currency: 'SEK';
  description: string;
  verified: boolean;
  category: 'institutional' | 'impact' | 'corporate';
  turnaroundDays: number;  // typical deal close time
}

export interface CarbonEstimate {
  parcelId: string;
  annualTonnes: number;
  fiveYearProjection: number;
  estimatedValueMin: number;   // SEK (lowest buyer price)
  estimatedValueMax: number;   // SEK (highest buyer price)
  methodology: string;
}

export interface InterestSubmission {
  parcelId: string;
  buyerId: string;
  ownerEmail: string;
  ownerName?: string;
  estimatedAnnualTonnes: number;
  submittedAt: string;
}

// ─── Buyer Data ───────────────────────────────────────────────────────────────

const CARBON_BUYERS: CarbonBuyer[] = [
  {
    id: 'b1',
    name: 'Scandinavian Carbon Fund',
    pricePerTonne: 42,
    minCredits: 100,
    currency: 'SEK',
    description: 'Swedish institutional buyer, EUDR-compliant. Focuses on certified Nordic forests with long-term offtake agreements.',
    verified: true,
    category: 'institutional',
    turnaroundDays: 45,
  },
  {
    id: 'b2',
    name: 'Nordic Green Investments',
    pricePerTonne: 38,
    minCredits: 50,
    currency: 'SEK',
    description: 'Impact fund, accepts FSC-certified forest only. Ideal for smaller holdings, fast onboarding, annual contracts.',
    verified: true,
    category: 'impact',
    turnaroundDays: 30,
  },
  {
    id: 'b3',
    name: 'Volvo Group Carbon Offset Programme',
    pricePerTonne: 55,
    minCredits: 200,
    currency: 'SEK',
    description: 'Corporate offset buyer, premium pricing for verified Scope 3 neutrality. Prefers 5-year supply agreements.',
    verified: true,
    category: 'corporate',
    turnaroundDays: 60,
  },
];

// ─── Service functions ────────────────────────────────────────────────────────

export async function getCarbonBuyers(): Promise<CarbonBuyer[]> {
  // In production: fetch from Supabase or external API
  return CARBON_BUYERS;
}

export async function getCarbonEstimate(
  parcelId: string,
  areaHa: number,
  species: 'spruce' | 'pine' | 'birch' | 'mixed',
  ageYears: number,
): Promise<CarbonEstimate> {
  const effectiveSpecies = species === 'mixed' ? 'spruce' : species;
  const coeff = CARBON_COEFFICIENTS[effectiveSpecies];

  // Apply an age-based productivity factor:
  // forests between 20–70 yrs sequester at near-peak; younger/older are less productive.
  const ageFactor = (() => {
    if (ageYears < 10) return 0.2;
    if (ageYears < 20) return 0.5;
    if (ageYears < 70) return 1.0;
    if (ageYears < 100) return 0.7;
    return 0.4;
  })();

  const annualTonnes = Math.round(coeff.peakSequestration * areaHa * ageFactor * 10) / 10;
  const fiveYearProjection = Math.round(annualTonnes * 5);

  const prices = CARBON_BUYERS.map((b) => b.pricePerTonne);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return {
    parcelId,
    annualTonnes,
    fiveYearProjection,
    estimatedValueMin: Math.round(annualTonnes * minPrice),
    estimatedValueMax: Math.round(annualTonnes * maxPrice),
    methodology:
      'Based on SLU Marklund biomass equations + IPCC 2006 root-to-shoot ratios. ' +
      'Annual sequestration uses species peak productivity adjusted for stand age. ' +
      `1 tonne dry biomass ≈ 1.83 tonne CO₂ (conversion factor: ${SEK_PER_EUR} SEK/EUR).`,
  };
}

export async function submitCarbonInterest(
  parcelId: string,
  buyerId: string,
  ownerEmail: string,
  ownerName: string,
  estimatedAnnualTonnes: number,
): Promise<{ success: boolean; referenceId: string }> {
  // In production: insert into Supabase `carbon_interests` table,
  // trigger Resend email to both forest owner and buyer contact.

  const submission: InterestSubmission = {
    parcelId,
    buyerId,
    ownerEmail,
    ownerName,
    estimatedAnnualTonnes,
    submittedAt: new Date().toISOString(),
  };

  // Simulate async persistence
  await new Promise((resolve) => setTimeout(resolve, 800));

  const buyer = CARBON_BUYERS.find((b) => b.id === buyerId);
  console.info('[CarbonMarketplace] Interest submitted:', { submission, buyer: buyer?.name });

  return {
    success: true,
    referenceId: `CM-${Date.now().toString(36).toUpperCase()}`,
  };
}

/**
 * CarbonService — Swedish forest carbon sequestration calculation engine.
 *
 * Carbon coefficients based on SLU (Swedish University of Agricultural Sciences)
 * research and the Swedish National Forest Inventory (Riksskogstaxeringen).
 *
 * Key references:
 * - Marklund (1988) biomass equations for Swedish tree species
 * - SLU Biomass Expansion Factors (BEF) tables
 * - IPCC 2006 Guidelines for root-to-shoot ratios
 * - Swedish EPA carbon stock reporting methodology
 *
 * Carbon pools:
 * 1. Above-ground biomass (AGB) — trunk, branches, foliage
 * 2. Below-ground biomass (BGB) — coarse roots
 * 3. Soil organic carbon (SOC) — litter, humus, mineral soil
 *
 * Conversion: 1 ton dry biomass ≈ 0.5 ton C ≈ 1.83 ton CO₂
 */

// ─── Types ───

export type TreeSpecies = 'spruce' | 'pine' | 'birch' | 'mixed';

export interface CarbonCoefficients {
  /** Species Swedish name */
  nameSv: string;
  /** Species English name */
  nameEn: string;
  /** Annual CO₂ sequestration per hectare at peak productivity (ton CO₂/ha/year) */
  peakSequestration: number;
  /** Biomass Expansion Factor — converts stem volume to total above-ground biomass */
  bef: number;
  /** Root-to-shoot ratio (below-ground / above-ground) */
  rootShootRatio: number;
  /** Average soil carbon accumulation (ton CO₂/ha/year) */
  soilCarbonRate: number;
  /** Basic wood density (ton dry matter / m³) */
  woodDensity: number;
}

export interface CarbonParcel {
  id: string;
  name: string;
  species: TreeSpecies;
  areaHa: number;
  /** Site Index (bonitet) — dominant height at age 100 in meters */
  siteIndex: number;
  ageYears: number;
}

export interface CarbonStock {
  /** Total carbon stored in CO₂ equivalents (ton) */
  totalCO2: number;
  /** Above-ground biomass CO₂ (ton) */
  aboveGroundCO2: number;
  /** Below-ground biomass CO₂ (ton) */
  belowGroundCO2: number;
  /** Soil organic carbon CO₂ (ton) */
  soilCO2: number;
}

export interface ParcelCarbonResult {
  parcel: CarbonParcel;
  stock: CarbonStock;
  /** Annual sequestration rate (ton CO₂/year) */
  annualSequestration: number;
  /** Revenue potential per certification program (SEK/year) */
  revenueByProgram: Record<CertificationProgram, number>;
}

export interface CertificationInfo {
  name: string;
  /** Price per ton CO₂ in EUR */
  priceEurPerTon: number;
  /** Typical certification cost (EUR, one-time) */
  certificationCost: number;
  /** Annual verification cost (EUR) */
  annualVerificationCost: number;
  /** Months to certification */
  timelineMonths: number;
  /** Minimum eligible area (ha) */
  minAreaHa: number;
  description: string;
  descriptionSv: string;
}

export type CertificationProgram = 'gold_standard' | 'verra' | 'plan_vivo';

export interface BiodiversityEligibility {
  euBiodiversity2030: boolean;
  lonaEligible: boolean;
  fscPremium: boolean;
  pefcPremium: boolean;
  speciesRichStands: boolean;
  setAsideRecommendationHa: number;
  /** Revenue from set-aside subsidies vs timber (SEK/ha/year) */
  setAsideRevenueSek: number;
  timberRevenueSek: number;
}

// ─── Constants ───

/** SEK per EUR — approximate, updated periodically */
export const SEK_PER_EUR = 11.2;

/**
 * Species-specific carbon coefficients for Swedish forests.
 * Sequestration rates vary by age and SI; these are reference values
 * for "typical" productive Swedish forest stands.
 */
export const CARBON_COEFFICIENTS: Record<TreeSpecies, CarbonCoefficients> = {
  spruce: {
    nameSv: 'Gran',
    nameEn: 'Norway Spruce',
    peakSequestration: 8.0, // ton CO₂/ha/year
    bef: 1.38,
    rootShootRatio: 0.24,
    soilCarbonRate: 1.2,
    woodDensity: 0.40,
  },
  pine: {
    nameSv: 'Tall',
    nameEn: 'Scots Pine',
    peakSequestration: 6.0,
    bef: 1.30,
    rootShootRatio: 0.27,
    soilCarbonRate: 0.9,
    woodDensity: 0.42,
  },
  birch: {
    nameSv: 'Björk',
    nameEn: 'Birch',
    peakSequestration: 5.0,
    bef: 1.45,
    rootShootRatio: 0.30,
    soilCarbonRate: 0.8,
    woodDensity: 0.51,
  },
  mixed: {
    nameSv: 'Blandskog',
    nameEn: 'Mixed',
    peakSequestration: 5.5,
    bef: 1.35,
    rootShootRatio: 0.26,
    soilCarbonRate: 1.0,
    woodDensity: 0.44,
  },
};

/**
 * Certification programs active in the Swedish/Nordic market.
 */
export const CERTIFICATION_PROGRAMS: Record<CertificationProgram, CertificationInfo> = {
  gold_standard: {
    name: 'Gold Standard',
    priceEurPerTon: 65,
    certificationCost: 25000,
    annualVerificationCost: 5000,
    timelineMonths: 12,
    minAreaHa: 50,
    description: 'Premium voluntary carbon credits with strong co-benefits verification. Highest price but strictest requirements.',
    descriptionSv: 'Premiun frivilliga kolkrediter med stark verifiering av samfördelar. Högsta priset men strängaste kraven.',
  },
  verra: {
    name: 'Verra (VCS)',
    priceEurPerTon: 35,
    certificationCost: 15000,
    annualVerificationCost: 3500,
    timelineMonths: 8,
    minAreaHa: 20,
    description: 'World\'s most widely used voluntary carbon standard. Good balance of cost and credibility.',
    descriptionSv: 'Världens mest använda frivilliga kolstandard. Bra balans mellan kostnad och trovärdighet.',
  },
  plan_vivo: {
    name: 'Plan Vivo',
    priceEurPerTon: 45,
    certificationCost: 12000,
    annualVerificationCost: 3000,
    timelineMonths: 10,
    minAreaHa: 10,
    description: 'Community-focused certification ideal for smallholders. Strong biodiversity co-benefits.',
    descriptionSv: 'Samhällsfokuserad certifiering ideal för småskogsägare. Starka biodiversitetssamfördelar.',
  },
};

/** Swedish certifiers operating in the carbon credit market */
export const SWEDISH_CERTIFIERS = [
  {
    name: 'South Pole',
    website: 'https://www.southpole.com',
    programs: ['gold_standard', 'verra'] as CertificationProgram[],
    description: 'Global climate solutions provider with Nordic office.',
    descriptionSv: 'Global klimatlösningsleverantör med nordiskt kontor.',
  },
  {
    name: 'Klimatkompensera.se',
    website: 'https://www.klimatkompensera.se',
    programs: ['gold_standard', 'verra'] as CertificationProgram[],
    description: 'Swedish carbon offset specialist.',
    descriptionSv: 'Svensk specialist på klimatkompensation.',
  },
  {
    name: 'ZeroMission',
    website: 'https://www.zeromission.se',
    programs: ['gold_standard', 'plan_vivo'] as CertificationProgram[],
    description: 'Nordic leader in carbon management and offsetting.',
    descriptionSv: 'Nordisk ledare inom kolhantering och kompensation.',
  },
  {
    name: 'Vi-skogen',
    website: 'https://www.viskogen.se',
    programs: ['plan_vivo'] as CertificationProgram[],
    description: 'Swedish NGO specializing in community-based forestry carbon.',
    descriptionSv: 'Svensk NGO specialiserad på samhällsbaserad skogskollagring.',
  },
];

// ─── Calculation Functions ───

/**
 * Age-dependent growth modifier. Swedish forests follow a sigmoid growth
 * curve where sequestration peaks around age 30-50 and declines in mature stands.
 * Based on SLU growth tables for southern/central Sweden.
 */
export function getAgeModifier(ageYears: number): number {
  if (ageYears <= 0) return 0;
  if (ageYears <= 10) return 0.3 + (ageYears / 10) * 0.4; // young: 0.3-0.7
  if (ageYears <= 20) return 0.7 + ((ageYears - 10) / 10) * 0.25; // growing: 0.7-0.95
  if (ageYears <= 40) return 0.95 + ((ageYears - 20) / 20) * 0.05; // peak: 0.95-1.0
  if (ageYears <= 60) return 1.0; // sustained peak
  if (ageYears <= 80) return 1.0 - ((ageYears - 60) / 20) * 0.15; // declining: 1.0-0.85
  if (ageYears <= 120) return 0.85 - ((ageYears - 80) / 40) * 0.25; // mature: 0.85-0.6
  return 0.5; // old-growth: low sequestration, high stock
}

/**
 * Site Index modifier. Higher SI means more productive land.
 * SI 20 is baseline; each SI point above/below adjusts by ~4%.
 */
export function getSiteIndexModifier(siteIndex: number): number {
  const baseline = 20;
  const perUnit = 0.04;
  return 1.0 + (siteIndex - baseline) * perUnit;
}

/**
 * Calculate carbon stock for a parcel — the total CO₂ currently stored.
 */
export function calculateCarbonStock(parcel: CarbonParcel): CarbonStock {
  const coeff = CARBON_COEFFICIENTS[parcel.species];
  const _ageMod = getAgeModifier(parcel.ageYears);
  const siMod = getSiteIndexModifier(parcel.siteIndex);

  // Cumulative sequestration (simplified integral of annual rate over age)
  // Approximation: sum annual rates from year 1 to current age
  let cumulativeAboveGround = 0;
  for (let yr = 1; yr <= parcel.ageYears; yr++) {
    const yrAgeMod = getAgeModifier(yr);
    const annualAGB = coeff.peakSequestration * yrAgeMod * siMod * (1 / (1 + coeff.rootShootRatio));
    cumulativeAboveGround += annualAGB;
  }

  const aboveGroundCO2 = cumulativeAboveGround * parcel.areaHa;
  const belowGroundCO2 = aboveGroundCO2 * coeff.rootShootRatio;
  const soilCO2 = coeff.soilCarbonRate * parcel.ageYears * parcel.areaHa;
  const totalCO2 = aboveGroundCO2 + belowGroundCO2 + soilCO2;

  return {
    totalCO2: Math.round(totalCO2),
    aboveGroundCO2: Math.round(aboveGroundCO2),
    belowGroundCO2: Math.round(belowGroundCO2),
    soilCO2: Math.round(soilCO2),
  };
}

/**
 * Calculate annual sequestration rate for a parcel.
 */
export function calculateAnnualSequestration(parcel: CarbonParcel): number {
  const coeff = CARBON_COEFFICIENTS[parcel.species];
  const ageMod = getAgeModifier(parcel.ageYears);
  const siMod = getSiteIndexModifier(parcel.siteIndex);
  return Math.round(coeff.peakSequestration * ageMod * siMod * parcel.areaHa);
}

/**
 * Calculate revenue by certification program.
 */
export function calculateRevenue(
  annualSequestration: number,
  program: CertificationProgram,
): number {
  const info = CERTIFICATION_PROGRAMS[program];
  return Math.round(annualSequestration * info.priceEurPerTon * SEK_PER_EUR);
}

/**
 * Full carbon analysis for a parcel.
 */
export function analyzeParcel(parcel: CarbonParcel): ParcelCarbonResult {
  const stock = calculateCarbonStock(parcel);
  const annualSequestration = calculateAnnualSequestration(parcel);

  const revenueByProgram: Record<CertificationProgram, number> = {
    gold_standard: calculateRevenue(annualSequestration, 'gold_standard'),
    verra: calculateRevenue(annualSequestration, 'verra'),
    plan_vivo: calculateRevenue(annualSequestration, 'plan_vivo'),
  };

  return { parcel, stock, annualSequestration, revenueByProgram };
}

/**
 * Assess biodiversity credit eligibility for a set of parcels.
 */
export function assessBiodiversity(parcels: CarbonParcel[]): BiodiversityEligibility {
  const totalArea = parcels.reduce((sum, p) => sum + p.areaHa, 0);
  const hasOldGrowth = parcels.some((p) => p.ageYears >= 80);
  const hasMixed = parcels.some((p) => p.species === 'mixed' || p.species === 'birch');
  const hasLargeArea = totalArea >= 50;

  // Recommend 5-10% of area for biodiversity set-aside
  const setAsideRecommendationHa = Math.round(totalArea * 0.07);

  // Set-aside revenue: LONA grants ~3,000 SEK/ha/year + ecosystem service value
  const setAsideRevenueSek = setAsideRecommendationHa * 3000;

  // Foregone timber revenue: ~5,000 SEK/ha/year average
  const timberRevenueSek = setAsideRecommendationHa * 5000;

  return {
    euBiodiversity2030: hasLargeArea && (hasOldGrowth || hasMixed),
    lonaEligible: hasOldGrowth || hasMixed,
    fscPremium: hasLargeArea,
    pefcPremium: totalArea >= 20,
    speciesRichStands: hasMixed || parcels.length >= 3,
    setAsideRecommendationHa,
    setAsideRevenueSek,
    timberRevenueSek,
  };
}

/**
 * Format a number as Swedish kronor.
 */
export function formatSEK(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format CO₂ tons with thousands separator.
 */
export function formatCO2(tons: number): string {
  return new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(tons);
}

/**
 * Equivalence calculations for making carbon numbers relatable.
 * Based on Swedish EPA / Naturvårdsverket emission factors.
 */
export function getEquivalences(tonsCO2: number) {
  return {
    /** Stockholm→Malmö flights (domestic flight ≈ 0.12 ton CO₂) */
    flights: Math.round(tonsCO2 / 0.12),
    /** Average Swedish car per year (≈ 1.8 ton CO₂) */
    carsPerYear: Math.round(tonsCO2 / 1.8),
    /** Average Swedish household electricity per year (≈ 0.4 ton CO₂) */
    households: Math.round(tonsCO2 / 0.4),
  };
}

// ─── Demo Data ───

export const DEMO_PARCELS: CarbonParcel[] = [
  {
    id: 'carbon-p1',
    name: 'Norra Granåsen',
    species: 'spruce',
    areaHa: 85,
    siteIndex: 26,
    ageYears: 55,
  },
  {
    id: 'carbon-p2',
    name: 'Tallmon Blandskog',
    species: 'mixed',
    areaHa: 42,
    siteIndex: 22,
    ageYears: 35,
  },
  {
    id: 'carbon-p3',
    name: 'Södra Planteringen',
    species: 'spruce',
    areaHa: 28,
    siteIndex: 28,
    ageYears: 12,
  },
];

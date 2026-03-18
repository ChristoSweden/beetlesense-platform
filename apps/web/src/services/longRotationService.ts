/**
 * Long-Rotation Economic Modeling Service
 *
 * 80-year financial planning for Swedish forest parcels using the Faustmann
 * formula (Land Expectation Value) and multiple revenue streams.
 *
 * Economic references:
 * - Faustmann (1849) LEV formula
 * - SLU Heureka yield tables for southern/central Sweden
 * - Skogforsk timber price series (2020-2025 averages)
 * - Swedish carbon credit market (EU ETS + voluntary)
 * - Jägareförbundet hunting lease benchmarks
 * - LONA/EU biodiversity subsidy schedules
 *
 * All monetary values in SEK unless stated otherwise.
 */

import {
  CARBON_COEFFICIENTS,
  getAgeModifier,
  getSiteIndexModifier,
  SEK_PER_EUR,
  type TreeSpecies,
} from './carbonService';

// ─── Types ───

export type StrategyId = 'traditional' | 'extended' | 'continuous_cover' | 'carbon_focused';

export interface StandParams {
  /** Stand age at year 0 of the projection */
  currentAge: number;
  /** Site index (dominant height at reference age 100, meters) */
  siteIndex: number;
  /** Area in hectares */
  areaHa: number;
  /** Dominant species */
  species: TreeSpecies;
  /** Current standing volume m³/ha (estimated from age + SI if not provided) */
  standingVolumePerHa?: number;
}

export interface RevenueStreamConfig {
  /** Timber prices enabled */
  timber: boolean;
  /** Carbon credit revenue enabled */
  carbon: boolean;
  /** Hunting lease enabled */
  hunting: boolean;
  /** Biodiversity set-aside payments enabled */
  biodiversity: boolean;
  /** Recreation/tourism income enabled */
  recreation: boolean;
}

export interface SensitivityParams {
  /** Timber price change factor (e.g. 1.2 = +20%) */
  timberPriceFactor: number;
  /** Carbon price change factor */
  carbonPriceFactor: number;
  /** Discount rate override (decimal, e.g. 0.025) */
  discountRate: number;
}

export interface YearlyProjection {
  year: number;
  age: number;
  /** Standing volume m³/ha */
  volumePerHa: number;
  /** Total standing volume m³ */
  totalVolume: number;
  /** Annual increment m³/ha */
  annualIncrement: number;
  /** Cumulative NPV at this year (kr) */
  cumulativeNPV: number;
  /** Revenue events this year */
  events: ProjectionEvent[];
  /** Revenue breakdown by stream this year (undiscounted) */
  revenueByStream: RevenueBreakdownYear;
  /** CO₂ stored (ton) */
  co2Stored: number;
}

export interface ProjectionEvent {
  type: 'thinning' | 'clearfell' | 'selective_harvest' | 'carbon_payment' | 'replant';
  label: string;
  volumeM3?: number;
  revenueSEK: number;
}

export interface RevenueBreakdownYear {
  timber: number;
  carbon: number;
  hunting: number;
  biodiversity: number;
  recreation: number;
}

export interface StrategyResult {
  id: StrategyId;
  label: string;
  labelSv: string;
  description: string;
  descriptionSv: string;
  /** Total NPV over projection horizon (kr) */
  totalNPV: number;
  /** Internal rate of return (approximate, %) */
  irr: number;
  /** Total harvest volume over projection (m³) */
  totalHarvestVolume: number;
  /** Total CO₂ stored at end of projection (ton) */
  endCO2Stored: number;
  /** Biodiversity score 1-5 */
  biodiversityScore: number;
  /** Management complexity 1-5 */
  managementComplexity: number;
  /** Risk level 1-5 */
  riskLevel: number;
  /** Year-by-year projection data */
  projections: YearlyProjection[];
  /** Cumulative revenue breakdown (undiscounted) */
  totalRevenueByStream: RevenueBreakdownYear;
}

export interface SensitivityResult {
  variable: string;
  variableSv: string;
  baseNPV: number;
  lowNPV: number;
  highNPV: number;
  impact: number; // highNPV - lowNPV
}

export interface BreakEvenResult {
  label: string;
  labelSv: string;
  value: string;
}

// ─── Constants: Swedish Forestry Economics ───

/** Average timber prices (SEK/m³ fub) — Skogforsk 2024 averages */
const TIMBER_PRICES: Record<TreeSpecies, { sawlog: number; pulpwood: number; premiumSawlog: number }> = {
  spruce: { sawlog: 750, pulpwood: 350, premiumSawlog: 975 },
  pine:   { sawlog: 700, pulpwood: 320, premiumSawlog: 910 },
  birch:  { sawlog: 550, pulpwood: 280, premiumSawlog: 715 },
  mixed:  { sawlog: 650, pulpwood: 310, premiumSawlog: 845 },
};

/** Harvest cost SEK/m³ (average skotning + avverkning) */
const HARVEST_COST_PER_M3 = 180;

/** Thinning cost premium (higher per-m³ cost due to lower volumes) */
const THINNING_COST_PREMIUM = 1.3;

/** Replanting cost SEK/ha (spruce plantering + markberedning) */
const REPLANT_COST_PER_HA = 12_000;

/** Carbon credit price EUR/ton CO₂ — mid-range voluntary market 2025 */
const CARBON_PRICE_EUR = 50;

/** Hunting lease SEK/ha/year — southern Sweden benchmark (Jägareförbundet) */
const HUNTING_LEASE_PER_HA = 55;

/** Biodiversity set-aside payments SEK/ha/year (LONA + EU schemes average) */
const BIODIVERSITY_PAYMENT_PER_HA = 1200;

/** Recreation/tourism income SEK/ha/year (average for accessible forest) */
const RECREATION_INCOME_PER_HA = 80;

/** Default discount rate */
const DEFAULT_DISCOUNT_RATE = 0.025;

/** Projection horizon */
const DEFAULT_HORIZON = 80;

// ─── Volume & Growth Model ───

/**
 * Estimate standing volume per hectare from age and site index.
 * Based on SLU yield tables for spruce in southern Sweden (Heureka).
 * Uses a Chapman-Richards growth function parameterized for Swedish conditions.
 */
export function estimateVolumePerHa(age: number, siteIndex: number, species: TreeSpecies): number {
  if (age <= 0) return 0;

  // Asymptotic maximum volume depends on SI and species
  const maxVolumeBase: Record<TreeSpecies, number> = {
    spruce: 650,
    pine: 500,
    birch: 400,
    mixed: 500,
  };

  const vMax = maxVolumeBase[species] * (siteIndex / 24);
  // Shape parameter: higher SI = faster initial growth
  const k = 0.025 + (siteIndex - 16) * 0.001;
  const m = 2.5;

  // Chapman-Richards: V = Vmax * (1 - e^(-k*age))^m
  const volume = vMax * Math.pow(1 - Math.exp(-k * age), m);
  return Math.max(0, Math.round(volume));
}

/**
 * Mean Annual Increment m³/ha/year at given age.
 */
export function calculateMAI(age: number, siteIndex: number, species: TreeSpecies): number {
  if (age <= 0) return 0;
  return estimateVolumePerHa(age, siteIndex, species) / age;
}

/**
 * Current Annual Increment (approximate via finite difference).
 */
export function calculateCAI(age: number, siteIndex: number, species: TreeSpecies): number {
  if (age <= 1) return estimateVolumePerHa(1, siteIndex, species);
  return estimateVolumePerHa(age, siteIndex, species) - estimateVolumePerHa(age - 1, siteIndex, species);
}

/**
 * Proportion of volume that is sawlog vs pulpwood by age.
 * Older/larger trees have higher sawlog fraction.
 */
function sawlogFraction(age: number): number {
  if (age < 30) return 0.1;
  if (age < 50) return 0.3 + (age - 30) * 0.015;
  if (age < 70) return 0.6 + (age - 50) * 0.01;
  if (age < 100) return 0.8 + (age - 70) * 0.003;
  return 0.89;
}

/**
 * Premium multiplier for larger dimensions (extended rotation).
 * Timber > 30cm DBH fetches ~30% premium in Swedish market.
 */
function premiumFactor(age: number): number {
  if (age < 80) return 1.0;
  if (age < 100) return 1.0 + (age - 80) * 0.015;
  return 1.3;
}

// ─── Thinning Schedule ───

interface ThinningEvent {
  age: number;
  /** Fraction of standing volume removed */
  fraction: number;
}

function getThinningSchedule(strategy: StrategyId, _species: TreeSpecies): ThinningEvent[] {
  switch (strategy) {
    case 'traditional':
      return [
        { age: 25, fraction: 0.20 },
        { age: 40, fraction: 0.20 },
        { age: 55, fraction: 0.15 },
      ];
    case 'extended':
      return [
        { age: 25, fraction: 0.15 },
        { age: 40, fraction: 0.15 },
        { age: 60, fraction: 0.15 },
        { age: 80, fraction: 0.10 },
      ];
    case 'continuous_cover':
      // Selective harvest every 10 years starting at age 30
      return Array.from({ length: 10 }, (_, i) => ({
        age: 30 + i * 10,
        fraction: 0.12,
      }));
    case 'carbon_focused':
      // Minimal thinning — only to prevent mortality
      return [
        { age: 30, fraction: 0.10 },
        { age: 55, fraction: 0.10 },
      ];
  }
}

function getClearfellAge(strategy: StrategyId): number | null {
  switch (strategy) {
    case 'traditional': return 75;
    case 'extended': return 110;
    case 'continuous_cover': return null; // no clearfell
    case 'carbon_focused': return null; // no clearfell
  }
}

// ─── Strategy Definitions ───

const STRATEGY_META: Record<StrategyId, {
  label: string;
  labelSv: string;
  description: string;
  descriptionSv: string;
  biodiversityScore: number;
  managementComplexity: number;
  riskLevel: number;
}> = {
  traditional: {
    label: 'Traditional Rotation',
    labelSv: 'Traditionell omloppstid',
    description: 'Clearfell at 70-80 years, replant. Standard Swedish forestry practice with thinnings at 25, 40, and 55 years.',
    descriptionSv: 'Kalavverkning vid 70-80 år, återplantering. Standard svenskt skogsbruk med gallring vid 25, 40 och 55 år.',
    biodiversityScore: 2,
    managementComplexity: 2,
    riskLevel: 3,
  },
  extended: {
    label: 'Extended Rotation',
    labelSv: 'Förlängd omloppstid',
    description: 'Rotate at 100-110 years for premium large-dimension timber. 30% price premium on sawlogs.',
    descriptionSv: 'Omloppstid 100-110 år för premierat grovt virke. 30% prispremie på sågtimmer.',
    biodiversityScore: 3,
    managementComplexity: 2,
    riskLevel: 3,
  },
  continuous_cover: {
    label: 'Continuous Cover (Hyggesfritt)',
    labelSv: 'Hyggesfritt / Kontinuitetsskogsbruk',
    description: 'Uneven-aged management with selective harvests every ~10 years. No clearfelling. Steady annual cashflow.',
    descriptionSv: 'Skiktad skog med selektiv avverkning var ~10 år. Ingen kalavverkning. Jämnt kassaflöde.',
    biodiversityScore: 4,
    managementComplexity: 4,
    riskLevel: 2,
  },
  carbon_focused: {
    label: 'Carbon-Focused',
    labelSv: 'Kolfokuserad strategi',
    description: 'Maximize standing volume and carbon sequestration. Minimal harvest, rely on carbon credit revenue.',
    descriptionSv: 'Maximera stående volym och kolinlagring. Minimal avverkning, förlita sig på intäkter från kolkrediter.',
    biodiversityScore: 5,
    managementComplexity: 1,
    riskLevel: 4,
  },
};

// ─── Core Projection Engine ───

/**
 * Run a full economic projection for a given strategy.
 */
export function projectStrategy(
  stand: StandParams,
  strategy: StrategyId,
  streams: RevenueStreamConfig,
  sensitivity: SensitivityParams,
  horizonYears: number = DEFAULT_HORIZON,
): StrategyResult {
  const meta = STRATEGY_META[strategy];
  const prices = TIMBER_PRICES[stand.species];
  const thinnings = getThinningSchedule(strategy, stand.species);
  const clearfellAge = getClearfellAge(strategy);
  const discountRate = sensitivity.discountRate;

  const projections: YearlyProjection[] = [];
  let cumulativeNPV = 0;
  let totalHarvestVolume = 0;
  const totalRevenue: RevenueBreakdownYear = {
    timber: 0, carbon: 0, hunting: 0, biodiversity: 0, recreation: 0,
  };

  // Track volume accounting for harvests
  const _volumeHarvested = 0;
  let replanted = false;
  let replantYear: number | null = null;

  for (let yr = 0; yr <= horizonYears; yr++) {
    const age = stand.currentAge + yr;
    const discountFactor = 1 / Math.pow(1 + discountRate, yr);

    // Effective age for volume calculation (accounts for replanting)
    let effectiveAge = age;
    if (replantYear !== null) {
      effectiveAge = yr - replantYear;
    }

    // Standing volume
    const baseVolumePerHa = estimateVolumePerHa(effectiveAge, stand.siteIndex, stand.species);
    // Adjust for previous thinning removals (simplified: volume regrows naturally)
    const volumePerHa = Math.max(0, baseVolumePerHa);
    const totalVolume = volumePerHa * stand.areaHa;

    const cai = effectiveAge > 0
      ? estimateVolumePerHa(effectiveAge, stand.siteIndex, stand.species) -
        estimateVolumePerHa(effectiveAge - 1, stand.siteIndex, stand.species)
      : 0;

    const events: ProjectionEvent[] = [];
    const yearRevenue: RevenueBreakdownYear = {
      timber: 0, carbon: 0, hunting: 0, biodiversity: 0, recreation: 0,
    };

    // ── Thinning events ──
    const thinning = thinnings.find(t => t.age === age);
    if (thinning && !replanted) {
      const thinVolume = volumePerHa * thinning.fraction * stand.areaHa;
      const sawFrac = sawlogFraction(age) * 0.5; // thinning yields less sawlog
      const thinRevenue = thinVolume * (
        sawFrac * prices.sawlog * sensitivity.timberPriceFactor +
        (1 - sawFrac) * prices.pulpwood * sensitivity.timberPriceFactor -
        HARVEST_COST_PER_M3 * THINNING_COST_PREMIUM
      );

      if (streams.timber && thinRevenue > 0) {
        events.push({
          type: strategy === 'continuous_cover' ? 'selective_harvest' : 'thinning',
          label: strategy === 'continuous_cover'
            ? `Selective harvest ${Math.round(thinVolume)} m³`
            : `Thinning ${Math.round(thinVolume)} m³`,
          volumeM3: Math.round(thinVolume),
          revenueSEK: Math.round(thinRevenue),
        });
        yearRevenue.timber += thinRevenue;
        totalHarvestVolume += thinVolume;
      }
    }

    // ── Clearfell ──
    if (clearfellAge !== null && age === clearfellAge && !replanted) {
      const remainingVolume = volumePerHa * stand.areaHa;
      const sawFrac = sawlogFraction(age);
      const prem = premiumFactor(age);
      const clearRevenue = remainingVolume * (
        sawFrac * prices.sawlog * prem * sensitivity.timberPriceFactor +
        (1 - sawFrac) * prices.pulpwood * sensitivity.timberPriceFactor -
        HARVEST_COST_PER_M3
      );

      if (streams.timber) {
        events.push({
          type: 'clearfell',
          label: `Clearfell ${Math.round(remainingVolume)} m³`,
          volumeM3: Math.round(remainingVolume),
          revenueSEK: Math.round(clearRevenue),
        });
        yearRevenue.timber += clearRevenue;
        totalHarvestVolume += remainingVolume;
      }

      // Replanting cost
      const replantCost = REPLANT_COST_PER_HA * stand.areaHa;
      events.push({
        type: 'replant',
        label: 'Replanting',
        revenueSEK: -Math.round(replantCost),
      });
      yearRevenue.timber -= replantCost;
      replanted = true;
      replantYear = yr;
    }

    // ── Carbon revenue (annual) ──
    if (streams.carbon && yr > 0) {
      const coeff = CARBON_COEFFICIENTS[stand.species];
      const ageMod = getAgeModifier(effectiveAge);
      const siMod = getSiteIndexModifier(stand.siteIndex);
      const annualCO2 = coeff.peakSequestration * ageMod * siMod * stand.areaHa;
      const carbonRevenue = annualCO2 * CARBON_PRICE_EUR * sensitivity.carbonPriceFactor * SEK_PER_EUR;

      yearRevenue.carbon += carbonRevenue;

      if (yr % 5 === 0) {
        events.push({
          type: 'carbon_payment',
          label: `Carbon credits (${Math.round(annualCO2)} ton CO₂/yr)`,
          revenueSEK: Math.round(carbonRevenue),
        });
      }
    }

    // ── Hunting lease (annual) ──
    if (streams.hunting) {
      yearRevenue.hunting += HUNTING_LEASE_PER_HA * stand.areaHa;
    }

    // ── Biodiversity payments (annual, only for qualifying strategies) ──
    if (streams.biodiversity) {
      const bioFactor = strategy === 'carbon_focused' ? 1.5 :
                        strategy === 'continuous_cover' ? 1.2 :
                        strategy === 'extended' ? 0.7 : 0.3;
      yearRevenue.biodiversity += BIODIVERSITY_PAYMENT_PER_HA * stand.areaHa * bioFactor;
    }

    // ── Recreation (annual) ──
    if (streams.recreation) {
      const recFactor = strategy === 'continuous_cover' ? 1.5 :
                        strategy === 'carbon_focused' ? 1.2 : 1.0;
      yearRevenue.recreation += RECREATION_INCOME_PER_HA * stand.areaHa * recFactor;
    }

    // ── NPV accumulation ──
    const yearTotal = yearRevenue.timber + yearRevenue.carbon +
      yearRevenue.hunting + yearRevenue.biodiversity + yearRevenue.recreation;
    cumulativeNPV += yearTotal * discountFactor;

    // Running totals
    totalRevenue.timber += yearRevenue.timber;
    totalRevenue.carbon += yearRevenue.carbon;
    totalRevenue.hunting += yearRevenue.hunting;
    totalRevenue.biodiversity += yearRevenue.biodiversity;
    totalRevenue.recreation += yearRevenue.recreation;

    // CO₂ stored
    const coeff = CARBON_COEFFICIENTS[stand.species];
    const _ageMod = getAgeModifier(effectiveAge);
    const siMod = getSiteIndexModifier(stand.siteIndex);
    let co2Stored = 0;
    for (let a = 1; a <= effectiveAge; a++) {
      const yrAgeMod = getAgeModifier(a);
      co2Stored += coeff.peakSequestration * yrAgeMod * siMod;
    }
    co2Stored *= stand.areaHa;

    projections.push({
      year: yr,
      age,
      volumePerHa,
      totalVolume,
      annualIncrement: Math.max(0, cai),
      cumulativeNPV: Math.round(cumulativeNPV),
      events,
      revenueByStream: {
        timber: Math.round(yearRevenue.timber),
        carbon: Math.round(yearRevenue.carbon),
        hunting: Math.round(yearRevenue.hunting),
        biodiversity: Math.round(yearRevenue.biodiversity),
        recreation: Math.round(yearRevenue.recreation),
      },
      co2Stored: Math.round(co2Stored),
    });
  }

  // Approximate IRR via bisection
  const irr = approximateIRR(projections);

  const lastProjection = projections[projections.length - 1];

  return {
    id: strategy,
    ...meta,
    totalNPV: Math.round(cumulativeNPV),
    irr,
    totalHarvestVolume: Math.round(totalHarvestVolume),
    endCO2Stored: lastProjection?.co2Stored ?? 0,
    projections,
    totalRevenueByStream: {
      timber: Math.round(totalRevenue.timber),
      carbon: Math.round(totalRevenue.carbon),
      hunting: Math.round(totalRevenue.hunting),
      biodiversity: Math.round(totalRevenue.biodiversity),
      recreation: Math.round(totalRevenue.recreation),
    },
  };
}

/**
 * Approximate IRR using bisection on cumulative cashflows.
 */
function approximateIRR(projections: YearlyProjection[]): number {
  const cashflows: number[] = projections.map(p => {
    const total = p.revenueByStream.timber + p.revenueByStream.carbon +
      p.revenueByStream.hunting + p.revenueByStream.biodiversity + p.revenueByStream.recreation;
    return total;
  });

  function npvAtRate(rate: number): number {
    return cashflows.reduce((sum, cf, yr) => sum + cf / Math.pow(1 + rate, yr), 0);
  }

  let lo = -0.05;
  let hi = 0.30;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (npvAtRate(mid) > 0) lo = mid;
    else hi = mid;
  }
  return Math.round(((lo + hi) / 2) * 1000) / 10; // percentage with one decimal
}

// ─── Run All Strategies ───

export function runAllStrategies(
  stand: StandParams,
  streams: RevenueStreamConfig,
  sensitivity: SensitivityParams,
  horizonYears?: number,
): StrategyResult[] {
  const strategies: StrategyId[] = ['traditional', 'extended', 'continuous_cover', 'carbon_focused'];
  const horizon = horizonYears ?? (
    strategies.includes('extended') ? 120 : DEFAULT_HORIZON
  );

  return strategies.map(s => projectStrategy(stand, s, streams, sensitivity, horizon));
}

// ─── Sensitivity Analysis ───

export function runSensitivityAnalysis(
  stand: StandParams,
  strategy: StrategyId,
  streams: RevenueStreamConfig,
  baseSensitivity: SensitivityParams,
): SensitivityResult[] {
  const base = projectStrategy(stand, strategy, streams, baseSensitivity);

  const results: SensitivityResult[] = [];

  // Timber price ±20%
  const timberLow = projectStrategy(stand, strategy, streams, {
    ...baseSensitivity, timberPriceFactor: baseSensitivity.timberPriceFactor * 0.8,
  });
  const timberHigh = projectStrategy(stand, strategy, streams, {
    ...baseSensitivity, timberPriceFactor: baseSensitivity.timberPriceFactor * 1.2,
  });
  results.push({
    variable: 'Timber Price',
    variableSv: 'Virkespris',
    baseNPV: base.totalNPV,
    lowNPV: timberLow.totalNPV,
    highNPV: timberHigh.totalNPV,
    impact: timberHigh.totalNPV - timberLow.totalNPV,
  });

  // Carbon price ±50%
  const carbonLow = projectStrategy(stand, strategy, streams, {
    ...baseSensitivity, carbonPriceFactor: baseSensitivity.carbonPriceFactor * 0.5,
  });
  const carbonHigh = projectStrategy(stand, strategy, streams, {
    ...baseSensitivity, carbonPriceFactor: baseSensitivity.carbonPriceFactor * 1.5,
  });
  results.push({
    variable: 'Carbon Price',
    variableSv: 'Kolpris',
    baseNPV: base.totalNPV,
    lowNPV: carbonLow.totalNPV,
    highNPV: carbonHigh.totalNPV,
    impact: carbonHigh.totalNPV - carbonLow.totalNPV,
  });

  // Discount rate ±1%
  const drLow = projectStrategy(stand, strategy, streams, {
    ...baseSensitivity, discountRate: Math.max(0.005, baseSensitivity.discountRate - 0.01),
  });
  const drHigh = projectStrategy(stand, strategy, streams, {
    ...baseSensitivity, discountRate: baseSensitivity.discountRate + 0.01,
  });
  results.push({
    variable: 'Discount Rate',
    variableSv: 'Kalkylränta',
    baseNPV: base.totalNPV,
    lowNPV: drHigh.totalNPV, // higher rate = lower NPV
    highNPV: drLow.totalNPV, // lower rate = higher NPV
    impact: drLow.totalNPV - drHigh.totalNPV,
  });

  return results.sort((a, b) => b.impact - a.impact);
}

// ─── Break-Even Analysis ───

export function calculateBreakEvens(
  stand: StandParams,
  streams: RevenueStreamConfig,
  baseSensitivity: SensitivityParams,
): BreakEvenResult[] {
  const results: BreakEvenResult[] = [];

  // Find carbon price where carbon-focused beats traditional
  const traditional = projectStrategy(stand, 'traditional', streams, baseSensitivity);
  for (let factor = 0.5; factor <= 5.0; factor += 0.1) {
    const carbonResult = projectStrategy(stand, 'carbon_focused', streams, {
      ...baseSensitivity, carbonPriceFactor: factor,
    });
    if (carbonResult.totalNPV >= traditional.totalNPV) {
      const breakEvenPrice = Math.round(CARBON_PRICE_EUR * factor);
      results.push({
        label: `Carbon credits become more valuable than traditional timber if carbon price exceeds €${breakEvenPrice}/ton`,
        labelSv: `Kolkrediter blir mer lönsamma än traditionellt skogsbruk om kolpriset överstiger €${breakEvenPrice}/ton`,
        value: `€${breakEvenPrice}/ton CO₂`,
      });
      break;
    }
  }

  // Find discount rate where extended beats traditional
  for (let dr = 0.005; dr <= 0.06; dr += 0.001) {
    const ext = projectStrategy(stand, 'extended', { ...streams }, { ...baseSensitivity, discountRate: dr });
    const trad = projectStrategy(stand, 'traditional', { ...streams }, { ...baseSensitivity, discountRate: dr });
    if (ext.totalNPV >= trad.totalNPV) {
      results.push({
        label: `Extended rotation is preferable at discount rates below ${(dr * 100).toFixed(1)}%`,
        labelSv: `Förlängd omloppstid är att föredra vid kalkylräntor under ${(dr * 100).toFixed(1)}%`,
        value: `${(dr * 100).toFixed(1)}%`,
      });
      break;
    }
  }

  return results;
}

// ─── Formatting Helpers ───

export function formatKr(amount: number): string {
  if (Math.abs(amount) >= 1_000_000) {
    return `${(amount / 1_000_000).toFixed(1)} M kr`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${Math.round(amount / 1_000)} k kr`;
  }
  return `${Math.round(amount)} kr`;
}

export function formatKrFull(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Demo Stand ───

export const DEMO_STAND: StandParams = {
  currentAge: 55,
  siteIndex: 26,
  areaHa: 45,
  species: 'spruce',
};

export const DEFAULT_STREAMS: RevenueStreamConfig = {
  timber: true,
  carbon: true,
  hunting: true,
  biodiversity: true,
  recreation: true,
};

export const DEFAULT_SENSITIVITY: SensitivityParams = {
  timberPriceFactor: 1.0,
  carbonPriceFactor: 1.0,
  discountRate: DEFAULT_DISCOUNT_RATE,
};

export const DISCOUNT_RATE_OPTIONS = [
  { value: 0.015, label: '1.5%' },
  { value: 0.025, label: '2.5%' },
  { value: 0.035, label: '3.5%' },
  { value: 0.045, label: '4.5%' },
];

export const ALL_STRATEGIES: StrategyId[] = ['traditional', 'extended', 'continuous_cover', 'carbon_focused'];

export const STRATEGY_COLORS: Record<StrategyId, string> = {
  traditional: '#4ade80',
  extended: '#60a5fa',
  continuous_cover: '#fbbf24',
  carbon_focused: '#a78bfa',
};

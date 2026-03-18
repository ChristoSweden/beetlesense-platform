/**
 * OperationCostCalculator — Calculates costs, revenue, and tax for
 * Swedish forestry operations (thinning, final harvest, planting, rojning).
 *
 * All monetary values in SEK. Volumes in m3fub unless otherwise noted.
 */

import {
  type OperationType,
  type TerrainType,
  type StemSize,
  HARVESTER_COSTS,
  FORWARDER_COSTS,
  TRANSPORT_COSTS,
  SILVICULTURE_COSTS,
  PLANNING_COSTS,
  ROAD_MAINTENANCE_COSTS,
  TYPICAL_VOLUMES_PER_HA,
  DEFAULT_STEM_SIZE,
  TAX_BRACKETS,
  SKOGSKONTO_RULES,
  RANTEFORDELNING,
  ANNUAL_GROWTH_M3SK_PER_HA,
  ANNUAL_PRICE_CHANGE_PERCENT,
} from '@/data/swedishForestryEconomics';
import {
  TIMBER_PRICES,
  type TimberSpecies,
} from '@/services/timberPriceService';

// ─── Input Types ───

export interface SpeciesMix {
  species: TimberSpecies;
  /** Proportion 0-1 */
  proportion: number;
  /** Sawlog quality ratio 0-1 */
  sawlogRatio: number;
  /** Pulpwood quality ratio 0-1 */
  pulpRatio: number;
}

export interface SimulatorInput {
  operationType: OperationType;
  /** Area in hectares */
  areaHa: number;
  speciesMix: SpeciesMix[];
  terrain: TerrainType;
  /** Distance to road in km (0-5) */
  distanceToRoadKm: number;
  /** Distance to nearest mill in km (optional, default 60) */
  distanceToMillKm?: number;
  /** Volume per hectare in m3fub (optional, uses defaults) */
  volumePerHaM3fub?: number;
  /** Stem size override (optional, derived from operation type) */
  stemSize?: StemSize;
  /** Annual income from other sources (for marginal tax calculation) */
  otherAnnualIncome?: number;
  /** Skogskonto allocation percentage 0-100 */
  skogskontoPercent?: number;
  /** Property tax assessment value (taxeringsvarde) */
  taxAssessmentValue?: number;
  /** Adjusted equity for rantefordelning */
  adjustedEquity?: number;
  /** Region for growth estimates */
  region?: 'south' | 'central' | 'north';
}

// ─── Output Types ───

export interface CostBreakdown {
  harvester: number;
  forwarder: number;
  transport: number;
  planning: number;
  roadMaintenance: number;
  silviculture: number;
  total: number;
}

export interface RevenueBreakdown {
  sawlogRevenue: number;
  pulpRevenue: number;
  total: number;
  /** Revenue by species */
  bySpecies: Array<{
    species: TimberSpecies;
    sawlogRevenue: number;
    pulpRevenue: number;
    total: number;
    volumeM3fub: number;
  }>;
}

export interface TaxEstimate {
  /** Taxable income before skogskonto */
  taxableIncome: number;
  /** Amount deposited to skogskonto */
  skogskontoDeposit: number;
  /** Max allowed skogskonto deposit */
  skogskontoMax: number;
  /** Rantefordelning deduction */
  rantefordelning: number;
  /** Income tax on the remaining taxable amount */
  incomeTax: number;
  /** Effective tax rate */
  effectiveRate: number;
  /** Tax saved by using skogskonto */
  taxSavedBySkogskonto: number;
  /** Tax saved by rantefordelning */
  taxSavedByRantefordelning: number;
}

export interface DeferralComparison {
  /** Current net after tax */
  currentNetAfterTax: number;
  /** Projected net after tax if deferred 1 year */
  deferredNetAfterTax: number;
  /** Difference */
  difference: number;
  /** Growth volume added */
  additionalGrowthM3fub: number;
  /** Price change applied */
  priceChangePercent: number;
}

export interface SimulatorResult {
  operationType: OperationType;
  areaHa: number;
  totalVolumeM3fub: number;
  revenue: RevenueBreakdown;
  costs: CostBreakdown;
  netBeforeTax: number;
  tax: TaxEstimate;
  netAfterTax: number;
  deferral: DeferralComparison;
}

// ─── Helpers ───

function getForwardingDistance(distanceToRoadKm: number): 'short' | 'medium' | 'long' {
  if (distanceToRoadKm <= 1) return 'short';
  if (distanceToRoadKm <= 3) return 'medium';
  return 'long';
}

function calculateIncomeTax(taxableIncome: number, otherIncome: number): number {
  const totalIncome = otherIncome + taxableIncome;
  const baselineTax = calculateTaxForAmount(otherIncome);
  const totalTax = calculateTaxForAmount(totalIncome);
  return Math.round(totalTax - baselineTax);
}

function calculateTaxForAmount(amount: number): number {
  if (amount <= 0) return 0;
  let tax = 0;
  let remaining = amount;
  let prevLimit = 0;

  for (const bracket of TAX_BRACKETS) {
    const bracketWidth = bracket.upTo === Infinity ? remaining : bracket.upTo - prevLimit;
    const taxableInBracket = Math.min(remaining, bracketWidth);
    tax += taxableInBracket * bracket.totalRate;
    remaining -= taxableInBracket;
    prevLimit = bracket.upTo;
    if (remaining <= 0) break;
  }

  return tax;
}

// ─── Main Calculator ───

export function calculateOperation(input: SimulatorInput): SimulatorResult {
  const {
    operationType,
    areaHa,
    speciesMix,
    terrain,
    distanceToRoadKm,
    distanceToMillKm = TRANSPORT_COSTS.defaultDistanceKm,
    otherAnnualIncome = 0,
    skogskontoPercent = 0,
    taxAssessmentValue = SKOGSKONTO_RULES.defaultTaxAssessmentValue,
    adjustedEquity = RANTEFORDELNING.defaultEquity,
    region = 'south',
  } = input;

  const isHarvestOp = operationType === 'thinning' || operationType === 'finalHarvest';

  // ─── Volume ───
  let totalVolumeM3fub = 0;
  if (isHarvestOp) {
    const volumePerHa = input.volumePerHaM3fub ??
      TYPICAL_VOLUMES_PER_HA[operationType];
    totalVolumeM3fub = volumePerHa * areaHa;
  }

  // ─── Revenue ───
  const revenue = calculateRevenue(speciesMix, totalVolumeM3fub, isHarvestOp);

  // ─── Costs ───
  const costs = calculateCosts(
    operationType,
    areaHa,
    totalVolumeM3fub,
    terrain,
    distanceToRoadKm,
    distanceToMillKm,
    input.stemSize,
  );

  // ─── Net Before Tax ───
  const netBeforeTax = revenue.total - costs.total;

  // ─── Tax ───
  const tax = calculateTax(
    netBeforeTax,
    otherAnnualIncome,
    skogskontoPercent,
    taxAssessmentValue,
    adjustedEquity,
  );

  const netAfterTax = netBeforeTax - tax.incomeTax;

  // ─── Deferral Comparison ───
  const deferral = calculateDeferral(
    input,
    revenue,
    costs,
    tax,
    netAfterTax,
    region,
  );

  return {
    operationType,
    areaHa,
    totalVolumeM3fub: Math.round(totalVolumeM3fub),
    revenue,
    costs,
    netBeforeTax: Math.round(netBeforeTax),
    tax,
    netAfterTax: Math.round(netAfterTax),
    deferral,
  };
}

function calculateRevenue(
  speciesMix: SpeciesMix[],
  totalVolumeM3fub: number,
  isHarvestOp: boolean,
): RevenueBreakdown {
  if (!isHarvestOp || totalVolumeM3fub <= 0) {
    return { sawlogRevenue: 0, pulpRevenue: 0, total: 0, bySpecies: [] };
  }

  let totalSawlog = 0;
  let totalPulp = 0;
  const bySpecies: RevenueBreakdown['bySpecies'] = [];

  for (const mix of speciesMix) {
    const prices = TIMBER_PRICES[mix.species];
    if (!prices) continue;

    const volumeM3fub = totalVolumeM3fub * mix.proportion;
    const sawlogRevenue = Math.round(volumeM3fub * mix.sawlogRatio * prices.sawlogPrice);
    const pulpRevenue = Math.round(volumeM3fub * mix.pulpRatio * prices.pulpPrice);

    totalSawlog += sawlogRevenue;
    totalPulp += pulpRevenue;

    bySpecies.push({
      species: mix.species,
      sawlogRevenue,
      pulpRevenue,
      total: sawlogRevenue + pulpRevenue,
      volumeM3fub: Math.round(volumeM3fub),
    });
  }

  return {
    sawlogRevenue: totalSawlog,
    pulpRevenue: totalPulp,
    total: totalSawlog + totalPulp,
    bySpecies,
  };
}

function calculateCosts(
  operationType: OperationType,
  areaHa: number,
  totalVolumeM3fub: number,
  terrain: TerrainType,
  distanceToRoadKm: number,
  distanceToMillKm: number,
  stemSizeOverride?: StemSize,
): CostBreakdown {
  let harvester = 0;
  let forwarder = 0;
  let transport = 0;
  let silviculture = 0;

  if (operationType === 'thinning' || operationType === 'finalHarvest') {
    const stemSize = stemSizeOverride ?? DEFAULT_STEM_SIZE[operationType];
    const harvesterRate = HARVESTER_COSTS[terrain][stemSize];
    harvester = Math.round(totalVolumeM3fub * harvesterRate);

    const fwdDistance = getForwardingDistance(distanceToRoadKm);
    const forwarderRate = FORWARDER_COSTS[terrain][fwdDistance];
    forwarder = Math.round(totalVolumeM3fub * forwarderRate);

    const transportRate = TRANSPORT_COSTS.baseCost +
      (distanceToMillKm * TRANSPORT_COSTS.perKmCost);
    transport = Math.round(totalVolumeM3fub * transportRate);
  }

  if (operationType === 'planting') {
    silviculture = Math.round(
      areaHa * SILVICULTURE_COSTS.planting.typical +
      areaHa * SILVICULTURE_COSTS.sitePreparation.typical,
    );
  }

  if (operationType === 'preCommercialThinning') {
    silviculture = Math.round(
      areaHa * SILVICULTURE_COSTS.preCommercialThinning.typical,
    );
  }

  const planning = Math.max(
    Math.round(areaHa * PLANNING_COSTS.perHectare),
    PLANNING_COSTS.minimumCost,
  );

  const roadMaintenance = Math.round(areaHa * ROAD_MAINTENANCE_COSTS.perHectare);

  const total = harvester + forwarder + transport + planning + roadMaintenance + silviculture;

  return {
    harvester,
    forwarder,
    transport,
    planning,
    roadMaintenance,
    silviculture,
    total,
  };
}

function calculateTax(
  netBeforeTax: number,
  otherAnnualIncome: number,
  skogskontoPercent: number,
  taxAssessmentValue: number,
  adjustedEquity: number,
): TaxEstimate {
  if (netBeforeTax <= 0) {
    return {
      taxableIncome: 0,
      skogskontoDeposit: 0,
      skogskontoMax: 0,
      rantefordelning: 0,
      incomeTax: 0,
      effectiveRate: 0,
      taxSavedBySkogskonto: 0,
      taxSavedByRantefordelning: 0,
    };
  }

  // Skogskonto limits
  const maxByIncome = netBeforeTax * SKOGSKONTO_RULES.maxShareOfIncome;
  const maxByTaxValue = taxAssessmentValue * SKOGSKONTO_RULES.maxShareOfTaxValue;
  const skogskontoMax = Math.round(Math.min(maxByIncome, maxByTaxValue));

  const desiredDeposit = netBeforeTax * (skogskontoPercent / 100);
  const skogskontoDeposit = Math.round(Math.min(desiredDeposit, skogskontoMax));

  // Rantefordelning
  const rantefordelningAmount = Math.round(adjustedEquity * RANTEFORDELNING.allocationRate);
  const afterSkogskonto = netBeforeTax - skogskontoDeposit;
  const rantefordelning = Math.min(rantefordelningAmount, afterSkogskonto);

  // Taxable as income (naringsverksamhet)
  const taxableAsIncome = afterSkogskonto - rantefordelning;

  // Tax on rantefordelning portion (capital income tax)
  const capitalTax = Math.round(rantefordelning * RANTEFORDELNING.capitalTaxRate);

  // Income tax on the rest
  const incomeTaxOnBusiness = calculateIncomeTax(Math.max(0, taxableAsIncome), otherAnnualIncome);

  const totalTax = incomeTaxOnBusiness + capitalTax;

  // Calculate tax saved
  const taxWithoutSkogskonto = calculateIncomeTax(netBeforeTax - rantefordelning, otherAnnualIncome) + capitalTax;
  const taxSavedBySkogskonto = Math.round(taxWithoutSkogskonto - totalTax);

  const taxWithoutRantefordelning = calculateIncomeTax(afterSkogskonto, otherAnnualIncome);
  const taxSavedByRantefordelning = Math.round(
    taxWithoutRantefordelning - (incomeTaxOnBusiness + capitalTax),
  );

  const effectiveRate = netBeforeTax > 0 ? totalTax / netBeforeTax : 0;

  return {
    taxableIncome: Math.round(taxableAsIncome),
    skogskontoDeposit,
    skogskontoMax,
    rantefordelning: Math.round(rantefordelning),
    incomeTax: Math.round(totalTax),
    effectiveRate: Math.round(effectiveRate * 1000) / 1000,
    taxSavedBySkogskonto: Math.max(0, taxSavedBySkogskonto),
    taxSavedByRantefordelning: Math.max(0, taxSavedByRantefordelning),
  };
}

function calculateDeferral(
  input: SimulatorInput,
  currentRevenue: RevenueBreakdown,
  currentCosts: CostBreakdown,
  currentTax: TaxEstimate,
  currentNetAfterTax: number,
  region: string,
): DeferralComparison {
  const isHarvestOp = input.operationType === 'thinning' || input.operationType === 'finalHarvest';

  if (!isHarvestOp) {
    return {
      currentNetAfterTax,
      deferredNetAfterTax: currentNetAfterTax,
      difference: 0,
      additionalGrowthM3fub: 0,
      priceChangePercent: ANNUAL_PRICE_CHANGE_PERCENT,
    };
  }

  // Additional growth
  const growthRate = ANNUAL_GROWTH_M3SK_PER_HA[region] ?? ANNUAL_GROWTH_M3SK_PER_HA.default;
  // Convert m3sk to m3fub approximately (avg factor ~0.82)
  const additionalGrowthM3fub = Math.round(input.areaHa * growthRate * 0.82);

  // Price increase
  const priceFactor = 1 + ANNUAL_PRICE_CHANGE_PERCENT / 100;

  // New revenue — calculate current volume from input params
  const currentVolume = (input.volumePerHaM3fub ?? TYPICAL_VOLUMES_PER_HA[input.operationType as 'thinning' | 'finalHarvest']) * input.areaHa;
  const newVolume = currentVolume + additionalGrowthM3fub;

  const volumeRatio = currentRevenue.total > 0 ? newVolume / (newVolume - additionalGrowthM3fub) : 1;
  const deferredRevenue = Math.round(currentRevenue.total * volumeRatio * priceFactor);

  // Costs scale with volume
  const costRatio = newVolume / Math.max(newVolume - additionalGrowthM3fub, 1);
  const deferredCosts = Math.round(currentCosts.total * costRatio);

  const deferredNetBefore = deferredRevenue - deferredCosts;
  const deferredTax = calculateTax(
    deferredNetBefore,
    input.otherAnnualIncome ?? 0,
    input.skogskontoPercent ?? 0,
    input.taxAssessmentValue ?? SKOGSKONTO_RULES.defaultTaxAssessmentValue,
    input.adjustedEquity ?? RANTEFORDELNING.defaultEquity,
  );
  const deferredNetAfterTax = Math.round(deferredNetBefore - deferredTax.incomeTax);

  return {
    currentNetAfterTax,
    deferredNetAfterTax,
    difference: deferredNetAfterTax - currentNetAfterTax,
    additionalGrowthM3fub,
    priceChangePercent: ANNUAL_PRICE_CHANGE_PERCENT,
  };
}

/**
 * Carbon & Biomass Estimation Service
 *
 * Multi-method above-ground biomass (AGB) and carbon stock estimation
 * combining SAR backscatter, kNN volume, and canopy height allometrics.
 * Turns BeetleSense from pest detection into full forest asset valuation.
 *
 * Data sources:
 * - SLU (Swedish University of Agricultural Sciences) regression models
 * - Skogsstyrelsen kNN forest map (volume, species, age)
 * - Sentinel-1 VH backscatter biomass proxy
 * - Canopy height models (from LiDAR or photogrammetry)
 * - EU ETS carbon pricing for economic valuation
 *
 * References:
 * - IPCC Guidelines for National Greenhouse Gas Inventories (2006)
 * - SLU Forest Statistics: https://www.slu.se/en/Collaborative-Centres-and-Projects/the-swedish-national-forest-inventory/
 * - Skogsstyrelsen kNN: https://www.skogsstyrelsen.se/sjalvservice/karttjanster/skogliga-grunddata/
 */

// ─── Types ───

export interface BiomassEstimate {
  aboveGroundBiomass: number;     // tonnes/ha
  belowGroundBiomass: number;     // tonnes/ha (root:shoot ratio)
  totalBiomass: number;           // tonnes/ha
  carbonStock: number;            // tonnes C/ha (biomass * carbon fraction)
  co2Equivalent: number;          // tonnes CO2e/ha (carbon * 3.67)
  confidence: number;             // 0-1
  method: string;
  sources: string[];
}

export interface CarbonTimeSeries {
  period: string;
  estimates: MonthlyCarbon[];
  annualSequestration: number;    // tonnes CO2e/ha/year
  trend: 'accumulating' | 'stable' | 'declining';
  projectedValue: ForestValuation;
}

export interface MonthlyCarbon {
  date: string;
  carbonStock: number;            // tonnes C/ha
  netChange: number;              // tonnes C/ha vs previous month
  growthRate: number;             // tonnes C/ha/month
}

export interface ForestValuation {
  carbonValueEUR: number;         // at EU ETS price
  timberValueSEK: number;         // from volume estimate
  totalAssetValueSEK: number;
  euEtsPrice: number;             // EUR/tonne CO2
  timberPriceSEK: number;         // SEK/m³ (weighted average)
}

export interface SpeciesBiomassParams {
  species: string;
  woodDensity: number;            // tonnes/m3
  bef: number;                    // Biomass Expansion Factor
  rootShootRatio: number;
  carbonFraction: number;         // typically 0.47-0.51
}

export interface BiomassInput {
  backscatterVH?: number;         // dB from Sentinel-1
  volumeM3PerHa?: number;         // kNN stem volume
  canopyHeightM?: number;          // from LiDAR / photogrammetry
  species?: string;                // dominant species key
  areaHa?: number;                 // parcel area in hectares
}

// ─── Source Info ───

export const CARBON_SOURCE_INFO = {
  name: 'Multi-source Carbon & Biomass Estimation',
  methods: [
    'SLU SAR regression (VH backscatter)',
    'Skogsstyrelsen kNN volume conversion',
    'Canopy height allometric model',
  ],
  carbonStandard: 'IPCC Tier 1 (default factors) + Swedish species calibration',
  pricingSource: 'EU Emissions Trading System (EU ETS)',
  timberPricing: 'Skogsindustrierna / Biometria average roundwood prices',
  updateFrequency: 'Biomass: per new SAR/kNN update; Prices: quarterly',
  references: [
    'IPCC 2006 Guidelines Vol. 4 Ch. 4 (Forest Land)',
    'SLU Riksskogstaxeringen — biomass functions',
    'Skogsstyrelsen Skogliga grunddata (kNN)',
    'EU ETS — European Energy Exchange (EEX)',
  ],
};

// ─── Species Parameters (SLU research) ───

export const SPECIES_PARAMS: Record<string, SpeciesBiomassParams> = {
  gran: {
    species: 'Gran (Norway spruce)',
    woodDensity: 0.40,
    bef: 1.3,
    rootShootRatio: 0.24,
    carbonFraction: 0.51,
  },
  tall: {
    species: 'Tall (Scots pine)',
    woodDensity: 0.42,
    bef: 1.3,
    rootShootRatio: 0.32,
    carbonFraction: 0.51,
  },
  bjork: {
    species: 'Bjork (Birch)',
    woodDensity: 0.51,
    bef: 1.4,
    rootShootRatio: 0.26,
    carbonFraction: 0.48,
  },
  ek: {
    species: 'Ek (Oak)',
    woodDensity: 0.56,
    bef: 1.35,
    rootShootRatio: 0.20,
    carbonFraction: 0.47,
  },
  bok: {
    species: 'Bok (Beech)',
    woodDensity: 0.56,
    bef: 1.35,
    rootShootRatio: 0.22,
    carbonFraction: 0.47,
  },
};

// ─── Constants ───

const DEFAULT_SPECIES = 'gran';
const EU_ETS_PRICE_EUR = 70;              // EUR/tonne CO2
const EUR_TO_SEK = 11.5;                  // approximate exchange rate

const TIMBER_PRICES_SEK: Record<string, number> = {
  gran: 650,   // SEK/m3 sawlog
  tall: 600,
  bjork: 400,
  ek: 800,
  bok: 500,
};

// CO2 to carbon ratio: 44/12 = 3.667
const CO2_PER_CARBON = 3.667;

// ─── Cache ───

let cachedTimeSeries: { parcelId: string; data: CarbonTimeSeries; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// ─── Internal Estimation Methods ───

function getSpecies(key?: string): SpeciesBiomassParams {
  if (key && SPECIES_PARAMS[key]) return SPECIES_PARAMS[key];
  return SPECIES_PARAMS[DEFAULT_SPECIES];
}

/**
 * Method 1: SLU SAR VH regression
 * AGB (t/ha) = exp(a + b * backscatterVH)
 * Calibrated for Swedish boreal forests
 */
function estimateFromSAR(backscatterVH: number): number {
  const a = 7.42;
  const b = 0.138;
  const agb = Math.exp(a + b * backscatterVH);
  // Clamp to physically realistic range
  return Math.max(10, Math.min(500, agb));
}

/**
 * Method 2: Skogsstyrelsen kNN volume conversion
 * AGB = volume (m3/ha) * wood density (t/m3) * BEF
 */
function estimateFromVolume(volumeM3PerHa: number, sp: SpeciesBiomassParams): number {
  const agb = volumeM3PerHa * sp.woodDensity * sp.bef;
  return Math.max(0, agb);
}

/**
 * Method 3: Canopy height allometric model
 * AGB = 0.5 * height^2.1
 * Generalized tropical/temperate allometry adapted for Nordic conditions
 */
function estimateFromCanopyHeight(heightM: number): number {
  if (heightM <= 0) return 0;
  const agb = 0.5 * Math.pow(heightM, 2.1);
  return Math.max(0, Math.min(600, agb));
}

/**
 * Ensemble: average all available method estimates, weighted by reliability.
 */
function ensembleEstimate(
  estimates: { value: number; weight: number; method: string }[],
): { agb: number; confidence: number; method: string; sources: string[] } {
  if (estimates.length === 0) {
    return { agb: 0, confidence: 0, method: 'none', sources: [] };
  }

  if (estimates.length === 1) {
    return {
      agb: estimates[0].value,
      confidence: 0.55,
      method: estimates[0].method,
      sources: [estimates[0].method],
    };
  }

  const totalWeight = estimates.reduce((sum, e) => sum + e.weight, 0);
  const weightedAgb = estimates.reduce((sum, e) => sum + e.value * e.weight, 0) / totalWeight;

  // Confidence increases with more methods and agreement between them
  const values = estimates.map(e => e.value);
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const cv = mean > 0
    ? Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length) / mean
    : 1;

  // Lower CV = higher agreement = higher confidence
  const agreementBonus = Math.max(0, 1 - cv);
  const methodBonus = Math.min(0.15, (estimates.length - 1) * 0.075);
  const confidence = Math.min(0.95, 0.5 + agreementBonus * 0.3 + methodBonus);

  return {
    agb: weightedAgb,
    confidence: Math.round(confidence * 100) / 100,
    method: `Ensemble (${estimates.length} methods)`,
    sources: estimates.map(e => e.method),
  };
}

// ─── Demo Data ───

/**
 * Generate a 5-year monthly carbon time series for a realistic
 * 35 ha spruce-dominant stand in Smaland.
 */
function generateDemoCarbonTimeSeries(): CarbonTimeSeries {
  const months: MonthlyCarbon[] = [];
  const now = new Date();

  // Start 5 years back
  const startDate = new Date(now.getFullYear() - 5, now.getMonth(), 1);

  // Base carbon stock: ~75 tonnes C/ha for mature spruce
  let carbonStock = 72.5;

  // Annual sequestration ~5 tonnes CO2e/ha/year = ~1.36 tonnes C/ha/year
  // = ~0.113 tonnes C/ha/month average, with seasonal variation
  const baseMonthlyGrowth = 0.113;

  for (let i = 0; i < 60; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const month = date.getMonth();

    // Seasonal growth pattern: peak June-August, dormant Nov-Feb
    let seasonalFactor = 0.3; // winter baseline
    if (month >= 4 && month <= 9) {
      // Growing season
      seasonalFactor = 1.0 + 0.6 * Math.sin(((month - 4) / 5) * Math.PI);
    } else if (month === 3 || month === 10) {
      seasonalFactor = 0.6; // shoulder months
    }

    // Add mild random variation
    const noise = (Math.random() - 0.5) * 0.03;
    const monthlyGrowth = baseMonthlyGrowth * seasonalFactor + noise;

    // Simulate a minor thinning event in year 3 (month 30-31)
    let adjustment = 0;
    if (i === 30) {
      adjustment = -3.5; // thinning removes some biomass
    }

    carbonStock += monthlyGrowth + adjustment;

    months.push({
      date: date.toISOString().slice(0, 7), // YYYY-MM
      carbonStock: Math.round(carbonStock * 100) / 100,
      netChange: Math.round((monthlyGrowth + adjustment) * 1000) / 1000,
      growthRate: Math.round(monthlyGrowth * 1000) / 1000,
    });
  }

  // Calculate annual sequestration from last 12 months
  const last12 = months.slice(-12);
  const annualChangeC = last12.reduce((sum, m) => sum + m.netChange, 0);
  const annualSequestration = Math.round(annualChangeC * CO2_PER_CARBON * 100) / 100;

  // Determine trend from last 12 months
  const firstHalf = last12.slice(0, 6).reduce((s, m) => s + m.netChange, 0);
  const secondHalf = last12.slice(6).reduce((s, m) => s + m.netChange, 0);
  let trend: CarbonTimeSeries['trend'] = 'accumulating';
  if (secondHalf < -0.1) {
    trend = 'declining';
  } else if (Math.abs(secondHalf - firstHalf) < 0.05) {
    trend = 'stable';
  }

  // Projected asset value for 35 ha stand
  const latestCarbon = months[months.length - 1].carbonStock;
  const projectedValue = valuateForestAsset(
    latestCarbon,
    180,  // m3/ha
    35,   // ha
    { gran: 0.70, tall: 0.20, bjork: 0.10 },
  );

  return {
    period: `${months[0].date} to ${months[months.length - 1].date}`,
    estimates: months,
    annualSequestration,
    trend,
    projectedValue,
  };
}

// ─── Public API ───

/**
 * Multi-method ensemble biomass estimation.
 * Combines SAR backscatter, kNN volume, and canopy height when available.
 */
export function estimateBiomass(params: BiomassInput): BiomassEstimate {
  const sp = getSpecies(params.species);
  const methods: { value: number; weight: number; method: string }[] = [];

  // Method 1: SAR backscatter
  if (params.backscatterVH !== undefined) {
    methods.push({
      value: estimateFromSAR(params.backscatterVH),
      weight: 0.35,
      method: 'SLU SAR VH regression',
    });
  }

  // Method 2: kNN volume
  if (params.volumeM3PerHa !== undefined && params.volumeM3PerHa > 0) {
    methods.push({
      value: estimateFromVolume(params.volumeM3PerHa, sp),
      weight: 0.45,
      method: 'Skogsstyrelsen kNN volume conversion',
    });
  }

  // Method 3: Canopy height
  if (params.canopyHeightM !== undefined && params.canopyHeightM > 0) {
    methods.push({
      value: estimateFromCanopyHeight(params.canopyHeightM),
      weight: 0.20,
      method: 'Canopy height allometric model',
    });
  }

  // Fallback: use demo-typical values for a Smaland spruce stand
  if (methods.length === 0) {
    methods.push({
      value: 150,
      weight: 1.0,
      method: 'Default estimate (Smaland spruce reference)',
    });
  }

  const { agb, confidence, method, sources } = ensembleEstimate(methods);

  const aboveGroundBiomass = Math.round(agb * 10) / 10;
  const belowGroundBiomass = Math.round(agb * sp.rootShootRatio * 10) / 10;
  const totalBiomass = Math.round((aboveGroundBiomass + belowGroundBiomass) * 10) / 10;
  const carbonStock = Math.round(totalBiomass * sp.carbonFraction * 10) / 10;
  const co2Equivalent = Math.round(carbonStock * CO2_PER_CARBON * 10) / 10;

  return {
    aboveGroundBiomass,
    belowGroundBiomass,
    totalBiomass,
    carbonStock,
    co2Equivalent,
    confidence,
    method,
    sources,
  };
}

/**
 * Convert a known biomass value to carbon stock and CO2 equivalent.
 */
export function calculateCarbonStock(
  biomassTPha: number,
  species?: string,
): { carbonStock: number; co2Equivalent: number; carbonFraction: number } {
  const sp = getSpecies(species);
  const carbonStock = Math.round(biomassTPha * sp.carbonFraction * 100) / 100;
  const co2Equivalent = Math.round(carbonStock * CO2_PER_CARBON * 100) / 100;

  return {
    carbonStock,
    co2Equivalent,
    carbonFraction: sp.carbonFraction,
  };
}

/**
 * Get a 5-year monthly carbon time series for a parcel.
 * Returns demo data for a 35 ha spruce stand in Smaland.
 */
export async function getCarbonTimeSeries(
  parcelId: string,
): Promise<CarbonTimeSeries> {
  // Return cached if fresh
  if (
    cachedTimeSeries &&
    cachedTimeSeries.parcelId === parcelId &&
    Date.now() - cachedTimeSeries.fetchedAt < CACHE_TTL
  ) {
    return cachedTimeSeries.data;
  }

  // Simulate network delay
  await new Promise(r => setTimeout(r, 250));

  const data = generateDemoCarbonTimeSeries();
  cachedTimeSeries = { parcelId, data, fetchedAt: Date.now() };
  return data;
}

/**
 * Economic valuation of a forest parcel combining timber and carbon value.
 *
 * @param carbonStockPerHa - tonnes C/ha
 * @param volumeM3PerHa    - stem volume m3/ha
 * @param areaHa           - parcel area in hectares
 * @param speciesMix       - e.g. { gran: 0.7, tall: 0.2, bjork: 0.1 }
 */
export function valuateForestAsset(
  carbonStockPerHa: number,
  volumeM3PerHa: number,
  areaHa: number,
  speciesMix: Record<string, number>,
): ForestValuation {
  // Carbon value: stock * CO2 conversion * ETS price
  const co2Total = carbonStockPerHa * CO2_PER_CARBON * areaHa;
  const carbonValueEUR = Math.round(co2Total * EU_ETS_PRICE_EUR);

  // Timber value: weighted by species mix
  const entries = Object.entries(speciesMix);
  let weightedTimberPrice = 0;
  for (const [sp, fraction] of entries) {
    const price = TIMBER_PRICES_SEK[sp] ?? 500;
    weightedTimberPrice += price * fraction;
  }
  const timberPriceSEK = Math.round(weightedTimberPrice);
  const timberValueSEK = Math.round(volumeM3PerHa * areaHa * weightedTimberPrice);

  // Total asset value in SEK
  const carbonValueSEK = Math.round(carbonValueEUR * EUR_TO_SEK);
  const totalAssetValueSEK = timberValueSEK + carbonValueSEK;

  return {
    carbonValueEUR,
    timberValueSEK,
    totalAssetValueSEK,
    euEtsPrice: EU_ETS_PRICE_EUR,
    timberPriceSEK,
  };
}

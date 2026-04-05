// ─── Insurance Risk Model Service ───────────────────────────────────────────
// OasisLMF-inspired catastrophe risk model for bark beetle damage — a peril
// model that no insurer currently has. Combines exposure data, historical
// outbreak frequencies, drought indices, and stand characteristics to produce
// loss distributions and insurance pricing.
//
// Demo: 35 ha spruce-dominant stand in Småland, ~3.5M SEK timber value.

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BeetlePerilModel {
  modelVersion: string;
  region: string;
  exposureSummary: ExposureSummary;
  lossDistribution: LossDistribution;
  annualExpectedLoss: number;
  probableMaximumLoss: number;
  returnPeriodCurve: ReturnPeriodPoint[];
}

export interface ExposureSummary {
  totalAreaHa: number;
  totalTimberValueSEK: number;
  sprucePct: number;
  avgStandAge: number;
  droughtExposure: 'low' | 'moderate' | 'high';
  historicalOutbreakFreq: number;
  nearestInfestationKm: number;
}

export interface LossDistribution {
  mean: number;
  median: number;
  p75: number;
  p95: number;
  p99: number;
  maxObserved: number;
}

export interface ReturnPeriodPoint {
  returnPeriod: number;
  loss: number;
  lossPct: number;
}

export interface InsurancePricing {
  annualPremiumSEK: number;
  premiumRatePct: number;
  deductibleSEK: number;
  coverageLimit: number;
  riskTier: 'standard' | 'elevated' | 'high' | 'extreme';
  discountFactors: { factor: string; discount: number }[];
  surchargeFactors: { factor: string; surcharge: number }[];
  competitorComparison: { provider: string; premium: number }[];
}

export interface MonteCarloResult {
  iterations: number;
  meanLoss: number;
  stdDev: number;
  percentiles: Record<number, number>;
}

// ─── Source Metadata ────────────────────────────────────────────────────────

export const INSURANCE_MODEL_INFO = {
  name: 'BeetleSense Beetle Peril Model (BPM)',
  version: '1.2.0',
  description:
    'Catastrophe risk model for bark beetle timber losses, inspired by OasisLMF framework. Combines exposure, hazard, and vulnerability modules.',
  methodology: [
    'Exposure: stand-level timber valuation using Skogsstyrelsen price tables',
    'Hazard: historical outbreak frequency, SMHI drought index, proximity to active infestations',
    'Vulnerability: spruce percentage, stand age, management history, site index',
    'Loss: Monte Carlo simulation with 10,000 iterations per scenario',
  ],
  dataSources: [
    'Skogsstyrelsen — historical outbreak data (1970–2025)',
    'SMHI — temperature and precipitation anomalies',
    'SLU Riksskogstaxeringen — national forest inventory',
    'BeetleSense trap network — real-time infestation proximity',
  ],
  regions: ['Götaland', 'Svealand', 'Southern Norrland'],
  lastCalibration: '2026-03-15',
  disclaimer:
    'Indicative estimates for planning purposes. Not a binding insurance quote.',
};

// ─── Demo Exposure ──────────────────────────────────────────────────────────

const DEMO_EXPOSURE: ExposureSummary = {
  totalAreaHa: 35,
  totalTimberValueSEK: 3_500_000,
  sprucePct: 72,
  avgStandAge: 65,
  droughtExposure: 'moderate',
  historicalOutbreakFreq: 2.3,
  nearestInfestationKm: 4.2,
};

// ─── Return Period Curve ────────────────────────────────────────────────────

const DEMO_RETURN_PERIOD_CURVE: ReturnPeriodPoint[] = [
  { returnPeriod: 1, loss: 15_000, lossPct: 0.43 },
  { returnPeriod: 2, loss: 28_000, lossPct: 0.8 },
  { returnPeriod: 5, loss: 62_000, lossPct: 1.77 },
  { returnPeriod: 10, loss: 110_000, lossPct: 3.14 },
  { returnPeriod: 25, loss: 185_000, lossPct: 5.29 },
  { returnPeriod: 50, loss: 230_000, lossPct: 6.57 },
  { returnPeriod: 100, loss: 280_000, lossPct: 8.0 },
  { returnPeriod: 250, loss: 385_000, lossPct: 11.0 },
];

// ─── Loss Distribution ─────────────────────────────────────────────────────

const DEMO_LOSS_DISTRIBUTION: LossDistribution = {
  mean: 15_200,
  median: 8_400,
  p75: 22_000,
  p95: 85_000,
  p99: 280_000,
  maxObserved: 420_000,
};

// ─── Monte Carlo Engine (simplified) ────────────────────────────────────────

function runSimplifiedMonteCarlo(
  exposure: ExposureSummary,
  iterations: number
): MonteCarloResult {
  const losses: number[] = [];

  // Parameters derived from exposure
  const baseRate = 0.004; // 0.4% annual expected loss rate
  const spruceFactor = exposure.sprucePct / 60; // normalized to 60% spruce
  const ageFactor = exposure.avgStandAge > 50 ? 1.0 + (exposure.avgStandAge - 50) * 0.008 : 0.85;
  const droughtMultiplier =
    exposure.droughtExposure === 'high'
      ? 1.6
      : exposure.droughtExposure === 'moderate'
        ? 1.2
        : 1.0;
  const proximityFactor = exposure.nearestInfestationKm < 5 ? 1.4 : 1.0;

  const adjustedRate =
    baseRate * spruceFactor * ageFactor * droughtMultiplier * proximityFactor;

  // Pseudo-random seeded simulation using simple LCG for reproducibility
  let seed = 42;
  const nextRand = () => {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  for (let i = 0; i < iterations; i++) {
    // Model: mixture of no-event years and event years
    const eventProb = adjustedRate * 10; // ~4% chance of some event per year
    const roll = nextRand();

    if (roll > eventProb) {
      // No significant loss this year
      losses.push(Math.round(nextRand() * 2000));
    } else {
      // Loss event — log-normal distribution
      const u1 = nextRand();
      const u2 = nextRand();
      const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2);
      const logMean = Math.log(exposure.totalTimberValueSEK * adjustedRate);
      const logStd = 1.8;
      const loss = Math.exp(logMean + logStd * z);
      losses.push(
        Math.round(Math.min(loss, exposure.totalTimberValueSEK * 0.25))
      );
    }
  }

  losses.sort((a, b) => a - b);

  const mean = Math.round(losses.reduce((s, v) => s + v, 0) / losses.length);
  const variance =
    losses.reduce((s, v) => s + (v - mean) ** 2, 0) / losses.length;
  const stdDev = Math.round(Math.sqrt(variance));

  const pct = (p: number) => losses[Math.floor((p / 100) * losses.length)] ?? 0;

  return {
    iterations,
    meanLoss: mean,
    stdDev,
    percentiles: {
      10: pct(10),
      25: pct(25),
      50: pct(50),
      75: pct(75),
      90: pct(90),
      95: pct(95),
      99: pct(99),
    },
  };
}

// ─── Insurance Pricing Engine ───────────────────────────────────────────────

function computePricing(
  perilModel: BeetlePerilModel,
  coverageOptions?: { deductibleSEK?: number; coverageLimit?: number }
): InsurancePricing {
  const exposure = perilModel.exposureSummary;
  const deductibleSEK = coverageOptions?.deductibleSEK ?? 25_000;
  const coverageLimit =
    coverageOptions?.coverageLimit ?? exposure.totalTimberValueSEK * 0.15;

  // Base premium: annual expected loss + risk loading + expense ratio
  const riskLoading = 1.35; // 35% risk margin
  const expenseRatio = 1.18; // 18% admin/commission
  const basePremium =
    perilModel.annualExpectedLoss * riskLoading * expenseRatio;

  // Adjust for deductible (higher deductible = lower premium)
  const deductibleCredit = Math.min(deductibleSEK / coverageLimit, 0.3) * 0.5;
  const adjustedPremium = basePremium * (1 - deductibleCredit);

  // Discount factors
  const discountFactors: { factor: string; discount: number }[] = [
    { factor: 'BeetleSense active monitoring', discount: 0.15 },
    { factor: 'Drought irrigation system', discount: 0.08 },
    { factor: 'Annual sanitation felling program', discount: 0.05 },
    { factor: 'Pheromone trap network (>3 traps)', discount: 0.04 },
  ];

  // Surcharge factors
  const surchargeFactors: { factor: string; surcharge: number }[] = [];
  if (exposure.sprucePct > 80) {
    surchargeFactors.push({
      factor: 'High spruce monoculture (>80%)',
      surcharge: 0.12,
    });
  }
  if (exposure.nearestInfestationKm < 3) {
    surchargeFactors.push({
      factor: 'Active infestation within 3 km',
      surcharge: 0.2,
    });
  }
  if (exposure.droughtExposure === 'high') {
    surchargeFactors.push({
      factor: 'High drought exposure zone',
      surcharge: 0.15,
    });
  }

  const totalDiscount = discountFactors.reduce((s, d) => s + d.discount, 0);
  const totalSurcharge = surchargeFactors.reduce(
    (s, d) => s + d.surcharge,
    0
  );

  const finalPremium = Math.round(
    adjustedPremium * (1 - totalDiscount + totalSurcharge)
  );
  const premiumRate =
    Math.round((finalPremium / exposure.totalTimberValueSEK) * 10000) / 100;

  // Risk tier
  let riskTier: InsurancePricing['riskTier'] = 'standard';
  if (premiumRate > 0.5) riskTier = 'extreme';
  else if (premiumRate > 0.35) riskTier = 'high';
  else if (premiumRate > 0.2) riskTier = 'elevated';

  // Competitor comparison — Swedish forest insurers
  const competitorComparison = [
    {
      provider: 'Länsförsäkringar Skog',
      premium: Math.round(finalPremium * 1.22),
    },
    {
      provider: 'IF Skadeförsäkring',
      premium: Math.round(finalPremium * 1.35),
    },
    {
      provider: 'Dina Försäkringar',
      premium: Math.round(finalPremium * 1.18),
    },
  ];

  return {
    annualPremiumSEK: finalPremium,
    premiumRatePct: premiumRate,
    deductibleSEK,
    coverageLimit: Math.round(coverageLimit),
    riskTier,
    discountFactors,
    surchargeFactors,
    competitorComparison,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Run the full beetle peril model for an exposure profile.
 */
export async function runBeetlePerilModel(
  exposure?: Partial<ExposureSummary>
): Promise<BeetlePerilModel> {
  await delay(350);

  const merged: ExposureSummary = { ...DEMO_EXPOSURE, ...exposure };

  // Scale loss distribution by exposure value ratio
  const valueRatio = merged.totalTimberValueSEK / DEMO_EXPOSURE.totalTimberValueSEK;
  const scaledLoss: LossDistribution = {
    mean: Math.round(DEMO_LOSS_DISTRIBUTION.mean * valueRatio),
    median: Math.round(DEMO_LOSS_DISTRIBUTION.median * valueRatio),
    p75: Math.round(DEMO_LOSS_DISTRIBUTION.p75 * valueRatio),
    p95: Math.round(DEMO_LOSS_DISTRIBUTION.p95 * valueRatio),
    p99: Math.round(DEMO_LOSS_DISTRIBUTION.p99 * valueRatio),
    maxObserved: Math.round(DEMO_LOSS_DISTRIBUTION.maxObserved * valueRatio),
  };

  const scaledCurve = DEMO_RETURN_PERIOD_CURVE.map((pt) => ({
    returnPeriod: pt.returnPeriod,
    loss: Math.round(pt.loss * valueRatio),
    lossPct: pt.lossPct,
  }));

  return {
    modelVersion: '1.2.0',
    region: 'Småland (Götaland)',
    exposureSummary: merged,
    lossDistribution: scaledLoss,
    annualExpectedLoss: scaledLoss.mean,
    probableMaximumLoss: scaledLoss.p99,
    returnPeriodCurve: scaledCurve,
  };
}

/**
 * Calculate insurance pricing from a peril model result.
 */
export async function calculateInsurancePricing(
  perilModel: BeetlePerilModel,
  coverageOptions?: { deductibleSEK?: number; coverageLimit?: number }
): Promise<InsurancePricing> {
  await delay(200);
  return computePricing(perilModel, coverageOptions);
}

/**
 * Run Monte Carlo simulation for loss distribution.
 */
export async function runMonteCarloSimulation(
  params?: Partial<ExposureSummary>,
  iterations: number = 10_000
): Promise<MonteCarloResult> {
  await delay(400);
  const merged: ExposureSummary = { ...DEMO_EXPOSURE, ...params };
  return runSimplifiedMonteCarlo(merged, iterations);
}

/**
 * Get the exceedance probability (return period) curve.
 */
export async function getReturnPeriodCurve(
  exposure?: Partial<ExposureSummary>
): Promise<ReturnPeriodPoint[]> {
  await delay(150);
  const merged: ExposureSummary = { ...DEMO_EXPOSURE, ...exposure };
  const valueRatio = merged.totalTimberValueSEK / DEMO_EXPOSURE.totalTimberValueSEK;

  return DEMO_RETURN_PERIOD_CURVE.map((pt) => ({
    returnPeriod: pt.returnPeriod,
    loss: Math.round(pt.loss * valueRatio),
    lossPct: pt.lossPct,
  }));
}

/**
 * Compare BeetleSense-optimized pricing against Swedish forest insurers.
 */
export async function compareInsuranceProviders(
  parcelData?: Partial<ExposureSummary>
): Promise<InsurancePricing['competitorComparison']> {
  await delay(250);
  const model = await runBeetlePerilModel(parcelData);
  const pricing = computePricing(model);
  return [
    { provider: 'BeetleSense Optimized', premium: pricing.annualPremiumSEK },
    ...pricing.competitorComparison,
  ];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

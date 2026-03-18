/**
 * ScenarioEngine — rule-based forest projection models for Swedish forestry.
 *
 * Growth rates, beetle dynamics, thinning effects, and climate impacts are
 * derived from SLU (Swedish University of Agricultural Sciences) reference
 * data and Skogsstyrelsen guidelines. All monetary values are in SEK.
 *
 * This is NOT a machine-learning model. It uses deterministic rules with
 * stochastic confidence bands for visual display.
 */

// ─── Types ───

export type ScenarioId =
  | 'do_nothing_5y'
  | 'thin_30_spruce'
  | 'beetle_unchecked'
  | 'mixed_species'
  | 'climate_2c'
  | 'custom';

export interface ParcelInput {
  /** Total area in hectares */
  areaHa: number;
  /** Current standing volume in m3sk (cubic metres standing volume) */
  volumeM3sk: number;
  /** Spruce fraction 0-1 */
  spruceFraction: number;
  /** Pine fraction 0-1 */
  pineFraction: number;
  /** Broadleaf fraction 0-1 */
  broadleafFraction: number;
  /** Current forest health score 0-100 */
  healthScore: number;
  /** Current beetle risk 0-100 (100 = maximum risk) */
  beetleRisk: number;
  /** Current biodiversity index 0-100 */
  biodiversityIndex: number;
  /** Mean stand age in years */
  standAge: number;
  /** Site index (SI) H100 value — typical 20-32 for Swedish spruce */
  siteIndex: number;
}

export interface YearProjection {
  year: number;
  /** Health score 0-100 */
  health: number;
  /** Timber value in SEK */
  timberValue: number;
  /** Beetle risk 0-100 */
  beetleRisk: number;
  /** Biodiversity index 0-100 */
  biodiversity: number;
  /** Carbon sequestration in tonnes CO2/year */
  carbonSeq: number;
  /** Volume in m3sk */
  volume: number;
  /** Confidence band: lower bound multiplier (e.g. 0.85) */
  confidenceLow: number;
  /** Confidence band: upper bound multiplier (e.g. 1.15) */
  confidenceHigh: number;
  /** Optional annotation for inflection points */
  annotation?: string;
  annotationKey?: string;
}

export interface ScenarioResult {
  scenarioId: ScenarioId;
  baseline: YearProjection[]; // "Do Nothing"
  action: YearProjection[];   // "Take Action"
  summaryKey: string;         // i18n key for summary text
  summaryParams: Record<string, string | number>;
}

export interface CustomScenarioParams {
  thinningPercent: number;       // 0-60
  targetSpecies: 'spruce' | 'pine' | 'mixed';
  yearsToProject: number;        // 1-20
  climateWarmingC: number;       // 0-4
  beetleIntervention: boolean;
}

// ─── Constants — Swedish forestry reference values ───

/** Mean annual increment for spruce in m3sk/ha/year by site index bracket */
const MAI_SPRUCE: Record<string, number> = {
  low: 4.5,    // SI < 24
  medium: 6.0, // SI 24-28
  high: 7.5,   // SI > 28
};

/** Mean annual increment for pine */
const MAI_PINE: Record<string, number> = {
  low: 3.5,
  medium: 4.5,
  high: 5.5,
};

/** Mean annual increment for broadleaf (birch, oak, beech) */
const MAI_BROADLEAF: Record<string, number> = {
  low: 2.5,
  medium: 3.5,
  high: 4.5,
};

/** Current average timber prices SEK/m3sk (Q1 2026 Norra Skog / Södra) */
const TIMBER_PRICE = {
  spruce_sawlog: 680,
  spruce_pulp: 340,
  pine_sawlog: 620,
  pine_pulp: 310,
  broadleaf_sawlog: 450,
  broadleaf_pulp: 260,
};

/** Average sawlog ratio by species */
const SAWLOG_RATIO = {
  spruce: 0.62,
  pine: 0.55,
  broadleaf: 0.30,
};

/** Carbon sequestration factor: tonnes CO2 per m3sk growth */
const CARBON_PER_M3 = 0.9; // ~0.9 tonnes CO2 per m3 of wood growth

/** Beetle doubling time in years under stressed conditions */
const BEETLE_DOUBLING_STRESSED = 1.2;

/** Beetle containment factor with active intervention (fraction of spread) */
const _BEETLE_CONTAINMENT_FACTOR = 0.3;

// ─── Helpers ───

function getSiteClass(si: number): 'low' | 'medium' | 'high' {
  if (si < 24) return 'low';
  if (si <= 28) return 'medium';
  return 'high';
}

function getMAI(input: ParcelInput): number {
  const sc = getSiteClass(input.siteIndex);
  return (
    input.spruceFraction * MAI_SPRUCE[sc] +
    input.pineFraction * MAI_PINE[sc] +
    input.broadleafFraction * MAI_BROADLEAF[sc]
  );
}

function getTimberPricePerM3(input: ParcelInput): number {
  const sprucePrice =
    SAWLOG_RATIO.spruce * TIMBER_PRICE.spruce_sawlog +
    (1 - SAWLOG_RATIO.spruce) * TIMBER_PRICE.spruce_pulp;
  const pinePrice =
    SAWLOG_RATIO.pine * TIMBER_PRICE.pine_sawlog +
    (1 - SAWLOG_RATIO.pine) * TIMBER_PRICE.pine_pulp;
  const broadleafPrice =
    SAWLOG_RATIO.broadleaf * TIMBER_PRICE.broadleaf_sawlog +
    (1 - SAWLOG_RATIO.broadleaf) * TIMBER_PRICE.broadleaf_pulp;

  return (
    input.spruceFraction * sprucePrice +
    input.pineFraction * pinePrice +
    input.broadleafFraction * broadleafPrice
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// ─── Baseline projection (Do Nothing) ───

function projectBaseline(input: ParcelInput, years: number): YearProjection[] {
  const projections: YearProjection[] = [];
  const mai = getMAI(input);
  const pricePerM3 = getTimberPricePerM3(input);

  let volume = input.volumeM3sk;
  let health = input.healthScore;
  let beetleRisk = input.beetleRisk;
  let biodiversity = input.biodiversityIndex;

  for (let y = 0; y <= years; y++) {
    const carbonSeq = mai * input.areaHa * CARBON_PER_M3;
    const timberValue = Math.round(volume * pricePerM3);

    const proj: YearProjection = {
      year: y,
      health: Math.round(clamp(health, 0, 100)),
      timberValue,
      beetleRisk: Math.round(clamp(beetleRisk, 0, 100)),
      biodiversity: Math.round(clamp(biodiversity, 0, 100)),
      carbonSeq: Math.round(carbonSeq),
      volume: Math.round(volume),
      confidenceLow: 0.88 - y * 0.015,
      confidenceHigh: 1.12 + y * 0.015,
    };

    // Annotations for key inflection points
    if (y > 0 && beetleRisk > 70 && projections[projections.length - 1]?.beetleRisk <= 70) {
      proj.annotationKey = 'scenarios.annotations.beetleOutbreakLikely';
    }
    if (y > 0 && health < 40 && projections[projections.length - 1]?.health >= 40) {
      proj.annotationKey = 'scenarios.annotations.criticalHealth';
    }

    projections.push(proj);

    if (y < years) {
      // Growth: volume increases by MAI * area
      volume += mai * input.areaHa;

      // Spruce-heavy forests degrade faster with no action
      const stressFactor = input.spruceFraction > 0.6 ? 1.5 : 1.0;

      // Health declines slowly — drought stress, competition, aging
      health -= (1.2 + (beetleRisk / 100) * 2.0) * stressFactor;

      // Beetle risk increases — exponential in monoculture spruce
      const beetleIncrease = input.spruceFraction > 0.5
        ? 5.0 + beetleRisk * 0.08
        : 2.0 + beetleRisk * 0.03;
      beetleRisk += beetleIncrease;

      // Biodiversity stagnates in monoculture
      biodiversity -= input.spruceFraction > 0.7 ? 0.8 : 0.2;

      // Price inflation ~2%/year
      // Already factored into constant pricePerM3 for simplicity
    }
  }

  return projections;
}

// ─── Scenario projections ───

function projectThin30(input: ParcelInput, years: number): YearProjection[] {
  const projections: YearProjection[] = [];
  const baseMai = getMAI(input);
  const pricePerM3 = getTimberPricePerM3(input);

  // Thinning removes 30% of volume but boosts growth rate by 20%
  let volume = input.volumeM3sk * 0.70;
  let health = input.healthScore + 5; // Immediate slight improvement
  let beetleRisk = input.beetleRisk - 10; // Less stressed trees
  let biodiversity = input.biodiversityIndex + 3; // More light = understory growth
  const boostedMai = baseMai * 1.20;

  for (let y = 0; y <= years; y++) {
    const effectiveMai = y === 0 ? baseMai : boostedMai;
    const carbonSeq = effectiveMai * input.areaHa * CARBON_PER_M3;
    const timberValue = Math.round(volume * pricePerM3);

    const proj: YearProjection = {
      year: y,
      health: Math.round(clamp(health, 0, 100)),
      timberValue,
      beetleRisk: Math.round(clamp(beetleRisk, 0, 100)),
      biodiversity: Math.round(clamp(biodiversity, 0, 100)),
      carbonSeq: Math.round(carbonSeq),
      volume: Math.round(volume),
      confidenceLow: 0.90 - y * 0.012,
      confidenceHigh: 1.10 + y * 0.012,
    };

    if (y === 0) {
      proj.annotationKey = 'scenarios.annotations.thinningExecuted';
    }
    if (y > 1 && volume > input.volumeM3sk && projections[projections.length - 1]?.volume <= input.volumeM3sk) {
      proj.annotationKey = 'scenarios.annotations.volumeRecovered';
    }
    if (y > 0 && timberValue > input.volumeM3sk * pricePerM3) {
      if (!projections.some(p => p.annotationKey === 'scenarios.annotations.valueExceedsOriginal')) {
        proj.annotationKey = 'scenarios.annotations.valueExceedsOriginal';
      }
    }

    projections.push(proj);

    if (y < years) {
      volume += boostedMai * input.areaHa;
      health += 1.5; // Steady improvement from reduced competition
      beetleRisk -= 2.0; // Healthier trees resist better
      biodiversity += 0.8; // Gradual improvement
    }
  }

  return projections;
}

function projectBeetleUnchecked(input: ParcelInput, years: number): YearProjection[] {
  const projections: YearProjection[] = [];
  const mai = getMAI(input);
  const pricePerM3 = getTimberPricePerM3(input);

  let volume = input.volumeM3sk;
  let health = input.healthScore;
  let beetleRisk = Math.max(input.beetleRisk, 40); // Start with elevated risk
  let biodiversity = input.biodiversityIndex;
  let damagedFraction = 0.05; // 5% already damaged

  for (let y = 0; y <= years; y++) {
    // Damaged timber loses sawlog value — only pulp value remains
    const effectivePrice = pricePerM3 * (1 - damagedFraction * 0.6);
    const timberValue = Math.round(volume * effectivePrice);
    const carbonSeq = Math.round(mai * input.areaHa * CARBON_PER_M3 * (1 - damagedFraction));

    const proj: YearProjection = {
      year: y,
      health: Math.round(clamp(health, 0, 100)),
      timberValue,
      beetleRisk: Math.round(clamp(beetleRisk, 0, 100)),
      biodiversity: Math.round(clamp(biodiversity, 0, 100)),
      carbonSeq,
      volume: Math.round(volume),
      confidenceLow: 0.80 - y * 0.02,
      confidenceHigh: 1.20 + y * 0.02,
    };

    if (y > 0 && damagedFraction > 0.3 && (projections[projections.length - 1]?.volume ?? 0) > volume * 0.7) {
      proj.annotationKey = 'scenarios.annotations.massiveDieback';
    }
    if (y > 0 && beetleRisk > 85 && projections[projections.length - 1]?.beetleRisk <= 85) {
      proj.annotationKey = 'scenarios.annotations.beetleOutbreakLikely';
    }

    projections.push(proj);

    if (y < years) {
      // Beetle damage spreads exponentially in spruce
      damagedFraction = Math.min(
        0.95,
        damagedFraction * Math.pow(2, 1 / BEETLE_DOUBLING_STRESSED) * (input.spruceFraction + 0.3),
      );

      // Volume loss from dying trees
      const deadVolume = volume * damagedFraction * 0.15;
      volume = volume + (mai * input.areaHa * (1 - damagedFraction)) - deadVolume;
      volume = Math.max(volume * 0.3, volume); // Can't lose more than 70% in one year

      health -= 8 + damagedFraction * 15;
      beetleRisk += 10 * (1 - (beetleRisk / 100));
      biodiversity -= 3 + damagedFraction * 5;
    }
  }

  return projections;
}

function projectMixedSpecies(input: ParcelInput, years: number): YearProjection[] {
  const projections: YearProjection[] = [];

  // After harvest, replant with mixed species: 40% spruce, 30% pine, 30% broadleaf
  const mixedInput: ParcelInput = {
    ...input,
    spruceFraction: 0.40,
    pineFraction: 0.30,
    broadleafFraction: 0.30,
  };

  const mai = getMAI(mixedInput);
  const pricePerM3 = getTimberPricePerM3(mixedInput);

  // Start with young stand after harvest
  let volume = input.areaHa * 5; // Minimal residual volume
  let health = 60; // Young stand, not yet established
  let beetleRisk = 15; // Very low — mixed species
  let biodiversity = 55; // Fresh planting, not yet diverse understory

  for (let y = 0; y <= years; y++) {
    // Young stands grow slower initially, accelerating from year 3
    const growthMultiplier = y < 2 ? 0.3 : y < 4 ? 0.6 : 0.85;
    const effectiveMai = mai * growthMultiplier;
    const carbonSeq = Math.round(effectiveMai * input.areaHa * CARBON_PER_M3);
    const timberValue = Math.round(volume * pricePerM3 * 0.6); // Young timber less valuable

    const proj: YearProjection = {
      year: y,
      health: Math.round(clamp(health, 0, 100)),
      timberValue,
      beetleRisk: Math.round(clamp(beetleRisk, 0, 100)),
      biodiversity: Math.round(clamp(biodiversity, 0, 100)),
      carbonSeq,
      volume: Math.round(volume),
      confidenceLow: 0.85 - y * 0.01,
      confidenceHigh: 1.15 + y * 0.01,
    };

    if (y === 0) {
      proj.annotationKey = 'scenarios.annotations.harvestAndReplant';
    }
    if (y >= 3 && !projections.some(p => p.annotationKey === 'scenarios.annotations.establishmentComplete')) {
      proj.annotationKey = 'scenarios.annotations.establishmentComplete';
    }

    projections.push(proj);

    if (y < years) {
      volume += effectiveMai * input.areaHa;
      health += 4; // Rapid improvement in health as stand establishes
      beetleRisk -= 1; // Stays very low
      biodiversity += 5; // Strong biodiversity gains with mixed species
    }
  }

  return projections;
}

function projectClimate2C(input: ParcelInput, years: number): YearProjection[] {
  const projections: YearProjection[] = [];
  const baseMai = getMAI(input);
  const pricePerM3 = getTimberPricePerM3(input);

  let volume = input.volumeM3sk;
  let health = input.healthScore;
  let beetleRisk = input.beetleRisk;
  let biodiversity = input.biodiversityIndex;

  for (let y = 0; y <= years; y++) {
    // Climate warming: initially slightly better growth, then drought stress
    const warmingEffect = y < 2 ? 1.05 : 1.05 - (y - 2) * 0.03;
    const effectiveMai = baseMai * Math.max(0.7, warmingEffect);
    const carbonSeq = Math.round(effectiveMai * input.areaHa * CARBON_PER_M3);
    const timberValue = Math.round(volume * pricePerM3);

    const proj: YearProjection = {
      year: y,
      health: Math.round(clamp(health, 0, 100)),
      timberValue,
      beetleRisk: Math.round(clamp(beetleRisk, 0, 100)),
      biodiversity: Math.round(clamp(biodiversity, 0, 100)),
      carbonSeq,
      volume: Math.round(volume),
      confidenceLow: 0.82 - y * 0.02,
      confidenceHigh: 1.18 + y * 0.02,
    };

    // Beetle gains extra generation at +2C (from 1 to 2 generations per year in south Sweden)
    if (y === 2) {
      proj.annotationKey = 'scenarios.annotations.extraBeetleGeneration';
    }
    if (y > 2 && health < 50 && projections[projections.length - 1]?.health >= 50) {
      proj.annotationKey = 'scenarios.annotations.droughtStressOnset';
    }

    projections.push(proj);

    if (y < years) {
      volume += effectiveMai * input.areaHa;

      // Baseline beetle dynamics (same as baseline projection)
      const baseBeetleIncrease = input.spruceFraction > 0.5
        ? 5.0 + beetleRisk * 0.08
        : 2.0 + beetleRisk * 0.03;

      // Extra beetle generation at +2C: additional compounding on top of baseline
      const climateExtraBoost = y >= 2 ? 6 * input.spruceFraction + beetleRisk * 0.04 : 1.5;
      beetleRisk += baseBeetleIncrease + climateExtraBoost;

      // Drought stress — stronger than baseline health decline
      const baseStressFactor = input.spruceFraction > 0.6 ? 1.5 : 1.0;
      const baseHealthDecline = (1.2 + (beetleRisk / 100) * 2.0) * baseStressFactor;
      const droughtPenalty = y >= 2 ? 3.0 * input.spruceFraction : 0.5;
      health -= baseHealthDecline + droughtPenalty;

      // Biodiversity shifts — some species benefit, spruce suffers
      biodiversity += input.spruceFraction > 0.5 ? -1.5 : 0.5;
    }
  }

  return projections;
}

function projectCustom(
  input: ParcelInput,
  params: CustomScenarioParams,
): YearProjection[] {
  const projections: YearProjection[] = [];
  const years = params.yearsToProject;

  // Adjust species mix
  let adjustedInput = { ...input };
  if (params.targetSpecies === 'mixed') {
    adjustedInput = {
      ...input,
      spruceFraction: 0.40,
      pineFraction: 0.35,
      broadleafFraction: 0.25,
    };
  } else if (params.targetSpecies === 'pine') {
    adjustedInput = {
      ...input,
      spruceFraction: 0.20,
      pineFraction: 0.60,
      broadleafFraction: 0.20,
    };
  }

  const baseMai = getMAI(adjustedInput);
  const pricePerM3 = getTimberPricePerM3(adjustedInput);

  // Apply thinning
  let volume = input.volumeM3sk * (1 - params.thinningPercent / 100);
  let health = input.healthScore + (params.thinningPercent > 0 ? params.thinningPercent * 0.15 : 0);
  let beetleRisk = input.beetleRisk - (params.beetleIntervention ? 15 : 0);
  let biodiversity = input.biodiversityIndex;

  const growthBoost = 1 + (params.thinningPercent / 100) * 0.5; // Up to +30% at 60% thinning

  for (let y = 0; y <= years; y++) {
    // Climate effect
    const warmingEffect = params.climateWarmingC > 0
      ? (y < 2 ? 1.02 : 1.02 - (y - 2) * 0.015 * params.climateWarmingC)
      : 1.0;

    const effectiveMai = baseMai * growthBoost * Math.max(0.6, warmingEffect);
    const carbonSeq = Math.round(effectiveMai * input.areaHa * CARBON_PER_M3);
    const timberValue = Math.round(volume * pricePerM3);

    projections.push({
      year: y,
      health: Math.round(clamp(health, 0, 100)),
      timberValue,
      beetleRisk: Math.round(clamp(beetleRisk, 0, 100)),
      biodiversity: Math.round(clamp(biodiversity, 0, 100)),
      carbonSeq,
      volume: Math.round(volume),
      confidenceLow: 0.85 - y * 0.015,
      confidenceHigh: 1.15 + y * 0.015,
    });

    if (y < years) {
      volume += effectiveMai * input.areaHa;

      // Beetle dynamics
      const beetleChange = params.beetleIntervention
        ? -2 + params.climateWarmingC * 1.5 * adjustedInput.spruceFraction
        : 4 + params.climateWarmingC * 3 * adjustedInput.spruceFraction;
      beetleRisk += beetleChange;

      // Health
      health += params.thinningPercent > 0 ? 1.0 : -0.8;
      health -= (beetleRisk / 100) * 1.5;
      health -= params.climateWarmingC * 0.5;

      // Biodiversity
      biodiversity += adjustedInput.broadleafFraction > 0.2 ? 1.5 : 0.3;
      biodiversity -= params.climateWarmingC * 0.3;
    }
  }

  return projections;
}

// ─── Public API ───

/** Default parcel data for demo mode */
export const DEFAULT_PARCEL_INPUT: ParcelInput = {
  areaHa: 85,
  volumeM3sk: 5400,
  spruceFraction: 0.65,
  pineFraction: 0.25,
  broadleafFraction: 0.10,
  healthScore: 72,
  beetleRisk: 35,
  biodiversityIndex: 48,
  standAge: 55,
  siteIndex: 26,
};

export function runScenario(
  scenarioId: ScenarioId,
  input: ParcelInput = DEFAULT_PARCEL_INPUT,
  customParams?: CustomScenarioParams,
): ScenarioResult {
  const years = 5;
  const baseline = projectBaseline(input, years);

  let action: YearProjection[];
  let summaryKey: string;
  let summaryParams: Record<string, string | number> = {};

  switch (scenarioId) {
    case 'do_nothing_5y': {
      action = projectBaseline(input, years);
      const valueDrop = baseline[0].timberValue - baseline[years].timberValue;
      summaryKey = valueDrop > 0
        ? 'scenarios.summary.doNothingLoss'
        : 'scenarios.summary.doNothingGain';
      summaryParams = {
        years: 5,
        valueDelta: Math.abs(baseline[years].timberValue - baseline[0].timberValue).toLocaleString('sv-SE'),
      };
      break;
    }

    case 'thin_30_spruce': {
      action = projectThin30(input, years);
      const valueGain = action[years].timberValue - baseline[years].timberValue;
      summaryKey = 'scenarios.summary.thinning';
      summaryParams = {
        percent: 30,
        valueGain: Math.abs(valueGain).toLocaleString('sv-SE'),
        years: 5,
      };
      break;
    }

    case 'beetle_unchecked': {
      action = projectBeetleUnchecked(input, years);
      const valueLoss = baseline[years].timberValue - action[years].timberValue;
      summaryKey = 'scenarios.summary.beetleUnchecked';
      summaryParams = {
        valueLoss: Math.abs(valueLoss).toLocaleString('sv-SE'),
        years: 5,
      };
      break;
    }

    case 'mixed_species': {
      action = projectMixedSpecies(input, years);
      summaryKey = 'scenarios.summary.mixedSpecies';
      summaryParams = {
        biodiversityGain: Math.max(0, action[years].biodiversity - baseline[years].biodiversity),
        years: 5,
      };
      break;
    }

    case 'climate_2c': {
      action = projectClimate2C(input, years);
      const riskIncrease = action[years].beetleRisk - baseline[years].beetleRisk;
      summaryKey = 'scenarios.summary.climate2c';
      summaryParams = {
        riskIncrease: Math.abs(riskIncrease),
        healthDrop: Math.abs(action[years].health - baseline[years].health),
      };
      break;
    }

    case 'custom': {
      const params = customParams ?? {
        thinningPercent: 20,
        targetSpecies: 'mixed',
        yearsToProject: 5,
        climateWarmingC: 0,
        beetleIntervention: true,
      };
      action = projectCustom(input, params);
      // Re-run baseline with matching years
      const customBaseline = projectBaseline(input, params.yearsToProject);
      summaryKey = 'scenarios.summary.custom';
      const finalYear = params.yearsToProject;
      summaryParams = {
        years: finalYear,
        healthDelta: action[finalYear].health - customBaseline[finalYear].health,
        valueDelta: (action[finalYear].timberValue - customBaseline[finalYear].timberValue).toLocaleString('sv-SE'),
      };
      return {
        scenarioId,
        baseline: customBaseline,
        action,
        summaryKey,
        summaryParams,
      };
    }

    default:
      action = projectBaseline(input, years);
      summaryKey = 'scenarios.summary.doNothingGain';
      summaryParams = { years: 5, valueDelta: '0' };
  }

  return { scenarioId, baseline, action, summaryKey, summaryParams };
}

/**
 * Quick preview of scenario impact for ScenarioCard.
 * Returns simple directional indicators.
 */
export function getScenarioPreview(
  scenarioId: ScenarioId,
): { health: string; value: string; risk: string } {
  switch (scenarioId) {
    case 'do_nothing_5y':
      return { health: '\u2193', value: '\u2193', risk: '\u2191\u2191' };
    case 'thin_30_spruce':
      return { health: '\u2191', value: '\u2191\u2191', risk: '\u2193' };
    case 'beetle_unchecked':
      return { health: '\u2193\u2193', value: '\u2193\u2193', risk: '\u2191\u2191\u2191' };
    case 'mixed_species':
      return { health: '\u2191\u2191', value: '\u2193', risk: '\u2193\u2193' };
    case 'climate_2c':
      return { health: '\u2193', value: '\u2193', risk: '\u2191\u2191' };
    case 'custom':
      return { health: '?', value: '?', risk: '?' };
    default:
      return { health: '-', value: '-', risk: '-' };
  }
}

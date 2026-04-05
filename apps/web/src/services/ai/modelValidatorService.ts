/**
 * Ecological Model Validation Service
 *
 * Uses AI to compare model predictions against real-world data and suggest
 * calibrations. Validates BeetleSense's 6 core ecological models against
 * observed data from traps, satellites, and community observations.
 *
 * TODO: Replace demo responses with actual Claude API calls when API key is configured.
 *
 * Aligned with EFI ForestWard Observatory grant: model validation and calibration
 * for Nordic forestry intelligence systems.
 */

// ─── Types ────────────────────────────────────────────────────────────────

export interface ModelValidation {
  modelName: string;
  parameter: string;
  predicted: number;
  actual: number;
  deviation: number;
  deviationPercent: number;
  sampleSize: number;
  period: string;
  significance: 'significant' | 'marginal' | 'within_tolerance';
  suggestion: string;
  supportingResearch: string;
  confidence: number;
}

export interface CalibrationReport {
  id: string;
  generatedAt: number;
  models: {
    gddBeetleForecast: ModelValidation;
    chapmanRichardsGrowth: ModelValidation;
    fwiFireRisk: ModelValidation;
    shannonBiodiversity: ModelValidation;
    marklundBiomass: ModelValidation;
    canopyHeightML: ModelValidation;
  };
  overallHealth: 'excellent' | 'good' | 'needs_attention' | 'critical';
  summary: string;
  nextReviewDate: string;
}

export interface ParameterUpdate {
  parameter: string;
  currentValue: number;
  suggestedValue: number;
  reason: string;
  citation: string;
}

// ─── Demo Validation Data ─────────────────────────────────────────────────

function getDemoGDDValidation(): ModelValidation {
  return {
    modelName: 'GDD Beetle Forecast',
    parameter: 'Swarming threshold (degree-days, base 5°C)',
    predicted: 557,
    actual: 530,
    deviation: -27,
    deviationPercent: -4.8,
    sampleSize: 12,
    period: 'Spring 2025 — 12 trap stations',
    significance: 'marginal',
    suggestion: 'Regional calibration recommended. Lindström et al. (2026) show Fennoscandian GDD thresholds shifting to 520-540 DD. Consider lowering threshold to 535 DD for Småland region.',
    supportingResearch: 'Lindström A, Kärvemo S, Jönsson AM (2026). Agricultural and Forest Meteorology.',
    confidence: 0.85,
  };
}

function getDemoGrowthValidation(): ModelValidation {
  return {
    modelName: 'Chapman-Richards Growth',
    parameter: 'Mean canopy height (meters)',
    predicted: 24.8,
    actual: 24.2,
    deviation: -0.6,
    deviationPercent: -2.4,
    sampleSize: 4,
    period: '4 parcels — CH-GEE vs model prediction',
    significance: 'within_tolerance',
    suggestion: 'Model performing well. Height deviation within expected ±3% range for Chapman-Richards with H100 site index calibration.',
    supportingResearch: 'Hägglund B, Lundmark JE (1977). SLU Department of Forest Survey.',
    confidence: 0.91,
  };
}

function getDemoFWIValidation(): ModelValidation {
  return {
    modelName: 'FWI Fire Risk',
    parameter: 'Fire Weather Index classification',
    predicted: 28.5,
    actual: 22.6,
    deviation: -5.9,
    deviationPercent: -20.7,
    sampleSize: 45,
    period: 'Summer 2025 — 45 days comparison',
    significance: 'marginal',
    suggestion: 'FWI tends to over-predict risk in Nordic boreal conditions. Integrating EUMETSAT soil moisture data could improve accuracy by 23% (Granström et al. 2026).',
    supportingResearch: 'Granström A, Niklasson M, Petersson H (2026). International Journal of Wildland Fire.',
    confidence: 0.78,
  };
}

function getDemoShannonValidation(): ModelValidation {
  return {
    modelName: 'Shannon Biodiversity Index',
    parameter: "Shannon diversity index (H')",
    predicted: 2.14,
    actual: 2.14,
    deviation: 0,
    deviationPercent: 0,
    sampleSize: 4,
    period: '4 parcels — field survey vs model',
    significance: 'within_tolerance',
    suggestion: 'Perfect alignment with field survey data. Shannon index calculation validated against species inventory.',
    supportingResearch: 'Shannon CE (1948). A Mathematical Theory of Communication.',
    confidence: 0.94,
  };
}

function getDemoMarklundValidation(): ModelValidation {
  return {
    modelName: 'Marklund Biomass (BEF)',
    parameter: 'Above-ground biomass (t/ha)',
    predicted: 142.5,
    actual: 156.8,
    deviation: 14.3,
    deviationPercent: 10.0,
    sampleSize: 4,
    period: '4 mature spruce parcels — BEF vs height-calibrated',
    significance: 'significant',
    suggestion: 'Traditional Marklund BEFs underestimate biomass by 8-12% in mature spruce (>25m). Height-calibrated estimates using GEDI + LiDAR more accurate for carbon accounting. Consider updating to height-calibrated approach.',
    supportingResearch: 'Nilsson M, Nordkvist K, Jonzén J, Lindgren N (2026). Forest Ecology and Management.',
    confidence: 0.82,
  };
}

function getDemoCanopyHeightValidation(): ModelValidation {
  return {
    modelName: 'Canopy Height ML',
    parameter: 'R² accuracy score',
    predicted: 0.89,
    actual: 0.87,
    deviation: -0.02,
    deviationPercent: -2.2,
    sampleSize: 250,
    period: '250 validation plots — CH-GEE vs LiDAR ground truth',
    significance: 'within_tolerance',
    suggestion: 'ML canopy height model performing within expected range. R² of 0.87 acceptable for 10m resolution global product. Local calibration could improve to 0.91+.',
    supportingResearch: 'Lang N, Jetz W, Schindler K, Wegner JD (2023). Nature Ecology & Evolution.',
    confidence: 0.88,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Validate GDD beetle forecast model against trap data.
 */
export function validateGDDModel(
  _trapData?: unknown,
  _weatherData?: unknown,
): ModelValidation {
  return getDemoGDDValidation();
}

/**
 * Validate Chapman-Richards growth model against canopy height data.
 */
export function validateGrowthModel(
  _parcelId?: string,
  _canopyHeightData?: unknown,
): ModelValidation {
  return getDemoGrowthValidation();
}

/**
 * Validate FWI fire risk model against actual fire occurrences.
 */
export function validateFWIModel(
  _weatherData?: unknown,
  _fireEvents?: unknown,
): ModelValidation {
  return getDemoFWIValidation();
}

/**
 * Generate a full calibration report across all 6 models.
 */
export function generateCalibrationReport(): CalibrationReport {
  const models = {
    gddBeetleForecast: getDemoGDDValidation(),
    chapmanRichardsGrowth: getDemoGrowthValidation(),
    fwiFireRisk: getDemoFWIValidation(),
    shannonBiodiversity: getDemoShannonValidation(),
    marklundBiomass: getDemoMarklundValidation(),
    canopyHeightML: getDemoCanopyHeightValidation(),
  };

  // Count models needing attention
  const validations = Object.values(models);
  const significantCount = validations.filter(v => v.significance === 'significant').length;
  const marginalCount = validations.filter(v => v.significance === 'marginal').length;

  let overallHealth: CalibrationReport['overallHealth'];
  if (significantCount >= 3) overallHealth = 'critical';
  else if (significantCount >= 2) overallHealth = 'needs_attention';
  else if (significantCount >= 1 || marginalCount >= 2) overallHealth = 'good';
  else overallHealth = 'excellent';

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + 30);

  return {
    id: `cal_${Date.now()}`,
    generatedAt: Date.now(),
    models,
    overallHealth,
    summary: `${validations.length - significantCount - marginalCount}/6 models within tolerance. ${significantCount > 0 ? `${significantCount} model${significantCount > 1 ? 's' : ''} suggest${significantCount === 1 ? 's' : ''} recalibration.` : 'All models performing well.'} ${marginalCount > 0 ? `${marginalCount} marginal deviation${marginalCount > 1 ? 's' : ''} to monitor.` : ''}`,
    nextReviewDate: nextReview.toISOString().slice(0, 10),
  };
}

/**
 * Suggest a parameter update for a model based on validation results.
 */
export function suggestParameterUpdate(
  _model: string,
  validation: ModelValidation,
): ParameterUpdate {
  return {
    parameter: validation.parameter,
    currentValue: validation.predicted,
    suggestedValue: validation.actual,
    reason: validation.suggestion,
    citation: validation.supportingResearch,
  };
}

/**
 * Multi-Source Fusion Engine
 *
 * Combines risk signals from 5 data sources into a weighted compound risk assessment:
 *   1. SMHI — temperature stress and drought indicators
 *   2. Sentinel-2 — NDVI anomaly detection
 *   3. Skogsstyrelsen — bark beetle trap trends
 *   4. NASA FIRMS — fire proximity detections
 *   5. ForestWard — phenological data and GDD tracking
 *
 * Fusion formula:
 *   CompoundRisk = Σ(source_score × source_weight × source_confidence) / Σ(source_weight)
 *   + cascading interaction bonuses
 *
 * Aligned with EFI ForestWard Observatory grant: multi-source data fusion
 * with weighted scoring and cascading risk detection.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type DataSource = 'SMHI' | 'SENTINEL' | 'SKOGSSTYRELSEN' | 'NASA_FIRMS' | 'FORESTWARD';

export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface SourceInput {
  source: DataSource;
  /** Normalized risk score 0-1 */
  riskScore: number;
  /** Confidence weight 0-1 (data quality/freshness) */
  confidence: number;
  /** Human-readable description of the signal */
  description: string;
  /** Timestamp of last data update */
  lastUpdated: string;
}

export interface FusionInputs {
  smhi?: SourceInput;
  sentinel?: SourceInput;
  skogsstyrelsen?: SourceInput;
  nasaFirms?: SourceInput;
  forestWard?: SourceInput;
}

export interface ContributingFactor {
  source: DataSource;
  label: string;
  riskScore: number;
  weight: number;
  weightedContribution: number;
  confidence: number;
}

export interface CompoundRiskAssessment {
  /** Overall risk score 0-100 */
  overallRisk: number;
  /** Risk level classification */
  riskLevel: RiskLevel;
  /** Contributing factors breakdown */
  factors: ContributingFactor[];
  /** Confidence in the overall assessment 0-1 */
  confidenceLevel: number;
  /** Number of active data sources */
  activeSources: number;
  /** Recommended actions based on risk profile */
  recommendedActions: string[];
  /** Timestamp */
  assessedAt: string;
}

export interface CascadingThreat {
  /** Interacting threats */
  threats: [DataSource, DataSource];
  /** Name of the cascading effect */
  name: string;
  /** Description of the interaction mechanism */
  mechanism: string;
  /** Amplification factor (>1 means risk amplified) */
  amplification: number;
  /** Risk level of this interaction */
  riskLevel: RiskLevel;
  /** Recommended response */
  action: string;
}

// ─── Source Weights ────────────────────────────────────────────────────────

/**
 * Default weights per data source. These reflect the reliability and
 * relevance of each source for compound forest risk assessment.
 */
const SOURCE_WEIGHTS: Record<DataSource, number> = {
  SMHI: 0.25,           // Temperature/drought — fundamental driver
  SENTINEL: 0.20,       // Satellite vegetation health — broad coverage
  SKOGSSTYRELSEN: 0.25, // Beetle trap data — ground truth for beetle risk
  NASA_FIRMS: 0.15,     // Fire detections — event-based, supplementary
  FORESTWARD: 0.15,     // Phenological data — emerging data source
};

/** Human-readable labels */
const SOURCE_LABELS: Record<DataSource, string> = {
  SMHI: 'SMHI Weather & Drought',
  SENTINEL: 'Sentinel-2 NDVI Anomaly',
  SKOGSSTYRELSEN: 'Skogsstyrelsen Trap Network',
  NASA_FIRMS: 'NASA FIRMS Fire Detection',
  FORESTWARD: 'ForestWard Phenology',
};

// ─── Risk Classification ──────────────────────────────────────────────────

function classifyRisk(score: number): RiskLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

// ─── Fusion Calculation ───────────────────────────────────────────────────

/**
 * Calculate the weighted fused risk score from all available inputs.
 */
export function calculateFusedRisk(inputs: FusionInputs): CompoundRiskAssessment {
  const allInputs: SourceInput[] = [
    inputs.smhi,
    inputs.sentinel,
    inputs.skogsstyrelsen,
    inputs.nasaFirms,
    inputs.forestWard,
  ].filter((x): x is SourceInput => x !== undefined);

  if (allInputs.length === 0) {
    return {
      overallRisk: 0,
      riskLevel: 'LOW',
      factors: [],
      confidenceLevel: 0,
      activeSources: 0,
      recommendedActions: ['No data sources available — connect monitoring systems'],
      assessedAt: new Date().toISOString(),
    };
  }

  // Calculate weighted risk
  let weightedSum = 0;
  let weightSum = 0;
  let confidenceSum = 0;
  const factors: ContributingFactor[] = [];

  for (const input of allInputs) {
    const weight = SOURCE_WEIGHTS[input.source];
    const weightedContribution = input.riskScore * weight * input.confidence;
    weightedSum += weightedContribution;
    weightSum += weight;
    confidenceSum += input.confidence;

    factors.push({
      source: input.source,
      label: SOURCE_LABELS[input.source],
      riskScore: Math.round(input.riskScore * 100) / 100,
      weight,
      weightedContribution: Math.round(weightedContribution * 100) / 100,
      confidence: input.confidence,
    });
  }

  // Normalize to 0-100 scale
  const baseRisk = weightSum > 0 ? (weightedSum / weightSum) * 100 : 0;

  // Detect cascading threats and apply amplification
  const cascading = detectCascadingThreats(inputs);
  const maxAmplification = cascading.length > 0
    ? Math.max(...cascading.map(c => c.amplification))
    : 1.0;

  const overallRisk = Math.min(100, Math.round(baseRisk * maxAmplification));

  // Overall confidence is the average of source confidences
  const confidenceLevel = Math.round((confidenceSum / allInputs.length) * 100) / 100;

  // Generate recommendations
  const recommendedActions = generateRecommendations(overallRisk, factors, cascading);

  // Sort factors by weighted contribution (highest first)
  factors.sort((a, b) => b.weightedContribution - a.weightedContribution);

  return {
    overallRisk,
    riskLevel: classifyRisk(overallRisk),
    factors,
    confidenceLevel,
    activeSources: allInputs.length,
    recommendedActions,
    assessedAt: new Date().toISOString(),
  };
}

// ─── Cascading Threat Detection ───────────────────────────────────────────

/**
 * Detect cascading threat interactions between data sources.
 *
 * Cascading risks occur when two threats amplify each other:
 *   - Drought + Beetle: drought weakens tree defences → beetle success increases
 *   - Drought + Fire: drought dries fuels → fire probability increases
 *   - Beetle + Fire: beetle-killed trees increase fuel load → fire intensity increases
 *   - NDVI anomaly + Beetle: vegetation stress often precedes beetle attack
 */
export function detectCascadingThreats(inputs: FusionInputs): CascadingThreat[] {
  const threats: CascadingThreat[] = [];

  const smhiRisk = inputs.smhi?.riskScore ?? 0;
  const sentinelRisk = inputs.sentinel?.riskScore ?? 0;
  const beetleRisk = inputs.skogsstyrelsen?.riskScore ?? 0;
  const fireRisk = inputs.nasaFirms?.riskScore ?? 0;
  const phenoRisk = inputs.forestWard?.riskScore ?? 0;

  // Drought × Beetle cascade
  if (smhiRisk > 0.4 && beetleRisk > 0.3) {
    const amp = 1 + smhiRisk * 0.35;
    threats.push({
      threats: ['SMHI', 'SKOGSSTYRELSEN'],
      name: 'Drought-Beetle Cascade',
      mechanism: 'Drought stress reduces spruce resin production by 40-60%, lowering natural defence against bark beetle colonization (Netherer & Schopf 2010)',
      amplification: Math.round(amp * 100) / 100,
      riskLevel: amp > 1.25 ? 'HIGH' : 'MODERATE',
      action: 'Postpone thinning operations in drought-stressed stands. Prioritise beetle monitoring in mature spruce.',
    });
  }

  // Drought × Fire cascade
  if (smhiRisk > 0.3 && fireRisk > 0.3) {
    const amp = 1 + smhiRisk * 0.30;
    threats.push({
      threats: ['SMHI', 'NASA_FIRMS'],
      name: 'Drought-Fire Cascade',
      mechanism: 'Extended drought dries forest floor litter, dramatically increasing fire ignition probability and spread rate',
      amplification: Math.round(amp * 100) / 100,
      riskLevel: amp > 1.20 ? 'HIGH' : 'MODERATE',
      action: 'Clear firebreaks, verify water source availability, and restrict machinery use during dry periods.',
    });
  }

  // Beetle × Fire cascade
  if (beetleRisk > 0.4 && fireRisk > 0.2) {
    const amp = 1 + beetleRisk * 0.25;
    threats.push({
      threats: ['SKOGSSTYRELSEN', 'NASA_FIRMS'],
      name: 'Beetle-Fire Feedback',
      mechanism: 'Beetle-killed trees increase fuel load by 40-200%. Fire following beetle outbreak burns 3x hotter than in healthy stands (Thom et al. 2023)',
      amplification: Math.round(amp * 100) / 100,
      riskLevel: amp > 1.20 ? 'HIGH' : 'MODERATE',
      action: 'Prioritise salvage harvesting of beetle-killed timber. Remove dead wood along access roads.',
    });
  }

  // Vegetation stress × Beetle (early warning)
  if (sentinelRisk > 0.3 && beetleRisk > 0.2) {
    const amp = 1 + sentinelRisk * 0.20;
    threats.push({
      threats: ['SENTINEL', 'SKOGSSTYRELSEN'],
      name: 'Vegetation Stress Warning',
      mechanism: 'NDVI anomalies often precede visible beetle damage by 4-6 weeks. Satellite-detected stress correlates with reduced tree defence capacity.',
      amplification: Math.round(amp * 100) / 100,
      riskLevel: sentinelRisk > 0.5 ? 'HIGH' : 'MODERATE',
      action: 'Ground-truth NDVI anomaly locations within 48 hours. Inspect for bore dust, bark flaking, and crown discolouration.',
    });
  }

  // Phenology × Beetle (GDD-driven outbreak timing)
  if (phenoRisk > 0.4 && beetleRisk > 0.3) {
    const amp = 1 + phenoRisk * 0.15;
    threats.push({
      threats: ['FORESTWARD', 'SKOGSSTYRELSEN'],
      name: 'Phenology-Beetle Synchrony',
      mechanism: 'Accumulated growing degree days approaching swarming threshold (280 GDD, base 5°C). Beetle flight activity peaks when GDD + trap counts both elevated.',
      amplification: Math.round(amp * 100) / 100,
      riskLevel: phenoRisk > 0.6 ? 'HIGH' : 'MODERATE',
      action: 'Deploy additional pheromone traps. Inspect wind-damaged areas for fresh beetle colonisation.',
    });
  }

  return threats;
}

// ─── Recommendation Engine ────────────────────────────────────────────────

function generateRecommendations(
  overallRisk: number,
  factors: ContributingFactor[],
  cascading: CascadingThreat[],
): string[] {
  const recs: string[] = [];

  if (overallRisk >= 75) {
    recs.push('CRITICAL: Immediate field inspection recommended within 24 hours');
  }

  // Source-specific recommendations
  const topFactor = factors[0];
  if (topFactor) {
    switch (topFactor.source) {
      case 'SMHI':
        if (topFactor.riskScore > 0.6) recs.push('Drought stress dominant: monitor soil moisture, postpone mechanical operations');
        break;
      case 'SENTINEL':
        if (topFactor.riskScore > 0.5) recs.push('NDVI anomalies detected: schedule ground-truth survey for affected areas');
        break;
      case 'SKOGSSTYRELSEN':
        if (topFactor.riskScore > 0.5) recs.push('Elevated beetle trap counts: inspect mature spruce stands for bore dust and crown changes');
        break;
      case 'NASA_FIRMS':
        if (topFactor.riskScore > 0.5) recs.push('Active fire detections nearby: verify firebreak condition and water availability');
        break;
      case 'FORESTWARD':
        if (topFactor.riskScore > 0.5) recs.push('Phenological indicators suggest approaching beetle swarming threshold');
        break;
    }
  }

  // Cascading threat recommendations
  if (cascading.length > 0) {
    const maxAmp = Math.max(...cascading.map(c => c.amplification));
    recs.push(`${cascading.length} cascading interaction(s) detected — risk amplified by up to ${Math.round((maxAmp - 1) * 100)}%`);
  }

  // Low risk
  if (overallRisk < 25 && recs.length === 0) {
    recs.push('Compound risk LOW. Continue routine monitoring schedule.');
  }

  return recs;
}

// ─── Demo Data ─────────────────────────────────────────────────────────────

/**
 * Generate demo fusion inputs for current seasonal conditions in Småland.
 */
export function getDemoFusionInputs(): FusionInputs {
  const month = new Date().getMonth() + 1;
  const isSummer = month >= 5 && month <= 9;
  const now = new Date().toISOString();

  return {
    smhi: {
      source: 'SMHI',
      riskScore: isSummer ? 0.35 + Math.random() * 0.35 : 0.10 + Math.random() * 0.15,
      confidence: 0.92,
      description: isSummer
        ? 'Elevated temperature stress with below-average precipitation'
        : 'Seasonal conditions within normal range',
      lastUpdated: now,
    },
    sentinel: {
      source: 'SENTINEL',
      riskScore: isSummer ? 0.20 + Math.random() * 0.25 : 0.05 + Math.random() * 0.10,
      confidence: 0.85,
      description: isSummer
        ? 'NDVI anomalies detected in 3 parcels — possible drought stress'
        : 'Vegetation indices within seasonal norms',
      lastUpdated: now,
    },
    skogsstyrelsen: {
      source: 'SKOGSSTYRELSEN',
      riskScore: isSummer ? 0.30 + Math.random() * 0.40 : 0.05 + Math.random() * 0.10,
      confidence: 0.88,
      description: isSummer
        ? 'Trap counts rising: 1,800 beetles/trap/week (threshold: 3,000)'
        : 'Beetle populations dormant — winter monitoring',
      lastUpdated: now,
    },
    nasaFirms: {
      source: 'NASA_FIRMS',
      riskScore: isSummer ? 0.10 + Math.random() * 0.20 : 0.02 + Math.random() * 0.05,
      confidence: 0.78,
      description: isSummer
        ? `${Math.round(Math.random() * 3)} active fire detections within 100km radius`
        : 'No active fire detections in region',
      lastUpdated: now,
    },
    forestWard: {
      source: 'FORESTWARD',
      riskScore: isSummer ? 0.25 + Math.random() * 0.30 : 0.05 + Math.random() * 0.10,
      confidence: 0.80,
      description: isSummer
        ? 'GDD accumulation ahead of 10-year average — early swarming risk'
        : 'Dormant season — phenological monitoring paused',
      lastUpdated: now,
    },
  };
}

// ─── Satellite Validation of Gut Instinct Service ───
// Maps field observations to satellite spectral indices, generates demo analysis
// data, computes change detection, and produces plain-language verdicts.

export type ObservationType =
  | 'thinning_crowns'
  | 'color_change'
  | 'dry_trees'
  | 'wet_area'
  | 'unusual_growth'
  | 'wind_damage'
  | 'other';

export type VerdictStatus = 'confirmed' | 'normal' | 'monitoring';
export type SeverityLevel = 'none' | 'low' | 'moderate' | 'high' | 'critical';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface SpectralIndex {
  id: string;
  name: string;
  fullName: string;
  description: string;
  range: [number, number];
  healthyRange: [number, number];
}

export interface IndexReading {
  indexId: string;
  current: number;
  baseline: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  severity: SeverityLevel;
}

export interface SatelliteAnalysis {
  id: string;
  observationType: ObservationType;
  location: { lng: number; lat: number };
  radiusMeters: number;
  timestamp: string;
  baselineTimestamp: string;
  indices: IndexReading[];
  primaryIndex: IndexReading;
  verdict: VerdictStatus;
  verdictText: string;
  explanation: string;
  severity: SeverityLevel;
  confidence: ConfidenceLevel;
  confidenceFactors: {
    dataQuality: number;
    cloudCover: number;
    temporalGap: number;
    overall: number;
  };
  suggestedActions: string[];
}

export interface SavedObservation {
  id: string;
  observationType: ObservationType;
  location: { lng: number; lat: number };
  radiusMeters: number;
  date: string;
  verdict: VerdictStatus;
  severity: SeverityLevel;
  primaryMetric: string;
  primaryValue: number;
  changePercent: number;
  parcelName: string;
}

// ─── Spectral Index Definitions ───

export const SPECTRAL_INDICES: Record<string, SpectralIndex> = {
  ndvi: {
    id: 'ndvi',
    name: 'NDVI',
    fullName: 'Normalized Difference Vegetation Index',
    description: 'Measures vegetation greenness and density. Higher values indicate healthier vegetation.',
    range: [-1, 1],
    healthyRange: [0.6, 0.9],
  },
  ndwi: {
    id: 'ndwi',
    name: 'NDWI',
    fullName: 'Normalized Difference Water Index',
    description: 'Detects surface water and moisture levels. Higher values indicate more water content.',
    range: [-1, 1],
    healthyRange: [-0.3, 0.1],
  },
  moisture: {
    id: 'moisture',
    name: 'Moisture',
    fullName: 'Normalized Difference Moisture Index',
    description: 'Measures canopy and soil moisture stress. Lower values suggest drought conditions.',
    range: [-1, 1],
    healthyRange: [0.2, 0.6],
  },
  canopy: {
    id: 'canopy',
    name: 'Canopy',
    fullName: 'Canopy Density Index',
    description: 'Estimates crown closure percentage. Drops indicate thinning or dieback.',
    range: [0, 100],
    healthyRange: [60, 95],
  },
  chlorophyll: {
    id: 'chlorophyll',
    name: 'CHL',
    fullName: 'Chlorophyll Index',
    description: 'Reflects leaf chlorophyll content. Drops signal early stress before visible color change.',
    range: [0, 1],
    healthyRange: [0.4, 0.8],
  },
  soilMoisture: {
    id: 'soilMoisture',
    name: 'SM',
    fullName: 'Soil Moisture Index',
    description: 'Estimates topsoil moisture from radar data. High values indicate waterlogging.',
    range: [0, 1],
    healthyRange: [0.2, 0.5],
  },
};

// ─── Observation → Index Mapping ───

export const OBSERVATION_INDICES: Record<ObservationType, string[]> = {
  thinning_crowns: ['ndvi', 'canopy'],
  color_change: ['ndvi', 'chlorophyll'],
  dry_trees: ['moisture', 'ndvi'],
  wet_area: ['soilMoisture', 'ndwi'],
  unusual_growth: ['ndvi', 'canopy', 'chlorophyll'],
  wind_damage: ['canopy', 'ndvi'],
  other: ['ndvi', 'moisture', 'canopy'],
};

export const OBSERVATION_ICONS: Record<ObservationType, string> = {
  thinning_crowns: 'TreePine',
  color_change: 'Palette',
  dry_trees: 'Flame',
  wet_area: 'Droplets',
  unusual_growth: 'Sprout',
  wind_damage: 'Wind',
  other: 'HelpCircle',
};

// ─── Severity Thresholds ───

interface SeverityThreshold {
  none: number;
  low: number;
  moderate: number;
  high: number;
}

const SEVERITY_THRESHOLDS: Record<string, SeverityThreshold> = {
  ndvi: { none: 5, low: 10, moderate: 20, high: 35 },
  ndwi: { none: 8, low: 15, moderate: 25, high: 40 },
  moisture: { none: 5, low: 12, moderate: 22, high: 35 },
  canopy: { none: 3, low: 8, moderate: 15, high: 25 },
  chlorophyll: { none: 5, low: 12, moderate: 20, high: 30 },
  soilMoisture: { none: 10, low: 20, moderate: 35, high: 50 },
};

function classifySeverity(indexId: string, changePercent: number): SeverityLevel {
  const absChange = Math.abs(changePercent);
  const thresholds = SEVERITY_THRESHOLDS[indexId] ?? SEVERITY_THRESHOLDS.ndvi;
  if (absChange < thresholds.none) return 'none';
  if (absChange < thresholds.low) return 'low';
  if (absChange < thresholds.moderate) return 'moderate';
  if (absChange < thresholds.high) return 'high';
  return 'critical';
}

// ─── Demo Data Generation ───

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

function generateIndexReading(
  indexId: string,
  observationType: ObservationType,
  locationSeed: number,
): IndexReading {
  const rng = seededRandom(locationSeed + indexId.charCodeAt(0) * 31);
  const spec = SPECTRAL_INDICES[indexId];
  if (!spec) {
    return {
      indexId,
      current: 0.5,
      baseline: 0.6,
      changePercent: -16.7,
      trend: 'down',
      severity: 'moderate',
    };
  }

  const [healthLow, healthHigh] = spec.healthyRange;
  const healthMid = (healthLow + healthHigh) / 2;
  const healthSpread = healthHigh - healthLow;

  // Baseline is healthy
  const baseline = healthMid + (rng() - 0.5) * healthSpread * 0.6;

  // Whether observation type implies degradation for this index
  const isDegradation =
    (observationType === 'wet_area' && (indexId === 'soilMoisture' || indexId === 'ndwi'));

  let current: number;
  if (isDegradation) {
    // For wet area, soil moisture and NDWI go UP
    current = baseline + rng() * healthSpread * 0.8;
  } else if (observationType === 'unusual_growth') {
    // Growth — values go up slightly or are normal
    current = baseline + (rng() - 0.3) * healthSpread * 0.3;
  } else {
    // Most observations indicate decline
    const dropFactor = 0.15 + rng() * 0.35;
    current = baseline * (1 - dropFactor);
  }

  // Clamp to range
  current = Math.max(spec.range[0], Math.min(spec.range[1], current));
  const clampedBaseline = Math.max(spec.range[0], Math.min(spec.range[1], baseline));

  const changePercent = clampedBaseline !== 0
    ? ((current - clampedBaseline) / Math.abs(clampedBaseline)) * 100
    : 0;

  const trend: 'up' | 'down' | 'stable' =
    Math.abs(changePercent) < 3 ? 'stable' : changePercent > 0 ? 'up' : 'down';

  return {
    indexId,
    current: Math.round(current * 1000) / 1000,
    baseline: Math.round(clampedBaseline * 1000) / 1000,
    changePercent: Math.round(changePercent * 10) / 10,
    trend,
    severity: classifySeverity(indexId, changePercent),
  };
}

// ─── Verdict Generation ───

function generateVerdict(
  observationType: ObservationType,
  primaryIndex: IndexReading,
  _allIndices: IndexReading[],
): { verdict: VerdictStatus; verdictText: string; explanation: string; suggestedActions: string[] } {
  const absChange = Math.abs(primaryIndex.changePercent);
  const spec = SPECTRAL_INDICES[primaryIndex.indexId];
  const indexName = spec?.name ?? primaryIndex.indexId.toUpperCase();

  // Determine verdict
  let verdict: VerdictStatus;
  if (absChange >= 15) {
    verdict = 'confirmed';
  } else if (absChange >= 8) {
    verdict = 'monitoring';
  } else {
    verdict = 'normal';
  }

  // Build verdict text
  const verdictTexts: Record<VerdictStatus, Record<ObservationType, string>> = {
    confirmed: {
      thinning_crowns: `Your instinct is correct — ${indexName} dropped ${absChange.toFixed(1)}% over the past 3 months. Crown thinning is evident in the satellite data.`,
      color_change: `Confirmed — ${indexName} declined ${absChange.toFixed(1)}%, consistent with chlorophyll loss. The color change you observed is real.`,
      dry_trees: `Your observation checks out — moisture index dropped ${absChange.toFixed(1)}%. Trees in this area show significant water stress.`,
      wet_area: `Confirmed — soil moisture increased ${absChange.toFixed(1)}%. The wet conditions you noticed are visible from space.`,
      wind_damage: `Satellite data confirms canopy disruption — ${indexName} dropped ${absChange.toFixed(1)}%. Wind damage signatures detected.`,
      unusual_growth: `Interesting — ${indexName} changed ${absChange.toFixed(1)}%. The growth pattern you noticed deviates from the baseline.`,
      other: `Your observation appears significant — ${indexName} changed ${absChange.toFixed(1)}% from baseline levels.`,
    },
    monitoring: {
      thinning_crowns: `Possible early signs — ${indexName} shows a ${absChange.toFixed(1)}% shift. Worth monitoring over the next few weeks.`,
      color_change: `Subtle change detected — ${indexName} shifted ${absChange.toFixed(1)}%. Could be seasonal or early stress. Keep watching.`,
      dry_trees: `Mild moisture decline of ${absChange.toFixed(1)}%. Not conclusive yet but consistent with early drought stress.`,
      wet_area: `Moderate moisture increase of ${absChange.toFixed(1)}%. The area shows some wetness but within borderline range.`,
      wind_damage: `Some canopy change detected (${absChange.toFixed(1)}%) but not conclusive for wind damage. Recommend ground visit.`,
      unusual_growth: `Minor deviation of ${absChange.toFixed(1)}% from expected pattern. May be worth a closer look.`,
      other: `Borderline change of ${absChange.toFixed(1)}% detected. Recommend follow-up observation in 2-4 weeks.`,
    },
    normal: {
      thinning_crowns: `Looks normal — ${indexName} is within seasonal variation (${absChange.toFixed(1)}% change). Your trees appear healthy from satellite view.`,
      color_change: `Within normal range — ${indexName} shift of ${absChange.toFixed(1)}% is consistent with seasonal variation. No anomaly detected.`,
      dry_trees: `Good news — moisture levels look stable (${absChange.toFixed(1)}% change). No drought stress visible from satellite.`,
      wet_area: `Soil moisture is within normal range (${absChange.toFixed(1)}% change). No unusual waterlogging detected.`,
      wind_damage: `Canopy looks intact — only ${absChange.toFixed(1)}% change detected. No wind damage signatures visible.`,
      unusual_growth: `Growth patterns appear normal (${absChange.toFixed(1)}% variation). Within expected seasonal range.`,
      other: `No significant anomaly detected (${absChange.toFixed(1)}% change). Values are within the expected range.`,
    },
  };

  const verdictText = verdictTexts[verdict][observationType];

  // Build explanation
  const explanations: Record<ObservationType, string> = {
    thinning_crowns: `Crown thinning typically appears as a drop in both NDVI (vegetation greenness) and canopy density. When bark beetles or drought stress a spruce tree, the crown thins from the top down, which satellites detect as reduced reflectance in the near-infrared band.`,
    color_change: `Color changes in conifers (yellowing, browning) directly reduce chlorophyll content, which shows up as declining NDVI and chlorophyll indices. This can indicate beetle infestation, fungal disease, or nutrient deficiency.`,
    dry_trees: `Drought-stressed trees close their stomata and reduce transpiration, causing measurable drops in both the moisture index (from canopy water content) and NDVI (from reduced photosynthetic activity).`,
    wet_area: `Excess soil moisture shows up as elevated NDWI and soil moisture index values. Waterlogging can stress root systems and make trees vulnerable to windthrow. Persistent wet areas may indicate drainage changes or rising water tables.`,
    wind_damage: `Wind damage creates sudden canopy gaps visible as sharp drops in canopy density and NDVI. Even partial damage (leaning trees, broken tops) alters the reflectance pattern detectable by satellite.`,
    unusual_growth: `Unusual growth can indicate fertilization effects, reduced competition from neighboring trees, or climate-related changes. Satellite indices help distinguish whether the pattern is localized or part of a broader trend.`,
    other: `We check multiple spectral indices to give you a comprehensive picture. NDVI measures vegetation health, moisture index tracks water stress, and canopy density shows structural changes.`,
  };

  // Suggested actions
  const actionsByVerdict: Record<VerdictStatus, Record<ObservationType, string[]>> = {
    confirmed: {
      thinning_crowns: [
        'Schedule a ground inspection within 1-2 weeks',
        'Check for bark beetle bore holes on affected trees',
        'Consider ordering a drone survey for detailed mapping',
        'Notify Skogsstyrelsen if bark beetle infestation is confirmed',
      ],
      color_change: [
        'Visit the site to identify the cause (beetle, fungus, nutrient)',
        'Take close-up photos of affected needles/bark',
        'Use BeetleSense Vision Search to identify symptoms',
        'Consider a targeted drone survey of the affected zone',
      ],
      dry_trees: [
        'Check soil conditions and drainage on site',
        'Prioritize removal of dead/dying trees before beetle colonization',
        'Monitor neighboring stands for spreading stress',
        'Consider salvage harvesting if damage is extensive',
      ],
      wet_area: [
        'Inspect drainage ditches for blockages',
        'Check if adjacent operations have altered water flow',
        'Assess windthrow risk for trees in the waterlogged zone',
        'Consider consulting a forest drainage specialist',
      ],
      wind_damage: [
        'Inspect the area for fallen or leaning trees immediately',
        'Remove windthrown timber promptly to prevent beetle breeding',
        'Report significant damage to your insurance provider',
        'Plan edge stabilization for newly exposed forest edges',
      ],
      unusual_growth: [
        'Document the growth pattern with photos',
        'Compare with neighboring stands for context',
        'Check soil conditions — could indicate nutrient anomaly',
      ],
      other: [
        'Visit the site for ground verification',
        'Take photos and log the observation',
        'Schedule a follow-up satellite check in 4 weeks',
      ],
    },
    monitoring: {
      thinning_crowns: [
        'Schedule a satellite re-check in 3-4 weeks',
        'Visit the area if convenient to look for early signs',
        'Save this observation to track changes over time',
      ],
      color_change: [
        'Re-check in 2-3 weeks to see if the trend continues',
        'If you visit the area, take photos for comparison',
        'Note the current weather conditions — could be seasonal',
      ],
      dry_trees: [
        'Monitor rainfall and temperature over the next weeks',
        'Re-check satellite data after the next significant rain event',
        'No immediate action needed but stay observant',
      ],
      wet_area: [
        'Check after the next dry period to see if moisture normalizes',
        'Inspect ditches when next in the area',
        'Re-run satellite check in 4-6 weeks',
      ],
      wind_damage: [
        'Visit the area during your next forest walk',
        'Re-check satellite data after the next storm event',
        'No urgent action needed at this level',
      ],
      unusual_growth: [
        'Continue monitoring — compare again next month',
        'Note seasonal context (time of year affects readings)',
      ],
      other: [
        'Save this observation and re-check in 4 weeks',
        'Visit the site when convenient for ground truth',
      ],
    },
    normal: {
      thinning_crowns: [
        'No action needed — your forest looks healthy here',
        'Continue regular seasonal monitoring',
      ],
      color_change: [
        'No action needed — color variation is within normal range',
        'If you still see something unusual on the ground, take photos',
      ],
      dry_trees: [
        'Moisture levels look good — no action needed',
        'Continue monitoring during dry summer periods',
      ],
      wet_area: [
        'Soil moisture is normal — no drainage issues detected',
        'Re-check if you notice standing water after rain',
      ],
      wind_damage: [
        'Canopy looks intact — no action needed',
        'Monitor after upcoming storms',
      ],
      unusual_growth: [
        'Growth pattern is within expected range',
        'No action needed',
      ],
      other: [
        'No anomaly detected — continue normal management',
        'Re-check if conditions change',
      ],
    },
  };

  return {
    verdict,
    verdictText,
    explanation: explanations[observationType],
    suggestedActions: actionsByVerdict[verdict][observationType],
  };
}

// ─── Confidence Calculation ───

function generateConfidence(locationSeed: number): SatelliteAnalysis['confidenceFactors'] {
  const rng = seededRandom(locationSeed + 999);
  const dataQuality = 0.7 + rng() * 0.3;
  const cloudCover = 0.6 + rng() * 0.4;
  const temporalGap = 0.65 + rng() * 0.35;
  const overall = (dataQuality * 0.4 + cloudCover * 0.35 + temporalGap * 0.25);
  return {
    dataQuality: Math.round(dataQuality * 100) / 100,
    cloudCover: Math.round(cloudCover * 100) / 100,
    temporalGap: Math.round(temporalGap * 100) / 100,
    overall: Math.round(overall * 100) / 100,
  };
}

function confidenceToLevel(overall: number): ConfidenceLevel {
  if (overall >= 0.8) return 'high';
  if (overall >= 0.6) return 'medium';
  return 'low';
}

// ─── Public API ───

export function analyzeLocation(
  observationType: ObservationType,
  location: { lng: number; lat: number },
  radiusMeters: number,
): SatelliteAnalysis {
  const locationSeed = Math.round((location.lng * 1000 + location.lat * 1000) * 7);
  const indexIds = OBSERVATION_INDICES[observationType];

  const indices = indexIds.map((id) => generateIndexReading(id, observationType, locationSeed));
  const primaryIndex = indices[0];

  const { verdict, verdictText, explanation, suggestedActions } = generateVerdict(
    observationType,
    primaryIndex,
    indices,
  );

  const confidenceFactors = generateConfidence(locationSeed);
  const confidence = confidenceToLevel(confidenceFactors.overall);

  // Overall severity from primary index
  const severity = primaryIndex.severity;

  const now = new Date();
  const baseline = new Date(now);
  baseline.setMonth(baseline.getMonth() - 3);

  return {
    id: `analysis-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    observationType,
    location,
    radiusMeters,
    timestamp: now.toISOString(),
    baselineTimestamp: baseline.toISOString(),
    indices,
    primaryIndex,
    verdict,
    verdictText,
    explanation,
    severity,
    confidence,
    confidenceFactors,
    suggestedActions,
  };
}

// ─── Pre-saved Demo Observations ───

export const DEMO_OBSERVATIONS: SavedObservation[] = [
  {
    id: 'obs-demo-1',
    observationType: 'thinning_crowns',
    location: { lng: 15.42, lat: 57.78 },
    radiusMeters: 200,
    date: '2026-02-28',
    verdict: 'confirmed',
    severity: 'high',
    primaryMetric: 'NDVI',
    primaryValue: 0.48,
    changePercent: -22.3,
    parcelName: 'Norra Skogen',
  },
  {
    id: 'obs-demo-2',
    observationType: 'wet_area',
    location: { lng: 15.38, lat: 57.75 },
    radiusMeters: 150,
    date: '2026-03-05',
    verdict: 'normal',
    severity: 'none',
    primaryMetric: 'Soil Moisture',
    primaryValue: 0.35,
    changePercent: 4.2,
    parcelName: 'Ekbacken',
  },
  {
    id: 'obs-demo-3',
    observationType: 'color_change',
    location: { lng: 15.45, lat: 57.80 },
    radiusMeters: 300,
    date: '2026-03-12',
    verdict: 'monitoring',
    severity: 'moderate',
    primaryMetric: 'CHL',
    primaryValue: 0.38,
    changePercent: -14.1,
    parcelName: 'Granholmen',
  },
];

export function getObservationLabel(type: ObservationType): string {
  const labels: Record<ObservationType, string> = {
    thinning_crowns: 'Thinning Crowns',
    color_change: 'Color Change',
    dry_trees: 'Dry Trees',
    wet_area: 'Wet Area',
    unusual_growth: 'Unusual Growth',
    wind_damage: 'Wind Damage',
    other: 'Other',
  };
  return labels[type];
}

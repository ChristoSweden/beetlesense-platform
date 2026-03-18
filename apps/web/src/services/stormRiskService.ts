// ─── Storm & Windthrow Risk Calculation Engine ───
// Computes wind vulnerability scores for Swedish forest stands based on
// terrain, edge effects, tree geometry, soil, species, and recent management.

export type RiskClassification = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskFactors {
  /** Terrain exposure: hilltops, west/SW facing slopes (0-10) */
  terrainExposure: number;
  /** Recently created edges from thinning/clearcut (0-10) */
  edgeEffect: number;
  /** Height:diameter ratio — tall thin trees = unstable (0-10) */
  heightDiameterRatio: number;
  /** Soil anchoring quality — shallow/wet = poor (0-10) */
  soilAnchoring: number;
  /** Species vulnerability — gran > tall (0-10) */
  speciesVulnerability: number;
  /** Recent thinning within 3 years (0-10) */
  recentThinning: number;
}

export interface StandRiskResult {
  standId: string;
  standName: string;
  parcelId: string;
  parcelName: string;
  overallScore: number;
  classification: RiskClassification;
  factors: RiskFactors;
  explanations: Record<keyof RiskFactors, string>;
  mitigationActions: MitigationAction[];
  /** GeoJSON polygon coordinates (WGS84) */
  coordinates: [number, number][][];
  /** Center point for labels */
  center: [number, number];
}

export interface MitigationAction {
  id: string;
  priority: 'immediate' | 'this_season' | 'next_5_years';
  action: string;
  description: string;
  estimatedCostSEK: number;
  riskReductionPercent: number;
}

export interface StormHistoryEvent {
  id: string;
  name: string;
  year: number;
  date: string;
  damageMCubicMeters: number;
  description: string;
  parcelImpactEstimate: string;
  maxWindSpeed: number;
  affectedRegions: string[];
}

export interface WindForecastHour {
  time: string;
  windSpeed: number;
  windDirection: number;
  gustSpeed: number;
}

export type WindAlertLevel = 'calm' | 'moderate' | 'strong' | 'storm_warning';

export interface WindConditions {
  currentSpeed: number;
  currentDirection: number;
  currentGust: number;
  alertLevel: WindAlertLevel;
  forecast48h: WindForecastHour[];
}

// ─── Risk factor weights (sum = 1.0) ───
const WEIGHTS: Record<keyof RiskFactors, number> = {
  terrainExposure: 0.20,
  edgeEffect: 0.18,
  heightDiameterRatio: 0.18,
  soilAnchoring: 0.16,
  speciesVulnerability: 0.15,
  recentThinning: 0.13,
};

export function classifyRisk(score: number): RiskClassification {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

export function getRiskColor(classification: RiskClassification): string {
  switch (classification) {
    case 'critical': return '#ef4444';
    case 'high': return '#f97316';
    case 'moderate': return '#fbbf24';
    case 'low': return '#4ade80';
  }
}

export function getWindAlertLevel(speedMs: number): WindAlertLevel {
  if (speedMs > 25) return 'storm_warning';
  if (speedMs > 15) return 'strong';
  if (speedMs > 8) return 'moderate';
  return 'calm';
}

export function getWindAlertColor(level: WindAlertLevel): string {
  switch (level) {
    case 'storm_warning': return '#ef4444';
    case 'strong': return '#f97316';
    case 'moderate': return '#fbbf24';
    case 'calm': return '#4ade80';
  }
}

function computeOverallScore(factors: RiskFactors): number {
  let score = 0;
  for (const key of Object.keys(WEIGHTS) as (keyof RiskFactors)[]) {
    score += factors[key] * WEIGHTS[key] * 10;
  }
  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── Demo data: 5 stands in Småland ───

const DEMO_STANDS: StandRiskResult[] = [
  {
    standId: 'stand-a',
    standName: 'Stand A — Hilltop Spruce',
    parcelId: 'parcel-1',
    parcelName: 'Norra Skogen',
    factors: {
      terrainExposure: 9,
      edgeEffect: 7,
      heightDiameterRatio: 8,
      soilAnchoring: 6,
      speciesVulnerability: 9,
      recentThinning: 10,
    },
    explanations: {
      terrainExposure: 'Exposed hilltop position with no wind shelter from surrounding terrain',
      edgeEffect: 'New edges created by adjacent clearcut 2 years ago increase turbulence',
      heightDiameterRatio: 'Tall, slender spruces (h:d ratio 95) — grown in dense stand',
      soilAnchoring: 'Thin moraine soil over bedrock limits root plate depth',
      speciesVulnerability: 'Norway spruce (gran) has shallow root system, highly wind-susceptible',
      recentThinning: 'Thinned 1.5 years ago — stand not yet adapted to new wind exposure',
    },
    mitigationActions: [
      {
        id: 'a1',
        priority: 'immediate',
        action: 'Install wind monitoring sensor on western boundary',
        description: 'Real-time alerts when wind exceeds thresholds for this exposed stand',
        estimatedCostSEK: 8000,
        riskReductionPercent: 5,
      },
      {
        id: 'a2',
        priority: 'this_season',
        action: 'Create gradual wind buffer on western edge',
        description: 'Plant fast-growing birch/alder mix in 15m strip on windward side',
        estimatedCostSEK: 35000,
        riskReductionPercent: 15,
      },
      {
        id: 'a3',
        priority: 'next_5_years',
        action: 'Gradually convert to mixed species stand',
        description: 'Underplant with pine and birch to create wind-resilient multi-layered canopy',
        estimatedCostSEK: 65000,
        riskReductionPercent: 25,
      },
    ],
    coordinates: [[[15.28, 57.12], [15.30, 57.12], [15.30, 57.135], [15.28, 57.135], [15.28, 57.12]]],
    center: [15.29, 57.1275],
    overallScore: 0,
    classification: 'low',
  },
  {
    standId: 'stand-b',
    standName: 'Stand B — Sheltered Pine',
    parcelId: 'parcel-1',
    parcelName: 'Norra Skogen',
    factors: {
      terrainExposure: 2,
      edgeEffect: 2,
      heightDiameterRatio: 3,
      soilAnchoring: 3,
      speciesVulnerability: 2,
      recentThinning: 1,
    },
    explanations: {
      terrainExposure: 'Well-sheltered valley position surrounded by mature forest on all sides',
      edgeEffect: 'No recent changes to stand boundaries — mature edges well established',
      heightDiameterRatio: 'Stocky pine with h:d ratio 65 — naturally wind-stable form',
      soilAnchoring: 'Deep sandy moraine provides excellent root anchorage',
      speciesVulnerability: 'Scots pine (tall) has deep taproot system — wind resistant',
      recentThinning: 'No thinning in past 8 years — stand fully adapted',
    },
    mitigationActions: [
      {
        id: 'b1',
        priority: 'next_5_years',
        action: 'Maintain current management approach',
        description: 'This stand is well-protected. Continue monitoring for any changes to surrounding forest',
        estimatedCostSEK: 0,
        riskReductionPercent: 0,
      },
    ],
    coordinates: [[[15.30, 57.12], [15.32, 57.12], [15.32, 57.13], [15.30, 57.13], [15.30, 57.12]]],
    center: [15.31, 57.125],
    overallScore: 0,
    classification: 'low',
  },
  {
    standId: 'stand-c',
    standName: 'Stand C — West-facing Edge',
    parcelId: 'parcel-1',
    parcelName: 'Norra Skogen',
    factors: {
      terrainExposure: 7,
      edgeEffect: 8,
      heightDiameterRatio: 6,
      soilAnchoring: 5,
      speciesVulnerability: 6,
      recentThinning: 8,
    },
    explanations: {
      terrainExposure: 'West-facing slope directly exposed to prevailing Atlantic storms',
      edgeEffect: 'Adjacent stand clearcut last winter — new 200m exposed edge created',
      heightDiameterRatio: 'Mixed height classes; edge trees have moderate h:d ratio 80',
      soilAnchoring: 'Clay-rich soil with seasonal waterlogging reduces anchorage in autumn',
      speciesVulnerability: 'Mixed spruce/pine/birch — moderate vulnerability from spruce component',
      recentThinning: 'Edge thinning 2 years ago left remaining trees more exposed',
    },
    mitigationActions: [
      {
        id: 'c1',
        priority: 'immediate',
        action: 'Mark and fell the 10 most exposed edge trees',
        description: 'Remove tall, unstable edge trees before autumn storm season to prevent domino effect',
        estimatedCostSEK: 15000,
        riskReductionPercent: 12,
      },
      {
        id: 'c2',
        priority: 'this_season',
        action: 'Create feathered edge with gradual height reduction',
        description: 'Selectively thin edge to create aerodynamic profile that deflects wind upward',
        estimatedCostSEK: 28000,
        riskReductionPercent: 18,
      },
    ],
    coordinates: [[[15.26, 57.125], [15.28, 57.125], [15.28, 57.14], [15.26, 57.14], [15.26, 57.125]]],
    center: [15.27, 57.1325],
    overallScore: 0,
    classification: 'low',
  },
  {
    standId: 'stand-d',
    standName: 'Stand D — Valley Spruce',
    parcelId: 'parcel-2',
    parcelName: 'Ekbacken',
    factors: {
      terrainExposure: 3,
      edgeEffect: 5,
      heightDiameterRatio: 5,
      soilAnchoring: 6,
      speciesVulnerability: 8,
      recentThinning: 2,
    },
    explanations: {
      terrainExposure: 'Valley bottom position offers some shelter but channeling effects possible',
      edgeEffect: 'Moderate edge exposure on northern side from road corridor',
      heightDiameterRatio: 'Average h:d ratio 78 — typical for managed spruce stand',
      soilAnchoring: 'Wet clay soil near stream reduces root anchoring, especially in autumn',
      speciesVulnerability: 'Pure Norway spruce — inherently high wind vulnerability',
      recentThinning: 'Last thinning 5 years ago — stand has adapted well',
    },
    mitigationActions: [
      {
        id: 'd1',
        priority: 'this_season',
        action: 'Improve drainage along western edge',
        description: 'Reduce soil waterlogging to improve root anchoring stability',
        estimatedCostSEK: 22000,
        riskReductionPercent: 10,
      },
      {
        id: 'd2',
        priority: 'next_5_years',
        action: 'Underplant with pine on drier microsites',
        description: 'Diversify species composition to reduce wind vulnerability over time',
        estimatedCostSEK: 40000,
        riskReductionPercent: 15,
      },
    ],
    coordinates: [[[15.32, 57.115], [15.34, 57.115], [15.34, 57.13], [15.32, 57.13], [15.32, 57.115]]],
    center: [15.33, 57.1225],
    overallScore: 0,
    classification: 'low',
  },
  {
    standId: 'stand-e',
    standName: 'Stand E — Young Plantation',
    parcelId: 'parcel-2',
    parcelName: 'Ekbacken',
    factors: {
      terrainExposure: 3,
      edgeEffect: 1,
      heightDiameterRatio: 2,
      soilAnchoring: 2,
      speciesVulnerability: 3,
      recentThinning: 1,
    },
    explanations: {
      terrainExposure: 'Gentle south-facing slope with moderate wind exposure',
      edgeEffect: 'Young plantation surrounded by mature forest — well sheltered',
      heightDiameterRatio: 'Short trees (6m avg) with low h:d ratio — inherently stable',
      soilAnchoring: 'Deep well-drained moraine — excellent anchoring potential',
      speciesVulnerability: 'Mixed planting (60% spruce, 40% pine) reduces overall vulnerability',
      recentThinning: 'No thinning yet — pre-commercial stage',
    },
    mitigationActions: [
      {
        id: 'e1',
        priority: 'next_5_years',
        action: 'Plan first thinning with wind stability in mind',
        description: 'When thinning in 3-5 years, avoid creating wide gaps; thin from the lee side first',
        estimatedCostSEK: 0,
        riskReductionPercent: 5,
      },
    ],
    coordinates: [[[15.34, 57.115], [15.36, 57.115], [15.36, 57.125], [15.34, 57.125], [15.34, 57.115]]],
    center: [15.35, 57.12],
    overallScore: 0,
    classification: 'low',
  },
];

// Compute scores for demo data
DEMO_STANDS.forEach((stand) => {
  stand.overallScore = computeOverallScore(stand.factors);
  stand.classification = classifyRisk(stand.overallScore);
});

// ─── Storm history for Sweden ───

const STORM_HISTORY: StormHistoryEvent[] = [
  {
    id: 'gudrun',
    name: 'Gudrun (Erwin)',
    year: 2005,
    date: '2005-01-08',
    damageMCubicMeters: 75,
    description: 'The worst storm in Swedish forestry history. Hurricane-force winds across Götaland destroyed 75 million m³ of timber — equivalent to an entire year of Swedish harvest.',
    parcelImpactEstimate: 'High — Småland was in the epicenter. Stands similar to yours on exposed hilltops suffered 60-90% windthrow.',
    maxWindSpeed: 42,
    affectedRegions: ['Småland', 'Halland', 'Västra Götaland', 'Skåne', 'Blekinge'],
  },
  {
    id: 'per',
    name: 'Per',
    year: 2007,
    date: '2007-01-14',
    damageMCubicMeters: 12,
    description: 'Struck the same region still recovering from Gudrun. Newly exposed edges from Gudrun salvage logging were especially vulnerable.',
    parcelImpactEstimate: 'Moderate — Forests with new edges from Gudrun cleanup were hit hardest. Your western-facing stands would have been at risk.',
    maxWindSpeed: 38,
    affectedRegions: ['Småland', 'Östergötland', 'Kalmar'],
  },
  {
    id: 'simone',
    name: 'Simone',
    year: 2013,
    date: '2013-10-28',
    damageMCubicMeters: 4,
    description: 'Autumn storm with strong winds across southern Sweden. Leaf-on deciduous trees experienced additional sail effect.',
    parcelImpactEstimate: 'Low-Moderate — Autumn storms affect broadleaf stands more. Your spruce stands would have had moderate exposure.',
    maxWindSpeed: 33,
    affectedRegions: ['Halland', 'Västra Götaland', 'Småland'],
  },
  {
    id: 'ivar',
    name: 'Ivar',
    year: 2024,
    date: '2024-01-01',
    damageMCubicMeters: 6,
    description: 'New Year storm bringing strong winds to central Sweden. Significant damage in already weakened stands after dry summer.',
    parcelImpactEstimate: 'Moderate — Spruce stands weakened by 2023 drought had reduced root anchorage. Your valley stand D was in a similar risk profile.',
    maxWindSpeed: 35,
    affectedRegions: ['Gävleborg', 'Dalarna', 'Västernorrland', 'Småland'],
  },
  {
    id: 'egon',
    name: 'Egon',
    year: 2015,
    date: '2015-01-10',
    damageMCubicMeters: 3,
    description: 'Strong winter storm with local damage in Götaland. Newly thinned stands and forest edges bore the brunt.',
    parcelImpactEstimate: 'Low — Moderate winds in Småland. Stands with recent thinning like Stand A would have been most affected.',
    maxWindSpeed: 30,
    affectedRegions: ['Halland', 'Skåne', 'Småland'],
  },
];

// ─── Demo wind forecast ───

function generateDemoForecast(): WindForecastHour[] {
  const hours: WindForecastHour[] = [];
  const now = new Date();
  now.setMinutes(0, 0, 0);

  for (let i = 0; i < 48; i++) {
    const time = new Date(now.getTime() + i * 3600000);
    const hour = time.getHours();

    // Simulate diurnal wind pattern — stronger during day
    const baseWind = 6 + Math.sin((hour - 6) * Math.PI / 12) * 4;
    // Add some variability
    const variation = Math.sin(i * 0.7) * 3 + Math.cos(i * 0.3) * 2;
    const windSpeed = Math.max(1, baseWind + variation);
    const gustSpeed = windSpeed * (1.3 + Math.random() * 0.4);

    // Prevailing westerly with some variation
    const windDirection = 240 + Math.sin(i * 0.5) * 40;

    hours.push({
      time: time.toISOString(),
      windSpeed: Math.round(windSpeed * 10) / 10,
      windDirection: Math.round(windDirection),
      gustSpeed: Math.round(gustSpeed * 10) / 10,
    });
  }

  return hours;
}

// ─── Public API ───

export function getStandRiskData(): StandRiskResult[] {
  return DEMO_STANDS;
}

export function getStormHistory(): StormHistoryEvent[] {
  return STORM_HISTORY;
}

export function getWindConditions(): WindConditions {
  const forecast = generateDemoForecast();
  const current = forecast[0];

  return {
    currentSpeed: current.windSpeed,
    currentDirection: current.windDirection,
    currentGust: current.gustSpeed,
    alertLevel: getWindAlertLevel(current.windSpeed),
    forecast48h: forecast,
  };
}

export function getOverallPropertyRisk(stands: StandRiskResult[]): {
  score: number;
  classification: RiskClassification;
} {
  if (stands.length === 0) return { score: 0, classification: 'low' };
  const maxScore = Math.max(...stands.map((s) => s.overallScore));
  return { score: maxScore, classification: classifyRisk(maxScore) };
}

/**
 * Convert stand risk results to GeoJSON FeatureCollection for map rendering
 */
export function toGeoJSON(stands: StandRiskResult[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: stands.map((stand) => ({
      type: 'Feature' as const,
      id: stand.standId,
      properties: {
        standId: stand.standId,
        standName: stand.standName,
        parcelName: stand.parcelName,
        overallScore: stand.overallScore,
        classification: stand.classification,
        color: getRiskColor(stand.classification),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: stand.coordinates,
      },
    })),
  };
}

// ─── Thermal Infrared Beetle Detection Service ───
// Processes nocturnal thermal drone surveys for early bark beetle detection.
// Infested trees show elevated crown temperature due to disrupted transpiration.
// At night (2-5 AM), healthy trees cool via evapotranspiration while infested
// trees retain heat. This delta-T signature detects infestations 4-6 weeks
// before any spectral (NDVI) method can see change.

// ─── Types ───

export interface ThermalSurvey {
  id: string;
  parcelId: string;
  surveyDate: string;
  startTime: string;
  endTime: string;
  droneModel: string;
  thermalCamera: string;
  ambientTempC: number;
  humidityPct: number;
  windSpeedMs: number;
  coverageAreaHa: number;
  resolutionCm: number;
  totalTrees: number;
  anomaliesDetected: number;
}

export interface ThermalAnomaly {
  id: string;
  surveyId: string;
  location: { lat: number; lng: number };
  crownTempC: number;
  ambientTempC: number;
  deltaT: number;
  neighborDeltaT: number;
  anomalyScore: number;
  classification: 'healthy' | 'early_stress' | 'probable_infestation' | 'confirmed_infestation';
  confidence: number;
  radiusMeter: number;
  ndviAtLocation?: number;
  estimatedDaysSinceInfestation: number;
  recommendation: string;
}

export interface ThermalTimeSeries {
  treeId: string;
  location: { lat: number; lng: number };
  surveys: {
    date: string;
    deltaT: number;
    classification: string;
    ndviComparison?: number;
  }[];
  trend: 'stable' | 'warming' | 'rapid_warming';
  alertTriggered: boolean;
}

export interface DetectionAdvantage {
  method: string;
  detectionLeadDays: number;
  optimalConditions: string;
  limitations: string;
  costPerHa: number;
}

export interface ThermalSurveyPlan {
  parcelId: string;
  optimalDates: string[];
  optimalTimeWindow: string;
  moonPhase: string;
  weatherSuitability: number;
  requiredConditions: string[];
  estimatedCostSEK: number;
  coverageStrategy: string;
}

// ─── Classification Thresholds ───

const DELTA_T_THRESHOLDS = {
  healthy: { max: 0.5 },
  earlyStress: { min: 1.0, max: 2.0 },
  probableInfestation: { min: 2.5, max: 4.0 },
  confirmedInfestation: { min: 4.0 },
} as const;

const NEIGHBOR_DELTA_WEIGHT = 0.6;
const HUMIDITY_CORRECTION_FACTOR = 0.012;
const SEASON_FACTORS: Record<string, number> = {
  spring: 0.85,
  summer: 1.0,
  autumn: 0.9,
  winter: 0.7,
};

// ─── Detection Method Comparison ───

export const THERMAL_DETECTION_INFO: DetectionAdvantage[] = [
  {
    method: 'Thermal night drone (LWIR)',
    detectionLeadDays: 38,
    optimalConditions: 'Clear nights, 2-5 AM, wind < 3 m/s, no rain in 24h',
    limitations: 'Weather dependent, requires FAA/LFV night waiver, seasonal (May-Sep best)',
    costPerHa: 250,
  },
  {
    method: 'Multispectral drone (NDVI/Red Edge)',
    detectionLeadDays: 15,
    optimalConditions: 'Daytime, overcast preferred (even illumination), growing season',
    limitations: 'Canopy closure can hide understory, affected by leaf phenology',
    costPerHa: 180,
  },
  {
    method: 'Sentinel-2 NDVI satellite',
    detectionLeadDays: 5,
    optimalConditions: '5-day revisit, cloud-free, growing season',
    limitations: '10m resolution misses individual trees, cloud gaps, 5-day latency',
    costPerHa: 0,
  },
  {
    method: 'SAR Sentinel-1 (C-band)',
    detectionLeadDays: 20,
    optimalConditions: 'All-weather, 6-day revisit, no illumination requirement',
    limitations: 'Indirect signal (moisture/structure change), noisy, requires multi-temporal stack',
    costPerHa: 0,
  },
  {
    method: 'Visual ground inspection',
    detectionLeadDays: 0,
    optimalConditions: 'Experienced inspector, dry weather, bark examination',
    limitations: 'Baseline — symptoms visible only when damage is advanced, slow coverage',
    costPerHa: 100,
  },
];

// ─── Demo Survey Data (Småland spruce stand, 2 AM flight) ───

const DEMO_SURVEY: ThermalSurvey = {
  id: 'ts-001',
  parcelId: 'p-smaland-0147',
  surveyDate: '2026-06-18',
  startTime: '02:15',
  endTime: '03:42',
  droneModel: 'DJI Matrice 350 RTK',
  thermalCamera: 'DJI Zenmuse H20T',
  ambientTempC: 11.3,
  humidityPct: 78,
  windSpeedMs: 1.4,
  coverageAreaHa: 35,
  resolutionCm: 5.2,
  totalTrees: 2847,
  anomaliesDetected: 23,
};

// ─── Demo Anomalies ───

function buildDemoAnomalies(): ThermalAnomaly[] {
  const anomalies: ThermalAnomaly[] = [];
  const surveyId = DEMO_SURVEY.id;
  const ambient = DEMO_SURVEY.ambientTempC;

  // 3 probable infestations — NDVI still shows healthy (the 4-6 week advantage)
  const probableInfestations: Omit<ThermalAnomaly, 'id'>[] = [
    {
      surveyId,
      location: { lat: 57.1832, lng: 15.2741 },
      crownTempC: 14.5,
      ambientTempC: ambient,
      deltaT: 3.2,
      neighborDeltaT: 2.8,
      anomalyScore: 87,
      classification: 'probable_infestation',
      confidence: 0.91,
      radiusMeter: 4.8,
      ndviAtLocation: 0.82,
      estimatedDaysSinceInfestation: 12,
      recommendation: 'Prioritera inspektion inom 48 timmar. NDVI visar fortfarande friskt (0.82) men termisk signatur tyder på pågående angrepp. Kontrollera borrhål under barken.',
    },
    {
      surveyId,
      location: { lat: 57.1845, lng: 15.2756 },
      crownTempC: 14.9,
      ambientTempC: ambient,
      deltaT: 3.6,
      neighborDeltaT: 3.1,
      anomalyScore: 92,
      classification: 'probable_infestation',
      confidence: 0.94,
      radiusMeter: 5.1,
      ndviAtLocation: 0.79,
      estimatedDaysSinceInfestation: 18,
      recommendation: 'Hög prioritet. Termisk anomali bekräftad i två på varandra följande flygningar. Planera upparbetning om inspektion bekräftar granbarkborre.',
    },
    {
      surveyId,
      location: { lat: 57.1819, lng: 15.2768 },
      crownTempC: 14.2,
      ambientTempC: ambient,
      deltaT: 2.9,
      neighborDeltaT: 2.5,
      anomalyScore: 78,
      classification: 'probable_infestation',
      confidence: 0.85,
      radiusMeter: 4.3,
      ndviAtLocation: 0.84,
      estimatedDaysSinceInfestation: 8,
      recommendation: 'Troligt tidigt angrepp. NDVI fortfarande normalt (0.84). Markera för uppföljning vid nästa flygning inom 7 dagar.',
    },
  ];

  probableInfestations.forEach((a, i) => {
    anomalies.push({ ...a, id: `ta-prob-${i + 1}` });
  });

  // 8 early stress detections
  const earlyStressLocations = [
    { lat: 57.1828, lng: 15.2735, deltaT: 1.4, neighborDeltaT: 1.1 },
    { lat: 57.1841, lng: 15.2749, deltaT: 1.7, neighborDeltaT: 1.3 },
    { lat: 57.1836, lng: 15.2762, deltaT: 1.2, neighborDeltaT: 0.9 },
    { lat: 57.1822, lng: 15.2744, deltaT: 1.9, neighborDeltaT: 1.5 },
    { lat: 57.1848, lng: 15.2731, deltaT: 1.3, neighborDeltaT: 1.0 },
    { lat: 57.1815, lng: 15.2758, deltaT: 1.6, neighborDeltaT: 1.2 },
    { lat: 57.1839, lng: 15.2773, deltaT: 1.1, neighborDeltaT: 0.8 },
    { lat: 57.1826, lng: 15.2752, deltaT: 1.8, neighborDeltaT: 1.4 },
  ];

  earlyStressLocations.forEach((loc, i) => {
    anomalies.push({
      id: `ta-stress-${i + 1}`,
      surveyId,
      location: { lat: loc.lat, lng: loc.lng },
      crownTempC: ambient + loc.deltaT,
      ambientTempC: ambient,
      deltaT: loc.deltaT,
      neighborDeltaT: loc.neighborDeltaT,
      anomalyScore: 30 + Math.round(loc.deltaT * 20),
      classification: 'early_stress',
      confidence: 0.72 + loc.deltaT * 0.05,
      radiusMeter: 3.5 + Math.random() * 2,
      ndviAtLocation: 0.85 + Math.random() * 0.05,
      estimatedDaysSinceInfestation: 0,
      recommendation: 'Bevaka. Stressnivån kan bero på torka, rotskador eller tidigt angrepp. Följ upp vid nästa flygning.',
    });
  });

  // 12 mild/borderline healthy — elevated but within normal variation
  for (let i = 0; i < 12; i++) {
    const deltaT = 0.5 + Math.random() * 0.5;
    anomalies.push({
      id: `ta-mild-${i + 1}`,
      surveyId,
      location: {
        lat: 57.1810 + Math.random() * 0.005,
        lng: 15.2720 + Math.random() * 0.006,
      },
      crownTempC: ambient + deltaT,
      ambientTempC: ambient,
      deltaT: parseFloat(deltaT.toFixed(2)),
      neighborDeltaT: parseFloat((deltaT * 0.7).toFixed(2)),
      anomalyScore: Math.round(deltaT * 25),
      classification: 'healthy',
      confidence: 0.65 + Math.random() * 0.1,
      radiusMeter: 3.0 + Math.random() * 2.5,
      estimatedDaysSinceInfestation: 0,
      recommendation: 'Inom normalvariation. Ingen åtgärd krävs.',
    });
  }

  return anomalies;
}

// ─── Demo Time Series (progressive warming over 3 surveys) ───

const DEMO_TIME_SERIES: ThermalTimeSeries = {
  treeId: 'tree-sml-1832',
  location: { lat: 57.1845, lng: 15.2756 },
  surveys: [
    {
      date: '2026-06-04',
      deltaT: 0.8,
      classification: 'healthy',
      ndviComparison: 0.86,
    },
    {
      date: '2026-06-11',
      deltaT: 1.9,
      classification: 'early_stress',
      ndviComparison: 0.84,
    },
    {
      date: '2026-06-18',
      deltaT: 3.6,
      classification: 'probable_infestation',
      ndviComparison: 0.79,
    },
  ],
  trend: 'rapid_warming',
  alertTriggered: true,
};

// ─── Demo Survey Plan ───

const DEMO_SURVEY_PLAN: ThermalSurveyPlan = {
  parcelId: 'p-smaland-0147',
  optimalDates: ['2026-06-25', '2026-06-27', '2026-07-02'],
  optimalTimeWindow: '02:00-05:00',
  moonPhase: 'Avtagande halvmåne',
  weatherSuitability: 88,
  requiredConditions: [
    'Klart eller lätt molnighet (ej regn senaste 24h)',
    'Vind under 3 m/s',
    'Omgivningstemperatur 8-18°C',
    'Relativ luftfuktighet 60-90%',
    'Ingen dimma eller dagg på kronan',
  ],
  estimatedCostSEK: 8750,
  coverageStrategy: 'Rutnätsmönster med 70% överlappning, 40m flyghöjd AGL, GSD ~5 cm. Börja i nordost (medvind) och flyg sydväst. Prioritera kanter mot senaste avverkning.',
};

// ─── Service Functions ───

/**
 * Retrieve and classify all thermal anomalies from a completed survey.
 */
export async function analyzeThermalSurvey(surveyId: string): Promise<{
  survey: ThermalSurvey;
  anomalies: ThermalAnomaly[];
  summary: {
    totalScanned: number;
    anomaliesDetected: number;
    probableInfestations: number;
    earlyStress: number;
    averageDeltaT: number;
    ndviMissRate: number;
  };
}> {
  await simulateLatency(400);

  if (surveyId !== DEMO_SURVEY.id) {
    return {
      survey: DEMO_SURVEY,
      anomalies: [],
      summary: {
        totalScanned: 0,
        anomaliesDetected: 0,
        probableInfestations: 0,
        earlyStress: 0,
        averageDeltaT: 0,
        ndviMissRate: 0,
      },
    };
  }

  const anomalies = buildDemoAnomalies();
  const probable = anomalies.filter(a => a.classification === 'probable_infestation');
  const earlyStress = anomalies.filter(a => a.classification === 'early_stress');

  // NDVI miss rate: how many probable infestations does NDVI still classify as healthy?
  const ndviMisses = probable.filter(a => a.ndviAtLocation !== undefined && a.ndviAtLocation > 0.7);
  const ndviMissRate = probable.length > 0 ? ndviMisses.length / probable.length : 0;

  const totalDeltaT = anomalies.reduce((sum, a) => sum + a.deltaT, 0);

  return {
    survey: DEMO_SURVEY,
    anomalies,
    summary: {
      totalScanned: DEMO_SURVEY.totalTrees,
      anomaliesDetected: anomalies.length,
      probableInfestations: probable.length,
      earlyStress: earlyStress.length,
      averageDeltaT: parseFloat((totalDeltaT / anomalies.length).toFixed(2)),
      ndviMissRate: parseFloat(ndviMissRate.toFixed(2)),
    },
  };
}

/**
 * Get temperature history for a single tree across multiple surveys.
 */
export async function getThermalTimeSeries(treeId: string): Promise<ThermalTimeSeries> {
  await simulateLatency(250);

  if (treeId === DEMO_TIME_SERIES.treeId) {
    return DEMO_TIME_SERIES;
  }

  // Return a stable healthy tree for any other ID
  return {
    treeId,
    location: { lat: 57.1830, lng: 15.2740 },
    surveys: [
      { date: '2026-06-04', deltaT: 0.3, classification: 'healthy', ndviComparison: 0.88 },
      { date: '2026-06-11', deltaT: 0.2, classification: 'healthy', ndviComparison: 0.87 },
      { date: '2026-06-18', deltaT: 0.4, classification: 'healthy', ndviComparison: 0.87 },
    ],
    trend: 'stable',
    alertTriggered: false,
  };
}

/**
 * Classify a single thermal reading based on delta-T, neighbor comparison,
 * humidity correction, and seasonal factor.
 */
export function classifyAnomaly(
  deltaT: number,
  neighborDeltaT: number,
  humidity: number,
  season: 'spring' | 'summer' | 'autumn' | 'winter'
): {
  classification: ThermalAnomaly['classification'];
  confidence: number;
  anomalyScore: number;
} {
  // Adjust delta-T for humidity (higher humidity suppresses evapotranspiration signal)
  const humidityCorrection = (humidity - 70) * HUMIDITY_CORRECTION_FACTOR;
  const seasonFactor = SEASON_FACTORS[season] ?? 1.0;

  const adjustedDeltaT = (deltaT - humidityCorrection) * seasonFactor;
  const weightedSignal = adjustedDeltaT * (1 - NEIGHBOR_DELTA_WEIGHT) + neighborDeltaT * NEIGHBOR_DELTA_WEIGHT;

  let classification: ThermalAnomaly['classification'];
  let confidence: number;

  if (weightedSignal >= DELTA_T_THRESHOLDS.confirmedInfestation.min) {
    classification = 'confirmed_infestation';
    confidence = Math.min(0.98, 0.85 + weightedSignal * 0.02);
  } else if (weightedSignal >= DELTA_T_THRESHOLDS.probableInfestation.min) {
    classification = 'probable_infestation';
    confidence = 0.75 + (weightedSignal - 2.5) * 0.1;
  } else if (weightedSignal >= DELTA_T_THRESHOLDS.earlyStress.min) {
    classification = 'early_stress';
    confidence = 0.55 + (weightedSignal - 1.0) * 0.15;
  } else {
    classification = 'healthy';
    confidence = 0.9 - weightedSignal * 0.3;
  }

  confidence = parseFloat(Math.max(0.1, Math.min(0.99, confidence)).toFixed(2));

  const anomalyScore = Math.round(Math.min(100, Math.max(0, weightedSignal * 25)));

  return { classification, confidence, anomalyScore };
}

/**
 * Generate an optimal survey plan for a parcel based on weather forecast data.
 */
export async function planThermalSurvey(
  parcelId: string,
  _forecastData?: unknown
): Promise<ThermalSurveyPlan> {
  await simulateLatency(300);

  // In production this would consume SMHI forecast + moon phase API.
  // For now, return the demo plan.
  return {
    ...DEMO_SURVEY_PLAN,
    parcelId,
  };
}

/**
 * Compare detection methods and their lead time advantages.
 */
export function compareDetectionMethods(): DetectionAdvantage[] {
  return [...THERMAL_DETECTION_INFO].sort((a, b) => b.detectionLeadDays - a.detectionLeadDays);
}

/**
 * Calculate economic value of early detection.
 * Catching infestations early allows salvage harvest before timber value drops
 * and prevents spread to neighboring trees.
 */
export function calculateEarlyDetectionValue(
  anomalies: ThermalAnomaly[],
  timberValueSEKPerM3: number
): {
  treesAtRisk: number;
  estimatedVolumeM3: number;
  valueSavedSEK: number;
  spreadPrevention: {
    neighborTreesProtected: number;
    additionalValueProtectedSEK: number;
  };
  detectionLeadWeeks: number;
  salvageWindowDays: number;
  roi: number;
} {
  const infested = anomalies.filter(
    a => a.classification === 'probable_infestation' || a.classification === 'confirmed_infestation'
  );

  const treesAtRisk = infested.length;

  // Average spruce: ~1.5 m³ per tree at typical Swedish forest density
  const avgVolumePerTree = 1.5;
  const estimatedVolumeM3 = treesAtRisk * avgVolumePerTree;

  // Without early detection, timber loses ~60% value (blue stain, drying)
  // With early detection, salvage harvest retains ~90% value
  const valueWithoutDetection = estimatedVolumeM3 * timberValueSEKPerM3 * 0.4;
  const valueWithDetection = estimatedVolumeM3 * timberValueSEKPerM3 * 0.9;
  const valueSavedSEK = Math.round(valueWithDetection - valueWithoutDetection);

  // Each infested tree can spread to ~15 neighbors over a season if untreated
  const spreadFactor = 15;
  const neighborTreesProtected = treesAtRisk * spreadFactor;
  const additionalValueProtectedSEK = Math.round(
    neighborTreesProtected * avgVolumePerTree * timberValueSEKPerM3 * 0.5
  );

  // Average lead time: 38 days ≈ 5.4 weeks
  const detectionLeadWeeks = 5.4;
  // Salvage window before quality loss
  const salvageWindowDays = 21;

  // ROI: value saved / survey cost
  const surveyCost = DEMO_SURVEY.coverageAreaHa * 250;
  const totalValueSaved = valueSavedSEK + additionalValueProtectedSEK;
  const roi = surveyCost > 0 ? parseFloat((totalValueSaved / surveyCost).toFixed(1)) : 0;

  return {
    treesAtRisk,
    estimatedVolumeM3,
    valueSavedSEK,
    spreadPrevention: {
      neighborTreesProtected,
      additionalValueProtectedSEK,
    },
    detectionLeadWeeks,
    salvageWindowDays,
    roi,
  };
}

// ─── Helpers ───

function simulateLatency(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

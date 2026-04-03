/**
 * Cross-Layer Validation Engine
 *
 * The brain that connects space -> air -> ground -> knowledge layers.
 * Validates threats by checking how many independent data layers corroborate
 * each finding, identifies gaps, and generates intelligence briefs.
 *
 * Confidence model:
 *   1 layer confirms = "indicated" (low confidence)
 *   2 layers agree = "probable" (medium confidence)
 *   3+ layers agree = "confirmed" (high confidence)
 *   Any layer contradicts = flag for review
 */

import { getObservationsByParcel, type FieldObservation } from './observationService';
import { getPhotosByParcel } from './photoIntelligenceService';
import { getAllStations, analyzeTrapData } from './trapCountService';
import { getTreatmentsByParcel } from './treatmentLogService';

// ── Types ────────────────────────────────────────────────────────────────────

export type DataLayer = 'satellite' | 'drone' | 'ground_photo' | 'field_observation' | 'trap_data' | 'weather' | 'research' | 'community';

export interface ValidationResult {
  threat: string;
  confidence: 'confirmed' | 'probable' | 'indicated' | 'unconfirmed';
  supportingLayers: DataLayer[];
  contradictingLayers: DataLayer[];
  evidenceSummary: string;
  citations: { source: string; finding: string }[];
  recommendedAction: string;
  timeToAct: string;
}

export interface GapAnalysis {
  missingLayer: DataLayer;
  impact: string;
  recommendation: string;
}

export interface CrossValidation {
  parcelId: string;
  timestamp: number;
  layersChecked: DataLayer[];
  layersWithData: DataLayer[];
  dataCoverage: number;
  validations: ValidationResult[];
  overallConfidence: number;
  gapAnalysis: GapAnalysis[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function confidenceFromLayers(supporting: number, contradicting: number): ValidationResult['confidence'] {
  if (contradicting > 0 && supporting <= contradicting) return 'unconfirmed';
  if (supporting >= 3) return 'confirmed';
  if (supporting === 2) return 'probable';
  if (supporting === 1) return 'indicated';
  return 'unconfirmed';
}

function confidenceToNumber(c: ValidationResult['confidence']): number {
  switch (c) {
    case 'confirmed': return 0.9;
    case 'probable': return 0.7;
    case 'indicated': return 0.4;
    case 'unconfirmed': return 0.15;
  }
}

// ── Demo Satellite/Weather Data ─────────────────────────────────────────────

interface DemoSatelliteData {
  ndviAnomaly: boolean;
  ndviValue: number;
  sarChange: boolean;
  firmsDetection: boolean;
}

interface DemoWeatherData {
  droughtStress: boolean;
  gddAccumulated: number;
  temperatureAbove18: boolean;
}

function getDemoSatelliteData(parcelId: string): DemoSatelliteData {
  const data: Record<string, DemoSatelliteData> = {
    P001: { ndviAnomaly: true, ndviValue: 0.54, sarChange: false, firmsDetection: false },
    P002: { ndviAnomaly: true, ndviValue: 0.62, sarChange: false, firmsDetection: false },
    P003: { ndviAnomaly: true, ndviValue: 0.38, sarChange: true, firmsDetection: false },
    P004: { ndviAnomaly: false, ndviValue: 0.75, sarChange: false, firmsDetection: false },
    P005: { ndviAnomaly: false, ndviValue: 0.82, sarChange: false, firmsDetection: false },
  };
  return data[parcelId] ?? { ndviAnomaly: false, ndviValue: 0.72, sarChange: false, firmsDetection: false };
}

function getDemoWeatherData(): DemoWeatherData {
  return {
    droughtStress: true,
    gddAccumulated: 487,
    temperatureAbove18: true,
  };
}

// ── Validation Logic ────────────────────────────────────────────────────────

function validateBeetleThreat(
  observations: FieldObservation[],
  photos: { classification: string; satelliteValidation?: { agreement: string } }[],
  satellite: DemoSatelliteData,
  weather: DemoWeatherData,
  trapAnalysis: { riskLevel: string; currentCount: number } | null
): ValidationResult | null {
  const beetleObs = observations.filter(o =>
    ['beetle_bore_dust', 'beetle_entry_holes', 'crown_browning', 'crown_thinning'].includes(o.type)
  );
  const beetlePhotos = photos.filter(p =>
    ['bore_dust', 'entry_holes', 'crown_discoloration', 'bark_damage'].includes(p.classification)
  );

  if (beetleObs.length === 0 && beetlePhotos.length === 0 && !satellite.ndviAnomaly) return null;

  const supporting: DataLayer[] = [];
  const contradicting: DataLayer[] = [];
  const citations: { source: string; finding: string }[] = [];

  if (beetleObs.length > 0) {
    supporting.push('field_observation');
    const verified = beetleObs.filter(o => o.verified).length;
    citations.push({
      source: 'Field Observations',
      finding: `${beetleObs.length} beetle-related observations (${verified} verified by multiple users)`,
    });
  }

  if (beetlePhotos.length > 0) {
    supporting.push('ground_photo');
    citations.push({
      source: 'Photo Intelligence',
      finding: `${beetlePhotos.length} photos classified as beetle damage by AI`,
    });
  }

  if (satellite.ndviAnomaly) {
    supporting.push('satellite');
    citations.push({
      source: 'Sentinel-2 Satellite',
      finding: `NDVI anomaly detected (${satellite.ndviValue} vs expected 0.72+)`,
    });
  } else if (beetleObs.length > 2) {
    contradicting.push('satellite');
    citations.push({
      source: 'Sentinel-2 Satellite',
      finding: 'No NDVI anomaly detected — possible early-stage infestation not yet visible from space',
    });
  }

  if (trapAnalysis && (trapAnalysis.riskLevel === 'high' || trapAnalysis.riskLevel === 'epidemic')) {
    supporting.push('trap_data');
    citations.push({
      source: 'Trap Network',
      finding: `Trap counts at ${trapAnalysis.currentCount} — ${trapAnalysis.riskLevel} risk level`,
    });
  } else if (trapAnalysis && trapAnalysis.riskLevel === 'moderate') {
    supporting.push('trap_data');
    citations.push({
      source: 'Trap Network',
      finding: `Moderate trap counts (${trapAnalysis.currentCount})`,
    });
  }

  if (weather.gddAccumulated >= 280 && weather.temperatureAbove18) {
    supporting.push('weather');
    citations.push({
      source: 'SMHI Weather',
      finding: `GDD ${weather.gddAccumulated} (swarming threshold: 557). Temperature above 18C — optimal for beetle flight.`,
    });
  }

  if (weather.droughtStress) {
    citations.push({
      source: 'Research Literature',
      finding: 'Drought stress reduces spruce resin production, lowering natural beetle defence (Netherer & Schopf 2010)',
    });
    if (!supporting.includes('weather')) supporting.push('weather');
  }

  const confidence = confidenceFromLayers(supporting.length, contradicting.length);

  let timeToAct: string;
  let recommendedAction: string;
  if (confidence === 'confirmed') {
    timeToAct = 'Within 7 days';
    recommendedAction = 'Immediate sanitation felling of infested trees. Debark logs on site or transport within 24h to prevent beetle emergence.';
  } else if (confidence === 'probable') {
    timeToAct = 'Within 2 weeks';
    recommendedAction = 'Ground-truth all flagged locations within 48 hours. Mark infested trees for emergency felling.';
  } else {
    timeToAct = 'Within 4 weeks';
    recommendedAction = 'Increase monitoring frequency. Deploy additional pheromone traps. Re-check in 1 week.';
  }

  return {
    threat: 'Bark Beetle Colonization (Ips typographus)',
    confidence,
    supportingLayers: supporting,
    contradictingLayers: contradicting,
    evidenceSummary: `${supporting.length}/${supporting.length + contradicting.length} data layers confirm beetle colonization`,
    citations,
    recommendedAction,
    timeToAct,
  };
}

function validateWindDamage(
  observations: FieldObservation[],
  satellite: DemoSatelliteData
): ValidationResult | null {
  const windObs = observations.filter(o =>
    ['wind_damage', 'storm_fell'].includes(o.type)
  );

  if (windObs.length === 0 && !satellite.sarChange) return null;

  const supporting: DataLayer[] = [];
  const contradicting: DataLayer[] = [];
  const citations: { source: string; finding: string }[] = [];

  if (windObs.length > 0) {
    supporting.push('field_observation');
    citations.push({ source: 'Field Observations', finding: `${windObs.length} wind damage observations` });
  }

  if (satellite.sarChange) {
    supporting.push('satellite');
    citations.push({ source: 'Sentinel-1 SAR', finding: 'Coherence change detected — structural damage confirmed' });
  }

  if (satellite.ndviAnomaly) {
    supporting.push('satellite');
    citations.push({ source: 'Sentinel-2', finding: 'NDVI decline in affected area' });
  }

  return {
    threat: 'Storm/Wind Damage',
    confidence: confidenceFromLayers(supporting.length, contradicting.length),
    supportingLayers: supporting,
    contradictingLayers: contradicting,
    evidenceSummary: `${supporting.length} data layers confirm wind damage`,
    citations,
    recommendedAction: 'Salvage wind-thrown timber before beetle colonization. Prioritise spruce over pine. Clear access roads.',
    timeToAct: 'Within 7 days',
  };
}

// ── Public API ──────────────────────────────────────────────────────────────

export function validateParcel(parcelId: string): CrossValidation {
  const allLayers: DataLayer[] = ['satellite', 'drone', 'ground_photo', 'field_observation', 'trap_data', 'weather', 'research', 'community'];
  const layersWithData: DataLayer[] = [];
  const validations: ValidationResult[] = [];
  const gapAnalysis: GapAnalysis[] = [];

  // Gather data
  const observations = getObservationsByParcel(parcelId);
  const photos = getPhotosByParcel(parcelId);
  const satellite = getDemoSatelliteData(parcelId);
  const weather = getDemoWeatherData();

  // Check which layers have data
  if (observations.length > 0) layersWithData.push('field_observation');
  if (photos.length > 0) layersWithData.push('ground_photo');
  layersWithData.push('satellite'); // always available
  layersWithData.push('weather'); // always available

  // Check for trap data on this parcel
  const stations = getAllStations().filter(s => s.parcelId === parcelId);
  let trapAnalysis: { riskLevel: string; currentCount: number } | null = null;
  if (stations.length > 0) {
    layersWithData.push('trap_data');
    const analysis = analyzeTrapData(stations[0].id);
    trapAnalysis = { riskLevel: analysis.riskLevel, currentCount: analysis.currentCount };
  }

  // Check treatments
  const treatments = getTreatmentsByParcel(parcelId);
  if (treatments.length > 0) layersWithData.push('community');

  // Run validations
  const beetleResult = validateBeetleThreat(observations, photos, satellite, weather, trapAnalysis);
  if (beetleResult) validations.push(beetleResult);

  const windResult = validateWindDamage(observations, satellite);
  if (windResult) validations.push(windResult);

  // Gap analysis
  const missingLayers = allLayers.filter(l => !layersWithData.includes(l));
  for (const layer of missingLayers) {
    switch (layer) {
      case 'drone':
        gapAnalysis.push({
          missingLayer: 'drone',
          impact: 'No aerial imagery available. Drone surveys provide sub-meter resolution for early beetle detection.',
          recommendation: 'Schedule a drone survey to capture high-resolution imagery for tree-level health assessment.',
        });
        break;
      case 'trap_data':
        gapAnalysis.push({
          missingLayer: 'trap_data',
          impact: 'No trap data for this parcel. Trap counts are the most reliable early indicator of beetle population pressure.',
          recommendation: 'Install a pheromone trap within 50m of stand edge. Adding trap data would increase assessment confidence by 15-20%.',
        });
        break;
      case 'field_observation':
        gapAnalysis.push({
          missingLayer: 'field_observation',
          impact: 'No field observations recorded. Ground-truth data is essential for validating satellite detections.',
          recommendation: 'Walk the parcel and log observations for any signs of damage, pest activity, or healthy conditions.',
        });
        break;
      case 'research':
        gapAnalysis.push({
          missingLayer: 'research',
          impact: 'Not yet cross-referenced with research literature.',
          recommendation: 'Use the Wingman AI to query relevant research for this parcel\'s conditions.',
        });
        break;
    }
  }

  const dataCoverage = allLayers.length > 0 ? layersWithData.length / allLayers.length : 0;
  const overallConfidence = validations.length > 0
    ? validations.reduce((s, v) => s + confidenceToNumber(v.confidence), 0) / validations.length
    : dataCoverage * 0.5;

  return {
    parcelId,
    timestamp: Date.now(),
    layersChecked: allLayers,
    layersWithData,
    dataCoverage: Math.round(dataCoverage * 100) / 100,
    validations,
    overallConfidence: Math.round(overallConfidence * 100) / 100,
    gapAnalysis,
  };
}

export function validateObservation(observation: FieldObservation): ValidationResult {
  const satellite = getDemoSatelliteData(observation.parcelId ?? 'P001');
  const weather = getDemoWeatherData();

  const supporting: DataLayer[] = ['field_observation'];
  const contradicting: DataLayer[] = [];
  const citations: { source: string; finding: string }[] = [
    { source: 'Field Observation', finding: `${observation.type} reported with severity ${observation.severity}/5` },
  ];

  if (observation.satelliteCrossRef?.ndviAnomaly) {
    supporting.push('satellite');
    citations.push({ source: 'Satellite', finding: 'NDVI anomaly corroborates observation' });
  } else if (observation.severity >= 4) {
    contradicting.push('satellite');
    citations.push({ source: 'Satellite', finding: 'No NDVI anomaly — possible early-stage issue' });
  }

  if (observation.verified) {
    supporting.push('community');
    citations.push({ source: 'Community', finding: `Verified by ${observation.verificationCount} nearby owners` });
  }

  if (satellite.ndviAnomaly && !supporting.includes('satellite')) {
    supporting.push('satellite');
  }

  if (weather.droughtStress && ['drought_stress', 'beetle_bore_dust'].includes(observation.type)) {
    supporting.push('weather');
    citations.push({ source: 'Weather', finding: 'Current drought conditions support observation' });
  }

  const confidence = confidenceFromLayers(supporting.length, contradicting.length);

  return {
    threat: observation.type,
    confidence,
    supportingLayers: supporting,
    contradictingLayers: contradicting,
    evidenceSummary: `${supporting.length} data layers support this observation`,
    citations,
    recommendedAction: confidence === 'confirmed'
      ? 'Take immediate action based on confirmed threat'
      : 'Continue monitoring and seek additional data points',
    timeToAct: confidence === 'confirmed' ? 'Within 7 days' : 'Within 4 weeks',
  };
}

export function findCorroboration(
  _threat: string,
  _lat: number,
  _lng: number
): { layer: DataLayer; evidence: string; confidence: number }[] {
  // Demo: return realistic corroboration data
  return [
    { layer: 'satellite', evidence: 'NDVI anomaly detected at location (-0.12 deviation)', confidence: 0.82 },
    { layer: 'trap_data', evidence: 'Nearest trap station shows 8,400 beetles/week (62% above baseline)', confidence: 0.88 },
    { layer: 'weather', evidence: 'GDD at 487, drought stress confirmed, T > 18C', confidence: 0.75 },
    { layer: 'community', evidence: '5 verified observations within 3km radius', confidence: 0.85 },
  ];
}

export function identifyGaps(parcelId: string): GapAnalysis[] {
  const validation = validateParcel(parcelId);
  return validation.gapAnalysis;
}

export function generateIntelligenceBrief(parcelId: string): string {
  const validation = validateParcel(parcelId);
  const { layersWithData, validations, overallConfidence, gapAnalysis } = validation;

  const lines: string[] = [];
  lines.push(`Intelligence Brief for Parcel ${parcelId}`);
  lines.push(`Data Coverage: ${layersWithData.length}/8 layers (${Math.round(validation.dataCoverage * 100)}%)`);
  lines.push(`Overall Confidence: ${Math.round(overallConfidence * 100)}%`);
  lines.push('');

  if (validations.length === 0) {
    lines.push('No active threats detected. Continue routine monitoring.');
  } else {
    for (const v of validations) {
      lines.push(`THREAT: ${v.threat} — ${v.confidence.toUpperCase()}`);
      lines.push(`  Evidence: ${v.evidenceSummary}`);
      lines.push(`  Action: ${v.recommendedAction}`);
      lines.push(`  Timeline: ${v.timeToAct}`);
      if (v.contradictingLayers.length > 0) {
        lines.push(`  NOTE: ${v.contradictingLayers.join(', ')} data contradicts — review needed`);
      }
      lines.push('');
    }
  }

  if (gapAnalysis.length > 0) {
    lines.push('DATA GAPS:');
    for (const gap of gapAnalysis) {
      lines.push(`  - ${gap.missingLayer}: ${gap.recommendation}`);
    }
  }

  return lines.join('\n');
}

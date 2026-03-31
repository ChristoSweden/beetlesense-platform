/**
 * Enriched survey results for demo parcels.
 * Extends the basic DemoSurvey in lib/demoData.ts with detailed
 * flight paths, image counts, analysis results, and detection data.
 *
 * 5 completed surveys + 1 in progress (partial results).
 */

import type { AnalysisModule } from '@/lib/demoData';

// ─── Types ───

export interface FlightWaypoint {
  lng: number;
  lat: number;
  altitudeM: number;
  /** Heading in degrees (0=N, 90=E) */
  heading: number;
}

export interface FlightPath {
  /** Planned grid pattern waypoints */
  waypoints: FlightWaypoint[];
  /** Total distance in meters */
  distanceM: number;
  /** Flight duration in seconds */
  durationSec: number;
  /** Average ground speed m/s */
  avgSpeedMs: number;
  /** Overlap percentage */
  overlapPct: number;
  /** Ground sample distance in cm/px */
  gsdCmPx: number;
}

export type DetectionClass =
  | 'healthy'
  | 'stress_early'
  | 'stress_moderate'
  | 'infested_active'
  | 'infested_old'
  | 'dead_standing';

export interface BeetleDetectionZone {
  id: string;
  center: [number, number]; // [lng, lat]
  /** Approximate radius of affected area in meters */
  radiusM: number;
  detectionClass: DetectionClass;
  /** Number of affected trees in this zone */
  treeCount: number;
  /** Confidence 0-1 */
  confidence: number;
  /** Sub-stand this zone belongs to */
  standLabel: string;
}

export interface StandHealthClassification {
  standId: string;
  standLabel: string;
  /** Overall health 0-100 */
  healthScore: number;
  /** Dominant health class */
  dominantClass: DetectionClass;
  /** Breakdown by detection class */
  classDistribution: Record<DetectionClass, number>;
  /** Canopy cover percentage */
  canopyCoverPct: number;
  /** Mean NDVI from drone imagery */
  droneNdviMean: number;
}

export interface VolumeEstimate {
  species: string;
  /** Standing volume in m3sk (m3 skog) */
  volumeM3sk: number;
  /** Sawlog fraction */
  sawlogRatio: number;
  /** Pulpwood fraction */
  pulpRatio: number;
  /** Mean height in meters */
  meanHeightM: number;
  /** Mean DBH in cm */
  meanDbhCm: number;
  /** Stems per hectare */
  stemsPerHa: number;
}

export interface SurveyAnalysisResults {
  /** Total tree count */
  treeCount: number;
  /** Species identified */
  speciesCount: number;
  /** Beetle detection zones (only for beetle surveys) */
  beetleZones: BeetleDetectionZone[];
  /** Per-stand health classification */
  standHealth: StandHealthClassification[];
  /** Volume estimates by species */
  volumeEstimates: VolumeEstimate[];
  /** Overall infestation severity */
  overallSeverity: 'none' | 'low' | 'moderate' | 'severe';
  /** Percentage of parcel area affected */
  affectedAreaPct: number;
  /** Processing metadata */
  processingTimeSec: number;
  modelVersion: string;
}

export interface EnrichedSurvey {
  id: string;
  name: string;
  parcelId: string;
  parcelName: string;
  modules: AnalysisModule[];
  status: 'draft' | 'processing' | 'complete' | 'failed';
  priority: 'standard' | 'priority';
  createdAt: string;
  completedAt: string | null;
  /** Flight data */
  flight: FlightPath | null;
  /** Total images captured */
  imageCount: number;
  /** Analysis results (null if not complete) */
  results: SurveyAnalysisResults | null;
  /** Human-readable summary */
  summary: string | null;
}

// ─── Survey Data ───

/**
 * s1: Spring Beetle Assessment — Norra Skogen (p1)
 * Complete. Moderate beetle activity in NE sector.
 */
const s1SpringBeetle: EnrichedSurvey = {
  id: 's1',
  name: 'Spring Beetle Assessment',
  parcelId: 'p1',
  parcelName: 'Norra Skogen',
  modules: ['bark_beetle', 'tree_health', 'vegetation_index'],
  status: 'complete',
  priority: 'priority',
  createdAt: '2026-03-05T08:00:00Z',
  completedAt: '2026-03-06T14:30:00Z',
  flight: {
    waypoints: [
      { lng: 14.024, lat: 57.198, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.198, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.195, altitudeM: 80, heading: 270 },
      { lng: 14.024, lat: 57.195, altitudeM: 80, heading: 270 },
      { lng: 14.024, lat: 57.192, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.192, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.189, altitudeM: 80, heading: 270 },
      { lng: 14.024, lat: 57.189, altitudeM: 80, heading: 270 },
      { lng: 14.024, lat: 57.186, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.186, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.183, altitudeM: 80, heading: 270 },
      { lng: 14.024, lat: 57.183, altitudeM: 80, heading: 270 },
      { lng: 14.024, lat: 57.180, altitudeM: 80, heading: 90 },
      { lng: 14.056, lat: 57.180, altitudeM: 80, heading: 90 },
    ],
    distanceM: 18400,
    durationSec: 2760,
    avgSpeedMs: 6.7,
    overlapPct: 75,
    gsdCmPx: 2.1,
  },
  imageCount: 1842,
  results: {
    treeCount: 3240,
    speciesCount: 3,
    beetleZones: [
      {
        id: 'bz-1', center: [14.045, 57.195], radiusM: 85,
        detectionClass: 'stress_moderate', treeCount: 42, confidence: 0.87,
        standLabel: 'Avd. 2',
      },
      {
        id: 'bz-2', center: [14.048, 57.192], radiusM: 45,
        detectionClass: 'stress_early', treeCount: 18, confidence: 0.74,
        standLabel: 'Avd. 2',
      },
      {
        id: 'bz-3', center: [14.042, 57.198], radiusM: 30,
        detectionClass: 'stress_early', treeCount: 12, confidence: 0.68,
        standLabel: 'Avd. 1',
      },
    ],
    standHealth: [
      {
        standId: 'p1-s1', standLabel: 'Avd. 1', healthScore: 78,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.85, stress_early: 0.10, stress_moderate: 0.03, infested_active: 0, infested_old: 0.02, dead_standing: 0 },
        canopyCoverPct: 82, droneNdviMean: 0.74,
      },
      {
        standId: 'p1-s2', standLabel: 'Avd. 2', healthScore: 62,
        dominantClass: 'stress_moderate',
        classDistribution: { healthy: 0.55, stress_early: 0.20, stress_moderate: 0.18, infested_active: 0.05, infested_old: 0.02, dead_standing: 0 },
        canopyCoverPct: 75, droneNdviMean: 0.62,
      },
      {
        standId: 'p1-s3', standLabel: 'Avd. 3', healthScore: 85,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.92, stress_early: 0.05, stress_moderate: 0.02, infested_active: 0, infested_old: 0.01, dead_standing: 0 },
        canopyCoverPct: 78, droneNdviMean: 0.76,
      },
      {
        standId: 'p1-s4', standLabel: 'Avd. 4', healthScore: 88,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.94, stress_early: 0.04, stress_moderate: 0.01, infested_active: 0, infested_old: 0, dead_standing: 0.01 },
        canopyCoverPct: 84, droneNdviMean: 0.78,
      },
      {
        standId: 'p1-s5', standLabel: 'Avd. 5', healthScore: 80,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.88, stress_early: 0.08, stress_moderate: 0.03, infested_active: 0, infested_old: 0, dead_standing: 0.01 },
        canopyCoverPct: 70, droneNdviMean: 0.71,
      },
    ],
    volumeEstimates: [
      { species: 'Spruce', volumeM3sk: 1850, sawlogRatio: 0.62, pulpRatio: 0.38, meanHeightM: 22.5, meanDbhCm: 28, stemsPerHa: 520 },
      { species: 'Pine', volumeM3sk: 680, sawlogRatio: 0.58, pulpRatio: 0.42, meanHeightM: 20.8, meanDbhCm: 26, stemsPerHa: 310 },
      { species: 'Birch', volumeM3sk: 210, sawlogRatio: 0.25, pulpRatio: 0.75, meanHeightM: 16.4, meanDbhCm: 18, stemsPerHa: 180 },
    ],
    overallSeverity: 'moderate',
    affectedAreaPct: 8.5,
    processingTimeSec: 4320,
    modelVersion: 'beetlesense-v2.3.1',
  },
  summary: 'Moderate bark beetle activity detected in northeast sector (Avd. 2). 72 trees showing stress signs, 42 with moderate crown discoloration. 3,240 trees counted. Species: 65% spruce, 25% pine, 10% birch. Recommend targeted pheromone traps and follow-up drone survey in 3 weeks.',
};

/**
 * s2: Q1 Health Check — Ekbacken (p2)
 * Complete. Forest is healthy.
 */
const s2HealthCheck: EnrichedSurvey = {
  id: 's2',
  name: 'Q1 Health Check',
  parcelId: 'p2',
  parcelName: 'Ekbacken',
  modules: ['bark_beetle', 'vegetation_index'],
  status: 'complete',
  priority: 'standard',
  createdAt: '2026-03-10T10:00:00Z',
  completedAt: '2026-03-12T09:15:00Z',
  flight: {
    waypoints: [
      { lng: 13.520, lat: 57.306, altitudeM: 90, heading: 90 },
      { lng: 13.544, lat: 57.306, altitudeM: 90, heading: 90 },
      { lng: 13.544, lat: 57.302, altitudeM: 90, heading: 270 },
      { lng: 13.520, lat: 57.302, altitudeM: 90, heading: 270 },
      { lng: 13.520, lat: 57.298, altitudeM: 90, heading: 90 },
      { lng: 13.544, lat: 57.298, altitudeM: 90, heading: 90 },
    ],
    distanceM: 7200,
    durationSec: 1080,
    avgSpeedMs: 6.7,
    overlapPct: 75,
    gsdCmPx: 2.4,
  },
  imageCount: 726,
  results: {
    treeCount: 1480,
    speciesCount: 3,
    beetleZones: [],
    standHealth: [
      {
        standId: 'p2-s1', standLabel: 'Avd. 1', healthScore: 92,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.96, stress_early: 0.03, stress_moderate: 0.01, infested_active: 0, infested_old: 0, dead_standing: 0 },
        canopyCoverPct: 85, droneNdviMean: 0.81,
      },
      {
        standId: 'p2-s2', standLabel: 'Avd. 2', healthScore: 89,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.93, stress_early: 0.05, stress_moderate: 0.01, infested_active: 0, infested_old: 0, dead_standing: 0.01 },
        canopyCoverPct: 80, droneNdviMean: 0.78,
      },
      {
        standId: 'p2-s3', standLabel: 'Avd. 3', healthScore: 86,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.90, stress_early: 0.06, stress_moderate: 0.03, infested_active: 0, infested_old: 0, dead_standing: 0.01 },
        canopyCoverPct: 82, droneNdviMean: 0.76,
      },
    ],
    volumeEstimates: [
      { species: 'Oak', volumeM3sk: 420, sawlogRatio: 0.70, pulpRatio: 0.30, meanHeightM: 18.2, meanDbhCm: 32, stemsPerHa: 120 },
      { species: 'Birch', volumeM3sk: 280, sawlogRatio: 0.30, pulpRatio: 0.70, meanHeightM: 15.8, meanDbhCm: 20, stemsPerHa: 250 },
      { species: 'Spruce', volumeM3sk: 190, sawlogRatio: 0.60, pulpRatio: 0.40, meanHeightM: 20.5, meanDbhCm: 24, stemsPerHa: 180 },
    ],
    overallSeverity: 'none',
    affectedAreaPct: 0,
    processingTimeSec: 2100,
    modelVersion: 'beetlesense-v2.3.1',
  },
  summary: 'No bark beetle activity detected. Forest health is excellent across all stands. Oak regeneration progressing well in Avd. 1. Canopy cover averaging 82%. Recommend routine monitoring — next survey suggested for June.',
};

/**
 * s3: Emergency Infestation Survey — Granudden (p4)
 * Complete. Severe infestation confirmed.
 */
const s3Emergency: EnrichedSurvey = {
  id: 's3',
  name: 'Emergency Infestation Survey',
  parcelId: 'p4',
  parcelName: 'Granudden',
  modules: ['bark_beetle', 'tree_health', 'boundary_survey'],
  status: 'complete',
  priority: 'priority',
  createdAt: '2026-03-01T06:00:00Z',
  completedAt: '2026-03-02T18:00:00Z',
  flight: {
    waypoints: [
      { lng: 14.088, lat: 57.228, altitudeM: 70, heading: 90 },
      { lng: 14.122, lat: 57.228, altitudeM: 70, heading: 90 },
      { lng: 14.122, lat: 57.224, altitudeM: 70, heading: 270 },
      { lng: 14.088, lat: 57.224, altitudeM: 70, heading: 270 },
      { lng: 14.088, lat: 57.220, altitudeM: 70, heading: 90 },
      { lng: 14.122, lat: 57.220, altitudeM: 70, heading: 90 },
      { lng: 14.122, lat: 57.216, altitudeM: 70, heading: 270 },
      { lng: 14.088, lat: 57.216, altitudeM: 70, heading: 270 },
      { lng: 14.088, lat: 57.212, altitudeM: 70, heading: 90 },
      { lng: 14.122, lat: 57.212, altitudeM: 70, heading: 90 },
    ],
    distanceM: 14600,
    durationSec: 2190,
    avgSpeedMs: 6.7,
    overlapPct: 80,
    gsdCmPx: 1.8,
  },
  imageCount: 2184,
  results: {
    treeCount: 2810,
    speciesCount: 2,
    beetleZones: [
      {
        id: 'bz-g1', center: [14.108, 57.222], radiusM: 120,
        detectionClass: 'infested_active', treeCount: 185, confidence: 0.94,
        standLabel: 'Avd. 3',
      },
      {
        id: 'bz-g2', center: [14.112, 57.218], radiusM: 95,
        detectionClass: 'infested_active', treeCount: 132, confidence: 0.91,
        standLabel: 'Avd. 3',
      },
      {
        id: 'bz-g3', center: [14.103, 57.225], radiusM: 70,
        detectionClass: 'stress_moderate', treeCount: 65, confidence: 0.86,
        standLabel: 'Avd. 1',
      },
      {
        id: 'bz-g4', center: [14.116, 57.226], radiusM: 55,
        detectionClass: 'infested_old', treeCount: 38, confidence: 0.89,
        standLabel: 'Avd. 2',
      },
    ],
    standHealth: [
      {
        standId: 'p4-s1', standLabel: 'Avd. 1', healthScore: 55,
        dominantClass: 'stress_moderate',
        classDistribution: { healthy: 0.42, stress_early: 0.15, stress_moderate: 0.25, infested_active: 0.10, infested_old: 0.05, dead_standing: 0.03 },
        canopyCoverPct: 65, droneNdviMean: 0.52,
      },
      {
        standId: 'p4-s2', standLabel: 'Avd. 2', healthScore: 48,
        dominantClass: 'infested_old',
        classDistribution: { healthy: 0.35, stress_early: 0.10, stress_moderate: 0.15, infested_active: 0.15, infested_old: 0.18, dead_standing: 0.07 },
        canopyCoverPct: 58, droneNdviMean: 0.45,
      },
      {
        standId: 'p4-s3', standLabel: 'Avd. 3', healthScore: 28,
        dominantClass: 'infested_active',
        classDistribution: { healthy: 0.15, stress_early: 0.08, stress_moderate: 0.12, infested_active: 0.38, infested_old: 0.15, dead_standing: 0.12 },
        canopyCoverPct: 42, droneNdviMean: 0.31,
      },
      {
        standId: 'p4-s4', standLabel: 'Avd. 4', healthScore: 68,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.65, stress_early: 0.18, stress_moderate: 0.10, infested_active: 0.05, infested_old: 0.02, dead_standing: 0 },
        canopyCoverPct: 72, droneNdviMean: 0.64,
      },
      {
        standId: 'p4-s5', standLabel: 'Avd. 5', healthScore: 82,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.88, stress_early: 0.08, stress_moderate: 0.03, infested_active: 0, infested_old: 0, dead_standing: 0.01 },
        canopyCoverPct: 76, droneNdviMean: 0.74,
      },
    ],
    volumeEstimates: [
      { species: 'Spruce', volumeM3sk: 2150, sawlogRatio: 0.55, pulpRatio: 0.45, meanHeightM: 23.8, meanDbhCm: 30, stemsPerHa: 480 },
      { species: 'Pine', volumeM3sk: 260, sawlogRatio: 0.52, pulpRatio: 0.48, meanHeightM: 19.5, meanDbhCm: 24, stemsPerHa: 140 },
    ],
    overallSeverity: 'severe',
    affectedAreaPct: 34,
    processingTimeSec: 5400,
    modelVersion: 'beetlesense-v2.3.1',
  },
  summary: 'Severe bark beetle infestation confirmed. ~420 trees affected (34% of spruce stands). Active infestation concentrated in Avd. 3 (317 trees) with spread into Avd. 1 and 2. Estimated 8.8 ha actively affected. Immediate intervention recommended: salvage logging in Avd. 3, pheromone traps on perimeter, sanitation felling of dead standing trees in Avd. 2. Risk of further spread to neighboring Norra Skogen if untreated.',
};

/**
 * s6: Mossebacken Recovery Survey (p6)
 * Complete. Post-thinning monitoring shows healthy recovery.
 */
const s6Recovery: EnrichedSurvey = {
  id: 's6',
  name: 'Post-Thinning Recovery Survey',
  parcelId: 'p6',
  parcelName: 'Mossebacken',
  modules: ['tree_health', 'vegetation_index'],
  status: 'complete',
  priority: 'standard',
  createdAt: '2026-02-20T09:00:00Z',
  completedAt: '2026-02-22T11:30:00Z',
  flight: {
    waypoints: [
      { lng: 14.550, lat: 56.908, altitudeM: 85, heading: 90 },
      { lng: 14.578, lat: 56.908, altitudeM: 85, heading: 90 },
      { lng: 14.578, lat: 56.904, altitudeM: 85, heading: 270 },
      { lng: 14.550, lat: 56.904, altitudeM: 85, heading: 270 },
      { lng: 14.550, lat: 56.900, altitudeM: 85, heading: 90 },
      { lng: 14.578, lat: 56.900, altitudeM: 85, heading: 90 },
      { lng: 14.578, lat: 56.896, altitudeM: 85, heading: 270 },
      { lng: 14.550, lat: 56.896, altitudeM: 85, heading: 270 },
    ],
    distanceM: 9800,
    durationSec: 1470,
    avgSpeedMs: 6.7,
    overlapPct: 75,
    gsdCmPx: 2.2,
  },
  imageCount: 982,
  results: {
    treeCount: 1650,
    speciesCount: 3,
    beetleZones: [],
    standHealth: [
      {
        standId: 'p6-s1', standLabel: 'Avd. 1', healthScore: 75,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.80, stress_early: 0.12, stress_moderate: 0.05, infested_active: 0, infested_old: 0, dead_standing: 0.03 },
        canopyCoverPct: 62, droneNdviMean: 0.68,
      },
      {
        standId: 'p6-s2', standLabel: 'Avd. 2', healthScore: 82,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.88, stress_early: 0.08, stress_moderate: 0.03, infested_active: 0, infested_old: 0, dead_standing: 0.01 },
        canopyCoverPct: 70, droneNdviMean: 0.73,
      },
      {
        standId: 'p6-s3', standLabel: 'Avd. 3', healthScore: 72,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.78, stress_early: 0.14, stress_moderate: 0.05, infested_active: 0, infested_old: 0, dead_standing: 0.03 },
        canopyCoverPct: 58, droneNdviMean: 0.65,
      },
    ],
    volumeEstimates: [
      { species: 'Spruce', volumeM3sk: 980, sawlogRatio: 0.58, pulpRatio: 0.42, meanHeightM: 18.5, meanDbhCm: 22, stemsPerHa: 420 },
      { species: 'Pine', volumeM3sk: 450, sawlogRatio: 0.55, pulpRatio: 0.45, meanHeightM: 17.2, meanDbhCm: 20, stemsPerHa: 280 },
      { species: 'Birch', volumeM3sk: 120, sawlogRatio: 0.20, pulpRatio: 0.80, meanHeightM: 14.0, meanDbhCm: 16, stemsPerHa: 130 },
    ],
    overallSeverity: 'none',
    affectedAreaPct: 0,
    processingTimeSec: 2800,
    modelVersion: 'beetlesense-v2.3.1',
  },
  summary: 'Post-thinning recovery progressing well. Canopy cover reduced to 58-70% (expected after thinning). Remaining trees showing good vitality. No beetle activity detected. Ground vegetation returning well in Avd. 3. Crown spacing optimal for growth. Recommend follow-up in September to assess summer growth response.',
};

/**
 * s7: Stensjo Inventory (p7)
 * Complete. Routine full inventory.
 */
const s7Inventory: EnrichedSurvey = {
  id: 's7',
  name: 'Annual Inventory — Stensjö',
  parcelId: 'p7',
  parcelName: 'Stensjö',
  modules: ['tree_health', 'vegetation_index', 'wildlife_damage'],
  status: 'complete',
  priority: 'standard',
  createdAt: '2026-02-15T08:00:00Z',
  completedAt: '2026-02-17T16:00:00Z',
  flight: {
    waypoints: [
      { lng: 13.930, lat: 56.844, altitudeM: 85, heading: 90 },
      { lng: 13.968, lat: 56.844, altitudeM: 85, heading: 90 },
      { lng: 13.968, lat: 56.840, altitudeM: 85, heading: 270 },
      { lng: 13.930, lat: 56.840, altitudeM: 85, heading: 270 },
      { lng: 13.930, lat: 56.836, altitudeM: 85, heading: 90 },
      { lng: 13.968, lat: 56.836, altitudeM: 85, heading: 90 },
      { lng: 13.968, lat: 56.832, altitudeM: 85, heading: 270 },
      { lng: 13.930, lat: 56.832, altitudeM: 85, heading: 270 },
      { lng: 13.930, lat: 56.828, altitudeM: 85, heading: 90 },
      { lng: 13.968, lat: 56.828, altitudeM: 85, heading: 90 },
    ],
    distanceM: 16200,
    durationSec: 2430,
    avgSpeedMs: 6.7,
    overlapPct: 75,
    gsdCmPx: 2.2,
  },
  imageCount: 1520,
  results: {
    treeCount: 2680,
    speciesCount: 3,
    beetleZones: [],
    standHealth: [
      {
        standId: 'p7-s1', standLabel: 'Avd. 1', healthScore: 84,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.90, stress_early: 0.06, stress_moderate: 0.02, infested_active: 0, infested_old: 0.01, dead_standing: 0.01 },
        canopyCoverPct: 78, droneNdviMean: 0.75,
      },
      {
        standId: 'p7-s2', standLabel: 'Avd. 2', healthScore: 81,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.87, stress_early: 0.08, stress_moderate: 0.03, infested_active: 0, infested_old: 0.01, dead_standing: 0.01 },
        canopyCoverPct: 80, droneNdviMean: 0.73,
      },
      {
        standId: 'p7-s3', standLabel: 'Avd. 3', healthScore: 79,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.85, stress_early: 0.08, stress_moderate: 0.04, infested_active: 0, infested_old: 0.02, dead_standing: 0.01 },
        canopyCoverPct: 75, droneNdviMean: 0.71,
      },
      {
        standId: 'p7-s4', standLabel: 'Avd. 4', healthScore: 76,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.82, stress_early: 0.10, stress_moderate: 0.05, infested_active: 0, infested_old: 0, dead_standing: 0.03 },
        canopyCoverPct: 68, droneNdviMean: 0.68,
      },
    ],
    volumeEstimates: [
      { species: 'Pine', volumeM3sk: 1680, sawlogRatio: 0.55, pulpRatio: 0.45, meanHeightM: 21.0, meanDbhCm: 27, stemsPerHa: 380 },
      { species: 'Spruce', volumeM3sk: 720, sawlogRatio: 0.60, pulpRatio: 0.40, meanHeightM: 19.5, meanDbhCm: 25, stemsPerHa: 240 },
      { species: 'Birch', volumeM3sk: 180, sawlogRatio: 0.25, pulpRatio: 0.75, meanHeightM: 14.5, meanDbhCm: 17, stemsPerHa: 150 },
    ],
    overallSeverity: 'none',
    affectedAreaPct: 0,
    processingTimeSec: 3600,
    modelVersion: 'beetlesense-v2.3.1',
  },
  summary: 'Healthy mixed conifer forest. 2,680 trees counted across 38.2 ha. Pine dominant (65%) with spruce (28%) and birch (7%). Minor browsing damage from deer noted in Avd. 4 (young birch). Standing volume 2,580 m3sk total. No pest activity detected.',
};

/**
 * s4: Tallmon Full Inventory (p3)
 * COMPLETE — March 2026 full inventory shows healthy mature pine forest.
 */
const s4InProgress: EnrichedSurvey = {
  id: 's4',
  name: 'Tallmon Full Inventory',
  parcelId: 'p3',
  parcelName: 'Tallmon',
  modules: ['tree_health', 'vegetation_index', 'wildlife_damage'],
  status: 'complete',
  priority: 'standard',
  createdAt: '2026-03-14T07:30:00Z',
  completedAt: '2026-03-14T18:45:00Z',
  flight: {
    waypoints: [
      { lng: 14.135, lat: 57.794, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.794, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.790, altitudeM: 85, heading: 270 },
      { lng: 14.135, lat: 57.790, altitudeM: 85, heading: 270 },
      { lng: 14.135, lat: 57.786, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.786, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.782, altitudeM: 85, heading: 270 },
      { lng: 14.135, lat: 57.782, altitudeM: 85, heading: 270 },
      { lng: 14.135, lat: 57.778, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.778, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.774, altitudeM: 85, heading: 270 },
      { lng: 14.135, lat: 57.774, altitudeM: 85, heading: 270 },
      { lng: 14.135, lat: 57.770, altitudeM: 85, heading: 90 },
      { lng: 14.190, lat: 57.770, altitudeM: 85, heading: 90 },
    ],
    distanceM: 24800,
    durationSec: 3720,
    avgSpeedMs: 6.7,
    overlapPct: 75,
    gsdCmPx: 2.2,
  },
  imageCount: 2680,
  results: {
    treeCount: 4750,
    speciesCount: 3,
    beetleZones: [],
    standHealth: [
      {
        standId: 'p3-s1', standLabel: 'Avd. 1', healthScore: 86,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.92, stress_early: 0.05, stress_moderate: 0.02, infested_active: 0, infested_old: 0.01, dead_standing: 0 },
        canopyCoverPct: 80, droneNdviMean: 0.77,
      },
      {
        standId: 'p3-s2', standLabel: 'Avd. 2', healthScore: 83,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.89, stress_early: 0.07, stress_moderate: 0.02, infested_active: 0, infested_old: 0.01, dead_standing: 0.01 },
        canopyCoverPct: 78, droneNdviMean: 0.75,
      },
      {
        standId: 'p3-s3', standLabel: 'Avd. 3', healthScore: 81,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.87, stress_early: 0.08, stress_moderate: 0.03, infested_active: 0, infested_old: 0.01, dead_standing: 0.01 },
        canopyCoverPct: 76, droneNdviMean: 0.73,
      },
      {
        standId: 'p3-s4', standLabel: 'Avd. 4', healthScore: 78,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.84, stress_early: 0.10, stress_moderate: 0.04, infested_active: 0, infested_old: 0.01, dead_standing: 0.01 },
        canopyCoverPct: 74, droneNdviMean: 0.70,
      },
      {
        standId: 'p3-s5', standLabel: 'Avd. 5', healthScore: 80,
        dominantClass: 'healthy',
        classDistribution: { healthy: 0.86, stress_early: 0.09, stress_moderate: 0.03, infested_active: 0, infested_old: 0.01, dead_standing: 0.01 },
        canopyCoverPct: 77, droneNdviMean: 0.72,
      },
    ],
    volumeEstimates: [
      { species: 'Pine', volumeM3sk: 3280, sawlogRatio: 0.58, pulpRatio: 0.42, meanHeightM: 21.8, meanDbhCm: 28, stemsPerHa: 420 },
      { species: 'Spruce', volumeM3sk: 960, sawlogRatio: 0.60, pulpRatio: 0.40, meanHeightM: 19.5, meanDbhCm: 25, stemsPerHa: 240 },
      { species: 'Birch', volumeM3sk: 220, sawlogRatio: 0.28, pulpRatio: 0.72, meanHeightM: 15.2, meanDbhCm: 18, stemsPerHa: 180 },
    ],
    overallSeverity: 'none',
    affectedAreaPct: 0,
    processingTimeSec: 8400,
    modelVersion: 'beetlesense-v2.3.1',
  },
  summary: 'Healthy mature pine forest inventory complete. 4,750 trees across 67.1 ha. Pine dominant (70%) with spruce (22%) and birch (8%). Total volume 4,460 m3sk, excellent growth rates. Minor wildlife browsing in Avd. 4 (deer). No beetle or disease activity. Stand ages 65-82 years, ready for succession planning. Recommend marking of final harvest zone in Avd. 1-2 for 2029 harvest.',
};

// ─── Exports ───

export const DEMO_ENRICHED_SURVEYS: EnrichedSurvey[] = [
  s1SpringBeetle,
  s2HealthCheck,
  s3Emergency,
  s4InProgress,
  s6Recovery,
  s7Inventory,
];

/** Lookup enriched survey by ID */
export function getEnrichedSurvey(surveyId: string): EnrichedSurvey | undefined {
  return DEMO_ENRICHED_SURVEYS.find((s) => s.id === surveyId);
}

/** Get all surveys for a parcel */
export function getSurveysForParcel(parcelId: string): EnrichedSurvey[] {
  return DEMO_ENRICHED_SURVEYS.filter((s) => s.parcelId === parcelId);
}

/** Get completed surveys only */
export function getCompletedSurveys(): EnrichedSurvey[] {
  return DEMO_ENRICHED_SURVEYS.filter((s) => s.status === 'complete');
}

/** Get beetle detection zones across all completed surveys */
export function getAllBeetleDetections(): Array<BeetleDetectionZone & { surveyId: string; parcelName: string }> {
  return DEMO_ENRICHED_SURVEYS
    .filter((s) => s.status === 'complete' && s.results)
    .flatMap((s) =>
      (s.results?.beetleZones ?? []).map((bz) => ({
        ...bz,
        surveyId: s.id,
        parcelName: s.parcelName,
      })),
    );
}

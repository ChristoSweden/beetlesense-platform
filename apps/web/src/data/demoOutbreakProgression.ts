/**
 * Realistic monthly bark beetle outbreak progression data for demo visualization.
 * Shows Ips typographus (European spruce bark beetle) spread over 12-month period.
 *
 * Data structure: progression from initial detection → peak infestation → control phase
 * Includes affected hectares, tree mortality estimates, and regional distribution.
 */

export interface OutbreakMonth {
  /** Month in format YYYY-MM */
  month: string;
  /** Affected forest area in hectares (cumulative) */
  affectedHectares: number;
  /** Estimated number of infested trees */
  infestedTrees: number;
  /** Percentage of standing spruce that is dead/dying */
  spruceDeathRate: number;
  /** GDD (Growing Degree Days, base 5°C) accumulated */
  gddAccumulated: number;
  /** Estimated number of beetle generations active */
  generationsActive: number;
  /** Regional spread: hectares per county */
  countyBreakdown: Record<string, number>;
  /** Control intervention area in hectares */
  controlledHa: number;
  /** Estimated removal/salvage volume m3sk */
  salvageVolumeM3sk: number;
}

/**
 * 12-month outbreak progression in Smaland region.
 * Realistic scenario: outbreak starts March 2025, peaks summer, sustained through winter,
 * control measures beginning Q4 2025.
 */
export const OUTBREAK_PROGRESSION: OutbreakMonth[] = [
  {
    month: '2025-03',
    affectedHectares: 8.5,
    infestedTrees: 245,
    spruceDeathRate: 0.12,
    gddAccumulated: 15,
    generationsActive: 0,
    countyBreakdown: { 'Värnamo': 8.5, 'Gislaved': 0, 'Jönköping': 0, 'Nässjö': 0 },
    controlledHa: 0,
    salvageVolumeM3sk: 0,
  },
  {
    month: '2025-04',
    affectedHectares: 18.3,
    infestedTrees: 512,
    spruceDeathRate: 0.28,
    gddAccumulated: 72,
    generationsActive: 0.5,
    countyBreakdown: { 'Värnamo': 15.2, 'Gislaved': 3.1, 'Jönköping': 0, 'Nässjö': 0 },
    controlledHa: 0,
    salvageVolumeM3sk: 0,
  },
  {
    month: '2025-05',
    affectedHectares: 42.7,
    infestedTrees: 1320,
    spruceDeathRate: 0.42,
    gddAccumulated: 168,
    generationsActive: 1,
    countyBreakdown: { 'Värnamo': 28.5, 'Gislaved': 9.8, 'Jönköping': 4.4, 'Nässjö': 0 },
    controlledHa: 0,
    salvageVolumeM3sk: 0,
  },
  {
    month: '2025-06',
    affectedHectares: 89.4,
    infestedTrees: 2840,
    spruceDeathRate: 0.58,
    gddAccumulated: 324,
    generationsActive: 1.5,
    countyBreakdown: { 'Värnamo': 48.2, 'Gislaved': 22.5, 'Jönköping': 15.3, 'Nässjö': 3.4 },
    controlledHa: 3.2,
    salvageVolumeM3sk: 142,
  },
  {
    month: '2025-07',
    affectedHectares: 156.2,
    infestedTrees: 4950,
    spruceDeathRate: 0.72,
    gddAccumulated: 486,
    generationsActive: 2,
    countyBreakdown: { 'Värnamo': 82.5, 'Gislaved': 42.8, 'Jönköping': 28.1, 'Nässjö': 2.8 },
    controlledHa: 8.5,
    salvageVolumeM3sk: 385,
  },
  {
    month: '2025-08',
    affectedHectares: 223.6,
    infestedTrees: 7125,
    spruceDeathRate: 0.81,
    gddAccumulated: 648,
    generationsActive: 2.2,
    countyBreakdown: { 'Värnamo': 118.3, 'Gislaved': 64.2, 'Jönköping': 35.4, 'Nässjö': 5.7 },
    controlledHa: 15.2,
    salvageVolumeM3sk: 685,
  },
  {
    month: '2025-09',
    affectedHectares: 287.3,
    infestedTrees: 9145,
    spruceDeathRate: 0.85,
    gddAccumulated: 738,
    generationsActive: 2.1,
    countyBreakdown: { 'Värnamo': 154.2, 'Gislaved': 81.5, 'Jönköping': 42.8, 'Nässjö': 8.8 },
    controlledHa: 28.4,
    salvageVolumeM3sk: 1240,
  },
  {
    month: '2025-10',
    affectedHectares: 328.5,
    infestedTrees: 10480,
    spruceDeathRate: 0.86,
    gddAccumulated: 762,
    generationsActive: 1.8,
    countyBreakdown: { 'Värnamo': 178.4, 'Gislaved': 96.2, 'Jönköping': 45.3, 'Nässjö': 8.6 },
    controlledHa: 45.8,
    salvageVolumeM3sk: 1825,
  },
  {
    month: '2025-11',
    affectedHectares: 343.8,
    infestedTrees: 10952,
    spruceDeathRate: 0.86,
    gddAccumulated: 768,
    generationsActive: 0.5,
    countyBreakdown: { 'Värnamo': 187.5, 'Gislaved': 102.4, 'Jönköping': 47.2, 'Nässjö': 6.7 },
    controlledHa: 62.3,
    salvageVolumeM3sk: 2145,
  },
  {
    month: '2025-12',
    affectedHectares: 351.2,
    infestedTrees: 11185,
    spruceDeathRate: 0.86,
    gddAccumulated: 768,
    generationsActive: 0,
    countyBreakdown: { 'Värnamo': 192.8, 'Gislaved': 105.3, 'Jönköping': 48.1, 'Nässjö': 5.0 },
    controlledHa: 78.5,
    salvageVolumeM3sk: 2580,
  },
  {
    month: '2026-01',
    affectedHectares: 354.6,
    infestedTrees: 11294,
    spruceDeathRate: 0.85,
    gddAccumulated: 768,
    generationsActive: 0,
    countyBreakdown: { 'Värnamo': 195.2, 'Gislaved': 107.1, 'Jönköping': 48.8, 'Nässjö': 3.5 },
    controlledHa: 92.3,
    salvageVolumeM3sk: 2865,
  },
  {
    month: '2026-02',
    affectedHectares: 356.1,
    infestedTrees: 11352,
    spruceDeathRate: 0.84,
    gddAccumulated: 768,
    generationsActive: 0,
    countyBreakdown: { 'Värnamo': 196.8, 'Gislaved': 108.2, 'Jönköping': 49.3, 'Nässjö': 1.8 },
    controlledHa: 105.8,
    salvageVolumeM3sk: 3125,
  },
];

/**
 * County-level beetle trap data (weekly collections) for spring 2025.
 * Sentinel-2 observations correlate with trap counts.
 */
export interface CountyTrapData {
  county: string;
  weekStart: string;
  trapCount: number;
  beetleCount: number;
  /** Growing Degree Days accumulated since base date */
  gdd: number;
  /** Risk level 0-100 */
  riskScore: number;
}

export const COUNTY_TRAP_DATA: CountyTrapData[] = [
  // Värnamo (Outbreak epicenter)
  { county: 'Värnamo', weekStart: '2025-03-17', trapCount: 12, beetleCount: 245, gdd: 15, riskScore: 28 },
  { county: 'Värnamo', weekStart: '2025-03-24', trapCount: 12, beetleCount: 380, gdd: 35, riskScore: 35 },
  { county: 'Värnamo', weekStart: '2025-03-31', trapCount: 12, beetleCount: 520, gdd: 52, riskScore: 42 },
  { county: 'Värnamo', weekStart: '2025-04-07', trapCount: 12, beetleCount: 720, gdd: 75, riskScore: 52 },
  { county: 'Värnamo', weekStart: '2025-04-14', trapCount: 12, beetleCount: 1050, gdd: 105, riskScore: 65 },
  { county: 'Värnamo', weekStart: '2025-04-21', trapCount: 12, beetleCount: 1480, gdd: 135, riskScore: 76 },
  { county: 'Värnamo', weekStart: '2025-04-28', trapCount: 12, beetleCount: 2100, gdd: 165, riskScore: 85 },
  { county: 'Värnamo', weekStart: '2025-05-05', trapCount: 12, beetleCount: 2850, gdd: 198, riskScore: 92 },
  { county: 'Värnamo', weekStart: '2025-05-12', trapCount: 12, beetleCount: 3650, gdd: 232, riskScore: 97 },
  { county: 'Värnamo', weekStart: '2025-05-19', trapCount: 12, beetleCount: 4500, gdd: 268, riskScore: 99 },
  { county: 'Värnamo', weekStart: '2025-05-26', trapCount: 12, beetleCount: 5200, gdd: 298, riskScore: 100 },

  // Gävleborg (Secondary hotspot)
  { county: 'Gävleborg', weekStart: '2025-04-07', trapCount: 15, beetleCount: 85, gdd: 75, riskScore: 15 },
  { county: 'Gävleborg', weekStart: '2025-04-14', trapCount: 15, beetleCount: 145, gdd: 105, riskScore: 22 },
  { county: 'Gävleborg', weekStart: '2025-04-21', trapCount: 15, beetleCount: 280, gdd: 135, riskScore: 32 },
  { county: 'Gävleborg', weekStart: '2025-04-28', trapCount: 15, beetleCount: 420, gdd: 165, riskScore: 42 },
  { county: 'Gävleborg', weekStart: '2025-05-05', trapCount: 15, beetleCount: 680, gdd: 198, riskScore: 55 },
  { county: 'Gävleborg', weekStart: '2025-05-12', trapCount: 15, beetleCount: 950, gdd: 232, riskScore: 68 },
  { county: 'Gävleborg', weekStart: '2025-05-19', trapCount: 15, beetleCount: 1240, gdd: 268, riskScore: 78 },
  { county: 'Gävleborg', weekStart: '2025-05-26', trapCount: 15, beetleCount: 1580, gdd: 298, riskScore: 85 },

  // Värmland (Emerging hotspot)
  { county: 'Värmland', weekStart: '2025-05-05', trapCount: 18, beetleCount: 120, gdd: 198, riskScore: 18 },
  { county: 'Värmland', weekStart: '2025-05-12', trapCount: 18, beetleCount: 210, gdd: 232, riskScore: 28 },
  { county: 'Värmland', weekStart: '2025-05-19', trapCount: 18, beetleCount: 340, gdd: 268, riskScore: 38 },
  { county: 'Värmland', weekStart: '2025-05-26', trapCount: 18, beetleCount: 520, gdd: 298, riskScore: 48 },

  // Dalarna (Spreading front)
  { county: 'Dalarna', weekStart: '2025-05-12', trapCount: 20, beetleCount: 45, gdd: 232, riskScore: 8 },
  { county: 'Dalarna', weekStart: '2025-05-19', trapCount: 20, beetleCount: 95, gdd: 268, riskScore: 15 },
  { county: 'Dalarna', weekStart: '2025-05-26', trapCount: 20, beetleCount: 180, gdd: 298, riskScore: 24 },
];

/**
 * Detection accuracy metrics for early warning system.
 * Compares drone detection vs satellite observation vs ground validation.
 */
export interface DetectionAccuracy {
  /** Detection method */
  method: 'drone_rgb' | 'drone_multispectral' | 'sentinel2' | 'landsat8' | 'ground_validation';
  /** Overall accuracy percentage */
  accuracyPct: number;
  /** Early detection advantage (days before other methods) */
  earlyDetectionDays: number;
  /** False positive rate */
  falsePosRatePct: number;
  /** False negative rate */
  falseNegRatePct: number;
  /** Minimum area of infestation that can be detected (hectares) */
  minDetectableAreaHa: number;
  /** Time from capture to detection report (hours) */
  processingTimeHours: number;
  /** Cost per hectare analyzed (SEK) */
  costPerHaSek: number;
}

export const DETECTION_ACCURACY_METRICS: DetectionAccuracy[] = [
  {
    method: 'drone_rgb',
    accuracyPct: 87,
    earlyDetectionDays: 0,
    falsePosRatePct: 8,
    falseNegRatePct: 12,
    minDetectableAreaHa: 0.05,
    processingTimeHours: 3,
    costPerHaSek: 850,
  },
  {
    method: 'drone_multispectral',
    accuracyPct: 92,
    earlyDetectionDays: 2,
    falsePosRatePct: 4,
    falseNegRatePct: 6,
    minDetectableAreaHa: 0.02,
    processingTimeHours: 5,
    costPerHaSek: 1200,
  },
  {
    method: 'sentinel2',
    accuracyPct: 71,
    earlyDetectionDays: 8,
    falsePosRatePct: 18,
    falseNegRatePct: 22,
    minDetectableAreaHa: 1.0,
    processingTimeHours: 12,
    costPerHaSek: 15,
  },
  {
    method: 'landsat8',
    accuracyPct: 64,
    earlyDetectionDays: 14,
    falsePosRatePct: 25,
    falseNegRatePct: 32,
    minDetectableAreaHa: 2.5,
    processingTimeHours: 24,
    costPerHaSek: 5,
  },
  {
    method: 'ground_validation',
    accuracyPct: 98,
    earlyDetectionDays: 21,
    falsePosRatePct: 1,
    falseNegRatePct: 1,
    minDetectableAreaHa: 0.001,
    processingTimeHours: 48,
    costPerHaSek: 2500,
  },
];

/**
 * Sentinel-2 observation metadata for demo parcels.
 * 10m resolution, 5-day revisit cycle.
 */
export interface SatelliteObservation {
  parcelId: string;
  observationDate: string;
  /** ISO timestamp */
  captureTime: string;
  /** Cloud cover percentage */
  cloudCoverPct: number;
  /** NDVI mean value */
  ndviMean: number;
  /** Scene reliability: 0-100 */
  reliabilityScore: number;
  /** Spatial footprint in hectares (approximately 10m × 10m cells per pixel) */
  footprintHa: number;
}

export const SENTINEL2_OBSERVATIONS: SatelliteObservation[] = [
  {
    parcelId: 'p1',
    observationDate: '2026-03-14',
    captureTime: '2026-03-14T09:45:00Z',
    cloudCoverPct: 12,
    ndviMean: 0.68,
    reliabilityScore: 88,
    footprintHa: 42.5,
  },
  {
    parcelId: 'p2',
    observationDate: '2026-03-14',
    captureTime: '2026-03-14T09:50:00Z',
    cloudCoverPct: 8,
    ndviMean: 0.82,
    reliabilityScore: 92,
    footprintHa: 18.3,
  },
  {
    parcelId: 'p3',
    observationDate: '2026-03-14',
    captureTime: '2026-03-14T10:00:00Z',
    cloudCoverPct: 15,
    ndviMean: 0.78,
    reliabilityScore: 85,
    footprintHa: 67.1,
  },
  {
    parcelId: 'p4',
    observationDate: '2026-03-14',
    captureTime: '2026-03-14T10:05:00Z',
    cloudCoverPct: 10,
    ndviMean: 0.31,
    reliabilityScore: 89,
    footprintHa: 31.9,
  },
  {
    parcelId: 'p5',
    observationDate: '2026-03-14',
    captureTime: '2026-03-14T10:10:00Z',
    cloudCoverPct: 20,
    ndviMean: 0.60,
    reliabilityScore: 80,
    footprintHa: 55.0,
  },
];

/**
 * Helper to get outbreak data for a specific month
 */
export function getOutbreakMonth(monthStr: string): OutbreakMonth | undefined {
  return OUTBREAK_PROGRESSION.find((m) => m.month === monthStr);
}

/**
 * Helper to get peak month of outbreak
 */
export function getPeakOutbreakMonth(): OutbreakMonth {
  return OUTBREAK_PROGRESSION.reduce((prev, current) =>
    current.infestedTrees > prev.infestedTrees ? current : prev,
  );
}

/**
 * Helper to get control effectiveness (percentage reduction from peak)
 */
export function getControlEffectiveness(): number {
  const peak = getPeakOutbreakMonth();
  const latest = OUTBREAK_PROGRESSION[OUTBREAK_PROGRESSION.length - 1];
  return 100 * (1 - latest.controlledHa / peak.affectedHectares);
}

/**
 * Get county-specific outbreak timeline
 */
export function getCountyOutbreakTimeline(
  county: string,
): Array<{ month: string; affectedHa: number }> {
  return OUTBREAK_PROGRESSION.map((month) => ({
    month: month.month,
    affectedHa: month.countyBreakdown[county] || 0,
  }));
}

/**
 * Time-series metrics for dashboard charts and historical trend analysis.
 * Realistic data showing forest health trends, market evolution, and outbreak progression.
 */

// ─── Weekly Beetle Trap Data (Gävleborg County) ───

export interface WeeklyTrapMetric {
  week: string; // YYYY-W## ISO format or YYYY-MM-DD (week start)
  trapCountTotal: number;
  beetleCountTotal: number;
  avgTrapCount: number; // beetles per trap per week
  gdd: number; // Growing Degree Days accumulated
  riskLevel: number; // 0-100
  /** Trend vs previous week: -1, 0, 1 */
  trend: -1 | 0 | 1;
}

export const GÄVLEBORG_WEEKLY_TRAPS: WeeklyTrapMetric[] = [
  { week: '2025-03-03', trapCountTotal: 8, beetleCountTotal: 24, avgTrapCount: 3, gdd: 5, riskLevel: 8, trend: 1 },
  { week: '2025-03-10', trapCountTotal: 8, beetleCountTotal: 42, avgTrapCount: 5.25, gdd: 12, riskLevel: 12, trend: 1 },
  { week: '2025-03-17', trapCountTotal: 8, beetleCountTotal: 68, avgTrapCount: 8.5, gdd: 22, riskLevel: 18, trend: 1 },
  { week: '2025-03-24', trapCountTotal: 8, beetleCountTotal: 105, avgTrapCount: 13.1, gdd: 35, riskLevel: 25, trend: 1 },
  { week: '2025-03-31', trapCountTotal: 8, beetleCountTotal: 185, avgTrapCount: 23.1, gdd: 50, riskLevel: 35, trend: 1 },
  { week: '2025-04-07', trapCountTotal: 8, beetleCountTotal: 320, avgTrapCount: 40, gdd: 72, riskLevel: 48, trend: 1 },
  { week: '2025-04-14', trapCountTotal: 8, beetleCountTotal: 540, avgTrapCount: 67.5, gdd: 98, riskLevel: 62, trend: 1 },
  { week: '2025-04-21', trapCountTotal: 8, beetleCountTotal: 850, avgTrapCount: 106.2, gdd: 128, riskLevel: 75, trend: 1 },
  { week: '2025-04-28', trapCountTotal: 8, beetleCountTotal: 1240, avgTrapCount: 155, gdd: 162, riskLevel: 85, trend: 1 },
  { week: '2025-05-05', trapCountTotal: 8, beetleCountTotal: 1680, avgTrapCount: 210, gdd: 198, riskLevel: 92, trend: 1 },
  { week: '2025-05-12', trapCountTotal: 8, beetleCountTotal: 2100, avgTrapCount: 262.5, gdd: 232, riskLevel: 97, trend: 0 },
  { week: '2025-05-19', trapCountTotal: 8, beetleCountTotal: 2340, avgTrapCount: 292.5, gdd: 268, riskLevel: 99, trend: 0 },
  { week: '2025-05-26', trapCountTotal: 8, beetleCountTotal: 2480, avgTrapCount: 310, gdd: 298, riskLevel: 100, trend: -1 },
];

// ─── Monthly NDVI Anomaly Detection ───

export interface NDVIAnomalyMetric {
  month: string; // YYYY-MM
  parcelId: string;
  ndviMean: number;
  ndviChange: number; // change from previous month
  anomalyScore: number; // 0-100, >50 indicates anomaly
  processedSatelliteCount: number; // number of valid observations
  cloudCoverAvg: number; // percentage
}

export const NDVI_ANOMALIES: NDVIAnomalyMetric[] = [
  // p1: Norra Skogen — early stress emerging
  { month: '2025-12', parcelId: 'p1', ndviMean: 0.38, ndviChange: 0, anomalyScore: 15, processedSatelliteCount: 3, cloudCoverAvg: 28 },
  { month: '2026-01', parcelId: 'p1', ndviMean: 0.35, ndviChange: -0.03, anomalyScore: 22, processedSatelliteCount: 2, cloudCoverAvg: 35 },
  { month: '2026-02', parcelId: 'p1', ndviMean: 0.42, ndviChange: 0.07, anomalyScore: 18, processedSatelliteCount: 4, cloudCoverAvg: 22 },
  { month: '2026-03', parcelId: 'p1', ndviMean: 0.54, ndviChange: 0.12, anomalyScore: 25, processedSatelliteCount: 5, cloudCoverAvg: 12 },

  // p2: Ekbacken — healthy stable
  { month: '2025-12', parcelId: 'p2', ndviMean: 0.62, ndviChange: 0, anomalyScore: 8, processedSatelliteCount: 3, cloudCoverAvg: 25 },
  { month: '2026-01', parcelId: 'p2', ndviMean: 0.58, ndviChange: -0.04, anomalyScore: 12, processedSatelliteCount: 2, cloudCoverAvg: 38 },
  { month: '2026-02', parcelId: 'p2', ndviMean: 0.68, ndviChange: 0.10, anomalyScore: 10, processedSatelliteCount: 4, cloudCoverAvg: 20 },
  { month: '2026-03', parcelId: 'p2', ndviMean: 0.74, ndviChange: 0.06, anomalyScore: 8, processedSatelliteCount: 5, cloudCoverAvg: 10 },

  // p4: Granudden — severe decline
  { month: '2025-12', parcelId: 'p4', ndviMean: 0.45, ndviChange: 0, anomalyScore: 35, processedSatelliteCount: 3, cloudCoverAvg: 30 },
  { month: '2026-01', parcelId: 'p4', ndviMean: 0.38, ndviChange: -0.07, anomalyScore: 48, processedSatelliteCount: 2, cloudCoverAvg: 40 },
  { month: '2026-02', parcelId: 'p4', ndviMean: 0.32, ndviChange: -0.06, anomalyScore: 62, processedSatelliteCount: 4, cloudCoverAvg: 25 },
  { month: '2026-03', parcelId: 'p4', ndviMean: 0.28, ndviChange: -0.04, anomalyScore: 75, processedSatelliteCount: 5, cloudCoverAvg: 15 },
];

// ─── Detected Anomalies by Severity ───

export interface AnomalyEvent {
  id: string;
  month: string;
  county: string;
  municipality: string;
  /** Severity: 1=minor, 2=moderate, 3=severe */
  severity: 1 | 2 | 3;
  anomalyType: 'beetle_damage' | 'drought_stress' | 'storm_damage' | 'disease' | 'fire_risk';
  affectedHectares: number;
  confirmedByDrone: boolean;
  droneDate?: string;
}

export const DETECTED_ANOMALIES: AnomalyEvent[] = [
  // Q1 2026 anomalies
  {
    id: 'anom-001',
    month: '2026-01',
    county: 'Värnamo',
    municipality: 'Värnamo',
    severity: 2,
    anomalyType: 'beetle_damage',
    affectedHectares: 2.5,
    confirmedByDrone: false,
  },
  {
    id: 'anom-002',
    month: '2026-02',
    county: 'Värnamo',
    municipality: 'Värnamo',
    severity: 3,
    anomalyType: 'beetle_damage',
    affectedHectares: 8.8,
    confirmedByDrone: true,
    droneDate: '2026-03-08',
  },
  {
    id: 'anom-003',
    month: '2026-01',
    county: 'Gävleborg',
    municipality: 'Gävleborg',
    severity: 1,
    anomalyType: 'drought_stress',
    affectedHectares: 0.8,
    confirmedByDrone: false,
  },
  {
    id: 'anom-004',
    month: '2026-02',
    county: 'Värmland',
    municipality: 'Karlstad',
    severity: 2,
    anomalyType: 'beetle_damage',
    affectedHectares: 1.2,
    confirmedByDrone: false,
  },
  {
    id: 'anom-005',
    month: '2026-03',
    county: 'Dalarna',
    municipality: 'Dalarna',
    severity: 1,
    anomalyType: 'beetle_damage',
    affectedHectares: 0.3,
    confirmedByDrone: false,
  },
];

// ─── Monthly Dashboard KPIs ───

export interface MonthlyKPI {
  month: string;
  /** Total active drone surveys */
  surveysCompleted: number;
  /** Total hectares covered by drone */
  droneHectaresCovered: number;
  /** Average detection time (hours from capture to alert) */
  avgDetectionTimeHours: number;
  /** Anomalies detected */
  anomaliesDetected: number;
  /** False positive rate (%) */
  falsePosRate: number;
  /** Cost per hectare analyzed (SEK) */
  costPerHa: number;
  /** System uptime (%) */
  systemUptime: number;
}

export const MONTHLY_KPIS: MonthlyKPI[] = [
  {
    month: '2025-12',
    surveysCompleted: 3,
    droneHectaresCovered: 145.2,
    avgDetectionTimeHours: 4.2,
    anomaliesDetected: 1,
    falsePosRate: 5.2,
    costPerHa: 285,
    systemUptime: 98.4,
  },
  {
    month: '2026-01',
    surveysCompleted: 5,
    droneHectaresCovered: 287.5,
    avgDetectionTimeHours: 3.8,
    anomaliesDetected: 2,
    falsePosRate: 4.8,
    costPerHa: 268,
    systemUptime: 99.1,
  },
  {
    month: '2026-02',
    surveysCompleted: 6,
    droneHectaresCovered: 356.8,
    avgDetectionTimeHours: 3.1,
    anomaliesDetected: 4,
    falsePosRate: 3.5,
    costPerHa: 245,
    systemUptime: 99.7,
  },
  {
    month: '2026-03',
    surveysCompleted: 7,
    droneHectaresCovered: 428.3,
    avgDetectionTimeHours: 2.8,
    anomaliesDetected: 5,
    falsePosRate: 2.8,
    costPerHa: 228,
    systemUptime: 99.9,
  },
];

// ─── Comparative Detection (Drone vs Satellite) ───

export interface DetectionComparison {
  month: string;
  droneDetections: number;
  satelliteDetections: number;
  /** Days earlier drone detection on average */
  earlyDetectionAdvantage: number;
  /** Satellite false negatives caught by drone */
  satelliteMissed: number;
  /** Drone false positives (confirmed as non-infestation) */
  droneFalsePos: number;
}

export const DRONE_VS_SATELLITE: DetectionComparison[] = [
  { month: '2025-12', droneDetections: 1, satelliteDetections: 0, earlyDetectionAdvantage: 0, satelliteMissed: 1, droneFalsePos: 0 },
  { month: '2026-01', droneDetections: 2, satelliteDetections: 1, earlyDetectionAdvantage: 8, satelliteMissed: 1, droneFalsePos: 1 },
  { month: '2026-02', droneDetections: 4, satelliteDetections: 2, earlyDetectionAdvantage: 12, satelliteMissed: 2, droneFalsePos: 0 },
  { month: '2026-03', droneDetections: 5, satelliteDetections: 3, earlyDetectionAdvantage: 14, satelliteMissed: 2, droneFalsePos: 0 },
];

// ─── Hardware & Network Performance ───

export interface SystemHealth {
  month: string;
  droneFleetHours: number; // total flight hours
  droneFleetUtilization: number; // percentage
  networkLatency: number; // milliseconds
  dataProcessingThroughput: number; // hectares processed per hour
  weatherDowntimePct: number; // percentage unable to fly
}

export const SYSTEM_HEALTH: SystemHealth[] = [
  {
    month: '2025-12',
    droneFleetHours: 28,
    droneFleetUtilization: 35,
    networkLatency: 42,
    dataProcessingThroughput: 18.5,
    weatherDowntimePct: 22,
  },
  {
    month: '2026-01',
    droneFleetHours: 52,
    droneFleetUtilization: 52,
    networkLatency: 38,
    dataProcessingThroughput: 22.3,
    weatherDowntimePct: 28,
  },
  {
    month: '2026-02',
    droneFleetHours: 68,
    droneFleetUtilization: 68,
    networkLatency: 35,
    dataProcessingThroughput: 25.8,
    weatherDowntimePct: 15,
  },
  {
    month: '2026-03',
    droneFleetHours: 85,
    droneFleetUtilization: 72,
    networkLatency: 32,
    dataProcessingThroughput: 29.1,
    weatherDowntimePct: 12,
  },
];

// ─── Helper Functions ───

export function getMonthKPIs(month: string): MonthlyKPI | undefined {
  return MONTHLY_KPIS.find((k) => k.month === month);
}

export function getTrapTrend(county: string, weeks: number = 4): WeeklyTrapMetric[] {
  // Return last N weeks if specific county filtering is needed
  return GÄVLEBORG_WEEKLY_TRAPS.slice(-weeks);
}

export function getAnomaliesBySeverity(severity: 1 | 2 | 3): AnomalyEvent[] {
  return DETECTED_ANOMALIES.filter((a) => a.severity === severity);
}

export function getCountyAnomalies(county: string): AnomalyEvent[] {
  return DETECTED_ANOMALIES.filter((a) => a.county === county);
}

export function calculateDetectionEfficiency(month: string): number {
  const comp = DRONE_VS_SATELLITE.find((c) => c.month === month);
  if (!comp) return 0;
  return (comp.droneDetections / (comp.satelliteMissed + comp.droneDetections)) * 100;
}

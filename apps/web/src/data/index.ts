/**
 * Central export for all enriched demo data.
 *
 * Usage:
 *   import { DEMO_GEOMETRIES, getNDVISeries, getParcelAnalysis } from '@/data';
 */

// ─── Geometries ───
export {
  DEMO_GEOMETRIES,
  getParcelGeometry,
  getSubStands,
  toGeoJSON,
  subStandsToGeoJSON,
} from './demoGeometries';

export type { ParcelGeometry, SubStand } from './demoGeometries';

// ─── NDVI Time-Series ───
export {
  DEMO_NDVI_SERIES,
  getNDVISeries,
  getLatestNDVI,
  getNDVIRange,
  getNDVIRollingAverage,
} from './demoNDVI';

export type { NDVIObservation, ParcelNDVISeries } from './demoNDVI';

// ─── Enriched Surveys ───
export {
  DEMO_ENRICHED_SURVEYS,
  getEnrichedSurvey,
  getSurveysForParcel,
  getCompletedSurveys,
  getAllBeetleDetections,
} from './demoSurveys';

export type {
  EnrichedSurvey,
  FlightPath,
  FlightWaypoint,
  BeetleDetectionZone,
  StandHealthClassification,
  VolumeEstimate,
  SurveyAnalysisResults,
  DetectionClass,
} from './demoSurveys';

// ─── Analysis Results ───
export {
  DEMO_ANALYSES,
  getParcelAnalysis,
  getStandAnalysis,
  getSatelliteDroneComparisons,
  getParcelsByBeetleRisk,
  getTotalTimberValue,
} from './demoAnalysis';

export type {
  ParcelAnalysisSummary,
  StandAnalysis,
  HealthBreakdown,
  TimberVolumeBySpecies,
  RiskAssessment,
  ChangeDetection,
  SatelliteDroneComparison,
} from './demoAnalysis';

// ─── Outbreak Progression & Detection Metrics ───
export {
  OUTBREAK_PROGRESSION,
  COUNTY_TRAP_DATA,
  DETECTION_ACCURACY_METRICS,
  SENTINEL2_OBSERVATIONS,
  getOutbreakMonth,
  getPeakOutbreakMonth,
  getControlEffectiveness,
  getCountyOutbreakTimeline,
} from './demoOutbreakProgression';

export type {
  OutbreakMonth,
  CountyTrapData,
  DetectionAccuracy,
  SatelliteObservation,
} from './demoOutbreakProgression';

// ─── Metrics & KPIs ───
export {
  DEMO_PORTFOLIO_METRICS,
  DEMO_TIMBER_METRICS,
  DEMO_EARLY_WARNINGS,
  DEMO_MARKET_PRICES,
  DEMO_CONTRACTORS,
  DEMO_COMPLIANCE,
  DEMO_BIODIVERSITY,
  DEMO_HARVEST_PLANS,
  getParcelMetrics,
  getTotalHarvestValue,
  getLatestMarketPrice,
} from './demoMetrics';

export type {
  PortfolioMetrics,
  TimberMetrics,
  EarlyWarningEvent,
  MarketPrice,
  ContractorAvailability,
  ComplianceItem,
  BiodiversityMetric,
  HarvestPlan,
} from './demoMetrics';

// ─── Time-Series Metrics ───
export {
  GÄVLEBORG_WEEKLY_TRAPS,
  NDVI_ANOMALIES,
  DETECTED_ANOMALIES,
  MONTHLY_KPIS,
  DRONE_VS_SATELLITE,
  SYSTEM_HEALTH,
  getMonthKPIs,
  getTrapTrend,
  getAnomaliesBySeverity,
  getCountyAnomalies,
  calculateDetectionEfficiency,
} from './demoTimeSeriesMetrics';

export type {
  WeeklyTrapMetric,
  NDVIAnomalyMetric,
  AnomalyEvent,
  MonthlyKPI,
  DetectionComparison,
  SystemHealth,
} from './demoTimeSeriesMetrics';

// ─── Re-export existing data modules ───
export { forestryActivities, getActivitiesByMonth } from './forestryCalendarData';
export { glossaryTerms } from './forestryGlossaryData';
export { BUFFER_ZONE_RULES, LEGAL_REQUIREMENTS } from './regulatoryRules';
export { REGULATORY_CHANGES } from './regulatoryChanges';
export { academyLessons, getLessonById } from './academyCoursesData';
export { FIRST_YEAR_TASKS, getTasksForMonth } from './firstYearChecklistData';
export { HARVESTER_COSTS, SILVICULTURE_COSTS, TAX_BRACKETS } from './swedishForestryEconomics';

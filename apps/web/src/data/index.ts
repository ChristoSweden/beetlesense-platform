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

// ─── Re-export existing data modules ───
export { forestryActivities, getActivitiesByMonth } from './forestryCalendarData';
export { glossaryTerms } from './forestryGlossaryData';
export { BUFFER_ZONE_RULES, LEGAL_REQUIREMENTS } from './regulatoryRules';
export { REGULATORY_CHANGES } from './regulatoryChanges';
export { academyLessons, getLessonById } from './academyCoursesData';
export { FIRST_YEAR_TASKS, getTasksForMonth } from './firstYearChecklistData';
export { HARVESTER_COSTS, SILVICULTURE_COSTS, TAX_BRACKETS } from './swedishForestryEconomics';

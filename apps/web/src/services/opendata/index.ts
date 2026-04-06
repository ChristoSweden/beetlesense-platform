/**
 * Open Data Services — aggregated exports
 *
 * Real-time data from free Swedish and European data sources:
 * - SMHI: Live weather observations (fully open, no key)
 * - Sentinel-2: Satellite imagery and NDVI (WMS tiles free, API needs key)
 * - Skogsstyrelsen: Harvest notifications and pest data (WFS open)
 * - Global Forest Watch: Tree cover loss alerts (API needs key)
 */

export {
  getLiveWeatherObservation,
  get24hObservations,
  STATIONS,
  type LiveWeatherObservation,
  type SMHIObservation,
} from './smhiObservationService';

export {
  getSatelliteOverview,
  getSentinelTrueColorTileUrl,
  getSentinelNDVITileUrl,
  getTimeSincePass,
  getTimeUntilPass,
  type SatelliteOverview,
  type SentinelPass,
  type NDVIStats,
} from './sentinelService';

export {
  getGlobalForestWatchOverview,
  type GFWOverview,
  type TreeCoverAlert,
  type ForestCoverStats,
} from './globalForestWatchService';

export {
  fetchNatura2000Sites,
  getTreeCoverDensityUrl,
  fetchTreeCoverStats,
  fetchLandCoverClassification,
  type Natura2000Site,
  type TreeCoverStats,
  type LandCoverResult,
  type BBox,
} from './inspireService';

export {
  fetchSoilData,
  fetchElevationData,
  fetchEUDRCompliance,
  type SoilData,
  type ElevationData,
  type EUDRCompliance,
} from './inspireElevationSoilService';

export {
  fetchProtectedAreas,
  fetchConservationStatus,
  fetchHabitatType,
  fetchBirdSpecies,
  fetchBioregion,
  fetchForestType,
  fetchRedListHabitats,
  type ProtectedArea,
  type ConservationStatus,
  type HabitatType,
  type BirdSpeciesData,
  type Bioregion,
  type ForestType,
  type RedListHabitat,
} from './inspireNatureService';

export {
  getPropertyBoundaryWmsUrl,
  getCadastralParcelWmsUrl,
  getCadastralZoningWmsUrl,
  queryPropertyAtPoint,
  getPropertyBoundaryTileUrl,
  getCadastralParcelTileUrl,
  type CadastralFeatureInfo,
} from './lantmaterietCadastralService';

export {
  fetchSoilMoistureTimeSeries,
  calculateDroughtStatus,
  getSoilMoistureAnomaly,
  ERA5_SOURCE_INFO,
  type SoilMoistureData,
  type SoilMoistureTimeSeries,
  type MonthlySoilMoisture,
  type DroughtStatus,
} from './era5SoilMoistureService';

export {
  fetchRecentFires,
  clusterFireDetections,
  calculatePostFireBeetleRisk,
  getFIRMSTileUrl,
  FIRMS_SOURCE_INFO,
  type FIRMSDetection,
  type FirePerimeter,
  type PostFireBeetleRisk,
} from './nasaFirmsService';

export {
  fetchLandCoverStats as fetchWorldCoverStats,
  getForestMask,
  getWorldCoverTileUrl,
  isForestPixel,
  WORLDCOVER_CLASSES,
  WORLDCOVER_SOURCE_INFO,
  type LandCoverStats,
  type LandCoverClass,
  type ForestMask,
} from './esaWorldCoverService';

export {
  estimateBiomass,
  calculateCarbonStock,
  getCarbonTimeSeries,
  valuateForestAsset,
  SPECIES_PARAMS,
  CARBON_SOURCE_INFO,
  type BiomassEstimate,
  type CarbonTimeSeries,
  type MonthlyCarbon,
  type ForestValuation,
  type SpeciesBiomassParams,
  type BiomassInput,
} from './carbonBiomassService';

export {
  fetchNearbyOccurrences,
  fetchWoodpeckerActivity,
  getBiodiversitySnapshot,
  calculateBeetlePredatorIndex,
  BEETLE_PREDATOR_SPECIES,
  BIODIVERSITY_SOURCE_INFO,
  type SpeciesOccurrence,
  type WoodpeckerActivity,
  type BiodiversitySnapshot,
  type GBIFSearchParams,
} from './biodiversityOccurrenceService';

export {
  fetchForecast,
  fetchHistoricalWeather,
  checkBeetleEmergenceConditions,
  fetchAirQuality,
  OPEN_METEO_SOURCE_INFO,
  type OpenMeteoForecast,
  type HourlyForecast,
  type DailyForecast,
  type BeetleEmergenceConditions,
  type AirQualityData,
} from './openMeteoService';

export {
  fetchTimberPrices,
  fetchPriceHistory,
  fetchRegionalForestStats,
  getLatestPriceComparison,
  SCB_SOURCE_INFO,
  type TimberPriceData,
  type RegionalTimberPrices,
  type ForestStatistics,
  type PriceHistoryEntry,
} from './scbTimberPriceService';

export {
  fetchSoilProperties,
  getSoilGridsTileUrl,
  assessTrafficability,
  calculateBeetleRiskFromSoil,
  SOILGRIDS_SOURCE_INFO,
  SOILGRIDS_LAYERS,
  type SoilProperties,
} from './soilGridsService';

export {
  getForestChangeTileUrl,
  fetchForestChangeStats,
  HANSEN_SOURCE_INFO,
  type ForestChangeStats,
  type ForestChangeTileConfig,
} from './hansenForestChangeService';

export {
  fetchNearbyObservations,
  fetchBeetleSightings,
  fetchIndicatorSpecies,
  INATURALIST_SOURCE_INFO,
  type INatObservation,
  type BeetleSightings,
  type IndicatorSpeciesResult,
} from './iNaturalistService';

export {
  fetchSpeciesNearby,
  fetchBarkBeetleRecords,
  fetchRedListedSpecies,
  getSpeciesSummary,
  ARTPORTALEN_SOURCE_INFO,
  type ArtportalenObservation,
  type SpeciesSummary,
} from './artportalenService';

export {
  fetchBiomassCCITimeSeries,
  validateLocalBiomass,
  getBiomassCCITrend,
  ESA_BIOMASS_CCI_SOURCE_INFO,
  type BiomassCCIData,
  type BiomassCCITimeSeries,
  type BiomassValidation,
} from './esaBiomassCCIService';

export {
  calculateForDRI,
  getForDRITimeSeries,
  getForDRIBeetleRiskMultiplier,
  FORDRI_SOURCE_INFO,
  type ForDRIScore,
  type ForDRITimeSeries,
} from './forestDroughtResponseService';

export {
  fetchCountryStats,
  getGlobalBenchmark,
  fetchNordicComparison,
  FAO_FRA_SOURCE_INFO,
  type CountryForestStats,
  type GlobalBenchmark,
} from './faoForestResourcesService';

export {
  getFireDangerTileUrl,
  fetchFireDangerForPoint,
  fetchBurntAreas,
  getFireDangerClass,
  EFFIS_SOURCE_INFO,
  type FireDangerForecast,
  type BurntAreaRecord,
} from './effisFireDangerService';

export {
  getDroughtTileUrl,
  fetchDroughtIndicator,
  getCombinedDroughtStatus,
  DROUGHT_OBSERVATORY_SOURCE_INFO,
  type DroughtIndicator,
} from './jrcDroughtService';

export {
  fetchRoadConditions,
  checkHarvestAccessibility,
  fetchWeightRestrictions,
  TRAFIKVERKET_SOURCE_INFO,
  type RoadCondition,
  type HarvestAccessibility,
} from './trafikverketRoadService';

export {
  fetchProtectedAreasNV,
  getProtectedAreasTileUrl,
  checkComplianceForParcel,
  getNearestProtectedAreas,
  NATURVARDSVERKET_SOURCE_INFO,
  type ProtectedAreaNV,
  type ComplianceCheck,
} from './naturvardsverketService';

export {
  fetchSwedishFireRisk,
  fetchActiveFireWarnings,
  isFireBanActive,
  MSB_FIRE_SOURCE_INFO,
  type SwedishFireRisk,
  type FireWarning,
} from './msbFireRiskService';

export {
  fetchNearbyWaterStations,
  checkWaterBufferCompliance,
  fetchWaterFlowData,
  SMHI_HYDROLOGY_SOURCE_INFO,
  type WaterStation,
  type WatercourseBuffer,
  type HarvestWaterCompliance,
} from './smhiHydrologyService';

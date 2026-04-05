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

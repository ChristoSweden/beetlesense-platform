/**
 * Parcel Enrichment Service — INSPIRE Data Aggregator
 *
 * Combines all INSPIRE data sources into a single enrichment call
 * that runs when a user registers a new parcel. Pulls from:
 * - inspireService: Natura2000, TreeCover, LandCover
 * - inspireElevationSoilService: Soil, Elevation, EUDR
 *
 * Uses Promise.allSettled() so partial data is returned even if
 * some sources fail.
 */

import {
  fetchNatura2000Sites,
  fetchTreeCoverStats,
  fetchLandCoverClassification,
  type Natura2000Site,
  type TreeCoverStats,
  type LandCoverResult,
} from './inspireService';

import {
  fetchSoilData,
  fetchElevationData,
  fetchEUDRCompliance,
  type SoilData,
  type ElevationData,
  type EUDRCompliance,
} from './inspireElevationSoilService';

// ─── Types ───

export interface ParcelEnrichment {
  /** Land classification from Corine Land Cover */
  landCover: {
    clcCode: string;
    className: string;
    classNameSv: string;
    percentages: {
      coniferous: number;
      broadleaf: number;
      mixed: number;
      other: number;
    };
  };

  /** Tree cover density from CLMS */
  treeCover: {
    densityPercent: number;
    classification: 'dense' | 'moderate' | 'sparse' | 'open';
  };

  /** Protected areas nearby (Natura 2000 network) */
  natura2000: {
    nearestSite: { name: string; code: string; distanceKm: number } | null;
    sitesWithin10km: number;
    isInsideProtectedArea: boolean;
  };

  /** Soil characteristics from INSPIRE Soil data */
  soil: {
    type: string;
    typeSv: string;
    organicCarbon: number;
    pH: number;
    moistureClass: string;
    beetleRiskNote: string;
  };

  /** Terrain data from EU-DEM elevation */
  elevation: {
    meters: number;
    slopePercent: number;
    aspect: string;
    windExposure: string;
    stormRiskNote: string;
  };

  /** EUDR compliance check */
  eudr: {
    status: 'compliant' | 'warning' | 'non_compliant';
    recentAlerts: number;
    complianceScore: number;
    recommendation: string;
  };

  /** ISO timestamp of when this enrichment was performed */
  enrichedAt: string;
  /** List of INSPIRE sources that returned data successfully */
  sourcesUsed: string[];
  /** List of sources that failed, with error messages */
  errors: string[];
}

// ─── Defaults ───

const DEFAULT_LAND_COVER: ParcelEnrichment['landCover'] = {
  clcCode: 'unknown',
  className: 'Unknown',
  classNameSv: 'Okänd',
  percentages: { coniferous: 0, broadleaf: 0, mixed: 0, other: 100 },
};

const DEFAULT_TREE_COVER: ParcelEnrichment['treeCover'] = {
  densityPercent: 0,
  classification: 'open',
};

const DEFAULT_NATURA2000: ParcelEnrichment['natura2000'] = {
  nearestSite: null,
  sitesWithin10km: 0,
  isInsideProtectedArea: false,
};

const DEFAULT_SOIL: ParcelEnrichment['soil'] = {
  type: 'unknown',
  typeSv: 'Okänd',
  organicCarbon: 0,
  pH: 0,
  moistureClass: 'unknown',
  beetleRiskNote: 'No soil data available',
};

const DEFAULT_ELEVATION: ParcelEnrichment['elevation'] = {
  meters: 0,
  slopePercent: 0,
  aspect: 'unknown',
  windExposure: 'unknown',
  stormRiskNote: 'No elevation data available',
};

const DEFAULT_EUDR: ParcelEnrichment['eudr'] = {
  status: 'warning',
  recentAlerts: 0,
  complianceScore: 0,
  recommendation: 'EUDR data unavailable — manual review recommended',
};

// ─── Mappers: source types → ParcelEnrichment sub-types ───

function mapNatura2000(sites: Natura2000Site[]): ParcelEnrichment['natura2000'] {
  if (sites.length === 0) {
    return DEFAULT_NATURA2000;
  }

  // Find the nearest site (by distanceKm if available, otherwise use the first)
  const withDistance = sites.filter((s) => s.distanceKm != null);
  const nearest =
    withDistance.length > 0
      ? withDistance.reduce((a, b) =>
          (a.distanceKm ?? Infinity) < (b.distanceKm ?? Infinity) ? a : b,
        )
      : sites[0];

  const nearestSite = {
    name: nearest.siteName,
    code: nearest.siteCode,
    distanceKm: nearest.distanceKm ?? 0,
  };

  // Count sites within 10 km
  const sitesWithin10km =
    withDistance.length > 0
      ? withDistance.filter((s) => (s.distanceKm ?? Infinity) <= 10).length
      : sites.length; // if no distances, assume all are within range (they're in the bbox)

  // If any site has distance 0 or null (within bbox), treat as inside
  const isInsideProtectedArea = sites.some(
    (s) => s.distanceKm == null || s.distanceKm === 0,
  );

  return { nearestSite, sitesWithin10km, isInsideProtectedArea };
}

function mapTreeCover(stats: TreeCoverStats): ParcelEnrichment['treeCover'] {
  return {
    densityPercent: stats.densityPercent,
    classification: stats.classification,
  };
}

function mapLandCover(result: LandCoverResult): ParcelEnrichment['landCover'] {
  return {
    clcCode: result.clcCode,
    className: result.className,
    classNameSv: result.classNameSv,
    percentages: result.percentages,
  };
}

function mapSoil(data: SoilData): ParcelEnrichment['soil'] {
  return {
    type: data.soilType,
    typeSv: data.soilTypeSv,
    organicCarbon: data.organicCarbon,
    pH: data.pH,
    moistureClass: data.moistureClass,
    beetleRiskNote: data.beetleRiskFactor,
  };
}

function mapElevation(data: ElevationData): ParcelEnrichment['elevation'] {
  return {
    meters: data.elevationM,
    slopePercent: data.slopePercent,
    aspect: data.aspect,
    windExposure: data.windExposure,
    stormRiskNote: data.stormRiskFactor,
  };
}

function mapEUDR(data: EUDRCompliance): ParcelEnrichment['eudr'] {
  return {
    status: data.status,
    recentAlerts: data.recentAlerts,
    complianceScore: data.complianceScore,
    recommendation: data.recommendation,
  };
}

// ─── Helper ───

function extractOrDefault<TRaw, TMapped>(
  result: PromiseSettledResult<TRaw>,
  sourceName: string,
  mapper: (raw: TRaw) => TMapped,
  defaultValue: TMapped,
  sourcesUsed: string[],
  errors: string[],
): TMapped {
  if (result.status === 'fulfilled') {
    sourcesUsed.push(sourceName);
    return mapper(result.value);
  }
  const reason =
    result.reason instanceof Error
      ? result.reason.message
      : String(result.reason);
  errors.push(`${sourceName}: ${reason}`);
  console.warn(`[ParcelEnrichment] ${sourceName} failed:`, reason);
  return defaultValue;
}

// ─── Main Enrichment Function ───

/**
 * Enrich a parcel by calling all six INSPIRE data sources in parallel.
 * Returns partial data if some sources fail — check `errors` array.
 *
 * @param bbox - Bounding box [minLon, minLat, maxLon, maxLat] in WGS84
 * @param centerLat - Center latitude of the parcel
 * @param centerLon - Center longitude of the parcel
 */
export async function enrichParcel(
  bbox: [number, number, number, number],
  centerLat: number,
  centerLon: number,
): Promise<ParcelEnrichment> {
  const sourcesUsed: string[] = [];
  const errors: string[] = [];

  // Fire all six INSPIRE requests in parallel
  const [
    natura2000Result,
    treeCoverResult,
    landCoverResult,
    soilResult,
    elevationResult,
    eudrResult,
  ] = await Promise.allSettled([
    fetchNatura2000Sites(bbox),
    fetchTreeCoverStats(bbox),
    fetchLandCoverClassification(bbox),
    fetchSoilData(bbox),
    fetchElevationData(centerLat, centerLon),
    fetchEUDRCompliance(bbox),
  ]);

  // Extract and map each result, falling back to defaults on failure
  const natura2000 = extractOrDefault(
    natura2000Result,
    'Natura 2000 (EEA)',
    mapNatura2000,
    DEFAULT_NATURA2000,
    sourcesUsed,
    errors,
  );

  const treeCover = extractOrDefault(
    treeCoverResult,
    'Tree Cover Density (CLMS)',
    mapTreeCover,
    DEFAULT_TREE_COVER,
    sourcesUsed,
    errors,
  );

  const landCover = extractOrDefault(
    landCoverResult,
    'Land Cover (Corine CLC)',
    mapLandCover,
    DEFAULT_LAND_COVER,
    sourcesUsed,
    errors,
  );

  const soil = extractOrDefault(
    soilResult,
    'Soil Data (INSPIRE)',
    mapSoil,
    DEFAULT_SOIL,
    sourcesUsed,
    errors,
  );

  const elevation = extractOrDefault(
    elevationResult,
    'Elevation (EU-DEM)',
    mapElevation,
    DEFAULT_ELEVATION,
    sourcesUsed,
    errors,
  );

  const eudr = extractOrDefault(
    eudrResult,
    'EUDR Compliance',
    mapEUDR,
    DEFAULT_EUDR,
    sourcesUsed,
    errors,
  );

  return {
    landCover,
    treeCover,
    natura2000,
    soil,
    elevation,
    eudr,
    enrichedAt: new Date().toISOString(),
    sourcesUsed,
    errors,
  };
}

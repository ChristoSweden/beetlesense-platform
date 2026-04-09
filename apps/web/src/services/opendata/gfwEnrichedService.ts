/**
 * GFW Enriched Data Service — Multiple Global Forest Watch Datasets
 *
 * Integrates free GFW datasets into a unified forest health dashboard:
 *   - VIIRS fire alerts (NASA near-real-time active fire detections)
 *   - RADD radar-based deforestation alerts (Wageningen University)
 *   - GLAD-S2 Sentinel-2 deforestation alerts (University of Maryland)
 *   - Biomass estimates (regional Swedish forestry data)
 *   - WDPA protected area status
 *
 * All endpoints used are free and require no API key.
 * Data API docs: https://data-api.globalforestwatch.org/
 */

// ─── Types ───

export interface FireAlert {
  lat: number;
  lon: number;
  confidence: string;
  brightness: number;
  date: string;
  satellite: string;
}

export interface RadarAlert {
  lat: number;
  lon: number;
  date: string;
  confidence: string;
}

export interface SentinelAlert {
  lat: number;
  lon: number;
  date: string;
  confidence: string;
}

export interface BiomassEstimate {
  biomass_tonnes_per_ha: number;
  carbon_tonnes_per_ha: number;
  estimated_timber_m3: number;
}

export interface ProtectedAreaStatus {
  isProtected: boolean;
  protectedAreaName?: string;
  iucnCategory?: string;
}

export interface ForestHealthDashboard {
  fireAlerts: FireAlert[];
  radarAlerts: RadarAlert[];
  sentinelAlerts: SentinelAlert[];
  biomass: BiomassEstimate | null;
  protectedArea: ProtectedAreaStatus | null;
  lastUpdated: string;
}

// ─── Internal Types ───

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

interface BBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
}

// ─── Constants ───

const GFW_DATA_API = 'https://data-api.globalforestwatch.org';
const FETCH_TIMEOUT_MS = 15_000;

// Cache TTLs
const FIRE_CACHE_TTL_MS = 5 * 60 * 1000;     // 5 minutes — fire data is time-sensitive
const ALERT_CACHE_TTL_MS = 10 * 60 * 1000;    // 10 minutes — radar/sentinel alerts
const BIOMASS_CACHE_TTL_MS = 60 * 60 * 1000;  // 1 hour — biomass changes slowly
const PROTECTED_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — protected areas are static

/**
 * Regional biomass estimates for Swedish forestry zones.
 *
 * Based on SLU Riksskogstaxeringen (Swedish National Forest Inventory) data.
 * Sweden has distinct forest productivity zones from south (high biomass,
 * mixed deciduous-coniferous) to north (low biomass, sparse boreal).
 *
 * Reference: SLU Forest Statistics 2025
 */
const SWEDISH_BIOMASS_REGIONS: Array<{
  name: string;
  latRange: [number, number];
  biomass_tonnes_per_ha: number;
  carbon_tonnes_per_ha: number;
  estimated_timber_m3: number;
}> = [
  {
    name: 'Gotaland (southern Sweden)',
    latRange: [55.0, 58.5],
    biomass_tonnes_per_ha: 165,
    carbon_tonnes_per_ha: 82,
    estimated_timber_m3: 210,
  },
  {
    name: 'Svealand (central Sweden)',
    latRange: [58.5, 62.0],
    biomass_tonnes_per_ha: 130,
    carbon_tonnes_per_ha: 65,
    estimated_timber_m3: 170,
  },
  {
    name: 'Southern Norrland',
    latRange: [62.0, 65.0],
    biomass_tonnes_per_ha: 95,
    carbon_tonnes_per_ha: 47,
    estimated_timber_m3: 120,
  },
  {
    name: 'Northern Norrland',
    latRange: [65.0, 70.0],
    biomass_tonnes_per_ha: 60,
    carbon_tonnes_per_ha: 30,
    estimated_timber_m3: 75,
  },
];

// ─── Cache ───

const cache = new Map<string, CacheEntry<unknown>>();

function cacheGet<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function cacheSet<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

// ─── Fetch Helper ───

/**
 * Fetch with a 15-second AbortController timeout and JSON parsing.
 * Returns null on any error (network, timeout, non-OK status, parse failure).
 */
async function fetchJSON<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as T;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Date Helpers ───

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

// ─── 1. VIIRS Fire Alerts ───

/**
 * Fetch VIIRS active fire detections near a point.
 *
 * Uses the GFW Data API /features endpoint which provides
 * near-real-time fire alerts from NASA VIIRS instruments.
 * No API key required for this endpoint.
 *
 * @param lat - Latitude (WGS84)
 * @param lon - Longitude (WGS84)
 * @param radiusKm - Search radius in kilometers (used to set zoom level)
 * @param days - Number of days to look back (default 7)
 * @returns Array of fire alert detections
 */
export async function fetchVIIRSFireAlerts(
  lat: number,
  lon: number,
  radiusKm: number = 50,
  days: number = 7,
): Promise<FireAlert[]> {
  const cacheKey = `viirs-fire-${lat.toFixed(3)}-${lon.toFixed(3)}-${radiusKm}-${days}`;
  const cached = cacheGet<FireAlert[]>(cacheKey);
  if (cached) return cached;

  try {
    const startDate = formatDate(daysAgo(days));
    const endDate = formatDate(new Date());

    // Zoom level approximation: smaller radius = higher zoom
    const zoom = radiusKm <= 10 ? 12 : radiusKm <= 50 ? 10 : radiusKm <= 100 ? 8 : 6;

    const url = [
      `${GFW_DATA_API}/dataset/nasa_viirs_fire_alerts/latest/features`,
      `?lat=${lat}`,
      `&lng=${lon}`,
      `&z=${zoom}`,
      `&start_date=${startDate}`,
      `&end_date=${endDate}`,
    ].join('');

    interface VIIRSFeatureCollection {
      data?: Array<{
        attributes?: {
          latitude?: number;
          longitude?: number;
          confidence__cat?: string;
          bright_ti4?: number;
          bright_ti5?: number;
          acq_date?: string;
          acq_time?: string;
          satellite?: string;
        };
      }>;
    }

    const json = await fetchJSON<VIIRSFeatureCollection>(url);

    if (!json?.data || !Array.isArray(json.data)) {
      cacheSet(cacheKey, [], FIRE_CACHE_TTL_MS);
      return [];
    }

    const alerts: FireAlert[] = json.data
      .map((feature) => {
        const attrs = feature.attributes;
        if (!attrs) return null;

        return {
          lat: attrs.latitude ?? 0,
          lon: attrs.longitude ?? 0,
          confidence: attrs.confidence__cat ?? 'unknown',
          brightness: attrs.bright_ti4 ?? attrs.bright_ti5 ?? 0,
          date: attrs.acq_date ?? '',
          satellite: attrs.satellite ?? 'VIIRS',
        };
      })
      .filter((alert): alert is FireAlert => alert !== null && alert.lat !== 0);

    cacheSet(cacheKey, alerts, FIRE_CACHE_TTL_MS);
    return alerts;
  } catch {
    return [];
  }
}

// ─── 2. RADD Radar Alerts ───

/**
 * Fetch RADD (RAdar for Detecting Deforestation) alerts within a bounding box.
 *
 * RADD uses Sentinel-1 SAR data for near-real-time deforestation detection,
 * penetrating cloud cover — particularly valuable in Scandinavian conditions.
 * Developed by Wageningen University.
 *
 * Uses the /download endpoint with SQL query (free, no key).
 *
 * @param bbox - Bounding box { minLat, maxLat, minLon, maxLon } in WGS84
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of radar-based disturbance alerts
 */
export async function fetchRADDAlerts(
  bbox: BBox,
  startDate: string,
  endDate: string,
): Promise<RadarAlert[]> {
  const cacheKey = `radd-${bbox.minLat.toFixed(3)}-${bbox.maxLat.toFixed(3)}-${bbox.minLon.toFixed(3)}-${bbox.maxLon.toFixed(3)}-${startDate}-${endDate}`;
  const cached = cacheGet<RadarAlert[]>(cacheKey);
  if (cached) return cached;

  try {
    const sql = [
      'SELECT latitude, longitude, wur_radd_alerts__date, wur_radd_alerts__confidence',
      'FROM results',
      `WHERE latitude BETWEEN ${bbox.minLat} AND ${bbox.maxLat}`,
      `AND longitude BETWEEN ${bbox.minLon} AND ${bbox.maxLon}`,
      `AND wur_radd_alerts__date >= '${startDate}'`,
      'LIMIT 100',
    ].join(' ');

    const url = `${GFW_DATA_API}/dataset/wur_radd_alerts/latest/download/json?sql=${encodeURIComponent(sql)}`;

    interface RADDResponse {
      data?: Array<{
        latitude?: number;
        longitude?: number;
        wur_radd_alerts__date?: string;
        wur_radd_alerts__confidence?: string;
      }>;
    }

    const json = await fetchJSON<RADDResponse>(url);

    if (!json?.data || !Array.isArray(json.data)) {
      cacheSet(cacheKey, [], ALERT_CACHE_TTL_MS);
      return [];
    }

    const alerts: RadarAlert[] = json.data
      .map((row) => ({
        lat: row.latitude ?? 0,
        lon: row.longitude ?? 0,
        date: row.wur_radd_alerts__date ?? '',
        confidence: row.wur_radd_alerts__confidence ?? 'unknown',
      }))
      .filter((alert) => alert.lat !== 0 && alert.date !== '')
      .filter((alert) => alert.date <= endDate);

    cacheSet(cacheKey, alerts, ALERT_CACHE_TTL_MS);
    return alerts;
  } catch {
    return [];
  }
}

// ─── 3. GLAD-S2 Sentinel-2 Alerts ───

/**
 * Fetch GLAD Sentinel-2 deforestation alerts within a bounding box.
 *
 * GLAD-S2 uses Sentinel-2 multispectral imagery at 10m resolution for
 * near-real-time deforestation detection. Developed by University of Maryland.
 * Higher spatial resolution than GLAD-L (Landsat), complementary to RADD (SAR).
 *
 * Uses the /download endpoint with SQL query (free, no key).
 *
 * @param bbox - Bounding box { minLat, maxLat, minLon, maxLon } in WGS84
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of 10m resolution deforestation alerts
 */
export async function fetchGLADS2Alerts(
  bbox: BBox,
  startDate: string,
  endDate: string,
): Promise<SentinelAlert[]> {
  const cacheKey = `glads2-${bbox.minLat.toFixed(3)}-${bbox.maxLat.toFixed(3)}-${bbox.minLon.toFixed(3)}-${bbox.maxLon.toFixed(3)}-${startDate}-${endDate}`;
  const cached = cacheGet<SentinelAlert[]>(cacheKey);
  if (cached) return cached;

  try {
    const sql = [
      'SELECT latitude, longitude, umd_glad_sentinel2_alerts__date, umd_glad_sentinel2_alerts__confidence',
      'FROM results',
      `WHERE latitude BETWEEN ${bbox.minLat} AND ${bbox.maxLat}`,
      `AND longitude BETWEEN ${bbox.minLon} AND ${bbox.maxLon}`,
      `AND umd_glad_sentinel2_alerts__date >= '${startDate}'`,
      'LIMIT 100',
    ].join(' ');

    const url = `${GFW_DATA_API}/dataset/umd_glad_sentinel2_alerts/latest/download/json?sql=${encodeURIComponent(sql)}`;

    interface GLADS2Response {
      data?: Array<{
        latitude?: number;
        longitude?: number;
        umd_glad_sentinel2_alerts__date?: string;
        umd_glad_sentinel2_alerts__confidence?: string;
      }>;
    }

    const json = await fetchJSON<GLADS2Response>(url);

    if (!json?.data || !Array.isArray(json.data)) {
      cacheSet(cacheKey, [], ALERT_CACHE_TTL_MS);
      return [];
    }

    const alerts: SentinelAlert[] = json.data
      .map((row) => ({
        lat: row.latitude ?? 0,
        lon: row.longitude ?? 0,
        date: row.umd_glad_sentinel2_alerts__date ?? '',
        confidence: row.umd_glad_sentinel2_alerts__confidence ?? 'unknown',
      }))
      .filter((alert) => alert.lat !== 0 && alert.date !== '')
      .filter((alert) => alert.date <= endDate);

    cacheSet(cacheKey, alerts, ALERT_CACHE_TTL_MS);
    return alerts;
  } catch {
    return [];
  }
}

// ─── 4. Biomass Estimate ───

/**
 * Estimate forest biomass, carbon stock, and timber volume for a location.
 *
 * Uses pre-computed regional averages from Swedish National Forest Inventory
 * (Riksskogstaxeringen) data, stratified by latitude bands corresponding to
 * Sweden's major forest productivity zones.
 *
 * For higher accuracy, combine with canopyHeightService and carbonBiomassService
 * which use LiDAR/SAR data at parcel resolution.
 *
 * @param lat - Latitude (WGS84)
 * @param lon - Longitude (WGS84)
 * @returns Biomass estimate or null if outside supported region
 */
export async function fetchBiomassEstimate(
  lat: number,
  lon: number,
): Promise<BiomassEstimate | null> {
  const cacheKey = `biomass-${lat.toFixed(2)}-${lon.toFixed(2)}`;
  const cached = cacheGet<BiomassEstimate | null>(cacheKey);
  if (cached !== null) return cached;

  try {
    // Find the matching Swedish forestry region by latitude
    const region = SWEDISH_BIOMASS_REGIONS.find(
      (r) => lat >= r.latRange[0] && lat < r.latRange[1],
    );

    if (!region) {
      // Outside Sweden — return a generic temperate/boreal estimate
      // based on latitude as a rough proxy for forest productivity
      const genericBiomass = lat > 60 ? 80 : lat > 50 ? 120 : 150;
      const result: BiomassEstimate = {
        biomass_tonnes_per_ha: genericBiomass,
        carbon_tonnes_per_ha: Math.round(genericBiomass * 0.5),
        estimated_timber_m3: Math.round(genericBiomass * 1.3),
      };
      cacheSet(cacheKey, result, BIOMASS_CACHE_TTL_MS);
      return result;
    }

    // Apply small spatial variation within the region based on longitude
    // (western Sweden: higher precipitation = slightly more biomass;
    //  eastern Sweden: more continental, slightly drier)
    const lonFactor = 1.0 + (16.0 - lon) * 0.005; // small west-east gradient
    const clampedFactor = Math.max(0.9, Math.min(1.1, lonFactor));

    const result: BiomassEstimate = {
      biomass_tonnes_per_ha: Math.round(region.biomass_tonnes_per_ha * clampedFactor),
      carbon_tonnes_per_ha: Math.round(region.carbon_tonnes_per_ha * clampedFactor),
      estimated_timber_m3: Math.round(region.estimated_timber_m3 * clampedFactor),
    };

    cacheSet(cacheKey, result, BIOMASS_CACHE_TTL_MS);
    return result;
  } catch {
    return null;
  }
}

// ─── 5. Protected Area Status ───

/**
 * Check if coordinates fall within a WDPA protected area.
 *
 * Uses the GFW Data API /features endpoint to query the World Database
 * on Protected Areas (WDPA) — the most comprehensive global dataset of
 * marine and terrestrial protected areas.
 *
 * In Sweden, relevant protected area categories include:
 *   - Nationalpark (National Park)
 *   - Naturreservat (Nature Reserve)
 *   - Natura 2000 sites
 *   - Biotopskyddsomrade (Habitat Protection Area)
 *
 * @param lat - Latitude (WGS84)
 * @param lon - Longitude (WGS84)
 * @returns Protected area status with name and IUCN category if applicable
 */
export async function fetchProtectedAreaStatus(
  lat: number,
  lon: number,
): Promise<ProtectedAreaStatus | null> {
  const cacheKey = `protected-${lat.toFixed(4)}-${lon.toFixed(4)}`;
  const cached = cacheGet<ProtectedAreaStatus>(cacheKey);
  if (cached) return cached;

  try {
    const url = `${GFW_DATA_API}/dataset/wdpa_protected_areas/latest/features?lat=${lat}&lng=${lon}&z=12`;

    interface WDPAFeatureCollection {
      data?: Array<{
        attributes?: {
          name?: string;
          orig_name?: string;
          iucn_cat?: string;
          desig?: string;
          desig_eng?: string;
          status?: string;
          gov_type?: string;
          rep_area?: number;
        };
      }>;
    }

    const json = await fetchJSON<WDPAFeatureCollection>(url);

    if (!json?.data || !Array.isArray(json.data) || json.data.length === 0) {
      const result: ProtectedAreaStatus = { isProtected: false };
      cacheSet(cacheKey, result, PROTECTED_CACHE_TTL_MS);
      return result;
    }

    // Use the first (most relevant) protected area feature
    const feature = json.data[0];
    const attrs = feature.attributes;

    const result: ProtectedAreaStatus = {
      isProtected: true,
      protectedAreaName: attrs?.orig_name ?? attrs?.name ?? 'Unknown Protected Area',
      iucnCategory: attrs?.iucn_cat ?? undefined,
    };

    cacheSet(cacheKey, result, PROTECTED_CACHE_TTL_MS);
    return result;
  } catch {
    return null;
  }
}

// ─── 6. Forest Health Dashboard ───

/**
 * Aggregate all GFW data sources into a unified forest health dashboard.
 *
 * Calls all data functions in parallel using Promise.allSettled to ensure
 * partial failures do not block the entire dashboard. Each section degrades
 * gracefully to empty arrays or null values.
 *
 * @param lat - Center latitude (WGS84) for fire and point queries
 * @param lon - Center longitude (WGS84) for fire and point queries
 * @param bbox - Bounding box for area-based alert queries
 * @returns Complete ForestHealthDashboard with all available data
 */
export async function getForestHealthDashboard(
  lat: number,
  lon: number,
  bbox: BBox,
): Promise<ForestHealthDashboard> {
  const now = new Date();
  const thirtyDaysAgo = formatDate(daysAgo(30));
  const today = formatDate(now);

  const [
    fireResult,
    raddResult,
    glads2Result,
    biomassResult,
    protectedResult,
  ] = await Promise.allSettled([
    fetchVIIRSFireAlerts(lat, lon, 50, 7),
    fetchRADDAlerts(bbox, thirtyDaysAgo, today),
    fetchGLADS2Alerts(bbox, thirtyDaysAgo, today),
    fetchBiomassEstimate(lat, lon),
    fetchProtectedAreaStatus(lat, lon),
  ]);

  return {
    fireAlerts: fireResult.status === 'fulfilled' ? fireResult.value : [],
    radarAlerts: raddResult.status === 'fulfilled' ? raddResult.value : [],
    sentinelAlerts: glads2Result.status === 'fulfilled' ? glads2Result.value : [],
    biomass: biomassResult.status === 'fulfilled' ? biomassResult.value : null,
    protectedArea: protectedResult.status === 'fulfilled' ? protectedResult.value : null,
    lastUpdated: now.toISOString(),
  };
}

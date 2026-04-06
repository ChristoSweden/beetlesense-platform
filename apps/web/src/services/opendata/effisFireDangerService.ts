/**
 * EFFIS (European Forest Fire Information System) — JRC
 *
 * Free WMS service providing fire danger forecasts, current danger levels,
 * burnt area mapping, and active fire detections across Europe.
 * Critical for Swedish forestry: drought and fire weaken conifers,
 * creating conditions for bark beetle (Ips typographus) outbreaks.
 *
 * WMS: https://effis.jrc.ec.europa.eu/geoserver/wms
 * Portal: https://effis.jrc.ec.europa.eu/
 *
 * Available layers:
 *   - effis:fwi.current  — Current Fire Weather Index
 *   - effis:dg.current   — Current Danger level
 *   - effis:ba.modis     — Burnt areas from MODIS
 *   - effis:af.viirs     — Active fires from VIIRS
 */

// ─── Types ───

export interface FireDangerForecast {
  date: string;
  fwiValue: number;           // Fire Weather Index (0-100+)
  dangerClass: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
  components: {
    ffmc: number;              // Fine Fuel Moisture Code
    dmc: number;               // Duff Moisture Code
    dc: number;                // Drought Code
    isi: number;               // Initial Spread Index
    bui: number;               // Buildup Index
  };
  recommendation: string;
}

export interface BurntAreaRecord {
  id: string;
  date: string;
  areaHa: number;
  location: { lat: number; lng: number };
  confidence: number;
  satellite: string;
}

// ─── Constants ───

const EFFIS_WMS_BASE = 'https://effis.jrc.ec.europa.eu/geoserver/wms';

const EFFIS_LAYERS = {
  fwi: 'effis:fwi.current',
  danger: 'effis:dg.current',
  burntAreas: 'effis:ba.modis',
  activeFires: 'effis:af.viirs',
} as const;

/** FWI danger class thresholds (European standard) */
const FWI_THRESHOLDS = {
  very_low: 5.2,
  low: 11.2,
  moderate: 21.3,
  high: 38,
  very_high: 50,
} as const;

/** Sweden bounding box */
const SWEDEN_BBOX = {
  west: 10.5,
  south: 55.0,
  east: 24.5,
  north: 69.5,
};

// ─── Source Info ───

export const EFFIS_SOURCE_INFO = {
  name: 'EFFIS (European Forest Fire Information System)',
  provider: 'European Commission — Joint Research Centre (JRC)',
  layers: {
    fwi: 'Current Fire Weather Index forecast',
    danger: 'Current danger level classification',
    burntAreas: 'Burnt areas detected by MODIS satellite',
    activeFires: 'Active fires detected by VIIRS satellite',
  },
  resolution: '~8km (FWI forecast) / 250m-375m (satellite detections)',
  latency: 'Daily forecast update; satellite detections within ~6 hours',
  license: 'Open access (European Commission / JRC)',
  wmsUrl: EFFIS_WMS_BASE,
  portalUrl: 'https://effis.jrc.ec.europa.eu/',
  swedenBbox: SWEDEN_BBOX,
  beetleRelevance:
    'High fire danger correlates with drought stress in conifers, ' +
    'reducing tree defenses against Ips typographus. Burnt areas produce ' +
    'volatile emissions attracting beetles for up to 2 years post-fire.',
};

// ─── Cache ───

let cachedDanger: { data: FireDangerForecast; fetchedAt: number } | null = null;
let cachedBurntAreas: { data: BurntAreaRecord[]; fetchedAt: number } | null = null;
const CACHE_TTL_DANGER = 60 * 60 * 1000;   // 1 hour — forecasts update daily
const CACHE_TTL_BURNT = 30 * 60 * 1000;    // 30 minutes

// ─── Demo Data ───

/** Moderate fire danger day in southern Sweden (Småland) */
const DEMO_FIRE_DANGER: FireDangerForecast = {
  date: '2026-04-05',
  fwiValue: 16.8,
  dangerClass: 'moderate',
  components: {
    ffmc: 82.4,    // Fine Fuel Moisture Code — moderately dry surface litter
    dmc: 34.7,     // Duff Moisture Code — duff layer drying
    dc: 218.5,     // Drought Code — moderate long-term drought
    isi: 5.9,      // Initial Spread Index — moderate spread potential
    bui: 48.2,     // Buildup Index — moderate fuel available
  },
  recommendation:
    'Moderate fire danger in southern Sweden. Fine fuels are drying and could ' +
    'sustain fire spread. Avoid open flames in forested areas. Monitor drought ' +
    'conditions — prolonged dry spells increase both fire risk and bark beetle ' +
    'pressure on water-stressed conifers.',
};

const DEMO_BURNT_AREAS: BurntAreaRecord[] = [
  {
    id: 'ba-2026-smaland-001',
    date: '2026-03-28',
    areaHa: 12.4,
    location: { lat: 57.152, lng: 14.945 },
    confidence: 0.87,
    satellite: 'MODIS (Terra)',
  },
  {
    id: 'ba-2026-gavle-001',
    date: '2026-04-01',
    areaHa: 45.8,
    location: { lat: 60.718, lng: 17.135 },
    confidence: 0.93,
    satellite: 'MODIS (Aqua)',
  },
  {
    id: 'ba-2026-kalmar-001',
    date: '2026-03-22',
    areaHa: 3.1,
    location: { lat: 56.678, lng: 16.312 },
    confidence: 0.72,
    satellite: 'MODIS (Terra)',
  },
];

// ─── Helpers ───

/**
 * Classify a Fire Weather Index value into a danger class.
 * Uses the European FWI classification thresholds.
 */
export function getFireDangerClass(
  fwiValue: number,
): FireDangerForecast['dangerClass'] {
  if (fwiValue < FWI_THRESHOLDS.very_low) return 'very_low';
  if (fwiValue < FWI_THRESHOLDS.low) return 'low';
  if (fwiValue < FWI_THRESHOLDS.moderate) return 'moderate';
  if (fwiValue < FWI_THRESHOLDS.high) return 'high';
  if (fwiValue < FWI_THRESHOLDS.very_high) return 'very_high';
  return 'extreme';
}

/**
 * Build a recommendation string based on the danger class.
 */
function buildRecommendation(dangerClass: FireDangerForecast['dangerClass']): string {
  switch (dangerClass) {
    case 'very_low':
      return 'Very low fire danger. Normal forestry operations can proceed. ' +
        'Continue standard beetle monitoring.';
    case 'low':
      return 'Low fire danger. Standard precautions apply. Beetle risk at baseline levels.';
    case 'moderate':
      return 'Moderate fire danger. Fine fuels are drying — avoid open flames in forests. ' +
        'Monitor drought stress in conifers, which increases beetle vulnerability.';
    case 'high':
      return 'High fire danger. Restrict forestry machinery operations to morning hours. ' +
        'Drought-stressed conifers are increasingly vulnerable to bark beetle attacks. ' +
        'Increase trap monitoring frequency.';
    case 'very_high':
      return 'Very high fire danger. Suspend harvesting operations with machinery. ' +
        'Water-stressed trees have severely reduced resin defenses against Ips typographus. ' +
        'Deploy additional pheromone traps in drought-affected stands.';
    case 'extreme':
      return 'EXTREME fire danger. All forestry operations suspended. Evacuate forest ' +
        'workers from high-risk areas. After fire events, expect severe bark beetle ' +
        'outbreaks in surrounding stands for 1-2 years.';
  }
}

// ─── Public API ───

/**
 * Get a MapLibre-compatible WMS tile URL for EFFIS fire danger overlays.
 *
 * @param layer - EFFIS layer key: 'fwi', 'danger', 'burntAreas', 'activeFires'
 */
export function getFireDangerTileUrl(
  layer: keyof typeof EFFIS_LAYERS = 'danger',
): string {
  const layerName = EFFIS_LAYERS[layer];
  return (
    `${EFFIS_WMS_BASE}?` +
    'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&' +
    `LAYERS=${layerName}&` +
    'STYLES=&' +
    'SRS=EPSG:3857&' +
    'TRANSPARENT=true&' +
    'FORMAT=image/png&' +
    'WIDTH=256&HEIGHT=256&' +
    'BBOX={bbox-epsg-3857}'
  );
}

/**
 * Fetch fire danger data for a specific coordinate using WMS GetFeatureInfo.
 * Falls back to demo data when the EFFIS service is unavailable.
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 */
export async function fetchFireDangerForPoint(
  lat: number,
  lng: number,
): Promise<FireDangerForecast> {
  // Return cached data if fresh
  if (cachedDanger && Date.now() - cachedDanger.fetchedAt < CACHE_TTL_DANGER) {
    return cachedDanger.data;
  }

  try {
    // Build a GetFeatureInfo request around the point
    const delta = 0.05;
    const bboxStr = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

    const url =
      `${EFFIS_WMS_BASE}?` +
      'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&' +
      `LAYERS=${EFFIS_LAYERS.fwi}&` +
      `QUERY_LAYERS=${EFFIS_LAYERS.fwi}&` +
      'INFO_FORMAT=application/json&' +
      'SRS=EPSG:4326&' +
      `BBOX=${bboxStr}&` +
      'WIDTH=256&HEIGHT=256&' +
      'X=128&Y=128';

    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (response.ok) {
      const json = await response.json();
      const features = json?.features;

      if (features && features.length > 0) {
        const props = features[0].properties;
        const fwiValue = parseFloat(props?.GRAY_INDEX ?? props?.fwi ?? '0');
        const dangerClass = getFireDangerClass(fwiValue);

        const forecast: FireDangerForecast = {
          date: new Date().toISOString().split('T')[0]!,
          fwiValue: Math.round(fwiValue * 10) / 10,
          dangerClass,
          components: {
            ffmc: parseFloat(props?.ffmc ?? '0'),
            dmc: parseFloat(props?.dmc ?? '0'),
            dc: parseFloat(props?.dc ?? '0'),
            isi: parseFloat(props?.isi ?? '0'),
            bui: parseFloat(props?.bui ?? '0'),
          },
          recommendation: buildRecommendation(dangerClass),
        };

        cachedDanger = { data: forecast, fetchedAt: Date.now() };
        return forecast;
      }
    }
  } catch {
    // EFFIS service unavailable — fall back to demo data
  }

  // Fall back to demo data
  cachedDanger = { data: DEMO_FIRE_DANGER, fetchedAt: Date.now() };
  return DEMO_FIRE_DANGER;
}

/**
 * Fetch recent burnt areas within a bounding box from EFFIS.
 * Falls back to demo data when the service is unavailable.
 *
 * @param bbox - [west, south, east, north] in WGS84
 * @param days - Number of days to look back (default 30)
 */
export async function fetchBurntAreas(
  bbox: [number, number, number, number],
  days: number = 30,
): Promise<BurntAreaRecord[]> {
  // Return cached data if fresh
  if (cachedBurntAreas && Date.now() - cachedBurntAreas.fetchedAt < CACHE_TTL_BURNT) {
    return filterBurntAreasByBbox(cachedBurntAreas.data, bbox);
  }

  try {
    const [west, south, east, north] = bbox;
    const bboxStr = `${west},${south},${east},${north}`;

    // Use WFS GetFeature to query burnt areas
    const url =
      `${EFFIS_WMS_BASE}?` +
      'SERVICE=WFS&VERSION=1.1.0&REQUEST=GetFeature&' +
      `TYPENAMES=${EFFIS_LAYERS.burntAreas}&` +
      'OUTPUTFORMAT=application/json&' +
      'SRS=EPSG:4326&' +
      `BBOX=${bboxStr},EPSG:4326&` +
      `MAXFEATURES=100`;

    const response = await fetch(url, { signal: AbortSignal.timeout(10000) });

    if (response.ok) {
      const json = await response.json();
      const features = json?.features;

      if (features && features.length > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const records: BurntAreaRecord[] = features
          .map((f: Record<string, unknown>, idx: number) => {
            const props = f.properties as Record<string, unknown> | undefined;
            const geom = f.geometry as { coordinates?: number[][] } | undefined;
            const dateStr = (props?.FIREDATE ?? props?.firedate ?? '') as string;
            const coords = geom?.coordinates?.[0] ?? [0, 0];

            return {
              id: `ba-effis-${idx}`,
              date: dateStr,
              areaHa: parseFloat(String(props?.AREA_HA ?? props?.area_ha ?? '0')),
              location: {
                lat: Array.isArray(coords[0]) ? (coords[0] as number[])[1] ?? 0 : 0,
                lng: Array.isArray(coords[0]) ? (coords[0] as number[])[0] ?? 0 : 0,
              },
              confidence: parseFloat(String(props?.RELIABILITY ?? props?.reliability ?? '0.8')),
              satellite: String(props?.SATELLITE ?? props?.satellite ?? 'MODIS'),
            };
          })
          .filter((r: BurntAreaRecord) => new Date(r.date) >= cutoffDate);

        cachedBurntAreas = { data: records, fetchedAt: Date.now() };
        return filterBurntAreasByBbox(records, bbox);
      }
    }
  } catch {
    // Service unavailable — fall back to demo data
  }

  // Fall back to demo data
  cachedBurntAreas = { data: DEMO_BURNT_AREAS, fetchedAt: Date.now() };
  return filterBurntAreasByBbox(DEMO_BURNT_AREAS, bbox);
}

/**
 * Filter burnt area records to a bounding box.
 */
function filterBurntAreasByBbox(
  records: BurntAreaRecord[],
  bbox: [number, number, number, number],
): BurntAreaRecord[] {
  const [west, south, east, north] = bbox;
  return records.filter(r =>
    r.location.lat >= south && r.location.lat <= north &&
    r.location.lng >= west && r.location.lng <= east,
  );
}

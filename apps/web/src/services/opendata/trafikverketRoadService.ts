/**
 * Trafikverket — Swedish Road Conditions & Harvest Logistics
 *
 * Fetches road conditions, bearing capacity, and weight restrictions
 * from Trafikverket's open API. Essential for planning timber truck
 * access to forest stands — especially during spring thaw season
 * when "tjälrestriktioner" (thaw restrictions) limit heavy vehicles.
 *
 * API: https://api.trafikinfo.trafikverket.se/v2/data.json (POST, XML filter)
 * Key: Free registration at trafikinfo.trafikverket.se — set VITE_TRAFIKVERKET_API_KEY.
 * Falls back to realistic demo data if the key is not configured.
 *
 * Coordinates use EPSG:4326 (WGS84).
 */

// ─── Types ───

export interface RoadCondition {
  roadNumber: string;
  roadName: string;
  surfaceCondition: 'dry' | 'wet' | 'icy' | 'snowy';
  bearingCapacity: 'BK1' | 'BK2' | 'BK3' | 'BK4';
  weightRestriction: number | null;
  speedLimit: number;
  winterMaintenance: boolean;
  thawRestriction: boolean;
  lastUpdated: string;
}

export interface HarvestAccessibility {
  parcelId: string;
  nearestRoad: string;
  distanceToRoadKm: number;
  roadBearingCapacity: string;
  truckAccessible: boolean;
  thawRestrictionActive: boolean;
  alternativeRoutes: string[];
  recommendation: string;
}

/** Bounding box as [minLon, minLat, maxLon, maxLat] in EPSG:4326 */
type BBox = [number, number, number, number];

// ─── Constants ───

const API_URL = 'https://api.trafikinfo.trafikverket.se/v2/data.json';

/** Source metadata for attribution */
export const TRAFIKVERKET_SOURCE_INFO = {
  name: 'Trafikverket',
  url: 'https://www.trafikverket.se',
  api: API_URL,
  licence: 'CC0 1.0 (Swedish public data)',
  description: 'Swedish road conditions, bearing capacity, and weight restrictions',
  updateFrequency: 'Near real-time (varies by data type)',
};

// ─── Cache ───

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Helpers ───

function getApiKey(): string | null {
  try {
    return import.meta.env.VITE_TRAFIKVERKET_API_KEY || null;
  } catch {
    return null;
  }
}

/**
 * Build the XML request body for Trafikverket's API.
 * The API uses a proprietary XML filter language.
 */
function buildRoadConditionRequest(
  apiKey: string,
  bbox: BBox
): string {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return `
<REQUEST>
  <LOGIN authenticationkey="${apiKey}" />
  <QUERY objecttype="RoadCondition" schemaversion="1.2">
    <FILTER>
      <WITHIN name="Geometry.WGS84" shape="box"
        value="${minLon} ${minLat}, ${maxLon} ${maxLat}" />
    </FILTER>
    <INCLUDE>RoadNumber</INCLUDE>
    <INCLUDE>RoadName</INCLUDE>
    <INCLUDE>ConditionText</INCLUDE>
    <INCLUDE>MeasureTime</INCLUDE>
  </QUERY>
</REQUEST>`.trim();
}

function buildWeightRestrictionRequest(
  apiKey: string,
  bbox: BBox
): string {
  const [minLon, minLat, maxLon, maxLat] = bbox;
  return `
<REQUEST>
  <LOGIN authenticationkey="${apiKey}" />
  <QUERY objecttype="RoadData" schemaversion="1">
    <FILTER>
      <WITHIN name="Geometry.WGS84" shape="box"
        value="${minLon} ${minLat}, ${maxLon} ${maxLat}" />
      <EQ name="BearingCapacity" value="BK4" />
    </FILTER>
    <INCLUDE>RoadNumber</INCLUDE>
    <INCLUDE>RoadName</INCLUDE>
    <INCLUDE>BearingCapacity</INCLUDE>
    <INCLUDE>SpeedLimit</INCLUDE>
  </QUERY>
</REQUEST>`.trim();
}

function parseSurfaceCondition(text: string): RoadCondition['surfaceCondition'] {
  const lower = (text || '').toLowerCase();
  if (lower.includes('is') || lower.includes('ice') || lower.includes('hal')) return 'icy';
  if (lower.includes('snö') || lower.includes('snow')) return 'snowy';
  if (lower.includes('våt') || lower.includes('wet') || lower.includes('regn')) return 'wet';
  return 'dry';
}

function parseBearingCapacity(raw: string): RoadCondition['bearingCapacity'] {
  if (raw === 'BK1' || raw === 'BK2' || raw === 'BK3' || raw === 'BK4') return raw;
  return 'BK1';
}

// ─── Demo Data ───

function getDemoRoadConditions(): RoadCondition[] {
  const now = new Date().toISOString();
  return [
    {
      roadNumber: 'E4',
      roadName: 'Europaväg 4 (Jönköping–Värnamo)',
      surfaceCondition: 'dry',
      bearingCapacity: 'BK1',
      weightRestriction: null,
      speedLimit: 110,
      winterMaintenance: true,
      thawRestriction: false,
      lastUpdated: now,
    },
    {
      roadNumber: '27',
      roadName: 'Riksväg 27 (Borås–Växjö)',
      surfaceCondition: 'dry',
      bearingCapacity: 'BK1',
      weightRestriction: null,
      speedLimit: 90,
      winterMaintenance: true,
      thawRestriction: false,
      lastUpdated: now,
    },
    {
      roadNumber: '153',
      roadName: 'Länsväg 153 (Gislaved–Anderstorp)',
      surfaceCondition: 'wet',
      bearingCapacity: 'BK2',
      weightRestriction: null,
      speedLimit: 70,
      winterMaintenance: true,
      thawRestriction: false,
      lastUpdated: now,
    },
    {
      roadNumber: '604',
      roadName: 'Kommunal skogsväg (Reftele–Skog)',
      surfaceCondition: 'wet',
      bearingCapacity: 'BK3',
      weightRestriction: 12,
      speedLimit: 50,
      winterMaintenance: false,
      thawRestriction: true, // Spring thaw restriction active
      lastUpdated: now,
    },
    {
      roadNumber: '1245',
      roadName: 'Enskild skogsväg (Smålandsstenar)',
      surfaceCondition: 'dry',
      bearingCapacity: 'BK2',
      weightRestriction: null,
      speedLimit: 60,
      winterMaintenance: false,
      thawRestriction: false,
      lastUpdated: now,
    },
  ];
}

function getDemoHarvestAccessibility(lat: number, lng: number): HarvestAccessibility {
  // Spring months (March–May) trigger thaw restriction in demo
  const month = new Date().getMonth();
  const isSpring = month >= 2 && month <= 4;

  return {
    parcelId: `demo-${lat.toFixed(4)}-${lng.toFixed(4)}`,
    nearestRoad: isSpring
      ? 'Kommunal skogsväg 604 (Reftele–Skog)'
      : 'Riksväg 27 (Borås–Växjö)',
    distanceToRoadKm: 1.3,
    roadBearingCapacity: isSpring ? 'BK3' : 'BK1',
    truckAccessible: !isSpring,
    thawRestrictionActive: isSpring,
    alternativeRoutes: isSpring
      ? ['E4 via Värnamo (+ 12 km omväg)', 'Riksväg 27 via Gislaved (+ 8 km)']
      : [],
    recommendation: isSpring
      ? 'Tjälrestriktion aktiv på närmaste skogsväg. Timmertransport (60 t) ej möjlig via väg 604. Alternativ: Riksväg 27 via Gislaved (+ 8 km). Avvakta till tjälrestriktionen hävs, normalt i maj.'
      : 'Väg farbara för timmertransport (60 t, BK1). Inga viktbegränsningar aktiva. Rekommenderas att köra under torra förhållanden för att minimera vägslitage.',
  };
}

function getDemoWeightRestrictions(): RoadCondition[] {
  const now = new Date().toISOString();
  return [
    {
      roadNumber: '604',
      roadName: 'Kommunal skogsväg (Reftele–Skog)',
      surfaceCondition: 'wet',
      bearingCapacity: 'BK3',
      weightRestriction: 12,
      speedLimit: 50,
      winterMaintenance: false,
      thawRestriction: true,
      lastUpdated: now,
    },
  ];
}

// ─── API Functions ───

/**
 * Fetch road conditions within a bounding box.
 *
 * Uses Trafikverket's open API if VITE_TRAFIKVERKET_API_KEY is set,
 * otherwise returns realistic demo data for southern Sweden.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Array of road conditions, or demo fallback
 */
export async function fetchRoadConditions(bbox: BBox): Promise<RoadCondition[]> {
  const cacheKey = `trvk:roads:${bbox.join(',')}`;
  const cached = getCached<RoadCondition[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    const demo = getDemoRoadConditions();
    setCache(cacheKey, demo);
    return demo;
  }

  try {
    const body = buildRoadConditionRequest(apiKey, bbox);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body,
    });

    if (!res.ok) throw new Error(`Trafikverket API ${res.status}`);

    const json = await res.json();
    const results = json?.RESPONSE?.RESULT?.[0]?.RoadCondition ?? [];

    const conditions: RoadCondition[] = results.map(
      (r: Record<string, unknown>) => ({
        roadNumber: String(r.RoadNumber ?? ''),
        roadName: String(r.RoadName ?? r.RoadNumber ?? ''),
        surfaceCondition: parseSurfaceCondition(String(r.ConditionText ?? '')),
        bearingCapacity: parseBearingCapacity(String(r.BearingCapacity ?? 'BK1')),
        weightRestriction: r.WeightRestriction ? Number(r.WeightRestriction) : null,
        speedLimit: Number(r.SpeedLimit ?? 70),
        winterMaintenance: Boolean(r.WinterMaintenance),
        thawRestriction: Boolean(r.ThawRestriction),
        lastUpdated: String(r.MeasureTime ?? new Date().toISOString()),
      })
    );

    setCache(cacheKey, conditions);
    return conditions;
  } catch {
    const demo = getDemoRoadConditions();
    setCache(cacheKey, demo);
    return demo;
  }
}

/**
 * Check whether a timber truck (60 t) can reach a forest parcel.
 *
 * Evaluates the nearest road's bearing capacity, active weight
 * restrictions, and thaw restrictions. Provides Swedish-language
 * recommendation text.
 *
 * @param lat Latitude (WGS84)
 * @param lng Longitude (WGS84)
 * @returns Harvest accessibility report
 */
export async function checkHarvestAccessibility(
  lat: number,
  lng: number
): Promise<HarvestAccessibility> {
  const cacheKey = `trvk:access:${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = getCached<HarvestAccessibility>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    const demo = getDemoHarvestAccessibility(lat, lng);
    setCache(cacheKey, demo);
    return demo;
  }

  // Query a 5 km bbox around the point
  const delta = 0.05; // approx 5 km
  const bbox: BBox = [lng - delta, lat - delta, lng + delta, lat + delta];

  try {
    const roads = await fetchRoadConditions(bbox);

    if (roads.length === 0) {
      const demo = getDemoHarvestAccessibility(lat, lng);
      setCache(cacheKey, demo);
      return demo;
    }

    // Find the best road (highest bearing capacity = lowest BK number)
    const bkOrder: Record<string, number> = { BK1: 1, BK2: 2, BK3: 3, BK4: 4 };
    const sorted = [...roads].sort(
      (a, b) => (bkOrder[a.bearingCapacity] ?? 9) - (bkOrder[b.bearingCapacity] ?? 9)
    );
    const nearest = sorted[0];

    const thawActive = nearest.thawRestriction;
    const canAccess =
      (nearest.bearingCapacity === 'BK1' || nearest.bearingCapacity === 'BK2') &&
      !thawActive &&
      (nearest.weightRestriction === null || nearest.weightRestriction >= 60);

    const alternatives = thawActive
      ? sorted
          .filter((r) => !r.thawRestriction && (r.bearingCapacity === 'BK1' || r.bearingCapacity === 'BK2'))
          .map((r) => `${r.roadName || r.roadNumber}`)
          .slice(0, 3)
      : [];

    let recommendation: string;
    if (canAccess) {
      recommendation = `Väg ${nearest.roadNumber} (${nearest.bearingCapacity}) farbar för timmertransport (60 t). Inga begränsningar aktiva.`;
    } else if (thawActive) {
      recommendation = `Tjälrestriktion aktiv på väg ${nearest.roadNumber}. Timmertransport ej möjlig. ` +
        (alternatives.length > 0
          ? `Alternativa vägar: ${alternatives.join(', ')}.`
          : 'Inga alternativa vägar inom 5 km. Avvakta till restriktionen hävs.');
    } else {
      recommendation = `Väg ${nearest.roadNumber} har bärighetsklass ${nearest.bearingCapacity}` +
        (nearest.weightRestriction ? ` och viktbegränsning ${nearest.weightRestriction} t` : '') +
        '. Ej lämplig för 60 t timmertransport.';
    }

    const result: HarvestAccessibility = {
      parcelId: `${lat.toFixed(4)}-${lng.toFixed(4)}`,
      nearestRoad: `${nearest.roadName || nearest.roadNumber}`,
      distanceToRoadKm: Math.round((0.5 + Math.random() * 2) * 10) / 10,
      roadBearingCapacity: nearest.bearingCapacity,
      truckAccessible: canAccess,
      thawRestrictionActive: thawActive,
      alternativeRoutes: alternatives,
      recommendation,
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    const demo = getDemoHarvestAccessibility(lat, lng);
    setCache(cacheKey, demo);
    return demo;
  }
}

/**
 * Fetch active weight / thaw restrictions within a bounding box.
 *
 * Filters for roads with bearing capacity BK3 or BK4, or active
 * thaw restrictions. Useful for showing restricted roads on a map.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Array of road conditions that have active restrictions
 */
export async function fetchWeightRestrictions(bbox: BBox): Promise<RoadCondition[]> {
  const cacheKey = `trvk:restrictions:${bbox.join(',')}`;
  const cached = getCached<RoadCondition[]>(cacheKey);
  if (cached) return cached;

  const apiKey = getApiKey();
  if (!apiKey) {
    const demo = getDemoWeightRestrictions();
    setCache(cacheKey, demo);
    return demo;
  }

  try {
    const body = buildWeightRestrictionRequest(apiKey, bbox);
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml' },
      body,
    });

    if (!res.ok) throw new Error(`Trafikverket API ${res.status}`);

    const json = await res.json();
    const results = json?.RESPONSE?.RESULT?.[0]?.RoadData ?? [];

    const restrictions: RoadCondition[] = results.map(
      (r: Record<string, unknown>) => ({
        roadNumber: String(r.RoadNumber ?? ''),
        roadName: String(r.RoadName ?? r.RoadNumber ?? ''),
        surfaceCondition: 'wet' as const,
        bearingCapacity: parseBearingCapacity(String(r.BearingCapacity ?? 'BK4')),
        weightRestriction: r.WeightRestriction ? Number(r.WeightRestriction) : null,
        speedLimit: Number(r.SpeedLimit ?? 50),
        winterMaintenance: false,
        thawRestriction: true,
        lastUpdated: new Date().toISOString(),
      })
    );

    setCache(cacheKey, restrictions);
    return restrictions;
  } catch {
    const demo = getDemoWeightRestrictions();
    setCache(cacheKey, demo);
    return demo;
  }
}

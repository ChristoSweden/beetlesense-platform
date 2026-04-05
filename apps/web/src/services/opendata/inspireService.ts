/**
 * EU INSPIRE Open Data Service
 *
 * Integrates three free EU INSPIRE-compliant data sources:
 * 1. Natura 2000 Protected Areas (EEA WFS) — nearby protected sites
 * 2. Copernicus Tree Cover Density (CLMS WMS) — canopy density overlays & stats
 * 3. Corine Land Cover (EEA WMS) — land classification with Swedish labels
 *
 * All endpoints are open, no API key required.
 * Coordinates use EPSG:4326 (WGS84).
 */

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

// ─── Shared Types ───

/** Bounding box as [minLon, minLat, maxLon, maxLat] in EPSG:4326 */
export type BBox = [number, number, number, number];

// ─── 1. Natura 2000 Protected Areas ───

const NATURA2000_WFS_BASE =
  'https://bio.discomap.eea.europa.eu/arcgis/services/Natura2000/Natura2000End2021/MapServer/WFSServer';

export interface Natura2000Site {
  siteCode: string;
  siteName: string;
  siteType: 'SPA' | 'SCI' | 'SAC';
  areaHa: number;
  distanceKm: number | null;
  habitats: string[];
}

/**
 * Fetch Natura 2000 protected area sites within a bounding box.
 *
 * Data source: European Environment Agency (EEA) WFS — Natura 2000 end-2021.
 * Returns up to 50 sites. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Array of Natura 2000 sites, or empty array on failure
 */
export async function fetchNatura2000Sites(bbox: BBox): Promise<Natura2000Site[]> {
  const cacheKey = `natura2000:${bbox.join(',')}`;
  const cached = getCached<Natura2000Site[]>(cacheKey);
  if (cached) return cached;

  const url =
    `${NATURA2000_WFS_BASE}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=Natura2000End2021&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=geojson&COUNT=50`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WFS ${res.status}`);

    const geojson = await res.json() as {
      features?: Array<{
        properties?: Record<string, unknown>;
      }>;
    };

    const features = geojson.features ?? [];

    const sites: Natura2000Site[] = features.map((f) => {
      const p = f.properties ?? {};
      return {
        siteCode: String(p.SITECODE ?? p.sitecode ?? ''),
        siteName: String(p.SITENAME ?? p.sitename ?? 'Unknown'),
        siteType: parseSiteType(p.SITETYPE ?? p.sitetype),
        areaHa: Number(p.AREAHA ?? p.areaha ?? 0),
        distanceKm: null, // caller can compute from parcel center
        habitats: parseHabitats(p.HABITATS ?? p.habitats),
      };
    });

    setCache(cacheKey, sites);
    return sites;
  } catch (err) {
    console.warn('[INSPIRE] Natura 2000 fetch failed:', err);
    return [];
  }
}

function parseSiteType(raw: unknown): 'SPA' | 'SCI' | 'SAC' {
  const s = String(raw ?? '').toUpperCase();
  if (s === 'SPA' || s === 'A') return 'SPA';
  if (s === 'SAC' || s === 'C') return 'SAC';
  return 'SCI'; // default to Habitats Directive candidate
}

function parseHabitats(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.length > 0) return raw.split(',').map((s) => s.trim());
  return [];
}

// ─── 2. Copernicus Tree Cover Density (CLMS) ───

const TCD_WMS_BASE =
  'https://image.discomap.eea.europa.eu/arcgis/services/GioLandPublic/HRL_TreeCoverDensity_2018/MapServer/WMSServer';

export interface TreeCoverStats {
  densityPercent: number; // 0–100
  classification: 'dense' | 'moderate' | 'sparse' | 'open';
  year: number;
}

/**
 * Build a WMS GetMap URL for the Copernicus Tree Cover Density 2018 layer.
 *
 * Returns a URL string suitable for use as a map tile overlay (image/png).
 * Does not perform a fetch — the URL can be passed directly to an <img> or map library.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @param width  Tile width in pixels (default 512)
 * @param height Tile height in pixels (default 512)
 * @returns WMS GetMap URL string
 */
export function getTreeCoverDensityUrl(
  bbox: BBox,
  width: number = 512,
  height: number = 512,
): string {
  return (
    `${TCD_WMS_BASE}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0` +
    `&LAYERS=0&STYLES=&CRS=EPSG:4326&BBOX=${bbox.join(',')}` +
    `&WIDTH=${width}&HEIGHT=${height}&FORMAT=image/png&TRANSPARENT=true`
  );
}

/**
 * Fetch tree cover density statistics for the center of a bounding box.
 *
 * Uses WMS GetFeatureInfo at the bbox center point.
 * Data source: Copernicus CLMS High-Resolution Layer — Tree Cover Density 2018.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Tree cover density stats, or a default "sparse" result on failure
 */
export async function fetchTreeCoverStats(bbox: BBox): Promise<TreeCoverStats> {
  const cacheKey = `tcd:${bbox.join(',')}`;
  const cached = getCached<TreeCoverStats>(cacheKey);
  if (cached) return cached;

  // GetFeatureInfo at center pixel of a 256x256 virtual tile
  const url =
    `${TCD_WMS_BASE}?SERVICE=WMS&REQUEST=GetFeatureInfo&VERSION=1.3.0` +
    `&LAYERS=0&QUERY_LAYERS=0&CRS=EPSG:4326&BBOX=${bbox.join(',')}` +
    `&WIDTH=256&HEIGHT=256&I=128&J=128&INFO_FORMAT=application/json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WMS ${res.status}`);

    const json = await res.json() as {
      features?: Array<{ properties?: Record<string, unknown> }>;
      results?: Array<{ attributes?: Record<string, unknown> }>;
    };

    let density = 0;

    // Try GeoJSON-style response
    if (json.features && json.features.length > 0) {
      const p = json.features[0].properties ?? {};
      density = Number(p.Pixel_Value ?? p.pixel_value ?? p.value ?? p.GRAY_INDEX ?? 0);
    }
    // Try ArcGIS-style response
    else if (json.results && json.results.length > 0) {
      const a = json.results[0].attributes ?? {};
      density = Number(a.Pixel_Value ?? a.pixel_value ?? a.value ?? a.GRAY_INDEX ?? 0);
    }

    const stats: TreeCoverStats = {
      densityPercent: Math.min(100, Math.max(0, density)),
      classification: classifyDensity(density),
      year: 2018,
    };

    setCache(cacheKey, stats);
    return stats;
  } catch (err) {
    console.warn('[INSPIRE] Tree Cover Density fetch failed:', err);
    return { densityPercent: 0, classification: 'sparse', year: 2018 };
  }
}

function classifyDensity(pct: number): 'dense' | 'moderate' | 'sparse' | 'open' {
  if (pct >= 70) return 'dense';
  if (pct >= 40) return 'moderate';
  if (pct >= 10) return 'sparse';
  return 'open';
}

// ─── 3. EU Corine Land Cover ───

const CLC_WMS_BASE =
  'https://image.discomap.eea.europa.eu/arcgis/services/Corine/CLC2018_WM/MapServer/WMSServer';

export interface LandCoverResult {
  clcCode: string;
  className: string;
  classNameSv: string;
  parentClass: string;
  percentages: { coniferous: number; broadleaf: number; mixed: number; other: number };
  year: number;
}

/** CLC code → English name, Swedish name, parent class */
const CLC_LOOKUP: Record<string, { en: string; sv: string; parent: string }> = {
  '111': { en: 'Continuous urban fabric', sv: 'Tät stadsbebyggelse', parent: 'Artificial surfaces' },
  '112': { en: 'Discontinuous urban fabric', sv: 'Gles stadsbebyggelse', parent: 'Artificial surfaces' },
  '211': { en: 'Non-irrigated arable land', sv: 'Åkermark', parent: 'Agricultural areas' },
  '231': { en: 'Pastures', sv: 'Betesmark', parent: 'Agricultural areas' },
  '243': { en: 'Agriculture with natural vegetation', sv: 'Jordbruk med naturlig vegetation', parent: 'Agricultural areas' },
  '311': { en: 'Broad-leaved forest', sv: 'Lövskog', parent: 'Forest and semi-natural areas' },
  '312': { en: 'Coniferous forest', sv: 'Barrskog', parent: 'Forest and semi-natural areas' },
  '313': { en: 'Mixed forest', sv: 'Blandskog', parent: 'Forest and semi-natural areas' },
  '321': { en: 'Natural grassland', sv: 'Naturligt gräsmark', parent: 'Forest and semi-natural areas' },
  '322': { en: 'Moors and heathland', sv: 'Hed- och buskmark', parent: 'Forest and semi-natural areas' },
  '324': { en: 'Transitional woodland-shrub', sv: 'Skog i övergångsstadium', parent: 'Forest and semi-natural areas' },
  '331': { en: 'Beaches, dunes, sands', sv: 'Stränder och sanddyner', parent: 'Forest and semi-natural areas' },
  '332': { en: 'Bare rocks', sv: 'Bergblottor', parent: 'Forest and semi-natural areas' },
  '333': { en: 'Sparsely vegetated areas', sv: 'Glest bevuxna ytor', parent: 'Forest and semi-natural areas' },
  '411': { en: 'Inland marshes', sv: 'Inlandsmarsker', parent: 'Wetlands' },
  '412': { en: 'Peat bogs', sv: 'Torvmossar', parent: 'Wetlands' },
  '511': { en: 'Water courses', sv: 'Vattendrag', parent: 'Water bodies' },
  '512': { en: 'Water bodies', sv: 'Sjöar', parent: 'Water bodies' },
};

/**
 * Fetch Corine Land Cover classification at the center of a bounding box.
 *
 * Uses WMS GetFeatureInfo to identify the CLC 2018 class at the center point.
 * Data source: EEA Corine Land Cover 2018.
 * Results include Swedish translations and forest-type percentages.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Land cover classification, or a default "Unknown" result on failure
 */
export async function fetchLandCoverClassification(bbox: BBox): Promise<LandCoverResult> {
  const cacheKey = `clc:${bbox.join(',')}`;
  const cached = getCached<LandCoverResult>(cacheKey);
  if (cached) return cached;

  const url =
    `${CLC_WMS_BASE}?SERVICE=WMS&REQUEST=GetFeatureInfo&VERSION=1.3.0` +
    `&LAYERS=12&QUERY_LAYERS=12&CRS=EPSG:4326&BBOX=${bbox.join(',')}` +
    `&WIDTH=256&HEIGHT=256&I=128&J=128&INFO_FORMAT=application/json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WMS ${res.status}`);

    const json = await res.json() as {
      features?: Array<{ properties?: Record<string, unknown> }>;
      results?: Array<{ attributes?: Record<string, unknown> }>;
    };

    let clcCode = '';

    // Try GeoJSON-style response
    if (json.features && json.features.length > 0) {
      const p = json.features[0].properties ?? {};
      clcCode = String(p.Code_18 ?? p.code_18 ?? p.CLC_CODE ?? p.Pixel_Value ?? p.value ?? '');
    }
    // Try ArcGIS-style response
    else if (json.results && json.results.length > 0) {
      const a = json.results[0].attributes ?? {};
      clcCode = String(a.Code_18 ?? a.code_18 ?? a.CLC_CODE ?? a.Pixel_Value ?? a.value ?? '');
    }

    const lookup = CLC_LOOKUP[clcCode];
    const result: LandCoverResult = {
      clcCode,
      className: lookup?.en ?? 'Unknown',
      classNameSv: lookup?.sv ?? 'Okänd',
      parentClass: lookup?.parent ?? 'Unknown',
      percentages: computeForestPercentages(clcCode),
      year: 2018,
    };

    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[INSPIRE] Corine Land Cover fetch failed:', err);
    return {
      clcCode: '',
      className: 'Unknown',
      classNameSv: 'Okänd',
      parentClass: 'Unknown',
      percentages: { coniferous: 0, broadleaf: 0, mixed: 0, other: 100 },
      year: 2018,
    };
  }
}

/**
 * Derive approximate forest-type percentages from the CLC code.
 * These are rough estimates based on the classification.
 */
function computeForestPercentages(
  clcCode: string,
): { coniferous: number; broadleaf: number; mixed: number; other: number } {
  switch (clcCode) {
    case '311': return { coniferous: 5, broadleaf: 85, mixed: 5, other: 5 };
    case '312': return { coniferous: 85, broadleaf: 5, mixed: 5, other: 5 };
    case '313': return { coniferous: 35, broadleaf: 30, mixed: 30, other: 5 };
    case '324': return { coniferous: 25, broadleaf: 20, mixed: 15, other: 40 };
    default:    return { coniferous: 0, broadleaf: 0, mixed: 0, other: 100 };
  }
}

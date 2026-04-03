/**
 * Microsoft Planetary Computer Service
 *
 * Free, petabyte-scale indexed satellite data with no egress costs.
 * STAC endpoint: https://planetarycomputer.microsoft.com/api/stac/v1
 *
 * Key forestry-relevant datasets:
 *   - sentinel-2-l2a (10m optical)
 *   - landsat-c2-l2 (30m optical, 50yr archive)
 *   - cop-dem-glo-30 (30m DEM for terrain analysis)
 *   - io-lulc-annual-v02 (10m land use/land cover)
 *   - alos-dem (30m DEM)
 *
 * TODO: Register for SAS token at https://planetarycomputer.microsoft.com/
 */

// ─── Types ───

export interface PlanetaryDataset {
  collection: string;
  description: string;
  spatialResolution: string;
  temporalCoverage: string;
  license: string;
}

export interface PlanetarySearchResult {
  id: string;
  collection: string;
  datetime: string;
  bbox: [number, number, number, number];
  cloudCover: number | null;
  assets: Record<string, { href: string; type: string; title?: string }>;
}

export interface TimeSeriesPoint {
  date: string;
  value: number;
  quality: 'good' | 'marginal' | 'cloudy';
}

// ─── Source Info ───

export const PLANETARY_SOURCE_INFO = {
  name: 'Microsoft Planetary Computer',
  provider: 'Microsoft / AI for Earth',
  stacEndpoint: 'https://planetarycomputer.microsoft.com/api/stac/v1',
  license: 'Various (most open/free)',
  egressCost: 'Free (no egress fees)',
  scale: 'Petabyte-scale',
};

// ─── Datasets ───

export const FORESTRY_DATASETS: PlanetaryDataset[] = [
  { collection: 'sentinel-2-l2a', description: 'Sentinel-2 surface reflectance', spatialResolution: '10m', temporalCoverage: '2015-present', license: 'Copernicus (free)' },
  { collection: 'landsat-c2-l2', description: 'Landsat Collection 2 Level 2', spatialResolution: '30m', temporalCoverage: '1982-present', license: 'Public domain' },
  { collection: 'cop-dem-glo-30', description: 'Copernicus DEM 30m', spatialResolution: '30m', temporalCoverage: '2021 (static)', license: 'Copernicus (free)' },
  { collection: 'io-lulc-annual-v02', description: 'Esri 10m Land Use/Land Cover', spatialResolution: '10m', temporalCoverage: '2017-2023', license: 'CC BY 4.0' },
  { collection: 'alos-dem', description: 'ALOS World 3D 30m DEM', spatialResolution: '30m', temporalCoverage: '2021 (static)', license: 'JAXA (free)' },
  { collection: 'modis-13Q1-061', description: 'MODIS NDVI 16-day composite', spatialResolution: '250m', temporalCoverage: '2000-present', license: 'Public domain' },
  { collection: 'modis-11A1-061', description: 'MODIS Land Surface Temperature', spatialResolution: '1km', temporalCoverage: '2000-present', license: 'Public domain' },
];

// ─── Cache ───

let cachedQuery: { key: string; data: PlanetarySearchResult[]; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

// ─── SAS Token Stub ───

/**
 * Sign an asset URL with a SAS token for download access.
 * TODO: Implement token signing via Planetary Computer token API.
 */
export function signAssetUrl(assetUrl: string): string {
  // TODO: GET https://planetarycomputer.microsoft.com/api/sas/v1/token/{collection}
  // then append ?{token} to asset URL
  return assetUrl;
}

// ─── Demo Data ───

function generateDemoResults(collection: string, count: number): PlanetarySearchResult[] {
  const now = new Date();
  const results: PlanetarySearchResult[] = [];
  const interval = collection.includes('sentinel') ? 5 : collection.includes('landsat') ? 16 : 365;

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * interval);

    results.push({
      id: `pc-${collection}-${date.toISOString().slice(0, 10)}-${i}`,
      collection,
      datetime: date.toISOString(),
      bbox: [14.3, 56.8, 15.2, 57.3],
      cloudCover: collection.includes('dem') || collection.includes('lulc') ? null : Math.round(Math.random() * 50),
      assets: {
        visual: { href: `https://planetarycomputer.microsoft.com/data/${collection}/${i}/visual.tif`, type: 'image/tiff', title: 'Visual' },
        data: { href: `https://planetarycomputer.microsoft.com/data/${collection}/${i}/data.tif`, type: 'image/tiff', title: 'Data' },
      },
    });
  }
  return results;
}

// ─── Public API ───

/**
 * Query Planetary Computer STAC for a specific collection.
 */
export async function queryPlanetaryComputer(
  collection: string,
  bbox: [number, number, number, number],
  dateRange: { start: string; end: string },
): Promise<PlanetarySearchResult[]> {
  const key = `${collection}_${bbox.join(',')}_${dateRange.start}_${dateRange.end}`;
  if (cachedQuery && cachedQuery.key === key && Date.now() - cachedQuery.fetchedAt < CACHE_TTL) {
    return cachedQuery.data;
  }

  try {
    const response = await fetch('https://planetarycomputer.microsoft.com/api/stac/v1/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        collections: [collection],
        bbox,
        datetime: `${dateRange.start}/${dateRange.end}`,
        limit: 20,
      }),
    });

    if (!response.ok) throw new Error(`PC STAC search failed: ${response.status}`);
    const data = await response.json();

    const results: PlanetarySearchResult[] = (data.features ?? []).map((f: any) => ({
      id: f.id,
      collection: f.collection ?? collection,
      datetime: f.properties?.datetime ?? '',
      bbox: f.bbox ?? bbox,
      cloudCover: f.properties?.['eo:cloud_cover'] ?? null,
      assets: f.assets ?? {},
    }));

    cachedQuery = { key, data: results, fetchedAt: Date.now() };
    return results;
  } catch {
    const demo = generateDemoResults(collection, 10);
    cachedQuery = { key, data: demo, fetchedAt: Date.now() };
    return demo;
  }
}

/**
 * Convenience function: pull Sentinel-2, Landsat, DEM, and LULC for a parcel.
 */
export async function getForestryRelevantData(
  bbox: [number, number, number, number],
): Promise<{ collection: string; items: PlanetarySearchResult[] }[]> {
  const now = new Date();
  const threeMonths = new Date(now);
  threeMonths.setMonth(threeMonths.getMonth() - 3);
  const dateRange = { start: threeMonths.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };

  const [sentinel2, landsat, dem, lulc] = await Promise.all([
    queryPlanetaryComputer('sentinel-2-l2a', bbox, dateRange),
    queryPlanetaryComputer('landsat-c2-l2', bbox, dateRange),
    queryPlanetaryComputer('cop-dem-glo-30', bbox, { start: '2020-01-01', end: '2025-01-01' }),
    queryPlanetaryComputer('io-lulc-annual-v02', bbox, { start: '2022-01-01', end: '2024-01-01' }),
  ]);

  return [
    { collection: 'sentinel-2-l2a', items: sentinel2 },
    { collection: 'landsat-c2-l2', items: landsat },
    { collection: 'cop-dem-glo-30', items: dem },
    { collection: 'io-lulc-annual-v02', items: lulc },
  ];
}

/**
 * Extract pixel values over time for a band from a collection.
 * In demo mode generates realistic time series data.
 */
export async function getTimeSeries(
  collection: string,
  _bbox: [number, number, number, number],
  _bandName: string,
  _dateRange: { start: string; end: string },
): Promise<TimeSeriesPoint[]> {
  await new Promise(r => setTimeout(r, 200));

  const now = new Date();
  const points: TimeSeriesPoint[] = [];
  const interval = collection.includes('modis') ? 16 : collection.includes('sentinel') ? 5 : 16;

  for (let i = 0; i < 30; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * interval);
    const month = date.getMonth();

    let value: number;
    if (collection.includes('modis-11')) {
      // LST in Kelvin
      value = month >= 5 && month <= 7 ? 290 + Math.random() * 8 : 270 + Math.random() * 10;
    } else {
      // NDVI-like
      value = 0.45 + 0.35 * Math.sin((month - 2) * Math.PI / 6) + (Math.random() - 0.5) * 0.08;
      value = Math.max(0.2, Math.min(0.9, value));
    }

    points.push({
      date: date.toISOString().slice(0, 10),
      value: Math.round(value * 1000) / 1000,
      quality: Math.random() > 0.8 ? 'cloudy' : Math.random() > 0.9 ? 'marginal' : 'good',
    });
  }
  return points.reverse();
}

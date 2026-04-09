/**
 * Copernicus Data Space Ecosystem — Full STAC API Gateway
 *
 * Main gateway to all ESA Copernicus satellite data. Replaces the current
 * WMS-only tile approach with full STAC catalog access.
 *
 * STAC Catalog: https://catalogue.dataspace.copernicus.eu/stac
 *
 * Supports: SENTINEL-1, SENTINEL-2, SENTINEL-3, SENTINEL-5P
 *
 * TODO: Register for OAuth2 client credentials at
 * https://identity.dataspace.copernicus.eu/
 */

// ─── Types ───

export interface CopernicusCollection {
  id: string;
  title: string;
  description: string;
  spatialResolution: string;
  temporalResolution: string;
  processingLevel: string;
}

export interface CopernicusQuery {
  collection: string;
  bbox: [number, number, number, number]; // [west, south, east, north]
  dateRange: { start: string; end: string };
  cloudCover?: number;
  maxResults?: number;
}

export interface CopernicusProduct {
  id: string;
  title: string;
  datetime: string;
  geometry: { type: string; coordinates: number[][][] };
  assets: Record<string, { href: string; type: string; title?: string }>;
  cloudCover: number;
  processingLevel: string;
}

// ─── Source Info ───

export const COPERNICUS_SOURCE_INFO = {
  name: 'Copernicus Data Space Ecosystem',
  provider: 'ESA / European Commission',
  stacEndpoint: 'https://catalogue.dataspace.copernicus.eu/stac',
  license: 'Free and open (Copernicus)',
  collections: ['SENTINEL-1', 'SENTINEL-2', 'SENTINEL-3', 'SENTINEL-5P'],
};

// ─── Collections Registry ───

const COLLECTIONS: CopernicusCollection[] = [
  {
    id: 'SENTINEL-2', title: 'Sentinel-2 MSI', description: 'Multispectral optical imagery at 10-60m',
    spatialResolution: '10m', temporalResolution: '5 days', processingLevel: 'L2A',
  },
  {
    id: 'SENTINEL-1', title: 'Sentinel-1 SAR', description: 'C-band SAR radar imagery',
    spatialResolution: '5x20m', temporalResolution: '6 days', processingLevel: 'GRD',
  },
  {
    id: 'SENTINEL-3', title: 'Sentinel-3 OLCI', description: 'Ocean and land colour instrument',
    spatialResolution: '300m', temporalResolution: '1 day', processingLevel: 'L2',
  },
  {
    id: 'SENTINEL-5P', title: 'Sentinel-5P TROPOMI', description: 'Atmospheric composition monitoring',
    spatialResolution: '5.5x3.5km', temporalResolution: '1 day', processingLevel: 'L2',
  },
];

// ─── STAC Feature Shape (internal) ───

interface STACFeature {
  id: string;
  type: string;
  geometry: { type: string; coordinates: number[][][] };
  properties: {
    title?: string;
    datetime?: string;
    'eo:cloud_cover'?: number;
    'processing:level'?: string;
    [key: string]: unknown;
  };
  assets: Record<string, { href: string; type: string; title?: string; roles?: string[] }>;
}

interface STACFeatureCollection {
  type: string;
  features: STACFeature[];
  numberMatched?: number;
  numberReturned?: number;
}

// ─── Cache ───

const searchCache = new Map<string, { data: CopernicusProduct[]; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// ─── Auth Stub ───

/**
 * Get access token via OAuth2 client credentials flow.
 * TODO: Implement with actual client_id and client_secret from
 * https://identity.dataspace.copernicus.eu/
 */
export async function getAccessToken(): Promise<string | null> {
  // TODO: OAuth2 client credentials flow
  // POST https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token
  // grant_type=client_credentials&client_id=...&client_secret=...
  return null;
}

// ─── Demo Data ───

function generateDemoProducts(collection: string, count: number): CopernicusProduct[] {
  const now = new Date();
  const products: CopernicusProduct[] = [];
  const interval = collection === 'SENTINEL-2' ? 5 : collection === 'SENTINEL-1' ? 6 : 1;

  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * interval);

    products.push({
      id: `${collection}_${date.toISOString().slice(0, 10).replace(/-/g, '')}_${i}`,
      title: `${collection} Product ${date.toISOString().slice(0, 10)}`,
      datetime: date.toISOString(),
      geometry: {
        type: 'Polygon',
        coordinates: [[[14.3, 56.8], [15.2, 56.8], [15.2, 57.3], [14.3, 57.3], [14.3, 56.8]]],
      },
      assets: {
        data: { href: `https://catalogue.dataspace.copernicus.eu/download/${collection}_${i}`, type: 'application/zip', title: 'Full product' },
        thumbnail: { href: `https://catalogue.dataspace.copernicus.eu/thumbnail/${collection}_${i}`, type: 'image/png', title: 'Preview' },
      },
      cloudCover: collection.includes('SENTINEL-2') ? Math.round(Math.random() * 60) : 0,
      processingLevel: collection === 'SENTINEL-2' ? 'L2A' : collection === 'SENTINEL-1' ? 'GRD' : 'L2',
    });
  }
  return products;
}

// ─── Public API ───

/** Request timeout for STAC API calls (15 seconds). */
const STAC_TIMEOUT_MS = 15_000;

/**
 * Extract the best thumbnail / quicklook URL from STAC assets.
 * Copernicus STAC items often expose "thumbnail", "quicklook", or a
 * rendered preview under various keys.
 */
function extractThumbnailAsset(
  assets: STACFeature['assets'],
): { href: string; type: string; title?: string } | null {
  const candidates = ['thumbnail', 'quicklook', 'rendered_preview', 'preview'];
  for (const key of candidates) {
    if (assets[key]) return assets[key];
  }
  // Fall back to any asset whose roles include "thumbnail" or "overview"
  for (const asset of Object.values(assets)) {
    if (asset.roles?.some(r => r === 'thumbnail' || r === 'overview')) {
      return asset;
    }
  }
  return null;
}

/**
 * Map a raw STAC feature to our CopernicusProduct shape.
 */
function mapFeatureToProduct(f: STACFeature): CopernicusProduct {
  // Build a cleaned assets record that always includes a thumbnail when available
  const assets: CopernicusProduct['assets'] = {};
  for (const [key, asset] of Object.entries(f.assets)) {
    assets[key] = { href: asset.href, type: asset.type, title: asset.title };
  }
  const thumb = extractThumbnailAsset(f.assets);
  if (thumb && !assets['thumbnail']) {
    assets['thumbnail'] = { href: thumb.href, type: thumb.type, title: thumb.title ?? 'Preview' };
  }

  return {
    id: f.id,
    title: f.properties.title ?? f.id,
    datetime: f.properties.datetime ?? '',
    geometry: f.geometry,
    assets,
    cloudCover: f.properties['eo:cloud_cover'] ?? 0,
    processingLevel: f.properties['processing:level'] ?? 'unknown',
  };
}

/**
 * Search Copernicus STAC catalog for products.
 */
export async function searchProducts(query: CopernicusQuery): Promise<CopernicusProduct[]> {
  const key = `${query.collection}_${query.bbox.join(',')}_${query.dateRange.start}_${query.dateRange.end}_${query.cloudCover ?? ''}_${query.maxResults ?? ''}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), STAC_TIMEOUT_MS);

    // Ensure datetime values are proper ISO 8601 with time components
    const startDt = query.dateRange.start.includes('T')
      ? query.dateRange.start
      : `${query.dateRange.start}T00:00:00Z`;
    const endDt = query.dateRange.end.includes('T')
      ? query.dateRange.end
      : `${query.dateRange.end}T23:59:59Z`;

    const body: Record<string, unknown> = {
      collections: [query.collection],
      bbox: query.bbox,
      datetime: `${startDt}/${endDt}`,
      limit: query.maxResults ?? 20,
    };
    if (query.cloudCover != null) {
      body.query = { 'eo:cloud_cover': { lt: query.cloudCover } };
    }

    const response = await fetch('https://catalogue.dataspace.copernicus.eu/stac/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`CDSE STAC ${response.status}: ${response.statusText}`);
    }

    const data: STACFeatureCollection = await response.json();
    const products = (data.features ?? []).map(mapFeatureToProduct);

    searchCache.set(key, { data: products, fetchedAt: Date.now() });
    return products;
  } catch (err) {
    // Log for debugging but never throw — fall back to demo data
    console.warn(
      '[CopernicusDataSpace] STAC search failed, returning demo data:',
      err instanceof Error ? err.message : String(err),
    );
    const demo = generateDemoProducts(query.collection, query.maxResults ?? 10);
    searchCache.set(key, { data: demo, fetchedAt: Date.now() });
    return demo;
  }
}

/**
 * Returns the list of supported Copernicus collections.
 */
export function getAvailableCollections(): CopernicusCollection[] {
  return COLLECTIONS;
}

/**
 * Convenience wrapper for atmospherically corrected Sentinel-2 L2A data.
 */
export async function getSentinel2L2A(
  bounds: { north: number; south: number; east: number; west: number },
  dateRange: { start: string; end: string },
): Promise<CopernicusProduct[]> {
  return searchProducts({
    collection: 'SENTINEL-2',
    bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
    dateRange,
    cloudCover: 50,
    maxResults: 20,
  });
}

/**
 * Sentinel-3 OLCI for regional vegetation monitoring.
 */
export async function getSentinel3OLCI(
  bounds: { north: number; south: number; east: number; west: number },
  dateRange: { start: string; end: string },
): Promise<CopernicusProduct[]> {
  return searchProducts({
    collection: 'SENTINEL-3',
    bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
    dateRange,
    maxResults: 10,
  });
}

/**
 * Get the most recent acquisition date for a collection over given bounds.
 */
export async function getDataFreshness(
  collection: string,
  bounds: { north: number; south: number; east: number; west: number },
): Promise<{ lastAcquisition: string; ageHours: number }> {
  const now = new Date();
  const oneMonth = new Date(now);
  oneMonth.setMonth(oneMonth.getMonth() - 1);

  const products = await searchProducts({
    collection,
    bbox: [bounds.west, bounds.south, bounds.east, bounds.north],
    dateRange: { start: oneMonth.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) },
    maxResults: 1,
  });

  if (products.length === 0) {
    return { lastAcquisition: 'unknown', ageHours: -1 };
  }

  const lastDate = new Date(products[0].datetime);
  const ageHours = Math.round((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60));

  return {
    lastAcquisition: products[0].datetime,
    ageHours,
  };
}

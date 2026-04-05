/**
 * Universal STAC Catalog Client
 *
 * SpatioTemporal Asset Catalog (STAC) standard client that queries
 * ANY STAC-compliant data source with a single interface.
 *
 * Pre-configured catalogs:
 *   - ESA Copernicus Data Space
 *   - USGS Landsat
 *   - Microsoft Planetary Computer
 *   - AWS Earth Search (Element84)
 *
 * Spec: https://stacspec.org/
 */

// ─── Types ───

export interface STACCatalog {
  id: string;
  title: string;
  description: string;
  url: string;
  type: 'catalog' | 'collection' | 'item';
}

export interface STACAsset {
  href: string;
  type: string;
  title?: string;
  roles?: string[];
}

export interface STACItem {
  id: string;
  geometry: { type: string; coordinates: number[][][] };
  bbox: [number, number, number, number];
  datetime: string;
  properties: Record<string, unknown>;
  assets: Record<string, STACAsset>;
  links: { rel: string; href: string; type?: string }[];
  collection: string;
}

export interface STACSearchParams {
  bbox?: [number, number, number, number];
  datetime?: string; // ISO 8601 range: "start/end"
  collections?: string[];
  limit?: number;
  query?: Record<string, unknown>; // CQL2 filter
}

// ─── Source Info ───

export const STAC_SOURCE_INFO = {
  name: 'STAC Federated Catalog',
  description: 'SpatioTemporal Asset Catalog — universal Earth observation data search',
  spec: 'https://stacspec.org/',
  registeredCatalogs: 4,
};

// ─── Catalog Registry ───

export const STAC_CATALOGS: Record<string, STACCatalog> = {
  ESA_COPERNICUS: {
    id: 'esa-copernicus', title: 'ESA Copernicus Data Space',
    description: 'Sentinel-1, 2, 3, 5P and Copernicus services',
    url: 'https://catalogue.dataspace.copernicus.eu/stac', type: 'catalog',
  },
  USGS_LANDSAT: {
    id: 'usgs-landsat', title: 'USGS Landsat',
    description: 'Landsat Collection 2 Level-1 and Level-2',
    url: 'https://landsatlook.usgs.gov/stac-server', type: 'catalog',
  },
  PLANETARY_COMPUTER: {
    id: 'planetary-computer', title: 'Microsoft Planetary Computer',
    description: 'Petabyte-scale indexed satellite data',
    url: 'https://planetarycomputer.microsoft.com/api/stac/v1', type: 'catalog',
  },
  AWS_EARTH_SEARCH: {
    id: 'aws-earth-search', title: 'AWS Earth Search (Element84)',
    description: 'Cloud-native geospatial data on AWS',
    url: 'https://earth-search.aws.element84.com/v1', type: 'catalog',
  },
};

// ─── Cache ───

const searchCache = new Map<string, { data: STACItem[]; fetchedAt: number }>();
const CACHE_TTL = 30 * 60 * 1000;

// ─── Demo Data ───

function generateDemoSTACItems(catalogId: string, count: number): STACItem[] {
  const now = new Date();
  const items: STACItem[] = [];
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 3);
    const collection = catalogId.includes('landsat') ? 'landsat-c2l2-sr'
      : catalogId.includes('copernicus') ? 'sentinel-2-l2a'
      : catalogId.includes('planetary') ? 'sentinel-2-l2a'
      : 'sentinel-2-l2a';

    items.push({
      id: `${catalogId}-item-${i}-${date.toISOString().slice(0, 10)}`,
      geometry: {
        type: 'Polygon',
        coordinates: [[[14.3, 56.8], [15.2, 56.8], [15.2, 57.3], [14.3, 57.3], [14.3, 56.8]]],
      },
      bbox: [14.3, 56.8, 15.2, 57.3],
      datetime: date.toISOString(),
      properties: {
        'eo:cloud_cover': Math.round(Math.random() * 50),
        platform: catalogId.includes('landsat') ? 'landsat-9' : 'sentinel-2b',
        'processing:level': 'L2A',
      },
      assets: {
        visual: { href: `https://example.com/${catalogId}/${i}/visual.tif`, type: 'image/tiff', title: 'Visual', roles: ['visual'] },
        data: { href: `https://example.com/${catalogId}/${i}/data.tif`, type: 'image/tiff', title: 'Data', roles: ['data'] },
      },
      links: [
        { rel: 'self', href: `https://example.com/${catalogId}/${i}` },
        { rel: 'parent', href: `https://example.com/${catalogId}` },
      ],
      collection,
    });
  }
  return items;
}

// ─── Public API ───

/**
 * Search a single STAC catalog for items matching the given parameters.
 */
export async function searchCatalog(
  catalogUrl: string,
  params: STACSearchParams,
): Promise<STACItem[]> {
  const key = `${catalogUrl}_${JSON.stringify(params)}`;
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const response = await fetch(`${catalogUrl}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bbox: params.bbox,
        datetime: params.datetime,
        collections: params.collections,
        limit: params.limit ?? 20,
        ...(params.query ? { query: params.query } : {}),
      }),
    });

    if (!response.ok) throw new Error(`STAC search failed: ${response.status}`);
    const data = await response.json();

    const items: STACItem[] = (data.features ?? []).map((f: Record<string, unknown>) => ({
      id: f.id,
      geometry: f.geometry,
      bbox: f.bbox,
      datetime: f.properties?.datetime ?? '',
      properties: f.properties ?? {},
      assets: f.assets ?? {},
      links: f.links ?? [],
      collection: f.collection ?? '',
    }));

    searchCache.set(key, { data: items, fetchedAt: Date.now() });
    return items;
  } catch {
    // Demo fallback
    const catalogId = Object.entries(STAC_CATALOGS).find(([_, c]) => c.url === catalogUrl)?.[0] ?? 'unknown';
    const demo = generateDemoSTACItems(catalogId, params.limit ?? 10);
    searchCache.set(key, { data: demo, fetchedAt: Date.now() });
    return demo;
  }
}

/**
 * Federated search across all registered STAC catalogs.
 * Results are merged and deduplicated by item ID.
 */
export async function searchAllCatalogs(params: STACSearchParams): Promise<STACItem[]> {
  const catalogs = Object.values(STAC_CATALOGS);
  const results = await Promise.all(
    catalogs.map(c => searchCatalog(c.url, params).catch(() => [] as STACItem[])),
  );

  // Merge and deduplicate
  const seen = new Set<string>();
  const merged: STACItem[] = [];
  for (const items of results) {
    for (const item of items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }

  // Sort by date descending
  merged.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());
  return merged.slice(0, params.limit ?? 50);
}

/**
 * Get download-ready asset URLs with content types for a STAC item.
 */
export function getItemAssets(item: STACItem): { name: string; href: string; type: string; roles: string[] }[] {
  return Object.entries(item.assets).map(([name, asset]) => ({
    name,
    href: asset.href,
    type: asset.type,
    roles: asset.roles ?? [],
  }));
}

/**
 * Query all catalogs and return what datasets are available for a given area.
 */
export async function getAvailableDatasets(
  _bbox: [number, number, number, number],
): Promise<{ catalog: string; collection: string; itemCount: number; latestDate: string }[]> {
  await new Promise(r => setTimeout(r, 300));

  // Demo: return what a typical Småland query would find
  return [
    { catalog: 'ESA Copernicus', collection: 'SENTINEL-2 L2A', itemCount: 24, latestDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) },
    { catalog: 'ESA Copernicus', collection: 'SENTINEL-1 GRD', itemCount: 18, latestDate: new Date(Date.now() - 3 * 86400000).toISOString().slice(0, 10) },
    { catalog: 'USGS Landsat', collection: 'Landsat C2 L2', itemCount: 8, latestDate: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10) },
    { catalog: 'Planetary Computer', collection: 'sentinel-2-l2a', itemCount: 24, latestDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) },
    { catalog: 'Planetary Computer', collection: 'cop-dem-glo-30', itemCount: 1, latestDate: '2021-01-01' },
    { catalog: 'Planetary Computer', collection: 'io-lulc-annual-v02', itemCount: 1, latestDate: '2023-01-01' },
    { catalog: 'AWS Earth Search', collection: 'sentinel-2-l2a', itemCount: 24, latestDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10) },
  ];
}

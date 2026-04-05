/**
 * Lantmäteriet Cadastral Open Data Service
 *
 * Integrates the free Lantmäteriet WMS for property boundaries (fastighetsindelning).
 * No API key required — this is open data under CC0 license.
 *
 * WMS endpoint: https://minkarta.lantmateriet.se/map/fastighetsindelning
 *
 * Available layers:
 * - granser: Property boundary lines (fastighetsgränser)
 * - granspunkter: Boundary survey points
 * - CP.CadastralParcel: INSPIRE cadastral parcels (polygons with IDs)
 * - CP.CadastralBoundary: INSPIRE boundary lines
 * - CP.CadastralZoning: District/municipality zoning
 *
 * Supported CRS: EPSG:3006, EPSG:4326, EPSG:3857
 */

// ─── Constants ───

const WMS_BASE = 'https://minkarta.lantmateriet.se/map/fastighetsindelning';

/** Bounding box as [minLon, minLat, maxLon, maxLat] in EPSG:4326 */
export type BBox = [number, number, number, number];

// ─── WMS URL Builders ───

/**
 * Build a WMS GetMap URL for property boundary lines.
 * Returns a PNG image overlay showing fastighetsgränser.
 */
export function getPropertyBoundaryWmsUrl(
  bbox: BBox,
  width = 512,
  height = 512,
): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    LAYERS: 'granser',
    SRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    STYLES: '',
  });
  return `${WMS_BASE}?${params.toString()}`;
}

/**
 * Build a WMS GetMap URL for INSPIRE cadastral parcels.
 * Shows filled parcel polygons with property designations.
 */
export function getCadastralParcelWmsUrl(
  bbox: BBox,
  width = 512,
  height = 512,
): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    LAYERS: 'CP.CadastralParcel',
    SRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    STYLES: '',
  });
  return `${WMS_BASE}?${params.toString()}`;
}

/**
 * Build a WMS GetMap URL for cadastral zoning (districts/municipalities).
 */
export function getCadastralZoningWmsUrl(
  bbox: BBox,
  width = 512,
  height = 512,
): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.1.1',
    LAYERS: 'CP.CadastralZoning',
    SRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: String(width),
    HEIGHT: String(height),
    FORMAT: 'image/png',
    TRANSPARENT: 'true',
    STYLES: '',
  });
  return `${WMS_BASE}?${params.toString()}`;
}

/**
 * Build a WMS GetFeatureInfo URL for identifying a property at a click point.
 * Returns property designation (fastighetsbeteckning) for the clicked location.
 */
export function getPropertyInfoUrl(
  bbox: BBox,
  x: number,
  y: number,
  width = 512,
  height = 512,
): string {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetFeatureInfo',
    VERSION: '1.1.1',
    LAYERS: 'CP.CadastralParcel',
    QUERY_LAYERS: 'CP.CadastralParcel',
    SRS: 'EPSG:4326',
    BBOX: bbox.join(','),
    WIDTH: String(width),
    HEIGHT: String(height),
    X: String(x),
    Y: String(y),
    INFO_FORMAT: 'application/json',
    FEATURE_COUNT: '1',
  });
  return `${WMS_BASE}?${params.toString()}`;
}

// ─── Feature Info Query ───

export interface CadastralFeatureInfo {
  fastighetsbeteckning: string;
  objectId: string;
  municipality: string;
  area: number | null;
}

/**
 * Query property info at a specific lat/lon coordinate.
 * Uses WMS GetFeatureInfo against the INSPIRE cadastral parcel layer.
 *
 * @param lat Latitude (WGS84)
 * @param lon Longitude (WGS84)
 * @param zoomLevel Current map zoom (used to calculate bbox size)
 */
export async function queryPropertyAtPoint(
  lat: number,
  lon: number,
  zoomLevel = 15,
): Promise<CadastralFeatureInfo | null> {
  // Calculate a small bbox around the clicked point
  // Size scales with zoom level — smaller bbox at higher zoom
  const span = 0.01 / Math.pow(2, Math.max(0, zoomLevel - 12));
  const bbox: BBox = [lon - span, lat - span, lon + span, lat + span];

  const SIZE = 256;
  // Place the query point at the center of the image
  const x = Math.round(SIZE / 2);
  const y = Math.round(SIZE / 2);

  const url = getPropertyInfoUrl(bbox, x, y, SIZE, SIZE);

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Lantmäteriet GetFeatureInfo failed: ${res.status}`);
      return null;
    }

    const data = await res.json();

    // Parse INSPIRE GML/JSON response
    const features = data?.features ?? data?.results ?? [];
    if (features.length === 0) return null;

    const props = features[0]?.properties ?? features[0] ?? {};

    return {
      fastighetsbeteckning:
        props.nationalCadastralReference ??
        props.label ??
        props.fastighetsbeteckning ??
        'Unknown',
      objectId: props.inspireId ?? props.OBJECTID ?? '',
      municipality: props.administrativeUnit ?? props.kommun ?? '',
      area: props.areaValue ? parseFloat(props.areaValue) : null,
    };
  } catch (err) {
    console.warn('Lantmäteriet GetFeatureInfo error:', err);
    return null;
  }
}

/**
 * Build a MapLibre-compatible raster tile URL template for property boundaries.
 * This can be used as a TileJSON-style source in MapLibre GL.
 */
export function getPropertyBoundaryTileUrl(): string {
  return `${WMS_BASE}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=granser&SRS=EPSG:4326&BBOX={bbox-epsg-4326}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true&STYLES=`;
}

/**
 * Build a MapLibre-compatible raster tile URL template for cadastral parcels.
 */
export function getCadastralParcelTileUrl(): string {
  return `${WMS_BASE}?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=CP.CadastralParcel&SRS=EPSG:4326&BBOX={bbox-epsg-4326}&WIDTH=256&HEIGHT=256&FORMAT=image/png&TRANSPARENT=true&STYLES=`;
}

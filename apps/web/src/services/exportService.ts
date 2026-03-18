/**
 * Export Service — BeetleSense.ai data export engine.
 *
 * Supports CSV (with BOM for Swedish characters), GeoJSON, Shapefile (ZIP),
 * KML (Google Earth), analysis CSV, and Swedish-format timber inventory.
 * All exports trigger a browser download.
 */

import type { PortfolioParcel } from '@/hooks/usePortfolio';
import type { Alert } from '@/hooks/useAlerts';
import {
  buildShapefileZip,
  type ShapefileField,
  type ShapefileRecord,
} from '@/lib/shapefileWriter';
import { buildKmlBlob, type KmlFolder, type KmlPlacemark } from '@/lib/kmlWriter';

// ─── Helpers ───

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function dateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function escapeCsvField(value: string): string {
  if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes(';')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return `"${value}"`;
}

// ─── SWEREF99 TM conversion (approximate, for export purposes) ───

const SWEREF99_SCALE = 0.9996;
const SWEREF99_CM = 15; // central meridian
const SWEREF99_FE = 500000;

/**
 * Approximate WGS84 to SWEREF99 TM conversion.
 * For precise conversion, a full Gauss-Kruger transform should be used;
 * this is sufficient for export/display purposes.
 */
export function wgs84ToSweref99(lng: number, lat: number): { easting: number; northing: number } {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const e2 = 2 * f - f * f;
  const n = f / (2 - f);
  const n2 = n * n;
  const n3 = n2 * n;
  const n4 = n3 * n;

  const A = (a / (1 + n)) * (1 + n2 / 4 + n4 / 64);
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;
  const lng0Rad = (SWEREF99_CM * Math.PI) / 180;

  const dLng = lngRad - lng0Rad;
  const sinLat = Math.sin(latRad);
  const cosLat = Math.cos(latRad);
  const _tanLat = sinLat / cosLat;

  const t = Math.sinh(
    Math.atanh(sinLat) -
      (2 * Math.sqrt(e2)) / (1 + e2) * Math.atanh((2 * Math.sqrt(e2)) / (1 + e2) * sinLat)
  );
  // Simplified: use conformal latitude
  const tStar = t;
  const xiPrime = Math.atan2(tStar, Math.cos(dLng));
  const etaPrime = Math.atanh(Math.sin(dLng) / Math.sqrt(1 + tStar * tStar));

  // Fourier coefficients (4th order)
  const a1 = n / 2 - (2 * n2) / 3 + (5 * n3) / 16;
  const a2 = (13 * n2) / 48 - (3 * n3) / 5;
  const a3 = (61 * n3) / 240;

  const xi =
    xiPrime +
    a1 * Math.sin(2 * xiPrime) * Math.cosh(2 * etaPrime) +
    a2 * Math.sin(4 * xiPrime) * Math.cosh(4 * etaPrime) +
    a3 * Math.sin(6 * xiPrime) * Math.cosh(6 * etaPrime);

  const eta =
    etaPrime +
    a1 * Math.cos(2 * xiPrime) * Math.sinh(2 * etaPrime) +
    a2 * Math.cos(4 * xiPrime) * Math.sinh(4 * etaPrime) +
    a3 * Math.cos(6 * xiPrime) * Math.sinh(6 * etaPrime);

  const northing = SWEREF99_SCALE * A * xi;
  const easting = SWEREF99_SCALE * A * eta + SWEREF99_FE;

  return { easting: Math.round(easting * 100) / 100, northing: Math.round(northing * 100) / 100 };
}

// ─── Column definitions ───

export interface ExportColumn {
  key: string;
  label: string;
  labelSv: string;
  getValue: (parcel: PortfolioParcel) => string;
}

export const PARCEL_COLUMNS: ExportColumn[] = [
  { key: 'name', label: 'Name', labelSv: 'Namn', getValue: (p) => p.name },
  { key: 'municipality', label: 'Municipality', labelSv: 'Kommun', getValue: (p) => p.municipality },
  { key: 'county', label: 'County', labelSv: 'Län', getValue: (p) => p.county },
  { key: 'area_hectares', label: 'Area (ha)', labelSv: 'Yta (ha)', getValue: (p) => String(p.area_hectares) },
  { key: 'health_score', label: 'Health Score', labelSv: 'Hälsoindex', getValue: (p) => String(p.health_score) },
  { key: 'timber_value_kr', label: 'Timber Value (kr)', labelSv: 'Virkesvärde (kr)', getValue: (p) => String(p.timber_value_kr) },
  { key: 'warnings', label: 'Warnings', labelSv: 'Varningar', getValue: (p) => String(p.warnings) },
  { key: 'last_survey_date', label: 'Last Survey', labelSv: 'Senaste undersökning', getValue: (p) => p.last_survey_date ?? '' },
  { key: 'status', label: 'Status', labelSv: 'Status', getValue: (p) => p.status },
  { key: 'center_lng', label: 'Longitude', labelSv: 'Longitud', getValue: (p) => String(p.center[0]) },
  { key: 'center_lat', label: 'Latitude', labelSv: 'Latitud', getValue: (p) => String(p.center[1]) },
];

// ─── CSV Export ───

export interface CsvExportOptions {
  data: Record<string, unknown>[];
  columns: { key: string; label: string }[];
  filename: string;
}

/**
 * Export arbitrary data to CSV with BOM for Swedish character support.
 */
export function exportToCSV(options: CsvExportOptions): void {
  const { data, columns, filename } = options;

  const headerRow = columns.map((c) => escapeCsvField(c.label)).join(',');
  const dataRows = data.map((row) =>
    columns.map((c) => escapeCsvField(String(row[c.key] ?? ''))).join(','),
  );

  const csv = [headerRow, ...dataRows].join('\n');
  // BOM (\uFEFF) ensures Excel correctly detects UTF-8 for Swedish characters
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}-${dateStamp()}.csv`);
}

// ─── GeoJSON Export ───

/**
 * Export parcels as a GeoJSON FeatureCollection.
 */
export function exportToGeoJSON(
  parcels: PortfolioParcel[],
  filename: string = 'beetlesense-parcels',
): void {
  const features = parcels.map((p) => ({
    type: 'Feature' as const,
    id: p.id,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [p.boundary.map(([lng, lat]) => [lng, lat])],
    },
    properties: {
      id: p.id,
      name: p.name,
      municipality: p.municipality,
      county: p.county,
      area_hectares: p.area_hectares,
      health_score: p.health_score,
      timber_value_kr: p.timber_value_kr,
      warnings: p.warnings,
      last_survey_date: p.last_survey_date,
      status: p.status,
      center_lng: p.center[0],
      center_lat: p.center[1],
    },
  }));

  const geojson = {
    type: 'FeatureCollection' as const,
    name: 'BeetleSense Parcels',
    crs: {
      type: 'name' as const,
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features,
  };

  const json = JSON.stringify(geojson, null, 2);
  const blob = new Blob([json], { type: 'application/geo+json;charset=utf-8;' });
  triggerDownload(blob, `${filename}-${dateStamp()}.geojson`);
}

// ─── Shapefile Export ───

/**
 * Export parcels as a Shapefile (SHP/DBF/SHX/PRJ) ZIP.
 */
export function exportToShapefile(
  parcels: PortfolioParcel[],
  crs: 'WGS84' | 'SWEREF99' = 'WGS84',
  filename: string = 'beetlesense-parcels',
): void {
  const fields: ShapefileField[] = [
    { name: 'NAME', type: 'C', length: 50 },
    { name: 'MUNICIPALI', type: 'C', length: 40 },
    { name: 'COUNTY', type: 'C', length: 40 },
    { name: 'AREA_HA', type: 'N', length: 12, decimals: 2 },
    { name: 'HEALTH', type: 'N', length: 6, decimals: 0 },
    { name: 'TIMBER_KR', type: 'N', length: 14, decimals: 0 },
    { name: 'WARNINGS', type: 'N', length: 4, decimals: 0 },
    { name: 'LASTSURVEY', type: 'C', length: 10 },
    { name: 'STATUS', type: 'C', length: 12 },
  ];

  const records: ShapefileRecord[] = parcels.map((p) => {
    let rings: [number, number][][];
    if (crs === 'SWEREF99') {
      rings = [
        p.boundary.map(([lng, lat]) => {
          const { easting, northing } = wgs84ToSweref99(lng, lat);
          return [easting, northing] as [number, number];
        }),
      ];
    } else {
      rings = [p.boundary.map(([lng, lat]) => [lng, lat] as [number, number])];
    }

    return {
      geometry: {
        type: 'Polygon' as const,
        rings,
      },
      attributes: {
        NAME: p.name,
        MUNICIPALI: p.municipality,
        COUNTY: p.county,
        AREA_HA: p.area_hectares,
        HEALTH: p.health_score,
        TIMBER_KR: p.timber_value_kr,
        WARNINGS: p.warnings,
        LASTSURVEY: p.last_survey_date ?? '',
        STATUS: p.status,
      },
    };
  });

  const blob = buildShapefileZip({
    filename,
    shapeType: 'Polygon',
    fields,
    records,
    crs,
  });

  triggerDownload(blob, `${filename}-${dateStamp()}.zip`);
}

// ─── KML Export ───

/**
 * Export parcels as KML for Google Earth.
 */
export function exportToKML(
  parcels: PortfolioParcel[],
  filename: string = 'beetlesense-parcels',
): void {
  // Group parcels into folders by county
  const byCounty = new Map<string, PortfolioParcel[]>();
  for (const p of parcels) {
    const county = p.county || 'Other';
    if (!byCounty.has(county)) byCounty.set(county, []);
    byCounty.get(county)!.push(p);
  }

  const folders: KmlFolder[] = Array.from(byCounty.entries()).map(([county, countyParcels]) => ({
    name: county,
    placemarks: countyParcels.map(
      (p): KmlPlacemark => ({
        id: p.id,
        name: p.name,
        description: `${p.municipality}, ${p.county} — ${p.area_hectares} ha`,
        point: [p.center[0], p.center[1]],
        polygonRings: [p.boundary],
        styleId: p.status,
        extendedData: {
          Municipality: p.municipality,
          County: p.county,
          'Area (ha)': p.area_hectares,
          'Health Score': p.health_score,
          'Timber Value (kr)': p.timber_value_kr,
          Warnings: p.warnings,
          'Last Survey': p.last_survey_date ?? 'N/A',
          Status: p.status,
        },
      }),
    ),
  }));

  const blob = buildKmlBlob({
    documentName: 'BeetleSense.ai — Forest Parcels',
    description: `Exported ${parcels.length} parcels on ${dateStamp()}`,
    folders,
  });

  triggerDownload(blob, `${filename}-${dateStamp()}.kml`);
}

// ─── Analysis CSV Export ───

export interface AnalysisResult {
  parcel_id: string;
  parcel_name: string;
  analysis_date: string;
  analysis_type: string;
  score: number;
  confidence: number;
  findings: string;
  recommendations: string;
}

/**
 * Export analysis results as CSV.
 */
export function exportAnalysisCSV(
  results: AnalysisResult[],
  filename: string = 'beetlesense-analysis',
): void {
  const columns = [
    { key: 'parcel_id', label: 'Parcel ID' },
    { key: 'parcel_name', label: 'Parcel Name' },
    { key: 'analysis_date', label: 'Analysis Date' },
    { key: 'analysis_type', label: 'Analysis Type' },
    { key: 'score', label: 'Score' },
    { key: 'confidence', label: 'Confidence' },
    { key: 'findings', label: 'Findings' },
    { key: 'recommendations', label: 'Recommendations' },
  ];

  exportToCSV({
    data: results as unknown as Record<string, unknown>[],
    columns,
    filename,
  });
}

// ─── Timber Inventory Export (Swedish format) ───

/**
 * Export a Swedish-format timber inventory CSV (Virkesförrådsinventering).
 *
 * Follows the standard format expected by Swedish forestry software,
 * with semicolon separators and Swedish headers.
 */
export function exportTimberInventory(
  parcels: PortfolioParcel[],
  filename: string = 'beetlesense-virkesforrad',
): void {
  const headers = [
    'Skiftesnamn',
    'Kommun',
    'Län',
    'Areal (ha)',
    'Hälsoindex',
    'Virkesvärde (SEK)',
    'Varningar',
    'Senaste inventering',
    'Status',
    'Latitud (WGS84)',
    'Longitud (WGS84)',
    'Northing (SWEREF99)',
    'Easting (SWEREF99)',
  ];

  const rows = parcels.map((p) => {
    const { easting, northing } = wgs84ToSweref99(p.center[0], p.center[1]);
    return [
      p.name,
      p.municipality,
      p.county,
      p.area_hectares.toFixed(2).replace('.', ','), // Swedish decimal comma
      String(p.health_score),
      p.timber_value_kr.toLocaleString('sv-SE'),
      String(p.warnings),
      p.last_survey_date ?? '',
      p.status,
      p.center[1].toFixed(6).replace('.', ','),
      p.center[0].toFixed(6).replace('.', ','),
      northing.toFixed(2).replace('.', ','),
      easting.toFixed(2).replace('.', ','),
    ];
  });

  // Swedish CSV convention: semicolon separator, comma decimal
  const csv = [
    headers.join(';'),
    ...rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(';')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `${filename}-${dateStamp()}.csv`);
}

// ─── Alerts CSV Export ───

/**
 * Export alerts as CSV.
 */
export function exportAlertsCSV(
  alerts: Alert[],
  filename: string = 'beetlesense-alerts',
): void {
  const columns = [
    { key: 'id', label: 'Alert ID' },
    { key: 'category', label: 'Category' },
    { key: 'severity', label: 'Severity' },
    { key: 'title', label: 'Title' },
    { key: 'message', label: 'Message' },
    { key: 'parcel_name', label: 'Parcel' },
    { key: 'is_read', label: 'Read' },
    { key: 'created_at', label: 'Date' },
  ];

  exportToCSV({
    data: alerts.map((a) => ({
      ...a,
      is_read: a.is_read ? 'Yes' : 'No',
      parcel_name: a.parcel_name ?? '',
    })) as unknown as Record<string, unknown>[],
    columns,
    filename,
  });
}

// ─── File size estimation ───

/**
 * Estimate the file size for an export.
 * Returns size in bytes.
 */
export function estimateExportSize(
  format: 'csv' | 'geojson' | 'shapefile' | 'kml' | 'timber',
  recordCount: number,
  avgFieldCount: number = 10,
): number {
  const avgFieldSize = 20; // average bytes per field
  const rowSize = avgFieldCount * avgFieldSize;

  switch (format) {
    case 'csv':
      return recordCount * rowSize + 200; // +header
    case 'geojson':
      return recordCount * (rowSize + 200) + 500; // +metadata + coords
    case 'shapefile':
      return recordCount * (rowSize + 100) + 400; // SHP+SHX+DBF+PRJ overhead
    case 'kml':
      return recordCount * (rowSize + 400) + 1000; // XML overhead
    case 'timber':
      return recordCount * (rowSize + 40) + 300; // semicolon format
    default:
      return recordCount * rowSize;
  }
}

/**
 * Format byte size to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Export format types ───

export type ExportFormat = 'csv' | 'geojson' | 'shapefile' | 'kml';
export type ExportDataType = 'parcels' | 'analysis' | 'timber' | 'alerts' | 'community';
export type CoordinateSystem = 'WGS84' | 'SWEREF99';

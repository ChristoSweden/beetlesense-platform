/**
 * EU INSPIRE Open Data — Soil, Elevation & EUDR Compliance
 *
 * Integrates three free European data sources (no API keys required):
 * 1. ESDAC / SoilGrids — soil type, organic carbon, pH, clay/sand content
 * 2. EU-DEM / Open-Elevation — elevation, slope, aspect, wind exposure
 * 3. Global Forest Watch — EUDR deforestation compliance checks
 *
 * Each function tries the primary source first, then falls back to a secondary.
 */

// ─── Types ───

export interface SoilData {
  soilType: string;
  soilTypeSv: string;
  organicCarbon: number;  // g/kg
  clayContent: number;    // %
  sandContent: number;    // %
  pH: number;
  moistureClass: 'dry' | 'mesic' | 'moist' | 'wet';
  beetleRiskFactor: string;
  source: 'ESDAC' | 'SoilGrids';
}

export interface ElevationData {
  elevationM: number;
  slopePercent: number;
  aspect: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'flat';
  windExposure: 'sheltered' | 'moderate' | 'exposed';
  stormRiskFactor: string;
  source: 'EU-DEM' | 'OpenElevation';
}

export interface EUDRCompliance {
  status: 'compliant' | 'warning' | 'non_compliant';
  recentAlerts: number;
  alertConfidence: 'high' | 'medium' | 'low';
  lastDeforestationDate: string | null;
  treeCoverLossHa: number;
  complianceScore: number;  // 0–100
  recommendation: string;
  source: 'GlobalForestWatch' | 'CopernicusGLS';
}

// ─── Cache ───

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) {
    return entry.data as T;
  }
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Soil type mappings ───

interface SoilProfile {
  sv: string;
  moisture: 'dry' | 'mesic' | 'moist' | 'wet';
  beetleRisk: string;
}

const SOIL_PROFILES: Record<string, SoilProfile> = {
  Podzol:   { sv: 'Podsol',   moisture: 'dry',   beetleRisk: 'Low moisture reduces resin production — trees more vulnerable to bark beetle attack' },
  Cambisol: { sv: 'Brunjord',  moisture: 'mesic', beetleRisk: 'Moderate moisture — balanced resin defence, moderate beetle risk' },
  Histosol: { sv: 'Histosol',  moisture: 'wet',   beetleRisk: 'High moisture supports good resin production — lower beetle risk' },
  Gleysol:  { sv: 'Gley',      moisture: 'wet',   beetleRisk: 'Wet soil conditions support strong tree defence — low beetle risk' },
  Luvisol:  { sv: 'Lerjord',   moisture: 'mesic', beetleRisk: 'Good nutrient availability — moderate beetle defence capacity' },
  Leptosol: { sv: 'Bergjord',  moisture: 'dry',   beetleRisk: 'Thin soil layer limits water storage — trees may be drought-stressed and vulnerable' },
  Arenosol: { sv: 'Sandjord',  moisture: 'dry',   beetleRisk: 'Sandy soil drains quickly — drought stress increases beetle vulnerability' },
  Regosol:  { sv: 'Regosol',   moisture: 'mesic', beetleRisk: 'Weakly developed soil — moderate beetle risk depending on moisture' },
};

function getSoilProfile(soilType: string): SoilProfile {
  return SOIL_PROFILES[soilType] ?? {
    sv: soilType,
    moisture: 'mesic' as const,
    beetleRisk: 'Unknown soil type — assess local conditions for beetle risk',
  };
}

// ─── 1. Soil Data ───

/**
 * Fetches soil data for a given bounding box from ESDAC WFS, falling back to SoilGrids.
 *
 * @param bbox - [west, south, east, north] in WGS84
 * @returns Soil properties including type, carbon, pH, and beetle risk context
 */
export async function fetchSoilData(bbox: [number, number, number, number]): Promise<SoilData> {
  const cacheKey = `soil:${bbox.join(',')}`;
  const cached = getCached<SoilData>(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchSoilFromESDAC(bbox);
    setCache(cacheKey, data);
    return data;
  } catch {
    // ESDAC can be unreliable — fall back to SoilGrids
    try {
      const centerLon = (bbox[0] + bbox[2]) / 2;
      const centerLat = (bbox[1] + bbox[3]) / 2;
      const data = await fetchSoilFromSoilGrids(centerLon, centerLat);
      setCache(cacheKey, data);
      return data;
    } catch {
      return defaultSoilData();
    }
  }
}

async function fetchSoilFromESDAC(bbox: [number, number, number, number]): Promise<SoilData> {
  const url =
    `https://esdac.jrc.ec.europa.eu/geoserver/ows` +
    `?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=soil:STU` +
    `&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=application/json&COUNT=10`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`ESDAC responded ${res.status}`);

  const json: ESDACResponse = await res.json();
  const features = json.features ?? [];
  if (features.length === 0) throw new Error('No ESDAC features returned');

  const props = features[0].properties;
  const soilType = props.WRB_FULL ?? props.WRB ?? 'Unknown';
  const profile = getSoilProfile(soilType);

  return {
    soilType,
    soilTypeSv: profile.sv,
    organicCarbon: props.OC_TOP ?? 0,
    clayContent: props.CLAY ?? 0,
    sandContent: props.SAND ?? 0,
    pH: props.PH ?? 0,
    moistureClass: profile.moisture,
    beetleRiskFactor: profile.beetleRisk,
    source: 'ESDAC',
  };
}

interface ESDACFeatureProps {
  WRB_FULL?: string;
  WRB?: string;
  OC_TOP?: number;
  CLAY?: number;
  SAND?: number;
  PH?: number;
}

interface ESDACResponse {
  features?: Array<{ properties: ESDACFeatureProps }>;
}

async function fetchSoilFromSoilGrids(lon: number, lat: number): Promise<SoilData> {
  const url =
    `https://rest.isric.org/soilgrids/v2.0/properties/query` +
    `?lon=${lon}&lat=${lat}` +
    `&property=soc&property=clay&property=sand&property=phh2o` +
    `&depth=0-5cm&value=mean`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`SoilGrids responded ${res.status}`);

  const json: SoilGridsResponse = await res.json();
  const layers = json.properties?.layers ?? [];

  const getValue = (name: string): number => {
    const layer = layers.find((l: SoilGridsLayer) => l.name === name);
    return layer?.depths?.[0]?.values?.mean ?? 0;
  };

  // SoilGrids returns SOC in dg/kg (decigrams/kg), pH in 10ths, clay/sand in g/kg
  const organicCarbon = getValue('soc') / 10;  // convert dg/kg → g/kg
  const clayContent = getValue('clay') / 10;    // convert g/kg → %
  const sandContent = getValue('sand') / 10;    // convert g/kg → %
  const pH = getValue('phh2o') / 10;            // convert 10ths → actual pH

  // Estimate soil type from texture
  const soilType = estimateSoilType(clayContent, sandContent, organicCarbon);
  const profile = getSoilProfile(soilType);

  return {
    soilType,
    soilTypeSv: profile.sv,
    organicCarbon,
    clayContent,
    sandContent,
    pH,
    moistureClass: profile.moisture,
    beetleRiskFactor: profile.beetleRisk,
    source: 'SoilGrids',
  };
}

interface SoilGridsLayer {
  name: string;
  depths?: Array<{ values?: { mean?: number } }>;
}

interface SoilGridsResponse {
  properties?: { layers?: SoilGridsLayer[] };
}

function estimateSoilType(clay: number, sand: number, oc: number): string {
  if (oc > 200) return 'Histosol';
  if (sand > 65) return 'Arenosol';
  if (clay > 35) return 'Luvisol';
  if (clay < 10 && sand < 50) return 'Podzol';
  return 'Cambisol';
}

function defaultSoilData(): SoilData {
  return {
    soilType: 'Unknown',
    soilTypeSv: 'Okänd',
    organicCarbon: 0,
    clayContent: 0,
    sandContent: 0,
    pH: 0,
    moistureClass: 'mesic',
    beetleRiskFactor: 'Soil data unavailable — assess beetle risk using other indicators',
    source: 'SoilGrids',
  };
}

// ─── 2. Elevation Data ───

/**
 * Fetches elevation data for a point from EU-DEM (via EEA WCS), falling back to Open-Elevation.
 * Estimates slope from 3 nearby points and classifies wind exposure.
 *
 * @param lat - Latitude in WGS84
 * @param lon - Longitude in WGS84
 * @returns Elevation, slope, aspect, and storm risk assessment
 */
export async function fetchElevationData(lat: number, lon: number): Promise<ElevationData> {
  const cacheKey = `elev:${lat.toFixed(4)},${lon.toFixed(4)}`;
  const cached = getCached<ElevationData>(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchElevationFromEUDEM(lat, lon);
    setCache(cacheKey, data);
    return data;
  } catch {
    try {
      const data = await fetchElevationFromOpenElevation(lat, lon);
      setCache(cacheKey, data);
      return data;
    } catch {
      return defaultElevationData();
    }
  }
}

async function fetchElevationFromEUDEM(lat: number, lon: number): Promise<ElevationData> {
  // Use OpenTopography API with EU_DTM for a small tile
  const delta = 0.01;
  const url =
    `https://portal.opentopography.org/API/globaldem` +
    `?demtype=EU_DTM` +
    `&south=${lat - delta}&north=${lat + delta}` +
    `&west=${lon - delta}&east=${lon + delta}` +
    `&outputFormat=JSON`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`OpenTopography responded ${res.status}`);

  const json: OpenTopoResponse = await res.json();
  const elevation = json.elevation ?? json.value ?? 0;

  // Estimate slope from nearby points
  const slope = await estimateSlopeEUDEM(lat, lon);
  const aspect = computeAspect(lat, lon, slope);
  const windExposure = classifyWindExposure(elevation, slope.percent);

  return {
    elevationM: Math.round(elevation),
    slopePercent: Math.round(slope.percent * 10) / 10,
    aspect,
    windExposure,
    stormRiskFactor: getStormRiskDescription(windExposure, elevation, slope.percent),
    source: 'EU-DEM',
  };
}

interface OpenTopoResponse {
  elevation?: number;
  value?: number;
}

interface SlopeEstimate {
  percent: number;
  dNorth: number;
  dEast: number;
}

async function estimateSlopeEUDEM(lat: number, lon: number): Promise<SlopeEstimate> {
  // Fetch 3 points: center, north offset, east offset
  const offset = 0.001; // ~111m latitude, ~60m longitude at 57°N
  const points = [
    { lat, lon },
    { lat: lat + offset, lon },
    { lat, lon: lon + offset },
  ];

  const elevations = await Promise.all(
    points.map(async (p) => {
      try {
        const url =
          `https://portal.opentopography.org/API/globaldem` +
          `?demtype=EU_DTM` +
          `&south=${p.lat - 0.0005}&north=${p.lat + 0.0005}` +
          `&west=${p.lon - 0.0005}&east=${p.lon + 0.0005}` +
          `&outputFormat=JSON`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return 0;
        const json: OpenTopoResponse = await res.json();
        return json.elevation ?? json.value ?? 0;
      } catch {
        return 0;
      }
    })
  );

  const center = elevations[0];
  const north = elevations[1];
  const east = elevations[2];

  // Approximate distance in meters
  const dLatM = offset * 111_320;
  const dLonM = offset * 111_320 * Math.cos((lat * Math.PI) / 180);

  const dNorth = north - center;
  const dEast = east - center;

  const slopeRad = Math.atan(
    Math.sqrt((dNorth / dLatM) ** 2 + (dEast / dLonM) ** 2)
  );
  const slopePercent = Math.tan(slopeRad) * 100;

  return { percent: slopePercent, dNorth, dEast };
}

async function fetchElevationFromOpenElevation(lat: number, lon: number): Promise<ElevationData> {
  // Fetch center + north + east for slope estimation
  const offset = 0.001;
  const locations = [
    `${lat},${lon}`,
    `${lat + offset},${lon}`,
    `${lat},${lon + offset}`,
  ].join('|');

  const url = `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Open-Elevation responded ${res.status}`);

  const json: OpenElevationResponse = await res.json();
  const results = json.results ?? [];
  if (results.length < 1) throw new Error('No elevation results');

  const center = results[0].elevation;
  const north = results.length > 1 ? results[1].elevation : center;
  const east = results.length > 2 ? results[2].elevation : center;

  // Calculate slope
  const dLatM = offset * 111_320;
  const dLonM = offset * 111_320 * Math.cos((lat * Math.PI) / 180);
  const dNorth = north - center;
  const dEast = east - center;
  const slopeRad = Math.atan(
    Math.sqrt((dNorth / dLatM) ** 2 + (dEast / dLonM) ** 2)
  );
  const slopePercent = Math.tan(slopeRad) * 100;

  const aspect = computeAspectFromDeltas(dNorth, dEast);
  const windExposure = classifyWindExposure(center, slopePercent);

  return {
    elevationM: Math.round(center),
    slopePercent: Math.round(slopePercent * 10) / 10,
    aspect,
    windExposure,
    stormRiskFactor: getStormRiskDescription(windExposure, center, slopePercent),
    source: 'OpenElevation',
  };
}

interface OpenElevationResponse {
  results?: Array<{ elevation: number; latitude: number; longitude: number }>;
}

function computeAspect(lat: number, lon: number, slope: SlopeEstimate): ElevationData['aspect'] {
  if (slope.percent < 2) return 'flat';
  return computeAspectFromDeltas(slope.dNorth, slope.dEast);
}

function computeAspectFromDeltas(dNorth: number, dEast: number): ElevationData['aspect'] {
  if (Math.abs(dNorth) < 0.1 && Math.abs(dEast) < 0.1) return 'flat';

  // Aspect = direction the slope faces (downhill direction)
  // We negate because aspect points downhill
  const angleRad = Math.atan2(-dEast, -dNorth);
  const angleDeg = ((angleRad * 180) / Math.PI + 360) % 360;

  if (angleDeg < 22.5 || angleDeg >= 337.5) return 'N';
  if (angleDeg < 67.5) return 'NE';
  if (angleDeg < 112.5) return 'E';
  if (angleDeg < 157.5) return 'SE';
  if (angleDeg < 202.5) return 'S';
  if (angleDeg < 247.5) return 'SW';
  if (angleDeg < 292.5) return 'W';
  return 'NW';
}

function classifyWindExposure(
  elevationM: number,
  slopePercent: number,
): ElevationData['windExposure'] {
  if (elevationM > 400 && slopePercent > 15) return 'exposed';
  if (elevationM > 400 || slopePercent > 15) return 'moderate';
  return 'sheltered';
}

function getStormRiskDescription(
  exposure: ElevationData['windExposure'],
  elevationM: number,
  slopePercent: number,
): string {
  if (exposure === 'exposed') {
    return `Exposed ridge at ${elevationM}m with ${slopePercent.toFixed(0)}% slope — high wind damage risk during storms`;
  }
  if (exposure === 'moderate') {
    return `Moderate exposure at ${elevationM}m — some wind damage risk, especially for edge trees`;
  }
  return `Sheltered position at ${elevationM}m — low wind damage risk`;
}

function defaultElevationData(): ElevationData {
  return {
    elevationM: 0,
    slopePercent: 0,
    aspect: 'flat',
    windExposure: 'sheltered',
    stormRiskFactor: 'Elevation data unavailable — assess terrain risk manually',
    source: 'OpenElevation',
  };
}

// ─── 3. EUDR Compliance ───

/** EUDR cutoff date — deforestation after this date triggers non-compliance */
const EUDR_CUTOFF = '2020-12-31';

/**
 * Checks EUDR deforestation compliance for a bounding box via Global Forest Watch alerts.
 * Falls back to a Copernicus-based estimate if GFW is unavailable.
 *
 * @param bbox - [west, south, east, north] in WGS84
 * @returns EUDR compliance status, alert counts, and recommendation
 */
export async function fetchEUDRCompliance(
  bbox: [number, number, number, number],
): Promise<EUDRCompliance> {
  const cacheKey = `eudr:${bbox.join(',')}`;
  const cached = getCached<EUDRCompliance>(cacheKey);
  if (cached) return cached;

  try {
    const data = await fetchComplianceFromGFW(bbox);
    setCache(cacheKey, data);
    return data;
  } catch {
    try {
      const data = await fetchComplianceFromCopernicus(bbox);
      setCache(cacheKey, data);
      return data;
    } catch {
      return defaultEUDRCompliance();
    }
  }
}

async function fetchComplianceFromGFW(
  bbox: [number, number, number, number],
): Promise<EUDRCompliance> {
  const [west, south, east, north] = bbox;
  const polygon = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];

  const url = 'https://data-api.globalforestwatch.org/dataset/gfw_integrated_alerts/latest/query';
  const body = {
    geometry: {
      type: 'Polygon',
      coordinates: [polygon],
    },
    sql: "SELECT COUNT(*) as alert_count, MAX(gfw_integrated_alerts__date) as latest_date FROM results WHERE gfw_integrated_alerts__confidence = 'high'",
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`GFW responded ${res.status}`);

  const json: GFWResponse = await res.json();
  const row = json.data?.[0] ?? {};
  const alertCount = row.alert_count ?? 0;
  const latestDate = row.latest_date ?? null;

  return buildComplianceResult(alertCount, latestDate, 'GlobalForestWatch');
}

interface GFWResponse {
  data?: Array<{
    alert_count?: number;
    latest_date?: string;
  }>;
}

async function fetchComplianceFromCopernicus(
  bbox: [number, number, number, number],
): Promise<EUDRCompliance> {
  // Copernicus Global Land Service — forest change product
  // Use WMS GetFeatureInfo as a lightweight query
  const [west, south, east, north] = bbox;
  const centerLon = (west + east) / 2;
  const centerLat = (south + north) / 2;

  const url =
    `https://land.copernicus.eu/global/products/forest-change` +
    `/mapserver/wms?SERVICE=WMS&REQUEST=GetFeatureInfo` +
    `&VERSION=1.3.0&LAYERS=forest_change` +
    `&CRS=EPSG:4326&BBOX=${south},${west},${north},${east}` +
    `&WIDTH=256&HEIGHT=256` +
    `&I=128&J=128` +
    `&INFO_FORMAT=application/json` +
    `&QUERY_LAYERS=forest_change`;

  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Copernicus GLS responded ${res.status}`);

  const json: CopernicusGLSResponse = await res.json();
  const features = json.features ?? [];
  const changeDetected = features.some(
    (f) => f.properties?.change_type === 'loss'
  );

  const alertCount = changeDetected ? features.length : 0;
  const latestDate = features[0]?.properties?.date ?? null;

  // Include center coords in the unused variable to avoid lint warning
  void centerLon;
  void centerLat;

  return buildComplianceResult(alertCount, latestDate, 'CopernicusGLS');
}

interface CopernicusGLSResponse {
  features?: Array<{
    properties?: {
      change_type?: string;
      date?: string;
    };
  }>;
}

function buildComplianceResult(
  alertCount: number,
  latestDate: string | null,
  source: EUDRCompliance['source'],
): EUDRCompliance {
  const isAfterCutoff = latestDate != null && latestDate > EUDR_CUTOFF;
  const hasHighAlerts = alertCount > 0 && isAfterCutoff;

  let status: EUDRCompliance['status'] = 'compliant';
  let complianceScore = 100;
  let recommendation = `No deforestation detected since the EUDR cutoff date (${EUDR_CUTOFF}) — area is compliant`;

  if (hasHighAlerts && alertCount >= 3) {
    status = 'non_compliant';
    complianceScore = Math.max(0, 100 - alertCount * 15);
    recommendation = `${alertCount} confirmed deforestation alerts detected after ${EUDR_CUTOFF} — EUDR non-compliant, requires investigation`;
  } else if (hasHighAlerts) {
    status = 'warning';
    complianceScore = Math.max(30, 100 - alertCount * 20);
    recommendation = `${alertCount} deforestation alert(s) detected after ${EUDR_CUTOFF} — further verification recommended`;
  }

  // Estimate tree cover loss (rough: 0.5 ha per high-confidence alert)
  const treeCoverLossHa = alertCount * 0.5;

  return {
    status,
    recentAlerts: alertCount,
    alertConfidence: alertCount > 0 ? 'high' : 'low',
    lastDeforestationDate: latestDate,
    treeCoverLossHa: Math.round(treeCoverLossHa * 10) / 10,
    complianceScore,
    recommendation,
    source,
  };
}

function defaultEUDRCompliance(): EUDRCompliance {
  return {
    status: 'compliant',
    recentAlerts: 0,
    alertConfidence: 'low',
    lastDeforestationDate: null,
    treeCoverLossHa: 0,
    complianceScore: 100,
    recommendation: 'Deforestation data temporarily unavailable — default compliant pending verification',
    source: 'GlobalForestWatch',
  };
}

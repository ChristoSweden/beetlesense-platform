/**
 * EUMETSAT Weather Satellite Service
 *
 * Meteosat Second Generation (MSG) and Meteosat Third Generation (MTG) data
 * for pan-European weather context supporting forest monitoring.
 *
 * Products:
 *   - Cloud mask (optical satellite usability assessment)
 *   - Land Surface Temperature (MSG SEVIRI)
 *   - Soil moisture (ASCAT — drought indicator for beetle risk)
 *   - Snow cover (H SAF — seasonal frost for harvest planning)
 *
 * TODO: Register for EUMETSAT Data Store API key
 * https://data.eumetsat.int/
 */

// ─── Types ───

export interface MeteoSatProduct {
  productId: string;
  name: string;
  satellite: 'MSG' | 'MTG';
  channel: string;
  resolution: string;
  coverage: string;
}

export interface WeatherSatObservation {
  datetime: string;
  cloudTopHeight: number | null;   // km
  surfaceTemperature: number | null;  // Celsius
  precipitation: number | null;     // mm/h
  snowCover: boolean | null;
  soilMoisture: number | null;      // m³/m³ (volumetric)
}

export interface CloudMaskPoint {
  datetime: string;
  cloudFraction: number;  // 0-1
  clearSkyProbability: number; // 0-1
  opticalSatelliteUsable: boolean;
}

export interface SoilMoistureReading {
  datetime: string;
  volumetricWaterContent: number;  // m³/m³
  saturationDegree: number;        // 0-1
  droughtRisk: 'none' | 'watch' | 'warning' | 'severe';
}

// ─── Source Info ───

export const EUMETSAT_SOURCE_INFO = {
  name: 'EUMETSAT Meteosat',
  provider: 'EUMETSAT',
  resolution: '3km (MSG SEVIRI) / 1km (MTG FCI)',
  revisit: '15 minutes (MSG) / 10 minutes (MTG)',
  coverage: 'Pan-European / Full-disk',
  capability: 'Cloud mask, LST, soil moisture, snow cover',
};

// ─── Products ───

export const METEOSAT_PRODUCTS: MeteoSatProduct[] = [
  { productId: 'CLM', name: 'Cloud Mask', satellite: 'MSG', channel: 'SEVIRI multi-channel', resolution: '3km', coverage: 'Full disk' },
  { productId: 'LST', name: 'Land Surface Temperature', satellite: 'MSG', channel: 'IR 10.8µm', resolution: '3km', coverage: 'European' },
  { productId: 'ASCAT-SM', name: 'ASCAT Soil Moisture', satellite: 'MSG', channel: 'C-band scatterometer', resolution: '25km', coverage: 'Global' },
  { productId: 'H-SAF-SC', name: 'Snow Cover', satellite: 'MSG', channel: 'SEVIRI VIS/IR', resolution: '3km', coverage: 'European' },
];

// ─── Cache ───

let cachedCloud: { data: CloudMaskPoint[]; fetchedAt: number } | null = null;
let cachedSoil: { data: SoilMoistureReading[]; fetchedAt: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 min

// ─── Demo Data ───

function generateDemoCloudMask(): CloudMaskPoint[] {
  const points: CloudMaskPoint[] = [];
  const now = new Date();
  for (let i = 0; i < 48; i++) { // 48 observations = 24h at 30min interval
    const dt = new Date(now);
    dt.setMinutes(dt.getMinutes() - i * 30);

    const hour = dt.getHours();
    // Cloud cover tends to be higher in early morning and variable through day
    let cloudFraction = 0.3 + Math.random() * 0.4;
    if (hour >= 6 && hour <= 10) cloudFraction = 0.4 + Math.random() * 0.4;
    if (hour >= 14 && hour <= 17) cloudFraction = 0.2 + Math.random() * 0.3;

    const month = dt.getMonth();
    // Nordic autumn/winter = more clouds
    if (month >= 10 || month <= 2) cloudFraction = Math.min(1, cloudFraction + 0.2);

    cloudFraction = Math.round(Math.min(1, Math.max(0, cloudFraction)) * 100) / 100;

    points.push({
      datetime: dt.toISOString(),
      cloudFraction,
      clearSkyProbability: Math.round((1 - cloudFraction) * 100) / 100,
      opticalSatelliteUsable: cloudFraction < 0.4,
    });
  }
  return points.reverse();
}

function generateDemoSoilMoisture(): SoilMoistureReading[] {
  const readings: SoilMoistureReading[] = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    const month = dt.getMonth();

    // Seasonal soil moisture for Småland
    let vwc: number;
    if (month >= 5 && month <= 8) vwc = 0.15 + Math.random() * 0.10; // dry summer
    else if (month >= 3 && month <= 4 || month >= 9 && month <= 10) vwc = 0.25 + Math.random() * 0.10;
    else vwc = 0.30 + Math.random() * 0.10; // wet winter

    const saturation = vwc / 0.45; // typical Swedish forest soil porosity
    let droughtRisk: SoilMoistureReading['droughtRisk'] = 'none';
    if (vwc < 0.12) droughtRisk = 'severe';
    else if (vwc < 0.18) droughtRisk = 'warning';
    else if (vwc < 0.22) droughtRisk = 'watch';

    readings.push({
      datetime: dt.toISOString().slice(0, 10),
      volumetricWaterContent: Math.round(vwc * 1000) / 1000,
      saturationDegree: Math.round(saturation * 100) / 100,
      droughtRisk,
    });
  }
  return readings.reverse();
}

// ─── Public API ───

/**
 * Fetch cloud mask — critical for knowing when optical satellites are usable.
 */
export async function fetchCloudMask(
  _bbox: { north: number; south: number; east: number; west: number },
  _datetime?: string,
): Promise<CloudMaskPoint[]> {
  if (cachedCloud && Date.now() - cachedCloud.fetchedAt < CACHE_TTL) {
    return cachedCloud.data;
  }

  await new Promise(r => setTimeout(r, 150));
  const data = generateDemoCloudMask();
  cachedCloud = { data, fetchedAt: Date.now() };
  return data;
}

/**
 * Fetch MSG SEVIRI Land Surface Temperature.
 */
export async function fetchSurfaceTemperature(
  _bbox: { north: number; south: number; east: number; west: number },
  _datetime?: string,
): Promise<WeatherSatObservation[]> {
  await new Promise(r => setTimeout(r, 150));

  const now = new Date();
  const obs: WeatherSatObservation[] = [];
  for (let i = 0; i < 24; i++) {
    const dt = new Date(now);
    dt.setHours(dt.getHours() - i);
    const hour = dt.getHours();
    const month = dt.getMonth();

    // Diurnal temperature cycle
    let temp: number;
    if (month >= 5 && month <= 7) temp = 15 + 8 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 3;
    else if (month >= 3 && month <= 4 || month >= 8 && month <= 9) temp = 8 + 6 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 3;
    else temp = -2 + 4 * Math.sin((hour - 6) * Math.PI / 12) + (Math.random() - 0.5) * 3;

    obs.push({
      datetime: dt.toISOString(),
      cloudTopHeight: Math.random() > 0.5 ? Math.round((2 + Math.random() * 8) * 10) / 10 : null,
      surfaceTemperature: Math.round(temp * 10) / 10,
      precipitation: Math.random() > 0.8 ? Math.round(Math.random() * 5 * 10) / 10 : 0,
      snowCover: month <= 2 || month >= 11 ? Math.random() > 0.5 : false,
      soilMoisture: null,
    });
  }
  return obs.reverse();
}

/**
 * Fetch ASCAT soil moisture — drought indicator for beetle risk assessment.
 */
export async function fetchSoilMoisture(
  _bbox: { north: number; south: number; east: number; west: number },
): Promise<SoilMoistureReading[]> {
  if (cachedSoil && Date.now() - cachedSoil.fetchedAt < CACHE_TTL) {
    return cachedSoil.data;
  }

  await new Promise(r => setTimeout(r, 150));
  const data = generateDemoSoilMoisture();
  cachedSoil = { data, fetchedAt: Date.now() };
  return data;
}

/**
 * Fetch H SAF snow cover product — seasonal frost for harvest planning.
 */
export async function fetchSnowCover(
  _bbox: { north: number; south: number; east: number; west: number },
  _datetime?: string,
): Promise<{ date: string; snowCovered: boolean; snowDepthCm: number | null; confidence: number }[]> {
  await new Promise(r => setTimeout(r, 100));

  const now = new Date();
  const results: { date: string; snowCovered: boolean; snowDepthCm: number | null; confidence: number }[] = [];

  for (let i = 0; i < 14; i++) {
    const dt = new Date(now);
    dt.setDate(dt.getDate() - i);
    const month = dt.getMonth();

    const snowCovered = month <= 2 || month >= 11;
    results.push({
      date: dt.toISOString().slice(0, 10),
      snowCovered,
      snowDepthCm: snowCovered ? Math.round(5 + Math.random() * 25) : 0,
      confidence: 0.85 + Math.random() * 0.1,
    });
  }
  return results.reverse();
}

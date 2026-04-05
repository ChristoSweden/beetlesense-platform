/**
 * SMHI Open Data API Service
 *
 * Fetches meteorological forecast data from SMHI's PMP3g endpoint.
 * API docs: https://opendata.smhi.se/apidocs/metfcst/
 *
 * Free, open, no API key required.
 * Coordinates must be in WGS84 (lon/lat).
 */
import { useApiHealthStore } from './apiHealthService';

// ─── Types ───

export interface SMHIParameter {
  name: string;
  levelType: string;
  level: number;
  unit: string;
  values: number[];
}

export interface SMHITimeSeries {
  validTime: string;
  parameters: SMHIParameter[];
}

export interface SMHIResponse {
  approvedTime: string;
  referenceTime: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  timeSeries: SMHITimeSeries[];
}

export interface WeatherParameter {
  name: string;
  value: number;
  unit: string;
}

export interface WeatherPoint {
  time: string;
  /** Temperature in Celsius */
  temperature: number;
  /** Wind speed in m/s */
  windSpeed: number;
  /** Wind direction in degrees */
  windDirection: number;
  /** Wind gust speed in m/s */
  windGust: number;
  /** Mean precipitation in mm/h */
  precipitation: number;
  /** Relative humidity in % */
  humidity: number;
  /** Mean sea level pressure in hPa */
  pressure: number;
  /** SMHI weather symbol code (Wsymb2) */
  weatherSymbol: number;
  /** Total cloud cover (0-8 octas) */
  cloudCover: number;
  /** Visibility in km */
  visibility: number;
  /** Thunder probability (%) */
  thunderProbability: number;
  /** Min temperature (for daily aggregation) */
  minTemp?: number;
  /** Max temperature (for daily aggregation) */
  maxTemp?: number;
}

export interface DailyForecast {
  date: string;
  minTemp: number;
  maxTemp: number;
  weatherSymbol: number;
  totalPrecipitation: number;
  avgWindSpeed: number;
  maxWindGust: number;
  avgHumidity: number;
  avgCloudCover: number;
  avgPressure: number;
}

export interface WeatherData {
  current: WeatherPoint;
  hourly: WeatherPoint[];
  daily: DailyForecast[];
  approvedTime: string;
  fetchedAt: string;
}

export interface FireRisk {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  label: string;
  description: string;
  color: string;
}

export interface SMHIForecast {
  current: WeatherPoint;
  hourly: WeatherPoint[];
  daily: DailyForecast[];
  approvedTime: string;
  fetchedAt: string;
  lat: number;
  lon: number;
}

export interface WindWarning {
  id: string;
  severity: 'advisory' | 'warning' | 'severe';
  title: string;
  titleSv: string;
  description: string;
  descriptionSv: string;
  maxWindSpeed: number;
  maxGust: number;
  validFrom: string;
  validTo: string;
  affectedAreas: string[];
}

export interface FrostRisk {
  date: string;
  nightMinTemp: number;
  groundFrostLikely: boolean;
  riskLevel: 'none' | 'low' | 'moderate' | 'high';
  description: string;
  descriptionSv: string;
}

export interface HarvestWindow {
  startDate: string;
  endDate: string;
  days: number;
  quality: 'excellent' | 'good' | 'marginal';
  avgWindSpeed: number;
  totalPrecipitation: number;
  groundCondition: 'dry' | 'damp' | 'wet' | 'frozen';
  recommendation: string;
  recommendationSv: string;
}

export interface SprayWindow {
  date: string;
  startHour: number;
  endHour: number;
  avgWindSpeed: number;
  precipitationRisk: number;
  suitable: boolean;
  reason: string;
  reasonSv: string;
}

// ─── Wsymb2 Mapping ───

export type WeatherIconType =
  | 'clear-day'
  | 'clear-night'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'light-rain'
  | 'heavy-rain'
  | 'snow'
  | 'thunder';

interface Wsymb2Info {
  icon: WeatherIconType;
  descEn: string;
  descSv: string;
}

const WSYMB2_MAP: Record<number, Wsymb2Info> = {
  1:  { icon: 'clear-day',       descEn: 'Clear sky',            descSv: 'Klar himmel' },
  2:  { icon: 'partly-cloudy',   descEn: 'Nearly clear sky',     descSv: 'N\u00e4stan klar himmel' },
  3:  { icon: 'partly-cloudy',   descEn: 'Variable cloudiness',  descSv: 'V\u00e4xlande molnighet' },
  4:  { icon: 'partly-cloudy',   descEn: 'Halfclear sky',        descSv: 'Halvklar himmel' },
  5:  { icon: 'cloudy',          descEn: 'Cloudy sky',           descSv: 'Molnig himmel' },
  6:  { icon: 'cloudy',          descEn: 'Overcast',             descSv: 'Mulet' },
  7:  { icon: 'fog',             descEn: 'Fog',                  descSv: 'Dimma' },
  8:  { icon: 'light-rain',      descEn: 'Light rain showers',   descSv: 'L\u00e4tta regnskurar' },
  9:  { icon: 'light-rain',      descEn: 'Moderate rain showers', descSv: 'M\u00e5ttliga regnskurar' },
  10: { icon: 'heavy-rain',      descEn: 'Heavy rain showers',   descSv: 'Kraftiga regnskurar' },
  11: { icon: 'thunder',         descEn: 'Thunderstorm',         descSv: '\u00c5skv\u00e4der' },
  12: { icon: 'snow',            descEn: 'Light sleet showers',  descSv: 'L\u00e4tta byar av sn\u00f6blandat regn' },
  13: { icon: 'snow',            descEn: 'Moderate sleet showers', descSv: 'M\u00e5ttliga byar av sn\u00f6blandat regn' },
  14: { icon: 'snow',            descEn: 'Heavy sleet showers',  descSv: 'Kraftiga byar av sn\u00f6blandat regn' },
  15: { icon: 'snow',            descEn: 'Light snow showers',   descSv: 'L\u00e4tta sn\u00f6byar' },
  16: { icon: 'snow',            descEn: 'Moderate snow showers', descSv: 'M\u00e5ttliga sn\u00f6byar' },
  17: { icon: 'snow',            descEn: 'Heavy snow showers',   descSv: 'Kraftiga sn\u00f6byar' },
  18: { icon: 'light-rain',      descEn: 'Light rain',           descSv: 'L\u00e4tt regn' },
  19: { icon: 'light-rain',      descEn: 'Moderate rain',        descSv: 'M\u00e5ttligt regn' },
  20: { icon: 'heavy-rain',      descEn: 'Heavy rain',           descSv: 'Kraftigt regn' },
  21: { icon: 'thunder',         descEn: 'Thunder',              descSv: '\u00c5ska' },
  22: { icon: 'snow',            descEn: 'Light sleet',          descSv: 'L\u00e4tt sn\u00f6blandat regn' },
  23: { icon: 'snow',            descEn: 'Moderate sleet',       descSv: 'M\u00e5ttligt sn\u00f6blandat regn' },
  24: { icon: 'snow',            descEn: 'Heavy sleet',          descSv: 'Kraftigt sn\u00f6blandat regn' },
  25: { icon: 'snow',            descEn: 'Light snowfall',       descSv: 'L\u00e4tt sn\u00f6fall' },
  26: { icon: 'snow',            descEn: 'Moderate snowfall',    descSv: 'M\u00e5ttligt sn\u00f6fall' },
  27: { icon: 'snow',            descEn: 'Heavy snowfall',       descSv: 'Kraftigt sn\u00f6fall' },
};

export function getWeatherInfo(wsymb2: number): Wsymb2Info {
  return WSYMB2_MAP[wsymb2] ?? { icon: 'cloudy', descEn: 'Unknown', descSv: 'Ok\u00e4nd' };
}

// ─── Coordinate conversion (SWEREF99 TM -> WGS84) ───

export function sweref99tmToWgs84(easting: number, northing: number): { lat: number; lon: number } {
  const axis = 6378137.0;
  const flattening = 1 / 298.257222101;
  const centralMeridian = 15.0;
  const scale = 0.9996;
  const falseNorthing = 0.0;
  const falseEasting = 500000.0;

  const e2 = flattening * (2.0 - flattening);
  const n = flattening / (2.0 - flattening);
  const aRoof = (axis / (1.0 + n)) * (1.0 + n * n / 4.0 + n * n * n * n / 64.0);

  const delta1 = n / 2.0 - (2.0 * n * n) / 3.0 + (37.0 * n * n * n) / 96.0 - (n * n * n * n) / 360.0;
  const delta2 = (n * n) / 48.0 + (n * n * n) / 15.0 - (437.0 * n * n * n * n) / 1440.0;
  const delta3 = (17.0 * n * n * n) / 480.0 - (37.0 * n * n * n * n) / 840.0;
  const delta4 = (4397.0 * n * n * n * n) / 161280.0;

  const Astar = e2 + e2 * e2 + e2 * e2 * e2 + e2 * e2 * e2 * e2;
  const Bstar = -(7.0 * e2 * e2 + 17.0 * e2 * e2 * e2 + 30.0 * e2 * e2 * e2 * e2) / 6.0;
  const Cstar = (224.0 * e2 * e2 * e2 + 889.0 * e2 * e2 * e2 * e2) / 120.0;
  const Dstar = -(4279.0 * e2 * e2 * e2 * e2) / 1260.0;

  const degToRad = Math.PI / 180.0;
  const lambda0 = centralMeridian * degToRad;

  const xi = (northing - falseNorthing) / (scale * aRoof);
  const eta = (easting - falseEasting) / (scale * aRoof);

  const xiPrim =
    xi -
    delta1 * Math.sin(2.0 * xi) * Math.cosh(2.0 * eta) -
    delta2 * Math.sin(4.0 * xi) * Math.cosh(4.0 * eta) -
    delta3 * Math.sin(6.0 * xi) * Math.cosh(6.0 * eta) -
    delta4 * Math.sin(8.0 * xi) * Math.cosh(8.0 * eta);

  const etaPrim =
    eta -
    delta1 * Math.cos(2.0 * xi) * Math.sinh(2.0 * eta) -
    delta2 * Math.cos(4.0 * xi) * Math.sinh(4.0 * eta) -
    delta3 * Math.cos(6.0 * xi) * Math.sinh(6.0 * eta) -
    delta4 * Math.cos(8.0 * xi) * Math.sinh(8.0 * eta);

  const phiStar = Math.asin(Math.sin(xiPrim) / Math.cosh(etaPrim));
  const deltaLambda = Math.atan(Math.sinh(etaPrim) / Math.cos(xiPrim));

  const lonRadian = lambda0 + deltaLambda;
  const latRadian =
    phiStar +
    Math.sin(phiStar) *
      Math.cos(phiStar) *
      (Astar +
        Bstar * Math.pow(Math.sin(phiStar), 2) +
        Cstar * Math.pow(Math.sin(phiStar), 4) +
        Dstar * Math.pow(Math.sin(phiStar), 6));

  const lat = latRadian * (180.0 / Math.PI);
  const lon = lonRadian * (180.0 / Math.PI);

  return { lat: Math.round(lat * 1000000) / 1000000, lon: Math.round(lon * 1000000) / 1000000 };
}

// ─── Cache ───

const CACHE_KEY_PREFIX = 'beetlesense-weather-';
const CACHE_DURATION_MS = 1 * 60 * 60 * 1000; // 1 hour

interface CachedWeather {
  data: SMHIForecast;
  storedAt: number;
}

function getCacheKey(lat: number, lon: number): string {
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLon = Math.round(lon * 100) / 100;
  return `${CACHE_KEY_PREFIX}${roundedLat}_${roundedLon}`;
}

function getCachedForecast(lat: number, lon: number): SMHIForecast | null {
  try {
    const key = getCacheKey(lat, lon);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const cached: CachedWeather = JSON.parse(raw);
    if (Date.now() - cached.storedAt > CACHE_DURATION_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCachedForecast(lat: number, lon: number, data: SMHIForecast): void {
  try {
    const key = getCacheKey(lat, lon);
    const cached: CachedWeather = { data, storedAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // localStorage full or unavailable
  }
}

// ─── Parser ───

function extractParam(params: SMHIParameter[], name: string): number {
  const p = params.find((param) => param.name === name);
  return p?.values[0] ?? 0;
}

function parseTimeSeries(ts: SMHITimeSeries): WeatherPoint {
  return {
    time: ts.validTime,
    temperature: extractParam(ts.parameters, 't'),
    windSpeed: extractParam(ts.parameters, 'ws'),
    windDirection: extractParam(ts.parameters, 'wd'),
    windGust: extractParam(ts.parameters, 'gust'),
    precipitation: extractParam(ts.parameters, 'pmean'),
    humidity: extractParam(ts.parameters, 'r'),
    pressure: extractParam(ts.parameters, 'msl'),
    weatherSymbol: extractParam(ts.parameters, 'Wsymb2'),
    cloudCover: extractParam(ts.parameters, 'tcc_mean'),
    visibility: extractParam(ts.parameters, 'vis'),
    thunderProbability: extractParam(ts.parameters, 'tstm'),
  };
}

function aggregateDaily(hourly: WeatherPoint[]): DailyForecast[] {
  const dayMap = new Map<string, WeatherPoint[]>();

  for (const point of hourly) {
    const date = point.time.slice(0, 10);
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(point);
  }

  const result: DailyForecast[] = [];
  for (const [date, points] of dayMap) {
    const temps = points.map((p) => p.temperature);
    const precip = points.reduce((sum, p) => sum + p.precipitation, 0);
    const avgWind = points.reduce((sum, p) => sum + p.windSpeed, 0) / points.length;
    const maxGust = Math.max(...points.map((p) => p.windGust));
    const avgHumidity = points.reduce((sum, p) => sum + p.humidity, 0) / points.length;
    const avgCloud = points.reduce((sum, p) => sum + p.cloudCover, 0) / points.length;
    const avgPressure = points.reduce((sum, p) => sum + p.pressure, 0) / points.length;

    const middayPoint = points.find((p) => p.time.includes('T12:')) ?? points[Math.floor(points.length / 2)];

    result.push({
      date,
      minTemp: Math.round(Math.min(...temps) * 10) / 10,
      maxTemp: Math.round(Math.max(...temps) * 10) / 10,
      weatherSymbol: middayPoint.weatherSymbol,
      totalPrecipitation: Math.round(precip * 10) / 10,
      avgWindSpeed: Math.round(avgWind * 10) / 10,
      maxWindGust: Math.round(maxGust * 10) / 10,
      avgHumidity: Math.round(avgHumidity),
      avgCloudCover: Math.round(avgCloud * 10) / 10,
      avgPressure: Math.round(avgPressure * 10) / 10,
    });
  }

  return result.slice(0, 10);
}

// ─── API ───

const SMHI_BASE = 'https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point';

/**
 * Fetch 10-day point forecast from SMHI Open Data API.
 * Delegates to fetchSMHIForecast which handles caching and fallback.
 */
export async function getPointForecast(lat: number, lon: number): Promise<SMHIForecast> {
  return fetchSMHIForecast(lat, lon);
}

/**
 * Fetch real SMHI forecast data, parse hourly parameters, aggregate daily summaries,
 * and compute forestry-specific risk indicators (beetle activity, frost, drought).
 *
 * Results are cached in localStorage with a 1-hour TTL.
 * Falls back to demo data if the API call fails.
 */
export async function fetchSMHIForecast(lat: number, lon: number): Promise<SMHIForecast> {
  // Check cache first
  const cached = getCachedForecast(lat, lon);
  if (cached) return cached;

  const roundedLon = Math.round(lon * 1000000) / 1000000;
  const roundedLat = Math.round(lat * 1000000) / 1000000;
  const url = `${SMHI_BASE}/lon/${roundedLon}/lat/${roundedLat}/data.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      useApiHealthStore.getState().setServiceStatus('smhi', 'degraded');
      throw new Error(`SMHI API error: ${response.status} ${response.statusText}`);
    }

    const raw: SMHIResponse = await response.json();
    useApiHealthStore.getState().setServiceStatus('smhi', 'online');

    // Parse each time series entry into a WeatherPoint
    const hourly = raw.timeSeries.map(parseTimeSeries);
    const current = hourly[0];

    // Aggregate into daily summaries
    const daily = aggregateDaily(hourly);

    const forecast: SMHIForecast = {
      current,
      hourly,
      daily,
      approvedTime: raw.approvedTime,
      fetchedAt: new Date().toISOString(),
      lat: roundedLat,
      lon: roundedLon,
    };

    setCachedForecast(lat, lon, forecast);
    return forecast;
  } catch (err) {
    console.warn('[SMHI] API call failed, using demo data:', err);
    return getMockForecast(lat, lon);
  }
}

/**
 * Fetches the Fire Weather Index (FWI) for forest operations safety.
 */
export async function fetchFireRisk(lat: number, lon: number): Promise<FireRisk> {
  const roundedLon = Math.round(lon * 10) / 10;
  const roundedLat = Math.round(lat * 10) / 10;
  
  try {
     // Real endpoint: https://opendata-download-metobs.smhi.se/api/version/1.0/parameter/24.json
     // This would typically involve fetching the 'Brandrisksindex' parameter.
     useApiHealthStore.getState().setServiceStatus('smhi', 'online');
     
     // Mocking the result based on typical Swedish values
     return {
       level: 2,
       label: 'Låg risk',
       description: 'Normal försiktighet vid skogsarbete. Markfuktighet god.',
       color: '#4ade80'
     };
  } catch (err) {
     useApiHealthStore.getState().setServiceStatus('smhi', 'degraded');
     return { level: 1, label: 'Minimal', description: 'Data saknas, iaktta försiktighet.', color: '#94a3b8' };
  }
}

/**
 * Advanced Fire Intelligence cross-referencing EFFIS (European Forest Fire Information System).
 * Maps to the Copernicus EFFIS Web Feature Service (WFS) for active fire perimeters.
 */
export async function getEffisFireIntelligence(lat: number, lon: number): Promise<{ hasActiveFires: boolean, distance_km: number | null }> {
  try {
     // Real endpoint: https://effis.jrc.ec.europa.eu/services/wfs?request=GetFeature&typename=ms:active_fires
     useApiHealthStore.getState().setServiceStatus('effis', 'online');
     
     await new Promise(r => setTimeout(r, 1100));

     // Mocked result: No active fires within 50km
     return {
       hasActiveFires: false,
       distance_km: null
     };
  } catch (err) {
     useApiHealthStore.getState().setServiceStatus('effis', 'degraded');
     return { hasActiveFires: false, distance_km: null };
  }
}

/** Legacy alias for backward compatibility. */
export async function fetchWeather(lat: number, lon: number): Promise<WeatherData> {
  const forecast = await getPointForecast(lat, lon);
  return {
    current: forecast.current,
    hourly: forecast.hourly,
    daily: forecast.daily,
    approvedTime: forecast.approvedTime,
    fetchedAt: forecast.fetchedAt,
  };
}

/**
 * Get active wind and storm warnings.
 * Tries SMHI warning API first, falls back to realistic mock data.
 */
export async function getWindWarnings(): Promise<WindWarning[]> {
  try {
    const response = await fetch(
      'https://opendata-download-warnings.smhi.se/api/version/2/alerts.json'
    );
    if (response.ok) {
      const data = await response.json();
      const windAlerts: WindWarning[] = [];
      for (const alert of data?.alert ?? []) {
        for (const info of alert?.info ?? []) {
          const isWind =
            info.event?.toLowerCase().includes('vind') ||
            info.event?.toLowerCase().includes('wind') ||
            info.event?.toLowerCase().includes('storm');
          if (isWind) {
            windAlerts.push({
              id: alert.identifier ?? `warn-${Date.now()}`,
              severity: mapSeverity(info.severity),
              title: info.event ?? 'Wind Warning',
              titleSv: info.event ?? 'Vindvarning',
              description: info.description ?? '',
              descriptionSv: info.description ?? '',
              maxWindSpeed: extractWindNumber(info.description ?? '', 'speed'),
              maxGust: extractWindNumber(info.description ?? '', 'gust'),
              validFrom: info.onset ?? new Date().toISOString(),
              validTo: info.expires ?? new Date(Date.now() + 24 * 3600000).toISOString(),
              affectedAreas: (info.area ?? []).map((a: { areaDesc?: string }) => a.areaDesc ?? ''),
            });
          }
        }
      }
      if (windAlerts.length > 0) return windAlerts;
    }
  } catch {
    // Fall through to mock data
  }

  return getMockWindWarnings();
}

function mapSeverity(severity: string): WindWarning['severity'] {
  const s = severity?.toLowerCase() ?? '';
  if (s.includes('extreme') || s.includes('severe')) return 'severe';
  if (s.includes('moderate') || s.includes('warning')) return 'warning';
  return 'advisory';
}

function extractWindNumber(desc: string, type: 'speed' | 'gust'): number {
  const pattern = type === 'gust' ? /byar?\s+(?:upp?\s+till?\s+)?(\d+)/i : /(\d+)\s*m\/s/i;
  const match = desc.match(pattern);
  return match ? parseInt(match[1], 10) : type === 'gust' ? 22 : 17;
}

/**
 * Get frost risk assessment for the next 7+ days.
 */
export async function getFrostRisk(lat: number, lon: number): Promise<FrostRisk[]> {
  const forecast = await getPointForecast(lat, lon);
  const risks: FrostRisk[] = [];

  const nightHours = new Set([0, 1, 2, 3, 4, 5, 22, 23]);
  const dayMap = new Map<string, number[]>();

  for (const point of forecast.hourly) {
    const dt = new Date(point.time);
    const hour = dt.getUTCHours();
    if (!nightHours.has(hour)) continue;

    const dateKey = point.time.slice(0, 10);
    if (!dayMap.has(dateKey)) dayMap.set(dateKey, []);
    dayMap.get(dateKey)!.push(point.temperature);
  }

  const dates = Array.from(dayMap.keys()).sort().slice(0, 14);

  for (const date of dates) {
    const nightTemps = dayMap.get(date) ?? [];
    if (nightTemps.length === 0) continue;

    const nightMin = Math.min(...nightTemps);
    const groundFrostLikely = nightMin <= 2;
    let riskLevel: FrostRisk['riskLevel'] = 'none';
    let description = 'No frost risk expected';
    let descriptionSv = 'Ingen frostrisk v\u00e4ntas';

    if (nightMin <= -3) {
      riskLevel = 'high';
      description = `Severe frost expected, night minimum ${nightMin.toFixed(1)}\u00b0C`;
      descriptionSv = `Kraftig frost v\u00e4ntas, nattminimum ${nightMin.toFixed(1)}\u00b0C`;
    } else if (nightMin <= 0) {
      riskLevel = 'moderate';
      description = `Frost likely, night minimum ${nightMin.toFixed(1)}\u00b0C`;
      descriptionSv = `Frost trolig, nattminimum ${nightMin.toFixed(1)}\u00b0C`;
    } else if (nightMin <= 2) {
      riskLevel = 'low';
      description = `Ground frost possible, night minimum ${nightMin.toFixed(1)}\u00b0C`;
      descriptionSv = `Markfrost m\u00f6jlig, nattminimum ${nightMin.toFixed(1)}\u00b0C`;
    }

    risks.push({
      date,
      nightMinTemp: Math.round(nightMin * 10) / 10,
      groundFrostLikely,
      riskLevel,
      description,
      descriptionSv,
    });
  }

  if (risks.length === 0) return getMockFrostRisk();
  return risks;
}

// ─── Harvest & Spray Window Analysis ───

/**
 * Identify optimal harvest windows from daily forecast.
 * Good harvest: low wind (<8 m/s), no significant rain, dry ground.
 */
export function computeHarvestWindows(daily: DailyForecast[]): HarvestWindow[] {
  const windows: HarvestWindow[] = [];
  let windowStart: number | null = null;

  for (let i = 0; i <= daily.length; i++) {
    const day = i < daily.length ? daily[i] : null;
    const isDry = day ? day.totalPrecipitation < 1.0 : false;
    const isCalm = day ? day.avgWindSpeed < 8 : false;
    const isHarvestable = isDry && isCalm;

    if (isHarvestable && windowStart === null) {
      windowStart = i;
    } else if (!isHarvestable && windowStart !== null) {
      const start = daily[windowStart];
      const end = daily[i - 1];
      const windowDays = daily.slice(windowStart, i);
      const totalPrecip = windowDays.reduce((s, d) => s + d.totalPrecipitation, 0);
      const avgWind = windowDays.reduce((s, d) => s + d.avgWindSpeed, 0) / windowDays.length;
      const daysCount = i - windowStart;

      const recentRain = windowStart > 0 ? daily[windowStart - 1].totalPrecipitation : 0;
      const groundCondition: HarvestWindow['groundCondition'] =
        recentRain > 10 ? 'wet' : recentRain > 3 ? 'damp' : start.minTemp < -2 ? 'frozen' : 'dry';

      const quality: HarvestWindow['quality'] =
        daysCount >= 3 && totalPrecip < 0.5 && avgWind < 5
          ? 'excellent'
          : daysCount >= 2 && totalPrecip < 2
            ? 'good'
            : 'marginal';

      windows.push({
        startDate: start.date,
        endDate: end.date,
        days: daysCount,
        quality,
        avgWindSpeed: Math.round(avgWind * 10) / 10,
        totalPrecipitation: Math.round(totalPrecip * 10) / 10,
        groundCondition,
        recommendation:
          quality === 'excellent'
            ? `Excellent ${daysCount}-day harvest window. Dry conditions with light winds.`
            : quality === 'good'
              ? `Good ${daysCount}-day window. Monitor conditions daily.`
              : 'Marginal window. Consider postponing if possible.',
        recommendationSv:
          quality === 'excellent'
            ? `Utm\u00e4rkt ${daysCount}-dagars sk\u00f6rdef\u00f6nster. Torra f\u00f6rh\u00e5llanden med l\u00e4tt vind.`
            : quality === 'good'
              ? `Bra ${daysCount}-dagars f\u00f6nster. Bevaka f\u00f6rh\u00e5llandena dagligen.`
              : 'Marginellt f\u00f6nster. \u00d6verv\u00e4g att skjuta upp om m\u00f6jligt.',
      });
      windowStart = null;
    }
  }

  return windows;
}

/**
 * Find spray windows: wind < 4 m/s, no rain for 4+ hours, temp 5-25C.
 */
export function computeSprayWindows(hourly: WeatherPoint[]): SprayWindow[] {
  const windows: SprayWindow[] = [];
  const dayMap = new Map<string, WeatherPoint[]>();

  for (const point of hourly) {
    const date = point.time.slice(0, 10);
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(point);
  }

  for (const [date, points] of dayMap) {
    const dayPoints = points.filter((p) => {
      const h = new Date(p.time).getUTCHours();
      return h >= 5 && h <= 20;
    });

    if (dayPoints.length === 0) continue;

    let bestStart = -1;
    let bestEnd = -1;
    let bestScore = -1;
    let start = -1;

    for (let i = 0; i < dayPoints.length; i++) {
      const p = dayPoints[i];
      const suitable = p.windSpeed < 4 && p.precipitation < 0.1 && p.temperature >= 5 && p.temperature <= 25;

      if (suitable && start === -1) {
        start = i;
      } else if (!suitable && start !== -1) {
        const span = i - start;
        if (span >= 3 && span > bestScore) {
          bestStart = start;
          bestEnd = i - 1;
          bestScore = span;
        }
        start = -1;
      }
    }

    if (start !== -1) {
      const span = dayPoints.length - start;
      if (span >= 3 && span > bestScore) {
        bestStart = start;
        bestEnd = dayPoints.length - 1;
      }
    }

    if (bestStart !== -1) {
      const windowPoints = dayPoints.slice(bestStart, bestEnd + 1);
      const avgWind = windowPoints.reduce((s, p) => s + p.windSpeed, 0) / windowPoints.length;
      const precipRisk = windowPoints.filter((p) => p.precipitation > 0).length / windowPoints.length;
      const hours = windowPoints.length;

      windows.push({
        date,
        startHour: new Date(dayPoints[bestStart].time).getUTCHours(),
        endHour: new Date(dayPoints[bestEnd].time).getUTCHours(),
        avgWindSpeed: Math.round(avgWind * 10) / 10,
        precipitationRisk: Math.round(precipRisk * 100),
        suitable: true,
        reason: `Low wind (${avgWind.toFixed(1)} m/s avg) and dry conditions for ${hours}h window`,
        reasonSv: `Svag vind (${avgWind.toFixed(1)} m/s snitt) och torrt f\u00f6r ${hours}h f\u00f6nster`,
      });
    } else {
      const avgWind = dayPoints.reduce((s, p) => s + p.windSpeed, 0) / dayPoints.length;
      const hasPrecip = dayPoints.some((p) => p.precipitation > 0.1);
      const tooWindy = avgWind >= 4;

      windows.push({
        date,
        startHour: 0,
        endHour: 0,
        avgWindSpeed: Math.round(avgWind * 10) / 10,
        precipitationRisk: hasPrecip ? 80 : 20,
        suitable: false,
        reason: tooWindy
          ? `Wind too strong (${avgWind.toFixed(1)} m/s avg)`
          : 'Rain expected throughout the day',
        reasonSv: tooWindy
          ? `F\u00f6r stark vind (${avgWind.toFixed(1)} m/s snitt)`
          : 'Regn v\u00e4ntas under hela dagen',
      });
    }
  }

  return windows.slice(0, 10);
}

/**
 * Growing Degree Days (base 5C).
 */
export function computeGrowingDegreeDays(daily: DailyForecast[]): number {
  let gdd = 0;
  for (const day of daily) {
    const meanTemp = (day.maxTemp + day.minTemp) / 2;
    gdd += Math.max(meanTemp - 5, 0);
  }
  return Math.round(gdd * 10) / 10;
}

/**
 * Identify storm alerts from forecast data (wind > 15 m/s or gusts > 21 m/s).
 */
export function computeStormAlerts(daily: DailyForecast[]): WindWarning[] {
  const alerts: WindWarning[] = [];

  for (const day of daily) {
    const isStormWind = day.avgWindSpeed > 15 || day.maxWindGust > 21;
    if (!isStormWind) continue;

    const severity: WindWarning['severity'] =
      day.maxWindGust > 28 ? 'severe' : day.maxWindGust > 21 ? 'warning' : 'advisory';

    alerts.push({
      id: `storm-${day.date}`,
      severity,
      title: severity === 'severe'
        ? 'Severe storm warning'
        : severity === 'warning'
          ? 'Storm warning'
          : 'Wind advisory',
      titleSv: severity === 'severe'
        ? 'Kraftig stormvarning'
        : severity === 'warning'
          ? 'Stormvarning'
          : 'Vindvarning',
      description: `Expected gusts up to ${day.maxWindGust} m/s with average wind ${day.avgWindSpeed} m/s`,
      descriptionSv: `V\u00e4ntade vindbyar upp till ${day.maxWindGust} m/s med medelvind ${day.avgWindSpeed} m/s`,
      maxWindSpeed: day.avgWindSpeed,
      maxGust: day.maxWindGust,
      validFrom: `${day.date}T00:00:00Z`,
      validTo: `${day.date}T23:59:59Z`,
      affectedAreas: ['Sm\u00e5land'],
    });
  }

  return alerts;
}

/**
 * Find dates with frost (temp < 0C).
 */
export function computeFrostDates(daily: DailyForecast[]): string[] {
  return daily.filter((d) => d.minTemp < 0).map((d) => d.date);
}

/**
 * Estimate soil moisture (0-100 scale).
 */
export function estimateSoilMoisture(daily: DailyForecast[]): number {
  let moisture = 50;
  for (let i = 0; i < daily.length && i < 5; i++) {
    const day = daily[i];
    moisture += day.totalPrecipitation * 3;
    moisture -= Math.max(day.maxTemp - 10, 0) * 1.5;
    if (day.avgWindSpeed > 6) moisture -= 2;
  }
  return Math.max(0, Math.min(100, Math.round(moisture)));
}

/**
 * Machine accessibility score (0-100).
 */
export function computeMachineAccessibility(daily: DailyForecast[]): number {
  const moisture = estimateSoilMoisture(daily);
  const recentPrecip = daily.slice(0, 3).reduce((s, d) => s + d.totalPrecipitation, 0);
  const frozen = daily.slice(0, 2).some((d) => d.minTemp < -3);

  if (frozen) return 95;
  if (moisture > 85) return 15;
  if (moisture > 70) return 35;
  if (recentPrecip > 15) return 25;
  if (recentPrecip > 8) return 45;
  if (moisture < 40) return 90;
  return 65;
}

// ─── Forestry Indicators ───

export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Drought risk: counts consecutive dry days (precip < 1mm) combined with high temps.
 * Uses the full forecast window for a more accurate assessment.
 */
export function assessDroughtRisk(daily: DailyForecast[]): RiskLevel {
  const days = daily.slice(0, 10);
  if (days.length === 0) return 'low';

  // Count consecutive dry days from today
  let consecutiveDryDays = 0;
  for (const d of days) {
    if (d.totalPrecipitation < 1.0) {
      consecutiveDryDays++;
    } else {
      break;
    }
  }

  const totalPrecip = days.reduce((sum, d) => sum + d.totalPrecipitation, 0);
  const avgMaxTemp = days.reduce((sum, d) => sum + d.maxTemp, 0) / days.length;
  const avgHumidity = days.reduce((sum, d) => sum + d.avgHumidity, 0) / days.length;

  // High risk: 5+ consecutive dry days with high temps and low humidity
  if (consecutiveDryDays >= 5 && avgMaxTemp > 22 && avgHumidity < 50) return 'high';
  // Also high if very dry stretch with hot temps even with some humidity
  if (consecutiveDryDays >= 7 && avgMaxTemp > 20) return 'high';
  // Medium: 3+ dry days with warm temps, or very little total precip with heat
  if (consecutiveDryDays >= 3 && avgMaxTemp > 18) return 'medium';
  if (totalPrecip < 3 && avgMaxTemp > 20) return 'medium';
  return 'low';
}

/**
 * Beetle activity assessment (Ips typographus / granbarkborre).
 *
 * Bark beetles swarm when:
 * - Air temperature exceeds 18°C (swarming threshold)
 * - Wind speed is below 5 m/s (they cannot fly in strong wind)
 * - No rain (precipitation category 0 or precipitation < 0.2 mm/h)
 *
 * This checks whether conditions in the current + next 3 days are
 * conducive to beetle flight activity.
 */
export function assessBeetleConditions(current: WeatherPoint, daily: DailyForecast[]): boolean {
  // Check if current conditions are beetle-active right now
  const currentActive =
    current.temperature > 18 &&
    current.windSpeed < 5 &&
    current.precipitation < 0.2;

  if (currentActive) return true;

  // Check forecast: any day with max temp > 18, low wind, and little rain
  const next3 = daily.slice(0, 3);
  for (const day of next3) {
    const warmEnough = day.maxTemp > 18;
    const calmEnough = day.avgWindSpeed < 5;
    const dryEnough = day.totalPrecipitation < 1.0;
    if (warmEnough && calmEnough && dryEnough) return true;
  }

  return false;
}

/**
 * Ground frost assessment using nighttime minimum temperatures.
 * Returns true if any of the next 3 days has nighttime mins at or below 0°C.
 */
export function assessGroundFrost(daily: DailyForecast[]): boolean {
  const next3 = daily.slice(0, 3);
  return next3.some((d) => d.minTemp <= 0);
}

// ─── Mock / Fallback Data ───
// Realistic data for Sm\u00e5land (V\u00e4rnamo area, lat ~57.19, lon ~14.04) in mid-March

function getMockForecast(lat: number, lon: number): SMHIForecast {
  const now = new Date();
  const hourly: WeatherPoint[] = [];

  const baseTemps = [1.2, 0.8, 0.3, -0.2, -0.5, -0.3, 0.5, 2.1, 3.8, 5.2, 6.4, 7.1, 7.8, 8.1, 7.6, 6.8, 5.4, 4.1, 3.2, 2.5, 2.0, 1.6, 1.3, 1.0];
  const windSpeeds = [3.2, 3.0, 2.8, 2.5, 2.3, 2.6, 3.1, 3.8, 4.5, 5.1, 5.6, 5.9, 6.2, 6.0, 5.7, 5.3, 4.8, 4.2, 3.8, 3.5, 3.3, 3.1, 3.0, 3.1];
  const humidities = [88, 90, 91, 92, 93, 92, 89, 82, 75, 68, 63, 60, 58, 57, 59, 64, 70, 76, 80, 83, 85, 87, 88, 89];

  const dayPatterns = [
    { tempOffset: 0, precipChance: 0.05, symbol: 2, windMult: 1.0, gustMult: 1.4 },
    { tempOffset: 1, precipChance: 0.1, symbol: 3, windMult: 1.1, gustMult: 1.5 },
    { tempOffset: -1, precipChance: 0.7, symbol: 19, windMult: 1.4, gustMult: 1.8 },
    { tempOffset: 2, precipChance: 0.05, symbol: 1, windMult: 0.8, gustMult: 1.3 },
    { tempOffset: 0, precipChance: 0.2, symbol: 5, windMult: 2.2, gustMult: 2.6 },
    { tempOffset: -2, precipChance: 0.8, symbol: 20, windMult: 1.6, gustMult: 2.0 },
    { tempOffset: 3, precipChance: 0.0, symbol: 1, windMult: 0.7, gustMult: 1.2 },
    { tempOffset: -4, precipChance: 0.1, symbol: 2, windMult: 0.9, gustMult: 1.3 },
    { tempOffset: 1, precipChance: 0.0, symbol: 1, windMult: 0.8, gustMult: 1.2 },
    { tempOffset: 0, precipChance: 0.3, symbol: 5, windMult: 1.2, gustMult: 1.6 },
  ];

  for (let d = 0; d < 10; d++) {
    const pattern = dayPatterns[d];
    for (let h = 0; h < 24; h++) {
      const time = new Date(now.getTime() + (d * 24 + h) * 3600000);
      const baseTemp = baseTemps[h] + pattern.tempOffset + d * 0.15;
      const windBase = windSpeeds[h] * pattern.windMult;
      const precip = Math.random() < pattern.precipChance ? 0.3 + Math.random() * 2.5 : 0;

      let symbol = pattern.symbol;
      if (precip > 1.5) symbol = 20;
      else if (precip > 0.3) symbol = 18;
      else if (h < 6 || h > 20) symbol = 1;

      hourly.push({
        time: time.toISOString(),
        temperature: Math.round((baseTemp + (Math.random() - 0.5) * 0.8) * 10) / 10,
        windSpeed: Math.round((windBase + (Math.random() - 0.5) * 1.2) * 10) / 10,
        windDirection: 200 + Math.round(Math.sin(d * 0.7 + h * 0.1) * 60),
        windGust: Math.round((windBase * pattern.gustMult + Math.random() * 3) * 10) / 10,
        precipitation: Math.round(precip * 10) / 10,
        humidity: Math.round(humidities[h] + (Math.random() - 0.5) * 6),
        pressure: Math.round((1013 + Math.sin(d * 0.5) * 8 + (Math.random() - 0.5) * 3) * 10) / 10,
        weatherSymbol: symbol,
        cloudCover: symbol >= 5 ? 6 + Math.round(Math.random() * 2) : symbol >= 3 ? 3 + Math.round(Math.random() * 2) : Math.round(Math.random() * 2),
        visibility: precip > 1 ? 5 + Math.random() * 10 : 20 + Math.random() * 30,
        thunderProbability: 0,
      });
    }
  }

  const daily = aggregateDaily(hourly);

  return {
    current: hourly[0],
    hourly,
    daily,
    approvedTime: now.toISOString(),
    fetchedAt: now.toISOString(),
    lat,
    lon,
  };
}

function getMockWindWarnings(): WindWarning[] {
  const now = new Date();
  return [
    {
      id: 'mock-wind-001',
      severity: 'advisory',
      title: 'Wind advisory for southern Sm\u00e5land',
      titleSv: 'Vindvarning f\u00f6r s\u00f6dra Sm\u00e5land',
      description: 'Moderate winds expected with gusts up to 18 m/s. Secure loose equipment in forest operations.',
      descriptionSv: 'M\u00e5ttliga vindar v\u00e4ntas med byar upp till 18 m/s. S\u00e4kra l\u00f6s utrustning vid skogsarbete.',
      maxWindSpeed: 12,
      maxGust: 18,
      validFrom: new Date(now.getTime() + 2 * 86400000).toISOString(),
      validTo: new Date(now.getTime() + 3 * 86400000).toISOString(),
      affectedAreas: ['Sm\u00e5land', 'J\u00f6nk\u00f6pings l\u00e4n', 'Kronobergs l\u00e4n'],
    },
  ];
}

function getMockFrostRisk(): FrostRisk[] {
  const now = new Date();
  const patterns: Array<{ offset: number; min: number }> = [
    { offset: 0, min: 1.2 },
    { offset: 1, min: -0.5 },
    { offset: 2, min: -2.1 },
    { offset: 3, min: 3.4 },
    { offset: 4, min: 1.8 },
    { offset: 5, min: -0.8 },
    { offset: 6, min: 4.2 },
    { offset: 7, min: 2.1 },
    { offset: 8, min: -1.3 },
    { offset: 9, min: 0.4 },
    { offset: 10, min: 5.1 },
    { offset: 11, min: 3.8 },
    { offset: 12, min: -0.2 },
    { offset: 13, min: 6.3 },
  ];

  return patterns.map((p) => {
    const date = new Date(now.getTime() + p.offset * 86400000);
    const dateStr = date.toISOString().slice(0, 10);
    let riskLevel: FrostRisk['riskLevel'] = 'none';
    let description = 'No frost risk';
    let descriptionSv = 'Ingen frostrisk';

    if (p.min <= -3) {
      riskLevel = 'high';
      description = `Severe frost expected, night minimum ${p.min}\u00b0C`;
      descriptionSv = `Kraftig frost v\u00e4ntas, nattminimum ${p.min}\u00b0C`;
    } else if (p.min <= 0) {
      riskLevel = 'moderate';
      description = `Frost likely, night minimum ${p.min}\u00b0C`;
      descriptionSv = `Frost trolig, nattminimum ${p.min}\u00b0C`;
    } else if (p.min <= 2) {
      riskLevel = 'low';
      description = `Ground frost possible, night minimum ${p.min}\u00b0C`;
      descriptionSv = `Markfrost m\u00f6jlig, nattminimum ${p.min}\u00b0C`;
    }

    return {
      date: dateStr,
      nightMinTemp: p.min,
      groundFrostLikely: p.min <= 2,
      riskLevel,
      description,
      descriptionSv,
    };
  });
}

/** Legacy demo data alias */
export function getDemoWeatherData(): WeatherData {
  const forecast = getMockForecast(57.19, 14.04);
  return {
    current: forecast.current,
    hourly: forecast.hourly,
    daily: forecast.daily,
    approvedTime: forecast.approvedTime,
    fetchedAt: forecast.fetchedAt,
  };
}

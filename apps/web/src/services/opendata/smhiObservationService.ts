/**
 * SMHI Open Data — Meteorological Observations API
 *
 * Fetches REAL observed weather data (not forecasts) from SMHI observation stations.
 * Fully open, no API key required.
 *
 * Docs: https://opendata.smhi.se/apidocs/metobs/
 */

// ─── Types ───

export interface SMHIObservation {
  timestamp: string;
  value: number;
  quality: string;
}

export interface SMHIStationData {
  stationName: string;
  stationId: number;
  parameter: string;
  unit: string;
  latestValue: number;
  latestTimestamp: string;
  observations: SMHIObservation[];
}

export interface LiveWeatherObservation {
  stationName: string;
  stationId: number;
  temperature: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  humidity: number | null;
  timestamp: string;
  isLive: boolean;
}

// ─── Constants ───

// SMHI Parameter IDs
const PARAM_TEMPERATURE = 1;       // Lufttemperatur momentanvärde, 1 gång/tim
const PARAM_PRECIPITATION = 7;     // Nederbördsmängd summa 1 timme
const PARAM_WIND_SPEED = 4;        // Vindhastighet medelvärde 10 min
const PARAM_HUMIDITY = 6;          // Relativ luftfuktighet momentanvärde

// Stations near Småland / Värnamo area
const STATIONS = {
  vaxjo: { id: 64520, name: 'Växjö A' },
  jonkoping: { id: 85270, name: 'Jönköping A' },
  kalmar: { id: 78420, name: 'Kalmar' },
};

const BASE_URL = 'https://opendata-download-metobs.smhi.se/api';

// Cache (5 min)
let cache: { data: LiveWeatherObservation; fetchedAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

// ─── API ───

async function fetchLatestObservation(
  stationId: number,
  parameterId: number
): Promise<{ value: number; timestamp: string } | null> {
  try {
    const url = `${BASE_URL}/version/latest/parameter/${parameterId}/station/${stationId}/period/latest-hour/data.json`;
    const response = await fetch(url);
    if (!response.ok) return null;

    const data = await response.json();
    if (!data.value || data.value.length === 0) return null;

    const latest = data.value[data.value.length - 1];
    return {
      value: parseFloat(latest.value),
      timestamp: new Date(latest.date).toISOString(),
    };
  } catch {
    return null;
  }
}

/**
 * Fetch real observed weather from SMHI station near Småland.
 * Returns the latest hour's observations for temperature, precipitation, wind, and humidity.
 */
export async function getLiveWeatherObservation(
  stationKey: keyof typeof STATIONS = 'vaxjo'
): Promise<LiveWeatherObservation> {
  // Check cache
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const station = STATIONS[stationKey];

  // Fetch all parameters in parallel
  const [temp, precip, wind, humidity] = await Promise.all([
    fetchLatestObservation(station.id, PARAM_TEMPERATURE),
    fetchLatestObservation(station.id, PARAM_PRECIPITATION),
    fetchLatestObservation(station.id, PARAM_WIND_SPEED),
    fetchLatestObservation(station.id, PARAM_HUMIDITY),
  ]);

  const hasAnyData = temp || precip || wind || humidity;

  const result: LiveWeatherObservation = {
    stationName: station.name,
    stationId: station.id,
    temperature: temp?.value ?? null,
    precipitation: precip?.value ?? null,
    windSpeed: wind?.value ?? null,
    humidity: humidity?.value ?? null,
    timestamp: temp?.timestamp || precip?.timestamp || new Date().toISOString(),
    isLive: !!hasAnyData,
  };

  // Fall back to realistic demo if all requests failed
  if (!hasAnyData) {
    const now = new Date();
    const month = now.getMonth();
    // Seasonal temperatures for Sweden
    const baseTemp = month >= 4 && month <= 8 ? 14 + Math.random() * 8 : -2 + Math.random() * 6;
    result.temperature = Math.round(baseTemp * 10) / 10;
    result.precipitation = Math.round(Math.random() * 2 * 10) / 10;
    result.windSpeed = Math.round((2 + Math.random() * 6) * 10) / 10;
    result.humidity = Math.round(60 + Math.random() * 30);
    result.isLive = false;
  }

  cache = { data: result, fetchedAt: Date.now() };
  return result;
}

/**
 * Fetch historical observations for a parameter (last 24 hours).
 */
export async function get24hObservations(
  stationKey: keyof typeof STATIONS = 'vaxjo',
  parameterId: number = PARAM_TEMPERATURE
): Promise<SMHIObservation[]> {
  const station = STATIONS[stationKey];
  try {
    const url = `${BASE_URL}/version/latest/parameter/${parameterId}/station/${station.id}/period/latest-day/data.json`;
    const response = await fetch(url);
    if (!response.ok) return [];

    const data = await response.json();
    if (!data.value || !Array.isArray(data.value)) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.value.map((v: any) => ({
      timestamp: new Date(v.date).toISOString(),
      value: parseFloat(v.value),
      quality: v.quality || 'G',
    }));
  } catch {
    return [];
  }
}

export { STATIONS, PARAM_TEMPERATURE, PARAM_PRECIPITATION, PARAM_WIND_SPEED, PARAM_HUMIDITY };

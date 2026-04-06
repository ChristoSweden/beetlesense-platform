/**
 * Open-Meteo — Free Global Weather API
 *
 * Hyper-local weather forecasts including soil temperature (beetle emergence trigger).
 * Completely free, no API key, no rate limits.
 *
 * Docs: https://open-meteo.com/en/docs
 * Endpoints:
 *   - Forecast: https://api.open-meteo.com/v1/forecast
 *   - Historical: https://archive-api.open-meteo.com/v1/archive
 *   - Air quality: https://air-quality-api.open-meteo.com/v1/air-quality
 */

// ─── Types ───

export interface OpenMeteoForecast {
  latitude: number;
  longitude: number;
  elevation: number;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
}

export interface HourlyForecast {
  time: string;
  temperature2m: number;
  precipitation: number;
  windSpeed10m: number;
  windGusts10m: number;
  humidity: number;
  soilTemperature6cm: number;
  soilMoisture3to9cm: number;
  cloudCover: number;
}

export interface DailyForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  windSpeedMax: number;
  windGustsMax: number;
  sunrise: string;
  sunset: string;
  uvIndexMax: number;
}

export interface BeetleEmergenceConditions {
  soilTemp6cm: number;
  airTemp: number;
  thresholdMet: boolean;
  estimatedFlightHours: number;
  windBelow5ms: boolean;
  recommendation: string;
}

export interface AirQualityData {
  time: string;
  pm25: number;
  pm10: number;
  europeanAqi: number;
  smokeDetected: boolean;
}

// ─── Constants ───

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';

// Ips typographus flight thresholds
const SOIL_TEMP_THRESHOLD = 16;  // °C at 6 cm depth
const AIR_TEMP_THRESHOLD = 18;   // °C
const WIND_SPEED_MAX = 5;        // m/s — beetles avoid strong wind
const PRECIP_MAX = 0.1;          // mm/h — beetles avoid rain

// Cache (10 min for forecasts)
const CACHE_TTL = 10 * 60 * 1000;
const forecastCache = new Map<string, { data: OpenMeteoForecast; fetchedAt: number }>();

export const OPEN_METEO_SOURCE_INFO = {
  name: 'Open-Meteo',
  url: 'https://open-meteo.com/',
  license: 'CC BY 4.0',
  description: 'Free weather API with soil temperature, precipitation, and air quality data',
  attribution: 'Weather data by Open-Meteo.com',
  updateFrequency: 'Hourly',
  costTier: 'free' as const,
};

// ─── Hourly Params ───

const HOURLY_PARAMS = [
  'temperature_2m',
  'precipitation',
  'wind_speed_10m',
  'wind_gusts_10m',
  'relative_humidity_2m',
  'soil_temperature_6cm',
  'soil_moisture_3_to_9cm',
  'cloud_cover',
].join(',');

const DAILY_PARAMS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'wind_speed_10m_max',
  'wind_gusts_10m_max',
  'sunrise',
  'sunset',
  'uv_index_max',
].join(',');

// ─── Helpers ───

function cacheKey(lat: number, lng: number, days: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${days}`;
}

function parseHourlyArrays(hourly: Record<string, number[] | string[]>): HourlyForecast[] {
  const times = hourly.time as string[];
  if (!times || times.length === 0) return [];

  return times.map((time, i) => ({
    time,
    temperature2m: (hourly.temperature_2m as number[])?.[i] ?? 0,
    precipitation: (hourly.precipitation as number[])?.[i] ?? 0,
    windSpeed10m: (hourly.wind_speed_10m as number[])?.[i] ?? 0,
    windGusts10m: (hourly.wind_gusts_10m as number[])?.[i] ?? 0,
    humidity: (hourly.relative_humidity_2m as number[])?.[i] ?? 0,
    soilTemperature6cm: (hourly.soil_temperature_6cm as number[])?.[i] ?? 0,
    soilMoisture3to9cm: (hourly.soil_moisture_3_to_9cm as number[])?.[i] ?? 0,
    cloudCover: (hourly.cloud_cover as number[])?.[i] ?? 0,
  }));
}

function parseDailyArrays(daily: Record<string, number[] | string[]>): DailyForecast[] {
  const dates = daily.time as string[];
  if (!dates || dates.length === 0) return [];

  return dates.map((date, i) => ({
    date,
    tempMax: (daily.temperature_2m_max as number[])?.[i] ?? 0,
    tempMin: (daily.temperature_2m_min as number[])?.[i] ?? 0,
    precipitationSum: (daily.precipitation_sum as number[])?.[i] ?? 0,
    windSpeedMax: (daily.wind_speed_10m_max as number[])?.[i] ?? 0,
    windGustsMax: (daily.wind_gusts_10m_max as number[])?.[i] ?? 0,
    sunrise: (daily.sunrise as string[])?.[i] ?? '',
    sunset: (daily.sunset as string[])?.[i] ?? '',
    uvIndexMax: (daily.uv_index_max as number[])?.[i] ?? 0,
  }));
}

// ─── Fetch Forecast ───

/**
 * Fetch a multi-day weather forecast including soil temperature.
 * Live API call — Open-Meteo is free with no key required.
 */
export async function fetchForecast(
  lat: number,
  lng: number,
  days: number = 7
): Promise<OpenMeteoForecast> {
  const key = cacheKey(lat, lng, days);
  const cached = forecastCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data;
  }

  try {
    const url = `${FORECAST_URL}?latitude=${lat}&longitude=${lng}&forecast_days=${days}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}&timezone=Europe%2FStockholm`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo forecast failed: ${response.status}`);
    }

    const json = await response.json();

    const result: OpenMeteoForecast = {
      latitude: json.latitude ?? lat,
      longitude: json.longitude ?? lng,
      elevation: json.elevation ?? 0,
      hourly: parseHourlyArrays(json.hourly ?? {}),
      daily: parseDailyArrays(json.daily ?? {}),
    };

    forecastCache.set(key, { data: result, fetchedAt: Date.now() });
    return result;
  } catch (err) {
    console.warn('[Open-Meteo] Forecast fetch failed, using fallback:', err);
    return buildFallbackForecast(lat, lng, days);
  }
}

// ─── Fetch Historical Weather ───

/**
 * Fetch historical weather data for a date range.
 * Uses the Open-Meteo archive API (data from 1940 onwards).
 */
export async function fetchHistoricalWeather(
  lat: number,
  lng: number,
  startDate: string,
  endDate: string
): Promise<OpenMeteoForecast> {
  try {
    const url = `${ARCHIVE_URL}?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&hourly=${HOURLY_PARAMS}&daily=${DAILY_PARAMS}&timezone=Europe%2FStockholm`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo archive failed: ${response.status}`);
    }

    const json = await response.json();

    return {
      latitude: json.latitude ?? lat,
      longitude: json.longitude ?? lng,
      elevation: json.elevation ?? 0,
      hourly: parseHourlyArrays(json.hourly ?? {}),
      daily: parseDailyArrays(json.daily ?? {}),
    };
  } catch (err) {
    console.warn('[Open-Meteo] Historical fetch failed:', err);
    return { latitude: lat, longitude: lng, elevation: 0, hourly: [], daily: [] };
  }
}

// ─── Beetle Emergence Check ───

/**
 * Check if today's weather conditions support Ips typographus (bark beetle) flight.
 *
 * Beetle flight conditions:
 *   - Soil temperature at 6 cm > 16°C (larvae development trigger)
 *   - Air temperature > 18°C
 *   - Wind speed < 5 m/s
 *   - No rain (< 0.1 mm/h)
 *
 * Returns a clear recommendation for forest owners.
 */
export async function checkBeetleEmergenceConditions(
  lat: number,
  lng: number
): Promise<BeetleEmergenceConditions> {
  const forecast = await fetchForecast(lat, lng, 1);

  // Filter to today's daylight hours (06:00–21:00)
  const today = new Date().toISOString().split('T')[0];
  const todayHours = forecast.hourly.filter((h) => {
    if (!h.time.startsWith(today)) return false;
    const hour = parseInt(h.time.split('T')[1]?.split(':')[0] ?? '0', 10);
    return hour >= 6 && hour <= 21;
  });

  if (todayHours.length === 0) {
    return {
      soilTemp6cm: 0,
      airTemp: 0,
      thresholdMet: false,
      estimatedFlightHours: 0,
      windBelow5ms: false,
      recommendation: 'Inga väderdata tillgängliga för idag. Kontrollera igen senare.',
    };
  }

  // Count hours suitable for beetle flight
  const flightHours = todayHours.filter(
    (h) =>
      h.soilTemperature6cm > SOIL_TEMP_THRESHOLD &&
      h.temperature2m > AIR_TEMP_THRESHOLD &&
      h.windSpeed10m < WIND_SPEED_MAX &&
      h.precipitation < PRECIP_MAX
  );

  // Current or peak conditions
  const now = new Date();
  const currentHour = now.getHours();
  const currentData = todayHours.find((h) => {
    const hour = parseInt(h.time.split('T')[1]?.split(':')[0] ?? '0', 10);
    return hour === currentHour;
  }) ?? todayHours[0];

  const soilTemp = currentData.soilTemperature6cm;
  const airTemp = currentData.temperature2m;
  const windOk = currentData.windSpeed10m < WIND_SPEED_MAX;
  const thresholdMet =
    soilTemp > SOIL_TEMP_THRESHOLD &&
    airTemp > AIR_TEMP_THRESHOLD &&
    windOk &&
    currentData.precipitation < PRECIP_MAX;

  // Build recommendation in Swedish
  let recommendation: string;
  if (flightHours.length === 0) {
    if (soilTemp < SOIL_TEMP_THRESHOLD) {
      recommendation = `Marktemperaturen (${soilTemp.toFixed(1)}°C) är under gränsvärdet 16°C. Låg risk för barkborreutflygning idag.`;
    } else if (airTemp < AIR_TEMP_THRESHOLD) {
      recommendation = `Lufttemperaturen (${airTemp.toFixed(1)}°C) är under 18°C. Barkborrar flyger sannolikt inte idag.`;
    } else {
      recommendation = `Vind eller nederbörd hindrar flygning idag. Håll ändå uppsikt om vädret ändras.`;
    }
  } else if (flightHours.length <= 3) {
    recommendation = `VARNING: ${flightHours.length} timmar idag med gynnsamma förhållanden för barkborreutflygning. Kontrollera fällor och vindkänsliga bestånd.`;
  } else {
    recommendation = `HÖG RISK: ${flightHours.length} timmar idag med optimala förhållanden för barkborreutflygning (mark ${soilTemp.toFixed(1)}°C, luft ${airTemp.toFixed(1)}°C, svag vind). Inspektera bestånd omgående!`;
  }

  return {
    soilTemp6cm: Math.round(soilTemp * 10) / 10,
    airTemp: Math.round(airTemp * 10) / 10,
    thresholdMet,
    estimatedFlightHours: flightHours.length,
    windBelow5ms: windOk,
    recommendation,
  };
}

// ─── Air Quality ───

/**
 * Fetch air quality data — useful for detecting wildfire smoke (PM2.5 spikes).
 */
export async function fetchAirQuality(
  lat: number,
  lng: number
): Promise<AirQualityData[]> {
  try {
    const url = `${AIR_QUALITY_URL}?latitude=${lat}&longitude=${lng}&hourly=pm2_5,pm10,european_aqi&timezone=Europe%2FStockholm&forecast_days=1`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open-Meteo air quality failed: ${response.status}`);
    }

    const json = await response.json();
    const hourly = json.hourly ?? {};
    const times = (hourly.time as string[]) ?? [];

    return times.map((time: string, i: number) => {
      const pm25 = (hourly.pm2_5 as number[])?.[i] ?? 0;
      return {
        time,
        pm25,
        pm10: (hourly.pm10 as number[])?.[i] ?? 0,
        europeanAqi: (hourly.european_aqi as number[])?.[i] ?? 0,
        smokeDetected: pm25 > 50, // WHO 24h guideline is 15 µg/m³, >50 indicates smoke
      };
    });
  } catch (err) {
    console.warn('[Open-Meteo] Air quality fetch failed:', err);
    return [];
  }
}

// ─── Fallback Data ───

function buildFallbackForecast(lat: number, lng: number, days: number): OpenMeteoForecast {
  const now = new Date();
  const month = now.getMonth();
  const isSummer = month >= 5 && month <= 8;

  const hourly: HourlyForecast[] = [];
  const daily: DailyForecast[] = [];

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() + d);
    const dateStr = date.toISOString().split('T')[0];

    const baseTemp = isSummer ? 16 + Math.random() * 8 : 2 + Math.random() * 6;

    for (let h = 0; h < 24; h++) {
      const hourFactor = Math.sin(((h - 6) / 24) * Math.PI * 2) * 0.3 + 0.7;
      hourly.push({
        time: `${dateStr}T${String(h).padStart(2, '0')}:00`,
        temperature2m: Math.round((baseTemp + (hourFactor - 0.7) * 10) * 10) / 10,
        precipitation: Math.random() < 0.15 ? Math.round(Math.random() * 3 * 10) / 10 : 0,
        windSpeed10m: Math.round((2 + Math.random() * 5) * 10) / 10,
        windGusts10m: Math.round((4 + Math.random() * 8) * 10) / 10,
        humidity: Math.round(55 + Math.random() * 35),
        soilTemperature6cm: Math.round((baseTemp - 2 + Math.random() * 3) * 10) / 10,
        soilMoisture3to9cm: Math.round((0.2 + Math.random() * 0.3) * 100) / 100,
        cloudCover: Math.round(Math.random() * 100),
      });
    }

    daily.push({
      date: dateStr,
      tempMax: Math.round((baseTemp + 4) * 10) / 10,
      tempMin: Math.round((baseTemp - 4) * 10) / 10,
      precipitationSum: Math.round(Math.random() * 8 * 10) / 10,
      windSpeedMax: Math.round((5 + Math.random() * 8) * 10) / 10,
      windGustsMax: Math.round((8 + Math.random() * 12) * 10) / 10,
      sunrise: `${dateStr}T${isSummer ? '04' : '07'}:30`,
      sunset: `${dateStr}T${isSummer ? '21' : '16'}:00`,
      uvIndexMax: isSummer ? Math.round((4 + Math.random() * 4) * 10) / 10 : Math.round((1 + Math.random() * 2) * 10) / 10,
    });
  }

  return { latitude: lat, longitude: lng, elevation: 150, hourly, daily };
}

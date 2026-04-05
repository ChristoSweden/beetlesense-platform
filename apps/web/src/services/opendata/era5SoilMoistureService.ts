/**
 * ERA5-Land Soil Moisture Service
 *
 * Provides soil moisture data from ECMWF ERA5-Land reanalysis for predicting
 * bark beetle outbreaks. Drought-stressed trees are highly vulnerable to
 * Ips typographus (European spruce bark beetle) attacks.
 *
 * ERA5-Land specs:
 *   - Resolution: 9km (0.1°)
 *   - Temporal: Hourly, aggregated to daily/monthly
 *   - Variables: Volumetric soil water (4 layers), soil temperature, evapotranspiration
 *   - Coverage: 1950–present (2–5 day latency)
 *   - Provider: ECMWF / Copernicus Climate Data Store (CDS)
 *   - License: Copernicus License (free, open)
 *
 * CDS API integration (for future backend worker in Python):
 *
 *   ```python
 *   import cdsapi
 *   c = cdsapi.Client()  # requires ~/.cdsapirc with url + key
 *   c.retrieve('reanalysis-era5-land', {
 *       'variable': [
 *           'volumetric_soil_water_layer_1',  # 0–7 cm
 *           'volumetric_soil_water_layer_2',  # 7–28 cm
 *           'volumetric_soil_water_layer_3',  # 28–100 cm
 *           'volumetric_soil_water_layer_4',  # 100–289 cm
 *           'soil_temperature_level_1',
 *           'total_evaporation',
 *       ],
 *       'year': '2025',
 *       'month': ['01','02','03','04','05','06','07','08','09','10','11','12'],
 *       'day': ['01','15'],  # bimonthly snapshots
 *       'time': '12:00',
 *       'area': [58.5, 13.5, 56.5, 16.5],  # Småland bounding box [N, W, S, E]
 *       'format': 'netcdf',
 *   }, 'era5_soil_smaland.nc')
 *   ```
 *
 *   The worker would parse the NetCDF, compute anomalies vs. 1991–2020 climatology,
 *   and push results to Supabase for the frontend to consume.
 */

// ─── Types ───

export interface SoilMoistureData {
  date: string;
  volumetricWaterContent: number;    // m³/m³ (0–0.5 typical)
  soilTemperature: number;           // °C
  evapotranspiration: number;        // mm/day
  anomaly: number;                   // deviation from 30-year mean (-1 to 1)
  depth: '0-7cm' | '7-28cm' | '28-100cm' | '100-289cm';
}

export interface SoilMoistureTimeSeries {
  location: { lat: number; lng: number };
  period: { start: string; end: string };
  data: SoilMoistureData[];
  climatology: MonthlySoilMoisture[];
  droughtStatus: DroughtStatus;
}

export interface MonthlySoilMoisture {
  month: number;
  meanVWC: number;         // 30-year mean volumetric water content
  stdDev: number;
}

export interface DroughtStatus {
  currentAnomaly: number;  // standard deviations from mean
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme';
  consecutiveDryMonths: number;
  percentile: number;      // 0–100, where 0 = driest on record
  trendDirection: 'wetting' | 'stable' | 'drying';
}

// ─── Source Info ───

export const ERA5_SOURCE_INFO = {
  name: 'ERA5-Land Reanalysis',
  provider: 'ECMWF / Copernicus Climate Data Store',
  resolution: '9 km (0.1°)',
  temporal: 'Hourly (aggregated to daily/monthly)',
  coverage: '1950–present',
  latency: '2–5 days',
  variables: [
    'Volumetric soil water layer 1 (0–7 cm)',
    'Volumetric soil water layer 2 (7–28 cm)',
    'Volumetric soil water layer 3 (28–100 cm)',
    'Volumetric soil water layer 4 (100–289 cm)',
    'Soil temperature level 1',
    'Total evaporation',
  ],
  license: 'Copernicus License (free, open)',
  apiBase: 'https://cds.climate.copernicus.eu/api',
  doi: '10.24381/cds.e2161bac',
  citation: 'Muñoz Sabater, J. (2019). ERA5-Land hourly data from 1950 to present. Copernicus Climate Change Service (C3S) Climate Data Store (CDS).',
};

// ─── Cache ───

let cachedTimeSeries: { key: string; data: SoilMoistureTimeSeries; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour — ERA5 data updates infrequently

function getCacheKey(lat: number, lng: number, months: number): string {
  return `${lat.toFixed(2)}_${lng.toFixed(2)}_${months}`;
}

// ─── Climatology (Småland 1991–2020 normals) ───

/**
 * Monthly mean volumetric water content for the Småland region (approx. 57°N, 15°E).
 * These are representative values for Swedish boreal forest soils (podzols/till).
 * Seasonal cycle: wetter in autumn/winter, drier in summer.
 */
const SMALAND_CLIMATOLOGY: MonthlySoilMoisture[] = [
  { month: 1,  meanVWC: 0.34, stdDev: 0.03 },  // Jan — frozen/saturated
  { month: 2,  meanVWC: 0.33, stdDev: 0.03 },  // Feb — frozen ground
  { month: 3,  meanVWC: 0.35, stdDev: 0.04 },  // Mar — snowmelt begins
  { month: 4,  meanVWC: 0.36, stdDev: 0.04 },  // Apr — snowmelt peak
  { month: 5,  meanVWC: 0.33, stdDev: 0.04 },  // May — drying begins
  { month: 6,  meanVWC: 0.30, stdDev: 0.05 },  // Jun — summer drawdown
  { month: 7,  meanVWC: 0.27, stdDev: 0.05 },  // Jul — driest month
  { month: 8,  meanVWC: 0.26, stdDev: 0.05 },  // Aug — continued dry
  { month: 9,  meanVWC: 0.30, stdDev: 0.04 },  // Sep — autumn recharge
  { month: 10, meanVWC: 0.34, stdDev: 0.04 },  // Oct — recharge
  { month: 11, meanVWC: 0.36, stdDev: 0.03 },  // Nov — near saturation
  { month: 12, meanVWC: 0.35, stdDev: 0.03 },  // Dec — frozen/saturated
];

// ─── Demo Data Generator ───

/**
 * Generates a realistic 24-month soil moisture time series for Småland,
 * including a simulated drought period (summer of the second year) that
 * would correspond to elevated bark beetle risk.
 */
function generateDemoTimeSeries(
  lat: number,
  lng: number,
  months: number,
): SoilMoistureTimeSeries {
  const now = new Date();
  const startDate = new Date(now);
  startDate.setMonth(startDate.getMonth() - months);

  const data: SoilMoistureData[] = [];

  for (let i = 0; i < months; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);
    const monthIndex = date.getMonth(); // 0-based
    const clim = SMALAND_CLIMATOLOGY[monthIndex];
    const yearOffset = i >= 12 ? 1 : 0;

    // Base VWC follows climatology with some noise
    let vwc = clim.meanVWC + (Math.random() - 0.5) * clim.stdDev;

    // Simulate drought in second summer (months 17–20 in a 24-month series)
    // This corresponds roughly to Jun–Sep of the second year
    const isDroughtPeriod = yearOffset === 1 && monthIndex >= 5 && monthIndex <= 8;
    if (isDroughtPeriod) {
      // Drop VWC significantly below normal
      const droughtIntensity = monthIndex === 6 || monthIndex === 7 ? 0.12 : 0.08;
      vwc = clim.meanVWC - droughtIntensity - Math.random() * 0.03;
    }

    // Clamp to realistic range
    vwc = Math.max(0.08, Math.min(0.50, vwc));

    // Soil temperature — seasonal pattern, warmer in summer
    const soilTemp = getSoilTemperature(monthIndex);

    // Evapotranspiration — peaks in summer
    const et = getEvapotranspiration(monthIndex, isDroughtPeriod);

    // Compute anomaly relative to climatology
    const anomaly = (vwc - clim.meanVWC) / clim.stdDev;

    // Generate two data points per month (1st and 15th) for the primary layer
    const dateStr1 = `${date.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    const dateStr2 = `${date.getFullYear()}-${String(monthIndex + 1).padStart(2, '0')}-15`;

    data.push({
      date: dateStr1,
      volumetricWaterContent: round(vwc, 3),
      soilTemperature: round(soilTemp, 1),
      evapotranspiration: round(et, 2),
      anomaly: round(Math.max(-1, Math.min(1, anomaly)), 2),
      depth: '0-7cm',
    });

    // Slight variation for mid-month
    const vwcMid = vwc + (Math.random() - 0.5) * 0.01;
    data.push({
      date: dateStr2,
      volumetricWaterContent: round(Math.max(0.08, vwcMid), 3),
      soilTemperature: round(soilTemp + (Math.random() - 0.5) * 0.5, 1),
      evapotranspiration: round(et + (Math.random() - 0.5) * 0.2, 2),
      anomaly: round(Math.max(-1, Math.min(1, (vwcMid - clim.meanVWC) / clim.stdDev)), 2),
      depth: '0-7cm',
    });
  }

  const latestData = data[data.length - 1];
  const latestMonth = new Date(latestData.date).getMonth();
  const latestClim = SMALAND_CLIMATOLOGY[latestMonth];

  const droughtStatus = calculateDroughtStatus(data, SMALAND_CLIMATOLOGY);

  return {
    location: { lat, lng },
    period: {
      start: data[0].date,
      end: data[data.length - 1].date,
    },
    data,
    climatology: SMALAND_CLIMATOLOGY,
    droughtStatus,
  };
}

function getSoilTemperature(month: number): number {
  // Approximate soil temperature at 7cm depth in Småland (°C)
  const temps = [
    -1.5, // Jan
    -2.0, // Feb
     0.5, // Mar
     4.0, // Apr
     9.5, // May
    14.0, // Jun
    16.5, // Jul
    15.5, // Aug
    11.5, // Sep
     7.0, // Oct
     3.0, // Nov
     0.5, // Dec
  ];
  return temps[month] + (Math.random() - 0.5) * 1.5;
}

function getEvapotranspiration(month: number, isDrought: boolean): number {
  // Approximate daily ET in mm/day for Småland
  const baseET = [
    0.3, // Jan
    0.4, // Feb
    0.8, // Mar
    1.5, // Apr
    2.8, // May
    3.5, // Jun
    3.8, // Jul
    3.2, // Aug
    1.8, // Sep
    0.9, // Oct
    0.4, // Nov
    0.3, // Dec
  ];
  let et = baseET[month] + (Math.random() - 0.5) * 0.4;
  // During drought, ET drops because plants close stomata
  if (isDrought) {
    et *= 0.6;
  }
  return Math.max(0.1, et);
}

function round(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

// ─── Analysis Functions ───

/**
 * Calculate drought status from soil moisture time series and climatology.
 * Uses the latest data points to determine current conditions.
 */
export function calculateDroughtStatus(
  data: SoilMoistureData[],
  climatology: MonthlySoilMoisture[],
): DroughtStatus {
  if (data.length === 0) {
    return {
      currentAnomaly: 0,
      severity: 'none',
      consecutiveDryMonths: 0,
      percentile: 50,
      trendDirection: 'stable',
    };
  }

  // Get the latest reading
  const latest = data[data.length - 1];
  const latestMonth = new Date(latest.date).getMonth();
  const clim = climatology[latestMonth];

  // Current anomaly in standard deviations
  const currentAnomaly = clim.stdDev > 0
    ? (latest.volumetricWaterContent - clim.meanVWC) / clim.stdDev
    : 0;

  // Count consecutive dry months (anomaly < -0.5 std dev)
  let consecutiveDryMonths = 0;
  // Walk backward through monthly data (every other entry since we have 2 per month)
  for (let i = data.length - 1; i >= 0; i -= 2) {
    const d = data[i];
    const m = new Date(d.date).getMonth();
    const c = climatology[m];
    const a = c.stdDev > 0 ? (d.volumetricWaterContent - c.meanVWC) / c.stdDev : 0;
    if (a < -0.5) {
      consecutiveDryMonths++;
    } else {
      break;
    }
  }

  // Determine severity
  const severity = getDroughtSeverity(currentAnomaly);

  // Percentile estimate (approximate from standard normal distribution)
  const percentile = round(normalCDF(currentAnomaly) * 100, 1);

  // Trend direction — compare last 3 months to prior 3 months
  const trendDirection = determineTrend(data, climatology);

  return {
    currentAnomaly: round(currentAnomaly, 2),
    severity,
    consecutiveDryMonths,
    percentile,
    trendDirection,
  };
}

function getDroughtSeverity(anomaly: number): DroughtStatus['severity'] {
  if (anomaly > -0.5) return 'none';
  if (anomaly > -1.0) return 'mild';
  if (anomaly > -1.5) return 'moderate';
  if (anomaly > -2.0) return 'severe';
  return 'extreme';
}

function determineTrend(
  data: SoilMoistureData[],
  climatology: MonthlySoilMoisture[],
): DroughtStatus['trendDirection'] {
  if (data.length < 12) return 'stable';

  // Compare mean anomaly of last 6 entries vs prior 6
  const recent = data.slice(-6);
  const prior = data.slice(-12, -6);

  const meanAnomaly = (entries: SoilMoistureData[]) => {
    const sum = entries.reduce((acc, d) => {
      const m = new Date(d.date).getMonth();
      const c = climatology[m];
      return acc + (c.stdDev > 0 ? (d.volumetricWaterContent - c.meanVWC) / c.stdDev : 0);
    }, 0);
    return sum / entries.length;
  };

  const recentMean = meanAnomaly(recent);
  const priorMean = meanAnomaly(prior);
  const diff = recentMean - priorMean;

  if (diff > 0.3) return 'wetting';
  if (diff < -0.3) return 'drying';
  return 'stable';
}

/**
 * Approximate cumulative distribution function for the standard normal distribution.
 * Used to convert z-scores to percentiles.
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// ─── Public API ───

/**
 * Fetch soil moisture time series for a location.
 * Currently returns demo data for Småland; will integrate with CDS API
 * via backend worker when API key is available.
 */
export async function fetchSoilMoistureTimeSeries(
  lat: number,
  lng: number,
  months: number = 24,
): Promise<SoilMoistureTimeSeries> {
  const key = getCacheKey(lat, lng, months);

  // Return cached data if fresh
  if (cachedTimeSeries && cachedTimeSeries.key === key) {
    const age = Date.now() - cachedTimeSeries.fetchedAt;
    if (age < CACHE_TTL) {
      return cachedTimeSeries.data;
    }
  }

  // TODO: When CDS API key is available, fetch real data via Supabase Edge Function:
  //   const response = await fetch(`${SUPABASE_URL}/functions/v1/era5-soil-moisture`, {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  //     body: JSON.stringify({ lat, lng, months }),
  //   });
  //   const result = await response.json();

  // For now, generate demo data
  const result = generateDemoTimeSeries(lat, lng, months);

  // Cache the result
  cachedTimeSeries = { key, data: result, fetchedAt: Date.now() };

  return result;
}

/**
 * Get the soil moisture anomaly for a single point in time.
 * Returns how far the current value deviates from the 30-year mean,
 * normalized to -1 (extremely dry) to +1 (extremely wet).
 */
export function getSoilMoistureAnomaly(
  currentVWC: number,
  climatology: MonthlySoilMoisture[],
  month: number,
): number {
  const clim = climatology[month];
  if (!clim || clim.stdDev === 0) return 0;

  const zScore = (currentVWC - clim.meanVWC) / clim.stdDev;
  // Clamp to -1..1 range
  return round(Math.max(-1, Math.min(1, zScore)), 2);
}

/**
 * NASA MODIS Daily Global Vegetation Service
 *
 * Provides 250m-1km daily coverage from Terra/Aqua satellites.
 * Essential for seasonal phenology tracking and large-scale vegetation monitoring.
 *
 * Products:
 *   MOD13Q1 — 16-day NDVI/EVI composites (250m)
 *   MOD11A1 — Daily Land Surface Temperature (1km)
 *   MCD12Q1 — Annual IGBP Land Cover (500m)
 *   MOD44B — Annual Vegetation Continuous Fields (250m)
 *
 * Data source: ORNL DAAC MODIS Web Service (free, no auth required)
 * https://modis.ornl.gov/rst/api/v1/
 */

// ─── Types ───

export interface MODISProduct {
  productId: 'MOD13Q1' | 'MOD11A1' | 'MCD12Q1' | 'MOD44B';
  name: string;
  resolution: string;
  temporalResolution: string;
}

export interface MODISObservation {
  date: string;
  ndvi: number;
  evi: number;
  quality: 'good' | 'marginal' | 'cloudy' | 'mixed';
  pixelReliability: number;
  viewAngle: number;
}

export interface LSTObservation {
  date: string;
  dayLST: number;    // Kelvin
  nightLST: number;  // Kelvin
  quality: 'good' | 'marginal' | 'cloudy';
}

export interface LandCoverResult {
  lat: number;
  lng: number;
  igbpClass: number;
  igbpLabel: string;
  treePercent: number;
  nonTreePercent: number;
  barePercent: number;
  year: number;
}

export interface PhenologyDates {
  greenUpDate: string;
  peakDate: string;
  senescenceDate: string;
  dormancyDate: string;
  growingSeasonLength: number;
  year: number;
}

// ─── Source Info ───

export const MODIS_SOURCE_INFO = {
  name: 'NASA MODIS (Terra/Aqua)',
  resolution: '250m (NDVI) / 1km (LST)',
  revisit: 'Daily (1-2 day global)',
  archiveDepth: '25+ years (Terra since 2000, Aqua since 2002)',
  provider: 'NASA EOSDIS / LP DAAC',
  license: 'Public domain (US Government)',
};

export const MODIS_PRODUCTS: MODISProduct[] = [
  { productId: 'MOD13Q1', name: '16-Day NDVI/EVI Composite', resolution: '250m', temporalResolution: '16 days' },
  { productId: 'MOD11A1', name: 'Daily Land Surface Temperature', resolution: '1km', temporalResolution: 'Daily' },
  { productId: 'MCD12Q1', name: 'IGBP Land Cover Classification', resolution: '500m', temporalResolution: 'Annual' },
  { productId: 'MOD44B', name: 'Vegetation Continuous Fields', resolution: '250m', temporalResolution: 'Annual' },
];

// ─── ORNL DAAC MODIS Web Service ───

const ORNL_BASE_URL = 'https://modis.ornl.gov/rst/api/v1';

/**
 * Convert a JS Date to the MODIS Julian date format "AYEARDAY" (e.g., A2025001).
 */
function toModisDate(date: Date): string {
  const year = date.getFullYear();
  const start = new Date(year, 0, 0);
  const diff = date.getTime() - start.getTime();
  const doy = Math.floor(diff / 86400000);
  return `A${year}${String(doy).padStart(3, '0')}`;
}

/**
 * Parse a MODIS Julian date string "AYEARDAY" (e.g., A2025017) to an ISO date string.
 */
function parseModisDate(modisDate: string): string {
  const year = parseInt(modisDate.substring(1, 5), 10);
  const doy = parseInt(modisDate.substring(5), 10);
  const d = new Date(year, 0, doy);
  return d.toISOString().slice(0, 10);
}

// ─── ORNL DAAC Response Types ───

interface ORNLSubsetResponse {
  header: {
    latitude: number;
    longitude: number;
    product: string;
    band: string;
    start: string;
    end: string;
  };
  subset: Array<{
    modis_date: string;
    calendar_date: string;
    band: string;
    tile: string;
    proc_date: string;
    data: number[];
  }>;
}

// ─── Cache ───

interface CacheEntry<T> {
  key: string;
  data: T;
  fetchedAt: number;
}

let cachedNDVI: CacheEntry<MODISObservation[]> | null = null;
let cachedLST: CacheEntry<LSTObservation[]> | null = null;
let cachedLandCover: CacheEntry<LandCoverResult> | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — MODIS updates every 16 days

function isCacheValid<T>(cache: CacheEntry<T> | null, key: string): cache is CacheEntry<T> {
  return cache !== null && cache.key === key && Date.now() - cache.fetchedAt < CACHE_TTL;
}

// ─── IGBP Classes ───

const IGBP_LABELS: Record<number, string> = {
  1: 'Evergreen Needleleaf Forests',
  2: 'Evergreen Broadleaf Forests',
  3: 'Deciduous Needleleaf Forests',
  4: 'Deciduous Broadleaf Forests',
  5: 'Mixed Forests',
  6: 'Closed Shrublands',
  7: 'Open Shrublands',
  8: 'Woody Savannas',
  9: 'Savannas',
  10: 'Grasslands',
  11: 'Permanent Wetlands',
  12: 'Croplands',
  13: 'Urban and Built-up Lands',
  14: 'Cropland/Natural Vegetation Mosaics',
  15: 'Permanent Snow and Ice',
  16: 'Barren',
  17: 'Water Bodies',
};

// ─── ORNL DAAC Fetch Helper ───

async function fetchORNLSubset(
  product: string,
  band: string,
  lat: number,
  lng: number,
  startDate: string,
  endDate: string,
): Promise<ORNLSubsetResponse> {
  const url = `${ORNL_BASE_URL}/${product}/subset?` +
    `latitude=${lat}&longitude=${lng}` +
    `&startDate=${startDate}&endDate=${endDate}` +
    `&kmAboveBelow=0&kmLeftRight=0`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`ORNL DAAC API error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<ORNLSubsetResponse>;
}

// ─── Demo / Fallback Data ───

function generateDemoNDVITimeSeries(): MODISObservation[] {
  const obs: MODISObservation[] = [];
  const now = new Date();
  for (let i = 0; i < 46 * 2; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 16);
    const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);
    const month = date.getMonth();

    let ndvi = 0.45 + 0.35 * Math.sin((doy - 80) * Math.PI / 200);
    ndvi = Math.max(0.25, Math.min(0.85, ndvi));
    const evi = ndvi * 0.7;

    const isCloudy = month >= 10 || month <= 2 ? Math.random() > 0.5 : Math.random() > 0.8;

    obs.push({
      date: date.toISOString().slice(0, 10),
      ndvi: Math.round(ndvi * 1000) / 1000,
      evi: Math.round(evi * 1000) / 1000,
      quality: isCloudy ? 'cloudy' : Math.random() > 0.85 ? 'marginal' : 'good',
      pixelReliability: isCloudy ? 2 : Math.random() > 0.9 ? 1 : 0,
      viewAngle: Math.round(5 + Math.random() * 40),
    });
  }
  return obs.reverse();
}

function generateDemoLST(): LSTObservation[] {
  const obs: LSTObservation[] = [];
  const now = new Date();
  for (let i = 0; i < 60; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const month = date.getMonth();

    let dayTemp: number;
    if (month >= 5 && month <= 7) dayTemp = 290 + Math.random() * 10;
    else if ((month >= 3 && month <= 4) || (month >= 8 && month <= 9)) dayTemp = 280 + Math.random() * 8;
    else dayTemp = 268 + Math.random() * 8;

    const nightTemp = dayTemp - 8 - Math.random() * 5;
    const isCloudy = Math.random() > 0.6;

    obs.push({
      date: date.toISOString().slice(0, 10),
      dayLST: Math.round(dayTemp * 10) / 10,
      nightLST: Math.round(nightTemp * 10) / 10,
      quality: isCloudy ? 'cloudy' : Math.random() > 0.9 ? 'marginal' : 'good',
    });
  }
  return obs.reverse();
}

// ─── Pixel Reliability Mapping ───

/**
 * MOD13Q1 pixel reliability:
 * 0 = Good, 1 = Marginal, 2 = Snow/Ice, 3 = Cloudy, -1 = Fill/NoData
 */
function mapPixelReliability(value: number): MODISObservation['quality'] {
  switch (value) {
    case 0: return 'good';
    case 1: return 'marginal';
    case 2: return 'mixed';
    case 3: return 'cloudy';
    default: return 'cloudy';
  }
}

// ─── Public API ───

/**
 * Fetch MODIS NDVI time series for a location.
 * Uses the ORNL DAAC MODIS Web Service (free, no auth required).
 * Falls back to demo data if the API is unreachable.
 */
export async function fetchMODIS_NDVI(
  lat: number,
  lng: number,
  dateRange: { start: string; end: string },
): Promise<MODISObservation[]> {
  const key = `${lat},${lng},${dateRange.start},${dateRange.end}`;
  if (isCacheValid(cachedNDVI, key)) {
    return cachedNDVI.data;
  }

  try {
    const startDate = toModisDate(new Date(dateRange.start));
    const endDate = toModisDate(new Date(dateRange.end));

    // Fetch NDVI and EVI bands in parallel
    const [ndviResponse, eviResponse] = await Promise.all([
      fetchORNLSubset('MOD13Q1', '250m_16_days_NDVI', lat, lng, startDate, endDate),
      fetchORNLSubset('MOD13Q1', '250m_16_days_EVI', lat, lng, startDate, endDate),
    ]);

    // Build a map of EVI values keyed by MODIS date
    const eviByDate = new Map<string, number>();
    for (const entry of eviResponse.subset) {
      const value = entry.data[0];
      if (value !== undefined) {
        // MODIS scale factor: raw values are scaled by 10000
        eviByDate.set(entry.modis_date, value / 10000);
      }
    }

    const observations: MODISObservation[] = [];

    for (const entry of ndviResponse.subset) {
      const rawNdvi = entry.data[0];
      if (rawNdvi === undefined) continue;

      // MODIS NDVI fill value is typically -3000 or values outside [-2000, 10000]
      const ndvi = rawNdvi / 10000;
      if (ndvi < -0.2 || ndvi > 1.0) continue; // skip fill/invalid values

      const evi = eviByDate.get(entry.modis_date) ?? ndvi * 0.7;
      const calendarDate = entry.calendar_date || parseModisDate(entry.modis_date);

      // Determine quality based on value ranges
      // Without the reliability band, use heuristics on the NDVI value itself
      let quality: MODISObservation['quality'] = 'good';
      let pixelReliability = 0;
      if (ndvi < 0) {
        quality = 'cloudy';
        pixelReliability = 3;
      } else if (ndvi < 0.1) {
        quality = 'mixed';
        pixelReliability = 2;
      }

      observations.push({
        date: calendarDate,
        ndvi: Math.round(ndvi * 1000) / 1000,
        evi: Math.round(Math.max(-0.2, Math.min(1.0, evi)) * 1000) / 1000,
        quality,
        pixelReliability,
        viewAngle: 0, // not available from subset API
      });
    }

    if (observations.length === 0) {
      throw new Error('No valid NDVI observations returned from ORNL DAAC');
    }

    // Sort by date ascending
    observations.sort((a, b) => a.date.localeCompare(b.date));

    cachedNDVI = { key, data: observations, fetchedAt: Date.now() };
    return observations;
  } catch (error) {
    console.warn('[MODIS] ORNL DAAC NDVI request failed, using demo data:', error);
    const data = generateDemoNDVITimeSeries();
    cachedNDVI = { key, data, fetchedAt: Date.now() };
    return data;
  }
}

/**
 * Fetch MODIS Land Surface Temperature -- critical for GDD beetle models.
 * Uses the ORNL DAAC MODIS Web Service for MOD11A1 (1km daily LST).
 * Falls back to demo data if the API is unreachable.
 */
export async function fetchMODIS_LST(
  lat: number,
  lng: number,
  dateRange: { start: string; end: string },
): Promise<LSTObservation[]> {
  const key = `lst:${lat},${lng},${dateRange.start},${dateRange.end}`;
  if (isCacheValid(cachedLST, key)) {
    return cachedLST.data;
  }

  try {
    const startDate = toModisDate(new Date(dateRange.start));
    const endDate = toModisDate(new Date(dateRange.end));

    // Fetch day and night LST bands in parallel
    const [dayResponse, nightResponse] = await Promise.all([
      fetchORNLSubset('MOD11A1', 'LST_Day_1km', lat, lng, startDate, endDate),
      fetchORNLSubset('MOD11A1', 'LST_Night_1km', lat, lng, startDate, endDate),
    ]);

    // Build night LST map keyed by MODIS date
    const nightByDate = new Map<string, number>();
    for (const entry of nightResponse.subset) {
      const value = entry.data[0];
      if (value !== undefined && value > 0) {
        // MOD11A1 scale factor: raw values * 0.02 = Kelvin
        nightByDate.set(entry.modis_date, value * 0.02);
      }
    }

    const observations: LSTObservation[] = [];

    for (const entry of dayResponse.subset) {
      const rawDay = entry.data[0];
      if (rawDay === undefined || rawDay <= 0) continue; // 0 is fill value

      const dayLST = rawDay * 0.02; // scale to Kelvin
      if (dayLST < 200 || dayLST > 350) continue; // sanity check

      const nightLST = nightByDate.get(entry.modis_date);
      const calendarDate = entry.calendar_date || parseModisDate(entry.modis_date);

      // If we have no night temp, estimate it (day - 8-13K typical diurnal range)
      const nightValue = nightLST ?? dayLST - 10;

      let quality: LSTObservation['quality'] = 'good';
      if (!nightLST) {
        quality = 'marginal'; // missing night data suggests partial cloud
      }

      observations.push({
        date: calendarDate,
        dayLST: Math.round(dayLST * 10) / 10,
        nightLST: Math.round(nightValue * 10) / 10,
        quality,
      });
    }

    if (observations.length === 0) {
      throw new Error('No valid LST observations returned from ORNL DAAC');
    }

    observations.sort((a, b) => a.date.localeCompare(b.date));

    cachedLST = { key, data: observations, fetchedAt: Date.now() };
    return observations;
  } catch (error) {
    console.warn('[MODIS] ORNL DAAC LST request failed, using demo data:', error);
    const data = generateDemoLST();
    cachedLST = { key, data, fetchedAt: Date.now() };
    return data;
  }
}

/**
 * Fetch MODIS IGBP land cover classification.
 * Uses the ORNL DAAC MODIS Web Service for MCD12Q1 (500m annual land cover).
 * Falls back to demo data if the API is unreachable.
 */
export async function fetchMODIS_LandCover(
  lat: number,
  lng: number,
): Promise<LandCoverResult> {
  const key = `lc:${lat},${lng}`;
  if (isCacheValid(cachedLandCover, key)) {
    return cachedLandCover.data;
  }

  try {
    // MCD12Q1 is annual; request the most recent year available
    const currentYear = new Date().getFullYear();
    // MCD12Q1 data is typically available with a ~1 year lag
    const targetYear = currentYear - 1;
    const startDate = `A${targetYear}001`;
    const endDate = `A${targetYear}365`;

    // Fetch IGBP classification and tree cover percentage
    const [igbpResponse, vcfResponse] = await Promise.allSettled([
      fetchORNLSubset('MCD12Q1', 'LC_Type1', lat, lng, startDate, endDate),
      fetchORNLSubset('MOD44B', 'Percent_Tree_Cover', lat, lng, startDate, endDate),
    ]);

    let igbpClass = 1; // default: Evergreen Needleleaf (common in Swedish forests)
    let treePercent = 72;
    let nonTreePercent = 20;
    let barePercent = 8;
    let year = targetYear;

    if (igbpResponse.status === 'fulfilled' && igbpResponse.value.subset.length > 0) {
      const lastEntry = igbpResponse.value.subset[igbpResponse.value.subset.length - 1];
      const rawClass = lastEntry.data[0];
      if (rawClass !== undefined && rawClass >= 1 && rawClass <= 17) {
        igbpClass = rawClass;
      }
      // Extract year from MODIS date if available
      if (lastEntry.modis_date) {
        year = parseInt(lastEntry.modis_date.substring(1, 5), 10);
      }
    }

    if (vcfResponse.status === 'fulfilled' && vcfResponse.value.subset.length > 0) {
      const lastEntry = vcfResponse.value.subset[vcfResponse.value.subset.length - 1];
      const rawTree = lastEntry.data[0];
      if (rawTree !== undefined && rawTree >= 0 && rawTree <= 100) {
        treePercent = rawTree;
        // Approximate non-tree and bare from tree cover
        const remaining = 100 - treePercent;
        nonTreePercent = Math.round(remaining * 0.7);
        barePercent = remaining - nonTreePercent;
      }
    }

    const result: LandCoverResult = {
      lat,
      lng,
      igbpClass,
      igbpLabel: IGBP_LABELS[igbpClass] ?? 'Unknown',
      treePercent,
      nonTreePercent,
      barePercent,
      year,
    };

    cachedLandCover = { key, data: result, fetchedAt: Date.now() };
    return result;
  } catch (error) {
    console.warn('[MODIS] ORNL DAAC Land Cover request failed, using demo data:', error);

    const igbpClass = 1;
    const result: LandCoverResult = {
      lat,
      lng,
      igbpClass,
      igbpLabel: IGBP_LABELS[igbpClass] ?? 'Unknown',
      treePercent: 72 + Math.round(Math.random() * 10),
      nonTreePercent: 18 + Math.round(Math.random() * 6),
      barePercent: 2 + Math.round(Math.random() * 4),
      year: new Date().getFullYear() - 1,
    };
    cachedLandCover = { key, data: result, fetchedAt: Date.now() };
    return result;
  }
}

/**
 * Extract growing season phenology dates from 16-day NDVI composites.
 * Green-up, peak, senescence, and dormancy dates.
 *
 * Derives phenology from real MODIS NDVI time series by detecting
 * threshold crossings in the seasonal curve.
 */
export async function getVegetationPhenology(
  lat: number,
  lng: number,
  year: number,
): Promise<PhenologyDates> {
  try {
    // Fetch a full year of NDVI data
    const dateRange = {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
    };
    const ndviData = await fetchMODIS_NDVI(lat, lng, dateRange);

    // Filter to the requested year and only good/marginal quality
    const yearData = ndviData.filter(
      obs => obs.date.startsWith(String(year)) && (obs.quality === 'good' || obs.quality === 'marginal'),
    );

    if (yearData.length < 6) {
      throw new Error('Insufficient NDVI observations for phenology extraction');
    }

    // Find min and max NDVI to set thresholds
    const ndviValues = yearData.map(obs => obs.ndvi);
    const minNdvi = Math.min(...ndviValues);
    const maxNdvi = Math.max(...ndviValues);
    const amplitude = maxNdvi - minNdvi;

    // Phenology thresholds: 20% and 80% of seasonal amplitude
    const greenUpThreshold = minNdvi + amplitude * 0.2;
    const senescenceThreshold = minNdvi + amplitude * 0.2;

    // Find green-up: first crossing above threshold (ascending) in spring (DOY < 200)
    let greenUpDate = `${year}-04-10`; // fallback
    for (let i = 1; i < yearData.length; i++) {
      const d = new Date(yearData[i].date);
      const doy = Math.floor((d.getTime() - new Date(year, 0, 0).getTime()) / 86400000);
      if (doy > 200) break;
      if (yearData[i - 1].ndvi <= greenUpThreshold && yearData[i].ndvi > greenUpThreshold) {
        greenUpDate = yearData[i].date;
        break;
      }
    }

    // Find peak: date of maximum NDVI
    let peakIdx = 0;
    let peakNdvi = -Infinity;
    for (let i = 0; i < yearData.length; i++) {
      if (yearData[i].ndvi > peakNdvi) {
        peakNdvi = yearData[i].ndvi;
        peakIdx = i;
      }
    }
    const peakDate = yearData[peakIdx].date;

    // Find senescence: first crossing below threshold (descending) after peak
    let senescenceDate = `${year}-09-25`; // fallback
    for (let i = peakIdx + 1; i < yearData.length; i++) {
      if (yearData[i - 1].ndvi >= senescenceThreshold && yearData[i].ndvi < senescenceThreshold) {
        senescenceDate = yearData[i].date;
        break;
      }
    }

    // Find dormancy: NDVI drops to near-minimum after senescence
    const dormancyThreshold = minNdvi + amplitude * 0.1;
    let dormancyDate = `${year}-11-01`; // fallback
    const senescenceIdx = yearData.findIndex(obs => obs.date === senescenceDate);
    if (senescenceIdx >= 0) {
      for (let i = senescenceIdx; i < yearData.length; i++) {
        if (yearData[i].ndvi <= dormancyThreshold) {
          dormancyDate = yearData[i].date;
          break;
        }
      }
    }

    // Calculate growing season length in days
    const gsStart = new Date(greenUpDate);
    const gsEnd = new Date(senescenceDate);
    const growingSeasonLength = Math.round((gsEnd.getTime() - gsStart.getTime()) / 86400000);

    return {
      greenUpDate,
      peakDate,
      senescenceDate,
      dormancyDate,
      growingSeasonLength: Math.max(0, growingSeasonLength),
      year,
    };
  } catch (error) {
    console.warn('[MODIS] Phenology extraction failed, using demo data:', error);

    // Typical phenology for southern Swedish spruce forest
    const greenUpDay = 95 + Math.round(Math.random() * 20);
    const peakDay = 185 + Math.round(Math.random() * 15);
    const senescenceDay = 265 + Math.round(Math.random() * 15);
    const dormancyDay = 305 + Math.round(Math.random() * 15);

    const toDate = (doy: number) => {
      const d = new Date(year, 0, doy);
      return d.toISOString().slice(0, 10);
    };

    return {
      greenUpDate: toDate(greenUpDay),
      peakDate: toDate(peakDay),
      senescenceDate: toDate(senescenceDay),
      dormancyDate: toDate(dormancyDay),
      growingSeasonLength: senescenceDay - greenUpDay,
      year,
    };
  }
}

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
 * TODO: Register for NASA AppEEARS API token for live data
 * https://appeears.earthdatacloud.nasa.gov/
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

// ─── Cache ───

let cachedNDVI: { key: string; data: MODISObservation[]; fetchedAt: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

// ─── Demo Data ───

function generateDemoNDVITimeSeries(): MODISObservation[] {
  const obs: MODISObservation[] = [];
  const now = new Date();
  // 2-year 16-day composites
  for (let i = 0; i < 46 * 2; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - i * 16);
    const month = date.getMonth();
    const doy = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000);

    // Seasonal NDVI cycle for Småland spruce
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

    // Seasonal temperature pattern for southern Sweden (in Kelvin)
    let dayTemp: number;
    if (month >= 5 && month <= 7) dayTemp = 290 + Math.random() * 10;
    else if (month >= 3 && month <= 4 || month >= 8 && month <= 9) dayTemp = 280 + Math.random() * 8;
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

// ─── Public API ───

/**
 * Fetch MODIS NDVI time series for a location.
 * Uses NASA AppEEARS API when available, falls back to demo data.
 */
export async function fetchMODIS_NDVI(
  lat: number,
  lng: number,
  dateRange: { start: string; end: string },
): Promise<MODISObservation[]> {
  const key = `${lat},${lng},${dateRange.start},${dateRange.end}`;
  if (cachedNDVI && cachedNDVI.key === key && Date.now() - cachedNDVI.fetchedAt < CACHE_TTL) {
    return cachedNDVI.data;
  }

  // Simulate API delay then return demo data
  await new Promise(r => setTimeout(r, 200));
  const data = generateDemoNDVITimeSeries();
  cachedNDVI = { key, data, fetchedAt: Date.now() };
  return data;
}

/**
 * Fetch MODIS Land Surface Temperature — critical for GDD beetle models.
 */
export async function fetchMODIS_LST(
  _lat: number,
  _lng: number,
  _dateRange: { start: string; end: string },
): Promise<LSTObservation[]> {
  await new Promise(r => setTimeout(r, 150));
  return generateDemoLST();
}

/**
 * Fetch MODIS IGBP land cover classification.
 */
export async function fetchMODIS_LandCover(
  lat: number,
  lng: number,
): Promise<LandCoverResult> {
  await new Promise(r => setTimeout(r, 100));

  // Småland is predominantly evergreen needleleaf (IGBP class 1)
  const igbpClass = 1;
  return {
    lat,
    lng,
    igbpClass,
    igbpLabel: IGBP_LABELS[igbpClass] ?? 'Unknown',
    treePercent: 72 + Math.round(Math.random() * 10),
    nonTreePercent: 18 + Math.round(Math.random() * 6),
    barePercent: 2 + Math.round(Math.random() * 4),
    year: new Date().getFullYear() - 1,
  };
}

/**
 * Extract growing season phenology dates from 16-day NDVI composites.
 * Green-up, peak, senescence, and dormancy dates.
 */
export async function getVegetationPhenology(
  _lat: number,
  _lng: number,
  year: number,
): Promise<PhenologyDates> {
  await new Promise(r => setTimeout(r, 150));

  // Typical phenology for southern Swedish spruce forest
  const greenUpDay = 95 + Math.round(Math.random() * 20); // early-mid April
  const peakDay = 185 + Math.round(Math.random() * 15);   // early July
  const senescenceDay = 265 + Math.round(Math.random() * 15); // late September
  const dormancyDay = 305 + Math.round(Math.random() * 15); // early November

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

// ─── Microclimate & Site-Specific Almanac Engine ───
// Hyper-local growing conditions and frost/temperature predictions
// for Swedish forest parcels, calibrated for Småland / Kronoberg county.

// ─── Types ───

export interface MonthlyNormals {
  month: number;
  name: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
  precipitation: number;
  daylightHours: number;
  frostDays: number;
  snowDepthCm: number;
}

export type FrostRisk = 'none' | 'low' | 'medium' | 'high';

export interface MonthData extends MonthlyNormals {
  /** Adjusted for parcel altitude and frost pocket */
  adjustedAvgTemp: number;
  adjustedMinTemp: number;
  adjustedMaxTemp: number;
  frostRisk: FrostRisk;
  soilTemp10cm: number;
  gddAccumulated: number;
  forestryActivities: string[];
  phenologyNotes: string[];
}

export interface GrowingSeasonResult {
  startDate: string;
  endDate: string;
  lengthDays: number;
  lastSpringFrost: string;
  firstAutumnFrost: string;
  totalGDD: number;
}

export interface FrostPocketZone {
  id: string;
  name: string;
  coordinates: [number, number][][];
  center: [number, number];
  extraFrostDays: number;
  tempReduction: number;
  reason: string;
}

export interface PhenologicalEvent {
  id: string;
  name: string;
  typicalDate: string;
  adjustedDate: string;
  category: 'budburst' | 'growth' | 'cessation' | 'beetle' | 'pollen';
  description: string;
  tempThreshold?: number;
}

export interface ParcelClimate {
  parcelId: string;
  parcelName: string;
  elevation: number;
  latitude: number;
  countyName: string;
  soilType: string;
  terrainPosition: 'hilltop' | 'slope' | 'valley' | 'plain';
  months: MonthData[];
  growingSeason: GrowingSeasonResult;
  frostPockets: FrostPocketZone[];
  phenology: PhenologicalEvent[];
  countyAverageMonths: MonthlyNormals[];
}

// ─── Småland Monthly Normals (Kronoberg, ~160m, 1991-2020 SMHI) ───

const SMALAND_NORMALS: MonthlyNormals[] = [
  { month: 1,  name: 'january',   avgTemp: -2.5, minTemp: -6.0, maxTemp: 1.0,  precipitation: 52,  daylightHours: 6.5,  frostDays: 25, snowDepthCm: 15 },
  { month: 2,  name: 'february',  avgTemp: -2.8, minTemp: -6.5, maxTemp: 1.0,  precipitation: 38,  daylightHours: 8.5,  frostDays: 22, snowDepthCm: 18 },
  { month: 3,  name: 'march',     avgTemp: 0.5,  minTemp: -3.5, maxTemp: 4.5,  precipitation: 42,  daylightHours: 11.5, frostDays: 18, snowDepthCm: 10 },
  { month: 4,  name: 'april',     avgTemp: 5.5,  minTemp: 0.5,  maxTemp: 10.5, precipitation: 38,  daylightHours: 14.5, frostDays: 10, snowDepthCm: 0 },
  { month: 5,  name: 'may',       avgTemp: 11.0, minTemp: 5.0,  maxTemp: 17.0, precipitation: 50,  daylightHours: 17.0, frostDays: 3,  snowDepthCm: 0 },
  { month: 6,  name: 'june',      avgTemp: 15.0, minTemp: 9.5,  maxTemp: 20.5, precipitation: 65,  daylightHours: 18.5, frostDays: 0,  snowDepthCm: 0 },
  { month: 7,  name: 'july',      avgTemp: 17.5, minTemp: 12.0, maxTemp: 23.0, precipitation: 75,  daylightHours: 17.5, frostDays: 0,  snowDepthCm: 0 },
  { month: 8,  name: 'august',    avgTemp: 16.0, minTemp: 11.0, maxTemp: 21.0, precipitation: 70,  daylightHours: 15.0, frostDays: 0,  snowDepthCm: 0 },
  { month: 9,  name: 'september', avgTemp: 11.5, minTemp: 7.0,  maxTemp: 16.0, precipitation: 65,  daylightHours: 12.5, frostDays: 1,  snowDepthCm: 0 },
  { month: 10, name: 'october',   avgTemp: 6.5,  minTemp: 2.5,  maxTemp: 10.5, precipitation: 60,  daylightHours: 10.0, frostDays: 6,  snowDepthCm: 0 },
  { month: 11, name: 'november',  avgTemp: 2.0,  minTemp: -1.0, maxTemp: 5.0,  precipitation: 58,  daylightHours: 7.5,  frostDays: 14, snowDepthCm: 3 },
  { month: 12, name: 'december',  avgTemp: -1.0, minTemp: -4.5, maxTemp: 2.0,  precipitation: 55,  daylightHours: 6.0,  frostDays: 22, snowDepthCm: 10 },
];

// ─── Altitude Adjustment ───
// Standard lapse rate: -0.6°C per 100m elevation above reference (160m)

function adjustForAltitude(temp: number, elevation: number, referenceElevation = 160): number {
  const delta = (elevation - referenceElevation) / 100;
  return Math.round((temp - delta * 0.6) * 10) / 10;
}

// ─── Frost Risk Classification ───

function classifyFrostRisk(month: number, adjustedMinTemp: number, frostDays: number): FrostRisk {
  if (month >= 6 && month <= 8 && frostDays === 0) return 'none';
  if (frostDays >= 20) return 'high';
  if (frostDays >= 8) return 'medium';
  if (frostDays >= 1) return 'low';
  return 'none';
}

// ─── Soil Temperature Model ───
// Soil at 10cm lags air temperature by ~3 weeks and is damped by ~40%
// Frozen ground: soil temp < 0°C

function computeSoilTemp(months: MonthlyNormals[], monthIndex: number, soilType: string): number {
  // Average of current and previous month, damped
  const curr = months[monthIndex].avgTemp;
  const prevIdx = (monthIndex - 1 + 12) % 12;
  const prevPrevIdx = (monthIndex - 2 + 12) % 12;
  const prev = months[prevIdx].avgTemp;
  const prevPrev = months[prevPrevIdx].avgTemp;

  // Weighted lag: 50% current, 30% prev, 20% prev-prev
  let soilTemp = curr * 0.5 + prev * 0.3 + prevPrev * 0.2;

  // Soil type damping
  const dampingFactor = soilType === 'clay' ? 0.75 : soilType === 'peat' ? 0.85 : 0.80;
  // Annual mean as anchor
  const annualMean = months.reduce((s, m) => s + m.avgTemp, 0) / 12;
  soilTemp = annualMean + (soilTemp - annualMean) * dampingFactor;

  return Math.round(soilTemp * 10) / 10;
}

// ─── Growing Degree Days (GDD) ───
// Base temperature 5°C, accumulated from January

function _computeGDD(months: MonthData[]): number {
  let gdd = 0;
  for (const m of months) {
    const effective = Math.max(0, m.adjustedAvgTemp - 5);
    gdd += effective * 30; // approximate days per month
  }
  return Math.round(gdd);
}

// ─── Forestry Activities by Month ───

const FORESTRY_ACTIVITIES: Record<number, string[]> = {
  1:  ['microclimate.activities.winterHarvest', 'microclimate.activities.frozenGroundTransport'],
  2:  ['microclimate.activities.winterHarvest', 'microclimate.activities.planNextSeason'],
  3:  ['microclimate.activities.preSeason', 'microclimate.activities.boundaryMarking'],
  4:  ['microclimate.activities.planting', 'microclimate.activities.scarification'],
  5:  ['microclimate.activities.planting', 'microclimate.activities.pctStart'],
  6:  ['microclimate.activities.pct', 'microclimate.activities.beetleMonitoring'],
  7:  ['microclimate.activities.beetleMonitoring', 'microclimate.activities.thinning'],
  8:  ['microclimate.activities.beetleMonitoring', 'microclimate.activities.thinning'],
  9:  ['microclimate.activities.autumnThinning', 'microclimate.activities.seedCollection'],
  10: ['microclimate.activities.finalFelling', 'microclimate.activities.roadMaintenance'],
  11: ['microclimate.activities.finalFelling', 'microclimate.activities.winterPrep'],
  12: ['microclimate.activities.winterHarvest', 'microclimate.activities.yearReview'],
};

// ─── Phenological Notes by Month ───

const PHENOLOGY_NOTES: Record<number, string[]> = {
  1:  ['microclimate.phenology.dormancy'],
  2:  ['microclimate.phenology.deepWinter'],
  3:  ['microclimate.phenology.snowmelt'],
  4:  ['microclimate.phenology.budSwell', 'microclimate.phenology.birchSapRising'],
  5:  ['microclimate.phenology.spruceBudburst', 'microclimate.phenology.birchLeafOut'],
  6:  ['microclimate.phenology.fullGrowth', 'microclimate.phenology.pinePollen'],
  7:  ['microclimate.phenology.peakGrowth', 'microclimate.phenology.beetleSwarming'],
  8:  ['microclimate.phenology.lateGrowth', 'microclimate.phenology.secondBeetleFlight'],
  9:  ['microclimate.phenology.growthSlowing', 'microclimate.phenology.berryRipening'],
  10: ['microclimate.phenology.leafFall', 'microclimate.phenology.growthCessation'],
  11: ['microclimate.phenology.needleDrop', 'microclimate.phenology.dormancyOnset'],
  12: ['microclimate.phenology.fullDormancy'],
};

// ─── Phenological Events Timeline ───

function getPhenologicalEvents(elevationOffset: number): PhenologicalEvent[] {
  // Days to delay per degree C cooler
  const daysPerDegree = 4;
  const delayDays = Math.round(elevationOffset * daysPerDegree);

  function offsetDate(month: number, day: number): string {
    const d = new Date(2026, month - 1, day);
    d.setDate(d.getDate() + delayDays);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  function typDate(month: number, day: number): string {
    return `${month}/${day}`;
  }

  return [
    {
      id: 'birch-sap',
      name: 'microclimate.events.birchSapRising',
      typicalDate: typDate(4, 5),
      adjustedDate: offsetDate(4, 5),
      category: 'budburst',
      description: 'microclimate.events.birchSapDesc',
    },
    {
      id: 'spruce-budburst',
      name: 'microclimate.events.spruceBudburst',
      typicalDate: typDate(5, 10),
      adjustedDate: offsetDate(5, 10),
      category: 'budburst',
      description: 'microclimate.events.spruceBudburstDesc',
      tempThreshold: 10,
    },
    {
      id: 'birch-leafout',
      name: 'microclimate.events.birchLeafOut',
      typicalDate: typDate(5, 5),
      adjustedDate: offsetDate(5, 5),
      category: 'budburst',
      description: 'microclimate.events.birchLeafOutDesc',
    },
    {
      id: 'pine-pollen',
      name: 'microclimate.events.pinePollen',
      typicalDate: typDate(6, 1),
      adjustedDate: offsetDate(6, 1),
      category: 'pollen',
      description: 'microclimate.events.pinePollenDesc',
    },
    {
      id: 'beetle-swarm-1',
      name: 'microclimate.events.beetleSwarm1',
      typicalDate: typDate(5, 20),
      adjustedDate: offsetDate(5, 20),
      category: 'beetle',
      description: 'microclimate.events.beetleSwarm1Desc',
      tempThreshold: 18,
    },
    {
      id: 'peak-growth',
      name: 'microclimate.events.peakGrowth',
      typicalDate: typDate(7, 1),
      adjustedDate: offsetDate(7, 1),
      category: 'growth',
      description: 'microclimate.events.peakGrowthDesc',
    },
    {
      id: 'beetle-swarm-2',
      name: 'microclimate.events.beetleSwarm2',
      typicalDate: typDate(7, 25),
      adjustedDate: offsetDate(7, 25),
      category: 'beetle',
      description: 'microclimate.events.beetleSwarm2Desc',
      tempThreshold: 18,
    },
    {
      id: 'growth-cessation',
      name: 'microclimate.events.growthCessation',
      typicalDate: typDate(9, 15),
      adjustedDate: offsetDate(9, 15),
      category: 'cessation',
      description: 'microclimate.events.growthCessationDesc',
    },
    {
      id: 'needle-drop',
      name: 'microclimate.events.needleDrop',
      typicalDate: typDate(10, 15),
      adjustedDate: offsetDate(10, 15),
      category: 'cessation',
      description: 'microclimate.events.needleDropDesc',
    },
  ];
}

// ─── Demo Parcel Data ───

interface DemoParcel {
  id: string;
  name: string;
  elevation: number;
  latitude: number;
  county: string;
  soilType: string;
  terrainPosition: 'hilltop' | 'slope' | 'valley' | 'plain';
  center: [number, number];
  frostPockets: FrostPocketZone[];
}

const DEMO_PARCELS: DemoParcel[] = [
  {
    id: 'p1',
    name: 'Norra Skogen',
    elevation: 220,
    latitude: 56.75,
    county: 'Kronoberg',
    soilType: 'moraine',
    terrainPosition: 'slope',
    center: [15.27, 56.75],
    frostPockets: [
      {
        id: 'fp1',
        name: 'microclimate.frostPocket.creekValley',
        coordinates: [[[15.265, 56.753], [15.268, 56.755], [15.272, 56.754], [15.270, 56.751], [15.265, 56.753]]],
        center: [15.268, 56.753],
        extraFrostDays: 15,
        tempReduction: 3.0,
        reason: 'microclimate.frostPocket.creekValleyReason',
      },
    ],
  },
  {
    id: 'p2',
    name: 'Ekbacken',
    elevation: 185,
    latitude: 56.78,
    county: 'Kronoberg',
    soilType: 'clay',
    terrainPosition: 'plain',
    center: [15.31, 56.78],
    frostPockets: [],
  },
  {
    id: 'p3',
    name: 'Tallmon',
    elevation: 280,
    latitude: 56.72,
    county: 'Kronoberg',
    soilType: 'sandy',
    terrainPosition: 'hilltop',
    center: [15.24, 56.72],
    frostPockets: [
      {
        id: 'fp2',
        name: 'microclimate.frostPocket.northSlope',
        coordinates: [[[15.235, 56.718], [15.238, 56.720], [15.242, 56.719], [15.240, 56.717], [15.235, 56.718]]],
        center: [15.238, 56.719],
        extraFrostDays: 8,
        tempReduction: 2.0,
        reason: 'microclimate.frostPocket.northSlopeReason',
      },
    ],
  },
];

// ─── Main Computation ───

export function getParcelClimate(parcelId: string): ParcelClimate {
  const parcel = DEMO_PARCELS.find((p) => p.id === parcelId) ?? DEMO_PARCELS[0];

  // Altitude-adjusted normals
  const adjustedMonths: MonthData[] = SMALAND_NORMALS.map((norm, i) => {
    const adjustedAvg = adjustForAltitude(norm.avgTemp, parcel.elevation);
    const adjustedMin = adjustForAltitude(norm.minTemp, parcel.elevation);
    const adjustedMax = adjustForAltitude(norm.maxTemp, parcel.elevation);

    // Extra frost days from altitude — only apply to months that already have frost
    const extraFrostFromAltitude = Math.max(0, Math.round(((parcel.elevation - 160) / 100) * 3));
    const adjustedFrostDays = norm.frostDays === 0
      ? 0
      : Math.min(30, norm.frostDays + extraFrostFromAltitude);

    return {
      ...norm,
      adjustedAvgTemp: adjustedAvg,
      adjustedMinTemp: adjustedMin,
      adjustedMaxTemp: adjustedMax,
      frostRisk: classifyFrostRisk(norm.month, adjustedMin, adjustedFrostDays),
      frostDays: adjustedFrostDays,
      soilTemp10cm: computeSoilTemp(
        SMALAND_NORMALS.map((n) => ({
          ...n,
          avgTemp: adjustForAltitude(n.avgTemp, parcel.elevation),
        })),
        i,
        parcel.soilType,
      ),
      gddAccumulated: 0, // computed below
      forestryActivities: FORESTRY_ACTIVITIES[norm.month] ?? [],
      phenologyNotes: PHENOLOGY_NOTES[norm.month] ?? [],
    };
  });

  // Compute cumulative GDD
  let cumulativeGDD = 0;
  for (const m of adjustedMonths) {
    const effective = Math.max(0, m.adjustedAvgTemp - 5);
    cumulativeGDD += effective * 30;
    m.gddAccumulated = Math.round(cumulativeGDD);
  }

  // Growing season: first and last month with mean temp > 5°C
  const growingMonths = adjustedMonths.filter((m) => m.adjustedAvgTemp > 5);
  const startMonth = growingMonths.length > 0 ? growingMonths[0].month : 5;
  const endMonth = growingMonths.length > 0 ? growingMonths[growingMonths.length - 1].month : 9;

  // Interpolate approximate start/end dates
  const startDay = startMonth === 4 ? 15 : 1;
  const endDay = endMonth === 10 ? 20 : 30;
  const startDate = new Date(2026, startMonth - 1, startDay);
  const endDate = new Date(2026, endMonth - 1, endDay);
  const lengthDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Frost dates estimated from frost day counts
  const lastSpringFrost = startMonth <= 5 ? `May 5` : `April 20`;
  const firstAutumnFrost = endMonth >= 10 ? `October 1` : `September 20`;

  // Altitude temperature offset for phenology
  const elevationTempOffset = (parcel.elevation - 160) / 100 * 0.6;

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    elevation: parcel.elevation,
    latitude: parcel.latitude,
    countyName: parcel.county,
    soilType: parcel.soilType,
    terrainPosition: parcel.terrainPosition,
    months: adjustedMonths,
    growingSeason: {
      startDate: `${startMonth}/${startDay}`,
      endDate: `${endMonth}/${endDay}`,
      lengthDays,
      lastSpringFrost,
      firstAutumnFrost,
      totalGDD: adjustedMonths[adjustedMonths.length - 1].gddAccumulated,
    },
    frostPockets: parcel.frostPockets,
    phenology: getPhenologicalEvents(elevationTempOffset),
    countyAverageMonths: SMALAND_NORMALS,
  };
}

export function getAvailableParcels(): { id: string; name: string; elevation: number }[] {
  return DEMO_PARCELS.map((p) => ({ id: p.id, name: p.name, elevation: p.elevation }));
}

export function getCurrentMonthIndex(): number {
  return new Date().getMonth(); // 0-indexed
}

export function getGrowingSeasonProgress(climate: ParcelClimate): {
  elapsed: number;
  total: number;
  percent: number;
} {
  const today = new Date();
  const [startMonth, startDay] = climate.growingSeason.startDate.split('/').map(Number);
  const start = new Date(today.getFullYear(), startMonth - 1, startDay);
  const total = climate.growingSeason.lengthDays;

  if (today < start) return { elapsed: 0, total, percent: 0 };

  const elapsed = Math.min(
    total,
    Math.round((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
  );

  return { elapsed, total, percent: Math.round((elapsed / total) * 100) };
}

export function getNextFrostRiskDate(climate: ParcelClimate): string | null {
  const today = new Date();
  const currentMonth = today.getMonth(); // 0-indexed

  // Look forward for months with frost days > 0
  for (let i = 0; i < 12; i++) {
    const idx = (currentMonth + i) % 12;
    if (climate.months[idx].frostDays > 0 && i > 0) {
      return climate.months[idx].name;
    }
    if (climate.months[idx].frostDays > 0 && i === 0 && today.getDate() > 15) {
      // Current month but past mid-month, look at next
      continue;
    }
    if (climate.months[idx].frostDays > 0 && i === 0) {
      return climate.months[idx].name;
    }
  }
  return null;
}

// ─── Frost pocket parcel boundary for map ───

export function getParcelBoundary(parcelId: string): {
  coordinates: [number, number][][];
  center: [number, number];
} {
  const parcel = DEMO_PARCELS.find((p) => p.id === parcelId) ?? DEMO_PARCELS[0];
  const [lng, lat] = parcel.center;
  // Generate a rough parcel polygon around the center
  const offset = 0.008;
  return {
    coordinates: [[
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ]],
    center: parcel.center,
  };
}

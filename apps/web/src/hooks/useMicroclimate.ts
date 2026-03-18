/**
 * useMicroclimate — Per-parcel microclimate data with beetle flight risk model.
 *
 * Provides temperature, humidity, soil moisture, wind exposure, frost risk,
 * Growing Degree Days (GDD) accumulation, and beetle swarming prediction
 * for forest parcels in Småland.
 *
 * Beetle biology reference (Ips typographus):
 * - Swarming threshold: daily max temp > 18°C
 * - GDD threshold (base 5°C): ~600 for first flight, ~900 for second generation
 * - Flight distance: 2–5 km typical, up to 40 km under wind
 * - Stressed trees (drought, storm) are 10× more vulnerable
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
// Demo data is always used for now; live mode will integrate SMHI API

// ─── Types ───

export type BeetleRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface ParcelMicroclimate {
  parcelId: string;
  parcelName: string;
  areaHectares: number;
  elevation: number;
  aspect: string;          // e.g. "South-facing slope"
  latitude: number;
  longitude: number;
  sprucePct: number;

  // Current conditions
  currentTemp: number;
  currentHumidity: number;
  currentWindSpeed: number;
  currentWindDirection: string;
  soilMoisture: number;    // percentage 0-100
  soilTemp: number;

  // GDD
  gddCurrent: number;
  gddYearlyTarget: number;
  gdd5YearAvg: number[];   // 12 monthly values
  gddThisYear: number[];   // 12 monthly cumulative values

  // Beetle risk
  beetleRiskLevel: BeetleRiskLevel;
  beetleRiskScore: number; // 0-100
  daysUntilGDD600: number | null;
  daysUntilGDD900: number | null;

  // Frost risk next 7 days
  frostRiskDays: { date: string; minTemp: number; hasFrost: boolean }[];

  // 30-day temp sparkline
  tempHistory30d: { date: string; min: number; max: number; avg: number }[];

  // 14-day forecast
  forecast14d: ForecastDay[];
}

export interface ForecastDay {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  humidity: number;
  windSpeed: number;
  beetleFlightRisk: boolean;
  gddContribution: number;
}

export interface BeetleRiskFactors {
  temperature: number;     // 0-100
  gddProgress: number;     // 0-100
  droughtStress: number;   // 0-100
  recentStorms: number;    // 0-100
  neighborActivity: number; // 0-100
  spruceVulnerability: number; // 0-100
}

export interface BeetleSwarmingPrediction {
  parcelId: string;
  riskTimeline: { date: string; riskScore: number; riskLevel: BeetleRiskLevel }[];
  firstSwarmingWeek: number | null;
  secondGenerationWeek: number | null;
  factors: BeetleRiskFactors;
  generationPrediction: string;
  recommendations: string[];
  historicalAccuracy: number;
}

export interface GDDComparison {
  parcelId: string;
  parcelName: string;
  currentGDD: number;
  fiveYearAvg: number;
  lastYear: number;
  monthlyAccumulation: { month: string; current: number; fiveYearAvg: number; lastYear: number }[];
  threshold600Date: string | null;
  threshold900Date: string | null;
}

export interface UseMicroclimateReturn {
  parcels: ParcelMicroclimate[];
  predictions: BeetleSwarmingPrediction[];
  gddComparisons: GDDComparison[];
  selectedParcelId: string;
  setSelectedParcelId: (id: string) => void;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

// ─── Demo Data Generation ───

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

function generateTempHistory(baseTemp: number, elevation: number): { date: string; min: number; max: number; avg: number }[] {
  const result: { date: string; min: number; max: number; avg: number }[] = [];
  const today = new Date();
  const altAdj = (elevation - 160) * 0.006;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    // Seasonal sine wave + noise
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    const seasonal = baseTemp + 12 * Math.sin((dayOfYear - 80) * Math.PI / 182) - altAdj;
    const noise = (Math.random() - 0.5) * 4;
    const avg = Math.round((seasonal + noise) * 10) / 10;
    const min = Math.round((avg - 3 - Math.random() * 2) * 10) / 10;
    const max = Math.round((avg + 3 + Math.random() * 2) * 10) / 10;
    result.push({ date: d.toISOString().split('T')[0], min, max, avg });
  }
  return result;
}

function generateForecast14d(baseTemp: number, elevation: number): ForecastDay[] {
  const result: ForecastDay[] = [];
  const today = new Date();
  const altAdj = (elevation - 160) * 0.006;
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    const seasonal = baseTemp + 12 * Math.sin((dayOfYear - 80) * Math.PI / 182) - altAdj;
    const noise = (Math.random() - 0.5) * 5;
    const tempMax = Math.round((seasonal + 4 + noise) * 10) / 10;
    const tempMin = Math.round((seasonal - 4 + noise * 0.5) * 10) / 10;
    const precip = Math.random() < 0.3 ? Math.round(Math.random() * 12 * 10) / 10 : 0;
    const humidity = Math.round(55 + Math.random() * 30);
    const windSpeed = Math.round((2 + Math.random() * 6) * 10) / 10;
    const gddContrib = Math.max(0, Math.round(((tempMax + tempMin) / 2 - 5) * 10) / 10);
    result.push({
      date: d.toISOString().split('T')[0],
      tempMin,
      tempMax,
      precipitation: precip,
      humidity,
      windSpeed,
      beetleFlightRisk: tempMax > 18 && precip < 2 && windSpeed < 8,
      gddContribution: gddContrib,
    });
  }
  return result;
}

function generateFrostRisk(_tempHistory: { date: string; min: number }[]): { date: string; minTemp: number; hasFrost: boolean }[] {
  const today = new Date();
  const result: { date: string; minTemp: number; hasFrost: boolean }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    // Frost more likely in spring (March-April)
    const baseLow = 5 * Math.sin((dayOfYear - 80) * Math.PI / 182) - 2;
    const noise = (Math.random() - 0.5) * 6;
    const minTemp = Math.round((baseLow + noise) * 10) / 10;
    result.push({
      date: d.toISOString().split('T')[0],
      minTemp,
      hasFrost: minTemp <= 0,
    });
  }
  return result;
}

function computeGDDMonthly(elevation: number): { current: number[]; fiveYearAvg: number[]; lastYear: number[] } {
  const altAdj = (elevation - 160) * 0.006;
  const baseTemps = [-2.5, -2.8, 0.5, 5.5, 11, 15, 17.5, 16, 11.5, 6.5, 2, -1];
  const currentMonth = new Date().getMonth();

  let cumCurrent = 0;
  let cumAvg = 0;
  let cumLastYear = 0;
  const current: number[] = [];
  const fiveYearAvg: number[] = [];
  const lastYear: number[] = [];

  for (let i = 0; i < 12; i++) {
    const adjTemp = baseTemps[i] - altAdj;
    const effectiveGDD = Math.max(0, adjTemp - 5) * 30;

    // Five-year average
    cumAvg += effectiveGDD;
    fiveYearAvg.push(Math.round(cumAvg));

    // Last year: slightly warmer
    cumLastYear += effectiveGDD * 1.08;
    lastYear.push(Math.round(cumLastYear));

    // Current year: only up to current month
    if (i <= currentMonth) {
      // March 2026 is warmer than normal
      const factor = i === 2 ? 1.3 : i === 1 ? 1.15 : 1.0;
      cumCurrent += effectiveGDD * factor;
    }
    current.push(i <= currentMonth ? Math.round(cumCurrent) : 0);
  }

  return { current, fiveYearAvg, lastYear };
}

function classifyBeetleRisk(gdd: number, maxTemp: number, sprucePct: number, droughtStress: number): { level: BeetleRiskLevel; score: number } {
  let score = 0;

  // GDD contribution (0-35 points)
  if (gdd >= 600) score += 35;
  else if (gdd >= 400) score += 20 + (gdd - 400) / 200 * 15;
  else if (gdd >= 200) score += (gdd - 200) / 200 * 20;

  // Temperature contribution (0-25 points)
  if (maxTemp >= 22) score += 25;
  else if (maxTemp >= 18) score += 15 + (maxTemp - 18) / 4 * 10;
  else if (maxTemp >= 14) score += (maxTemp - 14) / 4 * 15;

  // Spruce vulnerability (0-20 points)
  score += (sprucePct / 100) * 20;

  // Drought stress (0-20 points)
  score += (droughtStress / 100) * 20;

  score = Math.min(100, Math.round(score));

  let level: BeetleRiskLevel;
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'medium';
  else level = 'low';

  return { level, score };
}

interface ParcelConfig {
  id: string;
  name: string;
  area: number;
  elevation: number;
  aspect: string;
  lat: number;
  lng: number;
  sprucePct: number;
  soilMoisture: number;
  droughtStress: number;
  neighborActivity: number;
  recentStorms: number;
}

const DEMO_PARCEL_CONFIGS: ParcelConfig[] = [
  { id: 'p1', name: 'Norra Skogen', area: 42.5, elevation: 210, aspect: 'Sydvästsluttning', lat: 57.19, lng: 14.04, sprucePct: 65, soilMoisture: 42, droughtStress: 35, neighborActivity: 60, recentStorms: 20 },
  { id: 'p2', name: 'Ekbacken', area: 18.3, elevation: 185, aspect: 'Plan mark', lat: 57.30, lng: 13.53, sprucePct: 25, soilMoisture: 58, droughtStress: 10, neighborActivity: 15, recentStorms: 5 },
  { id: 'p3', name: 'Tallmon', area: 67.1, elevation: 290, aspect: 'Nordsluttning', lat: 57.78, lng: 14.16, sprucePct: 20, soilMoisture: 35, droughtStress: 25, neighborActivity: 10, recentStorms: 45 },
  { id: 'p4', name: 'Granudden', area: 31.9, elevation: 230, aspect: 'Sydostsluttning', lat: 57.22, lng: 14.10, sprucePct: 85, soilMoisture: 30, droughtStress: 65, neighborActivity: 85, recentStorms: 40 },
  { id: 'p5', name: 'Björklund', area: 55.0, elevation: 310, aspect: 'Västvästsluttning', lat: 57.65, lng: 14.70, sprucePct: 30, soilMoisture: 65, droughtStress: 5, neighborActivity: 5, recentStorms: 10 },
];

function buildParcelMicroclimate(cfg: ParcelConfig): ParcelMicroclimate {
  const tempHistory = generateTempHistory(7, cfg.elevation);
  const forecast = generateForecast14d(7, cfg.elevation);
  const frostRisk = generateFrostRisk(tempHistory);
  const gdd = computeGDDMonthly(cfg.elevation);
  const currentMonth = new Date().getMonth();
  const gddCurrent = gdd.current[currentMonth];

  const latestTemp = tempHistory[tempHistory.length - 1];
  const { level, score } = classifyBeetleRisk(gddCurrent, latestTemp.max, cfg.sprucePct, cfg.droughtStress);

  // Days until GDD thresholds
  let daysUntilGDD600: number | null = null;
  let daysUntilGDD900: number | null = null;
  if (gddCurrent < 600) {
    // Estimate based on forecast GDD accumulation rate
    const dailyGDD = forecast.reduce((s, f) => s + f.gddContribution, 0) / 14;
    if (dailyGDD > 0) {
      daysUntilGDD600 = Math.round((600 - gddCurrent) / dailyGDD);
      daysUntilGDD900 = Math.round((900 - gddCurrent) / dailyGDD);
    }
  } else if (gddCurrent < 900) {
    const dailyGDD = forecast.reduce((s, f) => s + f.gddContribution, 0) / 14;
    if (dailyGDD > 0) {
      daysUntilGDD900 = Math.round((900 - gddCurrent) / dailyGDD);
    }
  }

  return {
    parcelId: cfg.id,
    parcelName: cfg.name,
    areaHectares: cfg.area,
    elevation: cfg.elevation,
    aspect: cfg.aspect,
    latitude: cfg.lat,
    longitude: cfg.lng,
    sprucePct: cfg.sprucePct,
    currentTemp: latestTemp.avg,
    currentHumidity: Math.round(55 + Math.random() * 25),
    currentWindSpeed: Math.round((2 + Math.random() * 5) * 10) / 10,
    currentWindDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
    soilMoisture: cfg.soilMoisture,
    soilTemp: Math.round((latestTemp.avg * 0.6 + 2) * 10) / 10,
    gddCurrent,
    gddYearlyTarget: 1200,
    gdd5YearAvg: gdd.fiveYearAvg,
    gddThisYear: gdd.current,
    beetleRiskLevel: level,
    beetleRiskScore: score,
    daysUntilGDD600,
    daysUntilGDD900,
    frostRiskDays: frostRisk,
    tempHistory30d: tempHistory,
    forecast14d: forecast,
  };
}

function buildSwarmingPrediction(cfg: ParcelConfig, microclimate: ParcelMicroclimate): BeetleSwarmingPrediction {
  const today = new Date();
  const riskTimeline: { date: string; riskScore: number; riskLevel: BeetleRiskLevel }[] = [];

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dayOfYear = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
    // Simulate increasing risk as season progresses
    const baseRisk = Math.max(0, 15 * Math.sin((dayOfYear - 100) * Math.PI / 120));
    const parcelFactor = (cfg.sprucePct / 100) * 0.5 + (cfg.droughtStress / 100) * 0.3 + (cfg.neighborActivity / 100) * 0.2;
    const score = Math.min(100, Math.round(baseRisk * (1 + parcelFactor) + Math.random() * 10));
    let level: BeetleRiskLevel;
    if (score >= 75) level = 'critical';
    else if (score >= 50) level = 'high';
    else if (score >= 25) level = 'medium';
    else level = 'low';
    riskTimeline.push({ date: d.toISOString().split('T')[0], riskScore: score, riskLevel: level });
  }

  // Estimate swarming weeks
  const currentWeek = Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 86400000));
  let firstSwarmingWeek: number | null = null;
  let secondGenerationWeek: number | null = null;

  if (microclimate.gddCurrent >= 600) {
    firstSwarmingWeek = currentWeek;
  } else if (microclimate.daysUntilGDD600 !== null) {
    firstSwarmingWeek = currentWeek + Math.ceil(microclimate.daysUntilGDD600 / 7);
  }

  if (firstSwarmingWeek !== null) {
    secondGenerationWeek = firstSwarmingWeek + 8; // ~8 weeks for generation development
  }

  const generationPrediction = firstSwarmingWeek
    ? `Första svärmningen förväntas vecka ${firstSwarmingWeek}`
    : 'GDD-ackumulation otillräcklig för svärmning ännu';

  const factors: BeetleRiskFactors = {
    temperature: Math.min(100, Math.round((microclimate.currentTemp / 22) * 100)),
    gddProgress: Math.min(100, Math.round((microclimate.gddCurrent / 600) * 100)),
    droughtStress: cfg.droughtStress,
    recentStorms: cfg.recentStorms,
    neighborActivity: cfg.neighborActivity,
    spruceVulnerability: Math.round(cfg.sprucePct * 1.1),
  };

  const recommendations: string[] = [];
  if (microclimate.beetleRiskLevel === 'critical') {
    recommendations.push('Omedelbar inspektion av granbestånd krävs');
    recommendations.push('Kontakta entreprenör för upparbetning inom 2 veckor');
    recommendations.push('Placera feromonfällor vid beståndskanter');
  } else if (microclimate.beetleRiskLevel === 'high') {
    recommendations.push('Beställ drönarundersökning inom 1 vecka');
    recommendations.push('Inspektera vindexponerade granbestånd');
    recommendations.push('Förbered avverkningsresurser');
  } else if (microclimate.beetleRiskLevel === 'medium') {
    recommendations.push('Övervaka temperaturprognoser dagligen');
    recommendations.push('Kontrollera stormskadade träd');
    recommendations.push('Planera förebyggande gallring');
  } else {
    recommendations.push('Rutinövervakning — inga akuta åtgärder');
    recommendations.push('Kontrollera feromonfällor varannan vecka');
  }

  return {
    parcelId: cfg.id,
    riskTimeline,
    firstSwarmingWeek,
    secondGenerationWeek,
    factors,
    generationPrediction,
    recommendations,
    historicalAccuracy: 87 + Math.round(Math.random() * 8),
  };
}

function buildGDDComparison(cfg: ParcelConfig): GDDComparison {
  const gdd = computeGDDMonthly(cfg.elevation);
  const currentMonth = new Date().getMonth();

  const monthlyAccumulation = MONTH_NAMES.map((name, i) => ({
    month: name,
    current: gdd.current[i],
    fiveYearAvg: gdd.fiveYearAvg[i],
    lastYear: gdd.lastYear[i],
  }));

  // Find threshold dates
  let threshold600Date: string | null = null;
  let threshold900Date: string | null = null;
  for (let i = 0; i < 12; i++) {
    if (gdd.fiveYearAvg[i] >= 600 && !threshold600Date) {
      threshold600Date = `${MONTH_NAMES[i]}`;
    }
    if (gdd.fiveYearAvg[i] >= 900 && !threshold900Date) {
      threshold900Date = `${MONTH_NAMES[i]}`;
    }
  }

  return {
    parcelId: cfg.id,
    parcelName: cfg.name,
    currentGDD: gdd.current[currentMonth],
    fiveYearAvg: gdd.fiveYearAvg[currentMonth],
    lastYear: gdd.lastYear[currentMonth],
    monthlyAccumulation,
    threshold600Date,
    threshold900Date,
  };
}

// ─── Hook ───

export function useMicroclimate(): UseMicroclimateReturn {
  const [selectedParcelId, setSelectedParcelId] = useState('p1');
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const { parcels, predictions, gddComparisons } = useMemo(() => {
    const parcels = DEMO_PARCEL_CONFIGS.map(buildParcelMicroclimate);
    const predictions = DEMO_PARCEL_CONFIGS.map((cfg, i) => buildSwarmingPrediction(cfg, parcels[i]));
    const gddComparisons = DEMO_PARCEL_CONFIGS.map(buildGDDComparison);
    return { parcels, predictions, gddComparisons };

  }, [refreshKey]);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, [refreshKey]);

  return {
    parcels,
    predictions,
    gddComparisons,
    selectedParcelId,
    setSelectedParcelId,
    loading,
    error,
    refresh,
  };
}

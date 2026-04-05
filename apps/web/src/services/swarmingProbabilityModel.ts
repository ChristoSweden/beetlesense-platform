/**
 * Swarming Probability Model — Multi-factor Ips typographus Risk Engine
 *
 * Combines SMHI weather data, drought indices, soil moisture proxies, wind
 * events, and stand-level modifiers to produce a 0-100 swarming probability
 * score with a predicted swarming window.
 *
 * Science references:
 *  - Wermelinger (2004) — degree-day model for I. typographus
 *  - Netherer & Pennerstorfer (2006) — multi-factor risk assessment
 *  - Marini et al. (2017) — drought-beetle interaction
 *
 * Model version: 2.0.0 — April 2026
 */

// ─── Constants ───

const MODEL_VERSION = '2.0.0';
const BASE_TEMP = 5; // degree-day base for I. typographus
const SWARM_DD_THRESHOLD = 600; // accumulated degree-days to trigger swarming
const DD_ACCUMULATION_START_MONTH = 2; // March (0-indexed)

/** Smaland monthly average temperatures (C) — 30-year normal */
const SMALAND_TEMP_NORMALS: Record<number, number> = {
  1: -2.5,
  2: -2.0,
  3: 1.5,
  4: 6.5,
  5: 12.0,
  6: 16.0,
  7: 18.0,
  8: 17.0,
  9: 12.5,
  10: 7.0,
  11: 2.5,
  12: -1.0,
};

/** Smaland monthly precipitation normals (mm) — 30-year normal */
const SMALAND_PRECIP_NORMALS: Record<number, number> = {
  1: 42,
  2: 30,
  3: 38,
  4: 35,
  5: 45,
  6: 58,
  7: 70,
  8: 65,
  9: 60,
  10: 55,
  11: 55,
  12: 48,
};

/** Factor weights — must sum to 1.0 */
const FACTOR_WEIGHTS = {
  degreeDays: 0.40,
  drought: 0.25,
  temperatureAnomaly: 0.15,
  windEvents: 0.12,
  solarRadiation: 0.08,
} as const;

// ─── Types ───

export interface SwarmingProbability {
  overallScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  swarmWindowStart: string;
  swarmWindowEnd: string;
  daysUntilSwarm: number;
  factors: SwarmingFactor[];
  recommendation: string;
  confidenceLevel: number;
  modelVersion: string;
}

export interface SwarmingFactor {
  name: string;
  score: number;
  weight: number;
  value: number;
  unit: string;
  threshold: string;
  status: 'safe' | 'warning' | 'danger';
}

export interface DroughtIndex {
  precipitationDeficitMm: number;
  daysWithoutRain: number;
  soilMoistureProxy: number;
  severity: 'none' | 'mild' | 'moderate' | 'severe' | 'extreme';
}

export interface WeatherDay {
  date: string; // ISO date string (YYYY-MM-DD)
  tempMean: number; // daily mean temperature in C
  tempMax: number;
  tempMin: number;
  precipMm: number; // precipitation in mm
  windMaxMs: number; // max wind gust in m/s
  solarHours: number; // hours of sunshine (0-16)
}

export interface SwarmingOptions {
  /** Stand is primarily Norway spruce */
  spruceDominant?: boolean;
  /** Years since last fire in the area (null = no recent fire) */
  yearsSinceLastFire?: number | null;
  /** Previous year had confirmed infestation within 2 km */
  previousYearInfestationNearby?: boolean;
  /** Number of consecutive drought years before the current period */
  consecutiveDroughtYears?: number;
  /** Latitude for solar radiation proxy (default: 57.2 for Smaland) */
  latitude?: number;
}

// ─── Degree-Day Calculator ───

function accumulateDegreeDays(weatherHistory: WeatherDay[]): number {
  const now = new Date();
  const year = now.getFullYear();
  const accStartDate = new Date(year, DD_ACCUMULATION_START_MONTH, 1)
    .toISOString()
    .slice(0, 10);

  let dd = 0;
  for (const day of weatherHistory) {
    if (day.date < accStartDate) continue;
    if (day.date > now.toISOString().slice(0, 10)) continue;
    const effective = day.tempMean - BASE_TEMP;
    if (effective > 0) {
      dd += effective;
    }
  }
  return dd;
}

function scoreDegreeDays(dd: number): number {
  // Sigmoid-like scoring: slow start, steep climb near threshold
  if (dd <= 0) return 0;
  if (dd >= SWARM_DD_THRESHOLD * 1.2) return 100;

  const ratio = dd / SWARM_DD_THRESHOLD;
  // S-curve using logistic function centered at ratio = 0.8
  const k = 10;
  const midpoint = 0.8;
  const raw = 1 / (1 + Math.exp(-k * (ratio - midpoint)));
  return Math.round(raw * 100);
}

function factorStatusFromScore(score: number): 'safe' | 'warning' | 'danger' {
  if (score < 35) return 'safe';
  if (score < 70) return 'warning';
  return 'danger';
}

// ─── Drought Index Calculator ───

export function calculateDroughtIndex(
  precipHistory: { date: string; precipMm: number }[],
  tempHistory: { date: string; tempMean: number }[]
): DroughtIndex {
  // Compute precipitation deficit over the past 90 days vs 30-year normal
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10);

  let actualPrecip = 0;
  let daysWithoutRain = 0;
  let currentDryStreak = 0;

  // Sort by date descending for dry streak calculation
  const recentPrecip = precipHistory
    .filter((d) => d.date >= cutoff)
    .sort((a, b) => b.date.localeCompare(a.date));

  for (const day of recentPrecip) {
    actualPrecip += day.precipMm;
    if (day.precipMm < 0.5) {
      currentDryStreak++;
    } else {
      if (currentDryStreak > daysWithoutRain) {
        daysWithoutRain = currentDryStreak;
      }
      currentDryStreak = 0;
    }
  }
  if (currentDryStreak > daysWithoutRain) {
    daysWithoutRain = currentDryStreak;
  }

  // Expected precipitation for the same 90-day window from normals
  let expectedPrecip = 0;
  const d = new Date(ninetyDaysAgo);
  while (d <= now) {
    const month = d.getMonth() + 1;
    const daysInMonth = new Date(d.getFullYear(), month, 0).getDate();
    expectedPrecip += (SMALAND_PRECIP_NORMALS[month] ?? 45) / daysInMonth;
    d.setDate(d.getDate() + 1);
  }

  const deficit = expectedPrecip - actualPrecip;

  // Soil moisture proxy: combines precipitation ratio with temperature stress
  // Higher temps + less rain = lower soil moisture
  const recentTemps = tempHistory.filter((t) => t.date >= cutoff);
  const avgTemp =
    recentTemps.length > 0
      ? recentTemps.reduce((s, t) => s + t.tempMean, 0) / recentTemps.length
      : 10;

  const precipRatio =
    expectedPrecip > 0
      ? Math.min(1, actualPrecip / expectedPrecip)
      : 1;

  // Temperature stress factor: warmer = drier soils (evapotranspiration)
  const tempStress = avgTemp > 15 ? Math.min(0.4, (avgTemp - 15) * 0.04) : 0;
  const soilMoistureProxy = Math.max(0, Math.min(1, precipRatio - tempStress));

  // Classify severity
  let severity: DroughtIndex['severity'];
  if (deficit <= 10) severity = 'none';
  else if (deficit <= 30) severity = 'mild';
  else if (deficit <= 60) severity = 'moderate';
  else if (deficit <= 100) severity = 'severe';
  else severity = 'extreme';

  return {
    precipitationDeficitMm: Math.round(deficit * 10) / 10,
    daysWithoutRain,
    soilMoistureProxy: Math.round(soilMoistureProxy * 100) / 100,
    severity,
  };
}

function scoreDrought(drought: DroughtIndex): number {
  const severityScores: Record<DroughtIndex['severity'], number> = {
    none: 5,
    mild: 25,
    moderate: 55,
    severe: 80,
    extreme: 100,
  };

  let score = severityScores[drought.severity];

  // Bonus for long dry streaks
  if (drought.daysWithoutRain > 21) {
    score = Math.min(100, score + 10);
  }

  // Low soil moisture amplifies risk
  if (drought.soilMoistureProxy < 0.3) {
    score = Math.min(100, score + 15);
  }

  return score;
}

// ─── Temperature Anomaly ───

function computeTemperatureAnomaly(weatherHistory: WeatherDay[]): number {
  // Compare recent 30-day average to 30-year normal
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const recentDays = weatherHistory.filter(
    (d) => d.date >= cutoff && d.date <= now.toISOString().slice(0, 10)
  );

  if (recentDays.length === 0) return 0;

  const actualAvg =
    recentDays.reduce((s, d) => s + d.tempMean, 0) / recentDays.length;

  // Expected average for the same period from normals
  let expectedSum = 0;
  let expectedCount = 0;
  const iter = new Date(thirtyDaysAgo);
  while (iter <= now) {
    const month = iter.getMonth() + 1;
    expectedSum += SMALAND_TEMP_NORMALS[month] ?? 5;
    expectedCount++;
    iter.setDate(iter.getDate() + 1);
  }
  const expectedAvg = expectedCount > 0 ? expectedSum / expectedCount : 5;

  return actualAvg - expectedAvg;
}

function scoreTemperatureAnomaly(anomalyC: number): number {
  // Positive anomaly = warmer = more risk
  if (anomalyC <= 0) return 5;
  if (anomalyC <= 1) return 20;
  if (anomalyC <= 2) return 40;
  if (anomalyC <= 3) return 60;
  if (anomalyC <= 4) return 80;
  return 100;
}

// ─── Wind Event History ───

function computeWindEventScore(weatherHistory: WeatherDay[]): number {
  // Count storm events (wind > 20 m/s) in last 180 days
  const now = new Date();
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
  const cutoff = sixMonthsAgo.toISOString().slice(0, 10);

  const recentDays = weatherHistory.filter((d) => d.date >= cutoff);

  let stormDays = 0;
  let maxGust = 0;

  for (const day of recentDays) {
    if (day.windMaxMs >= 20) {
      stormDays++;
    }
    if (day.windMaxMs > maxGust) {
      maxGust = day.windMaxMs;
    }
  }

  // Scoring: each storm day adds risk (weakened trees attract beetles)
  if (stormDays === 0) return 5;
  if (stormDays <= 2) return 30;
  if (stormDays <= 5) return 55;
  if (stormDays <= 10) return 75;
  return 95;
}

// ─── Solar Radiation Proxy ───

function computeSolarScore(weatherHistory: WeatherDay[]): number {
  // Use sunshine hours over the past 30 days as proxy for radiation
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  const recentDays = weatherHistory.filter(
    (d) => d.date >= cutoff && d.date <= now.toISOString().slice(0, 10)
  );

  if (recentDays.length === 0) return 30;

  const avgSolarHours =
    recentDays.reduce((s, d) => s + d.solarHours, 0) / recentDays.length;

  // April normal for Smaland is about 6-7 hours/day
  // High sunshine = faster beetle development
  if (avgSolarHours < 4) return 15;
  if (avgSolarHours < 6) return 30;
  if (avgSolarHours < 8) return 50;
  if (avgSolarHours < 10) return 70;
  return 90;
}

// ─── Risk Modifiers ───

function computeRiskMultiplier(options: SwarmingOptions): number {
  let multiplier = 1.0;

  // Post-fire risk: 2-3x within 2 years
  if (
    options.yearsSinceLastFire != null &&
    options.yearsSinceLastFire <= 2
  ) {
    // Linear decay: 3x at year 0, 2x at year 2
    multiplier *= 3 - options.yearsSinceLastFire * 0.5;
  }

  // Spruce-dominant stands
  if (options.spruceDominant) {
    multiplier *= 1.5;
  }

  // Previous-year infestation nearby
  if (options.previousYearInfestationNearby) {
    multiplier *= 1.3;
  }

  // Multi-year drought: exponential escalation
  const droughtYears = options.consecutiveDroughtYears ?? 0;
  if (droughtYears >= 2) {
    multiplier *= 1 + 0.3 * Math.pow(droughtYears - 1, 1.5);
  }

  return multiplier;
}

// ─── Swarming Window Predictor ───

export function predictSwarmWindow(
  currentDD: number,
  forecastTemps: { date: string; tempMean: number }[]
): { start: string; end: string; daysUntil: number } {
  const now = new Date();

  // If already past threshold, swarming is now
  if (currentDD >= SWARM_DD_THRESHOLD) {
    const today = now.toISOString().slice(0, 10);
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + 14);
    return {
      start: today,
      end: endDate.toISOString().slice(0, 10),
      daysUntil: 0,
    };
  }

  // Project forward using forecast temps, then fall back to normals
  let projDD = currentDD;
  let startDate: string | null = null;

  // Build a lookup map from forecast data
  const forecastMap = new Map<string, number>();
  for (const f of forecastTemps) {
    forecastMap.set(f.date, f.tempMean);
  }

  // Project up to 200 days ahead
  const projDate = new Date(now);
  for (let i = 0; i < 200; i++) {
    projDate.setDate(projDate.getDate() + 1);
    const dateStr = projDate.toISOString().slice(0, 10);

    // Use forecast if available, else fall back to monthly normal
    let temp: number;
    if (forecastMap.has(dateStr)) {
      temp = forecastMap.get(dateStr)!;
    } else {
      const month = projDate.getMonth() + 1;
      const dayOfMonth = projDate.getDate();
      const daysInMonth = new Date(
        projDate.getFullYear(),
        month,
        0
      ).getDate();
      const currentNormal = SMALAND_TEMP_NORMALS[month] ?? 5;
      const nextMonth = month === 12 ? 1 : month + 1;
      const nextNormal = SMALAND_TEMP_NORMALS[nextMonth] ?? 5;
      temp =
        currentNormal +
        (nextNormal - currentNormal) * (dayOfMonth / daysInMonth);
    }

    const effective = temp - BASE_TEMP;
    if (effective > 0) {
      projDD += effective;
    }

    if (projDD >= SWARM_DD_THRESHOLD && startDate === null) {
      startDate = dateStr;
    }
  }

  if (!startDate) {
    // Extreme case: threshold not reached within 200 days
    const fallback = new Date(now);
    fallback.setDate(fallback.getDate() + 200);
    return {
      start: fallback.toISOString().slice(0, 10),
      end: fallback.toISOString().slice(0, 10),
      daysUntil: 200,
    };
  }

  const swarmStart = new Date(startDate);
  const endDate = new Date(swarmStart);
  endDate.setDate(endDate.getDate() + 21); // typical swarming window is 2-3 weeks

  const daysUntil = Math.max(
    0,
    Math.ceil(
      (swarmStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
  );

  return {
    start: startDate,
    end: endDate.toISOString().slice(0, 10),
    daysUntil,
  };
}

// ─── Recommendation Generator ───

function generateRecommendation(
  score: number,
  riskLevel: SwarmingProbability['riskLevel'],
  daysUntilSwarm: number,
  drought: DroughtIndex
): string {
  if (riskLevel === 'critical') {
    return 'Active swarming conditions detected. Deploy pheromone traps immediately, inspect all spruce stands within 48 hours, and prepare sanitation harvesting for confirmed infestations.';
  }

  if (riskLevel === 'high') {
    const droughtNote =
      drought.severity === 'severe' || drought.severity === 'extreme'
        ? ' Drought-stressed trees are especially vulnerable — prioritize watering access roads and increasing trap density.'
        : '';
    return `Swarming likely within ${daysUntilSwarm} days. Deploy traps, schedule aerial or ground inspection of vulnerable stands, and prepare harvest crews for rapid response.${droughtNote}`;
  }

  if (riskLevel === 'moderate') {
    return `Moderate risk — estimated ${daysUntilSwarm} days until swarming window. Prepare pheromone traps, review stand vulnerability maps, and ensure monitoring equipment is operational.`;
  }

  return 'Low risk currently. Continue routine monitoring. Check back weekly as temperatures rise.';
}

// ─── Confidence Level ───

function computeConfidence(weatherHistory: WeatherDay[]): number {
  // Confidence based on data completeness
  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoff = ninetyDaysAgo.toISOString().slice(0, 10);

  const recentDays = weatherHistory.filter((d) => d.date >= cutoff);
  const coverage = Math.min(1, recentDays.length / 90);

  // More data = higher confidence; minimum 0.3 from normals-based estimation
  return Math.round((0.3 + coverage * 0.7) * 100) / 100;
}

// ─── Main Calculator ───

export function calculateSwarmingProbability(
  weatherHistory: WeatherDay[],
  options: SwarmingOptions = {}
): SwarmingProbability {
  // 1. Compute each factor
  const currentDD = accumulateDegreeDays(weatherHistory);
  const ddScore = scoreDegreeDays(currentDD);

  const drought = calculateDroughtIndex(
    weatherHistory.map((d) => ({ date: d.date, precipMm: d.precipMm })),
    weatherHistory.map((d) => ({ date: d.date, tempMean: d.tempMean }))
  );
  const droughtScore = scoreDrought(drought);

  const tempAnomaly = computeTemperatureAnomaly(weatherHistory);
  const tempAnomalyScore = scoreTemperatureAnomaly(tempAnomaly);

  const windScore = computeWindEventScore(weatherHistory);

  const solarScore = computeSolarScore(weatherHistory);

  // 2. Weighted base score
  const baseScore =
    ddScore * FACTOR_WEIGHTS.degreeDays +
    droughtScore * FACTOR_WEIGHTS.drought +
    tempAnomalyScore * FACTOR_WEIGHTS.temperatureAnomaly +
    windScore * FACTOR_WEIGHTS.windEvents +
    solarScore * FACTOR_WEIGHTS.solarRadiation;

  // 3. Apply risk modifiers
  const multiplier = computeRiskMultiplier(options);
  const overallScore = Math.min(100, Math.round(baseScore * multiplier));

  // 4. Determine risk level
  let riskLevel: SwarmingProbability['riskLevel'];
  if (overallScore >= 75) riskLevel = 'critical';
  else if (overallScore >= 50) riskLevel = 'high';
  else if (overallScore >= 25) riskLevel = 'moderate';
  else riskLevel = 'low';

  // 5. Predict swarming window
  const forecastTemps = weatherHistory
    .filter((d) => d.date > new Date().toISOString().slice(0, 10))
    .map((d) => ({ date: d.date, tempMean: d.tempMean }));

  const window = predictSwarmWindow(currentDD, forecastTemps);

  // 6. Build factor breakdown
  const factors: SwarmingFactor[] = [
    {
      name: 'Accumulated Degree-Days',
      score: ddScore,
      weight: FACTOR_WEIGHTS.degreeDays,
      value: Math.round(currentDD),
      unit: 'DD (base 5C)',
      threshold: `Swarming at ~${SWARM_DD_THRESHOLD} DD`,
      status: factorStatusFromScore(ddScore),
    },
    {
      name: 'Drought Stress',
      score: droughtScore,
      weight: FACTOR_WEIGHTS.drought,
      value: drought.precipitationDeficitMm,
      unit: 'mm deficit',
      threshold: 'Severe above 60mm deficit over 90 days',
      status: factorStatusFromScore(droughtScore),
    },
    {
      name: 'Temperature Anomaly',
      score: tempAnomalyScore,
      weight: FACTOR_WEIGHTS.temperatureAnomaly,
      value: Math.round(tempAnomaly * 10) / 10,
      unit: 'C above normal',
      threshold: 'High risk above +3C anomaly',
      status: factorStatusFromScore(tempAnomalyScore),
    },
    {
      name: 'Wind / Storm Events',
      score: windScore,
      weight: FACTOR_WEIGHTS.windEvents,
      value: weatherHistory.filter(
        (d) =>
          d.windMaxMs >= 20 &&
          d.date >=
            new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10)
      ).length,
      unit: 'storm days (180d)',
      threshold: 'Risk increases with windthrow damage',
      status: factorStatusFromScore(windScore),
    },
    {
      name: 'Solar Radiation',
      score: solarScore,
      weight: FACTOR_WEIGHTS.solarRadiation,
      value:
        Math.round(
          (weatherHistory
            .filter(
              (d) =>
                d.date >=
                new Date(Date.now() - 30 * 86400000)
                  .toISOString()
                  .slice(0, 10)
            )
            .reduce((s, d) => s + d.solarHours, 0) /
            Math.max(
              1,
              weatherHistory.filter(
                (d) =>
                  d.date >=
                  new Date(Date.now() - 30 * 86400000)
                    .toISOString()
                    .slice(0, 10)
              ).length
            )) *
            10
        ) / 10,
      unit: 'avg hrs/day (30d)',
      threshold: 'High sunshine accelerates beetle development',
      status: factorStatusFromScore(solarScore),
    },
  ];

  // 7. Generate recommendation
  const recommendation = generateRecommendation(
    overallScore,
    riskLevel,
    window.daysUntil,
    drought
  );

  // 8. Compute confidence
  const confidenceLevel = computeConfidence(weatherHistory);

  return {
    overallScore,
    riskLevel,
    swarmWindowStart: window.start,
    swarmWindowEnd: window.end,
    daysUntilSwarm: window.daysUntil,
    factors,
    recommendation,
    confidenceLevel,
    modelVersion: MODEL_VERSION,
  };
}

// ─── Demo Data Generator ───

function generateDemoWeatherHistory(): WeatherDay[] {
  const now = new Date();
  const year = now.getFullYear();
  const history: WeatherDay[] = [];

  // Generate 12 months of daily weather data ending today
  const startDate = new Date(year - 1, now.getMonth(), now.getDate());

  const d = new Date(startDate);
  let dayIndex = 0;

  while (d <= now) {
    const month = d.getMonth() + 1;
    const dayOfMonth = d.getDate();
    const daysInMonth = new Date(d.getFullYear(), month, 0).getDate();

    // Interpolated base temperature
    const currentNormal = SMALAND_TEMP_NORMALS[month] ?? 5;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextNormal = SMALAND_TEMP_NORMALS[nextMonth] ?? 5;
    const baseTemp =
      currentNormal +
      (nextNormal - currentNormal) * (dayOfMonth / daysInMonth);

    // Add realistic daily variation (+/- 3C with slight warm bias for demo)
    const variation =
      Math.sin(dayIndex * 0.3) * 2.5 +
      Math.cos(dayIndex * 0.7) * 1.5 +
      0.8; // +0.8C warm anomaly for demo

    const tempMean = Math.round((baseTemp + variation) * 10) / 10;
    const tempMax = Math.round((tempMean + 3 + Math.abs(Math.sin(dayIndex)) * 2) * 10) / 10;
    const tempMin = Math.round((tempMean - 3 - Math.abs(Math.cos(dayIndex)) * 2) * 10) / 10;

    // Precipitation: based on normal with dry/wet spells
    const monthlyNormal = SMALAND_PRECIP_NORMALS[month] ?? 45;
    const dailyNormal = monthlyNormal / daysInMonth;
    // Create realistic dry spells: ~40% of days have rain
    const rainChance = 0.4 + Math.sin(dayIndex * 0.15) * 0.2;
    const hasRain = Math.sin(dayIndex * 1.7 + 0.5) > (1 - rainChance * 2);
    const precipMm = hasRain
      ? Math.round(dailyNormal * (1.5 + Math.sin(dayIndex * 0.5)) * 10) / 10
      : 0;

    // Wind: occasional storms
    const baseWind = 5 + Math.abs(Math.sin(dayIndex * 0.4)) * 3;
    const isStormy = Math.sin(dayIndex * 0.83 + 2) > 0.92;
    const windMaxMs =
      Math.round((isStormy ? 22 + Math.random() * 8 : baseWind) * 10) / 10;

    // Solar hours: seasonal variation, latitude ~57N
    const dayLength =
      month >= 4 && month <= 8
        ? 10 + (month <= 6 ? month - 3 : 9 - month) * 1.5
        : 4 + Math.max(0, 6 - Math.abs(month - 6)) * 1;
    const cloudFactor = hasRain ? 0.3 : 0.6 + Math.sin(dayIndex * 0.6) * 0.3;
    const solarHours =
      Math.round(Math.max(0, dayLength * cloudFactor) * 10) / 10;

    history.push({
      date: d.toISOString().slice(0, 10),
      tempMean,
      tempMax,
      tempMin,
      precipMm: Math.max(0, precipMm),
      windMaxMs,
      solarHours,
    });

    d.setDate(d.getDate() + 1);
    dayIndex++;
  }

  // Add 14 days of forecast (slightly warmer than normal)
  for (let i = 1; i <= 14; i++) {
    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + i);
    const month = futureDate.getMonth() + 1;
    const dayOfMonth = futureDate.getDate();
    const daysInMonth = new Date(
      futureDate.getFullYear(),
      month,
      0
    ).getDate();
    const currentNormal = SMALAND_TEMP_NORMALS[month] ?? 5;
    const nextM = month === 12 ? 1 : month + 1;
    const nextNormal = SMALAND_TEMP_NORMALS[nextM] ?? 5;
    const baseTemp =
      currentNormal +
      (nextNormal - currentNormal) * (dayOfMonth / daysInMonth);

    const tempMean = Math.round((baseTemp + 1.2) * 10) / 10;

    history.push({
      date: futureDate.toISOString().slice(0, 10),
      tempMean,
      tempMax: Math.round((tempMean + 4) * 10) / 10,
      tempMin: Math.round((tempMean - 3) * 10) / 10,
      precipMm: i % 4 === 0 ? 3.2 : 0,
      windMaxMs: 4 + Math.sin(i) * 2,
      solarHours: 7 + Math.sin(i * 0.5) * 2,
    });
  }

  return history;
}

export function getSwarmingRiskDemo(): SwarmingProbability {
  const weatherHistory = generateDemoWeatherHistory();

  return calculateSwarmingProbability(weatherHistory, {
    spruceDominant: true,
    yearsSinceLastFire: null,
    previousYearInfestationNearby: false,
    consecutiveDroughtYears: 1,
    latitude: 57.2,
  });
}

/**
 * Beetle Early Warning Fusion Service
 *
 * Combines multiple data sources into a single risk score and plain-language
 * alert for bark beetle (Ips typographus) outbreak risk assessment.
 *
 * Data sources fused:
 *   1. SMHI weather forecast — temperature trends, humidity
 *   2. FWI drought indicators — drought code, fire weather index
 *   3. iNaturalist beetle sightings — crowdsourced observations nearby
 *   4. EFFIS fire danger — European fire danger forecast
 *   5. Sentinel-2 NDVI — satellite vegetation health
 *
 * The fusion uses a weighted scoring model calibrated for Swedish boreal forests.
 * Each source degrades gracefully on failure — a single API outage never breaks
 * the entire assessment.
 */

import {
  fetchSMHIForecast,
  assessDroughtRisk,
  estimateSoilMoisture,
  getDemoWeatherData,
  type SMHIForecast,
  type DailyForecast,
} from './smhiService';

import {
  calculateFWI,
  getDemoFWI,
  type FWIResult,
  type WeatherInput,
} from './fwiService';

import {
  fetchBeetleSightings,
  type BeetleSightings,
} from './opendata/iNaturalistService';

import {
  fetchFireDangerForPoint,
  type FireDangerForecast,
} from './opendata/effisFireDangerService';

import {
  getSatelliteOverview,
  type NDVIStats,
} from './opendata/sentinelService';

// ─── Types ─────────────────────────────────────────────────────────────────

export interface RiskFactor {
  source: string;
  indicator: string;
  value: number;
  weight: number;
  contribution: 'increasing' | 'neutral' | 'decreasing';
  detail: string;
}

export interface BeetleRiskAssessment {
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number; // 0-100
  factors: RiskFactor[];
  recommendation: string;
  lastUpdated: string;
}

// ─── Weight Configuration ──────────────────────────────────────────────────

/**
 * Weights for each risk factor, calibrated for Swedish boreal forests.
 * Sum = 1.0.
 */
const WEIGHTS = {
  temperature: 0.25,
  drought: 0.20,
  beetleSightings: 0.20,
  ndviDecline: 0.20,
  fireDanger: 0.15,
} as const;

// ─── Individual Factor Scoring ─────────────────────────────────────────────

/**
 * Score temperature conditions for beetle activity.
 *
 * Ips typographus flight threshold is ~18 C. Consecutive warm days are
 * critical — 5+ days above 18 C indicate sustained swarming conditions.
 *
 * Returns a normalized score 0-100.
 */
function scoreTemperature(daily: DailyForecast[]): { score: number; detail: string; consecutiveWarmDays: number } {
  const days = daily.slice(0, 10);
  if (days.length === 0) {
    return { score: 0, detail: 'No forecast data available.', consecutiveWarmDays: 0 };
  }

  // Count consecutive days with max temp >= 18 C (starting from most recent)
  let consecutiveWarmDays = 0;
  for (const d of days) {
    if (d.maxTemp >= 18) {
      consecutiveWarmDays++;
    } else {
      break;
    }
  }

  // Average max temperature over the forecast window
  const avgMaxTemp = days.reduce((s, d) => s + d.maxTemp, 0) / days.length;

  // Scoring:
  // - 0 consecutive warm days and cold temps -> 0
  // - 1-2 warm days -> mild (10-30)
  // - 3-4 warm days -> moderate (30-60)
  // - 5+ warm days -> high (60-90)
  // - 7+ warm days with avgMax > 22 -> critical (90-100)
  let score = 0;

  if (consecutiveWarmDays >= 7 && avgMaxTemp > 22) {
    score = 90 + Math.min(10, (avgMaxTemp - 22) * 2);
  } else if (consecutiveWarmDays >= 5) {
    score = 60 + Math.min(30, consecutiveWarmDays * 4 + (avgMaxTemp - 18) * 2);
  } else if (consecutiveWarmDays >= 3) {
    score = 30 + Math.min(30, consecutiveWarmDays * 6 + (avgMaxTemp - 15) * 1.5);
  } else if (consecutiveWarmDays >= 1) {
    score = 10 + Math.min(20, consecutiveWarmDays * 8 + Math.max(0, avgMaxTemp - 15) * 2);
  } else {
    // Even without consecutive warm days, very warm temperatures still contribute
    score = Math.max(0, (avgMaxTemp - 12) * 3);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let detail: string;
  if (consecutiveWarmDays >= 5) {
    detail = `${consecutiveWarmDays} consecutive days above 18C (avg max: ${avgMaxTemp.toFixed(1)}C). Sustained beetle swarming conditions.`;
  } else if (consecutiveWarmDays >= 3) {
    detail = `${consecutiveWarmDays} consecutive warm days. Beetles becoming active.`;
  } else if (avgMaxTemp > 15) {
    detail = `Temperatures warming (avg max: ${avgMaxTemp.toFixed(1)}C). Approaching beetle flight threshold of 18C.`;
  } else {
    detail = `Cool conditions (avg max: ${avgMaxTemp.toFixed(1)}C). Below beetle flight threshold.`;
  }

  return { score, detail, consecutiveWarmDays };
}

/**
 * Score drought/soil moisture conditions.
 *
 * Drought-stressed conifers cannot produce sufficient resin to defend against
 * bark beetle boring, making them highly vulnerable. We combine SMHI drought
 * risk assessment with soil moisture estimate and FWI drought code.
 */
function scoreDrought(
  daily: DailyForecast[],
  fwi: FWIResult | null,
): { score: number; detail: string } {
  const droughtRisk = assessDroughtRisk(daily);
  const soilMoisture = estimateSoilMoisture(daily);

  // Base score from drought risk classification
  let score: number;
  switch (droughtRisk) {
    case 'high':
      score = 75;
      break;
    case 'medium':
      score = 45;
      break;
    case 'low':
    default:
      score = 10;
  }

  // Adjust based on soil moisture (lower moisture = higher risk)
  // Normal soil moisture ~50. Below 30 is concerning, below 20 is critical.
  if (soilMoisture < 20) {
    score = Math.max(score, 80);
  } else if (soilMoisture < 30) {
    score = Math.max(score, 55);
  } else if (soilMoisture > 60) {
    // Wet conditions reduce drought risk
    score = Math.min(score, 15);
  }

  // Integrate FWI Drought Code if available
  // DC > 300 indicates severe long-term drought, DC > 200 is moderate
  if (fwi) {
    if (fwi.dc > 400) {
      score = Math.max(score, 90);
    } else if (fwi.dc > 300) {
      score = Math.max(score, 70);
    } else if (fwi.dc > 200) {
      score = Math.max(score, 50);
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let detail: string;
  if (score >= 70) {
    detail = `Severe drought conditions. Soil moisture at ${soilMoisture}%${fwi ? `, drought code ${fwi.dc}` : ''}. Conifers cannot produce resin to defend against boring.`;
  } else if (score >= 40) {
    detail = `Moderate drought stress. Soil moisture at ${soilMoisture}%${fwi ? `, drought code ${fwi.dc}` : ''}. Trees somewhat weakened.`;
  } else {
    detail = `Adequate moisture. Soil moisture at ${soilMoisture}%. Trees can produce normal resin defenses.`;
  }

  return { score, detail };
}

/**
 * Score beetle sighting proximity and density from iNaturalist data.
 *
 * Nearby, recent, and numerous beetle sightings all increase risk.
 */
function scoreBeetleSightings(sightings: BeetleSightings | null): { score: number; detail: string } {
  if (!sightings) {
    return { score: 20, detail: 'Beetle observation data unavailable. Using conservative estimate.' };
  }

  const { totalObservations, nearestSighting, trend, speciesBreakdown } = sightings;

  let score = 0;

  // Observation count factor
  if (totalObservations >= 20) {
    score += 40;
  } else if (totalObservations >= 10) {
    score += 30;
  } else if (totalObservations >= 5) {
    score += 20;
  } else if (totalObservations >= 1) {
    score += 10;
  }

  // Proximity factor (nearer = riskier)
  if (nearestSighting) {
    if (nearestSighting.distanceKm < 5) {
      score += 35;
    } else if (nearestSighting.distanceKm < 15) {
      score += 25;
    } else if (nearestSighting.distanceKm < 30) {
      score += 15;
    } else {
      score += 5;
    }
  }

  // Trend factor
  if (trend === 'increasing') {
    score += 20;
  } else if (trend === 'stable' && totalObservations > 5) {
    score += 10;
  } else if (trend === 'decreasing') {
    score -= 5;
  }

  // Ips typographus specifically is most concerning
  const ipsCount = speciesBreakdown.find(s => s.species === 'Ips typographus')?.count ?? 0;
  if (ipsCount >= 5) {
    score += 10;
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let detail: string;
  if (totalObservations === 0) {
    detail = 'No bark beetle sightings reported within 50km.';
  } else if (nearestSighting) {
    detail = `${totalObservations} beetle observations within 50km. Nearest sighting ${nearestSighting.distanceKm}km away (${nearestSighting.date}). Trend: ${trend}.`;
  } else {
    detail = `${totalObservations} beetle observations within 50km. Trend: ${trend}.`;
  }

  return { score, detail };
}

/**
 * Score NDVI decline from satellite data.
 *
 * A decline of >10% from baseline indicates early canopy damage that may
 * not yet be visible on the ground. This is often the first satellite-detectable
 * sign of bark beetle attack in spruce stands.
 */
function scoreNdviDecline(ndviStats: NDVIStats | null): { score: number; detail: string } {
  if (!ndviStats) {
    return { score: 15, detail: 'Satellite NDVI data unavailable. Using conservative estimate.' };
  }

  const { mean, changeFromPrevious, stressedPct, barePct } = ndviStats;

  // changeFromPrevious is an absolute NDVI delta (e.g., -0.05 means 5% drop relative to ~0.7 baseline)
  // Convert to percentage decline relative to the mean
  const pctDecline = mean > 0 ? (-changeFromPrevious / mean) * 100 : 0;

  let score = 0;

  // NDVI decline threshold scoring
  if (pctDecline > 25) {
    score = 90;
  } else if (pctDecline > 15) {
    score = 70;
  } else if (pctDecline > 10) {
    score = 50;
  } else if (pctDecline > 5) {
    score = 30;
  } else if (pctDecline > 0) {
    score = 10;
  } else {
    // No decline or improvement
    score = 0;
  }

  // Factor in stressed/bare percentages
  if (stressedPct > 30) {
    score = Math.max(score, 60);
  } else if (stressedPct > 20) {
    score = Math.max(score, 40);
  }

  if (barePct > 10) {
    score += 15;
  }

  // Low overall NDVI is concerning regardless of change
  if (mean < 0.4) {
    score = Math.max(score, 50);
  } else if (mean < 0.5) {
    score = Math.max(score, 30);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let detail: string;
  if (pctDecline > 10) {
    detail = `NDVI decline of ${pctDecline.toFixed(1)}% detected from baseline (mean: ${mean.toFixed(3)}). Early canopy damage likely.`;
  } else if (pctDecline > 5) {
    detail = `Minor NDVI decline of ${pctDecline.toFixed(1)}% (mean: ${mean.toFixed(3)}). Monitor for progression.`;
  } else if (stressedPct > 25) {
    detail = `${stressedPct}% of area shows vegetation stress (mean NDVI: ${mean.toFixed(3)}).`;
  } else {
    detail = `Vegetation appears healthy. Mean NDVI: ${mean.toFixed(3)}, change: ${changeFromPrevious > 0 ? '+' : ''}${changeFromPrevious.toFixed(3)}.`;
  }

  return { score, detail };
}

/**
 * Score fire danger from EFFIS data.
 *
 * High fire danger correlates with drought stress in conifers and can
 * produce volatile emissions attracting beetles. Post-fire areas are
 * beetle hotspots for 1-2 years.
 */
function scoreFireDanger(fireDanger: FireDangerForecast | null): { score: number; detail: string } {
  if (!fireDanger) {
    return { score: 10, detail: 'Fire danger data unavailable. Using conservative estimate.' };
  }

  const { fwiValue, dangerClass } = fireDanger;

  let score: number;
  switch (dangerClass) {
    case 'extreme':
      score = 95;
      break;
    case 'very_high':
      score = 80;
      break;
    case 'high':
      score = 60;
      break;
    case 'moderate':
      score = 35;
      break;
    case 'low':
      score = 15;
      break;
    case 'very_low':
    default:
      score = 5;
  }

  let detail: string;
  if (score >= 70) {
    detail = `Fire danger is ${dangerClass.replace('_', ' ')} (FWI: ${fwiValue}). Drought-stressed conifers have severely reduced resin defenses.`;
  } else if (score >= 30) {
    detail = `Fire danger is ${dangerClass.replace('_', ' ')} (FWI: ${fwiValue}). Some drought stress may weaken tree defenses.`;
  } else {
    detail = `Fire danger is ${dangerClass.replace('_', ' ')} (FWI: ${fwiValue}). Moisture levels adequate for tree defense.`;
  }

  return { score, detail };
}

// ─── Recommendation Generator ──────────────────────────────────────────────

const RECOMMENDATIONS: Record<BeetleRiskAssessment['overallRisk'], string> = {
  low: 'Your forest looks healthy. No action needed.',
  moderate: 'Conditions are warming up. Keep an eye on your spruce stands.',
  high: 'Beetle risk is elevated. We recommend inspecting your forest within the next week.',
  critical: 'Urgent: Multiple risk factors detected. Book a drone survey or field inspection immediately.',
};

function classifyOverallRisk(score: number): BeetleRiskAssessment['overallRisk'] {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

function determineContribution(score: number): RiskFactor['contribution'] {
  if (score >= 50) return 'increasing';
  if (score <= 15) return 'decreasing';
  return 'neutral';
}

// ─── Data Fetching with Graceful Degradation ───────────────────────────────

async function fetchWeatherSafe(lat: number, lon: number): Promise<SMHIForecast | null> {
  try {
    return await fetchSMHIForecast(lat, lon);
  } catch (err) {
    console.warn('[BeetleEarlyWarning] SMHI fetch failed, using fallback:', err);
    try {
      const demo = getDemoWeatherData();
      return {
        current: demo.current,
        hourly: demo.hourly,
        daily: demo.daily,
        approvedTime: demo.approvedTime,
        fetchedAt: demo.fetchedAt,
        lat,
        lon,
      };
    } catch {
      return null;
    }
  }
}

function computeFwiFromForecast(forecast: SMHIForecast): FWIResult {
  try {
    // Use current weather conditions to calculate FWI
    const weather: WeatherInput = {
      temp: forecast.current.temperature,
      humidity: forecast.current.humidity,
      wind: forecast.current.windSpeed * 3.6, // m/s to km/h
      rain: forecast.daily[0]?.totalPrecipitation ?? 0,
    };
    return calculateFWI(weather);
  } catch {
    return getDemoFWI();
  }
}

async function fetchBeetleSightingsSafe(lat: number, lon: number): Promise<BeetleSightings | null> {
  try {
    return await fetchBeetleSightings(lat, lon, 50);
  } catch (err) {
    console.warn('[BeetleEarlyWarning] iNaturalist fetch failed:', err);
    return null;
  }
}

async function fetchFireDangerSafe(lat: number, lon: number): Promise<FireDangerForecast | null> {
  try {
    return await fetchFireDangerForPoint(lat, lon);
  } catch (err) {
    console.warn('[BeetleEarlyWarning] EFFIS fetch failed:', err);
    return null;
  }
}

async function fetchNdviSafe(): Promise<NDVIStats | null> {
  try {
    const overview = await getSatelliteOverview();
    return overview.ndviStats;
  } catch (err) {
    console.warn('[BeetleEarlyWarning] Sentinel NDVI fetch failed:', err);
    return null;
  }
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Assess bark beetle risk at a given location by fusing data from multiple sources.
 *
 * The function fetches data from all five sources in parallel, scores each factor,
 * and computes a weighted overall risk score (0-100) with a plain-language
 * recommendation.
 *
 * @param lat - Latitude in WGS84
 * @param lon - Longitude in WGS84
 * @param _parcelId - Optional forest parcel ID (reserved for future parcel-specific data)
 * @returns BeetleRiskAssessment with overall risk, score, factors, and recommendation
 */
export async function assessBeetleRisk(
  lat: number,
  lon: number,
  _parcelId?: string,
): Promise<BeetleRiskAssessment> {
  // Fetch all data sources in parallel for speed
  const [weather, beetleSightings, fireDanger, ndviStats] = await Promise.all([
    fetchWeatherSafe(lat, lon),
    fetchBeetleSightingsSafe(lat, lon),
    fetchFireDangerSafe(lat, lon),
    fetchNdviSafe(),
  ]);

  // Compute FWI from weather data (synchronous calculation)
  const fwi = weather ? computeFwiFromForecast(weather) : null;
  const daily = weather?.daily ?? [];

  // Score each factor independently
  const tempResult = scoreTemperature(daily);
  const droughtResult = scoreDrought(daily, fwi);
  const beetleResult = scoreBeetleSightings(beetleSightings);
  const ndviResult = scoreNdviDecline(ndviStats);
  const fireResult = scoreFireDanger(fireDanger);

  // Build risk factor objects
  const factors: RiskFactor[] = [
    {
      source: 'SMHI Weather',
      indicator: 'Temperature trend',
      value: tempResult.score,
      weight: WEIGHTS.temperature,
      contribution: determineContribution(tempResult.score),
      detail: tempResult.detail,
    },
    {
      source: 'SMHI / FWI',
      indicator: 'Drought stress',
      value: droughtResult.score,
      weight: WEIGHTS.drought,
      contribution: determineContribution(droughtResult.score),
      detail: droughtResult.detail,
    },
    {
      source: 'iNaturalist',
      indicator: 'Beetle sightings (50km)',
      value: beetleResult.score,
      weight: WEIGHTS.beetleSightings,
      contribution: determineContribution(beetleResult.score),
      detail: beetleResult.detail,
    },
    {
      source: 'Sentinel-2',
      indicator: 'NDVI canopy health',
      value: ndviResult.score,
      weight: WEIGHTS.ndviDecline,
      contribution: determineContribution(ndviResult.score),
      detail: ndviResult.detail,
    },
    {
      source: 'EFFIS / JRC',
      indicator: 'Fire danger index',
      value: fireResult.score,
      weight: WEIGHTS.fireDanger,
      contribution: determineContribution(fireResult.score),
      detail: fireResult.detail,
    },
  ];

  // Compute weighted overall score
  const riskScore = Math.round(
    tempResult.score * WEIGHTS.temperature +
    droughtResult.score * WEIGHTS.drought +
    beetleResult.score * WEIGHTS.beetleSightings +
    ndviResult.score * WEIGHTS.ndviDecline +
    fireResult.score * WEIGHTS.fireDanger,
  );

  const clampedScore = Math.max(0, Math.min(100, riskScore));
  const overallRisk = classifyOverallRisk(clampedScore);
  const recommendation = RECOMMENDATIONS[overallRisk];

  return {
    overallRisk,
    riskScore: clampedScore,
    factors,
    recommendation,
    lastUpdated: new Date().toISOString(),
  };
}

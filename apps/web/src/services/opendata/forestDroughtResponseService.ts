/**
 * ForDRI — Forest Drought Response Index
 *
 * Combines NDVI anomaly, evapotranspiration deficit, soil moisture,
 * and precipitation into a forest-specific drought score. Critical for
 * predicting bark beetle outbreaks — drought-stressed trees are the
 * primary vector for Ips typographus mass reproduction.
 *
 * Categories follow US Drought Monitor convention adapted for forests:
 * D4 (exceptional) to W2 (abnormally wet).
 *
 * This service uses demo data modelled on Smaland conditions.
 *
 * Reference: https://www.drought.gov/data-maps-tools/forest-drought-response-index
 */

// ─── Types ───

export interface ForDRIScore {
  overallScore: number; // -4 (extreme drought) to +4 (extreme wet)
  category: 'D4' | 'D3' | 'D2' | 'D1' | 'D0' | 'W0' | 'W1' | 'W2';
  categoryLabel: string;
  components: {
    ndviAnomaly: number;
    evapotranspirationDeficit: number;
    soilMoistureAnomaly: number;
    precipitationAnomaly: number;
  };
  beetleRiskMultiplier: number;
}

export interface ForDRITimeSeries {
  lat: number;
  lng: number;
  weeks: ForDRIWeekly[];
  currentScore: ForDRIScore;
  trendDirection: 'drying' | 'stable' | 'wetting';
  periodLabel: string;
}

interface ForDRIWeekly {
  weekStart: string;
  score: number;
  category: ForDRIScore['category'];
  beetleRiskMultiplier: number;
}

// ─── Constants ───

const CATEGORY_MAP: { min: number; max: number; cat: ForDRIScore['category']; label: string }[] = [
  { min: -4.0, max: -3.0, cat: 'D4', label: 'Exceptional drought' },
  { min: -3.0, max: -2.0, cat: 'D3', label: 'Extreme drought' },
  { min: -2.0, max: -1.0, cat: 'D2', label: 'Severe drought' },
  { min: -1.0, max: -0.5, cat: 'D1', label: 'Moderate drought' },
  { min: -0.5, max:  0.5, cat: 'D0', label: 'Abnormally dry / Normal' },
  { min:  0.5, max:  1.5, cat: 'W0', label: 'Abnormally wet' },
  { min:  1.5, max:  3.0, cat: 'W1', label: 'Moderately wet' },
  { min:  3.0, max:  4.0, cat: 'W2', label: 'Extremely wet' },
];

// Beetle risk multipliers by drought category
// Drought stress weakens tree resin defenses, enabling mass beetle colonization
const BEETLE_RISK_MULTIPLIERS: Record<ForDRIScore['category'], number> = {
  D4: 3.5,
  D3: 2.5,
  D2: 1.8,
  D1: 1.3,
  D0: 1.0,
  W0: 0.9,
  W1: 0.8,
  W2: 0.7,
};

export const FORDRI_SOURCE_INFO = {
  name: 'Forest Drought Response Index (ForDRI)',
  provider: 'Adapted from USDA / National Drought Mitigation Center',
  components: [
    'NDVI anomaly (vegetation greenness)',
    'Evapotranspiration deficit',
    'Soil moisture anomaly',
    'Precipitation anomaly',
  ],
  scale: '-4 (exceptional drought) to +4 (extremely wet)',
  coverage: 'Forested areas',
  note: 'Demo data modelled on Smaland, Sweden conditions. Beetle risk multipliers based on Swedish forestry research.',
};

// ─── Helpers ───

function scoreToCategory(score: number): { cat: ForDRIScore['category']; label: string } {
  const clamped = Math.max(-4, Math.min(4, score));
  for (const entry of CATEGORY_MAP) {
    if (clamped >= entry.min && clamped < entry.max) {
      return { cat: entry.cat, label: entry.label };
    }
  }
  // Edge case: exactly +4
  return { cat: 'W2', label: 'Extremely wet' };
}

// ─── Core Calculation ───

/**
 * Calculate Forest Drought Response Index from component anomalies.
 * Each component is normalized to approximately -4 to +4 range.
 *
 * @param ndvi - NDVI anomaly (e.g. -0.15 = 15% below normal)
 * @param et - Evapotranspiration anomaly in mm/week (negative = deficit)
 * @param soil - Soil moisture anomaly as fraction (e.g. -0.1 = 10% below normal)
 * @param precip - Precipitation anomaly in mm/week (negative = deficit)
 */
export function calculateForDRI(
  ndvi: number,
  et: number,
  soil: number,
  precip: number
): ForDRIScore {
  // Normalize components to -4..+4 scale
  // NDVI anomaly: typical range -0.3 to +0.3
  const ndviNorm = Math.max(-4, Math.min(4, ndvi * 13.3));
  // ET anomaly: typical range -20 to +20 mm/week
  const etNorm = Math.max(-4, Math.min(4, et / 5));
  // Soil moisture anomaly: typical range -0.3 to +0.3
  const soilNorm = Math.max(-4, Math.min(4, soil * 13.3));
  // Precipitation anomaly: typical range -30 to +30 mm/week
  const precipNorm = Math.max(-4, Math.min(4, precip / 7.5));

  // Weighted combination (NDVI and soil moisture weighted higher for forests)
  const weights = { ndvi: 0.30, et: 0.20, soil: 0.30, precip: 0.20 };
  const overallScore = Math.round(
    (ndviNorm * weights.ndvi +
      etNorm * weights.et +
      soilNorm * weights.soil +
      precipNorm * weights.precip) * 100
  ) / 100;

  const { cat, label } = scoreToCategory(overallScore);

  return {
    overallScore,
    category: cat,
    categoryLabel: label,
    components: {
      ndviAnomaly: Math.round(ndviNorm * 100) / 100,
      evapotranspirationDeficit: Math.round(etNorm * 100) / 100,
      soilMoistureAnomaly: Math.round(soilNorm * 100) / 100,
      precipitationAnomaly: Math.round(precipNorm * 100) / 100,
    },
    beetleRiskMultiplier: BEETLE_RISK_MULTIPLIERS[cat],
  };
}

// ─── Demo Data ───

function generateDemoTimeSeries(lat: number, lng: number, weeks: number): ForDRIWeekly[] {
  const now = new Date();
  const result: ForDRIWeekly[] = [];

  // Smaland drying trend: starts near normal, drifts into D1-D2
  // Southern locations are drier
  const latFactor = lat < 58 ? -0.3 : lat < 60 ? -0.15 : 0;

  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);

    // Progressive drying with some noise
    const weekProgress = (weeks - 1 - i) / Math.max(weeks - 1, 1);
    const dryingTrend = -0.2 - weekProgress * 1.2 + latFactor;
    const noise = (Math.sin(i * 2.1) * 0.3) + (Math.cos(i * 0.7) * 0.2);
    const score = Math.round((dryingTrend + noise) * 100) / 100;

    const { cat } = scoreToCategory(score);

    result.push({
      weekStart: weekStart.toISOString().split('T')[0],
      score,
      category: cat,
      beetleRiskMultiplier: BEETLE_RISK_MULTIPLIERS[cat],
    });
  }

  return result;
}

// ─── API Functions ───

/**
 * Get ForDRI time series for a location.
 * Returns demo data showing a typical Smaland drying pattern (D1-D2 range).
 */
export async function getForDRITimeSeries(
  lat: number,
  lng: number,
  weeks: number = 16
): Promise<ForDRITimeSeries> {
  const weeklyData = generateDemoTimeSeries(lat, lng, weeks);

  const current = weeklyData[weeklyData.length - 1];
  const { cat, label } = scoreToCategory(current.score);

  // Determine trend from last 4 weeks
  const recentScores = weeklyData.slice(-4).map((w) => w.score);
  const avgRecent = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
  const olderScores = weeklyData.slice(-8, -4).map((w) => w.score);
  const avgOlder = olderScores.length > 0
    ? olderScores.reduce((a, b) => a + b, 0) / olderScores.length
    : avgRecent;

  let trendDirection: 'drying' | 'stable' | 'wetting';
  if (avgRecent < avgOlder - 0.2) trendDirection = 'drying';
  else if (avgRecent > avgOlder + 0.2) trendDirection = 'wetting';
  else trendDirection = 'stable';

  const currentScore: ForDRIScore = {
    overallScore: current.score,
    category: cat,
    categoryLabel: label,
    components: {
      ndviAnomaly: Math.round(current.score * 0.9 * 100) / 100,
      evapotranspirationDeficit: Math.round(current.score * 0.7 * 100) / 100,
      soilMoistureAnomaly: Math.round(current.score * 1.1 * 100) / 100,
      precipitationAnomaly: Math.round(current.score * 0.8 * 100) / 100,
    },
    beetleRiskMultiplier: BEETLE_RISK_MULTIPLIERS[cat],
  };

  const firstWeek = weeklyData[0].weekStart;
  const lastWeek = weeklyData[weeklyData.length - 1].weekStart;

  return {
    lat,
    lng,
    weeks: weeklyData,
    currentScore,
    trendDirection,
    periodLabel: `${firstWeek} to ${lastWeek}`,
  };
}

/**
 * Get the bark beetle risk multiplier for a given ForDRI score.
 * Higher drought stress = weaker tree defenses = higher beetle success.
 *
 * Returns a multiplier (0.7 to 3.5) to apply to base beetle risk models.
 */
export function getForDRIBeetleRiskMultiplier(score: number): number {
  const { cat } = scoreToCategory(score);
  return BEETLE_RISK_MULTIPLIERS[cat];
}

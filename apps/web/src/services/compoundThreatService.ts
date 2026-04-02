// Compound Threat Model Service
// Fuses beetle risk, fire risk, and drought stress into a single
// multi-hazard assessment — captures cascading risks that single-source tools miss.
//
// Scientific basis:
// - Drought → reduced resin production → lower beetle defence (Netherer & Schopf 2010)
// - Heat wave → beetle flight activity + fire probability (Jönsson et al. 2012)
// - Storm damage → breeding substrate → beetle population spike (Weslien & Schroeder 1999)

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface SingleThreat {
  name: string;
  score: number; // 0-100
  level: ThreatLevel;
  drivers: string[];
  trend: 'rising' | 'stable' | 'falling';
}

export interface CompoundThreatAssessment {
  /** Overall compound risk score (0-100) */
  compound_score: number;
  /** Overall risk level */
  compound_level: ThreatLevel;
  /** Individual threat components */
  beetle_threat: SingleThreat;
  fire_threat: SingleThreat;
  drought_threat: SingleThreat;
  /** Interaction effects — where threats amplify each other */
  interactions: ThreatInteraction[];
  /** Recommended actions based on compound risk */
  recommendations: string[];
  /** Timestamp of assessment */
  assessed_at: string;
  /** Data sources used */
  data_sources: string[];
}

export interface ThreatInteraction {
  /** Interacting threats */
  threats: [string, string];
  /** How they interact */
  mechanism: string;
  /** Amplification factor (1.0 = no amplification, >1 = amplifies) */
  amplification: number;
  /** Confidence in this interaction */
  confidence: number;
}

export interface ThreatTimeline {
  date: string;
  beetle_score: number;
  fire_score: number;
  drought_score: number;
  compound_score: number;
}

// ── Compound scoring logic ───────────────────────────────────────────────────

function scoreToLevel(score: number): ThreatLevel {
  if (score >= 75) return 'CRITICAL';
  if (score >= 50) return 'HIGH';
  if (score >= 25) return 'MODERATE';
  return 'LOW';
}

function levelColor(level: ThreatLevel): string {
  switch (level) {
    case 'CRITICAL': return '#dc2626';
    case 'HIGH': return '#ea580c';
    case 'MODERATE': return '#ca8a04';
    case 'LOW': return '#16a34a';
  }
}

export function getThreatColor(level: ThreatLevel): string {
  return levelColor(level);
}

/**
 * Calculate compound threat from individual risk inputs.
 * The compound score is NOT a simple average — interactions amplify risk.
 */
export function calculateCompoundThreat(params: {
  temperature: number; // °C
  humidity: number; // % relative
  windSpeed: number; // m/s
  beetleTrapCount: number;
  gddAccumulated: number;
  droughtDays: number; // consecutive days without rain
  nearbyFireCount: number;
  recentStormDamage_ha: number;
  soilMoisture: number; // 0-100
}): CompoundThreatAssessment {
  const {
    temperature, humidity, windSpeed, beetleTrapCount, gddAccumulated,
    droughtDays, nearbyFireCount, recentStormDamage_ha, soilMoisture
  } = params;

  // ── Beetle threat ────────────────────────────────────────────────────────

  // GDD factor: Ips typographus swarming starts ~280 GDD (base 5°C)
  const gddFactor = gddAccumulated >= 280
    ? Math.min(1, (gddAccumulated - 280) / 200) * 30
    : (gddAccumulated / 280) * 10;

  // Temperature factor: flight activity above 18°C, peaks 20-25°C
  const tempBeetleFactor = temperature >= 18
    ? Math.min(25, ((temperature - 18) / 7) * 25)
    : 0;

  // Trap count factor
  const trapFactor = Math.min(25, (beetleTrapCount / 3000) * 25);

  // Humidity factor: low humidity = beetles more active
  const humBeetleFactor = humidity < 50
    ? Math.min(20, ((50 - humidity) / 50) * 20)
    : 0;

  const beetleScore = Math.min(100, Math.round(gddFactor + tempBeetleFactor + trapFactor + humBeetleFactor));
  const beetleDrivers: string[] = [];
  if (gddFactor > 15) beetleDrivers.push(`GDD ${gddAccumulated} approaching swarming threshold`);
  if (tempBeetleFactor > 10) beetleDrivers.push(`Temperature ${temperature}°C favours beetle flight`);
  if (trapFactor > 15) beetleDrivers.push(`Trap counts elevated (${beetleTrapCount})`);
  if (humBeetleFactor > 10) beetleDrivers.push(`Low humidity reduces tree defences`);

  // ── Fire threat ──────────────────────────────────────────────────────────

  const tempFireFactor = Math.min(25, Math.max(0, (temperature - 15) / 20) * 25);
  const humFireFactor = Math.min(25, Math.max(0, (60 - humidity) / 60) * 25);
  const windFireFactor = Math.min(20, (windSpeed / 10) * 20);
  const droughtFireFactor = Math.min(20, (droughtDays / 14) * 20);
  const nearbyFireFactor = Math.min(10, nearbyFireCount * 5);

  const fireScore = Math.min(100, Math.round(
    tempFireFactor + humFireFactor + windFireFactor + droughtFireFactor + nearbyFireFactor
  ));
  const fireDrivers: string[] = [];
  if (tempFireFactor > 10) fireDrivers.push(`High temperature (${temperature}°C)`);
  if (humFireFactor > 10) fireDrivers.push(`Low humidity (${humidity}%)`);
  if (windFireFactor > 10) fireDrivers.push(`Wind speed ${windSpeed} m/s`);
  if (droughtFireFactor > 10) fireDrivers.push(`${droughtDays} days without rain`);
  if (nearbyFireFactor > 0) fireDrivers.push(`${nearbyFireCount} active fires nearby`);

  // ── Drought threat ───────────────────────────────────────────────────────

  const soilDroughtFactor = Math.min(35, Math.max(0, (50 - soilMoisture) / 50) * 35);
  const droughtDaysFactor = Math.min(35, (droughtDays / 21) * 35);
  const tempDroughtFactor = Math.min(30, Math.max(0, (temperature - 20) / 15) * 30);

  const droughtScore = Math.min(100, Math.round(
    soilDroughtFactor + droughtDaysFactor + tempDroughtFactor
  ));
  const droughtDrivers: string[] = [];
  if (soilDroughtFactor > 15) droughtDrivers.push(`Soil moisture critically low (${soilMoisture}%)`);
  if (droughtDaysFactor > 15) droughtDrivers.push(`Extended dry period (${droughtDays} days)`);
  if (tempDroughtFactor > 15) droughtDrivers.push(`Heat stress on vegetation`);

  // ── Interaction effects ──────────────────────────────────────────────────

  const interactions: ThreatInteraction[] = [];

  // Drought × Beetle: drought stress reduces spruce resin production
  const droughtBeetleAmp = droughtScore > 40 && beetleScore > 30
    ? 1 + (droughtScore / 100) * 0.35
    : 1.0;
  if (droughtBeetleAmp > 1.0) {
    interactions.push({
      threats: ['Drought', 'Beetle'],
      mechanism: 'Drought stress reduces spruce resin production, lowering natural beetle defence (Netherer & Schopf 2010)',
      amplification: Math.round(droughtBeetleAmp * 100) / 100,
      confidence: 0.85,
    });
  }

  // Fire × Beetle: fire-damaged trees attract beetles
  const fireBeetleAmp = fireScore > 40 && beetleScore > 20
    ? 1 + (fireScore / 100) * 0.25
    : 1.0;
  if (fireBeetleAmp > 1.0) {
    interactions.push({
      threats: ['Fire', 'Beetle'],
      mechanism: 'Fire-damaged and stressed trees emit volatiles that attract bark beetles, creating secondary outbreak risk',
      amplification: Math.round(fireBeetleAmp * 100) / 100,
      confidence: 0.78,
    });
  }

  // Storm × Beetle: windthrown timber provides breeding substrate
  const stormBeetleAmp = recentStormDamage_ha > 5
    ? 1 + Math.min(0.4, (recentStormDamage_ha / 100) * 0.4)
    : 1.0;
  if (stormBeetleAmp > 1.0) {
    interactions.push({
      threats: ['Storm Damage', 'Beetle'],
      mechanism: `${recentStormDamage_ha} ha of windthrown timber provides breeding substrate for spring beetle emergence (Weslien & Schroeder 1999)`,
      amplification: Math.round(stormBeetleAmp * 100) / 100,
      confidence: 0.92,
    });
  }

  // Drought × Fire: obvious compound
  const droughtFireAmp = droughtScore > 30 && fireScore > 30
    ? 1 + (droughtScore / 100) * 0.30
    : 1.0;
  if (droughtFireAmp > 1.0) {
    interactions.push({
      threats: ['Drought', 'Fire'],
      mechanism: 'Extended drought dries forest floor litter, dramatically increasing fire ignition probability and spread rate',
      amplification: Math.round(droughtFireAmp * 100) / 100,
      confidence: 0.95,
    });
  }

  // ── Compound score ───────────────────────────────────────────────────────

  // Max amplification from interactions
  const maxAmp = Math.max(droughtBeetleAmp, fireBeetleAmp, stormBeetleAmp, droughtFireAmp);

  // Compound = weighted max + interaction bonus
  const baseCompound = (beetleScore * 0.40) + (fireScore * 0.30) + (droughtScore * 0.30);
  const compoundScore = Math.min(100, Math.round(baseCompound * maxAmp));

  // ── Recommendations ──────────────────────────────────────────────────────

  const recommendations: string[] = [];
  if (beetleScore >= 50) {
    recommendations.push('Inspect mature spruce stands for bore dust, bark flaking, and crown discoloration within 48 hours');
  }
  if (beetleScore >= 75) {
    recommendations.push('Emergency: prioritise salvage harvesting of infested trees to prevent beetle population multiplication');
  }
  if (fireScore >= 50) {
    recommendations.push('Clear brush and deadwood from access roads and fire breaks. Verify water source availability.');
  }
  if (droughtScore >= 50) {
    recommendations.push('Postpone thinning operations — mechanical damage to drought-stressed trees increases beetle vulnerability');
  }
  if (interactions.length > 0) {
    recommendations.push(`Compound risk detected: ${interactions.length} threat interaction(s) amplifying overall risk by up to ${Math.round((maxAmp - 1) * 100)}%`);
  }
  if (compoundScore < 25) {
    recommendations.push('Current compound risk is LOW. Continue routine monitoring.');
  }

  return {
    compound_score: compoundScore,
    compound_level: scoreToLevel(compoundScore),
    beetle_threat: {
      name: 'Bark Beetle',
      score: beetleScore,
      level: scoreToLevel(beetleScore),
      drivers: beetleDrivers.length > 0 ? beetleDrivers : ['No significant beetle activity drivers'],
      trend: gddAccumulated > 200 ? 'rising' : 'stable',
    },
    fire_threat: {
      name: 'Wildfire',
      score: fireScore,
      level: scoreToLevel(fireScore),
      drivers: fireDrivers.length > 0 ? fireDrivers : ['Fire risk conditions within normal range'],
      trend: droughtDays > 7 ? 'rising' : 'stable',
    },
    drought_threat: {
      name: 'Drought Stress',
      score: droughtScore,
      level: scoreToLevel(droughtScore),
      drivers: droughtDrivers.length > 0 ? droughtDrivers : ['Soil moisture and precipitation adequate'],
      trend: droughtDays > 14 ? 'rising' : soilMoisture > 60 ? 'falling' : 'stable',
    },
    interactions,
    recommendations,
    assessed_at: new Date().toISOString(),
    data_sources: ['SMHI Weather', 'Sentinel-2 NDVI', 'Skogsstyrelsen Trap Network', 'NASA FIRMS', 'ForestWard Observatory'],
  };
}

/**
 * Generate a 7-day compound threat forecast timeline
 */
export function generateThreatTimeline(baseParams: {
  temperature: number;
  humidity: number;
  windSpeed: number;
  beetleTrapCount: number;
  gddAccumulated: number;
  droughtDays: number;
  nearbyFireCount: number;
  recentStormDamage_ha: number;
  soilMoisture: number;
}): ThreatTimeline[] {
  const timeline: ThreatTimeline[] = [];
  const now = new Date();

  for (let day = 0; day < 7; day++) {
    const date = new Date(now);
    date.setDate(date.getDate() + day);

    // Simulate daily variation
    const tempVariation = Math.sin(day * 0.8) * 3 + (day * 0.3);
    const humVariation = -Math.sin(day * 0.6) * 5 - (day * 1.5);

    const dayParams = {
      ...baseParams,
      temperature: baseParams.temperature + tempVariation,
      humidity: Math.max(20, baseParams.humidity + humVariation),
      gddAccumulated: baseParams.gddAccumulated + day * 8,
      droughtDays: baseParams.droughtDays + day,
      soilMoisture: Math.max(10, baseParams.soilMoisture - day * 2),
    };

    const assessment = calculateCompoundThreat(dayParams);

    timeline.push({
      date: date.toISOString().slice(0, 10),
      beetle_score: assessment.beetle_threat.score,
      fire_score: assessment.fire_threat.score,
      drought_score: assessment.drought_threat.score,
      compound_score: assessment.compound_score,
    });
  }

  return timeline;
}

/**
 * Get a demo compound threat for Småland conditions
 */
export function getDemoCompoundThreat(): CompoundThreatAssessment {
  const month = new Date().getMonth() + 1;

  // Seasonal variation — higher risk in summer
  const seasonalTemp = month >= 5 && month <= 8 ? 22 + Math.random() * 6 : 8 + Math.random() * 8;
  const seasonalHumidity = month >= 6 && month <= 8 ? 35 + Math.random() * 20 : 55 + Math.random() * 25;
  const seasonalGDD = calculateRealisticGDD(57.15, month);
  const seasonalDrought = month >= 6 && month <= 8 ? Math.round(Math.random() * 12) : Math.round(Math.random() * 4);

  return calculateCompoundThreat({
    temperature: seasonalTemp,
    humidity: seasonalHumidity,
    windSpeed: 2 + Math.random() * 5,
    beetleTrapCount: month >= 5 && month <= 9 ? 1200 + Math.round(Math.random() * 2000) : 200 + Math.round(Math.random() * 400),
    gddAccumulated: seasonalGDD,
    droughtDays: seasonalDrought,
    nearbyFireCount: month >= 6 && month <= 8 ? Math.round(Math.random() * 3) : 0,
    recentStormDamage_ha: Math.random() > 0.7 ? Math.round(Math.random() * 30) : 0,
    soilMoisture: 60 - seasonalDrought * 2 + Math.round(Math.random() * 15),
  });
}

function calculateRealisticGDD(lat: number, month: number): number {
  const latFactor = Math.max(0, 1 - (lat - 55) * 0.04);
  const seasonalCurve = Math.max(0, Math.sin((month - 2) * Math.PI / 10));
  const maxGDD = 800 * latFactor;
  return Math.round(maxGDD * seasonalCurve);
}

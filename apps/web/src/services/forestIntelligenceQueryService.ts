/**
 * Forest Intelligence Query Service
 *
 * The "brain" behind "Ask the forest" — queries all relevant open data
 * services for a given parcel and synthesises a plain-language
 * intelligence briefing with financial impact, convergence scoring,
 * and actionable recommendations.
 *
 * Every external call is wrapped in try/catch so the service degrades
 * gracefully: it always returns a result even when individual sources
 * are unavailable.
 */

import {
  // ─── Beetle / Pest ───
  fetchSoilMoistureTimeSeries,
  getBiodiversitySnapshot,
  fetchBeetleSightings,
  fetchSwedishFireRisk,
  checkBeetleEmergenceConditions,
  calculateBeetleRiskFromSoil,
  fetchFireDangerForPoint,
  getForDRIBeetleRiskMultiplier,
  calculatePostFireBeetleRisk,
  fetchBarkBeetleRecords,

  // ─── Harvest / Logistics ───
  fetchTimberPrices,
  checkHarvestAccessibility,
  fetchForecast,
  checkWaterBufferCompliance,
  assessTrafficability,
  fetchWeightRestrictions,
  fetchRoadConditions,

  // ─── Financial / Carbon ───
  estimateBiomass,
  valuateForestAsset,
  getCarbonTimeSeries,
  getLatestPriceComparison,
  fetchBiomassCCITimeSeries,

  // ─── Compliance / Nature ───
  checkComplianceForParcel,
  fetchRedListedSpecies,
  fetchProtectedAreasNV,
  getNearestProtectedAreas,

  // ─── Weather / Climate ───
  getLiveWeatherObservation,
  calculateDroughtStatus,
  getCombinedDroughtStatus,

  // ─── Satellite / Land Cover ───
  fetchForestChangeStats,
  fetchWorldCoverStats,

  // Source info constants
  BIODIVERSITY_SOURCE_INFO,
  CARBON_SOURCE_INFO,
  SCB_SOURCE_INFO,
  SOILGRIDS_SOURCE_INFO,
  OPEN_METEO_SOURCE_INFO,
  EFFIS_SOURCE_INFO,
  DROUGHT_OBSERVATORY_SOURCE_INFO,
  TRAFIKVERKET_SOURCE_INFO,
  NATURVARDSVERKET_SOURCE_INFO,
  MSB_FIRE_SOURCE_INFO,
  SMHI_HYDROLOGY_SOURCE_INFO,
  INATURALIST_SOURCE_INFO,
  ARTPORTALEN_SOURCE_INFO,
  FORDRI_SOURCE_INFO,
  HANSEN_SOURCE_INFO,
  WORLDCOVER_SOURCE_INFO,
  ERA5_SOURCE_INFO,
  FIRMS_SOURCE_INFO,
  ESA_BIOMASS_CCI_SOURCE_INFO,
  FAO_FRA_SOURCE_INFO,
} from '@/services/opendata';

import { getSwarmingRiskDemo } from '@/services/swarmingProbabilityModel';

// ─── Types ──────────────────────────────────────────────────────────

export interface ForestQuery {
  question: string;
  parcelContext?: {
    lat: number;
    lng: number;
    areaHa: number;
    dominantSpecies: string;
    parcelName: string;
  };
  queryType: 'beetle_risk' | 'harvest_timing' | 'financial' | 'compliance' | 'general';
}

export interface IntelligenceSource {
  service: string;
  dataPoint: string;
  value: string;
  status: 'positive' | 'neutral' | 'negative';
  confidence: number;
  timestamp: string;
}

export interface ForestIntelligenceBriefing {
  summary: string;
  financialImpact: string;
  confidencePercent: number;
  sources: IntelligenceSource[];
  convergenceScore: number;
  recommendedActions: string[];
  timeToAct: number | null;
  disclaimer: string;
  sourcesQueried: number;
  sourcesFailed: number;
}

export interface DataSourceInfo {
  id: string;
  name: string;
  description: string;
  category: 'beetle' | 'weather' | 'financial' | 'compliance' | 'satellite' | 'biodiversity' | 'logistics';
  url?: string;
}

// ─── Question Classifier ────────────────────────────────────────────

const KEYWORD_MAP: Record<ForestQuery['queryType'], string[]> = {
  beetle_risk: [
    'beetle', 'barkborre', 'bark beetle', 'ips typographus', 'granbarkborre',
    'pest', 'skadedjur', 'infestation', 'angrepp', 'swarming', 'svärm',
    'woodpecker', 'hackspett', 'predator',
  ],
  harvest_timing: [
    'harvest', 'avverkning', 'logging', 'fälla', 'cut', 'hugga',
    'timber', 'virke', 'road', 'väg', 'transport', 'weather window',
    'access', 'markbärighet', 'trafikabilitet',
  ],
  financial: [
    'price', 'pris', 'value', 'värde', 'money', 'pengar', 'sek', 'kr',
    'carbon', 'kol', 'biomass', 'biomassa', 'investment', 'investering',
    'profit', 'vinst', 'revenue', 'intäkt', 'asset', 'tillgång',
  ],
  compliance: [
    'compliance', 'certifiering', 'fsc', 'pefc', 'regulation', 'regel',
    'protected', 'skyddad', 'natura 2000', 'red list', 'rödlista',
    'buffer', 'skyddszon', 'eudr', 'law', 'lag',
  ],
  general: [],
};

export function classifyQuestion(question: string): ForestQuery['queryType'] {
  const lower = question.toLowerCase();
  let bestType: ForestQuery['queryType'] = 'general';
  let bestScore = 0;

  for (const [type, keywords] of Object.entries(KEYWORD_MAP) as [ForestQuery['queryType'], string[]][]) {
    if (type === 'general') continue;
    const score = keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }
  return bestType;
}

// ─── Helper: safe call wrapper ──────────────────────────────────────

interface CallResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

async function safeCall<T>(label: string, fn: () => Promise<T>): Promise<CallResult<T>> {
  try {
    const data = await fn();
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[ForestIntelligence] ${label} failed: ${msg}`);
    return { ok: false, error: msg };
  }
}

// ─── Source builders ────────────────────────────────────────────────

function src(
  service: string,
  dataPoint: string,
  value: string,
  status: IntelligenceSource['status'],
  confidence = 0.7,
): IntelligenceSource {
  return {
    service,
    dataPoint,
    value,
    status,
    confidence,
    timestamp: new Date().toISOString(),
  };
}

// ─── Beetle Risk Query ──────────────────────────────────────────────

async function queryBeetleRisk(
  lat: number,
  lng: number,
  areaHa: number,
  species: string,
): Promise<{ sources: IntelligenceSource[]; failed: number; queried: number }> {
  const sources: IntelligenceSource[] = [];
  let failed = 0;
  let queried = 0;

  // 1. Swarming probability model
  queried++;
  try {
    const swarming = getSwarmingRiskDemo();
    const status = swarming.probability > 60 ? 'negative' : swarming.probability > 30 ? 'neutral' : 'positive';
    sources.push(src('Swarming Model', 'Swarming probability', `${swarming.probability}%`, status, 0.85));
  } catch { failed++; }

  // 2. Soil moisture (drought stress)
  queried++;
  const soilRes = await safeCall('ERA5 Soil Moisture', () => fetchSoilMoistureTimeSeries(lat, lng, 6));
  if (soilRes.ok && soilRes.data) {
    const drought = calculateDroughtStatus(soilRes.data);
    const status = drought.level === 'severe' || drought.level === 'extreme'
      ? 'negative'
      : drought.level === 'moderate' ? 'neutral' : 'positive';
    sources.push(src('ERA5 Soil Moisture', 'Drought status', drought.level, status, 0.75));
  } else { failed++; }

  // 3. Biodiversity snapshot (woodpecker predator proxy)
  queried++;
  const bioRes = await safeCall('GBIF Biodiversity', () => getBiodiversitySnapshot(lat, lng));
  if (bioRes.ok && bioRes.data) {
    const idx = bioRes.data.predatorIndex;
    const status = idx > 0.6 ? 'positive' : idx > 0.3 ? 'neutral' : 'negative';
    sources.push(src('GBIF Biodiversity', 'Beetle predator index', `${(idx * 100).toFixed(0)}%`, status, 0.6));
  } else { failed++; }

  // 4. iNaturalist beetle sightings
  queried++;
  const inatRes = await safeCall('iNaturalist', () => fetchBeetleSightings(lat, lng, 25));
  if (inatRes.ok && inatRes.data) {
    const count = inatRes.data.totalCount;
    const status = count > 10 ? 'negative' : count > 3 ? 'neutral' : 'positive';
    sources.push(src('iNaturalist', 'Nearby beetle sightings', `${count} within 25 km`, status, 0.55));
  } else { failed++; }

  // 5. MSB fire risk (drought → beetle link)
  queried++;
  const fireRes = await safeCall('MSB Fire Risk', () => fetchSwedishFireRisk(lat, lng));
  if (fireRes.ok && fireRes.data) {
    const level = fireRes.data.riskLevel;
    const status = level >= 4 ? 'negative' : level >= 3 ? 'neutral' : 'positive';
    sources.push(src('MSB Fire Risk', 'Fire risk level', `${level}/5`, status, 0.7));
  } else { failed++; }

  // 6. Beetle emergence conditions (Open-Meteo)
  queried++;
  const emergRes = await safeCall('Open-Meteo Emergence', () => checkBeetleEmergenceConditions(lat, lng));
  if (emergRes.ok && emergRes.data) {
    const risk = emergRes.data.riskLevel;
    const status = risk === 'high' || risk === 'critical' ? 'negative' : risk === 'moderate' ? 'neutral' : 'positive';
    sources.push(src('Open-Meteo', 'Beetle emergence conditions', risk, status, 0.8));
  } else { failed++; }

  // 7. Soil beetle risk (SoilGrids)
  queried++;
  const soilBeetleRes = await safeCall('SoilGrids', () => calculateBeetleRiskFromSoil(lat, lng));
  if (soilBeetleRes.ok && soilBeetleRes.data) {
    const risk = soilBeetleRes.data.riskLevel;
    const status = risk === 'high' ? 'negative' : risk === 'moderate' ? 'neutral' : 'positive';
    sources.push(src('SoilGrids', 'Soil-based beetle risk', risk, status, 0.65));
  } else { failed++; }

  // 8. EFFIS fire danger
  queried++;
  const effisRes = await safeCall('EFFIS', () => fetchFireDangerForPoint(lat, lng));
  if (effisRes.ok && effisRes.data) {
    const cls = effisRes.data.dangerClass;
    const status = cls === 'very_high' || cls === 'extreme' ? 'negative' : cls === 'high' ? 'neutral' : 'positive';
    sources.push(src('EFFIS', 'Fire danger class', cls, status, 0.7));
  } else { failed++; }

  // 9. ForDRI beetle multiplier
  queried++;
  const fordriRes = await safeCall('ForDRI', () => getForDRIBeetleRiskMultiplier(lat, lng, species));
  if (fordriRes.ok && fordriRes.data != null) {
    const mult = fordriRes.data;
    const status = mult > 1.5 ? 'negative' : mult > 1.0 ? 'neutral' : 'positive';
    sources.push(src('ForDRI', 'Drought-beetle multiplier', `${mult.toFixed(2)}x`, status, 0.75));
  } else { failed++; }

  // 10. Artportalen bark beetle records
  queried++;
  const artRes = await safeCall('Artportalen', () => fetchBarkBeetleRecords(lat, lng, 20));
  if (artRes.ok && artRes.data) {
    const count = artRes.data.length;
    const status = count > 10 ? 'negative' : count > 3 ? 'neutral' : 'positive';
    sources.push(src('Artportalen', 'Bark beetle records nearby', `${count} records`, status, 0.6));
  } else { failed++; }

  return { sources, failed, queried };
}

// ─── Harvest Timing Query ───────────────────────────────────────────

async function queryHarvestTiming(
  lat: number,
  lng: number,
  _areaHa: number,
  _species: string,
): Promise<{ sources: IntelligenceSource[]; failed: number; queried: number }> {
  const sources: IntelligenceSource[] = [];
  let failed = 0;
  let queried = 0;

  // 1. Timber prices
  queried++;
  const priceRes = await safeCall('SCB Timber Prices', () => fetchTimberPrices());
  if (priceRes.ok && priceRes.data) {
    const p = priceRes.data;
    sources.push(src('SCB', 'Current timber price', `${p.sawlogPrice} SEK/m³fub`, p.trendDirection === 'up' ? 'positive' : p.trendDirection === 'down' ? 'negative' : 'neutral', 0.85));
  } else { failed++; }

  // 2. Road accessibility
  queried++;
  const roadRes = await safeCall('Trafikverket', () => checkHarvestAccessibility(lat, lng));
  if (roadRes.ok && roadRes.data) {
    const ok = roadRes.data.accessible;
    sources.push(src('Trafikverket', 'Harvest road access', ok ? 'Accessible' : 'Restricted', ok ? 'positive' : 'negative', 0.8));
  } else { failed++; }

  // 3. Weather forecast (harvest window)
  queried++;
  const wxRes = await safeCall('Open-Meteo Forecast', () => fetchForecast(lat, lng, 7));
  if (wxRes.ok && wxRes.data && wxRes.data.daily) {
    const dryDays = wxRes.data.daily.filter((d) => d.precipitationSum < 2).length;
    const status = dryDays >= 5 ? 'positive' : dryDays >= 3 ? 'neutral' : 'negative';
    sources.push(src('Open-Meteo', 'Dry days next 7d', `${dryDays}/7`, status, 0.75));
  } else { failed++; }

  // 4. Water buffer compliance
  queried++;
  const waterRes = await safeCall('SMHI Hydrology', () => checkWaterBufferCompliance(lat, lng));
  if (waterRes.ok && waterRes.data) {
    const compliant = waterRes.data.compliant;
    sources.push(src('SMHI Hydrology', 'Water buffer compliance', compliant ? 'Compliant' : 'Non-compliant', compliant ? 'positive' : 'negative', 0.8));
  } else { failed++; }

  // 5. Soil trafficability
  queried++;
  const traffRes = await safeCall('SoilGrids Trafficability', () => assessTrafficability(lat, lng));
  if (traffRes.ok && traffRes.data) {
    const level = traffRes.data.trafficabilityClass;
    const status = level === 'good' ? 'positive' : level === 'moderate' ? 'neutral' : 'negative';
    sources.push(src('SoilGrids', 'Ground trafficability', level, status, 0.7));
  } else { failed++; }

  // 6. Weight restrictions
  queried++;
  const weightRes = await safeCall('Trafikverket Weight', () => fetchWeightRestrictions(lat, lng));
  if (weightRes.ok && weightRes.data) {
    const restricted = weightRes.data.some((r) => r.active);
    sources.push(src('Trafikverket', 'Weight restrictions', restricted ? 'Active restrictions' : 'No restrictions', restricted ? 'negative' : 'positive', 0.8));
  } else { failed++; }

  return { sources, failed, queried };
}

// ─── Financial Query ────────────────────────────────────────────────

async function queryFinancial(
  lat: number,
  lng: number,
  areaHa: number,
  species: string,
): Promise<{ sources: IntelligenceSource[]; failed: number; queried: number }> {
  const sources: IntelligenceSource[] = [];
  let failed = 0;
  let queried = 0;

  // 1. Biomass estimate
  queried++;
  const bioRes = await safeCall('Carbon/Biomass', () =>
    estimateBiomass({ lat, lng, areaHa, dominantSpecies: species, ageYears: 60, siteIndex: 28 }),
  );
  if (bioRes.ok && bioRes.data) {
    sources.push(src('Carbon Model', 'Standing biomass', `${bioRes.data.totalBiomass.toFixed(0)} tonnes`, 'neutral', 0.8));
  } else { failed++; }

  // 2. Forest valuation
  queried++;
  const valRes = await safeCall('Forest Valuation', () =>
    valuateForestAsset({ lat, lng, areaHa, dominantSpecies: species, ageYears: 60, siteIndex: 28 }),
  );
  if (valRes.ok && valRes.data) {
    const fmt = new Intl.NumberFormat('sv-SE').format(Math.round(valRes.data.totalValue));
    sources.push(src('Valuation Model', 'Estimated asset value', `${fmt} SEK`, 'neutral', 0.75));
  } else { failed++; }

  // 3. Timber prices
  queried++;
  const priceRes = await safeCall('SCB Prices', () => fetchTimberPrices());
  if (priceRes.ok && priceRes.data) {
    sources.push(src('SCB', 'Sawlog price', `${priceRes.data.sawlogPrice} SEK/m³fub`, priceRes.data.trendDirection === 'up' ? 'positive' : 'neutral', 0.85));
  } else { failed++; }

  // 4. Carbon time series
  queried++;
  const carbonRes = await safeCall('Carbon TimeSeries', () =>
    getCarbonTimeSeries({ lat, lng, areaHa, dominantSpecies: species, ageYears: 60, siteIndex: 28 }, 10),
  );
  if (carbonRes.ok && carbonRes.data) {
    const latest = carbonRes.data.months[carbonRes.data.months.length - 1];
    if (latest) {
      sources.push(src('Carbon Model', 'Carbon stock', `${latest.carbonTonnes.toFixed(1)} tCO₂e`, 'neutral', 0.75));
    }
  } else { failed++; }

  // 5. Price comparison
  queried++;
  const compRes = await safeCall('SCB Price Comparison', () => getLatestPriceComparison());
  if (compRes.ok && compRes.data) {
    const diff = compRes.data.changePercent;
    const status = diff > 2 ? 'positive' : diff < -2 ? 'negative' : 'neutral';
    sources.push(src('SCB', 'Price trend (YoY)', `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%`, status, 0.8));
  } else { failed++; }

  // 6. ESA Biomass CCI
  queried++;
  const cciRes = await safeCall('ESA Biomass CCI', () => fetchBiomassCCITimeSeries(lat, lng));
  if (cciRes.ok && cciRes.data) {
    const latest = cciRes.data.dataPoints[cciRes.data.dataPoints.length - 1];
    if (latest) {
      sources.push(src('ESA Biomass CCI', 'Satellite biomass', `${latest.biomass.toFixed(0)} t/ha`, 'neutral', 0.7));
    }
  } else { failed++; }

  return { sources, failed, queried };
}

// ─── Compliance Query ───────────────────────────────────────────────

async function queryCompliance(
  lat: number,
  lng: number,
  areaHa: number,
  _species: string,
): Promise<{ sources: IntelligenceSource[]; failed: number; queried: number }> {
  const sources: IntelligenceSource[] = [];
  let failed = 0;
  let queried = 0;

  // 1. Naturvårdsverket compliance check
  queried++;
  const compRes = await safeCall('Naturvårdsverket', () => checkComplianceForParcel(lat, lng, areaHa));
  if (compRes.ok && compRes.data) {
    const pass = compRes.data.compliant;
    sources.push(src('Naturvårdsverket', 'Compliance status', pass ? 'Compliant' : 'Issues found', pass ? 'positive' : 'negative', 0.9));
    if (compRes.data.issues) {
      for (const issue of compRes.data.issues.slice(0, 3)) {
        sources.push(src('Naturvårdsverket', 'Issue', issue, 'negative', 0.85));
      }
    }
  } else { failed++; }

  // 2. Red-listed species (Artportalen)
  queried++;
  const redRes = await safeCall('Artportalen Red List', () => fetchRedListedSpecies(lat, lng, 10));
  if (redRes.ok && redRes.data) {
    const count = redRes.data.length;
    const status = count > 5 ? 'negative' : count > 0 ? 'neutral' : 'positive';
    sources.push(src('Artportalen', 'Red-listed species nearby', `${count} species`, status, 0.75));
  } else { failed++; }

  // 3. Water buffer compliance
  queried++;
  const waterRes = await safeCall('SMHI Hydrology', () => checkWaterBufferCompliance(lat, lng));
  if (waterRes.ok && waterRes.data) {
    const compliant = waterRes.data.compliant;
    sources.push(src('SMHI Hydrology', 'Water buffer', compliant ? 'Adequate' : 'Insufficient', compliant ? 'positive' : 'negative', 0.8));
  } else { failed++; }

  // 4. Protected areas nearby
  queried++;
  const protRes = await safeCall('Naturvårdsverket Protected', () => getNearestProtectedAreas(lat, lng, 5));
  if (protRes.ok && protRes.data) {
    const count = protRes.data.length;
    const status = count > 0 ? 'neutral' : 'positive';
    sources.push(src('Naturvårdsverket', 'Protected areas within 5 km', `${count} areas`, status, 0.8));
  } else { failed++; }

  // 5. Forest change (Hansen deforestation alerts)
  queried++;
  const hansenRes = await safeCall('Hansen Forest Change', () => fetchForestChangeStats(lat, lng, areaHa));
  if (hansenRes.ok && hansenRes.data) {
    const loss = hansenRes.data.totalLossHa;
    const status = loss > areaHa * 0.1 ? 'negative' : loss > 0 ? 'neutral' : 'positive';
    sources.push(src('Hansen/GFW', 'Recent forest loss', `${loss.toFixed(1)} ha`, status, 0.7));
  } else { failed++; }

  return { sources, failed, queried };
}

// ─── General Query (mix of everything) ──────────────────────────────

async function queryGeneral(
  lat: number,
  lng: number,
  areaHa: number,
  species: string,
): Promise<{ sources: IntelligenceSource[]; failed: number; queried: number }> {
  // Run a subset from each domain in parallel
  const [beetle, harvest, financial, compliance] = await Promise.all([
    queryBeetleRisk(lat, lng, areaHa, species),
    queryHarvestTiming(lat, lng, areaHa, species),
    queryFinancial(lat, lng, areaHa, species),
    queryCompliance(lat, lng, areaHa, species),
  ]);

  return {
    sources: [...beetle.sources, ...harvest.sources, ...financial.sources, ...compliance.sources],
    failed: beetle.failed + harvest.failed + financial.failed + compliance.failed,
    queried: beetle.queried + harvest.queried + financial.queried + compliance.queried,
  };
}

// ─── Synthesis helpers ──────────────────────────────────────────────

function computeConvergence(sources: IntelligenceSource[]): number {
  if (sources.length === 0) return 0;
  const negCount = sources.filter((s) => s.status === 'negative').length;
  const posCount = sources.filter((s) => s.status === 'positive').length;
  const dominant = Math.max(negCount, posCount);
  return Math.round((dominant / sources.length) * 100);
}

function computeConfidence(sources: IntelligenceSource[], queried: number, failed: number): number {
  if (sources.length === 0) return 0;
  const avgConf = sources.reduce((sum, s) => sum + s.confidence, 0) / sources.length;
  const availabilityPenalty = queried > 0 ? (queried - failed) / queried : 0;
  return Math.round(avgConf * availabilityPenalty * 100);
}

function computeFinancialImpact(
  sources: IntelligenceSource[],
  areaHa: number,
  queryType: ForestQuery['queryType'],
): string {
  // Look for valuation data in sources
  const valuationSrc = sources.find((s) => s.service === 'Valuation Model');
  if (valuationSrc) {
    const negativeCount = sources.filter((s) => s.status === 'negative').length;
    const riskFraction = negativeCount / Math.max(sources.length, 1);
    const valueStr = valuationSrc.value.replace(/[^\d]/g, '');
    const value = parseInt(valueStr, 10);
    if (!isNaN(value) && value > 0) {
      const atRisk = Math.round(value * riskFraction);
      if (atRisk > 0) {
        return `${new Intl.NumberFormat('sv-SE').format(atRisk)} SEK at risk (${(riskFraction * 100).toFixed(0)}% of asset value)`;
      }
      return `Asset valued at ${valuationSrc.value} — low current risk`;
    }
  }

  // Fallback heuristics per query type
  const negCount = sources.filter((s) => s.status === 'negative').length;
  if (queryType === 'beetle_risk') {
    const lossPerHa = negCount > 3 ? 15000 : negCount > 1 ? 8000 : 2000;
    const total = lossPerHa * areaHa;
    return `Estimated ${new Intl.NumberFormat('sv-SE').format(total)} SEK at risk from beetle damage`;
  }
  if (queryType === 'harvest_timing') {
    const priceSource = sources.find((s) => s.dataPoint.includes('timber price'));
    return priceSource
      ? `Timber market: ${priceSource.value}. Timing affects revenue by ~5-15%.`
      : `Harvest timing can shift revenue by 5-15% — check timber prices.`;
  }
  return `Forest assets: ~${new Intl.NumberFormat('sv-SE').format(areaHa * 40000)} SEK estimated`;
}

function synthesiseSummary(
  sources: IntelligenceSource[],
  queryType: ForestQuery['queryType'],
  parcelName: string,
): string {
  const neg = sources.filter((s) => s.status === 'negative').length;
  const pos = sources.filter((s) => s.status === 'positive').length;
  const total = sources.length;

  if (total === 0) {
    return `Unable to gather data for ${parcelName}. Please try again later.`;
  }

  const riskRatio = neg / total;

  const typeLabel: Record<ForestQuery['queryType'], string> = {
    beetle_risk: 'Beetle & pest risk',
    harvest_timing: 'Harvest timing',
    financial: 'Financial assessment',
    compliance: 'Compliance check',
    general: 'Overall forest intelligence',
  };

  let tone: string;
  if (riskRatio > 0.5) {
    tone = 'Several warning signals detected';
  } else if (riskRatio > 0.25) {
    tone = 'Some concerns noted, but manageable';
  } else {
    tone = 'Conditions look favourable';
  }

  return `${typeLabel[queryType]} for ${parcelName}: ${tone}. Based on ${total} data sources, ${neg} show warnings and ${pos} are positive.`;
}

function generateRecommendations(
  sources: IntelligenceSource[],
  queryType: ForestQuery['queryType'],
): string[] {
  const negSources = sources.filter((s) => s.status === 'negative');
  const actions: string[] = [];

  if (queryType === 'beetle_risk' || negSources.some((s) => s.service.includes('Swarming') || s.dataPoint.includes('beetle'))) {
    if (negSources.length > 3) {
      actions.push('Schedule a field inspection within the next 2 weeks — multiple beetle risk indicators are elevated.');
    }
    if (sources.some((s) => s.dataPoint.includes('Drought') && s.status === 'negative')) {
      actions.push('Monitor drought-stressed trees closely — they are more susceptible to bark beetle attack.');
    }
    if (sources.some((s) => s.dataPoint.includes('predator') && s.status === 'positive')) {
      actions.push('Woodpecker activity is high in your area — preserve standing dead wood to support natural pest control.');
    }
  }

  if (queryType === 'harvest_timing') {
    if (sources.some((s) => s.dataPoint.includes('Dry days') && s.status === 'positive')) {
      actions.push('Weather window looks good for harvest operations in the next 7 days.');
    }
    if (sources.some((s) => s.dataPoint.includes('Weight') && s.status === 'negative')) {
      actions.push('Weight restrictions are active on nearby roads — plan alternative transport routes.');
    }
  }

  if (queryType === 'financial') {
    if (sources.some((s) => s.dataPoint.includes('Price trend') && s.status === 'positive')) {
      actions.push('Timber prices are trending up — consider timing your harvest to capture higher revenue.');
    }
    if (sources.some((s) => s.dataPoint.includes('Carbon') && s.status === 'neutral')) {
      actions.push('Explore carbon credit programmes — your forest stock qualifies for voluntary market offsets.');
    }
  }

  if (queryType === 'compliance') {
    if (negSources.some((s) => s.service === 'Naturvårdsverket')) {
      actions.push('Review compliance issues flagged by Naturvårdsverket before proceeding with any operations.');
    }
    if (sources.some((s) => s.dataPoint.includes('Red-listed') && s.status !== 'positive')) {
      actions.push('Red-listed species detected nearby — consult a certified environmental inspector before harvest.');
    }
  }

  // Ensure at least 2 recommendations
  if (actions.length === 0) {
    actions.push('Continue routine monitoring — no urgent action required at this time.');
    actions.push('Consider scheduling a seasonal forest health review with a certified inspector.');
  } else if (actions.length === 1) {
    actions.push('Keep monitoring data sources regularly for changes in conditions.');
  }

  return actions.slice(0, 3);
}

function computeTimeToAct(sources: IntelligenceSource[], queryType: ForestQuery['queryType']): number | null {
  const negCount = sources.filter((s) => s.status === 'negative').length;
  if (negCount === 0) return null;

  if (queryType === 'beetle_risk') {
    if (negCount > 5) return 7;
    if (negCount > 2) return 14;
    return 30;
  }
  if (queryType === 'harvest_timing') {
    // Weather windows are short
    const drySource = sources.find((s) => s.dataPoint.includes('Dry days'));
    if (drySource && drySource.status === 'positive') return 3;
    return 14;
  }
  if (queryType === 'compliance') {
    return negCount > 2 ? 7 : 30;
  }
  return null;
}

// ─── Main Query Function ────────────────────────────────────────────

const DEFAULT_PARCEL = {
  lat: 57.78,
  lng: 14.16,
  areaHa: 45,
  dominantSpecies: 'Picea abies',
  parcelName: 'Demo Parcel (Småland)',
};

export async function queryForestIntelligence(
  query: ForestQuery,
): Promise<ForestIntelligenceBriefing> {
  const ctx = query.parcelContext ?? DEFAULT_PARCEL;
  const queryType = query.queryType !== 'general'
    ? query.queryType
    : classifyQuestion(query.question);

  // Dispatch to the right query bundle
  let result: { sources: IntelligenceSource[]; failed: number; queried: number };

  switch (queryType) {
    case 'beetle_risk':
      result = await queryBeetleRisk(ctx.lat, ctx.lng, ctx.areaHa, ctx.dominantSpecies);
      break;
    case 'harvest_timing':
      result = await queryHarvestTiming(ctx.lat, ctx.lng, ctx.areaHa, ctx.dominantSpecies);
      break;
    case 'financial':
      result = await queryFinancial(ctx.lat, ctx.lng, ctx.areaHa, ctx.dominantSpecies);
      break;
    case 'compliance':
      result = await queryCompliance(ctx.lat, ctx.lng, ctx.areaHa, ctx.dominantSpecies);
      break;
    default:
      result = await queryGeneral(ctx.lat, ctx.lng, ctx.areaHa, ctx.dominantSpecies);
      break;
  }

  const { sources, failed, queried } = result;

  return {
    summary: synthesiseSummary(sources, queryType, ctx.parcelName),
    financialImpact: computeFinancialImpact(sources, ctx.areaHa, queryType),
    confidencePercent: computeConfidence(sources, queried, failed),
    sources,
    convergenceScore: computeConvergence(sources),
    recommendedActions: generateRecommendations(sources, queryType),
    timeToAct: computeTimeToAct(sources, queryType),
    disclaimer:
      'This briefing is generated from open data sources and statistical models. ' +
      'It does not replace professional forestry advice. Always verify critical ' +
      'decisions with a certified forest inspector.',
    sourcesQueried: queried,
    sourcesFailed: failed,
  };
}

// ─── Available Data Sources ─────────────────────────────────────────

export function getAvailableDataSources(): DataSourceInfo[] {
  return [
    { id: 'swarming-model', name: 'BeetleSense Swarming Model', description: 'Multi-factor Ips typographus swarming probability', category: 'beetle' },
    { id: 'era5-soil', name: ERA5_SOURCE_INFO.name, description: 'Soil moisture and drought monitoring from ERA5 reanalysis', category: 'weather' },
    { id: 'gbif', name: BIODIVERSITY_SOURCE_INFO.name, description: 'Species occurrences and beetle predator indices', category: 'biodiversity' },
    { id: 'inaturalist', name: INATURALIST_SOURCE_INFO.name, description: 'Citizen science beetle and indicator species sightings', category: 'biodiversity' },
    { id: 'artportalen', name: ARTPORTALEN_SOURCE_INFO.name, description: 'Swedish species observation database including bark beetle records', category: 'biodiversity' },
    { id: 'msb-fire', name: MSB_FIRE_SOURCE_INFO.name, description: 'Swedish fire risk forecasts and active warnings', category: 'weather' },
    { id: 'open-meteo', name: OPEN_METEO_SOURCE_INFO.name, description: 'Weather forecasts and beetle emergence condition checks', category: 'weather' },
    { id: 'soilgrids', name: SOILGRIDS_SOURCE_INFO.name, description: 'Soil properties, trafficability, and soil-based beetle risk', category: 'beetle' },
    { id: 'effis', name: EFFIS_SOURCE_INFO.name, description: 'European fire danger forecasts and burnt area data', category: 'weather' },
    { id: 'fordri', name: FORDRI_SOURCE_INFO.name, description: 'Forest drought response index and beetle risk multiplier', category: 'beetle' },
    { id: 'scb', name: SCB_SOURCE_INFO.name, description: 'Swedish timber prices and forestry statistics', category: 'financial' },
    { id: 'carbon-biomass', name: CARBON_SOURCE_INFO.name, description: 'Biomass estimation, carbon stock, and forest valuation', category: 'financial' },
    { id: 'esa-biomass-cci', name: ESA_BIOMASS_CCI_SOURCE_INFO.name, description: 'Satellite-derived above-ground biomass estimates', category: 'satellite' },
    { id: 'trafikverket', name: TRAFIKVERKET_SOURCE_INFO.name, description: 'Road conditions, weight restrictions, and harvest accessibility', category: 'logistics' },
    { id: 'smhi-hydrology', name: SMHI_HYDROLOGY_SOURCE_INFO.name, description: 'Water stations and harvest buffer zone compliance', category: 'compliance' },
    { id: 'naturvardsverket', name: NATURVARDSVERKET_SOURCE_INFO.name, description: 'Protected areas and environmental compliance checks', category: 'compliance' },
    { id: 'drought-observatory', name: DROUGHT_OBSERVATORY_SOURCE_INFO.name, description: 'JRC combined drought indicators for Europe', category: 'weather' },
    { id: 'hansen', name: HANSEN_SOURCE_INFO.name, description: 'Global forest change detection (tree cover loss)', category: 'satellite' },
    { id: 'worldcover', name: WORLDCOVER_SOURCE_INFO.name, description: 'ESA WorldCover land classification at 10m resolution', category: 'satellite' },
    { id: 'nasa-firms', name: FIRMS_SOURCE_INFO.name, description: 'Near-real-time active fire detections from MODIS/VIIRS', category: 'weather' },
    { id: 'fao-fra', name: FAO_FRA_SOURCE_INFO.name, description: 'FAO global forest resource statistics and benchmarks', category: 'financial' },
  ];
}

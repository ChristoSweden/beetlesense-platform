/**
 * ISRIC SoilGrids 250m — Global Soil Properties
 *
 * Globally consistent, data-driven predictions of soil properties at 250m
 * resolution. Used for assessing harvesting trafficability, drought stress
 * vulnerability, and beetle risk modifiers based on soil conditions.
 *
 * Soil texture (clay/sand/silt ratio) directly affects:
 *   - Water holding capacity → drought stress → beetle vulnerability
 *   - Trafficability → can harvesting machinery operate without damage?
 *   - Root stability → windthrow risk after beetle-thinned stands
 *
 * WMS: https://maps.isric.org/mapserv?map=/map/soilgrids.map
 * WCS: same endpoint with SERVICE=WCS
 * Documentation: https://www.isric.org/explore/soilgrids
 */

// ─── Types ───

export interface SoilProperties {
  location: { lat: number; lng: number };
  depth: string;                  // "0-5cm", "5-15cm", "15-30cm", etc.
  ph: number;                     // 4.5-8.5
  organicCarbon: number;          // g/kg
  clay: number;                   // %
  sand: number;                   // %
  silt: number;                   // %
  bulkDensity: number;            // kg/dm³
  waterHoldingCapacity: 'low' | 'medium' | 'high';
  trafficability: 'good' | 'moderate' | 'poor';
  beetleRiskModifier: number;     // 0.8-1.3
}

export interface SoilGridsWCSResponse {
  type: string;
  properties: Record<string, number>;
}

// ─── Constants ───

const WMS_BASE = 'https://maps.isric.org/mapserv?map=/map/soilgrids.map';

/** Available SoilGrids layers */
export const SOILGRIDS_LAYERS = {
  phh2o: 'pH in H₂O',
  soc:   'Soil organic carbon',
  clay:  'Clay content',
  sand:  'Sand content',
  silt:  'Silt content',
  bdod:  'Bulk density',
  ocd:   'Organic carbon density',
} as const;

/** Standard depth intervals available in SoilGrids */
const DEPTH_INTERVALS = [
  '0-5cm',
  '5-15cm',
  '15-30cm',
  '30-60cm',
  '60-100cm',
  '100-200cm',
] as const;

// ─── Source Info ───

export const SOILGRIDS_SOURCE_INFO = {
  name: 'ISRIC SoilGrids 250m v2.0',
  provider: 'ISRIC — World Soil Information',
  resolution: '250m',
  coverage: 'Global',
  depths: DEPTH_INTERVALS,
  layers: Object.keys(SOILGRIDS_LAYERS),
  license: 'CC BY 4.0',
  wmsUrl: WMS_BASE,
  documentation: 'https://www.isric.org/explore/soilgrids',
  beetleRelevance:
    'Sandy, well-drained soils dry out faster under heat stress, increasing ' +
    'drought vulnerability of Norway spruce (Picea abies) and boosting ' +
    'Ips typographus colonization success on water-stressed trees.',
};

// ─── Cache ───

let cachedSoil: { data: Map<string, SoilProperties>; fetchedAt: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours — soil doesn't change

// ─── Demo Data ───

/**
 * Realistic soil properties for typical Småland (southern Sweden) forest soils.
 * Swedish boreal/hemiboreal forests grow predominantly on glacial till and
 * sandy moraine soils with acidic pH from conifer needle litter.
 */
function generateDemoSoilProperties(lat: number, lng: number): SoilProperties {
  // Add slight spatial variation based on coordinates
  const seed = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233) * 43758.5453) % 1;

  // Typical Swedish forest soil — sandy glacial till
  const clay = 8 + seed * 12;        // 8-20%, low clay typical of moraine soils
  const sand = 45 + seed * 20;       // 45-65%, sandy glacial deposits
  const silt = 100 - clay - sand;    // remainder

  const ph = 4.5 + seed * 1.2;       // 4.5-5.7, acidic from conifer litter
  const organicCarbon = 15 + seed * 35; // 15-50 g/kg, high in boreal forests
  const bulkDensity = 1.1 + seed * 0.4; // 1.1-1.5 kg/dm³

  const waterHoldingCapacity = assessWaterHoldingCapacity(clay, sand, organicCarbon);
  const trafficability = assessTrafficability(clay, sand, 0.5); // assume moderate moisture
  const beetleRiskModifier = calculateBeetleRiskFromSoil({
    location: { lat, lng },
    depth: '0-5cm',
    ph,
    organicCarbon,
    clay,
    sand,
    silt,
    bulkDensity,
    waterHoldingCapacity,
    trafficability,
    beetleRiskModifier: 1.0, // placeholder, will be overwritten
  });

  return {
    location: { lat, lng },
    depth: '0-5cm',
    ph: Math.round(ph * 10) / 10,
    organicCarbon: Math.round(organicCarbon * 10) / 10,
    clay: Math.round(clay * 10) / 10,
    sand: Math.round(sand * 10) / 10,
    silt: Math.round(silt * 10) / 10,
    bulkDensity: Math.round(bulkDensity * 100) / 100,
    waterHoldingCapacity,
    trafficability,
    beetleRiskModifier,
  };
}

// ─── Helpers ───

/**
 * Create a cache key from coordinates.
 */
function locationKey(lat: number, lng: number): string {
  return `${lat.toFixed(4)},${lng.toFixed(4)}`;
}

/**
 * Assess water holding capacity from soil texture and organic carbon.
 * Sandy soils drain quickly → low WHC → drought-prone.
 * Clay-rich soils retain water → high WHC but poor aeration.
 */
function assessWaterHoldingCapacity(
  clay: number,
  sand: number,
  organicCarbon: number,
): 'low' | 'medium' | 'high' {
  // Simple pedotransfer estimate
  const whcScore = clay * 0.4 + (100 - sand) * 0.3 + organicCarbon * 0.1;

  if (whcScore > 40) return 'high';
  if (whcScore > 25) return 'medium';
  return 'low';
}

// ─── Public API ───

/**
 * Assess whether harvesting machinery can operate safely on the soil.
 *
 * High clay + high moisture = compaction risk and rutting.
 * Sandy soils generally have good trafficability even when moist.
 * Swedish forestry guidelines recommend frozen-ground harvesting for
 * clay soils with > 40% moisture.
 *
 * @param clay - Clay content in %
 * @param sand - Sand content in %
 * @param moisture - Volumetric soil moisture (0-1)
 */
export function assessTrafficability(
  clay: number,
  sand: number,
  moisture: number,
): 'good' | 'moderate' | 'poor' {
  // Clay-rich soils are most vulnerable to compaction
  const compactionRisk = clay * 0.6 + moisture * 50;

  // Sandy soils drain well and support machinery
  const drainageBonus = sand * 0.2;

  const score = compactionRisk - drainageBonus;

  if (score > 30) return 'poor';
  if (score > 15) return 'moderate';
  return 'good';
}

/**
 * Calculate beetle risk modifier from soil properties.
 *
 * Sandy, well-drained soils dry out quickly during hot summers,
 * stressing Norway spruce (Picea abies) which has shallow roots.
 * Drought-stressed trees have reduced resin production, making them
 * more vulnerable to Ips typographus colonization.
 *
 * Returns a multiplier (0.8-1.3) applied to the base beetle risk score.
 */
export function calculateBeetleRiskFromSoil(soilProps: SoilProperties): number {
  const { sand, clay, organicCarbon, ph } = soilProps;

  let modifier = 1.0;

  // High sand → fast drainage → drought risk → higher beetle vulnerability
  if (sand > 60) modifier += 0.15;
  else if (sand > 50) modifier += 0.08;

  // Low clay → less water retention
  if (clay < 10) modifier += 0.05;

  // Low organic carbon → poor water retention in topsoil
  if (organicCarbon < 15) modifier += 0.05;

  // Very acidic soils (pH < 4.5) stress root fungi, weakening tree health
  if (ph < 4.5) modifier += 0.05;

  // High clay with good organic matter → good water retention → lower risk
  if (clay > 20 && organicCarbon > 30) modifier -= 0.1;

  // Clamp to valid range
  return Math.round(Math.max(0.8, Math.min(1.3, modifier)) * 100) / 100;
}

/**
 * Fetch soil properties at a geographic point.
 * Queries ISRIC SoilGrids WCS endpoint, falls back to demo data.
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 */
export async function fetchSoilProperties(
  lat: number,
  lng: number,
): Promise<SoilProperties> {
  const key = locationKey(lat, lng);

  // Return cached data if fresh
  if (cachedSoil && Date.now() - cachedSoil.fetchedAt < CACHE_TTL) {
    const cached = cachedSoil.data.get(key);
    if (cached) return cached;
  }

  // Attempt WCS GetCoverage for each property at the point
  try {
    const properties = ['phh2o', 'soc', 'clay', 'sand', 'silt', 'bdod'] as const;
    const values: Record<string, number> = {};

    for (const prop of properties) {
      const url =
        `${WMS_BASE}&SERVICE=WCS&VERSION=2.0.1&REQUEST=GetCoverage&` +
        `COVERAGEID=${prop}_0-5cm_mean&` +
        `FORMAT=application/json&` +
        `SUBSET=long(${lng})&SUBSET=lat(${lat})`;

      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (response.ok) {
        const text = await response.text();
        const val = parseFloat(text);
        if (!isNaN(val)) {
          values[prop] = val;
        }
      }
    }

    // If we got data, convert SoilGrids units to standard units
    if (Object.keys(values).length >= 3) {
      const phRaw = (values['phh2o'] ?? 50) / 10;        // SoilGrids pH × 10
      const socRaw = (values['soc'] ?? 200) / 10;         // dg/kg → g/kg
      const clayRaw = (values['clay'] ?? 100) / 10;       // g/kg → %
      const sandRaw = (values['sand'] ?? 500) / 10;       // g/kg → %
      const siltRaw = (values['silt'] ?? 400) / 10;       // g/kg → %
      const bdodRaw = (values['bdod'] ?? 130) / 100;      // cg/cm³ → kg/dm³

      const whc = assessWaterHoldingCapacity(clayRaw, sandRaw, socRaw);
      const traf = assessTrafficability(clayRaw, sandRaw, 0.5);

      const soil: SoilProperties = {
        location: { lat, lng },
        depth: '0-5cm',
        ph: Math.round(phRaw * 10) / 10,
        organicCarbon: Math.round(socRaw * 10) / 10,
        clay: Math.round(clayRaw * 10) / 10,
        sand: Math.round(sandRaw * 10) / 10,
        silt: Math.round(siltRaw * 10) / 10,
        bulkDensity: Math.round(bdodRaw * 100) / 100,
        waterHoldingCapacity: whc,
        trafficability: traf,
        beetleRiskModifier: 1.0,
      };
      soil.beetleRiskModifier = calculateBeetleRiskFromSoil(soil);

      if (!cachedSoil || Date.now() - cachedSoil.fetchedAt >= CACHE_TTL) {
        cachedSoil = { data: new Map(), fetchedAt: Date.now() };
      }
      cachedSoil.data.set(key, soil);

      return soil;
    }
  } catch {
    // WCS unavailable — fall back to demo data
  }

  // Simulate API delay
  await new Promise(r => setTimeout(r, 200));

  const soil = generateDemoSoilProperties(lat, lng);

  if (!cachedSoil || Date.now() - cachedSoil.fetchedAt >= CACHE_TTL) {
    cachedSoil = { data: new Map(), fetchedAt: Date.now() };
  }
  cachedSoil.data.set(key, soil);

  return soil;
}

/**
 * Get MapLibre-compatible WMS tile URL for a SoilGrids property layer.
 * Renders soil data as a color-coded overlay on the map.
 *
 * @param property - SoilGrids layer name (default: 'clay')
 */
export function getSoilGridsTileUrl(
  property: keyof typeof SOILGRIDS_LAYERS = 'clay',
): string {
  return (
    `${WMS_BASE}&` +
    'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&' +
    `LAYERS=${property}_0-5cm_mean&` +
    'STYLES=&' +
    'SRS=EPSG:3857&' +
    'TRANSPARENT=true&' +
    'FORMAT=image/png&' +
    'WIDTH=256&HEIGHT=256&' +
    'BBOX={bbox-epsg-3857}'
  );
}

/**
 * Hansen Global Forest Change (University of Maryland)
 *
 * Year-by-year tree cover loss and gain at 30m resolution, derived from
 * Landsat time series. The definitive global dataset for tracking
 * deforestation, harvesting, and natural disturbance (storms, beetles, fire).
 *
 * Key products:
 *   - treecover2000: Baseline canopy cover % in year 2000
 *   - loss: Year of tree cover loss (1-23 = 2001-2023)
 *   - gain: Binary tree cover gain 2000-2012
 *   - lossyear: Year of gross tree cover loss event
 *
 * Tile URL: https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11/
 * Paper: Hansen et al. 2013, Science 342(6160)
 * Documentation: https://glad.earthengine.app/view/global-forest-change
 */

// ─── Types ───

export interface ForestChangeStats {
  bbox: [number, number, number, number];
  treecover2000Pct: number;
  totalLossHa: number;
  totalGainHa: number;
  netChangeHa: number;
  lossYears: { year: number; lossHa: number }[];
  dominantLossYear: number;
  trend: 'stable' | 'losing' | 'recovering';
}

export interface ForestChangeTileConfig {
  layer: 'treecover2000' | 'loss' | 'gain' | 'lossyear';
  url: string;
  description: string;
}

// ─── Constants ───

const TILE_BASE = 'https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11';

/** Hansen tile layers available for MapLibre overlay */
const LAYER_CONFIGS: Record<string, { path: string; description: string }> = {
  treecover2000: {
    path: 'treecover2000',
    description: 'Baseline tree canopy cover in year 2000 (0-100%)',
  },
  loss: {
    path: 'loss',
    description: 'Tree cover loss (red = recent, blue = older)',
  },
  gain: {
    path: 'gain',
    description: 'Tree cover gain 2000-2012 (binary)',
  },
  lossyear: {
    path: 'lossyear',
    description: 'Year of tree cover loss event (1-23 = 2001-2023)',
  },
};

// ─── Source Info ───

export const HANSEN_SOURCE_INFO = {
  name: 'Hansen Global Forest Change v1.11',
  provider: 'University of Maryland / GLAD Lab',
  resolution: '30m (Landsat-derived)',
  coverage: 'Global',
  timespan: '2000-2023',
  sensor: 'Landsat 5, 7, 8, 9',
  citation: 'Hansen, M.C. et al. 2013. Science 342(6160): 850-853',
  license: 'Creative Commons Attribution 4.0',
  tileUrl: TILE_BASE,
  documentation: 'https://glad.earthengine.app/view/global-forest-change',
  beetleRelevance:
    'Tree cover loss patterns reveal harvesting activity, storm damage, and ' +
    'potential beetle outbreak zones. Sudden loss events in spruce-dominated ' +
    'stands during summer months are strong indicators of Ips typographus mass attack.',
};

// ─── Cache ───

let cachedStats: { data: Map<string, ForestChangeStats>; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

// ─── Demo Data ───

/**
 * Realistic forest change statistics for Småland (southern Sweden).
 *
 * Småland is one of Sweden's most forested regions (~75% forest cover).
 * Annual loss is driven by planned harvesting (final felling & thinning),
 * with occasional storm events (e.g., Gudrun 2005, Per 2007) and beetle
 * outbreaks (2018-2020 following extreme drought summers).
 */
function generateDemoStats(bbox: [number, number, number, number]): ForestChangeStats {
  // Estimate area from bbox
  const latSpan = Math.abs(bbox[3] - bbox[1]);
  const lngSpan = Math.abs(bbox[2] - bbox[0]);
  const areaKm2 = latSpan * 111.32 * lngSpan * 111.32 *
    Math.cos(((bbox[1] + bbox[3]) / 2) * Math.PI / 180);
  const areaHa = areaKm2 * 100;

  // Spatial variation seed
  const seed = Math.abs(Math.sin(bbox[0] * 17.3 + bbox[1] * 43.7) * 43758.5453) % 1;

  // Baseline: ~75-85% tree cover in year 2000 (typical Småland)
  const treecover2000Pct = 75 + seed * 10;

  // Year-by-year loss — reflects real Swedish forestry events:
  //   2005: Storm Gudrun (massive windthrow in southern Sweden)
  //   2007: Storm Per (follow-up storm damage)
  //   2018-2020: Extreme drought + beetle outbreak
  //   Other years: Normal harvesting (~1-1.5% of forest area/year)
  const normalLossRate = 0.008 + seed * 0.004; // 0.8-1.2% annual harvest rate
  const forestHa = areaHa * treecover2000Pct / 100;

  const lossYears: { year: number; lossHa: number }[] = [];
  let totalLossHa = 0;

  for (let yr = 2001; yr <= 2023; yr++) {
    let factor = 1.0;

    // Storm Gudrun 2005 — 4-8x normal loss in southern Sweden
    if (yr === 2005) factor = 4.0 + seed * 4.0;
    // Storm Per 2007 — 2-3x normal
    else if (yr === 2007) factor = 2.0 + seed * 1.5;
    // 2018 drought + beetle outbreak onset
    else if (yr === 2018) factor = 2.5 + seed * 1.5;
    // 2019-2020 beetle outbreak peak
    else if (yr === 2019) factor = 2.8 + seed * 1.2;
    else if (yr === 2020) factor = 2.2 + seed * 1.0;
    // 2021-2023 beetle declining but still elevated
    else if (yr === 2021) factor = 1.5 + seed * 0.5;
    else if (yr === 2022) factor = 1.2 + seed * 0.3;
    // Minor year-to-year variation
    else factor = 0.8 + seed * 0.4;

    const lossHa = Math.round(forestHa * normalLossRate * factor * 10) / 10;
    lossYears.push({ year: yr, lossHa });
    totalLossHa += lossHa;
  }

  totalLossHa = Math.round(totalLossHa * 10) / 10;

  // Gain — Swedish replanting is active but slower than loss accumulation
  // Hansen gain layer only covers 2000-2012
  const totalGainHa = Math.round(totalLossHa * (0.55 + seed * 0.2) * 10) / 10;
  const netChangeHa = Math.round((totalGainHa - totalLossHa) * 10) / 10;

  // Find dominant loss year
  const sorted = [...lossYears].sort((a, b) => b.lossHa - a.lossHa);
  const dominantLossYear = sorted[0]?.year ?? 2005;

  // Trend assessment
  const recentLoss = lossYears
    .filter(y => y.year >= 2020)
    .reduce((sum, y) => sum + y.lossHa, 0);
  const olderLoss = lossYears
    .filter(y => y.year >= 2015 && y.year < 2020)
    .reduce((sum, y) => sum + y.lossHa, 0);

  let trend: 'stable' | 'losing' | 'recovering';
  if (recentLoss > olderLoss * 1.2) {
    trend = 'losing';
  } else if (recentLoss < olderLoss * 0.7) {
    trend = 'recovering';
  } else {
    trend = 'stable';
  }

  return {
    bbox,
    treecover2000Pct: Math.round(treecover2000Pct * 10) / 10,
    totalLossHa,
    totalGainHa,
    netChangeHa,
    lossYears,
    dominantLossYear,
    trend,
  };
}

// ─── Helpers ───

/**
 * Create a cache key from a bounding box.
 */
function bboxKey(bbox: [number, number, number, number]): string {
  return bbox.map(v => v.toFixed(4)).join(',');
}

// ─── Public API ───

/**
 * Get MapLibre-compatible tile URL for a Hansen Global Forest Change layer.
 *
 * @param layer - Layer name: 'treecover2000', 'loss', 'gain', or 'lossyear'
 */
export function getForestChangeTileUrl(
  layer: 'treecover2000' | 'loss' | 'gain' | 'lossyear' = 'loss',
): ForestChangeTileConfig {
  const config = LAYER_CONFIGS[layer] ?? LAYER_CONFIGS['loss']!;

  return {
    layer,
    url: `${TILE_BASE}/${config.path}/{z}/{x}/{y}.png`,
    description: config.description,
  };
}

/**
 * Fetch forest change summary statistics for a bounding box.
 * Returns year-by-year loss, total gain, and trend assessment.
 *
 * In production this would query Google Earth Engine or a pre-computed
 * tile summary service. Currently returns realistic demo data modeled
 * on actual Swedish forestry statistics and known disturbance events
 * (storms Gudrun 2005, Per 2007, and the 2018-2020 beetle outbreak).
 *
 * @param bbox - [west, south, east, north] in WGS84
 */
export async function fetchForestChangeStats(
  bbox: [number, number, number, number],
): Promise<ForestChangeStats> {
  const key = bboxKey(bbox);

  // Return cached data if fresh
  if (cachedStats && Date.now() - cachedStats.fetchedAt < CACHE_TTL) {
    const cached = cachedStats.data.get(key);
    if (cached) return cached;
  }

  // Simulate API delay
  await new Promise(r => setTimeout(r, 300));

  const stats = generateDemoStats(bbox);

  if (!cachedStats || Date.now() - cachedStats.fetchedAt >= CACHE_TTL) {
    cachedStats = { data: new Map(), fetchedAt: Date.now() };
  }
  cachedStats.data.set(key, stats);

  return stats;
}

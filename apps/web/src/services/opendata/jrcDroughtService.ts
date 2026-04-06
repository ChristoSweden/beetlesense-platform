/**
 * JRC European Drought Observatory (EDO)
 *
 * Free WMS service providing drought indicators across Europe.
 * Drought is a primary driver of bark beetle outbreaks — water-stressed
 * conifers cannot produce enough resin to defend against Ips typographus,
 * and warm dry conditions accelerate beetle reproduction cycles.
 *
 * WMS: https://edo.jrc.ec.europa.eu/geoserver/wms
 * Portal: https://edo.jrc.ec.europa.eu/edov2/php/index.php?id=1000
 *
 * Available layers:
 *   - edo:cdi_current     — Combined Drought Indicator
 *   - edo:sma_current     — Soil Moisture Anomaly
 *   - edo:fapar_anomaly   — Vegetation productivity anomaly (fAPAR)
 */

// ─── Types ───

export interface DroughtIndicator {
  date: string;
  combinedDroughtIndex: 'watch' | 'warning' | 'alert' | 'none';
  soilMoistureAnomaly: number;   // -1 to 1 (negative = drier than normal)
  faparAnomaly: number;          // vegetation productivity anomaly (-1 to 1)
  precipitationDeficit: number;  // mm below normal (positive = deficit)
  recommendation: string;
}

export interface DroughtStatus {
  location: string;
  indicator: DroughtIndicator;
  beetleRiskFactor: number;      // 1.0 = baseline, higher = elevated risk
  summary: string;
}

// ─── Constants ───

const EDO_WMS_BASE = 'https://edo.jrc.ec.europa.eu/geoserver/wms';

const EDO_LAYERS = {
  cdi: 'edo:cdi_current',
  soilMoisture: 'edo:sma_current',
  fapar: 'edo:fapar_anomaly',
} as const;

/** Sweden bounding box */
const SWEDEN_BBOX = {
  west: 10.5,
  south: 55.0,
  east: 24.5,
  north: 69.5,
};

// ─── Source Info ───

export const DROUGHT_OBSERVATORY_SOURCE_INFO = {
  name: 'European Drought Observatory (EDO)',
  provider: 'European Commission — Joint Research Centre (JRC)',
  layers: {
    cdi: 'Combined Drought Indicator — merges precipitation, soil moisture, and vegetation stress',
    soilMoisture: 'Soil Moisture Anomaly — deviation from long-term average',
    fapar: 'fAPAR Anomaly — vegetation photosynthetic activity vs. long-term average',
  },
  resolution: '~5km (CDI) / ~1km (soil moisture, fAPAR)',
  updateFrequency: 'Dekadal (every 10 days)',
  license: 'Open access (European Commission / JRC)',
  wmsUrl: EDO_WMS_BASE,
  portalUrl: 'https://edo.jrc.ec.europa.eu/edov2/php/index.php?id=1000',
  swedenBbox: SWEDEN_BBOX,
  beetleRelevance:
    'Drought is the strongest environmental predictor of bark beetle outbreaks. ' +
    'Water-stressed Norway spruce produces 60-80% less resin, severely compromising ' +
    'defense against Ips typographus. Consecutive dry years create compounding risk.',
};

// ─── Cache ───

let cachedDrought: { data: DroughtIndicator; fetchedAt: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour — drought indicators update every 10 days

// ─── Demo Data ───

/** Moderate drought in Småland region — spring 2026 */
const DEMO_DROUGHT_INDICATOR: DroughtIndicator = {
  date: '2026-04-05',
  combinedDroughtIndex: 'warning',
  soilMoistureAnomaly: -0.38,     // soil notably drier than normal
  faparAnomaly: -0.15,            // vegetation productivity slightly reduced
  precipitationDeficit: 42,        // 42mm below normal for the period
  recommendation:
    'Drought warning active for Småland region. Soil moisture 38% below the ' +
    'long-term average. Norway spruce stands on sandy or shallow soils are ' +
    'under significant water stress. Reduced resin production makes these trees ' +
    'highly vulnerable to bark beetle colonization. Prioritize beetle monitoring ' +
    'in drought-affected spruce stands. Consider postponing thinning operations ' +
    'that would expose remaining trees to additional stress.',
};

const DEMO_STATUS: DroughtStatus = {
  location: 'Småland, southern Sweden',
  indicator: DEMO_DROUGHT_INDICATOR,
  beetleRiskFactor: 2.1,
  summary:
    'Moderate drought conditions in Småland with soil moisture 38% below normal. ' +
    'Vegetation stress is becoming visible in satellite data. Bark beetle risk ' +
    'elevated to 2.1x baseline — spruce stands on well-drained soils are most ' +
    'vulnerable. 42mm precipitation deficit this period.',
};

// ─── Helpers ───

/**
 * Map a CDI numeric value to a drought classification.
 * CDI values: 0 = none, 1 = watch, 2 = warning, 3 = alert
 */
function classifyCDI(value: number): DroughtIndicator['combinedDroughtIndex'] {
  if (value >= 2.5) return 'alert';
  if (value >= 1.5) return 'warning';
  if (value >= 0.5) return 'watch';
  return 'none';
}

/**
 * Calculate beetle risk factor based on drought indicators.
 * Drought severely reduces conifer resin defenses.
 */
function calculateBeetleRiskFactor(indicator: DroughtIndicator): number {
  let factor = 1.0;

  // Soil moisture anomaly impact (most important factor)
  if (indicator.soilMoistureAnomaly < -0.5) {
    factor += 1.5;
  } else if (indicator.soilMoistureAnomaly < -0.3) {
    factor += 1.0;
  } else if (indicator.soilMoistureAnomaly < -0.15) {
    factor += 0.5;
  }

  // CDI classification impact
  switch (indicator.combinedDroughtIndex) {
    case 'alert': factor += 0.8; break;
    case 'warning': factor += 0.4; break;
    case 'watch': factor += 0.2; break;
    default: break;
  }

  // Vegetation stress impact (reduced fAPAR means trees are struggling)
  if (indicator.faparAnomaly < -0.3) {
    factor += 0.5;
  } else if (indicator.faparAnomaly < -0.1) {
    factor += 0.2;
  }

  return Math.round(factor * 10) / 10;
}

/**
 * Build a recommendation string based on drought status.
 */
function buildRecommendation(indicator: DroughtIndicator): string {
  switch (indicator.combinedDroughtIndex) {
    case 'none':
      return 'No drought conditions detected. Soil moisture is within normal range. ' +
        'Standard beetle monitoring schedule applies.';
    case 'watch':
      return 'Drought watch active. Precipitation is below normal and soil moisture is ' +
        'declining. Begin increased monitoring of spruce stands on well-drained soils. ' +
        'Tree resin defenses may be slightly reduced.';
    case 'warning':
      return 'Drought warning active. Soil moisture significantly below average. ' +
        'Norway spruce under notable water stress with reduced resin production. ' +
        'Increase beetle trap monitoring frequency. Prioritize inspections of ' +
        'spruce stands on sandy and shallow soils.';
    case 'alert':
      return 'DROUGHT ALERT. Severe moisture deficit — trees under extreme water stress. ' +
        'Resin defenses critically reduced (60-80% below normal). Expect elevated ' +
        'bark beetle activity. Deploy additional pheromone traps. Postpone thinning ' +
        'operations. Consider emergency sanitation felling of infested trees.';
  }
}

// ─── Public API ───

/**
 * Get a MapLibre-compatible WMS tile URL for EDO drought overlays.
 *
 * @param layer - EDO layer key: 'cdi', 'soilMoisture', 'fapar'
 */
export function getDroughtTileUrl(
  layer: keyof typeof EDO_LAYERS = 'cdi',
): string {
  const layerName = EDO_LAYERS[layer];
  return (
    `${EDO_WMS_BASE}?` +
    'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&' +
    `LAYERS=${layerName}&` +
    'STYLES=&' +
    'SRS=EPSG:3857&' +
    'TRANSPARENT=true&' +
    'FORMAT=image/png&' +
    'WIDTH=256&HEIGHT=256&' +
    'BBOX={bbox-epsg-3857}'
  );
}

/**
 * Fetch drought indicator data for a specific coordinate using WMS GetFeatureInfo.
 * Falls back to demo data when the EDO service is unavailable.
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 */
export async function fetchDroughtIndicator(
  lat: number,
  lng: number,
): Promise<DroughtIndicator> {
  // Return cached data if fresh
  if (cachedDrought && Date.now() - cachedDrought.fetchedAt < CACHE_TTL) {
    return cachedDrought.data;
  }

  try {
    const delta = 0.05;
    const bboxStr = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;

    // Query CDI layer
    const cdiUrl =
      `${EDO_WMS_BASE}?` +
      'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&' +
      `LAYERS=${EDO_LAYERS.cdi}&` +
      `QUERY_LAYERS=${EDO_LAYERS.cdi}&` +
      'INFO_FORMAT=application/json&' +
      'SRS=EPSG:4326&' +
      `BBOX=${bboxStr}&` +
      'WIDTH=256&HEIGHT=256&' +
      'X=128&Y=128';

    // Query soil moisture layer in parallel
    const smaUrl =
      `${EDO_WMS_BASE}?` +
      'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetFeatureInfo&' +
      `LAYERS=${EDO_LAYERS.soilMoisture}&` +
      `QUERY_LAYERS=${EDO_LAYERS.soilMoisture}&` +
      'INFO_FORMAT=application/json&' +
      'SRS=EPSG:4326&' +
      `BBOX=${bboxStr}&` +
      'WIDTH=256&HEIGHT=256&' +
      'X=128&Y=128';

    const [cdiResponse, smaResponse] = await Promise.all([
      fetch(cdiUrl, { signal: AbortSignal.timeout(8000) }),
      fetch(smaUrl, { signal: AbortSignal.timeout(8000) }),
    ]);

    if (cdiResponse.ok) {
      const cdiJson = await cdiResponse.json();
      const cdiFeatures = cdiJson?.features;

      let smaValue = 0;
      if (smaResponse.ok) {
        const smaJson = await smaResponse.json();
        const smaFeatures = smaJson?.features;
        if (smaFeatures && smaFeatures.length > 0) {
          smaValue = parseFloat(smaFeatures[0].properties?.GRAY_INDEX ?? '0');
        }
      }

      if (cdiFeatures && cdiFeatures.length > 0) {
        const props = cdiFeatures[0].properties;
        const cdiValue = parseFloat(props?.GRAY_INDEX ?? props?.cdi ?? '0');
        const combinedDroughtIndex = classifyCDI(cdiValue);

        // Normalize soil moisture anomaly to -1..1 range
        const soilMoistureAnomaly = Math.max(-1, Math.min(1, smaValue));

        const indicator: DroughtIndicator = {
          date: new Date().toISOString().split('T')[0]!,
          combinedDroughtIndex,
          soilMoistureAnomaly: Math.round(soilMoistureAnomaly * 100) / 100,
          faparAnomaly: 0, // Would need separate query — simplified for now
          precipitationDeficit: 0, // Derived from other sources
          recommendation: '',
        };
        indicator.recommendation = buildRecommendation(indicator);

        cachedDrought = { data: indicator, fetchedAt: Date.now() };
        return indicator;
      }
    }
  } catch {
    // EDO service unavailable — fall back to demo data
  }

  // Fall back to demo data
  cachedDrought = { data: DEMO_DROUGHT_INDICATOR, fetchedAt: Date.now() };
  return DEMO_DROUGHT_INDICATOR;
}

/**
 * Get a comprehensive, human-readable drought status for a coordinate.
 * Combines CDI, soil moisture, and vegetation data with beetle risk assessment.
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 */
export async function getCombinedDroughtStatus(
  lat: number,
  lng: number,
): Promise<DroughtStatus> {
  const indicator = await fetchDroughtIndicator(lat, lng);
  const beetleRiskFactor = calculateBeetleRiskFactor(indicator);

  // Determine location description based on coordinates
  let location = 'Sweden';
  if (lat < 58 && lng > 13 && lng < 17) {
    location = 'Småland, southern Sweden';
  } else if (lat < 58) {
    location = 'Götaland, southern Sweden';
  } else if (lat < 62) {
    location = 'Svealand, central Sweden';
  } else {
    location = 'Norrland, northern Sweden';
  }

  // Build human-readable summary
  const moisturePercent = Math.abs(Math.round(indicator.soilMoistureAnomaly * 100));
  const moistureDir = indicator.soilMoistureAnomaly < 0 ? 'below' : 'above';

  let summary: string;
  if (indicator.combinedDroughtIndex === 'none') {
    summary =
      `No drought conditions in ${location}. Soil moisture is within normal range. ` +
      `Bark beetle risk at baseline (${beetleRiskFactor}x).`;
  } else {
    const severityLabel =
      indicator.combinedDroughtIndex === 'alert' ? 'Severe' :
      indicator.combinedDroughtIndex === 'warning' ? 'Moderate' : 'Developing';

    summary =
      `${severityLabel} drought conditions in ${location} with soil moisture ` +
      `${moisturePercent}% ${moistureDir} normal. `;

    if (indicator.faparAnomaly < -0.1) {
      summary += 'Vegetation stress visible in satellite data. ';
    }

    summary +=
      `Bark beetle risk elevated to ${beetleRiskFactor}x baseline`;

    if (indicator.precipitationDeficit > 0) {
      summary += ` — ${indicator.precipitationDeficit}mm precipitation deficit this period`;
    }

    summary += '.';
  }

  // Use demo status if we got demo data back
  if (indicator === DEMO_DROUGHT_INDICATOR) {
    return DEMO_STATUS;
  }

  return {
    location,
    indicator,
    beetleRiskFactor,
    summary,
  };
}

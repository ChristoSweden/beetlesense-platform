/**
 * NASA FIRMS (Fire Information for Resource Management System)
 *
 * Near-real-time active fire detections from VIIRS and MODIS instruments.
 * Used for post-fire beetle risk analysis — fire-stressed trees emit volatiles
 * that attract bark beetles (Ips typographus), creating secondary infestation
 * hotspots around burn perimeters.
 *
 * Data sources:
 *   - VIIRS (S-NPP): 375m resolution, ~4 overpasses/day at Swedish latitudes
 *   - VIIRS (NOAA-20): 375m resolution, offset from S-NPP
 *   - MODIS (Terra/Aqua): 1km resolution, legacy continuity
 *
 * API: https://firms.modaps.eosdis.nasa.gov/api/
 * WMS: https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/
 */

// ─── Types ───

export interface FIRMSDetection {
  latitude: number;
  longitude: number;
  brightness: number;
  brightnessTI4: number;
  confidence: 'low' | 'nominal' | 'high';
  frp: number;                    // Fire Radiative Power (MW)
  satellite: 'VIIRS_SNPP' | 'VIIRS_NOAA20' | 'MODIS';
  acqDate: string;
  acqTime: string;
  dayNight: 'D' | 'N';
}

export interface FirePerimeter {
  id: string;
  detections: FIRMSDetection[];
  centroid: [number, number];     // [lng, lat]
  radiusKm: number;
  totalFRP: number;
  startDate: string;
  lastDetection: string;
  burnAreaHa: number;
}

export interface PostFireBeetleRisk {
  fireId: string;
  monthsSinceFire: number;
  riskMultiplier: number;         // 1.0 = no effect, 3.0 = 3x normal risk
  affectedAreaHa: number;
  bufferZoneKm: number;           // risk extends beyond fire perimeter
  stressVolatilesActive: boolean;
  recommendation: string;
}

// ─── Constants ───

const FIRMS_CSV_BASE = 'https://firms.modaps.eosdis.nasa.gov/api/area/csv';
const FIRMS_WMS_BASE = 'https://firms.modaps.eosdis.nasa.gov/mapserver/wms/fires/';

/** Sweden bounding box: 10.5-24.5°E, 55-69.5°N */
const SWEDEN_BBOX = {
  west: 10.5,
  south: 55.0,
  east: 24.5,
  north: 69.5,
};

const FIRMS_SOURCES = ['VIIRS_SNPP_NRT', 'VIIRS_NOAA20_NRT', 'MODIS_NRT'] as const;

/** Clustering distance — detections within this range are grouped into one fire */
const CLUSTER_RADIUS_KM = 2.0;

/** Post-fire beetle risk buffer — risk extends beyond burn perimeter */
const RISK_BUFFER_KM = 2.0;

// ─── Source Info ───

export const FIRMS_SOURCE_INFO = {
  name: 'NASA FIRMS (Fire Information for Resource Management System)',
  provider: 'NASA LANCE / EOSDIS',
  instruments: ['VIIRS (S-NPP)', 'VIIRS (NOAA-20)', 'MODIS (Terra/Aqua)'],
  resolution: '375m (VIIRS) / 1km (MODIS)',
  latency: '~3 hours from satellite overpass',
  revisit: '~4 overpasses/day at Swedish latitudes',
  license: 'Open access (NASA EOSDIS)',
  apiUrl: 'https://firms.modaps.eosdis.nasa.gov/api/',
  wmsUrl: FIRMS_WMS_BASE,
  swedenBbox: SWEDEN_BBOX,
  beetleRelevance: 'Fire-stressed conifers emit alpha-pinene and ethanol, attracting Ips typographus up to 2km from burn perimeter',
};

// ─── Cache ───

let cachedFires: { data: FIRMSDetection[]; fetchedAt: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes — fires are time-sensitive

// ─── Demo Data ───

const DEMO_DETECTIONS: FIRMSDetection[] = [
  // Active wildfire near Gävle — summer 2026
  {
    latitude: 60.724,
    longitude: 17.142,
    brightness: 342.8,
    brightnessTI4: 318.5,
    confidence: 'high',
    frp: 28.4,
    satellite: 'VIIRS_SNPP',
    acqDate: '2026-04-02',
    acqTime: '1248',
    dayNight: 'D',
  },
  {
    latitude: 60.721,
    longitude: 17.148,
    brightness: 328.1,
    brightnessTI4: 310.2,
    confidence: 'high',
    frp: 19.7,
    satellite: 'VIIRS_SNPP',
    acqDate: '2026-04-02',
    acqTime: '1248',
    dayNight: 'D',
  },
  {
    latitude: 60.727,
    longitude: 17.139,
    brightness: 315.4,
    brightnessTI4: 298.6,
    confidence: 'nominal',
    frp: 12.3,
    satellite: 'VIIRS_NOAA20',
    acqDate: '2026-04-03',
    acqTime: '0132',
    dayNight: 'N',
  },
  // Smaller fire near Växjö (Småland) — recent
  {
    latitude: 56.912,
    longitude: 14.823,
    brightness: 308.2,
    brightnessTI4: 294.1,
    confidence: 'nominal',
    frp: 8.6,
    satellite: 'VIIRS_SNPP',
    acqDate: '2026-04-04',
    acqTime: '1315',
    dayNight: 'D',
  },
  // Controlled burn near Umeå (Västerbotten)
  {
    latitude: 63.845,
    longitude: 20.312,
    brightness: 296.5,
    brightnessTI4: 285.8,
    confidence: 'low',
    frp: 4.2,
    satellite: 'MODIS',
    acqDate: '2026-04-01',
    acqTime: '1042',
    dayNight: 'D',
  },
  // Older fire near Sundsvall — two months ago
  {
    latitude: 62.418,
    longitude: 17.295,
    brightness: 356.1,
    brightnessTI4: 332.7,
    confidence: 'high',
    frp: 45.2,
    satellite: 'VIIRS_SNPP',
    acqDate: '2026-02-05',
    acqTime: '1156',
    dayNight: 'D',
  },
  {
    latitude: 62.414,
    longitude: 17.301,
    brightness: 338.9,
    brightnessTI4: 319.4,
    confidence: 'high',
    frp: 31.8,
    satellite: 'VIIRS_NOAA20',
    acqDate: '2026-02-05',
    acqTime: '1320',
    dayNight: 'D',
  },
];

// ─── Helpers ───

/**
 * Haversine distance between two points in km.
 */
function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a coordinate falls within Sweden's bounding box.
 */
function isInSweden(lat: number, lng: number): boolean {
  return (
    lat >= SWEDEN_BBOX.south && lat <= SWEDEN_BBOX.north &&
    lng >= SWEDEN_BBOX.west && lng <= SWEDEN_BBOX.east
  );
}

/**
 * Parse FIRMS CSV response into typed detections.
 */
function parseFIRMSCSV(csv: string, source: string): FIRMSDetection[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];

  const header = lines[0]!.split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const briIdx = header.indexOf('brightness');
  const btiIdx = header.indexOf('bright_ti4');
  const confIdx = header.indexOf('confidence');
  const frpIdx = header.indexOf('frp');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');
  const dnIdx = header.indexOf('daynight');

  const detections: FIRMSDetection[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(',');
    if (cols.length < header.length) continue;

    const lat = parseFloat(cols[latIdx]!);
    const lng = parseFloat(cols[lngIdx]!);

    if (!isInSweden(lat, lng)) continue;

    const rawConf = cols[confIdx]?.toLowerCase() ?? '';
    let confidence: 'low' | 'nominal' | 'high' = 'nominal';
    if (rawConf === 'high' || rawConf === 'h') confidence = 'high';
    else if (rawConf === 'low' || rawConf === 'l') confidence = 'low';

    let satellite: FIRMSDetection['satellite'] = 'VIIRS_SNPP';
    if (source.includes('NOAA20')) satellite = 'VIIRS_NOAA20';
    else if (source.includes('MODIS')) satellite = 'MODIS';

    detections.push({
      latitude: lat,
      longitude: lng,
      brightness: parseFloat(cols[briIdx] ?? '0'),
      brightnessTI4: parseFloat(cols[btiIdx] ?? '0'),
      confidence,
      frp: parseFloat(cols[frpIdx] ?? '0'),
      satellite,
      acqDate: cols[dateIdx] ?? '',
      acqTime: cols[timeIdx] ?? '',
      dayNight: (cols[dnIdx] ?? 'D') as 'D' | 'N',
    });
  }

  return detections;
}

// ─── Public API ───

/**
 * Fetch recent active fire detections within a bounding box.
 * Falls back to demo data when API is unavailable.
 *
 * @param bbox - [west, south, east, north] in WGS84
 * @param days - Number of days to look back (1-10, default 7)
 */
export async function fetchRecentFires(
  bbox: [number, number, number, number],
  days: number = 7,
): Promise<FIRMSDetection[]> {
  // Return cached data if fresh
  if (cachedFires && Date.now() - cachedFires.fetchedAt < CACHE_TTL) {
    return filterByBbox(cachedFires.data, bbox);
  }

  const clampedDays = Math.min(10, Math.max(1, days));
  const apiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIRMS_MAP_KEY) || '';
  const allDetections: FIRMSDetection[] = [];

  // Attempt live fetch from all three sources
  for (const source of FIRMS_SOURCES) {
    try {
      const areaParam = `${SWEDEN_BBOX.west},${SWEDEN_BBOX.south},${SWEDEN_BBOX.east},${SWEDEN_BBOX.north}`;
      const url = apiKey
        ? `${FIRMS_CSV_BASE}/${apiKey}/${source}/${areaParam}/${clampedDays}`
        : `${FIRMS_CSV_BASE}/${source}/${areaParam}/${clampedDays}`;

      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });

      if (response.ok) {
        const csv = await response.text();
        allDetections.push(...parseFIRMSCSV(csv, source));
      }
    } catch {
      // API unavailable — will fall back to demo data
    }
  }

  // Fall back to demo data if no live data was fetched
  const detections = allDetections.length > 0 ? allDetections : [...DEMO_DETECTIONS];

  cachedFires = { data: detections, fetchedAt: Date.now() };
  return filterByBbox(detections, bbox);
}

/**
 * Filter detections to a bounding box.
 */
function filterByBbox(
  detections: FIRMSDetection[],
  bbox: [number, number, number, number],
): FIRMSDetection[] {
  const [west, south, east, north] = bbox;
  return detections.filter(d =>
    d.latitude >= south && d.latitude <= north &&
    d.longitude >= west && d.longitude <= east,
  );
}

/**
 * Cluster nearby fire detections into fire perimeters.
 * Uses simple distance-based clustering (detections within CLUSTER_RADIUS_KM).
 */
export function clusterFireDetections(fires: FIRMSDetection[]): FirePerimeter[] {
  if (fires.length === 0) return [];

  const assigned = new Set<number>();
  const perimeters: FirePerimeter[] = [];

  for (let i = 0; i < fires.length; i++) {
    if (assigned.has(i)) continue;

    const cluster: FIRMSDetection[] = [fires[i]!];
    assigned.add(i);

    // Find all detections within cluster radius
    for (let j = i + 1; j < fires.length; j++) {
      if (assigned.has(j)) continue;

      const inRange = cluster.some(c =>
        haversineKm(c.latitude, c.longitude, fires[j]!.latitude, fires[j]!.longitude) <= CLUSTER_RADIUS_KM,
      );

      if (inRange) {
        cluster.push(fires[j]!);
        assigned.add(j);
      }
    }

    // Compute perimeter properties
    const lats = cluster.map(d => d.latitude);
    const lngs = cluster.map(d => d.longitude);
    const centroidLat = lats.reduce((a, b) => a + b, 0) / lats.length;
    const centroidLng = lngs.reduce((a, b) => a + b, 0) / lngs.length;

    const maxDist = cluster.reduce((max, d) => {
      const dist = haversineKm(centroidLat, centroidLng, d.latitude, d.longitude);
      return Math.max(max, dist);
    }, 0);

    const totalFRP = cluster.reduce((sum, d) => sum + d.frp, 0);

    const dates = cluster.map(d => d.acqDate).sort();
    const radiusKm = Math.max(0.5, maxDist + 0.25); // minimum 500m radius
    const burnAreaHa = Math.round(Math.PI * radiusKm ** 2 * 100 * 10) / 10; // km² to ha

    perimeters.push({
      id: `fire-${centroidLat.toFixed(3)}-${centroidLng.toFixed(3)}`,
      detections: cluster,
      centroid: [centroidLng, centroidLat],
      radiusKm: Math.round(radiusKm * 100) / 100,
      totalFRP: Math.round(totalFRP * 10) / 10,
      startDate: dates[0]!,
      lastDetection: dates[dates.length - 1]!,
      burnAreaHa,
    });
  }

  return perimeters.sort((a, b) => b.totalFRP - a.totalFRP);
}

/**
 * Calculate post-fire beetle infestation risk.
 *
 * Fire-stressed conifers emit alpha-pinene and ethanol that attract
 * bark beetles (Ips typographus). Risk is highest in the first 6 months
 * and remains elevated for up to 2 years.
 *
 * @param fire - A fire perimeter from clusterFireDetections
 * @param currentDate - Current date string (YYYY-MM-DD), defaults to today
 */
export function calculatePostFireBeetleRisk(
  fire: FirePerimeter,
  currentDate?: string,
): PostFireBeetleRisk {
  const now = currentDate ? new Date(currentDate) : new Date();
  const fireDate = new Date(fire.lastDetection);
  const monthsSinceFire = Math.max(
    0,
    (now.getFullYear() - fireDate.getFullYear()) * 12 +
    (now.getMonth() - fireDate.getMonth()),
  );

  // Risk multiplier based on time since fire
  let riskMultiplier: number;
  let stressVolatilesActive: boolean;
  let recommendation: string;

  if (monthsSinceFire <= 6) {
    riskMultiplier = 3.0;
    stressVolatilesActive = true;
    recommendation = 'CRITICAL: Deploy pheromone traps within 2km of burn perimeter. ' +
      'Stressed trees actively emitting volatiles — expect elevated Ips typographus activity. ' +
      'Prioritize salvage logging of fire-damaged standing timber.';
  } else if (monthsSinceFire <= 12) {
    riskMultiplier = 2.5;
    stressVolatilesActive = true;
    recommendation = 'HIGH RISK: Fire-damaged trees still attracting beetles. ' +
      'Monitor trap catches weekly. Consider sanitation felling of severely stressed trees ' +
      'within buffer zone.';
  } else if (monthsSinceFire <= 24) {
    riskMultiplier = 1.8;
    stressVolatilesActive = false;
    recommendation = 'ELEVATED RISK: Volatile emissions declining but weakened trees remain ' +
      'susceptible to beetle colonization. Continue monitoring and remove infested trees promptly.';
  } else {
    riskMultiplier = 1.2;
    stressVolatilesActive = false;
    recommendation = 'MODERATE: Post-fire risk declining. Maintain standard monitoring. ' +
      'Some residual risk from standing dead wood providing beetle breeding substrate.';
  }

  const affectedAreaHa = Math.round(
    Math.PI * (fire.radiusKm + RISK_BUFFER_KM) ** 2 * 100 * 10,
  ) / 10;

  return {
    fireId: fire.id,
    monthsSinceFire,
    riskMultiplier,
    affectedAreaHa,
    bufferZoneKm: RISK_BUFFER_KM,
    stressVolatilesActive,
    recommendation,
  };
}

/**
 * Get MapLibre-compatible WMS tile URL for FIRMS fire detections.
 * Renders active fire hotspots as an overlay layer.
 */
export function getFIRMSTileUrl(): string {
  return (
    `${FIRMS_WMS_BASE}?` +
    'SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&' +
    'LAYERS=fires_viirs_snpp&' +
    'STYLES=&' +
    'SRS=EPSG:3857&' +
    'TRANSPARENT=true&' +
    'FORMAT=image/png&' +
    'WIDTH=256&HEIGHT=256&' +
    'BBOX={bbox-epsg-3857}'
  );
}

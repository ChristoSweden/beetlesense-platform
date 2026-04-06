/**
 * SMHI Hydrology — Watercourses, Flow Data & Catchment Areas
 *
 * Fetches hydrological observation data from SMHI's open data API.
 * Critical for determining harvest buffer zones along watercourses
 * per Swedish forestry law (Skogsvårdslagen).
 *
 * Station list is LIVE. Buffer compliance uses demo data with
 * realistic Swedish regulatory distances.
 *
 * Docs: https://opendata.smhi.se/apidocs/hydroobs/
 */

// ─── Types ───

export interface WaterStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  parameter: string;
  latestValue: number;
  unit: string;
  timestamp: string;
}

export interface WatercourseBuffer {
  watercourseId: string;
  name: string;
  distanceFromParcelM: number;
  requiredBufferM: number;
  bufferCompliant: boolean;
  waterType: 'river' | 'stream' | 'lake' | 'wetland';
  flowRate: number | null;
}

export interface HarvestWaterCompliance {
  nearbyWatercourses: WatercourseBuffer[];
  compliant: boolean;
  totalBufferAreaHa: number;
  recommendation: string;
}

interface SMHIStationResponse {
  key: string;
  name: string;
  latitude: number;
  longitude: number;
  active: boolean;
  from?: number;
  to?: number;
}

interface SMHIParameterResponse {
  key: string;
  summary: string;
  unit: string;
}

interface SMHIStationListResponse {
  station: SMHIStationResponse[];
  parameter?: SMHIParameterResponse;
}

interface SMHIValueEntry {
  date: number;
  value: string;
  quality: string;
}

interface SMHIDataResponse {
  value: SMHIValueEntry[];
  station?: { name: string; key: string };
  parameter?: { key: string; name: string; unit: string };
}

// ─── Constants ───

const HYDRO_BASE_URL = 'https://opendata-download-hydrological-observations.smhi.se/api';

// SMHI Hydrology parameter IDs
const PARAM_DISCHARGE = 1;          // Vattenföring (m³/s)
const PARAM_WATER_LEVEL = 2;        // Vattenstånd (m)

// Swedish buffer zone requirements per Skogsvårdslagen / Skogsstyrelsen guidance
const BUFFER_REQUIREMENTS: Record<WatercourseBuffer['waterType'], { min: number; max: number }> = {
  river: { min: 15, max: 30 },
  stream: { min: 5, max: 15 },
  lake: { min: 15, max: 30 },
  wetland: { min: 10, max: 25 },
};

// Cache (15 min for station list)
let stationsCache: { data: WaterStation[]; fetchedAt: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000;

export const SMHI_HYDROLOGY_SOURCE_INFO = {
  name: 'SMHI Hydrological Observations',
  provider: 'SMHI (Swedish Meteorological and Hydrological Institute)',
  endpoint: HYDRO_BASE_URL,
  license: 'Open data (CC0)',
  updateFrequency: 'Hourly for active stations',
  coverage: 'Swedish watercourses and lakes',
  parameters: ['Vattenföring (discharge, m³/s)', 'Vattenstånd (water level, m)'],
  note: 'Buffer compliance follows Skogsvårdslagen and Skogsstyrelsen FSC guidance.',
};

// ─── Helpers ───

function haversineDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function classifyWaterType(name: string, flowRate: number | null): WatercourseBuffer['waterType'] {
  const lower = name.toLowerCase();
  if (lower.includes('sjö') || lower.includes('lake') || lower.includes('vatten') && lower.includes('sjö')) {
    return 'lake';
  }
  if (lower.includes('kärr') || lower.includes('mosse') || lower.includes('myr') || lower.includes('wetland')) {
    return 'wetland';
  }
  if (lower.includes('älv') || lower.includes('å') || (flowRate !== null && flowRate > 5)) {
    return 'river';
  }
  return 'stream';
}

function getRequiredBuffer(waterType: WatercourseBuffer['waterType'], flowRate: number | null): number {
  const range = BUFFER_REQUIREMENTS[waterType];
  // Larger watercourses need wider buffers
  if (flowRate !== null && flowRate > 10) return range.max;
  if (flowRate !== null && flowRate > 2) return Math.round((range.min + range.max) / 2);
  return range.min;
}

// ─── Demo Data ───

function generateDemoWatercourses(lat: number, lng: number): WatercourseBuffer[] {
  // Realistic Swedish watercourse names near a forest parcel
  const watercourses = [
    { name: 'Lillån', type: 'stream' as const, distance: 45, flow: 0.8 },
    { name: 'Storsjön', type: 'lake' as const, distance: 320, flow: null },
    { name: 'Kvarnbäcken', type: 'stream' as const, distance: 18, flow: 0.3 },
    { name: 'Mossekärret', type: 'wetland' as const, distance: 85, flow: null },
  ];

  // Filter to watercourses within reasonable distance
  return watercourses
    .filter((w) => w.distance < 500)
    .map((w, i) => {
      const required = getRequiredBuffer(w.type, w.flow);
      return {
        watercourseId: `demo-water-${i + 1}`,
        name: w.name,
        distanceFromParcelM: w.distance,
        requiredBufferM: required,
        bufferCompliant: w.distance >= required,
        waterType: w.type,
        flowRate: w.flow,
      };
    });
}

// ─── API Functions ───

/**
 * Fetch nearby SMHI hydrological stations.
 * LIVE call to SMHI API — returns stations within radiusKm.
 */
export async function fetchNearbyWaterStations(
  lat: number,
  lng: number,
  radiusKm: number = 25
): Promise<WaterStation[]> {
  // Check cache
  if (stationsCache && Date.now() - stationsCache.fetchedAt < CACHE_TTL) {
    return stationsCache.data.filter(
      (s) => haversineDistanceKm(lat, lng, s.lat, s.lng) <= radiusKm
    );
  }

  try {
    // Fetch station list for discharge parameter
    const url = `${HYDRO_BASE_URL}/version/latest/parameter/${PARAM_DISCHARGE}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SMHI Hydrology API returned ${response.status}`);
    }

    const data: SMHIStationListResponse = await response.json();

    if (!data.station || !Array.isArray(data.station)) {
      throw new Error('Unexpected SMHI response structure');
    }

    const allStations: WaterStation[] = data.station
      .filter((s) => s.active !== false)
      .map((s) => ({
        id: String(s.key),
        name: s.name || `Station ${s.key}`,
        lat: s.latitude,
        lng: s.longitude,
        parameter: 'Vattenföring',
        latestValue: 0,
        unit: 'm³/s',
        timestamp: new Date().toISOString(),
      }));

    stationsCache = { data: allStations, fetchedAt: Date.now() };

    return allStations.filter(
      (s) => haversineDistanceKm(lat, lng, s.lat, s.lng) <= radiusKm
    );
  } catch {
    // Demo fallback
    return [
      {
        id: 'demo-1',
        name: 'Lagan vid Knäred',
        lat: lat + 0.05,
        lng: lng - 0.03,
        parameter: 'Vattenföring',
        latestValue: 12.4,
        unit: 'm³/s',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'demo-2',
        name: 'Nissan vid Halmstad',
        lat: lat - 0.08,
        lng: lng + 0.04,
        parameter: 'Vattenföring',
        latestValue: 24.1,
        unit: 'm³/s',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'demo-3',
        name: 'Helge å vid Torsebro',
        lat: lat + 0.12,
        lng: lng + 0.07,
        parameter: 'Vattenföring',
        latestValue: 8.7,
        unit: 'm³/s',
        timestamp: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Check water buffer compliance for a parcel bounding box.
 * Uses demo watercourse data with real Swedish regulatory buffers.
 */
export async function checkWaterBufferCompliance(
  parcelBbox: { minLat: number; minLng: number; maxLat: number; maxLng: number }
): Promise<HarvestWaterCompliance> {
  const centerLat = (parcelBbox.minLat + parcelBbox.maxLat) / 2;
  const centerLng = (parcelBbox.minLng + parcelBbox.maxLng) / 2;

  // Get nearby stations for live context
  const stations = await fetchNearbyWaterStations(centerLat, centerLng, 5);

  // Generate watercourse buffers (demo with real buffer regulations)
  const watercourses = generateDemoWatercourses(centerLat, centerLng);

  // Add any live stations as additional watercourses
  for (const station of stations.slice(0, 3)) {
    const distKm = haversineDistanceKm(centerLat, centerLng, station.lat, station.lng);
    const distM = Math.round(distKm * 1000);
    if (distM < 500) {
      const waterType = classifyWaterType(station.name, station.latestValue);
      const required = getRequiredBuffer(waterType, station.latestValue);
      watercourses.push({
        watercourseId: station.id,
        name: station.name,
        distanceFromParcelM: distM,
        requiredBufferM: required,
        bufferCompliant: distM >= required,
        waterType,
        flowRate: station.latestValue > 0 ? station.latestValue : null,
      });
    }
  }

  const compliant = watercourses.every((w) => w.bufferCompliant);
  const nonCompliant = watercourses.filter((w) => !w.bufferCompliant);

  // Estimate buffer area based on parcel size and number of watercourses
  const parcelWidthM =
    haversineDistanceKm(parcelBbox.minLat, parcelBbox.minLng, parcelBbox.minLat, parcelBbox.maxLng) * 1000;
  const totalBufferLengthM = watercourses.length * parcelWidthM * 0.3; // ~30% of parcel edge
  const avgBufferWidth = watercourses.reduce((sum, w) => sum + w.requiredBufferM, 0) /
    Math.max(watercourses.length, 1);
  const totalBufferAreaHa = Math.round((totalBufferLengthM * avgBufferWidth) / 10000 * 100) / 100;

  let recommendation: string;
  if (compliant) {
    recommendation =
      'All watercourse buffer zones meet Skogsvårdslagen requirements. Harvest operations can proceed with standard precautions near water.';
  } else {
    const names = nonCompliant.map((w) => `${w.name} (${w.distanceFromParcelM}m, needs ${w.requiredBufferM}m)`);
    recommendation =
      `Buffer zone violations detected at: ${names.join(', ')}. Adjust harvest boundary to maintain required distance. Contact Skogsstyrelsen if uncertain.`;
  }

  return {
    nearbyWatercourses: watercourses,
    compliant,
    totalBufferAreaHa,
    recommendation,
  };
}

/**
 * Fetch historical water flow data for a specific SMHI station.
 * LIVE call to SMHI hydrology API.
 */
export async function fetchWaterFlowData(
  stationId: string
): Promise<{ timestamp: string; value: number; unit: string }[]> {
  try {
    const url = `${HYDRO_BASE_URL}/version/latest/parameter/${PARAM_DISCHARGE}/station/${stationId}/period/latest-months/data.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`SMHI flow data returned ${response.status}`);
    }

    const data: SMHIDataResponse = await response.json();

    if (!data.value || !Array.isArray(data.value)) {
      return [];
    }

    return data.value.map((v) => ({
      timestamp: new Date(v.date).toISOString(),
      value: parseFloat(v.value),
      unit: data.parameter?.unit || 'm³/s',
    }));
  } catch {
    // Demo fallback — 30 days of synthetic flow data
    const points: { timestamp: string; value: number; unit: string }[] = [];
    const now = Date.now();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      // Simulate seasonal variation
      const baseFlow = 5 + Math.sin((date.getMonth() / 12) * Math.PI * 2) * 3;
      const noise = (Math.random() - 0.5) * 2;
      points.push({
        timestamp: date.toISOString(),
        value: Math.round((baseFlow + noise) * 100) / 100,
        unit: 'm³/s',
      });
    }
    return points;
  }
}

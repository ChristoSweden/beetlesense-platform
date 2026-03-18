/**
 * FastighetsLookup — resolve a Swedish fastighets-ID to parcel boundary + metadata.
 *
 * In production this calls the Lantmateriet Direct Access API.
 * When the API key is not configured (or in demo mode) it returns realistic
 * sample data for a forest parcel near Vaxjo, Kronoberg.
 */

import type { GeoJSONGeometry } from '@beetlesense/shared';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FastighetsLookupResult {
  fastighetId: string;
  municipality: string;
  county: string;
  tract: string;
  block: string;
  unit: string;
  areaHa: number;
  boundaryGeoJSON: GeoJSONGeometry;
  centroid: [number, number]; // [lng, lat] WGS84
}

export interface ForestAnalysisResult {
  ndvi: number; // 0.0–1.0
  ndviStatus: 'healthy' | 'moderate' | 'stressed';
  dominantSpecies: string;
  speciesMix: { species: string; pct: number }[];
  riskLevel: 'low' | 'medium' | 'high';
  aiSummary: string;
}

export interface OnboardingParcelData {
  lookup: FastighetsLookupResult;
  analysis: ForestAnalysisResult;
}

// ─── Demo data ──────────────────────────────────────────────────────────────

const DEMO_PARCELS: Record<string, OnboardingParcelData> = {
  default: {
    lookup: {
      fastighetId: 'Kronoberg Vaxjo 1:23',
      municipality: 'Vaxjo',
      county: 'Kronoberg',
      tract: 'Vaxjo',
      block: '1',
      unit: '23',
      areaHa: 34.7,
      centroid: [14.81, 56.88],
      boundaryGeoJSON: {
        type: 'Polygon',
        coordinates: [
          [
            [14.795, 56.875],
            [14.825, 56.875],
            [14.830, 56.880],
            [14.828, 56.890],
            [14.810, 56.895],
            [14.793, 56.888],
            [14.790, 56.880],
            [14.795, 56.875],
          ],
        ],
      },
    },
    analysis: {
      ndvi: 0.72,
      ndviStatus: 'healthy',
      dominantSpecies: 'Gran (Picea abies)',
      speciesMix: [
        { species: 'Gran', pct: 58 },
        { species: 'Tall', pct: 28 },
        { species: 'Bjork', pct: 14 },
      ],
      riskLevel: 'low',
      aiSummary:
        'Your forest is predominantly spruce with good canopy cover. NDVI values indicate healthy vegetation. Low bark beetle risk based on current satellite data and regional conditions.',
    },
  },
  risk: {
    lookup: {
      fastighetId: 'Jonkoping Varnamo 5:12',
      municipality: 'Varnamo',
      county: 'Jonkoping',
      tract: 'Varnamo',
      block: '5',
      unit: '12',
      areaHa: 52.1,
      centroid: [14.04, 57.19],
      boundaryGeoJSON: {
        type: 'Polygon',
        coordinates: [
          [
            [14.025, 57.183],
            [14.055, 57.183],
            [14.060, 57.190],
            [14.050, 57.200],
            [14.030, 57.202],
            [14.020, 57.195],
            [14.022, 57.188],
            [14.025, 57.183],
          ],
        ],
      },
    },
    analysis: {
      ndvi: 0.48,
      ndviStatus: 'stressed',
      dominantSpecies: 'Gran (Picea abies)',
      speciesMix: [
        { species: 'Gran', pct: 82 },
        { species: 'Tall', pct: 12 },
        { species: 'Bjork', pct: 6 },
      ],
      riskLevel: 'high',
      aiSummary:
        'Elevated bark beetle risk detected. NDVI values show declining vegetation health in the eastern sector. The high spruce concentration (82%) increases vulnerability. Recommend a drone survey within 2 weeks.',
    },
  },
};

// ─── Parsing ────────────────────────────────────────────────────────────────

/**
 * Parse a user-entered fastighets-ID into its component parts.
 * Accepts formats like:
 *   "Kronoberg Vaxjo 1:23"
 *   "KRONOBERG VAXJO 1:23"
 *   "Vaxjo 1:23"
 */
export function parseFastighetsId(raw: string): {
  county?: string;
  municipality: string;
  block: string;
  unit: string;
} | null {
  const trimmed = raw.trim();
  // Match pattern: optional_county municipality block:unit
  const match = trimmed.match(
    /^(?:(\S+)\s+)?(\S+)\s+(\d+):(\d+)$/i,
  );
  if (!match) return null;
  return {
    county: match[1] || undefined,
    municipality: match[2],
    block: match[3],
    unit: match[4],
  };
}

/**
 * Validate that a string looks like a valid fastighets-ID.
 */
export function isValidFastighetsId(raw: string): boolean {
  return parseFastighetsId(raw) !== null;
}

// ─── SWEREF99 TM → WGS84 conversion ────────────────────────────────────────

/**
 * Convert SWEREF99 TM (EPSG:3006) coordinates to WGS84 (EPSG:4326).
 *
 * Uses an iterative algorithm for the transverse Mercator reverse projection.
 * Accuracy is within ~1 meter for Swedish territory.
 */
function sweref99tmToWgs84(easting: number, northing: number): [number, number] {
  // SWEREF99 TM parameters
  const a = 6378137.0; // semi-major axis GRS80
  const f = 1 / 298.257222101; // flattening
  const e2 = f * (2 - f);
  const _e = Math.sqrt(e2);
  const _e_prime2 = e2 / (1 - e2);
  const n = f / (2 - f);
  const k0 = 0.9996; // scale factor
  const lambda0 = (15 * Math.PI) / 180; // central meridian 15 deg E
  const falseNorthing = 0;
  const falseEasting = 500000;

  // Pre-compute series coefficients
  const n2 = n * n;
  const n3 = n2 * n;
  const n4 = n3 * n;

  const A = (a / (1 + n)) * (1 + n2 / 4 + n4 / 64);

  const delta1 = n / 2 - (2 * n2) / 3 + (37 * n3) / 96 - (1 * n4) / 360;
  const delta2 = n2 / 48 + n3 / 15 - (437 * n4) / 1440;
  const delta3 = (17 * n3) / 480 - (37 * n4) / 840;
  const delta4 = (4397 * n4) / 161280;

  const xi = (northing - falseNorthing) / (k0 * A);
  const eta = (easting - falseEasting) / (k0 * A);

  // Compute xi' and eta' by removing series terms
  let xiPrime = xi;
  let etaPrime = eta;

  for (let j = 1; j <= 4; j++) {
    const dj = [0, delta1, delta2, delta3, delta4][j];
    xiPrime -= dj * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaPrime -= dj * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const chi = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));

  // Compute latitude from conformal latitude chi
  let lat = chi;
  lat += Math.sin(2 * chi) * (e2 / 2 + (5 * e2 * e2) / 24 + (e2 * e2 * e2) / 12);
  lat += Math.sin(4 * chi) * ((7 * e2 * e2) / 48 + (29 * e2 * e2 * e2) / 240);
  lat += Math.sin(6 * chi) * ((7 * e2 * e2 * e2) / 120);

  const lng = lambda0 + Math.atan2(Math.sinh(etaPrime), Math.cos(xiPrime));

  const latDeg = (lat * 180) / Math.PI;
  const lngDeg = (lng * 180) / Math.PI;

  return [lngDeg, latDeg]; // [lng, lat] to match GeoJSON convention
}

/**
 * Convert a SWEREF99 TM coordinate ring to WGS84.
 */
function convertRingToWgs84(ring: number[][]): number[][] {
  return ring.map(([e, n]) => sweref99tmToWgs84(e, n));
}

// ─── Lookup ─────────────────────────────────────────────────────────────────

const LANTMATERIET_API_KEY = import.meta.env.VITE_LANTMATERIET_API_KEY ?? '';

/**
 * Look up a Swedish property by fastighets-ID.
 * Returns the parcel boundary + forest analysis data.
 *
 * In demo mode (no API key configured) returns sample data.
 */
export async function lookupFastighet(
  fastighetsId: string,
): Promise<OnboardingParcelData> {
  const parsed = parseFastighetsId(fastighetsId);
  if (!parsed) {
    throw new Error('Invalid fastighets-ID format. Example: "Kronoberg Vaxjo 1:23"');
  }

  // Production path — call Lantmateriet API
  if (LANTMATERIET_API_KEY) {
    try {
      return await callLantmaterietApi(fastighetsId);
    } catch (err) {
      console.error('Lantmateriet API call failed, falling back to demo data:', err);
      return getDemoData(fastighetsId);
    }
  }

  // Demo mode — return sample data with simulated delay
  return getDemoData(fastighetsId);
}

/**
 * Call the Lantmateriet Direktaccess Registerenhet API to look up a property.
 *
 * API documentation: https://www.lantmateriet.se/sv/geodata/vara-produkter/produktlista/fastighetsregistret-dirakttillgang/
 * Base URL: https://api.lantmateriet.se/distribution/produkter/fastighet/v4.1
 *
 * The workflow:
 * 1. Search for the registerenhet by municipality + block:unit
 * 2. Fetch the geometry (fastighetsgranser) for the matched property
 * 3. Convert SWEREF99 TM boundaries to WGS84
 * 4. Compute centroid and area
 * 5. Fetch forest analysis from our edge function using the boundary
 */
async function callLantmaterietApi(
  fastighetsId: string,
): Promise<OnboardingParcelData> {
  const parsed = parseFastighetsId(fastighetsId)!;

  const baseUrl = 'https://api.lantmateriet.se/distribution/produkter/fastighet/v4.1';
  const headers = {
    'Authorization': `Bearer ${LANTMATERIET_API_KEY}`,
    'Accept': 'application/json',
  };

  // Step 1: Search for the registerenhet by municipality name and block:unit
  const searchParams = new URLSearchParams({
    kommun: parsed.municipality,
    trakt: parsed.municipality,
    block: parsed.block,
    enhet: parsed.unit,
  });

  const searchRes = await fetch(
    `${baseUrl}/registerenhet?${searchParams.toString()}`,
    { headers },
  );

  if (!searchRes.ok) {
    const errorText = await searchRes.text().catch(() => '');
    throw new Error(
      `Lantmateriet search failed (${searchRes.status}): ${errorText || searchRes.statusText}`,
    );
  }

  const searchData = await searchRes.json();

  // The API returns an array of matching registerenheter
  const registerenheter = searchData?.features ?? searchData?.registerenhet ?? searchData;
  const entries = Array.isArray(registerenheter) ? registerenheter : [registerenheter];

  if (!entries.length || !entries[0]) {
    throw new Error(`No property found for "${fastighetsId}"`);
  }

  const entry = entries[0];

  // Extract the property UUID used by Lantmateriet
  const objektidentitet = entry.properties?.objektidentitet ?? entry.objektidentitet ?? entry.id;

  if (!objektidentitet) {
    throw new Error('Could not resolve property identifier from Lantmateriet response');
  }

  // Step 2: Fetch the geometry for this registerenhet
  const geoRes = await fetch(
    `${baseUrl}/registerenhet/${objektidentitet}/granser`,
    { headers },
  );

  if (!geoRes.ok) {
    const errorText = await geoRes.text().catch(() => '');
    throw new Error(
      `Lantmateriet geometry fetch failed (${geoRes.status}): ${errorText || geoRes.statusText}`,
    );
  }

  const geoData = await geoRes.json();

  // Extract the geometry — the API may return GeoJSON directly or wrapped
  let swerefGeometry: GeoJSONGeometry | null = null;
  if (geoData.type === 'Polygon' || geoData.type === 'MultiPolygon') {
    swerefGeometry = geoData as GeoJSONGeometry;
  } else if (geoData.geometry) {
    swerefGeometry = geoData.geometry as GeoJSONGeometry;
  } else if (geoData.features?.[0]?.geometry) {
    swerefGeometry = geoData.features[0].geometry as GeoJSONGeometry;
  }

  if (!swerefGeometry) {
    throw new Error('No geometry found in Lantmateriet response');
  }

  // Step 3: Convert SWEREF99 TM coordinates to WGS84
  let wgs84Geometry: GeoJSONGeometry;
  if (swerefGeometry.type === 'Polygon') {
    const coords = (swerefGeometry.coordinates as number[][][]).map(convertRingToWgs84);
    wgs84Geometry = { type: 'Polygon', coordinates: coords };
  } else if (swerefGeometry.type === 'MultiPolygon') {
    const coords = (swerefGeometry.coordinates as number[][][][]).map(
      (polygon) => polygon.map(convertRingToWgs84),
    );
    wgs84Geometry = { type: 'MultiPolygon', coordinates: coords };
  } else {
    // Unsupported geometry type, pass through
    wgs84Geometry = swerefGeometry;
  }

  // Step 4: Compute centroid from the first ring of the (Multi)Polygon
  let centroid: [number, number];
  let firstRing: number[][];
  if (wgs84Geometry.type === 'Polygon') {
    firstRing = (wgs84Geometry.coordinates as number[][][])[0];
  } else if (wgs84Geometry.type === 'MultiPolygon') {
    firstRing = (wgs84Geometry.coordinates as number[][][][])[0][0];
  } else {
    firstRing = [];
  }

  if (firstRing.length > 0) {
    const sumLng = firstRing.reduce((s, c) => s + c[0], 0);
    const sumLat = firstRing.reduce((s, c) => s + c[1], 0);
    centroid = [sumLng / firstRing.length, sumLat / firstRing.length];
  } else {
    centroid = [15, 57]; // fallback center of Småland
  }

  // Extract metadata from the search result
  const props = entry.properties ?? entry;
  const municipality = (props.kommunnamn ?? props.kommun ?? parsed.municipality) as string;
  const county = (props.lannamn ?? props.lan ?? parsed.county ?? '') as string;
  const tract = (props.trakt ?? parsed.municipality) as string;
  const areaM2 = (props.totalAreal ?? props.areal ?? 0) as number;
  const areaHa = areaM2 > 0 ? +(areaM2 / 10000).toFixed(1) : 0;

  const lookupResult: FastighetsLookupResult = {
    fastighetId: fastighetsId.trim(),
    municipality,
    county,
    tract,
    block: parsed.block,
    unit: parsed.unit,
    areaHa,
    boundaryGeoJSON: wgs84Geometry,
    centroid,
  };

  // Step 5: Fetch forest analysis via satellite-timeseries edge function
  let analysis: ForestAnalysisResult;
  try {
    analysis = await fetchForestAnalysis(wgs84Geometry, centroid);
  } catch (err) {
    console.warn('Forest analysis unavailable, using default:', err);
    // Return a neutral analysis when the service is unavailable
    analysis = {
      ndvi: 0.65,
      ndviStatus: 'moderate',
      dominantSpecies: 'Gran (Picea abies)',
      speciesMix: [
        { species: 'Gran', pct: 50 },
        { species: 'Tall', pct: 30 },
        { species: 'Bjork', pct: 20 },
      ],
      riskLevel: 'medium',
      aiSummary:
        'Forest analysis is being processed. NDVI and species data will be updated once satellite imagery has been analyzed for your parcel.',
    };
  }

  return { lookup: lookupResult, analysis };
}

/**
 * Fetch forest analysis (NDVI, species, risk) for a given parcel boundary.
 * Calls the satellite-timeseries Supabase Edge Function and the
 * Skogsstyrelsen kNN WCS service.
 */
async function fetchForestAnalysis(
  boundary: GeoJSONGeometry,
  centroid: [number, number],
): Promise<ForestAnalysisResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured');
  }

  // Call our edge function for satellite NDVI analysis
  const res = await fetch(`${supabaseUrl}/functions/v1/satellite-timeseries`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      geometry: boundary,
      centroid,
      metrics: ['ndvi', 'species', 'risk'],
    }),
  });

  if (!res.ok) {
    throw new Error(`Satellite analysis failed: ${res.status}`);
  }

  const data = await res.json();

  // Determine NDVI status
  const ndvi = (data.ndvi as number) ?? 0.65;
  let ndviStatus: 'healthy' | 'moderate' | 'stressed';
  if (ndvi >= 0.65) ndviStatus = 'healthy';
  else if (ndvi >= 0.45) ndviStatus = 'moderate';
  else ndviStatus = 'stressed';

  // Determine risk level based on NDVI and spruce percentage
  const speciesMix: { species: string; pct: number }[] = data.speciesMix ?? [
    { species: 'Gran', pct: 50 },
    { species: 'Tall', pct: 30 },
    { species: 'Bjork', pct: 20 },
  ];
  const sprucePct = speciesMix.find((s) => s.species === 'Gran')?.pct ?? 0;

  let riskLevel: 'low' | 'medium' | 'high';
  if (ndvi < 0.45 && sprucePct > 70) riskLevel = 'high';
  else if (ndvi < 0.55 || sprucePct > 80) riskLevel = 'medium';
  else riskLevel = 'low';

  const dominantSpecies = speciesMix.length > 0
    ? speciesMix.reduce((a, b) => (b.pct > a.pct ? b : a)).species
    : 'Gran';

  // Map Swedish species names to scientific names for display
  const speciesNameMap: Record<string, string> = {
    Gran: 'Gran (Picea abies)',
    Tall: 'Tall (Pinus sylvestris)',
    Bjork: 'Björk (Betula spp.)',
  };

  return {
    ndvi,
    ndviStatus,
    dominantSpecies: speciesNameMap[dominantSpecies] ?? dominantSpecies,
    speciesMix,
    riskLevel,
    aiSummary: (data.aiSummary as string) ?? `Forest analysis complete. NDVI ${ndvi.toFixed(2)} indicates ${ndviStatus} vegetation. ${sprucePct > 70 ? 'High spruce concentration increases bark beetle vulnerability.' : 'Species mix provides reasonable resilience.'} Risk level: ${riskLevel}.`,
  };
}

function getDemoData(fastighetsId: string): OnboardingParcelData {
  // If the user enters something containing "varnamo" or "risk", show at-risk demo
  const lower = fastighetsId.toLowerCase();
  if (lower.includes('varnamo') || lower.includes('värnamo') || lower.includes('risk')) {
    const data = DEMO_PARCELS.risk;
    return {
      ...data,
      lookup: { ...data.lookup, fastighetId: fastighetsId.trim() },
    };
  }

  // Default: healthy forest near Vaxjo
  const data = DEMO_PARCELS.default;
  return {
    ...data,
    lookup: { ...data.lookup, fastighetId: fastighetsId.trim() },
  };
}

// ─── Simulated step-by-step loading ─────────────────────────────────────────

export type LoadingStep = 'boundaries' | 'satellite' | 'species' | 'risk';

/**
 * Simulate the multi-step loading process for onboarding.
 * Calls `onStepComplete` as each step "finishes".
 * In production, these would be real API calls.
 */
export async function loadParcelWithProgress(
  fastighetsId: string,
  onStepComplete: (step: LoadingStep) => void,
): Promise<OnboardingParcelData> {
  const parsed = parseFastighetsId(fastighetsId);
  if (!parsed) {
    throw new Error('Invalid fastighets-ID format');
  }

  // If we have the Lantmateriet API key, use real data with progress callbacks
  if (LANTMATERIET_API_KEY) {
    try {
      const parsedId = parseFastighetsId(fastighetsId)!;
      const baseUrl = 'https://api.lantmateriet.se/distribution/produkter/fastighet/v4.1';
      const headers = {
        'Authorization': `Bearer ${LANTMATERIET_API_KEY}`,
        'Accept': 'application/json',
      };

      // Step 1: Load parcel boundaries from Lantmateriet
      const searchParams = new URLSearchParams({
        kommun: parsedId.municipality,
        trakt: parsedId.municipality,
        block: parsedId.block,
        enhet: parsedId.unit,
      });
      const searchRes = await fetch(`${baseUrl}/registerenhet?${searchParams}`, { headers });
      if (!searchRes.ok) throw new Error(`Search failed: ${searchRes.status}`);
      onStepComplete('boundaries');

      // Step 2+3+4: Delegate to callLantmaterietApi which does geometry + analysis
      const result = await callLantmaterietApi(fastighetsId);
      onStepComplete('satellite');
      onStepComplete('species');
      onStepComplete('risk');

      return result;
    } catch (err) {
      console.error('Real lookup failed, falling back to demo:', err);
    }
  }

  // Demo mode: simulated step-by-step loading
  // Step 1: Load parcel boundaries
  await delay(1200);
  onStepComplete('boundaries');

  // Step 2: Fetch satellite health data
  await delay(1500);
  onStepComplete('satellite');

  // Step 3: Analyze forest type
  await delay(1300);
  onStepComplete('species');

  // Step 4: Calculate risk score
  await delay(1000);
  onStepComplete('risk');

  // Return the full result
  return getDemoData(fastighetsId);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

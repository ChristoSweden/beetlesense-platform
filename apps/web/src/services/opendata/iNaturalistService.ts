/**
 * iNaturalist — Crowdsourced Species Observations
 *
 * Global biodiversity observation network with millions of verified species
 * records. Used for real-time beetle sighting data, forest health indicator
 * species, and community-level biodiversity monitoring.
 *
 * Key taxa for BeetleSense:
 *   - Ips typographus (European spruce bark beetle) — primary pest
 *   - Pityogenes chalcographus (six-toothed spruce bark beetle) — secondary
 *   - Dendroctonus micans (great spruce bark beetle) — occasional
 *   - Thanasimus formicarius (ant beetle) — predator, biocontrol indicator
 *   - Dryocopus martius (black woodpecker) — beetle predator indicator
 *
 * API: https://api.inaturalist.org/v1/
 * Documentation: https://api.inaturalist.org/v1/docs/
 * Rate limit: 60 requests/minute (no key required for read access)
 */

// ─── Types ───

export interface INatObservation {
  id: number;
  species: string;
  scientificName: string;
  observedOn: string;
  location: { lat: number; lng: number };
  photoUrl: string | null;
  qualityGrade: 'research' | 'needs_id' | 'casual';
  user: string;
  identifications: number;
}

export interface BeetleSightings {
  totalObservations: number;
  recentObservations: INatObservation[];
  speciesBreakdown: { species: string; count: number }[];
  nearestSighting: { distanceKm: number; date: string } | null;
  trend: 'increasing' | 'stable' | 'decreasing';
}

export interface IndicatorSpeciesResult {
  forestHealthIndicators: INatObservation[];
  beetlePredators: INatObservation[];
  stressIndicators: INatObservation[];
  biodiversityIndex: number;       // 0-1, higher = healthier
  summary: string;
}

interface INatAPIResponse {
  total_results: number;
  results: INatAPIResult[];
}

interface INatAPIResult {
  id: number;
  observed_on_string?: string;
  observed_on?: string;
  location?: string;               // "lat,lng" string
  quality_grade?: string;
  user?: { login?: string };
  identifications_count?: number;
  taxon?: {
    preferred_common_name?: string;
    name?: string;
  };
  photos?: { url?: string }[];
}

// ─── Constants ───

const API_BASE = 'https://api.inaturalist.org/v1';

/** Key bark beetle taxa for Swedish forests */
const BEETLE_TAXA = [
  'Ips typographus',
  'Pityogenes chalcographus',
  'Dendroctonus micans',
  'Tomicus piniperda',
  'Hylurgops palliatus',
] as const;

/** Beetle predator species — presence indicates natural biocontrol */
const PREDATOR_TAXA = [
  'Thanasimus formicarius',         // Ant beetle — primary bark beetle predator
  'Thanasimus femoralis',           // Another ant beetle species
  'Rhizophagus grandis',            // Specific predator of Dendroctonus
  'Dryocopus martius',              // Black woodpecker — excavates beetle larvae
  'Dendrocopos major',              // Great spotted woodpecker
  'Picoides tridactylus',           // Three-toed woodpecker — beetle specialist
] as const;

/** Forest stress indicator species — presence suggests declining forest health */
const STRESS_INDICATOR_TAXA = [
  'Fomitopsis pinicola',            // Red-banded polypore — deadwood indicator
  'Heterobasidion annosum',         // Root rot fungus — weakens trees
  'Armillaria mellea',              // Honey fungus — attacks stressed trees
  'Hylobius abietis',               // Large pine weevil — regeneration pest
] as const;

// ─── Source Info ───

export const INATURALIST_SOURCE_INFO = {
  name: 'iNaturalist',
  provider: 'California Academy of Sciences / National Geographic Society',
  type: 'Crowdsourced biodiversity observations',
  coverage: 'Global (strong coverage in Sweden via Artportalen cross-posting)',
  license: 'Various CC licenses per observation',
  apiUrl: API_BASE,
  documentation: 'https://api.inaturalist.org/v1/docs/',
  rateLimit: '60 requests/minute (no key required)',
  qualityGrades: {
    research: 'Community-verified, ≥2 agreeing IDs',
    needs_id: 'Has photo/location but needs verification',
    casual: 'Missing evidence or location',
  },
  beetleRelevance:
    'Real-time community observations of Ips typographus provide ground-truth ' +
    'validation for satellite-based beetle detection models. Predator species ' +
    'observations indicate natural biocontrol capacity.',
};

// ─── Cache ───

const requestCache = new Map<string, { data: unknown; fetchedAt: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes — observations update frequently

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
 * Parse an iNaturalist API result into our typed observation.
 */
function parseObservation(result: INatAPIResult): INatObservation | null {
  const locationStr = result.location;
  if (!locationStr) return null;

  const [latStr, lngStr] = locationStr.split(',');
  const lat = parseFloat(latStr ?? '');
  const lng = parseFloat(lngStr ?? '');
  if (isNaN(lat) || isNaN(lng)) return null;

  const photoUrl = result.photos?.[0]?.url?.replace('square', 'medium') ?? null;

  return {
    id: result.id,
    species: result.taxon?.preferred_common_name ?? result.taxon?.name ?? 'Unknown',
    scientificName: result.taxon?.name ?? 'Unknown',
    observedOn: result.observed_on ?? result.observed_on_string ?? '',
    location: { lat, lng },
    photoUrl,
    qualityGrade: (result.quality_grade as INatObservation['qualityGrade']) ?? 'casual',
    user: result.user?.login ?? 'anonymous',
    identifications: result.identifications_count ?? 0,
  };
}

/**
 * Build iNaturalist API query URL with standard parameters.
 */
function buildApiUrl(
  endpoint: string,
  params: Record<string, string | number>,
): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    searchParams.set(key, String(value));
  }
  return `${API_BASE}/${endpoint}?${searchParams.toString()}`;
}

/**
 * Fetch from iNaturalist API with caching and error handling.
 */
async function cachedFetch<T>(cacheKey: string, url: string): Promise<T | null> {
  // Check cache
  const cached = requestCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached.data as T;
  }

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) return null;

    const data = await response.json() as T;
    requestCache.set(cacheKey, { data, fetchedAt: Date.now() });
    return data;
  } catch {
    return null;
  }
}

// ─── Public API ───

/**
 * Fetch nearby species observations from iNaturalist. LIVE API call.
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 * @param radiusKm - Search radius in km (default 25)
 * @param taxonName - Optional scientific name filter (e.g., 'Ips typographus')
 */
export async function fetchNearbyObservations(
  lat: number,
  lng: number,
  radiusKm: number = 25,
  taxonName?: string,
): Promise<INatObservation[]> {
  const params: Record<string, string | number> = {
    lat,
    lng,
    radius: radiusKm,
    quality_grade: 'research',
    order: 'desc',
    order_by: 'observed_on',
    per_page: 50,
  };

  if (taxonName) {
    params['taxon_name'] = taxonName;
  }

  const cacheKey = `observations:${lat.toFixed(3)},${lng.toFixed(3)}:${radiusKm}:${taxonName ?? 'all'}`;
  const url = buildApiUrl('observations', params);

  const data = await cachedFetch<INatAPIResponse>(cacheKey, url);
  if (!data?.results) return [];

  return data.results
    .map(parseObservation)
    .filter((obs): obs is INatObservation => obs !== null);
}

/**
 * Fetch bark beetle sightings (Ips typographus and related species) near a location.
 * LIVE API call — queries iNaturalist for all key beetle taxa.
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 * @param radiusKm - Search radius in km (default 50)
 */
export async function fetchBeetleSightings(
  lat: number,
  lng: number,
  radiusKm: number = 50,
): Promise<BeetleSightings> {
  const allObservations: INatObservation[] = [];

  // Query each beetle taxon in parallel
  const fetches = BEETLE_TAXA.map(taxon =>
    fetchNearbyObservations(lat, lng, radiusKm, taxon),
  );

  const results = await Promise.allSettled(fetches);

  for (const result of results) {
    if (result.status === 'fulfilled') {
      allObservations.push(...result.value);
    }
  }

  // Sort by date, most recent first
  allObservations.sort((a, b) => {
    const dateA = new Date(a.observedOn).getTime() || 0;
    const dateB = new Date(b.observedOn).getTime() || 0;
    return dateB - dateA;
  });

  // Species breakdown
  const speciesMap = new Map<string, number>();
  for (const obs of allObservations) {
    const key = obs.scientificName;
    speciesMap.set(key, (speciesMap.get(key) ?? 0) + 1);
  }
  const speciesBreakdown = Array.from(speciesMap.entries())
    .map(([species, count]) => ({ species, count }))
    .sort((a, b) => b.count - a.count);

  // Find nearest sighting
  let nearestSighting: BeetleSightings['nearestSighting'] = null;
  if (allObservations.length > 0) {
    let minDist = Infinity;
    let nearestObs: INatObservation | null = null;

    for (const obs of allObservations) {
      const dist = haversineKm(lat, lng, obs.location.lat, obs.location.lng);
      if (dist < minDist) {
        minDist = dist;
        nearestObs = obs;
      }
    }

    if (nearestObs) {
      nearestSighting = {
        distanceKm: Math.round(minDist * 10) / 10,
        date: nearestObs.observedOn,
      };
    }
  }

  // Assess trend based on temporal distribution
  const now = Date.now();
  const sixMonthsAgo = now - 180 * 24 * 60 * 60 * 1000;
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;

  const recentCount = allObservations.filter(o =>
    new Date(o.observedOn).getTime() > sixMonthsAgo,
  ).length;
  const olderCount = allObservations.filter(o => {
    const t = new Date(o.observedOn).getTime();
    return t > oneYearAgo && t <= sixMonthsAgo;
  }).length;

  let trend: BeetleSightings['trend'] = 'stable';
  if (recentCount > olderCount * 1.5 && recentCount > 2) {
    trend = 'increasing';
  } else if (olderCount > recentCount * 1.5 && olderCount > 2) {
    trend = 'decreasing';
  }

  return {
    totalObservations: allObservations.length,
    recentObservations: allObservations.slice(0, 20),
    speciesBreakdown,
    nearestSighting,
    trend,
  };
}

/**
 * Fetch forest health indicator species near a location. LIVE API call.
 *
 * Queries three categories:
 *   1. Beetle predators — natural biocontrol (woodpeckers, ant beetles)
 *   2. Stress indicators — fungi/pests that signal declining tree health
 *   3. General forest health indicators — diverse species = healthy forest
 *
 * @param lat - Latitude in WGS84
 * @param lng - Longitude in WGS84
 */
export async function fetchIndicatorSpecies(
  lat: number,
  lng: number,
): Promise<IndicatorSpeciesResult> {
  const radiusKm = 25;

  // Fetch predators, stress indicators, and general forest observations in parallel
  const [predatorResults, stressResults, forestResults] = await Promise.all([
    // Beetle predator species
    Promise.allSettled(
      PREDATOR_TAXA.map(taxon => fetchNearbyObservations(lat, lng, radiusKm, taxon)),
    ),
    // Forest stress indicators
    Promise.allSettled(
      STRESS_INDICATOR_TAXA.map(taxon => fetchNearbyObservations(lat, lng, radiusKm, taxon)),
    ),
    // General forest health — broad insect search for diversity metric
    fetchNearbyObservations(lat, lng, radiusKm, 'Insecta'),
  ]);

  const beetlePredators: INatObservation[] = [];
  for (const result of predatorResults) {
    if (result.status === 'fulfilled') {
      beetlePredators.push(...result.value);
    }
  }

  const stressIndicators: INatObservation[] = [];
  for (const result of stressResults) {
    if (result.status === 'fulfilled') {
      stressIndicators.push(...result.value);
    }
  }

  const forestHealthIndicators = forestResults;

  // Calculate biodiversity index (0-1)
  // More unique species and predator presence = healthier ecosystem
  const uniqueSpecies = new Set([
    ...beetlePredators.map(o => o.scientificName),
    ...stressIndicators.map(o => o.scientificName),
    ...forestHealthIndicators.map(o => o.scientificName),
  ]).size;

  const predatorPresence = beetlePredators.length > 0 ? 0.3 : 0;
  const stressPenalty = stressIndicators.length > 5 ? -0.15 : 0;
  const diversityScore = Math.min(0.7, uniqueSpecies * 0.03);

  const biodiversityIndex = Math.round(
    Math.max(0, Math.min(1, predatorPresence + diversityScore + stressPenalty + 0.2)) * 100,
  ) / 100;

  // Generate summary
  const summaryParts: string[] = [];

  if (beetlePredators.length > 0) {
    const predatorSpecies = new Set(beetlePredators.map(o => o.species));
    summaryParts.push(
      `${predatorSpecies.size} beetle predator species detected nearby (${Array.from(predatorSpecies).slice(0, 3).join(', ')}), indicating active natural biocontrol.`,
    );
  } else {
    summaryParts.push(
      'No beetle predator species observed nearby. Natural biocontrol capacity may be limited.',
    );
  }

  if (stressIndicators.length > 3) {
    summaryParts.push(
      `${stressIndicators.length} stress indicator observations suggest some trees in the area may be weakened.`,
    );
  }

  summaryParts.push(
    `Overall biodiversity index: ${biodiversityIndex.toFixed(2)} (${biodiversityIndex > 0.6 ? 'healthy' : biodiversityIndex > 0.3 ? 'moderate' : 'low'}).`,
  );

  return {
    forestHealthIndicators,
    beetlePredators,
    stressIndicators,
    biodiversityIndex,
    summary: summaryParts.join(' '),
  };
}

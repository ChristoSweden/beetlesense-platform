/**
 * Artportalen — Swedish Species Observation System (SLU Artdatabanken)
 *
 * THE authoritative Swedish species database. Provides species observations,
 * red-listed species data, and biodiversity indicators for forest parcels.
 * Critical for biodiversity assessments and FSC/PEFC certification compliance.
 *
 * API requires a free API key from SLU Artdatabanken.
 * Falls back to demo data when key is not available.
 *
 * Docs: https://api-portal.artdatabanken.se/
 */

// ─── Types ───

export interface ArtportalenObservation {
  taxonId: number;
  scientificName: string;
  swedishName: string;
  observationDate: string;
  location: { lat: number; lng: number };
  quantity: number;
  redListCategory: string;
  protectedSpecies: boolean;
}

export interface SpeciesSummary {
  totalObservations: number;
  totalSpecies: number;
  redListedSpecies: number;
  barkBeetleObservations: number;
  indicatorSpecies: ArtportalenObservation[];
  biodiversityIndex: number;
}

// ─── Constants ───

const API_BASE = 'https://api.artdatabanken.se/species-observation-system/v1';

const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ARTDATABANKEN_API_KEY) || '';

// Cache (15 min)
let observationsCache: { key: string; data: ArtportalenObservation[]; fetchedAt: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000;

export const ARTPORTALEN_SOURCE_INFO = {
  name: 'Artportalen (Swedish Species Observation System)',
  provider: 'SLU Artdatabanken (Swedish University of Agricultural Sciences)',
  endpoint: API_BASE,
  license: 'CC BY 4.0 (public observations)',
  updateFrequency: 'Continuous — citizen science observations added daily',
  coverage: 'All of Sweden',
  apiKeyRequired: true,
  apiKeyEnvVar: 'VITE_ARTDATABANKEN_API_KEY',
  note: 'Free API key required via api-portal.artdatabanken.se. Falls back to demo data without key.',
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

function cacheKey(lat: number, lng: number, radiusKm: number): string {
  return `${lat.toFixed(3)}_${lng.toFixed(3)}_${radiusKm}`;
}

// ─── Demo Data ───

function generateDemoObservations(lat: number, lng: number): ArtportalenObservation[] {
  const now = new Date();
  const daysAgo = (d: number) => {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    return date.toISOString().split('T')[0];
  };

  return [
    {
      taxonId: 228325,
      scientificName: 'Ips typographus',
      swedishName: 'Åttatandad barkborre',
      observationDate: daysAgo(12),
      location: { lat: lat + 0.008, lng: lng - 0.005 },
      quantity: 45,
      redListCategory: 'LC',
      protectedSpecies: false,
    },
    {
      taxonId: 228326,
      scientificName: 'Pityogenes chalcographus',
      swedishName: 'Sextandad barkborre',
      observationDate: daysAgo(18),
      location: { lat: lat - 0.003, lng: lng + 0.007 },
      quantity: 22,
      redListCategory: 'LC',
      protectedSpecies: false,
    },
    {
      taxonId: 103048,
      scientificName: 'Picoides tridactylus',
      swedishName: 'Tretåig hackspett',
      observationDate: daysAgo(5),
      location: { lat: lat + 0.012, lng: lng + 0.003 },
      quantity: 2,
      redListCategory: 'NT',
      protectedSpecies: true,
    },
    {
      taxonId: 103032,
      scientificName: 'Dryobates minor',
      swedishName: 'Mindre hackspett',
      observationDate: daysAgo(8),
      location: { lat: lat - 0.006, lng: lng - 0.009 },
      quantity: 1,
      redListCategory: 'NT',
      protectedSpecies: false,
    },
    {
      taxonId: 206042,
      scientificName: 'Hericium coralloides',
      swedishName: 'Koralltaggsvamp',
      observationDate: daysAgo(30),
      location: { lat: lat + 0.004, lng: lng - 0.011 },
      quantity: 1,
      redListCategory: 'VU',
      protectedSpecies: true,
    },
    {
      taxonId: 100057,
      scientificName: 'Glaucidium passerinum',
      swedishName: 'Sparvuggla',
      observationDate: daysAgo(15),
      location: { lat: lat - 0.010, lng: lng + 0.006 },
      quantity: 1,
      redListCategory: 'LC',
      protectedSpecies: true,
    },
    {
      taxonId: 232567,
      scientificName: 'Osmoderma eremita',
      swedishName: 'Läderbagge',
      observationDate: daysAgo(45),
      location: { lat: lat + 0.015, lng: lng - 0.002 },
      quantity: 1,
      redListCategory: 'NT',
      protectedSpecies: true,
    },
    {
      taxonId: 206310,
      scientificName: 'Fomitopsis rosea',
      swedishName: 'Rosenticka',
      observationDate: daysAgo(22),
      location: { lat: lat - 0.007, lng: lng + 0.012 },
      quantity: 3,
      redListCategory: 'VU',
      protectedSpecies: false,
    },
    {
      taxonId: 100120,
      scientificName: 'Tetrao urogallus',
      swedishName: 'Tjäder',
      observationDate: daysAgo(3),
      location: { lat: lat + 0.009, lng: lng + 0.008 },
      quantity: 4,
      redListCategory: 'LC',
      protectedSpecies: false,
    },
    {
      taxonId: 100145,
      scientificName: 'Strix uralensis',
      swedishName: 'Slaguggla',
      observationDate: daysAgo(10),
      location: { lat: lat - 0.013, lng: lng - 0.004 },
      quantity: 1,
      redListCategory: 'LC',
      protectedSpecies: true,
    },
  ];
}

// ─── API Functions ───

/**
 * Fetch species observations near a coordinate.
 * Attempts live API call if VITE_ARTDATABANKEN_API_KEY is set,
 * otherwise returns realistic demo data for Swedish boreal forest.
 */
export async function fetchSpeciesNearby(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<ArtportalenObservation[]> {
  const key = cacheKey(lat, lng, radiusKm);

  // Check cache
  if (observationsCache && observationsCache.key === key && Date.now() - observationsCache.fetchedAt < CACHE_TTL) {
    return observationsCache.data;
  }

  // Attempt live API if key is available
  if (API_KEY) {
    try {
      const searchBody = {
        output: { fields: ['taxon', 'event', 'location', 'occurrence'] },
        filter: {
          geometries: {
            type: 'FeatureCollection',
            features: [{
              type: 'Feature',
              geometry: { type: 'Point', coordinates: [lng, lat] },
              properties: { buffer: radiusKm * 1000 },
            }],
          },
          date: {
            startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0],
          },
        },
      };

      const response = await fetch(`${API_BASE}/Observations/Search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Ocp-Apim-Subscription-Key': API_KEY,
        },
        body: JSON.stringify(searchBody),
      });

      if (!response.ok) {
        throw new Error(`Artdatabanken API returned ${response.status}`);
      }

      const data = await response.json();
      const records = Array.isArray(data.records) ? data.records : data;

      const observations: ArtportalenObservation[] = records.map((r: Record<string, Record<string, unknown>>) => ({
        taxonId: Number(r.taxon?.id ?? 0),
        scientificName: String(r.taxon?.scientificName ?? 'Unknown'),
        swedishName: String(r.taxon?.vernacularName ?? ''),
        observationDate: String(r.event?.startDate ?? new Date().toISOString()),
        location: {
          lat: Number(r.location?.decimalLatitude ?? lat),
          lng: Number(r.location?.decimalLongitude ?? lng),
        },
        quantity: Number(r.occurrence?.individualCount ?? 1),
        redListCategory: String(r.taxon?.redlistCategory ?? 'LC'),
        protectedSpecies: Boolean(r.taxon?.protectedByLaw),
      }));

      observationsCache = { key, data: observations, fetchedAt: Date.now() };
      return observations;
    } catch {
      // Fall through to demo data
    }
  }

  // Demo fallback
  const demo = generateDemoObservations(lat, lng).filter(
    (obs) => haversineDistanceKm(lat, lng, obs.location.lat, obs.location.lng) <= radiusKm
  );
  observationsCache = { key, data: demo, fetchedAt: Date.now() };
  return demo;
}

/**
 * Fetch bark beetle (Ips typographus and related) records near a location.
 * Filters species observations to Scolytinae subfamily.
 */
export async function fetchBarkBeetleRecords(
  lat: number,
  lng: number
): Promise<ArtportalenObservation[]> {
  const observations = await fetchSpeciesNearby(lat, lng, 10);

  const beetleKeywords = [
    'ips typographus',
    'pityogenes',
    'tomicus',
    'dendroctonus',
    'scolytus',
    'barkborre',
  ];

  return observations.filter((obs) => {
    const sci = obs.scientificName.toLowerCase();
    const swe = obs.swedishName.toLowerCase();
    return beetleKeywords.some((kw) => sci.includes(kw) || swe.includes(kw));
  });
}

/**
 * Fetch red-listed species observed near a location.
 * Red list categories: CR (critically endangered), EN (endangered),
 * VU (vulnerable), NT (near threatened).
 */
export async function fetchRedListedSpecies(
  lat: number,
  lng: number
): Promise<ArtportalenObservation[]> {
  const observations = await fetchSpeciesNearby(lat, lng, 5);
  const redListCategories = ['CR', 'EN', 'VU', 'NT'];
  return observations.filter((obs) => redListCategories.includes(obs.redListCategory));
}

/**
 * Get a biodiversity summary for a location — total species, red-listed count,
 * bark beetle observations, indicator species, and a biodiversity index (0-100).
 */
export async function getSpeciesSummary(
  lat: number,
  lng: number
): Promise<SpeciesSummary> {
  const observations = await fetchSpeciesNearby(lat, lng, 5);

  const uniqueSpecies = new Set(observations.map((o) => o.taxonId));
  const redListed = observations.filter((o) =>
    ['CR', 'EN', 'VU', 'NT'].includes(o.redListCategory)
  );
  const redListedSpecies = new Set(redListed.map((o) => o.taxonId));
  const beetleRecords = observations.filter((o) => {
    const sci = o.scientificName.toLowerCase();
    return sci.includes('ips') || sci.includes('pityogenes') || sci.includes('tomicus');
  });

  // Indicator species: protected or red-listed species that signal forest quality
  const indicatorSpecies = observations.filter(
    (o) => o.protectedSpecies || ['CR', 'EN', 'VU', 'NT'].includes(o.redListCategory)
  );

  // Biodiversity index (0-100): based on species richness, red-listed ratio, and indicator count
  const speciesRichness = Math.min(uniqueSpecies.size / 30, 1) * 40;
  const redListRatio = Math.min(redListedSpecies.size / 5, 1) * 30;
  const indicatorBonus = Math.min(indicatorSpecies.length / 8, 1) * 30;
  const biodiversityIndex = Math.round(speciesRichness + redListRatio + indicatorBonus);

  return {
    totalObservations: observations.length,
    totalSpecies: uniqueSpecies.size,
    redListedSpecies: redListedSpecies.size,
    barkBeetleObservations: beetleRecords.length,
    indicatorSpecies,
    biodiversityIndex: Math.min(biodiversityIndex, 100),
  };
}

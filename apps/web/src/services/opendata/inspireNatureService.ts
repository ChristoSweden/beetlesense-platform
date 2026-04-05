/**
 * EU INSPIRE Nature Domain Service
 *
 * Integrates 7 free EU INSPIRE Nature domain datasets:
 * 1. CDDA Protected Areas — all European protected sites
 * 2. Article 17 Habitats Directive Conservation Status
 * 3. EUNIS Habitat Classification
 * 4. Article 12 Bird Species Distribution
 * 5. Biogeographical Regions
 * 6. Pan-European Forest Type Map
 * 7. European Red List Habitats
 *
 * All endpoints are open, no API key required.
 * Coordinates use EPSG:4326 (WGS84).
 */

// ─── Cache ───

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, { data: unknown; ts: number }>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL_MS) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, ts: Date.now() });
}

// ─── Shared Types ───

/** Bounding box as [minLon, minLat, maxLon, maxLat] in EPSG:4326 */
type BBox = [number, number, number, number];

// ─── GeoJSON helper type ───

interface GeoJSONResponse {
  features?: Array<{
    properties?: Record<string, unknown>;
  }>;
}

// ─── 1. CDDA Protected Areas ───

const CDDA_WFS_BASE =
  'https://bio.discomap.eea.europa.eu/arcgis/services/ProtectedSites/CDDA_2022/MapServer/WFSServer';

export interface ProtectedArea {
  siteCode: string;
  siteName: string;
  designation: string;
  designationSv: string;
  iucnCategory: string;
  areaHa: number;
  yearEstablished: number | null;
  source: 'CDDA';
}

/** Map common designation types to Swedish */
const DESIGNATION_SV: Record<string, string> = {
  'National Park': 'Nationalpark',
  'Nature Reserve': 'Naturreservat',
  'Landscape Protection Area': 'Landskapsskyddsområde',
  'Wilderness Reserve': 'Vildmarksreservat',
  'Wildlife Sanctuary': 'Djurskyddsområde',
  'Habitat/Species Management Area': 'Habitat-/artskyddsområde',
  'Protected Landscape': 'Skyddat landskap',
};

/**
 * Fetch CDDA protected areas within a bounding box.
 *
 * Data source: European Environment Agency (EEA) — CDDA 2022.
 * Returns up to 30 sites. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Array of protected areas, or empty array on failure
 */
export async function fetchProtectedAreas(bbox: BBox): Promise<ProtectedArea[]> {
  const cacheKey = `cdda:${bbox.join(',')}`;
  const cached = getCached<ProtectedArea[]>(cacheKey);
  if (cached) return cached;

  const url =
    `${CDDA_WFS_BASE}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=CDDA_2022&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=geojson&COUNT=30`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WFS ${res.status}`);

    const geojson = (await res.json()) as GeoJSONResponse;
    const features = geojson.features ?? [];

    const results: ProtectedArea[] = features.map((f) => {
      const p = f.properties ?? {};
      const designation = String(p.desig_abbr ?? p.designation ?? '');
      return {
        siteCode: String(p.cddaId ?? p.siteCode ?? ''),
        siteName: String(p.siteName ?? p.name ?? ''),
        designation,
        designationSv: DESIGNATION_SV[designation] ?? designation,
        iucnCategory: String(p.iucnCategory ?? p.iucn_cat ?? ''),
        areaHa: Number(p.areaHa ?? p.area_ha ?? 0),
        yearEstablished: p.yearEstablished ? Number(p.yearEstablished) : null,
        source: 'CDDA' as const,
      };
    });

    setCache(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

// ─── 2. Article 17 Habitats Directive Conservation Status ───

const ARTICLE17_WFS_BASE =
  'https://bio.discomap.eea.europa.eu/arcgis/services/Article17/Article17_2019_HabitatsDirective/MapServer/WFSServer';

export interface ConservationStatus {
  habitatCode: string;
  habitatName: string;
  habitatNameSv: string;
  status: 'favourable' | 'unfavourable_inadequate' | 'unfavourable_bad' | 'unknown';
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  bioregion: string;
  reportingYear: number;
  source: 'Article17';
}

/** Nordic habitat code to Swedish name mapping */
const HABITAT_NAME_SV: Record<string, string> = {
  '9010': 'Västlig taiga',
  '9020': 'Fennoskandiska hemioreala naturliga urskogar',
  '9030': 'Landhöjningsskog',
  '9060': 'Åsbarrskog',
  '91D0': 'Skogbevuxna myrar',
};

/** Parse conservation status string into typed value */
function parseConservationStatus(
  raw: string
): ConservationStatus['status'] {
  const lower = raw.toLowerCase();
  if (lower.includes('favourable') && !lower.includes('un')) return 'favourable';
  if (lower.includes('inadequate')) return 'unfavourable_inadequate';
  if (lower.includes('bad')) return 'unfavourable_bad';
  return 'unknown';
}

/** Parse trend string into typed value */
function parseTrend(raw: string): ConservationStatus['trend'] {
  const lower = raw.toLowerCase();
  if (lower.includes('improv')) return 'improving';
  if (lower.includes('stable')) return 'stable';
  if (lower.includes('declin')) return 'declining';
  return 'unknown';
}

/**
 * Fetch Article 17 Habitats Directive conservation status within a bounding box.
 *
 * Data source: European Environment Agency (EEA) — Article 17, 2019 reporting.
 * Returns up to 10 results. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Conservation status data, or unknown fallback on failure
 */
export async function fetchConservationStatus(
  bbox: BBox
): Promise<ConservationStatus> {
  const cacheKey = `article17:${bbox.join(',')}`;
  const cached = getCached<ConservationStatus>(cacheKey);
  if (cached) return cached;

  const url =
    `${ARTICLE17_WFS_BASE}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=Article17_2019_HabitatsDirective&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=geojson&COUNT=10`;

  const fallback: ConservationStatus = {
    habitatCode: '',
    habitatName: 'Unknown',
    habitatNameSv: 'Okänd',
    status: 'unknown',
    trend: 'unknown',
    bioregion: 'Boreal',
    reportingYear: 2019,
    source: 'Article17',
  };

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WFS ${res.status}`);

    const geojson = (await res.json()) as GeoJSONResponse;
    const features = geojson.features ?? [];

    if (features.length === 0) {
      setCache(cacheKey, fallback);
      return fallback;
    }

    const p = features[0].properties ?? {};
    const habitatCode = String(p.habitatcode ?? p.habitat_code ?? '');
    const habitatName = String(p.habitatname ?? p.habitat_name ?? 'Unknown');

    const result: ConservationStatus = {
      habitatCode,
      habitatName,
      habitatNameSv: HABITAT_NAME_SV[habitatCode] ?? habitatName,
      status: parseConservationStatus(String(p.conclusion_assessment ?? p.conservation_status ?? '')),
      trend: parseTrend(String(p.trend ?? p.conclusion_trend ?? '')),
      bioregion: String(p.bioregion ?? p.bio_region ?? 'Boreal'),
      reportingYear: Number(p.reportingYear ?? p.reporting_year ?? 2019),
      source: 'Article17',
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    return fallback;
  }
}

// ─── 3. EUNIS Habitat Classification ───

const EUNIS_WMS_BASE =
  'https://image.discomap.eea.europa.eu/arcgis/services/Habitats/EUNISHabitatType_2012/MapServer/WMSServer';

export interface HabitatType {
  eunisCode: string;
  habitatName: string;
  habitatNameSv: string;
  level: number;
  isForest: boolean;
  dominantSpecies: string[];
  source: 'EUNIS';
}

/** EUNIS forest type mappings */
const EUNIS_TYPES: Record<string, { name: string; nameSv: string; species: string[] }> = {
  'T1': {
    name: 'Broadleaved deciduous forest',
    nameSv: 'Lövfällande lövskog',
    species: ['Quercus robur', 'Fagus sylvatica', 'Betula pendula'],
  },
  'T3': {
    name: 'Coniferous forest',
    nameSv: 'Barrskog',
    species: ['Picea abies', 'Pinus sylvestris'],
  },
  'T3-1': {
    name: 'Boreal and temperate acidophilous spruce forest',
    nameSv: 'Boreal sur granskog',
    species: ['Picea abies', 'Vaccinium myrtillus'],
  },
  'T3-4': {
    name: 'Pine forest on sandy soils',
    nameSv: 'Tallskog på sandjord',
    species: ['Pinus sylvestris', 'Calluna vulgaris'],
  },
  'T3-J': {
    name: 'Boreal bog conifer woodland',
    nameSv: 'Boreal myrbarrskog',
    species: ['Picea abies', 'Pinus sylvestris', 'Sphagnum spp.'],
  },
};

/** Default boreal coniferous type for fallback */
const DEFAULT_HABITAT_TYPE: HabitatType = {
  eunisCode: 'T3',
  habitatName: 'Coniferous forest',
  habitatNameSv: 'Barrskog',
  level: 1,
  isForest: true,
  dominantSpecies: ['Picea abies', 'Pinus sylvestris'],
  source: 'EUNIS',
};

/**
 * Fetch EUNIS habitat classification at the center of a bounding box.
 *
 * Data source: EEA — EUNIS Habitat Type Map 2012.
 * Uses WMS GetFeatureInfo at the bbox center. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Habitat type data, or default boreal coniferous type on failure
 */
export async function fetchHabitatType(bbox: BBox): Promise<HabitatType> {
  const cacheKey = `eunis:${bbox.join(',')}`;
  const cached = getCached<HabitatType>(cacheKey);
  if (cached) return cached;

  const url =
    `${EUNIS_WMS_BASE}?SERVICE=WMS&REQUEST=GetFeatureInfo&VERSION=1.3.0` +
    `&LAYERS=0&QUERY_LAYERS=0&CRS=EPSG:4326&BBOX=${bbox.join(',')}` +
    `&WIDTH=256&HEIGHT=256&I=128&J=128&INFO_FORMAT=application/json`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WMS ${res.status}`);

    const data = (await res.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
      results?: Array<{ attributes?: Record<string, unknown> }>;
    };

    // Try GeoJSON format first, then ESRI JSON
    const props =
      data.features?.[0]?.properties ??
      data.results?.[0]?.attributes ??
      null;

    if (!props) {
      setCache(cacheKey, DEFAULT_HABITAT_TYPE);
      return DEFAULT_HABITAT_TYPE;
    }

    const eunisCode = String(props.code ?? props.EUNIS_Code ?? props.eunis_code ?? 'T3');
    const lookup = EUNIS_TYPES[eunisCode];
    const level = eunisCode.split('-').length;

    const result: HabitatType = {
      eunisCode,
      habitatName: lookup?.name ?? String(props.name ?? props.habitat_name ?? 'Unknown'),
      habitatNameSv: lookup?.nameSv ?? String(props.name ?? 'Okänd'),
      level,
      isForest: eunisCode.startsWith('T'),
      dominantSpecies: lookup?.species ?? [],
      source: 'EUNIS',
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    return DEFAULT_HABITAT_TYPE;
  }
}

// ─── 4. Article 12 Bird Species Distribution ───

const ARTICLE12_WFS_BASE =
  'https://bio.discomap.eea.europa.eu/arcgis/services/Article12/Article12_2020_BirdsDirective/MapServer/WFSServer';

export interface BirdSpeciesData {
  totalSpecies: number;
  protectedSpecies: number;
  notableSpecies: Array<{
    scientificName: string;
    commonName: string;
    commonNameSv: string;
    annex1: boolean;
    populationTrend: 'increasing' | 'stable' | 'declining' | 'unknown';
  }>;
  source: 'Article12';
}

/** Nordic forest bird species: scientific name -> { en, sv } */
const BIRD_NAMES: Record<string, { en: string; sv: string }> = {
  'Dryocopus martius': { en: 'Black Woodpecker', sv: 'Spillkråka' },
  'Dendrocopos leucotos': { en: 'White-backed Woodpecker', sv: 'Vitryggig hackspett' },
  'Glaucidium passerinum': { en: 'Eurasian Pygmy Owl', sv: 'Sparvuggla' },
  'Aquila chrysaetos': { en: 'Golden Eagle', sv: 'Kungsörn' },
  'Tetrao urogallus': { en: 'Western Capercaillie', sv: 'Tjäder' },
  'Bonasa bonasia': { en: 'Hazel Grouse', sv: 'Järpe' },
  'Picoides tridactylus': { en: 'Three-toed Woodpecker', sv: 'Tretåig hackspett' },
};

/**
 * Fetch Article 12 Bird Species Distribution data within a bounding box.
 *
 * Data source: European Environment Agency (EEA) — Article 12, 2020 reporting.
 * Returns up to 50 species. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Bird species data, or empty result on failure
 */
export async function fetchBirdSpecies(bbox: BBox): Promise<BirdSpeciesData> {
  const cacheKey = `article12:${bbox.join(',')}`;
  const cached = getCached<BirdSpeciesData>(cacheKey);
  if (cached) return cached;

  const url =
    `${ARTICLE12_WFS_BASE}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=Article12_2020_BirdsDirective&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=geojson&COUNT=50`;

  const empty: BirdSpeciesData = {
    totalSpecies: 0,
    protectedSpecies: 0,
    notableSpecies: [],
    source: 'Article12',
  };

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WFS ${res.status}`);

    const geojson = (await res.json()) as GeoJSONResponse;
    const features = geojson.features ?? [];

    if (features.length === 0) {
      setCache(cacheKey, empty);
      return empty;
    }

    const speciesSet = new Set<string>();
    const annex1Set = new Set<string>();
    const notableSpecies: BirdSpeciesData['notableSpecies'] = [];

    for (const f of features) {
      const p = f.properties ?? {};
      const sciName = String(p.speciesname ?? p.species_name ?? p.scientific_name ?? '');
      if (!sciName) continue;

      speciesSet.add(sciName);

      const isAnnex1 =
        p.annex1 === true ||
        p.annex1 === 'Y' ||
        p.annex_i === true ||
        p.annex_i === 'Y';

      if (isAnnex1) annex1Set.add(sciName);

      const birdInfo = BIRD_NAMES[sciName];
      if (birdInfo && !notableSpecies.some((s) => s.scientificName === sciName)) {
        const trendRaw = String(p.population_trend ?? p.trend ?? '').toLowerCase();
        let populationTrend: 'increasing' | 'stable' | 'declining' | 'unknown' = 'unknown';
        if (trendRaw.includes('increas')) populationTrend = 'increasing';
        else if (trendRaw.includes('stable')) populationTrend = 'stable';
        else if (trendRaw.includes('declin')) populationTrend = 'declining';

        notableSpecies.push({
          scientificName: sciName,
          commonName: birdInfo.en,
          commonNameSv: birdInfo.sv,
          annex1: isAnnex1,
          populationTrend,
        });
      }
    }

    const result: BirdSpeciesData = {
      totalSpecies: speciesSet.size,
      protectedSpecies: annex1Set.size,
      notableSpecies,
      source: 'Article12',
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    return empty;
  }
}

// ─── 5. Biogeographical Regions ───

const BIOREGION_WFS_BASE =
  'https://bio.discomap.eea.europa.eu/arcgis/services/Biogeography/BiogeoRegions2016/MapServer/WFSServer';

export interface Bioregion {
  code: string;
  name: string;
  nameSv: string;
  description: string;
  typicalSpecies: string[];
  source: 'EEA';
}

/** Swedish biogeographical regions */
const BIOREGION_INFO: Record<string, { nameSv: string; description: string; species: string[] }> = {
  BOR: {
    nameSv: 'Boreal',
    description: 'Characterized by coniferous forests dominated by spruce and pine, covering most of Sweden from central Svealand northward.',
    species: ['Picea abies', 'Pinus sylvestris', 'Betula pendula', 'Vaccinium myrtillus'],
  },
  CON: {
    nameSv: 'Kontinental',
    description: 'Continental region covering southernmost Sweden with mixed deciduous and coniferous forests, richer soils and milder climate.',
    species: ['Fagus sylvatica', 'Quercus robur', 'Fraxinus excelsior', 'Carpinus betulus'],
  },
  ALP: {
    nameSv: 'Alpin',
    description: 'Alpine region along the Scandinavian mountain range (Scandes) with birch forests, heathlands and alpine meadows.',
    species: ['Betula pubescens', 'Salix spp.', 'Juniperus communis', 'Vaccinium vitis-idaea'],
  },
};

/**
 * Fetch biogeographical region for a bounding box.
 *
 * Data source: European Environment Agency (EEA) — Biogeographical Regions 2016.
 * Returns up to 5 results. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Bioregion data, or default Boreal region on failure
 */
export async function fetchBioregion(bbox: BBox): Promise<Bioregion> {
  const cacheKey = `bioregion:${bbox.join(',')}`;
  const cached = getCached<Bioregion>(cacheKey);
  if (cached) return cached;

  const url =
    `${BIOREGION_WFS_BASE}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=BiogeoRegions2016&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=geojson&COUNT=5`;

  const defaultBioregion: Bioregion = {
    code: 'BOR',
    name: 'Boreal',
    nameSv: 'Boreal',
    description: BIOREGION_INFO.BOR.description,
    typicalSpecies: BIOREGION_INFO.BOR.species,
    source: 'EEA',
  };

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WFS ${res.status}`);

    const geojson = (await res.json()) as GeoJSONResponse;
    const features = geojson.features ?? [];

    if (features.length === 0) {
      setCache(cacheKey, defaultBioregion);
      return defaultBioregion;
    }

    const p = features[0].properties ?? {};
    const code = String(p.code ?? p.PK_UID ?? p.short_name ?? 'BOR').toUpperCase();
    const name = String(p.name ?? p.long_name ?? 'Boreal');
    const info = BIOREGION_INFO[code];

    const result: Bioregion = {
      code,
      name,
      nameSv: info?.nameSv ?? name,
      description: info?.description ?? `${name} biogeographical region.`,
      typicalSpecies: info?.species ?? [],
      source: 'EEA',
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    return defaultBioregion;
  }
}

// ─── 6. Pan-European Forest Type Map ───

const FOREST_TYPE_WMS_BASE =
  'https://image.discomap.eea.europa.eu/arcgis/services/ForestSpatialPattern/FTYPE_100m_2015/MapServer/WMSServer';

export interface ForestType {
  typeCode: number;
  typeName: string;
  typeNameSv: string;
  subtype: string;
  canopyCover: 'closed' | 'open' | 'sparse';
  isPrimary: boolean;
  source: 'JRC';
}

/** Forest type code mappings */
const FOREST_TYPES: Record<number, { name: string; nameSv: string; subtype: string }> = {
  1: { name: 'Broadleaved deciduous', nameSv: 'Lövfällande lövskog', subtype: 'Mixed broadleaf' },
  2: { name: 'Coniferous evergreen', nameSv: 'Vintergröna barrträd', subtype: 'Mixed conifer' },
  3: { name: 'Mixed', nameSv: 'Blandskog', subtype: 'Mixed broadleaf-conifer' },
  7: { name: 'Boreal coniferous', nameSv: 'Boreal barrskog', subtype: 'Picea abies dominated' },
  8: { name: 'Boreal coniferous', nameSv: 'Boreal barrskog', subtype: 'Pinus sylvestris dominated' },
  9: { name: 'Boreal mixed', nameSv: 'Boreal blandskog', subtype: 'Boreal mixed conifer-broadleaf' },
};

/**
 * Fetch Pan-European forest type at the center of a bounding box.
 *
 * Data source: JRC — Forest Type Map 100m, 2015.
 * Uses WMS GetFeatureInfo at the bbox center. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Forest type data, or default boreal coniferous type on failure
 */
export async function fetchForestType(bbox: BBox): Promise<ForestType> {
  const cacheKey = `foresttype:${bbox.join(',')}`;
  const cached = getCached<ForestType>(cacheKey);
  if (cached) return cached;

  const url =
    `${FOREST_TYPE_WMS_BASE}?SERVICE=WMS&REQUEST=GetFeatureInfo&VERSION=1.3.0` +
    `&LAYERS=0&QUERY_LAYERS=0&CRS=EPSG:4326&BBOX=${bbox.join(',')}` +
    `&WIDTH=256&HEIGHT=256&I=128&J=128&INFO_FORMAT=application/json`;

  const defaultForestType: ForestType = {
    typeCode: 7,
    typeName: 'Boreal coniferous',
    typeNameSv: 'Boreal barrskog',
    subtype: 'Picea abies dominated',
    canopyCover: 'closed',
    isPrimary: true,
    source: 'JRC',
  };

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WMS ${res.status}`);

    const data = (await res.json()) as {
      features?: Array<{ properties?: Record<string, unknown> }>;
      results?: Array<{ attributes?: Record<string, unknown> }>;
    };

    const props =
      data.features?.[0]?.properties ??
      data.results?.[0]?.attributes ??
      null;

    if (!props) {
      setCache(cacheKey, defaultForestType);
      return defaultForestType;
    }

    const typeCode = Number(props.forest_type ?? props.FTYPE ?? props.Pixel_Value ?? 7);
    const info = FOREST_TYPES[typeCode];

    // Infer canopy cover from pixel value range or separate property
    const coverRaw = String(props.canopy_cover ?? props.cover ?? '').toLowerCase();
    let canopyCover: ForestType['canopyCover'] = 'closed';
    if (coverRaw.includes('open') || coverRaw.includes('sparse')) {
      canopyCover = coverRaw.includes('sparse') ? 'sparse' : 'open';
    }

    const result: ForestType = {
      typeCode,
      typeName: info?.name ?? 'Unknown',
      typeNameSv: info?.nameSv ?? 'Okänd',
      subtype: info?.subtype ?? 'Unknown',
      canopyCover,
      isPrimary: !(props.planted === true || props.is_plantation === true),
      source: 'JRC',
    };

    setCache(cacheKey, result);
    return result;
  } catch {
    return defaultForestType;
  }
}

// ─── 7. European Red List Habitats ───

const REDLIST_WFS_BASE =
  'https://bio.discomap.eea.europa.eu/arcgis/services/RedList/EuropeanRedListHabitats/MapServer/WFSServer';

export interface RedListHabitat {
  habitatName: string;
  habitatNameSv: string;
  redListCategory: 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD';
  redListLabel: string;
  redListLabelSv: string;
  trend: 'improving' | 'stable' | 'declining' | 'unknown';
  source: 'IUCN_EEA';
}

/** IUCN Red List category labels */
const REDLIST_LABELS: Record<string, { en: string; sv: string }> = {
  CR: { en: 'Critically Endangered', sv: 'Akut hotad' },
  EN: { en: 'Endangered', sv: 'Starkt hotad' },
  VU: { en: 'Vulnerable', sv: 'Sårbar' },
  NT: { en: 'Near Threatened', sv: 'Nära hotad' },
  LC: { en: 'Least Concern', sv: 'Livskraftig' },
  DD: { en: 'Data Deficient', sv: 'Kunskapsbrist' },
};

/** Parse IUCN category from raw string */
function parseRedListCategory(raw: string): RedListHabitat['redListCategory'] {
  const upper = raw.toUpperCase().trim();
  if (upper === 'CR' || upper === 'EN' || upper === 'VU' || upper === 'NT' || upper === 'LC' || upper === 'DD') {
    return upper;
  }
  // Try to match by label
  if (upper.includes('CRITICALLY')) return 'CR';
  if (upper.includes('ENDANGERED')) return 'EN';
  if (upper.includes('VULNERABLE')) return 'VU';
  if (upper.includes('NEAR')) return 'NT';
  if (upper.includes('LEAST')) return 'LC';
  return 'DD';
}

/**
 * Fetch European Red List habitats within a bounding box.
 *
 * Data source: IUCN / European Environment Agency (EEA) — European Red List of Habitats.
 * Returns up to 20 results. Results are cached for 5 minutes.
 *
 * @param bbox Bounding box [minLon, minLat, maxLon, maxLat] in EPSG:4326
 * @returns Array of Red List habitats, or empty array on failure
 */
export async function fetchRedListHabitats(bbox: BBox): Promise<RedListHabitat[]> {
  const cacheKey = `redlist:${bbox.join(',')}`;
  const cached = getCached<RedListHabitat[]>(cacheKey);
  if (cached) return cached;

  const url =
    `${REDLIST_WFS_BASE}?SERVICE=WFS&REQUEST=GetFeature&VERSION=2.0.0` +
    `&TYPENAMES=EuropeanRedListHabitats&BBOX=${bbox.join(',')},EPSG:4326` +
    `&OUTPUTFORMAT=geojson&COUNT=20`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`WFS ${res.status}`);

    const geojson = (await res.json()) as GeoJSONResponse;
    const features = geojson.features ?? [];

    const results: RedListHabitat[] = features.map((f) => {
      const p = f.properties ?? {};
      const categoryRaw = String(p.redListCategory ?? p.category ?? p.rlCategory ?? 'DD');
      const category = parseRedListCategory(categoryRaw);
      const labels = REDLIST_LABELS[category] ?? REDLIST_LABELS.DD;

      const trendRaw = String(p.trend ?? p.overall_trend ?? '').toLowerCase();
      let trend: RedListHabitat['trend'] = 'unknown';
      if (trendRaw.includes('improv')) trend = 'improving';
      else if (trendRaw.includes('stable')) trend = 'stable';
      else if (trendRaw.includes('declin')) trend = 'declining';

      return {
        habitatName: String(p.habitatName ?? p.habitat_name ?? p.name ?? 'Unknown'),
        habitatNameSv: String(p.habitatNameSv ?? p.habitat_name ?? p.name ?? 'Okänd'),
        redListCategory: category,
        redListLabel: labels.en,
        redListLabelSv: labels.sv,
        trend,
        source: 'IUCN_EEA' as const,
      };
    });

    setCache(cacheKey, results);
    return results;
  } catch {
    return [];
  }
}

// SGU (Geological Survey of Sweden) soil data service
export interface SoilProfile {
  type: SoilType;
  typeSv: string;
  depth_m: number;
  moisture_class: 'torr' | 'frisk' | 'fuktig' | 'blöt';
  bearing_capacity: number; // 1-10
  growth_potential: number; // 1-10
  suitable_species: SpeciesSuitability[];
  description: string;
  color: string;
}

export type SoilType = 'moran' | 'lera' | 'sand' | 'torv' | 'berg' | 'silt' | 'grus';

export interface SpeciesSuitability {
  species: string;
  speciesSv: string;
  rating: number; // 1-5 stars
  notes: string;
}

export interface SoilMapData {
  features: SoilFeature[];
  bbox: [number, number, number, number];
}

export interface SoilFeature {
  type: SoilType;
  typeSv: string;
  color: string;
  geometry: { lat: number; lon: number }[];
  area_pct: number;
}

export interface GroundWater {
  depth_m: number;
  trend: 'rising' | 'stable' | 'falling';
  seasonal_range: [number, number];
  measurement_date: string;
}

export type BBox = [number, number, number, number];

const SOIL_PROFILES: Record<SoilType, Omit<SoilProfile, 'depth_m'>> = {
  moran: {
    type: 'moran',
    typeSv: 'Morän (Till)',
    moisture_class: 'frisk',
    bearing_capacity: 7,
    growth_potential: 7,
    color: '#8B6914',
    description: 'Osorterat material avsatt av inlandsis. Vanligaste jordarten i Sverige. Bra dränering och näringsinnehåll.',
    suitable_species: [
      { species: 'Picea abies', speciesSv: 'Gran', rating: 5, notes: 'Utmärkt — trivs i frisk morän' },
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 4, notes: 'Mycket bra — föredrar dock torrare mark' },
      { species: 'Betula pendula', speciesSv: 'Björk', rating: 4, notes: 'Bra — pionjärart' },
      { species: 'Quercus robur', speciesSv: 'Ek', rating: 3, notes: 'Möjlig på rikare morän i söder' },
      { species: 'Fagus sylvatica', speciesSv: 'Bok', rating: 2, notes: 'Kräver rikare mark — marginellt' },
    ],
  },
  lera: {
    type: 'lera',
    typeSv: 'Lera (Clay)',
    moisture_class: 'fuktig',
    bearing_capacity: 3,
    growth_potential: 8,
    color: '#708090',
    description: 'Finkorning sedimentär jord. Hög näringstillgång men dålig bärighet. Sväller vid väta.',
    suitable_species: [
      { species: 'Picea abies', speciesSv: 'Gran', rating: 4, notes: 'Bra men risk för vindfall på blöt lera' },
      { species: 'Betula pendula', speciesSv: 'Björk', rating: 5, notes: 'Utmärkt — tolererar fuktig mark' },
      { species: 'Alnus glutinosa', speciesSv: 'Al', rating: 5, notes: 'Perfekt — kvävefixerande' },
      { species: 'Fraxinus excelsior', speciesSv: 'Ask', rating: 4, notes: 'Bra men askskottsjuka risk' },
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 2, notes: 'Olämplig — kräver torrare mark' },
    ],
  },
  sand: {
    type: 'sand',
    typeSv: 'Sand',
    moisture_class: 'torr',
    bearing_capacity: 8,
    growth_potential: 4,
    color: '#DAA520',
    description: 'Grovkornig jord med snabb dränering. Lågt näringsinnehåll men utmärkt bärighet.',
    suitable_species: [
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 5, notes: 'Perfekt — tallens naturliga habitat' },
      { species: 'Betula pendula', speciesSv: 'Björk', rating: 3, notes: 'Acceptabel — torrt för optimal tillväxt' },
      { species: 'Picea abies', speciesSv: 'Gran', rating: 2, notes: 'Olämplig — för torrt' },
      { species: 'Quercus robur', speciesSv: 'Ek', rating: 2, notes: 'Möjlig men långsam tillväxt' },
      { species: 'Pinus contorta', speciesSv: 'Contortatall', rating: 4, notes: 'Bra alternativ på mager mark' },
    ],
  },
  torv: {
    type: 'torv',
    typeSv: 'Torv (Peat)',
    moisture_class: 'blöt',
    bearing_capacity: 1,
    growth_potential: 3,
    color: '#3D2B1F',
    description: 'Organisk jord bildad i våtmarker. Mycket låg bärighet. Dikad torvmark kan ge acceptabel produktion.',
    suitable_species: [
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 3, notes: 'Möjlig på dikad torv' },
      { species: 'Betula pubescens', speciesSv: 'Glasbjörk', rating: 4, notes: 'Tolererar blöt mark väl' },
      { species: 'Picea abies', speciesSv: 'Gran', rating: 2, notes: 'Kräver effektiv dikning' },
      { species: 'Alnus glutinosa', speciesSv: 'Al', rating: 4, notes: 'Bra — naturlig i våtmarker' },
      { species: 'Salix sp.', speciesSv: 'Vide', rating: 5, notes: 'Naturligt habitat' },
    ],
  },
  berg: {
    type: 'berg',
    typeSv: 'Berg (Bedrock)',
    moisture_class: 'torr',
    bearing_capacity: 10,
    growth_potential: 1,
    color: '#A9A9A9',
    description: 'Blottlagt berg utan jordtäcke. Extremt begränsad tillväxtpotential.',
    suitable_species: [
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 2, notes: 'Kan växa i bergskrevor' },
      { species: 'Betula pendula', speciesSv: 'Björk', rating: 1, notes: 'Minimalt substrat' },
      { species: 'Picea abies', speciesSv: 'Gran', rating: 1, notes: 'Olämpligt' },
      { species: 'Juniperus communis', speciesSv: 'En', rating: 3, notes: 'Tolererar extremt' },
      { species: 'Sorbus aucuparia', speciesSv: 'Rönn', rating: 2, notes: 'Kan klara sig' },
    ],
  },
  silt: {
    type: 'silt',
    typeSv: 'Silt',
    moisture_class: 'fuktig',
    bearing_capacity: 4,
    growth_potential: 6,
    color: '#C4A882',
    description: 'Mellankornig sedimentär jord. Bra näringstillgång men risk för erosion och tjäle.',
    suitable_species: [
      { species: 'Picea abies', speciesSv: 'Gran', rating: 4, notes: 'Bra tillväxt' },
      { species: 'Betula pendula', speciesSv: 'Björk', rating: 4, notes: 'Bra' },
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 3, notes: 'Acceptabel' },
      { species: 'Populus tremula', speciesSv: 'Asp', rating: 4, notes: 'Trivs bra i silt' },
      { species: 'Quercus robur', speciesSv: 'Ek', rating: 3, notes: 'Möjlig i södra Sverige' },
    ],
  },
  grus: {
    type: 'grus',
    typeSv: 'Grus (Gravel)',
    moisture_class: 'torr',
    bearing_capacity: 9,
    growth_potential: 3,
    color: '#B8860B',
    description: 'Mycket grovkornig jord med snabb dränering. God bärighet men låg vattenhållande förmåga.',
    suitable_species: [
      { species: 'Pinus sylvestris', speciesSv: 'Tall', rating: 5, notes: 'Utmärkt' },
      { species: 'Betula pendula', speciesSv: 'Björk', rating: 3, notes: 'Acceptabel' },
      { species: 'Picea abies', speciesSv: 'Gran', rating: 1, notes: 'Olämplig — för torrt' },
      { species: 'Pinus contorta', speciesSv: 'Contortatall', rating: 4, notes: 'Bra alternativ' },
      { species: 'Juniperus communis', speciesSv: 'En', rating: 4, notes: 'Naturlig' },
    ],
  },
};

export async function getSoilType(lat: number, lon: number): Promise<SoilProfile> {
  await new Promise(r => setTimeout(r, 200));
  // Deterministic soil type based on coordinates
  const hash = Math.abs(Math.sin(lat * 1000 + lon * 500)) * 100;
  const types: SoilType[] = ['moran', 'moran', 'moran', 'lera', 'sand', 'torv', 'silt'];
  const soilType = types[Math.floor(hash) % types.length];
  const profile = SOIL_PROFILES[soilType];
  return { ...profile, depth_m: Math.round((1.5 + hash * 0.03) * 10) / 10 };
}

export async function getSoilMap(bbox: BBox): Promise<SoilMapData> {
  await new Promise(r => setTimeout(r, 250));
  return {
    bbox,
    features: [
      { type: 'moran', typeSv: 'Morän', color: '#8B6914', geometry: [], area_pct: 55 },
      { type: 'lera', typeSv: 'Lera', color: '#708090', geometry: [], area_pct: 15 },
      { type: 'sand', typeSv: 'Sand', color: '#DAA520', geometry: [], area_pct: 12 },
      { type: 'torv', typeSv: 'Torv', color: '#3D2B1F', geometry: [], area_pct: 10 },
      { type: 'berg', typeSv: 'Berg', color: '#A9A9A9', geometry: [], area_pct: 5 },
      { type: 'silt', typeSv: 'Silt', color: '#C4A882', geometry: [], area_pct: 3 },
    ],
  };
}

export async function getGroundWaterLevel(_lat: number, _lon: number): Promise<GroundWater> {
  await new Promise(r => setTimeout(r, 100));
  return {
    depth_m: 2.4,
    trend: 'stable',
    seasonal_range: [1.2, 3.8],
    measurement_date: '2026-03-15',
  };
}

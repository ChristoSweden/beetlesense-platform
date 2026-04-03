/**
 * Biodiversity Service — Shannon-Wiener Index and ecological metrics.
 *
 * Implements real ecological diversity calculations:
 *   - Shannon-Wiener entropy: H' = -Σ(pi × ln(pi))
 *   - Simpson's diversity: 1 - D = 1 - Σ(pi²)
 *   - Species richness: S = total number of species
 *   - Evenness (Pielou): J' = H' / ln(S)
 *
 * Aligned with EU Biodiversity Strategy 2030 targets and
 * Swedish forestry conservation standards.
 *
 * References:
 *   - Shannon CE (1948) A Mathematical Theory of Communication
 *   - Simpson EH (1949) Measurement of Diversity
 *   - Pielou EC (1966) Shannon's formula as a measure of species diversity
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type SpeciesCategory = 'tree' | 'ground' | 'bird' | 'insect' | 'mammal';

export interface Species {
  name: string;
  nameSwedish: string;
  count: number;
  category: SpeciesCategory;
}

export interface DiversityMetrics {
  /** Shannon-Wiener diversity index H' */
  shannonIndex: number;
  /** Simpson's diversity index 1-D */
  simpsonIndex: number;
  /** Total number of species */
  speciesRichness: number;
  /** Pielou's evenness J' = H'/ln(S) */
  evenness: number;
  /** Total individual count */
  totalIndividuals: number;
}

export type ConservationPriority = 'low' | 'medium' | 'high' | 'critical';

export interface EU2030Alignment {
  /** Overall alignment score 0-100 */
  score: number;
  /** Target: 30% under effective biodiversity management */
  effectiveManagement: boolean;
  /** Target: legally binding restoration */
  restorationNeeded: boolean;
  /** Target: no deterioration of conservation status */
  noDeterioration: boolean;
  /** Recommendations for improving alignment */
  recommendations: string[];
}

export interface BiodiversityAssessment {
  metrics: DiversityMetrics;
  conservationPriority: ConservationPriority;
  eu2030: EU2030Alignment;
  /** Species breakdown by category */
  categoryBreakdown: { category: SpeciesCategory; count: number; speciesCount: number }[];
  /** Interpretation text */
  interpretation: string;
  /** Swedish interpretation */
  interpretationSv: string;
}

// ─── Core Calculations ─────────────────────────────────────────────────────

/**
 * Shannon-Wiener entropy: H' = -Σ(pi × ln(pi))
 * where pi is the proportion of individuals in species i.
 */
function calculateShannonIndex(species: Species[]): number {
  const total = species.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return 0;

  let h = 0;
  for (const s of species) {
    if (s.count <= 0) continue;
    const pi = s.count / total;
    h -= pi * Math.log(pi); // natural log (ln)
  }

  return Math.round(h * 1000) / 1000;
}

/**
 * Simpson's diversity: 1 - D = 1 - Σ(pi²)
 * Higher values indicate greater diversity.
 */
function calculateSimpsonIndex(species: Species[]): number {
  const total = species.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) return 0;

  let d = 0;
  for (const s of species) {
    if (s.count <= 0) continue;
    const pi = s.count / total;
    d += pi * pi;
  }

  return Math.round((1 - d) * 1000) / 1000;
}

/**
 * Pielou's evenness: J' = H' / ln(S)
 * Ranges 0-1: 1 = perfectly even distribution.
 */
function calculateEvenness(shannonIndex: number, speciesRichness: number): number {
  if (speciesRichness <= 1) return 0;
  return Math.round((shannonIndex / Math.log(speciesRichness)) * 1000) / 1000;
}

/**
 * Calculate all diversity metrics for a species list.
 */
function calculateMetrics(species: Species[]): DiversityMetrics {
  const validSpecies = species.filter(s => s.count > 0);
  const shannonIndex = calculateShannonIndex(validSpecies);
  const simpsonIndex = calculateSimpsonIndex(validSpecies);
  const speciesRichness = validSpecies.length;
  const evenness = calculateEvenness(shannonIndex, speciesRichness);
  const totalIndividuals = validSpecies.reduce((sum, s) => sum + s.count, 0);

  return { shannonIndex, simpsonIndex, speciesRichness, evenness, totalIndividuals };
}

// ─── Conservation Assessment ───────────────────────────────────────────────

/**
 * Determine conservation priority based on diversity metrics.
 *
 * Thresholds calibrated for Swedish boreal/hemiboreal forests:
 *   - H' < 0.5: Critical — severe monoculture, very low diversity
 *   - H' 0.5-1.0: High — below natural baseline, active management needed
 *   - H' 1.0-1.5: Medium — moderate diversity, improvement possible
 *   - H' > 1.5: Low — approaching natural forest diversity levels
 */
export function getConservationPriority(assessment: BiodiversityAssessment): ConservationPriority {
  const { shannonIndex, evenness, speciesRichness } = assessment.metrics;

  // Critical: severe monoculture
  if (shannonIndex < 0.5 || (speciesRichness <= 2 && evenness < 0.3)) {
    return 'critical';
  }

  // High: below acceptable thresholds
  if (shannonIndex < 1.0 || (evenness < 0.5 && speciesRichness < 5)) {
    return 'high';
  }

  // Medium: moderate diversity with room for improvement
  if (shannonIndex < 1.5 || evenness < 0.7) {
    return 'medium';
  }

  // Low: good diversity levels
  return 'low';
}

/**
 * Assess alignment with EU Biodiversity Strategy 2030 targets.
 */
function assessEU2030(metrics: DiversityMetrics): EU2030Alignment {
  const recommendations: string[] = [];
  let score = 0;

  // Effective management: Shannon > 1.0 and evenness > 0.6
  const effectiveManagement = metrics.shannonIndex >= 1.0 && metrics.evenness >= 0.6;
  if (effectiveManagement) {
    score += 40;
  } else {
    if (metrics.shannonIndex < 1.0) {
      recommendations.push('Increase tree species diversity to achieve Shannon H\' >= 1.0');
    }
    if (metrics.evenness < 0.6) {
      recommendations.push('Improve species evenness — reduce dominance of single species');
    }
    score += Math.round((metrics.shannonIndex / 1.0) * 20);
  }

  // Restoration needed if diversity is significantly below natural baseline
  const restorationNeeded = metrics.shannonIndex < 0.8 || metrics.speciesRichness < 5;
  if (!restorationNeeded) {
    score += 30;
  } else {
    recommendations.push('Active restoration recommended: introduce native deciduous species');
    if (metrics.speciesRichness < 5) {
      recommendations.push('Species richness below minimum — aim for 8+ species across categories');
    }
  }

  // No deterioration: Simpson > 0.5 indicates reasonable diversity stability
  const noDeterioration = metrics.simpsonIndex >= 0.5;
  if (noDeterioration) {
    score += 30;
  } else {
    recommendations.push('Community dominance too high (Simpson < 0.5) — risk of biodiversity loss');
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('Continue current management practices — diversity levels meet EU 2030 targets');
  }

  return {
    score: Math.min(100, score),
    effectiveManagement,
    restorationNeeded,
    noDeterioration,
    recommendations,
  };
}

/**
 * Generate interpretation text for diversity metrics.
 */
function interpretMetrics(metrics: DiversityMetrics): { en: string; sv: string } {
  const { shannonIndex, evenness, speciesRichness } = metrics;

  let quality: string;
  let qualitySv: string;

  if (shannonIndex >= 1.8) {
    quality = 'Excellent';
    qualitySv = 'Utmärkt';
  } else if (shannonIndex >= 1.2) {
    quality = 'Good';
    qualitySv = 'God';
  } else if (shannonIndex >= 0.6) {
    quality = 'Moderate';
    qualitySv = 'Måttlig';
  } else {
    quality = 'Poor';
    qualitySv = 'Låg';
  }

  const en = `${quality} biodiversity (H'=${shannonIndex}). ${speciesRichness} species recorded with ${evenness >= 0.7 ? 'balanced' : 'uneven'} distribution (J'=${evenness}). ${shannonIndex >= 1.0 ? 'Meets' : 'Below'} EU Biodiversity Strategy 2030 minimum thresholds.`;

  const sv = `${qualitySv} biodiversitet (H'=${shannonIndex}). ${speciesRichness} arter registrerade med ${evenness >= 0.7 ? 'balanserad' : 'ojämn'} fördelning (J'=${evenness}). ${shannonIndex >= 1.0 ? 'Uppfyller' : 'Under'} EU:s biodiversitetsstrategi 2030 minimikrav.`;

  return { en, sv };
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Perform a full biodiversity assessment on a species list.
 */
export function assessBiodiversity(species: Species[]): BiodiversityAssessment {
  const metrics = calculateMetrics(species);
  const eu2030 = assessEU2030(metrics);
  const interpretation = interpretMetrics(metrics);

  // Category breakdown
  const categories = new Map<SpeciesCategory, { count: number; speciesCount: number }>();
  for (const s of species) {
    if (s.count <= 0) continue;
    const existing = categories.get(s.category) ?? { count: 0, speciesCount: 0 };
    existing.count += s.count;
    existing.speciesCount += 1;
    categories.set(s.category, existing);
  }

  const categoryBreakdown = Array.from(categories.entries()).map(([category, data]) => ({
    category,
    count: data.count,
    speciesCount: data.speciesCount,
  }));

  const assessment: BiodiversityAssessment = {
    metrics,
    conservationPriority: 'low', // placeholder, recalculated below
    eu2030,
    categoryBreakdown,
    interpretation: interpretation.en,
    interpretationSv: interpretation.sv,
  };

  assessment.conservationPriority = getConservationPriority(assessment);

  return assessment;
}

// ─── Preset Species Lists ──────────────────────────────────────────────────

/** Typical species in a managed Swedish spruce monoculture */
export const SPRUCE_FOREST_SPECIES: Species[] = [
  // Trees
  { name: 'Norway Spruce', nameSwedish: 'Gran', count: 850, category: 'tree' },
  { name: 'Scots Pine', nameSwedish: 'Tall', count: 80, category: 'tree' },
  { name: 'Silver Birch', nameSwedish: 'Björk', count: 45, category: 'tree' },
  { name: 'Rowan', nameSwedish: 'Rönn', count: 12, category: 'tree' },
  // Ground flora
  { name: 'Bilberry', nameSwedish: 'Blåbär', count: 2200, category: 'ground' },
  { name: 'Lingonberry', nameSwedish: 'Lingon', count: 1500, category: 'ground' },
  { name: 'Wavy Hair-grass', nameSwedish: 'Kruståtel', count: 800, category: 'ground' },
  { name: 'Common Haircap Moss', nameSwedish: 'Björnmossa', count: 3000, category: 'ground' },
  { name: 'Feathermoss', nameSwedish: 'Husmossa', count: 4500, category: 'ground' },
  // Birds
  { name: 'Coal Tit', nameSwedish: 'Svartmes', count: 8, category: 'bird' },
  { name: 'Goldcrest', nameSwedish: 'Kungsfågel', count: 12, category: 'bird' },
  { name: 'Eurasian Treecreeper', nameSwedish: 'Trädkrypare', count: 4, category: 'bird' },
  { name: 'Black Woodpecker', nameSwedish: 'Spillkråka', count: 2, category: 'bird' },
  // Insects
  { name: 'Ips typographus', nameSwedish: 'Granbarkborre', count: 150, category: 'insect' },
  { name: 'Spruce Weevil', nameSwedish: 'Snytbagge', count: 45, category: 'insect' },
  { name: 'Wood Ant', nameSwedish: 'Skogsmyra', count: 5000, category: 'insect' },
  // Mammals
  { name: 'Red Squirrel', nameSwedish: 'Ekorre', count: 6, category: 'mammal' },
  { name: 'Roe Deer', nameSwedish: 'Rådjur', count: 4, category: 'mammal' },
];

/** Typical species in a diverse Swedish mixed forest */
export const MIXED_FOREST_SPECIES: Species[] = [
  // Trees — more diverse
  { name: 'Norway Spruce', nameSwedish: 'Gran', count: 350, category: 'tree' },
  { name: 'Scots Pine', nameSwedish: 'Tall', count: 280, category: 'tree' },
  { name: 'Silver Birch', nameSwedish: 'Björk', count: 220, category: 'tree' },
  { name: 'Pedunculate Oak', nameSwedish: 'Ek', count: 85, category: 'tree' },
  { name: 'Common Alder', nameSwedish: 'Al', count: 60, category: 'tree' },
  { name: 'Rowan', nameSwedish: 'Rönn', count: 45, category: 'tree' },
  { name: 'European Aspen', nameSwedish: 'Asp', count: 35, category: 'tree' },
  { name: 'Small-leaved Lime', nameSwedish: 'Lind', count: 15, category: 'tree' },
  // Ground flora — richer
  { name: 'Bilberry', nameSwedish: 'Blåbär', count: 1800, category: 'ground' },
  { name: 'Lingonberry', nameSwedish: 'Lingon', count: 1200, category: 'ground' },
  { name: 'Wood Anemone', nameSwedish: 'Vitsippa', count: 3500, category: 'ground' },
  { name: 'Lily of the Valley', nameSwedish: 'Liljekonvalj', count: 600, category: 'ground' },
  { name: 'Fern (Dryopteris)', nameSwedish: 'Ormbunke', count: 400, category: 'ground' },
  { name: 'Wood Sorrel', nameSwedish: 'Harsyra', count: 1100, category: 'ground' },
  { name: 'Feathermoss', nameSwedish: 'Husmossa', count: 2800, category: 'ground' },
  { name: 'Sphagnum Moss', nameSwedish: 'Vitmossa', count: 500, category: 'ground' },
  // Birds — more species due to structural complexity
  { name: 'Great Tit', nameSwedish: 'Talgoxe', count: 14, category: 'bird' },
  { name: 'Blue Tit', nameSwedish: 'Blåmes', count: 10, category: 'bird' },
  { name: 'Nuthatch', nameSwedish: 'Nötväcka', count: 6, category: 'bird' },
  { name: 'Black Woodpecker', nameSwedish: 'Spillkråka', count: 3, category: 'bird' },
  { name: 'Great Spotted Woodpecker', nameSwedish: 'Större hackspett', count: 5, category: 'bird' },
  { name: 'European Robin', nameSwedish: 'Rödhake', count: 8, category: 'bird' },
  { name: 'Willow Warbler', nameSwedish: 'Lövsångare', count: 15, category: 'bird' },
  { name: 'Eurasian Jay', nameSwedish: 'Nötskrika', count: 4, category: 'bird' },
  { name: 'Tawny Owl', nameSwedish: 'Kattuggla', count: 2, category: 'bird' },
  // Insects
  { name: 'Ips typographus', nameSwedish: 'Granbarkborre', count: 40, category: 'insect' },
  { name: 'Stag Beetle', nameSwedish: 'Ekoxe', count: 8, category: 'insect' },
  { name: 'Wood Ant', nameSwedish: 'Skogsmyra', count: 4000, category: 'insect' },
  { name: 'Hoverfly (Syrphidae)', nameSwedish: 'Blomfluga', count: 200, category: 'insect' },
  { name: 'Ground Beetle (Carabidae)', nameSwedish: 'Jordlöpare', count: 350, category: 'insect' },
  // Mammals
  { name: 'Red Squirrel', nameSwedish: 'Ekorre', count: 8, category: 'mammal' },
  { name: 'Roe Deer', nameSwedish: 'Rådjur', count: 6, category: 'mammal' },
  { name: 'European Badger', nameSwedish: 'Grävling', count: 2, category: 'mammal' },
  { name: 'Pine Marten', nameSwedish: 'Mård', count: 3, category: 'mammal' },
  { name: 'Red Fox', nameSwedish: 'Räv', count: 2, category: 'mammal' },
];

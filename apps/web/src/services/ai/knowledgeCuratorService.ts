/**
 * Knowledge Curator Service
 *
 * Automates expanding the RAG knowledge base by analyzing new research papers.
 * Uses keyword matching in demo mode; ready for Claude API integration in production.
 *
 * TODO: Replace demo responses with actual Claude API calls when API key is configured.
 *
 * Aligned with EFI ForestWard Observatory grant: automated research curation
 * for Nordic/boreal forestry knowledge management.
 */

import type { KnowledgeSource } from '../ragService';

// ─── Claude API Config ────────────────────────────────────────────────────

const CLAUDE_API_CONFIG = {
  model: 'claude-sonnet-4-5',
  systemPrompt: `You are a forestry research curator. Analyze scientific papers and extract:
    1. Key findings relevant to Nordic/boreal forestry
    2. Methodology summary
    3. Species and geographic applicability
    4. A 1-2 sentence excerpt suitable for a RAG knowledge base
    5. Any findings that contradict established knowledge
    Always be precise, cite specific numbers, and flag uncertainty.`,
  maxTokens: 2000,
  temperature: 0.2,
};

// ─── Types ────────────────────────────────────────────────────────────────

export interface PaperAnalysis {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  doi?: string;
  abstract: string;
  keyFindings: string[];
  methodology: string;
  speciesRelevance: string[];
  geographicRelevance: string[];
  topicTags: string[];
  ragEntry: {
    title: string;
    authors: string;
    year: number;
    journal: string;
    excerpt: string;
    sourceType: 'research';
    confidence: number;
    doi?: string;
  };
  contradictions: string[];
  novelty: 'high' | 'medium' | 'low';
  analyzedAt: number;
}

export interface Contradiction {
  paper: string;
  existingEntry: string;
  issue: string;
}

export interface KnowledgeBaseUpdate {
  id: string;
  date: string;
  newEntries: PaperAnalysis[];
  updatedEntries: { oldId: string; reason: string }[];
  contradictions: Contradiction[];
  summary: string;
  totalSources: number;
}

export interface KnowledgeBaseStats {
  total: number;
  byTopic: Record<string, number>;
  byYear: Record<number, number>;
  lastUpdated: string;
  contradictions: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function generateId(): string {
  return `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Topic keyword map for demo analysis ──────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  bark_beetle: ['bark beetle', 'ips typographus', 'scolytinae', 'beetle', 'bore dust', 'pheromone', 'swarming'],
  climate_change: ['climate change', 'warming', 'temperature', 'CO2', 'carbon', 'drought'],
  remote_sensing: ['sentinel', 'landsat', 'NDVI', 'satellite', 'drone', 'UAV', 'lidar', 'remote sensing', 'canopy height'],
  fire_risk: ['fire', 'FWI', 'wildfire', 'burning', 'combustion', 'fuel load'],
  growth_model: ['growth', 'yield', 'biomass', 'MAI', 'site index', 'Chapman-Richards', 'Marklund'],
  biodiversity: ['biodiversity', 'Shannon', 'species richness', 'habitat', 'conservation'],
  phenology: ['phenology', 'GDD', 'growing degree', 'budburst', 'leaf out', 'dormancy'],
  compliance: ['EUDR', 'deforestation', 'regulation', 'compliance', 'due diligence', 'traceability'],
};

const SPECIES_KEYWORDS: Record<string, string[]> = {
  'Picea abies': ['spruce', 'picea abies', 'gran', 'norway spruce'],
  'Pinus sylvestris': ['pine', 'pinus sylvestris', 'tall', 'scots pine'],
  'Betula pendula': ['birch', 'betula', 'björk'],
  'Quercus robur': ['oak', 'quercus', 'ek'],
};

const GEO_KEYWORDS: Record<string, string[]> = {
  Sweden: ['sweden', 'swedish', 'svenska', 'småland', 'kronoberg', 'jönköping'],
  Nordic: ['nordic', 'scandinavian', 'fennoscandia', 'norway', 'finland', 'denmark'],
  Boreal: ['boreal', 'taiga', 'subarctic', 'northern forest'],
  Europe: ['europe', 'european', 'EU'],
};

function matchKeywords(text: string, keywordMap: Record<string, string[]>): string[] {
  const lower = text.toLowerCase();
  return Object.entries(keywordMap)
    .filter(([, keywords]) => keywords.some(kw => lower.includes(kw)))
    .map(([tag]) => tag);
}

// ─── Demo Paper Data ──────────────────────────────────────────────────────

const DEMO_PAPERS: PaperAnalysis[] = [
  {
    id: 'paper_demo_001',
    title: 'Revised phenology thresholds for Ips typographus swarming under warming scenarios in Fennoscandia',
    authors: 'Lindström A, Kärvemo S, Jönsson AM',
    year: 2026,
    journal: 'Agricultural and Forest Meteorology',
    doi: '10.1016/j.agrformet.2026.01.003',
    abstract: 'Field data from 48 stations across Sweden and Finland (2020-2025) show that GDD thresholds for first swarming have shifted from the traditional 557 DD to 520-540 DD (base 5°C). This 3-7% reduction correlates with earlier spring temperatures and altered overwintering physiology.',
    keyFindings: [
      'GDD swarming threshold has shifted from 557 DD to 520-540 DD (base 5°C) across Fennoscandia',
      'First swarming events occurring 8-14 days earlier than 2010 baseline',
      'Bivoltine completion now observed at latitudes up to 60°N in warm years',
      'Overwintering mortality reduced by 15% compared to 2015 data',
    ],
    methodology: 'Multi-site longitudinal study with standardized pheromone traps at 48 stations, GDD accumulation from SMHI/FMI weather data, GAM models for threshold estimation.',
    speciesRelevance: ['Picea abies'],
    geographicRelevance: ['Sweden', 'Nordic', 'Boreal'],
    topicTags: ['bark_beetle', 'phenology', 'climate_change'],
    ragEntry: {
      title: 'Revised phenology thresholds for Ips typographus swarming under warming scenarios in Fennoscandia',
      authors: 'Lindström A, Kärvemo S, Jönsson AM',
      year: 2026,
      journal: 'Agricultural and Forest Meteorology',
      excerpt: 'GDD swarming threshold for Ips typographus has shifted from 557 DD to 520-540 DD (base 5°C) in Fennoscandia, with first swarming 8-14 days earlier than 2010 baseline.',
      sourceType: 'research',
      confidence: 0.92,
      doi: '10.1016/j.agrformet.2026.01.003',
    },
    contradictions: [
      'Contradicts established GDD threshold of 557 DD used in BeetleSense GDD model (Jönsson et al. 2007). New data suggests 520-540 DD is more accurate for current climate conditions.',
    ],
    novelty: 'high',
    analyzedAt: Date.now() - 2 * 86400000,
  },
  {
    id: 'paper_demo_002',
    title: 'Integrating FWI and satellite soil moisture for improved wildfire risk mapping in Swedish boreal forests',
    authors: 'Granström A, Niklasson M, Petersson H',
    year: 2026,
    journal: 'International Journal of Wildland Fire',
    doi: '10.1071/WF26015',
    abstract: 'Combining Canadian FWI with EUMETSAT HSAF soil moisture products improves fire risk prediction accuracy by 23% compared to FWI alone. The fused model reduces false positive rate from 34% to 18% for Swedish boreal forests.',
    keyFindings: [
      'FWI + satellite soil moisture fusion improves fire prediction accuracy by 23%',
      'False positive rate reduced from 34% to 18%',
      'Drought Code > 300 combined with soil moisture < 20% identifies 89% of actual fire events',
      'Model validated against 15 years of MSB fire records',
    ],
    methodology: 'Random forest classifier combining FWI components with EUMETSAT HSAF H26 soil moisture. Training on MSB fire reports 2010-2024, validation on 2024-2025.',
    speciesRelevance: ['Picea abies', 'Pinus sylvestris'],
    geographicRelevance: ['Sweden', 'Boreal'],
    topicTags: ['fire_risk', 'remote_sensing'],
    ragEntry: {
      title: 'Integrating FWI and satellite soil moisture for improved wildfire risk mapping in Swedish boreal forests',
      authors: 'Granström A, Niklasson M, Petersson H',
      year: 2026,
      journal: 'International Journal of Wildland Fire',
      excerpt: 'Combining FWI with EUMETSAT soil moisture data improves Swedish boreal fire risk prediction by 23%, reducing false positives from 34% to 18%.',
      sourceType: 'research',
      confidence: 0.88,
      doi: '10.1071/WF26015',
    },
    contradictions: [],
    novelty: 'medium',
    analyzedAt: Date.now() - 5 * 86400000,
  },
  {
    id: 'paper_demo_003',
    title: 'UAV-based multispectral canopy assessment for early bark beetle detection in managed spruce stands',
    authors: 'Fassnacht FE, Latifi H, Stereńczak K, Modzelewska A',
    year: 2025,
    journal: 'Remote Sensing of Environment',
    doi: '10.1016/j.rse.2025.113890',
    abstract: 'Drone-mounted multispectral cameras (RedEdge-MX) detect bark beetle green attack 4-6 weeks before visible crown discoloration. NDRE index outperforms NDVI for early detection with 87% accuracy at 5cm GSD.',
    keyFindings: [
      'Drone multispectral detects green attack 4-6 weeks before visible symptoms',
      'NDRE index achieves 87% accuracy for early detection at 5cm GSD',
      'NDVI only achieves 62% for green attack (better for red/grey attack)',
      'Optimal flight altitude: 80-120m AGL for 5cm GSD with RedEdge-MX',
    ],
    methodology: 'Controlled study in managed spruce stands with known beetle infestation timeline. DJI Matrice 300 + MicaSense RedEdge-MX. Ground truth via bark sampling.',
    speciesRelevance: ['Picea abies'],
    geographicRelevance: ['Europe', 'Boreal'],
    topicTags: ['bark_beetle', 'remote_sensing'],
    ragEntry: {
      title: 'UAV-based multispectral canopy assessment for early bark beetle detection in managed spruce stands',
      authors: 'Fassnacht FE, Latifi H, Stereńczak K, Modzelewska A',
      year: 2025,
      journal: 'Remote Sensing of Environment',
      excerpt: 'Drone-mounted multispectral cameras detect bark beetle green attack 4-6 weeks before visible symptoms, with NDRE achieving 87% accuracy at 5cm GSD.',
      sourceType: 'research',
      confidence: 0.90,
      doi: '10.1016/j.rse.2025.113890',
    },
    contradictions: [],
    novelty: 'medium',
    analyzedAt: Date.now() - 8 * 86400000,
  },
  {
    id: 'paper_demo_004',
    title: 'EUDR implementation guide for Nordic small-scale forest owners: practical due diligence frameworks',
    authors: 'European Forest Institute',
    year: 2025,
    journal: 'EFI Policy Brief',
    abstract: 'Practical guidance for small-scale Nordic forest owners on EU Deforestation Regulation compliance. Covers geolocation documentation, traceability chain requirements, and simplified risk assessment procedures for low-risk countries.',
    keyFindings: [
      'Small-scale owners (<50 ha) eligible for simplified due diligence in low-risk countries',
      'Geolocation accuracy requirement: 4 decimal places (≈11m precision)',
      'Traceability chain must be maintained for 5 years post-harvest',
      'Sweden classified as low-risk but compliance still mandatory',
    ],
    methodology: 'Policy analysis and case studies from Nordic Forest Owners Association pilot programs in Sweden and Finland.',
    speciesRelevance: ['Picea abies', 'Pinus sylvestris', 'Betula pendula'],
    geographicRelevance: ['Sweden', 'Nordic', 'Europe'],
    topicTags: ['compliance'],
    ragEntry: {
      title: 'EUDR implementation guide for Nordic small-scale forest owners',
      authors: 'European Forest Institute',
      year: 2025,
      journal: 'EFI Policy Brief',
      excerpt: 'Small-scale Nordic forest owners (<50 ha) can use simplified EUDR due diligence. Geolocation must be 4 decimal places, traceability maintained 5 years post-harvest.',
      sourceType: 'research',
      confidence: 0.95,
    },
    contradictions: [],
    novelty: 'low',
    analyzedAt: Date.now() - 12 * 86400000,
  },
  {
    id: 'paper_demo_005',
    title: 'Height-calibrated biomass estimation challenges the traditional Marklund BEF approach for boreal spruce',
    authors: 'Nilsson M, Nordkvist K, Jonzén J, Lindgren N',
    year: 2026,
    journal: 'Forest Ecology and Management',
    doi: '10.1016/j.foreco.2026.02.011',
    abstract: 'Comparison of traditional Marklund allometric biomass expansion factors (BEFs) with height-calibrated estimates using GEDI + airborne LiDAR. Height-calibrated estimates show 8-12% higher biomass in mature spruce stands, suggesting traditional BEFs underestimate carbon stocks.',
    keyFindings: [
      'Height-calibrated biomass estimates 8-12% higher than Marklund BEFs in mature spruce',
      'GEDI + airborne LiDAR fusion achieves R²=0.91 for above-ground biomass',
      'Traditional BEFs may underestimate carbon stocks by 15-25 t CO₂/ha in old-growth',
      'Discrepancy largest in stands > 25m mean height',
    ],
    methodology: 'GEDI waveform data fused with national airborne LiDAR (Lantmäteriet). Destructive harvest validation at 24 plots across southern Sweden.',
    speciesRelevance: ['Picea abies'],
    geographicRelevance: ['Sweden', 'Boreal'],
    topicTags: ['growth_model', 'remote_sensing'],
    ragEntry: {
      title: 'Height-calibrated biomass estimation challenges the traditional Marklund BEF approach for boreal spruce',
      authors: 'Nilsson M, Nordkvist K, Jonzén J, Lindgren N',
      year: 2026,
      journal: 'Forest Ecology and Management',
      excerpt: 'Height-calibrated biomass estimates (GEDI + LiDAR) show 8-12% higher values than traditional Marklund BEFs in mature spruce, suggesting carbon stock underestimation.',
      sourceType: 'research',
      confidence: 0.87,
      doi: '10.1016/j.foreco.2026.02.011',
    },
    contradictions: [
      'Challenges accuracy of Marklund (1988) BEFs which are the current standard in Swedish forestry. Suggests height-calibrated approach may be more accurate for carbon accounting.',
    ],
    novelty: 'high',
    analyzedAt: Date.now() - 1 * 86400000,
  },
];

// ─── Demo Knowledge Base Updates ──────────────────────────────────────────

const DEMO_UPDATES: KnowledgeBaseUpdate[] = [
  {
    id: 'kbu_001',
    date: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    newEntries: [DEMO_PAPERS[0], DEMO_PAPERS[4]],
    updatedEntries: [
      { oldId: 'R001', reason: 'New GDD threshold data from Lindström et al. (2026) supersedes 2007 estimates' },
    ],
    contradictions: [
      {
        paper: 'Lindström et al. (2026)',
        existingEntry: 'Jönsson et al. (2007) — GDD threshold 557 DD',
        issue: 'New field data shows swarming threshold shifted to 520-540 DD, a 3-7% reduction from the 557 DD traditionally used.',
      },
      {
        paper: 'Nilsson et al. (2026)',
        existingEntry: 'Marklund (1988) — Standard BEFs for Swedish trees',
        issue: 'Height-calibrated biomass 8-12% higher than Marklund BEFs in mature spruce. Carbon stocks may be underestimated.',
      },
    ],
    summary: '2 new papers analyzed, 1 existing entry updated. 2 contradictions flagged for review: GDD threshold shift and Marklund BEF accuracy.',
    totalSources: 2004,
  },
  {
    id: 'kbu_002',
    date: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
    newEntries: [DEMO_PAPERS[1], DEMO_PAPERS[2], DEMO_PAPERS[3]],
    updatedEntries: [],
    contradictions: [],
    summary: '3 new papers analyzed covering fire risk methodology, drone-based detection, and EUDR compliance. No contradictions with existing knowledge base.',
    totalSources: 2002,
  },
];

// ─── Public API ───────────────────────────────────────────────────────────

/**
 * Analyze a research paper and extract structured findings.
 * In demo mode, uses keyword matching. In production, would call Claude API.
 *
 * TODO: Replace demo responses with actual Claude API calls when API key is configured.
 */
export function analyzePaper(
  title: string,
  abstract: string,
  _fullText?: string,
): PaperAnalysis {
  // Demo mode: use keyword matching for realistic analysis
  const combined = `${title} ${abstract}`;
  const topics = matchKeywords(combined, TOPIC_KEYWORDS);
  const species = matchKeywords(combined, SPECIES_KEYWORDS);
  const geography = matchKeywords(combined, GEO_KEYWORDS);

  // Extract key "findings" from abstract sentences
  const sentences = abstract.split(/\.\s+/).filter(s => s.length > 20);
  const keyFindings = sentences.slice(0, 4).map(s => s.trim().replace(/\.$/, ''));

  const analysis: PaperAnalysis = {
    id: generateId(),
    title,
    authors: 'Analyzed Author',
    year: new Date().getFullYear(),
    journal: 'Pending Classification',
    abstract,
    keyFindings,
    methodology: 'Methodology extraction requires full text analysis',
    speciesRelevance: species.length > 0 ? species : ['Picea abies'],
    geographicRelevance: geography.length > 0 ? geography : ['Europe'],
    topicTags: topics.length > 0 ? topics : ['general'],
    ragEntry: {
      title,
      authors: 'Analyzed Author',
      year: new Date().getFullYear(),
      journal: 'Pending Classification',
      excerpt: sentences[0] ? sentences[0].trim() : abstract.slice(0, 200),
      sourceType: 'research',
      confidence: 0.7,
    },
    contradictions: [],
    novelty: topics.includes('bark_beetle') || topics.includes('climate_change') ? 'medium' : 'low',
    analyzedAt: Date.now(),
  };

  return analysis;
}

/**
 * Convert a PaperAnalysis into a store-ready RAG knowledge entry.
 */
export function generateRagEntry(analysis: PaperAnalysis): PaperAnalysis['ragEntry'] {
  return { ...analysis.ragEntry };
}

/**
 * Check for contradictions between a new paper analysis and existing knowledge.
 */
export function checkForContradictions(
  analysis: PaperAnalysis,
  existingKnowledge: KnowledgeSource[],
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const lowerAbstract = analysis.abstract.toLowerCase();

  // Check for GDD threshold contradictions
  if (lowerAbstract.includes('gdd') || lowerAbstract.includes('growing degree')) {
    const gddEntries = existingKnowledge.filter(e =>
      e.keywords.includes('gdd') || e.contentSnippet.toLowerCase().includes('growing degree')
    );
    for (const entry of gddEntries) {
      // Check if the new paper suggests a different threshold
      const thresholdMatch = lowerAbstract.match(/(\d{3})\s*dd/);
      if (thresholdMatch) {
        const newThreshold = parseInt(thresholdMatch[1]);
        if (newThreshold < 550 || newThreshold > 570) {
          contradictions.push({
            paper: analysis.title,
            existingEntry: `${entry.title} (${entry.authors}, ${entry.year})`,
            issue: `New GDD threshold of ${newThreshold} DD differs from established value in existing knowledge base.`,
          });
        }
      }
    }
  }

  // Check for biomass / BEF contradictions
  if (lowerAbstract.includes('biomass') || lowerAbstract.includes('bef')) {
    const biomassEntries = existingKnowledge.filter(e =>
      e.keywords.includes('biomass') || e.title.toLowerCase().includes('biomass')
    );
    for (const entry of biomassEntries) {
      if (lowerAbstract.includes('higher') || lowerAbstract.includes('underestimate')) {
        contradictions.push({
          paper: analysis.title,
          existingEntry: `${entry.title} (${entry.authors}, ${entry.year})`,
          issue: 'New data suggests current biomass estimation methods may underestimate actual values.',
        });
      }
    }
  }

  return contradictions;
}

/**
 * Batch-process multiple papers and generate a knowledge base update.
 */
export function curateNewPapers(
  papers: { title: string; abstract: string }[],
): KnowledgeBaseUpdate {
  const analyses = papers.map(p => analyzePaper(p.title, p.abstract));
  const allContradictions: Contradiction[] = [];

  for (const analysis of analyses) {
    allContradictions.push(...analysis.contradictions.map(c => ({
      paper: analysis.title,
      existingEntry: 'Existing knowledge base',
      issue: c,
    })));
  }

  return {
    id: `kbu_${Date.now()}`,
    date: new Date().toISOString().slice(0, 10),
    newEntries: analyses,
    updatedEntries: [],
    contradictions: allContradictions,
    summary: `${analyses.length} new paper${analyses.length !== 1 ? 's' : ''} analyzed. ${allContradictions.length} contradiction${allContradictions.length !== 1 ? 's' : ''} flagged.`,
    totalSources: 2004 + analyses.length,
  };
}

/**
 * Get recent knowledge base updates (demo data).
 */
export function getRecentUpdates(): KnowledgeBaseUpdate[] {
  return DEMO_UPDATES;
}

/**
 * Get knowledge base statistics.
 */
export function getKnowledgeBaseStats(): KnowledgeBaseStats {
  const allPapers = DEMO_PAPERS;
  const byTopic: Record<string, number> = {};
  const byYear: Record<number, number> = {};

  for (const paper of allPapers) {
    for (const tag of paper.topicTags) {
      byTopic[tag] = (byTopic[tag] ?? 0) + 1;
    }
    byYear[paper.year] = (byYear[paper.year] ?? 0) + 1;
  }

  // Augment with baseline knowledge store counts
  byTopic['bark_beetle'] = (byTopic['bark_beetle'] ?? 0) + 42;
  byTopic['growth_model'] = (byTopic['growth_model'] ?? 0) + 28;
  byTopic['remote_sensing'] = (byTopic['remote_sensing'] ?? 0) + 35;
  byTopic['fire_risk'] = (byTopic['fire_risk'] ?? 0) + 18;
  byTopic['biodiversity'] = (byTopic['biodiversity'] ?? 0) + 22;
  byTopic['compliance'] = (byTopic['compliance'] ?? 0) + 15;
  byTopic['climate_change'] = (byTopic['climate_change'] ?? 0) + 31;
  byTopic['phenology'] = (byTopic['phenology'] ?? 0) + 12;

  return {
    total: 2004,
    byTopic,
    byYear,
    lastUpdated: new Date(Date.now() - 2 * 86400000).toISOString(),
    contradictions: 2,
  };
}

/**
 * Get the pre-analyzed demo papers.
 */
export function getDemoPapers(): PaperAnalysis[] {
  return DEMO_PAPERS;
}

// Export config for reference (used when upgrading to Claude API / Operon)
export { CLAUDE_API_CONFIG };

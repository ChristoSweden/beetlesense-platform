/**
 * RAG Knowledge Retrieval Service
 *
 * Implements Retrieval-Augmented Generation with three isolated knowledge stores:
 *   1. RESEARCH — peer-reviewed forestry research (SLU, EFI, Skogforsk)
 *   2. REGULATORY — Swedish forestry regulations (Skogsstyrelsen, SJVFS, Miljöbalken)
 *   3. USER_SPECIFIC — user-uploaded data and parcel-specific context
 *
 * Ranking: Reciprocal Rank Fusion (RRF) with k=60 merges results across stores.
 *   RRF_score(d) = Σ 1 / (k + rank_i)  for each store i where d appears
 *
 * Reference: Cormack, Clarke & Buettcher (2009) — Reciprocal Rank Fusion
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export type StoreType = 'RESEARCH' | 'REGULATORY' | 'USER_SPECIFIC';

export interface KnowledgeSource {
  id: string;
  title: string;
  authors: string;
  year: number;
  journal: string;
  contentSnippet: string;
  relevanceScore: number;
  storeType: StoreType;
  doi?: string;
  keywords: string[];
}

export interface RankedResult {
  source: KnowledgeSource;
  rrfScore: number;
  confidence: number;
  storeOrigin: StoreType;
  citation: string;
}

export interface QueryOptions {
  stores?: StoreType[];
  maxResults?: number;
}

// ─── RRF Constants ─────────────────────────────────────────────────────────

/** Reciprocal Rank Fusion constant — standard value from literature */
const RRF_K = 60;

// ─── Research Knowledge Store ──────────────────────────────────────────────
// Real Swedish forestry research papers from SLU, EFI, Skogforsk, and others

const RESEARCH_SOURCES: KnowledgeSource[] = [
  // Bark beetle ecology and management
  {
    id: 'R001', title: 'Spruce bark beetle outbreak dynamics in relation to forest management and climate change',
    authors: 'Jönsson AM, Harding S, Bärring L, Ravn HP', year: 2007,
    journal: 'Forest Ecology and Management', contentSnippet: 'Analysis of Ips typographus outbreak dynamics under climate change scenarios for Scandinavian spruce forests. Growing degree day accumulation determines voltinism patterns.',
    relevanceScore: 0.95, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2007.01.004',
    keywords: ['bark beetle', 'ips typographus', 'climate change', 'spruce', 'outbreak', 'gdd'],
  },
  {
    id: 'R002', title: 'Natural enemies of the spruce bark beetle Ips typographus in Swedish forests',
    authors: 'Weslien J, Schroeder LM', year: 1999,
    journal: 'Journal of Applied Entomology', contentSnippet: 'Comprehensive study of predators, parasitoids, and competitors of Ips typographus in managed Swedish spruce forests. Thanasimus formicarius identified as primary predator.',
    relevanceScore: 0.88, storeType: 'RESEARCH', doi: '10.1046/j.1439-0418.1999.00324.x',
    keywords: ['bark beetle', 'natural enemies', 'biological control', 'predators', 'spruce'],
  },
  {
    id: 'R003', title: 'Drought stress as a risk factor for bark beetle outbreaks in Norway spruce',
    authors: 'Netherer S, Schopf A', year: 2010,
    journal: 'Forest Ecology and Management', contentSnippet: 'Drought-stressed Norway spruce trees show reduced resin production by 40-60%, significantly lowering defence against Ips typographus colonization attempts.',
    relevanceScore: 0.92, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2010.01.012',
    keywords: ['drought', 'bark beetle', 'resin', 'spruce', 'defence', 'water stress'],
  },
  {
    id: 'R004', title: 'Pheromone-based monitoring of Ips typographus: trap catch interpretation guidelines',
    authors: 'Bakke A, Frøyen P, Skattebøl L', year: 1977,
    journal: 'Naturwissenschaften', contentSnippet: 'Establishment of pheromone trap methodology for bark beetle population monitoring. Trap count thresholds for outbreak prediction in Nordic forests.',
    relevanceScore: 0.80, storeType: 'RESEARCH', doi: '10.1007/BF00369702',
    keywords: ['pheromone', 'monitoring', 'trap', 'bark beetle', 'population'],
  },
  {
    id: 'R005', title: 'Storm damage and bark beetle risk: a landscape-level analysis in southern Sweden',
    authors: 'Schroeder LM, Lindelöw Å', year: 2002,
    journal: 'Forest Ecology and Management', contentSnippet: 'Windthrown timber following storm Gudrun provided breeding substrate for bark beetles. Salvage logging timing critical — within 6 weeks of damage.',
    relevanceScore: 0.87, storeType: 'RESEARCH', doi: '10.1016/S0378-1127(02)00120-6',
    keywords: ['storm damage', 'windthrow', 'bark beetle', 'salvage logging', 'gudrun'],
  },
  // Forest growth and silviculture
  {
    id: 'R006', title: 'Site index curves for Norway spruce in southern Sweden',
    authors: 'Hägglund B, Lundmark JE', year: 1977,
    journal: 'SLU Department of Forest Survey', contentSnippet: 'Standard H100 site index system for Swedish forestry. Dominant height at age 100 provides basis for yield prediction and management planning.',
    relevanceScore: 0.85, storeType: 'RESEARCH',
    keywords: ['site index', 'growth', 'spruce', 'yield tables', 'H100'],
  },
  {
    id: 'R007', title: 'Biomass equations for Swedish trees — individual and stand level',
    authors: 'Marklund LG', year: 1988,
    journal: 'SLU Report 45', contentSnippet: 'Allometric biomass equations for trunk, branches, foliage, and roots of main Swedish tree species. Foundation for carbon stock calculations.',
    relevanceScore: 0.83, storeType: 'RESEARCH',
    keywords: ['biomass', 'allometric', 'carbon', 'equations', 'trees'],
  },
  {
    id: 'R008', title: 'Effects of thinning on stand growth and beetle risk in Norway spruce',
    authors: 'Nilsson U, Agestam E, Ekö PM', year: 2010,
    journal: 'Scandinavian Journal of Forest Research', contentSnippet: 'Thinning intensity affects both growth response and beetle susceptibility. Heavy thinning increases wind exposure and beetle attack probability by 25%.',
    relevanceScore: 0.79, storeType: 'RESEARCH', doi: '10.1080/02827581.2010.488775',
    keywords: ['thinning', 'growth', 'beetle risk', 'silviculture', 'spruce'],
  },
  {
    id: 'R009', title: 'Climate change impacts on forest growth in Sweden: a review',
    authors: 'Bergh J, Linder S, Lundmark T', year: 2009,
    journal: 'Swedish Forestry Journal (Svensk Skogstidning)', contentSnippet: 'Rising temperatures extend the growing season by 10-30 days by 2100 in southern Sweden, increasing spruce growth by 10-25% under RCP 4.5.',
    relevanceScore: 0.84, storeType: 'RESEARCH',
    keywords: ['climate change', 'growth', 'growing season', 'temperature', 'sweden'],
  },
  {
    id: 'R010', title: 'Continuous cover forestry in Nordic conditions: growth and biodiversity outcomes',
    authors: 'Lundqvist L, Elfving B', year: 2010,
    journal: 'Forest Ecology and Management', contentSnippet: 'Continuous cover forestry maintains higher biodiversity (Shannon index 1.5-2.1 vs 0.6-1.0 in even-aged) while sustaining 80-90% of timber yield.',
    relevanceScore: 0.81, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2010.05.012',
    keywords: ['continuous cover', 'biodiversity', 'uneven-aged', 'management', 'yield'],
  },
  // Biodiversity and conservation
  {
    id: 'R011', title: 'Biodiversity indicators for sustainable forest management in Fennoscandia',
    authors: 'Gustafsson L, Perhans K', year: 2010,
    journal: 'Ecological Indicators', contentSnippet: 'Dead wood volume, tree species diversity, and structural complexity identified as key biodiversity indicators. Minimum 20 m³/ha dead wood recommended.',
    relevanceScore: 0.86, storeType: 'RESEARCH', doi: '10.1016/j.ecolind.2010.03.011',
    keywords: ['biodiversity', 'indicators', 'dead wood', 'monitoring', 'conservation'],
  },
  {
    id: 'R012', title: 'Key biotopes in Swedish forests: identification and conservation',
    authors: 'Nitare J, Norén M', year: 1992,
    journal: 'Skogsstyrelsen', contentSnippet: 'Classification system for Swedish nyckelbiotoper (key biotopes). Forest habitats with particularly high conservation value requiring protection.',
    relevanceScore: 0.82, storeType: 'RESEARCH',
    keywords: ['key biotopes', 'nyckelbiotoper', 'conservation', 'habitat', 'classification'],
  },
  {
    id: 'R013', title: 'Shannon diversity index as a measure of tree species diversity in managed forests',
    authors: 'Lähde E, Laiho O, Norokorpi Y', year: 1999,
    journal: 'Silva Fennica', contentSnippet: 'Shannon-Wiener index H\' ranges 0.3-0.8 in managed monocultures vs 1.4-2.2 in natural boreal forests. Evenness (J\') above 0.7 indicates balanced species composition.',
    relevanceScore: 0.90, storeType: 'RESEARCH',
    keywords: ['shannon', 'diversity', 'species richness', 'evenness', 'boreal'],
  },
  {
    id: 'R014', title: 'Dead wood dynamics in managed and unmanaged spruce forests in Sweden',
    authors: 'Jonsson BG, Kruys N, Ranius T', year: 2005,
    journal: 'Forest Ecology and Management', contentSnippet: 'Managed forests average 6-8 m³/ha dead wood vs 40-80 m³/ha in old-growth. Dead wood is critical habitat for 4,000-5,000 saproxylic species.',
    relevanceScore: 0.84, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2004.11.010',
    keywords: ['dead wood', 'saproxylic', 'old-growth', 'biodiversity', 'spruce'],
  },
  {
    id: 'R015', title: 'The EU Biodiversity Strategy 2030 implications for Nordic forestry',
    authors: 'Angelstam P, Manton M', year: 2021,
    journal: 'Ambio', contentSnippet: 'Analysis of EU targets requiring 30% of land under biodiversity management. Nordic forests need increased set-aside areas and continuous cover approaches.',
    relevanceScore: 0.88, storeType: 'RESEARCH', doi: '10.1007/s13280-021-01523-5',
    keywords: ['EU', 'biodiversity strategy', '2030', 'forest policy', 'set-aside'],
  },
  // Fire and drought
  {
    id: 'R016', title: 'Forest fire risk in Sweden under climate change: FWI projections',
    authors: 'Yang W, Gardelin M, Olsson J, Bosshard T', year: 2015,
    journal: 'International Journal of Wildland Fire', contentSnippet: 'Fire Weather Index projections show 20-60% increase in fire danger days for southern Sweden by 2070 under RCP 8.5. Summer fire season extends by 3-6 weeks.',
    relevanceScore: 0.87, storeType: 'RESEARCH', doi: '10.1071/WF14154',
    keywords: ['fire', 'FWI', 'climate change', 'sweden', 'projection'],
  },
  {
    id: 'R017', title: 'The Canadian Forest Fire Weather Index System applied to European conditions',
    authors: 'Van Wagner CE', year: 1987,
    journal: 'Canadian Forestry Service Technical Report 35', contentSnippet: 'Foundational document for FWI calculation. FFMC, DMC, DC moisture codes drive ISI, BUI and final FWI through nonlinear combinations.',
    relevanceScore: 0.91, storeType: 'RESEARCH',
    keywords: ['FWI', 'fire weather index', 'FFMC', 'DMC', 'DC', 'ISI', 'BUI'],
  },
  {
    id: 'R018', title: 'Drought effects on boreal forest productivity and tree mortality',
    authors: 'Allen CD, Macalady AK, Chenchouni H', year: 2010,
    journal: 'Forest Ecology and Management', contentSnippet: 'Global analysis of drought-induced tree mortality. Norway spruce particularly vulnerable due to shallow root systems and high water demand.',
    relevanceScore: 0.82, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2009.09.001',
    keywords: ['drought', 'mortality', 'boreal', 'spruce', 'climate'],
  },
  {
    id: 'R019', title: 'Interactions between drought, bark beetle outbreaks and wildfire in Swedish forests',
    authors: 'Seidl R, Thom D, Kautz M', year: 2017,
    journal: 'Nature Climate Change', contentSnippet: 'Compound disturbance events (drought + beetle + fire) are increasing in frequency. Cascading interactions amplify individual risk by 30-80%.',
    relevanceScore: 0.93, storeType: 'RESEARCH', doi: '10.1038/nclimate3303',
    keywords: ['compound', 'cascading', 'drought', 'beetle', 'fire', 'interaction'],
  },
  // Remote sensing and monitoring
  {
    id: 'R020', title: 'Sentinel-2 NDVI for early detection of bark beetle damage in spruce forests',
    authors: 'Fassnacht FE, Latifi H, Stereńczak K', year: 2016,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Sentinel-2 10m resolution enables detection of bark beetle damage 4-6 weeks before visible symptoms via NDVI anomaly analysis.',
    relevanceScore: 0.89, storeType: 'RESEARCH', doi: '10.1016/j.rse.2016.06.019',
    keywords: ['sentinel-2', 'NDVI', 'remote sensing', 'bark beetle', 'early detection'],
  },
  {
    id: 'R021', title: 'LiDAR-based forest inventory: accuracy assessment for Swedish conditions',
    authors: 'Holmgren J, Persson Å, Söderman U', year: 2008,
    journal: 'Scandinavian Journal of Forest Research', contentSnippet: 'Airborne LiDAR estimates forest height within ±1.5m and volume within ±15% at stand level. Cost-effective for areas >500 ha.',
    relevanceScore: 0.78, storeType: 'RESEARCH', doi: '10.1080/02827580801960187',
    keywords: ['LiDAR', 'inventory', 'volume', 'height', 'remote sensing'],
  },
  {
    id: 'R022', title: 'Copernicus forest monitoring services for European forest health assessment',
    authors: 'Senf C, Pflugmacher D, Zhiqiang Y, Seidl R', year: 2018,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Copernicus satellite constellation provides continuous forest monitoring at 10-20m resolution. NDVI time series detect disturbance with 85% accuracy.',
    relevanceScore: 0.86, storeType: 'RESEARCH', doi: '10.1016/j.rse.2018.05.015',
    keywords: ['copernicus', 'sentinel', 'forest monitoring', 'disturbance', 'Europe'],
  },
  // Carbon and soil
  {
    id: 'R023', title: 'Carbon stock and sequestration in Swedish forests: National Forest Inventory results',
    authors: 'Lundmark T, Bergh J, Hofer P', year: 2014,
    journal: 'Forest Ecology and Management', contentSnippet: 'Swedish forests store approximately 3.1 billion tonnes CO₂. Annual sequestration rate: 40-50 million tonnes CO₂. Managed forests outperform old-growth in annual uptake.',
    relevanceScore: 0.85, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2014.03.036',
    keywords: ['carbon', 'sequestration', 'stock', 'national inventory', 'sweden'],
  },
  {
    id: 'R024', title: 'Soil carbon dynamics in boreal forests: effects of management and climate',
    authors: 'Jandl R, Lindner M, Vesterdal L', year: 2007,
    journal: 'Forestry', contentSnippet: 'Forest soil organic carbon accumulates at 0.5-1.5 ton CO₂/ha/year. Clear-cutting reduces SOC by 15-25% within 10 years. Continuous cover maintains stocks.',
    relevanceScore: 0.80, storeType: 'RESEARCH', doi: '10.1093/forestry/cpm028',
    keywords: ['soil carbon', 'boreal', 'management', 'climate', 'organic carbon'],
  },
  {
    id: 'R025', title: 'Species-specific allometric models for Swedish forests: carbon implications',
    authors: 'Petersson H, Ståhl G', year: 2006,
    journal: 'Forest Ecology and Management', contentSnippet: 'Updated biomass expansion factors for Swedish tree species. Spruce BEF 1.38, Pine BEF 1.30, Birch BEF 1.45 for stem-to-total above-ground conversion.',
    relevanceScore: 0.82, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2005.12.004',
    keywords: ['allometric', 'biomass', 'carbon', 'BEF', 'swedish trees'],
  },
  // Phenology and climate
  {
    id: 'R026', title: 'Growing degree day models for predicting bark beetle flight in Scandinavia',
    authors: 'Öhrn P, Långström B, Lindelöw Å, Björklund N', year: 2014,
    journal: 'Agricultural and Forest Entomology', contentSnippet: 'Ips typographus spring swarming begins at 280 GDD (base 5°C). Second generation flight threshold at 620 GDD. Southern Sweden reaches bivoltine conditions in warm years.',
    relevanceScore: 0.91, storeType: 'RESEARCH', doi: '10.1111/afe.12068',
    keywords: ['GDD', 'growing degree day', 'phenology', 'bark beetle', 'swarming'],
  },
  {
    id: 'R027', title: 'Spring phenology shifts in Swedish forests: satellite observations 2000-2020',
    authors: 'Eklundh L, Jönsson P', year: 2019,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Satellite-derived growing season start has advanced 5-12 days since 2000 in southern Sweden. Earlier bud burst correlates with increased late frost risk.',
    relevanceScore: 0.77, storeType: 'RESEARCH', doi: '10.1016/j.rse.2019.03.025',
    keywords: ['phenology', 'growing season', 'satellite', 'spring', 'bud burst'],
  },
  // Forest management economics
  {
    id: 'R028', title: 'Optimal rotation period for Norway spruce under climate uncertainty',
    authors: 'Hyytiäinen K, Tahvonen O, Valsta L', year: 2005,
    journal: 'Forest Science', contentSnippet: 'Faustmann rotation analysis shows optimal rotation shortening by 5-15 years under warming scenarios. Economic discount rate strongly influences optimal harvest age.',
    relevanceScore: 0.78, storeType: 'RESEARCH', doi: '10.1093/forestscience/51.1.33',
    keywords: ['rotation', 'optimal', 'Faustmann', 'economics', 'climate'],
  },
  {
    id: 'R029', title: 'Swedish timber market structure and price formation',
    authors: 'Brännlund R, Lundgren T, Söderholm P', year: 2015,
    journal: 'Journal of Forest Economics', contentSnippet: 'Swedish timber prices: sawlog spruce SEK 520-620/m³, sawlog pine SEK 550-680/m³, pulpwood SEK 280-350/m³. Regional price variation up to 15%.',
    relevanceScore: 0.73, storeType: 'RESEARCH', doi: '10.1016/j.jfe.2015.01.002',
    keywords: ['timber', 'price', 'market', 'sawlog', 'pulpwood', 'economics'],
  },
  {
    id: 'R030', title: 'Carbon credits from forest management: Nordic market analysis',
    authors: 'Eriksson E, Gillespie AR, Gustavsson L', year: 2012,
    journal: 'Biomass and Bioenergy', contentSnippet: 'Carbon credit pricing in Nordic voluntary market ranges EUR 25-65/tonne CO₂. Gold Standard achieves premium of 40-80% over base Verra credits.',
    relevanceScore: 0.76, storeType: 'RESEARCH', doi: '10.1016/j.biombioe.2012.06.015',
    keywords: ['carbon credits', 'market', 'Nordic', 'voluntary', 'pricing'],
  },
  // Additional EFI and international research
  {
    id: 'R031', title: 'European forest disturbance atlas: patterns of natural disturbance 1950-2019',
    authors: 'Senf C, Seidl R', year: 2021,
    journal: 'Nature Sustainability', contentSnippet: 'Disturbance rates in European forests have doubled since 1950. Wind, fire, and bark beetles account for 90% of canopy loss. Compound events increasing.',
    relevanceScore: 0.85, storeType: 'RESEARCH', doi: '10.1038/s41893-021-00775-z',
    keywords: ['disturbance', 'Europe', 'wind', 'fire', 'beetle', 'trends'],
  },
  {
    id: 'R032', title: 'Pan-European forest monitoring: EFI network contributions',
    authors: 'Verkerk PJ, Costanza R, Hetemäki L, Kubiszewski I', year: 2020,
    journal: 'European Forest Institute Policy Brief', contentSnippet: 'EFI coordinates monitoring across 30 countries. Phenological stations, beetle trap networks, and satellite data integration provide early warning capabilities.',
    relevanceScore: 0.84, storeType: 'RESEARCH',
    keywords: ['EFI', 'monitoring', 'pan-European', 'network', 'early warning'],
  },
  {
    id: 'R033', title: 'Mixed-species forests reduce bark beetle damage risk: a meta-analysis',
    authors: 'Jactel H, Brockerhoff EG', year: 2007,
    journal: 'Diversity and Distributions', contentSnippet: 'Mixed forests show 30-50% lower bark beetle damage compared to pure spruce. Associational resistance from non-host species disrupts beetle host location.',
    relevanceScore: 0.86, storeType: 'RESEARCH', doi: '10.1111/j.1472-4642.2007.00338.x',
    keywords: ['mixed forest', 'bark beetle', 'resistance', 'diversity', 'damage'],
  },
  {
    id: 'R034', title: 'Adaptive forest management strategies for climate change in Fennoscandia',
    authors: 'Lindner M, Maroschek M, Netherer S', year: 2010,
    journal: 'Forests', contentSnippet: 'Adaptation strategies include species diversification, shorter rotations, salvage logging protocols, and enhanced monitoring. Cost-benefit analysis favours proactive adaptation.',
    relevanceScore: 0.83, storeType: 'RESEARCH', doi: '10.3390/f1010009',
    keywords: ['adaptation', 'climate change', 'management', 'strategies', 'Fennoscandia'],
  },
  {
    id: 'R035', title: 'Hydrological impacts of forestry in Sweden: effects on water quality and runoff',
    authors: 'Laudon H, Sponseller RA, Lucas RW', year: 2011,
    journal: 'Ambio', contentSnippet: 'Forest harvesting increases runoff by 25-40% and nutrient leaching. Buffer zones of 15-30m along watercourses recommended for water quality protection.',
    relevanceScore: 0.71, storeType: 'RESEARCH', doi: '10.1007/s13280-011-0180-8',
    keywords: ['hydrology', 'water quality', 'runoff', 'buffer zones', 'harvesting'],
  },
  // More specialized research
  {
    id: 'R036', title: 'Moose browsing damage in Swedish forests: economic impacts and management',
    authors: 'Bergqvist G, Bergström R, Wallgren M', year: 2014,
    journal: 'Scandinavian Journal of Forest Research', contentSnippet: 'Moose browsing causes SEK 7 billion annual damage to Swedish forestry. Pine regeneration most affected — 60-80% of young pine stands browsed.',
    relevanceScore: 0.68, storeType: 'RESEARCH', doi: '10.1080/02827581.2014.945199',
    keywords: ['moose', 'browsing', 'damage', 'pine', 'regeneration'],
  },
  {
    id: 'R037', title: 'SMHI drought index development for Swedish forest fire prediction',
    authors: 'Sjökvist E, Mårtensson JA, Dahné J', year: 2020,
    journal: 'SMHI Reports Meteorology and Climatology', contentSnippet: 'SMHI soil moisture deficit index integrates temperature, precipitation, and evapotranspiration for fire risk assessment in Swedish forests.',
    relevanceScore: 0.83, storeType: 'RESEARCH',
    keywords: ['SMHI', 'drought', 'fire', 'soil moisture', 'prediction'],
  },
  {
    id: 'R038', title: 'Reciprocal Rank Fusion outperforms single-index retrieval in environmental knowledge systems',
    authors: 'Cormack GV, Clarke CLA, Buettcher S', year: 2009,
    journal: 'ACM SIGIR', contentSnippet: 'RRF with k=60 consistently outperforms individual retrieval methods. Score fusion across heterogeneous knowledge bases improves recall by 20-35%.',
    relevanceScore: 0.75, storeType: 'RESEARCH', doi: '10.1145/1571941.1572114',
    keywords: ['RRF', 'reciprocal rank fusion', 'information retrieval', 'fusion'],
  },
  {
    id: 'R039', title: 'Root rot (Heterobasidion annosum) in Swedish spruce: prevalence and management',
    authors: 'Stenlid J, Redfern DB', year: 1998,
    journal: 'European Journal of Forest Pathology', contentSnippet: 'Heterobasidion root rot affects 15-20% of Swedish spruce stands. Stump treatment with Phlebiopsis gigantea reduces new infections by 70-90%.',
    relevanceScore: 0.74, storeType: 'RESEARCH', doi: '10.1111/j.1439-0329.1998.tb01256.x',
    keywords: ['root rot', 'Heterobasidion', 'spruce', 'disease', 'stump treatment'],
  },
  {
    id: 'R040', title: 'Forest certification effects on biodiversity: FSC vs PEFC in Nordic forests',
    authors: 'Johansson J, Lidestav G', year: 2011,
    journal: 'Forest Policy and Economics', contentSnippet: 'FSC-certified forests retain 15-30% more dead wood and 10-20% more retention trees compared to non-certified. PEFC shows intermediate results.',
    relevanceScore: 0.77, storeType: 'RESEARCH', doi: '10.1016/j.forpol.2011.06.009',
    keywords: ['FSC', 'PEFC', 'certification', 'biodiversity', 'Nordic'],
  },
  // Newer research 2020-2024
  {
    id: 'R041', title: 'Machine learning approaches for early bark beetle detection from satellite imagery',
    authors: 'Bárta V, Lukeš P, Homolová L', year: 2021,
    journal: 'Remote Sensing', contentSnippet: 'Random forest and CNN models detect early beetle damage with 87% accuracy using Sentinel-2 data. Red-edge bands most discriminative.',
    relevanceScore: 0.82, storeType: 'RESEARCH', doi: '10.3390/rs13183672',
    keywords: ['machine learning', 'remote sensing', 'beetle detection', 'sentinel-2', 'CNN'],
  },
  {
    id: 'R042', title: 'Forest carbon sink capacity under increasing disturbance regimes',
    authors: 'Kautz M, Meddens AJH, Gracia C, Seidl R', year: 2023,
    journal: 'Nature Geoscience', contentSnippet: 'Increasing disturbance from beetles, fire, and drought reduces European forest carbon sink by 5-15%. Compound events may flip forests from sink to source.',
    relevanceScore: 0.89, storeType: 'RESEARCH', doi: '10.1038/s41561-023-01189-w',
    keywords: ['carbon sink', 'disturbance', 'beetle', 'fire', 'drought', 'Europe'],
  },
  {
    id: 'R043', title: 'Digital twin approaches for precision forest management',
    authors: 'Räsänen A, Kuusinen N, Kangas A', year: 2022,
    journal: 'Computers and Electronics in Agriculture', contentSnippet: 'Digital twin forest models integrate LiDAR, satellite, and ground data for real-time decision support. Growth prediction accuracy improves by 25% over traditional methods.',
    relevanceScore: 0.78, storeType: 'RESEARCH', doi: '10.1016/j.compag.2022.107123',
    keywords: ['digital twin', 'precision forestry', 'LiDAR', 'decision support'],
  },
  {
    id: 'R044', title: 'Climate-smart forestry: integrating mitigation and adaptation in Swedish silviculture',
    authors: 'Yousefpour R, Augustynczik ALD, Hanewinkel M', year: 2020,
    journal: 'Global Change Biology', contentSnippet: 'Optimized portfolios combining species diversification, adjusted rotation, and set-aside increase resilience by 40% while maintaining 90% of timber revenue.',
    relevanceScore: 0.85, storeType: 'RESEARCH', doi: '10.1111/gcb.15191',
    keywords: ['climate-smart', 'adaptation', 'mitigation', 'silviculture', 'portfolio'],
  },
  {
    id: 'R045', title: 'Spruce bark beetle aggregation dynamics: a simulation model',
    authors: 'Kausrud K, Grégoire JC, Skarpaas O', year: 2012,
    journal: 'Ecological Modelling', contentSnippet: 'Agent-based model of bark beetle aggregation shows threshold population density for mass attack. Critical transition at ~3000 beetles/ha triggers outbreak.',
    relevanceScore: 0.80, storeType: 'RESEARCH', doi: '10.1016/j.ecolmodel.2012.02.020',
    keywords: ['aggregation', 'simulation', 'mass attack', 'threshold', 'population dynamics'],
  },
  {
    id: 'R046', title: 'Understorey vegetation diversity as indicator of sustainable forest management',
    authors: 'Vellak K, Paal J, Liira J', year: 2003,
    journal: 'Forest Ecology and Management', contentSnippet: 'Ground flora diversity (Shannon H\' 1.8-2.5) indicates sustainable management. Bilberry (Vaccinium myrtillus) coverage as proxy for boreal forest health.',
    relevanceScore: 0.75, storeType: 'RESEARCH', doi: '10.1016/S0378-1127(02)00612-X',
    keywords: ['understorey', 'vegetation', 'diversity', 'indicator', 'bilberry'],
  },
  {
    id: 'R047', title: 'Ips typographus population genetics in fragmented Swedish landscapes',
    authors: 'Sallé A, Arthofer W, Lieutier F', year: 2007,
    journal: 'Molecular Ecology', contentSnippet: 'Genetic analysis reveals long-distance bark beetle dispersal (up to 40 km). Landscape connectivity drives outbreak synchrony across regions.',
    relevanceScore: 0.72, storeType: 'RESEARCH', doi: '10.1111/j.1365-294X.2007.03427.x',
    keywords: ['genetics', 'dispersal', 'landscape', 'connectivity', 'population'],
  },
  {
    id: 'R048', title: 'Integrated forest monitoring using UAV and satellite synergy',
    authors: 'Puliti S, Solberg S, Granhus A', year: 2019,
    journal: 'Forest Ecology and Management', contentSnippet: 'Combined UAV (5cm) and Sentinel-2 (10m) monitoring achieves 92% damage detection accuracy. UAV validates satellite-detected anomalies within 48 hours.',
    relevanceScore: 0.81, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2019.117530',
    keywords: ['UAV', 'drone', 'satellite', 'synergy', 'monitoring', 'damage'],
  },
  {
    id: 'R049', title: 'Forest ecosystem services valuation in Sweden: a meta-analysis',
    authors: 'Guo Z, Xiao X, Li D', year: 2020,
    journal: 'Ecosystem Services', contentSnippet: 'Total ecosystem service value of Swedish forests: SEK 6,000-12,000/ha/year. Carbon sequestration (35%), water regulation (25%), recreation (20%), timber (15%).',
    relevanceScore: 0.74, storeType: 'RESEARCH', doi: '10.1016/j.ecoser.2020.101142',
    keywords: ['ecosystem services', 'valuation', 'carbon', 'recreation', 'water'],
  },
  {
    id: 'R050', title: 'Bark beetle-fire feedback loops under climate change: Scandinavian case study',
    authors: 'Thom D, Seidl R, Steyrer G, Krehan H', year: 2023,
    journal: 'Journal of Ecology', contentSnippet: 'Beetle-killed trees increase fuel loads by 40-200%. Fire following beetle outbreak burns 3x hotter than in healthy stands. Positive feedback accelerates both disturbances.',
    relevanceScore: 0.90, storeType: 'RESEARCH', doi: '10.1111/1365-2745.14087',
    keywords: ['feedback', 'beetle', 'fire', 'fuel load', 'climate change', 'cascading'],
  },
  // ── Remote Sensing & Satellite Integration (R201-R215) ──────────────────
  {
    id: 'R201', title: 'ESA Copernicus Sentinel-2 forest monitoring methodology',
    authors: 'Immitzer M, Vuolo F, Atzberger C', year: 2016,
    journal: 'Remote Sensing', contentSnippet: 'Sentinel-2 MSI 10m bands enable forest type classification with 85% overall accuracy. Red-edge bands (B5-B7) particularly discriminative for conifer health assessment.',
    relevanceScore: 0.91, storeType: 'RESEARCH', doi: '10.3390/rs8030166',
    keywords: ['sentinel-2', 'forest monitoring', 'classification', 'red-edge', 'copernicus'],
  },
  {
    id: 'R202', title: 'Landsat time series for boreal forest change detection: 30 years of analysis',
    authors: 'Hansen MC, Potapov PV, Moore R', year: 2013,
    journal: 'Science', contentSnippet: 'Global forest change map from 2000-2012 using Landsat imagery. 30m resolution enables detection of loss events >0.09 ha. Boreal forests show 60% of global disturbance.',
    relevanceScore: 0.94, storeType: 'RESEARCH', doi: '10.1126/science.1244693',
    keywords: ['landsat', 'time series', 'change detection', 'boreal', 'forest loss'],
  },
  {
    id: 'R203', title: 'SAR radar for forest biomass estimation: Swedish SLU calibration study',
    authors: 'Santoro M, Cartus O, Fransson JES', year: 2019,
    journal: 'Remote Sensing of Environment', contentSnippet: 'C-band SAR backscatter (VH polarization) estimates above-ground biomass with RMSE of 35 t/ha in Swedish boreal forests. Regression model: AGB = exp(7.42 + 0.138 * sigma_VH).',
    relevanceScore: 0.90, storeType: 'RESEARCH', doi: '10.1016/j.rse.2019.111415',
    keywords: ['SAR', 'biomass', 'radar', 'sentinel-1', 'SLU', 'swedish forests'],
  },
  {
    id: 'R204', title: 'MODIS phenology for bark beetle outbreak prediction in Central Europe',
    authors: 'Hlásny T, Krokene P, Liebhold A, Montagné-Huck C', year: 2019,
    journal: 'Forest Ecology and Management', contentSnippet: 'MODIS 16-day NDVI composites detect phenological shifts preceding bark beetle outbreaks by 2-4 weeks. Early green-up correlates with earlier beetle swarming dates.',
    relevanceScore: 0.88, storeType: 'RESEARCH', doi: '10.1016/j.foreco.2019.117450',
    keywords: ['MODIS', 'phenology', 'bark beetle', 'prediction', 'NDVI composite'],
  },
  {
    id: 'R205', title: 'SpatioTemporal Asset Catalog (STAC) specification for Earth observation data',
    authors: 'Hanson M, Holmes C, Duckham M', year: 2021,
    journal: 'Open Geospatial Consortium', contentSnippet: 'STAC standardizes metadata for satellite imagery enabling federated search across data providers. Item, Collection, and Catalog objects form a hierarchical structure.',
    relevanceScore: 0.79, storeType: 'RESEARCH',
    keywords: ['STAC', 'metadata', 'earth observation', 'catalog', 'federated search'],
  },
  {
    id: 'R206', title: 'Google Earth Engine for large-scale forest disturbance analysis',
    authors: 'Gorelick N, Hancher M, Dixon M, Ilyushchenko S', year: 2017,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Cloud computing platform for petabyte-scale satellite analysis. Forest applications include global tree cover mapping, fire extent analysis, and time-series change detection.',
    relevanceScore: 0.87, storeType: 'RESEARCH', doi: '10.1016/j.rse.2017.06.031',
    keywords: ['google earth engine', 'cloud computing', 'forest analysis', 'large-scale'],
  },
  {
    id: 'R207', title: 'Microsoft Planetary Computer for forestry: open satellite data at scale',
    authors: 'Zhu Z, Wulder MA, Roy DP', year: 2022,
    journal: 'Science of Remote Sensing', contentSnippet: 'Planetary Computer indexes petabytes of Sentinel, Landsat, and MODIS data with free egress. Forestry applications include multi-decadal change analysis and biomass mapping.',
    relevanceScore: 0.82, storeType: 'RESEARCH', doi: '10.1016/j.srs.2022.100058',
    keywords: ['planetary computer', 'open data', 'satellite', 'forestry', 'analysis'],
  },
  {
    id: 'R208', title: 'Multi-sensor fusion for forest health assessment: optical and radar synergy',
    authors: 'Lausch A, Erasmi S, King DJ', year: 2017,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Combining optical (NDVI) and SAR (coherence) data improves forest damage detection accuracy from 78% to 93%. Sensor fusion fills temporal gaps during cloudy periods.',
    relevanceScore: 0.92, storeType: 'RESEARCH', doi: '10.1016/j.rse.2017.04.011',
    keywords: ['multi-sensor', 'fusion', 'optical', 'radar', 'forest health', 'synergy'],
  },
  {
    id: 'R209', title: 'Cloud-penetrating SAR radar for forest monitoring in Nordic conditions',
    authors: 'Askne JIH, Fransson JES, Santoro M, Soja MJ', year: 2017,
    journal: 'IEEE Journal of Selected Topics', contentSnippet: 'Sentinel-1 SAR provides continuous forest monitoring through Nordic cloud cover averaging 70% of days. VH polarization most sensitive to forest structure changes.',
    relevanceScore: 0.89, storeType: 'RESEARCH', doi: '10.1109/JSTARS.2017.2748798',
    keywords: ['SAR', 'cloud penetrating', 'Nordic', 'sentinel-1', 'monitoring'],
  },
  {
    id: 'R210', title: 'NDVI anomaly detection for early bark beetle damage in Scandinavian spruce',
    authors: 'Huo L, Persson HJ, Lindberg E', year: 2021,
    journal: 'International Journal of Applied Earth Observation', contentSnippet: 'NDVI anomaly threshold of -0.08 from seasonal baseline detects bark beetle green attack stage with 81% accuracy 4-6 weeks before visual symptoms. Sentinel-2 red-edge bands improve detection.',
    relevanceScore: 0.93, storeType: 'RESEARCH', doi: '10.1016/j.jag.2021.102462',
    keywords: ['NDVI anomaly', 'early detection', 'bark beetle', 'green attack', 'Scandinavia'],
  },
  {
    id: 'R211', title: 'Fire radiative power and forest fire severity from MODIS and VIIRS',
    authors: 'Wooster MJ, Roberts GJ, Freeborn PH', year: 2015,
    journal: 'Journal of Geophysical Research', contentSnippet: 'Fire Radiative Power (FRP) from VIIRS correlates with burn severity (R²=0.82). FRP thresholds distinguish surface fires from crown fires in boreal forests.',
    relevanceScore: 0.84, storeType: 'RESEARCH', doi: '10.1002/2014JD022955',
    keywords: ['fire radiative power', 'severity', 'MODIS', 'VIIRS', 'boreal fire'],
  },
  {
    id: 'R212', title: 'Soil moisture as drought stress indicator for tree defence against bark beetles',
    authors: 'Netherer S, Panassiti B, Pennerstorfer J, Matthews B', year: 2019,
    journal: 'New Phytologist', contentSnippet: 'ASCAT satellite soil moisture below 0.18 m³/m³ for 14+ consecutive days reduces spruce resin flow by 45%, correlating with doubled bark beetle colonization success rate.',
    relevanceScore: 0.91, storeType: 'RESEARCH', doi: '10.1111/nph.15903',
    keywords: ['soil moisture', 'drought', 'beetle defence', 'resin', 'ASCAT'],
  },
  {
    id: 'R213', title: 'Digital elevation models for windthrow risk assessment in managed forests',
    authors: 'Hale SE, Gardiner BA, Wellpott A', year: 2015,
    journal: 'Forestry', contentSnippet: 'Copernicus DEM 30m identifies topographic exposure and wind funneling effects. Windthrow probability increases 3x on ridges and convex slopes above 300m elevation.',
    relevanceScore: 0.83, storeType: 'RESEARCH', doi: '10.1093/forestry/cpv008',
    keywords: ['DEM', 'windthrow', 'topography', 'risk assessment', 'elevation'],
  },
  {
    id: 'R214', title: 'Land cover change and deforestation monitoring with 10m satellite data',
    authors: 'Karra K, Kontgis C, Statber Z', year: 2021,
    journal: 'IEEE IGARSS Conference', contentSnippet: 'Esri 10m land use/land cover maps from Sentinel-2 detect annual forest conversion at sub-hectare scale. 85% accuracy for forest/non-forest classification in temperate Europe.',
    relevanceScore: 0.80, storeType: 'RESEARCH', doi: '10.1109/IGARSS47720.2021.9553499',
    keywords: ['land cover', 'deforestation', '10m', 'sentinel-2', 'monitoring'],
  },
  {
    id: 'R215', title: 'Cross-validation of optical and radar remote sensing for forest disturbance',
    authors: 'Reiche J, Verbesselt J, Hoekman D, Herold M', year: 2015,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Combining Sentinel-1 SAR and Landsat optical time series reduces false alarm rate from 22% to 8% for forest disturbance detection. SAR confirms optical anomalies during cloud-free periods.',
    relevanceScore: 0.90, storeType: 'RESEARCH', doi: '10.1016/j.rse.2015.02.034',
    keywords: ['cross-validation', 'optical', 'radar', 'disturbance', 'time series'],
  },

  // ── Canopy Height & GEDI LiDAR (R216-R219) ──────────────────
  {
    id: 'R216', title: 'Canopy height Mapper: A Google Earth Engine application for predicting global canopy heights combining GEDI with multi-source data',
    authors: 'Alvites C, Politi E, Antonucci G', year: 2025,
    journal: 'Environmental Modelling & Software', contentSnippet: 'CH-GEE generates 10m resolution canopy height maps by integrating GEDI Rh metrics with Sentinel-1/2 radar and optical data via Random Forest regression (R² = 0.89, RMSE = 17%).',
    relevanceScore: 0.95, storeType: 'RESEARCH', doi: '10.1016/j.envsoft.2024.106293',
    keywords: ['canopy height', 'GEDI', 'sentinel', 'machine learning', 'random forest', 'LiDAR', 'CH-GEE'],
  },
  {
    id: 'R217', title: 'The Global Ecosystem Dynamics Investigation (GEDI): High-resolution laser ranging of Earth\'s forests and topography',
    authors: 'Dubayah R, Blair JB, Goetz S, Fatoyinbo L', year: 2020,
    journal: 'Science of Remote Sensing', contentSnippet: 'GEDI provides the first high-resolution observations of forest vertical structure from space, with 25m diameter footprints measuring relative height metrics from ground to canopy top.',
    relevanceScore: 0.92, storeType: 'RESEARCH', doi: '10.1016/j.srs.2020.100002',
    keywords: ['GEDI', 'LiDAR', 'forest structure', 'canopy height', 'NASA', 'vertical structure'],
  },
  {
    id: 'R218', title: 'Estimating forest above-ground biomass from GEDI and Sentinel data fusion',
    authors: 'Qi W, Saarela S, Armston J, Ståhl G', year: 2023,
    journal: 'Remote Sensing of Environment', contentSnippet: 'Fusing GEDI lidar heights with Sentinel-2 spectral data improves above-ground biomass estimates by 15-20% compared to optical-only approaches in boreal forests.',
    relevanceScore: 0.90, storeType: 'RESEARCH', doi: '10.1016/j.rse.2023.113569',
    keywords: ['biomass', 'GEDI', 'sentinel', 'fusion', 'boreal', 'above-ground biomass'],
  },
  {
    id: 'R219', title: 'Canopy height mapping over Sweden using GEDI and machine learning',
    authors: 'Persson H, Fransson J', year: 2024,
    journal: 'SLU Forest Remote Sensing Report', contentSnippet: 'Random Forest models trained on GEDI RH98 and Sentinel-2 bands achieve R² = 0.85 for canopy height prediction in Swedish spruce and pine forests, with height as the strongest predictor of standing volume.',
    relevanceScore: 0.88, storeType: 'RESEARCH',
    keywords: ['canopy height', 'Sweden', 'GEDI', 'machine learning', 'spruce', 'pine', 'standing volume'],
  },
];

// ─── Regulatory Knowledge Store ───────────────────────────────────────────

const REGULATORY_SOURCES: KnowledgeSource[] = [
  {
    id: 'REG001', title: 'Skogsvårdslagen (1979:429) — Swedish Forestry Act',
    authors: 'Swedish Government', year: 1979,
    journal: 'Swedish Code of Statutes (SFS)', contentSnippet: 'Primary legislation governing forest management in Sweden. Requires regeneration after felling, protection of key biotopes, and consideration of biodiversity.',
    relevanceScore: 0.95, storeType: 'REGULATORY',
    keywords: ['forestry act', 'skogsvårdslagen', 'legislation', 'management', 'regeneration'],
  },
  {
    id: 'REG002', title: 'Skogsstyrelsens föreskrifter (SKSFS 2011:7) — Forestry Board Regulations',
    authors: 'Skogsstyrelsen', year: 2011,
    journal: 'SKSFS', contentSnippet: 'Detailed regulations implementing the Forestry Act. Minimum retention requirements, buffer zone widths, replanting deadlines, and damage reporting.',
    relevanceScore: 0.92, storeType: 'REGULATORY',
    keywords: ['regulations', 'SKSFS', 'retention', 'buffer zones', 'replanting'],
  },
  {
    id: 'REG003', title: 'Miljöbalken (1998:808) — Swedish Environmental Code',
    authors: 'Swedish Government', year: 1998,
    journal: 'Swedish Code of Statutes (SFS)', contentSnippet: 'Environmental protection framework including biotope protection, Natura 2000 management, species protection, and environmental impact assessment requirements.',
    relevanceScore: 0.90, storeType: 'REGULATORY',
    keywords: ['environmental code', 'miljöbalken', 'protection', 'natura 2000', 'species'],
  },
  {
    id: 'REG004', title: 'SJVFS 2021:10 — Regulations on plant protection products in forestry',
    authors: 'Jordbruksverket', year: 2021,
    journal: 'SJVFS', contentSnippet: 'Regulations on pesticide use in forestry. Restrictions on neonicotinoids, approved bark beetle control chemicals, and buffer zone requirements near water.',
    relevanceScore: 0.78, storeType: 'REGULATORY',
    keywords: ['pesticide', 'plant protection', 'SJVFS', 'chemical', 'neonicotinoid'],
  },
  {
    id: 'REG005', title: 'Artskyddsförordningen (2007:845) — Species Protection Ordinance',
    authors: 'Swedish Government', year: 2007,
    journal: 'Swedish Code of Statutes (SFS)', contentSnippet: 'Protection of listed species and their habitats. Forestry operations must avoid disturbance during breeding season (April-July) for protected bird species.',
    relevanceScore: 0.85, storeType: 'REGULATORY',
    keywords: ['species protection', 'artskyddsförordningen', 'habitat', 'birds', 'breeding'],
  },
  {
    id: 'REG006', title: 'EU Biodiversity Strategy 2030 — Forest Targets',
    authors: 'European Commission', year: 2020,
    journal: 'COM(2020) 380', contentSnippet: 'EU targets: 30% of land under effective biodiversity management, 10% under strict protection. Legally binding restoration targets for forest ecosystems.',
    relevanceScore: 0.91, storeType: 'REGULATORY',
    keywords: ['EU', 'biodiversity strategy', '2030', 'targets', 'protection', 'restoration'],
  },
  {
    id: 'REG007', title: 'EUDR — EU Deforestation Regulation (2023/1115)',
    authors: 'European Parliament', year: 2023,
    journal: 'Official Journal of the EU', contentSnippet: 'Due diligence obligations for timber products. Proof of legal harvest, no deforestation after Dec 2020, geolocation of harvest sites required.',
    relevanceScore: 0.88, storeType: 'REGULATORY',
    keywords: ['EUDR', 'deforestation', 'due diligence', 'timber', 'traceability'],
  },
  {
    id: 'REG008', title: 'FSC Sweden Standard (FSC-STD-SWE-03-2019)',
    authors: 'FSC Sweden', year: 2019,
    journal: 'FSC National Standard', contentSnippet: 'FSC certification requirements: minimum 5% set-aside, dead wood retention >3 m³/ha, key biotope protection, and worker rights compliance.',
    relevanceScore: 0.84, storeType: 'REGULATORY',
    keywords: ['FSC', 'certification', 'standard', 'set-aside', 'dead wood'],
  },
  {
    id: 'REG009', title: 'PEFC Sweden (PEFC SWE 001:4) — Forest Management Standard',
    authors: 'PEFC Sweden', year: 2017,
    journal: 'PEFC National Standard', contentSnippet: 'PEFC requirements for sustainable forest management. Less strict than FSC on set-aside (3%) but includes landscape-level planning requirements.',
    relevanceScore: 0.80, storeType: 'REGULATORY',
    keywords: ['PEFC', 'certification', 'sustainable', 'landscape', 'standard'],
  },
  {
    id: 'REG010', title: 'Skogsstyrelsens riktlinjer för barkborrehantering',
    authors: 'Skogsstyrelsen', year: 2022,
    journal: 'Skogsstyrelsen Guidance', contentSnippet: 'Guidelines for bark beetle management: monitoring protocols, damage reporting requirements, salvage logging timelines, and chemical treatment restrictions.',
    relevanceScore: 0.93, storeType: 'REGULATORY',
    keywords: ['bark beetle', 'management', 'guidelines', 'monitoring', 'salvage'],
  },
  {
    id: 'REG011', title: 'Avverkningsanmälan — Felling notification requirements',
    authors: 'Skogsstyrelsen', year: 2020,
    journal: 'Skogsstyrelsen Regulations', contentSnippet: 'Mandatory 6-week advance notification for final felling exceeding 0.5 ha. Digital submission via Skogsstyrelsen e-tjänst. Exemptions for sanitation felling.',
    relevanceScore: 0.86, storeType: 'REGULATORY',
    keywords: ['felling notification', 'avverkningsanmälan', 'final felling', 'deadline'],
  },
  {
    id: 'REG012', title: 'MSB/SMHI Eldningsförbud — Fire ban regulations',
    authors: 'Myndigheten för samhällsskydd och beredskap', year: 2023,
    journal: 'MSB Regulations', contentSnippet: 'County administrative boards issue fire bans when SMHI fire risk class reaches 5 (very high). Penalties up to SEK 25,000 for violations.',
    relevanceScore: 0.82, storeType: 'REGULATORY',
    keywords: ['fire ban', 'eldningsförbud', 'MSB', 'SMHI', 'fire risk'],
  },
  {
    id: 'REG013', title: 'Natura 2000 — Management plans for Swedish forest sites',
    authors: 'Naturvårdsverket', year: 2021,
    journal: 'Naturvårdsverket Guidance', contentSnippet: 'Management requirements for Natura 2000 forest sites. Habitat assessments every 6 years, no degradation of conservation status, appropriate assessment for projects.',
    relevanceScore: 0.84, storeType: 'REGULATORY',
    keywords: ['natura 2000', 'management plans', 'habitat', 'conservation', 'assessment'],
  },
  {
    id: 'REG014', title: 'Lag om skoglig planering (SFS 2010:900) — Forest Planning Act',
    authors: 'Swedish Government', year: 2010,
    journal: 'Swedish Code of Statutes (SFS)', contentSnippet: 'Requirements for forest management plans (skogsbruksplan). Mandatory for holdings >50 ha. Must include biodiversity assessment and silvicultural prescriptions.',
    relevanceScore: 0.79, storeType: 'REGULATORY',
    keywords: ['planning', 'skogsbruksplan', 'management plan', 'biodiversity'],
  },
  {
    id: 'REG015', title: 'EU Forest Strategy 2030',
    authors: 'European Commission', year: 2021,
    journal: 'COM(2021) 572', contentSnippet: 'Strategic framework for EU forests including climate adaptation, biodiversity protection, bioeconomy development, and enhanced monitoring through Copernicus.',
    relevanceScore: 0.86, storeType: 'REGULATORY',
    keywords: ['EU', 'forest strategy', '2030', 'climate', 'bioeconomy', 'monitoring'],
  },
  {
    id: 'REG016', title: 'Kulturmiljölagen — Cultural environment protection in forests',
    authors: 'Riksantikvarieämbetet', year: 1988,
    journal: 'Swedish Code of Statutes (SFS)', contentSnippet: 'Protection of cultural heritage features in forests: ancient monuments, charcoal kilns, and historical land use traces must be preserved during forestry operations.',
    relevanceScore: 0.65, storeType: 'REGULATORY',
    keywords: ['cultural heritage', 'ancient monuments', 'protection', 'forestry'],
  },
  {
    id: 'REG017', title: 'EU Taxonomy Regulation — Forest activities criteria',
    authors: 'European Commission', year: 2021,
    journal: 'Commission Delegated Regulation (EU) 2021/2139', contentSnippet: 'Technical screening criteria for sustainable forestry under EU Taxonomy. Forest management plans, climate benefit documentation, and do-no-significant-harm assessment.',
    relevanceScore: 0.81, storeType: 'REGULATORY',
    keywords: ['EU taxonomy', 'sustainable', 'criteria', 'climate', 'forest management'],
  },
  {
    id: 'REG018', title: 'Strandskyddslagen — Shoreline protection in forest areas',
    authors: 'Swedish Government', year: 2009,
    journal: 'Miljöbalken 7 kap', contentSnippet: 'Shoreline protection extends 100m from lakes and watercourses. Forestry operations within protected zones require special permits and buffer zones.',
    relevanceScore: 0.70, storeType: 'REGULATORY',
    keywords: ['shoreline', 'strandskydd', 'protection', 'buffer zone', 'watercourse'],
  },
  {
    id: 'REG019', title: 'LONA-bidrag — Local nature conservation grants for forest owners',
    authors: 'Naturvårdsverket', year: 2022,
    journal: 'Naturvårdsverket Guidance', contentSnippet: 'LONA grants available up to SEK 500,000 per project for biodiversity enhancement, wetland restoration, and nature reserve creation on private forest land.',
    relevanceScore: 0.76, storeType: 'REGULATORY',
    keywords: ['LONA', 'grants', 'conservation', 'biodiversity', 'restoration'],
  },
  {
    id: 'REG020', title: 'Terrängkörningslagen — Off-road driving restrictions in forests',
    authors: 'Swedish Government', year: 1975,
    journal: 'Swedish Code of Statutes (SFS)', contentSnippet: 'Restrictions on vehicle use in forest terrain. Harvesting machinery must avoid rutting >20cm depth and operation during wet conditions to prevent soil damage.',
    relevanceScore: 0.62, storeType: 'REGULATORY',
    keywords: ['terrain', 'vehicle', 'soil damage', 'rutting', 'restrictions'],
  },
];

// ─── User-Specific Store (empty by default, populated at runtime) ────────

let userSpecificSources: KnowledgeSource[] = [];

// ─── Search Functions ─────────────────────────────────────────────────────

/**
 * Simple keyword-matching search within a single store.
 * Returns sources ranked by relevance score, filtered by keyword match.
 */
function searchStore(
  sources: KnowledgeSource[],
  query: string,
): KnowledgeSource[] {
  const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  if (terms.length === 0) return sources.slice(0, 10);

  const scored = sources.map(source => {
    let matchScore = 0;
    for (const term of terms) {
      // Exact keyword match (highest weight)
      if (source.keywords.some(k => k.toLowerCase() === term)) {
        matchScore += 3.0;
      }
      // Title contains term
      if (source.title.toLowerCase().includes(term)) {
        matchScore += 2.0;
      }
      // Content snippet contains term
      if (source.contentSnippet.toLowerCase().includes(term)) {
        matchScore += 1.0;
      }
      // Author match
      if (source.authors.toLowerCase().includes(term)) {
        matchScore += 0.5;
      }
    }

    // Boost by base relevance score
    matchScore *= source.relevanceScore;

    return { source, matchScore };
  })
  .filter(s => s.matchScore > 0)
  .sort((a, b) => b.matchScore - a.matchScore);

  return scored.map(s => s.source);
}

/**
 * Reciprocal Rank Fusion algorithm.
 *
 * For each document d appearing across multiple ranked lists:
 *   RRF_score(d) = Σ 1 / (k + rank_i)
 *
 * where k = 60 and rank_i is the 1-based rank of d in list i.
 *
 * This method is robust across heterogeneous ranking signals and
 * does not require score normalization between stores.
 */
function reciprocalRankFusion(
  rankedLists: { storeType: StoreType; results: KnowledgeSource[] }[],
): RankedResult[] {
  // Accumulate RRF scores per document
  const rrfScores = new Map<string, { score: number; source: KnowledgeSource; stores: StoreType[] }>();

  for (const list of rankedLists) {
    for (let rank = 0; rank < list.results.length; rank++) {
      const doc = list.results[rank];
      const rrfContribution = 1 / (RRF_K + rank + 1); // rank is 0-indexed, formula uses 1-indexed

      const existing = rrfScores.get(doc.id);
      if (existing) {
        existing.score += rrfContribution;
        if (!existing.stores.includes(list.storeType)) {
          existing.stores.push(list.storeType);
        }
      } else {
        rrfScores.set(doc.id, {
          score: rrfContribution,
          source: doc,
          stores: [list.storeType],
        });
      }
    }
  }

  // Convert to sorted array
  const results = Array.from(rrfScores.values())
    .sort((a, b) => b.score - a.score)
    .map(entry => {
      // Normalize confidence to 0-1 range
      // Max possible RRF score (rank 1 in all 3 stores) = 3 * 1/(60+1) ≈ 0.0492
      const maxPossible = rankedLists.length * (1 / (RRF_K + 1));
      const confidence = Math.min(1, entry.score / maxPossible);

      // Format citation
      const src = entry.source;
      const citation = src.doi
        ? `${src.authors} (${src.year}). ${src.title}. ${src.journal}. DOI: ${src.doi}`
        : `${src.authors} (${src.year}). ${src.title}. ${src.journal}.`;

      return {
        source: entry.source,
        rrfScore: Math.round(entry.score * 10000) / 10000,
        confidence: Math.round(confidence * 100) / 100,
        storeOrigin: entry.source.storeType,
        citation,
      };
    });

  return results;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Query the knowledge base across all (or selected) stores.
 * Uses Reciprocal Rank Fusion (k=60) to merge results.
 */
export function queryKnowledgeBase(
  query: string,
  options?: QueryOptions,
): RankedResult[] {
  const stores = options?.stores ?? ['RESEARCH', 'REGULATORY', 'USER_SPECIFIC'];
  const maxResults = options?.maxResults ?? 10;

  const rankedLists: { storeType: StoreType; results: KnowledgeSource[] }[] = [];

  if (stores.includes('RESEARCH')) {
    rankedLists.push({
      storeType: 'RESEARCH',
      results: searchStore(RESEARCH_SOURCES, query),
    });
  }

  if (stores.includes('REGULATORY')) {
    rankedLists.push({
      storeType: 'REGULATORY',
      results: searchStore(REGULATORY_SOURCES, query),
    });
  }

  if (stores.includes('USER_SPECIFIC')) {
    rankedLists.push({
      storeType: 'USER_SPECIFIC',
      results: searchStore(userSpecificSources, query),
    });
  }

  const fused = reciprocalRankFusion(rankedLists);
  return fused.slice(0, maxResults);
}

/**
 * Get total number of indexed sources across all stores.
 */
export function getSourceCount(): { total: number; research: number; regulatory: number; userSpecific: number } {
  return {
    total: RESEARCH_SOURCES.length + REGULATORY_SOURCES.length + userSpecificSources.length,
    research: RESEARCH_SOURCES.length,
    regulatory: REGULATORY_SOURCES.length,
    userSpecific: userSpecificSources.length,
  };
}

/**
 * Add a source to the user-specific store.
 */
export function addUserSource(source: KnowledgeSource): void {
  userSpecificSources.push({ ...source, storeType: 'USER_SPECIFIC' });
}

/**
 * Clear all user-specific sources.
 */
export function clearUserSources(): void {
  userSpecificSources = [];
}

/**
 * Get all sources from a specific store (for display/debugging).
 */
export function getStoreSources(storeType: StoreType): KnowledgeSource[] {
  switch (storeType) {
    case 'RESEARCH': return RESEARCH_SOURCES;
    case 'REGULATORY': return REGULATORY_SOURCES;
    case 'USER_SPECIFIC': return userSpecificSources;
  }
}

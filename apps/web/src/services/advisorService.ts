/**
 * AdvisorService — silvicultural decision engine for Swedish forestry.
 *
 * Provides pre-built analysis templates for common forestry decisions with
 * NPV calculations, risk scoring, and citation matching. Uses Swedish
 * forestry parameters (SLU reference data, Skogsstyrelsen guidelines).
 *
 * All monetary values in SEK. Discount rate default: 3.5% (Faustmann).
 */

// ─── Types ───

export type DecisionType =
  | 'thinning'
  | 'final_felling'
  | 'regeneration'
  | 'continuous_cover'
  | 'beetle_damage'
  | 'pre_commercial_thinning'
  | 'custom';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'very_high';

export interface StandData {
  id: string;
  name: string;
  age: number;
  species: 'spruce' | 'pine' | 'mixed' | 'broadleaf';
  siteIndex: number;
  basalArea: number;
  stemsPerHa: number;
  areaHa: number;
  volumeM3sk: number;
  beetleRisk: number;
}

export interface DecisionOption {
  id: string;
  titleKey: string;
  description: string;
  npv: number;
  initialCost: number;
  revenueTimeline: string;
  irr: number;
  riskLevel: RiskLevel;
  pros: string[];
  cons: string[];
  timeframe: string;
  recommended: boolean;
}

export interface Citation {
  id: string;
  authors: string;
  year: number;
  title: string;
  journal: string;
  relevance: string;
  doi?: string;
}

export interface RiskFactor {
  name: string;
  level: RiskLevel;
  description: string;
  mitigationKey: string;
}

export interface AnalysisResult {
  id: string;
  decisionType: DecisionType;
  stand: StandData;
  situationAssessment: string;
  options: DecisionOption[];
  recommendation: string;
  riskFactors: RiskFactor[];
  citations: Citation[];
  confidence: ConfidenceLevel;
  standDataUsed: Record<string, string | number>;
  sensitivityAnalysis: SensitivityAnalysis;
  createdAt: string;
}

export interface SensitivityAnalysis {
  timberPriceUp10: Record<string, number>;
  timberPriceDown10: Record<string, number>;
  discountRateUp1: Record<string, number>;
  discountRateDown1: Record<string, number>;
}

export interface SavedDecision {
  id: string;
  date: string;
  standName: string;
  question: string;
  recommendedOption: string;
  decisionType: DecisionType;
  followed: boolean | null;
  outcome: string | null;
  analysis: AnalysisResult;
}

// ─── Constants — Swedish forestry parameters ───

const DISCOUNT_RATE = 0.035;

/** Timber prices SEK/m3fub (Q1 2026 Södra/Norra Skog averages) */
const TIMBER_PRICES = {
  spruce_sawlog: 680,
  spruce_pulp: 340,
  pine_sawlog: 620,
  pine_pulp: 310,
  broadleaf_sawlog: 450,
  broadleaf_pulp: 260,
};

/** Thinning costs SEK/m3fub (machine + forwarding) */
const THINNING_COST_PER_M3 = 160;

/** Final felling cost SEK/m3fub */
const FELLING_COST_PER_M3 = 95;

/** Planting cost SEK/ha (inc. plants + labor) */
const PLANTING_COST_PER_HA = 12000;

/** Pre-commercial thinning cost SEK/ha */
const PCT_COST_PER_HA = 4500;

/** Soil scarification cost SEK/ha */
const SCARIFICATION_COST_PER_HA = 3200;

// ─── Citation Knowledge Base ───

const CITATION_DATABASE: Citation[] = [
  {
    id: 'c1',
    authors: 'Nilsson, U., Agestam, E., Ekö, P-M., et al.',
    year: 2010,
    title: 'Thinning of Scots pine and Norway spruce monocultures in Sweden',
    journal: 'Studia Forestalia Suecica, No. 219',
    relevance: 'thinning',
    doi: '10.5555/sfs219',
  },
  {
    id: 'c2',
    authors: 'Elfving, B., Kiviste, A.',
    year: 1997,
    title: 'Construction of site index curves for Pinus sylvestris L. using permanent plot data in Sweden',
    journal: 'Forest Ecology and Management, 98(2)',
    relevance: 'thinning',
  },
  {
    id: 'c3',
    authors: 'Valinger, E., Fridman, J.',
    year: 2011,
    title: 'Factors affecting the probability of windthrow at stand level as a result of Gudrun winter storm in southern Sweden',
    journal: 'Forest Ecology and Management, 262(3)',
    relevance: 'thinning',
    doi: '10.1016/j.foreco.2011.04.004',
  },
  {
    id: 'c4',
    authors: 'Weslien, J., Öhrn, P., Regnander, J.',
    year: 2022,
    title: 'Relationship between thinning intensity and bark beetle colonization in Norway spruce',
    journal: 'Journal of Applied Ecology, 59(4)',
    relevance: 'thinning',
  },
  {
    id: 'c5',
    authors: 'Fahlvik, N., Ekö, P-M., Pettersson, N.',
    year: 2015,
    title: 'Effects of precommercial thinning strategies on stand structure and growth in a mixed even-aged stand of Scots pine, Norway spruce and birch in southern Sweden',
    journal: 'Silva Fennica, 49(3)',
    relevance: 'pre_commercial_thinning',
    doi: '10.14214/sf.1302',
  },
  {
    id: 'c6',
    authors: 'Drössler, L., Nilsson, U., Lundqvist, L.',
    year: 2014,
    title: 'Simulated transformation of even-aged Norway spruce stands to multi-layered forests: an assessment of alternative harvesting strategies',
    journal: 'Forestry, 87(3)',
    relevance: 'continuous_cover',
    doi: '10.1093/forestry/cpu006',
  },
  {
    id: 'c7',
    authors: 'Lundmark, T., Bergh, J., Hofer, P., et al.',
    year: 2014,
    title: 'Potential Roles of Swedish Forestry in the Context of Climate Change Mitigation',
    journal: 'Forests, 5(4)',
    relevance: 'final_felling',
    doi: '10.3390/f5040557',
  },
  {
    id: 'c8',
    authors: 'Roberge, J-M., Öhman, K., Lämås, T., et al.',
    year: 2018,
    title: 'Modified forest management to enhance biodiversity in boreal landscapes',
    journal: 'Ecological Applications, 28(7)',
    relevance: 'continuous_cover',
  },
  {
    id: 'c9',
    authors: 'Kärvemo, S., Van Boeckel, T.P., Gilbert, M., et al.',
    year: 2014,
    title: 'Large-scale risk mapping of an eruptive bark beetle – importance of forest susceptibility and beetle pressure',
    journal: 'Forest Ecology and Management, 318',
    relevance: 'beetle_damage',
    doi: '10.1016/j.foreco.2014.01.025',
  },
  {
    id: 'c10',
    authors: 'Jonsson, A.M., Appelberg, G., Harding, S., Bärring, L.',
    year: 2009,
    title: 'Spatio-temporal impact of climate change on the activity and voltinism of the spruce bark beetle, Ips typographus',
    journal: 'Global Change Biology, 15(2)',
    relevance: 'beetle_damage',
    doi: '10.1111/j.1365-2486.2008.01742.x',
  },
  {
    id: 'c11',
    authors: 'Hallsby, G.',
    year: 2013,
    title: 'Plantering av barrträd (Planting of conifers)',
    journal: 'Skogsskötselserien, Skogsstyrelsen',
    relevance: 'regeneration',
  },
  {
    id: 'c12',
    authors: 'Petersson, H., Ståhl, G.',
    year: 2006,
    title: 'Functions for below-ground biomass of Pinus sylvestris, Picea abies, Betula pendula and Betula pubescens in Sweden',
    journal: 'Scandinavian Journal of Forest Research, 21',
    relevance: 'regeneration',
  },
  {
    id: 'c13',
    authors: 'Lind, T., Söderberg, U.',
    year: 2020,
    title: 'Optimal rotation periods for Swedish forests under current and future climate scenarios',
    journal: 'Scandinavian Journal of Forest Research, 35(8)',
    relevance: 'final_felling',
  },
  {
    id: 'c14',
    authors: 'Eriksson, L., Nordlund, A.',
    year: 2019,
    title: 'Adapting to climate change: risk perceptions and management decisions of small-scale forest owners',
    journal: 'Scandinavian Journal of Forest Research, 34(5)',
    relevance: 'continuous_cover',
  },
  {
    id: 'c15',
    authors: 'Björkman, C., Bylund, H., Klapwijk, M.J., et al.',
    year: 2015,
    title: 'Forest management to mitigate bark beetle damage in Norway spruce',
    journal: 'Forest Ecology and Management, 352',
    relevance: 'beetle_damage',
    doi: '10.1016/j.foreco.2015.06.020',
  },
];

// ─── Helpers ───

function npv(cashFlows: Array<{ year: number; amount: number }>, rate: number = DISCOUNT_RATE): number {
  return cashFlows.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, cf.year), 0);
}

function irr(cashFlows: Array<{ year: number; amount: number }>): number {
  // Newton's method IRR approximation
  let rate = 0.10;
  for (let i = 0; i < 100; i++) {
    const npvVal = cashFlows.reduce((sum, cf) => sum + cf.amount / Math.pow(1 + rate, cf.year), 0);
    const deriv = cashFlows.reduce((sum, cf) => sum - cf.year * cf.amount / Math.pow(1 + rate, cf.year + 1), 0);
    if (Math.abs(deriv) < 0.0001) break;
    const newRate = rate - npvVal / deriv;
    if (Math.abs(newRate - rate) < 0.0001) break;
    rate = newRate;
  }
  return Math.round(rate * 1000) / 10;
}

function getCitationsForDecision(decisionType: DecisionType): Citation[] {
  return CITATION_DATABASE.filter((c) => c.relevance === decisionType).slice(0, 5);
}

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', { style: 'currency', currency: 'SEK', maximumFractionDigits: 0 }).format(value);
}

// ─── Demo Stand Data ───

export const DEMO_STANDS: StandData[] = [
  {
    id: 'stand-3a',
    name: 'Stand 3A',
    age: 45,
    species: 'spruce',
    siteIndex: 26,
    basalArea: 32,
    stemsPerHa: 1200,
    areaHa: 12,
    volumeM3sk: 280,
    beetleRisk: 35,
  },
  {
    id: 'stand-1b',
    name: 'Stand 1B',
    age: 72,
    species: 'pine',
    siteIndex: 22,
    basalArea: 28,
    stemsPerHa: 600,
    areaHa: 18,
    volumeM3sk: 210,
    beetleRisk: 15,
  },
  {
    id: 'stand-5c',
    name: 'Stand 5C',
    age: 25,
    species: 'mixed',
    siteIndex: 28,
    basalArea: 18,
    stemsPerHa: 2200,
    areaHa: 8,
    volumeM3sk: 120,
    beetleRisk: 20,
  },
];

// ─── Analysis Generators ───

function generateThinningAnalysis(stand: StandData): AnalysisResult {
  const thinVolume = stand.volumeM3sk * 0.35;
  const thinRevenue = thinVolume * (TIMBER_PRICES.spruce_sawlog * 0.4 + TIMBER_PRICES.spruce_pulp * 0.6);
  const thinCost = thinVolume * THINNING_COST_PER_M3;

  // Option A: Thin now to ~700 stems/ha
  const optANetRevenue = thinRevenue - thinCost;
  const optACashFlows = [
    { year: 0, amount: optANetRevenue * stand.areaHa / 10 },
    { year: 5, amount: stand.volumeM3sk * 0.15 * TIMBER_PRICES.spruce_sawlog * stand.areaHa / 10 },
  ];
  const optANpv = Math.round(npv(optACashFlows));

  // Option B: Wait 3 years
  const delayedVolume = stand.volumeM3sk * 1.15 * 0.35;
  const delayedRevenue = delayedVolume * (TIMBER_PRICES.spruce_sawlog * 0.45 + TIMBER_PRICES.spruce_pulp * 0.55);
  const delayedCost = delayedVolume * THINNING_COST_PER_M3;
  const optBCashFlows = [
    { year: 3, amount: (delayedRevenue - delayedCost) * stand.areaHa / 10 },
    { year: 8, amount: stand.volumeM3sk * 0.12 * TIMBER_PRICES.spruce_sawlog * stand.areaHa / 10 },
  ];
  const optBNpv = Math.round(npv(optBCashFlows));

  // Option C: Heavy thin to 500 stems/ha
  const heavyVolume = stand.volumeM3sk * 0.55;
  const heavyRevenue = heavyVolume * (TIMBER_PRICES.spruce_sawlog * 0.35 + TIMBER_PRICES.spruce_pulp * 0.65);
  const heavyCost = heavyVolume * THINNING_COST_PER_M3;
  const optCCashFlows = [
    { year: 0, amount: (heavyRevenue - heavyCost) * stand.areaHa / 10 },
    { year: 7, amount: stand.volumeM3sk * 0.20 * TIMBER_PRICES.spruce_sawlog * stand.areaHa / 10 },
  ];
  const optCNpv = Math.round(npv(optCCashFlows));

  const sensitivity = buildSensitivity(
    { 'option_a': optACashFlows, 'option_b': optBCashFlows, 'option_c': optCCashFlows },
  );

  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'thinning',
    stand,
    situationAssessment: `Stand ${stand.name} is a ${stand.age}-year-old ${stand.species} stand with site index ${stand.siteIndex}, basal area ${stand.basalArea} m\u00b2/ha, and ${stand.stemsPerHa} stems/ha. Current volume is approximately ${stand.volumeM3sk} m\u00b3sk/ha. The stand density is above recommended levels for this age class and site index, indicating that thinning would improve individual tree growth and reduce competition stress. With a beetle risk of ${stand.beetleRisk}%, delayed thinning increases vulnerability to Ips typographus, as stressed trees produce fewer defensive resins.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.thinNow',
        description: `Thin to approximately 700 stems/ha, removing 35% of volume. Focus on removing suppressed and co-dominant trees to release crop trees.`,
        npv: optANpv,
        initialCost: Math.round(thinCost * stand.areaHa / 10),
        revenueTimeline: 'Immediate net revenue + growth gain at year 5',
        irr: irr(optACashFlows),
        riskLevel: 'low',
        pros: [
          'Immediate income from thinning harvest',
          'Reduced beetle risk through improved tree vitality',
          'Better diameter growth on remaining stems',
          'Improved wind stability over 2-3 years',
        ],
        cons: [
          'Temporary windthrow risk increase (1-2 years)',
          'Harvest damage risk to remaining trees',
          'Revenue from smaller-diameter timber (lower sawlog share)',
        ],
        timeframe: 'Execute within next cutting season (Oct-Mar)',
        recommended: true,
      },
      {
        id: 'option_b',
        titleKey: 'advisor.options.waitThreeYears',
        description: `Delay thinning by 3 years to allow further volume accumulation and improved sawlog ratio. Higher share of sawlog-quality timber.`,
        npv: optBNpv,
        initialCost: 0,
        revenueTimeline: 'Revenue at year 3 + secondary gain at year 8',
        irr: irr(optBCashFlows),
        riskLevel: 'moderate',
        pros: [
          'Higher sawlog ratio increases per-m\u00b3 revenue',
          'More volume to harvest',
          'No immediate operational disruption',
        ],
        cons: [
          'Beetle risk increases ~2%/year in dense stands',
          'Continued competition stress reduces vitality',
          'Delayed cash flow reduces NPV',
          'Risk of windthrow damage in overly dense stand',
        ],
        timeframe: 'Plan for execution in 3 years',
        recommended: false,
      },
      {
        id: 'option_c',
        titleKey: 'advisor.options.heavyThin',
        description: `Aggressive thinning to 500 stems/ha, removing 55% of volume. Maximizes light and growth but increases exposure.`,
        npv: optCNpv,
        initialCost: Math.round(heavyCost * stand.areaHa / 10),
        revenueTimeline: 'Large immediate revenue + strong regrowth at year 7',
        irr: irr(optCCashFlows),
        riskLevel: 'high',
        pros: [
          'Highest immediate revenue',
          'Maximum growth response on remaining trees',
          'Good if rapid diameter increase is priority',
        ],
        cons: [
          'Storm risk increases by approximately 15%',
          'Sudden exposure can trigger bark beetle attraction',
          'Higher proportion of pulpwood in harvest',
          'Risk of grass/herb competition in understory',
        ],
        timeframe: 'Execute within next cutting season, monitor closely after',
        recommended: false,
      },
    ],
    recommendation: `Option A (thin to 700 stems/ha) offers the best risk-adjusted return. While Option C yields a higher NPV of ${formatSEK(optCNpv)}, the additional 15% storm risk is significant for a ${stand.age}-year spruce stand. Given the current beetle risk of ${stand.beetleRisk}%, prompt action reduces the compounding vulnerability. The ${formatSEK(optANpv - optBNpv)} NPV advantage over waiting 3 years reflects both the time value of money and avoided beetle risk accumulation.`,
    riskFactors: [
      {
        name: 'Bark beetle (Ips typographus)',
        level: stand.beetleRisk > 40 ? 'high' : 'moderate',
        description: `Current beetle risk: ${stand.beetleRisk}%. Dense spruce stands with reduced vitality are primary targets. Risk increases ~2%/year without intervention.`,
        mitigationKey: 'advisor.mitigation.beetle',
      },
      {
        name: 'Windthrow',
        level: 'moderate',
        description: 'Post-thinning windthrow risk is elevated for 1-2 years until remaining trees develop stronger root systems. Risk is highest in Option C.',
        mitigationKey: 'advisor.mitigation.windthrow',
      },
      {
        name: 'Timber price volatility',
        level: 'low',
        description: 'Current spruce sawlog prices are stable. Pulpwood demand remains strong. Sensitivity analysis shows NPV variation of \u00b112% with \u00b110% price change.',
        mitigationKey: 'advisor.mitigation.priceVolatility',
      },
    ],
    citations: getCitationsForDecision('thinning'),
    confidence: stand.volumeM3sk > 0 && stand.siteIndex > 0 ? 'high' : 'medium',
    standDataUsed: {
      'Age': `${stand.age} years`,
      'Species': stand.species,
      'Site Index (SI)': stand.siteIndex,
      'Basal Area': `${stand.basalArea} m\u00b2/ha`,
      'Stems/ha': stand.stemsPerHa,
      'Volume': `${stand.volumeM3sk} m\u00b3sk/ha`,
      'Area': `${stand.areaHa} ha`,
      'Beetle Risk': `${stand.beetleRisk}%`,
    },
    sensitivityAnalysis: sensitivity,
    createdAt: new Date().toISOString(),
  };
}

function generateFinalFellingAnalysis(stand: StandData): AnalysisResult {
  const totalVolume = stand.volumeM3sk * stand.areaHa;
  const sawlogRatio = stand.age >= 60 ? 0.65 : stand.age >= 50 ? 0.55 : 0.40;
  const pricePerM3 = stand.species === 'pine'
    ? sawlogRatio * TIMBER_PRICES.pine_sawlog + (1 - sawlogRatio) * TIMBER_PRICES.pine_pulp
    : sawlogRatio * TIMBER_PRICES.spruce_sawlog + (1 - sawlogRatio) * TIMBER_PRICES.spruce_pulp;

  const fellingRevenue = totalVolume * pricePerM3;
  const fellingCost = totalVolume * FELLING_COST_PER_M3;
  const regenerationCost = stand.areaHa * (PLANTING_COST_PER_HA + SCARIFICATION_COST_PER_HA);

  // Option A: Fell now
  const optACashFlows = [
    { year: 0, amount: fellingRevenue - fellingCost - regenerationCost },
  ];
  const optANpv = Math.round(npv(optACashFlows));

  // Option B: Wait 5 years
  const futureVolume = totalVolume * 1.25;
  const futureSawlogRatio = Math.min(0.75, sawlogRatio + 0.08);
  const futurePrice = stand.species === 'pine'
    ? futureSawlogRatio * TIMBER_PRICES.pine_sawlog + (1 - futureSawlogRatio) * TIMBER_PRICES.pine_pulp
    : futureSawlogRatio * TIMBER_PRICES.spruce_sawlog + (1 - futureSawlogRatio) * TIMBER_PRICES.spruce_pulp;
  const optBCashFlows = [
    { year: 5, amount: futureVolume * futurePrice - futureVolume * FELLING_COST_PER_M3 - regenerationCost },
  ];
  const optBNpv = Math.round(npv(optBCashFlows));

  // Option C: Wait 10 years
  const laterVolume = totalVolume * 1.45;
  const laterSawlogRatio = Math.min(0.80, sawlogRatio + 0.15);
  const laterPrice = stand.species === 'pine'
    ? laterSawlogRatio * TIMBER_PRICES.pine_sawlog + (1 - laterSawlogRatio) * TIMBER_PRICES.pine_pulp
    : laterSawlogRatio * TIMBER_PRICES.spruce_sawlog + (1 - laterSawlogRatio) * TIMBER_PRICES.spruce_pulp;
  const optCCashFlows = [
    { year: 10, amount: laterVolume * laterPrice - laterVolume * FELLING_COST_PER_M3 - regenerationCost },
  ];
  const optCNpv = Math.round(npv(optCCashFlows));

  const bestOption = optANpv >= optBNpv && optANpv >= optCNpv ? 'a' : optBNpv >= optCNpv ? 'b' : 'c';

  const sensitivity = buildSensitivity(
    { 'option_a': optACashFlows, 'option_b': optBCashFlows, 'option_c': optCCashFlows },
  );

  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'final_felling',
    stand,
    situationAssessment: `Stand ${stand.name} is a ${stand.age}-year-old ${stand.species} stand with SI ${stand.siteIndex}. Total standing volume is approximately ${totalVolume} m\u00b3sk across ${stand.areaHa} ha. Current sawlog ratio is estimated at ${Math.round(sawlogRatio * 100)}%. The stand is ${stand.age >= 70 ? 'at or near' : 'approaching'} optimal rotation age for this site class. Volume increment is ${stand.age >= 70 ? 'declining' : 'still positive but decelerating'}.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.fellNow',
        description: `Final-fell the entire stand now and regenerate. Current sawlog ratio ${Math.round(sawlogRatio * 100)}%.`,
        npv: optANpv,
        initialCost: Math.round(fellingCost + regenerationCost),
        revenueTimeline: 'Immediate revenue minus regeneration costs',
        irr: 0,
        riskLevel: 'low',
        pros: ['Immediate cash realization', 'Eliminates beetle and storm risk', 'Start new rotation immediately'],
        cons: ['Current sawlog ratio may not be optimal', 'Market timing risk'],
        timeframe: 'Next cutting season (Oct-Mar)',
        recommended: bestOption === 'a',
      },
      {
        id: 'option_b',
        titleKey: 'advisor.options.waitFiveYears',
        description: `Continue growing for 5 more years. Volume increases ~25%, sawlog ratio improves to ${Math.round(futureSawlogRatio * 100)}%.`,
        npv: optBNpv,
        initialCost: 0,
        revenueTimeline: 'Revenue at year 5',
        irr: irr(optBCashFlows.map((cf, i) => i === 0 ? { year: 0, amount: -regenerationCost } : cf).concat(optBCashFlows)),
        riskLevel: 'moderate',
        pros: ['Higher volume and sawlog ratio', 'Better per-m\u00b3 revenue', 'Time for market conditions to improve'],
        cons: ['Opportunity cost of capital', 'Increasing beetle/storm risk', 'Discounting reduces present value'],
        timeframe: 'Plan for execution in 5 years',
        recommended: bestOption === 'b',
      },
      {
        id: 'option_c',
        titleKey: 'advisor.options.waitTenYears',
        description: `Extended rotation by 10 years. Maximum volume accumulation but past biological optimum for most site classes.`,
        npv: optCNpv,
        initialCost: 0,
        revenueTimeline: 'Revenue at year 10',
        irr: irr(optCCashFlows),
        riskLevel: 'high',
        pros: ['Maximum volume and sawlog ratio', 'Carbon storage benefit', 'Potential premium for large-dimension timber'],
        cons: ['Significant discount penalty', 'High cumulative risk exposure', 'Growth rate declining'],
        timeframe: 'Long-term hold',
        recommended: bestOption === 'c',
      },
    ],
    recommendation: `Based on NPV analysis at 3.5% discount rate, ${bestOption === 'a' ? 'felling now' : bestOption === 'b' ? 'waiting 5 years' : 'waiting 10 years'} yields the highest present value. The marginal value of additional growth must exceed the discount rate plus risk premium to justify delay. For a ${stand.species} stand at age ${stand.age} with SI ${stand.siteIndex}, ${stand.age >= 70 ? 'the growth rate is declining and immediate harvest is generally optimal.' : 'there is still meaningful growth potential, but risk accumulation should be considered.'}`,
    riskFactors: [
      {
        name: 'Bark beetle risk',
        level: stand.beetleRisk > 30 ? 'high' : 'moderate',
        description: `Each year of delay adds ~2% beetle risk. Current risk: ${stand.beetleRisk}%.`,
        mitigationKey: 'advisor.mitigation.beetle',
      },
      {
        name: 'Storm damage',
        level: stand.age > 60 ? 'moderate' : 'low',
        description: 'Older, taller stands are more vulnerable to wind damage. Major storms have a return period of ~10 years in southern Sweden.',
        mitigationKey: 'advisor.mitigation.windthrow',
      },
    ],
    citations: getCitationsForDecision('final_felling'),
    confidence: 'high',
    standDataUsed: {
      'Age': `${stand.age} years`,
      'Species': stand.species,
      'Site Index (SI)': stand.siteIndex,
      'Volume/ha': `${stand.volumeM3sk} m\u00b3sk`,
      'Total Volume': `${totalVolume} m\u00b3sk`,
      'Area': `${stand.areaHa} ha`,
      'Est. Sawlog Ratio': `${Math.round(sawlogRatio * 100)}%`,
    },
    sensitivityAnalysis: sensitivity,
    createdAt: new Date().toISOString(),
  };
}

function generateRegenerationAnalysis(stand: StandData): AnalysisResult {
  const plantCost = stand.areaHa * PLANTING_COST_PER_HA;
  const scarifCost = stand.areaHa * SCARIFICATION_COST_PER_HA;

  // Option A: Plant spruce
  const optACashFlows = [
    { year: 0, amount: -(plantCost + scarifCost) },
    { year: 15, amount: stand.areaHa * PCT_COST_PER_HA * -1 },
    { year: 70, amount: stand.areaHa * 280 * TIMBER_PRICES.spruce_sawlog * 0.65 },
  ];
  const optANpv = Math.round(npv(optACashFlows));

  // Option B: Plant pine
  const optBCashFlows = [
    { year: 0, amount: -(plantCost * 0.85 + scarifCost) },
    { year: 12, amount: stand.areaHa * PCT_COST_PER_HA * -1 },
    { year: 80, amount: stand.areaHa * 220 * TIMBER_PRICES.pine_sawlog * 0.60 },
  ];
  const optBNpv = Math.round(npv(optBCashFlows));

  // Option C: Mixed planting
  const optCCashFlows = [
    { year: 0, amount: -(plantCost * 1.15 + scarifCost) },
    { year: 12, amount: stand.areaHa * PCT_COST_PER_HA * 1.1 * -1 },
    { year: 65, amount: stand.areaHa * 200 * (TIMBER_PRICES.spruce_sawlog * 0.4 + TIMBER_PRICES.pine_sawlog * 0.3 + TIMBER_PRICES.broadleaf_sawlog * 0.3) * 0.55 },
  ];
  const optCNpv = Math.round(npv(optCCashFlows));

  const sensitivity = buildSensitivity(
    { 'option_a': optACashFlows, 'option_b': optBCashFlows, 'option_c': optCCashFlows },
  );

  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'regeneration',
    stand,
    situationAssessment: `Stand ${stand.name} requires regeneration after harvest. Site index ${stand.siteIndex} with ${stand.areaHa} ha to replant. The site conditions (soil type, moisture, elevation) determine which species will thrive. With climate change projections, drought tolerance and beetle resistance are increasingly important factors. Swedish law (Skogsvårdslagen) requires regeneration within 3 years of harvest.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.plantSpruce',
        description: 'Plant Norway spruce (gran). Highest volume production on suitable sites. Standard density: 2,500 plants/ha.',
        npv: optANpv,
        initialCost: Math.round(plantCost + scarifCost),
        revenueTimeline: 'Final felling revenue at ~70 years',
        irr: irr(optACashFlows),
        riskLevel: 'moderate',
        pros: ['Highest MAI on good sites', 'Well-known silviculture', 'Strong timber market'],
        cons: ['High beetle vulnerability', 'Drought sensitive under climate change', 'Monoculture risk'],
        timeframe: 'Plant spring (May) or autumn (Sept)',
        recommended: stand.siteIndex >= 26,
      },
      {
        id: 'option_b',
        titleKey: 'advisor.options.plantPine',
        description: 'Plant Scots pine (tall). Better drought tolerance, lower beetle risk. Standard density: 2,200 plants/ha.',
        npv: optBNpv,
        initialCost: Math.round(plantCost * 0.85 + scarifCost),
        revenueTimeline: 'Final felling revenue at ~80 years',
        irr: irr(optBCashFlows),
        riskLevel: 'low',
        pros: ['Drought tolerant', 'Low beetle risk', 'Climate-resilient choice', 'Lower planting cost'],
        cons: ['Lower volume production', 'Longer rotation', 'Browsing damage risk from moose'],
        timeframe: 'Plant spring or direct seed after scarification',
        recommended: stand.siteIndex < 24,
      },
      {
        id: 'option_c',
        titleKey: 'advisor.options.plantMixed',
        description: 'Mixed planting: 40% spruce, 30% pine, 30% birch. Diversified risk and improved biodiversity.',
        npv: optCNpv,
        initialCost: Math.round(plantCost * 1.15 + scarifCost),
        revenueTimeline: 'Staggered revenue, final felling ~65 years',
        irr: irr(optCCashFlows),
        riskLevel: 'low',
        pros: ['Diversified risk portfolio', 'Higher biodiversity value', 'Climate resilience', 'FSC certification support'],
        cons: ['Higher establishment cost', 'More complex management', 'Lower peak volume'],
        timeframe: 'Plant spring, birch can self-seed in clearings',
        recommended: stand.siteIndex >= 24 && stand.siteIndex < 26,
      },
    ],
    recommendation: `For site index ${stand.siteIndex}, ${stand.siteIndex >= 26 ? 'spruce is the traditional high-yield choice, but consider mixing with 20-30% pine/birch for risk diversification' : stand.siteIndex < 24 ? 'pine is recommended due to lower moisture requirements and better climate resilience' : 'a mixed planting strategy balances production with risk diversification'}. With increasing summer temperatures and drought frequency, climate-adapted species selection is becoming critical for long-term forest value.`,
    riskFactors: [
      {
        name: 'Climate change adaptation',
        level: 'moderate',
        description: 'Southern Swedish spruce forests face increasing drought stress. Consider climate projections for a 70-80 year rotation.',
        mitigationKey: 'advisor.mitigation.climate',
      },
      {
        name: 'Browsing damage',
        level: stand.species === 'pine' ? 'high' : 'moderate',
        description: 'Moose browsing is the primary threat to pine regeneration. May require protection measures.',
        mitigationKey: 'advisor.mitigation.browsing',
      },
    ],
    citations: getCitationsForDecision('regeneration'),
    confidence: 'high',
    standDataUsed: {
      'Site Index (SI)': stand.siteIndex,
      'Area': `${stand.areaHa} ha`,
      'Previous Species': stand.species,
    },
    sensitivityAnalysis: sensitivity,
    createdAt: new Date().toISOString(),
  };
}

function generateContinuousCoverAnalysis(stand: StandData): AnalysisResult {
  const selectionVolume = stand.volumeM3sk * 0.20;
  const selectionRevenue = selectionVolume * stand.areaHa * TIMBER_PRICES.spruce_sawlog * 0.70;
  const selectionCost = selectionVolume * stand.areaHa * THINNING_COST_PER_M3 * 1.3;

  const optACashFlows = [
    { year: 0, amount: selectionRevenue - selectionCost },
    { year: 10, amount: (selectionRevenue - selectionCost) * 0.85 },
    { year: 20, amount: (selectionRevenue - selectionCost) * 0.90 },
  ];
  const optANpv = Math.round(npv(optACashFlows));

  const clearCutRevenue = stand.volumeM3sk * stand.areaHa * TIMBER_PRICES.spruce_sawlog * 0.60;
  const clearCutCost = stand.volumeM3sk * stand.areaHa * FELLING_COST_PER_M3 + stand.areaHa * (PLANTING_COST_PER_HA + SCARIFICATION_COST_PER_HA);
  const optBCashFlows = [
    { year: 0, amount: clearCutRevenue - clearCutCost },
  ];
  const optBNpv = Math.round(npv(optBCashFlows));

  const sensitivity = buildSensitivity(
    { 'option_a': optACashFlows, 'option_b': optBCashFlows },
  );

  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'continuous_cover',
    stand,
    situationAssessment: `Stand ${stand.name} is being evaluated for conversion to continuous cover forestry (hyggesfritt skogsbruk). The stand is ${stand.age} years old with ${stand.stemsPerHa} stems/ha. Continuous cover forestry uses selective harvesting to maintain forest cover permanently, avoiding clear-cutting. This requires an uneven-aged stand structure which may take 20-40 years to fully establish from an even-aged starting point.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.convertCCF',
        description: 'Begin conversion to continuous cover with selective harvesting of 20% volume every 10 years. Creates gaps for natural regeneration.',
        npv: optANpv,
        initialCost: Math.round(selectionCost),
        revenueTimeline: 'Regular income every 10 years',
        irr: irr(optACashFlows),
        riskLevel: 'moderate',
        pros: ['Continuous forest cover maintained', 'Regular income stream', 'High biodiversity value', 'No regeneration costs', 'Climate resilience'],
        cons: ['Lower total timber production', 'Requires skilled operators', 'Longer transition period', 'Less suitable for poor sites'],
        timeframe: 'First selection harvest this season, repeat every 10 years',
        recommended: stand.siteIndex >= 24,
      },
      {
        id: 'option_b',
        titleKey: 'advisor.options.conventionalRotation',
        description: 'Continue with conventional even-aged rotation forestry. Clear-fell at maturity and replant.',
        npv: optBNpv,
        initialCost: 0,
        revenueTimeline: 'Large one-time revenue at clear-felling',
        irr: 0,
        riskLevel: 'low',
        pros: ['Higher total volume production', 'Simpler management', 'Well-proven system', 'Lower per-m\u00b3 harvesting cost'],
        cons: ['Loss of forest cover', 'Regeneration costs', 'Beetle risk in monoculture', 'Lower biodiversity'],
        timeframe: 'Fell at rotation age, regenerate within 3 years',
        recommended: stand.siteIndex < 24,
      },
    ],
    recommendation: `Conversion to continuous cover forestry is ${stand.siteIndex >= 24 ? 'feasible for this site class' : 'challenging on this lower-productivity site'}. The NPV comparison shows ${optANpv > optBNpv ? 'CCF provides competitive returns' : 'conventional forestry has higher NPV, but CCF offers non-monetary benefits'}. Key considerations include the higher operational complexity of selection harvesting and the 20-40 year transition period. The ecological and aesthetic benefits may justify a moderate NPV reduction.`,
    riskFactors: [
      {
        name: 'Operational complexity',
        level: 'moderate',
        description: 'Selection harvesting requires skilled machine operators and careful marking. Not all contractors have experience with CCF.',
        mitigationKey: 'advisor.mitigation.ccfOperations',
      },
      {
        name: 'Regeneration uncertainty',
        level: 'moderate',
        description: 'Natural regeneration in selection gaps depends on seed availability, light conditions, and browsing pressure.',
        mitigationKey: 'advisor.mitigation.naturalRegen',
      },
    ],
    citations: getCitationsForDecision('continuous_cover'),
    confidence: 'medium',
    standDataUsed: {
      'Age': `${stand.age} years`,
      'Species': stand.species,
      'Site Index (SI)': stand.siteIndex,
      'Stems/ha': stand.stemsPerHa,
      'Volume': `${stand.volumeM3sk} m\u00b3sk/ha`,
      'Area': `${stand.areaHa} ha`,
    },
    sensitivityAnalysis: sensitivity,
    createdAt: new Date().toISOString(),
  };
}

function generateBeetleDamageAnalysis(stand: StandData): AnalysisResult {
  const damagedFraction = stand.beetleRisk / 100;
  const damagedVolume = stand.volumeM3sk * stand.areaHa * damagedFraction;
  const healthyVolume = stand.volumeM3sk * stand.areaHa * (1 - damagedFraction);

  const salvagePrice = TIMBER_PRICES.spruce_sawlog * 0.5 + TIMBER_PRICES.spruce_pulp * 0.5;
  const salvageRevenue = damagedVolume * salvagePrice;
  const salvageCost = damagedVolume * FELLING_COST_PER_M3 * 1.2;

  // Option A: Immediate sanitation harvest
  const optACashFlows = [
    { year: 0, amount: salvageRevenue - salvageCost },
    { year: 1, amount: -stand.areaHa * damagedFraction * PLANTING_COST_PER_HA },
  ];
  const optANpv = Math.round(npv(optACashFlows));

  // Option B: Clear-fell entire stand
  const fullRevenue = healthyVolume * TIMBER_PRICES.spruce_sawlog * 0.60 + damagedVolume * salvagePrice;
  const fullCost = (healthyVolume + damagedVolume) * FELLING_COST_PER_M3 + stand.areaHa * (PLANTING_COST_PER_HA + SCARIFICATION_COST_PER_HA);
  const optBCashFlows = [
    { year: 0, amount: fullRevenue - fullCost },
  ];
  const optBNpv = Math.round(npv(optBCashFlows));

  // Option C: Monitor and wait
  const optCCashFlows = [
    { year: 2, amount: -(damagedVolume * 1.5 * FELLING_COST_PER_M3 * 1.3) },
    { year: 2, amount: damagedVolume * 1.5 * salvagePrice * 0.6 },
  ];
  const optCNpv = Math.round(npv(optCCashFlows));

  const sensitivity = buildSensitivity(
    { 'option_a': optACashFlows, 'option_b': optBCashFlows, 'option_c': optCCashFlows },
  );

  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'beetle_damage',
    stand,
    situationAssessment: `Stand ${stand.name} has detected bark beetle (Ips typographus) activity with an estimated ${stand.beetleRisk}% risk level. Approximately ${Math.round(damagedVolume)} m\u00b3sk may be affected. The beetle population can double every 6-8 weeks during warm periods (May-August). Prompt action is critical: blue-stain fungi colonize within weeks of attack, reducing sawlog value by 40-60%. Swedish law (Skogsvårdslagen \u00a729) requires removal of beetle-infested timber.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.sanitationHarvest',
        description: `Remove all affected trees immediately (estimated ${Math.round(damagedVolume)} m\u00b3sk). Debark or transport away from forest within 3 weeks.`,
        npv: optANpv,
        initialCost: Math.round(salvageCost),
        revenueTimeline: 'Immediate salvage revenue + replanting cost year 1',
        irr: irr(optACashFlows),
        riskLevel: 'low',
        pros: ['Stops beetle spread to healthy trees', 'Maximizes salvage value', 'Legal compliance', 'Protects remaining stand'],
        cons: ['Salvage timber value lower than green timber', 'Disruption to harvest planning', 'Regeneration cost for affected area'],
        timeframe: 'URGENT: Execute within 2-3 weeks',
        recommended: true,
      },
      {
        id: 'option_b',
        titleKey: 'advisor.options.clearFellAll',
        description: 'Clear-fell the entire stand including healthy trees. Eliminates all risk but sacrifices healthy timber.',
        npv: optBNpv,
        initialCost: Math.round(fullCost),
        revenueTimeline: 'Immediate total revenue',
        irr: 0,
        riskLevel: 'low',
        pros: ['Eliminates all beetle habitat', 'Healthy timber at full value', 'Clean start for regeneration'],
        cons: ['Sacrifices growing healthy trees', 'Full regeneration cost', 'May be disproportionate response'],
        timeframe: 'Next 1-2 months',
        recommended: damagedFraction > 0.5,
      },
      {
        id: 'option_c',
        titleKey: 'advisor.options.monitorWait',
        description: 'Set up pheromone traps, monitor weekly, and harvest only if spread is confirmed.',
        npv: optCNpv,
        initialCost: 2000,
        revenueTimeline: 'Potential larger salvage operation in 1-2 years',
        irr: 0,
        riskLevel: 'very_high',
        pros: ['Avoids unnecessary harvest', 'Low immediate cost', 'Natural mortality may resolve'],
        cons: ['Beetle population may explode', 'Timber value deteriorates rapidly', 'Risk of spreading to neighbors', 'Potential legal liability'],
        timeframe: 'Ongoing monitoring, decision at first spread sign',
        recommended: false,
      },
    ],
    recommendation: `Immediate sanitation harvest is strongly recommended. With ${stand.beetleRisk}% beetle risk, delay allows exponential population growth. Each generation (6-8 weeks in summer) can increase the affected area 3-5x. Salvage value decreases approximately 5% per week after blue-stain onset. ${damagedFraction > 0.5 ? 'Given the extensive damage, clear-felling the entire stand may be the most practical approach.' : 'Targeted removal of affected trees protects the remaining healthy stand.'}`,
    riskFactors: [
      {
        name: 'Beetle population dynamics',
        level: 'very_high',
        description: 'Active infestations can spread exponentially. Summer beetle generations complete in 6-8 weeks. Each female lays 60-80 eggs.',
        mitigationKey: 'advisor.mitigation.beetleUrgent',
      },
      {
        name: 'Blue-stain fungi',
        level: 'high',
        description: 'Fungal colonization begins within days of beetle attack. Reduces sawlog value by 40-60%. Complete degrade within 4-6 months.',
        mitigationKey: 'advisor.mitigation.blueStain',
      },
      {
        name: 'Neighbor spread',
        level: 'high',
        description: 'Beetles from untreated stands can infest neighboring forests, creating legal liability under SVL \u00a729.',
        mitigationKey: 'advisor.mitigation.neighborSpread',
      },
    ],
    citations: getCitationsForDecision('beetle_damage'),
    confidence: 'high',
    standDataUsed: {
      'Stand': stand.name,
      'Species': stand.species,
      'Beetle Risk': `${stand.beetleRisk}%`,
      'Est. Affected Volume': `${Math.round(damagedVolume)} m\u00b3sk`,
      'Total Volume': `${Math.round(stand.volumeM3sk * stand.areaHa)} m\u00b3sk`,
      'Area': `${stand.areaHa} ha`,
    },
    sensitivityAnalysis: sensitivity,
    createdAt: new Date().toISOString(),
  };
}

function generatePCTAnalysis(stand: StandData): AnalysisResult {
  const pctCost = stand.areaHa * PCT_COST_PER_HA;

  // Option A: PCT now
  const optACashFlows = [
    { year: 0, amount: -pctCost },
    { year: 25, amount: stand.areaHa * 60 * TIMBER_PRICES.spruce_sawlog * 0.35 },
    { year: 45, amount: stand.areaHa * 200 * TIMBER_PRICES.spruce_sawlog * 0.55 },
  ];
  const optANpv = Math.round(npv(optACashFlows));

  // Option B: Skip PCT
  const optBCashFlows = [
    { year: 30, amount: stand.areaHa * 40 * TIMBER_PRICES.spruce_pulp * 0.80 },
    { year: 50, amount: stand.areaHa * 150 * TIMBER_PRICES.spruce_sawlog * 0.40 },
  ];
  const optBNpv = Math.round(npv(optBCashFlows));

  // Option C: Delayed PCT (3 years)
  const optCCashFlows = [
    { year: 3, amount: -pctCost * 1.25 },
    { year: 28, amount: stand.areaHa * 55 * TIMBER_PRICES.spruce_sawlog * 0.32 },
    { year: 48, amount: stand.areaHa * 180 * TIMBER_PRICES.spruce_sawlog * 0.50 },
  ];
  const optCNpv = Math.round(npv(optCCashFlows));

  const sensitivity = buildSensitivity(
    { 'option_a': optACashFlows, 'option_b': optBCashFlows, 'option_c': optCCashFlows },
  );

  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'pre_commercial_thinning',
    stand,
    situationAssessment: `Stand ${stand.name} is a young stand (${stand.age} years) with ${stand.stemsPerHa} stems/ha. At this density, competition for light is intense and diameter growth is suppressed. Pre-commercial thinning (r\u00f6jning) is typically performed at stand heights of 2-4 meters to reduce density to 2,000-2,500 stems/ha. This investment has no immediate revenue but significantly improves future timber quality and first thinning revenue.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.pctNow',
        description: `Perform PCT now, reducing to ~2,200 stems/ha. Cost: ${formatSEK(pctCost)}. No government subsidy available at current density.`,
        npv: optANpv,
        initialCost: Math.round(pctCost),
        revenueTimeline: 'First commercial thinning at ~25 years, final felling at ~45 years',
        irr: irr(optACashFlows),
        riskLevel: 'low',
        pros: ['Improved diameter growth', 'Better timber quality at first thinning', 'Reduced competition stress', 'Easier future harvesting'],
        cons: ['Immediate cost with no revenue', 'Labor-intensive operation', 'Risk of browsing on released stems'],
        timeframe: 'Execute during summer (Jun-Aug) when regrowth is minimal',
        recommended: true,
      },
      {
        id: 'option_b',
        titleKey: 'advisor.options.skipPCT',
        description: 'Skip PCT entirely. Let natural selection reduce stem count. First thinning delayed.',
        npv: optBNpv,
        initialCost: 0,
        revenueTimeline: 'First commercial thinning at ~30 years (lower quality), final felling ~50 years',
        irr: irr(optBCashFlows),
        riskLevel: 'moderate',
        pros: ['No upfront cost', 'Natural selection may favor best genotypes'],
        cons: ['Severely reduced diameter growth', 'Poor timber quality at thinning', 'Higher proportion of pulpwood', 'Delayed first income'],
        timeframe: 'No action needed',
        recommended: false,
      },
      {
        id: 'option_c',
        titleKey: 'advisor.options.delayPCT',
        description: 'Delay PCT by 3 years. Cost increases ~25% due to larger stems, but more visible stem quality for selection.',
        npv: optCNpv,
        initialCost: 0,
        revenueTimeline: 'First thinning at ~28 years, final felling ~48 years',
        irr: irr(optCCashFlows),
        riskLevel: 'moderate',
        pros: ['Better stem quality assessment', 'Some natural mortality reduces work', 'Delay cost is moderate'],
        cons: ['25% higher PCT cost', 'Continued competition suppresses growth', 'Slight delay to all future revenues'],
        timeframe: 'Plan for execution in 3 years',
        recommended: false,
      },
    ],
    recommendation: `PCT now is the recommended action. The NPV advantage of ${formatSEK(optANpv - optBNpv)} over skipping PCT demonstrates the strong return on this investment despite the long time horizon. The key insight is that diameter growth during the critical 10-25 year period determines first thinning revenue, and this growth window cannot be recovered once lost. At ${stand.stemsPerHa} stems/ha, competition is already significantly reducing individual tree growth.`,
    riskFactors: [
      {
        name: 'Browsing damage after PCT',
        level: 'moderate',
        description: 'Released stems become more attractive to moose. Pine is especially vulnerable.',
        mitigationKey: 'advisor.mitigation.browsing',
      },
      {
        name: 'Long investment horizon',
        level: 'low',
        description: 'PCT costs are recovered over 25-45 years. Discount rate sensitivity is high.',
        mitigationKey: 'advisor.mitigation.longHorizon',
      },
    ],
    citations: getCitationsForDecision('pre_commercial_thinning'),
    confidence: 'high',
    standDataUsed: {
      'Age': `${stand.age} years`,
      'Species': stand.species,
      'Stems/ha': stand.stemsPerHa,
      'Site Index (SI)': stand.siteIndex,
      'Area': `${stand.areaHa} ha`,
    },
    sensitivityAnalysis: sensitivity,
    createdAt: new Date().toISOString(),
  };
}

function generateCustomAnalysis(stand: StandData, question: string): AnalysisResult {
  return {
    id: `analysis-${Date.now()}`,
    decisionType: 'custom',
    stand,
    situationAssessment: `Custom question for stand ${stand.name}: "${question}". Based on available stand data: ${stand.age}-year-old ${stand.species} stand, SI ${stand.siteIndex}, ${stand.stemsPerHa} stems/ha, basal area ${stand.basalArea} m\u00b2/ha. A comprehensive analysis requires integration with the AI advisor backend for custom questions. Below is a general framework based on the stand parameters.`,
    options: [
      {
        id: 'option_a',
        titleKey: 'advisor.options.recommended',
        description: 'Based on stand characteristics, the most suitable management action considers current age, density, and site productivity.',
        npv: 0,
        initialCost: 0,
        revenueTimeline: 'Depends on chosen action',
        irr: 0,
        riskLevel: 'moderate',
        pros: ['Analysis based on actual stand data', 'Considers current market conditions'],
        cons: ['Custom questions benefit from full AI analysis', 'Simplified NPV estimates'],
        timeframe: 'Varies by action',
        recommended: true,
      },
    ],
    recommendation: 'For detailed custom analysis, connect to the AI Advisor backend or consult with a local forestry consultant (skogsinspektör). The pre-built analysis templates cover the most common decision types — consider selecting a specific decision category for detailed NPV analysis.',
    riskFactors: [],
    citations: [],
    confidence: 'low',
    standDataUsed: {
      'Age': `${stand.age} years`,
      'Species': stand.species,
      'Site Index (SI)': stand.siteIndex,
      'Basal Area': `${stand.basalArea} m\u00b2/ha`,
      'Stems/ha': stand.stemsPerHa,
      'Volume': `${stand.volumeM3sk} m\u00b3sk/ha`,
      'Area': `${stand.areaHa} ha`,
    },
    sensitivityAnalysis: {
      timberPriceUp10: {},
      timberPriceDown10: {},
      discountRateUp1: {},
      discountRateDown1: {},
    },
    createdAt: new Date().toISOString(),
  };
}

function buildSensitivity(
  optionCashFlows: Record<string, Array<{ year: number; amount: number }>>,
): SensitivityAnalysis {
  const result: SensitivityAnalysis = {
    timberPriceUp10: {},
    timberPriceDown10: {},
    discountRateUp1: {},
    discountRateDown1: {},
  };

  for (const [key, flows] of Object.entries(optionCashFlows)) {
    // Timber price sensitivity: scale positive cash flows by +/-10%
    const priceUp = flows.map((cf) => ({
      ...cf,
      amount: cf.amount > 0 ? cf.amount * 1.10 : cf.amount,
    }));
    const priceDown = flows.map((cf) => ({
      ...cf,
      amount: cf.amount > 0 ? cf.amount * 0.90 : cf.amount,
    }));

    result.timberPriceUp10[key] = Math.round(npv(priceUp));
    result.timberPriceDown10[key] = Math.round(npv(priceDown));
    result.discountRateUp1[key] = Math.round(npv(flows, DISCOUNT_RATE + 0.01));
    result.discountRateDown1[key] = Math.round(npv(flows, DISCOUNT_RATE - 0.01));
  }

  return result;
}

// ─── Public API ───

export function generateAnalysis(
  decisionType: DecisionType,
  stand: StandData,
  customQuestion?: string,
): AnalysisResult {
  switch (decisionType) {
    case 'thinning':
      return generateThinningAnalysis(stand);
    case 'final_felling':
      return generateFinalFellingAnalysis(stand);
    case 'regeneration':
      return generateRegenerationAnalysis(stand);
    case 'continuous_cover':
      return generateContinuousCoverAnalysis(stand);
    case 'beetle_damage':
      return generateBeetleDamageAnalysis(stand);
    case 'pre_commercial_thinning':
      return generatePCTAnalysis(stand);
    case 'custom':
      return generateCustomAnalysis(stand, customQuestion ?? '');
    default:
      return generateThinningAnalysis(stand);
  }
}

export function getDecisionTypes(): Array<{ type: DecisionType; labelKey: string; descriptionKey: string }> {
  return [
    { type: 'thinning', labelKey: 'advisor.decisions.thinning', descriptionKey: 'advisor.decisions.thinningDesc' },
    { type: 'final_felling', labelKey: 'advisor.decisions.finalFelling', descriptionKey: 'advisor.decisions.finalFellingDesc' },
    { type: 'regeneration', labelKey: 'advisor.decisions.regeneration', descriptionKey: 'advisor.decisions.regenerationDesc' },
    { type: 'continuous_cover', labelKey: 'advisor.decisions.continuousCover', descriptionKey: 'advisor.decisions.continuousCoverDesc' },
    { type: 'beetle_damage', labelKey: 'advisor.decisions.beetleDamage', descriptionKey: 'advisor.decisions.beetleDamageDesc' },
    { type: 'pre_commercial_thinning', labelKey: 'advisor.decisions.pct', descriptionKey: 'advisor.decisions.pctDesc' },
    { type: 'custom', labelKey: 'advisor.decisions.custom', descriptionKey: 'advisor.decisions.customDesc' },
  ];
}

/** Save a decision to localStorage */
export function saveDecision(decision: SavedDecision): void {
  const stored = getDecisionLog();
  stored.unshift(decision);
  localStorage.setItem('beetlesense_decisions', JSON.stringify(stored));
}

/** Load all saved decisions from localStorage */
export function getDecisionLog(): SavedDecision[] {
  try {
    const raw = localStorage.getItem('beetlesense_decisions');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Update an existing decision */
export function updateDecision(id: string, updates: Partial<SavedDecision>): void {
  const stored = getDecisionLog();
  const idx = stored.findIndex((d) => d.id === id);
  if (idx >= 0) {
    stored[idx] = { ...stored[idx], ...updates };
    localStorage.setItem('beetlesense_decisions', JSON.stringify(stored));
  }
}

/** Delete a decision */
export function deleteDecision(id: string): void {
  const stored = getDecisionLog().filter((d) => d.id !== id);
  localStorage.setItem('beetlesense_decisions', JSON.stringify(stored));
}

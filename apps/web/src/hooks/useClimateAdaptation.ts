import { useState, useEffect, useMemo } from 'react';

// ─── Types ───

export type SuitabilityRating = 'excellent' | 'good' | 'marginal' | 'stressed' | 'unsuitable';
export type ClimateZone = 'boreal' | 'southern_boreal' | 'hemiboreal' | 'northern_nemoral' | 'nemoral';
export type SpeciesTrend = 'strongly_increasing' | 'increasing' | 'stable' | 'declining' | 'strongly_declining';
export type StrategyPreset = 'conservative' | 'balanced' | 'aggressive';
export type SortKey = 'current' | 'future2060' | 'economic' | 'risk';

export interface SuitabilityScore {
  rating: SuitabilityRating;
  score: number; // 0–100
  explanation: string;
}

export interface SpeciesProfile {
  id: string;
  nameSwedish: string;
  nameLatin: string;
  isNative: boolean;
  trend: SpeciesTrend;
  trendLabel: string;
  isCurrentDominant: boolean;
  isRecommended: boolean;
  climateWinner: boolean;
  climateLoser: boolean;
  suitability: Record<number, SuitabilityScore>; // keyed by year
  currentPerformance: string;
  tempRange: string;
  precipNeeds: string;
  soilPreference: string;
  growthProjection: string;
  timberValue: string;
  marketDemand: string;
  pestVulnerabilities: string;
  npv60yr: number; // SEK per hectare NPV over 60 years
  riskScore: number; // 0–100, lower is less risky
  regulatoryNote?: string;
}

export interface ClimateZoneData {
  year: number;
  zone: ClimateZone;
  zoneLabel: string;
  meanTemp: number;
  growingDegreeDays: number;
  annualPrecipMm: number;
  frostDays: number;
  analogueLocation: string;
}

export interface PlantingMix {
  speciesId: string;
  nameSwedish: string;
  percentage: number;
}

export interface PlantingStrategy {
  id: StrategyPreset;
  label: string;
  description: string;
  mix: PlantingMix[];
  climateResilienceScore: number; // 0–100
  expectedNpv: number; // SEK/ha
  timeline: string;
  economicNote: string;
}

export interface ClimateAdaptationData {
  species: SpeciesProfile[];
  climateZones: ClimateZoneData[];
  strategies: PlantingStrategy[];
  location: { lat: number; lng: number; name: string };
  timeHorizons: number[];
  isLoading: boolean;
  error: string | null;
  sortKey: SortKey;
  setSortKey: (key: SortKey) => void;
  selectedStrategy: StrategyPreset;
  setSelectedStrategy: (preset: StrategyPreset) => void;
  selectedSpecies: string | null;
  setSelectedSpecies: (id: string | null) => void;
}

// ─── Suitability helpers ───

function rating(score: number): SuitabilityRating {
  if (score >= 85) return 'excellent';
  if (score >= 65) return 'good';
  if (score >= 45) return 'marginal';
  if (score >= 25) return 'stressed';
  return 'unsuitable';
}

function s(score: number, explanation: string): SuitabilityScore {
  return { rating: rating(score), score, explanation };
}

// ─── Demo species data ───

const DEMO_SPECIES: SpeciesProfile[] = [
  {
    id: 'gran',
    nameSwedish: 'Gran',
    nameLatin: 'Picea abies',
    isNative: true,
    trend: 'declining',
    trendLabel: 'Vikande',
    isCurrentDominant: true,
    isRecommended: false,
    climateWinner: false,
    climateLoser: true,
    suitability: {
      2026: s(82, 'Fortfarande produktiv men ökande torka- och barkborrestress. Dominerande art i regionen.'),
      2040: s(62, 'Ökad torkstress sommartid. Granbarkborren (Ips typographus) gynnas av varmare klimat.'),
      2060: s(38, 'Allvarlig risk. Klimatzonen har passerat granens optimala intervall. Frekventare barkborreangrepp.'),
      2080: s(18, 'Olämplig för nyplantering. Hög risk för massmortalitet vid torrperioder. Klimatet liknar nuvarande Danmark.'),
    },
    currentPerformance: 'Hög produktion (10-12 m³sk/ha/år) men ökande skadeangrepp sedan 2018.',
    tempRange: '-2 till +6°C medelårstemperatur (optimalt)',
    precipNeeds: '600-900 mm/år',
    soilPreference: 'Fuktig, näringsrik morän eller lera',
    growthProjection: 'Tillväxten minskar med ~15% till 2060 pga. torkstress och ökad skaderisk.',
    timberValue: 'Sågtimmer 620 SEK/m³fub. Massaved 320 SEK/m³fub.',
    marketDemand: 'Hög efterfrågan men överutbud av skadat virke trycker priserna i Götaland.',
    pestVulnerabilities: 'Granbarkborre (Ips typographus), rotröta (Heterobasidion), honungsskivling.',
    npv60yr: 285000,
    riskScore: 78,
  },
  {
    id: 'tall',
    nameSwedish: 'Tall',
    nameLatin: 'Pinus sylvestris',
    isNative: true,
    trend: 'stable',
    trendLabel: 'Stabil',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: false,
    climateLoser: false,
    suitability: {
      2026: s(75, 'Bra anpassning till torra marker. Något lägre tillväxt än gran men torktåligare.'),
      2040: s(72, 'Stabil. Tallens breda klimatamplitud ger marginal. Torktolerant rotsystem.'),
      2060: s(64, 'Fortfarande fungerande men inte längre optimal i södra Småland. Konkurrens från lövträd.'),
      2080: s(52, 'Marginell. Klimatet gynnar löv- och sydeuropeiska arter mer. Tall klarar sig men underpresterar.'),
    },
    currentPerformance: 'Medelhög produktion (7-9 m³sk/ha/år). Torktålig men långsammare tillväxt.',
    tempRange: '-4 till +8°C medelårstemperatur (brett intervall)',
    precipNeeds: '400-700 mm/år',
    soilPreference: 'Sandig morän, torr mark, klarar mager jord',
    growthProjection: 'Relativt stabil tillväxt. Kan öka initialt med längre växtsäsong, men platåar.',
    timberValue: 'Sågtimmer 560 SEK/m³fub. Massaved 290 SEK/m³fub.',
    marketDemand: 'Stabil efterfrågan. Bra för snickeri och konstruktion.',
    pestVulnerabilities: 'Märgborre, tallskytte, törskatesvamp. Lägre risk än gran.',
    npv60yr: 245000,
    riskScore: 42,
  },
  {
    id: 'bjork',
    nameSwedish: 'Björk',
    nameLatin: 'Betula pendula / B. pubescens',
    isNative: true,
    trend: 'increasing',
    trendLabel: 'Ökande',
    isCurrentDominant: false,
    isRecommended: true,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(70, 'Snabbväxande pionjärart. Klarar varierade markförhållanden.'),
      2040: s(78, 'Gynnas av längre växtsäsong. Bra som amträd i blandskog.'),
      2060: s(82, 'Utmärkt anpassning. Hög biodiversitetsvärde. Stark naturlig föryngring.'),
      2080: s(78, 'Fortsatt bra men kan få konkurrens av sydligare lövträd som ek och bok.'),
    },
    currentPerformance: 'Snabb ungdomstillväxt (8-10 m³sk/ha/år). Kort omloppstid (50-60 år).',
    tempRange: '-2 till +8°C medelårstemperatur',
    precipNeeds: '500-800 mm/år',
    soilPreference: 'Anpassningsbar. Klarar både fuktig och torr mark.',
    growthProjection: 'Tillväxten ökar med varmare klimat. Kort rotation ger flexibilitet.',
    timberValue: 'Fanérbjörk 800-1200 SEK/m³fub. Massaved 260 SEK/m³fub.',
    marketDemand: 'Ökande. Björkfanér och björkplywood har stark exportmarknad.',
    pestVulnerabilities: 'Björkrost, älgbete (ungskog). Generellt låg skaderisk.',
    npv60yr: 230000,
    riskScore: 28,
  },
  {
    id: 'ek',
    nameSwedish: 'Ek',
    nameLatin: 'Quercus robur',
    isNative: true,
    trend: 'strongly_increasing',
    trendLabel: 'Starkt ökande',
    isCurrentDominant: false,
    isRecommended: true,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(55, 'Nära sin nordliga gräns vid Småland. Långsam etablering men värdefull.'),
      2040: s(72, 'Klimatzonen förskjuts norrut. Eken gynnas starkt av varmare vintrar.'),
      2060: s(88, 'Utmärkt. Klimatet i Värnamo liknar nuvarande Skåne. Ek blir huvudart.'),
      2080: s(92, 'Optimal. Lång livslängd gör ek till generationsinvestering. Högsta virkesvärde.'),
    },
    currentPerformance: 'Långsam tillväxt (4-6 m³sk/ha/år) men extremt högt virkesvärde.',
    tempRange: '+4 till +12°C medelårstemperatur',
    precipNeeds: '500-800 mm/år',
    soilPreference: 'Djup, näringsrik lera eller morän. Kräver bra dränering.',
    growthProjection: 'Tillväxten ökar markant till 2060. Kan nå 8 m³sk/ha/år i optimalt klimat.',
    timberValue: 'Eksågtimmer 2500-8000 SEK/m³fub. Extremt värdefullt.',
    marketDemand: 'Mycket hög. Internationell efterfrågan på ekvirke överstiger utbudet.',
    pestVulnerabilities: 'Ekdöd (Phytophthora), ekprocessionsspinnare (migrerande norrut). Generellt härdig.',
    npv60yr: 420000,
    riskScore: 35,
  },
  {
    id: 'bok',
    nameSwedish: 'Bok',
    nameLatin: 'Fagus sylvatica',
    isNative: true,
    trend: 'increasing',
    trendLabel: 'Ökande',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(35, 'Vid sin absoluta nordgräns i Småland. Kräver skyddade lägen.'),
      2040: s(55, 'Klimatförändringen möjliggör bokskog längre norrut. Fortfarande osäkert.'),
      2060: s(72, 'Bra förhållanden. Bok etablerar sig naturligt i regionen.'),
      2080: s(80, 'Utmärkt. Bokskog blir vanligt i landskapet, likt nuvarande Halland.'),
    },
    currentPerformance: 'Begränsad i regionen. Finns i skyddade sydsluttningar.',
    tempRange: '+5 till +12°C medelårstemperatur',
    precipNeeds: '600-900 mm/år',
    soilPreference: 'Djup, kalkrik, väldrånerad jord. Känslig för stående vatten.',
    growthProjection: 'Tillväxten ökar dramatiskt norrut 2040-2060 allt eftersom klimatzonen anpassas.',
    timberValue: 'Boksågtimmer 600-1500 SEK/m³fub. Bra för möbelvirke och brännved.',
    marketDemand: 'Stabil inhemsk efterfrågan. Begränsad exportmarknad.',
    pestVulnerabilities: 'Bokbarksjuka, torkstress vid extrema somrar. Relativt härdig i rätt klimat.',
    npv60yr: 310000,
    riskScore: 45,
  },
  {
    id: 'douglasgran',
    nameSwedish: 'Douglasgran',
    nameLatin: 'Pseudotsuga menziesii',
    isNative: false,
    trend: 'strongly_increasing',
    trendLabel: 'Stigande stjärna',
    isCurrentDominant: false,
    isRecommended: true,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(52, 'Redan planterad i försöksodlingar i Småland. Lovande men begränsad erfarenhet.'),
      2040: s(75, 'Gynnas starkt av varmare klimat. Överpresterar gran i tillväxt.'),
      2060: s(90, 'Utmärkt. Ersätter gran som barrträdsval. Hög produktion och bra timmer.'),
      2080: s(88, 'Fortsatt utmärkt. Etablerad som huvudart i svensk skogsbruk.'),
    },
    currentPerformance: 'Begränsade provytor visar 15-20% högre tillväxt än gran (12-15 m³sk/ha/år).',
    tempRange: '+3 till +12°C medelårstemperatur',
    precipNeeds: '500-800 mm/år',
    soilPreference: 'Djup, väldrånerad mark. Klarar varierade förhållanden.',
    growthProjection: 'Tillväxt 40% högre än gran vid denna latitud 2060-2080. Dramatisk ekonomisk fördel.',
    timberValue: 'Douglastimmer 700-900 SEK/m³fub. Premium på internationella marknaden.',
    marketDemand: 'Mycket hög internationellt. Begränsad inhemsk men växande snabbt.',
    pestVulnerabilities: 'Relativt resistent mot granbarkborre. Douglasgranens woolly adelgid kan vara framtida risk.',
    npv60yr: 480000,
    riskScore: 38,
    regulatoryNote: 'Kräver anmälan till Skogsstyrelsen vid plantering >0.5 ha (främmande trädslag).',
  },
  {
    id: 'hybridlark',
    nameSwedish: 'Hybridlärk',
    nameLatin: 'Larix × eurolepis',
    isNative: false,
    trend: 'increasing',
    trendLabel: 'Stigande',
    isCurrentDominant: false,
    isRecommended: true,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(60, 'Snabbväxande hybrid. Barkborresäker (inte värdträd). God timmerkvalitet.'),
      2040: s(75, 'Varmare klimat gynnar. Lövfällande = inga vinterskador vid isstormar.'),
      2060: s(82, 'Utmärkt val för barrvirke utan barkborrerisk. Kort omloppstid.'),
      2080: s(78, 'Fortsatt bra men ek/bok konkurrerar om de bästa markerna.'),
    },
    currentPerformance: 'Hög tillväxt (10-14 m³sk/ha/år). Kort rotation (40-50 år).',
    tempRange: '+2 till +10°C medelårstemperatur',
    precipNeeds: '500-700 mm/år',
    soilPreference: 'Djup, väldrånerad morän. Undviker blöt mark.',
    growthProjection: 'Stabil hög tillväxt. Kort rotation ger flexibilitet att byta strategi.',
    timberValue: 'Lärktimmer 650-800 SEK/m³fub. Naturligt hållbart (tralldäck, fasader).',
    marketDemand: 'Stark och växande. Lärkträ ersätter tryckimpregnerat virke.',
    pestVulnerabilities: 'Lärkkreftsvamp i fuktiga lägen. Generellt god resistens.',
    npv60yr: 380000,
    riskScore: 30,
    regulatoryNote: 'Hybridlärk klassas som främmande trädslag. Anmälan krävs >0.5 ha.',
  },
  {
    id: 'sitkagran',
    nameSwedish: 'Sitkagran',
    nameLatin: 'Picea sitchensis',
    isNative: false,
    trend: 'stable',
    trendLabel: 'Stabil',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: false,
    climateLoser: false,
    suitability: {
      2026: s(48, 'Snabbväxande men kräver kust- eller humidklimat. Inlandsläge = begränsad.'),
      2040: s(50, 'Varmare men potentiellt torrare somrar missgynnar. Kustnära lägen fungerar.'),
      2060: s(42, 'Torrare sommrar reducerar lämpligheten i inlandet. Bättre alternativ finns.'),
      2080: s(32, 'Stressad. Sommartorka och kontinentalt klimat passar inte artens behov.'),
    },
    currentPerformance: 'Mycket hög tillväxt där det fungerar (14-18 m³sk/ha/år). Begränsat i Värnamo-regionen.',
    tempRange: '+4 till +10°C medelårstemperatur',
    precipNeeds: '800-1500 mm/år (kräver hög nederbörd)',
    soilPreference: 'Fuktig mark, humidklimat. Tål vind bra.',
    growthProjection: 'Minskar i inlandet av Småland pga. otillräcklig nederbörd.',
    timberValue: 'Sitkatimmer 550-650 SEK/m³fub. Bra för byggvirke.',
    marketDemand: 'Medel. Stor i Irland/Skottland men begränsad i Sverige.',
    pestVulnerabilities: 'Granbarkborre (delvis värdträd), epirrita (fjärilslarv).',
    npv60yr: 200000,
    riskScore: 62,
    regulatoryNote: 'Främmande trädslag. Anmälan krävs. Diskussion om planterings förbud.',
  },
  {
    id: 'poppel',
    nameSwedish: 'Poppel',
    nameLatin: 'Populus spp.',
    isNative: false,
    trend: 'increasing',
    trendLabel: 'Ökande',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(45, 'Extremt snabb tillväxt på bra mark. Används för bioenergi och massaved.'),
      2040: s(62, 'Längre växtsäsong gynnar starkt. Kort rotation (20-25 år) ger flexibilitet.'),
      2060: s(70, 'Bra val för energiskog och kolbindning. Begränsat timmervärde.'),
      2080: s(68, 'Fortsatt bra men begränsat ekonomiskt värde jämfört med ek/douglas.'),
    },
    currentPerformance: 'Extremt hög tillväxt (15-25 m³sk/ha/år) på optimala marker.',
    tempRange: '+4 till +14°C medelårstemperatur',
    precipNeeds: '500-700 mm/år',
    soilPreference: 'Djup, fuktig, näringsrik lera. Kräver bra mark.',
    growthProjection: 'Mycket hög och ökande med varmare klimat. Kort rotation möjliggör snabb kolbindning.',
    timberValue: 'Massaved 220 SEK/m³fub. Begränsat sågvärde.',
    marketDemand: 'Ökande för bioenergi och massa. Begränsat premiumvärde.',
    pestVulnerabilities: 'Poppelrost, poppelbock. Vilt och vind.',
    npv60yr: 180000,
    riskScore: 48,
    regulatoryNote: 'Hybridpoppel kräver anmälan som främmande trädslag.',
  },
  {
    id: 'al',
    nameSwedish: 'Al',
    nameLatin: 'Alnus glutinosa / A. incana',
    isNative: true,
    trend: 'stable',
    trendLabel: 'Stabil',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: false,
    climateLoser: false,
    suitability: {
      2026: s(65, 'Kvävefixerare. Viktig i blötmarker och som jordförbättrare.'),
      2040: s(62, 'Stabil men begränsad av torra perioder. Behöver fuktig mark.'),
      2060: s(55, 'Torrare somrar kan påverka vattenförsörjningen. Bäst vid vattendrag.'),
      2080: s(48, 'Marginell på uppländsk mark. Kvarvarande i fuktiga dalgångar.'),
    },
    currentPerformance: 'Medelhög tillväxt (6-8 m³sk/ha/år). Viktig ekosystemtjänst via kvävefixering.',
    tempRange: '+2 till +10°C medelårstemperatur',
    precipNeeds: '500-800 mm/år (kräver marknära vatten)',
    soilPreference: 'Fuktig mark vid vattendrag. Tål dålig dränering.',
    growthProjection: 'Relativt stabil men förlorar habitat vid torrare klimat.',
    timberValue: 'Alvirke 200-350 SEK/m³fub. Nisch: rökt fisk, möbelsnickeri.',
    marketDemand: 'Begränsad men stabil nischmarknad.',
    pestVulnerabilities: 'Phytophthora alni (aldöd) — allvarligt hot. Äldre bestånd resistentare.',
    npv60yr: 140000,
    riskScore: 55,
  },
  {
    id: 'asp',
    nameSwedish: 'Asp',
    nameLatin: 'Populus tremula',
    isNative: true,
    trend: 'increasing',
    trendLabel: 'Ökande',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(58, 'Snabb pionjär. Viktig för biologisk mångfald. Rotskottsföryngring.'),
      2040: s(65, 'Gynnas av varmare klimat. Bra i blandskog och kantzoner.'),
      2060: s(70, 'Bra anpassning. Värdefull biodiversitetsart.'),
      2080: s(68, 'Fortsatt bra men konkurrens från ek och bok på bättre marker.'),
    },
    currentPerformance: 'Snabb tillväxt (8-12 m³sk/ha/år). Viktigt substrat för mångfald.',
    tempRange: '-2 till +10°C medelårstemperatur',
    precipNeeds: '400-700 mm/år',
    soilPreference: 'Brett spektrum. Undviker extremt torr eller blöt mark.',
    growthProjection: 'Ökar med varmare klimat. Pionjärart som kan fylla luckor.',
    timberValue: 'Asptimmer 250-400 SEK/m³fub. Tändstickor, bastu-panel.',
    marketDemand: 'Nischmarknad men stabil. Ökande som biodiversitetsart.',
    pestVulnerabilities: 'Aspticka, diverse svampar. Generellt motståndskraftig.',
    npv60yr: 165000,
    riskScore: 32,
  },
  {
    id: 'lind',
    nameSwedish: 'Lind',
    nameLatin: 'Tilia cordata',
    isNative: true,
    trend: 'increasing',
    trendLabel: 'Ökande',
    isCurrentDominant: false,
    isRecommended: false,
    climateWinner: true,
    climateLoser: false,
    suitability: {
      2026: s(40, 'Ädellövträd vid nordgräns. Skyddade lägen i Småland.'),
      2040: s(55, 'Klimatförändring gynnar. Lind vandrar norrut.'),
      2060: s(68, 'Bra i blandskog. Viktig för biodiversitet och pollinatörer.'),
      2080: s(75, 'Väletablerad i det nya klimatet. Hög mångfaldsvärde.'),
    },
    currentPerformance: 'Långsam tillväxt (3-5 m³sk/ha/år). Högt biodiversitetsvärde.',
    tempRange: '+4 till +12°C medelårstemperatur',
    precipNeeds: '500-700 mm/år',
    soilPreference: 'Näringsrik, kalkrik mark. God dränering.',
    growthProjection: 'Tillväxten ökar markant norrut med klimatförändringen.',
    timberValue: 'Lindträ 400-700 SEK/m³fub. Träsnideri, modellbygge.',
    marketDemand: 'Begränsad volym men nisch med högt värde.',
    pestVulnerabilities: 'Relativt frisk. Lindbladlus (kosmetisk). God motståndskraft.',
    npv60yr: 195000,
    riskScore: 38,
  },
];

// ─── Climate zone shift data ───

const DEMO_CLIMATE_ZONES: ClimateZoneData[] = [
  {
    year: 2026,
    zone: 'southern_boreal',
    zoneLabel: 'Södra boreal',
    meanTemp: 6.2,
    growingDegreeDays: 1350,
    annualPrecipMm: 720,
    frostDays: 105,
    analogueLocation: 'Värnamo idag',
  },
  {
    year: 2040,
    zone: 'hemiboreal',
    zoneLabel: 'Hemiboreal (övergångszon)',
    meanTemp: 7.4,
    growingDegreeDays: 1580,
    annualPrecipMm: 740,
    frostDays: 82,
    analogueLocation: 'Nuvarande Växjö/Kalmar',
  },
  {
    year: 2060,
    zone: 'northern_nemoral',
    zoneLabel: 'Nordlig nemoral',
    meanTemp: 8.6,
    growingDegreeDays: 1820,
    annualPrecipMm: 760,
    frostDays: 58,
    analogueLocation: 'Nuvarande Helsingborg/Halmstad',
  },
  {
    year: 2080,
    zone: 'nemoral',
    zoneLabel: 'Nemoral (tempererad)',
    meanTemp: 9.8,
    growingDegreeDays: 2050,
    annualPrecipMm: 770,
    frostDays: 38,
    analogueLocation: 'Nuvarande Köpenhamn / norra Tyskland',
  },
];

// ─── Planting strategies ───

const DEMO_STRATEGIES: PlantingStrategy[] = [
  {
    id: 'conservative',
    label: 'Konservativ',
    description: 'Behåll beprövade arter med mindre justering. Lägre risk men lägre framtidspotential.',
    mix: [
      { speciesId: 'tall', nameSwedish: 'Tall', percentage: 35 },
      { speciesId: 'bjork', nameSwedish: 'Björk', percentage: 25 },
      { speciesId: 'gran', nameSwedish: 'Gran', percentage: 20 },
      { speciesId: 'ek', nameSwedish: 'Ek', percentage: 15 },
      { speciesId: 'al', nameSwedish: 'Al', percentage: 5 },
    ],
    climateResilienceScore: 62,
    expectedNpv: 265000,
    timeline: 'Gran/Tall-plantering nu → gallring 2046 → slutavverkning 2076-2086',
    economicNote: 'Lägre avkastning men tryggare. Gran riskerar barkborreskador som sänker värdet.',
  },
  {
    id: 'balanced',
    label: 'Balanserad',
    description: 'Diversifierad portfölj med framtidsarter. Riskspridning med god ekonomisk potential.',
    mix: [
      { speciesId: 'ek', nameSwedish: 'Ek', percentage: 25 },
      { speciesId: 'douglasgran', nameSwedish: 'Douglasgran', percentage: 20 },
      { speciesId: 'bjork', nameSwedish: 'Björk', percentage: 20 },
      { speciesId: 'hybridlark', nameSwedish: 'Hybridlärk', percentage: 15 },
      { speciesId: 'tall', nameSwedish: 'Tall', percentage: 10 },
      { speciesId: 'bok', nameSwedish: 'Bok', percentage: 10 },
    ],
    climateResilienceScore: 82,
    expectedNpv: 365000,
    timeline: 'Björk/Lärk snabbväxande → gallring 2042 → Ek/Douglas slutavverkning 2076-2096',
    economicNote: 'Douglasgran ger 40% mer än gran vid denna latitud 2070. Ek ger högsta virkesvärdet.',
  },
  {
    id: 'aggressive',
    label: 'Offensiv anpassning',
    description: 'Satsa stort på klimatvinnare. Högst potential men kräver tillstånd för främmande arter.',
    mix: [
      { speciesId: 'douglasgran', nameSwedish: 'Douglasgran', percentage: 35 },
      { speciesId: 'ek', nameSwedish: 'Ek', percentage: 30 },
      { speciesId: 'hybridlark', nameSwedish: 'Hybridlärk', percentage: 15 },
      { speciesId: 'bok', nameSwedish: 'Bok', percentage: 10 },
      { speciesId: 'bjork', nameSwedish: 'Björk', percentage: 10 },
    ],
    climateResilienceScore: 88,
    expectedNpv: 440000,
    timeline: 'Lärk/Björk först → gallring 2040 → Douglas 2070 → Ek premium 2080+',
    economicNote: 'Högst förväntad avkastning. Kräver anmälan till Skogsstyrelsen för Douglasgran >0.5 ha.',
  },
];

// ─── Hook ───

export function useClimateAdaptation(): ClimateAdaptationData {
  const [isLoading, setIsLoading] = useState(true);
  const [error, _setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('future2060');
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyPreset>('balanced');
  const [selectedSpecies, setSelectedSpecies] = useState<string | null>(null);

  useEffect(() => {
    // Simulate loading for demo
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const sortedSpecies = useMemo(() => {
    const sorted = [...DEMO_SPECIES];
    switch (sortKey) {
      case 'current':
        sorted.sort((a, b) => b.suitability[2026].score - a.suitability[2026].score);
        break;
      case 'future2060':
        sorted.sort((a, b) => b.suitability[2060].score - a.suitability[2060].score);
        break;
      case 'economic':
        sorted.sort((a, b) => b.npv60yr - a.npv60yr);
        break;
      case 'risk':
        sorted.sort((a, b) => a.riskScore - b.riskScore);
        break;
    }
    return sorted;
  }, [sortKey]);

  return {
    species: sortedSpecies,
    climateZones: DEMO_CLIMATE_ZONES,
    strategies: DEMO_STRATEGIES,
    location: { lat: 57.18, lng: 14.04, name: 'Värnamo, Småland' },
    timeHorizons: [2026, 2040, 2060, 2080],
    isLoading,
    error,
    sortKey,
    setSortKey,
    selectedStrategy,
    setSelectedStrategy,
    selectedSpecies,
    setSelectedSpecies,
  };
}

/**
 * useBiodiversity — Hook for biodiversity credits marketplace.
 *
 * Provides per-parcel biodiversity scoring, species inventory,
 * credit generation, buyer board, and improvement actions.
 * All data is demo-driven for now; will connect to Supabase later.
 */

import { useMemo, useState } from 'react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ─── Types ───

export type ConservationStatus = 'LC' | 'NT' | 'VU' | 'EN' | 'CR';
export type DetectionMethod = 'satellite' | 'drone' | 'community' | 'field';
export type SpeciesGroup = 'Träd' | 'Fåglar' | 'Däggdjur' | 'Insekter' | 'Svampar' | 'Växter';

export interface Species {
  id: string;
  nameSv: string;
  nameLatin: string;
  group: SpeciesGroup;
  conservationStatus: ConservationStatus;
  detectionMethod: DetectionMethod;
  lastObserved: string;
  parcelIds: string[];
  isRedListed: boolean;
  oldGrowthIndicator: boolean;
}

export interface BiodiversitySector {
  id: string;
  nameSv: string;
  nameEn: string;
  score: number;
  maxScore: number;
  trend: 'up' | 'down' | 'stable';
  improvementPotential: number;
  tip: string;
}

export interface ParcelBiodiversity {
  parcelId: string;
  parcelName: string;
  areaHa: number;
  totalScore: number;
  sectors: BiodiversitySector[];
  creditsPerYear: number;
  speciesCount: number;
  rarityIndex: number;
}

export interface BiodiversityProgram {
  id: string;
  name: string;
  nameSv: string;
  description: string;
  status: 'active' | 'eligible' | 'coming_soon';
  priceRange: { min: number; max: number };
  requirements: string[];
}

export interface BiodiversityBuyer {
  id: string;
  name: string;
  industry: string;
  reason: string;
  creditsNeeded: number;
  pricePerUnit: number;
  verified: boolean;
  urgency: 'high' | 'medium' | 'low';
}

export interface CreditListing {
  id: string;
  parcelName: string;
  units: number;
  pricePerUnit: number;
  status: 'active' | 'sold' | 'pending';
  listedDate: string;
  buyer?: string;
  verificationMethod: string;
}

export interface CreditTransaction {
  id: string;
  date: string;
  type: 'sale' | 'generation' | 'verification' | 'listing';
  parcelName: string;
  units: number;
  priceSEK: number;
  totalSEK: number;
  buyer?: string;
  status: 'completed' | 'pending' | 'processing';
}

export interface ImprovementAction {
  id: string;
  nameSv: string;
  nameEn: string;
  description: string;
  costSEK: number;
  timeMonths: number;
  scoreImpact: number;
  creditImpact: number;
  annualRevenueSEK: number;
  roi: number;
  parcelIds: string[];
  category: 'deadwood' | 'retention' | 'wetland' | 'nesting' | 'edge' | 'other';
  naturvardsavtalEligible: boolean;
}

// ─── Demo species data ───

const DEMO_SPECIES: Species[] = [
  // Träd
  { id: 'sp1', nameSv: 'Gran', nameLatin: 'Picea abies', group: 'Träd', conservationStatus: 'LC', detectionMethod: 'satellite', lastObserved: '2026-03-15', parcelIds: ['p1', 'p2', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp2', nameSv: 'Tall', nameLatin: 'Pinus sylvestris', group: 'Träd', conservationStatus: 'LC', detectionMethod: 'satellite', lastObserved: '2026-03-15', parcelIds: ['p1', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp3', nameSv: 'Björk', nameLatin: 'Betula pendula', group: 'Träd', conservationStatus: 'LC', detectionMethod: 'satellite', lastObserved: '2026-03-15', parcelIds: ['p1', 'p2', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp4', nameSv: 'Ek', nameLatin: 'Quercus robur', group: 'Träd', conservationStatus: 'LC', detectionMethod: 'satellite', lastObserved: '2026-03-12', parcelIds: ['p2'], isRedListed: false, oldGrowthIndicator: true },
  { id: 'sp5', nameSv: 'Asp', nameLatin: 'Populus tremula', group: 'Träd', conservationStatus: 'LC', detectionMethod: 'drone', lastObserved: '2026-03-10', parcelIds: ['p1', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  // Fåglar
  { id: 'sp6', nameSv: 'Tretåig hackspett', nameLatin: 'Picoides tridactylus', group: 'Fåglar', conservationStatus: 'NT', detectionMethod: 'field', lastObserved: '2026-02-28', parcelIds: ['p1'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp7', nameSv: 'Lavskrika', nameLatin: 'Perisoreus infaustus', group: 'Fåglar', conservationStatus: 'NT', detectionMethod: 'community', lastObserved: '2026-03-05', parcelIds: ['p3'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp8', nameSv: 'Vitryggig hackspett', nameLatin: 'Dendrocopos leucotos', group: 'Fåglar', conservationStatus: 'EN', detectionMethod: 'field', lastObserved: '2026-01-15', parcelIds: ['p2'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp9', nameSv: 'Tjäder', nameLatin: 'Tetrao urogallus', group: 'Fåglar', conservationStatus: 'NT', detectionMethod: 'community', lastObserved: '2026-03-10', parcelIds: ['p1', 'p3'], isRedListed: true, oldGrowthIndicator: false },
  { id: 'sp10', nameSv: 'Järpe', nameLatin: 'Tetrastes bonasia', group: 'Fåglar', conservationStatus: 'LC', detectionMethod: 'community', lastObserved: '2026-02-20', parcelIds: ['p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp11', nameSv: 'Spillkråka', nameLatin: 'Dryocopus martius', group: 'Fåglar', conservationStatus: 'LC', detectionMethod: 'drone', lastObserved: '2026-03-08', parcelIds: ['p1', 'p2'], isRedListed: false, oldGrowthIndicator: false },
  // Däggdjur
  { id: 'sp12', nameSv: 'Flygekorre', nameLatin: 'Pteromys volans', group: 'Däggdjur', conservationStatus: 'VU', detectionMethod: 'field', lastObserved: '2025-11-20', parcelIds: ['p3'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp13', nameSv: 'Älg', nameLatin: 'Alces alces', group: 'Däggdjur', conservationStatus: 'LC', detectionMethod: 'drone', lastObserved: '2026-03-14', parcelIds: ['p1', 'p2', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp14', nameSv: 'Ekorre', nameLatin: 'Sciurus vulgaris', group: 'Däggdjur', conservationStatus: 'LC', detectionMethod: 'community', lastObserved: '2026-03-12', parcelIds: ['p1', 'p2', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp15', nameSv: 'Grävling', nameLatin: 'Meles meles', group: 'Däggdjur', conservationStatus: 'LC', detectionMethod: 'field', lastObserved: '2026-02-15', parcelIds: ['p2'], isRedListed: false, oldGrowthIndicator: false },
  // Insekter
  { id: 'sp16', nameSv: 'Raggbock', nameLatin: 'Tragosoma depsarium', group: 'Insekter', conservationStatus: 'NT', detectionMethod: 'field', lastObserved: '2025-08-15', parcelIds: ['p1'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp17', nameSv: 'Skogsknäppare', nameLatin: 'Athous subfuscus', group: 'Insekter', conservationStatus: 'LC', detectionMethod: 'field', lastObserved: '2025-07-20', parcelIds: ['p1', 'p2', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp18', nameSv: 'Skalbagge (läderbagge)', nameLatin: 'Osmoderma eremita', group: 'Insekter', conservationStatus: 'EN', detectionMethod: 'field', lastObserved: '2025-06-10', parcelIds: ['p2'], isRedListed: true, oldGrowthIndicator: true },
  // Svampar
  { id: 'sp19', nameSv: 'Tallticka', nameLatin: 'Phellinus pini', group: 'Svampar', conservationStatus: 'NT', detectionMethod: 'field', lastObserved: '2026-01-10', parcelIds: ['p3'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp20', nameSv: 'Kantarell', nameLatin: 'Cantharellus cibarius', group: 'Svampar', conservationStatus: 'LC', detectionMethod: 'community', lastObserved: '2025-09-15', parcelIds: ['p1', 'p2', 'p3'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp21', nameSv: 'Doftskinn', nameLatin: 'Cystostereum murrayi', group: 'Svampar', conservationStatus: 'NT', detectionMethod: 'field', lastObserved: '2025-10-05', parcelIds: ['p1'], isRedListed: true, oldGrowthIndicator: true },
  // Växter
  { id: 'sp22', nameSv: 'Blåsippa', nameLatin: 'Hepatica nobilis', group: 'Växter', conservationStatus: 'LC', detectionMethod: 'community', lastObserved: '2026-03-10', parcelIds: ['p2'], isRedListed: false, oldGrowthIndicator: false },
  { id: 'sp23', nameSv: 'Orkidé (knärot)', nameLatin: 'Goodyera repens', group: 'Växter', conservationStatus: 'LC', detectionMethod: 'field', lastObserved: '2025-07-25', parcelIds: ['p3'], isRedListed: false, oldGrowthIndicator: true },
  { id: 'sp24', nameSv: 'Lunglav', nameLatin: 'Lobaria pulmonaria', group: 'Växter', conservationStatus: 'NT', detectionMethod: 'field', lastObserved: '2026-01-20', parcelIds: ['p1', 'p2'], isRedListed: true, oldGrowthIndicator: true },
  { id: 'sp25', nameSv: 'Tibast', nameLatin: 'Daphne mezereum', group: 'Växter', conservationStatus: 'LC', detectionMethod: 'community', lastObserved: '2026-03-01', parcelIds: ['p2'], isRedListed: false, oldGrowthIndicator: false },
];

// ─── Demo parcel biodiversity data ───

function buildParcelBiodiversity(parcel: DemoParcel): ParcelBiodiversity {
  const scores: Record<string, { total: number; sectors: BiodiversitySector[] }> = {
    p1: {
      total: 72,
      sectors: [
        { id: 'species', nameSv: 'Artrikedom', nameEn: 'Species richness', score: 14, maxScore: 20, trend: 'up', improvementPotential: 6, tip: 'Plantera fler lövträd (björk, asp, rönn) i luckor för att öka artrikedomen.' },
        { id: 'structure', nameSv: 'Strukturell diversitet', nameEn: 'Structural diversity', score: 12, maxScore: 20, trend: 'stable', improvementPotential: 8, tip: 'Skapa luckor i beståndet och lämna överståndare vid avverkning.' },
        { id: 'deadwood', nameSv: 'Död ved', nameEn: 'Deadwood', score: 10, maxScore: 15, trend: 'up', improvementPotential: 5, tip: 'Lämna minst 5 högstubbar och 10 lågor per hektar.' },
        { id: 'oldgrowth', nameSv: 'Gammelskogsindikator', nameEn: 'Old-growth indicators', score: 13, maxScore: 20, trend: 'stable', improvementPotential: 7, tip: 'Förläng omloppstiden med 20-30 år för att utveckla gammelskogskaraktär.' },
        { id: 'redlisted', nameSv: 'Rödlistade arter', nameEn: 'Red-listed species', score: 14, maxScore: 15, trend: 'up', improvementPotential: 1, tip: 'Bevara befintliga biotopträd och skydda häckningsplatser.' },
        { id: 'water', nameSv: 'Vattenmiljöer', nameEn: 'Water features', score: 9, maxScore: 10, trend: 'stable', improvementPotential: 1, tip: 'Utöka kantzoner kring bäckar till minst 15 meter.' },
      ],
    },
    p2: {
      total: 81,
      sectors: [
        { id: 'species', nameSv: 'Artrikedom', nameEn: 'Species richness', score: 18, maxScore: 20, trend: 'up', improvementPotential: 2, tip: 'Ek-björkblandskog har naturligt hög artrikedom. Bevara detta.' },
        { id: 'structure', nameSv: 'Strukturell diversitet', nameEn: 'Structural diversity', score: 15, maxScore: 20, trend: 'up', improvementPotential: 5, tip: 'Lämna överståndare och variation i trädåldrar.' },
        { id: 'deadwood', nameSv: 'Död ved', nameEn: 'Deadwood', score: 11, maxScore: 15, trend: 'stable', improvementPotential: 4, tip: 'Ringbarka 2-3 ekar per hektar för att skapa framtida grov död ved.' },
        { id: 'oldgrowth', nameSv: 'Gammelskogsindikator', nameEn: 'Old-growth indicators', score: 16, maxScore: 20, trend: 'up', improvementPotential: 4, tip: 'Ekarna visar gammelskogskvaliteter. Prioritera naturvård.' },
        { id: 'redlisted', nameSv: 'Rödlistade arter', nameEn: 'Red-listed species', score: 13, maxScore: 15, trend: 'stable', improvementPotential: 2, tip: 'Vitryggig hackspett kräver lövrikt skogslandskap med gott om döda lövträd.' },
        { id: 'water', nameSv: 'Vattenmiljöer', nameEn: 'Water features', score: 8, maxScore: 10, trend: 'stable', improvementPotential: 2, tip: 'Restaurera dikat våtmarksområde i södra delen.' },
      ],
    },
    p3: {
      total: 65,
      sectors: [
        { id: 'species', nameSv: 'Artrikedom', nameEn: 'Species richness', score: 10, maxScore: 20, trend: 'stable', improvementPotential: 10, tip: 'Tallskog är artfattig — underplantera med björk och rönn.' },
        { id: 'structure', nameSv: 'Strukturell diversitet', nameEn: 'Structural diversity', score: 11, maxScore: 20, trend: 'stable', improvementPotential: 9, tip: 'Lämna fröträdställning istället för kalavverkning.' },
        { id: 'deadwood', nameSv: 'Död ved', nameEn: 'Deadwood', score: 8, maxScore: 15, trend: 'down', improvementPotential: 7, tip: 'Skapa högstubbar vid nästa gallring — tallved bryts ner långsamt och gynnar specialister.' },
        { id: 'oldgrowth', nameSv: 'Gammelskogsindikator', nameEn: 'Old-growth indicators', score: 12, maxScore: 20, trend: 'stable', improvementPotential: 8, tip: 'Tallar kan bli 300+ år — lämna de äldsta som evighetsträd.' },
        { id: 'redlisted', nameSv: 'Rödlistade arter', nameEn: 'Red-listed species', score: 15, maxScore: 15, trend: 'up', improvementPotential: 0, tip: 'Flygekorre och tallticka bekräftade — skydda asp- och tallbestånd.' },
        { id: 'water', nameSv: 'Vattenmiljöer', nameEn: 'Water features', score: 9, maxScore: 10, trend: 'stable', improvementPotential: 1, tip: 'Myren i norr bör inkluderas i naturvårdsareal.' },
      ],
    },
  };

  const parcelSpecies = DEMO_SPECIES.filter(s => s.parcelIds.includes(parcel.id));
  const redListCount = parcelSpecies.filter(s => s.isRedListed).length;
  const data = scores[parcel.id] || scores['p1'];

  // Credits: higher score = more credits per ha. Base: 0.25 credits/ha/year at score 50, scaling up
  const creditFactor = (data.total / 100) * 0.5;
  const creditsPerYear = Math.round(parcel.area_hectares * creditFactor * 10) / 10;

  return {
    parcelId: parcel.id,
    parcelName: parcel.name,
    areaHa: parcel.area_hectares,
    totalScore: data.total,
    sectors: data.sectors,
    creditsPerYear,
    speciesCount: parcelSpecies.length,
    rarityIndex: parcelSpecies.length > 0 ? Math.round((redListCount / parcelSpecies.length) * 100) : 0,
  };
}

// ─── Programs ───

const PROGRAMS: BiodiversityProgram[] = [
  {
    id: 'eu-nature-restoration',
    name: 'EU Nature Restoration Law',
    nameSv: 'EU:s lag om naturrestaurering',
    description: 'Article 10 requires member states to restore degraded ecosystems by 2030. Forest owners with verified biodiversity improvements qualify for credits tradable within the EU framework.',
    status: 'active',
    priceRange: { min: 400, max: 800 },
    requirements: ['Verified biodiversity baseline assessment', 'Minimum 3-year monitoring commitment', 'Annual third-party audit', 'Registered in national biodiversity registry'],
  },
  {
    id: 'corporate-offsets',
    name: 'Corporate Biodiversity Offsets',
    nameSv: 'Företagens biodiversitetskompensation',
    description: 'Companies with nature-negative activities must offset impacts under the CSRD. Your forest can provide verified offsets. Growing demand from construction, mining, and infrastructure.',
    status: 'active',
    priceRange: { min: 300, max: 600 },
    requirements: ['Biodiversity score above 60', 'Minimum 10 ha contiguous habitat', 'Species inventory completed', 'No active logging permits on offset area'],
  },
  {
    id: 'naturvardsstod',
    name: 'Naturvårdsstöd (Skogsstyrelsen)',
    nameSv: 'Naturvårdsstöd',
    description: 'Swedish Forest Agency grants for voluntary nature conservation measures. Covers up to 70% of costs for habitat restoration and set-aside agreements.',
    status: 'eligible',
    priceRange: { min: 200, max: 500 },
    requirements: ['Identified nature values (nyckelbiotop or nature value)', 'Willing to sign 50-year set-aside agreement', 'Forest management plan submitted', 'Located in priority biodiversity area'],
  },
  {
    id: 'lona',
    name: 'LONA-bidrag',
    nameSv: 'Lokala naturvårdssatsningen (LONA)',
    description: 'Municipal grants for local nature conservation projects. Up to 50% co-financing for biodiversity enhancement, species monitoring, and public awareness initiatives.',
    status: 'eligible',
    priceRange: { min: 200, max: 400 },
    requirements: ['Project proposal submitted to kommun', 'Community engagement component', 'Measurable biodiversity outcomes', 'Co-financing from landowner (50%)'],
  },
];

// ─── Buyers ───

const DEMO_BUYERS: BiodiversityBuyer[] = [
  { id: 'b1', name: 'Skanska Sverige AB', industry: 'Bygg & infrastruktur', reason: 'CSRD-kompensation för vägbygge E4 Jönköping', creditsNeeded: 120, pricePerUnit: 650, verified: true, urgency: 'high' },
  { id: 'b2', name: 'LKAB', industry: 'Gruvindustri', reason: 'Biodiversitetskompensation Kiruna stadsomvandling', creditsNeeded: 500, pricePerUnit: 750, verified: true, urgency: 'high' },
  { id: 'b3', name: 'Vattenfall AB', industry: 'Energi', reason: 'Vindkraftspark kompensation Småland', creditsNeeded: 80, pricePerUnit: 550, verified: true, urgency: 'medium' },
  { id: 'b4', name: 'Trafikverket', industry: 'Infrastruktur', reason: 'Kompensationsåtgärder järnvägsprojekt', creditsNeeded: 200, pricePerUnit: 600, verified: true, urgency: 'medium' },
  { id: 'b5', name: 'Holmen Skog AB', industry: 'Skogsbruk', reason: 'FSC-kompensation avverkningsplan', creditsNeeded: 45, pricePerUnit: 400, verified: true, urgency: 'low' },
  { id: 'b6', name: 'Peab AB', industry: 'Bygg', reason: 'Bostadsprojekt biodiversitetsmål', creditsNeeded: 60, pricePerUnit: 500, verified: false, urgency: 'medium' },
];

// ─── Demo transactions ───

const DEMO_TRANSACTIONS: CreditTransaction[] = [
  { id: 't1', date: '2026-03-15', type: 'generation', parcelName: 'Norra Skogen', units: 15.3, priceSEK: 0, totalSEK: 0, status: 'completed' },
  { id: 't2', date: '2026-03-14', type: 'verification', parcelName: 'Ekbacken', units: 7.4, priceSEK: 0, totalSEK: 0, status: 'completed' },
  { id: 't3', date: '2026-03-10', type: 'listing', parcelName: 'Norra Skogen', units: 10, priceSEK: 600, totalSEK: 6000, status: 'completed' },
  { id: 't4', date: '2026-03-08', type: 'sale', parcelName: 'Norra Skogen', units: 5, priceSEK: 600, totalSEK: 3000, buyer: 'Skanska Sverige AB', status: 'completed' },
  { id: 't5', date: '2026-03-05', type: 'sale', parcelName: 'Ekbacken', units: 3, priceSEK: 700, totalSEK: 2100, buyer: 'Vattenfall AB', status: 'completed' },
  { id: 't6', date: '2026-03-01', type: 'generation', parcelName: 'Tallmon', units: 21.8, priceSEK: 0, totalSEK: 0, status: 'completed' },
  { id: 't7', date: '2026-02-20', type: 'listing', parcelName: 'Tallmon', units: 15, priceSEK: 550, totalSEK: 8250, status: 'pending' },
];

// ─── Demo listings ───

const DEMO_LISTINGS: CreditListing[] = [
  { id: 'l1', parcelName: 'Norra Skogen', units: 5, pricePerUnit: 600, status: 'active', listedDate: '2026-03-10', verificationMethod: 'BeetleSense AI + fältbesök' },
  { id: 'l2', parcelName: 'Norra Skogen', units: 5, pricePerUnit: 600, status: 'sold', listedDate: '2026-03-08', buyer: 'Skanska Sverige AB', verificationMethod: 'BeetleSense AI + fältbesök' },
  { id: 'l3', parcelName: 'Ekbacken', units: 3, pricePerUnit: 700, status: 'sold', listedDate: '2026-03-01', buyer: 'Vattenfall AB', verificationMethod: 'BeetleSense AI + fältbesök' },
  { id: 'l4', parcelName: 'Tallmon', units: 15, pricePerUnit: 550, status: 'active', listedDate: '2026-02-20', verificationMethod: 'BeetleSense AI + drönarinspektion' },
];

// ─── Improvement actions ───

const DEMO_ACTIONS: ImprovementAction[] = [
  {
    id: 'a1', nameSv: 'Lämna högstubbar', nameEn: 'Leave high stumps',
    description: 'Lämna 5 högstubbar per hektar vid nästa avverkning. Gynnar vedlevande insekter och hackspettar.',
    costSEK: 500, timeMonths: 0, scoreImpact: 8, creditImpact: 3, annualRevenueSEK: 1800, roi: 3.6,
    parcelIds: ['p1', 'p3'], category: 'deadwood', naturvardsavtalEligible: true,
  },
  {
    id: 'a2', nameSv: 'Skapa retentionsgrupper', nameEn: 'Create retention patches',
    description: 'Lämna 5-10% av arealen som orörda retentionsgrupper vid föryngringsavverkning.',
    costSEK: 8000, timeMonths: 0, scoreImpact: 12, creditImpact: 5, annualRevenueSEK: 3000, roi: 0.375,
    parcelIds: ['p1', 'p2', 'p3'], category: 'retention', naturvardsavtalEligible: true,
  },
  {
    id: 'a3', nameSv: 'Installera fågelholkar', nameEn: 'Install nest boxes',
    description: 'Sätt upp 10 fågelholkar per hektar, fokusera på uggleholkar och mesholkar.',
    costSEK: 2000, timeMonths: 1, scoreImpact: 4, creditImpact: 1, annualRevenueSEK: 600, roi: 0.3,
    parcelIds: ['p1', 'p2', 'p3'], category: 'nesting', naturvardsavtalEligible: false,
  },
  {
    id: 'a4', nameSv: 'Restaurera våtmark', nameEn: 'Restore wetland',
    description: 'Plugga igen diken och återskapa våtmark. Ökar vattenhållning och biologisk mångfald.',
    costSEK: 25000, timeMonths: 6, scoreImpact: 15, creditImpact: 8, annualRevenueSEK: 4800, roi: 0.192,
    parcelIds: ['p2', 'p3'], category: 'wetland', naturvardsavtalEligible: true,
  },
  {
    id: 'a5', nameSv: 'Skapa skogsbryn', nameEn: 'Create forest edges',
    description: 'Utveckla brynzoner med buskskikt och blommande buskar. Gynnar insekter och fåglar.',
    costSEK: 5000, timeMonths: 2, scoreImpact: 6, creditImpact: 2, annualRevenueSEK: 1200, roi: 0.24,
    parcelIds: ['p1', 'p2'], category: 'edge', naturvardsavtalEligible: true,
  },
  {
    id: 'a6', nameSv: 'Lämna liggande lågor', nameEn: 'Leave fallen logs',
    description: 'Lämna minst 10 lågor per hektar i varierande nedbrytningsgrad.',
    costSEK: 0, timeMonths: 0, scoreImpact: 6, creditImpact: 2, annualRevenueSEK: 1200, roi: Infinity,
    parcelIds: ['p1', 'p2', 'p3'], category: 'deadwood', naturvardsavtalEligible: true,
  },
  {
    id: 'a7', nameSv: 'Ringbarka träd', nameEn: 'Ring-bark trees',
    description: 'Ringbarka 2-3 träd per hektar för att skapa stående död ved snabbare.',
    costSEK: 300, timeMonths: 0, scoreImpact: 5, creditImpact: 2, annualRevenueSEK: 1200, roi: 4.0,
    parcelIds: ['p1', 'p2', 'p3'], category: 'deadwood', naturvardsavtalEligible: true,
  },
];

// ─── Hook ───

export function useBiodiversity() {
  const [selectedParcelId, setSelectedParcelId] = useState<string>('p1');

  // Use first 3 parcels from demo data
  const parcels = useMemo(() => DEMO_PARCELS.slice(0, 3), []);

  const parcelBiodiversity = useMemo(
    () => parcels.map(buildParcelBiodiversity),
    [parcels],
  );

  const selectedParcel = useMemo(
    () => parcelBiodiversity.find(p => p.parcelId === selectedParcelId) || parcelBiodiversity[0],
    [parcelBiodiversity, selectedParcelId],
  );

  // Aggregate stats
  const totalCreditsPerYear = useMemo(
    () => Math.round(parcelBiodiversity.reduce((s, p) => s + p.creditsPerYear, 0) * 10) / 10,
    [parcelBiodiversity],
  );

  const avgScore = useMemo(
    () => Math.round(parcelBiodiversity.reduce((s, p) => s + p.totalScore, 0) / parcelBiodiversity.length),
    [parcelBiodiversity],
  );

  const totalSpecies = useMemo(() => DEMO_SPECIES.length, []);
  const redListedCount = useMemo(() => DEMO_SPECIES.filter(s => s.isRedListed).length, []);

  const totalArea = useMemo(
    () => parcels.reduce((s, p) => s + p.area_hectares, 0),
    [parcels],
  );

  // Revenue: avg price ~600 SEK/unit
  const estimatedAnnualRevenue = useMemo(
    () => Math.round(totalCreditsPerYear * 600),
    [totalCreditsPerYear],
  );

  // Credit inventory
  const creditInventory = useMemo(() => {
    const totalGenerated = parcelBiodiversity.reduce((s, p) => s + p.creditsPerYear, 0);
    const listed = DEMO_LISTINGS.filter(l => l.status === 'active').reduce((s, l) => s + l.units, 0);
    const sold = DEMO_LISTINGS.filter(l => l.status === 'sold').reduce((s, l) => s + l.units, 0);
    return {
      available: Math.round((totalGenerated - listed - sold) * 10) / 10,
      listed,
      sold,
      totalGenerated: Math.round(totalGenerated * 10) / 10,
    };
  }, [parcelBiodiversity]);

  const totalRevenue = useMemo(
    () => DEMO_TRANSACTIONS.filter(t => t.type === 'sale').reduce((s, t) => s + t.totalSEK, 0),
    [],
  );

  // Species for selected parcel
  const parcelSpecies = useMemo(
    () => DEMO_SPECIES.filter(s => s.parcelIds.includes(selectedParcelId)),
    [selectedParcelId],
  );

  // All species
  const allSpecies = DEMO_SPECIES;

  // Improvement actions for selected parcel
  const parcelActions = useMemo(
    () => DEMO_ACTIONS
      .filter(a => a.parcelIds.includes(selectedParcelId))
      .sort((a, b) => b.roi - a.roi),
    [selectedParcelId],
  );

  return {
    // Parcel data
    parcels,
    parcelBiodiversity,
    selectedParcel,
    selectedParcelId,
    setSelectedParcelId,
    // Aggregate
    totalCreditsPerYear,
    avgScore,
    totalSpecies,
    redListedCount,
    totalArea,
    estimatedAnnualRevenue,
    // Credits
    creditInventory,
    totalRevenue,
    listings: DEMO_LISTINGS,
    transactions: DEMO_TRANSACTIONS,
    // Programs & buyers
    programs: PROGRAMS,
    buyers: DEMO_BUYERS,
    // Species
    parcelSpecies,
    allSpecies,
    // Improvements
    parcelActions,
    allActions: DEMO_ACTIONS,
    // National benchmark
    nationalAvgScore: 48,
  };
}

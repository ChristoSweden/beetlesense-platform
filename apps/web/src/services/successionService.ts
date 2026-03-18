/**
 * SuccessionService — Swedish forest transfer & estate planning engine.
 *
 * Implements Swedish tax rules and legal frameworks for generational
 * transfer of forest properties (generationsväxling).
 *
 * Key legal references:
 * - Inkomstskattelagen (IL) 44 kap — continuity principle for gifts
 * - Stämpelskattelagen (1984:404) — stamp duty on property transfers
 * - IL 21 kap — Skogsavdrag (forestry deduction)
 * - IL 21 kap 40-41 §§ — Skogskonto rules
 * - Jordabalken 4 kap — property transfer formalities
 *
 * Note: Gåvoskatt (gift tax) was abolished 2004-12-17.
 * Arvsskatt (inheritance tax) was abolished 2004-12-17.
 */

// ─── Types ───

export type TransferMethod = 'gava' | 'kop' | 'arv' | 'delat_agande';

export interface TransferMethodInfo {
  id: TransferMethod;
  nameSv: string;
  nameEn: string;
  descriptionSv: string;
  descriptionEn: string;
  /** Stamp duty rate (stämpelskatt) */
  stampDutyRate: number;
  /** Whether gift/inheritance tax applies */
  transferTaxApplies: boolean;
  /** Whether continuity principle applies (tax basis carries over) */
  continuityPrinciple: boolean;
  /** Whether skogskonto can transfer with the property */
  skogskontoTransferable: boolean;
  /** Skogsavdrag implications */
  skogsavdragImplication: 'inherits_basis' | 'resets_full' | 'partial_reset' | 'shared_basis';
  /** Legal complexity: 1-5 */
  complexity: number;
  /** Typical timeline in months */
  timelineMonths: [number, number];
  /** Recommended when */
  recommendedWhenSv: string;
  recommendedWhenEn: string;
  /** Legal requirements */
  legalRequirementsSv: string[];
  legalRequirementsEn: string[];
}

export interface ForestParcel {
  id: string;
  name: string;
  areaHa: number;
  timberValueSEK: number;
  landValueSEK: number;
  huntingRightsValueSEK: number;
  carbonCreditsValueSEK: number;
  accessRoadQuality: 'good' | 'fair' | 'poor' | 'none';
  futureGrowthPotential: 'high' | 'medium' | 'low';
  locationQuality: 'premium' | 'good' | 'average' | 'remote';
}

export interface Heir {
  id: string;
  name: string;
  assignedParcelIds: string[];
}

export interface SplitResult {
  heirId: string;
  heirName: string;
  parcels: ForestParcel[];
  totalValue: number;
  percentOfTotal: number;
}

export interface PlanningStep {
  id: string;
  titleSv: string;
  titleEn: string;
  descriptionSv: string;
  descriptionEn: string;
  estimatedMonths: [number, number];
  order: number;
}

export interface DocumentItem {
  id: string;
  nameSv: string;
  nameEn: string;
  descriptionSv: string;
  descriptionEn: string;
  whereToGetSv: string;
  whereToGetEn: string;
  url: string;
  required: boolean;
  validityYears?: number;
}

export interface KnowledgeItem {
  id: string;
  categorySv: string;
  categoryEn: string;
  titleSv: string;
  titleEn: string;
  descriptionSv: string;
  descriptionEn: string;
}

export interface ScenarioInput {
  method: TransferMethod;
  propertyValue: number;
  taxBasis: number;
  skogskontoBalance: number;
  skogsavdragUsed: number;
  numberOfHeirs: number;
}

export interface ScenarioResult {
  method: TransferMethod;
  stampDuty: number;
  capitalGainsTax: number;
  totalTaxCost: number;
  skogskontoHandling: string;
  skogsavdragNote: string;
  netCostToFamily: number;
}

// ─── Constants ───

/** Swedish capital gains tax rate (30% on gains from property sale) */
const CAPITAL_GAINS_TAX_RATE = 0.30;

/** Taxable portion of property capital gain (22/30 rule for fastigheter) */
const PROPERTY_GAIN_TAXABLE_PORTION = 22 / 30;

/** Stamp duty rate for property purchase */
const STAMP_DUTY_PURCHASE = 0.015;

/** Stamp duty rate for gift (0% — gifts are exempt) */
const STAMP_DUTY_GIFT = 0;

export const TRANSFER_METHODS: Record<TransferMethod, TransferMethodInfo> = {
  gava: {
    id: 'gava',
    nameSv: 'Gåva',
    nameEn: 'Gift',
    descriptionSv: 'Överlåtelse utan motprestation. Skogsfastigheten övergår med kontinuitetsprincipen — mottagaren tar över givarens skattemässiga värden.',
    descriptionEn: 'Transfer without compensation. The forest property passes with the continuity principle — the recipient inherits the donor\'s tax basis.',
    stampDutyRate: STAMP_DUTY_GIFT,
    transferTaxApplies: false,
    continuityPrinciple: true,
    skogskontoTransferable: true,
    skogsavdragImplication: 'inherits_basis',
    complexity: 2,
    timelineMonths: [2, 4],
    recommendedWhenSv: 'När du vill överlåta utan beskattning och mottagaren accepterar befintligt anskaffningsvärde. Vanligaste metoden vid generationsväxling.',
    recommendedWhenEn: 'When you want to transfer without triggering tax and the recipient accepts the existing tax basis. Most common method for generational transfer.',
    legalRequirementsSv: [
      'Skriftligt gåvobrev med vittnen',
      'Ansökan om lagfart hos Lantmäteriet',
      'Eventuellt samtycke från make/maka (ÄktB 7:5)',
    ],
    legalRequirementsEn: [
      'Written deed of gift with witnesses',
      'Application for title registration at Lantmäteriet',
      'Possible spousal consent requirement (ÄktB 7:5)',
    ],
  },
  kop: {
    id: 'kop',
    nameSv: 'Köp',
    nameEn: 'Sale',
    descriptionSv: 'Överlåtelse till marknadspris eller taxeringsvärde. Köparen får nytt anskaffningsvärde. Säljaren beskattas på eventuell kapitalvinst.',
    descriptionEn: 'Transfer at market price or assessed value. Buyer gets a new tax basis. Seller is taxed on any capital gain.',
    stampDutyRate: STAMP_DUTY_PURCHASE,
    transferTaxApplies: false,
    continuityPrinciple: false,
    skogskontoTransferable: false,
    skogsavdragImplication: 'resets_full',
    complexity: 3,
    timelineMonths: [3, 6],
    recommendedWhenSv: 'När säljaren behöver kapital, eller om högt anskaffningsvärde minimerar kapitalvinstskatten. Ger köparen nytt, högre skogsavdragsutrymme.',
    recommendedWhenEn: 'When the seller needs capital, or if high acquisition value minimizes capital gains tax. Gives buyer new, higher forestry deduction allowance.',
    legalRequirementsSv: [
      'Köpekontrakt och köpebrev',
      'Ansökan om lagfart (med stämpelskatt 1,5%)',
      'Värdering av fastigheten',
      'Deklaration av kapitalvinst (K7-bilaga)',
    ],
    legalRequirementsEn: [
      'Purchase contract and deed of sale',
      'Title registration application (with 1.5% stamp duty)',
      'Property valuation',
      'Capital gains declaration (K7 appendix)',
    ],
  },
  arv: {
    id: 'arv',
    nameSv: 'Arv',
    nameEn: 'Inheritance',
    descriptionSv: 'Övergång vid dödsfall. Ingen arvsskatt (avskaffad 2004). Kontinuitetsprincipen gäller — arvtagaren övertar den avlidnes skattemässiga värden.',
    descriptionEn: 'Transfer upon death. No inheritance tax (abolished 2004). Continuity principle applies — the heir inherits the deceased\'s tax basis.',
    stampDutyRate: STAMP_DUTY_GIFT,
    transferTaxApplies: false,
    continuityPrinciple: true,
    skogskontoTransferable: true,
    skogsavdragImplication: 'inherits_basis',
    complexity: 3,
    timelineMonths: [3, 12],
    recommendedWhenSv: 'Ej planerat — sker automatiskt. Rekommenderas ej som strategi då det ger familjen mindre kontroll och längre process.',
    recommendedWhenEn: 'Not planned — happens automatically. Not recommended as strategy as it gives the family less control and longer process.',
    legalRequirementsSv: [
      'Bouppteckning registrerad hos Skatteverket',
      'Arvskifte (om flera arvingar)',
      'Ansökan om lagfart',
      'Eventuell testamentsbevakning',
    ],
    legalRequirementsEn: [
      'Estate inventory registered at Skatteverket',
      'Estate distribution (if multiple heirs)',
      'Title registration application',
      'Possible will enforcement',
    ],
  },
  delat_agande: {
    id: 'delat_agande',
    nameSv: 'Delat ägande',
    nameEn: 'Co-ownership',
    descriptionSv: 'Flera ägare delar fastigheten genom delägarskap eller samfällighet. Kan kombineras med gåva eller köp för andelar.',
    descriptionEn: 'Multiple owners share the property through co-ownership or joint management. Can be combined with gift or sale for shares.',
    stampDutyRate: STAMP_DUTY_GIFT,
    transferTaxApplies: false,
    continuityPrinciple: true,
    skogskontoTransferable: false,
    skogsavdragImplication: 'shared_basis',
    complexity: 4,
    timelineMonths: [4, 8],
    recommendedWhenSv: 'När flera syskon vill behålla anknytning till skogen. Kräver tydliga avtal om förvaltning, kostnader och intäktsfördelning.',
    recommendedWhenEn: 'When multiple siblings want to maintain connection to the forest. Requires clear agreements on management, costs, and revenue sharing.',
    legalRequirementsSv: [
      'Samäganderättsavtal (rekommenderas starkt)',
      'Ansökan om lagfart för varje delägare',
      'Avtal om förvaltning och kostnadsfördelning',
      'Eventuell fastighetsreglering via Lantmäteriet',
    ],
    legalRequirementsEn: [
      'Co-ownership agreement (strongly recommended)',
      'Title registration for each co-owner',
      'Management and cost-sharing agreement',
      'Possible property regulation via Lantmäteriet',
    ],
  },
};

// ─── Required Documents ───

export const REQUIRED_DOCUMENTS: DocumentItem[] = [
  {
    id: 'lagfart',
    nameSv: 'Lagfart (ägandebevis)',
    nameEn: 'Title Deed (Lagfart)',
    descriptionSv: 'Bevisar att du är registrerad ägare av fastigheten. Krävs för all överlåtelse.',
    descriptionEn: 'Proves you are the registered owner of the property. Required for any transfer.',
    whereToGetSv: 'Lantmäteriet — beställ via lantmateriet.se eller ring 0771-63 63 63',
    whereToGetEn: 'Lantmäteriet — order at lantmateriet.se or call 0771-63 63 63',
    url: 'https://www.lantmateriet.se/sv/fastigheter-och-agande/agande/lagfart/',
    required: true,
  },
  {
    id: 'skogsbruksplan',
    nameSv: 'Skogsbruksplan',
    nameEn: 'Forest Management Plan',
    descriptionSv: 'Detaljerad plan för fastighetens skogsbestånd. Bör vara högst 10 år gammal. Grund för värdering.',
    descriptionEn: 'Detailed plan for the property\'s forest stands. Should be no more than 10 years old. Basis for valuation.',
    whereToGetSv: 'Beställ via Skogsstyrelsen, din skogliga rådgivare, eller skogsbolag som Södra/Holmen/SCA',
    whereToGetEn: 'Order via Skogsstyrelsen, your forestry advisor, or timber companies like Södra/Holmen/SCA',
    url: 'https://www.skogsstyrelsen.se/bruka-skog/skogsbruksplan/',
    required: true,
    validityYears: 10,
  },
  {
    id: 'taxeringsvarde',
    nameSv: 'Taxeringsvärde',
    nameEn: 'Assessed Value (Taxeringsvärde)',
    descriptionSv: 'Skatteverkets värdering av fastigheten. Viktigt för att avgöra om en överlåtelse klassas som köp eller gåva (huvudsaklighetsprincipen).',
    descriptionEn: 'Skatteverket\'s valuation of the property. Important for determining if a transfer is classified as sale or gift (predominance principle).',
    whereToGetSv: 'Skatteverket — sök på skatteverket.se eller i senaste deklarationen',
    whereToGetEn: 'Skatteverket — search on skatteverket.se or in latest tax return',
    url: 'https://www.skatteverket.se/privat/fastigheterochbostad/fastighetstaxering.html',
    required: true,
  },
  {
    id: 'skogskonto',
    nameSv: 'Skogskonto — saldobesked',
    nameEn: 'Forest Account (Skogskonto) Balance',
    descriptionSv: 'Aktuellt saldo på skogskonto och skogsskadekonto. Skogskonto kan i vissa fall följa med vid gåva.',
    descriptionEn: 'Current balance on forest account and forest damage account. Forest account may in some cases transfer with a gift.',
    whereToGetSv: 'Din bank — kontakta det kontor som hanterar ditt skogskonto',
    whereToGetEn: 'Your bank — contact the branch managing your forest account',
    url: 'https://www.skatteverket.se/privat/skatter/arbeteochinkomst/inkomster/naringsinkomst/skogsbruk/skogskonto.html',
    required: true,
  },
  {
    id: 'servitut',
    nameSv: 'Servitut och rättigheter',
    nameEn: 'Easements (Servitut)',
    descriptionSv: 'Förteckning över alla servitut som belastar eller gynnar fastigheten (väg, ledning, brygga etc.).',
    descriptionEn: 'List of all easements burdening or benefiting the property (road, utility line, dock, etc.).',
    whereToGetSv: 'Lantmäteriet — ingår i fastighetsregistret. Beställ utdrag.',
    whereToGetEn: 'Lantmäteriet — included in property register. Order an extract.',
    url: 'https://www.lantmateriet.se/sv/fastigheter-och-agande/fastighetsinformation/',
    required: true,
  },
  {
    id: 'jaktratt',
    nameSv: 'Jakträttsavtal',
    nameEn: 'Hunting Rights Agreement',
    descriptionSv: 'Avtal om jakträtt på fastigheten. Kontrollera löptid och uppsägningsvillkor — jakträtten följer inte automatiskt med.',
    descriptionEn: 'Hunting rights agreement for the property. Check duration and termination terms — hunting rights do not automatically transfer.',
    whereToGetSv: 'Befintligt avtal med jaktlag/arrendator. Kontakta Jägareförbundet vid behov.',
    whereToGetEn: 'Existing agreement with hunting team/lessee. Contact the Hunting Federation if needed.',
    url: 'https://jagareforbundet.se/jakt/jaktratt/',
    required: false,
  },
  {
    id: 'aganderatt_historik',
    nameSv: 'Ägarhistorik och anskaffningsvärde',
    nameEn: 'Ownership History & Acquisition Value',
    descriptionSv: 'Dokumentation av anskaffningsvärde (köpeskilling vid förvärv). Nödvändigt för att beräkna kapitalvinst vid köp.',
    descriptionEn: 'Documentation of acquisition value (purchase price at acquisition). Necessary for calculating capital gain on sale.',
    whereToGetSv: 'Egna handlingar, Lantmäteriet, eller Skatteverket (deklarationshistorik)',
    whereToGetEn: 'Own documents, Lantmäteriet, or Skatteverket (tax return history)',
    url: 'https://www.lantmateriet.se/sv/fastigheter-och-agande/fastighetsinformation/',
    required: true,
  },
];

// ─── Planning Steps ───

export const PLANNING_STEPS: PlanningStep[] = [
  {
    id: 'assess',
    titleSv: 'Värdera fastigheten',
    titleEn: 'Assess property value',
    descriptionSv: 'Uppdatera skogsbruksplan, inhämta taxeringsvärde, och gör en marknadsvärdering. Inkludera virkesförråd, jakt, och kolkrediter.',
    descriptionEn: 'Update forest management plan, obtain assessed value, and do a market valuation. Include timber stock, hunting, and carbon credits.',
    estimatedMonths: [1, 3],
    order: 1,
  },
  {
    id: 'family_discussion',
    titleSv: 'Diskutera med familjen',
    titleEn: 'Discuss with family',
    descriptionSv: 'Öppen dialog med alla berörda. Vem vill fortsätta bruka skogen? Har alla samma förväntningar? Diskutera tidplan och ekonomiska förutsättningar.',
    descriptionEn: 'Open dialogue with everyone involved. Who wants to continue managing the forest? Do all have the same expectations? Discuss timeline and financial conditions.',
    estimatedMonths: [1, 6],
    order: 2,
  },
  {
    id: 'choose_method',
    titleSv: 'Välj överlåtelseform',
    titleEn: 'Choose transfer method',
    descriptionSv: 'Baserat på familjens situation — gåva, köp, eller delat ägande? Konsultera skattejurist. Huvudsaklighetsprincipen avgör gränsen.',
    descriptionEn: 'Based on the family\'s situation — gift, sale, or co-ownership? Consult a tax lawyer. The predominance principle determines the boundary.',
    estimatedMonths: [1, 2],
    order: 3,
  },
  {
    id: 'update_plan',
    titleSv: 'Uppdatera skogsbruksplan',
    titleEn: 'Update forest management plan',
    descriptionSv: 'Om befintlig plan är äldre än 10 år, beställ ny. Skogsbruksplanen är grunden för alla ekonomiska beräkningar.',
    descriptionEn: 'If the existing plan is older than 10 years, order a new one. The management plan is the foundation for all financial calculations.',
    estimatedMonths: [2, 4],
    order: 4,
  },
  {
    id: 'legal_review',
    titleSv: 'Juridisk granskning',
    titleEn: 'Legal review',
    descriptionSv: 'Anlita jurist med erfarenhet av skogsfastigheter. Granska gåvobrev/köpekontrakt, servitut, och skattekonsekvenser.',
    descriptionEn: 'Engage a lawyer experienced with forest properties. Review deed of gift/purchase contract, easements, and tax consequences.',
    estimatedMonths: [1, 2],
    order: 5,
  },
  {
    id: 'execute',
    titleSv: 'Genomför överlåtelsen',
    titleEn: 'Execute the transfer',
    descriptionSv: 'Skriv under handlingar, hantera skogskonto, och ansök om lagfart hos Lantmäteriet.',
    descriptionEn: 'Sign documents, handle forest account, and apply for title registration at Lantmäteriet.',
    estimatedMonths: [1, 2],
    order: 6,
  },
  {
    id: 'register',
    titleSv: 'Registrering hos Lantmäteriet',
    titleEn: 'Register at Lantmäteriet',
    descriptionSv: 'Ansök om lagfart inom 3 månader efter överlåtelsen. Handläggningstid ca 2-4 veckor.',
    descriptionEn: 'Apply for title registration within 3 months of transfer. Processing time approximately 2-4 weeks.',
    estimatedMonths: [1, 2],
    order: 7,
  },
];

// ─── Knowledge Transfer Items ───

export const KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'boundaries',
    categorySv: 'Fastigheten',
    categoryEn: 'The Property',
    titleSv: 'Gränser och markeringar',
    titleEn: 'Boundaries and markers',
    descriptionSv: 'Var går gränserna exakt? Finns det oklara gränser mot grannar? Visa gränsmarkeringar i terrängen.',
    descriptionEn: 'Where are the exact boundaries? Are there unclear boundaries with neighbors? Show boundary markers in the terrain.',
  },
  {
    id: 'water_sources',
    categorySv: 'Fastigheten',
    categoryEn: 'The Property',
    titleSv: 'Vattenkällor och dränering',
    titleEn: 'Water sources and drainage',
    descriptionSv: 'Var finns brunnar, bäckar, och diken? Vilka dikessystem behöver underhållas?',
    descriptionEn: 'Where are wells, streams, and ditches? Which drainage systems need maintenance?',
  },
  {
    id: 'roads',
    categorySv: 'Infrastruktur',
    categoryEn: 'Infrastructure',
    titleSv: 'Vägar och vägsamfälligheter',
    titleEn: 'Roads and road associations',
    descriptionSv: 'Vilka vägar äger du? Vilka vägsamfälligheter deltar du i? Underhållsschema och kostnader.',
    descriptionEn: 'Which roads do you own? Which road associations do you participate in? Maintenance schedule and costs.',
  },
  {
    id: 'harvest_history',
    categorySv: 'Skogsbruk',
    categoryEn: 'Forestry',
    titleSv: 'Avverkningshistorik',
    titleEn: 'Harvest history',
    descriptionSv: 'Var och när har avverkningar gjorts? Vilka metoder och resultat? Kommande planerade åtgärder.',
    descriptionEn: 'Where and when have harvests been done? What methods and results? Upcoming planned operations.',
  },
  {
    id: 'planting_regen',
    categorySv: 'Skogsbruk',
    categoryEn: 'Forestry',
    titleSv: 'Plantering och föryngring',
    titleEn: 'Planting and regeneration',
    descriptionSv: 'Vilka provenienser har fungerat bäst? Markberedningsmetoder. Problem med viltbetning?',
    descriptionEn: 'Which provenances have worked best? Soil preparation methods. Problems with browsing damage?',
  },
  {
    id: 'contractors',
    categorySv: 'Kontakter',
    categoryEn: 'Contacts',
    titleSv: 'Maskinförare och entreprenörer',
    titleEn: 'Operators and contractors',
    descriptionSv: 'Vilka entreprenörer har du goda erfarenheter med? Kontaktuppgifter och specialiteter.',
    descriptionEn: 'Which contractors have you had good experiences with? Contact details and specialties.',
  },
  {
    id: 'timber_buyers',
    categorySv: 'Kontakter',
    categoryEn: 'Contacts',
    titleSv: 'Virkesköpare och sågverk',
    titleEn: 'Timber buyers and sawmills',
    descriptionSv: 'Vilka virkesköpare har gett bäst priser? Avtal och relationer.',
    descriptionEn: 'Which timber buyers have given the best prices? Contracts and relationships.',
  },
  {
    id: 'inspector',
    categorySv: 'Kontakter',
    categoryEn: 'Contacts',
    titleSv: 'Skogsinspektorer och rådgivare',
    titleEn: 'Forest inspectors and advisors',
    descriptionSv: 'Vem har varit din skogsinspektor? Kontaktuppgifter till LRF, Skogsstyrelsen-kontakt, etc.',
    descriptionEn: 'Who has been your forest inspector? Contact details for LRF, Skogsstyrelsen contact, etc.',
  },
  {
    id: 'hunting',
    categorySv: 'Jakt och natur',
    categoryEn: 'Hunting and nature',
    titleSv: 'Jaktlag och viltvård',
    titleEn: 'Hunting team and wildlife management',
    descriptionSv: 'Vilka ingår i jaktlaget? Avtal, traditioner, viltstammar och foderspridning.',
    descriptionEn: 'Who is in the hunting team? Agreements, traditions, wildlife populations, and feeding.',
  },
  {
    id: 'special_areas',
    categorySv: 'Jakt och natur',
    categoryEn: 'Hunting and nature',
    titleSv: 'Skyddsvärda områden',
    titleEn: 'Conservation areas',
    descriptionSv: 'Nyckelbiotoper, hänsynskrävande biotoper, kulturlämningar. Vad har Skogsstyrelsen pekat ut?',
    descriptionEn: 'Key habitats, consideration-requiring habitats, cultural remnants. What has Skogsstyrelsen identified?',
  },
];

// ─── Calculation Functions ───

/**
 * Calculate total value of a parcel including all value components.
 */
export function getParcelTotalValue(parcel: ForestParcel): number {
  return (
    parcel.timberValueSEK +
    parcel.landValueSEK +
    parcel.huntingRightsValueSEK +
    parcel.carbonCreditsValueSEK
  );
}

/**
 * Format a number as Swedish kronor.
 */
export function formatSEK(amount: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate scenario outcome for a given transfer method.
 *
 * Simplified model:
 * - Gåva: No stamp duty, no capital gains tax, continuity principle.
 * - Köp: 1.5% stamp duty on sale price. Capital gains tax on (sale - acquisition value) × 22/30 × 30%.
 * - Arv: No stamp duty, no capital gains tax, continuity principle.
 * - Delat ägande: Treated as partial gåva, no stamp duty per se.
 */
export function calculateScenario(input: ScenarioInput): ScenarioResult {
  const _method = TRANSFER_METHODS[input.method];
  let stampDuty = 0;
  let capitalGainsTax = 0;
  let skogskontoHandling = '';
  let skogsavdragNote = '';

  switch (input.method) {
    case 'gava':
      stampDuty = 0;
      capitalGainsTax = 0;
      skogskontoHandling = 'Skogskontot kan föras över till mottagaren om hela fastigheten överlåts.';
      skogsavdragNote = 'Mottagaren övertar givarens anskaffningsvärde och skogsavdragsutrymme (kontinuitetsprincipen).';
      break;
    case 'kop':
      stampDuty = Math.round(input.propertyValue * STAMP_DUTY_PURCHASE);
      {
        const gain = Math.max(0, input.propertyValue - input.taxBasis);
        const taxableGain = gain * PROPERTY_GAIN_TAXABLE_PORTION;
        capitalGainsTax = Math.round(taxableGain * CAPITAL_GAINS_TAX_RATE);
      }
      skogskontoHandling = 'Skogskontot stannar hos säljaren och beskattas i takt med uttag (max 10 år). Kan inte överföras till köparen.';
      skogsavdragNote = 'Köparen får nytt skogsavdragsutrymme baserat på köpeskillingen (50% av anskaffningsvärdet × skogsandelen).';
      break;
    case 'arv':
      stampDuty = 0;
      capitalGainsTax = 0;
      skogskontoHandling = 'Skogskontot kan övergå till dödsboet/arvingen. Beskattas vid uttag.';
      skogsavdragNote = 'Arvingen övertar den avlidnes anskaffningsvärde och skogsavdragsutrymme (kontinuitetsprincipen).';
      break;
    case 'delat_agande':
      stampDuty = 0;
      capitalGainsTax = 0;
      skogskontoHandling = 'Skogskontot kan inte delas mellan delägare. Kvarstår hos överlåtaren vid gåva av andel.';
      skogsavdragNote = 'Varje delägare får skogsavdragsutrymme i proportion till sin andel, baserat på anskaffningsvärdet.';
      break;
  }

  const totalTaxCost = stampDuty + capitalGainsTax;
  const netCostToFamily = totalTaxCost;

  return {
    method: input.method,
    stampDuty,
    capitalGainsTax,
    totalTaxCost,
    skogskontoHandling,
    skogsavdragNote,
    netCostToFamily,
  };
}

/**
 * Auto-split parcels fairly among heirs by value.
 * Uses a greedy "largest-difference-first" algorithm.
 */
export function fairSplit(parcels: ForestParcel[], heirCount: number): Map<number, string[]> {
  const sorted = [...parcels].sort(
    (a, b) => getParcelTotalValue(b) - getParcelTotalValue(a),
  );

  // Track totals per heir
  const heirTotals = new Array(heirCount).fill(0);
  const assignments = new Map<number, string[]>();
  for (let i = 0; i < heirCount; i++) {
    assignments.set(i, []);
  }

  // Assign each parcel to the heir with the lowest current total
  for (const parcel of sorted) {
    let minIdx = 0;
    let minVal = heirTotals[0];
    for (let i = 1; i < heirCount; i++) {
      if (heirTotals[i] < minVal) {
        minIdx = i;
        minVal = heirTotals[i];
      }
    }
    assignments.get(minIdx)!.push(parcel.id);
    heirTotals[minIdx] += getParcelTotalValue(parcel);
  }

  return assignments;
}

/**
 * Calculate split results for display.
 */
export function calculateSplitResults(
  parcels: ForestParcel[],
  heirs: Heir[],
): SplitResult[] {
  const totalValue = parcels.reduce((s, p) => s + getParcelTotalValue(p), 0);
  const parcelMap = new Map(parcels.map((p) => [p.id, p]));

  return heirs.map((heir) => {
    const heirParcels = heir.assignedParcelIds
      .map((id) => parcelMap.get(id))
      .filter((p): p is ForestParcel => p !== undefined);
    const heirTotal = heirParcels.reduce((s, p) => s + getParcelTotalValue(p), 0);

    return {
      heirId: heir.id,
      heirName: heir.name,
      parcels: heirParcels,
      totalValue: heirTotal,
      percentOfTotal: totalValue > 0 ? (heirTotal / totalValue) * 100 : 0,
    };
  });
}

// ─── Demo Data ───

export const DEMO_PARCELS: ForestParcel[] = [
  {
    id: 'sp-1',
    name: 'Norra Granåsen',
    areaHa: 45,
    timberValueSEK: 3200000,
    landValueSEK: 900000,
    huntingRightsValueSEK: 150000,
    carbonCreditsValueSEK: 80000,
    accessRoadQuality: 'good',
    futureGrowthPotential: 'high',
    locationQuality: 'good',
  },
  {
    id: 'sp-2',
    name: 'Södra Tallmon',
    areaHa: 32,
    timberValueSEK: 2100000,
    landValueSEK: 640000,
    huntingRightsValueSEK: 120000,
    carbonCreditsValueSEK: 55000,
    accessRoadQuality: 'good',
    futureGrowthPotential: 'medium',
    locationQuality: 'premium',
  },
  {
    id: 'sp-3',
    name: 'Björkängen',
    areaHa: 18,
    timberValueSEK: 850000,
    landValueSEK: 360000,
    huntingRightsValueSEK: 60000,
    carbonCreditsValueSEK: 30000,
    accessRoadQuality: 'fair',
    futureGrowthPotential: 'high',
    locationQuality: 'average',
  },
  {
    id: 'sp-4',
    name: 'Myrmossen',
    areaHa: 22,
    timberValueSEK: 1400000,
    landValueSEK: 440000,
    huntingRightsValueSEK: 90000,
    carbonCreditsValueSEK: 45000,
    accessRoadQuality: 'poor',
    futureGrowthPotential: 'low',
    locationQuality: 'remote',
  },
  {
    id: 'sp-5',
    name: 'Västra Planteringen',
    areaHa: 28,
    timberValueSEK: 1900000,
    landValueSEK: 560000,
    huntingRightsValueSEK: 100000,
    carbonCreditsValueSEK: 60000,
    accessRoadQuality: 'good',
    futureGrowthPotential: 'medium',
    locationQuality: 'good',
  },
];

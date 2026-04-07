/**
 * Estate Value Calculator Service
 *
 * Generates succession/transfer scenarios for forest properties.
 * Swedish-specific: no inheritance tax, no gift tax, but stamp duty
 * and capital gains tax apply in certain scenarios.
 */

/* ─── Types ─── */

export interface TaxResult {
  totalTax: number;
  taxRate: number;
  deferralPossible: boolean;
  notes: string;
}

export interface EstateScenario {
  name: string;
  description: string;
  forestValue: number;
  numberOfHeirs: number;
  method: 'inheritance' | 'gift' | 'family_company' | 'sale' | 'partial_sale';
  taxImplications: TaxResult;
  annualIncomePerHeir: number;
  controlRetained: boolean;
  recommendations: string[];
  pros: string[];
  cons: string[];
  timelineMonths: number;
}

export interface EstateInputs {
  forestValue: number;
  numberOfHeirs: number;
  annualIncome: number;
  existingLoans: number;
}

export interface EstateResult {
  scenarios: EstateScenario[];
  recommendedIndex: number;
  inputs: EstateInputs;
}

/* ─── Constants ─── */

const STAMP_DUTY_RATE = 0.015; // 1.5% for individuals
const STAMP_DUTY_RATE_COMPANY = 0.042; // 4.2% for legal entities
const CAPITAL_GAINS_TAX_RATE = 0.30; // 30% on capital gains
// Assume acquisition cost is ~40% of current value for demo
const ACQUISITION_COST_RATIO = 0.4;

/* ─── Scenario generator ─── */

export function calculateEstateScenarios(inputs: EstateInputs): EstateResult {
  const { forestValue, numberOfHeirs, annualIncome, existingLoans } = inputs;
  const netValue = forestValue - existingLoans;
  const valuePerHeir = netValue / Math.max(numberOfHeirs, 1);
  const incomePerHeir = annualIncome / Math.max(numberOfHeirs, 1);

  const scenarios: EstateScenario[] = [
    // 1. Direct inheritance
    {
      name: 'Arv',
      description: 'Skogen delas lika mellan arvingar vid bortgång. Sverige har ingen arvsskatt sedan 2005.',
      forestValue,
      numberOfHeirs,
      method: 'inheritance',
      taxImplications: {
        totalTax: 0,
        taxRate: 0,
        deferralPossible: false,
        notes: 'Ingen arvsskatt i Sverige. Arvingarna övertar ditt anskaffningsvärde (kontinuitetsprincipen). Stämpelskatt utgår vid lagfartsändring.',
      },
      annualIncomePerHeir: incomePerHeir,
      controlRetained: true,
      recommendations: [
        'Skriv testamente som specificerar hur skogen ska fördelas',
        'Överväg samäganderättsavtal mellan arvingarna',
        'Dokumentera anskaffningsvärde för framtida kapitalvinst',
      ],
      pros: [
        'Ingen skatt vid överlåtelse',
        'Du behåller full kontroll under din livstid',
        'Enklaste alternativet — inga juridiska processer behövs nu',
        'Arvingarna övertar ditt anskaffningsvärde',
      ],
      cons: [
        'Ingen planering av generationsskifte under din livstid',
        'Risk för arvstvister om testamente saknas',
        'Samägande kan skapa konflikter',
        'Stämpelskatt 1,5% vid lagfart',
      ],
      timelineMonths: 0,
    },

    // 2. Gift during lifetime
    {
      name: 'Gåva',
      description: 'Överlåt skogen som gåva till nästa generation medan du lever. Ingen gåvoskatt i Sverige.',
      forestValue,
      numberOfHeirs,
      method: 'gift',
      taxImplications: {
        totalTax: 0,
        taxRate: 0,
        deferralPossible: false,
        notes: 'Ingen gåvoskatt sedan 2005. Gåvotagaren övertar ditt anskaffningsvärde. Ingen stämpelskatt vid gåva mellan närstående.',
      },
      annualIncomePerHeir: incomePerHeir,
      controlRetained: false,
      recommendations: [
        'Använd gåvobrev med villkor (t.ex. överlåtelseförbud, nyttjanderätt)',
        'Specificera om gåvan ska räknas som förskott på arv',
        'Behåll nyttjanderätt om du vill fortsätta bruka skogen',
        'Registrera hos Lantmäteriet',
      ],
      pros: [
        'Ingen skatt alls — varken gåvoskatt eller stämpelskatt',
        'Du kan styra hur och till vem skogen överlåts',
        'Mottagarna kan börja förvalta direkt',
        'Bästa skatteoptimering om mottagarna ska sälja vidare',
      ],
      cons: [
        'Du förlorar äganderätten (men kan behålla nyttjanderätt)',
        'Kan inte ångras — gåvan är definitiv',
        'Kan påverka förhållanden mellan syskon',
        'Kräver juridisk dokumentation',
      ],
      timelineMonths: 3,
    },

    // 3. Family forestry company
    {
      name: 'Familjeskogsbolag (AB)',
      description: 'Placera skogen i ett aktiebolag. Familjemedlemmar blir aktieägare med inflytande efter andelsstorlek.',
      forestValue,
      numberOfHeirs,
      method: 'family_company',
      taxImplications: {
        totalTax: Math.round(forestValue * STAMP_DUTY_RATE_COMPANY),
        taxRate: STAMP_DUTY_RATE_COMPANY,
        deferralPossible: true,
        notes: `Stämpelskatt 4,2% (${formatSEKStatic(Math.round(forestValue * STAMP_DUTY_RATE_COMPANY))}) vid överlåtelse till bolaget. Bolagsskatt 20,6% på vinster. Utdelning beskattas som kapitalinkomst (20-25% efter 3:12-reglerna).`,
      },
      annualIncomePerHeir: Math.round(incomePerHeir * 0.75), // After corporate tax + dividend tax
      controlRetained: true,
      recommendations: [
        'Anlita revisor och jurist vid bolagsbildningen',
        'Upprätta aktieägaravtal med hembudsklausul',
        'Använd 3:12-reglerna för skatteeffektiv utdelning',
        'Överväg successiv aktieöverlåtelse genom gåva',
      ],
      pros: [
        'Professionell förvaltningsstruktur',
        'Enkel successionsplanering via aktieöverlåtelse',
        'Begränsat personligt ansvar',
        'Möjlighet till skatteplanering via 3:12-regler',
        'Alla familjemedlemmar kan vara delägare',
      ],
      cons: [
        `Hög stämpelskatt vid bildande (${formatSEKStatic(Math.round(forestValue * STAMP_DUTY_RATE_COMPANY))})`,
        'Löpande bokföring, revision och deklaration',
        'Dubbelbeskattning: bolagsskatt + utdelningsskatt',
        'Administrationskostnad ~20 000 kr/år',
        'Komplexare juridisk struktur',
      ],
      timelineMonths: 6,
    },

    // 4. Partial sale — sell timber rights, retain land
    {
      name: 'Delförsäljning',
      description: 'Sälj avverkningsrätter eller delar av fastigheten. Behåll marken och långsiktig kontroll.',
      forestValue,
      numberOfHeirs,
      method: 'partial_sale',
      taxImplications: {
        totalTax: Math.round(forestValue * (1 - ACQUISITION_COST_RATIO) * CAPITAL_GAINS_TAX_RATE * 0.3),
        taxRate: Math.round(CAPITAL_GAINS_TAX_RATE * (1 - ACQUISITION_COST_RATIO) * 0.3 * 1000) / 10,
        deferralPossible: true,
        notes: 'Kapitalvinstskatt 30% på vinsten (försäljningspris minus anskaffningsvärde). Räntefördelning och skogsavdrag kan minska skatten avsevärt. Uppskov möjligt vid reinvestering i annan jord/skog.',
      },
      annualIncomePerHeir: Math.round(incomePerHeir * 0.6),
      controlRetained: true,
      recommendations: [
        'Sälj avverkningsrätter snarare än mark för att behålla fastigheten',
        'Utnyttja skogsavdrag (50% av anskaffningsvärdet)',
        'Överväg räntefördelning för att sänka skatten',
        'Fördela försäljningen över flera år för lägre marginalskatt',
      ],
      pros: [
        'Frigjord likviditet för arvingar eller investeringar',
        'Du behåller marken och framtida värdestegring',
        'Flexibelt — sälj så mycket eller lite du vill',
        'Skogsavdrag minskar skatten betydligt',
      ],
      cons: [
        'Kapitalvinstskatt på vinsten',
        'Minskat virkesförråd och framtida intäkter',
        'Kan vara svårt att hitta köpare till bra pris',
        'Kräver värdering och förhandling',
      ],
      timelineMonths: 4,
    },
  ];

  // Recommend the one with lowest total tax
  const recommendedIndex = scenarios.reduce(
    (best, s, i) => (s.taxImplications.totalTax < scenarios[best].taxImplications.totalTax ? i : best),
    0,
  );

  return { scenarios, recommendedIndex, inputs };
}

/* ─── Helpers ─── */

function formatSEKStatic(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace('.', ',') + ' M kr';
  }
  return new Intl.NumberFormat('sv-SE').format(value) + ' kr';
}

export function formatSEK(value: number): string {
  return formatSEKStatic(value);
}

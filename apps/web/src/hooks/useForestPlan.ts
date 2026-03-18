import { useState, useMemo, useCallback } from 'react';
import { DEMO_PARCELS, type DemoParcel } from '@/lib/demoData';

// ── Types ──

export interface GoalWeights {
  income: number;        // Maximal inkomst
  biodiversity: number;  // Biologisk mångfald
  riskAversion: number;  // Minimal risk
  climate: number;       // Klimatanpassning
  legacy: number;        // Generationsarv
  recreation: number;    // Rekreation & upplevelse
}

export type PresetKey = 'traditional' | 'climate' | 'balanced' | 'conservation';

export interface PlanAction {
  id: string;
  year: number;
  parcelId: string;
  parcelName: string;
  type: 'rojning' | 'gallring' | 'slutavverkning' | 'plantering' | 'naturvard';
  label: string;
  description: string;
  estimatedVolume?: number;   // m3
  estimatedRevenue?: number;  // SEK (positive = income, negative = cost)
  milestone?: string;
}

export interface ProjectionPoint {
  year: number;
  cumulativeRevenue: number;
  timberRevenue: number;
  carbonRevenue: number;
  ecosystemRevenue: number;
  recreationRevenue: number;
  forestValue: number;
  carbonStock: number;        // tonnes CO2
  biodiversityScore: number;  // 0-100
  riskLevel: number;          // 0-100
}

export interface ContingencyScenario {
  id: string;
  name: string;
  icon: string;
  triggerYear: number;
  triggerConditions: string[];
  probability: number;       // 0-100
  immediateActions: string[];
  revisedActions: PlanAction[];
  financialImpact: number;   // SEK (negative)
  recoveryYears: number;
  description: string;
}

export interface ForestPlan {
  id: string;
  profileLabel: string;
  profileDescription: string;
  goals: GoalWeights;
  actions: PlanAction[];
  projections: ProjectionPoint[];
  contingencies: ContingencyScenario[];
  totalRevenue50y: number;
  totalCarbonStored: number;
  finalForestValue: number;
  statusQuoRevenue50y: number;
  statusQuoForestValue: number;
  generatedAt: string;
}

export type PlanState = 'idle' | 'generating' | 'ready';

// ── Presets ──

export const GOAL_PRESETS: Record<PresetKey, { label: string; description: string; weights: GoalWeights }> = {
  traditional: {
    label: 'Traditionell skogsbrukare',
    description: 'Fokus på ekonomisk avkastning med beprövade metoder',
    weights: { income: 85, biodiversity: 20, riskAversion: 50, climate: 25, legacy: 40, recreation: 15 },
  },
  climate: {
    label: 'Klimatpionjär',
    description: 'Klimatanpassning och kolbindning i fokus',
    weights: { income: 30, biodiversity: 70, riskAversion: 60, climate: 95, legacy: 55, recreation: 40 },
  },
  balanced: {
    label: 'Balanserad',
    description: 'Jämn balans mellan ekonomi, ekologi och upplevelse',
    weights: { income: 60, biodiversity: 55, riskAversion: 50, climate: 55, legacy: 60, recreation: 50 },
  },
  conservation: {
    label: 'Naturvårdare',
    description: 'Biologisk mångfald och naturvärden prioriteras',
    weights: { income: 20, biodiversity: 95, riskAversion: 40, climate: 80, legacy: 70, recreation: 75 },
  },
};

// ── Helpers ──

function formatSEK(value: number): string {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    maximumFractionDigits: 0,
  }).format(value);
}

function getProfileLabel(goals: GoalWeights): string {
  const max = Math.max(goals.income, goals.biodiversity, goals.riskAversion, goals.climate, goals.legacy, goals.recreation);
  const focusAreas: string[] = [];
  if (goals.income >= max * 0.8) focusAreas.push('ekonomi');
  if (goals.biodiversity >= max * 0.8) focusAreas.push('biologisk mångfald');
  if (goals.climate >= max * 0.8) focusAreas.push('klimat');
  if (goals.legacy >= max * 0.8) focusAreas.push('arv');
  if (goals.recreation >= max * 0.8) focusAreas.push('rekreation');
  if (goals.riskAversion >= max * 0.8) focusAreas.push('trygghet');

  if (focusAreas.length === 0) return 'Balanserad skogsägare';
  if (focusAreas.length >= 3) return 'Balanserad skogsägare med brett fokus';
  return `Skogsägare med fokus på ${focusAreas.join(' och ')}`;
}

function generateActions(goals: GoalWeights, parcels: DemoParcel[]): PlanAction[] {
  const actions: PlanAction[] = [];
  const baseYear = 2026;
  let actionId = 0;

  // Helper to create action
  const add = (
    yearOffset: number,
    parcel: DemoParcel,
    type: PlanAction['type'],
    label: string,
    description: string,
    volume?: number,
    revenue?: number,
    milestone?: string,
  ) => {
    actions.push({
      id: `a-${++actionId}`,
      year: baseYear + yearOffset,
      parcelId: parcel.id,
      parcelName: parcel.name,
      type,
      label,
      description,
      estimatedVolume: volume,
      estimatedRevenue: revenue,
      milestone,
    });
  };

  const ekbacken = parcels.find(p => p.name === 'Ekbacken')!;
  const norra = parcels.find(p => p.name === 'Norra Skogen')!;
  const tallmon = parcels.find(p => p.name === 'Tallmon')!;
  const granudden = parcels.find(p => p.name === 'Granudden')!;
  const bjorklund = parcels.find(p => p.name === 'Björklund')!;

  // ── Phase 1: Immediate (2026-2030) ──
  add(0, ekbacken, 'rojning', 'Röjning Ekbacken', 'Underväxtröjning för att gynna ek-föryngring. Avlägsna konkurrerande gran och sly.', undefined, -4500 * ekbacken.area_hectares);
  add(0, granudden, 'naturvard', 'Saneringsavverkning Granudden', 'Akut avverkning av barkborreangripna granar. Prioritera bestånd B3-B7.', 420, -85000);

  add(1, granudden, 'plantering', 'Plantering Granudden', 'Återplantering med klimatanpassad blandning: 50% tall, 30% björk, 20% gran.', undefined, -6200 * 15);

  add(2, norra, 'gallring', 'Första gallring Norra Skogen', 'Gallring av gran/tall-blandbestånd. Gynna framtidsträd med breda kronor.', 280, 45000, 'Skogen når gallringsmognad');

  if (goals.biodiversity > 40) {
    add(2, bjorklund, 'naturvard', 'Naturvårdsåtgärder Björklund', 'Skapa högstubbar och friställ lövträd. Gynna nyckelbiotopvärden.', undefined, -12000);
  }

  add(3, tallmon, 'gallring', 'Gallring Tallmon västra', 'Selektiv gallring av tallbestånd. Lämna 600-700 stammar/ha.', 450, 78000);

  add(4, norra, 'plantering', 'Plantering Douglasgran', 'Kompletteringsplantering med Douglasgran i luckor efter gallring. Klimatanpassat val.', undefined, -35000);

  // ── Phase 2: Development (2031-2040) ──
  add(6, tallmon, 'gallring', 'Andra gallring Tallmon', 'Andra gallring med fokus på kvalitetsproduktion. Mål: 400 stammar/ha.', 380, 95000);

  add(7, ekbacken, 'gallring', 'Gallring Ekbacken ek', 'Friställningsgallring av ek. Avlägsna överskuggande björk.', 120, 28000);

  if (goals.climate > 50) {
    add(9, norra, 'naturvard', 'Kolkreditsregistrering', 'Registrera ökad kolbindning som koldioxidkrediter. Beräknad intäkt baserad på EU ETS.', undefined, 45000, 'Första kolkreditskörd');
  }

  add(10, bjorklund, 'gallring', 'Gallring Björklund', 'Gallring av björk-granbestånd. Björkvirke till massaved, granlågor till bioenergi.', 320, 52000);

  add(12, norra, 'gallring', 'Andra gallring Norra Skogen', 'Andra gallring. Granbestånd nu i full tillväxtfas.', 350, 68000);

  add(14, norra, 'slutavverkning', 'Slutavverkning Norra Skogen granbestånd', 'Avverkning av moget granbestånd (75+ år). Toppkvalitet sagtimmer.', 2400, 850000, 'Optimal avverkningstidpunkt');

  add(15, norra, 'plantering', 'Plantering ek + björk mix', 'Klimatanpassad återplantering: 40% ek, 35% björk, 15% tall, 10% lind.', undefined, -145000);

  // ── Phase 3: Maturation (2041-2055) ──
  add(18, tallmon, 'slutavverkning', 'Slutavverkning Tallmon norra', 'Avverkning av tallbestånd (90+ år). Premium sagtimmer.', 3200, 1250000, 'Tallmon når toppvärde');
  add(19, tallmon, 'plantering', 'Återplantering Tallmon', 'Blandskog: 45% tall, 30% gran, 25% löv. Framtidssäkrad mix.', undefined, -195000);

  add(22, ekbacken, 'naturvard', 'Ekbacken naturreservat', 'Ansök om biotopskydd för äldre ekbestånd. Bidrag från Skogsstyrelsen.', undefined, goals.biodiversity > 60 ? 85000 : 35000);

  add(25, granudden, 'gallring', 'Gallring Granudden ny generation', 'Första gallring av nyplanterat bestånd. Blandskog visar god tillväxt.', 180, 42000, 'Granudden återställt');

  if (goals.recreation > 40) {
    add(28, bjorklund, 'naturvard', 'Rekreationsanpassning Björklund', 'Skapa stigsystem, rastplatser och utsiktsröjning. Naturnära upplevelser.', undefined, -65000);
  }

  // ── Phase 4: Legacy (2056-2076) ──
  add(32, norra, 'gallring', 'Gallring Norra Skogen ny generation', 'Första gallring av ek-björkbestånd. Ek visar utmärkt tillväxt.', 160, 48000);

  add(35, granudden, 'slutavverkning', 'Slutavverkning Granudden blandskog', 'Blandskogen mogen för avverkning. Betydligt bättre motståndskraft än originalbeståndet.', 1800, 720000);
  add(36, granudden, 'plantering', 'Återplantering Granudden gen 3', 'Tredje generationens plantering. Genetiskt förbättrat material.', undefined, -120000);

  add(40, bjorklund, 'slutavverkning', 'Slutavverkning Björklund', 'Avverkning av björk-granbestånd. Kombinerat virke.', 2800, 680000);
  add(41, bjorklund, 'plantering', 'Återplantering Björklund', 'Ny generation blandskog anpassad för 2060-talets klimat.', undefined, -165000);

  add(45, ekbacken, 'gallring', 'Friställningsgallring ek Ekbacken', 'Långsiktig ekskötsel. Ekbeståndet nu 80+ år och i premiumsegment.', 200, 180000, 'Ekbacken ek når premiumvärde');

  add(50, norra, 'slutavverkning', 'Slutavverkning Norra Skogen gen 2', 'Andra generationens bestånd når avverkningsålder. Ek-björk premium.', 1600, 920000, '50-årsplanens slutpunkt');

  return actions.sort((a, b) => a.year - b.year);
}

function generateProjections(goals: GoalWeights, actions: PlanAction[]): ProjectionPoint[] {
  const points: ProjectionPoint[] = [];
  let cumRevenue = 0;
  let cumTimber = 0;
  let cumCarbon = 0;
  let cumEcosystem = 0;
  let cumRecreation = 0;

  const baseForestValue = 8500000; // 8.5M SEK
  const baseCarbonStock = 12000;   // tonnes CO2
  const baseBiodiversity = 45;

  for (let y = 2026; y <= 2076; y++) {
    const yearActions = actions.filter(a => a.year === y);
    let yearTimber = 0;
    let yearCarbon = 0;
    let yearEcosystem = 0;
    let yearRecreation = 0;

    for (const action of yearActions) {
      const rev = action.estimatedRevenue ?? 0;
      if (action.type === 'slutavverkning' || action.type === 'gallring') {
        yearTimber += Math.max(0, rev);
      }
      if (action.type === 'naturvard' && rev > 0) {
        yearEcosystem += rev;
      }
      if (rev < 0) {
        yearTimber += rev; // costs reduce timber column
      }
    }

    // Passive carbon revenue (increases over time with climate focus)
    if (y > 2034 && goals.climate > 40) {
      yearCarbon += 8000 + (y - 2034) * 1200 * (goals.climate / 100);
    }

    // Recreation income
    if (y > 2040 && goals.recreation > 40) {
      yearRecreation += 5000 + (y - 2040) * 800 * (goals.recreation / 100);
    }

    cumTimber += yearTimber;
    cumCarbon += yearCarbon;
    cumEcosystem += yearEcosystem;
    cumRecreation += yearRecreation;
    cumRevenue = cumTimber + cumCarbon + cumEcosystem + cumRecreation;

    // Forest value trajectory (grows with reinvestment)
    const yearsSince = y - 2026;
    const growthRate = 0.025 + (goals.climate > 60 ? 0.005 : 0) + (goals.biodiversity > 60 ? 0.003 : 0);
    const harvestDip = yearActions.some(a => a.type === 'slutavverkning') ? -0.15 : 0;
    const plantBoost = yearActions.some(a => a.type === 'plantering') ? 0.02 : 0;
    const valueMultiplier = Math.pow(1 + growthRate, yearsSince) + harvestDip + plantBoost;
    const forestValue = baseForestValue * valueMultiplier;

    // Carbon stock evolution
    const carbonGrowth = 120 + (goals.climate > 50 ? 80 : 0);
    const carbonLoss = yearActions.some(a => a.type === 'slutavverkning') ? -800 : 0;
    const carbonStock = baseCarbonStock + yearsSince * carbonGrowth + carbonLoss;

    // Biodiversity trajectory
    const bioBase = baseBiodiversity;
    const bioImprovement = (goals.biodiversity / 100) * 0.6 * yearsSince;
    const bioNaturvard = yearActions.filter(a => a.type === 'naturvard').length * 2;
    const biodiversityScore = Math.min(95, bioBase + bioImprovement + bioNaturvard);

    // Risk level (decreases over time with diversification)
    const riskBase = 55;
    const riskReduction = (goals.riskAversion / 100) * 0.3 * yearsSince + (goals.climate / 100) * 0.2 * yearsSince;
    const riskLevel = Math.max(5, riskBase - riskReduction);

    points.push({
      year: y,
      cumulativeRevenue: cumRevenue,
      timberRevenue: cumTimber,
      carbonRevenue: cumCarbon,
      ecosystemRevenue: cumEcosystem,
      recreationRevenue: cumRecreation,
      forestValue,
      carbonStock,
      biodiversityScore,
      riskLevel,
    });
  }

  return points;
}

function generateContingencies(goals: GoalWeights, parcels: DemoParcel[]): ContingencyScenario[] {
  const norra = parcels.find(p => p.name === 'Norra Skogen')!;
  const tallmon = parcels.find(p => p.name === 'Tallmon')!;

  return [
    {
      id: 'beetle-outbreak',
      name: 'Barkborreutbrott år 3',
      icon: 'bug',
      triggerYear: 2029,
      triggerConditions: [
        'Två eller fler torra somrar i följd',
        'Grannfastigheter rapporterar angrepp',
        'Feromonfällor visar >5000 insekter/vecka',
        'NDVI-värden sjunker >15% på granbestånd',
      ],
      probability: 35,
      immediateActions: [
        'Sanera angripna träd inom 3 veckor',
        'Kontakta Skogsstyrelsen och grannar',
        'Beställ fällning via BeetleSense entreprenörspool',
        'Dokumentera skador för försäkringsanspråk',
        'Sätt upp extra feromonfällor runt angränsande bestånd',
      ],
      revisedActions: [
        {
          id: 'c1-a1', year: 2029, parcelId: norra.id, parcelName: norra.name,
          type: 'slutavverkning', label: 'Nödavverkning Norra Skogen',
          description: 'Akut avverkning av angripna granbestånd. Rädda virkesvärde genom snabb leverans.',
          estimatedVolume: 1200, estimatedRevenue: 380000,
        },
        {
          id: 'c1-a2', year: 2030, parcelId: norra.id, parcelName: norra.name,
          type: 'plantering', label: 'Återplantering resistenta arter',
          description: 'Plantera med högre andel tall och löv. Minska granandelen till max 30%.',
          estimatedRevenue: -95000,
        },
      ],
      financialImpact: -470000,
      recoveryYears: 8,
      description: 'Vid ett storskaligt barkborreangrepp i Norra Skogen prioriteras omedelbar sanering och salvagelogging. Virkesvärdet sjunker ca 55% jämfört med planerad avverkning 2040. Återplantering sker med klimatanpassad blandning för ökad motståndskraft.',
    },
    {
      id: 'storm-damage',
      name: 'Stor storm år 7',
      icon: 'wind',
      triggerYear: 2033,
      triggerConditions: [
        'SMHI varning klass 3 eller högre',
        'Vindhastighet >25 m/s i skogsmark',
        'Kraftig nederbörd löser upp rotfästen (blöt mark + vind)',
        'Exponerade bestånd på höjdlägen drabbas först',
      ],
      probability: 20,
      immediateActions: [
        'Inventera skador med drönare inom 48 timmar',
        'Anmäl stormskador till försäkringsbolaget',
        'Kontakta virkesuppköpare för snabb avyttring av vindfällen',
        'Spärra av farliga områden med vindfällda träd',
        'Prioritera upparbetning före insektssäsong',
      ],
      revisedActions: [
        {
          id: 'c2-a1', year: 2033, parcelId: tallmon.id, parcelName: tallmon.name,
          type: 'slutavverkning', label: 'Stormupparbetning Tallmon',
          description: 'Upparbetning av stormfällda träd. Sagtimmer i den mån kvaliteten tillåter.',
          estimatedVolume: 800, estimatedRevenue: 180000,
        },
        {
          id: 'c2-a2', year: 2034, parcelId: tallmon.id, parcelName: tallmon.name,
          type: 'plantering', label: 'Återplantering stormdrabbat område',
          description: 'Snabb återplantering med vindstabila arter. Stormhärdigt förband.',
          estimatedRevenue: -120000,
        },
      ],
      financialImpact: -620000,
      recoveryYears: 12,
      description: 'En Gudrun-liknande storm kan fälla 30-40% av beståndet i exponerade lägen. Försäkringen täcker direkt skada men inte den förlorade tillväxtpotentialen. Stormvirke måste upparbetas snabbt för att undvika barkborreföljdskador.',
    },
    {
      id: 'market-crash',
      name: 'Marknadskrasch år 5',
      icon: 'trending-down',
      triggerYear: 2031,
      triggerConditions: [
        'Sagtimmerpris sjunker >30% inom 6 månader',
        'Byggkonjunkturen viker kraftigt',
        'Överutbud efter storskaliga stormavverkningar i Europa',
        'Efterfrågan på massaved faller pga. digitalisering',
      ],
      probability: 15,
      immediateActions: [
        'Skjut upp alla planerade avverkningar minimum 12 månader',
        'Pivotera mot kolkrediter och ekosystemtjänster',
        'Ansök om gröna stöd från Skogsstyrelsen',
        'Intensifiera skötsel för kvalitetsproduktion (bättre pris per m3)',
        'Överväg FSC/PEFC-certifiering för premiumsegment',
      ],
      revisedActions: [
        {
          id: 'c3-a1', year: 2031, parcelId: norra.id, parcelName: norra.name,
          type: 'naturvard', label: 'Kolkreditsregistrering Norra Skogen',
          description: 'Registrera som kolsänka. Beräknad intäkt från frivilliga kolmarknaden.',
          estimatedRevenue: 35000,
        },
        {
          id: 'c3-a2', year: 2032, parcelId: tallmon.id, parcelName: tallmon.name,
          type: 'gallring', label: 'Kvalitetsgallring Tallmon',
          description: 'Gallring med fokus på kvalitet, inte volym. Bygger framtida premiumvärde.',
          estimatedVolume: 150, estimatedRevenue: 25000,
        },
      ],
      financialImpact: -340000,
      recoveryYears: 5,
      description: 'Vid en marknadskrasch är den bästa strategin tålamod. Skog är en långsiktig investering — virket försvinner inte. Skjut upp avverkningar, pivotera till alternativa inkomstströmmar och vänta på marknadsåterhämtning. Historiskt normaliseras marknaden inom 3-5 år.',
    },
  ];
}

function generatePlan(goals: GoalWeights, parcels: DemoParcel[]): ForestPlan {
  const actions = generateActions(goals, parcels);
  const projections = generateProjections(goals, actions);
  const contingencies = generateContingencies(goals, parcels);

  const lastPoint = projections[projections.length - 1];
  const profileLabel = getProfileLabel(goals);

  // Status quo projections (do nothing)
  const statusQuoGrowth = 0.015;
  const statusQuoRevenue = 0; // No harvesting = no revenue
  const statusQuoValue = 8500000 * Math.pow(1 + statusQuoGrowth, 50);

  return {
    id: `plan-${Date.now()}`,
    profileLabel,
    profileDescription: `Din profil: ${profileLabel}`,
    goals,
    actions,
    projections,
    contingencies,
    totalRevenue50y: lastPoint.cumulativeRevenue,
    totalCarbonStored: lastPoint.carbonStock,
    finalForestValue: lastPoint.forestValue,
    statusQuoRevenue50y: statusQuoRevenue,
    statusQuoForestValue: statusQuoValue,
    generatedAt: new Date().toISOString(),
  };
}

// ── Hook ──

export function useForestPlan() {
  const [goals, setGoals] = useState<GoalWeights>(GOAL_PRESETS.balanced.weights);
  const [planState, setPlanState] = useState<PlanState>('idle');
  const [plan, setPlan] = useState<ForestPlan | null>(null);
  const [activePreset, setActivePreset] = useState<PresetKey | null>('balanced');

  const parcels = DEMO_PARCELS;

  const profileLabel = useMemo(() => getProfileLabel(goals), [goals]);

  const applyPreset = useCallback((key: PresetKey) => {
    setGoals(GOAL_PRESETS[key].weights);
    setActivePreset(key);
  }, []);

  const updateGoal = useCallback((key: keyof GoalWeights, value: number) => {
    setGoals(prev => ({ ...prev, [key]: value }));
    setActivePreset(null);
  }, []);

  const generate = useCallback(() => {
    setPlanState('generating');

    // Simulate AI generation delay
    setTimeout(() => {
      const newPlan = generatePlan(goals, parcels);
      setPlan(newPlan);
      setPlanState('ready');
    }, 2200);
  }, [goals, parcels]);

  const reset = useCallback(() => {
    setPlan(null);
    setPlanState('idle');
  }, []);

  return {
    goals,
    setGoals,
    updateGoal,
    profileLabel,
    activePreset,
    applyPreset,
    planState,
    plan,
    generate,
    reset,
    parcels,
    presets: GOAL_PRESETS,
    formatSEK,
  };
}

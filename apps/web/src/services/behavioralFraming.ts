/**
 * Behavioral Framing Service — BeetleSense.ai
 *
 * Transforms raw forest data into behaviorally-framed messages using
 * established behavioral science principles:
 *   - Loss aversion (Kahneman & Tversky)
 *   - Anchoring effect
 *   - Endowment effect
 *   - Temporal urgency
 *   - Completion bias (Zeigarnik effect)
 *   - Narrative transportation
 *
 * All outputs are in Swedish for the primary market.
 */

// ─── Loss Aversion ──────────────────────────────────────────────────────────

export interface LossAversionFrame {
  headline: string;
  subtext: string;
  urgency: 'low' | 'medium' | 'high';
}

/**
 * Frame a metric in terms of what the owner stands to *lose* by inaction.
 * Loss aversion: losses feel ~2x worse than equivalent gains.
 */
export function frameLossAversion(
  metric: string,
  value: number,
  context: { trend?: 'rising' | 'stable' | 'falling'; benchmark?: number; unit?: string },
): LossAversionFrame {
  const unit = context.unit ?? 'kr';
  const formatted = value.toLocaleString('sv-SE');

  if (metric === 'timberValue') {
    const atRisk = Math.round(value * 0.06); // ~6% at risk from beetle/storm
    const lossWithout = Math.round(value * 0.14); // 14% projected 12-month loss
    const urgency: LossAversionFrame['urgency'] =
      context.trend === 'rising' ? 'high' : context.trend === 'falling' ? 'medium' : 'low';
    return {
      headline: `${atRisk.toLocaleString('sv-SE')} ${unit} hotat just nu`,
      subtext: `Utan åtgärd: ${lossWithout.toLocaleString('sv-SE')} ${unit} förlorat inom 12 månader`,
      urgency,
    };
  }

  if (metric === 'healthScore') {
    const lost = 100 - value;
    const urgency: LossAversionFrame['urgency'] = lost > 20 ? 'high' : lost > 10 ? 'medium' : 'low';
    return {
      headline: `${lost} poäng under optimal hälsa`,
      subtext: `Varje poäng motsvarar ca ${Math.round(value * 42)} kr i skyddsvärde`,
      urgency,
    };
  }

  if (metric === 'stressedTrees') {
    const urgency: LossAversionFrame['urgency'] = value > 200 ? 'high' : value > 50 ? 'medium' : 'low';
    return {
      headline: `${formatted} träd visar stressymptom`,
      subtext: `Utan insats sprider sig angreppet till friska träd inom 3–6 veckor`,
      urgency,
    };
  }

  // Generic fallback
  return {
    headline: `${formatted} ${unit} i riskzonen`,
    subtext: 'Agera nu för att skydda ditt värde',
    urgency: value > 100000 ? 'high' : value > 10000 ? 'medium' : 'low',
  };
}

// ─── Anchoring ──────────────────────────────────────────────────────────────

export interface AnchoringFrame {
  anchor: string;
  solution: string;
  savings: string;
}

/**
 * Show a large reference cost first (anchor), then the much smaller
 * BeetleSense cost. The contrast makes the solution feel like a bargain.
 */
export function frameAnchoring(
  manualCost: number,
  beetlesenseCost: number,
  unit: string = 'kr',
): AnchoringFrame {
  const savedPct = Math.round(((manualCost - beetlesenseCost) / manualCost) * 100);
  return {
    anchor: `${manualCost.toLocaleString('sv-SE')} ${unit}`,
    solution: `${beetlesenseCost.toLocaleString('sv-SE')} ${unit}`,
    savings: `Spara ${savedPct}% — ${(manualCost - beetlesenseCost).toLocaleString('sv-SE')} ${unit} kvar i fickan`,
  };
}

// ─── Endowment Effect ───────────────────────────────────────────────────────

export interface EndowmentFrame {
  personalLabel: string;
  treeLabel: string;
}

/**
 * Replace abstract hectares/NDVI with personalized "your trees" language.
 * The endowment effect means people value what they *own* more highly.
 */
export function frameEndowment(
  areaHa: number,
  treeCount: number,
  ownerName?: string,
): EndowmentFrame {
  const prefix = ownerName ? `${ownerName}s` : 'Dina';
  return {
    personalLabel: `${prefix} ${treeCount.toLocaleString('sv-SE')} träd`,
    treeLabel: `${prefix} skog — ${areaHa.toLocaleString('sv-SE')} hektar levande kapital`,
  };
}

// ─── Temporal Urgency (Beetle Biology) ──────────────────────────────────────

export interface BeetleUrgencyFrame {
  message: string;
  daysLeft: number;
  phase: string;
  urgencyLevel: string;
}

/**
 * Use beetle biology to create calendar-driven urgency.
 * Ips typographus swarming begins when temps hit 18-20 C (typically May).
 */
export function frameBeetleUrgency(month: number): BeetleUrgencyFrame {
  // Beetle lifecycle phases mapped to Swedish months
  const phases: Record<number, { phase: string; message: string; urgencyLevel: string }> = {
    1:  { phase: 'Övervintring',          message: 'Barkborrarna vilar — perfekt tid att planera skyddsstrategi', urgencyLevel: 'low' },
    2:  { phase: 'Övervintring',          message: 'Sista chansen att ta bort vindfällen innan svärmningen',     urgencyLevel: 'medium' },
    3:  { phase: 'Uppvakning',            message: 'Barkborrarna vaknar snart — säkra dina granar nu',           urgencyLevel: 'medium' },
    4:  { phase: 'Förberedelse',          message: 'Svärmning om veckor — varje dag utan åtgärd ökar risken',    urgencyLevel: 'high' },
    5:  { phase: 'Första svärmning',      message: 'Svärmningen har börjat — kontrollera fällor och stressade träd dagligen', urgencyLevel: 'high' },
    6:  { phase: 'Aktiv svärmning',       message: 'Högsäsong — nya angrepp syns inom 2 veckor',                 urgencyLevel: 'high' },
    7:  { phase: 'Andra generation',      message: 'Andra generationens larver utvecklas — övervaka brunkronor', urgencyLevel: 'high' },
    8:  { phase: 'Andra svärmning',       message: 'Andra svärmningen möjlig — agera på varje brunfärgning',     urgencyLevel: 'high' },
    9:  { phase: 'Slutangrepp',           message: 'Sista angreppen — ta ut angripna träd före vintern',         urgencyLevel: 'medium' },
    10: { phase: 'Avmattning',            message: 'Säsongen avslutas — inventera skador och planera gallring',  urgencyLevel: 'medium' },
    11: { phase: 'Utvärdering',           message: 'Dags att utvärdera säsongen och uppdatera skogsbruksplanen', urgencyLevel: 'low' },
    12: { phase: 'Övervintring',          message: 'Barkborrarna går i vila — dags att fälla riskträd',          urgencyLevel: 'low' },
  };

  const data = phases[month] ?? phases[6];

  // Days until peak swarming (May 15 = day 135)
  const now = new Date();
  const peakDate = new Date(now.getFullYear(), 4, 15); // May 15
  if (peakDate < now) peakDate.setFullYear(peakDate.getFullYear() + 1);
  const daysLeft = Math.max(0, Math.ceil((peakDate.getTime() - now.getTime()) / 86_400_000));

  return {
    message: data.message,
    daysLeft,
    phase: data.phase,
    urgencyLevel: data.urgencyLevel,
  };
}

// ─── Progress Framing (Completion Bias) ─────────────────────────────────────

export interface ForestPlanProgressFrame {
  percentage: number;
  nextAction: string;
  motivator: string;
}

const FOREST_PLAN_STEPS = [
  'Registrera fastighet',
  'Första drönarscan',
  'Trädräkning klar',
  'Hälsobedömning',
  'Riskanalys granbarkborre',
  'Virkesvärdeskattning',
  'Gallringsplan',
  'Skogsbruksplan',
  'Skötselinstruktioner',
  'Årsrapport genererad',
  'Certifiering påbörjad',
];

/**
 * Leverage the Zeigarnik effect — incomplete tasks are more memorable and
 * motivating. Always show progress as "almost there" when possible.
 */
export function frameForestPlanProgress(
  completedSteps: string[],
  totalSteps: string[] = FOREST_PLAN_STEPS,
): ForestPlanProgressFrame {
  const done = completedSteps.length;
  const total = totalSteps.length;
  const percentage = Math.round((done / total) * 100);

  // Find next uncompleted step
  const nextStep = totalSteps.find((s) => !completedSteps.includes(s)) ?? totalSteps[totalSteps.length - 1];

  // Motivator varies by progress
  let motivator: string;
  if (percentage === 100) {
    motivator = 'Grattis! Din skogsplan är komplett.';
  } else if (percentage >= 80) {
    motivator = `Nästan klar! Bara ${total - done} steg kvar till en komplett skogsplan.`;
  } else if (percentage >= 50) {
    motivator = `Halvvägs — fortsätt för att låsa upp djupare analyser.`;
  } else if (percentage >= 20) {
    motivator = `Bra start! Varje steg ger dig bättre skydd.`;
  } else {
    motivator = 'Slutför din skogsplan för att få full insikt i din skog.';
  }

  return {
    percentage,
    nextAction: nextStep,
    motivator,
  };
}

/** All available forest plan steps (exported for UI checklists) */
export { FOREST_PLAN_STEPS };

// ─── Narrative Framing ──────────────────────────────────────────────────────

export interface ParcelNarrativeData {
  name: string;
  healthScore: number;
  ndvi: number;
  stressedTrees: number;
  totalTrees: number;
  topRisk: string;
}

/**
 * Turn raw parcel data into a compelling first-person narrative.
 * Narrative transportation makes information stickier and more persuasive.
 */
export function generateForestNarrative(parcelData: ParcelNarrativeData): string {
  const { name, healthScore, stressedTrees, totalTrees, topRisk } = parcelData;
  const healthyPct = Math.round(((totalTrees - stressedTrees) / totalTrees) * 100);
  const stressedPct = 100 - healthyPct;

  if (healthScore >= 85) {
    return (
      `${name} mår bra. Av dina ${totalTrees.toLocaleString('sv-SE')} träd är ${healthyPct}% friska ` +
      `och produktiva. Den största risken just nu är ${topRisk}, men dina träd är starka. ` +
      `Fortsätt övervaka — en frisk skog är en lönsam skog.`
    );
  }

  if (healthScore >= 60) {
    return (
      `${name} visar tidiga varningssignaler. ${stressedPct}% av dina träd — ` +
      `det är ${stressedTrees.toLocaleString('sv-SE')} stycken — uppvisar stressymptom. ` +
      `Huvudrisken är ${topRisk}. Agerar du nu kan du förhindra spridning och ` +
      `rädda virkesvärdet. Väntar du kan förlusten tredubblas inom en säsong.`
    );
  }

  return (
    `${name} behöver omedelbar uppmärksamhet. Med en hälsopoäng på ${healthScore} ` +
    `och ${stressedTrees.toLocaleString('sv-SE')} stressade träd av ${totalTrees.toLocaleString('sv-SE')} ` +
    `är situationen allvarlig. ${topRisk} sprider sig aktivt. Varje vecka utan åtgärd ` +
    `innebär större förluster. Kontakta din skogsinspektör idag.`
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Estimate tree count from hectares (avg ~335 trees/ha for Swedish managed forest) */
export function estimateTreeCount(areaHa: number): number {
  return Math.round(areaHa * 335);
}

/** Estimate timber value in SEK from area and average stumpage price */
export function estimateTimberValue(areaHa: number, avgStumpageSEKPerM3: number = 420): number {
  // Average standing volume ~180 m3/ha in Southern Sweden
  const volumeM3 = areaHa * 180;
  return Math.round(volumeM3 * avgStumpageSEKPerM3);
}

/** Estimate CO2 absorption — ~22 tonnes CO2 per ha per year for Swedish conifer forest */
export function estimateCO2Absorption(areaHa: number): number {
  return Math.round(areaHa * 22);
}

/** Convert CO2 tonnes to "breathes for N people" (1 person ~ 0.9 tonnes CO2/year) */
export function co2ToPeople(co2Tonnes: number): number {
  return Math.round(co2Tonnes / 0.9);
}

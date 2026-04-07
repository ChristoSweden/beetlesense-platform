/**
 * Forest Management Plan (Skogsbruksplan) Generator Service
 *
 * Generates a complete 10-year forest management plan from existing parcel data.
 * In demo mode, produces realistic data for 3 parcels with recommendations,
 * harvest schedule, and risk assessment.
 */

/* ─── Types ─── */

export interface ForestPlan {
  id: string;
  generatedAt: Date;
  owner: { name: string; fastighetsbeteckning: string };
  parcels: PlanParcel[];
  totalArea: number;
  totalVolume: number;
  totalValue: number;
  carbonStock: number;
  planPeriod: { start: number; end: number };
  recommendations: PlanRecommendation[];
  harvestSchedule: HarvestEntry[];
  riskAssessment: RiskEntry[];
}

export interface PlanParcel {
  name: string;
  area: number;
  dominantSpecies: string;
  age: number;
  siteIndex: number;
  volume: number;
  annualGrowth: number;
  healthScore: number;
  soilType: string;
  terrain: string;
}

export interface PlanRecommendation {
  parcel: string;
  action: 'final_felling' | 'thinning' | 'planting' | 'monitoring' | 'no_action';
  priority: 'high' | 'medium' | 'low';
  year: number;
  reasoning: string;
  estimatedRevenue?: number;
  estimatedCost?: number;
}

export interface HarvestEntry {
  year: number;
  parcel: string;
  type: string;
  volume: number;
  estimatedRevenue: number;
}

export interface RiskEntry {
  parcel: string;
  riskType: string;
  level: 'low' | 'medium' | 'high';
  description: string;
  mitigation: string;
}

/* ─── Demo Data ─── */

const DEMO_PARCELS: PlanParcel[] = [
  {
    name: 'Norra Skiftet',
    area: 42.5,
    dominantSpecies: 'Gran (Picea abies)',
    age: 75,
    siteIndex: 28,
    volume: 285,
    annualGrowth: 7.2,
    healthScore: 82,
    soilType: 'Frisk moränmark',
    terrain: 'Svagt kuperad',
  },
  {
    name: 'Ekbacken',
    area: 18.3,
    dominantSpecies: 'Tall (Pinus sylvestris)',
    age: 55,
    siteIndex: 24,
    volume: 195,
    annualGrowth: 5.8,
    healthScore: 91,
    soilType: 'Torr sandjord',
    terrain: 'Flack',
  },
  {
    name: 'Södra Myrkanten',
    area: 31.7,
    dominantSpecies: 'Blandskog (gran/björk)',
    age: 40,
    siteIndex: 22,
    volume: 145,
    annualGrowth: 6.5,
    healthScore: 88,
    soilType: 'Fuktig torvmark',
    terrain: 'Kuperad, delvis blöt',
  },
];

const DEMO_RECOMMENDATIONS: PlanRecommendation[] = [
  {
    parcel: 'Norra Skiftet',
    action: 'final_felling',
    priority: 'high',
    year: 2027,
    reasoning: 'Beståndet har nått slutavverkningsålder (75 år) med bonitet T28. Hög volym (285 m³/ha) ger maximalt virkesuttag. Uppskjutning ökar risken för granbarkborre.',
    estimatedRevenue: 2_850_000,
    estimatedCost: 380_000,
  },
  {
    parcel: 'Norra Skiftet',
    action: 'planting',
    priority: 'high',
    year: 2028,
    reasoning: 'Återplantering krävs enligt Skogsvårdslagen senast 3 år efter slutavverkning. Rekommenderar blandning gran/tall för klimatanpassning.',
    estimatedCost: 125_000,
  },
  {
    parcel: 'Ekbacken',
    action: 'thinning',
    priority: 'medium',
    year: 2026,
    reasoning: 'Första gallring vid 55 års ålder ger ökad diametertillväxt och bättre kvalitet på kvarvarande stammar. Beståndet är lagom tätt.',
    estimatedRevenue: 185_000,
    estimatedCost: 65_000,
  },
  {
    parcel: 'Ekbacken',
    action: 'thinning',
    priority: 'medium',
    year: 2031,
    reasoning: 'Andra gallring 5 år efter första. Syftar till att maximera värdetillväxt inför framtida slutavverkning.',
    estimatedRevenue: 210_000,
    estimatedCost: 70_000,
  },
  {
    parcel: 'Ekbacken',
    action: 'monitoring',
    priority: 'low',
    year: 2029,
    reasoning: 'Kontrollera återväxt efter gallring. Mät diametertillväxt och kontrollera barkborreangrepp.',
  },
  {
    parcel: 'Södra Myrkanten',
    action: 'thinning',
    priority: 'medium',
    year: 2027,
    reasoning: 'Blandskogen behöver gallras för att gynna gran och öka ljustillgång. Björk tas ut selektivt.',
    estimatedRevenue: 120_000,
    estimatedCost: 55_000,
  },
  {
    parcel: 'Södra Myrkanten',
    action: 'monitoring',
    priority: 'low',
    year: 2028,
    reasoning: 'Torvmarken kräver regelbunden vattennivåkontroll. Risk för försumpning om diken inte underhålls.',
  },
  {
    parcel: 'Södra Myrkanten',
    action: 'no_action',
    priority: 'low',
    year: 2030,
    reasoning: 'Låt beståndet växa vidare efter gallring. Naturlig föryngring av björk kompletterar planteringen.',
  },
  {
    parcel: 'Norra Skiftet',
    action: 'monitoring',
    priority: 'medium',
    year: 2030,
    reasoning: 'Kontrollera plantöverlevnad och hjortskador 2 år efter plantering. Kompletteringsplantering vid behov.',
    estimatedCost: 15_000,
  },
  {
    parcel: 'Ekbacken',
    action: 'monitoring',
    priority: 'low',
    year: 2034,
    reasoning: 'Tredje gallringsrevision. Utvärdera om beståndet närmar sig slutavverkningsdiam.',
  },
];

const DEMO_HARVEST_SCHEDULE: HarvestEntry[] = [
  { year: 2026, parcel: 'Ekbacken', type: 'Gallring', volume: 620, estimatedRevenue: 185_000 },
  { year: 2027, parcel: 'Norra Skiftet', type: 'Slutavverkning', volume: 12_112, estimatedRevenue: 2_850_000 },
  { year: 2027, parcel: 'Södra Myrkanten', type: 'Gallring', volume: 480, estimatedRevenue: 120_000 },
  { year: 2029, parcel: 'Ekbacken', type: 'Kontroll', volume: 0, estimatedRevenue: 0 },
  { year: 2031, parcel: 'Ekbacken', type: 'Gallring', volume: 710, estimatedRevenue: 210_000 },
  { year: 2033, parcel: 'Södra Myrkanten', type: 'Gallring', volume: 550, estimatedRevenue: 145_000 },
  { year: 2035, parcel: 'Ekbacken', type: 'Gallring', volume: 680, estimatedRevenue: 195_000 },
];

const DEMO_RISKS: RiskEntry[] = [
  {
    parcel: 'Norra Skiftet',
    riskType: 'Granbarkborre',
    level: 'high',
    description: 'Äldre granskog med hög volym. Angränsande bestånd har dokumenterade angrepp sedan 2024.',
    mitigation: 'Prioritera slutavverkning 2027. Sök fällor i kantzonerna under flygperioden (maj-aug).',
  },
  {
    parcel: 'Norra Skiftet',
    riskType: 'Storm',
    level: 'medium',
    description: 'Hög, smal stam-profil efter lång omloppstid. Exponerade kanter mot sydväst.',
    mitigation: 'Avverka i lä-riktning. Lämna skyddande kantzon vid slutavverkning.',
  },
  {
    parcel: 'Ekbacken',
    riskType: 'Granbarkborre',
    level: 'low',
    description: 'Tallskog är i princip inte mottaglig för granbarkborre.',
    mitigation: 'Ingen åtgärd krävs. Bevaka graninslagen.',
  },
  {
    parcel: 'Ekbacken',
    riskType: 'Brand',
    level: 'medium',
    description: 'Torr sandjord med tallskog. Brandbenägen vid torka, speciellt juni-juli.',
    mitigation: 'Underhåll brandgator. Röj undervegetation vid behov. Ha beredskapsplan.',
  },
  {
    parcel: 'Södra Myrkanten',
    riskType: 'Storm',
    level: 'medium',
    description: 'Blöt mark ger ytligt rotsystem. Risk för vindfällen vid gallring.',
    mitigation: 'Gallra med lägre uttag (20-25%) för att behålla kollektiv stabilitet.',
  },
  {
    parcel: 'Södra Myrkanten',
    riskType: 'Torka',
    level: 'low',
    description: 'Fuktig torvmark buffrar normalt mot torka, men extremsomrar kan sänka grundvattnet.',
    mitigation: 'Dikesrensning vartannat år. Bevaka vattennivåer i observationsbrunnar.',
  },
  {
    parcel: 'Norra Skiftet',
    riskType: 'Brand',
    level: 'low',
    description: 'Frisk moränmark med gran. Låg brandrisk under normala förhållanden.',
    mitigation: 'Standardberedskap. Inga särskilda åtgärder krävs.',
  },
  {
    parcel: 'Södra Myrkanten',
    riskType: 'Granbarkborre',
    level: 'medium',
    description: 'Blandskogens graninslag kan angripas. Björken erbjuder viss skyddseffekt.',
    mitigation: 'Bevaka granstammar efter varma somrar. Ta ut angripna stammar snabbt.',
  },
];

/* ─── Generator ─── */

function uid(): string {
  return 'plan-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function generateDemoForestPlan(): ForestPlan {
  const parcels = DEMO_PARCELS;
  const totalArea = parcels.reduce((s, p) => s + p.area, 0);
  const totalVolume = parcels.reduce((s, p) => s + p.volume * p.area, 0);
  // Average SEK per m³ standing volume ~500 SEK
  const totalValue = Math.round(totalVolume * 500);
  // Approx 0.9 ton CO₂ per m³ standing volume
  const carbonStock = Math.round(totalVolume * 0.9);

  return {
    id: uid(),
    generatedAt: new Date(),
    owner: {
      name: 'Erik Lindström',
      fastighetsbeteckning: 'Västerås Tillberga 4:12',
    },
    parcels,
    totalArea: Math.round(totalArea * 10) / 10,
    totalVolume: Math.round(totalVolume),
    totalValue,
    carbonStock,
    planPeriod: { start: 2026, end: 2036 },
    recommendations: DEMO_RECOMMENDATIONS,
    harvestSchedule: DEMO_HARVEST_SCHEDULE,
    riskAssessment: DEMO_RISKS,
  };
}

/* ─── Financial helpers ─── */

export function getPlanFinancials(plan: ForestPlan) {
  const totalRevenue = plan.harvestSchedule.reduce((s, h) => s + h.estimatedRevenue, 0);
  const totalCosts = plan.recommendations
    .filter((r) => r.estimatedCost)
    .reduce((s, r) => s + (r.estimatedCost ?? 0), 0);
  const netIncome = totalRevenue - totalCosts;
  const annualGrowthValue = plan.parcels.reduce((s, p) => s + p.annualGrowth * p.area * 500, 0);

  return {
    totalRevenue,
    totalCosts,
    netIncome,
    annualGrowthValue: Math.round(annualGrowthValue),
  };
}

/* ─── SEK formatter ─── */

export function formatSEK(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace('.', ',') + ' M kr';
  }
  return new Intl.NumberFormat('sv-SE').format(value) + ' kr';
}

/* ─── PDF Generator ─── */

export function generatePlanPDF(plan: ForestPlan): void {
  const financials = getPlanFinancials(plan);

  const priorityLabel: Record<string, string> = {
    high: 'Hög',
    medium: 'Medel',
    low: 'Låg',
  };

  const actionLabel: Record<string, string> = {
    final_felling: 'Slutavverkning',
    thinning: 'Gallring',
    planting: 'Plantering',
    monitoring: 'Kontroll',
    no_action: 'Ingen åtgärd',
  };

  const riskColor: Record<string, string> = {
    low: '#4ade80',
    medium: '#fbbf24',
    high: '#ef4444',
  };

  const html = `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <title>Skogsbruksplan — ${plan.owner.fastighetsbeteckning}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a1a; line-height: 1.5; font-size: 11pt; }
    h1 { font-family: Georgia, 'Times New Roman', serif; font-size: 22pt; color: #1B5E20; margin-bottom: 4pt; }
    h2 { font-family: Georgia, 'Times New Roman', serif; font-size: 14pt; color: #1B5E20; margin: 20pt 0 8pt; border-bottom: 1px solid #ddd; padding-bottom: 4pt; }
    h3 { font-size: 11pt; margin: 12pt 0 4pt; }
    .meta { color: #666; font-size: 9pt; margin-bottom: 16pt; }
    table { width: 100%; border-collapse: collapse; margin: 8pt 0 16pt; font-size: 10pt; }
    th, td { border: 1px solid #ddd; padding: 5pt 8pt; text-align: left; }
    th { background: #f5f7f4; font-weight: 600; }
    .overview-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12pt; margin: 12pt 0; }
    .overview-card { background: #f5f7f4; border: 1px solid #e0e0e0; border-radius: 6pt; padding: 12pt; text-align: center; }
    .overview-card .value { font-size: 18pt; font-weight: 700; color: #1B5E20; }
    .overview-card .label { font-size: 8pt; color: #666; margin-top: 2pt; }
    .badge { display: inline-block; padding: 1pt 6pt; border-radius: 8pt; font-size: 8pt; font-weight: 600; color: #fff; }
    .risk-low { background: #4ade80; }
    .risk-medium { background: #fbbf24; color: #1a1a1a; }
    .risk-high { background: #ef4444; }
    .priority-high { background: #ef4444; }
    .priority-medium { background: #fbbf24; color: #1a1a1a; }
    .priority-low { background: #94a3b8; }
    .disclaimer { margin-top: 24pt; padding: 12pt; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 6pt; font-size: 9pt; color: #9a3412; }
    .footer { margin-top: 24pt; text-align: center; font-size: 8pt; color: #999; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Skogsbruksplan</h1>
  <p class="meta">
    Fastighet: <strong>${plan.owner.fastighetsbeteckning}</strong> &bull;
    Ägare: <strong>${plan.owner.name}</strong> &bull;
    Planperiod: ${plan.planPeriod.start}–${plan.planPeriod.end} &bull;
    Genererad: ${plan.generatedAt.toLocaleDateString('sv-SE')}
  </p>

  <div class="overview-grid">
    <div class="overview-card">
      <div class="value">${plan.totalArea.toFixed(1)}</div>
      <div class="label">Total areal (ha)</div>
    </div>
    <div class="overview-card">
      <div class="value">${new Intl.NumberFormat('sv-SE').format(plan.totalVolume)}</div>
      <div class="label">Total volym (m³)</div>
    </div>
    <div class="overview-card">
      <div class="value">${formatSEK(plan.totalValue)}</div>
      <div class="label">Uppskattat värde</div>
    </div>
    <div class="overview-card">
      <div class="value">${new Intl.NumberFormat('sv-SE').format(plan.carbonStock)}</div>
      <div class="label">Kolförråd (ton CO₂)</div>
    </div>
  </div>

  <h2>Beståndsbeskrivning</h2>
  <table>
    <thead>
      <tr>
        <th>Skifte</th>
        <th>Areal (ha)</th>
        <th>Trädslag</th>
        <th>Ålder</th>
        <th>Bonitet</th>
        <th>Volym (m³/ha)</th>
        <th>Tillväxt (m³/ha/år)</th>
        <th>Hälsa</th>
        <th>Marktyp</th>
        <th>Terräng</th>
      </tr>
    </thead>
    <tbody>
      ${plan.parcels
        .map(
          (p) => `<tr>
        <td><strong>${p.name}</strong></td>
        <td>${p.area.toFixed(1)}</td>
        <td>${p.dominantSpecies}</td>
        <td>${p.age} år</td>
        <td>T${p.siteIndex}</td>
        <td>${p.volume}</td>
        <td>${p.annualGrowth}</td>
        <td>${p.healthScore}/100</td>
        <td>${p.soilType}</td>
        <td>${p.terrain}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Åtgärdsrekommendationer</h2>
  <table>
    <thead>
      <tr>
        <th>År</th>
        <th>Skifte</th>
        <th>Åtgärd</th>
        <th>Prioritet</th>
        <th>Motivering</th>
        <th>Intäkt</th>
        <th>Kostnad</th>
      </tr>
    </thead>
    <tbody>
      ${[...plan.recommendations]
        .sort((a, b) => a.year - b.year)
        .map(
          (r) => `<tr>
        <td>${r.year}</td>
        <td>${r.parcel}</td>
        <td>${actionLabel[r.action] ?? r.action}</td>
        <td><span class="badge priority-${r.priority}">${priorityLabel[r.priority]}</span></td>
        <td style="max-width:220pt;font-size:9pt">${r.reasoning}</td>
        <td>${r.estimatedRevenue ? formatSEK(r.estimatedRevenue) : '—'}</td>
        <td>${r.estimatedCost ? formatSEK(r.estimatedCost) : '—'}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Avverkningsplan (10 år)</h2>
  <table>
    <thead>
      <tr><th>År</th><th>Skifte</th><th>Typ</th><th>Volym (m³)</th><th>Beräknad intäkt</th></tr>
    </thead>
    <tbody>
      ${plan.harvestSchedule
        .map(
          (h) => `<tr>
        <td>${h.year}</td>
        <td>${h.parcel}</td>
        <td>${h.type}</td>
        <td>${h.volume > 0 ? new Intl.NumberFormat('sv-SE').format(h.volume) : '—'}</td>
        <td>${h.estimatedRevenue > 0 ? formatSEK(h.estimatedRevenue) : '—'}</td>
      </tr>`,
        )
        .join('')}
      <tr style="font-weight:700;background:#f5f7f4">
        <td colspan="3">Totalt</td>
        <td>${new Intl.NumberFormat('sv-SE').format(plan.harvestSchedule.reduce((s, h) => s + h.volume, 0))}</td>
        <td>${formatSEK(financials.totalRevenue)}</td>
      </tr>
    </tbody>
  </table>

  <h2>Riskbedömning</h2>
  <table>
    <thead>
      <tr><th>Skifte</th><th>Risk</th><th>Nivå</th><th>Beskrivning</th><th>Åtgärd</th></tr>
    </thead>
    <tbody>
      ${plan.riskAssessment
        .map(
          (r) => `<tr>
        <td>${r.parcel}</td>
        <td>${r.riskType}</td>
        <td><span class="badge risk-${r.level}">${priorityLabel[r.level]}</span></td>
        <td style="font-size:9pt">${r.description}</td>
        <td style="font-size:9pt">${r.mitigation}</td>
      </tr>`,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Ekonomisk sammanfattning (10 år)</h2>
  <div class="overview-grid">
    <div class="overview-card">
      <div class="value">${formatSEK(financials.totalRevenue)}</div>
      <div class="label">Beräknade intäkter</div>
    </div>
    <div class="overview-card">
      <div class="value">${formatSEK(financials.totalCosts)}</div>
      <div class="label">Beräknade kostnader</div>
    </div>
    <div class="overview-card">
      <div class="value">${formatSEK(financials.netIncome)}</div>
      <div class="label">Nettoresultat</div>
    </div>
    <div class="overview-card">
      <div class="value">${formatSEK(financials.annualGrowthValue)}</div>
      <div class="label">Årlig tillväxtvärde</div>
    </div>
  </div>

  <div class="disclaimer">
    <strong>Observera:</strong> Denna skogsbruksplan är maskinellt genererad baserat på tillgänglig data och utgör ett beslutsunderlag.
    Alla siffror är uppskattningar. Rådgör alltid med en certifierad skogsbruksplanerare innan större åtgärder genomförs.
    Planen uppfyller inte formella krav enligt Skogsstyrelsen utan komplettering av fältinventering.
  </div>

  <div class="footer">
    Genererad av BeetleSense.ai &bull; ${plan.generatedAt.toLocaleDateString('sv-SE')} &bull; Plan-ID: ${plan.id}
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

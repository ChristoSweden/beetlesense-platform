import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, TreePine, AlertTriangle, Crosshair, ArrowRight } from 'lucide-react';

// ─── Types ───

interface ParcelData {
  name: string;
  healthScore: number;
  ndvi: number;
  ndviChange: number;
  stressedTrees: number;
  totalTrees: number;
  beetleRisk: 'low' | 'moderate' | 'elevated' | 'high' | 'critical';
  canopyTempDelta: number; // °C warmer than baseline
  chlorophyllDeficit: number; // % below normal
  weatherDrought: boolean;
  lastSurveyDays: number;
  regionName?: string;
}

interface ForestNarrativeProps {
  data?: ParcelData;
}

// ─── Urgency helpers ───

type Urgency = 'green' | 'amber' | 'red';

function getUrgency(data: ParcelData): Urgency {
  if (data.beetleRisk === 'critical' || data.beetleRisk === 'high' || data.stressedTrees > data.totalTrees * 0.05) {
    return 'red';
  }
  if (data.beetleRisk === 'elevated' || data.beetleRisk === 'moderate' || data.healthScore < 65 || data.weatherDrought) {
    return 'amber';
  }
  return 'green';
}

const urgencyColors: Record<Urgency, { border: string; bg: string; accent: string }> = {
  green: { border: '#4ade8030', bg: '#4ade8008', accent: '#4ade80' },
  amber: { border: '#fbbf2430', bg: '#fbbf2408', accent: '#fbbf24' },
  red: { border: '#ef444430', bg: '#ef444408', accent: '#ef4444' },
};

const riskLabels: Record<string, string> = {
  low: 'låg',
  moderate: 'måttlig',
  elevated: 'förhöjd',
  high: 'hög',
  critical: 'kritisk',
};

// ─── Narrative generation ───

function generateSummary(d: ParcelData): string {
  const urgency = getUrgency(d);

  if (urgency === 'red') {
    const stressPct = ((d.stressedTrees / d.totalTrees) * 100).toFixed(1);
    return `${d.name} visar oroande tecken. ${d.stressedTrees} träd (${stressPct}%) uppvisar stress — klorofyllnivåerna är ${d.chlorophyllDeficit}% lägre och krontemperaturen ${d.canopyTempDelta.toFixed(1)}°C varmare än normalt. Barkborrerisk: ${riskLabels[d.beetleRisk]}.`;
  }

  if (urgency === 'amber') {
    return `${d.name} mår överlag bra, men vi ser tidiga tecken som kräver uppmärksamhet. ${d.weatherDrought ? 'Vattenstress pga torka förstärker riskerna.' : ''} Hälsopoäng ${d.healthScore}/100, NDVI-förändring ${d.ndviChange > 0 ? '+' : ''}${(d.ndviChange * 100).toFixed(1)}%.`;
  }

  return `${d.name} mår bra. Hälsopoäng ${d.healthScore}/100 med stabila vegetationsindex. Inga tecken på barkborreangrepp eller betydande stress.`;
}

function generateFindings(d: ParcelData): string[] {
  const findings: string[] = [];

  if (d.ndviChange < -0.05) {
    findings.push(`NDVI har sjunkit ${Math.abs(d.ndviChange * 100).toFixed(1)}% sedan senaste mätningen — indikerar minskande klorofyll.`);
  } else if (d.ndviChange > 0.02) {
    findings.push(`NDVI har ökat ${(d.ndviChange * 100).toFixed(1)}% — positiv tillväxttrend.`);
  } else {
    findings.push(`Vegetationsindex (NDVI) är stabilt: ${d.ndvi.toFixed(2)}.`);
  }

  if (d.stressedTrees > 0) {
    findings.push(`${d.stressedTrees} av ${d.totalTrees.toLocaleString('sv-SE')} träd visar stressymptom (${d.chlorophyllDeficit}% lägre klorofyll, ${d.canopyTempDelta.toFixed(1)}°C varmare kronor).`);
  }

  if (d.weatherDrought) {
    findings.push(`Pågående torrperiod ökar risken för sekundära skadegörare.`);
  }

  if (d.lastSurveyDays > 30) {
    findings.push(`Senaste inventering: ${d.lastSurveyDays} dagar sedan. Vi rekommenderar uppföljning.`);
  }

  return findings;
}

function generateMeaning(d: ParcelData): string {
  const urgency = getUrgency(d);

  if (urgency === 'red') {
    return `Mönstret liknar det som föregick barkborreangrepp i regionen 2024. Granar med sänkt klorofyll och förhöjd krontemperatur är ofta de första att angripas. Utan åtgärd kan spridningen accelerera exponentiellt.`;
  }

  if (urgency === 'amber') {
    return `Stressnivåerna är inte alarmerande ännu, men bör bevakas. Historiskt har liknande värden i ${d.regionName ?? 'Småland'} utvecklats till angrepp inom 4–6 veckor om temperaturerna stiger.`;
  }

  return `Beståndet visar god vitalitet. Nuvarande hälsonivåer indikerar att träden har god motståndskraft mot barkborre och torkstress.`;
}

function generateRecommendation(d: ParcelData): string {
  const urgency = getUrgency(d);

  if (urgency === 'red') {
    return `Vi rekommenderar en riktad drönarscan inom 2 veckor fokuserad på de stressade träden. Förbered för eventuell sanering av angripna träd — tidig avverkning kan rädda omgivande bestånd.`;
  }

  if (urgency === 'amber') {
    return `Boka en uppföljande screening inom 3–4 veckor. Övervaka temperatur och nederbörd. Överväg att markera de stressade områdena för prioriterad fältkontroll.`;
  }

  return `Fortsätt med planerade inventeringar enligt schema. Nästa rekommenderade screening: om ${Math.max(1, 12 - Math.floor(d.lastSurveyDays / 7))} veckor.`;
}

// ─── Demo data ───

const DEMO_DATA: ParcelData = {
  name: 'Norra Skogen',
  healthScore: 71,
  ndvi: 0.72,
  ndviChange: -0.06,
  stressedTrees: 23,
  totalTrees: 14180,
  beetleRisk: 'elevated',
  canopyTempDelta: 2.1,
  chlorophyllDeficit: 18,
  weatherDrought: false,
  lastSurveyDays: 18,
  regionName: 'Kronoberg',
};

// ─── Main Component ───

export function ForestNarrative({ data }: ForestNarrativeProps) {
  const [expanded, setExpanded] = useState(false);
  const d = data ?? DEMO_DATA;
  const urgency = getUrgency(d);
  const colors = urgencyColors[urgency];

  const summary = generateSummary(d);
  const findings = generateFindings(d);
  const meaning = generateMeaning(d);
  const recommendation = generateRecommendation(d);

  return (
    <div
      className="rounded-xl border overflow-hidden"
      style={{ background: 'var(--bg2)', borderColor: colors.border }}
    >
      {/* Urgency sidebar + header */}
      <div className="flex">
        {/* Color sidebar */}
        <div className="w-1 flex-shrink-0" style={{ background: colors.accent }} />

        <div className="flex-1">
          {/* Header */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ background: `${colors.accent}15`, color: colors.accent }}
              >
                <BookOpen size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text)]">Skogsberättelse</h3>
                <p className="text-[10px] text-[var(--text3)]">{d.name} — senast uppdaterad</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                style={{ background: `${colors.accent}15`, color: colors.accent }}
              >
                {urgency === 'green' ? 'Friskt' : urgency === 'amber' ? 'Bevaka' : 'Åtgärda'}
              </span>
              {expanded ? (
                <ChevronUp size={14} className="text-[var(--text3)]" />
              ) : (
                <ChevronDown size={14} className="text-[var(--text3)]" />
              )}
            </div>
          </button>

          {/* Summary — always visible */}
          <div className="px-4 pb-3">
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              {summary}
            </p>
          </div>

          {/* Expanded sections */}
          {expanded && (
            <div className="px-4 pb-4 space-y-4">
              {/* Vad vi hittade */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Crosshair size={13} style={{ color: colors.accent }} />
                  <h4 className="text-[11px] font-semibold text-[var(--text)] uppercase tracking-wider">
                    Vad vi hittade
                  </h4>
                </div>
                <ul className="space-y-1.5">
                  {findings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: colors.accent }}
                      />
                      <span className="text-[11px] text-[var(--text2)] leading-relaxed">{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Vad det betyder */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <TreePine size={13} style={{ color: colors.accent }} />
                  <h4 className="text-[11px] font-semibold text-[var(--text)] uppercase tracking-wider">
                    Vad det betyder
                  </h4>
                </div>
                <p className="text-[11px] text-[var(--text2)] leading-relaxed pl-5">
                  {meaning}
                </p>
              </div>

              {/* Vad du bör göra */}
              <div
                className="p-3 rounded-lg"
                style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight size={13} style={{ color: colors.accent }} />
                  <h4 className="text-[11px] font-semibold text-[var(--text)] uppercase tracking-wider">
                    Vad du bör göra
                  </h4>
                </div>
                <p className="text-[11px] text-[var(--text2)] leading-relaxed pl-5">
                  {recommendation}
                </p>
              </div>

              {/* Data summary row */}
              <div className="grid grid-cols-4 gap-2 pt-1">
                {[
                  { label: 'Hälsa', value: `${d.healthScore}/100` },
                  { label: 'NDVI', value: d.ndvi.toFixed(2) },
                  { label: 'Stressade', value: String(d.stressedTrees) },
                  { label: 'Barkborre', value: riskLabels[d.beetleRisk] },
                ].map((item) => (
                  <div key={item.label} className="text-center p-2 rounded-lg" style={{ background: 'var(--bg)' }}>
                    <p className="text-[10px] font-mono font-semibold text-[var(--text)]">{item.value}</p>
                    <p className="text-[8px] text-[var(--text3)] mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
export default ForestNarrative;

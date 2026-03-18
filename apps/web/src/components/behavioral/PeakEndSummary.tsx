import { useState } from 'react';
import { AlertTriangle, Shield, Axe, Sparkles, ChevronDown, ChevronUp, TreePine, Clock } from 'lucide-react';

// ─── Types ───

interface SurveyFinding {
  activeInfestations: number;
  atRiskTrees: number;
  healthyTrees: number;
  totalTrees: number;
  estimatedSavings: number; // SEK
  detectionAdvantageWeeks: number;
  projectedLossWithout: number; // number of trees
  recommendedAction: string;
  deadlineDays: number;
  parcelName: string;
}

interface PeakEndSummaryProps {
  finding?: SurveyFinding;
}

// ─── Demo data ───

const DEMO_FINDING: SurveyFinding = {
  activeInfestations: 3,
  atRiskTrees: 8,
  healthyTrees: 14177,
  totalTrees: 14188,
  estimatedSavings: 48000,
  detectionAdvantageWeeks: 3,
  projectedLossWithout: 42,
  recommendedAction: 'Avverka angripna och riskträd',
  deadlineDays: 14,
  parcelName: 'Norra Skogen',
};

// ─── Main Component ───

export function PeakEndSummary({ finding }: PeakEndSummaryProps) {
  const [expanded, setExpanded] = useState(true);
  const f = finding ?? DEMO_FINDING;

  const healthyPct = ((f.healthyTrees / f.totalTrees) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Peak — worst finding, attention-grabbing */}
      <div className="p-4" style={{ background: '#ef444410', borderBottom: '1px solid #ef444420' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#ef444420' }}>
            <AlertTriangle size={20} className="text-[#ef4444]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text)] mb-1">
              {f.activeInfestations} {f.activeInfestations === 1 ? 'gran' : 'granar'} visar aktivt angrepp
            </h3>
            <p className="text-xs text-[var(--text2)]">
              {f.parcelName} — identifierat vid senaste screening
            </p>
          </div>
        </div>
      </div>

      {/* Context — reassure */}
      <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#4ade8015' }}>
            <Shield size={20} className="text-[#4ade80]" />
          </div>
          <div>
            <p className="text-xs text-[var(--text2)] leading-relaxed">
              Resten av beståndet —{' '}
              <span className="font-semibold text-[var(--text)]">
                {f.healthyTrees.toLocaleString('sv-SE')} träd ({healthyPct}%)
              </span>
              {' '}— är friskt. Angreppet är begränsat och hanterbart vid snabb insats.
            </p>
          </div>
        </div>
      </div>

      {/* Action — clear directive */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left hover:bg-[var(--bg3)] transition-colors"
      >
        <div className="p-4" style={{ borderBottom: expanded ? '1px solid var(--border)' : 'none' }}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fbbf2415' }}>
              <Axe size={20} className="text-[#fbbf24]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-[var(--text)]">
                  {f.recommendedAction}
                </p>
                {expanded ? (
                  <ChevronUp size={14} className="text-[var(--text3)]" />
                ) : (
                  <ChevronDown size={14} className="text-[var(--text3)]" />
                )}
              </div>
              <p className="text-xs text-[var(--text2)] mt-1">
                Avverka {f.activeInfestations} angripna + {f.atRiskTrees} riskträd inom{' '}
                <span className="font-semibold text-[#fbbf24]">{f.deadlineDays} dagar</span>
                {' '}→ rädda{' '}
                <span className="font-semibold text-[#4ade80]">
                  {f.estimatedSavings.toLocaleString('sv-SE')} kr
                </span>
              </p>
            </div>
          </div>
        </div>
      </button>

      {expanded && (
        <>
          {/* Timeline breakdown */}
          <div className="px-4 py-3 space-y-3">
            <div className="flex items-center gap-2">
              <Clock size={12} className="text-[var(--text3)]" />
              <span className="text-[10px] font-semibold text-[var(--text)] uppercase tracking-wider">
                Tidsplan
              </span>
            </div>
            <div className="relative pl-4 space-y-3">
              {/* Timeline line */}
              <div className="absolute left-[6.5px] top-1 bottom-1 w-px bg-[var(--border)]" />

              <div className="flex items-start gap-3 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[#ef4444] flex-shrink-0 mt-0.5 z-10" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text)]">Dag 1–3: Märk och planera</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Markera {f.activeInfestations + f.atRiskTrees} träd i fält. Kontakta entreprenör.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[#fbbf24] flex-shrink-0 mt-0.5 z-10" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text)]">Dag 4–10: Avverkning</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Avverka och bark av angripna stammar. Transportera ut ur skogen.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-[#4ade80] flex-shrink-0 mt-0.5 z-10" />
                <div>
                  <p className="text-[11px] font-medium text-[var(--text)]">Dag 11–14: Uppföljning</p>
                  <p className="text-[10px] text-[var(--text3)]">
                    Ny drönarscan för att verifiera att spridningen stoppats.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Empowerment ending — peak-end rule */}
          <div className="mx-4 mb-4 p-4 rounded-lg" style={{ background: '#4ade8008', border: '1px solid #4ade8020' }}>
            <div className="flex items-start gap-3">
              <Sparkles size={18} className="text-[#4ade80] flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs text-[var(--text2)] leading-relaxed">
                  <span className="font-semibold text-[#4ade80]">
                    Du upptäckte detta {f.detectionAdvantageWeeks} veckor innan det var synligt för blotta ögat.
                  </span>
                  {' '}Utan skogsröntgen hade uppskattningsvis {f.projectedLossWithout}+ träd drabbats innan
                  angreppet märkts — en potentiell förlust på{' '}
                  {(f.projectedLossWithout * 1200).toLocaleString('sv-SE')} kr.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <TreePine size={12} className="text-[#4ade80]" />
                  <p className="text-[10px] text-[var(--text3)]">
                    Tidig upptäckt gör skillnad. Din skog är skyddad.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-px mx-4 mb-4 rounded-lg overflow-hidden" style={{ background: 'var(--border)' }}>
            {[
              { label: 'Angripna', value: String(f.activeInfestations), color: '#ef4444' },
              { label: 'I riskzonen', value: String(f.atRiskTrees), color: '#fbbf24' },
              { label: 'Friska', value: f.healthyTrees.toLocaleString('sv-SE'), color: '#4ade80' },
            ].map((stat) => (
              <div key={stat.label} className="p-3 text-center" style={{ background: 'var(--bg)' }}>
                <p className="text-sm font-mono font-bold" style={{ color: stat.color }}>
                  {stat.value}
                </p>
                <p className="text-[9px] text-[var(--text3)] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

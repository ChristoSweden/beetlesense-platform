import { useState, useCallback } from 'react';
import {
  Settings2,
  ChevronDown,
  ChevronUp,
  Info,
  Undo2,
  Sliders,
  Target,
  Bell,
  Brain,
} from 'lucide-react';

// ─── Types ───

type RiskTolerance = 'försiktig' | 'balanserad' | 'risktagande';
type ManagementGoal = 'ekonomi' | 'ekologi' | 'balans';
type AlertFrequency = 'omedelbart' | 'dagligen' | 'veckovis';
type DecisionMode = 'visa-alternativ' | 'automatisera';

interface Recommendation {
  id: string;
  title: string;
  explanation: string;
  alternatives: { label: string; description: string }[];
}

interface ScarfAutonomyProps {
  riskTolerance?: RiskTolerance;
  managementGoal?: ManagementGoal;
  alertFrequency?: AlertFrequency;
  decisionMode?: DecisionMode;
  onRiskToleranceChange?: (value: RiskTolerance) => void;
  onManagementGoalChange?: (value: ManagementGoal) => void;
  onAlertFrequencyChange?: (value: AlertFrequency) => void;
  onDecisionModeChange?: (value: DecisionMode) => void;
  onUndo?: () => void;
  lastAction?: string;
  recommendations?: Recommendation[];
  className?: string;
}

// ─── Helpers ───

const RISK_LEVELS: { key: RiskTolerance; label: string; color: string }[] = [
  { key: 'försiktig', label: 'Försiktig', color: '#3b82f6' },
  { key: 'balanserad', label: 'Balanserad', color: '#eab308' },
  { key: 'risktagande', label: 'Risktagande', color: '#ef4444' },
];

const GOALS: { key: ManagementGoal; label: string; icon: React.ReactNode }[] = [
  { key: 'ekonomi', label: 'Ekonomi', icon: <span className="text-[10px]">💰</span> },
  { key: 'ekologi', label: 'Ekologi', icon: <span className="text-[10px]">🌿</span> },
  { key: 'balans', label: 'Balans', icon: <span className="text-[10px]">⚖️</span> },
];

const ALERT_OPTIONS: { key: AlertFrequency; label: string }[] = [
  { key: 'omedelbart', label: 'Omedelbart' },
  { key: 'dagligen', label: 'Dagligen' },
  { key: 'veckovis', label: 'Veckovis' },
];

const DECISION_MODES: { key: DecisionMode; label: string; description: string }[] = [
  { key: 'visa-alternativ', label: 'Visa alternativ', description: 'AI föreslår, du väljer' },
  { key: 'automatisera', label: 'Automatisera', description: 'AI agerar åt dig' },
];

function defaultRecommendations(): Recommendation[] {
  return [
    {
      id: 'rec-1',
      title: 'Kontrollera feromonfällor i skifte Norra',
      explanation:
        'Temperaturen har legat över 18°C i 3 dagar. Historisk data visar att svärmning börjar under dessa förhållanden i 87% av fallen.',
      alternatives: [
        { label: 'A: Kontrollera fällor idag', description: 'Rekommenderat — tidig upptäckt' },
        { label: 'B: Vänta 3 dagar', description: 'Risk att missa tidig svärmning' },
        { label: 'C: Beställ drönarflygning', description: 'Mer data, högre kostnad' },
      ],
    },
  ];
}

// ─── Component ───

export function ScarfAutonomy(props: ScarfAutonomyProps) {
  const {
    riskTolerance: riskProp,
    managementGoal: goalProp,
    alertFrequency: alertProp,
    decisionMode: modeProp,
    onRiskToleranceChange,
    onManagementGoalChange,
    onAlertFrequencyChange,
    onDecisionModeChange,
    onUndo,
    lastAction,
    recommendations: recsProp,
    className = '',
  } = props;

  const [risk, setRisk] = useState<RiskTolerance>(riskProp ?? 'balanserad');
  const [goal, setGoal] = useState<ManagementGoal>(goalProp ?? 'balans');
  const [alert, setAlert] = useState<AlertFrequency>(alertProp ?? 'dagligen');
  const [mode, setMode] = useState<DecisionMode>(modeProp ?? 'visa-alternativ');
  const [expanded, setExpanded] = useState(false);
  const [expandedRec, setExpandedRec] = useState<string | null>(null);

  const recs = recsProp ?? defaultRecommendations();

  const handleRisk = useCallback(
    (v: RiskTolerance) => {
      setRisk(v);
      onRiskToleranceChange?.(v);
    },
    [onRiskToleranceChange]
  );
  const handleGoal = useCallback(
    (v: ManagementGoal) => {
      setGoal(v);
      onManagementGoalChange?.(v);
    },
    [onManagementGoalChange]
  );
  const handleAlert = useCallback(
    (v: AlertFrequency) => {
      setAlert(v);
      onAlertFrequencyChange?.(v);
    },
    [onAlertFrequencyChange]
  );
  const handleMode = useCallback(
    (v: DecisionMode) => {
      setMode(v);
      onDecisionModeChange?.(v);
    },
    [onDecisionModeChange]
  );

  const currentRisk = RISK_LEVELS.find((r) => r.key === risk)!;

  return (
    <div
      className={`rounded-xl border border-[var(--border)] p-4 ${className}`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[var(--green)]/10">
            <Settings2 size={16} className="text-[var(--green)]" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">Dina preferenser</h3>
            <span className="text-[10px] text-[var(--text3)]">Du bestämmer — AI:n anpassar sig</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          aria-label={expanded ? 'Dölj inställningar' : 'Visa alla inställningar'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Risk tolerance */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          <Sliders size={10} className="text-[var(--text3)]" />
          <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide">
            Risktolerans
          </span>
        </div>
        <div className="flex gap-1">
          {RISK_LEVELS.map((r) => (
            <button
              key={r.key}
              onClick={() => handleRisk(r.key)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                risk === r.key
                  ? 'text-white shadow-sm'
                  : 'text-[var(--text3)] bg-[var(--bg3)] hover:bg-[var(--bg3)]/80'
              }`}
              style={risk === r.key ? { backgroundColor: r.color } : {}}
            >
              {r.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text3)] mt-1">
          {risk === 'försiktig' && 'Larmar tidigt — fler notiser, färre missade hot'}
          {risk === 'balanserad' && 'Balanserade trösklar — standard rekommendation'}
          {risk === 'risktagande' && 'Larmar sent — färre notiser, men risk att missa tidiga tecken'}
        </p>
      </div>

      {/* Management goal */}
      <div className="mb-3">
        <div className="flex items-center gap-1 mb-1.5">
          <Target size={10} className="text-[var(--text3)]" />
          <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide">
            Förvaltningsm&aring;l
          </span>
        </div>
        <div className="flex gap-1">
          {GOALS.map((g) => (
            <button
              key={g.key}
              onClick={() => handleGoal(g.key)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1 ${
                goal === g.key
                  ? 'bg-[var(--green)] text-white shadow-sm'
                  : 'text-[var(--text3)] bg-[var(--bg3)] hover:bg-[var(--bg3)]/80'
              }`}
            >
              {g.icon} {g.label}
            </button>
          ))}
        </div>
      </div>

      {expanded && (
        <div className="pt-3 border-t border-[var(--border)] space-y-3">
          {/* Alert frequency */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Bell size={10} className="text-[var(--text3)]" />
              <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide">
                Notisfrekvens
              </span>
            </div>
            <div className="flex gap-1">
              {ALERT_OPTIONS.map((a) => (
                <button
                  key={a.key}
                  onClick={() => handleAlert(a.key)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    alert === a.key
                      ? 'bg-[var(--green)] text-white shadow-sm'
                      : 'text-[var(--text3)] bg-[var(--bg3)] hover:bg-[var(--bg3)]/80'
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Decision mode */}
          <div>
            <div className="flex items-center gap-1 mb-1.5">
              <Brain size={10} className="text-[var(--text3)]" />
              <span className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide">
                Beslutsläge
              </span>
            </div>
            <div className="flex gap-1">
              {DECISION_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => handleMode(m.key)}
                  className={`flex-1 py-2 rounded-lg text-[10px] transition-all ${
                    mode === m.key
                      ? 'bg-[var(--green)] text-white shadow-sm'
                      : 'text-[var(--text3)] bg-[var(--bg3)] hover:bg-[var(--bg3)]/80'
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-[9px] opacity-70">{m.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Recommendations with alternatives */}
          {recs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">
                Rekommendationer
              </p>
              {recs.map((rec) => (
                <div key={rec.id} className="p-2 rounded-lg bg-[var(--bg3)] mb-2">
                  <p className="text-xs font-medium text-[var(--text)] mb-1">{rec.title}</p>
                  <button
                    onClick={() => setExpandedRec(expandedRec === rec.id ? null : rec.id)}
                    className="flex items-center gap-1 text-[10px] text-[var(--green)] hover:underline mb-1"
                  >
                    <Info size={10} />
                    Varför rekommenderar vi detta?
                  </button>
                  {expandedRec === rec.id && (
                    <p className="text-[10px] text-[var(--text3)] mb-2 pl-3 border-l border-[var(--green)]/30">
                      {rec.explanation}
                    </p>
                  )}
                  <div className="space-y-1">
                    {rec.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between p-1.5 rounded text-[10px] cursor-pointer transition-colors ${
                          i === 0
                            ? 'bg-[var(--green)]/10 text-[var(--text)] border border-[var(--green)]/20'
                            : 'text-[var(--text3)] hover:bg-[var(--bg2)]'
                        }`}
                      >
                        <span className="font-medium">{alt.label}</span>
                        <span className="text-[9px]">{alt.description}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-[var(--text3)] mt-1.5 italic">
                    Alternativ: A, B, C — du väljer
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Undo action */}
          {lastAction && (
            <button
              onClick={onUndo}
              className="flex items-center gap-2 w-full p-2 rounded-lg border border-[var(--border)] text-xs text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              <Undo2 size={14} className="text-[var(--green)]" />
              <span>Ångra senaste åtgärd: {lastAction}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
export default ScarfAutonomy;

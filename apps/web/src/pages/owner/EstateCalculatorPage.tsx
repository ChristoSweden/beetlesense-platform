import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calculator, ChevronRight, Check, AlertTriangle, Clock } from 'lucide-react';
import { calculateEstateScenarios, formatSEK, type EstateInputs, type EstateResult } from '@/services/estateCalculatorService';

const DEFAULT_INPUTS: EstateInputs = {
  forestValue: 8_500_000,
  numberOfHeirs: 2,
  annualIncome: 287_000,
  existingLoans: 0,
};

export default function EstateCalculatorPage() {
  const [inputs, setInputs] = useState<EstateInputs>(DEFAULT_INPUTS);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const result: EstateResult = useMemo(() => calculateEstateScenarios(inputs), [inputs]);

  const updateInput = (key: keyof EstateInputs, value: string) => {
    const num = parseInt(value.replace(/\D/g, ''), 10);
    if (!isNaN(num)) {
      setInputs(prev => ({ ...prev, [key]: num }));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to="/owner/dashboard"
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-[var(--border)] hover:bg-[var(--bg3)] transition-colors"
          >
            <ArrowLeft size={16} className="text-[var(--text2)]" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-purple-500/10">
              <Calculator size={18} className="text-purple-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text)]">Estate Calculator</h1>
              <p className="text-[11px] text-[var(--text3)]">Succession planning scenarios</p>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="rounded-xl p-5 border border-[var(--border)] mb-5" style={{ background: 'var(--bg2)' }}>
          <h2 className="text-xs font-semibold text-[var(--text)] mb-4">Your forest property</h2>
          <div className="space-y-3">
            {[
              { key: 'forestValue' as const, label: 'Forest value (SEK)', placeholder: '8500000' },
              { key: 'numberOfHeirs' as const, label: 'Number of heirs', placeholder: '2' },
              { key: 'annualIncome' as const, label: 'Annual income (SEK)', placeholder: '287000' },
              { key: 'existingLoans' as const, label: 'Existing loans (SEK)', placeholder: '0' },
            ].map(field => (
              <div key={field.key}>
                <label className="text-[10px] uppercase tracking-wider text-[var(--text3)] block mb-1">{field.label}</label>
                <input
                  type="text"
                  value={inputs[field.key].toLocaleString('sv-SE')}
                  onChange={e => updateInput(field.key, e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] text-sm text-[var(--text)] outline-none focus:border-[var(--green)] transition-colors"
                  style={{ background: 'var(--bg)', fontFamily: "'DM Mono', monospace" }}
                  placeholder={field.placeholder}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Scenarios */}
        <h2 className="text-[10px] font-black text-[var(--text3)] uppercase tracking-[0.2em] mb-3">Scenarios ({result.scenarios.length})</h2>
        <div className="space-y-3">
          {result.scenarios.map((scenario, i) => {
            const isRecommended = i === result.recommendedIndex;
            const isExpanded = expandedIndex === i;
            return (
              <div
                key={i}
                className={`rounded-xl border transition-all ${isRecommended ? 'border-[var(--green)] ring-1 ring-[var(--green)]/20' : 'border-[var(--border)]'}`}
                style={{ background: 'var(--bg2)' }}
              >
                <button
                  onClick={() => setExpandedIndex(isExpanded ? null : i)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-[var(--text)]">{scenario.name}</h3>
                      {isRecommended && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--green)]/10 text-[var(--green)]">
                          Recommended
                        </span>
                      )}
                    </div>
                    <ChevronRight size={14} className={`text-[var(--text3)] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                  <p className="text-xs text-[var(--text3)] leading-relaxed mb-3">{scenario.description}</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Tax</p>
                      <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {scenario.taxImplications.totalTax === 0 ? '0 kr' : formatSEK(scenario.taxImplications.totalTax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Income/heir</p>
                      <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {formatSEK(scenario.annualIncomePerHeir)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text3)]">Timeline</p>
                      <p className="text-sm font-bold text-[var(--text)]" style={{ fontFamily: "'DM Mono', monospace" }}>
                        {scenario.timelineMonths === 0 ? 'N/A' : `${scenario.timelineMonths} mo`}
                      </p>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--border)] pt-3 space-y-3">
                    <p className="text-xs text-[var(--text3)] italic">{scenario.taxImplications.notes}</p>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-[var(--green)] font-bold mb-1">Pros</h4>
                      <ul className="space-y-1">
                        {scenario.pros.map((pro, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-[var(--text2)]">
                            <Check size={11} className="text-[var(--green)] mt-0.5 shrink-0" />
                            {pro}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-red-500 font-bold mb-1">Cons</h4>
                      <ul className="space-y-1">
                        {scenario.cons.map((con, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-[var(--text2)]">
                            <AlertTriangle size={11} className="text-red-400 mt-0.5 shrink-0" />
                            {con}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-blue-500 font-bold mb-1">Recommendations</h4>
                      <ul className="space-y-1">
                        {scenario.recommendations.map((rec, j) => (
                          <li key={j} className="flex items-start gap-1.5 text-xs text-[var(--text2)]">
                            <Clock size={11} className="text-blue-400 mt-0.5 shrink-0" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Disclaimer */}
        <p className="text-[10px] text-[var(--text3)] text-center mt-6 italic">
          For illustration purposes. Tax calculations are simplified. Consult a tax advisor for your specific situation.
        </p>
      </div>
    </div>
  );
}

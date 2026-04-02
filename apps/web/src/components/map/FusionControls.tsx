import { useState } from 'react';
import { useFusionStore, type FusionMode } from '@/stores/fusionStore';
import { Sparkles, HelpCircle, ChevronDown, Eye } from 'lucide-react';

// ─── Mode definitions ───

interface ModeOption {
  id: FusionMode;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
}

const MODES: ModeOption[] = [
  {
    id: 'standard',
    label: 'Standard',
    shortLabel: 'STD',
    description: 'Standardvy med traditionella kartlager.',
    icon: '\uD83D\uDDFA\uFE0F',
  },
  {
    id: 'forest-pulse',
    label: 'Forest Pulse\u2122',
    shortLabel: 'FP',
    description: 'HSV-f\u00e4rgfusion: art (nyans), h\u00e4lsa (m\u00e4ttnad), v\u00e4rde (ljusstyrka).',
    icon: '\uD83C\uDF32',
  },
  {
    id: 'risk-flow',
    label: 'Risk Flow',
    shortLabel: 'RF',
    description: 'Animerade partiklar visar riskspridning fr\u00e5n k\u00e4nda k\u00e4llor.',
    icon: '\uD83C\uDF0A',
  },
  {
    id: 'temporal',
    label: 'Temporal Rings',
    shortLabel: 'TR',
    description: '\u00c5rsringsvisualisering: 10 \u00e5rs tillv\u00e4xt- och h\u00e4lsohistorik.',
    icon: '\uD83C\uDF33',
  },
  {
    id: 'composite',
    label: 'Composite',
    shortLabel: 'ALL',
    description: 'Forest Intelligence Score: v\u00e4gd kombination av alla dimensioner.',
    icon: '\u2728',
  },
];

// ─── Legend components ───

function ForestPulseLegend() {
  return (
    <div className="space-y-3">
      {/* Hue → Species */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Nyans = Art</div>
        <div className="flex gap-1.5 items-center">
          {[
            { color: '#4ade80', label: 'Gran' },
            { color: '#22d3ee', label: 'Tall' },
            { color: '#fbbf24', label: 'Bj\u00f6rk' },
            { color: '#fb923c', label: 'Ek' },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ background: s.color }} />
              <span className="text-[10px] text-[var(--text2)]">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Saturation → Health */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">M\u00e4ttnad = H\u00e4lsa</div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 flex-1 rounded-sm" style={{
            background: 'linear-gradient(to right, #555555, #4ade80)',
          }} />
          <div className="flex justify-between w-full text-[9px] text-[var(--text3)]">
            <span>Stressad</span>
            <span>Frisk</span>
          </div>
        </div>
      </div>
      {/* Value → Brightness */}
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Ljusstyrka = V\u00e4rde</div>
        <div className="flex items-center gap-1">
          <div className="h-2.5 flex-1 rounded-sm" style={{
            background: 'linear-gradient(to right, var(--bg2), #4ade80)',
          }} />
          <div className="flex justify-between w-full text-[9px] text-[var(--text3)]">
            <span>L\u00e5gt</span>
            <span>H\u00f6gt</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function RiskFlowLegend() {
  return (
    <div className="space-y-2">
      {[
        { color: '#ff3c3c', label: 'Barkborre', desc: 'Fl\u00f6dar fr\u00e5n utbrott' },
        { color: '#00dcff', label: 'Storm', desc: 'Fr\u00e5n v\u00e4ster' },
        { color: '#ffb428', label: 'Torka', desc: 'Stresszoner' },
      ].map((r) => (
        <div key={r.label} className="flex items-center gap-2">
          <div className="relative w-4 h-4">
            <div className="absolute inset-0 rounded-full animate-ping" style={{ background: r.color, opacity: 0.3 }} />
            <div className="absolute inset-1 rounded-full" style={{ background: r.color }} />
          </div>
          <div>
            <div className="text-[10px] text-[var(--text)] font-medium">{r.label}</div>
            <div className="text-[9px] text-[var(--text3)]">{r.desc}</div>
          </div>
        </div>
      ))}
      <div className="mt-1 pt-1 border-t border-[var(--border)]">
        <div className="text-[9px] text-[var(--text3)]">
          Hastighet = Riskens br\u00e5dska<br />
          T\u00e4thet = Konfidensniv\u00e5
        </div>
      </div>
    </div>
  );
}

function TemporalLegend() {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Ringbredd = Tillv\u00e4xt</div>
        <div className="flex gap-1 items-end">
          {[2, 4, 6, 8, 10].map((h) => (
            <div key={h} className="w-4 rounded-sm bg-[var(--green)]" style={{ height: `${h}px`, opacity: 0.4 + h * 0.06 }} />
          ))}
          <span className="text-[9px] text-[var(--text3)] ml-1">L\u00e5g \u2192 H\u00f6g</span>
        </div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Ringf\u00e4rg = H\u00e4lsa</div>
        <div className="flex gap-0.5 items-center">
          {['#ef4444', '#fb923c', '#facc15', '#86efac', '#4ade80'].map((c) => (
            <div key={c} className="w-4 h-2.5 rounded-sm" style={{ background: c }} />
          ))}
          <span className="text-[9px] text-[var(--text3)] ml-1">Kritisk \u2192 Frisk</span>
        </div>
      </div>
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Yttre gl\u00f6d = Riskniv\u00e5</div>
        <div className="flex gap-2 items-center">
          {[
            { color: 'rgba(74,222,128,0.5)', label: 'S\u00e4ker' },
            { color: 'rgba(251,191,36,0.6)', label: 'Varning' },
            { color: 'rgba(239,68,68,0.7)', label: 'Fara' },
          ].map((g) => (
            <div key={g.label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full border" style={{ borderColor: g.color, boxShadow: `0 0 6px ${g.color}` }} />
              <span className="text-[9px] text-[var(--text3)]">{g.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CompositeLegend() {
  return (
    <div className="space-y-2">
      <div>
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Forest Intelligence Score</div>
        <div className="h-3 rounded-sm" style={{
          background: 'linear-gradient(to right, #8b1414, #fb9224, #facc15, #86efac, #4ade80)',
        }} />
        <div className="flex justify-between text-[9px] text-[var(--text3)] mt-0.5">
          <span>0</span>
          <span>30</span>
          <span>50</span>
          <span>70</span>
          <span>100</span>
        </div>
      </div>
      <div className="border-t border-[var(--border)] pt-1.5">
        <div className="text-[9px] uppercase tracking-widest text-[var(--text3)] mb-1">Viktning</div>
        <div className="space-y-0.5">
          {[
            { label: 'H\u00e4lsa', weight: 30 },
            { label: 'Risk (inv)', weight: 25 },
            { label: 'V\u00e4rde', weight: 20 },
            { label: 'Tillv\u00e4xt', weight: 15 },
            { label: 'Klimat', weight: 10 },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-1.5">
              <div className="h-1.5 rounded-full bg-[var(--green)]" style={{ width: `${f.weight * 2}px`, opacity: 0.3 + f.weight * 0.02 }} />
              <span className="text-[9px] text-[var(--text2)]">{f.label} <span className="text-[var(--text3)]">{f.weight}%</span></span>
            </div>
          ))}
        </div>
      </div>
      <div className="text-[9px] text-[var(--text3)]">
        Klicka p\u00e5 en cell f\u00f6r radardiagram
      </div>
    </div>
  );
}

// ─── Help overlay ───

function HelpOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-w-md w-full mx-4 rounded-2xl border border-[var(--border)] p-6 shadow-2xl"
        style={{ background: 'var(--surface)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold text-[var(--text)] mb-3">Vad ser jag?</h3>
        <div className="space-y-4 text-sm text-[var(--text2)]">
          <div>
            <h4 className="font-semibold text-[var(--green)] mb-1">Forest Pulse\u2122</h4>
            <p>Varje hexcell kodar tre dimensioner i en enda f\u00e4rg via HSV-modellen. Nyansen visar tr\u00e4dslag, m\u00e4ttnaden h\u00e4lsotillst\u00e5nd, och ljusstyrkan ekonomiskt v\u00e4rde. Som en MRI-fusion f\u00f6r skogen.</p>
          </div>
          <div>
            <h4 className="font-semibold text-[var(--green)] mb-1">Risk Flow</h4>
            <p>Animerade partiklar str\u00f6mmar fr\u00e5n k\u00e4nda riskkallor mot dina skiften. R\u00f6d = barkborre, cyan = storm, amber = torka. Snabbare partiklar = h\u00f6gre br\u00e5dska.</p>
          </div>
          <div>
            <h4 className="font-semibold text-[var(--green)] mb-1">Temporal Rings</h4>
            <p>\u00c5rsringar som p\u00e5 ett riktigt tr\u00e4d. Bredare ringar = b\u00e4ttre tillv\u00e4xt. F\u00e4rgen visar h\u00e4lsa det \u00e5ret. Yttre gl\u00f6den visar aktuell riskniv\u00e5.</p>
          </div>
          <div>
            <h4 className="font-semibold text-[var(--green)] mb-1">Composite</h4>
            <p>Forest Intelligence Score (0-100) v\u00e4ger samman h\u00e4lsa, risk, v\u00e4rde, tillv\u00e4xt och klimat. Klicka f\u00f6r ett radardiagram som bryter ned po\u00e4ngen.</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="mt-5 w-full py-2 rounded-lg bg-[var(--green)] text-[var(--bg)] font-semibold text-sm hover:brightness-110 transition-all"
        >
          F\u00f6rst\u00e5tt
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───

export function FusionControls() {
  const { mode, setMode, opacity, setOpacity, showHelp, toggleHelp } = useFusionStore();
  const [expanded, setExpanded] = useState(false);

  const activeMode = MODES.find((m) => m.id === mode) ?? MODES[0];

  return (
    <>
      <div
        className="absolute bottom-4 left-4 z-20 select-none"
        style={{ maxWidth: expanded ? '280px' : '200px' }}
      >
        <div
          className="rounded-xl border border-[var(--border)] shadow-2xl overflow-hidden transition-all duration-300"
          style={{ background: 'var(--surface)', backdropFilter: 'blur(12px)' }}
        >
          {/* Header with mode selector */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[var(--bg3)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-[var(--green)]" />
              <span className="text-xs font-semibold text-[var(--text)]">
                {activeMode.icon} {activeMode.label}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`text-[var(--text3)] transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            />
          </button>

          {expanded && (
            <div className="border-t border-[var(--border)]">
              {/* Mode buttons */}
              <div className="p-2 space-y-0.5">
                {MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left transition-all duration-200 ${
                      mode === m.id
                        ? 'bg-[var(--green)]/10 border border-[var(--green)]/30'
                        : 'hover:bg-[var(--bg3)] border border-transparent'
                    }`}
                  >
                    <span className="text-sm">{m.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[11px] font-medium ${mode === m.id ? 'text-[var(--green)]' : 'text-[var(--text)]'}`}>
                        {m.label}
                      </div>
                      <div className="text-[9px] text-[var(--text3)] truncate">{m.description}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Opacity slider */}
              {mode !== 'standard' && (
                <div className="px-3 py-2 border-t border-[var(--border)]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <Eye size={11} className="text-[var(--text3)]" />
                      <span className="text-[10px] text-[var(--text3)] uppercase tracking-wider">Opacitet</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text2)]">{Math.round(opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={opacity}
                    onChange={(e) => setOpacity(Number(e.target.value))}
                    className="w-full h-1 bg-[var(--bg3)] rounded-full appearance-none cursor-pointer accent-[var(--green)]"
                    aria-label="Fusion overlay opacity"
                  />
                </div>
              )}

              {/* Dynamic legend */}
              {mode !== 'standard' && (
                <div className="px-3 py-2 border-t border-[var(--border)]">
                  {mode === 'forest-pulse' && <ForestPulseLegend />}
                  {mode === 'risk-flow' && <RiskFlowLegend />}
                  {mode === 'temporal' && <TemporalLegend />}
                  {mode === 'composite' && <CompositeLegend />}
                </div>
              )}

              {/* Help button */}
              {mode !== 'standard' && (
                <div className="px-3 py-2 border-t border-[var(--border)]">
                  <button
                    onClick={toggleHelp}
                    className="flex items-center gap-1.5 text-[10px] text-[var(--text3)] hover:text-[var(--green)] transition-colors"
                  >
                    <HelpCircle size={12} />
                    <span>Vad ser jag?</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Help overlay */}
      {showHelp && <HelpOverlay onClose={toggleHelp} />}
    </>
  );
}

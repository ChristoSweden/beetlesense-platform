import { Shield, TrendingUp, Zap, AlertTriangle, TreePine, Clock, Coins } from 'lucide-react';
import type { PlantingStrategy as PlantingStrategyType, StrategyPreset } from '@/hooks/useClimateAdaptation';

interface Props {
  strategies: PlantingStrategyType[];
  selectedStrategy: StrategyPreset;
  onSelectStrategy: (preset: StrategyPreset) => void;
}

const PRESET_ICONS: Record<StrategyPreset, React.ReactNode> = {
  conservative: <Shield size={16} />,
  balanced: <TrendingUp size={16} />,
  aggressive: <Zap size={16} />,
};

const PRESET_COLORS: Record<StrategyPreset, { border: string; bg: string; text: string }> = {
  conservative: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  balanced: { border: 'border-[var(--green)]/30', bg: 'bg-[var(--green)]/10', text: 'text-[var(--green)]' },
  aggressive: { border: 'border-amber-500/30', bg: 'bg-amber-500/10', text: 'text-amber-400' },
};

// Color palette for species mix bars
const MIX_COLORS = [
  '#4ade80', '#34d399', '#2dd4bf', '#38bdf8', '#818cf8',
  '#c084fc', '#f472b6', '#fb923c', '#fbbf24', '#a3e635',
];

export function PlantingStrategy({ strategies, selectedStrategy, onSelectStrategy }: Props) {
  const active = strategies.find((s) => s.id === selectedStrategy)!;

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <h3 className="text-sm font-semibold text-[var(--text)]">Planteringsstrategi — vad ska du plantera idag?</h3>
        <p className="text-xs text-[var(--text3)] mt-0.5">
          Riskdiversifierad portfölj — satsa inte allt pa ett tradslag
        </p>
      </div>

      {/* Strategy presets */}
      <div className="px-5 pt-4 flex gap-2">
        {strategies.map((st) => {
          const colors = PRESET_COLORS[st.id];
          const isActive = st.id === selectedStrategy;
          return (
            <button
              key={st.id}
              onClick={() => onSelectStrategy(st.id)}
              className={`flex-1 rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? `${colors.border} ${colors.bg} ring-1 ring-inset ${colors.border}`
                  : 'border-[var(--border)] hover:border-[var(--border)] hover:bg-[var(--bg3)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={isActive ? colors.text : 'text-[var(--text3)]'}>
                  {PRESET_ICONS[st.id]}
                </span>
                <span className={`text-xs font-semibold ${isActive ? 'text-[var(--text)]' : 'text-[var(--text2)]'}`}>
                  {st.label}
                </span>
              </div>
              <p className="text-[10px] text-[var(--text3)] leading-relaxed">{st.description}</p>
            </button>
          );
        })}
      </div>

      {/* Active strategy detail */}
      <div className="p-5 space-y-4">
        {/* Mix visualization */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TreePine size={13} className="text-[var(--green)]" />
            <span className="text-xs font-medium text-[var(--text)]">Rekommenderad artmix</span>
          </div>

          {/* Stacked bar */}
          <div className="h-8 rounded-lg overflow-hidden flex">
            {active.mix.map((m, i) => (
              <div
                key={m.speciesId}
                className="flex items-center justify-center transition-all"
                style={{
                  width: `${m.percentage}%`,
                  backgroundColor: MIX_COLORS[i % MIX_COLORS.length],
                  opacity: 0.8,
                }}
                title={`${m.nameSwedish}: ${m.percentage}%`}
              >
                {m.percentage >= 12 && (
                  <span className="text-[10px] font-bold text-gray-900 whitespace-nowrap">
                    {m.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
            {active.mix.map((m, i) => (
              <div key={m.speciesId} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: MIX_COLORS[i % MIX_COLORS.length], opacity: 0.8 }}
                />
                <span className="text-[10px] text-[var(--text2)]">
                  {m.nameSwedish} ({m.percentage}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg3)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={12} className="text-[var(--green)]" />
              <span className="text-[10px] text-[var(--text3)]">Klimatresiliens</span>
            </div>
            <div className="text-lg font-mono font-bold text-[var(--text)]">
              {active.climateResilienceScore}
              <span className="text-xs text-[var(--text3)] font-normal">/100</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-[var(--bg)]">
              <div
                className="h-full rounded-full bg-[var(--green)] transition-all"
                style={{ width: `${active.climateResilienceScore}%` }}
              />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg3)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Coins size={12} className="text-amber-400" />
              <span className="text-[10px] text-[var(--text3)]">Förväntat NPV/ha</span>
            </div>
            <div className="text-lg font-mono font-bold text-[var(--text)]">
              {(active.expectedNpv / 1000).toFixed(0)}k
              <span className="text-xs text-[var(--text3)] font-normal"> SEK</span>
            </div>
          </div>

          <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg3)' }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-blue-400" />
              <span className="text-[10px] text-[var(--text3)]">Strategi</span>
            </div>
            <div className="text-lg font-mono font-bold text-[var(--text)]">
              {selectedStrategy === 'conservative' ? '60-80' : selectedStrategy === 'balanced' ? '40-80' : '30-70'}
              <span className="text-xs text-[var(--text3)] font-normal"> ar</span>
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-lg border border-[var(--border)] p-3" style={{ background: 'var(--bg3)' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Clock size={12} className="text-[var(--text3)]" />
            <span className="text-[10px] font-medium text-[var(--text2)]">Tidsplan</span>
          </div>
          <p className="text-xs text-[var(--text)]">{active.timeline}</p>
        </div>

        {/* Economic note */}
        <div className="rounded-lg border border-[var(--green)]/20 bg-[var(--green)]/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <TrendingUp size={12} className="text-[var(--green)]" />
            <span className="text-[10px] font-medium text-[var(--green)]">Ekonomisk prognos</span>
          </div>
          <p className="text-xs text-[var(--text2)]">{active.economicNote}</p>
        </div>

        {/* Regulatory warning */}
        {selectedStrategy !== 'conservative' && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <AlertTriangle size={12} className="text-amber-400" />
              <span className="text-[10px] font-medium text-amber-400">Myndighetsanmälan</span>
            </div>
            <p className="text-xs text-[var(--text3)]">
              Douglasgran, hybridlärk och hybridpoppel klassas som främmande trädslag. Plantering över 0.5 ha kräver
              anmälan till Skogsstyrelsen enligt 7 kap. 2 paragrafen skogsvårdslagen. Handläggningstid: 6 veckor.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

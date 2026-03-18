import { useRef, useEffect } from 'react';
import {
  Sparkles,
  Loader2,
  DollarSign,
  Leaf,
  Shield,
  Cloud,
  Users,
  TreePine,
} from 'lucide-react';
import type { GoalWeights, PresetKey, PlanState } from '@/hooks/useForestPlan';
import { GOAL_PRESETS } from '@/hooks/useForestPlan';

interface GoalWizardProps {
  goals: GoalWeights;
  activePreset: PresetKey | null;
  profileLabel: string;
  planState: PlanState;
  onUpdateGoal: (key: keyof GoalWeights, value: number) => void;
  onApplyPreset: (key: PresetKey) => void;
  onGenerate: () => void;
}

const GOAL_META: { key: keyof GoalWeights; label: string; icon: typeof DollarSign; color: string }[] = [
  { key: 'income', label: 'Maximal inkomst', icon: DollarSign, color: '#4ade80' },
  { key: 'biodiversity', label: 'Biologisk mångfald', icon: Leaf, color: '#34d399' },
  { key: 'riskAversion', label: 'Minimal risk', icon: Shield, color: '#60a5fa' },
  { key: 'climate', label: 'Klimatanpassning', icon: Cloud, color: '#38bdf8' },
  { key: 'legacy', label: 'Generationsarv', icon: Users, color: '#c084fc' },
  { key: 'recreation', label: 'Rekreation & upplevelse', icon: TreePine, color: '#fbbf24' },
];

const PRESET_KEYS: PresetKey[] = ['traditional', 'climate', 'balanced', 'conservation'];

// ── Radar / Spider Chart ──

function RadarChart({ goals }: { goals: GoalWeights }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const size = 200;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.scale(dpr, dpr);

    const cx = size / 2;
    const cy = size / 2;
    const r = 75;
    const values = [goals.income, goals.biodiversity, goals.riskAversion, goals.climate, goals.legacy, goals.recreation];
    const labels = ['Inkomst', 'Mångfald', 'Risk', 'Klimat', 'Arv', 'Rekreation'];
    const n = values.length;

    ctx.clearRect(0, 0, size, size);

    // Grid rings
    for (let ring = 1; ring <= 4; ring++) {
      ctx.beginPath();
      const ringR = (r * ring) / 4;
      for (let i = 0; i <= n; i++) {
        const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
        const x = cx + ringR * Math.cos(angle);
        const y = cy + ringR * Math.sin(angle);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Spokes
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Data polygon
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const idx = i % n;
      const angle = (Math.PI * 2 * idx) / n - Math.PI / 2;
      const val = values[idx] / 100;
      const x = cx + r * val * Math.cos(angle);
      const y = cy + r * val * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = 'rgba(74, 222, 128, 0.15)';
    ctx.fill();
    ctx.strokeStyle = '#4ade80';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Data points + labels
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      const val = values[i] / 100;
      const px = cx + r * val * Math.cos(angle);
      const py = cy + r * val * Math.sin(angle);

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#4ade80';
      ctx.fill();

      // Label
      const labelR = r + 16;
      const lx = cx + labelR * Math.cos(angle);
      const ly = cy + labelR * Math.sin(angle);
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.font = '9px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], lx, ly);
    }
  }, [goals]);

  return <canvas ref={canvasRef} className="mx-auto" />;
}

// ── Main Component ──

export function GoalWizard({
  goals,
  activePreset,
  profileLabel,
  planState,
  onUpdateGoal,
  onApplyPreset,
  onGenerate,
}: GoalWizardProps) {
  return (
    <div className="space-y-6">
      {/* Radar chart */}
      <div className="flex justify-center">
        <RadarChart goals={goals} />
      </div>

      {/* Profile summary */}
      <div
        className="rounded-xl border p-3 text-center"
        style={{ background: 'rgba(74, 222, 128, 0.05)', borderColor: 'rgba(74, 222, 128, 0.15)' }}
      >
        <p className="text-xs text-[var(--text2)]">
          Din profil: <span className="font-semibold text-[var(--green)]">{profileLabel}</span>
        </p>
      </div>

      {/* Presets */}
      <div>
        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">
          Snabbval
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRESET_KEYS.map((key) => {
            const preset = GOAL_PRESETS[key];
            const isActive = activePreset === key;
            return (
              <button
                key={key}
                onClick={() => onApplyPreset(key)}
                className={`px-3 py-2 rounded-lg text-left transition-all border ${
                  isActive
                    ? 'border-[#4ade80]/40 bg-[#4ade80]/10'
                    : 'border-[var(--border)] bg-[var(--bg)] hover:bg-[var(--bg3)]'
                }`}
              >
                <p className={`text-[11px] font-medium ${isActive ? 'text-[#4ade80]' : 'text-[var(--text)]'}`}>
                  {preset.label}
                </p>
                <p className="text-[9px] text-[var(--text3)] mt-0.5">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-4">
        <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider">
          Prioriteringar
        </p>
        {GOAL_META.map(({ key, label, icon: Icon, color }) => (
          <div key={key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Icon size={13} style={{ color }} />
                <span className="text-[11px] font-medium text-[var(--text)]">{label}</span>
              </div>
              <span className="text-[10px] font-mono text-[var(--text3)]">{goals[key]}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={goals[key]}
              onChange={(e) => onUpdateGoal(key, Number(e.target.value))}
              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, ${color} ${goals[key]}%, var(--bg3) ${goals[key]}%)`,
                accentColor: color,
              }}
            />
          </div>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={planState === 'generating'}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all disabled:opacity-50"
        style={{
          background: planState === 'generating' ? 'var(--bg3)' : 'linear-gradient(135deg, #4ade80, #22c55e)',
          color: planState === 'generating' ? 'var(--text2)' : '#030d05',
        }}
      >
        {planState === 'generating' ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Genererar 50-årsplan...
          </>
        ) : (
          <>
            <Sparkles size={16} />
            Generera plan
          </>
        )}
      </button>
    </div>
  );
}

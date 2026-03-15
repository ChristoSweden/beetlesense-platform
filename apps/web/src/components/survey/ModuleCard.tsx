import { Check } from 'lucide-react';

export enum AnalysisModule {
  TREE_HEALTH = 'tree_health',
  VEGETATION_INDEX = 'vegetation_index',
  WILDLIFE_DAMAGE = 'wildlife_damage',
  BARK_BEETLE = 'bark_beetle',
  WILD_BOAR = 'wild_boar',
  BOUNDARY_SURVEY = 'boundary_survey',
}

export interface ModuleInfo {
  id: AnalysisModule;
  icon: string;
  title: string;
  description: string;
}

export const ANALYSIS_MODULES: ModuleInfo[] = [
  {
    id: AnalysisModule.TREE_HEALTH,
    icon: '\u{1F333}',
    title: 'Tree Health',
    description: 'Detect dead, dying, or stressed trees via multispectral analysis',
  },
  {
    id: AnalysisModule.VEGETATION_INDEX,
    icon: '\u{1F33F}',
    title: 'Vegetation Index',
    description: 'NDVI and canopy density mapping across your parcel',
  },
  {
    id: AnalysisModule.WILDLIFE_DAMAGE,
    icon: '\u{1F98C}',
    title: 'Wildlife Damage',
    description: 'Identify browsing, rubbing, and bark stripping damage',
  },
  {
    id: AnalysisModule.BARK_BEETLE,
    icon: '\u{1FAB2}',
    title: 'Bark Beetle Detection',
    description: 'AI detection of bark beetle infestation indicators',
  },
  {
    id: AnalysisModule.WILD_BOAR,
    icon: '\u{1F417}',
    title: 'Wild Boar Damage',
    description: 'Detect soil rooting and ground vegetation damage',
  },
  {
    id: AnalysisModule.BOUNDARY_SURVEY,
    icon: '\u{1F512}',
    title: 'Boundary Survey',
    description: 'Verify and map property boundaries with precision',
  },
];

interface ModuleCardProps {
  module: ModuleInfo;
  selected?: boolean;
  onToggle?: (id: AnalysisModule) => void;
  confidence?: number | null;
  status?: 'pending' | 'processing' | 'complete' | 'failed';
  compact?: boolean;
}

export function ModuleCard({
  module,
  selected = false,
  onToggle,
  confidence,
  status,
  compact = false,
}: ModuleCardProps) {
  const isInteractive = !!onToggle;

  return (
    <button
      type="button"
      onClick={() => onToggle?.(module.id)}
      disabled={!isInteractive}
      className={`relative text-left rounded-xl border p-4 transition-all duration-200 ${
        compact ? 'p-3' : 'p-4'
      } ${
        selected
          ? 'border-[var(--green)] bg-[var(--green)]/5'
          : 'border-[var(--border)] bg-forest-800 hover:border-[var(--border2)]'
      } ${isInteractive ? 'cursor-pointer' : 'cursor-default'}`}
    >
      {/* Selected checkmark */}
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--green)] flex items-center justify-center">
          <Check size={12} className="text-forest-950" />
        </div>
      )}

      {/* Status badge */}
      {status && (
        <div className="absolute top-2 right-2">
          <StatusBadge status={status} />
        </div>
      )}

      {/* Icon */}
      <span className={compact ? 'text-xl' : 'text-2xl'}>{module.icon}</span>

      {/* Title */}
      <h4
        className={`font-semibold text-[var(--text)] mt-2 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        {module.title}
      </h4>

      {/* Description */}
      {!compact && (
        <p className="text-[11px] text-[var(--text3)] mt-1 leading-relaxed">
          {module.description}
        </p>
      )}

      {/* Confidence score */}
      {confidence !== undefined && confidence !== null && (
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-forest-900 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--green)] transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-[var(--green)]">
            {confidence.toFixed(0)}%
          </span>
        </div>
      )}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string; label: string; pulse?: boolean }> = {
    pending: { color: 'text-[var(--text3)]', bg: 'bg-forest-700', label: 'Pending' },
    processing: {
      color: 'text-amber',
      bg: 'bg-amber/10',
      label: 'Processing',
      pulse: true,
    },
    complete: { color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10', label: 'Complete' },
    failed: { color: 'text-danger', bg: 'bg-danger/10', label: 'Failed' },
  };

  const c = config[status] ?? config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${c.color} ${c.bg} ${c.pulse ? 'animate-pulse' : ''}`}
    >
      {c.label}
    </span>
  );
}

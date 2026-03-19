import { useState, useRef } from 'react';
import {
  Check,
  Clock,
  AlertTriangle,
  Leaf,
  Banknote,
  Sparkles,
} from 'lucide-react';

// ─── Types ───

export interface ActionItem {
  id: string;
  urgency: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  deadline: string;
  estimatedSavings: number; // SEK
  done: boolean;
}

// ─── Demo Data ───

export const DEMO_ACTIONS: ActionItem[] = [
  {
    id: 'act-1',
    urgency: 'high',
    title: 'Avverka 3 angripna granar',
    description: 'Barkborrekontroll visar aktiv kolonisering i zon NV-12. Avverkning inom 14 dagar hindrar spridning till friska bestånd.',
    deadline: '2026-04-01',
    estimatedSavings: 45000,
    done: false,
  },
  {
    id: 'act-2',
    urgency: 'medium',
    title: 'Röj undervegetation i sektion Öst-4',
    description: 'Tät undervegetation minskar luftcirkulation och ökar fukt. Röjning förbättrar motståndskraft mot svampangrepp.',
    deadline: '2026-04-15',
    estimatedSavings: 12000,
    done: false,
  },
  {
    id: 'act-3',
    urgency: 'low',
    title: 'Planera gallring i sektion Syd-7',
    description: 'Beståndet närmar sig optimal gallringsålder. Tidig planering ger bättre pris vid rätt tidpunkt.',
    deadline: '2026-06-01',
    estimatedSavings: 85000,
    done: false,
  },
];

// ─── Helpers ───

function getUrgencyColor(urgency: ActionItem['urgency']): string {
  switch (urgency) {
    case 'high': return '#ef4444';
    case 'medium': return '#eab308';
    case 'low': return '#4ade80';
  }
}

function getUrgencyLabel(urgency: ActionItem['urgency']): string {
  switch (urgency) {
    case 'high': return 'Hög';
    case 'medium': return 'Medel';
    case 'low': return 'Låg';
  }
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date('2026-03-18');
  const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });

  if (diffDays <= 0) return `Förfallen`;
  if (diffDays <= 7) return `${diffDays} dagar kvar`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)} veckor kvar`;
  return dateStr;
}

function formatSEK(value: number): string {
  if (value >= 1000) {
    return `${Math.round(value / 1000)} tkr`;
  }
  return `${value} kr`;
}

// ─── Leaf Animation (empty state) ───

function LeafAnimation() {
  const leaves = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      left: 15 + Math.random() * 70,
      delay: i * 0.6,
      duration: 3 + Math.random() * 2,
      size: 8 + Math.random() * 6,
    }))
  );

  return (
    <div className="relative h-16 overflow-hidden" aria-hidden="true">
      {leaves.current.map((leaf, i) => (
        <div
          key={i}
          className="absolute animate-float-leaf"
          style={{
            left: `${leaf.left}%`,
            animationDelay: `${leaf.delay}s`,
            animationDuration: `${leaf.duration}s`,
          }}
        >
          <Leaf
            size={leaf.size}
            className="text-[var(--green)]"
            style={{ opacity: 0.3 + Math.random() * 0.3 }}
          />
        </div>
      ))}
      <style>{`
        @keyframes float-leaf {
          0% { transform: translateY(64px) rotate(0deg); opacity: 0; }
          20% { opacity: 0.6; }
          80% { opacity: 0.4; }
          100% { transform: translateY(-20px) rotate(180deg); opacity: 0; }
        }
        .animate-float-leaf {
          animation: float-leaf linear infinite;
        }
      `}</style>
    </div>
  );
}

// ─── Checkmark Animation ───

function CheckAnimation({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
      aria-hidden="true"
    >
      <div className="animate-check-pop">
        <div className="w-10 h-10 rounded-full bg-[#4ade80] flex items-center justify-center shadow-lg shadow-green-500/20">
          <Check size={20} className="text-[#030d05]" strokeWidth={3} />
        </div>
      </div>
      <style>{`
        @keyframes check-pop {
          0% { transform: scale(0) rotate(-30deg); opacity: 0; }
          50% { transform: scale(1.2) rotate(5deg); opacity: 1; }
          70% { transform: scale(0.95) rotate(0deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .animate-check-pop {
          animation: check-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>
    </div>
  );
}

// ─── ActionItem Component ───

function ActionCard({
  item,
  index,
  onToggle,
}: {
  item: ActionItem;
  index: number;
  onToggle: (id: string) => void;
}) {
  const [justCompleted, setJustCompleted] = useState(false);
  const urgencyColor = getUrgencyColor(item.urgency);

  const handleToggle = () => {
    if (!item.done) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 800);
    }
    onToggle(item.id);
  };

  return (
    <div
      className={`relative rounded-lg border px-4 py-3 transition-all duration-300 ${
        item.done
          ? 'border-[var(--border)] opacity-50'
          : 'border-[var(--border)] hover:border-[var(--border2)]'
      }`}
      style={{ background: item.done ? 'transparent' : 'var(--bg2)' }}
    >
      <CheckAnimation visible={justCompleted} />

      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          type="button"
          onClick={handleToggle}
          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 cursor-pointer ${
            item.done
              ? 'bg-[#4ade80] border-[#4ade80]'
              : 'border-[var(--text3)] hover:border-[var(--green)]'
          }`}
          aria-label={item.done ? `Markera "${item.title}" som ej klar` : `Markera "${item.title}" som klar`}
        >
          {item.done && <Check size={12} className="text-[#030d05]" strokeWidth={3} />}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Priority index */}
            <span className="text-[10px] font-mono text-[var(--text3)]">
              {index + 1}.
            </span>

            {/* Urgency dot */}
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: urgencyColor }}
              aria-hidden="true"
            />
            <span className="text-[10px] font-medium" style={{ color: urgencyColor }}>
              {getUrgencyLabel(item.urgency)}
            </span>

            {/* Title */}
            <span
              className={`text-sm font-medium ${
                item.done ? 'line-through text-[var(--text3)]' : 'text-[var(--text)]'
              }`}
            >
              {item.title}
            </span>
          </div>

          <p className="text-[11px] text-[var(--text3)] mt-1 leading-relaxed">
            {item.description}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 flex-wrap">
            <div className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
              <Clock size={10} />
              <span>{formatDeadline(item.deadline)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--green)]">
              <Banknote size={10} />
              <span>Sparat värde: {formatSEK(item.estimatedSavings)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ───

function EmptyState() {
  return (
    <div className="rounded-lg border border-[var(--border)] px-4 py-6 text-center" style={{ background: 'var(--bg2)' }}>
      <LeafAnimation />
      <div className="flex items-center justify-center gap-2 mt-2">
        <Sparkles size={14} className="text-[var(--green)]" />
        <span className="text-sm text-[var(--green)] font-medium">
          Allt ser bra ut!
        </span>
        <Sparkles size={14} className="text-[var(--green)]" />
      </div>
      <p className="text-xs text-[var(--text3)] mt-1">
        Inga åtgärder krävs just nu.
      </p>
    </div>
  );
}

// ─── Main Component ───

interface ActionPriorityListProps {
  actions?: ActionItem[];
}

export function ActionPriorityList({ actions: initialActions }: ActionPriorityListProps) {
  const [actions, setActions] = useState<ActionItem[]>(initialActions ?? DEMO_ACTIONS);

  // Sort by: incomplete first, then urgency (high > medium > low), then by deadline
  const urgencyOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sortedActions = [...actions].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.urgency !== b.urgency) return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
  });

  const handleToggle = (id: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, done: !a.done } : a))
    );
  };

  const allDone = actions.length > 0 && actions.every((a) => a.done);
  const pendingCount = actions.filter((a) => !a.done).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} className="text-[var(--text3)]" />
          <h3 className="text-sm font-semibold text-[var(--text)]">
            Åtgärder
          </h3>
          {pendingCount > 0 && (
            <span className="text-[10px] font-mono bg-[var(--bg3)] text-[var(--text3)] px-1.5 py-0.5 rounded-full">
              {pendingCount}
            </span>
          )}
        </div>
      </div>

      {/* Actions or empty state */}
      {actions.length === 0 || allDone ? (
        <EmptyState />
      ) : (
        <div className="space-y-2">
          {sortedActions.map((action, idx) => (
            <ActionCard
              key={action.id}
              item={action}
              index={idx}
              onToggle={handleToggle}
            />
          ))}
        </div>
      )}
    </div>
  );
}
export default ActionPriorityList;

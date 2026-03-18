import { useState, useMemo } from 'react';
import {
  Award,
  TreePine,
  Brain,
  Leaf,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap,
  Eye,
} from 'lucide-react';

// ─── Types ───

type StewardLevel = 'nybörjare' | 'kunnig' | 'expert' | 'mästare';

interface Achievement {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
  date?: string;
}

interface ScarfStatusProps {
  surveysCompleted?: number;
  parcelsRegistered?: number;
  actionsTaken?: number;
  academyLessons?: number;
  percentileRank?: number;
  achievements?: Achievement[];
  className?: string;
}

// ─── Level config ───

const LEVELS: { key: StewardLevel; label: string; threshold: number; color: string }[] = [
  { key: 'nybörjare', label: 'Nybörjare', threshold: 0, color: '#6b7280' },
  { key: 'kunnig', label: 'Kunnig', threshold: 25, color: '#3b82f6' },
  { key: 'expert', label: 'Expert', threshold: 60, color: '#8b5cf6' },
  { key: 'mästare', label: 'Mästare', threshold: 100, color: '#f59e0b' },
];

function computeScore(props: ScarfStatusProps): number {
  const surveys = Math.min((props.surveysCompleted ?? 0) * 5, 30);
  const parcels = Math.min((props.parcelsRegistered ?? 0) * 8, 24);
  const actions = Math.min((props.actionsTaken ?? 0) * 3, 21);
  const lessons = Math.min((props.academyLessons ?? 0) * 5, 25);
  return surveys + parcels + actions + lessons;
}

function getLevel(score: number): (typeof LEVELS)[number] {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (score >= LEVELS[i].threshold) return LEVELS[i];
  }
  return LEVELS[0];
}

function getNextLevel(score: number): (typeof LEVELS)[number] | null {
  for (const level of LEVELS) {
    if (score < level.threshold) return level;
  }
  return null;
}

// ─── Default achievements ───

function defaultAchievements(props: ScarfStatusProps): Achievement[] {
  if (props.achievements) return props.achievements;
  return [
    {
      id: 'tidig-upptackare',
      label: 'Tidig upptäckare',
      description: 'Upptäckte barkborreangrepp i tidigt stadium',
      icon: <Eye size={14} />,
      unlocked: (props.surveysCompleted ?? 0) >= 2,
    },
    {
      id: 'datadrivet-beslut',
      label: 'Datadrivet beslut',
      description: 'Använde AI-rådgivaren för att fatta beslut',
      icon: <Brain size={14} />,
      unlocked: (props.actionsTaken ?? 0) >= 3,
    },
    {
      id: 'hallbar-skogsagare',
      label: 'Hållbar skogsägare',
      description: 'Kolpositiv skog — mer CO₂ binds än släpps ut',
      icon: <Leaf size={14} />,
      unlocked: (props.parcelsRegistered ?? 0) >= 2 && (props.actionsTaken ?? 0) >= 5,
    },
  ];
}

// ─── Component ───

export function ScarfStatus(props: ScarfStatusProps) {
  const {
    surveysCompleted = 3,
    parcelsRegistered = 2,
    actionsTaken = 7,
    academyLessons = 4,
    percentileRank = 68,
    className = '',
  } = props;

  const [expanded, setExpanded] = useState(false);

  const score = useMemo(
    () => computeScore({ surveysCompleted, parcelsRegistered, actionsTaken, academyLessons }),
    [surveysCompleted, parcelsRegistered, actionsTaken, academyLessons]
  );

  const level = getLevel(score);
  const next = getNextLevel(score);
  const achievements = defaultAchievements(props);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const progressPct = next
    ? ((score - level.threshold) / (next.threshold - level.threshold)) * 100
    : 100;

  return (
    <div
      className={`rounded-xl border border-[var(--border)] p-4 ${className}`}
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${level.color}20` }}
          >
            <Award size={16} style={{ color: level.color }} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--text)]">Skogsvårdare-nivå</h3>
            <span className="text-[10px] text-[var(--text3)]">Din kompetens som skogsägare</span>
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-[var(--bg3)] transition-colors text-[var(--text3)]"
          aria-label={expanded ? 'Dölj detaljer' : 'Visa detaljer'}
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Level badge */}
      <div className="flex items-center gap-3 mb-3">
        <div
          className="px-3 py-1 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${level.color}20`, color: level.color }}
        >
          {level.label}
        </div>
        {next && (
          <span className="text-[10px] text-[var(--text3)]">
            Nästa: {next.label} ({next.threshold - score} poäng kvar)
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="h-1.5 rounded-full bg-[var(--bg3)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${Math.min(progressPct, 100)}%`,
              backgroundColor: level.color,
            }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[var(--text3)]">{score} poäng</span>
          {next && <span className="text-[10px] text-[var(--text3)]">{next.threshold} poäng</span>}
        </div>
      </div>

      {/* Percentile comparison */}
      <p className="text-xs text-[var(--text2)] mb-3">
        <TreePine size={12} className="inline mr-1 text-[var(--green)]" />
        Du har genomfört fler undersökningar än{' '}
        <span className="font-semibold text-[var(--green)]">{percentileRank}%</span> av skogsägare
      </p>

      {/* Achievements */}
      {expanded && (
        <div className="pt-3 border-t border-[var(--border)] space-y-2">
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wide mb-2">
            Utmärkelser ({unlockedCount}/{achievements.length})
          </p>
          {achievements.map((a) => (
            <div
              key={a.id}
              className={`flex items-center gap-2 p-2 rounded-lg text-xs transition-colors ${
                a.unlocked
                  ? 'bg-[var(--green)]/5 text-[var(--text)]'
                  : 'opacity-40 text-[var(--text3)]'
              }`}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: a.unlocked ? 'var(--green)' : 'var(--bg3)',
                  color: a.unlocked ? '#fff' : 'var(--text3)',
                }}
              >
                {a.icon}
              </div>
              <div>
                <span className="font-medium">{a.label}</span>
                <p className="text-[10px] text-[var(--text3)]">{a.description}</p>
              </div>
              {a.unlocked && (
                <Shield size={12} className="ml-auto text-[var(--green)] flex-shrink-0" />
              )}
            </div>
          ))}

          {/* Activity summary */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {[
              { label: 'Undersökningar', value: surveysCompleted, icon: <Zap size={10} /> },
              { label: 'Skiften', value: parcelsRegistered, icon: <TreePine size={10} /> },
              { label: 'Åtgärder', value: actionsTaken, icon: <Shield size={10} /> },
              { label: 'Akademi-lektioner', value: academyLessons, icon: <Brain size={10} /> },
            ].map((stat) => (
              <div
                key={stat.label}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-[var(--bg3)] text-[10px] text-[var(--text2)]"
              >
                <span className="text-[var(--green)]">{stat.icon}</span>
                <span className="font-mono font-semibold">{stat.value}</span>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
export default ScarfStatus;

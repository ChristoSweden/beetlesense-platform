import { useState, useRef, useEffect } from 'react';
import { Award, CheckCircle, Calendar, MessageCircle, ThumbsUp, Star } from 'lucide-react';

export type ReputationLevel = 'newcomer' | 'contributor' | 'trusted' | 'expert' | 'moderator';

export interface UserReputation {
  displayName: string;
  level: ReputationLevel;
  points: number;
  postsCount: number;
  helpfulCount: number;
  verifiedForester: boolean;
  badges: string[];
  joinedAt: string;
}

const LEVEL_CONFIG: Record<ReputationLevel, { icon: string; label: string; color: string; bgColor: string }> = {
  newcomer: { icon: '\uD83C\uDF31', label: 'Newcomer', color: '#6b7280', bgColor: '#f3f4f6' },
  contributor: { icon: '\uD83C\uDF3F', label: 'Contributor', color: '#059669', bgColor: '#ecfdf5' },
  trusted: { icon: '\uD83C\uDF32', label: 'Trusted', color: '#047857', bgColor: '#d1fae5' },
  expert: { icon: '\uD83C\uDFC6', label: 'Expert', color: '#b45309', bgColor: '#fef3c7' },
  moderator: { icon: '\u26A1', label: 'Moderator', color: '#7c3aed', bgColor: '#ede9fe' },
};

// Demo reputation data for known authors
export const DEMO_REPUTATIONS: Record<string, UserReputation> = {
  'Erik Lindgren': {
    displayName: 'Erik Lindgren',
    level: 'expert',
    points: 2450,
    postsCount: 87,
    helpfulCount: 312,
    verifiedForester: true,
    badges: ['Bark Beetle Specialist', 'Top Contributor 2025', 'Early Adopter'],
    joinedAt: '2024-06-15',
  },
  'Anna Svensson': {
    displayName: 'Anna Svensson',
    level: 'trusted',
    points: 1280,
    postsCount: 42,
    helpfulCount: 156,
    verifiedForester: true,
    badges: ['Growth Model Expert', 'Helpful Voice'],
    joinedAt: '2024-09-01',
  },
  'Lars Karlsson': {
    displayName: 'Lars Karlsson',
    level: 'contributor',
    points: 680,
    postsCount: 23,
    helpfulCount: 89,
    verifiedForester: false,
    badges: ['Equipment Reviewer'],
    joinedAt: '2025-01-10',
  },
  'Maria Johansson': {
    displayName: 'Maria Johansson',
    level: 'expert',
    points: 3100,
    postsCount: 105,
    helpfulCount: 478,
    verifiedForester: true,
    badges: ['Regulation Expert', 'Community Leader', 'Top Contributor 2025'],
    joinedAt: '2024-03-20',
  },
};

function getDefaultReputation(name: string): UserReputation {
  return {
    displayName: name,
    level: 'newcomer',
    points: Math.floor(Math.random() * 200) + 10,
    postsCount: Math.floor(Math.random() * 10) + 1,
    helpfulCount: Math.floor(Math.random() * 20),
    verifiedForester: false,
    badges: [],
    joinedAt: '2025-08-01',
  };
}

export function getReputation(name: string): UserReputation {
  return DEMO_REPUTATIONS[name] ?? getDefaultReputation(name);
}

interface UserReputationCardProps {
  userName: string;
  compact?: boolean;
}

export function UserReputationCard({ userName, compact = false }: UserReputationCardProps) {
  const rep = getReputation(userName);
  const config = LEVEL_CONFIG[rep.level];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
        style={{ background: config.bgColor, color: config.color }}
      >
        <span>{config.icon}</span>
        {config.label}
      </span>
    );
  }

  return (
    <div
      className="w-72 rounded-2xl border border-[var(--border)] p-5 shadow-xl"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black border border-[var(--border)]"
          style={{ background: config.bgColor, color: config.color }}
        >
          {rep.displayName.split(' ').map(n => n[0]).join('')}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-[var(--text)] truncate">{rep.displayName}</span>
            {rep.verifiedForester && (
              <CheckCircle size={14} className="text-[var(--green)] shrink-0" fill="currentColor" />
            )}
          </div>
          <span
            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1"
            style={{ background: config.bgColor, color: config.color }}
          >
            <span>{config.icon}</span>
            {config.label} &middot; {rep.points.toLocaleString()} pts
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[var(--text3)] mb-1">
            <MessageCircle size={12} />
          </div>
          <p className="text-sm font-bold text-[var(--text)]">{rep.postsCount}</p>
          <p className="text-[10px] text-[var(--text3)]">Posts</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[var(--text3)] mb-1">
            <ThumbsUp size={12} />
          </div>
          <p className="text-sm font-bold text-[var(--text)]">{rep.helpfulCount}</p>
          <p className="text-[10px] text-[var(--text3)]">Helpful</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-[var(--text3)] mb-1">
            <Calendar size={12} />
          </div>
          <p className="text-sm font-bold text-[var(--text)]">
            {new Date(rep.joinedAt).toLocaleDateString('en', { month: 'short', year: '2-digit' })}
          </p>
          <p className="text-[10px] text-[var(--text3)]">Joined</p>
        </div>
      </div>

      {/* Badges */}
      {rep.badges.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-2">Badges</p>
          <div className="flex flex-wrap gap-1.5">
            {rep.badges.map(badge => (
              <span
                key={badge}
                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-lg border border-[var(--border)]"
                style={{ background: 'var(--bg)' }}
              >
                <Award size={10} className="text-amber-500" />
                <span className="text-[var(--text2)]">{badge}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Verified badge */}
      {rep.verifiedForester && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
          <CheckCircle size={14} className="text-emerald-600" fill="currentColor" />
          <span className="text-[11px] font-semibold text-emerald-700">Verified Professional Forester</span>
        </div>
      )}
    </div>
  );
}

/** Hover-triggered reputation popover wrapper */
export function UserNameWithReputation({ userName, children }: { userName: string; children?: React.ReactNode }) {
  const [showCard, setShowCard] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowCard(true), 400);
  };

  const handleLeave = () => {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowCard(false), 200);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <span
      className="relative inline-block cursor-pointer"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children ?? <span className="text-sm font-bold text-[var(--text)] hover:text-[var(--green)] transition-colors">{userName}</span>}
      {showCard && (
        <div
          ref={cardRef}
          className="absolute z-50 left-0 top-full mt-2"
          onMouseEnter={() => clearTimeout(timeoutRef.current)}
          onMouseLeave={handleLeave}
        >
          <UserReputationCard userName={userName} />
        </div>
      )}
    </span>
  );
}

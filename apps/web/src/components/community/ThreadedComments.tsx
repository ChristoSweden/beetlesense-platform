import { useState, useCallback } from 'react';
import {
  MessageCircle,
  ThumbsUp,
  Flag,
  ChevronDown,
  ChevronUp,
  Send,
  CornerDownRight,
} from 'lucide-react';
import { UserNameWithReputation, UserReputationCard, getReputation } from './UserReputationCard';
import { ReportModal } from './ReportModal';

// ─── Types ───

export interface ThreadedComment {
  id: string;
  parentId: string | null;
  authorName: string;
  authorLabel: string;
  content: string;
  createdAt: string;
  helpfulCount: number;
  children?: ThreadedComment[];
}

interface ThreadedCommentsProps {
  comments: ThreadedComment[];
  onReply: (parentId: string, content: string) => void;
  onLikeComment: (commentId: string) => void;
  maxDepth?: number;
}

// ─── Demo data builder ───

export function buildDemoThreadedComments(postId: string): ThreadedComment[] {
  const threads: Record<string, ThreadedComment[]> = {
    'demo-post-1': [
      {
        id: 'tc-1a', parentId: null, authorName: 'Anna Svensson', authorLabel: 'Skogsagare i Kronoberg',
        content: 'Yes, I spotted bore dust on several spruces near Hovmantorp last week. Reported to Skogsstyrelsen already. The gallery pattern looked like classic Ips typographus.',
        createdAt: '2026-03-15T11:30:00Z', helpfulCount: 8,
        children: [
          {
            id: 'tc-1a1', parentId: 'tc-1a', authorName: 'Erik Lindgren', authorLabel: 'Skogsagare i Kronoberg',
            content: 'Thanks for reporting. Did you set up pheromone traps as well? We should coordinate a response in the area.',
            createdAt: '2026-03-15T12:15:00Z', helpfulCount: 4,
            children: [
              {
                id: 'tc-1a1a', parentId: 'tc-1a1', authorName: 'Anna Svensson', authorLabel: 'Skogsagare i Kronoberg',
                content: 'Yes, 3 traps placed along the south-facing slope. Happy to share GPS coordinates if anyone wants to coordinate placement.',
                createdAt: '2026-03-15T13:00:00Z', helpfulCount: 6,
              },
            ],
          },
        ],
      },
      {
        id: 'tc-1b', parentId: null, authorName: 'Lars Karlsson', authorLabel: 'Skogsagare i Kronoberg',
        content: 'Same here, south side of Lessebo. Set up pheromone traps two days ago. Caught 15+ beetles already which is concerning for this early in the season.',
        createdAt: '2026-03-15T14:20:00Z', helpfulCount: 5,
      },
    ],
    'demo-post-2': [
      {
        id: 'tc-2a', parentId: null, authorName: 'Maria Johansson', authorLabel: 'Skogsagare i Kronoberg',
        content: 'I used the same contractor last year for a 20ha thinning. Very professional, good communication throughout. Fair pricing too.',
        createdAt: '2026-03-14T16:00:00Z', helpfulCount: 7,
        children: [
          {
            id: 'tc-2a1', parentId: 'tc-2a', authorName: 'Lars Karlsson', authorLabel: 'Skogsagare i Kronoberg',
            content: 'Could you share their contact details? I have 10ha that needs thinning this spring.',
            createdAt: '2026-03-14T17:30:00Z', helpfulCount: 2,
          },
        ],
      },
    ],
    'demo-post-5': [
      {
        id: 'tc-5a', parentId: null, authorName: 'Maria Johansson', authorLabel: 'Skogsagare i Kronoberg',
        content: 'Welcome! The most important thing is timing. Best to thin when the trees are around 30-40 years old for spruce. Also make sure the soil is frozen or dry to avoid root damage.',
        createdAt: '2026-03-12T10:00:00Z', helpfulCount: 12,
        children: [
          {
            id: 'tc-5a1', parentId: 'tc-5a', authorName: 'Erik Lindgren', authorLabel: 'Skogsagare i Smaland',
            content: 'Good advice. I would add: always mark the trees to keep, not the ones to remove. Makes it easier for the operator and reduces mistakes.',
            createdAt: '2026-03-12T11:00:00Z', helpfulCount: 8,
            children: [
              {
                id: 'tc-5a1a', parentId: 'tc-5a1', authorName: 'Anna Svensson', authorLabel: 'Skogsagare i Kronoberg',
                content: 'Great tip! Also consider using BeetleSense to check the health of surrounding parcels before planning the thinning route.',
                createdAt: '2026-03-12T12:30:00Z', helpfulCount: 5,
              },
            ],
          },
        ],
      },
      {
        id: 'tc-5b', parentId: null, authorName: 'Lars Karlsson', authorLabel: 'Skogsagare i Smaland',
        content: 'Get a forest management plan from Skogsstyrelsen or Sodra first. It is free for new owners and gives you a complete overview of what to do.',
        createdAt: '2026-03-12T12:45:00Z', helpfulCount: 9,
      },
      {
        id: 'tc-5c', parentId: null, authorName: 'Erik Lindgren', authorLabel: 'Skogsagare i Kronoberg',
        content: 'Join Sodra or Norra Skog if you have not already. Good courses for beginners and you get better prices when selling timber.',
        createdAt: '2026-03-12T15:10:00Z', helpfulCount: 6,
      },
    ],
  };

  return threads[postId] ?? [];
}

// ─── Time formatting ───

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

// ─── Single Comment ───

interface CommentNodeProps {
  comment: ThreadedComment;
  depth: number;
  maxDepth: number;
  onReply: (parentId: string, content: string) => void;
  onLikeComment: (commentId: string) => void;
  likedSet: Set<string>;
  onToggleLike: (id: string) => void;
}

function CommentNode({ comment, depth, maxDepth, onReply, onLikeComment, likedSet, onToggleLike }: CommentNodeProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showReport, setShowReport] = useState(false);

  const rep = getReputation(comment.authorName);
  const hasChildren = comment.children && comment.children.length > 0;
  const isLiked = likedSet.has(comment.id);

  const handleSubmitReply = () => {
    if (!replyText.trim()) return;
    onReply(comment.id, replyText.trim());
    setReplyText('');
    setReplying(false);
  };

  return (
    <div className={`${depth > 0 ? 'ml-5 pl-4 border-l-2 border-[var(--border)]' : ''}`}>
      <div className="py-3">
        {/* Author row */}
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border border-[var(--border)]"
            style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
          >
            {comment.authorName.split(' ').map(n => n[0]).join('')}
          </div>
          <UserNameWithReputation userName={comment.authorName}>
            <span className="text-xs font-semibold text-[var(--text)] hover:text-[var(--green)] transition-colors cursor-pointer">
              {comment.authorName}
            </span>
          </UserNameWithReputation>
          {rep.verifiedForester && (
            <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Verified</span>
          )}
          <span className="text-[10px] text-[var(--text3)]">{timeAgo(comment.createdAt)}</span>
          {hasChildren && (
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="ml-auto flex items-center gap-1 text-[10px] text-[var(--text3)] hover:text-[var(--text2)] transition-colors"
            >
              {collapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              {collapsed ? `Show ${comment.children!.length} replies` : 'Collapse'}
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-sm text-[var(--text)] leading-relaxed mb-2 pl-9">
          {comment.content}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 pl-9">
          <button
            onClick={() => { onToggleLike(comment.id); onLikeComment(comment.id); }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
              isLiked
                ? 'bg-[var(--green)]/10 text-[var(--green)]'
                : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
            }`}
          >
            <ThumbsUp size={12} />
            {comment.helpfulCount + (isLiked ? 1 : 0)}
          </button>

          {depth < maxDepth && (
            <button
              onClick={() => setReplying(!replying)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
            >
              <CornerDownRight size={12} />
              Reply
            </button>
          )}

          <button
            onClick={() => setShowReport(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-[var(--text3)] hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <Flag size={11} />
          </button>
        </div>

        {/* Reply input */}
        {replying && (
          <div className="flex items-center gap-2 mt-2 pl-9">
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitReply(); } }}
              placeholder="Write a reply..."
              autoFocus
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40"
            />
            <button
              onClick={handleSubmitReply}
              disabled={!replyText.trim()}
              className="p-2 rounded-lg text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors disabled:opacity-30"
            >
              <Send size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div>
          {comment.children!.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              onReply={onReply}
              onLikeComment={onLikeComment}
              likedSet={likedSet}
              onToggleLike={onToggleLike}
            />
          ))}
        </div>
      )}

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="comment"
        targetId={comment.id}
      />
    </div>
  );
}

// ─── Main Component ───

export function ThreadedComments({ comments, onReply, onLikeComment, maxDepth = 3 }: ThreadedCommentsProps) {
  const [likedSet, setLikedSet] = useState<Set<string>>(new Set());

  const handleToggleLike = useCallback((id: string) => {
    setLikedSet(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  if (comments.length === 0) {
    return (
      <div className="py-8 text-center">
        <MessageCircle size={24} className="mx-auto text-[var(--text3)] mb-2 opacity-40" />
        <p className="text-sm text-[var(--text3)]">No comments yet. Be the first to reply.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[var(--border)]">
      {comments.map(comment => (
        <CommentNode
          key={comment.id}
          comment={comment}
          depth={0}
          maxDepth={maxDepth}
          onReply={onReply}
          onLikeComment={onLikeComment}
          likedSet={likedSet}
          onToggleLike={handleToggleLike}
        />
      ))}
    </div>
  );
}

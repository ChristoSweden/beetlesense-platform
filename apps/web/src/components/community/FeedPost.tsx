import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ThumbsUp,
  MessageCircle,
  Sparkles,
  MapPin,
  ChevronDown,
  ChevronUp,
  Send,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Package,
  MessagesSquare,
} from 'lucide-react';
import type { CommunityPost, PostType } from '@/hooks/useCommunityFeed';

// ─── Post type config ───

interface PostTypeConfig {
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
}

function getPostTypeConfig(type: PostType): PostTypeConfig {
  switch (type) {
    case 'alert':
      return {
        icon: <AlertTriangle size={12} />,
        colorClass: 'text-amber-400',
        bgClass: 'bg-amber-400/15 text-amber-400',
      };
    case 'tip':
      return {
        icon: <Lightbulb size={12} />,
        colorClass: 'text-emerald-400',
        bgClass: 'bg-emerald-400/15 text-emerald-400',
      };
    case 'request':
      return {
        icon: <HelpCircle size={12} />,
        colorClass: 'text-blue-400',
        bgClass: 'bg-blue-400/15 text-blue-400',
      };
    case 'offer':
      return {
        icon: <Package size={12} />,
        colorClass: 'text-purple-400',
        bgClass: 'bg-purple-400/15 text-purple-400',
      };
    case 'discussion':
      return {
        icon: <MessagesSquare size={12} />,
        colorClass: 'text-cyan-400',
        bgClass: 'bg-cyan-400/15 text-cyan-400',
      };
  }
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
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH < 24) return `${diffH}h`;
  if (diffD < 30) return `${diffD}d`;
  return new Date(dateStr).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

// ─── Props ───

interface FeedPostProps {
  post: CommunityPost;
  isHelpful: boolean;
  onToggleHelpful: (postId: string) => void;
  onAddComment: (postId: string, content: string) => void;
  onAskAI?: (post: CommunityPost) => void;
}

export function FeedPost({ post, isHelpful, onToggleHelpful, onAddComment, onAskAI }: FeedPostProps) {
  const { t } = useTranslation();
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [commentInput, setCommentInput] = useState('');

  const config = getPostTypeConfig(post.type);

  const handleSubmitComment = () => {
    if (!commentInput.trim()) return;
    onAddComment(post.id, commentInput.trim());
    setCommentInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  return (
    <article className="rounded-xl border border-[var(--border)] p-4 hover:border-[var(--border2)] transition-colors" style={{ background: 'var(--bg2)' }}>
      {/* Header: author + type badge + time */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Avatar placeholder */}
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center border border-[var(--border2)]"
            style={{ background: 'var(--bg3)' }}
          >
            <span className="text-xs font-semibold text-[var(--green)]">
              {post.author_label.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-[var(--text2)] truncate">
              {post.author_label}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${config.bgClass}`}>
                {config.icon}
                {t(`community.types.${post.type}`)}
              </span>
              <span className="text-[10px] text-[var(--text3)]">{timeAgo(post.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <p className="text-sm text-[var(--text)] leading-relaxed mb-3 whitespace-pre-wrap">
        {post.content}
      </p>

      {/* Image (if any) */}
      {post.image_url && (
        <div className="mb-3 rounded-lg overflow-hidden border border-[var(--border)]">
          <img src={post.image_url} alt="" className="w-full h-48 object-cover" />
        </div>
      )}

      {/* Location tag */}
      <div className="flex items-center gap-1 mb-3">
        <MapPin size={12} className="text-[var(--text3)]" />
        <span className="text-[10px] text-[var(--text3)]">
          {post.municipality}, {post.county}
        </span>
      </div>

      {/* Actions row */}
      <div className="flex items-center gap-1 border-t border-[var(--border)] pt-3">
        {/* Helpful button */}
        <button
          onClick={() => onToggleHelpful(post.id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isHelpful
              ? 'bg-[var(--green)]/15 text-[var(--green)]'
              : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
          }`}
        >
          <ThumbsUp size={14} />
          <span>{post.helpful_count}</span>
        </button>

        {/* Comments toggle */}
        <button
          onClick={() => setCommentsExpanded(!commentsExpanded)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
        >
          <MessageCircle size={14} />
          <span>{post.comment_count}</span>
          {post.comment_count > 0 && (
            commentsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />
          )}
        </button>

        {/* Ask AI */}
        {onAskAI && (
          <button
            onClick={() => onAskAI(post)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors ml-auto"
          >
            <Sparkles size={14} />
            <span className="hidden sm:inline">{t('community.askAiAbout')}</span>
          </button>
        )}
      </div>

      {/* Comments section */}
      {commentsExpanded && (
        <div className="mt-3 pt-3 border-t border-[var(--border)] space-y-3">
          {post.comments.length === 0 && (
            <p className="text-xs text-[var(--text3)] italic">
              {t('community.noComments')}
            </p>
          )}

          {post.comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <div
                className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center border border-[var(--border)]"
                style={{ background: 'var(--bg3)' }}
              >
                <span className="text-[9px] font-semibold text-[var(--text3)]">
                  {comment.author_label.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-[var(--text2)]">
                    {comment.author_label}
                  </span>
                  <span className="text-[10px] text-[var(--text3)]">
                    {timeAgo(comment.created_at)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text)] mt-0.5 leading-relaxed">
                  {comment.content}
                </p>
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={commentInput}
              onChange={(e) => setCommentInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('community.writeComment')}
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentInput.trim()}
              className="p-2 rounded-lg text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

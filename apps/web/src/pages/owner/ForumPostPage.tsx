import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Bookmark,
  BookmarkCheck,
  Share2,
  Flag,
  Bell,
  BellOff,
  MessageCircle,
  Sparkles,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Package,
  MessagesSquare,
  Send,
  ExternalLink,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import { ReportModal } from '@/components/community/ReportModal';
import {
  UserReputationCard,
  UserNameWithReputation,
  getReputation,
} from '@/components/community/UserReputationCard';
import {
  ThreadedComments,
  buildDemoThreadedComments,
  type ThreadedComment,
} from '@/components/community/ThreadedComments';
import type { PostType } from '@/hooks/useCommunityFeed';

// ─── Demo post data ───

interface ForumPost {
  id: string;
  title: string;
  body: string;
  type: PostType;
  authorName: string;
  authorLabel: string;
  municipality: string;
  county: string;
  createdAt: string;
  likesCount: number;
  commentCount: number;
  imageUrl?: string;
  category: string;
}

const DEMO_FORUM_POSTS: ForumPost[] = [
  {
    id: 'demo-post-1',
    title: 'Bark beetle activity near Lessebo',
    body: `Beetle damage spotted near Lessebo -- anyone else seeing this?\n\nFound bore dust on 4-5 spruce trunks along the south-facing slope. Looks like Ips typographus based on the gallery patterns. The trees are roughly 50-60 years old, and the bore dust is fresh (probably within the last week).\n\nI have reported this to Skogsstyrelsen but wanted to alert the community as well. If you have parcels in the Lessebo area, I recommend doing a walkthrough of any spruce-heavy stands, especially south-facing slopes that get more sun.\n\nKey indicators I noticed:\n- Fresh bore dust at the base of trunks\n- Small entry holes (2-3mm) in bark crevices\n- Some early crown discoloration on two trees\n- Gallery patterns visible under loose bark\n\nHas anyone else seen similar activity in Kronoberg this early in the season?`,
    type: 'alert',
    authorName: 'Erik Lindgren',
    authorLabel: 'Skogsagare i Kronoberg',
    municipality: 'Lessebo',
    county: 'Kronoberg',
    createdAt: '2026-03-15T08:24:00Z',
    likesCount: 12,
    commentCount: 4,
    category: 'Pest Alert',
  },
  {
    id: 'demo-post-2',
    title: 'Found a great logging contractor in Kronoberg',
    body: `Found a great logging contractor in Kronoberg -- DM me for details.\n\nThey did gallring on my 15ha plot in just 3 days, very careful with the remaining stand and fair pricing. The operator was experienced and knew how to handle the terrain without excessive soil disturbance.\n\nKey positives:\n- Fast and efficient work\n- Minimal damage to remaining trees\n- Good communication throughout\n- Fair pricing compared to other quotes I got\n- They cleaned up well after the job`,
    type: 'tip',
    authorName: 'Anna Svensson',
    authorLabel: 'Skogsagare i Kronoberg',
    municipality: 'Vaxjo',
    county: 'Kronoberg',
    createdAt: '2026-03-14T14:05:00Z',
    likesCount: 8,
    commentCount: 2,
    category: 'Contractor Tip',
  },
  {
    id: 'demo-post-3',
    title: 'Looking for planting crew, 20ha in April',
    body: `Looking for planting crew, 20ha in April. Any recommendations?\n\nArea is near Alvesta, mostly cleared spruce land that needs replanting with a mix of spruce and birch. I want about 70% spruce and 30% birch for better resilience.\n\nThe terrain is fairly flat with some rocky patches. Ground prep was done last fall so it should be ready for planting in mid-April depending on weather.`,
    type: 'request',
    authorName: 'Lars Karlsson',
    authorLabel: 'Skogsagare i Kronoberg',
    municipality: 'Alvesta',
    county: 'Kronoberg',
    createdAt: '2026-03-13T09:30:00Z',
    likesCount: 5,
    commentCount: 0,
    category: 'Services Request',
  },
  {
    id: 'demo-post-4',
    title: 'Helicopter spraying group buy -- Alvesta area',
    body: `Helicopter spraying group buy -- 5 landowners needed for Alvesta area.\n\nI have been in contact with a certified operator. If we pool 50+ hectares, per-hectare cost drops by 40%. Treatment window is mid-May.\n\nThis is for bark beetle prevention treatment. The operator is certified by Kemikalieinspektionen and has good references from last season in Jonkoping county.`,
    type: 'offer',
    authorName: 'Maria Johansson',
    authorLabel: 'Skogsagare i Kronoberg',
    municipality: 'Alvesta',
    county: 'Kronoberg',
    createdAt: '2026-03-12T17:45:00Z',
    likesCount: 15,
    commentCount: 0,
    category: 'Group Buy',
  },
  {
    id: 'demo-post-5',
    title: 'First-time owner -- what should I know about gallring?',
    body: `First-time owner here -- what should I know about gallring?\n\nJust inherited 35ha of mixed forest outside Vaxjo. Most of the spruce seems to be 35-40 years old. When is the right time, and what should I watch out for?\n\nI have no forestry background but want to manage the land responsibly. I have been reading up on forest management plans but there is so much information it is overwhelming.\n\nAny advice for a complete beginner? Particularly interested in:\n- When to do the first thinning\n- How to choose a contractor\n- What percentage of trees to remove\n- How to avoid bark beetle problems after thinning\n- Whether I should join a forest owner association`,
    type: 'discussion',
    authorName: 'Lars Karlsson',
    authorLabel: 'Skogsagare i Kronoberg',
    municipality: 'Vaxjo',
    county: 'Kronoberg',
    createdAt: '2026-03-12T07:15:00Z',
    likesCount: 22,
    commentCount: 5,
    category: 'Beginner Question',
  },
];

// ─── Helpers ───

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' });
}

const POST_TYPE_CONFIG: Record<PostType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  alert: { icon: <AlertTriangle size={14} />, label: 'Alert', color: '#d97706', bg: '#fffbeb' },
  tip: { icon: <Lightbulb size={14} />, label: 'Tip', color: '#059669', bg: '#ecfdf5' },
  request: { icon: <HelpCircle size={14} />, label: 'Request', color: '#2563eb', bg: '#eff6ff' },
  offer: { icon: <Package size={14} />, label: 'Offer', color: '#7c3aed', bg: '#f5f3ff' },
  discussion: { icon: <MessagesSquare size={14} />, label: 'Discussion', color: '#0891b2', bg: '#ecfeff' },
};

// ─── Component ───

export default function ForumPostPage() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const toast = useToast();

  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commentsList, setCommentsList] = useState<ThreadedComment[]>([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  const post = useMemo(() => {
    return DEMO_FORUM_POSTS.find(p => p.id === postId) ?? DEMO_FORUM_POSTS[0];
  }, [postId]);

  // Load threaded comments
  useEffect(() => {
    if (!commentsLoaded) {
      const threads = buildDemoThreadedComments(post.id);
      setCommentsList(threads);
      setCommentsLoaded(true);
    }
  }, [post.id, commentsLoaded]);

  const relatedPosts = useMemo(() => {
    return DEMO_FORUM_POSTS.filter(p => p.id !== post.id && (p.category === post.category || p.type === post.type)).slice(0, 3);
  }, [post]);

  const typeConfig = POST_TYPE_CONFIG[post.type];
  const rep = getReputation(post.authorName);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast('Link copied to clipboard', 'success');
  };

  const handleBookmark = () => {
    setBookmarked(!bookmarked);
    toast(bookmarked ? 'Removed from bookmarks' : 'Saved to bookmarks', 'success');
  };

  const handleSubscribe = () => {
    setSubscribed(!subscribed);
    toast(subscribed ? 'Unsubscribed from thread' : 'You will be notified of new replies', 'success');
  };

  const handleReply = (parentId: string, content: string) => {
    const newReply: ThreadedComment = {
      id: `reply-${Date.now()}`,
      parentId,
      authorName: 'You',
      authorLabel: 'Forest Owner',
      content,
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
    };

    // Insert reply into the tree
    function insertReply(comments: ThreadedComment[]): ThreadedComment[] {
      return comments.map(c => {
        if (c.id === parentId) {
          return { ...c, children: [...(c.children ?? []), newReply] };
        }
        if (c.children) {
          return { ...c, children: insertReply(c.children) };
        }
        return c;
      });
    }

    setCommentsList(prev => insertReply(prev));
    toast('Reply posted', 'success');
  };

  const handleAddTopLevelComment = () => {
    if (!newComment.trim()) return;
    const comment: ThreadedComment = {
      id: `comment-${Date.now()}`,
      parentId: null,
      authorName: 'You',
      authorLabel: 'Forest Owner',
      content: newComment.trim(),
      createdAt: new Date().toISOString(),
      helpfulCount: 0,
    };
    setCommentsList(prev => [...prev, comment]);
    setNewComment('');
    toast('Comment posted', 'success');
  };

  return (
    <div className="relative p-6 sm:p-10 max-w-6xl mx-auto min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Back navigation */}
      <button
        onClick={() => navigate('/owner/forum')}
        className="flex items-center gap-2 text-sm font-medium text-[var(--text3)] hover:text-[var(--text)] transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back to Forum
      </button>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Post card */}
          <article
            className="rounded-2xl border border-[var(--border)] p-6 sm:p-8 mb-6"
            style={{ background: 'var(--bg2)' }}
          >
            {/* Category + Type badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: typeConfig.bg, color: typeConfig.color }}
              >
                {typeConfig.icon}
                {typeConfig.label}
              </span>
              <span className="text-xs font-medium px-3 py-1 rounded-full border border-[var(--border)] text-[var(--text2)]" style={{ background: 'var(--bg)' }}>
                {post.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-[var(--text3)]">
                <MapPin size={12} />
                {post.municipality}, {post.county}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)] leading-tight mb-4" style={{ fontFamily: 'var(--font-serif, "Cormorant Garamond", Georgia, serif)' }}>
              {post.title}
            </h1>

            {/* Author row */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[var(--border)]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold border border-[var(--border)]"
                style={{ background: 'var(--bg3)', color: 'var(--text2)' }}
              >
                {post.authorName.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <UserNameWithReputation userName={post.authorName} />
                  {rep.verifiedForester && (
                    <CheckCircle size={14} className="text-emerald-600" fill="currentColor" />
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-[var(--text3)]">{timeAgo(post.createdAt)}</span>
                  <span className="w-1 h-1 rounded-full bg-[var(--border)]" />
                  <span className="text-xs text-[var(--text3)]">{post.authorLabel}</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap mb-6">
              {post.body}
            </div>

            {/* Actions bar */}
            <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setLiked(!liked)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  liked
                    ? 'bg-red-50 text-red-500 border border-red-100'
                    : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] border border-transparent'
                }`}
              >
                <Heart size={16} fill={liked ? 'currentColor' : 'none'} />
                {post.likesCount + (liked ? 1 : 0)}
              </button>

              <button
                onClick={handleBookmark}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  bookmarked
                    ? 'bg-amber-50 text-amber-600 border border-amber-100'
                    : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] border border-transparent'
                }`}
              >
                {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                {bookmarked ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] transition-colors"
              >
                <Share2 size={16} />
                Share
              </button>

              <button
                onClick={() => setShowReport(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-[var(--text3)] hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <Flag size={16} />
                Report
              </button>

              <button
                onClick={handleSubscribe}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ml-auto ${
                  subscribed
                    ? 'bg-[var(--green)]/10 text-[var(--green)] border border-[var(--green)]/20'
                    : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)] border border-transparent'
                }`}
              >
                {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
                {subscribed ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
          </article>

          {/* Ask Wingman CTA */}
          <div
            className="rounded-2xl border border-emerald-100 p-4 mb-6 flex items-center gap-4"
            style={{ background: '#f0fdf4' }}
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <Sparkles size={20} className="text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-900">Have a follow-up question?</p>
              <p className="text-xs text-emerald-700 mt-0.5">Ask Wingman for AI-powered forestry advice about this topic.</p>
            </div>
            <Link
              to="/owner/wingman"
              className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'var(--green)' }}
            >
              <Sparkles size={14} />
              Ask Wingman
            </Link>
          </div>

          {/* Comments Section */}
          <div
            className="rounded-2xl border border-[var(--border)] p-6 sm:p-8"
            style={{ background: 'var(--bg2)' }}
          >
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle size={20} className="text-[var(--text2)]" />
              <h2 className="text-lg font-bold text-[var(--text)]">
                Comments
              </h2>
              <span className="text-sm text-[var(--text3)]">({commentsList.length})</span>
            </div>

            {/* New comment input */}
            <div className="flex items-start gap-3 mb-6 pb-6 border-b border-[var(--border)]">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border border-[var(--border)] shrink-0"
                style={{ background: 'var(--bg3)', color: 'var(--green)' }}
              >
                Y
              </div>
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Share your thoughts or experience..."
                  rows={3}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg)] px-4 py-3 text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleAddTopLevelComment}
                    disabled={!newComment.trim()}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--green)' }}
                  >
                    <Send size={14} />
                    Post Comment
                  </button>
                </div>
              </div>
            </div>

            {/* Threaded comments */}
            <ThreadedComments
              comments={commentsList}
              onReply={handleReply}
              onLikeComment={() => {}}
              maxDepth={3}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 shrink-0 space-y-5">
          {/* Author card */}
          <div
            className="rounded-2xl border border-[var(--border)] p-5"
            style={{ background: 'var(--bg2)' }}
          >
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">About the Author</p>
            <UserReputationCard userName={post.authorName} />
          </div>

          {/* Subscribe card */}
          <div
            className="rounded-2xl border border-[var(--border)] p-5"
            style={{ background: 'var(--bg2)' }}
          >
            <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">Thread Notifications</p>
            <button
              onClick={handleSubscribe}
              className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                subscribed
                  ? 'bg-[var(--bg3)] text-[var(--text2)] border border-[var(--border)]'
                  : 'text-white'
              }`}
              style={subscribed ? {} : { background: 'var(--green)' }}
            >
              {subscribed ? <BellOff size={16} /> : <Bell size={16} />}
              {subscribed ? 'Unsubscribe' : 'Subscribe to Thread'}
            </button>
            <p className="text-[11px] text-[var(--text3)] mt-2 text-center">
              Get notified when someone replies
            </p>
          </div>

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <div
              className="rounded-2xl border border-[var(--border)] p-5"
              style={{ background: 'var(--bg2)' }}
            >
              <p className="text-[10px] font-semibold text-[var(--text3)] uppercase tracking-wider mb-3">Related Discussions</p>
              <div className="space-y-3">
                {relatedPosts.map(rp => (
                  <Link
                    key={rp.id}
                    to={`/owner/forum/${rp.id}`}
                    className="block group"
                  >
                    <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--green)] transition-colors leading-snug">
                      {rp.title}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-[var(--text3)]">{timeAgo(rp.createdAt)}</span>
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                        <Heart size={10} /> {rp.likesCount}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-[var(--text3)]">
                        <MessageCircle size={10} /> {rp.commentCount}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetType="post"
        targetId={post.id}
      />
    </div>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  BookmarkX,
  Heart,
  MessageCircle,
  Search,
  MapPin,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  Package,
  MessagesSquare,
} from 'lucide-react';
import { useToast } from '@/components/common/Toast';
import type { PostType } from '@/hooks/useCommunityFeed';

// ─── Types ───

interface BookmarkedPost {
  id: string;
  title: string;
  type: PostType;
  category: string;
  authorName: string;
  municipality: string;
  county: string;
  createdAt: string;
  savedAt: string;
  likesCount: number;
  commentCount: number;
  preview: string;
}

// ─── Demo data ───

const DEMO_BOOKMARKS: BookmarkedPost[] = [
  {
    id: 'demo-post-1',
    title: 'Bark beetle activity near Lessebo',
    type: 'alert',
    category: 'Pest Alert',
    authorName: 'Erik Lindgren',
    municipality: 'Lessebo',
    county: 'Kronoberg',
    createdAt: '2026-03-15T08:24:00Z',
    savedAt: '2026-03-15T10:00:00Z',
    likesCount: 12,
    commentCount: 4,
    preview: 'Found bore dust on 4-5 spruce trunks along the south-facing slope. Looks like Ips typographus based on the gallery patterns.',
  },
  {
    id: 'demo-post-4',
    title: 'Helicopter spraying group buy -- Alvesta area',
    type: 'offer',
    category: 'Group Buy',
    authorName: 'Maria Johansson',
    municipality: 'Alvesta',
    county: 'Kronoberg',
    createdAt: '2026-03-12T17:45:00Z',
    savedAt: '2026-03-13T08:00:00Z',
    likesCount: 15,
    commentCount: 0,
    preview: 'If we pool 50+ hectares, per-hectare cost drops by 40%. Treatment window is mid-May.',
  },
  {
    id: 'demo-post-5',
    title: 'First-time owner -- what should I know about gallring?',
    type: 'discussion',
    category: 'Beginner Question',
    authorName: 'Lars Karlsson',
    municipality: 'Vaxjo',
    county: 'Kronoberg',
    createdAt: '2026-03-12T07:15:00Z',
    savedAt: '2026-03-12T09:00:00Z',
    likesCount: 22,
    commentCount: 5,
    preview: 'Just inherited 35ha of mixed forest outside Vaxjo. Most of the spruce seems to be 35-40 years old.',
  },
];

// ─── Helpers ───

const POST_TYPE_CONFIG: Record<PostType, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  alert: { icon: <AlertTriangle size={12} />, label: 'Alert', color: '#d97706', bg: '#fffbeb' },
  tip: { icon: <Lightbulb size={12} />, label: 'Tip', color: '#059669', bg: '#ecfdf5' },
  request: { icon: <HelpCircle size={12} />, label: 'Request', color: '#2563eb', bg: '#eff6ff' },
  offer: { icon: <Package size={12} />, label: 'Offer', color: '#7c3aed', bg: '#f5f3ff' },
  discussion: { icon: <MessagesSquare size={12} />, label: 'Discussion', color: '#0891b2', bg: '#ecfeff' },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffH < 1) return 'just now';
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 30) return `${diffD}d ago`;
  return new Date(dateStr).toLocaleDateString('en', { day: 'numeric', month: 'short' });
}

// ─── Component ───

export default function BookmarksPage() {
  const toast = useToast();
  const [bookmarks, setBookmarks] = useState(DEMO_BOOKMARKS);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBookmarks = bookmarks.filter(b =>
    b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.preview.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
    toast('Bookmark removed', 'info');
  };

  return (
    <div className="relative p-6 sm:p-10 max-w-4xl mx-auto min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#fef3c7', color: '#b45309' }}>
            <Bookmark size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--text)]">Saved Posts</h1>
            <p className="text-sm text-[var(--text3)]">{bookmarks.length} bookmarked discussions</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search saved posts..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/40"
        />
      </div>

      {/* Bookmarks list */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-16">
          <Bookmark size={40} className="mx-auto text-[var(--text3)] mb-4 opacity-30" />
          <p className="text-lg font-semibold text-[var(--text2)] mb-1">
            {searchQuery ? 'No matching bookmarks' : 'No saved posts yet'}
          </p>
          <p className="text-sm text-[var(--text3)]">
            {searchQuery ? 'Try a different search term.' : 'Save interesting forum posts to revisit later.'}
          </p>
          {!searchQuery && (
            <Link
              to="/owner/forum"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:brightness-110"
              style={{ background: 'var(--green)' }}
            >
              Browse Forum
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookmarks.map(bookmark => {
            const typeConfig = POST_TYPE_CONFIG[bookmark.type];

            return (
              <div
                key={bookmark.id}
                className="rounded-2xl border border-[var(--border)] p-5 transition-all hover:border-[var(--border2)] hover:shadow-sm group"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: typeConfig.bg, color: typeConfig.color }}
                      >
                        {typeConfig.icon}
                        {typeConfig.label}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-[var(--border)] text-[var(--text3)]">
                        {bookmark.category}
                      </span>
                    </div>

                    {/* Title */}
                    <Link
                      to={`/owner/forum/${bookmark.id}`}
                      className="text-base font-semibold text-[var(--text)] hover:text-[var(--green)] transition-colors leading-snug block mb-1.5"
                    >
                      {bookmark.title}
                    </Link>

                    {/* Preview */}
                    <p className="text-sm text-[var(--text3)] line-clamp-2 leading-relaxed mb-3">
                      {bookmark.preview}
                    </p>

                    {/* Meta row */}
                    <div className="flex items-center gap-4 text-[11px] text-[var(--text3)]">
                      <span className="font-medium text-[var(--text2)]">{bookmark.authorName}</span>
                      <span className="flex items-center gap-1">
                        <MapPin size={10} />
                        {bookmark.municipality}
                      </span>
                      <span className="flex items-center gap-1">
                        <Heart size={10} />
                        {bookmark.likesCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle size={10} />
                        {bookmark.commentCount}
                      </span>
                      <span>Saved {timeAgo(bookmark.savedAt)}</span>
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemoveBookmark(bookmark.id)}
                    className="shrink-0 p-2 rounded-lg text-[var(--text3)] hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove bookmark"
                  >
                    <BookmarkX size={18} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

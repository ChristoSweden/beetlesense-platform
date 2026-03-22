import { useState, useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Save,
  Send,
  ArrowLeft,
  Search,
  Calendar,
  FileText,
  Clock,
  Tag,
  Link as LinkIcon,
  User,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { DEMO_BLOG_POSTS, type DemoBlogPost } from '@/lib/demoData';

// ─── Types ───

interface EditorPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  category: DemoBlogPost['category'];
  author: string;
  body: string;
  status: 'published' | 'draft';
  published_at: string;
  scheduledAt: string;
  featuredImageUrl: string;
  seoDescription: string;
}

type EditorView = 'list' | 'edit' | 'preview';

// ─── Constants ───

const CATEGORIES: DemoBlogPost['category'][] = [
  'Bark Beetle Research',
  'Forest Management',
  'Technology',
  'Company News',
  'Regulatory Updates',
  'Climate & Ecology',
];

const STATUS_STYLES = {
  published: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  draft: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

// ─── Helpers ───

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderMarkdownPreview(markdown: string): string {
  return markdown
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-[var(--text)] mt-6 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-[var(--text)] mt-8 mb-3">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-[var(--text)] mt-8 mb-3">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--text)]">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm text-[var(--text2)]">$1</li>')
    .replace(/\n\n/g, '</p><p class="text-sm text-[var(--text2)] mb-3 leading-relaxed">')
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<')) return match;
      return `<p class="text-sm text-[var(--text2)] mb-3 leading-relaxed">${match}</p>`;
    });
}

// ─── Post List View ───

function PostList({
  posts,
  onEdit,
  onNew,
  onDelete,
}: {
  posts: EditorPost[];
  onEdit: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');

  const filtered = useMemo(() => {
    let result = posts;
    if (filterStatus !== 'all') {
      result = result.filter(p => p.status === filterStatus);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
    }
    return result;
  }, [posts, filterStatus, search]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-[var(--text)]">Blog Editor</h1>
          <p className="text-xs text-[var(--text3)]">{posts.length} posts total</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[var(--green)] text-white hover:brightness-110 transition"
        >
          <Plus size={16} />
          New Post
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search posts..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
          />
        </div>
        <div className="flex gap-1">
          {(['all', 'published', 'draft'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-[var(--green)]/10 text-[var(--green)]'
                  : 'text-[var(--text3)] hover:text-[var(--text2)] hover:bg-[var(--bg3)]'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Posts table */}
      <div className="rounded-xl border border-[var(--border)] overflow-hidden" style={{ background: 'var(--bg2)' }}>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[var(--border)]">
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wider">Title</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wider hidden md:table-cell">Category</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wider hidden sm:table-cell">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wider hidden lg:table-cell">Date</th>
              <th className="px-4 py-3 text-xs font-semibold text-[var(--text3)] uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filtered.map(post => (
              <tr key={post.id} className="hover:bg-[var(--bg3)]/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-[var(--text)] line-clamp-1">{post.title}</p>
                  <p className="text-[10px] text-[var(--text3)] mt-0.5">{post.author}</p>
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <span className="text-xs text-[var(--text3)]">{post.category}</span>
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[post.status]}`}>
                    {post.status === 'published' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                    {post.status}
                  </span>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className="text-xs text-[var(--text3)]">{formatDate(post.published_at)}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(post.id)}
                      className="p-1.5 rounded-lg text-[var(--text3)] hover:text-[var(--green)] hover:bg-[var(--green)]/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => onDelete(post.id)}
                      className="p-1.5 rounded-lg text-[var(--text3)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center">
                  <FileText size={24} className="mx-auto mb-2 text-[var(--text3)]" />
                  <p className="text-sm text-[var(--text3)]">No posts found</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Post Editor View ───

function PostEditor({
  post,
  onChange,
  onSaveDraft,
  onPublish,
  onPreview,
  onBack,
}: {
  post: EditorPost;
  onChange: (updates: Partial<EditorPost>) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  onPreview: () => void;
  onBack: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to list
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onPreview}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Eye size={14} />
            Preview
          </button>
          <button
            onClick={onSaveDraft}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Save size={14} />
            Save Draft
          </button>
          <button
            onClick={onPublish}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--green)] text-white hover:brightness-110 transition"
          >
            <Send size={14} />
            Publish
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main editor area */}
        <div className="lg:col-span-2 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">Title</label>
            <input
              type="text"
              value={post.title}
              onChange={e => {
                const title = e.target.value;
                onChange({ title, slug: generateSlug(title) });
              }}
              placeholder="Enter post title..."
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">
              <span className="flex items-center gap-1"><LinkIcon size={11} /> Slug</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text3)]">/blog/</span>
              <input
                type="text"
                value={post.slug}
                onChange={e => onChange({ slug: e.target.value })}
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs font-mono text-[var(--text2)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
              />
            </div>
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-xs font-medium text-[var(--text2)] mb-1.5">Excerpt</label>
            <textarea
              value={post.excerpt}
              onChange={e => onChange({ excerpt: e.target.value })}
              rows={2}
              placeholder="Brief summary for listing cards..."
              className="w-full px-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors resize-none"
            />
          </div>

          {/* Body editor with tabs */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--text2)]">Body (Markdown)</label>
              <div className="flex gap-1">
                <button
                  onClick={() => setActiveTab('write')}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    activeTab === 'write'
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  Write
                </button>
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors ${
                    activeTab === 'preview'
                      ? 'bg-[var(--green)]/10 text-[var(--green)]'
                      : 'text-[var(--text3)] hover:text-[var(--text2)]'
                  }`}
                >
                  Preview
                </button>
              </div>
            </div>

            {activeTab === 'write' ? (
              <textarea
                value={post.body}
                onChange={e => onChange({ body: e.target.value })}
                rows={20}
                placeholder="Write your post in Markdown..."
                className="w-full px-4 py-3 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-sm text-[var(--text)] font-mono placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors resize-y leading-relaxed"
              />
            ) : (
              <div
                className="w-full min-h-[480px] px-5 py-4 rounded-lg border border-[var(--border)] bg-[var(--bg)] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdownPreview(post.body)) }}
              />
            )}
          </div>
        </div>

        {/* Sidebar metadata */}
        <div className="space-y-4">
          {/* Status */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <h3 className="text-xs font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">Status</h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_STYLES[post.status]}`}>
              {post.status === 'published' ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
              {post.status}
            </span>
          </div>

          {/* Category */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <label className="block text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Tag size={11} /> Category</span>
            </label>
            <select
              value={post.category}
              onChange={e => onChange({ category: e.target.value as EditorPost['category'] })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Author */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <label className="block text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-wider">
              <span className="flex items-center gap-1"><User size={11} /> Author</span>
            </label>
            <input
              type="text"
              value={post.author}
              onChange={e => onChange({ author: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
            />
          </div>

          {/* Featured Image URL */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <label className="block text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-wider">
              Featured Image URL
            </label>
            <input
              type="text"
              value={post.featuredImageUrl}
              onChange={e => onChange({ featuredImageUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
            />
          </div>

          {/* Scheduled publishing */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <label className="block text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-wider">
              <span className="flex items-center gap-1"><Calendar size={11} /> Schedule Publish</span>
            </label>
            <input
              type="datetime-local"
              value={post.scheduledAt}
              onChange={e => onChange({ scheduledAt: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] focus:outline-none focus:border-[var(--green)]/50 transition-colors"
            />
          </div>

          {/* SEO */}
          <div className="rounded-xl border border-[var(--border)] p-4" style={{ background: 'var(--bg2)' }}>
            <label className="block text-xs font-semibold text-[var(--text)] mb-2 uppercase tracking-wider">
              SEO Description
            </label>
            <textarea
              value={post.seoDescription}
              onChange={e => onChange({ seoDescription: e.target.value })}
              rows={3}
              placeholder="Meta description for search engines..."
              className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-xs text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 transition-colors resize-none"
            />
            <p className="text-[10px] text-[var(--text3)] mt-1">
              {post.seoDescription.length}/160 characters
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Post Preview View ───

function PostPreview({ post, onBack }: { post: EditorPost; onBack: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to editor
        </button>
        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Preview Mode
        </span>
      </div>

      <div
        className="rounded-xl border border-[var(--border)] p-6 md:p-8 max-w-3xl mx-auto"
        style={{ background: 'var(--bg2)' }}
      >
        {/* Meta */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--green)]/10 text-[var(--green)]">
            {post.category}
          </span>
          {post.status === 'draft' && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400">
              Draft
            </span>
          )}
        </div>

        <h1 className="text-2xl font-serif font-bold text-[var(--text)] mb-3">
          {post.title || 'Untitled Post'}
        </h1>

        <p className="text-sm text-[var(--text2)] mb-4 leading-relaxed italic">
          {post.excerpt}
        </p>

        <div className="flex items-center gap-4 text-xs text-[var(--text3)] mb-6 pb-6 border-b border-[var(--border)]">
          <span className="flex items-center gap-1">
            <User size={12} />
            {post.author || 'No author'}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {post.published_at ? formatDate(post.published_at) : 'Not published'}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={12} />
            {Math.max(1, Math.round(post.body.split(/\s+/).length / 200))} min read
          </span>
        </div>

        {/* Rendered body */}
        <div
          className="prose-beetlesense"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(renderMarkdownPreview(post.body)) }}
        />
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function BlogEditorPage() {
  const [view, setView] = useState<EditorView>('list');
  const [posts, setPosts] = useState<EditorPost[]>(() =>
    DEMO_BLOG_POSTS.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      category: p.category,
      author: p.author,
      body: p.body,
      status: p.status,
      published_at: p.published_at,
      scheduledAt: '',
      featuredImageUrl: p.cover_url ?? '',
      seoDescription: p.seoDescription,
    })),
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const editingPost = useMemo(
    () => posts.find(p => p.id === editingId) ?? null,
    [posts, editingId],
  );

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setView('edit');
  };

  const handleNew = () => {
    const newPost: EditorPost = {
      id: `b${Date.now()}`,
      title: '',
      slug: '',
      excerpt: '',
      category: 'Company News',
      author: 'BeetleSense Team',
      body: '',
      status: 'draft',
      published_at: '',
      scheduledAt: '',
      featuredImageUrl: '',
      seoDescription: '',
    };
    setPosts(prev => [newPost, ...prev]);
    setEditingId(newPost.id);
    setView('edit');
  };

  const handleDelete = (id: string) => {
    setPosts(prev => prev.filter(p => p.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setView('list');
    }
    showNotification('success', 'Post deleted');
  };

  const handleChange = (updates: Partial<EditorPost>) => {
    if (!editingId) return;
    setPosts(prev =>
      prev.map(p => (p.id === editingId ? { ...p, ...updates } : p)),
    );
  };

  const handleSaveDraft = () => {
    if (!editingId) return;
    setPosts(prev =>
      prev.map(p => (p.id === editingId ? { ...p, status: 'draft' as const } : p)),
    );
    showNotification('success', 'Saved as draft');
  };

  const handlePublish = () => {
    if (!editingId) return;
    setPosts(prev =>
      prev.map(p =>
        p.id === editingId
          ? { ...p, status: 'published' as const, published_at: p.published_at || new Date().toISOString() }
          : p,
      ),
    );
    showNotification('success', 'Post published');
  };

  const handlePreview = () => {
    setView('preview');
  };

  const handleBackToList = () => {
    setEditingId(null);
    setView('list');
  };

  const handleBackToEditor = () => {
    setView('edit');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg border transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20'
          }`}
        >
          {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-2 opacity-60 hover:opacity-100">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Views */}
      {view === 'list' && (
        <PostList
          posts={posts}
          onEdit={handleEdit}
          onNew={handleNew}
          onDelete={handleDelete}
        />
      )}

      {view === 'edit' && editingPost && (
        <PostEditor
          post={editingPost}
          onChange={handleChange}
          onSaveDraft={handleSaveDraft}
          onPublish={handlePublish}
          onPreview={handlePreview}
          onBack={handleBackToList}
        />
      )}

      {view === 'preview' && editingPost && (
        <PostPreview post={editingPost} onBack={handleBackToEditor} />
      )}
    </div>
  );
}

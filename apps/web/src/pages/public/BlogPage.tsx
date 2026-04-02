import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  Rss,
  Clock,
  ChevronRight,
  ChevronLeft,
  User,
  Tag,
  TreePine,
  Bug,
  Cpu,
  Building2,
  Scale,
  Leaf,
} from 'lucide-react';
import { DEMO_BLOG_POSTS, type DemoBlogPost } from '@/lib/demoData';

// ─── Constants ───

const CATEGORIES = [
  { label: 'All', value: 'all', icon: BookOpen },
  { label: 'Bark Beetle Research', value: 'Bark Beetle Research', icon: Bug },
  { label: 'Forest Management', value: 'Forest Management', icon: TreePine },
  { label: 'Technology', value: 'Technology', icon: Cpu },
  { label: 'Company News', value: 'Company News', icon: Building2 },
  { label: 'Regulatory Updates', value: 'Regulatory Updates', icon: Scale },
  { label: 'Climate & Ecology', value: 'Climate & Ecology', icon: Leaf },
] as const;

const PAGE_SIZE = 12;

const CATEGORY_COLORS: Record<string, string> = {
  'Bark Beetle Research': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Forest Management': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Technology': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Company News': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Regulatory Updates': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Climate & Ecology': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

// ─── Helpers ───

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ImagePlaceholder({ category, large }: { category: string; large?: boolean }) {
  const colors: Record<string, string> = {
    'Bark Beetle Research': 'from-red-900/40 to-red-950/60',
    'Forest Management': 'from-emerald-900/40 to-emerald-950/60',
    'Technology': 'from-blue-900/40 to-blue-950/60',
    'Company News': 'from-amber-900/40 to-amber-950/60',
    'Regulatory Updates': 'from-purple-900/40 to-purple-950/60',
    'Climate & Ecology': 'from-teal-900/40 to-teal-950/60',
  };
  const gradient = colors[category] ?? 'from-green-900/40 to-green-950/60';
  const Icon = CATEGORIES.find(c => c.value === category)?.icon ?? TreePine;

  return (
    <div className={`bg-gradient-to-br ${gradient} flex items-center justify-center ${large ? 'h-64 md:h-80' : 'h-44'} rounded-t-xl`}>
      <Icon size={large ? 48 : 32} className="text-white/20" />
    </div>
  );
}

// ─── Blog Card ───

function BlogListCard({ post }: { post: DemoBlogPost }) {
  const badgeClass = CATEGORY_COLORS[post.category] ?? 'bg-[var(--green)]/10 text-[var(--green)]';

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group block rounded-xl border border-[var(--border)] hover:border-[var(--border2)] transition-all duration-200 overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      <ImagePlaceholder category={post.category} />
      <div className="p-5">
        {/* Category badge */}
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass} mb-3`}>
          <Tag size={9} />
          {post.category}
        </span>

        {/* Title */}
        <h3 className="text-base font-semibold text-[var(--text)] mb-2 group-hover:text-[var(--green)] transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* Excerpt */}
        <p className="text-xs text-[var(--text3)] mb-4 line-clamp-3 leading-relaxed">
          {post.excerpt}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <User size={10} />
              {post.author.split(' ').slice(-1)[0]}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDate(post.published_at)}
            </span>
            <span>{post.readTime} min read</span>
          </div>
          <span className="flex items-center gap-0.5 text-xs font-medium text-[var(--green)] opacity-0 group-hover:opacity-100 transition-opacity">
            Read
            <ChevronRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Featured Hero Card ───

function FeaturedHero({ post }: { post: DemoBlogPost }) {
  const badgeClass = CATEGORY_COLORS[post.category] ?? 'bg-[var(--green)]/10 text-[var(--green)]';

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group block rounded-2xl border border-[var(--border)] hover:border-[var(--border2)] transition-all duration-300 overflow-hidden mb-10"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="md:flex">
        <div className="md:w-1/2 flex-shrink-0">
          <ImagePlaceholder category={post.category} large />
        </div>
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[var(--green)]/10 text-[var(--green)]">
              Featured
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}>
              {post.category}
            </span>
          </div>

          <h2 className="text-xl md:text-2xl font-serif font-bold text-[var(--text)] mb-3 group-hover:text-[var(--green)] transition-colors">
            {post.title}
          </h2>

          <p className="text-sm text-[var(--text2)] mb-5 leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>

          <div className="flex items-center gap-4 text-xs text-[var(--text3)]">
            <span className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-[var(--green)]/10 flex items-center justify-center">
                <User size={12} className="text-[var(--green)]" />
              </div>
              {post.author}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {formatDate(post.published_at)}
            </span>
            <span>{post.readTime} min read</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Main Component ───

export default function BlogPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const publishedPosts = useMemo(
    () => DEMO_BLOG_POSTS.filter(p => p.status === 'published'),
    [],
  );

  const featuredPost = useMemo(
    () => publishedPosts.find(p => p.featured) ?? publishedPosts[0],
    [publishedPosts],
  );

  const filteredPosts = useMemo(() => {
    let result = publishedPosts.filter(p => p.id !== featuredPost?.id);

    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p =>
          p.title.toLowerCase().includes(q) ||
          p.excerpt.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q),
      );
    }

    return result;
  }, [publishedPosts, activeCategory, searchQuery, featuredPost]);

  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const paginatedPosts = filteredPosts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  // Reset page when filters change
  const handleCategoryChange = (cat: string) => {
    setActiveCategory(cat);
    setCurrentPage(1);
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-6xl mx-auto px-5 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: 'var(--green-light, rgba(27, 94, 32, 0.08))', color: 'var(--green)' }}
              >
                <BookOpen size={20} />
              </div>
              <div>
                <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                  BeetleSense Blog
                </h1>
                <p className="text-xs text-[var(--text3)]">
                  Forest intelligence, research insights, and bark beetle analysis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="text-xs font-medium text-[var(--text2)] hover:text-[var(--text)] transition-colors"
              >
                Home
              </Link>
              <a
                href="/blog/rss.xml"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
                title="RSS Feed"
              >
                <Rss size={14} />
                RSS
              </a>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        {/* Featured Post Hero */}
        {featuredPost && activeCategory === 'all' && !searchQuery.trim() && (
          <FeaturedHero post={featuredPost} />
        )}

        {/* Search + Filters */}
        <div className="mb-8 space-y-4">
          {/* Search bar */}
          <div className="relative max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text3)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => handleSearchChange(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg2)] text-sm text-[var(--text)] placeholder:text-[var(--text3)] focus:outline-none focus:border-[var(--green)]/50 focus:ring-1 focus:ring-[var(--green)]/20 transition-colors"
            />
          </div>

          {/* Category filter pills */}
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.value;
              const Icon = cat.icon;
              return (
                <button
                  key={cat.value}
                  onClick={() => handleCategoryChange(cat.value)}
                  className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150
                    ${isActive
                      ? 'bg-[var(--green)]/10 text-[var(--green)] border-[var(--green)]/30'
                      : 'bg-[var(--bg2)] text-[var(--text3)] border-[var(--border)] hover:text-[var(--text2)] hover:border-[var(--border2)]'
                    }
                  `}
                >
                  <Icon size={12} />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Results count */}
        <p className="text-xs text-[var(--text3)] mb-4">
          {filteredPosts.length} article{filteredPosts.length !== 1 ? 's' : ''}
          {activeCategory !== 'all' ? ` in ${activeCategory}` : ''}
          {searchQuery.trim() ? ` matching "${searchQuery}"` : ''}
        </p>

        {/* Post Grid */}
        {paginatedPosts.length === 0 ? (
          <div
            className="rounded-xl border border-[var(--border)] p-12 text-center"
            style={{ background: 'var(--bg2)' }}
          >
            <BookOpen size={32} className="mx-auto mb-3 text-[var(--text3)]" />
            <p className="text-sm text-[var(--text3)]">
              No articles found. Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedPosts.map(post => (
              <BlogListCard key={post.id} post={post} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={14} />
              Previous
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`
                  w-8 h-8 rounded-lg text-xs font-medium transition-colors
                  ${page === currentPage
                    ? 'bg-[var(--green)] text-white'
                    : 'text-[var(--text3)] hover:bg-[var(--bg3)] hover:text-[var(--text2)]'
                  }
                `}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:bg-[var(--bg3)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-12" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-6xl mx-auto px-5 py-6 flex items-center justify-between">
          <p className="text-xs text-[var(--text3)]">
            BeetleSense.ai &mdash; AI-powered forest intelligence
          </p>
          <a
            href="/blog/rss.xml"
            className="flex items-center gap-1 text-xs text-[var(--text3)] hover:text-[var(--green)] transition-colors"
          >
            <Rss size={12} />
            RSS Feed
          </a>
        </div>
      </footer>
    </div>
  );
}

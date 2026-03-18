import { useState, useMemo, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  BookOpen,
  User,
  Copy,
  Check,
  Share2,
  Tag,
  TreePine,
  Bug,
  Cpu,
  Building2,
  Scale,
  Leaf,
  List,
} from 'lucide-react';
import { DEMO_BLOG_POSTS, type DemoBlogPost } from '@/lib/demoData';

// ─── Constants ───

const CATEGORY_COLORS: Record<string, string> = {
  'Bark Beetle Research': 'bg-red-500/10 text-red-400 border-red-500/20',
  'Forest Management': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'Technology': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  'Company News': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  'Regulatory Updates': 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  'Climate & Ecology': 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

const CATEGORY_ICONS: Record<string, typeof Bug> = {
  'Bark Beetle Research': Bug,
  'Forest Management': TreePine,
  'Technology': Cpu,
  'Company News': Building2,
  'Regulatory Updates': Scale,
  'Climate & Ecology': Leaf,
};

// ─── Helpers ───

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

interface TocHeading {
  id: string;
  text: string;
  level: number;
}

function extractHeadings(body: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2];
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\u00e4\u00f6\u00e5\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      headings.push({ id, text, level });
    }
  }
  return headings;
}

function renderMarkdown(markdown: string): React.JSX.Element[] {
  const lines = markdown.split('\n');
  const elements: React.JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul
          key={`list-${elements.length}`}
          className="list-disc list-inside space-y-1.5 mb-5 text-sm text-[var(--text2)] ml-1"
        >
          {listItems.map((item, i) => (
            <li key={i} className="leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (line.startsWith('### ')) {
      flushList();
      const text = line.slice(4);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\u00e4\u00f6\u00e5\s-]/g, '')
        .replace(/\s+/g, '-');
      elements.push(
        <h3 key={i} id={id} className="text-base font-semibold text-[var(--text)] mt-8 mb-3 scroll-mt-20">
          {renderInline(text)}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      flushList();
      const text = line.slice(3);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\u00e4\u00f6\u00e5\s-]/g, '')
        .replace(/\s+/g, '-');
      elements.push(
        <h2 key={i} id={id} className="text-lg font-bold text-[var(--text)] mt-10 mb-4 scroll-mt-20">
          {renderInline(text)}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      flushList();
      const text = line.slice(2);
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9\u00e4\u00f6\u00e5\s-]/g, '')
        .replace(/\s+/g, '-');
      elements.push(
        <h1 key={i} id={id} className="text-xl font-bold text-[var(--text)] mt-10 mb-4 scroll-mt-20">
          {renderInline(text)}
        </h1>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="text-sm text-[var(--text2)] mb-4 leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }

  flushList();
  return elements;
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|\[\d+\])/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[var(--text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return <em key={i} className="italic">{part.slice(1, -1)}</em>;
    }
    const linkMatch = part.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--green)] hover:underline"
        >
          {linkMatch[1]}
        </a>
      );
    }
    if (/^\[\d+\]$/.test(part)) {
      return (
        <sup key={i} className="text-[var(--green)] font-mono text-[10px]">
          {part}
        </sup>
      );
    }
    return part;
  });
}

// ─── Related Post Card ───

function RelatedCard({ post }: { post: DemoBlogPost }) {
  const badgeClass = CATEGORY_COLORS[post.category] ?? 'bg-[var(--green)]/10 text-[var(--green)]';
  const Icon = CATEGORY_ICONS[post.category] ?? TreePine;

  return (
    <Link
      to={`/blog/${post.id}`}
      className="group block rounded-xl border border-[var(--border)] hover:border-[var(--border2)] transition-all duration-200 overflow-hidden"
      style={{ background: 'var(--bg2)' }}
    >
      {/* Image placeholder */}
      <div className="h-32 bg-gradient-to-br from-green-900/30 to-green-950/50 flex items-center justify-center">
        <Icon size={28} className="text-white/15" />
      </div>
      <div className="p-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass} mb-2`}>
          {post.category}
        </span>
        <h4 className="text-sm font-semibold text-[var(--text)] group-hover:text-[var(--green)] transition-colors line-clamp-2 mb-2">
          {post.title}
        </h4>
        <div className="flex items-center gap-2 text-[10px] text-[var(--text3)]">
          <Clock size={10} />
          {post.readTime} min read
        </div>
      </div>
    </Link>
  );
}

// ─── Table of Contents Sidebar ───

function TableOfContents({ headings, activeId }: { headings: TocHeading[]; activeId: string }) {
  if (headings.length < 2) return null;

  return (
    <nav className="sticky top-8" aria-label="Table of contents">
      <div className="flex items-center gap-2 mb-3">
        <List size={14} className="text-[var(--text3)]" />
        <span className="text-xs font-semibold text-[var(--text2)] uppercase tracking-wider">
          Contents
        </span>
      </div>
      <ul className="space-y-1 border-l border-[var(--border)]">
        {headings.map(h => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`
                block text-xs py-1 transition-colors
                ${h.level === 1 ? 'pl-3' : h.level === 2 ? 'pl-3' : 'pl-6'}
                ${activeId === h.id
                  ? 'text-[var(--green)] border-l-2 border-[var(--green)] -ml-[1px] font-medium'
                  : 'text-[var(--text3)] hover:text-[var(--text2)]'
                }
              `}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// ─── Author Bio Card ───

function AuthorBio({ author, authorRole }: { author: string; authorRole: string }) {
  return (
    <div
      className="rounded-xl border border-[var(--border)] p-5 flex items-start gap-4"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 border border-[var(--green)]/20 flex items-center justify-center flex-shrink-0">
        <User size={20} className="text-[var(--green)]" />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--text)]">{author}</p>
        <p className="text-xs text-[var(--text3)] mb-2">{authorRole}</p>
        <p className="text-xs text-[var(--text3)] leading-relaxed">
          Contributing expert at BeetleSense.ai, dedicated to advancing forest health monitoring through technology and research.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function BlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const [copied, setCopied] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState('');

  const post = useMemo(
    () => DEMO_BLOG_POSTS.find(p => p.id === id && p.status === 'published'),
    [id],
  );

  const headings = useMemo(() => (post ? extractHeadings(post.body) : []), [post]);

  const relatedPosts = useMemo(() => {
    if (!post) return [];
    return DEMO_BLOG_POSTS
      .filter(p => p.id !== post.id && p.status === 'published')
      .filter(p => p.category === post.category || p.author === post.author)
      .slice(0, 3);
  }, [post]);

  // Intersection observer for TOC active heading
  useEffect(() => {
    if (headings.length < 2) return;

    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveHeadingId(entry.target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -70% 0px', threshold: 0 },
    );

    for (const h of headings) {
      const el = document.getElementById(h.id);
      if (el) observer.observe(el);
    }

    return () => observer.disconnect();
  }, [headings]);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTwitter = () => {
    if (!post) return;
    const text = encodeURIComponent(post.title);
    const url = encodeURIComponent(window.location.href);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  // Not found state
  if (!post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <BookOpen size={32} className="mx-auto mb-3 text-[var(--text3)]" />
          <p className="text-sm text-[var(--text3)] mb-4">Post not found</p>
          <Link
            to="/blog"
            className="text-sm font-medium text-[var(--green)] hover:underline"
          >
            Back to Blog
          </Link>
        </div>
      </div>
    );
  }

  const badgeClass = CATEGORY_COLORS[post.category] ?? 'bg-[var(--green)]/10 text-[var(--green)]';

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Top bar */}
      <header className="border-b border-[var(--border)] sticky top-0 z-10" style={{ background: 'var(--bg)' }}>
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link
            to="/blog"
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] transition-colors"
          >
            <ArrowLeft size={14} />
            Back to Blog
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              {copied ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
            <button
              onClick={handleShareTwitter}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
            >
              <Share2 size={14} />
              Share on X
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-[var(--text3)] mb-6" aria-label="Breadcrumb">
          <Link to="/blog" className="hover:text-[var(--green)] transition-colors">Blog</Link>
          <ChevronRight size={12} />
          <Link
            to={`/blog?category=${encodeURIComponent(post.category)}`}
            className="hover:text-[var(--green)] transition-colors"
          >
            {post.category}
          </Link>
          <ChevronRight size={12} />
          <span className="text-[var(--text2)] truncate max-w-[200px]">{post.title}</span>
        </nav>

        <div className="flex gap-10">
          {/* Main content */}
          <article className="flex-1 min-w-0 max-w-3xl">
            {/* Hero header */}
            <header className="mb-8">
              {/* Category + meta */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badgeClass}`}>
                  <Tag size={10} />
                  {post.category}
                </span>
              </div>

              <h1 className="text-2xl md:text-3xl font-serif font-bold text-[var(--text)] mb-4 leading-tight">
                {post.title}
              </h1>

              <p className="text-sm text-[var(--text2)] mb-5 leading-relaxed">
                {post.excerpt}
              </p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text3)] pb-6 border-b border-[var(--border)]">
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
                <span className="flex items-center gap-1">
                  <BookOpen size={12} />
                  {post.readTime} min read
                </span>
              </div>
            </header>

            {/* Article body */}
            <div className="prose-beetlesense mb-10">
              {renderMarkdown(post.body)}
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)] my-8" />

            {/* Author Bio */}
            <div className="mb-10">
              <h3 className="text-sm font-semibold text-[var(--text)] mb-4">About the Author</h3>
              <AuthorBio author={post.author} authorRole={post.authorRole} />
            </div>

            {/* Share actions */}
            <div
              className="rounded-xl border border-[var(--border)] p-5 mb-10 flex items-center justify-between"
              style={{ background: 'var(--bg2)' }}
            >
              <span className="text-xs font-medium text-[var(--text2)]">
                Found this article useful? Share it with fellow forest owners.
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                >
                  {copied ? <Check size={12} className="text-[var(--green)]" /> : <Copy size={12} />}
                  {copied ? 'Copied!' : 'Copy link'}
                </button>
                <button
                  onClick={handleShareTwitter}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--bg3)] text-[var(--text2)] hover:text-[var(--text)] transition-colors"
                >
                  <Share2 size={12} />
                  X / Twitter
                </button>
              </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-[var(--text)] mb-4">Related Articles</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {relatedPosts.map(rp => (
                    <RelatedCard key={rp.id} post={rp} />
                  ))}
                </div>
              </section>
            )}
          </article>

          {/* Table of Contents sidebar (desktop only) */}
          <aside className="hidden lg:block w-56 flex-shrink-0">
            <TableOfContents headings={headings} activeId={activeHeadingId} />
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] mt-12" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-6xl mx-auto px-5 py-6 text-center">
          <Link
            to="/blog"
            className="text-xs font-medium text-[var(--green)] hover:underline"
          >
            View all articles
          </Link>
        </div>
      </footer>
    </div>
  );
}

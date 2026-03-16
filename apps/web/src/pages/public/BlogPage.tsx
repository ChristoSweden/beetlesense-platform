import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { isSupabaseConfigured } from '@/lib/supabase';
import { BlogCard, type BlogPostPreview } from '@/components/blog/BlogCard';
import { DEMO_BLOG_POSTS } from '@/lib/demoData';
import { BookOpen } from 'lucide-react';

/**
 * Public blog listing page.
 * Route: /blog
 */
export default function BlogPage() {
  const { i18n } = useTranslation();
  const locale = (i18n.language?.startsWith('sv') ? 'sv' : 'en') as 'en' | 'sv';

  const [posts, setPosts] = useState<BlogPostPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 12;

  useEffect(() => {
    loadPosts(0);
  }, [locale]);

  async function loadPosts(pageNum: number) {
    setLoading(true);

    if (!isSupabaseConfigured) {
      const mapped: BlogPostPreview[] = DEMO_BLOG_POSTS.map((p) => ({
        id: p.id,
        title: p.title,
        summary: p.excerpt,
        tags: ['forestry', 'research'],
        published_at: p.published_at,
        body_length: 2000,
      }));
      setPosts(mapped);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const titleCol = locale === 'sv' ? 'title_sv' : 'title_en';
    const summaryCol = locale === 'sv' ? 'summary_sv' : 'summary_en';
    const bodyCol = locale === 'sv' ? 'body_sv' : 'body_en';

    const { data, error } = await supabase
      .from('blog_posts')
      .select(`id, ${titleCol}, ${summaryCol}, ${bodyCol}, tags, published_at`)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch blog posts:', error.message);
      setLoading(false);
      return;
    }

    const mapped: BlogPostPreview[] = (data ?? []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: (row[titleCol] as string) ?? '',
      summary: (row[summaryCol] as string) ?? '',
      tags: (row.tags as string[]) ?? [],
      published_at: (row.published_at as string) ?? '',
      body_length: ((row[bodyCol] as string) ?? '').length,
    }));

    if (pageNum === 0) {
      setPosts(mapped);
    } else {
      setPosts((prev) => [...prev, ...mapped]);
    }

    setHasMore(mapped.length === PAGE_SIZE);
    setPage(pageNum);
    setLoading(false);
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="border-b border-[var(--border)]" style={{ background: 'var(--bg2)' }}>
        <div className="max-w-4xl mx-auto px-5 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: '#4ade8015', color: '#4ade80' }}
            >
              <BookOpen size={20} />
            </div>
            <div>
              <h1 className="text-xl font-serif font-bold text-[var(--text)]">
                BeetleSense Forest Intelligence
              </h1>
              <p className="text-xs text-[var(--text3)]">
                AI-curated forestry news, research insights, and beetle outbreak analysis
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-5 py-8">
        {loading && posts.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="rounded-xl border border-[var(--border)] p-5 animate-pulse"
                style={{ background: 'var(--bg2)' }}
              >
                <div className="flex gap-2 mb-3">
                  <div className="h-4 w-16 bg-[var(--bg3)] rounded-full" />
                  <div className="h-4 w-12 bg-[var(--bg3)] rounded-full" />
                </div>
                <div className="h-5 bg-[var(--bg3)] rounded w-3/4 mb-2" />
                <div className="h-3 bg-[var(--bg3)] rounded w-full mb-1" />
                <div className="h-3 bg-[var(--bg3)] rounded w-2/3 mb-4" />
                <div className="h-3 bg-[var(--bg3)] rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div
            className="rounded-xl border border-[var(--border)] p-12 text-center"
            style={{ background: 'var(--bg2)' }}
          >
            <BookOpen size={32} className="mx-auto mb-3 text-[var(--text3)]" />
            <p className="text-sm text-[var(--text3)]">
              No blog posts published yet. Check back soon for forestry intelligence reports.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {posts.map((post) => (
                <BlogCard key={post.id} post={post} locale={locale} />
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={() => loadPosts(page + 1)}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Loading...' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

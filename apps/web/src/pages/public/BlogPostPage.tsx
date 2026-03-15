import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { BlogPost, type BlogPostFull } from '@/components/blog/BlogPost';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Public blog post detail page.
 * Route: /blog/:id
 */
export default function BlogPostPage() {
  const { id } = useParams<{ id: string }>();
  const { i18n } = useTranslation();
  const locale = (i18n.language?.startsWith('sv') ? 'sv' : 'en') as 'en' | 'sv';

  const [post, setPost] = useState<BlogPostFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadPost() {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select(
          'id, title_en, title_sv, summary_en, summary_sv, body_en, body_sv, tags, sources, published_at',
        )
        .eq('id', id)
        .eq('status', 'published')
        .single();

      if (fetchError) {
        setError(fetchError.code === 'PGRST116' ? 'Post not found' : fetchError.message);
        setLoading(false);
        return;
      }

      setPost(data as BlogPostFull);
      setLoading(false);
    }

    loadPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="animate-spin text-[var(--green)]" />
          <span className="text-xs text-[var(--text3)] font-mono">Loading post...</span>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="text-center">
          <p className="text-sm text-[var(--text3)] mb-4">
            {error ?? 'Post not found'}
          </p>
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

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-5 py-8">
        <BlogPost post={post} defaultLocale={locale} />
      </div>
    </div>
  );
}

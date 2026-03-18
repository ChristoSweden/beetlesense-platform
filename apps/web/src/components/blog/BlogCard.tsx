import { Link } from 'react-router-dom';
import { Clock, Tag, ChevronRight } from 'lucide-react';

// ─── Types ───

export interface BlogPostPreview {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  published_at: string;
  body_length: number;
}

interface BlogCardProps {
  post: BlogPostPreview;
  locale?: 'en' | 'sv';
}

// ─── Helpers ───

function estimateReadTime(bodyLength: number): string {
  // Rough estimate: 1000 chars ~ 1 minute reading
  const minutes = Math.max(1, Math.round(bodyLength / 1000));
  return `${minutes} min read`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

// ─── Component ───

export function BlogCard({ post, locale: _locale = 'en' }: BlogCardProps) {
  return (
    <Link
      to={`/blog/${post.id}`}
      className="group block rounded-xl border border-[var(--border)] hover:border-[var(--border2)] transition-all duration-200"
      style={{ background: 'var(--bg2)' }}
    >
      <div className="p-5">
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {post.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--green)]/10 text-[var(--green)]"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h3 className="text-base font-semibold text-[var(--text)] mb-2 group-hover:text-[var(--green)] transition-colors line-clamp-2">
          {post.title}
        </h3>

        {/* Summary */}
        <p className="text-xs text-[var(--text3)] mb-4 line-clamp-3">
          {post.summary}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-[var(--text3)]">
            <span className="flex items-center gap-1">
              <Clock size={10} />
              {formatDate(post.published_at)}
            </span>
            <span>{estimateReadTime(post.body_length)}</span>
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

export default BlogCard;

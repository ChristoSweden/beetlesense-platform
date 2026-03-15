import React, { useState } from 'react';
import {
  ArrowLeft,
  Globe,
  Share2,
  Copy,
  Check,
  ExternalLink,
  Tag,
  Clock,
  BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ─── Types ───

export interface BlogPostFull {
  id: string;
  title_en: string;
  title_sv: string;
  summary_en: string;
  summary_sv: string;
  body_en: string;
  body_sv: string;
  tags: string[];
  sources: Array<{ title: string; url: string; source: string }>;
  published_at: string;
}

interface BlogPostProps {
  post: BlogPostFull;
  defaultLocale?: 'en' | 'sv';
}

// ─── Helpers ───

function estimateReadTime(body: string): string {
  const words = body.split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words / 200));
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

/**
 * Very basic markdown renderer for blog body.
 * Handles headings, paragraphs, bold, italic, links, and lists.
 * For production, consider using react-markdown.
 */
function renderMarkdown(markdown: string): React.JSX.Element[] {
  const lines = markdown.split('\n');
  const elements: React.JSX.Element[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-sm text-[var(--text2)]">
          {listItems.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    // Headings
    if (line.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-base font-semibold text-[var(--text)] mt-6 mb-2">
          {renderInline(line.slice(4))}
        </h3>,
      );
    } else if (line.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-lg font-bold text-[var(--text)] mt-8 mb-3">
          {renderInline(line.slice(3))}
        </h2>,
      );
    } else if (line.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={i} className="text-xl font-bold text-[var(--text)] mt-8 mb-3">
          {renderInline(line.slice(2))}
        </h1>,
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
    } else {
      flushList();
      elements.push(
        <p key={i} className="text-sm text-[var(--text2)] mb-3 leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }

  flushList();
  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Bold, italic, links, citation refs
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|\[\d+\])/g);

  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[var(--text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>;
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
    // Citation reference like [1]
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

// ─── Component ───

export function BlogPost({ post, defaultLocale = 'en' }: BlogPostProps) {
  const [locale, setLocale] = useState<'en' | 'sv'>(defaultLocale);
  const [copied, setCopied] = useState(false);

  const title = locale === 'en' ? post.title_en : post.title_sv;
  const summary = locale === 'en' ? post.summary_en : post.summary_sv;
  const body = locale === 'en' ? post.body_en : post.body_sv;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      await navigator.share({ title, url });
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article className="max-w-2xl mx-auto">
      {/* Navigation */}
      <div className="flex items-center justify-between mb-6">
        <Link
          to="/blog"
          className="flex items-center gap-1.5 text-xs font-medium text-[var(--text2)] hover:text-[var(--green)] transition-colors"
        >
          <ArrowLeft size={14} />
          Back to Blog
        </Link>

        {/* Language toggle + share */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocale(locale === 'en' ? 'sv' : 'en')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Globe size={14} />
            {locale === 'en' ? 'Svenska' : 'English'}
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            <Share2 size={14} />
            Share
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[var(--border)] text-[var(--text2)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors"
          >
            {copied ? <Check size={14} className="text-[var(--green)]" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      </div>

      {/* Header */}
      <header className="mb-8">
        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {post.tags.map((tag) => (
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

        <h1 className="text-2xl font-serif font-bold text-[var(--text)] mb-3">
          {title}
        </h1>

        <p className="text-sm text-[var(--text2)] mb-4 leading-relaxed">
          {summary}
        </p>

        {/* Meta */}
        <div className="flex items-center gap-4 text-xs text-[var(--text3)]">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {formatDate(post.published_at)}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen size={12} />
            {estimateReadTime(body)}
          </span>
          <span className="font-medium text-[var(--green)]">
            BeetleSense Forest Intelligence Report
          </span>
        </div>
      </header>

      {/* Divider */}
      <div className="border-t border-[var(--border)] mb-8" />

      {/* Body */}
      <div className="prose-beetlesense">{renderMarkdown(body)}</div>

      {/* Sources */}
      {post.sources.length > 0 && (
        <footer className="mt-10 pt-6 border-t border-[var(--border)]">
          <h3 className="text-sm font-semibold text-[var(--text)] mb-3">
            Sources
          </h3>
          <ol className="space-y-2">
            {post.sources.map((source, i) => (
              <li key={i} className="flex items-start gap-2 text-xs">
                <span className="font-mono text-[var(--green)] flex-shrink-0">
                  [{i + 1}]
                </span>
                <div className="min-w-0">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text2)] hover:text-[var(--green)] transition-colors flex items-center gap-1"
                  >
                    {source.title}
                    <ExternalLink size={10} className="flex-shrink-0" />
                  </a>
                  <span className="text-[var(--text3)]"> — {source.source}</span>
                </div>
              </li>
            ))}
          </ol>
        </footer>
      )}
    </article>
  );
}

export default BlogPost;

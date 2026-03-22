import DOMPurify from 'dompurify';

/**
 * Sanitize HTML for safe rendering via dangerouslySetInnerHTML.
 * Uses DOMPurify to strip scripts, event handlers, and other XSS vectors.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'strong', 'b', 'em', 'i', 'u', 'code', 'pre', 'br', 'p', 'span', 'div',
      'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'a', 'img', 'blockquote', 'hr', 'sup', 'sub',
    ],
    ALLOWED_ATTR: ['class', 'style', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Stricter sanitize for inline text — only allows basic formatting.
 */
export function sanitizeInline(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['strong', 'b', 'em', 'i', 'code', 'br', 'span'],
    ALLOWED_ATTR: ['class'],
  });
}

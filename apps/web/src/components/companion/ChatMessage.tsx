import { useState, memo } from 'react';
import DOMPurify from 'dompurify';
import type { ChatMessage as ChatMessageType } from './useChatStore';
import { CitationCard } from './CitationCard';

interface ChatMessageProps {
  message: ChatMessageType;
}

function renderMarkdown(content: string): string {
  // Simple markdown rendering — DOMPurify handles sanitization
  let html = content
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Code blocks
    .replace(/```(\w*)\n?([\s\S]*?)```/g, '<pre class="bg-forest-950 border border-[color:var(--border)] rounded-lg p-3 my-2 overflow-x-auto text-[11px] font-mono text-[color:var(--text2)]"><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code class="bg-forest-900 px-1.5 py-0.5 rounded text-[11px] font-mono text-[color:var(--green)]">$1</code>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-[color:var(--text)]">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li class="ml-4 text-[11px] list-disc">$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 text-[11px] list-decimal">$1</li>')
    // Newlines to breaks (outside of pre blocks)
    .replace(/\n/g, '<br/>');

  // Wrap consecutive list items
  html = html.replace(
    /(<li class="ml-4 text-\[11px\] list-disc">.*?<\/li>(?:<br\/>)?)+/g,
    (match) => `<ul class="my-1">${match.replace(/<br\/>/g, '')}</ul>`,
  );
  html = html.replace(
    /(<li class="ml-4 text-\[11px\] list-decimal">.*?<\/li>(?:<br\/>)?)+/g,
    (match) => `<ol class="my-1">${match.replace(/<br\/>/g, '')}</ol>`,
  );

  // Sanitize with DOMPurify — allow safe formatting tags only
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['strong', 'em', 'code', 'pre', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['class'],
  });
}

const CONFIDENCE_CONFIG = {
  high: { label: 'High confidence', color: 'text-[var(--green)]', bg: 'bg-[var(--green)]/10' },
  medium: { label: 'Medium confidence', color: 'text-amber', bg: 'bg-amber/10' },
  low: { label: 'Low confidence', color: 'text-danger', bg: 'bg-danger/10' },
};

export const ChatMessage = memo(function ChatMessage({ message }: ChatMessageProps) {
  const [expandedCitation, setExpandedCitation] = useState<number | null>(null);
  const isUser = message.role === 'user';

  const timeStr = new Date(message.timestamp).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 animate-msg-in`}>
      <div className={`max-w-[85%] ${isUser ? 'order-1' : 'order-0'}`}>
        {/* Message bubble */}
        <div
          className={`rounded-2xl px-4 py-3 transition-colors ${
            isUser
              ? 'bg-forest-700 rounded-br-md'
              : 'bg-forest-800 rounded-bl-md'
          }`}
        >
          {message.isStreaming && !message.content ? (
            <div className="flex items-center gap-2 py-1" aria-label="AI is thinking...">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          ) : (
            <div
              className="text-xs text-[var(--text2)] leading-relaxed [&_strong]:text-[var(--text)] [&_a]:text-[var(--green)] [&_a]:underline"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
            />
          )}

          {/* Streaming cursor */}
          {message.isStreaming && message.content && (
            <span className="inline-block w-1.5 h-3.5 bg-[var(--green)] animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
        </div>

        {/* Metadata row */}
        <div
          className={`flex items-center gap-2 mt-1 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
          <span className="text-[9px] text-[var(--text3)] font-mono">{timeStr}</span>

          {/* Confidence badge for assistant */}
          {!isUser && message.confidence && !message.isStreaming && (
            <span
              className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
                CONFIDENCE_CONFIG[message.confidence].color
              } ${CONFIDENCE_CONFIG[message.confidence].bg}`}
            >
              {CONFIDENCE_CONFIG[message.confidence].label}
            </span>
          )}
        </div>

        {/* Citations */}
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {message.citations.map((citation) => (
              <CitationCard
                key={citation.id}
                citation={citation}
                isExpanded={expandedCitation === citation.id}
                onToggle={() =>
                  setExpandedCitation(
                    expandedCitation === citation.id ? null : citation.id,
                  )
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Send, Sparkles, ChevronDown, Plus, Trash2, Globe, ChevronRight, FileDown } from 'lucide-react';
import { useChatStore } from './useChatStore';
import { ChatMessage } from './ChatMessage';
import { VoiceInput } from './VoiceInput';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { VisuallyHidden } from '@/components/a11y/VisuallyHidden';
import {
  COMPANION_PROMPTS,
  PROMPT_CATEGORIES,
  getRandomPrompts,
  type PromptCategory,
} from '@/data/companionPrompts';
import {
  SourceBadge,
  GuardrailWarnings,
  analyzeResponse,
} from './CompanionGuardrails';
import { FiduciaryInlineBadge } from '@/components/advisor/FiduciaryBadge';

// ── Language persistence ────────────────────────────────────────────────────

type CompanionLang = 'sv' | 'en';

function getStoredLang(): CompanionLang {
  try {
    return (localStorage.getItem('beetlesense-companion-lang') as CompanionLang) || 'sv';
  } catch {
    return 'sv';
  }
}

function storeLang(lang: CompanionLang) {
  try {
    localStorage.setItem('beetlesense-companion-lang', lang);
  } catch {
    // Ignore storage errors
  }
}

// ── Follow-up suggestions ───────────────────────────────────────────────────

interface FollowUp {
  label: string;
  question: string;
}

function generateFollowUps(
  lastAssistantContent: string,
  lang: CompanionLang,
): FollowUp[] {
  const content = lastAssistantContent.toLowerCase();
  const followUps: FollowUp[] = [];

  // Beetle-related follow-ups
  if (
    content.includes('barkborr') ||
    content.includes('bark beetle') ||
    content.includes('ips typographus')
  ) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Visa riskområden', question: 'Kan du visa vilka av mina skiften som har högst barkborrerisk?' }
        : { label: 'Show risk areas', question: 'Can you show which of my parcels have the highest bark beetle risk?' },
      lang === 'sv'
        ? { label: 'Förebyggande åtgärder', question: 'Vilka förebyggande åtgärder bör jag vidta nu?' }
        : { label: 'Prevention measures', question: 'What preventive measures should I take now?' },
    );
  }

  // NDVI / survey follow-ups
  if (content.includes('ndvi') || content.includes('survey') || content.includes('inventering')) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Jämför över tid', question: 'Hur har NDVI förändrats jämfört med förra mätningen?' }
        : { label: 'Compare over time', question: 'How has the NDVI changed compared to the previous measurement?' },
    );
  }

  // Timber / economic follow-ups
  if (
    content.includes('virke') ||
    content.includes('timber') ||
    content.includes('sek/m') ||
    content.includes('pris') ||
    content.includes('price')
  ) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Beräkna mitt virkesvärde', question: 'Kan du uppskatta det totala virkesvärdet för mina skiften?' }
        : { label: 'Calculate my timber value', question: 'Can you estimate the total timber value for my parcels?' },
    );
  }

  // Thinning / operations follow-ups
  if (
    content.includes('gallring') ||
    content.includes('thinning') ||
    content.includes('avverkning') ||
    content.includes('harvest')
  ) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Planera nästa steg', question: 'Vad bör vara mitt nästa steg i skogsskötseln?' }
        : { label: 'Plan next steps', question: 'What should be my next step in forest management?' },
    );
  }

  // Regulatory follow-ups
  if (
    content.includes('skogsvårdslagen') ||
    content.includes('regulation') ||
    content.includes('avverkningsanmälan') ||
    content.includes('felling notification')
  ) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Kontakta Skogsstyrelsen', question: 'Hur kontaktar jag Skogsstyrelsen i mitt distrikt?' }
        : { label: 'Contact Skogsstyrelsen', question: 'How do I contact Skogsstyrelsen in my district?' },
    );
  }

  // Climate follow-ups
  if (
    content.includes('klimat') ||
    content.includes('climate') ||
    content.includes('torka') ||
    content.includes('drought')
  ) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Artbyte-strategi', question: 'Vilka trädslag bör jag satsa på inför framtiden?' }
        : { label: 'Species strategy', question: 'What tree species should I focus on for the future?' },
    );
  }

  // Generic fall-back
  if (followUps.length === 0) {
    followUps.push(
      lang === 'sv'
        ? { label: 'Berätta mer', question: 'Kan du utveckla det? Ge mig mer detaljer och konkreta råd.' }
        : { label: 'Tell me more', question: 'Can you elaborate? Give me more details and concrete advice.' },
      lang === 'sv'
        ? { label: 'Analysera mina skiften', question: 'Hur ser det ut för mina skogsskiften just nu?' }
        : { label: 'Analyze my parcels', question: 'How do my forest parcels look right now?' },
    );
  }

  return followUps.slice(0, 3);
}

// ── Source citation extraction ───────────────────────────────────────────────

function extractInlineSources(content: string): string[] {
  const matches = content.matchAll(/\[Source:\s*([^\]]+)\]/gi);
  const sources = new Set<string>();
  for (const m of matches) {
    sources.add(m[1].trim());
  }
  return [...sources];
}

// ── PDF Export ──────────────────────────────────────────────────────────────

function exportChatAsPDF(
  messages: { role: string; content: string; timestamp: number; confidence?: string; citations?: { title: string; excerpt: string; sourceType: string; url?: string }[] }[],
  lang: CompanionLang,
) {
  const now = new Date();
  const dateStr = now.toLocaleDateString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const messagesHtml = messages
    .map((msg) => {
      const isUser = msg.role === 'user';
      const time = new Date(msg.timestamp).toLocaleTimeString(lang === 'sv' ? 'sv-SE' : 'en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const roleName = isUser ? (lang === 'sv' ? 'Du' : 'You') : 'Skogsradgivaren';

      let citationsHtml = '';
      if (msg.citations && msg.citations.length > 0) {
        citationsHtml = `<div style="margin-top:8px;padding:8px 12px;background:#f0fdf4;border-radius:6px;border-left:3px solid #4ade80;font-size:11px;">
          <strong>${lang === 'sv' ? 'Källor' : 'Sources'}:</strong>
          <ul style="margin:4px 0 0 16px;padding:0;">
            ${msg.citations.map((c) => `<li>${c.title}${c.url ? ` — <a href="${c.url}" style="color:#16a34a;">${c.url}</a>` : ''}</li>`).join('')}
          </ul>
        </div>`;
      }

      let confidenceHtml = '';
      if (!isUser && msg.confidence) {
        const labels: Record<string, string> = {
          high: lang === 'sv' ? 'Hog konfidens' : 'High confidence',
          medium: lang === 'sv' ? 'Medelhog konfidens' : 'Medium confidence',
          low: lang === 'sv' ? 'Lag konfidens' : 'Low confidence',
        };
        confidenceHtml = `<div style="margin-top:6px;font-size:10px;color:#6b7280;">${labels[msg.confidence] ?? msg.confidence}</div>`;
      }

      // Escape HTML in content but preserve newlines
      const escaped = msg.content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');

      return `
        <div style="margin-bottom:16px;page-break-inside:avoid;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <strong style="font-size:12px;color:${isUser ? '#1e3a5f' : '#166534'};">${roleName}</strong>
            <span style="font-size:10px;color:#9ca3af;">${time}</span>
          </div>
          <div style="padding:10px 14px;border-radius:8px;background:${isUser ? '#f1f5f9' : '#ffffff'};border:1px solid ${isUser ? '#e2e8f0' : '#d1fae5'};font-size:13px;line-height:1.6;color:#1e293b;">
            ${escaped}
            ${citationsHtml}
            ${confidenceHtml}
          </div>
        </div>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="utf-8"/>
  <title>BeetleSense AI Companion — ${lang === 'sv' ? 'Konversation' : 'Conversation'}</title>
  <style>
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 700px; margin: 0 auto; padding: 32px 24px; color: #1e293b; }
    .header { border-bottom: 2px solid #4ade80; padding-bottom: 12px; margin-bottom: 24px; }
    .header h1 { font-size: 18px; color: #166534; margin: 0 0 4px 0; }
    .header p { font-size: 11px; color: #6b7280; margin: 0; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>BeetleSense AI Companion (Skogsradgivaren)</h1>
    <p>${lang === 'sv' ? 'Exporterad' : 'Exported'}: ${dateStr}</p>
  </div>
  ${messagesHtml}
  <div class="footer">
    ${lang === 'sv' ? 'Genererad av' : 'Generated by'} BeetleSense AI Companion (Skogsradgivaren) &mdash; powered by Claude
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    // Small delay so the browser renders before printing
    setTimeout(() => printWindow.print(), 400);
  }
}

// ── Component ───────────────────────────────────────────────────────────────

interface CompanionPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  parcelId?: string;
}

export function CompanionPanel({ isOpen, onToggle, parcelId }: CompanionPanelProps) {
  const {
    sessions,
    activeSessionId,
    createSession,
    setActiveSession,
    deleteSession,
    sendMessage,
    getMessages,
  } = useChatStore();

  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const [lang, setLang] = useState<CompanionLang>(getStoredLang);
  const [activeCategory, setActiveCategory] = useState<PromptCategory | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const activeMessages = activeSessionId ? getMessages(activeSessionId) : [];
  const isStreaming = activeMessages.some((m) => m.isStreaming);

  // Last assistant message for follow-ups and guardrails
  const lastAssistantMsg = useMemo(() => {
    const assistantMsgs = activeMessages.filter((m) => m.role === 'assistant' && !m.isStreaming);
    return assistantMsgs.length > 0 ? assistantMsgs[assistantMsgs.length - 1] : null;
  }, [activeMessages]);

  const followUps = useMemo(() => {
    if (!lastAssistantMsg || isStreaming) return [];
    return generateFollowUps(lastAssistantMsg.content, lang);
  }, [lastAssistantMsg, isStreaming, lang]);

  // Guardrail analysis for last assistant message
  const guardrailResult = useMemo(() => {
    if (!lastAssistantMsg) return null;
    const sources = extractInlineSources(lastAssistantMsg.content);
    return analyzeResponse(lastAssistantMsg.content, sources, lastAssistantMsg.confidence);
  }, [lastAssistantMsg]);

  // Random starter prompts
  const starterPrompts = useMemo(() => getRandomPrompts(4, lang), [lang]);

  // Focus trap for the panel when open
  const panelRef = useFocusTrap<HTMLDivElement>({
    isActive: isOpen,
    onEscape: onToggle,
    returnFocusRef: triggerRef,
    autoFocus: false, // We handle focus manually below
  });

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length, activeMessages[activeMessages.length - 1]?.content]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Close session picker on Escape
  useEffect(() => {
    if (!showSessionPicker) return;
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        setShowSessionPicker(false);
      }
    }
    document.addEventListener('keydown', handleEscape, true);
    return () => document.removeEventListener('keydown', handleEscape, true);
  }, [showSessionPicker]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || isStreaming) return;

    setInput('');
    setIsSending(true);
    setActiveCategory(null);

    try {
      await sendMessage(text, parcelId);
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, isStreaming, sendMessage, parcelId]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleVoiceTranscript = useCallback(
    (text: string) => {
      setInput(text);
    },
    [],
  );

  const handleNewSession = useCallback(() => {
    createSession(undefined, parcelId);
    setShowSessionPicker(false);
  }, [createSession, parcelId]);

  const handleExportPDF = useCallback(() => {
    if (activeMessages.length === 0) return;
    exportChatAsPDF(activeMessages, lang);
  }, [activeMessages, lang]);

  const handleLangToggle = useCallback(() => {
    const next: CompanionLang = lang === 'sv' ? 'en' : 'sv';
    setLang(next);
    storeLang(next);
  }, [lang]);

  const handlePromptSelect = useCallback(
    (question: string) => {
      setInput(question);
      setActiveCategory(null);
      inputRef.current?.focus();
    },
    [],
  );

  // Toggle FAB
  if (!isOpen) {
    return (
      <button
        ref={triggerRef}
        onClick={onToggle}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-[var(--green)] text-forest-950 shadow-lg shadow-[var(--green)]/20 flex items-center justify-center hover:scale-105 transition-transform"
        aria-label="Open AI Companion"
        title="Open AI Companion"
      >
        <Sparkles size={20} aria-hidden="true" />
      </button>
    );
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 lg:hidden"
        onClick={onToggle}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 flex flex-col border-l border-[var(--border)] shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--bg2)' }}
        role="dialog"
        aria-modal="true"
        aria-label="AI Forest Expert Companion"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">
              {t('nav.forestExpertAI')}
            </h2>
            <FiduciaryInlineBadge lang={lang} />
          </div>

          {/* Language toggle */}
          <button
            onClick={handleLangToggle}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors mr-1"
            aria-label={`Switch language to ${lang === 'sv' ? 'English' : 'Swedish'}`}
            title={lang === 'sv' ? 'Switch to English' : 'Byt till svenska'}
          >
            <Globe size={11} aria-hidden="true" />
            <span className="uppercase">{lang}</span>
          </button>

          {/* Export PDF button */}
          <button
            onClick={handleExportPDF}
            disabled={activeMessages.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-[var(--text3)] hover:text-[var(--text)] hover:bg-[var(--bg3)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed mr-1"
            aria-label={lang === 'sv' ? 'Spara som PDF' : 'Save as PDF'}
            title={lang === 'sv' ? 'Spara som PDF' : 'Save as PDF'}
          >
            <FileDown size={11} aria-hidden="true" />
          </button>

          {/* Session picker */}
          <div className="relative mx-1">
            <button
              onClick={() => setShowSessionPicker(!showSessionPicker)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-[var(--text3)] hover:bg-[var(--bg3)] transition-colors"
              aria-expanded={showSessionPicker}
              aria-haspopup="true"
              aria-label="Switch chat session"
            >
              <span className="max-w-[80px] truncate">
                {sessions.find((s) => s.id === activeSessionId)?.title ?? (lang === 'sv' ? 'Ny chatt' : 'New Chat')}
              </span>
              <ChevronDown size={10} aria-hidden="true" />
            </button>

            {showSessionPicker && (
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-xl z-10 overflow-hidden"
                role="listbox"
                aria-label="Chat sessions"
              >
                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <Plus size={12} aria-hidden="true" />
                  {lang === 'sv' ? 'Ny chatt' : 'New Chat'}
                </button>
                <div className="h-px bg-[var(--border)]" />
                <div className="max-h-48 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      role="option"
                      aria-selected={session.id === activeSessionId}
                      className={`flex items-center gap-2 px-3 py-2 cursor-pointer text-xs transition-colors ${
                        session.id === activeSessionId
                          ? 'bg-[var(--green)]/5 text-[var(--green)]'
                          : 'text-[var(--text2)] hover:bg-[var(--bg3)]'
                      }`}
                    >
                      <button
                        onClick={() => {
                          setActiveSession(session.id);
                          setShowSessionPicker(false);
                        }}
                        className="flex-1 text-left truncate"
                      >
                        {session.title}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteSession(session.id);
                        }}
                        className="text-[var(--text3)] hover:text-danger transition-colors flex-shrink-0"
                        aria-label={`Delete session: ${session.title}`}
                      >
                        <Trash2 size={10} aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-[var(--bg3)] transition-colors"
            aria-label="Close AI Companion"
          >
            <X size={16} className="text-[var(--text3)]" aria-hidden="true" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4" role="log" aria-label="Chat messages" aria-live="polite">
          {activeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-3">
                <Sparkles size={20} className="text-[var(--green)]" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-serif font-semibold text-[var(--text)] mb-1">
                {t('nav.forestExpertAI')}
              </h3>
              <p className="text-[11px] text-[var(--text3)] max-w-xs leading-relaxed">
                {lang === 'sv'
                  ? 'Fråga mig om barkborremönster, skogshälsa, svenska skogsvårdsregler eller få insikter från dina inventeringsdata.'
                  : 'Ask me about bark beetle patterns, forest health strategies, Swedish forestry regulations, or get insights from your survey data.'}
              </p>

              {/* Suggested quick questions */}
              <div className="w-full mt-4 mb-4 flex flex-wrap gap-2 justify-center">
                {[
                  lang === 'sv' ? 'Är min skog i riskzonen just nu?' : 'Is my forest at risk right now?',
                  lang === 'sv' ? 'Vad är mitt virke värt?' : 'What is my timber worth?',
                  lang === 'sv' ? 'När bör jag planera en drönarflygning?' : 'When should I schedule a drone survey?',
                  lang === 'sv' ? 'Hur skyddar jag mig mot barkborrar?' : 'How do I protect against bark beetles?',
                ].map((question) => (
                  <button
                    key={question}
                    onClick={async () => {
                      setInput('');
                      setIsSending(true);
                      try {
                        await sendMessage(question, parcelId);
                      } finally {
                        setIsSending(false);
                      }
                    }}
                    className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[10px] text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 hover:bg-[var(--green)]/5 transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>

              {/* Category-based prompt suggestions */}
              <div className="w-full mt-4">
                {/* Category pills */}
                <div className="flex flex-wrap gap-1.5 justify-center mb-3">
                  {(Object.entries(PROMPT_CATEGORIES) as [PromptCategory, typeof PROMPT_CATEGORIES[PromptCategory]][]).map(
                    ([key, cat]) => (
                      <button
                        key={key}
                        onClick={() => setActiveCategory(activeCategory === key ? null : key)}
                        className={`px-2.5 py-1 rounded-full text-[9px] font-medium transition-colors ${
                          activeCategory === key
                            ? 'bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30'
                            : 'border border-[var(--border)] text-[var(--text3)] hover:text-[var(--text)] hover:border-[var(--border2)]'
                        }`}
                      >
                        {cat.label[lang]}
                      </button>
                    ),
                  )}
                </div>

                {/* Prompts for selected category */}
                {activeCategory ? (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {COMPANION_PROMPTS.filter((p) => p.category === activeCategory).map((prompt) => (
                      <button
                        key={prompt.id}
                        onClick={() => handlePromptSelect(prompt.question[lang])}
                        className="flex items-center gap-2 w-full text-left px-3 py-2 rounded-xl border border-[var(--border)] text-[10px] text-[var(--text3)] hover:text-[var(--text)] hover:border-[var(--border2)] hover:bg-[var(--bg3)]/50 transition-colors"
                      >
                        <span className="flex-1">{prompt.label[lang]}</span>
                        <ChevronRight size={10} className="flex-shrink-0 opacity-40" aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* Random starter prompts */
                  <div className="flex flex-wrap gap-2 justify-center">
                    {starterPrompts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => handlePromptSelect(p.question[lang])}
                        className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[10px] text-[var(--text3)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-colors"
                      >
                        {p.label[lang]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {activeMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}

              {/* Guardrail warnings + source badge for last assistant message */}
              {guardrailResult && lastAssistantMsg && !isStreaming && (
                <div className="mb-3 ml-0 max-w-[85%]">
                  {/* Source badge */}
                  <div className="flex items-center gap-2 mt-1">
                    <SourceBadge
                      sourceCount={guardrailResult.sourceCount}
                      confidence={guardrailResult.sourceConfidence}
                      lang={lang}
                    />
                  </div>
                  {/* Warnings and disclaimers */}
                  <GuardrailWarnings result={guardrailResult} lang={lang} />
                </div>
              )}

              {/* Follow-up suggestions */}
              {followUps.length > 0 && !isStreaming && (
                <div className="flex flex-wrap gap-1.5 mb-3 mt-1">
                  {followUps.map((fu, i) => (
                    <button
                      key={i}
                      onClick={() => handlePromptSelect(fu.question)}
                      className="px-2.5 py-1 rounded-full border border-[var(--border)] text-[9px] text-[var(--text3)] hover:text-[var(--green)] hover:border-[var(--green)]/30 transition-colors"
                    >
                      {fu.label}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 focus-within:border-[var(--green)]/50 transition-colors">
            <label htmlFor="companion-input" className="sr-only">
              {lang === 'sv' ? 'Fråga om din skog' : 'Ask about your forest'}
            </label>
            <textarea
              id="companion-input"
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={lang === 'sv' ? 'Fråga om din skog...' : 'Ask about your forest...'}
              rows={1}
              className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder-[var(--text3)] resize-none outline-none min-h-[20px] max-h-[80px]"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
              aria-label={lang === 'sv' ? 'Skriv din fråga' : 'Type your question'}
            />

            <VoiceInput onTranscript={handleVoiceTranscript} disabled={isStreaming} />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending || isStreaming}
              className="p-1.5 rounded-lg bg-[var(--green)] text-forest-950 hover:bg-[var(--green2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              aria-label={lang === 'sv' ? 'Skicka meddelande' : 'Send message'}
            >
              <Send size={14} aria-hidden="true" />
            </button>
          </div>
          <VisuallyHidden>
            {lang === 'sv'
              ? 'Tryck Enter för att skicka, Shift+Enter för ny rad'
              : 'Press Enter to send, Shift+Enter for new line'}
          </VisuallyHidden>
        </div>
      </div>
    </>
  );
}

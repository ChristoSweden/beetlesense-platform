import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { useChatStore } from './useChatStore';
import { ChatMessage } from './ChatMessage';
import { VoiceInput } from './VoiceInput';

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

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSessionPicker, setShowSessionPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeMessages = activeSessionId ? getMessages(activeSessionId) : [];
  const isStreaming = activeMessages.some((m) => m.isStreaming);

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

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSending || isStreaming) return;

    setInput('');
    setIsSending(true);

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

  // Toggle FAB
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 w-12 h-12 rounded-full bg-[var(--green)] text-forest-950 shadow-lg shadow-[var(--green)]/20 flex items-center justify-center hover:scale-105 transition-transform"
        title="Open AI Companion"
      >
        <Sparkles size={20} />
      </button>
    );
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div
        className="fixed inset-0 bg-forest-950/60 backdrop-blur-sm z-40 lg:hidden"
        onClick={onToggle}
      />

      {/* Panel */}
      <div
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-96 flex flex-col border-l border-[var(--border)] shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ background: 'var(--bg2)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-serif font-bold text-[var(--text)]">
              Forest Expert AI
            </h2>
          </div>

          {/* Session picker */}
          <div className="relative mx-2">
            <button
              onClick={() => setShowSessionPicker(!showSessionPicker)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-[var(--text3)] hover:bg-[var(--bg3)] transition-colors"
            >
              <span className="max-w-[80px] truncate">
                {sessions.find((s) => s.id === activeSessionId)?.title ?? 'New Chat'}
              </span>
              <ChevronDown size={10} />
            </button>

            {showSessionPicker && (
              <div className="absolute right-0 top-full mt-1 w-56 rounded-xl border border-[var(--border)] bg-[var(--bg)] shadow-xl z-10 overflow-hidden">
                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-[var(--green)] hover:bg-[var(--bg3)] transition-colors"
                >
                  <Plus size={12} />
                  New Chat
                </button>
                <div className="h-px bg-[var(--border)]" />
                <div className="max-h-48 overflow-y-auto">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
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
                      >
                        <Trash2 size={10} />
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
          >
            <X size={16} className="text-[var(--text3)]" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 flex items-center justify-center mb-3">
                <Sparkles size={20} className="text-[var(--green)]" />
              </div>
              <h3 className="text-sm font-serif font-semibold text-[var(--text)] mb-1">
                Forest Expert AI
              </h3>
              <p className="text-[11px] text-[var(--text3)] max-w-xs leading-relaxed">
                Ask me about bark beetle patterns, forest health strategies, Swedish forestry
                regulations, or get insights from your survey data.
              </p>
              <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {[
                  'What are signs of bark beetle?',
                  'Explain my NDVI results',
                  'Swedish forestry rules',
                ].map((q) => (
                  <button
                    key={q}
                    onClick={() => {
                      setInput(q);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 rounded-full border border-[var(--border)] text-[10px] text-[var(--text3)] hover:text-[var(--text)] hover:border-[var(--border2)] transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {activeMessages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-[var(--border)] px-4 py-3">
          <div className="flex items-end gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] px-3 py-2 focus-within:border-[var(--green)]/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your forest..."
              rows={1}
              className="flex-1 bg-transparent text-xs text-[var(--text)] placeholder-[var(--text3)] resize-none outline-none min-h-[20px] max-h-[80px]"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />

            <VoiceInput onTranscript={handleVoiceTranscript} disabled={isStreaming} />

            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending || isStreaming}
              className="p-1.5 rounded-lg bg-[var(--green)] text-forest-950 hover:bg-[var(--green2)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

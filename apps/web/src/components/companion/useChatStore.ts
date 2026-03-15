import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  confidence?: 'high' | 'medium' | 'low';
  citations?: Citation[];
  isStreaming?: boolean;
}

export interface Citation {
  id: number;
  title: string;
  excerpt: string;
  sourceType: 'research' | 'regulatory' | 'your_data';
  url?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  parcelId?: string;
}

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: Record<string, ChatMessage[]>; // keyed by session ID

  createSession: (title?: string, parcelId?: string) => string;
  setActiveSession: (id: string) => void;
  deleteSession: (id: string) => void;

  addMessage: (sessionId: string, message: ChatMessage) => void;
  updateMessage: (sessionId: string, messageId: string, update: Partial<ChatMessage>) => void;
  getMessages: (sessionId: string) => ChatMessage[];

  sendMessage: (content: string, parcelId?: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      activeSessionId: null,
      messages: {},

      createSession: (title?: string, parcelId?: string) => {
        const id = `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const session: ChatSession = {
          id,
          title: title ?? `Chat ${new Date().toLocaleDateString()}`,
          createdAt: Date.now(),
          parcelId,
        };

        set((state) => ({
          sessions: [session, ...state.sessions],
          activeSessionId: id,
          messages: { ...state.messages, [id]: [] },
        }));

        return id;
      },

      setActiveSession: (id: string) => set({ activeSessionId: id }),

      deleteSession: (id: string) =>
        set((state) => {
          const { [id]: _, ...rest } = state.messages;
          return {
            sessions: state.sessions.filter((s) => s.id !== id),
            messages: rest,
            activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
          };
        }),

      addMessage: (sessionId: string, message: ChatMessage) =>
        set((state) => {
          const existing = state.messages[sessionId] ?? [];
          // Keep only last 100 messages
          const updated = [...existing, message].slice(-100);
          return {
            messages: { ...state.messages, [sessionId]: updated },
          };
        }),

      updateMessage: (sessionId: string, messageId: string, update: Partial<ChatMessage>) =>
        set((state) => {
          const msgs = state.messages[sessionId] ?? [];
          return {
            messages: {
              ...state.messages,
              [sessionId]: msgs.map((m) =>
                m.id === messageId ? { ...m, ...update } : m,
              ),
            },
          };
        }),

      getMessages: (sessionId: string) => {
        return get().messages[sessionId] ?? [];
      },

      sendMessage: async (content: string, parcelId?: string) => {
        const state = get();
        let sessionId = state.activeSessionId;

        // Create session if needed
        if (!sessionId) {
          sessionId = state.createSession(undefined, parcelId);
        }

        // Add user message
        const userMsg: ChatMessage = {
          id: `msg_${Date.now()}_user`,
          role: 'user',
          content,
          timestamp: Date.now(),
        };
        state.addMessage(sessionId, userMsg);

        // Add placeholder assistant message
        const assistantMsgId = `msg_${Date.now()}_assistant`;
        const assistantMsg: ChatMessage = {
          id: assistantMsgId,
          role: 'assistant',
          content: '',
          timestamp: Date.now(),
          isStreaming: true,
        };
        state.addMessage(sessionId, assistantMsg);

        try {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
          const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

          const response = await fetch(
            `${supabaseUrl}/functions/v1/companion-chat`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${supabaseKey}`,
                apikey: supabaseKey,
              },
              body: JSON.stringify({
                message: content,
                sessionId,
                parcelId,
                history: (get().messages[sessionId] ?? [])
                  .filter((m) => !m.isStreaming)
                  .slice(-10)
                  .map((m) => ({ role: m.role, content: m.content })),
              }),
            },
          );

          if (!response.ok) {
            throw new Error(`Chat request failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('No response body');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let accumulated = '';
          const citations: Citation[] = [];

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6).trim();
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.token) {
                    accumulated += parsed.token;
                    get().updateMessage(sessionId!, assistantMsgId, {
                      content: accumulated,
                    });
                  }
                  if (parsed.citation) {
                    citations.push(parsed.citation);
                  }
                  if (parsed.confidence) {
                    get().updateMessage(sessionId!, assistantMsgId, {
                      confidence: parsed.confidence,
                    });
                  }
                } catch {
                  // Non-JSON SSE data, treat as token
                  if (data && data !== '[DONE]') {
                    accumulated += data;
                    get().updateMessage(sessionId!, assistantMsgId, {
                      content: accumulated,
                    });
                  }
                }
              }
            }
          }

          // Finalize message
          get().updateMessage(sessionId!, assistantMsgId, {
            isStreaming: false,
            citations: citations.length > 0 ? citations : undefined,
            confidence: get().messages[sessionId!]?.find((m) => m.id === assistantMsgId)
              ?.confidence ?? 'high',
          });
        } catch (err) {
          // Read whatever content was accumulated so far from the message store
          const currentContent =
            get().messages[sessionId!]?.find((m) => m.id === assistantMsgId)?.content ?? '';
          get().updateMessage(sessionId!, assistantMsgId, {
            content:
              currentContent.length > 0
                ? currentContent
                : 'Sorry, I encountered an error. Please try again.',
            isStreaming: false,
            confidence: 'low',
          });
          console.error('Chat error:', err);
        }
      },
    }),
    {
      name: 'beetlesense-chat',
      partialize: (state) => ({
        sessions: state.sessions.slice(0, 20),
        activeSessionId: state.activeSessionId,
        messages: Object.fromEntries(
          Object.entries(state.messages).map(([k, v]) => [k, v.slice(-100)]),
        ),
      }),
    },
  ),
);

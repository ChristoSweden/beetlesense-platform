import { useState, useCallback, useRef } from 'react';
import type { Citation } from './useChatStore';

interface UseCompanionStreamReturn {
  isStreaming: boolean;
  streamedContent: string;
  citations: Citation[];
  error: string | null;
  startStream: (url: string, body: Record<string, unknown>, headers?: Record<string, string>) => Promise<string>;
  abort: () => void;
}

export function useCompanionStream(): UseCompanionStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsStreaming(false);
  }, []);

  const startStream = useCallback(
    async (
      url: string,
      body: Record<string, unknown>,
      headers?: Record<string, string>,
    ): Promise<string> => {
      // Cancel any existing stream
      abort();

      const controller = new AbortController();
      abortRef.current = controller;

      setIsStreaming(true);
      setStreamedContent('');
      setCitations([]);
      setError(null);

      let accumulated = '';

      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Stream request failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response body for streaming');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE lines
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? ''; // Keep incomplete line in buffer

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(':')) continue; // Skip comments and empty lines

            if (trimmed.startsWith('data: ')) {
              const data = trimmed.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);

                if (parsed.token) {
                  accumulated += parsed.token;
                  setStreamedContent(accumulated);
                }

                if (parsed.citation) {
                  setCitations((prev) => [...prev, parsed.citation]);
                }
              } catch {
                // Plain text token
                if (data && data !== '[DONE]') {
                  accumulated += data;
                  setStreamedContent(accumulated);
                }
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Intentional abort, not an error
        } else {
          const message = err instanceof Error ? err.message : 'Stream failed';
          setError(message);
        }
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
      }

      return accumulated;
    },
    [abort],
  );

  return {
    isStreaming,
    streamedContent,
    citations,
    error,
    startStream,
    abort,
  };
}

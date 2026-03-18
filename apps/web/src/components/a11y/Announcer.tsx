import { useEffect, useState, useCallback, createContext, useContext, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

// ─── Context for imperative announcements ───

interface AnnouncerContextValue {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextValue>({
  announce: () => {},
});

export function useAnnouncer() {
  return useContext(AnnouncerContext);
}

// ─── Provider ───

interface AnnouncerProviderProps {
  children: ReactNode;
}

/**
 * Provides a live region announcer for screen readers.
 *
 * Features:
 * - Announces route changes automatically (aria-live="assertive")
 * - Exposes `announce()` for imperative announcements (toast, alerts, etc.)
 * - Uses dual-region technique (polite + assertive) for reliability
 *
 * WCAG 2.1 AA — Success Criterion 4.1.3 (Status Messages)
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const location = useLocation();
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  // Announce route changes
  useEffect(() => {
    // Extract a readable page name from the pathname
    const segments = location.pathname.split('/').filter(Boolean);
    const pageName = segments.length > 0
      ? segments[segments.length - 1]
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase())
      : 'Home';

    // Small delay ensures the live region is detected after DOM update
    const timer = setTimeout(() => {
      setAssertiveMessage(`Navigated to ${pageName}`);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  // Clear messages after they've been announced
  useEffect(() => {
    if (politeMessage) {
      const timer = setTimeout(() => setPoliteMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [politeMessage]);

  useEffect(() => {
    if (assertiveMessage) {
      const timer = setTimeout(() => setAssertiveMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [assertiveMessage]);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage(message);
    } else {
      setPoliteMessage(message);
    }
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}

      {/* Polite live region — for non-urgent updates (toasts, status changes) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {politeMessage}
      </div>

      {/* Assertive live region — for urgent updates (route changes, errors) */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          borderWidth: 0,
        }}
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

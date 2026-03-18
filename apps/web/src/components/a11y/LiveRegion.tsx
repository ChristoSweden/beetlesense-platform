import React, { useState, useEffect, useCallback, useRef, type CSSProperties } from 'react';

type LiveRegionRole = 'status' | 'alert';

interface Announcement {
  id: number;
  message: string;
}

interface LiveRegionProps {
  /** `"status"` for non-critical updates, `"alert"` for important messages. */
  role?: LiveRegionRole;
  /** How long (ms) each announcement stays in the queue before auto-clearing.
   *  Defaults to 5 000 ms. */
  clearAfterMs?: number;
}

interface LiveRegionHandle {
  /** Push a new message into the live region. */
  announce: (message: string) => void;
}

let _nextId = 0;

/**
 * ARIA live region that is visually hidden but announced by screen readers.
 *
 * Returns `{ announce, LiveRegionComponent }` — render the component once and
 * call `announce(msg)` to queue announcements that are read aloud then
 * auto-cleared.
 *
 * WCAG 2.1 AA — Success Criterion 4.1.3 (Status Messages)
 */
export function useLiveRegion({
  role = 'status',
  clearAfterMs = 5000,
}: LiveRegionProps = {}): LiveRegionHandle & { LiveRegionComponent: () => React.JSX.Element } {
  const [queue, setQueue] = useState<Announcement[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const announce = useCallback(
    (message: string) => {
      const id = ++_nextId;
      setQueue((prev) => [...prev, { id, message }]);

      const timer = setTimeout(() => {
        setQueue((prev) => prev.filter((a) => a.id !== id));
        timers.current.delete(id);
      }, clearAfterMs);

      timers.current.set(id, timer);
    },
    [clearAfterMs],
  );

  // Clean up timers on unmount
  useEffect(() => {
    const t = timers.current;
    return () => {
      t.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  function LiveRegionComponent() {
    return (
      <div
        role={role}
        aria-live={role === 'alert' ? 'assertive' : 'polite'}
        aria-atomic="true"
        style={visuallyHiddenStyle}
      >
        {queue.map((a) => (
          <div key={a.id}>{a.message}</div>
        ))}
      </div>
    );
  }

  return { announce, LiveRegionComponent };
}

// ─── Declarative variant ───────────────────────────────────

interface LiveRegionElementProps {
  /** The current message to announce. When changed, screen readers will read it. */
  message: string;
  /** `"status"` (polite) or `"alert"` (assertive). Default: `"status"`. */
  role?: LiveRegionRole;
}

/**
 * Declarative ARIA live region. Simply pass `message` and it will be announced
 * by screen readers. The element is visually hidden.
 */
export function LiveRegion({ message, role = 'status' }: LiveRegionElementProps) {
  return (
    <div
      role={role}
      aria-live={role === 'alert' ? 'assertive' : 'polite'}
      aria-atomic="true"
      style={visuallyHiddenStyle}
    >
      {message}
    </div>
  );
}

// ─── Shared visually-hidden style ──────────────────────────

const visuallyHiddenStyle: CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  borderWidth: 0,
};

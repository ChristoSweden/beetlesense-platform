import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { FocusTrap } from './FocusTrap';

// ─── Shortcut definitions ──────────────────────────────────

interface Shortcut {
  keys: string;
  description: string;
}

const SHORTCUT_LIST: Shortcut[] = [
  { keys: '?', description: 'Show keyboard shortcuts' },
  { keys: 'g d', description: 'Go to Dashboard' },
  { keys: 'g p', description: 'Go to Parcels' },
  { keys: 'g s', description: 'Go to Surveys' },
  { keys: 'g a', description: 'Go to Alerts' },
  { keys: 'g m', description: 'Go to Marketplace' },
  { keys: '/', description: 'Focus search' },
  { keys: 'Escape', description: 'Close any modal' },
];

const NAV_MAP: Record<string, string> = {
  'd': '/dashboard',
  'p': '/parcels',
  's': '/surveys',
  'a': '/alerts',
  'm': '/marketplace',
};

const SEQUENCE_TIMEOUT_MS = 800;

/**
 * Returns true when the active element is an input, textarea, select,
 * or contenteditable — meaning we should NOT intercept keystrokes.
 */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

// ─── Component ─────────────────────────────────────────────

/**
 * Global keyboard shortcut handler for BeetleSense.
 *
 * Supports single-key shortcuts (`?`, `/`, `Escape`) and two-key sequences
 * (`g d`, `g p`, etc.) using a simple key buffer that resets after a timeout.
 *
 * All shortcuts are disabled when the user is typing in an input field.
 *
 * Render this once near the root of the app.
 */
export function KeyboardShortcuts() {
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);
  const bufferRef = useRef<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openHelp = useCallback(() => setHelpOpen(true), []);
  const closeHelp = useCallback(() => setHelpOpen(false), []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Let the FocusTrap handle Escape when the help modal is open
      if (e.key === 'Escape' && !helpOpen) return;

      if (isTyping()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;

      // Single-key shortcuts
      if (key === '?') {
        e.preventDefault();
        openHelp();
        return;
      }

      if (key === '/') {
        e.preventDefault();
        const search = document.getElementById('search') as HTMLInputElement | null;
        search?.focus();
        return;
      }

      // Sequence shortcuts (g + <key>)
      if (timerRef.current) clearTimeout(timerRef.current);

      bufferRef.current.push(key.toLowerCase());

      if (bufferRef.current.length >= 2) {
        const [first, second] = bufferRef.current;
        if (first === 'g' && NAV_MAP[second]) {
          e.preventDefault();
          navigate(NAV_MAP[second]);
        }
        bufferRef.current = [];
        return;
      }

      timerRef.current = setTimeout(() => {
        bufferRef.current = [];
      }, SEQUENCE_TIMEOUT_MS);
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, openHelp, helpOpen]);

  if (!helpOpen) return null;

  return <ShortcutHelpModal onClose={closeHelp} />;
}

// ─── Help modal ────────────────────────────────────────────

function ShortcutHelpModal({ onClose }: { onClose: () => void }) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={backdropStyle}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <FocusTrap onClose={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Keyboard shortcuts"
          style={dialogStyle}
        >
          <div style={headerStyle}>
            <h2 style={{ margin: 0, fontSize: '1.125rem' }}>Keyboard Shortcuts</h2>
            <button
              onClick={onClose}
              aria-label="Close shortcuts"
              style={closeBtnStyle}
            >
              &times;
            </button>
          </div>

          <div style={gridStyle}>
            {SHORTCUT_LIST.map(({ keys, description }) => (
              <div key={keys} style={rowStyle}>
                <kbd style={kbdStyle}>{keys}</kbd>
                <span>{description}</span>
              </div>
            ))}
          </div>
        </div>
      </FocusTrap>
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────

const backdropStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.6)',
  zIndex: 9998,
};

const dialogStyle: CSSProperties = {
  position: 'fixed',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 9999,
  width: '100%',
  maxWidth: '28rem',
  backgroundColor: '#0a1e0d',
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '0.75rem',
  padding: '1.5rem',
  color: '#e0e0e0',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1rem',
};

const closeBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#e0e0e0',
  fontSize: '1.5rem',
  cursor: 'pointer',
  lineHeight: 1,
  padding: '0.25rem',
};

const gridStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.375rem 0',
};

const kbdStyle: CSSProperties = {
  display: 'inline-block',
  padding: '0.2rem 0.5rem',
  borderRadius: '0.25rem',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  fontFamily: 'monospace',
  fontSize: '0.8125rem',
  minWidth: '2rem',
  textAlign: 'center',
};

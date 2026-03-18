import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Info, AlertTriangle } from 'lucide-react';

/* ─── Types ─── */
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
  exiting?: boolean;
}

type ToastFn = (message: string, type?: ToastType) => void;

/* ─── Config ─── */
const MAX_TOASTS = 3;
const AUTO_DISMISS_MS = 4_000;
const EXIT_DURATION_MS = 200;
const SWIPE_THRESHOLD = 60;

/* ─── Styling ─── */
const TYPE_STYLES: Record<ToastType, { bg: string; border: string; icon: ReactNode }> = {
  success: {
    bg: 'bg-[rgba(4,30,8,0.92)]',
    border: 'border-green-500/30',
    icon: <Check size={18} className="text-green-400 shrink-0" />,
  },
  error: {
    bg: 'bg-[rgba(30,4,4,0.92)]',
    border: 'border-red-500/30',
    icon: <X size={18} className="text-red-400 shrink-0" />,
  },
  info: {
    bg: 'bg-[rgba(4,12,30,0.92)]',
    border: 'border-blue-500/30',
    icon: <Info size={18} className="text-blue-400 shrink-0" />,
  },
  warning: {
    bg: 'bg-[rgba(30,24,4,0.92)]',
    border: 'border-amber-500/30',
    icon: <AlertTriangle size={18} className="text-amber-400 shrink-0" />,
  },
};

/* ─── Context ─── */
const ToastContext = createContext<ToastFn | null>(null);

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

/* ─── Single Toast ─── */
function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  const style = TYPE_STYLES[item.type];
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  function handleTouchStart(e: React.TouchEvent) {
    startX.current = e.touches[0].clientX;
  }

  function handleTouchMove(e: React.TouchEvent) {
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;
    if (diff > 0 && cardRef.current) {
      cardRef.current.style.transform = `translateX(${diff}px)`;
      cardRef.current.style.opacity = `${1 - diff / 200}`;
    }
  }

  function handleTouchEnd() {
    const diff = currentX.current - startX.current;
    if (diff > SWIPE_THRESHOLD) {
      onDismiss(item.id);
    } else if (cardRef.current) {
      cardRef.current.style.transform = '';
      cardRef.current.style.opacity = '';
    }
    startX.current = 0;
    currentX.current = 0;
  }

  return (
    <div
      ref={cardRef}
      role="alert"
      className={`
        flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
        backdrop-blur-md text-sm text-[var(--text)] max-w-sm w-full
        ${style.bg} ${style.border}
        ${item.exiting ? 'animate-toast-out' : 'animate-toast-in'}
      `}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {style.icon}
      <span className="flex-1 leading-snug">{item.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="p-1 rounded hover:bg-white/10 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} className="text-[var(--text3)]" />
      </button>
    </div>
  );
}

/* ─── Provider ─── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    // Mark as exiting for slide-out animation
    setToasts(prev => prev.map(t => (t.id === id ? { ...t, exiting: true } : t)));
    // Remove after exit animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, EXIT_DURATION_MS);
    // Clear auto-dismiss timer
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast: ToastFn = useCallback(
    (message, type = 'info') => {
      const id = ++nextId.current;

      setToasts(prev => {
        const next = [...prev, { id, message, type }];
        // Evict oldest if over limit
        if (next.length > MAX_TOASTS) {
          const evicted = next[0];
          dismiss(evicted.id);
          return next.slice(1);
        }
        return next;
      });

      // Auto-dismiss
      const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timers.current.forEach(t => clearTimeout(t));
    };
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(
          <div
            aria-live="polite"
            aria-label="Notifications"
            className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto"
          >
            {toasts.map(item => (
              <ToastCard key={item.id} item={item} onDismiss={dismiss} />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

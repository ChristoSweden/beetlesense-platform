import { useEffect, useRef, useCallback, type ReactNode, type RefObject } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ');

interface FocusTrapProps {
  children: ReactNode;
  /** Called when the user presses Escape inside the trap. */
  onClose: () => void;
  /** Ref to the element that should receive initial focus. Falls back to the
   *  first focusable element inside the trap. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Ref to the element that should regain focus when the trap unmounts.
   *  Defaults to `document.activeElement` at mount time. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** Extra class name forwarded to the wrapper div. */
  className?: string;
}

/**
 * Traps keyboard focus within its children. Intended for modals and dialogs.
 *
 * Behaviour:
 * - Tab / Shift+Tab cycles through focusable descendants.
 * - Escape calls `onClose`.
 * - On mount, focuses `initialFocusRef` or the first focusable element.
 * - On unmount, returns focus to `returnFocusRef` or the previously focused element.
 *
 * WCAG 2.1 AA — SC 2.1.2 (No Keyboard Trap) and SC 2.4.3 (Focus Order)
 */
export function FocusTrap({
  children,
  onClose,
  initialFocusRef,
  returnFocusRef,
  className,
}: FocusTrapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const getFocusable = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // Save previous focus and auto-focus on mount
  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;

    const timer = setTimeout(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
        return;
      }
      const focusable = getFocusable();
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        containerRef.current?.focus();
      }
    }, 50);

    return () => clearTimeout(timer);
    // Run only on mount

  }, []);

  // Restore focus on unmount
  useEffect(() => {
    return () => {
      const target = returnFocusRef?.current ?? previousFocusRef.current;
      if (target && typeof target.focus === 'function') {
        requestAnimationFrame(() => target.focus());
      }
    };
    // Run only on unmount

  }, []);

  // Keyboard handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose, getFocusable]);

  return (
    <div ref={containerRef} className={className} tabIndex={-1} style={{ outline: 'none' }}>
      {children}
    </div>
  );
}

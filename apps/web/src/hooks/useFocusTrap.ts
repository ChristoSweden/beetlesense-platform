import { useEffect, useRef, useCallback, type RefObject } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
].join(', ');

interface UseFocusTrapOptions {
  /** Whether the trap is currently active */
  isActive: boolean;
  /** Called when Escape is pressed inside the trap */
  onEscape?: () => void;
  /** Ref to the element that should receive focus when the trap closes */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** If true, auto-focus the first focusable element when the trap activates */
  autoFocus?: boolean;
}

/**
 * Traps keyboard focus within a container element (modal, panel, dropdown).
 *
 * Features:
 * - Tab and Shift+Tab cycle within the container
 * - Escape key triggers onEscape callback
 * - Returns focus to the trigger element on deactivation
 * - Auto-focuses the first focusable child on activation
 *
 * WCAG 2.1 AA — Success Criterion 2.1.2 (No Keyboard Trap — ensures users
 * can escape via Escape key) and 2.4.3 (Focus Order)
 */
export function useFocusTrap<T extends HTMLElement = HTMLDivElement>({
  isActive,
  onEscape,
  returnFocusRef,
  autoFocus = true,
}: UseFocusTrapOptions) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
    ).filter((el) => {
      // Ensure the element is visible
      return el.offsetParent !== null || el.getAttribute('tabindex') !== null;
    });
  }, []);

  // Save previous focus and auto-focus first element
  useEffect(() => {
    if (!isActive) return;

    // Store the currently focused element to restore later
    previousFocusRef.current = document.activeElement as HTMLElement;

    if (autoFocus) {
      // Small delay to allow DOM to render
      const timer = setTimeout(() => {
        const focusable = getFocusableElements();
        if (focusable.length > 0) {
          focusable[0].focus();
        } else {
          // If no focusable children, focus the container itself
          containerRef.current?.focus();
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isActive, autoFocus, getFocusableElements]);

  // Return focus when deactivated
  useEffect(() => {
    if (isActive) return;

    return () => {
      const returnTo = returnFocusRef?.current ?? previousFocusRef.current;
      if (returnTo && typeof returnTo.focus === 'function') {
        // Use requestAnimationFrame to ensure the DOM has settled
        requestAnimationFrame(() => {
          returnTo.focus();
        });
      }
    };
  }, [isActive, returnFocusRef]);

  // Handle keydown for Tab trapping and Escape
  useEffect(() => {
    if (!isActive) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape?.();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusable[0];
      const lastElement = focusable[focusable.length - 1];

      if (e.shiftKey) {
        // Shift+Tab: if at start, wrap to end
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: if at end, wrap to start
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isActive, onEscape, getFocusableElements]);

  return containerRef;
}

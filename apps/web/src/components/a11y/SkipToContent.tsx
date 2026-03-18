/**
 * Skip navigation link that becomes visible on Tab focus.
 * Allows keyboard users to jump directly to the main content area,
 * bypassing repetitive navigation links.
 *
 * WCAG 2.1 AA — Success Criterion 2.4.1 (Bypass Blocks)
 */
export function SkipToContent() {
  return (
    <a
      href="#main-content"
      className="
        fixed top-0 left-0 z-[9999]
        px-4 py-3 m-2 rounded-lg
        bg-[var(--green)] text-[var(--bg)] text-sm font-semibold
        -translate-y-full focus:translate-y-0
        transition-transform duration-200
        outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]
      "
    >
      Skip to main content
    </a>
  );
}

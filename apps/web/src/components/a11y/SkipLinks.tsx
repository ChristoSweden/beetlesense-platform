import { useRef, useEffect, type CSSProperties } from 'react';

interface SkipLinkItem {
  href: string;
  label: string;
}

const LINKS: SkipLinkItem[] = [
  { href: '#main-content', label: 'Skip to main content' },
  { href: '#navigation', label: 'Skip to navigation' },
  { href: '#search', label: 'Skip to search' },
];

/**
 * Visually-hidden skip navigation links that slide into view on keyboard focus.
 * Renders as a fixed bar at the top of the viewport with high-contrast colors.
 *
 * Place matching `id` attributes (`main-content`, `navigation`, `search`) on
 * the corresponding landmark elements in the app shell.
 *
 * WCAG 2.1 AA — Success Criterion 2.4.1 (Bypass Blocks)
 */
export function SkipLinks() {
  const injected = useRef(false);

  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    const STYLE_ID = 'beetlesense-skip-links';
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      [data-skip-link] {
        transition: transform 0.15s ease-out;
      }
      [data-skip-link]:focus {
        transform: translateY(0) !important;
        box-shadow: 0 0 0 3px #ffffff, 0 0 0 5px #000000;
      }
    `;
    document.head.appendChild(style);
  }, []);

  return (
    <nav aria-label="Skip links" style={barStyle}>
      {LINKS.map(({ href, label }, i) => (
        <a
          key={href}
          href={href}
          data-skip-link=""
          style={{ ...linkStyle, left: `${0.5 + i * 14}rem` }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

// ─── Styles ────────────────────────────────────────────────

const barStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 10000,
  display: 'flex',
  gap: '0.5rem',
  padding: '0.5rem',
  pointerEvents: 'none',
};

const linkStyle: CSSProperties = {
  pointerEvents: 'auto',
  position: 'absolute',
  transform: 'translateY(-200%)',
  padding: '0.75rem 1.25rem',
  borderRadius: '0.5rem',
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '0.875rem',
  fontWeight: 600,
  textDecoration: 'none',
  outline: 'none',
};

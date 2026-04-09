# BeetleSense — Design System Reference

*Derived from src/index.css, src/styles/theme.css, and DESIGN.md*

> Full source of truth: see `DESIGN.md` in the app root for complete documentation.
> This file is a summary for framework compliance tracking.

---

## Design Philosophy
**"Quiet Confidence"** — authoritative but welcoming. Linear/Notion/Vercel applied to forestry.

## Core Rules
- **NO glassmorphism** anywhere in the app
- **NO backdrop-blur** on any content surface
- `bg-black/50` is allowed for modal backdrops only
- All colors defined as CSS custom properties — never hardcode hex values
- All motion respects `prefers-reduced-motion`

---

## Color Tokens

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#F7F8F5` | Page background |
| `--bg2` | `#FFFFFF` | Card/surface background |
| `--bg3` | `#EEF2EC` | Secondary surface, hover, skeleton |
| `--text` | `#1A2E1C` | Primary text |
| `--text2` | `#2E4A30` | Secondary text |
| `--text3` | `#5C7A5E` | Muted text |
| `--green` | `#1A6B3C` | Primary green (buttons, nav) |
| `--accent` | `#2563EB` | Interactive elements, links, CTAs |
| `--border` | `rgba(30,100,50,0.15)` | Default border |
| `--amber` | `#E65100` | Warning |
| `--red` | `#C62828` | Error/danger |
| `--risk-low` | `#34A853` | Low risk |
| `--risk-moderate` | `#FBBC04` | Moderate risk |
| `--risk-high` | `#EA4335` | High risk |
| `--risk-critical` | `#B91C1C` | Critical |

---

## Typography

| Token | Font | Usage |
|---|---|---|
| `--font-sans` | DM Sans | Body, UI, buttons |
| `--font-serif` | Cormorant Garamond | Editorial, hero subtitles |
| `--font-mono` | DM Mono | Badges, status labels, technical data |
| *(display)* | DM Serif Display | Landing page hero only |

---

## Motion

| Token | Value | Usage |
|---|---|---|
| `--duration-instant` | 100ms | Toggles |
| `--duration-fast` | 150ms | Hover states |
| `--duration-normal` | 200ms | Tab switches, nav |
| `--duration-slow` | 300ms | Page transitions |
| `--duration-gentle` | 500ms | Loading reveals |

---

## Spacing & Layout

- Cards: `rounded-xl border border-[var(--border)] p-4 bg-[var(--bg2)]`
- Primary buttons: `rounded-xl bg-[var(--green)] text-[var(--bg)] px-8 py-4`
- Sidebar width: `--sidebar-width: 260px`
- Top bar height: `--topbar-height: 56px`
- Mobile nav height: `--mobile-nav-height: 64px`
- Breakpoints: `sm:` 640px, `lg:` 1024px (sidebar toggle)
- Desktop grid: 1 → 2 → 3 columns (max 1200px, 16px gap)

---

## Empty State Pattern
64px muted icon + 18px title + 14px description (`--text3`) + CTA button

Required variants: No parcels, No surveys, No conversations, No posts, No alerts ("All clear")

---

## Accessibility
- Focus rings: `2px solid var(--green)` with `2px` offset on all interactive elements
- Status indicators use shapes + color (circle = healthy, triangle = at-risk, square = critical)
- Skip-to-content link as first focusable element
- All animations disabled under `prefers-reduced-motion`

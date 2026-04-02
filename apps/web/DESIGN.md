# BeetleSense Design System

This document describes the visual design of the BeetleSense web app as it exists today. It is derived from the actual CSS custom properties in `src/index.css` and `src/styles/theme.css`, and the patterns used across components.

---

## 1. Color Palette

All colors are defined as CSS custom properties on `:root` in `src/index.css`.

### Core Colors

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#F5F7F4` | Page background (light sage) |
| `--bg2` | `#FFFFFF` | Card/surface background |
| `--bg3` | `#EEF2EC` | Secondary surface, hover states, skeleton placeholders |
| `--surface` | `#FFFFFF` | Equivalent to --bg2, used in map popups and controls |

### Text

| Token | Value | Usage |
|---|---|---|
| `--text` | `#1A2E1C` | Primary text (near-black green) |
| `--text2` | `#2E4A30` | Secondary text (subtitles, descriptions) |
| `--text3` | `#5C7A5E` | Muted text (timestamps, labels, captions) |

### Green Accents

| Token | Value | Usage |
|---|---|---|
| `--green` | `#1B5E20` | Primary green (buttons, links, focus rings) |
| `--green2` | `#2E7D32` | Secondary green (gradients, hover states) |
| `--green3` | `#4CAF50` | Light green (badges, accents) |
| `--green-dim` | `#66BB6A` | Dimmed green (scrollbar hover) |

### Borders

| Token | Value | Usage |
|---|---|---|
| `--border` | `rgba(30, 100, 50, 0.15)` | Default border (cards, inputs, dividers) |
| `--border2` | `rgba(30, 100, 50, 0.30)` | Stronger border (active states, spinners) |

### Status / Semantic

| Token | Value | Usage |
|---|---|---|
| `--amber` | `#E65100` | Warning/amber indicators |
| `--red` | `#C62828` | Error/danger states |

### Tailwind Theme Extensions

Extended color scales are defined in the `@theme` block for use with Tailwind utility classes:

- **forest-50 to forest-950** -- deep greens, used for custom dark tones
- **bark-50 to bark-900** -- warm yellows/ambers (bark beetle severity, warnings)
- **canopy-50 to canopy-900** -- teals/greens (health indicators, accents)
- **color-amber** (`#fbbf24`) and **color-danger** (`#ef4444`) -- semantic Tailwind tokens

---

## 2. Typography

Fonts are defined as CSS custom properties and loaded via Google Fonts or system fallbacks.

| Token | Font Stack | Usage |
|---|---|---|
| `--font-sans` | `'DM Sans', ui-sans-serif, system-ui, sans-serif` | Body text, UI elements, buttons, labels |
| `--font-serif` | `'Cormorant Garamond', ui-serif, Georgia, serif` | Taglines, hero subtitles, editorial text |
| `--font-mono` | `'DM Mono', ui-monospace, monospace` | Badges, status labels, loading indicators, technical data |

- `html` uses `--font-sans` as the base font family.
- Font smoothing is enabled via `-webkit-font-smoothing: antialiased`.

---

## 3. Component Patterns

The app uses a **solid surface** approach throughout. There is NO glassmorphism, NO backdrop-blur, and NO transparency on content surfaces.

### Cards

```
rounded-xl border border-[var(--border)] p-4
background: var(--bg2)   /* solid white */
```

- Solid white (`#FFFFFF`) background
- Thin green-tinted border at 15% opacity
- `rounded-xl` border radius (Tailwind: 0.75rem / 12px)
- Padding typically `p-4` (1rem)
- No box-shadow on standard cards

### Buttons (Primary)

```
rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold
px-8 py-4
hover:brightness-110 hover:scale-105
active:scale-95
```

- Solid green (`#1B5E20`) background
- Light text (`--bg`, #F5F7F4)
- `rounded-xl` (12px)
- Hover: slight brightness increase + scale-up
- Active: scale-down for press feedback
- Optional: `glow-green` class adds a subtle green box-shadow

### Buttons (Secondary)

```
rounded-xl border border-[var(--border2)] text-[var(--green)]
hover:bg-[var(--bg3)] hover:border-[var(--green)]
```

- Transparent/light background with green border
- Green text
- Hover: fills with `--bg3` background

### Inputs

```
rounded-xl border border-[var(--border)]
background: var(--bg2)   /* solid white */
```

- Solid white background
- Same border treatment as cards
- Focus ring: `2px solid var(--green)` with `2px` offset

### Navigation (TopBar)

- Solid `bg-[var(--bg)]` background
- Fixed height: `--topbar-height: 56px`
- Contains: language selector, theme toggle, notification bell, user menu
- No transparency or blur effects

### Navigation (Sidebar)

- Fixed width: `--sidebar-width: 260px`
- Solid background
- Hidden on mobile, visible on `lg:` breakpoint and above

### Navigation (Mobile Bottom Nav)

- Fixed height: `--mobile-nav-height: 64px`
- Solid background
- Visible only on small screens

### Badges / Pills

```
rounded-full border px-4 py-1.5
bg-[var(--bg2)]
text-xs font-mono uppercase tracking-widest
```

- Full rounded (pill shape)
- Monospace font, uppercase, wide letter-spacing
- Often paired with a small green pulse dot

---

## 4. Layout Principles

### Philosophy

- **Light, clean, nature-inspired** -- the palette draws from forest greens and natural whites
- **Solid surfaces only** -- no transparency, no backdrop-blur, no glassmorphism anywhere
- **Green accents** for forestry branding throughout the UI
- **Mobile-responsive** using CSS Grid and Flexbox
- **Bilingual** -- Swedish and English with a toggle in the top bar (uses i18next)

### Layout Structure

- `#root` is a vertical flex container (`min-height: 100dvh`)
- Desktop: sidebar (260px) + main content area with top bar (56px)
- Mobile: full-width content with bottom navigation bar (64px)
- Sidebar drawer on mobile with overlay backdrop (`bg-black/50`)

### Responsive Breakpoints

The app uses Tailwind's default breakpoints:
- `sm:` (640px) -- stacked to side-by-side buttons
- `lg:` (1024px) -- sidebar visibility toggle

### Accessibility

- Focus rings: `2px solid var(--green)` with `2px` offset on all interactive elements
- `.sr-only` utility for screen-reader-only content
- `prefers-reduced-motion` respected -- all animations disabled
- Status indicators use shapes alongside color (circle = healthy, triangle = at-risk, square = critical) for colorblind accessibility
- Skip-to-content link as first focusable element (WCAG 2.4.1)

---

## 5. Border Radius Conventions

| Tailwind Class | CSS Value | Usage |
|---|---|---|
| `rounded-xl` | `0.75rem` (12px) | Cards, buttons, inputs, map controls, popups |
| `rounded-full` | `9999px` | Badges, pills, status dots, avatar circles |
| `rounded` | `0.25rem` (4px) | Focus ring border-radius, small skeleton loaders |
| `rounded-lg` | `0.5rem` (8px) | Map control groups (MapLibre overrides) |

The primary radius is `rounded-xl` (12px) -- this is used on nearly all major UI surfaces.

---

## 6. Utility Classes (Custom)

Defined in `src/index.css`:

| Class | Effect |
|---|---|
| `.glass` | Solid `--bg2` background + `--border` border (NOT actual glass/blur) |
| `.glow-green` | Subtle green box-shadow (used on primary CTA buttons) |
| `.text-gradient` | Green gradient text (`--green` to `--green2`, 135deg) |
| `.sr-only` | Screen-reader only (visually hidden) |
| `.animate-tour-pulse` | Pulsing glow for product tour highlights |

---

## 7. Theme System

Defined in `src/styles/theme.css`. The app supports two themes via `data-theme` attribute:

- **Light (default)**: `--bg-primary: #f1f8e9`, white cards, dark green text
- **Dark (optional)**: `--bg-primary: #030d05`, dark green cards, light text

Theme switching uses smooth CSS transitions on background-color, color, and border-color (0.3s ease). The toggle is in the top bar via `ThemeToggle` component.

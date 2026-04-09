# BeetleSense Design System

This document describes the visual design of the BeetleSense web app as it exists today. It is derived from the actual CSS custom properties in `src/index.css` and `src/styles/theme.css`, and the patterns used across components.

---

## 0. Design Philosophy

**"Quiet Confidence"** — authoritative but welcoming. BeetleSense should feel like a premium intelligence tool, not a legacy admin app. Think Linear, Notion, or Vercel's dashboard applied to forestry.

### Target User: Erik, 58, Forest Owner in Småland
Every design decision must pass the Erik test:
- **Low tech skill.** Uses a Samsung phone for calls, photos, Swish. Never used GIS. Types slowly.
- **High forest knowledge.** 40 years of experience. Don't lecture him — be a respectful colleague.
- **Emotional state.** Lost 180,000 SEK to beetles he wasn't warned about. Anxious every spring. Wants reassurance.
- **3-tap rule.** If it takes more than 3 taps on his phone in the forest, he'll give up and call his neighbour.
- **Swedish first.** Prefers everything in Swedish. English is basic. All copy must be natural, non-technical Swedish.

### Landing Page Principles
1. **Don't overwhelm.** No tech jargon, no data visualizations, no feature dumps above the fold. Start with a human question: "Vet du hur din skog mår just nu?"
2. **Show the outcome, not the technology.** Erik doesn't care about satellite sensors or AI models. He cares that his forest is healthy and he'll be warned before damage. Show a product preview that looks like the reassuring dashboard he'll actually use.
3. **Build trust through familiarity.** Use names he recognizes: Skogsstyrelsen, SLU, Lantmäteriet, SMHI. These are not "partners" — they're data sources he already trusts.
4. **One clear action.** Don't give two competing buttons. One green CTA: "Kom igång gratis." Below it: "Ingen kreditkort krävs. Fungerar på mobil." That's all he needs to decide.
5. **Light theme only on landing.** The landing page uses the app's light theme (warm sage background, green accents, solid white cards). No dark hero sections — dark UIs feel "technical" to non-tech users. The forest image lives inside a product preview card, not as a full-bleed background that makes text unreadable.
6. **Plain language status cards.** The product preview should show exactly what Erik will see: "Skadeläge: Lågt", "Virkesvolym: 42 000 m³sk", "Din skog ser bra ut just nu." No charts, no percentages, no data tables.
7. **Scroll reward.** Below the fold, each section answers one question Erik has: "How does it work?" (3 simple steps), "What will I see?" (screenshot), "What does it cost?" (simple pricing), "Who else uses it?" (testimonials from people like him).
8. **Mobile-first.** Erik is on a Samsung Galaxy in the forest with bad 4G. Every element must work at 360px width. Images lazy-loaded. No heavy animations. No video autoplay.

---

## 1. Color Palette

All colors are defined as CSS custom properties on `:root` in `src/index.css`.

### Core Colors

| Token | Value | Usage |
|---|---|---|
| `--bg` | `#F7F8F5` | Page background (warmed sage) |
| `--bg-wash` | `#FAFBF8` | Full-bleed background wash |
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
| `--green` | `#1A6B3C` | Primary green (buttons, nav active states, focus rings) |
| `--green2` | `#2E7D32` | Secondary green (gradients, hover states) |
| `--green3` | `#4CAF50` | Light green (badges, accents) |
| `--green-dim` | `#66BB6A` | Dimmed green (scrollbar hover) |
| `--green-muted` | `#89B896` | Muted green (disabled states, placeholder accents) |
| `--green-wash` | `rgba(26, 107, 60, 0.06)` | Green wash (subtle hover backgrounds, active tab fill) |

### Accent (Interactive)

| Token | Value | Usage |
|---|---|---|
| `--accent` | `#2563EB` | Blue — interactive elements, links, CTAs. Creates visual hierarchy against green branding. |
| `--accent-wash` | `rgba(37, 99, 235, 0.06)` | Subtle hover backgrounds for interactive elements |

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

### Risk Spectrum Colors

| Token | Value | Usage |
|---|---|---|
| `--risk-low` | `#34A853` | Low risk — healthy, good condition |
| `--risk-moderate` | `#FBBC04` | Moderate risk — needs attention |
| `--risk-high` | `#EA4335` | High risk — action needed |
| `--risk-critical` | `#B91C1C` | Critical — immediate intervention |
| `--risk-info` | `#4285F4` | Informational — neutral status |

### Data Visualization Palette

| Token | Value | Usage |
|---|---|---|
| `--chart-1` | `#1A6B3C` | Green — primary/spruce |
| `--chart-2` | `#2563EB` | Blue — satellite/water |
| `--chart-3` | `#D97706` | Amber — warnings/deciduous |
| `--chart-4` | `#7C3AED` | Purple — projections |
| `--chart-5` | `#059669` | Teal — biodiversity |
| `--chart-6` | `#DC2626` | Red — damage/risk |
| `--chart-7` | `#0891B2` | Cyan — climate |
| `--chart-8` | `#4B5563` | Grey — baselines |

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
| *(display)* | `'DM Serif Display', serif` | Landing page hero headlines and display headings. Loaded via Google Fonts on the landing page only. |

- `html` uses `--font-sans` as the base font family.
- **DM Serif Display** is used as the display/hero font on the landing page for large headlines and section titles. It is not assigned a CSS custom property; it is referenced directly in component classes (e.g. `font-['DM_Serif_Display']`).
- Font smoothing is enabled via `-webkit-font-smoothing: antialiased`.

### Typography Scale

| Size | Usage | Font |
|---|---|---|
| 12px | Meta, timestamps | DM Mono |
| 13px | Secondary labels | DM Sans |
| 15px | Body text (base, slightly larger for accessibility) | DM Sans |
| 18px | Card titles | DM Sans |
| 22px | Section headers | DM Sans |
| 28px | Page titles | DM Sans |
| 36px | Hero numbers | Cormorant Garamond |

---

## 3. Shadow Tokens (Card Elevation System)

| Level | Token | Value | Usage |
|---|---|---|---|
| 0 (Flat) | — | No shadow, optional border | List items, background sections |
| 1 (Raised) | `--shadow-card` | `0 1px 3px rgba(0,0,0,0.04), 0 0 0 1px rgba(26,107,60,0.06)` | Intel cards, forum posts |
| 2 (Floating) | `--shadow-lg` | `0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(26,107,60,0.04)` | Dropdowns, popovers |
| 3 (Modal) | `--shadow-xl` | `0 8px 30px rgba(0,0,0,0.12)` | Dialogs, command palette |

- Cards transition Level 1 to Level 2 on hover (200ms ease-out)
- Additional mid-level: `--shadow-md: 0 4px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(26,107,60,0.04)`

---

## 4. Duration Tokens (Motion Timing)

| Token | Value | Usage |
|---|---|---|
| `--duration-instant` | `100ms` | Toggles, micro-interactions |
| `--duration-fast` | `150ms` | Hover states |
| `--duration-normal` | `200ms` | Tab switches, nav changes |
| `--duration-slow` | `300ms` | Page transitions |
| `--duration-gentle` | `500ms` | Loading reveals |

---

## 5. Component Patterns

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

### Intel Card Patterns

4 variants:

1. **Risk Card** — 4px colored left border, risk level indicator
2. **Metric Card** — large number + trend arrow
3. **Map Card** — embedded mini-map overlay
4. **Activity Card** — event timeline

Grid: 1 col mobile, 2 col tablet, 3 col desktop (max 1200px, 16px gap)

### Buttons (Primary)

```
rounded-xl bg-[var(--green)] text-[var(--bg)] font-semibold
px-8 py-4
hover:brightness-110 hover:scale-105
active:scale-95
```

- Solid green (`#1A6B3C`) background
- Light text (`--bg`, #F7F8F5)
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

### 5-Tab Navigation Pattern

**Mobile bottom nav:** 5 equal icons + labels, 64px height, active = green pill indicator, Wingman center with wash background

**Desktop left rail:** 64px collapsed, 240px expanded, 5 icons vertical

### Badges / Pills

```
rounded-full border px-4 py-1.5
bg-[var(--bg2)]
text-xs font-mono uppercase tracking-widest
```

- Full rounded (pill shape)
- Monospace font, uppercase, wide letter-spacing
- Often paired with a small green pulse dot

### Empty State Pattern

Template: 64px muted icon + 18px title + 14px description (`--text3`) + CTA button

Required variants:
- No parcels
- No surveys
- No conversations
- No posts
- No alerts ("All clear")

---

## 6. Motion Guidelines

- **Tab switch:** 200ms cross-fade + 8px translateY
- **Intel cards:** stagger 50ms, scale 0.97 to 1.0
- **Wingman streaming:** word fade 80ms
- **Risk change:** 500ms border color + background pulse
- **Skeleton:** warm shimmer 1.5s
- All disabled under `prefers-reduced-motion`

---

## 7. Layout Principles

### Philosophy

- **Light, clean, nature-inspired** -- the palette draws from forest greens and natural whites
- **Solid surfaces only** -- no transparency, no backdrop-blur, no glassmorphism anywhere
- **Green accents** for forestry branding throughout the UI
- **Blue accent** (`--accent`) for interactive elements, creating visual hierarchy
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

## 8. Border Radius Conventions

| Tailwind Class | CSS Value | Usage |
|---|---|---|
| `rounded-xl` | `0.75rem` (12px) | Cards, buttons, inputs, map controls, popups |
| `rounded-full` | `9999px` | Badges, pills, status dots, avatar circles |
| `rounded` | `0.25rem` (4px) | Focus ring border-radius, small skeleton loaders |
| `rounded-lg` | `0.5rem` (8px) | Map control groups (MapLibre overrides) |

The primary radius is `rounded-xl` (12px) -- this is used on nearly all major UI surfaces.

---

## 9. Utility Classes (Custom)

Defined in `src/index.css`:

| Class | Effect |
|---|---|
| `.glass` | Solid `--bg2` background + `--border` border (NOT actual glass/blur) |
| `.glow-green` | Subtle green box-shadow (used on primary CTA buttons) |
| `.text-gradient` | Green gradient text (`--green` to `--green2`, 135deg) |
| `.sr-only` | Screen-reader only (visually hidden) |
| `.animate-tour-pulse` | Pulsing glow for product tour highlights |

---

## 10. Theme System

Defined in `src/styles/theme.css`. The app supports two themes via `data-theme` attribute:

- **Light (default)**: `--bg-primary: #f1f8e9`, white cards, dark green text
- **Dark (optional)**: `--bg-primary: #030d05`, dark green cards, light text

Theme switching uses smooth CSS transitions on background-color, color, and border-color (0.3s ease). The toggle is in the top bar via `ThemeToggle` component.

---
name: Obsidian Terminal
colors:
  surface: '#10131a'
  surface-dim: '#10131a'
  surface-bright: '#363940'
  surface-container-lowest: '#0b0e14'
  surface-container-low: '#191c22'
  surface-container: '#1d2026'
  surface-container-high: '#272a31'
  surface-container-highest: '#32353c'
  on-surface: '#e1e2eb'
  on-surface-variant: '#bec7d4'
  inverse-surface: '#e1e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#88919d'
  outline-variant: '#3f4852'
  surface-tint: '#98cbff'
  primary: '#98cbff'
  on-primary: '#003354'
  primary-container: '#00a3ff'
  on-primary-container: '#00375a'
  inverse-primary: '#00629d'
  secondary: '#e6feff'
  on-secondary: '#003739'
  secondary-container: '#00f4fe'
  on-secondary-container: '#006c71'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00b27b'
  on-tertiary-container: '#003c27'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#98cbff'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#004a77'
  secondary-fixed: '#63f7ff'
  secondary-fixed-dim: '#00dce5'
  on-secondary-fixed: '#002021'
  on-secondary-fixed-variant: '#004f53'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#10131a'
  on-background: '#e1e2eb'
  surface-variant: '#32353c'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-base:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  body-bold:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: '0'
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  stat-lg:
    fontFamily: JetBrains Mono
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 16px
  margin-desktop: 32px
---

## Brand & Style

The visual identity of this design system is rooted in the concept of **"Diagnostics as Code."** It is a high-fidelity, production-grade environment designed for high-stakes medical laboratory mission control centers. The brand personality is authoritative, precise, and technologically advanced, evoking a sense of calm control amidst high-density data flows.

The design style is a hybrid of **Minimalist Brutalism** and **Glassmorphism**. It utilizes an ultra-dark "Deep Obsidian" foundation to eliminate glare and eye fatigue, while employing laser-crisp hairline borders and vibrant "Cyber Blue" accents to indicate system activity. Subtle 16px grid patterns and backdrop-blurred surfaces provide structural depth without sacrificing the technical, flat aesthetic required for professional diagnostic tools.

**Key Visual Principles:**
- **Absolute Precision:** Every pixel serves a functional purpose; decorative elements are minimized in favor of data clarity.
- **High-Frequency Feedback:** Active states are reinforced with subtle glows and high-contrast color shifts.
- **Density over Air:** While maintaining legibility, the system prioritizes information density to allow for complex telemetry monitoring on a single screen.

## Colors

The palette is optimized for high-contrast legibility in dark environments. 

- **Primary (Cyber Blue):** Used for primary actions, execution triggers, and active data pipelines.
- **Secondary (Cyber Teal):** Reserved for secondary signals, focus rings, and high-frequency telemetry pulses.
- **Tertiary (Nominal Emerald):** Specifically for success states, verified assays, and healthy system status.
- **Neutral (Deep Obsidian):** The base of the system, providing a deep, non-clipping black for all background surfaces.

**Functional Extensions:**
- **Warning (#F59E0B):** For signal drift and pending calibration.
- **Critical (#EF4444):** For hardware faults and out-of-bounds biological markers.
- **Surface Variant (#1A2234):** Used for glassmorphic cards and elevated containers.

## Typography

The system utilizes a dual-font strategy to separate interface controls from technical data.

- **Inter (UI & Structural):** Chosen for its exceptional legibility and neutral tone. It handles all navigation, headings, and instructional text.
- **JetBrains Mono (Technical Data):** Used for all numerical outputs, telemetry logs, and code-like diagnostic scripts. 

**Implementation Notes:**
- All monospaced values must use `font-variant-numeric: tabular-nums` to ensure that numbers do not jump horizontally during real-time updates.
- **Label Caps** should always be rendered in `uppercase` to reinforce the terminal aesthetic.
- Maintain tight line-heights on display styles to maximize vertical workspace.

## Layout & Spacing

The layout is built on a **16-column fluid workspace grid**, specifically designed for high-resolution medical workstations and multi-monitor setups. 

**Grid Philosophy:**
- **Fluid Modular Panels:** The interface is composed of resizable panels that snap to a background 16px CSS grid mesh.
- **8px Modular Rhythm:** All spacing between elements follows an 8px progression, with a 4px micro-unit reserved for high-density data tables.
- **Gutter Strategy:** Fixed 16px gutters between panels to maintain structural clarity without wasting screen real estate.

**Responsive Reflow:**
- **Desktop (1440px+):** Full 16-column multi-panel view.
- **Tablet (768px - 1023px):** Transition to an 8-column grid with collapsible sidebars.
- **Mobile (<767px):** Single-column stacked layout with primary telemetry stats pinned to the top.

## Elevation & Depth

Depth is conveyed through **Glassmorphism** and **Tonal Layering** rather than traditional drop shadows.

- **Base Layer:** Deep Obsidian (#0B0E14) with a subtle 16px grid overlay (`rgba(255, 255, 255, 0.025)`).
- **Interactive Layers:** Cards and modals utilize a semi-transparent surface (`rgba(26, 34, 52, 0.6)`) with a `backdrop-filter: blur(12px)`.
- **Outline Definition:** Surfaces are separated by 1px hairline borders (`#334155`). 
- **Active Elevation:** Instead of physical height, "elevation" is signaled by a glowing outer stroke (`0 0 12px rgba(0, 163, 255, 0.25)`) and a 2px top-accent bar in Cyber Teal.

## Shapes

The shape language is **Soft (0.375rem)** to maintain a technical, professional edge while avoiding the harshness of pure sharp corners.

- **Default:** `0.375rem` for buttons and standard cards.
- **Large:** `0.75rem` for major container groups or primary modals.
- **Pill:** Reserved exclusively for status badges and indicators to distinguish them from interactive buttons.
- **Borders:** All borders must be 1px solid, utilizing high-contrast colors for active states and muted slate for inactive states.

## Components

### Buttons
- **Primary:** Solid Cyber Blue (#00A3FF) with black text. Features a subtle outer glow on hover.
- **Secondary:** Transparent with a 1px Cyber Teal border and teal text. 
- **Ghost:** Monospace text with no border, appearing only with a `rgba(255, 255, 255, 0.05)` background on hover.

### Cards & Panels
- Constructed with glassmorphic backgrounds. Every card must have a 1px hairline border. 
- Header areas within cards should use a slightly darker, opaque background to anchor the title.

### Input Fields
- Deep Obsidian fills with monospaced input text. 
- On focus, the border transitions from Slate Grey to Cyber Blue with a focused glow effect.

### Status Badges
- High-contrast pill shapes. Use 10% opacity fills of the state color (Emerald, Amber, Crimson) with a 100% opacity 1px border.
- Pair with a 12px icon for rapid visual scanning.

### Telemetry Sparklines
- 2px continuous stroke lines in Cyber Teal. 
- Include a vertical linear gradient (15% opacity) beneath the line to the baseline of the chart to provide volume.

### Command Bar
- A fixed-position CLI style input at the bottom or top of the workspace. 
- Use JetBrains Mono with a `diagdesk> ` prefix in Cyber Teal.
# Component Standards

*Canonical specs for the shared UI components. Built on **shadcn/ui** (base) + **21st.dev** (accelerators) + **Framer
Motion** (motion), all themed from the tokens — never hard-code colors/spacing, always use token roles. Tokens in
[tokens/components.json](tokens/components.json).*

> **Rule:** components consume **semantic role tokens** (`primary`, `card`, `border`, `ring`…), so the same component
> renders correctly in **DiagDesk or MediCircle**, **light or dark**, with zero per-component change.

---

## Button
- **Variants:** `primary` (brand primary), `secondary`, `outline`, `ghost`, `destructive`, `link`.
- **Sizes:** `sm` (h 2rem), `md` (h 2.5rem, default), `lg` (h 3rem), `icon` (2.5rem square).
- **Shape/type:** radius `--radius` (10px); font-weight semibold.
- **States:** hover (slightly darker/elevated), active, **focus-visible → 2px `ring`**, disabled (50% + no pointer),
  loading (spinner + disabled). Min tap target 40px (mobile).
- **A11y:** real `<button>`; icon-only buttons need `aria-label`.

## Navigation
- **Top bar:** height 3.5rem, `card` bg + bottom `border`; brandmark left, actions right; sticky.
- **Sidebar:** width 16rem (collapsed 4rem); items height 2.5rem, radius `--radius`; **active item = `accent` bg +
  `primary` text**; section labels in `muted-foreground`.
- **Mobile:** bottom tab bar or slide-over drawer (Framer Motion, respects `prefers-reduced-motion`).
- **A11y:** `<nav aria-label>`; current item `aria-current="page"`; keyboard-navigable; focus rings visible.

## Input & form fields
- Height 2.5rem, radius `--radius`, `background` bg, `input` border, padding-x `space.3`; **focus → `ring`**.
- States: error (`destructive` border + helper text), disabled, read-only. Always pair with a `<label>`;
  helper/error text below; required marked. Same spec for select, textarea, combobox, date-picker.

## Card
- Radius `radius.lg` (16px), padding `space.6`, `card`/`card-foreground`, `border`, shadow `shadow.md`.
- Header (title + optional description/action), body, optional footer.

## Badge / Tag
- Radius full, padding-x `space.2`, xs semibold. Tones: neutral (`muted`), `primary`, `success`, `warning`,
  `destructive` (use the soft/`-foreground` pairings for contrast).

## Dialog / Modal
- Radius `radius.lg`, padding `space.6`, shadow `shadow.xl`, overlay `rgba(11,28,48,0.45)`.
- Focus-trapped; `Esc` closes; return focus to trigger; `role="dialog"` + labelled. Framer Motion fade/scale in.

## Toast / Notification
- Radius `--radius`, shadow `shadow.lg`; tones success/warning/destructive/info; auto-dismiss + manual close;
  `aria-live="polite"` (assertive for errors); stack top-right (web) / top (mobile).

## Table / Data grid
- `card` surface, `border` row dividers, `muted` header; zebra optional; sticky header; right-align numerals;
  row hover `muted`. Provide empty/loading/error states.

## Tabs · Avatar · Tooltip (brief)
- **Tabs:** underline or pill; active = `primary`; keyboard arrow-navigable.
- **Avatar:** circle; initials fallback on `accent`.
- **Tooltip:** `popover` bg, small radius, delay; never the only source of essential info.

## Cross-cutting
- **Spacing:** use the `space.*` scale only (4px base). **Type:** `fontSize.*` + Inter; icons = Material Symbols.
- **Motion:** durations/easings from `core.motion`; respect `prefers-reduced-motion`.
- **States everywhere:** every component must define default · hover · focus-visible · active · disabled · loading ·
  error/empty. **Focus-visible ring is mandatory** (keyboard a11y).
- **Density:** a compact mode (smaller heights/padding) is allowed for data-dense clinical screens — via a `data-density`
  attribute, still token-driven.

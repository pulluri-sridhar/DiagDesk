# MediCircle / DiagDesk — Design System

**The single source of truth for styling across the whole portal** — colors, fonts, brand kits, type/spacing scales,
and component standards. Change a token once here, rebuild, and **every web portal and mobile app updates**. Two brand
themes (**DiagDesk** lab · **MediCircle** program) share one structure; light + dark built in.

> Future home: `packages/design-system` in the Nx monorepo, published as `@medicircle/design-system`. Lives here in the
> planning repo for now.

---

## How it works (the propagation model)
```
tokens/*.json   ──build──▶   dist/tailwind-preset.js   (web · Tailwind + shadcn/ui)
(SINGLE SOURCE)              dist/tokens.css           (web · runtime CSS variables — brand & dark switch, no rebuild)
                            dist/theme.ts             (mobile · React Native / NativeWind)
```
1. **Edit a token** in `tokens/` (e.g. change DiagDesk primary, or a spacing step).
2. **`npm run build`** (`node build/build.mjs`) regenerates all three `dist/` outputs.
3. Every app imports those outputs → the change propagates everywhere. **Brand + light/dark switch at runtime** via
   `data-brand` / `.dark` attributes — no rebuild needed for theming.

## Token layers (`tokens/`)
| File | Layer | What |
|---|---|---|
| `core.json` | **primitives** | raw palette ramps, type scale, spacing, radii, shadows, motion, z-index, breakpoints (brand-agnostic) |
| `semantic.json` | **roles** (light+dark) | `background/foreground/card/muted/border/ring/primary/secondary/accent/destructive/success/warning` → alias primitives + brand; **shadcn variable names** |
| `brand.diagdesk.json` | **brand** | Clinical Clarity (teal `#00685f` + indigo `#4b41e1`) |
| `brand.medicircle.json` | **brand** | program theme (indigo-led) — same keys, different hues |
| `components.json` | **component** | button/nav/input/card/badge/dialog/toast sizing + which semantic role each variant uses |

## Consuming it

**Web (Next.js / Vite + Tailwind + shadcn/ui):**
```js
// tailwind.config.js
module.exports = { presets: [require('@medicircle/design-system/dist/tailwind-preset')], content: [...] }
```
```ts
// app entry — import the CSS variables once
import '@medicircle/design-system/dist/tokens.css'
```
```html
<!-- switch brand + mode at runtime, no rebuild -->
<html data-brand="medicircle" class="dark"> … </html>
```
shadcn/ui components work **out of the box** — `tokens.css` defines the exact `--primary`, `--background`, `--ring`,
`--radius`, … variables (HSL channels) that shadcn expects.

**Mobile (React Native + NativeWind):**
```ts
import theme from '@medicircle/design-system/dist/theme'
const c = theme.brands.diagdesk.light   // { primary: '#00685f', background: '#f8f9ff', … }
```

## Governance
- **Versioning:** semver the package; **breaking token rename = major**. Keep a CHANGELOG.
- **Never edit `dist/`** (generated). Edit `tokens/` and rebuild.
- **Accessibility:** key pairs must meet **WCAG 2.1 AA** (≥4.5:1 text, ≥3:1 large/UI). Current primaries pass on white
  (~6.7:1); body text ~16:1. Re-check on any palette change.
- **Storybook** is the visual contract (component states across both brands × light/dark); add axe checks in CI.
- **Motion** honors `prefers-reduced-motion`; durations/easings come from `core.json`.

## Files
```
design-system/
  tokens/      core · semantic · brand.diagdesk · brand.medicircle · components   (SOURCE)
  build/       build.mjs   (JSON → dist; no deps)
  dist/        tailwind-preset.js · tokens.css · theme.ts   (GENERATED)
  fonts/       Inter 400–800 + Material Symbols (self-hosted) + fonts.css
  components.md component standards (button, nav, input, card, …)
```

See [components.md](components.md) for the component standards.

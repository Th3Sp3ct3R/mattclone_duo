# Design System — Dark AI Vibe

> Token-driven, light/dark theme. Source of truth is **`@julio/design-tokens`**.
> Never hardcode colors/spacing in components — consume the `--ui-*` CSS variables
> so everything themes automatically.

## How it's wired

| Layer | File | Role |
|---|---|---|
| Token values | `packages/design-tokens/src/tokens.js` | `lightTokens` / `darkTokens` objects |
| Compiled CSS | `packages/design-tokens/src/tokens.css` | `:root` (light) + `:root[data-theme='dark']` |
| Base styles | `packages/ui/src/tokens.scss`, `base.scss`, `primitives.scss` | component primitives bound to vars |
| Theme toggle | `packages/ui/src/theme-script.js` | sets `document.documentElement.dataset.theme` + `colorScheme` |
| App wiring | `apps/web-next/src/theme/*` | `ApplyStoredTheme`, persisted preference |

Dark mode is activated by `:root[data-theme='dark']`. The theme script reads the
stored preference (falling back to `prefers-color-scheme`) and sets the attribute
before paint to avoid flashes.

## Palette

### Dark (the "AI vibe")
| Token (CSS var) | Value | Use |
|---|---|---|
| `--ui-bg` | `#0a0a0a` | app background |
| `--ui-card` | `#121212` | panels, cards, tiles |
| `--ui-fg` | `#f8fafc` | primary text |
| `--ui-muted` | `rgba(248,250,252,.7)` | secondary text, kickers |
| `--ui-border` | `rgba(248,250,252,.14)` | hairlines |
| `--ui-border-strong` | `rgba(248,250,252,.26)` | emphasized edges, phone frames |
| `--ui-primary` / mint | **`#3ad4a7`** | accent: online/live/active cues |
| `--ui-input` | `rgba(255,255,255,.06)` | field fills |
| `--ui-error` | `#fb7185` | errors |

### Light
bg `#ffffff` · card `#f8fafc` · fg `#0a0a0a` · muted `#6b7280` · border `rgba(0,0,0,.18)` · primary mint `#3ad4a7`.

### The accent
**Mint `#3ad4a7`** is the single accent. Use it sparingly for "alive" states —
running devices, live stream, active selection. Everything else stays monochrome
(black/white + alpha). This is what makes it read as "dark AI" rather than busy.

## Scale & shape

- **Spacing** (`--ui-space-*`): `xxsmall 4` · `xsmall 8` · `small 12` · `medium 16` · `large 24` · `xlarge 32` · `xxlarge 40` · `xxxlarge 56` · `jumbo 72`.
- **Radius**: `--ui-radius` 12px, `--ui-radius-sm` 10px, pills `999px`.
- **Shadow** (dark): `0 18px 60px rgba(0,0,0,.45)`.
- **Focus ring**: `--ui-ring`.
- **Fonts**: body `--ui-font` (Nunito), brand/headings `--ui-font-brand` (CalSans).

## Component conventions

- **Kicker** — `.Kicker`: uppercase-ish muted label above a heading.
- **Cards** — `<Card>` from `@julio/ui`; internal stacks use `.layout-stack-gap-*` / `.layout-inline-gap-*`.
- **Tables** — `<DataTable>`; **Selects** — `EngineSelect`; **Buttons** — `<Button size="sm" variant="primary|secondary">`.
- **Status tone classes** follow `--ok / --working / --failed / --idle` (see login-flow + focus styles).

### Reference implementation: DuoPlus Focus Mode
`apps/web-next/app/(app)/engine/components/DuoPlusFocusMode.jsx` +
`.FocusMode` / `.FocusPhone` / `.MockScreen` in `globals.scss` are a worked
example of the schema: phone-frame tiles on `--ui-card`, `--ui-border-strong`
frames, mint dots/pills for running/live, all spacing via `--ui-space-*`.

## Rules

1. **No literal colors** in components — use `--ui-*`. (The Focus Mode accent was
   migrated from a literal green to mint `#3ad4a7` for exactly this reason.)
2. Mint accent = "alive" only. Don't decorate with it.
3. New surfaces must look correct in **both** themes — test with
   `document.documentElement.dataset.theme = 'dark' | 'light'`.
4. Use `color-mix(in srgb, <accent> X%, var(--ui-border))` for tinted borders so
   they degrade gracefully across themes.

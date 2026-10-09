# Design tokens

Source of truth: Figma file **Nantucket — Design System**
(`https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System`),
Variables panel, exported to `docs/figma-variable-tokens/*.json`.

Tokens live in [`css/tokens.css`](../css/tokens.css), imported by
[`css/globals.css`](../css/globals.css), and are wired into Tailwind v4 via
the `@theme inline` directive: raw values are plain CSS custom properties on
`:root` (and, for responsive type sizes, inside a `@media (min-width: 1024px)`
block), and `@theme inline` maps each one to a Tailwind theme key so it becomes
a utility class (e.g. `--color-primary` → `bg-primary`, `text-primary`, etc.).

Regenerate this file whenever the Figma variables change — re-export the
collections into `docs/figma-variable-tokens/` and update the values below and
in `css/tokens.css` to match.

## Collections

| File | Figma collection | Contains |
| --- | --- | --- |
| `Mode 1.tokens.json` | `primitives` | font family/weight/size/letter-spacing, spacing scale, raw color ramps |
| `Mode 1.tokens 2.json` | semantic colors (`Mode 1`) | background/surface/border/state colors aliased to primitives |
| `desktop.tokens.json` | `type-size` → `desktop` mode | responsive type scale, desktop values |
| `mobile.tokens.json` | `type-size` → `mobile` mode | responsive type scale, mobile values |

## Primitives

### Font family

| Token | Value | Tailwind class |
| --- | --- | --- |
| `font/family/font-serif` | EB Garamond | `font-serif` |
| `font/family/font-sans` | DM Sans | `font-sans` |
| `font/family/font-mono` | DM Mono | `font-mono` |

Loaded via `next/font/google` in [`app/layout.tsx`](../app/layout.tsx) and bound
to the `--font-serif` / `--font-sans` / `--font-mono` CSS variables.

### Font weight

| Token | Value | Tailwind class |
| --- | --- | --- |
| `font/weight/Regular` | 400 | `font-weight-regular` |

### Font size

| Token | px | rem | Tailwind class |
| --- | --- | --- | --- |
| `font/size/text-xs` | 10 | 0.625rem | `text-xs` |
| `font/size/text-sm` | 14 | 0.875rem | `text-sm` |
| `font/size/text-base` | 16 | 1rem | `text-base` |
| `font/size/text-lg` | 20 | 1.25rem | `text-lg` |
| `font/size/text-xl` | 24 | 1.5rem | `text-xl` |
| `font/size/text-2xl` | 32 | 2rem | `text-2xl` |
| `font/size/text-3xl` | 44 | 2.75rem | `text-3xl` |
| `font/size/text-4xl` | 59 | 3.6875rem | `text-4xl` |
| `font/size/text-5xl` | 80 | 5rem | `text-5xl` |
| `font/size/text-6xl` | 100 | 6.25rem | `text-6xl` |
| `font/size/text-7xl` | 120 | 7.5rem | `text-7xl` |

### Letter spacing

| Token | px | rem | Tailwind class |
| --- | --- | --- | --- |
| `font/letter-spacing/tight` | -2 | -0.125rem | `tracking-tight` |
| `font/letter-spacing/normal` | 0 | 0rem | `tracking-normal` |
| `font/letter-spacing/wide` | 2 | 0.125rem | `tracking-wide` |

### Spacing

The Figma `spacing-*` scale (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96,
128, 160, 192, 224, 256px) is identical to Tailwind v4's built-in default
spacing scale (`--spacing: 0.25rem` × step), so no override was added — use the
standard `p-*`, `m-*`, `gap-*`, etc. utilities directly (`spacing-8` → `p-8`,
`spacing-32` → `p-32`, and so on).

### Color ramps

Raw color ramps, exposed as `bg-{ramp}-{step}`, `text-{ramp}-{step}`,
`border-{ramp}-{step}`, etc. Prefer the semantic tokens below in product code;
use these only when extending the semantic layer.

- `moody-moor`: 100–900 (dark neutrals/browns) — `bg-moody-moor-500`, …
- `dusty-heath`: 100–1100 (warm off-white/sand) — `bg-dusty-heath-800`, …
- `lowlands`: 100–900 (greens) — `bg-lowlands-500`, …
- `goldenrod`: 100–900 (yellows) — `bg-goldenrod-500`, …
- `utility`: 500 (error red) — `bg-utility-500`

Figma's `*` suffix (e.g. `moody-moor/500*`) marks the ramp's base/default step;
it was dropped from the CSS variable name (`--color-moody-moor-500`) since
Tailwind class names can't contain `*`.

## Semantic tokens

All aliased to the primitives above (single `Mode 1`, no dark-mode variant is
defined in the source file yet).

| Token | Tailwind class | Aliases |
| --- | --- | --- |
| `background` | `bg-background` | `dusty-heath/1000` |
| `on-background` | `text-on-background` | `moody-moor/500*` |
| `on-background-subtle` | `text-on-background-subtle` | `moody-moor/700` |
| `on-background-tonal` | `text-on-background-tonal` | `moody-moor/900` |
| `primary` | `bg-primary` | `dusty-heath/800` |
| `on-primary` | `text-on-primary` | `moody-moor/600` |
| `secondary` | `bg-secondary` | `goldenrod/500*` |
| `on-secondary` | `text-on-secondary` | `moody-moor/600` |
| `accent-primary` | `bg-accent-primary` | `moody-moor/500*` |
| `on-accent-primary` | `text-on-accent-primary` | `dusty-heath/1000` |
| `on-accent-primary-tonal` | `text-on-accent-primary-tonal` | `moody-moor/700` |
| `accent-secondary` | `bg-accent-secondary` | `lowlands/500*` |
| `accent-secondary-tonal` | `bg-accent-secondary-tonal` | `lowlands/800` |
| `on-accent-secondary` | `text-on-accent-secondary` | `dusty-heath/1000` |
| `tag` | `bg-tag` | `dusty-heath/800` |
| `on-tag` | `text-on-tag` | `moody-moor/600` |
| `input` | `bg-input` | `dusty-heath/900` |
| `on-input` | `text-on-input` | `moody-moor/600` |
| `on-input-placeholder` | `text-on-input-placeholder` | `moody-moor/800` |
| `border-light` | `border-border-light` | `dusty-heath/500*` |
| `border-dark` | `border-border-dark` | `moody-moor/500*` |
| `border-alt` | `border-border-alt` | `goldenrod/500*` |
| `surface-dark` | `bg-surface-dark` | `dusty-heath/900` |
| `on-surface-dark` | `text-on-surface-dark` | `moody-moor/600` |
| `on-surface-dark-tonal` | `text-on-surface-dark-tonal` | `dusty-heath/600` |
| `surface-light` | `bg-surface-light` | `dusty-heath/1100` |
| `on-surface-light` | `text-on-surface-light` | `moody-moor/600` |
| `hover-lighter` | `bg-hover-lighter` | `dusty-heath/1000` @ 70% |
| `hover-darker` | `bg-hover-darker` | `dusty-heath/200` @ 8% |
| `hover-green` | `bg-hover-green` | `lowlands/500*` @ 90% |
| `error` | `bg-error` / `text-error` | `utility/500` |

## Responsive type scale (`type-size`)

The Figma `type-size` collection has two modes, `mobile` and `desktop`, each
aliasing a different `font/size` primitive per role. `display-*` and
`headline-*` differ between the two modes, so they're modeled as a fluid
`clamp()` that interpolates linearly between the mobile value at a 375px
viewport and the desktop value at a 1440px viewport (clamped flat outside that
range) — no breakpoint step. `body-*` is identical in both Figma modes, so it
stays a fixed value. `@theme inline` exposes each role as a `text-*` utility.

| Role | 375px (mobile) | 1440px (desktop) | Scaling | Tailwind class |
| --- | --- | --- | --- | --- |
| `display-lg` | 100px | 120px | fluid | `text-display-lg` |
| `display-base` | 80px | 100px | fluid | `text-display-base` |
| `display-sm` | 59px | 80px | fluid | `text-display-sm` |
| `headline-2xl` | 43px | 80px | fluid | `text-headline-2xl` |
| `headline-xl` | 44px | 59px | fluid | `text-headline-xl` |
| `headline-lg` | 32px | 44px | fluid | `text-headline-lg` |
| `headline-base` | 24px | 32px | fluid | `text-headline-base` |
| `headline-sm` | 20px | 24px | fluid | `text-headline-sm` |
| `body-large` | 20px | 20px | fixed | `text-body-large` |
| `body-base` | 16px | 16px | fixed | `text-body-base` |
| `body-small` | 14px | 14px | fixed | `text-body-small` |
| `body-xs` | 10px | 10px | fixed | `text-body-xs` |

Every `text-headline-*` utility (`2xl` down to `sm`) already `@apply`s the
shared `text-heading-base` utility in `tokens.css`, which sets
`font-family: var(--font-serif)`, `letter-spacing: -0.05em`, and
`line-height: 1.1`. Don't pair any of the following with a `text-headline-*`
class — they're already covered and just add noise:

- `font-serif` (font-family)
- `leading-[1.1]` / `leading-none` / any other `leading-*` (line-height)
- `tracking-*` (letter-spacing)
- `font-normal` (headings aren't bold by default; there's no font-weight to
  reset)

Only override one of these on a specific instance if the design genuinely
calls for a different value than `text-heading-base` provides — in that
case add just the one property that differs, not the whole set.

`text-display-*` does **not** get this treatment (only `text-display-base`
currently sets a font-family, which looks like an oversight rather than a
rule) — add `font-serif` explicitly whenever you use a `text-display-*` size.

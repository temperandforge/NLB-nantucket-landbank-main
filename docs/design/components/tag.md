# Tag

`components/Tag.tsx`

## Class naming

The component splits styling across two elements, each with its own class:

- `tag` — the outer `<div>`. Container styles: background, padding, rounding.
- `tag-label` — the inner `<span>`. Text styles: mono font, uppercase, letter-spacing, color.

`tag-label` can't just be `tag` because that name is already the outer div's
class. Two different elements with two different style sets need two
different names, so the label gets a suffix — the same pattern used by
`link-item-base` / `link-item--hover` in `css/components/link-item.css`.

## Where the styles live

`tag-label` is defined as a Tailwind v4 `@utility` in
`css/components/tag.css`, registered via `css/components/_index_.css`. Don't
re-inline its styles as ad-hoc utility classes on the `<span>` — that
duplicates what the utility already defines (see the leading-[1.1] bug fixed
in a prior commit for why this matters).

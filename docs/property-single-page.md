# Property single page — build notes

Branch: `claude/property-single-template-19e1f5`. Status: built and type-checked; not committed, no PR.
Design: [docs/superpowers/specs/2026-10-14-property-single-page-design.md](superpowers/specs/2026-10-14-property-single-page-design.md).
Figma (Nantucket - Website): desktop `1910:13211`, mobile `1910:13334`. Closes issue #23.

## What was built

Every `property` has a page at `/properties/<slug>`. It is a fixed template driven by fields (same
shape as `/projects/<slug>`), not a page builder.

Sections, top to bottom:

1. Hero image (`property.image`, falling back to the site default property image)
2. Name (H1) and property-type tags, beside the About text (heading authored) and a Directions link
3. Gallery carousel, under a tag reading "<name> Property and Recreation"
4. Interactive map (heading and intro are set on the property; heading defaults to
   "<name> Trails and Properties"; the singleton can hide the section)
5. Property FAQs
6. "More properties" (the Properties Preview markup)

Everything except the name is optional and is simply absent when missing.

## Schema (studio)

- `property` loses `link` (its address is derived from the slug) and gains:
  - `about` — rich text beside the name; any "About" heading is authored in it (Heading 2), never added by the template
  - `mapHeading`, `mapBody` — the map section's heading and intro
  - `gallery` — images with alt text and an optional hover caption
  - `faqs` — references to `faq` documents
- A new "Single" tab on the Properties Settings singleton (`projectSettings`, renamed
  from "Project Settings"; the type and document id keep their name):
  a hide-the-map switch, FAQ eyebrow/heading/description,
  and `moreProperties` (heading, button, count 1–3, hide).
- Directions is derived from the property's map marker (`location`) as a Google Maps link. No marker,
  no link.
- Studio wiring: Presentation route `/properties/:slug` and `defineLocations` for `property`
  (`studio/sanity.config.ts`), and the renamed Properties → Properties Settings entry.

## Frontend

- `app/properties/[slug]/page.tsx` — static route (wins over the catch-all), `notFound()` on an
  unknown slug, `generateStaticParams`, metadata, sitemap entries.
- `components/PropertyView.tsx` — `PropertyIntro`, `PropertyGallery`, `PropertyFaqs`.
- Extracted so the page and the page-builder blocks share one markup: `ImageCarouselSlide`,
  `MapPreviewView`, `PropertiesPreviewView` (the `ImageCarousel`, `MapPreview` and `PropertiesPreview`
  blocks now call them).
- `sanity/lib/relatedProperties.ts` — related properties: those sharing a property type first, then
  newest. Checked by `frontend/scripts/verifyRelatedProperties.mts`.
- `propertyHref(slug)` in `sanity/lib/utils.ts`. Property cards, the map popup's "Find out more" and
  search results now link to `/properties/<slug>`.
- New queries: `propertyQuery`, `morePropertiesQuery`, `propertyMapQuery`, `singlePropertyPageQuery`,
  `propertySlugs`, `propertySitemapData`. Generated types and `sanity.schema.json` are regenerated.

## Data scripts (not yet run)

Run from `studio/` by someone logged in to the Sanity CLI (`npx sanity login`); none were run here.

```bash
npx sanity exec scripts/unsetPropertyLinks.ts --with-user-token -- --dry
npx sanity exec scripts/unsetPropertyLinks.ts --with-user-token
```

- The Single tab settings are authored in Studio; there is no seed script. Nothing falls
  back to default wording, so a section's heading stays absent until it is filled in.
- `unsetPropertyLinks.ts` removes the old `link` from every property, draft and published. **It
  discards data**; read the `--dry` output first (real, non-`#` values are printed).
- `seedFeaturedProperties.ts` no longer writes `link`.

## Verification

| Check | Result |
| --- | --- |
| `npm run sanity:typegen` (frontend) | passes |
| `npm run type-check` (frontend) | passes |
| `npm run lint` (frontend) | 0 errors; 1 existing warning (unused `Script` import in `app/layout.tsx`) |
| `npx tsc --noEmit` (studio) | passes |
| `node scripts/verifyRelatedProperties.mts` | passes |
| Browser: `/properties/ladies-beach` desktop and mobile | renders, no horizontal overflow |
| Browser: unknown slug | 404 |

Not verified: the full template with real content (hero, About text, gallery, FAQs, "more
properties"). No property has that content yet and the Sanity CLI was not logged in, so nothing could
be seeded. The map did not draw in the browser check because `localhost:3100` is not an allowed CORS
origin for the Sanity dataset; that is the environment, not the code. Page routing was not re-run
with `verifyPageRouting.ts` (it needs the CLI login, and the page hierarchy was not changed).

## Deferred work

- [#59](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/59) — Directions falls
  back to the boundary centroid when a property has no map marker.
- [#60](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/60) — focus the map on
  the current property (it shows every property today).
- The gallery tag wording ("<name> Property and Recreation", the Figma copy) is hardcoded.

## Before merging

1. Commit and open a PR.
2. Run the data scripts above (dry runs first).
3. Add content to a property in Studio (`about`, `gallery`, `faqs`, a map marker) and check the page
   against both Figma frames, including in Presentation.
4. Set the "View All Properties" button link on Properties → Properties Settings → Single.

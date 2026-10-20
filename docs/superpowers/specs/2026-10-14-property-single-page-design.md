# Property single page

Status: built, content not yet authored. Figma (Nantucket - Website): desktop node `1910:13211`
("property_template_desktop"), mobile node `1910:13334` ("property_template_mobile").
Closes issue #23 (Property detail pages).

## Goal

Every `property` has a page at `/properties/<slug>`, built to the Figma template and previewable in
Presentation. Same shape as `/projects/<slug>`: a fixed template driven by fields, not a page builder.

## Template

Hero image; name (H1) and property-type tags beside the About text (its heading is authored in the content), and a Directions
link; gallery carousel; the interactive map; Property FAQs;
"more properties" (the Properties Preview markup); footer.

## Schema

- `property` loses `link` (its address is derived) and gains `about` (rich text), `mapHeading`/`mapBody`, `gallery`
  (images with alt and an optional hover caption) and `faqs` (references to `faq` documents). The hero
  is the existing `image`, falling back to the site default property image.
- A "Single" tab on the Properties Settings singleton (`projectSettings`, relabelled from
  "Project Settings"): a hide-the-map switch, FAQ
  eyebrow/heading/description, and `moreProperties` {heading, button, count 1-3, hide}.
- Directions is derived from the property's map marker (`location`) as a Google Maps link; no marker,
  no link.

## Frontend

- `app/properties/[slug]/page.tsx` (static route, wins over the catch-all; unknown slug is a 404;
  `generateStaticParams`, metadata, sitemap).
- `PropertyView.tsx` (`PropertyIntro`, `PropertyGallery`, `PropertyFaqs`); `ImageCarouselSlide`,
  `MapPreviewView` and `PropertiesPreviewView` extracted from their blocks so the page and the blocks
  share one markup. Related properties: those sharing a property type first, then newest
  (`orderRelatedProperties`, checked by `scripts/verifyRelatedProperties.mts`).
- Cards, the map popup's "Find out more", and search results link to `/properties/<slug>`.
- Studio: Presentation route `/properties/:slug`, `defineLocations` for `property`, a structure entry.

## Data (run by someone logged in to the Sanity CLI)

- `studio/scripts/unsetPropertyLinks.ts` (`--dry` first; discards each property's old `link`).
- `seedFeaturedProperties.ts` no longer writes `link`.

## Deferred

- Directions falls back to the boundary centroid when a property has no map marker (the marker
  defaults to that centroid on the map). [#59](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/59)
- ~~The map on a property page shows every property; it does not focus on the current one.~~ Done:
  the map still draws every property but opens zoomed to the current property's boundaries, one zoom
  level out from a tight fit (its marker when it has no boundary), via `focusSlug` on `MapboxMap`.
  [#60](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/60)
- The gallery eyebrow is "<name> Property and Recreation", the Figma wording, hardcoded.

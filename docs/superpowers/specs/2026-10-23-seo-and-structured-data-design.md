# SEO fields and structured data (JSON-LD) design

Status: **implemented** on branch `worktree-structured-data` (plan: [../plans/2026-10-23-seo-and-structured-data.md](../plans/2026-10-23-seo-and-structured-data.md)). Setting **Site URL** in Studio Settings is required before any canonical link, sitemap entry or JSON-LD is published.
Decisions and the plugin analysis are recorded in [DECISIONS.md](../../DECISIONS.md) section 24.

## Intent

Search engines and AI crawlers should understand what each page is, and editors should be able to
control how a page appears in search and on social cards. Success looks like:

- Every public page has a correct title, description, canonical URL and social card, with editor
  overrides where the content warrants them.
- Pages emit schema.org JSON-LD that is **derived from existing document data**, so it can never
  disagree with the visible page.
- The records archive (issue #41) is covered.
- Nothing is double-entered, and nothing is hand-typed JSON.

## Starting point (verified in the code)

- No JSON-LD anywhere.
- Metadata is hand-rolled per route (`generateMetadata` in `app/news/[slug]`, `events/[slug]`,
  `properties/[slug]`, `projects/[slug]`, `[...slug]`, `page.tsx`, `search`). Each builds its own
  title, a description sliced to 160 characters, and an OG image via `resolveOpenGraphImage`
  (`frontend/sanity/lib/utils.ts`). `[...slug]` and `/` set a title only: no description, no image.
- Root `layout.tsx` sets the title template, the site description, the OG image, and `metadataBase`.
  `metadataBase` comes from an oddly placed field, `settings.ogImage.metadataBase`.
- `sitemap.ts` builds URLs from the `host` header with no protocol.
- There is no per-document SEO field in Sanity. `settings` has `title`, `description` and
  `ogImage` only.
- `search` already sets `robots: {index: false}`.

## Scope

In: a shared `seo` object, a single metadata builder, a site URL source of truth, Organization
fields on `settings`, derived JSON-LD for the types below, sitemap and canonical fixes needed to make
URLs absolute.

Out: see Deferred.

## Design

### 1. Site URL

JSON-LD and canonical links need absolute URLs, so there must be one trusted origin.

- Add a `siteUrl` field to `settings` (a URL, required to be absolute https). `metadataBase` is read
  from it, replacing `settings.ogImage.metadataBase`. The old field is left in the data, unused,
  and removed from the schema (same approach as the `order` number in DECISIONS 23).
- A helper `getSiteUrl()` returns it, falling back to `NEXT_PUBLIC_SITE_URL`, then to nothing.
  **With no origin, JSON-LD is omitted rather than emitted with relative URLs.** It degrades, never
  throws.
- `sitemap.ts` switches to the same helper, which also fixes its missing `https://`.

### 2. The `seo` object (studio)

One new object type, `seo`, in `studio/src/schemaTypes/objects/seo.ts`, added as an optional field
(group "SEO") on `page`, `article`, `event`, `property` and `project`:

| Field | Type | Behaviour |
| --- | --- | --- |
| `title` | string | Overrides the page title. Soft warning past 60 characters. |
| `description` | text | Overrides the derived description. Soft warning past 160. |
| `image` | image with required alt | Overrides the document image for the social card. |
| `noIndex` | boolean | Emits `robots: noindex`, and drops the page from the sitemap. |

Everything is optional; an empty `seo` changes nothing. The same object is added to `settings` as
the site-wide default, replacing `ogImage` as the fallback image (the existing `ogImage` stays until
migrated; see Migration).

Canonical URL is **not** an editable field. It is derived from the document's own address (for pages,
the `pagePath` chain), so an editor cannot point it at the wrong place.

### 3. One metadata builder (frontend)

`frontend/sanity/lib/seo.ts` exports `buildMetadata({seo, fallback, path, settings})` returning a
Next `Metadata`. Precedence for each field: `seo` override, then the route's derived value (name,
plain-text description, document image), then the site default from `settings`. It always sets
`alternates.canonical` (from `path` and the site URL), `openGraph` (`title`, `description`, `url`,
`siteName`, `type`, `images`) and a `twitter` card, and `robots` from `noIndex`.

Every route's `generateMetadata` becomes a short call to it. `[...slug]` and `/` gain a description
and image for the first time. `search` keeps `index: false` by passing `noIndex`.

### 4. JSON-LD, derived at render

A typed module `frontend/sanity/lib/structuredData.ts` with one pure builder per type, each taking
the document the page already fetched (so no extra query where the data is present) and the site
URL, and returning a plain object or `null` when the required data is missing. A small
`<JsonLd data={...} />` server component renders the script tag, escaping `<` as `<` as the
Next.js guide requires (`node_modules/next/dist/docs/01-app/02-guides/json-ld.md`). It accepts a
list and skips `null`s, so a route can pass several graphs.

| Page | Types emitted | Source fields |
| --- | --- | --- |
| Every page (root layout) | `Organization` (as `GovernmentOrganization`-compatible `Organization`) and `WebSite` | `settings` org fields, `siteUrl`, `title` |
| `/news/<slug>` | `NewsArticle` | `title`, `date` as `datePublished`, image, body text for `description`, the Organization as `publisher` |
| `/events/<slug>` | `Event` | `start`, `end`, `location` as `Place`, image, description. Event time zone is America/New_York; serialise with the offset. |
| `/properties/<slug>` | `Place` | `name`, `description`, `image`, `location` geopoint as `GeoCoordinates` when present. The property taxonomy is not mapped to a schema.org type. |
| `/projects/<slug>` | `WebPage` with `about` pointing at the referenced property's `Place` when there is one | `name`, `description`, `image`, `property` |
| Any nested page | `BreadcrumbList` | the `parent` chain; a `pathOnly` ancestor contributes a crumb with no `item` URL, since it has no page |
| Page containing `recordsArchive` | `CollectionPage` with `ItemList` of `DigitalDocument` | per #41, below |
| Landing page | `WebPage` | name, description |

**Records archive (issue #41)**, folded in:
- Built from the block's full `records` array, not the DOM, because the category filter is
  client-side and the server render only holds the default category.
- The canonical URL has no filter query parameters.
- `name` reuses the row label fallback: title, then date, then file name. `dateCreated` carries
  `record.date` (the document date, not a publication date). Omit it when blank.
- `contentUrl` is the file URL; `encodingFormat` and `contentSize` need `file.asset->mimeType` and
  `size` added to the `recordsArchive` query projection.

**Organization data** lives on `settings` as an `organization` group: `legalName`, `logo` (image
with alt), `email`, `telephone`, `address` (street, locality, region, postal code), and `sameAs`
(array of URLs; reuses the `socialLink` shape if it fits, otherwise a plain URL array). All
optional; missing parts are omitted. If there is no `siteUrl`, no Organization is emitted.

**Rules every builder follows:** omit a property rather than emit an empty one; never invent a value
(no placeholder URLs, per the Placeholders rule); strip stega with `stega: false` on the fetch used
for structured data; unpublished or draft-only references resolve to nothing and are skipped.

### 5. Studio affordances

Plain validation and descriptions only (length hints on `title`/`description`, alt required on the
image). No custom preview component in this work.

### 6. Generated files and verification

Schema changes require `npm run sanity:typegen` in `frontend`, with the generated files committed.
Props come from the generated query result types. There is no test framework, so verification is:
- `sanity:typegen`, `type-check`, `lint` in `frontend`, `npx tsc --noEmit` in `studio`.
- A script, `studio/scripts/verifyStructuredData.ts`, in the style of `verifyPageRouting.ts`: for
  one published document of each covered type it runs the real builders against live data and
  checks required properties and absolute URLs. It imports the builders rather than restating them.
- In the browser: view source on each route type and validate the JSON-LD with Google's Rich Results
  Test and the Schema.org validator (manual, since both need a public URL).

### Migration

- Existing documents have no `seo`, which is a valid state; nothing needs seeding for the pages to
  work.
- `settings.ogImage` keeps working as the site default image until `settings.seo.image` is set, then
  the builder prefers the latter. A small `--dry`-capable script copies `ogImage` to
  `seo.image` and `ogImage.metadataBase` to `siteUrl` once; it states in its header exactly what it
  overwrites (only those two empty fields, never existing values).

## Deferred (each has a GitHub issue)

- Per-document **hreflang / alternates**, **hand-authored JSON-LD** for edge cases and **Search
  Console** integration: [#80](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/80).
- **Rich Studio SEO preview** (Google/social preview panes) and SEO audit dashboard, possibly the
  plugin for its UI only (DECISIONS 24.1): [#79](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/79).
- **`FAQPage` structured data** for the FAQ accordion. Google restricts FAQ rich results to
  government and health sites, which this site is, so it may be eligible; confirm before building:
  [#77](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/77).
- **`JobPosting`** for job listings: needs fields the `job` document does not hold (employment type,
  valid-through, location structure): [#78](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/78).
- **`GovernmentOrganization` precision** (department hierarchy, `areaServed`): start with
  `Organization`: [#81](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/81).

## Open questions for review

1. Is the Land Bank best described as `Organization`, or `GovernmentOrganization`? Current draft uses
   `Organization` with a note to revisit.
2. Should a property carry `Place` only, or also `RealEstateListing`? Draft says `Place` only, since
   these are conserved lands, not listings.
3. Production origin: confirm the canonical hostname that goes in `siteUrl`.

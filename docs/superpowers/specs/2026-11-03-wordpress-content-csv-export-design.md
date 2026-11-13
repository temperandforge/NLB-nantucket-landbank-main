# WordPress content export to CSV

Status: draft for review. Source: the live site, https://www.nantucketlandbank.org/.

## Goal

Produce CSVs of the old WordPress site's content so the client can decide what to keep, drop, merge
or redirect, and so a later import into Sanity has a reviewed, structured source. This slice writes
CSVs only. It writes nothing to Sanity.

## Source and its limits

The live site is the source because its content may have changed since any local copy was made.

**Drafts, private, scheduled and trashed content are not available from the live site, and neither
is anything not listed in the Yoast sitemaps** (noindex content, password-protected pages, content
that exists only in the WordPress admin). The export is the *published* site, and it says so: every
run writes a `README.md` beside the CSVs stating the run date, the source and this limitation. If
the client needs unpublished content, that is a separate export from the WordPress admin.

The sitemap index (`/sitemap.xml`) lists four child sitemaps: posts (72), pages (68), properties
(42, custom post type `property`) and categories (4), about 186 URLs on 2026-11-03.

## Outputs

All under `studio/scripts/wordpress/out/`, committed to the repo for now.

| File | One row per | Purpose |
|---|---|---|
| `inventory.csv` | URL in the sitemaps | Client triage: keep / drop / merge / redirect |
| `articles.csv` | post | Content for `article` |
| `properties.csv` | `/property/*` | Content for `property` |
| `pages.csv` | page | Content for `page` |
| `records.csv` | linked PDF/document | Content for `record` (minutes, agendas, reports, notices, forms) |
| `projects.csv` | `/about/projects/*` child | Content for `project` |
| `events.csv` | event page or post | Content for `event` (picnic day, cross-island hikes) |
| `jobs.csv` | job listing | Content for `job` (`/about/employment/`) |
| `taxonomies.csv` | category, tag, property type or amenity | Content for `propertyType` / `resource`; settle first, a slug is the stable key |
| `links.csv` | link in exported content | Link graph for rewriting old URLs at import |
| `media.csv` | image or file | Audit of media and metadata gaps |
| `redirects_existing.csv` | rule on the old site | Redirects already in place, if a redirect plugin exposes them |
| `README.md` | run | Date, source, limits, column glossary |

FAQs and people already have extract/import scripts in `studio/scripts/wordpress/`; they are not
re-exported. Those scripts read a local WordPress copy, which may be stale against the live site, so
the README notes this and `verifyScrape.mts` diffs their output against the live pages.

### `inventory.csv`

Scraped: `url`, `wp_type`, `wp_id`, `title`, `modified`, `parent_url`, `categories`, `word_count`,
`inbound_links`, `images_total`, `images_missing_alt`, `suggested_sanity_type`,
`suggested_new_path` (a proposal under the new page hierarchy, for the client to correct), `seo_title`,
`seo_description`, `seo_og_image`, `seo_noindex` (Yoast values, mapping to the `seo` object), `flags`.

`flags` is a semicolon list: `numeric-slug`, `near-empty`, `duplicate-title`, `no-excerpt`,
`no-meta-description`, `broken-links`, `redirects-elsewhere`, `not-in-sitemap` (found by the
navigation crawl only), `orphan` (in the sitemap but linked from nowhere), `embeds:<kinds>` (see
Embedded content), `language:es`.

Client-filled (left blank): `disposition` (`keep` / `drop` / `merge` / `redirect`), `redirect_to`,
`notes`. Later importers read only `keep` rows. `drop`, `merge` and `redirect` rows feed the
existing redirects system (see 2026-10-23-redirects-design.md). Nothing is filtered out at scrape
time.

### Content CSVs

Columns use the target schema's field names where one exists, plus `source_url`, `wp_id` and
`flags`. Body content is **cleaned HTML in a cell**, not Portable Text: it is reviewable by the
client and converted at import time. Cleaning removes inline styles, empty elements and WordPress
block comments, and keeps headings, lists, links, tables and image tags. The raw `content.rendered`
is not stored.

A page that is mostly a document list (agendas, minutes, annual reports) contributes its links to
`records.csv` and its prose to `pages.csv`.

Posts also carry `author`, `published`, `featured_image_url` and `image_credit` (taken from the
caption when it has one). Events and jobs follow the `event` and `job` schemas.

### `properties.csv`

Geometry, coordinates and `boundaryIds` are **not** exported. They come from the boundary file
uploaded to `projectSettings.boundaryData`, and `generatePropertiesFromBoundaries.ts` already creates
one draft `property` per distinct `Name` in it. Matching old property pages to those drafts is manual.
This CSV makes that matching easy.

- `name` and `slug` are the match key. The generator skips a name whose slug already has a property,
  so a clean slug match avoids duplicates.
- Facts that are not in the boundary file are scraped when the page has them: acreage, address, hours,
  amenities, accessibility and trail notes.
- `boundary_name_match` and `match_confidence` are left blank, filled by a later comparison against
  the boundary file.
- `flags` adds `no-boundary-match` (old page with no counterpart in the file, such as a golf course or
  rain garden), `no-old-page` (boundary name with no old page) and `many-to-one` (several parcels,
  one page). The last three only appear after the comparison, which is not part of this slice.

### Embedded content

Embeds do not survive an HTML export, so a page that has one is flagged instead of losing it
silently. The kinds detected: `soliloquy` (slider, becomes `imageCarousel`), `iframe`, `youtube`,
`constantcontact`, `shortcode` (any unrendered `[...]`), `form`. The raw embed source is kept in an
`embeds` column.

### Existing redirects

If a redirect plugin's rules are exposed (or `/wp-json/redirection/v1/` is reachable), they go to
`redirects_existing.csv`: source, target, type, hits. If not, the file is written with only its
header and the README says so. Combined with the dispositions, these feed the existing redirects.

### `media.csv`

One row per distinct image or file referenced from any exported content, plus library items not
referenced anywhere.

Scraped: `url`, `wp_media_id`, `filename`, `mime`, `width`, `height`, `file_size_bytes`,
`used_on` (semicolon list of source URLs), `alt_media_library`, `alt_in_content`, `caption`,
`title`.

Checks: `alt_missing` (empty, or equal to the filename), `alt_conflict` (library and in-content
alt disagree), `caption_missing`, `title_missing`, `broken` (non-2xx), `low_resolution`,
`oversized`, `duplicate_of` (same content hash), `unused`.

Client-filled: `alt_text_proposed`, `disposition`.

Alt text is **not generated**. The export flags gaps; writing the text is an editorial decision.

Content CSVs also flag fields the Sanity schema requires that the old site lacks (for example a
property with no image or description), in `flags`.

## Method

A re-runnable Node script, `studio/scripts/wordpress/scrapeSite.ts`, run with `npx tsx` (not a
Sanity script; it never touches the dataset).

1. Read `/sitemap.xml` and its children for the URL list and `lastmod`.
2. Prefer the WordPress REST API (`/wp-json/wp/v2/posts|pages|property|media`) for structured
   fields. Custom post type and ACF fields are only present if exposed; where the API is blocked or
   omits fields, fall back to parsing the page HTML.
3. Resolve parent/child from the API or the URL path; do not trust slugs alone (see page URL rules
   in AGENTS.md).
4. Download nothing. `media.csv` records URLs and probes them with HEAD requests. Committing the
   files themselves is the import step, since the URLs may not outlive the old site.
5. Fetch politely: low concurrency, a delay between requests, a descriptive User-Agent, honouring
   429/5xx with backoff.
6. Crawl the primary navigation and footer, and diff the result against the sitemap. Anything
   reachable but not in a sitemap, or in a sitemap but linked from nowhere, is flagged. The three
   homepage pillar links (`/conservation/`, `/recreation/`, `/agriculture/`) are the known case.
   External links (ACKTrails, Constant Contact, social) are recorded, not followed.
7. Write CSVs deterministically (stable sort, fixed column order) so re-runs diff cleanly.

Parsing and the flag rules are pure functions in `studio/scripts/wordpress/lib/`, with a
`verifyScrape.mts` check beside them in the style of `verifyPeopleTransform.mts`, run against saved
HTML fixtures (the project has no test framework).

## Out of scope

- Importing anything into Sanity.
- Converting HTML to Portable Text.
- Downloading or uploading media.
- Drafts and unpublished content (see Source and its limits).
- Redirect generation from the dispositions: it consumes the filled-in inventory later.
- Boundary geometry, and the comparison that matches old property pages to boundary names.
- Newsletter archive and press archive content hosted off-site (Constant Contact, external links);
  they appear in `inventory.csv` as links only.

Each item above that is deferred gets a GitHub issue when this is built, per AGENTS.md.

## Open questions

- Whether the REST API is open on the live site. If not, the HTML fallback carries more weight and
  property fields (hours, amenities, accessibility) will need per-template selectors.
- Pages `/1352-2/`, `/1472-2/`, `/1475-2/` and posts `/1695-2/`, `/1911-2/`, `/2317-2/` look like
  legacy duplicates. They are exported and flagged, not dropped.

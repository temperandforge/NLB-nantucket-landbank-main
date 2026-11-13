# WordPress content export to CSV Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A re-runnable script that reads the live Nantucket Land Bank WordPress site and writes the inventory, content, link, media and redirect CSVs the spec lists, into the repo.

**Architecture:** One orchestrator, `scrapeSite.ts`, over small pure modules in `studio/scripts/wordpress/lib/` (CSV, HTML cleaning, flag rules, row builders) and two I/O modules (polite fetch, WordPress REST client). Pure modules are checked by `verifyScrape.mts` against saved HTML fixtures, in the style of `verifyPeopleTransform.mts`. The scraper never touches Sanity.

**Tech Stack:** Node (type stripping, run as `node file.ts`/`.mts`, imports carry the `.ts` extension, no `tsx`), built-in `fetch`, `cheerio` as the one new dev dependency in `studio` for HTML parsing.

**Spec:** [docs/superpowers/specs/2026-11-03-wordpress-content-csv-export-design.md](../specs/2026-11-03-wordpress-content-csv-export-design.md)

## Global Constraints

- Source is the live site, `https://www.nantucketlandbank.org`; published content only. Every run writes `out/README.md` stating the run date, the source, and that drafts, private, scheduled, trashed and non-sitemap content are not included.
- Outputs go to `studio/scripts/wordpress/out/` and are committed. Files: `inventory.csv`, `articles.csv`, `properties.csv`, `pages.csv`, `records.csv`, `projects.csv`, `events.csv`, `jobs.csv`, `taxonomies.csv`, `links.csv`, `media.csv`, `redirects_existing.csv`, `README.md`.
- The scraper writes nothing to Sanity and downloads no media (HEAD probes only).
- Body content is cleaned HTML in a cell, not Portable Text. The raw `content.rendered` is not stored.
- Alt text is never generated. Client-filled columns (`disposition`, `redirect_to`, `notes`, `alt_text_proposed`) are written blank.
- `disposition` values: `keep` / `drop` / `merge` / `redirect`. Nothing is filtered at scrape time.
- Geometry, coordinates and `boundaryIds` are not exported. `properties.csv` carries `name` and `slug` as the match key; `boundary_name_match` and `match_confidence` are written blank.
- Polite fetching: low concurrency (max 2), a delay between requests, a descriptive User-Agent, backoff on 429/5xx.
- CSV output is deterministic: stable row sort, fixed column order, so re-runs diff cleanly.
- No test framework exists; verification is `node scripts/wordpress/verifyScrape.mts` (exits non-zero on failure) plus the repo checks in AGENTS.md (`npx tsc --noEmit` in `studio`).
- Every deferred item gets a GitHub issue (AGENTS.md), searched for duplicates first.

## Review Focus

1. A cell containing a comma, double quote, newline or non-ASCII character (curly quotes, `&nbsp;`) round-trips through the CSV writer intact.
2. WordPress resized copies (`photo-300x200.jpg`, `photo-scaled.jpg`) collapse to one media row for the original, not one row per size.
3. Links that are relative, protocol-relative, `mailto:`, `tel:`, `#fragment`, or differ only by a trailing slash or `http`/`https` resolve to one canonical URL or are classed as non-page, and never land in `links.csv` as distinct targets.
4. A page with an empty title, an empty body, or no featured image yields a row with flags, not a crash; one failing URL does not abort the run.
5. A child sitemap that 404s, a REST endpoint that is blocked (401/403), or a `lastmod` that is missing: the run falls back or records the gap in the README and continues.

---

## File structure

All under `studio/scripts/wordpress/` (existing home of the FAQ and people scripts).

| File | Responsibility |
|---|---|
| `scrapeSite.ts` | Orchestrator: fetch, build rows, write CSVs and README. No parsing logic. |
| `lib/csv.ts` | `toCsv`, deterministic CSV encoding. Pure. |
| `lib/fetchPolite.ts` | Throttled, retrying `fetch` wrapper. I/O. |
| `lib/sitemap.ts` | Parse sitemap index and URL sets. Pure. |
| `lib/wpApi.ts` | REST client for posts, pages, `property`, media, taxonomies. I/O. |
| `lib/html.ts` | `cleanHtml`, `detectEmbeds`, `extractImages`, `extractLinks`, `canonicalUrl`. Pure. |
| `lib/flags.ts` | Flag rules for inventory and content rows. Pure. |
| `lib/media.ts` | Group, normalise, probe and audit media. Pure core plus a probe function. |
| `lib/rows.ts` | Per-type row builders. Pure. |
| `lib/crawl.ts` | Navigation/footer crawl and diff against the sitemap. |
| `fixtures/scrape/*.html, *.json, *.xml` | Saved live responses used by the check. |
| `verifyScrape.mts` | The check script. |
| `out/` | Committed CSVs. |

---

### Task 1: CSV writer, polite fetch, check scaffold

**Files:**
- Create: `studio/scripts/wordpress/lib/csv.ts`, `lib/fetchPolite.ts`, `verifyScrape.mts`
- Modify: `studio/package.json` (add `cheerio` to devDependencies via `npm install -D cheerio` in `studio`)

**Interfaces:**
- Produces: `toCsv(columns: string[], rows: Array<Record<string, string | number | boolean | null | undefined>>): string` (header row, RFC 4180 quoting, `\n` line endings, `null`/`undefined` as empty, booleans as `true`/`false`, no BOM). `fetchPolite(url: string, init?: RequestInit): Promise<Response>` (max 2 in flight, 250 ms minimum gap, `User-Agent: NLB-content-export (jesse@temperandforge.com)`, retries 429 and 5xx up to 4 times with exponential backoff, honours `Retry-After`).
- Produces: the `same()` helper pattern copied from `verifyPeopleTransform.mts`, and the exit-non-zero convention.

- [ ] **Step 1: Write the failing checks in `verifyScrape.mts`** — assert `toCsv(['a','b'], [{a:'x,y', b:'say "hi"\nthere'}])` equals `a,b\n"x,y","say ""hi""\nthere"\n`; assert `null`, `undefined` and `false` cells; assert `’` and a non-breaking space survive unchanged; assert column order follows `columns` not object key order.
- [ ] **Step 2: Run `cd studio && node scripts/wordpress/verifyScrape.mts`**, expect failure (module missing).
- [ ] **Step 3: Implement `toCsv` in `lib/csv.ts`.**
- [ ] **Step 4: Implement `fetchPolite` in `lib/fetchPolite.ts`.** A check with an injected fake `fetch` (accept an optional `fetchImpl` parameter) asserts it retries a 429 once then returns the 200, and gives up after 4 retries by returning the last response.
- [ ] **Step 5: Run the check; expect all `ok`.**
- [ ] **Step 6: Commit** `feat(wordpress): CSV writer and polite fetch for the content export`.

### Task 2: Sitemap parsing and fixtures

**Files:**
- Create: `lib/sitemap.ts`, `fixtures/scrape/sitemap.xml`, `fixtures/scrape/post-sitemap.xml`, `fixtures/scrape/page-sitemap.xml`
- Modify: `verifyScrape.mts`

**Interfaces:**
- Consumes: `fetchPolite`.
- Produces: `type SitemapEntry = {url: string; lastmod: string | null; source: 'post' | 'page' | 'property' | 'category'}`; `parseSitemapIndex(xml: string): string[]` (child sitemap URLs); `parseUrlSet(xml: string, source: SitemapEntry['source']): SitemapEntry[]`; `fetchSitemapEntries(origin: string): Promise<{entries: SitemapEntry[]; gaps: string[]}>` where `gaps` lists any child sitemap that failed (feeds the README).

- [ ] **Step 1: Save fixtures** by fetching `/sitemap.xml`, `/post-sitemap.xml` and `/page-sitemap.xml` from the live site into `fixtures/scrape/` (one-off `curl`, not part of the scraper).
- [ ] **Step 2: Write the failing checks:** the index fixture yields exactly the four child URLs; the post fixture yields 72 entries with `source: 'post'`; the page fixture yields 68; an entry with no `<lastmod>` gets `lastmod: null`.
- [ ] **Step 3: Run; expect failure.**
- [ ] **Step 4: Implement** `lib/sitemap.ts`, parsing `<loc>`/`<lastmod>` with cheerio in XML mode. `fetchSitemapEntries` records a child that is not 2xx in `gaps` and carries on (Review Focus 5).
- [ ] **Step 5: Run; expect `ok`.**
- [ ] **Step 6: Commit** `feat(wordpress): sitemap parsing for the content export`.

### Task 3: HTML cleaning, embeds, images, links

**Files:**
- Create: `lib/html.ts`, `fixtures/scrape/page-with-slider.html`, `fixtures/scrape/property-page.html`, `fixtures/scrape/post.html`
- Modify: `verifyScrape.mts`

**Interfaces:**
- Produces:
  - `canonicalUrl(href: string, base: string): string | null` returns an absolute `https://www.nantucketlandbank.org/...` URL with no fragment and a trailing slash on paths, `http` upgraded to `https`, `www` normalised; returns `null` for `mailto:`, `tel:`, `javascript:` and empty `#`.
  - `cleanHtml(html: string): string` removes inline `style`, `class`, `id`, `data-*`, empty elements and `<!-- wp:... -->` comments; keeps headings, lists, links, tables and `<img>` with `src`/`alt`; collapses whitespace.
  - `type Embed = {kind: 'soliloquy' | 'iframe' | 'youtube' | 'constantcontact' | 'shortcode' | 'form'; source: string}`; `detectEmbeds(html: string): Embed[]`.
  - `type ImageRef = {src: string; alt: string | null; caption: string | null}`; `extractImages(html: string, base: string): ImageRef[]` (`alt: null` when the attribute is absent, `''` when present and empty).
  - `type LinkRef = {target: string; text: string; kind: 'page' | 'file' | 'external'}`; `extractLinks(html: string, base: string): LinkRef[]`.

- [ ] **Step 1: Save three live pages** as fixtures (a page with a Soliloquy slider, a property page, a post with an image caption).
- [ ] **Step 2: Write the failing checks.** `canonicalUrl('/about/policies', base)`, `'/about/policies/#x'`, `'http://nantucketlandbank.org/about/policies/'` and `'//www.nantucketlandbank.org/about/policies/'` all equal `https://www.nantucketlandbank.org/about/policies/`; `mailto:` and `tel:` give `null`. `cleanHtml` strips `style="..."` and a `<!-- wp:paragraph -->` comment but keeps a link and a table. `detectEmbeds` finds `soliloquy` in the slider fixture and an unrendered `[gallery ids="1,2"]` as `shortcode`. `extractImages` returns `alt: null` for a missing attribute and `''` for an empty one. `extractLinks` classes `.pdf` as `file` and a different host as `external`.
- [ ] **Step 3: Run; expect failure.**
- [ ] **Step 4: Implement** `lib/html.ts` with cheerio.
- [ ] **Step 5: Run; expect `ok`.**
- [ ] **Step 6: Commit** `feat(wordpress): HTML cleaning and extraction for the content export`.

### Task 4: Media grouping and audit

**Files:**
- Create: `lib/media.ts`
- Modify: `verifyScrape.mts`

**Interfaces:**
- Consumes: `ImageRef` from Task 3.
- Produces:
  - `originalMediaUrl(url: string): string` strips WordPress size suffixes (`-300x200`, `-scaled`, `-e1234567`) so resized copies group under the original (Review Focus 2).
  - `type MediaRow` with the columns from the spec's `media.csv` (`url`, `wp_media_id`, `filename`, `mime`, `width`, `height`, `file_size_bytes`, `used_on`, `alt_media_library`, `alt_in_content`, `caption`, `title`, `alt_missing`, `alt_conflict`, `caption_missing`, `title_missing`, `broken`, `low_resolution`, `oversized`, `duplicate_of`, `unused`, `alt_text_proposed`, `disposition`).
  - `buildMediaRows(input: {library: LibraryMedia[]; usages: Array<{page: string; image: ImageRef}>; probes: Map<string, Probe>}): MediaRow[]`, where `Probe = {status: number; bytes: number | null; mime: string | null; hash: string | null}`.
  - `isAltMissing(alt: string | null, filename: string): boolean` is true for `null`, whitespace only, or equal to the filename with or without extension.
  - `probeMedia(urls: string[]): Promise<Map<string, Probe>>` does HEAD requests through `fetchPolite`; `hash` is the response `ETag` or `Content-MD5` when present, else `null` (no downloads).
  - Thresholds as named constants: `LOW_RESOLUTION_MAX_WIDTH = 800`, `OVERSIZED_BYTES = 3_000_000`.

- [ ] **Step 1: Write the failing checks:** `originalMediaUrl` maps `.../photo-300x200.jpg`, `.../photo-scaled.jpg` and `.../photo.jpg` to one URL; `isAltMissing` for `null`, `'  '`, `'IMG_1234'` against `IMG_1234.jpg`, and not for `'Stump Pond at dawn'`; two usages with different in-content alt vs library alt set `alt_conflict`; a library item with no usage sets `unused`; a probe with status 404 sets `broken`; two URLs with the same hash set `duplicate_of` on the second (stable order by URL).
- [ ] **Step 2: Run; expect failure.**
- [ ] **Step 3: Implement** `lib/media.ts`.
- [ ] **Step 4: Run; expect `ok`.**
- [ ] **Step 5: Commit** `feat(wordpress): media grouping and metadata audit for the content export`.

### Task 5: Flag rules and row builders

**Files:**
- Create: `lib/flags.ts`, `lib/rows.ts`, `lib/wpApi.ts`
- Modify: `verifyScrape.mts`, `fixtures/scrape/` (add a `wp-post.json`, `wp-property.json`, `wp-page.json` saved from the live REST API, or from HTML if the API is blocked)

**Interfaces:**
- Consumes: Task 3 and Task 4 interfaces.
- Produces:
  - `wpApi.ts`: `type WpItem = {id: number; type: string; link: string; slug: string; parent: number; title: string; modified: string; excerpt: string; contentHtml: string; featuredMediaId: number | null; author: string | null; categories: number[]; seo: {title: string; description: string; ogImage: string; noindex: boolean} | null}`; `fetchWpItems(origin: string, type: 'posts' | 'pages' | 'property'): Promise<{items: WpItem[]; blocked: boolean}>` (`blocked: true` on 401/403/404 of the endpoint, so the orchestrator falls back to HTML); `fetchWpMedia(origin: string): Promise<LibraryMedia[]>`; `fetchWpTaxonomies(origin: string): Promise<WpTerm[]>`.
  - `flags.ts`: `inventoryFlags(input: {url: string; wordCount: number; titleCount: number; hasExcerpt: boolean; hasMetaDescription: boolean; embeds: Embed[]; brokenLinks: number; inSitemap: boolean; inboundLinks: number; language: string}): string[]` returning the spec's flag list in a fixed order, e.g. `numeric-slug` for a last segment matching `/^\d+(-\d+)?$/`, `near-empty` under 30 words, `orphan` when in the sitemap with zero inbound links, `embeds:soliloquy+iframe`.
  - `rows.ts`: one pure builder per CSV, each `(item: WpItem, ctx: BuildContext) => Row`: `inventoryRow`, `articleRow`, `propertyRow`, `pageRow`, `projectRow`, `eventRow`, `jobRow`, `taxonomyRow`, `recordRows` (returns `Row[]`, one per linked document), plus exported column lists `INVENTORY_COLUMNS`, `ARTICLE_COLUMNS`, … each a `const` tuple. `suggestedSanityType(item: WpItem): 'article' | 'property' | 'page' | 'project' | 'event' | 'job' | 'record' | 'taxonomy' | 'unknown'` decides from post type and path (`/about/projects/*` is `project`, `/about/employment/` is `job`, cross-island hike and family picnic pages are `event`, `/about/agendas|meeting-minutes|annual-reports/*` produce `record` rows). `suggested_new_path` mirrors the old path with `/about/` kept, as a proposal only.

- [ ] **Step 1: Save REST fixtures** for one post, one property and one page.
- [ ] **Step 2: Write the failing checks:** `inventoryFlags` for `/1352-2/` includes `numeric-slug`; a 12-word body gives `near-empty`; a slider fixture gives `embeds:soliloquy`; `propertyRow` for the property fixture has `slug`, `name`, blank `boundary_name_match` and `match_confidence`, and `flags` contains `no-image` when `featuredMediaId` is null; `articleRow` with empty title and empty body returns a row with `flags` containing `no-title` and `near-empty` and does not throw (Review Focus 4); `suggestedSanityType` for `/about/projects/bike-park-project/` is `project`; `recordRows` for an agendas page with two PDF links returns two rows with `year` parsed from the link text or filename and `file_url` set.
- [ ] **Step 3: Run; expect failure.**
- [ ] **Step 4: Implement** `flags.ts`, `rows.ts`, `wpApi.ts`. Row builders use `cleanHtml` for `body_html` and `detectEmbeds` for the `embeds` column.
- [ ] **Step 5: Run; expect `ok`.**
- [ ] **Step 6: Commit** `feat(wordpress): content rows and flag rules for the content export`.

### Task 6: Navigation crawl, link graph, existing redirects

**Files:**
- Create: `lib/crawl.ts`
- Modify: `verifyScrape.mts`, `fixtures/scrape/home.html`

**Interfaces:**
- Consumes: `extractLinks`, `canonicalUrl`, `fetchPolite`.
- Produces:
  - `navUrls(homeHtml: string, base: string): string[]` returns the canonical internal URLs from the header navigation and footer, sorted.
  - `diffNavAgainstSitemap(nav: string[], sitemap: string[]): {notInSitemap: string[]; orphans: string[]}` where `orphans` are sitemap URLs reachable from no link in `linkGraph`.
  - `buildLinkGraph(pages: Array<{url: string; html: string}>): LinkEdge[]` with `LinkEdge = {source: string; target: string; text: string; kind: 'page' | 'file' | 'external'}`; `inboundCounts(edges: LinkEdge[]): Map<string, number>`.
  - `fetchExistingRedirects(origin: string): Promise<{rows: Array<{source: string; target: string; type: string; hits: number | null}>; note: string}>` tries `/wp-json/redirection/v1/redirect` and returns `rows: []` plus a `note` explaining why when unreachable.

- [ ] **Step 1: Save the live homepage** as `fixtures/scrape/home.html`.
- [ ] **Step 2: Write the failing checks:** `navUrls` on the fixture includes `/about/policies/` and `/request-a-map/` and excludes `https://acktrails.com/`; `diffNavAgainstSitemap` returns `/conservation/` in `notInSitemap` given the fixture and the page sitemap; two pages linking the same target via `/x`, `/x/` and `http://nantucketlandbank.org/x` produce edges with one target (Review Focus 3); `inboundCounts` counts it as 2.
- [ ] **Step 3: Run; expect failure.**
- [ ] **Step 4: Implement** `lib/crawl.ts`.
- [ ] **Step 5: Run; expect `ok`.**
- [ ] **Step 6: Commit** `feat(wordpress): navigation crawl and link graph for the content export`.

### Task 7: Orchestrator and README

**Files:**
- Create: `scrapeSite.ts`, `lib/readme.ts`
- Modify: `studio/.gitignore` only if `out/` is ignored (it must not be); `verifyScrape.mts`

**Interfaces:**
- Consumes: everything above.
- Produces: `node scripts/wordpress/scrapeSite.ts [--limit N] [--out DIR]` where `--limit` processes only the first N sitemap entries (for a smoke run) and `--out` overrides the output directory; `renderReadme(input: {runDate: string; origin: string; counts: Record<string, number>; gaps: string[]; apiBlocked: boolean; notes: string[]}): string`.

- [ ] **Step 1: Write the failing check for `renderReadme`:** the output contains the run date, the origin, the sentence that drafts and unpublished content are not included, every entry of `gaps`, and the note that FAQs and people come from the existing scripts and may be stale.
- [ ] **Step 2: Run; expect failure.**
- [ ] **Step 3: Implement `renderReadme`** (column glossary generated from the exported `*_COLUMNS` constants so it cannot drift).
- [ ] **Step 4: Implement `scrapeSite.ts`** wiring: sitemap entries, then `fetchWpItems` per type (HTML fallback per URL when `blocked` or an item is missing), then rows, links, media probing and audit, redirects, and writing each CSV with `toCsv`. A failing URL is recorded in `gaps` and skipped; the run never aborts on one item (Review Focus 4, 5). Inbound counts and `orphan`/`not-in-sitemap` flags are computed after the link graph, then merged into inventory rows.
- [ ] **Step 5: Run the check; expect `ok`.**
- [ ] **Step 6: Smoke run:** `cd studio && node scripts/wordpress/scrapeSite.ts --limit 10 --out <a scratch directory outside the repo>`. Expect all CSVs written with headers, a README, and exit code 0.
- [ ] **Step 7: Commit** `feat(wordpress): scrape orchestrator and README for the content export`.

### Task 8: Full run, review and deferred work

**Files:**
- Create: `studio/scripts/wordpress/out/*`
- Modify: the spec's open-questions section (record the answers: is the REST API open, are the numeric-slug items duplicates), `docs/DECISIONS.md` if a durable decision came out of the run

- [ ] **Step 1: Run the full export:** `cd studio && node scripts/wordpress/scrapeSite.ts`. Expect 13 files in `out/`, and the row counts in the README to match the sitemap (about 72 posts, 68 pages, 42 properties, 4 categories).
- [ ] **Step 2: Spot-check against the live site:** open five rows per CSV in the browser (a post, a property, a nested page, an agenda PDF, a page with a slider) and confirm title, slug, body text and flags match; confirm a page with a known missing alt shows `alt_missing` in `media.csv`.
- [ ] **Step 3: Confirm determinism:** run again to a scratch directory and `diff -r` against `out/`; expect no differences other than the README run date.
- [ ] **Step 4: Run `cd studio && npx tsc --noEmit` and `node scripts/wordpress/verifyScrape.mts`;** expect both clean.
- [ ] **Step 5: Open GitHub issues** (after `gh issue list --search` for each): importing the reviewed CSVs into Sanity; HTML to Portable Text conversion; matching old properties to boundary names; media download and upload; generating redirects from the filled-in dispositions; a separate export of drafts and unpublished content from the WordPress admin. Link each from the spec's out-of-scope section.
- [ ] **Step 6: Commit** the CSVs, spec edits and issue links: `docs(wordpress): live-site content export CSVs`.

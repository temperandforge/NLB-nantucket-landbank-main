# Public Records

Status: draft for review. Source: Figma (Nantucket - Website), section "PUBLIC RECORDS", node
`1910:13470`: five desktop/mobile template pairs (Meeting Minutes, Meeting Agendas, Annual Reports,
Policies, Establishment Documents).

## Goal

A Public Records page an editor can compose and move, where records (downloadable files) are
documents the client manages, grouped into five categories shown as tabs.

## What the Figma shows

Five frames that are one template in five tab states: the same "Public Records" heading and intro,
the same filter row, then a "File Name / Download" list of 74px rows (`record links`). Only the
active tab and the row count change (2 to about 40). Minutes and Agendas show a filter control (and an
open dropdown, `menu`); the other three do not.

## Approach

**One ordinary CMS page with a Records Archive block** (`recordsArchive`), in the same family as the
News Archive (DECISIONS 16), People Grid (11.2) and Property Archive (15). Not five pages (the
header, intro and list shell would be duplicated five times, and a file would have no natural home)
and not an internal route (not editable, absent from Presentation and menus). The address is the
page's own slug and parent, so it can be changed in Studio at any time.

## Data model

**`recordCategory`** (new taxonomy via `defineTaxonomy`: `title`, `slug`, `order`). The slug is the
stable key; the title is the tab label. Plus two presentation settings:

| Field | Values | Meaning |
|---|---|---|
| `sortBy` | `dateDesc` (default), `titleAsc` | How this category's list is ordered. Not user-selectable on the page. |
| `filters` | array of `year` (only value today) | Which filters show for this category. Empty array: none. |

`filters` is an **array of keys, not a boolean**, so adding a filter later is a new allowed value and
needs no migration of existing documents. `sortBy` is likewise a string enum, so a new ordering is
a new value.

**`record`** (new document):

| Field | Notes |
|---|---|
| `title` | Optional. |
| `date` | Optional (a `date`, not `datetime`). |
| `file` | Required. |
| `category` | Required reference to `recordCategory`. |

Row label is a fallback chain: `title`, else the formatted `date`, else the file name. A dated
entry (Minutes) leaves the title blank; a titled one (Policies) leaves the date blank. No per-
category label setting. Studio shows a **warning** (not a block) when a record's date is empty and
its category sorts by date or has the year filter, since it would sort last and never match a year.

Adding a future filter dimension (for example a document type) means a new optional field on `record`
(for example `documentType`, a reference). Existing records stay valid.

## Frontend

**Block.** `recordsArchive` has no fields of its own (like `newsArchive`). Its GROQ projection
returns two lists: every `recordCategory` with `slug`, `title`, `order`, `sortBy` and `filters` (so a
category with no records still gets its tab), and every `record` that has a file and a published
category, with its `categorySlug`. All records are inlined in the page, as articles are; Annual
Reports is the largest at about 40, which is fine. A record whose category is unpublished or whose
file is gone drops out.

**Tabs.** Reuse `components/ui/FilterTabs`, `categoryTabs()` and the address-keyed state of
`useQueryFilter`. **No "All" tab**: lists mix titled and dated rows under different sort rules, so a
combined list has no sensible order. The first category by `order` is the default and is what the
server renders. `?category=<slug>`; an unknown value falls back to the default.

**Filters are a registry, so the next one is additive.** `frontend/sanity/lib/recordFilters.ts`
holds one entry per filter key:

```
year: { param: 'year', label, options(records) -> FilterOption[], matches(record, value) -> boolean }
```

The block renders, for the active category, one control per key in `category.filters`, in order,
with options derived from that category's records (years present, newest first). Records are
narrowed by passing through every active filter's `matches`. Adding search or document type is one
registry entry, one allowed value in the schema and, for document type, one new `record` field;
`RecordsArchive`, the row component and the sorting do not change.

**State.** A new hook `useQueryFilters` handles several params at once, built on the same
`parseFilter`/`withFilter` helpers; `useQueryFilter` is left as is for the other archives. Choosing a
tab clears every registry param, so a stale `?year` cannot leave a tab empty. An unknown or
no-longer-offered value is ignored, not an error.

**Sorting** is a pure function of the category's `sortBy`: `dateDesc` puts undated records last,
`titleAsc` uses `localeCompare`. It is applied after filtering.

**Rows.** One `RecordRow` component, one anchor per row to the file URL with `download`, matching the
Figma 74px row and the mobile variant (which wraps to 100px for long names). Category with no
records shows an empty message, not a blank list.

**Design.** Figma rows and the heading are matched during build with `get_design_context`; any raw
hex in the export is mapped to an existing token and the discrepancy flagged. Icons are inline SVG.

## Studio

`record` and `recordCategory` are added to the schema index, the page block list (`page.ts`),
`BlockRenderer`, and the structure ("Records", "Record Categories"). A seed script creates the five
categories (settings: Minutes and Agendas `dateDesc` with `year`; Annual Reports `dateDesc`;
Policies and Establishment Documents `titleAsc`, no filter) and a draft Public Records page with a
Hero and the block, idempotent on the category slug, with `--dry`. **The sort and filter assignment
above is my reading of the Figma and needs the client's confirmation**; it is editable per category
without a deploy.

## Not in this slice

- **Importing the real records from the current site** ([#35](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/35)).
- **Search and document-type filters**: designed for (see Frontend), not built ([#36](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/36)).
- **Manual ordering within a category**: only date-descending and alphabetical ([#37](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/37)).
- **Pagination**: every record is listed ([#38](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/38)).
- **Per-category indexable URLs** (`/public-records/meeting-minutes`): the category is a query
  parameter. Real paths would be added as static routes if wanted ([#39](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/39)).
- **Structured data (JSON-LD)** for the archive, as a `CollectionPage` of `DigitalDocument`s
  ([#41](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/41)).
- **Year filter dropdown missing in some views**: not reproduced locally; suspected stega encoding of
  the category's `filters` in Presentation, with an uncommitted `stegaClean` candidate fix
  ([#42](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/42)).

## Verification

`npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in
`studio`. A check script for the filter registry and sorting (as `verifyStaffFilter.mts` does for
tabs): sort order with undated records, year options, a stale param ignored, tab change clearing
filters. In the browser against both Figma sizes: a category with a filter and one without, an empty
category, a deep-linked `?category=&year=`, an unknown category. Stop any dev server I start.

# Properties: a `property` type for the map, and the Properties archive

Status: draft for review. Figma (Nantucket - Website): desktop node `1910:12423`, mobile node
`1910:12612`. The mobile design has no hero; the page keeps the same hero there.

## Goal

1. `property` is the document the interactive map reads. The `project` type is retired.
2. A Properties archive page exists, built from blocks: the hero, two filters (Property Type and
   Resources) and a grid of property cards, to the Figma design.
3. A property with no image shows a default image set once in Site Settings.

## 1. `property` replaces `project`

`property` carries the fields `project` has today, so the map keeps working unchanged in behaviour:
`name`, `slug`, `image` (with alt text), `description`, `link`, `propertyTypes` and `resources`
(references to the existing Property Type and Resource documents, so the client can extend either
without a deploy), `boundaryId` and `location` (map marker). The Studio title is "Property".
`projectSettings` (the boundary file) keeps its name: it describes the map, not the document type.

**Migration.** `studio/scripts/migrateProjectsToProperties.ts`, run with
`npx sanity exec … --with-user-token`:
- Copies every `project` (published or draft) into a **draft** `property`. Sanity generates the id;
  the match key is the slug, so a re-run skips a property that exists and never edits it.
- Copies image (the same asset, no re-upload), description, link, taxonomy references,
  `boundaryId` and `location` exactly. Taxonomy references are strong where the target is published
  and weak (`_strengthenOnPublish`) where it is draft-only, as the other imports do.
- `--dry` prints the plan and writes nothing. It is run first; the real run needs the user's go-ahead.
- Leaves the `project` documents in the dataset. The user deletes them after checking the map.
  Nothing is deleted automatically.
- A pure planning module with a check script (`verifyPropertyMigration.mts`), written test-first.
- A second script check compares property and project back (fields, counts) once the migration has
  run, like the people and FAQ validations.

**Code that moves from `project` to `property`** (every file found by searching for the type name,
the blocks and the card):
- Studio: the schema (`documents/property.ts` replaces `documents/project.ts`), `index.ts`,
  `structure/index.ts` (Properties list; the settings stay), `page.ts` and the two block objects'
  field references, `BoundaryIdInput`, `mapTeaser.ts`, Presentation `defineLocations`.
- Frontend: the GROQ in `sanity/lib/queries.ts`, the map (`app/map/*`, `projectFilter.ts`), the
  blocks `ProjectGrid`, `ProjectPreview`, `ProjectList`, `ProjectFilter`, `MapTeaser`,
  `components/cards/CardProject` and `types`, `BlockRenderer`, `scripts/verifyStaffFilter.mts` if it
  names the type, and the seeds that create projects (`seedProjects`, `seedProjectContent`,
  `seedBlockGallery`, `seedArchivePages`).
- Docs: `AGENTS.md` ("`project` is a Land Bank property" becomes "`property` is") and DECISIONS.

The **block names** (`projectGrid`, `projectPreview`, and so on) are not renamed: they are stored in
page documents and a rename needs a content migration. Recorded as deferred, with a GitHub issue.
The stored-type-name part of an existing page's content is unchanged either way, because blocks
read properties through the query, not through their own type name.

## 2. The archive

**A block, not a route.** A new **Property Archive** block, like People Grid, holds the filters and
the grid. The page is an ordinary CMS page, so its address is its slug and parent and can change
in Studio. `studio/scripts/seedPropertiesPage.ts` seeds it as a **draft** `explore/properties`
(Hero – Tertiary with the Figma copy, then the block), idempotent on slug under the `explore`
parent, never editing a page that exists, with `--dry`. It also changes a footer or menu link
labelled "Properties" only if it is still `#`, printing the change first.

**Hero.** Hero – Tertiary: eyebrow "Properties", heading "Our Properties", and the Figma intro
paragraph. Its layout already matches the design (eyebrow and 80px heading left, a 668px paragraph
right). On mobile it is included although the mobile design omits it, stacked as the other pages do.

**Block fields.** `heading` is not needed (the hero has it). The block has no copy fields; the
filter labels "Property Type" and "Resources" come from the two taxonomies' own wording in code.

**Cards** (`CardProperty`, replacing `CardProject`'s use here; the map popup keeps its own markup):
- Image area 370px tall, 4px corners, `object-cover`. When there is no image it shows the site
  default image; when that is also unset it shows the same neutral background the team cards use
  for a missing photo, so the card keeps its height. The Figma photos are not imported.
- Below, 12px gap: the name (serif, 32px desktop / 24px mobile), then property-type tags (the
  existing tag style, 4px gaps), then the description clamped to two lines.
- Three columns with 12px between columns and 64px between rows on desktop; one column, 48px
  between cards, on mobile. The width at which it switches follows the project's other grids.
- The card is a link only when `link` resolves (not empty, not `#`, via `realHref`); otherwise it
  is plain text with no link.

**Filters.**
- Two buttons, **Property Type** and **Resources**, each opening a menu with a "View All" row and one
  checkbox row per option, as in the Figma open state (white panel, 4px radius, soft shadow). The
  design draws only the Property Type menu open; Resources and the mobile menus reuse it.
- Menus are buttons with `aria-expanded` and `aria-controls`; checkboxes are real inputs. Escape and
  an outside click close a menu. "View All" clears that group.
- Rule: a property shows when it has **any** of the checked options within a group, and the
  conditions of **every** group that has a selection must hold (OR within a group, AND between
  groups). No selection in a group means no condition from it.
- Only options used by at least one property are listed, in each taxonomy's order, from the query,
  never from a list in code.
- The selection is mirrored in the address: `?type=a,b&resource=c`, using each taxonomy's slug (its
  stable key), with `replaceState`. Opening such an address selects it. An unknown slug is ignored.
- With no match, a short "No properties match these filters" message and a Clear action.
- The filtering function is pure, in its own module with a check script (like `staffFilter`).

## 3. Default property image

A field on the Site Settings singleton (`settings`, document id `siteSettings`): **Default property
image** (image with required alt text), described as "Shown on a property that has no image of
its own." It lives there, not in a new document, per the request. The archive query reads it once;
the card falls back to it. The map popup does not use it (it shows no image when a property has
none today), unchanged.

## Deferred

Each gets a GitHub issue, linked here when opened:
- Property detail pages (cards link only via the property's own link).
- Renaming the Project Grid / Project Preview blocks.
- Pagination or search on the archive.
- Deleting the retired `project` documents (a user step after checking the map).

## Verification

Typegen, type-check, lint, `tsc`, schema validate; the filter check, the migration-plan check and
the migration validation; a production build; the page-routing contract check. The migration and the
page seed are dry-run first and written only with the user's say-so. I cannot render the page or the
map here and will start no preview server, so the user compares the page to Figma in Presentation,
checks the filter menus, and checks that the map still shows every property and boundary after the
migration.

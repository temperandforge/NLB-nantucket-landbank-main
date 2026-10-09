# Staff, Commissioners and FAQ archives

Status: draft for review. Source: the WordPress theme's `archive-staff.php`, `archive-commissioner.php`
and `archive-faq.php` (and their `template-parts`), plus Figma (Nantucket - Website): the staff
archive is node `1910:12263`, the FAQ archive is node `1637:6094`.

## Goal

The three theme archives exist on this site, as pages an editor can compose and move, with the
Figma staff and FAQ designs.

## What an "archive" is here

Not a special route. Each is an ordinary CMS page built from blocks that already exist, so its
address is its own slug and parent: **it can be changed per archive, any time, in Studio.** Links
that point at a page by reference (menus, buttons, anchor links) follow the move; an old bookmarked
address does not, which is what the redirects issue
([#9](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/9)) covers. A Site
Settings entry per archive is not added: nothing in code needs to find an archive page yet. (News
is the exception: `/news/<slug>` is a built-in route.)

| Page | Address (seeded) | Blocks |
|---|---|---|
| Staff | `/about-us/staff` | Hero - Tertiary, People Grid (staff, with department filter) |
| Commissioners | `/about-us/commissioners` | Hero - Tertiary, People Grid (commissioners) |
| FAQs | `/about-us/faqs` | Hero - Image, FAQ List |

The header copy is the theme's own defaults ("Meet our staff", "Meet our Commissioners", and their
intro paragraphs).

## Block changes

**People Grid.**
- New `showFilters` setting (staff only). When on, a row of tabs sits above the grid: "All" and
  each department that has staff, in the departments' order (Figma: serif, the active tab dark, the
  others lighter). Choosing one filters the grid in the browser and sets `?department=<slug>` in the
  address, so a filtered view can be shared; opening such an address selects it. Tabs are buttons
  with a pressed state, not navigation. A tab only appears for a department with at least one
  member; an unknown `?department=` shows "All".
- Layout per Figma: 12px between columns, 64px between rows; a person with no photo shows the
  design's neutral grey box. Commissioners get the same gaps.

**FAQ List.**
- New `description` field, shown under the heading ("Have questions? No worries, we have the
  answers.").
- Heading in the Figma 80px headline; the left column about 318px wide beside the 668px list.
- An open answer sits in a lighter panel inside the card (Figma's open state), not directly on the
  card.

## Not in this slice

- **Importing the real staff, commissioners and FAQs from WordPress** (slice 3,
  [#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)). The pages show
  whatever documents exist; the sample content seed provides some.
- **Redirects from the old WordPress addresses** (`/about/staff/` and so on): #9.
- **Pagination or search on the FAQ page.**
- **A Figma-checked Commissioners design.** The theme cites node `1910:12000`, which no longer
  exists, and the Design System node given (`109:89`) is not readable through the Figma tool, so
  the page uses the theme's layout: the same header as Staff, then a three-column grid of the
  existing commissioner cards. Flagged for a design check
  ([#15](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/15)).

## Seeding and the footer

- `seedArchivePages.ts` creates the three pages as **drafts** (the theme's copy, the blocks above),
  under the existing `about-us` parent. Idempotent: matched on slug under that parent, skipped if it
  exists; never edits an existing page; `--dry` prints the plan. The FAQs hero needs an image: it
  uses a sample photo, to be replaced.
- `linkArchivePagesInMenus.ts` points the footer menu's **Staff** and **FAQs** links (today `#`
  placeholders) at the new pages. It changes only a link that is still `#`, matched by label,
  prints each change first, and has `--dry`. It needs the pages to exist (a link to a draft-only
  page stays unresolved until publish).

## Verification

Typegen, type-check, lint, `tsc`, schema validate and the check scripts; a production build; the
page-routing contract check. Both seeds are dry-run first and written only with the user's say-so.
I cannot render the pages, so the user compares them to Figma in Presentation, including the filter
tabs (#15).

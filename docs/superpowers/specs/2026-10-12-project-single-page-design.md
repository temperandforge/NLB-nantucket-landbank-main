# Project single page

Status: draft for review. Figma (Nantucket - Website): desktop node `1910:14941`
("project_single_desktop"), mobile node `1910:15044` ("project_single_mobile").

## Goal

A `project` (a Land Bank initiative such as "The Mill Hill Park Revitalization Project", not a map
`property`) has a page of its own at `/projects/<slug>`, built to the Figma template, previewable in
Presentation. The Project Preview block closes the page.

Out of scope: `property`, the map and the Property Archive. Nothing on the map links to a project.

## Template (from Figma)

Desktop: a 40px-gutter section, left column the eyebrow "Projects" (a link back to the archive), the
title (H1) and a jump nav; right column (640px) the project's image, then the body: H2 sections, H3
subsections, paragraphs, download-link rows, and a "Project FAQs" accordion. A background curve runs
behind it. Below: the Project Preview block (intro panel + three numbered projects), then the
footer. Mobile: the title and nav stack above the content; the content section carries the curve;
Project Preview stacks.

The nav in Figma is placeholder text ("Project Goals" and "Environmental Impact Report" match no
heading). The nav is built from the body's H2s, exactly as Jump Nav Content builds it. The FAQ
section adds a "FAQs" nav row when the project has FAQs. The header is not rendered (the layout has
it off, as on the news page).

## Approach

A fixed template driven by fields on `project`, the same shape as `/news/[slug]`. Not a page-builder
array: the design is one template, and an enforced structure is simpler than letting each project
compose blocks.

### Schema

- `project` loses `link`. The page address is `/projects/` + slug, derived, never stored.
- `project` gains `body` (rich text: normal, H2 as "Section heading", H3-H6, bullet/number lists,
  link annotations, images, `anchorLinks`) and `faqs` (references to existing `faq` documents).
- The body's `of` array is currently inline in `jumpNavContent`. It moves to one shared constant
  (`studio/src/schemaTypes/objects/jumpNavBody.ts`) used by both, so the two cannot drift.
- New singleton `singleProjectPage`, mirroring `singleNewsPage`: `eyebrow` (default "Projects"),
  `archiveLink` (the shared `link` object, to the Projects archive page), `faqHeading` (default
  "Project FAQs"), and `moreProjects` {`disabled`, `eyebrow`, `body`, `button`, `count`}. The preview
  panel's text and button are lorem in Figma, so they are authored here once for every project.
- `property` is not touched. `project.property` stays as it is and is not displayed.

### Frontend

- `app/projects/[slug]/page.tsx`: a static route, winning over the catch-all, so a CMS page can live
  at `/projects` (the archive) but not beneath it. Unknown slug: `notFound()`. `generateStaticParams`
  (published), `generateMetadata` (title, description from the body, Open Graph from the image),
  sitemap entries.
- `ProjectView` (new): composes the shared jump-nav layout, the image, `CustomPortableText` with
  `sectionIds`, the FAQ accordion (`FaqItem`, answers rendered with `CustomPortableText`) and the
  eyebrow link. Eyebrow renders as plain text when `archiveLink` is unset or unresolved, never
  throws.
- `JumpNavLayout` (extracted from `JumpNavContent.tsx`): heading, nav, content slot, sticky nav on
  desktop. `JumpNavContent` and `ProjectView` both use it. Differences are props (eyebrow, heading
  level, type scale, curve), not forks.
- `ProjectPreviewView` (extracted from `ProjectPreview.tsx`, as `NewsPreviewView` was from
  `NewsPreview`). The block passes its authored projects; the page passes the related ones.
- Related projects: the latest other projects, those sharing a project type first, `count` of them
  (default 3), as `moreNewsQuery` does for articles. Hidden when `disabled` or there are none.
- Card, tile and archive links (`CardProject`, `ProjectPreviewView`, the `projectGrid` and
  `projectPreview` projections in `queries.ts`) drop `link` and use `/projects/<slug>`.
- Design tokens added per feature from the Figma variables; the curve is committed under
  `public/images/` (the shell cannot download from Figma, so the plan gives the user one command
  block to fetch it). Icons are existing inline SVG components.

### Studio preview

Both directions, per the project rules: `mainDocuments` route `/projects/:slug` (listed before the
page routes, filtered on `_type == "project"`), and `defineLocations` for `project`
(`/projects/<slug>`, with a message when the slug is missing). `singleProjectPage` gets a structure
entry. The page fetches through `sanityFetch` so drafts render in Presentation; overlay attributes
follow what `ArticleView` does.

### Data

`studio/scripts/` gets a script that unsets `link` on every `project` document. It has `--dry`,
lists every non-empty, non-`#` value it would discard so you can read them first, and states in its
header that it overwrites. `seedLandBankProjects.ts` is checked for `link` and updated. A seed
creates `singleProjectPage` with the Figma defaults (idempotent, `createIfNotExists`).

## Verification

`npm run sanity:typegen`, `npm run type-check`, `npm run lint` in `frontend`; `npx tsc --noEmit` in
`studio`; `verifyPageRouting.ts` (routes changed). A check script for the related-projects ordering.
In the browser: desktop and mobile against both Figma frames, a draft project in Presentation, an
unknown slug 404, a project with no body, no FAQs, no image, and an unset archive link. Stop any dev
server I start.

## Deferred (each gets a GitHub issue before I finish)

- Active-section highlighting in the nav (Figma shows the first row highlighted): needs a
  scroll-position client component.
- Hand-picked related projects, if the client wants control over the automatic ones.

Not deferred but not code: pointing `archiveLink` at the Projects archive page is content work in
Studio (the seed leaves it empty, so the eyebrow is plain text until then).

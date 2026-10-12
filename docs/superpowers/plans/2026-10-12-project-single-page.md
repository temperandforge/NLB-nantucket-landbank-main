# Project Single Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `project` has a page at `/projects/<slug>` built to the Figma template, previewable in Presentation, closed by a Project Preview section of related projects.

**Architecture:** A fixed template driven by new fields on `project` (`body`, `faqs`) and a new `singleProjectPage` singleton, mirroring `/news/[slug]` + `singleNewsPage`. The body's field definition is shared with Jump Nav Content; the jump-nav markup and the Project Preview markup are extracted into reusable components. `project.link` is removed: every project link is derived from the slug.

**Tech Stack:** Next.js (App Router, read `frontend/node_modules/next/dist/docs/` before route work), Sanity v3/4 + GROQ + TypeGen, Tailwind v4 utilities + `frontend/css/*.css`, `next-sanity`.

**Spec:** [docs/superpowers/specs/2026-10-12-project-single-page-design.md](../specs/2026-10-12-project-single-page-design.md). Figma file `jDXhDNzEJS26VpXp9JWzIv`: desktop node `1910:14941`, mobile node `1910:15044`.

## Global Constraints

- Only singletons get explicit `_id`s (`singleProjectPage`). Projects keep generated ids.
- Reuse the shared `link` object (`archiveLink`); reuse the shared `button` object for the preview button.
- Menus untouched. No new link shape.
- `property`, the map, the Property Archive: **not modified**.
- Unmatched `/projects/<slug>` calls `notFound()`; never a 200 placeholder.
- Anything rendered must degrade, never throw: a null reference (unpublished FAQ, archive page, project type) is filtered or hidden.
- Constrain the singleton query by `_type` as well as `_id`.
- No raw hex from Figma when a token nearly matches; commit assets under `frontend/public/images/blocks/`, never hotlink Figma URLs.
- `stegaClean` any string compared in code (`headingLevel`, empty-string checks), as the neighbouring blocks do.
- Run seeds/migrations via `cd studio && npx sanity exec scripts/<name>.ts --with-user-token`; each is idempotent, states what it overwrites, and a rewriter has `--dry`.
- Generated files (`frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`) are tracked: run `npm run sanity:typegen` in `frontend` after schema/query changes and commit the result.
- Verification gate before "done": in `frontend`: `npm run sanity:typegen`, `npm run type-check`, `npm run lint`; in `studio`: `npx tsc --noEmit`; then `cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token` (routes changed). Stop any dev server this session started.
- The zsh shell expands `=====`: don't echo separators of `=` characters.

## Review Focus

- A project with no `body`: page renders title/image and no nav, no empty `<nav>`, no crash.
- A project with no `image`: no broken image, no empty gap in the right column.
- A project whose `faqs` contains an unpublished FAQ (dereferences to null): the null is dropped; if none remain, no "Project FAQs" heading and no "FAQs" nav row.
- `singleProjectPage` missing entirely (never seeded) or `archiveLink` unresolved: eyebrow is plain text, defaults used, page still renders.
- Two H2s with the same text in one body: nav ids stay unique (`buildJumpNav` already does this; the FAQ nav row id must not collide with a body H2 titled "FAQs").
- Slug with no match: 404. Draft project in Presentation: renders.
- Fewer than `count` other projects, or zero: related section shows what exists, hidden when empty or `disabled`.
- Old `link` values still in the dataset after the schema drops the field: nothing reads them, and the cleanup script lists them before unsetting.

---

## File Structure

**Studio (create)**
- `studio/src/schemaTypes/objects/jumpNavBody.ts` — the shared rich-text member array.
- `studio/src/schemaTypes/singletons/singleProjectPage.ts` — the shared wording/preview settings.
- `studio/scripts/unsetProjectLinks.ts`, `studio/scripts/seedSingleProjectPage.ts`.

**Studio (modify)**: `objects/jumpNavContent.ts`, `documents/project.ts`, `schemaTypes/index.ts`, `structure/index.ts`, `sanity.config.ts`, `objects/imageCarousel.ts` (description), `scripts/seedLandBankProjects.ts`.

**Frontend (create)**
- `frontend/sanity/lib/relatedProjects.ts` — `orderRelatedProjects()`, pure.
- `frontend/scripts/verifyRelatedProjects.mts` — check script.
- `frontend/components/JumpNavLayout.tsx` — shared two-column jump-nav markup.
- `frontend/components/blocks/ProjectPreviewView.tsx` — the Project Preview markup.
- `frontend/components/ProjectView.tsx` — the project page.
- `frontend/app/projects/[slug]/page.tsx` — the route.
- `frontend/public/images/blocks/project-curve-desktop.svg`, `project-curve-mobile.svg`.

**Frontend (modify)**: `sanity/lib/queries.ts`, `sanity/lib/utils.ts`, `components/blocks/JumpNavContent.tsx`, `components/blocks/ProjectPreview.tsx`, `components/blocks/ImageCarousel.tsx`, `components/cards/CardProject.tsx`, `components/PortableText.tsx`, `css/ui.css`, `app/sitemap.ts`, `frontend/sanity.types.ts`, `studio/sanity.types.ts`, `sanity.schema.json`.

**Docs (modify)**: `docs/DECISIONS.md`.

---

### Task 1: Shared body, `project` fields, `singleProjectPage` schema

**Files:**
- Create: `studio/src/schemaTypes/objects/jumpNavBody.ts`, `studio/src/schemaTypes/singletons/singleProjectPage.ts`
- Modify: `studio/src/schemaTypes/objects/jumpNavContent.ts`, `studio/src/schemaTypes/documents/project.ts`, `studio/src/schemaTypes/index.ts`, `studio/src/structure/index.ts`, `studio/src/schemaTypes/objects/imageCarousel.ts:38`

**Interfaces:**
- Produces: `jumpNavBodyMembers` (array for `of`); `project.body`, `project.faqs`; document type `singleProjectPage` with fields `eyebrow`, `archiveLink`, `faqHeading`, `moreProjects{disabled, eyebrow, body, button, count}`.

- [ ] **Step 1: Create the shared body**

`studio/src/schemaTypes/objects/jumpNavBody.ts`:

```ts
import {defineArrayMember} from 'sanity'

import {altTextField} from './blockFields'

/**
 * The rich text behind a jump nav, shared by Jump Nav Content and the project page so the two
 * cannot drift. Each "Section heading (H2)" becomes a nav link; H1 is not offered because the
 * page's own heading is the H1, and H2 must unambiguously mean "a section of the nav".
 */
export const jumpNavBodyMembers = [
  defineArrayMember({
    type: 'block',
    styles: [
      {title: 'Normal', value: 'normal'},
      {title: 'Section heading (H2)', value: 'h2'},
      {title: 'H3', value: 'h3'},
      {title: 'H4', value: 'h4'},
      {title: 'H5', value: 'h5'},
      {title: 'H6', value: 'h6'},
    ],
    lists: [
      {title: 'Bullet', value: 'bullet'},
      {title: 'Numbered', value: 'number'},
    ],
    marks: {annotations: [{type: 'link'}]},
  }),
  defineArrayMember({type: 'image', options: {hotspot: true}, fields: [altTextField()]}),
  defineArrayMember({type: 'anchorLinks'}),
]
```

- [ ] **Step 2: Use it in `jumpNavContent.ts`**

Replace the inline `of: [ ... ]` of the `content` field with `of: jumpNavBodyMembers`, add `import {jumpNavBodyMembers} from './jumpNavBody'`, and remove the now-unused imports (`defineArrayMember`, `altTextField`) if nothing else in the file uses them (`defineArrayMember` is not used elsewhere there; `altTextField` is not either). Keep the `description` on the field.

- [ ] **Step 3: Edit `project.ts`**

Delete the whole `link` field. Add after `projectTypes`:

```ts
    defineField({
      name: 'body',
      title: 'Page content',
      type: 'array',
      of: jumpNavBodyMembers,
      description:
        'The project page. Each “Section heading (H2)” becomes a link in the page’s left-hand nav. Leave empty for a page with just the title and image.',
    }),
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'faq'}]})],
      description: 'Shown under the page content as “Project FAQs”, in this order.',
    }),
```

Add `import {jumpNavBodyMembers} from '../objects/jumpNavBody'`. Update the file's doc comment: add "Each project has a page of its own at /projects/<slug>; its address is derived from the slug, so it has no link field." Update `description` of `image`: leave as is.

- [ ] **Step 4: Update `imageCarousel.ts:38`**

Change the description text `...and links to its "Find out more" link. Edit those on the project.` to `...and links to the project's page. Edit those on the project.` and the doc comment at line 9-11 (`links to the project's link` → `links to the project's page`; `image and link are edited once` → `image is edited once`).

- [ ] **Step 5: Create `singleProjectPage.ts`**

```ts
import {CogIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

/**
 * Single Project Page (singleton, fixed id `singleProjectPage`): what every project page shares,
 * as opposed to one project's own content: the eyebrow and where it links, the FAQ heading, and
 * the "more projects" section under the page. Mirrors Single News Page.
 *
 * Every field is optional: the page falls back to the wording in the design.
 */
export const singleProjectPage = defineType({
  name: 'singleProjectPage',
  title: 'Single Project Page',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Label above the title',
      type: 'string',
      description: 'The small label at the top of a project page. Default: "Projects".',
    }),
    defineField({
      name: 'archiveLink',
      title: 'Label links to',
      type: 'link',
      description:
        'The Projects page the label links back to. With no link (or one that does not resolve) the label is plain text.',
    }),
    defineField({
      name: 'faqHeading',
      title: 'FAQ heading',
      type: 'string',
      description: 'Heading above a project’s FAQs. Default: "Project FAQs".',
    }),
    defineField({
      name: 'moreProjects',
      title: 'More projects',
      type: 'object',
      description:
        'The section under a project: other projects (those sharing a project type first, then the newest), never the one being read.',
      fields: [
        defineField({
          name: 'disabled',
          title: 'Hide this section',
          type: 'boolean',
          initialValue: false,
        }),
        defineField({
          name: 'eyebrow',
          title: 'Eyebrow',
          type: 'string',
          initialValue: 'Projects',
        }),
        defineField({name: 'body', title: 'Body', type: 'text', rows: 6}),
        defineField({
          name: 'button',
          title: 'Button',
          type: 'button',
          description: 'Shown under the text. Leave the label or link empty to hide it.',
        }),
        defineField({
          name: 'count',
          title: 'How many projects',
          type: 'number',
          initialValue: 3,
          validation: (rule) => rule.min(1).max(4).integer(),
        }),
      ],
      initialValue: {disabled: false, eyebrow: 'Projects', count: 3},
    }),
  ],
  preview: {prepare: () => ({title: 'Single Project Page'})},
})
```

(`defineArrayMember` is unused in this file: do not import it.)

- [ ] **Step 6: Register it**

In `studio/src/schemaTypes/index.ts` add `import {singleProjectPage} from './singletons/singleProjectPage'` beside the `singleNewsPage` import (line ~32) and `singleProjectPage,` beside `singleNewsPage,` in the array (line ~64).

In `studio/src/structure/index.ts`: add `'singleProjectPage',` to `DISABLED_TYPES` after `'singleNewsPage'`, and in the Globals list after the Single News Page item:

```ts
              // The content every project page shares (wording, FAQ heading, "more projects").
              S.listItem()
                .title('Single Project Page')
                .icon(ProjectsIcon)
                .child(
                  S.document().schemaType('singleProjectPage').documentId('singleProjectPage'),
                ),
```

- [ ] **Step 7: Type-check the studio**

Run: `cd studio && npx tsc --noEmit`
Expected: no errors. (Unused-import errors mean a leftover import in `jumpNavContent.ts`: remove it.)

- [ ] **Step 8: Commit**

```bash
git add studio/src
git commit -m "feat: project page fields, shared jump-nav body and Single Project Page settings

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Data scripts

**Files:**
- Create: `studio/scripts/unsetProjectLinks.ts`, `studio/scripts/seedSingleProjectPage.ts`
- Modify: `studio/scripts/seedLandBankProjects.ts:13,115`

**Interfaces:**
- Produces: `singleProjectPage` document in the dataset; `link` unset on every `project` (published and draft).

- [ ] **Step 1: Write `unsetProjectLinks.ts`**

```ts
/**
 * Unsets `link` on every `project` document, published and draft: projects have a page of their
 * own now, so the field was removed from the schema. A removed field is not deleted from existing
 * documents, so this does it.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/unsetProjectLinks.ts --with-user-token -- --dry
 *   npx sanity exec scripts/unsetProjectLinks.ts --with-user-token
 *
 * What it discards: the `link` value of each project that has one. Values that are empty or the
 * `#` placeholder are listed as "placeholder"; any other value is a real address someone typed, and
 * is printed so you can read it before the real run. Idempotent: documents without `link` are
 * skipped. It touches no other field.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

async function main() {
  const docs = await client.fetch<{_id: string; name?: string; link: string}[]>(
    `*[_type == "project" && defined(link)]{_id, name, link}`,
  )
  console.log(`${docs.length} project document(s) have a link${DRY_RUN ? ' (dry run)' : ''}.`)
  for (const doc of docs) {
    const real = doc.link.trim() !== '' && doc.link.trim() !== '#'
    console.log(`  ${doc._id}  ${doc.name ?? '(no name)'}  ${real ? `REAL: ${doc.link}` : 'placeholder'}`)
  }
  if (DRY_RUN || docs.length === 0) return

  const tx = client.transaction()
  for (const doc of docs) tx.patch(doc._id, (patch) => patch.unset(['link']))
  await tx.commit()
  console.log(`Unset link on ${docs.length} document(s).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Write `seedSingleProjectPage.ts`**

```ts
/**
 * Creates the Single Project Page settings with the Figma wording, if it does not exist.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedSingleProjectPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedSingleProjectPage.ts --with-user-token
 *
 * What it writes: one published `singleProjectPage` (fixed id, a singleton) via createIfNotExists,
 * so it NEVER overwrites Studio edits. The "more projects" body is the Figma lorem: replace it in
 * Studio. `archiveLink` is left empty (point it at the Projects page in Studio); until then the
 * eyebrow is plain text.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

const doc = {
  _id: 'singleProjectPage',
  _type: 'singleProjectPage',
  eyebrow: 'Projects',
  faqHeading: 'Project FAQs',
  moreProjects: {
    disabled: false,
    eyebrow: 'projects',
    body: 'Curabitur facilisi cubilia curae hac habitasse platea dictumst. Nisl malesuada lacinia integer nunc posuere ut hendrerit. Efficitur laoreet mauris pharetra vestibulum fusce dictum risus. Imperdiet mollis nullam volutpat porttitor ullamcorper rutrum gravida. Adipiscing elit quisque faucibus ex sapien vitae pellentesque. Ad litora torquent per conubia nostra inceptos himenaeos.',
    button: {buttonText: 'View all projects'},
    count: 3,
  },
}

async function main() {
  if (DRY_RUN) {
    console.log('Would createIfNotExists:', JSON.stringify(doc, null, 2))
    return
  }
  await client.createIfNotExists(doc)
  console.log('singleProjectPage is in place.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Update `seedLandBankProjects.ts`**

Delete the `link: '#',` line (≈115) from the document it creates, and reword the header comment at ≈13 ("Every link is the `#` placeholder ...") to say projects have a page of their own and carry no link.

- [ ] **Step 4: Type-check, dry-run the cleanup, run the seed**

Run: `cd studio && npx tsc --noEmit` — Expected: no errors.
Run: `cd studio && npx sanity exec scripts/unsetProjectLinks.ts --with-user-token -- --dry` — Expected: a count and one line per project. **Show the user any `REAL:` lines and wait for a yes before the real run.**
Run: `cd studio && npx sanity exec scripts/seedSingleProjectPage.ts --with-user-token -- --dry` — Expected: prints the document. Then run it without `--dry` (asks nothing destructive: createIfNotExists).

- [ ] **Step 5: Real cleanup run (after the user's yes), then commit**

Run: `cd studio && npx sanity exec scripts/unsetProjectLinks.ts --with-user-token`
Expected: `Unset link on N document(s).` Re-run `-- --dry`: Expected `0 project document(s) have a link`.

```bash
git add studio/scripts
git commit -m "feat: scripts to unset project links and seed Single Project Page

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Queries, project href, related ordering (with a check)

**Files:**
- Create: `frontend/sanity/lib/relatedProjects.ts`, `frontend/scripts/verifyRelatedProjects.mts`
- Modify: `frontend/sanity/lib/queries.ts` (projectGrid ≈326-335, imageCarousel ≈350-368, projectPreview ≈370-380; new queries at the end), `frontend/sanity/lib/utils.ts`

**Interfaces:**
- Produces: `orderRelatedProjects<T extends {projectTypeIds?: string[] | null; _createdAt: string}>(projects: T[], typeIds: string[], count: number): T[]`; `projectHref(slug: string): string`; queries `projectQuery`, `moreProjectsQuery`, `singleProjectPageQuery`, `projectSlugs`, `projectSitemapData`. Block projections for projectGrid / projectPreview / imageCarousel return `"slug": slug.current` and no `link`.

- [ ] **Step 1: Write the failing check**

`frontend/scripts/verifyRelatedProjects.mts`:

```ts
/**
 * Verifies the related-projects ordering. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyRelatedProjects.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {orderRelatedProjects} from '../sanity/lib/relatedProjects.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${message}`)
  if (!ok) {
    console.error(`       got ${JSON.stringify(actual)}`)
    failed = true
  }
}

const p = (id: string, createdAt: string, types: string[] | null) => ({
  _id: id,
  _createdAt: createdAt,
  projectTypeIds: types,
})
const names = (list: {_id: string}[]) => list.map((x) => x._id)

const pool = [
  p('old-shared', '2026-01-01', ['t1']),
  p('new-unshared', '2026-09-01', ['t2']),
  p('mid-shared-two', '2026-05-01', ['t1', 't3']),
  p('newest-none', '2026-10-01', null),
]

same(
  names(orderRelatedProjects(pool, ['t1', 't3'], 4)),
  ['mid-shared-two', 'old-shared', 'newest-none', 'new-unshared'],
  'more shared types first, then newest',
)
same(names(orderRelatedProjects(pool, [], 2)), ['newest-none', 'new-unshared'], 'no types: newest first, trimmed to count')
same(names(orderRelatedProjects([], ['t1'], 3)), [], 'empty pool gives empty list')
same(names(orderRelatedProjects(pool, ['t1'], 0)), [], 'count 0 gives empty list')
same(pool.length, 4, 'does not mutate its input')

if (failed) process.exit(1)
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && node scripts/verifyRelatedProjects.mts`
Expected: FAIL — cannot find module `relatedProjects.ts`.

- [ ] **Step 3: Implement the helper**

`frontend/sanity/lib/relatedProjects.ts`:

```ts
/**
 * The projects shown under a project page: those sharing the most project types with it first,
 * then the newest. Pure, so scripts/verifyRelatedProjects.mts can check it. The page fetches every
 * other project (there are few) and trims here, rather than ordering in GROQ, so the ordering is
 * checked by something that runs.
 */
export function orderRelatedProjects<
  T extends {projectTypeIds?: string[] | null; _createdAt: string},
>(projects: readonly T[], typeIds: readonly string[], count: number): T[] {
  const wanted = new Set(typeIds)
  const shared = (project: T) => (project.projectTypeIds ?? []).filter((id) => wanted.has(id)).length
  return [...projects]
    .sort((a, b) => shared(b) - shared(a) || b._createdAt.localeCompare(a._createdAt))
    .slice(0, Math.max(count, 0))
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `cd frontend && node scripts/verifyRelatedProjects.mts`
Expected: all `ok`.

- [ ] **Step 5: Add `projectHref` to `utils.ts`**

Append:

```ts
/**
 * The address of a project's page. Unlike a CMS page, whose URL comes from its parent chain, a
 * project lives at a fixed route (app/projects/[slug]), so its address is derived from the slug
 * alone. Keep in step with the `/projects/:slug` Presentation route in studio/sanity.config.ts.
 */
export function projectHref(slug: string): string {
  return `/projects/${slug}`
}
```

- [ ] **Step 6: Edit `queries.ts`**

In the `projectGrid` projection replace the `link,` line with `"slug": slug.current,`. In `imageCarousel`, in both `{ _id, name, image, link }` projections replace `link` with `"slug": slug.current`. In `projectPreview`, replace `link` in `projects[]->{ _id, name, image, link }` with `"slug": slug.current`.

Append new queries (match the neighbouring style; `linkFields`, `markDefsFields`, `linkReference` are existing constants in the file):

```ts
export const projectQuery = defineQuery(`
  *[_type == "project" && slug.current == $slug][0]{
    _id,
    _type,
    name,
    "slug": slug.current,
    description,
    image,
    // This project's own types, to find related projects.
    "projectTypeIds": projectTypes[]._ref,
    body[]{
      ...,
      _type == "anchorLinks" => {
        links[]{
          ...,
          ${linkFields}
        }
      },
      ${markDefsFields}
    },
    // An unpublished FAQ dereferences to null; the page filters those out.
    "faqs": faqs[]->{
      _id,
      question,
      answer[]{
        ...,
        ${markDefsFields}
      }
    }
  }
`)

/** Every project but this one, to be ordered and trimmed by orderRelatedProjects(). */
export const moreProjectsQuery = defineQuery(`
  *[_type == "project" && defined(slug.current) && slug.current != $slug]{
    _id,
    _createdAt,
    name,
    image,
    "slug": slug.current,
    "projectTypeIds": projectTypes[]._ref
  }
`)

/** Content shared by every project page (a singleton, so matched on its type and fixed id). */
export const singleProjectPageQuery = defineQuery(`
  *[_type == "singleProjectPage" && _id == "singleProjectPage"][0]{
    eyebrow,
    faqHeading,
    archiveLink{
      ...,
      ${linkReference}
    },
    moreProjects{
      ...,
      button{
        ...,
        ${linkFields}
      }
    }
  }
`)

export const projectSlugs = defineQuery(`
  *[_type == "project" && defined(slug.current)]{"slug": slug.current}
`)

export const projectSitemapData = defineQuery(`
  *[_type == "project" && defined(slug.current)]{_updatedAt, "slug": slug.current}
`)
```

- [ ] **Step 7: Typegen (will surface the consumers that still read `link`)**

Run: `cd frontend && npm run sanity:typegen && npm run type-check`
Expected: type errors in `CardProject.tsx`, `ImageCarousel.tsx`, `ProjectPreview.tsx` (they read `project.link`). That is the to-do list for Tasks 4 and 6; do not commit a red tree: continue straight into Task 4 before committing, or commit with Task 4.

---

### Task 4: Cards and carousel link to the derived address

**Files:**
- Modify: `frontend/components/cards/CardProject.tsx:35`, `frontend/components/blocks/ImageCarousel.tsx:35`

**Interfaces:**
- Consumes: `projectHref(slug)` from Task 3; projections now carry `slug`.

- [ ] **Step 1: `CardProject.tsx`**

Change the import to `import {projectHref} from '@/sanity/lib/utils'` (drop `realHref`), and replace the tail:

```tsx
  // Every project has a page of its own; a project with no slug (unreachable through the query,
  // which requires one) would be a plain card, never a dead anchor.
  const href = project.slug ? projectHref(project.slug) : null
  return href ? (
    <a href={href} className="block w-full">
      {card}
    </a>
  ) : (
    card
  )
```

- [ ] **Step 2: `ImageCarousel.tsx`**

Replace `const href = realHref(project.link)` (and its comment) with `const href = project.slug ? projectHref(project.slug) : null`, fixing the `utils` import (`realHref` may now be unused: remove it if so).

- [ ] **Step 3: Type-check and lint**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: remaining error only in `ProjectPreview.tsx` (Task 6). If another file reads `.link` on a project, fix it the same way.

- [ ] **Step 4: Commit Tasks 3 and 4 together once Task 6 compiles, or now with the known `ProjectPreview.tsx` error excluded**

Preferred: do Task 6 Step 1-2 first, then:

```bash
git add frontend studio/sanity.types.ts sanity.schema.json
git commit -m "feat: derive project links from the slug and add project page queries

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Extract `JumpNavLayout` (no visual change to Jump Nav Content)

**Files:**
- Create: `frontend/components/JumpNavLayout.tsx`
- Modify: `frontend/components/blocks/JumpNavContent.tsx`

**Interfaces:**
- Produces:

```ts
export default function JumpNavLayout(props: {
  variant?: 'block' | 'project'
  eyebrow?: React.ReactNode
  heading?: string | null
  headingLevel?: 'h1' | 'h2'
  navLabel: string
  items: {id: string; text: string}[]
  children: React.ReactNode
}): JSX.Element
```

- [ ] **Step 1: Create the component**

`frontend/components/JumpNavLayout.tsx` (the `block` variant reproduces the classes in `JumpNavContent.tsx` exactly; `project` follows Figma `1910:14941`: left column 553px max, heading `text-headline-xl`, rows with a top rule and a mono label, content column 640px):

```tsx
import {ArrowRightIcon} from '@/components/icons'
import type {JumpNavItem} from '@/sanity/lib/jumpNav'

/**
 * The jump-nav layout: a sticky left column (eyebrow, heading, nav of the content's H2s) beside the
 * content. Shared by the Jump Nav Content block and the project page; `variant` selects the type
 * scale and nav rows each design uses, nothing else.
 */
export default function JumpNavLayout({
  variant = 'block',
  eyebrow,
  heading,
  headingLevel = 'h1',
  navLabel,
  items,
  children,
}: {
  variant?: 'block' | 'project'
  eyebrow?: React.ReactNode
  heading?: string | null
  headingLevel?: 'h1' | 'h2'
  navLabel: string
  items: JumpNavItem[]
  children: React.ReactNode
}) {
  const Heading = headingLevel
  const project = variant === 'project'

  return (
    <div
      className={
        project
          ? 'relative z-10 mx-auto flex w-full max-w-[90rem] flex-col gap-12 tf-px py-12 md:flex-row md:justify-between md:gap-24 md:py-24'
          : 'max-w-[1360px] mx-auto px-10 py-24 grid grid-cols-1 md:grid-cols-2 gap-24'
      }
    >
      <div
        className={`md:sticky md:top-[calc(var(--header-height)+2.5rem)] self-start ${
          project ? 'flex w-full flex-col gap-12 md:max-w-[553px] md:flex-1' : ''
        }`}
      >
        <div className={project ? 'flex w-full max-w-[560px] flex-col gap-6' : ''}>
          {eyebrow}
          {heading && (
            <Heading
              className={project ? 'w-full text-headline-xl text-on-background' : 'text-headline-2xl mb-8'}
            >
              {heading}
            </Heading>
          )}
        </div>
        {items.length > 0 && (
          <nav className="flex flex-col" aria-label={navLabel}>
            {items.map((item) => (
              <a
                key={item.id}
                className={
                  project
                    ? 'flex items-center justify-between gap-4 border-t border-border-light py-3 font-mono text-body-base leading-[1.6] text-on-background no-underline'
                    : 'flex items-center justify-between py-4 border-b border-dusty-heath-800 no-underline text-moody-moor-600'
                }
                href={`#${item.id}`}
              >
                <span>{item.text}</span>
                {project ? <ArrowRightIcon className="size-6 shrink-0" /> : <span aria-hidden="true">&rarr;</span>}
              </a>
            ))}
          </nav>
        )}
      </div>
      <div className={project ? 'flex w-full flex-col md:w-[640px] md:shrink-0' : 'flex flex-col gap-10'}>
        {children}
      </div>
    </div>
  )
}
```

(`ArrowRightIcon` is exported from `@/components/icons`, as `LinkRow` imports it. `JumpNavItem` is already exported from `sanity/lib/jumpNav.ts`.)

- [ ] **Step 2: Rewrite `JumpNavContent.tsx` to use it**

```tsx
import {stegaClean, type PortableTextBlock} from 'next-sanity'

import JumpNavLayout from '@/components/JumpNavLayout'
import CustomPortableText from '@/components/PortableText'
import {buildJumpNav} from '@/sanity/lib/jumpNav'

import {BlockProps} from './types'

export default function JumpNavContent({block}: BlockProps<'jumpNavContent'>) {
  // stegaClean: see BasicLeftRightText.
  const headingLevel = stegaClean(block.headingLevel) === 'h2' ? 'h2' : 'h1'
  const content = block.content ?? []
  const {items, idByKey} = buildJumpNav(content)

  return (
    <section className="w-full">
      <JumpNavLayout
        heading={block.heading}
        headingLevel={headingLevel}
        navLabel={block.heading || 'Section navigation'}
        items={items}
      >
        {content.length > 0 && (
          <CustomPortableText value={content as PortableTextBlock[]} sectionIds={idByKey} />
        )}
      </JumpNavLayout>
    </section>
  )
}
```

- [ ] **Step 3: Verify no regression**

Run: `cd frontend && npm run type-check && npm run lint && node scripts/verifyJumpNav.mts`
Expected: pass. In the browser (dev server on a free port; check what is running first), open a page that has a Jump Nav Content block and compare to its prior render: heading, nav rows, content column unchanged.

- [ ] **Step 4: Commit**

```bash
git add frontend/components
git commit -m "refactor: extract the jump-nav layout from Jump Nav Content

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Extract `ProjectPreviewView`

**Files:**
- Create: `frontend/components/blocks/ProjectPreviewView.tsx`
- Modify: `frontend/components/blocks/ProjectPreview.tsx`

**Interfaces:**
- Produces:

```ts
export type PreviewProject = {_id: string; name?: string | null; slug?: string | null; image?: ImageValue | null}
export default function ProjectPreviewView(props: {
  eyebrow?: string | null
  body?: string | null
  button?: {label: string; href: string} | null
  projects: PreviewProject[]
}): JSX.Element | null
```

`ImageValue` is `BlockImage`'s prop type: use `React.ComponentProps<typeof BlockImage>['image']`.

- [ ] **Step 1: Create the view**

Move the whole JSX of the current `ProjectPreview` into `ProjectPreviewView` unchanged, except: the inputs come from props instead of `block`; `href` per project becomes `project.slug ? projectHref(project.slug) : null` (drop `realHref` for projects, keep `ButtonLink` usage); `showButton`/`buttonHref` collapse into the `button` prop. Concretely:

```tsx
import type {ComponentProps} from 'react'

import ButtonLink from '@/components/ui/ButtonLink'
import {projectHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'

export type PreviewProject = {
  _id: string
  name?: string | null
  slug?: string | null
  image?: ComponentProps<typeof BlockImage>['image']
}

export default function ProjectPreviewView({
  eyebrow,
  body,
  button,
  projects,
}: {
  eyebrow?: string | null
  body?: string | null
  button?: {label: string; href: string} | null
  projects: PreviewProject[]
}) {
  // A reference to an unpublished project dereferences to null.
  const shown = projects.filter((project) => project?.name)
  const hasPanel = Boolean(eyebrow || body || button)
  if (!hasPanel && shown.length === 0) return null

  return (
    <section className="w-full bg-background tf-px py-s5">
      <div className="flex w-full flex-col gap-6 tf-max-w lg:flex-row">
        {hasPanel && (
          <div className="flex min-h-[28rem] flex-col items-start justify-between gap-10 bg-surface-dark p-6 text-on-surface-dark lg:h-[644px] lg:min-h-0 lg:w-[425px] lg:shrink-0">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {body && <p className="w-full font-sans text-body-base leading-[1.6]">{body}</p>}
            {button && <ButtonLink label={button.label} href={button.href} rightIcon />}
          </div>
        )}
        {shown.length > 0 && (
          <ol className="m-0 grid min-w-0 flex-1 list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:flex lg:items-center">
            {shown.map((project, index) => {
              const href = project.slug ? projectHref(project.slug) : null
              const card = (
                <>
                  <div className="flex w-full flex-col items-start gap-8 text-on-background lg:gap-32">
                    <span className="text-headline-xl whitespace-nowrap">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="w-full font-mono text-body-base leading-[1.6]">{project.name}</p>
                  </div>
                  <div className="relative aspect-[346/467] w-full overflow-clip bg-dusty-heath-800">
                    <BlockImage
                      image={project.image}
                      width={692}
                      sizes="(min-width: 1024px) 20vw, 50vw"
                      fill
                      className="size-full object-cover"
                    />
                  </div>
                </>
              )
              return (
                <li key={project._id} className="flex min-w-0 flex-1 items-stretch gap-6 self-stretch">
                  {index > 0 && (
                    <span className="hidden w-px shrink-0 self-stretch bg-border-light lg:block" aria-hidden="true" />
                  )}
                  {href ? (
                    <a href={href} className="flex min-w-0 flex-1 flex-col items-start gap-6">
                      {card}
                    </a>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-6">{card}</div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Reduce `ProjectPreview.tsx` to a thin block wrapper**

```tsx
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import ProjectPreviewView from './ProjectPreviewView'
import {BlockProps} from './types'

export default function ProjectPreview({block}: BlockProps<'projectPreview'>) {
  const href = realHref(block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null)
  const label = block.button?.buttonText ?? ''
  return (
    <ProjectPreviewView
      eyebrow={block.eyebrow}
      body={block.body}
      button={label && href ? {label, href} : null}
      projects={block.projects ?? []}
    />
  )
}
```

- [ ] **Step 3: Verify**

Run: `cd frontend && npm run type-check && npm run lint`
Expected: pass (this clears the Task 3 type errors). In the browser, a page with a Project Preview block renders as before, tiles now link to `/projects/<slug>`.

- [ ] **Step 4: Commit (with Tasks 3-4 if not yet committed)**

```bash
git add frontend
git commit -m "refactor: extract ProjectPreviewView from the Project Preview block

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Background curve assets (needs the user)

**Files:**
- Create: `frontend/public/images/blocks/project-curve-desktop.svg`, `frontend/public/images/blocks/project-curve-mobile.svg`
- Modify: `frontend/css/ui.css` (after `.article-curve`)

The shell cannot download from Figma. The URLs below come from the design-context responses and expire about seven days after 2026-10-12; if they have, re-run `get_design_context` for nodes `2613:31723` (desktop vector) and `1910:15047` (mobile vector) for fresh ones.

- [ ] **Step 1: Ask the user to run this block, then confirm**

```bash
cd /Users/jtf/Developer/NLB-nantucket-landbank-main/.claude/worktrees/project-single-page-559084/frontend/public/images/blocks && curl -fsSL "https://www.figma.com/api/mcp/asset/871efe0a-cae4-4363-bc4f-ea29a53747e7.svg" -o project-curve-desktop.svg && curl -fsSL "https://www.figma.com/api/mcp/asset/2de78855-62ec-4ae7-9b1c-494843618944.svg" -o project-curve-mobile.svg && head -c 300 project-curve-desktop.svg && echo && head -c 300 project-curve-mobile.svg
```

- [ ] **Step 2: Verify both are non-empty SVGs**

Run: `head -c 120 frontend/public/images/blocks/project-curve-desktop.svg frontend/public/images/blocks/project-curve-mobile.svg && wc -c frontend/public/images/blocks/project-curve-*.svg`
Expected: each starts with `<svg` and is non-zero bytes. Note each file's `width`/`height`/`viewBox`: Step 3 uses them.

- [ ] **Step 3: Add the classes**

After `.article-curve` in `frontend/css/ui.css`:

```css
/* Project page (Figma 1910:14941 desktop, 1910:15044 mobile): the line art behind the content. The
   two frames use different drawings, so the mobile one is swapped in below the md breakpoint. */
.project-curve {
  background: url('/images/blocks/project-curve-mobile.svg') center / 100% 100% no-repeat;
}

@media (min-width: 48rem) {
  .project-curve {
    background-image: url('/images/blocks/project-curve-desktop.svg');
  }
}
```

(Size/position of the element carrying the class is set in `ProjectView` from the Figma geometry: desktop 1684×1089 centred and offset up ~282px; mobile 2919×1887 offset right ~306px. If the SVG's own viewBox disagrees with those, trust the SVG and adjust in Task 8 against the screenshots.)

- [ ] **Step 4: Commit**

```bash
git add frontend/public/images/blocks frontend/css/ui.css
git commit -m "feat: add the project page background line art

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: `ProjectView`, rich-text variant, route, sitemap

**Files:**
- Create: `frontend/components/ProjectView.tsx`, `frontend/app/projects/[slug]/page.tsx`
- Modify: `frontend/components/PortableText.tsx`, `frontend/css/ui.css`, `frontend/app/sitemap.ts`

**Interfaces:**
- Consumes: `JumpNavLayout` (Task 5), `ProjectPreviewView` (Task 6), `orderRelatedProjects`, `projectHref`, queries from Task 3, `buildJumpNav`, `FaqItem`.
- Produces: `ProjectView({project, settings, archiveHref}): JSX.Element` with `project: NonNullable<ProjectQueryResult>`, `settings: SingleProjectPageQueryResult`, `archiveHref: string | null`.

Before writing the route, read `frontend/node_modules/next/dist/docs/` for the route-segment/`PageProps` conventions this project's Next version uses (as `app/news/[slug]/page.tsx` does with `PageProps<'/news/[slug]'>`).

- [ ] **Step 1: Add the `project` rich-text variant**

In `PortableText.tsx` change the `variant` union to `'prose' | 'basic' | 'article' | 'project'` and, in the className ternary, add `variant === 'project' ? \`rich-text-project ${className ?? ''}\` :` before the `article` branch. In the `h2` renderer nothing changes (the `sectionIds` branch already handles jump-nav H2s). Images in this variant take the same branch as `prose` (`my-8`, 672px).

In `ui.css` add, after `.rich-text-basic` rules:

```css
/* Project page body (Figma 1910:14941): H2 = a section (headline-lg), H3+ = subsections, 24px between
   paragraphs, 64px between sections. */
.rich-text-project {
  color: var(--color-on-background);
  font-family: var(--font-sans);
  font-size: var(--text-body-base);
  line-height: 1.6;
}

.rich-text-project > * + * {
  margin-top: 1.5rem;
}

.rich-text-project > h2,
.rich-text-project > h3,
.rich-text-project > h4,
.rich-text-project > h5,
.rich-text-project > h6 {
  font-family: var(--font-serif);
  font-weight: 400;
  letter-spacing: -0.05em;
  line-height: 1.1;
}

.rich-text-project > h2 {
  margin-top: 4rem;
  font-size: var(--text-headline-lg);
}

.rich-text-project > h3 {
  font-size: var(--text-headline-base);
}

.rich-text-project > h4,
.rich-text-project > h5,
.rich-text-project > h6 {
  font-size: var(--text-headline-sm);
}

.rich-text-project > :first-child {
  margin-top: 0;
}

.rich-text-project a:not(.link-item--inactive) {
  text-decoration: underline;
}

.rich-text-project ul,
.rich-text-project ol {
  padding-left: 1.5rem;
}

.rich-text-project ul {
  list-style: disc;
}

.rich-text-project ol {
  list-style: decimal;
}
```

(Check `letter-spacing: -0.05em` against `.rich-text-basic`'s h3 rule: it is copied from there. If Figma's `font/letter-spacing/normal` is `0px` for these headings, match the design: set `letter-spacing: 0` and note the discrepancy.)

- [ ] **Step 2: Write `ProjectView.tsx`**

```tsx
import Link from 'next/link'
import type {PortableTextBlock} from 'next-sanity'

import BlockImage from '@/components/blocks/BlockImage'
import FaqItem from '@/components/blocks/FaqItem'
import JumpNavLayout from '@/components/JumpNavLayout'
import CustomPortableText from '@/components/PortableText'
import {buildJumpNav, slugify} from '@/sanity/lib/jumpNav'
import type {ProjectQueryResult, SingleProjectPageQueryResult} from '@/sanity.types'

/**
 * A project page (Figma: project_single_desktop / project_single_mobile): the title and a jump nav
 * of the body's H2s on the left; the image, the body and the FAQs on the right. Everything but the
 * name is optional and simply absent when missing.
 */
export default function ProjectView({
  project,
  settings,
  archiveHref,
}: {
  project: NonNullable<ProjectQueryResult>
  settings: SingleProjectPageQueryResult
  /** Where the eyebrow links: null renders it as plain text. */
  archiveHref: string | null
}) {
  const body = project.body ?? []
  const {items: bodyItems, idByKey} = buildJumpNav(body)
  // An unpublished FAQ dereferences to null.
  const faqs = (project.faqs ?? []).filter((faq) => faq?.question)
  const faqHeading = settings?.faqHeading || 'Project FAQs'

  // The FAQ section's anchor must not collide with a body H2 that slugifies the same.
  const taken = new Set(bodyItems.map((item) => item.id))
  const base = slugify(faqHeading) || 'faqs'
  let faqId = base
  for (let n = 2; taken.has(faqId); n++) faqId = `${base}-${n}`
  const items = faqs.length > 0 ? [...bodyItems, {id: faqId, text: 'FAQs'}] : bodyItems

  const eyebrowText = settings?.eyebrow || 'Projects'
  const eyebrow = (
    <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
      {archiveHref ? (
        <Link href={archiveHref} className="no-underline hover:underline">
          {eyebrowText}
        </Link>
      ) : (
        eyebrowText
      )}
    </p>
  )

  return (
    <article className="relative w-full overflow-clip bg-background">
      <div
        className="project-curve pointer-events-none absolute left-1/2 top-[40%] h-[1089px] w-[1684px] max-w-none -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      />
      <JumpNavLayout
        variant="project"
        eyebrow={eyebrow}
        heading={project.name}
        headingLevel="h1"
        navLabel={`${project.name} sections`}
        items={items}
      >
        <div className="flex w-full flex-col gap-12 md:gap-16">
          {project.image?.asset?._ref && (
            <div className="relative h-[375px] w-full overflow-clip rounded bg-dusty-heath-800">
              <BlockImage
                image={project.image}
                width={1280}
                sizes="(min-width: 768px) 640px, 100vw"
                fill
                className="absolute inset-0 size-full object-cover"
              />
            </div>
          )}
          {body.length > 0 && (
            <CustomPortableText
              variant="project"
              className="w-full"
              value={body as PortableTextBlock[]}
              sectionIds={idByKey}
            />
          )}
          {faqs.length > 0 && (
            <section id={faqId} className="scroll-mt-10 flex w-full flex-col gap-8">
              <h2 className="w-full text-headline-lg text-on-background">{faqHeading}</h2>
              <div className="flex w-full flex-col gap-5">
                {faqs.map((faq) => (
                  <FaqItem key={faq._id} question={faq.question ?? ''}>
                    {faq.answer && (
                      <CustomPortableText
                        variant="basic"
                        className="[--rich-text-color:var(--color-on-background)] [--rich-text-size:14px]"
                        value={faq.answer as PortableTextBlock[]}
                      />
                    )}
                  </FaqItem>
                ))}
              </div>
            </section>
          )}
        </div>
      </JumpNavLayout>
    </article>
  )
}
```

(`faqs` after `.filter` is typed with nullable entries; if the compiler complains, filter with a type guard: `.flatMap((faq) => (faq?.question ? [faq] : []))`, as `NewsPreviewView` filters categories.)

- [ ] **Step 3: Write the route**

`frontend/app/projects/[slug]/page.tsx`:

```tsx
import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {toPlainText, type PortableTextBlock} from 'next-sanity'

import ProjectPreviewView from '@/components/blocks/ProjectPreviewView'
import ProjectView from '@/components/ProjectView'
import {sanityFetch} from '@/sanity/lib/live'
import {
  moreProjectsQuery,
  projectQuery,
  projectSlugs,
  singleProjectPageQuery,
} from '@/sanity/lib/queries'
import {orderRelatedProjects} from '@/sanity/lib/relatedProjects'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref, resolveOpenGraphImage} from '@/sanity/lib/utils'

/**
 * A project page, /projects/<slug>. A static route, so it wins over the catch-all that owns CMS
 * pages; a CMS page can still live at /projects (the archive) but not beneath it.
 */

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: projectSlugs,
    // Only published projects are prerendered; a draft is fetched on demand in Presentation.
    perspective: 'published',
    stega: false,
  })
  return data.flatMap((project) => (project.slug ? [{slug: project.slug}] : []))
}

export const dynamicParams = true

export async function generateMetadata(props: PageProps<'/projects/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: project} = await sanityFetch({query: projectQuery, params: {slug}, stega: false})
  if (!project) return {}
  const description =
    project.description ||
    (project.body?.length ? toPlainText(project.body as PortableTextBlock[]).slice(0, 160) : undefined)
  const image = resolveOpenGraphImage(project.image)
  return {
    title: project.name,
    description,
    openGraph: image ? {images: [image]} : undefined,
  } satisfies Metadata
}

export default async function ProjectPage(props: PageProps<'/projects/[slug]'>) {
  const {slug} = await props.params
  const [{data: project}, {data: settings}, {data: others}] = await Promise.all([
    sanityFetch({query: projectQuery, params: {slug}}),
    sanityFetch({query: singleProjectPageQuery}),
    sanityFetch({query: moreProjectsQuery, params: {slug}}),
  ])

  // No project at this slug: a real 404, never a 200 placeholder.
  if (!project?._id) notFound()

  const archiveHref = realHref(
    settings?.archiveLink ? linkResolver(settings.archiveLink as DereferencedLink) : null,
  )

  const more = settings?.moreProjects
  const showMore = !more?.disabled
  const count = Math.min(Math.max(more?.count ?? 3, 1), 4)
  const related = showMore ? orderRelatedProjects(others, project.projectTypeIds ?? [], count) : []
  const buttonHref = realHref(more?.button?.link ? linkResolver(more.button.link as DereferencedLink) : null)
  const buttonLabel = more?.button?.buttonText ?? ''

  return (
    <>
      <ProjectView project={project} settings={settings} archiveHref={archiveHref} />
      {showMore && (
        <ProjectPreviewView
          eyebrow={more?.eyebrow}
          body={more?.body}
          button={buttonLabel && buttonHref ? {label: buttonLabel, href: buttonHref} : null}
          projects={related}
        />
      )}
    </>
  )
}
```

(If `PageProps<'/projects/[slug]'>` is not yet typed, run `npm run type-check` once: it runs `next typegen`, which generates it.)

- [ ] **Step 4: Add the projects to the sitemap**

In `sitemap.ts` import `projectSitemapData` and, after the articles loop:

```ts
  const projects = await sanityFetch({query: projectSitemapData})
  for (const project of projects.data) {
    if (!project.slug) continue
    sitemap.push({
      lastModified: project._updatedAt || new Date(),
      priority: 0.6,
      changeFrequency: 'monthly',
      url: `${domain}/projects/${project.slug}`,
    })
  }
```

- [ ] **Step 5: Typegen, type-check, lint**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint`
Expected: pass. Fix any nullable-type complaints as noted in Steps 2-3.

- [ ] **Step 6: Commit**

```bash
git add frontend studio/sanity.types.ts sanity.schema.json
git commit -m "feat: add the project page at /projects/[slug]

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Presentation wiring

**Files:**
- Modify: `studio/sanity.config.ts` (`mainDocuments` ≈line 58-75, `locations` ≈line 76-110)

- [ ] **Step 1: Add the route**

After the `/news/:slug` entry, before `...PAGE_PRESENTATION_ROUTES`:

```ts
          // A project page. Listed before the page routes for the same reason as /news/:slug:
          // /projects/<slug> also fits their two-segment pattern.
          {
            route: '/projects/:slug',
            filter: `_type == "project" && slug.current == $slug`,
          },
```

- [ ] **Step 2: Add the location**

After the `article:` entry:

```ts
          project: defineLocations({
            select: {name: 'name', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{title: doc.name || 'Untitled', href: `/projects/${doc.slug}`}]
                : [],
              message: doc?.slug ? undefined : 'Add a slug to preview this project.',
            }),
          }),
```

- [ ] **Step 3: Type-check and routing check**

Run: `cd studio && npx tsc --noEmit`
Run: `cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token`
Expected: pass (the page routes are unchanged; this confirms the new route did not disturb them).

- [ ] **Step 4: Commit**

```bash
git add studio/sanity.config.ts
git commit -m "feat: preview projects in Presentation

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Verify in the browser, record decisions, file issues

**Files:**
- Modify: `docs/DECISIONS.md`

- [ ] **Step 1: Run the full gate**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint && node scripts/verifyRelatedProjects.mts && node scripts/verifyJumpNav.mts`
Run: `cd studio && npx tsc --noEmit`
Expected: all pass. Commit any regenerated type files.

- [ ] **Step 2: Content for the check**

In Studio (or by a throwaway patch the user approves), make sure one project has an `image`, a `body` with at least two H2s, an H3, an `anchorLinks` row with the download icon, and two FAQs; and that `singleProjectPage`'s `archiveLink` points at the Projects page. Use the seeded Land Bank projects.

- [ ] **Step 3: Browser verification (check what is already on the dev port first; start `next dev` on a free port; stop it when done)**

Use the Browser pane (`preview_start`, then `navigate` to `/projects/<slug>`):
1. Desktop (1440 wide) against the desktop screenshot of `1910:14941`: eyebrow, H1, nav rows, 640px column, image 375px tall, H2/H3 scale, download rows, FAQs, curve, preview section (panel + three numbered projects), footer. Compare section by section; fix spacing/tokens in `JumpNavLayout`/`ProjectView`/`ui.css`, preferring existing tokens over Figma hex and flagging near-misses to the user.
2. Mobile (`resize_window` 375×812) against `1910:15044`: title and nav stack, content, preview stacks.
3. The nav: click a row, the page scrolls to the H2 (`scroll-mt`); "FAQs" row scrolls to the FAQ heading.
4. Eyebrow: a link when `archiveLink` resolves; click returns to the archive.
5. Degradation (Review Focus): a project with no body/image/FAQs; `/projects/does-not-exist` returns 404; an unpublished FAQ in `faqs` is absent.
6. Presentation: open the Studio's Presentation tool; a draft project loads at `/projects/<slug>`, and the project document's "Open in Presentation" location resolves to the same page.
7. `read_console_messages` and `read_network_requests`: no errors from the new page. Map (`/map`) still loads its properties and popups show no "Find out more" change (the map was not touched).
8. Take a desktop and a mobile screenshot as proof.

- [ ] **Step 4: Record the decision**

Append to `docs/DECISIONS.md` (next free number after the last section; match its heading style):

```markdown
## N. Project pages

**Status:** Implemented.

A `project` (a Land Bank initiative) has a page of its own at `/projects/<slug>`, a static route
like `/news/<slug>`, built from the project's `body` (shared rich-text definition with Jump Nav
Content, `jumpNavBodyMembers`) and `faqs`. The page address is derived from the slug, so
`project.link` was removed (`studio/scripts/unsetProjectLinks.ts` cleared the old values). What every
project page shares lives on the `singleProjectPage` singleton: the eyebrow and where it links back
(`archiveLink`), the FAQ heading and the "more projects" section, whose projects are ordered by
shared project type then newest (`frontend/sanity/lib/relatedProjects.ts`). `property`, the map and
the Property Archive are unaffected. Spec:
[project single page design](superpowers/specs/2026-10-12-project-single-page-design.md); plan:
[project single page plan](superpowers/plans/2026-10-12-project-single-page.md).

**Not done:** active-section highlighting in the nav, hand-picked related projects (issues below).
```

Also add a one-line note under issue [#23](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/23) context in §15.1's "Not done" list: change `property detail pages (#23)` to say it is superseded by project pages.

- [ ] **Step 5: File the deferred-work issues**

Search first: `gh issue list --search "project nav active" --state all`, `gh issue list --search "related projects" --state all`. Then, if none exist:

```bash
gh issue create --title "Project page: highlight the active section in the jump nav" --body "Figma (project_single_desktop 1910:14941) shows the first nav row highlighted as active. The jump nav is built from the body's H2s (frontend/components/JumpNavLayout.tsx) and has no active state: rows are all plain. Needs a small client component that tracks scroll position (IntersectionObserver on the section ids from buildJumpNav) and marks the current row (surface-dark background, 12px padding, as in the design's first row). Deferred because it is interactive behaviour beyond the template; the nav works without it. Spec: docs/superpowers/specs/2026-10-12-project-single-page-design.md (Deferred)."
gh issue create --title "Project page: hand-picked related projects" --body "The 'more projects' section under a project page is automatic: other projects sharing the most project types first, then the newest, up to singleProjectPage.moreProjects.count (frontend/sanity/lib/relatedProjects.ts). If the client wants control, add an optional per-project 'related' reference array and prefer it over the automatic order. Deferred because the design does not call for it and automatic needs no editor upkeep. Spec: docs/superpowers/specs/2026-10-12-project-single-page-design.md (Deferred)."
gh issue comment 23 --body "Superseded for projects by the project page (/projects/<slug>). Properties still have no page; the map popup keeps its own link field."
```

Link the two new issue numbers from the spec's Deferred section and from the DECISIONS entry's "Not done" line.

- [ ] **Step 6: Stop the dev server and commit**

Stop only the server this session started. Then:

```bash
git add docs
git commit -m "docs: record project pages and link the deferred issues

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

Report to the user: what was verified (with screenshots), what was not (e.g. anything needing their content), the deferred issue numbers, and that nothing has been pushed.

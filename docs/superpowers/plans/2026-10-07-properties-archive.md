# Properties archive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `property` replaces `project` as the document the map reads, and a Properties archive page (hero, Property Type and Resources filters, a grid of cards, a site-wide default image) exists to the Figma design.

**Architecture:** A new `property` document (the `project` fields, same publish state migrated by a dry-run-first script) feeds the existing map and blocks through renamed queries. A new Property Archive block holds the filters and the card grid; its filtering is a pure module with a check script, used by a small client component tree (the people filter's pattern: Suspense, `useSearchParams`, `replaceState`). The default image is a field on the existing `settings` singleton.

**Tech Stack:** Sanity Studio (`defineType`, `defineBlock`), Next.js 16 App Router, Tailwind v4, `next-sanity`, GROQ with generated types (`npm run sanity:typegen`), plain `.mts` check scripts run with Node 24 type stripping (no test framework).

**Spec:** [docs/superpowers/specs/2026-10-07-properties-archive-design.md](../specs/2026-10-07-properties-archive-design.md)

## Global Constraints

- Only singletons get explicit `_id`s; every other document lets Sanity generate its id (AGENTS.md).
- Categorisation is referenced documents: filter options come from the query result, never a list in code; a taxonomy's slug is its key and its title the label.
- GROQ fragments are constants, never functions (a function call in `defineQuery` widens the type to `string`).
- Derive component prop types from the generated query result types (`frontend/sanity/lib/types.ts`, `components/cards/types.ts`).
- A link that is empty or `#` renders no link (`realHref`). Never invent URLs.
- Anything rendered must degrade, not throw: taxonomy references can dereference to `null`.
- Do not import the Figma photos; commit no hotlinked Figma asset.
- Dataset writes (migration, page seed, menu link) are dry-run first and run only with the user's go-ahead. Never delete the `project` documents.
- Do not start any preview server (AGENTS.local.md); the user starts one to review.
- Run seeds/migrations via `cd studio && npx sanity exec scripts/<name>.ts --with-user-token [-- --dry]`.
- Commit only the paths each task names, never `git add -A`. Co-author line on every commit: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

1. A property whose property type or resource was unpublished (the reference dereferences to `null`): must not throw, add a tab or option, or match a filter (Task 4 test).
2. `?type=` or `?resource=` with an unknown, blank or repeated slug: ignored or deduped, never an empty-result trap (Task 4 test).
3. Changing a filter must keep every other query parameter and the hash (Task 4 test).
4. A filter combination with no match: a status message and a way to clear, not a blank page (Task 6; reviewed).
5. Re-running the migration: a slug that already has a property is skipped and never edited (Task 2 test); a project with a draft over a published document, and a draft-only project, are both migrated in their own state (Task 2 tests).
6. A property with no image and no default image set: the card keeps its height on the neutral background, no broken image (Task 6; reviewed).
7. Anything other than a `project` that references a `project` must stop the migration, not be left dangling (Task 2 script, dry-run output).

## Gate (run at the end of every task that changes code)

```bash
cd studio && npx tsc --noEmit
cd ../frontend && npm run sanity:typegen && npm run type-check && npm run lint
cd ../frontend && node scripts/verifyStaffFilter.mts && node scripts/verifyPropertyFilter.mts   # once Task 4 exists
cd ../studio && node scripts/migrations/verifyProjectMigration.mts                                  # once Task 2 exists
```

Typegen rewrites the tracked `frontend/sanity.types.ts` and `sanity.schema.json`; a task's commit includes them.

---

### Task 0: Preflight (no code)

**Why:** another session was editing `queries.ts`, `ProjectGrid`, `CardProject`, `FilterTabs`, `seedArchivePages.ts`, `DECISIONS.md` and the generated type files when this plan was written. This plan edits several of them; committing a file with someone else's uncommitted edits would sweep those in.

- [ ] **Step 1: Check the working tree**

Run: `git status --short`
Expected: none of these shows as modified or untracked, apart from untracked `.superpowers/`:
`docs/DECISIONS.md AGENTS.md frontend/sanity/lib/queries.ts frontend/sanity.types.ts sanity.schema.json frontend/components/BlockRenderer.tsx frontend/components/cards/CardProject.tsx frontend/components/cards/types.ts frontend/components/blocks/ProjectGrid.tsx frontend/app/map studio/src/schemaTypes studio/src/structure studio/scripts/seedArchivePages.ts studio/scripts/seedProjects.ts studio/scripts/seedProjectContent.ts studio/scripts/seedBlockGallery.ts`

If any do, **stop and ask the user** to commit or finish that work first (or to say it is safe to include). Do not stash or revert it.

- [ ] **Step 2: Confirm the helpers this plan imports exist and are committed**

Run: `git ls-files frontend/sanity/lib/archiveFilter.ts frontend/components/blocks/useQueryFilter.ts frontend/components/ui/FilterTabs.tsx`
Expected: all three paths printed (tracked).

- [ ] **Step 3: Read the Next.js docs this plan relies on**

Read the relevant files under `node_modules/next/dist/docs/` for `useSearchParams` (Suspense requirement on static pages) and `next/navigation`. AGENTS.md requires this before Next.js work.

---

### Task 1: The `property` document type (Studio)

**Files:**
- Rename: `studio/src/schemaTypes/documents/project.ts` → `studio/src/schemaTypes/documents/property.ts` (then edit)
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/structure/index.ts`, `studio/src/schemaTypes/objects/mapTeaser.ts`, `studio/src/schemaTypes/objects/projectPreview.ts`, `studio/src/components/BoundaryIdInput.tsx`

**Interfaces:**
- Produces: schema type name `property` (fields: `name`, `slug`, `image`, `description`, `link`, `propertyTypes`, `resources`, `boundaryId`, `location`), exported const `property`.

- [ ] **Step 1: Rename the file and rewrite its identity**

```bash
git mv studio/src/schemaTypes/documents/project.ts studio/src/schemaTypes/documents/property.ts
python3 - <<'EOF'
p = 'studio/src/schemaTypes/documents/property.ts'
s = open(p).read()
pairs = [
    ("export const project = defineType({\n  name: 'project',\n  title: 'Project',",
     "export const property = defineType({\n  name: 'property',\n  title: 'Property',"),
    (" * Replaces the hardcoded list that used to live in frontend/app/map/properties.ts. Categorisation",
     " * Listed on the Properties archive too. It replaced the `project` type (migrated by\n * scripts/migrateProjectsToProperties.ts), which itself replaced the hardcoded list that used to\n * live in frontend/app/map/properties.ts. Categorisation"),
    ("each project points into it by identifier", "each property points into it by identifier"),
    ("description: 'Shown in the map popup.',",
     "description:\n        'Shown in the map popup and on the Properties archive. A property without one shows the default property image from Site Settings.',"),
]
for old, new in pairs:
    assert old in s, old
    s = s.replace(old, new, 1)
open(p, 'w').write(s)
EOF
```

- [ ] **Step 2: Register it**

```bash
python3 - <<'EOF'
def edit(path, pairs):
    s = open(path).read()
    for old, new in pairs:
        assert old in s, (path, old)
        s = s.replace(old, new, 1)
    open(path, 'w').write(s)

edit('studio/src/schemaTypes/index.ts', [
    ("import {project} from './documents/project'", "import {property} from './documents/property'"),
    ("  project,\n", "  property,\n"),
    ("// Categorisation for projects", "// Categorisation for properties"),
])
edit('studio/src/structure/index.ts', [
    ("  // Handled explicitly under Projects below.\n  'project',", "  // Handled explicitly under Properties below.\n  'property',"),
    ("      // Projects: the Land Bank's properties, their categorisation, and the settings that\n      // configure both the projects page and the interactive map.",
     "      // Properties: the Land Bank's properties, their categorisation, and the settings that\n      // configure both the properties pages and the interactive map."),
    ("        .title('Projects')\n        .icon(PinIcon)\n        .child(\n          S.list()\n            .title('Projects')",
     "        .title('Properties')\n        .icon(PinIcon)\n        .child(\n          S.list()\n            .title('Properties')"),
    ("S.documentTypeListItem('project').title('Projects').icon(PinIcon)",
     "S.documentTypeListItem('property').title('Properties').icon(PinIcon)"),
])
edit('studio/src/schemaTypes/objects/mapTeaser.ts', [("to: [{type: 'project'}]", "to: [{type: 'property'}]")])
edit('studio/src/schemaTypes/objects/projectPreview.ts', [("to: [{type: 'project'}]", "to: [{type: 'property'}]")])
edit('studio/src/components/BoundaryIdInput.tsx', [
    ("then reopen this project.", "then reopen this property."),
    ("so this project will not", "so this property will not"),
])
EOF
git diff --stat
```

Expected: 7 files changed (the rename shows as `project.ts => property.ts`). If an `assert` fails, the surrounding text differs: read the file, fix the old string to match, and re-run (the edits are applied per file only after all asserts in that file pass).

- [ ] **Step 3: Verify the schema compiles and validates**

Run: `cd studio && npx tsc --noEmit && npx sanity schema validate`
Expected: `tsc` prints nothing; schema validate reports no errors (warnings that existed before are fine).

- [ ] **Step 4: Commit**

```bash
git add studio/src/schemaTypes/documents/property.ts studio/src/schemaTypes/documents/project.ts studio/src/schemaTypes/index.ts studio/src/structure/index.ts studio/src/schemaTypes/objects/mapTeaser.ts studio/src/schemaTypes/objects/projectPreview.ts studio/src/components/BoundaryIdInput.tsx
git commit -m "feat: add the property document type in place of project

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migrating projects to properties (TDD + dry-run script)

**Files:**
- Create: `studio/scripts/migrations/projectsToProperties.ts` (pure, no imports)
- Create: `studio/scripts/migrations/verifyProjectMigration.mts`
- Create: `studio/scripts/migrateProjectsToProperties.ts`
- Create: `studio/scripts/verifyPropertyMigration.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `planProperties(docs: SourceDoc[], existingSlugs: ReadonlySet<string>): {create: PlannedProperty[]; skipped: Array<{slug: string; reason: string}>; issues: string[]}` where `PlannedProperty = {slug: string; name: string; sourceId: string; published?: Fields; draft?: Fields}` and `Fields = Record<string, unknown>`; `COPIED_FIELDS`.

- [ ] **Step 1: Write the failing check**

`studio/scripts/migrations/verifyProjectMigration.mts`:

```ts
/**
 * Verifies the project -> property planning (projectsToProperties.ts). No test framework, so a
 * plain script:
 *
 *   cd studio && node scripts/migrations/verifyProjectMigration.mts
 *
 * Imports the real module, not a copy. Exits non-zero on failure.
 */
import {COPIED_FIELDS, planProperties} from './projectsToProperties.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) console.log(`  ok   ${message}`)
  else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const ref = (id: string) => ({_key: `k-${id}`, _type: 'reference', _ref: id})
const full = {
  _id: 'p1',
  _type: 'project',
  _rev: 'r',
  _createdAt: 'x',
  _updatedAt: 'y',
  name: 'Long Pond',
  slug: {_type: 'slug', current: 'long-pond'},
  image: {_type: 'image', asset: {_type: 'reference', _ref: 'image-1'}, alt: 'A pond'},
  description: 'A pond.',
  link: '/long-pond',
  propertyTypes: [ref('t1')],
  resources: [ref('r1'), ref('r2')],
  boundaryId: 'long-pond',
  location: {_type: 'geopoint', lat: 41, lng: -70},
  somethingElse: 'not a property field',
}

const published = planProperties([full], new Set())
same(published.create.length, 1, 'a published project is planned')
same(published.create[0].slug, 'long-pond', 'the plan is keyed by slug')
same(published.create[0].draft, undefined, 'a published-only project gets no draft')
same(Object.keys(published.create[0].published ?? {}).sort(), [...COPIED_FIELDS].sort(), 'exactly the property fields are copied')
same(published.create[0].published?.propertyTypes, full.propertyTypes, 'reference arrays are copied with their keys')
same(published.create[0].published?.location, full.location, 'the marker is copied exactly')

const sparse = planProperties([{_id: 'p2', _type: 'project', name: 'Bare', slug: {current: 'bare'}, image: null, boundaryId: null}], new Set())
same(Object.keys(sparse.create[0].published ?? {}), ['name', 'slug'], 'null and missing fields are left out')

const draftOnly = planProperties([{...full, _id: 'drafts.p3', slug: {current: 'draft-only'}}], new Set())
same([draftOnly.create[0].published, !!draftOnly.create[0].draft], [undefined, true], 'a draft-only project stays a draft')

const both = planProperties(
  [full, {...full, _id: 'drafts.p1', name: 'Long Pond (edited)'}],
  new Set(),
)
same(both.create.length, 1, 'a published project and its draft are one property')
same([both.create[0].published?.name, both.create[0].draft?.name], ['Long Pond', 'Long Pond (edited)'], 'both states are kept')
same(both.create[0].name, 'Long Pond (edited)', 'the planned name is the latest edit')

const existing = planProperties([full], new Set(['long-pond']))
same(existing.create.length, 0, 'a slug that already has a property is not planned')
same(existing.skipped, [{slug: 'long-pond', reason: 'a property with this slug already exists'}], 'and is reported as skipped')

const noSlug = planProperties([{_id: 'p4', _type: 'project', name: 'No slug'}], new Set())
same([noSlug.create.length, noSlug.issues.length], [0, 1], 'a project with no slug is reported, not migrated')

const dup = planProperties([full, {...full, _id: 'p5'}], new Set())
same([dup.create.length, dup.issues.length], [1, 1], 'a second project with the same slug is reported, not migrated')

process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd studio && node scripts/migrations/verifyProjectMigration.mts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `projectsToProperties.ts`.

- [ ] **Step 3: Write the module**

`studio/scripts/migrations/projectsToProperties.ts`:

```ts
/**
 * Pure planning for the project -> property migration (migrateProjectsToProperties.ts). No
 * imports, so the check script can load it directly (verifyProjectMigration.mts).
 */

export type SourceDoc = {
  _id: string
  _type: string
  name?: string
  slug?: {current?: string} | null
  [field: string]: unknown
}

type Fields = Record<string, unknown>

export type PlannedProperty = {
  slug: string
  name: string
  /** The project's id with any `drafts.` prefix removed. */
  sourceId: string
  published?: Fields
  draft?: Fields
}

/** Every field a property carries over from its project; anything else is dropped. */
export const COPIED_FIELDS = [
  'name',
  'slug',
  'image',
  'description',
  'link',
  'propertyTypes',
  'resources',
  'boundaryId',
  'location',
] as const

const isDraft = (id: string) => id.startsWith('drafts.')
const baseId = (id: string) => id.replace(/^drafts\./, '')

function copyFields(doc: SourceDoc): Fields {
  const out: Fields = {}
  for (const field of COPIED_FIELDS) {
    const value = doc[field]
    if (value !== undefined && value !== null) out[field] = value
  }
  return out
}

/**
 * One planned property per project, in the same publish state: a published project is created
 * published, a project with unpublished edits also gets that draft, a draft-only project is only
 * a draft. A project and its draft share a base id, so they are one property. Matching is by
 * slug: a slug that already has a property is skipped, and so is a second project reusing a slug.
 */
export function planProperties(
  docs: SourceDoc[],
  existingSlugs: ReadonlySet<string>,
): {create: PlannedProperty[]; skipped: Array<{slug: string; reason: string}>; issues: string[]} {
  const groups = new Map<string, {published?: SourceDoc; draft?: SourceDoc}>()
  for (const doc of docs) {
    const group = groups.get(baseId(doc._id)) ?? {}
    if (isDraft(doc._id)) group.draft = doc
    else group.published = doc
    groups.set(baseId(doc._id), group)
  }

  const create: PlannedProperty[] = []
  const skipped: Array<{slug: string; reason: string}> = []
  const issues: string[] = []
  const seen = new Set<string>()

  for (const [id, group] of [...groups].sort(([a], [b]) => a.localeCompare(b))) {
    const latest = group.draft ?? group.published
    const slug = latest?.slug?.current?.trim()
    if (!slug) {
      issues.push(`${id}: has no slug, not migrated`)
      continue
    }
    if (seen.has(slug)) {
      issues.push(`${id}: slug "${slug}" is already used by another project, not migrated`)
      continue
    }
    seen.add(slug)
    if (existingSlugs.has(slug)) {
      skipped.push({slug, reason: 'a property with this slug already exists'})
      continue
    }
    create.push({
      slug,
      name: String(latest?.name ?? slug),
      sourceId: id,
      ...(group.published ? {published: copyFields(group.published)} : {}),
      ...(group.draft ? {draft: copyFields(group.draft)} : {}),
    })
  }
  return {create, skipped, issues}
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd studio && node scripts/migrations/verifyProjectMigration.mts; echo "exit $?"`
Expected: every line `ok`, `exit 0`.

- [ ] **Step 5: Write the migration script**

`studio/scripts/migrateProjectsToProperties.ts`:

```ts
/**
 * Copies every `project` document into a `property` document, in the same publish state, so the
 * map and the Properties archive can read `property`.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/migrateProjectsToProperties.ts --with-user-token -- --dry
 *   npx sanity exec scripts/migrateProjectsToProperties.ts --with-user-token
 *   npx sanity exec scripts/verifyPropertyMigration.ts --with-user-token
 *
 * What it writes: one `property` per project (Sanity generates every id, per the project rule). A
 * published project becomes a published property; one with unpublished edits also gets that draft;
 * a draft-only project becomes a draft. Images are the same assets (not re-uploaded) and taxonomy
 * references are copied as they are.
 *
 * Idempotent and non-destructive: a project is matched on its slug; if a property with that slug
 * exists the project is skipped and the property is NEVER edited. The `project` documents are left
 * in place; delete them yourself once the map is checked.
 *
 * It REFUSES to run (dry or real) if any document other than a project references a project,
 * because re-pointing references is not built: nothing referenced a project when it was written.
 *
 * --dry prints the plan and writes nothing (except migration-plan.json). A report mapping each
 * project to its property is written to scripts/data/migrations/ (git-ignored).
 */

import {mkdirSync, writeFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {planProperties, type SourceDoc} from './migrations/projectsToProperties'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const DATA_DIR = resolve(__dirname, 'data/migrations')

async function main() {
  const projects = await client.fetch<SourceDoc[]>(`*[_type == "project"]`)
  console.log(`${projects.length} project document(s) found.`)

  const referrers = await client.fetch<Array<{_id: string; _type: string}>>(
    `*[_type != "project" && references(*[_type == "project"]._id)]{_id, _type}`,
  )
  if (referrers.length > 0) {
    console.error('Refusing to migrate: these documents reference a project, and re-pointing is not built:')
    referrers.forEach((doc) => console.error(`  ${doc._type} ${doc._id}`))
    process.exit(1)
  }

  const existing = await client.fetch<Array<{slug?: string}>>(`*[_type == "property"]{"slug": slug.current}`)
  const existingSlugs = new Set(existing.flatMap((doc) => (doc.slug ? [doc.slug] : [])))

  const {create, skipped, issues} = planProperties(projects, existingSlugs)
  console.log(
    `Plan: ${create.length} to create (${create.filter((p) => p.published).length} published, ${
      create.filter((p) => p.draft).length
    } with a draft), ${skipped.length} skipped, ${issues.length} issue(s).`,
  )
  issues.forEach((issue) => console.log(`  ! ${issue}`))
  skipped.forEach((item) => console.log(`  = ${item.slug}: ${item.reason}`))

  const created: Array<{slug: string; sourceId: string; propertyId: string; draft: boolean}> = []
  for (const item of create) {
    if (DRY_RUN) {
      console.log(
        `  [dry run] would create ${item.slug}${item.published ? ' (published)' : ''}${item.draft ? ' (draft)' : ''}`,
      )
      continue
    }
    let propertyId: string
    if (item.published) {
      const doc = await client.create({_type: 'property', ...item.published} as never)
      propertyId = doc._id
      if (item.draft) {
        await client.createOrReplace({...item.draft, _id: `drafts.${propertyId}`, _type: 'property'} as never)
      }
    } else {
      const doc = await client.create({_id: 'drafts.', _type: 'property', ...item.draft} as never)
      propertyId = doc._id.replace(/^drafts\./, '')
    }
    console.log(`  + ${item.slug} (${propertyId})`)
    created.push({slug: item.slug, sourceId: item.sourceId, propertyId, draft: Boolean(item.draft)})
  }

  console.log(`${DRY_RUN ? '[dry run] ' : ''}${DRY_RUN ? create.length : created.length} created.`)
  mkdirSync(DATA_DIR, {recursive: true})
  writeFileSync(
    resolve(DATA_DIR, DRY_RUN ? 'migration-plan.json' : 'migration-report.json'),
    JSON.stringify({at: new Date().toISOString(), issues, skipped, created}, null, 2),
  )
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 6: Write the validation script**

`studio/scripts/verifyPropertyMigration.ts`:

```ts
/**
 * Validates the migrated properties against the projects they came from. Read-only.
 *
 *   npx sanity exec scripts/verifyPropertyMigration.ts --with-user-token
 *
 * For every project: exactly one property with its slug, in the same publish state, with every
 * copied field equal. Also compares the totals. Exits non-zero when anything does not match.
 */

import {getCliClient} from 'sanity/cli'

import {COPIED_FIELDS, planProperties, type SourceDoc} from './migrations/projectsToProperties'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )

let failures = 0
function check(ok: boolean, message: string) {
  if (ok) return
  console.error(`  FAIL ${message}`)
  failures += 1
}

async function main() {
  const projects = await client.fetch<SourceDoc[]>(`*[_type == "project"]`)
  const properties = await client.fetch<SourceDoc[]>(`*[_type == "property"]`)
  const {create: planned, issues} = planProperties(projects, new Set())
  console.log(`${projects.length} project document(s), ${properties.length} property document(s), ${planned.length} planned.`)
  issues.forEach((issue) => console.log(`  ! ${issue}`))

  let published = 0
  let drafts = 0
  for (const item of planned) {
    const matches = properties.filter((doc) => doc.slug?.current === item.slug)
    check(matches.length > 0 && matches.length <= 2, `${item.slug}: expected one property (and at most one draft), found ${matches.length}`)
    const pub = matches.find((doc) => !doc._id.startsWith('drafts.'))
    const draft = matches.find((doc) => doc._id.startsWith('drafts.'))
    check(Boolean(pub) === Boolean(item.published), `${item.slug}: published state differs`)
    check(Boolean(draft) === Boolean(item.draft), `${item.slug}: draft state differs`)
    if (pub) published += 1
    if (draft) drafts += 1
    for (const [doc, fields] of [[pub, item.published], [draft, item.draft]] as const) {
      if (!doc || !fields) continue
      for (const field of COPIED_FIELDS) {
        check(canonical(doc[field] ?? null) === canonical(fields[field] ?? null), `${item.slug}: ${field} differs`)
      }
    }
  }
  console.log(`${published} published and ${drafts} draft propert${published + drafts === 1 ? 'y' : 'ies'} checked.`)
  console.log(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 7: Ignore the report folder, type-check, commit**

```bash
printf '\n# Migration reports (generated)\nstudio/scripts/data/migrations/\n' >> .gitignore
cd studio && npx tsc --noEmit && node scripts/migrations/verifyProjectMigration.mts >/dev/null && echo CHECK-OK
cd .. && git add .gitignore studio/scripts/migrations studio/scripts/migrateProjectsToProperties.ts studio/scripts/verifyPropertyMigration.ts
git commit -m "feat: add the project-to-property migration with a check and a validation script

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
Expected: `CHECK-OK` printed, then the commit.

- [ ] **Step 8: Dry run (writes nothing) and read the plan**

Run: `cd studio && npx sanity exec scripts/migrateProjectsToProperties.ts --with-user-token -- --dry 2>&1 | tail -30`
Expected: `152 project document(s) found.`, a plan line, **no** "Refusing to migrate", and `[dry run] N created.` Check the counts against the dataset (150 published, 2 drafts at plan time). Show the user the plan.

- [ ] **Step 9: STOP: ask the user for the go-ahead to write**

State exactly what the real run does (creates ~152 properties, leaves projects). Only after "run it": `npx sanity exec scripts/migrateProjectsToProperties.ts --with-user-token`, then `npx sanity exec scripts/verifyPropertyMigration.ts --with-user-token`. Expected: `All checks passed.` If the user declines or defers, continue with the remaining tasks (they do not need the data) and say the map shows nothing until it runs.

---

### Task 3: Point the map and the project blocks at `property` (frontend)

**Files:**
- Modify: `frontend/sanity/lib/queries.ts` (`projectsQuery` → `propertiesQuery`; the `projectGrid` branch reads `property`)
- Modify: `frontend/app/map/page.tsx`, `frontend/app/map/types.ts`, `frontend/app/map/MapExplorer.tsx`, `frontend/app/map/MapboxMap.tsx`
- Modify: `studio/scripts/seedProjects.ts`, `studio/scripts/seedProjectContent.ts`, `studio/scripts/seedBlockGallery.ts` (type literals only)
- Regenerate: `frontend/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Consumes: schema type `property` (Task 1).
- Produces: exported query `propertiesQuery` and generated `PropertiesQueryResult`; map type `Property` in `app/map/types.ts` (was `Project`).

- [ ] **Step 1: Edit the queries and the map**

```bash
python3 - <<'EOF'
import re

def edit(path, pairs):
    s = open(path).read()
    for old, new in pairs:
        assert old in s, (path, old)
        s = s.replace(old, new)
    open(path, 'w').write(s)

edit('frontend/sanity/lib/queries.ts', [
    (" * Projects (the Land Bank properties shown on the interactive map).", " * Properties (the Land Bank properties shown on the interactive map and the archive)."),
    ("export const projectsQuery = defineQuery(`\n  *[_type == \"project\" && defined(slug.current)]", "export const propertiesQuery = defineQuery(`\n  *[_type == \"property\" && defined(slug.current)]"),
    ("boundaryId says which feature in it belongs to this project.", "boundaryId says which feature in it belongs to this property."),
    ("      \"projects\": *[_type == \"project\" && defined(slug.current)] | order(name asc) {", "      \"projects\": *[_type == \"property\" && defined(slug.current)] | order(name asc) {"),
])
edit('frontend/app/map/page.tsx', [
    ("import {mapFiltersQuery, mapSettingsQuery, projectsQuery}", "import {mapFiltersQuery, mapSettingsQuery, propertiesQuery}"),
    ("sanityFetch({query: projectsQuery})", "sanityFetch({query: propertiesQuery})"),
    ("it is now project / propertyType / resource documents in Sanity.", "it is now property / propertyType / resource documents in Sanity."),
])
edit('frontend/app/map/types.ts', [
    ("  ProjectsQueryResult,", "  PropertiesQueryResult,"),
    ("export type Project = ProjectsQueryResult[number]", "export type Property = PropertiesQueryResult[number]"),
    ("project / propertyType / resource documents in Sanity", "property / propertyType / resource documents in Sanity"),
])
for path in ['frontend/app/map/MapExplorer.tsx', 'frontend/app/map/MapboxMap.tsx']:
    s = open(path).read()
    s2 = re.sub(r'\bProject\b(?!\s+Settings)', 'Property', s)
    assert s2 != s, path
    open(path, 'w').write(s2)

for path in ['studio/scripts/seedProjects.ts', 'studio/scripts/seedProjectContent.ts', 'studio/scripts/seedBlockGallery.ts']:
    s = open(path).read()
    s2 = s.replace('_type == "project"', '_type == "property"').replace("_type: 'project'", "_type: 'property'")
    assert s2 != s, path
    open(path, 'w').write(s2)
EOF
git diff -- frontend/app/map | grep '^[+-]' | grep -v '^+++\|^---'
```
Expected: the printed diff shows only `Project`→`Property` type names and the query/import renames; no "Project Settings" text changed. If a comment reads oddly, fix it by hand.

- [ ] **Step 2: Regenerate types and gate**

Run: `cd frontend && npm run sanity:typegen && npm run type-check && npm run lint`
Expected: typegen succeeds, `type-check` and `lint` print no errors. (`PropertiesQueryResult` now exists; `ProjectsQueryResult` is gone.)

- [ ] **Step 3: Confirm nothing still names the old type in code**

Run: `grep -rn --exclude-dir=node_modules --exclude-dir=.next --exclude=sanity.types.ts --exclude=sanity.schema.json -E "_type == \"project\"|_type: 'project'|type: 'project'|projectsQuery|ProjectsQueryResult" frontend studio/src studio/scripts | grep -v migrateProjectsToProperties | grep -v verifyPropertyMigration | grep -v migrations/`
Expected: no output.

- [ ] **Step 4: Commit**

```bash
git add frontend/sanity/lib/queries.ts frontend/app/map frontend/sanity.types.ts sanity.schema.json studio/scripts/seedProjects.ts studio/scripts/seedProjectContent.ts studio/scripts/seedBlockGallery.ts
git commit -m "refactor: read properties instead of projects in the map, the project blocks and the seeds

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The property filter (TDD)

**Files:**
- Create: `frontend/sanity/lib/propertyFilter.ts`
- Create: `frontend/scripts/verifyPropertyFilter.mts`

**Interfaces:**
- Consumes: `categoryTabs`, `FilterTab` from `./archiveFilter.ts` (`FilterTab = {slug: string; title: string}`).
- Produces (all from `propertyFilter.ts`):
  - `PROPERTY_TYPE_PARAM = 'type'`, `PROPERTY_RESOURCE_PARAM = 'resource'`
  - `type PropertySelection = {types: string[]; resources: string[]}`; `EMPTY_SELECTION`
  - `propertyTypeOptions(properties): FilterTab[]`, `resourceOptions(properties): FilterTab[]`
  - `filterProperties<T>(properties: T[], selection: PropertySelection): T[]`
  - `parseSelection(search: string, typeOptions: FilterTab[], resourceOptions: FilterTab[]): PropertySelection`
  - `withSelection(search: string, selection: PropertySelection): string` ('' or '?…')
  - `toggleSlug(list: string[], slug: string): string[]`, `hasSelection(selection): boolean`

- [ ] **Step 1: Write the failing check**

`frontend/scripts/verifyPropertyFilter.mts`:

```ts
/**
 * Verifies the Properties archive filter. No test framework, so a plain script:
 *
 *   cd frontend && node scripts/verifyPropertyFilter.mts
 *
 * Imports the real helpers, not a copy. Exits non-zero on failure.
 */
import {
  EMPTY_SELECTION,
  filterProperties,
  hasSelection,
  parseSelection,
  propertyTypeOptions,
  resourceOptions,
  toggleSlug,
  withSelection,
} from '../sanity/lib/propertyFilter.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) console.log(`  ok   ${message}`)
  else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const park = {slug: 'park', title: 'Park', order: 20}
const trail = {slug: 'trail', title: 'Trail', order: 30}
const beach = {slug: 'beach', title: 'Beach', order: 10}
const dogs = {slug: 'dogs', title: 'Dog friendly', order: 10}
const parking = {slug: 'parking', title: 'Parking', order: 20}

const properties = [
  {name: 'a', propertyTypes: [park, trail], resources: [dogs]},
  {name: 'b', propertyTypes: [park], resources: [dogs, parking]},
  {name: 'c', propertyTypes: [beach], resources: [parking]},
  {name: 'd', propertyTypes: [null, {slug: 'x', title: null, order: null}], resources: null},
  {name: 'e'},
]

same(propertyTypeOptions(properties).map((o) => o.slug), ['beach', 'park', 'trail'], 'type options are those in use, in their own order, ignoring unpublished ones')
same(resourceOptions(properties).map((o) => o.slug), ['dogs', 'parking'], 'resource options are those in use, in their own order')

const names = (selection: Parameters<typeof filterProperties>[1]) => filterProperties(properties, selection).map((p) => p.name)
same(names(EMPTY_SELECTION), ['a', 'b', 'c', 'd', 'e'], 'no selection keeps every property')
same(names({types: ['park'], resources: []}), ['a', 'b'], 'one type keeps properties with it')
same(names({types: ['park', 'beach'], resources: []}), ['a', 'b', 'c'], 'several types in a group are OR')
same(names({types: ['park'], resources: ['parking']}), ['b'], 'groups are AND')
same(names({types: ['trail'], resources: ['parking']}), [], 'no match gives an empty list')
same(names({types: [], resources: ['dogs', 'parking']}), ['a', 'b', 'c'], 'several resources are OR')
same(names({types: ['x'], resources: []}), [], 'a property with an unpublished type never matches it')

const typeOptions = propertyTypeOptions(properties)
const resOptions = resourceOptions(properties)
same(parseSelection('?type=park,trail&resource=dogs', typeOptions, resOptions), {types: ['park', 'trail'], resources: ['dogs']}, 'known slugs are read from the address')
same(parseSelection('?type=nope,park,,park', typeOptions, resOptions).types, ['park'], 'unknown, blank and repeated slugs are ignored')
same(parseSelection('?type=dogs', typeOptions, resOptions), EMPTY_SELECTION, 'a slug from the other group is ignored')
same(parseSelection('', typeOptions, resOptions), EMPTY_SELECTION, 'an empty address selects nothing')
same(parseSelection('?type=trail,beach', typeOptions, resOptions).types, ['beach', 'trail'], 'the selection follows the option order')

same(withSelection('', {types: ['park', 'trail'], resources: ['dogs']}), '?type=park,trail&resource=dogs', 'the selection is written with literal commas')
same(withSelection('?utm=1&type=old#x', {types: [], resources: ['dogs']}), '?utm=1&resource=dogs', 'other parameters are kept and a cleared group is removed')
same(withSelection('?utm=1&type=park', EMPTY_SELECTION), '?utm=1', 'clearing everything keeps other parameters')
same(withSelection('?type=park', EMPTY_SELECTION), '', 'clearing everything leaves no query string')
same(withSelection('', {types: ['a b'], resources: []}), '?type=a%20b', 'a slug is encoded')

same(toggleSlug(['a'], 'b'), ['a', 'b'], 'toggling adds a slug')
same(toggleSlug(['a', 'b'], 'a'), ['b'], 'toggling removes a slug')
same([hasSelection(EMPTY_SELECTION), hasSelection({types: ['a'], resources: []})], [false, true], 'hasSelection')

process.exit(failed ? 1 : 0)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && node scripts/verifyPropertyFilter.mts`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `propertyFilter.ts`.

- [ ] **Step 3: Write the module**

`frontend/sanity/lib/propertyFilter.ts`:

```ts
import {type FilterTab, categoryTabs} from './archiveFilter.ts'

export const PROPERTY_TYPE_PARAM = 'type'
export const PROPERTY_RESOURCE_PARAM = 'resource'

export type PropertySelection = {types: string[]; resources: string[]}
export const EMPTY_SELECTION: PropertySelection = {types: [], resources: []}

type Category = {slug?: string | null; title?: string | null; order?: number | null} | null
type Filterable = {
  propertyTypes?: ReadonlyArray<Category> | null
  resources?: ReadonlyArray<Category> | null
}

/** The Property Type options: one per type that at least one property has, in the type's own order. */
export const propertyTypeOptions = (properties: ReadonlyArray<Filterable>): FilterTab[] =>
  categoryTabs(properties.flatMap((property) => property.propertyTypes ?? []))

/** The Resources options, built the same way. */
export const resourceOptions = (properties: ReadonlyArray<Filterable>): FilterTab[] =>
  categoryTabs(properties.flatMap((property) => property.resources ?? []))

const hasAny = (categories: ReadonlyArray<Category> | null | undefined, wanted: string[]) =>
  wanted.length === 0 || (categories ?? []).some((category) => category?.slug && wanted.includes(category.slug))

/**
 * The properties that match: any of the chosen options within a group, and every group that has a
 * choice. A group with no choice adds no condition.
 */
export function filterProperties<T extends Filterable>(properties: T[], selection: PropertySelection): T[] {
  return properties.filter(
    (property) => hasAny(property.propertyTypes, selection.types) && hasAny(property.resources, selection.resources),
  )
}

export const hasSelection = (selection: PropertySelection) =>
  selection.types.length > 0 || selection.resources.length > 0

export const toggleSlug = (list: string[], slug: string): string[] =>
  list.includes(slug) ? list.filter((item) => item !== slug) : [...list, slug]

function read(params: URLSearchParams, param: string, options: ReadonlyArray<FilterTab>): string[] {
  const asked = (params.get(param) ?? '').split(',')
  // Option order, each once, only slugs the group actually offers.
  return options.map((option) => option.slug).filter((slug) => asked.includes(slug))
}

/** The selection in an address's query string; unknown, blank and repeated slugs are dropped. */
export function parseSelection(
  search: string,
  typeOptions: ReadonlyArray<FilterTab>,
  resourceChoices: ReadonlyArray<FilterTab>,
): PropertySelection {
  const params = new URLSearchParams(search)
  return {
    types: read(params, PROPERTY_TYPE_PARAM, typeOptions),
    resources: read(params, PROPERTY_RESOURCE_PARAM, resourceChoices),
  }
}

/**
 * A query string with the selection set (a group with no choice is removed), keeping every other
 * parameter. Returns '' or a string starting with '?'. Slugs are joined with literal commas.
 */
export function withSelection(search: string, selection: PropertySelection): string {
  const params = new URLSearchParams(search)
  params.delete(PROPERTY_TYPE_PARAM)
  params.delete(PROPERTY_RESOURCE_PARAM)
  const parts = [params.toString()]
  const write = (param: string, slugs: string[]) => {
    if (slugs.length > 0) parts.push(`${param}=${slugs.map(encodeURIComponent).join(',')}`)
  }
  write(PROPERTY_TYPE_PARAM, selection.types)
  write(PROPERTY_RESOURCE_PARAM, selection.resources)
  const query = parts.filter(Boolean).join('&')
  return query ? `?${query}` : ''
}
```

- [ ] **Step 4: Run it and watch it pass; run the staff check too**

Run: `cd frontend && node scripts/verifyPropertyFilter.mts; echo "exit $?"; node scripts/verifyStaffFilter.mts >/dev/null; echo "staff exit $?"`
Expected: every line `ok`, `exit 0`, `staff exit 0`.

- [ ] **Step 5: Lint, type-check, commit**

```bash
cd frontend && npm run type-check && npm run lint
cd .. && git add frontend/sanity/lib/propertyFilter.ts frontend/scripts/verifyPropertyFilter.mts
git commit -m "feat: add the property filter with a check script

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: The default image setting, the Property Archive block schema and its query

**Files:**
- Modify: `studio/src/schemaTypes/singletons/settings.tsx` (new field before `ogImage`)
- Create: `studio/src/schemaTypes/objects/propertyArchive.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/schemaTypes/documents/page.ts` (register the block)
- Modify: `frontend/sanity/lib/queries.ts` (block branch), `frontend/components/cards/types.ts` (types)
- Regenerate: `frontend/sanity.types.ts`, `sanity.schema.json`

**Interfaces:**
- Produces: block `_type == "propertyArchive"` with query fields `properties[]` (`_id`, `name`, `description`, `link`, `image`, `propertyTypes[]{slug,title,order}|null`, `resources[]{…}|null`) and `defaultImage` (image or null); types `PropertyItem`, `PropertyDefaultImage` in `components/cards/types.ts`; settings field `defaultPropertyImage`.

- [ ] **Step 1: The settings field**

```bash
python3 - <<'EOF'
p = 'studio/src/schemaTypes/singletons/settings.tsx'
s = open(p).read()
anchor = "    defineField({\n      name: 'ogImage',"
assert s.count(anchor) == 1
field = """    defineField({
      name: 'defaultPropertyImage',
      title: 'Default property image',
      type: 'image',
      description: 'Shown on a property that has no image of its own.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Important for accessibility and SEO.',
          validation: (rule) =>
            rule.custom((alt, context) => {
              const image = context.document?.defaultPropertyImage as {asset?: {_ref?: string}} | undefined
              return image?.asset?._ref && !alt ? 'Required' : true
            }),
        }),
      ],
    }),
"""
s = s.replace(anchor, field + anchor)
open(p, 'w').write(s)
EOF
```

- [ ] **Step 2: The block schema**

`studio/src/schemaTypes/objects/propertyArchive.ts`:

```ts
import {PinIcon} from '@sanity/icons'

import {defineBlock} from './blockFields'

/**
 * Every Land Bank property as a card, with Property Type and Resources filters above them (the
 * Properties archive). It has no fields of its own: the properties come from Properties, the
 * filter options from the types and resources they use, and the fallback image from Site Settings.
 */
export const propertyArchive = defineBlock({
  name: 'propertyArchive',
  title: 'Property Archive',
  type: 'object',
  icon: PinIcon,
  fields: [],
  preview: {
    select: {},
    prepare: () => ({title: 'Property Archive', subtitle: 'Every property, with filters'}),
  },
})
```

- [ ] **Step 3: Register it** (the page's block list sorts itself by title)

```bash
python3 - <<'EOF'
def edit(path, pairs):
    s = open(path).read()
    for old, new in pairs:
        assert s.count(old) == 1, (path, old)
        s = s.replace(old, new)
    open(path, 'w').write(s)

edit('studio/src/schemaTypes/index.ts', [
    ("import {projectGrid} from './objects/projectGrid'", "import {projectGrid} from './objects/projectGrid'\nimport {propertyArchive} from './objects/propertyArchive'"),
    ("  projectGrid,\n", "  projectGrid,\n  propertyArchive,\n"),
])
edit('studio/src/schemaTypes/documents/page.ts', [
    ("import {projectGrid} from '../objects/projectGrid'", "import {projectGrid} from '../objects/projectGrid'\nimport {propertyArchive} from '../objects/propertyArchive'"),
    ("  projectGrid,\n  projectPreview,\n", "  projectGrid,\n  projectPreview,\n  propertyArchive,\n"),
])
EOF
```
Expected: no assertion error. If `projectGrid,\n` appears twice in `index.ts` (import vs list), the first assert reports it: make the old string longer (`  projectGrid,\n  projectPreview,\n`) and re-run.

- [ ] **Step 4: The query branch and the types**

```bash
python3 - <<'EOF'
p = 'frontend/sanity/lib/queries.ts'
s = open(p).read()
anchor = '    _type == "imageCarousel" => {'
assert s.count(anchor) == 1
branch = '''    _type == "propertyArchive" => {
      ...,
      "properties": *[_type == "property" && defined(slug.current)] | order(name asc) {
        _id,
        name,
        description,
        link,
        image,
        "propertyTypes": propertyTypes[]->{"slug": slug.current, title, order},
        "resources": resources[]->{"slug": slug.current, title, order}
      },
      "defaultImage": *[_type == "settings" && _id == "siteSettings"][0].defaultPropertyImage
    },
'''
s = s.replace(anchor, branch + anchor)
open(p, 'w').write(s)

p = 'frontend/components/cards/types.ts'
s = open(p).read()
s += """export type PropertyItem = NonNullable<ExtractPageBuilderType<'propertyArchive'>['properties']>[number]
export type PropertyDefaultImage = ExtractPageBuilderType<'propertyArchive'>['defaultImage']
"""
open(p, 'w').write(s)
EOF
```

- [ ] **Step 5: Gate**

Run: `cd studio && npx tsc --noEmit && npx sanity schema validate && cd ../frontend && npm run sanity:typegen && npm run type-check && npm run lint`
Expected: all clean. `grep -c "propertyArchive" frontend/sanity.types.ts` is at least 1, and `PropertyItem` resolves (no type error in `cards/types.ts`).

- [ ] **Step 6: Commit**

```bash
git add studio/src/schemaTypes/singletons/settings.tsx studio/src/schemaTypes/objects/propertyArchive.ts studio/src/schemaTypes/index.ts studio/src/schemaTypes/documents/page.ts frontend/sanity/lib/queries.ts frontend/components/cards/types.ts frontend/sanity.types.ts sanity.schema.json
git commit -m "feat: add the Property Archive block schema, its query and the default property image

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: The archive UI

**Files:**
- Create: `frontend/components/cards/CardProperty.tsx`
- Create: `frontend/components/blocks/PropertyFilterMenu.tsx`, `PropertyArchiveView.tsx`, `PropertyFilter.tsx`, `usePropertySelection.ts`, `PropertyArchive.tsx`
- Modify: `frontend/components/BlockRenderer.tsx`

**Interfaces:**
- Consumes: Task 4 helpers; `PropertyItem`, `PropertyDefaultImage` (Task 5); `BlockImage`, `Tag`, `realHref`, `ChevronDownIcon`/`ChevronUpIcon` (`@/components/icons`, `className` prop, `currentColor`), `FilterTab` from `@/sanity/lib/archiveFilter`.
- Produces: default export `PropertyArchive` registered as `propertyArchive` in `BlockRenderer`.

There is no unit test for components (no framework, no preview server by rule); correctness is `type-check`, `lint`, the Task 4 check for the logic, and the user's review in Presentation.

- [ ] **Step 1: The card**

`frontend/components/cards/CardProperty.tsx`:

```tsx
import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'
import {realHref} from '@/sanity/lib/utils'

import type {PropertyDefaultImage, PropertyItem} from './types'

/**
 * A property on the archive (Figma: image, name, type tags, a two-line description). The image
 * area sits on the neutral background the staff cards use, so a property with no image of its own
 * and no site default still holds its height.
 */
export default function CardProperty({
  property,
  defaultImage,
}: {
  property: PropertyItem
  defaultImage: PropertyDefaultImage
}) {
  // Taxonomies that were unpublished dereference to null.
  const tags = (property.propertyTypes ?? []).flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const image = property.image?.asset?._ref ? property.image : defaultImage
  const card = (
    <div className="flex w-full flex-col items-start gap-6">
      <div className="relative h-[370px] w-full shrink-0 overflow-hidden rounded bg-on-background-tonal">
        <BlockImage
          image={image}
          width={900}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          fill
          className="absolute inset-0 size-full object-cover"
        />
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <p className="w-full break-words text-headline-base leading-[1.1] tracking-normal text-on-background">
          {property.name}
        </p>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.key} label={tag.label} />
            ))}
          </div>
        )}
        {property.description && (
          <p className="line-clamp-2 w-full font-sans text-body-base leading-[1.6] text-on-background">
            {property.description}
          </p>
        )}
      </div>
    </div>
  )
  // The property's own link, when it has one; otherwise a plain card, never a dead anchor.
  const href = realHref(property.link)
  return href ? (
    <a href={href} className="block w-full">
      {card}
    </a>
  ) : (
    card
  )
}
```

- [ ] **Step 2: One filter menu**

`frontend/components/blocks/PropertyFilterMenu.tsx`:

```tsx
'use client'

import {useEffect, useId, useRef, useState} from 'react'

import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'
import type {FilterTab} from '@/sanity/lib/archiveFilter'
import {toggleSlug} from '@/sanity/lib/propertyFilter'

function Row({label, checked, onToggle}: {label: string; checked: boolean; onToggle: () => void}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 py-2 font-sans text-body-base text-on-surface-light">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="size-5 shrink-0 cursor-pointer accent-moody-moor-600"
      />
    </label>
  )
}

/**
 * One filter dropdown (Figma: a button that opens a white panel of checkboxes, "View All" first).
 * A button with aria-expanded, closed by Escape (focus returns to the button) or a press outside.
 * "View All" clears the group. Renders nothing when no property offers an option. Without
 * `onChange` the checkboxes do nothing (only until the page has loaded).
 */
export default function PropertyFilterMenu({
  label,
  options,
  selected,
  onChange,
}: {
  label: string
  options: FilterTab[]
  selected: string[]
  onChange?: (slugs: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const button = useRef<HTMLButtonElement>(null)
  const panelId = useId()

  useEffect(() => {
    if (!open) return
    const onPointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (options.length === 0) return null
  const Chevron = open ? ChevronUpIcon : ChevronDownIcon

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className={`flex w-[214px] cursor-pointer items-center justify-between rounded border bg-input px-5 py-4 font-mono text-body-base text-on-input focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500 ${
          open || selected.length > 0 ? 'border-border-light' : 'border-transparent'
        }`}
      >
        <span>{selected.length > 0 ? `${label} (${selected.length})` : label}</span>
        <Chevron className="size-6 shrink-0" />
      </button>
      {open && (
        <div
          id={panelId}
          role="group"
          aria-label={label}
          className="absolute left-0 top-full z-10 mt-2 flex w-[266px] flex-col rounded bg-surface-light p-6 shadow-[0_8px_20px_rgba(0,0,0,0.04)]"
        >
          <Row label="View All" checked={selected.length === 0} onToggle={() => onChange?.([])} />
          {options.map((option) => (
            <Row
              key={option.slug}
              label={option.title}
              checked={selected.includes(option.slug)}
              onToggle={() => onChange?.(toggleSlug(selected, option.slug))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: The view (menus + grid + empty state)**

`frontend/components/blocks/PropertyArchiveView.tsx`:

```tsx
'use client'

import CardProperty from '@/components/cards/CardProperty'
import type {PropertyDefaultImage, PropertyItem} from '@/components/cards/types'
import type {FilterTab} from '@/sanity/lib/archiveFilter'
import {EMPTY_SELECTION, type PropertySelection, filterProperties, hasSelection} from '@/sanity/lib/propertyFilter'

import PropertyFilterMenu from './PropertyFilterMenu'

/**
 * The filter menus and the card grid. A client component only for the menus' open state, so the
 * server renders it too: the Suspense fallback is this view with nothing selected and no
 * `onChange`, which keeps the page from shifting when the real filter takes over.
 */
export default function PropertyArchiveView({
  properties,
  defaultImage,
  typeOptions,
  resourceOptions,
  selection,
  onChange,
}: {
  properties: PropertyItem[]
  defaultImage: PropertyDefaultImage
  typeOptions: FilterTab[]
  resourceOptions: FilterTab[]
  selection: PropertySelection
  onChange?: (next: PropertySelection) => void
}) {
  const shown = filterProperties(properties, selection)
  return (
    <div className="flex w-full flex-col items-start gap-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <PropertyFilterMenu
          label="Property Type"
          options={typeOptions}
          selected={selection.types}
          onChange={onChange && ((types) => onChange({...selection, types}))}
        />
        <PropertyFilterMenu
          label="Resources"
          options={resourceOptions}
          selected={selection.resources}
          onChange={onChange && ((resources) => onChange({...selection, resources}))}
        />
      </div>
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-4">
          <p role="status" className="font-sans text-body-base text-on-background">
            No properties match these filters.
          </p>
          {hasSelection(selection) && onChange && (
            <button
              type="button"
              onClick={() => onChange(EMPTY_SELECTION)}
              className="cursor-pointer font-mono text-body-base underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moody-moor-500"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-16">
          {shown.map((property) => (
            <li key={property._id}>
              <CardProperty property={property} defaultImage={defaultImage} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 4: The selection hook and the filter wrapper**

`frontend/components/blocks/usePropertySelection.ts`:

```ts
'use client'

import {useSearchParams} from 'next/navigation'
import {useMemo} from 'react'

import type {FilterTab} from '@/sanity/lib/archiveFilter'
import {type PropertySelection, parseSelection, withSelection} from '@/sanity/lib/propertyFilter'

/**
 * The property filter chosen, kept in the address as ?type=a,b&resource=c so a filtered view can
 * be shared. Read with useSearchParams and changed with the History API, like useQueryFilter:
 * no navigation, no server request. Callers need a Suspense boundary above them.
 */
export function usePropertySelection(typeOptions: FilterTab[], resourceOptions: FilterTab[]) {
  const searchParams = useSearchParams()
  const selection = useMemo(
    () => parseSelection(`?${searchParams.toString()}`, typeOptions, resourceOptions),
    [searchParams, typeOptions, resourceOptions],
  )

  function choose(next: PropertySelection) {
    // Keep any other query parameters and the hash; only the filters change.
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${withSelection(window.location.search, next)}${window.location.hash}`,
    )
  }

  return {selection, choose}
}
```

`frontend/components/blocks/PropertyFilter.tsx`:

```tsx
'use client'

import {useMemo} from 'react'

import type {PropertyDefaultImage, PropertyItem} from '@/components/cards/types'
import {propertyTypeOptions, resourceOptions} from '@/sanity/lib/propertyFilter'

import PropertyArchiveView from './PropertyArchiveView'
import {usePropertySelection} from './usePropertySelection'

/** The properties with their filters, the choice kept in the address. */
export default function PropertyFilter({
  properties,
  defaultImage,
}: {
  properties: PropertyItem[]
  defaultImage: PropertyDefaultImage
}) {
  const typeChoices = useMemo(() => propertyTypeOptions(properties), [properties])
  const resourceChoices = useMemo(() => resourceOptions(properties), [properties])
  const {selection, choose} = usePropertySelection(typeChoices, resourceChoices)

  return (
    <PropertyArchiveView
      properties={properties}
      defaultImage={defaultImage}
      typeOptions={typeChoices}
      resourceOptions={resourceChoices}
      selection={selection}
      onChange={choose}
    />
  )
}
```

- [ ] **Step 5: The block and its registration**

`frontend/components/blocks/PropertyArchive.tsx`:

```tsx
import {Suspense} from 'react'

import {EMPTY_SELECTION, propertyTypeOptions, resourceOptions} from '@/sanity/lib/propertyFilter'

import PropertyArchiveView from './PropertyArchiveView'
import PropertyFilter from './PropertyFilter'
import {BlockProps} from './types'

export default function PropertyArchive({block}: BlockProps<'propertyArchive'>) {
  const properties = block.properties ?? []
  if (properties.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {/* useSearchParams needs a Suspense boundary on a statically rendered page. The fallback is
            the same menus and grid with nothing selected, so the server HTML is the full list. */}
        <Suspense
          fallback={
            <PropertyArchiveView
              properties={properties}
              defaultImage={block.defaultImage}
              typeOptions={propertyTypeOptions(properties)}
              resourceOptions={resourceOptions(properties)}
              selection={EMPTY_SELECTION}
            />
          }
        >
          <PropertyFilter properties={properties} defaultImage={block.defaultImage} />
        </Suspense>
      </div>
    </section>
  )
}
```

```bash
python3 - <<'EOF'
p = 'frontend/components/BlockRenderer.tsx'
s = open(p).read()
for old, new in [
    ("import ProjectPreview from '@/components/blocks/ProjectPreview'", "import ProjectPreview from '@/components/blocks/ProjectPreview'\nimport PropertyArchive from '@/components/blocks/PropertyArchive'"),
    ("  projectPreview: ProjectPreview,\n", "  projectPreview: ProjectPreview,\n  propertyArchive: PropertyArchive,\n"),
]:
    assert s.count(old) == 1, old
    s = s.replace(old, new)
open(p, 'w').write(s)
EOF
```

- [ ] **Step 6: Gate**

Run: `cd frontend && npm run type-check && npm run lint && node scripts/verifyPropertyFilter.mts >/dev/null && echo OK`
Expected: no type or lint errors, `OK`. If `type-check` reports the block's `defaultImage` is not assignable to `BlockImage`'s `image` prop, mirror how `CardProject` passes `project.image` and adjust `PropertyDefaultImage`'s use, not the query.

- [ ] **Step 7: Commit**

```bash
git add frontend/components/cards/CardProperty.tsx frontend/components/blocks/PropertyFilterMenu.tsx frontend/components/blocks/PropertyArchiveView.tsx frontend/components/blocks/PropertyFilter.tsx frontend/components/blocks/usePropertySelection.ts frontend/components/blocks/PropertyArchive.tsx frontend/components/BlockRenderer.tsx
git commit -m "feat: add the Property Archive block with Property Type and Resources filters

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Seed the page and link it from the menu

**Files:**
- Create: `studio/scripts/seedPropertiesPage.ts`
- Create: `studio/scripts/linkPropertiesInMenus.ts`

**Interfaces:**
- Consumes: block types `heroTertiary` (`eyebrow`, `heading`, `headingLevel`, `body`) and `propertyArchive`; the published `explore` page.

- [ ] **Step 1: The page seed**

`studio/scripts/seedPropertiesPage.ts`:

```ts
/**
 * Creates the Properties archive page as a DRAFT under the existing Explore page: a header (the
 * Figma copy) and the Property Archive block.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedPropertiesPage.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedPropertiesPage.ts --with-user-token
 *
 * What it writes: one draft `page` (Sanity generates the id). Idempotent: matched on its slug under
 * the Explore page, in any state, and skipped if it exists; it never edits an existing page and
 * creates no parent: it stops if Explore is missing. The parent reference is weak, so it holds
 * whether or not Explore is published.
 */

import {randomUUID} from 'node:crypto'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const published = (id: string) => id.replace(/^drafts\./, '')

const INTRO =
  "The Land Bank's more than 3,500 protected acres span the full breadth of Nantucket — from open heathland and sandplain grassland to freshwater ponds, coastal wetlands, working farms, and quiet forest trails. Each property has its own character, its own ecology, and its own role in the larger mosaic of protected land that defines the island. Browse our properties below to find your next walk, fishing spot, or simply a place to go and be outside."

async function main() {
  const parent = await client.fetch<string | null>(`*[_type == "page" && slug.current == "explore"][0]._id`)
  if (!parent) {
    console.error('There is no "explore" page to put Properties under. Nothing was written.')
    process.exit(1)
  }
  const parentId = published(parent)

  const exists = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "properties" && parent._ref == $parent][0]._id`,
    {parent: parentId},
  )
  if (exists) {
    console.log(`  = exists: explore/properties (${exists})`)
    return
  }
  if (DRY_RUN) {
    console.log('[dry run] would create draft page explore/properties')
    return
  }
  const result = await client.create({
    _id: 'drafts.',
    _type: 'page',
    name: 'Properties',
    slug: {_type: 'slug', current: 'properties'},
    parent: {_type: 'reference', _ref: parentId, _weak: true, _strengthenOnPublish: {type: 'page'}},
    pathOnly: false,
    pageBuilder: [
      {_type: 'heroTertiary', _key: key(), eyebrow: 'Properties', heading: 'Our Properties', headingLevel: 'h1', body: INTRO},
      {_type: 'propertyArchive', _key: key()},
    ],
  } as never)
  console.log(`  + created draft: explore/properties (${result._id})`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 2: The menu link script**

`studio/scripts/linkPropertiesInMenus.ts` (the same shape as `linkArchivePagesInMenus.ts`, for the footer's Explore → Properties link):

```ts
/**
 * Points the footer menu's Properties link (a placeholder: `#`) at the Properties archive page.
 *
 * Run from the studio directory, after explore/properties is PUBLISHED:
 *   npx sanity exec scripts/linkPropertiesInMenus.ts --with-user-token -- --dry
 *   npx sanity exec scripts/linkPropertiesInMenus.ts --with-user-token
 *
 * What it overwrites: only a link under "Explore" in the "Footer Menu" that is labelled Properties
 * and is still a `#` placeholder; every other item is left exactly as it is. The change is printed
 * first. It stops, writing nothing, if the page is not published (a link to a draft is rejected by
 * the API) or if the menu has unpublished edits (publish or discard them first).
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

type Child = {_key: string; label?: string; link?: {linkType?: string; href?: string}}
type Group = {_key: string; label?: string; children?: Child[]}

async function main() {
  const parent = await client.fetch<string | null>(
    `*[_type == "page" && slug.current == "explore" && !(_id in path("drafts.**"))][0]._id`,
  )
  const pageId = parent
    ? await client.fetch<string | null>(
        `*[_type == "page" && slug.current == "properties" && parent._ref == $parent && !(_id in path("drafts.**"))][0]._id`,
        {parent},
      )
    : null
  if (!pageId) {
    console.error('The page explore/properties is not published. Publish it first. Nothing was written.')
    process.exit(1)
  }

  const menus = await client.fetch<Array<{_id: string; items?: Group[]}>>(
    `*[_type == "menu" && title == "Footer Menu"]{_id, items}`,
  )
  const menu = menus.find((m) => !m._id.startsWith('drafts.'))
  if (!menu) {
    console.error('There is no published "Footer Menu". Nothing was written.')
    process.exit(1)
  }
  if (menus.some((m) => m._id.startsWith('drafts.'))) {
    console.error('The Footer Menu has unpublished edits. Publish or discard them first. Nothing was written.')
    process.exit(1)
  }

  let changes = 0
  const items = (menu.items ?? []).map((group) => {
    if (group.label !== 'Explore') return group
    return {
      ...group,
      children: (group.children ?? []).map((child) => {
        const isPlaceholder = child.link?.linkType === 'href' && child.link?.href === '#'
        if (child.label !== 'Properties' || !isPlaceholder) return child
        changes += 1
        console.log(`  ${DRY_RUN ? '[dry run] would link' : 'linking'} Explore > Properties -> explore/properties`)
        return {...child, link: {_type: 'link', linkType: 'page', page: {_type: 'reference', _ref: pageId}}}
      }),
    }
  })

  if (changes === 0) {
    console.log('Nothing to change: no Properties placeholder link under Explore.')
    return
  }
  if (!DRY_RUN) await client.patch(menu._id).set({items}).commit()
  console.log(`${DRY_RUN ? '[dry run] ' : ''}${changes} link(s) ${DRY_RUN ? 'would be ' : ''}updated.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

- [ ] **Step 3: Type-check, dry-run the page seed, commit**

```bash
cd studio && npx tsc --noEmit && npx sanity exec scripts/seedPropertiesPage.ts --with-user-token -- --dry
cd .. && git add studio/scripts/seedPropertiesPage.ts studio/scripts/linkPropertiesInMenus.ts
git commit -m "feat: seed the Properties page and link it from the footer menu

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```
Expected: `tsc` clean and either `[dry run] would create draft page explore/properties` or `There is no "explore" page …` (report that to the user if so: the page cannot be seeded until Explore exists).

- [ ] **Step 4: STOP: ask the user for the go-ahead** to run `seedPropertiesPage.ts` for real (one draft page). Run it only after "run it". The menu link script is run by the user after they publish the page (it stops harmlessly otherwise).

---

### Task 8: Docs, deferred-work issues, final verification

**Files:**
- Modify: `AGENTS.md`, `docs/DECISIONS.md`

- [ ] **Step 1: Update the rules that named `project`**

In `AGENTS.md`, "Projects and the map" section: change "**`project` is a Land Bank property**" to "**`property` is a Land Bank property**" and its sentence to say it replaced the `project` type (migrated, see DECISIONS) and the hardcoded `frontend/app/map/properties.ts`; "Boundary geometry is not stored per project" → "per property … a property stores only `boundaryId`"; "Replacing the boundary file does not re-point any project" → "property"; "A project's marker and its boundary must share one feature id" → "A property's marker…", "deriving the id … over only projects that have geometry" → "properties". Keep the section heading text as is. Do not touch anything else.

Verify: `grep -n -i "project" AGENTS.md` shows only intended mentions (`projectSettings`, `Project Settings`, the migration note).

- [ ] **Step 2: Record the decision**

Append to `docs/DECISIONS.md`, before "Known outstanding items", a section numbered with the next unused number (`grep -n "^## " docs/DECISIONS.md` to find it): "The `property` type and the Properties archive", with: 1) `property` replaced `project` and why (the client wants properties as the map's document; the archive needed its own list); migration run date/outcome or "migration written, not yet run" as it stands; the `project` documents are left for the user to delete; 2) the archive is a block on an ordinary page, filters any-within / all-between groups, selection in the address as `?type=&resource=`; 3) the default image lives on `settings`; 4) deferred items with their issue numbers (Step 3). Link the spec and this plan.

- [ ] **Step 3: Open the deferred-work issues** (search first, never duplicate)

```bash
gh issue list --state open --search "property detail pages" --json number,title
gh issue list --state open --search "rename Project Grid" --json number,title
gh issue list --state open --search "properties archive pagination" --json number,title
gh issue list --state open --search "delete retired project documents" --json number,title
```
For each that is not already filed, `gh issue create --title … --body …` with: what is missing, why deferred (see the spec's Deferred section), and enough context to act (file paths, the migration report location). Titles: "Property detail pages", "Rename the Project Grid and Project Preview blocks to property names (needs a content migration)", "Pagination or search on the Properties archive", "Delete the retired `project` documents after the map is verified". Link each issue number in the spec's Deferred section and in the DECISIONS entry.

- [ ] **Step 4: Full gate**

Run the **Gate** section above in full, plus: `cd frontend && npm run build 2>&1 | tail -20` (typegen + production build; needs no preview server) and `cd studio && npx sanity exec scripts/verifyPageRouting.ts --with-user-token` is **not** needed (no page hierarchy or routes changed).
Expected: everything passes; the build lists `/map` and the catch-all as before.

- [ ] **Step 5: Commit**

```bash
git add AGENTS.md docs/DECISIONS.md docs/superpowers/specs/2026-10-07-properties-archive-design.md
git commit -m "docs: record the property type and the Properties archive, and link the deferred issues

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 6: Tell the user what is theirs to do**

In the final message: run the migration (if not yet run) and its validation; check the map shows every property and boundary; set the Default property image in Site Settings; run the page seed and publish `explore/properties`, then `linkPropertiesInMenus.ts`; compare the page to Figma in Presentation (filter menus, mobile layout, hero); delete the old `project` documents once satisfied; publish the new taxonomy-linked properties' images as they are authored. State plainly anything not run (the real migration, the real seed) and any gate that failed.

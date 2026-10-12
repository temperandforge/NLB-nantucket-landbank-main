# Absorb nlb-design, Phase B (data-driven pieces) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The content types and blocks that `nlb-design` hard-codes (news, events, FAQs, staff, commissioners and project cards) are Sanity documents and page-builder blocks, with `nlb-design`'s visuals.

**Architecture:** Eight new document types (five content, three referenced taxonomies) feed five new blocks: `newsPreview`, `eventsPreview`, `faqList`, `peopleGrid` and `projectGrid`. Each block's GROQ branch fetches its own documents, so editors place a block and the content follows. Dates are formatted by one pure helper module in a fixed site time zone. Cards are components in `frontend/components/cards/`, typed from the generated query results.

**Tech Stack:** Sanity Studio, Next.js 16 (read `node_modules/next/dist/docs/` before Next work), Tailwind v4, `next-sanity`, `sanity typegen`.

**Spec:** [docs/superpowers/specs/2026-10-07-absorb-nlb-design-design.md](../specs/2026-10-07-absorb-nlb-design-design.md), Phase B. Source project: `/Users/jtf/Developer/nlb-design` (`$ND`). Phase A plan for context: [phase A](2026-10-07-absorb-nlb-design-phase-a.md).

## Deviation from the spec

The spec lists `CardNews` among the cards. `$ND`'s `NewsPreview` has its own tile markup and never uses `CardNews`, and no block in this phase lists news as a grid. A component with no consumer is dead code, so **`CardNews` is not ported**. It belongs with the news archive (slice 3, [#11](https://github.com/temperandforge/NLB-nantucket-landbank-main/issues/11)); Task 6 records this in the spec and on that issue.

## Global Constraints

- All of Phase A's constraints still hold: `nlb-design`'s visuals win; never copy `$ND`'s `node_modules`/`.next`/`.claude`/`.git`; reuse the shared `link` object; tokens named after Figma variables; commit assets (copied from `$ND/public`, never downloaded); anything rendered degrades, never throws; types derive from generated query results; GROQ fragments are **constants** (never functions); enum-like strings go through `stegaClean`; no Tailwind class built by interpolation; mobile base with desktop behind `md:`; every block uses `defineBlock` and is added to the sorted list in `studio/src/schemaTypes/documents/page.ts`.
- Only singletons get explicit `_id`s. Relationships are `reference` fields. **Derivable values are computed at render, never stored:** "upcoming" for an event, the displayed date and time, a person's department label.
- **Categorisation is referenced documents.** A taxonomy's slug is its stable key, its title the label. Never restate taxonomy values in frontend code: `$ND`'s `CardStaff` hard-codes three department labels; here they come from `department` documents.
- A dereferenced reference is `null` when its target is unpublished: every consumer filters nulls.
- A link that does not resolve renders no link (a plain element, not a dead anchor). Never invent a URL: use `#` only where the design needs one and say what is outstanding.
- All dates and times are shown in the site time zone, `America/New_York`, whatever time zone the server runs in.
- Generated files are tracked: run `npm run sanity:typegen` in `frontend` after any schema or query change and commit the result.
- Verification gate for every task: `npm run sanity:typegen`, `npm run type-check`, `npm run lint`, `node scripts/verifyJumpNav.mts`, `node scripts/verifyFluidTokens.mts` (and, from Task 2, `node scripts/verifyDates.mts`) in `frontend`; `npx tsc --noEmit` and `npx sanity schema validate` in `studio`. Run them as separate commands, each under the tool timeout. (`.superpowers/verify.sh` runs the first set; create or extend it.)
- Do not leave a dev server running. The shell refuses network downloads: copy from `$ND`.
- Writing to the Sanity dataset (the seed scripts) needs the user's say-so in chat first; seed as **drafts** only.
- Every commit message ends with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Out of scope: archives, filters, pagination and per-item pages (slice 3, #11); `preview-projects`, `preview-properties`, `job-openings` (#10); the news card (`CardNews`).

## Decisions made in this plan

| Topic | Decision | Why |
|---|---|---|
| Article without a page | `article.link` (shared `link`, optional). The news tile is an `<a>` only when it resolves, otherwise a plain tile. | Articles have no page of their own until slice 3; no URL is invented. |
| "Upcoming" | The query keeps events whose end (or start, when there is no end) is not yet past `now()`. The catch-all and landing routes revalidate hourly so a past event drops off. | Computed at fetch, never stored; a statically rendered page would otherwise keep a past event until the next content edit. Verified in Task 3. |
| Event end before start | Rejected in Studio; at render, an end that is not after the start is ignored. | Bad data must not show nonsense times. |
| FAQ semantics | Heading wrapping a `<button aria-expanded aria-controls>`, answer in a sibling `div` (`hidden` when closed). Answer is rich text. | `$ND` nested a `<p>` in a `<button>`, which is invalid HTML; this is the WAI-ARIA accordion pattern. |
| FAQ grouping | By `faqCategory`, ordered by `order` then title; FAQs without a category come first with no heading; empty categories are hidden. | Matches `$ND`'s FAQs page. |
| People order | `order` number, then name. | The theme sorted by a hand-set menu order. |
| Commissioner "since" | Shown as "Since Month YYYY" from `startDate`. | `$ND` shows a bare `startDate`; its format is not specified. Assumption, to confirm with the designer (#14). |
| Grid layouts | Staff 4 columns, commissioners 3, projects 4 at `lg`, fewer below. | `$ND` has the cards but no archive page; these fit the card widths. Assumption, to confirm. |
| Empty blocks | List blocks render nothing when they have no items. `eventsPreview` renders its eyebrow and "No upcoming events right now." | A quiet events section is information; an empty staff grid is not. |
| `CardNews` | Not ported (see above). | No consumer. |

## Review Focus

1. **Empty and partial data.** Zero articles, events, FAQs, people or projects; a card with no image or headshot; a staff member with no department or whose department was unpublished (the dereference is `null`); a FAQ with no category; a category with no FAQs. None may throw or print "null". Pinned in Tasks 3-5 and the Task 6 gallery.
2. **Dates.** Event with no end; end before start; spanning midnight in New York; spanning days; a winter (EST) date; an invalid or missing date; an article date formatted from a `date` with no time-zone shift. Pinned by `frontend/scripts/verifyDates.mts` (Task 2).
3. **Upcoming events and caching.** An event that ended today stays until it ends; a past one is excluded; the page is not frozen at build time. Pinned in Task 3 (query and `revalidate`).
4. **FAQ accordion.** Keyboard operable, `aria-expanded` and `aria-controls` correct, several open at once, the answer's links resolve. Pinned in Task 4.
5. **Links.** An article or project with no link or an unresolvable one renders a plain tile; no dead anchor, no `href="#"`. Pinned in Tasks 3 and 5.

## File Structure

**Create (studio):** `schemaTypes/documents/{taxonomy,taxonomies,article,event,staffMember,commissioner,faq}.ts`; `schemaTypes/objects/{newsPreview,eventsPreview,faqList,peopleGrid,projectGrid}.ts`; `scripts/seedPhaseBContent.ts`.

**Create (frontend):** `sanity/lib/dates.ts`, `scripts/verifyDates.mts`; `components/cards/{types.ts,CardStaff,CardCommissioner,CardProject}.tsx`; `components/blocks/{NewsPreview,EventsPreview,FaqList,FaqItem,PeopleGrid,ProjectGrid}.tsx`; `public/images/blocks/decorative-line-news.svg`, `decorative-line-faqs.svg`.

**Modify:** `studio/src/schemaTypes/index.ts`, `documents/page.ts`, `structure/index.ts`; `frontend/sanity/lib/queries.ts`, `components/BlockRenderer.tsx`, `components/icons/index.tsx`, `components/blocks/BlockImage.tsx`, `app/page.tsx`, `app/[...slug]/page.tsx`, `css/ui.css`; `studio/scripts/seedBlockGallery.ts`; `docs/DECISIONS.md`; the spec.

---

### Task 1: Document types and Studio structure

**Files:**
- Create: `studio/src/schemaTypes/documents/taxonomy.ts`, `taxonomies.ts`, `article.ts`, `event.ts`, `staffMember.ts`, `commissioner.ts`, `faq.ts`
- Modify: `studio/src/schemaTypes/index.ts`, `studio/src/structure/index.ts`

**Interfaces:**
- Produces `defineTaxonomy({name, title, icon, description})` returning a document type with `title`, `slug` (required), `order`.
- Produces document types: `newsCategory`, `department`, `faqCategory` (taxonomies); `article` (`title`, `slug`, `date`, `image`, `categories[]`, `link`); `event` (`title`, `start`, `end`, `location`, `description`); `staffMember` (`name`, `title`, `department`, `headshot`, `order`); `commissioner` (`name`, `title`, `startDate`, `headshot`, `order`); `faq` (`question`, `answer`, `category`, `order`).

- [ ] **Step 1: Taxonomy helper and the three taxonomies**

`studio/src/schemaTypes/documents/taxonomy.ts`:

```ts
import {defineField, defineType, type DocumentDefinition} from 'sanity'

/**
 * A referenced category, so the client can add one without a deploy. The slug is the stable key
 * (URL filters use it), the title is the label, and `order` sets the display order.
 */
export function defineTaxonomy({
  name,
  title,
  icon,
  description,
}: {
  name: string
  title: string
  icon: DocumentDefinition['icon']
  description: string
}) {
  return defineType({
    name,
    title,
    type: 'document',
    icon,
    fields: [
      defineField({
        name: 'title',
        title: 'Title',
        type: 'string',
        description,
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'slug',
        title: 'Slug',
        type: 'slug',
        description:
          'The stable key, used in URL filters. Changing it breaks any shared link, so prefer editing the title.',
        options: {source: 'title', maxLength: 96},
        validation: (rule) => rule.required(),
      }),
      defineField({
        name: 'order',
        title: 'Order',
        type: 'number',
        description: 'Lower numbers come first. Ties fall back to the title.',
      }),
    ],
    orderings: [
      {
        title: 'Order',
        name: 'order',
        by: [
          {field: 'order', direction: 'asc'},
          {field: 'title', direction: 'asc'},
        ],
      },
    ],
    preview: {
      select: {title: 'title', subtitle: 'slug.current'},
      prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
    },
  })
}
```

`studio/src/schemaTypes/documents/taxonomies.ts`:

```ts
import {HelpCircleIcon, TagIcon, UsersIcon} from '@sanity/icons'

import {defineTaxonomy} from './taxonomy'

export const newsCategory = defineTaxonomy({
  name: 'newsCategory',
  title: 'News Category',
  icon: TagIcon,
  description: 'Shown on news items, e.g. "Conservation".',
})

export const department = defineTaxonomy({
  name: 'department',
  title: 'Department',
  icon: UsersIcon,
  description: 'Groups staff, e.g. "Property Management".',
})

export const faqCategory = defineTaxonomy({
  name: 'faqCategory',
  title: 'FAQ Category',
  icon: HelpCircleIcon,
  description: 'Groups FAQs under a heading, e.g. "Form Filing".',
})
```

- [ ] **Step 2: Article and event**

`article.ts`:

```ts
import {DocumentTextIcon} from '@sanity/icons'
import {defineArrayMember, defineField, defineType} from 'sanity'

import {imageWithAltField} from '../objects/blockFields'

/**
 * A news item. It has no page of its own yet (per-item pages are slice 3), so `link` is where a
 * tile goes, if anywhere: an external article, or later a page. With no link the tile is plain.
 */
export const article = defineType({
  name: 'article',
  title: 'News Article',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'date',
      title: 'Date',
      type: 'date',
      initialValue: () => new Date().toISOString().slice(0, 10),
      validation: (rule) => rule.required(),
    }),
    imageWithAltField({required: true}),
    defineField({
      name: 'categories',
      title: 'Categories',
      type: 'array',
      of: [defineArrayMember({type: 'reference', to: [{type: 'newsCategory'}]})],
    }),
    defineField({
      name: 'link',
      title: 'Link',
      type: 'link',
      description: 'Where the news tile goes. Leave empty for a tile that is not a link.',
    }),
  ],
  orderings: [{title: 'Date, newest first', name: 'dateDesc', by: [{field: 'date', direction: 'desc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'date', media: 'image'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Untitled', subtitle, media}),
  },
})
```

`event.ts`:

```ts
import {CalendarIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * An event. Whether it is "upcoming" is worked out from its dates when the page is built or
 * revalidated, never stored. Times are entered and shown in the site time zone, America/New_York.
 */
export const event = defineType({
  name: 'event',
  title: 'Event',
  type: 'document',
  icon: CalendarIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'start',
      title: 'Starts',
      type: 'datetime',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'end',
      title: 'Ends',
      type: 'datetime',
      description: 'Optional. An event stays listed until it ends (or, with no end, until it starts).',
      validation: (rule) =>
        rule.custom((end, context) => {
          const start = (context.document as {start?: string} | undefined)?.start
          return end && start && end <= start ? 'The end must be after the start' : true
        }),
    }),
    defineField({name: 'location', title: 'Location', type: 'string'}),
    defineField({name: 'description', title: 'Description', type: 'text', rows: 4}),
  ],
  orderings: [{title: 'Start, soonest first', name: 'startAsc', by: [{field: 'start', direction: 'asc'}]}],
  preview: {
    select: {title: 'title', subtitle: 'start'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
```

- [ ] **Step 3: People and FAQ**

`staffMember.ts`:

```ts
import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A member of staff. The card's tag is the department's title, so it is never restated here. */
export const staffMember = defineType({
  name: 'staffMember',
  title: 'Staff Member',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'title', title: 'Job title', type: 'string'}),
    defineField({
      name: 'department',
      title: 'Department',
      type: 'reference',
      to: [{type: 'department'}],
    }),
    defineField({
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: {hotspot: true},
      description: 'Shown at roughly 4:5. The person’s name is used as its alt text.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers come first. Ties fall back to the name.',
    }),
  ],
  orderings: [
    {
      title: 'Order',
      name: 'order',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'name', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'title', media: 'headshot'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Unnamed', subtitle, media}),
  },
})
```

`commissioner.ts`:

```ts
import {UserIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A Land Bank commissioner. */
export const commissioner = defineType({
  name: 'commissioner',
  title: 'Commissioner',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({name: 'name', title: 'Name', type: 'string', validation: (rule) => rule.required()}),
    defineField({name: 'title', title: 'Role', type: 'string', description: 'e.g. Chair.'}),
    defineField({
      name: 'startDate',
      title: 'Serving since',
      type: 'date',
      description: 'Shown as "Since Month YYYY".',
    }),
    defineField({
      name: 'headshot',
      title: 'Headshot',
      type: 'image',
      options: {hotspot: true},
      description: 'Shown tall (about 4:5). The person’s name is used as its alt text.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers come first. Ties fall back to the name.',
    }),
  ],
  orderings: [
    {
      title: 'Order',
      name: 'order',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'name', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'name', subtitle: 'title', media: 'headshot'},
    prepare: ({title, subtitle, media}) => ({title: title || 'Unnamed', subtitle, media}),
  },
})
```

`faq.ts`:

```ts
import {HelpCircleIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/** A frequently asked question. The answer is rich text, so it can carry links. */
export const faq = defineType({
  name: 'faq',
  title: 'FAQ',
  type: 'document',
  icon: HelpCircleIcon,
  fields: [
    defineField({
      name: 'question',
      title: 'Question',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'answer',
      title: 'Answer',
      type: 'blockContent',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{type: 'faqCategory'}],
      description: 'Groups the question under a heading. Leave empty for the ungrouped list.',
    }),
    defineField({
      name: 'order',
      title: 'Order',
      type: 'number',
      description: 'Lower numbers come first. Ties fall back to the question.',
    }),
  ],
  orderings: [
    {
      title: 'Order',
      name: 'order',
      by: [
        {field: 'order', direction: 'asc'},
        {field: 'question', direction: 'asc'},
      ],
    },
  ],
  preview: {
    select: {title: 'question', subtitle: 'category.title'},
    prepare: ({title, subtitle}) => ({title: title || 'Untitled', subtitle}),
  },
})
```

`blockContent` offers no H1/H2 and gains anchor links (Phase A); an FAQ answer using it is intentional.

- [ ] **Step 4: Register and add to the Studio structure**

In `studio/src/schemaTypes/index.ts` import and add (under the existing "Documents" comment group): `article`, `event`, `staffMember`, `commissioner`, `faq` and, from `taxonomies`, `newsCategory`, `department`, `faqCategory`.

In `studio/src/structure/index.ts`: add `'article'`, `'newsCategory'`, `'event'`, `'staffMember'`, `'commissioner'`, `'department'`, `'faq'`, `'faqCategory'` to `DISABLED_TYPES` (under a new "Handled explicitly below" comment), import `CalendarIcon`, `DocumentTextIcon`, `HelpCircleIcon`, `UsersIcon` from `@sanity/icons`, and add four list items after the Projects item and its divider:

```ts
      S.listItem()
        .title('News')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('News')
            .items([
              S.documentTypeListItem('article').title('Articles').icon(DocumentTextIcon),
              S.divider(),
              S.documentTypeListItem('newsCategory').title('News Categories').icon(TagIcon),
            ]),
        ),
      S.documentTypeListItem('event').title('Events').icon(CalendarIcon),
      S.listItem()
        .title('People')
        .icon(UsersIcon)
        .child(
          S.list()
            .title('People')
            .items([
              S.documentTypeListItem('staffMember').title('Staff').icon(UsersIcon),
              S.documentTypeListItem('commissioner').title('Commissioners').icon(UsersIcon),
              S.divider(),
              S.documentTypeListItem('department').title('Departments').icon(TagIcon),
            ]),
        ),
      S.listItem()
        .title('FAQs')
        .icon(HelpCircleIcon)
        .child(
          S.list()
            .title('FAQs')
            .items([
              S.documentTypeListItem('faq').title('FAQs').icon(HelpCircleIcon),
              S.divider(),
              S.documentTypeListItem('faqCategory').title('FAQ Categories').icon(TagIcon),
            ]),
        ),
      S.divider(),
```

(`TagIcon` is already imported there.)

- [ ] **Step 5: Verify**

Run: `cd studio && npx tsc --noEmit && npx sanity schema validate`
Expected: both exit 0 (schema validate reports no errors; warnings about missing preview images are fine). If an icon name does not exist in `@sanity/icons`, `tsc` fails: swap for an existing one.

Run: `cd frontend && npm run sanity:typegen` then the gate commands (separately).
Expected: `sanity.types.ts` contains `Article`, `Event`, `StaffMember`, `Commissioner`, `Faq`, `NewsCategory`, `Department`, `FaqCategory`.

- [ ] **Step 6: Commit**

```bash
git add studio frontend sanity.schema.json
git commit -m "feat: add news, event, people and FAQ document types with referenced taxonomies

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Date helpers

**Files:**
- Create: `frontend/sanity/lib/dates.ts`, `frontend/scripts/verifyDates.mts`

**Interfaces:**
- Produces from `dates.ts` (no imports): `SITE_TIME_ZONE: string`; `formatDate(value: string | null | undefined): string` ("08/02/2026", or `''`); `formatMonthYear(value): string` ("August 2019", or `''`); `eventParts(start: string | null | undefined, end?: string | null): {weekday: string; day: string; month: string; time: string} | null`.

- [ ] **Step 1: Write the failing script**

`frontend/scripts/verifyDates.mts`:

```ts
/**
 * Verifies the date helpers. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyDates.mts
 *
 * Imports the real helpers, not a copy. Everything is shown in America/New_York whatever time zone
 * this machine runs in. Exits non-zero on failure.
 */
import {eventParts, formatDate, formatMonthYear, SITE_TIME_ZONE} from '../sanity/lib/dates.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  check(ok, ok ? message : `${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
}

check(SITE_TIME_ZONE === 'America/New_York', 'the site time zone is New York')

// Articles and commissioners use Sanity `date` values (no time), so there is no zone to shift.
same(formatDate('2026-08-02'), '08/02/2026', 'formats a date as MM/DD/YYYY')
same(formatDate('2026-08-02T03:00:00Z'), '08/02/2026', 'ignores any time part')
same(formatDate(''), '', 'an empty date is empty')
same(formatDate(null), '', 'a null date is empty')
same(formatDate('2026-13-40'), '', 'an impossible date is empty')
same(formatDate('not a date'), '', 'a non-date is empty')
same(formatMonthYear('2019-01-15'), 'January 2019', 'formats month and year')
same(formatMonthYear(undefined), '', 'no start date is empty')

// 14:30Z on 4 Aug 2026 is 10:30 in New York (EDT, UTC-4).
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-04T19:00:00.000Z'),
  {weekday: 'Tue', day: '04', month: 'Aug 2026', time: '10:30 am - 3:00 pm'},
  'a same-day event shows its parts and time range',
)
same(
  eventParts('2026-08-04T14:30:00.000Z')?.time,
  '10:30 am',
  'an event with no end shows only the start time',
)
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-04T14:30:00.000Z')?.time,
  '10:30 am',
  'an end equal to the start is ignored',
)
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-04T10:00:00.000Z')?.time,
  '10:30 am',
  'an end before the start is ignored',
)
// 03:30Z on 5 Aug is 23:30 on 4 Aug in New York: the day must be the New York day.
same(
  eventParts('2026-08-05T03:30:00.000Z')?.day,
  '04',
  'the day is the New York day, not the UTC day',
)
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-05T19:00:00.000Z')?.time,
  '10:30 am - Aug 5, 3:00 pm',
  'a multi-day event names the end date',
)
// 15:30Z on 4 Dec 2026 is 10:30 in New York (EST, UTC-5).
same(
  eventParts('2026-12-04T15:30:00.000Z')?.time,
  '10:30 am',
  'winter (standard) time is handled',
)
same(eventParts('nonsense'), null, 'an invalid start is null')
same(eventParts(null), null, 'a missing start is null')
same(eventParts('2026-08-04T14:30:00.000Z', 'nonsense')?.time, '10:30 am', 'an invalid end is ignored')

if (failed) process.exit(1)
```

- [ ] **Step 2: Run it and watch it fail**

Run: `cd frontend && node scripts/verifyDates.mts`
Expected: FAIL with `Cannot find module '.../sanity/lib/dates.ts'`.

- [ ] **Step 3: Implement**

`frontend/sanity/lib/dates.ts`:

```ts
/** Everything the site shows is in this zone, whatever zone the server runs in. */
export const SITE_TIME_ZONE = 'America/New_York'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null
  return {year, month, day}
}

/** "08/02/2026" from a Sanity `date` (YYYY-MM-DD). Pure string handling, so no zone can shift it. */
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? `${date.month}/${date.day}/${date.year}` : ''
}

/** "August 2019" from a Sanity `date`. */
export function formatMonthYear(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? `${MONTHS[Number(date.month) - 1]} ${date.year}` : ''
}

function part(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {timeZone: SITE_TIME_ZONE, ...options}).format(date)
}

function clock(date: Date) {
  // "10:30 AM" -> "10:30 am"
  return part(date, {hour: 'numeric', minute: '2-digit', hour12: true}).replace(
    /\s?(AM|PM)$/,
    (_, meridiem: string) => ` ${meridiem.toLowerCase()}`,
  )
}

function calendarDay(date: Date) {
  return part(date, {year: 'numeric', month: '2-digit', day: '2-digit'})
}

/**
 * The pieces an event tile shows, in the site time zone. An end that is missing, invalid, or not
 * after the start is ignored. A multi-day event names its end date, so "3:00 pm" is never
 * ambiguous. Null when the start is missing or invalid.
 */
export function eventParts(start: string | null | undefined, end?: string | null) {
  if (!start) return null
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return null

  let endDate: Date | null = end ? new Date(end) : null
  if (endDate && (Number.isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime())) {
    endDate = null
  }

  let time = clock(startDate)
  if (endDate) {
    time +=
      calendarDay(endDate) === calendarDay(startDate)
        ? ` - ${clock(endDate)}`
        : ` - ${part(endDate, {month: 'short', day: 'numeric'})}, ${clock(endDate)}`
  }

  return {
    weekday: part(startDate, {weekday: 'short'}),
    day: part(startDate, {day: '2-digit'}),
    month: `${part(startDate, {month: 'short'})} ${part(startDate, {year: 'numeric'})}`,
    time,
  }
}
```

- [ ] **Step 4: Run it and watch it pass**

Run: `cd frontend && node scripts/verifyDates.mts` and also `TZ=Asia/Tokyo node scripts/verifyDates.mts`
Expected: every line `ok`, exit 0, in both runs (the second proves the output does not depend on the machine's zone).

- [ ] **Step 5: Wire into the gate and commit**

Add `node scripts/verifyDates.mts` to `.superpowers/verify.sh` (after the fluid-token line). Run the gate commands (separately).

```bash
git add frontend/sanity/lib/dates.ts frontend/scripts/verifyDates.mts
git commit -m "feat: add site-time-zone date helpers with a verification script

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: News preview and events preview

**Files:**
- Create: `studio/src/schemaTypes/objects/newsPreview.ts`, `eventsPreview.ts`; `frontend/components/blocks/NewsPreview.tsx`, `EventsPreview.tsx`; `frontend/public/images/blocks/decorative-line-news.svg`
- Modify: `studio/src/schemaTypes/index.ts`, `documents/page.ts`, `frontend/sanity/lib/queries.ts`, `components/BlockRenderer.tsx`, `components/icons/index.tsx`, `app/page.tsx`, `app/[...slug]/page.tsx`

**Interfaces:**
- Consumes: `formatDate`, `eventParts` (Task 2); `BlockImage`, `Eyebrow`, `ResolvedLink`, `linkResolver`, `DereferencedLink`, `linkReference` (queries), `defineBlock`.
- Produces: `newsPreview` (`heading`, `count`, `ctaHeading`, `ctaLabel`, `ctaLink`, query-added `articles[]`) and `eventsPreview` (`eyebrow`, `count`, query-added `events[]`). Icons `ClockIcon`, `MapPinIcon`, `ArrowDownRightIcon`.

- [ ] **Step 1: Read the revalidation docs**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/index.md` (the `revalidate` option) and `01-app/02-guides/caching-without-cache-components.md`. Confirm `next.config.ts` does not enable `cacheComponents` (if it does, `revalidate` is unavailable: stop and record a ruling).

- [ ] **Step 2: Assets and icons**

```bash
cp /Users/jtf/Developer/nlb-design/public/svg/decorative-line-news.svg frontend/public/images/blocks/
cp /Users/jtf/Developer/nlb-design/public/svg/decorative-line-faqs.svg frontend/public/images/blocks/
ls -la frontend/public/images/blocks | grep "news\|faqs"
```

Append to `frontend/components/icons/index.tsx`:

```tsx
/** Clock, from nlb-design's events preview. 24 x 24. */
export function ClockIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <circle cx="12" cy="13" r="8" stroke="currentColor" strokeWidth="2" />
      <path
        d="M12 9V13L14.5 14.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 2H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** Map pin, from nlb-design's events preview. 24 x 24. */
export function MapPinIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M12 22C12 22 19 15.4183 19 10C19 5.58172 15.866 2 12 2C8.13401 2 5 5.58172 5 10C5 15.4183 12 22 12 22Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="2" />
    </svg>
  )
}

/** Large arrow pointing down and right, from nlb-design's news preview call to action. 70 x 69. */
export function ArrowDownRightIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 70 69" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path
        d="M57.9762 61.5984L0 4.70981L4.79985 0L62.776 56.8886L62.776 2.32783L69.5978 2.35491L69.5978 68.2922L2.39991 68.2922L2.37231 61.5984L57.9762 61.5984Z"
        fill="currentColor"
      />
    </svg>
  )
}
```

- [ ] **Step 3: Schemas**

`studio/src/schemaTypes/objects/newsPreview.ts`:

```ts
import {DocumentTextIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** The latest news, with a call-to-action tile. The articles come from the News Articles list. */
export const newsPreview = defineBlock({
  name: 'newsPreview',
  title: 'News Preview',
  type: 'object',
  icon: DocumentTextIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'Nantucket News'}),
    defineField({
      name: 'count',
      title: 'Articles shown',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.required().integer().min(1).max(12),
    }),
    defineField({
      name: 'ctaHeading',
      title: 'Call to action',
      type: 'string',
      initialValue: 'Check out what is happening with the latest NLB news.',
    }),
    defineField({name: 'ctaLabel', title: 'Call to action label', type: 'string', initialValue: 'View all news'}),
    defineField({
      name: 'ctaLink',
      title: 'Call to action link',
      type: 'link',
      description: 'Leave empty for a tile that is not a link.',
    }),
  ],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'News Preview'}),
  },
})
```

`eventsPreview.ts`:

```ts
import {CalendarIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** The next events. They come from the Events list; past events drop off by themselves. */
export const eventsPreview = defineBlock({
  name: 'eventsPreview',
  title: 'Events Preview',
  type: 'object',
  icon: CalendarIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      initialValue: 'Events - Upcoming',
    }),
    defineField({
      name: 'count',
      title: 'Events shown',
      type: 'number',
      initialValue: 2,
      validation: (rule) => rule.required().integer().min(1).max(12),
    }),
  ],
  preview: {
    select: {title: 'eyebrow'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Events Preview'}),
  },
})
```

Register both in `index.ts`; import them in `documents/page.ts` and add to `pageBuilderBlocks` (the list sorts itself).

- [ ] **Step 4: Query branches**

In `pageBuilderFields` add (articles and events are fetched up to the maximum, 12, and cut to `count` at render, so the query needs no parent-relative slice):

```ts
    _type == "newsPreview" => {
      ...,
      ctaLink{
        ...,
        ${linkReference}
      },
      "articles": *[_type == "article" && defined(slug.current)] | order(date desc) [0...12] {
        _id,
        title,
        date,
        image,
        link{
          ...,
          ${linkReference}
        },
        "categories": categories[]->{"slug": slug.current, title}
      }
    },
    _type == "eventsPreview" => {
      ...,
      "events": *[
        _type == "event" && defined(start)
        && dateTime(coalesce(end, start)) >= dateTime(now())
      ] | order(start asc) [0...12] {
        _id,
        title,
        start,
        end,
        location,
        description
      }
    },
```

Run `cd frontend && npm run sanity:typegen`.

- [ ] **Step 5: Components**

`frontend/components/blocks/NewsPreview.tsx` (port of `$ND/components/NewsPreview.tsx`):

```tsx
import Image from 'next/image'
import Link from 'next/link'

import {ArrowDownRightIcon} from '@/components/icons'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'
import {formatDate} from '@/sanity/lib/dates'

import BlockImage from './BlockImage'
import {BlockProps} from './types'

/** A tile that is a link only when its link resolves; otherwise a plain element, never a dead anchor. */
function Tile({
  href,
  className,
  children,
}: {
  href: string | null
  className: string
  children: React.ReactNode
}) {
  return href ? (
    <Link href={href} className={className}>
      {children}
    </Link>
  ) : (
    <div className={className}>{children}</div>
  )
}

export default function NewsPreview({block}: BlockProps<'newsPreview'>) {
  const articles = (block.articles ?? []).slice(0, block.count ?? 2)
  const ctaHref = block.ctaLink ? linkResolver(block.ctaLink as DereferencedLink) : null
  const showCta = Boolean(block.ctaHeading || block.ctaLabel)
  if (articles.length === 0 && !showCta) return null

  return (
    <section className="overflow-x-clip bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && (
          <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>
        )}
        <div className="grid w-full grid-cols-1 gap-px border border-border-light bg-border-light md:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => {
            const href = article.link ? linkResolver(article.link as DereferencedLink) : null
            // A category whose document was unpublished dereferences to null.
            const category = (article.categories ?? []).find((c) => c?.title)?.title
            const date = formatDate(article.date)
            return (
              <Tile
                key={article._id}
                href={href}
                className="flex w-full min-w-0 flex-col items-start gap-8 overflow-clip bg-background p-8"
              >
                <div className="flex w-full flex-col items-start gap-5">
                  <div className="relative h-[16.5rem] w-full shrink-0 overflow-clip">
                    <BlockImage
                      image={article.image}
                      width={600}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      fill
                      className="size-full object-cover"
                    />
                  </div>
                  <p className="w-full text-headline-base text-on-background">{article.title}</p>
                </div>
                {(category || date) && (
                  <div className="flex shrink-0 items-center gap-3">
                    {category && (
                      <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
                        {category}
                      </p>
                    )}
                    {category && date && (
                      <span className="size-1.5 shrink-0 rounded-full bg-on-background" aria-hidden="true" />
                    )}
                    {date && (
                      <p className="font-mono text-body-small leading-[1.6] tracking-wide text-on-background uppercase">
                        {date}
                      </p>
                    )}
                  </div>
                )}
              </Tile>
            )
          })}
          {showCta && (
            <Tile
              href={ctaHref}
              className="relative flex w-full min-w-0 flex-col items-start justify-between gap-8 overflow-clip bg-accent-secondary p-10 md:col-span-2 lg:col-span-1"
            >
              <Image
                src="/images/blocks/decorative-line-news.svg"
                alt=""
                aria-hidden="true"
                fill
                className="pointer-events-none absolute inset-0 z-0 size-full object-cover object-center"
              />
              {block.ctaHeading && (
                <p className="relative z-10 w-full text-headline-base text-on-accent-secondary text-balance">
                  {block.ctaHeading}
                </p>
              )}
              <div className="relative z-10 flex w-full items-end justify-between gap-4">
                {block.ctaLabel && (
                  <p className="relative whitespace-nowrap font-mono text-body-small leading-[1.6] tracking-wide text-on-accent-secondary uppercase after:absolute after:top-full after:left-0 after:h-px after:w-full after:bg-on-accent-secondary after:content-['']">
                    {block.ctaLabel}
                  </p>
                )}
                <ArrowDownRightIcon className="h-[4.27rem] w-[4.35rem] shrink-0 text-on-accent-secondary" />
              </div>
            </Tile>
          )}
        </div>
      </div>
    </section>
  )
}
```

`BlockImage` is typed from the hero image shape; if `article.image` does not type-check against it, widen `BlockImage`'s `ImageValue` in Task 5's Step 1 now instead (do that change here, once: see Task 5 Step 1) and note it in the ledger.

`frontend/components/blocks/EventsPreview.tsx` (port of `$ND/components/EventsPreview.tsx`):

```tsx
import {ClockIcon, MapPinIcon} from '@/components/icons'
import {eventParts} from '@/sanity/lib/dates'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function EventsPreview({block}: BlockProps<'eventsPreview'>) {
  const events = (block.events ?? [])
    .slice(0, block.count ?? 2)
    .flatMap((event) => {
      const parts = eventParts(event.start, event.end)
      return parts ? [{event, parts}] : []
    })

  return (
    <div className="relative bg-background tf-px py-s4">
      <div className="flex w-full flex-col items-start gap-s4 tf-max-w">
        {block.eyebrow && <Eyebrow className="w-full text-on-background">{block.eyebrow}</Eyebrow>}
        {events.length === 0 ? (
          <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
            No upcoming events right now.
          </p>
        ) : (
          <div className="flex w-full flex-col divide-y divide-border-light lg:flex-row lg:items-stretch lg:divide-x lg:divide-y-0">
            {events.map(({event, parts}) => (
              <div
                key={event._id}
                className="flex gap-8 py-12 first:pt-0 last:pb-0 lg:flex-1 lg:gap-10 lg:px-10 lg:py-0 lg:first:pl-0 lg:last:pr-0"
              >
                <div className="flex size-[112px] shrink-0 flex-col items-center justify-center gap-2 rounded bg-surface-dark p-3 text-center text-on-surface-dark md:size-[200px] md:gap-3">
                  <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.weekday}</p>
                  <p className="text-headline-xl leading-[1.1]">{parts.day}</p>
                  <p className="font-mono text-body-small leading-[1.6] tracking-wide uppercase">{parts.month}</p>
                </div>
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3 md:gap-6">
                  <p className="w-full text-headline-base leading-[1.1] text-on-background">{event.title}</p>
                  <div className="flex w-full flex-wrap items-center gap-x-6 gap-y-3">
                    <div className="flex items-center gap-3">
                      <ClockIcon className="size-6 shrink-0" />
                      <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
                        {parts.time}
                      </p>
                    </div>
                    {event.location && (
                      <div className="flex items-center gap-3">
                        <MapPinIcon className="size-6 shrink-0" />
                        <p className="font-sans text-body-base leading-[1.6] text-on-background-subtle">
                          {event.location}
                        </p>
                      </div>
                    )}
                  </div>
                  {event.description && (
                    <p className="w-full font-sans text-body-base leading-[1.6] text-on-background-subtle">
                      {event.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
```

Register `newsPreview: NewsPreview` and `eventsPreview: EventsPreview` in `BlockRenderer.tsx`.

- [ ] **Step 6: Hourly revalidation, so "upcoming" is not frozen at build time**

Add `export const revalidate = 3600` (with a one-line comment: events drop off once past, which is computed at fetch time) to `frontend/app/[...slug]/page.tsx` and `frontend/app/page.tsx`. Run `cd frontend && NODE_ENV=production npx next build 2>&1 | tail -30`. Expected: the build succeeds and the route table shows the pages with a revalidate interval (`Revalidate 1h`, or equivalent). If the build errors or the interval is not shown, remove the exports, record a ruling, and file a GitHub issue ("Upcoming events are only refreshed on content edits") instead.

- [ ] **Step 7: Gate and commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build` once.

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: add news preview and events preview blocks

Events are filtered to upcoming at fetch time and the page revalidates hourly,
so a past event drops off without a content edit. CardNews is not ported: no
block uses it.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: FAQ list

**Files:**
- Create: `studio/src/schemaTypes/objects/faqList.ts`, `frontend/components/blocks/FaqList.tsx`, `FaqItem.tsx`
- Modify: `index.ts`, `documents/page.ts`, `queries.ts`, `BlockRenderer.tsx`, `frontend/components/icons/index.tsx`, `frontend/css/ui.css`

**Interfaces:**
- Consumes: `markDefsFields` (queries), `CustomPortableText` with `variant="basic"`, `decorative-line-faqs.svg` (Task 3).
- Produces: `faqList` (`heading`, query-added `ungrouped[]` and `groups[]: {_id, title, faqs[]}`). `FaqItem({question, children})`. Icons `ChevronDownIcon`, `ChevronUpIcon`. CSS: `.rich-text-basic` reads `--rich-text-color`.

- [ ] **Step 1: Icons and the rich-text colour hook**

Append to `icons/index.tsx`:

```tsx
/** Chevron pointing down. Figma: chevron-down. 24 x 24. */
export function ChevronDownIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Chevron pointing up. Figma: chevron-up. 24 x 24. */
export function ChevronUpIcon({className}: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M18 15L12 9L6 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
```

In `frontend/css/ui.css`, change the `.rich-text-basic` rule's `color: var(--color-on-background);` to `color: var(--rich-text-color, var(--color-on-background));`. (A Tailwind colour utility cannot override it, because this stylesheet is not in a layer; a custom property can.)

- [ ] **Step 2: Schema and query**

`studio/src/schemaTypes/objects/faqList.ts`:

```ts
import {HelpCircleIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/**
 * Every FAQ, grouped under its category. FAQs without a category come first, ungrouped; a
 * category with no FAQs is not shown. Order comes from each document's Order field.
 */
export const faqList = defineBlock({
  name: 'faqList',
  title: 'FAQ List',
  type: 'object',
  icon: HelpCircleIcon,
  fields: [defineField({name: 'heading', title: 'Heading', type: 'string', initialValue: 'FAQs'})],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'FAQ List'}),
  },
})
```

Register in `index.ts` and `page.ts`. Query branch in `pageBuilderFields`:

```ts
    _type == "faqList" => {
      ...,
      "ungrouped": *[_type == "faq" && !defined(category)] | order(order asc, question asc) {
        _id,
        question,
        answer[]{
          ...,
          ${markDefsFields}
        }
      },
      "groups": *[_type == "faqCategory"] | order(order asc, title asc) {
        _id,
        title,
        "faqs": *[_type == "faq" && category._ref == ^._id] | order(order asc, question asc) {
          _id,
          question,
          answer[]{
            ...,
            ${markDefsFields}
          }
        }
      }[count(faqs) > 0]
    },
```

Run `cd frontend && npm run sanity:typegen`.

- [ ] **Step 3: Components**

`frontend/components/blocks/FaqItem.tsx`:

```tsx
'use client'

import {useId, useState} from 'react'

import {ChevronDownIcon, ChevronUpIcon} from '@/components/icons'

/**
 * One accordion item, as in nlb-design's FaqItem. The heading wraps a real button
 * (aria-expanded, aria-controls) and the answer is a sibling, not nested inside the button
 * (nlb-design nested a paragraph in a button, which is invalid HTML). Items open independently.
 */
export default function FaqItem({question, children}: {question: string; children: React.ReactNode}) {
  const [open, setOpen] = useState(false)
  const answerId = useId()

  return (
    <div className="flex w-full flex-col items-start gap-8 overflow-clip rounded bg-surface-dark p-6 text-left">
      <h4 className="w-full">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={answerId}
          onClick={() => setOpen((isOpen) => !isOpen)}
          className="flex w-full cursor-pointer items-start gap-10 text-left font-mono text-body-base leading-[1.6] text-on-surface-dark focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-moody-moor-500"
        >
          <span className="min-w-px flex-1 break-words">{question}</span>
          {open ? (
            <ChevronUpIcon className="size-6 shrink-0" />
          ) : (
            <ChevronDownIcon className="size-6 shrink-0" />
          )}
        </button>
      </h4>
      <div id={answerId} hidden={!open} className="w-full">
        {children}
      </div>
    </div>
  )
}
```

`frontend/components/blocks/FaqList.tsx` (port of the FAQs section in `$ND/app/faqs/page.tsx`):

```tsx
import type {PortableTextBlock} from 'next-sanity'
import Image from 'next/image'

import CustomPortableText from '@/components/PortableText'

import FaqItem from './FaqItem'
import {BlockProps} from './types'

type Faq = NonNullable<BlockProps<'faqList'>['block']['ungrouped']>[number]

function FaqRows({faqs}: {faqs: Faq[]}) {
  return (
    <div className="flex w-full flex-col items-start gap-5">
      {faqs.map((faq) => (
        <FaqItem key={faq._id} question={faq.question}>
          {faq.answer && (
            <CustomPortableText
              variant="basic"
              className="[--rich-text-color:var(--color-on-surface-dark)]"
              value={faq.answer as PortableTextBlock[]}
            />
          )}
        </FaqItem>
      ))}
    </div>
  )
}

export default function FaqList({block}: BlockProps<'faqList'>) {
  const ungrouped = block.ungrouped ?? []
  const groups = (block.groups ?? []).filter((group) => group.faqs && group.faqs.length > 0)
  if (ungrouped.length === 0 && groups.length === 0) return null

  return (
    <section className="relative flex w-full overflow-clip bg-background px-10 py-24">
      <Image
        src="/images/blocks/decorative-line-faqs.svg"
        alt=""
        aria-hidden="true"
        width={2102}
        height={284}
        className="pointer-events-none absolute top-48 left-1/2 z-0 w-[150%] max-w-none -translate-x-1/2"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[85rem] flex-col items-start gap-10 lg:flex-row lg:flex-wrap lg:justify-between">
        {block.heading && (
          <h2 className="text-headline-xl leading-none text-on-background">{block.heading}</h2>
        )}
        <div className="flex max-w-[42rem] flex-col items-start gap-16">
          {ungrouped.length > 0 && (
            <div className="flex w-full flex-col items-start gap-6">
              <FaqRows faqs={ungrouped} />
            </div>
          )}
          {groups.map((group) => (
            <div key={group._id} className="flex w-full flex-col items-start gap-6">
              <h3 className="text-headline-base text-on-background">{group.title}</h3>
              <FaqRows faqs={group.faqs} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
```

If `Faq` or `group.faqs` do not type-check as written, derive the type from the generated result (do not hand-write it) and note the change in the ledger. Register `faqList: FaqList` in `BlockRenderer.tsx`.

- [ ] **Step 4: Gate and commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build`.

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: add FAQ list block with an accessible accordion

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: People grid and project grid

**Files:**
- Create: `studio/src/schemaTypes/objects/peopleGrid.ts`, `projectGrid.ts`; `frontend/components/cards/CardStaff.tsx`, `CardCommissioner.tsx`, `CardProject.tsx`; `frontend/components/blocks/PeopleGrid.tsx`, `ProjectGrid.tsx`
- Modify: `index.ts`, `documents/page.ts`, `queries.ts`, `BlockRenderer.tsx`, `frontend/components/blocks/BlockImage.tsx`

**Interfaces:**
- Consumes: `Tag` (Phase A), `BlockImage`, `formatMonthYear` (Task 2), `defineBlock`, `linkReference`.
- Produces: `peopleGrid` (`heading`, `source: 'staff' | 'commissioners'`, query-added `staff[]` and `commissioners[]`) and `projectGrid` (`heading`, query-added `projects[]`). `CardStaff({person})`, `CardCommissioner({person})`, `CardProject({project})`, each taking one item of the generated arrays.

- [ ] **Step 1: Widen `BlockImage` to any image shape**

Replace `BlockImage`'s `ImageValue` union with a structural type built from the generated image types, so headshots (no alt field), project images and article images all fit:

```tsx
import type {SanityImageCrop, SanityImageHotspot} from '@/sanity.types'

type ImageValue = {
  asset?: {_ref?: string} | null
  hotspot?: SanityImageHotspot
  crop?: SanityImageCrop
  alt?: string | null
}
```

Delete the `ExtractPageBuilderType` import and the union. Keep `alt={image.alt ?? ''}`. Run `npm run type-check`; every existing caller must still type-check.

- [ ] **Step 2: Schemas**

`peopleGrid.ts`:

```ts
import {UsersIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** A grid of staff or commissioners, in each person's Order. They come from the People lists. */
export const peopleGrid = defineBlock({
  name: 'peopleGrid',
  title: 'People Grid',
  type: 'object',
  icon: UsersIcon,
  fields: [
    defineField({name: 'heading', title: 'Heading', type: 'string'}),
    defineField({
      name: 'source',
      title: 'Show',
      type: 'string',
      options: {
        list: [
          {title: 'Staff', value: 'staff'},
          {title: 'Commissioners', value: 'commissioners'},
        ],
        layout: 'radio',
      },
      initialValue: 'staff',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {title: 'heading', source: 'source'},
    prepare: ({title, source}) => ({
      title: title || (source === 'commissioners' ? 'Commissioners' : 'Staff'),
      subtitle: 'People Grid',
    }),
  },
})
```

`projectGrid.ts`:

```ts
import {PinIcon} from '@sanity/icons'
import {defineField} from 'sanity'

import {defineBlock} from './blockFields'

/** Every Land Bank property (the map's projects) as a card. They come from Projects. */
export const projectGrid = defineBlock({
  name: 'projectGrid',
  title: 'Project Grid',
  type: 'object',
  icon: PinIcon,
  fields: [defineField({name: 'heading', title: 'Heading', type: 'string'})],
  preview: {
    select: {title: 'heading'},
    prepare: ({title}) => ({title: title || 'Untitled', subtitle: 'Project Grid'}),
  },
})
```

Register both in `index.ts` and `page.ts`.

- [ ] **Step 3: Query branches**

```ts
    _type == "peopleGrid" => {
      ...,
      "staff": *[_type == "staffMember" && ^.source == "staff"] | order(order asc, name asc) {
        _id,
        name,
        title,
        headshot,
        "department": department->{"slug": slug.current, title}
      },
      "commissioners": *[_type == "commissioner" && ^.source == "commissioners"] | order(order asc, name asc) {
        _id,
        name,
        title,
        startDate,
        headshot
      }
    },
    _type == "projectGrid" => {
      ...,
      "projects": *[_type == "project" && defined(slug.current)] | order(name asc) {
        _id,
        name,
        description,
        image,
        link,
        "propertyTypes": propertyTypes[]->{"slug": slug.current, title},
        "resources": resources[]->{"slug": slug.current, title}
      }
    },
```

(`project.link` is a plain `url` string, not the shared link object, so it is not dereferenced.) Run `cd frontend && npm run sanity:typegen`.

- [ ] **Step 4: Cards**

`frontend/components/cards/types.ts`:

```ts
import {ExtractPageBuilderType} from '@/sanity/lib/types'

export type StaffItem = NonNullable<ExtractPageBuilderType<'peopleGrid'>['staff']>[number]
export type CommissionerItem = NonNullable<ExtractPageBuilderType<'peopleGrid'>['commissioners']>[number]
export type ProjectItem = NonNullable<ExtractPageBuilderType<'projectGrid'>['projects']>[number]
```

`CardStaff.tsx` (port of `$ND/components/CardStaff.tsx`; the tag is the department's title, never a hard-coded union):

```tsx
import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'

import type {StaffItem} from './types'

export default function CardStaff({person}: {person: StaffItem}) {
  // A department that was unpublished dereferences to null.
  const department = person.department?.title
  return (
    <div className="flex w-full _max-w-[331px] flex-col items-start gap-3">
      <div className="flex w-full flex-col items-start overflow-clip rounded">
        <div className="relative aspect-[304/380] w-full shrink-0 bg-dusty-heath-800">
          <BlockImage
            image={person.headshot ? {...person.headshot, alt: person.name} : null}
            width={662}
            sizes="331px"
            fill
            className="size-full object-cover"
          />
        </div>
        {department && <Tag label={department} size="lg" rounded={false} className="w-full" />}
      </div>
      <div className="flex w-full flex-col items-start break-words">
        <p className="w-full text-headline-sm leading-[1.2] tracking-normal text-on-background">{person.name}</p>
        {person.title && (
          <p className="w-full font-sans text-body-base leading-[1.6] tracking-normal text-on-background-subtle opacity-60">
            {person.title}
          </p>
        )}
      </div>
    </div>
  )
}
```

`CardCommissioner.tsx`:

```tsx
import BlockImage from '@/components/blocks/BlockImage'
import {formatMonthYear} from '@/sanity/lib/dates'

import type {CommissionerItem} from './types'

export default function CardCommissioner({person}: {person: CommissionerItem}) {
  const since = formatMonthYear(person.startDate)
  return (
    <div className="flex w-full max-w-[448px] flex-col items-start gap-3">
      <div className="relative aspect-[448/556] w-full shrink-0 overflow-clip rounded bg-dusty-heath-800">
        <BlockImage
          image={person.headshot ? {...person.headshot, alt: person.name} : null}
          width={896}
          sizes="448px"
          fill
          className="size-full object-cover"
        />
      </div>
      <div className="flex w-full flex-col items-start break-words">
        <p className="w-full text-headline-sm leading-[1.2] tracking-normal text-on-background">{person.name}</p>
        {person.title && (
          <p className="w-full font-sans text-body-base leading-[1.6] tracking-normal text-on-background-subtle opacity-60">
            {person.title}
          </p>
        )}
        {since && (
          <p className="w-full font-sans text-body-base leading-[1.6] tracking-normal text-on-background-subtle opacity-60">
            Since {since}
          </p>
        )}
      </div>
    </div>
  )
}
```

`CardProject.tsx` (port of `$ND/components/CardProject.tsx`; renders the existing map `project` documents, tags are its property types and resources):

```tsx
import BlockImage from '@/components/blocks/BlockImage'
import Tag from '@/components/ui/Tag'

import type {ProjectItem} from './types'

export default function CardProject({project}: {project: ProjectItem}) {
  // Taxonomies that were unpublished dereference to null.
  const tags = [...(project.propertyTypes ?? []), ...(project.resources ?? [])].flatMap((tag) =>
    tag?.title ? [{key: tag.slug ?? tag.title, label: tag.title}] : [],
  )
  const card = (
    <div className="flex w-full max-w-[322px] flex-col items-start gap-6">
      <div className="relative h-[370px] w-full overflow-hidden rounded bg-dusty-heath-800">
        <BlockImage
          image={project.image}
          width={644}
          sizes="322px"
          fill
          className="size-full object-cover"
        />
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <p className="w-full break-words text-headline-base tracking-normal text-on-background">{project.name}</p>
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1">
            {tags.map((tag) => (
              <Tag key={tag.key} label={tag.label} />
            ))}
          </div>
        )}
        {project.description && (
          <p className="line-clamp-3 w-full break-words font-sans text-body-base font-normal leading-[1.6] tracking-normal text-on-background">
            {project.description}
          </p>
        )}
      </div>
    </div>
  )
  // The project's own link, when it has one; otherwise a plain card, never a dead anchor.
  return project.link ? (
    <a href={project.link} className="block w-full max-w-[322px]">
      {card}
    </a>
  ) : (
    card
  )
}
```

- [ ] **Step 5: Blocks**

`frontend/components/blocks/PeopleGrid.tsx`:

```tsx
import CardCommissioner from '@/components/cards/CardCommissioner'
import CardStaff from '@/components/cards/CardStaff'

import {BlockProps} from './types'

export default function PeopleGrid({block}: BlockProps<'peopleGrid'>) {
  const staff = block.staff ?? []
  const commissioners = block.commissioners ?? []
  if (staff.length === 0 && commissioners.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        {staff.length > 0 && (
          <ul className="grid w-full list-none grid-cols-1 gap-x-6 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-4">
            {staff.map((person) => (
              <li key={person._id}>
                <CardStaff person={person} />
              </li>
            ))}
          </ul>
        )}
        {commissioners.length > 0 && (
          <ul className="grid w-full list-none grid-cols-1 gap-x-6 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {commissioners.map((person) => (
              <li key={person._id}>
                <CardCommissioner person={person} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
```

`frontend/components/blocks/ProjectGrid.tsx`:

```tsx
import CardProject from '@/components/cards/CardProject'

import {BlockProps} from './types'

export default function ProjectGrid({block}: BlockProps<'projectGrid'>) {
  const projects = block.projects ?? []
  if (projects.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        <ul className="grid w-full list-none grid-cols-1 gap-x-6 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <li key={project._id}>
              <CardProject project={project} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
```

Register `peopleGrid: PeopleGrid` and `projectGrid: ProjectGrid` in `BlockRenderer.tsx`.

- [ ] **Step 6: Gate and commit**

Run the gate commands (separately), then `NODE_ENV=production npx next build`.

```bash
git add -A studio frontend sanity.schema.json
git commit -m "feat: add people grid and project grid blocks with staff, commissioner and project cards

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Sample content, gallery, docs, issues and final verification

**Files:**
- Create: `studio/scripts/seedPhaseBContent.ts`
- Modify: `studio/scripts/seedBlockGallery.ts`, `docs/DECISIONS.md`, the spec

- [ ] **Step 1: The sample-content seed**

`studio/scripts/seedPhaseBContent.ts`:

```ts
/**
 * Seeds sample content for the Phase B blocks, as DRAFTS only (nothing is published):
 * taxonomies, news articles, events, FAQs, staff and commissioners.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/seedPhaseBContent.ts --with-user-token -- --dry
 *   npx sanity exec scripts/seedPhaseBContent.ts --with-user-token
 *
 * What it writes: draft documents (Sanity generates every id) plus the sample images it
 * references. Idempotent: each document is matched on a natural key (slug, name, question or
 * title) among published documents and drafts, and skipped if it exists. It never edits an
 * existing document. Events are dated relative to the day it runs, so there are always upcoming
 * ones. Staff and commissioners have no headshots: the cards must show their neutral fallback.
 */

import {randomUUID} from 'node:crypto'
import {createReadStream} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')
const key = () => randomUUID().slice(0, 8)
const ref = (id: string) => ({_type: 'reference' as const, _ref: id})

/** Published id of a document, or of a draft of it. */
const published = (id: string) => id.replace(/^drafts\./, '')

async function find(type: string, field: string, value: string) {
  const ids = await client.fetch<string[]>(`*[_type == $type && ${field} == $value]._id`, {type, value})
  return ids.length > 0 ? published(ids[0]) : null
}

let created = 0
async function ensure(type: string, field: string, value: string, doc: Record<string, unknown>) {
  const existing = await find(type, field, value)
  if (existing) return existing
  created += 1
  if (DRY_RUN) {
    console.log(`[dry run] would create ${type}: ${value}`)
    return `dry-${type}-${value}`
  }
  const result = await client.create({_id: 'drafts.', _type: type, ...doc} as never)
  return published(result._id)
}

async function uploadImage(file: string) {
  if (DRY_RUN) return `dry-image-${file}`
  const path = resolve(__dirname, '../../frontend/public/images/properties', file)
  return (await client.assets.upload('image', createReadStream(path), {filename: file}))._id
}

const slug = (current: string) => ({_type: 'slug', current})
const daysFromNow = (days: number, hourUtc: number) => {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  d.setUTCHours(hourUtc, 30, 0, 0)
  return d.toISOString()
}
const text = (value: string) => ({
  _type: 'block',
  _key: key(),
  style: 'normal',
  markDefs: [],
  children: [{_type: 'span', _key: key(), text: value, marks: []}],
})

async function main() {
  // Taxonomies
  const conservation = await ensure('newsCategory', 'slug.current', 'conservation', {
    title: 'Conservation',
    slug: slug('conservation'),
    order: 10,
  })
  const admin = await ensure('department', 'slug.current', 'administration', {
    title: 'Administration',
    slug: slug('administration'),
    order: 10,
  })
  const property = await ensure('department', 'slug.current', 'property-management', {
    title: 'Property Management',
    slug: slug('property-management'),
    order: 20,
  })
  const general = await ensure('faqCategory', 'slug.current', 'general', {
    title: 'General FAQ',
    slug: slug('general'),
    order: 10,
  })
  const filing = await ensure('faqCategory', 'slug.current', 'form-filing', {
    title: 'Form Filing',
    slug: slug('form-filing'),
    order: 20,
  })
  await ensure('faqCategory', 'slug.current', 'empty-category', {
    title: 'A category with no FAQs (must not appear)',
    slug: slug('empty-category'),
    order: 30,
  })

  // Articles (images are the repo's sample property photos)
  const [beach, jetties, pond] = await Promise.all([
    uploadImage('dionis-beach.jpg'),
    uploadImage('jetties-beach.jpg'),
    uploadImage('long-pond.jpg'),
  ])
  const image = (id: string, alt: string) => ({_type: 'image', asset: ref(id), alt})
  await ensure('article', 'slug.current', 'moorland-carbon-study', {
    title: 'New Study Highlights Carbon Storage Value of Nantucket’s Moorland Ecosystems',
    slug: slug('moorland-carbon-study'),
    date: '2026-08-02',
    image: image(pond, 'A moorland pond'),
    categories: [{...ref(conservation), _key: key()}],
    link: {_type: 'link', linkType: 'href', href: '/map'},
  })
  await ensure('article', 'slug.current', 'polpis-road-farm', {
    title: 'Polpis Road Farm Acquisition Preserves Working Agricultural Land',
    slug: slug('polpis-road-farm'),
    date: '2026-07-12',
    image: image(beach, 'A sandy path through moorland'),
    categories: [{...ref(conservation), _key: key()}],
    // No link: this tile must be a plain tile, not a dead anchor.
  })
  await ensure('article', 'slug.current', 'no-category-article', {
    title: 'An article with no category and no link',
    slug: slug('no-category-article'),
    date: '2026-06-20',
    image: image(jetties, 'A beach'),
  })

  // Events: two upcoming, one that ended long ago (must not appear), one spanning days.
  await ensure('event', 'title', 'Miacomet Golf Jamboree', {
    title: 'Miacomet Golf Jamboree',
    start: daysFromNow(10, 14),
    end: daysFromNow(10, 19),
    location: 'Miacomet Golf Course',
    description: 'A fun-filled day on the fairways where golfers of all ages come together.',
  })
  await ensure('event', 'title', 'Coastal Cleanup Day', {
    title: 'Coastal Cleanup Day',
    start: daysFromNow(20, 14),
    end: daysFromNow(20, 21),
    location: 'Cinco Beach',
    description: 'A hands-on opportunity to give back to the shorelines.',
  })
  await ensure('event', 'title', 'A past event (must not appear)', {
    title: 'A past event (must not appear)',
    start: daysFromNow(-30, 14),
    end: daysFromNow(-30, 18),
  })
  await ensure('event', 'title', 'A two-day event with no location', {
    title: 'A two-day event with no location',
    start: daysFromNow(30, 14),
    end: daysFromNow(31, 19),
  })

  // FAQs
  await ensure('faq', 'question', 'Where can I get paper maps?', {
    question: 'Where can I get paper maps?',
    answer: [text('Paper maps are available at our office during regular office hours.')],
    category: ref(general),
    order: 10,
  })
  await ensure('faq', 'question', 'Does the Land Bank have a lost and found?', {
    question: 'Does the Land Bank have a lost and found?',
    answer: [text('Yes, please call our office to check on any lost items.')],
    category: ref(general),
    order: 20,
  })
  await ensure('faq', 'question', 'Can I process my forms by mail?', {
    question: 'Can I process my forms by mail?',
    answer: [text('Yes, forms can be mailed to our office. Please allow additional processing time.')],
    category: ref(filing),
    order: 10,
  })
  await ensure('faq', 'question', 'A question with no category', {
    question: 'A question with no category',
    answer: [text('This one appears first, ungrouped.')],
    order: 5,
  })

  // People (no headshots on purpose)
  await ensure('staffMember', 'name', 'Alex Example', {
    name: 'Alex Example',
    title: 'Executive Director',
    department: ref(admin),
    order: 10,
  })
  await ensure('staffMember', 'name', 'Sam Sample', {
    name: 'Sam Sample',
    title: 'Property Manager',
    department: ref(property),
    order: 20,
  })
  await ensure('staffMember', 'name', 'Pat Placeholder', {
    name: 'Pat Placeholder',
    title: 'A staff member with no department',
    order: 30,
  })
  await ensure('commissioner', 'name', 'Jordan Example', {
    name: 'Jordan Example',
    title: 'Chair',
    startDate: '2019-01-15',
    order: 10,
  })
  await ensure('commissioner', 'name', 'Riley Sample', {
    name: 'Riley Sample',
    title: 'Commissioner',
    order: 20,
  })

  console.log(`${DRY_RUN ? '[dry run] ' : ''}${created} draft document(s) ${DRY_RUN ? 'would be ' : ''}created.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
```

Run: `cd studio && npx tsc --noEmit && npx sanity exec scripts/seedPhaseBContent.ts --with-user-token -- --dry`
Expected: type-check passes; the dry run lists what it would create and writes nothing.

**Then ask the user** whether to run it for real (it writes draft documents to their dataset). Run it only on a yes: `cd studio && npx sanity exec scripts/seedPhaseBContent.ts --with-user-token`. Expected: `N draft document(s) created`. A second run creates 0.

- [ ] **Step 2: Extend the block gallery**

In `studio/scripts/seedBlockGallery.ts`, add to the `pageBuilder` array (after the Phase A additions, before the empty-state run): a `newsPreview` (count 2, a heading, CTA with a `/map` link), a `newsPreview` with `ctaLink` set to an unresolved page link (the tile must be plain), an `eventsPreview` (count 2), an `eventsPreview` (count 1), a `faqList`, a `peopleGrid` with `source: 'staff'`, a `peopleGrid` with `source: 'commissioners'`, and a `projectGrid` (heading "Properties"). In the empty-state run add one of each new block with only its required fields (`peopleGrid` needs `source`). The header already says to remove and re-seed an existing gallery; add `seedPhaseBContent.ts` to the header's "run first" note.

Run: `cd studio && npx tsc --noEmit && npx sanity exec scripts/seedBlockGallery.ts --with-user-token -- --dry`
Expected: type-check passes; the dry run prints its plan (or "already exists").

- [ ] **Step 3: Update the spec and issue #11**

In the spec's Phase B section replace the cards line so it lists `CardStaff`, `CardCommissioner` and `CardProject` and states that `CardNews` is not ported because `NewsPreview` has its own tile markup and nothing uses a news card until the archive. Then:

```bash
gh issue comment 11 --body "Phase B did not port nlb-design's CardNews: its NewsPreview uses its own tile markup and no block lists news as a grid. Port it with the news archive here. Also needed here: per-article pages (articles currently take an optional link), filters and pagination, and the staff, commissioner and project archive layouts, which Phase B built as plain grids without nlb-design archive designs."
```

- [ ] **Step 4: Record decisions**

Append `## 9. Phase B: content types and data-driven blocks` to `docs/DECISIONS.md` (match the existing "Status / Why / Implication" format), covering: the eight document types and that categorisation is by referenced taxonomies (and `CardStaff`'s hard-coded departments were dropped); "upcoming" computed at fetch with hourly revalidation, in `America/New_York`; articles take an optional `link` until per-item pages exist; the FAQ accordion pattern (heading, button, sibling answer); `CardProject` renders the existing map `project` documents, so there is one "project" in this repo; the assumptions to confirm (grid layouts, "Since Month YYYY", the empty events message) with a reference to issue #14.

Add the new assumptions to issue #14:

```bash
gh issue comment 14 --body "Phase B assumptions to confirm with the designer: staff and commissioner and project grid column counts (nlb-design has the cards but no archive page), commissioners shown as 'Since Month YYYY', the 'No upcoming events right now.' message, and the news tile with no link rendering as a plain tile."
```

- [ ] **Step 5: Final verification**

Run the gate commands (separately), `NODE_ENV=production npx next build`, and `TZ=Asia/Tokyo node frontend/scripts/verifyDates.mts`. Confirm no dev server is running. Commit:

```bash
git add -A docs studio frontend sanity.schema.json
git commit -m "docs: seed Phase B sample content, extend the gallery, record decisions

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-review notes

- **Spec coverage:** documents (five content, three taxonomies) in Task 1; `newsPreview` and `eventsPreview` with computed upcoming and revalidation in Task 3; `faqList` with an accessible accordion in Task 4; `peopleGrid` and `projectGrid` with `CardStaff`, `CardCommissioner` and `CardProject` in Task 5; seeds, gallery, docs and issues in Task 6; dates (Task 2) cover the "computed at render" rule. `CardNews` is the one deliberate deviation, recorded in the plan header, the spec and issue #11.
- **Names checked across tasks:** `formatDate`, `formatMonthYear`, `eventParts`, `SITE_TIME_ZONE` (Task 2) are used with the same signatures in Tasks 3 and 5; `defineTaxonomy` (Task 1); `ExtractPageBuilderType<'peopleGrid'>['staff']` etc. (Task 5 cards) match the query aliases (`staff`, `commissioners`, `projects`, `articles`, `events`, `ungrouped`, `groups`).
- **Judgement calls an executor may hit:** the generated item types may need a derived alias rather than the one written (derive, never hand-write); `BlockImage`'s widening may be needed already in Task 3 (the plan says where); the revalidate exports may not apply (Task 3 Step 6 has the fallback); `sanity schema validate` may warn about previews (fine).

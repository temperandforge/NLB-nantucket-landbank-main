# Figma Design System Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an on-demand `/figma-sync <figma-file-url>` skill that reconciles this repo's Tailwind design tokens and React components with a Figma design-system file, using Figma Code Connect for durable component mappings.

**Architecture:** Storybook is added to `frontend/` so every synced component has an isolated story. A root `CONTEXT.md` glossary tracks the Figma↔code name mapping (code names stay canonical). Tailwind v4's `@theme` block in `frontend/app/globals.css` becomes the single source of truth for design tokens — the legacy `tailwind.config.ts` color palette is removed first to eliminate the existing conflict. The `/figma-sync` skill itself is a new project skill (`.claude/skills/figma-sync/SKILL.md`) that: (1) reads the target Figma file via the Figma MCP server, (2) diffs tokens/components against `@theme` and `CONTEXT.md`, (3) writes/updates `@theme` tokens, `Component.figma.tsx` Code Connect mappings, and `Component.stories.tsx` files directly on the current branch.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4, Storybook 10 (`@storybook/nextjs-vite`), Figma Code Connect, Figma MCP server tools (already available to Claude Code).

## Global Constraints

- Sync is on-demand only — no cron, webhook, or background automation.
- Sync covers tokens + components only, not static assets (icons/images) — that's explicitly out of scope for v1.
- Code naming stays canonical; Figma naming differences are recorded in `CONTEXT.md`, not used to rename code.
- The skill takes a Figma file URL as a parameter — it must not hardcode this one Design System file, since a second file (e.g. page layouts) is expected later.
- Sync writes edits directly to the current branch; review happens via normal `git diff` / PR afterward — no separate diff-and-approve step inside the skill.
- `CONTEXT.md` must stay a pure glossary — no implementation detail, per this repo's domain-modeling convention.
- Follow `AGENTS.md`: read `node_modules/next/dist/docs/` before any Next.js-specific work; log any deferred work in `docs/deferred-work.md`.

---

### Task 1: Resolve the token-source conflict

**Files:**
- Modify: `frontend/tailwind.config.ts`
- Modify: `frontend/app/globals.css` (currently `frontend/css/globals.css` — confirm actual path before editing, see Step 1)
- Create: `frontend/CONTEXT.md`... (no — see Task 3, CONTEXT.md goes at repo root, not here)

**Interfaces:**
- Produces: a single canonical token source (`@theme` in the app's global CSS file) that Task 4 (the sync skill) will write new Figma tokens into.

- [ ] **Step 1: Confirm the current globals.css path and current token duplication**

Run: `find /Users/jtf/Developer/NLB-nantucket-landbank-main/frontend -name globals.css`

Expected: one file, e.g. `frontend/css/globals.css` or `frontend/app/globals.css`. Use whatever path this prints for all following steps (the repo has been mid-restructure; do not assume).

- [ ] **Step 2: Read both token sources side by side**

Run: `cat frontend/tailwind.config.ts` and `cat <globals.css path>`

Confirm the two color sets found during grilling are still present: `tailwind.config.ts` defines `cyan/red/orange/yellow/green/gray/black/white`; `@theme` defines `framework/black/white/brand/blue/yellow/gray`. If they've since changed, note the actual current values instead of assuming these.

- [ ] **Step 3: Decide the merged palette and write it into `@theme`**

For every color used by at least one component under `frontend/components/` (grep for `bg-`, `text-`, `border-` Tailwind color classes to confirm real usage — do not keep unused colors), add or keep its definition in the `@theme` block, using this format (example — adjust names/values to what Step 2 actually found):

```css
@theme {
  --shadow-layer: 0 35px 60px -15px rgba(0, 0, 0, 0.3);

  --color-black: #0d0e12;
  --color-white: #fff;

  --color-cyan-50: #e7fefe;
  --color-cyan-100: #c5fcfc;
  --color-cyan-200: #96f8f8;
  --color-cyan-300: #62efef;
  --color-cyan-400: #18e2e2;
  --color-cyan-500: #04b8be;
  --color-cyan-600: #037782;
  --color-cyan-700: #024950;
  --color-cyan-800: #042f34;
  --color-cyan-900: #072227;
  --color-cyan-950: #0d181c;

  --color-gray-50: #f6f6f8;
  --color-gray-100: #eeeef1;
  --color-gray-200: #e3e4e8;
  --color-gray-300: #bbbdc9;
  --color-gray-400: #9499ad;
  --color-gray-500: #727892;
  --color-gray-600: #515870;
  --color-gray-700: #383d51;
  --color-gray-800: #252837;
  --color-gray-900: #1b1d27;
  --color-gray-950: #13141b;

  --color-red-50: #fff6f5;
  --color-red-100: #ffe7e5;
  --color-red-200: #ffdedc;
  --color-red-300: #fdada5;
  --color-red-400: #f77769;
  --color-red-500: #ef4434;
  --color-red-600: #cc2819;
  --color-red-700: #8b2018;
  --color-red-800: #4d1714;
  --color-red-900: #321615;
  --color-red-950: #1e1011;

  --color-orange-50: #fcf1e8;
  --color-orange-100: #f9e3d2;
  --color-orange-200: #f4c7a6;
  --color-orange-300: #efab7a;
  --color-orange-400: #ea8f4e;
  --color-orange-500: #e57322;
  --color-orange-600: #ba5f1e;
  --color-orange-700: #8f4b1b;
  --color-orange-800: #653818;
  --color-orange-900: #3a2415;
  --color-orange-950: #251a13;

  --color-yellow-50: #fefae1;
  --color-yellow-100: #fcf3bb;
  --color-yellow-200: #f9e994;
  --color-yellow-300: #f7d455;
  --color-yellow-400: #f9bc15;
  --color-yellow-500: #d28a04;
  --color-yellow-600: #965908;
  --color-yellow-700: #653a0b;
  --color-yellow-800: #3b220c;
  --color-yellow-900: #271a11;
  --color-yellow-950: #181410;

  --color-green-50: #e7f9ed;
  --color-green-100: #d0f4dc;
  --color-green-200: #a1eaba;
  --color-green-300: #72e097;
  --color-green-400: #43d675;
  --color-green-500: #3ab564;
  --color-green-600: #329454;
  --color-green-700: #297343;
  --color-green-800: #215233;
  --color-green-900: #183122;
  --color-green-950: #14211a;

  --default-transition-duration: 250ms;
}
```

If Step 2's actual `@theme` block contained tokens not in this example (e.g. `--color-framework`, `--color-brand`, `--color-blue`) that ARE used by real components, keep them too rather than deleting real usages. Only drop tokens confirmed unused in Step 3's grep.

- [ ] **Step 4: Strip color definitions out of `tailwind.config.ts`, keeping non-token config**

`tailwind.config.ts` should retain only non-token config (the `container`, `boxShadow.layer` if not already moved to `@theme`, `fontFamily`, `future`, `plugins`). Remove the `colors` key entirely — Tailwind v4 reads color tokens from `@theme`. Example result:

```ts
import type {Config} from 'tailwindcss'
import typography from '@tailwindcss/typography'

export default {
  content: ['./app/**/*.{ts,tsx}', './sanity/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
    },
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-ibm-plex-mono)'],
      },
    },
  },
  future: {
    hoverOnlyWhenSupported: true,
  },
  plugins: [typography],
} satisfies Config
```

- [ ] **Step 5: Verify nothing broke**

Run: `cd frontend && npm run type-check && npm run lint`

Expected: no new errors related to missing color classes. If any component references a Tailwind color class that no longer resolves (e.g. `text-brand-500` if `brand` was dropped), add that color back into `@theme` — it was in real use.

Run: `cd frontend && npm run dev` and visually spot-check the homepage and one post page in a browser for color regressions (per AGENTS.md: read `node_modules/next/dist/docs/` first if anything about the dev server/config is unfamiliar).

- [ ] **Step 6: Commit**

```bash
git add frontend/tailwind.config.ts frontend/app/globals.css
git commit -m "refactor: consolidate design tokens into Tailwind v4 @theme"
```

---

### Task 2: Add Storybook to `frontend/`

**Files:**
- Create: `frontend/.storybook/main.ts`
- Create: `frontend/.storybook/preview.ts`
- Modify: `frontend/package.json` (add `storybook`/`build-storybook` scripts + devDependencies)
- Create: `frontend/components/Cta.stories.tsx` (one pilot story to prove the setup works)

**Interfaces:**
- Consumes: `frontend/components/Cta.tsx` (existing component, see `frontend/components/Cta.tsx` — props `block`, `index`, `pageType`, `pageId` of type `ExtractPageBuilderType<'callToAction'>`).
- Produces: a working `npm run storybook` command and the `.stories.tsx` convention that Task 4's sync skill will replicate per-component.

- [ ] **Step 1: Install Storybook**

Run: `cd frontend && npx storybook@latest init --type nextjs`

This detects Next.js and wires `@storybook/nextjs-vite` (or the equivalent Next.js builder it selects), adding `.storybook/main.ts`, `.storybook/preview.ts`, and `storybook`/`build-storybook` scripts to `frontend/package.json` automatically. Accept its defaults; do not hand-author these config files, since the installer pins versions compatible with the installed Next.js 16 / React 19.

- [ ] **Step 2: Remove the installer's example story files**

The initializer scaffolds example `Button`/`Header`/`Page` stories unrelated to this codebase.

Run: `cd frontend && rm -rf stories/`

- [ ] **Step 3: Write a pilot story for an existing component**

Create `frontend/components/Cta.stories.tsx`:

```tsx
import type {Meta, StoryObj} from '@storybook/nextjs-vite'

import CTA from './Cta'

const meta: Meta<typeof CTA> = {
  title: 'Components/CTA',
  component: CTA,
}

export default meta
type Story = StoryObj<typeof CTA>

export const Default: Story = {
  args: {
    index: 0,
    pageType: 'page',
    pageId: 'preview',
    block: {
      _type: 'callToAction',
      _key: 'preview-cta',
      eyebrow: 'Eyebrow text',
      heading: 'Call to action heading',
      body: [],
      theme: 'light',
      contentAlignment: 'default',
    },
  },
}
```

Adjust the `block` shape's fields to match whatever `ExtractPageBuilderType<'callToAction'>` actually requires — run `cd frontend && npx tsc --noEmit` after writing this file and fix any type errors it reports about missing/extra fields.

- [ ] **Step 4: Verify Storybook runs and renders the pilot story**

Run: `cd frontend && npm run storybook`

Expected: dev server starts (default port 6006), and `Components/CTA/Default` renders without a runtime error in the Storybook UI. Stop the server after confirming.

- [ ] **Step 5: Commit**

```bash
git add frontend/.storybook frontend/package.json frontend/components/Cta.stories.tsx package-lock.json
git commit -m "feat: add Storybook to frontend"
```

---

### Task 3: Create the `CONTEXT.md` glossary with the Figma↔code mapping table

**Files:**
- Create: `/Users/jtf/Developer/NLB-nantucket-landbank-main/CONTEXT.md`

**Interfaces:**
- Produces: the `## Figma ↔ Code Name Mapping` section and glossary conventions that Task 4's sync skill reads and appends to on every sync run.

- [ ] **Step 1: Read the CONTEXT.md format reference**

Run: `cat /Users/jtf/Developer/NLB-nantucket-landbank-main/.claude/skills/domain-modeling/CONTEXT-FORMAT.md` (or wherever the domain-modeling skill's format file resolved to during this session — re-invoke the `domain-modeling` skill if the path differs, and use its documented format exactly).

- [ ] **Step 2: Write the initial `CONTEXT.md`**

Follow the format from Step 1. At minimum, seed it with:

```markdown
# Nantucket Land Bank — Domain Glossary

## Figma ↔ Code Name Mapping

Code naming is canonical (matches Tailwind utility classes already used in `frontend/`).
This table records where the Figma "Nantucket — Design System" file's naming differs from code.

| Figma name | Code name | Notes |
|---|---|---|
| _(populated by `/figma-sync` as components/tokens are mapped)_ | | |

## Design System Sync

- **figma-sync**: the on-demand `/figma-sync <figma-file-url>` workflow that reconciles Tailwind tokens (`frontend/app/globals.css` `@theme` block) and React components (`frontend/components/`) with a Figma file, via Figma Code Connect. Never runs automatically — always triggered manually.
```

- [ ] **Step 3: Commit**

```bash
git add CONTEXT.md
git commit -m "docs: seed domain glossary with Figma/code mapping table"
```

---

### Task 4: Build the `/figma-sync` skill

**Files:**
- Create: `.claude/skills/figma-sync/SKILL.md`

**Interfaces:**
- Consumes: Figma MCP server tools (`mcp__claude_ai_Figma__get_design_context`, `get_variable_defs`, `get_metadata`, `get_screenshot`, `get_code_connect_map`, `add_code_connect_map`, `get_code_connect_suggestions`) — load `/figma-use` per the Figma MCP server's own instructions before calling `use_figma`; this skill mainly needs the read-side tools, not `use_figma`. The `CONTEXT.md` mapping table (Task 3) and `@theme` block (Task 1).
- Produces: updates to `frontend/app/globals.css`'s `@theme`, new/updated `Component.figma.tsx` Code Connect files and `Component.stories.tsx` files under `frontend/components/`, and new rows in `CONTEXT.md`'s mapping table.

- [ ] **Step 1: Write the skill file**

Create `.claude/skills/figma-sync/SKILL.md`:

```markdown
---
name: figma-sync
description: On-demand sync of Tailwind design tokens and React components in frontend/ with a Figma design-system file, via Figma Code Connect. Use when the user asks to sync, pull, or reconcile code with Figma design changes.
---

# Figma Sync

Reconciles this repo's design tokens and components with a Figma file. Always on-demand — never trigger this automatically or on a schedule.

## Usage

Invoked as `/figma-sync <figma-file-url>`. If no URL is given, ask for one — do not assume the last-used file, since this workflow is designed to support multiple Figma files over time.

## Steps

1. **Read current code state.**
   - Read the `@theme` block in `frontend/app/globals.css` (all current design tokens).
   - Read `CONTEXT.md`'s "Figma ↔ Code Name Mapping" table.
   - List existing Code Connect files: `find frontend/components -name "*.figma.tsx"`.

2. **Read the Figma file.**
   - Call `get_variable_defs` on the file/node for design tokens (colors, spacing, typography, radii).
   - Call `get_metadata` to enumerate top-level components/component sets.
   - For each component, call `get_design_context` (and `get_screenshot` if visual comparison is needed) to get its structure and variant/prop definitions.

3. **Diff tokens.**
   - For each Figma variable, check `CONTEXT.md`'s mapping table for a known code name.
   - If mapped and the value differs from `@theme`, update `@theme` with the new value.
   - If unmapped, ask the user (or infer from context) what the equivalent code token name should be, using the naming conventions already in `@theme` (e.g. `--color-<name>-<50..950>` for color scales). Add a new row to `CONTEXT.md`'s table.
   - Never rename an existing code token to match Figma's name — code naming is canonical.

4. **Diff components.**
   - For each Figma component/component-set without a `Component.figma.tsx` file yet:
     - Determine (or ask the user) which existing `frontend/components/*.tsx` file it corresponds to, or whether it's net new.
     - Write `frontend/components/<Name>.figma.tsx` using Figma Code Connect's `figma.connect()` API, mapping Figma variant/prop names to the component's actual TypeScript prop names (per Code Connect's docs — read them via the Figma MCP server /Code Connect skill before writing the first mapping file in a sync session).
     - Create or update `frontend/components/<Name>.stories.tsx` alongside it (see `frontend/components/Cta.stories.tsx` for the project's story convention).
   - For each existing `Component.figma.tsx`, re-run `get_code_connect_suggestions` and update the mapping if the Figma component's props/variants changed.

5. **Report.**
   - Summarize what changed: token diffs, new/updated Code Connect files, new/updated stories, new glossary rows.
   - Remind the user to review via `git diff` and run `cd frontend && npm run type-check && npm run storybook` before committing.

## Out of scope

- No asset (icon/image) export or sync — tokens and components only.
- No automation — this skill is only ever run when explicitly invoked.
```

- [ ] **Step 2: Dry-run the skill against the real Figma file**

Invoke `/figma-sync https://www.figma.com/design/gvzEWIlCG5ER28tsFD6YlI/Nantucket---Design-System?node-id=0-1&p=f&t=wi9bqwqQmua1FEau-0` and confirm:
- It reads the current `@theme` and `CONTEXT.md` without error.
- It successfully calls at least `get_metadata` and `get_variable_defs` against the file (confirms the Figma desktop app + MCP server connection works end-to-end).
- It stops to ask before renaming any code token or guessing an ambiguous component match, rather than silently guessing.

If the Figma MCP server isn't connected/available in this session, stop here and tell the user — do not fake the dry run.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/figma-sync/SKILL.md
git commit -m "feat: add /figma-sync skill for on-demand Figma design-system sync"
```

---

## Self-Review Notes

- **Spec coverage:** on-demand trigger (Task 4 step 1's explicit rule), tokens+components scope (Tasks 1 & 4), Storybook-backed components (Task 2, wired into Task 4 step 4), Code Connect mappings (Task 4), token consolidation into `@theme` (Task 1), code-canonical naming + mapping table (Task 3, enforced in Task 4 step 3), direct-edit output (Task 4 step 5 just reports, doesn't gate on approval), generalized file-URL parameter (Task 4's `<figma-file-url>` argument), no asset pipeline (explicitly out of scope in Task 4's skill file).
- **Placeholder scan:** no TBD/TODO left; the one deliberately open point (exact current token values, exact `ExtractPageBuilderType` shape) is flagged as "confirm before editing" rather than assumed, since the repo is mid-restructure and file paths/types may have shifted since this plan was written.
- **Type consistency:** `Cta.stories.tsx` uses `CTA`'s actual exported prop shape (`block`, `index`, `pageType`, `pageId`) as found in `frontend/components/Cta.tsx`.

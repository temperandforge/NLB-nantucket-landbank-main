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
   - Read the `@theme` block in `frontend/css/globals.css` (all current design tokens). This is the only source of current token values — `frontend/tailwind.config.ts` no longer contains color tokens.
   - Read `CONTEXT.md`'s "Figma ↔ Code Name Mapping" table.
   - List existing Code Connect files: `find frontend/components -name "*.figma.tsx"`.

2. **Read the Figma file.**
   - Call `get_variable_defs` on the file/node for design tokens (colors, spacing, typography, radii).
   - Call `get_metadata` to enumerate top-level components/component sets.
   - For each component, call `get_design_context` (and `get_screenshot` if visual comparison is needed) to get its structure and variant/prop definitions.

3. **Diff tokens.**
   - For each Figma variable, check `CONTEXT.md`'s mapping table for a known code name.
   - If mapped and the value differs from `@theme`, update `@theme` in `frontend/css/globals.css` with the new value.
   - If unmapped, ask the user (or infer from context) what the equivalent code token name should be, using the naming conventions already in `@theme` (e.g. `--color-<name>-<50..950>` for color scales). Add a new row to `CONTEXT.md`'s "Figma ↔ Code Name Mapping" table — keep the addition to a term/definition entry and a mapping-table row only; do not add implementation detail elsewhere in `CONTEXT.md`, which stays a glossary per `.agents/skills/domain-modeling/CONTEXT-FORMAT.md`.
   - Never rename an existing code token to match Figma's name — code naming is canonical.

4. **Diff components.**
   - For each Figma component/component-set without a `Component.figma.tsx` file yet:
     - Determine (or ask the user) which existing `frontend/components/*.tsx` file it corresponds to, or whether it's net new.
     - Write `frontend/components/<Name>.figma.tsx` using Figma Code Connect's `figma.connect()` API, mapping Figma variant/prop names to the component's actual TypeScript prop names (per Code Connect's docs — read them via the Figma MCP server's Code Connect skill before writing the first mapping file in a sync session).
     - Create or update `frontend/components/<Name>.stories.tsx` alongside it, following the convention in `frontend/components/Cta.stories.tsx` (the reference example). `.storybook/main.ts`'s `stories` glob already picks up any `frontend/components/**/*.stories.@(js|jsx|mjs|ts|tsx)` automatically — no config change needed.
   - For each existing `Component.figma.tsx`, re-run `get_code_connect_suggestions` and update the mapping if the Figma component's props/variants changed.

5. **Report.**
   - Summarize what changed: token diffs, new/updated Code Connect files, new/updated stories, new glossary rows.
   - Remind the user to review via `git diff` and run `cd frontend && npm run type-check && npm run storybook` before committing.

## Out of scope

- No asset (icon/image) export or sync — tokens and components only.
- No automation — this skill is only ever run when explicitly invoked.

<!-- BEGIN:nextjs-agent-rules -->

# Next.js: ALWAYS read docs before coding

Before any Next.js work, find and read the relevant doc in `node_modules/next/dist/docs/`. Your training data is outdated — the docs are the source of truth.

<!-- END:nextjs-agent-rules -->

# Deferred work: record it in `docs/deferred-work.md`

Do not leave deferred work inline as scattered `TODO`/`FIXME` comments or bury it in commit messages. When you defer something — a follow-up, a known limitation, a punted edge case, tech debt, or work that's out of scope for the current change — record it in `docs/deferred-work.md`. Each entry should say what needs doing, why it was deferred, and any relevant context (file paths, links). Keep this file as the single source of truth for outstanding work.

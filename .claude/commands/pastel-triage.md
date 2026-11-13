---
description: Fix active Pastel comments tagged @claude on the NLB canvas, one worktree and PR each
argument-hint: "[comment id] (optional; default: all active @claude comments)"
---

Pastel @claude triage for NLB. Canvas 984320 (nlb-main.vercel.app), label id 8942 ("@claude").

If an argument was given (`$ARGUMENTS`), work only on that comment id. Otherwise:

1. Run `pastel comments ls 984320 --status active --label-id 8942 --limit 200`. If none, say so and stop.
2. Skip any comment whose last reply is mine asking for clarification, unless a newer reply from someone else exists.
3. For each remaining comment: `pastel comments get <id>` (plus `comments screenshots get` and `comments attachment get` if present). Then claim it with `pastel comments set-status <id> --status in-progress`.
4. Create a fresh git worktree off `origin/main` (branch `claude/pastel-<id>-<slug>`). Never touch the main checkout or other worktrees.
5. Read `AGENTS.md` and the relevant `docs/DECISIONS.md` entries, and follow the project rules: read `node_modules/next/dist/docs` before Next.js work; run typegen, type-check, lint and studio `tsc` as AGENTS.md requires; verify visual changes in the browser; stop any dev server you started. Find the root cause and fix it. Group comments on the same page or file into one worktree and PR.
6. If the code already does what the comment asks, or the comment is ambiguous or not code-fixable, change nothing: reply asking for clarification (say what you checked) and set the status back to `active`. Remove the worktree.
7. Otherwise commit (with the Co-Authored-By trailer), push, and open a PR with `gh pr create` that references the Pastel comment id(s) and URL.
8. Reply on each comment with what changed and the PR link, then set it to `in-review` (not `resolved`; the reviewer signs off).

Prefix every comment or reply you post to Pastel with `[CLAUDE] @claude_response `.

Don't use `pastel deploy` (the site deploys via Vercel from the PR). Don't merge PRs. Finish with a table: comment id, outcome, PR link.

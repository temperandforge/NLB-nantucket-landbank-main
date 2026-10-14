# Site search: result ordering

How `/search` orders its results. The query is `searchQuery` in
`frontend/sanity/lib/queries.ts`; parsing, snippets and tabs are in `frontend/sanity/lib/search.ts`.
The wider decision is [DECISIONS 4.10](DECISIONS.md).

## Which documents are results

A document is a result when it has a destination and every typed word matches somewhere in it.

- Each word becomes a prefix pattern (`rain` -> `rain*`), so a half-typed word still matches.
- Every pattern must match, in any field and in any order. "rain garden" matches a document with
  "rain" in its title and "garden" in its body.
- Searchable types: pages (not `pathOnly`), news, projects, events, records with a file, and
  properties that have a `link`.
- A page's text is its `name` plus the headings and plain-text bodies of its visible blocks.

## Score

| Match in | Adds |
| --- | --- |
| `title` | 8 |
| `name` (pages, properties) | 8 |
| `description` | 1 |
| `body` (plain text) | 1 |

- Page headings and block text decide whether a page is a result, but add nothing to its score. A
  page that matches only in its blocks scores 0 and sorts below any result with a title or
  description match.
- Within a field, each typed word adds to the score once it matches.

## Order

1. Score, highest first.
2. For equal scores, `_updatedAt`, newest first.

## What this means in practice

- Content type does not affect ranking. News, events and projects that match the same way sit
  together, ordered by when they were last edited.
- Recency is a tie-breaker only, not a boost. A newer document with a weaker match does not
  outrank an older one with a stronger match.
- The "All" tab shows this order. The kind tabs (News, Projects, ...) filter the same list and
  keep its order.
- Results are cut at 50 after sorting, so the cut keeps the best matches. The query asks for 51 so
  the page can say the list was cut.
- Events include ones that have already happened.

## Changing it

Edit the `score(...)` call and the `order(...)` clause in `searchQuery`. Likely adjustments, all
content decisions: boosting pages over events, pushing past events down, weighting recency. Run
`npm run sanity:typegen` in `frontend` afterwards, since the query text is part of the generated
types.

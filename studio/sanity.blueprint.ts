import {defineBlueprint, defineDocumentFunction} from '@sanity/blueprints'

// The fields the function needs from a page, as they were before and after the publish.
// `before` is null on a page's first publish.
const PAGE_STATE = `{"slug": slug.current, "parentId": parent._ref, "pathOnly": coalesce(pathOnly, false)}`

/**
 * One document function: when a published page's slug, parent or pathOnly changes, write redirects
 * from its old URL (and its descendants' old URLs) to the page. See
 * functions/auto-redirect/index.ts and docs/superpowers/specs/2026-10-23-redirects-design.md.
 */
export default defineBlueprint({
  resources: [
    defineDocumentFunction({
      name: 'auto-redirect',
      src: 'functions/auto-redirect',
      memory: 2,
      timeout: 30,
      event: {
        on: ['publish'],
        filter: `_type == "page" && delta::changedAny((slug.current, parent, pathOnly))`,
        projection: `{"id": _id, "before": before()${PAGE_STATE}, "after": after()${PAGE_STATE}}`,
      },
    }),
  ],
})

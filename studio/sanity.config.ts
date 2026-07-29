/**
 * This config is used to configure your Sanity Studio.
 * Learn more: https://www.sanity.io/docs/configuration
 */

import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './src/schemaTypes'
import {structure} from './src/structure'
import {unsplashImageAsset} from 'sanity-plugin-asset-source-unsplash'
import {
  presentationTool,
  defineDocuments,
  defineLocations,
  type DocumentLocation,
} from 'sanity/presentation'
import {assist} from '@sanity/assist'
import {
  buildPagePath,
  PAGE_LOCATION_SELECT,
  PAGE_PRESENTATION_ROUTES,
} from './src/lib/pageHierarchy'

// Environment variables for project configuration
const projectId = process.env.SANITY_STUDIO_PROJECT_ID || 'your-projectID'
const dataset = process.env.SANITY_STUDIO_DATASET || 'production'

// URL for preview functionality, defaults to localhost:3000 if not set
const SANITY_STUDIO_PREVIEW_URL = process.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:3000'

// Define the home location for the presentation tool
const homeLocation = {
  title: 'Home',
  href: '/',
} satisfies DocumentLocation

// resolveHref() is a convenience function that resolves the URL
// path for different document types and used in the presentation tool.
//
// Pages are deliberately absent: a page's URL comes from its parent chain, not its slug alone,
// so it is assembled in that type's location resolver below rather than from a single value here.
function resolveHref(documentType?: string, slug?: string): string | undefined {
  switch (documentType) {
    case 'post':
      return slug ? `/posts/${slug}` : undefined
    default:
      console.warn('Invalid document type:', documentType)
      return undefined
  }
}

// Main Sanity configuration
export default defineConfig({
  name: 'default',
  title: 'NLB',

  projectId,
  dataset,

  plugins: [
    // Presentation tool configuration for Visual Editing
    presentationTool({
      previewUrl: {
        origin: SANITY_STUDIO_PREVIEW_URL,
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        // The Main Document Resolver API provides a method of resolving a main document from a given route or route pattern. https://www.sanity.io/docs/visual-editing/presentation-resolver-api#57720a5678d9
        mainDocuments: defineDocuments([
          {
            route: '/',
            filter: `_type == "settings" && _id == "siteSettings"`,
          },
          // Ahead of the page routes below, which would otherwise capture /posts/:slug as a
          // two-segment page path.
          {
            route: '/posts/:slug',
            // Parenthesised deliberately: without it && binds tighter than ||, so the filter
            // matched any document whose _id happened to equal the slug.
            filter: `_type == "post" && (slug.current == $slug || _id == $slug)`,
          },
          // One route per URL depth, defined in src/lib/pageHierarchy.ts so the same filters can
          // be exercised by scripts/verifyPageRouting.ts instead of being restated there.
          ...PAGE_PRESENTATION_ROUTES,
        ]),
        // Locations Resolver API allows you to define where data is being used in your application. https://www.sanity.io/docs/visual-editing/presentation-resolver-api#8d8bca7bfcd7
        locations: {
          settings: defineLocations({
            locations: [homeLocation],
            message: 'This document is used on all pages',
            tone: 'positive',
          }),
          page: defineLocations({
            // Dereferences the parent chain so the URL can be assembled here the same way the
            // frontend assembles it. Depth-bounded via src/lib/pageHierarchy.ts.
            select: PAGE_LOCATION_SELECT,
            resolve: (doc) => {
              // A path-only page groups its children in the URL but is not viewable itself, so
              // it has no location to point at.
              if (doc?.pathOnly) {
                return {
                  locations: [],
                  message: 'This page only groups its children in the URL - it has no page of its own.',
                }
              }
              const path = buildPagePath([doc?.grandparentSlug, doc?.parentSlug, doc?.slug])
              if (!path) {
                return {locations: [], message: 'Add a slug to preview this page.'}
              }
              return {
                locations: [
                  {
                    title: doc?.name || 'Untitled',
                    href: `/${path}`,
                  },
                ],
              }
            },
          }),
          post: defineLocations({
            select: {
              title: 'title',
              slug: 'slug.current',
            },
            resolve: (doc) => ({
              locations: [
                {
                  title: doc?.title || 'Untitled',
                  href: resolveHref('post', doc?.slug)!,
                },
                {
                  title: 'Home',
                  href: '/',
                } satisfies DocumentLocation,
              ].filter(Boolean) as DocumentLocation[],
            }),
          }),
        },
      },
    }),
    structureTool({
      structure, // Custom studio structure configuration, imported from ./src/structure.ts
    }),
    // Additional plugins for enhanced functionality
    unsplashImageAsset(),
    assist(),
    visionTool(),
  ],

  // Schema configuration, imported from ./src/schemaTypes/index.ts
  schema: {
    types: schemaTypes,
  },
})

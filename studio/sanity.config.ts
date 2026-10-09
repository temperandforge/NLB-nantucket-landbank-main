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
import {media} from 'sanity-plugin-media'
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
          // The root shows the landing page chosen in Site Settings. A draft is matched too, so a
          // landing page that has not been published yet still opens in Presentation.
          {
            route: '/',
            filter: `_type == "page" && !coalesce(pathOnly, false)
              && string::split(_id, "drafts.")[-1] == *[_type == "settings" && _id == "siteSettings"][0].landingPage._ref`,
          },
          // A news article page. Listed before the page routes: /news/<slug> also fits their
          // two-segment pattern, and the more specific route must be tried first.
          {
            route: '/news/:slug',
            filter: `_type == "article" && slug.current == $slug`,
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
          article: defineLocations({
            select: {title: 'title', slug: 'slug.current'},
            resolve: (doc) => ({
              locations: doc?.slug
                ? [{title: doc.title || 'Untitled', href: `/news/${doc.slug}`}]
                : [],
              message: doc?.slug ? undefined : 'Add a slug to preview this article.',
            }),
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
        },
      },
    }),
    structureTool({
      structure, // Custom studio structure configuration, imported from ./src/structure.ts
    }),
    // Additional plugins for enhanced functionality
    unsplashImageAsset(),
    /**
     * Media browser. Adds a "Media" tool for browsing, tagging and bulk-managing every asset in
     * the dataset, and registers itself as an asset source on image and file fields.
     *
     * Left unconfigured deliberately: it is enabled for file fields as well as images, which is
     * what lets an editor re-select an already-uploaded GeoJSON on Project Settings rather than
     * having to upload it again.
     */
    media(),
    assist(),
    visionTool(),
  ],

  // Schema configuration, imported from ./src/schemaTypes/index.ts
  schema: {
    types: schemaTypes,
  },
})

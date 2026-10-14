import {PinIcon} from '@sanity/icons'

import {defineBlock} from './blockFields'

/**
 * The filterable interactive map: every property, boundary and trail from Properties Settings, with
 * Property Type and Resources filters. It has no text of its own: put a Hero Tertiary above it for
 * the page heading and intro. Distinct from Map Preview, which is the lightweight embed with a
 * heading and no filters. Filters live in the URL, so two Map Explorers on one page share them.
 */
export const mapExplorer = defineBlock({
  name: 'mapExplorer',
  title: 'Map Explorer',
  type: 'object',
  icon: PinIcon,
  description:
    'The full filterable map of every property. Add a Hero Tertiary above it for the heading. Use Map Preview for a short embed without filters.',
  fields: [],
  preview: {
    prepare: () => ({title: 'Map Explorer', subtitle: 'Filterable map of every property'}),
  },
})

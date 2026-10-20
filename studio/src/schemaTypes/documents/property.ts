import {defineArrayMember, defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons'

import {BoundaryIdsInput} from '../../components/BoundaryIdsInput'
import {blockContentMembers} from '../objects/blockContent'

/**
 * A Land Bank property - the parcels, beaches, trails and ponds shown on the interactive map.
 *
 * Each property has a page of its own at /properties/<slug>; its address is derived from the slug, so
 * there is no link field. Listed on the Properties archive too. It replaced the `project` type (migrated by
 * scripts/migrateProjectsToProperties.ts), which itself replaced the hardcoded list that used to
 * live in frontend/app/map/properties.ts. Categorisation
 * is by reference to propertyType and resource documents so the client can extend either without
 * a deploy.
 *
 * Boundary geometry is NOT stored here. The client maintains one GeoJSON file covering every
 * boundary (uploaded on Properties Settings) and each property points into it by identifier - see
 * boundaryId below.
 */

export const property = defineType({
  name: 'property',
  title: 'Property',
  type: 'document',
  icon: PinIcon,
  groups: [
    {name: 'details', title: 'Details', default: true},
    {name: 'page', title: 'Page Content'},
    {name: 'map', title: 'Map'},
  ],
  fields: [
    defineField({
      name: 'name',
      title: 'Name',
      type: 'string',
      group: 'details',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      group: 'details',
      description: 'The property page lives at /properties/<slug>.',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      group: 'details',
      description:
        'The large image at the top of the property page, and the one shown in the map popup and on the Properties archive. A property without one shows the default property image from Site Settings.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Important for accessibility and SEO.',
        }),
      ],
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      group: 'details',
      description: 'Short summary shown in the map popup and on the Properties archive.',
    }),
    defineField({
      name: 'propertyTypes',
      title: 'Property types',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'reference', to: [{type: 'propertyType'}]})],
      description: 'What kind of property this is. Drives the Property Type filter on the map.',
    }),
    defineField({
      name: 'resources',
      title: 'Resources',
      type: 'array',
      group: 'details',
      of: [defineArrayMember({type: 'reference', to: [{type: 'resource'}]})],
      description: 'Amenities available here. Drives the Resources filter on the map.',
    }),
    defineField({
      name: 'about',
      title: 'About',
      type: 'array',
      of: blockContentMembers({h2: true}),
      group: 'page',
      description:
        'The main text beside the property name. Add an “About” heading yourself (Heading 2) if you want one; none is added for you.',
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      group: 'page',
      description:
        'The image carousel on the property page. The caption appears over the image when a visitor hovers it. Leave empty to hide the carousel.',
      of: [
        defineArrayMember({
          type: 'image',
          options: {hotspot: true},
          fields: [
            defineField({
              name: 'alt',
              title: 'Alternative text',
              type: 'string',
              description: 'Important for accessibility and SEO.',
            }),
            defineField({
              name: 'caption',
              title: 'Caption',
              type: 'string',
              description: 'Optional. Shown over the image on hover, e.g. “Trails”.',
            }),
          ],
        }),
      ],
    }),
    defineField({
      name: 'mapHeading',
      title: 'Map heading',
      type: 'string',
      group: 'page',
      description: 'The heading above the map on the property page. Default: “<property name> Trails and Properties”.',
    }),
    defineField({
      name: 'mapBody',
      title: 'Map intro',
      type: 'text',
      rows: 4,
      group: 'page',
      description: 'The paragraph beside the map heading. Leave empty to show none.',
    }),
    defineField({
      name: 'faqs',
      title: 'FAQs',
      type: 'array',
      group: 'page',
      of: [defineArrayMember({type: 'reference', to: [{type: 'faq'}]})],
      description: 'Questions shown in the Property FAQs section. Leave empty to hide the section.',
    }),
    defineField({
      name: 'boundaryIds',
      title: 'Property map IDs',
      type: 'array',
      of: [defineArrayMember({type: 'string'})],
      group: 'map',
      description:
        'Which boundaries in the uploaded map data file belong to this property — usually one, sometimes several separate parcels. Pick from the list rather than typing; an identifier that is not in the file draws nothing on the map.',
      components: {
        input: BoundaryIdsInput,
      },
    }),
    defineField({
      name: 'location',
      title: 'Map marker',
      type: 'geopoint',
      group: 'map',
      description:
        'Optional. Where the marker sits. Leave empty to place it at the centre of the assigned boundary.',
    }),
    defineField({
      name: 'disablePopup',
      title: 'Disable map popup',
      type: 'boolean',
      group: 'map',
      initialValue: false,
      description:
        'Turn on to stop this property from opening a popup on the map — its marker or boundary still shows and (for a boundary) still highlights on hover, it just does not respond to a click.',
    }),
  ],
  preview: {
    select: {
      name: 'name',
      boundaryIds: 'boundaryIds',
    },
    prepare({name, boundaryIds}) {
      const count = Array.isArray(boundaryIds) ? boundaryIds.length : 0
      return {
        title: name || 'Untitled',
        subtitle: count
          ? `${count} boundar${count === 1 ? 'y' : 'ies'} assigned`
          : 'No boundary assigned',
      }
    },
  },
})

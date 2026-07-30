import {defineArrayMember, defineField, defineType} from 'sanity'
import {PinIcon} from '@sanity/icons'

import {BoundaryIdInput} from '../../components/BoundaryIdInput'

/**
 * A Land Bank property - the parcels, beaches, trails and ponds shown on the interactive map.
 *
 * Replaces the hardcoded list that used to live in frontend/app/map/properties.ts. Categorisation
 * is by reference to propertyType and resource documents so the client can extend either without
 * a deploy.
 *
 * Boundary geometry is NOT stored here. The client maintains one GeoJSON file covering every
 * boundary (uploaded on Project Settings) and each project points into it by identifier - see
 * boundaryId below.
 */

export const project = defineType({
  name: 'project',
  title: 'Project',
  type: 'document',
  icon: PinIcon,
  groups: [
    {name: 'details', title: 'Details', default: true},
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
      description: 'Used if this property gets a page of its own later.',
      options: {source: 'name', maxLength: 96},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      group: 'details',
      description: 'Shown in the map popup.',
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
      description: 'Short summary shown in the map popup.',
    }),
    defineField({
      name: 'link',
      title: 'Find out more link',
      type: 'url',
      group: 'details',
      description:
        'Optional. Where the popup’s "Find out more" link points. Accepts a path on this site, or # as a placeholder.',
      // allowRelative because these are site-relative paths, and # is the placeholder convention.
      validation: (Rule) => Rule.uri({allowRelative: true, scheme: ['http', 'https']}),
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
      name: 'boundaryId',
      title: 'Property map ID',
      type: 'string',
      group: 'map',
      description:
        'Which boundary in the uploaded map data file belongs to this property. Pick from the list rather than typing - an identifier that is not in the file draws nothing on the map.',
      components: {
        input: BoundaryIdInput,
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
  ],
  preview: {
    select: {
      name: 'name',
      boundaryId: 'boundaryId',
    },
    prepare({name, boundaryId}) {
      return {
        title: name || 'Untitled',
        // Surfaces the commonest data gap - a property with no boundary assigned - in the list,
        // without having to open each one.
        subtitle: boundaryId ? `Boundary: ${boundaryId}` : 'No boundary assigned',
      }
    },
  },
})

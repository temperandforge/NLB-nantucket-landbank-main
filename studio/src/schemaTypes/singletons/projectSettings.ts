import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

import {geoFileInput} from '../../components/GeoFileInput'

/**
 * Properties Settings schema Singleton (the document id and type keep their original name,
 * `projectSettings`, from before properties were called projects).
 *
 * Three concerns, kept in one document because they all configure the Properties section, and split
 * into field groups so the form does not read as a grab bag:
 *
 *  - Page content: the default image shown on a property without one.
 *  - Map: the single GeoJSON file holding every property boundary, plus how to read it.
 *  - Single: what every property page shares (the map switch, the FAQ wording and the
 *    "more properties" section), as opposed to one property's own content.
 */

export const projectSettings = defineType({
  name: 'projectSettings',
  title: 'Properties Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'page', title: 'Page content', default: true},
    {name: 'map', title: 'Map'},
    {name: 'singleProperty', title: 'Single'},
  ],
  fields: [
    defineField({
      name: 'defaultPropertyImage',
      title: 'Default property image',
      group: 'page',
      type: 'image',
      description: 'Shown on a property that has no image of its own.',
      options: {hotspot: true},
      fields: [
        defineField({
          name: 'alt',
          title: 'Alternative text',
          type: 'string',
          description: 'Important for accessibility and SEO.',
          validation: (rule) =>
            rule.custom((alt, context) => {
              const image = context.document?.defaultPropertyImage as {asset?: {_ref?: string}} | undefined
              return image?.asset?._ref && !alt ? 'Required' : true
            }),
        }),
      ],
    }),
    defineField({
      name: 'boundarySource',
      title: 'Boundary file',
      type: 'file',
      group: 'map',
      description:
        'Upload the property boundaries as GPX, KML, KMZ or GeoJSON. It is converted to GeoJSON automatically and the original is kept here. Replacing this file does not change any property’s assignment, so check for warnings on the properties afterwards.',
      components: {input: geoFileInput('boundaries')},
      options: {
        accept: '.gpx,.kml,.kmz,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/geo+json,application/json',
      },
    }),
    defineField({
      name: 'boundaryData',
      title: 'Boundary data file',
      type: 'file',
      group: 'map',
      description:
        'Generated from the boundary file above: one GeoJSON FeatureCollection containing every property boundary. Each property then points at a single feature inside it. It cannot be edited here.',
      readOnly: true,
      options: {
        accept: '.geojson,.json,application/geo+json,application/json',
      },
    }),
    defineField({
      name: 'boundaryIdProperty',
      title: 'Boundary ID property',
      type: 'string',
      group: 'map',
      initialValue: 'FID',
      description:
        'The property on each GeoJSON feature that holds its identifier — for example "FID", "id", "MAP_ID" or "PARCEL_ID". This is configurable because it depends on how the uploaded file is structured.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'trailsSource',
      title: 'Trails file',
      type: 'file',
      group: 'map',
      description:
        'Upload the trail tracks as GPX, KML, KMZ or GeoJSON. It is converted to GeoJSON automatically and the original is kept here. Leave empty to hide the trails layer.',
      components: {input: geoFileInput('trails')},
      options: {
        accept: '.gpx,.kml,.kmz,.geojson,.json,application/gpx+xml,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/geo+json,application/json',
      },
    }),
    defineField({
      name: 'trailsData',
      title: 'Trails data file',
      type: 'file',
      group: 'map',
      description:
        'Generated from the trails file above: GeoJSON of the trail tracks, drawn as lines beneath the property boundaries. Unlike the boundary data, nothing points into this one - every line in it is drawn. It cannot be edited here.',
      readOnly: true,
      options: {
        accept: '.geojson,.json,application/geo+json,application/json',
      },
    }),
    defineField({
      name: 'fitToBoundaries',
      title: 'Fit map to boundaries',
      type: 'boolean',
      group: 'map',
      initialValue: true,
      description:
        'On: the map opens framed around every property boundary, and Default map centre and Default zoom below are ignored. Off: the map opens at the centre and zoom set below. Has no effect if no boundary file is uploaded, or on a single property page.',
    }),
    defineField({
      name: 'defaultCenter',
      title: 'Default map centre',
      type: 'geopoint',
      group: 'map',
      description:
        'Where the map opens. Defaults to Nantucket if empty. Ignored while Fit map to boundaries is on.',
    }),
    defineField({
      name: 'defaultZoom',
      title: 'Default zoom',
      type: 'number',
      group: 'map',
      description: 'How far in the map opens. A lower number zooms out (shows more area); a higher number zooms in (shows less). Typical values are 9 to 15. Ignored while Fit map to boundaries is on.',
      validation: (Rule) => Rule.min(0).max(22),
    }),
    defineField({
      name: 'hideMap',
      title: 'Hide the map section',
      type: 'boolean',
      group: 'singleProperty',
      description: 'Hides the map on every property page. Its heading and intro are set on each property.',
      initialValue: false,
    }),
    defineField({
      name: 'faqs',
      title: 'FAQ section',
      type: 'object',
      group: 'singleProperty',
      description: 'Wording around each property’s own FAQs (picked on the property).',
      fields: [
        defineField({name: 'eyebrow', title: 'Eyebrow', type: 'string'}),
        defineField({name: 'heading', title: 'Heading', type: 'string'}),
        defineField({name: 'description', title: 'Description', type: 'string'}),
      ],
    }),
    defineField({
      name: 'moreProperties',
      title: 'More properties',
      type: 'object',
      group: 'singleProperty',
      description:
        'The section under a property: other properties (those sharing a property type first, then the newest), never the one being read.',
      fields: [
        defineField({
          name: 'disabled',
          title: 'Hide this section',
          type: 'boolean',
          initialValue: false,
        }),
        defineField({name: 'heading', title: 'Heading', type: 'string'}),
        defineField({
          name: 'button',
          title: 'Button',
          type: 'button',
          description: 'Leave the label or link empty to hide it.',
        }),
        defineField({
          name: 'count',
          title: 'How many properties',
          type: 'number',
          initialValue: 3,
          validation: (rule) => rule.min(1).max(3).integer(),
        }),
      ],
      initialValue: {disabled: false, count: 3},
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Properties Settings',
      }
    },
  },
})

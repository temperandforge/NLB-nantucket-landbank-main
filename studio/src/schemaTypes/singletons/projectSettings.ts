import {CogIcon} from '@sanity/icons'
import {defineField, defineType} from 'sanity'

/**
 * Project Settings schema Singleton.
 *
 * Two concerns, kept in one document because they are both "the things that configure the
 * Projects section", and split into field groups so the form does not read as a grab bag:
 *
 *  - Page content: the fixed intro above the projects grid, matching the commissionersPage /
 *    staffPage pattern.
 *  - Map: the single GeoJSON file holding every property boundary, plus how to read it.
 */

export const projectSettings = defineType({
  name: 'projectSettings',
  title: 'Project Settings',
  type: 'document',
  icon: CogIcon,
  groups: [
    {name: 'page', title: 'Page content', default: true},
    {name: 'map', title: 'Map'},
  ],
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      group: 'page',
      description: 'Small label above the headline, e.g. "PROPERTIES".',
    }),
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      group: 'page',
      description: 'Main page headline.',
    }),
    defineField({
      name: 'intro',
      title: 'Intro paragraph',
      type: 'text',
      group: 'page',
      description: 'Short intro text shown below the headline.',
    }),

    defineField({
      name: 'boundaryData',
      title: 'Boundary data file',
      type: 'file',
      group: 'map',
      description:
        'One GeoJSON FeatureCollection containing every property boundary. Each project then points at a single feature inside it. Replacing this file does not change any project’s assignment, so check for warnings on the projects afterwards.',
      options: {
        accept: '.geojson,.json,application/geo+json,application/json',
      },
    }),
    defineField({
      name: 'boundaryIdProperty',
      title: 'Boundary ID property',
      type: 'string',
      group: 'map',
      initialValue: 'id',
      description:
        'The property on each GeoJSON feature that holds its identifier — for example "id", "MAP_ID" or "PARCEL_ID". This is configurable because it depends on how the uploaded file is structured.',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'trailsData',
      title: 'Trails data file',
      type: 'file',
      group: 'map',
      description:
        'GeoJSON of the trail tracks, drawn as lines beneath the property boundaries. Unlike the boundary file, nothing points into this one - every line in it is drawn. Leave empty to hide the trails layer.',
      options: {
        accept: '.geojson,.json,application/geo+json,application/json',
      },
    }),
    defineField({
      name: 'defaultCenter',
      title: 'Default map centre',
      type: 'geopoint',
      group: 'map',
      description:
        'Where the map opens. Defaults to Nantucket if empty. Note that an uploaded trails file currently overrides this, since the map zooms to fit the trails once they load.',
    }),
    defineField({
      name: 'defaultZoom',
      title: 'Default zoom',
      type: 'number',
      group: 'map',
      description: 'Mapbox zoom level the map opens at. 11 shows the whole island.',
      validation: (Rule) => Rule.min(0).max(22),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Project Settings',
      }
    },
  },
})

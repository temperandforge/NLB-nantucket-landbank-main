'use client'

import {useMemo} from 'react'

import type {PropertyDefaultImage, PropertyItem} from '@/components/cards/types'
import {propertyTypeOptions, resourceOptions} from '@/sanity/lib/archiveFilter'

import PropertyArchiveView from './PropertyArchiveView'
import {usePropertySelection} from './usePropertySelection'

/** The properties with their filters, the choice kept in the address. */
export default function PropertyFilter({
  properties,
  defaultImage,
}: {
  properties: PropertyItem[]
  defaultImage: PropertyDefaultImage
}) {
  const typeChoices = useMemo(() => propertyTypeOptions(properties), [properties])
  const resourceChoices = useMemo(() => resourceOptions(properties), [properties])
  const {selection, choose} = usePropertySelection(typeChoices, resourceChoices)

  return (
    <PropertyArchiveView
      properties={properties}
      defaultImage={defaultImage}
      typeOptions={typeChoices}
      resourceOptions={resourceChoices}
      selection={selection}
      onChange={choose}
    />
  )
}

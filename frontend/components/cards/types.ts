import {ExtractPageBuilderType} from '@/sanity/lib/types'

export type StaffItem = NonNullable<ExtractPageBuilderType<'peopleGrid'>['staff']>[number]
export type CommissionerItem = NonNullable<ExtractPageBuilderType<'peopleGrid'>['commissioners']>[number]
export type ProjectItem = NonNullable<ExtractPageBuilderType<'projectGrid'>['projects']>[number]
export type PropertyItem = NonNullable<ExtractPageBuilderType<'propertyArchive'>['properties']>[number]
export type PropertyDefaultImage = ExtractPageBuilderType<'propertyArchive'>['defaultImage']

import {ExtractPageBuilderType, PageBuilderSection} from '@/sanity/lib/types'

export type BlockProps<T extends PageBuilderSection['_type']> = {
  block: ExtractPageBuilderType<T>
  index: number
  pageId: string
  pageType: string
  pageName?: string
}

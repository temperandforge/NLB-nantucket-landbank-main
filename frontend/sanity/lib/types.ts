import {FooterQueryResult, GetPageQueryResult} from '@/sanity.types'

export type PageBuilderSection = NonNullable<NonNullable<GetPageQueryResult>['pageBuilder']>[number]
export type ExtractPageBuilderType<T extends PageBuilderSection['_type']> = Extract<
  PageBuilderSection,
  {_type: T}
>

// Represents a Link after GROQ dereferencing (page/post become slug strings)
export type DereferencedLink = {
  _type: 'link'
  linkType?: 'href' | 'page' | 'post'
  href?: string
  page?: string | null
  post?: string | null
  openInNewTab?: boolean
}

/**
 * Footer shapes, derived from the query result so they cannot drift from the GROQ projection.
 * A menu item is a discriminated union on _type: 'menuGroup' (heading + children) or
 * 'menuLink' (a leaf).
 */
export type FooterData = NonNullable<FooterQueryResult>
export type FooterMenuData = NonNullable<FooterData['footerMenu']>
export type FooterMenuItem = FooterMenuData['items'][number]
export type FooterMenuLeaf = Extract<FooterMenuItem, {_type: 'menuLink'}>
export type FooterInfoColumnData = NonNullable<FooterData['infoColumns']>[number]
export type FooterSocialLinkData = NonNullable<FooterData['socialLinks']>[number]

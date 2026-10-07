import {FooterQueryResult, GetPageQueryResult, HeaderQueryResult, SiteBannerQueryResult} from '@/sanity.types'

export type PageBuilderSection = NonNullable<NonNullable<GetPageQueryResult>['pageBuilder']>[number]
export type ExtractPageBuilderType<T extends PageBuilderSection['_type']> = Extract<
  PageBuilderSection,
  {_type: T}
>

// Represents a Link after GROQ dereferencing (page becomes slug strings)
export type DereferencedLink = {
  _type: 'link'
  linkType?: 'href' | 'page'
  href?: string
  page?: string | null
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

/**
 * Header shapes, derived from the query result like the footer's. A top-level menuGroup is a
 * dropdown; a top-level menuLink is a plain link. A group's children carry the optional `group`
 * column heading that groupMenuLinks() turns into columns.
 */
export type HeaderData = NonNullable<HeaderQueryResult>
export type HeaderMenuData = NonNullable<HeaderData['mainMenu']>
export type HeaderMenuItem = HeaderMenuData['items'][number]
export type HeaderMenuLeaf = Extract<HeaderMenuItem, {_type: 'menuLink'}>
export type HeaderMenuGroup = Extract<HeaderMenuItem, {_type: 'menuGroup'}>
export type HeaderMenuChild = HeaderMenuGroup['children'][number]
export type SiteBannerData = NonNullable<SiteBannerQueryResult>

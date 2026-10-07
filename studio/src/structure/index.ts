import {
  CalendarIcon,
  CaseIcon,
  CogIcon,
  DocumentsIcon,
  DocumentTextIcon,
  DropIcon,
  EarthGlobeIcon,
  FolderIcon,
  HelpCircleIcon,
  MenuIcon,
  PinIcon,
  TagIcon,
  UsersIcon,
} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 *
 * Pages are the page-builder 'page' type - the client freely composes and reorders sections,
 * e.g. Home, About Us. Site Settings sits outside it - global config with no page of its own.
 *
 * Globals holds content that appears on every page rather than on a page of its own: the
 * Footer singleton and the reusable Menus it references. The header menu will join it here
 * without needing a schema change.
 */

// Types removed from the automatic top-level list, either because they are handled
// explicitly above/below or are internal to a plugin.
const DISABLED_TYPES = [
  'settings',
  'singleNewsPage',
  'page',
  'assist.instruction.context',
  // Handled explicitly under Globals below.
  'footer',
  'menu',
  // Handled explicitly under Properties below.
  'property',
  'propertyType',
  'resource',
  'projectSettings',
  // Handled explicitly below: news, events, people and FAQs.
  'article',
  'newsCategory',
  'event',
  'staffMember',
  'commissioner',
  'department',
  'faq',
  'faqCategory',
  'job',
  // Internal to sanity-plugin-media. Tags are managed inside the Media tool, so listing them at
  // the root would just be a dead end for an editor.
  'media.tag',
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      S.listItem()
        .title('Pages')
        .icon(DocumentsIcon)
        .child(S.documentTypeList('page').title('Pages')),
      S.divider(),
      // Properties: the Land Bank's properties, their categorisation, and the settings that
      // configure both the properties pages and the interactive map. Grouped together because the
      // taxonomies are meaningless outside this section.
      S.listItem()
        .title('Properties')
        .icon(PinIcon)
        .child(
          S.list()
            .title('Properties')
            .items([
              S.documentTypeListItem('property').title('Properties').icon(PinIcon),
              S.divider(),
              S.documentTypeListItem('propertyType').title('Property Types').icon(TagIcon),
              S.documentTypeListItem('resource').title('Resources').icon(DropIcon),
              S.divider(),
              S.listItem()
                .title('Project Settings')
                .icon(CogIcon)
                .child(
                  S.document().schemaType('projectSettings').documentId('projectSettings'),
                ),
            ]),
        ),
      S.listItem()
        .title('News')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('News')
            .items([
              S.documentTypeListItem('article').title('Articles').icon(DocumentTextIcon),
              S.divider(),
              S.documentTypeListItem('newsCategory').title('News Categories').icon(TagIcon),
            ]),
        ),
      S.documentTypeListItem('event').title('Events').icon(CalendarIcon),
      S.listItem()
        .title('People')
        .icon(UsersIcon)
        .child(
          S.list()
            .title('People')
            .items([
              S.documentTypeListItem('staffMember').title('Staff').icon(UsersIcon),
              S.documentTypeListItem('commissioner').title('Commissioners').icon(UsersIcon),
              S.divider(),
              S.documentTypeListItem('department').title('Departments').icon(TagIcon),
            ]),
        ),
      S.listItem()
        .title('FAQs')
        .icon(HelpCircleIcon)
        .child(
          S.list()
            .title('FAQs')
            .items([
              S.documentTypeListItem('faq').title('FAQs').icon(HelpCircleIcon),
              S.divider(),
              S.documentTypeListItem('faqCategory').title('FAQ Categories').icon(TagIcon),
            ]),
        ),
      S.documentTypeListItem('job').title('Jobs').icon(CaseIcon),
      S.divider(),
      // Globals: content rendered on every page rather than on a page of its own. Menus live
      // here rather than under Pages because they are navigation, not content.
      S.listItem()
        .title('Globals')
        .icon(EarthGlobeIcon)
        .child(
          S.list()
            .title('Globals')
            .items([
              S.listItem()
                .title('Footer')
                .icon(FolderIcon)
                .child(S.document().schemaType('footer').documentId('footer')),
              S.listItem()
                .title('Menus')
                .icon(MenuIcon)
                .child(S.documentTypeList('menu').title('Menus')),
              // The content every news article page shares (wording and the "more news" section).
              S.listItem()
                .title('Single News Page')
                .icon(DocumentTextIcon)
                .child(S.document().schemaType('singleNewsPage').documentId('singleNewsPage')),
            ]),
        ),
      // Site Settings: global config with no page/route of its own.
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
      // Anything not explicitly handled above still shows up here automatically.
      ...S.documentTypeListItems()
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        .map((listItem) => listItem.title(pluralize(listItem.getTitle() as string))),
    ])

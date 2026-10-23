import {
  BellIcon,
  CalendarIcon,
  CaseIcon,
  ClipboardIcon,
  CogIcon,
  DocumentsIcon,
  DocumentTextIcon,
  DropIcon,
  EarthGlobeIcon,
  FolderIcon,
  HelpCircleIcon,
  InboxIcon,
  MenuIcon,
  PinIcon,
  ProjectsIcon,
  TagIcon,
  UsersIcon,
} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import {orderableDocumentListDeskItem} from '@sanity/orderable-document-list'
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
 * Footer singleton and the reusable Menus it references. The Header and Site Banner singletons
 * sit beside it.
 */

// Types removed from the automatic top-level list, either because they are handled
// explicitly above/below or are internal to a plugin.
const DISABLED_TYPES = [
  'settings',
  'singleNewsPage',
  'singleProjectPage',
  'page',
  'assist.instruction.context',
  // Handled explicitly under Globals below.
  'footer',
  'header',
  'siteBanner',
  'menu',
  // Handled explicitly under Properties below.
  'property',
  'propertyType',
  'resource',
  'projectSettings',
  'faqSettings',
  // Handled explicitly under Projects below.
  'project',
  'projectType',
  // Handled explicitly below: news, events, people and FAQs.
  'article',
  'newsCategory',
  'event',
  'staffMember',
  'commissioner',
  'department',
  'faq',
  'faqCategory',
  'record',
  'recordCategory',
  'job',
  'form',
  'formSubmission',
  // Internal to sanity-plugin-media. Tags are managed inside the Media tool, so listing them at
  // the root would just be a dead end for an editor.
  'media.tag',
]

export const structure: StructureResolver = (S: StructureBuilder, context) =>
  S.list()
    .title('Website Content')
    .items([
      S.listItem()
        .title('Pages')
        .icon(DocumentsIcon)
        .child(S.documentTypeList('page').title('Pages')),
      S.divider(),
      S.documentTypeListItem('event').title('Events').icon(CalendarIcon),
      S.listItem()
        .title('FAQs')
        .icon(HelpCircleIcon)
        .child(
          S.list()
            .title('FAQs')
            .items([
              // Drag to reorder; the order is what visitors see.
              orderableDocumentListDeskItem({
                type: 'faq',
                title: 'FAQs',
                icon: HelpCircleIcon,
                S,
                context,
              }),
              S.divider(),
              orderableDocumentListDeskItem({
                type: 'faqCategory',
                title: 'FAQ Categories',
                icon: TagIcon,
                S,
                context,
              }),
              S.divider(),
              S.listItem()
                .title('FAQ Settings')
                .icon(CogIcon)
                .child(S.document().schemaType('faqSettings').documentId('faqSettings')),
            ]),
        ),
      // Forms: the forms editors build, and what visitors sent. Submissions hold personal data, so
      // they sit in their own clearly named list rather than among content.
      S.listItem()
        .title('Forms')
        .icon(ClipboardIcon)
        .child(
          S.list()
            .title('Forms')
            .items([
              S.documentTypeListItem('form').title('Forms').icon(ClipboardIcon),
              S.divider(),
              S.documentTypeListItem('formSubmission')
                .title('Submissions (personal data)')
                .icon(InboxIcon),
            ]),
        ),
      S.documentTypeListItem('job').title('Jobs').icon(CaseIcon),
      S.listItem()
        .title('News')
        .icon(DocumentTextIcon)
        .child(
          S.list()
            .title('News')
            .items([
              S.documentTypeListItem('article').title('Articles').icon(DocumentTextIcon),
              S.divider(),
              orderableDocumentListDeskItem({
                type: 'newsCategory',
                title: 'News Categories',
                icon: TagIcon,
                S,
                context,
              }),
            ]),
        ),
      S.listItem()
        .title('People')
        .icon(UsersIcon)
        .child(
          S.list()
            .title('People')
            .items([
              orderableDocumentListDeskItem({
                type: 'staffMember',
                title: 'Staff',
                icon: UsersIcon,
                S,
                context,
              }),
              orderableDocumentListDeskItem({
                type: 'commissioner',
                title: 'Commissioners',
                icon: UsersIcon,
                S,
                context,
              }),
              S.divider(),
              orderableDocumentListDeskItem({
                type: 'department',
                title: 'Departments',
                icon: TagIcon,
                S,
                context,
              }),
            ]),
        ),
      // Projects: initiatives the Land Bank runs, with their own categories. Separate from
      // properties (the map's parcels).
      S.listItem()
        .title('Projects')
        .icon(ProjectsIcon)
        .child(
          S.list()
            .title('Projects')
            .items([
              S.documentTypeListItem('project').title('Projects').icon(ProjectsIcon),
              S.divider(),
              orderableDocumentListDeskItem({
                type: 'projectType',
                title: 'Project Types',
                icon: TagIcon,
                S,
                context,
              }),
            ]),
        ),
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
                .title('Properties Settings')
                .icon(CogIcon)
                .child(S.document().schemaType('projectSettings').documentId('projectSettings')),
            ]),
        ),
      S.listItem()
        .title('Records')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Records')
            .items([
              S.documentTypeListItem('record').title('Records').icon(DocumentsIcon),
              S.divider(),
              orderableDocumentListDeskItem({
                type: 'recordCategory',
                title: 'Record Categories',
                icon: TagIcon,
                S,
                context,
              }),
            ]),
        ),
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
                .title('Header')
                .icon(FolderIcon)
                .child(S.document().schemaType('header').documentId('header')),
              S.listItem()
                .title('Site Banner')
                .icon(BellIcon)
                .child(S.document().schemaType('siteBanner').documentId('siteBanner')),
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
              // The content every project page shares (wording, FAQ heading, "more projects").
              S.listItem()
                .title('Single Project Page')
                .icon(ProjectsIcon)
                .child(
                  S.document().schemaType('singleProjectPage').documentId('singleProjectPage'),
                ),
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

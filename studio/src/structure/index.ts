import {
  CaseIcon,
  CogIcon,
  DocumentsIcon,
  EarthGlobeIcon,
  FolderIcon,
  MenuIcon,
  SquareIcon,
  UsersIcon,
} from '@sanity/icons'
import type {StructureBuilder, StructureResolver} from 'sanity/structure'
import pluralize from 'pluralize-esm'

/**
 * Structure builder is useful whenever you want to control how documents are grouped and
 * listed in the studio or for adding additional in-studio previews or content to documents.
 * Learn more: https://www.sanity.io/docs/structure-builder-introduction
 *
 * Page Content is split into two kinds, matching how the Land Bank team actually works with
 * each:
 *  - Index pages: a fixed intro (eyebrow/heading/text) above a grid the client doesn't
 *    rearrange - Commissioners, Staff, and (later) News/Events/Projects/Properties.
 *  - Flexible pages: the page-builder 'page' type - the client freely composes and reorders
 *    sections, e.g. Home, About Us.
 * Site Settings sits outside both - it's global config with no page of its own, not a page.
 *
 * Globals holds content that appears on every page rather than on a page of its own: the
 * Footer singleton and the reusable Menus it references. The header menu will join it here
 * without needing a schema change.
 */

// Index pages - singletons, one fixed instance each, edited directly rather than picked
// from a list. See commissionersPage.ts/staffPage.ts for the schema side of this pattern.
const INDEX_PAGE_TYPES = [
  {type: 'commissionersPage', documentId: 'commissionersPage', title: 'Commissioners Page', icon: UsersIcon},
  {type: 'staffPage', documentId: 'staffPage', title: 'Staff Page', icon: CaseIcon},
]

// Repeatable collections shown grouped together, separate from the singletons above and the
// freeform page-builder 'page' type below.
const COLLECTION_TYPES = ['commissioner', 'staffMember', 'department', 'post']

// Types removed from the automatic top-level list, either because they are handled
// explicitly above/below or are internal to a plugin.
// 'person' is the starter template's post-author type. It is hidden rather than deleted
// because post.author and the frontend Avatar component still depend on it - see the PR
// notes on whether News posts need bylines at all.
const DISABLED_TYPES = [
  ...INDEX_PAGE_TYPES.map((p) => p.type),
  ...COLLECTION_TYPES,
  'settings',
  'page',
  'assist.instruction.context',
  'person',
  // Handled explicitly under Globals below.
  'footer',
  'menu',
]

export const structure: StructureResolver = (S: StructureBuilder) =>
  S.list()
    .title('Website Content')
    .items([
      // Page Content: everything that renders as a page on the site, split into Index
      // (fixed shape, one per page) and Flexible (client-composed, many pages).
      S.listItem()
        .title('Page Content')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Page Content')
            .items([
              S.listItem()
                .title('Index Pages')
                .icon(SquareIcon)
                .child(
                  S.list()
                    .title('Index Pages')
                    .items(
                      INDEX_PAGE_TYPES.map(({type, documentId, title, icon}) =>
                        S.listItem()
                          .title(title)
                          .icon(icon)
                          .child(S.document().schemaType(type).documentId(documentId)),
                      ),
                    ),
                ),
              S.listItem()
                .title('Flexible Pages')
                .icon(FolderIcon)
                .child(S.documentTypeList('page').title(pluralize('Page'))),
            ]),
        ),
      S.divider(),
      // Collections: repeatable content, grouped by subject rather than left alphabetical.
      S.listItem()
        .title('People')
        .icon(UsersIcon)
        .child(
          S.list()
            .title('People')
            .items([
              S.documentTypeListItem('commissioner').title('Commissioners'),
              S.documentTypeListItem('staffMember').title('Staff'),
              S.documentTypeListItem('department').title('Staff Departments'),
            ]),
        ),
      S.documentTypeListItem('post').title('News'),
      S.divider(),
      // Globals: content rendered on every page rather than on a page of its own. Menus live
      // here rather than under Page Content because they are navigation, not content.
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
            ]),
        ),
      // Site Settings: global config with no page/route of its own - deliberately outside
      // Page Content, since it is neither an Index page nor a Flexible page.
      S.listItem()
        .title('Site Settings')
        .child(S.document().schemaType('settings').documentId('siteSettings'))
        .icon(CogIcon),
      // Anything not explicitly handled above still shows up here automatically.
      ...S.documentTypeListItems()
        .filter((listItem: any) => !DISABLED_TYPES.includes(listItem.getId()))
        .map((listItem) => listItem.title(pluralize(listItem.getTitle() as string))),
    ])

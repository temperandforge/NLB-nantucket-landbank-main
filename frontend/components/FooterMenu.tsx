import ResolvedLink from '@/components/ResolvedLink'
import type {FooterMenuData, FooterMenuItem, FooterMenuLeaf} from '@/sanity/lib/types'

/**
 * Renders a menu document. Knows how a menu's items look; knows nothing about where in the
 * footer it sits, so the header can reuse it.
 *
 * Two presentations:
 *  - FooterMenu: the column grid, where a menuGroup becomes a non-clickable column heading.
 *  - FooterInlineMenu: a single row, used for the legal links beside the copyright.
 */

const LINK_CLASS =
  'font-secondary text-body-small opacity-75 transition-opacity hover:opacity-100 focus-visible:opacity-100'

/** Tracked uppercase label - Figma type style mono/tracked (DM Mono 14, 11% tracking). */
const LABEL_CLASS = 'font-mono-tracked text-[14px] uppercase tracking-[1.54px] leading-[1.6]'

/**
 * A menu item's link, as it comes back from GROQ with page/post references resolved to slugs.
 * Taken from the leaf type so it tracks the query projection.
 */
type MenuItemLink = FooterMenuLeaf['link']

/**
 * Takes label and link rather than a whole item, because a top-level menuLink and a
 * menuGroup's child are the same thing to render but differ in shape - only the top-level one
 * carries _type.
 */
function MenuLeaf({label, link}: {label: string; link: MenuItemLink}) {
  return (
    <li>
      <ResolvedLink link={link} className={LINK_CLASS}>
        {label}
      </ResolvedLink>
    </li>
  )
}

function MenuColumn({item}: {item: FooterMenuItem}) {
  // A group renders its heading above its children; a bare link at the top level of the menu
  // gets a column to itself so the grid stays aligned.
  if (item._type === 'menuGroup') {
    return (
      <div className="flex flex-col gap-gap-md">
        <h2 className={LABEL_CLASS}>{item.label}</h2>
        <ul className="flex flex-col gap-gap-mini leading-[1.6]">
          {item.children.map((child) => (
            <MenuLeaf key={child._key} label={child.label} link={child.link} />
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-gap-md">
      <ul className="flex flex-col gap-gap-mini leading-[1.6]">
        <MenuLeaf label={item.label} link={item.link} />
      </ul>
    </div>
  )
}

export default function FooterMenu({menu}: {menu: FooterMenuData | null}) {
  if (!menu?.items?.length) return null

  return (
    <nav aria-label={menu.title}>
      {/* Five columns with 90px gutters at the designed 1440 width, collapsing to three, two
          and finally one as the viewport narrows. */}
      <div className="grid grid-cols-1 gap-x-gap-lg gap-y-gap-2xl sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 xl:gap-x-[90px]">
        {menu.items.map((item) => (
          <MenuColumn key={item._key} item={item} />
        ))}
      </div>
    </nav>
  )
}

export function FooterInlineMenu({menu}: {menu: FooterMenuData | null}) {
  if (!menu?.items?.length) return null

  // Only leaf links make sense in a single inline row. A group would have nowhere to put its
  // heading here, so its children are flattened in rather than dropped.
  const links = menu.items.flatMap((item) =>
    item._type === 'menuGroup'
      ? item.children.map((child) => ({key: child._key, label: child.label, link: child.link}))
      : [{key: item._key, label: item.label, link: item.link}],
  )

  return (
    <nav aria-label={menu.title}>
      <ul className="flex flex-wrap items-center gap-x-gap-md gap-y-gap-mini leading-[1.6]">
        {links.map(({key, label, link}) => (
          <MenuLeaf key={key} label={label} link={link} />
        ))}
      </ul>
    </nav>
  )
}

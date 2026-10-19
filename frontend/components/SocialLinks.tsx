import type {ComponentType} from 'react'

import {FacebookIcon, InstagramIcon, LinkedInIcon} from '@/components/icons'
import type {FooterSocialLinkData} from '@/sanity/lib/types'

/**
 * Social profile links, mapping the platform stored in Sanity to its icon.
 *
 * Only the three platforms in the design have icons. A platform without one renders nothing
 * rather than an empty box - the schema offers x and youtube so the client can add them, but
 * an icon has to be exported from Figma before they will appear.
 *
 * Each glyph carries its own size because the design insets them differently inside the
 * shared 24px box: Facebook fills 83.33% (8.33% inset), Instagram and
 * LinkedIn 75% (12.5% inset). Sizing them all alike would stretch two of the three.
 */

type PlatformIcon = {
  Icon: ComponentType<{className?: string}>
  label: string
  /** Glyph size as a share of the box, from the Figma export. */
  sizeClass: string
}

const PLATFORM_ICONS: Partial<Record<FooterSocialLinkData['platform'], PlatformIcon>> = {
  facebook: {Icon: FacebookIcon, label: 'Facebook', sizeClass: 'size-[83.33%]'},
  instagram: {Icon: InstagramIcon, label: 'Instagram', sizeClass: 'size-[75%]'},
  linkedin: {Icon: LinkedInIcon, label: 'LinkedIn', sizeClass: 'size-[75%]'},
}

export default function SocialLinks({
  links,
  className = '',
}: {
  links: FooterSocialLinkData[] | null
  className?: string
}) {
  if (!links?.length) return null

  const withIcons = links.filter((link) => PLATFORM_ICONS[link.platform])
  if (!withIcons.length) return null

  return (
    <ul className={`flex items-center gap-4 md:justify-end ${className}`}>
      {withIcons.map((link) => {
        // Non-null: withIcons is filtered on this lookup succeeding.
        const {Icon, label, sizeClass} = PLATFORM_ICONS[link.platform]!
        return (
          <li key={link._key}>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-6 items-center justify-center transition-opacity hover:opacity-75 focus-visible:opacity-75"
            >
              <span className="sr-only">{label}</span>
              <Icon className={sizeClass} />
            </a>
          </li>
        )
      })}
    </ul>
  )
}

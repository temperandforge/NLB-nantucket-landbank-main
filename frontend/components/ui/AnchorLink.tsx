import type {AnchorHTMLAttributes} from 'react'
import Link from 'next/link'

import {isInternalHref} from '@/sanity/lib/links'

type AnchorLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {href: string}

/**
 * An anchor that goes through next/link when it points at another page of this site, so the
 * navigation prefetches and can run a view transition. External, in-page, mailto/tel, download and
 * new-tab links stay a plain `<a>`.
 */
export default function AnchorLink({href, target, download, ...rest}: AnchorLinkProps) {
  if (isInternalHref(href) && target !== '_blank' && download === undefined) {
    return <Link href={href} target={target} {...rest} />
  }
  return <a href={href} target={target} download={download} {...rest} />
}

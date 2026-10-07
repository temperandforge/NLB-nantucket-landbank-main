import LinkButton from '@/components/ui/LinkButton'
import Tag from '@/components/ui/Tag'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import {BlockProps} from './types'

export default function MissionStatement({block}: BlockProps<'missionStatement'>) {
  // A link that does not resolve (empty page reference, unpublished page, blank URL) is dropped
  // rather than rendered as a dead button.
  const links = (block.links ?? []).flatMap((item) => {
    const href = item.link ? linkResolver(item.link as DereferencedLink) : null
    return item.label && href ? [{key: item._key, label: item.label, href}] : []
  })

  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s9">
      <div className="mission-statement__lines pointer-events-none absolute inset-0 z-0" aria-hidden="true" />
      <div className="relative z-10 flex w-full flex-col items-center justify-center tf-max-w">
        <div className="flex w-full max-w-[62.375rem] flex-col items-center gap-16 md:gap-20">
          {block.eyebrow && <Tag label={block.eyebrow} />}
          {block.heading && (
            <h2 className="w-full text-center text-headline-xl text-on-background text-pretty">
              {block.heading}
            </h2>
          )}
          {links.length > 0 && (
            <div className="flex flex-col items-center gap-6 md:flex-row md:flex-wrap md:justify-center md:gap-20">
              {links.map((link) => (
                <LinkButton key={link.key} label={link.label} href={link.href} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

import {stegaClean, type PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import ResolvedLink from '@/components/ResolvedLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function BasicLeftRightText({block}: BlockProps<'basicLeftRightText'>) {
  // stegaClean: in Presentation the value carries invisible stega characters, so a plain
  // comparison would always fail.
  const isH1 = stegaClean(block.headingLevel) === 'h1'
  const Heading = isH1 ? 'h1' : 'h2'
  const button = block.button
  // A button needs both its text and a link that resolves. A page reference left empty, or
  // pointing at an unpublished page, resolves to nothing and must not render as a dead button.
  const buttonLink = button?.link as DereferencedLink | undefined
  const showButton = Boolean(button?.buttonText && buttonLink && linkResolver(buttonLink))

  return (
    <section className="w-full">
      <div className={`${isH1 ? 'py-section-p-lg' : 'py-section-p-md'} tf-px`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-24 tf-max-w">
          <div className="md:sticky md:top-10 self-start">
            {block.eyebrow && <Eyebrow className="text-moody-moor-700 mb-3">{block.eyebrow}</Eyebrow>}
            {block.heading && <Heading className="text-h4 mb-6 text-pretty">{block.heading}</Heading>}
            {block.body && (
              <CustomPortableText
                className="text-moody-moor-600 mb-6"
                value={block.body as PortableTextBlock[]}
              />
            )}
            {showButton && buttonLink && (
              <ResolvedLink
                link={buttonLink}
                className="inline-flex items-center gap-3 px-5 py-4 bg-dusty-heath-800 hover:bg-dusty-heath-600 rounded font-mono text-moody-moor-600 no-underline"
              >
                {button?.buttonText}
              </ResolvedLink>
            )}
          </div>
          <div>
            {block.rightContent && (
              <CustomPortableText value={block.rightContent as PortableTextBlock[]} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

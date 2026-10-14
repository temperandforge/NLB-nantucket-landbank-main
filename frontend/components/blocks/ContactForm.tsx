import {stegaClean, type PortableTextBlock} from 'next-sanity'

import CustomPortableText from '@/components/PortableText'
import FormView from '@/components/ui/form/FormView'

import {BlockProps} from './types'

/**
 * Contact details on the left, a form on the right (Figma: Contact Us). With no form chosen, or
 * one that is unpublished, the right column is simply empty.
 */
export default function ContactForm({block}: BlockProps<'contactForm'>) {
  const Heading = stegaClean(block.headingLevel) === 'h1' ? 'h1' : 'h2'
  return (
    <section className="relative w-full overflow-clip bg-background tf-px py-s6">
      <div className="relative z-10 flex w-full flex-col gap-12 tf-max-w md:flex-row md:justify-between md:gap-20">
        <div className="flex w-full flex-col items-start gap-16 md:w-[322px] md:shrink-0">
          {block.heading && (
            <Heading className="w-full text-headline-xl text-on-background text-balance">
              {block.heading}
            </Heading>
          )}
          {block.details && (
            <CustomPortableText
              variant="basic"
              className="w-full"
              value={block.details as PortableTextBlock[]}
            />
          )}
        </div>
        <div className="w-full md:max-w-[668px] md:flex-1">
          <FormView form={block.form} />
        </div>
      </div>
    </section>
  )
}

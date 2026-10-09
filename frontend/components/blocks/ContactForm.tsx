import {BlockProps} from './types'

export default function ContactForm({block}: BlockProps<'contactForm'>) {
  return (
    <section className="w-full">
      <div className="max-w-[1360px] mx-auto px-10 py-16">
        {block.heading && <h2 className="text-headline-base mb-6">{block.heading}</h2>}
        <p className="text-moody-moor-700">The contact form isn’t available yet.</p>
      </div>
    </section>
  )
}

import ButtonLink from '@/components/ui/ButtonLink'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref} from '@/sanity/lib/utils'

import BlockImage from './BlockImage'
import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

export default function ProjectPreview({block}: BlockProps<'projectPreview'>) {
  // A reference to an unpublished project dereferences to null.
  const projects = (block.projects ?? []).flatMap((project) => (project?.name ? [project] : []))
  const buttonHref = realHref(
    block.button?.link ? linkResolver(block.button.link as DereferencedLink) : null,
  )
  const showButton = Boolean(block.button?.buttonText && buttonHref)
  const hasPanel = Boolean(block.eyebrow || block.body || showButton)
  if (!hasPanel && projects.length === 0) return null

  return (
    <section className="w-full bg-background tf-px py-s5">
      <div className="flex w-full flex-col gap-6 tf-max-w lg:flex-row">
        {hasPanel && (
          <div className="flex min-h-[28rem] flex-col items-start justify-between gap-10 bg-surface-dark p-6 text-on-surface-dark lg:h-[644px] lg:min-h-0 lg:w-[425px] lg:shrink-0">
            {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
            {block.body && <p className="w-full font-sans text-body-base leading-[1.6]">{block.body}</p>}
            {showButton && buttonHref && (
              <ButtonLink label={block.button?.buttonText ?? ''} href={buttonHref} rightIcon />
            )}
          </div>
        )}
        {projects.length > 0 && (
          <ol className="m-0 grid min-w-0 flex-1 list-none grid-cols-1 gap-6 p-0 sm:grid-cols-2 lg:flex lg:items-center">
            {projects.map((project, index) => {
              const href = realHref(project.link)
              const card = (
                <>
                  <div className="flex w-full flex-col items-start gap-8 text-on-background lg:gap-32">
                    <span className="text-headline-xl whitespace-nowrap">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <p className="w-full font-mono text-body-base leading-[1.6]">{project.name}</p>
                  </div>
                  <div className="relative aspect-[346/467] w-full overflow-clip bg-dusty-heath-800">
                    <BlockImage
                      image={project.image}
                      width={692}
                      sizes="(min-width: 1024px) 20vw, 50vw"
                      fill
                      className="size-full object-cover"
                    />
                  </div>
                </>
              )
              return (
                <li key={project._id} className="flex min-w-0 flex-1 items-stretch gap-6 self-stretch">
                  {index > 0 && (
                    <span className="hidden w-px shrink-0 self-stretch bg-border-light lg:block" aria-hidden="true" />
                  )}
                  {href ? (
                    <a href={href} className="flex min-w-0 flex-1 flex-col items-start gap-6">
                      {card}
                    </a>
                  ) : (
                    <div className="flex min-w-0 flex-1 flex-col items-start gap-6">{card}</div>
                  )}
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </section>
  )
}

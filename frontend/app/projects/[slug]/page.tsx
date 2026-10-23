import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {toPlainText, type PortableTextBlock} from 'next-sanity'

import ProjectPreviewView from '@/components/blocks/ProjectPreviewView'
import ProjectView from '@/components/ProjectView'
import PageTransition from '@/components/PageTransition'
import {sanityFetch} from '@/sanity/lib/live'
import {
  moreProjectsQuery,
  projectQuery,
  projectSlugs,
  singleProjectPageQuery,
} from '@/sanity/lib/queries'
import {orderRelatedProjects} from '@/sanity/lib/relatedProjects'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver, realHref, resolveOpenGraphImage} from '@/sanity/lib/utils'

/**
 * A project page, /projects/<slug>. A static route, so it wins over the catch-all that owns CMS
 * pages; a CMS page can still live at /projects (the archive) but not beneath it.
 */

export async function generateStaticParams() {
  const {data} = await sanityFetch({
    query: projectSlugs,
    // Only published projects are prerendered; a draft is fetched on demand in Presentation.
    perspective: 'published',
    stega: false,
  })
  return data.flatMap((project) => (project.slug ? [{slug: project.slug}] : []))
}

export const dynamicParams = true

export async function generateMetadata(props: PageProps<'/projects/[slug]'>): Promise<Metadata> {
  const {slug} = await props.params
  const {data: project} = await sanityFetch({query: projectQuery, params: {slug}, stega: false})
  if (!project) return {}
  const description =
    project.description ||
    (project.body?.length ? toPlainText(project.body as PortableTextBlock[]).slice(0, 160) : undefined)
  const image = resolveOpenGraphImage(project.image)
  return {
    title: project.name,
    description,
    openGraph: image ? {images: [image]} : undefined,
  } satisfies Metadata
}

export default async function ProjectPage(props: PageProps<'/projects/[slug]'>) {
  const {slug} = await props.params
  const [{data: project}, {data: settings}, {data: others}] = await Promise.all([
    sanityFetch({query: projectQuery, params: {slug}}),
    sanityFetch({query: singleProjectPageQuery}),
    sanityFetch({query: moreProjectsQuery, params: {slug}}),
  ])

  // No project at this slug: a real 404, never a 200 placeholder.
  if (!project?._id) notFound()

  const archiveHref = realHref(
    settings?.archiveLink ? linkResolver(settings.archiveLink as DereferencedLink) : null,
  )

  const more = settings?.moreProjects
  const showMore = !more?.disabled
  const count = Math.min(Math.max(more?.count ?? 3, 1), 4)
  const related = showMore ? orderRelatedProjects(others, project.projectTypeIds ?? [], count) : []
  const buttonHref = realHref(more?.button?.link ? linkResolver(more.button.link as DereferencedLink) : null)
  const buttonLabel = more?.button?.buttonText ?? ''

  return (
    <PageTransition>
      <ProjectView project={project} settings={settings} archiveHref={archiveHref} />
      {showMore && (
        <ProjectPreviewView
          eyebrow={more?.eyebrow}
          body={more?.body}
          button={buttonLabel && buttonHref ? {label: buttonLabel, href: buttonHref} : null}
          projects={related}
        />
      )}
    </PageTransition>
  )
}

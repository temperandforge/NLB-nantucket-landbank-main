import {Suspense} from 'react'

import FilterTabs from '@/components/ui/FilterTabs'
import {PROJECT_FILTER_LABEL, projectTabs} from '@/sanity/lib/archiveFilter'

import ProjectFilter from './ProjectFilter'
import ProjectList from './ProjectList'
import {BlockProps} from './types'

export default function ProjectGrid({block}: BlockProps<'projectGrid'>) {
  const projects = block.projects ?? []
  if (projects.length === 0) return null
  const tabs = projectTabs(projects)
  const showTabs = Boolean(block.showFilters) && tabs.length > 0

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        {showTabs ? (
          // useSearchParams needs a Suspense boundary on a statically rendered page. The fallback
          // is the same tabs and list with "All" pressed, so the page does not shift when the
          // filter takes over, and the server HTML is "All".
          <Suspense
            fallback={
              <div className="flex w-full flex-col items-start gap-16">
                <FilterTabs tabs={tabs} active={null} label={PROJECT_FILTER_LABEL} />
                <ProjectList projects={projects} />
              </div>
            }
          >
            <ProjectFilter projects={projects} />
          </Suspense>
        ) : (
          <ProjectList projects={projects} />
        )}
      </div>
    </section>
  )
}

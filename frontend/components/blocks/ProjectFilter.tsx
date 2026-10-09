'use client'

import type {ProjectItem} from '@/components/cards/types'
import FilterTabs from '@/components/ui/FilterTabs'
import {
  PROJECT_FILTER_LABEL,
  PROJECT_TYPE_PARAM,
  filterByPropertyType,
  projectTabs,
} from '@/sanity/lib/archiveFilter'

import ProjectList from './ProjectList'
import {useQueryFilter} from './useQueryFilter'

/** The projects with property-type tabs. Only used when there are tabs to show (ProjectGrid renders a plain list otherwise). */
export default function ProjectFilter({projects}: {projects: ProjectItem[]}) {
  const tabs = projectTabs(projects)
  const {active, choose} = useQueryFilter(PROJECT_TYPE_PARAM, tabs)

  return (
    <div className="flex w-full flex-col items-start gap-16">
      <FilterTabs tabs={tabs} active={active} label={PROJECT_FILTER_LABEL} onChoose={choose} />
      <div className="tf-px mx-auto w-full">
        <ProjectList projects={filterByPropertyType(projects, active)} />
      </div>
    </div>
  )
}

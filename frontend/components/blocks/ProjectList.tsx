import CardProject from '@/components/cards/CardProject'
import type {ProjectItem} from '@/components/cards/types'

/** The projects, 2 columns at md. Figma: 12px between columns, 64px between rows (48px on mobile). */
export default function ProjectList({projects}: {projects: ProjectItem[]}) {
  return (
    <ul className="grid w-full list-none grid-cols-1 gap-x-3 gap-y-12 p-0 md:grid-cols-2 md:gap-y-16">
      {projects.map((project) => (
        <li key={project._id}>
          <CardProject project={project} />
        </li>
      ))}
    </ul>
  )
}

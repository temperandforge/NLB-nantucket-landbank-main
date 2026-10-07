import CardProject from '@/components/cards/CardProject'

import {BlockProps} from './types'

export default function ProjectGrid({block}: BlockProps<'projectGrid'>) {
  const projects = block.projects ?? []
  if (projects.length === 0) return null

  return (
    <section className="bg-background tf-px py-s6">
      <div className="flex w-full flex-col items-start gap-10 tf-max-w">
        {block.heading && <h2 className="w-full text-headline-xl text-on-background">{block.heading}</h2>}
        <ul className="grid w-full list-none grid-cols-1 gap-x-6 gap-y-12 p-0 sm:grid-cols-2 lg:grid-cols-4">
          {projects.map((project) => (
            <li key={project._id}>
              <CardProject project={project} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

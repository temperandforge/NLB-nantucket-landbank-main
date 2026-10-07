import {BriefcaseBusinessIcon, MapPinnedIcon} from '@/components/icons'
import Tag from '@/components/ui/Tag'
import LinkButton from '@/components/ui/LinkButton'
import {DereferencedLink} from '@/sanity/lib/types'
import {linkResolver} from '@/sanity/lib/utils'

import Eyebrow from './Eyebrow'
import {BlockProps} from './types'

type Job = NonNullable<BlockProps<'jobListings'>['block']['jobs']>[number]

function JobItem({job}: {job: Job}) {
  // A department that was unpublished dereferences to null.
  const department = job.department?.title
  const href = linkResolver(job.applyLink as DereferencedLink | undefined)

  return (
    <li className="grid w-full grid-cols-1 gap-y-[18px] lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-x-3">
      <div className="flex min-w-0 flex-col items-start gap-3 lg:col-start-1 lg:row-start-1">
        <h3 className="text-headline-sm leading-[1.2] text-on-background">{job.title}</h3>
        {department && <Tag label={department} />}
      </div>
      <div className="flex min-w-0 flex-col items-start gap-3 lg:col-span-2 lg:row-start-2">
        {job.description && (
          <p className="line-clamp-2 w-full font-sans text-body-base leading-[1.6] text-on-background">
            {job.description}
          </p>
        )}
        {(job.location || job.employmentType) && (
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-body-base leading-[1.6] text-on-background-subtle lg:gap-x-6">
            {job.location && (
              <li className="flex items-center gap-3">
                <MapPinnedIcon className="size-6 shrink-0" />
                {job.location}
              </li>
            )}
            {job.employmentType && (
              <li className="flex items-center gap-3">
                <BriefcaseBusinessIcon className="size-6 shrink-0" />
                {job.employmentType}
              </li>
            )}
          </ul>
        )}
      </div>
      {href && (
        <LinkButton
          label="Apply now"
          href={href}
          className="lg:col-start-2 lg:row-start-1 lg:self-start"
        />
      )}
    </li>
  )
}

export default function JobListings({block}: BlockProps<'jobListings'>) {
  const jobs = block.jobs ?? []
  if (jobs.length === 0) return null

  return (
    <section className="flex w-full bg-background px-5 py-20 lg:px-10 lg:py-32">
      <div className="mx-auto flex w-full max-w-[85rem] flex-col items-start gap-20 lg:flex-row lg:justify-between lg:gap-10">
        {(block.eyebrow || block.heading) && (
          <div className="flex w-full flex-col items-start gap-3 text-on-background lg:w-[436px] lg:shrink-0">
            {block.eyebrow && <Eyebrow>{block.eyebrow}</Eyebrow>}
            {block.heading && <h2 className="text-headline-lg leading-[1.1]">{block.heading}</h2>}
          </div>
        )}
        <ul className="flex w-full min-w-0 flex-col items-start gap-12 lg:max-w-[668px] lg:gap-16">
          {jobs.map((job) => (
            <JobItem key={job._id} job={job} />
          ))}
        </ul>
      </div>
    </section>
  )
}

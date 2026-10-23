/**
 * Turns each job's `department` from a reference to a staff department into plain text, now that a
 * job's department is free text and unrelated to the staff departments.
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/convertJobDepartmentsToText.ts --with-user-token -- --dry
 *   npx sanity exec scripts/convertJobDepartmentsToText.ts --with-user-token
 *
 * What it writes: `department` on `job` documents (published and draft), replacing the reference
 * with the referenced department's title. A reference that no longer resolves has the field removed.
 * Nothing else, and the `department` documents themselves are left alone (staff still use them).
 *
 * Idempotent: a job whose `department` is already text is skipped.
 *
 * --dry prints the plan and writes nothing.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const DRY_RUN = process.argv.includes('--dry')

type Job = {_id: string; title?: string; department?: unknown}

async function main() {
  const jobs = await client.fetch<Job[]>(`*[_type == "job"]{_id, title, department}`)
  const refs = jobs.filter(
    (job): job is Job & {department: {_ref: string}} =>
      typeof job.department === 'object' && job.department !== null && '_ref' in job.department,
  )
  console.log(`${jobs.length} job document(s); ${refs.length} with a department reference.`)

  const tx = client.transaction()
  for (const job of refs) {
    const base = job.department._ref
    const titles = await client.fetch<string[]>(
      `*[_type == "department" && _id in [$id, "drafts." + $id]].title`,
      {id: base},
    )
    const title = titles[0]
    console.log(`  ${job._id} (${job.title}): ${title ? `"${title}"` : 'unresolved, field removed'}`)
    tx.patch(job._id, title ? {set: {department: title}} : {unset: ['department']})
  }
  if (DRY_RUN || refs.length === 0) {
    console.log(DRY_RUN ? 'Dry run: nothing written.' : 'Nothing to convert.')
    return
  }
  await tx.commit()
  console.log('Converted.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

/**
 * Migrates the four policy PDFs listed on https://www.nantucketlandbank.org/about/policies/ to DRAFT
 * `record` documents in the `policies` record category (the "Policies" tab on the Public Records page).
 *
 * Run from the studio directory:
 *   npx sanity exec scripts/wordpress/importWordpressPolicies.ts --with-user-token -- --dry
 *   npx sanity exec scripts/wordpress/importWordpressPolicies.ts --with-user-token
 *
 * What it writes: up to four draft `record` documents (Sanity generates the ids) and one file asset
 * per record, downloaded from the live site. Nothing else is touched, and the existing "[Sample]"
 * records in the category are left alone.
 *
 * Idempotent and non-destructive: a record in the `policies` category with the same title, published
 * or draft, is skipped and NEVER edited. --dry prints the plan (and checks every PDF resolves) but
 * writes and uploads nothing. The `policies` category must already exist and be published; the script
 * stops without writing if it does not.
 *
 * Decisions:
 *  - title: the link text on the WordPress page, without the "(PDF)" the source does not use here.
 *  - no date: the category sorts by title with no year filter, and a policy has no meeting date. The
 *    revision dates that appear in some file names are not authoritative, so none is set.
 *  - the page's closing line ("This policies on this page may be revisited and amended from time to
 *    time as requested by the Commission.") is page copy, not a record, and is not migrated.
 */

import {getCliClient} from 'sanity/cli'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({perspective: 'raw', useCdn: false})
const DRY_RUN = process.argv.includes('--dry')

const CATEGORY_SLUG = 'policies'
const UPLOADS = 'https://www.nantucketlandbank.org/wp-content/uploads'

const POLICIES = [
  {title: 'Agricultural Policy', filename: 'Agricultural-Policy-Final-11.2022-1.pdf'},
  {title: 'Encroachment Policy', filename: 'NLB-ENCROACHMENT-POLICY-10.27.2020-FINAL.pdf'},
  {title: 'Indoor Recreation Use Requests Policy', filename: 'Indoor-Recreation-Policy.pdf'},
  {title: 'Meeting Agenda Procedures Policy', filename: 'Meeting-Agenda-Policy-Final-as-of-1.25.22.pdf'},
]

async function main() {
  const category = await client.fetch<{_id: string} | null>(
    `*[_type == "recordCategory" && slug.current == $slug && !(_id in path("drafts.**"))][0]{_id}`,
    {slug: CATEGORY_SLUG},
  )
  if (!category) throw new Error(`No published recordCategory with slug "${CATEGORY_SLUG}"; nothing written.`)

  const existing = await client.fetch<Array<{_id: string; title: string | null}>>(
    `*[_type == "record" && (category._ref == $id || category._ref == $draftId)]{_id, title}`,
    {id: category._id, draftId: `drafts.${category._id}`},
  )
  const have = new Set(existing.map((record) => record.title))

  // Resolve every PDF before writing anything, so a dead link stops the whole run.
  for (const policy of POLICIES) {
    const response = await fetch(`${UPLOADS}/${policy.filename}`, {method: 'HEAD'})
    if (!response.ok) throw new Error(`${policy.filename} does not resolve (${response.status}); nothing written.`)
  }

  for (const policy of POLICIES) {
    if (have.has(policy.title)) {
      console.log(`= exists, left as is: ${policy.title}`)
      continue
    }
    console.log(`Plan: draft record "${policy.title}" in ${CATEGORY_SLUG}, file ${UPLOADS}/${policy.filename}`)
    if (DRY_RUN) continue

    const response = await fetch(`${UPLOADS}/${policy.filename}`)
    if (!response.ok) throw new Error(`Could not download ${policy.filename}: ${response.status}`)
    const asset = await client.assets.upload('file', Buffer.from(await response.arrayBuffer()), {
      filename: policy.filename,
      contentType: 'application/pdf',
    })
    const created = await client.create({
      _id: 'drafts.',
      _type: 'record',
      title: policy.title,
      file: {_type: 'file', asset: {_type: 'reference', _ref: asset._id}},
      category: {_type: 'reference', _ref: category._id},
    } as never)
    console.log(`+ created ${created._id} (file ${asset._id})`)
  }
  if (DRY_RUN) console.log('[dry run] nothing downloaded or written.')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

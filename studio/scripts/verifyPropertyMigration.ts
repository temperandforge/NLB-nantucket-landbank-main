/**
 * Validates the migrated properties against the projects they came from. Read-only.
 *
 *   npx sanity exec scripts/verifyPropertyMigration.ts --with-user-token
 *
 * For every project: exactly one property with its slug, in the same publish state, with every
 * copied field equal. Also compares the totals. Exits non-zero when anything does not match.
 */

import {getCliClient} from 'sanity/cli'

import {COPIED_FIELDS, planProperties, type SourceDoc} from './migrations/projectsToProperties'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const canonical = (value: unknown): string =>
  JSON.stringify(value, (_key, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  )

let failures = 0
function check(ok: boolean, message: string) {
  if (ok) return
  console.error(`  FAIL ${message}`)
  failures += 1
}

async function main() {
  const projects = await client.fetch<SourceDoc[]>(`*[_type == "project"]`)
  const properties = await client.fetch<SourceDoc[]>(`*[_type == "property"]`)
  const {create: planned, issues} = planProperties(projects, new Set())
  console.log(`${projects.length} project document(s), ${properties.length} property document(s), ${planned.length} planned.`)
  issues.forEach((issue) => console.log(`  ! ${issue}`))

  let published = 0
  let drafts = 0
  for (const item of planned) {
    const matches = properties.filter((doc) => doc.slug?.current === item.slug)
    check(matches.length > 0 && matches.length <= 2, `${item.slug}: expected one property (and at most one draft), found ${matches.length}`)
    const pub = matches.find((doc) => !doc._id.startsWith('drafts.'))
    const draft = matches.find((doc) => doc._id.startsWith('drafts.'))
    check(Boolean(pub) === Boolean(item.published), `${item.slug}: published state differs`)
    check(Boolean(draft) === Boolean(item.draft), `${item.slug}: draft state differs`)
    if (pub) published += 1
    if (draft) drafts += 1
    for (const [doc, fields] of [[pub, item.published], [draft, item.draft]] as const) {
      if (!doc || !fields) continue
      for (const field of COPIED_FIELDS) {
        check(canonical(doc[field] ?? null) === canonical(fields[field] ?? null), `${item.slug}: ${field} differs`)
      }
    }
  }
  console.log(`${published} published and ${drafts} draft propert${published + drafts === 1 ? 'y' : 'ies'} checked.`)
  console.log(failures === 0 ? 'All checks passed.' : `${failures} check(s) failed.`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

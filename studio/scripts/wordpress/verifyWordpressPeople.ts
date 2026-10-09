/**
 * Validates the imported people against the WordPress extraction. Read-only.
 *
 *   npx sanity exec scripts/wordpress/verifyWordpressPeople.ts --with-user-token
 *
 * For every planned person: exactly one document of the right type with the same name, order,
 * title, term date (commissioners), department (staff) and a headshot where the source has one.
 * Also compares the totals and the per-department counts, and reports (without failing) any other
 * person documents, such as samples. Exits non-zero when anything does not match.
 */

import {existsSync, readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {getCliClient} from 'sanity/cli'

import {normalizeName, planDepartments, planPeople, type Snapshot} from './people'

const client = getCliClient({apiVersion: '2025-09-25'}).withConfig({
  perspective: 'raw',
  useCdn: false,
})

const published = (id: string) => id.replace(/^drafts\./, '')

type Doc = {
  _id: string
  _type: string
  name?: string
  title?: string
  order?: number
  termDate?: string
  departmentRef?: string
  hasHeadshot: boolean
}

let failures = 0
function check(ok: boolean, message: string): boolean {
  if (ok) console.log(`  ok   ${message}`)
  else {
    console.error(`  FAIL ${message}`)
    failures += 1
  }
  return ok
}

async function main() {
  const snapshotPath = resolve(__dirname, '../data/wordpress/people.json')
  if (!existsSync(snapshotPath)) {
    console.error('No people.json: run scripts/wordpress/extractPeople.sh first.')
    process.exit(1)
  }
  const snapshot = JSON.parse(readFileSync(snapshotPath, 'utf8')) as Snapshot
  const {people} = planPeople(snapshot)
  const plannedDepartments = planDepartments(snapshot.departments)

  const docs = await client.fetch<Doc[]>(
    `*[_type in ["staffMember", "commissioner"]]{
      _id, _type, name, title, order, termDate,
      "departmentRef": department._ref,
      "hasHeadshot": defined(headshot.asset._ref)
    }`,
  )
  const departments = await client.fetch<Array<{_id: string; slug?: string}>>(
    `*[_type == "department"]{_id, "slug": slug.current}`,
  )
  const slugById = new Map(departments.map((d) => [published(d._id), d.slug]))

  // Drafts and published copies of one document are one person.
  const byKey = new Map<string, Doc[]>()
  for (const doc of docs) {
    const key = `${doc._type}:${normalizeName(doc.name ?? '')}`
    byKey.set(key, [...(byKey.get(key) ?? []), doc])
  }
  const distinct = (list: Doc[]) => new Set(list.map((d) => published(d._id))).size

  console.log('People:')
  for (const person of people) {
    const list = byKey.get(`${person.type}:${normalizeName(person.name)}`) ?? []
    if (!check(distinct(list) === 1, `${person.name}: exactly one ${person.type} (found ${distinct(list)})`)) continue
    const doc = list.find((d) => d._id.startsWith('drafts.')) ?? list[0]
    check(doc.order === person.order, `${person.name}: order ${person.order}`)
    check((doc.title ?? undefined) === person.title, `${person.name}: title "${person.title ?? ''}"`)
    check(doc.hasHeadshot === Boolean(person.photoPath), `${person.name}: headshot ${person.photoPath ? 'present' : 'absent'}`)
    if (person.type === 'commissioner') {
      check((doc.termDate ?? undefined) === person.termDate, `${person.name}: term date "${person.termDate ?? ''}"`)
    } else {
      const slug = doc.departmentRef ? slugById.get(published(doc.departmentRef)) : undefined
      check(slug === person.departmentSlug, `${person.name}: department ${person.departmentSlug ?? '(none)'}`)
    }
  }

  console.log('Totals:')
  for (const type of ['staffMember', 'commissioner'] as const) {
    const expected = people.filter((p) => p.type === type).length
    const planned = new Set(people.filter((p) => p.type === type).map((p) => normalizeName(p.name)))
    const found = [...byKey.entries()].filter(([key]) => key.startsWith(`${type}:`))
    check(
      [...planned].every((name) => byKey.has(`${type}:${name}`)),
      `all ${expected} ${type} documents exist`,
    )
    const extra = found.filter(([key]) => !planned.has(key.slice(type.length + 1)))
    if (extra.length > 0) {
      console.log(`  note ${extra.length} other ${type} document(s) not from WordPress: ${extra.map(([, l]) => l[0].name).join(', ')}`)
    }
  }
  for (const department of plannedDepartments) {
    const expected = people.filter((p) => p.departmentSlug === department.slug).length
    const actual = docs.filter(
      (d) => d._type === 'staffMember' && d.departmentRef && slugById.get(published(d.departmentRef)) === department.slug,
    ).length
    // A sample person may also sit in a department, so this is a lower bound.
    check(actual >= expected, `department ${department.slug}: at least ${expected} staff (found ${actual})`)
  }

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`)
  if (failures > 0) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})

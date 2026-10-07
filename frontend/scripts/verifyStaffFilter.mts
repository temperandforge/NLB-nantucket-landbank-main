/**
 * Verifies the staff department filter. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyStaffFilter.mts
 *
 * Imports the real helpers, not a copy. Exits non-zero on failure.
 */
import {
  departmentSearch,
  departmentTabs,
  filterByDepartment,
  parseDepartment,
} from '../sanity/lib/staffFilter.ts'

let failed = false
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
    failed = true
  }
}

const admin = {slug: 'administration', title: 'Administration', order: 10}
const env = {slug: 'environmental', title: 'Environmental', order: 20}
const prop = {slug: 'property-management', title: 'Property Management', order: 30}
const people = [
  {name: 'a', department: prop},
  {name: 'b', department: admin},
  {name: 'c', department: admin},
  {name: 'd', department: null},
  {name: 'e'},
  {name: 'f', department: env},
]

same(
  departmentTabs(people),
  [
    {slug: 'administration', title: 'Administration'},
    {slug: 'environmental', title: 'Environmental'},
    {slug: 'property-management', title: 'Property Management'},
  ],
  'tabs are the departments that have staff, once each, in department order',
)
same(departmentTabs([]), [], 'no staff gives no tabs')
same(
  departmentTabs([{department: {slug: '', title: 'Blank slug'}}, {department: {slug: 'x', title: ' '}}]),
  [],
  'a department with no slug or no title gets no tab',
)
same(
  departmentTabs([
    {department: {slug: 'zeta', title: 'Zeta'}},
    {department: {slug: 'alpha', title: 'Alpha'}},
    {department: {slug: 'ordered', title: 'Ordered', order: 1}},
  ]),
  [
    {slug: 'ordered', title: 'Ordered'},
    {slug: 'alpha', title: 'Alpha'},
    {slug: 'zeta', title: 'Zeta'},
  ],
  'a department with no order comes after ordered ones, then by title',
)

same(filterByDepartment(people, null).length, 6, 'no filter keeps everyone, including people with no department')
same(
  filterByDepartment(people, 'administration').map((p) => p.name),
  ['b', 'c'],
  'a department filter keeps only its members',
)
same(filterByDepartment(people, 'nobody-here'), [], 'a department with no members gives an empty list')

const tabs = departmentTabs(people)
same(parseDepartment('?department=environmental', tabs), 'environmental', 'a known department is read from the address')
same(parseDepartment('?department=nope', tabs), null, 'an unknown department is ignored')
same(parseDepartment('?department=', tabs), null, 'a blank department is ignored')
same(parseDepartment('', tabs), null, 'no query is no filter')
same(parseDepartment('?department=administration&department=environmental', tabs), 'administration', 'a repeated parameter uses the first')
same(departmentSearch(null), '', 'no filter has no query')
same(departmentSearch('property-management'), '?department=property-management', 'a filter becomes a query')
same(departmentSearch('a b&c'), '?department=a%20b%26c', 'the slug is encoded')

if (failed) process.exit(1)

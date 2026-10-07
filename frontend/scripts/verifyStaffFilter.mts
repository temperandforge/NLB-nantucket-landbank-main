/**
 * Verifies the staff department filter. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyStaffFilter.mts
 *
 * Imports the real helpers, not a copy. Exits non-zero on failure.
 */
import {
  filterByPropertyType,
  parseProjectType,
  projectTabs,
  withProjectType,
  departmentTabs,
  filterByDepartment,
  parseDepartment,
  withDepartment,
} from '../sanity/lib/archiveFilter.ts'

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
same(withDepartment('', null), '', 'no filter and no query stays empty')
same(withDepartment('', 'property-management'), '?department=property-management', 'a filter becomes a query')
same(withDepartment('?department=a&department=b', null), '', 'clearing the filter removes every department parameter')
same(withDepartment('?department=old', 'new'), '?department=new', 'a new filter replaces the old one')
same(withDepartment('?utm_source=x', 'new'), '?utm_source=x&department=new', 'other parameters are kept')
same(withDepartment('?utm_source=x&department=old', null), '?utm_source=x', 'clearing keeps other parameters')
same(withDepartment('?x=1', 'a b&c'), '?x=1&department=a%20b%26c', 'the slug is encoded')

// Project type tabs share the same machinery.
const beach = {slug: 'beach', title: 'Beach', order: 2}
const trail = {slug: 'trail', title: 'Trail', order: 1}
const projects = [
  {name: 'a', propertyTypes: [beach, trail]},
  {name: 'b', propertyTypes: [beach, null]},
  {name: 'c', propertyTypes: null},
]
same(
  projectTabs(projects),
  [
    {slug: 'trail', title: 'Trail'},
    {slug: 'beach', title: 'Beach'},
  ],
  'project tabs are the property types in use, in their own order, ignoring unpublished ones',
)
same(filterByPropertyType(projects, 'beach').map((p) => p.name), ['a', 'b'], 'a type filter keeps projects with that type')
same(filterByPropertyType(projects, null).length, 3, 'no filter keeps every project')
same(parseProjectType('?type=beach', projectTabs(projects)), 'beach', 'a known type is read from the address')
same(parseProjectType('?type=nope', projectTabs(projects)), null, 'an unknown type is ignored')
same(withProjectType('?department=x', 'beach'), '?department=x&type=beach', 'the project filter keeps the staff filter parameter')

if (failed) process.exit(1)

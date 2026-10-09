/**
 * Verifies the WordPress people transform (people.ts). No test framework, so a plain script:
 *
 *   cd studio && node scripts/wordpress/verifyPeopleTransform.mts
 *
 * Imports the real module, not a copy. Exits non-zero on failure.
 */
import {decodeEntities, normalizeName, planDepartments, planPeople} from './people.ts'

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

same(decodeEntities('Environmental &amp; Agricultural'), 'Environmental & Agricultural', 'decodes &amp;')
same(decodeEntities('Claire O&#039;Connor'), "Claire O'Connor", 'decodes a numeric apostrophe')
same(decodeEntities('O&#8217;Connor &quot;Q&quot; &lt;x&gt;'), 'O’Connor "Q" <x>', 'decodes numeric and named entities')
same(decodeEntities('plain'), 'plain', 'leaves plain text alone')
same(normalizeName('  Susan   C.  Campese '), 'susan c. campese', 'normalises case and whitespace')
same(normalizeName('Environmental &amp; X'), 'environmental & x', 'normalises after decoding')

const photo = (path: string, exists = true) => ({attachmentId: 1, path, exists, alt: ''})
const base = {status: 'publish', slug: 's', jobTitle: '', termDate: '', photo: null}
const snapshot = {
  people: [
    {...base, wpId: 1, type: 'staff', name: 'Rachael Freeman', menuOrder: 10, jobTitle: 'Executive Director', photo: photo('/u/r.jpg')},
    {...base, wpId: 2, type: 'staff', name: 'Dean  Belanger', menuOrder: 70, jobTitle: ' Venison Processing Manager '},
    {...base, wpId: 3, type: 'staff', name: 'Nobody Known', menuOrder: 80, jobTitle: 'Unassigned', photo: photo('/u/gone.jpg', false)},
    {...base, wpId: 4, type: 'staff', name: 'Draft Person', menuOrder: 90, status: 'draft'},
    {...base, wpId: 5, type: 'staff', name: 'Rachael Freeman', menuOrder: 11},
    {...base, wpId: 6, type: 'commissioner', name: 'Kristina Jelleme', menuOrder: 10, jobTitle: 'Chair', termDate: 'May 2027', photo: photo('/u/k.jpg')},
    {...base, wpId: 7, type: 'commissioner', name: 'No Term', menuOrder: 20, termDate: '  '},
  ],
  legacyStaffDepartments: [
    {wpId: 100, name: 'Rachael Freeman', department: {slug: 'administration', name: 'Administration'}},
    {wpId: 101, name: 'dean belanger', department: {slug: 'environmental-agricultural', name: 'Environmental &amp; Agricultural'}},
  ],
  departments: [
    {termId: 52, slug: 'administration', name: 'Administration'},
    {termId: 53, slug: 'environmental-agricultural', name: 'Environmental &amp; Agricultural'},
    {termId: 54, slug: 'property-management', name: 'Property Management'},
  ],
}

same(
  planDepartments(snapshot.departments),
  [
    {slug: 'administration', title: 'Administration', order: 10},
    {slug: 'environmental-agricultural', title: 'Environmental & Agricultural', order: 20},
    {slug: 'property-management', title: 'Property Management', order: 30},
  ],
  'departments keep WordPress order (by term id), with decoded titles',
)

const {people, issues} = planPeople(snapshot)
const byWp = (id: number) => people.find((p) => p.wpId === id)

same(people.map((p) => p.wpId), [1, 2, 3, 6, 7], 'drafts and duplicate names are not planned')
same(byWp(1), {
  wpId: 1, type: 'staffMember', name: 'Rachael Freeman', title: 'Executive Director', order: 10,
  departmentSlug: 'administration', photoPath: '/u/r.jpg',
}, 'a staff member with a photo and a department')
same(byWp(2)?.name, 'Dean Belanger', 'a name has its whitespace collapsed')
same(byWp(2)?.title, 'Venison Processing Manager', 'a title is trimmed')
same(byWp(2)?.departmentSlug, 'environmental-agricultural', 'the department is joined by name, ignoring case and spacing')
same(byWp(2)?.photoPath, undefined, 'no photo means no photo path')
same(byWp(3)?.departmentSlug, undefined, 'a person with no legacy department has none')
same(byWp(3)?.photoPath, undefined, 'a photo whose file is missing is not planned')
same(byWp(6), {
  wpId: 6, type: 'commissioner', name: 'Kristina Jelleme', title: 'Chair', order: 10,
  termDate: 'May 2027', photoPath: '/u/k.jpg',
}, 'a commissioner carries its term date')
same(byWp(7)?.termDate, undefined, 'a blank term date is dropped')

const text = issues.join('\n')
check('skipped draft is reported', /Draft Person.*not published/i.test(text))
check('duplicate name is reported', /duplicate.*Rachael Freeman/i.test(text))
check('missing department is reported', /Nobody Known.*no department/i.test(text))
check('missing photo file is reported', /Nobody Known.*photo file is missing/i.test(text))
check('no photo is reported', /Dean Belanger.*no photo/i.test(text))

function check(message: string, condition: boolean) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}\n${text}`)
    failed = true
  }
}

if (failed) process.exit(1)

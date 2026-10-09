/**
 * Verifies how a dropdown's links are grouped under column headings. No test framework, so a
 * plain script:
 *
 *   cd frontend && node scripts/verifyMenuGroups.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {groupMenuLinks} from '../sanity/lib/menuGroups.ts'
import {resolveItemHref} from '../components/header/resolveItemHref.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const l = (label: string, group?: string | null) => ({label, group})
const shape = (links: ReturnType<typeof l>[]) =>
  groupMenuLinks(links)
    .map((g) => `${g.heading ?? '-'}:${g.links.map((x) => x.label).join('+')}`)
    .join('|')

check(shape([]) === '', 'no links gives no groups')
check(shape([l('A'), l('B')]) === '-:A+B', 'ungrouped links form one headless list')
check(
  shape([l('A', 'Purpose'), l('B', 'Purpose'), l('C', 'People')]) === 'Purpose:A+B|People:C',
  'consecutive links with one heading share a group',
)
check(
  shape([l('A', 'X'), l('B', 'Y'), l('C', 'X')]) === 'X:A|Y:B|X:C',
  'interleaved headings stay separate, in authored order',
)
check(shape([l('A', ''), l('B', '   '), l('C', null)]) === '-:A+B+C', 'empty and blank headings count as none')
check(shape([l('A', ' Purpose '), l('B', 'Purpose')]) === 'Purpose:A+B', 'headings are trimmed before comparing')
check(
  shape([l('A', 'Purpose'), l('B'), l('C', 'Purpose')]) === 'Purpose:A|-:B|Purpose:C',
  'an ungrouped link between two groups splits them',
)

check(resolveItemHref({_type: 'link', linkType: 'href', href: '#'}) === '#', 'a # placeholder resolves to #')
check(
  resolveItemHref({_type: 'link', linkType: 'page', page: 'about-us/history'}) === '/about-us/history',
  'a page link resolves to its full path',
)
check(
  resolveItemHref({_type: 'link', linkType: 'page', page: null}) === null,
  'a link to an unpublished page resolves to null so the item is dropped',
)
check(resolveItemHref(undefined) === null, 'a missing link resolves to null')

process.exit(failed ? 1 : 0)

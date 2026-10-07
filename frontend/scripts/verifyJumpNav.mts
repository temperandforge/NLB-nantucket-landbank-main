/**
 * Verifies the jump-nav id contract. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyJumpNav.mts
 *
 * Imports the real helper, not a copy. Exits non-zero on the first failure.
 */
import {buildJumpNav, slugify} from '../sanity/lib/jumpNav.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const h3 = (key: string, ...texts: string[]) => ({
  _key: key,
  _type: 'block',
  style: 'h3',
  children: texts.map((text) => ({text})),
})

check(slugify('Getting There') === 'getting-there', 'slugify lowercases and hyphenates')
check(slugify('Café & Bar!') === 'cafe-bar', 'slugify strips accents and punctuation')
check(slugify('  --  ') === '', 'slugify of only punctuation is empty')

const dup = buildJumpNav([h3('a', 'Parking'), h3('b', 'Parking'), h3('c', 'Parking')])
check(
  dup.items.map((i) => i.id).join(',') === 'parking,parking-2,parking-3',
  'duplicate headings get -2, -3 suffixes',
)
check(dup.idByKey.b === 'parking-2', 'ids are keyed by block _key for the heading renderer')

const empty = buildJumpNav([h3('a', '   '), h3('b', 'After')])
check(empty.items.length === 1 && empty.items[0].text === 'After', 'empty headings get no nav row')
check(empty.idByKey.a === 'section', 'empty headings still get an id')

const mixed = buildJumpNav([
  {_key: 'p', _type: 'block', style: 'normal', children: [{text: 'Body'}]},
  {_key: 'h', _type: 'block', style: 'h4', children: [{text: 'Sub'}]},
  {_key: 'i', _type: 'image'},
  h3('x', 'Real', ' heading'),
])
check(
  mixed.items.length === 1 && mixed.items[0].text === 'Real heading',
  'only h3 blocks count; spans are joined',
)

check(buildJumpNav(null).items.length === 0, 'null input yields no items')
check(buildJumpNav(undefined).items.length === 0, 'undefined input yields no items')

if (failed) process.exit(1)

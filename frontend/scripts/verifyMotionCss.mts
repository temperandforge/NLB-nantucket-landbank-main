/**
 * Verifies css/motion.css. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyMotionCss.mts
 *
 * Reads the real stylesheet as text. Exits non-zero on failure.
 *
 * The contract: every animation, keyframe and view-transition animation rule sits inside ONE
 * `@media screen and (prefers-reduced-motion: no-preference)` block, so reduced-motion and print
 * users never get a hidden start state. Outside it the text is simply visible.
 */
import {readFileSync} from 'node:fs'

let failed = false
function check(ok: boolean, message: string) {
  if (ok) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

let css = ''
try {
  css = readFileSync(new URL('../css/motion.css', import.meta.url), 'utf8')
} catch {
  check(false, 'css/motion.css exists')
}
css = css.replace(/\/\*[\s\S]*?\*\//g, '')

const GUARD = /@media\s+screen\s+and\s+\(\s*prefers-reduced-motion\s*:\s*no-preference\s*\)\s*\{/g

// Split the file into the guarded block(s) and everything else, by brace matching.
const guards: string[] = []
let outside = ''
let cursor = 0
for (const match of css.matchAll(GUARD)) {
  const open = match.index + match[0].length
  let depth = 1
  let i = open
  while (i < css.length && depth > 0) {
    if (css[i] === '{') depth++
    else if (css[i] === '}') depth--
    i++
  }
  outside += css.slice(cursor, match.index)
  guards.push(css.slice(open, i - 1))
  cursor = i
}
outside += css.slice(cursor)

check(guards.length === 1, `exactly one @media screen and (prefers-reduced-motion: no-preference) block (found ${guards.length})`)
check(!/@media[^{]*print/.test(css), 'no separate print rule (screen qualification excludes print)')
check(!/\banimation(-name)?\s*:/.test(outside), 'no animation / animation-name declaration outside the guarded block')
check(!/@keyframes/.test(outside), 'no @keyframes outside the guarded block')
check(
  !/::view-transition-(old|new|group|image-pair)/.test(outside),
  'no ::view-transition-old/new/group rule outside the guarded block',
)
const inside = guards.join('\n')
check(/\banimation(-name)?\s*:/.test(inside), 'the guarded block contains the animation declarations')
check(/@keyframes/.test(inside), 'the guarded block contains the keyframes')
check(/::view-transition-old\(\.page-out\)/.test(inside), 'page-out exit rule exists')
check(/::view-transition-new\(\.page-in\)/.test(inside), 'page-in enter rule exists')
check(/::view-transition-group\(site-header\)/.test(inside), 'site-header anchor rule exists')
check(/:root:active-view-transition/.test(inside), 'active-view-transition delay rule exists')
check(/::view-transition\s*\{[^}]*pointer-events:\s*none/.test(outside), '::view-transition passes pointer events through')
check(/\.cascade-word\s*\{[^}]*display:\s*inline-block/.test(outside), '.cascade-word is inline-block')

const tokens: Record<string, string> = {
  '--motion-duration': '800ms',
  '--motion-ease': 'cubic-bezier(.22,1,.36,1)',
  '--cascade-step': '45ms',
  '--cascade-rise': '.4em',
  '--cascade-blur': '6px',
  '--nav-delay': '150ms',
  '--page-out-duration': '180ms',
  '--page-in-duration': '280ms',
}
for (const [name, value] of Object.entries(tokens)) {
  const found = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(css)?.[1].replace(/\s+/g, '')
  check(found === value, `${name} is ${value}${found ? ` (got ${found})` : ' (missing)'}`)
}

if (failed) process.exit(1)
console.log('motion.css ok')

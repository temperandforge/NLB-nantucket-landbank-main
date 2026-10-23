/**
 * Verifies css/motion.css. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyMotionCss.mts
 *
 * Reads the real stylesheet as text. Exits non-zero on failure.
 *
 * The contract: every animation, keyframe and view-transition animation rule sits inside ONE
 * `@media screen and (prefers-reduced-motion: no-preference)` block, so reduced-motion and print
 * users never get a hidden start state. Outside it the text is simply visible. The one exception is
 * a single `@media (prefers-reduced-motion: reduce)` block that only zeroes view-transition
 * durations and delays, so the browser's default transition animations don't run either.
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
const REDUCE = /@media\s+\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)\s*\{/g

/** Splits `source` into the bodies of the blocks `opener` starts and everything else, by brace matching. */
function split(source: string, opener: RegExp): {blocks: string[]; rest: string} {
  const blocks: string[] = []
  let rest = ''
  let cursor = 0
  for (const match of source.matchAll(opener)) {
    const open = match.index + match[0].length
    let depth = 1
    let i = open
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++
      else if (source[i] === '}') depth--
      i++
    }
    rest += source.slice(cursor, match.index)
    blocks.push(source.slice(open, i - 1))
    cursor = i
  }
  return {blocks, rest: rest + source.slice(cursor)}
}

const {blocks: guards, rest: unguarded} = split(css, GUARD)
// The one exception outside the guard: a reduced-motion block that only zeroes view-transition
// durations and delays (checked below), so the browser's default transition animations don't run.
const {blocks: reduces, rest: outside} = split(unguarded, REDUCE)

check(guards.length === 1, `exactly one @media screen and (prefers-reduced-motion: no-preference) block (found ${guards.length})`)
check(!/@media[^{]*print/.test(css), 'no separate print rule (screen qualification excludes print)')
check(!/\banimation(-name)?\s*:/.test(outside), 'no animation / animation-name declaration outside the guarded block')
check(!/@keyframes/.test(outside), 'no @keyframes outside the guarded block')
check(
  !/::view-transition-(old|new|group|image-pair)/.test(outside),
  'no ::view-transition-old/new/group rule outside the guarded block',
)
check(reduces.length === 1, `exactly one @media (prefers-reduced-motion: reduce) block (found ${reduces.length})`)
const reduce = reduces.join('\n')
check(
  ['group', 'old', 'new'].every((part) => reduce.includes(`::view-transition-${part}(*)`)),
  'the reduced-motion block covers ::view-transition-group/old/new(*)',
)
const reduceRules = [...reduce.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
check(
  reduceRules.length > 0 &&
    reduce.replace(/([^{}]+)\{([^{}]*)\}/g, '').trim() === '' &&
    reduceRules.every(
      ([, selectors, body]) =>
        selectors.split(',').every((sel) => /^::view-transition-(group|old|new)\(\*\)$/.test(sel.trim())) &&
        body
          .split(';')
          .map((decl) => decl.trim())
          .filter(Boolean)
          .every((decl) => /^animation-(duration|delay)\s*:\s*0s\s*!important$/.test(decl)),
    ) &&
    /animation-duration\s*:\s*0s/.test(reduce),
  'the reduced-motion block only sets animation-duration / animation-delay to 0s on view-transition pseudos',
)
check(
  !/\banimation(-name)?\s*:/.test(reduce) && !/@keyframes/.test(reduce),
  'the reduced-motion block has no animation / animation-name / @keyframes',
)
const inside = guards.join('\n')
check(/\banimation(-name)?\s*:/.test(inside), 'the guarded block contains the animation declarations')
check(/@keyframes/.test(inside), 'the guarded block contains the keyframes')
check(/::view-transition-old\(\.page-out\)/.test(inside), 'page-out exit rule exists')
check(/::view-transition-new\(\.page-in\)/.test(inside), 'page-in enter rule exists')
check(/::view-transition-group\(site-header\)/.test(inside), 'site-header anchor rule exists')
check(/::view-transition\s*\{[^}]*pointer-events:\s*none/.test(outside), '::view-transition passes pointer events through')
check(/\.cascade-word\s*\{[^}]*display:\s*inline-block/.test(outside), '.cascade-word is inline-block')

// WebKit (iPhone Safari) paints filtered text on the CPU: animating `filter: blur()` on the words
// is choppy and snaps when the filter is removed at the end. The default cascade is opacity + rise
// only; the blur is an enhancement for devices with a fine pointer and hover.
const FINE_POINTER = /@media\s+\(\s*hover\s*:\s*hover\s*\)\s+and\s+\(\s*pointer\s*:\s*fine\s*\)\s*\{/g
const {blocks: finePointers, rest: insideDefault} = split(inside, FINE_POINTER)
check(!/\bfilter\s*:/.test(insideDefault), 'no `filter` animation outside a (hover: hover) and (pointer: fine) block')
check(finePointers.length === 1, `exactly one (hover: hover) and (pointer: fine) block inside the guard (found ${finePointers.length})`)
check(
  /@keyframes\s+cascade-in-blur/.test(finePointers.join('\n')) && /\bfilter\s*:\s*blur\(/.test(finePointers.join('\n')),
  'the blur keyframes live in the fine-pointer block',
)

const tokens: Record<string, string> = {
  '--motion-duration': '800ms',
  '--motion-ease': 'cubic-bezier(.22,1,.36,1)',
  '--cascade-step': '45ms',
  '--cascade-rise': '.4em',
  '--cascade-blur': '6px',
  '--page-out-duration': '180ms',
  '--page-in-duration': '280ms',
}
for (const [name, value] of Object.entries(tokens)) {
  const found = new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(css)?.[1].replace(/\s+/g, '')
  check(found === value, `${name} is ${value}${found ? ` (got ${found})` : ' (missing)'}`)
}

if (failed) process.exit(1)
console.log('motion.css ok')

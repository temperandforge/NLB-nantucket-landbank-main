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

// A hero description cascades word by word like the headline, but quicker and without the blur
// (up to ~50 small blurred words is the expensive case on iPhone Safari).
check(
  /\.cascade-body\s+\.cascade-word\s*\{[^}]*animation-name\s*:\s*cascade-in\s*;/.test(inside) &&
    /\.cascade-body\s+\.cascade-word\s*\{[^}]*animation-delay\s*:[^;]*--cascade-body-offset[^;]*--cascade-step-body/.test(inside),
  'the body cascade uses the plain cascade-in keyframes and its own offset and step',
)

// Whole-page enter. The first two page blocks animate their parts on a timer (data-enter="load");
// every later block animates them as they scroll into view (data-enter="scroll", CSS scroll-driven
// animations, no JS). A *part* is the outermost heading / paragraph / image / list item / button;
// the selector below is long and must stay IDENTICAL in each mode and in the draft-mode rule, so
// this pins it.
const flat = inside.replace(/\s+/g, ' ')
const PARTS = ':is(h1,h2,h3,h4,h5,h6,p,img,picture,figure,blockquote,ul>li,ol>li,.button,[data-part])'
const SEL = `${PARTS}:not(${PARTS} ${PARTS}):not(:has(.cascade-word)):not(.load-in):not([aria-hidden="true"]):not([aria-hidden="true"] *):not([data-morph] *)`
check(flat.split(SEL).length - 1 === 3, `the parts selector appears exactly 3 times, identically (load, scroll, draft) (found ${flat.split(SEL).length - 1})`)
check(flat.includes(`[data-enter="load"] ${SEL} {`), 'a load rule animates the parts of data-enter="load" blocks')
const supportsOpen = /@supports\s*\(\s*animation-timeline\s*:\s*view\(\)\s*\)\s*\{/g
const {blocks: supports} = split(inside, supportsOpen)
check(supports.length === 1, `exactly one @supports (animation-timeline: view()) block inside the guard (found ${supports.length})`)
const scrollRule = supports.join('\n').replace(/\s+/g, ' ')
check(scrollRule.includes(`[data-enter="scroll"] ${SEL} {`), 'the scroll rule lives inside @supports and targets data-enter="scroll"')
const scrollBody = /\[data-enter="scroll"\][^{]*\{([^}]*)\}/.exec(scrollRule)?.[1] ?? ''
check(
  /animation-timeline\s*:\s*view\(\)/.test(scrollBody) && /animation-range\s*:/.test(scrollBody) && !/\banimation\s*:/.test(scrollBody),
  'the scroll layer uses the longhands (animation-timeline: view(), animation-range), never the animation shorthand',
)
check(
  new RegExp(`:root\\[data-draft\\] \\[data-enter\\] ${SEL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{[^}]*animation\\s*:\\s*none`).test(flat),
  'Studio Presentation (html[data-draft]) turns the part animations off',
)
check(/:is\(img,\s*picture,\s*figure\)\s*\{[^}]*--part-anim\s*:\s*part-fade/.test(inside), 'images, pictures and figures fade only (no movement)')
// Above the fold, an image is usually the LCP element. Starting it at opacity 0 delays the paint the
// browser measures, so images on the load layer do not animate at all (below the fold they fade).
check(
  /\[data-enter="load"\]\s+:is\(img,\s*picture,\s*figure\)\s*\{[^}]*--part-anim\s*:\s*none/.test(inside),
  'images on the load layer do not animate (they are the LCP element)',
)
check(
  /\[data-enter\]\s+:nth-child\(2\)\s*\{[^}]*--n\s*:\s*1/.test(inside) && /\[data-enter\]\s+:nth-child\(n\s*\+\s*7\)\s*\{[^}]*--n\s*:\s*6/.test(inside),
  'sibling stagger index --n is set by :nth-child and capped at 6',
)

const tokens: Record<string, string> = {
  '--enter-rise': '14px',
  '--enter-step': '70ms',
  '--enter-base-0': '120ms',
  '--enter-base-1': '360ms',
  '--enter-scroll-step': '6%',
  '--cascade-step-body': '10ms',
  '--cascade-body-offset': '240ms',
  '--motion-duration': '450ms',
  '--motion-ease': 'cubic-bezier(.33,1,.68,1)',
  '--cascade-step': '30ms',
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

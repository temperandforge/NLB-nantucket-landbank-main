/**
 * Verifies the fluid typography and spacing tokens. There is no test framework, so this is a plain
 * script:
 *
 *   cd frontend && node scripts/verifyFluidTokens.mts
 *
 * Every `clamp(...)` custom property in tokens.css and ui.css must use the portable form
 *   clamp(MIN, calc(MIN + DIFF * (100vw - 375px) / 1065), MAX)
 * where DIFF is the unitless pixel difference between MAX and MIN. Dividing one length by another
 * (`(100vw - 375px) / 1065px`) needs CSS typed arithmetic, which older browsers lack: there the
 * whole property is invalid, headings fall back to body size and section padding to zero.
 *
 * It also checks the maths: the value is MIN at 375px and MAX at 1440px. Exits non-zero on failure.
 */
import {readFileSync} from 'node:fs'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const PORTABLE =
  /^\s*(--[\w-]+):\s*clamp\(\s*([\d.]+)rem\s*,\s*calc\(\s*\2rem\s*\+\s*([\d.]+)\s*\*\s*\(100vw - 375px\)\s*\/\s*1065\s*\)\s*,\s*([\d.]+)rem\s*\)/

let total = 0
for (const file of ['css/tokens.css', 'css/ui.css']) {
  const lines = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').split('\n')
  for (const line of lines) {
    if (!/^\s*--(text|spacing)-[\w-]+:\s*clamp\(/.test(line)) continue
    total += 1
    const m = PORTABLE.exec(line)
    const name = line.trim().split(':')[0]
    if (!m) {
      check(false, `${file}: ${name} uses the portable form`)
      continue
    }
    const min = Number(m[2]) * 16
    const diff = Number(m[3])
    const max = Number(m[4]) * 16
    check(Math.abs(min + diff - max) < 0.01, `${file}: ${name} reaches its max at 1440px (${min} + ${diff} = ${max})`)
  }
}
// 3 display + 5 headline sizes in tokens.css, 9 section spacings in ui.css.
check(total === 17, `found every fluid token (${total} of 17)`)

if (failed) process.exit(1)

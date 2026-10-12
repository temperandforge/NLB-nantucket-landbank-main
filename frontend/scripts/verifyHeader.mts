/**
 * Verifies the header's scroll rules and the banner's dismissal key:
 *
 *   cd frontend && node scripts/verifyHeader.mts
 *
 * Imports the real helpers. Exits non-zero on the first failure.
 */
import {bannerKey, readDismissed, writeDismissed} from '../components/header/bannerDismissal.ts'
import {nextHeaderScroll, type HeaderScrollState} from '../components/header/headerScroll.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}

const at = (hidden: boolean, lastY: number): HeaderScrollState => ({hidden, lastY})
const free = (y: number) => ({y, locked: false})

check(nextHeaderScroll(at(false, 0), free(300)).hidden === true, 'scrolling down past the top hides it')
check(nextHeaderScroll(at(true, 300), free(250)).hidden === false, 'scrolling up reveals it')
check(nextHeaderScroll(at(true, 300), free(40)).hidden === false, 'near the top it is always shown')
check(nextHeaderScroll(at(true, 300), free(-30)).hidden === false, 'rubber-banding above the top shows it')
check(nextHeaderScroll(at(false, 300), free(304)).hidden === false, 'a small downward jitter does not hide it')
check(nextHeaderScroll(at(true, 300), free(296)).hidden === true, 'a small upward jitter does not reveal it')
check(nextHeaderScroll(at(false, 300), free(304)).lastY === 300, 'jitter keeps the anchor so drift accumulates')
check(nextHeaderScroll(at(false, 100), {y: 500, locked: true}).hidden === false, 'locked (menu open or focus inside) never hides')
check(nextHeaderScroll(at(true, 100), {y: 500, locked: true}).hidden === false, 'locked reveals a hidden header')
check(nextHeaderScroll(at(false, 0), free(300)).lastY === 300, 'a real move updates the anchor')

check(bannerKey('Welcome') === bannerKey('Welcome'), 'the same message gives the same key')
check(bannerKey('Welcome') === bannerKey('  Welcome  '), 'surrounding whitespace is ignored')
check(bannerKey('Welcome') !== bannerKey('Welcome back'), 'a changed message gives a new key')

// Storage that throws (private window, blocked site data) must not break the banner.
const blocked = {
  getItem() {
    throw new Error('blocked')
  },
  setItem() {
    throw new Error('blocked')
  },
}
Object.defineProperty(globalThis, 'localStorage', {value: blocked, configurable: true})
check(readDismissed('k') === false, 'a throwing localStorage reads as not dismissed')
let threw = false
try {
  writeDismissed('k')
} catch {
  threw = true
}
check(threw === false, 'a throwing localStorage does not throw on write')

const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (k: string) => memory.get(k) ?? null,
    setItem: (k: string, v: string) => void memory.set(k, v),
  },
  configurable: true,
})
check(readDismissed('k') === false, 'nothing stored reads as not dismissed')
writeDismissed('k')
check(readDismissed('k') === true, 'a stored dismissal reads back')

process.exit(failed ? 1 : 0)

/**
 * Verifies the date helpers. There is no test framework, so this is a plain script:
 *
 *   cd frontend && node scripts/verifyDates.mts
 *
 * Imports the real helpers, not a copy. Everything is shown in America/New_York whatever time zone
 * this machine runs in. Exits non-zero on failure.
 */
import {
  currentHour,
  eventParts,
  formatDate,
  SITE_TIME_ZONE,
} from '../sanity/lib/dates.ts'

let failed = false
function check(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ok   ${message}`)
  } else {
    console.error(`  FAIL ${message}`)
    failed = true
  }
}
function same(actual: unknown, expected: unknown, message: string) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  check(ok, ok ? message : `${message}: got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)}`)
}

check(SITE_TIME_ZONE === 'America/New_York', 'the site time zone is New York')

// Articles and commissioners use Sanity `date` values (no time), so there is no zone to shift.
same(formatDate('2026-08-02'), '08/02/2026', 'formats a date as MM/DD/YYYY')
same(formatDate('2026-08-02T03:00:00Z'), '08/02/2026', 'ignores any time part')
same(formatDate(''), '', 'an empty date is empty')
same(formatDate(null), '', 'a null date is empty')
same(formatDate('2026-13-40'), '', 'an impossible date is empty')
same(formatDate('not a date'), '', 'a non-date is empty')

// 14:30Z on 4 Aug 2026 is 10:30 in New York (EDT, UTC-4).
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-04T19:00:00.000Z'),
  {weekday: 'Tue', day: '04', month: 'Aug 2026', time: '10:30 am - 3:00 pm'},
  'a same-day event shows its parts and time range',
)
same(
  eventParts('2026-08-04T14:30:00.000Z')?.time,
  '10:30 am',
  'an event with no end shows only the start time',
)
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-04T14:30:00.000Z')?.time,
  '10:30 am',
  'an end equal to the start is ignored',
)
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-04T10:00:00.000Z')?.time,
  '10:30 am',
  'an end before the start is ignored',
)
// 03:30Z on 5 Aug is 23:30 on 4 Aug in New York: the day must be the New York day.
same(
  eventParts('2026-08-05T03:30:00.000Z')?.day,
  '04',
  'the day is the New York day, not the UTC day',
)
same(
  eventParts('2026-08-04T14:30:00.000Z', '2026-08-05T19:00:00.000Z')?.time,
  '10:30 am - Aug 5, 3:00 pm',
  'a multi-day event names the end date',
)
// 15:30Z on 4 Dec 2026 is 10:30 in New York (EST, UTC-5).
same(
  eventParts('2026-12-04T15:30:00.000Z')?.time,
  '10:30 am',
  'winter (standard) time is handled',
)
same(eventParts('nonsense'), null, 'an invalid start is null')
same(eventParts(null), null, 'a missing start is null')
same(eventParts('2026-08-04T14:30:00.000Z', 'nonsense')?.time, '10:30 am', 'an invalid end is ignored')

// The "upcoming" query takes the current hour as a parameter, so its fetch cache key changes every
// hour. Without that, the cached response (fetched with no expiry) would outlive the page's own
// hourly revalidation and a past event would never drop off.
same(
  currentHour(new Date('2026-08-04T14:59:59.999Z')),
  '2026-08-04T14:00:00.000Z',
  'the current hour is the start of the hour',
)
same(
  currentHour(new Date('2026-08-04T14:00:00.000Z')),
  currentHour(new Date('2026-08-04T14:59:59.999Z')),
  'the value is stable within an hour',
)
check(
  currentHour(new Date('2026-08-04T14:59:59.999Z')) !== currentHour(new Date('2026-08-04T15:00:00.000Z')),
  'the value changes when the hour changes',
)

if (failed) process.exit(1)

/** Everything the site shows is in this zone, whatever zone the server runs in. */
export const SITE_TIME_ZONE = 'America/New_York'

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * The start of the current hour, as an ISO string. The events query takes it as `$now`, so its
 * fetch cache key changes every hour: the fetch is cached with no expiry (next-sanity), so without
 * this the cached answer would outlive the page's own hourly revalidation and a past event would
 * never drop off. An event is therefore up to an hour late leaving the list.
 */
export function currentHour(now: Date = new Date()): string {
  const hour = new Date(now)
  hour.setUTCMinutes(0, 0, 0)
  return hour.toISOString()
}

function parseDate(value: string | null | undefined) {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [, year, month, day] = match
  if (Number(month) < 1 || Number(month) > 12 || Number(day) < 1 || Number(day) > 31) return null
  return {year, month, day}
}

/** "08/02/2026" from a Sanity `date` (YYYY-MM-DD). Pure string handling, so no zone can shift it. */
export function formatDate(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? `${date.month}/${date.day}/${date.year}` : ''
}

/** "August 2019" from a Sanity `date`. */
export function formatMonthYear(value: string | null | undefined): string {
  const date = parseDate(value)
  return date ? `${MONTHS[Number(date.month) - 1]} ${date.year}` : ''
}

function part(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', {timeZone: SITE_TIME_ZONE, ...options}).format(date)
}

function clock(date: Date) {
  // "10:30 AM" -> "10:30 am"
  return part(date, {hour: 'numeric', minute: '2-digit', hour12: true}).replace(
    /\s?(AM|PM)$/,
    (_, meridiem: string) => ` ${meridiem.toLowerCase()}`,
  )
}

function calendarDay(date: Date) {
  return part(date, {year: 'numeric', month: '2-digit', day: '2-digit'})
}

/**
 * The pieces an event tile shows, in the site time zone. An end that is missing, invalid, or not
 * after the start is ignored. A multi-day event names its end date, so "3:00 pm" is never
 * ambiguous. Null when the start is missing or invalid.
 */
export function eventParts(start: string | null | undefined, end?: string | null) {
  if (!start) return null
  const startDate = new Date(start)
  if (Number.isNaN(startDate.getTime())) return null

  let endDate: Date | null = end ? new Date(end) : null
  if (endDate && (Number.isNaN(endDate.getTime()) || endDate.getTime() <= startDate.getTime())) {
    endDate = null
  }

  let time = clock(startDate)
  if (endDate) {
    time +=
      calendarDay(endDate) === calendarDay(startDate)
        ? ` - ${clock(endDate)}`
        : ` - ${part(endDate, {month: 'short', day: 'numeric'})}, ${clock(endDate)}`
  }

  return {
    weekday: part(startDate, {weekday: 'short'}),
    day: part(startDate, {day: '2-digit'}),
    month: `${part(startDate, {month: 'short'})} ${part(startDate, {year: 'numeric'})}`,
    time,
  }
}

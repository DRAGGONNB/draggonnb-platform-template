import { formatInTimeZone } from 'date-fns-tz'

const SA_TZ = 'Africa/Johannesburg'

/**
 * Formats a UTC timestamp as the user-facing reset display.
 *
 * USAGE-04 spec: "exact reset date/time in tenant timezone".
 * v3.0 hardcodes Africa/Johannesburg (single-country deployment); future i18n
 * can swap on a tenant locale field.
 *
 * Format: 'd MMMM at HH:mm SAST'   e.g.   '1 May at 00:00 SAST'
 */
export function formatResetTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return formatInTimeZone(d, SA_TZ, "d MMMM 'at' HH:mm 'SAST'")
}

/**
 * Returns the start-of-next-month timestamp in Africa/Johannesburg as a UTC Date.
 * Used as the default reset target for monthly usage caps.
 *
 * Logic:
 * - Compute the SA-local "current" year/month from `now`.
 * - First-of-next-month at 00:00:00 SAST is constructed as `+02:00` (SA has no DST).
 * - The returned Date is that instant in UTC (e.g. 30 April 22:00Z == 1 May 00:00 SAST).
 */
export function nextMonthlyResetUTC(now: Date = new Date()): Date {
  const ymd = formatInTimeZone(now, SA_TZ, 'yyyy-MM-dd')
  const [y, m] = ymd.split('-').map(Number)
  const next =
    m === 12
      ? `${y + 1}-01-01T00:00:00+02:00`
      : `${y}-${String(m + 1).padStart(2, '0')}-01T00:00:00+02:00`
  return new Date(next)
}

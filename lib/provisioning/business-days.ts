import { toZonedTime } from 'date-fns-tz'
import { addDays, isWeekend, getHours, format } from 'date-fns'

const SA_TZ = 'Africa/Johannesburg'
const CUTOFF_HOUR = 17 // 17:00 SAST

/**
 * Returns the business day on which the onboarding timer should start.
 * Rule: signups Mon-Thu before 17:00 SAST -> today.
 *       Fri or weekday after 17:00 SAST -> next Monday.
 *       Sat/Sun -> next Monday.
 * Result is a YYYY-MM-DD date (no time component) in SA timezone.
 */
export function computeTimerStartDay(signupAt: Date = new Date()): string {
  let saTime = toZonedTime(signupAt, SA_TZ)

  // If after cutoff hour, push to next day
  if (getHours(saTime) >= CUTOFF_HOUR) {
    saTime = addDays(saTime, 1)
  }
  // Skip weekends
  while (isWeekend(saTime)) {
    saTime = addDays(saTime, 1)
  }
  return format(saTime, 'yyyy-MM-dd')
}

/**
 * Adds N business days (Mon-Fri only, no public holidays in v3.0) to a YYYY-MM-DD date.
 */
export function addBusinessDays(startDay: string, businessDays: number): string {
  let d = new Date(startDay + 'T00:00:00')
  let added = 0
  while (added < businessDays) {
    d = addDays(d, 1)
    if (!isWeekend(d)) added++
  }
  return format(d, 'yyyy-MM-dd')
}

import { describe, expect, it } from 'vitest'
import { formatResetTimestamp, nextMonthlyResetUTC } from '@/lib/usage/format-reset'

describe('formatResetTimestamp', () => {
  it('formats SA-local midnight as "1 May at 00:00 SAST"', () => {
    const sastMidnight = new Date('2026-05-01T00:00:00+02:00')
    expect(formatResetTimestamp(sastMidnight)).toBe('1 May at 00:00 SAST')
  })

  it('treats UTC 22:00 the night before as the same SA-local moment', () => {
    // UTC + 2 → SAST midnight
    const utc = new Date('2026-04-30T22:00:00Z')
    expect(formatResetTimestamp(utc)).toBe('1 May at 00:00 SAST')
  })

  it('accepts an ISO string input and returns the same SAST formatting', () => {
    expect(formatResetTimestamp('2026-04-30T22:00:00Z')).toBe('1 May at 00:00 SAST')
  })

  it('formats an arbitrary mid-month SA-local time correctly', () => {
    // 15 June 09:30 SAST == 15 June 07:30 UTC
    const d = new Date('2026-06-15T07:30:00Z')
    expect(formatResetTimestamp(d)).toBe('15 June at 09:30 SAST')
  })

  it('keeps SA timezone stable across DST boundaries (SA observes no DST)', () => {
    // North-hemisphere DST roll-forward (last Sunday of March in EU). SA is unaffected.
    // 27 March 2026 02:00 UTC === 04:00 SAST.
    const d = new Date('2026-03-27T02:00:00Z')
    expect(formatResetTimestamp(d)).toBe('27 March at 04:00 SAST')
  })
})

describe('nextMonthlyResetUTC', () => {
  it('returns 1 May 00:00 SAST (== 30 Apr 22:00 UTC) when called late in April', () => {
    const lateApril = new Date('2026-04-26T10:00:00Z')
    const next = nextMonthlyResetUTC(lateApril)
    expect(next.toISOString()).toBe('2026-04-30T22:00:00.000Z')
  })

  it('rolls into next year when called in December (SA local)', () => {
    // 15 December 2026 SA-local — both UTC and SA agree on the date.
    const midDec = new Date('2026-12-15T08:00:00Z')
    const next = nextMonthlyResetUTC(midDec)
    expect(next.toISOString()).toBe('2026-12-31T22:00:00.000Z')
  })

  it('returns a 1st-of-month at midnight SAST when displayed', () => {
    const someDate = new Date('2026-08-10T12:00:00Z')
    const next = nextMonthlyResetUTC(someDate)
    expect(formatResetTimestamp(next)).toBe('1 September at 00:00 SAST')
  })

  it('handles a UTC instant whose SA-local date is in the next calendar month', () => {
    // 30 April 23:00 UTC === 1 May 01:00 SAST → SA "now" is already in May → reset should be 1 June.
    const utcLateApril = new Date('2026-04-30T23:00:00Z')
    const next = nextMonthlyResetUTC(utcLateApril)
    expect(formatResetTimestamp(next)).toBe('1 June at 00:00 SAST')
  })
})

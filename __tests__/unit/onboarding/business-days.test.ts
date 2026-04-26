/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import { computeTimerStartDay, addBusinessDays } from '@/lib/provisioning/business-days'

/**
 * All times are parsed as UTC and converted to Africa/Johannesburg (UTC+2).
 * SAST = UTC + 2 hours.
 */

describe('computeTimerStartDay', () => {
  it('Mon 10:00 SAST (08:00 UTC) -> today (Mon)', () => {
    // 2026-04-27 is a Monday
    const signup = new Date('2026-04-27T08:00:00Z') // 10:00 SAST
    expect(computeTimerStartDay(signup)).toBe('2026-04-27')
  })

  it('Mon 18:00 SAST (16:00 UTC) -> next day (Tue)', () => {
    const signup = new Date('2026-04-27T16:00:00Z') // 18:00 SAST
    expect(computeTimerStartDay(signup)).toBe('2026-04-28')
  })

  it('Fri 16:00 SAST (14:00 UTC) -> Friday (before cutoff)', () => {
    // 2026-05-01 is a Friday
    const signup = new Date('2026-05-01T14:00:00Z') // 16:00 SAST
    expect(computeTimerStartDay(signup)).toBe('2026-05-01')
  })

  it('Fri 18:00 SAST (16:00 UTC) -> next Monday', () => {
    const signup = new Date('2026-05-01T16:00:00Z') // 18:00 SAST on Friday
    // After cutoff -> push to Sat -> weekend -> skip to Mon 2026-05-04
    expect(computeTimerStartDay(signup)).toBe('2026-05-04')
  })

  it('Sat 10:00 SAST (08:00 UTC) -> next Monday', () => {
    // 2026-05-02 is a Saturday
    const signup = new Date('2026-05-02T08:00:00Z') // 10:00 SAST
    expect(computeTimerStartDay(signup)).toBe('2026-05-04')
  })

  it('Sun 23:00 SAST (21:00 UTC) -> next Monday', () => {
    // 2026-05-03 is a Sunday
    const signup = new Date('2026-05-03T21:00:00Z') // 23:00 SAST — past cutoff but still weekend
    // past cutoff -> push to Mon
    expect(computeTimerStartDay(signup)).toBe('2026-05-04')
  })
})

describe('addBusinessDays', () => {
  it('Mon + 1 business day = Tue', () => {
    // 2026-04-27 is Monday
    expect(addBusinessDays('2026-04-27', 1)).toBe('2026-04-28')
  })

  it('Thu + 2 business days = Mon (skips weekend)', () => {
    // 2026-04-30 is Thursday; +1 = Fri, +2 = Mon 2026-05-04
    expect(addBusinessDays('2026-04-30', 2)).toBe('2026-05-04')
  })

  it('Fri + 1 business day = Mon', () => {
    // 2026-05-01 is Friday; +1 skips Sat/Sun -> Mon 2026-05-04
    expect(addBusinessDays('2026-05-01', 1)).toBe('2026-05-04')
  })

  it('Mon + 5 business days = Mon (full week)', () => {
    // 2026-04-27 Mon + 5 = 2026-05-04 Mon
    expect(addBusinessDays('2026-04-27', 5)).toBe('2026-05-04')
  })
})

/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import { isOverFortyPctMrrFlag, computeMarginPct } from '@/lib/admin/cost-monitoring'

describe('USAGE-11 40% MRR flag formula', () => {
  it('NOT flagged: cost = 0 with MRR = 0 (zero-activity free org)', () => {
    expect(isOverFortyPctMrrFlag(0, 0)).toBe(false)
  })

  it('NOT flagged: cost = 0 with positive MRR (no AI spend)', () => {
    expect(isOverFortyPctMrrFlag(0, 100000)).toBe(false)
  })

  it('NOT flagged: cost = 30% of MRR (well within threshold)', () => {
    expect(isOverFortyPctMrrFlag(30000, 100000)).toBe(false)
  })

  it('NOT flagged: cost EXACTLY 40% of MRR (strict greater-than, not >=)', () => {
    expect(isOverFortyPctMrrFlag(40000, 100000)).toBe(false)
  })

  it('FLAGGED: cost = 41% of MRR (just above threshold)', () => {
    expect(isOverFortyPctMrrFlag(41000, 100000)).toBe(true)
  })

  it('FLAGGED: cost > 0 with MRR = 0 (any AI cost on free org is a flag)', () => {
    expect(isOverFortyPctMrrFlag(100, 0)).toBe(true)
  })

  it('FLAGGED: cost > 0 with negative MRR (defensive: treated as free org)', () => {
    expect(isOverFortyPctMrrFlag(1, -500)).toBe(true)
  })

  it('NOT flagged: negative cost with MRR = 0 (defensive: no positive spend)', () => {
    expect(isOverFortyPctMrrFlag(-100, 0)).toBe(false)
  })

  it('FLAGGED: cost = R1,500 against MRR = R1,199 (real-world scale tier overage)', () => {
    // R1,199 MRR * 0.40 = R479.60 threshold; R1,500 > R479.60
    expect(isOverFortyPctMrrFlag(150000, 119900)).toBe(true)
  })
})

describe('computeMarginPct', () => {
  it('returns 80% margin when cost is 20% of MRR', () => {
    expect(computeMarginPct(20000, 100000)).toBeCloseTo(80)
  })

  it('returns 0 when MRR is 0 (avoids divide-by-zero)', () => {
    expect(computeMarginPct(100, 0)).toBe(0)
  })

  it('returns 0 when MRR is negative (defensive)', () => {
    expect(computeMarginPct(100, -500)).toBe(0)
  })

  it('returns negative margin when cost exceeds MRR', () => {
    expect(computeMarginPct(150000, 100000)).toBeCloseTo(-50)
  })

  it('returns 100% margin when cost is 0', () => {
    expect(computeMarginPct(0, 100000)).toBeCloseTo(100)
  })
})

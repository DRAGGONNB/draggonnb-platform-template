/**
 * Unit tests for lib/ai/cost-ceiling.ts
 *
 * Verifies:
 * - TIER_CEILING_ZAR_CENTS constants are correct
 * - checkCostCeiling throws when MTD + projected > ceiling
 * - checkCostCeiling passes when MTD + projected <= ceiling
 * - Tier-specific behaviour: core, growth, scale, platform_admin
 * - CostCeilingExceededError has correct fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TIER_CEILING_ZAR_CENTS, CostCeilingExceededError, checkCostCeiling } from '@/lib/ai/cost-ceiling'

// ============================================================================
// MOCK SUPABASE + PAYFAST
// ============================================================================

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: mockFrom,
    rpc: mockRpc,
  }),
}))

vi.mock('@/lib/payments/payfast', () => ({
  getCanonicalTierName: (tier: string) => {
    const map: Record<string, string> = {
      starter: 'core',
      professional: 'growth',
      enterprise: 'scale',
      core: 'core',
      growth: 'growth',
      scale: 'scale',
      platform_admin: 'platform_admin',
    }
    return map[tier] ?? tier
  },
}))

// Helper to set up mock responses
function setupMocks(planId: string, mtdSpend: number) {
  // mock from('organizations').select('plan_id').eq('id', ...).single()
  const singleFn = vi.fn().mockResolvedValue({ data: { plan_id: planId }, error: null })
  const eqFn = vi.fn().mockReturnValue({ single: singleFn })
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
  mockFrom.mockReturnValue({ select: selectFn })

  // mock rpc('get_month_to_date_ai_cost', ...)
  mockRpc.mockResolvedValue({ data: mtdSpend, error: null })
}

// ============================================================================
// CEILING CONSTANTS
// ============================================================================

describe('TIER_CEILING_ZAR_CENTS', () => {
  it('core ceiling is 15000 ZAR cents (R150)', () => {
    expect(TIER_CEILING_ZAR_CENTS.core).toBe(15_000)
  })

  it('growth ceiling is 40000 ZAR cents (R400)', () => {
    expect(TIER_CEILING_ZAR_CENTS.growth).toBe(40_000)
  })

  it('scale ceiling is 150000 ZAR cents (R1500)', () => {
    expect(TIER_CEILING_ZAR_CENTS.scale).toBe(150_000)
  })

  it('platform_admin ceiling is Number.MAX_SAFE_INTEGER (unlimited)', () => {
    expect(TIER_CEILING_ZAR_CENTS.platform_admin).toBe(Number.MAX_SAFE_INTEGER)
  })
})

// ============================================================================
// CostCeilingExceededError
// ============================================================================

describe('CostCeilingExceededError', () => {
  it('is an Error subclass with correct name and fields', () => {
    const err = new CostCeilingExceededError('org-1', 14_000, 2_000, 15_000)
    expect(err).toBeInstanceOf(Error)
    expect(err.name).toBe('CostCeilingExceededError')
    expect(err.orgId).toBe('org-1')
    expect(err.mtdSpendCents).toBe(14_000)
    expect(err.projectedCents).toBe(2_000)
    expect(err.ceilingCents).toBe(15_000)
    expect(err.message).toContain('org-1')
    expect(err.message).toContain('15000')
  })
})

// ============================================================================
// checkCostCeiling
// ============================================================================

describe('checkCostCeiling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('CORE: MTD 14000 + projected 2000 = 16000 > 15000 ceiling → throws', async () => {
    setupMocks('core', 14_000)
    await expect(checkCostCeiling('org-1', 2_000)).rejects.toBeInstanceOf(
      CostCeilingExceededError
    )
  })

  it('CORE: MTD 14000 + projected 500 = 14500 < 15000 ceiling → passes', async () => {
    setupMocks('core', 14_000)
    await expect(checkCostCeiling('org-1', 500)).resolves.toBeUndefined()
  })

  it('CORE: MTD 14000 + projected 1000 = 15000 = ceiling → passes (equal, not over)', async () => {
    setupMocks('core', 14_000)
    await expect(checkCostCeiling('org-1', 1_000)).resolves.toBeUndefined()
  })

  it('CORE: MTD 14000 + projected 1001 = 15001 > 15000 → throws', async () => {
    setupMocks('core', 14_000)
    await expect(checkCostCeiling('org-1', 1_001)).rejects.toBeInstanceOf(
      CostCeilingExceededError
    )
  })

  it('GROWTH: MTD 39500 + projected 600 > 40000 ceiling → throws', async () => {
    setupMocks('growth', 39_500)
    await expect(checkCostCeiling('org-2', 600)).rejects.toBeInstanceOf(
      CostCeilingExceededError
    )
  })

  it('GROWTH: MTD 39500 + projected 500 = 40000 → passes', async () => {
    setupMocks('growth', 39_500)
    await expect(checkCostCeiling('org-2', 500)).resolves.toBeUndefined()
  })

  it('SCALE: MTD 140000 + projected 20000 = 160000 > 150000 → throws', async () => {
    setupMocks('scale', 140_000)
    await expect(checkCostCeiling('org-3', 20_000)).rejects.toBeInstanceOf(
      CostCeilingExceededError
    )
  })

  it('SCALE: MTD 140000 + projected 9000 = 149000 → passes (generous ceiling)', async () => {
    setupMocks('scale', 140_000)
    await expect(checkCostCeiling('org-3', 9_000)).resolves.toBeUndefined()
  })

  it('PLATFORM_ADMIN: never throws even at extremely high spend', async () => {
    setupMocks('platform_admin', Number.MAX_SAFE_INTEGER - 1)
    await expect(checkCostCeiling('org-admin', 1)).resolves.toBeUndefined()
  })

  it('legacy tier alias starter → core ceiling applied correctly', async () => {
    setupMocks('starter', 14_000) // plan_id='starter' → canonical 'core'
    await expect(checkCostCeiling('org-4', 2_000)).rejects.toBeInstanceOf(
      CostCeilingExceededError
    )
  })

  it('legacy tier alias professional → growth ceiling applied correctly', async () => {
    setupMocks('professional', 39_000) // plan_id='professional' → canonical 'growth'
    await expect(checkCostCeiling('org-5', 2_000)).rejects.toBeInstanceOf(
      CostCeilingExceededError
    )
  })

  it('error has correct ceiling and spend values', async () => {
    setupMocks('core', 14_000)
    try {
      await checkCostCeiling('org-6', 2_000)
      expect.fail('Should have thrown')
    } catch (e) {
      expect(e).toBeInstanceOf(CostCeilingExceededError)
      const err = e as CostCeilingExceededError
      expect(err.ceilingCents).toBe(15_000)
      expect(err.mtdSpendCents).toBe(14_000)
      expect(err.projectedCents).toBe(2_000)
    }
  })
})

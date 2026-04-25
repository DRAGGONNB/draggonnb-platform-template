/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { compose } from '@/lib/billing/composition'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/billing/plans', () => ({
  getPlan: vi.fn(),
}))

vi.mock('@/lib/billing/addons-catalog', () => ({
  getAddon: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ error: null }),
  })),
}))

import { getPlan } from '@/lib/billing/plans'
import { getAddon } from '@/lib/billing/addons-catalog'

const MOCK_CORE_PLAN = {
  id: 'core',
  display_name: 'Core',
  description: null,
  price_zar: 150000,
  frequency: 'monthly' as const,
  is_active: true,
  sort_order: 1,
  features: [],
  limits: {},
  payfast_item_code: 'DRG-CORE',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
}

const MOCK_FINANCE_AI_ADDON = {
  id: 'finance_ai',
  display_name: 'Finance AI',
  description: null,
  kind: 'module' as const,
  price_zar_cents: 39900,
  billing_cycle: 'monthly' as const,
  quantity_unit: null,
  quantity_value: null,
  min_tier: null,
  is_active: true,
  sort_order: 1,
  payfast_item_code: 'ADDON-FINANCE-AI',
}

const MOCK_SETUP_FEE_ADDON = {
  id: 'setup_fee',
  display_name: 'Setup Fee',
  description: null,
  kind: 'setup_fee' as const,
  price_zar_cents: 149900,
  billing_cycle: 'one_off' as const,
  quantity_unit: null,
  quantity_value: null,
  min_tier: null,
  is_active: true,
  sort_order: 99,
  payfast_item_code: 'DRG-SETUP-FEE',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('compose()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('compose(core, []) returns 1 line item with monthly_total = 150000 cents', async () => {
    vi.mocked(getPlan).mockResolvedValue({ data: MOCK_CORE_PLAN, error: null })
    vi.mocked(getAddon).mockResolvedValue(null)

    const result = await compose('core', [])

    expect(result.base_plan_id).toBe('core')
    expect(result.addon_ids).toEqual([])
    expect(result.line_items).toHaveLength(1)
    expect(result.line_items[0].kind).toBe('base_plan')
    expect(result.monthly_total_zar_cents).toBe(150000)
    expect(result.setup_fee_zar_cents).toBe(0)
  })

  it('compose(core, [finance_ai]) returns 2 line items and monthly_total = 189900 cents', async () => {
    vi.mocked(getPlan).mockResolvedValue({ data: MOCK_CORE_PLAN, error: null })
    vi.mocked(getAddon).mockResolvedValue(MOCK_FINANCE_AI_ADDON)

    const result = await compose('core', ['finance_ai'])

    expect(result.line_items).toHaveLength(2)
    expect(result.monthly_total_zar_cents).toBe(150000 + 39900) // 189900
    expect(result.setup_fee_zar_cents).toBe(0)
  })

  it('compose(core, [finance_ai], { includeSetupFee: true }) adds setup_fee line item', async () => {
    vi.mocked(getPlan).mockResolvedValue({ data: MOCK_CORE_PLAN, error: null })
    vi.mocked(getAddon).mockImplementation(async (id) => {
      if (id === 'finance_ai') return MOCK_FINANCE_AI_ADDON
      if (id === 'setup_fee') return MOCK_SETUP_FEE_ADDON
      return null
    })

    const result = await compose('core', ['finance_ai'], { includeSetupFee: true })

    expect(result.line_items).toHaveLength(3)
    expect(result.setup_fee_zar_cents).toBe(149900)
    // setup_fee is one_off, so monthly_total should NOT include it
    expect(result.monthly_total_zar_cents).toBe(189900)
    const setupItem = result.line_items.find(li => li.kind === 'setup_fee')
    expect(setupItem).toBeDefined()
    expect(setupItem!.billing_cycle).toBe('one_off')
  })

  it('compose with unknown base plan throws', async () => {
    vi.mocked(getPlan).mockResolvedValue({ data: null, error: 'Not found' })

    await expect(compose('nonexistent', [])).rejects.toThrow('[compose] Unknown base plan: nonexistent')
  })

  it('compose with unknown addon throws', async () => {
    vi.mocked(getPlan).mockResolvedValue({ data: MOCK_CORE_PLAN, error: null })
    vi.mocked(getAddon).mockResolvedValue(null)

    await expect(compose('core', ['bad_addon_id'])).rejects.toThrow('[compose] Unknown addon: bad_addon_id')
  })

  it('compose with setup_fee in addon_ids does NOT double-count (silently skipped, handled via options)', async () => {
    vi.mocked(getPlan).mockResolvedValue({ data: MOCK_CORE_PLAN, error: null })
    vi.mocked(getAddon).mockImplementation(async (id) => {
      if (id === 'setup_fee') return MOCK_SETUP_FEE_ADDON
      return null
    })

    // setup_fee in addon_ids + includeSetupFee: true — should appear exactly once
    const result = await compose('core', ['setup_fee'], { includeSetupFee: true })

    const setupItems = result.line_items.filter(li => li.kind === 'setup_fee')
    expect(setupItems).toHaveLength(1)
    // monthly total should only be base plan (setup_fee is one_off)
    expect(result.monthly_total_zar_cents).toBe(150000)
    expect(result.setup_fee_zar_cents).toBe(149900)
  })
})

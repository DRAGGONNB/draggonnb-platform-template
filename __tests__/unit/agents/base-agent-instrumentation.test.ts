/**
 * Unit tests for BaseAgent instrumentation (Phase 09 rewrites)
 *
 * Verifies:
 * - Default model is Haiku 4.5 (ERR-029 fix)
 * - Sonnet on Core tier → silently downgraded to Haiku (USAGE-12)
 * - ai_usage_ledger INSERT called with computed cost on success
 * - CostCeilingExceededError causes ledger row with error='aborted_ceiling: %' + re-throw
 * - agent_sessions UPDATE includes all 6 new cost columns (migration 25)
 * - system accepts both string and SystemBlock[] (Phase 10 prep)
 */

import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { MODEL_IDS, DEFAULT_MODEL } from '@/lib/ai/model-registry'
import { CostCeilingExceededError } from '@/lib/ai/cost-ceiling'

// Provide a fake API key so getAnthropicClient() doesn't throw during unit tests.
// The Anthropic SDK class itself is mocked below — no real API calls are made.
process.env.ANTHROPIC_API_KEY = 'sk-test-unit-test-key-not-real'

// ============================================================================
// MOCKS
// ============================================================================

// Tracking arrays for audit — cleared in beforeEach
const insertedRows: unknown[] = []
const updatedRows: unknown[] = []

// Factory for a chainable Supabase builder from a given table
function makeTableMock(table: string) {
  function single(cols: string) {
    if (table === 'organizations') {
      return Promise.resolve({ data: { plan_id: 'core' }, error: null })
    }
    if (table === 'agent_sessions') {
      if (cols.includes('id')) {
        // Creating new session — return id
        return Promise.resolve({ data: { id: 'test-session-id' }, error: null })
      }
      // Reading existing session cost columns
      return Promise.resolve({
        data: {
          tokens_used: 0,
          messages: [],
          input_tokens: null,
          output_tokens: null,
          cache_read_tokens: null,
          cache_write_tokens: null,
          cost_zar_cents: null,
        },
        error: null,
      })
    }
    return Promise.resolve({ data: null, error: null })
  }

  function makeEqChain(cols: string) {
    const eqFn = (col: string, val: string) => ({
      single: () => single(cols),
      gte: () => ({ limit: () => Promise.resolve({ data: [], error: null }) }),
      eq: (col2: string, val2: string) => makeEqChain(cols),
    })
    return { single: () => single(cols), eq: eqFn }
  }

  return {
    insert: (row: unknown) => {
      insertedRows.push(row)
      // Return chainable builder that supports .select().single()
      return {
        select: (cols: string) => ({
          single: () => single(cols),
        }),
        // Also support direct await (for ledger insert which doesn't chain)
        then: (resolve: (v: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      }
    },
    update: (row: unknown) => {
      updatedRows.push(row)
      return {
        eq: () => Promise.resolve({ data: null, error: null }),
      }
    },
    select: (cols: string) => ({
      eq: (col: string, val: string) => makeEqChain(cols),
    }),
  }
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeTableMock(table),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
}))

// Mock cost ceiling — default to passing
const mockCheckCostCeiling = vi.fn().mockResolvedValue(undefined)
vi.mock('@/lib/ai/cost-ceiling', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/cost-ceiling')>()
  return {
    ...actual,
    checkCostCeiling: (...args: Parameters<typeof actual.checkCostCeiling>) =>
      mockCheckCostCeiling(...args),
    projectCost: vi.fn().mockReturnValue(100), // 100 cents projected
  }
})

// Mock Anthropic SDK
const mockMessagesCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockMessagesCreate }
  },
}))

// Mock payfast for getCanonicalTierName
vi.mock('@/lib/payments/payfast', () => ({
  getCanonicalTierName: (tier: string) => {
    const map: Record<string, string> = {
      starter: 'core', professional: 'growth', enterprise: 'scale',
      core: 'core', growth: 'growth', scale: 'scale', platform_admin: 'platform_admin',
    }
    return map[tier] ?? tier
  },
}))

// ============================================================================
// TEST AGENT
// ============================================================================

// Import AFTER mocks are set up
import { BaseAgent } from '@/lib/agents/base-agent'
import type { AgentConfig } from '@/lib/agents/types'

class TestAgent extends BaseAgent {
  constructor(config?: Partial<AgentConfig>) {
    super({
      agentType: 'lead_qualifier',
      systemPrompt: 'You are a test agent.',
      ...config,
    })
  }

  protected parseResponse(response: string): unknown {
    return { raw: response }
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function makeAnthropicResponse(overrides: {
  model?: string
  inputTokens?: number
  outputTokens?: number
  cacheRead?: number
  cacheWrite?: number
}) {
  return {
    id: 'msg_test_123',
    model: overrides.model ?? MODEL_IDS.HAIKU_4_5,
    content: [{ type: 'text', text: 'Test response' }],
    usage: {
      input_tokens: overrides.inputTokens ?? 100,
      output_tokens: overrides.outputTokens ?? 50,
      cache_read_input_tokens: overrides.cacheRead ?? 0,
      cache_creation_input_tokens: overrides.cacheWrite ?? 0,
    },
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('BaseAgent default model (ERR-029 fix)', () => {
  it('DEFAULT_MODEL export is Haiku 4.5', () => {
    expect(DEFAULT_MODEL).toBe(MODEL_IDS.HAIKU_4_5)
    expect(DEFAULT_MODEL).toBe('claude-haiku-4-5-20251001')
  })

  it('agent instantiated with no model uses Haiku (not Sonnet)', () => {
    const agent = new TestAgent()
    // Access protected config to verify model
    const config = (agent as unknown as { config: AgentConfig }).config
    expect(config.model).toBe(MODEL_IDS.HAIKU_4_5)
    expect(config.model).not.toContain('sonnet')
  })
})

describe('BaseAgent ledger instrumentation on success', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckCostCeiling.mockResolvedValue(undefined)
    // Reset tracking arrays
    insertedRows.length = 0
    updatedRows.length = 0
  })

  it('inserts ai_usage_ledger row with computed cost on success', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeAnthropicResponse({ inputTokens: 1_000, outputTokens: 200 })
    )

    const agent = new TestAgent()
    await agent.run({ organizationId: 'org-test', input: 'Hello' })

    // Ledger row has cost_zar_cents
    const ledgerRow = insertedRows.find((r) => r && typeof r === 'object' && 'cost_zar_cents' in r) as Record<string, unknown>

    expect(ledgerRow).toBeDefined()
    expect(ledgerRow.organization_id).toBe('org-test')
    expect(ledgerRow.agent_type).toBe('lead_qualifier')
    expect(ledgerRow.model).toBe(MODEL_IDS.HAIKU_4_5)
    expect(ledgerRow.input_tokens).toBe(1_000)
    expect(ledgerRow.output_tokens).toBe(200)
    expect(ledgerRow.cost_zar_cents).toBeGreaterThan(0)
    expect(ledgerRow.error).toBeNull()
    expect(ledgerRow.was_retry).toBe(false)
    expect(ledgerRow.request_id).toBe('msg_test_123')
  })

  it('ledger row includes cache token fields', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeAnthropicResponse({
        inputTokens: 2_000,
        outputTokens: 100,
        cacheRead: 500,
        cacheWrite: 300,
      })
    )

    const agent = new TestAgent()
    await agent.run({ organizationId: 'org-test', input: 'Hello cached' })

    const ledgerRow = insertedRows.find((r) => r && typeof r === 'object' && 'cache_read_tokens' in r) as Record<string, unknown>
    expect(ledgerRow).toBeDefined()
    expect(ledgerRow.cache_read_tokens).toBe(500)
    expect(ledgerRow.cache_write_tokens).toBe(300)
  })

  it('agent_sessions UPDATE includes all 6 cost columns (migration 25)', async () => {
    mockMessagesCreate.mockResolvedValue(
      makeAnthropicResponse({ inputTokens: 100, outputTokens: 50 })
    )

    const agent = new TestAgent()
    await agent.run({ organizationId: 'org-test', input: 'Hello' })

    // Find the UPDATE row that has cost columns
    const updateRow = updatedRows.find((r) => r && typeof r === 'object' && 'input_tokens' in r && 'cost_zar_cents' in r) as Record<string, unknown>

    expect(updateRow).toBeDefined()
    expect(updateRow).toHaveProperty('input_tokens')
    expect(updateRow).toHaveProperty('output_tokens')
    expect(updateRow).toHaveProperty('cache_read_tokens')
    expect(updateRow).toHaveProperty('cache_write_tokens')
    expect(updateRow).toHaveProperty('cost_zar_cents')
    expect(updateRow).toHaveProperty('model')
    expect(updateRow.model).toBe(MODEL_IDS.HAIKU_4_5)
  })
})

describe('BaseAgent Sonnet downgrade on Core tier (USAGE-12)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckCostCeiling.mockResolvedValue(undefined)
    insertedRows.length = 0
    updatedRows.length = 0
  })

  it('Core org requesting Sonnet receives Haiku in ledger row (silent downgrade)', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    mockMessagesCreate.mockImplementation((params: { model: string }) => {
      // Verify the actual API call uses Haiku
      expect(params.model).toBe(MODEL_IDS.HAIKU_4_5)
      return Promise.resolve(makeAnthropicResponse({ model: params.model }))
    })

    // Agent explicitly requests Sonnet — but org is core tier
    const agent = new TestAgent({ model: MODEL_IDS.SONNET_4_6 })
    await agent.run({ organizationId: 'org-core', input: 'Please use Sonnet' })

    // Warning should have been logged
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('downgrading to')
    )

    warnSpy.mockRestore()
  })
})

describe('BaseAgent CostCeilingExceededError handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    insertedRows.length = 0
    updatedRows.length = 0
  })

  it('writes abort ledger row with error LIKE aborted_ceiling: % and re-throws', async () => {
    const ceilErr = new CostCeilingExceededError('org-test', 14_000, 2_000, 15_000)
    mockCheckCostCeiling.mockRejectedValue(ceilErr)

    const agent = new TestAgent()

    await expect(
      agent.run({ organizationId: 'org-test', input: 'This will be blocked' })
    ).rejects.toBeInstanceOf(CostCeilingExceededError)

    // Find the abort ledger insert
    const abortRow = insertedRows.find(
      (r) => r && typeof r === 'object' && typeof (r as Record<string, unknown>).error === 'string' &&
        ((r as Record<string, unknown>).error as string).startsWith('aborted_ceiling:')
    ) as Record<string, unknown>

    expect(abortRow).toBeDefined()
    expect(abortRow.cost_zar_cents).toBe(0)
    expect(abortRow.was_retry).toBe(false)
    expect(abortRow.error).toMatch(/^aborted_ceiling:/)
    expect(abortRow.input_tokens).toBe(0)
    expect(abortRow.output_tokens).toBe(0)
  })
})

describe('BaseAgent system field widening (Phase 10 prep)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckCostCeiling.mockResolvedValue(undefined)
    insertedRows.length = 0
    updatedRows.length = 0
  })

  it('accepts string system prompt and passes to Anthropic SDK', async () => {
    let capturedSystem: unknown
    mockMessagesCreate.mockImplementation((params: { system: unknown }) => {
      capturedSystem = params.system
      return Promise.resolve(makeAnthropicResponse({}))
    })

    const agent = new TestAgent({ systemPrompt: 'String system prompt' })
    await agent.run({ organizationId: 'org-test', input: 'Hello' })

    // Normalised to array of blocks
    expect(Array.isArray(capturedSystem)).toBe(true)
    expect((capturedSystem as Array<{ text: string }>)[0].text).toBe('String system prompt')
  })
})

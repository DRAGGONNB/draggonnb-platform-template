/** @vitest-environment node */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          id: 'msg_test',
          content: [{ type: 'text', text: '{"score": 8, "tier": "growth"}' }],
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 0,
            cache_creation_input_tokens: 0,
          },
        }),
      },
    })),
  }
})

// Phase 09 addition: getCanonicalTierName is called by BaseAgent for tier resolution
vi.mock('@/lib/payments/payfast', () => ({
  getCanonicalTierName: (tier: string) => {
    const map: Record<string, string> = {
      starter: 'core', professional: 'growth', enterprise: 'scale',
      core: 'core', growth: 'growth', scale: 'scale', platform_admin: 'platform_admin',
    }
    return map[tier] ?? tier
  },
}))

// Phase 09 addition: cost ceiling is checked pre-call; default to passing
vi.mock('@/lib/ai/cost-ceiling', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/cost-ceiling')>()
  return {
    ...actual,
    checkCostCeiling: vi.fn().mockResolvedValue(undefined),
    projectCost: vi.fn().mockReturnValue(10),
  }
})

// ============================================================================
// Helper: build a complete Supabase mock that handles all tables the rewritten
// BaseAgent touches: agent_sessions, organizations, ai_usage_ledger.
// ============================================================================

function buildSupabaseMock(overrides: {
  sessionInsertData?: Record<string, unknown>
  sessionSelectData?: Record<string, unknown>
  agentSessionsUpdate?: ReturnType<typeof vi.fn>
  returnEmptyForNonSessions?: boolean
} = {}) {
  const {
    sessionInsertData = { id: 'new-session-id' },
    sessionSelectData = {
      tokens_used: 0,
      messages: [],
      input_tokens: null,
      output_tokens: null,
      cache_read_tokens: null,
      cache_write_tokens: null,
      cost_zar_cents: null,
    },
    agentSessionsUpdate = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  } = overrides

  return {
    from: vi.fn((table: string) => {
      if (table === 'organizations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: { plan_id: 'core' }, error: null }),
            })),
          })),
        }
      }
      if (table === 'ai_usage_ledger') {
        return {
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }
      if (table === 'client_profiles') {
        // loadBrandVoice() in BaseAgent queries this table for brand_voice_prompt.
        // Return null data (no brand voice configured) — tests that need brand voice
        // can override createAdminClient per-test.
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        }
      }
      if (table === 'agent_sessions') {
        return {
          insert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: sessionInsertData, error: null }),
            })),
          })),
          update: agentSessionsUpdate,
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn().mockResolvedValue({ data: sessionSelectData, error: null }),
            })),
          })),
        }
      }
      return {}
    }),
  }
}

describe('BaseAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-api-key')
  })

  it('creates a new session when no sessionId provided', async () => {
    const insertMock = vi.fn().mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-session-id' },
          error: null,
        }),
      })),
    })

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock({ sessionInsertData: { id: 'new-session-id' } }) as any
    )

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    // Create a concrete subclass
    class TestAgent extends BaseAgent {
      constructor() {
        super({
          agentType: 'lead_qualifier',
          systemPrompt: 'You are a test agent.',
        })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    const result = await agent.run({
      input: 'Test input',
      organizationId: 'test-org',
    })

    expect(result.sessionId).toBe('new-session-id')
    expect(result.response).toBeDefined()
    expect(result.tokensUsed).toBeGreaterThan(0)
    expect(result.status).toBe('completed')
  })

  it('resumes existing session with message history', async () => {
    const existingMessages = [
      { role: 'user', content: 'Previous input', timestamp: '2026-01-01T00:00:00Z' },
      { role: 'assistant', content: 'Previous response', timestamp: '2026-01-01T00:01:00Z', tokens: 100 },
    ]

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock({
        sessionSelectData: {
          messages: existingMessages,
          tokens_used: 100,
          input_tokens: null,
          output_tokens: null,
          cache_read_tokens: null,
          cache_write_tokens: null,
          cost_zar_cents: null,
        },
      }) as any
    )

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super({ agentType: 'lead_qualifier', systemPrompt: 'Test' })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    const result = await agent.run({
      input: 'Follow-up input',
      sessionId: 'existing-session-id',
    })

    expect(result.sessionId).toBe('existing-session-id')
    // Total tokens should include existing (100) + new (100 input + 50 output = 150)
    expect(result.tokensUsed).toBe(250)
  })

  it('marks session as failed on error', async () => {
    const updateMock: any = vi.fn(() => ({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }))

    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock({ agentSessionsUpdate: updateMock }) as any
    )

    // Make Anthropic client throw
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: {
        create: vi.fn().mockRejectedValue(new Error('API error')),
      },
    }) as any)

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super({ agentType: 'lead_qualifier', systemPrompt: 'Test' })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    await expect(agent.run({ input: 'Test' })).rejects.toThrow('API error')

    // Verify session was marked as failed
    expect(updateMock).toHaveBeenCalledWith({ status: 'failed' })
  })

  it('handles context object in input', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      buildSupabaseMock() as any
    )

    // Reset Anthropic mock to capture messages
    const createMock = vi.fn().mockResolvedValue({
      id: 'msg_ctx',
      content: [{ type: 'text', text: '{"result": "ok"}' }],
      usage: {
        input_tokens: 50,
        output_tokens: 30,
        cache_read_input_tokens: 0,
        cache_creation_input_tokens: 0,
      },
    })
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    vi.mocked(Anthropic).mockImplementation(() => ({
      messages: { create: createMock },
    }) as any)

    const { BaseAgent } = await import('@/lib/agents/base-agent')

    class TestAgent extends BaseAgent {
      constructor() {
        super({ agentType: 'lead_qualifier', systemPrompt: 'Test' })
      }
      protected parseResponse(response: string): unknown {
        return JSON.parse(response)
      }
    }

    const agent = new TestAgent()
    await agent.run({
      input: 'Analyze this',
      context: { company: 'Test Corp', size: 50 },
    })

    // Verify context was included in the message
    const messagesArg = createMock.mock.calls[0][0].messages
    const lastMessage = messagesArg[messagesArg.length - 1]
    expect(lastMessage.content).toContain('Context:')
    expect(lastMessage.content).toContain('Test Corp')
  })
})

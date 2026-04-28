/**
 * Unit tests for CampaignDrafterAgent
 *
 * Brand voice injection happens in BaseAgent.run() → loadBrandVoice() →
 * buildSystemBlocks() — see lib/agents/base-agent.ts:263.
 * These tests focus on parseResponse() only (no Anthropic API calls).
 *
 * Test subclass trick: expose protected parseResponse() for unit testing
 * without mocking the entire BaseAgent.run() machinery.
 */

import { describe, it, expect, vi } from 'vitest'

// ============================================================================
// MODULE MOCKS — must be at top level so Vitest hoists them before imports
// ============================================================================

// Mock env singleton so it doesn't validate real env vars at module load time
vi.mock('@/lib/config/env', () => ({
  env: {
    ANTHROPIC_API_KEY: 'sk-ant-test-key',
    RESEND_API_KEY: 're_test_key',
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-role-test',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
    }),
  }),
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: vi.fn() }
  },
}))

vi.mock('@/lib/payments/payfast', () => ({
  getCanonicalTierName: (tier: string) => tier,
}))

vi.mock('@/lib/ai/cost-ceiling', () => ({
  checkCostCeiling: vi.fn().mockResolvedValue(undefined),
  projectCost: vi.fn().mockReturnValue(10),
  CostCeilingExceededError: class extends Error {},
}))

// ============================================================================
// TESTS
// ============================================================================

import { CampaignDrafterAgent } from '@/lib/campaigns/agent/campaign-drafter'
import type { CampaignDraftResult } from '@/lib/campaigns/agent/campaign-drafter'

// Expose protected parseResponse for testing
class TestableDrafterAgent extends CampaignDrafterAgent {
  public parse(response: string): CampaignDraftResult {
    return this.parseResponse(response) as CampaignDraftResult
  }
}

const VALID_DRAFT: CampaignDraftResult = {
  posts: [
    { channel: 'facebook', bodyText: 'Join us for Sunday brunch!', mediaSuggestions: ['Photo of brunch spread'] },
    { channel: 'facebook', bodyText: 'Alternate: Taste the weekend!', mediaSuggestions: [] },
    { channel: 'instagram', bodyText: 'Sundays are for brunch.', mediaSuggestions: ['Flat lay of mimosas'] },
    { channel: 'instagram', bodyText: 'Alternate: Your Sunday sorted.', mediaSuggestions: [] },
    { channel: 'linkedin', bodyText: 'We are delighted to invite you to our Sunday brunch experience.', mediaSuggestions: [] },
    {
      channel: 'email',
      subject: 'Sunday Brunch Now Available',
      bodyText: 'Dear Guest, We have a special brunch this Sunday...',
      bodyHtml: '<p>Dear Guest,</p><p>We have a special brunch this Sunday...</p>',
      mediaSuggestions: [],
    },
    {
      channel: 'sms',
      bodyText: 'Brunch this Sunday! Book now at draggonnb.co.za/brunch Reply STOP to opt out',
      mediaSuggestions: [],
    },
  ],
}

describe('CampaignDrafterAgent.parseResponse()', () => {
  const agent = new TestableDrafterAgent()

  it('parses valid JSON with 7 posts', () => {
    const result = agent.parse(JSON.stringify(VALID_DRAFT))
    expect(result.posts).toHaveLength(7)
    expect(result.posts[0].channel).toBe('facebook')
    expect(result.posts[5].channel).toBe('email')
    expect(result.posts[5].subject).toBe('Sunday Brunch Now Available')
    expect(result.posts[6].channel).toBe('sms')
  })

  it('strips markdown ```json code fences before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(VALID_DRAFT) + '\n```'
    const result = agent.parse(fenced)
    expect(result.posts).toHaveLength(7)
  })

  it('strips plain ``` fences without language tag', () => {
    const fenced = '```\n' + JSON.stringify(VALID_DRAFT) + '\n```'
    const result = agent.parse(fenced)
    expect(result.posts).toHaveLength(7)
  })

  it('throws on missing posts array', () => {
    const malformed = JSON.stringify({ channels: [] })
    expect(() => agent.parse(malformed)).toThrow(/missing "posts" array/)
  })

  it('throws on invalid JSON', () => {
    expect(() => agent.parse('not json at all')).toThrow(/failed to parse JSON/)
  })
})

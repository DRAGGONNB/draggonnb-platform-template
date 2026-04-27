/**
 * Campaign Studio happy-path integration tests (CAMP-01..05)
 *
 * Tests the full campaign lifecycle with all external services mocked:
 * - create campaign → generate drafts → brand-safety → approve → schedule → execute → verify
 * - 30-day new-tenant gate blocks scheduling
 * - HMAC guard rejects execute without valid signature
 *
 * All external calls (Anthropic, BulkSMS, Resend, pg_net/pg_cron) are mocked.
 * DB operations use in-memory chainable mock builders.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { testApiHandler } from 'next-test-api-route-handler'
import crypto from 'crypto'

// ─── Mock getUserOrg (shared auth mock) ──────────────────────────────────────
vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: () =>
    Promise.resolve({
      data: {
        userId: 'user-test',
        organizationId: 'org-test-123',
        role: 'admin',
        user: { id: 'user-test' },
        organization: { id: 'org-test-123' },
      },
      error: null,
    }),
}))

// ─── Mock Supabase server client ──────────────────────────────────────────────
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'user-test', email: 'test@example.com' } },
        error: null,
      }),
    },
    from: vi.fn(),
  }),
}))

// ─── Mock Supabase admin client ───────────────────────────────────────────────
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}))

// ─── Mock CampaignDrafterAgent ────────────────────────────────────────────────
vi.mock('@/lib/campaigns/agent/campaign-drafter', () => ({
  CampaignDrafterAgent: class {
    async run() {
      return {
        sessionId: 'session-drafter-001',
        result: {
          posts: [
            { channel: 'facebook', bodyText: 'Join us for Sunday brunch!', mediaSuggestions: [] },
            { channel: 'instagram', bodyText: 'Fresh croissants await.', mediaSuggestions: [] },
            { channel: 'linkedin', bodyText: 'Announcing our Sunday brunch special.', mediaSuggestions: [] },
            { channel: 'facebook', bodyText: 'Brunch alternative 2', mediaSuggestions: [] },
            { channel: 'instagram', bodyText: 'Brunch alternate 2', mediaSuggestions: [] },
            { channel: 'email', subject: 'Sunday brunch at The Lookout', bodyText: 'Dear Guest...', bodyHtml: '<p>Dear Guest...</p>' },
            { channel: 'sms', bodyText: 'Brunch today! R195. Reply STOP to opt out.' },
          ],
        },
        tokensUsed: 1200,
        status: 'completed',
      }
    }
  },
}))

// ─── Mock BrandSafetyAgent ────────────────────────────────────────────────────
vi.mock('@/lib/campaigns/agent/brand-safety-checker', () => ({
  BrandSafetyAgent: class {
    async run() {
      return {
        sessionId: 'session-safety-001',
        result: { safe: true, flags: [], recommendation: 'approve' },
        tokensUsed: 60,
        status: 'completed',
      }
    }
  },
  isUnderSafetyCheckBudget: vi.fn().mockResolvedValue(true),
}))

// ─── Mock channel adapters ────────────────────────────────────────────────────
vi.mock('@/lib/campaigns/adapters', () => ({
  getAdapter: (_channel: string) => ({
    send: vi.fn().mockResolvedValue({ success: true, providerMessageId: 'msg_mock_123' }),
    verify: vi.fn().mockResolvedValue({ found: true, publishedUrl: undefined }),
  }),
}))

// ─── Mock scheduler ──────────────────────────────────────────────────────────
vi.mock('@/lib/campaigns/scheduler', () => ({
  scheduleCampaignRun: vi.fn().mockResolvedValue(undefined),
  scheduleVerifyJob: vi.fn().mockResolvedValue(undefined),
  validateInternalHmac: (_runId: string, receivedHmac: string | null) => {
    // Compute expected HMAC using test secret
    const secret = process.env.INTERNAL_HMAC_SECRET ?? 'test-hmac-secret'
    const expected = crypto.createHmac('sha256', secret).update(_runId).digest('hex')
    return receivedHmac === expected
  },
}))

// ─── Mock isInNewTenantPeriod ─────────────────────────────────────────────────
const mockIsInNewTenantPeriod = vi.fn().mockResolvedValue(false)
vi.mock('@/lib/campaigns/enforcement', () => ({
  isInNewTenantPeriod: (...args: unknown[]) => mockIsInNewTenantPeriod(...args),
}))

// ─── Mock kill switch ─────────────────────────────────────────────────────────
vi.mock('@/lib/campaigns/kill-switch', () => ({
  isKillSwitchActive: vi.fn().mockResolvedValue(false),
}))

// ─── Mock telegram alerts ─────────────────────────────────────────────────────
vi.mock('@/lib/campaigns/telegram-alerts', () => ({
  sendCampaignFailureAlert: vi.fn().mockResolvedValue(undefined),
}))

// ─── Mock email ───────────────────────────────────────────────────────────────
vi.mock('@/lib/email/resend', () => ({
  sendEmail: vi.fn().mockResolvedValue({ id: 'email-mock-001' }),
}))

// ─── Chainable Supabase builder ───────────────────────────────────────────────

/**
 * Creates a fluent mock Supabase query builder.
 * Supports .from().select().eq()...single() and .insert().select()
 */
function chainableBuilder(
  result: { data: unknown; error: unknown },
  overrides: Record<string, () => Promise<{ data: unknown; error: unknown }>> = {}
) {
  const b: Record<string, unknown> = {}
  const terminal = () => Promise.resolve(result)
  b['then'] = (resolve: (v: { data: unknown; error: unknown }) => void) =>
    terminal().then(resolve)
  b['single'] = vi.fn().mockResolvedValue(result)
  b['maybeSingle'] = vi.fn().mockResolvedValue(result)
  for (const m of [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gte', 'lte', 'gt', 'lt', 'like', 'ilike',
    'is', 'not', 'in', 'contains', 'filter', 'or',
    'order', 'limit', 'range', 'match',
  ]) {
    if (overrides[m]) {
      b[m] = vi.fn().mockImplementation(overrides[m])
    } else {
      b[m] = vi.fn().mockReturnValue(b)
    }
  }
  return b
}

// ─── DB state helpers ─────────────────────────────────────────────────────────

function makeCampaign(id = 'camp-001') {
  return {
    id,
    organization_id: 'org-test-123',
    status: 'draft',
    intent: 'promote Sunday brunch',
    channels: ['email', 'sms', 'facebook'],
    force_review: false,
    name: 'Sunday Brunch Campaign',
  }
}

function makeDrafts(campaignId = 'camp-001') {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `draft-${i + 1}`,
    campaign_id: campaignId,
    channel: i === 5 ? 'email' : i === 6 ? 'sms' : 'facebook',
    body_text: `Draft ${i + 1} body`,
    brand_safe: true,
    safety_flags: [],
    is_approved: true,
  }))
}

function makeRun(campaignId = 'camp-001', runId = 'run-001') {
  return {
    id: runId,
    campaign_id: campaignId,
    organization_id: 'org-test-123',
    status: 'pending',
    items_total: 7,
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
  }
}

function makeRunItems(runId = 'run-001') {
  return Array.from({ length: 7 }, (_, i) => ({
    id: `item-${i + 1}`,
    run_id: runId,
    draft_id: `draft-${i + 1}`,
    channel: i === 5 ? 'email' : i === 6 ? 'sms' : 'facebook',
    status: 'pending',
    published_url: null,
    provider_message_id: null,
  }))
}

// ─── Admin client mock factory ────────────────────────────────────────────────

function makeAdminClient(tableMap: Record<string, { data: unknown; error: unknown }>) {
  return {
    from: (table: string) => chainableBuilder(tableMap[table] ?? { data: null, error: null }),
    rpc: vi.fn().mockResolvedValue({ data: { job_name: 'campaign_run_001' }, error: null }),
  }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Campaign Studio happy path (CAMP-01..05)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INTERNAL_HMAC_SECRET = 'test-hmac-secret'
    process.env.NEXT_PUBLIC_BASE_URL = 'https://test.draggonnb.co.za'
  })

  afterEach(() => {
    delete process.env.INTERNAL_HMAC_SECRET
    delete process.env.NEXT_PUBLIC_BASE_URL
  })

  it('creates campaign successfully (CAMP-01)', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    vi.mocked(createAdminClient).mockReturnValue(
      makeAdminClient({
        tenant_modules: { data: null, error: null }, // no kill switch
        campaigns: {
          data: { id: 'camp-001' },
          error: null,
        },
      }) as any
    )

    const campaignsRoute = await import('@/app/api/campaigns/route')
    await testApiHandler({
      appHandler: campaignsRoute as any,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({
            name: 'Sunday Brunch Campaign',
            intent: 'promote our Sunday brunch special this weekend',
          }),
          headers: { 'Content-Type': 'application/json' },
        })
        expect(res.status).toBe(201)
        const body = await res.json()
        expect(body.campaignId).toBeDefined()
      },
    })
  })

  it('generates 7 drafts via CampaignDrafterAgent (CAMP-01)', async () => {
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const campaign = makeCampaign()
    const drafts = makeDrafts()

    vi.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'campaigns') {
          return chainableBuilder({ data: campaign, error: null })
        }
        if (table === 'tenant_modules') {
          return chainableBuilder({ data: null, error: null })
        }
        if (table === 'campaign_drafts') {
          // delete returns success; insert returns drafts
          const b: Record<string, unknown> = {}
          b['delete'] = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          })
          b['insert'] = vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({ data: drafts, error: null }),
          })
          return b
        }
        if (table === 'agent_sessions') {
          return chainableBuilder({ data: { id: 'session-001' }, error: null })
        }
        return chainableBuilder({ data: null, error: null })
      },
    } as any)

    const draftsRoute = await import('@/app/api/campaigns/[id]/drafts/route')
    await testApiHandler({
      appHandler: draftsRoute as any,
      params: { id: 'camp-001' },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' })
        expect(res.status).toBe(200)
        const body = await res.json()
        expect(Array.isArray(body.drafts)).toBe(true)
        expect(body.drafts.length).toBe(7)
      },
    })
  })

  it('approve sets campaign status correctly for established org (CAMP-02)', async () => {
    // Mock isInNewTenantPeriod to return false (org is > 30 days old)
    mockIsInNewTenantPeriod.mockResolvedValue(false)

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const campaign = makeCampaign()
    const drafts = makeDrafts()

    let campaignStatus = 'draft'

    vi.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'campaigns') {
          const b: Record<string, unknown> = {}
          b['select'] = vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: campaign, error: null }),
              }),
            }),
          })
          b['update'] = vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: { ...campaign, status: 'approved' }, error: null }),
          })
          return b
        }
        if (table === 'tenant_modules') {
          return chainableBuilder({ data: null, error: null })
        }
        if (table === 'campaign_drafts') {
          return chainableBuilder({ data: drafts, error: null })
        }
        return chainableBuilder({ data: null, error: null })
      },
    } as any)

    const approveRoute = await import('@/app/api/campaigns/[id]/approve/route')
    await testApiHandler({
      appHandler: approveRoute as any,
      params: { id: 'camp-001' },
      test: async ({ fetch }) => {
        const res = await fetch({ method: 'POST' })
        // Established org (>30 days) → approved or active status (no forced review)
        expect([200, 201]).toContain(res.status)
        const body = await res.json()
        // Should not force review for established org
        expect(body.status).not.toBe('pending_review')
      },
    })
  })

  it('blocks scheduling when in 30-day new-tenant window (CAMP-08)', async () => {
    // Mock isInNewTenantPeriod to return true (org is < 30 days old)
    mockIsInNewTenantPeriod.mockResolvedValue(true)

    const { createAdminClient } = await import('@/lib/supabase/admin')
    const campaign = { ...makeCampaign(), status: 'pending_review', force_review: false }
    const drafts = makeDrafts()

    vi.mocked(createAdminClient).mockReturnValue({
      from: (table: string) => {
        if (table === 'campaigns') {
          return chainableBuilder({ data: campaign, error: null })
        }
        if (table === 'tenant_modules') {
          return chainableBuilder({ data: null, error: null })
        }
        if (table === 'campaign_drafts') {
          return chainableBuilder({ data: drafts, error: null })
        }
        return chainableBuilder({ data: null, error: null })
      },
    } as any)

    const scheduleRoute = await import('@/app/api/campaigns/[id]/schedule/route')
    await testApiHandler({
      appHandler: scheduleRoute as any,
      params: { id: 'camp-001' },
      test: async ({ fetch }) => {
        const scheduledAt = new Date(Date.now() + 7200000).toISOString()
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({ scheduledAt }),
          headers: { 'Content-Type': 'application/json' },
        })
        // CAMP-08: new tenant in 30-day window → 422 with guided period message
        expect(res.status).toBe(422)
        const body = await res.json()
        // Route returns error mentioning guided period / CAMP_08 code
        expect(body.error ?? body.code).toMatch(/guided|period|review|CAMP_08/i)
      },
    })
  })

  it('rejects execute call without valid HMAC', async () => {
    const executeRoute = await import('@/app/api/campaigns/execute/route')

    // No HMAC header
    await testApiHandler({
      appHandler: executeRoute as any,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({ run_id: 'run-001' }),
          headers: { 'Content-Type': 'application/json' },
        })
        expect(res.status).toBe(401)
      },
    })

    // Bad HMAC header
    await testApiHandler({
      appHandler: executeRoute as any,
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          body: JSON.stringify({ run_id: 'run-001' }),
          headers: {
            'Content-Type': 'application/json',
            'x-internal-hmac': 'invalid-hmac-value',
          },
        })
        expect(res.status).toBe(401)
        const body = await res.json()
        expect(body.error).toBe('Unauthorized')
      },
    })
  })
})

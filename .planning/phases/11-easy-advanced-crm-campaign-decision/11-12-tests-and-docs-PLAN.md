---
phase: 11
plan_id: 11-12
title: Integration tests + brand-safety regression suite + agent docs updates
wave: 6
depends_on: [11-07, 11-08, 11-09, 11-10, 11-11]
files_modified:
  - __tests__/integration/crm/view-desync.test.ts
  - __tests__/integration/campaigns/happy-path.test.ts
  - __tests__/integration/campaigns/brand-safety-regression.test.ts
  - __tests__/integration/crm/easy-view-action-cards.test.ts
  - __tests__/fixtures/brand-safety/clean-copy.json
  - __tests__/fixtures/brand-safety/insensitive-content.json
  - __tests__/fixtures/brand-safety/off-brand.json
  - __tests__/fixtures/brand-safety/forbidden-topic.json
  - lib/agents/CLAUDE.md
  - app/api/CLAUDE.md
autonomous: true
estimated_loc: 540
estimated_dev_minutes: 130
---

## Objective

Lock down Phase 11 with the four integration tests that prove the success criteria + the documentation updates for the new agent types and API routes. Closes the test-coverage half of UX-06 (the desync test is the literal requirement) and adds Campaign Studio happy-path + brand-safety regression coverage so future regressions are caught. Updates `lib/agents/CLAUDE.md` to register the two new agent types and `app/api/CLAUDE.md` to register the new campaign endpoints.

## must_haves

- `__tests__/integration/crm/view-desync.test.ts` — UX-06 the literal requirement: "edit in Easy → switch to Advanced → see edits → edit more → switch back → no lost state". Two tests minimum (edit-in-easy-visible-in-advanced, switch-roundtrip-preserves-draft).
- `__tests__/integration/crm/easy-view-action-cards.test.ts` — covers the 5s undo flow with `vi.useFakeTimers()`: approve fires after 5s, undo cancels timer, dismiss writes dismissals row.
- `__tests__/integration/campaigns/happy-path.test.ts` — CAMP-01..05 happy path: create campaign → drafts generated (mocked agent) → brand-safety check (mocked) → approve all → schedule → execute (mocked adapter) → verify (mocked adapter) → assert `campaign_run_items.published_url` populated.
- `__tests__/integration/campaigns/brand-safety-regression.test.ts` — fixture-driven cases: known-good copy → safe; known-bad cases (festive-during-mourning, off-brand keyword, forbidden-topic) → flagged with correct `recommendation`. Uses real `BrandSafetyAgent` parseResponse with stubbed BaseAgent response payloads.
- `lib/agents/CLAUDE.md` updated with `campaign_drafter` + `campaign_brand_safety` registered in the existing-agents list.
- `app/api/CLAUDE.md` updated with new campaign endpoints (auth, validation, errors).
- All Phase 10 + earlier tests still pass (no regression). Total test count > 678 (Phase 10 baseline).

## Tasks

<task id="1">
  <title>UX-06 view-desync integration test + Easy view action-cards test</title>
  <files>__tests__/integration/crm/view-desync.test.ts, __tests__/integration/crm/easy-view-action-cards.test.ts</files>
  <actions>
    Read existing integration tests in `__tests__/integration/` to match the project test pattern. Use Vitest with the existing `__tests__` setup.

    **`view-desync.test.ts`** per RESEARCH A section 10:
    Two tests, using a real Supabase test branch OR a `vi.mock`-d Supabase client. Recommend mock for speed.

    Mock setup (place at top of test file — applies to all tests in the describe block):
    ```typescript
    import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest'

    // Stub Supabase admin client used by loadEntityWithDraft
    vi.mock('@/lib/supabase/admin', () => {
      const draftStore = new Map<string, { draft_data: Record<string, any>; last_modified_at: string }>()
      const dbRowStore = new Map<string, Record<string, any>>([
        ['contact-123', { id: 'contact-123', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' }],
      ])
      return {
        createAdminClient: () => ({
          from: (table: string) => ({
            select: () => ({ eq: (_col: string, val: string) => ({ single: () => Promise.resolve({ data: dbRowStore.get(val) ?? null, error: null }), maybeSingle: () => Promise.resolve({ data: draftStore.get(val) ?? null, error: null }) }) }),
            upsert: (row: any) => { draftStore.set(row.entity_id, { draft_data: row.draft_data, last_modified_at: new Date().toISOString() }); return Promise.resolve({ data: row, error: null }) },
            delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
          }),
        }),
        // expose for test inspection
        _draftStore: draftStore,
      }
    })

    // Stub getUserOrg used by API route handlers
    vi.mock('@/lib/auth/get-user-org', () => ({
      getUserOrg: () => Promise.resolve({ data: { user: { id: 'user-456' }, organization: { id: 'org-789' }, role: 'admin' }, error: null }),
    }))

    // Stub global fetch for client-side hook tests
    beforeEach(() => { vi.useFakeTimers(); vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) })) })
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })
    ```

    The two tests then use `// ...` for the actual assertions (the setup above is the load-bearing part):

    ```typescript
    describe('UX-06: view-desync prevention', () => {
      it('edits in Easy view are visible in Advanced view after switch', async () => {
        // 1. Render <ContactEditForm> in "easy" mode with initialDraft=null
        // 2. Simulate user typing in the name field (controlled input)
        // 3. vi.advanceTimersByTime(1000) to fire the debounced POST
        // 4. Assert fetch was called with /api/crm/drafts and body.draftData.first_name === new value
        // 5. Now call loadEntityWithDraft(supabase, 'crm_contacts', 'contact', 'contact-123', 'user-456')
        // 6. Assert returned data has the typed value (draft overlay applied)
      })

      it('switching back to Easy view does not lose unsaved draft', async () => {
        // 1. Pre-seed entity_drafts with a draft for user X, deal Y, draft_data = { name: 'Draft Name' }
        // 2. Render Easy view detail page (RSC) — calls loadEntityWithDraft
        // 3. Assert form initial value is 'Draft Name', not the DB row value
        // 4. Simulate further edit + 1s wait + draft updated again
        // 5. Navigate away (unmount) and back (remount)
        // 6. Assert latest edited value still loaded from entity_drafts
      })
    })
    ```

    **`easy-view-action-cards.test.ts`** per RESEARCH A section 8:
    ```typescript
    describe('Easy view 5s undo flow', () => {
      beforeEach(() => vi.useFakeTimers())
      afterEach(() => vi.useRealTimers())

      it('approve fires API call after 5s undo timer', async () => {
        // Render <ActionCardItem variant='followup' ... /> with a fake fetch
        // Click "Send email" button
        // Assert toast is shown with Undo action
        // vi.advanceTimersByTime(4999) → assert fetch NOT called
        // vi.advanceTimersByTime(2) → assert POST /api/crm/easy-view/approve called once
      })

      it('clicking Undo within 5s prevents API call', async () => {
        // Same setup
        // Click "Send email"
        // Click Undo via toast action within 3s
        // vi.advanceTimersByTime(10000) → assert fetch NEVER called
      })

      it('dismiss writes a 7-day dismissal row', async () => {
        // Click dismiss button → POST /api/crm/easy-view/dismiss called with correct payload
      })
    })
    ```

    Mock fetch with `vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }))`.
  </actions>
  <verification>
    `npm test -- view-desync` passes both tests.
    `npm test -- easy-view-action-cards` passes 3 tests.
    `npm run typecheck` clean.
  </verification>
</task>

<task id="2">
  <title>Campaign Studio happy-path + brand-safety regression integration tests</title>
  <files>__tests__/integration/campaigns/happy-path.test.ts, __tests__/integration/campaigns/brand-safety-regression.test.ts</files>
  <actions>
    **`happy-path.test.ts`** — full CAMP-01..05 cycle with mocked external services:
    ```typescript
    describe('Campaign Studio happy path (CAMP-01..05)', () => {
      // Mock: CampaignDrafterAgent.run returns 7 drafts payload
      // Mock: BrandSafetyAgent.run returns { safe: true, flags: [], recommendation: 'approve' }
      // Mock: getAdapter('email').send returns { success: true, providerMessageId: 'res_123' }
      // Mock: getAdapter('email').verify returns { found: true, publishedUrl: undefined }
      // Mock: getAdapter('sms').send returns { success: true, providerMessageId: 'sms_456' }
      // Mock: scheduleCampaignRun resolves
      // Mock: createAdminClient with stubbed query chain

      it('creates campaign → generates drafts → brand-safety → approves → schedules → executes → verifies', async () => {
        // 1. POST /api/campaigns { intent: 'promote brunch' }
        // 2. POST /api/campaigns/{id}/drafts → assert 7 drafts created
        // 3. For each draft: POST /api/campaigns/{id}/drafts/{draftId}/check-safety → assert brand_safe=true
        // 4. PATCH each draft.is_approved=true (or skip if approve route handles it)
        // 5. POST /api/campaigns/{id}/approve → assert status='pending_review' or 'scheduled' (depending on org age — use a >30-day mock org)
        // 6. POST /api/campaigns/{id}/schedule → assert campaign_run row created
        // 7. Simulate execute hit: POST /api/campaigns/execute with valid HMAC → assert all items.status='sent'
        // 8. Simulate verify hit: POST /api/campaigns/verify with valid HMAC → assert items.status='verified', published_url populated for social
      })

      it('blocks scheduling when in 30-day window', async () => {
        // Mock org.activated_at = 5 days ago
        // POST /api/campaigns/{id}/schedule → assert 422 with explicit error mentioning force_review
      })

      it('rejects execute call without valid HMAC', async () => {
        // POST /api/campaigns/execute without x-internal-hmac → assert 401
        // POST with bad HMAC → assert 401
      })
    })
    ```

    **`brand-safety-regression.test.ts`** — fixture cases:
    ```typescript
    describe('BrandSafetyAgent regression', () => {
      const cases = [
        { name: 'clean copy', input: 'Join us for Sunday brunch — fresh croissants and great coffee!', expectSafe: true, expectRec: 'approve' },
        { name: 'insensitive content', input: 'Surviving load-shedding? Have a beer in the dark!', expectSafe: false, expectRec: 'revise' },  // depends on BrandSafetyAgent prompt accuracy; allow either revise|reject
        { name: 'time-inappropriate festive', input: 'PARTY HARD this weekend!!! Free shots all night!!!', expectSafe: false /* depending on context — fixture is illustrative */ },
        { name: 'forbidden topic example', input: '[politically charged content here]', expectSafe: false, expectRec: 'reject' },
      ]

      // Use parseResponse directly with stubbed Anthropic responses — DO NOT hit real API in CI
      // Fixtures live in __tests__/fixtures/brand-safety/ — JSON files containing raw Claude responses
      it.each(cases)('classifies $name correctly', async ({ name, input, expectSafe }) => {
        // ... assertion via parseResponse on a fixture JSON
      })
    })
    ```

    Note: brand-safety regression is intentionally lenient on `recommendation` exact value because Haiku output varies — the test asserts `safe=false` for known-bad inputs and `safe=true` for known-good. Document this as RESEARCH B section 13 escape hatch in test file header.

    **Fixture JSON shape** (each fixture file holds a SafetyFlagResult-shaped payload that simulates the parsed Claude response):
    ```json
    // __tests__/fixtures/brand-safety/clean-copy.json
    { "safe": true, "flags": [], "recommendation": "approve" }

    // __tests__/fixtures/brand-safety/insensitive-content.json
    { "safe": false, "flags": [{ "type": "insensitive", "reason": "Load-shedding joke during outage", "excerpt": "Surviving load-shedding?..." }], "recommendation": "revise" }

    // __tests__/fixtures/brand-safety/off-brand.json
    { "safe": false, "flags": [{ "type": "off_brand", "reason": "Tone contradicts stated brand voice", "excerpt": "PARTY HARD this weekend!!!" }], "recommendation": "revise" }

    // __tests__/fixtures/brand-safety/forbidden-topic.json
    { "safe": false, "flags": [{ "type": "forbidden_topic", "reason": "Politically charged content", "excerpt": "[redacted]" }], "recommendation": "reject" }
    ```
    The test imports these JSON files and passes them as the raw Claude response to `BrandSafetyAgent.parseResponse()`. Each fixture JSON IS the parsed output shape; the test confirms `parseResponse` correctly handles each.
  </actions>
  <verification>
    `npm test -- campaigns/happy-path` passes 3+ tests.
    `npm test -- brand-safety-regression` passes 4+ tests.
    Total Vitest count post-Phase-11 > 678 (Phase 10 baseline).
  </verification>
</task>

<task id="3">
  <title>Update lib/agents/CLAUDE.md and app/api/CLAUDE.md docs</title>
  <files>lib/agents/CLAUDE.md, app/api/CLAUDE.md</files>
  <actions>
    **`lib/agents/CLAUDE.md`** — add to "Existing Agents" section:
    ```markdown
    ### Campaign Studio Agents (lib/campaigns/agent/)

    Two agents support the Campaign Studio (Phase 11):

    - `CampaignDrafterAgent` (`campaign-drafter.ts`): Receives a campaign intent and the tenant's brand voice
      (auto-injected via BaseAgent.loadBrandVoice), generates 5 social posts + 1 email + 1 SMS as structured JSON.
      Model: Sonnet (default). Closes CAMP-01.
    - `BrandSafetyAgent` (`brand-safety-checker.ts`): Haiku-based safety reviewer. Returns
      `{ safe, flags[], recommendation }`. Hard-pinned to `claude-haiku-4-5-20251001`, temperature 0,
      maxTokens 512. Daily budget 20/tenant tracked in `ai_usage_ledger`. Closes CAMP-07.

    Both register `agentType` values `'campaign_drafter'` and `'campaign_brand_safety'` in
    `lib/agents/types.ts` `AgentType` union.
    ```

    **`app/api/CLAUDE.md`** — add a "Campaign Studio Endpoints" section listing the routes:
    ```markdown
    ### Campaign Studio Endpoints (Phase 11)

    | Route | Method | Purpose | Auth |
    |---|---|---|---|
    | /api/campaigns | POST | Create campaign | user (org member) |
    | /api/campaigns/[id]/drafts | POST | Generate 7 drafts via CampaignDrafterAgent | user |
    | /api/campaigns/[id]/drafts/[draftId]/check-safety | POST | Brand-safety check (Haiku, 20/day budget) | user |
    | /api/campaigns/[id]/drafts/[draftId]/regenerate | POST | Regenerate single draft | user |
    | /api/campaigns/[id]/approve | POST | Approve campaign (gates 30-day enforcement) | user |
    | /api/campaigns/[id]/schedule | POST | Schedule run via pg_cron + pg_net | user |
    | /api/campaigns/execute | POST | Internal — fired by pg_net with HMAC | x-internal-hmac |
    | /api/campaigns/verify | POST | Internal — fires 5min post-send | x-internal-hmac |
    | /api/campaigns/sms-dlr | POST | BulkSMS delivery receipt webhook | webhook (no auth) |
    | /api/admin/campaigns/kill-switch | POST | Emergency stop per org | platform_admin |

    All routes guard against `tenant_modules.config.campaigns.kill_switch_active = true` (returns 423
    when active). Internal routes (`/execute`, `/verify`) validate `x-internal-hmac` header against
    `INTERNAL_HMAC_SECRET` env var.
    ```

    Also add a "CRM Easy view endpoints" section:
    ```markdown
    ### CRM Easy View Endpoints (Phase 11)

    | Route | Method | Purpose |
    |---|---|---|
    | /api/crm/easy-view/approve | POST | Commit one of the 4 ApproveAction variants; writes 1+ crm_activities rows with source='easy_view' |
    | /api/crm/easy-view/dismiss | POST | Hide a card item for 7 days (crm_action_dismissals) |
    | /api/crm/ui-mode | POST | Persist user_profiles.ui_mode |
    | /api/crm/drafts | POST/DELETE | Upsert/delete entity_drafts (1s debounce, 7d TTL) |
    ```
  </actions>
  <verification>
    `grep "campaign_drafter" lib/agents/CLAUDE.md` returns 1+ lines.
    `grep "kill-switch" app/api/CLAUDE.md` returns 1+ lines.
    Manual visual check that doc matches the actually-built routes from Plans 11-07/10/11.
  </verification>
</task>

## Verification

- `npm test` — full suite passes; total > 678 tests.
- `npm run typecheck` clean.
- `npm run build` succeeds.
- All 4 Phase 11 ROADMAP success criteria verifiable manually:
  1. Easy view → 3 cards → 1-click approve → writes to same DB → verify in Advanced (PASS via 11-07 + this test).
  2. Edit in Easy → switch to Advanced → edits visible → switch back → no lost state (PASS via this view-desync test).
  3. ui_mode persists; new=easy, existing=advanced (PASS via 11-07 + 11-08 + this audit).
  4. Campaign intent → 7 drafts in brand voice → approve → publish-confirm shows channel + account name + preview → kill switch available (PASS via 11-10 + 11-11 + this happy-path test).
- Telegram alerts verified by triggering each scenario in test ops chat (manual).

### SC-3 verification note (CONTEXT.md locked decision)

**ROADMAP SC-3** ("new signups default to ui_mode='easy'") is satisfied by the locked design:
- `user_profiles.ui_mode` column is NULLABLE (Plan 11-01 migration 40, intentional escape hatch from OPS-05 step 4).
- `resolveUiMode(null, 'admin')` returns `'easy'` (Plan 11-07 `lib/crm/ui-mode.ts`).
- The DB column stores NULL until the user explicitly toggles via `/api/crm/ui-mode`.
- A post-execution verifier running `SELECT ui_mode FROM user_profiles WHERE created_at > X` will see NULL — this is CORRECT behaviour, not a gap.

Do NOT write a DB column at signup. Do NOT alter the role-default mapping in this plan. The role-default is a render-time function call, not a persisted value.

## Out of scope

- Do NOT add new visual / Lighthouse / mobile-360px sweep tests — those belong to Phase 12 (CONTEXT.md "Deferred").
- Do NOT add OPS-02..04 cron tests (reconciliation, feature-gate audit, token expiry) — Phase 12.
- Do NOT add load tests for kill switch (RESEARCH B section 13 + CONTEXT.md "Deferred").
- Do NOT update STATE.md or ROADMAP.md from this plan — that is the post-execution session-close protocol owned by the executor agent.
- Do NOT add E2E browser tests (Playwright) for Campaign Studio — happy-path here is sufficient at the integration level; full UAT happens via /gsd:verify-work post-phase.

## REQ-IDs closed

- UX-06 (view-desync integration test exists and passes — full closure).
- (Test coverage for) UX-01..07, CAMP-01..08 — formal lock-in of all phase requirements via integration tests.

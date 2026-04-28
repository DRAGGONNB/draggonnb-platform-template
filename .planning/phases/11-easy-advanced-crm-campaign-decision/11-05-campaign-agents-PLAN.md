---
phase: 11
plan_id: 11-05
title: Campaign agents (CampaignDrafterAgent + BrandSafetyAgent extending BaseAgent)
wave: 2
depends_on: [11-02]
files_modified:
  - lib/campaigns/agent/campaign-drafter.ts
  - lib/campaigns/agent/brand-safety-checker.ts
  - lib/campaigns/enforcement.ts
  - __tests__/lib/campaigns/agent/campaign-drafter.test.ts
  - __tests__/lib/campaigns/agent/brand-safety-checker.test.ts
autonomous: true
estimated_loc: 380
estimated_dev_minutes: 90
---

## Objective

Build the two AI agents Campaign Studio needs: `CampaignDrafterAgent` (extends BaseAgent — generates 5 social posts + 1 email + 1 SMS for a given intent, in the tenant's brand voice; brand voice arrives automatically via Phase 10's `buildSystemBlocks()` injection) and `BrandSafetyAgent` (extends BaseAgent — Haiku-based safety review per CAMP-07, returns structured `{ safe, flags[], recommendation }`). Plus the helper `lib/campaigns/enforcement.ts` exporting `isInNewTenantPeriod(orgId): Promise<boolean>` which reads `organizations.activated_at` (returns true for the first 30 days, used by Plan 11-11 schedule-route guard for CAMP-08).

## must_haves

- `CampaignDrafterAgent` extends `BaseAgent` with `agentType: 'campaign_drafter'` (registered in Plan 11-02), uses Sonnet (default), system prompt covers channel templates (FB/IG/LinkedIn ~150-300 words, email ~250 words with subject line, SMS ≤160 chars). Output is JSON `{ posts: [{channel, subject?, bodyText, bodyHtml?, mediaSuggestions?[]}, ...] }`.
- `CampaignDrafterAgent.parseResponse()` handles markdown code-fence stripping (Sonnet sometimes wraps JSON) and validates the response shape (catches malformed JSON, throws to BaseAgent which stores raw response for diagnostics per `lib/agents/CLAUDE.md`).
- Brand voice integration verified: drafter does NOT manually fetch `brand_voice_prompt` — it relies on `BaseAgent.run({ organizationId })` triggering `loadBrandVoice()` → `buildSystemBlocks()` (RESEARCH B section 10 confirms via `lib/agents/base-agent.ts` line 263).
- `BrandSafetyAgent` extends `BaseAgent` with `agentType: 'campaign_brand_safety'`, model overridden to `'claude-haiku-4-5-20251001'`, `temperature: 0`, `maxTokens: 512`. Returns `SafetyFlagResult` with `safe`, `flags[]` (`type` ∈ `off_brand|insensitive|time_inappropriate|forbidden_topic`), `recommendation` ∈ `approve|revise|reject`.
- `BrandSafetyAgent.parseResponse()` strips markdown fences then `JSON.parse`. Throws on parse failure (BaseAgent stores raw).
- `lib/campaigns/enforcement.ts` exports `isInNewTenantPeriod(orgId: string): Promise<boolean>` reading `organizations.activated_at` — returns true if `(NOW - activated_at) < 30 days` OR if `activated_at` is null (defensive — treat unknown as new).
- Tests: drafter parses valid JSON output and rejects malformed; safety agent parses valid JSON and detects each flag type. Both pass.

## Tasks

<task id="1">
  <title>Implement CampaignDrafterAgent + tests</title>
  <files>lib/campaigns/agent/campaign-drafter.ts, __tests__/lib/campaigns/agent/campaign-drafter.test.ts</files>
  <actions>
    Read `lib/agents/base-agent.ts` first to confirm the AgentConfig shape and the `parseResponse` contract. Then create `campaign-drafter.ts`:

    ```typescript
    import { BaseAgent } from '@/lib/agents/base-agent'
    import type { AgentConfig } from '@/lib/agents/types'

    export interface CampaignDraftItem {
      channel: 'email' | 'sms' | 'facebook' | 'instagram' | 'linkedin'
      subject?: string
      bodyText: string
      bodyHtml?: string
      mediaSuggestions?: string[]
    }

    export interface CampaignDraftResult {
      posts: CampaignDraftItem[]
    }

    const CONFIG: AgentConfig = {
      agentType: 'campaign_drafter',
      systemPrompt: `You are a marketing campaign drafter for a small business in South Africa.

    Given an intent (e.g. "promote our Sunday brunch special"), output a complete multi-channel campaign:
    - 5 social posts (1 each for: facebook, instagram, linkedin, plus 2 alternates that the user can pick between for facebook/instagram)
    - 1 email (with subject line, ~250 words)
    - 1 SMS (≤160 characters)

    Channel guidelines:
    - Facebook / Instagram: 150-300 words, conversational, emoji-light, end with a soft CTA
    - LinkedIn: 200-300 words, more professional tone, emphasize value/outcome
    - Email: subject 5-9 words, body ~250 words with greeting, value, offer, CTA
    - SMS: ≤160 chars, no emojis, clear CTA, include "Reply STOP to opt out"

    Output ONLY valid JSON matching this schema:
    {
      "posts": [
        {"channel": "facebook|instagram|linkedin|email|sms", "subject": "string (email only)", "bodyText": "string", "bodyHtml": "string (email only)", "mediaSuggestions": ["string", ...]}
      ]
    }

    Do NOT wrap in markdown fences. Do NOT include any prose before or after the JSON.`,
      // model defaults to Sonnet via BaseAgent
      maxTokens: 4096,
      temperature: 0.7,
    }

    export class CampaignDrafterAgent extends BaseAgent {
      constructor() { super(CONFIG) }

      protected parseResponse(response: string): CampaignDraftResult {
        const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleaned) as CampaignDraftResult
        if (!parsed.posts || !Array.isArray(parsed.posts)) {
          throw new Error('CampaignDrafterAgent: response missing posts array')
        }
        // Light validation — stricter Zod validation can be added later
        return parsed
      }
    }
    ```

    **Tests** in `__tests__/lib/campaigns/agent/campaign-drafter.test.ts`:
    - Mock `BaseAgent.run` (or use the existing test pattern in `__tests__/lib/agents/`).
    - Test 1: `parseResponse` parses valid JSON with 7 posts.
    - Test 2: `parseResponse` strips markdown fences before parsing.
    - Test 3: `parseResponse` throws on missing `posts` array.
    - Test 4: `parseResponse` throws on invalid JSON.

    Brand voice integration is NOT tested here — that's a BaseAgent contract verified in Phase 10. Note in test file header: "Brand voice injection happens in BaseAgent.run() loadBrandVoice() — see lib/agents/base-agent.ts:263."
  </actions>
  <verification>
    `npm test -- campaign-drafter.test.ts` passes (4 tests).
    `npm run typecheck` clean.
    `grep "agentType: 'campaign_drafter'" lib/campaigns/agent/campaign-drafter.ts` returns 1 line.
  </verification>
</task>

<task id="2">
  <title>Implement BrandSafetyAgent (Haiku) + tests</title>
  <files>lib/campaigns/agent/brand-safety-checker.ts, __tests__/lib/campaigns/agent/brand-safety-checker.test.ts</files>
  <actions>
    Per RESEARCH B section 8, create `brand-safety-checker.ts`:

    ```typescript
    import { BaseAgent } from '@/lib/agents/base-agent'
    import type { AgentConfig } from '@/lib/agents/types'

    export type SafetyFlagType = 'off_brand' | 'insensitive' | 'time_inappropriate' | 'forbidden_topic'

    export interface SafetyFlag {
      type: SafetyFlagType
      reason: string
      excerpt: string
    }

    export interface SafetyFlagResult {
      safe: boolean
      flags: SafetyFlag[]
      recommendation: 'approve' | 'revise' | 'reject'
    }

    const CONFIG: AgentConfig = {
      agentType: 'campaign_brand_safety',
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 512,
      temperature: 0,
      systemPrompt: `You are a brand safety reviewer for an SME marketing platform operating in South Africa.

    Your job: evaluate marketing copy for BRAND SAFETY violations only. Do NOT critique tone, grammar, or persuasiveness — those are separate concerns.

    Check for:
    1. OFF_BRAND: Copy contradicts the brand's stated values, tone, or forbidden topics (brand voice arrives in a separate system block)
    2. INSENSITIVE: References events, groups, or situations likely to cause offence in SA context (load-shedding jokes during outages, racial/ethnic stereotyping, religious/political content)
    3. TIME_INAPPROPRIATE: Festive/celebratory content during active public mourning or national tragedy
    4. FORBIDDEN_TOPIC: Explicitly listed forbidden topics appear in the draft

    Output ONLY valid JSON:
    {
      "safe": boolean,
      "flags": [{"type": "off_brand|insensitive|time_inappropriate|forbidden_topic", "reason": "...", "excerpt": "..."}],
      "recommendation": "approve|revise|reject"
    }

    Recommendation rules:
    - "approve": safe=true, no flags
    - "revise": 1-2 minor flags, fixable with targeted edit
    - "reject": content fundamentally inappropriate (hate speech, illegal claims, FORBIDDEN_TOPIC)

    Do NOT wrap output in markdown fences. JSON only.`,
    }

    export class BrandSafetyAgent extends BaseAgent {
      constructor() { super(CONFIG) }

      protected parseResponse(response: string): SafetyFlagResult {
        const cleaned = response.replace(/```json\n?|\n?```/g, '').trim()
        const parsed = JSON.parse(cleaned) as SafetyFlagResult
        if (typeof parsed.safe !== 'boolean' || !Array.isArray(parsed.flags) || !parsed.recommendation) {
          throw new Error('BrandSafetyAgent: malformed response shape')
        }
        return parsed
      }
    }
    ```

    **Tests** in `__tests__/lib/campaigns/agent/brand-safety-checker.test.ts`:
    - Test 1: `parseResponse` parses safe-clear JSON `{ safe: true, flags: [], recommendation: 'approve' }`.
    - Test 2: `parseResponse` parses single flag with type `insensitive`.
    - Test 3: `parseResponse` strips markdown fences.
    - Test 4: `parseResponse` throws on malformed shape (missing `recommendation`).

    Optional: add a daily-budget pre-check function in this file (or defer to API route in 11-10):
    ```typescript
    export async function isUnderSafetyCheckBudget(orgId: string, supabase: SupabaseClient): Promise<boolean> {
      const today = new Date().toISOString().slice(0, 10)
      const { count } = await supabase
        .from('ai_usage_ledger')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .eq('agent_type', 'campaign_brand_safety')
        .gte('created_at', today)
      return (count ?? 0) < 20  // 20/day per RESEARCH B section 8
    }
    ```
    Per RESEARCH section 13 escape hatch: when quota exhausted, allow publishing unchecked drafts WITH banner ("Brand safety check quota reached — proceed at your own discretion?"). Banner UX in Plan 11-10.
  </actions>
  <verification>
    `npm test -- brand-safety-checker.test.ts` passes (4+ tests).
    `npm run typecheck` clean.
    `grep "claude-haiku-4-5" lib/campaigns/agent/brand-safety-checker.ts` returns 1 line (Haiku model locked).
  </verification>
</task>

<task id="3">
  <title>Implement isInNewTenantPeriod() helper for CAMP-08 enforcement</title>
  <files>lib/campaigns/enforcement.ts</files>
  <actions>
    Create `lib/campaigns/enforcement.ts` per RESEARCH B section 9:

    ```typescript
    import { createAdminClient } from '@/lib/supabase/admin'

    /**
     * CAMP-08: First 30 days of a new tenant default to draft-then-review.
     *
     * Returns true if the tenant is within its first 30 days OR if activated_at is null
     * (defensive — unknown activation = treat as new tenant).
     *
     * Read by /api/campaigns/[id]/schedule (Plan 11-11) to coerce status to
     * 'pending_review' regardless of request body when in new-tenant period.
     *
     * Override path: campaigns.force_review = true (set by platform_admin) skips this gate.
     * Note: column name is counter-intuitive — force_review=true means admin has
     * EXPLICITLY OVERRIDDEN the new-tenant restriction for this campaign.
     */
    export async function isInNewTenantPeriod(orgId: string): Promise<boolean> {
      const supabase = createAdminClient()
      const { data, error } = await supabase
        .from('organizations')
        .select('activated_at')
        .eq('id', orgId)
        .single()

      if (error || !data?.activated_at) return true  // unknown = treat as new

      const activatedAt = new Date(data.activated_at as string)
      const daysSince = (Date.now() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)
      return daysSince < 30
    }
    ```

    **Note on `organizations.activated_at`:** Confirm the column exists by `grep -r "activated_at" supabase/migrations/`. If absent, use `created_at` instead (most platforms equate org creation with activation; document the choice in a code comment). Do NOT add a new migration here — defer schema concern to Phase 12 if `activated_at` does not exist.

    No tests required — single-method helper validated by 11-11's schedule-route integration test.
  </actions>
  <verification>
    `npm run typecheck` clean.
    `grep -E "activated_at|created_at" lib/campaigns/enforcement.ts` confirms which column was chosen.
  </verification>
</task>

## Verification

- `npm run typecheck` clean.
- `npm test -- campaigns/agent` passes both agent test files (8+ tests).
- `lib/campaigns/agent/` directory contains 2 agents + tests; no other files leaked.
- BaseAgent contract preserved — both agents only override `parseResponse()`, never `run()`.
- Brand voice contract: `CampaignDrafterAgent` does not import `client_profiles` or read `brand_voice_prompt` — relies on BaseAgent injection.

## Out of scope

- Do NOT call agents from API routes here — that is Plan 11-10 (composer + safety-check endpoints).
- Do NOT add a `safety_check_daily_limit` column to `tenant_modules.config.campaigns` — RESEARCH B section 13 escape hatch documents this for v3.1 if needed.
- Do NOT register a new `campaign_drafter`/`campaign_brand_safety` row in `module_registry` — those are agent types, not modules.
- Do NOT update `lib/agents/CLAUDE.md` here (Plan 11-12 docs task).
- Do NOT build the campaign-runner orchestrator — Plan 11-11 wires the execute endpoint.

## REQ-IDs closed

- (Foundational for) CAMP-01 (drafter generates 5 social + 1 email + 1 SMS using brand voice — brand voice via BaseAgent injection).
- (Foundational for) CAMP-07 (BrandSafetyAgent class — full closure when API route in 11-10 invokes it).
- (Foundational for) CAMP-08 (`isInNewTenantPeriod()` helper — full closure when 11-11's schedule route guards on it).

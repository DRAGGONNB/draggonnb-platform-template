---
phase: 11
plan_id: 11-04
title: Campaign channel adapters (Email Resend, SMS BulkSMS, social mocked)
wave: 2
depends_on: [11-02]
files_modified:
  - lib/campaigns/adapters/types.ts
  - lib/campaigns/adapters/email.ts
  - lib/campaigns/adapters/sms.ts
  - lib/campaigns/adapters/facebook.ts
  - lib/campaigns/adapters/instagram.ts
  - lib/campaigns/adapters/linkedin.ts
  - lib/campaigns/adapters/index.ts
  - lib/config/env.ts
  - __tests__/lib/campaigns/adapters/email.test.ts
  - __tests__/lib/campaigns/adapters/sms.test.ts
autonomous: true
estimated_loc: 520
estimated_dev_minutes: 120
user_setup:
  - service: BulkSMS
    why: SMS gateway for ZA market (CAMP-01 SMS channel)
    env_vars:
      - name: BULKSMS_TOKEN_ID
        source: BulkSMS Console → API → Tokens
      - name: BULKSMS_TOKEN_SECRET
        source: BulkSMS Console → API → Tokens
      - name: BULKSMS_SENDER_ID
        source: BulkSMS Console → Sender IDs (1-5 business day pre-registration required — flag as pre-launch dependency per RESEARCH B section 13)
---

## Objective

Implement the `ChannelAdapter` interface for all 5 Campaign Studio channels. Email (Resend) and SMS (BulkSMS — chosen over SMS Portal/Clickatell/Twilio per RESEARCH B section 1: SA-headquartered, ZAR billing, direct SA SMSC routing, lowest per-message cost) are fully functional. Facebook/Instagram/LinkedIn adapters are credential-gated stubs — `enabled()` returns false absent `META_APP_ID`/`LINKEDIN_CLIENT_ID`, `send()`/`verify()` throw "not yet implemented (credential-gated)" but are kept structurally complete so plan 11-10's UI can render them as greyed-out tiles. Adds `BULKSMS_*` env vars to `lib/config/env.ts` with optional Zod entries.

## must_haves

- `lib/campaigns/adapters/types.ts` exports `ChannelId`, `ChannelAdapter` interface (`enabled()`, `send()`, `verify()`), `CampaignDraftPayload`, `SendResult` (with `success`, `providerMessageId?`, `publishedUrl?`, `error?`, `errorCode?`), `VerifyResult`.
- `EmailAdapter` calls existing `sendEmail()` from `lib/email/resend.ts`; `verify()` calls `GET https://api.resend.com/emails/{id}` and treats `last_event ∈ {delivered, opened, clicked}` as verified.
- `SmsAdapter` posts to `https://api.bulksms.com/v1/messages` with Basic auth from `BULKSMS_TOKEN_ID:BULKSMS_TOKEN_SECRET`, `from = BULKSMS_SENDER_ID || 'DraggonnB'`; `verify()` calls `GET /v1/messages/{id}` and treats `status.type === 'DELIVERED'` as verified.
- `FacebookAdapter` / `InstagramAdapter` / `LinkedInAdapter` `enabled()` returns boolean from env, `send()` and `verify()` throw with explanatory message when not enabled (matching Risk #1 escape pattern in RESEARCH B section 3).
- `getAdapter(channelId)` factory + `getEnabledChannels()` helper exported from `lib/campaigns/adapters/index.ts`.
- `lib/config/env.ts` includes optional `BULKSMS_TOKEN_ID`, `BULKSMS_TOKEN_SECRET`, `BULKSMS_SENDER_ID`, `META_APP_ID`, `LINKEDIN_CLIENT_ID` Zod entries (optional — adapters check at runtime).
- Unit tests for EmailAdapter and SmsAdapter using `vi.mock('global.fetch')` cover success, API error response, and credential-missing branches. Both pass.

## Tasks

<task id="1">
  <title>Define ChannelAdapter interface + factory + env config additions</title>
  <files>lib/campaigns/adapters/types.ts, lib/campaigns/adapters/index.ts, lib/config/env.ts</files>
  <actions>
    **`types.ts`** per RESEARCH B section 3:
    ```typescript
    export type ChannelId = 'email' | 'sms' | 'facebook' | 'instagram' | 'linkedin'

    export interface SendResult {
      success: boolean
      providerMessageId?: string
      publishedUrl?: string   // social channels only
      error?: string
      errorCode?: string
    }

    export interface VerifyResult {
      found: boolean
      publishedUrl?: string
      error?: string
    }

    export interface CampaignDraftPayload {
      bodyText: string
      bodyHtml?: string
      subject?: string
      mediaUrls?: string[]
      recipientRef?: string  // email address, phone number, page_id
      organizationId: string
    }

    export interface ChannelAdapter {
      readonly channelId: ChannelId
      enabled(): boolean
      send(draft: CampaignDraftPayload): Promise<SendResult>
      verify(providerMessageId: string, orgId?: string): Promise<VerifyResult>
    }
    ```

    **`index.ts`** factory:
    ```typescript
    import { EmailAdapter } from './email'
    import { SmsAdapter } from './sms'
    import { FacebookAdapter } from './facebook'
    import { InstagramAdapter } from './instagram'
    import { LinkedInAdapter } from './linkedin'
    import type { ChannelAdapter, ChannelId } from './types'

    const ADAPTERS: Record<ChannelId, ChannelAdapter> = {
      email: new EmailAdapter(),
      sms: new SmsAdapter(),
      facebook: new FacebookAdapter(),
      instagram: new InstagramAdapter(),
      linkedin: new LinkedInAdapter(),
    }

    export function getAdapter(channelId: ChannelId): ChannelAdapter {
      return ADAPTERS[channelId]
    }

    export function getEnabledChannels(): ChannelId[] {
      return (Object.keys(ADAPTERS) as ChannelId[]).filter(id => ADAPTERS[id].enabled())
    }

    export type { ChannelAdapter, ChannelId, SendResult, VerifyResult, CampaignDraftPayload } from './types'
    ```

    **`lib/config/env.ts`** — add the following Zod fields as `.optional()` (do NOT make required; optional = adapter `enabled()` returns false):
    - `BULKSMS_TOKEN_ID: z.string().optional()`
    - `BULKSMS_TOKEN_SECRET: z.string().optional()`
    - `BULKSMS_SENDER_ID: z.string().optional()`
    - `META_APP_ID: z.string().optional()` (probably already present from Phase 05; add only if missing)
    - `LINKEDIN_CLIENT_ID: z.string().optional()` (probably already present; add only if missing)

    Read the existing `env.ts` first to avoid duplication. Add a code comment block above the new fields: `// Phase 11: Campaign Studio. Adapter enabled() checks at runtime — optional here.`
  </actions>
  <verification>
    `npm run typecheck` passes.
    `grep "BULKSMS_TOKEN_ID" lib/config/env.ts` returns 1 line.
    `node -e "console.log(Object.keys(require('./lib/campaigns/adapters').default || require('./lib/campaigns/adapters')))"` shows `getAdapter`, `getEnabledChannels`.
  </verification>
</task>

<task id="2">
  <title>Implement EmailAdapter (Resend) + SmsAdapter (BulkSMS) with unit tests</title>
  <files>lib/campaigns/adapters/email.ts, lib/campaigns/adapters/sms.ts, __tests__/lib/campaigns/adapters/email.test.ts, __tests__/lib/campaigns/adapters/sms.test.ts</files>
  <actions>
    **`email.ts`** per RESEARCH B section 3:
    - `enabled() { return !!process.env.RESEND_API_KEY }`
    - `send()` calls `import { sendEmail } from '@/lib/email/resend'` (existing helper from Phase 02). Map result to `SendResult`.
    - `verify(providerMessageId)`: `fetch('https://api.resend.com/emails/' + id, { headers: { Authorization: 'Bearer ' + process.env.RESEND_API_KEY } })`; success path: `data.last_event ∈ {delivered, opened, clicked}` → `{ found: true }`; otherwise `{ found: false }`. Status-not-OK → `{ found: false, error: 'Resend API ' + status }`.

    **`sms.ts`** per RESEARCH B section 3:
    - `enabled() { return !!(process.env.BULKSMS_TOKEN_ID && process.env.BULKSMS_TOKEN_SECRET) }`
    - `send()`: builds Basic auth from `Buffer.from(id+':'+secret).toString('base64')`; POSTs JSON to `https://api.bulksms.com/v1/messages` with `{ to, body, from }` (`from` defaults to `process.env.BULKSMS_SENDER_ID ?? 'DraggonnB'`). Response is array; take `data[0]`. On non-OK: `{ success: false, error: 'BulkSMS ' + status }`.
    - `verify(providerMessageId)`: GET `/v1/messages/{id}` with same Basic auth; check `data.status?.type === 'DELIVERED'`.
    - Phone normalization: if `recipientRef` doesn't start with `+`, prepend `+27` for SA fallback (note: in RESEARCH the input format assumed E.164 with `+`; defensive normalization documented in code comment).

    **Unit tests** — both files use `vi.stubGlobal('fetch', vi.fn())`:
    - `email.test.ts`: 4 tests
      - `enabled() returns false when RESEND_API_KEY unset` (use `vi.stubEnv`)
      - `send() success path returns providerMessageId from sendEmail mock`
      - `verify() returns found=true on last_event=delivered`
      - `verify() returns found=false on last_event=bounced`
    - `sms.test.ts`: 5 tests
      - `enabled() returns false when token id missing`
      - `enabled() returns true when both tokens set`
      - `send() returns success + providerMessageId on 201`
      - `send() returns error on 401`
      - `verify() returns found=true on status.type=DELIVERED`

    Use `vi.mock('@/lib/email/resend', () => ({ sendEmail: vi.fn() }))` for email test.
  </actions>
  <verification>
    `npm test -- email.test.ts sms.test.ts` — both files pass all tests.
    `npm run typecheck` clean.
  </verification>
</task>

<task id="3">
  <title>Implement social adapters (FB, IG, LinkedIn) — credential-gated stubs</title>
  <files>lib/campaigns/adapters/facebook.ts, lib/campaigns/adapters/instagram.ts, lib/campaigns/adapters/linkedin.ts</files>
  <actions>
    Each social adapter implements the `ChannelAdapter` interface but `send()` / `verify()` throw with structured "not yet implemented (credential-gated)" message. UI Plan 11-10's API guard checks `enabled()` BEFORE invoking; throws here are last-line defense.

    **`facebook.ts`** per RESEARCH B section 3:
    ```typescript
    export class FacebookAdapter implements ChannelAdapter {
      channelId = 'facebook' as const
      enabled(): boolean { return !!process.env.META_APP_ID }
      async send(draft: CampaignDraftPayload): Promise<SendResult> {
        if (!this.enabled()) {
          return { success: false, error: 'Facebook not connected. Set META_APP_ID to enable.', errorCode: 'CHANNEL_DISABLED' }
        }
        // Real implementation: query social_accounts WHERE organization_id = draft.organizationId AND platform='facebook' to get page_id + page_access_token, POST /{page_id}/feed.
        // Note: social_accounts table has page_id + page_access_token columns ready (RESEARCH B section 13). DO NOT JOIN through created_by (legacy users FK).
        throw new Error('FacebookAdapter.send: implementation pending Meta App approval (CAMP-01 Option B scaffold)')
      }
      async verify(providerMessageId: string, orgId?: string): Promise<VerifyResult> {
        if (!this.enabled()) return { found: false, error: 'Facebook not connected' }
        throw new Error('FacebookAdapter.verify: implementation pending Meta App approval')
      }
    }
    ```

    **`instagram.ts`** — identical structure. `enabled()` reads `META_APP_ID` (Instagram Basic Display + Graph share Meta credentials).

    **`linkedin.ts`** — identical structure. `enabled()` reads `LINKEDIN_CLIENT_ID`.

    Add a top-of-file comment block to each: `// Phase 11. Credential-gated scaffold (CAMP-01 Option B). Real adapter logic ships when Meta/LinkedIn credentials land — no migration or interface change required at unblock-time.`

    No unit tests required for stubs — coverage will come when real implementations land. (Optional: add a single test asserting `enabled()` returns false in default test env, but skip to keep this plan tight.)
  </actions>
  <verification>
    `npm run typecheck` clean.
    `node -e "const { getEnabledChannels } = require('./lib/campaigns/adapters'); console.log(getEnabledChannels())"` returns `['email', 'sms']` (or just `['email']` if BulkSMS env not set in dev — both acceptable).
  </verification>
</task>

## Verification

- `npm run typecheck` passes.
- `npm test -- adapters` — Email + SMS unit tests pass (≥9 assertions total).
- `getEnabledChannels()` returns `['email', 'sms']` when both env vars set; `['email']` when only Resend set.
- No social adapter is invoked at runtime — gating in API route (Plan 11-11) intercepts before `send()`.

## Out of scope

- Do NOT implement real Facebook/Instagram/LinkedIn `send()`/`verify()` — credential-gated, ships when Meta App approved (post-Phase-11).
- Do NOT add `social_accounts` reads here — happens in real adapter implementation later. Reference is documented for the unblock path.
- Do NOT build the agent classes (CampaignDrafterAgent, BrandSafetyAgent) — Plan 11-05.
- Do NOT touch `app/api/campaigns/**` routes — Plan 11-10 (composer endpoints) and 11-11 (execute/schedule/kill-switch).
- Do NOT add `email_tracking_events` table or webhook handlers — those are v3.1 (CRM engagement is `last_contacted_at` + manual flag only per Plan 11-06).
- Do NOT register BulkSMS DLR webhook here — that is part of v3.1 SMS opt-out work (RESEARCH B section 13 POPIA risk).

## REQ-IDs closed

- (Foundational for) CAMP-01 (drafts include email + SMS active in v3.0; FB/IG/LinkedIn dark but UI-renderable). Full closure happens in 11-10/11.
- (Foundational for) CAMP-05 (verify() implementations land here for email + SMS; called by Plan 11-11's verify endpoint).

---
phase: 11-easy-advanced-crm-campaign-decision
plan: 11-04
subsystem: campaigns
tags: [resend, bulksms, email, sms, facebook, instagram, linkedin, channel-adapter, campaigns]

requires:
  - phase: 11-02
    provides: Campaign schema tables (campaign_drafts, campaign_sends, campaign_channels, campaign_schedules) and DB foundation

provides:
  - ChannelAdapter interface + ChannelId/SendResult/VerifyResult/CampaignDraftPayload types
  - EmailAdapter wrapping lib/email/resend sendEmail() with Resend verify() path
  - SmsAdapter posting to BulkSMS v1/messages with Basic auth + E.164 phone normalisation
  - FacebookAdapter/InstagramAdapter/LinkedInAdapter credential-gated stubs (enabled() = false until META_APP_ID/LINKEDIN_CLIENT_ID set)
  - getAdapter() factory + getEnabledChannels() helper exported from lib/campaigns/adapters/index.ts
  - BULKSMS_TOKEN_ID, BULKSMS_TOKEN_SECRET, BULKSMS_SENDER_ID, META_APP_ID, LINKEDIN_CLIENT_ID as optional Zod entries in env-schema.ts
  - 18 unit tests (8 email + 10 SMS) covering success, API error, and credential-missing branches

affects:
  - 11-05 (campaign agent — CampaignDrafterAgent calls getAdapter())
  - 11-10 (composer UI — getEnabledChannels() drives channel selector)
  - 11-11 (execute/schedule/kill-switch API routes — adapter.send() + adapter.verify())

tech-stack:
  added: []
  patterns:
    - "ChannelAdapter interface: enabled()/send()/verify() contract for all campaign channels"
    - "Credential-gated stub pattern: send() returns {success:false,errorCode:'CHANNEL_DISABLED'} when env absent; throws only if enabled() passed but implementation missing"
    - "BulkSMS Basic auth from Buffer.from(id:secret).toString('base64')"
    - "E.164 phone normalisation: prepend +27 as SA fallback if no + prefix"

key-files:
  created:
    - lib/campaigns/adapters/types.ts
    - lib/campaigns/adapters/email.ts
    - lib/campaigns/adapters/sms.ts
    - lib/campaigns/adapters/facebook.ts
    - lib/campaigns/adapters/instagram.ts
    - lib/campaigns/adapters/linkedin.ts
    - lib/campaigns/adapters/index.ts
    - __tests__/unit/lib/campaigns/adapters/email.test.ts
    - __tests__/unit/lib/campaigns/adapters/sms.test.ts
  modified:
    - lib/config/env-schema.ts

key-decisions:
  - "BulkSMS for SMS (not SMS Portal/Clickatell/Twilio): SA-headquartered, ZAR billed, direct SA SMSC routing, lowest per-message cost"
  - "Social adapters are stubs that return CHANNEL_DISABLED (not throw) when disabled — safe for UI to call enabled() before send()"
  - "EmailAdapter does NOT import env singleton at module load — reads process.env.RESEND_API_KEY directly in enabled() to avoid boot coupling"
  - "Phone normalisation strips leading 0 and prepends +27 for SA numbers without E.164 prefix"

patterns-established:
  - "ChannelAdapter.enabled(): pure env check, no I/O, safe to call at render time"
  - "ChannelAdapter.send(): returns SendResult (never throws) for predictable error handling in API routes"
  - "Social adapter stubs: throw only when enabled()=true but implementation is missing — never on disabled path"

duration: 35min
completed: 2026-04-27
---

# Phase 11 Plan 04: Campaign Channel Adapters Summary

**5-channel ChannelAdapter system with live Email (Resend) + SMS (BulkSMS), and credential-gated stubs for Facebook/Instagram/LinkedIn — 18 unit tests green, tsc clean**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-27
- **Completed:** 2026-04-27
- **Tasks:** 3/3
- **Files modified:** 10 (7 created + 3 test files + env-schema)

## Accomplishments

- Implemented full ChannelAdapter interface with 5 concrete adapters covering the complete Campaign Studio channel set
- EmailAdapter (Resend) and SmsAdapter (BulkSMS) are production-ready with real API calls and verify() paths
- Social adapters (Facebook/Instagram/LinkedIn) are structurally complete stubs — UI can render them as greyed-out tiles; no interface change needed when credentials land
- 18 unit tests covering success, API error, missing-credential, and phone normalisation branches — all passing
- env-schema.ts extended with 5 optional Campaign Studio env vars (boot does not block)

## Task Commits

1. **Task 1: ChannelAdapter interface + factory + env config** - `b62ff81c` (feat)
2. **Task 2: EmailAdapter + SmsAdapter + unit tests** - `051b9323` (feat)
3. **Task 3: Social adapters (FB/IG/LinkedIn)** - included in Task 1 commit `b62ff81c` (feat)

## Files Created/Modified

- `lib/campaigns/adapters/types.ts` — ChannelId, ChannelAdapter, CampaignDraftPayload, SendResult, VerifyResult interfaces
- `lib/campaigns/adapters/email.ts` — Resend wrapper; verify() checks last_event in {delivered,opened,clicked}
- `lib/campaigns/adapters/sms.ts` — BulkSMS Basic auth POST; E.164 normalisation; verify() checks status.type=DELIVERED
- `lib/campaigns/adapters/facebook.ts` — Credential-gated stub (META_APP_ID)
- `lib/campaigns/adapters/instagram.ts` — Credential-gated stub (META_APP_ID — shares Meta credentials)
- `lib/campaigns/adapters/linkedin.ts` — Credential-gated stub (LINKEDIN_CLIENT_ID)
- `lib/campaigns/adapters/index.ts` — getAdapter() + getEnabledChannels() factory/helper
- `lib/config/env-schema.ts` — Added BULKSMS_TOKEN_ID, BULKSMS_TOKEN_SECRET, BULKSMS_SENDER_ID, META_APP_ID, LINKEDIN_CLIENT_ID as optional
- `__tests__/unit/lib/campaigns/adapters/email.test.ts` — 8 tests (enabled, send success/fail/missing-recipient, verify delivered/bounced/API-error)
- `__tests__/unit/lib/campaigns/adapters/sms.test.ts` — 10 tests (enabled, send success/401/missing-recipient, verify DELIVERED/non-DELIVERED/404, phone normalisation)

## Decisions Made

- **BulkSMS chosen** over SMS Portal/Clickatell/Twilio: SA-headquartered (Cape Town), ZAR billing, POPIA-compliant, direct SA SMSC routing, lowest per-message cost (R0.18-0.25/SMS)
- **Social stubs return `{success:false,errorCode:'CHANNEL_DISABLED'}`** not throw on disabled path — safe for any caller; throw is reserved for enabled-but-not-implemented (last-line defense)
- **EmailAdapter reads `process.env.RESEND_API_KEY` directly** in `enabled()` — avoids importing env singleton at module load which could cause circular dependency issues
- **BULKSMS_SENDER_ID defaults to 'DraggonnB'** when env var unset

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. Pre-existing tsc errors in `database.types.ts`, `elijah-full.test.ts`, and `social-content-full.test.ts` confirmed as pre-existing (not introduced by this plan).

## User Setup Required

External services require configuration before SMS channel is active:

| Env Var | Source | Required for |
|---------|--------|--------------|
| `BULKSMS_TOKEN_ID` | BulkSMS Console → API → Tokens | SMS sends |
| `BULKSMS_TOKEN_SECRET` | BulkSMS Console → API → Tokens | SMS sends |
| `BULKSMS_SENDER_ID` | BulkSMS Console → Sender IDs (pre-registration 1-5 business days) | SMS from-name |
| `META_APP_ID` | Meta Developer Console | FB/IG adapters |
| `LINKEDIN_CLIENT_ID` | LinkedIn Developer Console | LinkedIn adapter |

`RESEND_API_KEY` already set (Phase 02). Email channel active immediately.

## Next Phase Readiness

- All 5 adapters implement ChannelAdapter interface — Plan 11-05 (CampaignDrafterAgent) can call `getAdapter(channelId)` immediately
- `getEnabledChannels()` ready for Plan 11-10 channel selector UI
- `adapter.send()` + `adapter.verify()` ready for Plan 11-11 execute/schedule/kill-switch API routes
- Social adapters structurally ready — no interface change needed when Meta/LinkedIn credentials land

---
*Phase: 11-easy-advanced-crm-campaign-decision*
*Completed: 2026-04-27*

---
phase: 09-foundations-guard-rails
verified: 2026-04-26T00:00:00Z
status: human_needed
score: 4/4 must-haves structurally verified
human_verification:
  - test: PayFast sandbox end-to-end -- compose Core+Accommodation, generate DRG-* link, trigger ITN, verify billing_plan_snapshot written and subscription_token from ITN.token
    expected: organizations.billing_plan_snapshot has correct composed amount; payfast_subscription_token comes from ITN.token not pf_payment_id
    why_human: No sandbox credentials provisioned during phase. API contract verified in code; runtime path not exercised.
  - test: 50-concurrent guardUsage integration test against live Supabase (requires TEST_CONCURRENCY_ORG_ID env var and billing_plans with limits.ai_generations=50)
    expected: Exactly 50 calls succeed, 0 leak past cap, 51st raises UsageCapExceededError
    why_human: Test skips (describe.skipIf) without TEST_CONCURRENCY_ORG_ID. Advisory-lock RPC can only be proven with live DB under concurrent load.
---

# Phase 09: Foundations and Guard Rails -- Verification Report

**Phase Goal:** Ship billing composition + usage enforcement + all catastrophic-pitfall guards before any v3.0 AI feature or UI work begins. Zero UI impact; operator + platform-admin facing only.
**Verified:** 2026-04-26
**Status:** human_needed -- all 4 must-haves pass structural verification; 2 items require runtime confirmation before first production charge.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Composition API builds composed amount and writes billing_plan_snapshot | VERIFIED | compose() + recordComposition() in lib/billing/composition.ts write snapshot to organizations.billing_plan_snapshot; ITN handler reads snapshot for amount validation |
| 2 | guardUsage() blocks Anthropic call before cap exceeded; ceiling constants correct | VERIFIED | lib/usage/guard.ts calls record_usage_event RPC; lib/ai/cost-ceiling.ts has R150/R400/R1500 constants; base-agent.ts calls checkCostCeiling() at Step 4 before Anthropic call |
| 3 | ITN webhook branches by prefix and validates amount from snapshot | VERIFIED | app/api/webhooks/payfast/route.ts parses prefix via parseMPaymentId(), branches all 4 prefixes, amount validation reads org.billing_plan_snapshot not PRICING_TIERS |
| 4 | Boot fails with clear error if PAYFAST_MODE=production without PAYFAST_PASSPHRASE | VERIFIED | lib/config/env-schema.ts .superRefine() adds Zod issue on that condition; lib/config/env.ts throws at module-load time on validation failure |

**Score:** 4/4 truths structurally verified.

## Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| lib/billing/composition.ts | VERIFIED | 135 lines; compose() pure fn + recordComposition() with DB writes; exported |
| lib/payments/payfast-prefix.ts | VERIFIED | 69 lines; PAYFAST_PREFIX enum, makeMPaymentId, parseMPaymentId all implemented and exported |
| app/api/webhooks/payfast/route.ts | VERIFIED | 397 lines; full prefix branching, snapshot validation, ERR-030 fix (ITN.token vs pf_payment_id), all 4 prefixes handled |
| lib/agents/base-agent.ts | VERIFIED | 400+ lines; DEFAULT_MODEL = Haiku 4.5, checkCostCeiling called before Step 5, ledger insert on ceiling abort |
| lib/usage/guard.ts | VERIFIED | 78 lines; calls record_usage_event RPC, throws UsageCapExceededError on allowed=false |
| lib/ai/cost-ceiling.ts | VERIFIED | TIER_CEILING_ZAR_CENTS: core=15000 (R150), growth=40000 (R400), scale=150000 (R1500), platform_admin=unlimited |
| lib/config/env-schema.ts | VERIFIED | superRefine gate: PAYFAST_MODE=production without PAYFAST_PASSPHRASE raises Zod issue |
| lib/config/env.ts | VERIFIED | Singleton buildEnv() throws at module load on validation failure; imported in base-agent.ts |
| vercel.json | VERIFIED | Cron /api/ops/cost-rollup at schedule 0 0 * * * |
| app/api/ops/cost-rollup/route.ts | VERIFIED | CRON_SECRET bearer-guarded; calls aggregate_org_day_cost RPC; idempotent UPSERT to daily_cost_rollup |
| __tests__/integration/usage/guard-concurrency.test.ts | VERIFIED | 50-concurrent test correctly written; skips without TEST_CONCURRENCY_ORG_ID (safe in CI) |

## Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| base-agent.ts | lib/ai/cost-ceiling.ts | checkCostCeiling() at Step 4 | WIRED |
| base-agent.ts | lib/ai/model-registry.ts | DEFAULT_MODEL = HAIKU_4_5 | WIRED |
| webhooks/payfast/route.ts | lib/payments/payfast-prefix.ts | parseMPaymentId() at Step 3 | WIRED |
| webhooks/payfast/route.ts | organizations.billing_plan_snapshot | DB select + amount comparison in handleSubscriptionPayment | WIRED |
| lib/config/env.ts | lib/config/env-schema.ts | envSchema.safeParse(process.env) at module load | WIRED |
| lib/billing/composition.ts | organizations.billing_plan_snapshot | recordComposition() DB update | WIRED |

## Requirements Coverage

| Must-Have | Status | Notes |
|-----------|--------|-------|
| 1: Compose + snapshot + PayFast sandbox charge | KNOWN-GAP (runtime) | Code path complete; sandbox e2e not run -- no sandbox creds, documented in 09-PAYFAST-ADHOC-SPIKE.md |
| 2: guardUsage() ceiling + 50-concurrent no-leak | KNOWN-GAP (runtime) | guardUsage + checkCostCeiling wired; concurrency test skips without live fixture |
| 3: ITN prefix branching + snapshot validation | PASS | All 4 branches present and wired |
| 4: Boot guard + client_usage_metrics audit | PASS | Zod superRefine confirmed; 09-05 DIAGNOSTICS.md documents metrics classification |

## Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| webhooks/payfast/route.ts line 247 | Amount mismatch does not reject -- logs and continues | Info | Intentional: PayFast cannot auto-refund; Phase 12 reconciliation cron will flag |
| webhooks/payfast/route.ts line 339 | Legacy tier aliases in provisioning call type union | Info | Handled by getCanonicalTierName; no runtime risk |

No blockers found.

## Human Verification Required

### 1. PayFast Sandbox End-to-End

**Test:** Using sandbox merchant credentials, call compose(core, [accommodation]), then recordComposition(), generate a DRG-* payment link. Simulate ITN POST with payment_status=COMPLETE and a token field. Confirm organizations.billing_plan_snapshot contains correct monthly_total_zar_cents and payfast_subscription_token is set from ITN.token (not pf_payment_id).

**Expected:** Snapshot written at compose time. Token stored from ITN token field only on first COMPLETE DRG-* payment.

**Why human:** PayFast sandbox credentials not provisioned during Phase 09. Code contract fully implemented and documented in 09-PAYFAST-ADHOC-SPIKE.md.

### 2. 50-Concurrent guardUsage Integration Test

**Test:** Set TEST_CONCURRENCY_ORG_ID to a seeded org with billing_plans.limits.ai_generations=50. Run: vitest __tests__/integration/usage/guard-concurrency.test.ts

**Expected:** ok=50, capped=0, errored=0 for first test; second test rejects with UsageCapExceededError.

**Why human:** Advisory lock effectiveness can only be proven under concurrent real DB load. Test correctly written and ready to run when fixture is provisioned.

## Gaps Summary

No code implementation gaps found. Both open items are runtime-confirmation items documented by the phase team -- not missing code. All Phase 09 guard-rails are structurally complete and correctly wired. Phase is clear to advance once sandbox e2e and concurrency test are confirmed.

---

_Verified: 2026-04-26_
_Verifier: Claude (gsd-verifier)_

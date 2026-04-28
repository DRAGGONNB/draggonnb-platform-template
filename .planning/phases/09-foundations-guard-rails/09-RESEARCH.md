# Phase 09 Research — Foundations & Guard Rails

**Researched:** 2026-04-24
**Domain:** Billing composition, usage enforcement, cost circuit-breakers, migration discipline
**Confidence:** HIGH on codebase truth + Anthropic SDK fields; MEDIUM on PayFast ad-hoc endpoint internals
**Consumer:** `gsd-planner` for Phase 09 PLAN.md

---

## Executive Summary

- **Anthropic SDK v0.73 is installed** (`"@anthropic-ai/sdk": "^0.73.0"`). The cache fields `cache_read_input_tokens` and `cache_creation_input_tokens` are readable from `response.usage` today. BaseAgent just ignores them. Phase 09 can wire them to `ai_usage_ledger` without an SDK bump.
- **Default model is currently Sonnet-4.5, not Haiku.** `lib/agents/base-agent.ts:40` — `const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929'`. Phase 09 MUST flip this + add runtime assertion. This is a silent cost drain today.
- **BaseAgent does NOT accept a system-block array** — it passes `system: this.config.systemPrompt` as a single string. Cache-control blocks (Option B tenant isolation) require an SDK-native array of `{type:'text', text, cache_control}` blocks. Phase 09 lays the foundation by making `system` accept `string | Array<SystemBlock>` while keeping backwards compat. (Phase 10 actually injects tenant-scoped blocks.)
- **Dual-state usage metering is real and observable.** `app/api/content/generate/route.ts` and `app/api/autopilot/generate/route.ts` use LEGACY `checkUsage/incrementUsage` from `lib/tier/feature-gate.ts` (writes `client_usage_metrics`). Other paths via `lib/usage/meter.ts` use the NEW `record_usage_event` RPC. Phase 09 USAGE-01 `guardUsage` helper unifies these.
- **`organizations.payfast_subscription_token` already exists** (migration 00, UNIQUE). Phase 09 does NOT add it. But the current webhook OVERWRITES it with `pf_payment_id` on every payment, which is wrong — the subscription token is returned once at first payment via a separate field. Webhook logic needs review.
- **`vercel.json` does NOT exist.** Phase 09 creates it. Zero existing Vercel crons — we have 2 free slots on Hobby tier, USAGE-10 fits cleanly. Existing `/api/autopilot/cron/route.ts` is invoked by N8N, not Vercel cron.
- **`lib/config/env.ts` does NOT exist.** OPS-01 is greenfield. Zod is installed (^3.22.0). Pattern: `env.server.ts` Zod-validated module, imported at top of `next.config.mjs` to fail boot.
- **`PRICING_TIERS` legacy aliasing is still live.** Both `starter/professional/enterprise` AND `core/growth/scale` keys exist in `lib/payments/payfast.ts` with identical data. ITN validation tolerates both via `getCanonicalTierName()`. Phase 09 rename to `PRICING_TIERS_V3` must preserve this.
- **Migration numbering gap:** last sequential numeric is `16_fix_get_user_org_id.sql`, then jumps to `21_new_module_stubs.sql` (with a parallel Elijah block `20260330000001-10`). Next Phase 09 migration should start at **`22`** (matches research SUMMARY assumption). Do not use timestamp-prefixed naming — repo convention is sequential two-digit.
- **`record_usage_event` RPC is race-safe.** PL/pgSQL `INSERT INTO usage_events` inside a single function invocation with SUM aggregation read immediately before — under default READ COMMITTED isolation this is NOT fully atomic against concurrent invocations. See section 8 for the gotcha; 50-concurrent test must target this directly.

**Primary recommendation:** Phase 09 is integration and hardening, not greenfield. The main net-new code is (a) composition tables + checkout-cart API, (b) `ai_usage_ledger` + circuit breaker, (c) Zod env schema, (d) prefix-branched webhook. Everything else is wiring existing pieces together and cleaning dual-state.

---

## 1. Codebase Truth

### 1.1 `lib/payments/payfast.ts` (live)

**Exports:**
- `PRICING_TIERS: Record<string, PricingTier>` — 6 keys: `starter/professional/enterprise` (legacy) AND `core/growth/scale` (canonical). **Same data, duplicated.** Keys map 1:1 via `TIER_MAP`.
- `TIER_MAP` + `getCanonicalTierName(tier)` — aliases legacy → canonical.
- `getPayFastConfig()` — reads `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`. Throws if ID/KEY missing; only WARNS (console.warn, non-fatal) if `mode=production` without passphrase. **This is the OPS-01 weakness** — silent prod misconfig.
- `generatePayFastSignature(data, passphrase)` — MD5, `encodeURIComponent → replace(/%20/g, '+')`, `sort()` keys, excludes `signature`. Same pattern required for API headers (see PayFast REST section).
- `validatePayFastSignature(itnData, passphrase)` — compares received vs generated.
- `createPayFastSubscription(request)` — returns form data for redirect. `m_payment_id` format: `${organizationId}-${Date.now()}` (no prefix branching today — no DRG/ADDON/TOPUP/ONEOFF). Sets `subscription_type: '1'` (recurring) or from request. `frequency: '3'` (monthly).
- `verifyPayFastPayment(itnData)` — server-to-server POST to `/eng/query/validate`, expects `VALID` string response.
- `validatePaymentAmount(received, expected)` — allows 0.01 rounding delta.
- `getTierByItemCode(itemCode)` — reverse lookup via `payfast_item_code` field.

**NO subscription amendment / adhoc / update code.** No `cancelPayFastSubscription` in this file — it lives in `lib/billing/subscriptions.ts` as private helper.

### 1.2 `lib/billing/subscriptions.ts` (live)

**Functions:**
- `getSubscription(orgId)` — reads `organizations` join `billing_plans`. Returns `{ plan_id, subscription_status, next_billing_date, payfast_subscription_token, plan }`.
- `changePlan(orgId, newPlanId, changedBy, reason?)` — updates `organizations.plan_id`, inserts `billing_plan_changes` audit row. **Does NOT touch PayFast.** This is a gap — plan change in DB without telling PayFast means state desync.
- `cancelSubscription(orgId)` — calls internal `cancelPayFastSubscription(token)` if token present, then sets `subscription_status='cancelled'`.
- `getSubscriptionHistory(orgId, limit=20)` — reads `subscription_history`.
- `handlePaymentComplete(orgId, paymentData)` — **THE DUAL-STATE WRITER.** Updates `organizations.subscription_status='active'`, `payfast_subscription_token=paymentData.pf_payment_id` (BUG: pf_payment_id is the per-transaction ID, not the subscription token), `next_billing_date=+1mo`. Inserts `subscription_history`. **Resets LEGACY `client_usage_metrics` columns** `monthly_posts_used`, `monthly_ai_generations_used`. Does not touch `usage_events`.
- `handlePaymentFailed(orgId, paymentData)` — sets status, inserts history.
- `cancelPayFastSubscription(token)` (private) — PUT to:
  - Production: `https://api.payfast.co.za/subscriptions/{token}/cancel`
  - Sandbox: `https://sandbox.payfast.co.za/eng/recurring/update/{token}/cancel`
  - Headers: `merchant-id`, `version: v1`, `timestamp: ISO8601`, `Content-Type: application/json`
  - **BUG: No signature header.** PayFast API requires MD5 signature with merchant creds. This call likely fails silently in production today — it's only tested in sandbox which may tolerate unsigned calls.

### 1.3 `lib/billing/plans.ts` (live, clean)

- `getPlans()` — reads `billing_plans` via user-scoped supabase client. Returns `BillingPlan[]`.
- `getPlan(planId)`, `getPlanLimits(planId)` — single-row reads.
- `formatPrice(cents)` — cents → "R1,500" (strips `.00` on whole).
- `comparePlans(currentPlanId, newPlanId)` — returns `'upgrade' | 'downgrade' | 'same'` via `sort_order`.

**No module composition logic.** This file treats plans as monolithic. Phase 09 adds `lib/billing/composition.ts` (new) for base + modules + addons math.

### 1.4 `lib/usage/meter.ts` (live)

- `recordUsage(orgId, metric, quantity=1, metadata={})` — calls `record_usage_event` RPC via admin client. If blocked by plan, falls back to `consume_credits` RPC, then inserts `usage_events` manually if credits consumed. Returns `{ allowed, current, limit, remaining }`.
- `checkUsage(orgId, metric)` — read-only, calls `get_usage_summary` RPC.
- `getUsageSummary(orgId)` — all metrics.
- `tryConsumeCredits(orgId, metric, quantity)` — RPC call, returns `{ consumed, creditsRemaining }`.

**Signature for USAGE-01:** Phase 09 `guardUsage(orgId, metric, quantity=1)` is a THIN WRAPPER around `recordUsage` — throw-on-deny pattern for API routes that don't want to branch on `result.allowed`. Don't rebuild.

### 1.5 `lib/tier/feature-gate.ts` (LEGACY, dual-state)

- `TIER_LIMITS` — hardcoded in-file, MUST agree with `billing_plans.limits` JSONB. Drift risk.
- `checkUsage(organizationId, metric)` — reads `organizations.subscription_tier` + `client_usage_metrics`. Returns `{ allowed, reason?, current, limit, upgradeRequired? }`.
- `incrementUsage(organizationId, metric, amount=1)` — calls `increment_usage_metric` RPC (from migration 00, line ~291), falls back to read-then-write.
- `checkFeatureAccess(tier, feature)` — maps feature → min tier hierarchy.
- `checkModuleAccess(orgId, moduleId)` — reads `tenant_modules.is_enabled`.

**Used by:**
- `app/api/content/generate/route.ts` (lines 3, 53, 126)
- `app/api/content/generate/email/route.ts`
- `app/api/content/generate/social/route.ts`
- `app/api/autopilot/chat/route.ts`
- `app/api/autopilot/generate/route.ts` (lines 5, 64, 233)

**Phase 09 audit task:** migrate these 5 call sites to `guardUsage(orgId, metric)` + `lib/usage/meter.ts::recordUsage`. Delete `incrementUsage` from feature-gate.ts (keep `checkFeatureAccess` + `checkModuleAccess`).

### 1.6 `lib/agents/base-agent.ts` (live, needs extension)

**Current flow (condensed):**
1. Get/create `agent_sessions` row (reads `messages, tokens_used`).
2. Build `claudeMessages` from history + new `input + context`.
3. Call `client.messages.create({ model: config.model, max_tokens, temperature, system: config.systemPrompt, messages })`.
4. Sum `input_tokens + output_tokens → tokensUsed`.
5. Save `messages`, `tokens_used` (accumulated), `status`, `result` back to `agent_sessions`.
6. On error: set `status='failed'`, rethrow.

**Gaps for Phase 09:**
- Default model is Sonnet: `'claude-sonnet-4-5-20250929'` (line 40) — MUST become `'claude-haiku-4-5'` (verify exact model ID string — Haiku 4.5 GA ID needs confirmation from Anthropic docs; the SDK accepts partial-prefix matching but prod should pin exact version).
- `system` is always a string — Phase 10 needs array-of-blocks for cache breakpoints. Phase 09 should widen the type now (non-breaking) but NOT require block form.
- No pre-call cost-ceiling check (USAGE-06 / USAGE-07).
- No `ai_usage_ledger` insert (USAGE-08).
- No read of `response.usage.cache_read_input_tokens` / `cache_creation_input_tokens`.
- No per-call cost computation.
- Where to insert `guardUsage(orgId, 'ai_generations')`: **before** `client.messages.create(...)` at line 115, and before circuit-breaker check. Order: (1) guardUsage → (2) ai_ceiling_check → (3) Anthropic call → (4) ledger insert (cost computed) → (5) agent_sessions update.

### 1.7 `lib/supabase/admin.ts` (live, minimal)

- `createAdminClient()` — reads `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`. Throws on either missing. `autoRefreshToken: false, persistSession: false`.
- No singleton — every call creates a new client. Fine for webhook-style use. Hot paths (`BaseAgent.run()`, `recordUsage()`) create a new client per call — minor overhead but not hot enough to matter.

### 1.8 `app/api/webhooks/payfast/route.ts` (live, needs rewrite)

**Current flow:**
1. Parse form data into `itnData`.
2. Validate MD5 signature (`validatePayFastSignature`).
3. Server-to-server verify via `verifyPayFastPayment`.
4. Extract `pf_payment_id, payment_status, amount_gross, custom_str1 (orgId), custom_str2 (planTier), email, item_name`.
5. Validate amount against `PRICING_TIERS[effectiveTier].price`. **PITFALL 1 live here** — reads current pricing, not snapshot.
6. On `COMPLETE`: updates `organizations` (status, token=pf_payment_id, activated_at, next_billing_date), inserts `subscription_history`, resets `client_usage_metrics` (legacy), detects "new subscription" by `!activated_at`, inserts `provisioning_jobs`, triggers N8N provisioning webhook.
7. On `FAILED / PENDING / CANCELLED`: status update + history insert.

**No prefix branching.** `m_payment_id` is not parsed. Phase 09 BILL-06 rewrites this to:
```
const prefix = m_payment_id.split('-')[0]  // 'DRG' | 'ADDON' | 'TOPUP' | 'ONEOFF'
switch (prefix) { ... }
```

### 1.9 Migrations (current state, numbering)

Last 5 by date (numeric sequential repo convention):

| File | Created | Adds |
|------|---------|------|
| `10_shared_db_foundation.sql` | 2026-02-27 | `module_registry`, `tenant_modules`, `get_user_org_id()`, RLS rewrite, `organizations.subdomain` |
| `11_billing_plans.sql` | 2026-03-02 | `billing_plans`, `billing_invoices`, `billing_plan_changes`, `organizations.plan_id` |
| `12_usage_metering.sql` | 2026-03-02 | `usage_events`, `usage_summaries`, `record_usage_event()`, `get_usage_summary()`, `aggregate_monthly_usage()` |
| `13_credit_packs.sql` | (present, not read) | `credit_purchases`, `credit_ledger`, `consume_credits()` RPC |
| `14_api_keys.sql` | (present) | API key mgmt |
| `16_fix_get_user_org_id.sql` | (present) | `get_user_org_id()` bugfix |
| `21_new_module_stubs.sql` | (present, latest numeric) | module registry extensions |

**Parallel Elijah block:** `20260330000001-10_elijah_*.sql` (timestamp-prefixed, different convention). Don't mix patterns.

**Next migration number for Phase 09: `22`.**

---

## 2. PayFast Ad-Hoc Endpoint

### Bottom line
- **Endpoint confirmed:** `POST https://api.payfast.co.za/subscriptions/{token}/adhoc` (production) — MEDIUM-HIGH confidence from PHP SDK usage + search results. Sandbox equivalent: `https://sandbox.payfast.co.za/...` OR same host with `?testing=true` query — ambiguous across sources.
- **Recommend 1-day sandbox spike** (per locked decision). Core verification checklist below.
- **Update/amend endpoint:** `PUT https://api.payfast.co.za/subscriptions/{token}/update` — MEDIUM confidence. PHP SDK `$api->subscriptions->update($token, $data)` pattern, but the `amount` field for variable subscriptions is the open question. Some sources suggest amendment works only for `cycles` + `billing_date`, NOT the recurring `amount`. If confirmed, the "cancel-and-recreate" fallback (already in SUMMARY) is the correct path.

### 2.1 Endpoint specs (best evidence)

| Op | Method | Path (prod) | Sandbox |
|----|--------|-------------|---------|
| Ad-hoc charge | `POST` | `/subscriptions/{token}/adhoc` | Same path, host `sandbox.payfast.co.za` (OR `?testing=true` query — conflicting sources) |
| Update | `PUT` | `/subscriptions/{token}/update` | Same |
| Cancel | `PUT` | `/subscriptions/{token}/cancel` | `/eng/recurring/update/{token}/cancel` (per `lib/billing/subscriptions.ts` — this sandbox form is DIFFERENT from prod; possibly outdated) |
| Pause | `PUT` | `/subscriptions/{token}/pause` | Same |
| Unpause | `PUT` | `/subscriptions/{token}/unpause` | Same |
| Fetch | `GET` | `/subscriptions/{token}/fetch` | Same |

### 2.2 Ad-hoc body parameters (HIGH confidence from PHP SDK)

```json
{
  "amount": 14990,      // in CENTS (R149.90 = 14990) — verify in spike whether cents or rands
  "item_name": "ADDON-<org_id>-<timestamp>",
  "item_description": "Optional text",
  "m_payment_id": "ADDON-<org_id>-<timestamp>"
}
```

**Cents vs rands:** PayFast form-based integration (existing code) uses `amount: request.amount.toFixed(2)` i.e. RANDS with 2 decimals. API docs inconsistent. **Verify in spike.**

### 2.3 Authentication headers (HIGH confidence — same as cancel call already in codebase)

```
merchant-id: <PAYFAST_MERCHANT_ID>
version: v1
timestamp: <ISO 8601 without ms, e.g. "2026-04-24T15:30:00+02:00">
signature: <MD5 hex>
Content-Type: application/json
```

### 2.4 Signature canonicalization (HIGH confidence)

Same rule as ITN signature — but applied across:
- All body params (JSON keys)
- PLUS `merchant-id`, `version`, `timestamp` headers
- PLUS `passphrase` appended last

Algorithm:
1. Assemble `{ ...headers_without_signature, ...body }` into a single object.
2. `Object.keys(combined).sort()`.
3. For each key, `encodeURIComponent(value).replace(/%20/g, '+')`.
4. Join with `&` → `key=value&key=value...`.
5. Append `&passphrase=<urlencoded>`.
6. `md5(paramString)` → hex digest.
7. Place in `signature` header (NOT body).

**Existing code pattern in `lib/payments/payfast.ts:251` covers this.** Can be reused directly for API calls with minor adaptation (extract header vs body split).

### 2.5 Sandbox vs production differences (MEDIUM confidence)

- Sandbox merchant credentials differ from production.
- Sandbox passphrase often set to `jt7NOE43FZPn` (PayFast public sandbox creds) — do NOT hardcode; use env.
- Sandbox base URL: `sandbox.payfast.co.za` for form-based integration. For API calls, some sources use `api.payfast.co.za/.../?testing=true`, others use `sandbox.payfast.co.za/...` directly. **Existing code uses BOTH patterns inconsistently** (form=sandbox.payfast, cancel=sandbox.payfast but recurring/update path differs from prod). The 1-day spike must pin this down.
- Sandbox does NOT require real card capture — it returns test responses.

### 2.6 Failure modes and error codes

Unverified authoritatively. Known-common PayFast API responses:
- `200 OK` with `{ "response": "success" }` on adhoc success
- `200 OK` with `{ "response": "failed", "data": { ... } }` on rejection
- `400 Bad Request` on signature mismatch
- `401/403` on invalid merchant creds
- `404` on unknown subscription token

**Idempotency:** PayFast API is **NOT idempotent** — retrying an ad-hoc charge with same `m_payment_id` will charge twice unless PayFast deduplicates server-side. **Verify in spike.** If non-idempotent, client-side `m_payment_id` must be unique per attempt, with retry-safety via DB unique constraint on the ledger.

### 2.7 Spike recommendation

**1-day PayFast sandbox spike (Task BILL-02-SPIKE in Phase 09):**

1. Subscribe test org to variable-amount subscription; capture `pf_subscription_token` from ITN.
2. POST `/subscriptions/{token}/adhoc` with `amount: 10000` (R100 in cents) + signed headers. Record response.
3. POST same adhoc with `amount: "100.00"` (rands with decimals). Record response.
4. PUT `/subscriptions/{token}/update` with `{amount: 20000}`. Observe whether recurring amount actually changes on next billing.
5. Re-POST same adhoc with identical `m_payment_id`. Observe dedup behavior.
6. Document results in `docs/payfast-spike-results.md`.
7. Based on results: ship adhoc in v3.0, OR fallback to "capture overage, invoice EOM manually, automate in v3.1".

---

## 3. Supabase Schema Reality

### 3.1 `organizations` table (live)

**Columns (cumulative across migrations):**

| Column | Type | Source | Notes |
|--------|------|--------|-------|
| `id` | UUID PK | 00 | default `gen_random_uuid()` |
| `name` | TEXT NOT NULL | 00 | |
| `subscription_tier` | TEXT NOT NULL DEFAULT 'starter' | 00 → 05 alter | CHECK: `core, growth, scale, starter, professional, enterprise` (05 relaxed constraint) |
| `subscription_status` | TEXT NOT NULL DEFAULT 'trial' | 00 → 05 alter | CHECK includes `trial, active, suspended, cancelled, pending, payment_failed, payment_pending` |
| `owner_id` | UUID NOT NULL | 00 | refs auth.users, not FK-enforced |
| `payfast_subscription_token` | TEXT UNIQUE | 00 | **Already exists. Don't re-add.** But currently abused — webhook sets it to `pf_payment_id` (per-txn) not actual sub token. |
| `payfast_merchant_reference` | TEXT | 00 | |
| `next_billing_date` | DATE | 00 | |
| `last_payment_date` | DATE | 00 | |
| `trial_ends_at` | TIMESTAMP | 00 | |
| `activated_at` | TIMESTAMP | 00 | |
| `suspended_at` | TIMESTAMP | 00 | |
| `created_at` | TIMESTAMP NOT NULL | 00 | |
| `updated_at` | TIMESTAMP NOT NULL | 00 | |
| `subdomain` | TEXT UNIQUE | 10 | indexed where not null |
| `plan_id` | TEXT REFERENCES billing_plans(id) | 11 | default `'core'` |

**RLS (from migration 10):**
- `org_select`: `id = (SELECT public.get_user_org_id())`
- `org_update_admin`: org match + `users.role='admin'`
- `org_service_role`: service role full access
- `FORCE ROW LEVEL SECURITY` enabled

**Phase 09 additions required (all NULLABLE for multi-step discipline):**

```sql
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_plan_snapshot JSONB;
-- payfast_subscription_token already exists; just fix webhook to write the REAL token
```

### 3.2 `billing_plans` table (live, migration 11)

**Columns (all present):**

| Column | Type | Notes |
|--------|------|-------|
| `id` | TEXT PK | `'core'`, `'growth'`, `'scale'` |
| `display_name` | TEXT NOT NULL | |
| `description` | TEXT | |
| `price_zar` | INTEGER NOT NULL | **CENTS** — 150000 = R1,500 |
| `frequency` | TEXT NOT NULL DEFAULT 'monthly' | CHECK: `monthly, annual` |
| `is_active` | BOOLEAN DEFAULT true | |
| `sort_order` | INTEGER DEFAULT 0 | |
| `features` | JSONB NOT NULL DEFAULT `'[]'` | array of strings |
| `limits` | JSONB NOT NULL DEFAULT `'{}'` | `{social_posts: 30, ai_generations: 50, email_sends: 1000, social_accounts: 3, team_users: 2, custom_automations: 1, ai_agents: 0, agent_invocations: 0}` for core. **`-1` means unlimited.** |
| `payfast_item_code` | TEXT UNIQUE | `DRG-CORE`, `DRG-GROWTH`, `DRG-SCALE` |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

**Seeded data matches `PRICING_TIERS` exactly.** Price match check: core=150000, growth=350000, scale=750000 cents = R1500/R3500/R7500.

**RLS:** authenticated can SELECT, service role full access, FORCE RLS.

### 3.3 `agent_sessions` table (live, migration 05)

**Columns (current):**

| Column | Type |
|--------|------|
| `id` | UUID PK |
| `organization_id` | UUID FK |
| `agent_type` | TEXT NOT NULL |
| `lead_id` | UUID FK (leads) |
| `messages` | JSONB NOT NULL DEFAULT `'[]'` |
| `tokens_used` | INTEGER NOT NULL DEFAULT 0 |
| `status` | TEXT NOT NULL DEFAULT 'active' CHECK(`active, completed, failed`) |
| `result` | JSONB |
| `created_at`, `updated_at` | TIMESTAMP |

**RLS:** org-scoped select (via legacy `users` subquery), service role full access.

**Phase 09 USAGE-09 migration (add cost tracking — all NULLABLE, backfill NOT required for historical rows):**

```sql
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_zar_cents INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS model TEXT;
```

Keep `tokens_used INTEGER` as running total — don't rename, backfill not needed.

### 3.4 `usage_events` + `usage_summaries` (live, migration 12)

**Exact RPC signature (HIGH confidence from source):**

```sql
record_usage_event(
  p_org_id    UUID,
  p_metric    TEXT,           -- 'social_posts', 'ai_generations', 'email_sends', 'agent_invocations', etc.
  p_quantity  INTEGER  DEFAULT 1,
  p_metadata  JSONB    DEFAULT '{}'
) RETURNS JSONB
-- Returns: { allowed: bool, current: int, limit: int, remaining: int }
-- -1 limit means unlimited
-- Inserts into usage_events ONLY if allowed (atomic within the function)
```

```sql
get_usage_summary(p_org_id UUID) RETURNS JSONB
-- Returns: { "social_posts": {used, limit, remaining, percent}, "ai_generations": {...}, ... }
-- Per-metric map. Iterates jsonb_object_keys(billing_plans.limits).
```

```sql
aggregate_monthly_usage(p_period_start DATE DEFAULT NULL) RETURNS INTEGER
-- Upserts usage_summaries rows for the given month
-- Cron-friendly, idempotent
```

**Atomicity caveat (see section 8):** `record_usage_event` does SELECT-SUM-then-INSERT inside one PL/pgSQL call. Under PostgreSQL default READ COMMITTED isolation, two concurrent invocations CAN both read the same pre-insert count. This is a **theoretical race**, not proven in prod. Phase 09 USAGE-05 test must drive this.

**RLS on usage_events:** org-scoped select via `get_user_org_id()`, service role full, FORCE RLS. Inserts ONLY via `record_usage_event` RPC (SECURITY DEFINER bypasses RLS).

### 3.5 `client_usage_metrics` (LEGACY, migration 00, still active)

```sql
CREATE TABLE client_usage_metrics (
  id UUID PK,
  organization_id UUID FK UNIQUE,
  posts_monthly INTEGER DEFAULT 0,            -- ← alias: 'monthly_posts_used' in webhook reset code
  ai_generations_monthly INTEGER DEFAULT 0,   -- ← alias: 'monthly_ai_generations_used'
  api_calls_monthly INTEGER DEFAULT 0,
  storage_used_mb INTEGER DEFAULT 0,
  posts_limit INTEGER DEFAULT 30,
  ai_generations_limit INTEGER DEFAULT 50,
  api_calls_limit INTEGER DEFAULT 1000,
  storage_limit_mb INTEGER DEFAULT 1000,
  reset_date TIMESTAMP DEFAULT NOW(),
  created_at, updated_at
);
```

**Column naming bug:** webhook resets `monthly_posts_used` and `monthly_ai_generations_used` — but table columns are `posts_monthly` and `ai_generations_monthly`. **These UPDATEs silently no-op.** PostgreSQL UPDATE with non-existent columns would error; verify whether a silent type coercion or trigger masks this. **Investigate in Phase 09 audit task.**

**RPC:** `increment_usage_metric(p_organization_id, p_column_name, p_amount)` — uses `EXECUTE format(...)` with `%I` to interpolate column name. Callers pass string names like `'posts_monthly'` (feature-gate.ts:192 correctly uses these).

**Phase 09 decision point:** Delete legacy columns, delete table, or maintain dual-state forever?

- **Recommend:** Keep table, stop writing to it from webhook + feature-gate.ts, mark deprecated. Read-path migration in Phase 10 or Phase 12. Table is small (one row per org), no cleanup pressure.

### 3.6 `subscription_history` (live, migration 00)

Columns: `id, organization_id, transaction_id, amount, amount_fee, amount_net, status, payment_method, payfast_response JSONB, created_at`.

Used by both legacy webhook path and `handlePaymentComplete`. Phase 09 can keep writing here.

---

## 4. Migration Sequence Proposal

### 4.1 Multi-step discipline enforcement

Per locked decision #6 (OPS-05) — **every column add that will later be NOT NULL must ship in 4 steps across 2 migrations.**

Step pattern:
```
Migration N:   ADD COLUMN foo TYPE;              -- nullable
Deploy code:   Writes to foo on all new rows
Manual/RPC:    Backfill existing rows
Migration N+1: ALTER COLUMN foo SET NOT NULL;    -- constraint
```

### 4.2 Phase 09 migration plan

**Migration 22 — Billing composition schema (all NULLABLE, no backfill required)**

```sql
-- 22_billing_composition.sql

-- 1. organizations snapshot + token fix
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS billing_plan_snapshot JSONB;
-- Note: payfast_subscription_token already exists (migration 00)

-- 2. Addons catalog
CREATE TABLE IF NOT EXISTS billing_addons_catalog (
  id TEXT PRIMARY KEY,           -- 'accommodation', 'restaurant', 'social_booster', etc.
  display_name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('module', 'overage_pack', 'setup_fee')),
  price_zar_cents INTEGER NOT NULL,
  billing_cycle TEXT NOT NULL CHECK (billing_cycle IN ('monthly', 'one_off')),
  quantity_unit TEXT,            -- 'posts', 'receipts', 'credits' for overage packs
  quantity_value INTEGER,        -- 100 for "100 extra posts"
  min_tier TEXT REFERENCES billing_plans(id),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  payfast_item_code TEXT UNIQUE, -- 'ADDON-ACCOM', 'TOPUP-POSTS-100', 'ONEOFF-SETUP'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Per-org subscription composition (CURRENT state; history in billing_invoices.line_items)
CREATE TABLE IF NOT EXISTS subscription_composition (
  id UUID PK DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  base_plan_id TEXT REFERENCES billing_plans(id),
  addon_ids TEXT[] NOT NULL DEFAULT '{}',
  monthly_total_zar_cents INTEGER NOT NULL,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to TIMESTAMPTZ,              -- NULL = current
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (organization_id, effective_from)
);
CREATE INDEX ON subscription_composition (organization_id)
  WHERE effective_to IS NULL;  -- fast "current composition" lookup

-- 4. Pricing change audit log
CREATE TABLE IF NOT EXISTS pricing_changelog (
  id UUID PK DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,       -- 'plan' | 'addon'
  entity_id TEXT NOT NULL,         -- 'core' / 'accommodation' / etc.
  old_value JSONB NOT NULL,
  new_value JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  reason TEXT,
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- RLS: service role only on pricing_changelog; org-scoped on subscription_composition
ALTER TABLE billing_addons_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "addons_public_read" ON billing_addons_catalog
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "addons_service_role" ON billing_addons_catalog
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE billing_addons_catalog FORCE ROW LEVEL SECURITY;

ALTER TABLE subscription_composition ENABLE ROW LEVEL SECURITY;
CREATE POLICY "composition_org_read" ON subscription_composition
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "composition_service_role" ON subscription_composition
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE subscription_composition FORCE ROW LEVEL SECURITY;

ALTER TABLE pricing_changelog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "changelog_service_role" ON pricing_changelog
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE pricing_changelog FORCE ROW LEVEL SECURITY;

-- Verification DO $$ block per repo convention...
```

**Migration 23 — AI cost tracking (all NULLABLE)**

```sql
-- 23_ai_cost_tracking.sql

-- 1. Agent sessions cost columns (USAGE-09)
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS input_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS output_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS cost_zar_cents INTEGER;
ALTER TABLE agent_sessions ADD COLUMN IF NOT EXISTS model TEXT;

-- 2. AI usage ledger (USAGE-08) — one row per Anthropic call (inc. retries)
CREATE TABLE IF NOT EXISTS ai_usage_ledger (
  id UUID PK DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_session_id UUID REFERENCES agent_sessions(id) ON DELETE SET NULL,
  agent_type TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  cost_zar_cents INTEGER NOT NULL,          -- computed at insert time
  request_id TEXT,                           -- Anthropic response id for dedup
  was_retry BOOLEAN DEFAULT false,
  error TEXT,                                -- non-null on failure (still costs money if partial)
  recorded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX ON ai_usage_ledger (organization_id, recorded_at DESC);
CREATE INDEX ON ai_usage_ledger (recorded_at);

-- 3. Daily cost rollup (USAGE-10 target)
CREATE TABLE IF NOT EXISTS daily_cost_rollup (
  id UUID PK DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rollup_date DATE NOT NULL,
  total_cost_zar_cents INTEGER NOT NULL DEFAULT 0,
  total_input_tokens INTEGER NOT NULL DEFAULT 0,
  total_output_tokens INTEGER NOT NULL DEFAULT 0,
  total_cache_read_tokens INTEGER NOT NULL DEFAULT 0,
  total_cache_write_tokens INTEGER NOT NULL DEFAULT 0,
  call_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (organization_id, rollup_date)
);

-- RLS patterns identical to usage_events — org-scoped select, service_role full, FORCE RLS
ALTER TABLE ai_usage_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_ledger_org_read" ON ai_usage_ledger
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "ai_ledger_service_role" ON ai_usage_ledger
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE ai_usage_ledger FORCE ROW LEVEL SECURITY;

ALTER TABLE daily_cost_rollup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cost_rollup_org_read" ON daily_cost_rollup
  FOR SELECT USING (organization_id = (SELECT public.get_user_org_id()));
CREATE POLICY "cost_rollup_service_role" ON daily_cost_rollup
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');
ALTER TABLE daily_cost_rollup FORCE ROW LEVEL SECURITY;

-- 4. Helper RPC for cost ceiling check (USAGE-06/07 enforcement)
CREATE OR REPLACE FUNCTION get_month_to_date_ai_cost(p_org_id UUID)
RETURNS INTEGER  -- cents
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(cost_zar_cents), 0)::INTEGER
    FROM ai_usage_ledger
   WHERE organization_id = p_org_id
     AND recorded_at >= date_trunc('month', now())
     AND recorded_at <  date_trunc('month', now()) + interval '1 month';
$$;
```

**Migration 24 — Seed data (can run same deploy as 22/23)**

```sql
-- 24_addons_seed.sql
INSERT INTO billing_addons_catalog (id, display_name, kind, price_zar_cents, billing_cycle, payfast_item_code, sort_order) VALUES
  ('setup_fee',       'Setup & Onboarding',       'setup_fee',    149900, 'one_off', 'ONEOFF-SETUP',       1),
  ('topup_posts_100', '100 Extra Social Posts',   'overage_pack',  4900, 'one_off', 'TOPUP-POSTS-100',   2),
  -- ... etc
ON CONFLICT DO NOTHING;
```

### 4.3 Should `subscription_composition` be a TABLE or a JSONB column?

**Recommendation: TABLE (as shown above).**

| Trade-off | Table | JSONB column on organizations |
|-----------|-------|-------------------------------|
| Current-state query | `WHERE effective_to IS NULL` | Single row read |
| History | Native (effective_from/to) | Need separate audit table anyway |
| Addon add/remove velocity | Insert new row, close old | UPDATE in place (lost history unless separate log) |
| Reporting | JOIN-friendly | JSONB unnesting painful |
| Atomic swap on composition change | Transaction with 2 writes | Single UPDATE |

The table pattern enables time-travel queries ("what was tenant X paying on 2026-03-15?") without a separate audit log. Composition history is a first-class requirement for billing disputes.

### 4.4 Backfill requirements

| Column / Table | Backfill needed? | How |
|----------------|------------------|-----|
| `organizations.billing_plan_snapshot` | YES — 8 existing orgs | One-time script: `UPDATE organizations SET billing_plan_snapshot = (SELECT jsonb_build_object('plan_id', plan_id, 'snapshot_at', now(), 'price_zar', bp.price_zar, 'limits', bp.limits) FROM billing_plans bp WHERE bp.id = organizations.plan_id)` |
| `agent_sessions.{input,output,cache_*,cost,model}_tokens` | NO — historical data unrecoverable, leave NULL |
| `ai_usage_ledger` | NO — starts empty |
| `daily_cost_rollup` | NO — starts empty; cron backfills day-by-day |
| `subscription_composition` | YES — for the 8 existing orgs, insert one row each: `{base_plan_id: organizations.plan_id, addon_ids: [], monthly_total = plan price}` |

Backfill scripts go in `scripts/migrations/phase-09/` as numbered `*.ts` runnable via `tsx`. Migration 22 ships empty; backfill happens after deploy; Phase 10 adds `NOT NULL` on `billing_plan_snapshot` once backfill is confirmed (Migration 25+ under Phase 10).

---

## 5. Vercel Cron Slot Audit

### Bottom line
- **`vercel.json` does NOT exist in the repo.** No existing Vercel crons.
- Vercel Hobby tier allows 2 cron jobs, Pro allows up to 20.
- `/api/ops/cost-rollup` (USAGE-10) is the only new cron Phase 09 adds. Fits cleanly in Hobby limits.
- **Existing scheduled job:** `app/api/autopilot/cron/route.ts` — triggered externally (N8N `internal-api-secret`), NOT a Vercel cron. Stays as-is.

### 5.1 Proposed `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/ops/cost-rollup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule reasoning:** 02:00 UTC = 04:00 SAST (off-peak). Run daily for day-N-1 aggregation.

### 5.2 If Hobby limit exhausted (future-proofing)

- **Option A:** Upgrade to Vercel Pro — US$20/mo per member, includes 20 crons. Not needed in v3.0.
- **Option B:** Supabase `pg_cron` extension — runs SQL directly in DB. Free. Already suggested in SUMMARY for scheduled campaigns.
- **Option C:** N8N workflow with schedule trigger. Already have N8N hosting; near-zero marginal cost.

**Recommend:** Stay on Vercel Hobby cron for `/api/ops/cost-rollup` in Phase 09. Reserve `pg_cron` for Phase 10+ when scheduled campaigns + onboarding day-N emails need it.

### 5.3 Cron endpoint security

Vercel crons hit the endpoint directly with `Authorization: Bearer $CRON_SECRET` header. Phase 09 OPS-01 Zod schema must include `CRON_SECRET` as required env. Endpoint pattern:

```typescript
// app/api/ops/cost-rollup/route.ts
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // ... rollup logic
}
```

---

## 6. Env-Var Validation Pattern

### Bottom line
- `lib/config/env.ts` does NOT exist. Zod is installed. Greenfield.
- Pattern: dual `env.server.ts` + `env.client.ts` with Zod schemas; import server schema at the top of `next.config.mjs` to fail Next.js build/boot on missing vars.
- Cross-validation (production requires passphrase) via Zod `.refine()`.
- Singleton export (validate once on module load, cache) for throughout-app reads.

### 6.1 Required env vars (consolidated from codebase + .env.example)

| Var | Required | Where used | Notes |
|-----|----------|------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | ALWAYS | `admin.ts`, `server.ts`, `client.ts` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ALWAYS | `client.ts`, `server.ts` | |
| `SUPABASE_SERVICE_ROLE_KEY` | ALWAYS | `admin.ts` | |
| `NEXT_PUBLIC_APP_URL` | ALWAYS | PayFast URLs, email links | |
| `PAYFAST_MERCHANT_ID` | ALWAYS | `payfast.ts:219` | |
| `PAYFAST_MERCHANT_KEY` | ALWAYS | `payfast.ts:220` | |
| `PAYFAST_PASSPHRASE` | IF `PAYFAST_MODE=production` | `payfast.ts:221` | **OPS-01 cross-validation** |
| `PAYFAST_MODE` | ALWAYS | `payfast.ts:222` | enum `'sandbox' \| 'production'` |
| `PAYFAST_RETURN_URL` | optional | override default |
| `PAYFAST_CANCEL_URL` | optional | override default |
| `PAYFAST_NOTIFY_URL` | optional | override default |
| `ANTHROPIC_API_KEY` | ALWAYS (for AI features) | `base-agent.ts:24` | |
| `RESEND_API_KEY` | ALWAYS | email | |
| `EMAIL_FROM` | ALWAYS | email | |
| `EMAIL_REPLY_TO` | ALWAYS | email | |
| `EMAIL_TRACKING_SECRET` | ALWAYS | HMAC | |
| `INTERNAL_API_SECRET` | ALWAYS | cron auth (`autopilot/cron/route.ts:56`) | |
| `CRON_SECRET` | NEW (Phase 09) | Vercel cron header | |
| `N8N_BASE_URL` | optional | N8N webhooks |
| `N8N_WEBHOOK_*` | optional | per workflow |
| `TELEGRAM_BOT_TOKEN` | optional (ops bot required) | Telegram |
| `TELEGRAM_WEBHOOK_SECRET` | optional | Telegram |
| `FACEBOOK_APP_ID/SECRET`, `LINKEDIN_CLIENT_ID/SECRET` | optional (social module) | OAuth |
| `WHATSAPP_*` | optional (WhatsApp module) | WhatsApp |
| `VERCEL_ENV` | runtime-provided | cross-validation trigger |

### 6.2 Recommended `lib/config/env.ts` pattern

```typescript
import { z } from 'zod'

const requiredBoolStr = z.enum(['true', 'false']).transform(v => v === 'true')

const envSchema = z.object({
  // --- Supabase ---
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // --- App ---
  NEXT_PUBLIC_APP_URL: z.string().url(),
  VERCEL_ENV: z.enum(['development', 'preview', 'production']).optional(),

  // --- PayFast ---
  PAYFAST_MERCHANT_ID: z.string().min(1),
  PAYFAST_MERCHANT_KEY: z.string().min(1),
  PAYFAST_PASSPHRASE: z.string().optional(),
  PAYFAST_MODE: z.enum(['sandbox', 'production']),

  // --- AI ---
  ANTHROPIC_API_KEY: z.string().startsWith('sk-ant-'),

  // --- Email ---
  RESEND_API_KEY: z.string().startsWith('re_'),
  EMAIL_FROM: z.string().email(),
  EMAIL_REPLY_TO: z.string().email(),
  EMAIL_TRACKING_SECRET: z.string().min(32),

  // --- Cron / internal ---
  INTERNAL_API_SECRET: z.string().min(32),
  CRON_SECRET: z.string().min(32),

  // --- Optional integrations (omitted for brevity) ---
}).refine(
  (env) => {
    // Production mode MUST have passphrase
    if (env.PAYFAST_MODE === 'production' && !env.PAYFAST_PASSPHRASE) {
      return false
    }
    return true
  },
  {
    message: 'PAYFAST_PASSPHRASE is required when PAYFAST_MODE=production',
    path: ['PAYFAST_PASSPHRASE'],
  }
).refine(
  (env) => {
    // Vercel production deploy MUST use PayFast production
    if (env.VERCEL_ENV === 'production' && env.PAYFAST_MODE !== 'production') {
      return false
    }
    return true
  },
  {
    message: 'VERCEL_ENV=production requires PAYFAST_MODE=production',
    path: ['PAYFAST_MODE'],
  }
)

function parseEnv() {
  const parsed = envSchema.safeParse(process.env)
  if (!parsed.success) {
    console.error('=== ENVIRONMENT VALIDATION FAILED ===')
    for (const issue of parsed.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    throw new Error('Invalid environment configuration. See errors above.')
  }
  return parsed.data
}

// Validate once at module load
export const env = parseEnv()
export type Env = z.infer<typeof envSchema>
```

### 6.3 Boot-time enforcement

Add to `next.config.mjs`:

```javascript
// Top of file — triggers validation before Next.js starts
import './lib/config/env.js'
// (build step compiles env.ts → env.js)
```

Or, simpler: import `env` in `middleware.ts` — middleware runs before every request and is loaded at boot. If validation throws, the deploy won't accept traffic.

### 6.4 Migrating existing code

Phase 09 does NOT rewrite every `process.env.X` — too risky. Instead:

1. Create `env` export.
2. Add `lib/config/env.ts` import to `middleware.ts` (forces boot-time validation).
3. Migrate HIGH-risk reads (PayFast, Anthropic, Supabase) to `env.X` in Phase 09 touch-files.
4. Lower-risk reads can migrate in later phases.
5. `/api/ops/env-health` endpoint (platform_admin only) reports all env values (masked for secrets) for live diagnosis.

---

## 7. Anthropic Cost Circuit Breaker Pattern

### Bottom line
- Pre-call token estimation uses the official `client.messages.countTokens({...})` method (SDK 0.73+). Verified in Anthropic docs.
- Per-tenant ceiling: query `get_month_to_date_ai_cost(p_org_id)` RPC BEFORE each call, compare to `PER_TIER_CEILING_CENTS[org.plan_id]`.
- Transaction-safety: insert `ai_usage_ledger` row IMMEDIATELY AFTER successful `messages.create()`, BEFORE any other work. If ledger insert fails, log error + retry once; if still fails, raise loud alert but DO NOT block user (money already spent).
- Haiku 4.5 enforcement: override `config.model` in `BaseAgent.run()` at runtime; log when Sonnet/Opus attempted to be used.
- Cache metadata: `response.usage.cache_read_input_tokens` and `response.usage.cache_creation_input_tokens` — both exist in SDK 0.73+.

### 7.1 Pre-call token estimation

```typescript
// Approximate — rough estimation for circuit-breaker pre-check only
// Actual billing uses the response usage fields

const tokenCount = await client.messages.countTokens({
  model: this.config.model!,
  system: this.config.systemPrompt,
  messages: claudeMessages,
})
// tokenCount.input_tokens is a reasonable estimate

const estimatedCost = computeCostCents({
  model: this.config.model!,
  inputTokens: tokenCount.input_tokens,
  outputTokens: this.config.maxTokens ?? 4096,  // worst case
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
})
```

### 7.2 Cost computation (Haiku 4.5 rates)

```typescript
// lib/ai/cost.ts (NEW)
// Rates per 1M tokens in USD, convert to ZAR cents
const USD_PER_ZAR = 0.0602  // 1 / 16.6 (April 2026 FX — surface as env or DB for later adjustment)
const CENTS_PER_ZAR = 100

type ModelPricing = {
  inputPerM: number        // USD
  outputPerM: number
  cacheReadPerM: number
  cacheWritePerM: number
}

const MODEL_PRICING: Record<string, ModelPricing> = {
  'claude-haiku-4-5': {
    inputPerM: 1.0, outputPerM: 5.0,
    cacheReadPerM: 0.1, cacheWritePerM: 1.25,
  },
  'claude-sonnet-4-5-20250929': {
    inputPerM: 3.0, outputPerM: 15.0,
    cacheReadPerM: 0.3, cacheWritePerM: 3.75,
  },
  // ... others
}

export function computeCostCents(args: {
  model: string
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}): number {
  const p = MODEL_PRICING[args.model] ?? MODEL_PRICING['claude-haiku-4-5']
  const usd = (
    (args.inputTokens / 1_000_000) * p.inputPerM +
    (args.outputTokens / 1_000_000) * p.outputPerM +
    (args.cacheReadTokens / 1_000_000) * p.cacheReadPerM +
    (args.cacheWriteTokens / 1_000_000) * p.cacheWritePerM
  )
  const zarCents = Math.round(usd * (1 / USD_PER_ZAR) * CENTS_PER_ZAR)
  return zarCents
}
```

### 7.3 Per-tier ceilings (USAGE-06)

```typescript
// lib/ai/ceilings.ts (NEW)
export const AI_CEILING_ZAR_CENTS: Record<string, number> = {
  core:   15000,   // R150
  growth: 40000,   // R400
  scale: 150000,   // R1,500
}
```

### 7.4 BaseAgent integration (pseudocode)

```typescript
// In BaseAgent.run(), insert before client.messages.create():

// 1. USAGE-06/07: Check ceiling
if (options.organizationId) {
  const { data: monthToDate } = await supabase.rpc(
    'get_month_to_date_ai_cost',
    { p_org_id: options.organizationId }
  )
  const { data: org } = await supabase
    .from('organizations').select('plan_id').eq('id', options.organizationId).single()
  const ceilingCents = AI_CEILING_ZAR_CENTS[org.plan_id] ?? AI_CEILING_ZAR_CENTS.core
  if (monthToDate >= ceilingCents) {
    throw new AiCeilingExceededError(options.organizationId, ceilingCents, monthToDate)
  }
}

// 2. USAGE-12: Enforce Haiku default (non-silent override)
const enforcedModel = (this.config.model?.startsWith('claude-haiku') ?? false)
  ? this.config.model!
  : (() => {
      console.warn(`[BaseAgent] ${this.config.agentType} configured with ${this.config.model}; overriding to Haiku 4.5`)
      return 'claude-haiku-4-5'
    })()

// 3. USAGE-01: guardUsage
if (options.organizationId) {
  const { data } = await recordUsage(options.organizationId, 'ai_generations', 1)
  if (!data?.allowed) throw new UsageCapExceededError('ai_generations')
}

// 4. The actual call
const response = await client.messages.create({
  model: enforcedModel,
  max_tokens: this.config.maxTokens!,
  temperature: this.config.temperature,
  system: this.config.systemPrompt,  // Phase 10 extends to array-of-blocks
  messages: claudeMessages,
})

// 5. USAGE-08: Ledger insert (AFTER success, BEFORE session update)
const cost = computeCostCents({
  model: enforcedModel,
  inputTokens: response.usage.input_tokens ?? 0,
  outputTokens: response.usage.output_tokens ?? 0,
  cacheReadTokens: response.usage.cache_read_input_tokens ?? 0,
  cacheWriteTokens: response.usage.cache_creation_input_tokens ?? 0,
})

await supabase.from('ai_usage_ledger').insert({
  organization_id: options.organizationId,
  agent_session_id: sessionId,
  agent_type: this.config.agentType,
  model: enforcedModel,
  input_tokens: response.usage.input_tokens ?? 0,
  output_tokens: response.usage.output_tokens ?? 0,
  cache_read_tokens: response.usage.cache_read_input_tokens ?? 0,
  cache_write_tokens: response.usage.cache_creation_input_tokens ?? 0,
  cost_zar_cents: cost,
  request_id: response.id,
})

// 6. Existing session update (add cost + token fields)
await supabase.from('agent_sessions').update({
  messages: newMessages,
  tokens_used: totalTokens,
  input_tokens: (existingSession?.input_tokens ?? 0) + (response.usage.input_tokens ?? 0),
  output_tokens: (existingSession?.output_tokens ?? 0) + (response.usage.output_tokens ?? 0),
  cache_read_tokens: (existingSession?.cache_read_tokens ?? 0) + (response.usage.cache_read_input_tokens ?? 0),
  cache_write_tokens: (existingSession?.cache_write_tokens ?? 0) + (response.usage.cache_creation_input_tokens ?? 0),
  cost_zar_cents: (existingSession?.cost_zar_cents ?? 0) + cost,
  model: enforcedModel,
  status: 'completed',
  result: parsedResult,
}).eq('id', sessionId)
```

### 7.5 Transaction safety on ledger write failure

```typescript
try {
  await supabase.from('ai_usage_ledger').insert({ ... })
} catch (err) {
  // Loud alert path — money was spent but we couldn't record it
  console.error('[CRITICAL] ai_usage_ledger insert failed after successful Anthropic call', {
    orgId: options.organizationId,
    requestId: response.id,
    costCents: cost,
    error: err,
  })
  // Send Telegram alert to ops channel (non-blocking)
  void notifyOpsChannel(`AI ledger insert FAILED for org ${options.organizationId} — cost ${cost}c leaked`)
  // Do NOT rethrow — user response must complete; we'll reconcile via daily audit cron
}
```

Phase 12 has a reconciliation cron that diffs Anthropic usage API vs `ai_usage_ledger` — that catches orphaned calls.

### 7.6 Haiku 4.5 model ID verification

**MEDIUM confidence.** The research SUMMARY uses `'claude-haiku-4-5'` (no date suffix). Anthropic model IDs are typically date-suffixed in production (e.g., `claude-sonnet-4-5-20250929`). The correct exact ID for Haiku 4.5 GA should be verified against `https://platform.claude.com/docs/en/docs/about-claude/models` BEFORE pinning. For v3.0:

- **Safe option:** Use `'claude-haiku-4-5'` — Anthropic accepts partial prefix, returns latest GA.
- **Pin option (preferred):** Use exact date-suffixed ID. Read from Anthropic docs in Phase 09 task verification step.

Log the `response.model` field (actual model used, returned by API) in `ai_usage_ledger.model` for truth-of-what-ran.

---

## 8. 50-Concurrent-Request Test Pattern (USAGE-05)

### Bottom line
- **Postgres-level integration test** against a real test DB is the correct approach. Mocked-RPC unit test proves nothing about race conditions.
- Use Vitest + `pg` client OR supabase-js directly.
- Atomicity of `record_usage_event` is NOT guaranteed by the current RPC implementation (see 3.4 caveat) — test may REVEAL a real bug. Be prepared to fix the RPC by wrapping in `FOR UPDATE` lock or serializable isolation.

### 8.1 Test shape

```typescript
// __tests__/integration/usage/guard-usage-race.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_SERVICE_ROLE_KEY!
)

describe('record_usage_event atomicity under concurrency', () => {
  const TEST_ORG_ID = '00000000-0000-0000-0000-000000000099'
  const METRIC = 'ai_generations'
  const LIMIT = 50

  beforeAll(async () => {
    // Ensure test org on a plan with ai_generations=50
    await supabase.from('organizations').upsert({
      id: TEST_ORG_ID,
      name: 'race-test',
      plan_id: 'core',  // core limit: ai_generations=50
      subscription_tier: 'core',
      subscription_status: 'active',
      owner_id: TEST_ORG_ID,
    })
    // Zero out prior usage
    await supabase.from('usage_events').delete().eq('organization_id', TEST_ORG_ID)
  })

  afterAll(async () => {
    await supabase.from('usage_events').delete().eq('organization_id', TEST_ORG_ID)
  })

  it('exactly LIMIT requests succeed when 50 fire concurrently at cap boundary', async () => {
    // Fire 50 parallel RPC calls
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        supabase.rpc('record_usage_event', {
          p_org_id: TEST_ORG_ID,
          p_metric: METRIC,
          p_quantity: 1,
        })
      )
    )
    const allowed = results.filter(r => (r.data as { allowed: boolean })?.allowed).length
    const denied = results.filter(r => !(r.data as { allowed: boolean })?.allowed).length

    expect(allowed).toBe(50)
    expect(denied).toBe(0)

    // Verify DB reflects exactly 50 rows
    const { count } = await supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', TEST_ORG_ID)
    expect(count).toBe(50)
  })

  it('51st call fails cleanly after cap reached', async () => {
    const { data } = await supabase.rpc('record_usage_event', {
      p_org_id: TEST_ORG_ID,
      p_metric: METRIC,
      p_quantity: 1,
    })
    expect(data).toMatchObject({ allowed: false, current: 50, limit: 50, remaining: 0 })
  })

  it('overshoot test: 100 concurrent at cap 50 must allow EXACTLY 50', async () => {
    // Reset
    await supabase.from('usage_events').delete().eq('organization_id', TEST_ORG_ID)

    const results = await Promise.all(
      Array.from({ length: 100 }, () =>
        supabase.rpc('record_usage_event', {
          p_org_id: TEST_ORG_ID,
          p_metric: METRIC,
          p_quantity: 1,
        })
      )
    )
    const allowed = results.filter(r => (r.data as { allowed: boolean })?.allowed).length
    expect(allowed).toBe(50)  // EXACT — no overflow, no underflow

    const { count } = await supabase
      .from('usage_events')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', TEST_ORG_ID)
    expect(count).toBe(50)
  })
})
```

### 8.2 Expected test behavior + remediation if it fails

Under current `record_usage_event` implementation (READ COMMITTED, SELECT-then-INSERT):

**Likely outcome:** The `overshoot test` will show `allowed > 50` (e.g., 52-55) under concurrent load because two transactions read the same `v_current` before either inserts.

**Remediation options (rank-ordered):**

1. **Advisory lock** — cheapest. Add `PERFORM pg_advisory_xact_lock(hashtext('usage_' || p_org_id || '_' || p_metric))` at top of RPC. Serializes per-org-per-metric, not global.
2. **Serializable transaction** — wrap the RPC in `BEGIN ISOLATION LEVEL SERIALIZABLE`. Retry-on-serialization-failure at caller. Higher overhead.
3. **INSERT-then-check pattern** — always insert event, then delete if post-insert SUM > limit. Wasteful.
4. **Dedicated counter table with `UPDATE ... RETURNING`** — atomic by design. Requires schema change.

**Phase 09 recommendation:** If test fails, patch with option 1 (advisory lock) in migration 22 or a follow-up 22b. Minimal code change, proven pattern. Re-run test to confirm.

### 8.3 Running the test locally

```bash
# Spin up a test Supabase branch OR use a dedicated test project
export SUPABASE_TEST_URL=<branch_url>
export SUPABASE_TEST_SERVICE_ROLE_KEY=<key>
pnpm vitest run __tests__/integration/usage/guard-usage-race.test.ts
```

Add to CI: gate merges to main on this test passing.

---

## 9. Open Questions for Planning

1. **PayFast adhoc endpoint cents-vs-rands, dedup behavior, and sandbox URL pattern.** Resolved by 1-day sandbox spike (BILL-02-SPIKE task in Phase 09, day 1).
2. **PayFast subscription-amendment update path — does `PUT /update` support changing `amount`?** If NO, cancel-and-recreate is mandatory (adds subscription-continuity UX work). Verify in same spike.
3. **`record_usage_event` race under 100 concurrent calls.** Resolved by USAGE-05 test; remediation path already scoped (section 8.2).
4. **Anthropic Haiku 4.5 exact model ID for pinning.** Resolved by reading `https://platform.claude.com/docs/en/docs/about-claude/models` during Phase 09 task BILL/USAGE-12.
5. **Existing 8 orgs classification (test/dormant/paying).** Pre-migration inventory. Chris produces list before migration 22 runs.
6. **`client_usage_metrics` column-name mismatch** (`monthly_posts_used` vs `posts_monthly`). Does the webhook UPDATE actually work, or is it silently failing today? Audit task: run on prod DB `SELECT posts_monthly FROM client_usage_metrics WHERE reset_date > now() - interval '7 days'` — if zero rows have non-zero values, webhook has been broken. Fix OR delete the reset code entirely (since we're migrating to `usage_events` anyway).
7. **Current webhook writes `pf_payment_id` to `organizations.payfast_subscription_token`.** Confirm with PayFast docs: is the subscription token a DIFFERENT field in ITN payload (`token` or `pf_subscription_token`)? If so, webhook bug dates back to initial implementation and no existing org has a usable subscription token for amendment — meaning cancel-and-recreate requires capturing the token correctly on NEXT payment first.
8. **Cost ceiling enforcement semantics at boundary:** If org's month-to-date is R149.99 and next call estimated at R1.00, do we allow (overshoot by small amount) or deny (under-deliver on already-consumed value)? Recommend allow-then-block-next — consistent with usage-cap pattern in SUMMARY pitfall #9.

---

## 10. Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| Codebase truth (files read in section 1) | **HIGH** | Direct file reads; cross-referenced with grep of call sites |
| Supabase schema reality (section 3) | **HIGH** | Read migrations 00, 05, 10, 11, 12 directly |
| Anthropic SDK usage fields | **HIGH** | Confirmed via platform.claude.com/docs/prompt-caching |
| Zod env validation pattern (section 6) | **HIGH** | Standard pattern, well-documented; Zod installed |
| Migration sequence + multi-step discipline (section 4) | **HIGH** | PostgreSQL best practice; all additions are NULLABLE, no destructive DDL |
| 50-concurrent test pattern (section 8) | **HIGH** on test shape; **MEDIUM** on pass/fail prediction — RPC atomicity is a defensible concern but not verified against prod traffic |
| PayFast ad-hoc endpoint URL | **MEDIUM-HIGH** | PHP SDK usage confirmed `/adhoc` suffix; full URL assembly cross-referenced. Sandbox host pattern conflicting |
| PayFast subscription `update` supports `amount` change | **LOW** | Not verified in any source. Must be spiked. Fallback (cancel-and-recreate) already planned |
| Haiku 4.5 exact model ID | **MEDIUM** | Research SUMMARY says `claude-haiku-4-5`; Anthropic may require date suffix. Verify in Phase 09 task |
| Current webhook `payfast_subscription_token` population correctness | **LOW** | Source code sets it to `pf_payment_id`, which is per-transaction not per-subscription. Likely bug; verify with ITN sample |
| Client_usage_metrics column-name mismatch (monthly_X_used vs X_monthly) | **HIGH** on existence; **LOW** on runtime impact — needs prod DB query to confirm silent failure |

**Overall confidence: HIGH** for the structural recommendations and the migration plan. **MEDIUM** on two PayFast specifics (adhoc mechanics, amendment amount support) — both mitigated by the 1-day spike Phase 09 already budgets. **LOW** on two side-findings that should be planning inputs but do NOT block Phase 09 scope: legacy webhook token bug, legacy usage-metric column-name bug.

---

## Metadata

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days; PayFast API + Anthropic pricing stable; shorter if Anthropic ships Haiku 4.6)
**Companion files read:**
- `lib/payments/payfast.ts`
- `lib/billing/plans.ts`
- `lib/billing/subscriptions.ts`
- `lib/usage/meter.ts`, `limits.ts`, `types.ts`
- `lib/tier/feature-gate.ts`
- `lib/agents/base-agent.ts`, `types.ts`
- `lib/supabase/admin.ts`
- `app/api/webhooks/payfast/route.ts`
- `app/api/autopilot/cron/route.ts`
- `supabase/migrations/00_initial_schema.sql` (relevant sections)
- `supabase/migrations/05_leads_and_agents.sql`
- `supabase/migrations/10_shared_db_foundation.sql`
- `supabase/migrations/11_billing_plans.sql`
- `supabase/migrations/12_usage_metering.sql`
- `.planning/research/SUMMARY.md`
- `.env.example`
- `package.json`

**External sources:**
- [Anthropic Prompt Caching Documentation](https://platform.claude.com/docs/en/docs/build-with-claude/prompt-caching) — cache field names, Haiku 4.5 4096-token minimum (HIGH confidence)
- [PayFast PHP SDK README](https://github.com/Payfast/payfast-php-sdk) — `$api->subscriptions->adhoc(token, {amount, item_name})` usage pattern (MEDIUM-HIGH)
- [Payfast API Node.js signature function](https://dev.to/greggcbs/payfast-api-nodejs-signature-and-headers-function-1m92) — header structure + signature algorithm (HIGH)
- Web search confirming `https://api.payfast.co.za/subscriptions/{token}/adhoc` path (MEDIUM)

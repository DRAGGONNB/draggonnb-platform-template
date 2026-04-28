---
phase: 12
plan_id: 12-04
title: BILL-08 + OPS-02/03/04 reconciliation, audit, monitor crons + env-health
wave: 2
depends_on: [12-03]
files_modified:
  - app/api/ops/billing-reconcile/route.ts
  - app/api/ops/feature-gate-audit/route.ts
  - app/api/ops/token-expiry-monitor/route.ts
  - app/api/ops/env-health/route.ts
  - lib/ops/billing-reconcile.ts
  - lib/ops/feature-gate-audit.ts
  - lib/ops/token-expiry-monitor.ts
  - lib/auth/impersonation.ts
  - n8n/wf-ops-billing-reconcile.json
  - n8n/wf-ops-feature-gate-audit.json
  - n8n/wf-ops-token-expiry-monitor.json
  - __tests__/ops/billing-reconcile.test.ts
  - __tests__/ops/feature-gate-audit.test.ts
  - __tests__/ops/token-expiry-monitor.test.ts
autonomous: true
estimated_loc: 700
estimated_dev_minutes: 240
---

## Objective

Stand up four cron-driven operational checks that protect the platform after first paying clients land:

1. **BILL-08** — nightly billing reconciliation: compare every active org's PayFast subscription amount vs the local `billing_plan_snapshot` total. Drift → Telegram alert with org_id + amounts + last-known-good snapshot.
2. **OPS-02** — daily feature-gate audit: for every gated capability (admin routes, module-locked routes, tier-locked agents), verify each is blocked at all 3 layers (middleware redirect/403 + API route guard + DB RLS). Misconfiguration → Telegram alert.
3. **OPS-03** — daily token expiry monitor: scan stored Facebook + LinkedIn OAuth tokens (in `oauth_tokens` or wherever they live). If any expire within 7 days, Telegram alert with refresh link.
4. **OPS-04** — `/api/ops/env-health` endpoint: returns env validation status (pulled from existing `lib/config/env.ts` Zod schema). Masks secret values (just keys + presence).

All 4 are HTTP routes triggered by N8N workflow crons. Pattern proven by USAGE-10 (`/api/ops/cost-rollup` — Phase 09).

## must_haves

**Truths:**
- A nightly cron POSTs to `/api/ops/billing-reconcile`. For each org with `subscription_status='active'`, the route fetches PayFast subscription amount (via PayFast API), compares to local snapshot total, and writes a row to `billing_reconcile_runs` with `status` (ok | drift | error). Drift cases trigger a Telegram alert via the existing `lib/campaigns/telegram-alerts.ts` channel (or a new ops-alerts file if more semantically appropriate).
- A daily cron POSTs to `/api/ops/feature-gate-audit`. For each gated capability registered in a manifest (`lib/ops/gated-capabilities.ts`), the route confirms (a) middleware blocks an unauthenticated request, (b) the API route returns 403 for an authenticated-but-ungated user, (c) the DB RLS denies a direct query. Any misconfiguration logged + Telegram alert.
- A daily cron POSTs to `/api/ops/token-expiry-monitor`. Reads OAuth tokens from storage, computes days-until-expiry, alerts on any ≤ 7 days. Per-token alert content includes refresh URL.
- `/api/ops/env-health` returns `200 { ok: true, validated: ['NEXT_PUBLIC_SUPABASE_URL', ...], missing: [...] }` where `validated` is the list of env keys present and passing Zod, `missing` is the list of required keys missing or invalid. NEVER returns secret values.

**Artifacts:**
- 4 API routes under `app/api/ops/`.
- 3 N8N workflow files in `n8n/`.
- 3 supporting libs in `lib/ops/` for the reconcile / audit / monitor logic (so the routes are thin glue).
- Unit tests for the 3 cron endpoints.

**Key links:**
- Telegram alert channel reused — DO NOT create a parallel Telegram bot. Use `lib/campaigns/telegram-alerts.ts` or add an `ops-alerts.ts` next to it that imports the same `sendTelegramMessage` primitive.
- N8N workflow auth — each cron POST must include the `N8N_CALLBACK_SECRET` header (existing pattern, see Phase 11 N8N workflows). Routes verify the header before executing.
- `/api/ops/env-health` does NOT take auth — it's a Vercel/uptime probe target. But it MUST mask secret values; the response should be safe to leak.
- BILL-08 cron uses the SAME PayFast client as the ITN webhook to avoid two implementations of subscription-amount fetching.

## Tasks

<task id="1">
  <title>Build BILL-08 billing reconciliation cron + lib + N8N workflow</title>
  <files>
    app/api/ops/billing-reconcile/route.ts
    lib/ops/billing-reconcile.ts
    n8n/wf-ops-billing-reconcile.json
    __tests__/ops/billing-reconcile.test.ts
    supabase/migrations/53_billing_reconcile_runs_table.sql
  </files>
  <actions>
    1. Migration `53_billing_reconcile_runs_table.sql`:
       ```sql
       CREATE TABLE IF NOT EXISTS billing_reconcile_runs (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
         run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
         payfast_amount_cents INTEGER,
         local_snapshot_total_cents INTEGER NOT NULL,
         drift_cents INTEGER GENERATED ALWAYS AS (COALESCE(payfast_amount_cents, 0) - local_snapshot_total_cents) STORED,
         status TEXT NOT NULL CHECK (status IN ('ok', 'drift', 'error', 'no_subscription')),
         error_message TEXT,
         alert_sent_at TIMESTAMPTZ
       );
       ALTER TABLE billing_reconcile_runs ENABLE ROW LEVEL SECURITY;
       ALTER TABLE billing_reconcile_runs FORCE ROW LEVEL SECURITY;
       CREATE POLICY "service_role_full" ON billing_reconcile_runs FOR ALL TO service_role USING (true);
       CREATE INDEX idx_recon_org_run ON billing_reconcile_runs(organization_id, run_at DESC);
       ```

    2. `lib/ops/billing-reconcile.ts` exports `reconcileOrg(orgId): Promise<ReconcileResult>`:
       - Reads `organizations.billing_plan_snapshot` and `payfast_subscription_token`.
       - If no subscription token → returns `{ status: 'no_subscription' }`.
       - Else fetches PayFast subscription detail via PayFast API (use the same client helper used by Phase 09 ITN handler — likely in `lib/payfast/`). Compute PayFast amount in cents.
       - Sums local snapshot: base + modules + add-ons (snapshot is JSONB; iterate items, sum prices).
       - Returns `{ status: 'ok' | 'drift', payfastCents, localCents, driftCents }`.
       - On any error path, returns `{ status: 'error', errorMessage }`.

    3. `app/api/ops/billing-reconcile/route.ts` — POST handler:
       - Verify `x-n8n-secret` header matches `N8N_CALLBACK_SECRET`.
       - Query `organizations` for `subscription_status='active'`.
       - For each org, call `reconcileOrg(orgId)`, insert result into `billing_reconcile_runs`.
       - For drift rows, send Telegram alert with org name, amounts, drift, link to org admin page. Set `alert_sent_at`.
       - Return JSON summary `{ total, ok, drift, error, no_subscription }`.

    4. `n8n/wf-ops-billing-reconcile.json` — N8N workflow that runs at 02:30 SAST (00:30 UTC) and POSTs to `/api/ops/billing-reconcile` with the secret header.

    5. Test in `__tests__/ops/billing-reconcile.test.ts`:
       - mock `fetch` for PayFast API; mock supabase admin client.
       - case: snapshot total = PayFast amount → status `ok`.
       - case: snapshot R599 + module R1199 = R1798 vs PayFast R599 → status `drift` with `driftCents = -119900`.
       - case: PayFast 500 → status `error`.
       - case: no subscription_token → status `no_subscription`.
  </actions>
  <verification>
    - `npm test -- billing-reconcile` passes 4+ tests.
    - Migration 53 applies; `\d billing_reconcile_runs` shows columns.
    - Manual: hit `/api/ops/billing-reconcile` with the secret header in the staging branch; row created in `billing_reconcile_runs`.
  </verification>
</task>

<task id="2">
  <title>Build OPS-02 feature-gate audit + OPS-03 token-expiry monitor + N8N workflows</title>
  <files>
    app/api/ops/feature-gate-audit/route.ts
    app/api/ops/token-expiry-monitor/route.ts
    lib/ops/feature-gate-audit.ts
    lib/ops/token-expiry-monitor.ts
    lib/ops/gated-capabilities.ts
    n8n/wf-ops-feature-gate-audit.json
    n8n/wf-ops-token-expiry-monitor.json
    __tests__/ops/feature-gate-audit.test.ts
    __tests__/ops/token-expiry-monitor.test.ts
  </files>
  <actions>
    OPS-02 — feature gate audit:
    1. `lib/ops/gated-capabilities.ts` defines a manifest of every gated capability:
       ```typescript
       export interface GatedCapability {
         id: string                      // e.g. 'admin.cost-monitoring'
         middlewareGuard: 'admin' | 'platform_admin' | 'feature' | 'tier'
         apiRoute?: string               // e.g. '/api/admin/cost-rollup'
         dbCheck?: { table: string; rlsPolicy: string }
         tierRequired?: string
         moduleRequired?: string
       }
       export const GATED_CAPABILITIES: GatedCapability[] = [
         { id: 'admin.cost-monitoring', middlewareGuard: 'platform_admin', apiRoute: '/api/admin/cost-rollup', dbCheck: { table: 'daily_cost_rollup', rlsPolicy: 'platform_admin_only' } },
         { id: 'crm.lead_scoring', middlewareGuard: 'feature', tierRequired: 'scale', moduleRequired: 'crm' },
         { id: 'campaigns.create', middlewareGuard: 'feature', moduleRequired: 'campaigns' },
         { id: 'accommodation.rates', middlewareGuard: 'feature', moduleRequired: 'accommodation' },
         // ... initially seed with 6-8 highest-risk capabilities; future tasks extend.
       ]
       ```
    2. `lib/ops/feature-gate-audit.ts` exports `auditCapability(cap: GatedCapability)` that:
       - Synthesises an unauthenticated fetch to `cap.apiRoute` if defined; expects 401 or 3xx redirect to /login.
       - Synthesises an authenticated-but-not-entitled fetch (use a known-baseline test user — `tester-starter@draggonnb.test` for module checks); expects 403.
       - For `dbCheck`, runs a query as that test user via the user-scoped supabase client; expects empty result or RLS error.
       - Returns `{ capabilityId, layer1: ok|fail, layer2: ok|fail, layer3: ok|fail, errorDetail? }`.

       **Cron-time impersonation contract** (the cron has no browser session, so cannot acquire a normal user JWT):
       - The audit calls each gated route with `Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}` + `x-impersonate-user: tester-starter@draggonnb.test` header.
       - A small helper `lib/auth/impersonation.ts` exports `resolveImpersonatedUser(req): Promise<{ userId, orgId, role, modules } | null>` which:
         - Returns `null` unless the bearer token EXACTLY equals `SUPABASE_SERVICE_ROLE_KEY` (constant-time compare via `crypto.timingSafeEqual`).
         - Reads `x-impersonate-user` header → looks up the user in `auth.users` via admin client → joins `organization_users` + `tenant_modules` to get role + active modules.
         - Returns the resolved identity for use by route guards.
       - Gated route guards (the existing `getUserOrg`/middleware checks) consult `resolveImpersonatedUser` BEFORE falling through to normal session auth: if a service-role-impersonated identity is present, gate as if that user were authenticated. Otherwise normal flow.
       - For `dbCheck` (RLS layer), the audit uses a service-role admin client but explicitly runs the query with `SET LOCAL request.jwt.claims = '{"sub":"<impersonated-user-id>","role":"authenticated"}'` inside a transaction — this lets `get_user_org_id()` return the impersonated user's org and surfaces a real RLS denial (or empty result) without bypassing RLS via service-role.
       - **Security note:** `x-impersonate-user` is HONORED ONLY when the bearer is the service-role key, which is server-side only and never reaches the browser. A leaked anon key cannot trigger impersonation. Document this contract at the top of `lib/auth/impersonation.ts` so future work doesn't widen the trust surface.

    3. `app/api/ops/feature-gate-audit/route.ts` — POST handler verifies N8N secret, runs `auditCapability` for each in the manifest, aggregates failures, sends Telegram alert if any fails.
    4. N8N workflow runs at 03:00 SAST.
    5. Tests: stub fetch + supabase; assert layer-by-layer outcomes for at least 2 capabilities.

    OPS-03 — token expiry monitor:
    1. `lib/ops/token-expiry-monitor.ts` exports `findExpiringTokens(daysAhead = 7)`:
       - Queries the OAuth token storage (grep for `oauth_tokens` table, or `social_accounts`, or `meta_oauth_tokens` — use whichever Phase 08 introduced).
       - Returns rows where `expires_at < NOW() + INTERVAL '7 days'`.
    2. `app/api/ops/token-expiry-monitor/route.ts` — POST handler iterates expiring tokens, sends one Telegram alert per token with provider + org_id + days_remaining + refresh URL.
    3. N8N workflow runs at 04:00 SAST.
    4. Test: stub supabase; assert alerts triggered for tokens within 7d, NOT for tokens >7d.
  </actions>
  <verification>
    - `npm test -- feature-gate-audit` passes ≥3 tests.
    - `npm test -- token-expiry-monitor` passes ≥2 tests.
    - Manual: trigger each route in staging; confirm Telegram alert receives a sample message (or capture the would-be alert in the response payload for offline verification if Telegram bot tokens are not in staging).
  </verification>
</task>

<task id="3">
  <title>Build OPS-04 env-health endpoint</title>
  <files>
    app/api/ops/env-health/route.ts
  </files>
  <actions>
    `app/api/ops/env-health/route.ts` — GET handler (no auth required; safe to leak):
    ```typescript
    import { NextResponse } from 'next/server'
    import { envSchema } from '@/lib/config/env'

    export async function GET() {
      const result = envSchema.safeParse(process.env)
      if (result.success) {
        return NextResponse.json({
          ok: true,
          validated: Object.keys(result.data),  // KEYS only — no values
          missing: [],
        })
      }
      const missing = result.error.issues.map(i => i.path.join('.'))
      const validatedKeys = Object.keys(envSchema.shape).filter(k => !missing.includes(k))
      return NextResponse.json(
        { ok: false, validated: validatedKeys, missing },
        { status: 503 }
      )
    }
    ```

    Confirm `lib/config/env.ts` exports `envSchema` (it does per OPS-01 — Phase 09). If the schema is wrapped in another helper, refactor minimally to expose the raw Zod schema for reuse here.

    Add to `__tests__/ops/env-health.test.ts`:
    - case: all required env present → returns 200 with `ok: true`, `validated.length > 0`, no values present in response body.
    - case: simulate missing `ANTHROPIC_API_KEY` → returns 503 with `missing: ['ANTHROPIC_API_KEY']`.
    - case: response body must NEVER contain a value matching a Zod-validated env (assert no `.startsWith('sk-')`, no `.startsWith('payfast')`, etc).

    Document the endpoint in `docs/modules/` or in a brief comment at top of the route file: "Vercel uptime probe + Status page can hit this. No auth required by design — body is safe to leak."
  </actions>
  <verification>
    - `npm test -- env-health` passes 3+ tests.
    - Manual: hit `/api/ops/env-health` in staging; response body has `validated` array of keys + (hopefully empty) `missing` array. No values leak.
    - Body contains zero substrings matching production secrets (assert via grep on the response).
  </verification>
</task>

## Verification

- `npm run build` clean.
- `npm test -- ops` passes all 4 cron-related test files.
- 3 N8N workflows committed; activation to be done manually post-deploy (per the existing N8N activation pattern documented in STATE.md for Phase 11 — no MCP, manual import + activate).
- Migration 53 applies cleanly.
- `/api/ops/env-health` returns a known-good response in staging.

## Out of scope

- Building a UI surface for the cron results. The reconcile/audit/monitor outputs go to Telegram + DB; visualisation is v3.1.
- Adding more gated capabilities beyond the initial 6-8 seeded in the manifest. The manifest is extensible — future plans add more entries.
- Auto-refreshing OAuth tokens on detection. OPS-03 is alert-only; refresh remains manual until Meta credentials issue is resolved.
- Backfilling historical reconcile runs. Cron starts producing rows from first nightly execution.

## REQ-IDs closed

- BILL-08 (Billing-reconciliation nightly cron compares PayFast subscription amount vs local composition total; alerts on drift)
- OPS-02 (Feature-gate audit daily cron verifies every gated capability is blocked at three layers)
- OPS-03 (Token expiry monitor cron checks Facebook + LinkedIn OAuth tokens 7 days before expiry)
- OPS-04 (`/api/ops/env-health` endpoint returns current environment validation status, masked)

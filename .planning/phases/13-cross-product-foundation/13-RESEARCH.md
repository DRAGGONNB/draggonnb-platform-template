# Phase 13: Cross-Product Foundation — Research

**Researched:** 2026-05-01
**Domain:** SSO JWT bridge, module manifests, @supabase/ssr upgrade, private npm packages, provisioning saga
**Confidence:** HIGH on codebase grounding, SSO architecture, manifest design, STACK upgrades. MEDIUM on PayFast sandbox behavior (sandbox spike GATE-02 is the first deliverable to resolve this).

---

## Key Decisions for the Planner (Summary at Top)

| Decision | Locked Answer |
|----------|---------------|
| SSO algorithm | HS256 (single shared secret `SSO_BRIDGE_SECRET`). ES256 deferred to v3.2 when cross-domain SSO for `swazulu.com` activates (D1). |
| jti TTL | 60 seconds max, single-use. DB-backed `sso_bridge_tokens` table, NOT Redis (D7). |
| Token delivery | URL fragment `#token=...`, Referrer-Policy `no-referrer`. NEVER query string. |
| Replay protection mechanism | `sso_bridge_tokens(jti UUID PK, user_id, issued_at, consumed_at NULLABLE, expires_at)` table. Lookup by jti on consume; if `consumed_at IS NOT NULL` → 401 + audit row. |
| Cross-product auth scope | `tenant_membership_proof` middleware runs BEFORE `getUserOrg()` on every protected route in both apps. No row = 403. No auto-create. |
| Org link shape | Two tables: `organizations.linked_trophy_org_id UUID NULL` (column for fast lookup) + `cross_product_org_links(id, draggonnb_org_id, trophy_org_id, status, created_at)` junction (for future multi-farm). Both written on saga step 10. |
| `@supabase/ssr` upgrade | DraggonnB: `0.1.0` → `0.10.2`. Requires `get/set/remove` → `getAll/setAll` refactor in `lib/supabase/server.ts` + `lib/supabase/middleware.ts`. Trophy: `0.9.0` → `0.10.2` already uses `getAll/setAll` (no change needed). |
| `jose` version | `^5.x` (current: 5.x). Add to DraggonnB, Trophy, and federation-shared package. |
| federation-shared package | Published at `@draggonnb/federation-shared` on GitHub Packages. Scoped to `@draggonnb`. Hard 200 LOC cap. Both products pin exact version (no `^`). |
| Manifest location | `lib/modules/{name}/manifest.ts` per module. Type contract at `lib/modules/types.ts`. Discovered by explicit import array (NOT filesystem glob). |
| PayFast amount unit | **UNCONFIRMED** — spike GATE-02 resolves this. Existing `chargeAdhoc()` sends RANDS (L37 in `payfast-adhoc.ts`). Spike must confirm whether ad-hoc endpoint interprets amounts in rands (consistent with PayFast form-based integration) or cents. |
| Sub-plan decomposition | 7 plans (not 5 or 6). See Section 10. |

---

## 1. GATE-02 PayFast Sandbox Spike Methodology

### What exactly must be confirmed

The spike exists because `chargeAdhoc()` has an open comment at L37 in `lib/payments/payfast-adhoc.ts`:

```
// Send rands with 2 decimal places (spike pending in 09-04 to confirm unit)
const amountRands = (args.amountCents / 100).toFixed(2)
```

The 09-04 spike never fully executed against a live sandbox. Phase 15 damage code will call `chargeAdhoc()` with a damage amount — if the unit assumption is wrong, guests are overcharged by 100× or undercharged. This is a production financial correctness issue.

**Three questions to confirm:**

1. **Amount unit** — Does PayFast ad-hoc endpoint `/subscriptions/{token}/adhoc` expect the amount as rands (e.g., `"250.00"` for R250) or cents (e.g., `250` for R250)? The form-based integration in `payfast.ts` uses rands. The API-based adhoc call is not yet validated. Current implementation sends rands. The spike must prove this is correct OR identify the bug and document the fix.

2. **Subscribe-token charge mechanism** — Can the existing `organizations.payfast_subscription_token` (the SaaS billing token) be used to charge a different amount than the recurring amount? Or does the token only support the exact recurring amount? The damage charge needs to send an *arbitrary* amount. This is different from the existing "setup fee" / "overage" use cases. Need confirmation that a token captured via accommodation Subscribe checkout can accept arbitrary ad-hoc amounts and is not locked to a specific amount range.

3. **Hold-and-capture availability** — PayFast's standard model is immediate charge. Is hold-and-capture (authorize now, capture later within 7 days) available on the sandbox? If yes, it would be valuable for the damage window (charge at 7-day mark); if no, the architecture is immediate charge on approval, which is the current plan.

**Minimum reproducible test sequence:**

```
Step 1: Create a PayFast Subscribe agreement in sandbox.
  - POST to sandbox.payfast.co.za/eng/process with subscription_type=2 (ad-hoc)
  - amount=5.00 (minimum R5.00 per PayFast docs)
  - Complete checkout flow to capture token
  - Verify ITN fires with `token` field set

Step 2: Execute an ad-hoc charge against the captured token.
  - POST to sandbox.payfast.co.za/subscriptions/{token}/adhoc
  - Test with amount=250.00 (rands)
  - Verify response success vs test with amount=25000 (cents)
  - Record which format returns success

Step 3: Execute a second ad-hoc charge with a different amount.
  - Confirms "arbitrary amount" hypothesis
  - Records response shape for success and failure

Step 4: Attempt an ad-hoc charge with amount=0 (zero).
  - Expected: fail with minimum-amount error
  - Confirms floor constraint

Step 5: Check for hold-and-capture in sandbox API response.
  - Look for `capture_url` or `hold_reference` in response
  - Absence = hold-and-capture not available, confirm with PayFast docs
```

**Credentials/sandbox setup needed:**
- `PAYFAST_MERCHANT_ID` and `PAYFAST_MERCHANT_KEY` from PayFast sandbox account (test credentials, not production)
- `PAYFAST_PASSPHRASE` set on sandbox account (required for adhoc API signature)
- `PAYFAST_MODE=sandbox` in `.env.local`
- A real HTTPS `notify_url` for ITN (use ngrok or Vercel preview URL in dev)

**Deliverable format:** A markdown spike report at `.planning/phases/13-cross-product-foundation/13-01-GATE02-SPIKE.md` containing:
- Amount unit confirmed (rands/cents)
- Token charge mechanism: arbitrary amounts confirmed/denied
- Hold-and-capture: available/unavailable
- Minimum reproducible code that ran successfully
- Any deviations from existing `chargeAdhoc()` implementation that need correction

**Confidence on current implementation:** The existing code sends rands (divides amountCents by 100). Based on PayFast form-based patterns and the fact that all PayFast form amounts use rands with 2 decimal places, this is likely correct. LOW confidence until sandbox confirms. If wrong, `chargeAdhoc()` needs a comment correction and the interface — which already accepts `amountCents` — needs an internal conversion change.

---

## 2. SSO Bridge Architectural Details

### HS256 vs ES256 for v3.1 scale

**Decision: HS256 (locked as D1).**

Rationale:
- HS256 uses a single shared secret `SSO_BRIDGE_SECRET`. Both apps hold the same secret (env var). Simpler to provision (one env var on each Vercel project).
- ES256 uses an asymmetric key pair: private key signs (issuer only), public key verifies (consumer). More secure for true multi-party scenarios — but overkill when DraggonnB IS the issuer AND both apps are controlled by the same operator.
- At v3.1 scale (1 pilot org, <10 bridge crossings/day), HS256 has zero performance disadvantage.
- HS256 secret rotation: change `SSO_BRIDGE_SECRET` in Vercel env vars on both apps. All existing tokens instantly invalidated (acceptable — 60s TTL means essentially zero in-flight tokens are invalidated).
- ES256 is the right upgrade path when v3.2 adds cross-domain SSO for `swazulu.com` (external domain not controlled by us). At that point, the issuer holds the private key, and external consumers verify via a JWKS endpoint. Phase 13 should NOT add JWKS infrastructure now.

**Confidence: HIGH** — both algorithms are well-understood; the decision turns on operational model, not cryptographic strength.

### jti TTL: why 60 seconds, not 30 or 120

- **30 seconds** is too short: mobile clients on SA cellular (Vodacom/MTN) can experience 500ms–2s round-trips. A redirected token that arrives at the consumer in >30s (network congestion + cold start) fails spuriously.
- **120 seconds** is too long: expands the replay window. An attacker who intercepts a fragment (via referrer, JS injection, CSRF) has a 2-minute window vs 1-minute.
- **60 seconds** is the industry standard for short-lived bridge tokens (Atlassian's Cross-Product Navigation uses 60s; Auth0's cross-domain SSO uses 60s for exchange tokens). Matches D1.
- The single-use `jti` check provides a SECOND layer: even within the 60s window, a replay attempt fails because `consumed_at IS NOT NULL` after first use. The TTL is a fallback for the case where the DB write for `consumed_at` fails (network partition scenario).

### Fragment delivery vs query string

**Use fragment `#token=...`:**
- Fragment is NEVER sent in HTTP `Referer` headers. Query strings ARE. If any Trophy page accidentally includes third-party analytics with `<img>` tags or `navigator.sendBeacon()`, a query string token leaks via the `Referer` header to third-party servers.
- Fragment is not logged by Vercel edge logs (query strings sometimes are depending on proxy config).
- Fragment requires client-side JavaScript to extract. Trophy OS is a Next.js app with client-side hydration — this is fine. The `/api/sso/consume` route needs a client-side redirect page that reads `window.location.hash`, extracts the token, then POSTs it server-side or makes a GET request with a transformed parameter.

**Implementation pattern for fragment delivery:**
```typescript
// Trophy: src/app/api/sso/consume/page.tsx (client component)
// NOT a Route Handler — needs to read window.location.hash
'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SSOConsumePage() {
  const router = useRouter()
  useEffect(() => {
    const hash = window.location.hash.slice(1) // remove '#'
    const params = new URLSearchParams(hash)
    const token = params.get('token')
    if (token) {
      // POST to /api/sso/validate (server-side validation)
      fetch('/api/sso/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include', // carry Trophy session cookie
      }).then(res => res.json()).then(data => {
        if (data.redirectTo) router.replace(data.redirectTo)
        else router.replace('/dashboard')
      })
    }
  }, [router])
  return <LoadingScreen message="Signing in..." />
}
```

The server-side `/api/sso/validate` route handler does the actual JWT validation, jti check, and session creation.

### Exact CSP headers

The Trophy consume page needs the following additions to its existing CSP (or if no CSP exists, these should be added):

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' https://psqfgzbjbgqrmjskdavs.supabase.co wss://psqfgzbjbgqrmjskdavs.supabase.co;
  script-src 'self' 'unsafe-inline';  # Next.js requires inline scripts
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'none';             # Prevents clickjacking
  form-action 'self';                 # Prevents form redirect to external
```

Critical for token security:
- `frame-ancestors 'none'` — prevents iframe embedding where JS could read fragments
- `connect-src` — restricts fetch/XHR to known-good origins only (no third-party analytics can receive the token)

The DraggonnB issuer side adds:
```
Referrer-Policy: no-referrer   # On the /api/sso/issue 302 redirect response
```

This ensures the Location header in the redirect does NOT leak to the browser's Referer chain.

### Vercel edge IP allow-listing approach

Vercel does not provide stable static egress IPs for serverless functions (they change per-region deployment). For v3.1, do NOT attempt IP allow-listing on Trophy's `/api/sso/validate` route.

Instead, use **bearer token validation** at the route handler level:
1. The SSO JWT is signed with `SSO_BRIDGE_SECRET`. A valid signature proves the request comes from a DraggonnB issuer with access to `SSO_BRIDGE_SECRET`.
2. For v3.2 (if security requirements increase), add a `x-sso-caller-secret` header with a separate short-lived HMAC proving the caller is DraggonnB platform. This is forward-compatible — add without breaking.

**Confidence: HIGH** — Vercel's serverless model makes IP allow-listing impractical. Cryptographic validation via JWT signature is the correct substitute.

### `sso_bridge_tokens` table shape

```sql
-- Migration: 13-01-sso-bridge-tokens.sql
CREATE TABLE sso_bridge_tokens (
  jti          UUID PRIMARY KEY,
  user_id      UUID NOT NULL,               -- auth.users.id of the bridge requester
  origin_org   UUID NOT NULL,               -- DraggonnB organizations.id
  target_org   UUID NOT NULL,               -- Trophy orgs.id
  product      TEXT NOT NULL CHECK (product IN ('draggonnb', 'trophy')),
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,        -- issued_at + 60 seconds
  consumed_at  TIMESTAMPTZ NULL             -- set on first valid consumption
);

-- TTL index for automated cleanup
CREATE INDEX idx_sso_bridge_tokens_expires ON sso_bridge_tokens(expires_at);

-- No RLS needed on this table — only service-role client reads/writes it.
-- Platform-level security: not tenant-scoped.
ALTER TABLE sso_bridge_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_bridge_tokens FORCE ROW LEVEL SECURITY;
-- No SELECT/INSERT/UPDATE policies for anon or authenticated roles.
-- All access via service-role client only.

-- Cron sweep for expired tokens (add to existing cron pattern):
-- DELETE FROM sso_bridge_tokens WHERE expires_at < NOW() - INTERVAL '1 day';
```

**Why no RLS policies:** The table is security infrastructure. No authenticated user should be able to READ or WRITE to it directly. All access is service-role only (via the `/api/sso/validate` server handler). This is consistent with how `audit_log` is handled.

### Cross-host cookie strategy

Each app sets its own session cookie on its own domain. The Supabase client on each app manages cookies independently.

| App | Cookie domain | Cookie name | Set by |
|-----|---------------|-------------|--------|
| DraggonnB | `app.draggonnb.co.za` or `{tenant}.draggonnb.co.za` | `sb-psqfgzbjbgqrmjskdavs-auth-token` | `@supabase/ssr` |
| Trophy | `trophyos.co.za` | `sb-psqfgzbjbgqrmjskdavs-auth-token` | `@supabase/ssr` |
| auth bridge | `auth.draggonnb.com` | n/a (stateless redirect) | n/a |

The bridge does NOT set a shared cookie. After successful consumption, Trophy's `@supabase/ssr` creates a fresh session cookie on `trophyos.co.za` by calling `supabase.auth.setSession()` with the user's tokens (extracted from the bridge JWT payload).

**Critical guard per D1 and SSO-07:** NEVER pass `Domain=.draggonnb.co.za` in cookie options. Supabase SSR's `setAll` callback must NOT include a `domain` option. The middleware in DraggonnB already omits `domain`. Trophy middleware must do the same.

### `tenant_membership_proof` middleware placement

This middleware must run BEFORE `getUserOrg()` on every protected route in both apps.

**DraggonnB placement:**

The existing `middleware.ts` (`lib/supabase/middleware.ts`) `updateSession()` function checks authentication at the bottom of the function (after session refresh). The `tenant_membership_proof` check should be inserted AFTER auth validation but BEFORE the protected-route check:

```typescript
// In updateSession(), after supabase.auth.getUser():
const { data: { user }, error } = await supabase.auth.getUser()

// --- NEW: tenant_membership_proof (SSO-06) ---
if (user && subdomain) {
  const tenantId = request.headers.get('x-tenant-id') // injected by resolveTenant() above
  if (tenantId) {
    const membershipValid = await verifyMembership(user.id, tenantId)
    if (!membershipValid) {
      return NextResponse.json(
        { error: 'No active membership in this tenant' },
        { status: 403 }
      )
    }
  }
}
// --- END tenant_membership_proof ---
```

Where `verifyMembership()` is a new helper in `lib/auth/membership-proof.ts`:
```typescript
// lib/auth/membership-proof.ts
export async function verifyMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  // Uses admin client to bypass RLS on the membership check itself
  const admin = createAdminClient()
  const { data } = await admin
    .from('organization_users')
    .select('id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .limit(1)
    .single()
  return !!data
}
```

**Important:** Cache the result in the same in-memory tenant cache (already exists in middleware.ts, 60s TTL). Do NOT execute a DB query on every request. The cache key should be `user:${userId}:org:${organizationId}`.

**Trophy placement:**

Trophy OS currently has no middleware.ts (confirmed by codebase audit — `src/middleware.ts` does not exist). Phase 13 must create `src/middleware.ts` for Trophy that:
1. Refreshes Supabase session (standard pattern)
2. Runs `tenant_membership_proof` — verifies `(user_id, org_id)` exists in `org_members` with `is_active=true`
3. Protects `/(dashboard)` routes

**Call site refactor needed across both apps:**
- DraggonnB: `getUserOrg()` in `lib/auth/get-user-org.ts` currently falls through to `ensureUserRecord()` auto-create if no membership found. This auto-create MUST be blocked for cross-product SSO sessions. The middleware's 403 response should prevent `getUserOrg()` from ever being called for a user who fails `tenant_membership_proof`. But `getUserOrg()` itself should NOT auto-create for users who arrive via SSO bridge — add a flag: `getUserOrg({ allowAutoCreate: false })` for SSO-originated sessions.
- The `ensureUserRecord()` path in `getUserOrg()` is correct for the first-time local signup flow. Do NOT remove it. Gate it via a parameter, not a deletion.

---

## 3. MANIFEST: Foundational Layer Design

This is the most novel piece in Phase 13. The MANIFEST design must be expressive enough for four consumers while remaining simple enough to retrofit onto existing modules without behavior change.

### The four consumers and their requirements

| Consumer | Reads from manifest | What they need |
|----------|---------------------|----------------|
| Onboarding wizard (MANIFEST-03) | `required_tenant_inputs[]` | Form field type, label, validation, storage path in `tenant_modules.config` |
| Telegram callback registry (MANIFEST-04) | `telegram_callbacks[]` | Handler function, product prefix, action key for `approve:{product}:{action}` |
| Approval spine action-type registry (MANIFEST-05) | `approval_actions[]` | Handler import path, required_role[], product scope, display name |
| Billing line-type registry (MANIFEST-06) | `billing_line_types[]` | source_product, source_type string, display label |

### Typed manifest contract

```typescript
// lib/modules/types.ts
// Source: design in this research document

export type ModuleId =
  | 'accommodation'
  | 'crm'
  | 'events'
  | 'ai_agents'
  | 'analytics'
  | 'security_ops'
  | 'trophy'  // reserved for cross-product module

// ─── Sub-schemas ─────────────────────────────────────────────────────────────

export interface TenantInputSpec {
  key: string           // dot-path in tenant_modules.config, e.g. "accommodation.damage_price_list"
  type: 'text' | 'number' | 'json' | 'boolean' | 'select' | 'file_upload'
  label: string         // displayed in onboarding wizard
  placeholder?: string
  required: boolean
  validation?: string   // Zod schema string or regex
  options?: string[]    // for 'select' type
}

export interface EmittedEventSpec {
  event_type: string    // e.g. "booking.checked_out", "damage.flagged"
  description: string
  payload_schema?: string // JSON schema string for documentation
}

export interface ApprovalActionSpec {
  action_type: string   // e.g. "damage_charge" — combined with product: "draggonnb.damage_charge"
  display_name: string  // "Damage Charge Approval"
  required_roles: string[]  // roles that can APPROVE this action type
  handler_path: string  // relative import: "lib/approvals/handlers/damage-charge"
  description: string
}

export interface TelegramCallbackSpec {
  action_key: string    // e.g. "damage_charge" → callback_data: "approve:draggonnb:damage_charge:{id}"
  display_name: string  // shown in Telegram message
  handler_path: string  // relative import for the callback handler
}

export interface BillingLineTypeSpec {
  source_type: string   // e.g. "accommodation_night", "damage_charge", "game_drive_addon"
  display_label: string // shown on invoice line item
  vat_applicable: boolean
  unit: string          // "night", "per booking", "per item", "per hunter per day"
}

// ─── Root manifest type ──────────────────────────────────────────────────────

export interface ModuleManifest {
  id: ModuleId
  name: string          // human display name
  version: string       // semver of this manifest definition
  product: 'draggonnb' | 'trophy'  // which product owns this module
  required_tenant_inputs: TenantInputSpec[]
  emitted_events: EmittedEventSpec[]
  approval_actions: ApprovalActionSpec[]
  telegram_callbacks: TelegramCallbackSpec[]
  billing_line_types: BillingLineTypeSpec[]
}
```

**200 LOC total for the type file** — this fits comfortably. The `lib/modules/types.ts` file should be ≤150 lines.

### Where manifests live

Co-located with module code, NOT centralized:

```
lib/modules/
  types.ts              ← shared contract
  accommodation/
    manifest.ts         ← accommodation module manifest
  crm/
    manifest.ts
  events/
    manifest.ts
  ai_agents/
    manifest.ts
  analytics/
    manifest.ts
  security_ops/
    manifest.ts
```

**Why co-located, not centralized:**
- Adding a new module = adding one file in a predictable location. No central registry to update.
- Module ownership is clear: the team working on accommodation owns `lib/modules/accommodation/manifest.ts`.
- Build-time import graph is explicit — no dynamic discovery surprises.

### How manifests are discovered at boot

**NOT filesystem glob.** Use an explicit import array (Module Registry Pattern):

```typescript
// lib/modules/registry.ts
import { ModuleManifest } from './types'
import { accommodationManifest } from './accommodation/manifest'
import { crmManifest } from './crm/manifest'
import { eventsManifest } from './events/manifest'
import { aiAgentsManifest } from './ai_agents/manifest'
import { analyticsManifest } from './analytics/manifest'
import { securityOpsManifest } from './security_ops/manifest'

export const MODULE_REGISTRY: ModuleManifest[] = [
  accommodationManifest,
  crmManifest,
  eventsManifest,
  aiAgentsManifest,
  analyticsManifest,
  securityOpsManifest,
]

// Helpers consumed by the three downstream registries:

export function getManifestsForOrg(enabledModuleIds: string[]): ModuleManifest[] {
  return MODULE_REGISTRY.filter(m => enabledModuleIds.includes(m.id))
}

export function getAllApprovalActions(enabledModuleIds: string[]): ApprovalActionSpec[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m => m.approval_actions)
}

export function getAllTelegramCallbacks(enabledModuleIds: string[]): TelegramCallbackSpec[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m => m.telegram_callbacks)
}

export function getAllBillingLineTypes(enabledModuleIds: string[]): BillingLineTypeSpec[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m => m.billing_line_types)
}
```

**Why explicit registry over glob:**
- `fs.glob()` only works in Node.js server context, not Vercel edge runtime
- TypeScript import graph = compile-time type safety + tree-shaking
- Missing manifest = compile error, not silent runtime miss
- SSO-08 requirement: "Missing handler = clear error at boot, not runtime" — explicit registry makes this possible

### Onboarding wizard: form generation from manifests (MANIFEST-03)

The wizard reads `required_tenant_inputs` from all modules active for the new tenant:

```typescript
// app/(dashboard)/onboarding/wizard/page.tsx (server component)
import { getManifestsForOrg } from '@/lib/modules/registry'

const manifests = getManifestsForOrg(activeModuleIds)
const allInputs = manifests.flatMap(m => m.required_tenant_inputs)

// Group by module for wizard sections
const sections = manifests.map(manifest => ({
  moduleId: manifest.id,
  moduleName: manifest.name,
  inputs: manifest.required_tenant_inputs,
}))
```

Each `TenantInputSpec` maps to a rendered form field. The wizard saves submitted values to `tenant_modules.config` via the dot-path in `spec.key`.

**Backward compatibility:** Existing modules (accommodation, crm, etc.) get manifests that describe the config they already read/write. No behavior change — the manifest just makes the shape explicit and discoverable.

### Telegram callback registry at boot (MANIFEST-04)

```typescript
// lib/accommodation/telegram/ops-bot.ts  (MODIFIED)
// Instead of hardcoded callback_data matchers:

import { getAllTelegramCallbacks } from '@/lib/modules/registry'

// At grammY bot initialization:
export function initBot(enabledModuleIds: string[], orgId: string) {
  const bot = new Bot(getBotToken())
  const callbacks = getAllTelegramCallbacks(enabledModuleIds)

  for (const spec of callbacks) {
    bot.callbackQuery(new RegExp(`^approve:${spec.action_key}:`), async (ctx) => {
      // Dynamic dispatch to handler
      const handler = await import(spec.handler_path)
      await handler.onApprove(ctx, orgId)
    })
    bot.callbackQuery(new RegExp(`^reject:${spec.action_key}:`), async (ctx) => {
      const handler = await import(spec.handler_path)
      await handler.onReject(ctx, orgId)
    })
  }

  return bot
}
```

Note: grammY is adopted in Phase 14, not Phase 13. The MANIFEST registry in Phase 13 defines the callback spec shape that grammY will consume. Phase 13 ships the type definitions and module manifests; Phase 14 wires them into the grammY bot.

### Approval action-type registry (MANIFEST-05)

```typescript
// lib/approvals/registry.ts (new file in Phase 13)
import { getAllApprovalActions } from '@/lib/modules/registry'

export class ApprovalActionRegistry {
  private handlers: Map<string, ApprovalActionSpec> = new Map()

  constructor(enabledModuleIds: string[]) {
    const actions = getAllApprovalActions(enabledModuleIds)
    for (const action of actions) {
      const qualifiedKey = `${action.product}.${action.action_type}` // "draggonnb.damage_charge"
      this.handlers.set(qualifiedKey, action)
    }
  }

  getHandler(qualifiedActionType: string): ApprovalActionSpec | undefined {
    return this.handlers.get(qualifiedActionType)
  }

  assertAllHandlersResolvable(): void {
    // Called at app startup. Validates all handler_path imports exist.
    // Throws with descriptive error if any handler_path cannot be resolved.
    // "Missing handler = clear error at boot, not runtime" (MANIFEST-05)
    for (const [key, spec] of this.handlers) {
      try {
        require.resolve(spec.handler_path)
      } catch {
        throw new Error(
          `ApprovalActionRegistry: handler not found for action "${key}". ` +
          `handler_path="${spec.handler_path}" could not be resolved. ` +
          `Create the handler file before shipping this module's manifest.`
        )
      }
    }
  }
}
```

Note: The actual handlers (`lib/approvals/handlers/*.ts`) are Phase 14 work. Phase 13 ships the registry contract and empty stubs.

### Billing line-type registry (MANIFEST-06)

```typescript
// lib/billing/line-type-registry.ts (new file in Phase 13)
import { getAllBillingLineTypes } from '@/lib/modules/registry'

export function validateBillingLineType(
  sourceProduct: string,
  sourceType: string,
  enabledModuleIds: string[]
): boolean {
  const lineTypes = getAllBillingLineTypes(enabledModuleIds)
  return lineTypes.some(
    lt => lt.source_type === sourceType
    // source_product is implicit from the module product field
  )
}
```

`addInvoiceLine()` in Phase 15 will call `validateBillingLineType()` before inserting a line. Unknown product/type pair rejects with a clear error.

### Retrofitting existing modules without behavior change (MANIFEST-02)

The accommodation manifest describes what accommodation ALREADY does, without changing it:

```typescript
// lib/modules/accommodation/manifest.ts
import type { ModuleManifest } from '../types'

export const accommodationManifest: ModuleManifest = {
  id: 'accommodation',
  name: 'Accommodation',
  version: '1.0.0',
  product: 'draggonnb',
  required_tenant_inputs: [
    {
      key: 'accommodation.damage_price_list',
      type: 'json',
      label: 'Damage Price List',
      placeholder: '{"glassware": 20, "plates": 25, ...}',
      required: false,  // false = uses defaults if absent
    },
    {
      key: 'accommodation.cancellation_policy',
      type: 'json',
      label: 'Cancellation Policy',
      required: false,
    },
  ],
  emitted_events: [
    { event_type: 'booking.confirmed', description: 'Booking confirmed and deposit received' },
    { event_type: 'booking.checked_out', description: 'Guest checked out' },
    { event_type: 'damage.flagged', description: 'Staff flagged damage incident' },
  ],
  approval_actions: [
    {
      action_type: 'damage_charge',
      display_name: 'Damage Charge Approval',
      required_roles: ['admin', 'manager'],
      handler_path: 'lib/approvals/handlers/damage-charge',
      description: 'Approve/reject a damage charge against a guest\'s stored payment token',
    },
    {
      action_type: 'rate_change',
      display_name: 'Rate Change Approval',
      required_roles: ['admin'],
      handler_path: 'lib/approvals/handlers/rate-change',
      description: 'Approve/reject a change to accommodation rates',
    },
  ],
  telegram_callbacks: [
    {
      action_key: 'damage_charge',
      display_name: 'Damage Charge',
      handler_path: 'lib/approvals/handlers/damage-charge',
    },
  ],
  billing_line_types: [
    { source_type: 'accommodation_night', display_label: 'Accommodation Night', vat_applicable: true, unit: 'per night' },
    { source_type: 'accommodation_addon', display_label: 'Add-on Service', vat_applicable: true, unit: 'per booking' },
    { source_type: 'damage_charge', display_label: 'Damage Recovery Charge', vat_applicable: false, unit: 'per incident' },
  ],
}
```

**Behavior impact: zero.** The manifest is a pure description file. No existing accommodation code reads from it in Phase 13. It is consumed by the registry and by Phase 14+ downstream code.

### Prior art

This pattern is similar to:
- **Backstage Plugin manifests** — each plugin declares its capabilities via a typed manifest
- **Sanity.io schema declarations** — each module declares its document types
- **NestJS module metadata** — modules declare their providers, imports, exports

The DraggonnB variant is simpler than all of these (no dependency injection, no schema language). It is purely descriptive, not executable.

---

## 4. `@draggonnb/federation-shared` Private Package

### GitHub Packages registry setup

**Step 1: Create the repository**
Create a new private repo at `github.com/DRAGGONNB/federation-shared` (or within the `DRAGGONNB` org).

**Step 2: package.json**
```json
{
  "name": "@draggonnb/federation-shared",
  "version": "1.0.0",
  "private": false,
  "publishConfig": {
    "registry": "https://npm.pkg.github.com",
    "access": "restricted"
  },
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist/"],
  "scripts": {
    "build": "tsc",
    "prepublishOnly": "npm run build"
  },
  "devDependencies": {
    "typescript": "^5.3.0"
  },
  "dependencies": {
    "jose": "^5.x"
  }
}
```

**Step 3: .npmrc in each consumer repo**
Both DraggonnB and Trophy OS need a `.npmrc` file (NOT committed — use environment variable):
```
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
@draggonnb:registry=https://npm.pkg.github.com
```

The `GITHUB_PACKAGES_TOKEN` must be a classic PAT with `read:packages` scope. Add to both Vercel projects as an environment variable. Also add to local `.env.local` for dev.

**Step 4: Versioning workflow**
Manually bump `package.json` version before each publish. CI workflow:
```yaml
# .github/workflows/publish.yml (in federation-shared repo)
on:
  push:
    tags:
      - 'v*'
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: https://npm.pkg.github.com
      - run: npm ci && npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### What to put in the package (initial 200 LOC)

```typescript
// src/index.ts — the entire package exports these:

// 1. Brand types (opaque ID wrappers) — ~20 LOC
declare const draggonnbOrgIdBrand: unique symbol
export type DraggonnbOrgId = string & { [draggonnbOrgIdBrand]: never }
export const asDraggonnbOrgId = (id: string): DraggonnbOrgId => id as DraggonnbOrgId

declare const trophyOrgIdBrand: unique symbol
export type TrophyOrgId = string & { [trophyOrgIdBrand]: never }
export const asTrophyOrgId = (id: string): TrophyOrgId => id as TrophyOrgId

// 2. HS256 JWT helpers — ~60 LOC
import { SignJWT, jwtVerify } from 'jose'

export interface BridgeTokenPayload {
  sub: string               // auth.users.id
  draggonnb_org: DraggonnbOrgId
  trophy_org: TrophyOrgId
  intended_product: 'draggonnb' | 'trophy'
  jti: string               // UUID, single-use
}

export async function signBridgeToken(
  payload: BridgeTokenPayload,
  secret: string
): Promise<string> {
  const key = new TextEncoder().encode(secret)
  return new SignJWT(payload as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('60s')
    .setJti(payload.jti)
    .sign(key)
}

export async function verifyBridgeToken(
  token: string,
  secret: string
): Promise<BridgeTokenPayload> {
  const key = new TextEncoder().encode(secret)
  const { payload } = await jwtVerify(token, key, {
    algorithms: ['HS256'],
    maxTokenAge: '60s',
  })
  return payload as unknown as BridgeTokenPayload
}

// 3. ApprovalRequest types — ~50 LOC
export type ApprovalProduct = 'draggonnb' | 'trophy'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired'

export interface ApprovalRequest {
  id: string
  product: ApprovalProduct
  action_type: string       // e.g. "damage_charge", "quota_change"
  target_resource_type: string
  target_resource_id: string
  target_org_id: string
  action_payload: Record<string, unknown>
  requested_by: string      // user_id
  assigned_to: string[]     // user_ids who can approve
  status: ApprovalStatus
  expires_at: string
  created_at: string
}

// 4. Billing line types (D11) — ~40 LOC
export interface BillingLineInput {
  invoice_id: string
  source_product: 'draggonnb' | 'trophy'
  source_type: string       // e.g. "accommodation_night", "safari_day", "animal_trophy"
  source_id: string         // UUID of the source record
  hunter_id?: string        // nullable — tags per-hunter extras
  description: string
  quantity: number
  unit_price_zar_cents: number
  vat_zar_cents: number
  sort_order?: number
}
```

Total: ~170 LOC. Under 200 cap.

### Enforcing exact-version pinning in CI

In each consuming repo's `package.json`, install as exact (no caret):
```json
"@draggonnb/federation-shared": "1.0.0"
```
NOT `"^1.0.0"`. Add a CI check:

```bash
# In CI pre-check step:
if grep -q '"@draggonnb/federation-shared": "\^' package.json; then
  echo "ERROR: federation-shared must be pinned to exact version (no ^ range)"
  exit 1
fi
```

### npm-version-sync workflow between two repos

When `federation-shared` publishes v1.1.0:
1. Maintainer creates a PR in DraggonnB platform updating `package.json` and `package-lock.json`
2. Maintainer creates a separate PR in Trophy OS updating the same
3. Both PRs reference the federation-shared release notes
4. Dependency on same version confirmed before merging either PR

This is manual but acceptable for v3.1 scale (very infrequent package updates expected).

---

## 5. Cross-Product Navigation UX

### Sidebar item conditional rendering (NAV-01)

DraggonnB sidebar item "Trophy OS" renders ONLY when `tenant_modules.config.trophy.linked_org_id` is non-null.

The middleware already injects `x-tenant-modules` header. Extend the `TenantContext` in middleware to also carry `linked_trophy_org_id`:

```typescript
// middleware.ts resolveTenant() — extended query:
const { data: org } = await adminClient
  .from('organizations')
  .select('id, subscription_tier, subdomain, linked_trophy_org_id')  // ADD THIS
  // ...

context.linkedTrophyOrgId = org.linked_trophy_org_id || null
// Inject as header:
headers.set('x-linked-trophy-org-id', context.linkedTrophyOrgId || '')
```

The sidebar component reads `x-linked-trophy-org-id` from the request headers (server component context) to determine conditional rendering.

### "Activate Trophy OS" empty state (NAV-04)

When a user clicks "Trophy OS" but `linked_trophy_org_id` is NULL:
- Route: `/dashboard/activate-trophy` (new page)
- UX: short explanation + CTA button "Activate Trophy OS" → triggers provisioning saga step 10 (`activate-trophy-module`)
- NOT a silent auto-create — explicit user intent required
- After activation, page redirects to `/api/sso/issue?target=trophy`

### Loading state during bridge round-trip (NAV-03)

The SSO bridge involves two HTTP round-trips: `/api/sso/issue` (DraggonnB) → redirect → Trophy `/api/sso/consume`. Both happen within 2 seconds under normal conditions.

Implementation:
```typescript
// components/sidebar/TrophyCrossLink.tsx
'use client'
import { useState } from 'react'

export function TrophyCrossLink({ linkedOrgId }: { linkedOrgId: string | null }) {
  const [loading, setLoading] = useState(false)

  const handleClick = () => {
    setLoading(true)
    // Navigate to SSO issue endpoint — the loading spinner stays until page unloads
    window.location.href = '/api/sso/issue?target=trophy'
    // Fallback: if still loading after 2s, show error
    setTimeout(() => {
      setLoading(false)
      // Show toast: "Trophy OS is taking longer than expected..."
    }, 2000)
  }

  if (!linkedOrgId) {
    return <ActivateTrophyButton />  // "Activate Trophy OS" state
  }

  return (
    <button onClick={handleClick} disabled={loading}>
      {loading ? <Spinner size="sm" /> : <TrophyIcon />}
      {loading ? 'Connecting...' : 'Trophy OS'}
    </button>
  )
}
```

### Reverse direction (NAV-02)

Trophy OS needs a "DraggonnB OS" item in its sidebar/header. This requires adding a Telegram-style cross-link component to Trophy's layout.

Trophy does NOT have a middleware yet. Phase 13 creates `src/middleware.ts` for Trophy that:
1. Refreshes sessions (existing server.ts pattern, already uses `getAll/setAll`)
2. Protects `/(dashboard)` routes
3. Reads `org_members` to verify cross-product visibility

The DraggonnB reverse link renders only when the Trophy org has a corresponding DraggonnB org linked (reverse lookup: `SELECT id FROM organizations WHERE linked_trophy_org_id = {trophy_org_id}`).

---

## 6. Provisioning Saga Step 10 (`activate-trophy-module`)

### Where it slots in

The existing provisioning saga has steps identified in `lib/provisioning/types.ts` and `scripts/provisioning/steps/`. The current `ProvisioningStep` type lists steps including `create-org`, `n8n-webhooks`, `deploy-automations`, `onboarding-sequence`, `qa-check`. Step 10 (`activate-trophy-module`) is a conditional step — it only runs when `module_id='trophy'` is being activated.

**File to create:** `scripts/provisioning/steps/09-activate-trophy.ts`

(Existing steps in the folder go up to `10-schedule-followups.ts` — the number is already taken for a different step. Name it by function, not number: `scripts/provisioning/steps/activate-trophy-module.ts`)

### Step implementation shape

```typescript
// scripts/provisioning/steps/activate-trophy-module.ts

import { createAdminClient } from '@/lib/supabase/admin'
import type { ProvisioningJob, ProvisioningResult } from '@/lib/provisioning/types'

export async function activateTrophyModule(job: ProvisioningJob): Promise<ProvisioningResult> {
  const admin = createAdminClient()
  const draggonnbOrgId = job.createdResources?.organizationId

  if (!draggonnbOrgId) {
    return { success: false, step: 'activate-trophy-module', error: 'No organizationId in job' }
  }

  // Idempotency check: already linked?
  const { data: existing } = await admin
    .from('organizations')
    .select('linked_trophy_org_id')
    .eq('id', draggonnbOrgId)
    .single()

  if (existing?.linked_trophy_org_id) {
    // Already provisioned — idempotent no-op
    return {
      success: true,
      step: 'activate-trophy-module',
      data: { trophyOrgId: existing.linked_trophy_org_id },
    }
  }

  // 1. Create Trophy orgs row
  const { data: trophyOrg, error: trophyOrgError } = await admin
    .from('orgs')
    .insert({
      name: job.clientName,
      slug: job.createdResources?.subdomain || job.clientId,
      type: 'lodge',                  // default type for game lodge orgs
      owner_id: null,                 // Trophy org owner set separately
      subscription_status: 'trial',  // 14-day trial
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (trophyOrgError || !trophyOrg) {
    return { success: false, step: 'activate-trophy-module', error: trophyOrgError?.message }
  }

  // 2. Write cross_product_org_links row
  await admin.from('cross_product_org_links').insert({
    draggonnb_org_id: draggonnbOrgId,
    trophy_org_id: trophyOrg.id,
    status: 'active',
    created_at: new Date().toISOString(),
  })

  // 3. Update organizations.linked_trophy_org_id
  await admin
    .from('organizations')
    .update({ linked_trophy_org_id: trophyOrg.id })
    .eq('id', draggonnbOrgId)

  // 4. Update tenant_modules.config.trophy JSONB cache
  await admin
    .from('tenant_modules')
    .update({
      config: admin.rpc('jsonb_set_deep', {  // or manual JSONB merge
        config: `{"linked_org_id": "${trophyOrg.id}"}`,
      }),
    })
    .eq('organization_id', draggonnbOrgId)
    .eq('module_id', 'trophy')

  return {
    success: true,
    step: 'activate-trophy-module',
    data: { trophyOrgId: trophyOrg.id },
  }
}
```

**Rollback:** Delete the Trophy `orgs` row (cascades to `org_members` via Trophy's FK). Reset `organizations.linked_trophy_org_id = NULL`. Delete `cross_product_org_links` row. The rollback is already handled by the saga's rollback pattern — add the `trophyOrgId` to `createdResources` so the rollback function can cascade.

**Retry semantics:** The idempotency check at the top makes this safe to retry. The saga's `pauseSaga()` + `resumeSaga()` pattern in `lib/provisioning/saga-state.ts` already handles this.

### `ProvisioningStep` type update needed

Add `'activate-trophy-module'` to the union in `lib/provisioning/types.ts`. Also add `trophyOrgId?: string` to `CreatedResources`.

---

## 7. OPS-05 Multi-Step Migrations for Phase 13

Three migrations are required. Each must follow CLAUDE.md OPS-05 4-step pattern.

### Migration A: `organizations.linked_trophy_org_id`

**Step 1 (ship first migration):**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_linked_trophy_org_id.sql
ALTER TABLE organizations
  ADD COLUMN linked_trophy_org_id UUID NULL;

CREATE INDEX idx_organizations_linked_trophy
  ON organizations(linked_trophy_org_id)
  WHERE linked_trophy_org_id IS NOT NULL;

-- FK reference to Trophy orgs table — added in separate step
-- to avoid circular dependency on migration order
-- NOTE: Step 2 (FK constraint) lands after Trophy orgs table is confirmed to exist
```

**Step 2 (deploy code that writes it):** `activate-trophy-module` provisioning step writes `linked_trophy_org_id` after creating the Trophy `orgs` row.

**Step 3 (backfill):** For Swazulu (the only existing org that will get Trophy module), the saga step handles the backfill. For new orgs, the column is populated at activation time. No mass backfill needed — existing orgs have NULL (correct: they have no Trophy link).

**Step 4 (FK constraint, separate migration):**
```sql
-- supabase/migrations/YYYYMMDDHHMMSS_add_linked_trophy_org_fk.sql
-- Only after Trophy orgs table is confirmed to exist in DB
ALTER TABLE organizations
  ADD CONSTRAINT fk_organizations_linked_trophy_org
  FOREIGN KEY (linked_trophy_org_id)
  REFERENCES orgs(id)
  ON DELETE SET NULL;
```

**Why split:** The FK must reference `orgs(id)`. If Trophy's `orgs` table was created in a Trophy migration that hasn't been applied yet, the FK fails. These are in the SAME Supabase project so Trophy migrations must run before the FK migration.

### Migration B: `cross_product_org_links` (new table)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_cross_product_org_links.sql
CREATE TABLE cross_product_org_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draggonnb_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trophy_org_id    UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'pending')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draggonnb_org_id, trophy_org_id)  -- one-to-one for v3.1
);

CREATE INDEX idx_cross_product_links_draggonnb ON cross_product_org_links(draggonnb_org_id);
CREATE INDEX idx_cross_product_links_trophy ON cross_product_org_links(trophy_org_id);

-- RLS: platform admin only for write; linked members can read
ALTER TABLE cross_product_org_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_product_org_links FORCE ROW LEVEL SECURITY;
```

New table, no backfill needed. No NOT NULL step needed (all columns already NOT NULL with defaults).

### Migration C: `sso_bridge_tokens` (new table)

```sql
-- supabase/migrations/YYYYMMDDHHMMSS_create_sso_bridge_tokens.sql
CREATE TABLE sso_bridge_tokens (
  jti         UUID PRIMARY KEY,
  user_id     UUID NOT NULL,
  origin_org  UUID NOT NULL,
  target_org  UUID NOT NULL,
  product     TEXT NOT NULL CHECK (product IN ('draggonnb', 'trophy')),
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_sso_bridge_tokens_expires ON sso_bridge_tokens(expires_at);

-- No user-facing RLS policies. Service-role client only.
ALTER TABLE sso_bridge_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_bridge_tokens FORCE ROW LEVEL SECURITY;
```

### Migration ordering within Phase 13

```
Migration order:
1. create_sso_bridge_tokens          -- no external deps
2. create_cross_product_org_links    -- refs organizations + orgs (Trophy)
3. add_linked_trophy_org_id_nullable -- no FK yet
4. add_linked_trophy_org_fk          -- refs orgs (Trophy), deploy LAST
```

Each in its own migration file per OPS-05 (one change per migration).

---

## 8. Stack Upgrades Regression Risk

### `@supabase/ssr` 0.1.0 → 0.10.2 in DraggonnB

**The breaking change:** `@supabase/ssr` 0.5.0 introduced `getAll`/`setAll` replacing `get`/`set`/`remove`. DraggonnB is on 0.1.0 — a significant jump.

**Callsite inventory (from codebase audit):**

| File | Current API | Change needed |
|------|-------------|---------------|
| `lib/supabase/server.ts` | `get`, `set`, `remove` callbacks | Replace with `getAll`, `setAll` |
| `lib/supabase/middleware.ts` | `get`, `set`, `remove` callbacks | Replace with `getAll`, `setAll` |
| `lib/supabase/client.ts` | `createBrowserClient` | No change (browser client unaffected) |
| `lib/supabase/admin.ts` | `createClient` (service role) | No change (no cookie handling) |

**Two files to change. Not 47 API routes.** The Supabase client is created once in `lib/supabase/server.ts` and used everywhere via `createClient()`. The cookie handling exists only in the two wrapper files.

**New `lib/supabase/server.ts` after upgrade:**
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from Server Component — safe to ignore
          }
        },
      },
    }
  )
}
```

**New `lib/supabase/middleware.ts` session cookie section:**

Replace the entire `createServerClient` call in `updateSession()`:
```typescript
const supabase = createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        )
      },
    },
  }
)
```

**Risk assessment:**
- LOW risk: only 2 files change
- The business logic (tenant resolution, module gating, protected route checks) is untouched
- Regression test surface: existing middleware integration tests + auth page smoke tests
- Existing 720+ tests will catch regressions in auth flows
- The change is mechanical (API shape change, same semantics)

**Trophy `@supabase/ssr` 0.9.0 → 0.10.2:**
Trophy already uses `getAll/setAll` in `src/lib/supabase/server.ts` (confirmed by codebase audit). The 0.9.0 → 0.10.2 change adds cache headers to `setAll` as a second argument — this is backward-compatible (Trophy's existing `setAll` ignores the extra argument). **Zero code changes needed in Trophy for this upgrade.** Only `package.json` version bump + `npm install`.

---

## 9. Sub-Plan Decomposition Recommendation

### Recommended: 7 plans (not 5)

The original 5-plan suggestion in ROADMAP.md predates the MANIFEST addition. With MANIFEST-01..06 as a foundational layer, 6 was viable, but 7 plans is cleaner given the natural sequencing:

| Plan | Name | REQs | Wave | Depends on |
|------|------|------|------|------------|
| **13-01** | GATE-02 PayFast Sandbox Spike | GATE-02, DAMAGE-05 | 1 | Nothing (independent) |
| **13-02** | STACK Upgrades | STACK-01..04, STACK-07 | 1 | Nothing (parallel with 13-01) |
| **13-03** | Module Manifest Contract | MANIFEST-01, MANIFEST-02 | 1 | Nothing (parallel with 13-01, 13-02) |
| **13-04** | Manifest-Driven Registries | MANIFEST-03..06 | 2 | 13-03 |
| **13-05** | SSO Architecture + DB Foundations | SSO-09, SSO-10, SSO-12, SSO-14 | 2 | 13-02 (jose available) |
| **13-06** | SSO Bridge Implementation | SSO-01..08, SSO-11, SSO-13 | 3 | 13-05 |
| **13-07** | Cross-Product Navigation + Provisioning Saga | NAV-01..04, SSO-11 (saga step) | 3 | 13-05, 13-06 |

### Wave parallelization table

```
Wave 1 (no dependencies — run in parallel):
  13-01: GATE-02 PayFast sandbox spike
  13-02: STACK upgrades (@supabase/ssr + jose + federation-shared package)
  13-03: Module manifest contract (types.ts + 6 manifest files)

Wave 2 (depends on Wave 1):
  13-04: Manifest-driven registries (MANIFEST-03..06) — needs 13-03
  13-05: SSO architecture + DB migrations — needs 13-02 (jose installed)

Wave 3 (depends on Wave 2):
  13-06: SSO bridge full implementation — needs 13-05 (migrations + jose)
  13-07: Cross-product nav + provisioning saga — needs 13-05 + 13-06
```

**Total Phase 13 exit criteria:** After 13-07, a Swazulu admin can click "Trophy OS" in DraggonnB sidebar and land authenticated in Trophy within ~2 seconds, via a 60s HS256 JWT delivered via URL fragment, with jti tracked in `sso_bridge_tokens`, per-host cookies, and `tenant_membership_proof` middleware blocking unauthorized access.

---

## 10. Latent Bugs and Mismatch Surfaces

### LATENT-01: `@supabase/ssr` cookie API mismatch (CONFIRMED)

**Evidence:** `lib/supabase/server.ts` and `lib/supabase/middleware.ts` use `get/set/remove` callbacks. Current package version `0.1.0` in `package.json`. `@supabase/ssr` 0.5.0+ requires `getAll/setAll`.

**Impact:** The upgrade in STACK-01 MUST refactor both files. If the upgrade runs without the refactor, middleware will silently fail to refresh sessions (cookies won't update correctly), causing sporadic auth failures in protected routes.

**Detection:** TypeScript will NOT catch this at compile time (old API still type-checks in 0.1.0). Only runtime auth failures will surface it. The regression test suite (auth pages + middleware integration tests) will catch it if those tests exercise real cookie refresh.

**Plan:** 13-02 must include the refactor alongside the npm upgrade. Do not separate them.

### LATENT-02: `organisations.linked_trophy_org_id` query not yet in `getUserOrg()` or middleware cache

**Evidence:** `lib/supabase/middleware.ts` `resolveTenant()` queries `organizations` with `select('id, subscription_tier, subdomain')` — does NOT select `linked_trophy_org_id`.

**Impact:** After Migration A adds the column, the middleware will not automatically surface it in `x-tenant-*` headers. Plan 13-07 must update `resolveTenant()` to select and inject this column.

### LATENT-03: `ensureUserRecord()` auto-creates org for SSO-arrived users

**Evidence:** `getUserOrg()` in `lib/auth/get-user-org.ts` line 243: if no membership found for an authenticated user, it calls `ensureUserRecord()` which creates a NEW org with the user as admin.

**Impact in Phase 13:** A user who arrives via SSO bridge but has no `organization_users` row for the DraggonnB tenant they're being routed to will get a brand-new orphan org auto-created. This is wrong — they should get a 403.

**Resolution:** The `tenant_membership_proof` middleware (SSO-06) should 403 BEFORE `getUserOrg()` is called for cross-product-originated sessions. However, this depends on the middleware running correctly. Belt-and-suspenders: Add `allowAutoCreate?: boolean = true` parameter to `getUserOrg()`, and set it to `false` in any context where a user arrives via SSO bridge.

**Detection:** This bug is not detectable from the current code alone — it requires a test that simulates an SSO-originated session for a user who has `auth.users` but no `organization_users` row.

### LATENT-04: Telegram callback_data shape incompatible with manifest-driven registry

**Evidence:** `lib/accommodation/telegram/ops-bot.ts` uses raw Bot API with hardcoded callback_data strings (e.g., `"accept_task:{task_id}"`, `"complete_task:{task_id}"`). These don't follow the `approve:{product}:{action}:{id}` format that MANIFEST-04 requires.

**Impact:** Phase 14 grammY refactor will need to migrate all existing callback_data strings to the new format. This is NOT a breaking change for the ops bot (Phase 14 refactors it), but Phase 13 must define the new format clearly so Phase 14 implements it consistently.

**The new format (defined here as canonical for Phase 14):**
```
approve:{product}:{action_type}:{resource_id}
reject:{product}:{action_type}:{resource_id}
ack:{product}:{task_type}:{task_id}      ← for non-approval tasks
```

Phase 13 `telegram_callbacks[]` in manifests must use this format in `action_key`.

### LATENT-05: Provisioning step names in `ProvisioningStep` type are legacy

**Evidence:** `lib/provisioning/types.ts` lists step names including `'supabase-project'`, `'database-schema'`, `'github-repo'`, `'vercel-deployment'` — these are legacy v1 steps. The actual active steps are in `scripts/provisioning/steps/` (01-create-org, 06-automations, 07-onboarding, 08-qa-check, 10-schedule-followups). The type does not match reality.

**Impact on Phase 13:** Adding `'activate-trophy-module'` to the union type requires cleaning up the type first, or just adding to the existing mismatched union (acceptable for v3.1 scope). Document as a known tech debt item, not a blocker.

### LATENT-06: Trophy OS has no middleware.ts — unprotected routes

**Evidence:** `find .../trophy-os/src -name middleware.ts` returns nothing. The `/(dashboard)` routes exist but there is no middleware protecting them.

**Impact:** Without middleware, Trophy dashboard routes are accessible to unauthenticated users (they may 404 or return empty data, but no active redirect to login). Phase 13 must create `src/middleware.ts` for Trophy as part of the `tenant_membership_proof` implementation.

**Note:** Trophy may rely on server component auth checks instead of middleware. Verify in Phase 13 plan — if auth checks exist in each Trophy layout.tsx, the missing middleware is less critical. But `tenant_membership_proof` (SSO-06) requires middleware placement regardless.

### LATENT-07: `chargeAdhoc()` interface uses `amountCents` but sends rands

**Evidence:** `payfast-adhoc.ts` L14 interface: `amountCents: number`. L37: `const amountRands = (args.amountCents / 100).toFixed(2)` — divides by 100 before sending. This conversion exists and is documented with a spike-pending comment.

**Impact:** This is the GATE-02 spike question, not a confirmed bug. If the conversion is correct (rands expected), no change needed. If the endpoint expects cents, the division must be removed. The interface name `amountCents` is semantically correct for all callers — callers pass cents, the function converts to rands. The bug question is whether the conversion produces the right unit for the API.

### LATENT-08: `cross_product_org_links` junction vs `organizations.linked_trophy_org_id` column duality

REQUIREMENTS.md SSO-09 specifies `cross_product_org_links` table AND REQUIREMENTS.md SSO-10 specifies `organizations.linked_trophy_org_id` column. Both are needed:
- Column = fast FK-enforced lookup for RLS policies and middleware
- Table = audit trail + future multi-farm support

They must be kept in sync (both written on saga step 10 activation, both cleared on deactivation). Risk: if only one is updated, reads from the other return stale/wrong data.

**Mitigation plan:** Write both in the same database transaction in `activate-trophy-module`. No Postgres trigger needed — application code in the saga step handles both atomically via service-role client.

---

## Standard Stack (Phase 13)

### Core additions for this phase

| Library | Version | App | Purpose | Confidence |
|---------|---------|-----|---------|------------|
| `jose` | `^5.x` (5.10.x current) | DraggonnB + Trophy + federation-shared | HS256 JWT sign/verify | HIGH — verified via npm search 2026-05-01 |
| `@supabase/ssr` | `0.10.2` | DraggonnB (from 0.1.0) | Cookie getAll/setAll API | HIGH — verified via changelog |
| `@supabase/ssr` | `0.10.2` | Trophy (from 0.9.0) | Minor upgrade, already on new API | HIGH |
| `@supabase/supabase-js` | `^2.105.1` | DraggonnB | Latest JS client | HIGH |
| `@draggonnb/federation-shared` | `1.0.0` (exact) | DraggonnB + Trophy | Brand types, JWT helpers, ApprovalRequest types | HIGH |

### What we do NOT add in Phase 13

- `grammy` — Phase 14
- `@serwist/next` — Phase 16
- Redis / Upstash — Not needed, DB-backed jti (D7)
- Turborepo / Nx — Explicitly excluded (SUMMARY.md "What we DO NOT add")
- NextAuth / Clerk / Auth0 — Explicitly excluded

### Installation commands

**DraggonnB platform:**
```bash
npm install jose@^5.x @supabase/ssr@0.10.2 @supabase/supabase-js@^2.105.1
npm install @draggonnb/federation-shared@1.0.0 --save-exact
```

**Trophy OS:**
```bash
npm install jose@^5.x @supabase/ssr@0.10.2
npm install @draggonnb/federation-shared@1.0.0 --save-exact
```

**federation-shared:**
```bash
npm install jose@^5.x
```

---

## Architecture Patterns

### Pattern 1: SSO bridge round-trip

```
User (DraggonnB session) → sidebar click
  → GET /api/sso/issue?target=trophy
    → validate getUserOrg() session
    → lookup cross_product_org_links (target org)
    → assert user has org_members row in Trophy org
    → INSERT sso_bridge_tokens (jti, expires_at)
    → signBridgeToken(payload, SSO_BRIDGE_SECRET)
    → 302 redirect https://trophyos.co.za/sso/consume#token={jwt}
      Referrer-Policy: no-referrer
  → Trophy client-side extracts token from hash
    → POST /api/sso/validate { token }
      → verifyBridgeToken(token, SSO_BRIDGE_SECRET)
      → assert expires_at > now
      → SELECT sso_bridge_tokens WHERE jti = payload.jti
      → assert consumed_at IS NULL (replay protection)
      → UPDATE sso_bridge_tokens SET consumed_at = NOW()
      → supabase.auth.setSession(accessToken, refreshToken)
        (extracted from payload or fetched via admin API)
      → 200 { redirectTo: '/dashboard' }
  → client redirects to /dashboard (Trophy session cookie set)
```

### Pattern 2: Module manifest discovery

```
Boot time:
  MODULE_REGISTRY (static import array)
    → 6 module manifests imported explicitly
    → registry available synchronously (no async, no glob)

Request time (onboarding wizard):
  getManifestsForOrg(tenant.enabledModules)
    → filters MODULE_REGISTRY by org's active module IDs
    → returns manifests sorted by module id

Phase 14 boot (approval spine):
  new ApprovalActionRegistry(tenant.enabledModules)
    → calls assertAllHandlersResolvable()
    → throws at startup if any handler_path missing
    → else: handlers Map ready for dispatch
```

### Pattern 3: OPS-05 multi-step for new nullable columns

```
Migration file 1: ALTER TABLE ... ADD COLUMN ... NULL  ← ship
Code deployment: write code that sets the column       ← ship
Migration file 2: FK constraint                        ← ship after verifying data
```

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT signing/verification | Custom HMAC + JSON encode | `jose` SignJWT + jwtVerify | jose handles algorithm negotiation, exp validation, jti check, encoding correctly. Hand-rolling JWT has well-documented CVEs. |
| CSS class merging | Custom string concat | `clsx` + `tailwind-merge` (already in codebase) | Already used. |
| Cookie handling in Next.js | Custom cookie parsing | `@supabase/ssr` getAll/setAll | Handles edge cases: cookie splitting, encoding, refresh token rotation |
| npm package registry | Self-hosted Verdaccio | GitHub Packages (free for private packages in org) | GitHub Packages is free for private packages under the DRAGGONNB org. No infra to maintain. |
| Secret key generation | Math.random() or timestamp | `crypto.randomUUID()` for jti; `openssl rand -hex 32` for SSO_BRIDGE_SECRET | jti uniqueness is critical for replay protection. Math.random() has insufficient entropy. |

---

## Common Pitfalls

### Pitfall 1: `@supabase/ssr` upgrade without refactor breaks auth silently

**What goes wrong:** npm install completes, TypeScript compiles (old API still resolves), but sessions no longer refresh correctly. Users get randomly logged out.

**How to avoid:** Run the refactor (`getAll/setAll`) in the same commit as the version bump. Never split them. Add a grep check in CI: `grep -r 'cookies: { get(' lib/supabase/` should return zero after the upgrade.

### Pitfall 2: Bridge token in query string leaks via Referer

**What goes wrong:** Developer delivers token via `?token=...` instead of `#token=...`. Third-party analytics on Trophy page logs the full URL. Token exposed in third-party server logs.

**How to avoid:** The `/api/sso/issue` route MUST 302 redirect to `{trophy_url}/sso/consume#token={jwt}` with a literal `#`. Add a test that confirms the Location header from `/api/sso/issue` contains `#token=` not `?token=`.

### Pitfall 3: `ensureUserRecord()` auto-creates org for SSO-arrived user

**What goes wrong:** User arrives via bridge, has no `organization_users` row, `getUserOrg()` auto-creates an orphan org. Silent, no error, but user is now in a wrong org.

**How to avoid:** `tenant_membership_proof` middleware 403s before `getUserOrg()` runs. Belt-and-suspenders: `getUserOrg({ allowAutoCreate: false })` for SSO contexts.

### Pitfall 4: Manifest adds behavior to existing modules

**What goes wrong:** Developer adds a manifest and changes module behavior in the same PR (e.g., changes accommodation billing logic while adding the manifest). The manifest migration appears behavior-neutral but isn't.

**How to avoid:** Phase 13 manifest PRs are strictly additive. The manifest files only describe; they contain no executable logic. Review comment: "if this manifest file runs any code at import time, reject."

### Pitfall 5: federation-shared with `^` version range

**What goes wrong:** DraggonnB installs `^1.0.0` of federation-shared. A patch `1.0.1` ships with a breaking change in `BridgeTokenPayload`. DraggonnB auto-installs it in CI. Trophy still on `1.0.0`. The two apps now disagree on token shape.

**How to avoid:** Exact version pinning (no `^`). CI lint: `grep '"@draggonnb/federation-shared": "\^'` fails build.

---

## Code Examples

### SSO token issuance (lib/sso/issue.ts)

```typescript
// Source: this research document + jose ^5.x API
import { signBridgeToken } from '@draggonnb/federation-shared'
import { randomUUID } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

export async function issueSSOToken(
  userId: string,
  draggonnbOrgId: string,
  targetProduct: 'draggonnb' | 'trophy'
): Promise<string> {
  const admin = createAdminClient()

  // Resolve Trophy org from cross_product_org_links
  const { data: link } = await admin
    .from('cross_product_org_links')
    .select('trophy_org_id')
    .eq('draggonnb_org_id', draggonnbOrgId)
    .eq('status', 'active')
    .single()

  if (!link) throw new Error('No active cross-product link for this org')

  const jti = randomUUID()
  const expiresAt = new Date(Date.now() + 60_000).toISOString()

  // Write jti to replay-protection table
  await admin.from('sso_bridge_tokens').insert({
    jti,
    user_id: userId,
    origin_org: draggonnbOrgId,
    target_org: link.trophy_org_id,
    product: targetProduct,
    expires_at: expiresAt,
  })

  return signBridgeToken(
    {
      sub: userId,
      draggonnb_org: draggonnbOrgId as DraggonnbOrgId,
      trophy_org: link.trophy_org_id as TrophyOrgId,
      intended_product: targetProduct,
      jti,
    },
    process.env.SSO_BRIDGE_SECRET!
  )
}
```

### SSO token consumption (Trophy src/app/api/sso/validate/route.ts)

```typescript
// Source: this research document + jose ^5.x API
import { verifyBridgeToken } from '@draggonnb/federation-shared'
import { createAdminClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { token } = await request.json()

  let payload
  try {
    payload = await verifyBridgeToken(token, process.env.SSO_BRIDGE_SECRET!)
  } catch {
    return Response.json({ error: 'Invalid or expired bridge token' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Replay protection: check jti in sso_bridge_tokens
  const { data: bridgeToken } = await admin
    .from('sso_bridge_tokens')
    .select('consumed_at')
    .eq('jti', payload.jti)
    .single()

  if (!bridgeToken) {
    return Response.json({ error: 'Bridge token not found' }, { status: 401 })
  }

  if (bridgeToken.consumed_at) {
    // Write audit row for replay attempt
    await admin.from('audit_log').insert({
      action: 'sso_replay_attempt',
      resource_type: 'sso_bridge_token',
      resource_id: payload.jti,
      actor_id: payload.sub,
    })
    return Response.json({ error: 'Bridge token already consumed' }, { status: 401 })
  }

  // Mark as consumed
  await admin
    .from('sso_bridge_tokens')
    .update({ consumed_at: new Date().toISOString() })
    .eq('jti', payload.jti)

  // Verify user has org_members row for this Trophy org
  const { data: membership } = await admin
    .from('org_members')
    .select('id, role')
    .eq('org_id', payload.trophy_org)
    .eq('user_id', payload.sub)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return Response.json({ error: 'No membership in Trophy org — invite required' }, { status: 403 })
  }

  // Create Supabase session for user (same Supabase project = same auth.users)
  // Since both apps share auth.users, we can use the admin client to get user tokens
  const { data: sessionData } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: payload.sub, // we need email — add to BridgeTokenPayload
  })
  // Alternative: use admin.auth.admin.createSession if available in your Supabase version

  return Response.json({ redirectTo: '/dashboard' })
}
```

**NOTE:** The exact Supabase Admin session creation method needs verification in the spike. Options:
1. `supabase.auth.admin.createSession({ userId })` — creates a new session
2. The client on Trophy can call `supabase.auth.setSession(accessToken, refreshToken)` if the bridge token includes the access/refresh tokens (expanded payload)

For Phase 13, the spike (13-05) will confirm which approach works. The bridge token payload may need to include the access_token and refresh_token from the origin session.

---

## Open Questions

1. **Supabase session bridging mechanism:** `supabase.auth.admin.createSession({ userId })` vs passing access/refresh tokens in bridge JWT payload. The bridge JWT's 60s TTL is shorter than Supabase's access token TTL (60 minutes). Safest approach: include the Trophy-side access token in the bridge JWT payload (signed and protected), then `setSession()` on the Trophy client. Spike 13-05 must confirm.

2. **PayFast amount unit** (GATE-02): rands vs cents in adhoc endpoint. Blocked until sandbox spike.

3. **Trophy `orgs` table `type` column values:** The `activate-trophy-module` saga step defaults `type='lodge'`. Need to confirm valid enum values from Trophy schema. Audit Trophy migration files before shipping 13-07.

4. **`generate_link` vs `createSession`:** The Supabase Admin API for creating cross-session tokens changed across versions. Trophy is on `@supabase/supabase-js ^2.100.1`, DraggonnB on `^2.39.0` (upgrading to `^2.105.1`). The Admin API shape for session creation must be confirmed against `^2.105.1` docs.

5. **`tenant_modules.config` JSONB update for `trophy.linked_org_id`:** The update pattern in `activate-trophy-module` uses JSONB merge. Supabase's JS client supports `.update({ config: ... })` with a JSONB object, but merging nested JSONB requires `jsonb_set` or Postgres's `||` operator. Confirm the Supabase client's JSONB merge behavior before shipping.

---

## Sources

### Primary (HIGH confidence)
- `C:\Dev\draggonnb-platform\lib\supabase\middleware.ts` — current cookie API (get/set/remove), PLATFORM_HOSTS, tenant cache
- `C:\Dev\draggonnb-platform\lib\auth\get-user-org.ts` — ensureUserRecord() auto-create path, getUserOrg() flow
- `C:\Dev\draggonnb-platform\lib\payments\payfast-adhoc.ts` — chargeAdhoc() amount unit comment, existing prefix system
- `C:\Dev\draggonnb-platform\lib\payments\payfast.ts` — existing subscription pattern, rands-based amounts
- `C:\Dev\draggonnb-platform\lib\accommodation\payments\payfast-link.ts` — one-off checkout (NOT Subscribe), no token capture
- `C:\Dev\draggonnb-platform\lib\provisioning\types.ts` — ProvisioningStep type, CreatedResources
- `C:\Dev\draggonnb-platform\lib\provisioning\saga-state.ts` — pauseSaga/resumeSaga pattern
- `C:\Dev\draggonnb-platform\package.json` — @supabase/ssr@^0.1.0, @supabase/supabase-js@^2.39.0 confirmed
- `C:\Dev\DraggonnB\products\trophy-os\package.json` — @supabase/ssr@^0.9.0, Next.js 16.2.1, React 19
- `C:\Dev\DraggonnB\products\trophy-os\src\lib\supabase\server.ts` — already uses getAll/setAll (confirmed)
- `.planning\REQUIREMENTS.md` — D1..D11 locked decisions, all 31 Phase 13 REQ-IDs
- `.planning\research\SWAZULU-DISCOVERY.md` — operational reality, MANIFEST-* design rationale
- `.planning\research\ARCHITECTURE.md` — SSO bridge options, approval spine, provisioning step 10 pattern
- `.planning\research\SUMMARY.md` — 5 bottom-line findings, locked stack additions

### Secondary (MEDIUM confidence)
- `@supabase/ssr` upgrade guide — [GitHub Discussion 27037](https://github.com/orgs/supabase/discussions/27037): `getAll/setAll` migration pattern confirmed
- `jose` npm documentation — [npmjs.com/package/jose](https://www.npmjs.com/package/jose): SignJWT/jwtVerify API confirmed for HS256
- GitHub Packages .npmrc pattern — [GitHub Docs](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry): scoped registry + PAT confirmed

### Tertiary (LOW confidence — sandbox spike required)
- PayFast ad-hoc charge amount unit — cannot confirm rands vs cents from public docs; GATE-02 spike required
- PayFast Subscribe token + arbitrary amount capability — assumed from existing `chargeAdhoc()` comment; needs live sandbox test
- Supabase Admin API `createSession()` exact shape in v2.105.1 — needs verification at implementation time

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions verified from live package.json files
- Architecture: HIGH on codebase grounding; MEDIUM on SSO session creation mechanism (Open Question 1)
- MANIFEST design: HIGH — novel but internally consistent; no prior art mismatch risk
- Pitfalls: HIGH on latent bugs (confirmed from code); HIGH on upgrade regression surface
- PayFast sandbox: LOW — explicitly blocked on GATE-02 spike

**Research date:** 2026-05-01
**Valid until:** 2026-05-15 (stable domain for SSO patterns, @supabase/ssr API); re-validate PayFast sandbox findings after GATE-02 spike completes

---

*All codebase findings verified against live files at C:\Dev\draggonnb-platform and C:\Dev\DraggonnB\products\trophy-os on 2026-05-01.*

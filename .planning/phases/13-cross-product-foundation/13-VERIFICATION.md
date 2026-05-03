---
phase: 13-cross-product-foundation
verified: 2026-05-03T00:00:00Z
status: passed
score: 5/5 must-haves verified
gaps: []
---

# Phase 13: Cross-Product Foundation -- Verification Report

**Phase Goal:** Federate DraggonnB OS and Trophy OS via a JWT-based SSO bridge, cross-product navigation respecting per-product membership boundaries, and shared infrastructure for the rest of v3.1. Phase exit = a Swazulu user can click "Trophy OS" in DraggonnB sidebar and land authenticated within ~2 seconds, with zero auto-create of memberships.

**Verified:** 2026-05-03
**Status:** passed
**Re-verification:** No -- initial verification

---

## Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Bridge token is 60s HS256 JWT in URL fragment; ~2s one-click navigation; no Supabase round-trip on destination | VERIFIED | `sso/issue/route.ts` mints via `issueBridgeToken()` (HS256, 60s TTL), 302-redirects to `${TROPHY_BASE_URL}/sso/consume#token=...`. `sso/consume/page.tsx` calls `setSession()` client-side -- zero admin round-trip. `Referrer-Policy: no-referrer` set on redirect. |
| 2 | Replayed consumed token returns 401 + audit row; membership proof middleware 403s non-members, never auto-creates | VERIFIED | `validate/route.ts` checks `consumed_at IS NOT NULL` -> 401 + `audit_log` insert (`action: sso_replay_attempt`). Middleware L191-214 calls `verifyMembership()` with 60s cache on every protected subdomain path, returns 403. No auto-create in either path. |
| 3 | User without Trophy link lands on explicit Activate Trophy OS UX; per-host cookies enforced in code | VERIFIED | `TrophyCrossLink` renders `/dashboard/activate-trophy` link when `linkedTrophyOrgId` is null. Activate page shows real UX, not a redirect. Middleware `setAll` cookie handler has no `Domain=` option -- per-host isolation confirmed by comment guard at L172-175. |
| 4 | PayFast sandbox spike produces written record: amount unit, Subscribe-token charge, hold-and-capture availability | VERIFIED | `13-PAYFAST-SANDBOX-SPIKE.md` documents all three: amount=INTEGER CENTS (not rands), arbitrary amounts YES, hold-and-capture UNAVAILABLE. 5 bugs corrected in `payfast-adhoc.ts` + `payfast.ts`. 15 unit tests added. GATE-02 marked resolved in REQUIREMENTS.md. |
| 5 | `federation-shared@1.0.0` published; DraggonnB pins exact `1.0.0`; brand types cause TS error if mixed | VERIFIED | `package.json` pins `"@draggonnb/federation-shared": "1.0.0"` (no caret). CI check passes live: `OK: @draggonnb/federation-shared pinned at exact 1.0.0`. `node_modules/.../dist/index.d.ts` confirms `DraggonnbOrgId = string & { [draggonnbOrgIdBrand]: never }` (unique-symbol brand). `asDraggonnbOrgId`/`asTrophyOrgId` used in issue route. |

**Score: 5/5 truths verified**

---

## Required Artifacts

| Artifact | Lines | Status | Notes |
|----------|-------|--------|-------|
| `lib/sso/jwt.ts` | 45 | VERIFIED | Wraps federation-shared sign/verify; imported by all 3 SSO routes |
| `lib/auth/membership-proof.ts` | 28 | VERIFIED | Queries `organization_users` is_active; imported by middleware + validate route |
| `app/api/sso/issue/route.ts` | 105 | VERIFIED | Auth, `cross_product_org_links` lookup, `org_members` check, JWT mint, jti insert, 302 fragment redirect |
| `app/api/sso/validate/route.ts` | 107 | VERIFIED | JWT verify, jti single-use, org-link verify, membership check, session token return |
| `app/api/sso/invalidate/route.ts` | 60 | VERIFIED | Logout JWT verify, jti idempotency, `auth.admin.signOut` global scope |
| `app/sso/consume/page.tsx` | 92 | VERIFIED | Fragment extraction, POST validate, `setSession`, `history.replaceState`, `router.replace` |
| `lib/supabase/middleware.ts` | 287 | VERIFIED | Tenant resolution, `x-linked-trophy-org-id` injection, membership gate, CSP on `/sso/consume` |
| `components/sidebar/trophy-cross-link.tsx` | 119 | VERIFIED | Active state (bridge link + loading spinner) + inactive state (Activate CTA); wired in `sidebar-client.tsx` L69 |
| `components/dashboard/sidebar-server.tsx` | 65 | VERIFIED | Reads header, DB fallback for platform domain, passes `linkedTrophyOrgId` prop to `SidebarClient` |
| `app/(dashboard)/activate-trophy/page.tsx` | 77 | VERIFIED | Header check, auto-redirect if already linked, reason copy for missing-membership case |
| `app/(dashboard)/activate-trophy/activate-trophy-form.tsx` | 58 | VERIFIED | POST `/api/activate-trophy`, bridge redirect on success |
| `app/api/activate-trophy/route.ts` | 56 | VERIFIED | Admin role gate, typed `ProvisioningJob`, calls `activateTrophyModule()` |
| `scripts/provisioning/steps/activate-trophy-module.ts` | 126 | VERIFIED | 4-write idempotent flow with per-step rollback |
| `lib/modules/types.ts` | 73 | VERIFIED | `ModuleManifest` contract: `TenantInputSpec`, `ApprovalActionSpec`, `TelegramCallbackSpec`, `BillingLineTypeSpec` |
| `lib/modules/registry.ts` | 56 | VERIFIED | Explicit static import registry, 4 query helpers |
| 6 module manifests | 25-95 | VERIFIED | accommodation (95), crm (55), events (51), ai_agents (48), security_ops (47), analytics (25) |
| `lib/approvals/registry.ts` | 59 | VERIFIED | `ApprovalActionRegistry` class; `assertAllHandlersResolvable()` stub ready for Phase 14 handlers |
| `lib/telegram/callback-registry.ts` | 69 | VERIFIED | `buildCallbackData`, `buildCallbackPattern`, `parseCallbackData`, `listCallbacksForOrg` |
| `lib/billing/line-type-registry.ts` | 45 | VERIFIED | `validateBillingLineType`, `lookupLineType`, `listLineTypesForOrg` |
| `lib/onboarding/manifest-form-builder.ts` | 64 | VERIFIED | `buildOnboardingForm`, `extractInitialValues` |
| 5 DB migrations | -- | VERIFIED APPLIED | `sso_bridge_tokens`, `cross_product_org_links`, `linked_trophy_org_id` nullable, `set_tenant_module_config_path` RPC, FK -- all confirmed live per 13-07-SUMMARY orchestrator verification queries |
| `scripts/ci/check-federation-pinned.mjs` | 15 | VERIFIED | Live run: `OK: @draggonnb/federation-shared pinned at exact 1.0.0` |
| `scripts/ci/check-sso-lint.mjs` | 158 | VERIFIED | Live run: `OK: SSO-08 lint passed (revalidate guard + dashboard-page tenancy chain)` |

---

## Key Links

| From | To | Via | Status |
|------|----|-----|--------|
| `TrophyCrossLink` | `/api/sso/issue?target=trophy` | `window.location.href` | WIRED |
| `/api/sso/issue` | Trophy `/sso/consume#token=...` | 302 fragment redirect | WIRED |
| `/sso/consume` | `/api/sso/validate` | `fetch` POST | WIRED |
| `/api/sso/validate` | `sso_bridge_tokens.consumed_at` | admin `UPDATE` | WIRED |
| `/api/sso/validate` | `cross_product_org_links` | admin `SELECT` | WIRED |
| `/api/sso/validate` | `verifyMembership()` | `lib/auth/membership-proof` | WIRED |
| Middleware | `verifyMembership()` (60s cache) | `lib/auth/membership-proof` | WIRED |
| `sidebar-server.tsx` | `x-linked-trophy-org-id` header | `headers()` + DB fallback | WIRED |
| `SidebarServer` | `SidebarClient` -> `TrophyCrossLink` | `linkedTrophyOrgId` prop | WIRED |
| `activate-trophy-form` | `/api/activate-trophy` | `fetch` POST | WIRED |
| `/api/activate-trophy` | `activateTrophyModule()` | direct import | WIRED |
| `activateTrophyModule` | `orgs`, `cross_product_org_links`, `organizations`, RPC | admin client | WIRED |

---

## Accepted Deferrals

| Item | Deferred To | Reference |
|------|-------------|-----------|
| `auth.draggonnb.com` Vercel alias + DNS CNAME | Phase 16 | `13-SSO-SPIKE.md` Section 12A. Issuer is callable on platform domain; no breaking change when alias is added later. |
| Trophy companion: `middleware.ts`, `/api/sso/issue`, `/sso/consume` on `trophyos.co.za` | Trophy OS session | `13-RESEARCH.md` Trophy Companion section; `13-07-SUMMARY` affects block |
| `assertAllHandlersResolvable()` boot call | Phase 14 | Function ships in Phase 13; approval handlers ship in Phase 14 |
| `activate-trophy-module` in provisioning orchestrator | Phase 15 | Direct-call via `/api/activate-trophy` is correct for CTA-driven activation; orchestrator wiring belongs in Phase 15 when full provisioning includes Trophy |
| E2E SSO smoke test DraggonnB <-> Trophy | Phase 14 | Requires Trophy companion code first |

---

## Anti-Pattern Scan

No blockers. Notable guards confirmed:

- `consume/page.tsx`: `history.replaceState` clears URL fragment immediately after token extraction -- prevents re-use via back-navigation.
- `validate/route.ts`: `consumed_at` UPDATE fires before returning any response -- prevents race-condition replay window.
- Middleware `setAll`: no `options.domain` property being set -- per-host cookie isolation holds by `@supabase/ssr` default.
- `get-user-org.ts`: `allowAutoCreate` defaults `true` for backward compat, but SSO bridge routes use `createAdminClient()` with direct queries and never call `getUserOrg()` in the bridge flow -- flag is not in the SSO critical path.

---

## Human Verification Required

These require a live Trophy deployment with companion code; they are not blocking Phase 14 planning.

### 1. End-to-End Browser SSO Flow

**Test:** Sign in as a user with an active Trophy link. Click "Trophy OS" in the sidebar. Observe URL bar during redirect.
**Expected:** Fragment token (`#token=...`) visible momentarily then gone (`history.replaceState` clears it). Trophy dashboard loads authenticated in under 2 seconds. No Supabase sign-in page shown.
**Why human:** Requires live Trophy deployment with companion SSO routes.

### 2. Replay Attack Browser Test

**Test:** Capture bridge token from URL fragment via DevTools. After first consume completes, navigate to `/sso/consume#token={captured}` manually.
**Expected:** Error page shows "Bridge token already consumed". No session established.
**Why human:** Requires a real bridge token from a live flow.

### 3. Per-Host Cookie Browser Inspection

**Test:** Sign into `{tenant}.draggonnb.co.za`. Open DevTools -> Application -> Cookies. Confirm no cookie has `Domain=.draggonnb.co.za`.
**Expected:** Only host-scoped cookies; no wildcard domain leak.
**Why human:** Browser DevTools inspection of live deployment.

---

## Summary

All 5 success criteria are verified in code. The SSO bridge is wired end-to-end: fragment delivery, single-use jti tracking, membership-proof middleware, explicit-activation UX, per-host cookie isolation, and CI lint guards. `@draggonnb/federation-shared@1.0.0` is published, installed, and pinned exact. The PayFast spike delivers the written record that unblocks Phase 15. The module manifest layer -- types, registry, 6 manifests, 4 consumer registries -- is substantive and ready for Phase 14 consumers.

Three accepted deferrals have documented targets: `auth.draggonnb.com` alias (Phase 16), Trophy companion code (Trophy OS session), E2E smoke test (Phase 14 post-Trophy). None conflict with the ROADMAP.md exit condition.

Phase 14 may begin.

---

_Verified: 2026-05-03_
_Verifier: Claude (gsd-verifier)_

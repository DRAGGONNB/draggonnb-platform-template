# Research Summary — DraggonnB OS v3.1 "Operational Spine"

**Project:** DraggonnB OS v3.1 — federation milestone with Trophy OS
**Domain:** Two-product federation on shared Supabase, anchored on Swazulu Game Lodge dual-product pilot
**Researched:** 2026-05-01
**Confidence:** HIGH on existing-codebase grounding and on PayFast/Telegram/Supabase primitives. MEDIUM on cross-product UX patterns. LOW on PayFast capabilities not in public docs (hold-and-capture, EFT-token interplay) — sandbox spike required in Phase 13.

---

## Bottom Line — 5 punchy statements

1. **The naive "shared cookie domain" SSO plan is structurally blocked AND catastrophic.** STACK proposed `cookieOptions.domain = '.draggonnb.co.za'` (clean, zero-dep). ARCHITECTURE corrected: Trophy OS lives on `trophyos.co.za` — different eTLD+1, browsers refuse to share cookies. PITFALLS Pitfall 1 escalated further: even within `.draggonnb.co.za`, that scope is shared with every other tenant subdomain — POPI-grade cross-tenant session leak risk. **Resolution: dedicated `auth.draggonnb.co.za` HMAC-signed-token bridge with per-host cookies. Pitfall view wins. Phase 13 must lead with this architecture spike, not a build.**

2. **`approval_requests` already exists. It is hardcoded to social posts.** Phase 14 is a 3-step OPS-05 migration (add nullable cols → backfill social rows → add NOT NULL), spread across 3 deploys. Bundling will fail mid-deploy. Phase 14 must split into 14.1, 14.2, 14.3 sub-plans.

3. **Damage auto-billing has a hidden 1-phase pre-requisite: PayFast Subscribe-token capture for accommodation deposits.** `lib/accommodation/payments/payfast-link.ts` currently uses one-off checkout, which does NOT return a stored token. Phase 15 must lead with 15.1 "convert deposit/balance to Subscribe + capture token" before any damage code lands.

4. **Phase 15 has a circular dependency with Phase 16 needing explicit splitting.** Per-hunter charges (15.6) need Trophy PayFast wiring (16.1). Resolution: stub per-hunter records in 15.6 (no charge), defer charge call to 16.2.

5. **Pre-Phase-13 Swazulu discovery call is not optional.** Pitfall 28 surfaces the highest-blast unknown: v3.1's split-billing model, approval thresholds, damage windows, and role mappings all assume something about Swazulu's operational reality. Mid-milestone redesign cost exceeds 1 phase. **Schedule before Phase 13 starts.**

---

## Cross-cutting decisions for Chris — lock these BEFORE plan-phase runs

### D1 (HIGHEST BLAST) — SSO bridge architecture

| Option | Verdict |
|--------|---------|
| A. Shared cookie on `.draggonnb.co.za` (STACK's original) | **CATASTROPHIC — cross-tenant session leak. Trophy is on different eTLD+1 anyway.** |
| B. JWT bridge endpoint at `auth.draggonnb.co.za` (ARCHITECTURE + PITFALLS converge) | **RECOMMENDED** |
| C. Hybrid (B + Supabase Admin createSession) | Phase 17+ if needed |

**Recommendation: B with stateless JWT (60s expiry, jti via `sso_bridge_tokens` table for replay protection). URL fragment delivery (`#token=...`), Referrer-Policy: no-referrer, single-use. Per-host cookies on each app.** Bridge token carries explicit `intended_tenant_id` + `origin_tenant_id`. `tenant_membership_proof` middleware runs BEFORE `getUserOrg()` on every protected route. NO auto-create of cross-product memberships ever.

### D2 (HIGHEST BLAST) — Cross-product role mapping

| Option | Verdict |
|--------|---------|
| A. Auto-translate Trophy 9 roles → DraggonnB 4 roles | **CATASTROPHIC — privileged action via mismatched trust models** (Pitfall 2) |
| B. Per-product memberships, no auto-translate | **RECOMMENDED** |

**Recommendation: B.** Federation token references a tenant the user has no membership in → "Invite required" UX. Approval action types are product-scoped: `draggonnb.damage_charge`, `trophy.quota_change`. No generic cross-product approval type.

### D3 (HIGHEST BLAST) — PayFast deposit conversion to Subscribe

| Option | Verdict |
|--------|---------|
| A. ALL bookings convert to Subscribe | Some EFT-only guests can't tokenize (Pitfall 24) |
| B. Selective via `requires_token_capture` flag | More code |
| C. Default ALL to Subscribe; surface "no token" gracefully when EFT chosen | **RECOMMENDED** |

**Recommendation: C.** Damage flow checks token existence; if absent, routes to manual collection. T&Cs disclose "card kept on file for damage charges up to R{cap} within 7 days of checkout." Cap stored in `accommodation_bookings.max_incidental_charge_zar`. Hard 7-day window from checkout enforced at app layer.

### D4 (HIGH BLAST) — Single billing root for hunt + stay

| Option | Verdict |
|--------|---------|
| A. DraggonnB-rooted | Complex |
| B. Trophy-rooted | Complex |
| C. Parallel subscriptions, same card | **RECOMMENDED for v3.1** |
| D. Synthetic invoice product | +1 phase, defer to v3.2 |

**Recommendation: C.** Guest sees two PayFast charges (one stay, one hunt) but checkout is single. Marketing copy: "Pay once for hunt, once for stay — both via the same card." NOT "single charge for everything" (Pitfall 5). Two invoices with line items clear, VAT applied per type.

### D5 (HIGH BLAST) — PayFast lib sharing strategy

**Tension:** STACK ADR E says copy-paste fine for 4 small files; PITFALL-9 warns drift over 60 days.

**Recommendation: Hybrid.** PayFast lib (4 small pure-Node files) gets copy-paste with sync-version header AND tracking line in `.planning/STATE.md`. **Federation-shared logic (JWT signing/verification, types for `approval_requests`, brand types `DraggonnbOrgId`/`TrophyOrgId`) goes in private package `@draggonnb/federation-shared` with exact version pinning.** Different artifacts, different sharing strategies, justified by different blast radii.

### D6 — Auto-provision Trophy `org_members` row at first SSO bridge?

**Recommendation: Auto-provision Trophy `orgs` row at module-activation time (provisioning saga step 10). Explicit invite for additional `org_members`.** Idempotent. Rollback cascades. PITFALL-11 silent permission grant avoided.

### D7 — Replay protection for SSO JWT

**Recommendation: DB-backed `sso_bridge_tokens` table for v3.1.** No new infra dep, audit-friendly. Promote to Redis if volume justifies (>1000 bridge crossings/day).

### D8 — Mobile sweep scope

**Recommendation: DraggonnB only (82 pages) for Phase 16.** Trophy already follows mobile-first per its CLAUDE.md; defer Trophy sweep to v3.2. Pre-Phase-16 lightweight sweep on top 5 pages catches obvious breakage before milestone budget consumed.

### D9 — Single Telegram bot vs dedicated Trophy bot

**Recommendation: Single bot per org, product-tagged callback data** (`approve:{product}:{request_id}`). Routes to `lib/approvals/spine.ts` dispatching to per-action-type handler. Pitfall 21 enforced (internal IDs only, no PII). Pitfall 6 enforced (`update_id` idempotency, `secret_token` mandatory, approver verification, inline keyboard self-disables, DMs only).

### D10 — Currency display rule

**Recommendation: lock as v3.1 standard.** All guest-facing financial UI displays "ZAR 10,500.00 (≈ USD 575)" with ISO code prominent. PWA + WhatsApp + email + invoice all conform.

---

## Stack additions locked

### Net-new runtime dependencies

| Library | Version | App | Purpose | Phase |
|---------|---------|-----|---------|-------|
| `grammy` | `^1.42.0` | DraggonnB | Telegram bot framework — webhooks, inline keyboards, callback queries, secret-token verification | 14 |
| `@serwist/next` | `^9.5.10` | DraggonnB | Service worker generator for PWA guest surface | 16 |
| `serwist` | `^9.5.10` | DraggonnB (devDep) | Workbox-fork runtime, peer of `@serwist/next` | 16 |
| `jose` | `^5.x` | DraggonnB + Trophy + federation-shared | HS256 JWT for SSO bridge | 13 |

### Critical version upgrades

| Library | From → To | App | Risk |
|---------|-----------|-----|------|
| `@supabase/ssr` | `0.1.0` → `0.10.2` | DraggonnB | Half-day refactor (`cookies.get/set/remove` → `getAll/setAll`); regression-test middleware + auth pages |
| `@supabase/ssr` | `0.9.0` → `0.10.2` | Trophy | Low |
| `@supabase/supabase-js` | `^2.39.0` → `^2.105.1` | DraggonnB | Low |

### Federation-shared private package (NEW per D5)

`@draggonnb/federation-shared` — separate small repo, GitHub Packages registry. Initial contents: HS256 JWT sign/verify (uses `jose` lib), `ApprovalRequest` types, brand types `DraggonnbOrgId`/`TrophyOrgId`. Hard cap 200 LOC. Both products lock to exact version (no `^` ranges).

### What we explicitly DO NOT add

NextAuth.js / Clerk / Auth0 / Lucia / `next-pwa` / `@ducanh2912/next-pwa` / `node-telegram-bot-api` / `telegraf` / Turborepo or Nx monorepo / Stripe / `@base-ui/react` from Trophy into DraggonnB / symlink-based code sharing.

---

## Architecture shape — 5 load-bearing patterns

### 1. SSO bridge JWT pattern (Phase 13)

`auth.draggonnb.co.za` issues 60s HS256 JWT signed with `SSO_BRIDGE_SECRET`. Both products consume via `/api/sso/consume`. Per-host cookies. URL fragment delivery + Referrer-Policy: no-referrer + jti replay protection via `sso_bridge_tokens` DB table + single-use. **Critical guard:** `tenant_membership_proof` middleware runs BEFORE `getUserOrg()` on every protected route — asserts `(user_id, tenant_id)` membership exists with `is_active=true`. No row = 403, never silent auto-create. Federation token carries explicit `intended_tenant_id` + `origin_tenant_id`; both checked at receiver.

### 2. Approval spine generalization (Phase 14) — 3-step OPS-05 migration, NON-NEGOTIABLE

```
14.1: ALTER TABLE approval_requests ADD COLUMN product, target_resource_type,
      target_resource_id, target_org_id, action_type, action_payload (NULLABLE).
      ALTER post_id DROP NOT NULL. Deploy code that writes new columns.
14.2: UPDATE approval_requests SET product='draggonnb', target_resource_type='social_post',
      target_resource_id=post_id, target_org_id=organization_id, action_type='social_post'
      WHERE product IS NULL. Idempotent. Deploy. Verify zero NULLs.
14.3: ALTER COLUMN ... SET NOT NULL on the four target columns.
      Leave post_id for Phase 17 cleanup.
```

3 separate migrations, 3 separate deploys. RLS strategy: 3 OR-stacked SELECT policies. Atomic stored proc `approve_request_atomic(approval_id, approver_user_id, decision)` enforces expiry + idempotency + status reconciliation.

### 3. Cross-schema FK semantics (Phase 15)

`safaris.accommodation_booking_id UUID NULL REFERENCES accommodation_bookings(id) ON DELETE SET NULL`. **NEVER CASCADE** (Pitfall 5). Bidirectional status-sync handlers ship together. Cross-product RLS join requires user membership in BOTH `safaris.org_id` (Trophy `org_members`) AND `accommodation_bookings.organization_id` (DraggonnB `organization_users`). Reconciliation cron (Phase 16) scans for orphans + date drift weekly.

`organizations.linked_trophy_org_id UUID NULL REFERENCES orgs(id) ON DELETE SET NULL` — column-on-orgs (one-to-one) for v3.1; migrate to junction `cross_product_org_links` in v3.2 if multi-farm-per-org demand. Brand types `DraggonnbOrgId` / `TrophyOrgId` in federation-shared package — compiler refuses to mix.

### 4. PayFast Subscribe-token capture as Phase 15 pre-requisite

`lib/accommodation/payments/payfast-link.ts` switches one-off → Subscribe checkout. Token returned in ITN webhook stored on `accommodation_bookings.guest_payfast_token` (NEW nullable column). `chargeAdhoc()` called at damage approve time with `DAMAGE-{booking_id}` prefix. Per-token cap on `accommodation_bookings.max_incidental_charge_zar` (default booking.total × 1.5 or R5,000 whichever higher). Hard 7-day window from `bookings.checkout_date` enforced at app layer. Photo evidence: 2+ photos, write-once bucket, `service_role` DELETE only, versioning enabled, CRC32 hash, EXIF timestamp within damage window. EFT edge case: if EFT, no token; damage flow checks token existence first, routes to manual collection if absent.

### 5. Trophy PayFast lib reuse — copy not monorepo

PayFast files (`payfast.ts`, `payfast-adhoc.ts`, `payfast-prefix.ts`, `payfast-subscription-api.ts`) physically copied into Trophy `src/lib/payments/` with sync-version header in each file. Tracked in `.planning/STATE.md`. Trophy gets its OWN ITN webhook with prefix-routing: `SUB-` (DraggonnB), `TOS-` (Trophy subs), `ACC-` (DraggonnB accommodation), `SAFARI-` (Trophy hunter). Same merchant credentials, distinct routes. `billing_plans.product` column added (3-step OPS-05).

---

## Critical pitfalls to guard — severity-ordered

### CATASTROPHIC

| # | Pitfall | Phase | Guard |
|---|---------|-------|-------|
| **1** | **Cookie-scope leak across multi-tenant subdomains** | **13 (FIRST PLAN)** | Per-host cookies + dedicated `auth.draggonnb.co.za` bridge with HMAC tokens. `tenant_membership_proof` middleware. NO `revalidate=N` on auth-touching routes (CI lint). NO auto-create cross-product memberships ever. **Single biggest risk in v3.1.** |
| 2 | Cross-product role mapping leaks privileged actions | 13 + 14 | No role auto-translate. Per-product memberships. Approval action types product-scoped. |
| 3 | Damage charge fires after window or beyond cap | 15 | 7-day window from checkout, per-token cap, dual consent (booking T&Cs + pre-charge WhatsApp), 2+ photo evidence write-once, chargeback monitoring cron, per-tenant kill switch at >2% chargeback rate |

### HIGH

4. Multi-hunter split-billing orphan charges + refund chaos (Phase 15 — `safari_hunters` is financial truth, locked rate, pre-arrival gate, per-token refund UI, idempotency keys per charge)
5. Cross-product stay-link FK breaks on cascade (Phase 15+16 — ON DELETE SET NULL never CASCADE, bidirectional handlers tested, RLS join requires both memberships, reconciliation cron flags drift)
6. Telegram approval bot replays charge based on resent message (Phase 14 — `update_id` idempotency via `telegram_update_log` PK, approver verification mapped not tap-based, `secret_token` mandatory, expiry 30s grace, inline-keyboard self-disable on first valid click, DM to assigned approver only)
7. PWA service worker serves stale booking data (Phase 16 — caching by route class, versioned cache key, "update available" banner, offline form conflict UI, iOS-aware UX, token-protected URLs random-not-bookingID, edge rate-limit)
8. Trophy trial-expiry math wrong UTC vs SAST (Phase 16 — tenant TZ + 4h grace, retry capped at 3 with backoff, RLS read-only on cancelled/past_due, tier downgrade end-of-cycle)
9. Federation-shared lib drifts between repos (Phase 13 — `@draggonnb/federation-shared` private package, exact version pinning, CI smoke-test downstream)
10. Approval expiry race (Phase 14 — atomic stored proc, 30s grace, cron sweep doesn't change in-flight rows)

### MEDIUM (12 catalogued in PITFALLS.md)

BILL-08 surfaces v3.0 drift, 12-07 push deploy breakage, mobile sweep critical bug late, Trophy ↔ DraggonnB schema confusion, WhatsApp silent fail, federation referrer leak, photo evidence tampering, Telegram PII leak, unified billing UI hides per-product fail, PWA install prompt timing, EFT no-token, single-billing-root tax/invoice.

### MINOR (4 catalogued)

Federation logout propagation, Telegram bot user mapping ambiguity, **Pilot reveals design-assumption mismatch (Pre-Phase-13 — discovery call)**, investor demo on unstable mid-milestone state.

---

## Recommended phase sequence

Proposed Phase 13-16 SURVIVES research with these refinements:

### Pre-Phase 13: Swazulu discovery call (NEW — non-optional)

Validate v3.1 architectural assumptions against Swazulu operational reality. **Block Phase 13 architecture lock until done.**

### Phase 13: Cross-product foundation

- 13.1 SSO architecture spike (design + threat-model + integration-test plan)
- 13.2 SSO bridge implementation (`lib/sso/jwt.ts`, `/api/sso/{issue,consume}`, org-link, brand types, `tenant_membership_proof` middleware)
- 13.3 Cross-product sidebar federation (DraggonnB + Trophy conditional links)

### Phase 14: Approval spine — split into 3 OPS-05 sub-plans

- 14.1 Add nullable columns + write code
- 14.2 Backfill + verify
- 14.3 NOT NULL constraints + spine implementation (grammY adoption, Telegram tap-to-approve, `/approvals` page)

### Phase 15: Damage auto-billing + Hunt bookings + Cross-product link — internal sub-ordering

- 15.1 PayFast Subscribe-token capture (PRE-REQ)
- 15.2 Damage Telegram intake
- 15.3 Damage approval handler + auto-charge
- 15.4 Multi-hunter split-billing
- 15.5 Cross-product stay link
- 15.6 Per-hunter charge stub (charges queued, no PayFast call yet)

### Phase 16: PWA + Trophy PayFast + v3.0 carry-forward

- 16.1 Trophy PayFast wiring
- 16.2 Per-hunter charge flow (completes 15.6)
- 16.3 PWA route group + token auth
- 16.4 Concierge web adapter
- 16.5 v3.0 carry-forward (BILL-08 DRY-RUN, 12-07 rebase + push, OPS-02..04, 360px DraggonnB-only mobile sweep)

### Critical sequencing risks (re-stated)

1. **Phase 14 must NOT bundle migrations** — 3 separate deploys per OPS-05.
2. **Phase 15.1 is a hidden pre-requisite.** Without Subscribe-token capture, no guest token = damage flow blocked.
3. **Phase 15.6 ↔ 16.1 circular dependency** — stub in 15, charge in 16.
4. **Pre-Phase 13 Swazulu discovery call** — block architecture lock until done.

---

## Open questions for phase research

| Phase | Sub-plan | Why deeper research needed | What to research |
|-------|----------|----------------------------|------------------|
| 13 | 13.1 architecture spike | SSO bridge has no precedent in this codebase + threat model | Validate HS256 vs ES256, jti TTL, fragment delivery vs query, exact CSP headers, Vercel edge IP allow-listing |
| 15 | 15.1 PayFast Subscribe spike | LOW-confidence area: amount unit, non-subscription token charging | Sandbox spike: confirm `chargeAdhoc()` amount unit; confirm Subscribe token charges via adhoc work |
| 15 | 15.4 multi-hunter PayFast | Per-hunter token model is novel | Sandbox: 4 parallel subscriptions same merchant, refund-when-token-expired flow |
| 16 | 16.3 PWA iOS install UX | Vendor-controlled (iOS 26 default behavior change Apr 2026) | Live device test on iOS 26 + iOS 16.4 + Android Chrome |
| 16 | 16.5 BILL-08 dry-run | Surfaces unknown v3.0 drift | Pre-Phase audit script against 8 known orgs |

---

## Confidence assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | npm versions verified 2026-04-30. grammY/serwist/Supabase SSR all current. Single LOW: PayFast hold-and-capture availability. |
| Features | HIGH | Industry patterns from Atlassian, Mews, Cloudbeds, INTELITY, HuntDocs well-documented. MEDIUM on Swazulu-specific operational reality. |
| Architecture | HIGH on existing-codebase grounding. MEDIUM on federation patterns (reasoned, not validated in production). LOW on PayFast multi-product ad-hoc behavior. |
| Pitfalls | HIGH on Supabase auth, PayFast tokenization, Telegram callback semantics, existing v3.0 state. MEDIUM on PWA offline conflict resolution. |

**Overall confidence: HIGH** — milestone is well-researched; cross-cutting tensions surfaced (cookie scope, role mapping, single billing root) all have defensible resolutions. Dominant remaining risk is the gap between v3.1 design assumptions and Swazulu's actual operations, which the discovery call resolves.

---

*Research synthesized: 2026-05-01*
*Ready for roadmap: yes — pending pre-Phase-13 Swazulu discovery call to lock D3, D4, D6, D9*

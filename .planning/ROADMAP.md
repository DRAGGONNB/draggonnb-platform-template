# Roadmap: DraggonnB OS

## Overview

DraggonnB OS is a production-deployed multi-tenant B2B operating system for South African SMEs. The v1 roadmap (7 phases), v2 BOS (5 phases), architecture restructure, UI rebrand, accommodation module, restaurant module, and Elijah security module are all complete. v3.0 Commercial Launch shipped 2026-04-27 (phases 09-11 complete; phase 12 partially shipped). v3.1 Operational Spine (phases 13-16) federates DraggonnB OS and Trophy OS into a single ecosystem via SSO bridge + cross-product approval spine + multi-hunter split-billing + accommodation↔hunt linkage + PWA guest surface + Trophy PayFast wiring, anchored on Swazulu Game Lodge as the first dual-product pilot.

## Milestones

- [x] **v1.0 Core Platform** - Phases 01-07 (shipped 2026-02-09)
- [x] **v2.0 BOS** - Phases A-E (shipped 2026-02-14)
- [x] **v2.1 Architecture Restructure + UI Rebrand** - (shipped 2026-03-01)
- [x] **v2.2 Accommodation Module** - (shipped 2026-03-10)
- [x] **v2.3 Elijah Security Module** - (shipped 2026-04-01)
- [x] **v2.4 Restaurant Module Upgrade** - (shipped 2026-04-09)
- [~] **Phase 08 Meta Integration** - (08.2 + 08.3 shipped 2026-03-15; 08.1/08.4/08.5 deferred pending META credentials)
- [~] **v3.0 Commercial Launch** - Phases 09-12 (started 2026-04-24; 09-11 complete; 12 partial — carry-forward into v3.1 Phase 16)
- [ ] **v3.1 Operational Spine** - Phases 13-16 (started 2026-05-01)

## Completed Work

<details>
<summary>v1.0 Core Platform (Phases 01-07) - SHIPPED 2026-02-09</summary>

| Phase | Title | Completed |
|-------|-------|-----------|
| 01 | Security & Auth Hardening | 2026-02-03 |
| 02 | Core Module Completion | 2026-02-04 |
| 03 | Landing Page & Public UI | 2026-02-09 |
| 04 | N8N Automation | 2026-02-09 |
| 05 | Social Media Integration | 2026-02-05 |
| 06 | Client Provisioning | 2026-02-05 |
| 07 | Testing & Hardening | 2026-02-05 |

</details>

<details>
<summary>v2.0 BOS (Phases A-E) - SHIPPED 2026-02-14</summary>

- Phase A: CLAUDE.md hierarchy, error catalogue, module manifest
- Phase B: Provisioning steps 6-8, brand theming, manifest integration
- Phase C: Build reviewer agent, quality system
- Phase D: Ops dashboard schema (deferred until 5+ clients)
- Phase E: ClientOnboardingAgent, AI ops architecture

</details>

<details>
<summary>v2.1 Architecture Restructure + UI Rebrand - SHIPPED 2026-03-01</summary>

- Shared DB + RLS (replaces per-client Supabase)
- Single Vercel deployment with wildcard subdomain
- DB-backed module registry + tenant_modules
- Simplified provisioning (org row + modules)
- Brand Crimson/Charcoal palette across dashboard + landing

</details>

<details>
<summary>v2.2 Accommodation Module - SHIPPED 2026-03-10</summary>

- 84 DB tables (14 migration files), 102 API routes, 12 UI pages
- 4 AI agents (Quoter, Concierge, Reviewer, Pricer)
- Event dispatcher + automation rules + message queue
- Guest portal, channel manager (iCal), PayFast integration
- Telegram ops bot + per-unit cost tracking + stock inventory

</details>

<details>
<summary>v2.3 Elijah Security Module - SHIPPED 2026-04-01</summary>

- 33 DB tables + 16 enums + full RLS, 23 API routes, 19 UI pages
- 4 N8N workflows (roll call, escalation, fire alert, incident intake)
- WhatsApp command router (Incident Intake deferred pending Cloud API)

</details>

<details>
<summary>v2.4 Restaurant Module Upgrade - SHIPPED 2026-04-09</summary>

- Block-based SOPs, POS, QR menus, Konva floor plan editor
- 6 management pages, 4 N8N workflows activated
- 583 tests across 34 files passing

</details>

<details>
<summary>v3.0 Commercial Launch (Phases 09-12, partial) - SHIPPED 2026-04-27</summary>

**Locked scope decisions (2026-04-24):**
- PayFast billing: hybrid (variable-amount recurring for base+modules, one-off ad-hoc for setup fees + overage top-ups)
- Anthropic cache isolation: `org_id` as first distinct system block; golden two-tenant CI test
- Campaign Studio: scaffold ships in v3.0 (Option B), email + SMS active, FB/IG/LinkedIn credential-gated
- Embedded Finance: deferred to v3.1+ with accountant review gate on first 3 pilot tenants
- Existing 8 orgs: audit + migrate paying, delete test (no grandfather constraints)

### Phase 09: Foundations & Guard Rails — COMPLETE 2026-04-26 (5/5 plans)
**Goal**: Ship billing composition + usage enforcement + all catastrophic-pitfall guards before any v3.0 AI feature or UI work begins. Zero UI impact to end users; operator + platform-admin facing only.

### Phase 10: Brand Voice + Site Redesign + 3-Day Onboarding — COMPLETE 2026-04-27 (7/7 plans)
**Goal**: Close the sign-up-to-first-paying-client loop. Ship brand voice capture into every existing AI agent, rewrite the public site with an interactive module picker, and automate the 3-day onboarding pipeline.

### Phase 11: Easy/Advanced CRM PoC + Campaign Studio Decision Gate — COMPLETE 2026-04-27 (12/12 plans, 5 runtime checks pending)
**Goal**: Validate the `<ModuleHome>` + Easy/Advanced pattern on CRM. Campaign Studio scaffold + email + SMS shipped under decision gate (Option B locked).

### Phase 12: Launch Polish + v3.1 Handoff — PARTIAL (3/10 plans shipped; remainder carried into v3.1 Phase 16)
**Goal**: Convert Phase 09-11 telemetry into reconciliation + audit + monitor crons, mobile sweep across revenue-critical pages, error catalogue pattern fixes.

**Shipped:**
- 12-01: hotfix sweep (CRM SSR, routes, sidebar, BaseAgent errors)
- 12-06: dynamic sidebar shell + ModeToggle primitive + 4 overview pages
- 12-08: module-focused public landing — 5+1 module grid + detail anchors

**Carried into v3.1 Phase 16 as CARRY-* requirements:**
- 12-07: smart-landing dashboard (committed at `bedaff0e`, push pending)
- BILL-08: reconciliation cron (DRY-RUN → active)
- OPS-02: feature-gate audit cron
- OPS-03: token expiry monitor cron
- OPS-04: env-health endpoint
- 360px mobile sweep across DraggonnB revenue-critical pages

</details>

---

## Current Milestone: v3.1 Operational Spine (Phases 13-16)

**Milestone goal:** Federate DraggonnB OS and Trophy OS into a single ecosystem experience without rewriting Trophy OS. SSO bridge at `auth.draggonnb.com` + cross-product approval spine + multi-hunter split-billing + accommodation↔hunt booking linkage + PayFast wiring for Trophy OS + PWA guest surface. Anchored on **Swazulu Game Lodge as first dual-product pilot.**

**Strategic context:** Trophy OS already exists at `C:\Dev\DraggonnB\products\trophy-os` with 24 routes, 779-line schema, 48 species seeded, full RLS. Phases 0–11/20 complete. Same Supabase project (`psqfgzbjbgqrmjskdavs`); tables prefixed `safari_*` / `tos_*`. Decision: Trophy OS = federated peer product via SSO bridge (Option C), NOT absorbed as a module.

**Locked decisions (D1-D10, approved 2026-05-01):** Full text in REQUIREMENTS.md.
- **D1**: SSO bridge at `auth.draggonnb.com` — JWT bridge endpoint with 60s HS256 tokens, fragment delivery, jti replay protection via DB table, per-host cookies. NOT shared cookie domain.
- **D2**: Per-product memberships, no role auto-translate. Trophy 9 roles + DraggonnB 4 roles never auto-map. Cross-product approval action types are product-scoped.
- **D3**: Default ALL bookings to PayFast Subscribe to capture stored token, surface "no token" gracefully when EFT chosen. Damage flow checks token first, routes to manual collection if absent.
- **D4**: Single billing root = parallel subscriptions, same card. Two PayFast charges (one stay, one hunt), one checkout flow. Synthetic invoice = v3.2.
- **D5**: PayFast lib = copy-paste with sync-version header (4 small files); federation logic = private package `@draggonnb/federation-shared` with exact version pinning.
- **D6**: Auto-create Trophy `orgs` row at module-activation time (provisioning saga step 10). Explicit invite for additional `org_members`.
- **D7**: SSO replay protection = DB-backed `sso_bridge_tokens` table for v3.1 (Redis only if >1000 bridge crossings/day).
- **D8**: Mobile sweep = DraggonnB only (82 pages) for Phase 16. Trophy already mobile-first per its CLAUDE.md.
- **D9**: Single Telegram bot per org, product-tagged callback data (`approve:{product}:{request_id}`). Refactor existing ops bot onto grammY in same PR.
- **D10**: Currency display = "ZAR 10,500.00 (≈ USD 575)" with ISO code prominent everywhere.

**Pre-Phase-13 GATE (non-negotiable):**
- **GATE-01 — Swazulu discovery call** must complete BEFORE Phase 13 architecture lock. Validates split-billing model (D4), damage workflow, approval thresholds, role mapping reality (D2), cross-product nav expectation. Output: confirmed/revised D3, D4, D6, D9.
- **GATE-02 — PayFast sandbox spike** is the FIRST plan inside Phase 13. Confirms `chargeAdhoc()` amount unit (rands vs cents), Subscribe-token charge mechanism, hold-and-capture availability before Phase 15 ships damage billing.

**Critical sequencing constraints (re-stated for downstream consumers):**
1. **Phase 14 MUST split into 14.1, 14.2, 14.3** — 3 separate OPS-05 deploys for `approval_requests` generalization. Bundling will fail mid-deploy (per OPS-05 in CLAUDE.md). Add nullable cols → backfill social rows → add NOT NULL.
2. **Phase 15.1 PayFast Subscribe-token capture is a hidden pre-requisite** for damage flow. Without it, no guest token exists and damage charge is blocked. 15.1 must land before 15.2 damage intake.
3. **Phase 15.6 ↔ 16.1 circular dependency** — per-hunter PayFast charge needs Trophy PayFast wiring (16.1). Resolution: stub per-hunter records in 15.6 (records queued, idempotency keys generated, NO `chargeAdhoc()` call), defer actual charge to 16.2 (after Trophy PayFast lands in 16.1).
4. **Pre-Phase-13 Swazulu discovery call (GATE-01)** blocks architecture lock — milestone-level dependency, not phase-internal.

### Phase 13: Cross-Product Foundation

**Goal**: Federate DraggonnB OS and Trophy OS via a JWT-based SSO bridge at `auth.draggonnb.com`, cross-product navigation that respects per-product membership boundaries, and the shared infrastructure both products will rely on for the rest of v3.1. Phase exit = a Swazulu user can click "Trophy OS" in DraggonnB sidebar and land authenticated within ~2 seconds (and reverse), with zero auto-create of memberships.

**Depends on**: Pre-Phase-13 Swazulu discovery call (GATE-01) + v3.0 Commercial Launch (Phase 11 shipped). Architecture lock blocked until GATE-01 returns confirmed/revised D3, D4, D6, D9.

**Requirements (25 total)**:
- **SSO** (federation core): SSO-01, SSO-02, SSO-03, SSO-04, SSO-05, SSO-06, SSO-07, SSO-08, SSO-09, SSO-10, SSO-11, SSO-12, SSO-13, SSO-14
- **NAV** (cross-product surfacing): NAV-01, NAV-02, NAV-03, NAV-04
- **STACK** (deps + upgrades shared with all subsequent phases): STACK-01, STACK-02, STACK-03, STACK-04, STACK-07
- **GATE**: GATE-01, GATE-02

**Decisions shaping this phase**: D1 (SSO architecture), D2 (no role auto-translate), D5 (federation-shared private package), D6 (auto-create Trophy orgs row at module activation, NOT at first SSO bridge), D7 (DB-backed replay protection)

**Avoids pitfalls (from research)**:
- **CATASTROPHIC #1** — Cookie-scope leak across multi-tenant subdomains (SSO-04, SSO-07, SSO-08 + dedicated `auth.draggonnb.com` host)
- **CATASTROPHIC #2** — Cross-product role mapping leaks privileged actions (SSO-06 `tenant_membership_proof` middleware before `getUserOrg()`, no auto-create per D2/D6)
- **HIGH #9** — Federation-shared lib drifts between repos (`@draggonnb/federation-shared` with exact version pinning, CI smoke-test downstream)

**Success Criteria** (what must be TRUE):
  1. A Swazulu admin signed into DraggonnB OS clicks "Trophy OS" in the sidebar and lands on Trophy OS authenticated as the same user inside ~2 seconds, with NO Supabase auth round-trip on the destination side; reverse direction works the same. The bridge token is observable as a 60s HS256 JWT delivered via URL fragment (never query string).
  2. Replaying a previously-consumed bridge token returns 401 with an audit row written to `sso_bridge_tokens`; `tenant_membership_proof` middleware blocks any user who lacks an active `(user_id, tenant_id)` membership row in the destination product with 403, never silently auto-creating membership.
  3. A user whose tenant has no Trophy membership clicking "Trophy OS" lands on an "Activate Trophy OS" UI (not silent auto-create), and the inverse — a Trophy user clicking "DraggonnB OS" without DraggonnB modules — surfaces the same explicit-activation UX. Per-host cookies on `app.draggonnb.co.za`, tenant subdomains, `trophyos.co.za`, `auth.draggonnb.com` confirmed by browser inspection.
  4. The PayFast sandbox spike (GATE-02) has produced a written record of `chargeAdhoc()` amount unit, Subscribe-token charge mechanism, and hold-and-capture availability — green-lighting Phase 15 damage code before any of it lands.
  5. `@draggonnb/federation-shared` published to GitHub Packages, both DraggonnB and Trophy lock to its exact version (no `^` ranges), and brand types `DraggonnbOrgId` / `TrophyOrgId` cause a TypeScript compile error if mixed.

**Plans**: TBD (~5 plans). Suggested decomposition per research:
- 13-01: GATE-02 PayFast sandbox spike (also unblocks Phase 15)
- 13-02: SSO architecture spike (HS256 vs ES256, jti TTL, fragment-vs-query, CSP headers, edge IP allow-listing)
- 13-03: SSO bridge implementation (`lib/sso/jwt.ts`, `/api/sso/{issue,consume}`, `sso_bridge_tokens` table, `tenant_membership_proof` middleware, `cross_product_org_links` table, `organizations.linked_trophy_org_id` multi-step migration)
- 13-04: Federation-shared package + STACK upgrades (`@draggonnb/federation-shared` published, `@supabase/ssr` 0.10.2 refactor on both apps, `jose` adopted, brand types exported)
- 13-05: Cross-product sidebar federation + provisioning saga step 10 (`activate-trophy-module`)

### Phase 14: Approval Spine

**Goal**: Generalize the existing social-post-only `approval_requests` table into a product-scoped approval spine that serves DraggonnB damage charges, rate changes, and content posts as well as Trophy quota changes, safari status changes, and supplier job approvals — all through one Telegram tap-to-approve bot (grammY-refactored, single bot per org) plus a `/approvals` web fallback. Phase exit = a Swazulu owner approves a test damage_charge proposal via Telegram inline keyboard and the existing social-post approval flow still works unchanged.

**Depends on**: Phase 13 (federation infrastructure must exist before product-scoped action types can route across both products via SSO). Approval action handlers are product-scoped per D2.

**Requirements (19 total)**:
- **APPROVAL** (spine core): APPROVAL-01, APPROVAL-02, APPROVAL-03, APPROVAL-04, APPROVAL-05, APPROVAL-06, APPROVAL-07, APPROVAL-08, APPROVAL-09, APPROVAL-10, APPROVAL-11, APPROVAL-12, APPROVAL-13, APPROVAL-14, APPROVAL-15, APPROVAL-16, APPROVAL-17, APPROVAL-18
- **STACK**: STACK-05 (grammY adoption, ops-bot refactor in same PR)

**Decisions shaping this phase**: D2 (action types are product-scoped, NEVER generic cross-product), D9 (single Telegram bot per org, product-tagged callback data)

**OPS-05 sequencing — NON-NEGOTIABLE 3-deploy split** (per CLAUDE.md migration discipline + research finding 2):
- **Phase 14.1**: ALTER TABLE adds nullable columns (`product`, `target_resource_type`, `target_resource_id`, `target_org_id`, `action_type`, `action_payload JSONB`); `ALTER post_id DROP NOT NULL`. Deploy code that writes new columns. Existing rows have NULL.
- **Phase 14.2**: UPDATE `approval_requests` SET `product='draggonnb'`, `target_resource_type='social_post'`, `target_resource_id=post_id`, `target_org_id=organization_id`, `action_type='social_post'` WHERE `product IS NULL`. Idempotent. Deploy. Verify zero NULLs via `SELECT COUNT(*) WHERE product IS NULL`.
- **Phase 14.3**: ALTER COLUMN ... SET NOT NULL on the four target columns. `post_id` retained as nullable for Phase 17 cleanup. Spine implementation, grammY adoption, Telegram tap-to-approve, `/approvals` page all land in 14.3.

Three separate migrations, three separate deploys. Bundling will fail mid-deploy and Supabase will mark the migration failed without rollback.

**Avoids pitfalls (from research)**:
- **CATASTROPHIC #2** — Privileged action via mismatched trust models (APPROVAL-06 product-scoped action types only; no generic `approval` type)
- **HIGH #6** — Telegram approval bot replays charge based on resent message (APPROVAL-08 `secret_token`, APPROVAL-09 `update_id` PK on `telegram_update_log`, APPROVAL-10 atomic stored proc, APPROVAL-11 mapped approver verification, APPROVAL-12 inline keyboard self-disable, APPROVAL-13 internal IDs only no PII, APPROVAL-14 DM only)
- **HIGH #10** — Approval expiry race (APPROVAL-10 atomic stored proc with 30s grace, cron sweep doesn't change in-flight rows)
- **PITFALL-12** (CLAUDE.md OPS-05) — bundling DDL + constraint on populated table (3-deploy split)

**Success Criteria** (what must be TRUE):
  1. A new `damage_charge` proposal flows end-to-end: `proposeApproval()` writes a row → owner gets a Telegram DM with internal IDs only (no guest name/phone/card data) → owner taps Approve → `approve_request_atomic()` enforces single-execution-with-30s-grace → handler executes → `audit_log` row written with before/after payload. Same flow works for `social_post`, `rate_change`, `quota_change`, `safari_status_change`, `supplier_job_approval`.
  2. The existing v3.0 social-post approval flow still works unchanged after the 3-deploy migration. Verified via integration test on a backfilled row from production.
  3. A double-tap on the inline keyboard, a forwarded approval message, and a replayed Telegram `update_id` all return cached responses and never re-execute the action. The forwarded-message case fails with "approver not authorized" (not a tap-based assumption).
  4. A Swazulu user with DraggonnB-only role taps an `approve:trophy:safari_status_change` callback by mistake and is rejected with "no permission" (per-product membership enforced at handler), confirming D2 product-scoped enforcement.
  5. The `/approvals` web fallback page renders pending approvals for the current user, mobile-first at 360px, with one-click approve/reject — for users who skip Telegram or whose bot link expired.

**Plans**: 3 plans (locked split per OPS-05).
- 14-01 (Phase 14.1): Add nullable columns + write code that populates them; deploy
- 14-02 (Phase 14.2): Backfill + verify zero NULLs; deploy
- 14-03 (Phase 14.3): NOT NULL constraints + spine implementation (grammY adoption + ops-bot refactor + Telegram callbacks + `/approvals` UI + handler registry + RLS policies + atomic stored proc)

### Phase 15: Damage Auto-Billing + Hunt Bookings + Cross-Product Stay Link

**Goal**: Ship the three operational pillars Swazulu signed up for: (a) Telegram-flagged damage charges that auto-route through the approval spine and charge the guest's stored PayFast token, (b) multi-hunter split-billing on safaris where each hunter is their own financial truth, and (c) a cross-schema FK linking a DraggonnB Accommodation booking to a Trophy safari with bidirectional date-sync handlers. Phase exit = a Swazulu owner flags a broken glass via `/damage` Telegram, owner approves, charge fires within 7 days of checkout — AND a 4-hunter safari has 4 captured PayFast tokens with locked daily rates.

**Depends on**: Phase 14 (approval spine generalized; `damage_charge` handler can register). Phase 13 (cross-product FKs need federation-shared brand types). GATE-02 PayFast sandbox spike must have green-lit `chargeAdhoc()` semantics in Phase 13.

**Requirements (32 total)**:
- **DAMAGE** (auto-billing flow): DAMAGE-01, DAMAGE-02, DAMAGE-03, DAMAGE-04, DAMAGE-05, DAMAGE-06, DAMAGE-07, DAMAGE-08, DAMAGE-09, DAMAGE-10, DAMAGE-11, DAMAGE-12, DAMAGE-13, DAMAGE-14, DAMAGE-15, DAMAGE-16, DAMAGE-17
- **HUNT** (multi-hunter split-billing): HUNT-01, HUNT-02, HUNT-03, HUNT-04, HUNT-05, HUNT-06, HUNT-07, HUNT-08, HUNT-09
- **CROSSLINK** (accommodation↔hunt): CROSSLINK-01, CROSSLINK-02, CROSSLINK-03, CROSSLINK-04, CROSSLINK-05, CROSSLINK-06

**Decisions shaping this phase**: D3 (PayFast Subscribe default with EFT graceful fallback), D4 (parallel subscriptions same card; "Pay once for hunt, once for stay" not "single charge"), D10 (currency display)

**Internal sub-ordering — sequence-critical**:
- **15.1 (PRE-REQ, blocks 15.2)** — PayFast Subscribe-token capture conversion in `lib/accommodation/payments/payfast-link.ts` (one-off → Subscribe), capture `token` from ITN webhook, store on `accommodation_bookings.guest_payfast_token` (multi-step OPS-05). This is the hidden pre-requisite — without it no token = damage flow blocked. (DAMAGE-01, DAMAGE-02, DAMAGE-03, DAMAGE-04)
- **15.2 — Damage Telegram intake**: `/damage` command, photo evidence bucket, itemized price list, `damage_incidents` table, EXIF/CRC32 validation. (DAMAGE-06, DAMAGE-07, DAMAGE-08, DAMAGE-09)
- **15.3 — Damage approval handler + auto-charge**: registers `draggonnb.damage_charge` handler in spine, `chargeAdhoc()` invocation with `DAMAGE-{booking_id}-{incident_id}` prefix, WhatsApp pre-charge + dispute window, 7-day window enforcement, refund flow, chargeback monitoring cron. (DAMAGE-10, DAMAGE-11, DAMAGE-12, DAMAGE-13, DAMAGE-14, DAMAGE-15, DAMAGE-16, DAMAGE-17)
- **15.4 — Multi-hunter split-billing schema + per-hunter Subscribe checkout**: `safari_hunters` table with 6 features-research fields, per-hunter PayFast Subscribe to capture individual tokens, locked daily rate, pre-arrival paid gate. (HUNT-01, HUNT-02, HUNT-03, HUNT-04, HUNT-05, HUNT-06, HUNT-09) **Sandbox spike inside this sub-plan: 4 parallel subscriptions same merchant, refund-when-token-expired, idempotency keys per charge.**
- **15.5 — Cross-product stay link**: `safaris.accommodation_booking_id` (NEVER CASCADE), bidirectional date-sync handlers (manual confirm only, never auto-update), cross-product RLS join (membership in BOTH products), reconciliation cron stub. (CROSSLINK-01, CROSSLINK-02, CROSSLINK-03, CROSSLINK-04, CROSSLINK-05, CROSSLINK-06)
- **15.6 — Per-hunter charge stub** (records queued, idempotency keys generated, NO `chargeAdhoc()` call): defers actual charge to Phase 16.2 after Trophy PayFast lands in 16.1. **Circular-dependency boundary.** (HUNT-07, HUNT-08)

**Avoids pitfalls (from research)**:
- **CATASTROPHIC #3** — Damage charge fires after window or beyond cap (DAMAGE-12 hard 7-day window, DAMAGE-03 max_incidental_charge cap, DAMAGE-04 dual consent at booking T&Cs + DAMAGE-13 pre-charge WhatsApp, DAMAGE-09 photo evidence write-once with EXIF + CRC32, DAMAGE-16 chargeback monitoring + per-tenant kill switch at >2%)
- **HIGH #4** — Multi-hunter split-billing orphan charges + refund chaos (HUNT-01 `safari_hunters` is financial truth, HUNT-04 locked rate, HUNT-05 pre-arrival paid gate, HUNT-08 per-token refund UI, idempotency keys per charge)
- **HIGH #5** — Cross-product stay-link FK breaks on cascade (CROSSLINK-01 `ON DELETE SET NULL` never CASCADE, CROSSLINK-05 manual-confirm date sync, CROSSLINK-03 RLS join requires both memberships, CROSSLINK-06 reconciliation cron)
- **MEDIUM** — EFT no-token edge case (DAMAGE-11 routes to manual collection if token absent — EFT guests gracefully handled)

**Success Criteria** (what must be TRUE):
  1. A Swazulu housekeeper enters `/damage` on the Telegram ops bot, selects a checked-out booking, uploads 2 photos with valid EXIF timestamps within the booking date range, picks "glassware" from the itemized list, enters R450, and submits — owner gets a Telegram DM with the photos and proposed amount, taps Approve, and within 60 seconds `chargeAdhoc()` fires against the guest's stored PayFast token with prefix `DAMAGE-{booking_id}-{incident_id}`. WhatsApp pre-charge notification sent with 48h dispute window before the charge, charge gated on WhatsApp `delivered` status.
  2. Attempting the same flow on a booking >7 days past `checkout_date` is rejected at the app layer with an audit row written; attempting it on a booking with `guest_payfast_token IS NULL` (EFT guest) routes to a manual collection UI (not a silent failure).
  3. A safari with 4 hunters has 4 rows in `safari_hunters`, each with their own captured `payment_method_token`, individually locked `locked_daily_rate_zar` (cancellation of one does not raise the others), and `safaris` cannot transition to `confirmed` until all 4 `deposit_paid_at` are non-null (override available with audit row). Trophy fee allocation requires explicit hunter selection at trophy log time.
  4. A DraggonnB Accommodation booking detail page shows "Linked hunt: SAF-2026-001" with a click-through that fires the SSO bridge and lands on the Trophy safari page; reverse click-through works the same. Deleting the safari sets `accommodation_bookings`-side reference to NULL, never cascades to delete the stay. Date drift >2 days surfaces in `/admin/cross-product-health` via the weekly reconciliation cron.
  5. Per-hunter charge records are queued in Phase 15.6 with idempotency keys but `chargeAdhoc()` is NOT yet called — visible by inspecting the queue table (charges in `pending_trophy_payfast` state). Phase 16.2 will execute these.

**Plans**: TBD (~6 plans, mapping 1:1 to sub-plans 15.1 through 15.6 above).

### Phase 16: PWA + Trophy PayFast + v3.0 Carry-Forward

**Goal**: Ship the three remaining v3.1 deliverables in the right order: (a) Trophy OS PayFast subscription wiring goes live (R599 / R1,499 / R3,499 tiers) — which unblocks (b) the per-hunter charge flow stubbed in 15.6, and ships in parallel with (c) the PWA guest surface at `stay.draggonnb.{co.za|com}/{booking-id}` plus all v3.0 Phase 12 carry-forward (12-07 push, BILL-08, OPS-02..04, 360px DraggonnB-only mobile sweep). Phase exit = first Swazulu hunt-package guest checks in via PWA, both subscriptions (DraggonnB + Trophy) visible in unified `/billing`, all v3.0 carry-forward shipped.

**Depends on**: Phase 15 (per-hunter charge stub queued; PayFast Subscribe-token capture live for damage flow). Phase 13 (federation infrastructure for unified billing UI + concierge web adapter brand voice cache).

**Requirements (36 total)**:
- **PWA** (guest surface): PWA-01, PWA-02, PWA-03, PWA-04, PWA-05, PWA-06, PWA-07, PWA-08, PWA-09, PWA-10, PWA-11, PWA-12, PWA-13, PWA-14, PWA-15
- **TROPHY** (PayFast wiring + lifecycle): TROPHY-01, TROPHY-02, TROPHY-03, TROPHY-04, TROPHY-05, TROPHY-06, TROPHY-07, TROPHY-08, TROPHY-09, TROPHY-10, TROPHY-11, TROPHY-12
- **CARRY** (v3.0 Phase 12 carry-forward): CARRY-01, CARRY-02, CARRY-03, CARRY-04, CARRY-05, CARRY-06, CARRY-07, CARRY-08
- **STACK**: STACK-06 (`@serwist/next` + `serwist` for PWA)

**Decisions shaping this phase**: D5 (PayFast lib copy-paste with sync-version header to Trophy), D8 (mobile sweep DraggonnB only), D10 (currency display PWA + WhatsApp + email + invoice)

**Internal sub-ordering — sequence-critical (15.6 ↔ 16.1 boundary)**:
- **16.1 — Trophy PayFast wiring** (UNBLOCKS 16.2): copy `payfast.ts`, `payfast-adhoc.ts`, `payfast-prefix.ts`, `payfast-subscription-api.ts` into Trophy `src/lib/payments/` with sync-version header, distinct ITN route with prefix routing (`SUB-`/`TOS-`/`ACC-`/`SAFARI-`/`DAMAGE-`/`HUNT-`), `billing_plans.product` 3-step OPS-05, Trophy tier rows seeded, subscription state machine, RLS read-only on cancelled/past_due. (TROPHY-01..11)
- **16.2 — Per-hunter charge flow (completes 15.6)**: dequeues Phase 15.6 stubbed charges, executes `chargeAdhoc()` against per-hunter tokens with `HUNT-{safari_id}-{hunter_id}` prefix, per-token refund UI on Trophy `safaris/[id]`. (HUNT-07, HUNT-08, TROPHY-12 multi-hunter sandbox spike)
- **16.3 — PWA route group + token auth**: `app/(stay)/[bookingId]/page.tsx`, random 32-byte `guest_access_token`, HMAC validation, edge rate limit 60 req/5min/IP, service worker scoped to `(stay)/` with versioned cache key. (PWA-01..05, PWA-07, PWA-08, STACK-06)
- **16.4 — PWA features + concierge web adapter**: pre-arrival info, payment links, concierge chat (web adapter re-using brand-voice + cost-ceiling + advisory lock infra), offline form sync, install prompt strategy with iOS-aware modal, POPI footer. (PWA-06, PWA-09, PWA-10, PWA-11, PWA-12, PWA-13, PWA-14, PWA-15)
- **16.5 — v3.0 carry-forward + mobile sweep**: 12-07 rebase + smoke + push, BILL-08 7-day DRY-RUN then active, OPS-02 daily feature-gate audit, OPS-03 token expiry monitor, OPS-04 env-health endpoint, 360px sweep across DraggonnB revenue-critical pages with pre-Phase-16 lightweight check on top 5 pages, unified `/billing` UI showing both subscriptions distinctly. (CARRY-01..08, TROPHY-10)

**Avoids pitfalls (from research)**:
- **HIGH #7** — PWA service worker serves stale booking data (PWA-08 versioned cache key bumps on every deploy, PWA-07 network-first for booking details, PWA-05 edge rate limit, PWA-03 random-not-bookingID URL token, PWA-09 offline conflict UI server-wins-or-prompt)
- **HIGH #8** — Trophy trial-expiry math wrong UTC vs SAST (TROPHY-06 tenant TZ + 4h grace integration test, TROPHY-07 retry capped at 3 with backoff, TROPHY-08 RLS read-only on cancelled/past_due, TROPHY-09 tier downgrade end-of-cycle)
- **MEDIUM** — BILL-08 surfaces unknown v3.0 drift (CARRY-02 7-day DRY-RUN before active alarming)
- **MEDIUM** — Mobile sweep finds critical bug late (CARRY-08 lightweight pre-Phase-16 sweep on top 5 pages)
- **MEDIUM** — Unified billing UI hides per-product fail (TROPHY-10 per-product status distinct, one passing while the other fails clearly visible)
- **PITFALL-9 (from D5 tension)** — Federation-shared lib drifts: PayFast lib gets sync-version header AND tracking line in STATE.md (TROPHY-02)

**Success Criteria** (what must be TRUE):
  1. A Swazulu Trophy admin signs up for the `tos_pro` tier (R1,499/mo), the PayFast Subscribe checkout completes with prefix `TOS-{org_id}`, the Trophy ITN route receives the confirmation, `billing_plans.product='trophy'` row tracks the subscription, and unified `/billing` on DraggonnB shows both DraggonnB AND Trophy subscriptions distinctly with per-product status — including a clear visual when one is passing and the other is `past_due`.
  2. A trial Trophy org reaches day 14 in `Africa/Johannesburg` time + 4-hour grace (NOT UTC), gets one retry attempt at 1h/6h/24h on failed payment, then transitions to `cancelled` with read-only mode enforced at the DB layer (RLS blocks INSERT/UPDATE/DELETE, not just UI).
  3. The 4-hunter safari from Phase 15 fires per-hunter `chargeAdhoc()` against each captured PayFast token with prefix `HUNT-{safari_id}-{hunter_id}`, the 15.6 stubbed records are dequeued and executed, and a per-token refund issued from Trophy `safaris/[id]` updates the correct hunter's `safari_hunters.status='refunded'` without touching the others.
  4. A pilot guest receives a PWA URL like `stay.draggonnb.com/{booking-id}?t={32-byte-token}`, the page renders pre-arrival info + payment links + concierge chat with brand-voice ConciergeAgent (cache-hit on second message, same cost ceiling enforcement as WhatsApp variant), service worker installs after deposit-paid event (NOT first visit), iOS install instructions show the "Add to Home Screen" modal correctly on Safari, and the URL becomes 410 Gone 30 days after `checkout_date`.
  5. v3.0 carry-forward shipped: 12-07 smart-landing dashboard pushed to origin/main, BILL-08 reconciliation cron alerts Chris via Telegram on drift after a clean 7-day DRY-RUN, OPS-02 daily feature-gate audit + OPS-03 token expiry monitor + OPS-04 `/api/ops/env-health` all live, and every revenue-critical DraggonnB page renders cleanly at 360px on a real SA-representative device.

**Plans**: TBD (~5 plans, mapping 1:1 to sub-plans 16.1 through 16.5 above).

## Progress

**Execution Order:**
Phases execute in numeric order: 13 → 14 (14.1 → 14.2 → 14.3) → 15 (15.1 → 15.2 → 15.3 → 15.4 → 15.5 → 15.6) → 16 (16.1 → 16.2 → 16.3 → 16.4 → 16.5)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 01. Security & Auth Hardening | v1.0 | 3/3 | Complete | 2026-02-03 |
| 02. Core Module Completion | v1.0 | 3/3 | Complete | 2026-02-04 |
| 03. Landing Page & Public UI | v1.0 | 2/2 | Complete | 2026-02-09 |
| 04. N8N Automation | v1.0 | 3/3 | Complete | 2026-02-09 |
| 05. Social Media Integration | v1.0 | 3/3 | Complete | 2026-02-05 |
| 06. Client Provisioning | v1.0 | 3/3 | Complete | 2026-02-05 |
| 07. Testing & Hardening | v1.0 | 2/2 | Complete | 2026-02-05 |
| 08. Meta Integration | (transitional) | 3/5 | Partial | 2026-03-15 (08.2, 08.3) |
| 09. Foundations & Guard Rails | v3.0 | 5/5 | Complete | 2026-04-26 |
| 10. Brand Voice + Site Redesign + 3-Day Onboarding | v3.0 | 7/7 | Complete | 2026-04-27 |
| 11. Easy/Advanced CRM PoC + Campaign Studio Decision Gate | v3.0 | 12/12 | Complete | 2026-04-27 |
| 12. Launch Polish + v3.1 Handoff | v3.0 | 3/10 | Partial — 7 plans carried forward to v3.1 Phase 16 | 2026-04-30 (3 plans) |
| 13. Cross-Product Foundation | v3.1 | 0/TBD | Not started — blocked on GATE-01 Swazulu discovery call | - |
| 14. Approval Spine | v3.1 | 0/3 | Not started | - |
| 15. Damage Auto-Billing + Hunt Bookings + Cross-Product Stay Link | v3.1 | 0/TBD | Not started | - |
| 16. PWA + Trophy PayFast + v3.0 Carry-Forward | v3.1 | 0/TBD | Not started | - |

## Coverage Summary (v3.1)

**Total v3.1 requirements: 112** (103 feature reqs + 9 meta reqs across STACK + GATE)

| Phase | REQ Count | Categories |
|-------|-----------|------------|
| 13 | 25 | SSO×14, NAV×4, STACK×5, GATE×2 |
| 14 | 19 | APPROVAL×18, STACK×1 |
| 15 | 32 | DAMAGE×17, HUNT×9, CROSSLINK×6 |
| 16 | 36 | PWA×15, TROPHY×12, CARRY×8, STACK×1 |
| **Total** | **112** | All v3.1 reqs mapped, no orphans, no duplicates |

Pre-allocation in REQUIREMENTS.md preserved unchanged. No reassignments needed.

## Next Milestones

### Milestone: Production Credentials & Integrations (ongoing)

- Configure Facebook/Instagram OAuth (social publishing) — covered by Phase 08.1 once META_APP_ID available
- Configure LinkedIn OAuth (social publishing)
- Meta Business Verification + App Review (Phase 08.1 prerequisite)

### Milestone: v3.2 Wave B (trigger-based)

Triggered by real client signal or explicit roadmap decision (full list in REQUIREMENTS.md "v3.2+ Future Requirements"):

- **Cross-domain SSO for `swazulu.com`** — when Swazulu's custom domain goes live; token handoff already specified architecturally in v3.1
- **Single billing root synthetic invoice** (Option D from D4) — if pilot reveals two-charge UX friction
- **Game-lodge deep-onboarding intake** (rules/regs/waivers → AI-tailored config) — Wave B
- **Per-carcass routing pipeline** — Wave B (vendor SOPs, deposits, notifications)
- **Farmer photo classification + genetic tree** — Wave B (Trophy OS)
- **Manager/owner dedicated AI agent** for DraggonnB Accommodation — Wave B
- **AI damage pricing from photo** — Wave B (operator picks from list in v3.1; AI vision auto-pricing in v3.2)
- **Trophy mobile sweep** — deferred per D8 until v3.2
- **Easy View rollout** to remaining 5 DraggonnB modules — trigger: ModuleHome pattern stable + 5+ clients onboarded
- **Embedded Finance** (VAT201 + TOMSA + tips + SARS day-end + owner-payout) — must ship with accountant review gate on first 3 pilot tenants

### Milestone: v3.3+ Wave C (trigger-based)

- **GoHunting.com + location marketplaces + Go-X template**
- **9-dot grid product launcher** (revisit if 3+ products)
- **Per-hunter accommodation assignment** (hunters share linked stay; per-hunter unit assignment in v3.3+)
- **Real-time bidirectional date sync** (manual confirm in v3.1; automated bi-sync in v3.2+)

---

*Last updated: 2026-05-01 — v3.1 Operational Spine roadmap created (Phases 13-16); 112 REQ-IDs mapped (103 feature + 9 meta); 10 cross-cutting decisions D1-D10 locked; pre-Phase-13 Swazulu discovery call (GATE-01) blocks architecture lock; Phase 14 split into 14.1/14.2/14.3 per OPS-05; Phase 15.1 PayFast Subscribe-token capture confirmed as hidden pre-requisite; Phase 15.6 ↔ 16.1 circular dependency resolved via stub-then-charge.*

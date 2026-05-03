# Requirements — DraggonnB OS

## Active Milestone: v3.1 — Operational Spine

**Goal:** Federate DraggonnB OS and Trophy OS into a single ecosystem experience without rewriting Trophy OS. SSO bridge + cross-product approval spine + multi-hunter split-billing + accommodation↔hunt booking linkage + PayFast wiring for Trophy OS. Anchored on **Swazulu Game Lodge as first dual-product pilot.**

**Locked decisions (D1–D10, approved 2026-05-01):**
- **D1: SSO bridge at `auth.draggonnb.com`** — JWT bridge endpoint with 60s HS256 tokens, fragment delivery, jti replay protection via DB table, per-host cookies. NOT shared cookie domain.
- **D2: Per-product memberships, no role auto-translate.** Trophy 9 roles + DraggonnB 4 roles never auto-map. Cross-product approval action types are product-scoped.
- **D3 (revised 2026-05-01 post-Swazulu discovery): Multi-route booking checkout.** Default routes per-tenant via `tenant_modules.config.billing.payment_route` ∈ {`own_payfast`, `draggonnb_payfast`, `eft_manual`}. PayFast Subscribe captures stored token where used; EFT mode skips PayFast entirely (manual reconciliation). Damage flow checks token first; routes to manual collection if EFT or token absent. **Replaces original "default ALL bookings to PayFast Subscribe."**
- **D4 (revised 2026-05-01 post-Swazulu discovery): Split-by-default invoice model with multi-payer payment links.** Booker's bill is the primary `billing_invoice`; per-hunter extras (animals, slaughter) attach as lines tagged with `hunter_id`. Hunting-infrastructure lines (PH, vehicle) tagged `hunter_id=NULL` and payable by booker. Each payment link settles a slice of the same invoice (booker pays infrastructure, hunters pay their kills). Multi-payer transactional fee applied per link when on `draggonnb_payfast` route. Synthetic single-charge unification deferred to v3.2. **Replaces original "parallel subscriptions, same card."**
- **D5: PayFast lib = copy-paste with sync-version header (4 small files); federation logic = private package `@draggonnb/federation-shared`** with exact version pinning.
- **D6: Auto-create Trophy `orgs` row at module-activation time** (provisioning saga step 10). Explicit invite for additional `org_members`. Confirmed 2026-05-01: Swazulu = single legal entity (farmer + breeder + hunting + events) — one DraggonnB org row, one Trophy org row.
- **D7: SSO replay protection = DB-backed `sso_bridge_tokens` table** for v3.1 (Redis only if >1000 bridge crossings/day).
- **D8: Mobile sweep = DraggonnB only (82 pages)** for Phase 16. Trophy already mobile-first per its CLAUDE.md.
- **D9 (revised 2026-05-01 post-Swazulu discovery): Single Telegram bot per org with manifest-driven callbacks.** Each module exports a typed manifest declaring its approval action types, Telegram callbacks (with product prefix), emitted events, required tenant inputs, and billing line types. Bot registers callbacks from manifests at runtime; onboarding wizard generates dynamic forms from manifests; approval spine action-type registry is manifest-driven. **Replaces original "hand-wired callbacks per product."** Refactor existing ops bot onto grammY in same PR.
- **D10: Currency display = "ZAR 10,500.00 (≈ USD 575)" with ISO code prominent everywhere.**
- **D11 (added 2026-05-01): Polymorphic platform-level billing layer.** Operational records stay separate per product (`accommodation_bookings`, `safaris`, `safari_hunters`, future `breeder_*`); financial truth lives in three new platform tables (`billing_invoices`, `billing_invoice_lines`, `billing_invoice_payment_links`). Each module emits lines via `@draggonnb/federation-shared` billing service — Trophy OS does NOT gain a billing table. Booker = one invoice; lines polymorphic via `source_type + source_id`; payment links slice the invoice (multi-payer, multi-route).

**Scope guardrails:**
- Trophy OS UI rework — out of scope; stays as-is
- DraggonnB role enum expansion to 9 roles — out of scope; mapping via per-product membership
- Embedded Finance — still v3.2+
- Easy View rollout to remaining DraggonnB modules — still v3.2+
- Cross-domain SSO for `swazulu.com` — v3.2 (P2; activated when Swazulu custom domain goes live)
- Per-carcass routing pipeline · farmer photo classification · genetic tree — Wave B (v3.2)
- GoHunting.com · location marketplaces · Go-X template — Wave C (v3.3+)

---

### SSO Bridge & Federation (SSO)

- [ ] **SSO-01**: User clicks "Trophy OS" in DraggonnB sidebar; lands on Trophy OS authenticated within ~2 seconds. Reverse direction works the same. (DraggonnB-side complete via 13-06 + 13-07: sidebar click → `/api/sso/issue?target=trophy` → JWT minted → 302 to Trophy `/sso/consume#token=...`. Trophy-side: pending Trophy companion session — needs its `/api/sso/issue`, `/sso/consume`, middleware, and org_members enforcement.)
- [ ] **SSO-02** (PARTIAL — DraggonnB issuer callable on platform domain via 13-06): Issuer lives at `{platform_domain}/api/sso/issue`; canonical `auth.draggonnb.com` alias deferred to Phase 16 (DNS + Vercel alias not configured in Phase 13). Consumer at `<consumer>/api/sso/consume` + `/api/sso/validate`. HS256 JWTs signed with `SSO_BRIDGE_SECRET`. Phase 16 closes the `auth.draggonnb.com` subdomain assignment.
- [x] **SSO-03** (DONE 2026-05-03 via 13-05): `sso_bridge_tokens` table created in live Supabase with FORCE RLS, `consumed_at NULLABLE`, jti UUID PK, expires_at index. Replay protection schema complete. Bridge implementation in plan 13-06.
- [x] **SSO-04** (DONE 2026-05-03 via 13-06): Token delivery via URL fragment (`#token=...`). Issuer route returns `302` to `trophyos.co.za/sso/consume#token=...`. Referrer-Policy: no-referrer set on consumer page response. CSP `frame-ancestors none` on `/sso/consume` to block iframe extraction. Never query string.
- [x] **SSO-05** (DONE 2026-05-03 via 13-06): Bridge token carries `draggonnb_org`, `trophy_org`, `origin_org`, `target_org`, `user_id`, `intended_product`, jti. Validate route enforces `cross_product_org_links` pair check: both org IDs from JWT must have an active link row.
- [x] **SSO-06** (DONE 2026-05-03 via 13-06): `tenant_membership_proof` middleware block + `verifyMembership()` helper in `lib/auth/membership-proof.ts`. Runs before `getUserOrg()` on all subdomain requests. No row = 403 redirect to `/dashboard/activate-trophy?reason=missing_trophy_membership`. In-memory 60s membership cache (Map keyed `membership:{userId}:{orgId}`).
- [x] **SSO-07** (DONE 2026-05-02 via 13-02, verified not regressed in 13-06): Per-host cookies (CATASTROPHIC #1 guard). `setAll` in middleware NEVER includes `Domain=.draggonnb.co.za`. Each host gets its own cookie. Confirmed in 13-06 that the per-host pattern was not regressed by SSO bridge routes.
- [x] **SSO-08** (DONE 2026-05-03 via 13-06): `scripts/ci/check-sso-lint.mjs` CI guard — revalidate guard on auth routes + dashboard tenancy chain check. Scoped to `app/(dashboard)/**/*.tsx` to avoid 94 false positives from webhook/M2M/public routes. `npm run check:sso-lint` and `node scripts/ci/check-sso-lint.mjs` both exit 0.
- [x] **SSO-09** (DONE 2026-05-03 via 13-05): `cross_product_org_links` table created in live Supabase with UNIQUE(draggonnb_org_id, trophy_org_id), FORCE RLS, SELECT policy for org members. FK to orgs(id) + organizations(id) with ON DELETE CASCADE.
- [x] **SSO-10** (STEP 4/4 DONE 2026-05-03 via 13-07): FK constraint `fk_organizations_linked_trophy_org REFERENCES orgs(id) ON DELETE SET NULL` applied to live Supabase via MCP (OPS-05 Step 4 complete). Steps 2/3 were N/A — column was NULL-only at creation time (no backfill needed). Full OPS-05 4-step sequence closed: Step 1 nullable column (13-05), Steps 2/3 N/A, Step 4 FK constraint (13-07).
- [x] **SSO-11** (DONE 2026-05-03 via 13-07): Provisioning saga step 10 (`activate-trophy-module`) ships at `scripts/provisioning/steps/activate-trophy-module.ts`. Idempotent 4-write transactional flow: Trophy `orgs` row + `cross_product_org_links` + `organizations.linked_trophy_org_id` update + JSONB cache. Per-step rollback on failure. `set_tenant_module_config_path` JSONB RPC applied to live Supabase. CTA-driven path (`POST /api/activate-trophy`) calls saga step directly (direct-call pattern, not orchestrator registry — Phase 15 wires into full provisioning chain).
- [x] **SSO-12** (DONE 2026-05-03 via 13-05): `DraggonnbOrgId` and `TrophyOrgId` opaque brand types + `asDraggonnbOrgId` / `asTrophyOrgId` helpers exported from `@draggonnb/federation-shared@1.0.0`. Unique symbol brands prevent cross-type assignment at compile time.
- [x] **SSO-13** (DONE 2026-05-03 via 13-06): Federation logout — `POST /api/sso/invalidate` accepts 30s logout JWT (signed with `SSO_BRIDGE_SECRET`), best-effort `supabase.auth.signOut()`, idempotent jti tracking in `sso_bridge_tokens` with sentinel `00000000` org IDs. Trophy-side logout ping = reverse of this; Trophy must call DraggonnB `/api/sso/invalidate` on its sign-out flow.
- [x] **SSO-14** (DONE 2026-05-03 via 13-05): SSO architecture spike completed. HS256 locked (D1), fragment delivery locked, CSP headers locked, edge IP allow-listing rejected (Vercel no static egress IPs), Option B session bridging locked (pass tokens in JWT, call setSession on consumer). See `.planning/phases/13-cross-product-foundation/13-SSO-SPIKE.md`.

### Cross-Product Navigation (NAV)

- [x] **NAV-01** (DONE 2026-05-03 via 13-07): DraggonnB sidebar conditionally shows "Trophy OS" item via `x-linked-trophy-org-id` header injected by middleware from `organizations.linked_trophy_org_id` FK (canonical). JSONB `tenant_modules.config.trophy.linked_org_id` is best-effort cache only. Click triggers `/api/sso/issue?target=trophy`. `TrophyCrossLink` component wired into `SidebarClient` Cross-Product section.
- [ ] **NAV-02**: Trophy OS conditionally shows "DraggonnB OS" item in its sidebar/header for users whose origin tenant has DraggonnB modules activated; click triggers reverse SSO bridge. (DraggonnB side done — Trophy side pending Trophy companion session)
- [x] **NAV-03** (DONE 2026-05-03 via 13-07): Cross-product nav shows loading state during bridge round-trip. `TrophyCrossLink` component renders spinner + "Connecting to Trophy OS…" text during `window.location.href` navigation; 2-second timeout fallback.
- [x] **NAV-04** (DONE 2026-05-03 via 13-07): User with no Trophy link sees `/dashboard/activate-trophy` empty-state page (not silent auto-create). `ActivateTrophyForm` island posts to `/api/activate-trophy` which is admin-gated. Reason-copy shown for `missing_trophy_membership` case.

### Approval Spine (APPROVAL)

- [ ] **APPROVAL-01**: Existing `approval_requests` table generalised via 3-step OPS-05 migration — Step 1 adds nullable columns (`product`, `target_resource_type`, `target_resource_id`, `target_org_id`, `action_type`, `action_payload JSONB`); drops `post_id` NOT NULL.
- [ ] **APPROVAL-02**: Step 2 backfills existing social-post rows with `product='draggonnb'`, `target_resource_type='social_post'`, `target_resource_id=post_id`, `target_org_id=organization_id`, `action_type='social_post'`. Idempotent. Verifies zero NULLs before Step 3.
- [ ] **APPROVAL-03**: Step 3 adds NOT NULL constraints on the 4 target columns. `post_id` retained as nullable for Phase 17 cleanup.
- [ ] **APPROVAL-04**: `lib/approvals/spine.ts` exports `proposeApproval()`, `approveRequest()`, `rejectRequest()`, `listPendingForUser()` — generic interface used by every action type.
- [ ] **APPROVAL-05**: Action type registry at `lib/approvals/handlers/` — one handler per action type: `damage_charge`, `rate_change`, `content_post`, `quota_change`, `safari_status_change`, `supplier_job_approval`. Each handler implements `propose(payload)`, `execute(approval)`, and `revert(approval)`.
- [ ] **APPROVAL-06**: Action types are product-scoped: `draggonnb.damage_charge`, `trophy.quota_change`, etc. No generic cross-product approval type (D2 guard).
- [ ] **APPROVAL-07**: Telegram tap-to-approve via grammY `^1.42.0` — DraggonnB ops bot refactored onto grammY in same PR. Inline keyboard buttons fire `approve:{product}:{request_id}` and `reject:{product}:{request_id}` callbacks.
- [ ] **APPROVAL-08**: Telegram bot uses Bot API `secret_token` for webhook signature verification; webhook handler checks token before processing.
- [ ] **APPROVAL-09**: Telegram callback queries deduped via `telegram_update_log` table with `update_id` PRIMARY KEY — replays return cached response, never re-execute.
- [ ] **APPROVAL-10**: Atomic stored procedure `approve_request_atomic(approval_id, approver_user_id, decision)` enforces expiry (30s grace), idempotency, and status reconciliation. Returns `{ status, error }`. Cron sweep never modifies in-flight rows.
- [ ] **APPROVAL-11**: Approver user verified via mapped `(telegram_user_id, organization_users.user_id)` lookup, NOT "user who tapped the button." Forwarded messages can't impersonate.
- [ ] **APPROVAL-12**: Inline keyboard self-disables on first valid click via `editMessageReplyMarkup` to prevent double-tap.
- [ ] **APPROVAL-13**: Telegram approval messages contain ONLY internal IDs (`damage_id`, `request_id`); never PII (guest name, phone, card last4) — Pitfall 21 guard.
- [ ] **APPROVAL-14**: Approval delivery via DM to assigned approver only — never approval channel posts (Pitfall 6 guard).
- [ ] **APPROVAL-15**: Web fallback at `/approvals` — paginated table of pending approvals for the current user, with one-click approve/reject. Mobile-first.
- [ ] **APPROVAL-16**: 3 OR-stacked SELECT RLS policies on `approval_requests` — DraggonnB approvers, Trophy approvers, cross-product linked owners. Each has explicit role gate.
- [ ] **APPROVAL-17**: Approval audit log appended on every state change — proposer, approver, action_type, timestamps, before/after payload — written to existing `audit_log` table with `resource_type='approval_request'`.
- [ ] **APPROVAL-18**: Single-level approve/reject only. Multi-level chains, delegation, conditional auto-approve are explicit anti-features for v3.1.

### Damage Auto-Billing (DAMAGE)

- [ ] **DAMAGE-01**: Phase 15.1 PayFast Subscribe-token capture conversion is the FIRST work in Phase 15 — `lib/accommodation/payments/payfast-link.ts` switches one-off → Subscribe checkout for deposits and balance.
- [ ] **DAMAGE-02**: PayFast ITN webhook captures `token` field on subscription confirmation and stores it on `accommodation_bookings.guest_payfast_token UUID NULL` (NEW nullable column, multi-step OPS-05).
- [ ] **DAMAGE-03**: `accommodation_bookings.max_incidental_charge_zar INTEGER` column added — default `total_zar * 1.5` or 5000 ZAR cents whichever higher. Communicated to guest in T&Cs.
- [ ] **DAMAGE-04**: `accommodation_bookings.damage_consent_at TIMESTAMPTZ NULL` records guest acceptance of damage T&Cs at booking time.
- [x] **DAMAGE-05** (RESOLVED 2026-05-02 via GATE-02): PayFast sandbox spike confirmed chargeAdhoc() must send INTEGER CENTS, Subscribe-token supports arbitrary-amount charges, hold-and-capture is unavailable (immediate charge only). Code corrections applied to lib/payments/payfast-adhoc.ts + payfast.ts. See GATE-02 and 13-PAYFAST-SANDBOX-SPIKE.md.
- [ ] **DAMAGE-06**: New table `damage_incidents` — `id, booking_id, organization_id, flagged_by_user_id, item_description, item_category, evidence_photo_urls TEXT[], proposed_amount_zar INTEGER, status, created_at`. Status enum: `pending_approval`, `approved`, `charged`, `disputed`, `refunded`, `cancelled`.
- [ ] **DAMAGE-07**: Telegram `/damage` command on DraggonnB ops bot opens guided flow — booking selection (open bookings only), photo upload (≥2 required), description, category from itemized price list, proposed amount.
- [ ] **DAMAGE-08**: Itemized damage price list (default + tenant-overridable) stored in `tenant_modules.config.accommodation.damage_price_list JSONB`. Categories: glassware, linen, electronics, furniture, structural, other.
- [ ] **DAMAGE-09**: Photo evidence stored in dedicated `damage-evidence` Supabase Storage bucket with versioning enabled, `service_role` DELETE-only, CRC32 hash verification, EXIF timestamp validation (must fall within booking dates ± damage window).
- [ ] **DAMAGE-10**: `/damage` command creates a `damage_incidents` row + an `approval_request` with `action_type='draggonnb.damage_charge'` — owner gets Telegram DM with photos + amount + Approve/Reject inline keyboard.
- [ ] **DAMAGE-11**: Owner approves → `chargeAdhoc()` invoked with prefix `DAMAGE-{booking_id}-{incident_id}` and stored token. Charge fails open-loop on missing token, routes to manual collection UI.
- [ ] **DAMAGE-12**: Hard 7-day window enforced from `accommodation_bookings.checkout_date` — charges attempted past day 7 are rejected at app layer with audit row.
- [ ] **DAMAGE-13**: WhatsApp pre-charge notification sent to guest with photo, item description, amount, and 48-hour dispute window (link to dispute form). Charge gated on WhatsApp `delivered` status; if not delivered within 30 minutes, charge paused with operator alert.
- [ ] **DAMAGE-14**: Guest dispute submitted within 48h → charge cancelled, owner notified, manual reconciliation queue.
- [ ] **DAMAGE-15**: Damage refund flow available from owner's incident detail page — issues PayFast refund, updates incident status to `refunded`, notifies guest via WhatsApp.
- [ ] **DAMAGE-16**: Chargeback monitoring cron tracks per-tenant chargeback rate over rolling 90 days; per-tenant kill switch auto-activates at >2% chargeback rate (operator alert + damage_charge action_type disabled for tenant).
- [ ] **DAMAGE-17**: All damage UI displays currency per D10 ("ZAR 10,500.00 (≈ USD 575)"). T&Cs PDF includes full damage policy with cap, window, dispute process.

### Hunt Bookings & Multi-Hunter Split-Billing (HUNT)

- [ ] **HUNT-01**: New table `safari_hunters` (Trophy OS schema) as the financial truth for per-hunter billing — junction between `safaris` and individual hunter records.
- [ ] **HUNT-02**: `safari_hunters` columns include the 6 fields surfaced by features research: `hunter_role`, `passport_country`, `payment_method_token`, `deposit_paid_at`, `species_quota_per_hunter JSONB`, `consent_to_individual_billing_at`. Plus baseline: `id, safari_id, full_name, email, phone, locked_daily_rate_zar, status, payfast_token, deposit_amount_zar, balance_due_zar, created_at`.
- [ ] **HUNT-03**: When a `safaris` row has 2+ hunters, each hunter completes their own PayFast Subscribe checkout to capture an individual `payment_method_token`. Booker is `safari_hunters.hunter_role='lead_booker'`, others are `'guest_hunter'`.
- [ ] **HUNT-04**: `safari_hunters.locked_daily_rate_zar` is set at deposit time and immutable for the rest of the trip (cancellation of one hunter does NOT raise the others' rates — D7 industry-norm guard).
- [ ] **HUNT-05**: Pre-arrival paid gate — Trophy OS blocks safari status transition to `confirmed` unless every `safari_hunters.deposit_paid_at` is non-null. Owner can override with explicit confirmation + audit row.
- [ ] **HUNT-06**: Trophy fee allocation requires explicit hunter selection at trophy log time — `trophies.shooter_safari_hunter_id UUID NOT NULL REFERENCES safari_hunters(id)`. Updates the correct hunter's `balance_due_zar`.
- [ ] **HUNT-07**: Per-hunter PayFast charge stub created in Phase 15.6 (records queued, idempotency keys generated) but actual `chargeAdhoc()` call deferred to Phase 16.2 (after Trophy PayFast wiring lands).
- [ ] **HUNT-08**: Per-hunter refund UI on Trophy `safaris/[id]` page — issues refund against the specific `payment_method_token`, updates `safari_hunters.status='refunded'`, audit row.
- [ ] **HUNT-09**: Currency display per D10 across hunter checkout, invoice, and Trophy admin views.

### Cross-Product Stay Link (CROSSLINK)

- [ ] **CROSSLINK-01**: `safaris.accommodation_booking_id UUID NULL REFERENCES accommodation_bookings(id) ON DELETE SET NULL` column added (Trophy OS schema, multi-step OPS-05). NEVER CASCADE.
- [ ] **CROSSLINK-02**: When a DraggonnB Accommodation booking is created with a Trophy-active org, UI offers "Link to existing safari" or "Create new safari" — both routes write the FK.
- [ ] **CROSSLINK-03**: Cross-product RLS join policy: viewing a linked record requires the user has membership in BOTH `safaris.org_id` (Trophy `org_members`) AND `accommodation_bookings.organization_id` (DraggonnB `organization_users`).
- [ ] **CROSSLINK-04**: DraggonnB Accommodation booking detail page shows "Linked hunt: SAF-2026-001" badge with click-through to Trophy via SSO bridge. Trophy safari detail shows "Linked stay: 5 nights at Swazulu Lodge" with reverse click-through.
- [ ] **CROSSLINK-05**: Bidirectional date-sync handlers — accommodation `check_in/check_out` change triggers safari `arrival_date/departure_date` review (operator must explicitly confirm sync, never auto-update). Vice-versa for hunt date changes.
- [ ] **CROSSLINK-06**: Weekly reconciliation cron scans for orphan FKs (linked booking deleted, safari now references nothing), date drift (>2 day mismatch unconfirmed >7 days), and membership-overlap mismatches (linked but user has lost membership in one product). Surfaces in `/admin/cross-product-health`.

### PWA Guest Surface (PWA)

- [ ] **PWA-01**: PWA route group at `app/(stay)/[bookingId]/page.tsx` in DraggonnB platform — token-authenticated, public-facing.
- [ ] **PWA-02**: Domain choice for PWA finalised at Phase 16 planning between `stay.draggonnb.co.za/{booking-id}` and `stay.draggonnb.com/{booking-id}` — `.com` recommended for international guest trust.
- [ ] **PWA-03**: `accommodation_bookings.guest_access_token` column added — random 32-byte base64url token, NOT booking_id. Validated via HMAC-SHA256 in `lib/stay/token.ts`.
- [ ] **PWA-04**: Token TTL = `bookings.checkout_date + 30 days`. Past-TTL access returns 410 Gone with audit row.
- [ ] **PWA-05**: Edge rate limit 60 req/5min/IP on PWA routes (Pitfall 12 guard against URL guessing).
- [ ] **PWA-06**: PWA renders pre-arrival info, check-in details, payment links (deposit/balance), concierge chat, post-stay review request, photo gallery — all per-booking scoped.
- [ ] **PWA-07**: Service worker (`@serwist/next ^9.5.10`) scoped to `/(stay)/` route group only — never caches financial data, network-first for booking details, stale-while-revalidate for static assets, "update available" banner on new SW install.
- [ ] **PWA-08**: Service worker cache key includes app version — bumps on every deploy, prevents stale-data bugs (Pitfall 7 guard).
- [ ] **PWA-09**: Offline UI for forms — captures input locally, syncs on reconnect with conflict-resolution UI (server-wins by default, user-prompt on data loss).
- [ ] **PWA-10**: Install prompt strategy — never on first visit. Trigger on (deposit-paid event) OR (3+ engagements with PWA OR check-in within 7 days). Web Push request follows install, never simultaneous.
- [ ] **PWA-11**: iOS install instruction modal — Apple does not expose `beforeinstallprompt`; modal explains "Add to Home Screen" via Safari share menu with screenshots. Triggers on iOS Safari only after install criteria met.
- [ ] **PWA-12**: ConciergeAgent gets web adapter at `lib/accommodation/agents/concierge/web-adapter.ts` — re-uses existing brand-voice + cost-ceiling + advisory lock infrastructure. Web variant doesn't replace WhatsApp; both paths active.
- [ ] **PWA-13**: PWA chat endpoint `/api/stay/[bookingId]/chat/route.ts` token-validated, rate-limited, audited.
- [ ] **PWA-14**: Currency display per D10 throughout PWA.
- [ ] **PWA-15**: POPI footer link visible on every PWA page; consent capture on first visit logged in `notification_log`.

### Trophy OS PayFast Wiring (TROPHY)

- [ ] **TROPHY-01**: PayFast helper files (`payfast.ts`, `payfast-adhoc.ts`, `payfast-prefix.ts`, `payfast-subscription-api.ts`) physically copied from DraggonnB to Trophy `src/lib/payments/` with sync-version header in each file documenting source path and version.
- [ ] **TROPHY-02**: Sync-version tracking line added to `.planning/STATE.md` — every change to source files in DraggonnB triggers a sync task in Trophy with version increment.
- [ ] **TROPHY-03**: Trophy ITN webhook lives at separate route from DraggonnB — both handle the SAME merchant credentials, distinct prefix routing: `SUB-` (DraggonnB sub), `TOS-` (Trophy sub), `ACC-` (DraggonnB accommodation), `SAFARI-` (Trophy hunter), `DAMAGE-` (DraggonnB damage), `HUNT-` (Trophy hunt overage). Single registered webhook URL with prefix-router OR two webhook URLs with merchant-side routing — decided in Phase 16 planning.
- [ ] **TROPHY-04**: `billing_plans.product TEXT NOT NULL DEFAULT 'draggonnb'` column added (3-step OPS-05). Trophy tier rows seeded: `tos_starter` R599, `tos_pro` R1,499, `tos_outfitter` R3,499.
- [ ] **TROPHY-05**: Trophy subscription state machine — `trial` (14d) → `active` (paid) → `past_due` (failed payment, 7d grace) → `cancelled` (read-only mode, 30d retention before purge).
- [ ] **TROPHY-06**: Trial expiry math uses tenant timezone (`Africa/Johannesburg` default) + 4-hour grace. UTC bugs guarded by integration test.
- [ ] **TROPHY-07**: Failed payment retry capped at 3 attempts with backoff (1h, 6h, 24h). Past 3 attempts → `cancelled` with operator alert.
- [ ] **TROPHY-08**: Trophy RLS policies enforce read-only mode on `cancelled` and `past_due` orgs — INSERT/UPDATE/DELETE blocked at DB layer, not just UI.
- [ ] **TROPHY-09**: Tier downgrade applies at end-of-cycle, never mid-cycle (avoids data-loss UX of features cut off mid-action).
- [ ] **TROPHY-10**: Cross-product unified billing UI at DraggonnB `/billing` shows DraggonnB + Trophy subscriptions with per-product status distinct (one passing while the other fails clearly visible).
- [ ] **TROPHY-11**: All Trophy guest-facing financial UI conforms to D10 currency display.
- [ ] **TROPHY-12**: Phase 15.4 multi-hunter PayFast sandbox spike completed before per-hunter charge ships — confirms 4 parallel subscriptions same merchant, refund-when-token-expired flow, idempotency keys per charge.

### v3.0 Carry-Forward (CARRY)

- [ ] **CARRY-01**: 12-07 (smart-landing dashboard, committed at `bedaff0e`) rebased onto current main, smoke-tested via preview deploy, then pushed to origin/main as the final v3.0 plan to ship.
- [ ] **CARRY-02**: BILL-08 reconciliation cron runs in DRY-RUN mode for 7 days before active — logs detected drifts without alerting, surfaces unknown v3.0 drift before active alarming starts.
- [ ] **CARRY-03**: BILL-08 active mode — nightly cron compares PayFast subscription amount vs local composition total, alerts Chris via Telegram with affected org_id and amounts on drift.
- [ ] **CARRY-04**: OPS-02 daily feature-gate audit cron — verifies every gated capability is blocked at three layers (middleware + API route + DB RLS); alerts on misconfiguration.
- [ ] **CARRY-05**: OPS-03 token expiry monitor cron — 7-day lookahead on Facebook + LinkedIn OAuth tokens; alerts operator with refresh link.
- [ ] **CARRY-06**: OPS-04 `/api/ops/env-health` endpoint returns current environment validation status without leaking secrets.
- [ ] **CARRY-07**: 360px mobile sweep across all DraggonnB revenue-critical pages (landing, pricing, signup, payment, dashboard home, module Easy views) — validated on real SA-representative device. Trophy mobile sweep deferred per D8.
- [ ] **CARRY-08**: Pre-Phase 16 lightweight mobile sweep on top 5 pages catches obvious breakage before milestone budget is consumed.

### Stack Upgrades & Library Adoption (STACK)

- [ ] **STACK-01**: `@supabase/ssr` upgraded from `0.1.0` → `0.10.2` in DraggonnB platform — `cookies.get/set/remove` refactored to `getAll/setAll`. Regression test suite passes (middleware + auth pages + protected routes).
- [ ] **STACK-02**: `@supabase/supabase-js` bumped to `^2.105.1` in DraggonnB platform.
- [ ] **STACK-03**: `@supabase/ssr` upgraded `0.9.0` → `0.10.2` in Trophy OS — same refactor pattern, lower regression risk.
- [ ] **STACK-04**: `jose ^5.x` added to DraggonnB platform, Trophy OS, and `@draggonnb/federation-shared` for HS256 JWT operations.
- [ ] **STACK-05**: `grammy ^1.42.0` added to DraggonnB platform; existing `lib/accommodation/telegram/ops-bot.ts` (raw Bot API) refactored onto grammY in same PR (single bot framework in codebase).
- [ ] **STACK-06**: `@serwist/next ^9.5.10` and `serwist ^9.5.10` (devDep) added to DraggonnB platform for PWA service worker.
- [x] **STACK-07** (DONE 2026-05-03 via 13-05): `@draggonnb/federation-shared@1.0.0` published to GitHub Packages at https://github.com/DRAGGONNB/federation-shared/pkgs/npm/federation-shared. 138 LOC (under 200 cap). Exports: brand types, BridgeTokenPayload, LogoutTokenPayload, ApprovalRequest, BillingLineInput, signBridgeToken/verifyBridgeToken, signLogoutToken/verifyLogoutToken, constants. DraggonnB install verified (tsc clean). CI lint guard `scripts/ci/check-federation-pinned.mjs` added. Fine-grained PAT rejected by GitHub; classic PAT with write:packages required.

### Pre-Phase Gates (GATE)

- [x] **GATE-01** (RESOLVED 2026-05-01): Swazulu discovery effectively complete via DB audit + owner-side knowledge transfer (Chris set up Swazulu's lodges personally). Outputs captured in `.planning/research/SWAZULU-DISCOVERY.md`: D3 revised (multi-route checkout), D4 revised (split-by-default invoice + multi-payer payment links), D6 confirmed (single entity), D9 revised (manifest-driven callbacks). New D11 added (polymorphic billing layer). Three new req categories triggered: INVOICE-*, PAYROUTE-*, MANIFEST-*. Pricing/damage-list/vendor-SOP artefacts captured out-of-band before Phase 15.
- [x] **GATE-02** (RESOLVED 2026-05-02): PayFast sandbox spike complete. Amount unit = INTEGER CENTS (Call A rands → 400 "Integer Expected"; Call B cents → 200 success). Subscribe-token charges arbitrary amounts confirmed (Call C different amount → 200 success). Hold-and-capture UNAVAILABLE (response body has code/status/data only, no capture_url/hold_reference/auth_code). Idempotency NOT enforced server-side (duplicate m_payment_id returns new pf_payment_id). 5 bugs found and fixed: URL base (sandbox.payfast.co.za → api.payfast.co.za + ?testing=true), amount unit (÷100 removed), form signature sort order (alphabetical removed), passphrase space encoding (%20 → +), API signature helper added. See `.planning/phases/13-cross-product-foundation/13-PAYFAST-SANDBOX-SPIKE.md`.

### Polymorphic Billing Layer (INVOICE) — NEW 2026-05-01

- [ ] **INVOICE-01**: New table `billing_invoices` — `id, organization_id, billing_owner_user_id, billing_owner_email, currency, subtotal_zar_cents, vat_zar_cents, total_zar_cents, amount_paid_zar_cents, balance_due_zar_cents, status, payment_route, external_invoice_ref, created_at, due_at, paid_at`. Status enum: `draft, issued, partial_paid, paid, cancelled, refunded`.
- [ ] **INVOICE-02**: New table `billing_invoice_lines` — `id, invoice_id, source_product, source_type, source_id, hunter_id NULLABLE, description, quantity, unit_price_zar_cents, line_total_zar_cents, vat_zar_cents, sort_order, created_at`. `source_type + source_id` polymorphic FK; `hunter_id` tags per-hunter extras.
- [ ] **INVOICE-03**: New table `billing_invoice_payment_links` — `id, invoice_id, payer_user_id NULLABLE, payer_email, amount_zar_cents, payment_route, platform_fee_zar_cents NULLABLE, payfast_token NULLABLE, paid_at NULLABLE, status`. Status enum: `pending, paid, partial, expired, refunded, cancelled`.
- [ ] **INVOICE-04**: `lib/billing/invoice-service.ts` exposes `createInvoice()`, `addInvoiceLine()`, `issueInvoice()`, `createPaymentLink()`, `recordPayment()`, `refundLine()` — single API surface used by every module's billing emission.
- [ ] **INVOICE-05**: `addInvoiceLine()` is product-pluggable — DraggonnB Accommodation calls it for nights/addons; Trophy OS calls it for safari days, animals, slaughter; future Breeder OS will call it for breeding services. No product-specific billing tables added downstream.
- [ ] **INVOICE-06**: Payment link generator produces a slice of the invoice — `selectLines(invoice_id, predicate)` returns sum of matching lines. Default presets: "all lines hunter_id IS NULL" (booker/infrastructure), "all lines hunter_id = X" (per-hunter), "remaining unpaid" (catch-all).
- [ ] **INVOICE-07**: Multi-payer settlement reconciles automatically — when sum of `paid_at IS NOT NULL` payment links equals invoice `total_zar_cents`, invoice transitions to `paid`. Partial payments transition to `partial_paid`.
- [ ] **INVOICE-08**: Cross-product RLS — `billing_invoices` SELECT requires `organization_users` membership in `organization_id`. Lines + payment links inherit via FK join.
- [ ] **INVOICE-09**: `billing_invoices` is the canonical financial truth; existing `accommodation_invoices` remains Phase-15 backwards-compat shim (writes through to `billing_invoices` via 3-step OPS-05). Final cutover deferred until Phase 17 cleanup.
- [ ] **INVOICE-10**: Trophy OS gains zero billing tables — calls DraggonnB billing service via `@draggonnb/federation-shared`. Trophy `safaris` and `safari_hunters` remain operational records only.

### Per-Tenant Payment Routing (PAYROUTE) — NEW 2026-05-01

- [ ] **PAYROUTE-01**: `tenant_modules.config.billing` schema documented and Zod-validated: `{ payment_route: 'own_payfast'|'draggonnb_payfast'|'eft_manual', own_payfast?: { merchant_id, merchant_key }, draggonnb_payfast?: { fee_pct, fee_fixed_zar_cents } }`.
- [ ] **PAYROUTE-02**: PayFast credentials per tenant — when `payment_route='own_payfast'`, `lib/payments/payfast.ts` resolves merchant credentials per-org via `tenant_modules.config.billing.own_payfast.*`. Falls back to platform credentials on `draggonnb_payfast`. EFT mode bypasses PayFast invocation entirely.
- [ ] **PAYROUTE-03**: Payment link fee calculation — when `payment_route='draggonnb_payfast'`, `createPaymentLink()` computes `platform_fee_zar_cents = round(amount * fee_pct / 100) + fee_fixed_zar_cents`. Fee surfaced on guest checkout UI ("Includes R{fee} processing fee"). On `own_payfast` and `eft_manual` routes, fee is zero.
- [ ] **PAYROUTE-04**: EFT-manual mode — when active, payment link generation produces an invoice PDF with bank details + booking ref instead of a PayFast checkout link. Marks the invoice `status='issued'` with manual reconciliation pending. Damage flow on EFT-manual tenant routes ALL damage incidents to manual collection (no token to charge).
- [ ] **PAYROUTE-05**: Platform-fee remittance — daily aggregate cron computes platform fees collected per `draggonnb_payfast` tenant, writes to `platform_fee_ledger` table, surfaces in `/admin/platform-revenue` for finance reconciliation. Investor reporting line.

### Module Manifest Standardisation (MANIFEST) — NEW 2026-05-01

- [ ] **MANIFEST-01**: Typed module manifest contract at `lib/modules/types.ts` — `{ id, name, required_tenant_inputs[], emitted_events[], approval_actions[], telegram_callbacks[], billing_line_types[] }`. Each field has its own typed sub-schema.
- [ ] **MANIFEST-02**: Each existing module gains a `lib/modules/{name}/manifest.ts` — accommodation, crm, events, ai_agents, analytics, security_ops. Migration is additive (manifests describe what the module already does; no behaviour change).
- [ ] **MANIFEST-03**: Onboarding wizard reads `required_tenant_inputs` from active modules, generates dynamic form sections — replaces hardcoded onboarding branches. New module = new manifest, zero wizard code change.
- [ ] **MANIFEST-04**: Telegram bot callback registry built from manifests at boot — each `telegram_callbacks[]` entry registers `approve:{product}:{action}` and `reject:{product}:{action}` handlers via grammY routing. No hand-wired switch statements.
- [ ] **MANIFEST-05**: Approval spine action-type registry built from manifests — every `approval_actions[]` entry auto-registers a handler stub; product-scoped action types enforced (D2/APPROVAL-06 guard). Missing handler = clear error at boot, not runtime.
- [ ] **MANIFEST-06**: Billing service auto-registers line types per module — `addInvoiceLine()` validates `source_product + source_type` against the union of every active module's `billing_line_types[]`. Unknown product/type pair is rejected.

---

## Previously Shipped Requirements (v1.x / v2.x / v3.0)

Full history in `.planning/ROADMAP.md` under "Completed Work". v3.0 closed with 60/60 in-scope reqs done across phases 09–11, plus 3/10 phase-12 plans (12-01, 12-06, 12-08). Remaining v3.0 phase-12 work (BILL-08, OPS-02..04, mobile sweep, 12-07 push) carries forward as v3.1 CARRY-* requirements.

---

## v3.2+ Future Requirements (Deferred from v3.1)

Triggered by real client signal or explicit roadmap decision:

- **Cross-domain SSO for `swazulu.com`** — when Swazulu's custom domain goes live; token handoff already specified architecturally
- **Single billing root synthetic invoice** (Option D from D4) — if pilot reveals two-charge UX friction
- **Trophy Pro/Premium tier features** — feature flags + gating beyond CLAUDE.md's tier matrix
- **PWA push notifications** — full Web Push pipeline (Apple removed beforeinstallprompt; needs vendor-detect + iOS-specific UX)
- **PWA photo gallery + post-stay review** — features beyond v3.1 launch scope
- **Bulk approve, per-action-type expiry config, annual billing toggle** — once approval spine has real-world signal
- **Game-lodge deep-onboarding intake** (rules/regs/waivers → AI-tailored config) — Wave B
- **Per-carcass routing pipeline** — Wave B (vendor SOPs, deposits, notifications)
- **Farmer photo classification + genetic tree** — Wave B (Trophy OS)
- **Manager/owner dedicated AI agent** for DraggonnB Accommodation — Wave B
- **GoHunting.com + location marketplaces + Go-X template** — Wave C
- **Embedded Finance** (VAT201 + TOMSA + tips + SARS day-end + owner-payout) — must ship with accountant review gate on first 3 pilot tenants
- **Easy View rollout** to remaining 5 DraggonnB modules — trigger: ModuleHome pattern stable + 5+ clients onboarded
- **Trophy mobile sweep** — Trophy already mobile-first per its CLAUDE.md; full sweep deferred until v3.2

---

## Out of Scope (Deliberate Exclusions)

Confirmed 2026-05-01. v3.1 anti-features — not building, even on request, without milestone re-scoping:

### Never (compete by not competing)

- **Multi-level approval chains.** Single-level approve/reject only — owner-operator target. (APPROVAL-18)
- **Auto-create cross-product memberships.** Federation token to a tenant the user has no membership in → "Invite required" UX. (D2 + SSO-06)
- **Role auto-mapping between Trophy 9 roles and DraggonnB 4 roles.** Trust models are different by design. (D2)
- **Auto-charge below threshold.** Every damage_charge requires explicit owner approval. (DAMAGE-10)
- **No-photo damage entry.** ≥2 photos mandatory with EXIF + CRC32. (DAMAGE-09)
- **Mandatory single billing root.** Two parallel subscriptions on same card is the v3.1 model; mandatory single charge = v3.2+ if pilot demands. (D4)
- **PWA login required.** PWA is token-authenticated public surface; no Supabase auth roundtrip. (PWA-01)
- **Trophy freemium tier.** 14-day trial only, then payment-method-on-file. (existing Trophy CLAUDE.md)

### Deferred (re-evaluate later milestone)

- **Cross-domain SSO for swazulu.com / arbitrary tenant domains.** v3.2 trigger: first tenant with custom domain goes live.
- **9-dot grid product launcher.** Conditional sidebar items first; revisit if 3+ products. v3.3+.
- **Real-time room service chat with kitchen.** PWA concierge → kitchen routing is out of v3.1.
- **AI damage pricing from photo.** Operator picks from pre-loaded itemised list in v3.1; AI vision for auto-pricing = v3.2+.
- **Per-hunter accommodation assignment.** Hunters share linked stay; per-hunter unit assignment = v3.3+.
- **Real-time bidirectional date sync.** Manual confirmation in v3.1; automated bi-sync = v3.2+.

---

## Traceability — Requirements to Phases

Populated by gsd-roadmapper 2026-05-01. Pre-allocation preserved unchanged — no reassignments needed. Every v3.1 REQ-ID maps to exactly one phase. Coverage = 100%.

### Phase summary

| Phase | Title | REQ Count | Categories |
|-------|-------|-----------|------------|
| 13 | Cross-Product Foundation | 31 | SSO-01..14, NAV-01..04, STACK-01..04, STACK-07, MANIFEST-01..06, GATE-01, GATE-02 |
| 14 | Approval Spine (3-deploy split: 14.1, 14.2, 14.3) | 19 | APPROVAL-01..18, STACK-05 |
| 15 | Damage Auto-Billing + Hunt Bookings + Cross-Product Stay Link (8 sub-plans 15.0..15.6) | 47 | INVOICE-01..10, PAYROUTE-01..05, DAMAGE-01..17, HUNT-01..09, CROSSLINK-01..06 |
| 16 | PWA + Trophy PayFast + v3.0 Carry-Forward (5 sub-plans 16.1..16.5) | 36 | PWA-01..15, TROPHY-01..12, CARRY-01..08, STACK-06 |
| **Total** | | **133** | 124 feature reqs + 9 meta reqs (STACK + GATE) |

### Per-REQ assignment

| REQ-ID | Phase | Status | Notes |
|--------|-------|--------|-------|
| SSO-01..14 | 13 | Pending | Federation core; GATE-01 blocks architecture lock |
| NAV-01..04 | 13 | Pending | Cross-product nav (conditional on linked_org) |
| APPROVAL-01..03 | 14 | Pending | OPS-05 3-deploy split: 01→14.1, 02→14.2, 03→14.3 |
| APPROVAL-04..18 | 14 | Pending | Spine implementation lands in 14.3 alongside NOT NULL constraints |
| DAMAGE-01..04 | 15 | Pending | 15.1 PayFast Subscribe-token capture — hidden pre-req for 15.2+ |
| DAMAGE-05 | 15 | Pending | Sandbox spike happens in Phase 13 GATE-02 (cross-phase) |
| DAMAGE-06..09 | 15 | Pending | 15.2 Telegram intake + photo evidence |
| DAMAGE-10..17 | 15 | Pending | 15.3 approval handler + auto-charge + dispute + chargeback |
| HUNT-01..06, HUNT-09 | 15 | Pending | 15.4 multi-hunter split-billing + per-hunter Subscribe |
| HUNT-07..08 | 15 | Pending | 15.6 charge stub (records queued, idempotency keys); actual charge in 16.2 |
| CROSSLINK-01..06 | 15 | Pending | 15.5 cross-product stay link |
| PWA-01..05 | 16 | Pending | 16.3 route group + token auth |
| PWA-06..15 | 16 | Pending | 16.4 features + concierge web adapter |
| TROPHY-01..11 | 16 | Pending | 16.1 Trophy PayFast wiring (unblocks 16.2) |
| TROPHY-12 | 16 | Pending | 16.2 multi-hunter sandbox spike before per-hunter charge ships |
| CARRY-01..08 | 16 | Pending | 16.5 v3.0 carry-forward + DraggonnB-only mobile sweep |
| STACK-01..04 | 13 | DONE 2026-05-02 | @supabase/ssr 0.10.2 upgrade + jose + .npmrc — completed in 13-02 |
| STACK-05 | 14 | Pending | grammY adoption (Telegram framework); ops-bot refactor in same PR |
| STACK-06 | 16 | Pending | @serwist/next + serwist (PWA service worker) |
| STACK-07 | 13 | DONE 2026-05-03 | @draggonnb/federation-shared@1.0.0 published — 138 LOC, GitHub Packages, CI lint guard |
| MANIFEST-01..06 | 13 | DONE 2026-05-02 | Module manifest contract + 4 registries — completed in 13-03 + 13-04 |
| INVOICE-01..10 | 15 | Pending | 15.0 polymorphic billing schema + line emission API (D11) — FIRST sub-plan, before 15.1 |
| PAYROUTE-01..05 | 15 | Pending | 15.0 per-tenant payment routing config + fee calc + EFT fallback (D3) |
| GATE-01 | 13 | RESOLVED 2026-05-01 | Swazulu discovery completed via DB audit + owner-side knowledge — see SWAZULU-DISCOVERY.md |
| GATE-02 | 13 | RESOLVED 2026-05-02 | PayFast sandbox spike complete — amount=CENTS, arbitrary charges YES, hold-and-capture NO — see 13-PAYFAST-SANDBOX-SPIKE.md |

### Sequence-critical dependencies (cross-phase)

1. ~~**GATE-01 (pre-Phase-13)**~~ — RESOLVED 2026-05-01 via DB audit + owner knowledge transfer. Outputs in `.planning/research/SWAZULU-DISCOVERY.md`. D3, D4, D9 revised; D11 added; INVOICE/PAYROUTE/MANIFEST categories triggered.
2. **Phase 13 MANIFEST foundation** — MANIFEST-01..06 must land before Phase 14 approval-spine action-type registry (APPROVAL-05) can be manifest-driven. Without manifests, the spine falls back to hardcoded action types (regression).
3. **Phase 15.0 INVOICE + PAYROUTE foundation** — must land BEFORE 15.1 (DAMAGE-01 PayFast Subscribe-token capture) or any 15.* damage/hunt code. Polymorphic billing layer is the substrate every later sub-plan emits into.
4. **Phase 14 OPS-05 split** — APPROVAL-01/02/03 enforce a 3-deploy migration sequence (add nullable → backfill → NOT NULL). Bundling fails per CLAUDE.md OPS-05.
5. **Phase 15.1 hidden pre-requisite** — DAMAGE-01 (PayFast Subscribe-token capture in `lib/accommodation/payments/payfast-link.ts`) must land BEFORE damage intake (15.2) or any damage charge code can run.
6. **Phase 15.6 ↔ 16.1 circular dependency** — HUNT-07 stubs charges in 15.6; actual `chargeAdhoc()` call waits for TROPHY-01..11 in 16.1; HUNT-08 + per-hunter charge flow lands in 16.2.
7. **DAMAGE-05 cross-phase** — sandbox spike happens inside Phase 13 GATE-02, even though the requirement is categorized under DAMAGE.

Total v3.1 unconditional REQ-IDs: **124 feature + 9 meta = 133**.

---

*Last updated: 2026-05-01 (revision 2) — Swazulu discovery resolved via DB audit + owner-side knowledge transfer. D3, D4, D9 revised. D11 added (polymorphic billing layer). New categories INVOICE-* (10), PAYROUTE-* (5), MANIFEST-* (6) bring v3.1 total from 112 to 133 reqs. Phase 15 grows from 6 sub-plans to 8 (15.0 INVOICE+PAYROUTE foundations land first). Phase 13 picks up MANIFEST as foundational layer. GATE-01 resolved; GATE-02 (PayFast sandbox spike) remains first plan inside Phase 13. See `.planning/research/SWAZULU-DISCOVERY.md` for full audit + decision rationale.*

*Last updated: 2026-05-01 (revision 3) — NAV-01 wording clarified: canonical source-of-truth is `organizations.linked_trophy_org_id` FK column (surfaced via middleware header), with JSONB `tenant_modules.config.trophy.linked_org_id` re-cast as best-effort denormalized cache. Aligns requirement wording with plan 13-07 implementation per checker BLOCKER 5.*

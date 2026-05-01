# Pitfalls Research — DraggonnB OS v3.1 Operational Spine

**Domain:** Federation of two live Next.js + Supabase products (DraggonnB OS multi-tenant SaaS + Trophy OS vertical hunting OS) on shared infrastructure, anchored on Swazulu Game Lodge as first dual-product pilot.
**Researched:** 2026-04-30 (resumed planning 2026-05-01)
**Confidence:** HIGH on Supabase auth/cookie behaviour (verified against Supabase docs + GitHub Discussion #5742 ISR caching warning), HIGH on PayFast tokenization model (verified against payfast.io tokenization + ad-hoc docs), HIGH on Telegram callback_query replay model (verified against core.telegram.org), HIGH on existing v3.0 infrastructure state (read against current `lib/auth/get-user-org.ts` + Trophy OS CLAUDE.md schema), MEDIUM on PWA offline conflict resolution (industry-standard patterns; specific bugs only manifest with real user testing).

**Severity legend (cost if it happens):**
- **CATASTROPHIC** — kills the milestone (POPI breach, pilot cancels, financial liability >R50k, demo-day disaster in front of investor)
- **HIGH** — derails a phase, requires hotfix, customer trust damage, Swazulu pilot pauses for >1 week
- **MEDIUM** — hours-to-days of rework, customer complaint, support escalation
- **LOW** — annoyance, minor rework, caught in next plan

**Context assumption:** Two separate Next.js codebases share Supabase project `psqfgzbjbgqrmjskdavs`; DraggonnB OS uses `organization_users`/`organizations` (4 roles), Trophy OS uses `org_members`/`orgs` (9 roles). v3.0 carry-forward (12-07 push, BILL-08, OPS-02..04, mobile sweep) lands in Phase 16. First paying client = Swazulu running both products. Investor demo possible mid-milestone.

---

## Critical Pitfalls — Must prevent before v3.1 ships

### Pitfall 1: Supabase auth cookie scope misconfiguration leaks session across unrelated tenants

**Severity:** CATASTROPHIC

**Category:** SSO / Federation

**What goes wrong:**
To bridge auth between `app.draggonnb.co.za` and `app.trophyos.co.za` (or for Swazulu specifically, `swazulu.draggonnb.co.za` + `swazulu.trophyos.co.za`), the implementer sets the auth cookie domain to `.draggonnb.co.za` so subdomains share session. But `.draggonnb.co.za` is ALREADY the domain hosting *every other tenant's subdomain* (`acme.draggonnb.co.za`, `bravo.draggonnb.co.za`, etc.). Setting cookie scope to the parent domain means: a user who logs into one client's subdomain has their session cookie sent to every OTHER client's subdomain too. Combined with any cookie-trusting code path that bypasses tenant verification, this is cross-tenant session bleed → POPI breach.

A second variant: the federation cookie is set to `.trophyos.co.za` AND `.draggonnb.co.za` separately, but the Supabase JWT payload doesn't carry a tenant scope. A user authenticated via Trophy OS gets the cookie, lands on `acme.draggonnb.co.za`, the middleware reads `auth.uid()`, tries to map them to the wrong org, and either errors or — worse — auto-creates a junction row to the wrong org via `ensureUserRecord()` (current `getUserOrg()` code path).

**Why it happens:**
- Supabase docs on multi-subdomain SSO recommend setting cookie domain to parent (`.example.com`); developers copy this without realising the parent domain is multi-tenant
- `lib/auth/get-user-org.ts` `ensureUserRecord()` auto-creates an `organization_users` row on first access — this is RIGHT for new users on their first org, but DANGEROUS when a federated user from a different product hits an unrelated tenant subdomain
- No "tenant origin verification" gate: middleware injects `x-tenant-id` from subdomain but doesn't verify the authenticated user has membership in that tenant before request proceeds
- Supabase ISR caching warning (GitHub Discussion #5742) — if a route uses ISR or CDN caching and a Set-Cookie response gets cached, a different user gets served the previous user's refreshed JWT

**How to avoid:**
1. **Federation cookie scope is NEVER `.draggonnb.co.za`.** Use a dedicated auth subdomain pattern: `auth.draggonnb.co.za` issues + holds the session cookie at *exactly* `auth.draggonnb.co.za` (host-only). Both `app.draggonnb.co.za` and `app.trophyos.co.za` redirect to `auth.draggonnb.co.za` for sign-in, and exchange a short-lived signed token (HMAC + 60s expiry + nonce) on return for a per-app cookie that is scoped to its OWN host only.
2. Tenant subdomains (`{client}.draggonnb.co.za`) DO NOT trust auth cookies from other subdomains. Each tenant subdomain enforces a tenant-membership check on every request: `if user.tenant_id !== url.tenant_id, redirect to auth bridge with intended_tenant param`.
3. **Disable `ensureUserRecord()` auto-create when the request comes via a federation token** (add a `federated_origin` claim to the bridge token). Auto-create only on explicit signup flow, never on a federated cookie hit.
4. Add `tenant_membership_proof` middleware that runs BEFORE `getUserOrg()` on every protected route, reading subdomain → resolving tenant → asserting `organization_users` row exists for `(user_id, tenant_id)` with `is_active=true`. No row = 403 + redirect to "you don't have access to this workspace, switch?" page.
5. **No ISR or CDN-cached pages on any route that touches auth.** Add a CI lint rule: any `app/**/page.tsx` file with `export const revalidate = N` (where N is finite) must NOT import from `lib/auth/*`.
6. Federation bridge endpoint signs intent with HMAC keyed on `FEDERATION_BRIDGE_SECRET` env (Vercel env var, not client-readable); rotates monthly.

**Warning signs:**
- Logs showing `getUserOrg()` returning a different `organization_id` for the same `user_id` across requests within a 5-minute window
- `organization_users` rows being inserted for users hitting tenant subdomains they should not have access to (audit cron should flag this)
- Any 200 response on a tenant subdomain whose `organization_id` from middleware does not match the user's `organization_users.organization_id`
- Customer support ticket: "I can see another company's data" — TREAT AS P0

**Phase to address:**
**Phase 13 (Cross-product foundation)** — must ship the federation bridge architecture FIRST, before any cross-product nav lands. Plan 13-01 should be the SSO architecture spike, not a build. Plan 13-02 implements the bridge with the membership-proof middleware. No Phase 14 work begins until two-tenant cross-product membership boundary test passes in CI.

**Recovery cost:** CATASTROPHIC if exploited — POPI breach notification within 72h, individual disclosure to affected data subjects, Information Regulator filing, potential R10M fine ceiling. Recovery: invalidate all sessions, audit `organization_users` insertions for last N days, manual contact with affected tenants.

---

### Pitfall 2: Cross-product role mapping leaks privileged actions

**Severity:** CATASTROPHIC

**Category:** SSO / Approval Spine

**What goes wrong:**
Trophy OS has 9 roles (super_admin, farm_owner, outfitter, ph, ops_manager, taxidermist, processor, logistics, staff, client). DraggonnB OS has 4 (admin, manager, user, client). Federation work requires mapping these so a Trophy OS `farm_owner` who lands in DraggonnB Accommodation has *some* role. Naive mapping says: `farm_owner → admin`, `outfitter → admin`, `ph → manager`, `ops_manager → manager`, etc. But `outfitter` in Trophy OS is *multi-org coordinator* — they have access to MULTIPLE Trophy farms. If they're auto-mapped to DraggonnB `admin` for one specific accommodation org, they may end up acting on behalf of an org they haven't been explicitly invited to.

A second variant: the approval spine routes "damage_charge" approvals to "any user with `admin` role." DraggonnB admin is mapped from Trophy `outfitter`. Outfitter approves a damage charge for a guest at a lodge they coordinate but don't OWN. Lodge owner gets billed for an approval they didn't authorise.

**Why it happens:**
- "Just map the roles" is a 1-line dictionary in code; the architectural implication (different products have different *trust models*, not just different *labels*) is invisible
- Trophy OS roles describe *vertical responsibility* (PH = professional hunter); DraggonnB OS roles describe *organisational seniority* (admin = "owner of this org"). These don't compose linearly.
- Approval spine `approval_requests.role_required` defaults to "admin" without distinguishing "admin of which product"
- Multi-org users (Trophy OS `outfitter` coordinates 5 farms) have no equivalent in DraggonnB; mapping silently flattens this

**How to avoid:**
1. **No role auto-mapping.** Federation does NOT translate Trophy OS roles into DraggonnB OS roles. Instead: each product has its own `organization_users` (DraggonnB) / `org_members` (Trophy) row per user. A user federated from Trophy with no DraggonnB row has *no DraggonnB access*; they get an explicit invite UI ("Invite this Trophy user to your DraggonnB org as: [admin/manager/user]?") run by the DraggonnB admin.
2. `approval_requests.role_required` becomes `approval_requests.product_role` — a JSONB structure: `{ product: 'draggonnb' | 'trophy', roles: [...] }`. Approvals only routed to users with active membership in the product where the approval lives.
3. Approval action types are scoped: `draggonnb.damage_charge`, `draggonnb.rate_change`, `trophy.quota_change`, `trophy.safari_status_change`. No generic "approval" type that crosses products.
4. `outfitter` in Trophy OS does NOT auto-grant DraggonnB access to any of the farms they coordinate — DraggonnB owner must explicitly invite them. UX: "Outfitter Joe has Trophy access to your farm. Invite to DraggonnB? [admin / manager / no thanks]"
5. Integration test: create user with Trophy `outfitter` role at farm A, federation bridge in DraggonnB does NOT auto-grant access to farm A's DraggonnB org. Assert `organization_users` query returns zero rows.
6. Audit log: every federation-token-issuance writes a row to `federation_audit_log` with origin product, target product, user_id, intended_tenant_id, granted_tenant_ids — for forensic review.

**Warning signs:**
- `approval_requests.approved_by` is a user who has no `organization_users` row for the approval's target org
- Federation token issued with target_tenant differing from any of the user's known memberships
- "outfitter approved my damage charge" support ticket from a guest at a farm where the outfitter isn't a registered owner
- Spike in `federation_audit_log` rows where `origin_product != target_product` and target tenant has no prior membership for the user

**Phase to address:**
**Phase 13 (federation foundation)** for the per-product membership architecture. **Phase 14 (approval spine)** for the per-product approval routing.

**Recovery cost:** CATASTROPHIC — financial liability if approval spine charged a guest based on an unauthorized approver. POPI implications if cross-product visibility crossed tenant lines. Recovery: void affected charges, audit approval log, hot-fix role enforcement, customer disclosure.

---

### Pitfall 3: Damage auto-billing charges PayFast token after legitimate booking ended

**Severity:** CATASTROPHIC

**Category:** Damage auto-billing / Financial liability

**What goes wrong:**
Phase 15 ships damage auto-billing: staff flag damage in Telegram → approval spine routes to lodge owner → owner taps approve → PayFast ad-hoc charge fires against guest's stored token. PayFast tokens (per official docs) remain valid for the merchant to charge ad-hoc as long as the merchant has tokenization agreement; there's no automatic expiry tied to a single booking. So:
- Guest stays Mar 1-5. Token created at booking.
- Mar 8: Staff finds damage discovered late, flags it.
- Mar 15: Owner approves charge. Card charged. Guest disputes: "I checked out 10 days ago."
- Variant: 30 days after checkout, a different staff member submits a "damage" charge. Token still works. PayFast charges. Guest issues chargeback. Bank reverses + R350 chargeback fee + reputation hit with PayFast acquirer.

A second variant: amount mismatch — token was authorised for "up to R5,000 damages per stay" (verbal expectation) but staff submits R12,000 charge. PayFast accepts (token has no per-charge ceiling unless we enforce one). Guest has legal claim that the amount was unauthorised.

**Why it happens:**
- PayFast tokens don't carry per-charge ceilings or expiry tied to bookings; the merchant is responsible for enforcing both
- Damage discovery has natural lag (housekeeping checks day after, deep cleaning days later, broken AC reported by next guest)
- Approval spine doesn't distinguish "still in valid window" vs "stale claim"
- No per-token caps stored
- No "guest consents to specific charge" step; consent is implicit at booking

**How to avoid:**
1. **Hard cap on damage charge window:** 7 days from `bookings.checkout_date`. After that, token charges blocked at the application layer (NOT relying on PayFast). Staff can still log damage, but it routes to "manual collection" workflow (email guest with bank-transfer request), not auto-charge.
2. **Per-token ceiling:** stored alongside token: `accommodation_payment_tokens.max_charge_zar = booking.total * 1.5` (or fixed R5,000, whichever is higher). Charges exceeding this require explicit guest re-consent (signed digital form, not just owner approval).
3. **Guest notification at booking:** "Your card may be charged for verified damages up to R5,000 within 7 days of checkout. By booking, you consent to this." Display on booking confirmation page + email + WhatsApp. Store consent timestamp + IP + acknowledgement on `bookings.damage_consent_at`.
4. **Dual approval for damages:** owner approves AND guest is notified BEFORE charge fires. WhatsApp "We've charged R450 for [damage_description]. Photo evidence: [url]. Dispute within 48hrs: [link]." Pre-charge notification, not post-charge.
5. **Photo evidence is mandatory.** No charge without 2+ photos uploaded to a write-once storage bucket (versioning enabled, deletion blocked at bucket policy level). Photos stored under `damage-evidence/{booking_id}/{timestamp}-{uuid}.jpg`. Staff cannot reupload or replace.
6. **Chargeback monitoring:** PayFast ITN webhook handles `dispute_initiated` and `chargeback` events; flags affected booking + freezes further charges on the token + alerts ops_manager.
7. Per-tenant kill switch: if chargeback rate >2% across all bookings in 30 days, auto-disable damage auto-billing for that tenant pending review.

**Warning signs:**
- `accommodation_damage_charges.amount > accommodation_payment_tokens.max_charge_zar`
- Charge attempted after `now() - booking.checkout_date > 7 days`
- Photo count for damage charge < 2 OR photos lack EXIF timestamp within damage window
- Chargeback rate per tenant trending up week-over-week
- Guest WhatsApp replies with "I never authorised this" or "What is this charge for?"

**Phase to address:**
**Phase 15 (damage auto-billing + hunt bookings + cross-product stay link)** — the entire damage flow architecture must include the 7-day window, per-token cap, dual-consent, and write-once photo storage from day one. NOT a "we'll add caps later" feature.

**Recovery cost:** CATASTROPHIC if pattern emerges — class action claim, PayFast acquirer terminates relationship, criminal complaint under SA Consumer Protection Act §49 unauthorised charges. Recovery: refund all disputed + freeze + acquirer review.

---

### Pitfall 4: Multi-hunter split-billing creates orphaned charges and refund chaos

**Severity:** HIGH (CATASTROPHIC if compounded with Pitfall 3 on cross-product packages)

**Category:** Multi-hunter split-billing

**What goes wrong:**
Trophy OS adds `safari_hunters` junction so 4 hunters can share one safari. Phase 15 wires per-hunter PayFast charges. Failure modes that ALWAYS surface:
- **Cancellation cascade:** Booking is "4-way split @ R12,500 each = R50,000 total." Hunter A cancels day 5. Per the contract their R12,500 is non-refundable. But system was structured to multiply daily rate × num_hunters — when hunter A cancels, the daily rate per remaining hunter goes UP (3-way split now). Hunter B/C/D weren't informed of this dependency. Each gets unexpected charge.
- **Late-payment safari starts unpaid:** Hunter D's deposit wasn't received by safari start. PH starts the hunt anyway because hunter A/B/C are present and paid. After hunt, who chases hunter D? Outfitter? Booker? The booker may not even have hunter D's email.
- **Booker ≠ hunter:** Common in Trophy: a corporate hunting host books for 4 employees. Booker has only employer email; per-hunter passport details, dietary requirements, payment cards belong to hunters. If Trophy code uses `safaris.client_id` (single ref) for billing, hunters are invisible to the billing system.
- **Trophy fee misallocation:** Hunter A shoots a kudu (R8,000 trophy fee). Hunter B's deposit is R10,000. System credits trophy fee against B's deposit instead of A's account because of FK confusion in the split-billing logic.
- **Partial refund nightmare:** Safari cancelled by lodge (rain, force majeure). Need to refund 4 hunters each R10,000. PayFast refund API works per-token; if 1 of 4 tokens has expired or card was cancelled by issuer, that hunter is owed manual refund. Now reconciliation has 3 PayFast refunds + 1 EFT refund + tax-receipt complications.
- **Currency mix:** International hunters paid in USD via PayFast (PayFast supports ZAR with stored exchange rate). Refund in ZAR at NEW exchange rate creates apparent currency loss/gain that may be chargeback-ground.

**Why it happens:**
- "Split billing" is treated as a UI feature ("show 4 line items") not a data architecture decision (per-hunter ledger, FK to hunter not booker)
- Hunters often share a single booking from a CRM/reservation perspective; splitting financial responsibility introduces a 1:M relation that traditional booking schemas don't have
- PayFast tokenization doesn't natively support "split charge" — multiple per-hunter tokens are app-side responsibility
- Refund flows are usually built for 1:1 booking↔card, not 1:N booking↔hunter↔card

**How to avoid:**
1. **`safari_hunters` table is the financial source of truth, not `safaris`.** Per-hunter row tracks: contracted amount, deposit paid, balance owed, payment_token_id, payment status, lifecycle status (committed/cancelled/no_show/completed). `safaris.estimated_total_zar` is a derived sum.
2. **Cancellation rule explicit per hunter:** when a hunter cancels, the OTHER hunters' rates are NOT auto-adjusted. Daily rate is locked at booking time per `safari_hunters.locked_rate_zar`. If outfitter wants to re-split among remaining, that's a manual rate-adjustment workflow with explicit re-consent from each remaining hunter.
3. **Booker vs hunter separation:** `safaris.booker_user_id` (CRM/comms) is distinct from `safari_hunters.hunter_email`/`hunter_phone`. Each hunter receives their OWN booking confirmation, payment link, waiver signing flow, post-trip survey. WhatsApp messaging supports both booker (overall) and per-hunter (personal).
4. **Pre-arrival payment gate:** safari status can NOT advance to `in_progress` if any `safari_hunters.balance_paid = false`. PH-facing UI: "1 of 4 hunters has unpaid balance — block start?" with override that requires owner approval (uses approval spine).
5. **Trophy fee allocation:** when a trophy is logged, `trophies.hunter_id` (FK to `safari_hunters`, NOT `clients`) determines whose account is billed. Default to whoever is logged in as PH; require explicit hunter selection in UI.
6. **Refund flow reckons each token separately:** UI shows "4 hunters to refund: A (PayFast R10k), B (PayFast R10k), C (PayFast R10k — token EXPIRED, manual EFT required), D (PayFast R10k)". Each row processed independently with audit trail.
7. **Currency reconciliation:** stored at booking time per hunter: `safari_hunters.charge_currency_iso = 'ZAR'` (always — PayFast charges in ZAR), `safari_hunters.quoted_amount_usd` (display only). Refunds in ZAR at original conversion rate, with currency-loss explicitly visible in line items (no surprise).
8. **Idempotency keys per charge:** every per-hunter PayFast call carries `idempotency_key = hash(hunter_id + booking_id + charge_type + amount_cents)` — retries don't double-charge.

**Warning signs:**
- `safari_hunters.balance_paid = false` AND `safaris.status = 'in_progress'` (gate failed)
- Trophy fee in `trophies.hunter_id IS NULL` (allocation forgot to ask)
- Refund queue has rows where stored token returns "expired" from PayFast lookup
- Customer support: "I'm being chased for money I don't owe" (booker thinks they paid for everyone)
- Currency drift: `safari_hunters.quoted_usd × snapshot_rate ≠ charge_zar` by >2%

**Phase to address:**
**Phase 15 (multi-hunter split-billing)** — the schema decision (`safari_hunters` as financial truth, not `safaris`) is non-negotiable on the first plan of the phase. Per-hunter token model, cancellation lock, pre-arrival gate, refund per-token UI all in this phase.

**Recovery cost:** HIGH per incident (manual reconciliation per safari with affected hunters). CATASTROPHIC if dispute makes it to PayFast acquirer escalation OR a hunter sues for unauthorised charges.

---

### Pitfall 5: Cross-product stay-link FK breaks on cascade delete

**Severity:** HIGH

**Category:** Cross-product stay link

**What goes wrong:**
Phase 15 introduces `safaris.accommodation_booking_id UUID REFERENCES bookings(id)` so a Trophy OS hunt can be linked to a DraggonnB Accommodation stay (single billing root, unified guest experience, accommodation-on-the-farm pattern). Failure modes:
- **Orphan stay charge:** Trophy safari is cancelled (status → `cancelled`). Cascade rule isn't defined → linked DraggonnB booking remains active → guest invoiced for accommodation they're no longer attending. Or inverse: accommodation booking cancelled, hunt remains "confirmed" with a now-unavailable accommodation reference.
- **Date desync:** Hunt date changes (rebooked Mar 15→22). Linked stay date NOT updated (forgotten in handler, or no-handler-exists). Guest arrives Mar 22 to find the lodge expected them Mar 15 (accommodation marked `no_show`).
- **Cross-schema FK violation:** Trophy uses `orgs(id)`. DraggonnB uses `organizations(id)`. Both are in same Supabase project. Foreign key from `safaris.accommodation_booking_id` to `bookings(id)` is fine — but DraggonnB booking's `organization_id` may differ from Trophy safari's `org_id`. If the cascade of org-level data deletion fires (e.g. tenant offboards from DraggonnB but Trophy stays active), `bookings` rows are deleted, leaving `safaris.accommodation_booking_id` pointing at deleted PK. Postgres FK with `ON DELETE NO ACTION` will block the delete; with `CASCADE` will silently delete safaris.
- **RLS leak on stay link:** Trophy OS PH queries `safaris` and joins `bookings` via FK. The `bookings` row has accommodation-side data the PH should NOT see (other guests' info, finance data, room rates, owner notes). Trophy RLS allows safari read; bookings RLS allows org-member read; but the join doesn't enforce "this PH is also a member of the accommodation org."
- **"Single billing root":** marketing claim says "one PayFast charge for hunt + stay." But hunt has per-hunter tokens (Pitfall 4) and stay has its own token. "Single root" requires picking one token and ad-hoc charging twice (once for hunt, once for stay) under that token. Refund logic gets confusing across two products' ledgers.

**Why it happens:**
- Cross-schema FK is rare in single-Supabase-project setups; most teams keep schemas isolated
- Bidirectional event handlers (status change in one product → mirror in other) are easy to forget for the inverse direction
- RLS policies are written per-table; cross-table joins via FK are easy to miss in policy review
- "Single billing root" is a UX promise that doesn't map cleanly to two independent token registries

**How to avoid:**
1. **No cross-product FK with CASCADE.** `safaris.accommodation_booking_id` is `ON DELETE SET NULL`, NEVER CASCADE. When a DraggonnB booking is deleted, the safari survives with the link nullified + an event fired ("Linked accommodation booking was deleted; safari now standalone — review.")
2. **Bidirectional status-sync handlers ship together:** when implementing safari → booking status mirror, the inverse must also exist. Integration test: cancel safari → verify linked booking → cancelled. Cancel booking → verify linked safari status → flagged for review (NOT auto-cancelled — that's a business decision, but flagged with operator alert).
3. **Date change requires explicit cross-product confirmation:** UI: "You changed the safari to Mar 22-25. Linked accommodation booking is Mar 15-18. Update accommodation? [auto-update / contact lodge separately / ignore]". Default = "contact lodge separately" (safer).
4. **Cross-product RLS join check:** an RLS policy on `bookings` that allows access via safari linkage requires the user to be a member of BOTH the Trophy safari's `org_id` AND the DraggonnB booking's `organization_id`. If memberships don't overlap, the join row is invisible.
5. **"Single billing root" is honest UX:** marketing copy says "Pay once for hunt, once for stay — both via the same card." NOT "single charge for everything." Two PayFast operations, one stored card; receipts are separate.
6. **Reconciliation cron checks linkage health:** weekly, scan `safaris WHERE accommodation_booking_id IS NOT NULL` and verify the referenced booking still exists, dates still align (within tolerance), and safari org has membership overlap with booking org. Mismatches → operator alert.

**Warning signs:**
- `safaris.accommodation_booking_id IS NOT NULL` but `bookings.id` lookup returns null (orphan)
- Date diff > 7 days between safari and linked booking arrival
- PH queries `safaris` with join and gets booking data from a different lodge org
- Customer: "I changed my hunt date. Why does the lodge still expect me last week?"

**Phase to address:**
**Phase 15** — the cross-product FK rules + bidirectional handlers + RLS join policy are non-negotiable on the first cross-link plan. Reconciliation cron added in **Phase 16** (with BILL-08 carry-forward).

**Recovery cost:** MEDIUM to HIGH — depends on whether financial mismatch reaches a guest. If guest is billed for an unattended stay, refund + apology + manual reconciliation. If date desync leads to "lodge had no room because we marked you no-show," brand damage in pilot with Swazulu.

---

### Pitfall 6: Telegram approval bot replays charge based on resent message

**Severity:** HIGH (CATASTROPHIC if exploited maliciously)

**Category:** Approval spine / Telegram

**What goes wrong:**
Approval spine sends Telegram message: "Damage charge R450 — Approve / Decline" with inline keyboard. Owner taps Approve. Telegram fires `callback_query` to webhook. App processes, charges card. Done. Failure modes:
- **Double-tap / network retry:** Telegram retries unsuccessful callback delivery; if app slow, two `callback_query` updates with same `update_id` arrive. Without idempotency, both fire charge — guest billed twice.
- **Forwarded message:** Owner forwards the Telegram message to their accountant for advice. Accountant taps the same Approve button. Telegram routes the callback under accountant's user_id, not owner's. Without strict approver verification, charge fires from wrong user.
- **Channel impersonation:** A staff member with access to the ops Telegram chat (where bot announces approvals) sees the inline keyboard, taps Approve themselves, charge fires. They had READ access but no APPROVAL right.
- **Old approval replayed:** Approval was issued Tuesday with 2-hour expiry. Owner ignored. Friday they scroll back, tap Approve. App's webhook handler doesn't check expiry — fires charge against now-stale context.
- **Bot impersonation:** Someone DMs the ops bot directly with `/approve approval_id_X` — bot processes if it doesn't verify the user is the assigned approver.
- **Webhook secret missing:** Telegram webhook configured without `secret_token` (per Telegram official docs, this is the auth mechanism). Anyone who knows webhook URL can POST fake updates to it.

**Why it happens:**
- Telegram callback_query semantics aren't widely understood: per Telegram docs, replays during retry are normal and `update_id` MUST be used for idempotency
- "User who tapped" feels like authorisation; actually it's just "user whose Telegram account interacted with the message" — distinct from "user who is authorised to approve"
- Forwarding is a Telegram feature; the original inline keyboard works after forward (callbacks attach to the message, not the chat)
- Webhook secrets are optional and frequently forgotten

**How to avoid:**
1. **Idempotency on `update_id`:** every Telegram update writes to a `telegram_update_log` table with PK = `update_id`. Duplicate insert = no-op. Guarantees one charge per genuine approval click.
2. **Approver verification, not button-press verification:** when callback fires, look up `approval_requests.assigned_approver_user_id`. Map Telegram user_id (from callback `from.id`) to platform user via `telegram_user_links` table. Reject if no match OR if mapped user ≠ assigned approver.
3. **Expiry enforcement:** `approval_requests.expires_at` checked on every callback. Stale = "This approval expired at 14:32. Please request a new approval." Bot edits the inline keyboard to disable buttons + appends expiry status.
4. **Inline keyboard self-disables on first valid click:** bot edits the message immediately when callback received (before processing) to remove the keyboard or replace with "Processing..." This prevents accidental double-tap UI race.
5. **No DM-driven approvals.** Bot ignores `/approve` commands. The only approval mechanism is the inline keyboard from the original message. Reduces command-injection surface.
6. **Ops Telegram channel != approval channel:** approvals are sent to a 1-on-1 DM with the assigned approver, NOT to the team ops channel. Channel impersonation no longer possible because nobody else sees the approval message.
7. **`secret_token` is mandatory:** webhook config requires `TELEGRAM_WEBHOOK_SECRET_TOKEN` env var; webhook handler rejects requests missing `X-Telegram-Bot-Api-Secret-Token` header or with mismatching value.
8. **IP allow-list at edge:** Telegram callbacks come from documented Telegram CIDR ranges; Vercel edge middleware allows only those source IPs for the webhook route.
9. **Audit trail on every approval:** `approval_audit_log` row per callback: approver_user_id, approval_id, action (approve/decline), telegram_user_id, request_ip, user_agent, decision_at_ms. Forensic readable.

**Warning signs:**
- Same approval_id processed twice within seconds (idempotency failure)
- `approval_audit_log` rows where `telegram_user_id` doesn't map to `approval_requests.assigned_approver_user_id`
- Charges fired against approvals where `now() > expires_at`
- Telegram callback POSTs without `X-Telegram-Bot-Api-Secret-Token` header
- Approver complains "I never tapped Approve" but log shows their telegram user_id

**Phase to address:**
**Phase 14 (approval spine)** — idempotency + approver verification + secret_token + expiry enforcement are table stakes on the first approval plan. No approval routes a real charge without all of these.

**Recovery cost:** HIGH — financial liability per incident. Disputed double-charge is recoverable (refund). Forwarded-message exploit is hard to detect after the fact and may require retroactive review of all approval audit logs.

---

### Pitfall 7: PWA service worker serves stale booking data after change

**Severity:** HIGH

**Category:** PWA guest surface

**What goes wrong:**
Phase 16 ships PWA at `stay.draggonnb.co.za/{booking-id}` for guest experience. Failure modes:
- **Stale check-in details:** Guest installs PWA on Day -7. Lodge changes check-in time from 14:00 to 16:00 on Day -2. Guest opens PWA Day 0 — service worker serves cached page from Day -7 with old check-in time. Guest arrives 14:00; lodge isn't ready.
- **Stale damage receipt:** Damage charge fires; guest opens PWA to dispute; cached PWA shows "no charges" because cache hasn't refreshed.
- **Offline form sync conflict:** Guest fills out post-stay survey offline. Same survey edited by lodge support staff online (data correction). When guest reconnects, their offline submission overwrites staff edits (last-write-wins) without conflict signaling.
- **Update notification missing:** PWA never tells the guest "newer version available" — they're stuck on the build from when they first installed.
- **Cached auth token invalid:** Token expired during offline period; PWA returns cached "you're logged in" state but every API call 401s. Confusing UX (no offline indicator).
- **iOS PWA limitations:** push notifications require iOS 16.4+; older iPhones get no proactive comms. No offline indicator. Add-to-home-screen prompt buggy on iOS.

**Why it happens:**
- Default service worker strategies (cache-first, stale-while-revalidate) prioritize speed/offline over freshness
- Booking data is dynamic but PWA caching treats it as static
- Last-write-wins is the path of least resistance for offline-edit reconciliation; rarely the right answer for shared data
- iOS Safari has been the lagging PWA platform for years; assumptions from Android testing don't translate
- Per LogRocket/next-pwa research: `stale-while-revalidate` is "a problem" for SSR pages — known issue

**How to avoid:**
1. **Caching strategy by route class:**
   - Static shell (HTML, CSS, fonts, icons): `cache-first` — fine to be stale (just UI chrome)
   - Booking data API (`/api/booking/{id}`): `network-first` with 3s timeout fallback to cache + visible "showing offline data, may be stale" banner
   - Damage/financial data: `network-only` — never cached, never offline (showing "you're offline, please reconnect to view charges")
   - Form submissions: queued in IndexedDB with explicit "sent / pending / failed" status surfaced in UI
2. **Versioned cache key:** every deploy bumps `CACHE_VERSION` (from `process.env.NEXT_PUBLIC_BUILD_ID`); old cache versions are deleted on activate. Prevents permanent staleness from old SW.
3. **"Update available" banner:** SW emits message to clients on activate; PWA shows "New version available — refresh? [Refresh]" toast.
4. **Offline form conflict signaling:** when guest submits form while offline, store with `client_timestamp + offline_submission_id`. On sync, server checks if record was modified since `client_timestamp`. If yes, return 409 with the server's version → PWA shows "Lodge edited this form while you were offline. Use yours / use theirs / merge"
5. **Auth-token validity check before render:** PWA boot pings `/api/auth/me` (network-first 1s timeout); if 401 OR no network → redirect to "you're offline / re-login required" splash. Never render cached "logged in" UI without recent verification.
6. **iOS-aware PWA UX:** detect Safari + iOS < 16.4; suppress push notification opt-in prompt; show banner "for full experience, install on Android or use latest iOS." Email/SMS fallback for time-sensitive comms.
7. **No service worker on financial pages.** `/booking/{id}/charges` route opts out of SW (registered exclusion); always network-fetched.
8. **Token-protected URLs are unguessable.** Booking URL is NOT `/{booking-id}` (UUIDs are guessable for sequential-feeling IDs). Use a per-booking signed token (`bookings.guest_access_token`, 32-byte random, indexed) → URL is `/stay/{access_token}`. Token regenerable on demand. Rate-limit the route at edge: 60 req / 5 min / IP.

**Warning signs:**
- PWA users reporting "old data" — especially after lodge updates
- Form submissions arriving with `client_timestamp` >24h before server receipt
- 401s on cached PWA pages (auth expired, never refreshed)
- iOS users disproportionately reporting "didn't get notification"
- SW version log shows stuck on old hash for many users
- `bookings.guest_access_token` accessed at rate >10/min/IP (probable enumeration)

**Phase to address:**
**Phase 16 (PWA guest surface)** — caching strategy decision tree + token-protected URL pattern + iOS detection + form sync conflict UX are first-plan requirements. NOT bolt-on after launch.

**Recovery cost:** MEDIUM — guest-facing bugs are individually fixable but compound across the pilot. Brand damage if Swazulu's pilot guests see stale data.

---

### Pitfall 8: Trophy OS PayFast trial-expiry math wrong (UTC vs SAST)

**Severity:** HIGH

**Category:** Trophy OS PayFast wiring

**What goes wrong:**
Trophy OS schema (`orgs.trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days')`) starts trial at signup. Trophy OS billing goes live in Phase 16. Failure modes:
- **Trial expires 2 hours early for SA users:** signup at 23:00 SAST creates `trial_ends_at` in UTC (= 21:00 UTC + 14 days = day 14 at 21:00 UTC = day 14 at 23:00 SAST). User assumes they have until end of day SAST day 14. Code checks `now() > trial_ends_at` and locks them out at 23:00 SAST day 14. They've effectively had 13.95 days, not 14.
- **Failed-payment retry storm:** PayFast first charge fails. Code retries every 60s. Card was declined by issuer (insufficient funds, valid for 24h). 1,440 retries per day = thousands of failed-charge ITN events. PayFast may rate-limit or flag the account.
- **Subscription cancelled but data still accessible:** user cancels via PayFast dashboard; ITN webhook sets `subscription_status = 'cancelled'`. But Trophy OS RLS doesn't enforce read-only mode based on this flag. User keeps creating safaris/trophies. Owner thinks they cancelled.
- **Mid-cycle downgrade cuts feature mid-action:** user downgrades from Pro to Starter while editing a safari that uses Pro-only "supplier network" feature. Save fails mid-form. Data lost.
- **Cross-product billing collision:** user pays for DraggonnB OS R599 Core + Trophy OS R599 Starter. They share a card (one PayFast tokenization). DraggonnB charge fires, depletes available card balance, Trophy charge fails (insufficient funds). Trophy locks user out despite DraggonnB being healthy. User confused: "I just paid you R599?"

**Why it happens:**
- TIMESTAMPTZ is correct DB type but app code that calculates "is trial expired" rarely uses tenant timezone
- Failed-payment retry default in PayFast subscription docs is reasonable; ad-hoc retries are app responsibility and easily over-aggressive
- Subscription status enforcement requires RLS update — easy to forget
- Tier downgrade timing is often instant on payment success; mid-action UX not designed
- Cross-product billing share-of-wallet effects: each product treats the other as external

**How to avoid:**
1. **Trial expiry uses tenant TZ + grace:** `trial_ends_at` stored in UTC (correct). App-side check: `is_in_trial = (now() AT TIME ZONE org.timezone) <= (trial_ends_at AT TIME ZONE org.timezone) + INTERVAL '4 hours'`. The 4-hour grace covers DST + late-night signup ambiguity. Org timezone defaults to `Africa/Johannesburg`.
2. **Send trial reminder emails / WhatsApp at day 10, 12, 13** — already specified in Trophy OS CLAUDE.md. Verify these fire (cron + N8N workflow + dead-letter on send failure).
3. **Failed-payment retry policy:** max 3 retries, exponential backoff (1h, 6h, 24h). After 3 failures: `subscription_status = 'past_due'`, in-app banner asks user to update card, no further auto-retries. Manual retry via UI button only.
4. **Read-only enforcement on cancelled/past_due:** new RLS policy on Trophy OS tables: `INSERT/UPDATE only if (SELECT subscription_status FROM orgs WHERE id = current_org_id()) IN ('trial', 'active')`. Reads remain open (so user can export their data). Test with cancelled-state seed user.
5. **Tier downgrade is end-of-cycle, not instant:** when user downgrades, change applies at `current_period_end`. Until then, Pro features remain. UI banner: "You'll move to Starter on Apr 30. Pro features available until then."
6. **Cross-product billing isolation:** DraggonnB and Trophy each have their own PayFast subscription. Failure of one doesn't lock the other. UX shows both subscription statuses on a unified billing page (federation work) so user understands "DraggonnB: paid until Jun 1 / Trophy: card declined Apr 28 — update?"
7. **Insufficient-funds messaging:** PayFast returns specific decline codes. Map them to user-actionable messages: "card declined: insufficient funds / try a different card / contact bank."

**Warning signs:**
- `subscription_status = 'cancelled' OR 'past_due'` org has `trophies/safaris` rows created after status change
- PayFast ITN log shows >3 failed charges to same merchant_payment_id
- Support: "you charged me twice / my card was declined 50 times"
- Trial-expiry events clustering at 22:00-00:00 SAST (signup-time anomaly)

**Phase to address:**
**Phase 16 (Trophy OS PayFast wiring)** — billing math + RLS read-only + retry policy + cross-product unification UX in this phase. Reuse v3.0 PayFast lessons (snapshot column pattern from Pitfall 1 of v3.0 archive applies to Trophy too).

**Recovery cost:** MEDIUM — refund + manual reconciliation per affected user. HIGH if Swazulu pilot is the affected user.

---

## High Pitfalls

### Pitfall 9: Shared lib between two Next.js codebases drifts or breaks Vercel build

**Severity:** HIGH

**Category:** Code sharing / Federation infrastructure

**What goes wrong:**
v3.1 needs shared types/util between DraggonnB (`/draggonnb-platform`) and Trophy OS (`/trophy-os`) — at minimum: `lib/auth/federation-bridge.ts` (token signing/verification), `types/approval.ts` (approval_request shape), `lib/payments/payfast-token.ts` (token charge logic), `types/cross-product.ts` (safari↔booking link types). Three approaches, all have failure modes:
- **Approach A (symlink):** symlink `/trophy-os/src/lib/shared` → `/draggonnb-platform/lib/shared`. Vercel build clones the trophy-os repo only — symlink target is missing — build fails with "module not found." Or symlink resolves but only contains old version (stale checkout).
- **Approach B (npm workspace / monorepo):** convert to monorepo with `pnpm workspaces`. Vercel monorepo support exists but is touchy; both products use Next.js 14, and switching from "two repos" to "one monorepo" is a major restructure mid-milestone. Risk: deploy CI breaks both products.
- **Approach C (publish private package):** `@draggonnb/federation-shared` to GitHub Packages. Versioning discipline required; bump on every change; both products lock to specific versions. Friction on every shared-code edit (PR → publish → bump → deploy).
- **Approach D (copy-paste):** shared logic duplicated in both repos. Drift is GUARANTEED over 60 days. Bug fix in DraggonnB doesn't reach Trophy.

**Why it happens:**
- "Just symlink it" feels easy locally; Vercel build environment doesn't have the other repo
- Monorepo migration is high-risk mid-milestone
- Private package publishing is correct but adds 15-30 min friction per change
- Copy-paste is the path of least resistance and the worst long-term outcome

**How to avoid:**
1. **Choose Approach C (private package) with discipline.** Create `@draggonnb/federation-shared` as a separate small repo: `git@github.com:DRAGGONNB/federation-shared`. Publish to GitHub Packages (or npm private registry). Both products depend on it via `package.json` with exact version pinning (`"@draggonnb/federation-shared": "1.2.3"` not `^1.2.3` — federation contract changes are deliberate).
2. **Federation-shared package contents are minimal:** types only (no runtime), or tiny zero-dep utilities. Hard cap: 200 LOC. If it grows, that's a signal something is wrongly placed in shared.
3. **Versioning rule:** semver strict. Breaking change to bridge token format = major bump = both products updated in same week. Minor bump = forward-compat additions only.
4. **CI gate:** federation-shared repo's CI publishes only after tests pass + a downstream "smoke test" that pulls latest into both DraggonnB and Trophy OS test branches and runs build.
5. **NEVER use symlinks for cross-repo sharing.** If absolutely needed for local dev, use `npm link` (not filesystem symlink), and document that Vercel uses the published version.
6. **NEVER copy-paste federation logic** between repos. CI lint (post-publish) checks for known function signatures duplicated between repos and fails the build.

**Warning signs:**
- Vercel build fails with "Cannot find module '@/lib/shared/...'" (symlink target missing)
- Behaviour differs between DraggonnB and Trophy for same federation token (drift between copies)
- federation-shared package version > 6 months old in one product
- Same bug fixed twice in two repos (= they should have been one fix)

**Phase to address:**
**Phase 13 (cross-product foundation)** — first plan establishes federation-shared package, publishing pipeline, version pinning. NOT optional. Without this, every later phase suffers drift.

**Recovery cost:** MEDIUM — refactoring to consolidate drift takes 1-2 days. HIGH if a federation-bug-from-drift causes a security issue (invalid token accepted).

---

### Pitfall 10: Approval expiry race — owner approves seconds after window closes

**Severity:** HIGH

**Category:** Approval spine

**What goes wrong:**
Approval has `expires_at = now() + 2 hours`. Owner taps Approve at `expires_at + 3 seconds`. Two race outcomes:
- App processes the click (expiry check happens after charge fires) → charge succeeds despite expired approval. Audit log shows "approved 3s past expiry."
- App rejects the click → owner sees "approval expired" → re-requests → approval fires anyway because owner is annoyed → more clicks → confusion.

A second variant: owner taps approve, charge processes successfully, BUT before the success response gets back to Telegram, the expiry cron fires and marks the approval `expired`. Now `approval_requests.status = 'expired'` AND `approval_charges.status = 'completed'` — inconsistent.

**Why it happens:**
- `expires_at` enforcement happens at multiple points (when sending Telegram message, when receiving callback, when firing charge); inconsistencies inevitable
- Cron-based expiry sweep races with active processing
- Distributed system without transactional boundary across the full approval lifecycle

**How to avoid:**
1. **Single source of truth: DB stored procedure.** `approve_request_atomic(approval_id, approver_user_id, decision)` in Postgres locks the row, checks expiry, updates status, returns success/expired/already_processed. App reads result, decides next step.
2. **Grace window:** approval is valid for `expires_at + 30 seconds` to absorb network latency. After that hard cutoff.
3. **Cron sweep doesn't change in-flight rows:** `UPDATE approval_requests SET status = 'expired' WHERE expires_at < now() - INTERVAL '60 seconds' AND status = 'pending'`. Active processing always wins.
4. **Single status field:** `approval_requests.status ENUM('pending', 'approved', 'declined', 'expired')`. Charge status mirrors but in `approval_charges.status`. Reconciliation cron warns if `(status='expired' AND charge_completed) OR (status='approved' AND charge NULL)`.
5. **Idempotent UI feedback:** owner taps Approve twice (once before expiry, once after). First click → DB returns success. Second click → DB returns already_processed. Both UI states show "approved at 14:32" — no contradictory messages.

**Warning signs:**
- `approval_requests.status = 'expired'` rows that have related `approval_charges` rows (data inconsistency)
- Owner complaints: "I approved it but it says it's expired"
- Reconciliation cron flags >1% of approvals with status mismatch

**Phase to address:**
**Phase 14 (approval spine)** — atomic stored proc + status reconciliation cron in first plans.

**Recovery cost:** LOW per incident; MEDIUM if pattern affects multiple approvals (owner trust damage).

---

### Pitfall 11: Subdomain sub-tenant confusion — acme.draggonnb.co.za user gains Trophy access

**Severity:** HIGH

**Category:** SSO / Federation

**What goes wrong:**
Federation logic says: "if user has DraggonnB access, they can SSO into Trophy." Specific scenario:
- User Alice has `organization_users` row for `acme` tenant on DraggonnB.
- Federation bridge sees Alice authenticated, issues token to Trophy.
- Trophy's `org_members` table has no row for Alice in any farm.
- Naive Trophy implementation: "no member row? Create one with default farm" — Alice now has access to whichever farm the default mapping picked, possibly Swazulu's farm (because Swazulu is the pilot and seeded as default).
- Reverse: Trophy `outfitter` for Farm X gets DraggonnB access to "default" tenant (which may be a different real client).

**Why it happens:**
- "Default" mappings are tempting for first-time experience ("don't make user pick — just send them somewhere")
- Federation token doesn't carry intended_tenant explicitly
- Cross-product onboarding feels janky if "no membership" = "redirect to invite page"; teams build "auto-create" instead

**How to avoid:**
1. **Federation token carries explicit `intended_tenant_id`** (specific tenant the user is trying to access) and `origin_tenant_id` (tenant they came from). Both checked at receiver.
2. **No auto-create cross-product memberships ever.** If federation token references a tenant the user has no membership in, response is "Invite required: [request access from owner]". Polite, explicit, no implicit grant.
3. **"Default tenant" is per-user, not platform-wide.** `users.default_draggonnb_tenant_id` and `users.default_trophy_tenant_id` set on first explicit access; never auto-populated from another product.
4. **Reverse-direction bridge same rules:** Trophy → DraggonnB also requires explicit membership; no auto-grant from Trophy role to DraggonnB role.
5. **Audit cron:** daily, scan for `organization_users` or `org_members` rows created within the last 24h that came from a federation context — verify each was preceded by a valid invite. Flag exceptions.

**Warning signs:**
- New `organization_users` rows correlated with federation token issuance (without preceding invite event)
- User accesses tenant they have no logged invite for
- Customer: "Why am I seeing this farm? I work for a different lodge."

**Phase to address:**
**Phase 13** alongside Pitfall 1 (cookie scope) and Pitfall 2 (role mapping). Same architecture conversation.

**Recovery cost:** HIGH — POPI implications if cross-tenant data exposure occurred.

---

### Pitfall 12: PWA token leak via guessable booking URL or rate-limit miss

**Severity:** HIGH

**Category:** PWA guest surface

**What goes wrong:**
PWA booking URL like `stay.draggonnb.co.za/{booking-id}`. UUID v4 is unguessable, but:
- If `booking-id` is sequential or short-id (e.g., `BK-2026-001`), enumeration attack works
- Even with UUID: link shared in WhatsApp group, forwarded, ends up on someone else's phone — they see booking details
- No rate limiting → enumeration/brute-force IP attack possible
- Booking info includes guest name, dates, lodge, phone, payment status (PII per POPI)

**Why it happens:**
- Booking IDs are often human-readable for support purposes
- PWA "magic link" mental model assumes link = consent to share
- Rate limiting at app level often forgotten when SW caches successful 200s

**How to avoid:**
1. **Unguessable token, NOT booking ID:** `bookings.guest_access_token` = 32-byte random base64url. URL is `stay.draggonnb.co.za/{access_token}`. Token regenerable on demand (e.g., guest reports phone lost → owner regenerates → old link dies).
2. **Token-rate-limit at edge:** Vercel middleware or upstream rate limiter: 60 requests / 5 min / IP. After threshold: return 429 + alert.
3. **Token expires after stay + 30 days.** After expiry, link returns "this access has expired, contact lodge."
4. **POPI footer on every PWA page:** "This page may contain personal information. Don't share this link."
5. **Audit log on every token access:** `pwa_access_log` rows with token_id, IP, user_agent, accessed_at. Cron flags unusual patterns (same token from 5 different countries within 24h).

**Warning signs:**
- 429 responses on `/stay/*` routes
- Same token accessed >50 times (likely enumeration / scraping)
- Token accessed from country mismatch with guest origin

**Phase to address:**
**Phase 16** — token + rate limit + audit in PWA's first plan.

**Recovery cost:** MEDIUM — token regeneration; POPI complaint risk; brand damage.

---

### Pitfall 13: Currency display ambiguity (R10.50 reads as $10.50 to international guests)

**Severity:** HIGH (legally exposed under SA Consumer Protection Act §44)

**Category:** Damage auto-billing / International guests

**What goes wrong:**
SA Rand symbol "R" appears next to "10.50" on a damage charge notification. International guest from US/UK reads as "$10.50" (low) or "£10.50" — comprehension off by an order of magnitude. Hunter from US is charged R10,500 for damages (~$575); reads "10,500" without currency context, thinks it's $10,500, panics, disputes.

A second variant: "10,50 R" with comma decimal (en-ZA locale standard) reads to US user as "ten thousand fifty rand" — order-of-magnitude error.

**Why it happens:**
- SA convention is "R" prefix; international users default to "$"
- en-ZA decimal is comma; en-US is period
- Damage notifications travel through WhatsApp where rendering is locale-of-receiver, not locale-of-sender

**How to avoid:**
1. **Always render currency with ISO code:** "R10,500.00 (ZAR 10500.00 ≈ USD 575)" in every guest-facing damage notification, invoice, PWA charge view.
2. **Inline conversion:** when known, append "≈ USD X / EUR Y" using stored exchange rate snapshot at time of charge.
3. **Prominent ZAR label on all financial UI:** "R10,500.00 ZAR" not just "R10,500".
4. **Confirmation step before charge:** WhatsApp/PWA pre-charge message: "We're about to charge ZAR 10,500.00 (approximately USD 575). Tap to authorize, or dispute within 24h."
5. **Multi-locale formatter:** `formatCurrency(amount_cents, 'ZAR', userLocale)` returns formatting appropriate to user's locale but NEVER drops the ZAR designation.

**Warning signs:**
- Disputes citing "I thought this was dollars"
- International guests query currency in support
- Mismatch between reported expectation and actual ZAR amount

**Phase to address:**
**Phase 15 (damage auto-billing)** — currency rendering rules in first plan; applies to all guest-facing financial UI.

**Recovery cost:** MEDIUM per incident; HIGH if multiple international guests dispute.

---

### Pitfall 14: Reconciliation cron BILL-08 surfaces v3.0 drift, requires v3.0 hotfix mid-milestone

**Severity:** MEDIUM (HIGH if it derails Phase 16 timeline)

**Category:** v3.0 carry-forward

**What goes wrong:**
Phase 16 finally ships BILL-08 reconciliation cron (carry-forward from v3.0 Phase 12 backlog). It compares DB-expected charges vs PayFast-actual. First run finds drift in 3 production orgs. Investigation reveals the drift is from v3.0 itself — pricing migration in Phase 09 missed an edge case OR an org was provisioned before snapshot column existed (8 existing orgs were classified test/dormant/paying; one classification was wrong). Now v3.1 work is paused while you hot-fix v3.0 billing.

Mitigation cost: 1-3 days of v3.0 forensics + Supabase data correction + customer outreach mid-v3.1.

**Why it happens:**
- Reconciliation crons are diagnostic; they surface latent drift, not introduce it
- v3.0 launched without BILL-08 (deferred); the drift has been silent for ~30+ days
- Pilot with Swazulu means BILL-08 exposure is now urgent (real money flow)

**How to avoid:**
1. **Run BILL-08 in DRY-RUN mode first (Phase 16 plan 1):** scan all orgs, log drift, no notifications, no auto-corrections. Spend a week reviewing findings before flipping to active mode.
2. **Pre-Phase 16 audit task:** before Phase 16 starts, manually run a one-off reconciliation script against 8 known orgs (audit + test orgs from v3.0). Resolve discovered drift BEFORE cron goes active. This prevents Phase 16 stalling.
3. **Drift triage flow:** BILL-08 alerts go to ops_manager Telegram, NOT to customer comms. Triage decides per-org: real charge issue (refund), classification issue (data correction), edge case (document + ignore).
4. **Don't block Phase 16 deploy on BILL-08 cleanup:** ship reconciliation in shadow mode; clean up findings in parallel. Phase 16 success doesn't depend on zero drift.
5. **Hardening cron:** BILL-08 is read-only first 30 days. Mutations only after manual review confirms it's not over-flagging.

**Warning signs:**
- BILL-08 first run flags >5% of orgs
- Drift concentrated in orgs that signed up in specific date range (= v3.0 deploy window pinpoint)
- ITN webhook log discrepancies pre-v3.1

**Phase to address:**
**Phase 16** — first plan is BILL-08 dry-run setup. Allow 3 days buffer for v3.0 cleanup IF surfaced.

**Recovery cost:** MEDIUM — if drift is structural (e.g., snapshot missing), code + data hotfix. HIGH if customer facing surfaces "we charged you wrong."

---

### Pitfall 15: 12-07 push triggers Vercel deploy that breaks federation work

**Severity:** MEDIUM (HIGH if mid-investor-demo)

**Category:** v3.0 carry-forward

**What goes wrong:**
12-07 (smart-landing dashboard) was committed at `bedaff0e` but never pushed. v3.1 picks up the carry-forward, pushes, Vercel auto-deploys. The smart-landing dashboard rebuild may:
- Conflict with federation cross-product nav added in Phase 13 (sidebar already redesigned in 12-06)
- Use a DB column added in v3.1 migrations that doesn't exist in `bedaff0e`'s tree
- Break a test that v3.1 work depends on
- Surface UI bugs noticed during investor demo

**Why it happens:**
- Stale commits from previous milestone may not align with current state
- Auto-deploy on push is high-velocity but bites when commits are old
- Investor demos happen on the live deploy

**How to avoid:**
1. **Rebase 12-07 onto current main BEFORE pushing.** If conflicts, prefer current main; redo 12-07 work on top.
2. **Local smoke test against current DB schema:** verify 12-07 still builds + runs against current `psqfgzbjbgqrmjskdavs` schema (which has additions since `bedaff0e`).
3. **Push to a preview branch first.** Vercel preview deploy → Chris validates → merge to main only after.
4. **Deploy windows:** never push 12-07 within 4 hours of a planned investor demo. Code-freeze rule for milestone.
5. **Roll-back plan:** if push breaks something, revert is `git revert bedaff0e` + Vercel redeploys cleanly.

**Warning signs:**
- 12-07 build fails locally
- Tests added in v3.0 phase 11 fail against 12-07 changes
- TypeScript errors when 12-07 is rebased onto main

**Phase to address:**
**Phase 16 (carry-forward)** — push 12-07 is plan 16-N (last, after v3.1 federation stable). Treat as moderate-risk deploy.

**Recovery cost:** LOW (revert) to MEDIUM (forensics + new fix).

---

### Pitfall 16: 360px mobile sweep finds critical bug late in milestone, derails federation

**Severity:** MEDIUM

**Category:** v3.0 carry-forward

**What goes wrong:**
Phase 16 includes carry-forward 360px mobile sweep. Sweep finds a critical UX bug (e.g., booking flow unusable on mobile, payment UI breaks). Fix is non-trivial. Milestone budget already consumed by federation work. Decision: ship federation incomplete to fix mobile, OR ship federation polished but with known mobile bug.

**Why it happens:**
- Mobile sweep is end-of-pipeline; bugs found late
- v3.0 launched without thorough mobile audit (deferred)
- SA SME market is mobile-first (per v3.0 PITFALL-20); breaks here = real pilot impact

**How to avoid:**
1. **Pre-Phase 16 lightweight mobile sweep:** before Phase 16 starts, run BrowserStack or local 360px-emulator on TOP 5 user-facing pages (login, booking flow, payment, dashboard, PWA). Catch obvious breakage before milestone budget is consumed.
2. **Mobile budget capped:** if sweep finds >3 critical bugs, defer non-critical to v3.2. Don't blow Phase 16 on mobile polish.
3. **Federation work is mobile-tested as it's built.** New cross-product nav, approval Telegram-tap UX, PWA — all built mobile-first. Doesn't depend on the sweep finding catastrophic issues.
4. **Carry-forward sweep is enhancement, not regression-fix:** scope is "make existing OK pages excellent on mobile." If it discovers regression-class bugs, those route to a separate hotfix lane, not Phase 16.

**Warning signs:**
- Mobile sweep early findings >5 critical issues
- Tests pass desktop but visual regression at 360px
- Pilot users (Swazulu staff) report mobile issues

**Phase to address:**
**Phase 16** — pre-milestone audit and budget cap.

**Recovery cost:** LOW to MEDIUM — most mobile bugs are CSS-only and fixable in <2h each.

---

### Pitfall 17: Trophy OS schema ↔ DraggonnB OS schema cross-references (orgs ↔ organizations confusion)

**Severity:** MEDIUM

**Category:** Federation infrastructure

**What goes wrong:**
Trophy OS uses `orgs` table; DraggonnB uses `organizations`. Both are `UUID PRIMARY KEY`. A user might be a member of `orgs.id = X` (Trophy) AND `organizations.id = Y` (DraggonnB) — two different UUIDs, same conceptual "org." Federation work confuses them:
- A migration adds `tenant_modules.config.trophy.linked_org_id` → which UUID is this? Trophy's `orgs.id` or DraggonnB's `organizations.id`?
- Cross-product join: `safaris.accommodation_booking_id` → `bookings.id` (DraggonnB) but `bookings.organization_id` is DraggonnB's UUID, while `safaris.org_id` is Trophy's UUID. Linking these requires a mapping table.
- Bug: someone writes `WHERE orgs.id = safaris.org_id` (correct Trophy) but joins to DraggonnB's `organizations` (different table) by accident — silently wrong.

**Why it happens:**
- Two different schemas in same Supabase project; naming similarity is dangerous
- TypeScript types may be auto-generated separately for each product, hiding the conceptual difference
- Foreign key constraints don't span products (Trophy `safaris.org_id` references Trophy `orgs(id)`, NOT DraggonnB `organizations(id)`)

**How to avoid:**
1. **Mapping table:** `cross_product_org_links (draggonnb_organization_id UUID, trophy_org_id UUID, linked_by_user_id UUID, linked_at TIMESTAMPTZ, UNIQUE(draggonnb_organization_id, trophy_org_id))`. This is the single source of truth for "this DraggonnB org corresponds to this Trophy farm."
2. **Strict naming in code:** never use ambiguous "org_id" without prefix in cross-product code. Use `draggonnb_org_id` and `trophy_org_id` everywhere federation logic touches.
3. **TypeScript brand types:** `type DraggonnbOrgId = string & { __brand: 'draggonnb_org' }` and `type TrophyOrgId = string & { __brand: 'trophy_org' }`. Compiler refuses to mix them.
4. **No FK cross-product in DB.** Use the `cross_product_org_links` table explicitly, not direct FKs.
5. **Code review checklist:** any PR touching cross-product joins must show a comment explaining which org-id-type each variable holds.

**Warning signs:**
- Bugs where data appears under wrong tenant
- TypeScript any/unknown warnings around org_id
- Federation tests that pass locally but fail in CI (different seeded UUIDs)

**Phase to address:**
**Phase 13** — `cross_product_org_links` table + brand types + naming convention in first plans.

**Recovery cost:** MEDIUM — refactor naming conventions, add link table.

---

## Moderate Pitfalls

### Pitfall 18: WhatsApp damage notifications fail silently for non-WA-Business numbers

**Severity:** MEDIUM

**Category:** Damage auto-billing

**What goes wrong:**
Damage flow: WhatsApp notifies guest before charge. International guest's number doesn't have WhatsApp installed (rare but happens — first-time travelers, Russia/China users). Send fails silently. Charge fires anyway because notification was "sent" per Meta API.

**How to avoid:**
1. WhatsApp API distinguishes "delivered" from "read" from "sent." Charge only proceeds if message status reaches `delivered` (Meta confirms phone received it).
2. Fallback: if WhatsApp not delivered within 1h, send SMS via BulkSMS (already integrated in v3.0 Phase 11 Campaign Studio).
3. Fallback to fallback: email with charge dispute link.
4. If all 3 channels fail: charge is NOT fired. Manual ops alert.

**Phase to address:** Phase 15

---

### Pitfall 19: Federation token leaks via referrer header

**Severity:** MEDIUM

**Category:** SSO / Federation

**What goes wrong:**
Bridge URL is `auth.draggonnb.co.za/bridge?token={signed_token}`. Browser sends `Referer: auth.draggonnb.co.za/bridge?token={signed_token}` to the next page. If next page is third-party (analytics pixel, embedded iframe), token leaks.

**How to avoid:**
1. Token in URL fragment (`#token=...`) not query string — fragment isn't sent in Referer.
2. `Referrer-Policy: no-referrer` header on bridge endpoint.
3. Bridge consumes token immediately + redirects to clean URL (302 to `app.{product}.co.za/dashboard` with no token). Single-use token.
4. Token TTL: 60 seconds.

**Phase to address:** Phase 13

---

### Pitfall 20: Photo evidence storage bucket misconfigured (no audit, allows deletion)

**Severity:** MEDIUM

**Category:** Damage auto-billing

**What goes wrong:**
Damage photos stored in Supabase storage bucket. Bucket misconfigured: any authenticated org member can delete. Staff member doctors evidence by deleting photos contradicting their damage claim. Or photos overwritten silently.

**How to avoid:**
1. Bucket policy: INSERT only for org members; UPDATE/DELETE only for `service_role` (= ops actions, audited). Org member SELECT only.
2. File names include UUID + timestamp, so reuploading creates a new file (no overwrite).
3. Storage versioning enabled (where Supabase supports — track version history).
4. CRC32 hash stored in DB on upload; UI verifies before display.
5. Audit log row per upload + access.

**Phase to address:** Phase 15

---

### Pitfall 21: Approval Telegram message contains PII (POPI exposure)

**Severity:** MEDIUM

**Category:** Approval spine / POPI

**What goes wrong:**
Approval Telegram message says "Damage charge R450 for guest John Smith (john@gmail.com, +27821234567) at Suite 3 — Approve / Decline." Message stored in Telegram's history (their servers, outside SA). POPI: PII transferred to a non-SA processor without explicit consent + DPA.

**How to avoid:**
1. Approval message uses internal IDs, not names: "Damage charge R450 for guest #BK-2026-001 at Suite #3 — Approve / Decline." Owner clicks button → bot opens platform UI with full details.
2. Bot DOES NOT store guest PII in any message body.
3. POPI compliance review: Telegram is a processor; document this; ensure each tenant's consent flow mentions Telegram operations transparency.

**Phase to address:** Phase 14

---

### Pitfall 22: Multi-product unified billing UI hides per-product subscription failures

**Severity:** MEDIUM

**Category:** Trophy OS PayFast wiring

**What goes wrong:**
Federation adds "Billing" page showing both DraggonnB + Trophy subscriptions side by side. UI shows "All subscriptions active." But nuance: Trophy's last payment failed silently 3 days ago, status `past_due`. The "All active" summary obscures it. Owner doesn't notice; Trophy access getting cut off in 4 days.

**How to avoid:**
1. UI shows per-product status DISTINCTLY: green active / amber past_due / red cancelled.
2. Top-of-page summary banner: "1 issue across your subscriptions" if any non-active.
3. Action buttons inline: "Update card for Trophy" not nested in another page.
4. Email + WhatsApp alerts for past_due, regardless of in-app UI.

**Phase to address:** Phase 16

---

### Pitfall 23: PWA install prompt timing wrong (too early or too late)

**Severity:** MEDIUM

**Category:** PWA guest surface

**What goes wrong:**
PWA install prompt shown on first page load → guest hasn't seen value yet → dismisses → never sees again (browser blocks for 90 days).
OR shown after stay → guest is leaving → install pointless.

**How to avoid:**
1. Show install prompt at peak engagement: after guest has interacted with PWA 3+ times AND check-in is within 7 days.
2. Show as inline banner, not native modal (less aggressive, dismissable, re-showable).
3. Track install rate; tweak timing based on metric.
4. iOS: no native install API; show "How to install on iOS" guide instead.

**Phase to address:** Phase 16

---

### Pitfall 24: Damage auto-billing edge case — guest paid with PayFast EFT (no token issued)

**Severity:** MEDIUM

**Category:** Damage auto-billing / PayFast tokenization

**What goes wrong:**
Per PayFast docs, tokens are issued from card transactions. EFT payments (popular in SA) don't generate tokens. Guest paid via EFT → checkout → no token stored. Damage flagged → no token to charge → flow breaks silently or routes to "manual collection" (good outcome) OR errors with "token not found" (bad UX).

**How to avoid:**
1. At booking, capture payment method clearly. If EFT, no auto-billing path is offered. UI banner: "EFT payments don't support auto-charge. Damages will be invoiced separately."
2. `accommodation_payment_tokens` table only populated for card payments. Damage flow checks token existence BEFORE flagging; if absent, routes to manual EFT request from start.
3. Encourage card during booking ("a card on file lets us handle damages instantly without invoicing later") — soft nudge, not requirement.

**Phase to address:** Phase 15

---

### Pitfall 25: Single-billing-root creates tax/invoice complications

**Severity:** MEDIUM

**Category:** Cross-product stay link / Finance (deferred to v3.2 but lurks)

**What goes wrong:**
"Single billing root" means hunt + stay invoiced from one entity. But hunt revenue (Trophy OS) and stay revenue (DraggonnB Accommodation) belong to different revenue lines for the lodge. SARS audit: VAT correctly applied? (Hunting permits zero-rated for foreign tourists in some cases; accommodation is standard-rated even for foreign tourists per v3.0 PITFALL-6.)

**How to avoid:**
1. Single billing UI ≠ single invoice. Two invoices generated per stay+hunt package, line items clear, VAT applied per type.
2. PayFast charge can bundle (paid in one transaction) but reconciliation in DB tracks per-product allocation.
3. Defer auto-VAT calculation to v3.2 (per project anti-features); v3.1 generates draft invoices with disclaimer "review with accountant."
4. Reconciliation cron BILL-08 verifies hunt-portion + stay-portion = bundled charge total.

**Phase to address:** Phase 15

---

## Minor Pitfalls

### Pitfall 26: Federation bridge logout doesn't propagate

**What goes wrong:** User clicks "Sign out" on DraggonnB. Cookie cleared. They visit Trophy OS — still logged in (separate cookie). Confusing.

**How to avoid:** Sign-out endpoint hits both products' session-clear URLs (cross-origin POST to invalidate). Or single sign-out via OIDC end-session protocol.

**Phase to address:** Phase 13

---

### Pitfall 27: Telegram bot for both products shares user mapping table

**What goes wrong:** `telegram_user_links` maps Telegram user → platform user. Federation makes "platform user" ambiguous (DraggonnB or Trophy?). One Telegram user maps to one auth user; auth user has memberships in both products. Approval routing must look up the right product context.

**How to avoid:** `telegram_user_links` PK is platform `auth.users.id`, not product-scoped. Per-message product context comes from `approval_requests.product`. Bot replies in product-specific tone.

**Phase to address:** Phase 14

---

### Pitfall 28: Swazulu's pilot reveals a v3.1 design assumption that doesn't fit reality

**What goes wrong:** v3.1 architectural decisions (e.g., split-billing model, approval thresholds, damage windows) assumed something that doesn't match Swazulu's actual operations. Late-breaking redesign mid-pilot.

**How to avoid:**
1. **Discovery call with Swazulu BEFORE Phase 13 architecture is locked.** Validate split-billing assumptions, damage workflow, role mapping against their operational reality.
2. Pilot success metric is "Swazulu uses platform for 4 weeks without escalation," not "platform builds correctly."
3. Hot-fix lane reserved for pilot-revealed mismatches: 1 plan/week dedicated to Swazulu adjustments throughout milestone.

**Phase to address:** Pre-Phase 13 (discovery), then ongoing.

---

### Pitfall 29: Investor demo timed against unstable mid-milestone state

**What goes wrong:** Phase 14 in flight, investor demo falls on a day when approval spine partially shipped — one product approves, the other doesn't. Demo path triggers half-built code.

**How to avoid:**
1. **Demo branch:** investor demo runs against a tagged stable commit (e.g., `v3.0-stable` until federation done, then `v3.1-phase-13-stable` after Phase 13 ships).
2. **Demo script written to avoid unstable surfaces.** Demo what works, defer what's WIP.
3. **Pre-demo checklist:** 30min before demo, smoke test the demo path. If broken, swap to stable branch.

**Phase to address:** Cross-phase (process discipline)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Symlink shared lib between repos | Skip package publish setup | Vercel build breaks; drift on `git pull` order | NEVER for production deploys |
| Auto-create cross-product memberships on first federation hit | "Smooth UX, no friction" | Pitfall 11 (acme.draggonnb user gets Trophy access) | NEVER — silent permission grants |
| Map Trophy 9 roles → DraggonnB 4 roles via dictionary | "Bridge feels seamless" | Pitfall 2 (privileged action via mismatched trust) | NEVER |
| PayFast token charge without per-token cap | "Just use the API" | Pitfall 3 (unauthorized excess charge) | NEVER for damages |
| Damage charge >7 days post-checkout, no window | "Flexibility for late discovery" | Chargeback storm + acquirer termination | NEVER auto-charge; route to manual collection |
| Same Telegram secret_token across products | "One env var" | Compromise of one product compromises both | NEVER — per-product secret_token |
| `revalidate = N` on auth-touching pages | "Faster page loads" | Pitfall 1 (ISR cache leaks Set-Cookie) | NEVER on routes touching auth |
| Cross-schema FK with CASCADE delete | "Clean data integrity" | Pitfall 5 (silent safari deletion when DraggonnB org offboards) | NEVER cross-product CASCADE |
| Booking ID in PWA URL (UUID or sequential) | "Simple route param" | Pitfall 12 (enumeration/leak) | Only UUID v4 + rate limit + token-protected |
| Approval expiry checked only at send-time | "Simpler logic" | Pitfall 10 (race at expiry boundary) | NEVER — atomic stored proc required |
| Currency display as "R10.50" without ZAR label | "SA convention" | Pitfall 13 (international guest confusion) | NEVER for international-facing UI |
| BILL-08 cron in active mode from day 1 | "Catch drift fast" | Pitfall 14 (overwhelms with v3.0 backlog drift) | Dry-run first 7 days |
| Push 12-07 without rebase | "Just unblock" | Pitfall 15 (deploy breakage) | NEVER without rebase + smoke test |
| Telegram bot DM accepts `/approve` commands | "Power-user shortcut" | Pitfall 6 (impersonation surface) | NEVER — inline keyboard only |
| Photo storage allows authenticated DELETE | "Easy file management" | Pitfall 20 (evidence tampering) | NEVER for damage evidence |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| **Supabase auth (federation)** | Set cookie scope `.draggonnb.co.za` for SSO | Per-host cookies + dedicated `auth.draggonnb.co.za` bridge with HMAC-signed tokens |
| **Supabase ISR + auth** | Mix `revalidate=N` with auth on same page | Auth-touching pages MUST be `dynamic = 'force-dynamic'` (per Supabase docs warning) |
| **PayFast tokenization** | Charge token long after booking ended | Hard 7-day window from checkout + per-token max_charge ceiling |
| **PayFast EFT** | Assume EFT generates token | EFT does NOT tokenize; route damage to manual collection |
| **PayFast subscription** | Assume retry-on-fail is cheap | Cap retries at 3 with exponential backoff; past_due after that |
| **Telegram callback_query** | Process without idempotency | `update_id` is the dedup key; `telegram_update_log` PK |
| **Telegram webhook** | Skip `secret_token` config | MANDATORY — `X-Telegram-Bot-Api-Secret-Token` header check |
| **Telegram approvals** | Send to ops channel | Send to 1-on-1 DM with assigned approver only |
| **Cross-schema queries** | FK with `ON DELETE CASCADE` | `ON DELETE SET NULL` + bidirectional event handlers |
| **PWA service worker** | `stale-while-revalidate` for SSR pages | Network-first with timeout fallback; financial pages = network-only |
| **PWA caching** | Same cache key across deploys | Versioned cache key tied to `NEXT_PUBLIC_BUILD_ID` |
| **WhatsApp delivery** | Trust "sent" status | Wait for `delivered` before firing dependent action |
| **Node module sharing** | Symlink between Vercel-deployed apps | Private package via GitHub Packages; exact version pinning |
| **Trophy OS schema** | Use generic `org_id` in federation code | `draggonnb_org_id` / `trophy_org_id` brand types; `cross_product_org_links` mapping |
| **Currency display (international)** | Render "R10,500.00" alone | "ZAR 10,500.00 (≈ USD X)" with ISO code prominent |
| **Federation token in URL** | Query string `?token=...` | URL fragment `#token=...` + `Referrer-Policy: no-referrer` + 60s TTL |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Federation bridge re-issues token on every page nav | Excessive token-issue traffic | Cache decoded token in cookie; re-issue only on expiry | At ~10 active users on bridge |
| Approval queue scan in Telegram bot fetches all approvals | Bot lag on send | Index on `(assigned_approver_user_id, status, expires_at)`; only fetch pending | At ~100 pending approvals |
| Cross-schema query joining `safaris` + `bookings` without indexes | Dashboard timeouts | Composite indexes on cross-link FKs; pre-aggregate where possible | At ~500 cross-linked rows |
| PWA service worker registers but never deactivates old | Cache grows unbounded; iOS users hit storage cap | Versioned cache key + cleanup on `activate` event | At ~5 deploys with PWA users |
| Reconciliation cron BILL-08 scans all org charges per run | Cron run >5min; misses next slot | Incremental scan (only orgs changed since last run) + checkpoint table | At ~20 orgs |
| Damage photo upload large files via API route | Vercel function timeout | Direct-to-Supabase upload via signed URL; client → Supabase, app gets metadata | At any image >5MB |
| Federation audit log every request | DB write contention | Batch writes (1s buffer) or sample to 10% non-sensitive events | At ~100 req/sec |

---

## Security Mistakes (domain-specific)

| Mistake | Risk | Prevention |
|---------|------|------------|
| Federation cookie shared across `.draggonnb.co.za` (multi-tenant parent) | POPI breach (Pitfall 1) | Per-host cookies + auth subdomain bridge |
| Auto-create cross-product memberships | Privilege escalation (Pitfall 11) | Explicit invite flow, no auto-grant |
| Approval routes accept Telegram user_id as authorisation | Bot impersonation (Pitfall 6) | Verify telegram user maps to assigned approver, not "any tapper" |
| Damage photo bucket allows authenticated DELETE | Evidence tampering (Pitfall 20) | service_role-only DELETE; versioning enabled |
| Approval Telegram message contains guest PII | POPI breach (Pitfall 21) | Internal IDs only; PII in app UI behind tap |
| Cross-product FK with CASCADE delete | Silent data loss (Pitfall 5) | SET NULL + bidirectional event handlers |
| PayFast token charge with no app-side ceiling | Unauthorized excess charge (Pitfall 3) | Per-token cap + 7-day window + dual consent |
| Booking PWA URL uses booking_id | Enumeration (Pitfall 12) | Random access_token + rate limit + audit |
| Federation token in URL query string | Referer leak (Pitfall 19) | Fragment + Referrer-Policy + 60s TTL + single-use |
| Webhook accepts requests without `secret_token` | Spoofed webhook fires charges | `secret_token` mandatory on all webhooks (Telegram, PayFast, N8N) |
| Federation-shared lib copy-pasted | Drift causes auth check skew | Private package + version pinning |
| RLS policy on bookings doesn't enforce join membership | Cross-product data leak (Pitfall 5) | Policy requires membership in both orgs for cross-link reads |
| Trophy 9-role to DraggonnB 4-role automap | Privilege confusion (Pitfall 2) | Per-product memberships, no auto-translate |

---

## UX Pitfalls (domain-specific)

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Federation sign-out only logs out current product | Confusing "still logged in" elsewhere | Cross-product logout (single sign-out) |
| Damage charge fires before guest notified | Surprise + dispute | Pre-charge WhatsApp/PWA notification with 48h dispute window |
| Multi-hunter cancellation re-splits rates silently | Remaining hunters surprised | Locked rate per hunter + explicit re-consent on rate adjustment |
| PWA shows "loading" forever when offline | Confusion | Explicit offline indicator + "showing cached data, last updated 2h ago" |
| Cross-product nav assumes both products active | Broken nav for users on one product only | Conditional nav based on user's active memberships |
| Trial expires at 22:30 SAST instead of EOD | "I had until tomorrow!" frustration | Tenant-TZ-aware + 4h grace window |
| Approval Telegram doesn't disable buttons after click | Double-tap risk | Edit message inline immediately on first valid click |
| PWA install prompt on first load | 90-day dismissal lockout | Show after 3+ engagements + check-in within 7 days |
| Damage photo upload with no progress | "Did it work?" confusion | Progress indicator + explicit success/failure toast |
| Currency display "R10,500.00" alone | International guest 10x error | "ZAR 10,500.00 (≈ USD X)" prominent |
| Cross-product invoice combined into one | Tax/audit confusion | Separate invoices per product; payment can bundle but documents distinct |
| Read-only mode (cancelled subscription) silent | "Why can't I save?" | Explicit banner + "Reactivate to continue editing" CTA |

---

## "Looks Done But Isn't" Checklist

Verify before declaring v3.1 features shipped:

- [ ] **SSO bridge:** auth subdomain pattern in place; per-host cookies; HMAC-signed tokens; 60s TTL; URL fragment (not query); Referrer-Policy header; integration test with two-tenant cross-product membership boundary
- [ ] **Federation roles:** no auto-create across products; explicit invite flow; integration test (Trophy outfitter does NOT auto-grant DraggonnB access)
- [ ] **Approval spine:** atomic stored proc for approve/decline; idempotency on `update_id`; approver verification (mapped user, not tapping user); secret_token on webhook; expiry grace 30s; PII-free Telegram messages; per-product role routing
- [ ] **Damage auto-billing:** 7-day window enforced; per-token cap stored; consent at booking captured (timestamp + IP); 2+ photos with EXIF; pre-charge guest notification (WhatsApp delivered, not just sent); chargeback monitoring cron; per-tenant kill switch
- [ ] **Multi-hunter split-billing:** `safari_hunters` is financial truth; locked rate per hunter; pre-arrival paid gate; per-hunter PayFast token; trophy fee allocation requires hunter selection; refund per-token UI
- [ ] **Cross-product stay link:** `safaris.accommodation_booking_id` is `ON DELETE SET NULL`; bidirectional status handlers tested; date-change explicit confirm UX; cross-product RLS join policy; reconciliation cron flags drift
- [ ] **PWA guest surface:** caching strategy by route class; versioned cache key; "update available" banner; offline form conflict UI; iOS-aware UX; token-protected URL (random, not booking_id); rate limit at edge
- [ ] **Trophy OS billing:** trial-expiry uses tenant TZ + 4h grace; failed-payment retries capped at 3; cancelled/past_due RLS read-only enforced; tier downgrade end-of-cycle; cross-product unified billing UI shows per-product status
- [ ] **Federation-shared lib:** private package published; exact version pin; CI smoke-test downstream; no symlinks; no copy-paste of federation logic
- [ ] **Cross-schema discipline:** `cross_product_org_links` table; `draggonnb_org_id` / `trophy_org_id` brand types; no FK across products
- [ ] **Carry-forward:** 12-07 rebased + smoke-tested before push; BILL-08 dry-run first; mobile sweep budget capped (>3 critical → defer non-critical to v3.2)
- [ ] **Currency:** all guest-facing financial UI shows "ZAR" + ISO code + USD inline conversion when known
- [ ] **WhatsApp:** charge gates on `delivered` status, not `sent`; SMS fallback after 1h; email fallback; manual-ops alert if all 3 fail
- [ ] **Storage buckets:** damage photos = `service_role` DELETE only; versioning enabled; CRC32 hash check; audit log
- [ ] **Pre-pilot discovery:** Swazulu operational reality validated against v3.1 architectural assumptions BEFORE Phase 13 locks design

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Cookie scope leak (Pitfall 1) | CATASTROPHIC | (1) Invalidate all sessions platform-wide, (2) audit `organization_users` for cross-tenant inserts last 7d, (3) POPI breach notification within 72h, (4) per-tenant disclosure if data was visible |
| Role mapping privilege escalation (Pitfall 2) | CATASTROPHIC | (1) Pause all approvals, (2) audit `approval_audit_log` for misrouted approvals, (3) refund affected charges, (4) hot-fix product-scoped role enforcement |
| Damage charge after window (Pitfall 3) | CATASTROPHIC if pattern | (1) Refund all charges from past 7 days, (2) freeze damage auto-billing, (3) per-tenant manual review, (4) ship 7-day window enforcement, (5) chargeback rate audit |
| Multi-hunter split chaos (Pitfall 4) | HIGH | (1) Per-affected-safari manual reconciliation, (2) ship locked-rate model, (3) add pre-arrival gate, (4) refund miscalculated portions |
| Cross-product FK orphan (Pitfall 5) | MEDIUM | (1) Run reconciliation cron, (2) flag orphans for ops review, (3) per-orphan decide: re-link / null out / refund |
| Telegram replay fires duplicate charge (Pitfall 6) | HIGH per incident | (1) Refund duplicate, (2) check `telegram_update_log` for missing PK constraint, (3) ship idempotency fix, (4) audit pattern for last 30d |
| PWA stale data (Pitfall 7) | MEDIUM | (1) Force PWA refresh via "update available" trigger, (2) check SW caching strategy on affected route, (3) network-first if dynamic data |
| Trial expiry SAST bug (Pitfall 8) | LOW | Apologetic comms + trial extension; ship TZ + grace fix |
| Shared-lib drift (Pitfall 9) | MEDIUM | Audit federation-token signing in both repos; align versions; publish hot-fix |
| Approval expiry race (Pitfall 10) | LOW | Atomic stored proc fix; reconciliation cron flags status mismatches |
| Subdomain sub-tenant confusion (Pitfall 11) | HIGH | (1) Audit `organization_users` inserts vs invites, (2) revoke unauthorized memberships, (3) ship explicit-invite-only enforcement |
| PWA token leak (Pitfall 12) | MEDIUM | Regenerate affected tokens; rate-limit; review access logs |
| Currency confusion (Pitfall 13) | MEDIUM | Refund + apology + ship ISO+conversion display |
| BILL-08 surfaces v3.0 drift (Pitfall 14) | MEDIUM | Dry-run mode + per-org triage + customer outreach if charges affected |
| 12-07 push breakage (Pitfall 15) | LOW | `git revert` + smoke test + redo on top of main |
| Mobile sweep finds critical bug (Pitfall 16) | LOW per bug | Per-bug CSS fix; defer non-critical to v3.2 |
| Cross-schema FK confusion (Pitfall 17) | MEDIUM | Refactor to brand types; add `cross_product_org_links` mapping |

---

## Pitfall-to-Phase Mapping (for roadmap sequencing)

| Pitfall | Phase | Verification |
|---------|-------|--------------|
| 1. Cookie scope leak | Phase 13 | Per-host cookie test + ISR-on-auth-page lint rule + two-tenant cross-product boundary integration test |
| 2. Role mapping privilege escalation | Phase 13 + 14 | No auto-create cross-product memberships; per-product role required for approvals; integration test (Trophy outfitter no auto-DraggonnB access) |
| 3. Damage charge after window | Phase 15 | 7-day window enforced in code; per-token cap; consent timestamp captured; chargeback monitoring cron live |
| 4. Multi-hunter split-billing chaos | Phase 15 | `safari_hunters` schema is financial source of truth; locked rate; pre-arrival gate; per-token refund flow |
| 5. Cross-product FK CASCADE | Phase 15 + 16 | `ON DELETE SET NULL`; bidirectional handlers; reconciliation cron in Phase 16 |
| 6. Telegram replay attack | Phase 14 | `telegram_update_log` with PK constraint; secret_token verification; approver verification mapped not tap-based |
| 7. PWA stale data | Phase 16 | Caching strategy by route class documented; financial pages network-only; versioned cache key |
| 8. Trial expiry SAST bug | Phase 16 | TZ-aware expiry + 4h grace + read-only RLS test |
| 9. Shared-lib drift | Phase 13 | Private package published; CI smoke test downstream |
| 10. Approval expiry race | Phase 14 | Atomic stored proc; reconciliation cron checks status mismatches |
| 11. Subdomain sub-tenant confusion | Phase 13 | Federation token has explicit `intended_tenant_id`; no auto-create memberships; audit cron |
| 12. PWA token leak | Phase 16 | Random access_token + rate limit at edge + audit log |
| 13. Currency confusion | Phase 15 | "ZAR" + ISO code + USD conversion in all guest-facing financial UI |
| 14. BILL-08 v3.0 drift | Phase 16 | Dry-run mode first 7 days; per-org triage flow |
| 15. 12-07 push breakage | Phase 16 | Rebase + smoke test + preview branch before push |
| 16. Mobile sweep findings | Phase 16 | Pre-milestone lightweight sweep + budget cap |
| 17. Cross-schema FK confusion | Phase 13 | `cross_product_org_links` table + brand types + naming convention |
| 18. WhatsApp delivery silent fail | Phase 15 | Charge gates on `delivered`, not `sent`; SMS+email fallback chain |
| 19. Federation token referer leak | Phase 13 | URL fragment + Referrer-Policy + 60s TTL + single-use |
| 20. Photo evidence tampering | Phase 15 | Bucket policy `service_role` DELETE only; versioning; CRC32 hash |
| 21. Telegram PII leak (POPI) | Phase 14 | Internal IDs in messages; PII behind app UI tap |
| 22. Multi-product billing UI hides failures | Phase 16 | Per-product status displayed distinctly; alert banner if any non-active |
| 23. PWA install prompt timing | Phase 16 | Show after 3+ engagements + check-in within 7d; iOS guide |
| 24. EFT no token edge case | Phase 15 | Token existence check before damage flow; manual collection if absent |
| 25. Single-billing-root tax confusion | Phase 15 | Two invoices per package; bundled charge; reconciliation cron verifies allocation |
| 26. Federation logout doesn't propagate | Phase 13 | Cross-product sign-out endpoint |
| 27. Telegram bot user mapping ambiguity | Phase 14 | `telegram_user_links` PK = `auth.users.id`; per-message product context |
| 28. Pilot reveals design assumption mismatch | Pre-Phase 13 | Discovery call with Swazulu; pilot hot-fix lane reserved |
| 29. Investor demo on unstable mid-milestone state | Cross-phase | Demo branch tagged stable; pre-demo smoke test |

---

## Sources

- `lib/auth/get-user-org.ts` (current auth + auto-create pattern in DraggonnB OS)
- `C:\Dev\DraggonnB\products\trophy-os\CLAUDE.md` (Trophy OS schema, roles, RLS pattern, PayFast tier model)
- `.planning/research/v3.0-archive/PITFALLS.md` (25 v3.0 pitfalls — guards already shipped, lessons applied to v3.1)
- `.planning/PROJECT.md` (v3.1 milestone scope: 4 phases, Swazulu pilot, federation Option C)
- `.planning/STATE.md` (current state: v3.0 complete, Phase 12 partial, carry-forward into Phase 16)
- [Supabase Auth — Server-Side Advanced Guide](https://supabase.com/docs/guides/auth/server-side/advanced-guide) — ISR caching warning ("don't enable ISR on any route where authentication is handled")
- [GitHub Discussion #5742: Supabase auth across multiple subdomains](https://github.com/orgs/supabase/discussions/5742) — duplicate cookie problem + auth-subdomain pattern
- [Supabase Docs — Setting up Server-Side Auth for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — `getUser()` not `getSession()` for protected pages
- [Payfast Tokenization Features](https://payfast.io/features/tokenization/) — token validity, ad-hoc charging model
- [Payfast Tokenization Payments — Ad-Hoc](https://www.payfast.co.za/ad-hoc-payments/) — initial-amount-zero token creation, automatic card updates
- [Payfast — How does a token work?](https://payfast.kayako.com/article/312-how-does-a-token-work) — token lifecycle confirmation
- [Telegram Bot API — Webhooks](https://core.telegram.org/bots/webhooks) — `secret_token`, retry semantics, `update_id` for idempotency
- [Telegram Bot API — Updates](https://core.telegram.org/bots/api#update) — `update_id` is sequential and unique
- [LogRocket — Build a Next.js 16 PWA with true offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — caching strategy and conflict resolution patterns
- [next-pwa GitHub Issue #95: errored offline refreshes](https://github.com/shadowwalker/next-pwa/issues/95) — `stale-while-revalidate` problems with SSR
- [Webhooks.fyi — Replay prevention](https://webhooks.fyi/security/replay-prevention) — webhook idempotency patterns
- POPI Act §22 — breach notification obligations (Information Regulator)
- SA Consumer Protection Act §49 — unauthorised charges (treble-damages exposure)

---

*Pitfalls research for: DraggonnB OS v3.1 Operational Spine — Federation*
*Researched: 2026-04-30; updated 2026-05-01*
*Researcher confidence: HIGH on architectural patterns + integration semantics; MEDIUM on PWA-specific bugs (manifest only with real user testing); HIGH on financial-flow risks (verified against PayFast docs + v3.0 production lessons)*

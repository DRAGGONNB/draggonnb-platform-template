# Architecture Research — DraggonnB OS v3.1 Operational Spine (Federation)

**Domain:** Two-product federation on shared Supabase (multi-tenant DraggonnB OS + vertical Trophy OS)
**Researched:** 2026-04-30
**Confidence:**
- HIGH for existing-codebase grounding (file paths, table shapes, route layouts read from source)
- MEDIUM for federation pattern recommendations (reasoned from existing patterns + ecosystem norms; not validated against running federation)
- LOW for PayFast multi-product ad-hoc behaviour (vendor docs ambiguous; spike required, see PITFALLS.md)

> **Read-before-you-believe preamble.** Three claims in the milestone context require correction before design — these change the build plan materially.
>
> 1. **`approval_requests` already exists but is social-posts-only.** `lib/supabase/database.types.ts` L4433 shows the table has `post_id UUID REFERENCES social_posts(id)` as a hard FK, with no `product` column, no generic `target_resource_id` / `target_resource_type`, no `target_org_id`, no Trophy schema awareness. Phase 14 is **not** "create approval_requests" — it is **generalize approval_requests** via the multi-step migration discipline (OPS-05): add nullable target_resource_type/target_resource_id/product columns, deploy code that populates them, backfill existing social rows with `product='draggonnb'` + `target_resource_type='social_post'`, drop the post_id NOT NULL or convert it to a generic FK pattern. Bundling generalization with new feature use will fail.
>
> 2. **`organizations.payfast_subscription_token` exists** (database.types.ts L12429, L15859) — already populated by ITN handler in `lib/billing/subscriptions.ts`. The ad-hoc charge mechanism in `lib/payments/payfast-adhoc.ts` already calls `POST /subscriptions/{token}/adhoc`. So Phase 15 damage auto-billing does not need a new token capture flow for the **landlord/org** side. The unknown is whether a single PayFast subscription token can charge **two distinct line-of-business amounts** (DraggonnB Accommodation + Trophy OS Safari) on the same merchant — see "Single billing root" section.
>
> 3. **Trophy OS uses Server Actions, not API routes.** `C:\Dev\DraggonnB\products\trophy-os\src\app\` has no `/api` folder; mutations live as Server Actions co-located with pages. This shapes the SSO bridge: cross-product API calls land on Edge Functions or Next.js route handlers Trophy OS would have to add, OR DraggonnB writes directly to Trophy tables via service-role + RLS bypass (which is the simpler path on a shared Supabase). See SSO bridge section.
>
> **Existing assets we're NOT building from scratch:** `organization_users` junction (4 roles) + `getUserOrg()` (`lib/auth/get-user-org.ts`), middleware tenant resolution + `x-tenant-*` header injection (`lib/supabase/middleware.ts` L96-149), `tenant_modules.config` JSONB column (already used for per-tenant module config), `payfast_subscription_token` on organizations, `chargeAdhoc()` (`lib/payments/payfast-adhoc.ts`), `emitBookingEvent()` event dispatcher (`lib/accommodation/events/dispatcher.ts`), Telegram ops bot with callback queries (`lib/accommodation/telegram/ops-bot.ts`), 9-step provisioning saga, `record_usage_event` RPC + advisory locks. On Trophy OS side: `orgs` + `org_members` (9 roles) + 779-line schema + 48 species seeded + RLS via `org_members` lookup.
>
> **What's missing is the federation layer — auth bridge, org linkage, generalized approval spine, cross-schema FK with RLS strategy, multi-hunter junction, PWA shell, Trophy PayFast plumbing.**

---

## 1. System Overview — current state + v3.1 federation insertion points

```
┌─────────────────────────────────────────────────────────────────────────┐
│  DOMAIN — eTLD+1 boundary                                               │
│  draggonnb.co.za + *.draggonnb.co.za   ✦   trophyos.co.za + app.*       │
│  Cookies CANNOT cross. JWT bridge required for SSO.                     │
└─────────────────────────────────────────────────────────────────────────┘
       │                                              │
┌──────┴──────────────────────────────────────────────┴───────────────────┐
│  EDGE — Vercel + middleware.ts (per app)                                │
│  DraggonnB: wildcard tenant resolver, x-tenant-id headers               │
│  Trophy:    standalone Next.js, no subdomain split                      │
│  ━━━ NEW v3.1: /api/sso/issue + /api/sso/consume (JWT bridge endpoints)│
└─────────────────────────────────────────────────────────────────────────┘
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│  APP LAYER — two Next.js 14 codebases                                   │
│                                                                         │
│  draggonnb-platform               trophy-os                             │
│  ─────────────────────────────    ──────────────────────────────────    │
│  app/api/* (162 routes)           app/{auth,dashboard,portal,pricing}   │
│  middleware.ts (tenant + auth)    Server Actions for mutations          │
│  ━━━ NEW: app/(stay)/[id]/*       ━━━ NEW: src/app/api/sso/consume     │
│  ━━━ NEW: app/api/sso/issue       ━━━ NEW: src/app/api/payfast/*       │
│  ━━━ NEW: app/api/approvals/*     ━━━ NEW: src/app/api/approvals/proxy │
│  ━━━ NEW: app/api/damage/*                                              │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│  LIB LAYER (per app, NOT shared yet — see "Decision needed: monorepo")  │
│                                                                         │
│  draggonnb-platform/lib                trophy-os/src/lib                │
│  ───────────────────────────────       ─────────────────────────────    │
│  auth/get-user-org.ts                  supabase/{client,server,admin}   │
│  payments/payfast{,-adhoc,-prefix}.ts  ━━━ NEW: payments/payfast.ts    │
│  accommodation/events/dispatcher.ts    ━━━     (copy or import?)        │
│  accommodation/payments/payfast-link   ━━━ NEW: sso/consume.ts         │
│  accommodation/telegram/ops-bot.ts     ━━━ NEW: approvals/client.ts    │
│  ━━━ NEW: sso/issue.ts                                                  │
│  ━━━ NEW: sso/jwt.ts                                                    │
│  ━━━ NEW: federation/org-link.ts                                        │
│  ━━━ NEW: approvals/spine.ts                                            │
│  ━━━ NEW: damage/charge-flow.ts                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│  DATA — ONE Supabase project psqfgzbjbgqrmjskdavs (84+ tables, RLS)     │
│                                                                         │
│  DraggonnB tables                  Trophy tables (safari_*, tos_*)      │
│  ──────────────────────────────    ──────────────────────────────────   │
│  organizations                     orgs                                 │
│  organization_users (4 roles)      org_members (9 roles)                │
│  module_registry, tenant_modules   safaris, trophies, clients (Trophy)  │
│  approval_requests (social only!)  permits, quotas, areas, species      │
│  accommodation_bookings (+162api)  invoices (Trophy-side)               │
│  agent_sessions, ai_usage_ledger   tos_audit_log                        │
│                                                                         │
│  ━━━ NEW v3.1 (canonical in DraggonnB schema):                         │
│  ━━━   organizations.linked_trophy_org_id UUID NULL                    │
│  ━━━   approval_requests + product, target_resource_*, target_org_id   │
│  ━━━   damage_incidents (NEW, lives in DraggonnB schema)               │
│  ━━━   sso_bridge_tokens (NEW, short-lived nonces — or stateless JWT)  │
│  ━━━ NEW v3.1 (Trophy schema):                                         │
│  ━━━   safari_hunters (junction: safari + hunter + payment status)     │
│  ━━━   safaris.accommodation_booking_id UUID NULL  ← cross-schema FK   │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│  EXTERNAL                                                               │
│  N8N (DraggonnB only today; Trophy not wired) — keep this asymmetry    │
│  Anthropic Claude API (via BaseAgent) — DraggonnB only                 │
│  PayFast (single merchant account, two products draw from it)          │
│  Telegram (single ops bot? or two? — see Decision needed below)        │
│  WhatsApp (DraggonnB has Cloud API; Trophy needs same)                 │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. SSO bridge architecture (Phase 13)

### Recommended: **JWT bridge endpoint (Option B)** with stateless short-lived tokens

The cookie-federation route is structurally blocked: `draggonnb.co.za` and `trophyos.co.za` are different eTLD+1s. Browser cookies cannot be shared. Setting `Domain=.draggonnb.co.za` does nothing for `trophyos.co.za`. Options:

| Option | Mechanism | Pros | Cons | Verdict |
|--------|-----------|------|------|---------|
| A. Subdomain federation | Move Trophy under `trophy.draggonnb.co.za`; share cookies on `.draggonnb.co.za` | Simplest auth model | Trophy already has `trophyos.co.za` brand committed; rename late = bad SEO + investor narrative breaks | NO |
| **B. JWT bridge endpoint** | DraggonnB issues short-lived signed JWT, redirects user to Trophy with `?bridge=<jwt>`, Trophy validates + sets its own session cookie | Works across eTLD+1s, no cookie magic, audit trail per bridge, stateless | Needs shared signing key, replay-attack window | **YES** |
| C. Custom Supabase Auth provider | Trophy uses DraggonnB as IdP via OIDC | Standards-compliant | Supabase Auth SAML/OIDC config is per-project; both apps already use the same Supabase project, so OIDC layer adds zero value | NO |
| D. Hybrid (B + same Supabase session) | JWT bridge mints a Supabase session via Admin API, then sets the standard Supabase cookie on Trophy | Single auth state across both apps | Complexity + Admin API rate limits | Phase 17+ if needed |

#### Recommended Phase 13 implementation

**Sequence:**
```
1. User authenticated at app.draggonnb.co.za (DraggonnB session cookie set)
2. User clicks "Open Trophy OS" sidebar item
3. Browser → GET /api/sso/issue?target=trophy
   ↓ DraggonnB server validates session via getUserOrg()
   ↓ Looks up organizations.linked_trophy_org_id for user's org
   ↓ Looks up trophy_org_member: SELECT id FROM org_members WHERE org_id = linked AND user_id = auth.uid()
   ↓ If no trophy_org_member: auto-provision (see "Auto-link" below)
   ↓ Mints JWT { sub: user.id, draggonnb_org: org.id, trophy_org: linked_org_id, trophy_role: ph_role, exp: now+60s, jti: nonce, iss: 'draggonnb' }
   ↓ Signs with HS256 using SSO_BRIDGE_SECRET (env var, shared with Trophy)
4. DraggonnB → 302 https://app.trophyos.co.za/api/sso/consume?bridge=<jwt>
5. Trophy app/api/sso/consume/route.ts:
   ↓ Verifies signature, checks exp + jti not in used-set (Redis or sso_bridge_tokens table for replay protection)
   ↓ Calls supabase.auth.admin.createSession({ user_id }) OR signs in via magic link OR sets a custom Trophy-side session cookie
   ↓ Redirects to /dashboard
```

**Files to create (DraggonnB):**
- `lib/sso/jwt.ts` — sign + verify HS256 JWT, 60s expiry
- `lib/sso/issue.ts` — orchestration: validate session → resolve trophy_org → mint JWT
- `app/api/sso/issue/route.ts` — entry point, 302 redirect
- `lib/federation/org-link.ts` — resolve `organizations.linked_trophy_org_id` + auto-provision missing trophy `org_members` row
- `components/sidebar/trophy-cross-link.tsx` — sidebar item that links to `/api/sso/issue?target=trophy` (Trophy module gating: only shows if `tenant_modules.module_id='trophy' AND is_enabled=true`)

**Files to create (Trophy OS):**
- `src/app/api/sso/consume/route.ts` — JWT validation + session minting
- `src/lib/sso/verify.ts` — verifies JWT, enforces exp/jti
- `src/lib/sso/session.ts` — creates Supabase session (Admin API) or sets custom cookie

**Replay protection — pick one:**
- **Stateless** (recommended for v3.1): rely on 60s JWT expiry + jti uniqueness check via Redis SETNX with TTL. No new table. Requires Redis (Upstash on Vercel).
- **Stateful**: `sso_bridge_tokens (jti, issued_at, consumed_at, user_id)` table. No external dep. Slower (DB write on every bridge).

**Decision needed:** Redis vs DB-backed replay protection. Redis is faster + cleaner; DB is one less moving piece.

### Reverse direction (Trophy → DraggonnB)

Symmetric. Trophy has its own `/api/sso/issue?target=draggonnb`, DraggonnB has `/api/sso/consume`. Same JWT shape, opposite issuer. Sidebar item in Trophy renders only if `org_members.org_id` has a corresponding DraggonnB `organizations.linked_trophy_org_id` reverse-pointing back.

### Auto-provision missing Trophy `org_members` row

When DraggonnB user X clicks bridge for the first time, but they don't yet have an `org_members` row in the Trophy `orgs` row:
- Default: auto-create `org_members(org_id=trophy_org, user_id=X, role='client', display_name=X.fullName)` — minimum-privilege, owner upgrades manually
- Alternative: refuse bridge until Trophy admin invites them — safer for compliance, more friction
- **Decision needed:** auto-provision-as-client vs require-explicit-invite. Chris's call.

---

## 3. Org bridge / linkage table (Phase 13)

### Recommended: **Column on `organizations`** + **DB function for symmetric lookup**

```sql
-- Migration NN_v31_org_link.sql (multi-step per OPS-05)
-- Step A (this migration): nullable column
ALTER TABLE organizations
  ADD COLUMN linked_trophy_org_id UUID NULL REFERENCES orgs(id) ON DELETE SET NULL;

CREATE INDEX idx_organizations_linked_trophy ON organizations(linked_trophy_org_id) WHERE linked_trophy_org_id IS NOT NULL;

-- Symmetric reverse lookup (no FK on Trophy side — keeps Trophy schema independent for now)
-- Resolve via: SELECT id FROM organizations WHERE linked_trophy_org_id = <trophy_org_id>
```

#### Why this shape, not a `cross_product_links` table

| Option | Pros | Cons |
|--------|------|------|
| **Column on `organizations`** | Direct join, no extra table, RLS already inherits | One-to-one only; if a DraggonnB org ever links to multiple Trophy orgs (multi-farm scenario) this breaks |
| `cross_product_links(draggonnb_org_id, trophy_org_id, status, created_at)` | Many-to-many ready, audit trail | Two joins for every cross-product query, RLS complexity |

**Recommended: column for v3.1**, migrate to junction table in v3.2 if multi-farm-per-org demand surfaces. Outfitter tier in Trophy OS already supports "multi-farm" semantics via multiple `orgs` rows that share an outfitter — this is a v3.2 problem.

### Mapping granularity: per-org

Per-org, not per-user. Rationale:
- DraggonnB `organizations` and Trophy `orgs` are both tenant boundaries. Both share the *concept* of "this lodge / this outfitter business."
- User mapping is derived: a DraggonnB `organization_users` row + a Trophy `org_members` row, both pointing to the linked org pair, both pointing to the same `auth.users.id`.
- Roles do NOT map. A user is `admin` in DraggonnB and `farm_owner` in Trophy independently. The SSO bridge propagates the linked role; it does NOT translate roles.

### Provisioning flow when activating Trophy module

When DraggonnB activates `module_id='trophy'` for an organization:

```
provisioning saga step (NEW — between deploy-automations and onboarding-sequence):
  10. provision-trophy-link
      ↓ Check: does organizations.linked_trophy_org_id already exist?
      ↓ If yes: idempotent no-op
      ↓ If no:
        ↓ Create Trophy orgs row: INSERT INTO orgs(name, slug, type, owner_id, ...) VALUES (...)
          (slug = draggonnb_subdomain or draggonnb_subdomain + '-trophy' if collision)
        ↓ Create Trophy org_members row: user_id = DraggonnB org admin, role = 'farm_owner'
        ↓ UPDATE organizations SET linked_trophy_org_id = <new orgs.id>
        ↓ INSERT INTO tenant_modules(organization_id, module_id, is_enabled, config) VALUES (..., 'trophy', true, '{"linked_org_id": "<new orgs.id>"}')
      ↓ Rollback: DELETE FROM orgs WHERE id = linked_trophy_org_id (cascades to org_members)
```

This becomes step 10 in the existing 9-step saga (extends to 10 steps for orgs that opt into Trophy). Lives in `lib/provisioning/steps/provision-trophy-link.ts`. Idempotent and has rollback per existing saga discipline.

**Decision needed:** Auto-provision Trophy `orgs` row at module-activation time, OR wait for user to manually create one in Trophy and link. Auto-provision = smoother UX, Trophy `orgs` always exists when tenant_modules.module_id='trophy' is true. Manual = explicit user consent for Trophy-side billing trial start. Recommend auto-provision with `subscription_status='trial'` (Trophy has 14-day trial built in).

### Where does `tenant_modules.config.trophy.linked_org_id` live? Both places.

Authoritative: `organizations.linked_trophy_org_id` (FK-enforced, RLS-bounded).
Convenience cache: `tenant_modules.config` JSONB at `config->'trophy'->>'linked_org_id'`.

The middleware reads `tenant_modules` already to populate `x-tenant-modules`. Extending it to also extract `linked_trophy_org_id` is one line. SSO bridge reads from `tenant_modules.config` to avoid an extra JOIN to `organizations`. Backfill: every new write to `organizations.linked_trophy_org_id` also updates the JSONB cache (via trigger or app code).

---

## 4. Approval spine architecture (Phase 14)

### Critical correction: `approval_requests` already exists, social-only. Generalize, don't recreate.

Current shape (database.types.ts L4433-4502):
```
approval_requests
  id UUID
  organization_id UUID FK → organizations
  approval_rule_id UUID FK → approval_rules (nullable)
  post_id UUID FK → social_posts (NOT NULL)  ← blocks generalization
  requested_by UUID
  assigned_to UUID[]
  status, urgency, request_notes, requested_at, expires_at
```

#### Multi-step generalization (OPS-05 discipline)

```
Migration NN1_approval_spine_step1_add_columns.sql:
  ALTER TABLE approval_requests
    ADD COLUMN product TEXT NULL CHECK (product IN ('draggonnb', 'trophy')),
    ADD COLUMN target_resource_type TEXT NULL,
    ADD COLUMN target_resource_id UUID NULL,
    ADD COLUMN target_org_id UUID NULL,
    ADD COLUMN action_type TEXT NULL CHECK (action_type IN (
      'social_post','damage_charge','rate_change','content_post',
      'quota_change','safari_status_change','supplier_job_approval'
    )),
    ADD COLUMN action_payload JSONB DEFAULT '{}'::jsonb;
  ALTER TABLE approval_requests
    ALTER COLUMN post_id DROP NOT NULL;  -- safe: column still exists, just nullable

Migration NN2_approval_spine_step2_backfill.sql:
  UPDATE approval_requests
  SET product = 'draggonnb',
      target_resource_type = 'social_post',
      target_resource_id = post_id,
      target_org_id = organization_id,
      action_type = 'social_post'
  WHERE product IS NULL;  -- idempotent: WHERE clause makes it safe to re-run

Migration NN3_approval_spine_step3_constraints.sql (only after deploy + verify):
  ALTER TABLE approval_requests
    ALTER COLUMN product SET NOT NULL,
    ALTER COLUMN target_resource_type SET NOT NULL,
    ALTER COLUMN target_resource_id SET NOT NULL,
    ALTER COLUMN target_org_id SET NOT NULL;
  -- DO NOT drop post_id column yet — leave for Phase 17 cleanup migration.
  -- Existing code paths still read post_id; remove only after grep-verified zero usage.
```

This is **3 migrations across 3 deploys** per OPS-05. Phase 14 plan must reflect that.

### Trophy reads/writes via shared Supabase + service-role bypass

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Trophy calls DraggonnB API: `POST app.draggonnb.co.za/api/approvals` | Single source of business logic | Network hop, auth complexity, two failure domains | NO |
| **Trophy writes directly to `approval_requests` via service-role client** | Single SQL write, RLS enforced symmetrically, no network hop | Trophy schema-couples to DraggonnB table; both products' migrations must coordinate | **YES** |

Both apps share Supabase. The "two products" framing is brand-level, not data-level. Direct table access is the simpler model.

**RLS strategy for `approval_requests` post-generalization:**

```sql
-- DraggonnB requesters/approvers
CREATE POLICY "approval_requests_select_draggonnb" ON approval_requests
  FOR SELECT USING (
    product = 'draggonnb' AND
    target_org_id = get_user_org_id()  -- existing STABLE function
  );

-- Trophy requesters/approvers (uses Trophy's RLS predicate)
CREATE POLICY "approval_requests_select_trophy" ON approval_requests
  FOR SELECT USING (
    product = 'trophy' AND
    target_org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid() AND is_active = TRUE)
  );

-- Cross-product visibility for users with linked orgs (e.g. owner sees all approvals for both products)
CREATE POLICY "approval_requests_select_linked" ON approval_requests
  FOR SELECT USING (
    target_org_id IN (
      SELECT linked_trophy_org_id FROM organizations
      WHERE id = get_user_org_id() AND linked_trophy_org_id IS NOT NULL
    )
  );
```

Three OR-stacked SELECT policies cover: DraggonnB-product approvers see DraggonnB approvals for their org, Trophy-product approvers see Trophy approvals for their Trophy org, and cross-product owners see both.

### Telegram bot — single ops bot, product-tagged callbacks

**Recommended: single bot, tagged callback data, per-product handlers.**

Existing: `lib/accommodation/telegram/ops-bot.ts` already handles inline action buttons + callback_query. Extend by:
- Callback data shape: `approve:{request_id}` becomes `approve:{product}:{request_id}` — e.g. `approve:trophy:abc-123`
- `app/api/webhooks/telegram/route.ts` (existing) parses callback_data, routes to `lib/approvals/spine.ts` which dispatches to per-action-type handler

**Why not two bots:**
- Lodge/farm operators don't want two Telegram bots cluttering their app — UX worse, brand confusion
- Single bot per org (already supported via `ops_telegram_channels.bot_token` per-org pattern) means owner sees all approvals in one stream

**Why this only works because of single ops bot per org:**
- Bot tokens are per-org (existing pattern). The bot routes to the org's chat_id. Trophy product approvals for org X go to org X's already-configured Telegram channel.
- If Swazulu wants Trophy approvals in a separate Telegram channel from Accommodation approvals, that's a department channel split — already supported by `ops_telegram_channels.department`. Just add `department='trophy'` rows.

**Files to create:**
- `lib/approvals/spine.ts` — generic approval lifecycle (create, approve, reject, expire)
- `lib/approvals/handlers/damage-charge.ts` — when approved, calls `chargeAdhoc()` against guest token
- `lib/approvals/handlers/safari-status-change.ts` — when approved, updates `safaris.status`
- `lib/approvals/handlers/quota-change.ts` — when approved, updates `quotas` row
- `lib/approvals/handlers/supplier-job-approval.ts` — when approved, updates `supplier_jobs.status='accepted'`
- `app/api/approvals/route.ts` — POST creates an approval request (called from any product)
- `app/api/approvals/[id]/respond/route.ts` — POST approve/reject (called from Telegram callback)

**Decision needed:** approval threshold lattice. DraggonnB has 4 roles, Trophy has 9. The lattice question: "if the action is `damage_charge` for DraggonnB, who can approve?" vs "if the action is `quota_change` for Trophy, who can approve?" Recommend: define `approval_rules(action_type, product, required_role[])` table with array column. Pre-seed for both products. Owner can override per-org.

---

## 5. Damage auto-billing data flow (Phase 15)

### Recommended sequence

```
Step 1. Staff member opens existing DraggonnB Telegram bot
  ↓ Sends /damage command (NEW custom command handler in lib/accommodation/telegram/ops-bot.ts)
  ↓ Bot replies: "Photo + booking ref + amount?"
  ↓ Staff sends photo + caption: "BK-2026-456 R750 broken lamp"

Step 2. Bot webhook → app/api/webhooks/telegram/route.ts
  ↓ Routes to NEW lib/damage/intake.ts:
    ↓ Parses booking ref + amount + description
    ↓ Saves photo to storage bucket damage-photos/{org_id}/{booking_id}/
    ↓ INSERT damage_incidents (booking_id, photo_url, amount_cents, description, reported_by, status='pending_approval')
    ↓ Calls lib/approvals/spine.ts createApprovalRequest({
        product: 'draggonnb',
        target_resource_type: 'damage_incident',
        target_resource_id: <new id>,
        action_type: 'damage_charge',
        target_org_id: <org_id>,
        action_payload: { amount_cents, booking_id, photo_url }
      })

Step 3. Approval spine sends Telegram message to owner channel:
  "Damage charge: R750 broken lamp (Booking BK-2026-456)
   [View photo] [Approve & charge guest] [Reject]"

Step 4. Owner taps "Approve & charge guest"
  ↓ Telegram callback → app/api/webhooks/telegram/route.ts
  ↓ Routes to lib/approvals/spine.ts respondToApproval(request_id, 'approved')
  ↓ Spine looks up handler for action_type='damage_charge'
  ↓ lib/approvals/handlers/damage-charge.ts:
    ↓ Look up booking → guest → guest's stored PayFast token
    ↓ Call chargeAdhoc({ subscriptionToken, organizationId, amountCents, prefix: 'ONEOFF' })
    ↓ On success: INSERT accommodation_payments (booking_id, amount, type='damage_charge', payfast_ref=<mPaymentId>)
    ↓                UPDATE damage_incidents SET status='charged', charged_at=NOW()
    ↓ On failure (declined, expired token): UPDATE damage_incidents SET status='charge_failed', failure_reason=<...>
    ↓ Send WhatsApp to guest: "Damage charge processed. R750 for broken lamp during stay BK-2026-456. Receipt: <url>"
```

### Critical question: PayFast stored token — landlord-level or guest-level?

| Token | Where stored | Purpose | Limitation |
|-------|--------------|---------|------------|
| `organizations.payfast_subscription_token` | Already exists, set by ITN handler | Charges the **lodge** (subscription billing for SaaS tier) | Not the guest's payment method |
| Guest-level token (NEW) | Need new column on `accommodation_bookings.guest_payfast_token` | Captured when guest paid deposit/balance via PayFast Subscribe checkout | Requires deposit/balance flow to use Subscribe (recurring) checkout, not just one-off — current `payfast-link.ts` uses one-off |

**Status:** `payfast-link.ts` L52-69 generates one-off payment URLs, NOT tokenized recurring subscriptions. The current accommodation payment flow does **not** capture a stored guest token.

**Implication for Phase 15:** Damage auto-billing requires a **prior change to deposit/balance capture flow** so the guest's first payment is via PayFast Subscribe (recurring) checkout, which returns a token in the ITN webhook. That token gets saved to `accommodation_bookings.guest_payfast_token`. Subsequent damage charges then use `chargeAdhoc()` against that token.

**This is a sub-phase or pre-requisite within Phase 15 — flag clearly in roadmap:**
- 15.X: Convert accommodation deposit/balance to PayFast Subscribe + capture token
- 15.Y: Damage Telegram intake flow
- 15.Z: Damage approval handler + auto-charge

**Decision needed:** are we OK requiring guests pay via Subscribe (which is functionally a one-time charge with a stored payment method, fronted by a checkbox like "save card for incidentals")? PayFast UX has a checkbox for this. Legal nuance: terms must disclose "card kept on file for damage charges up to R{cap}." Cap mechanism: `accommodation_bookings.max_incidental_charge_zar` column.

### Failure modes

| Failure | Surface | Handling |
|---------|---------|----------|
| Token missing (guest paid by EFT) | Damage intake step | Owner gets Telegram approval but with WARNING: "no card on file, charge will be EFT request via WhatsApp." Falls back to manual settle flow |
| Token expired | `chargeAdhoc()` returns error | Update damage_incidents.status='charge_failed', send WhatsApp to guest with PayFast link to settle manually |
| Charge declined | `chargeAdhoc()` returns response.error | Same as above — fall back to WhatsApp request |
| Guest disputes | Out-of-band, PayFast chargeback flow | Manual reconciliation via existing BILL-08 cron (carry-forward Phase 16) |

---

## 6. Multi-hunter split-billing (Phase 15)

### Recommended schema (Trophy OS migration)

```sql
-- Trophy migration 002_safari_hunters.sql
CREATE TABLE safari_hunters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES orgs(id) ON DELETE CASCADE NOT NULL,
  safari_id UUID REFERENCES safaris(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id), -- nullable: not all hunters need full client records
  hunter_name TEXT NOT NULL,
  hunter_email TEXT,
  hunter_phone TEXT,
  daily_rate_zar DECIMAL(10,2),
  num_days INT,
  amount_zar DECIMAL(10,2) NOT NULL,
  payfast_token TEXT,  -- captured at deposit checkout, used for balance + damage
  payfast_subscription_id TEXT,
  deposit_amount_zar DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_paid_at TIMESTAMPTZ,
  deposit_payfast_ref TEXT,
  balance_amount_zar DECIMAL(10,2),
  balance_paid BOOLEAN DEFAULT FALSE,
  balance_paid_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','deposit_paid','paid','refunded','no_show','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(safari_id, hunter_email)
);

CREATE INDEX idx_safari_hunters_safari ON safari_hunters(safari_id);
CREATE INDEX idx_safari_hunters_org ON safari_hunters(org_id);

-- RLS via Trophy pattern
ALTER TABLE safari_hunters ENABLE ROW LEVEL SECURITY;
ALTER TABLE safari_hunters FORCE ROW LEVEL SECURITY;
-- ... policies inherited from Trophy OS pattern (org_members lookup) ...
```

### Per-hunter PayFast subscription model

**Recommended: per-hunter subscription token, NOT one safari subscription with internal split.**

| Approach | Pros | Cons |
|----------|------|------|
| **One subscription per hunter** | Each hunter pays from own card, gets own receipt, dispute boundaries are per-hunter, refund flow is per-hunter | N hunters = N subscription tokens to manage; cross-hunter reconciliation needed |
| One safari subscription, internal split | Single charge ledger, one PayFast transaction | Whose card paid? PayFast doesn't split. Disputes are joint-and-several. Refund flow nightmare |

The "one subscription with internal split" model is structurally wrong for multi-hunter international parties where each hunter pays independently. Use per-hunter.

`safaris.deposit_payfast_ref` becomes the *primary hunter's* deposit only (or NULL when split). Use `safari_hunters.deposit_payfast_ref` for the per-hunter ledger.

### "Single billing root" for hunt+stay packages — DEFER

This is the trickiest piece. Hunt+stay = one PayFast subscription that pulls from one card and credits both:
- DraggonnB Accommodation (lodging portion)
- Trophy OS Safari (hunt portion)

**Architectural options:**

| Option | Subscription lives where | Cross-product crediting | Reconciliation |
|--------|-------------------------|-------------------------|----------------|
| A. DraggonnB-rooted | `accommodation_bookings.payfast_subscription_token` | DraggonnB ITN handler routes a portion to Trophy `safari_hunters.balance_paid=true` via internal API | Internal cross-product invoice splitting logic |
| B. Trophy-rooted | `safaris.payfast_subscription_token` | Trophy ITN routes portion back to `accommodation_bookings` | Same complexity, opposite direction |
| C. Two parallel subscriptions on same card | One token at deposit, replicated to both products' tables | No cross-crediting needed; each product owns its slice | Guest sees two charges, two receipts — UX clutter |
| D. Synthetic invoice product | Net-new `cross_product_invoices` table, single PayFast subscription, single ITN, splits internally based on JSONB line items | Cleanest data model, single guest receipt | Most build cost, biggest blast radius |

**Recommended for v3.1:** **Option C (parallel subscriptions, same card).** Lowest blast radius. Each product handles its own billing autonomously. Guest sees two PayFast charges (one for stay, one for hunt) but they paid via one checkout flow that captures the same card twice (PayFast supports this via "save card" UX). This is acceptable UX for the Swazulu pilot. Defer Option D synthetic invoice to v3.2 if the pilot reveals real friction.

**Decision needed:** confirm Option C is acceptable UX. If owner pushback ("guests will be confused by two charges"), upgrade to Option D and budget +1 phase.

---

## 7. Cross-product stay link (Phase 15)

### Recommended: nullable cross-schema FK, both directions queryable

```sql
-- Trophy migration 003_safari_accommodation_link.sql
ALTER TABLE safaris
  ADD COLUMN accommodation_booking_id UUID NULL REFERENCES accommodation_bookings(id) ON DELETE SET NULL;

CREATE INDEX idx_safaris_accom_booking ON safaris(accommodation_booking_id) WHERE accommodation_booking_id IS NOT NULL;
```

### Is cross-schema FK across "products" OK? YES, structurally — same Supabase, same Postgres database, no schema separation actually exists.

The product separation is **codebase + branding**, not **schema**. All tables sit in `public.` schema in Postgres. FK across "products" is just FK within the same DB. Postgres doesn't care.

**RLS implications:**

When DraggonnB user views `accommodation_bookings.id=X`, RLS on `safaris.accommodation_booking_id=X` lookup is enforced via Trophy's `org_members` policy. That means:
- DraggonnB user with no Trophy `org_members` row sees no Trophy data — correct.
- DraggonnB user with linked Trophy `org_members` row sees the linked safari — correct.
- The **server component** rendering "Booking detail with linked safari" needs to query Trophy tables — and the RLS check happens at query time using `auth.uid()`, which is shared across both apps because they share Supabase Auth.

**This works because both apps share auth.users and the user's session cookie carries the same JWT.** Different cookie domains, but the user ID inside the JWT is identical (same Supabase project = same auth.users table).

### Server-component pattern

For the DraggonnB accommodation booking detail page that needs to display linked safari:

```typescript
// app/accommodation/bookings/[id]/page.tsx (DraggonnB)
const { data: booking } = await supabase
  .from('accommodation_bookings')
  .select('*')
  .eq('id', params.id)
  .single()

// Cross-product query — same Supabase client, RLS enforces visibility
const { data: linkedSafari } = await supabase
  .from('safaris')  // Trophy table; user can see only if they have org_members row in Trophy
  .select('id, reference, status, num_hunters, daily_rate_zar')
  .eq('accommodation_booking_id', booking.id)
  .maybeSingle()  // null if no link OR user has no Trophy access — both fine

return <BookingDetail booking={booking} linkedSafari={linkedSafari} />
```

No service-role bypass needed. RLS does the right thing automatically because both products share `auth.uid()`.

**Files to create:**
- `lib/federation/cross-product-queries.ts` — typed helpers like `getSafariForBooking(supabase, bookingId)`, `getBookingForSafari(supabase, safariId)` — encapsulates the cross-product join

### Reverse direction (Trophy safari → DraggonnB booking)

Same pattern. Trophy safari detail page reads `accommodation_bookings.id = safaris.accommodation_booking_id`, RLS via DraggonnB's `get_user_org_id()`. Works because the user has both `organization_users` and `org_members` rows.

---

## 8. PWA guest surface (Phase 16)

### Recommended: route group within DraggonnB app, NOT a separate Next.js project

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| Separate Next.js app | Clean isolation, smaller bundle | New deploy target, duplicate auth + supabase clients, monorepo coordination | NO |
| **Route group in existing DraggonnB app** | Reuses lib/, components/, supabase client, single deploy | Shares bundle with main app (mitigated via dynamic imports + service worker route scoping) | **YES** |
| Subdomain proxied to same Next.js app | Best of both: clean URL, single codebase | Vercel wildcard + middleware needs careful exclusion to NOT apply tenant-resolver to stay.* | Hybrid — use this |

**Recommended: route group `app/(stay)/[bookingId]/page.tsx` + middleware exclusion for `stay.draggonnb.co.za`.**

### Auth model — stateless, signed booking URL

This is unauthenticated-by-Supabase but authenticated-by-token:

```
URL: https://stay.draggonnb.co.za/{bookingId}?token={hmac-sig}
```

`token` = HMAC-SHA256 of `{bookingId}:{expiry}:{purpose}` signed with `STAY_TOKEN_SECRET` env var. URL is generated when booking is confirmed and sent to guest via WhatsApp. Token expires N days after checkout date.

**No `getUserOrg()` flow.** Page-level access control:

```typescript
// app/(stay)/[bookingId]/page.tsx
import { verifyStayToken } from '@/lib/stay/token'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function StayPortal({ params, searchParams }) {
  const valid = verifyStayToken(params.bookingId, searchParams.token)
  if (!valid) return <UnauthorizedPage />

  // Service-role read — guest is "authenticated" via token, not auth.uid()
  const admin = createAdminClient()
  const { data: booking } = await admin
    .from('accommodation_bookings')
    .select('*, property:properties(*), unit:units(*)')
    .eq('id', params.bookingId)
    .single()

  return <StayExperience booking={booking} />
}
```

### Middleware exclusion

Add `stay` to PLATFORM_HOSTS in `lib/supabase/middleware.ts` L44 — prevents tenant resolver from trying to resolve `stay` as a subdomain. Add `(stay)` route group to public bypass list.

### Service worker scope

**Recommended: scope to `/(stay)/` only, NOT entire `*.draggonnb.co.za`.** Reason: tenant-app routes change frequently, breaking the cache hurts more than it helps. Stay-portal routes are stable, mostly static after first load.

```javascript
// public/stay-sw.js, registered only by app/(stay)/layout.tsx
self.addEventListener('install', ...)
self.addEventListener('fetch', e => {
  if (!e.request.url.includes('/(stay)/')) return  // out of scope
  // cache-first for assets, network-first for booking JSON
})
```

### Concierge chat reuse

Existing `ConciergeAgent` is WhatsApp-tied. For PWA:
- Add `lib/accommodation/agents/concierge/web-adapter.ts` — same agent, web transport
- New endpoint `app/api/stay/[bookingId]/chat/route.ts` — token-validated, calls ConciergeAgent.respond()
- Component `components/stay/ConciergeChat.tsx` — chat UI, polls or WebSockets for response

This is **lightweight** because ConciergeAgent business logic is transport-agnostic; only the input/output adapter changes.

---

## 9. Trophy OS PayFast wiring (Phase 16)

### Critical decision: shared lib via npm workspace, OR copy

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| npm workspace (monorepo) | Single source of truth, type sharing, atomic refactors | Both apps must move into same git repo OR git submodule, big refactor cost | Phase 17+ if needed |
| Symlink across local dirs | Works in dev, fails in Vercel deploy | Vercel doesn't follow symlinks across project roots | NO |
| **Copy + version-pin** | Deploy-simple, low-blast-radius for v3.1 | Drift risk: bug fixes need to be applied twice | **YES for v3.1** |
| Publish private npm package `@draggonnb/payfast` | Clean dep boundary | Publish/version overhead for first iteration | v3.2 graduation path |

**Recommended for v3.1: copy `lib/payments/payfast.ts` + `payfast-adhoc.ts` + `payfast-prefix.ts` into Trophy OS as `src/lib/payments/`.** Track drift in a checklist; in v3.2 promote to a versioned package once API surface stabilizes.

**Decision needed:** acceptable to have the same code in two repos for 1-2 months? Risk: a PayFast API change requires PR to both. Mitigation: add a section in CLAUDE.md noting the duplicate location.

### Trophy subscription tiers

`billing_plans` (DraggonnB) currently scopes pricing tiers for DraggonnB modules only. Two options:

| Option | Where Trophy tiers live | Pros | Cons |
|--------|------------------------|------|------|
| A. Add Trophy rows to `billing_plans` | `billing_plans` row with `product='trophy'` discriminator (new column) | Single billing dashboard, single ledger | Couples DraggonnB billing schema to Trophy |
| B. Trophy-specific `billing_plans` table | `tos_billing_plans` in Trophy schema | Independence | Two billing systems, dashboard duplication |

**Recommended: Option A — add `product TEXT NOT NULL DEFAULT 'draggonnb'` column to `billing_plans`.** Pre-existing rows backfill to `'draggonnb'` (multi-step migration: nullable add → backfill → NOT NULL). Add Trophy rows: `('TOS-S', 599, 'trophy'), ('TOS-P', 1499, 'trophy'), ('TOS-O', 3499, 'trophy')`. Tier-gating queries always filter on `product` to scope correctly.

Cost dashboard `/admin/cost-monitoring` rolls up both products: `SELECT product, SUM(...) FROM billing_invoices GROUP BY product`. Single dashboard, two product columns. Lives in DraggonnB app (Trophy doesn't have an admin surface yet).

### Trophy ITN webhook

Trophy needs `src/app/api/payfast/webhook/route.ts`. Same merchant credentials (single PayFast account = single shared `MERCHANT_ID`/`MERCHANT_KEY`). ITN handler distinguishes by `m_payment_id` prefix:
- `SUB-` (DraggonnB subscription) → DraggonnB handler
- `TOS-` (Trophy subscription) — NEW prefix in `lib/payments/payfast-prefix.ts`
- `ACC-` (Accommodation booking) → DraggonnB accommodation handler
- `SAFARI-` (Trophy hunter charge) — NEW prefix

PayFast notify_url is per-charge, so each product's charge endpoint specifies its own notify_url. Cross-product confusion only happens if URLs are misconfigured.

---

## 10. v3.0 carry-forward (Phase 16)

| Item | Effort | Notes |
|------|--------|-------|
| Push 12-07 (committed at `bedaff0e`) | 5 min | Already done locally, just needs `git push` |
| BILL-08 reconciliation cron | M (already designed in v3.0 plans, lives in `app/api/cron/reconcile-payments/route.ts` per existing pattern) | Carry the v3.0 plan as-is |
| OPS-02..04 audit crons | M | Each is a self-contained cron route |
| 360px mobile sweep | L | **Critical scoping decision: across all 82 DraggonnB pages + 24 Trophy pages?** |

**Decision needed:** Mobile sweep scope. Recommended split:
- **DraggonnB**: full 82-page sweep (in scope — already planned in v3.0)
- **Trophy OS**: defer to v3.2 — Trophy already follows mobile-first principle (CLAUDE.md L29) but no audit done. Adding it doubles the sweep cost. Unless Swazulu pilot reveals specific Trophy mobile breakage, defer.

---

## 11. Component responsibilities — new and modified

| Component | Kind | Responsibility | Phase |
|-----------|------|----------------|-------|
| `lib/sso/jwt.ts` | NEW | Sign + verify HS256 JWTs, 60s expiry, jti replay protection | 13 |
| `lib/sso/issue.ts` | NEW | Mint bridge JWT for outbound user, resolve linked Trophy org | 13 |
| `app/api/sso/issue/route.ts` | NEW | DraggonnB endpoint: redirect user to Trophy with bridge token | 13 |
| `app/api/sso/consume/route.ts` (Trophy) | NEW | Validate bridge JWT, mint Trophy session, redirect to dashboard | 13 |
| `lib/federation/org-link.ts` | NEW | Resolve `linked_trophy_org_id`, auto-provision if missing | 13 |
| `lib/provisioning/steps/provision-trophy-link.ts` | NEW | Saga step 10: create Trophy `orgs` row when Trophy module activated | 13 |
| Migration: `organizations.linked_trophy_org_id` | NEW | Nullable column, indexed, FK with ON DELETE SET NULL | 13 |
| `lib/supabase/middleware.ts` | MODIFIED | Add `stay` to PLATFORM_HOSTS; extract `linked_trophy_org_id` for header injection | 13/16 |
| Migration: generalize `approval_requests` (3-step) | MODIFIED | OPS-05 multi-step: add nullable cols → backfill → constraints | 14 |
| `lib/approvals/spine.ts` | NEW | Generic approval lifecycle: create / approve / reject / expire | 14 |
| `lib/approvals/handlers/{damage-charge,safari-status-change,quota-change,supplier-job-approval,rate-change,content-post,social-post}.ts` | NEW | Per-action-type approval handlers | 14, 15 |
| `app/api/approvals/route.ts` | NEW | POST creates approval request | 14 |
| `app/api/approvals/[id]/respond/route.ts` | NEW | POST approve/reject (called by Telegram + UI) | 14 |
| `lib/accommodation/telegram/ops-bot.ts` | MODIFIED | Extend callback_data to `approve:{product}:{id}`; route to spine | 14 |
| `app/api/webhooks/telegram/route.ts` | MODIFIED | Parse new callback shape, route to approval spine | 14 |
| Migration: `damage_incidents` table | NEW | DraggonnB schema; status, photo_url, amount, booking_id | 15 |
| `lib/damage/intake.ts` | NEW | Telegram /damage command handler | 15 |
| `lib/damage/charge-flow.ts` | NEW | Look up token, call chargeAdhoc, update accommodation_payments | 15 |
| Migration: `accommodation_bookings.guest_payfast_token` | NEW | Multi-step add (nullable → backfill not applicable, new bookings only → never NOT NULL) | 15 |
| `lib/accommodation/payments/payfast-link.ts` | MODIFIED | Switch from one-off to Subscribe checkout to capture token | 15 |
| Migration: `safari_hunters` (Trophy) | NEW | Junction table per safari per hunter, with per-hunter PayFast token | 15 |
| Migration: `safaris.accommodation_booking_id` (Trophy) | NEW | Cross-schema FK, nullable, ON DELETE SET NULL | 15 |
| `lib/federation/cross-product-queries.ts` | NEW | Typed helpers: `getSafariForBooking()`, `getBookingForSafari()` | 15 |
| Trophy `src/app/api/payfast/{webhook,subscribe,checkout}/route.ts` | NEW | PayFast wiring on Trophy side | 16 |
| Trophy `src/lib/payments/{payfast,payfast-adhoc,payfast-prefix}.ts` | NEW (copy from DraggonnB) | Same code, two homes for v3.1 | 16 |
| Migration: `billing_plans.product` column | MODIFIED | Add NOT NULL DEFAULT 'draggonnb', then add Trophy rows | 16 |
| `app/(stay)/layout.tsx` + `[bookingId]/page.tsx` | NEW | PWA route group, token-authenticated | 16 |
| `lib/stay/token.ts` | NEW | HMAC-SHA256 sign/verify for booking URLs | 16 |
| `public/stay-sw.js` | NEW | Service worker, scoped to /(stay)/ | 16 |
| `app/api/stay/[bookingId]/chat/route.ts` | NEW | Token-gated ConciergeAgent web adapter | 16 |
| `lib/accommodation/agents/concierge/web-adapter.ts` | NEW | Web transport for existing ConciergeAgent | 16 |
| 12-07 push, BILL-08 cron, OPS-02..04 crons, 360px sweep (DraggonnB) | CARRY-FORWARD | v3.0 designs unchanged | 16 |

---

## 12. Build order — phase dependencies

```
Phase 13: Cross-product foundation (SSO + org link)
  ├─ MUST come first: nothing else works without auth bridge
  ├─ Adds: linked_trophy_org_id column, /api/sso/issue, /api/sso/consume
  └─ Blocks: Phases 14, 15, 16 cross-product features

Phase 14: Approval spine (generalization)
  ├─ Depends on: Phase 13 SSO (so Trophy users can authenticate to approve DraggonnB requests)
  ├─ 3-step migration spread across deploys (OPS-05) — SCHEDULE AS 3 SUB-PLANS
  │  14.1: add nullable columns + deploy code that writes them
  │  14.2: backfill existing social_posts rows + verify
  │  14.3: add NOT NULL constraints
  └─ Blocks: Phase 15 damage flow (uses approval spine)

Phase 15: Damage auto-billing + Hunt bookings + Cross-product link
  ├─ Depends on: Phase 13 (cross-org linking), Phase 14 (approval spine)
  ├─ Internal sub-ordering:
  │  15.1: PayFast Subscribe migration for accommodation deposits (token capture pre-req)
  │  15.2: damage_incidents table + Telegram /damage intake
  │  15.3: damage approval handler + auto-charge flow
  │  15.4: safari_hunters table (Trophy migration)
  │  15.5: safaris.accommodation_booking_id (Trophy migration) + cross-product queries
  │  15.6: per-hunter PayFast checkout in Trophy (depends on Phase 16 payment wiring) ← circular!
  └─ Blocks: Phase 16 PayFast Trophy wiring (mutual dependency on 15.6)

Phase 16: PWA + Trophy PayFast + v3.0 carry-forward
  ├─ Depends on: Phase 15 (token capture flow established)
  ├─ Cross-dependency with Phase 15.6: Trophy PayFast wiring needs to happen in Phase 16
  │  but per-hunter charges need it. SOLUTION: split 15.6 into a stub in Phase 15
  │  ("create per-hunter records, defer charge to Phase 16") + actual charge in Phase 16
  ├─ Internal:
  │  16.1: Trophy PayFast wiring (subscriptions + ad-hoc)
  │  16.2: per-hunter charge flow (completes 15.6)
  │  16.3: PWA route group + token auth
  │  16.4: Concierge web adapter
  │  16.5: v3.0 carry-forward (push 12-07, BILL-08, OPS-02..04, mobile sweep)
  └─ Blocks: nothing (final phase)
```

### Critical sequencing risks

1. **Phase 14 must NOT bundle migrations.** Generalizing `approval_requests` is 3 separate deploys per OPS-05. Plan structure must reflect this.
2. **Phase 15.1 (PayFast Subscribe migration) is a hidden pre-requisite.** Without it, no guest token = no auto-charge = damage flow fundamentally blocked. Surface this in the plan.
3. **Phase 15.6 is mutually circular with Phase 16.1.** Resolution: stub per-hunter creation in Phase 15, defer charge call to Phase 16 (which adds Trophy PayFast wiring). Plan this explicitly so Phase 15 doesn't fail at integration test.

---

## 13. RLS implications for cross-schema FK and shared tables

### `safaris.accommodation_booking_id` (Trophy → DraggonnB FK)

- FK enforced by Postgres (cross-schema, same DB)
- ON DELETE SET NULL — deleting a booking doesn't cascade-delete the safari (correct: safari is independent business object)
- RLS: Trophy `safaris` SELECT policy uses `org_members` lookup. DraggonnB user querying `safaris` via supabase client gets RLS-filtered to safaris in orgs they're members of via `org_members`. They see linked accommodation_booking_id for those safaris.
- DraggonnB user querying `accommodation_bookings` and joining to `safaris` works because Postgres applies RLS on each table. User must have BOTH `organization_users` row AND `org_members` row to see both halves of the join. Linked org pair makes this seamless.

### `approval_requests` post-generalization

- Now has rows for both products. RLS policies (defined in Section 4) handle the OR logic via three policies.
- DraggonnB-only users see only `product='draggonnb'` rows. Trophy-only users see only `product='trophy'`. Cross-product users (e.g. Swazulu owner with both rows) see both via the third "linked" policy.
- **Risk:** if a user has `organization_users` for org A and `org_members` for org B, but org A.linked_trophy_org_id != B.id (mismatched link), they shouldn't see B's approvals. The "linked" policy enforces this via the JOIN. Test exhaustively in Phase 14.

### `organizations.linked_trophy_org_id`

- FK to `orgs(id)` ON DELETE SET NULL — if Trophy org is deleted (rare), DraggonnB doesn't break
- RLS: existing SELECT policy on `organizations` uses `get_user_org_id()`. User can see their own org's `linked_trophy_org_id` value. Fine.
- Update permission: only platform admin should set this (provisioning saga). Add UPDATE policy restricting non-platform-admins.

---

## 14. Architectural decisions that need user input — flagged

These decisions have downstream blast radius and should be answered before plan creation:

| # | Decision | Default if not answered | Blast radius |
|---|----------|------------------------|--------------|
| **D-A** | **Single billing root: Option C (parallel subscriptions same card) vs Option D (synthetic invoice)** | Option C | Option D adds 1 phase + new `cross_product_invoices` table + custom ITN routing |
| **D-B** | **PayFast deposit flow conversion: switch to Subscribe (token capture) for ALL accommodation bookings, or only for bookings flagged as "incidentals-eligible"?** | All bookings | If selective, need new column `accommodation_bookings.requires_token_capture` + UI gate; if all, blanket migration |
| **D-C** | **Auto-provision Trophy `org_members` row at first SSO bridge attempt, OR require explicit Trophy admin invite?** | Auto-provision as `client` role | Auto = smoother UX, riskier if Trophy roles are sensitive; invite = friction at pilot, safer compliance |
| **D-D** | **Replay protection for SSO JWT: Redis (Upstash) vs DB-backed `sso_bridge_tokens` table?** | Redis (Upstash) | Redis = new infra dep, +cost, faster; DB = no new infra, slower, audit-friendly |
| **D-E** | **Mobile sweep scope: DraggonnB only (82 pages), or DraggonnB + Trophy (106 pages)?** | DraggonnB only | Full sweep doubles effort; partial leaves Trophy untested |
| **D-F** | **PayFast lib sharing strategy: copy into Trophy for v3.1, OR set up npm workspace immediately?** | Copy for v3.1 | Workspace = more work now, less drift later; copy = ship-fast, drift to manage |
| **D-G** | **Single Telegram bot per org for both products' approvals, OR dedicated Trophy bot?** | Single bot, product-tagged callbacks | Single bot = cleaner UX, callback parsing more complex; dual bot = doubles the bot config + token management |
| **D-H** | **`tenant_modules.config.trophy.linked_org_id` JSONB cache: maintain via app code on every write, OR Postgres trigger?** | Trigger (atomic) | Trigger = silent magic; app code = explicit but skip-able |

The four with widest blast radius (recommended to lock before plan creation): **D-A, D-B, D-C, D-F.**

---

## 15. Quality gate review

- [x] Integration points identified with file paths or table names — every component/migration in Section 11 names a path
- [x] New vs modified components explicit — Section 11 has Kind column (NEW / MODIFIED / CARRY-FORWARD)
- [x] Build order considers existing dependencies — Section 12 explicit phase ordering with circular dependency call-out (15.6 ↔ 16.1)
- [x] Cross-product table references called out with RLS implications — Section 13 covers `safaris.accommodation_booking_id`, generalized `approval_requests`, `organizations.linked_trophy_org_id`
- [x] At least 3 "needs user decision" architectural questions flagged — Section 14 has 8 decisions, 4 marked highest priority

---

## Sources

- DraggonnB middleware: `C:\Dev\draggonnb-platform\lib\supabase\middleware.ts` (read 2026-04-30, HIGH confidence)
- `getUserOrg` auth function: `C:\Dev\draggonnb-platform\lib\auth\get-user-org.ts` (read, HIGH)
- PayFast ad-hoc charge: `C:\Dev\draggonnb-platform\lib\payments\payfast-adhoc.ts` (read, HIGH)
- Accommodation PayFast link: `C:\Dev\draggonnb-platform\lib\accommodation\payments\payfast-link.ts` (read, HIGH)
- Event dispatcher: `C:\Dev\draggonnb-platform\lib\accommodation\events\dispatcher.ts` (read, HIGH)
- Telegram ops bot: `C:\Dev\draggonnb-platform\lib\accommodation\telegram\ops-bot.ts` (read, HIGH)
- approval_requests current schema: `C:\Dev\draggonnb-platform\lib\supabase\database.types.ts` L4433-4502 (read, HIGH)
- Trophy OS architecture spec: `C:\Dev\DraggonnB\products\trophy-os\CLAUDE.md` (read, HIGH)
- Trophy OS source layout: `C:\Dev\DraggonnB\products\trophy-os\src\app\` directory listing (HIGH)
- v3.0 carry-forward design: `C:\Dev\draggonnb-platform\.planning\research\v3.0-archive\ARCHITECTURE.md` (read, HIGH)
- OPS-05 multi-step migration discipline: `C:\Dev\draggonnb-platform\CLAUDE.md` (referenced, HIGH)
- PROJECT.md v3.1 milestone scope: `C:\Dev\draggonnb-platform\.planning\PROJECT.md` L148-178 (read, HIGH)

PayFast Subscribe checkout vs one-off behavior: NOT verified in this research pass (vendor docs not fetched). Flagged as MEDIUM confidence in Section 5; Phase 15.1 should include a vendor-doc spike before implementation.

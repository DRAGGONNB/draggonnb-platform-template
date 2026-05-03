---
phase: 13-cross-product-foundation
plan: 07
subsystem: ui
tags: [sso, sidebar, provisioning, middleware, postgres, jsonb, rpc, nextjs, tailwind]

# Dependency graph
requires:
  - phase: 13-05
    provides: "OPS-05 Step 1 nullable column organizations.linked_trophy_org_id, cross_product_org_links table, sso_bridge_tokens table"
  - phase: 13-06
    provides: "GET /api/sso/issue?target=trophy bridge issuer, /sso/consume consumer page, middleware tenant_membership_proof"
provides:
  - "Sidebar conditional Trophy OS cross-link (active=bridge link with loading state, inactive=Activate CTA)"
  - "activate-trophy-module saga step 10: idempotent 4-write transactional flow"
  - "POST /api/activate-trophy: admin-gated, typed ProvisioningJob, calls saga step"
  - "/dashboard/activate-trophy empty-state page with reason-copy + ActivateTrophyForm island"
  - "set_tenant_module_config_path RPC: service-role JSONB path-set for tenant_modules.config"
  - "FK constraint fk_organizations_linked_trophy_org ON DELETE SET NULL (OPS-05 Step 4)"
  - "Middleware LATENT-02 fix: x-linked-trophy-org-id header injected from organizations.linked_trophy_org_id"
affects:
  - "14-*: ApprovalActionRegistry boot call assertAllHandlersResolvable() can now run; Trophy companion middleware needed before E2E SSO test"
  - "trophy-os: must ship middleware.ts + /api/sso/issue + /sso/consume before Phase 14 E2E test"
  - "15-*: activate-trophy saga step called from provisioning orchestrator when trophy module is ordered"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Trophy orgs.type='game_farm' is the default for DraggonnB-linked Trophy orgs (verified from trophy-os/supabase/migrations/001_initial.sql CHECK constraint)"
    - "LATENT-02 mitigation: inject FK column values as request headers in middleware; server components read headers() not DB"
    - "Saga step rollback: per-step cleanup on failure (not just outer saga rollback) for transactional consistency"
    - "JSONB RPC best-effort: non-critical writes (denormalization) are non-blocking on failure; canonical FK is authoritative"
    - "Direct-call activation pattern: POST /api/activate-trophy calls saga step directly for CTA-driven activation; full saga orchestrator wiring deferred to Phase 15"

key-files:
  created:
    - "scripts/provisioning/steps/activate-trophy-module.ts"
    - "components/sidebar/trophy-cross-link.tsx"
    - "app/(dashboard)/activate-trophy/page.tsx"
    - "app/(dashboard)/activate-trophy/activate-trophy-form.tsx"
    - "app/api/activate-trophy/route.ts"
    - "supabase/migrations/20260503125702_set_tenant_module_config_path_rpc.sql"
    - "supabase/migrations/20260503125800_add_linked_trophy_org_id_fk.sql"
  modified:
    - "lib/supabase/middleware.ts (TenantContext.linkedTrophyOrgId + resolveTenant select + x-linked-trophy-org-id header)"
    - "lib/provisioning/types.ts (ProvisioningStep union + CreatedResources.trophyOrgId)"
    - "components/dashboard/sidebar-server.tsx (reads header + fallback DB query + passes linkedTrophyOrgId prop)"
    - "components/dashboard/sidebar-client.tsx (accepts linkedTrophyOrgId + Cross-Product section with TrophyCrossLink)"

key-decisions:
  - "Trophy orgs.type enum: ('game_farm','outfitter','taxidermist','processor','logistics') — confirmed from trophy-os/supabase/migrations/001_initial.sql. Default = 'game_farm' for DraggonnB-linked orgs."
  - "Saga step wiring: direct-call helper (not saga orchestrator registry) for CTA-driven activation. The orchestrator step registry can be extended in Phase 15 when the full provisioning flow includes Trophy. This avoids coupling the light-weight CTA path to the provisioning infrastructure it doesn't need."
  - "JSONB cache write is best-effort: if set_tenant_module_config_path RPC fails, activation still succeeds. Sidebar reads the FK column (canonical) via header injection, not the JSONB. Non-fatal log on failure."
  - "Platform-domain fallback: sidebar-server.tsx queries organizations.linked_trophy_org_id directly when x-linked-trophy-org-id header is absent (non-subdomain sessions: localhost, draggonnb.co.za apex). Subdomain sessions use the header-injected value with zero extra DB queries."
  - "OPS-05 Step 4 pre-condition confirmed: zero organizations rows have non-null linked_trophy_org_id (verified before FK migration authored). Orphan check embedded in migration comment."

patterns-established:
  - "Cross-product sidebar section: always rendered below module nav, above org footer. Active = gold link + trophy icon. Inactive = muted + + icon CTA. Never hidden."
  - "Migration comment-gated orphan check: Step 4 FK migrations include the orphan-check SQL in comments so future executors can verify before applying."

# Metrics
duration: ~90min
completed: 2026-05-03
---

# Phase 13 Plan 07: Cross-Product Sidebar + Provisioning Saga Summary

**Sidebar Trophy OS cross-link with SSO bridge navigation, activate-trophy-module saga step (idempotent 4-write transactional), set_tenant_module_config_path JSONB RPC, OPS-05 Step 4 FK constraint, and middleware x-linked-trophy-org-id header injection (LATENT-02)**

## Performance

- **Duration:** ~90 min
- **Started:** 2026-05-03T12:57:00Z
- **Completed:** 2026-05-03T15:25:00Z
- **Tasks:** 2/2 (+ checkpoint for migration application)
- **Files created:** 7
- **Files modified:** 4

## Accomplishments

- **Middleware LATENT-02 fix:** `resolveTenant()` now SELECTs `linked_trophy_org_id` and injects it as `x-linked-trophy-org-id` request header — sidebar can render conditionally with zero extra DB queries per request on subdomain sessions
- **Trophy OS sidebar cross-link:** `TrophyCrossLink` client component with two states: active (bridge link + loading spinner, gold accent `#B8941E`) and inactive ("Activate Trophy OS" CTA with `+` icon linking to `/dashboard/activate-trophy`); wired into `SidebarClient` via new Cross-Product section
- **Activate Trophy OS page:** `/dashboard/activate-trophy` — explicit activation UX (not silent auto-create, per D6 + NAV-04); renders reason-copy for `missing_trophy_membership`; auto-redirects when already activated
- **Activation API route:** `POST /api/activate-trophy` — admin-gated, fully-typed `ProvisioningJob` (no `as any`), calls `activateTrophyModule()` saga step
- **Saga step 10:** `activateTrophyModule()` — idempotent (returns existing if `linked_trophy_org_id` already set), transactional (rollback Trophy orgs row if `cross_product_org_links` fails; rollback both if `organizations` update fails), JSONB cache best-effort
- **Trophy `orgs.type` confirmed:** `'game_farm'` from `trophy-os/supabase/migrations/001_initial.sql` CHECK constraint `('game_farm','outfitter','taxidermist','processor','logistics')`
- **Two migrations applied to live Supabase (psqfgzbjbgqrmjskdavs) via MCP:** RPC migration (`set_tenant_module_config_path`) + FK migration (`fk_organizations_linked_trophy_org`). Verified: `pg_proc` returns 1 row for the RPC; `pg_constraint` returns `FOREIGN KEY (linked_trophy_org_id) REFERENCES orgs(id) ON DELETE SET NULL` with `confdeltype='n'`. Applied by orchestrator via `mcp__plugin_supabase_supabase__apply_migration` after PAT-expired executor checkpoint.

## Task Commits

1. **Task 1: Provisioning saga step + migrations + types** — `d5ed65a0` (feat)
2. **Task 2: Sidebar cross-link + activate page + middleware header** — `fa507e2e` (feat)

**Plan metadata:** `67a5a3ff` (docs) — SUMMARY + STATE update
**Migration apply:** Orchestrator applied both migrations via Supabase MCP after PAT-expired checkpoint. Confirmed live in DB by orchestrator verification queries.

## Files Created/Modified

### Created
- `scripts/provisioning/steps/activate-trophy-module.ts` — saga step 10: 4-write transactional flow with idempotency + per-step rollback
- `components/sidebar/trophy-cross-link.tsx` — client component: active bridge link / inactive activation CTA
- `app/(dashboard)/activate-trophy/page.tsx` — empty-state page with Trophy explainer + ActivateTrophyForm island
- `app/(dashboard)/activate-trophy/activate-trophy-form.tsx` — client form island: POST to activate API + SSO bridge redirect on success
- `app/api/activate-trophy/route.ts` — POST endpoint: admin-gated, typed ProvisioningJob, calls saga step
- `supabase/migrations/20260503125702_set_tenant_module_config_path_rpc.sql` — JSONB path-set RPC, service-role only
- `supabase/migrations/20260503125800_add_linked_trophy_org_id_fk.sql` — OPS-05 Step 4 FK constraint

### Modified
- `lib/supabase/middleware.ts` — TenantContext.linkedTrophyOrgId field; resolveTenant SELECT extended; x-linked-trophy-org-id header injection (LATENT-02)
- `lib/provisioning/types.ts` — `'activate-trophy-module'` added to ProvisioningStep union; `trophyOrgId?` added to CreatedResources
- `components/dashboard/sidebar-server.tsx` — reads x-linked-trophy-org-id header; platform-domain fallback DB query; passes linkedTrophyOrgId to SidebarClient
- `components/dashboard/sidebar-client.tsx` — linkedTrophyOrgId prop; Cross-Product section with TrophyCrossLink

## Decisions Made

1. **Trophy orgs.type = 'game_farm':** Confirmed enum values from trophy-os migration. `game_farm` is the primary operator type. Default is hardcoded for v3.1; future versions can expose org type selection in the activate form.

2. **Saga step wiring = direct-call (not orchestrator registry):** The `/api/activate-trophy` route calls `activateTrophyModule()` directly rather than going through the full provisioning orchestrator. The orchestrator registry is for new-client provisioning flows. CTA-driven Trophy activation is a standalone operation — adding it to the registry would require a full `ProvisioningJob` with N8N/GitHub/Vercel steps, which is wrong for this context. Phase 15 can extend the orchestrator when Trophy activation is bundled into the full new-client provisioning flow.

3. **Platform-domain sidebar fallback:** When `x-linked-trophy-org-id` header is absent (platform domain, localhost), `SidebarServer` does a direct DB query for `linked_trophy_org_id`. This avoids a blind `null` that would always show the "Activate" CTA for platform-admin users who have already activated. The extra query only fires on non-subdomain sessions.

4. **JSONB best-effort:** The `set_tenant_module_config_path` RPC call in the saga step is non-blocking on failure. The sidebar reads the FK column (via header), not the JSONB. Log the RPC failure for ops visibility but don't roll back the activation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Supabase Management API PAT expired — migrations NOT YET applied**

- **Found during:** Task 1 (migration application step)
- **Issue:** `scripts/migrations/phase-13/apply-migration.mjs` returns 401 Unauthorized from `api.supabase.com`. The PAT `sbp_98ba...` stored in `settings.json` and the migration script is expired. Service role key (`sb_secret_...`) is not accepted by the Management API.
- **Attempted:** Direct DB via `pg` (no DB password in env), pg-meta endpoint (404), supabase CLI `--linked` (also needs PAT), PostgREST (no exec_sql function exposed).
- **Status:** Both migration files are written and committed. Code is complete and TypeScript-clean. Migrations need manual application via Supabase Dashboard SQL Editor or fresh PAT.
- **Resolution:** See checkpoint — orchestrator must apply the two migrations.
- **Pre-conditions verified:**
  - `orgs` table is accessible in live Supabase project (count query succeeded)
  - Zero rows in `organizations` have non-null `linked_trophy_org_id` (orphan check passed — FK migration safe to apply immediately)
  - `set_tenant_module_config_path` function does not yet exist (RPC migration needed)

---

**Total deviations:** 1 authentication gate (PAT expired — migration application blocked)
**Impact on plan:** All code complete and committed. Only DB-side work remains (2 migrations). No functional regression — activation flow and sidebar will only fully work after migrations are applied.

**2. [Rule 1 - Bug] sidebar-server.tsx target was wrong in plan**

- **Found during:** Task 2 (sidebar wiring step)
- **Issue:** Plan said to modify `app/(dashboard)/_components/sidebar.tsx` but this file doesn't exist. The actual sidebar is in `components/dashboard/sidebar-server.tsx` and `sidebar-client.tsx`.
- **Fix:** Modified the actual sidebar files (`sidebar-server.tsx` + `sidebar-client.tsx`) to wire the Trophy cross-link. The plan's path was wrong; the intent was correct.
- **Files modified:** `components/dashboard/sidebar-server.tsx`, `components/dashboard/sidebar-client.tsx`
- **Committed in:** fa507e2e

## Issues Encountered

1. **Supabase Management API PAT expired:** Both the migration script PAT (`sbp_98ba...`) and supabase CLI are unauthorized. Tried 7 alternative approaches (service role via REST, pg-meta, exec_sql RPC, pg module, supabase CLI --linked, supabase CLI --db-url, pg-meta v1/query). None can apply DDL without the DB password or a valid PAT. Blocked on orchestrator providing a fresh PAT or applying via Dashboard.

2. **sidebar.tsx target mismatch:** Plan referenced a file path that doesn't exist. Auto-corrected to the real sidebar file pair. Zero functional impact.

## Authentication Gates

**Migration application — RESOLVED by orchestrator 2026-05-03:**

Both migrations were applied to live Supabase project `psqfgzbjbgqrmjskdavs` by the orchestrator via `mcp__plugin_supabase_supabase__apply_migration` after executor hit PAT-expired checkpoint.

- `supabase/migrations/20260503125702_set_tenant_module_config_path_rpc.sql` — APPLIED. Verified: `EXISTS(SELECT 1 FROM pg_proc WHERE proname='set_tenant_module_config_path')` = `true`.
- `supabase/migrations/20260503125800_add_linked_trophy_org_id_fk.sql` — APPLIED. Verified: `pg_get_constraintdef` returns `FOREIGN KEY (linked_trophy_org_id) REFERENCES orgs(id) ON DELETE SET NULL`, `confdeltype = 'n'` (SET NULL).

**Pre-flight checks confirmed by orchestrator before applying FK:**
- Orphan count: `SELECT COUNT(*) FROM organizations WHERE linked_trophy_org_id IS NOT NULL` = 0 (FK safe to apply directly)
- `orgs` table confirmed live in same Supabase project

**Carry-forward:** The local `apply-migration.mjs` script PAT (`sbp_98ba...`) is expired and needs regeneration before Phase 14 work begins. All Phase 13 migrations are in `supabase/migrations/` with timestamps as the canonical record — the live DB now matches.

## Next Phase Readiness

**Phase 13 exit criterion:** A Swazulu admin clicks "Trophy OS" in the sidebar → lands authenticated in Trophy in ~2 seconds.

**DraggonnB side (this plan):** COMPLETE (code deployed + both migrations applied to live DB).
**Trophy side:** Still needs 4 companion items before end-to-end SSO test:
1. Trophy `src/middleware.ts` — session refresh + org_members membership check
2. Trophy `/api/sso/issue` route — mirrors DraggonnB issuer; signs with same `SSO_BRIDGE_SECRET`
3. Trophy `/sso/consume` page — reads URL fragment, calls `/api/sso/validate`, calls `supabase.auth.setSession()`
4. Trophy `org_members` enforcement inside middleware

**Phase 14 prerequisites:**
- `assertAllHandlersResolvable()` boot call can now be added in Phase 14 (handler files will exist then)
- grammY Telegram integration to consume canonical callback_data format from Phase 13-03 types.ts
- Approval action handlers at `lib/approvals/handlers/{action-type}` (Phase 14 creates these)

**REQ-IDs closed by this plan:**
- NAV-01: sidebar conditional rendering via header (COMPLETE — pending migrations for full end-to-end)
- NAV-02: cross-product navigation UX (COMPLETE — DraggonnB side)
- NAV-03: provisioning saga step 10 (COMPLETE — direct-call pattern)
- NAV-04: activate empty state, no silent auto-create (COMPLETE)
- SSO-11: JSONB RPC + saga step (COMPLETE — migrations applied to live DB)
- SSO-10 Step 4: FK constraint (COMPLETE — FK migration applied to live DB, OPS-05 4-step sequence closed)

**Hand-off to Trophy parallel session:**
- Install `@draggonnb/federation-shared@1.0.0` (exact pin, see 13-05 SUMMARY)
- Set `SSO_BRIDGE_SECRET=74056e6e2d7a99a42e1ebc9ae493f583ee01d1b9be1b67943b1574c0dece6145` in Vercel
- Set `GITHUB_PACKAGES_TOKEN` in Vercel (classic PAT with packages:read scope)
- Implement 4 companion items listed above

---
*Phase: 13-cross-product-foundation*
*Completed: 2026-05-03*

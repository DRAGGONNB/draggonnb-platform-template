---
phase: 12
plan_id: 12-03
title: organizations.activated_at migration (multi-step OPS-05)
wave: 2
depends_on: []
files_modified:
  - supabase/migrations/51_organizations_activated_at_nullable.sql
  - supabase/migrations/52_organizations_activated_at_backfill.sql
  - lib/billing/new-tenant-period.ts
  - app/api/webhooks/payfast/route.ts
  - __tests__/lib/billing/new-tenant-period.test.ts
autonomous: true
estimated_loc: 180
estimated_dev_minutes: 75
---

## Objective

Add `organizations.activated_at TIMESTAMPTZ` column properly per OPS-05 multi-step migration discipline (one change per migration; never combine add + constraint on a populated table). Today `lib/billing/new-tenant-period.ts` (CAMP-08) falls back to `created_at` because the column doesn't exist on the live DB despite being in `00_initial_schema.sql`. Backfill from `created_at` for existing rows so `isInNewTenantPeriod()` returns the same answer for them as today, then update PayFast webhook to set `activated_at` on the first successful subscription payment going forward.

Purpose: CAMP-08 (campaigns default to draft-then-review for first 30 days of a new tenant) currently uses signup time, not first-payment time, as the "activation" signal. A tenant that signs up free-trial style and converts a month later would skip the safety window. Migration closes this off.

## must_haves

**Truths:**
- `organizations.activated_at` column exists on live Supabase project `psqfgzbjbgqrmjskdavs`.
- Every existing organization row has `activated_at` populated (backfilled from `created_at`).
- `isInNewTenantPeriod(orgId)` reads `activated_at` (no fallback to `created_at`).
- New PayFast subscription payments set `activated_at = NOW()` if NULL (first activation only — does not overwrite on subsequent payments).
- No NOT NULL constraint added in this plan — remains NULLABLE per OPS-05 step 1; constraint is a future migration.

**Artifacts:**
- `supabase/migrations/51_organizations_activated_at_nullable.sql` adds column NULLABLE (idempotent — `ADD COLUMN IF NOT EXISTS`).
- `supabase/migrations/52_organizations_activated_at_backfill.sql` runs `UPDATE organizations SET activated_at = created_at WHERE activated_at IS NULL`.
- `lib/billing/new-tenant-period.ts` reads `activated_at` and returns `false` if NULL (defensive — should never happen post-backfill).
- `app/api/webhooks/payfast/route.ts` (or whatever the ITN handler is) sets `activated_at` on first successful DRG-* payment.
- Unit test in `__tests__/lib/billing/new-tenant-period.test.ts` — verifies (a) within 30d returns true, (b) >30d returns false, (c) NULL returns false (not throws).

**Key links:**
- Migration 51 must precede migration 52 — never combine. Migration 52 is the ONLY UPDATE statement; no DDL.
- The ITN webhook activation must be idempotent — wrap in `WHERE activated_at IS NULL` so duplicate webhooks don't reset the timer.
- `isInNewTenantPeriod()` must remove its `created_at` fallback only AFTER backfill is verified zero NULLs.

## Tasks

<task id="1">
  <title>Migration 51 + 52: add column NULLABLE, then backfill</title>
  <files>
    supabase/migrations/51_organizations_activated_at_nullable.sql
    supabase/migrations/52_organizations_activated_at_backfill.sql
  </files>
  <actions>
    File `51_organizations_activated_at_nullable.sql`:
    ```sql
    -- Phase 12-03 step 1 of 2 (OPS-05 multi-step discipline).
    -- Add organizations.activated_at as NULLABLE.
    -- Step 2 backfills existing rows. NOT NULL constraint is a FUTURE migration (do not add here).

    ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

    CREATE INDEX IF NOT EXISTS idx_organizations_activated_at
    ON organizations(activated_at)
    WHERE activated_at IS NOT NULL;
    ```

    File `52_organizations_activated_at_backfill.sql`:
    ```sql
    -- Phase 12-03 step 2 of 2.
    -- Backfill existing rows from created_at. Only fills NULLs — idempotent on rerun.

    UPDATE organizations
    SET activated_at = created_at
    WHERE activated_at IS NULL;

    -- Verification query (manual):
    -- SELECT COUNT(*) FROM organizations WHERE activated_at IS NULL;
    -- Expected: 0
    ```

    Apply via `scripts/migrations/phase-12/apply-migration.mjs` (model on phase-10 helper; if it doesn't exist yet, create it copying the phase-10 pattern). Use management API PAT — Supabase MCP unavailable per STATE.md.

    After applying both migrations, run via the management API:
    ```sql
    SELECT COUNT(*) AS null_count FROM organizations WHERE activated_at IS NULL;
    ```
    Expect `null_count = 0`. If non-zero, debug before continuing — do NOT proceed to task 2.
  </actions>
  <verification>
    - Both migrations apply cleanly to live Supabase project.
    - `\d organizations` shows `activated_at TIMESTAMPTZ` (no NOT NULL).
    - `SELECT COUNT(*) WHERE activated_at IS NULL` returns 0.
    - Migration files committed to repo with the two-step pattern visibly documented.
  </verification>
</task>

<task id="2">
  <title>Update isInNewTenantPeriod + PayFast webhook to use activated_at</title>
  <files>
    lib/billing/new-tenant-period.ts
    app/api/webhooks/payfast/route.ts
    __tests__/lib/billing/new-tenant-period.test.ts
  </files>
  <actions>
    1. Open `lib/billing/new-tenant-period.ts`. Replace the `created_at` fallback with `activated_at` direct read:
       ```typescript
       export async function isInNewTenantPeriod(orgId: string): Promise<boolean> {
         const supabase = createAdminClient()
         const { data: org } = await supabase
           .from('organizations')
           .select('activated_at')
           .eq('id', orgId)
           .single()
         if (!org?.activated_at) return false  // defensive — backfill should prevent this
         const activatedAt = new Date(org.activated_at)
         const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
         return Date.now() - activatedAt.getTime() < thirtyDaysMs
       }
       ```
       Remove any reference to `created_at` from this file. Update the JSDoc to reflect the change.

    2. Open `app/api/webhooks/payfast/route.ts` (the ITN handler). Find the branch that handles successful `DRG-*` (subscription) payments. After confirming the payment succeeded, add:
       ```typescript
       // Set activated_at on first successful subscription payment (idempotent — does nothing if already set).
       await supabase
         .from('organizations')
         .update({ activated_at: new Date().toISOString() })
         .eq('id', orgId)
         .is('activated_at', null)
       ```
       This is intentionally idempotent — the `.is('activated_at', null)` guard means duplicate webhooks don't reset the new-tenant timer.

    3. Create `__tests__/lib/billing/new-tenant-period.test.ts` (or add to existing test file if one exists). Tests:
       - Activation 1 day ago → returns true.
       - Activation 35 days ago → returns false.
       - `activated_at = null` → returns false (does not throw).
       - Use `vi.mock('@/lib/supabase/admin')` to stub the client. Pattern matches Phase 11 test setup.
  </actions>
  <verification>
    - `npm test -- new-tenant-period` passes (3 tests minimum).
    - Grep `lib/billing/new-tenant-period.ts` for `created_at` — zero matches.
    - Grep `app/api/webhooks/payfast/` for `activated_at` — at least one match.
    - Manually verify the webhook integration via PayFast sandbox test (subscription create → ITN fires → org row's `activated_at` populated). If sandbox is not available in this session, document as a runtime check for the next deploy.
  </verification>
</task>

## Verification

- `npm run typecheck` clean.
- `npm test` clean.
- Migration files visibly OPS-05 compliant: separate ADD and UPDATE files; no NOT NULL added; idempotent guards (`IF NOT EXISTS`, `WHERE ... IS NULL`).
- After deploy, run on live DB: `SELECT COUNT(*) FROM organizations WHERE activated_at IS NULL` — expect 0.

## Out of scope

- Adding NOT NULL constraint — a FUTURE migration once we've observed zero NULLs in production for ≥1 week.
- Backfilling differently for paying vs trial orgs (they all use `created_at` — close enough; trial→paid will overwrite-via-webhook).
- Removing `created_at`-based logic elsewhere — only the new-tenant period helper changes here.

## REQ-IDs closed

None directly — this is CAMP-08 cleanup (CAMP-08 is already marked Complete in REQUIREMENTS.md). Plan removes the `created_at` fallback debt that Phase 11 deferred.

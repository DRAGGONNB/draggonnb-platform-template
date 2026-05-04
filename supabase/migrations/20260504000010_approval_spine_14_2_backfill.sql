-- Phase 14.2 — Idempotent backfill of legacy social-post approval_requests rows
-- Per OPS-05: NO DDL in this migration; UPDATE statements only.
-- Idempotency: every UPDATE has WHERE column IS NULL guard.
-- Row count: < 100 (RESEARCH.md confirmed). Single statement, no batching.
-- Pre-flight confirmed: 0 rows in approval_requests at time of deploy (2026-05-04).

-- Step 1: Backfill product-scoped columns from legacy post_id
UPDATE approval_requests
SET
  product               = 'draggonnb',
  target_resource_type  = 'social_post',
  target_resource_id    = post_id::text,
  target_org_id         = organization_id,
  action_type           = 'social_post',
  action_payload        = jsonb_build_object('post_id', post_id),
  proposed_to           = 'all_admins',
  assigned_approvers    = COALESCE(assigned_to, ARRAY[]::uuid[])
WHERE product IS NULL
  AND post_id IS NOT NULL;  -- Defensive: only touch rows that have a legacy post_id

-- Step 2: Backfill expires_at for rows where it is still NULL (existing social-post default = 48h)
UPDATE approval_requests
SET expires_at = created_at + INTERVAL '48 hours'
WHERE expires_at IS NULL
  AND created_at IS NOT NULL;

-- Step 3: Backfill any remaining rows without created_at (defensive — should be zero)
-- These would be DB-corrupted records; expire them ASAP so cron sweep can auto-reject
UPDATE approval_requests
SET expires_at = now() + INTERVAL '1 hour'
WHERE expires_at IS NULL;

-- Verification (raises NOTICE on success, EXCEPTION if any NULL remains):
DO $$
DECLARE
  v_remaining_nulls integer;
BEGIN
  SELECT COUNT(*) INTO v_remaining_nulls
  FROM approval_requests
  WHERE product IS NULL
     OR target_resource_type IS NULL
     OR target_resource_id IS NULL
     OR target_org_id IS NULL
     OR action_type IS NULL
     OR action_payload IS NULL
     OR proposed_to IS NULL
     OR expires_at IS NULL;

  IF v_remaining_nulls > 0 THEN
    RAISE EXCEPTION 'Backfill incomplete: % rows still have NULL in backfill-target columns. Investigate before 14-03.', v_remaining_nulls;
  END IF;

  RAISE NOTICE 'Backfill verified: 0 NULLs across all 8 backfill-target columns.';
END $$;

-- Phase 14.3 — SET NOT NULL on backfilled columns (14-02 verified zero NULLs)
-- Pre-condition: 14-02 backfill migration confirmed 0 NULLs across all 7 target cols
ALTER TABLE approval_requests
  ALTER COLUMN product              SET NOT NULL,
  ALTER COLUMN target_resource_type SET NOT NULL,
  ALTER COLUMN target_resource_id   SET NOT NULL,
  ALTER COLUMN target_org_id        SET NOT NULL,
  ALTER COLUMN action_type          SET NOT NULL,
  ALTER COLUMN proposed_to          SET NOT NULL,
  ALTER COLUMN expires_at           SET NOT NULL;
-- action_payload remains nullable (some action_types have empty payloads, e.g. some Trophy stubs)
-- post_id stays nullable (legacy, dropped in Phase 17)

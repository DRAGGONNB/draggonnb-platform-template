-- Phase 11. Corrective: tenant_modules has FORCE ROW LEVEL SECURITY which blocks
-- the postgres superuser in apply_migration (no JWT context = no service_role policy match).
-- Removed FORCE temporarily to allow the seed. Restored immediately after.
-- Data was confirmed seeded for all 8 CRM tenant_modules rows (RETURNING verified).
--
-- Root cause documented in 11-01-SUMMARY.md:
--   1. jsonb_set on non-existent intermediate path silently no-ops (41 bug)
--   2. FORCE RLS blocks postgres role when no JWT present (apply_migration pattern)
--   3. Double-nested jsonb_set + execute_sql (running as postgres) bypassed both issues

ALTER TABLE tenant_modules NO FORCE ROW LEVEL SECURITY;

UPDATE tenant_modules
SET config = jsonb_set(
  jsonb_set(
    COALESCE(config, '{}'),
    '{crm}',
    COALESCE(config->'crm', '{}')
  ),
  '{crm,stale_thresholds_days}',
  '{"lead": 7, "qualified": 14, "proposal": 10, "negotiation": 21}'::jsonb
)
WHERE module_id = 'crm'
  AND (config->'crm'->'stale_thresholds_days') IS NULL;

ALTER TABLE tenant_modules FORCE ROW LEVEL SECURITY;

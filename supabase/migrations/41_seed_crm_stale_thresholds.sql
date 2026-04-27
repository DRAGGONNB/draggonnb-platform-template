-- Phase 11. Seeds default stale thresholds onto existing CRM tenants.
-- New provisioning step inserts these by default — see Plan 11-08.
--
-- Uses REAL DB deal-stage enum values: lead/qualified/proposal/negotiation
-- (NOT CONTEXT.md's stale discovery/qualification/closing — those are incorrect).
-- Idempotent: WHERE clause skips rows that already have stale_thresholds_days set.
--
-- NOTE: jsonb_set with multi-level path on non-existent intermediate keys silently
-- produces no change. Double-nested jsonb_set ensures the 'crm' key is created first.
-- See corrective migrations 41b + 41c for RLS bypass history (FORCE RLS on tenant_modules
-- blocks postgres role in apply_migration; data was seeded via execute_sql directly).

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

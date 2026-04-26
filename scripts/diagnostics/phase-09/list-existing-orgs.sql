-- scripts/diagnostics/phase-09/list-existing-orgs.sql
-- Phase 09-05 Diagnostic 4: Existing-org classification (test/dormant/paying)
-- Read-only. Run via Supabase SQL editor or psql.
--
-- FINDINGS (confirmed 2026-04-26):
--   8 total organizations. 0 paying (no PayFast ITN ever received).
--   0 with payfast_subscription_token. 0 agent_sessions rows. 0 usage_events rows.
--
--   Classifications:
--     test    — 4 orgs (name/id signals: Test Restaurant ABC, Demo Company,
--                        chrisctserv's Org, Swa-Zulu Game Lodge uuid-pattern)
--     dormant — 4 orgs (seeded data from accommodation module — Sunset Beach Resort,
--                        TechStart Solutions — or provisioning: FIGARIE,
--                        DragoonB Business Automation)
--     paying  — 0 orgs (Chris confirmed; query verifies)

SELECT
  o.id,
  o.name,
  o.subdomain,
  o.subscription_tier,
  o.subscription_status,
  o.created_at::DATE                                                         AS created_date,
  -- Activity signals (all zero in current state)
  (SELECT MAX(recorded_at) FROM usage_events   WHERE organization_id = o.id) AS last_usage_event,
  (SELECT MAX(created_at)  FROM agent_sessions WHERE organization_id = o.id) AS last_agent_call,
  (SELECT COUNT(*)         FROM organization_users WHERE organization_id = o.id) AS user_count,
  -- Billing state
  o.payfast_subscription_token IS NOT NULL                                    AS has_payfast_token,
  o.subscription_status IN ('active', 'trial')                               AS billing_active,
  -- Heuristic classification
  CASE
    WHEN o.name ILIKE '%test%'
      OR o.name ILIKE '%demo%'
      OR o.subdomain ILIKE '%test%'
      OR o.id::TEXT = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'  -- sequential seed UUID
    THEN 'test'
    WHEN o.subscription_status NOT IN ('active', 'trial')
    THEN 'dormant'
    WHEN o.payfast_subscription_token IS NULL
      AND (SELECT COUNT(*) FROM usage_events WHERE organization_id = o.id) = 0
      AND (SELECT COUNT(*) FROM agent_sessions WHERE organization_id = o.id) = 0
    THEN 'dormant'
    ELSE 'paying'
  END                                                                          AS classification
FROM organizations o
ORDER BY o.created_at;

-- Expected output (see 09-DIAGNOSTICS.md Section 4 for full table)
-- All 8 orgs returned; classification: 4 test, 4 dormant, 0 paying.
-- Chris's claim verified: no paying orgs.

-- === Phase 10 action summary ===
-- test:    DELETE FROM organizations WHERE id IN (...) -- cascade cleans all child rows
-- dormant: soft-archive (ALTER TABLE organizations ADD COLUMN archived_at TIMESTAMPTZ) +
--          UPDATE organizations SET archived_at = now() WHERE id IN (...)
-- paying:  N/A (none exist; if found, safety-net: pause + manual review before billing migration)

-- === End of diagnostic ===

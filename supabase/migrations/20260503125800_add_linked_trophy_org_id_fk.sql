-- Phase 13 Plan 07 — OPS-05 Step 4 of 4 for organizations.linked_trophy_org_id.
-- Adds FK constraint AFTER plan 13-05 added the column nullable (Step 1)
-- and AFTER Trophy's `orgs` table existence is confirmed in the live DB.
-- Per CLAUDE.md OPS-05: never bundle "add column" + "add constraint" on populated tables.
--
-- Pre-condition check (run manually before applying):
--   SELECT COUNT(*) FROM organizations
--   WHERE linked_trophy_org_id IS NOT NULL
--     AND linked_trophy_org_id NOT IN (SELECT id FROM orgs);
-- Must return 0 — if non-zero, investigate orphans before applying.
--
-- linked_trophy_org_id stays NULLABLE forever:
-- orgs without Trophy activation have NULL, which is valid.

ALTER TABLE organizations
  ADD CONSTRAINT fk_organizations_linked_trophy_org
  FOREIGN KEY (linked_trophy_org_id)
  REFERENCES orgs(id)
  ON DELETE SET NULL;

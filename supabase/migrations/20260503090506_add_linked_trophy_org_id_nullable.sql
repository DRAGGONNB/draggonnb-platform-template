-- Phase 13 Plan 05 — OPS-05 Step 1 of 4 for linked_trophy_org_id.
-- SSO-10: nullable column added now; FK constraint deferred to a later migration
-- after Trophy schema confirmed (plan 13-07 verifies + adds FK in separate file).

ALTER TABLE organizations
  ADD COLUMN linked_trophy_org_id UUID NULL;

CREATE INDEX idx_organizations_linked_trophy
  ON organizations(linked_trophy_org_id)
  WHERE linked_trophy_org_id IS NOT NULL;

COMMENT ON COLUMN organizations.linked_trophy_org_id IS 'OPS-05 Step 1: nullable column. FK to orgs(id) added in a later migration when activate-trophy-module saga step ships (plan 13-07).';

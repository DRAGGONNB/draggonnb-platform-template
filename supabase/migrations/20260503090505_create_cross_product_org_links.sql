-- Phase 13 Plan 05 — Cross-product org junction.
-- SSO-09: maps DraggonnB organizations.id -> Trophy orgs.id, one-to-one for v3.1.
-- D6: written by activate-trophy-module saga step in plan 13-07.

CREATE TABLE cross_product_org_links (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draggonnb_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  trophy_org_id    UUID NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active', 'inactive', 'pending')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (draggonnb_org_id, trophy_org_id)
);

CREATE INDEX idx_cross_product_links_draggonnb ON cross_product_org_links(draggonnb_org_id);
CREATE INDEX idx_cross_product_links_trophy ON cross_product_org_links(trophy_org_id);

ALTER TABLE cross_product_org_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_product_org_links FORCE ROW LEVEL SECURITY;

-- SELECT policy: a user with org_users membership in either side can read the row.
CREATE POLICY cross_product_links_select_authenticated
  ON cross_product_org_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.organization_id = cross_product_org_links.draggonnb_org_id
        AND ou.user_id = auth.uid()
        AND ou.is_active = true
    )
    OR
    EXISTS (
      SELECT 1 FROM org_members om
      WHERE om.org_id = cross_product_org_links.trophy_org_id
        AND om.user_id = auth.uid()
        AND om.is_active = true
    )
  );

-- INSERT/UPDATE/DELETE only via service-role (no policy = blocked for anon/authenticated).

COMMENT ON TABLE cross_product_org_links IS 'Cross-product org junction (SSO-09). One row per active DraggonnB <-> Trophy org pair.';

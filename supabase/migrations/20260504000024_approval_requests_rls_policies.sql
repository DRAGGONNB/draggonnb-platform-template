-- Phase 14.3 — RLS policies for approval_requests (3 OR-stacked SELECT per APPROVAL-16)
-- Drop any pre-existing legacy policies on approval_requests SELECT before installing new stack
DROP POLICY IF EXISTS approval_requests_admin_select ON approval_requests;
DROP POLICY IF EXISTS approval_requests_org_select ON approval_requests;

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_requests FORCE ROW LEVEL SECURITY;

-- Policy 1: DraggonnB approvers see DraggonnB rows in their org
CREATE POLICY approval_requests_draggonnb_approvers ON approval_requests
  FOR SELECT USING (
    product = 'draggonnb'
    AND target_org_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = target_org_id
        AND ou.role IN ('admin','manager')
    )
  );

-- Policy 2: Trophy approvers see Trophy rows in their org
CREATE POLICY approval_requests_trophy_approvers ON approval_requests
  FOR SELECT USING (
    product = 'trophy'
    AND target_org_id = get_user_org_id()
    AND EXISTS (
      SELECT 1 FROM organization_users ou
      WHERE ou.user_id = auth.uid()
        AND ou.organization_id = target_org_id
        AND ou.role IN ('admin','manager')
    )
  );

-- Policy 3: Cross-product linked owners (proposer of the resource) — sees their own request regardless of role
CREATE POLICY approval_requests_proposer_select ON approval_requests
  FOR SELECT USING (
    requested_by = auth.uid()
  );

-- INSERT: only authenticated users into their own org
CREATE POLICY approval_requests_insert ON approval_requests
  FOR INSERT WITH CHECK (
    target_org_id = get_user_org_id()
    AND requested_by = auth.uid()
  );

-- UPDATE: blocked at policy level — all status transitions go through approve_request_atomic SECURITY DEFINER
CREATE POLICY approval_requests_no_direct_update ON approval_requests
  FOR UPDATE USING (false);

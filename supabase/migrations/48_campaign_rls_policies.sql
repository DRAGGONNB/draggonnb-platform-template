-- Phase 11. Single-purpose migration per OPS-05. RLS policies for campaign tables only.
-- Separate from DDL migrations (43, 44, 46, 47) per OPS-05 discipline.

-- ============================================================================
-- campaigns
-- ============================================================================
CREATE POLICY campaigns_org_read ON campaigns
  FOR SELECT
  USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY campaigns_org_write ON campaigns
  FOR ALL
  USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY campaigns_service_role ON campaigns
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- campaign_drafts
-- ============================================================================
CREATE POLICY campaign_drafts_org_read ON campaign_drafts
  FOR SELECT
  USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY campaign_drafts_org_write ON campaign_drafts
  FOR ALL
  USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY campaign_drafts_service_role ON campaign_drafts
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- campaign_runs
-- User-write goes through API which uses service role; users get org-scoped read.
-- ============================================================================
CREATE POLICY campaign_runs_org_read ON campaign_runs
  FOR SELECT
  USING (organization_id = (SELECT public.get_user_org_id()));

CREATE POLICY campaign_runs_service_role ON campaign_runs
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- campaign_run_items
-- Service role only -- users read via JOIN through campaign_runs in application layer.
-- ============================================================================
CREATE POLICY campaign_run_items_service_role ON campaign_run_items
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

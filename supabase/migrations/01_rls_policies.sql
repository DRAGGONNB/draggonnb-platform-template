-- DraggonnB CRMM - Row Level Security (RLS) Policies
-- Generated: 2025-12-01
-- Version: 1.0.0

-- ============================================================================
-- CRITICAL SECURITY: Enable RLS on all tables
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_usage_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================

-- Users can view their own organization
CREATE POLICY "Users can view own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their own organization (admin only)
CREATE POLICY "Admins can update own organization"
  ON organizations FOR UPDATE
  USING (
    id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role has full access (for API operations)
CREATE POLICY "Service role full access to organizations"
  ON organizations FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can view users in their organization
CREATE POLICY "Users can view org members"
  ON users FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid());

-- Admins can manage users in their organization
CREATE POLICY "Admins can manage org users"
  ON users FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Service role has full access
CREATE POLICY "Service role full access to users"
  ON users FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- CLIENT_USAGE_METRICS TABLE POLICIES
-- ============================================================================

-- Users can view their organization's usage metrics
CREATE POLICY "Users can view org usage metrics"
  ON client_usage_metrics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role can update usage metrics (for automated processes)
CREATE POLICY "Service role can update usage metrics"
  ON client_usage_metrics FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SUBSCRIPTION_HISTORY TABLE POLICIES
-- ============================================================================

-- Users can view their organization's subscription history
CREATE POLICY "Users can view org subscription history"
  ON subscription_history FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role can insert/update subscription history (for webhook processing)
CREATE POLICY "Service role can manage subscription history"
  ON subscription_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- SOCIAL_POSTS TABLE POLICIES
-- ============================================================================

-- Users can view posts in their organization
CREATE POLICY "Users can view org posts"
  ON social_posts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create posts in their organization
CREATE POLICY "Users can create org posts"
  ON social_posts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can update posts in their organization
CREATE POLICY "Users can update org posts"
  ON social_posts FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can delete posts they created
CREATE POLICY "Users can delete own posts"
  ON social_posts FOR DELETE
  USING (
    created_by = auth.uid() OR
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Service role has full access (for N8N workflows)
CREATE POLICY "Service role full access to posts"
  ON social_posts FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- ANALYTICS_SNAPSHOTS TABLE POLICIES
-- ============================================================================

-- Users can view their organization's analytics
CREATE POLICY "Users can view org analytics"
  ON analytics_snapshots FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role can manage analytics (for automated collection)
CREATE POLICY "Service role can manage analytics"
  ON analytics_snapshots FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- PLATFORM_METRICS TABLE POLICIES
-- ============================================================================

-- Users can view metrics for posts in their organization
CREATE POLICY "Users can view org platform metrics"
  ON platform_metrics FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- Service role can manage metrics (for automated collection)
CREATE POLICY "Service role can manage platform metrics"
  ON platform_metrics FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Run these queries to verify RLS is enabled:
--
-- SELECT tablename, rowsecurity
-- FROM pg_tables
-- WHERE schemaname = 'public'
-- ORDER BY tablename;
--
-- Expected: rowsecurity = TRUE for all tables

-- List all policies:
--
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- Test as authenticated user (replace with actual user ID):
-- SET request.jwt.claims.sub TO 'user-uuid-here';
--
-- Try to query data from another organization:
-- SELECT * FROM organizations WHERE id != 'your-org-id';
-- Expected: Should return 0 rows
--
-- Try to query your own organization:
-- SELECT * FROM organizations WHERE id = 'your-org-id';
-- Expected: Should return 1 row

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================

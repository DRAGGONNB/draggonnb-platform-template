-- Fix get_user_org_id() to:
-- 1. Filter by is_active = true (was missing)
-- 2. Deterministically pick highest-tier org when user has multiple memberships
-- 3. Keep STABLE SECURITY DEFINER for RLS compatibility
--
-- Root cause: Users with multiple org memberships got LIMIT 1 with no ordering,
-- returning the wrong (lower-tier) org. This caused tier-gated features to fail
-- with 403 errors across 70+ API routes.

CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ou.organization_id
  FROM public.organization_users ou
  JOIN public.organizations o ON o.id = ou.organization_id
  WHERE ou.user_id = auth.uid()
    AND ou.is_active = true
  ORDER BY
    CASE o.subscription_tier
      WHEN 'platform_admin' THEN 99
      WHEN 'scale' THEN 4
      WHEN 'enterprise' THEN 4
      WHEN 'growth' THEN 3
      WHEN 'professional' THEN 3
      WHEN 'core' THEN 2
      WHEN 'starter' THEN 2
      ELSE 1
    END DESC,
    ou.created_at ASC
  LIMIT 1;
$$;

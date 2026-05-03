-- Phase 13 Plan 07 — RPC for safe JSONB path-set merging.
-- Used by activate-trophy-module saga step to update tenant_modules.config.trophy.linked_org_id
-- without replacing the entire JSONB blob.
-- Resolves Open Question 5 from 13-SSO-SPIKE.md.

CREATE OR REPLACE FUNCTION set_tenant_module_config_path(
  p_organization_id UUID,
  p_module_id TEXT,
  p_path TEXT[],
  p_value TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE tenant_modules
  SET config = jsonb_set(
    COALESCE(config, '{}'::jsonb),
    p_path,
    to_jsonb(p_value),
    true  -- create_missing
  )
  WHERE organization_id = p_organization_id
    AND module_id = p_module_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No tenant_modules row for org=% module=%', p_organization_id, p_module_id;
  END IF;
END;
$$;

-- Restrict to service-role only (saga steps use admin client).
-- anon and authenticated cannot call this function.
REVOKE EXECUTE ON FUNCTION set_tenant_module_config_path(UUID, TEXT, TEXT[], TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION set_tenant_module_config_path(UUID, TEXT, TEXT[], TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION set_tenant_module_config_path(UUID, TEXT, TEXT[], TEXT) FROM authenticated;

COMMENT ON FUNCTION set_tenant_module_config_path IS
  'Phase 13 / SSO-11: safe JSONB path-set for tenant_modules.config without full-blob replacement. Service-role only.';

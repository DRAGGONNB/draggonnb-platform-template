-- Phase 13 Plan 05 — SSO bridge replay-protection table.
-- D7: DB-backed jti tracking, single-use, 60s TTL.
-- No user-facing RLS policies — service-role client only.

CREATE TABLE sso_bridge_tokens (
  jti          UUID PRIMARY KEY,
  user_id      UUID NOT NULL,
  origin_org   UUID NOT NULL,
  target_org   UUID NOT NULL,
  product      TEXT NOT NULL CHECK (product IN ('draggonnb', 'trophy')),
  issued_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ NULL
);

CREATE INDEX idx_sso_bridge_tokens_expires ON sso_bridge_tokens(expires_at);
CREATE INDEX idx_sso_bridge_tokens_user ON sso_bridge_tokens(user_id);

ALTER TABLE sso_bridge_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE sso_bridge_tokens FORCE ROW LEVEL SECURITY;
-- Intentionally NO policies for anon or authenticated roles.
-- All read/write via service-role client only (createAdminClient).
-- This is consistent with audit_log handling.

COMMENT ON TABLE sso_bridge_tokens IS 'SSO bridge JWT replay-protection (D7, SSO-03). Service-role access only.';

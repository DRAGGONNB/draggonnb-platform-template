-- Phase 14.1 — Telegram update_id replay protection (APPROVAL-09)
-- Table must exist BEFORE any webhook code runs in 14-03
-- v3.1 trade-off: service_role only access. No RLS SELECT policy because bot_org_id mapping
-- is non-trivial in single-bot-per-org world (D9 — webhook receives all updates and routes by org).
-- Admin audit happens via direct DB query, not via app. Defer admin RLS visibility to v3.2.

CREATE TABLE IF NOT EXISTS telegram_update_log (
  update_id    bigint PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now(),
  bot_org_id   uuid REFERENCES organizations(id)  -- NULL allowed in v3.1 (column reserved for v3.2)
);

CREATE INDEX IF NOT EXISTS telegram_update_log_cleanup_idx
  ON telegram_update_log (processed_at);

-- RLS enabled but NO SELECT policy in v3.1: service_role bypasses RLS entirely; no app-level reads.
-- Comment retained on table for ops awareness.
ALTER TABLE telegram_update_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_update_log FORCE ROW LEVEL SECURITY;

COMMENT ON TABLE telegram_update_log IS
  'service_role only access in v3.1; admin audit via direct DB query. Defer admin RLS visibility to v3.2 when bot_org_id mapping is wired.';

-- Phase 14.1 — Approval spine: add nullable product-scoped columns
-- OPS-05: ALL columns nullable EXCEPT handler_run_count (DEFAULT handles existing rows)

-- Drop NOT NULL on post_id (legacy social-post FK; retained nullable for Phase 17 cleanup)
ALTER TABLE approval_requests
  ALTER COLUMN post_id DROP NOT NULL;

-- Add product-scoped columns (all nullable)
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS product               text,
  ADD COLUMN IF NOT EXISTS target_resource_type  text,
  ADD COLUMN IF NOT EXISTS target_resource_id    text,
  ADD COLUMN IF NOT EXISTS target_org_id         uuid,
  ADD COLUMN IF NOT EXISTS action_type           text,
  ADD COLUMN IF NOT EXISTS action_payload        jsonb,
  ADD COLUMN IF NOT EXISTS notify_on_complete    jsonb,        -- proposer-feedback config (CONTEXT C3) — dedicated col, NOT nested in action_payload
  ADD COLUMN IF NOT EXISTS proposed_to           text,         -- 'all_admins' | 'specific_user'
  ADD COLUMN IF NOT EXISTS assigned_approvers    uuid[],
  ADD COLUMN IF NOT EXISTS telegram_message_id   bigint,       -- two-pass message edit
  ADD COLUMN IF NOT EXISTS telegram_chat_id      bigint,       -- two-pass message edit
  ADD COLUMN IF NOT EXISTS rejection_reason      text,         -- free text for 'other'
  ADD COLUMN IF NOT EXISTS rejection_reason_code text;         -- 'wrong_amount'|'not_chargeable'|'need_more_info'|'other'

-- handler_run_count is the OPS-05 exception — NOT NULL with DEFAULT is safe on populated tables
-- because DEFAULT 0 fills existing rows immediately during ADD COLUMN
ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS handler_run_count integer NOT NULL DEFAULT 0;

-- Index for cron sweep on expires_at (expires_at already exists nullable on this table)
CREATE INDEX IF NOT EXISTS approval_requests_expires_pending_idx
  ON approval_requests (expires_at)
  WHERE status = 'pending';

-- Index for /approvals "My queue" tab lookups
CREATE INDEX IF NOT EXISTS approval_requests_assigned_approvers_gin
  ON approval_requests USING GIN (assigned_approvers);

-- Index for product-scoped queries (used by /approvals grouping)
CREATE INDEX IF NOT EXISTS approval_requests_product_status_idx
  ON approval_requests (product, status);

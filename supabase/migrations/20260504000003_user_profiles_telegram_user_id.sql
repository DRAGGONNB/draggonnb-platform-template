-- Phase 14.1 — telegram_user_id mapping for APPROVAL-11 verifyApprover()
-- Bot's /auth activation flow (14-03) writes this column; verifyApprover() reads it

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS telegram_user_id bigint;

-- UNIQUE constraint prevents one Telegram account from binding to multiple user_profiles
-- Partial UNIQUE on non-null only (allows multiple NULLs during rollout)
CREATE UNIQUE INDEX IF NOT EXISTS user_profiles_telegram_user_id_unique
  ON user_profiles (telegram_user_id)
  WHERE telegram_user_id IS NOT NULL;

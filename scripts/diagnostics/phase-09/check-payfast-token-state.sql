-- scripts/diagnostics/phase-09/check-payfast-token-state.sql
-- Phase 09-05 Diagnostic 3: PayFast token-overwrite state
-- Read-only. Run via Supabase SQL editor or psql.
--
-- FINDINGS (confirmed 2026-04-26 via PostgREST against live DB):
--   All 8 organizations have payfast_subscription_token = NULL
--   No token-overwrite bug could have manifested (no ITN ever received)
--   The old ITN handler (pre-09-02) would have written pf_payment_id as the token —
--   but no PayFast ITN has ever fired against this environment.
--   Post-09-02 rewrite correctly reads from ITN.token, not pf_payment_id.
--   ERR-030 is latent-fixed: the bug was present in code but never executed in prod.

-- === 1. Token distribution across all orgs ===
SELECT
  COUNT(*) AS total_orgs,
  SUM(CASE WHEN payfast_subscription_token IS NULL THEN 1 ELSE 0 END)     AS null_token,
  SUM(CASE WHEN payfast_subscription_token IS NOT NULL THEN 1 ELSE 0 END) AS has_token
FROM organizations;

-- Expected: total_orgs=8, null_token=8, has_token=0

-- === 2. Per-org token state ===
SELECT
  id,
  name,
  subscription_status,
  subscription_tier,
  payfast_subscription_token IS NULL AS token_is_null,
  created_at
FROM organizations
ORDER BY created_at;

-- Expected: all 8 rows have token_is_null = true

-- === 3. Token length analysis (for any future tokens received) ===
-- PayFast subscription tokens are UUID-shaped (36 chars with dashes)
-- pf_payment_id values are typically numeric short strings (~12 chars)
SELECT
  AVG(LENGTH(payfast_subscription_token))    AS avg_length,
  MIN(LENGTH(payfast_subscription_token))    AS min_length,
  MAX(LENGTH(payfast_subscription_token))    AS max_length,
  SUM(CASE
    WHEN payfast_subscription_token ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN 1 ELSE 0
  END) AS uuid_shaped,
  SUM(CASE
    WHEN payfast_subscription_token ~ '^[0-9]+$'
    THEN 1 ELSE 0
  END) AS numeric_only
FROM organizations
WHERE payfast_subscription_token IS NOT NULL;

-- Expected: no rows (all tokens are NULL) -> returns single row with NULLs

-- === 4. ITN write audit: what the old handler would have written ===
-- The pre-09-02 webhook wrote:
--   payfast_subscription_token = pf_payment_id  (WRONG — ERR-030)
--   monthly_posts_used = 0                       (WRONG — column doesn't exist, ERR-032)
--   monthly_ai_generations_used = 0             (WRONG — column doesn't exist, ERR-032)
-- The post-09-02 webhook writes:
--   payfast_subscription_token = itnData['token'] (CORRECT — from PayFast ITN.token)
--   No usage reset (removed in 09-02, cleanup in Phase 10 USAGE-13)

-- === End of diagnostic ===

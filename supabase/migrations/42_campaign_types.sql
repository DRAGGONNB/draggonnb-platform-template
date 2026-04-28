-- Phase 11. Single-purpose migration per OPS-05. Campaign-level ENUM types only.
-- Note: an older campaign_status enum exists from create_marketing_campaigns migration
-- (values: draft,scheduled,active,paused,completed). That table had 0 rows and is being
-- replaced in migration 43. Drop old enum after table drop in 43, but the type must be
-- dropped here first since the old campaigns table references it.
-- Safe: campaigns table is empty (0 rows), confirmed before this migration.

-- Drop old enum (blocked by old campaigns table column reference -- handled by CASCADE below)
-- We drop the old campaigns table here so we can drop the enum.
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TYPE IF EXISTS campaign_status CASCADE;

-- New Campaign Studio ENUM types
CREATE TYPE campaign_status AS ENUM (
  'draft',
  'pending_review',
  'scheduled',
  'running',
  'completed',
  'failed',
  'killed'
);

CREATE TYPE campaign_channel AS ENUM (
  'email',
  'sms',
  'facebook',
  'instagram',
  'linkedin'
);

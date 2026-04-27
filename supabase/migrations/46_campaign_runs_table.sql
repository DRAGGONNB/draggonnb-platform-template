-- Phase 11. Single-purpose migration per OPS-05. campaign_runs table only.

CREATE TABLE campaign_runs (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id       UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status            run_status  NOT NULL DEFAULT 'pending',
  -- cron_job_name: set at schedule time as 'campaign_run_' || id::text
  -- Used by cron.unschedule() in the kill-switch RPC (migration 49)
  cron_job_name     TEXT        UNIQUE,
  scheduled_at      TIMESTAMPTZ,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  items_total       INTEGER     NOT NULL DEFAULT 0,
  items_sent        INTEGER     NOT NULL DEFAULT 0,
  items_failed      INTEGER     NOT NULL DEFAULT 0,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaign_runs_org ON campaign_runs (organization_id);
CREATE INDEX idx_campaign_runs_campaign ON campaign_runs (campaign_id);

-- RLS enabled + forced (policies in migration 48)
ALTER TABLE campaign_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_runs FORCE ROW LEVEL SECURITY;

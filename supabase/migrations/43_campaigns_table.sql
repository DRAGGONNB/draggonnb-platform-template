-- Phase 11. Single-purpose migration per OPS-05. campaigns table only.
-- The old campaigns table (CRM-era, different schema, 0 rows) was dropped in migration 42
-- along with the old campaign_status enum. This creates the Campaign Studio campaigns table.

CREATE TABLE campaigns (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  intent            TEXT        NOT NULL,
  status            campaign_status NOT NULL DEFAULT 'draft',
  scheduled_at      TIMESTAMPTZ,
  channels          campaign_channel[] NOT NULL DEFAULT '{}',
  -- force_review: admin override flag for the 30-day brand-safety gate.
  -- When TRUE the next run skips the automatic 30-day approval window check.
  -- Counter-intuitive read: "force_review=true" means "force it through review NOW",
  -- not "always force a review". Name kept per RESEARCH B section 2 spec.
  force_review      BOOLEAN     NOT NULL DEFAULT false,
  -- OPS-05 step 1: created_by/approved_by nullable (new table; no backfill needed).
  created_by        UUID,
  approved_by       UUID,
  approved_at       TIMESTAMPTZ,
  published_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaigns_org ON campaigns (organization_id);
CREATE INDEX idx_campaigns_org_status ON campaigns (organization_id, status);
CREATE INDEX idx_campaigns_scheduled_at ON campaigns (scheduled_at) WHERE scheduled_at IS NOT NULL;

-- RLS enabled + forced (policies in migration 48)
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

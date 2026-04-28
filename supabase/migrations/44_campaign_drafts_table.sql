-- Phase 11. Single-purpose migration per OPS-05. campaign_drafts table only.

CREATE TABLE campaign_drafts (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id           UUID        NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id       UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  channel               campaign_channel NOT NULL,
  subject               TEXT,
  body_html             TEXT,
  body_text             TEXT,
  media_urls            TEXT[]      NOT NULL DEFAULT '{}',
  -- brand_safe: NULL = not yet checked, TRUE = passed brand safety, FALSE = flagged
  brand_safe            BOOLEAN,
  safety_flags          TEXT[]      NOT NULL DEFAULT '{}',
  is_approved           BOOLEAN     NOT NULL DEFAULT false,
  approved_at           TIMESTAMPTZ,
  regeneration_count    INTEGER     NOT NULL DEFAULT 0,
  -- agent_session_id: no FK constraint -- agent_sessions has no PK we can rely on cross-RLS
  agent_session_id      UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One draft per channel per campaign
  UNIQUE (campaign_id, channel)
);

-- Indexes
CREATE INDEX idx_campaign_drafts_campaign ON campaign_drafts (campaign_id);
CREATE INDEX idx_campaign_drafts_org ON campaign_drafts (organization_id);

-- RLS enabled + forced (policies in migration 48)
ALTER TABLE campaign_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_drafts FORCE ROW LEVEL SECURITY;

-- updated_at trigger
CREATE TRIGGER update_campaign_drafts_updated_at
  BEFORE UPDATE ON campaign_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

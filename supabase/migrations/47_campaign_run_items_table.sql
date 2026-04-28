-- Phase 11. Single-purpose migration per OPS-05. campaign_run_items table only.

CREATE TABLE campaign_run_items (
  id                    UUID            PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id                UUID            NOT NULL REFERENCES campaign_runs(id) ON DELETE CASCADE,
  -- No cascade on campaign_draft_id -- keep audit trail even if draft is regenerated
  campaign_draft_id     UUID            REFERENCES campaign_drafts(id),
  channel               campaign_channel NOT NULL,
  status                run_item_status NOT NULL DEFAULT 'pending',
  recipient_ref         TEXT,
  provider_message_id   TEXT,
  -- published_url: set after verify step (social posts, email tracking URLs)
  published_url         TEXT,
  sent_at               TIMESTAMPTZ,
  verified_at           TIMESTAMPTZ,
  error_code            TEXT,
  error_message         TEXT,
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_campaign_run_items_run ON campaign_run_items (run_id);

-- RLS enabled + forced (policies in migration 48)
ALTER TABLE campaign_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_run_items FORCE ROW LEVEL SECURITY;

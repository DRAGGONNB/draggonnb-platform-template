-- Phase 11. NEW table — CONTEXT.md assumed it existed; researcher confirmed it did not.
-- Single-purpose migration per OPS-05.

CREATE TABLE IF NOT EXISTS crm_activities (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type       TEXT        NOT NULL CHECK (entity_type IN ('contact','deal','company')),
  entity_id         UUID        NOT NULL,
  action_type       TEXT        NOT NULL CHECK (action_type IN (
                                  'email_sent','stage_moved','task_created','note_added',
                                  'deal_archived','snoozed','dismissed'
                                )),
  source            TEXT        NOT NULL DEFAULT 'advanced' CHECK (source IN ('easy_view','advanced','automation','api')),
  metadata          JSONB       NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Composite index for org-scoped entity timeline queries
CREATE INDEX IF NOT EXISTS crm_activities_org_entity_idx
  ON crm_activities (organization_id, entity_type, entity_id, created_at DESC);

-- Partial index for Easy-view activity feed (filters by source quickly)
CREATE INDEX IF NOT EXISTS crm_activities_org_easy_view_idx
  ON crm_activities (organization_id, source)
  WHERE source = 'easy_view';

-- Enable and force RLS
ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_activities FORCE ROW LEVEL SECURITY;

-- Policy: authenticated users can read activities for their org
CREATE POLICY "org members read crm_activities"
  ON crm_activities
  FOR SELECT
  USING (organization_id = get_user_org_id());

-- Policy: authenticated users can write activities for their org
CREATE POLICY "org members insert crm_activities"
  ON crm_activities
  FOR INSERT
  WITH CHECK (organization_id = get_user_org_id());

-- Policy: service role has full access (automation, N8N)
CREATE POLICY "service role full access crm_activities"
  ON crm_activities
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

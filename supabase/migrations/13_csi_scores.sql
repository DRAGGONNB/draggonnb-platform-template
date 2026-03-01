-- DraggonnB OS - CSI Scores Table
-- Migration: 13_csi_scores.sql

CREATE TABLE IF NOT EXISTS csi_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  overall INTEGER NOT NULL CHECK (overall >= 0 AND overall <= 100),
  band TEXT NOT NULL CHECK (band IN ('green', 'yellow', 'orange', 'red')),
  components JSONB NOT NULL DEFAULT '{}',
  recommendation TEXT,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(organization_id)
);

CREATE INDEX IF NOT EXISTS idx_csi_scores_band ON csi_scores (band);

ALTER TABLE csi_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "csi_scores_select" ON csi_scores
  FOR SELECT TO authenticated
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY "csi_scores_service_all" ON csi_scores
  FOR ALL TO service_role
  USING (true);

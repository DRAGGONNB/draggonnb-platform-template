-- Elijah Module: Incident & Timeline Tables

CREATE TABLE elijah_incident (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type elijah_incident_type NOT NULL,
  severity elijah_severity NOT NULL DEFAULT 'medium',
  status elijah_incident_status NOT NULL DEFAULT 'open',
  location geography(Point, 4326),
  description text NOT NULL DEFAULT '',
  reported_by uuid NOT NULL REFERENCES elijah_member(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE elijah_incident_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES elijah_incident(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES elijah_member(id) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT elijah_incident_assignment_unique UNIQUE (incident_id, member_id)
);

CREATE TABLE elijah_incident_timeline_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES elijah_incident(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid REFERENCES elijah_member(id) ON DELETE SET NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE elijah_incident_attachment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES elijah_incident(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_type text,
  uploaded_by uuid NOT NULL REFERENCES elijah_member(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_elijah_incident_org_status ON elijah_incident(organization_id, status);
CREATE INDEX idx_elijah_incident_org_severity ON elijah_incident(organization_id, severity);
CREATE INDEX idx_elijah_incident_org_created ON elijah_incident(organization_id, created_at DESC);
CREATE INDEX idx_elijah_incident_type ON elijah_incident(organization_id, type);
CREATE INDEX idx_elijah_incident_timeline_incident ON elijah_incident_timeline_event(incident_id, created_at DESC);
CREATE INDEX idx_elijah_incident_assignment_incident ON elijah_incident_assignment(incident_id);
CREATE INDEX idx_elijah_incident_attachment_incident ON elijah_incident_attachment(incident_id);

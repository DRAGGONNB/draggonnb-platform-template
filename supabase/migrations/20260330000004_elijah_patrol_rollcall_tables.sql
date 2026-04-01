-- Elijah Module: Patrol & Roll Call Tables

-- Roll call schedules
CREATE TABLE elijah_rollcall_schedule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  section_id uuid REFERENCES elijah_section(id) ON DELETE SET NULL,
  time time NOT NULL,
  grace_minutes integer NOT NULL DEFAULT 10,
  escalation_tiers jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Roll call check-ins
CREATE TABLE elijah_rollcall_checkin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id uuid NOT NULL REFERENCES elijah_rollcall_schedule(id) ON DELETE CASCADE,
  household_id uuid NOT NULL REFERENCES elijah_household(id) ON DELETE CASCADE,
  status elijah_checkin_status NOT NULL DEFAULT 'pending',
  checked_in_by uuid REFERENCES elijah_member(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Patrol definitions
CREATE TABLE elijah_patrol (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  section_id uuid REFERENCES elijah_section(id) ON DELETE SET NULL,
  scheduled_date date NOT NULL,
  start_time time,
  end_time time,
  recurrence text, -- e.g. 'daily', 'weekly:mon,wed,fri'
  status elijah_patrol_status NOT NULL DEFAULT 'scheduled',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Patrol assignments
CREATE TABLE elijah_patrol_assignment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_id uuid NOT NULL REFERENCES elijah_patrol(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE,
  CONSTRAINT elijah_patrol_assignment_unique UNIQUE (patrol_id, member_id)
);

-- Patrol check-ins
CREATE TABLE elijah_patrol_checkin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patrol_id uuid NOT NULL REFERENCES elijah_patrol(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES elijah_member(id) ON DELETE CASCADE,
  checkin_type elijah_checkin_type NOT NULL,
  location geography(Point, 4326),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- SOP templates
CREATE TABLE elijah_sop_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES elijah_member(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checklist templates
CREATE TABLE elijah_checklist_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checklist instances (created per patrol)
CREATE TABLE elijah_checklist_instance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES elijah_checklist_template(id) ON DELETE CASCADE,
  patrol_id uuid REFERENCES elijah_patrol(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Checklist item instances
CREATE TABLE elijah_checklist_item_instance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_instance_id uuid NOT NULL REFERENCES elijah_checklist_instance(id) ON DELETE CASCADE,
  item_label text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text
);

-- Indexes
CREATE INDEX idx_elijah_rollcall_schedule_org ON elijah_rollcall_schedule(organization_id);
CREATE INDEX idx_elijah_rollcall_checkin_schedule ON elijah_rollcall_checkin(schedule_id, household_id, created_at DESC);
CREATE INDEX idx_elijah_patrol_org_status ON elijah_patrol(organization_id, status, scheduled_date);
CREATE INDEX idx_elijah_patrol_checkin_patrol ON elijah_patrol_checkin(patrol_id, created_at DESC);

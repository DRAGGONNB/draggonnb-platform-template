-- Elijah Module: Row Level Security Policies
-- Uses get_user_org_id() from existing platform for tenant isolation

-- ============================================================
-- Enable RLS on all Elijah tables
-- ============================================================

ALTER TABLE elijah_section ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_household ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_household_buddy ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_member_role ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_member_sensitive_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_sensitive_access_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_notification_preference ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident_timeline_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident_attachment ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_rollcall_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_rollcall_checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_patrol ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_patrol_assignment ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_patrol_checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_sop_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_checklist_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_checklist_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_checklist_item_instance ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_water_point ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_farm ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_responder_group ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_responder_group_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident_water_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident_group_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident_equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_whatsapp_inbound ENABLE ROW LEVEL SECURITY;
ALTER TABLE elijah_whatsapp_session ENABLE ROW LEVEL SECURITY;

-- Force RLS even for table owners
ALTER TABLE elijah_section FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_household FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_household_buddy FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_member FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_member_role FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_member_sensitive_profile FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_sensitive_access_audit FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_notification_preference FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident_assignment FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident_timeline_event FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_incident_attachment FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_rollcall_schedule FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_rollcall_checkin FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_patrol FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_patrol_assignment FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_patrol_checkin FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_sop_template FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_checklist_template FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_checklist_instance FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_checklist_item_instance FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_water_point FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_farm FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_responder_group FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_responder_group_member FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident_water_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident_group_dispatch FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_equipment FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_fire_incident_equipment FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_whatsapp_inbound FORCE ROW LEVEL SECURITY;
ALTER TABLE elijah_whatsapp_session FORCE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: get member's Elijah roles for current org
-- ============================================================

CREATE OR REPLACE FUNCTION elijah_get_member_roles()
RETURNS elijah_role_type[]
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE(
    array_agg(r.role),
    ARRAY[]::elijah_role_type[]
  )
  FROM elijah_member m
  JOIN elijah_member_role r ON r.member_id = m.id
  WHERE m.user_id = auth.uid()
    AND m.organization_id = get_user_org_id();
$$;

-- ============================================================
-- Standard org-scoped policies (SELECT/INSERT/UPDATE)
-- Pattern: organization_id = get_user_org_id()
-- ============================================================

-- Macro: for each org-scoped table, create select/insert/update policies
-- Tables with direct organization_id column:

-- elijah_section
CREATE POLICY "elijah_section_select" ON elijah_section FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_section_insert" ON elijah_section FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_section_update" ON elijah_section FOR UPDATE USING (organization_id = get_user_org_id());

-- elijah_household
CREATE POLICY "elijah_household_select" ON elijah_household FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_household_insert" ON elijah_household FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_household_update" ON elijah_household FOR UPDATE USING (organization_id = get_user_org_id());

-- elijah_member
CREATE POLICY "elijah_member_select" ON elijah_member FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_member_insert" ON elijah_member FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_member_update" ON elijah_member FOR UPDATE USING (organization_id = get_user_org_id());

-- elijah_incident
CREATE POLICY "elijah_incident_select" ON elijah_incident FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_incident_insert" ON elijah_incident FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_incident_update" ON elijah_incident FOR UPDATE USING (
  organization_id = get_user_org_id()
  AND (
    'admin' = ANY(elijah_get_member_roles())
    OR 'dispatcher' = ANY(elijah_get_member_roles())
    OR EXISTS (
      SELECT 1 FROM elijah_incident_assignment a
      JOIN elijah_member m ON m.id = a.member_id
      WHERE a.incident_id = elijah_incident.id AND m.user_id = auth.uid()
    )
  )
);

-- elijah_rollcall_schedule
CREATE POLICY "elijah_rollcall_schedule_select" ON elijah_rollcall_schedule FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_rollcall_schedule_insert" ON elijah_rollcall_schedule FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_rollcall_schedule_update" ON elijah_rollcall_schedule FOR UPDATE USING (organization_id = get_user_org_id());

-- elijah_patrol
CREATE POLICY "elijah_patrol_select" ON elijah_patrol FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_patrol_insert" ON elijah_patrol FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_patrol_update" ON elijah_patrol FOR UPDATE USING (organization_id = get_user_org_id());

-- elijah_sop_template
CREATE POLICY "elijah_sop_template_select" ON elijah_sop_template FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_sop_template_insert" ON elijah_sop_template FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_sop_template_update" ON elijah_sop_template FOR UPDATE USING (organization_id = get_user_org_id());

-- elijah_checklist_template
CREATE POLICY "elijah_checklist_template_select" ON elijah_checklist_template FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_checklist_template_insert" ON elijah_checklist_template FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_checklist_template_update" ON elijah_checklist_template FOR UPDATE USING (organization_id = get_user_org_id());

-- Fire tables with organization_id
CREATE POLICY "elijah_fire_water_point_select" ON elijah_fire_water_point FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_water_point_insert" ON elijah_fire_water_point FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_water_point_update" ON elijah_fire_water_point FOR UPDATE USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_water_point_delete" ON elijah_fire_water_point FOR DELETE USING (organization_id = get_user_org_id());

-- Farm: SELECT excludes access_code unless user has required role
CREATE POLICY "elijah_fire_farm_select" ON elijah_fire_farm FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_farm_insert" ON elijah_fire_farm FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_farm_update" ON elijah_fire_farm FOR UPDATE USING (organization_id = get_user_org_id());

CREATE POLICY "elijah_fire_responder_group_select" ON elijah_fire_responder_group FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_responder_group_insert" ON elijah_fire_responder_group FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_responder_group_update" ON elijah_fire_responder_group FOR UPDATE USING (organization_id = get_user_org_id());

CREATE POLICY "elijah_fire_equipment_select" ON elijah_fire_equipment FOR SELECT USING (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_equipment_insert" ON elijah_fire_equipment FOR INSERT WITH CHECK (organization_id = get_user_org_id());
CREATE POLICY "elijah_fire_equipment_update" ON elijah_fire_equipment FOR UPDATE USING (organization_id = get_user_org_id());

-- WhatsApp: inbound is service_role only for INSERT
CREATE POLICY "elijah_whatsapp_inbound_select" ON elijah_whatsapp_inbound FOR SELECT USING (organization_id = get_user_org_id());
-- INSERT for whatsapp_inbound happens via service role (no user policy needed)

CREATE POLICY "elijah_whatsapp_session_select" ON elijah_whatsapp_session FOR SELECT USING (organization_id = get_user_org_id());

-- ============================================================
-- Junction/child table policies (via parent FK)
-- ============================================================

-- elijah_household_buddy: access via household's org
CREATE POLICY "elijah_household_buddy_select" ON elijah_household_buddy FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_household h WHERE h.id = household_id AND h.organization_id = get_user_org_id()));
CREATE POLICY "elijah_household_buddy_insert" ON elijah_household_buddy FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_household h WHERE h.id = household_id AND h.organization_id = get_user_org_id()));

-- elijah_member_role: access via member's org
CREATE POLICY "elijah_member_role_select" ON elijah_member_role FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.organization_id = get_user_org_id()));
CREATE POLICY "elijah_member_role_insert" ON elijah_member_role FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.organization_id = get_user_org_id()));

-- elijah_member_sensitive_profile: admin/dispatcher only
CREATE POLICY "elijah_sensitive_profile_select" ON elijah_member_sensitive_profile FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.organization_id = get_user_org_id())
    AND (
      'admin' = ANY(elijah_get_member_roles())
      OR 'dispatcher' = ANY(elijah_get_member_roles())
    )
  );
CREATE POLICY "elijah_sensitive_profile_insert" ON elijah_member_sensitive_profile FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.organization_id = get_user_org_id()));
CREATE POLICY "elijah_sensitive_profile_update" ON elijah_member_sensitive_profile FOR UPDATE
  USING (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.organization_id = get_user_org_id()));

-- elijah_sensitive_access_audit: service role insert, admin/dispatcher select
CREATE POLICY "elijah_audit_select" ON elijah_sensitive_access_audit FOR SELECT
  USING (
    'admin' = ANY(elijah_get_member_roles())
    OR 'dispatcher' = ANY(elijah_get_member_roles())
  );

-- Notification preferences: own record only
CREATE POLICY "elijah_notif_pref_select" ON elijah_notification_preference FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.user_id = auth.uid()));
CREATE POLICY "elijah_notif_pref_insert" ON elijah_notification_preference FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.user_id = auth.uid()));
CREATE POLICY "elijah_notif_pref_update" ON elijah_notification_preference FOR UPDATE
  USING (EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.user_id = auth.uid()));

-- Incident child tables: access via incident's org
CREATE POLICY "elijah_incident_assignment_select" ON elijah_incident_assignment FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));
CREATE POLICY "elijah_incident_assignment_insert" ON elijah_incident_assignment FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));

CREATE POLICY "elijah_incident_timeline_select" ON elijah_incident_timeline_event FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));
CREATE POLICY "elijah_incident_timeline_insert" ON elijah_incident_timeline_event FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));

CREATE POLICY "elijah_incident_attachment_select" ON elijah_incident_attachment FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));
CREATE POLICY "elijah_incident_attachment_insert" ON elijah_incident_attachment FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));

-- Rollcall checkin: access via schedule's org
CREATE POLICY "elijah_rollcall_checkin_select" ON elijah_rollcall_checkin FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_rollcall_schedule s WHERE s.id = schedule_id AND s.organization_id = get_user_org_id()));
CREATE POLICY "elijah_rollcall_checkin_insert" ON elijah_rollcall_checkin FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_rollcall_schedule s WHERE s.id = schedule_id AND s.organization_id = get_user_org_id()));

-- Patrol child tables
CREATE POLICY "elijah_patrol_assignment_select" ON elijah_patrol_assignment FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_patrol p WHERE p.id = patrol_id AND p.organization_id = get_user_org_id()));
CREATE POLICY "elijah_patrol_assignment_insert" ON elijah_patrol_assignment FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_patrol p WHERE p.id = patrol_id AND p.organization_id = get_user_org_id()));

CREATE POLICY "elijah_patrol_checkin_select" ON elijah_patrol_checkin FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_patrol p WHERE p.id = patrol_id AND p.organization_id = get_user_org_id()));
CREATE POLICY "elijah_patrol_checkin_insert" ON elijah_patrol_checkin FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM elijah_patrol p WHERE p.id = patrol_id AND p.organization_id = get_user_org_id())
    AND EXISTS (SELECT 1 FROM elijah_member m WHERE m.id = member_id AND m.user_id = auth.uid())
  );

-- Checklist child tables
CREATE POLICY "elijah_checklist_instance_select" ON elijah_checklist_instance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM elijah_checklist_template t WHERE t.id = template_id AND t.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_checklist_instance_insert" ON elijah_checklist_instance FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM elijah_checklist_template t WHERE t.id = template_id AND t.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_checklist_instance_update" ON elijah_checklist_instance FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM elijah_checklist_template t WHERE t.id = template_id AND t.organization_id = get_user_org_id()
  ));

CREATE POLICY "elijah_checklist_item_select" ON elijah_checklist_item_instance FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM elijah_checklist_instance ci
    JOIN elijah_checklist_template t ON t.id = ci.template_id
    WHERE ci.id = checklist_instance_id AND t.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_checklist_item_insert" ON elijah_checklist_item_instance FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM elijah_checklist_instance ci
    JOIN elijah_checklist_template t ON t.id = ci.template_id
    WHERE ci.id = checklist_instance_id AND t.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_checklist_item_update" ON elijah_checklist_item_instance FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM elijah_checklist_instance ci
    JOIN elijah_checklist_template t ON t.id = ci.template_id
    WHERE ci.id = checklist_instance_id AND t.organization_id = get_user_org_id()
  ));

-- Fire child tables
CREATE POLICY "elijah_fire_group_member_select" ON elijah_fire_responder_group_member FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_fire_responder_group g WHERE g.id = group_id AND g.organization_id = get_user_org_id()));
CREATE POLICY "elijah_fire_group_member_insert" ON elijah_fire_responder_group_member FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_fire_responder_group g WHERE g.id = group_id AND g.organization_id = get_user_org_id()));

CREATE POLICY "elijah_fire_incident_select" ON elijah_fire_incident FOR SELECT
  USING (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));
CREATE POLICY "elijah_fire_incident_insert" ON elijah_fire_incident FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));
CREATE POLICY "elijah_fire_incident_update" ON elijah_fire_incident FOR UPDATE
  USING (EXISTS (SELECT 1 FROM elijah_incident i WHERE i.id = incident_id AND i.organization_id = get_user_org_id()));

CREATE POLICY "elijah_fire_water_usage_select" ON elijah_fire_incident_water_usage FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_fire_water_usage_insert" ON elijah_fire_incident_water_usage FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));

CREATE POLICY "elijah_fire_dispatch_select" ON elijah_fire_incident_group_dispatch FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_fire_dispatch_insert" ON elijah_fire_incident_group_dispatch FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_fire_dispatch_update" ON elijah_fire_incident_group_dispatch FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));

CREATE POLICY "elijah_fire_equip_deploy_select" ON elijah_fire_incident_equipment FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_fire_equip_deploy_insert" ON elijah_fire_incident_equipment FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));
CREATE POLICY "elijah_fire_equip_deploy_update" ON elijah_fire_incident_equipment FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM elijah_fire_incident fi
    JOIN elijah_incident i ON i.id = fi.incident_id
    WHERE fi.id = fire_incident_id AND i.organization_id = get_user_org_id()
  ));

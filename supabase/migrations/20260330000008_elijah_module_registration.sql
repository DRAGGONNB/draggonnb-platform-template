-- Elijah Module: Register in module_registry
-- This enables the security_ops module for tenant gating

INSERT INTO module_registry (id, display_name, description, min_tier, routes, tables, is_active)
VALUES (
  'security_ops',
  'Security & Response (Elijah)',
  'Community safety, roll calls, incident reporting, fire management, patrol coordination, and WhatsApp-based escalation workflows',
  'starter',
  ARRAY['/elijah', '/api/elijah'],
  ARRAY['elijah_section','elijah_household','elijah_household_buddy','elijah_member','elijah_member_role','elijah_member_sensitive_profile','elijah_sensitive_access_audit','elijah_notification_preference','elijah_incident','elijah_incident_assignment','elijah_incident_timeline_event','elijah_incident_attachment','elijah_rollcall_schedule','elijah_rollcall_checkin','elijah_patrol','elijah_patrol_assignment','elijah_patrol_checkin','elijah_sop_template','elijah_checklist_template','elijah_checklist_instance','elijah_checklist_item_instance','elijah_fire_water_point','elijah_fire_farm','elijah_fire_responder_group','elijah_fire_responder_group_member','elijah_fire_incident','elijah_fire_incident_water_usage','elijah_fire_incident_group_dispatch','elijah_fire_equipment','elijah_fire_incident_equipment','elijah_whatsapp_inbound','elijah_whatsapp_session'],
  true
)
ON CONFLICT (id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  routes = EXCLUDED.routes,
  tables = EXCLUDED.tables,
  is_active = EXCLUDED.is_active;

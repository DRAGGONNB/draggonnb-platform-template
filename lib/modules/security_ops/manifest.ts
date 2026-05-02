// lib/modules/security_ops/manifest.ts
// MANIFEST-02: descriptive only. No executable code, no side effects, no imports beyond the type.
// Describes what the Elijah Security Ops module ALREADY does as of v2.3 / v3.0.
// Elijah uses WhatsApp (not Telegram) for incident comms — telegram_callbacks is empty.

import type { ModuleManifest } from '../types'

export const securityOpsManifest: ModuleManifest = {
  id: 'security_ops',
  name: 'Elijah Security Ops',
  version: '1.0.0',
  product: 'draggonnb',

  required_tenant_inputs: [
    {
      key: 'security_ops.escalation_chain',
      type: 'json',
      label: 'Incident Escalation Chain',
      placeholder: '[{"role": "guard", "notify_after_minutes": 0}, {"role": "supervisor", "notify_after_minutes": 5}]',
      required: false,
      // defaults to community-defined chain if absent
    },
    {
      key: 'security_ops.fire_alert_radius_km',
      type: 'number',
      label: 'Fire Alert Broadcast Radius (km)',
      placeholder: '5',
      required: false,
    },
  ],

  emitted_events: [
    { event_type: 'incident.opened', description: 'Security incident opened via WhatsApp intake or manual entry' },
    { event_type: 'incident.escalated', description: 'Incident escalated to next tier in escalation chain' },
    { event_type: 'roll_call.completed', description: 'Scheduled roll call confirmed by all members' },
    { event_type: 'fire_alert.broadcast', description: 'Fire alert broadcast to all units within configured radius' },
  ],

  // Elijah uses incident escalation, not approval gates (incidents are confirmed, not approved)
  approval_actions: [],

  // Elijah uses WhatsApp for comms, not Telegram — no Telegram callbacks as of v3.0
  telegram_callbacks: [],

  // Elijah does not produce invoice lines
  billing_line_types: [],
}

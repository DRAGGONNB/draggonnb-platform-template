// lib/modules/crm/manifest.ts
// MANIFEST-02: descriptive only. No executable code, no side effects, no imports beyond the type.
// Describes what the CRM & Campaign Studio module ALREADY does as of v3.0.

import type { ModuleManifest } from '../types'

export const crmManifest: ModuleManifest = {
  id: 'crm',
  name: 'CRM & Campaign Studio',
  version: '1.0.0',
  product: 'draggonnb',

  required_tenant_inputs: [
    {
      key: 'crm.engagement_score_weights',
      type: 'json',
      label: 'Engagement Score Weights',
      placeholder: '{"open": 1, "click": 3, "reply": 10, "manual": 15}',
      required: false,
      // defaults from wf-crm-engagement-score.json; override per-tenant if needed
    },
    {
      key: 'crm.stale_thresholds_days',
      type: 'json',
      label: 'Stale Lead Thresholds (days per deal stage)',
      placeholder: '{"new_lead": 7, "contacted": 14, "proposal_sent": 21}',
      required: false,
    },
  ],

  emitted_events: [
    { event_type: 'lead.created', description: 'New lead captured via /api/leads/capture or form' },
    { event_type: 'lead.qualified', description: 'LeadQualifierAgent scored a lead above threshold' },
    { event_type: 'deal.won', description: 'Deal moved to won stage' },
    { event_type: 'deal.lost', description: 'Deal moved to lost stage' },
    { event_type: 'deal.stage_changed', description: 'Deal stage changed (any transition)' },
    { event_type: 'contact.engaged', description: 'Contact registered an engagement event (open/click/reply)' },
  ],

  approval_actions: [
    {
      action_type: 'content_post',
      display_name: 'Content Post Approval',
      required_roles: ['admin', 'manager'],
      handler_path: 'lib/approvals/handlers/content-post',
      description: 'Approve/reject a scheduled social or email post (v3.0 social-post gate, backward-compat per APPROVAL-02)',
    },
  ],

  // CRM does not own Telegram approvals as of v3.0; approvals route through dashboard UI
  telegram_callbacks: [],

  // CRM is not a billing source — it consumes billing data via dashboards
  billing_line_types: [],
}

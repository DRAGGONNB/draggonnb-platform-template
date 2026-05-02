// lib/modules/analytics/manifest.ts
// MANIFEST-02: descriptive only. No executable code, no side effects, no imports beyond the type.
// Analytics is a read-only consumer of cross-module data; no inputs, events, approvals, or billing emissions.

import type { ModuleManifest } from '../types'

export const analyticsManifest: ModuleManifest = {
  id: 'analytics',
  name: 'Analytics',
  version: '1.0.0',
  product: 'draggonnb',

  // Analytics reads existing module data; no per-tenant config inputs required
  required_tenant_inputs: [],

  // Analytics does not emit events; it aggregates events from other modules
  emitted_events: [],

  approval_actions: [],

  telegram_callbacks: [],

  // Analytics does not produce invoice lines; it reports on billing data from other modules
  billing_line_types: [],
}

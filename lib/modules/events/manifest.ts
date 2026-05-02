// lib/modules/events/manifest.ts
// MANIFEST-02: descriptive only. No executable code, no side effects, no imports beyond the type.
// Placeholder manifest — events module is referenced in module_registry but not yet feature-active in v3.1.
// Fields reflect planned shape; actual events/billing TBD when module activates.

import type { ModuleManifest } from '../types'

export const eventsManifest: ModuleManifest = {
  id: 'events',
  name: 'Events',
  version: '1.0.0',
  product: 'draggonnb',

  required_tenant_inputs: [
    {
      key: 'events.default_currency',
      type: 'text',
      label: 'Default Currency',
      placeholder: 'ZAR',
      required: false,
      options: ['ZAR', 'USD', 'EUR', 'GBP'],
    },
  ],

  emitted_events: [
    { event_type: 'event.created', description: 'New event record created' },
    { event_type: 'event.published', description: 'Event made publicly visible' },
    { event_type: 'event.attended', description: 'Attendee checked in at event' },
  ],

  // Events module has no approval gate as of v3.0
  approval_actions: [],

  telegram_callbacks: [],

  // Billing line types are placeholders; activate when events invoicing ships
  billing_line_types: [
    {
      source_type: 'event_ticket',
      display_label: 'Event Ticket',
      vat_applicable: true,
      unit: 'per ticket',
    },
    {
      source_type: 'event_addon',
      display_label: 'Event Add-on',
      vat_applicable: true,
      unit: 'per item',
    },
  ],
}

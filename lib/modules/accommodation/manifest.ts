// lib/modules/accommodation/manifest.ts
// MANIFEST-02: descriptive only. No executable code, no side effects, no imports beyond the type.
// Describes what the accommodation module ALREADY does as of v3.0.

import type { ModuleManifest } from '../types'

export const accommodationManifest: ModuleManifest = {
  id: 'accommodation',
  name: 'Accommodation',
  version: '1.0.0',
  product: 'draggonnb',

  required_tenant_inputs: [
    {
      key: 'accommodation.damage_price_list',
      type: 'json',
      label: 'Damage Price List',
      placeholder: '{"glassware": 20, "plates": 25, "towels": 50}',
      required: false,
      // false = code uses defaults if absent; full list captured in SWAZULU-DISCOVERY.md
    },
    {
      key: 'accommodation.cancellation_policy',
      type: 'json',
      label: 'Cancellation Policy',
      placeholder: '{"tiers": [{"days_before": 30, "refund_pct": 100}]}',
      required: false,
    },
    {
      key: 'accommodation.max_incidental_multiplier',
      type: 'number',
      label: 'Max Incidental Charge Multiplier',
      placeholder: '1.5',
      required: false,
      // multiplied against nightly rate to derive max_incidental_charge_zar_cents per DAMAGE-01
    },
  ],

  emitted_events: [
    { event_type: 'booking.confirmed', description: 'Booking confirmed and deposit received' },
    { event_type: 'booking.checked_in', description: 'Guest checked in to unit' },
    { event_type: 'booking.checked_out', description: 'Guest checked out of unit' },
    { event_type: 'booking.cancelled', description: 'Booking cancelled (policy determines refund)' },
    { event_type: 'damage.flagged', description: 'Staff flagged a damage incident via ops bot' },
    { event_type: 'damage.charged', description: 'Damage charge approved and submitted to PayFast' },
    { event_type: 'damage.refunded', description: 'Damage charge reversed after dispute resolution' },
  ],

  approval_actions: [
    {
      action_type: 'damage_charge',
      display_name: 'Damage Charge Approval',
      required_roles: ['admin', 'manager'],
      handler_path: 'lib/approvals/handlers/damage-charge',
      description: "Approve/reject a damage charge against a guest's stored PayFast subscription token",
    },
    {
      action_type: 'rate_change',
      display_name: 'Rate Change Approval',
      required_roles: ['admin'],
      handler_path: 'lib/approvals/handlers/rate-change',
      description: 'Approve/reject a change to accommodation rate plans',
    },
  ],

  telegram_callbacks: [
    {
      action_key: 'damage_charge',
      display_name: 'Damage Charge',
      handler_path: 'lib/approvals/handlers/damage-charge',
      // callback_data format: approve:draggonnb:damage_charge:{resource_id}
    },
  ],

  billing_line_types: [
    {
      source_type: 'accommodation_night',
      display_label: 'Accommodation Night',
      vat_applicable: true,
      unit: 'per night',
    },
    {
      source_type: 'accommodation_addon',
      display_label: 'Add-on Service',
      vat_applicable: true,
      unit: 'per booking',
    },
    {
      source_type: 'damage_charge',
      display_label: 'Damage Recovery Charge',
      vat_applicable: false,
      unit: 'per incident',
    },
  ],
}

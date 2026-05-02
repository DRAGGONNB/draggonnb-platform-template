// lib/onboarding/manifest-form-builder.ts
// MANIFEST-03: Builds onboarding wizard form descriptors from active modules' manifests.
// Server-side helper, consumed by the dashboard wizard page.

import type { TenantInputSpec } from '@/lib/modules/types'
import { getManifestsForOrg } from '@/lib/modules/registry'

export interface FormSection {
  module_id: string
  module_name: string
  inputs: TenantInputSpec[]
}

export interface FormDescriptor {
  sections: FormSection[]
  field_count: number
}

/**
 * Server-side builder. Returns a FormDescriptor describing the dynamic form
 * the wizard should render for an org's active modules.
 *
 * Modules with zero required_tenant_inputs are filtered out (no empty sections).
 */
export function buildOnboardingForm(enabledModuleIds: string[]): FormDescriptor {
  const manifests = getManifestsForOrg(enabledModuleIds)
  const sections: FormSection[] = manifests
    .filter(m => m.required_tenant_inputs.length > 0)
    .map(m => ({
      module_id: m.id,
      module_name: m.name,
      inputs: m.required_tenant_inputs,
    }))
  const field_count = sections.reduce((sum, s) => sum + s.inputs.length, 0)
  return { sections, field_count }
}

/**
 * Build the dot-path -> initial value map for an org.
 * Reads existing values from tenant_modules.config; missing keys map to undefined.
 */
export function extractInitialValues(
  descriptor: FormDescriptor,
  existingConfig: Record<string, unknown>
): Record<string, unknown> {
  const initial: Record<string, unknown> = {}
  for (const section of descriptor.sections) {
    for (const input of section.inputs) {
      // input.key is dot-path: "accommodation.damage_price_list"
      const value = getDotPath(existingConfig, input.key)
      if (value !== undefined) initial[input.key] = value
    }
  }
  return initial
}

function getDotPath(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => {
    if (acc && typeof acc === 'object' && k in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[k]
    }
    return undefined
  }, obj)
}

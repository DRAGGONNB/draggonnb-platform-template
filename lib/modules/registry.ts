// lib/modules/registry.ts
// Explicit static-import registry — NOT filesystem glob.
// Adding a new module: import its manifest here, add to MODULE_REGISTRY array.
// Compile-time type safety + tree-shaking + edge-runtime compatible.

import type {
  ModuleManifest,
  ApprovalActionSpec,
  TelegramCallbackSpec,
  BillingLineTypeSpec,
} from './types'
import { accommodationManifest } from './accommodation/manifest'
import { crmManifest } from './crm/manifest'
import { eventsManifest } from './events/manifest'
import { aiAgentsManifest } from './ai_agents/manifest'
import { analyticsManifest } from './analytics/manifest'
import { securityOpsManifest } from './security_ops/manifest'

export const MODULE_REGISTRY: readonly ModuleManifest[] = [
  accommodationManifest,
  crmManifest,
  eventsManifest,
  aiAgentsManifest,
  analyticsManifest,
  securityOpsManifest,
]

export function getManifestsForOrg(enabledModuleIds: string[]): ModuleManifest[] {
  return MODULE_REGISTRY.filter(m => enabledModuleIds.includes(m.id))
}

export function getAllApprovalActions(enabledModuleIds: string[]): ApprovalActionSpec[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m => m.approval_actions)
}

export function getAllTelegramCallbacks(enabledModuleIds: string[]): TelegramCallbackSpec[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m => m.telegram_callbacks)
}

export function getAllBillingLineTypes(enabledModuleIds: string[]): BillingLineTypeSpec[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m => m.billing_line_types)
}

export function getAllEmittedEvents(enabledModuleIds: string[]): {
  module_id: string
  event_type: string
  description: string
}[] {
  return getManifestsForOrg(enabledModuleIds).flatMap(m =>
    m.emitted_events.map(e => ({
      module_id: m.id,
      event_type: e.event_type,
      description: e.description,
    }))
  )
}

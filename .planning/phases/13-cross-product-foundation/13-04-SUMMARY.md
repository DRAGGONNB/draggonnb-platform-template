---
phase: 13-cross-product-foundation
plan: 04
subsystem: api
tags: [module-registry, approvals, telegram, billing, onboarding, manifest-driven]

# Dependency graph
requires:
  - phase: 13-03
    provides: MODULE_REGISTRY + 6 manifest files + 5 lookup helpers (getManifestsForOrg, getAllApprovalActions, getAllTelegramCallbacks, getAllBillingLineTypes, getAllEmittedEvents)
provides:
  - ApprovalActionRegistry class with qualified-key lookup (lib/approvals/registry.ts)
  - Telegram callback pattern builder + parser (lib/telegram/callback-registry.ts)
  - Billing line-type validator validateBillingLineType (lib/billing/line-type-registry.ts)
  - Onboarding form descriptor builder buildOnboardingForm (lib/onboarding/manifest-form-builder.ts)
  - ManifestForm client renderer for dynamic wizard fields (app/(dashboard)/onboarding/wizard/manifest-form.tsx)
  - 15 unit tests covering all 4 registries
affects: [14-approval-spine, 14-grammy-refactor, 15-invoice-service, onboarding-wizard-wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Qualified-key pattern: {product}.{action_type} resolves uniqueness across product namespaces"
    - "Registry-as-class: ApprovalActionRegistry constructed per-request with enabledModuleIds, not singleton"
    - "Verb:product:key:id callback_data format for Telegram inline keyboards"
    - "Server-side FormDescriptor builder + pure client renderer split"

key-files:
  created:
    - lib/approvals/registry.ts
    - lib/telegram/callback-registry.ts
    - lib/billing/line-type-registry.ts
    - lib/onboarding/manifest-form-builder.ts
    - app/(dashboard)/onboarding/wizard/manifest-form.tsx
    - __tests__/unit/modules/registry.test.ts
  modified: []

key-decisions:
  - "ApprovalActionRegistry is instantiated per-request (not a singleton) — enabledModuleIds varies per org"
  - "product comes from ownerManifest.product at registry build time, not from ApprovalActionSpec — avoids state duplication"
  - "assertAllHandlersResolvable() shipped but NOT called in Phase 13 — handler files don't exist yet; Phase 14 adds boot call"
  - "telegram/callback-registry imports MODULE_REGISTRY directly rather than getAllTelegramCallbacks — same data, clearer iteration"
  - "ManifestForm 'use client' directive after comment header — standard Next.js App Router practice"

patterns-established:
  - "Manifest registry pattern: read-only view over MODULE_REGISTRY, no DB writes, no side effects at import time"
  - "Onboarding form split: server builds FormDescriptor, client renders it — keeps client bundle free of registry dependencies"

# Metrics
duration: 19min
completed: 2026-05-02
---

# Phase 13 Plan 04: Manifest-Driven Registries Summary

**4 read-only manifest registries shipping lookup APIs for Phase 14 approval spine, grammY Telegram refactor, Phase 15 invoice service, and a functional onboarding form renderer — 467 LOC, 15 unit tests passing**

## Performance

- **Duration:** 19 min
- **Started:** 2026-05-02T08:51:32Z
- **Completed:** 2026-05-02T09:11:03Z
- **Tasks:** 2
- **Files created:** 6

## Accomplishments

- ApprovalActionRegistry class with `buildQualifiedKey`, `getHandler`, `listAll`, `assertAllHandlersResolvable` — Phase 14 spine imports without modification
- Telegram callback registry with `buildCallbackData`, `buildCallbackPattern`, `parseCallbackData`, `listCallbacksForOrg` — canonical `verb:product:key:id` format enforced
- Billing line-type registry with `validateBillingLineType`, `lookupLineType`, `listLineTypesForOrg` — Phase 15 `addInvoiceLine()` calls validateBillingLineType before INSERT
- Onboarding form builder (`buildOnboardingForm`) converts TenantInputSpec[] into FormDescriptor sections; `ManifestForm` client component renders all 6 field types (text/number/boolean/select/json/file_upload)
- 15 unit tests covering all 4 registries — all pass

## Task Commits

Each task was committed atomically:

1. **Task 1: ApprovalActionRegistry + Telegram callback registry + Billing line-type registry skeletons** - `21d7caf5` (feat)
2. **Task 2: Onboarding wizard manifest-driven form (MANIFEST-03)** - `33de84ea` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `lib/approvals/registry.ts` — ApprovalActionRegistry class; buildQualifiedKey helper (59 LOC)
- `lib/telegram/callback-registry.ts` — buildCallbackData, buildCallbackPattern, parseCallbackData, listCallbacksForOrg (69 LOC)
- `lib/billing/line-type-registry.ts` — validateBillingLineType, lookupLineType, listLineTypesForOrg (45 LOC)
- `lib/onboarding/manifest-form-builder.ts` — buildOnboardingForm, extractInitialValues, getDotPath (64 LOC)
- `app/(dashboard)/onboarding/wizard/manifest-form.tsx` — ManifestForm client component + FieldRenderer (138 LOC)
- `__tests__/unit/modules/registry.test.ts` — 15 unit tests across 4 describe blocks (92 LOC)

**Total: 467 LOC**

## Decisions Made

- **ApprovalActionRegistry is per-request, not singleton.** `new ApprovalActionRegistry(enabledModuleIds)` called with org-specific module list. A singleton would need to be filtered anyway; per-instance construction is cleaner and avoids mutable global state.
- **product sourced from ownerManifest, not ApprovalActionSpec.** ApprovalActionSpec doesn't carry `product` — the manifest's top-level field does. Adding `product` to each spec would duplicate state and risk drift.
- **assertAllHandlersResolvable() is defined but uncalled.** Phase 13 ships the contract; handler files at `lib/approvals/handlers/*` don't exist yet. Phase 14 adds the boot-time call once handlers exist.
- **telegram/callback-registry iterates MODULE_REGISTRY directly** rather than delegating to `getAllTelegramCallbacks`. Both produce identical output; direct iteration is more readable for the product-tagging logic.
- **ManifestForm 'use client' appears after comment header.** Next.js App Router accepts the directive anywhere before the first import; comment header is standard practice.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- tsc exits 1 but only due to 3 pre-existing errors in `__tests__/integration/api/elijah/elijah-full.test.ts` and `__tests__/integration/api/social/social-content-full.test.ts` — these are documented in STATE.md as pre-existing baseline since before Phase 13. Zero new tsc errors introduced by 13-04 files.

## User Setup Required

None — no external service configuration required.

## REQ-IDs Closed

- **MANIFEST-03** — Onboarding wizard form builder (buildOnboardingForm + ManifestForm renderer)
- **MANIFEST-04** — Telegram callback registry skeleton (buildCallbackPattern, listCallbacksForOrg)
- **MANIFEST-05** — Approval action-type registry skeleton (ApprovalActionRegistry class)
- **MANIFEST-06** — Billing line-type registry (validateBillingLineType)

## Hand-offs to Downstream Phases

**Phase 14 (Approval Spine):**
- Import `ApprovalActionRegistry` from `lib/approvals/registry.ts`
- Create handler files at `lib/approvals/handlers/{action-type}.ts`
- Call `registry.assertAllHandlersResolvable()` at app boot after handlers exist

**Phase 14 (grammY Telegram refactor):**
- Import `buildCallbackPattern`, `listCallbacksForOrg` from `lib/telegram/callback-registry.ts`
- Register grammY `callbackQuery` handlers using returned RegExp patterns
- Use `parseCallbackData` to destructure incoming callback_data strings

**Phase 14+ (Onboarding wizard wiring):**
- Server component calls `buildOnboardingForm(activeModuleIds)` + reads existing `tenant_modules.config`
- Calls `extractInitialValues(descriptor, existingConfig)` for prefilled values
- Passes both to `<ManifestForm descriptor={...} initialValues={...} onSubmit={...} />`

**Phase 15 (Invoice Service):**
- Call `validateBillingLineType(sourceProduct, sourceType, enabledModuleIds)` before each `addInvoiceLine()` INSERT
- Use `lookupLineType` to get display_label + vat_applicable for invoice rendering

## Next Phase Readiness

- Phase 14 approval spine can import ApprovalActionRegistry without modification
- Phase 14 grammY refactor can import callback registry helpers without modification
- Phase 15 invoice service can import validateBillingLineType without modification
- Onboarding wizard wiring ready: server descriptor builder + client renderer both shipped

---
*Phase: 13-cross-product-foundation*
*Completed: 2026-05-02*

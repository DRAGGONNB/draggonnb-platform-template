---
phase: 11-easy-advanced-crm-campaign-decision
plan: 09
subsystem: ui
tags: [crm, drafts, autosave, react-hooks, supabase, rls]

requires:
  - phase: 11-01
    provides: entity_drafts table + RLS policies (migration 39)
  - phase: 11-07
    provides: CRM Easy view + contacts/deals table name corrections
  - phase: 11-08
    provides: CRM Advanced route + ToggleViewButton

provides:
  - useEntityDraft hook with 1s debounced autosave to entity_drafts
  - loadEntityWithDraft server-side parallel fetch helper (draft overlays DB row)
  - DraftConflictBanner component (soft warning, no hard-block)
  - /api/crm/drafts POST (upsert) + DELETE (on save) endpoints
  - contact + deal [id] detail/edit pages (Branch B — created new, none existed)
  - 11 unit tests for conflict detection + debounce timing

affects: [11-12, Phase 12 polish]

tech-stack:
  added: []
  patterns:
    - "RSC parallel fetch: loadEntityWithDraft() runs DB row + draft fetch concurrently via Promise.all"
    - "Draft-overlay: draft fields overwrite DB fields key-by-key; _tab_id stripped from display but returned as draftTabId"
    - "Soft conflict: detectTabConflict() compares sessionStorage tab UUID vs draft._tab_id with 60s TTL window"
    - "Best-effort autosave: fetch errors in useEntityDraft are silently swallowed; never blocks user"

key-files:
  created:
    - app/api/crm/drafts/route.ts
    - lib/crm/entity-drafts/load-with-draft.ts
    - lib/crm/entity-drafts/conflict-detection.ts
    - lib/crm/entity-drafts/use-entity-draft.ts
    - components/crm/DraftConflictBanner.tsx
    - app/(dashboard)/crm/contacts/[id]/page.tsx
    - app/(dashboard)/crm/contacts/[id]/_components/ContactEditForm.tsx
    - app/(dashboard)/crm/deals/[id]/page.tsx
    - app/(dashboard)/crm/deals/[id]/_components/DealEditForm.tsx
    - __tests__/unit/crm/entity-drafts.test.ts
  modified: []

key-decisions:
  - "Branch B chosen (Task 0): no contact/deal [id] detail pages existed — created minimal RSC + client-form pairs"
  - "No Alert shadcn component available — DraftConflictBanner uses amber Card pattern with lucide AlertTriangle"
  - "Interface types extend Record<string, unknown> to satisfy loadEntityWithDraft generic constraint"
  - "entity_drafts table has organization_id NOT NULL — API route reads userOrg.organizationId from getUserOrg()"
  - "Alert shadcn component not in UI library — built custom amber banner from Card + Button primitives"

patterns-established:
  - "Entity detail pages: RSC fetches data via loadEntityWithDraft, passes to 'use client' form island"
  - "Draft autosave: useEntityDraft opts.currentValues drives debounce; any state change schedules a POST"
  - "On successful save: call clear() from useEntityDraft to DELETE the draft row"

duration: 35min
completed: 2026-04-27
---

# Phase 11 Plan 09: entity_drafts Autosave Summary

**1s-debounced autosave hook + server-side draft-overlay + soft 60s tab-conflict banner for CRM contact + deal edit pages**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-27T13:50Z
- **Completed:** 2026-04-27T14:25Z
- **Tasks:** 3 (+ Task 0 read-only checkpoint)
- **Files modified:** 0 (all new)

## Accomplishments
- Wired entity_drafts table (migration 39) into CRM edit forms: every keystroke auto-saves to DB within 1s
- loadEntityWithDraft() parallel-fetches DB row + draft, overlays draft fields at RSC render time (view-desync prevention)
- Soft conflict warning: DraftConflictBanner appears when another tab wrote the draft within 60s — [Reload] and [Dismiss] buttons, no hard-block
- Created minimal contact + deal detail edit pages (Branch B) — none existed before this plan

## Task Commits

1. **Task 1: /api/crm/drafts route + loadEntityWithDraft helper** - `ee137cc3` (feat)
2. **Task 2: useEntityDraft hook + conflict-detection + DraftConflictBanner** - `42403cd3` (feat)
3. **Task 3: contact + deal [id] edit pages wired with autosave (Branch B)** - `21c73180` (feat)

## Files Created/Modified
- `app/api/crm/drafts/route.ts` - POST (upsert) + DELETE endpoints, Zod validation, user-scoped RLS client
- `lib/crm/entity-drafts/load-with-draft.ts` - Parallel DB+draft fetch helper with draft-overlay logic
- `lib/crm/entity-drafts/conflict-detection.ts` - isDraftFresh() + detectTabConflict() pure helpers
- `lib/crm/entity-drafts/use-entity-draft.ts` - 'use client' hook: sessionStorage tab_id + 1s debounce + clear()
- `components/crm/DraftConflictBanner.tsx` - Amber soft-warning banner (no hard-block)
- `app/(dashboard)/crm/contacts/[id]/page.tsx` - RSC: loadEntityWithDraft + ContactEditForm island
- `app/(dashboard)/crm/contacts/[id]/_components/ContactEditForm.tsx` - Client form with useEntityDraft
- `app/(dashboard)/crm/deals/[id]/page.tsx` - RSC: loadEntityWithDraft + DealEditForm island
- `app/(dashboard)/crm/deals/[id]/_components/DealEditForm.tsx` - Client form with useEntityDraft
- `__tests__/unit/crm/entity-drafts.test.ts` - 11 tests: conflict detection + debounce timing

## Decisions Made
- **Branch B selected**: Task 0 Glob found no `[id]` pages under contacts/ or deals/ — created new RSC+client pairs
- **Custom conflict banner**: shadcn `Alert` component not in the UI library; built amber banner from `Button` + lucide `AlertTriangle`
- **Interface extends Record**: contact/deal interfaces declared as `extends Record<string, unknown>` to satisfy loadEntityWithDraft generic constraint (TypeScript deviation from plan's literal interface notation)
- **organization_id required**: entity_drafts table has NOT NULL organization_id — POST route reads `userOrg.organizationId` from `getUserOrg()` (plan used `auth.uid()` in description but the table schema requires org_id)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Interface extends Record<string, unknown>**
- **Found during:** Task 3 (contact + deal RSC pages)
- **Issue:** `Contact` and `Deal` interfaces didn't satisfy `loadEntityWithDraft<T extends Record<string, unknown>>` constraint
- **Fix:** Added `extends Record<string, unknown>` to both interface declarations
- **Files modified:** `app/(dashboard)/crm/contacts/[id]/page.tsx`, `app/(dashboard)/crm/deals/[id]/page.tsx`
- **Verification:** tsc --noEmit clean on those files after fix
- **Committed in:** 21c73180 (Task 3 commit)

**2. [Rule 3 - Blocking] organization_id in POST body**
- **Found during:** Task 1 (API route)
- **Issue:** entity_drafts.organization_id is NOT NULL; plan's route description mentioned only user_id. Route needs org_id from getUserOrg()
- **Fix:** Called `getUserOrg()` instead of raw `supabase.auth.getUser()`, reads `userOrg.organizationId` for insert
- **Files modified:** `app/api/crm/drafts/route.ts`
- **Committed in:** ee137cc3 (Task 1 commit)

**3. [Rule 3 - Blocking] No shadcn Alert component**
- **Found during:** Task 2 (DraftConflictBanner)
- **Issue:** Plan specified `Alert` variant `warning` (shadcn) — not present in components/ui/
- **Fix:** Built equivalent amber banner using lucide `AlertTriangle` + `Button` primitives with Tailwind amber colour tokens
- **Files modified:** `components/crm/DraftConflictBanner.tsx`
- **Committed in:** 42403cd3 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking)
**Impact:** All necessary for correctness. No scope creep.

## Issues Encountered
None beyond the 3 auto-fixed deviations above.

## Next Phase Readiness
- UX-07 fully closed: entity_drafts stores unsaved form state across view switches
- UX-06 partially closed: structural wiring complete; formal integration test ships in Plan 11-12
- Plan 11-11 (Campaign Scheduler + Kill-Switch) is the remaining Wave 5 plan before Phase 11 closes
- Plan 11-12 will add the view-desync E2E test for UX-06 full closure

---
*Phase: 11-easy-advanced-crm-campaign-decision*
*Completed: 2026-04-27*

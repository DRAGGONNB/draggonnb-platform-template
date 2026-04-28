---
phase: 11
plan: 11-08
title: CRM Advanced route relocation + Easy/Advanced toggle wiring
subsystem: crm-ui
tags: [crm, toggle, ux, route, advanced-view]
wave: 4
depends_on: [11-03, 11-07]
provides: [advanced-crm-route, toggle-on-all-crm-pages]
affects: [11-09, 11-12]
tech-stack:
  added: []
  patterns: [AdvancedKanbanShell wrapper pattern for floating toggle injection]
key-files:
  created:
    - app/(dashboard)/crm/advanced/page.tsx
    - components/crm/AdvancedKanbanShell.tsx
  modified:
    - app/(dashboard)/crm/contacts/page.tsx
    - app/(dashboard)/crm/deals/page.tsx
    - app/(dashboard)/crm/companies/page.tsx
  deleted:
    - app/(dashboard)/crm/_legacy/stats-overview.tsx.bak
decisions:
  - AdvancedKanbanShell is 'use client' fragment wrapper (not a layout) — allows toggle injection into both client and server-adjacent pages without RSC boundary issues
  - advanced/page.tsx exports AdvancedCRMPage (renamed from CRMPage) to avoid module naming conflict
  - Backup deletion via git rename tracking (Git detected rename from _legacy → advanced/page.tsx)
metrics:
  duration: ~25 minutes
  completed: 2026-04-27
  tasks: 2/2
  commits: 2
---

# Phase 11 Plan 11-08: CRM Advanced Route + Toggle Summary

Relocated the original CRM dashboard stats content (backed up by Plan 11-07) to `/dashboard/crm/advanced` and wired the Easy/Advanced toggle button onto all four Advanced-view CRM pages.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Relocate CRM dashboard to /advanced + create AdvancedKanbanShell | 31961c0b | advanced/page.tsx, AdvancedKanbanShell.tsx, deleted backup |
| 2 | Wrap existing CRM sub-pages with AdvancedKanbanShell | 477f6e90 | contacts/page.tsx, deals/page.tsx, companies/page.tsx |

## Must-Haves Verified

- `/dashboard/crm/advanced` route exists with original stats/overview content: YES
- ToggleViewButton on `/advanced`, `/contacts`, `/deals`, `/companies`: YES
- currentMode='advanced' on all advanced pages → label "Easy view →": YES
- Toggle click calls POST /api/crm/ui-mode (fire-and-forget): YES (ToggleViewButton.tsx built in 11-03)
- Existing kanban/filter/data logic unmodified: YES (wrapping JSX only)
- Manager-role users default to advanced (11-07 redirect): YES (not touched)

## REQ-IDs Closed

- UX-02: FULL CLOSURE — Easy view at /dashboard/crm (11-07) + Advanced view at /dashboard/crm/advanced (11-08) both exist
- UX-03: FULL CLOSURE — Every non-Easy CRM page has floating "Easy view →" toggle

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Implementation Notes

- Git detected the backup → advanced/page.tsx as a rename (97% similarity), which correctly records the content relocation in git history.
- `AdvancedKanbanShell` uses a React fragment (`<>`) wrapper rather than a div — this avoids adding an extra DOM element that could affect layout on the existing sub-pages.
- Function was renamed from `CRMPage` to `AdvancedCRMPage` in `advanced/page.tsx` to avoid any tooling confusion about the duplicate name (the Easy view page.tsx uses `CRMHomePage`).

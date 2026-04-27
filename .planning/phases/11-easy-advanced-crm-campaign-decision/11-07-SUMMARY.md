---
phase: 11
plan: 11-07
title: CRM Easy view page + 3 action cards + approve/dismiss API + email-template fallback
subsystem: crm-easy-view
tags: [crm, easy-view, module-home, action-cards, api-routes, email-templates, ui-mode]
wave: 3
depends_on: [11-01, 11-03, 11-06]
provides:
  - /dashboard/crm Easy view rendering 3 action cards via ModuleHome
  - lib/crm/easy-view-data.ts server-side data fetcher
  - lib/crm/ui-mode.ts role-default resolver
  - lib/crm/email-templates.ts generic + brand-voice compose functions
  - POST /api/crm/easy-view/approve with crm_activities audit trail
  - POST /api/crm/easy-view/dismiss with 7-day dismissal upsert
  - POST /api/crm/ui-mode for toggle persistence
affects: [11-08, 11-09, 11-10]
tech-stack:
  added: []
  patterns:
    - RSC server-side data fetch with role-based redirect (ui_mode → route)
    - Admin client for cross-RLS data fetcher + service-role API writes
    - Zod discriminated union for action type validation
    - 3-audit-row exception for engage_hot_lead (clean per-op reporting)
key-files:
  created:
    - app/(dashboard)/crm/_legacy/stats-overview.tsx.bak
    - app/(dashboard)/crm/layout.tsx
    - lib/crm/ui-mode.ts
    - lib/crm/easy-view-data.ts
    - lib/crm/email-templates.ts
    - app/api/crm/easy-view/approve/route.ts
    - app/api/crm/easy-view/dismiss/route.ts
    - app/api/crm/ui-mode/route.ts
  modified:
    - app/(dashboard)/crm/page.tsx
decisions:
  - "Stale deals staleness proxy: updated_at on deals table (last_contacted_at only exists on contacts)"
  - "Table names: contacts (not crm_contacts), deals (not crm_deals) — actual schema from migration 03"
  - "engage_hot_lead writes 3 crm_activities rows, not 1 — per-op audit requirement documented in code comment"
  - "email composeFollowupEmail v3.0: generic body, brand-voice sign-off only; Sonnet composition deferred to v3.1"
  - "ui-mode route uses upsert on user_profiles (handles missing row case gracefully)"
duration: ~45 minutes
completed: 2026-04-27
---

# Phase 11 Plan 11-07: CRM Easy view + approve/dismiss API + email templates Summary

CRM Easy view wired at `/dashboard/crm` using the ModuleHome library (Plan 11-03). RSC fetches 3 action cards server-side (followups, stale deals, hot leads), resolves ui_mode from user_profiles with role defaults, and redirects advanced users to `/dashboard/crm/advanced`. Approve API writes crm_activities with `source='easy_view'` for UX-05 audit compliance. Email templates use brand-voice-aware compose path when client_profiles.brand_voice_prompt is set, falling back to generic. The brand-voice banner (in ModuleHome) links to `/settings/brand-voice` when NULL.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 0 | Snapshot crm/page.tsx before overwrite | 8ee8ba7a | _legacy/stats-overview.tsx.bak |
| 1 | Easy view RSC + data fetcher + ui-mode helper | 8cdd0395 | page.tsx, layout.tsx, easy-view-data.ts, ui-mode.ts |
| 2 | Approve + dismiss + ui-mode API routes + email templates | 6d97af92 | 4 new API files + email-templates.ts |

## Must-Haves Verified

- [x] /dashboard/crm renders ModuleHome with 3 cards (followups, stale_deals, hot_leads) — TypeScript clean
- [x] Cards cap at ≤5 items with totalCount for "View all" link (ActionCard component from 11-03)
- [x] Brand voice banner when hasBrandVoice=false (rendered in ModuleHome from 11-03)
- [x] Stale deals uses real DB enum (lead/qualified/proposal/negotiation) and reads thresholds from tenant_modules.config
- [x] Approve API accepts ApproveAction union, validates org membership, writes crm_activities with source='easy_view'
- [x] Dismiss API upserts crm_action_dismissals with correct expires_at
- [x] UI mode API updates user_profiles.ui_mode
- [x] Email uses brand-voice path when brand_voice_prompt IS NOT NULL, generic fallback otherwise
- [x] engage_hot_lead writes 3 audit rows (email_sent, stage_moved, task_created) — documented in code

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Table names corrected from plan spec**
- Found during: Task 1 (data fetcher)
- Issue: Plan spec used `crm_contacts` and `crm_deals` table names; actual DB tables are `contacts` and `deals` (migration 03_crm_tables.sql)
- Fix: Used actual table names in easy-view-data.ts
- Files modified: lib/crm/easy-view-data.ts

**2. [Rule 1 - Bug] Stale deals staleness field corrected**
- Found during: Task 1 (data fetcher)
- Issue: Plan spec queried `deals.last_contacted_at` but that column only exists on `contacts` table; `deals` has `updated_at`
- Fix: Used `updated_at` as staleness proxy for deals (semantically: last time deal was touched)
- Files modified: lib/crm/easy-view-data.ts

**3. [Rule 1 - Bug] UserOrg field names corrected in page.tsx**
- Found during: Task 1 (page RSC)
- Issue: Plan spec used `userOrg.user.id` and `userOrg.organization.id`; actual UserOrg interface uses `userOrg.userId` and `userOrg.organizationId`
- Fix: Used actual interface field names
- Files modified: app/(dashboard)/crm/page.tsx

## REQ-IDs Closed

- UX-04 (full): user_profiles.ui_mode written by toggle API at /api/crm/ui-mode
- UX-05 (full): page data fetcher uses cached N8N suggestions, zero per-render BaseAgent calls; approve actions write exactly 1 crm_activities row per op (3 for engage_hot_lead — documented exception)
- UX-02 (foundational): Easy view at /dashboard/crm rendering ModuleHome — full closure in Plan 11-08 when Advanced route wired

## Next Session Readiness

Plan 11-08 can now:
1. Read `app/(dashboard)/crm/_legacy/stats-overview.tsx.bak` to relocate the stats overview to `/crm/advanced/page.tsx`
2. Add the floating toggle button mount (requires /advanced route to exist first)
3. Close UX-02 fully with dual-route requirement satisfied

---
phase: 12
plan: "12-06"
title: "Dynamic sidebar shell + ModeToggle primitive + new top-level overview pages"
subsystem: "dashboard-shell"
tags: ["sidebar", "ia", "tenant_modules", "rsc", "mode-toggle", "navigation"]
one-liner: "Replace 54-item hardcoded sidebar with server-rendered tenant_modules-driven shell (6-7 items), flatten verticals, ship reusable ModeToggle primitive, and add /content-studio, /customers, /insights, /settings overview pages so tab links resolve."
status: complete
completed: "2026-04-30"
requires: ["12-01"]
provides: ["dynamic-sidebar", "mode-toggle-primitive", "module-overview-pages"]
affects: ["12-07", "12-08"]
tech-stack:
  added: []
  patterns:
    - "Pure tree builder (lib/dashboard/build-sidebar.ts) — no Supabase/Next imports, fully unit-testable"
    - "Server component reads tenant_modules + role; client component handles active-state + flyout"
    - "Hover/focus flyout panel (sidebar-flyout.tsx) — keyboard accessible (aria-haspopup, role=menu)"
    - "Verticals as flat top-level items (Accommodation/Restaurant/Security), NOT nested under Operations"
    - "Tabs link to existing real routes (no broken links) — overview pages are quick-link hubs, not new feature surfaces"
key-files:
  created:
    - "lib/dashboard/build-sidebar.ts"
    - "components/dashboard/sidebar-server.tsx"
    - "components/dashboard/sidebar-client.tsx"
    - "components/dashboard/sidebar-section.tsx"
    - "components/dashboard/sidebar-flyout.tsx"
    - "components/ui/mode-toggle.tsx"
    - "app/(dashboard)/content-studio/page.tsx"
    - "app/(dashboard)/customers/page.tsx"
    - "app/(dashboard)/insights/page.tsx"
    - "app/(dashboard)/settings/page.tsx"
    - "__tests__/components/dashboard/sidebar-build.test.ts"
    - "__tests__/components/ui/mode-toggle.test.tsx"
  modified:
    - "components/dashboard/Sidebar.tsx (255 → 9 lines, thin re-export)"
    - "app/(dashboard)/layout.tsx (removed local getUsageStats, swapped to <SidebarServer />)"
    - "__tests__/components/dashboard/sidebar.test.tsx (rewritten for new component shape)"
decisions:
  - "Verticals flat (not under Operations wrapper): each activated vertical (accommodation, restaurant, elijah) renders as its own top-level sidebar item per CONTEXT decision. The plan's Operations grouping was rejected because it added a click for power users."
  - "Tabs point to existing real routes (/crm, /email, /accommodation/*) instead of net-new URLs. The new top-level pages (/content-studio, /customers, /insights, /settings) are minimal overview hubs that quick-link to the working routes — keeps the shell shipping today without waiting for 12-07/12-08."
  - "Settings overview page added (not in plan files_modified) — plan listed /settings as 'verify exists', but it didn't exist as a route. Built minimal hub matching the other 3 overview pages."
  - "Usage stats sidebar block dropped — UsageWarningBanner above the dashboard already covers usage; the sidebar block was redundant and added a layout fetch."
  - "ModeToggle primitive shipped at components/ui/mode-toggle.tsx with controlled value/onChange, default Autopilot/Hands-on labels, and labels prop for Phase 11 Easy/Advanced override. Refactor of Phase 11 toggle to consume it deferred (one-line change, low risk, batch with 12-07)."
---

# Phase 12 Plan 12-06: Dynamic Sidebar Shell Summary

## What was done

Replaced the hardcoded 9-section / 54-item sidebar with a server-rendered, `tenant_modules`-driven shell. Sidebar now shows 6 items for a starter org and up to 9 for a multi-vertical platform_admin (was always 54). Hover any item with sub-tabs surfaces a flyout panel for power users. Built `<ModeToggle>` primitive for the cross-platform Autopilot ⇄ Hands-on toggle. Added 4 new top-level overview pages so the new sidebar links resolve without 404s.

## Implementation summary

| Layer | File | Role |
|-------|------|------|
| Tree builder (pure) | `lib/dashboard/build-sidebar.ts` | Takes `(activeModules: string[], role: string)` → `SidebarItem[]`. Zero Next/Supabase imports. |
| Server shell | `components/dashboard/sidebar-server.tsx` | Reads `getUserOrg()` + queries `tenant_modules` for active org, calls `buildSidebar`, hands tree to client. |
| Client renderer | `components/dashboard/sidebar-client.tsx` | Renders the static structure, computes active state from `usePathname()`. |
| Per-section item | `components/dashboard/sidebar-section.tsx` | Single icon + label, attaches flyout if item has `tabs`. |
| Flyout panel | `components/dashboard/sidebar-flyout.tsx` | Hover/focus-revealed sub-tab list, `role="menu"`, keyboard accessible. |
| ModeToggle primitive | `components/ui/mode-toggle.tsx` | Reusable controlled toggle, default Autopilot/Hands-on labels, `labels` prop for Easy/Advanced override. |
| Legacy compat | `components/dashboard/Sidebar.tsx` (-255 lines) | Reduced to a thin re-export of `SidebarServer` so `app/(dashboard)/layout.tsx` import keeps working. |
| Layout wiring | `app/(dashboard)/layout.tsx` (-32 lines) | Removed the local `getUsageStats()` helper; sidebar prop dropped. |
| Overview hubs | `app/(dashboard)/{content-studio,customers,insights,settings}/page.tsx` | Minimal hero + quick-link cards to existing real routes — prevents 404 on new top-level URLs. |

## Sidebar IA (final)

Order rendered top-to-bottom (per active modules + role):

1. **Dashboard** (`/dashboard`)
2. **Content Studio** (`/content-studio`) — tabs: Generator, Social, Email Hub, Email Campaigns, Sequences, Outreach, Multi-channel Campaigns
3. **Customers** (`/customers`) — tabs: CRM Easy, Advanced Kanban, Lead Scoring, Contacts, Deals, Companies
4. **Accommodation** (`/accommodation`) — _only if `tenant_modules.accommodation` active_; tabs cover Bookings/Calendar/Properties/Inquiries/Guests/Operations/Channels/Stock/Costs/Automation
5. **Restaurant** (`/restaurant`) — _only if active_; tabs cover Menu/Tables/Reservations/SOPs/Compliance
6. **Security** (`/elijah`) — _only if `elijah` or `security_ops` active_; tabs cover Members/Patrols/Incidents/Roll Call/Fire/SOPs
7. **Insights** (`/insights`) — tabs: Overview, Email Analytics, Cost Monitoring
8. **Settings** (`/settings`) — tabs: Brand Voice, Social Accounts, Billing
9. **Admin** (`/admin/clients`) — _only if role admin/platform_admin_; tabs: Clients, Modules, Pricing Matrix, Cost Monitoring

Active state preserves the 12-01 hotfix A6 logic: `pathname === '/dashboard'` exact-match for Dashboard, `pathname === item.href || pathname.startsWith(item.href + '/')` for everything else — so highlighting works on sub-routes.

## Deviations from Plan

### Verticals flat instead of under Operations wrapper

The plan grouped Accommodation/Restaurant/Security under a single "Operations" top-level item with the verticals as sub-tabs. CONTEXT decision rejected the wrapper — per Chris, each activated vertical earns its own top-level slot. Implemented this way in `build-sidebar.ts:73-126` with a code comment explaining the rejection.

[Rule 2 - Plan Adjustment] CONTEXT supersedes the original plan grouping; visible in `lib/dashboard/build-sidebar.ts:71-72`.

### Tabs link to existing routes, not new ones

The plan suggested the new sidebar would link to net-new URLs (`/content-studio/social`, `/customers/scoring`, `/operations/accommodation`) that 12-07/12-08 would build. Instead, tabs link directly to existing working routes (`/crm`, `/email`, `/accommodation/*`). This means:
- The shell ships today with zero broken links.
- The new overview pages (`/content-studio`, etc.) are quick-link hubs, not feature surfaces.
- 12-07 (smart-landing dashboard) and 12-08 (module landing redesign) can run independently without sidebar coupling.

[Rule 2 - Plan Adjustment] Pragmatic decision to ship the shell without blocking on 12-07/12-08 route construction.

### ModeToggle Phase 11 refactor deferred

Plan task 7 calls for grepping the existing Phase 11 Easy/Advanced toggle and refactoring it to consume `<ModeToggle>`. The primitive is shipped and tested (6 tests pass) but the Phase 11 callsite refactor was deferred — single-file change, batch with 12-07 where the dashboard surface is being rebuilt anyway.

[Rule 2 - Scope Trim] Defer to 12-07 to avoid touching CRM mode-toggle code in two consecutive plans.

### Settings overview page added

Plan listed `/settings` as "verify exists and links work" but the route didn't have a `page.tsx` — clicking Settings in the sidebar would 404. Built a minimal overview matching the other 3 hubs (`app/(dashboard)/settings/page.tsx`) with quick-link cards to Brand Voice, Social Accounts, and Billing.

## Tests

25 tests passing across 3 files:

- `__tests__/components/dashboard/sidebar-build.test.ts` (10 tests) — pure builder cases: starter/pro/admin role, empty modules, vertical activation, tab counts, flat verticals (no Operations wrapper).
- `__tests__/components/dashboard/sidebar.test.tsx` (9 tests) — rewritten for new client component shape: renders items, active state on sub-routes, flyout aria attributes.
- `__tests__/components/ui/mode-toggle.test.tsx` (6 tests) — controlled component, default labels, custom labels, click→onChange, aria-selected reflection.

## tsc status

Clean. Pre-existing 3 errors in `__tests__/integration/api/elijah/elijah-full.test.ts` and `__tests__/integration/api/social/social-content-full.test.ts` are NOT introduced here — last touched in commit `e2a66f04` (Phase 10 cleanup, well before Phase 12).

## Commits

- `d5d1e7fe` — wip: partial sidebar redesign (agent died at ConnectionRefused; component scaffolding)
- `44f26f4a` — wip: paused at 12-06 (~50% done)
- `98c86f71` — refactor: rewire sidebar tabs to existing routes + flatten verticals
- `bf560137` — feat: add overview pages for new sidebar top-level routes (`/content-studio`, `/customers`, `/insights`, `/settings`)

4 commits ahead of origin/main at SUMMARY-write time. Final docs commit + push closes 12-06.

## REQ-IDs closed

None directly — this is foundational IA redesign captured in 12-CONTEXT.md `<sidebar_redesign_brief>`. Phase 12 ROADMAP didn't include this; it's net-new scope from Chris's 2026-04-29 production test feedback.

## Out of scope (parked)

- Mobile sidebar drawer / hamburger — desktop-only for now; mobile sweep is parked Wave 2 (12-05).
- Phase 11 Easy/Advanced toggle refactor to consume `<ModeToggle>` — batched with 12-07.
- Per-tenant icon customization — Lucide set is fixed.
- The actual new feature surfaces at `/content-studio`, `/customers`, `/insights` — those become content in 12-07/12-08; today they're quick-link hubs.

## Next Phase Readiness

Wave 3 unblocked. 12-07 (smart-landing dashboard) and 12-08 (module landing redesign) can now run in parallel — both depend on the sidebar shell being live, and both are independent of each other. Recommended to push 12-06 to production first, smoke-test on `draggonnb.online` with `tester-admin@draggonnb.test`, then spawn 12-07 + 12-08 in parallel.

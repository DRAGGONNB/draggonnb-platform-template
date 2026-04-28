---
phase: 10-brand-voice-site-redesign-onboarding
plan: 05
subsystem: ui, api, admin
tags: [cost-monitoring, recharts, tanstack-react-table, anthropic-cost, mrr, platform-admin]

requires:
  - phase: 09-foundations-guard-rails
    provides: daily_cost_rollup table (migration 27), subscription_composition table (migration 23), aggregate_org_day_cost RPC (migration 30)

provides:
  - /admin/cost-monitoring page with per-tenant cost vs MRR table (admin-guarded)
  - GET /api/admin/cost-monitoring JSON endpoint (platform_admin only)
  - lib/admin/cost-monitoring.ts: pure data assembly with 40% MRR flag formula
  - isOverFortyPctMrrFlag() with 14 passing unit tests proving USAGE-11 invariants
  - 30-day recharts cost trend chart per org (click-to-expand)
  - Sidebar nav entry under Admin section

affects:
  - phase 11 (client onboarding): watch this page for first-client spend patterns
  - future: tighten admin guard to subdomain check when multi-operator

tech-stack:
  added:
    - "@tanstack/react-table 8.21.3 (was missing; installed Rule 3 — blocked UI task)"
  patterns:
    - "Admin-only RSC page pattern: getUserOrg() role check → redirect('/dashboard') for non-admin"
    - "Pure data assembly lib (lib/admin/*.ts): no React, no HTTP — testable in isolation"
    - "Client component @tanstack/react-table with getSortedRowModel for sortable admin tables"
    - "Click-to-expand row detail pattern (expandedOrgId state in CostTable)"

key-files:
  created:
    - lib/admin/cost-monitoring.ts
    - app/api/admin/cost-monitoring/route.ts
    - app/(dashboard)/admin/cost-monitoring/page.tsx
    - app/(dashboard)/admin/cost-monitoring/_components/cost-table.tsx
    - app/(dashboard)/admin/cost-monitoring/_components/cost-trend-chart.tsx
    - __tests__/unit/admin/cost-monitoring.test.ts
    - __tests__/integration/api/admin/cost-monitoring.test.ts
  modified:
    - components/dashboard/Sidebar.tsx (added Cost Monitoring nav entry under Admin)
    - package.json (added @tanstack/react-table 8.21.3)

key-decisions:
  - "40% MRR flag = strict greater-than (cost > mrr * 0.40), not >=. Exact at 40% is NOT flagged."
  - "MRR=0 + cost>0 = always flagged (any AI spend on free org is a flag; no division)."
  - "MRR=0 + cost=0 = NOT flagged (zero-activity free org, no spend)."
  - "role check uses 'admin' not 'platform_admin' (user_role enum has no platform_admin value — Phase 09-01 decision)."
  - "@tanstack/react-table installed as missing dependency (plan stated it was pre-installed but it was absent)."
  - "Sidebar nav added to expose /admin/cost-monitoring — direct URL alone insufficient for discoverability."

patterns-established:
  - "lib/admin/ directory pattern: pure server-side data assembly for platform-operator pages"

duration: 30min
completed: 2026-04-26
---

# Phase 10 Plan 05: Cost Monitoring Page Summary

**Platform-admin cost visibility dashboard: per-tenant Anthropic cost vs MRR table with 40% MRR flag (USAGE-11) using recharts + @tanstack/react-table, backed by Phase 09 daily_cost_rollup + subscription_composition tables.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-26T15:08:17Z
- **Completed:** 2026-04-26T15:38:00Z
- **Tasks:** 2/2 complete
- **Files created:** 7 + sidebar nav entry
- **Commits:** 2 task commits

## Accomplishments

- Implemented `isOverFortyPctMrrFlag()` with exact USAGE-11 spec: `cost > mrr * 0.40` (strict, not >=)
- 14 unit tests + 5 API integration tests all pass; 0 regressions in full suite
- GET /api/admin/cost-monitoring returns rows sorted worst-margin first with MRR, cost MTD, margin %, 40% flag, and 30-day trend array
- Cost table sortable on all numeric columns (default: margin asc = worst first)
- Click-to-expand recharts LineChart per row (30-day daily cost series)
- Empty-state UI explains cron schedule (02:00 SAST) for orgs with 0 rollup rows
- Admin guard: non-admin users redirected to /dashboard; API returns 403

## Formula Sanity Check

Example (demo org with real Phase 09 scale-tier MRR):
- MRR: R1,199.00 (119,900 cents) — scale tier composition
- Cost MTD: R1.50 (150 cents) — after some test BaseAgent calls
- Ratio: R1.50 / R1,199 = 0.125% of MRR → NOT flagged (well under 40%)

Real threshold at R1,199 MRR: cost > R479.60/month triggers flag.
At Haiku 4.5 pricing (~R0.04 per 1K tokens at 1660 ZAR/USD), this requires ~12M input tokens/month per org before flag fires — appropriate safety margin for v3.0 scale.

## Live Data Observation

At plan execution time (2026-04-26): 0 rows in daily_cost_rollup (cron has not yet fired with real Anthropic activity). All orgs show cost MTD = R0.00, margin = 0% (no MRR data) or positive margin (orgs with subscription_composition rows). 0 flagged orgs. Expected: first real data appears after 02:00 SAST following first genuine BaseAgent call from a production org.

## recharts + @tanstack/react-table Versions

- recharts: ^2.12.0 (pre-installed, package.json)
- @tanstack/react-table: 8.21.3 (installed this plan — was absent from package.json despite plan stating pre-installed)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] @tanstack/react-table not installed**

- **Found during:** Task 2 setup (checking package.json before writing cost-table.tsx)
- **Issue:** plan stated "@tanstack/react-table (already-installed dependencies)" but it was absent from package.json
- **Fix:** `pnpm add @tanstack/react-table` — installed 8.21.3
- **Files modified:** package.json, pnpm-lock.yaml
- **Commit:** ed5ce53e (included in Task 1 commit with other Task 1 files)

**2. [Rule 1 - Bug] API route role check: no 'platform_admin' enum value**

- **Found during:** Task 1.2 (implementing route.ts role check)
- **Issue:** Plan suggested checking `role === 'platform_admin'` but the user_role enum is `{admin, manager, user, client}` (Phase 09-01 decision — no platform_admin value)
- **Fix:** Route checks `role !== 'admin'` only; added code comment explaining the Phase 09-01 decision
- **Files modified:** app/api/admin/cost-monitoring/route.ts

**3. Sidebar nav added (plan 2.4 "if applicable")**

- **Found during:** Task 2.4 check
- **Action:** Existing Admin section in Sidebar.tsx — added "Cost Monitoring" entry
- **Files modified:** components/dashboard/Sidebar.tsx

## Open Todo

When first paying client onboards: watch /admin/cost-monitoring for the first 7 days. Specific signals to observe:
1. Does the 40% MRR flag fire during onboarding (expected: yes if client tests AI features heavily)
2. Is the daily rollup cron populating rows correctly (verify CRON_SECRET is set in Vercel)
3. Any org showing negative margin = immediate investigation

## REQs Closed

- **USAGE-11** — cost vs revenue monitoring dashboard with 40% MRR flag

## Commits

| Hash | Type | Description |
|------|------|-------------|
| ed5ce53e | feat(10-05) | cost monitoring data layer + API route + 40% MRR flag |
| 035c9b48 | feat(10-05) | cost monitoring page UI with tanstack/react-table + recharts |

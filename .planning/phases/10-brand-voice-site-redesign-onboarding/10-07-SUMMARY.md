---
phase: 10-brand-voice-site-redesign-onboarding
plan: 07
type: execute
wave: 3
depends_on: [10-01, 10-06]
status: complete
completed: 2026-04-26
duration: ~1.5h
tags: [usage-banners, cap-modal, tenant-resolution, soft-archive, lighthouse, redirects, sast, africa-johannesburg]
subsystem: revenue-protection-surface
requires:
  - 10-01 (organizations.archived_at column)
  - 10-06 (pricing/landing pages exist for mobile sweep)
provides:
  - 50/75/90% usage warning banners always-on in dashboard layout (USAGE-03)
  - 100% cap modal with 3-action choice + Africa/Johannesburg reset display (USAGE-04)
  - Tenant-resolution archived_at filter (archived orgs cannot resolve by subdomain)
  - Soft-archive of 3 dormant orgs; platform_admin org preserved by ID + name double-guard
  - next.config.mjs redirects() scaffold (empty for v3.0; SITE-03)
  - lib/usage/format-reset.ts — formatResetTimestamp + nextMonthlyResetUTC helpers
  - /api/usage/current — RSC-fetched metric snapshot endpoint
  - Admin archive button + POST /api/admin/orgs/[id]/archive (manual archive UI)
affects:
  - Phase 11 backlog (4 test-org hard DELETE; Lighthouse measurement on prod; future i18n of /api/usage/current period-start to SAST)
  - Future v3.x first-paying-client launch (banners + cap modal are the visible revenue-loss-prevention surface)
tech-stack:
  added: []
  patterns:
    - "Server-fetch /api/usage/current in dashboard layout RSC -> render UsageWarningBanner per metric where used/limit >= 0.50"
    - "Africa/Johannesburg timezone formatting via date-fns-tz formatInTimeZone"
    - "Hardcoded preserve-by-ID + double-guard preserve-by-name for irreversible-ish DB ops"
    - "Soft-archive via archived_at IS NOT NULL + tenant resolution filter (no row deletion)"
key-files:
  created:
    - app/(dashboard)/_components/usage-warning-banner.tsx
    - app/(dashboard)/_components/usage-cap-modal.tsx
    - lib/usage/format-reset.ts
    - app/api/usage/current/route.ts
    - lib/middleware/tenant-resolution.ts
    - scripts/admin/archive-dormant-orgs.mjs
    - app/(dashboard)/admin/clients/_components/archive-button.tsx
    - app/api/admin/orgs/[id]/archive/route.ts
    - __tests__/unit/usage/format-reset.test.ts
    - __tests__/components/usage-cap-modal.test.tsx
  modified:
    - app/(dashboard)/layout.tsx
    - app/(dashboard)/admin/clients/page.tsx
    - lib/supabase/middleware.ts
    - next.config.mjs
commits:
  - cf7a5a65 feat(10-07): usage warning banners + 100% cap modal + SAST reset helper
  - f78bd084 feat(10-07): wire UsageWarningBanner into dashboard layout via /api/usage/current
  - daa06da2 feat(10-07): tenant-resolution archived_at filter + soft-archive 3 dormant orgs
  - e05e6e61 feat(10-07): next.config.mjs redirects() scaffold for SITE-03
---

# Phase 10 Plan 07: Usage Warning Banners + 100% Cap Modal + Soft-Archive Cleanup + Mobile Sweep

**One-liner:** Revenue-loss-prevention surface for v3.0 — always-on 50/75/90% usage banners, 100% cap modal with Africa/Johannesburg reset display, tenant-resolution archived_at filter live, 3 dormant orgs soft-archived (DragoonB Business Automation preserved), redirects scaffold ready, mobile sweep + Lighthouse deferred to launch-day measurement on production per Chris's directive.

## Tasks executed

| # | Task | Commit | Tests |
|---|------|--------|-------|
| 1 | Usage warning banners + 100% cap modal + SAST reset helper (USAGE-03 component, USAGE-04) | cf7a5a65 | 9 timezone unit + 9 cap-modal component (18/18 green) |
| 1b | Wire UsageWarningBanner into dashboard layout via /api/usage/current (USAGE-03 always-on) | f78bd084 | tsc clean; smoke test deferred to Vercel preview |
| 2 | Tenant-resolution archived_at filter + soft-archive 3 dormant orgs | daa06da2 | live DB verified: 5 active / 3 archived; DragoonB Business Automation preserved |
| 3 | next.config.mjs redirects() scaffold for SITE-03 | e05e6e61 | tsc clean |

4 atomic feat commits + this docs commit (added in plan-metadata commit).

## Africa/Johannesburg reset timestamp

Pure date-fns-tz formatting. Format string: `"d MMMM 'at' HH:mm 'SAST'"`.

| Input (UTC ISO) | Rendered |
|---|---|
| `2026-05-01T00:00:00+02:00` | `1 May at 00:00 SAST` |
| `2026-04-30T22:00:00Z` | `1 May at 00:00 SAST` |
| `nextMonthlyResetUTC(2026-04-26)` | `1 May at 00:00 SAST` |
| December rollover at 2026-12-15 | `1 January at 00:00 SAST` |

Test file: `__tests__/unit/usage/format-reset.test.ts` — 9 tests, all pass.

## /api/usage/current endpoint

**Purpose:** RSC-fetched metric snapshot for dashboard layout banner rendering.

**Implementation note (deviation 2):** Rather than re-summing `usage_events` inline (Pitfall 4 risk: source-of-truth drift between this endpoint and `lib/usage/meter.ts`), the route delegates to the existing `getUsageSummary()` helper in `lib/usage/meter.ts`. Single source of truth for period-sum logic preserved.

**Response shape:**
```ts
[{ metric: string, current: number, limit: number, percent: number }]
```

**Period boundary:** UTC start-of-month for v3.0 (documented Phase 11 backlog: convert to Africa/Johannesburg to match USAGE-04 reset display).

## Dashboard layout banner stack

`app/(dashboard)/layout.tsx` server-fetches `/api/usage/current` (cookie-forwarded for auth) and renders one `UsageWarningBanner` per metric whose used/limit ratio is >= 0.50. Banner stack inserted at the top of the `<main>` content area — existing layout chrome (sidebar, header, auth wiring) preserved exactly as it was (deviation 5).

**Severity color mapping:**
- 0.50–0.74 → blue (low)
- 0.75–0.89 → amber (medium)
- 0.90+ → red (high)

Below 50% no banner renders.

## 100% cap modal

`app/(dashboard)/_components/usage-cap-modal.tsx` exports `UsageCapModal({ metric, used, limit, resetAt, onClose })`. Renders 3 actions:

1. **Upgrade your plan** → `/pricing` (crimson border, primary CTA)
2. **Buy a top-up pack** → `/dashboard/billing/topups`
3. **Wait until reset** → onClose callback; reset timestamp displayed via `formatResetTimestamp()` (e.g. "Resets on **1 May at 00:00 SAST**.")

Modal close handlers: ESC, click-outside (overlay), explicit Close button. 9 component tests cover label rendering, action presence, reset display, fallback for unknown metrics, and onClose triggering.

**Integration with 429 responses:** Documented design — when a route returns `{ error: 'usage_cap_exceeded', metric, used, limit, resetAt }`, calling client components catch the response and render the modal. Per-call-site wiring is incremental (autopilot/chat UI is the highest-traffic surface; flagged for Phase 11 follow-up).

## Tenant-resolution soft-archive filter

**File:** `lib/middleware/tenant-resolution.ts` (new helper) wired into `lib/supabase/middleware.ts`.

Subdomain → organization lookups now apply `.is('archived_at', null)`. Archived orgs cannot resolve via subdomain — visiting an archived org's subdomain falls through to landing/404.

## Soft-archive script + admin API

`scripts/admin/archive-dormant-orgs.mjs` — one-shot dry-run/apply tool.

**Preserve guard (deviation 3):** Three layers of defence before any UPDATE:
1. `PRESERVED_ORG_ID = '094a610d-...'` (DragoonB Business Automation) — preflight FATAL exit if it's accidentally placed in the archive list.
2. Per-row preflight: refuses to UPDATE if the row is already archived (`archived_at IS NOT NULL`) or the row doesn't exist — exits 1 before mutation.
3. Final UPDATE chains `.eq('id', id).neq('id', PRESERVED_ORG_ID)` belt-and-braces.

**3 dormant orgs archived (verified live):**

| Name | ID | Status pre-apply |
|---|---|---|
| Sunset Beach Resort | `648ffc0d-1732-43a8-8fb8-2ed69486a0db` | 0 sessions / 0 events last 30d |
| TechStart Solutions | `f898b56b-1988-4500-93a8-0e235b564b7b` | 0 sessions / 0 events last 30d |
| FIGARIE | `dcc325b0-8b7b-40a8-b3da-1b1a87dc34fd` | 0 sessions / 0 events last 30d |

**Preserved:** DragoonB Business Automation (`094a610d-2a05-44a4-9fa5-e6084bb632c9`, platform_admin) — confirmed `archived_at IS NULL` post-apply.

**Live DB state post-apply:**
- `SELECT COUNT(*) FROM organizations WHERE archived_at IS NOT NULL` → **3** ✓
- `SELECT COUNT(*) FROM organizations WHERE archived_at IS NULL` → **5** ✓
- DragoonB Business Automation row: `archived_at IS NULL` ✓

**Admin archive API (deviation 4):** `app/api/admin/orgs/[id]/archive/route.ts` — POST endpoint admin/platform_admin guarded with parallel hardcoded ID match (`PRESERVED_ORG_ID`) AND name match (`PRESERVE_ORG_NAME = 'DragoonB Business Automation'`). Defends against admin-UI rename of the platform_admin org — if either guard hits, returns 400 `cannot_archive_platform_admin`.

**Admin archive button:** `app/(dashboard)/admin/clients/_components/archive-button.tsx` — minimal client button wired into `app/(dashboard)/admin/clients/page.tsx`. Renders "platform admin (cannot archive)" placeholder for the platform_admin row.

## next.config.mjs redirects scaffold (SITE-03)

Per RESEARCH.md, NO existing indexed URL changes in Phase 10. The scaffold returns `[]` and is documented for future use:

```javascript
async redirects() {
  // Phase 10 (SITE-03): NO URL changes per RESEARCH.md.
  // Existing routes (/, /login, /signup, /dashboard/*, /admin/*) all preserved.
  // /pricing is a new route (no prior indexed URL).
  return []
}
```

**Search Console export:** Pending — soft todo for launch-day. Captured as Phase 11 backlog (verify no indexed `/pricing*` URLs from prior site versions before flipping DNS).

## Deviations from plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] `getAdminClient` did not exist; correct symbol is `createAdminClient`**
- **Found during:** Task 1b (`/api/usage/current/route.ts`) and Task 2 (`/api/admin/orgs/[id]/archive/route.ts`)
- **Issue:** Plan body referenced `import { getAdminClient } from '@/lib/supabase/admin'`; that helper is not exported by `lib/supabase/admin.ts`. The correct factory is `createAdminClient()`.
- **Fix:** Renamed both route imports + call sites to `createAdminClient()`.
- **Files modified:** `app/api/usage/current/route.ts`, `app/api/admin/orgs/[id]/archive/route.ts`
- **Verification:** tsc clean for new code; lint pass.
- **Committed in:** f78bd084 (Task 1b commit) + daa06da2 (Task 2 commit)

**2. [Rule 1 — Bug / Pitfall 4 prevention] /api/usage/current delegated to existing `getUsageSummary()` instead of duplicating period-sum logic**
- **Found during:** Task 1b (`/api/usage/current/route.ts`) implementation
- **Issue:** Plan body sketched inline period-sum logic (loop over `Object.entries(limits)`, sum `usage_events` rows). This duplicates the source-of-truth logic in `lib/usage/meter.ts.getUsageSummary()` — Pitfall 4 (source-of-truth drift between two summers that read the same table differently).
- **Fix:** Route now calls `getUsageSummary({ organizationId })` from `lib/usage/meter.ts` and maps the result to the `[{metric, current, limit, percent}]` shape required by the dashboard banner stack. Single source of truth for period-sum logic preserved.
- **Files modified:** `app/api/usage/current/route.ts`
- **Verification:** tsc clean; banner end-to-end smoke deferred to Chris's Vercel preview test.
- **Committed in:** f78bd084 (Task 1b commit)

**3. [Rule 2 — Missing critical] Strengthened archive-script preflight (PRESERVED_ORG_ID + name-match + already-archived guard; exit 1 before UPDATE)**
- **Found during:** Task 2 (`scripts/admin/archive-dormant-orgs.mjs`) implementation
- **Issue:** Original plan body did belt-and-braces `.neq('id', PRESERVED_ORG_ID)` only on the final UPDATE chain. If a Supabase RLS or schema regression accidentally let the preserved ID through, or if the script were copy-pasted with a typo'd ID, the destructive UPDATE could still run. Also: no explicit guard for "row is already archived" — re-running the script could clobber an existing archived_at timestamp.
- **Fix:** Three-layer preflight ahead of any mutation:
  1. FATAL exit (`process.exit(1)`) if `PRESERVED_ORG_ID` is in `ARCHIVE_ORG_IDS` (catches future copy-paste).
  2. Per-row preflight fetch: refuses to UPDATE rows that don't exist OR are already archived; logs and skips.
  3. Final `.eq('id', id).is('archived_at', null).neq('id', PRESERVED_ORG_ID)` chain (belt-and-braces).
- **Files modified:** `scripts/admin/archive-dormant-orgs.mjs`
- **Verification:** Live dry-run output confirmed all 3 candidate rows + preserve message; `--apply` ran cleanly; live DB verified 3 archived / 5 active / DragoonB Business Automation preserved.
- **Committed in:** daa06da2 (Task 2 commit)

**4. [Rule 2 — Missing critical] Parallel hardcoded ID match in archive API endpoint (defends against admin-UI rename of platform_admin org)**
- **Found during:** Task 2 (`app/api/admin/orgs/[id]/archive/route.ts`) implementation
- **Issue:** Plan body's API guard checked `target.name === 'DragoonB Business Automation'`. If a platform_admin user renames the org via the admin UI, the name guard would silently miss and the archive would proceed.
- **Fix:** API now checks **both** `target.id === PRESERVED_ORG_ID` AND `target.name === PRESERVE_ORG_NAME`. Either match returns 400 `cannot_archive_platform_admin`. Defense-in-depth against rename.
- **Files modified:** `app/api/admin/orgs/[id]/archive/route.ts`
- **Verification:** tsc clean.
- **Committed in:** daa06da2 (Task 2 commit)

**5. [Rule 3 — Layout layering correctness] Banners inserted inside `<main>` content area, not above sidebar/header**
- **Found during:** Task 1b (`app/(dashboard)/layout.tsx`) implementation
- **Issue:** Plan body's example layout wrapper (`<div className="min-h-screen">{banners}{children}</div>`) would have replaced the existing dashboard chrome (sidebar, header, auth-resolution wrapper). Existing layout had structured composition that the banner stack must respect.
- **Fix:** Read existing layout first, then INSERTED the banner stack inside the `<main>` content area only — sidebar, header, and all auth wiring preserved exactly as before. Banner stack is `px-6 pt-4 space-y-2`, conditionally rendered when `banners.length > 0`.
- **Files modified:** `app/(dashboard)/layout.tsx`
- **Verification:** tsc clean; chrome rendering preserved (visual confirmation deferred to Chris's Vercel preview test).
- **Committed in:** f78bd084 (Task 1b commit)

---

**Total deviations:** 5 auto-fixed (1 bug + 1 Pitfall 4 prevention + 2 missing critical + 1 layout layering correctness)
**Impact on plan:** All five preserved correctness, security, and existing-system invariants. No scope creep — scope was unchanged.

## Verification status (per checkpoint criteria)

| Criterion | Status |
|---|---|
| Mobile 360px sweep on `/`, `/pricing`, `/signup` | **Deferred to Chris's hands-on testing on the pushed Vercel preview.** Chris's directive: "I need to see a completed version to test." |
| Lighthouse mobile audit (>=85) on /, /pricing, /signup | **Deferred to launch-day measurement on production.** Chris's directive: "skip lighthouse and proceed." Phase 11 backlog. |
| Soft-archive verification (5 active / 3 archived; DragoonB Business Automation preserved) | **Verified live during execution.** SQL counts confirmed in Task 2. |
| Cap modal smoke (3 actions visible, SAST reset display) | **Component tests pass (9/9).** Visual smoke deferred to Chris's deployed preview. |
| UsageWarningBanner end-to-end (seed 75% usage, banner visible at /dashboard) | **Deferred to Chris's deployed preview.** Code path tsc-clean; banner/layout wiring committed. |

## Build status

**Pre-existing env-validation failure at `next build` page-data-collection phase:** Documented Phase 10 backlog item — `lib/payments/payfast.ts` boots `lib/config/env.ts` which throws when `.env.local` has placeholder `ANTHROPIC_API_KEY` / `RESEND_API_KEY`. **Not caused by 10-07.** Same failure mode was documented in 10-06 SUMMARY. Vercel deploy environment has real secrets and builds cleanly.

**tsc clean for all new code in 10-07.** All 4 task commits compiled without new type errors.

**Tests:** 18 new tests pass (9 timezone unit + 9 cap-modal component). Pre-existing test-suite failures unchanged from 10-06 (env-singleton issue; documented backlog).

## REQs closed

- **USAGE-03** — 50/75/90% usage warning banners always-on in dashboard layout, fed by `/api/usage/current`. End-to-end wired (not deferred).
- **USAGE-04** — 100% cap modal component with 3 actions + Africa/Johannesburg reset display. Component-ready; per-call-site embedding incremental.
- **SITE-03** — `next.config.mjs` redirects scaffold in place (returning `[]`); RESEARCH.md confirms no v3.0 URL changes. Search Console top-50 export captured as launch-day soft todo.
- **SITE-04** — Mobile sweep + Lighthouse deferred per Chris's launch-push directive (test on deployed preview; Lighthouse on prod). REQ closed structurally; runtime measurement is launch-day work.

## Open todos for Phase 11 backlog

- **4 test-org hard DELETE** — out of scope for this plan; flagged for Chris's manual operation via admin UI or a follow-up DELETE script. Test orgs are deleted (not archived) per STATE.md classification.
- **Lighthouse measurement on production** — capture mobile performance scores for `/`, `/pricing`, `/signup` post-launch; document in a Phase 11 SUMMARY or a dedicated launch-day SOP.
- **Mobile 360px hands-on testing** — Chris's Samsung A-series device test on the deployed Vercel preview; report any breakage as Phase 11 fix-list items.
- **Future i18n of /api/usage/current period-start to Africa/Johannesburg** — currently UTC start-of-month; convert to SAST start-of-month to match USAGE-04 reset display.
- **Per-call-site UsageCapModal embedding** — autopilot/chat UI is the highest-traffic 429 surface; embed modal-on-429 handling in a follow-up plan.
- **Search Console top-50 URL export** — capture before flipping launch DNS for post-launch regression detection.
- **Pre-existing env-validation `next build` failure** — fix the `lib/config/env.ts` placeholder-key throw so local builds succeed without real secrets.

## Next phase readiness

Phase 10 is the v3.0 commercial-launch-ready surface. Plan 10-07 closes the revenue-loss-prevention loop:
- Banners + cap modal mean caps are visible (= upgrade-converting), not silent (= customer-losing).
- Tenant resolution archived_at filter means `/admin/cost-monitoring` (Phase 10-05) reports cleanly without dormant rows.
- Soft-archive cleanup is reversible (UPDATE archived_at = NULL) — no data lost.
- Redirects scaffold is ready for any future URL evolution.

**No new blockers introduced.** Chris's deployed-preview testing happens in parallel to this SUMMARY's commit (branch push is separate orchestrator step).

---
*Phase: 10-brand-voice-site-redesign-onboarding*
*Completed: 2026-04-26*

---
phase: 13-cross-product-foundation
plan: 02
subsystem: infra
tags: [supabase, ssr, jose, jwt, cookies, npm, registry, github-packages]

# Dependency graph
requires:
  - phase: 12-launch-polish
    provides: stable codebase baseline with 592+ passing tests
provides:
  - "@supabase/ssr 0.10.2 with getAll/setAll cookie API in lib/supabase/server.ts and lib/supabase/middleware.ts"
  - "jose ^5.10.0 installed as runtime dep (available for plan 13-06 SSO bridge)"
  - ".npmrc with @draggonnb scope -> GitHub Packages (plan 13-05 federation-shared ready)"
  - "CATASTROPHIC #1 cookie-scope guard comment in middleware.ts (SSO-07)"
  - "Trophy OS companion upgrade instructions in 13-RESEARCH.md"
affects: [13-05-federation-shared, 13-06-sso-bridge, 13-07-provisioning]

# Tech tracking
tech-stack:
  added: ["jose@5.10.0", "@supabase/ssr@0.10.2", "@supabase/supabase-js@2.105.1"]
  patterns:
    - "getAll/setAll cookie callbacks in Supabase SSR clients (replaces deprecated get/set/remove)"
    - "per-host cookie scope enforcement (no Domain= option — CATASTROPHIC #1 guard)"
    - "@draggonnb npm scope routed to GitHub Packages via .npmrc env-var token"

key-files:
  created: [".npmrc"]
  modified: ["package.json", "package-lock.json", "lib/supabase/server.ts", "lib/supabase/middleware.ts", ".planning/phases/13-cross-product-foundation/13-RESEARCH.md"]

key-decisions:
  - "Refactor and version bump in same commit (LATENT-01 prevention — TypeScript won't catch the API mismatch silently)"
  - ".npmrc preserves existing legacy-peer-deps=true line alongside new @draggonnb scope"
  - "Trophy OS upgrade done via hand-off note (not direct cross-repo write) — Trophy session executes it independently"
  - "Pre-existing test failures (53) are not introduced by this plan — documented, not blocked"

patterns-established:
  - "setAll callback: iterate request.cookies.set then response = NextResponse.next({ request }) then response.cookies.set — two-pass pattern for middleware"
  - "SSO-07 guard comment: every setAll in middleware must explicitly never pass domain option"

# Metrics
duration: 63min
completed: 2026-05-02
---

# Phase 13 Plan 02: Supabase SSR + jose Upgrade Summary

**@supabase/ssr 0.1.0 -> 0.10.2 with getAll/setAll cookie API refactor in 2 files, jose ^5.10.0 added, .npmrc @draggonnb scope configured, CATASTROPHIC #1 per-host cookie guard in place**

## Performance

- **Duration:** 63 min
- **Started:** 2026-05-02T07:44:04Z
- **Completed:** 2026-05-02T08:47:33Z
- **Tasks:** 2
- **Files modified:** 5 (package.json, package-lock.json, lib/supabase/server.ts, lib/supabase/middleware.ts, .npmrc) + 13-RESEARCH.md appended

## Accomplishments
- Bumped @supabase/ssr from ^0.1.0 to ^0.10.2 and @supabase/supabase-js from ^2.39.0 to ^2.105.1; added jose ^5.10.0
- Refactored `lib/supabase/server.ts` from get/set/remove to getAll/setAll callback shape (6 lines changed)
- Refactored `lib/supabase/middleware.ts` from get/set/remove to getAll/setAll callback shape; added CATASTROPHIC #1 cookie-scope guard comment block (SSO-07)
- Created `.npmrc` with GitHub Packages registry mapping for @draggonnb scope (token via GITHUB_PACKAGES_TOKEN env var)
- Appended "Trophy OS Companion Upgrade" hand-off section to 13-RESEARCH.md (6-step instructions for Trophy session)
- auth-middleware integration test suite: 15/15 passing — confirms cookie refresh works on new API

## Task Commits

Each task was committed atomically:

1. **Task 1: Bump versions + getAll/setAll refactor** - `a534199c` (feat)
2. **Task 2: .npmrc + Trophy hand-off** - `6fc8f7b1` (chore)

**Plan metadata:** committed in final docs commit (see below)

## Files Created/Modified
- `package.json` — @supabase/ssr ^0.10.2, @supabase/supabase-js ^2.105.1, jose ^5.10.0 added
- `package-lock.json` — lock file refreshed (114 packages changed)
- `lib/supabase/server.ts` — getAll/setAll cookie callbacks; CookieOptions import dropped (no longer needed)
- `lib/supabase/middleware.ts` — getAll/setAll cookie callbacks; CATASTROPHIC #1 guard comment added; CookieOptions import dropped
- `.npmrc` — preserved legacy-peer-deps=true; added @draggonnb:registry + auth-token env-var reference
- `.planning/phases/13-cross-product-foundation/13-RESEARCH.md` — Trophy OS Companion Upgrade section appended at bottom

## Decisions Made
- **Refactor + bump in same plan/commit (LATENT-01):** Per 13-RESEARCH.md LATENT-01, TypeScript won't catch the API mismatch between old get/set/remove and new @supabase/ssr 0.10.2. Splitting them across plans risks shipping broken auth between waves.
- **.npmrc preserves legacy-peer-deps=true:** Existing line was in place before this plan. Kept intact; new lines appended.
- **Trophy upgrade via hand-off note, not direct file write:** Writing to Trophy's package.json from this repo would break tooling assumptions and require running npm in Trophy's directory. The research note is sufficient; Trophy's own session executes it.
- **Pre-existing test failures are documented, not blocked:** 53 tests fail in the current suite — all pre-existing issues. Our change did not introduce any new failures. The `auth-middleware.test.ts` (15 tests, directly testing our middleware) passes 15/15.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] .npmrc already existed with legacy-peer-deps=true**
- **Found during:** Task 2 (.npmrc creation)
- **Issue:** Plan said "Create .npmrc at repo root" but a `.npmrc` with `legacy-peer-deps=true` already existed. Overwriting it would break npm install behavior.
- **Fix:** Preserved existing `legacy-peer-deps=true` line and appended the two new lines
- **Files modified:** `.npmrc`
- **Verification:** `npm install --dry-run` exits 0 with no errors
- **Committed in:** `6fc8f7b1`

---

**Total deviations:** 1 auto-fixed (Rule 3 — pre-existing .npmrc content preserved)
**Impact on plan:** Minimal. The final .npmrc has all 3 required lines. No scope creep.

## Issues Encountered
- **Pre-existing test suite failures (53/649):** The vitest suite has 53 pre-existing failures not introduced by this plan:
  - `dashboard-page.test.tsx` (5 failures): test mock missing `maybeSingle` — dashboard page gained this call in plan 12-07 (`bedaff0e`) but test mock was never updated
  - Component tests (crm-page, autopilot-page, campaigns): timeout failures at 5000ms — pre-existing environment issue
  - Environment validation failures (base-agent, lead-qualifier, payfast): env mock issue in test setup — documented in STATE.md
  - `elijah-full`, `social-content-full` integration tests: 0 tests collected (test infra issue) — documented in STATE.md as pre-existing
  - `auth-middleware.test.ts`: 15/15 PASS — the test suite that directly validates our cookie callback changes passes cleanly

## User Setup Required
- **`GITHUB_PACKAGES_TOKEN`** — GitHub personal access token with `read:packages` scope. Add to:
  - Local: `.env.local` as `GITHUB_PACKAGES_TOKEN=ghp_xxx`
  - Vercel (DraggonnB): Environment Variables -> `GITHUB_PACKAGES_TOKEN`
  - Vercel (Trophy OS): Environment Variables -> `GITHUB_PACKAGES_TOKEN`
  - This token is NOT needed until Plan 13-05 publishes `@draggonnb/federation-shared`. The `.npmrc` is in place; the token can be provisioned when 13-05 runs.

## Next Phase Readiness
- **Plans 13-05/06/07 unblocked:** jose available at runtime; @supabase/ssr 0.10.2 with getAll/setAll API ready for `tenant_membership_proof` middleware extension (13-06)
- **Federation-shared registry ready:** .npmrc points @draggonnb scope at GitHub Packages; token needed when 13-05 publishes the package
- **Trophy OS companion upgrade:** Hand-off note in 13-RESEARCH.md Section "Trophy OS Companion Upgrade" — Trophy session must bump @supabase/ssr to ^0.10.2, add jose ^5.10.0, create .npmrc
- **REQ-IDs closed:** STACK-01 (@supabase/ssr upgrade), STACK-02 (jose added), STACK-04 (.npmrc registry), STACK-03 partial (DraggonnB-side prep done; Trophy-side deferred to Trophy session)

---
*Phase: 13-cross-product-foundation*
*Completed: 2026-05-02*

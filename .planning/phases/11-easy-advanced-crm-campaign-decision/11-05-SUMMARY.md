---
phase: 11-easy-advanced-crm-campaign-decision
plan: 11-05
subsystem: ai-agents
tags: [campaign-studio, base-agent, haiku, brand-safety, enforcement, claude-api]

# Dependency graph
requires:
  - phase: 11-02
    provides: AgentType union with campaign_drafter + campaign_brand_safety registered

provides:
  - CampaignDrafterAgent: multi-channel draft (5 social + 1 email + 1 SMS) via BaseAgent
  - BrandSafetyAgent: Haiku-based structured safety review with 4 flag types
  - isUnderSafetyCheckBudget(): 20/day soft quota helper
  - isInNewTenantPeriod(): CAMP-08 first-30-days enforcement gate

affects:
  - 11-10 (campaign-studio-ui — invokes both agents via composer endpoint)
  - 11-11 (campaign-scheduler — reads isInNewTenantPeriod() as schedule guard)
  - 11-12 (tests-and-docs — documents agent pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CampaignAgent extends BaseAgent + only overrides parseResponse() — never run()"
    - "vi.mock('@/lib/config/env') hoisted pattern for unit-testing BaseAgent subclasses"
    - "Testable subclass pattern: expose protected parseResponse() as public parse() in test-only class"

key-files:
  created:
    - lib/campaigns/agent/campaign-drafter.ts
    - lib/campaigns/agent/brand-safety-checker.ts
    - lib/campaigns/enforcement.ts
    - __tests__/unit/campaigns/agent/campaign-drafter.test.ts
    - __tests__/unit/campaigns/agent/brand-safety-checker.test.ts
  modified: []

key-decisions:
  - "organizations.activated_at is ABSENT from live DB (verified via information_schema query). enforcement.ts uses created_at as fallback — equating org creation with activation is accurate for current 8 provisioned orgs."
  - "Test mock pattern: vi.mock('@/lib/config/env') required for any unit test that imports BaseAgent subclasses. Existing pattern in base-agent-instrumentation.test.ts only mocked payfast; both payfast AND env needed."
  - "BrandSafetyAgent uses Haiku at temperature=0 for deterministic safety rulings. CampaignDrafterAgent uses Sonnet default (larger creative output needs full context window)."

patterns-established:
  - "Testable BaseAgent subclass: create inner class in test file extending agent, expose protected parseResponse() as public — avoids full BaseAgent.run() mock complexity"
  - "All BaseAgent subclass unit tests must mock @/lib/config/env at module level to prevent eager env validation at import time"

# Metrics
duration: 35min
completed: 2026-04-27
---

# Phase 11 Plan 05: Campaign Agents Summary

**Two BaseAgent-extending AI agents for Campaign Studio: CampaignDrafterAgent (Sonnet, 7-post multi-channel draft with brand voice injection) and BrandSafetyAgent (Haiku temperature=0, structured 4-type safety flags), plus isInNewTenantPeriod() CAMP-08 30-day enforcement helper using created_at fallback**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-27T14:10:00Z
- **Completed:** 2026-04-27T14:30:00Z
- **Tasks:** 3/3
- **Files created:** 5

## Accomplishments

- CampaignDrafterAgent extends BaseAgent, generates 5 social + 1 email + 1 SMS from a campaign intent; brand voice arrives automatically via BaseAgent.run() without manual fetch
- BrandSafetyAgent uses Haiku at temperature=0; returns SafetyFlagResult with typed flags (off_brand, insensitive, time_inappropriate, forbidden_topic) and approve/revise/reject recommendation
- isInNewTenantPeriod() reads organizations.created_at (activated_at absent from live DB) and returns true for first 30 days or on unknown date — safe for all Plan 11-11 schedule route guards
- 13 tests across 2 test files covering all parse paths, fence stripping, malformed inputs, and flag types

## Task Commits

1. **Task 1: CampaignDrafterAgent + tests** — `28db1652` (feat)
2. **Task 2: BrandSafetyAgent + tests** — `5a0a7560` (feat)
3. **Task 3: isInNewTenantPeriod() enforcement helper** — `4141e631` (feat)

**Plan metadata:** (this file)

## Files Created

- `lib/campaigns/agent/campaign-drafter.ts` — CampaignDrafterAgent extending BaseAgent; agentType 'campaign_drafter'; Sonnet default; parseResponse strips fences + validates posts array
- `lib/campaigns/agent/brand-safety-checker.ts` — BrandSafetyAgent extending BaseAgent; agentType 'campaign_brand_safety'; Haiku model locked; temperature=0; isUnderSafetyCheckBudget() helper
- `lib/campaigns/enforcement.ts` — isInNewTenantPeriod() using created_at fallback; Phase 12 TODO for activated_at migration
- `__tests__/unit/campaigns/agent/campaign-drafter.test.ts` — 5 tests
- `__tests__/unit/campaigns/agent/brand-safety-checker.test.ts` — 8 tests

## Decisions Made

1. **activated_at absent from live DB** — Verified via `information_schema.columns` query on psqfgzbjbgqrmjskdavs. Column exists in 00_initial_schema.sql but was never applied to the live Supabase project. enforcement.ts uses `created_at` as proxy. Phase 12 TODO to add `activated_at` column via migration and switch.

2. **Test mock pattern for BaseAgent subclasses** — `vi.mock('@/lib/config/env')` must be hoisted before any import of a BaseAgent subclass, because `lib/agents/base-agent.ts` imports `@/lib/payments/payfast` which imports `@/lib/config/env` which validates env vars at module load. Mocking payfast alone is insufficient.

3. **BrandSafetyAgent stays on Haiku** — temperature=0, maxTokens=512. Safety checks are deterministic classify-and-flag tasks; Haiku is correct here. CampaignDrafterAgent uses Sonnet default (creative multi-channel draft needs larger context window and better instruction-following).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added vi.mock('@/lib/config/env') to both test files**

- **Found during:** Task 1 (campaign-drafter.test.ts first run)
- **Issue:** Test failed with "Environment validation failed: ANTHROPIC_API_KEY must start with sk-ant-" because the env module validates eagerly at import time. Setting `process.env` in test body is too late — the module singleton already ran.
- **Fix:** Added `vi.mock('@/lib/config/env')` returning a fake env object at top of both test files. Vitest hoists `vi.mock()` calls above imports so the mock runs before the module graph loads.
- **Files modified:** Both test files
- **Verification:** Both test suites pass (5 + 8 = 13 tests)
- **Committed in:** 28db1652, 5a0a7560 (task commits)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Essential for test correctness. No scope creep.

## Issues Encountered

None beyond the env mock fix above.

## User Setup Required

None — no new env vars or external service configuration needed.

## Must-Haves Verified

- [x] CampaignDrafterAgent.agentType = 'campaign_drafter' (grep confirmed, 1 line)
- [x] Brand voice NOT manually fetched — relies on BaseAgent.run() injection
- [x] BrandSafetyAgent.model = 'claude-haiku-4-5-20251001' (grep confirmed, 1 line)
- [x] temperature=0 in BrandSafetyAgent CONFIG
- [x] parseResponse strips markdown fences in both agents (tested)
- [x] isInNewTenantPeriod() returns true when date unknown (null-safe defensive)
- [x] organizations.activated_at absence documented; created_at fallback implemented
- [x] 13 tests passing (exceeds minimum 8 from plan)
- [x] tsc --noEmit: no new errors in campaign files
- [x] Neither agent overrides run() — only parseResponse()

## Next Phase Readiness

- Both agents ready for Plan 11-10 (campaign composer + safety-check API endpoints)
- isInNewTenantPeriod() ready for Plan 11-11 (schedule route guard)
- Phase 12 needs: migration to add organizations.activated_at, backfill, switch enforcement.ts to use it

---
*Phase: 11-easy-advanced-crm-campaign-decision*
*Completed: 2026-04-27*

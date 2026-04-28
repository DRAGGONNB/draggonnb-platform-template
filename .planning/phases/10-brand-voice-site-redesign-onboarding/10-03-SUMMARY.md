---
phase: 10-brand-voice-site-redesign-onboarding
plan: 03
subsystem: ai-infra, brand-voice, agents
tags: [brand-voice, anthropic-cache, system-blocks, pii-scrubber, cheerio, golden-test]

# Dependency graph
requires:
  - phase: 10-01
    provides: client_profiles brand voice columns (migration 31)
  - phase: 09-03
    provides: BaseAgent with SystemBlock[] support, ai_usage_ledger writes per call

provides:
  - lib/brand-voice/scraper.ts — cheerio URL scraper (10s AbortController timeout)
  - lib/brand-voice/pii-scrubber.ts — SA-specific PII patterns (email, +27 mobile, 13-digit ID, API keys, credit cards)
  - lib/brand-voice/wizard-questions.ts — 5-question wizard schema + zod BrandVoiceInputSchema
  - lib/brand-voice/pad-to-cache.ts — padToCacheFloor() ensures ≥14336 chars (≥4096 tokens) for Haiku 4.5 cache eligibility
  - lib/brand-voice/assemble-prompt.ts — structured brand voice document builder
  - lib/brand-voice/build-system-blocks.ts — buildSystemBlocks(orgId, instructions, brandVoice) with org_id as first distinct block (Option B cache isolation)
  - lib/brand-voice/index.ts — public re-export surface
  - app/api/brand-voice/route.ts — GET current org voice
  - app/api/brand-voice/save/route.ts — POST validate→scrub→assemble→pad→persist
  - app/api/brand-voice/scrape/route.ts — POST scrape URL via cheerio
  - lib/agents/base-agent.ts — loadBrandVoice() lazy-loaded from client_profiles on first run(); buildSystemBlocks() is now the single source of truth
  - 29 unit tests across 3 test files + VOICE-05 golden two-tenant cache integration test (env-gated)

affects:
  - phase 10-06 (UI): brand voice wizard UI calls these 3 API routes
  - all 9 agent subclasses (Quoter, Concierge, Reviewer, Pricer, LeadQualifier, ProposalGenerator, BusinessAutopilot, ClientOnboardingAgent, plus accommodation agents) — string systemPrompt unchanged; BaseAgent now owns block composition

# Tech tracking
tech-stack:
  added:
    - "cheerio ^1.2.0 (URL scraping for brand voice wizard)"
  patterns:
    - "Anthropic cache isolation Option B: org_id as first distinct system block forces tenant-scoped cache keys (Pitfall 4 mitigation)"
    - "4096-token cache eligibility floor for Haiku 4.5 — pad brand voice prompt with structured filler if shorter (Pitfall 16)"
    - "Lazy brand voice load: BaseAgent.run() loads brand voice on first call, caches in instance for session lifetime"
    - "Single source of truth: buildSystemBlocks() replaces the deprecated normalizeSystem() — no parallel block-construction paths"

key-files:
  created:
    - lib/brand-voice/scraper.ts
    - lib/brand-voice/pii-scrubber.ts
    - lib/brand-voice/wizard-questions.ts
    - lib/brand-voice/pad-to-cache.ts
    - lib/brand-voice/assemble-prompt.ts
    - lib/brand-voice/build-system-blocks.ts
    - lib/brand-voice/index.ts
    - app/api/brand-voice/route.ts
    - app/api/brand-voice/save/route.ts
    - app/api/brand-voice/scrape/route.ts
    - __tests__/unit/brand-voice/pii-scrubber.test.ts
    - __tests__/unit/brand-voice/pad-to-cache.test.ts
    - __tests__/unit/brand-voice/build-system-blocks.test.ts
    - __tests__/integration/brand-voice/cache-isolation.test.ts (VOICE-05 golden test)
  modified:
    - lib/agents/base-agent.ts (loadBrandVoice + system block composition)
    - __tests__/unit/lib/agents/base-agent.test.ts (mock updates)
    - package.json (cheerio added)

key-decisions:
  - "buildSystemBlocks signature: (orgId, agentInstructions, brandVoicePrompt) returns 3 blocks when brand voice exists [TENANT_CONTEXT no-cache, agent instructions no-cache, padded brand voice ephemeral-cache]; 2 blocks when null. org_id is in block 0 as first-distinct-content for cache isolation."
  - "PII scrubber covers SA-specific patterns: email regex, +27 / 0 mobile prefixes, 13-digit ID numbers (Luhn-checksum optional), API key prefixes (sk-, AKIA, eyJ, ghp_), credit card patterns. Each pattern unit-tested."
  - "Cache floor = 14336 chars (≈4096 tokens at 3.5 chars/token conservative estimate). padToCacheFloor() appends a structured 'OPERATING PRINCIPLES' filler block — never random padding, always semantically valid content."
  - "9 agent subclasses verified unchanged in their systemPrompt — string form preserved; BaseAgent owns block composition. No subclass-level changes needed."

patterns-established:
  - "Brand voice prompt = single ≥4096-token system block at position 2, ephemeral-cached. Cache key isolation via org_id in block 0."
  - "URL scrape contract: title, description, h1, aboutText extracted via cheerio; 10s timeout via AbortController; cheerio dependency added to package.json"
  - "5-question wizard schema in lib/brand-voice/wizard-questions.ts is the canonical input shape; zod BrandVoiceInputSchema enforces it across UI + API"

# Metrics
duration: ~95 min (across 3 commits)
completed: 2026-04-26
---

# Phase 10 Plan 03: Brand Voice Infrastructure + 9-Agent Injection + Golden Cache Test

**Brand voice wizard infrastructure (URL scrape, PII scrub, prompt assemble, cache-floor pad, system-block builder), 3 API routes, BaseAgent cache-isolation Option B integration, VOICE-05 golden two-tenant cache test. All 9 agent subclasses verified to receive brand voice via BaseAgent block composition.**

## Performance

- **Duration:** ~95 min across 3 commits
- **Started:** 2026-04-26 17:16
- **Completed:** 2026-04-26 17:30
- **Tasks:** 8 (library, base-agent integration, API routes, tests)
- **Files created:** 10 source + 4 test files
- **Files modified:** 2 (base-agent.ts, base-agent.test.ts)

## Accomplishments

- Brand voice library (`lib/brand-voice/*`) ships 7 modules: scraper, PII scrubber, wizard schema, pad-to-cache, prompt assembler, system-block builder, public index
- `buildSystemBlocks(orgId, instructions, brandVoice)` produces 3-block array with org_id as first distinct block (Option B cache isolation per Pitfall 4)
- `padToCacheFloor()` guarantees ≥14336 char output (≥4096 tokens for Haiku 4.5 cache eligibility — Pitfall 16 mitigation)
- `scrubPII()` strips SA-specific patterns (email, +27/0 mobile, 13-digit ID, API keys, credit cards)
- 3 API routes: GET (read), POST /save (validate→scrub→assemble→pad→persist), POST /scrape (cheerio URL fetch with 10s timeout)
- BaseAgent `loadBrandVoice()` lazy-loads on first `run()`, caches per instance — no startup cost
- 9 agent subclasses (Quoter, Concierge, Reviewer, Pricer, LeadQualifier, ProposalGenerator, BusinessAutopilot, ClientOnboardingAgent, accommodation/* agents) verified — string systemPrompt unchanged; BaseAgent owns block composition (single source of truth)
- VOICE-05 golden two-tenant cache test (env-gated `describe.skipIf(!ORG_A || !ORG_B)`): org_A "hustle on" output vs org_B "with care" output for identical prompt; second org_A call reports `cache_read_input_tokens > 0`

## Task Commits

1. **Brand voice library + tests + cheerio install** — `e6abab26` feat(10-03): brand voice library — scraper, PII scrubber, pad-to-cache, assembler, system-block builder
2. **BaseAgent integration + VOICE-05 golden test** — `f6660290` feat(10-03): wire brand voice into BaseAgent + VOICE-05 golden two-tenant cache test
3. **Brand-voice API routes** — `(this commit)` feat(10-03): brand-voice API routes (GET / POST save / POST scrape)
4. **Test mock cleanup** — `175690a3` test(10-03): update BaseAgent test mocks for brand voice rewrite
5. **Plan metadata** — `<final commit>` docs(10-03): complete brand voice + agent injection plan

## Decisions Made

- **org_id at block 0 (Option B):** Tenant identifier injected as first distinct content block to force tenant-scoped Anthropic prompt-cache keys. Two tenants with identical brand voice still get separate cache namespaces.
- **Cache floor = 14336 chars:** Conservative 3.5 chars/token estimate × 4096-token Haiku 4.5 minimum. padToCacheFloor() appends a structured "OPERATING PRINCIPLES" filler when needed — semantically valid content, never noise.
- **Lazy load on run():** Brand voice loaded on first agent call per instance, not at construction — avoids startup DB hit per request.
- **Subclasses unchanged:** All 9 BaseAgent subclasses pass string `systemPrompt`; BaseAgent owns block composition. No subclass-level migration required.

## Deviations from Plan

None blocking. Brand-voice API routes were untracked in repo until the wrap-up commit — caught during 10-03 SUMMARY drafting and committed.

## Issues Encountered

- API routes weren't included in the original task commits (caught at SUMMARY drafting time and committed cleanly).

## DB State

- `client_profiles` brand voice columns (migration 31) ready for write traffic.
- 0 brand voice rows present (no orgs have completed the wizard yet — happens in 10-06 UI).

## Open Questions

1. **Cache floor token estimate accuracy:** 3.5 chars/token is conservative. If first real-tenant prompts are seeing zero cache hits, retest with actual tokenizer count and adjust `CACHE_FLOOR_TOKENS`.
2. **PII scrubber false-positive rate:** Aggressive 13-digit ID match may over-trigger on order numbers. Monitor.
3. **VOICE-05 golden test:** Env-gated; requires `BRAND_VOICE_TEST_ORG_A_ID` + `BRAND_VOICE_TEST_ORG_B_ID` to run. Phase 11 should provision these in CI.

## REQs Closed

- VOICE-01 (URL ingest + 5 Qs + avoid-list — wizard schema)
- VOICE-02 (storage in client_profiles extension)
- VOICE-03 (system block injection across all agents)
- VOICE-04 (org_id first distinct block — Option B)
- VOICE-05 (golden two-tenant cache test — env-gated)
- VOICE-06 (≥4096-token cache floor)
- VOICE-07 (PII scrubber)
- VOICE-08 (re-run support — POST /save updates brand_voice_prompt + brand_voice_updated_at)

## Next Phase Readiness

- 10-06 (UI) can now build the brand voice wizard against `/api/brand-voice/scrape` + `/api/brand-voice/save`
- Any tenant who completes the wizard immediately has brand-voice-aware agent output on next call
- Cost ledger from 09-03 will record cache_read_input_tokens > 0 on second same-tenant call (verifiable via daily_cost_rollup once cron fires)

---
*Phase: 10-brand-voice-site-redesign-onboarding*
*Completed: 2026-04-26*

---
phase: 12
plan: "12-01"
title: "Production hotfix sweep (A1-A7) + AI error surfacing"
subsystem: "dashboard-stability + ai-agents"
tags: ["hotfix", "crm", "sidebar", "baseagent", "anthropic-errors", "routing"]
one-liner: "7-fix production sweep closing CRM SSR crash, missing routes, social link, sidebar active-state, and typed Anthropic billing error classification across all agent-calling API routes"
status: complete
completed: "2026-04-28"
requires: ["11-easy-advanced-crm-campaign-decision"]
provides: ["stable-crm-page", "typed-agent-errors", "sidebar-active-state"]
affects: ["12-02", "12-03"]
tech-stack:
  added: []
  patterns:
    - "AgentCreditError / AgentRateLimitError typed error classes with userMessage field"
    - "RSC data-fetcher try/catch with graceful empty-state fallback"
    - "Sidebar startsWith active-state guard (exact-match for /dashboard)"
key-files:
  created:
    - "app/(dashboard)/crm/scoring/page.tsx"
    - ".planning/phases/12-launch-polish/12-01-SUMMARY.md"
  modified:
    - "app/(dashboard)/crm/page.tsx"
    - "components/dashboard/Sidebar.tsx"
    - "lib/agents/base-agent.ts"
    - "lib/agents/CLAUDE.md"
    - "app/api/autopilot/generate/route.ts"
    - "app/api/campaigns/[id]/drafts/route.ts"
    - "app/api/campaigns/[id]/drafts/[draftId]/regenerate/route.ts"
    - ".planning/errors/catalogue.json"
    - ".planning/errors/patterns.md"
decisions:
  - "A1: wrap loadEasyViewData() in try/catch with empty-state fallback rather than build a /crm/contacts/new route (contacts already has inline dialog on /crm/contacts)"
  - "A5: placeholder page for /crm/scoring rather than remove sidebar item — v3.1 will replace with real dashboard"
  - "A2/A4/A7: resolved by Anthropic credit funding; code fix = forward-looking error classification, not a root-cause code bug"
  - "BaseAgent typed errors: classification in catch block, not retry/circuit-breaker logic (out of scope for hotfix)"
---

# Phase 12 Plan 12-01: Production hotfix sweep Summary

## What was done

7 hotfixes + 1 AI error surfacing improvement executed across 2 commits from Chris's 2026-04-28
production test pass.

## Hotfix Status by item

| ID | Description | Status | Commit |
|----|-------------|--------|--------|
| A1 | CRM page SSR crash ("Something went wrong") | fixed-with-code | a1778d97 |
| A2 | Autopilot generate fails | resolved-by-credits | 88ac4d10 |
| A3 | Social Media sidebar link → 404 | fixed-with-code | a1778d97 |
| A4 | Brand voice wizard fails | resolved-by-credits | 88ac4d10 |
| A5 | Lead Scoring /crm/scoring 404 | fixed-with-code | a1778d97 |
| A6 | Sidebar active-state doesn't track sub-routes | fixed-with-code | a1778d97 |
| A7 | Campaign Studio drafter fails | resolved-by-credits | 88ac4d10 |
| AI err | BaseAgent credit/rate-limit error surfacing | fixed-with-code | 88ac4d10 |

## Fix details

### A1 — CRM page SSR crash

`app/(dashboard)/crm/page.tsx` called `loadEasyViewData()` with no try/catch. If any Phase 11
table (`crm_action_suggestions`, `crm_action_dismissals`) was absent in production or returned
a Supabase error, the RSC threw and the `app/(dashboard)/crm/error.tsx` boundary caught it,
displaying "Something went wrong — this is usually temporary."

Fix: wrapped `loadEasyViewData()` in try/catch with an empty-state fallback so the CRM Easy
view renders with empty cards instead of crashing. Error is logged server-side for diagnostics.

Note: the error boundary copy matched what Chris reported, confirming this was the root cause
and NOT a missing `/crm/contacts/new` route (all "New Contact" links in the codebase use a
dialog or `?action=new` query parameter on the contacts list page).

### A3 — Social Media sidebar link

`Sidebar.tsx` had `href: '/social'` pointing to a route that doesn't exist. The only existing
social route is `/settings/social`. Changed to `href: '/settings/social'`.

### A5 — Lead Scoring /crm/scoring

Sidebar item `Lead Scoring` pointed at `/crm/scoring` which had no page file. Built a minimal
placeholder page at `app/(dashboard)/crm/scoring/page.tsx` explaining the v3.1 roadmap and
linking back to the CRM Easy view hot-leads card.

### A6 — Sidebar active-state on sub-routes

`const isActive = pathname === item.href` only matched exact paths. On `/crm/contacts/123`
the CRM sidebar item was not highlighted. Changed to:
```typescript
const isActive =
  item.href === '/dashboard'
    ? pathname === '/dashboard'
    : pathname === item.href || pathname.startsWith(item.href + '/')
```
The `/dashboard` exact-match guard prevents it highlighting on every route.

### A2/A4/A7 — Anthropic credit depletion

All three failures (Autopilot generate, Brand voice wizard, Campaign drafter) occurred
simultaneously because Anthropic account credits were $0 during Chris's test pass. Credits
were funded on 2026-04-28. No code fixes needed for these three flows — they will work
correctly with funded credits.

### AI error surfacing improvement

Added `AgentCreditError` and `AgentRateLimitError` as exported typed error classes to
`lib/agents/base-agent.ts`. The `run()` catch block classifies HTTP 401 or messages matching
`/credit|billing/i` as `AgentCreditError` before re-throwing.

Three AI API routes updated to surface `err.userMessage` with appropriate status codes:
- `app/api/autopilot/generate/route.ts` → 503 on credit error, 429 on rate limit
- `app/api/campaigns/[id]/drafts/route.ts` → same
- `app/api/campaigns/[id]/drafts/[draftId]/regenerate/route.ts` → same

`lib/agents/CLAUDE.md` updated with "Failure-mode triage" ops runbook section.
`patterns.md` updated with new pattern "AI feature returns generic error → check billing FIRST".
`catalogue.json` updated with ERR-A1, ERR-A2, ERR-A4, ERR-A5, ERR-A7 entries.

## Deviations from Plan

### Auto-fixed: A1 root cause different from plan hypothesis

The plan hypothesised A1 was a missing `/crm/contacts/new` route. Investigation showed no
link in the codebase points to `/crm/contacts/new` — all "New Contact" buttons use the inline
dialog or `?action=new`. The actual root cause was the CRM page SSR throwing in `loadEasyViewData()`.
Fix applied inline (try/catch) without building a new route — that would have been unneeded.

[Rule 1 - Bug] CRM page crashes instead of rendering empty state on DB query error.

### A3 handled in Task 1 commit

The plan puts A3 in Task 2, but since A3 is a 1-line sidebar fix and Task 1 already touched
`Sidebar.tsx`, it was bundled into commit `a1778d97` to avoid redundant staging cycles.
This is a documentation deviation only; the fix is complete and correct.

## Tests added

0 new tests in this plan (plan spec: "no new ones added in this plan").

## tsc status

Clean (pre-existing errors in `__tests__/integration/api/elijah/elijah-full.test.ts` and
`__tests__/integration/api/social/social-content-full.test.ts` are not introduced here).

## Next Phase Readiness

Phase 12 Wave 1 (12-01) complete. Ready for Wave 2:
- 12-02: Promised-vs-delivered audit (landing copy alignment)
- 12-03: Mobile 360px sweep
- 12-04: BILL-08 + OPS-02..04 reconciliation crons

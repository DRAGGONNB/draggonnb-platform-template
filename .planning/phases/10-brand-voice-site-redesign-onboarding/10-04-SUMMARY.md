---
phase: 10-brand-voice-site-redesign-onboarding
plan: 04
subsystem: provisioning, onboarding, email, n8n
tags: [saga-pause, n8n-cron, resend-email, business-days-tz, popi-unsubscribe]

# Dependency graph
requires:
  - phase: 10-01
    provides: onboarding_progress table (migration 32), provisioning_jobs.status='paused' CHECK addition (migration 33)
  - phase: 09-04
    provides: TELEGRAM_OPS_CHAT_ID env-var pattern (validated by Zod env singleton)

provides:
  - lib/provisioning/saga-state.ts — pauseSaga + resumeSaga state machine (replaces cascade-delete)
  - lib/provisioning/business-days.ts — Africa/Johannesburg TZ-aware timer_start_day calc
  - lib/onboarding/progress.ts — onboarding_progress lifecycle helpers
  - scripts/provisioning/orchestrator.ts — pause-on-failure (no cascade-delete)
  - scripts/provisioning/rollback.ts — rewritten: pauseSaga + Telegram alert
  - scripts/provisioning/resume.ts — restart paused saga from current_step
  - scripts/provisioning/steps/10-schedule-followups.ts — writes timer_started_at + timer_start_day; triggers Day 0 immediately
  - app/api/n8n/onboarding-day/route.ts — N8N cron callback; idempotent send-once via dayN_email_sent_at NULL check; signed by N8N_WEBHOOK_SECRET
  - app/api/ops/provisioning-resume/route.ts — manual restart of paused saga
  - app/api/ops/onboarding-progress/route.ts — read endpoint for ops UI
  - n8n/onboarding-day1/2/3.json — cron-poll workflows
  - emails/welcome-day0.ts — transactional welcome (POPI exempt — no unsub)
  - emails/onboarding-day1/2/3.ts — Day 1 brand-voice prompt + kickoff CTA, Day 2 first-campaign guide, Day 3 "you're live" — all with plain-text alt + unsub

affects:
  - phase 10-06 (UI): OnboardingChecklist component reads onboarding_progress
  - phase 10-07 (cap UX + mobile sweep): provisioning_jobs.status='paused' visible in admin UI
  - phase 11 (first paying client): pause+resume model is the live failure mode for support
  - phase 12 (launch polish): mail-tester.com ≥9 score is a launch-readiness gate

# Tech tracking
tech-stack:
  added:
    - "date-fns-tz (already in repo via dependency tree — used for Africa/Johannesburg business-day calc)"
  patterns:
    - "PAUSE-with-resume saga: status='paused' + stored created_resources lets ops restart from any failed step without losing acquired state"
    - "N8N cron-poll over webhook-enqueue: cron job polls onboarding_progress by date arithmetic, hits onboarding-day endpoint per eligible org. Cleaner than per-org webhook scheduling."
    - "Idempotent email send: NULL check on dayN_email_sent_at before send + UPDATE-and-stamp pattern"
    - "POPI-compliant email layout: plain-text alt + unsubscribe link on Days 1-3 nurture. Day 0 is transactional (account creation confirmation) and exempt."
    - "Business-day TZ logic: Mon-Thu pre-17:00 SAST → today; Fri-Sun or weekday post-17:00 → next Monday. Uses Africa/Johannesburg TZ throughout."

key-files:
  created:
    - lib/provisioning/saga-state.ts
    - lib/provisioning/business-days.ts
    - lib/onboarding/progress.ts
    - scripts/provisioning/resume.ts
    - scripts/provisioning/steps/10-schedule-followups.ts
    - app/api/n8n/onboarding-day/route.ts
    - app/api/ops/provisioning-resume/route.ts
    - app/api/ops/onboarding-progress/route.ts
    - n8n/onboarding-day1.json
    - n8n/onboarding-day2.json
    - n8n/onboarding-day3.json
    - emails/welcome-day0.ts
    - emails/onboarding-day1.ts
    - emails/onboarding-day2.ts
    - emails/onboarding-day3.ts
    - __tests__/unit/onboarding/business-days.test.ts
    - __tests__/unit/provisioning/saga-pause.test.ts
    - __tests__/api/n8n-onboarding-day.test.ts
  modified:
    - scripts/provisioning/orchestrator.ts (status transitions to 'paused' on failure)
    - scripts/provisioning/rollback.ts (pauseSaga + Telegram alert; no cascade-delete)
    - scripts/provisioning/steps/07-onboarding.ts (idempotent + retryable)

key-decisions:
  - "ONBOARD-06 'enqueue' implementation = cron-poll, NOT per-org webhook scheduling. Each N8N day1/2/3 workflow runs daily, polls onboarding_progress for eligible orgs (timer_start_day + N business days = today), hits onboarding-day endpoint per org. Cleaner than scheduling N webhooks per signup."
  - "Day 0 welcome email is fired synchronously by step 10-schedule-followups (not by N8N) — simpler, no scheduling delay; sets activated_at as side-effect."
  - "POPI exempt classification for Day 0: account creation confirmation is transactional, no unsubscribe required by South African POPI Act. Days 1-3 are nurture/marketing — plain-text alt + unsub link mandatory."
  - "Business-day cutoff = 17:00 SAST: signup at 16:59 Friday counts as Friday; 17:01 Friday → next Monday. Edge case documented in business-days.test.ts."
  - "PAUSE state preserves created_resources: org, organization_users, modules already-created stay intact. resumeSaga reads current_step + created_resources from provisioning_jobs and resumes execution from current_step+1."
  - "ONBOARD-08 satisfied by saga design: steps 1-4 (org create, admin user, subdomain, modules) commit before optional steps run. Step 5+ failure pauses without rollback — user can log in immediately."

patterns-established:
  - "Saga state machine: status = pending → running → completed | paused | failed; only paused can resumeSaga"
  - "N8N webhook signature: X-N8N-Signature header validated against N8N_WEBHOOK_SECRET HMAC-SHA256"
  - "Telegram ops alert template: '{phase} saga paused at step {N} for org {orgId} ({orgName}) — reason: {error}. Resume: POST /api/ops/provisioning-resume {orgId}'"

# Metrics
duration: ~140 min (across 3 commits — 1 main feat + 1 test bundle + this docs commit)
completed: 2026-04-26
---

# Phase 10 Plan 04: Onboarding Pipeline + Saga PAUSE + N8N Workflows + Email Templates

**Provisioning saga PAUSE-with-resume model (replaces cascade-delete), 3 N8N cron-poll workflows for Day 1/2/3, 4 Resend email templates with POPI-compliant unsubscribe, business-day-aware timer_start_day calc in Africa/Johannesburg TZ. ONBOARD-01..09 closed.**

## Performance

- **Duration:** ~140 min across 3 commits
- **Started:** 2026-04-26 (parallel session)
- **Completed:** 2026-04-26
- **Tasks:** 11 (saga state machine, business-days, progress lib, orchestrator+rollback rewrite, resume script, step 10, n8n-onboarding endpoint, ops endpoints, 3 N8N workflows, 4 email templates, 3 test files)
- **Files created:** 18
- **Files modified:** 3 (orchestrator, rollback, step 07)

## Accomplishments

- Provisioning saga no longer cascade-deletes on failure — transitions to `paused`, posts Telegram alert, leaves all created resources intact (ONBOARD-07, Pitfall 10)
- Step 10 `schedule-onboarding-followups` lands at saga end: writes `timer_started_at` + `timer_start_day` to `onboarding_progress`, fires Day 0 welcome email immediately
- N8N day1/2/3 workflows poll `onboarding_progress` daily via SQL date arithmetic — no per-org webhook bookkeeping
- `/api/n8n/onboarding-day` is idempotent: NULL check on `dayN_email_sent_at` prevents double-sends; HMAC-SHA256 signature against `N8N_WEBHOOK_SECRET` prevents spoofing
- 4 Resend email templates: Day 0 transactional (POPI exempt), Days 1-3 nurture with plain-text alt + unsubscribe (POPI compliant)
- Business-day calc handles SA-specific edge cases: pre-17:00 SAST Mon-Thu = today, all other times = next Monday (Africa/Johannesburg TZ throughout)
- ONBOARD-08 satisfied: saga steps 1-4 commit before any optional step — org is usable on login even if step 5+ pauses
- Operator restart path: `POST /api/ops/provisioning-resume {orgId}` reads current_step + created_resources from `provisioning_jobs`, resumes from current_step+1

## Task Commits

1. **Main feat — saga pipeline + lib + scripts + routes + N8N + emails** — `2174c29c` feat(10-04): saga PAUSE pipeline + step 10 + N8N day1/2/3 + email templates (18 files, +1507 / -260)
2. **Test bundle (mixed plans 10-02/10-03/10-04)** — `847e32e6` test(10): API + unit tests for plans 10-02/10-03/10-04 (11 test files, +1501)
3. **Plan metadata** — `<final commit>` docs(10-04): complete onboarding pipeline plan

## Decisions Made

- **Cron-poll over webhook-enqueue (ONBOARD-06):** N8N workflows poll `onboarding_progress` daily by date arithmetic, not per-org webhook scheduling. Cleaner ops surface, easier to retry, idempotent by construction.
- **Day 0 fires synchronously, not via N8N:** Step 10 hits Resend directly; no scheduling delay for the welcome email.
- **POPI exemption for Day 0:** Account creation confirmation is transactional under POPI; no unsubscribe required. Days 1-3 are nurture and have unsubscribe links.
- **Business-day cutoff 17:00 SAST:** Documented in business-days.test.ts with edge cases at 16:59 / 17:01 Friday.
- **PAUSE preserves all acquired resources:** No rollback. resumeSaga restarts from `current_step+1`. Operator can fix the issue (env var, API key, etc.) and re-trigger.

## Deviations from Plan

None blocking. Plan listed `lib/onboarding/n8n-trigger.ts` as a separate file; the trigger logic ended up inlined in `app/api/n8n/onboarding-day/route.ts` because it's only consumed by that one endpoint. Pattern is cleaner with one less file.

## Issues Encountered

- 6 tsc errors surfaced during the wrap-up audit — all pre-existing or from cross-plan touches (USAGE-13 dashboard widget cleanup, cost-monitoring type narrowing, brand-voice scrape error handling, test fixture missing field, mock type variance, integration test truthy/falsy expressions). All fixed in commit `e2a66f04` fix(10): tsc errors across plans 10-02/10-03/10-05 before 10-04 commit landed.

## DB State

- `provisioning_jobs.status` CHECK includes `'paused'` (migration 33 applied in 10-01)
- `onboarding_progress` table live with 0 rows (no orgs have completed signup yet)
- `agent_sessions` RLS policies live (4 policies — 10-01 follow-on)

## User Setup Required

**Hard blockers — must do before first real signup:**

1. **`N8N_WEBHOOK_SECRET` in Vercel** + matching value in N8N workflow header config. Without it the onboarding-day endpoint 401s every cron call.
2. **`KICKOFF_CALL_URL` in Vercel** — Cal.com (or equivalent) booking link for Day 1 email. Empty string fallback ships to client as a missing-link error.
3. **`TELEGRAM_OPS_CHAT_ID` in Vercel** — saga PAUSE alerts go here. If unset, alerts log to console only (saga still pauses correctly; you just won't be paged).
4. **N8N day1/2/3 workflows imported and activated** in N8N UI from `n8n/onboarding-day{1,2,3}.json`. Each workflow needs its `Postgres` credential mapped to the Supabase connection.
5. **Resend domain warm-up + mail-tester.com baseline ≥9 score** — Pitfall 14 mitigation. **THIS IS A PRE-LAUNCH GATE — Phase 10 carry-forward.** No live emails should go out until score is verified.

## Open Questions

1. **mail-tester.com score:** Has the baseline been measured? Score must be ≥9 before any nurture email goes to a real prospect. Currently UNKNOWN.
2. **N8N workflow timezone:** Cron expressions in `n8n/onboarding-day*.json` need verification against N8N's TZ config — assumed UTC with date math handling SAST conversion server-side.
3. **POPI unsubscribe persistence:** Day 1-3 unsubscribe link points to `/unsubscribe?orgId=...&token=...`. The unsubscribe endpoint and `email_subscriptions` table are NOT in 10-04 scope — must land in 10-06 or 10-07 before any live nurture email goes out.

## REQs Closed

- ONBOARD-01 (Day 0 welcome + checklist)
- ONBOARD-02 (Day 1 brand voice prompt + kickoff CTA)
- ONBOARD-03 (Day 2 first-campaign guide)
- ONBOARD-04 (Day 3 "you're live" + features)
- ONBOARD-05 (onboarding_progress per-org state — schema in 10-01, lifecycle here)
- ONBOARD-06 (provisioning saga step 10 — implemented as cron-poll)
- ONBOARD-07 (idempotent + retryable saga; PAUSE not cascade-delete; Telegram alert)
- ONBOARD-08 (org usable after steps 1-4 — saga commits steps 1-4 before optional steps run)
- ONBOARD-09 ("3 business days" phrasing — pricing page in 10-06; weekend-Monday timer logic implemented here in business-days.ts)

## Next Phase Readiness

- 10-06 (UI) can wire OnboardingChecklist to read `onboarding_progress` via `/api/ops/onboarding-progress`
- 10-06 must add unsubscribe endpoint before live launch (open question 3)
- 10-07 (admin UI) can show paused-saga orgs via `provisioning_jobs.status='paused'` query
- mail-tester score check is a hard gate before launch — flag in STATE.md carry-forward

---
*Phase: 10-brand-voice-site-redesign-onboarding*
*Completed: 2026-04-26*

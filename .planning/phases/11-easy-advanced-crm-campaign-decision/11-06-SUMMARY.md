---
phase: 11-easy-advanced-crm-campaign-decision
plan: 11-06
subsystem: infra
tags: [n8n, workflow, cron, supabase, crm, engagement-score, provisioning]

requires:
  - phase: 11-01
    provides: crm_action_suggestions table with score/score_breakdown/refreshed_at columns

provides:
  - wf-crm-engagement-score.json: nightly 02:00 SAST cron scoring contacts + deals, UPSERTs crm_action_suggestions
  - wf-crm-nightly-cleanup.json: nightly 03:00 SAST cron DELETE expired entity_drafts + crm_action_dismissals
  - provisioning seed: new orgs get stale_thresholds_days defaults on CRM module activation

affects:
  - 11-07 (Easy view page fetcher reads crm_action_suggestions populated by this workflow)
  - provisioning (any future provisioning changes should not remove config seeding)

tech-stack:
  added: []
  patterns:
    - "N8N global iterate-orgs pattern: fetch all CRM tenant_modules → split → per-org HTTP nodes (no per-tenant workflow)"
    - "Telegram error branch: all N8N workflows alert $env.TELEGRAM_OPS_CHAT_ID on failure"
    - "JSONB forward-compat: score_breakdown keys added by N8N without migration; v3.1 adds email_tracking keys"

key-files:
  created:
    - n8n/wf-crm-engagement-score.json
    - n8n/wf-crm-nightly-cleanup.json
    - .planning/phases/11-easy-advanced-crm-campaign-decision/11-06-SUMMARY.md
  modified:
    - scripts/provisioning/steps/01-create-org.ts
    - lib/provisioning/CLAUDE.md

key-decisions:
  - "Provisioning seed lives in 01-create-org.ts (not a 04-seed-data.ts which doesn't exist) — CRM module is activated there"
  - "Global iterate-orgs pattern for N8N: workflows loop tenant_modules rather than per-tenant workflow instances"
  - "active:false on both workflow JSONs — operator manually activates after import (matches existing pattern)"
  - "Minimum engagement score threshold = 3pts (per RESEARCH A) to filter noise"
  - "Cleanup Telegram alert only fires if total > 100 deleted rows (not on routine low-volume runs)"

patterns-established:
  - "N8N workflow JSONs: active:false by default, timezone Africa/Johannesburg, credential id draggonnb-supabase"
  - "Prefer: resolution=merge-duplicates for UPSERT to crm_action_suggestions (idempotent nightly runs)"

duration: 35min
completed: 2026-04-27
---

# Phase 11 Plan 06: N8N Nightly Workflows Summary

**Two global cron workflows shipping engagement scoring + TTL cleanup to crm_action_suggestions/entity_drafts, plus provisioning seed for stale_thresholds_days defaults on new CRM orgs**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-27T (session start)
- **Completed:** 2026-04-27
- **Tasks:** 3/3
- **Files modified:** 4

## Accomplishments

- Shipped `wf-crm-engagement-score.json`: nightly 02:00 SAST, fetches all CRM orgs from `tenant_modules`, for each org scores contacts (manual_followup_flag=+15, recent_contact<7d=+5) and deals (value>5000=+8, recent_contact<7d=+5), UPSERTs to `crm_action_suggestions` with `Prefer: resolution=merge-duplicates` for idempotency. Error branch sends Telegram alert.
- Shipped `wf-crm-nightly-cleanup.json`: nightly 03:00 SAST (1hr after engagement-score), DELETEs expired `entity_drafts` and `crm_action_dismissals` using `expires_at < NOW()`, captures row counts, optional Telegram summary only if total > 100 deleted rows.
- Patched `01-create-org.ts` to write `config.crm.stale_thresholds_days = {lead:7, qualified:14, proposal:10, negotiation:21}` when activating CRM for a new org. Merges with any caller-supplied config (defensive — no key blow-away).
- Updated `lib/provisioning/CLAUDE.md` with CRM stale-thresholds seed note.

## Task Commits

1. **Tasks 1+2: N8N engagement-score + nightly cleanup workflows** - `52b79b26` (feat)
2. **Task 3: Provisioning seed + docs** - `04e31706` (feat)

## Files Created/Modified

- `n8n/wf-crm-engagement-score.json` — Nightly engagement scoring workflow (02:00 SAST)
- `n8n/wf-crm-nightly-cleanup.json` — Nightly TTL cleanup workflow (03:00 SAST)
- `scripts/provisioning/steps/01-create-org.ts` — CRM module config seed on new org creation
- `lib/provisioning/CLAUDE.md` — Added CRM stale-thresholds seed subsection

## Decisions Made

- **Provisioning file:** Plan referenced `04-seed-data.ts` but that file does not exist. `04-vercel.ts` is step 4. CRM module activation happens in `01-create-org.ts` — seeding placed there where `tenant_modules.insert()` lives. [Rule 3 - Blocking fix, tracked as deviation below]
- **Global iterate-orgs pattern:** Workflows loop all `tenant_modules` rows with `module_id=crm` rather than registering per-tenant. This matches the analytics + billing-monitor patterns and is simpler to maintain.
- **active: false:** Both workflows committed as inactive. Operator activates after manual N8N import (matches existing 19 workflow pattern, consistent with MEMORY.md session-handoff note).
- **v3.0 scoring:** Email open/click/reply scoring deferred. Only `manual_followup_flag` and `last_contacted_at` age used. JSONB `score_breakdown` forward-compatible for v3.1.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan referenced non-existent 04-seed-data.ts**
- **Found during:** Task 3 (Provisioning patch)
- **Issue:** Plan specified `scripts/provisioning/steps/04-seed-data.ts` but `04-vercel.ts` is step 4 and no seed-data step exists. The CRM module activation (where `tenant_modules.insert()` is called) is in `01-create-org.ts`.
- **Fix:** Placed stale_thresholds_days seed logic in `01-create-org.ts` where CRM module is activated. This is correct per the plan's intent (seed when CRM is enabled for a new org).
- **Files modified:** `scripts/provisioning/steps/01-create-org.ts`
- **Verification:** `grep -A 3 "stale_thresholds_days" scripts/provisioning/steps/01-create-org.ts` returns seed object. tsc clean. vitest exit 0.
- **Committed in:** 04e31706 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Blocking fix resolved the plan's incorrect file reference. Intent fully preserved — CRM stale thresholds seeded on new org creation.

## Issues Encountered

- N8N MCP not available for automated deploy — workflows committed as JSON files for manual import per existing project pattern. Documented in User Setup Required below.

## User Setup Required

**N8N workflows require manual import and activation:**

1. In N8N UI, go to Workflows > Import From File
2. Import `n8n/wf-crm-engagement-score.json` — verify Schedule trigger shows 02:00, timezone Africa/Johannesburg
3. Import `n8n/wf-crm-nightly-cleanup.json` — verify Schedule trigger shows 03:00
4. Confirm `draggonnb-supabase` credential is set (service role key + Supabase URL)
5. Confirm `$env.SUPABASE_URL`, `$env.TELEGRAM_BOT_TOKEN`, `$env.TELEGRAM_OPS_CHAT_ID` are set in N8N environment
6. Activate both workflows in N8N (toggle to Active)
7. Optional dry-run: manually execute engagement-score against test tenant → verify rows in `crm_action_suggestions` with `n8n_run_id` populated

## Next Phase Readiness

- `crm_action_suggestions` will be populated nightly after these workflows are imported and activated
- Plan 11-07 (Easy view page fetcher) can now build the data fetcher with confidence that scores exist at render time
- No blockers for Wave 2 continuation

---
*Phase: 11-easy-advanced-crm-campaign-decision*
*Completed: 2026-04-27*

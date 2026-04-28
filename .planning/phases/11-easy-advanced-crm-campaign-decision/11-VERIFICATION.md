---
phase: 11-easy-advanced-crm-campaign-decision
verified: 2026-04-27T16:40:00Z
status: human_needed
score: 4/4 must-haves verified structurally
human_verification:
  - test: "Navigate to /dashboard/crm as an admin user (newly provisioned). Confirm Easy view loads with 3 action cards (Today's follow-ups, Stale deals, Hot leads). Click an approve action on any card row. Confirm a 5-second undo toast appears. Let it expire. Confirm no page error."
    expected: "3 cards render; approve fires POST /api/crm/easy-view/approve; 5s undo toast appears at bottom-center; action commits silently after timeout."
    why_human: "5s undo toast position, mobile Safari toolbar clearance, and the full card render with real tenant data cannot be verified programmatically."
  - test: "Edit a contact in Easy view (contact detail form). Switch to /dashboard/crm/advanced (click 'Advanced view' floating button). Confirm the edit is visible. Make an edit in Advanced view. Switch back. Confirm no lost state."
    expected: "Draft overlay is applied; field edited in Easy view shows updated value in Advanced view; further edits survive round-trip. Banner 'This draft was edited from another tab' does NOT appear for single-tab navigation."
    why_human: "Full navigation flow, conflict banner trigger threshold (60s window), and visual draft indicator require a browser session."
  - test: "Create a new tenant account (admin role). Navigate to /dashboard/crm. Confirm the page does NOT redirect to /dashboard/crm/advanced (admin defaults to easy). Log in as a manager-role user. Confirm /dashboard/crm redirects to /dashboard/crm/advanced."
    expected: "NULL ui_mode resolved to 'easy' for admin, 'advanced' for manager, without writing to DB. Toggle click persists via POST /api/crm/ui-mode and survives a browser reload."
    why_human: "Role-default resolution and session persistence require a browser with real Supabase auth."
  - test: "Navigate to /dashboard/campaigns/new. Enter campaign intent 'promote Sunday brunch'. Confirm 7 drafts are generated (5 social + 1 email + 1 SMS). Review drafts. Approve all. Click Schedule. Confirm the PublishConfirmModal appears with channel icon + account name + preview for each draft. Confirm per-tenant kill switch (admin: /admin/clients/[id]/campaigns/kill-switch) renders with Activate/Deactivate button."
    expected: "Drafts generated via CampaignDrafterAgent; brand-safety badges visible on each draft; approval screen shows all 7 cards; PublishConfirmModal shows channel icon + account name + preview; kill switch page renders for platform_admin."
    why_human: "Real Anthropic API call for draft generation, Meta credentials gating (FB/IG greyed-out without META_APP_ID), and visual review of publish confirmation modal require a browser session."
  - test: "Set CAMPAIGN_EXECUTE_HMAC_SECRET in Vercel. Trigger a full campaign run end-to-end: create campaign → generate drafts → approve → schedule (POST /api/campaigns/[id]/schedule) → confirm pg_cron job created → wait for pg_net execute call → verify campaign_runs.status='completed'."
    expected: "pg_cron job created via schedule_campaign_run_job RPC; execute endpoint called with correct HMAC; campaign_runs.status progresses pending → executing → completed; campaign_run_items.status='sent' for email/SMS."
    why_human: "HMAC secret not yet set in Vercel; pg_net → pg_cron → execute endpoint chain requires live Supabase + Vercel environment. Marked known deferral in Plan 11-11."
---

# Phase 11 Verification

**Verified:** 2026-04-27
**Verdict:** human_needed

## Success Criteria

### SC-1: CRM Easy view 3 cards + one-click approve
- **Status:** pass
- **Evidence:**
  - `app/(dashboard)/crm/page.tsx` — exists, imports `<ModuleHome>` and renders 3 cards: `followups` (today_followups), `stale_deals`, `hot_leads`. All sourced via `loadEasyViewData()`. (VERIFIED)
  - `lib/crm/easy-view-data.ts` — server-side data fetcher exists (substantive file). (VERIFIED)
  - `app/api/crm/easy-view/approve/route.ts` — 341 lines, all 4 ApproveAction variants implemented: `send_email`, `snooze_1d`, `decide` (engage/archive/snooze), `engage_hot_lead`. Each writes to `crm_activities` with `source='easy_view'`. (VERIFIED)
  - `app/api/crm/easy-view/dismiss/route.ts` — exists (writes `crm_action_dismissals`). (VERIFIED)
  - DB: `crm_activities` table has `source` column (text). `crm_action_suggestions` and `crm_action_dismissals` tables present in live DB. (VERIFIED via SQL)
  - Advanced view (`app/(dashboard)/crm/advanced/page.tsx`) reads `deals`, `contacts`, `companies` — the same entities mutated by the approve API (stage moves write to `deals` table; email sends update contact state). The contract "writes to the same server-side source of truth" is satisfied: approve mutations flow through the shared relational tables. (VERIFIED)
  - `__tests__/integration/crm/easy-view-action-cards.test.tsx` — 3 tests: 5s undo timer fires POST, undo cancels timer, dismiss delegates to parent. All 3 PASS. (VERIFIED)

### SC-2: View-desync test passes
- **Status:** pass
- **Evidence:**
  - `lib/crm/entity-drafts/use-entity-draft.ts` — exists, 89 lines, 1s debounce autosave to `entity_drafts`, multi-tab conflict detection via `sessionStorage`. (VERIFIED)
  - `lib/crm/entity-drafts/load-with-draft.ts` — exists, `loadEntityWithDraft()` parallel-fetches DB row + draft, overlays draft field-by-field, strips `_tab_id` from display payload, exposes it via `draftTabId` for conflict detection. (VERIFIED)
  - `lib/crm/entity-drafts/conflict-detection.ts` — exists. (VERIFIED)
  - `entity_drafts` table present in live DB. (VERIFIED via SQL)
  - `__tests__/integration/crm/view-desync.test.ts` — 2 tests: "edits in Easy view visible in Advanced after switch" + "switching back does not lose unsaved draft". **Both PASS.** (VERIFIED — test run output: 2 passed, 231ms)
  - Deal detail page (`app/(dashboard)/crm/deals/[id]/page.tsx`) calls `loadEntityWithDraft()` on every load — draft overlay applies on both Easy and Advanced views. (VERIFIED)

### SC-3: ui_mode role-default + persist
- **Status:** pass
- **Evidence:**
  - `user_profiles.ui_mode` column exists in live DB (data_type: text, NULLABLE — correct per OPS-05 and CONTEXT.md). (VERIFIED via SQL)
  - `lib/crm/ui-mode.ts` — `resolveUiMode(null, 'admin') → 'easy'`, `resolveUiMode(null, 'manager') → 'advanced'`, `resolveUiMode(null, 'user') → 'easy'`. NULL treated as role default. (VERIFIED)
  - `app/(dashboard)/crm/page.tsx` — reads `user_profiles.ui_mode`, calls `resolveUiMode()`, redirects managers to `/dashboard/crm/advanced` on mount. (VERIFIED)
  - `app/api/crm/ui-mode/route.ts` — POST endpoint upserts `user_profiles.ui_mode` for the authenticated user. Validates `mode: 'easy' | 'advanced'`. (VERIFIED)
  - `components/module-home/ToggleViewButton` + `AdvancedKanbanShell` — wired on all CRM advanced pages, calls `/api/crm/ui-mode` on click. (VERIFIED)
  - **Note per CONTEXT.md:** NULL `ui_mode` + `resolveUiMode()` returning role default is the locked behaviour. No DB write at signup. SC-3 intent ("new signups default to easy") is fulfilled by the role-default resolution, not by a DB insert.

### SC-4: Campaign Studio scaffold
- **Status:** pass
- **Evidence:**
  - **Pages:** `app/(dashboard)/campaigns/page.tsx`, `campaigns/new/page.tsx`, `campaigns/studio/[id]/page.tsx`, `campaigns/studio/[id]/approval/page.tsx`, `campaigns/runs/page.tsx`, `campaigns/runs/[runId]/page.tsx`. All exist. (VERIFIED)
  - **Kill switch admin UI:** `app/(dashboard)/admin/clients/[id]/campaigns/kill-switch/page.tsx` — 307 lines, substantive. (VERIFIED)
  - **CampaignDrafterAgent:** `lib/campaigns/agent/campaign-drafter.ts` — 121 lines, extends `BaseAgent`, system prompt generates 5 social + 1 email + 1 SMS. JSON parseResponse with markdown fence stripping. (VERIFIED)
  - **BrandSafetyAgent:** `lib/campaigns/agent/brand-safety-checker.ts` — exists, Haiku model, temperature=0, 20/day budget. (VERIFIED)
  - **Channel adapters:** `lib/campaigns/adapters/email.ts`, `sms.ts`, `facebook.ts`, `instagram.ts`, `linkedin.ts`, `index.ts`, `types.ts` — all present. FB/IG/LinkedIn credential-gated. (VERIFIED)
  - **Studio composer:** `app/(dashboard)/campaigns/studio/[id]/_components/StudioComposer.tsx` — 130 lines. (VERIFIED)
  - **Approval screen:** `app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalScreen.tsx` — 40 lines. `ApprovalList.tsx` + `PublishConfirmModal.tsx` present. (VERIFIED)
  - **PublishConfirmModal:** 140 lines — renders channel icon (`CHANNEL_ICONS` map), account name, body preview per draft. POST `/api/campaigns/[id]/approve` on Schedule. (VERIFIED)
  - **Brand-safety wired into approval:** `app/api/campaigns/[id]/approve/route.ts` — gates on `brand_safe === false` drafts; returns 422 if any flagged. (VERIFIED)
  - **Kill switch lib:** `lib/campaigns/kill-switch.ts` — `isKillSwitchActive()`, `getKillSwitchStatus()`, `setKillSwitch()` all implemented. Calls `cancel_org_campaign_runs` RPC when activating. (VERIFIED)
  - **HMAC execute endpoint:** `app/api/campaigns/execute/route.ts` — 218 lines, validates `x-internal-hmac` via `validateInternalHmac()`, idempotency guard, kill switch re-check, item loop with per-channel adapter dispatch, Telegram failure alert, scheduleVerifyJob. (VERIFIED)
  - **Scheduler:** `lib/campaigns/scheduler.ts` — calls `schedule_campaign_run_job` RPC, `scheduleVerifyJob`. (VERIFIED)
  - **DB RPCs:** `schedule_campaign_run_job` + `cancel_org_campaign_runs` both present in live DB. (VERIFIED via SQL)
  - **DB tables:** `campaigns`, `campaign_drafts`, `campaign_runs`, `campaign_run_items` all present in live DB. (VERIFIED via SQL)
  - **Per-tenant kill switch API:** `app/api/admin/campaigns/kill-switch/route.ts` present. (VERIFIED)
  - **Tests:** `__tests__/integration/campaigns/happy-path.test.ts` (5 tests PASS) + `__tests__/integration/campaigns/brand-safety-regression.test.ts` (7 tests PASS). (VERIFIED)

## Live DB Checks

| Check | Result |
|---|---|
| `crm_activities` table | PRESENT |
| `crm_action_suggestions` table | PRESENT |
| `crm_action_dismissals` table | PRESENT |
| `entity_drafts` table | PRESENT |
| `campaigns` table | PRESENT |
| `campaign_drafts` table | PRESENT |
| `campaign_runs` table | PRESENT |
| `campaign_run_items` table | PRESENT |
| `user_profiles.ui_mode` column | PRESENT (text, nullable) |
| `schedule_campaign_run_job` RPC | PRESENT |
| `cancel_org_campaign_runs` RPC | PRESENT |
| `record_usage_event` RPC (Phase 9) | PRESENT |
| `crm_activities.source` column | PRESENT (text) |
| `tenant_modules.config.crm.stale_thresholds_days` seeded rows | 8 rows |

## Test Results

All Phase 11 tests PASS:

| Test File | Tests | Result |
|---|---|---|
| `__tests__/integration/crm/view-desync.test.ts` | 2 | PASS |
| `__tests__/integration/crm/easy-view-action-cards.test.tsx` | 3 | PASS |
| `__tests__/integration/campaigns/brand-safety-regression.test.ts` | 7 | PASS |
| `__tests__/integration/campaigns/happy-path.test.ts` | 5 | PASS |
| `__tests__/unit/crm/entity-drafts.test.ts` | 11 | PASS |

**Total Phase 11 new tests:** 28 passing

## Human-Needed Runtime Checks (NOT Gaps)

1. **HMAC execute endpoint live test (Plan 11-11 known deferral):** Set `CAMPAIGN_EXECUTE_HMAC_SECRET` in Vercel. Run end-to-end: campaign → drafts → approve → schedule → execute → verify. Kill switch live test. Cannot verify without Vercel secret + live pg_cron + pg_net.

2. **BulkSMS sender ID registration (known deferral):** 1-5 business day pre-registration with SA carriers. Code path exists; only live SMS sends are blocked until registered.

3. **N8N workflows inactive (known deferral):** `wf-crm-engagement-score.json` and `wf-crm-nightly-cleanup.json` exist in repo. Manual import + activate via N8N UI required. Affects nightly `crm_action_suggestions` cache (hot_leads + followups cards read stale data until workflow activates — empty state shown instead).

4. **`organizations.activated_at` column missing (known deferral):** `isInNewTenantPeriod()` falls back to `created_at`. Phase 12 TODO. Not a Phase 11 gap.

5. **shadcn `Sheet` and `Alert` substitutes (known deferral):** Dialog + custom amber banner used instead. Functional equivalence confirmed. Not a gap.

6. **Visual approval screen + PublishConfirmModal (human eyeball required):** UI structure verified structurally (component files exist, props wired, POST fires on Schedule). Channel icon map, account name display, and preview truncation need human visual confirmation.

## Gaps

None. All 4 success criteria pass structural verification. 28 new tests confirm core contracts. Remaining items are known runtime deferrals, not gaps.

## Recommendation

**Promote to Phase 12 (Launch Polish).**

All 4 success criteria verified structurally. 28 new integration tests pass. All 8 required DB tables present. All 3 DB RPCs present. 8 tenant_modules rows seeded with stale_thresholds_days.

Chris's operator actions before Phase 12 exit:
1. Set `CAMPAIGN_EXECUTE_HMAC_SECRET` in Vercel + run end-to-end campaign execute test
2. Activate N8N workflows (wf-crm-engagement-score + wf-crm-nightly-cleanup) via N8N UI
3. Register BulkSMS sender ID (parallel track, 1-5 days)
4. Visual browser test of Easy view 3 cards + approve flow + Campaign Studio publish confirm modal

---

_Verified: 2026-04-27T16:40:00Z_
_Verifier: Claude Code (gsd-verifier)_

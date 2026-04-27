# 11-11 Summary: Campaign Scheduler + Kill Switch

**Plan:** 11-11-campaign-scheduler-killswitch
**Wave:** 4
**Status:** Complete (with runtime verification deferred — see "Verification needed by Chris" below)
**Completed:** 2026-04-27

## Tasks (3/3)

1. **Scheduler RPC + helpers + schedule API + 30-day enforcement** — commit `25b1c62f`
2. **Execute + verify + sms-dlr endpoints + Telegram alerts** — commit `bdf243e5`
3. **Kill switch admin API + UI + runs list/detail pages** — commit `ad4456e8`

Plan-metadata commit pending: `docs(11-11): complete Campaign scheduler + kill switch plan`.

## Commits (3 task + 1 docs)

| Commit | Scope |
|---|---|
| `25b1c62f` | migration 50 (applied) + scheduler.ts + kill-switch.ts + /api/campaigns/[id]/schedule |
| `bdf243e5` | telegram-alerts.ts + /api/campaigns/execute + /api/campaigns/verify + /api/campaigns/sms-dlr |
| `ad4456e8` | admin kill-switch API + UI + campaigns runs list + run detail + run RPC |

## Migration applied

- **50** `50_schedule_campaign_run_job_function.sql` — SECURITY DEFINER RPC wrapping `pg_cron` + `pg_net`. Applied to live Supabase project `psqfgzbjbgqrmjskdavs`. Verified via `pg_proc` query: function present with 5 args. `cancel_org_campaign_runs` (migration 49) confirmed alongside.

## Must-haves (8/8 verified structurally)

1. ✓ Migration 50 (`schedule_campaign_run_job`) live — confirmed via `pg_proc`
2. ✓ `scheduleCampaignRun()` calls RPC; HMAC signature generated for execute callback
3. ✓ Schedule API rejects when `isInNewTenantPeriod(orgId)` true (CAMP-08 full closure)
4. ✓ Schedule API rejects when kill switch active (`tenant_modules.config.campaigns.kill_switch_active`)
5. ✓ Execute endpoint validates HMAC before adapter dispatch
6. ✓ Verify endpoint populates `published_url` + `verified_at`; idempotent
7. ✓ Per-tenant kill switch — admin UI + POST API + cancellation via `cancel_org_campaign_runs` RPC
8. ✓ Telegram alerts wired for: campaign run failure, brand-safety flag, kill-switch activation

## REQ-IDs closed

- **CAMP-03** (full closure) — pg_cron + pg_net scheduling via RPC
- **CAMP-05** (full closure) — verify endpoint + published_url + run detail
- **CAMP-06** (full closure) — kill switch DB key + RPC + admin UI + Telegram
- **CAMP-08** (full closure) — schedule route guard via `isInNewTenantPeriod()`; complements 11-10's approval-flow `force_review` partial

## Files created/modified

```
supabase/migrations/50_schedule_campaign_run_job_function.sql           (NEW, applied)
lib/campaigns/scheduler.ts                                              (NEW, 102 LOC)
lib/campaigns/kill-switch.ts                                            (NEW, 133 LOC)
lib/campaigns/telegram-alerts.ts                                        (NEW, 126 LOC)
app/api/campaigns/[id]/schedule/route.ts                                (NEW, 172 LOC)
app/api/campaigns/execute/route.ts                                      (NEW, 217 LOC)
app/api/campaigns/verify/route.ts                                       (NEW, 130 LOC)
app/api/campaigns/sms-dlr/route.ts                                      (NEW, 69 LOC)
app/api/admin/campaigns/kill-switch/route.ts                            (NEW, 107 LOC)
app/api/campaigns/runs/[runId]/route.ts                                 (NEW, 71 LOC)
app/(dashboard)/admin/clients/[id]/campaigns/kill-switch/page.tsx       (NEW, 307 LOC)
app/(dashboard)/campaigns/runs/page.tsx                                 (NEW, 170 LOC)
app/(dashboard)/campaigns/runs/[runId]/page.tsx                         (NEW, 318 LOC)
```

Total: 13 files / ~1,956 LOC.

## Deviations

None at code level. Plan executed as written.

**Note on stream timeout:** The original executor agent (autonomous=false flagged) hit a stream idle timeout AFTER all 3 task commits had landed and migration 50 had been applied to live DB. Only the SUMMARY.md write + final docs commit were missed. This SUMMARY was reconstructed from `git show` of the 3 commits — the work itself is intact and verifiable via `git log --grep="feat(11-11)"`.

## Verification needed by Chris (autonomous: false rationale)

The HMAC-signed pg_net execute endpoint is **fully built and committable** but should be runtime-verified before promotion to production traffic. Specific runtime checks:

1. **Set `CAMPAIGN_EXECUTE_HMAC_SECRET` in Vercel** (Production env vars). Generate via `openssl rand -hex 32`. Without it the execute endpoint rejects all calls.
2. **End-to-end test on Supabase branch:**
   - Insert a test campaign + draft via Studio UI on a Supabase branch (NOT main)
   - Approve drafts (verify brand-safety check fires)
   - Schedule run with `scheduled_at = now() + 2 minutes`
   - Confirm pg_cron job created (`SELECT * FROM cron.job WHERE jobname LIKE 'campaign_run_%'`)
   - Wait 2 minutes → confirm pg_net.http_post fires → execute endpoint invoked → SMS sent (test number) / email sent (test addr) → run item status = 'sent' → verify endpoint populates `published_url`
   - Kill switch test: activate via admin UI → confirm scheduled run cancelled (`cron.unschedule` fires)
3. **BulkSMS sender ID pre-registration** — 1-5 business day blocker tracked separately; does NOT block code path; only blocks live SMS sends.

Once verified, no code change needed — the autonomous=false gate is purely operational.

## Pending todos for Phase 12 / v3.1

- `organizations.activated_at` column missing in live DB (flagged in 11-05 SUMMARY) — `enforcement.ts` falls back to `created_at` with TODO comment. Phase 12 should add the column + backfill.
- Real Meta credentials → social adapters light up automatically (mocked in v3.0 per Plan 11-04).
- BulkSMS sender ID approval (external dependency, 1-5 business days).
- Load-test the kill switch (deferred to v3.1 per CONTEXT.md).

---
phase: 11
plan_id: 11-11
title: pg_cron scheduler + execute/verify endpoints + kill-switch + 30-day enforcement + Telegram alerts
wave: 4
depends_on: [11-02, 11-04, 11-05, 11-10]
files_modified:
  - supabase/migrations/50_schedule_campaign_run_job_function.sql
  - lib/campaigns/scheduler.ts
  - lib/campaigns/kill-switch.ts
  - lib/campaigns/telegram-alerts.ts
  - app/api/campaigns/[id]/schedule/route.ts
  - app/api/campaigns/execute/route.ts
  - app/api/campaigns/verify/route.ts
  - app/api/campaigns/sms-dlr/route.ts
  - app/api/admin/campaigns/kill-switch/route.ts
  - app/(dashboard)/admin/clients/[id]/campaigns/kill-switch/page.tsx
  - app/(dashboard)/campaigns/runs/page.tsx
  - app/(dashboard)/campaigns/runs/[runId]/page.tsx
autonomous: false
estimated_loc: 720
estimated_dev_minutes: 180
---

## Objective

Wire campaign scheduling, execution, post-publish verification, and the per-tenant kill switch. After approval (Plan 11-10), `POST /api/campaigns/{id}/schedule` enforces CAMP-08 (30-day draft-then-review), creates a `campaign_runs` row, schedules a pg_cron job named `campaign_run_{id}` that calls `pg_net.http_post` to `/api/campaigns/execute` with HMAC auth (RESEARCH B section 5). The execute endpoint loops over `campaign_run_items`, invokes the right channel adapter (Plan 11-04), persists `provider_message_id`. The verify endpoint runs 5 minutes after send via a sibling pg_cron job, populates `published_url`. Kill switch: `tenant_modules.config.campaigns.kill_switch_active = true` flag (no new column) + admin RPC `cancel_org_campaign_runs` (Plan 11-02) + Telegram alerts. Includes the runs list/detail UI surfaces.

**Autonomous: false** — this plan exposes a HMAC-signed execute endpoint that pg_net hits. Chris should manually verify a test campaign full-cycle (approve → schedule → execute → verify → kill-switch) on a Supabase branch before promoting to main.

## must_haves

- `POST /api/campaigns/{id}/schedule` accepts `{ scheduledAt }`, blocks if 30-day period + `force_review = false`, creates `campaign_runs` row with `cron_job_name = 'campaign_run_{run_id}'`, calls `cron.schedule()` via SQL RPC.
- `POST /api/campaigns/execute` validates HMAC `x-internal-hmac` header, loads `campaign_run` + `campaign_run_items`, dispatches each item to the correct adapter (Plan 11-04), updates `status`, `provider_message_id`. Schedules a verify-job 5 min later. (CAMP-03)
- `POST /api/campaigns/verify` validates HMAC, iterates `campaign_run_items`, calls `adapter.verify()`, updates `published_url`, `verified_at`, `status='verified'`. (CAMP-05)
- `POST /api/campaigns/sms-dlr` (BulkSMS DLR webhook) updates `campaign_run_items.status` based on delivery receipt.
- `POST /api/admin/campaigns/kill-switch` (platform_admin only) sets `tenant_modules.config.campaigns.kill_switch_active = true`, calls `cancel_org_campaign_runs(orgId)` RPC, sends Telegram alert. Re-enable path = same endpoint with `active: false`. (CAMP-06)
- Admin UI `/admin/clients/[id]/campaigns/kill-switch` shows status + emergency stop button + confirmation dialog.
- Runs list `/dashboard/campaigns/runs` and run detail `/dashboard/campaigns/runs/{runId}` show `published_url`, errors, item statuses.
- Telegram alerts: campaign run failure (12a), brand-safety flag (12b — wired here as helper used by 11-10), kill-switch activation (12c). All to `TELEGRAM_OPS_CHAT_ID`.
- 30-day enforcement: schedule route blocks with 422 + clear error when `isInNewTenantPeriod === true && !campaign.force_review`. UI in 11-10 already shows the banner.
- HMAC secret stored in Supabase DB setting `app.internal_secret` and read by execute/verify route handlers.
- Migration 50 (`schedule_campaign_run_job` SECURITY DEFINER RPC) applies cleanly. `scheduleCampaignRun()` calls this RPC; it is REQUIRED for the schedule route to function.

## Tasks

<task id="1">
  <title>Build scheduler RPC helpers + schedule API + 30-day enforcement</title>
  <files>lib/campaigns/scheduler.ts, app/api/campaigns/[id]/schedule/route.ts</files>
  <actions>
    **`lib/campaigns/scheduler.ts`** — wraps the pg_cron + pg_net SQL pattern in TypeScript:
    ```typescript
    import { createAdminClient } from '@/lib/supabase/admin'
    import crypto from 'crypto'

    export async function scheduleCampaignRun(runId: string, scheduledAt: Date): Promise<void> {
      const supabase = createAdminClient()
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!
      const secret = process.env.INTERNAL_HMAC_SECRET!
      const hmac = crypto.createHmac('sha256', secret).update(runId).digest('hex')

      // pg_cron uses minute-level resolution (RESEARCH B Risk: up to 59s drift; acceptable for v3.0)
      const cronExpr = `${scheduledAt.getUTCMinutes()} ${scheduledAt.getUTCHours()} ${scheduledAt.getUTCDate()} ${scheduledAt.getUTCMonth() + 1} *`
      const jobName = `campaign_run_${runId}`

      // Direct SQL via Supabase rpc — wrap pg_cron + pg_net call
      const { error } = await supabase.rpc('schedule_campaign_run_job', {
        p_job_name: jobName,
        p_cron_expr: cronExpr,
        p_url: `${baseUrl}/api/campaigns/execute`,
        p_hmac: hmac,
        p_run_id: runId,
      })
      if (error) throw new Error(`scheduleCampaignRun failed: ${error.message}`)

      // Persist cron_job_name for future unschedule
      await supabase.from('campaign_runs').update({ cron_job_name: jobName }).eq('id', runId)
    }

    export async function scheduleVerifyJob(runId: string): Promise<void> {
      // Schedule a one-time verify job 5 minutes from now (RESEARCH B section 6).
      const fiveMinFromNow = new Date(Date.now() + 5 * 60_000)
      const cronExpr = `${fiveMinFromNow.getUTCMinutes()} ${fiveMinFromNow.getUTCHours()} ${fiveMinFromNow.getUTCDate()} ${fiveMinFromNow.getUTCMonth() + 1} *`
      const supabase = createAdminClient()
      const secret = process.env.INTERNAL_HMAC_SECRET!
      const hmac = crypto.createHmac('sha256', secret).update(runId).digest('hex')
      const jobName = `verify_run_${runId}`
      await supabase.rpc('schedule_campaign_run_job', {
        p_job_name: jobName,
        p_cron_expr: cronExpr,
        p_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/campaigns/verify`,
        p_hmac: hmac,
        p_run_id: runId,
      })
    }
    ```

    **Migration 50 — `schedule_campaign_run_job` SECURITY DEFINER RPC** (REQUIRED — `scheduleCampaignRun()` cannot work without it). Plan 11-02 owns migrations 42-49 (campaign tables, RLS, kill-switch RPC); migration 50 is owned by THIS plan because it wraps the pg_cron + pg_net call that schedules execution. Append-only per OPS-05.
    ```sql
    -- 50_schedule_campaign_run_job_function.sql
    -- Phase 11. Single-purpose migration per OPS-05. Wraps pg_cron + pg_net into one RPC call from app code.
    CREATE OR REPLACE FUNCTION schedule_campaign_run_job(
      p_job_name TEXT, p_cron_expr TEXT, p_url TEXT, p_hmac TEXT, p_run_id UUID
    ) RETURNS VOID
    LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      PERFORM cron.schedule(
        p_job_name,
        p_cron_expr,
        format(
          $sql$ SELECT net.http_post(
            url := %L,
            headers := jsonb_build_object('Content-Type','application/json','x-internal-hmac', %L),
            body := jsonb_build_object('run_id', %L)
          ) $sql$,
          p_url, p_hmac, p_run_id
        )
      );
    END;
    $$;
    REVOKE ALL ON FUNCTION schedule_campaign_run_job(TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC;
    GRANT EXECUTE ON FUNCTION schedule_campaign_run_job(TEXT, TEXT, TEXT, TEXT, UUID) TO service_role;
    ```

    **`/api/campaigns/[id]/schedule/route.ts`** (POST):
    - Auth via `getUserOrg()`.
    - Kill switch check.
    - Load campaign + count of approved drafts.
    - Validate `campaigns.status === 'pending_review'` (the approve route in 11-10 set this) AND every draft `is_approved=true`.
    - **30-day enforcement** (CAMP-08):
      ```typescript
      const inPeriod = await isInNewTenantPeriod(orgId)
      if (inPeriod && !campaign.force_review) {
        return Response.json({ error: 'In guided period — admin review required before scheduling. campaigns.force_review must be set to true by platform_admin.' }, { status: 422 })
      }
      ```
    - Create `campaign_runs` row with `status='pending'`, `scheduled_at`, items_total = approved drafts count.
    - For each approved draft, INSERT a `campaign_run_items` row with `recipient_ref` (resolves per channel: email = recipient list, sms = phone list, social = page id).
    - Call `scheduleCampaignRun(run.id, scheduledAt)`.
    - Update `campaigns.status = 'scheduled'`, `published_at = scheduledAt`.
    - Return 200 `{ runId, scheduledAt }`.
  </actions>
  <verification>
    `npm run typecheck` clean.
    Manual: schedule a campaign → `pg_cron.job` table shows `campaign_run_{id}` entry → `campaign_runs.cron_job_name` populated.
    Trigger 30-day path: create a fresh org → schedule → 422 with clear message. Set `campaigns.force_review = true` via admin UI → schedule succeeds.
  </verification>
</task>

<task id="2">
  <title>Build execute + verify + SMS DLR endpoints with HMAC auth + Telegram alerts</title>
  <files>lib/campaigns/telegram-alerts.ts, app/api/campaigns/execute/route.ts, app/api/campaigns/verify/route.ts, app/api/campaigns/sms-dlr/route.ts</files>
  <actions>
    **`lib/campaigns/telegram-alerts.ts`** per RESEARCH B section 12 — three alert helpers:
    ```typescript
    import { sendTelegramMessage } from '@/lib/accommodation/telegram/ops-bot'  // existing helper

    export async function sendCampaignFailureAlert(opts: { orgName: string; orgId: string; campaignName: string; runId: string; channel: string; errorMessage: string; failedCount: number; totalCount: number; }) {
      const text = `[Campaign Run Failed]\n\nOrg: ${opts.orgName} (${opts.orgId})\nCampaign: ${opts.campaignName}\nRun ID: ${opts.runId}\nChannel: ${opts.channel}\nError: ${opts.errorMessage}\n\n${opts.failedCount}/${opts.totalCount} items failed. Check /admin/clients/${opts.orgId}/campaigns/runs/${opts.runId}`
      await sendTelegramMessage({ chatId: process.env.TELEGRAM_OPS_CHAT_ID!, text })
    }

    export async function sendCampaignBrandSafetyAlert(opts: { orgName: string; campaignName: string; channel: string; flagType: string; reason: string; excerpt: string; }) {
      const text = `[Brand Safety Flag]\n\nOrg: ${opts.orgName}\nCampaign: ${opts.campaignName}\nChannel: ${opts.channel}\nFlag type: ${opts.flagType}\nReason: ${opts.reason}\nExcerpt: "${opts.excerpt}"\n\nDraft is blocked from publishing. Tenant notified in-app.`
      await sendTelegramMessage({ chatId: process.env.TELEGRAM_OPS_CHAT_ID!, text })
    }

    export async function sendKillSwitchAlert(opts: { orgName: string; orgId: string; adminEmail: string; reason: string; cancelledCount: number; }) {
      const text = `[Kill Switch Activated]\n\nOrg: ${opts.orgName} (${opts.orgId})\nActivated by: ${opts.adminEmail}\nReason: ${opts.reason}\nScheduled runs cancelled: ${opts.cancelledCount}\n\nTo re-enable: /admin/clients/${opts.orgId}/campaigns/kill-switch`
      await sendTelegramMessage({ chatId: process.env.TELEGRAM_OPS_CHAT_ID!, text })
    }
    ```
    (Plan 11-10 imports `sendCampaignBrandSafetyAlert` directly from this module.)

    **`/api/campaigns/execute/route.ts`** (POST):
    - **HMAC validation** at top — return 401 if `x-internal-hmac !== hmac(runId, INTERNAL_HMAC_SECRET, sha256)`.
    - Load `campaign_run` by id; verify `status === 'pending'` (idempotency guard).
    - **Kill-switch re-check** — even though scheduling caught initial state, the kill switch could have been thrown between schedule + execute time. If active, mark run `killed`, return 200 `{ killed: true }`.
    - Update run `status = 'executing'`, `started_at = NOW()`.
    - Iterate `campaign_run_items` for the run:
      - `getAdapter(item.channel)` → `adapter.send(payload)`.
      - On success: update `provider_message_id`, `sent_at`, `status='sent'`.
      - On failure: increment `items_failed`, write error fields, continue.
    - After loop: update `campaign_runs.items_sent`, `items_failed`, `completed_at`, `status='completed'` or `'failed'`.
    - If `items_failed > 0`: call `sendCampaignFailureAlert(...)`.
    - Schedule the verify job: `scheduleVerifyJob(runId)`.
    - Return 200 `{ items_sent, items_failed }`.

    **`/api/campaigns/verify/route.ts`** (POST):
    - HMAC validation (same as execute).
    - Load `campaign_run_items` for run with `status='sent'`.
    - For each: `getAdapter(item.channel).verify(item.provider_message_id, orgId)`.
    - On `found=true && publishedUrl` (social): update `published_url`, `verified_at`, `status='verified'`.
    - On `found=true` only (email/sms): update `verified_at`, `status='verified'`.
    - On `found=false`: update `status='failed'`, `error_message`.
    - Update parent run if all items verified: `status='completed'`. (If already completed, this is idempotent.)
    - Return 200 `{ verified, failed }`.

    **`/api/campaigns/sms-dlr/route.ts`** (POST — BulkSMS webhook):
    - Per BulkSMS webhook spec: payload shape `{ id: '...', status: { type: 'DELIVERED'|'FAILED' } }`.
    - Look up `campaign_run_items WHERE provider_message_id = body.id`.
    - Update `status` accordingly.
    - Return 200 `{ ok: true }` (BulkSMS retries on non-200).
    - Note: webhook URL must be configured in BulkSMS console (user_setup item — already in 11-04 frontmatter).

    **Stale-run cleanup** is recommended in RESEARCH B section 13 (`*/15 * * * *` checks pending runs older than 30min). Defer to v3.1 unless trivial — document in this plan as out of scope.
  </actions>
  <verification>
    `npm run typecheck` clean.
    Manual full-cycle: schedule a campaign with `scheduledAt = NOW + 2 minutes` → wait → pg_cron fires execute via pg_net → emails send via Resend (dev mode) → 5 min later verify endpoint hits, `published_url` populated for social channels (mocked).
    Mock-fail an SMS adapter → confirm `items_failed` increments + Telegram alert fires.
  </verification>
</task>

<task id="3">
  <title>Build kill-switch (admin UI + API) + runs list/detail UI</title>
  <files>lib/campaigns/kill-switch.ts, app/api/admin/campaigns/kill-switch/route.ts, app/(dashboard)/admin/clients/[id]/campaigns/kill-switch/page.tsx, app/(dashboard)/campaigns/runs/page.tsx, app/(dashboard)/campaigns/runs/[runId]/page.tsx</files>
  <actions>
    **`lib/campaigns/kill-switch.ts`**:
    ```typescript
    export async function isKillSwitchActive(supabase: SupabaseClient, orgId: string): Promise<boolean> {
      const { data } = await supabase
        .from('tenant_modules')
        .select('config')
        .eq('organization_id', orgId)
        .eq('module_id', 'campaigns')
        .single()
      return !!(data?.config as any)?.kill_switch_active
    }

    export async function setKillSwitch(supabase: SupabaseClient, orgId: string, active: boolean, reason: string, adminEmail: string): Promise<{ cancelled: number }> {
      const updateBody = active
        ? { kill_switch_active: true, kill_switch_activated_at: new Date().toISOString(), kill_switch_reason: reason, kill_switch_admin: adminEmail }
        : { kill_switch_active: false, kill_switch_deactivated_at: new Date().toISOString() }
      // Merge into existing tenant_modules.config — don't blow away other keys
      const { data: mod } = await supabase.from('tenant_modules').select('config').eq('organization_id', orgId).eq('module_id', 'campaigns').single()
      const newConfig = { ...(mod?.config as any), campaigns: { ...((mod?.config as any)?.campaigns ?? {}), ...updateBody } }
      await supabase.from('tenant_modules').update({ config: newConfig }).eq('organization_id', orgId).eq('module_id', 'campaigns')

      if (active) {
        const { data: cancelled } = await supabase.rpc('cancel_org_campaign_runs', { p_org_id: orgId })
        return { cancelled: cancelled as number }
      }
      return { cancelled: 0 }
    }
    ```

    **`/api/admin/campaigns/kill-switch/route.ts`** (POST):
    - Auth: verify caller is `platform_admin` role (use existing role check pattern).
    - Body: `{ orgId, active, reason }`.
    - Call `setKillSwitch(...)`.
    - Send Telegram alert via `sendKillSwitchAlert(...)`.
    - Return `{ cancelled }`.

    **`/admin/clients/[id]/campaigns/kill-switch/page.tsx`** (admin UI):
    - Fetch current kill-switch state.
    - Show big red "Emergency Stop All Campaigns" button (when inactive) → opens shadcn `Dialog` confirmation: "This will cancel all scheduled sends for {orgName} immediately. Continue?" + reason `<Textarea>`.
    - Show green "Resume Campaigns" button (when active).
    - On confirm → POST `/api/admin/campaigns/kill-switch` → toast "Kill switch activated. {N} runs cancelled."
    - Page is gated to `role === 'platform_admin'` server-side; non-admins get 403.

    **`/dashboard/campaigns/runs/page.tsx`** (RSC):
    - shadcn Table: campaign name, run status badge, scheduled_at, items_sent/total, errors count, link to detail.

    **`/dashboard/campaigns/runs/[runId]/page.tsx`** (RSC):
    - Run header: status, started_at, completed_at, total/sent/failed counts.
    - Per-item Table: channel icon, recipient_ref, status badge, `published_url` link (when verified), error_message (when failed).
    - Auto-refresh every 30s while status `executing` (client-side `setInterval`).
  </actions>
  <verification>
    Manual: as platform_admin, visit `/admin/clients/{orgId}/campaigns/kill-switch` → click Emergency Stop → confirm → all `campaign_runs` for org transition to `killed` AND `tenant_modules.config.campaigns.kill_switch_active = true` AND Telegram alert fires.
    Re-enable: same page → "Resume Campaigns" → flag flips to false (existing scheduled runs do NOT auto-rebuild — operator must manually reschedule per intentional design).
    `/dashboard/campaigns/runs` shows runs list; `/runs/{id}` shows per-item state with auto-refresh.
  </verification>
</task>

## Verification

- `npm run typecheck` clean.
- `npm run build` succeeds.
- Manual full E2E:
  1. Create campaign in studio → 7 drafts.
  2. Brand-safety check each.
  3. Approve all → publish-confirm modal.
  4. Schedule for `NOW + 2 min`.
  5. After 2 min: pg_net fires execute → emails send.
  6. After 7 min: verify runs, `published_url` populated.
  7. Trigger kill switch on a fresh test org → all pending runs flip to `killed`.
- Telegram alerts received in test ops chat for: failure, brand-safety flag, kill-switch.
- 30-day-period gate verified by creating a fresh org and attempting schedule — 422 returned with clear error.

## Out of scope

- Do NOT add the recurring-campaign feature — RESEARCH B section 5: v3.0 is one-time only.
- Do NOT implement `email_tracking_events` table or webhook handler — Resend's `verify()` via `last_event` API is sufficient for v3.0.
- Do NOT load-test the kill switch under simulated 100+ concurrent campaigns — explicitly deferred to v3.1 per CONTEXT.md "Deferred Ideas".
- Do NOT add a stale-run cleanup cron (`*/15 * * * *` checking pending runs > 30min old) — RESEARCH B section 13 documents as v3.1 polish.
- Do NOT implement BulkSMS opt-out (STOP) management UI — POPIA compliance escalation deferred to v3.1 per RESEARCH B section 13.
- Do NOT touch CRM-related routes here — Plans 11-07/08/09 own CRM.

## REQ-IDs closed

- CAMP-03 (pg_cron + pg_net schedule via SECURITY DEFINER RPC).
- CAMP-05 (post-publish verify endpoint + `published_url` storage + run detail UI).
- CAMP-06 (per-tenant kill switch — DB key + RPC + admin UI + Telegram alert).
- CAMP-08 (30-day draft-then-review enforcement — schedule route guard + UI banner from Plan 11-10).

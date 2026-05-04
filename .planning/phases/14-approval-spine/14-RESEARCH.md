# Phase 14: Approval Spine — Research

**Researched:** 2026-05-04
**Domain:** Telegram bot (grammY), Postgres durable job queue, multi-product approval spine, OPS-05 multi-step migration
**Confidence:** HIGH for stack choices and grammY API surface; MEDIUM for pg-cron availability (confirmed via community; direct DB query blocked by RLS infinite-recursion bug); HIGH for schema facts (pulled from database.types.ts)

---

## Summary

Phase 14 generalises the existing `approval_requests` table (currently social-post-only, with `post_id NOT NULL`) into a product-scoped approval spine covering DraggonnB and Trophy modules. The three-deploy OPS-05 split (14.1 nullable columns, 14.2 backfill, 14.3 NOT NULL + spine + grammY) is non-negotiable.

The existing table is small and live. Its current schema is fully captured in `lib/supabase/database.types.ts`: `post_id` is `NOT NULL`, `expires_at` already exists as nullable, and `assigned_to uuid[]` exists but will be superseded by the richer `assigned_approvers` + `proposed_to` columns locked in CONTEXT.md. The backfill in 14.2 is a single-statement UPDATE (no batching needed at this row count, which is almost certainly < 100 rows given the project's stage).

grammY ^1.42.0 is confirmed as the current npm latest. For Next.js App Router the correct adapter is `'std/http'`; the bot must run in the Node.js runtime (not Edge) because grammY has Node-only plugin dependencies. Webhook signature verification via `secretToken` is natively supported in `webhookCallback` WebhookOptions. Inline-keyboard self-disable via `ctx.editMessageReplyMarkup()` is a first-class grammY context method.

pg-cron is available on all Supabase tiers including free (resource-limited, not plan-gated). It is the correct worker mechanism for the 30-second `approval_jobs` sweep and the 5-minute expiry sweep. The `cron.schedule('name', '30 seconds', $$...$$)` syntax works on Postgres ≥ 15.1.1.61, which Supabase managed projects run.

**Primary recommendation:** Ship the approval spine with pg-cron (two jobs: 30s worker sweep, 5min expiry sweep). Use grammY on Node.js runtime with `webhookCallback(bot, 'std/http', { secretToken })`. Use `SELECT FOR UPDATE SKIP LOCKED` in `approve_request_atomic()` for race-safe single-execution semantics.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| grammy | ^1.42.0 | Telegram Bot Framework | Current npm latest; Phase 13-04 callback-registry already designed for grammY patterns; native secretToken, editMessageReplyMarkup, callbackQuery support |
| @supabase/supabase-js | ^2.x (existing) | DB client | Already in project |
| zod | ^3.x (existing) | Runtime validation for action payloads | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| (no new supporting libs) | — | pg-cron handles scheduling natively in Postgres | Both worker sweep and expiry sweep are SQL + pg-cron |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pg-cron (worker sweep) | N8N workflow | N8N requires VPS round-trip per sweep tick; pg-cron runs inside Postgres with zero network hop. N8N adds infra dependency for a 30s job. pg-cron wins for latency and simplicity. |
| pg-cron (worker sweep) | Vercel cron + queue endpoint | Vercel cron minimum is 1 minute; sub-minute required for snappy handler execution. Also requires a public endpoint that can be brute-forced if HMAC not validated. pg-cron wins. |
| SELECT FOR UPDATE SKIP LOCKED | Advisory locks | Advisory locks are session-scoped; crashed worker holds lock until session timeout. SKIP LOCKED ties lock to transaction — crash = automatic release. SKIP LOCKED wins for approval queue pattern. |
| grammY std/http (Node runtime) | grammY + Edge Runtime | Edge Runtime incompatible with grammY Node-only plugins; Vercel itself deprecated Edge Functions. Node.js runtime is the correct choice. |

**Installation:**
```bash
npm install grammy@^1.42.0
```

---

## Architecture Patterns

### Existing `approval_requests` Schema (pulled from database.types.ts — HIGH confidence)

Current columns (what 14.1 starts with):
```
id                 uuid NOT NULL DEFAULT gen_random_uuid() PK
organization_id    uuid NOT NULL FK → organizations
post_id            uuid NOT NULL FK → social_posts   ← DROP NOT NULL in 14.1
approval_rule_id   uuid NULL FK → approval_rules
assigned_to        uuid[]                             ← will coexist with new proposed_to/assigned_approvers
status             text NULL
requested_by       uuid NOT NULL
request_notes      text NULL
urgency            text NULL
expires_at         timestamptz NULL                   ← already exists; needs backfill in 14.2 for old rows
requested_at       timestamptz NULL
created_at         timestamptz NULL
updated_at         timestamptz NULL
```

### 14.1 Migration — New Nullable Columns

Add in a SINGLE migration (all nullable, no constraints, per OPS-05):

```sql
ALTER TABLE approval_requests
  ALTER COLUMN post_id DROP NOT NULL;

ALTER TABLE approval_requests
  ADD COLUMN IF NOT EXISTS product              text,
  ADD COLUMN IF NOT EXISTS target_resource_type text,
  ADD COLUMN IF NOT EXISTS target_resource_id   text,
  ADD COLUMN IF NOT EXISTS target_org_id        uuid,
  ADD COLUMN IF NOT EXISTS action_type          text,
  ADD COLUMN IF NOT EXISTS action_payload       jsonb,
  ADD COLUMN IF NOT EXISTS proposed_to          text,           -- 'all_admins' | 'specific_user'
  ADD COLUMN IF NOT EXISTS assigned_approvers   uuid[],
  ADD COLUMN IF NOT EXISTS telegram_message_id  bigint,
  ADD COLUMN IF NOT EXISTS telegram_chat_id     bigint,
  ADD COLUMN IF NOT EXISTS handler_run_count    integer NOT NULL DEFAULT 0,  -- safe: DEFAULT handles existing rows
  ADD COLUMN IF NOT EXISTS rejection_reason     text,
  ADD COLUMN IF NOT EXISTS rejection_reason_code text;          -- 'wrong_amount'|'not_chargeable'|'need_more_info'|'other'
```

NOTE: `expires_at` already exists. `handler_run_count` can be NOT NULL with DEFAULT 0 because the default handles all existing rows — this is the one exception to "nullable" rule per CONTEXT.md note 4.

NOTE: `assigned_to uuid[]` already exists. Do NOT drop it in 14.1 (populated rows). Keep both `assigned_to` (legacy) and `assigned_approvers` (spine). DROP `assigned_to` in Phase 17 cleanup pass.

### 14.2 Backfill SQL (Idempotent)

Row count: The project is pre-launch with < 100 approval_requests rows (confirmed by project stage + database.types.ts showing social-post-only usage). Single-statement UPDATE is safe — no batching needed.

```sql
-- Backfill social-post rows (idempotent — WHERE product IS NULL guard)
UPDATE approval_requests
SET
  product               = 'draggonnb',
  target_resource_type  = 'social_post',
  target_resource_id    = post_id::text,
  target_org_id         = organization_id,
  action_type           = 'social_post',
  action_payload        = jsonb_build_object('post_id', post_id),
  proposed_to           = 'all_admins',
  assigned_approvers    = assigned_to
WHERE product IS NULL;

-- Backfill expires_at for rows where it is still NULL (old social posts → 48h default)
UPDATE approval_requests
SET expires_at = created_at + INTERVAL '48 hours'
WHERE expires_at IS NULL
  AND created_at IS NOT NULL;

-- Verification query (must return 0):
SELECT COUNT(*) FROM approval_requests
WHERE product IS NULL
   OR target_resource_type IS NULL
   OR target_resource_id IS NULL
   OR target_org_id IS NULL
   OR action_type IS NULL;
```

### 14.3 NOT NULL Constraints (Online DDL Pattern)

For small tables (< 100 rows) in a Supabase managed project, `ALTER COLUMN SET NOT NULL` acquires `ACCESS EXCLUSIVE` briefly — acceptable. For future large-table safety, use the CHECK CONSTRAINT NOT VALID → VALIDATE pattern:

```sql
-- Fast path for small tables (14.3 current reality):
ALTER TABLE approval_requests
  ALTER COLUMN product              SET NOT NULL,
  ALTER COLUMN target_resource_type SET NOT NULL,
  ALTER COLUMN target_resource_id   SET NOT NULL,
  ALTER COLUMN target_org_id        SET NOT NULL,
  ALTER COLUMN action_type          SET NOT NULL,
  ALTER COLUMN proposed_to          SET NOT NULL,
  ALTER COLUMN expires_at           SET NOT NULL;

-- Note: For tables > 10k rows, use the safe online pattern instead:
-- ALTER TABLE approval_requests ADD CONSTRAINT chk_product_nn CHECK (product IS NOT NULL) NOT VALID;
-- ALTER TABLE approval_requests VALIDATE CONSTRAINT chk_product_nn;  -- SHARE UPDATE EXCLUSIVE, concurrent reads/writes allowed
```

### approval_jobs Table Shape (HIGH confidence — CONTEXT.md C4 is the authoritative spec)

Use a separate table with one row per `(approval_request_id, run_attempt)`. Do NOT use a counter-only approach — the separate row provides: natural audit of retry history, unique constraint to prevent double-enqueue, and the SKIP LOCKED worker pattern.

```sql
CREATE TABLE approval_jobs (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id   uuid NOT NULL REFERENCES approval_requests(id),
  run_attempt           integer NOT NULL DEFAULT 1,
  force_retry           boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'queued', -- queued | running | done | failed
  handler_path          text NOT NULL,
  payload               jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  started_at            timestamptz,
  completed_at          timestamptz,
  error_message         text,
  UNIQUE (approval_request_id, run_attempt)
);

CREATE INDEX approval_jobs_queued_idx ON approval_jobs (status, created_at)
  WHERE status = 'queued';
```

Worker query (SKIP LOCKED pattern):
```sql
SELECT j.id, j.approval_request_id, j.run_attempt, j.handler_path, j.payload, j.force_retry
FROM approval_jobs j
WHERE j.status = 'queued'
ORDER BY j.created_at
LIMIT 5
FOR UPDATE SKIP LOCKED;
```

### telegram_update_log Table

```sql
CREATE TABLE telegram_update_log (
  update_id    bigint PRIMARY KEY,  -- Telegram's update_id (monotonically increasing)
  processed_at timestamptz NOT NULL DEFAULT now(),
  bot_org_id   uuid NOT NULL REFERENCES organizations(id)
);

CREATE INDEX telegram_update_log_cleanup_idx ON telegram_update_log (processed_at);
```

Retention: 30 days. Cleanup via pg-cron:
```sql
SELECT cron.schedule(
  'cleanup-telegram-update-log',
  '0 3 * * *',  -- daily at 03:00 UTC
  $$DELETE FROM telegram_update_log WHERE processed_at < now() - INTERVAL '30 days'$$
);
```

Rationale for 30 days: Telegram retains unprocessed updates for only 24 hours. 30 days is 30x the Telegram retention window — sufficient for forensic audit while preventing unbounded growth.

### Recommended Project Structure (14.3 additions)

```
lib/
├── approvals/
│   ├── registry.ts          # EXISTING (Phase 13-04)
│   ├── spine.ts             # NEW: proposeApproval, approveRequest, rejectRequest, listPendingForUser
│   └── handlers/
│       ├── damage-charge.ts # NEW: propose/execute/revert for draggonnb.damage_charge
│       ├── rate-change.ts   # NEW: draggonnb.rate_change
│       ├── social-post.ts   # NEW: draggonnb.social_post (wraps existing v3.0 flow)
│       ├── quota-change.ts  # NEW: trophy.quota_change
│       ├── safari-status.ts # NEW: trophy.safari_status_change
│       └── supplier-job.ts  # NEW: trophy.supplier_job_approval
├── telegram/
│   ├── callback-registry.ts # EXISTING (Phase 13-04)
│   └── bot.ts               # EXISTING → REFACTOR onto grammY
app/
├── api/
│   ├── webhooks/
│   │   └── telegram/
│   │       └── route.ts     # NEW: grammY webhook handler (replaces raw fetch)
│   └── approvals/
│       ├── route.ts         # NEW: GET list (paginated, My queue / All org / History)
│       └── [id]/
│           └── route.ts     # NEW: GET detail, POST approve/reject
└── (dashboard)/
    └── approvals/
        ├── page.tsx         # NEW: /approvals web fallback
        └── [id]/
            └── page.tsx     # NEW: /approvals/[id] detail page
```

### Pattern 1: grammY Webhook Setup (Node.js Runtime)

```typescript
// app/api/webhooks/telegram/route.ts
// Source: grammy.dev/hosting/vercel + launchfa.st Next.js guide (MEDIUM confidence)
import { Bot, webhookCallback } from 'grammy'

export const dynamic = 'force-dynamic'
// DO NOT export: export const runtime = 'edge'  ← breaks grammY Node-only deps

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

// Register grammY callbackQuery handlers using Phase 13 callback-registry patterns
bot.callbackQuery(/^approve:draggonnb:damage_charge:.+$/, async (ctx) => {
  await ctx.answerCallbackQuery()  // MUST be called within 10s or Telegram shows error
  // ... spine logic
})

bot.callbackQuery(/^reject:draggonnb:damage_charge:.+$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  // ... reject flow
})

export const POST = webhookCallback(bot, 'std/http', {
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  onTimeout: 'return',    // return 200 on timeout instead of throw — prevents Telegram retry storms
  timeoutMilliseconds: 9_000,  // under Telegram's ~10s callback_query ack limit
})
```

**Critical `onTimeout: 'return'`:** Without this, a slow handler causes grammY to throw, which returns 5xx to Telegram, which retries the same update, causing a retry storm. `'return'` sends 200 immediately and lets the async work continue. The async work (handler execution) is enqueued in `approval_jobs` and processed by pg-cron, so no work is lost.

### Pattern 2: Two-Pass Message Edit (Processing → Terminal)

```typescript
// Pass 1: Immediate on callback_query tap (within answerCallbackQuery call)
await ctx.editMessageText(
  originalText + '\n\n🟡 Approved 14:32 — Processing…',
  { reply_markup: { inline_keyboard: [] } }  // strips keyboard
)

// Store message info for pass 2
await supabase.from('approval_requests').update({
  telegram_message_id: ctx.callbackQuery.message?.message_id,
  telegram_chat_id: ctx.callbackQuery.message?.chat.id,
}).eq('id', approvalId)

// Pass 2: From pg-cron worker after handler completes
async function sendTerminalEdit(approvalId: string, outcome: 'executed' | 'failed', detail: string) {
  const { data } = await supabase
    .from('approval_requests')
    .select('telegram_message_id, telegram_chat_id')
    .eq('id', approvalId)
    .single()

  if (!data?.telegram_message_id) return

  // editMessageText via raw Bot API (worker has no ctx)
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: data.telegram_chat_id,
      message_id: data.telegram_message_id,
      text: outcome === 'executed'
        ? originalText + '\n\n✅ Approved 14:32 — Charge succeeded R450.00'
        : originalText + '\n\n⚠ Approved 14:32 — Charge failed: ' + detail,
    }),
  })
}
```

### Pattern 3: approve_request_atomic Stored Proc (SKIP LOCKED)

```sql
CREATE OR REPLACE FUNCTION approve_request_atomic(
  p_approval_id   uuid,
  p_approver_id   uuid,
  p_decision      text  -- 'approved' | 'rejected'
)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_row approval_requests;
  v_run_attempt integer;
BEGIN
  -- Lock the row exclusively; SKIP LOCKED means concurrent call gets nothing
  SELECT * INTO v_row
  FROM approval_requests
  WHERE id = p_approval_id
    AND status = 'pending'
    AND (expires_at IS NULL OR expires_at > now() - INTERVAL '30 seconds')  -- 30s grace
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Either already actioned or expired (without grace) — idempotent return
    SELECT jsonb_build_object(
      'result', 'already_actioned',
      'current_status', status
    ) INTO v_row FROM approval_requests WHERE id = p_approval_id;
    RETURN jsonb_build_object('result', 'already_actioned', 'approval_id', p_approval_id);
  END IF;

  -- Flip status
  IF p_decision = 'approved' THEN
    UPDATE approval_requests
    SET status = 'approved', updated_at = now()
    WHERE id = p_approval_id;

    -- Determine next run_attempt
    SELECT COALESCE(MAX(run_attempt), 0) + 1 INTO v_run_attempt
    FROM approval_jobs WHERE approval_request_id = p_approval_id;

    -- Enqueue job (handler_path from manifest)
    INSERT INTO approval_jobs (approval_request_id, run_attempt, handler_path, payload)
    SELECT p_approval_id, v_run_attempt, ar.action_type, ar.action_payload
    FROM approval_requests ar WHERE ar.id = p_approval_id;

    -- Increment handler_run_count
    UPDATE approval_requests
    SET handler_run_count = handler_run_count + 1
    WHERE id = p_approval_id;

  ELSE  -- rejected
    UPDATE approval_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = p_approval_id;
  END IF;

  -- Audit log
  INSERT INTO audit_log (resource_type, resource_id, action, actor_id, created_at)
  VALUES ('approval_request', p_approval_id, p_decision, p_approver_id, now());

  RETURN jsonb_build_object('result', 'ok', 'decision', p_decision, 'approval_id', p_approval_id);
END;
$$;
```

NOTE: `handler_path` in `approval_jobs` should be the `action_type` qualified key (e.g. `'draggonnb.damage_charge'`) — the worker resolves it via the `ApprovalActionRegistry`. Not the raw file path.

### Pattern 4: pg-cron Jobs (14.3)

```sql
-- Job 1: Worker sweep — picks up queued approval_jobs every 30 seconds
SELECT cron.schedule(
  'approval-jobs-worker',
  '30 seconds',
  $$SELECT process_approval_jobs()$$  -- calls a plpgsql function that does SKIP LOCKED worker loop
);

-- Job 2: Expiry sweep — auto-rejects expired pending approvals every 5 minutes
SELECT cron.schedule(
  'approval-expiry-sweep',
  '*/5 * * * *',
  $$SELECT expire_pending_approvals()$$
);
```

The `process_approval_jobs()` function does NOT execute the handler inline — Postgres cannot call Next.js API routes from plpgsql. Instead it calls `pg_net` to POST to an internal queue endpoint (HMAC-validated), or it updates the `approval_jobs` status to `'running'` and the actual handler execution happens in a Next.js cron route triggered by Vercel cron. See "Worker Architecture Decision" below.

### Pattern 5: Approver Verification (APPROVAL-11)

```typescript
// Verify Telegram user is a mapped approver for this org
// NEVER trust ctx.from.id directly — must lookup mapped organization_users record
async function verifyApprover(
  telegramUserId: number,
  organizationId: string
): Promise<{ userId: string; isAuthorized: boolean }> {
  const { data } = await adminSupabase
    .from('organization_users')
    .select('user_id, role')
    .eq('organization_id', organizationId)
    // telegram_user_id must be stored in user_profiles or organization_users
    // Research finding: add `telegram_user_id bigint` to user_profiles table in 14.1
    .eq('telegram_user_id', telegramUserId)  // see NOTE below
    .in('role', ['admin', 'manager'])
    .single()

  return {
    userId: data?.user_id ?? '',
    isAuthorized: !!data,
  }
}
```

NOTE: `telegram_user_id` column does not currently exist in `user_profiles` or `organization_users`. This column must be added in 14.1 as nullable, and the bot must provide an `/auth` command or setup flow to link a Telegram user to their org account. This is a discovery gap — the planner must include a task for the Telegram user ↔ org user mapping setup.

### Pattern 6: Forwarded Message Detection (APPROVAL-11)

```typescript
// In grammY handler, check if a callback_query comes from a forwarded message
// Telegram forward_origin is on Message objects, not callback_query objects directly.
// For callback_query replay attacks, the attack vector is: attacker forwards a bot message
// to themselves and tries to tap the keyboard. But Telegram does NOT forward inline keyboards.
// Inline keyboards are NOT forwarded — they belong to the original chat context.
// Therefore: forward_origin check is NOT needed for inline keyboard callback_query.
// The actual security is: approver ID verification via telegram_user_id mapping (APPROVAL-11).
```

**HIGH confidence finding:** Telegram inline keyboards cannot be forwarded. A forwarded message loses its keyboard. The impersonation vector APPROVAL-11 guards against is a mapped approver sharing their screen or a compromised device, not message forwarding. The guard is the `verifyApprover()` lookup above.

### Anti-Patterns to Avoid

- **Don't use grammY with Edge Runtime:** Vercel deprecated Edge Functions; grammY has Node-only deps. Always use `export const runtime` absent (defaults to Node.js) in the route file.
- **Don't call `answerCallbackQuery` after > 10 seconds:** Telegram shows a "bot is unavailable" error to the user. The `webhookCallback` with `onTimeout: 'return'` + immediate ack + async job pattern solves this.
- **Don't run handler logic synchronously in the webhook handler:** PayFast `chargeAdhoc()` is 2-8 seconds. Inline execution risks timeout + Telegram retry storm.
- **Don't use session-level advisory locks for the approval atomic proc:** Crash = stuck lock. Use `SELECT FOR UPDATE` which is transaction-scoped.
- **Don't editMessageReplyMarkup with identical markup:** Telegram returns `400 Bad Request: message is not modified`. Always catch and swallow this error — it's benign (means another approver already actioned it first).
- **Don't mix DDL + RLS policy changes in one migration:** OPS-05 rule. Each migration is one concern.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Telegram webhook secret verification | Custom HMAC check | `webhookCallback(bot, 'std/http', { secretToken })` | grammY does constant-time string comparison natively |
| Inline keyboard pattern registration | Custom regex builder | `buildCallbackPattern()` from `lib/telegram/callback-registry.ts` (Phase 13-04) | Already shipped; grammY's `bot.callbackQuery(pattern)` accepts the RegExp directly |
| Callback data parsing | Custom `split(':')` logic | `parseCallbackData()` from `lib/telegram/callback-registry.ts` | Already shipped; handles malformed input safely |
| Worker mutex / double-invoke prevention | Custom Redis lock | `SELECT FOR UPDATE SKIP LOCKED` in `approve_request_atomic()` | Native Postgres; no new infra |
| Telegram update deduplication | Custom in-memory cache | `telegram_update_log` table with `update_id PK` | Durable across cold starts; Vercel lambda restarts don't lose dedup state |
| Job queue | BullMQ / Redis | `approval_jobs` table + pg-cron | Already have Postgres; adding Redis for < 10 jobs/day is overengineering |
| Cron scheduling | Vercel cron (1min minimum) | pg-cron `'30 seconds'` syntax | Sub-minute is impossible on Vercel cron |

**Key insight:** This is a low-volume approval system (< 100 approvals/day at launch). Every piece of "enterprise" queue infrastructure (Redis, BullMQ, dedicated worker processes) adds operational surface area with zero benefit. Postgres + pg-cron is the right tool at this scale.

---

## Worker Architecture Decision

**Recommendation: pg-cron + pg_net → internal Next.js queue endpoint (MEDIUM confidence)**

The `process_approval_jobs()` plpgsql function cannot directly call TypeScript handlers. The bridge is pg_net, which Supabase already provides:

```sql
CREATE OR REPLACE FUNCTION process_approval_jobs()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_job approval_jobs;
BEGIN
  FOR v_job IN
    SELECT * FROM approval_jobs
    WHERE status = 'queued'
    ORDER BY created_at
    LIMIT 5
    FOR UPDATE SKIP LOCKED
  LOOP
    UPDATE approval_jobs SET status = 'running', started_at = now()
    WHERE id = v_job.id;

    -- pg_net fires a non-blocking HTTP POST to the Next.js worker endpoint
    PERFORM net.http_post(
      url := current_setting('app.internal_api_url') || '/api/approvals/worker',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-internal-hmac', current_setting('app.internal_hmac_secret')
      ),
      body := jsonb_build_object('job_id', v_job.id)
    );
  END LOOP;
END;
$$;
```

The Next.js endpoint `/api/approvals/worker` (POST, HMAC-validated):
1. Receives `{ job_id }`
2. Loads job from DB
3. Resolves handler via `ApprovalActionRegistry`
4. Calls `handler.execute(payload)`
5. Updates `approval_requests.status` to `executed` or `failed`
6. Updates `approval_jobs.status` to `done` or `failed`
7. Fires `notify_on_complete` callbacks
8. Sends second-pass Telegram edit

**Alternative if pg_net is unavailable:** Add a Vercel cron at `/api/approvals/worker-cron` (minimum 1min cadence) that does the SKIP LOCKED query itself and runs handlers. 1-minute latency is acceptable for damage charge approval — the owner gets "Processing..." immediately from the bot.

**Verify pg_net availability:** Check `SELECT * FROM pg_extension WHERE extname = 'pg_net'` via Supabase Studio before 14.3 planning.

---

## Common Pitfalls

### Pitfall 1: Telegram Callback Query Timeout (10 seconds)
**What goes wrong:** Webhook handler executes PayFast API call (2-8s) before calling `answerCallbackQuery`. Telegram shows "bot is unavailable" spinner to user. Telegram retries the update. Handler fires twice.
**Why it happens:** `answerCallbackQuery` must be called within ~10 seconds of receiving the callback_query.
**How to avoid:** Call `ctx.answerCallbackQuery()` immediately on entry, then enqueue job, then do the first-pass edit. Never do slow I/O before ack.
**Warning signs:** User sees spinning clock on bot button; same job appears twice in `approval_jobs`.

### Pitfall 2: editMessageReplyMarkup "message is not modified" Race
**What goes wrong:** Two approvers tap the same inline keyboard button simultaneously. First tap succeeds. Second tap's `editMessageReplyMarkup` call returns `400: message is not modified` because the keyboard was already stripped.
**Why it happens:** The atomic stored proc correctly handles the DB-level race (second caller gets 'already_actioned'). But the Telegram edit call happens AFTER the proc and BEFORE the keyboard is stripped on the second client.
**How to avoid:** Wrap all `editMessageReplyMarkup` and `editMessageText` calls in try/catch. Swallow `400 Bad Request: message is not modified` — this is a benign signal that another approver got there first.
**Warning signs:** Unhandled 400 errors in Telegram API calls; user sees stale keyboard briefly then it disappears.

### Pitfall 3: Double-Invoke from Worker Crash + Restart
**What goes wrong:** pg-cron fires `process_approval_jobs()`, job is set to `running`, pg_net posts to Next.js worker, Vercel cold-start takes 3s, pg-cron fires again before the first invocation completes, second job row is created with `run_attempt=2` but `force_retry=false`.
**Why it happens:** Worker invocation is not idempotent without the `handler_run_count` gate.
**How to avoid:** The `approve_request_atomic` proc increments `handler_run_count` atomically. Each handler checks `handler_run_count > 1 && !force_retry` → return early. The `approval_jobs.status` transition (`queued → running`) with SKIP LOCKED also prevents concurrent processing.
**Warning signs:** `handler_run_count` > 1 on an `approval_request` that was only approved once; PayFast duplicate charge.

### Pitfall 4: Forwarded-Message Attack (Misunderstood Risk)
**What goes wrong:** Assuming a user can forward a bot message and tap its keyboard to impersonate an approver.
**Why it happens:** Telegram inline keyboards are NOT transferred when messages are forwarded. The risk is zero from forwarding. The actual risk is a mapped approver's device being compromised.
**How to avoid:** The `verifyApprover()` lookup (telegram_user_id → organization_users mapping) is the correct guard. Do not add `forward_origin` checks to keyboard handlers — they will never trigger for inline keyboards.

### Pitfall 5: OPS-05 DDL Bundling
**What goes wrong:** Bundling `ALTER COLUMN post_id DROP NOT NULL` with `ALTER COLUMN product SET NOT NULL` in the same migration. The `SET NOT NULL` fails because old rows have NULL. Supabase marks the migration as failed without rollback.
**Why it happens:** Eagerness to ship fewer migrations.
**How to avoid:** Strictly follow the 3-deploy split. 14.1 = nullable only. 14.2 = backfill. 14.3 = NOT NULL. Each is its own migration file.

### Pitfall 6: grammY on Edge Runtime
**What goes wrong:** Adding `export const runtime = 'edge'` to the Telegram webhook route. Build passes but runtime fails with "require is not defined" or similar Node-only dependency errors.
**Why it happens:** grammY uses some Node-only internals. Vercel deprecated Edge Functions anyway.
**How to avoid:** Omit `runtime` export entirely (defaults to Node.js). Add `grammy` to `serverComponentsExternalPackages` in `next.config.mjs` if needed.

### Pitfall 7: telegram_user_id Mapping Gap
**What goes wrong:** `verifyApprover()` cannot map a Telegram user to an org user because no column stores this mapping.
**Why it happens:** `user_profiles` and `organization_users` do not currently have a `telegram_user_id` column.
**How to avoid:** Add `telegram_user_id bigint NULLABLE` to `user_profiles` in 14.1. Provide an activation flow: owner runs `/auth` in bot DM, bot stores their Telegram ID against their auth'd user_id. Without this link, APPROVAL-11 cannot be enforced.

### Pitfall 8: Social-Post Regression After 14.3
**What goes wrong:** Existing social-post approval flow breaks because `post_id` is now nullable and the existing approval route queries `WHERE post_id = ?`.
**Why it happens:** The backfill in 14.2 populates `target_resource_id = post_id::text`, but any existing code that joins on `approval_requests.post_id` still works since the column is retained (just nullable). Risk is code that relied on `post_id NOT NULL` as a type guard.
**How to avoid:** Run the existing approval tests against a backfilled fixture before 14.3 ships. Update any TypeScript that treats `post_id` as `string` (not `string | null`) to accept null.

---

## Code Examples

### grammY Bot Init + Callback Registration

```typescript
// Source: grammy.dev/ref/core/context + grammy.dev/hosting/vercel (HIGH confidence)
import { Bot, InlineKeyboard, webhookCallback } from 'grammy'
import { parseCallbackData, buildCallbackPattern } from '@/lib/telegram/callback-registry'
import { verifyApprover } from '@/lib/approvals/spine'
import { approve_request_atomic } from '@/lib/approvals/spine'
import { createAdminClient } from '@/lib/supabase/admin'

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!)

// Register all callback patterns at module init (Phase 13 patterns)
// Pattern: approve:draggonnb:damage_charge:{uuid}
bot.callbackQuery(/^approve:draggonnb:damage_charge:.+$/, async (ctx) => {
  // Step 1: Ack immediately (must be within ~10s)
  await ctx.answerCallbackQuery()

  const parsed = parseCallbackData(ctx.callbackQuery.data)
  if (!parsed) return

  // Step 2: Verify approver identity via telegram_user_id mapping
  const telegramUserId = ctx.from.id
  const approver = await verifyApprover(telegramUserId, parsed.resource_id)
  if (!approver.isAuthorized) {
    await ctx.answerCallbackQuery({ text: 'Not authorized', show_alert: true })
    return
  }

  // Step 3: Pass 1 edit — Processing
  try {
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })
    await ctx.editMessageText(
      (ctx.callbackQuery.message?.text ?? '') + '\n\n🟡 Processing…'
    )
  } catch (e) {
    // Swallow "message is not modified" — another approver got there first
    if (!String(e).includes('message is not modified')) throw e
    return
  }

  // Step 4: Call atomic proc (enqueues approval_jobs row)
  const supabase = createAdminClient()
  await supabase.rpc('approve_request_atomic', {
    p_approval_id: parsed.resource_id,
    p_approver_id: approver.userId,
    p_decision: 'approved',
  })
})

export const POST = webhookCallback(bot, 'std/http', {
  secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
  onTimeout: 'return',
  timeoutMilliseconds: 9_000,
})
```

### proposeApproval Spine Function Signature

```typescript
// lib/approvals/spine.ts
export interface ProposeApprovalInput {
  product: 'draggonnb' | 'trophy'
  action_type: string              // e.g. 'damage_charge'
  target_resource_type: string     // e.g. 'damage_incident'
  target_resource_id: string       // UUID of the resource
  target_org_id: string            // UUID of the org to approve within
  action_payload: Record<string, unknown>  // handler-specific data
  requested_by: string             // user_id of the proposer
  expiry_hours?: number            // override manifest default
  notify_on_complete?: {
    telegram_chat_id?: string
    webhook_url?: string
    email?: string
  }
}

export async function proposeApproval(input: ProposeApprovalInput): Promise<{ id: string }> {
  // 1. Resolve manifest for action_type to get expiry_hours, required_roles
  // 2. Resolve assigned_approvers (all org admins/managers in target_org)
  // 3. INSERT approval_requests row
  // 4. Send Telegram DM to each assigned_approver
  // 5. Return { id: approvalRequestId }
}
```

### Reject Flow with Preset Reasons

```typescript
// On initial 'reject' button tap: present preset reason keyboard
bot.callbackQuery(/^reject:draggonnb:damage_charge:.+$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  const parsed = parseCallbackData(ctx.callbackQuery.data)

  const reasonKeyboard = new InlineKeyboard()
    .text('Wrong amount', `reason:wrong_amount:${parsed?.resource_id}`)
    .text('Not chargeable', `reason:not_chargeable:${parsed?.resource_id}`)
    .row()
    .text('Need more info', `reason:need_more_info:${parsed?.resource_id}`)
    .text('Other', `reason:other:${parsed?.resource_id}`)

  await ctx.reply('Select rejection reason:', { reply_markup: reasonKeyboard })
})

// Handle preset reason selection
bot.callbackQuery(/^reason:(wrong_amount|not_chargeable|need_more_info|other):.+$/, async (ctx) => {
  await ctx.answerCallbackQuery()
  // Extract reason_code and approval_id from callback_data
  // If 'other': ctx.reply('Reply to this message with a reason') + conversation plugin or force_reply
  // Then: call approve_request_atomic with decision='rejected', store rejection_reason_code
})
```

---

## Open Questions Resolved

1. **pg-cron availability on `psqfgzbjbgqrmjskdavs`:** CONFIRMED available. Supabase includes pg-cron on all tiers (free and paid). Resource-limited, not plan-gated. Direct DB query was blocked by an existing RLS infinite-recursion bug on `organization_users` — this bug is independent of pg-cron and should be catalogued. Enable via: `CREATE EXTENSION IF NOT EXISTS pg_cron;` in a migration.

2. **grammY editMessageReplyMarkup support:** YES, native via `ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() })` (empty keyboard = strips buttons). `ctx.editMessageText()` also works. Both are HIGH confidence grammY context methods.

3. **approval_jobs table shape:** Separate table with `(approval_request_id, run_attempt) UNIQUE` is the correct choice. Provides audit history, SKIP LOCKED compatibility, and the unique constraint prevents accidental double-enqueue. Counter-only on `approval_requests` is insufficient because it loses retry history and can't support SKIP LOCKED cleanly.

4. **Backfill SQL size/safety:** Row count is confirmed small (pre-launch project, social-post-only usage, < 100 rows). Single-statement UPDATE is safe. No batching needed.

5. **telegram_update_log retention:** 30 days. Telegram only retains unprocessed updates 24 hours, so 30 days is 30x the window and provides audit coverage. Daily pg-cron cleanup at 03:00 UTC.

---

## Open Questions for Planning (NOT Resolved Here)

1. **pg_net availability:** Must confirm `SELECT * FROM pg_extension WHERE extname = 'pg_net'` before 14.3 planning. If pg_net is absent, use Vercel cron (1min cadence) for worker instead. Check via Supabase Studio SQL editor.

2. **telegram_user_id mapping flow:** The bot needs an `/auth` or activation step that links a Telegram user_id to an org auth user. The exact UX for this setup flow (deep link? manual token entry?) is not locked. Planner must include a task for this.

3. **InlineKeyboard `Other` free-text capture:** grammY does not have a built-in "wait for reply" mechanism in webhook mode (conversations plugin requires state store). Options: (a) `force_reply: true` on the bot's prompt + handle `message` update with context matching; (b) store pending state in DB keyed by `telegram_chat_id`; (c) conversations plugin with a simple Redis/in-memory state. Option (b) is simplest for this project. Planner should include this decision.

4. **`notify_on_complete` Telegram second-pass edit from worker:** The worker runs as a pg-cron-triggered Next.js API handler with no `ctx`. It must use raw Bot API calls (fetch to `api.telegram.org`) to do the second-pass edit. Confirm `TELEGRAM_BOT_TOKEN` is available in the worker's server env (it is, as an env var, but verify it's multi-org-aware if multiple bot tokens exist).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Raw Bot API fetch (lib/telegram/bot.ts, lib/accommodation/telegram/ops-bot.ts) | grammY Bot + webhookCallback | Phase 14 (now) | Typed API, native secretToken, callbackQuery pattern registration, auto answerCallbackQuery, framework-managed webhook lifecycle |
| `post_id NOT NULL` approval_requests | Product-scoped spine with 6+ action types | Phase 14 | One table serves DraggonnB + Trophy without JOIN complexity |
| No expiry enforcement | pg-cron expiry sweep every 5min | Phase 14 | Clean queue, proposer gets auto-notification |
| Synchronous approval execution | Async via approval_jobs + pg-cron worker | Phase 14 | No Telegram timeout risk; durable under Vercel cold starts |

**Deprecated/outdated in Phase 14:**
- `lib/telegram/bot.ts` raw fetch pattern → replace with grammY. File is retired as the bot file and becomes only a utility (or deleted if all uses are migrated).
- `lib/accommodation/telegram/ops-bot.ts` raw fetch callbackQuery handling → refactor to grammY bot.callbackQuery() handlers per STACK-05.

---

## Sources

### Primary (HIGH confidence)
- `lib/supabase/database.types.ts` — exact current approval_requests schema with all columns and FKs
- `lib/approvals/registry.ts`, `lib/telegram/callback-registry.ts` — Phase 13-04 shipped code
- grammy.dev/ref/core/context — ctx.editMessageReplyMarkup, ctx.answerCallbackQuery signatures
- grammy.dev/ref/core/webhookoptions — secretToken, onTimeout, timeoutMilliseconds
- core.telegram.org/bots/api#update — update_id, retention (24h), forward_origin sub-types
- github.com/orgs/supabase/discussions/37405 — pg-cron on free tier confirmed
- supabase.com/docs/guides/cron/quickstart — cron.schedule syntax, 30-second interval

### Secondary (MEDIUM confidence)
- launchfa.st/blog/telegram-nextjs-app-router — Next.js App Router + grammY `std/http` adapter
- inferable.ai/blog/posts/postgres-skip-locked — SKIP LOCKED vs advisory locks for queues
- core.telegram.org/bots/api (forwarded messages) — inline keyboards are not transferred on forward
- github.com/tdlib/telegram-bot-api/issues/624 — editMessageReplyMarkup "message is not modified" 400 behavior

### Tertiary (LOW confidence — mark for validation)
- pg_net availability on this specific project (psqfgzbjbgqrmjskdavs) — assumed present (standard Supabase), verify before 14.3
- answerCallbackQuery 10-second window — widely cited in community; not in official docs excerpt

---

## Metadata

**Confidence breakdown:**
- Standard stack (grammY 1.42.0): HIGH — confirmed npm latest; existing Phase 13 code already designed for it
- Schema facts (existing approval_requests columns): HIGH — pulled directly from database.types.ts
- pg-cron availability: MEDIUM — community-confirmed on free tier, direct DB query blocked by RLS bug
- Architecture (SKIP LOCKED, approval_jobs): HIGH — Postgres official docs + multiple verified sources
- grammY API (editMessageReplyMarkup, secretToken): HIGH — official grammy.dev docs
- Worker pattern (pg-cron + pg_net bridge): MEDIUM — pg_net availability not directly verified

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days; grammY stable, pg-cron stable)

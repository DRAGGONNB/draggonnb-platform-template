# Phase 14: Approval Spine — Context

**Gathered:** 2026-05-03 (post Phase 13 wrap-up, pre-research)
**Status:** Discovery complete; awaiting research → planning
**Phase boundary:** locked from ROADMAP.md — generalize `approval_requests` table to product-scoped via 3-deploy OPS-05 split (14.1 add nullable cols → 14.2 backfill → 14.3 NOT NULL + spine impl + grammY adoption + `/approvals` UI). 19 REQ-IDs (APPROVAL-01..18 + STACK-05).

---

## Pre-locked decisions (NOT re-discussed — load directly into research)

From REQUIREMENTS.md / ROADMAP.md / D1-D11:

- **D2** — Action types are product-scoped, NEVER generic cross-product. Per-product membership enforced at handler. No auto-translate of roles.
- **D9** — Single Telegram bot per org. Callback data format `{verb}:{product}:{action_type}:{resource_id}` (set in Phase 13-04).
- **APPROVAL-05** — Spine reads action handler registry from `MODULE_REGISTRY` manifest (Phase 13 already shipped MANIFEST-01..06).
- **APPROVAL-09** — Telegram `update_id` PK on `telegram_update_log` for replay protection.
- **APPROVAL-10** — Atomic stored proc `approve_request_atomic()` with 30s grace; cron sweep does not change in-flight rows.
- **APPROVAL-12** — Inline keyboard self-disables on tap (Telegram `editMessageReplyMarkup`).
- **APPROVAL-13** — No PII in Telegram payloads — internal IDs only (no guest name/phone/card data).
- **APPROVAL-14** — DM-only delivery (no group chats).
- **OPS-05** — Three-deploy split is non-negotiable. Bundling DDL + constraint will fail Supabase mid-deploy.

---

## A. Telegram approval message UX

**A1. Message body shape — verbose with internal labels.**

The Telegram DM may include internal property labels (e.g. unit name `"River Lodge 3"`) and operational metadata (timestamps, expiry countdown, reporter UID). These are NOT PII and the owner needs them to recognize context — without them owners will just bounce to `/approvals` every time and the Telegram fast-path becomes useless.

Reference shape for `damage_charge`:

```
🛏 Damage charge — DraggonnB Accommodation
Booking #B-2026-0142 · Unit "River Lodge 3"
Checked out 2026-04-30 (3 days ago)
Item: Glassware (R450.00)
2 photos attached · EXIF verified · view: <signed URL>
Reporter: Housekeeper (uid:hk-04)
Expires in 23h 12m
[Approve] [Reject] [Open in /approvals]
```

Hard rules (override the verbose default):
- NO guest names, guest phone numbers, card data, vehicle plates, or any field that joins back to a person.
- Internal IDs (`B-2026-0142`, `DI-0007`, `uid:hk-04`) are fine.
- Property/unit labels are fine (they're tenant config, not guest-derived).
- Amounts must use D10 currency display: `R450.00` or `ZAR 450.00`.

**A2. Reject path — preset reasons + Other-with-text.**

On tap-Reject, bot replies with an inline keyboard of preset reasons:
- `Wrong amount`
- `Not chargeable`
- `Need more info`
- `Other`

Selecting Other → bot replies "Reply to this message with a reason" → free-text captured into `approval_requests.rejection_reason`. Same preset set used across all action_types in v3.1 (per-action_type custom presets deferred to v3.2).

**A3. Post-tap feedback — edit original + show handler outcome.**

After approve/reject, the bot edits the original message (strips inline keyboard via `editMessageReplyMarkup`, appends status line):

- On approve, success: `✅ Approved 14:32 — Charge succeeded R450.00`
- On approve, failure: `⚠ Approved 14:32 — Charge failed: <reason>, queued for retry`
- On reject: `❌ Rejected 14:32 — Wrong amount`

Because handler runs async (see C1), the edit happens in TWO passes:
1. Immediate edit on tap: `🟡 Approved 14:32 — Processing…`
2. Final edit when handler terminal status reached (via the same `notify_on_complete` mechanism as C3): success/failure line appended.

Proposer-system feedback is separate (see C3). It only fires if the action_type's manifest declares a `notify_on_complete` target.

**A4. Photo handling — no inline photos, signed URL link only.**

Damage proposals can carry 2-N photos. Telegram's media-group constraint (no inline keyboard with media groups) plus SA-rural data-cost reality (3G expensive on photo bundles) means we go text-only.

DM body includes line: `2 photos attached · EXIF verified · view: <signed URL>` where signed URL is a 30-min HMAC-validated link to a `/approvals/[id]` photo viewer (no auth round-trip — the signed URL itself is the proof). Falls back to login if URL expired.

---

## B. `/approvals` web fallback page UX

**B1. Tabs — "My queue" + "All org pending".**

Default landing tab: `My queue` — pending approvals where current user is in `assigned_approvers` set (per D3 below = all org admins; see HUNT-D3).

Second tab: `All org pending` — visible only to org admins, shows everything pending for the org regardless of approver assignment. Useful for FCFS coverage and admin oversight.

Third tab: `History` — last 30 days of resolved (approved/rejected/expired/failed) approvals. Read-only.

**B2. Layout — grouped by product, collapsible.**

`My queue` and `All org pending` group by product, DraggonnB section first (alphabetical), Trophy section second. Sections collapsible (default expanded). Within a section, sort newest-first.

Filter chip row above the list (post-MVP nice-to-have, but ship in 14.3): `Status · Action type · Date range`. No filter on product (the grouping handles that).

**B3. Detail page mandatory — no inline approve.**

Tapping a row navigates to `/approvals/[id]` detail page. Shows full context (everything in the Telegram DM PLUS the actual photo gallery, full payload preview, handler-run history if retried, audit timeline). Approve/reject only happens here.

Reasoning: damage proposals carry photos that owners MUST look at before approving. Inline approve creates a "tap without thinking" risk on phones. Detail page is one extra tap and forces a beat.

**B4. Mobile 360px — card-per-row + plain empty state.**

Card-per-row, ~120px tall. Card layout:
- Row 1: action verb + amount (right-aligned) — `Damage charge · R450.00`
- Row 2: product badge + booking ref + reporter — `DraggonnB · #B-2026-0142 · hk-04`
- Row 3: 64px thumb strip (up to 4 thumbs, "+N more" overflow chip if > 4) when photos exist
- Row 4: expires-in countdown — `Expires in 23h 12m`
- Tap card → detail page

Empty state: plain text `Nothing pending` + link `View recent history →`. No stats card, no fanfare.

---

## C. Handler execution & failure semantics

**C1. Async via durable job queue.**

Atomic stored proc `approve_request_atomic()` (APPROVAL-10) flips status `pending → approved` and inserts a row into `approval_jobs` table in the same tx. Tx commits instantly. Telegram tap responds within ~200ms with `🟡 Processing…`.

Worker picks up `approval_jobs` rows. v3.1 worker = pg-cron job running every 30s OR an N8N workflow polling the table (plan time decides — both viable). Worker invokes manifest-declared `handler_path` for the action_type, passes payload, captures result, updates `approval_requests.status` to terminal state (`executed` | `failed`), then fires `notify_on_complete` (see C3) and the second-pass Telegram message edit (see A3).

Status state machine:

```
pending → approved → executing → executed
                              ↘ failed (terminal until manual action)
        ↘ rejected (terminal)
        ↘ expired (terminal — auto-rejected by sweep, see D2)
```

Sync execution rejected — PayFast `chargeAdhoc()` is 2-8s, would risk Telegram tap timeout + double-tap. setTimeout/fire-and-forget rejected — Vercel kills cold lambda after response.

**C2. Failure recovery — manual decision, no auto-retry.**

If handler fails (PayFast 5xx, network timeout, business-rule rejection, etc.), spine flips status to `failed` and the worker sends the owner a Telegram DM:

```
⚠ Damage charge failed
Booking #B-2026-0142 · Item: Glassware
Reason: PayFast returned 503 (gateway timeout)
[Retry] [Cancel] [Open manual collection]
```

Tap-Retry → re-enqueues a new `approval_jobs` row with `force_retry=true` (handler_run_count increments — see C4). Tap-Cancel → status flips to `cancelled` (terminal). Tap-Open-manual-collection → action_type-specific URL (e.g. `/dashboard/crm/contacts/[guest_id]/manual-collection`) where ops can record off-platform settlement.

**No auto-retry** in v3.1. Reasoning: PayFast 5xx might be sandbox flakiness OR a real merchant-side issue (insufficient funds, expired token); auto-retrying both blindly creates duplicate-charge risk. Owner-in-the-loop is safer.

**Compensation policy:** if handler partially succeeds (PayFast charge OK but follow-up DB write fails), we do NOT auto-compensate (no auto-refund). Spine writes a row to `ops_reconcile_queue` with payload `{ status: 'db_out_of_sync', resource_id, charge_id, reason }` and Telegram-pings ops chat (`TELEGRAM_OPS_CHAT_ID`) with "DB out of sync, manual reconcile needed". Ops resolves by running a manual SQL fix or refunding via PayFast dashboard.

**C3. Proposer feedback — manifest-declared callback.**

Each action_type's manifest entry declares an optional `notify_on_complete` config:

```ts
notify_on_complete: {
  telegram_chat_id?: string;     // resolved at propose time
  webhook_url?: string;          // signed POST with payload
  email?: string;                // resolved at propose time
}
```

When status reaches terminal (`executed` | `rejected` | `failed` | `expired` | `cancelled`), worker fires whatever channels are declared. For `damage_charge` proposed via `/damage` Telegram intake, the bot replies in the originating chat (`Your damage report was approved — charge succeeded R450.00`). For an N8N-fired proposal, a webhook fires.

Polling rejected — generic spine shouldn't force every proposer to write a poll loop. LISTEN/NOTIFY rejected for v3.1 — adds Postgres consumer infra we don't need yet.

**C4. Idempotency — defense in depth.**

- **Spine layer:** `approval_requests.handler_run_count INTEGER NOT NULL DEFAULT 0`. Worker increments atomically before invoking handler. Subsequent retries require `force_retry=true` (set by tap-Retry in C2). Prevents accidental double-invoke from worker crash + restart.
- **Handler layer:** Each handler is responsible for its own idempotency using domain keys (e.g. `chargeAdhoc()` uses `m_payment_id = DAMAGE-{booking_id}-{incident_id}` per Phase 13-01 finding; `safari_status_change` uses `(safari_id, target_status)` upsert; etc.).
- **`approval_jobs` row:** has unique `(approval_request_id, run_attempt)` constraint. New retry row, not row mutation.

Both layers run. Belt + suspenders.

---

## D. Approval lifecycle & multi-approver rules

**D1. Default expiry per action_type — manifest-driven.**

Each manifest entry declares an `expiry_hours` field, spine stamps `expires_at = now() + expiry_hours` at propose time:

| action_type | default expiry | source |
|---|---|---|
| `draggonnb.damage_charge` | 7 days (168h) | DAMAGE-12 hard cap, app + DB enforced |
| `draggonnb.rate_change` | 24 hours | manifest |
| `draggonnb.social_post` | 48 hours | matches existing v3.0 behavior |
| `trophy.quota_change` | 24 hours | manifest |
| `trophy.safari_status_change` | 24 hours | manifest |
| `trophy.supplier_job_approval` | 72 hours | manifest |

Manifest is authoritative; Phase 14 plans must update each module's manifest file under `lib/modules/{product}/{module}.ts` with the `expiry_hours` value as part of 14.3.

**D2. Post-expiry — auto-reject across the board.**

Cron sweep runs every 5 minutes. For each `pending` row where `expires_at < now()`:
1. UPDATE status `pending → expired`
2. Insert audit row: `{ action: 'auto_expired', reason: 'expiry_hours elapsed' }`
3. Fire `notify_on_complete` so proposer-system knows
4. Telegram-edit the original DM if message_id is stored: strip keyboard, append `⏱ Expired — re-propose if still needed`

No per-action_type variance in v3.1. Keeps the queue clean. If a proposal is still relevant after expiry, the originator re-proposes (cheap).

**D3. Multi-approver — any-admin FCFS.**

When `proposeApproval()` runs, the `assigned_approvers` set is computed as:

```ts
proposed_to: 'all_admins' | 'specific_user'  // column on approval_requests
```

For v3.1, every action_type uses `proposed_to = 'all_admins'`. Spine resolves the set as `SELECT user_id FROM organization_users WHERE organization_id = target_org_id AND role IN ('admin', 'manager')`. All members of this set:
- Receive the Telegram DM (one per user, all carry the same approval_id)
- See it in `My queue` tab on `/approvals`
- Can tap-Approve / tap-Reject — first to act wins

Atomic stored proc `approve_request_atomic()` enforces single-execution (already locked in APPROVAL-10). Second tapper sees `❌ Already actioned by Chris at 14:32 — Approved`.

**Ship `proposed_to` and `assigned_approvers` (uuid[]) columns on day one** even though `proposed_to` is always `'all_admins'` in v3.1. Reason: if v3.2 adds `'specific_user'` mode (or quorum), no second OPS-05 cycle needed. Backward-compat hack avoided by accepting "always-all-admins" today.

**D4. Delegation — nothing in v3.1.**

Owner-on-safari scenario solves itself via D3=any-admin: org adds a backup admin via existing `organization_users` flow, both get the DM, either can approve. Phase 14 ships zero delegation features. If pilot reveals a gap, formal `/delegate @backup until <date>` Telegram command is a v3.2 candidate.

---

## Cross-cutting implementation notes (carried into 14-RESEARCH)

1. **`approval_jobs` table** is new and was not in the Phase 13 manifest layer or REQUIREMENTS.md. Research must determine: pg-cron picker vs N8N picker vs Vercel cron + queue endpoint. Whichever wins ships in 14.3 (NOT 14.1, which is purely additive nullable cols on the existing table).
2. **Telegram message-id storage** for the post-tap edit (A3) and post-expiry edit (D2). Add `telegram_message_id BIGINT NULLABLE` and `telegram_chat_id BIGINT NULLABLE` to `approval_requests` in 14.1 nullable migration. Backfill not required (existing social-post rows can stay NULL).
3. **`expires_at` column** is new on `approval_requests`. Add nullable in 14.1, backfill in 14.2 using `created_at + 48h` for existing social-post rows (matches the 48h v3.0 default), set NOT NULL in 14.3.
4. **`handler_run_count INTEGER NOT NULL DEFAULT 0`** can ship NOT NULL on day one because default handles existing rows.
5. **`rejection_reason TEXT NULLABLE`** + `rejection_reason_code TEXT NULLABLE` (one of the 4 presets or `'other'`). Always nullable.
6. **Cron sweep cadence:** every 5 minutes for expiry sweep. Single pg-cron job. Idempotent.
7. **`/approvals/[id]` photo viewer** for damage cases must verify the signed URL HMAC and stream from Supabase Storage with a fresh signed URL per asset (don't expose raw bucket URLs).
8. **Existing v3.0 social-post flow regression test** is mandatory — 14-research must produce a fixture using a real backfilled row from production-shape data and verify approve/reject still work end-to-end after migration 14.3 lands.

---

## Out of scope for Phase 14 (deferred ideas captured)

- Per-action_type custom reject preset reasons → v3.2 candidate
- Quorum approvals (2-of-3) → v3.2+ (data shape ready via `proposed_to`)
- `/delegate` Telegram command for OOO routing → v3.2 candidate, only if pilot reveals a gap
- Auto-retry policy with backoff → v3.2 candidate, only if manual-retry friction shows up
- Compensation auto-refund for partial-success failures → v3.2+ (ops_reconcile_queue is the v3.1 escape hatch)
- LISTEN/NOTIFY for in-process proposer feedback → v3.2+ if a use case emerges
- Post-Phase-14 cleanup: `approval_requests.post_id` retained nullable in 14.3, DROP in Phase 17 cleanup pass

---

## Open questions for research (NOT for Chris — researcher resolves)

1. Is pg-cron available on Supabase project `psqfgzbjbgqrmjskdavs`? (`SELECT * FROM pg_extension WHERE extname='pg_cron'`). If not, what's the cleanest worker option — Vercel cron + queue endpoint or N8N?
2. Does grammY support inline-keyboard `editMessageReplyMarkup` cleanly via its API? STACK-05 already locks grammY adoption; research validates the edit-message lifecycle for A3.
3. What's the correct shape for `approval_jobs` — single table with `run_attempt` per attempt, or `approval_requests.last_run_at` + retry counter only? Research compares.
4. Backfill SQL for 14.2 — verify zero NULLs after UPDATE on production-shape data (count rows in `approval_requests` today; size will inform whether 14.2 needs batched UPDATE or single statement).
5. Telegram `update_id` log retention — APPROVAL-09 specifies the column. Research determines retention window (30d? 90d?) + cleanup cron.

---

**Next step:** `/gsd:research-phase 14` (researcher consumes this CONTEXT and produces 14-RESEARCH.md) → then `/gsd:plan-phase 14` (planner produces 14-01-PLAN, 14-02-PLAN, 14-03-PLAN matching the locked 3-deploy split).

# lib/approvals — Approval Spine API Contract

## Overview

The approval spine generalizes the `approval_requests` table from social-post-only to product-scoped multi-action approvals. Shipped in Phase 14 (3-deploy OPS-05 split).

## Core API (`spine.ts`)

### `proposeApproval(input: ProposeApprovalInput): Promise<{ id: string }>`

Creates an approval_requests row and sends Telegram DMs to all org admin/manager users who have linked their Telegram via `/auth`.

**Input shape:**
```typescript
{
  product: 'draggonnb' | 'trophy'
  action_type: string          // e.g. 'damage_charge', 'rate_change', 'social_post'
  target_resource_type: string // e.g. 'damage_incident', 'accommodation_unit', 'social_post'
  target_resource_id: string   // UUID or external ID (text)
  target_org_id: string        // organization UUID
  action_payload: Record<string, unknown> | null
  requested_by: string         // user UUID
  expiry_hours?: number        // overrides HANDLER_REGISTRY default
  notify_on_complete?: {       // W1: dedicated column, NOT nested in action_payload
    telegram_chat_id?: string
    webhook_url?: string
    email?: string
  }
  message_lines?: string[]     // Telegram DM body (internal IDs only — APPROVAL-13, no PII)
}
```

**Telegram DM format (APPROVAL-13):** Internal IDs and property labels only. No guest names, phone numbers, card data, or vehicle plates.

### `approveRequest(approvalId, approverUserId): Promise<{ result: string }>`
### `rejectRequest(approvalId, approverUserId, reasonCode, reasonText?): Promise<{ result: string }>`

Both functions:
1. Verify product-scoped permission (D2 enforcement via `verifyProductPermission`)
2. Call `approve_request_atomic` RPC (SECURITY DEFINER, pg_advisory_xact_lock + FOR UPDATE 30s grace)
3. Return `{ result: 'ok' | 'already_actioned' }`

Reason codes: `wrong_amount | not_chargeable | need_more_info | other`

### `verifyApprover(telegramUserId, organizationId, product?)`

Maps Telegram `ctx.from.id` → `user_profiles.telegram_user_id` → `organization_users` admin/manager check.
When `product` is provided, also calls `verifyProductPermission` (D2 enforcement).

Returns `{ userId: string, isAuthorized: boolean }`.

### `verifyProductPermission(userId, orgId, product)`

D2 enforcement: checks that the tenant has the product module active (for Trophy) AND that the user is admin/manager in the org.
- `draggonnb` product: only requires admin/manager role (all tenants have draggonnb access)
- `trophy` product: additionally checks `tenant_modules.is_active WHERE module_key ILIKE 'trophy%'`

### `generatePhotoSignedUrl(approvalId, assetId, expirySeconds?)`

Generates HMAC-signed URL for the photo viewer route.
- Secret: `APPROVAL_PHOTO_HMAC_SECRET` env var
- Payload: `${approvalId}:${assetId}:${exp}` (expiry unix timestamp)
- URL: `/api/approvals/{approvalId}/photos/{assetId}?sig={hex}&exp={unix}`

## Handler Interface

All handlers implement:

```typescript
{
  product: 'draggonnb' | 'trophy'
  action_type: string
  expiry_hours: number
  execute(payload: any): Promise<{ status: 'executed' | 'failed'; detail: string }>
  revert?(payload: any): Promise<{ status: 'executed' | 'failed'; detail: string }>
}
```

Register handlers in `lib/approvals/handler-registry.ts` under the qualified key `'{product}.{action_type}'`.

## Handler Registry (`handler-registry.ts`)

Maps qualified keys to handlers + metadata:

```typescript
HANDLER_REGISTRY['draggonnb.damage_charge'] = {
  handler: damageChargeHandler,
  expiry_hours: 168,
  product: 'draggonnb',
  action_type: 'damage_charge',
}
```

| Qualified Key | Expiry | Status |
|---|---|---|
| `draggonnb.damage_charge` | 168h (7 days) | REAL |
| `draggonnb.rate_change` | 24h | REAL |
| `draggonnb.social_post` | 48h | REAL (preserves v3.0 behavior) |
| `trophy.quota_change` | 24h | STUB (v3.1) |
| `trophy.safari_status_change` | 24h | STUB (v3.1) |
| `trophy.supplier_job_approval` | 72h | STUB (v3.1) |

## notify_on_complete Config (W1)

**ALWAYS read from `ar.notify_on_complete` column directly.** Never read from `ar.action_payload.notify_on_complete`. The column exists because some action_types have no action_payload (null), which would silently skip notification if the config were nested.

## DB Tables (Phase 14)

- `approval_requests` — core table (14-01 schema + 14-02 backfill + 14-03 NOT NULL)
- `approval_jobs` — async handler queue (SKIP LOCKED dequeue via `claim_approval_jobs` RPC)
- `ops_reconcile_queue` — manual reconcile queue for failed reversals (no auto-refund)
- `telegram_update_log` — replay protection for webhook updates (PK on update_id)
- `audit_log` — status-change audit trail (AFTER UPDATE trigger on approval_requests)

## Cron Architecture

| Schedule | Mechanism | Route |
|---|---|---|
| Every 5 min | pg-cron Job 1 (inline SQL) | N/A (DB-side) |
| Every 30s | pg-cron Job 2 (pg_net POST, if pg_net available) | `/api/cron/approval-worker` |
| Every 5 min | Vercel cron (defense-in-depth) | `/api/cron/approval-expiry-sweep` |
| Every 1 min | Vercel cron | `/api/cron/approval-worker` |

pg_net IS available on the current Supabase project (confirmed 2026-05-04).

## Phase 17 Cleanup

- DROP `approval_requests.post_id` (legacy, retained nullable through Phase 14)
- DROP `approval_requests.assigned_to uuid[]` (legacy, superseded by `assigned_approvers`)
- Replace 3 trophy stubs with real handlers when Trophy module ships

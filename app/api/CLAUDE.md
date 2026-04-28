# API Route Build Spec

## Framework

Next.js 14 App Router API routes. Each route is a `route.ts` file exporting HTTP method handlers (`GET`, `POST`, `PUT`, `PATCH`, `DELETE`).

## Auth Pattern

```typescript
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  // user.id is the authenticated user's UUID
}
```

For admin/service-role operations (webhooks, provisioning, background jobs):

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()  // bypasses RLS
```

## Input Validation

Use zod schemas for request body validation:

```typescript
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1).max(255),
  email: z.string().email(),
})

const body = await request.json()
const parsed = schema.safeParse(body)
if (!parsed.success) {
  return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
}
```

## Error Response Format

Always return `{ error: string, details?: any }` with appropriate HTTP status:
- 400: Bad request / validation error
- 401: Not authenticated
- 403: Forbidden / insufficient tier
- 404: Resource not found
- 500: Internal server error

```typescript
return Response.json({ error: 'Not found' }, { status: 404 })
```

## Feature Gating

Check tier access before performing gated operations:

```typescript
import { checkFeatureAccess, checkUsage, incrementUsage } from '@/lib/tier/feature-gate'

// Check if feature is available on user's tier
const access = await checkFeatureAccess(organizationId, 'social_posting')
if (!access.allowed) {
  return Response.json({ error: access.reason }, { status: 403 })
}

// Check usage limits before consuming
const usage = await checkUsage(organizationId, 'ai_generations')
if (!usage.allowed) {
  return Response.json({ error: usage.reason }, { status: 403 })
}

// Increment usage after successful operation
await incrementUsage(organizationId, 'ai_generations')
```

## Webhook Endpoints

For external webhook receivers (PayFast, N8N, WhatsApp, Telegram):
- Validate signatures/tokens before processing
- Use `createAdminClient()` (webhooks have no user session)
- Use `AbortController` with 60s timeout for outbound calls
- Return 200 quickly, process async if needed

```typescript
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 60000)
try {
  await fetch(url, { signal: controller.signal })
} finally {
  clearTimeout(timeout)
}
```

## Security

- Sanitize any user input used in PostgREST `.filter()` / `.or()` / `.ilike()` calls to prevent SQL injection
- Never expose service role keys or internal error details in responses
- Use `createClient()` (not admin) for user-facing routes so RLS applies
- Validate `organization_id` ownership before cross-table operations

## Route File Structure

```
app/api/
  crm/contacts/route.ts          -- GET (list), POST (create)
  crm/contacts/[id]/route.ts     -- GET (detail), PATCH (update), DELETE
  email/send/route.ts             -- POST
  webhooks/payfast/route.ts       -- POST (webhook receiver)
  leads/capture/route.ts          -- POST (public, no auth)
```

### Accommodation API Routes (94 routes total)

Base module (48 routes):
```
app/api/accommodation/
  properties/route.ts, [id]/route.ts
  units/route.ts, [id]/route.ts
  rate-plans/route.ts, [id]/route.ts, rate-plan-prices/...
  bookings/route.ts, [id]/route.ts, booking-segments/..., cancel/...
  guests/route.ts, [id]/route.ts
  payments/route.ts, charge-line-items/...
  tasks/route.ts, issues/route.ts, readiness/route.ts
  (+ deposit-policies, email-templates, comms-timeline, etc.)
```

Automation layer (46 routes):
```
  -- Phase 1: Guest Communications
  automation-rules/route.ts, [id]/route.ts
  message-queue/route.ts, [id]/route.ts
  comms-log/route.ts, [id]/route.ts
  send-message/route.ts, templates/route.ts
  process-queue/route.ts, events/route.ts

  -- Phase 2: Payments
  payment-links/route.ts, [id]/route.ts
  financial-snapshots/route.ts, generate/route.ts
  payment-summary/route.ts, generate-payment-link/route.ts

  -- Phase 3: Staff Ops
  staff/route.ts, [id]/route.ts
  telegram-channels/route.ts, [id]/route.ts
  task-assignments/route.ts, [id]/route.ts
  daily-brief/route.ts, webhooks/telegram-ops/route.ts

  -- Phase 4: AI Agents
  ai-configs/route.ts, [id]/route.ts
  ai/generate-quote/route.ts, ai/concierge/route.ts
  ai/analyze-review/route.ts, ai/pricing-analysis/route.ts
  ai/sessions/route.ts

  -- Phase 5: Costing & Stock
  cost-categories/route.ts, [id]/route.ts
  unit-costs/route.ts, [id]/route.ts
  cost-defaults/route.ts, [id]/route.ts
  stock-items/route.ts, [id]/route.ts
  stock-movements/route.ts, [id]/route.ts
  stock-alerts/route.ts, unit-profitability/route.ts, generate/route.ts
  cost-summary/route.ts, stock-valuation/route.ts
```

All accommodation routes use `getAccommodationAuth()` from `lib/accommodation/api-helpers.ts` which returns `{ supabase, userId, organizationId }` with RLS-scoped client.

Dynamic segments use `[param]` folders. Access via second argument:

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

### Campaign Studio Endpoints (Phase 11)

| Route | Method | Purpose | Auth |
|---|---|---|---|
| /api/campaigns | POST | Create campaign | user (org member) |
| /api/campaigns/[id]/drafts | POST | Generate 7 drafts via CampaignDrafterAgent | user |
| /api/campaigns/[id]/drafts/[draftId]/check-safety | POST | Brand-safety check (Haiku, 20/day budget) | user |
| /api/campaigns/[id]/drafts/[draftId]/regenerate | POST | Regenerate single draft | user |
| /api/campaigns/[id]/approve | POST | Approve campaign (gates 30-day enforcement) | user |
| /api/campaigns/[id]/schedule | POST | Schedule run via pg_cron + pg_net | user |
| /api/campaigns/execute | POST | Internal — fired by pg_net with HMAC | x-internal-hmac |
| /api/campaigns/verify | POST | Internal — fires 5min post-send | x-internal-hmac |
| /api/campaigns/sms-dlr | POST | BulkSMS delivery receipt webhook | webhook (no auth) |
| /api/admin/campaigns/kill-switch | POST | Emergency stop per org | platform_admin |

All routes guard against `tenant_modules.config.campaigns.kill_switch_active = true` (returns 423
when active). Internal routes (`/execute`, `/verify`) validate `x-internal-hmac` header against
`INTERNAL_HMAC_SECRET` env var.

### CRM Easy View Endpoints (Phase 11)

| Route | Method | Purpose |
|---|---|---|
| /api/crm/easy-view/approve | POST | Commit one of the 4 ApproveAction variants; writes 1+ crm_activities rows with source='easy_view' |
| /api/crm/easy-view/dismiss | POST | Hide a card item for 7 days (crm_action_dismissals) |
| /api/crm/ui-mode | POST | Persist user_profiles.ui_mode |
| /api/crm/drafts | POST/DELETE | Upsert/delete entity_drafts (1s debounce, 7d TTL) |

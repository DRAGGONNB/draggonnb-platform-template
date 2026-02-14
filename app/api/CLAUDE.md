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

Dynamic segments use `[param]` folders. Access via second argument:

```typescript
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
}
```

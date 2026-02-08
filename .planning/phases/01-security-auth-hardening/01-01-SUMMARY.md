---
phase: 01-security-auth-hardening
plan: 01
subsystem: security
tags: [rls, supabase, webhooks, admin-client]

dependency_graph:
  requires: []
  provides:
    - Admin Supabase client for RLS-bypassing webhook handlers
    - Comprehensive RLS policy SQL script for all org-scoped tables
    - Webhook handlers updated to use admin client
  affects:
    - 01-02-PLAN (signup flow needs RLS enabled first)
    - 01-03-PLAN (middleware depends on RLS being active)

tech_stack:
  added: []
  patterns:
    - Admin client pattern for webhook handlers
    - Organization-based RLS policies with auth.uid() lookups

file_tracking:
  created:
    - lib/supabase/admin.ts
    - scripts/rls-policies.sql
  modified:
    - app/api/webhooks/payfast/route.ts
    - app/api/email/webhooks/route.ts

decisions:
  - id: admin-client-pattern
    summary: Created dedicated admin client for webhooks instead of service role in server.ts
    rationale: Separation of concerns - admin client explicitly documents security boundary

metrics:
  duration: 33 minutes
  completed: 2026-02-03
---

# Phase 01 Plan 01: RLS Policies and Admin Client Summary

**One-liner:** Admin Supabase client for webhooks + comprehensive RLS SQL script for 21 org-scoped tables

## What Was Built

### 1. Admin Supabase Client (`lib/supabase/admin.ts`)

Created a dedicated admin client that bypasses Row Level Security using the service role key.

**Key features:**
- Uses `@supabase/supabase-js` (not SSR) for synchronous server-side use
- Validates environment variables with descriptive error messages
- Includes JSDoc documentation on when to use (and not use) the admin client
- Disables auth features (autoRefreshToken, persistSession) since webhooks are stateless

**Usage:**
```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient() // synchronous, no await
```

### 2. Updated Webhook Handlers

Both webhook handlers now use the admin client instead of the server client:

- **PayFast ITN webhook** (`app/api/webhooks/payfast/route.ts`):
  - Writes to `organizations`, `subscription_history`, `client_usage_metrics`
  - Validates MD5 signature before any DB access

- **Resend email webhook** (`app/api/email/webhooks/route.ts`):
  - Writes to `email_sends`, `email_campaigns`, `email_unsubscribes`
  - Validates HMAC signature before any DB access

### 3. RLS Policy SQL Script (`scripts/rls-policies.sql`)

Comprehensive 621-line SQL script ready to run in Supabase SQL Editor.

**Tables covered (21 total):**

| Category | Tables | Policies |
|----------|--------|----------|
| Core | organizations, users | Special signup + org-scoped |
| CRM | contacts, companies, deals, activities | Full CRUD |
| Email | email_campaigns, email_templates, email_sequences, email_sends, email_unsubscribes | Full CRUD |
| Social | social_posts, social_accounts, content_queue, content_templates | Full CRUD |
| Billing | client_usage_metrics, subscription_history | Read-only (admin writes) |
| Analytics | analytics_snapshots, platform_metrics | Read-only (admin writes) |
| System | notifications, audit_log | Full CRUD / Insert+Read |

**Special policies:**
- `users`: INSERT checks `id = auth.uid()` (can only create own record during signup)
- `organizations`: INSERT allows authenticated users (needed for signup flow)
- Billing/Analytics tables: No user INSERT/UPDATE/DELETE (protected from tampering)

**Performance:**
- 20 indexes created on `organization_id` columns
- Idempotent (DROP POLICY IF EXISTS pattern)
- Verification query at end to confirm RLS enabled

## Commits

| Hash | Message |
|------|---------|
| `382bdf8` | feat(01-01): add admin Supabase client for webhook handlers |
| `875e439` | feat(01-01): add comprehensive RLS policies SQL script |

## Files Changed

```
Created:
  lib/supabase/admin.ts (40 lines)
  scripts/rls-policies.sql (621 lines)

Modified:
  app/api/webhooks/payfast/route.ts (import + client call)
  app/api/email/webhooks/route.ts (import + client call + type update)
```

## Verification Results

| Check | Status |
|-------|--------|
| `npm run build` passes | PASS |
| `lib/supabase/admin.ts` exports `createAdminClient` | PASS |
| PayFast webhook imports admin client | PASS |
| Email webhook imports admin client | PASS |
| RLS script covers 15+ tables | PASS (21 tables) |
| Users table has `id = auth.uid()` policy | PASS |
| Organizations has signup INSERT policy | PASS |

## Deviations from Plan

None - plan executed exactly as written.

## Next Steps (User Actions Required)

1. **Run RLS script in Supabase:**
   - Go to Supabase Dashboard > SQL Editor > New Query
   - Paste contents of `scripts/rls-policies.sql`
   - Click "Run"
   - Verify output shows 21 tables with RLS enabled

2. **Add service role key to environment:**
   - Get from Supabase Dashboard > Settings > API > service_role (secret)
   - Add to `.env.local`: `SUPABASE_SERVICE_ROLE_KEY=your_key`
   - Add to Vercel environment variables for production

3. **Test webhooks work after RLS:**
   - Use PayFast sandbox to test payment flow
   - Verify organization subscription updates correctly

## Next Phase Readiness

**Ready for 01-02-PLAN (Signup Flow):**
- Admin client exists for any backend operations that need RLS bypass
- RLS policies prepared (will be active after user runs SQL script)
- Webhook handlers won't break when RLS is enabled

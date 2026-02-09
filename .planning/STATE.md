# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.
**Current focus:** SQL migrations and credential configuration.

## Current Position

Phase: ALL 7 PHASES COMPLETE + v2 Evolution + Audit fixes applied
Plan: 16/16 plans complete + v2 features + Phase 4 N8N wiring + audit fixes
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-mvp.vercel.app
Last activity: 2026-02-09 -- Session 21: Audit fixes, pricing page, N8N wiring, Phase 4 completion

Progress: [████████████] 95% COMPLETE (SQL migrations remaining)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key architectural decisions:
- Brownfield project: ~60% of code existed, phases focused on fixing/completing
- Security first: RLS, signup flow, middleware fixed before feature work
- Admin client pattern: `lib/supabase/admin.ts` for webhooks (not service role in server.ts)
- Vitest over Jest (10-20x faster, better ESM support)
- N8N on VPS (Cloud access lost), shared between CML and DraggonnB
- Gitea on VPS as central state store (code on GitHub, state on Gitea)
- Centralized feature gating: `lib/tier/feature-gate.ts` for all usage checks and limits

### Pending Todos

- Run SQL migrations via Supabase (MCP token expired, needs re-auth or manual SQL Editor):
  - `scripts/rls-policies.sql` (CRITICAL - 21 tables)
  - `scripts/migrations/03_ops_control_plane.sql` (ops tables)
  - `scripts/migrations/04_accommodation_module.sql` (accommodation tables)
  - `scripts/migrations/05_increment_usage_rpc.sql` (atomic usage increment)
- Add `SUPABASE_SERVICE_ROLE_KEY` to .env.local and Vercel
- Add `EMAIL_TRACKING_SECRET` to .env.local for HMAC-signed email tokens
- Configure Facebook/LinkedIn OAuth credentials
- Configure Resend API key
- Configure PayFast production merchant credentials

### Blockers/Concerns

- Supabase MCP token expired (needs browser re-auth to apply migrations programmatically)
- Resend API key not yet available (email sending works in dev mode via console logging)
- Facebook App ID/Secret not yet configured (OAuth flow ready, needs credentials)
- LinkedIn Client ID/Secret not yet configured (OAuth flow ready, needs credentials)
- Production PayFast merchant credentials not available (needed before real payments)
- N8N workflows deployed and active on VPS -- content generator tested end-to-end with GPT-4o

## Session Continuity

Last session: 2026-02-09 (Session 21)
Stopped at: All code work complete. Blocked on Supabase MCP re-auth for SQL migrations.
Resume with: Re-auth Supabase MCP, apply 4 SQL migrations, then deploy to Vercel.

### Session 21 Summary (2026-02-09)
**What was accomplished:**
1. Fixed 4 MEDIUM audit issues:
   - Race condition in usage tracking: replaced read-then-write with atomic `checkUsage`/`incrementUsage` from feature-gate.ts
   - Duplicate `getGenerationLimit`: centralized in `lib/tier/feature-gate.ts`, removed 3 duplicate copies
   - Tier type mismatch in telegram webhook: added proper validation before cast
   - `qualifyLead` param mismatch: added null check for `agentResult.result`
2. Fixed pricing page: filtered to show only canonical tiers (core/growth/scale), fixed "Most Popular" badge to growth tier
3. Phase 4 N8N wiring:
   - Created `/api/webhooks/n8n/test` endpoint for webhook connectivity verification
   - Added save-to-queue integration in social content generator UI
   - Created `scripts/migrations/05_increment_usage_rpc.sql` for atomic usage increments
4. All 41 tests still passing, no new TypeScript errors

**Prior session:** Session 20 was cleanup (git, Vercel, GitHub sync).

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.
**Current focus:** Credential configuration only - all code, DB, and security work complete.

## Current Position

Phase: ALL 7 PHASES COMPLETE + v2 Evolution + Audit fixes + DB migrations + Dashboard fixes
Plan: 16/16 plans complete + all migrations applied to Supabase
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-mvp.vercel.app
Last activity: 2026-02-10 -- Session 22: Dashboard/CRM fixes + security hardening
Progress: [████████████] 100% COMPLETE (credentials remaining)

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

- Add `SUPABASE_SERVICE_ROLE_KEY` to .env.local and Vercel
- Add `EMAIL_TRACKING_SECRET` to .env.local for HMAC-signed email tokens
- Configure Facebook/LinkedIn OAuth credentials
- Configure Resend API key
- Configure PayFast production merchant credentials

### Blockers/Concerns

- Resend API key not yet available (email sending works in dev mode via console logging)
- Facebook App ID/Secret not yet configured (OAuth flow ready, needs credentials)
- LinkedIn Client ID/Secret not yet configured (OAuth flow ready, needs credentials)
- Production PayFast merchant credentials not available (needed before real payments)
- N8N workflows deployed and active on VPS -- content generator tested end-to-end with GPT-4o

## Session Continuity

Last session: 2026-02-10 (Session 22)
Stopped at: Dashboard, CRM, and security all fixed. Vercel auto-deployed.
Resume with: Configure credentials (Resend, PayFast production, Facebook/LinkedIn OAuth).

### Session 22 Summary (2026-02-10)
**What was accomplished:**
1. Dashboard fixes:
   - Fixed all queries to use correct DB column names (posts_published, ai_generations_count, stage)
   - Analytics chart now reads from platform_breakdown JSONB column
   - Replaced hardcoded fake usage/trends with real data + context-aware empty states
   - Sidebar now shows real usage stats from client_usage_metrics
   - Upgrade Plan button links to /pricing
2. +New button (header):
   - Made functional with dropdown menu (New Contact, New Deal, New Campaign, Generate Content)
   - Added dynamic breadcrumbs based on current route
3. CRM navigation fixed:
   - Created missing `companies` table in Supabase (CRM page depended on it)
   - Created missing `platform_metrics` table (dashboard top posts depended on it)
4. Security hardening (Supabase):
   - Fixed search_path on 5 functions (capture_lead, provision_client, get_media_stats, increment_media_usage, update_media_updated_at)
   - Converted 3 SECURITY DEFINER views to SECURITY INVOKER (dbe_lead_pipeline, dbe_client_overview, dbe_dashboard_metrics)
   - Security advisor now clean: only INFO-level items remain (intentional service-role-only tables)
5. All 41 tests still passing, no new TypeScript errors

**Prior session:** Session 21 was audit fixes + Supabase migrations.

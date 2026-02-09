# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-02)

**Core value:** A complete, working end-to-end business automation platform that can be cloned and deployed for a new client within 48-72 hours.
**Current focus:** Production cleanup and CRMM refinement.

## Current Position

Phase: ALL 7 PHASES COMPLETE + v2 Evolution Plan implemented
Plan: 16/16 plans complete + v2 features (WhatsApp, Telegram, Content Studio, Accommodation)
Status: DEPLOYED TO PRODUCTION. Live at https://draggonnb-mvp.vercel.app
Last activity: 2026-02-09 -- Session 20: Cleanup (git, Vercel, GitHub, STATE.md trim)

Progress: [████████████] 100% COMPLETE

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
- OpenAI GPT-4o for N8N content generation (user had key available)

### Pending Todos

- User must run `scripts/rls-policies.sql` in Supabase SQL Editor to enable RLS (CRITICAL)
- User must run `scripts/migrations/03_ops_control_plane.sql` (ops tables)
- User must run `scripts/migrations/04_accommodation_module.sql` (accommodation tables)
- User must add `SUPABASE_SERVICE_ROLE_KEY` to .env.local and Vercel
- User should add `EMAIL_TRACKING_SECRET` to .env.local for HMAC-signed email tokens
- Configure Facebook/LinkedIn OAuth credentials
- Fix remaining MEDIUM audit issues (race condition in usage tracking, duplicate getGenerationLimit, tier type mismatch in telegram webhook, qualifyLead param mismatch)

### Blockers/Concerns

- Resend API key not yet available (email sending works in dev mode via console logging)
- Facebook App ID/Secret not yet configured (OAuth flow ready, needs credentials)
- LinkedIn Client ID/Secret not yet configured (OAuth flow ready, needs credentials)
- Production PayFast merchant credentials not available (needed before real payments)
- N8N workflows deployed and active on VPS -- content generator tested end-to-end with GPT-4o

## Session Continuity

Last session: 2026-02-09 (Session 20)
Stopped at: Cleanup session -- git upstream fixed, junk files removed, STATE.md trimmed, GitHub/Vercel synced.
Resume with: CRMM work -- fix MEDIUM audit issues, apply SQL migrations, configure credentials.

### Session 20 Summary (2026-02-09)
**What was accomplished:**
1. Fixed git upstream tracking (origin/master -> origin/main)
2. Cleaned untracked files (.auto-claude/ added to .gitignore, nul deleted)
3. Trimmed STATE.md from 837 lines to ~60 lines (removed sessions 1-18, preserved in git history)
4. Pushed all changes to GitHub (was 1 commit behind)
5. Verified Vercel deployment in sync

**Prior session history:** Available in git history (commit 23c422d and earlier). Sessions 1-19 covered: GSD project setup, 7-phase execution (security, CRM, landing page, N8N automation, social media, client provisioning, testing), v2 evolution plan, security audit, Vercel deployment, VPS/Gitea infrastructure setup.

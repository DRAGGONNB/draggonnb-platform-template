# DraggonnB CRMM - Operating System

## Multi-Client Architecture

This is a template-based SaaS platform. The template repo (`DRAGGONNB/draggonnb-platform-template`) is the single source of truth for all code. Each client gets provisioned with:
- Their own Supabase project (isolated DB + auth)
- GitHub repo (forked from template)
- Vercel deployment (linked to their repo)
- N8N workflows (cloned from template workflows in `n8n/`)

Template changes flow downstream to clients via GitHub repo sync. Client-specific config lives in their repo's `client-config.json`, never in the template.

## Role Definitions

- **Claude Code** = Execution hub. Implements all code changes, provisions clients, manages infrastructure, syncs state. Full access: VPS (SSH), GitHub, Vercel, Supabase, N8N. Everything goes through Claude Code for implementation. No exceptions.
- **OpenClaw** = Advisory/ideation layer. Reads Gitea repos (platform-crmm, ops-hub), STATE.md, error catalogue. Suggests improvements, patterns, proposals. CANNOT execute anything, modify code, or access client Supabase instances.
- **Chris** = Decision maker and approval gate. Bridges ideation to execution. Approves provisioning, reviews proposals.

## File Discipline

- Only update files that are DIRECTLY related to the current task
- State files (STATE.md, PROJECT.md, ROADMAP.md) update ONLY after work is done -- never speculative
- No unnecessary documentation, comments, or README files unless explicitly requested
- No emoji in code or docs unless requested
- Keep state files concise -- facts, not narrative

## Source of Truth

- **Code:** GitHub (`DRAGGONNB/draggonnb-platform-template`, main branch)
- **State/Docs:** Gitea VPS (`draggonnb/platform-crmm` at git.draggonnb.online)
- **Infra:** Gitea VPS (`draggonnb/ops-hub`)
- **Deploy:** Vercel (`draggonnb-mvp`)
- **Workflows:** N8N on VPS (`n8n.srv1114684.hstgr.cloud`)
- **Errors:** `.planning/errors/catalogue.json` (local + synced to Gitea)

## Tech Stack

- Next.js 14.2.33 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (DB + Auth), Resend (email), PayFast (payments), N8N (workflows)
- Vercel (hosting), GitHub (code), Gitea (state docs)

## Session Open Protocol

1. Read `.planning/STATE.md` for current context and last session summary
2. Read `.planning/errors/catalogue.json` for recent errors and patterns
3. Run `git status` to check for uncommitted work from previous session
4. Identify current phase/milestone from STATE.md
5. Report findings before starting new work

## Session Close Protocol

1. Scan session for errors encountered (build failures, runtime errors, API errors)
2. Append new errors to `.planning/errors/catalogue.json` with timestamp, category, root_cause, resolution, and file_path
3. Check for recurring patterns: if 3+ errors share the same root_cause, add a pattern entry to `.planning/errors/patterns.md`
   - If 3+ errors share the same source/category combination, create or update a pattern entry in `.planning/errors/patterns.md` with prevention steps.
4. Update `.planning/STATE.md` with session summary (what was done, blockers, next steps)
5. Push state files to Gitea `draggonnb/platform-crmm` via API (see Gitea Sync Protocol)
6. Include `errors/catalogue.json` in the Gitea sync file list
7. If a Vercel deploy happened during the session, check build logs for errors and capture any failures

## Gitea Sync Protocol

After completing work that changes project state:
1. Update local `.planning/STATE.md` with what was done
2. Push updated state files to Gitea `draggonnb/platform-crmm` via API
3. If infrastructure changed, update `draggonnb/ops-hub/infrastructure.md`
4. Files to sync: STATE.md (always), ROADMAP.md (if changed), PROJECT.md (if changed), errors/catalogue.json (if errors captured)

## VPS Access

- SSH: `ssh hostinger-vps` (key auth, no password)
- Gitea API token: stored in Claude Code memory
- Gitea container IP: resolve via `docker inspect root-gitea-1`
- Gitea host port: 3030 (not 3000)

## Module Manifest

The module manifest template lives at `scripts/provisioning/template/client-config.json`. Provisioning reads this to determine which modules to enable for a client (CRM, email, social, content, accommodation). Each module maps to feature flags, DB tables, and API routes.

## Sub-Directory Build Specs

Three sub-directory CLAUDE.md files provide build specs for extending the platform:

- **`lib/agents/CLAUDE.md`** -- How to build new AI agents (extending BaseAgent, type registration, session storage)
- **`lib/provisioning/CLAUDE.md`** -- How to add provisioning steps (saga pattern, rollback, config validation)
- **`app/api/CLAUDE.md`** -- How to build API routes (auth patterns, validation, error responses, feature gating)

## AI Operations Architecture

| Layer | Tool | Scope | Cost |
|-------|------|-------|------|
| Deterministic ops | N8N workflows (cron, webhooks) | Per-client automation | Near-zero |
| Intelligent ops | Claude API via BaseAgent | Per-call, tracked in agent_sessions | Per-call |
| Build-time AI | Claude Code (this tool) | Per-session, developer time | Per-session |
| Advisory | OpenClaw (read-only Gitea) | Strategic suggestions | Existing |

No autonomous sub-agents per client until 20+ clients with proven patterns. Current agents: LeadQualifierAgent, ProposalGeneratorAgent, ClientOnboardingAgent. Future: Anthropic Agent SDK when scale justifies it.

## Build Reviewer

Invoke the build reviewer agent (`.claude/agents/build-reviewer.md`) after provisioning or before deployment. Runs pre-flight checklist: DB security, deployment health, integration connectivity, feature gating, error catalogue cross-reference.

## GSD Framework

This project uses the GSD framework for planning and execution.
- Plans live in `.planning/phases/`
- Use `/gsd:*` commands for phase management

# DraggonnB CRMM - Project Rules

## Operating Model
- **Claude Code** = Execution layer. Full access to VPS, Gitea, GitHub, Vercel, all infrastructure.
- **OpenClaw** = Ideation layer. Read-only access to Gitea. Cannot modify anything.
- **Chris** = Decision maker. Bridges ideation to execution.
- Everything goes through Claude Code for implementation. No exceptions.

## File Discipline
- Only update files that are DIRECTLY related to the current task
- State files (STATE.md, PROJECT.md, ROADMAP.md) update ONLY after work is done — never speculative
- No unnecessary documentation, comments, or README files unless explicitly requested
- No emoji in code or docs unless requested
- Keep state files concise — facts, not narrative

## Source of Truth
- **Code:** GitHub (`DRAGGONNB/draggonnb-platform-template`, main branch)
- **State/Docs:** Gitea VPS (`draggonnb/platform-crmm` at git.draggonnb.online)
- **Infra:** Gitea VPS (`draggonnb/ops-hub`)
- **Deploy:** Vercel (`draggonnb-mvp`)
- **Workflows:** N8N on VPS (`n8n.srv1114684.hstgr.cloud`)

## Gitea Sync Protocol
After completing work that changes project state:
1. Update local `.planning/STATE.md` with what was done
2. Push updated state files to Gitea `draggonnb/platform-crmm` via API
3. If infrastructure changed, update `draggonnb/ops-hub/infrastructure.md`

## VPS Access
- SSH: `ssh hostinger-vps` (key auth, no password)
- Gitea API token: stored in Claude Code memory
- Gitea container IP: resolve via `docker inspect root-gitea-1`

## Tech Stack
- Next.js 14.2.33 App Router, TypeScript, Tailwind CSS, shadcn/ui
- Supabase (DB + Auth), Resend (email), PayFast (payments), N8N (workflows)
- Vercel (hosting), GitHub (code), Gitea (state docs)

## GSD Framework
This project uses the GSD framework for planning and execution.
- Plans live in `.planning/phases/`
- Use `/gsd:*` commands for phase management

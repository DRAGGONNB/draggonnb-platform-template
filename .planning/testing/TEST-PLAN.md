# DraggonnB Cowork Test Plan

**Created:** 2026-04-15 (Session 49)
**Purpose:** Role × module testing sweep using parallel Claude sub-agents. Run in a fresh session dedicated to testing.

## Why a fresh session

This session created test users, pulled env vars, and added the launch banner + register-interest form. Running 6+ parallel test agents in the same context would exhaust the window. Open a new session, point Claude at this file, and dispatch the agents.

## Prerequisites (already done as of 2026-04-15)

- [x] 3 test users exist in Supabase auth (see credentials below)
- [x] Users linked to tier-representative organizations via `organization_users`
- [x] `.env.local` populated via `vercel env pull` (includes `SUPABASE_SERVICE_ROLE_KEY`)
- [x] Launch banner + Register Interest section live on `/` (commit `f0887bf9`)
- [x] Lead capture API `/api/leads/capture` writes to `leads` + fires N8N + AI qualifier

## Test credentials

**All three passwords:** `DraggonTest2026!`

| Email | Tier | Org | Modules available | Test focus |
|-------|------|-----|-------------------|------------|
| `tester-starter@draggonnb.test` | starter | chrisctserv's Organization (`6414eb77...`) | crm, email, ai_agents, analytics, security_ops | Confirm tier gating blocks social/content_studio/accommodation/restaurant. Core CRM + email flows. |
| `tester-pro@draggonnb.test` | professional | FIGARIE (`dcc325b0...`) | all modules | Full role coverage. Social OAuth, Content Studio autopilot, CRM+Lead Scoring pipeline. |
| `tester-admin@draggonnb.test` | platform_admin | DragoonB (`094a610d...`) | all modules + platform admin views | `/admin/*` pages, tenant provisioning UI, cross-tenant visibility, billing monitor. |

Do NOT test with `chrisctserv@gmail.com` or `draggonnb@gmail.com` — those are real accounts.

## Environments

1. **Local dev** — `http://localhost:3000` via `preview_start`. Full logs via `preview_logs`. Primary test target.
2. **Vercel preview** — `draggonnb-platform-*.vercel.app` (get latest from `mcp__vercel__list_deployments`). Smoke test after local passes.
3. **Production** — `www.draggonnb.online` *(currently broken: Hostinger CDN intercepting www; DNS fix pending)*. Skip until Chris confirms DNS flipped.

## Priority scope (this sweep)

Per Chris's direction:

1. **Public site: Register Interest → lead capture → lead scoring** — launch-critical
2. **Social media module** — autopilot, scheduling, OAuth (Meta creds still blocked, so OAuth will fail — document exactly where)
3. **CRM + Email + Content Studio** — core B2B

Explicitly **out of scope** for this sweep: Accommodation, Restaurant, Elijah. Separate sessions.

## Test matrix (role × slice)

Each row = one sub-agent. 10 agents total. Dispatch in two waves (5 at a time) to keep results manageable.

### Wave 1 — Public + Core (5 agents)

| # | Agent name | Role/User | Flow | Acceptance criteria |
|---|------------|-----------|------|---------------------|
| 1 | `test-register-interest` | Anonymous | Visit `/`, scroll to #register-interest, submit form with valid + invalid inputs | Row appears in `leads` table with `custom_fields.source = 'launch_interest'`; N8N webhook fires (check `N8N_WEBHOOK_*` logs); form shows success panel; duplicate email within 24h returns existing lead id; honeypot submission silently 200s; invalid email returns 400. |
| 2 | `test-lead-scoring` | `tester-pro` | Log in → CRM → Lead Scoring. Verify AI qualification ran on the lead from agent #1. Trigger manual re-score. | Lead visible with `qualification_status` moved from `pending` to a concrete verdict; scoring API responds < 10s; score rationale stored; no 500s. |
| 3 | `test-crm-contacts-starter` | `tester-starter` | Log in → CRM → create contact → create company → create deal → move deal through pipeline → delete. | CRUD works; tier limits respected (if any); no admin-only UI visible. |
| 4 | `test-email-hub` | `tester-pro` | Email Hub: create template → create sequence → draft campaign → send to own email. | Resend API integration works; preview renders; send succeeds OR fails with clear UI error; template editor saves. |
| 5 | `test-tier-gating-starter` | `tester-starter` | Attempt to access `/social`, `/content-studio`, `/accommodation`, `/restaurant` URLs directly. | Either redirected, shown upgrade prompt, OR 403. Never crashes. Sidebar hides these modules. |

### Wave 2 — Advanced (5 agents)

| # | Agent name | Role/User | Flow | Acceptance criteria |
|---|------------|-----------|------|---------------------|
| 6 | `test-social-autopilot` | `tester-pro` | Social Media → Autopilot. Connect account (will fail — Meta creds blocked). Browse scheduled posts. Try to create draft. | Autopilot page loads; OAuth connect button routes correctly (error at Meta side is acceptable — UI should handle); scheduling queue visible; no stack traces. |
| 7 | `test-content-studio` | `tester-pro` | Content Studio: generate post with AI, save draft, schedule, view history. | Anthropic API call returns content; saved draft appears in list; scheduling UI works; generated content respects tier quota. |
| 8 | `test-platform-admin` | `tester-admin` | `/admin/clients`, `/admin/integrations`, tenant provisioning UI, billing monitor. | All admin pages load; can view all 8 orgs; no cross-tenant data leak; provisioning form validates input. |
| 9 | `test-signup-flow` | Anonymous | Hit `/signup`, `/qualify`, follow happy path through tier selection. | Qualify form submits → lead created OR user created; no broken routes; error states graceful. |
| 10 | `test-api-surface` | `tester-pro` (token) | Hit the 12 most-used API routes with curl: `/api/leads`, `/api/crm/contacts`, `/api/email/send`, `/api/social/*`, `/api/content/*`, `/api/ai/*`. | Each returns expected shape; auth enforced; rate limits behave. |

## Agent brief template

Copy this when dispatching each agent via the `Agent` tool:

```
description: "Test [agent #] — [flow name]"
subagent_type: "general-purpose"
prompt: |
  You are a QA tester for the DraggonnB platform.

  TARGET: http://localhost:3000 (dev server already running; use preview_* tools)
  CREDENTIALS: [email from matrix row] / DraggonTest2026!

  FLOW TO TEST:
  [paste flow from matrix row]

  ACCEPTANCE CRITERIA:
  [paste criteria]

  PROCESS:
  1. Log in via preview_fill + preview_click on /login. Verify redirect to dashboard.
  2. Navigate through the flow using preview_click / preview_fill.
  3. After each action: check preview_console_logs for client errors, preview_logs for server errors, preview_snapshot for page content.
  4. Take preview_screenshot at key decision points.
  5. Document findings in .planning/testing/bug-report.md under section "## Agent [N] — [flow name]"
     - One row per issue: | Severity | Area | Description | Reproduction | Screenshot path |
     - Severity: P0 (blocks launch), P1 (broken feature), P2 (degraded UX), P3 (cosmetic)

  DO NOT:
  - Modify code
  - Create extra fixtures beyond what the flow needs
  - Test outside your assigned slice
  - Log out between steps unless the flow requires it

  RETURN: a 3-sentence summary — "Flow: [pass/partial/fail]. Top issue: [one line]. See bug-report.md section [N]."
```

## Bug report format

Single file: `.planning/testing/bug-report.md`

```markdown
# DraggonnB Cowork Bug Report
**Sweep date:** YYYY-MM-DD
**Environment:** local dev / vercel preview / production
**Agents run:** 1, 2, 3, ...

## Summary
- Total issues: N
- P0: N | P1: N | P2: N | P3: N

## Agent 1 — Register Interest flow
| Severity | Area | Description | Reproduction | Screenshot |
|----------|------|-------------|--------------|------------|

## Agent 2 — Lead scoring
...
```

## Known issues to expect (not new bugs)

Don't report these — they're documented elsewhere:

1. **Meta OAuth fails** — Phase 08.1 blocked on `META_APP_ID` / `META_APP_SECRET` (see STATE.md).
2. **WhatsApp API disabled** — Phone Number ID + Access Token missing (STATE.md pending todo).
3. **`www.draggonnb.online` serves Hostinger landing** — DNS misconfiguration on user side, not product (fix in progress).
4. **Twitter/X publish not implemented** — listed in STATE.md pending todos.

## After the sweep

1. Main session reads `bug-report.md`, summarises P0/P1 count
2. Chris decides which to fix before launch vs. backlog
3. Each P0/P1 fix = one commit, one PR section
4. Re-run specific failed agents after fix to confirm

## Execution checklist

- [ ] Fresh session opened, not this one
- [ ] Read this file + STATE.md + errors/catalogue.json
- [ ] Run `preview_start` on `Next.js Dev Server`
- [ ] Verify login works with `tester-pro@draggonnb.test`
- [ ] Create empty `.planning/testing/bug-report.md` with header
- [ ] Dispatch Wave 1 (5 parallel agents)
- [ ] Wait for all 5 to return, review bug-report.md
- [ ] Dispatch Wave 2 (5 parallel agents)
- [ ] Consolidate P0/P1 list, present to Chris
- [ ] Commit bug-report.md to Gitea

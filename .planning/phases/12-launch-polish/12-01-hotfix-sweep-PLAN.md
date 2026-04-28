---
phase: 12
plan_id: 12-01
title: Production hotfix sweep (A1-A7) + AI error surfacing
wave: 1
depends_on: []
files_modified:
  - app/(dashboard)/crm/contacts/new/page.tsx
  - app/(dashboard)/crm/scoring/page.tsx
  - components/dashboard/Sidebar.tsx
  - lib/agents/base-agent.ts
  - lib/agents/CLAUDE.md
  - .planning/errors/catalogue.json
  - .planning/errors/patterns.md
autonomous: true
estimated_loc: 350
estimated_dev_minutes: 180
---

## Objective

Close the 7 hotfix items captured during Chris's 2026-04-28 production test pass. Most are routes that 404 or error pages thrown by the SSR boundary; two (A2 autopilot, A4 brand voice, A7 campaign drafter) were almost certainly caused by Anthropic credits being at $0 during testing — credits are now funded, so these three retry FIRST and get a code fix only if still failing. As a sticky outcome, replace the generic "failed to generate" error string in BaseAgent with credit-depletion / rate-limit / generic-failure branches so the next time billing dries up the error message says so.

Purpose: A real prospect signing up tomorrow shouldn't hit a "Something went wrong" boundary within 5 minutes. Each individual fix is small (5min — 60min); bundling them prevents 7 separate execution sessions for what is genuinely one polish wave.

## must_haves

**Truths (observable):**
- A logged-in user clicks "+ New Contact" on `/crm/contacts` and lands on a working form (no SSR throw, no error boundary).
- A logged-in user clicks "Lead Scoring" in the sidebar and lands on a working `/crm/scoring` page (or sidebar link no longer points at a 404).
- A logged-in user clicks "Social Media" in the sidebar and lands on a working page (either the existing `/settings/social` or a redirect to it; no 404).
- After Anthropic credits are loaded, A2 (Autopilot generate), A4 (Brand voice wizard submit), A7 (Campaign drafter) succeed without code changes — verified by retry before any code is touched.
- If any of A2/A4/A7 still fails after retry, the fix is captured in this plan with root cause documented.
- When a BaseAgent call fails because of insufficient Anthropic credits, the error surfaced to the user reads "AI service is temporarily out of credits — operator has been notified" (or similar specific copy), NOT "failed to generate".
- Sidebar items show the active highlight on sub-routes (e.g. on `/crm/contacts/123`, the `CRM` sidebar item is active; on `/email/campaigns/abc`, the `Email Hub` item is active). Dashboard root (`/`) still requires exact match — does not bleed to all routes.
- Error catalogue has new entries for A1, A5 (and A2/A4/A7 if code-fixed), plus a pattern entry for "AI feature failure → check Anthropic credits FIRST".

**Artifacts:**
- `app/(dashboard)/crm/contacts/new/page.tsx` exists and renders a contact-create form OR diagnostic shows the existing route + the bug it threw, fixed in place.
- `app/(dashboard)/crm/scoring/page.tsx` exists OR sidebar link is updated to point at an existing destination AND user is informed the link previously 404'd.
- `components/dashboard/Sidebar.tsx`: `isActive` computation changed to `pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'))`. Sidebar `Social Media` item href and `Lead Scoring` item href point at routes that exist on disk.
- `lib/agents/base-agent.ts`: error-classification branch added. When `error.status === 401` or message matches `/credit|billing|insufficient/i`, throw a typed `AgentCreditError` whose `.userMessage` is "AI service is temporarily out of credits — operator notified". Other errors keep current behavior. (Surface change only — no retry/circuit-breaker logic added.)
- `lib/agents/CLAUDE.md`: new section "Failure-mode triage — Anthropic billing FIRST" documenting the ops protocol.
- `.planning/errors/catalogue.json`: ≥4 entries (A1, A5, plus credit-depletion pattern, plus any A2/A4/A7 root cause if code-fixed).
- `.planning/errors/patterns.md`: new pattern "AI feature returns generic 'failed to generate' → first action is to check Anthropic billing console at https://console.anthropic.com".

**Key links:**
- Sidebar `pathname.startsWith` change must NOT match `/dashboard` for every route (would highlight Dashboard everywhere). Guard against the trailing-slash exact-match case.
- BaseAgent error wrapper must propagate the typed error through every existing throw path used by Autopilot, Brand Voice, Campaign Drafter, and the 6 v1 agents — verify with grep that no agent swallows the error before classification runs.

## Tasks

<task id="1">
  <title>Diagnose + fix A1 (CRM contact create) and A5 (Lead Scoring)</title>
  <files>
    app/(dashboard)/crm/contacts/new/page.tsx
    app/(dashboard)/crm/scoring/page.tsx
    components/dashboard/Sidebar.tsx
  </files>
  <actions>
    A1 — confirmed via filesystem check that `app/(dashboard)/crm/contacts/new/page.tsx` does NOT exist. The sidebar (or the contacts list page's "+ New Contact" button) routes to `/crm/contacts/new` which falls through to the dashboard error boundary because Next.js 14 treats the segment as the closest dynamic route `[id]` and the page throws when its loader hits no matching record.

    Resolution path:
    1. Grep the codebase for any "new contact" link target — confirm whether the intent is a separate route (`/crm/contacts/new`) or a modal on the list page.
    2. If a route is the right answer (preferred — matches Phase 11 "advanced kanban" UX), create `app/(dashboard)/crm/contacts/new/page.tsx` as a server component that renders a small client form posting to `/api/crm/contacts` (POST already exists per Phase 11 audit). Form fields: first_name, last_name, email, phone, company_name (optional). On success, redirect to `/crm/contacts/[id]`.
    3. If a modal is the right answer, do not create the route — instead update the link target to open the modal on `/crm/contacts`. (Preferred only if a modal already exists; avoid building one in this hotfix plan.)
    4. Verify by logging in as `tester-pro@draggonnb.test` (password `DraggonTest2026!`), clicking + New Contact, completing the form, and confirming a row appears in the contacts list.

    A5 — same pattern: `app/(dashboard)/crm/scoring/page.tsx` does NOT exist. The sidebar item "Lead Scoring · NEW" links to `/crm/scoring` which 404s.

    Resolution path:
    1. Decide between: (a) build a minimal scoring read-only page that reads `crm_engagement_scores` (from Phase 11 N8N workflow) sorted descending, OR (b) remove the sidebar item until a real scoring UI exists.
    2. If (a): create `app/(dashboard)/crm/scoring/page.tsx` as RSC reading `crm_engagement_scores` joined to `contacts` for the active org, render a basic table (Name · Score · Last Activity · Action button → opens contact). Tier-gate via `requireFeature('crm.lead_scoring')` if a feature flag is appropriate; otherwise rely on the existing CRM module gate.
    3. If (b): remove the `Lead Scoring` item from `components/dashboard/Sidebar.tsx` navigation array. (Per CONTEXT.md the sidebar redesign in Wave 3 will rebuild this entirely; either path is acceptable as a hotfix.)

    For A6 (sidebar active state — listed as 5min change): in `components/dashboard/Sidebar.tsx`, replace the line `const isActive = pathname === item.href` with:
    ```typescript
    const isActive =
      item.href === '/dashboard'
        ? pathname === '/dashboard'
        : pathname === item.href || pathname.startsWith(item.href + '/')
    ```
    Verify by navigating to `/crm/contacts/123` and confirming the `CRM` sidebar item shows the active style (not just exact match).

    Mark commit message: `fix(12-01): hotfix A1+A5+A6 — contacts/new route, scoring route or remove, sidebar active-state`.
  </actions>
  <verification>
    - `npm run typecheck` — no errors.
    - Manual: log in, click + New Contact → form renders. Submit valid contact → row created in `/crm/contacts`. (Or, if modal route taken, modal opens.)
    - Manual: navigate to `/crm/scoring` → page renders OR sidebar item is gone.
    - Manual: navigate to `/crm/contacts/[id]` for any contact → CRM sidebar item shows active state. Navigate to `/dashboard` → only Dashboard is active (not CRM, not Email).
    - Add 2 entries to `.planning/errors/catalogue.json`: ERR-A1 (missing-route fall-through), ERR-A5 (sidebar link to non-existent route — pattern: "new sidebar item added without route stub").
  </verification>
</task>

<task id="2">
  <title>Fix A3 (social tab) + retry A2/A4/A7 with funded Anthropic credits</title>
  <files>
    components/dashboard/Sidebar.tsx
  </files>
  <actions>
    A3 — sidebar item `{ name: 'Social Media', href: '/social', ... }` points at `/social` which does NOT exist on disk. The only existing social route is `/settings/social`. Two options:
    1. Change sidebar href from `/social` to `/settings/social`. (1-line fix, fastest.)
    2. Create `/social` route that redirects to `/settings/social`. (More forgiving of bookmarks but unneeded right now.)

    Pick option 1. Update `components/dashboard/Sidebar.tsx` line ~18: change `href: '/social'` → `href: '/settings/social'`. Verify by clicking Social Media in sidebar → lands on `/settings/social`.

    A2 / A4 / A7 — RETRY FIRST, fix only if still failing. Procedure:
    1. Confirm Anthropic credits are loaded (check `https://console.anthropic.com` billing — Chris reported funding completed 2026-04-28).
    2. Log in as `tester-pro@draggonnb.test`. Run each flow:
       - A2: navigate to `/autopilot`, click any "Generate" button (e.g. autopilot daily plan, content suggestion). Capture: success / specific error.
       - A4: navigate to `/settings/brand-voice`, complete URL ingest + 5 questions, click submit. Capture: success / specific error.
       - A7: navigate to `/campaigns/new`, enter intent, select email + LinkedIn channels, click Generate. Capture: success / specific error.
    3. For each that succeeds: log a brief note in this plan's verification section that retry resolved it. Add a single-line entry to `.planning/errors/catalogue.json` referencing the credit-depletion pattern.
    4. For any that still fail: capture stack trace from Vercel runtime logs (`vercel logs` or Vercel dashboard for the deployment). Identify root cause:
       - A2: check `/api/autopilot/*` and `/api/content/*` endpoints; verify `ANTHROPIC_API_KEY` env var present in production.
       - A4: open `app/(dashboard)/settings/brand-voice/page.tsx` submit handler; confirm POST target route exists; check `lib/agents/brand-voice-extractor.ts` (if exists) for runtime issues.
       - A7: open `lib/campaigns/agent/drafter.ts`; check whether the LinkedIn adapter `enabled()` check rejects the channel before the agent call (would explain server-side error rather than client-side grey-out — fix by gating the channel toggle in the UI when the adapter is disabled).
    5. Ship code fixes only for items still failing after retry.

    For each item resolved (whether by retry or code), add an error-catalogue entry. For items code-fixed, the entry's `resolution` field should describe the fix; for retry-resolved, it should reference the credit-depletion pattern.
  </actions>
  <verification>
    - Click Social Media in sidebar → lands on `/settings/social` (not 404).
    - A2/A4/A7 each succeed end-to-end (either by retry OR by fix shipped in this task). Capture screenshot of each successful flow.
    - `.planning/errors/catalogue.json` has ≥3 new entries (A2, A4, A7) with root_cause = either `credit-depletion` or specific code bug.
  </verification>
</task>

<task id="3">
  <title>Improve BaseAgent error surfacing + document Anthropic billing pattern</title>
  <files>
    lib/agents/base-agent.ts
    lib/agents/CLAUDE.md
    .planning/errors/patterns.md
    .planning/errors/catalogue.json
  </files>
  <actions>
    Goal: when the next operator sees "failed to generate" in production, the error message points at the actual cause rather than implying a code bug.

    1. Open `lib/agents/base-agent.ts`. Locate the catch block in `run()` (or equivalent error path that produces the surfaced error). Wrap the Anthropic SDK call in classification logic:
       ```typescript
       try {
         const response = await this.client.messages.create(...)
         return response
       } catch (err: any) {
         // Anthropic SDK throws with err.status (HTTP code) and err.error.type
         if (err?.status === 401 || /insufficient_credit|billing/i.test(err?.message ?? '')) {
           throw new AgentCreditError(
             'AI service is temporarily out of credits — operator has been notified',
             { cause: err }
           )
         }
         if (err?.status === 429) {
           throw new AgentRateLimitError(
             'AI service is rate-limited — please retry in a moment',
             { cause: err }
           )
         }
         throw err
       }
       ```
    2. Define `AgentCreditError` and `AgentRateLimitError` as exported subclasses of Error in the same file (or a new `lib/agents/errors.ts` if one doesn't exist). Each carries a `userMessage` field for the toast layer to use.
    3. Update the agent error-handling at the route level (find the dashboard routes where these errors are caught — grep for `catch.*generate|toast.*failed`). Switch the toast text to use `error.userMessage ?? 'Generation failed — please retry'`.
    4. Update `lib/agents/CLAUDE.md`: add a section titled "Failure-mode triage — check Anthropic billing FIRST". Content:
       - Symptom: AI feature surfaces generic "failed to generate" toast.
       - First action: check https://console.anthropic.com billing console.
       - Second action: check Vercel runtime logs for the error class — `AgentCreditError` confirms billing, `AgentRateLimitError` confirms rate-limit, anything else is a code bug.
    5. Add an entry to `.planning/errors/patterns.md`:
       ```
       ## Pattern: AI feature → check Anthropic billing FIRST
       Trigger: 3+ catalogue errors in `<60d` with category `ai-failure` and root_cause containing `credit|billing`.
       Prevention: BaseAgent throws typed `AgentCreditError` since 12-01; surface error.userMessage in UI toast.
       Operator runbook: 1) Anthropic billing console, 2) Vercel runtime logs, 3) code diagnosis only after billing confirmed funded.
       ```
    6. Add a corresponding catalogue entry summarising the 2026-04-28 incident (Chris's test pass, $0 credits, A2/A4/A7 surface as bugs).
  </actions>
  <verification>
    - `npm run typecheck` clean.
    - Grep `lib/agents/` for `userMessage` — confirm new field referenced from agent call sites.
    - Manually deplete (or simulate) the credit error: temporarily set `ANTHROPIC_API_KEY` to an invalid value in a Supabase branch deployment, run a generate flow, confirm the toast says "AI service is temporarily out of credits" rather than "failed to generate". Restore valid key.
    - `lib/agents/CLAUDE.md` has the new "Failure-mode triage" section.
    - `.planning/errors/patterns.md` has the new pattern entry.
  </verification>
</task>

## Verification

**Phase-level checks (run after all 3 tasks pass):**
- `npm run build` — production build clean.
- `npm test` — all tests pass (no new ones added in this plan; should be no regressions).
- Manual smoke walkthrough as `tester-pro@draggonnb.test`:
  1. Click + New Contact → form works.
  2. Click Lead Scoring → page loads OR sidebar item gone.
  3. Click Social Media → `/settings/social` loads.
  4. `/autopilot` Generate works.
  5. `/settings/brand-voice` wizard submits.
  6. `/campaigns/new` drafts generate.
  7. Navigate around → sidebar active highlight tracks the section.

## Out of scope

- Sidebar redesign (Wave 3, plan 12-06).
- Building a real lead-scoring UI beyond the minimal stub (Wave 3 redesign covers it via the Customers tab).
- Any UX polish beyond making each broken flow load.
- Adding new agent types or features. This plan is purely diagnostic + small fixes.

## REQ-IDs closed

None directly — these are ad-hoc hotfixes captured during Chris's test pass, not original Phase 12 ROADMAP scope. Acceptance bar is "production no longer crashes user flows on day 1 of paying-customer use".

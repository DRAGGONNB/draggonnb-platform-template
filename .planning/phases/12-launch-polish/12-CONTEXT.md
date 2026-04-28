# Phase 12: Launch Polish + UX Redesign — Context

**Gathered:** 2026-04-28 (during Chris's first end-to-end test pass on production)
**Status:** Discovery complete; awaiting research → planning
**Production URL at start of testing:** https://draggonnb.online (commit `8b8e8d9a`)

---

<domain>

## Phase Boundary

Phase 12 has TWO distinct workstreams that should be sequenced separately:

### A. Hotfixes (block first paying customer — fix in next 1-2 sessions)

Four runtime bugs found in Chris's test pass on production. Each crashes a specific user flow, so a real prospect using the platform would hit them within 5 minutes of signup.

### B. Sidebar/IA Redesign (Chris's primary UX feedback)

Information-architecture overhaul of the left navigation. Today the sidebar has ~9 sections / 50+ items — Chris's feedback: *"there's a shit load of stuff on the left hand side... people are gonna get confused, they're gonna think they have to do it themselves."* This is a meaningful redesign, not a quick fix.

### C. Already-planned Phase 12 work

From the original v3.0 milestone scope:
- Promised-vs-delivered audit + landing copy alignment
- Mobile 360px sweep across revenue-critical pages
- BILL-08 (billing reconciliation cron)
- OPS-02 (feature-gate audit cron), OPS-03 (token expiry monitor), OPS-04 (env-health endpoint)
- `organizations.activated_at` migration (CAMP-08 cleanup; today falls back to `created_at`)

### D. Already-on-backlog Phase 12 candidates (raised earlier this session)

- Module-focused landing redesign (the 5+1 modules: Accommodation · Restaurant · Trophy OS · Elijah · CRM+Campaign · Other) — source: `docs/modules/*.md`
- Site AI agent (concierge chatbot for Q&A + lead qualification, replacing the multi-step `/qualify` form)
- Sidebar → DB-driven (read `tenant_modules` to filter — supersedes the hardcoded array in `components/dashboard/Sidebar.tsx`)

</domain>

<test_findings_2026_04_28>

## A. Hotfixes (verbatim findings from Chris's test pass)

### A1. CRM contact creation crashes

**Symptom:** *"under CRM in context, as soon as I want to create a new one, it gives me something wrong page count error while loading. This usually temporary. Try again and back to dashboard."*

The "Something went wrong... This is usually temporary" wording is from `app/(dashboard)/error.tsx` (the page-level error boundary I added in this session) — meaning the new-contact page is throwing during SSR. Likely candidates:
- `app/(dashboard)/crm/contacts/new/page.tsx` route handler
- A Phase 11 Easy-view dependency (form component) hitting an undefined/missing helper
- Same kind of `'use client'` cross-boundary issue as `thresholdFor` was

**Diagnosis priority:** HIGH (blocks core CRM use)
**Likely fix size:** small (< 1 hour once stack is read)

### A2. Autopilot / Content generation fails

**Symptom:** *"every time that I try to generate something with auto content or autopilot, I can fill in the details, and then it gives me a 'self generate email content' and 'failed to generate' error."*

User fills the form, clicks generate, gets error toast. Suggests the BusinessAutopilotAgent (cross-module AI ops) or the content-generator endpoint is failing. Possible causes:
- Brand voice cache missing for the tenant (Phase 10 added voice injection; without a complete profile, agent may throw)
- `client_profiles` row missing for the test orgs
- Anthropic call returning unexpected shape
- Rate-limit / cost-ceiling hit and the UI showing wrong copy

**Diagnosis priority:** HIGH (Content Studio + Autopilot are the platform's main differentiators)
**Likely fix size:** medium (1-3 hours; depends on root cause)

### A3. Social media tab has a small bug

**Symptom:** *"Social media tab — as soon as you click on that, there's a small bug."*

Need user to provide more detail OR I need to log in and click /social and observe. The /social route doesn't exist on disk (only /settings/social), so the sidebar link may 404. Or the legacy /social/* may be a stub.

**Diagnosis priority:** MEDIUM (less foundational than CRM/Autopilot)
**Likely fix size:** small (< 1 hour)

### A4. Brand voice wizard fails to register / generate content

**Symptom:** *"as soon as I try to autopilot or register the brand information, the brand voice also hasn't worked. The page comes out, it doesn't work, it doesn't generate content."*

Phase 10's brand voice wizard (URL ingest + 5 questions + avoid-list). Failure mode unclear from description — page renders but submit fails? URL fetch fails? Anthropic call fails? Need repro.

**Diagnosis priority:** HIGH (brand voice is the foundation for every Phase 10/11 AI agent — if voice wizard doesn't work, autopilot/campaigns/quoter all degrade to generic templates)
**Likely fix size:** medium (1-3 hours)

</test_findings_2026_04_28>

<sidebar_redesign_brief>

## B. Sidebar / Information Architecture Redesign

### What Chris said (paraphrased + direct quotes)

> "Too many options. We need to regroup stuff together. Like the social media section and the [content] media — rather than vertical tabs over the page, [use tabs] across the page to select what you want."

> "We need to rethink because as soon as you open up the platform, there's a shit load of stuff on the left-hand side. And people are gonna get confused, they're gonna think they have to do it themselves."

> "So the leads, marketing, all of that — and the emails related — that should be one thing. Email campaigns should be one tab on the left-hand side, and then the various sections across the page for the user to select whether they want to autopilot it. Or be more involved."

> "We really need to look at the left-hand side... You want to get to the social media marketing, content marketing quickly. With fast results, and then be more in-depth with the choose to. As well as with email marketing — maybe group it together so that it just looks more uniformed and easier to use."

### Translated requirements

1. **Reduce sidebar to ~5-7 top-level sections** (currently 9 sections, ~50 items).
2. **Group by user goal, not by feature module:**
   - "Marketing" supersection: Email + Social + Content + Campaign Studio (currently 4 separate sections — collapse to ONE entry-point)
   - "Customers" supersection: CRM (Easy + Advanced + Lead Scoring) — already cohesive
   - "Operations" supersection per vertical: Accommodation / Restaurant / Elijah — keep separate but each as ONE entry point with horizontal sub-nav
   - "Insights": Analytics + Cost Monitoring
   - "Admin" / "Settings": collapse current 6+6 items
3. **Move sub-pages from sidebar to in-page horizontal tabs.** When you click "Marketing", THE PAGE shows tabs: `Email | Social | Content | Campaigns`. Click "Email" → next-level tabs: `Campaigns | Sequences | Templates | Outreach | Analytics`.
4. **Autopilot vs Manual is a per-feature MODE toggle**, not a navigation item. The Easy/Advanced toggle pattern we built in Phase 11 for CRM is the right precedent — extend it.
5. **Default landing must show "fast results" path.** A first-time user should be one click from "generate me content" or "schedule social posts" without exploring 8 sub-menus first.

### Current sidebar (from `components/dashboard/Sidebar.tsx` — hardcoded array)

```
Main:                Dashboard, Analytics, Autopilot, CRM, Lead Scoring, Email Hub, Social Media   (7 items)
Email Marketing:     Campaigns, Sequences, Templates, Outreach, Analytics                          (5 items)
Campaign Studio:     All Campaigns, New, Runs                                                       (3 items)
Content Studio:      Content Studio, Email Content, Social Content                                  (3 items)
Accommodation:       Overview, Properties, Inquiries, Guests, Bookings, Calendar, Operations,
                     Automation, Stock, Costs, Channels                                             (11 items)
Restaurant:          Dashboard, Menu, Tables, Reservations, Bills, QR Codes, SOPs, Staff,
                     Compliance, Events                                                             (10 items)
Security & Response: Elijah Dashboard, Incidents, Roll Call, Fire Ops, Fire Map, Patrols, Members  (7 items)
Admin:               Business Suite, Clients, Modules, Pricing Matrix, Integrations, Cost Monitoring (6 items)
Settings + Account:  Social Accounts, Pricing                                                       (2 items)
```

**Total: 54 sidebar items across 9 sections.** Confirmed too dense.

### Proposed redesign (DRAFT — for refinement during /gsd:discuss-phase 12)

```
Dashboard                       (1)
Customers                       → CRM Easy/Advanced + Lead Scoring as in-page tabs
Marketing                       → Email · Social · Content · Campaigns as in-page tabs
Operations                      → Accommodation · Restaurant · Elijah as in-page tabs (only ones the tenant has activated)
Insights                        → Analytics + Cost Monitoring as in-page tabs
Settings                        → Account · Brand Voice · Integrations · Team · Billing as in-page tabs
[Admin]                         (only if user.role = platform_admin: Clients, Modules, Pricing Matrix, Cost Monitoring)
```

**Sidebar drops from 54 items to 6-7.** Each top-level click renders a page with horizontal sub-nav for the sub-features. Power users still get full breadth; first-time users see one obvious next step.

### Cross-cutting

- **Sidebar should be DB-driven** (already on backlog as TODO-A): read `tenant_modules` for the active org and only show top-level sections the org has activated. Today the hardcoded array shows everything regardless. Fix this in the same redesign — drop the hardcoded array, render from the `module_registry` + `tenant_modules` join.

- **Autopilot/Manual mode should be a per-feature toggle**, mirroring Phase 11's Easy↔Advanced pattern. Treat it as a UX primitive, not a separate nav item.

</sidebar_redesign_brief>

<decisions>

## Implementation Decisions (locked unless Chris flags otherwise)

### Sequencing

1. **Wave 1 (Hotfixes):** A1 + A2 + A3 + A4 — diagnose + fix in 1-2 sessions. Tactical only, no IA changes. Goal: every test path that crashed today works tomorrow.
2. **Wave 2 (Phase 12 audit + crons):** promised-vs-delivered audit · `organizations.activated_at` migration · BILL-08 + OPS-02..04 reconciliation crons. These are the items already scoped in the original Phase 12 ROADMAP entry — finish them as planned.
3. **Wave 3 (Sidebar/IA redesign):** the bigger redesign. Plan via `/gsd:discuss-phase 12-redesign` (or a sub-phase) so we don't conflate UX with hotfix sessions.
4. **Wave 4 (Module landing redesign + Site AI agent):** if budget allows in v3.0, otherwise v3.1. Was already a backlog candidate.

### What's NOT in Phase 12

- Trophy OS deeper integration into the DraggonnB landing (separate product workstream)
- Easy view rollout to non-CRM modules (v3.1 trigger: ModuleHome stable + 5 paying clients)
- White-label, annual billing, Embedded Finance (v3.1+)

</decisions>

<specifics>

## Specific things to investigate during research/planning

For the hotfixes, before writing plans:

- **A1 (CRM contact create):** open `app/(dashboard)/crm/contacts/new/page.tsx` — does it exist? If yes, what does it import that might be undefined-at-SSR? If no, the issue is the link target.
- **A2 (Autopilot generate):** check Vercel runtime logs for the request; check `/api/autopilot/*` and `/api/content/*` routes; verify Anthropic key is reaching the agent (env var present in production?).
- **A3 (Social tab):** the sidebar links to `/social` — but no `/social` route exists on disk. Probably 404s or hits the closest catch-all. Either build the route or change the sidebar link to `/settings/social` (the only existing social route).
- **A4 (Brand voice):** open `app/(dashboard)/onboarding/brand-voice/page.tsx` — what's the submit handler, what API does it post to, is that API live in production? Check `/api/brand-voice/*` routes.

For the redesign:

- **DB-driven nav:** the sidebar should read `tenant_modules` (filtered by active org) and intersect with `module_registry` (for `min_tier` enforcement). Both tables exist.
- **Tab pattern:** shadcn `Tabs` component already used elsewhere in the codebase — reuse for in-page sub-nav.
- **Permission model:** `Admin` section should only render for `platform_admin` role. Today every admin user sees it. Verify with `userOrg.role === 'admin'` AND `userOrg.organization.subscription_tier === 'platform'` (or whatever the source-of-truth check is).

</specifics>

<deferred>

## Deferred from Phase 12 (captured so they don't get lost)

- **Trophy OS deeper landing-page integration** — separate product workstream. Cross-link only on the DraggonnB landing for now.
- **Easy view on non-CRM modules** — v3.1 trigger.
- **DB-driven module_picker on /pricing** — Phase 10 already partially shipped; refinement deferred.
- **Whatsapp Cloud API config** — external blocker (Meta credentials).
- **Multi-tier approval workflows** — confirmed anti-feature, never building.

</deferred>

---

*Phase: 12-launch-polish*
*Context gathered: 2026-04-28 from Chris's first production test pass*
*Next step: `/gsd:plan-phase 12` to turn this into executable plans, OR run `/gsd:discuss-phase 12` first to refine the IA redesign brief if you want more shaping before planning.*

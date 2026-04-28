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

### A7. Campaign draft generation fails

**Symptom:** *"I started [a campaign for] DragonnB. I can select email and LinkedIn, and then I have to generate. As soon as we generate, the draft generation [fails], 'please try again'."*

User flow: `/dashboard/campaigns/new` → enters intent → selects channels (email + LinkedIn) → clicks Generate → gets "draft generation failed, please try again" error.

This is the `CampaignDrafterAgent` (Phase 11) failing. Likely same root cause as A2/A4 (Anthropic credits were 0 at the time of testing); user added credits but may not have retried this specific flow yet.

If retry-after-credits-fix still fails, secondary suspects:
- LinkedIn adapter `enabled()` check passing without `LINKEDIN_CLIENT_ID` env (should grey-out the channel client-side, not error server-side)
- BrandSafetyAgent post-draft check failing
- A specific channel-shape mismatch in `lib/campaigns/agent/drafter.ts`

**Diagnosis priority:** HIGH (Campaign Studio is the headline Phase 11 feature)
**Likely fix size:** small if credits-only; medium if multi-channel routing bug
**Recommended retry:** before code diagnosis, retry the same flow now that Anthropic credits are loaded.

### A6. Sidebar doesn't highlight the active section on sub-routes

**Symptom:** *"When you're inside the menu, whether on the dashboard or the other modules, there's nothing to show you exactly where you are. At the top you have the [breadcrumbs] — i.e. dashboard, CRM or whatever — but if you're on it on the left-hand side in the menu bar, there's nothing highlighting that section which you're busy on."*

**Root cause:** `components/dashboard/Sidebar.tsx:111`:
```typescript
const isActive = pathname === item.href
```

Strict equality only matches exact URLs. On any sub-route (e.g. `/crm/contacts`, `/crm/deals`, `/email/campaigns/[id]`, `/admin/clients/[id]`), no sidebar item has that exact href, so nothing highlights. Breadcrumbs at the top of the page (in `DashboardHeader.tsx`) work correctly via a separate `breadcrumbMap` — but the sidebar match doesn't share that logic.

**Fix:** change to `pathname === item.href || pathname.startsWith(item.href + '/')`. 2-line change. Should also handle the trivial edge case where `item.href === '/'` (dashboard root) — exact-match only there, otherwise everything would always be "active".

**Diagnosis priority:** LOW (UX-only, not blocking)
**Likely fix size:** trivial (5 minutes)
**Note:** the broader sidebar IA redesign (section B of this Phase 12) will retain whatever active-state pattern we land on here, so fixing now isn't waste.

### A5. Lead Scoring crashes

**Symptom:** *"Leads scoring also bombs. Page [not] found and evidence as well."* (voice-transcribed; likely "page not found" with developer/console evidence)

The sidebar links to `/crm/scoring` (item: "Lead Scoring · NEW"). Possible causes:
- Route not actually built — sidebar link 404s
- Route exists but throws (similar pattern to A1 contact-create — likely same kind of `'use client'` boundary issue or missing page.tsx)

**Diagnosis priority:** MEDIUM (Lead Scoring is marked NEW in sidebar — newer feature, less foundational than contact create)
**Likely fix size:** small-medium (depends on whether the route exists or needs to be built)

### Update — Anthropic API credits funded 2026-04-28

Chris reported: *"I've just added credits to Anthropic's API. That was not, didn't have any funds there."*

This is almost certainly the **single root cause for both A2 and A4**. Every `BaseAgent.run()` call (autopilot, content generation, brand voice extraction, campaign drafter, quoter, concierge, etc.) calls the Anthropic API directly. A 402-style insufficient-credits error throws from the SDK and our agents surface it as a generic "failed to generate" toast rather than something specific.

**Recommended retry order before fixing:**
1. Retry A2 (Autopilot generate) — likely works now
2. Retry A4 (Brand voice wizard submit) — likely works now
3. If either still fails after credits are loaded, treat as a code bug and proceed with diagnosis.

This finding belongs in the **error catalogue** as a pattern: when an AI feature fails with "failed to generate", the operator should check Anthropic billing FIRST before assuming code bug. Add to `lib/agents/CLAUDE.md` and to the build reviewer's checklist.

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

### Proposed redesign (DRAFT — refined 2026-04-28 with Chris's clearer mental model)

Chris's later feedback narrowed this further:

> *"Perhaps we can move Content Studio to the top of the menu bar. On Contents, [you do] the social media sections of it. On Email content, you go then into Email campaigns and sequences and outreach depending on how inclusive or hands-on the user wants to be."*

So **Content Studio becomes the primary marketing entry point** — it's the "I want to do marketing" door. Inside it: tabs for Social / Email / Campaigns / Content. Each tab has its own sub-mode (autopilot vs hands-on).

He also flagged a Campaign Studio sidebar redundancy I introduced earlier (commit `e7e168d0`):

> *"On the menu section, I can go to All Campaigns, which will then just launch a new campaign, and then we've got another one on the menu for New Campaign. We don't need all of that in the menu bar."*

Right — the 3 Campaign Studio sidebar items (All Campaigns / New / Runs) collapse to ONE item; the page handles "new vs existing vs runs" itself.

**Refined sidebar (target: 6 top-level items, ~58 → 6):**

```
1. Dashboard                    (single click — overview)
2. Content Studio               → tabs: Social · Email Campaigns · Email Sequences · Outreach · Drafts · Analytics
                                  (each with its own autopilot/manual mode toggle)
3. Customers                    → tabs: CRM Easy · Advanced kanban · Lead Scoring · Drafts
4. Operations                   → tabs ONLY for activated modules:
                                  · Accommodation (if tenant_modules has it)
                                  · Restaurant + Events
                                  · Elijah / Security
5. Insights                     → tabs: Analytics · Cost Monitoring (admin) · Reports
6. Settings                     → tabs: Account · Brand Voice · Team · Integrations · Billing · Social Accounts
[Admin]                         (only platform_admin: Clients · Modules · Pricing Matrix · Cost Monitoring)
```

**Net change: 58 sidebar items → 6 (or 7 with Admin).**

Chris's reasoning, captured directly:
> *"The idea that we're selling that it's quite easy to adopt or use the service looks different as soon as you open up and you see the dashboard or the menus."*

The redesign is a **commercial requirement, not just polish** — the platform's "easy to use" pitch is undermined by the current 54-item sidebar. First impression matters for prospect conversion.

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

### NEW (added 2026-04-28 from Chris's feedback after viewing dashboard mockup)

**Wave 4 — Floating AI helper + Telegram-mobile approval flow**

Architectural decision locked: **mobile is Telegram**, not native iOS/Android. Smart Dashboard (web/desktop) + Floating AI helper (web context-aware) + Telegram bot (mobile/push approval) covers the full surface area for SA owner-operators (lodge owners, restaurant managers, etc.).

**Floating AI helper component** — added to specific pages where context-aware AI assistance earns its keep:

| Page | Helper purpose |
|---|---|
| Brand voice wizard | Explain inputs, sample responses, suggest URL to ingest |
| Campaign Studio composer | Suggest channel mix; explain why a channel is disabled |
| Accommodation rates settings | Translate natural-language requests to structured rule changes ("drop weekend rate 15%") |
| Cost monitoring / Insights | Explain spikes in plain English; recommend actions |
| Empty states (CRM, campaigns, etc.) | "Show me how to start" — guides first-time use |
| Onboarding follow-up | Post-wizard reinforcement |

**Skip helper on**: CRM Easy view (already self-explaining), tables/lists, already-AI-driven flows (Campaign Studio Autopilot — no meta-AI on top).

**Telegram approval flow pattern** (generalised from Chris's rates example):

1. User on web asks floating AI: "drop weekend rate by 15% for next 3 months"
2. AI translates to structured proposal, surfaces in-page
3. User clicks "Send for approval" → owner Telegram message with inline-keyboard Approve/Decline/See-impact
4. Owner taps Approve in Telegram → web auto-refreshes, change committed, audit row written
5. Telegram replies with confirmation + impact summary (revenue forecast delta, etc.)

**Existing infrastructure already in place** (no rebuild needed):
- `lib/accommodation/telegram/ops-bot.ts` — message sending
- `lib/campaigns/telegram-alerts.ts` — alert pattern from Phase 11
- BaseAgent + brand-voice — language layer
- Audit rows in `crm_activities` (Phase 11) for change tracking

**Missing for full implementation**:
- Floating helper React component (`components/ai-helper/FloatingHelper.tsx`) — small button bottom-right, slide-up sheet with conversation
- New table: `approval_requests` — `requested_by_user_id`, `approver_user_id`, `proposed_changes` JSONB, `status`, `decided_at`, `telegram_message_id` for callback wiring
- Telegram inline-keyboard handler — webhook route to receive Approve/Decline button taps and commit pending change
- Per-page helper context provider — component wraps page, injects current entity context (e.g., on /accommodation/rates the helper knows the active property)

**Estimated scope**: 1 plan (~700 LOC + 2 migrations + 1 N8N workflow for Telegram callback handling). Sequenced AFTER sidebar redesign (Wave 3) so the helper's UI lives in the redesigned page chrome, not the legacy sidebar.

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

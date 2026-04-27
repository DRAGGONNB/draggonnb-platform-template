# Phase 11: Easy/Advanced CRM PoC + Campaign Studio Decision Gate — Context

**Gathered:** 2026-04-27
**Status:** Ready for research → planning

<domain>
## Phase Boundary

Validate the `<ModuleHome>` + Easy/Advanced UX pattern on **CRM only** (one module). Build Campaign Studio as a credential-gated scaffold (email + SMS active in v3.0; FB/IG/LinkedIn channels wired but dark until Meta credentials land). At phase entry, the decision gate **resolves to OPTION B** — Campaign Studio scaffold ships in v3.0.

**In scope (this phase):**
- UX-01..07 — `<ModuleHome>`, Easy/Advanced views on CRM, ui_mode persistence, view-desync prevention via `entity_drafts`
- CAMP-01..08 — Campaign Studio scaffold; email + SMS channels live; FB/IG/LinkedIn adapters built but credential-gated

**Explicitly out of scope (deferred):**
- Easy View rollout to other 5 modules (Email Sequences, Accommodation, Restaurant, Agents, Analytics) — v3.1 trigger: ModuleHome stable + 5+ paying clients
- Promised-vs-delivered alignment + final QA gate before first paying client → **Phase 12** (Launch Polish)
- Meta App / OAuth credential acquisition → external blocker; tracked separately, does not block this phase
- Embedded Finance, Finance-AI, White-label, Annual billing, Events add-on → v3.1+

**First-paying-client target:** *relaxed* — quality bar (Phase 12 promised-vs-delivered alignment + full QA) takes priority over a date.

</domain>

<decisions>
## Implementation Decisions

### Campaign Studio — decision gate resolution

- **Decision: OPTION B — scaffold + email/SMS active in v3.0; social channels wired but credential-gated.**
- All 8 CAMP requirements (CAMP-01..08) are IN scope for Phase 11.
- Email + SMS channels: fully functional in v3.0 (use existing Resend integration; SMS gateway TBD by researcher — likely SMS Portal or Clickatell for SA market).
- Social channels (FB/IG/LinkedIn): adapter classes built and tested with mocked responses. Activation gated on `META_APP_ID` / `LINKEDIN_CLIENT_ID` env presence. When env present, OAuth flow (Phase 08.2 already shipped) lights up per-tenant page connections at runtime — zero code change needed at unblock-time.
- Campaign UI shows ALL channels in the studio with a "Connect Facebook to enable" inline CTA on greyed-out channels; user can compose drafts that include social posts even before Meta unlocks.
- Brand voice (Phase 10) is the system block for every draft — no separate voice config in Campaign Studio.
- CAMP-08 (first 30 days = draft-then-review, never auto-publish) is a HARD constraint: no first-tenant accidentally posts to live customer audience.

### CRM Easy view — the 3 AI action cards

| Card | Source signals | Architecture |
|---|---|---|
| **Today's follow-ups** | Combination: time-based (last contact > N days, deal stage active) + manual user "follow up" flag + nightly engagement score (email opens/clicks within last 7d) | SQL on page load (deterministic parts) + reads cached `crm_action_suggestions` row from nightly N8N (engagement score) |
| **Stale deals** | Per-stage threshold, configurable per tenant in `tenant_modules.config` (e.g. `crm.stale_thresholds_days = {discovery: 7, qualification: 14, negotiation: 21, closing: 7}`). Sensible defaults seeded on tenant create. | Pure SQL on page load |
| **Hot leads** | Combination: deal value above tier threshold + recent inbound intent signal (qualifier filled, call requested) + AI-scored intent from interaction history | Nightly N8N agent writes scored leads to `crm_action_suggestions` table; page reads cached results (≤24h stale acceptable) |

- **Architectural rule (UX-05):** Pages NEVER make per-render BaseAgent calls. Reads only from `crm_action_suggestions` (nightly cache) + plain SQL.
- Each card shows ≤5 items; "View all in Advanced" link below each card if there are more.
- Each card has a primary approve action (see "Approve in one click" below) and a "dismiss" (hides for 7d, written to `crm_action_dismissals`).

### Approve-in-one-click action — what each card's button actually does

| Card | Approve action | UI |
|---|---|---|
| **Today's follow-up** | **Dual-button per row: "Send email" + "Snooze 1d"**. "Send email" composes brand-voice templated email, fires after 5s undo toast, marks contacted, logs `crm_activities` row with `source='easy_view'`. "Snooze 1d" hides item for 24h. | Two side-by-side buttons in the row |
| **Stale deal** | **"Decide" button → modal with 3 options: engage / archive / snooze**. "Engage" sends brand-voice re-engagement email (with 5s undo). "Archive" moves deal to `Lost — stale` stage with audit. "Snooze" hides for 7d. | Single button on row → opens small modal |
| **Hot lead** | **All three at once (with 5s undo gate): brand-voice high-value pitch email + advance deal to next pipeline stage + create "call within 24h" task assigned to deal owner**. | Single "Engage" button on row |

- **5-second undo toast** on every action that sends email/SMS or moves deal stage. Toast position: bottom-center (mobile-safe). After timeout, action commits.
- **Audit:** every Easy-view action writes ONE row to `crm_activities` (existing table) with new `source = 'easy_view'` field + `action_type` enum — no new `easy_view_actions` table. Cleaner reporting, Advanced kanban already shows `crm_activities`.
- **Email/SMS send timing:** queued during the 5s undo window; fires immediately after timeout. No "drafts to review" inbox in v3.0 — brand voice trust is built up via the campaign-studio approval screen, not on every CRM action.
- **Brand-voice template fallback:** if a tenant has not yet completed the brand voice wizard, Easy view falls back to a generic professional templated email and shows a banner "Complete your brand voice in 30 seconds for personalised outreach →".

### Easy ↔ Advanced toggle — wording, position, defaults

| Decision | Lock |
|---|---|
| Wording | Literal "**Easy view →**" / "**Advanced view →**" |
| Desktop position | Floating button bottom-right (16px from edges, 56×40px) |
| Mobile (360px) position | Floating pill bottom-right, 16px from right edge, **80px from bottom** to clear iOS Safari toolbar + Android nav bar; preserves "Easy" / "Advanced" text label (no icon-only) |
| Default — `admin` (org owner) | **easy** |
| Default — `manager` | **advanced** |
| Default — `user` (staff) | **easy** |
| Default — `client` | N/A (no dashboard access) |
| Override | User can toggle anytime; choice persists in `user_profiles.ui_mode` |
| First-run empty state | Welcome cards explain each action card; each has a seed-data CTA ("Add your first deal", "Import contacts from CSV") |

### Drafts + view-desync (UX-06, UX-07)

| Decision | Lock |
|---|---|
| Storage model | (b) **Stash to `entity_drafts` on view switch** — drafts are user-owned, commit when ready. Drafts are read on view-load and merged with table state for display. |
| Autosave debounce | **1 second** |
| Autosave trigger | Every keystroke (debounced) — covers tab-close mid-typing |
| Drafts TTL | **7 days**, nightly cleanup cron deletes drafts older than 7d |
| Conflict resolution | **Last-write-wins with soft warning banner**: if a second tab loads a draft that was modified elsewhere within last 60s, banner reads "This draft was edited from another tab" with a "Reload" button. No hard-block. |
| Draft commit moment | When user clicks "Save" on the form OR successfully saves via the kanban inline edit — draft row is deleted post-commit |

### Claude's Discretion

The following I'll resolve during research/planning:
- SMS gateway choice (SMS Portal vs Clickatell vs Twilio for SA market) — researcher to evaluate ZAR cost, deliverability, AT&T-style SMSC reliability
- Exact `crm_action_suggestions` table schema (columns, RLS policies, refresh frequency)
- Nightly N8N workflow trigger time (likely 02:00 SAST, off-peak)
- Engagement-score formula weights (open=1pt, click=3pt, reply=10pt or similar — researcher to benchmark)
- Per-stage stale-threshold seed defaults — researcher to propose, planner to seed
- Floating toggle button micro-copy when destination is identical to current view (defensive)
- Skeleton loading states + empty-state illustrations
- Telegram operator alert wording for any Campaign Studio failure (existing TELEGRAM_OPS_CHAT_ID channel)
- Where/how the per-tenant Campaign kill switch lives in admin UI (likely `/admin/clients/[id]/campaigns/kill-switch`)

</decisions>

<specifics>
## Specific Ideas

- **"The studio is there, social channels activate when Meta approves your account"** — this is the user-facing line for any prospect asking about social posting before Meta unblocks. Greyed-out social tiles in Campaign Studio with inline CTA reinforce this messaging.
- **Owner-operator mental model:** the SA SME lodge owner sees Easy view with 3 "what should I do today" cards; the ops manager prefers Advanced kanban. This is why the role-default mapping has admin→easy and manager→advanced.
- **Brand voice trust bridge:** Phase 10 shipped brand voice infrastructure. Phase 11 Easy view is the first surface where a customer sees AI-generated outbound text fire from one click — the 5s undo + brand-voice fallback banner are the trust scaffolds.
- **Owner sentiment captured 2026-04-27:** "let's make sure all promised vs delivered is working optimally before we take on any paying customers" — this drives Phase 12 scope (separate from Phase 11) but informs the *quality bar* on Phase 11 deliverables: no half-shipped Easy view, Campaign Studio scaffold has working email/SMS end-to-end before phase exit.

</specifics>

<deferred>
## Deferred Ideas (captured here so they don't get lost)

These came up during discussion but belong elsewhere:

- **Promised-vs-delivered audit + landing-copy alignment + full QA gate** → **Phase 12** (Launch Polish). Specifically: (1) replace fabricated SocialProof stats in `components/landing/sections.tsx:267-271` with forward-looking or real-data copy; (2) add seat-count gating (`billing_plans.limits.seats`) OR remove "2/5 users included" from pricing copy; (3) tone down "AI agents 24/7 autonomously" wording on landing page module showcase. Will become a Phase 12 first plan: `12-00-promised-vs-delivered-alignment`.
- **Easy View on Email Sequences / Accommodation / Restaurant / Agents / Analytics** → v3.1 trigger: ModuleHome pattern stable on CRM + 5+ paying clients onboarded. Not in v3.0.
- **"Drafts to review" inbox for AI-generated outbound** (alternative to 5s undo) → consider in v3.1 if first-tenant feedback says they want a hold-and-review queue instead of timed undo.
- **Per-tenant Campaign kill switch testing under simulated load** → v3.1; v3.0 ships kill switch but doesn't load-test it.
- **Multi-tier approval workflows on Easy view** (Hootsuite-style 3-layer approval) → confirmed anti-feature in REQUIREMENTS.md "Out of Scope". Not deferred — explicitly never.
- **Additional N8N workflows beyond Campaign Studio + the existing 3 onboarding-day workflows** → only as triggered by real client signal post-launch.
- **Meta credential acquisition + App Review submission** → tracked under "Production Credentials & Integrations" milestone in ROADMAP, separate from this phase. Phase 11 Campaign Studio scaffold runs without it.

</deferred>

---

*Phase: 11-easy-advanced-crm-campaign-decision*
*Context gathered: 2026-04-27*

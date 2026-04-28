---
phase: 12
plan_id: 12-07
title: Smart-landing dashboard rebuild (Today's Quick Action card + cross-module suggestions)
wave: 3
depends_on: [12-06]
files_modified:
  - app/(dashboard)/dashboard/page.tsx
  - app/(dashboard)/dashboard/_components/quick-action-card.tsx
  - app/(dashboard)/dashboard/_components/today-summary.tsx
  - app/(dashboard)/dashboard/_components/recent-activity.tsx
  - lib/dashboard/quick-action-suggestions.ts
  - supabase/migrations/54_dashboard_action_suggestions_table.sql
  - n8n/wf-dashboard-action-suggestions.json
  - __tests__/lib/dashboard/quick-action-suggestions.test.ts
autonomous: false
estimated_loc: 600
estimated_dev_minutes: 240
---

## Objective

Rebuild `/dashboard` as a smart-landing surface that surfaces ONE high-confidence "Today's Quick Action" derived from tenant state across modules, plus a today summary (key metrics) and recent-activity feed. Pattern parallels Phase 11's `crm_action_suggestions` (nightly N8N → DB cache → in-page card) but spans modules — read-on-render compute is too expensive for a high-traffic page.

Per CONTEXT.md `decisions` block: "Smart-landing dashboard rebuild: top 'Today's Quick Action' card derived from tenant state (similar to Phase 11 crm_action_suggestions pattern but cross-module — read from a new dashboard_action_suggestions table OR compute on-render)". Decision: nightly N8N fills `dashboard_action_suggestions`; page reads cached row at render. Same architecture as Phase 11.

Includes human-verify checkpoint at the end since this is the post-login first impression.

## must_haves

**Truths:**
- A user lands on `/dashboard` post-login and sees a top "Today's Quick Action" card with concrete copy (e.g. "3 hot leads need follow-up — open CRM" with a single CTA button).
- The card's content is derived from cross-module signals: stale CRM deals, expiring tokens, undelivered campaigns, low-stock accommodation rooms, etc.
- If no suggestion is appropriate, the card shows a friendly "all good" empty state — never blank.
- Below the card, a today-summary row shows 4 KPIs scoped to the user's activated modules (e.g. CRM-only orgs see contact count + deal pipeline value + outstanding follow-ups + this-week activity; Accommodation-active orgs add occupancy %).
- A recent-activity feed shows the last 10 cross-module activities (campaigns sent, deals moved, bookings created, incidents logged).
- A nightly N8N workflow at 04:30 SAST refreshes `dashboard_action_suggestions` for every active org.
- Page renders in <800ms TTFB at the Vercel edge (verified via DevTools network tab).

**Artifacts:**
- `supabase/migrations/54_dashboard_action_suggestions_table.sql` — new table mirroring `crm_action_suggestions` but org-scoped (one row per org per cron run).
- `lib/dashboard/quick-action-suggestions.ts` — pure functions to compute candidate suggestions from raw tenant data.
- `app/(dashboard)/dashboard/page.tsx` — RSC reading cached suggestion + today summary + activity feed.
- `app/(dashboard)/dashboard/_components/quick-action-card.tsx` — client island for the action button.
- `app/(dashboard)/dashboard/_components/today-summary.tsx` — RSC.
- `app/(dashboard)/dashboard/_components/recent-activity.tsx` — RSC.
- `n8n/wf-dashboard-action-suggestions.json` — N8N workflow.

**Key links:**
- Suggestions table is org-scoped, NOT user-scoped. All users in the org see the same Today's Quick Action.
- The compute function takes raw tenant signals and outputs a ranked list; the cron picks the top one and stores it. Page renders the stored choice (no compute on render).
- KPI tiles must respect activated modules — CRM-only orgs do NOT see "occupancy %"; the today-summary component reads `tenant_modules` to decide which tiles to render.
- Empty states must be designed first — many fresh tenants have NO data and the page must never look broken.

## Tasks

<task id="1">
  <title>Migration 54 + suggestion compute lib + N8N workflow</title>
  <files>
    supabase/migrations/54_dashboard_action_suggestions_table.sql
    lib/dashboard/quick-action-suggestions.ts
    n8n/wf-dashboard-action-suggestions.json
    __tests__/lib/dashboard/quick-action-suggestions.test.ts
  </files>
  <actions>
    1. Migration `54_dashboard_action_suggestions_table.sql`:
       ```sql
       CREATE TABLE IF NOT EXISTS dashboard_action_suggestions (
         organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
         action_type TEXT NOT NULL,
         priority INTEGER NOT NULL,
         headline TEXT NOT NULL,
         body TEXT,
         cta_label TEXT NOT NULL,
         cta_href TEXT NOT NULL,
         metadata JSONB NOT NULL DEFAULT '{}',
         refreshed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
       );
       ALTER TABLE dashboard_action_suggestions ENABLE ROW LEVEL SECURITY;
       ALTER TABLE dashboard_action_suggestions FORCE ROW LEVEL SECURITY;
       CREATE POLICY "org_read" ON dashboard_action_suggestions
         FOR SELECT TO authenticated
         USING (organization_id = get_user_org_id());
       CREATE POLICY "service_role_full" ON dashboard_action_suggestions
         FOR ALL TO service_role USING (true);
       ```

    2. `lib/dashboard/quick-action-suggestions.ts` — pure functions:
       ```typescript
       export interface SuggestionCandidate {
         type: string  // 'crm.hot_leads' | 'campaigns.draft_pending' | 'token.expiring' | ...
         priority: number  // higher = better
         headline: string
         body: string
         ctaLabel: string
         ctaHref: string
         metadata: Record<string, unknown>
       }

       // Each compute fn takes already-fetched tenant data and returns 0+ candidates.
       export function computeCrmHotLeads(suggestions: ActionSuggestion[]): SuggestionCandidate[] { ... }
       export function computeExpiringTokens(tokens: Token[]): SuggestionCandidate[] { ... }
       export function computeDraftCampaigns(drafts: CampaignDraft[]): SuggestionCandidate[] { ... }
       export function computeLowStockRooms(rooms: Room[]): SuggestionCandidate[] { ... }

       // Top-level: aggregate, sort by priority, return top 1.
       export function pickTopSuggestion(candidates: SuggestionCandidate[]): SuggestionCandidate | null {
         if (candidates.length === 0) return null
         return candidates.sort((a, b) => b.priority - a.priority)[0]
       }
       ```
       Priority scoring rough rubric: token expiring <3 days = 100; hot leads ≥5 = 80; draft campaign pending approval = 70; low-stock accommodation = 60; everything else 30-50.

    3. N8N workflow `wf-dashboard-action-suggestions.json`:
       - Cron: 04:30 SAST (after Phase 11's CRM workflow at 02:00 — it depends on those scores).
       - Steps: For each active org, fetch (a) crm_action_suggestions hot leads, (b) oauth_tokens expiring within 7d, (c) draft campaigns awaiting approval, (d) low-stock accommodation. Run `pickTopSuggestion`. Upsert into `dashboard_action_suggestions` (one row per org).

    4. Tests in `__tests__/lib/dashboard/quick-action-suggestions.test.ts`:
       - case: 0 candidates → null.
       - case: hot leads (priority 80) + expiring token (priority 100) → returns expiring token.
       - case: only low-stock room → returns it.
       - case: candidate metadata roundtrips through priority sort intact.
  </actions>
  <verification>
    - `npm test -- quick-action-suggestions` passes ≥4 cases.
    - Migration 54 applies to live Supabase.
    - N8N workflow file is valid JSON; manual import + activate procedure documented in workflow comments.
  </verification>
</task>

<task id="2">
  <title>Build /dashboard page + 3 components</title>
  <files>
    app/(dashboard)/dashboard/page.tsx
    app/(dashboard)/dashboard/_components/quick-action-card.tsx
    app/(dashboard)/dashboard/_components/today-summary.tsx
    app/(dashboard)/dashboard/_components/recent-activity.tsx
  </files>
  <actions>
    1. `app/(dashboard)/dashboard/page.tsx` — RSC. Fetches:
       - `dashboard_action_suggestions` row for active org (single).
       - Today summary signals: contact count, deal pipeline total, this-week activity count, plus module-specific tiles based on `tenant_modules`.
       - Last 10 rows from `crm_activities` UNION `campaign_runs` UNION `accommodation.bookings` (or whichever activity tables apply per active modules) ordered by created_at DESC.

    Layout (mockup-faithful per `docs/redesign/full-experience-mockup.html`):
    ```
    [Greeting: Hi {firstName} — here's your day]
    [QuickActionCard — full-width hero card]
    [TodaySummary — 4-tile grid]
    [RecentActivity — list]
    ```

    2. `quick-action-card.tsx` — client component (needs onClick analytics):
       ```typescript
       'use client'
       export function QuickActionCard({ suggestion }: { suggestion: SuggestionRow | null }) {
         if (!suggestion) {
           return <EmptyStateCard headline="You're all caught up" body="No action needed today. Browse around." />
         }
         return (
           <Card>
             <CardHeader>
               <CardTitle>{suggestion.headline}</CardTitle>
               <CardDescription>{suggestion.body}</CardDescription>
             </CardHeader>
             <CardContent>
               <Button asChild onClick={() => trackClick(suggestion.action_type)}>
                 <Link href={suggestion.cta_href}>{suggestion.cta_label}</Link>
               </Button>
             </CardContent>
           </Card>
         )
       }
       ```

    3. `today-summary.tsx` — RSC. Receives modules + raw counts as props. Renders 4 tiles based on activated modules (filter logic in the parent page; this component is dumb).

    4. `recent-activity.tsx` — RSC. Receives activity rows. Renders timeline-style list with icon + relative time + actor + event description.

    Use the brand palette (charcoal-900 + crimson-500 + light backgrounds) per Phase 10 redesign.
  </actions>
  <verification>
    - Manual: log in as `tester-pro@draggonnb.test` → dashboard renders with all 3 sections.
    - Empty-state path: log in as a brand-new test org with no data → quick-action card shows "all caught up" empty state, today summary shows zeros, activity feed shows "no activity yet".
    - Network panel: dashboard page loads in <800ms TTFB.
    - `npm run typecheck` clean.
  </verification>
</task>

<task id="3" type="checkpoint:human-verify" gate="blocking">
  <what-built>Smart-landing /dashboard with Today's Quick Action card (cross-module derived), today-summary KPI tiles (module-aware), recent-activity feed, and N8N workflow that nightly populates the suggestions table.</what-built>
  <how-to-verify>
    1. Run the N8N workflow manually once via N8N UI to populate `dashboard_action_suggestions` for the test orgs.
    2. Log in as `tester-pro@draggonnb.test`. Confirm /dashboard shows ALL 3 sections.
    3. Confirm quick-action-card has concrete copy (not placeholder).
    4. Click the CTA button → routes to the target page. Suggestion type analytics fires (capture in network tab).
    5. Confirm today-summary tiles match the user's activated modules (e.g. they have CRM + Accommodation → see CRM tiles + occupancy tile, no restaurant tile).
    6. Confirm recent-activity shows recent rows from crm_activities OR campaign_runs OR bookings.
    7. Log in as `tester-starter@draggonnb.test` (CRM-only) → confirm today-summary only shows CRM-relevant tiles, no accommodation/restaurant.
    Type "approved" if all 7 pass.
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

## Verification

- `npm run build` clean.
- `npm test` passes (no regressions).
- N8N workflow imported + activated; first run produced rows in `dashboard_action_suggestions`.
- Manual: dashboard page loads <800ms.

## Out of scope

- Mobile dashboard layout — covered in 12-05 mobile sweep (with sidebar gap deferred to 12-06).
- "AI greeting" / Anthropic-generated personalised intro line — deferred to v3.1; static template ("Hi {firstName} — here's your day") is fine.
- Drag-and-drop tile reordering. Tiles are fixed-order based on activated modules.
- Per-user dismissal of the quick-action card — possible follow-on, but launch keeps the card always visible.

## REQ-IDs closed

None directly. This is part of the Wave 3 redesign net-new scope. Phase 12 ROADMAP did not include a dashboard rebuild; CONTEXT.md captures it as part of Chris's testing feedback.

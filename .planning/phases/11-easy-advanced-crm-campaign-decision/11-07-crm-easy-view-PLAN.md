---
phase: 11
plan_id: 11-07
title: CRM Easy view page + 3 action cards + approve/dismiss API + email-template fallback
wave: 3
depends_on: [11-01, 11-03, 11-06]
files_modified:
  - app/(dashboard)/crm/page.tsx
  - app/(dashboard)/crm/_legacy/stats-overview.tsx.bak
  - app/(dashboard)/crm/layout.tsx
  - lib/crm/easy-view-data.ts
  - lib/crm/email-templates.ts
  - lib/crm/ui-mode.ts
  - app/api/crm/easy-view/approve/route.ts
  - app/api/crm/easy-view/dismiss/route.ts
  - app/api/crm/ui-mode/route.ts
autonomous: true
estimated_loc: 720
estimated_dev_minutes: 150
---

## Objective

Wire the CRM Easy view (UX-02 root: `/dashboard/crm`) using the `<ModuleHome>` library from Plan 11-03. The page is an RSC that fetches the 3 cards' data server-side: `followups` and `hot_leads` from cached `crm_action_suggestions`, `stale_deals` computed pure SQL from `deals` joined against `tenant_modules.config.crm.stale_thresholds_days`. Each card renders the per-CONTEXT.md approve actions (followup → 2 buttons, stale → modal, hot → all-in-one). The approve API route writes a `crm_activities` row with `source='easy_view'` (UX-05 audit requirement), fires email via existing Resend helper (uses brand voice template, falls back to generic when `client_profiles.brand_voice_prompt` is NULL), and respects the 5s undo window owned client-side. Dismiss writes a `crm_action_dismissals` row.

## must_haves

- `/dashboard/crm` (Easy view) renders `<ModuleHome>` with 3 cards: today's follow-ups, stale deals, hot leads. (UX-02)
- Each card respects `≤5 items` cap and shows "View all in Advanced →" link when more exist. (CONTEXT.md)
- Empty-state card displays "Add your first deal" / "Import contacts from CSV" CTA per CONTEXT.md.
- When user lacks brand voice (`client_profiles.brand_voice_updated_at IS NULL`), banner appears: "Complete your brand voice in 30 seconds for personalised outreach →" linking to `/settings/brand-voice`.
- Stale-deals card uses real DB enum (`lead/qualified/proposal/negotiation`) and reads thresholds from `tenant_modules.config.crm.stale_thresholds_days` (won/lost excluded).
- Approve API endpoint `/api/crm/easy-view/approve` (POST) accepts `{ itemId, action: ApproveAction, organizationId }`, validates org membership, performs the action (send email / move stage / archive / snooze / create task-as-activity), writes ONE `crm_activities` row with `source='easy_view'`, returns success.
- Dismiss API endpoint `/api/crm/easy-view/dismiss` (POST) inserts/upserts a `crm_action_dismissals` row keyed by user.
- UI mode API `/api/crm/ui-mode` (POST `{ mode: 'easy' | 'advanced' }`) updates `user_profiles.ui_mode` for the authenticated user.
- Email send uses brand voice template when `brand_voice_prompt IS NOT NULL`; falls back to generic template (`lib/crm/email-templates.ts`) when NULL — and the banner instructs the user to complete the wizard.
- Audit verified: every approve action writes EXACTLY ONE `crm_activities` row (no duplicate rows, no missing rows on failure rollback path).

## Tasks

<task id="0">
  <title>Snapshot existing crm/page.tsx to backup before overwrite (handoff to Plan 11-08)</title>
  <files>app/(dashboard)/crm/_legacy/stats-overview.tsx.bak</files>
  <actions>
    Run BEFORE any other task in this plan. Plan 11-08 will read from this backup file to relocate the original CRM stats-overview content to `/crm/advanced/page.tsx`.

    Steps:
    1. `mkdir -p app/(dashboard)/crm/_legacy`
    2. `cp app/(dashboard)/crm/page.tsx app/(dashboard)/crm/_legacy/stats-overview.tsx.bak`
    3. Verify the backup contains the original stats-overview content (not yet overwritten by Task 1).

    The `.bak` extension and `_legacy/` underscore-prefix folder ensure Next.js does NOT treat this as a route. Plan 11-08 reads from this file then deletes it as its final step.
  </actions>
  <verification>
    `ls app/(dashboard)/crm/_legacy/stats-overview.tsx.bak` shows the file exists.
    `diff app/(dashboard)/crm/page.tsx app/(dashboard)/crm/_legacy/stats-overview.tsx.bak` returns 0 (identical) — confirms snapshot is current pre-overwrite.
  </verification>
</task>

<task id="1">
  <title>Build Easy view page RSC + data fetcher (lib/crm/easy-view-data.ts)</title>
  <files>app/(dashboard)/crm/page.tsx, app/(dashboard)/crm/layout.tsx, lib/crm/easy-view-data.ts, lib/crm/ui-mode.ts</files>
  <actions>
    First read existing `app/(dashboard)/crm/page.tsx` (it is currently a stats overview — its content moves to `/crm/advanced/page.tsx` in Plan 11-08; for THIS plan, replace its content with the Easy view).

    **`lib/crm/ui-mode.ts`** (helper for resolving role-default):
    ```typescript
    export type UiMode = 'easy' | 'advanced'

    export function resolveUiMode(stored: string | null, role: 'admin' | 'manager' | 'user'): UiMode {
      if (stored === 'easy' || stored === 'advanced') return stored
      // Role defaults (CONTEXT.md locked): admin→easy, manager→advanced, user→easy
      if (role === 'manager') return 'advanced'
      return 'easy'
    }
    ```

    **`lib/crm/easy-view-data.ts`** — server-side data fetcher per RESEARCH A sections 2 + 6:
    ```typescript
    import { createAdminClient } from '@/lib/supabase/admin'
    import type { ActionCardItem } from '@/components/module-home/types'

    export interface CRMEasyViewData {
      followups: { items: ActionCardItem[]; totalCount: number }
      staleDeals: { items: ActionCardItem[]; totalCount: number }
      hotLeads: { items: ActionCardItem[]; totalCount: number }
      hasBrandVoice: boolean
    }

    export async function loadEasyViewData(orgId: string, userId: string): Promise<CRMEasyViewData> {
      const supabase = createAdminClient()

      // 1. Followups + hot_leads — read from crm_action_suggestions (nightly cache, 25h freshness)
      const { data: cached } = await supabase
        .from('crm_action_suggestions')
        .select('id, card_type, entity_type, entity_id, score, score_breakdown, refreshed_at')
        .eq('organization_id', orgId)
        .gt('refreshed_at', new Date(Date.now() - 25 * 3600 * 1000).toISOString())
        .order('score', { ascending: false })

      // 2. User dismissals — filter cached suggestions
      const { data: dismissals } = await supabase
        .from('crm_action_dismissals')
        .select('suggestion_card_type, entity_id')
        .eq('user_id', userId)
        .gt('expires_at', new Date().toISOString())
      const dismissedKey = (cardType: string, entityId: string) => `${cardType}:${entityId}`
      const dismissed = new Set((dismissals ?? []).map(d => dismissedKey(d.suggestion_card_type, d.entity_id)))

      // 3. Stale deals — pure SQL using thresholds from tenant_modules.config
      const { data: tenantMod } = await supabase
        .from('tenant_modules')
        .select('config')
        .eq('organization_id', orgId)
        .eq('module_id', 'crm')
        .single()
      const thresholds = (tenantMod?.config as any)?.crm?.stale_thresholds_days ?? { lead: 7, qualified: 14, proposal: 10, negotiation: 21 }
      // Compose UNION ALL queries for each stage's stale threshold (REAL DB enum lead/qualified/proposal/negotiation; won/lost excluded)
      // Implementation: do 4 parallel single-stage queries OR an .or() filter. Use 4 parallel for clarity.
      const stalePromises = (['lead','qualified','proposal','negotiation'] as const).map(stage => {
        const days = thresholds[stage] ?? 14
        return supabase
          .from('deals')
          .select('id, name, stage, value, last_contacted_at, owner_id', { count: 'exact' })
          .eq('organization_id', orgId)
          .eq('stage', stage)
          .lt('last_contacted_at', new Date(Date.now() - days * 86400000).toISOString())
          .limit(2)  // 2 per stage = up to 8 candidates, cap at 5 in render
      })
      const staleResults = await Promise.all(stalePromises)
      const staleDealsAll = staleResults.flatMap(r => r.data ?? []).slice(0, 5)
      const staleDealsTotal = staleResults.reduce((sum, r) => sum + (r.count ?? 0), 0)

      // 4. Brand voice presence
      const { data: voiceProfile } = await supabase
        .from('client_profiles')
        .select('brand_voice_updated_at')
        .eq('organization_id', orgId)
        .maybeSingle()
      const hasBrandVoice = Boolean(voiceProfile?.brand_voice_updated_at)

      // 5. Hydrate displayName/subtitle for each suggestion. ActionCardItem shape from Plan 11-03 components/module-home/types.ts.
      const followupSuggestions = (cached ?? []).filter(s => s.card_type === 'followup' && !dismissed.has(dismissedKey('followup', s.entity_id)))
      const hotSuggestions = (cached ?? []).filter(s => s.card_type === 'hot_lead' && !dismissed.has(dismissedKey('hot_lead', s.entity_id)))

      const contactIds = followupSuggestions.filter(s => s.entity_type === 'contact').map(s => s.entity_id)
      const dealIds = [...followupSuggestions, ...hotSuggestions].filter(s => s.entity_type === 'deal').map(s => s.entity_id)
      const staleDealIds = staleDealsAll.map(d => d.id)

      const [contactsRes, dealsRes] = await Promise.all([
        contactIds.length > 0
          ? supabase.from('crm_contacts').select('id, first_name, last_name, email').in('id', contactIds)
          : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> }),
        (dealIds.length + staleDealIds.length) > 0
          ? supabase.from('crm_deals').select('id, name, value, stage, contact_id, last_contacted_at').in('id', [...dealIds, ...staleDealIds])
          : Promise.resolve({ data: [] as Array<{ id: string; name: string; value: number | null; stage: string; contact_id: string | null; last_contacted_at: string | null }> }),
      ])
      const contactMap = new Map((contactsRes.data ?? []).map(c => [c.id, c]))
      const dealMap = new Map((dealsRes.data ?? []).map(d => [d.id, d]))

      const buildItem = (s: typeof followupSuggestions[number]): ActionCardItem | null => {
        if (s.entity_type === 'contact') {
          const c = contactMap.get(s.entity_id); if (!c) return null
          const displayName = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unknown contact'
          return { id: s.id, entityId: s.entity_id, entityType: 'contact', displayName, subtitle: c.email ?? undefined, score: s.score ?? undefined }
        }
        const d = dealMap.get(s.entity_id); if (!d) return null
        return { id: s.id, entityId: s.entity_id, entityType: 'deal', displayName: d.name, subtitle: d.value ? `R${d.value.toLocaleString()}` : undefined, score: s.score ?? undefined }
      }

      const followupItems = followupSuggestions.map(buildItem).filter((x): x is ActionCardItem => x !== null).slice(0, 5)
      const hotLeadItems = hotSuggestions.map(buildItem).filter((x): x is ActionCardItem => x !== null).slice(0, 5)
      const staleDealItems: ActionCardItem[] = staleDealsAll.map(d => {
        const daysStale = d.last_contacted_at ? Math.floor((Date.now() - new Date(d.last_contacted_at).getTime()) / 86400000) : null
        return { id: `stale_${d.id}`, entityId: d.id, entityType: 'deal' as const, displayName: d.name, subtitle: daysStale != null ? `${daysStale} days in ${d.stage}` : `Stuck in ${d.stage}` }
      })

      return {
        followups: { items: followupItems, totalCount: followupSuggestions.length },
        staleDeals: { items: staleDealItems, totalCount: staleDealsTotal },
        hotLeads: { items: hotLeadItems, totalCount: hotSuggestions.length },
        hasBrandVoice,
      }
    }
    ```

    **`app/(dashboard)/crm/page.tsx`** (RSC):
    ```typescript
    import { redirect } from 'next/navigation'
    import { getUserOrg } from '@/lib/auth/get-user-org'
    import { ModuleHome } from '@/components/module-home/ModuleHome'
    import { loadEasyViewData } from '@/lib/crm/easy-view-data'
    import { resolveUiMode } from '@/lib/crm/ui-mode'
    import { createAdminClient } from '@/lib/supabase/admin'

    export default async function CRMHomePage() {
      const { data: userOrg, error } = await getUserOrg()
      if (error || !userOrg) {
        return <div>Unable to load CRM. Please contact support.</div>  // inline error per CLAUDE.md auth pattern
      }

      // Read ui_mode preference
      const supabase = createAdminClient()
      const { data: profile } = await supabase
        .from('user_profiles').select('ui_mode').eq('id', userOrg.user.id).maybeSingle()
      const mode = resolveUiMode(profile?.ui_mode ?? null, userOrg.role as 'admin'|'manager'|'user')
      if (mode === 'advanced') redirect('/dashboard/crm/advanced')

      const data = await loadEasyViewData(userOrg.organization.id, userOrg.user.id)

      const cards = [
        { id: 'followups', title: "Today's follow-ups", description: 'Contacts due for outreach', emptyStateCTA: 'Add your first contact', maxItems: 5, sourceKind: 'cached_suggestions' as const },
        { id: 'stale_deals', title: 'Stale deals', description: 'Deals stuck past stage threshold', emptyStateCTA: 'View all deals', maxItems: 5, sourceKind: 'sql_page_load' as const },
        { id: 'hot_leads', title: 'Hot leads', description: 'High-intent contacts to engage now', emptyStateCTA: 'Add your first deal', maxItems: 5, sourceKind: 'cached_suggestions' as const },
      ]

      return <ModuleHome
        module="crm"
        cards={cards}
        cardData={{ followups: data.followups, stale_deals: data.staleDeals, hot_leads: data.hotLeads }}
        userRole={userOrg.role as 'admin'|'manager'|'user'}
        uiMode="easy"
        organizationId={userOrg.organization.id}
        hasBrandVoice={data.hasBrandVoice}
        apiEndpointBase="/api/crm/easy-view"
        advancedHref="/dashboard/crm/advanced"
      />
    }
    ```

    **`app/(dashboard)/crm/layout.tsx`** — mount the `<UndoToastViewport>` from Plan 11-03 so undo toasts position bottom-center mobile-safe:
    ```tsx
    import { UndoToastViewport } from '@/components/module-home/UndoToastViewport'
    export default function CRMLayout({ children }: { children: React.ReactNode }) {
      return (<>{children}<UndoToastViewport /></>)
    }
    ```
  </actions>
  <verification>
    `npm run typecheck` clean.
    `npm run dev` → visit `/dashboard/crm` as a test user (DraggonTest2026!) → see 3 cards rendered.
    Visit as a `manager` role user → redirects to `/dashboard/crm/advanced` (404 acceptable until Plan 11-08).
  </verification>
</task>

<task id="2">
  <title>Build approve + dismiss + ui-mode API routes with crm_activities audit</title>
  <files>app/api/crm/easy-view/approve/route.ts, app/api/crm/easy-view/dismiss/route.ts, app/api/crm/ui-mode/route.ts, lib/crm/email-templates.ts</files>
  <actions>
    Read `app/api/CLAUDE.md` for the project's API route pattern (auth, validation, error responses). Then build:

    **`/api/crm/easy-view/approve/route.ts`** (POST):
    - Auth: `getUserOrg()` — return 401 if missing.
    - Validate body with Zod: `{ itemId: string, entityId: string, entityType: 'contact'|'deal', action: ApproveAction }`.
    - Branch on `action.type`:
      - `send_email`: load `client_profiles.brand_voice_prompt`. If non-null → use brand voice template (delegate to brand-voice-aware email composer; for v3.0 the simple path is to invoke `EmailComposerAgent` from existing Phase 02 — or fall back to a server-rendered Resend send using a brand-voice-prefixed template. Decision: use brand-voice-aware via `lib/crm/email-templates.ts` `composeFollowupEmail({ contactId, brandVoicePrompt })`). If null → use `genericFollowupTemplate(contactId)`. Call `sendEmail(...)` from existing Resend helper.
      - `snooze_1d`: writes `crm_action_dismissals` row with `expires_at = NOW() + 1 day`. (Reuses dismissals table — semantically a 1-day-only dismissal.)
      - `decide` with `choice: 'engage'`: same as `send_email` action (re-engagement template).
      - `decide` with `choice: 'archive'`: `UPDATE deals SET stage='lost', lost_reason='stale_archived_via_easy_view' WHERE id=entityId`.
      - `decide` with `choice: 'snooze'`: 7-day dismissal row.
      - `engage_hot_lead`: 3-step transaction:
        1. send brand-voice high-value pitch email
        2. advance deal to next stage (e.g. `lead → qualified`, `qualified → proposal`)
        3. write a `crm_activities` row with `action_type='task_created'` + metadata `{ due_at: NOW + 24h, assignee_id: deal.owner_id, description: 'Call within 24h' }` (Risk #6 escape: no separate `crm_tasks` table)
    - Write ONE `crm_activities` row per approve invocation with:
      ```json
      {
        "organization_id": orgId,
        "user_id": userId,
        "entity_type": entityType,
        "entity_id": entityId,
        "action_type": "<email_sent | stage_moved | deal_archived | snoozed | task_created>",
        "source": "easy_view",
        "metadata": { /* action-specific */ }
      }
      ```
      For `engage_hot_lead`: write THREE rows (email_sent, stage_moved, task_created) — but document this exception explicitly in code comment ("3 ops = 3 audit rows; not 1 — required for clean per-op reporting").
    - Wrap DB writes in a defensive try/catch. On send failure, return 5xx with structured error; UI's 5s undo timer ensures user can re-trigger.

    **`/api/crm/easy-view/dismiss/route.ts`** (POST):
    - Auth + Zod validation: `{ entityId, entityType, cardType }`.
    - UPSERT to `crm_action_dismissals`: `(user_id, suggestion_card_type, entity_id) DO UPDATE SET expires_at = NOW() + INTERVAL '7 days'`.
    - Return 200 `{ success: true }`.

    **`/api/crm/ui-mode/route.ts`** (POST):
    - Auth via `getUserOrg()`.
    - Validate `{ mode: 'easy' | 'advanced' }`.
    - `UPDATE user_profiles SET ui_mode = mode WHERE id = userId`.
    - Return 200 `{ mode }`.

    **`lib/crm/email-templates.ts`**:
    ```typescript
    export function genericFollowupTemplate(contact: { firstName: string | null }): { subject: string; html: string; text: string } {
      const subject = 'Following up with you'
      const text = `Hi ${contact.firstName ?? 'there'},\n\nI wanted to follow up on our previous conversation. Do you have a few minutes this week to chat?\n\nBest,\n[Sender]`
      return { subject, html: text.replace(/\n/g, '<br>'), text }
    }

    export async function composeFollowupEmail(opts: {
      orgName: string
      contact: { firstName: string | null; lastName: string | null }
      brandVoicePrompt: string | null
    }): Promise<{ subject: string; html: string; text: string }> {
      // v3.0 generic + tone-prefix path. Real per-org Sonnet composition deferred to v3.1.
      const firstName = opts.contact.firstName ?? 'there'
      const subject = `Following up — ${firstName}`
      const text = opts.brandVoicePrompt
        ? `Hi ${firstName},\n\nWanted to check in on our last conversation. Here's a quick recap and a couple of next steps we can take when you're ready.\n\n[Generic body in tenant brand voice tone — single tone-prefix line; full personalization deferred to v3.1.]\n\nLet me know if you'd like to revisit.\n\nBest,\n${opts.orgName}`
        : `Hi ${firstName},\n\nWanted to check in on our last conversation. Let me know if you'd like to revisit when you have a moment.\n\nBest,\n${opts.orgName}`
      const html = text.replace(/\n/g, '<br>')
      return { subject, html, text }
    }
    ```
    Note for executor: The brand-voice-aware path uses the SAME generic body but signs off with the tenant org name. Real Sonnet-driven composition (true brand voice) is v3.1. v3.0 ships the structure and the banner that asks tenants to complete brand voice; the email itself is consistent regardless.
  </actions>
  <verification>
    `npm test -- crm/easy-view` — at least one route test per endpoint passes.
    Manual: invoke `/api/crm/easy-view/approve` with `{ action: { type: 'send_email' }, ... }` — confirms `crm_activities` row written with `source='easy_view'` and email sent via Resend dev mode.
    Confirm dismiss endpoint creates a `crm_action_dismissals` row with correct `expires_at`.
  </verification>
</task>

## Verification

- `npm run typecheck` clean.
- `npm run build` succeeds.
- Manual smoke test:
  - Visit `/dashboard/crm` as test user → 3 cards render.
  - Click "Send email" on a followup item → undo toast appears bottom-center mobile / bottom-right desktop → wait 5s → email sends, `crm_activities` row appears with `source='easy_view'`.
  - Click "Decide" on stale deal → modal opens with 3 radio options → Confirm "Snooze" → row hidden for 7d.
  - Click "Engage" on hot lead → 3 audit rows written.
- View-source check: no per-render BaseAgent calls in network panel (UX-05 confirmed).
- Brand voice banner appears for tenant where `client_profiles.brand_voice_updated_at IS NULL`.

## Out of scope

- Do NOT relocate the existing Advanced view content yet — Plan 11-08 owns that move. For now, `/dashboard/crm/advanced` may 404; the page handles it via redirect.
- Do NOT implement entity_drafts autosave hook here — Plan 11-09.
- Do NOT add the floating toggle button mount — Plan 11-08 (after `/advanced` page exists).
- Do NOT build the role-default mapping into `getUserOrg()` itself — keep it in `lib/crm/ui-mode.ts` per RESEARCH A section 4 (avoids hurting all dashboard load times).
- Do NOT call `BrandSafetyAgent` here — that is Campaign Studio territory (Plan 11-10).

## REQ-IDs closed

- (Foundational for) UX-02 (Easy half — Easy view at `/dashboard/crm`). Full UX-02 closure happens in Plan 11-08 once the Advanced route is wired and the dual-route requirement is complete.
- UX-04 (`user_profiles.ui_mode` written by toggle API — full closure here).
- UX-05 (page data fetcher proves no per-render BaseAgent calls — full closure here. The N8N nightly cache that this fetcher reads is foundational from Plan 11-06).
- (Partially) UX-01 (3 cards render via ModuleHome — full closure when 11-08 also wires advanced toggle).

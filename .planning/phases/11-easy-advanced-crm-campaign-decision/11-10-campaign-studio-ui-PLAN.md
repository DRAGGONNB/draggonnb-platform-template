---
phase: 11
plan_id: 11-10
title: Campaign Studio composer + approval screen + brand-safety integration
wave: 3
depends_on: [11-02, 11-04, 11-05]
files_modified:
  - app/(dashboard)/campaigns/page.tsx
  - app/(dashboard)/campaigns/new/page.tsx
  - app/(dashboard)/campaigns/studio/[id]/page.tsx
  - app/(dashboard)/campaigns/studio/[id]/_components/IntentForm.tsx
  - app/(dashboard)/campaigns/studio/[id]/_components/ChannelSelector.tsx
  - app/(dashboard)/campaigns/studio/[id]/_components/DraftCard.tsx
  - app/(dashboard)/campaigns/studio/[id]/_components/BrandSafetyBadge.tsx
  - app/(dashboard)/campaigns/studio/[id]/approval/page.tsx
  - app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalList.tsx
  - app/(dashboard)/campaigns/studio/[id]/approval/_components/PublishConfirmModal.tsx
  - app/api/campaigns/route.ts
  - app/api/campaigns/[id]/drafts/route.ts
  - app/api/campaigns/[id]/drafts/[draftId]/check-safety/route.ts
  - app/api/campaigns/[id]/approve/route.ts
autonomous: true
estimated_loc: 980
estimated_dev_minutes: 200
---

## Objective

Build the Campaign Studio user-facing surfaces: campaign list, intent entry, multi-channel composer, approval screen, and the publish-confirm modal. Wires `CampaignDrafterAgent` (Plan 11-05) to generate 7 drafts (5 social + 1 email + 1 SMS) on intent submit, persists to `campaign_drafts`, runs brand-safety check on demand via `BrandSafetyAgent`, and shows the locked CONTEXT.md UX: greyed-out social channels with "Connect Facebook to enable" CTA when env credentials absent. Does NOT include scheduling/execute/kill-switch/30-day-enforcement — those are Plan 11-11.

## must_haves

- `/dashboard/campaigns` (list) renders user's campaigns with status badges via shadcn `Table`.
- `/dashboard/campaigns/new` accepts intent text → POST `/api/campaigns` creates `campaigns` row with status `draft` → redirects to `/dashboard/campaigns/studio/{id}`.
- `/dashboard/campaigns/studio/{id}` (composer): shows channel selector (5 channels, social greyed when adapter `enabled() === false`), intent re-display, "Generate drafts" button → POST `/api/campaigns/{id}/drafts` → `CampaignDrafterAgent.run()` → creates 7 `campaign_drafts` rows. (CAMP-01)
- Each `<DraftCard>` shows channel badge, draft content, inline `Textarea` edit (saves on blur via PATCH), regenerate button (POST `/api/campaigns/{id}/drafts/{draftId}/regenerate`), `<BrandSafetyBadge>` showing null/safe/flagged status, and "Check brand safety" button when null. (CAMP-02 + CAMP-07)
- "Connect Facebook to enable" inline CTA on disabled social tiles → opens shadcn `Sheet` drawer with "The studio is there, social channels activate when Meta approves your account" copy (CONTEXT.md specifics).
- `/dashboard/campaigns/studio/{id}/approval` (approval screen): renders all drafts in `<ApprovalList>` — per item, edit/regenerate/approve/reject buttons. "Approve all" mass action. (CAMP-02)
- `<PublishConfirmModal>` shows channel icon + connected account name (e.g. "Facebook: My Lodge Page (id 12345)") + content preview before scheduling. NEVER silently posts. (CAMP-04)
- Brand-safety check API: `POST /api/campaigns/{id}/drafts/{draftId}/check-safety` invokes `BrandSafetyAgent`, writes `safety_flags`, `brand_safe` columns. Pre-flight 20/day budget check; returns 429 if exhausted.
- Approve campaign API: `POST /api/campaigns/{id}/approve` validates all drafts approved → sets `campaigns.status = 'pending_review'` (Plan 11-11 takes over from here for actual scheduling).

## Tasks

<task id="1">
  <title>Build campaign list + new + studio composer pages with channel selector</title>
  <files>app/(dashboard)/campaigns/page.tsx, app/(dashboard)/campaigns/new/page.tsx, app/(dashboard)/campaigns/studio/[id]/page.tsx, app/(dashboard)/campaigns/studio/[id]/_components/IntentForm.tsx, app/(dashboard)/campaigns/studio/[id]/_components/ChannelSelector.tsx, app/(dashboard)/campaigns/studio/[id]/_components/DraftCard.tsx, app/(dashboard)/campaigns/studio/[id]/_components/BrandSafetyBadge.tsx, app/api/campaigns/route.ts, app/api/campaigns/[id]/drafts/route.ts</files>
  <actions>
    **`/dashboard/campaigns/page.tsx`** (RSC) — campaign list:
    - `getUserOrg()` → fetch `campaigns` for org → render shadcn Table with cols: name, status badge, channels (icon strip), scheduled_at, actions (Open / Edit / View runs).
    - "New campaign" button → links to `/dashboard/campaigns/new`.
    - Empty state: "No campaigns yet. Create your first campaign."

    **`/dashboard/campaigns/new/page.tsx`** (RSC shell + client form):
    - Renders `<IntentForm>` client island with a single textarea ("What do you want to promote?") + submit button.
    - On submit → POST `/api/campaigns` `{ name: extracted-from-intent, intent, channels: [] }` → server creates row → redirects to `/dashboard/campaigns/studio/{id}`.

    **`/api/campaigns/route.ts`** (POST):
    - Auth via `getUserOrg()`.
    - Zod validation `{ name, intent, channels?: ChannelId[] }`.
    - **Kill switch check (inline — DO NOT import from `lib/campaigns/kill-switch.ts`; that helper is built in Plan 11-11 and would create a circular dependency)**:
      ```typescript
      const supabase = createAdminClient()
      const { data: tenantMod } = await supabase
        .from('tenant_modules').select('config').eq('organization_id', orgId).eq('module_id', 'campaigns').maybeSingle()
      const killSwitchActive = !!(tenantMod?.config as any)?.campaigns?.kill_switch_active
      if (killSwitchActive) return Response.json({ error: 'Campaigns are paused for this account' }, { status: 423 })
      ```
    - INSERT into `campaigns` with `status = 'draft'`, `created_by = user.id`, `channels = body.channels ?? []`, `force_review = false`.
    - Return 201 `{ campaignId }`.

    **`/dashboard/campaigns/studio/[id]/page.tsx`** (RSC):
    - Fetch campaign + drafts via Supabase.
    - Server-side compute channel-enabled state per RESEARCH B section 4:
      ```typescript
      const channels = [
        { id: 'email', label: 'Email', enabled: !!process.env.RESEND_API_KEY },
        { id: 'sms', label: 'SMS', enabled: !!process.env.BULKSMS_TOKEN_ID },
        { id: 'facebook', label: 'Facebook', enabled: !!process.env.META_APP_ID, ctaText: 'Connect Facebook to enable' },
        { id: 'instagram', label: 'Instagram', enabled: !!process.env.META_APP_ID, ctaText: 'Connect Instagram to enable' },
        { id: 'linkedin', label: 'LinkedIn', enabled: !!process.env.LINKEDIN_CLIENT_ID, ctaText: 'Connect LinkedIn to enable' },
      ]
      ```
    - Pass to `<ChannelSelector>` (client island) and `<DraftCard>` array (one per channel).
    - "Generate drafts" button → calls POST `/api/campaigns/{id}/drafts`.

    **`<ChannelSelector>`** (client island):
    - Render 5 channel pills.
    - Disabled pill: `opacity-40 cursor-not-allowed`, `<Badge variant="outline">{ctaText}</Badge>` inline.
    - Disabled pill click → opens shadcn `<Sheet>` with copy: "The studio is there, social channels activate when Meta approves your account."
    - Enabled pill click → toggles channel selection in form state.

    **`<DraftCard>`** (client island):
    - shadcn `Card` with channel badge, subject (email only), `<Textarea>` for `body_text` (autosaves on blur via PATCH `/api/campaigns/{id}/drafts/{draftId}` — out of scope for this plan; document as TODO comment OR include as 4th task if time permits — recommend keep PATCH stub returning 501 to mark non-blocking gap), regenerate button, `<BrandSafetyBadge brandSafe={draft.brand_safe} flags={draft.safety_flags} />`.
    - "Check brand safety" button when `brand_safe === null`.

    **`<BrandSafetyBadge>`** (client island):
    - `null` → grey badge "Not yet checked"
    - `true` → green badge "Brand safe"
    - `false` → amber badge "Review flags" → click opens popover listing `safety_flags` array.

    **`/api/campaigns/[id]/drafts/route.ts`** (POST — generate drafts via CampaignDrafterAgent):
    - Auth + ownership check (verify campaign.organization_id === userOrg.organization.id).
    - **Kill switch check (inline — same 3-line query as `/api/campaigns/route.ts` POST above; DO NOT import `lib/campaigns/kill-switch.ts`)**:
      ```typescript
      const { data: tenantMod } = await supabase
        .from('tenant_modules').select('config').eq('organization_id', orgId).eq('module_id', 'campaigns').maybeSingle()
      if ((tenantMod?.config as any)?.campaigns?.kill_switch_active) return Response.json({ error: 'Campaigns are paused' }, { status: 423 })
      ```
    - Pre-clear any existing drafts for this campaign (delete then insert, since regeneration of all drafts replaces them).
    - Invoke `new CampaignDrafterAgent().run({ organizationId, input: campaign.intent })`.
    - Parse `result.posts` array; for each post insert a `campaign_drafts` row with `agent_session_id = result.sessionId`, `channel`, `subject`, `body_text`, `body_html`.
    - Return 200 `{ drafts: [...] }`.
  </actions>
  <verification>
    `npm run typecheck` clean.
    `npm run build` succeeds.
    Manual: visit `/dashboard/campaigns/new` as test user → enter intent "promote our Sunday brunch" → submit → redirected to `/studio/{id}` → click "Generate drafts" → 7 draft cards render after agent call (~30-60s).
    Disabled FB/IG/LinkedIn tiles show CTA badge + Sheet drawer on click.
  </verification>
</task>

<task id="2">
  <title>Build approval screen + publish confirm modal</title>
  <files>app/(dashboard)/campaigns/studio/[id]/approval/page.tsx, app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalList.tsx, app/(dashboard)/campaigns/studio/[id]/approval/_components/PublishConfirmModal.tsx, app/api/campaigns/[id]/approve/route.ts</files>
  <actions>
    **`/dashboard/campaigns/studio/[id]/approval/page.tsx`** (RSC):
    - Fetch campaign + drafts.
    - Resolve channel display info (account name) for each enabled channel:
      - email: `connectedAccountName = 'Resend (default org domain)'`
      - sms: `BULKSMS_SENDER_ID ?? 'DraggonnB'`
      - facebook/instagram: `social_accounts.page_name` for `organization_id`, `platform=...`
      - linkedin: `social_accounts.profile_name` for `linkedin`
    - Pass to `<ApprovalList>` + `<PublishConfirmModal>`.

    **`<ApprovalList>`** (client island, CAMP-02):
    - Render each draft with: channel badge, content preview, edit / regenerate / approve / reject buttons, brand-safety status.
    - "Approve all" mass action button: validates each draft has `is_approved = true` server-side then enables.
    - On "Approve campaign" → opens `<PublishConfirmModal>`.

    **`<PublishConfirmModal>`** (CAMP-04 — shadcn `Dialog`):
    - Header: "Confirm campaign publish"
    - Body: per channel, show:
      - Channel icon (lucide-react: `Mail`, `MessageSquare`, `Facebook`, `Instagram`, `Linkedin`)
      - Connected account name (e.g. "Facebook: My Lodge Page", "SMS via DraggonnB sender ID", "Email from no-reply@<org-domain>")
      - First 200 chars of content preview
    - "Schedule" button → POST `/api/campaigns/{id}/approve` (transitions to pending_review or scheduled per Plan 11-11's enforcement) → redirect to runs list.
    - "Cancel" button → close modal.

    **`/api/campaigns/[id]/approve/route.ts`** (POST):
    - Auth + ownership check.
    - **Kill switch check (inline — same 3-line query as in `/api/campaigns/route.ts`; DO NOT import `lib/campaigns/kill-switch.ts`).**
    - Validate every `campaign_drafts.is_approved = true` for this campaign.
    - **Brand-safety gate**: if any draft has `brand_safe === false`, return 422 with explanation. Allow proceed if `brand_safe === null` BUT note: in v3.1 this could be tightened (RESEARCH B section 13 escape hatch).
    - **30-day enforcement**: call `isInNewTenantPeriod(orgId)` from Plan 11-05.
      - If true AND `campaigns.force_review === false` → status stays at `'pending_review'`. Plan 11-11's `/schedule` endpoint will refuse to schedule until `force_review` set by admin OR period expires.
      - Otherwise → status → `'scheduled'`, returns scheduling URL.
    - Update `campaigns.approved_by = user.id`, `approved_at = NOW()`, `status` per above.
    - Return `{ status, nextAction: 'schedule' | 'awaiting_review' }`.
  </actions>
  <verification>
    `npm run typecheck` clean.
    Manual: from studio, after generating drafts, click each draft's "Check brand safety" → see badge update. Approve all → click "Approve campaign" → confirm modal shows per-channel preview. Click Schedule → status transitions correctly per 30-day-period logic.
  </verification>
</task>

<task id="3">
  <title>Build brand-safety check API + draft regenerate endpoint</title>
  <files>app/api/campaigns/[id]/drafts/[draftId]/check-safety/route.ts</files>
  <actions>
    **`/api/campaigns/[id]/drafts/[draftId]/check-safety/route.ts`** (POST) per RESEARCH B section 8:
    - Auth + ownership check.
    - **Budget check**: query `ai_usage_ledger` for today's count of `agent_type='campaign_brand_safety'` for this org. If ≥20, return 429 with `{ error: 'Brand safety check limit reached for today (20/day)' }`. (RESEARCH B section 8 + 13 escape hatch — admin can raise limit by editing `tenant_modules.config.campaigns.safety_check_daily_limit` post-v3.0.)
    - Load `campaign_drafts` row → call `new BrandSafetyAgent().run({ organizationId, input: draft.body_text })`.
    - Persist result: `UPDATE campaign_drafts SET brand_safe = result.safe, safety_flags = result.flags.map(f => f.type)` for this draft.
    - **Telegram alert** if `recommendation === 'reject'`: invoke `sendCampaignBrandSafetyAlert(orgName, campaignName, channel, flag)` (helper to create in Plan 11-11 or inline here). Match RESEARCH B section 12(b) wording.
    - Return 200 `{ safe, flags, recommendation }`.

    Add a regenerate endpoint stub `app/api/campaigns/[id]/drafts/[draftId]/regenerate/route.ts` (POST) that:
    - Increments `regeneration_count`.
    - Re-runs `CampaignDrafterAgent` with the same intent but adds `"Regenerate the {channel} post — make it different"` instruction.
    - Replaces the draft row's `body_text`/`body_html`/`subject` with new output.
    - Resets `brand_safe = null`, `safety_flags = '{}'`, `is_approved = false`.
    - Returns 200 with the new draft.
  </actions>
  <verification>
    `npm run typecheck` clean.
    Manual: click "Check brand safety" on a draft → response within ~5s with safe badge. Verify `campaign_drafts.brand_safe` and `safety_flags` columns updated.
    Force a flagged response by submitting deliberately problematic copy → safety badge shows amber + Telegram alert fires (verify in test channel).
    Hit budget by calling endpoint 21 times → 429 on the 21st.
  </verification>
</task>

## Verification

- `npm run typecheck` clean.
- `npm run build` succeeds.
- Manual happy-path:
  - Create campaign → 7 drafts generate.
  - Run brand-safety on each → badges update.
  - Approve all → publish-confirm modal shows per-channel previews.
  - Schedule attempt → status transitions per 30-day-period logic.
- Manual edge: disabled FB tile click → Sheet drawer opens with locked CONTEXT.md copy.
- Network tab: verify NO direct calls to Anthropic API from the client (all agent calls go through API routes).

## Out of scope

- Do NOT implement scheduling/execute/verify endpoints — Plan 11-11 owns pg_cron + pg_net + execute route + verify route.
- Do NOT implement kill-switch admin UI — Plan 11-11.
- Do NOT add `safety_check_daily_limit` per-tenant override — RESEARCH B section 13 escape hatch documents v3.1 work.
- Do NOT build draft inline-edit-on-blur PATCH endpoint if time-pressured — leave as TODO with stub returning 501. (Approval-screen edit is the user-facing path; inline composer edit is nice-to-have.)
- Do NOT touch real Facebook/Instagram/LinkedIn `send()` paths — credential-gated stubs from Plan 11-04 stay as-is.
- Do NOT add the "publish recurring" feature — v3.0 is one-time only.

## REQ-IDs closed

- CAMP-01 (intent → 5 social + 1 email + 1 SMS drafted using brand voice).
- CAMP-02 (single approval screen with edit/regenerate/approve all).
- CAMP-04 (publish confirm UI shows channel icon + account name + preview).
- CAMP-07 (brand-safety Haiku check — full closure here including Telegram alert).
- (Partially) CAMP-08 (approval route enforces draft-then-review during new-tenant period — full closure when Plan 11-11's schedule route also enforces).

## Execution notes

This plan is intentionally large (14 files / ~980 LOC / ~200 minutes estimated) because it ships the entire Campaign Studio user-facing surface as a coherent vertical slice. Splitting would create artificial seams between pages/components that share types and imports.

**Context-budget risk**: planner has flagged that execution should be paced. The PATCH stub returning 501 at line ~501 of the plan (the inline draft-edit-on-blur endpoint) is an EXPLICIT non-blocking gap to manage scope — leave as TODO comment per its current spec rather than fully implement. If executor sees context climbing past 50%, prefer to ship the 13 explicit files clean and leave the PATCH stub for a Phase 12 polish task.

**Inline kill-switch checks** (3 routes total: POST /api/campaigns, POST /api/campaigns/[id]/drafts, POST /api/campaigns/[id]/approve) are intentional duplication to avoid forward-referencing `lib/campaigns/kill-switch.ts` (built in Plan 11-11 — would create a Wave-3-to-Wave-4 dependency cycle). DO NOT refactor these into a shared helper in this plan.

---
phase: 11
plan: 11-10
title: Campaign Studio UI
subsystem: campaigns
tags: [next.js, react, campaigns, brand-safety, approval-workflow]
status: complete
completed: 2026-04-27

dependencies:
  requires: [11-02, 11-04, 11-05]
  provides:
    - Campaign list page with shadcn Table
    - Campaign new page (IntentForm → POST /api/campaigns)
    - Campaign Studio composer (ChannelSelector + DraftCard + BrandSafetyBadge)
    - Campaign approval screen (ApprovalList + PublishConfirmModal)
    - POST /api/campaigns (create with kill-switch)
    - POST /api/campaigns/[id]/drafts (CampaignDrafterAgent → 7 drafts)
    - GET/PATCH /api/campaigns/[id]/drafts/[draftId] (PATCH = 501 stub)
    - POST /api/campaigns/[id]/drafts/[draftId]/check-safety (BrandSafetyAgent + Telegram alert)
    - POST /api/campaigns/[id]/drafts/[draftId]/regenerate
    - POST /api/campaigns/[id]/approve (30-day enforcement + brand-safety gate)
  affects: [11-11]

tech-stack:
  added: []
  patterns:
    - RSC shell + client island split (page.tsx → StudioComposer, ApprovalScreen)
    - Inline kill-switch 3-line query (intentional duplication, no forward-ref to 11-11)
    - PATCH 501 stub for out-of-scope inline edit

key-files:
  created:
    - app/(dashboard)/campaigns/page.tsx
    - app/(dashboard)/campaigns/new/page.tsx
    - app/(dashboard)/campaigns/studio/[id]/page.tsx
    - app/(dashboard)/campaigns/studio/[id]/_components/IntentForm.tsx
    - app/(dashboard)/campaigns/studio/[id]/_components/ChannelSelector.tsx
    - app/(dashboard)/campaigns/studio/[id]/_components/DraftCard.tsx
    - app/(dashboard)/campaigns/studio/[id]/_components/BrandSafetyBadge.tsx
    - app/(dashboard)/campaigns/studio/[id]/_components/StudioComposer.tsx
    - app/(dashboard)/campaigns/studio/[id]/approval/page.tsx
    - app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalList.tsx
    - app/(dashboard)/campaigns/studio/[id]/approval/_components/ApprovalScreen.tsx
    - app/(dashboard)/campaigns/studio/[id]/approval/_components/PublishConfirmModal.tsx
    - app/api/campaigns/route.ts
    - app/api/campaigns/[id]/drafts/route.ts
    - app/api/campaigns/[id]/drafts/[draftId]/route.ts
    - app/api/campaigns/[id]/drafts/[draftId]/check-safety/route.ts
    - app/api/campaigns/[id]/drafts/[draftId]/regenerate/route.ts
    - app/api/campaigns/[id]/approve/route.ts
    - __tests__/components/campaigns/studio-composer.test.tsx
    - __tests__/components/campaigns/approval-screen.test.tsx
  modified: []

decisions:
  - Inline kill-switch check duplicated in 3 routes (intentional — avoids forward-referencing lib/campaigns/kill-switch.ts which is Plan 11-11's scope)
  - PATCH /api/campaigns/[id]/drafts/[draftId] returns 501 (inline draft edit-on-blur is v3.1 scope)
  - social_accounts lookup uses account_name + platform_id (not page_name/profile_name — those columns do not exist)
  - AgentRunResult.result (not .output) carries parsed agent data
  - Dialog used in place of shadcn Sheet (Sheet not yet in components/ui)

metrics:
  duration: ~60 minutes
  tests_added: 14
  files_created: 19
  req_ids_closed: [CAMP-01, CAMP-02, CAMP-04, CAMP-07, CAMP-08-partial]
---

# Phase 11 Plan 10: Campaign Studio UI Summary

Campaign Studio user-facing surface shipped as a coherent vertical slice: list, intent entry, multi-channel composer with 5-channel selector, draft generation via CampaignDrafterAgent, brand-safety check via BrandSafetyAgent, per-draft approval workflow, and publish-confirm modal.

## What Was Built

### Pages
- `/dashboard/campaigns` — RSC campaign list with shadcn Table, status badges, channel icon strip, empty state
- `/dashboard/campaigns/new` — RSC shell + IntentForm client island: textarea → POST /api/campaigns → redirect to studio
- `/dashboard/campaigns/studio/[id]` — RSC + StudioComposer client island: channel selector, draft generation, draft cards
- `/dashboard/campaigns/studio/[id]/approval` — RSC resolves channel account names + ApprovalScreen client island

### Components
- `IntentForm` — controlled textarea, calls POST /api/campaigns, handles errors
- `ChannelSelector` — 5 channel pills; disabled social tiles (opacity-40 + Badge CTA) open Dialog drawer with locked CONTEXT.md copy
- `DraftCard` — per-draft card with Textarea, BrandSafetyBadge, check/regenerate actions; PATCH on-blur is TODO stub
- `BrandSafetyBadge` — null/safe/flagged states; flagged opens popover listing all flag types + reasons
- `StudioComposer` — client island gluing channel selector + draft generation + draft card grid
- `ApprovalList` — per-draft approve/reject/regenerate/check-safety; "Approve all" mass action
- `ApprovalScreen` — client wrapper passing state to ApprovalList + PublishConfirmModal
- `PublishConfirmModal` — Dialog with per-channel icon + account name + 200-char content preview; NEVER silently posts

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| /api/campaigns | POST | Create campaign, kill-switch check, 201 with campaignId |
| /api/campaigns | GET | List org's campaigns |
| /api/campaigns/[id]/drafts | POST | CampaignDrafterAgent → 7 draft rows |
| /api/campaigns/[id]/drafts | GET | List campaign's drafts |
| /api/campaigns/[id]/drafts | PATCH | 501 stub (v3.1) |
| /api/campaigns/[id]/drafts/[draftId] | GET | Single draft |
| /api/campaigns/[id]/drafts/[draftId] | PATCH | 501 stub (v3.1) |
| /api/campaigns/[id]/drafts/[draftId]/check-safety | POST | BrandSafetyAgent + 20/day budget + Telegram alert on reject |
| /api/campaigns/[id]/drafts/[draftId]/regenerate | POST | CampaignDrafterAgent with regenerate instruction |
| /api/campaigns/[id]/approve | POST | All-approved + brand-safety + 30-day enforcement |

## Must-Haves Verified

| REQ-ID | Status | Notes |
|--------|--------|-------|
| CAMP-01 | Closed | Intent → 7 drafts via CampaignDrafterAgent (brand voice auto-injected) |
| CAMP-02 | Closed | Approval screen with edit/regenerate/approve/reject + approve-all |
| CAMP-04 | Closed | PublishConfirmModal: channel icon + account name + preview, no silent post |
| CAMP-07 | Closed | BrandSafetyAgent check, Telegram alert on reject, 20/day budget |
| CAMP-08 | Partial | Approve route enforces pending_review in new-tenant period; full closure pending Plan 11-11 schedule route |

## Deviations from Plan

### [Rule 1 - Bug] social_accounts column mismatch
- **Found during:** Task 2, approval page channel account resolution
- **Issue:** Plan referenced `page_name` and `profile_name` columns on `social_accounts`; actual table has `account_name` and `platform_id`
- **Fix:** Updated approval page to use correct columns
- **Files modified:** `app/(dashboard)/campaigns/studio/[id]/approval/page.tsx`

### [Rule 1 - Bug] AgentRunResult shape
- **Found during:** Task 1, drafts POST route
- **Issue:** Plan implied `agentResult.output.posts` but AgentRunResult type exposes `result` (not `output`)
- **Fix:** Cast `agentResult.result` to typed shape; used `draftResult.posts` throughout

### [Rule 3 - Blocking] shadcn Sheet not in components/ui
- **Found during:** Task 1, ChannelSelector
- **Issue:** Plan specified `<Sheet>` drawer for locked channel CTA; `components/ui/` does not have sheet.tsx
- **Fix:** Used `<Dialog>` (available) as functional equivalent; behaviour and copy identical

### Intentional non-deviations (baked into plan)
- **Inline kill-switch duplication:** 3 routes each contain the same 3-line `tenant_modules` query. Intentional to avoid forward-referencing `lib/campaigns/kill-switch.ts` (Plan 11-11's scope). Documented in each route as inline comment.
- **PATCH 501 stub:** PATCH /api/campaigns/[id]/drafts and PATCH /api/campaigns/[id]/drafts/[draftId] both return 501. Inline draft-edit-on-blur is explicitly v3.1 scope per plan.
- **StudioComposer extra component:** Added `StudioComposer.tsx` as a client-island wrapper because the studio page is an RSC and needs a client boundary for channel selector + fetch calls. Not in the original file list but required for correct RSC/client split.
- **ApprovalScreen extra component:** Same RSC/client boundary pattern — added `ApprovalScreen.tsx` to wrap `ApprovalList` + `PublishConfirmModal` in a single client boundary.

## Next Phase Readiness

Plan 11-11 (scheduler + kill-switch admin) can proceed immediately:
- Campaign status machine: `draft → pending_review/scheduled` (this plan) → `executed` (11-11)
- `force_review` column is set by this plan's approve route; 11-11's schedule route can read it
- Kill-switch helper `lib/campaigns/kill-switch.ts` can be created in 11-11 — the 3 inlined queries in this plan's routes will remain as-is (intentional duplication)
- `campaign_runs` table is untouched (11-11's scope)

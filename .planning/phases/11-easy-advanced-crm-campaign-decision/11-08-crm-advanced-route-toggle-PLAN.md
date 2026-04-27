---
phase: 11
plan_id: 11-08
title: CRM Advanced route relocation + Easy/Advanced toggle wiring
wave: 4
depends_on: [11-03, 11-07]
files_modified:
  - app/(dashboard)/crm/advanced/page.tsx
  - app/(dashboard)/crm/contacts/page.tsx
  - app/(dashboard)/crm/deals/page.tsx
  - app/(dashboard)/crm/companies/page.tsx
  - components/crm/AdvancedKanbanShell.tsx
autonomous: true
estimated_loc: 240
estimated_dev_minutes: 70
---

## Objective

Relocate the existing CRM stats/dashboard content (currently at `app/(dashboard)/crm/page.tsx` before Plan 11-07 overwrote it) to `/dashboard/crm/advanced/page.tsx` and mount the `<ToggleViewButton>` from Plan 11-03 on every Advanced-view CRM page (`/advanced`, `/contacts`, `/deals`, `/companies`). Toggle navigates between `/dashboard/crm` (Easy) and `/dashboard/crm/advanced` (Advanced) and persists `user_profiles.ui_mode` via `/api/crm/ui-mode` (already shipped in 11-07). Closes UX-03 (every non-Easy page gets the link) and the Advanced half of UX-02.

## must_haves

- `/dashboard/crm/advanced` route exists and renders the previous CRM dashboard content (stats overview + entry to deals/contacts/companies — preserved 1:1, just relocated).
- `<ToggleViewButton>` renders in floating position on `/dashboard/crm/advanced`, `/dashboard/crm/contacts`, `/dashboard/crm/deals`, `/dashboard/crm/companies`. (UX-03)
- Floating button on each advanced page reads `currentMode='advanced'` and links to `/dashboard/crm` with label "Easy view →". (CONTEXT.md locked decision)
- Toggle click persists preference to `user_profiles.ui_mode` via `POST /api/crm/ui-mode` (fire-and-forget; navigation happens regardless of write success).
- Existing CRM advanced functionality (kanban, filters, sub-routes) is unmodified — only the wrapping page file moves.
- Manager-role users default to advanced (already enforced by Plan 11-07's redirect logic).

## Tasks

<task id="1">
  <title>Relocate CRM dashboard to /advanced + create AdvancedKanbanShell</title>
  <files>app/(dashboard)/crm/advanced/page.tsx, components/crm/AdvancedKanbanShell.tsx</files>
  <actions>
    Plan 11-07 Task 0 has copied the ORIGINAL `app/(dashboard)/crm/page.tsx` content to `app/(dashboard)/crm/_legacy/stats-overview.tsx.bak` BEFORE overwrite. This task reads from that backup, relocates the content to `app/(dashboard)/crm/advanced/page.tsx`, then deletes the backup as the final step.

    Steps:
    1. `cp app/(dashboard)/crm/_legacy/stats-overview.tsx.bak app/(dashboard)/crm/advanced/page.tsx`
    2. Update internal imports/links in the relocated file: any link that referenced `/dashboard/crm` for the dashboard content should now point to `/dashboard/crm/advanced`.
    3. At the end of the page JSX, add `<ToggleViewButton currentMode="advanced" easyHref="/dashboard/crm" advancedHref="/dashboard/crm/advanced" apiEndpoint="/api/crm/ui-mode" />`.
    4. Delete the snapshot: `rm app/(dashboard)/crm/_legacy/stats-overview.tsx.bak && rmdir app/(dashboard)/crm/_legacy 2>/dev/null || true` (the rmdir is safe because Plan 11-08 only created/used this directory).

    **`components/crm/AdvancedKanbanShell.tsx`** (small reusable wrapper to mount the toggle on every advanced sub-page):
    ```tsx
    'use client'
    import { ToggleViewButton } from '@/components/module-home/ToggleViewButton'

    export function AdvancedKanbanShell({ children }: { children: React.ReactNode }) {
      return (
        <>
          {children}
          <ToggleViewButton
            currentMode="advanced"
            easyHref="/dashboard/crm"
            advancedHref="/dashboard/crm/advanced"
            apiEndpoint="/api/crm/ui-mode"
          />
        </>
      )
    }
    ```
  </actions>
  <verification>
    `npm run dev` → visit `/dashboard/crm/advanced` → see original dashboard content + floating "Easy view →" button bottom-right.
    `npm run typecheck` clean.
    `npm run build` succeeds.
  </verification>
</task>

<task id="2">
  <title>Wrap existing CRM sub-pages (contacts, deals, companies) with AdvancedKanbanShell</title>
  <files>app/(dashboard)/crm/contacts/page.tsx, app/(dashboard)/crm/deals/page.tsx, app/(dashboard)/crm/companies/page.tsx</files>
  <actions>
    Read each of the 3 CRM sub-page files first (they exist already per `Glob`). Each is currently a server-rendered or client-rendered list. Minimal change: wrap the rendered output in `<AdvancedKanbanShell>` so the floating toggle appears on every CRM sub-page.

    Pattern for each file (e.g. `contacts/page.tsx`):
    ```tsx
    import { AdvancedKanbanShell } from '@/components/crm/AdvancedKanbanShell'

    export default async function ContactsPage() {
      // ... existing data fetching unchanged
      return (
        <AdvancedKanbanShell>
          {/* existing JSX unchanged */}
        </AdvancedKanbanShell>
      )
    }
    ```

    Do NOT modify the data fetching, sort/filter behavior, or any business logic. ONLY the wrapping JSX.

    **Important — UX-03 wording check:** Make sure the toggle reads `Easy view →` on advanced pages (it does — `currentMode='advanced'` in `<AdvancedKanbanShell>` triggers the easy label per Plan 11-03's component logic).
  </actions>
  <verification>
    Visit `/dashboard/crm/contacts`, `/dashboard/crm/deals`, `/dashboard/crm/companies` — floating "Easy view →" button appears bottom-right.
    Click button on contacts page → navigates to `/dashboard/crm` AND `POST /api/crm/ui-mode` fires (visible in network tab).
    `npm run typecheck` clean.
    `npm run build` succeeds.
  </verification>
</task>

## Verification

- All 4 advanced CRM routes (`/advanced`, `/contacts`, `/deals`, `/companies`) display the floating toggle button.
- Clicking the toggle on `/contacts` navigates to `/dashboard/crm` AND persists `user_profiles.ui_mode = 'easy'` (verify via DB query after click).
- Clicking the toggle on `/dashboard/crm` (Easy view, mounted by Plan 11-07) navigates to `/advanced` AND persists `ui_mode = 'advanced'`.
- Existing kanban filters/sorts/data still render correctly — no regression.
- `npm run build` succeeds.
- `npm run typecheck` clean.

## Out of scope

- Do NOT modify CRM data fetching, deal-status mutations, or any business logic of the existing kanban — verbatim relocation only.
- Do NOT add the floating toggle to non-CRM modules — Phase 11 scope is CRM only (Easy view rollout to other modules deferred to v3.1 per CONTEXT.md).
- Do NOT implement view-desync prevention here — that is Plan 11-09 (entity_drafts autosave + merge-on-load).
- Do NOT change `getUserOrg()` to read `user_profiles.ui_mode` — would slow down every authenticated request (RESEARCH A section 4 escape hatch).

## REQ-IDs closed

- UX-02 (full closure — both Easy view (`/dashboard/crm`, foundational from 11-07) and Advanced view (`/dashboard/crm/advanced`, this plan) exist; the dual-route requirement is complete here).
- UX-03 (every non-Easy CRM page includes "Easy view →" link in floating bottom-right toggle — full closure here).

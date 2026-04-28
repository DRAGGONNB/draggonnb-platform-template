---
phase: 11
plan_id: 11-03
title: ModuleHome shared component + manifest types
wave: 2
depends_on: [11-01]
files_modified:
  - components/module-home/types.ts
  - components/module-home/ModuleHome.tsx
  - components/module-home/ActionCard.tsx
  - components/module-home/ActionCardItem.tsx
  - components/module-home/ToggleViewButton.tsx
  - components/module-home/UndoToastViewport.tsx
  - lib/supabase/database.types.ts
autonomous: true
estimated_loc: 480
estimated_dev_minutes: 110
---

## Objective

Build the reusable `<ModuleHome>` Easy view scaffold (UX-01) — the manifest-driven shared component used by the CRM Easy view in Plan 11-07 and (post-v3.0) the other 5 modules. Output is library code only: NO module-specific data fetching, NO routes, NO API calls. RSC wrapper accepts a `cards: ActionCardManifest[]` and pre-fetched `initialData` from the calling page; client islands own approve/dismiss interactions, the 5s undo toast, and toggle navigation. Ships the floating `ToggleViewButton` (UX-03) and the bottom-center mobile-safe `UndoToastViewport`. Regenerates Supabase types so 11-01 tables are typed (database.types.ts).

## must_haves

- `components/module-home/types.ts` exports `ActionCardManifest`, `ModuleHomeProps`, `ActionCardItem`, `ApproveAction` discriminated union (`send_email`, `snooze_1d`, `decide` w/ choice, `engage_hot_lead`).
- `<ModuleHome>` is a React Server Component (no `'use client'`) that renders header, optional brand-voice banner (when `hasBrandVoice=false`), maps `cards` to `<ActionCard>` instances passing items from `initialData` keyed by `card.id`, and mounts `<ToggleViewButton>` (UX-01).
- `<ActionCard>` is a client island (`'use client'`) that receives items + a `dispatchAction(itemId, action)` callback prop; renders ≤5 items, "View all in Advanced →" if `totalCount > 5`, empty-state CTA, and dismiss button per row (UX-01).
- `<ActionCardItem>` owns the 5s undo flow per RESEARCH section 8: toast appears, `setTimeout(commit, 5000)`, Undo button calls `clearTimeout` + `dismiss`. Uses existing `@radix-ui/react-toast` via `hooks/use-toast.ts` — does NOT add new toast library.
- `<ToggleViewButton>` is a `'use client'` floating pill: desktop `bottom-4 right-4`, mobile `bottom-20 right-4` (80px from bottom for iOS Safari), inline `style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}` (no `pb-safe` plugin), z-40, returns `null` when `currentMode === targetMode` (defensive guard) (UX-03).
- `<UndoToastViewport>` overrides toast position to `fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[100]` for mobile-safe Easy-view undo toasts (CONTEXT.md locked decision).
- `lib/supabase/database.types.ts` regenerated post-11-01 — typed access for `crm_activities`, `crm_action_suggestions`, `crm_action_dismissals`, `entity_drafts`, `user_profiles.ui_mode`, `campaigns`, `campaign_drafts`, `campaign_runs`, `campaign_run_items`.
- Library is module-agnostic — no `crm_*` imports or hardcoded card definitions in this plan.

## Tasks

<task id="1">
  <title>Define types + regenerate database.types.ts</title>
  <files>components/module-home/types.ts, lib/supabase/database.types.ts</files>
  <actions>
    Create `components/module-home/types.ts` per RESEARCH A section 1:
    ```typescript
    export type CardSourceKind = 'sql_page_load' | 'cached_suggestions' | 'combined'

    export interface ActionCardManifest {
      id: string
      title: string
      description: string
      emptyStateCTA: string
      maxItems: 5
      sourceKind: CardSourceKind
    }

    export interface ActionCardItem {
      id: string                          // suggestion id OR computed deterministic id (e.g. `stale_${dealId}`)
      entityId: string
      entityType: 'contact' | 'deal' | 'company'
      displayName: string
      subtitle?: string                   // e.g. "Last contact 9 days ago"
      score?: number                      // optional — only set for cached cards
    }

    export type ApproveAction =
      | { type: 'send_email' }
      | { type: 'snooze_1d' }
      | { type: 'decide'; choice: 'engage' | 'archive' | 'snooze' }
      | { type: 'engage_hot_lead' }

    export interface ActionCardProps {
      cardId: string
      title: string
      description: string
      emptyStateCTA: string
      items: ActionCardItem[]
      totalCount: number
      hasBrandVoice: boolean
      apiEndpoint: string                 // e.g. '/api/crm/easy-view/approve' — module supplies this
      dismissEndpoint: string             // e.g. '/api/crm/easy-view/dismiss'
      // Per-card UI variant: drives which buttons render per row
      variant: 'followup' | 'stale_deal' | 'hot_lead' | 'generic'
    }

    export interface ModuleHomeProps {
      module: string
      cards: ActionCardManifest[]
      cardData: Record<string, { items: ActionCardItem[]; totalCount: number }>
      userRole: 'admin' | 'manager' | 'user'
      uiMode: 'easy' | 'advanced'
      organizationId: string
      hasBrandVoice: boolean
      apiEndpointBase: string             // e.g. '/api/crm/easy-view'
      advancedHref: string                // e.g. '/dashboard/crm/advanced'
    }
    ```

    Then regenerate Supabase types: `npx supabase gen types typescript --linked --schema public > lib/supabase/database.types.ts`. This picks up Plan 11-01's tables. (If 11-02 has not run yet at execution time, regenerate again at start of 11-04.)
  </actions>
  <verification>
    `npm run typecheck` passes.
    `grep -E "crm_activities|crm_action_suggestions|entity_drafts|ui_mode" lib/supabase/database.types.ts` returns at least 4 matches.
  </verification>
</task>

<task id="2">
  <title>Build ModuleHome RSC + ActionCard + ActionCardItem (client islands)</title>
  <files>components/module-home/ModuleHome.tsx, components/module-home/ActionCard.tsx, components/module-home/ActionCardItem.tsx</files>
  <actions>
    **`ModuleHome.tsx` (RSC, no 'use client'):**
    - Header section: module title + "Easy view" subtitle.
    - If `!hasBrandVoice`: render persistent `<Alert>` (shadcn) above cards: "Complete your brand voice in 30 seconds for personalised outreach →" with link to `/settings/brand-voice` (RESEARCH A section 11).
    - Map over `cards` rendering `<ActionCard>` for each, passing `cardData[card.id].items` and `totalCount`.
    - Empty grid layout: cards stack on mobile, 3-col on `md:` breakpoint.
    - At end of page: `<ToggleViewButton currentMode="easy" advancedHref={advancedHref} apiEndpoint={apiEndpointBase + '/ui-mode'} />`.

    **`ActionCard.tsx` (client island):**
    - shadcn `Card` + `CardHeader` (title + description) + `CardContent`.
    - Empty state: when `items.length === 0`, render emoji/icon + emptyStateCTA button.
    - Map over items rendering `<ActionCardItem>` with `variant` prop forwarded.
    - Footer: when `totalCount > items.length`, render `<Link href={advancedHref}>View all {totalCount} in Advanced →</Link>`.
    - Dismiss handler: `POST` to `dismissEndpoint` with `{ entityId, entityType, cardType: cardId }`; on success, optimistically remove from local state.

    **`ActionCardItem.tsx` (client island):**
    Per CONTEXT.md "Approve in one click" matrix:
    - **variant === 'followup'**: 2 buttons "Send email" + "Snooze 1d" side-by-side.
    - **variant === 'stale_deal'**: 1 button "Decide" → opens shadcn `Dialog` with 3 radio options engage/archive/snooze + Confirm.
    - **variant === 'hot_lead'**: 1 button "Engage" (fires all 3: email + stage advance + task creation).
    - **variant === 'generic'**: single "Approve" button.
    Action handler per RESEARCH A section 8:
    ```typescript
    function handleApprove(action: ApproveAction) {
      const toastId = toast({
        title: 'Sending...',
        description: 'Tap Undo to cancel',
        action: <ToastAction altText="Undo" onClick={() => cancelAction(itemId)}>Undo</ToastAction>,
        duration: 5000,
      })
      const timer = setTimeout(async () => {
        await fetch(apiEndpoint, { method: 'POST', body: JSON.stringify({ itemId, action }) })
        // optimistic UI removal handled by parent ActionCard
      }, 5000)
      pendingRef.current.set(itemId, { timer, toastId })
    }
    ```
    `cancelAction(itemId)` clearTimeout + dismiss(toastId) + remove from pending map. Use `useRef` for the pending map (not state — re-render thrash).
  </actions>
  <verification>
    `npm run typecheck` passes.
    `npm test -- ModuleHome` passes (render test asserting cards render + brand-voice banner appears when hasBrandVoice=false).
    Manually instantiate with stub data in a Storybook-style fixture or test page — confirm 3 variants render distinct buttons.
  </verification>
</task>

<task id="3">
  <title>Build ToggleViewButton + UndoToastViewport (mobile-safe positioning)</title>
  <files>components/module-home/ToggleViewButton.tsx, components/module-home/UndoToastViewport.tsx</files>
  <actions>
    **`ToggleViewButton.tsx`** per CONTEXT.md decisions table + RESEARCH A section 9:
    ```tsx
    'use client'
    interface Props {
      currentMode: 'easy' | 'advanced'
      advancedHref: string         // for navigation
      easyHref: string             // for navigation back
      apiEndpoint: string          // POST to persist ui_mode
    }

    export function ToggleViewButton({ currentMode, advancedHref, easyHref, apiEndpoint }: Props) {
      const targetMode = currentMode === 'easy' ? 'advanced' : 'easy'
      const targetHref = currentMode === 'easy' ? advancedHref : easyHref
      const label = currentMode === 'easy' ? 'Advanced view →' : 'Easy view →'

      // Defensive guard — should never render if destination is current
      if (targetMode === currentMode) return null

      const handleClick = async () => {
        // Persist preference fire-and-forget; navigate immediately for snappy feel
        fetch(apiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: targetMode }),
        }).catch(() => {/* persistence failure is not user-blocking */})
        window.location.href = targetHref
      }

      return (
        <button
          onClick={handleClick}
          aria-label={label}
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          className={cn(
            'fixed z-40 right-4 bottom-20 sm:bottom-4',
            'h-10 min-w-[56px] px-3 rounded-full',
            'bg-white border border-gray-200 shadow-md',
            'text-sm font-medium text-gray-700',
            'hover:bg-gray-50 hover:shadow-lg transition-all',
            'flex items-center gap-1.5'
          )}
        >
          {label}
        </button>
      )
    }
    ```
    Wording: locked literal `"Easy view →"` and `"Advanced view →"` (CONTEXT.md). No icon-only mode.

    **`UndoToastViewport.tsx`** per RESEARCH A section 8:
    A standalone component that renders an alternate toast viewport at `fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[100] w-auto max-w-[360px]` for Easy-view undo toasts. Existing `Toaster` viewport (top-mobile, bottom-right desktop) handles non-undo toasts. Add `<UndoToastViewport />` mounting in `app/(dashboard)/crm/layout.tsx` (created in Plan 11-07).

    Use `<ToastPrimitives.Viewport>` from `@radix-ui/react-toast` — shadow the className. Note: this requires that the undo toast specifies a viewport region; if the existing Radix toast cannot route per-toast to a different viewport, simplify by overriding the existing `<Toaster>` className conditionally on Easy-view pages. Document the chosen approach in a comment at the top of `UndoToastViewport.tsx`.
  </actions>
  <verification>
    `npm run typecheck` passes.
    `npm test -- ToggleViewButton` passes (render test: shows "Advanced view →" when currentMode='easy', "Easy view →" when currentMode='advanced', returns null when targetMode equals currentMode).
    Manual: open a Storybook-style fixture and resize to 360px — pill is positioned 80px from bottom, doesn't overlap iOS Safari toolbar.
  </verification>
</task>

## Verification

- `npm run typecheck` clean.
- `npm test -- module-home` passes — at least one render test per component (4 total).
- No imports from CRM-specific code (Easy view module-agnostic): `grep -r "lib/crm\|app/(dashboard)/crm" components/module-home/` returns nothing.
- Component files individually under 200 LOC each (small, focused units).

## Out of scope

- Do NOT build the CRM Easy view page or any data-fetching here — that is Plan 11-07.
- Do NOT call any API routes from these components themselves — they receive endpoint URLs as props.
- Do NOT add a sonner / react-hot-toast dependency. Existing `@radix-ui/react-toast` (per package.json) is the project standard.
- Do NOT add a `tailwindcss-safe-area` plugin — use inline `env(safe-area-inset-bottom)` style (RESEARCH A section 9 escape hatch).
- Do NOT touch `Toaster` global mount in root layout — additive only via new `UndoToastViewport`.

## REQ-IDs closed

- UX-01 (ModuleHome shared component + manifest pattern) — code shipped here, wired in 11-07.
- UX-03 (ToggleViewButton component) — code shipped here, mounted in 11-07/08.

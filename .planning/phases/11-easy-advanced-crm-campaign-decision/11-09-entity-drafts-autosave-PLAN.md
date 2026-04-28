---
phase: 11
plan_id: 11-09
title: entity_drafts autosave hook + merge-on-load + soft-warning banner
wave: 5
depends_on: [11-01, 11-07, 11-08]
files_modified:
  - lib/crm/entity-drafts/use-entity-draft.ts
  - lib/crm/entity-drafts/load-with-draft.ts
  - lib/crm/entity-drafts/conflict-detection.ts
  - components/crm/DraftConflictBanner.tsx
  - app/api/crm/drafts/route.ts
  - app/(dashboard)/crm/contacts/[id]/page.tsx
  - app/(dashboard)/crm/deals/[id]/page.tsx
autonomous: true
estimated_loc: 420
estimated_dev_minutes: 110
---

## Objective

Wire the `entity_drafts` table (created in Plan 11-01) into the CRM contact/deal edit forms so that unsaved changes survive an Easy↔Advanced view switch (UX-06, UX-07). Provides a `useEntityDraft()` React hook that debounces every keystroke 1s, POSTS to `/api/crm/drafts`, and includes a `tab_id` (sessionStorage UUID) for the 60-second last-write-wins conflict banner. RSC pages call `loadEntityWithDraft()` to overlay any draft on the DB row at render time. Closes the view-desync prevention requirement.

## must_haves

- `useEntityDraft(opts)` hook: debounces every input change 1s (NOT on submit), POSTs to `/api/crm/drafts` upserting `(user_id, entity_type, entity_id)`. Returns `{ draftData, conflictDetected, save, clear }`.
- `loadEntityWithDraft(entityType, entityId, userId)` server-side helper: parallel-fetches the DB row + draft row, overlays draft fields on DB fields field-by-field (draft wins per CONTEXT.md "last-write-wins"). Sets `_hasDraft` and `_draftModifiedAt` flags.
- `tab_id` UUID stored in `sessionStorage` at hook mount; included in `draft_data._tab_id` JSONB. Conflict banner appears when `last_modified_at > NOW - 60s` AND `draft_data._tab_id !== currentTabId`. (CONTEXT.md locked behavior)
- `<DraftConflictBanner />` client component: shows "This draft was edited from another tab" with `[Reload]` button (no hard-block — soft warning per CONTEXT.md).
- Draft is deleted on successful entity save: `clear()` API DELETEs the draft row.
- 7-day TTL handled by Plan 11-06's nightly cleanup workflow — not by this plan.
- API route `/api/crm/drafts` handles POST (upsert), DELETE (on save), and is owner-only RLS-enforced.
- Contact-edit and deal-edit pages call `loadEntityWithDraft()` and pass result to client form components.

## Tasks

<task id="0">
  <title>Read-only checkpoint: detect existing contact/deal [id] pages, decide scope for Task 3</title>
  <files></files>
  <actions>
    Run BEFORE Task 1. This is a read-only discovery step that determines the wiring shape Task 3 takes.

    Steps:
    1. `Glob` `app/(dashboard)/crm/contacts/[id]/**` — record what exists (page.tsx? form components?).
    2. `Glob` `app/(dashboard)/crm/deals/[id]/**` — same.
    3. Decide branch:
       - **Branch A — Pages exist**: Task 3 wraps the existing RSC + form components with `loadEntityWithDraft()` and `useEntityDraft()`. No new files; modify in place.
       - **Branch B — No pages exist**: Task 3 creates a minimal RSC at `app/(dashboard)/crm/contacts/[id]/page.tsx` (and deals equivalent) plus a client `<ContactEditForm>` (and `<DealEditForm>`) component file. Use shadcn `Form` + `Input` patterns from the existing CRM advanced views as a template.
    4. Document the decision in a comment at the top of Task 3's first file: `// Plan 11-09 Task 0 found: [Branch A — wrapping existing] OR [Branch B — created new]`.

    No edits in this task — purely a discovery + decision checkpoint.
  </actions>
  <verification>
    Decision recorded. No file changes in this task.
    `Glob` results captured in execution log.
  </verification>
</task>

<task id="1">
  <title>Build /api/crm/drafts route + load-with-draft helper</title>
  <files>app/api/crm/drafts/route.ts, lib/crm/entity-drafts/load-with-draft.ts</files>
  <actions>
    **`/api/crm/drafts/route.ts`** — POST + DELETE:
    - Auth via `getUserOrg()`.
    - **POST**: Zod validation `{ entityType: 'contact'|'deal'|'company', entityId: string|null, draftData: Record<string, any> }`. UPSERT to `entity_drafts` keyed by `(user_id, entity_type, entity_id)` (UNIQUE constraint from Plan 11-01). Update `last_modified_at = NOW()` and `expires_at = NOW() + INTERVAL '7 days'`. Include `_tab_id` field passed through in `draft_data` for conflict detection. Return 200 `{ draftId, lastModifiedAt }`.
    - **DELETE**: Zod validation `{ entityType, entityId }`. DELETE from `entity_drafts WHERE user_id = auth.uid() AND entity_type = ? AND entity_id = ?`. Return 200 `{ deleted: bool }`.
    - RLS does the heavy lifting (owner-only per migration 39 policies); admin client should NOT be used here — use the user-scoped client so RLS enforces.

    **`lib/crm/entity-drafts/load-with-draft.ts`** per RESEARCH A section 10:
    ```typescript
    import type { SupabaseClient } from '@supabase/supabase-js'

    export interface EntityWithDraft<T> {
      data: T | null
      hasDraft: boolean
      draftModifiedAt: string | null
      draftTabId: string | null
    }

    export async function loadEntityWithDraft<T extends Record<string, any>>(
      supabase: SupabaseClient,
      table: 'contacts' | 'deals' | 'companies',
      entityType: 'contact' | 'deal' | 'company',
      entityId: string,
      userId: string
    ): Promise<EntityWithDraft<T>> {
      const [dbRow, draft] = await Promise.all([
        supabase.from(table).select('*').eq('id', entityId).single(),
        supabase.from('entity_drafts')
          .select('draft_data, last_modified_at')
          .eq('user_id', userId)
          .eq('entity_type', entityType)
          .eq('entity_id', entityId)
          .maybeSingle(),
      ])

      if (!draft.data) {
        return { data: dbRow.data as T, hasDraft: false, draftModifiedAt: null, draftTabId: null }
      }

      const draftData = draft.data.draft_data as Record<string, any>
      const tabId = draftData?._tab_id ?? null
      // strip _tab_id from displayed payload but keep it for conflict detection
      const { _tab_id, ...displayDraft } = draftData

      return {
        data: { ...dbRow.data, ...displayDraft } as T,
        hasDraft: true,
        draftModifiedAt: draft.data.last_modified_at as string,
        draftTabId: tabId,
      }
    }
    ```
  </actions>
  <verification>
    `npm run typecheck` clean.
    Manual: `curl -X POST /api/crm/drafts` with valid payload (using a session cookie from logged-in test user) → row appears in `entity_drafts`.
    `curl -X DELETE` → row removed.
    `loadEntityWithDraft()` returns merged data when both DB row + draft exist.
  </verification>
</task>

<task id="2">
  <title>Build useEntityDraft hook + conflict banner</title>
  <files>lib/crm/entity-drafts/use-entity-draft.ts, lib/crm/entity-drafts/conflict-detection.ts, components/crm/DraftConflictBanner.tsx</files>
  <actions>
    **`use-entity-draft.ts`** — client hook:
    ```typescript
    'use client'
    import { useEffect, useRef, useState, useCallback } from 'react'

    interface UseDraftOpts<T> {
      entityType: 'contact' | 'deal' | 'company'
      entityId: string | null    // null for new-entity draft
      initialDraft: T | null     // server-rendered draft, if present
      initialTabId: string | null
      initialModifiedAt: string | null
      currentValues: T           // form's current values (controlled inputs)
    }

    export function useEntityDraft<T extends Record<string, any>>(opts: UseDraftOpts<T>) {
      const tabIdRef = useRef<string | null>(null)
      const [conflictDetected, setConflictDetected] = useState(false)

      // Generate / read tab id
      useEffect(() => {
        let stored = sessionStorage.getItem('draggonnb_tab_id')
        if (!stored) {
          stored = crypto.randomUUID()
          sessionStorage.setItem('draggonnb_tab_id', stored)
        }
        tabIdRef.current = stored

        // Conflict check on mount: was another tab the last writer within 60s?
        if (opts.initialModifiedAt && opts.initialTabId && opts.initialTabId !== stored) {
          const ageMs = Date.now() - new Date(opts.initialModifiedAt).getTime()
          if (ageMs < 60_000) setConflictDetected(true)
        }
      }, [opts.initialModifiedAt, opts.initialTabId])

      // Debounced save on every keystroke (1s — CONTEXT.md locked)
      useEffect(() => {
        if (!tabIdRef.current) return
        const timer = setTimeout(() => {
          fetch('/api/crm/drafts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              entityType: opts.entityType,
              entityId: opts.entityId,
              draftData: { ...opts.currentValues, _tab_id: tabIdRef.current },
            }),
          }).catch(() => {/* silent — draft is best-effort */})
        }, 1000)
        return () => clearTimeout(timer)
      }, [opts.currentValues, opts.entityType, opts.entityId])

      const clear = useCallback(async () => {
        await fetch('/api/crm/drafts', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entityType: opts.entityType, entityId: opts.entityId }),
        })
      }, [opts.entityType, opts.entityId])

      return { conflictDetected, dismissConflict: () => setConflictDetected(false), clear }
    }
    ```

    **`conflict-detection.ts`** — extracted helpers if needed (e.g. `isStaleDraft(modifiedAt: string, ttlSeconds: number)`). Optional — can be inlined in the hook if small.

    **`<DraftConflictBanner />`** — shadcn `Alert` variant `warning`:
    ```tsx
    'use client'
    export function DraftConflictBanner({ onReload, onDismiss }: { onReload: () => void; onDismiss: () => void }) {
      return (
        <Alert variant="warning" className="mb-4">
          <AlertTitle>This draft was edited from another tab</AlertTitle>
          <AlertDescription className="flex justify-between items-center">
            Your view may be out of sync. Reload to see the latest changes.
            <div className="flex gap-2">
              <Button onClick={onReload} size="sm">Reload</Button>
              <Button onClick={onDismiss} size="sm" variant="ghost">Dismiss</Button>
            </div>
          </AlertDescription>
        </Alert>
      )
    }
    ```
  </actions>
  <verification>
    `npm run typecheck` clean.
    Unit test: `useEntityDraft` triggers a debounced POST after 1s of stable input, cancels prior timer on rapid changes.
    Manual two-tab test: open same contact in 2 tabs, type in tab A → tab B reload shows banner.
  </verification>
</task>

<task id="3">
  <title>Wire useEntityDraft + loadEntityWithDraft into contact + deal edit pages</title>
  <files>app/(dashboard)/crm/contacts/[id]/page.tsx, app/(dashboard)/crm/deals/[id]/page.tsx</files>
  <actions>
    Use the branch decision from Task 0 (Branch A = pages exist; Branch B = create new).

    **Branch A — pages exist (wrap)**:
    1. Open existing `app/(dashboard)/crm/contacts/[id]/page.tsx` and `deals/[id]/page.tsx`.
    2. Replace the existing direct DB row fetch with `loadEntityWithDraft(supabase, 'contacts', 'contact', params.id, user.id)`.
    3. Pass `data`, `hasDraft`, `draftModifiedAt`, `draftTabId` props to the existing client form component.
    4. In the existing client form component, call `useEntityDraft({ entityType: 'contact', entityId, initialDraft, initialTabId, initialModifiedAt, currentValues: formState })`.
    5. Render `<DraftConflictBanner>` above the form when `conflictDetected === true`.
    6. On form Save: call existing save mutation → on success, call `clear()` from hook.

    **Branch B — pages do not exist (create minimal pair)**:
    1. Create `app/(dashboard)/crm/contacts/[id]/page.tsx` as RSC: `loadEntityWithDraft(...)` → render `<ContactEditForm>` client island with the merged data.
    2. Create `app/(dashboard)/crm/contacts/[id]/_components/ContactEditForm.tsx` (client) using shadcn `Form` + `Input`. Fields: first_name, last_name, email, phone (whatever crm_contacts table has). Wire `useEntityDraft()` into the controlled form state. Submit calls `PATCH /api/crm/contacts/{id}` (assume exists; if not, defer Save behaviour to v3.1 — autosave-to-draft is the point of this plan).
    3. Same pattern for `app/(dashboard)/crm/deals/[id]/page.tsx` + `DealEditForm.tsx`.

    Document a code comment at top of each page: "Plan 11-09: entity_drafts autosave wiring. See lib/crm/entity-drafts/. [Branch A | Branch B] from Task 0."

    Test focus is in Plan 11-12 (view-desync E2E test) — this plan ships the wiring.
  </actions>
  <verification>
    Visit `/dashboard/crm/contacts/{id}` (an existing test contact) → form loads → type into a field → 1s later, network tab shows POST `/api/crm/drafts` with debounced payload.
    Switch to `/dashboard/crm/advanced` → switch back to the same contact → field still shows the typed value (loaded from `entity_drafts`).
    Click Save → entity_drafts row deleted (verify via DB query).
    `npm run build` succeeds.
  </verification>
</task>

## Verification

- `npm run typecheck` clean; `npm run build` succeeds.
- Manual E2E: open contact, type, switch to Advanced, switch back, content preserved.
- Two-tab conflict: edit in tab A within 60s → tab B's reload shows banner with [Reload] button.
- Draft TTL handled by Plan 11-06's cleanup workflow — verify a draft created with `expires_at` in the past gets removed by next cleanup run.
- Plan 11-12 will include the formal integration test for UX-06.

## Out of scope

- Do NOT add hard-block conflict resolution — soft warning only, per CONTEXT.md ("last-write-wins with soft warning banner").
- Do NOT add multi-tier merge UI (e.g. side-by-side diff) — explicit anti-feature in CONTEXT.md.
- Do NOT extend draft autosave to non-CRM modules — Phase 11 scope is CRM only.
- Do NOT add per-field draft tracking or undo history — only blob-level last-write-wins.
- Do NOT touch the `companies` page if no `[id]` detail page exists — defer to v3.1.

## REQ-IDs closed

- UX-06 (view-desync integration test — full closure when Plan 11-12 ships the test).
- UX-07 (`entity_drafts` table stores unsaved form state across view switches — full closure here).

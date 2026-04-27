/**
 * UX-06: View desync prevention integration tests
 *
 * Verifies that edits made in Easy view are preserved and visible when the user
 * switches to Advanced view (draft overlay applied by loadEntityWithDraft), and
 * that switching back does not lose any unsaved draft data.
 *
 * Uses a mocked Supabase admin client backed by in-memory Maps — no network calls.
 *
 * @vitest-environment node
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ─── Mock Supabase admin client ───────────────────────────────────────────────
// Backed by module-level Maps so tests can inspect state across calls.
const draftStore = new Map<string, { draft_data: Record<string, unknown>; last_modified_at: string }>()
const dbRowStore = new Map<string, Record<string, unknown>>([
  [
    'contact-123',
    {
      id: 'contact-123',
      first_name: 'Jane',
      last_name: 'Doe',
      email: 'jane@example.com',
      phone: null,
      company: null,
      job_title: null,
      status: 'active',
      notes: null,
      tags: null,
    },
  ],
])

vi.mock('@/lib/supabase/admin', () => {
  /**
   * Build a chainable query builder for a given resolved value.
   * Supports .select().eq().maybeSingle() and .single() patterns used by
   * loadEntityWithDraft.
   */
  function makeBuilder(resolvedValue: { data: unknown; error: unknown }) {
    const b: Record<string, unknown> = {}
    const terminal = () => Promise.resolve(resolvedValue)
    b['then'] = (resolve: (v: { data: unknown; error: unknown }) => void) =>
      terminal().then(resolve)
    b['single'] = vi.fn().mockResolvedValue(resolvedValue)
    b['maybeSingle'] = vi.fn().mockResolvedValue(resolvedValue)
    for (const m of [
      'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq',
      'gte', 'lte', 'gt', 'lt', 'like', 'ilike', 'is', 'not', 'in',
      'contains', 'filter', 'or', 'order', 'limit', 'range', 'match',
    ]) {
      b[m] = vi.fn().mockReturnValue(b)
    }
    return b
  }

  return {
    createAdminClient: () => ({
      from: (table: string) => {
        if (table === 'contacts') {
          return {
            select: () => ({
              eq: (_col: string, val: string) => ({
                single: () => Promise.resolve({ data: dbRowStore.get(val) ?? null, error: null }),
                maybeSingle: () => Promise.resolve({ data: dbRowStore.get(val) ?? null, error: null }),
              }),
            }),
          }
        }

        if (table === 'entity_drafts') {
          return {
            select: () => ({
              eq: (_col1: string, _val1: string) => ({
                eq: (_col2: string, _val2: string) => ({
                  eq: (_col3: string, val3: string) => ({
                    maybeSingle: () =>
                      Promise.resolve({
                        data: draftStore.get(val3) ?? null,
                        error: null,
                      }),
                    single: () =>
                      Promise.resolve({
                        data: draftStore.get(val3) ?? null,
                        error: null,
                      }),
                  }),
                }),
              }),
            }),
            upsert: (row: { entity_id: string; draft_data: Record<string, unknown> }) => {
              draftStore.set(row.entity_id, {
                draft_data: row.draft_data,
                last_modified_at: new Date().toISOString(),
              })
              return Promise.resolve({ data: row, error: null })
            },
            delete: () => ({
              eq: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ data: null, error: null }),
                }),
              }),
            }),
          }
        }

        return makeBuilder({ data: null, error: null })
      },
    }),
  }
})

vi.mock('@/lib/auth/get-user-org', () => ({
  getUserOrg: () =>
    Promise.resolve({
      data: {
        userId: 'user-456',
        organizationId: 'org-789',
        role: 'admin',
        user: { id: 'user-456' },
        organization: { id: 'org-789' },
      },
      error: null,
    }),
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UX-06: view-desync prevention', () => {
  beforeEach(() => {
    draftStore.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('edits in Easy view are visible in Advanced view after switch', async () => {
    /**
     * Scenario:
     * 1. User edits contact 'contact-123' in Easy view — their browser debounce fires
     *    a POST to /api/crm/drafts, which upserts into entity_drafts.
     * 2. User switches to Advanced view — the page calls loadEntityWithDraft.
     * 3. loadEntityWithDraft overlays the draft_data on the DB row (draft wins
     *    field-by-field).
     * 4. The merged result shows the edited first_name, not the original DB value.
     */

    // Step 1 — simulate the POST /api/crm/drafts upsert (what the debounce does)
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    await supabase.from('entity_drafts').upsert({
      entity_id: 'contact-123',
      user_id: 'user-456',
      entity_type: 'contact',
      organization_id: 'org-789',
      draft_data: {
        first_name: 'Janet',  // user typed 'Janet' instead of 'Jane'
        last_name: 'Doe',
        email: 'jane@example.com',
        _tab_id: 'tab-abc',
      },
      last_modified_at: new Date().toISOString(),
    })

    // Confirm draft was stored
    expect(draftStore.has('contact-123')).toBe(true)

    // Step 2 — loadEntityWithDraft is called when Advanced view opens
    const { loadEntityWithDraft } = await import('@/lib/crm/entity-drafts/load-with-draft')
    const result = await loadEntityWithDraft(
      supabase as any,
      'contacts',
      'contact',
      'contact-123',
      'user-456'
    )

    // Step 3 — assert the merged result shows the edited name
    expect(result.hasDraft).toBe(true)
    expect((result.data as Record<string, unknown>)?.first_name).toBe('Janet')

    // Original DB value is overridden by draft
    expect(dbRowStore.get('contact-123')?.first_name).toBe('Jane') // DB unchanged
    expect((result.data as Record<string, unknown>)?.first_name).toBe('Janet') // overlay applied

    // _tab_id stripped from display payload
    expect((result.data as Record<string, unknown>)?._tab_id).toBeUndefined()
    // draftTabId exposed separately for conflict detection
    expect(result.draftTabId).toBe('tab-abc')
  })

  it('switching back to Easy view does not lose unsaved draft', async () => {
    /**
     * Scenario:
     * 1. An existing draft is present for user-456 / contact-123 (e.g., from a prior tab).
     * 2. User opens Easy view (loadEntityWithDraft is called by the RSC).
     * 3. Form initial values reflect the draft, not the bare DB row.
     * 4. User edits further — a new upsert fires (1s debounce simulated by direct call).
     * 5. User navigates away and back — loadEntityWithDraft again returns the latest draft.
     */

    // Step 1 — pre-seed draft
    const { createAdminClient } = await import('@/lib/supabase/admin')
    const supabase = createAdminClient()
    await supabase.from('entity_drafts').upsert({
      entity_id: 'contact-123',
      user_id: 'user-456',
      entity_type: 'contact',
      organization_id: 'org-789',
      draft_data: {
        first_name: 'Draft Name',
        last_name: 'Doe',
        email: 'jane@example.com',
        _tab_id: 'tab-xyz',
      },
      last_modified_at: new Date(Date.now() - 120_000).toISOString(), // 2 minutes ago
    })

    // Step 2 — Easy view RSC loads entity + draft
    const { loadEntityWithDraft } = await import('@/lib/crm/entity-drafts/load-with-draft')
    const firstLoad = await loadEntityWithDraft(
      supabase as any,
      'contacts',
      'contact',
      'contact-123',
      'user-456'
    )

    // Step 3 — form initial value is 'Draft Name', not DB value 'Jane'
    expect(firstLoad.hasDraft).toBe(true)
    expect((firstLoad.data as Record<string, unknown>)?.first_name).toBe('Draft Name')

    // Step 4 — user edits further in the form; 1s debounce fires another upsert
    await supabase.from('entity_drafts').upsert({
      entity_id: 'contact-123',
      user_id: 'user-456',
      entity_type: 'contact',
      organization_id: 'org-789',
      draft_data: {
        first_name: 'Further Edit',
        last_name: 'Doe',
        email: 'jane@example.com',
        _tab_id: 'tab-xyz',
      },
      last_modified_at: new Date().toISOString(),
    })

    // Step 5 — user navigates away and back; RSC calls loadEntityWithDraft again
    const secondLoad = await loadEntityWithDraft(
      supabase as any,
      'contacts',
      'contact',
      'contact-123',
      'user-456'
    )

    // Latest edit is still present — no state lost
    expect(secondLoad.hasDraft).toBe(true)
    expect((secondLoad.data as Record<string, unknown>)?.first_name).toBe('Further Edit')
  })
})

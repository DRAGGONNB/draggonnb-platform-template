// Plan 11-09: Server-side helper — parallel-fetches DB row + draft, overlays draft on DB row.
// Draft wins field-by-field (last-write-wins). Strips _tab_id from displayed payload.
import type { SupabaseClient } from '@supabase/supabase-js'

export interface EntityWithDraft<T> {
  data: T | null
  hasDraft: boolean
  draftModifiedAt: string | null
  draftTabId: string | null
}

export async function loadEntityWithDraft<T extends Record<string, unknown>>(
  supabase: SupabaseClient,
  table: 'contacts' | 'deals' | 'companies',
  entityType: 'contact' | 'deal' | 'company',
  entityId: string,
  userId: string
): Promise<EntityWithDraft<T>> {
  const [dbResult, draftResult] = await Promise.all([
    supabase.from(table).select('*').eq('id', entityId).single(),
    supabase
      .from('entity_drafts')
      .select('id, draft_data, last_modified_at')
      .eq('user_id', userId)
      .eq('entity_type', entityType)
      .eq('entity_id', entityId)
      .maybeSingle(),
  ])

  if (!draftResult.data) {
    return {
      data: (dbResult.data as T) ?? null,
      hasDraft: false,
      draftModifiedAt: null,
      draftTabId: null,
    }
  }

  const draftData = draftResult.data.draft_data as Record<string, unknown>
  const tabId = (draftData?._tab_id as string | undefined) ?? null
  // Strip _tab_id from displayed payload; keep it available for conflict detection via draftTabId
  const { _tab_id, ...displayDraft } = draftData

  return {
    data: { ...(dbResult.data as Record<string, unknown>), ...displayDraft } as T,
    hasDraft: true,
    draftModifiedAt: draftResult.data.last_modified_at as string,
    draftTabId: tabId,
  }
}

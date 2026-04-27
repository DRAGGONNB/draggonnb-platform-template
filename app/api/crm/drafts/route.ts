// Plan 11-09: entity_drafts autosave API — POST (upsert) + DELETE (on save).
// Uses user-scoped client so RLS (owner-only, migration 39) does the authorization.
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getUserOrg } from '@/lib/auth/get-user-org'

const postSchema = z.object({
  entityType: z.enum(['contact', 'deal', 'company']),
  entityId: z.string().uuid().nullable(),
  draftData: z.record(z.unknown()),
})

const deleteSchema = z.object({
  entityType: z.enum(['contact', 'deal', 'company']),
  entityId: z.string().uuid().nullable(),
})

// POST — upsert draft (keyed by user_id + entity_type + entity_id)
export async function POST(request: Request) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { entityType, entityId, draftData } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('entity_drafts')
    .upsert(
      {
        organization_id: userOrg.organizationId,
        user_id: userOrg.userId,
        entity_type: entityType,
        entity_id: entityId,
        draft_data: draftData,
        last_modified_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
      { onConflict: 'user_id,entity_type,entity_id' }
    )
    .select('id, last_modified_at')
    .single()

  if (error) {
    console.error('[drafts POST] upsert error:', error)
    return NextResponse.json({ error: 'Failed to save draft' }, { status: 500 })
  }

  return NextResponse.json({ draftId: data.id, lastModifiedAt: data.last_modified_at })
}

// DELETE — remove draft after successful entity save
export async function DELETE(request: Request) {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = deleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { entityType, entityId } = parsed.data
  const supabase = await createClient()

  const query = supabase
    .from('entity_drafts')
    .delete()
    .eq('user_id', userOrg.userId)
    .eq('entity_type', entityType)

  // entity_id can be null (new-entity draft) — match on IS NULL or specific UUID
  const finalQuery = entityId ? query.eq('entity_id', entityId) : query.is('entity_id', null)

  const { error } = await finalQuery

  if (error) {
    console.error('[drafts DELETE] error:', error)
    return NextResponse.json({ error: 'Failed to delete draft' }, { status: 500 })
  }

  return NextResponse.json({ deleted: true })
}

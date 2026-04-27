import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// VALIDATION
// ============================================================================

const RequestSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['contact', 'deal', 'company']),
  cardType: z.string().min(1),
  organizationId: z.string().uuid(),
})

// ============================================================================
// POST /api/crm/easy-view/dismiss
// ============================================================================

export async function POST(request: Request) {
  // Auth
  const supabaseUser = await createClient()
  const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
  if (authError || !user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse + validate
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 })
  }

  const { entityId, entityType, cardType, organizationId } = parsed.data

  // Verify org membership
  const supabase = createAdminClient()
  const { data: membership } = await supabase
    .from('organization_users')
    .select('user_id')
    .eq('organization_id', organizationId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // UPSERT: (user_id, suggestion_card_type, entity_id) — unique constraint in migration 38
    // On conflict: reset expires_at to 7 days from now (refresh the dismissal window)
    const { error: upsertError } = await supabase
      .from('crm_action_dismissals')
      .upsert({
        organization_id: organizationId,
        user_id: user.id,
        suggestion_card_type: cardType,
        entity_type: entityType,
        entity_id: entityId,
        dismissed_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      }, { onConflict: 'user_id,suggestion_card_type,entity_id' })

    if (upsertError) {
      console.error('[crm/easy-view/dismiss] Upsert error:', upsertError)
      return Response.json({ error: 'Failed to dismiss' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('[crm/easy-view/dismiss] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

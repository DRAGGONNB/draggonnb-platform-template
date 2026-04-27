import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// ============================================================================
// VALIDATION
// ============================================================================

const RequestSchema = z.object({
  mode: z.enum(['easy', 'advanced']),
})

// ============================================================================
// POST /api/crm/ui-mode
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

  const { mode } = parsed.data

  try {
    const supabase = createAdminClient()
    // Upsert user_profiles row with ui_mode (migration 40 adds ui_mode column)
    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert({
        id: user.id,
        ui_mode: mode,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (updateError) {
      console.error('[crm/ui-mode] Update error:', updateError)
      return Response.json({ error: 'Failed to update UI mode' }, { status: 500 })
    }

    return Response.json({ mode })
  } catch (err) {
    console.error('[crm/ui-mode] Error:', err)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

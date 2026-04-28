/**
 * GET /api/brand-voice
 * Returns the org's current brand voice prompt and wizard settings.
 *
 * Used by:
 * - Brand Voice Wizard (10-06) to pre-populate the re-run form
 * - Any UI showing the current brand voice status
 *
 * Returns:
 * - 200 with brand_voice_prompt, example_phrases, forbidden_topics, brand_voice_updated_at
 * - 401 if not authenticated
 * - 404 if the org has no client_profile row yet (first-time setup)
 * - 500 on DB error
 *
 * Note: Uses createAdminClient() directly — NOT fetch('/api/brand-voice', { headers: { cookie: '' } })
 * which always 401s in server context. The admin client bypasses RLS for service-role reads.
 */

import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const supa = createAdminClient()
  const { data, error } = await supa
    .from('client_profiles')
    .select('brand_voice_prompt, example_phrases, forbidden_topics, brand_voice_updated_at')
    .eq('organization_id', userOrg.organizationId)
    .maybeSingle()

  if (error) {
    return Response.json({ error: 'fetch_failed', detail: error.message }, { status: 500 })
  }

  if (!data) {
    return Response.json({ error: 'not_found' }, { status: 404 })
  }

  return Response.json(data)
}

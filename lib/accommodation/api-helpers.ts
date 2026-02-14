import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkFeatureAccess } from '@/lib/tier/feature-gate'

export interface AuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
}

/**
 * Authenticate + feature-gate for accommodation API routes.
 * Returns AuthContext on success, or a NextResponse error.
 */
export async function getAccommodationAuth(): Promise<AuthContext | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData?.organization_id) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  const { data: org } = await supabase
    .from('organizations')
    .select('subscription_tier')
    .eq('id', userData.organization_id)
    .single()

  const access = checkFeatureAccess(org?.subscription_tier || 'core', 'accommodation_module')
  if (!access.allowed) {
    return NextResponse.json({ error: access.reason, upgradeRequired: access.upgradeRequired }, { status: 403 })
  }

  return {
    supabase,
    userId: user.id,
    organizationId: userData.organization_id,
  }
}

/**
 * Type guard to check if auth result is an error response.
 */
export function isAuthError(result: AuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

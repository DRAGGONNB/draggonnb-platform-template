import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId, getServiceRoleOrgId } from '@/lib/auth/get-user-org'

export interface RestaurantAuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
}

export interface ServiceAuthContext {
  supabase: ReturnType<typeof createAdminClient>
  organizationId: string
  isServiceAuth: boolean
}

/**
 * Authenticate for restaurant API routes.
 * Uses organization_users junction table (correct pattern — no 'users' table).
 */
export async function getRestaurantAuth(
  request?: NextRequest
): Promise<RestaurantAuthContext | NextResponse> {
  // Service role auth (N8N / cron)
  if (request) {
    const serviceOrgId = getServiceRoleOrgId(request)
    if (serviceOrgId) {
      return {
        supabase: await createClient(),
        userId: 'service',
        organizationId: serviceOrgId,
      }
    }
  }

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organizationId = await getOrgId(supabase, user.id)
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  return { supabase, userId: user.id, organizationId }
}

/**
 * Dual auth: supports both user sessions and N8N service-role Bearer tokens.
 */
export async function getRestaurantDualAuth(
  request: NextRequest
): Promise<ServiceAuthContext | NextResponse> {
  const serviceOrgId = getServiceRoleOrgId(request)
  if (serviceOrgId) {
    return {
      supabase: createAdminClient(),
      organizationId: serviceOrgId,
      isServiceAuth: true,
    }
  }

  const auth = await getRestaurantAuth()
  if (isRestaurantAuthError(auth)) return auth

  return {
    supabase: createAdminClient(),
    organizationId: auth.organizationId,
    isServiceAuth: false,
  }
}

export function isRestaurantAuthError(
  result: RestaurantAuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}

export function isDualAuthError(
  result: ServiceAuthContext | NextResponse
): result is NextResponse {
  return result instanceof NextResponse
}

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getOrgId } from '@/lib/auth/get-user-org'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ElijahRoleType } from './types'

export interface ElijahAuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>
  userId: string
  organizationId: string
}

/**
 * Auth helper for Elijah API routes.
 * Returns ElijahAuthContext on success, or NextResponse error.
 * Pattern matches accommodation module's getAccommodationAuth().
 */
export async function getElijahAuth(): Promise<ElijahAuthContext | NextResponse> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const organizationId = await getOrgId(supabase, user.id)
  if (!organizationId) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
  }

  return { supabase, userId: user.id, organizationId }
}

/**
 * Type guard to check if auth result is an error response.
 */
export function isAuthError(result: ElijahAuthContext | NextResponse): result is NextResponse {
  return result instanceof NextResponse
}

/**
 * Get the Elijah member record for a user in their organization.
 */
export async function getElijahMember(
  supabase: SupabaseClient | Awaited<ReturnType<typeof createClient>>,
  userId: string,
  organizationId: string
) {
  const { data } = await supabase
    .from('elijah_member')
    .select('id, display_name, phone, household_id')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .single()

  return data
}

/**
 * Get all Elijah roles for a member.
 */
export async function getElijahMemberRoles(
  supabase: SupabaseClient | Awaited<ReturnType<typeof createClient>>,
  memberId: string
): Promise<ElijahRoleType[]> {
  const { data } = await supabase
    .from('elijah_member_role')
    .select('role')
    .eq('member_id', memberId)

  return (data || []).map(r => r.role as ElijahRoleType)
}

/**
 * Check if a member has one of the required roles.
 */
export async function hasElijahRole(
  supabase: SupabaseClient | Awaited<ReturnType<typeof createClient>>,
  memberId: string,
  requiredRoles: ElijahRoleType[]
): Promise<boolean> {
  const roles = await getElijahMemberRoles(supabase, memberId)
  return roles.some(r => requiredRoles.includes(r))
}

/**
 * Read sensitive profile with audit logging.
 * Only admin and dispatcher roles can access.
 */
export async function readSensitiveProfile(memberId: string, accessorMemberId: string, ipAddress: string | null) {
  const admin = createAdminClient()

  await admin.from('elijah_sensitive_access_audit').insert({
    member_id: memberId,
    accessed_by: accessorMemberId,
    access_type: 'sensitive_profile_read',
    accessed_at: new Date().toISOString(),
    ip_address: ipAddress,
  })

  const { data, error } = await admin
    .from('elijah_member_sensitive_profile')
    .select('*')
    .eq('member_id', memberId)
    .single()

  return { data, error }
}

/**
 * Read farm access details with audit logging.
 * Only admin, dispatcher, and fire_coordinator roles can access.
 */
export async function readFarmAccess(farmId: string, accessorMemberId: string, ipAddress: string | null) {
  const admin = createAdminClient()

  await admin.from('elijah_sensitive_access_audit').insert({
    member_id: farmId,
    accessed_by: accessorMemberId,
    access_type: 'farm_access_read',
    accessed_at: new Date().toISOString(),
    ip_address: ipAddress,
  })

  const { data, error } = await admin
    .from('elijah_fire_farm')
    .select('*')
    .eq('id', farmId)
    .single()

  return { data, error }
}

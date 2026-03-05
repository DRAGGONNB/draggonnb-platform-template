import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface UserOrg {
  userId: string
  email: string
  fullName: string
  organizationId: string
  role: string
  organization: {
    id: string
    name: string
    subscription_tier: string
    subscription_status: string
  }
}

export interface GetUserOrgResult {
  data: UserOrg | null
  error: string | null
}

const USER_SELECT = `
  id,
  email,
  full_name,
  organization_id,
  role,
  organizations (
    id,
    name,
    subscription_tier,
    subscription_status
  )
`

/**
 * Auto-create a user record from auth metadata when the users table row is missing.
 * This handles users who signed up before the signup flow was fixed to link org.
 */
async function ensureUserRecord(
  supabase: SupabaseClient,
  authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }
): Promise<{ organizationId: string | null; error: string | null }> {
  const email = authUser.email || ''
  const fullName = (authUser.user_metadata?.full_name as string) || email.split('@')[0]

  // Check if user owns an organization (created during signup but user row wasn't linked)
  const { data: ownedOrg } = await supabase
    .from('organizations')
    .select('id')
    .eq('owner_id', authUser.id)
    .limit(1)
    .single()

  if (!ownedOrg) {
    return { organizationId: null, error: 'No organization found for user' }
  }

  // Create the missing user record linked to their organization
  const { error: insertError } = await supabase.from('users').insert({
    id: authUser.id,
    email,
    full_name: fullName,
    organization_id: ownedOrg.id,
    role: 'admin',
    created_at: new Date().toISOString(),
  })

  if (insertError) {
    console.error('Failed to auto-create user record:', insertError)
    return { organizationId: null, error: 'Failed to create user record' }
  }

  return { organizationId: ownedOrg.id, error: null }
}

/**
 * Get the current authenticated user and their organization.
 * This function should be used in server components and API routes.
 */
export async function getUserOrg(): Promise<GetUserOrgResult> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { data: null, error: 'Not authenticated' }
    }

    // Get user record with organization
    let { data: userData, error: userError } = await supabase
      .from('users')
      .select(USER_SELECT)
      .eq('id', user.id)
      .single()

    // Auto-create user record if missing (handles pre-fix signups)
    if ((userError || !userData) && user.email) {
      console.warn('User record missing for authenticated user, attempting auto-create:', user.id)
      const autoResult = await ensureUserRecord(supabase, user)

      if (autoResult.error) {
        console.error('Auto-create failed:', autoResult.error)
        return { data: null, error: 'User not found' }
      }

      // Re-fetch with org join
      const refetch = await supabase
        .from('users')
        .select(USER_SELECT)
        .eq('id', user.id)
        .single()

      userData = refetch.data
      userError = refetch.error
    }

    if (userError || !userData) {
      console.error('Error fetching user data:', userError)
      return { data: null, error: 'User not found' }
    }

    if (!userData.organization_id) {
      return { data: null, error: 'User has no organization' }
    }

    // Handle organizations as either an object or array
    const org = Array.isArray(userData.organizations)
      ? userData.organizations[0]
      : userData.organizations

    if (!org) {
      return { data: null, error: 'Organization not found' }
    }

    return {
      data: {
        userId: userData.id,
        email: userData.email,
        fullName: userData.full_name,
        organizationId: userData.organization_id,
        role: userData.role,
        organization: {
          id: org.id,
          name: org.name,
          subscription_tier: org.subscription_tier,
          subscription_status: org.subscription_status,
        },
      },
      error: null,
    }
  } catch (error) {
    console.error('Unexpected error in getUserOrg:', error)
    return { data: null, error: 'Internal error' }
  }
}

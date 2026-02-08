import { createClient } from '@/lib/supabase/server'

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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
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
      `)
      .eq('id', user.id)
      .single()

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

// lib/auth/membership-proof.ts
// SSO-06: tenant_membership_proof primitive.
// Asserts (user_id, organization_id) row exists in organization_users with is_active=true.
// WHY maybeSingle() and not .single(): .single() errors when zero rows; maybeSingle() returns null.
// Missing membership is the expected case for cross-product users — not an error.

import { createAdminClient } from '@/lib/supabase/admin'

export async function verifyMembership(
  userId: string,
  organizationId: string
): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('organization_users')
      .select('id')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    return !!data
  } catch {
    // Treat admin client errors as no membership (safe default)
    return false
  }
}

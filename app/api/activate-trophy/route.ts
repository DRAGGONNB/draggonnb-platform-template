// app/api/activate-trophy/route.ts
// SSO-11 / NAV-03: explicit user-triggered Trophy OS activation.
// Requires org admin role. Calls the activate-trophy-module saga step.
// On success: returns { ok: true, trophyOrgId }; client then navigates to /api/sso/issue?target=trophy.

import { NextResponse } from 'next/server'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { activateTrophyModule } from '@/scripts/provisioning/steps/activate-trophy-module'
import type { ProvisioningJob } from '@/lib/provisioning/types'

export async function POST() {
  const { data: userOrg, error: authError } = await getUserOrg()

  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  // Org admin gate — only admins may trigger Trophy activation (NAV-04 + D6)
  if (userOrg.role !== 'admin') {
    return NextResponse.json(
      { error: 'Only org admins can activate Trophy OS' },
      { status: 403 }
    )
  }

  // Construct a minimal ProvisioningJob typed correctly — no `as any` cast.
  // The activate-trophy-module step only needs organizationId (and optionally subdomain/clientName).
  // UserOrg guarantees organization.id and organization.name are present.
  const tier = userOrg.organization.subscription_tier as ProvisioningJob['tier']
  const minimalJob: ProvisioningJob = {
    clientId: userOrg.organizationId,
    clientName: userOrg.organization.name,
    // email field — getUserOrg returns the auth email on the UserOrg object
    orgEmail: userOrg.email,
    // subscription_tier is stored as string; cast to the union — valid values match the type
    tier: (['starter', 'professional', 'enterprise', 'core', 'growth', 'scale'] as const).includes(
      tier as ProvisioningJob['tier']
    )
      ? tier
      : 'starter',
    createdResources: {
      organizationId: userOrg.organizationId,
    },
  }

  const result = await activateTrophyModule(minimalJob)

  if (!result.success) {
    return NextResponse.json(
      { error: result.error ?? 'Activation failed' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true, trophyOrgId: result.data?.trophyOrgId })
}

import { headers } from 'next/headers'
import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSidebar } from '@/lib/dashboard/build-sidebar'
import { SidebarClient } from './sidebar-client'

/**
 * Server component that fetches tenant_modules + user role,
 * builds the sidebar tree via buildSidebar(), then hands off to SidebarClient.
 * No client-side Supabase calls — all data fetching happens on the server.
 *
 * LATENT-02 (Phase 13 Plan 07): reads x-linked-trophy-org-id header injected by
 * middleware (resolveTenant()) so the Trophy OS cross-link renders without an
 * additional DB query per request.
 */
export async function SidebarServer() {
  const { data: userOrg } = await getUserOrg()

  // Never render sidebar pre-auth
  if (!userOrg) return null

  let activeModules: string[] = []

  try {
    const supabase = createAdminClient()
    const { data: tenantModules } = await supabase
      .from('tenant_modules')
      .select('module_id, is_enabled')
      .eq('organization_id', userOrg.organization.id)
      .eq('is_enabled', true)

    activeModules = (tenantModules ?? []).map((r: { module_id: string }) => r.module_id)
  } catch {
    // If tenant_modules query fails, show minimal sidebar (no verticals)
    activeModules = []
  }

  const items = buildSidebar(activeModules, userOrg.role)

  // Read x-linked-trophy-org-id header injected by middleware resolveTenant().
  // Only populated for subdomain requests where the org has linked_trophy_org_id set.
  // On the platform domain (draggonnb.co.za) or localhost, the header is absent.
  // In that case, fall back to a direct DB query (platform-admin view path).
  const hdrs = await headers()
  const headerValue = hdrs.get('x-linked-trophy-org-id')
  let linkedTrophyOrgId: string | null = headerValue || null

  // Fallback for platform-domain sessions (not subdomain-routed):
  // query directly to show the correct Trophy link state.
  if (linkedTrophyOrgId === null) {
    try {
      const supabase = createAdminClient()
      const { data: orgData } = await supabase
        .from('organizations')
        .select('linked_trophy_org_id')
        .eq('id', userOrg.organization.id)
        .single()
      linkedTrophyOrgId = (orgData as unknown as { linked_trophy_org_id: string | null } | null)?.linked_trophy_org_id ?? null
    } catch {
      // Non-critical — sidebar renders without Trophy link
    }
  }

  return <SidebarClient items={items} orgName={userOrg.organization.name} linkedTrophyOrgId={linkedTrophyOrgId} />
}

import { getUserOrg } from '@/lib/auth/get-user-org'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildSidebar } from '@/lib/dashboard/build-sidebar'
import { SidebarClient } from './sidebar-client'

/**
 * Server component that fetches tenant_modules + user role,
 * builds the sidebar tree via buildSidebar(), then hands off to SidebarClient.
 * No client-side Supabase calls — all data fetching happens on the server.
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

  return <SidebarClient items={items} orgName={userOrg.organization.name} />
}

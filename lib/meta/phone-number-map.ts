import { createAdminClient } from '@/lib/supabase/admin'

const cache = new Map<string, { orgId: string | null; timestamp: number }>()
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

export async function getOrgByPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const cached = cache.get(phoneNumberId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.orgId
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('tenant_modules')
    .select('organization_id')
    .eq('module_id', 'whatsapp')
    .eq('is_enabled', true)
    .filter('config->>phone_number_id', 'eq', phoneNumberId)
    .limit(1)
    .single()

  const orgId = data?.organization_id ?? null
  cache.set(phoneNumberId, { orgId, timestamp: Date.now() })
  return orgId
}

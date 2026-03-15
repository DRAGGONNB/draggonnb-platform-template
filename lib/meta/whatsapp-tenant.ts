import { createAdminClient } from '@/lib/supabase/admin'

interface TenantWhatsAppConfig {
  accessToken: string
  phoneNumberId: string
}

const cache = new Map<string, { config: TenantWhatsAppConfig | null; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getTenantWhatsAppConfig(orgId: string): Promise<TenantWhatsAppConfig | null> {
  const cached = cache.get(orgId)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.config
  }

  const supabase = createAdminClient()

  const { data } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('is_enabled', true)
    .eq('module_id', 'whatsapp')
    .single()

  let config: TenantWhatsAppConfig | null = null

  if (data?.config) {
    const c = data.config as Record<string, unknown>
    const accessToken = c.access_token as string | undefined
    const phoneNumberId = c.phone_number_id as string | undefined
    if (accessToken && phoneNumberId) {
      config = { accessToken, phoneNumberId }
    }
  }

  // Fall back to global env vars
  if (!config) {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
    if (accessToken && phoneNumberId) {
      config = { accessToken, phoneNumberId }
    }
  }

  cache.set(orgId, { config, timestamp: Date.now() })
  return config
}

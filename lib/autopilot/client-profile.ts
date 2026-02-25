import { createAdminClient } from '@/lib/supabase/admin'

export interface ClientProfile {
  id: string
  organization_id: string
  business_name: string
  industry: string
  sub_industry: string | null
  business_description: string | null
  target_market: string
  company_size: string | null
  location: string | null
  website: string | null
  tone: string
  brand_values: string[]
  brand_do: string[]
  brand_dont: string[]
  tagline: string | null
  seo_keywords: string[]
  content_pillars: string[]
  competitor_names: string[]
  unique_selling_points: string[]
  preferred_platforms: string[]
  posting_frequency: Record<string, number>
  preferred_post_times: Record<string, string>
  timezone: string
  email_campaigns_per_week: number
  preferred_email_goals: string[]
  email_send_day: string
  email_send_time: string
  autopilot_enabled: boolean
  auto_generate_day: string
  last_calendar_generated_at: string | null
  last_calendar_week: string | null
  created_at: string
  updated_at: string
}

export type ClientProfileUpdate = Partial<Omit<ClientProfile, 'id' | 'organization_id' | 'created_at' | 'updated_at'>>

export async function getClientProfile(organizationId: string): Promise<ClientProfile | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('client_profiles')
    .select('*')
    .eq('organization_id', organizationId)
    .single()

  if (error || !data) return null
  return data as ClientProfile
}

export async function upsertClientProfile(
  organizationId: string,
  profile: ClientProfileUpdate & { business_name: string; industry: string; target_market: string }
): Promise<ClientProfile> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('client_profiles')
    .upsert(
      { organization_id: organizationId, ...profile },
      { onConflict: 'organization_id' }
    )
    .select('*')
    .single()

  if (error || !data) {
    throw new Error(`Failed to upsert client profile: ${error?.message}`)
  }

  return data as ClientProfile
}

export async function updateCalendarGenerated(
  organizationId: string,
  week: string
): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('client_profiles')
    .update({
      last_calendar_generated_at: new Date().toISOString(),
      last_calendar_week: week,
    })
    .eq('organization_id', organizationId)
}

export async function getAutopilotEnabledOrgs(): Promise<{ organization_id: string }[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('client_profiles')
    .select('organization_id')
    .eq('autopilot_enabled', true)

  if (error || !data) return []
  return data
}

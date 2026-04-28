import { createAdminClient } from '@/lib/supabase/admin'
import type { ActionCardItem } from '@/components/module-home/types'

export interface CRMEasyViewData {
  followups: { items: ActionCardItem[]; totalCount: number }
  staleDeals: { items: ActionCardItem[]; totalCount: number }
  hotLeads: { items: ActionCardItem[]; totalCount: number }
  hasBrandVoice: boolean
}

export async function loadEasyViewData(orgId: string, userId: string): Promise<CRMEasyViewData> {
  const supabase = createAdminClient()

  // 1. Followups + hot_leads — read from crm_action_suggestions (nightly cache, 25h freshness)
  const { data: cached } = await supabase
    .from('crm_action_suggestions')
    .select('id, card_type, entity_type, entity_id, score, score_breakdown, refreshed_at')
    .eq('organization_id', orgId)
    .gt('refreshed_at', new Date(Date.now() - 25 * 3600 * 1000).toISOString())
    .order('score', { ascending: false })

  // 2. User dismissals — filter cached suggestions
  const { data: dismissals } = await supabase
    .from('crm_action_dismissals')
    .select('suggestion_card_type, entity_id')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
  const dismissedKey = (cardType: string, entityId: string) => `${cardType}:${entityId}`
  const dismissed = new Set((dismissals ?? []).map(d => dismissedKey(d.suggestion_card_type, d.entity_id)))

  // 3. Stale deals — pure SQL using thresholds from tenant_modules.config
  const { data: tenantMod } = await supabase
    .from('tenant_modules')
    .select('config')
    .eq('organization_id', orgId)
    .eq('module_id', 'crm')
    .single()
  const thresholds = (tenantMod?.config as Record<string, unknown> | null)?.crm as Record<string, number> | undefined
  const staleThresholds = {
    lead: thresholds?.lead ?? 7,
    qualified: thresholds?.qualified ?? 14,
    proposal: thresholds?.proposal ?? 10,
    negotiation: thresholds?.negotiation ?? 21,
  }

  // Compose queries for each active stage's stale threshold (won/lost excluded).
  // NOTE: deals table uses `updated_at` as the staleness proxy — `last_contacted_at`
  // only exists on the contacts table (migration 03_crm_tables.sql).
  // `assigned_to` maps to the plan's `owner_id` field.
  const stalePromises = (['lead', 'qualified', 'proposal', 'negotiation'] as const).map(stage => {
    const days = staleThresholds[stage]
    return supabase
      .from('deals')
      .select('id, name, stage, value, updated_at, assigned_to', { count: 'exact' })
      .eq('organization_id', orgId)
      .eq('stage', stage)
      .lt('updated_at', new Date(Date.now() - days * 86400000).toISOString())
      .limit(2)  // 2 per stage = up to 8 candidates, cap at 5 in render
  })
  const staleResults = await Promise.all(stalePromises)
  const staleDealsAll = staleResults.flatMap(r => r.data ?? []).slice(0, 5)
  const staleDealsTotal = staleResults.reduce((sum, r) => sum + (r.count ?? 0), 0)

  // 4. Brand voice presence
  const { data: voiceProfile } = await supabase
    .from('client_profiles')
    .select('brand_voice_updated_at')
    .eq('organization_id', orgId)
    .maybeSingle()
  const hasBrandVoice = Boolean(voiceProfile?.brand_voice_updated_at)

  // 5. Hydrate displayName/subtitle for each suggestion. ActionCardItem shape from Plan 11-03.
  const followupSuggestions = (cached ?? []).filter(s => s.card_type === 'followup' && !dismissed.has(dismissedKey('followup', s.entity_id)))
  const hotSuggestions = (cached ?? []).filter(s => s.card_type === 'hot_lead' && !dismissed.has(dismissedKey('hot_lead', s.entity_id)))

  const contactIds = followupSuggestions.filter(s => s.entity_type === 'contact').map(s => s.entity_id)
  const dealIds = [...followupSuggestions, ...hotSuggestions].filter(s => s.entity_type === 'deal').map(s => s.entity_id)
  const staleDealIds = staleDealsAll.map(d => d.id)

  // contacts table = actual table name (03_crm_tables.sql); crm_contacts does not exist
  // deals table = actual table name (03_crm_tables.sql); crm_deals does not exist
  const [contactsRes, dealsRes] = await Promise.all([
    contactIds.length > 0
      ? supabase.from('contacts').select('id, first_name, last_name, email').in('id', contactIds)
      : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }> }),
    (dealIds.length + staleDealIds.length) > 0
      ? supabase.from('deals').select('id, name, value, stage, contact_id, updated_at').in('id', [...dealIds, ...staleDealIds])
      : Promise.resolve({ data: [] as Array<{ id: string; name: string; value: number | null; stage: string; contact_id: string | null; updated_at: string | null }> }),
  ])
  const contactMap = new Map((contactsRes.data ?? []).map(c => [c.id, c]))
  const dealMap = new Map((dealsRes.data ?? []).map(d => [d.id, d]))

  type CachedSuggestion = NonNullable<typeof cached>[number]
  const buildItem = (s: CachedSuggestion): ActionCardItem | null => {
    if (s.entity_type === 'contact') {
      const c = contactMap.get(s.entity_id)
      if (!c) return null
      const displayName = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Unknown contact'
      return { id: s.id, entityId: s.entity_id, entityType: 'contact', displayName, subtitle: c.email ?? undefined, score: s.score ?? undefined }
    }
    const d = dealMap.get(s.entity_id)
    if (!d) return null
    return { id: s.id, entityId: s.entity_id, entityType: 'deal', displayName: d.name, subtitle: d.value ? `R${d.value.toLocaleString()}` : undefined, score: s.score ?? undefined }
  }

  const followupItems = followupSuggestions.map(buildItem).filter((x): x is ActionCardItem => x !== null).slice(0, 5)
  const hotLeadItems = hotSuggestions.map(buildItem).filter((x): x is ActionCardItem => x !== null).slice(0, 5)
  const staleDealItems: ActionCardItem[] = staleDealsAll.map(d => {
    // Days stale based on updated_at (proxy for last activity on the deal)
    const daysStale = d.updated_at ? Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86400000) : null
    return {
      id: `stale_${d.id}`,
      entityId: d.id,
      entityType: 'deal' as const,
      displayName: d.name,
      subtitle: daysStale != null ? `${daysStale} days in ${d.stage}` : `Stuck in ${d.stage}`,
    }
  })

  return {
    followups: { items: followupItems, totalCount: followupSuggestions.length },
    staleDeals: { items: staleDealItems, totalCount: staleDealsTotal },
    hotLeads: { items: hotLeadItems, totalCount: hotSuggestions.length },
    hasBrandVoice,
  }
}

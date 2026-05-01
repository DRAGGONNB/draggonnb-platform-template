/**
 * Pure compute helpers for the dashboard "Today's Quick Action" card.
 *
 * Inputs are already-fetched tenant data (no Supabase calls here) so the
 * functions are unit-testable and can run inside an N8N Code node.
 *
 * Output: a ranked list of `SuggestionCandidate`. The cron picks the top
 * one and stores it in `dashboard_action_suggestions`. The dashboard
 * page reads the cached row at render — no compute on render.
 */

export interface SuggestionCandidate {
  type: string
  priority: number
  headline: string
  body: string
  ctaLabel: string
  ctaHref: string
  metadata: Record<string, unknown>
}

export interface CrmActionSuggestionRow {
  card_type: 'followup' | 'hot_lead'
  entity_id: string
  score: number
  refreshed_at: string
}

export interface OAuthTokenRow {
  provider: string
  expires_at: string | null
}

export interface CampaignDraftRow {
  id: string
  status: string
  created_at: string
}

export interface AccommodationStockRow {
  item: string
  quantity: number
  threshold: number
}

const DAY_MS = 24 * 60 * 60 * 1000

export function computeCrmHotLeads(suggestions: CrmActionSuggestionRow[]): SuggestionCandidate[] {
  const hotLeads = suggestions.filter((s) => s.card_type === 'hot_lead' && s.score >= 3)
  if (hotLeads.length === 0) return []
  return [
    {
      type: 'crm.hot_leads',
      priority: 80,
      headline: `${hotLeads.length} hot lead${hotLeads.length === 1 ? '' : 's'} need follow-up`,
      body: 'Your CRM flagged high-value deals with recent contact. Review and approve follow-ups.',
      ctaLabel: 'Open CRM',
      ctaHref: '/crm',
      metadata: { count: hotLeads.length, top_score: Math.max(...hotLeads.map((h) => h.score)) },
    },
  ]
}

export function computeCrmFollowups(suggestions: CrmActionSuggestionRow[]): SuggestionCandidate[] {
  const followups = suggestions.filter((s) => s.card_type === 'followup' && s.score >= 3)
  if (followups.length === 0) return []
  return [
    {
      type: 'crm.followups',
      priority: 50,
      headline: `${followups.length} contact${followups.length === 1 ? '' : 's'} flagged for follow-up`,
      body: 'AI-curated follow-ups based on engagement patterns. One-click approve in CRM Easy view.',
      ctaLabel: 'Review follow-ups',
      ctaHref: '/crm',
      metadata: { count: followups.length },
    },
  ]
}

export function computeExpiringTokens(tokens: OAuthTokenRow[], now: Date = new Date()): SuggestionCandidate[] {
  const expiringSoon = tokens.filter((t) => {
    if (!t.expires_at) return false
    const days = (new Date(t.expires_at).getTime() - now.getTime()) / DAY_MS
    return days >= 0 && days <= 3
  })
  if (expiringSoon.length === 0) return []
  return [
    {
      type: 'token.expiring',
      priority: 100,
      headline: `Reconnect ${expiringSoon[0].provider} — expires soon`,
      body: 'OAuth tokens are about to expire. Reconnect to keep automations running.',
      ctaLabel: 'Open integrations',
      ctaHref: '/settings/integrations',
      metadata: { providers: expiringSoon.map((t) => t.provider) },
    },
  ]
}

export function computeDraftCampaigns(drafts: CampaignDraftRow[]): SuggestionCandidate[] {
  const pending = drafts.filter((d) => d.status === 'pending_approval')
  if (pending.length === 0) return []
  return [
    {
      type: 'campaigns.draft_pending',
      priority: 70,
      headline: `${pending.length} campaign draft${pending.length === 1 ? '' : 's'} awaiting approval`,
      body: 'Brand-safety review complete. Approve to schedule the send.',
      ctaLabel: 'Review drafts',
      ctaHref: '/campaigns',
      metadata: { count: pending.length },
    },
  ]
}

export function computeLowStockRooms(stock: AccommodationStockRow[]): SuggestionCandidate[] {
  const low = stock.filter((s) => s.quantity <= s.threshold)
  if (low.length === 0) return []
  return [
    {
      type: 'accommodation.low_stock',
      priority: 60,
      headline: `${low.length} accommodation stock item${low.length === 1 ? '' : 's'} below threshold`,
      body: 'Restock alert from nightly inventory check. Review and reorder.',
      ctaLabel: 'Open stock',
      ctaHref: '/accommodation/stock',
      metadata: { items: low.map((s) => s.item) },
    },
  ]
}

export function pickTopSuggestion(candidates: SuggestionCandidate[]): SuggestionCandidate | null {
  if (candidates.length === 0) return null
  return [...candidates].sort((a, b) => b.priority - a.priority)[0]
}

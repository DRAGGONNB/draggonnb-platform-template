export type CardSourceKind = 'sql_page_load' | 'cached_suggestions' | 'combined'

export interface ActionCardManifest {
  id: string
  title: string
  description: string
  emptyStateCTA: string
  maxItems: 5
  sourceKind: CardSourceKind
}

export interface ActionCardItem {
  id: string                          // suggestion id OR computed deterministic id (e.g. `stale_${dealId}`)
  entityId: string
  entityType: 'contact' | 'deal' | 'company'
  displayName: string
  subtitle?: string                   // e.g. "Last contact 9 days ago"
  score?: number                      // optional -- only set for cached cards
}

export type ApproveAction =
  | { type: 'send_email' }
  | { type: 'snooze_1d' }
  | { type: 'decide'; choice: 'engage' | 'archive' | 'snooze' }
  | { type: 'engage_hot_lead' }

export interface ActionCardProps {
  cardId: string
  title: string
  description: string
  emptyStateCTA: string
  items: ActionCardItem[]
  totalCount: number
  hasBrandVoice: boolean
  apiEndpoint: string                 // e.g. '/api/crm/easy-view/approve' -- module supplies this
  dismissEndpoint: string             // e.g. '/api/crm/easy-view/dismiss'
  advancedHref: string
  // Per-card UI variant: drives which buttons render per row
  variant: 'followup' | 'stale_deal' | 'hot_lead' | 'generic'
}

export interface ModuleHomeProps {
  module: string
  cards: ActionCardManifest[]
  cardData: Record<string, { items: ActionCardItem[]; totalCount: number }>
  userRole: 'admin' | 'manager' | 'user'
  uiMode: 'easy' | 'advanced'
  organizationId: string
  hasBrandVoice: boolean
  apiEndpointBase: string             // e.g. '/api/crm/easy-view'
  advancedHref: string                // e.g. '/dashboard/crm/advanced'
}

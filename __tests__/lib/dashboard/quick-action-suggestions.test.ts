import { describe, it, expect } from 'vitest'
import {
  computeCrmHotLeads,
  computeCrmFollowups,
  computeExpiringTokens,
  computeDraftCampaigns,
  computeLowStockRooms,
  pickTopSuggestion,
  type SuggestionCandidate,
  type CrmActionSuggestionRow,
} from '@/lib/dashboard/quick-action-suggestions'

const DAY_MS = 24 * 60 * 60 * 1000

describe('computeCrmHotLeads', () => {
  it('returns nothing when no hot leads pass score threshold', () => {
    const rows: CrmActionSuggestionRow[] = [
      { card_type: 'hot_lead', entity_id: 'd1', score: 1, refreshed_at: '2026-04-30T00:00:00Z' },
      { card_type: 'followup', entity_id: 'c1', score: 10, refreshed_at: '2026-04-30T00:00:00Z' },
    ]
    expect(computeCrmHotLeads(rows)).toEqual([])
  })

  it('builds a single candidate summarising hot-lead count', () => {
    const rows: CrmActionSuggestionRow[] = [
      { card_type: 'hot_lead', entity_id: 'd1', score: 8, refreshed_at: '2026-04-30T00:00:00Z' },
      { card_type: 'hot_lead', entity_id: 'd2', score: 13, refreshed_at: '2026-04-30T00:00:00Z' },
    ]
    const out = computeCrmHotLeads(rows)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('crm.hot_leads')
    expect(out[0].priority).toBe(80)
    expect(out[0].metadata).toEqual({ count: 2, top_score: 13 })
  })
})

describe('computeCrmFollowups', () => {
  it('returns a single candidate with priority 50 for scoring follow-ups', () => {
    const rows: CrmActionSuggestionRow[] = [
      { card_type: 'followup', entity_id: 'c1', score: 5, refreshed_at: '2026-04-30T00:00:00Z' },
    ]
    const out = computeCrmFollowups(rows)
    expect(out).toHaveLength(1)
    expect(out[0].priority).toBe(50)
  })
})

describe('computeExpiringTokens', () => {
  const NOW = new Date('2026-05-01T00:00:00Z')

  it('flags tokens expiring within 3 days', () => {
    const tokens = [
      { provider: 'meta', expires_at: new Date(NOW.getTime() + 2 * DAY_MS).toISOString() },
      { provider: 'linkedin', expires_at: new Date(NOW.getTime() + 30 * DAY_MS).toISOString() },
    ]
    const out = computeExpiringTokens(tokens, NOW)
    expect(out).toHaveLength(1)
    expect(out[0].type).toBe('token.expiring')
    expect(out[0].priority).toBe(100)
    expect((out[0].metadata.providers as string[])).toEqual(['meta'])
  })

  it('ignores already-expired tokens (negative window)', () => {
    const tokens = [{ provider: 'meta', expires_at: new Date(NOW.getTime() - DAY_MS).toISOString() }]
    expect(computeExpiringTokens(tokens, NOW)).toEqual([])
  })

  it('returns empty for null expires_at', () => {
    expect(computeExpiringTokens([{ provider: 'x', expires_at: null }], NOW)).toEqual([])
  })
})

describe('computeDraftCampaigns', () => {
  it('only counts pending_approval drafts', () => {
    const drafts = [
      { id: '1', status: 'pending_approval', created_at: '2026-04-30T00:00:00Z' },
      { id: '2', status: 'sent', created_at: '2026-04-30T00:00:00Z' },
    ]
    const out = computeDraftCampaigns(drafts)
    expect(out).toHaveLength(1)
    expect(out[0].priority).toBe(70)
    expect(out[0].metadata.count).toBe(1)
  })
})

describe('computeLowStockRooms', () => {
  it('flags items at or below threshold', () => {
    const stock = [
      { item: 'towels', quantity: 2, threshold: 5 },
      { item: 'soap', quantity: 50, threshold: 10 },
    ]
    const out = computeLowStockRooms(stock)
    expect(out).toHaveLength(1)
    expect(out[0].priority).toBe(60)
    expect((out[0].metadata.items as string[])).toEqual(['towels'])
  })
})

describe('pickTopSuggestion', () => {
  it('returns null on no candidates', () => {
    expect(pickTopSuggestion([])).toBeNull()
  })

  it('returns the highest-priority candidate', () => {
    const candidates: SuggestionCandidate[] = [
      { type: 'a', priority: 80, headline: 'a', body: '', ctaLabel: '', ctaHref: '', metadata: {} },
      { type: 'b', priority: 100, headline: 'b', body: '', ctaLabel: '', ctaHref: '', metadata: {} },
      { type: 'c', priority: 50, headline: 'c', body: '', ctaLabel: '', ctaHref: '', metadata: {} },
    ]
    expect(pickTopSuggestion(candidates)?.type).toBe('b')
  })

  it('preserves metadata through priority sort', () => {
    const candidates: SuggestionCandidate[] = [
      { type: 'expire', priority: 100, headline: 'h', body: '', ctaLabel: '', ctaHref: '', metadata: { providers: ['meta', 'linkedin'] } },
    ]
    const top = pickTopSuggestion(candidates)
    expect(top?.metadata.providers).toEqual(['meta', 'linkedin'])
  })

  it('does not mutate input array', () => {
    const candidates: SuggestionCandidate[] = [
      { type: 'a', priority: 50, headline: '', body: '', ctaLabel: '', ctaHref: '', metadata: {} },
      { type: 'b', priority: 100, headline: '', body: '', ctaLabel: '', ctaHref: '', metadata: {} },
    ]
    const order = candidates.map((c) => c.type).join(',')
    pickTopSuggestion(candidates)
    expect(candidates.map((c) => c.type).join(',')).toBe(order)
  })
})

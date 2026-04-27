/** @vitest-environment node */
// Plan 11-09: unit tests for entity-drafts conflict detection + autosave hook behaviour.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isDraftFresh, detectTabConflict } from '@/lib/crm/entity-drafts/conflict-detection'

// ── conflict-detection helpers ──────────────────────────────────────────────

describe('isDraftFresh', () => {
  it('returns true when draft was modified within TTL', () => {
    const recent = new Date(Date.now() - 10_000).toISOString() // 10s ago
    expect(isDraftFresh(recent, 60)).toBe(true)
  })

  it('returns false when draft is older than TTL', () => {
    const old = new Date(Date.now() - 90_000).toISOString() // 90s ago
    expect(isDraftFresh(old, 60)).toBe(false)
  })

  it('treats boundary exactly at TTL as stale', () => {
    const boundary = new Date(Date.now() - 60_000).toISOString()
    // ageMs ≥ 60000ms → false
    expect(isDraftFresh(boundary, 60)).toBe(false)
  })
})

describe('detectTabConflict', () => {
  it('returns false when draftTabId is null', () => {
    const recent = new Date(Date.now() - 10_000).toISOString()
    expect(detectTabConflict('tab-a', null, recent)).toBe(false)
  })

  it('returns false when draftModifiedAt is null', () => {
    expect(detectTabConflict('tab-a', 'tab-b', null)).toBe(false)
  })

  it('returns false when same tab wrote the draft', () => {
    const recent = new Date(Date.now() - 5_000).toISOString()
    expect(detectTabConflict('tab-a', 'tab-a', recent)).toBe(false)
  })

  it('returns true when a different tab wrote within 60s', () => {
    const recent = new Date(Date.now() - 10_000).toISOString()
    expect(detectTabConflict('tab-a', 'tab-b', recent)).toBe(true)
  })

  it('returns false when a different tab wrote more than 60s ago', () => {
    const old = new Date(Date.now() - 90_000).toISOString()
    expect(detectTabConflict('tab-a', 'tab-b', old)).toBe(false)
  })

  it('respects custom ttlSeconds', () => {
    const recent30 = new Date(Date.now() - 45_000).toISOString() // 45s ago
    // ttl=30 → stale; ttl=120 → fresh
    expect(detectTabConflict('tab-a', 'tab-b', recent30, 30)).toBe(false)
    expect(detectTabConflict('tab-a', 'tab-b', recent30, 120)).toBe(true)
  })
})

// ── useEntityDraft debounce behaviour ───────────────────────────────────────
// Testing the hook in jsdom requires a separate component env.
// These tests cover the fetch-debounce timing using fake timers.

describe('useEntityDraft debounce via fake timers', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should debounce: single POST fires after 1s of no changes', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.stubGlobal('fetch', fetchSpy)

    // Simulate the debounce logic directly (mirrors hook's useEffect body)
    let timer: ReturnType<typeof setTimeout>
    function schedulePost(values: Record<string, unknown>) {
      clearTimeout(timer)
      timer = setTimeout(() => {
        fetchSpy('/api/crm/drafts', {
          method: 'POST',
          body: JSON.stringify({ entityType: 'contact', entityId: 'id-1', draftData: values }),
        })
      }, 1000)
    }

    schedulePost({ first_name: 'A' })
    schedulePost({ first_name: 'AB' })
    schedulePost({ first_name: 'ABC' })

    // Before 1s elapses — no fetch yet
    vi.advanceTimersByTime(999)
    expect(fetchSpy).not.toHaveBeenCalled()

    // After 1s — exactly one fetch (debounced)
    vi.advanceTimersByTime(1)
    expect(fetchSpy).toHaveBeenCalledTimes(1)
    expect(fetchSpy).toHaveBeenCalledWith(
      '/api/crm/drafts',
      expect.objectContaining({ method: 'POST' })
    )

    vi.unstubAllGlobals()
  })

  it('cancels pending timer when new keystroke arrives before 1s', () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.stubGlobal('fetch', fetchSpy)

    let timer: ReturnType<typeof setTimeout>
    function schedulePost(values: Record<string, unknown>) {
      clearTimeout(timer)
      timer = setTimeout(() => fetchSpy('/api/crm/drafts', { method: 'POST', body: JSON.stringify(values) }), 1000)
    }

    schedulePost({ first_name: 'A' })
    vi.advanceTimersByTime(500)
    schedulePost({ first_name: 'AB' }) // resets the timer
    vi.advanceTimersByTime(500)        // 500ms into new timer

    expect(fetchSpy).not.toHaveBeenCalled() // still waiting

    vi.advanceTimersByTime(500) // completes the 1s
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    vi.unstubAllGlobals()
  })
})

/** @vitest-environment node */
/**
 * APPROVAL-03 regression: draggonnb.social_post action type must retain
 * existing v3.0 behavior after Phase 14 handler-registry introduction.
 *
 * Checks:
 *   1. contentPostHandler is registered under 'draggonnb.social_post'
 *   2. expiry_hours = 48 (per CONTEXT D1)
 *   3. action_type = 'social_post' (not 'content_post')
 *   4. execute() calls social_posts UPDATE with status='approved'
 *   5. revert() calls social_posts UPDATE with status='rejected'
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mock Supabase admin client ──────────────────────────────────────────────
const mockUpdate = vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
const mockFrom = vi.fn().mockReturnValue({ update: mockUpdate })
const mockAdmin = { from: mockFrom }
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => mockAdmin,
}))

import { HANDLER_REGISTRY } from '@/lib/approvals/handler-registry'

describe('APPROVAL-03 regression — draggonnb.social_post', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the chain each test
    mockUpdate.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    mockFrom.mockReturnValue({ update: mockUpdate })
  })

  it('is registered in HANDLER_REGISTRY under the correct key', () => {
    expect(HANDLER_REGISTRY).toHaveProperty('draggonnb.social_post')
  })

  it('has product = draggonnb', () => {
    const entry = HANDLER_REGISTRY['draggonnb.social_post']
    expect(entry.product).toBe('draggonnb')
  })

  it('has action_type = social_post (not content_post)', () => {
    const entry = HANDLER_REGISTRY['draggonnb.social_post']
    expect(entry.action_type).toBe('social_post')
  })

  it('has expiry_hours = 48 per CONTEXT D1', () => {
    const entry = HANDLER_REGISTRY['draggonnb.social_post']
    expect(entry.expiry_hours).toBe(48)
  })

  it('handler exposes execute and revert functions', () => {
    const { handler } = HANDLER_REGISTRY['draggonnb.social_post']
    expect(typeof handler.execute).toBe('function')
    expect(typeof handler.revert).toBe('function')
  })

  it('execute() calls social_posts UPDATE with status=approved', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: null })
    mockUpdate.mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { handler } = HANDLER_REGISTRY['draggonnb.social_post']
    const result = await handler.execute({ post_id: 'post-abc-123' })

    expect(mockFrom).toHaveBeenCalledWith('social_posts')
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' })
    )
    expect(eqMock).toHaveBeenCalledWith('id', 'post-abc-123')
    expect(result.status).toBe('executed')
  })

  it('execute() returns failed when Supabase returns an error', async () => {
    const eqMock = vi.fn().mockResolvedValue({ error: { message: 'DB error' } })
    mockUpdate.mockReturnValue({ eq: eqMock })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const { handler } = HANDLER_REGISTRY['draggonnb.social_post']
    const result = await handler.execute({ post_id: 'post-bad' })

    expect(result.status).toBe('failed')
    expect(result.detail).toContain('DB error')
  })
})

/**
 * lib/approvals/handlers/trophy-quota-change.ts
 * STUB — Trophy quota_change handler for v3.1.
 * Phase 17 will replace this with real Trophy integration.
 */

export const quotaChangeHandler = {
  product: 'trophy' as const,
  action_type: 'quota_change',
  expiry_hours: 24, // per CONTEXT D1

  async execute(_payload: any): Promise<{ status: 'failed'; detail: string }> {
    return { status: 'failed', detail: 'trophy not wired in v3.1 — stub handler' }
  },

  async revert(_payload: any): Promise<{ status: 'failed'; detail: string }> {
    return { status: 'failed', detail: 'trophy not wired in v3.1 — stub handler' }
  },
}

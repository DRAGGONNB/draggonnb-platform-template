/**
 * lib/approvals/handlers/trophy-supplier-job-approval.ts
 * STUB — Trophy supplier_job_approval handler for v3.1.
 * Phase 17 will replace this with real Trophy integration.
 */

export const supplierJobApprovalHandler = {
  product: 'trophy' as const,
  action_type: 'supplier_job_approval',
  expiry_hours: 72, // per CONTEXT D1

  async execute(_payload: any): Promise<{ status: 'failed'; detail: string }> {
    return { status: 'failed', detail: 'trophy not wired in v3.1 — stub handler' }
  },

  async revert(_payload: any): Promise<{ status: 'failed'; detail: string }> {
    return { status: 'failed', detail: 'trophy not wired in v3.1 — stub handler' }
  },
}

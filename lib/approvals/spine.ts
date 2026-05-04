/**
 * lib/approvals/spine.ts
 * Central approval spine API for DraggonnB Approval Spine (Phase 14).
 *
 * Exports:
 *   proposeApproval        — create approval_requests row + send Telegram DMs
 *   approveRequest         — D2 permission check + approve_request_atomic RPC
 *   rejectRequest          — D2 permission check + approve_request_atomic RPC (rejected)
 *   listPendingForUser     — pending approvals assigned to a user
 *   listOrgPending         — all pending approvals for an org
 *   listOrgHistory         — last 30 days resolved approvals (W3 History tab)
 *   verifyApprover         — telegram_user_id → org membership + D2 product check
 *   verifyProductPermission — tenant module + admin/manager role check (D2 enforcement)
 *   generatePhotoSignedUrl  — HMAC-signed URL for photo viewer (I2)
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { HANDLER_REGISTRY } from '@/lib/approvals/handler-registry'
import { sendTelegramMessage } from '@/lib/telegram/bot'
import { InlineKeyboard } from 'grammy'
import { createHmac } from 'crypto'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ProposeApprovalInput {
  product: 'draggonnb' | 'trophy'
  action_type: string
  target_resource_type: string
  target_resource_id: string
  target_org_id: string
  action_payload: Record<string, unknown> | null
  requested_by: string
  expiry_hours?: number
  notify_on_complete?: {
    telegram_chat_id?: string
    webhook_url?: string
    email?: string
  }
  message_lines?: string[]  // Telegram DM body — internal IDs only, no PII (APPROVAL-13)
}

// ─── Core API ────────────────────────────────────────────────────────────────

export async function proposeApproval(input: ProposeApprovalInput): Promise<{ id: string }> {
  const supabase = createAdminClient()

  // Resolve expiry_hours from HANDLER_REGISTRY (with caller override)
  const manifestKey = `${input.product}.${input.action_type}`
  const registryEntry = HANDLER_REGISTRY[manifestKey]
  const expiryHours = input.expiry_hours ?? registryEntry?.expiry_hours ?? 48

  // Resolve assigned_approvers (all org admins/managers)
  const { data: approvers } = await supabase
    .from('organization_users')
    .select('user_id')
    .eq('organization_id', input.target_org_id)
    .in('role', ['admin', 'manager'])
  const approverIds = (approvers ?? []).map((a) => a.user_id)

  const { data: row, error } = await supabase
    .from('approval_requests')
    .insert({
      product: input.product,
      action_type: input.action_type,
      target_resource_type: input.target_resource_type,
      target_resource_id: input.target_resource_id,
      target_org_id: input.target_org_id,
      organization_id: input.target_org_id,  // legacy col kept in sync
      action_payload: input.action_payload ?? {},
      // W1: notify_on_complete is its OWN column (NOT nested in action_payload) per CONTEXT C3
      notify_on_complete: input.notify_on_complete ?? null,
      proposed_to: 'all_admins',
      assigned_approvers: approverIds,
      requested_by: input.requested_by,
      status: 'pending',
      expires_at: new Date(Date.now() + expiryHours * 3_600_000).toISOString(),
    })
    .select('id')
    .single()

  if (error) throw error

  // Send Telegram DMs to each mapped approver (internal IDs only, APPROVAL-13)
  await sendApprovalDMs(row.id, approverIds, input)

  return { id: row.id }
}

async function sendApprovalDMs(
  approvalId: string,
  userIds: string[],
  input: ProposeApprovalInput
): Promise<void> {
  if (userIds.length === 0) return
  const supabase = createAdminClient()

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, telegram_user_id')
    .in('user_id', userIds)
    .not('telegram_user_id', 'is', null)

  const cb = `:${input.product}:${input.action_type}:${approvalId}`
  const kb = new InlineKeyboard()
    .text('Approve', `approve${cb}`)
    .text('Reject', `reject${cb}`)
    .row()
    .url(
      'Open in /approvals',
      `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://draggonnb-platform.vercel.app'}/approvals/${approvalId}`
    )

  const text = (
    input.message_lines ?? [
      `Approval needed: ${input.product}.${input.action_type}`,
      `ID: ${input.target_resource_id}`,
      `Resource: ${input.target_resource_type}`,
    ]
  ).join('\n')

  for (const p of profiles ?? []) {
    try {
      await sendTelegramMessage(p.telegram_user_id as any, text, { reply_markup: kb })
    } catch (e) {
      console.error(`[spine] Failed to DM user ${p.user_id}:`, e)
    }
  }
}

// ─── Approve ─────────────────────────────────────────────────────────────────

export async function approveRequest(
  approvalId: string,
  approverUserId: string
): Promise<{ result: string }> {
  const supabase = createAdminClient()

  // W4: D2 product-scoped enforcement BEFORE atomic proc invocation
  const { data: ar } = await supabase
    .from('approval_requests')
    .select('product, target_org_id')
    .eq('id', approvalId)
    .single()
  if (!ar) throw new Error('approval not found')

  const ok = await verifyProductPermission(approverUserId, ar.target_org_id, ar.product as any)
  if (!ok) throw new Error('no permission for this product')

  const { data, error } = await supabase.rpc('approve_request_atomic', {
    p_approval_id: approvalId,
    p_approver_user_id: approverUserId,
    p_decision: 'approved',
  })
  if (error) throw error
  return data as any
}

// ─── Reject ──────────────────────────────────────────────────────────────────

export async function rejectRequest(
  approvalId: string,
  approverUserId: string,
  reasonCode: string,
  reasonText?: string
): Promise<{ result: string }> {
  const supabase = createAdminClient()

  // W4: D2 product-scoped enforcement BEFORE atomic proc invocation
  const { data: ar } = await supabase
    .from('approval_requests')
    .select('product, target_org_id')
    .eq('id', approvalId)
    .single()
  if (!ar) throw new Error('approval not found')

  const ok = await verifyProductPermission(approverUserId, ar.target_org_id, ar.product as any)
  if (!ok) throw new Error('no permission for this product')

  const { data, error } = await supabase.rpc('approve_request_atomic', {
    p_approval_id: approvalId,
    p_approver_user_id: approverUserId,
    p_decision: 'rejected',
    p_rejection_reason_code: reasonCode,
    p_rejection_reason_text: reasonText ?? null,
  })
  if (error) throw error
  return data as any
}

// ─── List helpers ─────────────────────────────────────────────────────────────

export async function listPendingForUser(userId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('status', 'pending')
    .contains('assigned_approvers', [userId])
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function listOrgPending(orgId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('status', 'pending')
    .eq('target_org_id', orgId)
    .order('created_at', { ascending: false })
  return data ?? []
}

// W3: history feed for /approvals History tab — last 30 days resolved
export async function listOrgHistory(orgId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('approval_requests')
    .select('*')
    .eq('target_org_id', orgId)
    .in('status', ['approved', 'rejected', 'expired', 'failed', 'cancelled', 'executed'])
    .gte('updated_at', new Date(Date.now() - 30 * 24 * 3_600_000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(100)
  return data ?? []
}

// ─── Permission checks ────────────────────────────────────────────────────────

/**
 * W4: D2 product-scoped permission enforcement.
 * Returns true iff the tenant has the product module active AND user is admin/manager in the org.
 */
export async function verifyProductPermission(
  userId: string,
  orgId: string,
  product: 'draggonnb' | 'trophy'
): Promise<boolean> {
  const supabase = createAdminClient()

  // For 'draggonnb' product: ALL draggonnb orgs have draggonnb access (they ARE draggonnb tenants)
  // For 'trophy' product: check tenant_modules for active trophy module
  if (product === 'draggonnb') {
    // Verify admin/manager role in org
    const { data: ou } = await supabase
      .from('organization_users')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', orgId)
      .in('role', ['admin', 'manager'])
      .maybeSingle()
    return !!ou
  }

  // Trophy: check tenant_modules
  const { data: tm } = await supabase
    .from('tenant_modules')
    .select('module_key')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .ilike('module_key', `${product}%`)
    .limit(1)
    .maybeSingle()

  if (!tm) return false

  const { data: ou } = await supabase
    .from('organization_users')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', orgId)
    .in('role', ['admin', 'manager'])
    .maybeSingle()
  return !!ou
}

/**
 * Verify a Telegram user is an authorized approver.
 * Looks up telegram_user_id → user_profiles → organization_users (admin/manager).
 * When `product` is provided, also verifies D2 product-scoped permission.
 */
export async function verifyApprover(
  telegramUserId: number,
  organizationId: string,
  product?: 'draggonnb' | 'trophy'
): Promise<{ userId: string; isAuthorized: boolean }> {
  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_id')
    .eq('telegram_user_id', telegramUserId)
    .single()

  if (!profile) return { userId: '', isAuthorized: false }

  const { data: ou } = await supabase
    .from('organization_users')
    .select('role')
    .eq('user_id', profile.user_id)
    .eq('organization_id', organizationId)
    .in('role', ['admin', 'manager'])
    .single()

  if (!ou) return { userId: profile.user_id, isAuthorized: false }

  // W4: D2 product-scoped enforcement — when product is known, verify tenant module access
  if (product) {
    const ok = await verifyProductPermission(profile.user_id, organizationId, product)
    if (!ok) return { userId: profile.user_id, isAuthorized: false }
  }

  return { userId: profile.user_id, isAuthorized: true }
}

// ─── Photo signed URL ─────────────────────────────────────────────────────────

/**
 * I2: Generate HMAC-signed URL for photo viewer.
 * Payload format: {approval_id}:{asset_id}:{exp}
 * Matching validator: app/api/approvals/[id]/photos/[asset_id]/route.ts
 */
export function generatePhotoSignedUrl(
  approvalId: string,
  assetId: string,
  expirySeconds: number = 1800
): string {
  const secret = process.env.APPROVAL_PHOTO_HMAC_SECRET
  if (!secret) throw new Error('APPROVAL_PHOTO_HMAC_SECRET not set')
  const exp = Math.floor(Date.now() / 1000) + expirySeconds
  const sig = createHmac('sha256', secret)
    .update(`${approvalId}:${assetId}:${exp}`)
    .digest('hex')
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return `${baseUrl}/api/approvals/${approvalId}/photos/${assetId}?sig=${sig}&exp=${exp}`
}

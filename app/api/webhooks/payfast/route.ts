// app/api/webhooks/payfast/route.ts
// Phase 09 BILL-06: Prefix-branched ITN handler with snapshot validation (ERR-030 fix).
//
// ERR-030 FIX: pf_payment_id is a per-transaction ID — it MUST NOT be stored as
// payfast_subscription_token. The real subscription token arrives in ITN.token on
// the first successful DRG-* recurring payment. This rewrite corrects that mistake.
//
// Amount validation now reads organizations.billing_plan_snapshot (set at subscribe-time
// via lib/billing/composition.ts), NOT the in-memory PRICING_TIERS constant which may drift.
//
// PayFast ITN Docs: https://developers.payfast.co.za/docs#instant_transaction_notification

import { NextRequest, NextResponse } from 'next/server'
import {
  validatePayFastSignature,
  verifyPayFastPayment,
  type PayFastITNData,
} from '@/lib/payments/payfast'
import { parseMPaymentId, PAYFAST_PREFIX } from '@/lib/payments/payfast-prefix'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PayFast ITN (Instant Transaction Notification) Webhook Handler
 *
 * Security pipeline:
 * 1. Validate MD5 signature
 * 2. Server-to-server verify with PayFast
 * 3. Parse + validate m_payment_id prefix
 * 4. Branch on prefix: DRG / ADDON / TOPUP / ONEOFF
 * 5. For DRG: validate amount against billing_plan_snapshot (not PRICING_TIERS)
 * 6. For DRG COMPLETE: write payfast_subscription_token from ITN.token ONLY
 */
export async function POST(request: NextRequest) {
  try {
    // Parse ITN data from PayFast (sent as URL-encoded form data)
    const formData = await request.formData()
    const itnData: Record<string, string> = {}
    formData.forEach((value, key) => {
      itnData[key] = value.toString()
    })

    // Scrubbed log (exclude signature field to prevent replay-attack logging)
    const scrubbedLog = { ...itnData }
    delete scrubbedLog.signature
    console.log('[webhook/payfast] ITN received:', {
      m_payment_id: itnData.m_payment_id,
      pf_payment_id: itnData.pf_payment_id,
      payment_status: itnData.payment_status,
      amount_gross: itnData.amount_gross,
    })

    // -------------------------------------------------------------------------
    // Step 1: Validate signature
    // -------------------------------------------------------------------------
    const passphrase = process.env.PAYFAST_PASSPHRASE
    const isValidSignature = validatePayFastSignature(itnData, passphrase)
    if (!isValidSignature) {
      console.error('[webhook/payfast] Invalid signature', { m_payment_id: itnData.m_payment_id })
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // -------------------------------------------------------------------------
    // Step 2: Verify payment with PayFast server (server-to-server)
    // -------------------------------------------------------------------------
    const isValidPayment = await verifyPayFastPayment(itnData as PayFastITNData)
    if (!isValidPayment) {
      console.error('[webhook/payfast] Server verification failed', { m_payment_id: itnData.m_payment_id })
      return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
    }

    // -------------------------------------------------------------------------
    // Step 3: Parse m_payment_id prefix
    // -------------------------------------------------------------------------
    const rawMPaymentId = itnData.m_payment_id || ''
    const parsed = parseMPaymentId(rawMPaymentId)
    if (!parsed) {
      console.error('[webhook/payfast] Invalid m_payment_id format', { m_payment_id: rawMPaymentId })
      return NextResponse.json({ error: 'Invalid m_payment_id format' }, { status: 400 })
    }

    const { prefix, organizationId } = parsed
    const {
      pf_payment_id,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      email_address,
    } = itnData as PayFastITNData

    // -------------------------------------------------------------------------
    // Step 4: Load organization (needed for all branches)
    // -------------------------------------------------------------------------
    const supabase = createAdminClient()
    const { data: org } = await supabase
      .from('organizations')
      .select('id, subscription_status, payfast_subscription_token, billing_plan_snapshot, name, plan_id, activated_at')
      .eq('id', organizationId)
      .single()

    if (!org) {
      console.error('[webhook/payfast] Organization not found', { orgId: organizationId, prefix, mPaymentId: rawMPaymentId })
      // Return 200 to PayFast so it doesn't retry indefinitely for unknown orgs
      return NextResponse.json({ success: true, message: 'org_not_found_accepted' }, { status: 200 })
    }

    // -------------------------------------------------------------------------
    // Step 5: Branch on prefix
    // -------------------------------------------------------------------------

    if (prefix === PAYFAST_PREFIX.SUBSCRIPTION) {
      // -----------------------------------------------------------------
      // DRG-* : Base plan / composition recurring payment
      // -----------------------------------------------------------------
      await handleSubscriptionPayment({
        supabase,
        org,
        payment_status,
        amount_gross,
        amount_fee,
        amount_net,
        pf_payment_id,
        itnData,
        scrubbedLog,
        email_address,
        rawMPaymentId,
        organizationId,
      })
    } else if (prefix === PAYFAST_PREFIX.ADDON) {
      // -----------------------------------------------------------------
      // ADDON-* : Mid-cycle module add (ad-hoc pro-rate charge)
      // Phase 10 adds full pending-charge tracking. For v1, audit log only.
      // -----------------------------------------------------------------
      await supabase.from('subscription_history').insert({
        organization_id: organizationId,
        transaction_id: pf_payment_id,
        amount: parseFloat(amount_gross),
        amount_fee: parseFloat(amount_fee || '0'),
        amount_net: parseFloat(amount_net || amount_gross),
        status: payment_status === 'COMPLETE' ? 'completed' : payment_status.toLowerCase(),
        payment_method: 'payfast_adhoc_addon',
        created_at: new Date().toISOString(),
        payfast_response: scrubbedLog,
      })
      console.log('[webhook/payfast] ADDON payment logged', { orgId: organizationId, status: payment_status, amount: amount_gross })
    } else if (prefix === PAYFAST_PREFIX.TOPUP) {
      // -----------------------------------------------------------------
      // TOPUP-* : Overage pack purchase
      // Phase 10 BILL-08: full credit accounting. For v1, audit log only.
      // -----------------------------------------------------------------
      await supabase.from('subscription_history').insert({
        organization_id: organizationId,
        transaction_id: pf_payment_id,
        amount: parseFloat(amount_gross),
        amount_fee: parseFloat(amount_fee || '0'),
        amount_net: parseFloat(amount_net || amount_gross),
        status: payment_status === 'COMPLETE' ? 'completed' : payment_status.toLowerCase(),
        payment_method: 'payfast_adhoc_topup',
        created_at: new Date().toISOString(),
        payfast_response: scrubbedLog,
      })
      console.log('[webhook/payfast] TOPUP payment logged', { orgId: organizationId, status: payment_status, amount: amount_gross })
    } else if (prefix === PAYFAST_PREFIX.ONEOFF) {
      // -----------------------------------------------------------------
      // ONEOFF-* : Setup fee / one-off charges
      // -----------------------------------------------------------------
      await supabase.from('subscription_history').insert({
        organization_id: organizationId,
        transaction_id: pf_payment_id,
        amount: parseFloat(amount_gross),
        amount_fee: parseFloat(amount_fee || '0'),
        amount_net: parseFloat(amount_net || amount_gross),
        status: payment_status === 'COMPLETE' ? 'completed' : payment_status.toLowerCase(),
        payment_method: 'payfast_setup_fee',
        created_at: new Date().toISOString(),
        payfast_response: scrubbedLog,
      })
      console.log('[webhook/payfast] ONEOFF (setup fee) payment logged', { orgId: organizationId, status: payment_status, amount: amount_gross })
    } else {
      console.error('[webhook/payfast] Unknown prefix', { prefix, mPaymentId: rawMPaymentId })
      return NextResponse.json({ error: 'Unknown m_payment_id prefix' }, { status: 400 })
    }

    // Return 200 OK to PayFast to acknowledge receipt
    return NextResponse.json({ success: true, message: 'ITN processed' }, { status: 200 })
  } catch (error) {
    console.error('[webhook/payfast] Unhandled error:', error)
    return NextResponse.json({ error: 'ITN processing failed' }, { status: 500 })
  }
}

// =============================================================================
// DRG (Subscription) handler
// =============================================================================

interface SubscriptionPaymentArgs {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  org: any
  payment_status: string
  amount_gross: string
  amount_fee: string | undefined
  amount_net: string | undefined
  pf_payment_id: string
  itnData: Record<string, string>
  scrubbedLog: Record<string, string>
  email_address: string
  rawMPaymentId: string
  organizationId: string
}

async function handleSubscriptionPayment(args: SubscriptionPaymentArgs): Promise<void> {
  const {
    supabase, org, payment_status, amount_gross, amount_fee, amount_net,
    pf_payment_id, scrubbedLog, email_address, rawMPaymentId, organizationId,
  } = args

  // -------------------------------------------------------------------------
  // Amount validation against billing_plan_snapshot (NOT PRICING_TIERS)
  // -------------------------------------------------------------------------
  // PRICING_TIERS[tier].price was removed from this code path intentionally.
  // The snapshot captures the amount at subscribe-time, including any add-ons.
  // This prevents false mismatches when base plan prices change mid-cycle.

  const snapshot = org.billing_plan_snapshot as { monthly_total_zar_cents?: number } | null
  if (snapshot?.monthly_total_zar_cents) {
    const snapshotTotalRands = snapshot.monthly_total_zar_cents / 100
    const receivedAmount = parseFloat(amount_gross)
    if (Math.abs(receivedAmount - snapshotTotalRands) > 0.01) {
      console.error('[webhook/payfast] Amount mismatch vs billing_plan_snapshot', {
        orgId: org.id,
        received: receivedAmount,
        expectedFromSnapshot: snapshotTotalRands,
        mPaymentId: rawMPaymentId,
      })
      // Do NOT reject — log + accept (PayFast won't auto-refund).
      // Phase 12 BILL-08 reconciliation cron will flag this.
      await supabase.from('subscription_history').insert({
        organization_id: organizationId,
        transaction_id: pf_payment_id,
        amount: parseFloat(amount_gross),
        status: 'amount_mismatch_accepted',
        payment_method: 'payfast',
        created_at: new Date().toISOString(),
        payfast_response: scrubbedLog,
      })
      // Continue processing — do not return early
    }
  }

  if (payment_status === 'COMPLETE') {
    // -------------------------------------------------------------------------
    // PHASE 09 FIX (ERR-030): Read subscription token from ITN.token field.
    // pf_payment_id is a per-transaction ID — it is NOT the subscription token.
    // PayFast puts the recurring subscription token in the `token` field on
    // the FIRST successful payment. Subsequent renewals also send `token`.
    // NEVER overwrite payfast_subscription_token with pf_payment_id.
    // -------------------------------------------------------------------------
    const subscriptionToken = args.itnData['token'] as string | undefined

    const updatePayload: Record<string, unknown> = {
      subscription_status: 'active',
      next_billing_date: getNextBillingDate(),
    }

    // Only set payfast_subscription_token from ITN.token:
    //   (a) this is a SUBSCRIPTION payment (DRG prefix — confirmed by caller)
    //   (b) ITN.token is present (PayFast sends it; sandbox may not always)
    //   (c) org doesn't already have a token (first payment sets it; renewals skip)
    if (subscriptionToken && !org.payfast_subscription_token) {
      updatePayload.payfast_subscription_token = subscriptionToken
      console.log('[webhook/payfast] Setting payfast_subscription_token from ITN.token (first subscription payment)', {
        orgId: org.id,
        token: subscriptionToken,
      })
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update(updatePayload)
      .eq('id', organizationId)

    if (updateError) {
      console.error('[webhook/payfast] Error updating organization', { orgId: org.id, error: updateError.message })
      // Continue — log the transaction even if org update fails
    }

    // Log successful transaction
    await supabase.from('subscription_history').insert({
      organization_id: organizationId,
      transaction_id: pf_payment_id,
      amount: parseFloat(amount_gross),
      amount_fee: parseFloat(amount_fee || '0'),
      amount_net: parseFloat(amount_net || amount_gross),
      status: 'completed',
      payment_method: 'payfast',
      created_at: new Date().toISOString(),
      payfast_response: scrubbedLog,
    })

    // Phase 09: legacy client_usage_metrics reset removed — columns were incorrect;
    // new orgs use usage_events via record_usage_event RPC.
    // Full table cleanup in Phase 10 (USAGE-13).

    console.log('[webhook/payfast] DRG COMPLETE', { orgId: org.id, amount: amount_gross })

    // Detect new subscription (activated_at not yet set)
    const isNewSubscription = !org.activated_at

    if (isNewSubscription) {
      // Set activated_at for new subscriptions
      await supabase
        .from('organizations')
        .update({ activated_at: new Date().toISOString() })
        .eq('id', organizationId)
        .is('activated_at', null)

      // Create provisioning job
      const { error: provJobError } = await supabase.from('provisioning_jobs').insert({
        organization_id: organizationId,
        tier: org.plan_id || 'core',
        status: 'pending',
        current_step: 'supabase-project',
        steps_completed: [],
        created_resources: {},
      })
      if (provJobError) {
        console.error('[webhook/payfast] Failed to create provisioning job:', provJobError)
      }

      // Trigger N8N provisioning workflow
      try {
        const { triggerClientProvisioning } = await import('@/lib/n8n/webhooks')
        await triggerClientProvisioning({
          organizationId,
          clientName: org.name || email_address,
          email: email_address,
          tier: (org.plan_id as 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale') || 'core',
          features: [],
        })
        console.log('[webhook/payfast] Provisioning triggered for org', org.id)
      } catch (provError) {
        console.error('[webhook/payfast] Failed to trigger provisioning:', provError)
        // Non-fatal: provisioning can be retried manually
      }
    }
  } else if (payment_status === 'FAILED') {
    await supabase.from('organizations').update({ subscription_status: 'payment_failed' }).eq('id', organizationId)
    await supabase.from('subscription_history').insert({
      organization_id: organizationId,
      transaction_id: pf_payment_id,
      amount: parseFloat(amount_gross),
      status: 'failed',
      payment_method: 'payfast',
      created_at: new Date().toISOString(),
      payfast_response: scrubbedLog,
    })
    console.log('[webhook/payfast] DRG FAILED', { orgId: org.id })
  } else if (payment_status === 'PENDING') {
    await supabase.from('organizations').update({ subscription_status: 'payment_pending' }).eq('id', organizationId)
    console.log('[webhook/payfast] DRG PENDING', { orgId: org.id })
  } else if (payment_status === 'CANCELLED') {
    await supabase.from('organizations').update({ subscription_status: 'cancelled' }).eq('id', organizationId)
    await supabase.from('subscription_history').insert({
      organization_id: organizationId,
      transaction_id: pf_payment_id,
      amount: parseFloat(amount_gross),
      status: 'cancelled',
      payment_method: 'payfast',
      created_at: new Date().toISOString(),
      payfast_response: scrubbedLog,
    })
    console.log('[webhook/payfast] DRG CANCELLED', { orgId: org.id })
  }
}

/**
 * GET handler for webhook endpoint verification
 * PayFast may verify webhook endpoint with a GET request
 */
export async function GET() {
  return new Response(
    JSON.stringify({ status: 'PayFast ITN webhook endpoint active' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
}

/**
 * Calculate next billing date (1 month from today)
 */
function getNextBillingDate(): string {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return nextMonth.toISOString().split('T')[0] // YYYY-MM-DD
}

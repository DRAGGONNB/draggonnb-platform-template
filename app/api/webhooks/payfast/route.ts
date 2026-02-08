import { NextRequest, NextResponse } from 'next/server'
import {
  validatePayFastSignature,
  verifyPayFastPayment,
  validatePaymentAmount,
  PRICING_TIERS,
  getCanonicalTierName,
  type PayFastITNData,
} from '@/lib/payments/payfast'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * PayFast ITN (Instant Transaction Notification) Webhook Handler
 * Processes payment notifications from PayFast
 *
 * PayFast ITN Documentation:
 * https://developers.payfast.co.za/docs#instant_transaction_notification
 *
 * Security Steps:
 * 1. Validate signature (MD5 hash)
 * 2. Verify payment with PayFast server
 * 3. Validate payment amount
 * 4. Update database
 */
export async function POST(request: NextRequest) {
  try {
    // Parse ITN data from PayFast (sent as URL-encoded form data)
    const formData = await request.formData()
    const itnData: Record<string, string> = {}

    formData.forEach((value, key) => {
      itnData[key] = value.toString()
    })

    console.log('PayFast ITN received:', {
      payment_id: itnData.pf_payment_id,
      status: itnData.payment_status,
      amount: itnData.amount_gross,
    })

    // Step 1: Validate signature
    const passphrase = process.env.PAYFAST_PASSPHRASE
    const isValidSignature = validatePayFastSignature(itnData, passphrase)

    if (!isValidSignature) {
      console.error('Invalid PayFast ITN signature')
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    console.log('✓ Signature validated')

    // Step 2: Verify payment with PayFast server (server-to-server confirmation)
    const isValidPayment = await verifyPayFastPayment(itnData as PayFastITNData)

    if (!isValidPayment) {
      console.error('PayFast payment verification failed')
      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      )
    }

    console.log('✓ Payment verified with PayFast server')

    // Step 3: Extract data
    const {
      pf_payment_id,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      custom_str1: organizationId,
      custom_str2: planTier,
      email_address,
      item_name,
    } = itnData as PayFastITNData

    if (!organizationId) {
      console.error('Missing organizationId in ITN custom_str1')
      return NextResponse.json(
        { error: 'Missing organization ID' },
        { status: 400 }
      )
    }

    // Step 4: Validate payment amount (prevent tampering)
    const effectiveTier = planTier ? (PRICING_TIERS[planTier] ? planTier : getCanonicalTierName(planTier)) : null
    if (effectiveTier && PRICING_TIERS[effectiveTier]) {
      const expectedAmount = PRICING_TIERS[effectiveTier].price
      const isValidAmount = validatePaymentAmount(amount_gross, expectedAmount)

      if (!isValidAmount) {
        console.error(`Payment amount mismatch: expected R${expectedAmount}, got R${amount_gross}`)
        return NextResponse.json(
          { error: 'Payment amount mismatch' },
          { status: 400 }
        )
      }

      console.log('✓ Payment amount validated')
    }

    // Initialize Supabase admin client (bypasses RLS for webhook handler)
    const supabase = createAdminClient()

    // Step 5: Handle different payment statuses
    if (payment_status === 'COMPLETE') {
      // Payment successful - activate subscription
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          subscription_status: 'active',
          payfast_subscription_token: pf_payment_id,
          activated_at: new Date().toISOString(),
          next_billing_date: getNextBillingDate(),
        })
        .eq('id', organizationId)

      if (updateError) {
        console.error('Error updating organization:', updateError)
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        )
      }

      // Log successful transaction
      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          transaction_id: pf_payment_id,
          amount: parseFloat(amount_gross),
          amount_fee: parseFloat(amount_fee || '0'),
          amount_net: parseFloat(amount_net || amount_gross),
          status: 'completed',
          payment_method: 'payfast',
          created_at: new Date().toISOString(),
          payfast_response: itnData,
        })

      // Reset usage metrics for new billing cycle
      await supabase
        .from('client_usage_metrics')
        .update({
          monthly_posts_used: 0,
          monthly_ai_generations_used: 0,
          reset_date: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)

      console.log(`✓ Payment COMPLETE for organization ${organizationId}`)

      // Detect if this is a new subscription (no previous activated_at)
      const { data: orgData } = await supabase
        .from('organizations')
        .select('activated_at, name')
        .eq('id', organizationId)
        .single()

      const isNewSubscription = !orgData?.activated_at ||
        new Date(orgData.activated_at).getTime() === new Date(itnData.custom_str1 ? '' : '').getTime()

      if (isNewSubscription || !orgData?.activated_at) {
        // Create provisioning job record
        const { error: provJobError } = await supabase
          .from('provisioning_jobs')
          .insert({
            organization_id: organizationId,
            tier: planTier || 'core',
            status: 'pending',
            current_step: 'supabase-project',
            steps_completed: [],
            created_resources: {},
          })

        if (provJobError) {
          console.error('Failed to create provisioning job:', provJobError)
        }

        // Trigger provisioning workflow via N8N
        try {
          const { triggerClientProvisioning } = await import('@/lib/n8n/webhooks')
          await triggerClientProvisioning({
            organizationId,
            clientName: orgData?.name || email_address,
            email: email_address,
            tier: (planTier as 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale') || 'core',
            features: [],
          })
          console.log(`✓ Provisioning triggered for organization ${organizationId}`)
        } catch (provError) {
          console.error('Failed to trigger provisioning:', provError)
          // Non-fatal: provisioning can be retried manually
        }
      }
    } else if (payment_status === 'FAILED') {
      // Payment failed
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'payment_failed',
        })
        .eq('id', organizationId)

      // Log failed transaction
      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          transaction_id: pf_payment_id,
          amount: parseFloat(amount_gross),
          status: 'failed',
          payment_method: 'payfast',
          created_at: new Date().toISOString(),
          payfast_response: itnData,
        })

      console.log(`✗ Payment FAILED for organization ${organizationId}`)

      // TODO: Send payment failure notification email
    } else if (payment_status === 'PENDING') {
      // Payment pending (awaiting EFT confirmation, etc.)
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'payment_pending',
        })
        .eq('id', organizationId)

      console.log(`⏳ Payment PENDING for organization ${organizationId}`)
    } else if (payment_status === 'CANCELLED') {
      // Payment cancelled by user
      await supabase
        .from('organizations')
        .update({
          subscription_status: 'cancelled',
        })
        .eq('id', organizationId)

      // Log cancelled transaction
      await supabase
        .from('subscription_history')
        .insert({
          organization_id: organizationId,
          transaction_id: pf_payment_id,
          amount: parseFloat(amount_gross),
          status: 'cancelled',
          payment_method: 'payfast',
          created_at: new Date().toISOString(),
          payfast_response: itnData,
        })

      console.log(`✗ Payment CANCELLED for organization ${organizationId}`)
    }

    // Return 200 OK to PayFast to acknowledge receipt
    return NextResponse.json(
      { success: true, message: 'ITN processed' },
      { status: 200 }
    )
  } catch (error) {
    console.error('PayFast ITN error:', error)
    return NextResponse.json(
      { error: 'ITN processing failed' },
      { status: 500 }
    )
  }
}

/**
 * GET handler for webhook verification
 * PayFast may verify webhook endpoint with GET request
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

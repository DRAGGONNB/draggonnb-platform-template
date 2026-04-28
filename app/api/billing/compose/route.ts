// app/api/billing/compose/route.ts
// Phase 09 BILL-02/03: subscription composition + PayFast checkout payload.
// Called by the Phase 10 pricing page (BILL-01).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { compose, recordComposition } from '@/lib/billing/composition'
import { createPayFastSubscription, getPayFastConfig } from '@/lib/payments/payfast'
import { getUserOrg } from '@/lib/auth/get-user-org'

const RequestSchema = z.object({
  base_plan_id: z.enum(['core', 'growth', 'scale']),
  addon_ids: z.array(z.string()).default([]),
  include_setup_fee: z.boolean().default(true),
  return_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = RequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { data: userOrg, error: authError } = await getUserOrg()
  if (authError || !userOrg) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const composition = await compose(
      parsed.data.base_plan_id,
      parsed.data.addon_ids,
      { includeSetupFee: parsed.data.include_setup_fee },
    )

    // Record composition + update organizations.billing_plan_snapshot
    await recordComposition(userOrg.organizationId, composition, 'subscribe')

    // Build PayFast subscription payload (recurring, variable amount)
    const cfg = getPayFastConfig()
    const today = new Date()
    const billingDate = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
      .toISOString()
      .split('T')[0]

    const addonCount = parsed.data.addon_ids.length
    const subscriptionPayload = createPayFastSubscription({
      organizationId: userOrg.organizationId,
      organizationName: userOrg.organization.name,
      email: userOrg.email,
      amount: composition.monthly_total_zar_cents / 100,       // rands
      description: `DraggonnB ${parsed.data.base_plan_id.toUpperCase()}${addonCount > 0 ? ` + ${addonCount} addon${addonCount > 1 ? 's' : ''}` : ''} subscription`,
      subscriptionType: '1',  // 1 = recurring (monthly)
      billingDate,
      recurringAmount: composition.monthly_total_zar_cents / 100,  // rands
      cycles: '0',  // 0 = until cancelled
      metadata: {
        planTier: parsed.data.base_plan_id,
      },
    })

    // Setup fee payload (separate one-off).
    // Issued AFTER the user completes first recurring payment — we need the
    // subscription token first, which only arrives in the DRG-* ITN.
    // The client stores this deferred payload and ops charges it when token arrives.
    // Phase 10 refines the UX. This closes Pitfall 22 (setup fee + recurring).
    const setupFeePayload = composition.setup_fee_zar_cents > 0 ? {
      amount_cents: composition.setup_fee_zar_cents,
      amount_rands: (composition.setup_fee_zar_cents / 100).toFixed(2),
      item_name: 'DraggonnB Platform Setup Fee',
      item_description: 'One-off setup and onboarding fee',
      charge_after: 'first_recurring_payment_itn',
    } : null

    return NextResponse.json({
      composition,
      payfast_subscription: subscriptionPayload,
      setup_fee: setupFeePayload,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[billing/compose]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

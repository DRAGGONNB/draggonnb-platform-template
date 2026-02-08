import { NextRequest, NextResponse } from 'next/server'
import { createPayFastSubscription, PRICING_TIERS, getPayFastConfig } from '@/lib/payments/payfast'
import { getUserOrg } from '@/lib/auth/get-user-org'

export async function POST(request: NextRequest) {
  try {
    // Authentication check using getUserOrg helper
    const { data: userOrg, error: authError } = await getUserOrg()

    if (authError || !userOrg) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      )
    }

    const { tier } = await request.json()

    // Validate tier
    if (!tier || !PRICING_TIERS[tier]) {
      return NextResponse.json(
        { error: 'Invalid pricing tier. Valid tiers: starter, professional, enterprise' },
        { status: 400 }
      )
    }

    const pricingTier = PRICING_TIERS[tier]

    // Generate PayFast subscription form data
    const formData = createPayFastSubscription({
      organizationId: userOrg.organizationId,
      organizationName: userOrg.organization.name,
      email: userOrg.email,
      amount: pricingTier.price,
      description: `DraggonnB CRMM - ${pricingTier.name} Plan - Monthly Subscription`,
      subscriptionType: '1',
      billingDate: getNextBillingDate(),
      recurringAmount: pricingTier.price,
      cycles: '0',
      metadata: {
        planTier: tier,
        billingCycle: pricingTier.frequency,
      },
    })

    // Get PayFast URL
    const config = getPayFastConfig()

    return NextResponse.json({
      paymentUrl: config.baseUrl,
      formData,
      tier: tier,
      tierName: pricingTier.name,
      amount: pricingTier.price,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}

function getNextBillingDate(): string {
  const today = new Date()
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate())
  return nextMonth.toISOString().split('T')[0]
}

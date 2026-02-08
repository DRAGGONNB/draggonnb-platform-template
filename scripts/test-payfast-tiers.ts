/**
 * Test script: Validates all 3 pricing tiers generate valid PayFast form data
 * Run with: npx tsx scripts/test-payfast-tiers.ts
 */
import {
  createPayFastSubscription,
  PRICING_TIERS,
  generatePayFastSignature,
  validatePayFastSignature,
  validatePaymentAmount,
} from '../lib/payments/payfast'

// Set env vars for testing (PayFast sandbox)
process.env.PAYFAST_MERCHANT_ID = '10000100'
process.env.PAYFAST_MERCHANT_KEY = '46f0cd694581a'
process.env.PAYFAST_MODE = 'sandbox'
process.env.PAYFAST_RETURN_URL = 'https://draggonnb-app.vercel.app/payment/success'
process.env.PAYFAST_CANCEL_URL = 'https://draggonnb-app.vercel.app/pricing'
process.env.PAYFAST_NOTIFY_URL = 'https://draggonnb-app.vercel.app/api/webhooks/payfast'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  PASS: ${message}`)
    passed++
  } else {
    console.error(`  FAIL: ${message}`)
    failed++
  }
}

console.log('=== PayFast Tier Validation Tests ===\n')

// Test each tier
const tiers = ['starter', 'professional', 'enterprise'] as const

for (const tierId of tiers) {
  const tier = PRICING_TIERS[tierId]
  console.log(`\n--- Testing: ${tier.name} (R${tier.price}/month) ---`)

  const formData = createPayFastSubscription({
    organizationId: `test-org-${tierId}`,
    organizationName: 'Test Company Ltd',
    email: 'test@example.com',
    amount: tier.price,
    description: `DraggonnB CRMM - ${tier.name} Plan - Monthly Subscription`,
    subscriptionType: '1',
    billingDate: '2026-03-01',
    recurringAmount: tier.price,
    cycles: '0',
    metadata: {
      planTier: tierId,
      billingCycle: tier.frequency,
    },
  })

  // Validate required fields
  assert(formData.merchant_id === '10000100', 'Merchant ID is sandbox value')
  assert(formData.merchant_key === '46f0cd694581a', 'Merchant Key is sandbox value')
  assert(formData.amount === tier.price.toFixed(2), `Amount is R${tier.price.toFixed(2)}`)
  assert(formData.recurring_amount === tier.price.toFixed(2), `Recurring amount is R${tier.price.toFixed(2)}`)
  assert(formData.frequency === '3', 'Frequency is 3 (monthly)')
  assert(formData.cycles === '0', 'Cycles is 0 (until cancelled)')
  assert(formData.subscription_type === '1', 'Subscription type is 1')
  assert(formData.return_url.includes('/payment/success'), 'Return URL points to success page')
  assert(formData.cancel_url.includes('/pricing'), 'Cancel URL points to pricing page')
  assert(formData.notify_url.includes('/api/webhooks/payfast'), 'Notify URL points to webhook')
  assert(formData.custom_str1 === `test-org-${tierId}`, 'Organization ID in custom_str1')
  assert(formData.custom_str2 === tierId, 'Plan tier in custom_str2')
  assert(formData.email_address === 'test@example.com', 'Email address set')
  assert(formData.signature.length === 32, 'Signature is 32-char MD5 hash')
  assert(formData.item_name.includes(tier.name), 'Item name includes tier name')

  // Validate signature is verifiable
  const dataForVerification: Record<string, string> = { ...formData }
  const isValid = validatePayFastSignature(dataForVerification)
  assert(isValid, 'Signature validates correctly')

  // Validate payment amount checker
  const amountValid = validatePaymentAmount(formData.amount, tier.price)
  assert(amountValid, 'Payment amount validation passes')

  // Log the PayFast URL that would be used
  console.log(`  PayFast URL: https://sandbox.payfast.co.za/eng/process`)
  console.log(`  Form fields: ${Object.keys(formData).length} fields`)
}

// Test signature generation and validation
console.log('\n\n--- Signature Tests ---')

const testData: Record<string, string> = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  amount: '1500.00',
  item_name: 'Test Item',
}

const sig = generatePayFastSignature(testData)
assert(sig.length === 32, 'Generated signature is 32 chars')
assert(/^[a-f0-9]{32}$/.test(sig), 'Signature is valid hex MD5')

const dataWithSig = { ...testData, signature: sig }
assert(validatePayFastSignature(dataWithSig), 'Signature round-trip validates')

// Test with wrong signature
const dataWithBadSig = { ...testData, signature: 'wrong_signature_here_1234567890ab' }
assert(!validatePayFastSignature(dataWithBadSig), 'Invalid signature correctly rejected')

// Test amount validation
console.log('\n\n--- Amount Validation Tests ---')
assert(validatePaymentAmount('1500.00', 1500), 'Exact amount passes')
assert(validatePaymentAmount('1500.005', 1500), 'Rounding tolerance passes')
assert(!validatePaymentAmount('1499.00', 1500), 'Wrong amount rejected')
assert(!validatePaymentAmount('3500.00', 1500), 'Different tier amount rejected')

// Summary
console.log(`\n\n=== RESULTS ===`)
console.log(`Passed: ${passed}`)
console.log(`Failed: ${failed}`)
console.log(`Total:  ${passed + failed}`)

if (failed > 0) {
  console.error('\nSOME TESTS FAILED!')
  process.exit(1)
} else {
  console.log('\nALL TESTS PASSED!')
}

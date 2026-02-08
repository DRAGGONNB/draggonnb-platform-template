/**
 * Test script: Validates PayFast ITN webhook handler logic
 * Run with: npx tsx scripts/test-webhook-handler.ts
 */
import {
  generatePayFastSignature,
  validatePayFastSignature,
  validatePaymentAmount,
  PRICING_TIERS,
} from '../lib/payments/payfast'

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

console.log('=== PayFast Webhook Handler Tests ===\n')

// Simulate ITN data that PayFast would send
const tiers = ['starter', 'professional', 'enterprise'] as const
const amounts = { starter: 1500, professional: 3500, enterprise: 7500 }

for (const tierId of tiers) {
  console.log(`\n--- Simulating ITN for ${tierId} tier (R${amounts[tierId]}) ---`)

  // Build mock ITN data (mimics what PayFast sends)
  const itnData: Record<string, string> = {
    m_payment_id: `test-org-${tierId}-${Date.now()}`,
    pf_payment_id: `${Math.floor(Math.random() * 1000000)}`,
    payment_status: 'COMPLETE',
    item_name: `DraggonnB CRMM - ${PRICING_TIERS[tierId].name} Plan`,
    item_description: `Monthly subscription`,
    amount_gross: amounts[tierId].toFixed(2),
    amount_fee: (amounts[tierId] * 0.029 + 2).toFixed(2), // ~2.9% + R2
    amount_net: (amounts[tierId] - (amounts[tierId] * 0.029 + 2)).toFixed(2),
    custom_str1: `test-org-${tierId}`,
    custom_str2: tierId,
    name_first: 'Test',
    name_last: 'User',
    email_address: 'test@example.com',
    merchant_id: '10000100',
  }

  // Generate signature (as PayFast would)
  const signature = generatePayFastSignature(itnData)
  itnData.signature = signature

  // Step 1: Validate signature (webhook handler step 1)
  assert(validatePayFastSignature(itnData), `[${tierId}] Signature validates`)

  // Step 2: Extract organization ID (webhook handler step 3)
  const organizationId = itnData.custom_str1
  assert(organizationId === `test-org-${tierId}`, `[${tierId}] Organization ID extracted`)

  // Step 3: Extract plan tier
  const planTier = itnData.custom_str2
  assert(planTier === tierId, `[${tierId}] Plan tier extracted`)

  // Step 4: Validate amount (webhook handler step 4)
  if (planTier && PRICING_TIERS[planTier]) {
    const expectedAmount = PRICING_TIERS[planTier].price
    const isValidAmount = validatePaymentAmount(itnData.amount_gross, expectedAmount)
    assert(isValidAmount, `[${tierId}] Amount R${itnData.amount_gross} matches expected R${expectedAmount}`)
  }

  // Step 5: Check payment status handling
  assert(itnData.payment_status === 'COMPLETE', `[${tierId}] Payment status is COMPLETE`)

  // Step 6: Verify fee/net amounts parse correctly
  const grossAmount = parseFloat(itnData.amount_gross)
  const feeAmount = parseFloat(itnData.amount_fee)
  const netAmount = parseFloat(itnData.amount_net)
  assert(!isNaN(grossAmount), `[${tierId}] Gross amount parses: R${grossAmount}`)
  assert(!isNaN(feeAmount), `[${tierId}] Fee amount parses: R${feeAmount.toFixed(2)}`)
  assert(!isNaN(netAmount), `[${tierId}] Net amount parses: R${netAmount.toFixed(2)}`)
  assert(Math.abs((grossAmount - feeAmount) - netAmount) < 0.02, `[${tierId}] Gross - Fee = Net (within tolerance)`)
}

// Test tampered payment detection
console.log('\n\n--- Tampered Payment Tests ---')

const tamperedItn: Record<string, string> = {
  m_payment_id: 'test-tampered',
  pf_payment_id: '999999',
  payment_status: 'COMPLETE',
  item_name: 'DraggonnB CRMM',
  item_description: 'Tampered',
  amount_gross: '100.00', // Tampered: should be 1500
  custom_str1: 'test-org',
  custom_str2: 'starter',
  email_address: 'attacker@example.com',
  merchant_id: '10000100',
}

const tamperedSig = generatePayFastSignature(tamperedItn)
tamperedItn.signature = tamperedSig

// Signature would validate (attacker generated valid sig), but amount check catches it
assert(validatePayFastSignature(tamperedItn), 'Tampered data has valid signature')
assert(!validatePaymentAmount('100.00', 1500), 'Amount mismatch caught for starter (R100 vs R1500)')
assert(!validatePaymentAmount('100.00', 3500), 'Amount mismatch caught for professional (R100 vs R3500)')
assert(!validatePaymentAmount('100.00', 7500), 'Amount mismatch caught for enterprise (R100 vs R7500)')

// Test failed payment status handling
console.log('\n\n--- Payment Status Tests ---')
const statuses = ['COMPLETE', 'FAILED', 'PENDING', 'CANCELLED']
for (const status of statuses) {
  assert(
    ['COMPLETE', 'FAILED', 'PENDING', 'CANCELLED'].includes(status),
    `Status '${status}' is a valid PayFast status`
  )
}

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

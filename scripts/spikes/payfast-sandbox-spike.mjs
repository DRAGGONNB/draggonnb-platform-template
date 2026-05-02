/**
 * scripts/spikes/payfast-sandbox-spike.mjs
 * Phase 13 Plan 01 — GATE-02 PayFast Sandbox Spike
 *
 * PURPOSE: Confirm three facts before Phase 15 damage code lands:
 *   1. Amount unit for ad-hoc API calls (rands vs cents)
 *   2. Subscribe-token arbitrary-amount charge support
 *   3. Hold-and-capture availability
 *
 * USAGE:
 *   Step 1 (generate Subscribe redirect URL):
 *     node scripts/spikes/payfast-sandbox-spike.mjs
 *
 *   Step 2 (run ad-hoc charge tests after capturing token):
 *     PAYFAST_TEST_TOKEN=<token> node scripts/spikes/payfast-sandbox-spike.mjs
 *
 * NOT a vitest test. NOT imported by production code. Keep outside __tests__.
 * Output JSON: scripts/spikes/payfast-spike-output.json (gitignored)
 */

import crypto from 'crypto'
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

// ---------------------------------------------------------------------------
// Load .env.local (mirrors how Next.js loads env in development)
// ---------------------------------------------------------------------------
const require = createRequire(import.meta.url)
let dotenv
try {
  dotenv = require('dotenv')
} catch {
  console.error('ERROR: dotenv package not found. Run: npm install dotenv')
  process.exit(2)
}
dotenv.config({ path: path.join(repoRoot, '.env.local') })

// ---------------------------------------------------------------------------
// Validate required credentials
// ---------------------------------------------------------------------------
const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE
const TEST_TOKEN = process.env.PAYFAST_TEST_TOKEN
const SPIKE_NOTIFY_URL = process.env.SPIKE_NOTIFY_URL

if (!MERCHANT_ID || !MERCHANT_KEY) {
  console.error(`
ERROR: Missing PayFast credentials. Set these in .env.local:
  PAYFAST_MERCHANT_ID=<from sandbox.payfast.co.za Settings -> Integration>
  PAYFAST_MERCHANT_KEY=<from sandbox.payfast.co.za Settings -> Integration>
  PAYFAST_PASSPHRASE=<from sandbox.payfast.co.za Settings -> Integration>
  SPIKE_NOTIFY_URL=<public HTTPS URL — use ngrok http 3000 or Vercel preview>

See the user_setup section of .planning/phases/13-cross-product-foundation/13-01-PLAN.md.
`)
  process.exit(2)
}

// ---------------------------------------------------------------------------
// Signature helper — mirrors generatePayFastSignature in lib/payments/payfast.ts
// Algorithm: alphabetical sort, URL-encode values, append passphrase if set
// ---------------------------------------------------------------------------
function generateSignature(data, passphrase) {
  const paramString = Object.keys(data)
    .sort()
    .filter(key => key !== 'signature')
    .map(key => `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}`)
    .join('&')

  const stringToHash = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim())}`
    : paramString

  return crypto.createHash('md5').update(stringToHash).digest('hex')
}

// ---------------------------------------------------------------------------
// API header builder — mirrors buildHeaders in lib/payments/payfast-subscription-api.ts
// The timestamp format strips milliseconds and appends +00:00
// ---------------------------------------------------------------------------
function buildApiHeaders(bodyFields, passphrase) {
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+00:00')
  const unsigned = {
    'merchant-id': MERCHANT_ID,
    'version': 'v1',
    'timestamp': timestamp,
    ...bodyFields,
  }
  const signature = generateSignature(unsigned, passphrase ?? '')
  return {
    'merchant-id': MERCHANT_ID,
    'version': 'v1',
    'timestamp': timestamp,
    'signature': signature,
    'Content-Type': 'application/json',
  }
}

const SANDBOX_PROCESS_URL = 'https://sandbox.payfast.co.za/eng/process'
const SANDBOX_API_BASE = 'https://sandbox.payfast.co.za'

// ---------------------------------------------------------------------------
// Output accumulator — written to payfast-spike-output.json at end
// ---------------------------------------------------------------------------
const output = {
  runAt: new Date().toISOString(),
  merchantId: MERCHANT_ID.slice(0, -4) + '****', // redact last 4
  steps: {},
}

const outputPath = path.join(__dirname, 'payfast-spike-output.json')

// ---------------------------------------------------------------------------
// STEP 1: Generate Subscribe redirect URL (subscription_type=2 for ad-hoc)
// ---------------------------------------------------------------------------
async function runStep1() {
  console.log('\n=== STEP 1: Generate PayFast Subscribe Redirect URL ===\n')

  if (!SPIKE_NOTIFY_URL) {
    console.warn('WARNING: SPIKE_NOTIFY_URL is not set in .env.local.')
    console.warn('The ITN will fire but you will not receive the token automatically.')
    console.warn('You can still capture the token from the PayFast sandbox dashboard.')
    console.warn('Set SPIKE_NOTIFY_URL to a public HTTPS URL (e.g. ngrok: ngrok http 3000)\n')
  }

  const timestamp = Date.now()
  const mPaymentId = `SPIKE-${timestamp}`
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://draggonnb-platform.vercel.app'
  const notifyUrl = SPIKE_NOTIFY_URL || `${appUrl}/api/webhooks/payfast`
  const returnUrl = `${appUrl}/payment/success`
  const cancelUrl = `${appUrl}/pricing`

  // subscription_type=2 = ad-hoc (matches PayFast docs for token-based arbitrary charges)
  const formData = {
    amount: '5.00',
    billing_date: getTodayPlusDays(1),
    cancel_url: cancelUrl,
    cycles: '0',
    email_address: 'spike@draggonnb.co.za',
    frequency: '3',
    item_description: 'PayFast sandbox spike for Phase 13 GATE-02 validation',
    item_name: 'SPIKE-13-01',
    m_payment_id: mPaymentId,
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    name_first: 'Spike',
    name_last: 'Test',
    notify_url: notifyUrl,
    recurring_amount: '5.00',
    return_url: returnUrl,
    subscription_type: '2',
  }

  const signature = generateSignature(formData, PASSPHRASE)
  const payload = { ...formData, signature }

  // Build form-encoded query string for redirect URL
  const params = new URLSearchParams(payload)
  const redirectUrl = `${SANDBOX_PROCESS_URL}?${params.toString()}`

  output.steps.step1 = {
    mPaymentId,
    notifyUrl,
    formData: { ...formData, merchant_key: '****' }, // redact key
    redirectUrl,
  }

  console.log(`m_payment_id: ${mPaymentId}`)
  console.log(`notify_url:   ${notifyUrl}`)
  console.log(`\nRedirect URL (open in browser to complete Subscribe checkout):\n`)
  console.log(redirectUrl)
  console.log(`
NEXT STEPS:
  1. Open the URL above in a browser
  2. Complete the sandbox checkout (test card: 4000000000000002, exp: any future date, CVV: any 3 digits)
  3. Accept the subscription agreement
  4. Wait for the ITN to fire to your notify_url (or check PayFast sandbox dashboard -> Subscriptions -> latest entry -> token)
  5. Copy the token value
  6. Add to .env.local: PAYFAST_TEST_TOKEN=<token>
  7. Re-run: node scripts/spikes/payfast-sandbox-spike.mjs
`)

  saveOutput()
}

// ---------------------------------------------------------------------------
// STEP 2-5: Ad-hoc charge tests (requires PAYFAST_TEST_TOKEN)
// ---------------------------------------------------------------------------
async function runSteps2to5(token) {
  console.log(`\n=== STEP 2: Amount Unit Test (rands vs cents) ===`)
  console.log(`Token: ${token.slice(0, 8)}...${token.slice(-4)} (redacted middle)\n`)

  // Call A: amount=250.00 (rands format — 2 decimal string)
  const callA = await sendAdhoc(token, '250.00', 'SPIKE-AMOUNT-RANDS-A', 'Spike rands-format test')
  console.log(`Call A (250.00 rands): HTTP ${callA.status}`)
  console.log(`  Body: ${JSON.stringify(callA.body)}`)

  // Call B: amount=25000 (cents format — integer string, no decimals)
  const callB = await sendAdhoc(token, '25000', 'SPIKE-AMOUNT-CENTS-B', 'Spike cents-format test')
  console.log(`Call B (25000 cents): HTTP ${callB.status}`)
  console.log(`  Body: ${JSON.stringify(callB.body)}`)

  const callASuccess = callA.status >= 200 && callA.status < 300 && !isErrorBody(callA.body)
  const callBSuccess = callB.status >= 200 && callB.status < 300 && !isErrorBody(callB.body)

  let amountUnit = 'UNKNOWN'
  if (callASuccess && !callBSuccess) {
    amountUnit = 'RANDS'
    console.log('\nCONCLUSION Step 2: Amount unit = RANDS (Call A succeeded, Call B failed)')
  } else if (!callASuccess && callBSuccess) {
    amountUnit = 'CENTS'
    console.log('\nCONCLUSION Step 2: Amount unit = CENTS (Call B succeeded, Call A failed)')
  } else if (callASuccess && callBSuccess) {
    amountUnit = 'BOTH_SUCCEEDED — investigate: may be accepting either format or deduplication'
    console.log('\nWARNING Step 2: Both calls succeeded — check if amounts differ (R250 vs R25000)')
  } else {
    amountUnit = 'BOTH_FAILED — check token validity, credentials, and network'
    console.log('\nWARNING Step 2: Both calls failed — check credentials and token')
  }

  output.steps.step2 = {
    callA: { amount: '250.00', status: callA.status, body: callA.body },
    callB: { amount: '25000', status: callB.status, body: callB.body },
    conclusion: amountUnit,
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Arbitrary-amount + idempotency test
  // ---------------------------------------------------------------------------
  console.log('\n=== STEP 3: Arbitrary-Amount + Idempotency Test ===\n')

  // Second amount — different from Step 2
  // Use rands format if rands won, cents format if cents won, default to rands
  const secondAmountValue = amountUnit === 'CENTS' ? '7500' : '75.00'
  const idempotencyId = `SPIKE-IDEMPOTENCY-${Date.now()}`
  const callC = await sendAdhoc(token, secondAmountValue, idempotencyId, 'Spike arbitrary-amount test')
  console.log(`Call C (${secondAmountValue} — different amount, same token): HTTP ${callC.status}`)
  console.log(`  Body: ${JSON.stringify(callC.body)}`)

  // Idempotency re-issue: same m_payment_id as Call C
  const callD = await sendAdhoc(token, secondAmountValue, idempotencyId, 'Spike idempotency re-issue')
  console.log(`Call D (duplicate m_payment_id re-issue): HTTP ${callD.status}`)
  console.log(`  Body: ${JSON.stringify(callD.body)}`)

  const arbitraryAmountSupported = callC.status >= 200 && callC.status < 300 && !isErrorBody(callC.body)
  const idempotencyDetected = callD.status >= 400 || isErrorBody(callD.body) || JSON.stringify(callD.body).toLowerCase().includes('duplicate')

  console.log(`\nCONCLUSION Step 3:`)
  console.log(`  Arbitrary-amount charge supported: ${arbitraryAmountSupported ? 'YES' : 'NO'}`)
  console.log(`  Idempotency detection (duplicate m_payment_id rejected): ${idempotencyDetected ? 'YES' : 'NOT DETECTED'}`)

  output.steps.step3 = {
    amount: secondAmountValue,
    mPaymentId: idempotencyId,
    callC: { status: callC.status, body: callC.body },
    callD_duplicate: { status: callD.status, body: callD.body },
    arbitraryAmountSupported,
    idempotencyDetected,
  }

  // ---------------------------------------------------------------------------
  // STEP 4: Zero/floor constraint test
  // ---------------------------------------------------------------------------
  console.log('\n=== STEP 4: Zero/Floor Constraint Test ===\n')

  const callE = await sendAdhoc(token, '0', 'SPIKE-ZERO-E', 'Spike zero-amount floor test')
  console.log(`Call E (amount=0): HTTP ${callE.status}`)
  console.log(`  Body: ${JSON.stringify(callE.body)}`)

  const zeroRejected = callE.status >= 400 || isErrorBody(callE.body)
  console.log(`\nCONCLUSION Step 4: Zero-amount rejected: ${zeroRejected ? 'YES (floor constraint confirmed)' : 'NO — unexpected, PayFast accepted R0 charge'}`)

  output.steps.step4 = {
    amount: '0',
    status: callE.status,
    body: callE.body,
    zeroAmountRejected: zeroRejected,
  }

  // ---------------------------------------------------------------------------
  // STEP 5: Hold-and-capture probe
  // ---------------------------------------------------------------------------
  console.log('\n=== STEP 5: Hold-and-Capture Availability Probe ===\n')

  // Inspect the successful response bodies from Steps 2-3 for capture/hold fields
  const allSuccessfulBodies = [
    callASuccess ? callA.body : null,
    callBSuccess ? callB.body : null,
    arbitraryAmountSupported ? callC.body : null,
  ].filter(Boolean)

  const holdCaptureFields = ['capture_url', 'hold_reference', 'auth_code', 'authorization_code', 'hold_id', 'capture_token', 'authorize']
  const foundHoldFields = []

  for (const body of allSuccessfulBodies) {
    const bodyStr = JSON.stringify(body).toLowerCase()
    for (const field of holdCaptureFields) {
      if (bodyStr.includes(field.toLowerCase())) {
        foundHoldFields.push(field)
      }
    }
  }

  // Also inspect the fields that ARE present in successful bodies
  const presentFields = allSuccessfulBodies.length > 0
    ? Object.keys(allSuccessfulBodies[0] || {})
    : []

  const holdCaptureAvailable = foundHoldFields.length > 0
  console.log(`Hold/capture fields found in responses: ${foundHoldFields.length > 0 ? foundHoldFields.join(', ') : 'none'}`)
  console.log(`Fields present in successful responses: ${presentFields.join(', ') || '(no successful responses)'}`)
  console.log(`\nCONCLUSION Step 5: Hold-and-capture available: ${holdCaptureAvailable ? 'YES — see fields: ' + foundHoldFields.join(', ') : 'NO — no authorization/capture fields found in response'}`)

  output.steps.step5 = {
    holdCaptureFieldsChecked: holdCaptureFields,
    holdCaptureFieldsFound: foundHoldFields,
    responseFieldsPresent: presentFields,
    holdCaptureAvailable,
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n=== SPIKE SUMMARY ===\n')
  console.log(`Amount unit:                     ${amountUnit}`)
  console.log(`Arbitrary-amount supported:      ${arbitraryAmountSupported ? 'YES' : 'NO'}`)
  console.log(`Hold-and-capture available:      ${holdCaptureAvailable ? 'YES' : 'NO'}`)
  console.log(`\nFull response log: ${outputPath}`)
  console.log(`\nNext step: Reply with "spike done" and these three observations to resume Task 2.`)

  output.summary = {
    amountUnit,
    arbitraryAmountSupported,
    holdCaptureAvailable,
  }

  saveOutput()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sendAdhoc(token, amount, mPaymentId, itemName) {
  const url = `${SANDBOX_API_BASE}/subscriptions/${token}/adhoc`
  const body = {
    amount,
    item_name: itemName,
    item_description: itemName,
    m_payment_id: mPaymentId,
  }
  const headers = buildApiHeaders(body, PASSPHRASE)

  let status = 0
  let responseBody = {}
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    })
    status = res.status
    const text = await res.text()
    try {
      responseBody = JSON.parse(text)
    } catch {
      responseBody = { raw: text }
    }
  } catch (err) {
    responseBody = { error: String(err) }
  }

  return { status, body: responseBody }
}

function isErrorBody(body) {
  if (!body) return true
  const str = JSON.stringify(body).toLowerCase()
  return (
    str.includes('"error"') ||
    str.includes('"status":"error"') ||
    str.includes('"code":4') ||
    str.includes('"code":5') ||
    str.includes('invalid') ||
    str.includes('failed')
  )
}

function getTodayPlusDays(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function saveOutput() {
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf8')
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
if (TEST_TOKEN) {
  runSteps2to5(TEST_TOKEN).catch(err => {
    console.error('Spike failed:', err)
    saveOutput()
    process.exit(1)
  })
} else {
  runStep1().catch(err => {
    console.error('Spike failed:', err)
    process.exit(1)
  })
}

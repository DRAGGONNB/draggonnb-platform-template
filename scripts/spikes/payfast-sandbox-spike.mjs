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
  // BUG-FIX 1: Use INSERTION ORDER (NOT alphabetical sort). PayFast's official PHP
  // SDK at github.com/PayFast/payfast-php-sdk lib/Auth.php and lib/PaymentIntegrations/
  // Notification.php iterates $_POST/data in insertion order — verified working with
  // 302 ACCEPTED via scripts/spikes/payfast-order-probe.mjs on 2026-05-02.
  // Production lib/payments/payfast.ts L244 has the same alphabetical-sort bug.
  // BUG-FIX 2: Encode passphrase spaces as `+` matching field values (PHP urlencode).
  const paramString = Object.keys(data)
    .filter(key => key !== 'signature')
    .map(key => `${key}=${encodeURIComponent(String(data[key]).trim()).replace(/%20/g, '+')}`)
    .join('&')

  const stringToHash = passphrase
    ? `${paramString}&passphrase=${encodeURIComponent(passphrase.trim()).replace(/%20/g, '+')}`
    : paramString

  return crypto.createHash('md5').update(stringToHash).digest('hex')
}

// ---------------------------------------------------------------------------
// API signature — DIFFERENT algorithm from form signature:
// - ALPHABETICAL sort of all keys (including 'passphrase' as a regular key)
// - urlencode each value (with + for spaces)
// - join with &
// Per PayFast SDK lib/Auth.php generateApiSignature() — confirmed against sandbox
// returning HTTP 200 instead of HTTP 405. Different from form's insertion-order rule.
// ---------------------------------------------------------------------------
function generateApiSignature(data, passphrase) {
  const merged = { ...data }
  if (passphrase) merged.passphrase = passphrase
  const paramString = Object.keys(merged)
    .sort()
    .filter(k => k !== 'signature')
    .map(k => `${k}=${encodeURIComponent(String(merged[k]).trim()).replace(/%20/g, '+')}`)
    .join('&')
  return crypto.createHash('md5').update(paramString).digest('hex')
}

function buildApiHeaders(bodyFields, passphrase) {
  const timestamp = new Date().toISOString().replace(/\.\d+Z$/, '+00:00')
  const unsigned = {
    'merchant-id': MERCHANT_ID,
    'version': 'v1',
    'timestamp': timestamp,
    ...bodyFields,
  }
  const signature = generateApiSignature(unsigned, passphrase ?? '')
  return {
    'merchant-id': MERCHANT_ID,
    'version': 'v1',
    'timestamp': timestamp,
    'signature': signature,
    'Content-Type': 'application/json',
  }
}

const SANDBOX_PROCESS_URL = 'https://sandbox.payfast.co.za/eng/process'
// API uses api.payfast.co.za for BOTH sandbox and prod; sandbox enabled via ?testing=true
const PAYFAST_API_BASE = 'https://api.payfast.co.za'

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

  // Field order matches PayFast official SDK $fields array (lib/Auth.php).
  // The signature MUST be computed in the same order as fields are POSTed —
  // PayFast iterates $_POST in insertion order on its server. Reordering this
  // literal will silently break the signature.
  // subscription_type=2 = tokenization (capture a token for future ad-hoc charges).
  // PayFast: type=2 does NOT use frequency/cycles/recurring_amount/billing_date.
  const formData = {
    merchant_id: MERCHANT_ID,
    merchant_key: MERCHANT_KEY,
    return_url: returnUrl,
    cancel_url: cancelUrl,
    notify_url: notifyUrl,
    name_first: 'Spike',
    name_last: 'Test',
    email_address: 'spike@draggonnb.co.za',
    m_payment_id: mPaymentId,
    amount: '5.00',
    item_name: 'SPIKE-13-01',
    item_description: 'PayFast sandbox spike for Phase 13 GATE-02 validation',
    subscription_type: '2',
  }

  // Compute the param string we hash (insertion order — matches generateSignature)
  const paramStringForHash = Object.keys(formData)
    .filter(k => k !== 'signature')
    .map(k => `${k}=${encodeURIComponent(String(formData[k]).trim()).replace(/%20/g, '+')}`)
    .join('&')

  const sigWithPass = generateSignature(formData, PASSPHRASE)
  const sigNoPass = generateSignature(formData, '')

  const useNoPassphrase = process.env.PAYFAST_NO_PASSPHRASE === 'true'
  const signature = useNoPassphrase ? sigNoPass : sigWithPass
  const payload = { ...formData, signature }

  const passphraseSuffix = PASSPHRASE ? `&passphrase=${encodeURIComponent(PASSPHRASE.trim()).replace(/%20/g, '+')}` : ''
  console.log(`\n=== SIGNATURE DIAGNOSTIC ===`)
  console.log(`Mode: ${useNoPassphrase ? 'NO PASSPHRASE' : 'WITH PASSPHRASE'}`)
  console.log(`Passphrase value (length ${(PASSPHRASE || '').length}): ${PASSPHRASE ? `"${PASSPHRASE}"` : '(empty)'}`)
  console.log(`Param string being hashed (insertion order, NOT alphabetical):`)
  console.log(`  ${paramStringForHash}`)
  console.log(`String + passphrase appended:`)
  console.log(`  ${paramStringForHash}${passphraseSuffix}`)
  console.log(`Computed signature WITH passphrase: ${sigWithPass}`)
  console.log(`Computed signature NO passphrase:   ${sigNoPass}`)
  console.log(`Using: ${signature}`)
  console.log(`==============================\n`)

  // PayFast expects an HTML form POST (application/x-www-form-urlencoded), NOT a GET URL.
  // GET-URL transit re-encodes whitespace and reserved chars in ways that break the
  // PHP-side signature recomputation. lib/payments/payfast.ts targets HTML-form POST;
  // we mirror that by emitting a self-submitting HTML file the user opens in browser.
  const hiddenInputs = Object.entries(payload)
    .map(([k, v]) => `    <input type="hidden" name="${escapeHtml(k)}" value="${escapeHtml(String(v))}">`)
    .join('\n')

  const htmlPath = path.join(__dirname, 'payfast-redirect.html')
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>PayFast Sandbox Spike — Auto-submit</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 600px; margin: 4rem auto; padding: 1rem; }
    h1 { color: #c41e3a; }
    button { background: #c41e3a; color: white; border: 0; padding: 1rem 2rem; font-size: 1rem; cursor: pointer; border-radius: 4px; }
    code { background: #f4f4f4; padding: 0.1rem 0.3rem; border-radius: 3px; }
  </style>
</head>
<body>
  <h1>Phase 13 GATE-02 Sandbox Spike</h1>
  <p><strong>m_payment_id:</strong> <code>${escapeHtml(mPaymentId)}</code></p>
  <p>Click below to POST the signed form to PayFast sandbox. The page will redirect.</p>
  <form id="pf" action="${SANDBOX_PROCESS_URL}" method="POST">
${hiddenInputs}
    <button type="submit">Submit to PayFast Sandbox</button>
  </form>
  <script>
    // Auto-submit after 500ms so the user can inspect first if they want.
    setTimeout(() => document.getElementById('pf').submit(), 500);
  </script>
</body>
</html>
`
  fs.writeFileSync(htmlPath, html, 'utf8')

  output.steps.step1 = {
    mPaymentId,
    notifyUrl,
    formData: { ...formData, merchant_key: '****' }, // redact key
    htmlPath,
  }

  console.log(`m_payment_id: ${mPaymentId}`)
  console.log(`notify_url:   ${notifyUrl}`)
  console.log(`\nSelf-submitting HTML form written to:\n  ${htmlPath}`)
  console.log(`
NEXT STEPS:
  1. Open the HTML file in your browser:
       start ${htmlPath}
     (or double-click it from File Explorer)
  2. The page auto-POSTs to PayFast sandbox after 0.5s
  3. Complete the sandbox checkout (test card: 4000000000000002, exp: any future date, CVV: any 3 digits)
  4. Accept the subscription agreement
  5. Wait for the ITN to fire to your notify_url (or check PayFast sandbox dashboard -> Subscriptions -> latest entry -> token)
  6. Copy the token value
  7. Add to .env.local: PAYFAST_TEST_TOKEN=<token>
  8. Re-run: node scripts/spikes/payfast-sandbox-spike.mjs
`)

  saveOutput()
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
  // Sandbox mode: append ?testing=true to the api.payfast.co.za URL.
  // PayFast SDK PayFastApi::$apiUrl is https://api.payfast.co.za regardless of mode.
  const url = `${PAYFAST_API_BASE}/subscriptions/${token}/adhoc?testing=true`
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

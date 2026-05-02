/**
 * scripts/spikes/payfast-signature-probe.mjs
 *
 * Programmatically tests multiple signature-encoding variants against PayFast
 * sandbox /eng/process. Reports which variant PayFast accepts.
 *
 * Variants tested:
 *   V1: encodeURIComponent + replace %20→+ for both values AND passphrase  (current fix)
 *   V2: encodeURIComponent + replace %20→+ for values, %20 for passphrase  (original buggy)
 *   V3: V1 but also encode * ' ( ) ! ~ as PHP urlencode does                (PHP-strict)
 *   V4: rawurlencode style (no + for spaces, %20 everywhere)                (RFC 3986)
 *   V5: V1 with no merchant_key in signature                                (PayFast quirk hypothesis)
 *   V6: NO passphrase at all                                                (account-has-no-passphrase test)
 */
import crypto from 'crypto'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

const require = createRequire(import.meta.url)
require('dotenv').config({ path: path.join(repoRoot, '.env.local') })

const MERCHANT_ID = process.env.PAYFAST_MERCHANT_ID
const MERCHANT_KEY = process.env.PAYFAST_MERCHANT_KEY
const PASSPHRASE = process.env.PAYFAST_PASSPHRASE
const SPIKE_NOTIFY_URL = process.env.SPIKE_NOTIFY_URL || 'https://webhook.site/2892dc63-6328-4e26-b034-2b505ede9d3f'

if (!MERCHANT_ID || !MERCHANT_KEY) {
  console.error('Missing PayFast creds in .env.local')
  process.exit(2)
}

const SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process'

const formData = {
  amount: '5.00',
  cancel_url: 'https://example.com/cancel',
  email_address: 'spike@draggonnb.co.za',
  item_description: 'Phase13Spike',  // No spaces — eliminate one variable for now
  item_name: 'SPIKE-13-01',
  m_payment_id: `SPIKE-${Date.now()}`,
  merchant_id: MERCHANT_ID,
  merchant_key: MERCHANT_KEY,
  name_first: 'Spike',
  name_last: 'Test',
  notify_url: SPIKE_NOTIFY_URL,
  return_url: 'https://example.com/return',
  subscription_type: '2',
}

// Encoding variants
function encV1(s) { return encodeURIComponent(String(s).trim()).replace(/%20/g, '+') }
function encV3(s) {
  // PHP urlencode: like encV1 but also encodes * ' ( ) ! ~
  return encV1(s)
    .replace(/\*/g, '%2A')
    .replace(/'/g, '%27')
    .replace(/\(/g, '%28')
    .replace(/\)/g, '%29')
    .replace(/!/g, '%21')
    .replace(/~/g, '%7E')
}
function encV4(s) { return encodeURIComponent(String(s).trim()) } // RFC 3986, %20 for spaces

function buildParam(data, encoder, excludeKeys = []) {
  return Object.keys(data)
    .sort()
    .filter(k => k !== 'signature' && !excludeKeys.includes(k))
    .map(k => `${k}=${encoder(data[k])}`)
    .join('&')
}

function md5(s) { return crypto.createHash('md5').update(s).digest('hex') }

function buildVariant(name, data, opts) {
  const { encoder, passphrase, passphraseEncoder, excludeFromSig } = opts
  const param = buildParam(data, encoder, excludeFromSig || [])
  const stringToHash = passphrase
    ? `${param}&passphrase=${(passphraseEncoder || encoder)(passphrase)}`
    : param
  const sig = md5(stringToHash)
  return { name, signature: sig, stringToHash }
}

const variants = [
  buildVariant('V1: +/+', formData, { encoder: encV1, passphrase: PASSPHRASE, passphraseEncoder: encV1 }),
  buildVariant('V2: +/%20', formData, { encoder: encV1, passphrase: PASSPHRASE, passphraseEncoder: encV4 }),
  buildVariant('V3: PHP-strict +', formData, { encoder: encV3, passphrase: PASSPHRASE, passphraseEncoder: encV3 }),
  buildVariant('V4: RFC3986 %20', formData, { encoder: encV4, passphrase: PASSPHRASE, passphraseEncoder: encV4 }),
  buildVariant('V5: V1 no merchant_key in sig', formData, { encoder: encV1, passphrase: PASSPHRASE, passphraseEncoder: encV1, excludeFromSig: ['merchant_key'] }),
  buildVariant('V6: no passphrase', formData, { encoder: encV1, passphrase: null }),
]

console.log('=== Variant signatures ===')
for (const v of variants) {
  console.log(`${v.name.padEnd(40)} sig=${v.signature}`)
}

console.log('\n=== Testing each variant against PayFast ===\n')

async function testVariant(v) {
  const body = new URLSearchParams({ ...formData, signature: v.signature })
  try {
    const res = await fetch(SANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual', // don't follow redirects
    })
    const text = await res.text()
    // Extract error info if 400, or note if redirect (302) which means signature accepted
    const sigMismatch = text.includes('signature') && text.includes('does not match')
    const otherError = text.includes('seller is invalid') ? extractInvalidFields(text) : null
    return {
      status: res.status,
      sigMismatch,
      otherError,
      bodySnippet: text.slice(0, 500),
    }
  } catch (e) {
    return { error: String(e) }
  }
}

function extractInvalidFields(html) {
  const matches = []
  const re = /<[^>]*>([a-z_]+):\s*([^<]+)</gi
  let m
  while ((m = re.exec(html)) !== null) {
    matches.push(`${m[1]}: ${m[2].trim().slice(0, 100)}`)
  }
  return matches.slice(0, 5)
}

const results = []
for (const v of variants) {
  process.stdout.write(`Testing ${v.name.padEnd(40)} `)
  const r = await testVariant(v)
  if (r.status === 302) {
    console.log(`✓ HTTP 302 — SIGNATURE ACCEPTED (redirect to ${r.bodySnippet.slice(0, 80) || 'PayFast'})`)
  } else if (r.sigMismatch) {
    console.log(`✗ HTTP ${r.status} — signature mismatch`)
  } else if (r.otherError) {
    console.log(`✓ HTTP ${r.status} — sig OK, but ${JSON.stringify(r.otherError)}`)
  } else {
    console.log(`? HTTP ${r.status} — ${r.bodySnippet.slice(0, 80).replace(/\n/g, ' ')}`)
  }
  results.push({ ...v, ...r })
}

console.log('\n=== Summary ===')
const accepted = results.find(r => r.status === 302 || (r.otherError && !r.sigMismatch))
if (accepted) {
  console.log(`✓ WINNER: ${accepted.name}`)
  console.log(`  Signature: ${accepted.signature}`)
  console.log(`  Encoded passphrase part: ${accepted.stringToHash.split('&passphrase=')[1] || '(none)'}`)
} else {
  console.log('✗ No variant accepted. PayFast may have a non-standard quirk or merchant config issue.')
  console.log('\nFirst 200 chars of response from V1:')
  console.log(results[0].bodySnippet?.slice(0, 200) || '(no body)')
}

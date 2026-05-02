/**
 * Tests insertion-order signing (per PayFast official PHP SDK) instead of
 * alphabetical sort. This is the variant that matches PayFast's actual
 * dataToString() and generateSignature() implementations.
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

const SANDBOX_URL = 'https://sandbox.payfast.co.za/eng/process'

function enc(s) { return encodeURIComponent(String(s).trim()).replace(/%20/g, '+') }

// Build payload IN PAYFAST'S DOCUMENTED FIELD ORDER (per Auth.php $fields array)
// — which IS what their createFormFields() emits when you call it with a typical $data.
function buildPayload({ merchantId, merchantKey, passphrase }) {
  // Use ORDERED literal (insertion order is preserved)
  const data = {}
  data.merchant_id = merchantId
  data.merchant_key = merchantKey
  data.return_url = 'https://example.com/return'
  data.cancel_url = 'https://example.com/cancel'
  data.notify_url = 'https://example.com/notify'
  data.name_first = 'Test'
  data.name_last = 'User'
  data.email_address = 'test@example.com'
  data.m_payment_id = `TEST-${Date.now()}`
  data.amount = '100.00'
  data.item_name = 'TestItem'
  return data
}

function signInsertionOrder(data, passphrase, encodePassphrase) {
  // Match PayFast SDK: iterate keys in insertion order, urlencode values, join with &
  const param = Object.keys(data)
    .filter(k => k !== 'signature')
    .map(k => `${k}=${enc(data[k])}`)
    .join('&')
  let stringToHash = param
  if (passphrase) {
    if (encodePassphrase === 'single') {
      stringToHash += `&passphrase=${enc(passphrase)}`
    } else if (encodePassphrase === 'double') {
      // PayFast SDK Auth.php double-encodes (urlencode of urlencoded value)
      const onceEncoded = enc(passphrase)
      stringToHash += `&passphrase=${enc(onceEncoded)}`
    } else if (encodePassphrase === 'raw') {
      stringToHash += `&passphrase=${passphrase}`
    }
  }
  return { stringToHash, signature: crypto.createHash('md5').update(stringToHash).digest('hex') }
}

async function postAndCheck(data, signature) {
  const body = new URLSearchParams({ ...data, signature })
  try {
    const res = await fetch(SANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    })
    const text = await res.text()
    if (res.status === 302) return { status: 302, msg: '✓ ACCEPTED (302 redirect to checkout)' }
    if (text.includes('does not match')) return { status: res.status, msg: '✗ signature mismatch' }
    if (text.includes('seller is invalid')) {
      const errs = []
      const re = /([a-z_]+):\s*([A-Z][^<\n]{1,100})/gi
      let m
      while ((m = re.exec(text)) !== null && errs.length < 3) {
        if (m[1].length > 2) errs.push(`${m[1]}: ${m[2].trim()}`)
      }
      return { status: res.status, msg: `✓ sig OK, other errors: ${errs.join(' | ') || '(none parsed)'}` }
    }
    return { status: res.status, msg: `? unexpected: ${text.slice(0, 100).replace(/\s+/g, ' ')}` }
  } catch (e) {
    return { status: 0, msg: `ERROR: ${e}` }
  }
}

const accounts = [
  { label: 'YOUR sandbox + passphrase', merchantId: process.env.PAYFAST_MERCHANT_ID, merchantKey: process.env.PAYFAST_MERCHANT_KEY, passphrase: process.env.PAYFAST_PASSPHRASE },
  { label: 'YOUR sandbox no passphrase', merchantId: process.env.PAYFAST_MERCHANT_ID, merchantKey: process.env.PAYFAST_MERCHANT_KEY, passphrase: null },
  { label: 'PayFast default + no passphrase', merchantId: '10000100', merchantKey: '46f0cd694581a', passphrase: null },
]

const passphraseModes = ['single', 'double', 'raw']

console.log('=== Testing INSERTION-ORDER (PayFast SDK style) ===\n')

for (const account of accounts) {
  console.log(`\n--- ${account.label}`)
  for (const mode of (account.passphrase ? passphraseModes : ['n/a'])) {
    const data = buildPayload(account)
    const { stringToHash, signature } = signInsertionOrder(data, account.passphrase, mode)
    const r = await postAndCheck(data, signature)
    console.log(`  passphrase-encoding=${mode.padEnd(7)} sig=${signature.slice(0,8)}... ${r.msg}`)
  }
}

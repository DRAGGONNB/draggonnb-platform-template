/**
 * Tests if the PayFast sandbox merchant credentials work at all by trying
 * PayFast's documented default sandbox merchant (10000100/46f0cd694581a, no passphrase)
 * vs the credentials currently in .env.local.
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

function sign(data, passphrase) {
  const param = Object.keys(data)
    .sort()
    .filter(k => k !== 'signature')
    .map(k => `${k}=${enc(data[k])}`)
    .join('&')
  const stringToHash = passphrase ? `${param}&passphrase=${enc(passphrase)}` : param
  return crypto.createHash('md5').update(stringToHash).digest('hex')
}

const baseFields = {
  amount: '100.00',
  cancel_url: 'https://example.com/cancel',
  email_address: 'test@example.com',
  item_name: 'TestProduct',
  m_payment_id: `TEST-${Date.now()}`,
  name_first: 'Test',
  name_last: 'User',
  notify_url: 'https://example.com/notify',
  return_url: 'https://example.com/return',
}

const accounts = [
  {
    label: 'PayFast default sandbox (no passphrase)',
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: null,
  },
  {
    label: 'PayFast default sandbox (no passphrase, with passphrase appended anyway)',
    merchant_id: '10000100',
    merchant_key: '46f0cd694581a',
    passphrase: '',
  },
  {
    label: 'YOUR sandbox account, no passphrase',
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    passphrase: null,
  },
  {
    label: 'YOUR sandbox account, with passphrase',
    merchant_id: process.env.PAYFAST_MERCHANT_ID,
    merchant_key: process.env.PAYFAST_MERCHANT_KEY,
    passphrase: process.env.PAYFAST_PASSPHRASE,
  },
]

async function test(account) {
  const data = {
    ...baseFields,
    merchant_id: account.merchant_id,
    merchant_key: account.merchant_key,
  }
  const signature = sign(data, account.passphrase)
  const body = new URLSearchParams({ ...data, signature })
  try {
    const res = await fetch(SANDBOX_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    })
    const text = await res.text()
    let result
    if (res.status === 302) {
      result = `✓ HTTP 302 (signature ACCEPTED, redirect to checkout)`
    } else if (text.includes('does not match')) {
      result = `✗ HTTP ${res.status} signature mismatch`
    } else if (text.includes('seller is invalid')) {
      // Extract error fields
      const errs = []
      const re = /([a-z_]+):\s*([A-Z][^<\n]{1,80})/gi
      let m
      while ((m = re.exec(text)) !== null && errs.length < 5) {
        if (m[1].length > 2) errs.push(`${m[1]}: ${m[2].trim()}`)
      }
      result = `✓ HTTP ${res.status} sig OK but seller errors: ${errs.join(' | ') || '(none parsed)'}`
    } else if (res.status >= 200 && res.status < 400) {
      result = `? HTTP ${res.status} (probably OK) — first 100 chars: ${text.slice(0, 100).replace(/\s+/g, ' ')}`
    } else {
      result = `? HTTP ${res.status} — first 100 chars: ${text.slice(0, 100).replace(/\s+/g, ' ')}`
    }
    return { signature, result, status: res.status }
  } catch (e) {
    return { signature, result: `ERROR: ${e}`, status: 0 }
  }
}

console.log('Testing PayFast sandbox with multiple merchant configs...\n')
for (const account of accounts) {
  console.log(`--- ${account.label}`)
  console.log(`    merchant_id: ${account.merchant_id}`)
  console.log(`    merchant_key: ${account.merchant_key}`)
  console.log(`    passphrase: ${account.passphrase === null ? '(NULL — not appended)' : account.passphrase === '' ? '(empty string)' : account.passphrase}`)
  const r = await test(account)
  console.log(`    signature: ${r.signature}`)
  console.log(`    ${r.result}\n`)
}

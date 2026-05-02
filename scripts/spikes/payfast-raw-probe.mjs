/**
 * Captures the full response from PayFast for inspection. Tries the simplest
 * possible payload that PayFast's docs say should work.
 */
import crypto from 'crypto'
import { createRequire } from 'module'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '../..')

const require = createRequire(import.meta.url)
require('dotenv').config({ path: path.join(repoRoot, '.env.local') })

function enc(s) { return encodeURIComponent(String(s).trim()).replace(/%20/g, '+') }

function sign(data, passphrase) {
  const param = Object.keys(data)
    .sort()
    .filter(k => k !== 'signature')
    .map(k => `${k}=${enc(data[k])}`)
    .join('&')
  const stringToHash = passphrase ? `${param}&passphrase=${enc(passphrase)}` : param
  return { stringToHash, signature: crypto.createHash('md5').update(stringToHash).digest('hex') }
}

// Minimal one-time payment (NOT subscription) to PayFast's default sandbox
const data = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  return_url: 'https://example.com/return',
  cancel_url: 'https://example.com/cancel',
  notify_url: 'https://example.com/notify',
  name_first: 'Test',
  name_last: 'User',
  email_address: 'test@example.com',
  m_payment_id: `TEST-${Date.now()}`,
  amount: '100.00',
  item_name: 'TestItem',
}

const { stringToHash, signature } = sign(data, null)
console.log('String to hash (no passphrase):')
console.log(`  ${stringToHash}`)
console.log(`Signature: ${signature}\n`)

const body = new URLSearchParams({ ...data, signature })
console.log('POST body:')
console.log(`  ${body.toString()}\n`)

const res = await fetch('https://sandbox.payfast.co.za/eng/process', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: body.toString(),
  redirect: 'manual',
})

console.log(`HTTP Status: ${res.status}`)
console.log(`Response headers:`)
for (const [k, v] of res.headers.entries()) {
  console.log(`  ${k}: ${v}`)
}

const text = await res.text()
console.log(`\nResponse body length: ${text.length}`)

// Save full HTML for inspection
const htmlPath = path.join(__dirname, 'payfast-raw-response.html')
fs.writeFileSync(htmlPath, text, 'utf8')
console.log(`Full response saved to: ${htmlPath}`)

// Extract the error message section
const match = text.match(/seller is invalid:[\s\S]{0,2000}/i)
if (match) {
  // Strip HTML tags for readability
  const stripped = match[0]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 1000)
  console.log(`\n=== Extracted error block ===\n${stripped}\n`)
}

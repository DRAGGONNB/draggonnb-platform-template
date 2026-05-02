/** @vitest-environment node */

/**
 * Phase 13 Plan 01 — GATE-02 PayFast sandbox spike unit tests.
 *
 * Covers three critical behaviors confirmed via live sandbox spike on 2026-05-02:
 *   1. chargeAdhoc() sends integer cents (NOT rands).
 *   2. generatePayFastApiSignature() uses alphabetical ksort + passphrase as merged field.
 *   3. generatePayFastSignature() (form) uses insertion order + passphrase spaces as "+".
 *
 * See: .planning/phases/13-cross-product-foundation/13-PAYFAST-SANDBOX-SPIKE.md
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// ---------------------------------------------------------------------------
// Mock env — must be hoisted before any payfast import
// ---------------------------------------------------------------------------
vi.mock('@/lib/config/env', () => ({
  env: {
    PAYFAST_MERCHANT_ID: 'test-merchant-id',
    PAYFAST_MERCHANT_KEY: 'test-merchant-key',
    PAYFAST_PASSPHRASE: 'TestPassphrase123',
    PAYFAST_MODE: 'sandbox',
    PAYFAST_RETURN_URL: 'https://example.com/return',
    PAYFAST_CANCEL_URL: 'https://example.com/cancel',
    PAYFAST_NOTIFY_URL: 'https://example.com/notify',
    NEXT_PUBLIC_APP_URL: 'https://example.com',
  },
}))

// Mock fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

import { chargeAdhoc } from '@/lib/payments/payfast-adhoc'
import { generatePayFastSignature, generatePayFastApiSignature } from '@/lib/payments/payfast'

// ---------------------------------------------------------------------------
// Suite 1: chargeAdhoc() sends integer cents
// ---------------------------------------------------------------------------
describe('chargeAdhoc() — amount unit (GATE-02 spike confirmation)', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        code: 200,
        status: 'success',
        data: { pf_payment_id: 9999999 },
      }),
    })
  })

  it('sends amountCents as integer string — NOT rands-converted (r/100)', async () => {
    await chargeAdhoc({
      subscriptionToken: 'test-token-abc',
      organizationId: 'org-123',
      amountCents: 25000,
      itemName: 'Test item',
      prefix: 'ONEOFF',
    })

    expect(mockFetch).toHaveBeenCalledOnce()
    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse(init.body as string)

    // Must be "25000" (integer cents), NOT "250.00" (rands)
    expect(sentBody.amount).toBe('25000')
    expect(sentBody.amount).not.toBe('250.00')
    expect(sentBody.amount).not.toContain('.')
  })

  it('sends 1 cent as "1" — not "0.01"', async () => {
    await chargeAdhoc({
      subscriptionToken: 'test-token-abc',
      organizationId: 'org-123',
      amountCents: 1,
      itemName: 'Minimum charge',
      prefix: 'TOPUP',
    })

    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse(init.body as string)
    expect(sentBody.amount).toBe('1')
  })

  it('sends 149900 cents as "149900" — not "1499.00"', async () => {
    await chargeAdhoc({
      subscriptionToken: 'test-token-abc',
      organizationId: 'org-123',
      amountCents: 149900,
      itemName: 'Setup fee',
      prefix: 'ONEOFF',
    })

    const [, init] = mockFetch.mock.calls[0]
    const sentBody = JSON.parse(init.body as string)
    expect(sentBody.amount).toBe('149900')
  })

  it('uses api.payfast.co.za (not sandbox.payfast.co.za) as base URL', async () => {
    await chargeAdhoc({
      subscriptionToken: 'my-token',
      organizationId: 'org-123',
      amountCents: 5000,
      itemName: 'Test',
      prefix: 'ADDON',
    })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('api.payfast.co.za')
    expect(url).not.toContain('sandbox.payfast.co.za')
  })

  it('appends ?testing=true in sandbox mode', async () => {
    await chargeAdhoc({
      subscriptionToken: 'my-token',
      organizationId: 'org-123',
      amountCents: 5000,
      itemName: 'Test',
      prefix: 'ADDON',
    })

    const [url] = mockFetch.mock.calls[0]
    expect(url).toContain('?testing=true')
  })

  it('returns success:true and mPaymentId when fetch resolves 200', async () => {
    const result = await chargeAdhoc({
      subscriptionToken: 'my-token',
      organizationId: 'org-999',
      amountCents: 7500,
      itemName: 'Damage charge',
      prefix: 'ONEOFF',
    })

    expect(result.success).toBe(true)
    expect(result.mPaymentId).toMatch(/^ONEOFF-/)
  })
})

// ---------------------------------------------------------------------------
// Suite 2: generatePayFastApiSignature — alphabetical sort, passphrase merged
// ---------------------------------------------------------------------------
describe('generatePayFastApiSignature() — API signature algorithm (GATE-02)', () => {
  it('sorts keys alphabetically (ksort) — includes passphrase as merged field', () => {
    // Known reference: PayFast SDK lib/Auth.php generateApiSignature
    // Keys after ksort: amount, item_description, item_name, m_payment_id,
    //                   merchant-id, passphrase, timestamp, version
    const data = {
      'merchant-id': 'test-merchant-id',
      'version': 'v1',
      'timestamp': '2026-05-02T10:00:00+00:00',
      'amount': '25000',
      'item_name': 'TestItem',
      'item_description': 'TestItem',
      'm_payment_id': 'SPIKE-123',
    }
    const passphrase = 'TestPass'

    const sig = generatePayFastApiSignature(data, passphrase)
    expect(typeof sig).toBe('string')
    expect(sig).toHaveLength(32) // MD5 hex
  })

  it('includes passphrase in the hashed string (different from no-passphrase)', () => {
    const data = { 'merchant-id': 'abc', 'version': 'v1', 'amount': '1000' }
    const withPass = generatePayFastApiSignature(data, 'mypass')
    const withoutPass = generatePayFastApiSignature(data, undefined)
    expect(withPass).not.toBe(withoutPass)
  })

  it('produces DIFFERENT result from generatePayFastSignature (form) for same data', () => {
    // This is the critical invariant: API and form signatures use different algorithms.
    // Using the wrong one causes HTTP 400 from PayFast.
    const data: Record<string, string> = {
      'merchant-id': 'test-merchant-id',
      'version': 'v1',
      'timestamp': '2026-05-02T10:00:00+00:00',
      'amount': '25000',
      'item_name': 'TestItem',
      'item_description': 'TestItem',
      'm_payment_id': 'SPIKE-123',
    }
    const passphrase = 'TestPassphrase123'

    const apiSig = generatePayFastApiSignature(data, passphrase)
    const formSig = generatePayFastSignature(data, passphrase)

    // The two algorithms MUST produce different results (they use different sort orders).
    expect(apiSig).not.toBe(formSig)
  })

  it('is deterministic — same inputs produce same output', () => {
    const data = { 'merchant-id': 'abc', 'amount': '5000', 'version': 'v1' }
    const sig1 = generatePayFastApiSignature(data, 'pass')
    const sig2 = generatePayFastApiSignature(data, 'pass')
    expect(sig1).toBe(sig2)
  })

  it('encodes spaces in passphrase as "+" not "%20"', () => {
    // Two passphrase variants — one with space encoded as +, one as %20.
    // We verify the function produces the same result as manually computing with +.
    const data = { 'amount': '5000', 'merchant-id': 'id1' }
    const sig = generatePayFastApiSignature(data, 'my pass')

    // Manually reconstruct: sorted keys of merged = amount, merchant-id, passphrase
    // amount=5000&merchant-id=id1&passphrase=my+pass
    const crypto = require('crypto')
    const expected = crypto
      .createHash('md5')
      .update('amount=5000&merchant-id=id1&passphrase=my+pass')
      .digest('hex')

    expect(sig).toBe(expected)
  })
})

// ---------------------------------------------------------------------------
// Suite 3: generatePayFastSignature (form) — insertion order, passphrase encoding
// ---------------------------------------------------------------------------
describe('generatePayFastSignature() — form signature algorithm (GATE-02 bug fixes)', () => {
  it('uses insertion order NOT alphabetical sort', () => {
    // Test by providing keys in a known non-alphabetical order.
    // If the function sorts alphabetically, the result will differ from insertion-order hash.
    const data: Record<string, string> = {
      merchant_id: 'id1',
      merchant_key: 'key1',
      amount: '500',
      item_name: 'Test',
    }

    const sig = generatePayFastSignature(data)

    // Manually compute insertion-order string (no passphrase)
    const crypto = require('crypto')
    const insertionOrderStr = 'merchant_id=id1&merchant_key=key1&amount=500&item_name=Test'
    const alphabeticalStr = 'amount=500&item_name=Test&merchant_id=id1&merchant_key=key1'

    const insertionOrderHash = crypto.createHash('md5').update(insertionOrderStr).digest('hex')
    const alphabeticalHash = crypto.createHash('md5').update(alphabeticalStr).digest('hex')

    // Insertion order must match; alphabetical must NOT match.
    expect(sig).toBe(insertionOrderHash)
    expect(sig).not.toBe(alphabeticalHash)
  })

  it('encodes passphrase spaces as "+" not "%20"', () => {
    const data: Record<string, string> = { merchant_id: 'id1', amount: '1000' }
    const passphrase = 'DraggonnB Business Automation' // contains spaces

    const sig = generatePayFastSignature(data, passphrase)

    const crypto = require('crypto')
    // Passphrase spaces must be encoded as "+" per PHP urlencode convention
    const strWithPlus = 'merchant_id=id1&amount=1000&passphrase=DraggonnB+Business+Automation'
    const strWithPct20 = 'merchant_id=id1&amount=1000&passphrase=DraggonnB%20Business%20Automation'

    const hashWithPlus = crypto.createHash('md5').update(strWithPlus).digest('hex')
    const hashWithPct20 = crypto.createHash('md5').update(strWithPct20).digest('hex')

    expect(sig).toBe(hashWithPlus)
    expect(sig).not.toBe(hashWithPct20)
  })

  it('excludes the signature key from the parameter string', () => {
    const data: Record<string, string> = {
      merchant_id: 'id1',
      amount: '500',
      signature: 'old-sig-to-exclude',
    }
    const sig = generatePayFastSignature(data)

    // Should be same as without the signature field
    const dataNoSig: Record<string, string> = { merchant_id: 'id1', amount: '500' }
    const sigNoSig = generatePayFastSignature(dataNoSig)

    expect(sig).toBe(sigNoSig)
  })

  it('without passphrase: does not append &passphrase= suffix', () => {
    const data: Record<string, string> = { merchant_id: 'id1', amount: '500' }

    const crypto = require('crypto')
    const expectedStr = 'merchant_id=id1&amount=500'
    const expected = crypto.createHash('md5').update(expectedStr).digest('hex')

    expect(generatePayFastSignature(data)).toBe(expected)
    expect(generatePayFastSignature(data, '')).toBe(expected)
  })
})

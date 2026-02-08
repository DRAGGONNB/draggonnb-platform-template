/** @vitest-environment node */

import { describe, expect, it } from 'vitest'
import { generatePayFastSignature, validatePayFastSignature } from '@/lib/payments/payfast'
import { PAYFAST_TEST_VECTORS } from '../../../fixtures/payfast-vectors'

describe('PayFast signature validation', () => {
  describe('generatePayFastSignature', () => {
    it('generates correct MD5 signature without passphrase', () => {
      const { input, expectedSignature } = PAYFAST_TEST_VECTORS.withoutPassphrase
      const signature = generatePayFastSignature(input)

      expect(signature).toBe(expectedSignature)
      expect(signature).toMatch(/^[a-f0-9]{32}$/) // MD5 hash is 32 hex chars
    })

    it('generates correct MD5 signature with passphrase', () => {
      const { input, expectedSignature, passphrase } = PAYFAST_TEST_VECTORS.withPassphrase
      const signature = generatePayFastSignature(input, passphrase)

      expect(signature).toBe(expectedSignature)
      expect(signature).toMatch(/^[a-f0-9]{32}$/)
    })

    it('excludes signature field from hash calculation', () => {
      const { input, expectedSignature } = PAYFAST_TEST_VECTORS.withoutPassphrase

      // Add a signature field to the input
      const inputWithSignature = {
        ...input,
        signature: 'this-should-be-ignored',
      }

      const signature = generatePayFastSignature(inputWithSignature)

      // Should produce the same signature as without the signature field
      expect(signature).toBe(expectedSignature)
    })

    it('handles special characters in values (URL encoding)', () => {
      const { input, expectedSignature } = PAYFAST_TEST_VECTORS.specialChars
      const signature = generatePayFastSignature(input)

      expect(signature).toBe(expectedSignature)
    })

    it('generates different signatures for different data', () => {
      const { input: input1 } = PAYFAST_TEST_VECTORS.withoutPassphrase
      const { input: input2 } = PAYFAST_TEST_VECTORS.withPassphrase

      const signature1 = generatePayFastSignature(input1)
      const signature2 = generatePayFastSignature(input2)

      expect(signature1).not.toBe(signature2)
    })

    it('generates different signatures with and without passphrase', () => {
      const { input } = PAYFAST_TEST_VECTORS.withPassphrase

      const signatureWithout = generatePayFastSignature(input)
      const signatureWith = generatePayFastSignature(input, 'testpassphrase123')

      expect(signatureWithout).not.toBe(signatureWith)
    })
  })

  describe('validatePayFastSignature', () => {
    it('returns true for valid signature without passphrase', () => {
      const { input, expectedSignature } = PAYFAST_TEST_VECTORS.withoutPassphrase
      const dataWithSignature = {
        ...input,
        signature: expectedSignature,
      }

      const isValid = validatePayFastSignature(dataWithSignature)
      expect(isValid).toBe(true)
    })

    it('returns true for valid signature with passphrase', () => {
      const { input, expectedSignature, passphrase } = PAYFAST_TEST_VECTORS.withPassphrase
      const dataWithSignature = {
        ...input,
        signature: expectedSignature,
      }

      const isValid = validatePayFastSignature(dataWithSignature, passphrase)
      expect(isValid).toBe(true)
    })

    it('returns false for invalid signature', () => {
      const { input } = PAYFAST_TEST_VECTORS.withoutPassphrase
      const dataWithBadSignature = {
        ...input,
        signature: 'invalid-signature-12345',
      }

      const isValid = validatePayFastSignature(dataWithBadSignature)
      expect(isValid).toBe(false)
    })

    it('returns false when signature is missing', () => {
      const { input } = PAYFAST_TEST_VECTORS.withoutPassphrase

      const isValid = validatePayFastSignature(input)
      expect(isValid).toBe(false)
    })

    it('returns false when passphrase is incorrect', () => {
      const { input, expectedSignature, passphrase } = PAYFAST_TEST_VECTORS.withPassphrase
      const dataWithSignature = {
        ...input,
        signature: expectedSignature,
      }

      // Validate with wrong passphrase
      const isValid = validatePayFastSignature(dataWithSignature, 'wrong-passphrase')
      expect(isValid).toBe(false)
    })

    it('validates ITN payload correctly', () => {
      const { input, expectedSignature } = PAYFAST_TEST_VECTORS.itnValidation
      const dataWithSignature = {
        ...input,
        signature: expectedSignature,
      }

      const isValid = validatePayFastSignature(dataWithSignature)
      expect(isValid).toBe(true)
    })

    it('returns false when data is tampered after signing', () => {
      const { input, expectedSignature } = PAYFAST_TEST_VECTORS.withoutPassphrase
      const dataWithSignature = {
        ...input,
        signature: expectedSignature,
      }

      // Tamper with the amount after signing
      const tamperedData = {
        ...dataWithSignature,
        amount: '9999.99', // Changed from 1500.00
      }

      const isValid = validatePayFastSignature(tamperedData)
      expect(isValid).toBe(false)
    })
  })

  describe('signature determinism', () => {
    it('generates same signature for same input (deterministic)', () => {
      const { input } = PAYFAST_TEST_VECTORS.withoutPassphrase

      const signature1 = generatePayFastSignature(input)
      const signature2 = generatePayFastSignature(input)

      expect(signature1).toBe(signature2)
    })

    it('is case-sensitive', () => {
      const input1 = {
        merchant_id: '10000100',
        merchant_key: '46f0cd694581a',
        amount: '1500.00',
      }

      const input2 = {
        merchant_id: '10000100',
        merchant_key: '46F0CD694581A', // Uppercase key
        amount: '1500.00',
      }

      const signature1 = generatePayFastSignature(input1)
      const signature2 = generatePayFastSignature(input2)

      expect(signature1).not.toBe(signature2)
    })
  })
})

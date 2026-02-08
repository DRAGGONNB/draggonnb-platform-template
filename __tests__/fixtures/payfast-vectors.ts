import crypto from 'crypto'

/**
 * PayFast Test Vectors - Known inputs with pre-computed MD5 signatures
 * These vectors are used to test PayFast signature generation and validation
 */

/**
 * Helper to compute MD5 signature (used to pre-compute expected values)
 */
function computeSignature(paramString: string): string {
  return crypto.createHash('md5').update(paramString).digest('hex')
}

/**
 * Test Vector 1: Basic payment form without passphrase
 */
const withoutPassphraseInput = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  amount: '1500.00',
  item_name: 'DraggonnB CRMM - Starter Plan',
}

// Manually build param string (alphabetically sorted, URL encoded with + for spaces)
const withoutPassphraseString = 'amount=1500.00&item_name=DraggonnB+CRMM+-+Starter+Plan&merchant_id=10000100&merchant_key=46f0cd694581a'
const withoutPassphraseSignature = computeSignature(withoutPassphraseString)

/**
 * Test Vector 2: Payment form with passphrase
 */
const withPassphraseInput = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  amount: '3500.00',
  item_name: 'DraggonnB CRMM - Professional Plan',
}

const withPassphraseString = 'amount=3500.00&item_name=DraggonnB+CRMM+-+Professional+Plan&merchant_id=10000100&merchant_key=46f0cd694581a&passphrase=testpassphrase123'
const withPassphraseSignature = computeSignature(withPassphraseString)

/**
 * Test Vector 3: ITN validation payload
 */
const itnValidationInput = {
  m_payment_id: 'test-org-123-1234567890',
  pf_payment_id: '123456',
  payment_status: 'COMPLETE',
  item_name: 'DraggonnB CRMM - Starter Plan',
  item_description: 'Monthly subscription',
  amount_gross: '1500.00',
  amount_fee: '45.00',
  amount_net: '1455.00',
  custom_str1: 'test-org-123',
  custom_str2: 'starter',
  email_address: 'test@example.com',
  merchant_id: '10000100',
}

// Build ITN param string (alphabetically sorted)
const itnValidationString = Object.keys(itnValidationInput)
  .sort()
  .map(key => `${key}=${encodeURIComponent(itnValidationInput[key as keyof typeof itnValidationInput]).replace(/%20/g, '+')}`)
  .join('&')
const itnValidationSignature = computeSignature(itnValidationString)

/**
 * Test Vector 4: Special characters in values
 */
const specialCharsInput = {
  merchant_id: '10000100',
  merchant_key: '46f0cd694581a',
  amount: '7500.00',
  item_name: 'Test Product: Premium & Enterprise',
  item_description: 'Description with spaces, symbols: @#$%',
}

// Special chars get URL encoded
const specialCharsString = Object.keys(specialCharsInput)
  .sort()
  .map(key => `${key}=${encodeURIComponent(specialCharsInput[key as keyof typeof specialCharsInput]).replace(/%20/g, '+')}`)
  .join('&')
const specialCharsSignature = computeSignature(specialCharsString)

/**
 * Exported test vectors for use in tests
 */
export const PAYFAST_TEST_VECTORS = {
  withoutPassphrase: {
    input: withoutPassphraseInput,
    expectedSignature: withoutPassphraseSignature,
    passphrase: undefined,
  },
  withPassphrase: {
    input: withPassphraseInput,
    expectedSignature: withPassphraseSignature,
    passphrase: 'testpassphrase123',
  },
  itnValidation: {
    input: itnValidationInput,
    expectedSignature: itnValidationSignature,
    passphrase: undefined,
  },
  specialChars: {
    input: specialCharsInput,
    expectedSignature: specialCharsSignature,
    passphrase: undefined,
  },
}

/** @vitest-environment node */

import { describe, it, expect } from 'vitest'
import { scrubPII } from '@/lib/brand-voice/pii-scrubber'

describe('scrubPII', () => {
  it('redacts email addresses', () => {
    expect(scrubPII('Reach me at chris@draggonnb.co.za')).toBe('Reach me at [REDACTED]')
  })

  it('redacts SA mobile numbers in both +27 and 0 formats', () => {
    const result = scrubPII('Call +27821234567 or 0821234567')
    expect(result).not.toContain('+27821234567')
    expect(result).not.toContain('0821234567')
    expect(result).toContain('[REDACTED]')
  })

  it('redacts 13-digit SA ID numbers', () => {
    // Valid SA ID: 850101 5009 08 7 (DOB 1985-01-01)
    expect(scrubPII('8501015009087')).toBe('[REDACTED]')
  })

  it('redacts sk- style API keys', () => {
    const apiKey = 'sk-' + 'a'.repeat(48)
    expect(scrubPII(apiKey)).toBe('[REDACTED]')
  })

  it('redacts eyJ JWT-style tokens', () => {
    const jwt = 'eyJ' + 'a'.repeat(40)
    expect(scrubPII(`Token: ${jwt}`)).toBe('Token: [REDACTED]')
  })

  it('redacts Visa credit card numbers', () => {
    expect(scrubPII('Card: 4111111111111111')).toBe('Card: [REDACTED]')
  })

  it('redacts Mastercard credit card numbers', () => {
    expect(scrubPII('Card: 5500000000000004')).toBe('Card: [REDACTED]')
  })

  it('passes through non-PII text unchanged', () => {
    const safe = 'Our brand is bold and confident'
    expect(scrubPII(safe)).toBe(safe)
  })

  it('handles multiple PII occurrences in the same string', () => {
    const text = 'Email: chris@draggonnb.co.za, Phone: 0821234567, ID: 8501015009087'
    const result = scrubPII(text)
    expect(result).not.toContain('chris@draggonnb.co.za')
    expect(result).not.toContain('0821234567')
    expect(result).not.toContain('8501015009087')
    expect(result.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(3)
  })
})

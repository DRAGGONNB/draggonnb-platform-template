/**
 * PII Scrubber (VOICE-07)
 * Strips South African PII from brand voice text before storage.
 * Applied as part of the save route sequence: assemble → scrubPII → padToCacheFloor → upsert.
 */

// Email addresses
const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g

// SA mobile numbers: +27 or 06x/07x/08x with 9 remaining digits
const SA_MOBILE_RE = /(\+27|0)[6-8][0-9]{8}/g

// SA ID numbers: 13 digits matching YY(MM)(DD)SSSS0CZ pattern
const SA_ID_RE = /\b[0-9]{2}(0[1-9]|1[0-2])(0[1-9]|[12][0-9]|3[01])[0-9]{7}\b/g

// Common API key prefixes
const API_KEY_RE = /\b(sk-[A-Za-z0-9]{48}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9._-]+|ghp_[A-Za-z0-9]{36})\b/g

// Credit card numbers: Visa (starts with 4) and Mastercard (starts with 51-55)
const CREDIT_CARD_RE = /\b4[0-9]{12}(?:[0-9]{3})?\b|\b5[1-5][0-9]{14}\b/g

const REDACTED = '[REDACTED]'

/**
 * Strip all SA-relevant PII from text.
 * Patterns are applied in sequence; order does not matter for correctness.
 */
export function scrubPII(text: string): string {
  return text
    .replace(EMAIL_RE, REDACTED)
    .replace(SA_MOBILE_RE, REDACTED)
    .replace(SA_ID_RE, REDACTED)
    .replace(API_KEY_RE, REDACTED)
    .replace(CREDIT_CARD_RE, REDACTED)
}

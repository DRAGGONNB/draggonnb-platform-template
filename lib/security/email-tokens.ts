/**
 * HMAC-based Email Token Generation and Verification
 *
 * Provides secure, tamper-proof tokens for email unsubscribe and preferences URLs.
 * Uses HMAC-SHA256 with timing-safe comparison to prevent forgery attacks.
 */

import { createHmac, timingSafeEqual } from 'crypto'

// Token expiration: 30 days in milliseconds
const TOKEN_EXPIRATION_MS = 30 * 24 * 60 * 60 * 1000

/**
 * Generate a secure HMAC-signed token for email unsubscribe/preferences
 *
 * @param emailSendId - The email send ID or organization ID (identifies the context)
 * @param contactEmail - The recipient's email address
 * @returns Base64url-encoded token containing payload and HMAC signature
 * @throws Error if EMAIL_TRACKING_SECRET is not set
 */
export function generateUnsubscribeToken(emailSendId: string, contactEmail: string): string {
  const secret = process.env.EMAIL_TRACKING_SECRET

  if (!secret) {
    throw new Error('EMAIL_TRACKING_SECRET environment variable is not set')
  }

  // Create payload with timestamp for expiration checking
  const timestamp = Date.now()
  const payload = `${emailSendId}:${contactEmail}:${timestamp}`

  // Generate HMAC-SHA256 signature
  const signature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  // Return base64url-encoded token (payload + signature)
  return Buffer.from(`${payload}:${signature}`).toString('base64url')
}

/**
 * Verify an HMAC-signed unsubscribe/preferences token
 *
 * @param token - The base64url-encoded token to verify
 * @returns Object with validity status and parsed data or error message
 */
export function verifyUnsubscribeToken(token: string): {
  valid: boolean
  emailSendId?: string
  contactEmail?: string
  error?: string
} {
  const secret = process.env.EMAIL_TRACKING_SECRET

  if (!secret) {
    return { valid: false, error: 'EMAIL_TRACKING_SECRET not configured' }
  }

  try {
    // Decode base64url token
    const decoded = Buffer.from(token, 'base64url').toString('utf-8')

    // Split into parts: emailSendId:contactEmail:timestamp:signature
    const parts = decoded.split(':')

    if (parts.length !== 4) {
      return { valid: false, error: 'Invalid token format' }
    }

    const [emailSendId, contactEmail, timestampStr, receivedSignature] = parts
    const timestamp = parseInt(timestampStr, 10)

    // Check token age
    if (isNaN(timestamp)) {
      return { valid: false, error: 'Invalid timestamp' }
    }

    const tokenAge = Date.now() - timestamp
    if (tokenAge > TOKEN_EXPIRATION_MS) {
      return { valid: false, error: 'Token expired' }
    }

    if (tokenAge < 0) {
      return { valid: false, error: 'Token timestamp in future' }
    }

    // Reconstruct payload and compute expected signature
    const payload = `${emailSendId}:${contactEmail}:${timestampStr}`
    const expectedSignature = createHmac('sha256', secret)
      .update(payload)
      .digest('hex')

    // Use timing-safe comparison to prevent timing attacks
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8')
    const receivedBuffer = Buffer.from(receivedSignature, 'utf-8')

    // Buffers must be same length for timingSafeEqual
    if (expectedBuffer.length !== receivedBuffer.length) {
      return { valid: false, error: 'Invalid signature' }
    }

    if (!timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return { valid: false, error: 'Invalid signature' }
    }

    return {
      valid: true,
      emailSendId,
      contactEmail,
    }
  } catch {
    return { valid: false, error: 'Token decode failed' }
  }
}

/**
 * Check if EMAIL_TRACKING_SECRET is configured
 * Used for graceful fallback in development
 */
export function isEmailTrackingSecretConfigured(): boolean {
  return !!process.env.EMAIL_TRACKING_SECRET
}

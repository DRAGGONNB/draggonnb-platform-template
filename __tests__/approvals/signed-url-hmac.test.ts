/** @vitest-environment node */
/**
 * I2 HMAC signed URL tests — generatePhotoSignedUrl + photo route validator.
 *
 * Checks:
 *   1. generatePhotoSignedUrl produces URL with sig + exp query params
 *   2. sig is a 64-char hex string (SHA-256 digest)
 *   3. sig validates correctly against payload {approval_id}:{asset_id}:{exp}
 *   4. Tampered approval_id fails sig validation
 *   5. Tampered asset_id fails sig validation
 *   6. Expired exp fails validation (time-based check)
 *   7. generatePhotoSignedUrl throws when APPROVAL_PHOTO_HMAC_SECRET not set
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createHmac, timingSafeEqual } from 'crypto'

const TEST_SECRET = 'test-hmac-secret-abc123xyz'

function validateSignedUrl(url: string, secret: string): { valid: boolean; expired: boolean } {
  const u = new URL(url, 'https://example.com')
  const sig = u.searchParams.get('sig') ?? ''
  const expStr = u.searchParams.get('exp') ?? '0'
  const exp = parseInt(expStr, 10)

  if (!sig || !exp) return { valid: false, expired: false }
  if (Date.now() / 1000 > exp) return { valid: false, expired: true }

  // Reconstruct payload from URL path: /api/approvals/{id}/photos/{asset_id}
  const pathParts = u.pathname.split('/')
  const assetId = pathParts[pathParts.length - 1]
  const approvalId = pathParts[pathParts.length - 3]

  const expected = createHmac('sha256', secret)
    .update(`${approvalId}:${assetId}:${exp}`)
    .digest('hex')

  try {
    const sigBuf = Buffer.from(sig, 'hex')
    const expBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expBuf.length) return { valid: false, expired: false }
    return { valid: timingSafeEqual(sigBuf, expBuf), expired: false }
  } catch {
    return { valid: false, expired: false }
  }
}

describe('generatePhotoSignedUrl() — I2 HMAC pattern', () => {
  beforeAll(() => {
    vi.stubEnv('APPROVAL_PHOTO_HMAC_SECRET', TEST_SECRET)
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://app.draggonnb.co.za')
  })

  afterAll(() => {
    vi.unstubAllEnvs()
  })

  it('throws when APPROVAL_PHOTO_HMAC_SECRET is not set', async () => {
    vi.stubEnv('APPROVAL_PHOTO_HMAC_SECRET', '')
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    expect(() => generatePhotoSignedUrl('id', 'asset', 1800)).toThrow(
      'APPROVAL_PHOTO_HMAC_SECRET not set'
    )
    vi.stubEnv('APPROVAL_PHOTO_HMAC_SECRET', TEST_SECRET)
  })

  it('produces a URL with sig and exp query parameters', async () => {
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    const url = generatePhotoSignedUrl('approval-abc', 'asset-xyz', 1800)
    const u = new URL(url)
    expect(u.searchParams.get('sig')).toBeTruthy()
    expect(u.searchParams.get('exp')).toBeTruthy()
  })

  it('sig is a 64-character hex string (SHA-256)', async () => {
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    const url = generatePhotoSignedUrl('approval-abc', 'asset-xyz', 1800)
    const u = new URL(url)
    const sig = u.searchParams.get('sig')!
    expect(sig).toMatch(/^[0-9a-f]{64}$/)
  })

  it('URL encodes approval_id and asset_id in the path', async () => {
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    const url = generatePhotoSignedUrl('approval-abc', 'asset-xyz', 1800)
    expect(url).toContain('/api/approvals/approval-abc/photos/asset-xyz')
  })

  it('generated URL passes local HMAC validation', async () => {
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    const url = generatePhotoSignedUrl('approval-abc', 'asset-xyz', 1800)
    const result = validateSignedUrl(url, TEST_SECRET)
    expect(result.valid).toBe(true)
    expect(result.expired).toBe(false)
  })

  it('URL with tampered approval_id fails HMAC validation', async () => {
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    const url = generatePhotoSignedUrl('approval-abc', 'asset-xyz', 1800)
    const tampered = url.replace('/approvals/approval-abc/', '/approvals/approval-EVIL/')
    const result = validateSignedUrl(tampered, TEST_SECRET)
    expect(result.valid).toBe(false)
  })

  it('URL with tampered asset_id fails HMAC validation', async () => {
    const { generatePhotoSignedUrl } = await import('@/lib/approvals/spine')
    const url = generatePhotoSignedUrl('approval-abc', 'asset-xyz', 1800)
    const tampered = url.replace('/photos/asset-xyz', '/photos/asset-EVIL')
    const result = validateSignedUrl(tampered, TEST_SECRET)
    expect(result.valid).toBe(false)
  })

  it('URL with past exp is detected as expired', () => {
    // Manually construct an expired URL (exp in the past)
    const approvalId = 'approval-abc'
    const assetId = 'asset-xyz'
    const exp = Math.floor(Date.now() / 1000) - 3600  // 1 hour ago
    const sig = createHmac('sha256', TEST_SECRET)
      .update(`${approvalId}:${assetId}:${exp}`)
      .digest('hex')
    const url = `https://app.draggonnb.co.za/api/approvals/${approvalId}/photos/${assetId}?sig=${sig}&exp=${exp}`
    const result = validateSignedUrl(url, TEST_SECRET)
    expect(result.expired).toBe(true)
    expect(result.valid).toBe(false)
  })
})

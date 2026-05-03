import { describe, it, expect, vi } from 'vitest'

// Stub env BEFORE importing the module under test
vi.stubEnv('SSO_BRIDGE_SECRET', 'test-secret-32-bytes-hex-aaaabbbbccccddddeeeeffff00001111')

import { issueBridgeToken, verifyBridge, issueLogoutToken, verifyLogout } from '@/lib/sso/jwt'
import { asDraggonnbOrgId, asTrophyOrgId } from '@draggonnb/federation-shared'

describe('SSO JWT wrapper', () => {
  it('issues and verifies a bridge token round-trip', async () => {
    const draggonnbOrg = asDraggonnbOrgId('org-1')
    const trophyOrg = asTrophyOrgId('trophy-1')
    const { token, jti } = await issueBridgeToken({
      sub: 'user-1',
      draggonnb_org: draggonnbOrg,
      trophy_org: trophyOrg,
      origin_org: draggonnbOrg,
      target_org: trophyOrg,
      intended_product: 'trophy',
      product: 'trophy',
      access_token: 'sb-access-token-stub',
      refresh_token: 'sb-refresh-token-stub',
      user_email: 'test@example.com',
    })
    expect(token).toBeTruthy()
    expect(jti).toMatch(/^[0-9a-f-]{36}$/i)

    const payload = await verifyBridge(token)
    expect(payload.sub).toBe('user-1')
    expect(payload.draggonnb_org).toBe('org-1')
    expect(payload.trophy_org).toBe('trophy-1')
    expect(payload.intended_product).toBe('trophy')
    expect(payload.jti).toBe(jti)
    expect(payload.access_token).toBe('sb-access-token-stub')
  })

  it('rejects a token signed with a different secret', async () => {
    const draggonnbOrg = asDraggonnbOrgId('org-1')
    const trophyOrg = asTrophyOrgId('trophy-1')
    const { token } = await issueBridgeToken({
      sub: 'user-1',
      draggonnb_org: draggonnbOrg,
      trophy_org: trophyOrg,
      origin_org: draggonnbOrg,
      target_org: trophyOrg,
      intended_product: 'trophy',
      product: 'trophy',
      access_token: 'a',
      refresh_token: 'b',
      user_email: 'x@y.z',
    })
    vi.stubEnv('SSO_BRIDGE_SECRET', 'different-secret-32-bytes-aaaabbbbccccddddeeeeffff00001111aa')
    await expect(verifyBridge(token)).rejects.toThrow()
    // Restore correct secret for subsequent tests
    vi.stubEnv('SSO_BRIDGE_SECRET', 'test-secret-32-bytes-hex-aaaabbbbccccddddeeeeffff00001111')
  })

  it('logout token round-trip', async () => {
    const { token, jti } = await issueLogoutToken({ sub: 'user-1', reason: 'user_signed_out' })
    const payload = await verifyLogout(token)
    expect(payload.sub).toBe('user-1')
    expect(payload.reason).toBe('user_signed_out')
    expect(payload.jti).toBe(jti)
  })

  it('throws when SSO_BRIDGE_SECRET is missing', async () => {
    vi.stubEnv('SSO_BRIDGE_SECRET', '')
    const draggonnbOrg = asDraggonnbOrgId('o')
    const trophyOrg = asTrophyOrgId('t')
    await expect(
      issueBridgeToken({
        sub: 'u',
        draggonnb_org: draggonnbOrg,
        trophy_org: trophyOrg,
        origin_org: draggonnbOrg,
        target_org: trophyOrg,
        intended_product: 'trophy',
        product: 'trophy',
        access_token: 'a',
        refresh_token: 'b',
        user_email: 'x@y.z',
      })
    ).rejects.toThrow(/SSO_BRIDGE_SECRET/)
    vi.stubEnv('SSO_BRIDGE_SECRET', 'test-secret-32-bytes-hex-aaaabbbbccccddddeeeeffff00001111')
  })
})

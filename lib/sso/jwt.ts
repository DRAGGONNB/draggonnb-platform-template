// lib/sso/jwt.ts
// Thin wrapper around @draggonnb/federation-shared bridge JWT helpers.
// Centralises env-var access so route handlers don't repeat the secret lookup.

import {
  signBridgeToken,
  verifyBridgeToken,
  signLogoutToken,
  verifyLogoutToken,
  type BridgeTokenPayload,
  type LogoutTokenPayload,
} from '@draggonnb/federation-shared'
import { randomUUID } from 'crypto'

function getSecret(): string {
  const secret = process.env.SSO_BRIDGE_SECRET
  if (!secret) throw new Error('SSO_BRIDGE_SECRET not configured')
  return secret
}

export async function issueBridgeToken(
  args: Omit<BridgeTokenPayload, 'jti'>
): Promise<{ token: string; jti: string }> {
  const jti = randomUUID()
  const token = await signBridgeToken({ ...args, jti }, getSecret())
  return { token, jti }
}

export async function verifyBridge(token: string): Promise<BridgeTokenPayload> {
  return verifyBridgeToken(token, getSecret())
}

export async function issueLogoutToken(
  args: Omit<LogoutTokenPayload, 'jti'>
): Promise<{ token: string; jti: string }> {
  const jti = randomUUID()
  const token = await signLogoutToken({ ...args, jti }, getSecret())
  return { token, jti }
}

export async function verifyLogout(token: string): Promise<LogoutTokenPayload> {
  return verifyLogoutToken(token, getSecret())
}

export type { BridgeTokenPayload, LogoutTokenPayload }

import { META_GRAPH_VERSION, META_GRAPH_BASE, getMetaConfig } from './config'

const EMBEDDED_SIGNUP_SCOPES = 'whatsapp_business_messaging,whatsapp_business_management'

export function getEmbeddedSignupUrl(state: string): string {
  const { appId } = getMetaConfig()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`

  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: EMBEDDED_SIGNUP_SCOPES,
    response_type: 'code',
    extras: JSON.stringify({
      setup: { channel: 'WhatsApp', business_app_id: appId },
      featureType: '',
      sessionInfoVersion: 2,
    }),
  })

  return `https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
}

export async function exchangeEmbeddedSignupCode(code: string): Promise<TokenResponse> {
  const { appId, appSecret } = getMetaConfig()
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/meta/callback`

  const response = await fetch(`${META_GRAPH_BASE}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: appId,
      client_secret: appSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return response.json()
}

interface WABADetails {
  waba_id: string
  phone_number_id: string
  display_phone_number?: string
  verified_name?: string
}

export async function getWABADetails(accessToken: string): Promise<WABADetails> {
  const debugRes = await fetch(
    `${META_GRAPH_BASE}/debug_token?input_token=${accessToken}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!debugRes.ok) {
    throw new Error(`debug_token failed: ${await debugRes.text()}`)
  }

  const debugData = await debugRes.json()
  const granularScopes = debugData.data?.granular_scopes || []
  const wabaScope = granularScopes.find(
    (s: { scope: string; target_ids?: string[] }) => s.scope === 'whatsapp_business_management'
  )
  const wabaId = wabaScope?.target_ids?.[0]

  if (!wabaId) {
    throw new Error('No WABA ID found in token scopes')
  }

  const phoneRes = await fetch(
    `${META_GRAPH_BASE}/${wabaId}/phone_numbers`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )

  if (!phoneRes.ok) {
    throw new Error(`Phone numbers fetch failed: ${await phoneRes.text()}`)
  }

  const phoneData = await phoneRes.json()
  const phone = phoneData.data?.[0]

  return {
    waba_id: wabaId,
    phone_number_id: phone?.id || '',
    display_phone_number: phone?.display_phone_number,
    verified_name: phone?.verified_name,
  }
}

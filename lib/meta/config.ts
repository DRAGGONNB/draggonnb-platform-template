export const META_GRAPH_VERSION = 'v19.0'
export const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

export interface TenantMetaConfig {
  waba_id: string
  phone_number_id: string
  access_token: string
  token_expires_at: string
  business_portfolio_id?: string
  onboarding_model: 'A' | 'B'
  display_phone_number?: string
  verified_name?: string
}

interface MetaAppConfig {
  appId: string
  appSecret: string
  businessPortfolioId?: string
}

export function getMetaConfig(): MetaAppConfig {
  const appId = getMetaAppId()
  const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET
  const businessPortfolioId = process.env.META_BUSINESS_PORTFOLIO_ID

  if (!appId || !appSecret) {
    throw new Error('Missing META_APP_ID/META_APP_SECRET (or FACEBOOK_APP_ID/FACEBOOK_APP_SECRET fallbacks)')
  }

  return { appId, appSecret, businessPortfolioId }
}

export function getMetaAppId(): string {
  const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID
  if (!appId) {
    throw new Error('Missing META_APP_ID or FACEBOOK_APP_ID environment variable')
  }
  return appId
}

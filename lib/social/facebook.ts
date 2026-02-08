// Facebook Graph API Client
// Supports OAuth, token exchange, and publishing to Facebook Pages and Instagram

const GRAPH_API_VERSION = 'v19.0'
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`
const OAUTH_BASE_URL = `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth`

// Required scopes for publishing
const FACEBOOK_SCOPES = [
  'public_profile',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_posts',
  // Instagram scopes (if app has them approved)
  'instagram_basic',
  'instagram_content_publish',
].join(',')

interface FacebookConfig {
  appId: string
  appSecret: string
  redirectUri: string
}

function getConfig(): FacebookConfig {
  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/facebook/callback`

  if (!appId || !appSecret) {
    throw new Error('Facebook App ID and Secret must be configured')
  }

  return { appId, appSecret, redirectUri }
}

/**
 * Generate Facebook OAuth authorization URL
 */
export function getFacebookAuthUrl(state: string): string {
  const config = getConfig()
  const params = new URLSearchParams({
    client_id: config.appId,
    redirect_uri: config.redirectUri,
    scope: FACEBOOK_SCOPES,
    response_type: 'code',
    state,
  })
  return `${OAUTH_BASE_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeFacebookCode(code: string): Promise<{
  access_token: string
  token_type: string
  expires_in?: number
}> {
  const config = getConfig()
  const params = new URLSearchParams({
    client_id: config.appId,
    client_secret: config.appSecret,
    redirect_uri: config.redirectUri,
    code,
  })

  const response = await fetch(`${GRAPH_BASE_URL}/oauth/access_token?${params.toString()}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to exchange code for token')
  }

  return response.json()
}

/**
 * Exchange short-lived token for long-lived token (60 days)
 */
export async function getLongLivedToken(shortLivedToken: string): Promise<{
  access_token: string
  token_type: string
  expires_in: number
}> {
  const config = getConfig()
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: config.appId,
    client_secret: config.appSecret,
    fb_exchange_token: shortLivedToken,
  })

  const response = await fetch(`${GRAPH_BASE_URL}/oauth/access_token?${params.toString()}`)
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get long-lived token')
  }

  return response.json()
}

/**
 * Get Facebook user profile
 */
export async function getFacebookUser(accessToken: string): Promise<{
  id: string
  name: string
  picture?: { data: { url: string } }
}> {
  const response = await fetch(
    `${GRAPH_BASE_URL}/me?fields=id,name,picture&access_token=${accessToken}`
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get user info')
  }
  return response.json()
}

/**
 * Get user's Facebook Pages (where they can publish)
 */
export async function getFacebookPages(accessToken: string): Promise<Array<{
  id: string
  name: string
  access_token: string
  category: string
  instagram_business_account?: { id: string }
}>> {
  const response = await fetch(
    `${GRAPH_BASE_URL}/me/accounts?fields=id,name,access_token,category,instagram_business_account&access_token=${accessToken}`
  )
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to get pages')
  }
  const data = await response.json()
  return data.data || []
}

/**
 * Publish a post to a Facebook Page
 */
export async function publishToFacebookPage(
  pageId: string,
  pageAccessToken: string,
  content: {
    message: string
    link?: string
  }
): Promise<{ id: string }> {
  const response = await fetch(`${GRAPH_BASE_URL}/${pageId}/feed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: content.message,
      link: content.link,
      access_token: pageAccessToken,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to publish to Facebook')
  }

  return response.json()
}

/**
 * Publish a photo post to Instagram Business Account
 * Two-step process: 1) Create media container, 2) Publish it
 */
export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  content: {
    caption: string
    image_url: string // Must be publicly accessible URL
  }
): Promise<{ id: string }> {
  // Step 1: Create media container
  const createResponse = await fetch(`${GRAPH_BASE_URL}/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: content.image_url,
      caption: content.caption,
      access_token: accessToken,
    }),
  })

  if (!createResponse.ok) {
    const error = await createResponse.json()
    throw new Error(error.error?.message || 'Failed to create Instagram media')
  }

  const { id: containerId } = await createResponse.json()

  // Step 2: Publish the container
  const publishResponse = await fetch(`${GRAPH_BASE_URL}/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: accessToken,
    }),
  })

  if (!publishResponse.ok) {
    const error = await publishResponse.json()
    throw new Error(error.error?.message || 'Failed to publish to Instagram')
  }

  return publishResponse.json()
}

/**
 * Check if content can be published to Instagram
 * Instagram feed posts require an image
 */
export function canPublishToInstagram(imageUrl?: string): boolean {
  return !!imageUrl
}

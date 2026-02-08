// LinkedIn API Client
// Supports OAuth, token exchange, and publishing to LinkedIn profiles

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization'
const LINKEDIN_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken'
const LINKEDIN_API_URL = 'https://api.linkedin.com'

// Required scopes for posting
// openid and profile for user info, w_member_social for posting
const LINKEDIN_SCOPES = ['openid', 'profile', 'email', 'w_member_social'].join(' ')

interface LinkedInConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

function getConfig(): LinkedInConfig {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/linkedin/callback`

  if (!clientId || !clientSecret) {
    throw new Error('LinkedIn Client ID and Secret must be configured')
  }

  return { clientId, clientSecret, redirectUri }
}

/**
 * Generate LinkedIn OAuth authorization URL
 */
export function getLinkedInAuthUrl(state: string): string {
  const config = getConfig()
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: LINKEDIN_SCOPES,
    state,
  })
  return `${LINKEDIN_AUTH_URL}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeLinkedInCode(code: string): Promise<{
  access_token: string
  expires_in: number
  scope: string
}> {
  const config = getConfig()

  const response = await fetch(LINKEDIN_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error_description || error.error || 'Failed to exchange code')
  }

  return response.json()
}

/**
 * Get LinkedIn user profile using OpenID Connect userinfo endpoint
 */
export async function getLinkedInUser(accessToken: string): Promise<{
  sub: string // LinkedIn member ID (URN format)
  name: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
}> {
  const response = await fetch(`${LINKEDIN_API_URL}/v2/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Failed to get user info')
  }

  return response.json()
}

/**
 * Publish a text post to LinkedIn (personal profile)
 * Uses the new Posts API (LinkedIn API v202304)
 */
export async function publishToLinkedIn(
  accessToken: string,
  authorUrn: string, // urn:li:person:{id} or urn:li:organization:{id}
  content: {
    text: string
    link?: string
  }
): Promise<{ id: string }> {
  // Build the post body according to LinkedIn Posts API spec
  const postBody: Record<string, unknown> = {
    author: authorUrn,
    commentary: content.text,
    visibility: 'PUBLIC',
    distribution: {
      feedDistribution: 'MAIN_FEED',
      targetEntities: [],
      thirdPartyDistributionChannels: [],
    },
    lifecycleState: 'PUBLISHED',
  }

  // Add article (link) if provided
  if (content.link) {
    postBody.content = {
      article: {
        source: content.link,
        title: content.text.substring(0, 100), // Use first 100 chars as title
      },
    }
  }

  const response = await fetch(`${LINKEDIN_API_URL}/rest/posts`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
      'LinkedIn-Version': '202401', // Use recent API version
    },
    body: JSON.stringify(postBody),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('LinkedIn API error:', response.status, errorText)

    // Parse error if JSON
    try {
      const error = JSON.parse(errorText)
      throw new Error(error.message || error.error || `LinkedIn API error: ${response.status}`)
    } catch {
      throw new Error(`LinkedIn API error: ${response.status} - ${errorText}`)
    }
  }

  // LinkedIn returns the post ID in the x-restli-id header or response body
  const postId = response.headers.get('x-restli-id')

  if (postId) {
    return { id: postId }
  }

  // Try to get from body if header not present
  const data = await response.json().catch(() => ({}))
  return { id: data.id || 'unknown' }
}

/**
 * Convert LinkedIn sub (from userinfo) to URN format for posting
 * The sub from userinfo is the raw ID, we need to format it as URN
 */
export function formatLinkedInUrn(sub: string): string {
  // If already a URN, return as-is
  if (sub.startsWith('urn:li:')) {
    return sub
  }
  // Otherwise, format as person URN
  return `urn:li:person:${sub}`
}

/**
 * Get organizations (company pages) the user can post to
 * Requires r_organization_social scope
 */
export async function getLinkedInOrganizations(accessToken: string): Promise<Array<{
  id: string
  name: string
  vanityName?: string
}>> {
  // This requires additional permissions that may not be available
  // For MVP, we'll focus on personal profile posting
  // Organizations can be added later when Marketing API access is approved

  console.log('LinkedIn organization fetching not yet implemented')
  return []
}

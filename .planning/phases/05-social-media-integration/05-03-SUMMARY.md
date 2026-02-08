---
phase: 05-social-media-integration
plan: 03
subsystem: api, integration
tags: [linkedin, oauth, social-media, rest-api]

# Dependency graph
requires:
  - phase: 05-01
    provides: social_accounts table, API endpoints, settings UI
provides:
  - LinkedIn API client with OAuth and publishing
  - LinkedIn OAuth flow with OpenID Connect userinfo
  - Publish endpoint for LinkedIn personal profiles
  - URN formatting for LinkedIn author identification
affects: [content-queue, social-scheduling, analytics]

# Tech tracking
tech-stack:
  added:
    - LinkedIn API v2 (OAuth 2.0 + OpenID Connect)
    - LinkedIn Posts API v202401
  patterns:
    - OpenID Connect userinfo endpoint for profile data
    - URN format (urn:li:person:{id}) for author identification
    - X-Restli-Protocol-Version header for LinkedIn Posts API
    - 3000 character limit enforcement

key-files:
  created:
    - lib/social/linkedin.ts
    - app/api/auth/social/linkedin/route.ts
    - app/api/auth/social/linkedin/callback/route.ts
    - app/api/social/publish/linkedin/route.ts
  modified:
    - .env.example (LinkedIn credentials already added in 05-02)

key-decisions:
  - "Use OpenID Connect userinfo endpoint for profile data (cleaner than v2/me)"
  - "Store formatted URN (urn:li:person:{id}) in page_id field for posting"
  - "Enforce 3000 character limit (LinkedIn's post limit)"
  - "Focus on personal profile posting (organization posting requires additional permissions)"
  - "Use LinkedIn Posts API v202401 (newer versioned API)"

patterns-established:
  - "URN formatting helper (formatLinkedInUrn) converts sub to urn:li:person:{id}"
  - "X-Restli-Protocol-Version: 2.0.0 header required for Posts API"
  - "LinkedIn-Version: 202401 header for API versioning"
  - "Post ID returned in x-restli-id header or response body"

# Metrics
duration: 8min
completed: 2026-02-05
---

# Phase 5 Plan 3: LinkedIn OAuth and Publishing Summary

**LinkedIn API integration with OpenID Connect, Posts API v202401, and URN-based author identification for personal profile posting**

## Performance

- **Duration:** 8 minutes
- **Started:** 2026-02-05T10:43:00Z (estimated)
- **Completed:** 2026-02-05T10:51:00Z (estimated)
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Implemented LinkedIn API client with OAuth 2.0 and OpenID Connect userinfo
- Built OAuth flow with CSRF protection and URN formatting for author identification
- Created publish endpoint with 3000 character limit and helpful error messages
- Support for both text-only posts and posts with article links

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LinkedIn API client library** - `6458f50` (feat)
2. **Task 2: Create LinkedIn OAuth routes** - `030fd6f` (feat)
3. **Task 3: Create LinkedIn publish endpoint** - `bb705d3` (feat)

## Files Created/Modified
- `lib/social/linkedin.ts` - LinkedIn API client with OAuth, userinfo, publishing, and URN formatting
- `app/api/auth/social/linkedin/route.ts` - OAuth initiation with state generation
- `app/api/auth/social/linkedin/callback/route.ts` - Token exchange, userinfo fetching, URN formatting
- `app/api/social/publish/linkedin/route.ts` - Publish to LinkedIn profile with 3000 char limit

## Decisions Made
- Use OpenID Connect /v2/userinfo endpoint instead of /v2/me (simpler, standard-compliant)
- Store formatted URN (urn:li:person:{id}) in page_id field (same pattern as Facebook page_id)
- Enforce 3000 character limit for LinkedIn posts (API constraint)
- Focus on personal profile posting (organization posting requires r_organization_social scope)
- Use LinkedIn Posts API v202401 with X-Restli-Protocol-Version: 2.0.0 header
- Helpful error messages for 401 (unauthorized) and 403 (permission denied)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.**

Before using LinkedIn integration:

1. **Create LinkedIn App:**
   - Visit https://www.linkedin.com/developers/apps
   - Create App
   - Copy Client ID and Client Secret

2. **Request Marketing Developer Platform access:**
   - Products tab → Request Access to Marketing Developer Platform
   - Wait for approval (may take time)

3. **Add OAuth redirect URL:**
   - Auth tab → OAuth 2.0 settings
   - Authorized redirect URLs: https://yourdomain.com/api/auth/social/linkedin/callback

4. **Verify scopes:**
   - Auth tab → OAuth 2.0 scopes
   - Ensure w_member_social is available

5. **Add to .env.local:**
   ```
   LINKEDIN_CLIENT_ID=your_linkedin_client_id
   LINKEDIN_CLIENT_SECRET=your_linkedin_client_secret
   ```

6. **Verify:**
   - Navigate to /settings/social
   - Click "Connect LinkedIn" from dropdown
   - Authorize app
   - Account should appear in connected accounts list

## Next Phase Readiness
- LinkedIn posting complete
- Phase 5 (Social Media Integration) fully implemented
- All 3 platforms (Facebook, Instagram, LinkedIn) support OAuth and publishing
- Token expiry handling consistent across all platforms
- Ready for content queue integration and scheduled posting features

---
*Phase: 05-social-media-integration*
*Completed: 2026-02-05*

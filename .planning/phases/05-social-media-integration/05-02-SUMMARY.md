---
phase: 05-social-media-integration
plan: 02
subsystem: api, integration
tags: [facebook, instagram, graph-api, oauth, social-media]

# Dependency graph
requires:
  - phase: 05-01
    provides: social_accounts table, API endpoints, settings UI
provides:
  - Facebook Graph API client with OAuth and publishing
  - Facebook/Instagram OAuth flow with long-lived tokens (60 days)
  - Publish endpoint for Facebook Pages and Instagram Business accounts
  - Automatic Instagram Business account connection if linked to Page
affects: [content-queue, social-scheduling, analytics]

# Tech tracking
tech-stack:
  added:
    - Facebook Graph API v19.0
  patterns:
    - Long-lived token exchange (60 days instead of 1-2 hours)
    - Two-step Instagram publishing (create media container → publish)
    - Page access token for posting (not user access token)
    - CSRF protection via state parameter in OAuth cookie

key-files:
  created:
    - lib/social/facebook.ts
    - app/api/auth/social/facebook/route.ts
    - app/api/auth/social/facebook/callback/route.ts
    - app/api/social/publish/facebook/route.ts
  modified:
    - .env.example

key-decisions:
  - "Use long-lived tokens (60 days) instead of short-lived (1-2 hours) for better UX"
  - "Connect first Facebook Page automatically (could add page selection UI later)"
  - "Auto-connect Instagram Business if linked to Page (via instagram_business_account field)"
  - "Instagram requires image_url for feed posts (no text-only posts)"
  - "Store page_access_token separately for publishing (bypasses user token expiry)"

patterns-established:
  - "OAuth state stored in httpOnly cookie with 10-minute expiry"
  - "Token expiry checked before publishing, account marked expired if needed"
  - "Update last_used_at timestamp on successful publish"
  - "CSRF protection via state parameter verification"

# Metrics
duration: 9min
completed: 2026-02-05
---

# Phase 5 Plan 2: Facebook/Instagram OAuth and Publishing Summary

**Facebook Graph API integration with long-lived tokens, Page publishing, and automatic Instagram Business account connection**

## Performance

- **Duration:** 9 minutes
- **Started:** 2026-02-05T10:34:00Z (estimated)
- **Completed:** 2026-02-05T10:43:00Z (estimated)
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Implemented Facebook Graph API client with OAuth URL generation and token exchange
- Built OAuth flow with CSRF protection and long-lived token support (60 days)
- Created publish endpoint supporting both Facebook Pages and Instagram Business accounts
- Automatic Instagram Business account detection and connection if linked to Page

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Facebook Graph API client library** - `3ddb808` (feat)
2. **Task 2: Create Facebook OAuth routes** - `9cc103d` (feat)
3. **Task 3: Create Facebook/Instagram publish endpoint** - (committed as part of parallel phase execution)

## Files Created/Modified
- `lib/social/facebook.ts` - Graph API client with OAuth, user/page fetching, and publishing
- `app/api/auth/social/facebook/route.ts` - OAuth initiation with state generation
- `app/api/auth/social/facebook/callback/route.ts` - Token exchange, page fetching, account saving
- `app/api/social/publish/facebook/route.ts` - Publish to Facebook Page or Instagram Business
- `.env.example` - Added FACEBOOK_APP_ID and FACEBOOK_APP_SECRET

## Decisions Made
- Exchange short-lived token for long-lived token (60 days) immediately after OAuth
- Connect first Facebook Page automatically (could add page selection UI in future)
- Auto-connect Instagram Business account if linked to Page (saves extra OAuth step)
- Instagram posts require image_url (feed posts only support photos, not text-only)
- Use page_access_token for publishing (doesn't expire when user token expires)
- Facebook Graph API v19.0 chosen (stable version as of plan creation)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration.**

Before using Facebook/Instagram integration:

1. **Create Facebook App:**
   - Visit https://developers.facebook.com/apps
   - Create App → Business type
   - Copy App ID and App Secret

2. **Add Facebook Login product:**
   - App Dashboard → Add Product → Facebook Login
   - Configure OAuth redirect URI: https://yourdomain.com/api/auth/social/facebook/callback

3. **Request permissions:**
   - App Review → Permissions and Features
   - Request pages_manage_posts (for Facebook Page posting)
   - Request instagram_basic and instagram_content_publish (for Instagram)

4. **Add to .env.local:**
   ```
   FACEBOOK_APP_ID=your_facebook_app_id
   FACEBOOK_APP_SECRET=your_facebook_app_secret
   ```

5. **Verify:**
   - Navigate to /settings/social
   - Click "Connect Facebook"
   - Authorize app
   - Account should appear in connected accounts list

## Next Phase Readiness
- Facebook and Instagram publishing complete
- Ready for LinkedIn integration (05-03)
- Token expiry handling implemented (auto-marks accounts as expired)
- Publish endpoint supports both Facebook and Instagram via single route

---
*Phase: 05-social-media-integration*
*Completed: 2026-02-05*

---
phase: 05-social-media-integration
plan: 01
subsystem: database, api, ui
tags: [supabase, social-media, oauth, react, nextjs]

# Dependency graph
requires:
  - phase: 01-security-auth
    provides: getUserOrg helper, RLS pattern, Supabase client
  - phase: 02-core-module
    provides: EmptyState component, dashboard layout patterns
provides:
  - social_accounts table with RLS policies for OAuth token storage
  - Social accounts CRUD API (GET, POST, DELETE)
  - Social accounts settings UI with connected accounts display
  - Empty state for no connected accounts
  - Sidebar navigation link to social settings
affects: [05-02-facebook, 05-03-linkedin, social-media-posting, content-queue]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Social accounts table with platform enum (facebook, instagram, linkedin, twitter)
    - OAuth token storage with expiry tracking
    - Connection status (active, expired, revoked, error)
    - Platform-specific metadata (page_id, page_access_token for Facebook/Instagram)

key-files:
  created:
    - supabase/migrations/04_social_accounts.sql
    - lib/social/types.ts
    - app/api/social/accounts/route.ts
    - app/api/social/accounts/[id]/route.ts
    - components/social/ConnectedAccountCard.tsx
    - components/social/ConnectAccountButton.tsx
    - app/(dashboard)/settings/social/page.tsx
  modified:
    - components/dashboard/Sidebar.tsx

key-decisions:
  - "Store OAuth tokens in social_accounts table (Supabase encrypts at rest)"
  - "Use page_id field for both Facebook Page ID and LinkedIn URN"
  - "Upsert on (organization_id, platform, platform_user_id) for reconnection flow"
  - "ConnectAccountDropdown shows 3 platforms (Facebook, Instagram, LinkedIn) excluding Twitter"

patterns-established:
  - "OAuth routes at /api/auth/social/{platform} and /api/auth/social/{platform}/callback"
  - "Publish routes at /api/social/publish/{platform}"
  - "Platform-specific icons and colors for social account cards"
  - "Empty state with Share2 icon when no accounts connected"

# Metrics
duration: 8min
completed: 2026-02-05
---

# Phase 5 Plan 1: Social Accounts Management Foundation Summary

**Social accounts database table with OAuth token storage, CRUD API, and settings UI with platform-specific account cards**

## Performance

- **Duration:** 8 minutes
- **Started:** 2026-02-05T10:26:27Z
- **Completed:** 2026-02-05T10:34:00Z (estimated)
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Created social_accounts table migration with RLS policies for 4 platforms
- Built CRUD API for listing, creating, updating, and deleting connected accounts
- Implemented settings page with ConnectedAccountCard showing status and metadata
- Added ConnectAccountDropdown with OAuth flow initiation for Facebook, Instagram, LinkedIn

## Task Commits

Each task was committed atomically:

1. **Task 1: Create social_accounts table migration and types** - `2c1a887` (feat)
2. **Task 2: Create social accounts API endpoints** - `a4580e2` (feat)
3. **Task 3: Create social accounts settings page and components** - `6ea44ed` (feat)

## Files Created/Modified
- `supabase/migrations/04_social_accounts.sql` - Social accounts table with OAuth token storage, RLS policies
- `lib/social/types.ts` - SocialAccount, ConnectAccountRequest, PublishPostRequest types
- `app/api/social/accounts/route.ts` - GET (list) and POST (create/upsert) endpoints
- `app/api/social/accounts/[id]/route.ts` - GET (single) and DELETE (disconnect) endpoints
- `components/social/ConnectedAccountCard.tsx` - Account card with platform icon, status, disconnect button
- `components/social/ConnectAccountButton.tsx` - ConnectAccountDropdown with platform selection
- `app/(dashboard)/settings/social/page.tsx` - Settings page with empty state and account list
- `components/dashboard/Sidebar.tsx` - Added "Social Accounts" link to Settings section

## Decisions Made
- Store OAuth tokens in social_accounts table (Supabase encrypts text fields at rest)
- Use page_id field for both Facebook Page ID and LinkedIn author URN (polymorphic usage)
- Upsert on (organization_id, platform, platform_user_id) to handle reconnection gracefully
- ConnectAccountDropdown excludes Twitter (not implemented in this phase)
- Platform icons use lucide-react (Facebook, Instagram, Linkedin, Twitter, Share2)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required for this plan (OAuth setup is in plans 05-02 and 05-03).

## Next Phase Readiness
- Social accounts foundation complete
- Ready for Facebook/Instagram OAuth (05-02) and LinkedIn OAuth (05-03)
- Table supports all planned platforms (Facebook, Instagram, LinkedIn, Twitter)
- Settings page accessible at /settings/social

---
*Phase: 05-social-media-integration*
*Completed: 2026-02-05*

---
phase: 04-n8n-automation
plan: 02
status: complete
completed: 2026-02-07
duration: ~8m
---

# Plan 04-02 Summary: Content Generation API Wiring

## What Was Done

### Task 1: API response format alignment (COMPLETE)
- Updated `app/api/content/generate/route.ts` to transform N8N response
- N8N returns `{ success, data: { content, post_id } }`
- API now returns `{ success, data: { contents: [{ platform, content, hashtags?, imagePrompt? }] } }`
- Added per-platform content mapping from N8N single response
- Added hashtag extraction from content using regex `/#\w+/g`
- Added 60-second timeout with AbortController to prevent hung requests
- Added AbortError handling returning 504 Gateway Timeout
- Added canonical tier support (core/growth/scale alongside starter/professional/enterprise)

### Task 2: Content queue API route (ALREADY EXISTS)
- `app/api/content/queue/route.ts` was already fully implemented with:
  - GET: List content queue items with status/platform filters, pagination
  - POST: Create content queue items with validation (platform, status, publish_at)
  - Authentication via getUserOrg()
  - Uses dedicated `content_queue` table
- No changes needed

### Task 3: Full flow verification
- Code review confirms end-to-end flow:
  - Content generator UI posts to `/api/content/generate`
  - API calls N8N webhook with timeout
  - Response transformed to `contents[]` format matching UI expectations
  - UI displays content in platform tabs
  - Save to Queue calls `/api/content/queue` POST

## Files Changed
- `app/api/content/generate/route.ts` - Response transformation + timeout + tier support

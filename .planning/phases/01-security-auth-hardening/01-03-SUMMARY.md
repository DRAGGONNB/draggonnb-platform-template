---
phase: 01-security-auth-hardening
plan: 03
subsystem: security
tags: [hmac, sha256, email-security, url-validation, environment-variables, payfast]

# Dependency graph
requires: []
provides:
  - HMAC-signed email unsubscribe and preferences tokens
  - URL validation to prevent open redirects in email click tracking
  - Hardened setup API (no default secret fallback)
  - PayFast production passphrase warning
  - Aligned .env.example with codebase
affects: [email, payments, setup, deployment]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - HMAC-SHA256 with timingSafeEqual for token verification
    - Protocol-based URL validation for redirect security
    - Graceful fallback with warning when optional secrets not configured

key-files:
  created:
    - lib/security/email-tokens.ts
    - lib/security/url-validator.ts
  modified:
    - lib/email/resend.ts
    - app/api/email/track/route.ts
    - app/api/setup/route.ts
    - lib/payments/payfast.ts
    - .env.example

key-decisions:
  - "Email tokens fall back to plain base64 with console warning if EMAIL_TRACKING_SECRET not set (allows dev without full config)"
  - "URL validator only checks protocol (http/https), no domain allowlist (click tracking needs arbitrary external URLs)"
  - "Setup API returns 503 (Service Unavailable) rather than 401 when secret not configured (clearer semantics)"

patterns-established:
  - "HMAC tokens: payload:signature format, base64url encoding, 30-day expiration"
  - "Security modules in lib/security/ directory"
  - "Console warnings for missing optional security config"

# Metrics
duration: 38min
completed: 2026-02-03
---

# Phase 1 Plan 3: Email Security Hardening Summary

**HMAC-SHA256 signed email tokens, URL validation for click tracking, hardcoded secret removal, and PayFast production warning**

## Performance

- **Duration:** 38 min
- **Started:** 2026-02-03T07:22:06Z
- **Completed:** 2026-02-03T08:00:02Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Created lib/security/email-tokens.ts with HMAC-SHA256 token generation and timing-safe verification
- Created lib/security/url-validator.ts to prevent open redirect attacks (rejects javascript:, data:, file: URLs)
- Replaced plain base64 email unsubscribe tokens with HMAC-signed tokens in lib/email/resend.ts
- Added URL validation to email click tracking endpoint before redirecting
- Removed hardcoded default secret from setup API (now returns 503 if not configured)
- Added PayFast warning when production mode enabled without passphrase
- Added missing environment variables to .env.example (NEXT_PUBLIC_APP_URL, EMAIL_TRACKING_SECRET, N8N_BASE_URL, etc.)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create HMAC email tokens and URL validator** - `1116f6b` (feat)
2. **Task 2: Fix setup API secret, PayFast warning, env alignment** - `33ed035` (fix)

## Files Created/Modified

**Created:**
- `lib/security/email-tokens.ts` - HMAC-SHA256 token generation/verification with timingSafeEqual
- `lib/security/url-validator.ts` - URL protocol validation for redirect security

**Modified:**
- `lib/email/resend.ts` - Now uses HMAC tokens for unsubscribe/preferences URLs
- `app/api/email/track/route.ts` - Validates redirect URLs before redirecting
- `app/api/setup/route.ts` - Removed hardcoded secret fallback, returns 503 if not configured
- `lib/payments/payfast.ts` - Warns when production mode has no passphrase
- `.env.example` - Added NEXT_PUBLIC_APP_URL, EMAIL_TRACKING_SECRET, N8N vars

## Decisions Made
- Email tokens gracefully fall back to plain base64 with console warning when EMAIL_TRACKING_SECRET not set (allows development without full config, warns about insecurity)
- URL validator checks protocol only (http/https), no domain allowlist (email click tracking legitimately redirects to arbitrary external URLs)
- Token expiration set to 30 days (matches existing expiration behavior)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - all tasks completed without issues.

## User Setup Required

**Environment variables must be configured:**

To enable HMAC-signed email tokens, add to `.env.local`:
```
EMAIL_TRACKING_SECRET=your_32_char_minimum_secret_here
```
Generate with: `openssl rand -hex 32`

Also ensure `NEXT_PUBLIC_APP_URL` is set for email links and payment callbacks:
```
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

## Next Phase Readiness
- Email security hardened and ready for production
- Setup API secure (requires SETUP_SECRET env var)
- PayFast will warn operators if passphrase missing in production
- All environment variables documented in .env.example

---
*Phase: 01-security-auth-hardening*
*Completed: 2026-02-03*

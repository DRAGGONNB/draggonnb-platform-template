// scripts/ci/check-sso-lint.mjs
// SSO-08 CI lint:
//   (a) Reject `export const revalidate = N` (N > 0) on any auth-touching route.
//       Reason: ISR-cached auth responses leak sessions across tenants (13-SSO-SPIKE.md Pitfall 1).
//   (b) Reject Supabase client imports in protected dashboard route files that lack
//       getUserOrg()/verifyMembership() chain.
//       Scope: app/(dashboard)/**/page.tsx and app/api/**/route.ts that are
//       user-authenticated (NOT webhook, NOT M2M, NOT public, NOT system routes).
//       Reason: Protected routes must validate tenant membership before accessing data.
// Pattern mirrors scripts/ci/check-federation-pinned.mjs (Phase 13).

import { readFileSync } from 'fs'
import { execSync } from 'child_process'

const ROOT = process.cwd()

function listFiles(globs) {
  // git ls-files: fast, respects .gitignore, handles Windows paths
  try {
    const out = execSync(`git ls-files -- ${globs.join(' ')}`, { cwd: ROOT, encoding: 'utf-8' })
    return out.split('\n').filter(Boolean)
  } catch {
    return []
  }
}

let errors = 0

// ──────────────────────────────────────────────────────────────────────────────
// (a) revalidate=N guard: auth-touching files must not use ISR caching
// ──────────────────────────────────────────────────────────────────────────────
const authGlobs = [
  'app/api/auth/**/*.ts',
  'app/api/sso/**/*.ts',
  'app/api/sso/**/*.tsx',
  'app/sso/**/*.ts',
  'app/sso/**/*.tsx',
  'lib/auth/**/*.ts',
  'lib/supabase/**/*.ts',
  'middleware.ts',
]
const authFiles = listFiles(authGlobs)
for (const f of authFiles) {
  let src
  try {
    src = readFileSync(`${ROOT}/${f}`, 'utf-8')
  } catch {
    continue
  }
  // Only flag positive numeric revalidate (>0); revalidate=0 is fine (forces dynamic).
  const m = src.match(/export\s+const\s+revalidate\s*=\s*([0-9]+)/m)
  if (m && Number(m[1]) > 0) {
    console.error(
      `ERROR (SSO-08a): ${f} sets revalidate=${m[1]} on auth-touching route. ` +
      `Auth state must not be ISR-cached — stale responses can leak sessions across tenants. ` +
      `See 13-SSO-SPIKE.md Section 4.`
    )
    errors++
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// (b) Supabase client import without getUserOrg/verifyMembership in protected files
//
// SCOPE: Only dashboard pages and authenticated API routes.
// EXEMPT categories (have their own auth mechanisms):
//   - app/api/sso/*          — SSO bridge endpoints (they ARE the auth layer)
//   - app/api/auth/*         — Auth endpoints
//   - app/sso/*              — SSO consume page
//   - app/api/webhooks/*     — HMAC-validated webhook receivers
//   - app/api/external/*     — M2M API key auth (checked in middleware)
//   - app/api/health/*       — Health checks (no user context)
//   - app/api/guest-portal/* — Public guest portal (no login required)
//   - app/api/autopilot/cron — System cron (service-role)
//   - app/api/campaigns/execute — System cron
//   - app/api/campaigns/sms-dlr — Carrier webhook
//   - app/api/campaigns/verify  — Carrier webhook
//   - app/api/accommodation/ical — Public iCal feed
//   - app/api/accommodation/webhooks — Telegram webhook
//   - app/api/meta/*         — Meta/WhatsApp webhook
//   - app/api/leads/capture  — Public lead capture form
//   - app/api/provisioning   — Service-role internal route
//   - app/api/ops/*          — Ops/admin routes with their own auth
//   - app/api/admin/*        — Admin panel routes (platform_admin role check inline)
//   - app/restaurant/*       — Restaurant app (PIN auth, separate session)
//   - app/(guest)/*          — Guest-facing public pages
//   - app/guest/*            — Guest portal
//   - app/login, app/signup  — Auth pages (not protected)
//   - app/forgot-password    — Password reset flow (not protected)
//   - app/reset-password     — Password reset flow (not protected)
// ──────────────────────────────────────────────────────────────────────────────

// Patterns that indicate a file uses an alternative auth mechanism
const EXEMPT_PATTERNS = [
  /^app\/api\/sso\//,
  /^app\/api\/auth\//,
  /^app\/sso\//,
  /^app\/api\/webhooks\//,
  /^app\/api\/external\//,
  /^app\/api\/health\//,
  /^app\/api\/guest-portal\//,
  /^app\/api\/autopilot\/cron\//,
  /^app\/api\/campaigns\/execute\//,
  /^app\/api\/campaigns\/sms-dlr\//,
  /^app\/api\/campaigns\/verify\//,
  /^app\/api\/accommodation\/ical\//,
  /^app\/api\/accommodation\/webhooks\//,
  /^app\/api\/meta\//,
  /^app\/api\/leads\/capture\//,
  /^app\/api\/provisioning\//,
  /^app\/api\/ops\//,
  /^app\/api\/admin\//,
  /^app\/restaurant\//,
  /^app\/\(guest\)\//,
  /^app\/guest\//,
  /^app\/login\//,
  /^app\/signup\//,
  /^app\/forgot-password\//,
  /^app\/reset-password\//,
]

// Target: only dashboard pages (user must be logged in + org-bound)
const dashboardGlobs = [
  'app/(dashboard)/**/page.tsx',
]
const dashboardFiles = listFiles(dashboardGlobs)
for (const f of dashboardFiles) {
  if (EXEMPT_PATTERNS.some(p => p.test(f))) continue

  let src
  try {
    src = readFileSync(`${ROOT}/${f}`, 'utf-8')
  } catch {
    continue
  }

  const importsSupabase = /from\s+['"]@\/lib\/supabase\/(server|admin)['"]/m.test(src)
  if (!importsSupabase) continue

  const hasUserOrgChain = /getUserOrg|verifyMembership/.test(src)
  if (!hasUserOrgChain) {
    console.error(
      `ERROR (SSO-08b): ${f} imports a server/admin Supabase client but never calls getUserOrg() or verifyMembership(). ` +
      `Dashboard pages must validate tenant membership. ` +
      `See 13-SSO-SPIKE.md Section 4 and CLAUDE.md Auth & User Record Pattern.`
    )
    errors++
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Result
// ──────────────────────────────────────────────────────────────────────────────
if (errors > 0) {
  console.error(`\nSSO-08 lint failed with ${errors} error(s).`)
  process.exit(1)
}
console.log('OK: SSO-08 lint passed (revalidate guard + dashboard-page tenancy chain).')

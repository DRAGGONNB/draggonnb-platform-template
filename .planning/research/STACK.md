# Stack Research — DraggonnB OS v3.1 "Operational Spine"

**Domain:** Federation milestone — DraggonnB OS (Next.js 14) + Trophy OS (Next.js 16) sharing one Supabase project
**Researched:** 2026-04-30
**Confidence:** HIGH for SSO cookie-domain pattern (Supabase docs + community-validated); HIGH for grammY + serwist (current versions verified via npm registry on 2026-04-30); HIGH for PayFast adhoc reuse (already shipping in DraggonnB lib/payments/payfast-adhoc.ts); MEDIUM for PWA install prompt UX on iOS (vendor-controlled, no automatic API); LOW for PayFast pre-authorization / hold-and-capture (no public docs, likely doesn't exist — see ADR D below).
**FX assumption:** USD/ZAR = 16.6 (carried from v3.0 archive)

---

## TL;DR — What v3.1 Adds to the Stack

1. **Cross-product SSO via shared cookie domain** — `@supabase/ssr` already supports it. Set `cookieOptions.domain = '.draggonnb.co.za'` on `createBrowserClient` / `createServerClient` in BOTH apps. No new library, no custom JWT bridge, no NextAuth.js. Net dependency cost: zero. (See ADR A.)
2. **Adopt grammY (`grammy@^1.42.0`)** — finally land what v3.0 archive flagged. Upgrade existing raw-API ops bot AND build the v3.1 approval-spine tap-to-approve handlers on top of it. Single library across BOTH bots (ops + approval). (See ADR B.)
3. **Adopt `@serwist/next@^9.5.10` for the PWA guest surface** at `stay.draggonnb.co.za/{booking-id}`. `next-pwa` is dead, `@ducanh2912/next-pwa` is succeeded by serwist. Webpack-only — fine, DraggonnB stays on webpack via Next 14.2.33. (See ADR C.)
4. **Reuse `lib/payments/payfast-*.ts` as a shared in-repo lib for Trophy OS via npm workspace OR copy-paste** — Trophy OS is on Next 16 + React 19 + Supabase SSR 0.9, while DraggonnB is on Next 14 + React 18 + Supabase SSR 0.1. The PayFast files are pure Node (`fetch` + crypto), zero React/Next deps — they port cleanly either way. Recommend physical copy with a sync convention rather than monorepo refactor (lower risk for v3.1). (See ADR E.)
5. **Multi-hunter split-billing = N adhoc charges against N tokens** — already supported by existing `chargeAdhoc()` in `lib/payments/payfast-adhoc.ts`. No new payment integration; just a junction table (`safari_hunters`) + a fan-out worker that loops adhoc calls. (See ADR D.)
6. **Damage auto-billing = adhoc charge against the booking's stored subscription token, NOT a true "hold-and-capture"** — PayFast does not publicly expose pre-authorization / hold-then-capture flows. Use the same adhoc API path with a damage prefix (`DAMAGE-{booking_id}`); guest must already have an active subscription token from the booking deposit flow. Ad-hoc capacity is constrained to whatever the issuing bank lets through; no funds reservation guarantee. Communicate this honestly in T&Cs. (See ADR D.)
7. **Skip:** NextAuth.js, Clerk, Auth0, Lucia, custom JWT exchange routes, monorepo refactor (Turborepo/Nx), Stripe, `next-pwa`, `@ducanh2912/next-pwa`, `node-telegram-bot-api`, `telegraf`, custom service worker hand-rolled.

**New runtime dependencies for DraggonnB OS:** `grammy`, `@serwist/next`, `serwist`. That is the entire net-new list.

---

## Recommended Stack Additions

### Core Additions (NEW for v3.1)

| Technology | Version | Apps | Purpose | Why Recommended |
|------------|---------|------|---------|-----------------|
| `@supabase/ssr` (already installed) — **upgrade DraggonnB from 0.1.0 → 0.10.2** | `^0.10.2` | DraggonnB + Trophy | Set `cookieOptions.domain` for cross-subdomain session sharing | DraggonnB is pinned to v0.1.0 (3 years stale). v0.6.x added `cookieOptions` override, v0.10.x added cache-header forwarding for `setAll`. Required for SSO cookie-domain pattern. Trophy already on v0.9.0 — bump to 0.10.2 in same PR. |
| `grammy` | `^1.42.0` (published 2026-04-03) | DraggonnB | Telegram bot framework — webhooks + inline keyboards + callback queries | Already prescribed in v3.0 stack archive but never installed. v3.1 is the right moment because approval-spine tap-to-approve REQUIRES inline keyboards + secret-token verification. Existing raw-API ops-bot code (`lib/accommodation/telegram/ops-bot.ts`) gets refactored onto grammY at the same time. |
| `@serwist/next` | `^9.5.10` (published 2026-04-30) | DraggonnB | Service worker generator for PWA guest surface | Successor to dead `next-pwa` and superseded `@ducanh2912/next-pwa`. Webpack-required (fine — DraggonnB is on Next 14.2.33, no Turbopack). Generates SW from `app/sw.ts`, integrates with `app/manifest.json`, supports App Router. |
| `serwist` (peer of `@serwist/next`) | `^9.5.10` | DraggonnB | Workbox-fork runtime for the SW | Required peer dependency (devDep) of `@serwist/next`. |

### Supporting Libraries (NO NEW INSTALLS — leveraged existing)

| Library | Current Version | How v3.1 Uses It |
|---------|-----------------|------------------|
| `@supabase/supabase-js` | `^2.39.0` (DraggonnB) → bump to `^2.105.1` to match Trophy | SSO cookie domain — pass `cookieOptions` through `createBrowserClient` / `createServerClient`. |
| `@anthropic-ai/sdk` | `^0.73.0` | Approval-spine summary generation (Haiku 4.5 with brand-voice cache, same pattern as v3.0). No new SDK feature needed. |
| `zod` | `^3.22.0` | New schemas: `ApprovalRequestSchema`, `SafariHunterSchema`, `DamageChargeSchema`, `BookingPwaTokenSchema`. |
| Existing `lib/payments/payfast-adhoc.ts` | shipping | Reused as-is for damage charges (`DAMAGE-` prefix) and per-hunter split (`HUNT-` prefix — add to `payfast-prefix.ts`). |
| Existing `lib/payments/payfast-subscription-api.ts` | shipping | Used by Trophy OS for hunter subscriptions (each hunter gets their own token at safari deposit time). |
| `next/headers`, `next/server` | bundled | Approval-link cryptographic signing using `crypto.subtle` from Web Crypto API — no JWT lib needed. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Vercel multi-domain config | Bind `stay.draggonnb.co.za` to DraggonnB project; bind `trophy.draggonnb.co.za` to Trophy OS project | Both must be on the SAME Vercel team to share the wildcard cert. SSO cookie domain `.draggonnb.co.za` works only if BOTH apps are reachable on subdomains of `draggonnb.co.za`. |
| `npx @next/codemod@canary upgrade latest` (Trophy only) | Already done by Trophy team — Trophy is on Next 16.2.1 | Do NOT upgrade DraggonnB to Next 16 in v3.1. Risk too high for live platform with 720 tests + 162 routes. Defer to dedicated migration milestone. |
| `pwa-asset-generator` (CLI, one-off) | Generate iOS/Android PWA icons + splash screens | Run once during Phase 16, commit output to `public/icons/`. Not a runtime dep. |

### What We Explicitly DO NOT Add

| Do NOT add | Reason | Use Instead |
|------------|--------|-------------|
| `next-auth` / `@auth/core` / `@auth/nextjs` | Supabase already IS our auth provider; layering NextAuth on top adds a second token system, second cookie, and a third source of truth. The cookie-domain pattern with `@supabase/ssr` solves SSO natively. | `@supabase/ssr` v0.10.2 with `cookieOptions.domain = '.draggonnb.co.za'`. |
| `iron-session` / custom JWT bridge route | Re-implements what Supabase already does. Adds attack surface (key rotation, signature verification). The Supabase JWT IS the federation token — both apps verify it. | Native Supabase JWT verified via `getClaims()` in middleware on each app. |
| `@clerk/nextjs`, `@auth0/nextjs-auth0` | Forces dual-auth migration. Loses tenant-scoped RLS via `get_user_org_id()` STABLE function. Adds vendor cost (Clerk: $25+/mo, Auth0: $35+/mo per app). | Supabase Auth (already paid for). |
| `next-pwa` | Last published 2 years ago. Workbox dependency stale. Doesn't support App Router cleanly. | `@serwist/next`. |
| `@ducanh2912/next-pwa` | Maintainer themselves recommends migrating to serwist. Marked as "predecessor" of `@serwist/next`. | `@serwist/next`. |
| `node-telegram-bot-api` | Polling model. Requires custom server. Incompatible with Vercel serverless. Type quality issues. | `grammy` with `webhookCallback(bot, "std/http")`. |
| `telegraf` | Heavier than grammY, weaker TypeScript inference, slower to release patches in 2025–2026. | `grammy`. |
| Hand-rolled service worker | Re-implements Workbox cache strategies. Easy to break offline behavior. Hard to test. | `@serwist/next` with `defaultCache` + custom routes for PWA-specific fetches. |
| Turborepo / Nx monorepo | v3.1 is a federation milestone, not a structural refactor. Both apps are independent Vercel projects with independent deploy cadences. Forcing them into a monorepo introduces deploy-coupling that we DON'T want. | Keep two repos. Share PayFast lib via copy-paste with a `// COPIED FROM draggonnb-platform/lib/payments/ — v1.0.0 — keep in sync` header. Track sync in `.planning/STATE.md`. |
| Stripe / Paystack / Yoco for damage billing | PayFast is already integrated, ZAR-native, has stored subscription tokens, and is the issuing card-on-file for any DraggonnB tenant. Adding a second processor for damage = double reconciliation. | Existing `chargeAdhoc()` with `DAMAGE-` prefix. |
| `@base-ui/react` (Trophy uses this) into DraggonnB | DraggonnB is on shadcn/ui (Radix primitives). Mixing UI libraries in one codebase = bundle bloat + style conflicts. | Keep DraggonnB on Radix/shadcn. Trophy can stay on Base UI. They're separate apps. |
| jsPDF / pdfmake for PWA offline receipts | Not in v3.1 scope. PWA guest surface is read-only check-in info, not document generation. | Defer to v3.2 if needed. |

---

## Architecture Decision Records

### ADR A: Cross-Product SSO via Shared Cookie Domain

**Decision:** Use `@supabase/ssr` v0.10.2's `cookieOptions.domain` on both apps to scope the auth cookie to `.draggonnb.co.za`. No bridge, no NextAuth, no custom JWT exchange.

**Mechanism:**

Both apps already share one Supabase project (`psqfgzbjbgqrmjskdavs`). The auth cookie `sb-psqfgzbjbgqrmjskdavs-auth-token` (set by Supabase) is normally scoped to a single host. By setting `Domain=.draggonnb.co.za`, the browser sends it to BOTH `app.draggonnb.co.za` and `trophy.draggonnb.co.za` (and `stay.draggonnb.co.za` for the PWA). Both apps' middleware resolves the same user via the same JWT, hits the same `organization_users` table, gets the same RLS-scoped data.

**Pattern (apply to BOTH apps):**

```typescript
// lib/supabase/client.ts (browser)
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        domain: process.env.NODE_ENV === 'production' ? '.draggonnb.co.za' : undefined,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 365,
      },
    },
  )
```

```typescript
// lib/supabase/server.ts (server / middleware)
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createClient = () => {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              domain: process.env.NODE_ENV === 'production' ? '.draggonnb.co.za' : undefined,
              sameSite: 'lax',
              secure: true,
              path: '/',
            })
          })
        },
      },
    },
  )
}
```

**Required upgrades:**

- **DraggonnB:** `@supabase/ssr` 0.1.0 → 0.10.2 (3 years of changes). Run regression on auth pages, especially middleware tenant resolution. v0.6.x renamed `cookies.get/set/remove` to `cookies.getAll/setAll`. **This is a notable refactor — budget half a day.**
- **Trophy:** `@supabase/ssr` 0.9.0 → 0.10.2 (minor bump). Low risk.

**localhost dev caveat:** Cross-subdomain cookies do not work on `localhost` without a reverse proxy. Document this in dev setup: use `app.draggonnb.test` + `trophy.draggonnb.test` via `/etc/hosts` + Caddy reverse proxy with SSL, OR test SSO only against Vercel preview deployments.

**Rejected alternatives:**

| Alternative | Why rejected |
|-------------|--------------|
| Custom JWT bridge (e.g. `/api/auth/exchange?to=trophy`) | Re-implements what cookie sharing does for free. Adds attack surface (replay attacks, key rotation). Two sources of truth. |
| NextAuth.js with Supabase adapter | Replaces our auth, doesn't extend it. Loses RLS via JWT claims. Doubles cost (NextAuth's session table on top of Supabase's). |
| Lucia | Same as NextAuth — replaces, doesn't bridge. |
| `iron-session` | Server-side encrypted cookie. Solves a different problem (stateless server sessions). Adds 2nd cookie alongside Supabase's. |
| Cross-domain `postMessage` SSO | Required only when products are on different root domains. Both ours are on `*.draggonnb.co.za` — overkill. |

**Confidence:** HIGH. Pattern is documented in [Supabase discussion #5742](https://github.com/orgs/supabase/discussions/5742) and validated by [Michele Ong's blog post](https://micheleong.com/blog/share-sessions-subdomains-supabase). Multiple independent confirmations.

---

### ADR B: grammY for Both Telegram Bots

**Decision:** Adopt `grammy@^1.42.0` for the v3.1 approval-spine bot AND refactor the existing accommodation ops bot onto the same library.

**Rationale:**

- v3.0 archive prescribed grammY but it never landed (0 occurrences in current package.json).
- Approval spine REQUIRES inline keyboards (tap-to-approve), callback queries (the user pressed which button), and `answerCallbackQuery()` (so the Telegram client doesn't show a stuck spinner). Hand-rolling these against the raw Telegram API is fiddly.
- Existing `lib/accommodation/telegram/ops-bot.ts` is raw `fetch` to `api.telegram.org`. Refactoring it onto grammY at the same time means ONE bot framework in the codebase, not two.
- v1.42.0 is current (published 2026-04-03), zero open Sev1 issues, App Router native.

**Pattern:**

```typescript
// app/api/webhooks/telegram/approvals/route.ts
import { Bot, InlineKeyboard, webhookCallback } from 'grammy'

const bot = new Bot(process.env.TELEGRAM_APPROVAL_BOT_TOKEN!)

bot.on('callback_query:data', async (ctx) => {
  const [action, requestId] = ctx.callbackQuery.data!.split(':')
  // 1. Verify HMAC of requestId against env secret
  // 2. Resolve approval_request via Supabase admin client
  // 3. Apply decision (approve | reject)
  // 4. Acknowledge to Telegram (REQUIRED — kills spinner)
  await ctx.answerCallbackQuery({ text: `${action} recorded` })
  await ctx.editMessageText(`Decision: ${action}`)
})

export const POST = webhookCallback(bot, 'std/http', {
  secretToken: process.env.TELEGRAM_APPROVAL_WEBHOOK_SECRET, // verifies X-Telegram-Bot-Api-Secret-Token
})
```

**Webhook secret verification:** grammY's `webhookCallback` takes a `secretToken` option that automatically validates the `X-Telegram-Bot-Api-Secret-Token` header against the configured secret and rejects non-matching requests. No manual header check needed.

**Bot inventory after v3.1:**

| Bot purpose | Token env var | Webhook route | Refactor status |
|-------------|---------------|---------------|------------------|
| Accommodation ops (existing) | `TELEGRAM_OPS_BOT_TOKEN` | `app/api/webhooks/telegram/ops/route.ts` | Refactor onto grammY in Phase 14 |
| Approval spine (new in v3.1) | `TELEGRAM_APPROVAL_BOT_TOKEN` | `app/api/webhooks/telegram/approvals/route.ts` | Built fresh on grammY |
| Finance receipt OCR (v3.0 archive prescribed, status?) | `TELEGRAM_FINANCE_BOT_TOKEN` | `app/api/webhooks/telegram/finance/route.ts` | If shipped → already on grammY. If not shipped → defer. |

**Confidence:** HIGH. grammY documented for Vercel/Next.js App Router at [grammy.dev/hosting/vercel](https://grammy.dev/hosting/vercel). 1.42.0 verified via npm registry on 2026-04-30.

---

### ADR C: @serwist/next for the PWA Guest Surface

**Decision:** Use `@serwist/next@^9.5.10` + `serwist@^9.5.10` for the per-booking PWA at `stay.draggonnb.co.za/{booking-id}`.

**Rationale:**

- `next-pwa` (shadowwalker) is unmaintained (last release 2 years ago).
- `@ducanh2912/next-pwa` (the fork) explicitly tells users to migrate to `@serwist/next`.
- `@serwist/next` is the modern Workbox fork, App Router native, generates SW from `app/sw.ts`.
- v9.5.10 published 2026-04-30 — actively maintained.
- DraggonnB is on Next 14.2.33 (webpack default) — no Turbopack issue.

**Setup pattern:**

```typescript
// next.config.js
import withSerwistInit from '@serwist/next'

const withSerwist = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === 'development',
})

export default withSerwist({ /* existing next config */ })
```

```typescript
// app/sw.ts
import { defaultCache } from '@serwist/next/worker'
import { Serwist } from 'serwist'

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: (string | { url: string })[] | undefined
}

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
})

serwist.addEventListeners()
```

```typescript
// app/manifest.ts (App Router metadata API)
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'DraggonnB Stay',
    short_name: 'Stay',
    description: 'Your booking dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icons/192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
```

**Install prompt UX (per-platform):**

| Platform | Install prompt | Approach |
|----------|----------------|----------|
| Android Chrome | Native `beforeinstallprompt` event | Capture event, show custom CTA banner ("Save this to your home screen for offline access"), call `prompt()` on click. |
| iOS Safari (16.4+) | NO `beforeinstallprompt` support — user must use Share menu | Show platform-detected instruction modal: "Tap Share, then 'Add to Home Screen'". Critical: ~50% of guest pilot is iPhone users — this UX is load-bearing. |
| iOS 26+ (Apr 2026 default) | All home-screen sites open as web apps by default | Once installed, behaves like native app. The friction is purely the install step. |
| Desktop Chrome | Native `beforeinstallprompt` | Same as Android. |
| Desktop Safari | Limited PWA support; user uses File menu | Don't push install on desktop — desktop guests are rare for accommodation. |

**Scope of offline-first (Phase 16):**

| Surface | Cache strategy |
|---------|----------------|
| `/{booking-id}` (booking summary page) | `StaleWhileRevalidate` — show cached, fetch fresh in background |
| `/{booking-id}/check-in-form` | `NetworkFirst` with cache fallback — works at lodge with poor signal |
| `/api/bookings/[id]/check-in` (POST) | Background Sync queue — store mutation in IDB, replay when online |
| Static assets (icons, fonts, JS bundles) | `CacheFirst` — Workbox default |
| `/api/payments/...` | NEVER cache — always network-only |

**Confidence:** HIGH. Verified `@serwist/next@9.5.10` and `serwist@9.5.10` published 2026-04-30 on npm. Setup documented at [serwist.pages.dev/docs/next/getting-started](https://serwist.pages.dev/docs/next/getting-started). MEDIUM confidence on iOS install prompt UX — Apple controls the experience; we can detect platform but cannot trigger native prompt.

---

### ADR D: PayFast for Damage Billing AND Multi-Hunter Split — No New Library

**Decision:** Reuse existing `lib/payments/payfast-adhoc.ts` (`chargeAdhoc()`) for both damage charges and per-hunter splits. Add new prefixes to `lib/payments/payfast-prefix.ts`. No new payment integration.

**Rationale:**

The DraggonnB codebase already has shipped:
- `lib/payments/payfast.ts` — config + signature generation
- `lib/payments/payfast-adhoc.ts` — `chargeAdhoc()` function for `ADDON-`, `TOPUP-`, `ONEOFF-` prefixes
- `lib/payments/payfast-subscription-api.ts` — fetch / cancel / pause / unpause
- `lib/payments/payfast-prefix.ts` — prefix-branched ITN webhook routing

Both v3.1 use cases reduce to "charge an existing subscription token an adhoc amount":
- **Damage:** existing booking already has a subscription token from deposit. Charge `DAMAGE-{booking_id}` adhoc. Same code path as `TOPUP-`.
- **Multi-hunter split:** each hunter has their own subscription token (from individual safari deposit). Charge each `HUNT-{safari_id}-{hunter_id}` adhoc. Same code path, called N times in a loop.

**Required additions:**

```typescript
// lib/payments/payfast-prefix.ts — extend
export const PAYFAST_PREFIX = {
  // existing
  ADDON: 'ADDON-',
  TOPUP: 'TOPUP-',
  ONEOFF: 'ONEOFF-',
  // v3.1 additions
  DAMAGE: 'DAMAGE-',  // accommodation damage auto-billing
  HUNT:   'HUNT-',    // per-hunter safari fee
} as const
```

ITN webhook router (`app/api/webhooks/payfast/route.ts`) already prefix-branches — add two new branches.

**Critical PayFast capability confirmation:**

PayFast `/subscriptions/{guid}/adhoc` POST endpoint is confirmed working:
- Endpoint: `https://api.payfast.co.za/subscriptions/{token}/adhoc` (sandbox: `sandbox.payfast.co.za`)
- Body: `{ amount, item_name, item_description?, m_payment_id }`
- Headers: `merchant-id`, `version=v1`, `timestamp`, `signature`
- **Amount unit: SPIKE PENDING** — Phase 09-04 spike note in DraggonnB confirmed unit ambiguity (rands vs cents). Current `chargeAdhoc()` sends rands. The PayFast PHP SDK example sends `amount=500` for "Test adhoc" with no unit specified. **Verify against sandbox in v3.1 Phase 13 before damage billing ships.**
- Charges happen against the card stored at subscription-creation time. Guest does NOT re-enter card.

**What PayFast does NOT support (as of 2026-04-30, public docs):**

| Capability | Status | Workaround |
|------------|--------|------------|
| Pre-authorization / hold-and-capture | NOT publicly documented; likely unavailable | Frame damage charges as "immediate debit if damages found", not "hold released if no damages". Adjust T&Cs. |
| Charging a stored token outside a subscription context (true card-on-file / vault token) | Unclear — adhoc API requires a `subscription_token`, not a free-floating vault token | Every guest who might be charged for damage MUST have an active subscription (even R0/month) created at booking. Equivalent of "ZAR 0.00 daily authorization with adhoc charge capability". Verify pattern works in sandbox. |
| Split-payment (one customer → N merchants in one txn) | Not relevant here — we're doing N separate transactions, all to the same merchant | N/A |
| Refund via API | Documented elsewhere in PayFast API; out of v3.1 scope | Manual via dashboard for now |

**Multi-hunter split-billing pattern:**

```typescript
// New: lib/payments/payfast-multi-hunter.ts (Trophy OS — copied lib)
export async function chargeHunters(safari: Safari, hunters: SafariHunter[]) {
  const results = []
  for (const hunter of hunters) {
    const result = await chargeAdhoc({
      subscriptionToken: hunter.payfast_token,  // each hunter has their own
      organizationId: safari.org_id,
      amountCents: hunter.fee_cents,
      itemName: `${safari.species} hunt — ${hunter.name}`,
      prefix: 'HUNT',
    })
    results.push({ hunter_id: hunter.id, ...result })
    // record to safari_hunter_charges table
  }
  return results
}
```

**Failure handling:** if hunter 3 of 5 fails, do NOT roll back hunters 1-2. PayFast charges are not transactional. Record per-hunter status; have outfitter retry/manual-charge the failed hunter.

**Confidence:** HIGH for adhoc reuse (DraggonnB ships this code today). MEDIUM for amount-unit (sandbox spike confirmed pending). LOW for hold-and-capture availability (no public docs). Recommend Phase 13 PayFast sandbox spike before Phase 15 ships damage billing.

---

### ADR E: Trophy OS PayFast Integration — Copy-Paste, Not Monorepo

**Decision:** Trophy OS gets a copy of `lib/payments/payfast-*.ts` files (4 files), not a shared npm workspace. Track sync convention in `.planning/STATE.md`.

**Why not monorepo:**

- DraggonnB and Trophy are on diverging stacks: Next 14.2.33 + React 18 + Supabase SSR 0.1 vs Next 16.2.1 + React 19 + Supabase SSR 0.9. Forcing them into a shared package = forcing simultaneous version bumps for both apps.
- Independent Vercel deploys are a feature, not a bug. v3.1 is about FEDERATING two products at the user-experience layer, not COUPLING them at build-time.
- The PayFast lib is ~800 lines total across 4 files. The cost of "copy + manual sync when changes happen" is far less than the cost of monorepo refactor + dual upgrade lockstep.

**Why not a published npm package:**

- Adds a CI step (publish, version, install).
- Slows iteration during the spike-heavy Phase 13–15 period.
- Adds a third "source of truth" question (which version is in prod for which app?).

**Sync convention (manual but documented):**

1. Source of truth: `draggonnb-platform/lib/payments/payfast-*.ts`
2. Copy lives at: `trophy-os/lib/payments/payfast-*.ts`
3. Header at top of every copied file:
   ```typescript
   /**
    * COPIED FROM draggonnb-platform/lib/payments/[file].ts
    * Sync version: 1.0.0 — 2026-05-15
    * If you change this file in trophy-os, ALSO update draggonnb-platform AND increment sync version.
    */
   ```
4. Track in `.planning/STATE.md` under "PayFast lib sync version: X.Y.Z (last synced YYYY-MM-DD)".

**What Trophy OS specifically needs from the lib:**

| File | Trophy use case | Modifications needed |
|------|-----------------|----------------------|
| `payfast.ts` | Config + signature gen | None — uses Trophy's `PAYFAST_*` env vars |
| `payfast-adhoc.ts` | Per-hunter adhoc charges | Add `HUNT` to allowed prefix type |
| `payfast-prefix.ts` | Prefix definitions | Add `HUNT` |
| `payfast-subscription-api.ts` | Cancel hunt subscriptions on safari cancellation | None |

**What Trophy OS does NOT need (do not copy):**

- `lib/accommodation/payments/payfast-link.ts` — accommodation-specific link generation
- DraggonnB ITN webhook handler — Trophy gets its OWN webhook at `trophy.draggonnb.co.za/api/webhooks/payfast`

**Future state:** When v3.2 or later requires deeper coupling (e.g. shared agent sessions, shared usage ledger writing across products), revisit monorepo. Not v3.1.

**Confidence:** HIGH. The PayFast files are pure Node (`fetch` + crypto module) with zero React, zero Next, zero Supabase imports. They port across Next 14/16 + React 18/19 without modification.

---

## Integration Points With Existing Stack

### 1. Approval Spine (Phase 14)

**New tables:**
- `approval_requests` (id, org_id, requester_user_id, action_type, payload JSONB, status: pending|approved|rejected|expired, decided_by_user_id, decided_at, expires_at, telegram_message_id, hmac_secret)
- `approval_action_types` (key, label, description, requires_role, default_expiry_hours) — registry table

**Cryptographic action signing:**

The Telegram tap-to-approve URL embeds an HMAC of `(requestId, action, secret)` using Web Crypto API. No JWT lib needed:

```typescript
// lib/approvals/sign.ts
const enc = new TextEncoder()
const key = await crypto.subtle.importKey(
  'raw',
  enc.encode(process.env.APPROVAL_HMAC_SECRET!),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign', 'verify'],
)
const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${requestId}:${action}`))
```

**No new library** — `crypto.subtle` is built-in to Node 18+ and Edge runtime.

**Reuses:**
- `getUserOrg()` — for resolving who's approving
- `BaseAgent` — Haiku 4.5 with brand-voice cache for generating approval summaries ("Boris wants to approve a R45,000 expense for...")
- `ai_usage_ledger` + `record_usage_event` RPC — meter approval-summary generations
- `guardUsage()` — at the API route level on `/api/approvals/request`

### 2. Cross-Product Sidebar Federation (Phase 13)

**No new dependencies.** Both apps already import `lucide-react`. The federation pattern is:

```typescript
// lib/sidebar/federated-sidebar.tsx (DraggonnB)
const products = [
  { name: 'DraggonnB OS', href: 'https://app.draggonnb.co.za', current: true },
  { name: 'Trophy OS', href: 'https://trophy.draggonnb.co.za', current: false, gated: 'trophy_os_module' },
]
```

Cross-product link clicks land in the OTHER app already authenticated (because cookie domain `.draggonnb.co.za` covers both). No SSO redirect, no token exchange.

**Module gating:** Trophy OS sidebar entry only renders if `tenant_modules` has `trophy_os` activated for the user's org. Existing DB-backed feature gating works as-is.

### 3. Hunt Booking ↔ Accommodation Booking Linkage (Phase 15)

**New table (DraggonnB schema):**
- `cross_product_links` (id, source_product, source_id, target_product, target_id, link_type, created_at)

Example row:
```
(uuid, 'trophy', '<safari_id>', 'accommodation', '<booking_id>', 'safari_stay', now())
```

**Both products** read from this table to:
- Show "linked accommodation" on safari detail page (Trophy)
- Show "linked safari" on booking detail page (DraggonnB)

**No cross-app API calls** — both query the same Supabase project. RLS via shared `organization_users` ensures isolation.

### 4. PWA Guest Surface (Phase 16)

**New route:** `app/(public)/stay/[bookingId]/page.tsx` (DraggonnB) — public, no auth. Booking ID is a UUIDv4 — unguessable, OK as a "magic link" token.

**Content:** check-in form, lodge info, contact, real-time Wi-Fi password reveal, optional offline check-in submission via Background Sync.

**Subdomain binding:** `stay.draggonnb.co.za` → DraggonnB Vercel project, route via Next middleware to `/stay/{bookingId}` based on hostname.

**Asset budget:** PWA shell ~100 KB (lodge logo, fonts, base CSS). Goal: install + offline-ready in <2 seconds on 3G.

### 5. Anthropic + Caching (carried from v3.0)

No changes for v3.1. Approval summaries reuse the same prompt-caching pattern from v3.0 — cached `tenant_brand_voices` + cached approval-summary system prompt. Cost: ~R0.0003 per approval summary at Haiku 4.5 with 70% cache hit rate.

---

## Installation

```bash
# DraggonnB OS additions
npm install grammy @serwist/next
npm install -D serwist

# Upgrade @supabase/ssr (CRITICAL — required for cookieOptions.domain support)
npm install @supabase/ssr@latest @supabase/supabase-js@latest
# This bumps from 0.1.0 → 0.10.2 — non-trivial. Test middleware + auth flows.

# Trophy OS additions
# (in C:\Dev\DraggonnB\products\trophy-os)
# Copy lib/payments/payfast-*.ts from draggonnb-platform — no npm installs needed.
# Bump @supabase/ssr 0.9.0 → 0.10.2:
npm install @supabase/ssr@latest
```

**No dev deps needed** — all listed packages ship with TypeScript types.

**Environment variables (DraggonnB):**

```
# Existing — unchanged
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
TELEGRAM_OPS_BOT_TOKEN=...

# NEW for v3.1
TELEGRAM_APPROVAL_BOT_TOKEN=        # separate bot for approval spine
TELEGRAM_APPROVAL_WEBHOOK_SECRET=   # for X-Telegram-Bot-Api-Secret-Token verification
APPROVAL_HMAC_SECRET=                # 32+ random bytes for HMAC tap-to-approve URLs
NEXT_PUBLIC_STAY_DOMAIN=stay.draggonnb.co.za  # for PWA manifest start_url
NEXT_PUBLIC_TROPHY_DOMAIN=trophy.draggonnb.co.za  # for cross-product sidebar
```

**Environment variables (Trophy OS):**

```
# Existing
NEXT_PUBLIC_SUPABASE_URL=...   # SAME PROJECT as DraggonnB
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# NEW for v3.1
PAYFAST_MERCHANT_ID=...
PAYFAST_MERCHANT_KEY=...
PAYFAST_PASSPHRASE=...
PAYFAST_API_VERSION=v1
PAYFAST_MODE=production    # or sandbox
NEXT_PUBLIC_DRAGGONNB_DOMAIN=app.draggonnb.co.za   # for cross-product link
```

---

## Alternatives Considered

| Recommended | Alternative | When Alternative Makes Sense |
|-------------|-------------|------------------------------|
| `@supabase/ssr` `cookieOptions.domain` | NextAuth.js with Supabase adapter | If we were greenfield and didn't already have RLS via JWT claims working. We're not — we have `get_user_org_id()` STABLE function and `FORCE ROW LEVEL SECURITY` on every table. Replacing the JWT issuer would invalidate all of that. |
| `@supabase/ssr` `cookieOptions.domain` | Custom JWT bridge route | If apps were on different root domains (e.g. `draggonnb.co.za` AND `trophy-platform.com`). Then cookie sharing would not work and we'd need `postMessage` or token exchange. Both ours are on `*.draggonnb.co.za` — overkill. |
| `grammy` | Hand-rolled `fetch` to api.telegram.org | If approval spine had only 1 or 2 simple commands. It has inline keyboards + callback queries + answer-callback + edit-message — exactly what grammY abstracts. |
| `grammy` | `telegraf` | If team had deep Telegraf expertise. Neither team does. grammY has better TS, lighter bundle, App-Router-native webhook export. |
| `@serwist/next` | Hand-rolled SW + `app/sw.js` | If we needed exotic caching (e.g. encrypted SW). We don't. defaultCache + 2-3 custom routes covers the PWA. |
| `@serwist/next` | `@ducanh2912/next-pwa` | If migrating an existing project that already uses `@ducanh2912/next-pwa`. We have nothing — net new — so go straight to serwist. |
| Copy-paste PayFast lib | Turborepo monorepo | If Trophy and DraggonnB shared >50% of lib code AND aligned on same Next/React versions. Currently they share ~5% (just PayFast) and diverge on Next 14 vs 16. |
| Copy-paste PayFast lib | Published npm package `@draggonnb/payfast` | When we have 3+ apps consuming the same lib. With 2 apps and 4 small files, the publish/install overhead loses to copy-paste. |
| HMAC URL signing for approval taps | JWT (`jose` lib) | If we needed expiry, claims, multi-key rotation, or 3rd-party verification. We need none of that — `(requestId, action, secret)` HMAC is the minimum viable signature. |

---

## Stack Patterns by Variant

**If tenant has only DraggonnB OS (no Trophy):**
- Cookie domain still set to `.draggonnb.co.za` (harmless — single subdomain works fine).
- No cross-product sidebar entry (gated by `tenant_modules`).
- PWA at `stay.draggonnb.co.za/{booking_id}` only relevant if accommodation module active.

**If tenant has only Trophy OS (no DraggonnB):**
- Cookie domain `.draggonnb.co.za` enables them to also access `app.draggonnb.co.za` if/when DraggonnB onboards them. SSO is forward-compatible.
- Trophy uses copy-pasted PayFast lib for hunter splits.

**If tenant has BOTH (Swazulu pilot):**
- Single sign-on works automatically via cookie domain.
- Cross-product sidebar shows both entries.
- Hunt booking auto-creates linked accommodation booking via `cross_product_links` table.
- Approval spine spans both — e.g. "Approve safari trophy fee adjustment" routes to ops manager regardless of which product they're currently viewing.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@supabase/ssr@^0.10.2` | `@supabase/supabase-js@^2.105.x` | DraggonnB must bump BOTH together. Existing `@supabase/supabase-js@^2.39.0` is compatible with new `@supabase/ssr@0.10.x` but recommend matching to current. |
| `@supabase/ssr@^0.10.2` | `next@14.2.33` AND `next@16.2.1` | Same library version works for both apps. Validated on both Next versions per Supabase docs. |
| `grammy@^1.42.0` | `next@14.2.33` (Node runtime, NOT Edge) | `webhookCallback(bot, "std/http")` works on Node runtime. For media (file downloads in finance bot), MUST use `runtime = "nodejs"` not Edge. |
| `@serwist/next@^9.5.10` | `next@14.2.33` (webpack only) | Compatible with App Router. **NOT** compatible with Turbopack — DraggonnB must stay on webpack (`next dev` default for Next 14, no `--turbo` flag). |
| `@serwist/next@^9.5.10` | `next@16.2.1` | Trophy OS compatibility: works only if Trophy OS doesn't enable Turbopack. Trophy OS does NOT need PWA in v3.1 — defer this question. |
| Cookie domain `.draggonnb.co.za` | DNS / Vercel | Both apps must be deployed under the same eTLD+1 (`draggonnb.co.za`). Already configured via wildcard DNS + Vercel wildcard domain. |
| `crypto.subtle` HMAC | Node 18+, Vercel Edge runtime | Available in all our runtimes. No polyfill needed. |
| PayFast adhoc API | Existing `lib/payments/*` | NO version coupling — just HTTP calls. Trophy OS gets the lib via copy-paste. |

---

## Cost Implications

**No new vendor relationships.** All v3.1 additions are open-source libraries (grammy, serwist) or existing vendor capabilities (Supabase cookie config, PayFast adhoc) we already pay for.

| Item | Cost change |
|------|-------------|
| Supabase | Unchanged. Same project, same tier, more rows in `approval_requests` + `cross_product_links`. |
| Vercel | Unchanged for DraggonnB (already on a paid tier). Trophy OS may need its own Vercel project — confirm it's already deployed. PWA service worker adds ~30 KB to bundle, negligible bandwidth impact. |
| PayFast | Unchanged. Damage charges + hunter splits use existing merchant relationship. PayFast charges merchant fees per transaction (~3.5%), already in the model. |
| Telegram | Free. New approval bot uses same Bot API. No cost. |
| Anthropic | Approval-summary generations: ~R0.0003 each at Haiku 4.5 with cache. Estimated 50-200 approvals/month per active tenant = ~R0.06/month/tenant. Negligible. |
| **Total v3.1 ongoing cost increase per tenant** | **~R0.06-0.20/month** (Anthropic for approval summaries). Within v3.0 unit-economics envelope. |

---

## Sources

### High Confidence (current docs verified 2026-04-30)

- [@supabase/ssr on npm](https://www.npmjs.com/package/@supabase/ssr) — version 0.10.2, published 2026-04-23 (verified via `npm view @supabase/ssr time --json`)
- [@supabase/supabase-js on npm](https://www.npmjs.com/package/@supabase/supabase-js) — version 2.105.1
- [Supabase Auth Discussion #5742](https://github.com/orgs/supabase/discussions/5742) — cross-subdomain cookie domain pattern, multiple Supabase team confirmations
- [Michele Ong — Share Sessions Across Subdomains with Supabase](https://micheleong.com/blog/share-sessions-subdomains-supabase) — independent confirmation of `cookieOptions.domain` pattern
- [Supabase SSR Creating a Client docs](https://supabase.com/docs/guides/auth/server-side/creating-a-client) — current API reference
- [grammY on npm](https://www.npmjs.com/package/grammy) — version 1.42.0, published 2026-04-03
- [grammY hosting on Vercel](https://grammy.dev/hosting/vercel) — `webhookCallback(bot, "std/http")` App Router pattern
- [grammY Inline Keyboards plugin](https://grammy.dev/plugins/keyboard) — `InlineKeyboard` + callback queries
- [Telegram Bot API — setWebhook secret_token](https://core.telegram.org/bots/api#setwebhook) — official secret token verification
- [@serwist/next on npm](https://www.npmjs.com/package/@serwist/next) — version 9.5.10, published 2026-04-30
- [@serwist/next docs — Getting Started](https://serwist.pages.dev/docs/next/getting-started) — App Router setup, manifest, sw.ts pattern
- [LogRocket — Build a Next.js 16 PWA with true offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — Serwist as the next-pwa successor
- [PayFast PHP SDK GitHub](https://github.com/PayFast/payfast-php-sdk) — adhoc endpoint signature
- [DraggonnB existing `lib/payments/payfast-adhoc.ts`](C:\Dev\draggonnb-platform\lib\payments\payfast-adhoc.ts) — already shipping in DraggonnB, validates the pattern
- [DraggonnB existing `lib/payments/payfast-subscription-api.ts`](C:\Dev\draggonnb-platform\lib\payments\payfast-subscription-api.ts) — already shipping

### Medium Confidence (community docs, single-source corroboration)

- [LaunchFA.st — Telegram Bot in Next.js App Router](https://www.launchfa.st/blog/telegram-nextjs-app-router) — App Router + grammY worked example
- [web.dev — PWA Installation Prompt](https://web.dev/learn/pwa/installation-prompt/) — `beforeinstallprompt` capture pattern
- [MagicBell — PWA iOS Limitations 2026](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide) — iOS install UX, iOS 26 default home-screen behavior
- [Next.js v16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — async request APIs, codemods (relevant only when DraggonnB eventually upgrades, NOT in v3.1 scope)

### Low Confidence — Flag for Phase 13 spike

- **PayFast hold-and-capture / pre-authorization** — no public documentation found. May not be supported. Damage billing in v3.1 should be documented to guests as "post-stay debit", not "deposit hold". Plan: confirm with PayFast support during Phase 13.
- **PayFast amount unit (rands vs cents) in adhoc** — Phase 09-04 spike note in DraggonnB flagged this is unconfirmed. Existing code sends rands. **Run sandbox test before Phase 15 ships damage billing.**
- **PayFast non-subscription token charging** — unclear if a card stored without an active subscription can be charged adhoc. Workaround: every PWA-onboarded guest must have a subscription (even R0/month "stay token" subscription) created at booking deposit time. Test in sandbox.
- **iOS Safari `beforeinstallprompt` support in iOS 26** — vendor-controlled, may change. Plan: ship platform-detected install instruction modal as primary path; treat `beforeinstallprompt` as a progressive enhancement when available.

---

## Quality Gate Checklist

- [x] **Versions current as of April 2026** — verified via `npm view <pkg> time --json` on 2026-04-30 for `@supabase/ssr` (0.10.2), `@supabase/supabase-js` (2.105.1), `grammy` (1.42.0), `@serwist/next` (9.5.10), `serwist` (9.5.10).
- [x] **Rationale for every addition** — each library has a "Why Recommended" cell + an ADR linking it to a v3.1 capability.
- [x] **Integration with existing DraggonnB stack** — every ADR identifies the existing files/tables it extends (`lib/payments/payfast-adhoc.ts`, `lib/agents/base-agent.ts`, `getUserOrg()`, `tenant_modules`, etc).
- [x] **Trophy OS reuse opportunities flagged** — ADR E specifies the copy-paste convention with sync version tracking, identifying exactly which files copy and which do not.
- [x] **Anti-patterns flagged** — explicit "Do NOT add" table with NextAuth, Clerk, Auth0, Lucia, custom JWT bridge, monorepo, Stripe, next-pwa, telegraf, hand-rolled SW.

---

*Stack research for: DraggonnB OS v3.1 Operational Spine — federation milestone with Trophy OS*
*Researched: 2026-04-30*
*Author: GSD project researcher*

# Phase 13 Plan 05 — SSO Architecture Spike Report

**Date:** 2026-05-03
**Resolves:** Open Questions 1, 4, 5 from 13-RESEARCH.md
**Implementer reference:** Plan 13-06 reads this and implements without re-deciding.

---

## 1. Algorithm: HS256 (locked, D1)

- **Choice:** HS256 with `SSO_BRIDGE_SECRET` env var shared between DraggonnB and Trophy Vercel projects.
- **Rotation:** Change env var on both projects simultaneously. 60s TTL means in-flight tokens drain in <1 minute.
- **ES256 deferred:** v3.2 — when `swazulu.com` cross-domain SSO requires JWKS endpoint.
- **jose API:** `SignJWT(...).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('60s').setJti(uuid).sign(key)`. Verify with `jwtVerify(token, key, { algorithms: ['HS256'], maxTokenAge: '60s' })`.

---

## 2. jti TTL: 60 seconds, single-use, DB-backed

- **TTL:** 60s — matches Atlassian Cross-Product, Auth0 cross-domain. SA cellular round-trips can be 500ms-2s.
- **Storage:** Supabase table `sso_bridge_tokens` (created in this plan's task 2).
- **Single-use enforcement:** UPDATE `consumed_at = NOW()` after first valid consume. Replay attempt: SELECT shows `consumed_at IS NOT NULL` → 401 + audit row.
- **Cleanup:** Daily cron `DELETE FROM sso_bridge_tokens WHERE expires_at < NOW() - INTERVAL '1 day'`.

---

## 3. Token delivery: URL fragment, never query string

- **Why fragment:** Fragments NEVER appear in `Referer` headers. Query strings DO. Third-party analytics on Trophy could leak the token via `<img>` or `sendBeacon`.
- **Issuer 302 Location:** `https://trophyos.co.za/sso/consume#token={jwt}` (literal `#`).
- **Issuer response header:** `Referrer-Policy: no-referrer`.
- **Consumer extraction:** Client-side `useEffect` reads `window.location.hash.slice(1)`, POSTs to `/api/sso/validate`. The validate route is server-side; the page is `'use client'`.

---

## 4. CSP headers (locked for plan 13-06 consumer route)

```
Content-Security-Policy:
  default-src 'self';
  connect-src 'self' https://psqfgzbjbgqrmjskdavs.supabase.co wss://psqfgzbjbgqrmjskdavs.supabase.co;
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  frame-ancestors 'none';
  form-action 'self';
```

`frame-ancestors 'none'` blocks iframe embedding (where JS could read fragments). `connect-src` restricts XHR/fetch to known origins (no third-party analytics can receive token).

---

## 5. Edge IP allow-listing: NOT used for v3.1

- **Reason:** Vercel does not provide stable static egress IPs for serverless functions.
- **Substitute:** Cryptographic JWT signature verification — possession of `SSO_BRIDGE_SECRET` proves caller is DraggonnB.
- **v3.2 forward-compat:** If security tightens, add `x-sso-caller-secret` header (separate short-lived HMAC). Don't add now.

---

## 6. Open Question 1 — Supabase session bridging mechanism (LOCKED HERE)

**Question:** How does Trophy create a Supabase session for the bridged user?

Options inspected:

- **(A)** `supabase.auth.admin.createSession({ userId })` — creates a fresh session via admin API.
- **(B)** Pass `access_token` + `refresh_token` from origin session in the bridge JWT payload, call `supabase.auth.setSession()` on Trophy.
- **(C)** `supabase.auth.admin.generateLink({ type: 'magiclink', email })` — creates a magic-link URL that, when consumed, establishes a session.

**Decision: Option B** — include `access_token` and `refresh_token` in the bridge JWT payload (the JWT is signed and 60s-TTL'd, mitigating exposure risk). On Trophy, the validate route returns `{ access_token, refresh_token, redirectTo }` to the client; the client calls `supabase.auth.setSession({ access_token, refresh_token })` then `router.replace(redirectTo)`.

**Rationale:**

- Both apps share the SAME Supabase project (`psqfgzbjbgqrmjskdavs`), so `auth.users.id` is identical across products. The access token issued by DraggonnB is valid on Trophy without re-issuance.
- Option A (`createSession`) — `@supabase/supabase-js@2.105.1` does NOT expose `auth.admin.createSession()` as a documented method (verified via npm package and supabase docs as of 2026-05-01). It exists in some experimental builds but is not stable. **Rejected.**
- Option C (magic link) — works but adds a network round-trip (consumer redirects to magic-link URL, then to dashboard). Also leaves the magic link consumable for hours by default. **Rejected for performance + leakage risk.**
- Option B — uses already-stable `setSession()` API. The 60s TTL on the bridge JWT ensures the access_token is delivered fresh. Trophy's `@supabase/ssr` will manage cookie persistence on its own host after `setSession()` succeeds.

**Bridge JWT payload (final shape):**

```typescript
interface BridgeTokenPayload {
  sub: string                       // auth.users.id
  draggonnb_org: DraggonnbOrgId     // origin org
  trophy_org: TrophyOrgId           // target org
  intended_product: 'draggonnb' | 'trophy'
  jti: string                       // UUID, single-use
  // Session-bridge fields:
  access_token: string              // origin session's Supabase access token
  refresh_token: string             // origin session's refresh token
  user_email: string                // for any UI that needs it on Trophy without DB call
}
```

This shape is published in `@draggonnb/federation-shared@1.0.0` (task 3 of this plan).

---

## 7. Open Question 4 — Supabase Admin API session creation in v2.105.1

Resolved by Decision in Section 6: we do NOT call `supabase.auth.admin.createSession()`. We pass tokens through the bridge JWT and call `supabase.auth.setSession()` on the consumer. No admin-side session creation needed.

---

## 8. Open Question 5 — `tenant_modules.config.trophy.linked_org_id` JSONB merge

**Decision:** In plan 13-07's `activate-trophy-module` saga step, use Postgres `jsonb_set` via a parameterised RPC (NOT the JS client's `.update({ config: ... })` which would replace the entire JSONB blob).

Implementation pattern:

```typescript
// Inside activate-trophy-module step:
await admin.rpc('set_tenant_module_config_path', {
  p_organization_id: draggonnbOrgId,
  p_module_id: 'trophy',
  p_path: ['trophy', 'linked_org_id'],
  p_value: trophyOrgId,
})
```

A small Postgres function `set_tenant_module_config_path(p_organization_id UUID, p_module_id TEXT, p_path TEXT[], p_value TEXT)` runs `UPDATE tenant_modules SET config = jsonb_set(config, p_path, to_jsonb(p_value), true) WHERE ...`. This function lands in plan 13-07's migration alongside the saga step.

Plan 13-07 will create the function. Plan 13-05 (this plan) does NOT create it — it locks the design only.

---

## 9. Trophy `orgs.type` enum values (Open Question 3 — partially resolved)

**Action for plan 13-07:** Before shipping `activate-trophy-module`, the executor must read Trophy's schema (`C:\Dev\DraggonnB\products\trophy-os\supabase\migrations\` or the live DB pg_catalog) and confirm valid `type` enum values. Default to `'lodge'` per 13-RESEARCH.md but verify before shipping.

If `'lodge'` is not a valid enum value, fall back to the most-permissive value (e.g., `'org'` or `NULL` if column is nullable) and document the deviation in plan 13-07's summary.

---

## 10. Cross-host cookie strategy (CATASTROPHIC #1 guard)

| App | Cookie domain | Set by | Forbidden |
|-----|---------------|--------|-----------|
| DraggonnB | `app.draggonnb.co.za` / `{tenant}.draggonnb.co.za` | `@supabase/ssr` (per-host default) | NEVER `Domain=.draggonnb.co.za` |
| Trophy | `trophyos.co.za` | `@supabase/ssr` (per-host default) | NEVER cross-domain |
| auth bridge | `auth.draggonnb.com` | n/a (stateless) | n/a |

Plan 13-02 already added the comment-block guard to `lib/supabase/middleware.ts`. Trophy's middleware (created in plan 13-06 alongside the consumer) must repeat the guard.

---

## 11. Federation logout (SSO-13)

**Design:** DraggonnB sign-out fires a best-effort POST to `https://trophyos.co.za/api/sso/invalidate` with `{ user_id }` in the body, signed with `SSO_BRIDGE_SECRET` (separate JWT, 30s TTL, jti tracked in same `sso_bridge_tokens` table). Trophy's invalidate route revokes the user's Trophy session by deleting the auth cookie. Plan 13-06 implements this; plan 13-07 surfaces the cross-product logout UX.

If the cross-product logout fails (network, timeout), DraggonnB still completes its own logout — the federation logout is best-effort, not blocking.

---

## 12. Sign-Off

All Phase 13 SSO architecture decisions LOCKED. Plan 13-06 implements with no remaining design questions. CATASTROPHIC #1 (cookie-scope leak) and CATASTROPHIC #2 (cross-product role mapping) guards specified for the implementer.

Decisions locked in this report:
- Section 1: HS256 algorithm (D1 confirmed)
- Section 2: 60s TTL, single-use, DB-backed (D7 confirmed)
- Section 3: Fragment delivery, Referrer-Policy no-referrer
- Section 4: CSP headers (exact values)
- Section 5: No IP allow-listing; cryptographic validation substitute
- Section 6: Option B session bridging — setSession() via access_token + refresh_token in JWT payload (Open Question 1 LOCKED)
- Section 7: No admin.createSession() needed (Open Question 4 LOCKED)
- Section 8: jsonb_set via RPC for JSONB merge (Open Question 5 LOCKED)
- Section 9: Trophy orgs.type — verify in plan 13-07 before saga ships
- Section 10: Per-host cookies, no Domain option
- Section 11: Best-effort federation logout, 30s TTL, same sso_bridge_tokens table

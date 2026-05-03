# Phase 13 — @draggonnb/federation-shared@1.0.0 Publish Record

**Date:** 2026-05-03
**Executor:** Claude (13-05 continuation agent)
**Status:** PUBLISHED AND VERIFIED

---

## Package Identity

| Field | Value |
|-------|-------|
| Package name | `@draggonnb/federation-shared` |
| Version | `1.0.0` |
| Repository | https://github.com/DRAGGONNB/federation-shared |
| Package URL | https://github.com/DRAGGONNB/federation-shared/pkgs/npm/federation-shared |
| Registry | https://npm.pkg.github.com |
| Access | restricted (private, scoped to @draggonnb) |
| Local source | `C:\Dev\federation-shared` |

---

## Tarball Details

| Field | Value |
|-------|-------|
| Filename | `draggonnb-federation-shared-1.0.0.tgz` |
| SHA | `6e5146fbf090e2ede26693bbf81cb78189baa034` |
| Integrity | `sha512-Mx4nIw7Wfa+E4YHsqa2NSg9kmAxzOCdlT0vqMycjgB/DkixPCuYP97K5jliK771D0BkPjCylPYJhd3zwx9cM9w==` |
| Package size | 2.7 kB |
| Unpacked size | 8.4 kB |
| Total files | 5 (README.md, dist/index.js, dist/index.d.ts, dist/index.d.ts.map, package.json) |

---

## Source Stats

| Field | Value |
|-------|-------|
| `src/index.ts` LOC | 138 |
| Hard cap | 200 LOC (D5 / STACK-07) |
| TypeScript target | ES2020, moduleResolution=bundler |
| jose dependency | `^5.10.0` |

---

## Exports

| Export | Kind | Purpose |
|--------|------|---------|
| `DraggonnbOrgId` | opaque brand type | Prevents mixing with TrophyOrgId at compile time |
| `TrophyOrgId` | opaque brand type | Prevents mixing with DraggonnbOrgId at compile time |
| `asDraggonnbOrgId()` | function | Cast string → DraggonnbOrgId |
| `asTrophyOrgId()` | function | Cast string → TrophyOrgId |
| `BRIDGE_TOKEN_TTL_SECONDS` | const (60) | Shared constant for TTL consistency |
| `LOGOUT_TOKEN_TTL_SECONDS` | const (30) | Shared constant for logout token TTL |
| `BridgeTokenPayload` | interface | JWT payload shape including session-bridge fields (locked in 13-SSO-SPIKE.md Section 6, Option B) |
| `signBridgeToken()` | async function | HS256 sign with 60s expiry + jti |
| `verifyBridgeToken()` | async function | HS256 verify with maxTokenAge guard |
| `LogoutTokenPayload` | interface | JWT payload for federation logout (SSO-13) |
| `signLogoutToken()` | async function | HS256 sign with 30s expiry |
| `verifyLogoutToken()` | async function | HS256 verify with maxTokenAge guard |
| `ApprovalProduct` | type | `'draggonnb' \| 'trophy'` |
| `ApprovalStatus` | type | `'pending' \| 'approved' \| 'rejected' \| 'expired'` |
| `ApprovalRequest` | interface | Cross-product approval record shape (Phase 14 consumer) |
| `BillingLineInput` | interface | Billing line emission type (D11, Phase 15 consumer) |

---

## Publish Steps

1. Source already at `C:\Dev\federation-shared` from prior executor (commit `721f928`)
2. Confirmed `.npmrc` has `//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}` + `@draggonnb:registry=https://npm.pkg.github.com`
3. Read `GITHUB_PACKAGES_TOKEN` from `C:\Dev\draggonnb-platform\.env.local`
4. Ran `GITHUB_PACKAGES_TOKEN=... npm publish` — tsc rebuild triggered via `prepublishOnly`, exited 0
5. Publish output: `+ @draggonnb/federation-shared@1.0.0`
6. Ran `git push -u origin master` — note: local branch is `master` not `main`
7. Tagged `v1.0.0` and pushed tags to GitHub
8. Verified via `npm view @draggonnb/federation-shared@1.0.0 --registry=https://npm.pkg.github.com` — manifest returned with SHA match

---

## DraggonnB Platform Install Verification

1. Ran `npm install @draggonnb/federation-shared@1.0.0 --save-exact` from `C:\Dev\draggonnb-platform`
2. `package.json` confirmed: `"@draggonnb/federation-shared": "1.0.0"` (no caret, exact pin)
3. `node_modules/@draggonnb/federation-shared/dist/` present with `index.js`, `index.d.ts`
4. `npx tsc --noEmit` exited 0 (TypeScript clean)
5. Uninstalled after verification — actual consumer wiring happens in plan 13-06

---

## CI Lint Guard

File: `scripts/ci/check-federation-pinned.mjs`

Script verifies that `@draggonnb/federation-shared` in `package.json` uses exact version (no `^`, `~`, or `>=`). Exit 0 on pass, exit 1 on fail or missing.

Added to `package.json` scripts as `"check:federation-pinned": "node scripts/ci/check-federation-pinned.mjs"`.

Output when passing:
```
OK: @draggonnb/federation-shared pinned at exact 1.0.0
```

---

## Authentication Note (Lesson Learned)

**Fine-grained PATs are rejected by GitHub Packages npm registry.**

Previous executor attempt used a fine-grained PAT with `Contents: write`, `Packages: write` permissions. GitHub Packages npm registry returned 401 despite correct scopes.

**Root cause:** GitHub Packages npm requires a **classic PAT** with `write:packages` + `repo` scopes. Fine-grained PATs cannot publish to GitHub Packages npm as of 2026-05.

**Fix applied by orchestrator/user:** Generated a new classic PAT (`ghp_eaHlF3A...`) with `write:packages`, `read:packages`, `repo` scopes. This resolved the 401.

**For next maintainer:** When publishing to GitHub Packages npm, ALWAYS use a classic PAT. Fine-grained PATs look correct in the UI but silently fail during npm publish.

---

## Vercel Env Vars

| Variable | Set On |
|----------|--------|
| `GITHUB_PACKAGES_TOKEN` | DraggonnB Vercel (Production + Preview + Development) |
| `GITHUB_PACKAGES_TOKEN` | Trophy Vercel (set by user — pending confirmation) |
| `SSO_BRIDGE_SECRET` | DraggonnB Vercel (set by user) |
| `SSO_BRIDGE_SECRET` | Trophy Vercel (set by user — pending confirmation) |

Value for `SSO_BRIDGE_SECRET`: `74056e6e2d7a99a42e1ebc9ae493f583ee01d1b9be1b67943b1574c0dece6145`

---

## Trophy Companion: Install Instructions

See `.planning/phases/13-cross-product-foundation/13-RESEARCH.md` "Trophy OS Companion Upgrade" section for exact install + Vercel env var steps Trophy session must follow.

---

## References

- Architecture decisions: `.planning/phases/13-cross-product-foundation/13-SSO-SPIKE.md`
- Research: `.planning/phases/13-cross-product-foundation/13-RESEARCH.md` Section 4
- REQ-ID: STACK-07 (closed), SSO-12 (closed)
- Pitfall reference: Pitfall 5 (version drift) in `.planning/research/PITFALLS.md`

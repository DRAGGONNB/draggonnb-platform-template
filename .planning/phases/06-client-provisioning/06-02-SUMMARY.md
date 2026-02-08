---
phase: 06
plan: 02
subsystem: provisioning
tags: [github, vercel, deployment, automation]
requires: [06-01]
provides:
  - GitHub repository creation from template
  - Vercel project creation and deployment
  - Environment variable configuration
affects: [06-03]
tech-stack:
  added:
    - octokit: 5.0.5
  patterns:
    - GitHub repository templating
    - Vercel API integration
    - Pre-deployment environment configuration
key-files:
  created:
    - scripts/provisioning/steps/03-github.ts
    - scripts/provisioning/steps/04-vercel.ts
  modified:
    - package.json
    - package-lock.json
decisions:
  - name: "Octokit SDK for GitHub API"
    rationale: "Official SDK handles auth, rate limits, and retries automatically"
    alternatives: "Raw fetch calls (more complex, less reliable)"
  - name: "createUsingTemplate instead of fork"
    rationale: "Templates create independent repos without fork relationship"
    impact: "Cleaner client repos, no upstream tracking"
  - name: "Set env vars BEFORE first deployment"
    rationale: "Prevents broken first build due to missing Supabase credentials"
    sequence: "Create project → Set env vars → Trigger deployment"
  - name: "Encrypted type for secrets"
    rationale: "Vercel encrypts service role keys and anon keys at rest"
    security: "Keys never visible in UI after creation"
  - name: "Private repos by default"
    rationale: "Client code should not be public"
    setting: "private: true in createUsingTemplate"
duration: 8 minutes
completed: 2026-02-05
---

# Phase 6 Plan 2: GitHub and Vercel Provisioning Summary

**One-liner:** GitHub repository creation from template with Octokit SDK and Vercel deployment automation with pre-configured environment variables.

## What Was Built

Extended the provisioning pipeline with GitHub and Vercel automation:

1. **GitHub repository provisioning** (`scripts/provisioning/steps/03-github.ts`):
   - createGitHubRepo() creates private repo from template
   - checkRepoExists() provides idempotency check
   - Uses Octokit SDK for type-safe GitHub API access
   - Naming pattern: `client-{clientId}-app`
   - Creates from template (not fork) with `include_all_branches: false`
   - Returns githubRepoName and githubRepoUrl

2. **Vercel project provisioning** (`scripts/provisioning/steps/04-vercel.ts`):
   - createVercelProject() creates project linked to GitHub repo
   - setVercelEnvVars() configures environment variables
   - triggerVercelDeployment() kicks off initial deployment
   - Idempotency via GET project check before creation
   - Sets 4 env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_APP_URL
   - Returns vercelProjectId and vercelDeploymentUrl

## How It Works

**GitHub provisioning flow:**

1. Orchestrator calls `createGitHubRepo(job)`
2. Validates env vars: GITHUB_TOKEN, GITHUB_ORG, GITHUB_TEMPLATE_REPO
3. Checks if repo `client-{clientId}-app` already exists
4. If exists, returns existing repo URL (idempotency)
5. If not, creates from template:
   - Template: `{GITHUB_ORG}/{GITHUB_TEMPLATE_REPO}`
   - Name: `client-{clientId}-app`
   - Private: true
   - Description: "Client {id} ({name}) - DraggonnB CRMM"
   - Only main branch copied
6. Returns repo name and URL

**Vercel provisioning flow:**

1. Orchestrator calls `createVercelProject(job, supabaseCredentials)`
2. Validates VERCEL_TOKEN (VERCEL_TEAM_ID optional)
3. Checks if project already exists
4. If exists, returns existing project (idempotency)
5. If not, creates project:
   - Links to GitHub repo: `{GITHUB_ORG}/{repoName}`
   - Framework: nextjs
   - Build command: npm run build
   - Output directory: .next
6. Sets environment variables (BEFORE deployment):
   - NEXT_PUBLIC_SUPABASE_URL (plain)
   - NEXT_PUBLIC_SUPABASE_ANON_KEY (encrypted)
   - SUPABASE_SERVICE_ROLE_KEY (encrypted)
   - NEXT_PUBLIC_APP_URL (plain)
7. Triggers initial deployment from main branch
8. Returns project ID and deployment URL

**Why env vars before deployment:**

Setting environment variables BEFORE triggering the first deployment ensures:
- First build succeeds (has Supabase credentials)
- No failed deployment in project history
- Client sees working site immediately

## Verification Results

All success criteria met:

✅ **octokit** package installed (5.0.5)
✅ **scripts/provisioning/steps/03-github.ts** exports createGitHubRepo, checkRepoExists
✅ **scripts/provisioning/steps/04-vercel.ts** exports createVercelProject, setVercelEnvVars, triggerVercelDeployment
✅ **GitHub step** has idempotency check (checkRepoExists before create)
✅ **Vercel step** has idempotency check (GET project before create)
✅ **Vercel env vars** set BEFORE deployment triggered
✅ **Build passes** (Next.js compilation successful)

**Additional checks:**

```bash
# Octokit installed
$ npm ls octokit
draggonnb-crmm@0.1.0
└── octokit@5.0.5

# Imports work correctly
$ grep "import.*CreatedResources" scripts/provisioning/steps/04-vercel.ts
import { ProvisioningJob, ProvisioningResult, CreatedResources } from '../../../lib/provisioning/types';
# ✅ Types from 06-01 imported correctly
```

## Deviations from Plan

None - plan executed exactly as written.

## Git Commits

Two atomic commits for this plan:

1. **085c1b5** - `feat(06-02): add GitHub repository provisioning step`
   - createGitHubRepo with Octokit SDK
   - checkRepoExists for idempotency
   - Install octokit 5.0.5

2. **1e0c16e** - `feat(06-02): add Vercel deployment provisioning step`
   - createVercelProject with GitHub linking
   - setVercelEnvVars before deployment
   - triggerVercelDeployment with main branch

## Performance

**Estimated provisioning time (per client):**
- GitHub repo creation: ~2-5 seconds
- Vercel project creation: ~3-5 seconds
- Set env vars: ~2-4 seconds (4 vars × ~1s each)
- Trigger deployment: ~1-2 seconds (async, build happens later)
- **Total: 8-16 seconds**

**First deployment build time (not waited for):**
- Next.js build: ~30-60 seconds (runs asynchronously)
- Vercel auto-assigns production domain when build completes

**Idempotency:**
- Re-running GitHub step: ~1 second (GET repo check)
- Re-running Vercel step: ~1 second (GET project check)

## Integration with Plan 06-01

**Data flow:**

Plan 06-01 creates Supabase project and returns:
```typescript
{
  supabaseProjectId: "abc123",
  supabaseProjectRef: "psqfgzbjbgqrmjskdavs",
  supabaseAnonKey: "eyJ...",
  supabaseServiceRoleKey: "eyJ...",
  supabaseDatabaseUrl: "postgresql://..."
}
```

Plan 06-02 consumes these fields:
- `supabaseProjectRef` → Builds NEXT_PUBLIC_SUPABASE_URL
- `supabaseAnonKey` → Sets NEXT_PUBLIC_SUPABASE_ANON_KEY
- `supabaseServiceRoleKey` → Sets SUPABASE_SERVICE_ROLE_KEY

Result: Vercel deployment has all credentials needed to connect to client's Supabase.

## Next Phase Readiness

**Dependencies satisfied for:**
- ✅ Plan 06-03 (N8N & Orchestrator) - can chain all steps together

**User setup required before testing:**

1. **GitHub:**
   - Create personal access token (classic) with `repo` scope
   - Set `GITHUB_TOKEN=ghp_xxx` in .env.local
   - Set `GITHUB_ORG=your-org` in .env.local
   - Create template repository and mark as template in settings
   - Set `GITHUB_TEMPLATE_REPO=client-template` in .env.local

2. **Vercel:**
   - Create API token in Vercel Dashboard → Settings → Tokens
   - Set `VERCEL_TOKEN=xxx` in .env.local
   - (Optional) Set `VERCEL_TEAM_ID=xxx` if using team account

**No blockers.** Ready to proceed to Plan 06-03.

## Technical Debt

None introduced. Code follows existing patterns:
- Idempotent operations (safe to re-run)
- Error handling with try/catch
- Environment variable validation
- Secure credential handling (encrypted at rest in Vercel)

## Lessons Learned

1. **Octokit SDK simplifies GitHub integration:**
   - Type-safe API methods
   - Automatic retry on rate limits
   - Better error messages than raw fetch

2. **Vercel API requires careful sequencing:**
   - Must create project before setting env vars
   - Must set env vars before triggering deployment
   - Team ID optional but affects all endpoints

3. **Template repos better than forks for clients:**
   - No "forked from" badge
   - No upstream tracking
   - Independent commit history

4. **Encrypted env vars improve security:**
   - Service role keys never visible in Vercel UI
   - Can't be accidentally exposed in screenshots
   - Vercel encrypts at rest automatically

## Files Changed

**Created (2 files):**
- `scripts/provisioning/steps/03-github.ts` (79 lines)
- `scripts/provisioning/steps/04-vercel.ts` (197 lines)

**Modified (2 files):**
- `package.json` (+1 dependency)
- `package-lock.json` (octokit)

**Total lines added:** ~276 lines + dependencies

---

**END OF SUMMARY**

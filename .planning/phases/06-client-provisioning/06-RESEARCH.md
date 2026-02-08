# Phase 6: Client Provisioning - Research

**Researched:** 2026-02-05
**Domain:** Multi-service SaaS provisioning automation
**Confidence:** MEDIUM

## Summary

Client provisioning automation requires orchestrating five separate services (Supabase, GitHub, Vercel, N8N, internal database) with proper error handling, idempotency, and rollback capabilities. Each service has its own REST API with different authentication methods, rate limits, and failure modes.

The standard approach is to use a durable workflow orchestrator (not a simple script) that tracks state across API calls, handles retries with exponential backoff, and implements compensating transactions (saga pattern) for rollback when provisioning fails mid-flow.

**Critical security concern:** The Moltbook breach (Jan 2026) exposed 1.5M API keys through improperly configured Supabase RLS - this project's architecture (separate Supabase per client) means provisioning scripts will create projects that MUST have RLS enabled immediately, not as a post-deployment step.

**Primary recommendation:** Use BullMQ for job orchestration with Redis-backed durable state, implement saga pattern for rollback, never store API tokens in code or databases (use env vars only), and make all provisioning steps idempotent with "check-then-create" logic.

## Standard Stack

The established libraries/tools for multi-service provisioning orchestration:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| BullMQ | 5.x | Job queue with retries | Redis-backed durable state, TypeScript native, production-tested at scale |
| Octokit | 20.x | GitHub API client | Official GitHub SDK, full TypeScript types, handles auth |
| pg | 8.x | PostgreSQL client | Direct SQL execution for schema cloning, already in devDependencies |
| exponential-backoff | 3.x | Retry logic | Handles API rate limits gracefully with jitter |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | 3.x | Request validation | Already in project, use for validating API responses |
| dotenv | 16.x | Environment variables | Already in project, load secrets at runtime |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BullMQ | Temporal.io | Temporal has stronger workflow features but requires separate server infrastructure (added complexity for 1 feature) |
| Octokit | Raw fetch | Octokit handles auth, rate limits, retries automatically - don't hand-roll |
| Direct API calls | Terraform/Pulumi | IaC tools excellent for declarative infra but poor for imperative multi-step workflows with conditional logic |

**Installation:**
```bash
npm install bullmq ioredis octokit exponential-backoff
npm install --save-dev @types/ioredis
```

## Architecture Patterns

### Recommended Project Structure
```
scripts/
├── provisioning/
│   ├── orchestrator.ts      # BullMQ job definitions
│   ├── steps/
│   │   ├── 01-supabase.ts   # Create Supabase project
│   │   ├── 02-database.ts   # Clone schema from template
│   │   ├── 03-github.ts     # Create repo from template
│   │   ├── 04-vercel.ts     # Deploy to Vercel
│   │   ├── 05-n8n.ts        # Configure N8N webhooks
│   │   └── 06-finalize.ts   # Update internal DB
│   ├── rollback/
│   │   └── cleanup.ts       # Compensating transactions
│   ├── template/
│   │   └── schema.sql       # Template database schema
│   └── config.ts            # API clients and auth
```

### Pattern 1: Durable Workflow with Saga Rollback
**What:** Each provisioning step is a BullMQ job that checks for existing state before creating, stores created resource IDs, and has a compensating rollback action.

**When to use:** Always for multi-service provisioning where partial failures leave orphaned resources.

**Example:**
```typescript
// Source: BullMQ patterns + saga pattern research
import { Queue, Worker } from 'bullmq';
import { backOff } from 'exponential-backoff';

interface ProvisioningJob {
  clientId: string;
  clientName: string;
  orgEmail: string;
  tier: 'starter' | 'professional' | 'enterprise';
  // Track what's been created for rollback
  createdResources?: {
    supabaseProjectId?: string;
    githubRepoName?: string;
    vercelProjectId?: string;
  };
}

const provisioningQueue = new Queue<ProvisioningJob>('client-provisioning', {
  connection: { host: 'localhost', port: 6379 }
});

// Step 1: Supabase Project Creation (idempotent)
const supabaseWorker = new Worker<ProvisioningJob>(
  'client-provisioning',
  async (job) => {
    const { clientId, clientName, createdResources } = job.data;

    // Idempotency check - skip if already created
    if (createdResources?.supabaseProjectId) {
      console.log('Supabase project already exists, skipping');
      return { supabaseProjectId: createdResources.supabaseProjectId };
    }

    // Create with retry + exponential backoff
    const projectId = await backOff(
      async () => {
        const response = await fetch('https://api.supabase.com/v1/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `${clientName}-prod`,
            organization_id: process.env.SUPABASE_ORG_ID,
            region: 'af-south-1', // South Africa
            db_pass: generateSecurePassword()
          })
        });

        if (response.status === 429) {
          throw new Error('Rate limited'); // Triggers backoff retry
        }
        if (!response.ok) {
          throw new Error(`Supabase API error: ${response.statusText}`);
        }

        return response.json();
      },
      {
        numOfAttempts: 5,
        startingDelay: 1000,
        timeMultiple: 2,
        jitter: 'full' // Prevent thundering herd
      }
    );

    // Store created resource for potential rollback
    await job.updateData({
      ...job.data,
      createdResources: {
        ...createdResources,
        supabaseProjectId: projectId
      }
    });

    return { supabaseProjectId: projectId };
  },
  { connection: { host: 'localhost', port: 6379 } }
);
```

### Pattern 2: Check-Then-Create Idempotency
**What:** Before creating any resource, check if it already exists using a deterministic identifier (client ID, org name).

**When to use:** Every provisioning step to enable safe retries.

**Example:**
```typescript
// Source: Idempotency best practices research
async function createGitHubRepo(clientId: string, templateOwner: string, templateRepo: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
  const repoName = `client-${clientId}-app`;

  // CHECK: Does repo already exist?
  try {
    await octokit.rest.repos.get({
      owner: process.env.GITHUB_ORG,
      repo: repoName
    });
    console.log(`Repository ${repoName} already exists, skipping creation`);
    return { repoName, skipped: true };
  } catch (error) {
    if (error.status !== 404) throw error;
    // 404 = doesn't exist, proceed to create
  }

  // CREATE: Generate from template
  const { data } = await octokit.rest.repos.createUsingTemplate({
    template_owner: templateOwner,
    template_repo: templateRepo,
    owner: process.env.GITHUB_ORG,
    name: repoName,
    private: true,
    description: `Client ${clientId} production application`
  });

  return { repoName: data.name, repoUrl: data.clone_url, skipped: false };
}
```

### Pattern 3: Saga Compensating Transactions
**What:** If any step fails after step N, execute rollback functions for steps N, N-1, ..., 1 in reverse order.

**When to use:** When partial provisioning creates billable resources or leaves orphaned state.

**Example:**
```typescript
// Source: Saga pattern research + orchestration best practices
const rollbackActions = {
  supabase: async (projectId: string) => {
    console.log(`Rolling back: Deleting Supabase project ${projectId}`);
    await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}` }
    });
  },

  github: async (repoName: string) => {
    console.log(`Rolling back: Deleting GitHub repo ${repoName}`);
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    await octokit.rest.repos.delete({
      owner: process.env.GITHUB_ORG,
      repo: repoName
    });
  },

  vercel: async (projectId: string) => {
    console.log(`Rolling back: Deleting Vercel project ${projectId}`);
    await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${process.env.VERCEL_TOKEN}` }
    });
  }
};

// Execute rollback in reverse order
async function rollbackProvisioning(createdResources: any) {
  const { vercelProjectId, githubRepoName, supabaseProjectId } = createdResources;

  // Reverse order: Vercel -> GitHub -> Supabase
  if (vercelProjectId) {
    await rollbackActions.vercel(vercelProjectId).catch(console.error);
  }
  if (githubRepoName) {
    await rollbackActions.github(githubRepoName).catch(console.error);
  }
  if (supabaseProjectId) {
    await rollbackActions.supabase(supabaseProjectId).catch(console.error);
  }
}
```

### Anti-Patterns to Avoid
- **Sequential script without state tracking:** If script crashes mid-execution, impossible to resume or rollback - you have orphaned resources and no record of what was created.
- **Storing API tokens in database:** Moltbook breach showed this is catastrophic - use environment variables only, never persist tokens.
- **Creating Supabase project without immediate RLS:** The "we'll enable RLS later" approach creates a window where anon key = admin access.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| API retry logic | Custom setTimeout loops | exponential-backoff library | Handles jitter, max attempts, backoff strategies - easy to get wrong (thundering herd, infinite retries) |
| Database schema cloning | String manipulation of SQL | pg_dump \| psql pipeline | PostgreSQL's native tools handle dependencies, triggers, sequences - string replacement misses edge cases |
| GitHub repo creation | Raw fetch to REST API | Octokit SDK | Handles auth token refresh, rate limit headers, pagination - GitHub API is complex |
| Job queue with retries | Custom database table | BullMQ | Job persistence, distributed workers, job priorities, delayed jobs, event listeners - 5000+ hours of edge case handling |

**Key insight:** Multi-service orchestration has dozens of failure modes (timeouts, rate limits, partial success, network splits). Production-tested libraries have already handled these - your custom code hasn't.

## Common Pitfalls

### Pitfall 1: RLS Not Enabled on Supabase Project Creation
**What goes wrong:** Newly created Supabase projects default to RLS disabled. If you store the anon key before enabling RLS, there's a window where the anon key grants full database access. The Moltbook breach (Jan 2026) exposed 1.5M API keys this way - Supabase anon key in client-side code + no RLS = catastrophic leak.

**Why it happens:** Supabase Management API creates project with RLS off by default. Devs assume it's enabled or plan to "do it later."

**How to avoid:** Immediately after project creation, execute RLS enable + policy creation as part of the same provisioning step. Don't return success until RLS is verified enabled.

**Warning signs:** Provisioning script that returns Supabase credentials before running schema setup / RLS script.

### Pitfall 2: No Idempotency - Re-running Creates Duplicates
**What goes wrong:** Provisioning script fails at step 4 of 6. Re-running creates duplicate Supabase projects, GitHub repos, Vercel deployments. Now you have orphaned resources billing you monthly + unclear which is the "real" one.

**Why it happens:** Scripts use `CREATE` without checking `IF EXISTS`. No state tracking between steps.

**How to avoid:** Every step checks for existing resource using deterministic naming (client-{id}-app) before creating. Use idempotency keys where APIs support them (Stripe-style).

**Warning signs:** Script starts with API calls, not with checks. No `try { get(resource) } catch (404) { create(resource) }` pattern.

### Pitfall 3: API Rate Limits Not Handled - Script Crashes
**What goes wrong:** Creating 10 clients in parallel hits Supabase Management API rate limit (30 requests/minute). Script crashes with 429 errors. Some clients half-provisioned, some not started.

**Why it happens:** Management APIs have aggressive rate limits. Naive retry logic amplifies problem (immediate retry on 429 = more rate limit hits).

**How to avoid:** Use exponential backoff with jitter. Respect `Retry-After` headers. Queue provisioning jobs (BullMQ) instead of parallel execution.

**Warning signs:** Provisioning triggered from webhook handler directly (no queue), no retry logic, no rate limit detection.

### Pitfall 4: Secrets Leaked in Error Messages or Logs
**What goes wrong:** Provisioning script logs full API response including database passwords, API tokens. Logs shipped to external service (Datadog, Sentry). Now credentials are in third-party systems.

**Why it happens:** Debug logging during development stays in production. Error messages include full request/response bodies.

**How to avoid:** Redact secrets in logs. Never log full API responses. Use structured logging with explicit field allow-lists, not deny-lists.

**Warning signs:** `console.log(response)` in production code. Stack traces in user-facing error messages.

### Pitfall 5: Schema Template Drift - New Clients Get Old Schema
**What goes wrong:** You update the template app's database schema (add `users.phone` column). Provisioning script still uses old `schema.sql` dump from 3 months ago. New clients get outdated schema, can't use new features.

**Why it happens:** Schema template is a static file, not auto-generated from current production template.

**How to avoid:** Generate schema template dynamically: `pg_dump --schema-only template_project > template/schema.sql` as part of provisioning script. Or version schema templates and track which clients have which version.

**Warning signs:** Static SQL file in repo. No process for updating template when production schema changes.

### Pitfall 6: Vercel Environment Variables Not Set - Deployment Succeeds but App Broken
**What goes wrong:** GitHub repo created, Vercel deployment succeeds, but app crashes on first request because `NEXT_PUBLIC_SUPABASE_URL` not set. Client's app is "deployed" but unusable.

**Why it happens:** Vercel deployment API doesn't fail if env vars missing - it deploys successfully, app crashes at runtime.

**How to avoid:** Set Vercel environment variables BEFORE triggering deployment. Verify required env vars present using Vercel API `GET /v9/projects/{id}/env`.

**Warning signs:** Provisioning script deploys without setting env vars. No verification step after deployment.

## Code Examples

Verified patterns from official sources:

### Supabase Management API - Create Project
```typescript
// Source: https://supabase.com/docs/reference/api/v1-create-a-project
async function createSupabaseProject(orgId: string, clientName: string) {
  const response = await fetch('https://api.supabase.com/v1/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: `${clientName}-prod`,
      organization_id: orgId,
      region: 'af-south-1', // South Africa - closest to clients
      db_pass: generateSecurePassword(),
      plan: 'pro' // Start on Pro for RLS + better limits
    })
  });

  if (!response.ok) {
    throw new Error(`Supabase API error: ${response.status} ${response.statusText}`);
  }

  const project = await response.json();

  // CRITICAL: Wait for project to be ready before returning
  // Project creation is async - API returns immediately but DB not ready
  await waitForProjectReady(project.id);

  return {
    projectId: project.id,
    databaseUrl: project.database.host,
    anonKey: project.anon_key,
    serviceRoleKey: project.service_role_key
  };
}

// Projects take 30-120 seconds to provision
async function waitForProjectReady(projectId: string, maxWaitSeconds = 180) {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitSeconds * 1000) {
    const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
      headers: { 'Authorization': `Bearer ${process.env.SUPABASE_MANAGEMENT_TOKEN}` }
    });

    const project = await response.json();

    if (project.status === 'ACTIVE_HEALTHY') {
      return true;
    }

    await new Promise(resolve => setTimeout(resolve, 10000)); // Check every 10s
  }

  throw new Error(`Project ${projectId} not ready after ${maxWaitSeconds}s`);
}
```

### GitHub API - Create Repo from Template
```typescript
// Source: https://docs.github.com/en/rest/repos/repos#create-a-repository-using-a-template
import { Octokit } from 'octokit';

async function createRepoFromTemplate(clientId: string) {
  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  const { data: repo } = await octokit.rest.repos.createUsingTemplate({
    template_owner: process.env.GITHUB_ORG || 'draggonnb',
    template_repo: 'client-template', // Your template repo name
    owner: process.env.GITHUB_ORG || 'draggonnb',
    name: `client-${clientId}-app`,
    private: true,
    description: `Client ${clientId} production application`,
    include_all_branches: false // Only copy main branch
  });

  return {
    repoName: repo.name,
    repoUrl: repo.html_url,
    cloneUrl: repo.clone_url
  };
}
```

### Vercel API - Create Project and Deploy
```typescript
// Source: https://vercel.com/docs/rest-api
async function createVercelProject(githubRepo: string, envVars: Record<string, string>) {
  const vercelToken = process.env.VERCEL_TOKEN;

  // Step 1: Create project
  const projectResponse = await fetch('https://api.vercel.com/v9/projects', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: githubRepo,
      gitRepository: {
        repo: `${process.env.GITHUB_ORG}/${githubRepo}`,
        type: 'github'
      },
      framework: 'nextjs',
      buildCommand: 'npm run build',
      outputDirectory: '.next'
    })
  });

  const project = await projectResponse.json();

  // Step 2: Set environment variables BEFORE first deployment
  for (const [key, value] of Object.entries(envVars)) {
    await fetch(`https://api.vercel.com/v10/projects/${project.id}/env`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key,
        value,
        type: 'encrypted',
        target: ['production', 'preview']
      })
    });
  }

  // Step 3: Trigger deployment
  const deployResponse = await fetch('https://api.vercel.com/v13/deployments', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${vercelToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: project.name,
      gitSource: {
        type: 'github',
        repo: `${process.env.GITHUB_ORG}/${githubRepo}`,
        ref: 'main'
      }
    })
  });

  const deployment = await deployResponse.json();

  return {
    projectId: project.id,
    deploymentUrl: deployment.url,
    deploymentId: deployment.id
  };
}
```

### PostgreSQL Schema Clone from Template
```typescript
// Source: https://www.postgresql.org/docs/current/app-pgdump.html
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function cloneSchemaFromTemplate(
  templateDbUrl: string,
  targetDbUrl: string
) {
  // Dump template schema (structure only, no data)
  const dumpCommand = `pg_dump "${templateDbUrl}" --schema-only --no-owner --no-acl`;
  const { stdout: schema } = await execAsync(dumpCommand);

  // Apply to target database
  const restoreCommand = `psql "${targetDbUrl}"`;
  await execAsync(restoreCommand, { input: schema });

  // Enable RLS on all tables immediately
  const rlsScript = `
    DO $$
    DECLARE
      tbl record;
    BEGIN
      FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl.tablename);
      END LOOP;
    END $$;
  `;

  await execAsync(`psql "${targetDbUrl}" -c "${rlsScript}"`);

  console.log('Schema cloned and RLS enabled on all tables');
}
```

### N8N Webhook Configuration
```typescript
// Source: https://docs.n8n.io/api/
async function configureN8NWebhooks(clientId: string, webhookBaseUrl: string) {
  const n8nApiKey = process.env.N8N_API_KEY;
  const n8nHost = process.env.N8N_HOST; // e.g., n8n.srv1114684.hstgr.cloud

  // Create workflow with client-specific webhook paths
  const workflow = {
    name: `Client ${clientId} - Social Media Automation`,
    nodes: [
      {
        name: 'Webhook',
        type: 'n8n-nodes-base.webhook',
        position: [250, 300],
        parameters: {
          path: `client-${clientId}/post-created`,
          httpMethod: 'POST',
          authentication: 'headerAuth'
        }
      }
      // Additional nodes...
    ],
    connections: {},
    settings: {
      executionOrder: 'v1'
    }
  };

  const response = await fetch(`https://${n8nHost}/api/v1/workflows`, {
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': n8nApiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(workflow)
  });

  const createdWorkflow = await response.json();

  // Activate workflow
  await fetch(`https://${n8nHost}/api/v1/workflows/${createdWorkflow.id}/activate`, {
    method: 'POST',
    headers: { 'X-N8N-API-KEY': n8nApiKey }
  });

  return {
    workflowId: createdWorkflow.id,
    webhookUrl: `${webhookBaseUrl}/client-${clientId}/post-created`
  };
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bash scripts with curl | TypeScript + REST API SDKs | 2020-2022 | Type safety, better error handling, IDE support |
| Manual provisioning via UI | Full API automation | 2022-2024 | Scalable to 100s of clients, sub-hour provisioning |
| Simple scripts | Durable workflow engines (Temporal, BullMQ) | 2023-2025 | Reliable retry, rollback, state tracking |
| Terraform for everything | Terraform for infra, custom code for workflows | 2024-2026 | Terraform great for declarative infra, poor for imperative multi-step workflows with conditional logic |

**Deprecated/outdated:**
- **Heroku for client hosting:** Heroku shut down free tier (2022), Vercel became standard for Next.js SaaS apps
- **Manual RLS setup after deployment:** Moltbook breach (Jan 2026) proved this is catastrophic - RLS must be enabled atomically with project creation
- **Synchronous provisioning from webhook:** Modern approach uses job queues to handle rate limits + retries

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Management API rate limits for burst provisioning**
   - What we know: Management API has rate limits, not well documented
   - What's unclear: Can we provision 10 clients simultaneously or will we hit limits?
   - Recommendation: Start with sequential provisioning (queue), measure actual rate limits in dev, then optimize

2. **Supabase project creation time variability**
   - What we know: Projects take 30-120 seconds to become ACTIVE_HEALTHY
   - What's unclear: Is this consistent? Are there regional differences? Does paid plan provision faster?
   - Recommendation: Implement timeout with generous buffer (180s), log actual provision times to identify patterns

3. **GitHub template repo updates - how to push updates to existing clients**
   - What we know: Template repo will evolve (bug fixes, new features)
   - What's unclear: How to propagate updates to 100+ client repos without manual intervention?
   - Recommendation: Phase 6 focuses on initial provisioning, defer "update all clients" to future phase - likely need GitHub Actions + PR automation

4. **N8N workflow template versioning**
   - What we know: N8N workflows can be exported/imported as JSON
   - What's unclear: Best practice for versioning workflow templates and updating client instances
   - Recommendation: Store workflow JSON in repo, version with semantic versions, manual update process for Phase 6

5. **Rollback of paid resources - refund handling**
   - What we know: Supabase/Vercel bill immediately on project creation
   - What's unclear: If provisioning fails and we delete projects, do we get refunds? Need manual support ticket?
   - Recommendation: Mark in internal DB when rollback occurs, manual monthly audit for refunds

## Sources

### Primary (HIGH confidence)
- [Supabase Management API Reference](https://supabase.com/docs/reference/api/introduction) - Authentication and project creation
- [Supabase Create Project API](https://supabase.com/docs/reference/api/v1-create-a-project) - Complete endpoint specification
- [GitHub REST API - Create from Template](https://docs.github.com/en/rest/repos/repos) - Official API documentation
- [Vercel REST API Documentation](https://vercel.com/docs/rest-api) - Project creation and deployment
- [N8N Public REST API](https://docs.n8n.io/api/) - Workflow management API
- [PostgreSQL pg_dump Documentation](https://www.postgresql.org/docs/current/app-pgdump.html) - Schema cloning
- [Supabase Rate Limits](https://supabase.com/docs/guides/auth/rate-limits) - API rate limiting details

### Secondary (MEDIUM confidence)
- [Supabase for Platforms](https://supabase.com/docs/guides/integrations/supabase-for-platforms) - Multi-tenant patterns (WebSearch verified with official docs)
- [GitHub API Create Repository Using Template](https://tryapis.com/github/api/repos-create-using-template/) - Usage examples
- [Vercel Deploy Files Documentation](https://vercel.com/platforms/docs/platform-elements/actions/deploy-files) - Programmatic deployment
- [BullMQ Official Documentation](https://docs.bullmq.io/) - Job queue patterns
- [Temporal Blog - Node.js Task Queue](https://temporal.io/blog/using-temporal-as-a-node-task-queue) - Workflow orchestration comparison
- [Error Handling in Distributed Systems - Temporal](https://temporal.io/blog/error-handling-in-distributed-systems) - Saga pattern and retry logic
- [Mastering SaaS DevOps - Romexsoft](https://www.romexsoft.com/blog/mastering-saas-devops-how-to-automate-multi-tenant-deployments/) - Multi-tenant automation patterns

### Tertiary (LOW confidence - flagged for validation)
- [Moltbook Security Breach - Wiz Blog](https://www.wiz.io/blog/exposed-moltbook-database-reveals-millions-of-api-keys) - Jan 2026 incident report (WebSearch only, validated by multiple sources)
- [Exponential Backoff - npm package](https://www.npmjs.com/package/exponential-backoff) - Implementation library (WebSearch, should verify in Context7 if needed)
- [Octokit GitHub SDK](https://github.com/octokit/octokit.js) - Official SDK (WebSearch, well-established project)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries are production-tested, widely adopted, with TypeScript support
- Architecture: MEDIUM - Patterns are well-documented but specific API behaviors (rate limits, provision times) need runtime validation
- Pitfalls: HIGH - Moltbook breach is well-documented, idempotency and rollback patterns are established best practices

**Research date:** 2026-02-05
**Valid until:** 2026-03-05 (30 days) - APIs stable, but rate limits and quotas may change with notice

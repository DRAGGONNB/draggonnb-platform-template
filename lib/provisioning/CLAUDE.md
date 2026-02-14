# Provisioning Build Spec

## Architecture

- **Orchestrator** (`scripts/provisioning/orchestrator.ts`): Runs provisioning steps sequentially, calls rollback on failure
- **Steps** (`scripts/provisioning/steps/`): Individual provisioning operations (01-supabase, 02-database, 03-github, 04-vercel, 05-n8n)
- **Rollback** (`scripts/provisioning/rollback.ts`): Saga-pattern rollback, deletes created resources in reverse order
- **Types** (`lib/provisioning/types.ts`): `ProvisioningJob`, `CreatedResources`, `ProvisioningResult`, `ProvisioningStep`
- **Config** (`lib/provisioning/config.ts`): Env var validation via `validateProvisioningEnv()`

## Adding a New Provisioning Step

1. Add step name to `ProvisioningStep` type in `lib/provisioning/types.ts`
2. Add any new resource fields to `CreatedResources` interface
3. Create step file in `scripts/provisioning/steps/` (e.g., `06-your-step.ts`)
4. Step must return `ProvisioningResult { success, step, data?, error? }`
5. Add rollback logic to `scripts/provisioning/rollback.ts`
6. Wire into `scripts/provisioning/orchestrator.ts` in the correct sequence
7. Add required env vars to `validateProvisioningEnv()` in `lib/provisioning/config.ts`

## Step Pattern

```typescript
import { ProvisioningJob, ProvisioningResult } from '../../lib/provisioning/types'

export async function yourStep(job: ProvisioningJob): Promise<ProvisioningResult> {
  try {
    // Create the resource
    const resource = await createSomething(job.clientName)
    return {
      success: true,
      step: 'your-step-name',
      data: { yourResourceId: resource.id }
    }
  } catch (error) {
    return {
      success: false,
      step: 'your-step-name',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
```

## Rollback Pattern

Rollback runs in reverse order of creation. Each rollback action is independent and logs failures without throwing. Add new rollback actions to `rollbackActions` object and call them from `rollbackProvisioning()`.

## Client Config

Module manifest template: `scripts/provisioning/template/client-config.json`. This determines which modules (CRM, email, social, content, accommodation) are enabled for a client. Provisioning reads this to configure the client's deployment.

## Backup Strategy

- **Supabase**: PITR (point-in-time recovery) per project
- **Code**: GitHub template repo is source of truth; client repos forked from it
- **Workflows**: N8N workflow JSON exported to Gitea `ops-hub/client-backups/{client_id}/` repo after creation
- **Deployments**: Vercel immutable deployments (rollback via Vercel dashboard)

## Required Environment Variables

- `SUPABASE_MANAGEMENT_TOKEN` -- Supabase Management API token
- `SUPABASE_ORG_ID` -- Supabase organization ID
- `GITHUB_TOKEN` -- GitHub PAT with repo creation permissions
- `GITHUB_ORG` -- GitHub organization name
- `VERCEL_TOKEN` -- Vercel API token
- `VERCEL_TEAM_ID` -- Vercel team ID
- `N8N_API_KEY` -- N8N API key
- `N8N_HOST` -- N8N host (default: n8n.srv1114684.hstgr.cloud)

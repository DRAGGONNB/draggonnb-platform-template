import { ProvisioningJob, CreatedResources } from '../../lib/provisioning/types';
import { validateProvisioningEnv } from '../../lib/provisioning/config';
import { ClientModules, ClientBranding, ClientIntegrations, ClientDeployment, generateClientConfig, validateClientConfig, Tier } from '../../lib/provisioning/client-config';
import { createOrganization } from './steps/01-create-org';
import { createN8NWorkflow } from './steps/05-n8n';
import { deployAutomations } from './steps/06-automations';
import { sendOnboardingSequence } from './steps/07-onboarding';
import { runQAChecks } from './steps/08-qa-check';
import { step10ScheduleFollowups } from './steps/10-schedule-followups';
import { rollback } from './rollback';

export interface ProvisioningOrchestrator {
  job: ProvisioningJob;
  createdResources: CreatedResources;
}

/**
 * Provision a new client in the shared database.
 *
 * Phase 10 changes (ONBOARD-07, ONBOARD-08):
 * - Steps 1-4 failures return errors directly (org doesn't exist yet, nothing to pause).
 * - Steps 5-10 failures call rollback() which PAUSES the saga (no cascade-delete).
 * - Step 10 (schedule-onboarding-followups) added: writes onboarding_progress + sends Day 0 email.
 *
 * Flow:
 * Step 1: Create organization row + user + modules (shared DB)
 * Step 2: Configure N8N webhooks (formerly step 5 in old orchestrator)
 * Step 3: Deploy client-specific automations (non-fatal → PAUSE on failure)
 * Step 4: Send onboarding sequence stub (non-fatal → PAUSE on failure; Day 1-3 are N8N-driven)
 * Step 5: Run QA checks (non-fatal → PAUSE on failure)
 * Step 10: Schedule onboarding followups — writes timer + sends Day 0 email (PAUSE on failure)
 */
export async function provisionClient(
  clientId: string,
  clientName: string,
  orgEmail: string,
  tier: 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale',
  clientConfig?: {
    modules?: Partial<ClientModules>;
    branding?: Partial<ClientBranding>;
    integrations?: Partial<ClientIntegrations>;
    deployment?: Partial<ClientDeployment>;
  },
  jobId?: string
): Promise<{ success: boolean; resources?: CreatedResources; error?: string }> {
  // Validate env vars
  const envCheck = validateProvisioningEnv();
  if (!envCheck.valid) {
    return {
      success: false,
      error: `Missing environment variables: ${envCheck.missing.join(', ')}`
    };
  }

  // Normalize tier
  const normalizedTier: Tier = (['starter', 'core'].includes(tier) ? 'core'
    : ['professional', 'growth'].includes(tier) ? 'growth'
    : 'scale') as Tier;

  // Generate and validate client config
  const config = generateClientConfig(clientId, clientName, normalizedTier, clientConfig);
  const validation = validateClientConfig(config);
  if (!validation.valid) {
    return { success: false, error: `Invalid client config: ${validation.errors.join(', ')}` };
  }

  const job: ProvisioningJob = {
    clientId,
    clientName,
    orgEmail,
    tier,
    clientConfig: config,
    createdResources: {}
  };

  const resources: CreatedResources = {};
  let currentStep = 1;

  // ------------------------------------------------------------------
  // Steps 1-4: Pre-org / org creation. Failures return errors directly.
  // Org does not exist yet — no PAUSE needed on failure.
  // ------------------------------------------------------------------
  try {
    // Step 1: Create organization + user + modules in shared DB
    console.log('Step 1/10: Creating organization...');
    const orgResult = await createOrganization(job);
    if (!orgResult.success) {
      return { success: false, error: `Organization creation failed: ${orgResult.error}` };
    }
    Object.assign(resources, orgResult.data);
    job.createdResources = { ...resources };
    currentStep = 2;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Organization creation threw unexpectedly'
    };
  }

  // ------------------------------------------------------------------
  // Steps 2-10: Post-org. Org is alive and usable (ONBOARD-08).
  // Failures call rollback() which PAUSES the saga — no cascade-delete.
  // ------------------------------------------------------------------

  const pauseAndFail = async (step: number, err: unknown): Promise<{ success: boolean; resources: CreatedResources; error: string }> => {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Step ${step} failed (PAUSING saga):`, message);
    if (jobId) {
      await rollback(jobId, step, err instanceof Error ? err : new Error(message), resources as unknown as Record<string, unknown>);
    }
    return { success: false, resources, error: message };
  };

  try {
    // Step 2: Configure N8N webhooks
    console.log('Step 2/10: Configuring N8N webhooks...');
    currentStep = 2;
    const n8nResult = await createN8NWorkflow(job);
    if (!n8nResult.success) {
      return await pauseAndFail(currentStep, new Error(`N8N configuration failed: ${n8nResult.error}`));
    }
    Object.assign(resources, n8nResult.data);
    job.createdResources = { ...resources };
    currentStep = 3;

    // Step 3: Deploy client-specific automations (non-fatal — PAUSE on failure)
    console.log('Step 3/10: Deploying client automations...');
    try {
      const automationResult = await deployAutomations(job);
      if (automationResult.data) {
        Object.assign(resources, automationResult.data);
      }
      job.createdResources = { ...resources };
    } catch (automationError) {
      console.warn('Step 3 warning (non-fatal):', automationError);
    }
    currentStep = 4;

    // Step 4: Onboarding sequence stub (Day 1-3 now N8N-driven via step 10)
    console.log('Step 4/10: Onboarding sequence (stub — Day 1-3 are N8N-driven)...');
    try {
      const onboardingResult = await sendOnboardingSequence(job);
      if (onboardingResult.data) {
        Object.assign(resources, onboardingResult.data);
      }
      job.createdResources = { ...resources };
    } catch (emailError) {
      console.warn('Step 4 warning (non-fatal):', emailError);
    }
    currentStep = 5;

    // Step 5: QA health checks (non-fatal — PAUSE on failure)
    console.log('Step 5/10: Running QA checks...');
    try {
      const qaResult = await runQAChecks(job, resources);
      if (qaResult.data) {
        Object.assign(resources, qaResult.data);
      }
      if (resources.qaResult) {
        const checks = JSON.parse(resources.qaResult);
        if (!checks.all_passed) {
          console.warn('QA checks completed with failures -- review needed:', resources.qaResult);
        }
      }
    } catch (qaError) {
      console.warn('Step 5 warning (non-fatal):', qaError);
    }
    currentStep = 10;

    // Step 10: Schedule onboarding followups — writes onboarding_progress timer + sends Day 0 email
    console.log('Step 10/10: Scheduling onboarding followups...');
    const orgId = resources.organizationId;
    if (orgId) {
      const followupResult = await step10ScheduleFollowups(orgId);
      if (!followupResult.success) {
        return await pauseAndFail(10, new Error(`Schedule-followups failed: ${followupResult.error}`));
      }
    } else {
      console.warn('Step 10: organizationId not in resources, skipping onboarding_progress write');
    }

    console.log('Provisioning complete!');
    return { success: true, resources };

  } catch (error) {
    console.error('Provisioning saga error at step', currentStep, ':', error);
    return await pauseAndFail(currentStep, error);
  }
}

import { ProvisioningJob, CreatedResources, ProvisioningResult } from '../../lib/provisioning/types';
import { validateProvisioningEnv } from '../../lib/provisioning/config';
import { createSupabaseProject } from './steps/01-supabase';
import { cloneSchemaToProject } from './steps/02-database';
import { createGitHubRepo } from './steps/03-github';
import { createVercelProject } from './steps/04-vercel';
import { createN8NWorkflow } from './steps/05-n8n';
import { rollbackProvisioning } from './rollback';

export interface ProvisioningOrchestrator {
  job: ProvisioningJob;
  createdResources: CreatedResources;
}

export async function provisionClient(
  clientId: string,
  clientName: string,
  orgEmail: string,
  tier: 'starter' | 'professional' | 'enterprise' | 'core' | 'growth' | 'scale'
): Promise<{ success: boolean; resources?: CreatedResources; error?: string }> {
  // Validate env vars first
  const envCheck = validateProvisioningEnv();
  if (!envCheck.valid) {
    return {
      success: false,
      error: `Missing environment variables: ${envCheck.missing.join(', ')}`
    };
  }

  const job: ProvisioningJob = {
    clientId,
    clientName,
    orgEmail,
    tier,
    createdResources: {}
  };

  const resources: CreatedResources = {};

  try {
    // Step 1: Create Supabase project
    console.log('Step 1/7: Creating Supabase project...');
    const supabaseResult = await createSupabaseProject(job);
    if (!supabaseResult.success) {
      throw new Error(`Supabase creation failed: ${supabaseResult.error}`);
    }
    Object.assign(resources, supabaseResult.data);
    job.createdResources = { ...resources };

    // Step 2: Clone database schema
    console.log('Step 2/7: Cloning database schema...');
    if (resources.supabaseDatabaseUrl) {
      const schemaResult = await cloneSchemaToProject(
        resources.supabaseDatabaseUrl,
        resources.supabaseProjectRef || ''
      );
      if (!schemaResult.success) {
        throw new Error(`Schema cloning failed: ${schemaResult.error}`);
      }
    }

    // Step 3: Create GitHub repo
    console.log('Step 3/7: Creating GitHub repository...');
    const githubResult = await createGitHubRepo(job);
    if (!githubResult.success) {
      throw new Error(`GitHub creation failed: ${githubResult.error}`);
    }
    Object.assign(resources, githubResult.data);
    job.createdResources = { ...resources };

    // Step 4: Create Vercel deployment
    console.log('Step 4/7: Creating Vercel deployment...');
    const vercelResult = await createVercelProject(job, resources);
    if (!vercelResult.success) {
      throw new Error(`Vercel creation failed: ${vercelResult.error}`);
    }
    Object.assign(resources, vercelResult.data);
    job.createdResources = { ...resources };

    // Step 5: Configure N8N webhooks
    console.log('Step 5/7: Configuring N8N webhooks...');
    const n8nResult = await createN8NWorkflow(job);
    if (!n8nResult.success) {
      throw new Error(`N8N configuration failed: ${n8nResult.error}`);
    }
    Object.assign(resources, n8nResult.data);

    // Step 6: Deploy client-specific automations
    console.log('Step 6/7: Deploying client automations...');
    try {
      // Deploy N8N workflow templates matched to their solution blueprint
      // This step is optional and may not have templates assigned yet
      console.log('  → Automation templates will be configured during onboarding');
      job.createdResources = { ...resources };
    } catch (automationError) {
      console.warn('Step 6 warning (non-fatal):', automationError);
      // Non-fatal: automations can be deployed later
    }

    // Step 7: Trigger onboarding email sequence
    console.log('Step 7/7: Sending onboarding emails...');
    try {
      const { triggerOnboardingEmail } = await import('../../lib/n8n/webhooks');
      await triggerOnboardingEmail({
        organizationId: clientId,
        email: orgEmail,
        clientName: clientName,
        tier: tier,
        deploymentUrl: resources.vercelDeploymentUrl,
      });
    } catch (emailError) {
      console.warn('Step 7 warning (non-fatal):', emailError);
      // Non-fatal: onboarding emails can be sent manually
    }

    console.log('Provisioning complete!');
    return { success: true, resources };

  } catch (error) {
    console.error('Provisioning failed:', error);

    // Saga rollback
    await rollbackProvisioning(resources);

    return {
      success: false,
      resources,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

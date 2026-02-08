import { backOff } from 'exponential-backoff';
import { ProvisioningJob, ProvisioningResult, CreatedResources } from '../../../lib/provisioning/types';

const VERCEL_API = 'https://api.vercel.com';

interface VercelEnvVar {
  key: string;
  value: string;
  type: 'encrypted' | 'plain';
  target: ('production' | 'preview' | 'development')[];
}

export async function createVercelProject(
  job: ProvisioningJob,
  supabaseCredentials: Partial<CreatedResources>
): Promise<ProvisioningResult> {
  const token = process.env.VERCEL_TOKEN;
  const teamId = process.env.VERCEL_TEAM_ID;
  const githubOrg = process.env.GITHUB_ORG;

  if (!token) {
    return {
      success: false,
      step: 'vercel-deployment',
      error: 'Missing VERCEL_TOKEN environment variable'
    };
  }

  try {
    const repoName = job.createdResources?.githubRepoName || `client-${job.clientId}-app`;
    const projectName = repoName;

    // Build query string for team (optional)
    const teamQuery = teamId ? `?teamId=${teamId}` : '';

    // Step 1: Check if project exists (idempotency)
    const existsResponse = await fetch(
      `${VERCEL_API}/v9/projects/${projectName}${teamQuery}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (existsResponse.ok) {
      const existing = await existsResponse.json();
      console.log(`Vercel project ${projectName} already exists, skipping creation`);
      return {
        success: true,
        step: 'vercel-deployment',
        data: {
          vercelProjectId: existing.id,
          vercelDeploymentUrl: `https://${projectName}.vercel.app`
        }
      };
    }

    // Step 2: Create project linked to GitHub repo
    console.log(`Creating Vercel project: ${projectName}`);
    const createResponse = await fetch(
      `${VERCEL_API}/v9/projects${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: projectName,
          gitRepository: {
            repo: `${githubOrg}/${repoName}`,
            type: 'github'
          },
          framework: 'nextjs',
          buildCommand: 'npm run build',
          outputDirectory: '.next'
        })
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      return {
        success: false,
        step: 'vercel-deployment',
        error: `Failed to create Vercel project: ${error}`
      };
    }

    const project = await createResponse.json();
    console.log(`Created Vercel project: ${project.id}`);

    // Step 3: Set environment variables BEFORE first deployment
    const envVars: VercelEnvVar[] = [
      { key: 'NEXT_PUBLIC_SUPABASE_URL', value: `https://${supabaseCredentials.supabaseProjectRef}.supabase.co`, type: 'plain', target: ['production', 'preview'] },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: supabaseCredentials.supabaseAnonKey || '', type: 'encrypted', target: ['production', 'preview'] },
      { key: 'SUPABASE_SERVICE_ROLE_KEY', value: supabaseCredentials.supabaseServiceRoleKey || '', type: 'encrypted', target: ['production'] },
      { key: 'NEXT_PUBLIC_APP_URL', value: `https://${projectName}.vercel.app`, type: 'plain', target: ['production', 'preview'] }
    ];

    await setVercelEnvVars(project.id, envVars, token, teamId);

    // Step 4: Trigger initial deployment
    const deployResult = await triggerVercelDeployment(project.id, repoName, githubOrg || '', token, teamId);

    return {
      success: true,
      step: 'vercel-deployment',
      data: {
        vercelProjectId: project.id,
        vercelDeploymentUrl: deployResult.url || `https://${projectName}.vercel.app`
      }
    };
  } catch (error) {
    console.error('Vercel project creation failed:', error);
    return {
      success: false,
      step: 'vercel-deployment',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function setVercelEnvVars(
  projectId: string,
  envVars: VercelEnvVar[],
  token: string,
  teamId?: string
): Promise<void> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  for (const envVar of envVars) {
    if (!envVar.value) {
      console.warn(`Skipping empty env var: ${envVar.key}`);
      continue;
    }

    const response = await fetch(
      `${VERCEL_API}/v10/projects/${projectId}/env${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(envVar)
      }
    );

    if (!response.ok) {
      console.error(`Failed to set env var ${envVar.key}: ${await response.text()}`);
    } else {
      console.log(`Set env var: ${envVar.key}`);
    }
  }
}

export async function triggerVercelDeployment(
  projectId: string,
  repoName: string,
  githubOrg: string,
  token: string,
  teamId?: string
): Promise<{ url?: string; id?: string }> {
  const teamQuery = teamId ? `?teamId=${teamId}` : '';

  try {
    const response = await fetch(
      `${VERCEL_API}/v13/deployments${teamQuery}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: repoName,
          gitSource: {
            type: 'github',
            repo: `${githubOrg}/${repoName}`,
            ref: 'main'
          }
        })
      }
    );

    if (!response.ok) {
      console.error(`Failed to trigger deployment: ${await response.text()}`);
      return {};
    }

    const deployment = await response.json();
    console.log(`Triggered deployment: ${deployment.id}`);

    return { url: deployment.url, id: deployment.id };
  } catch (error) {
    console.error('Failed to trigger deployment:', error);
    return {};
  }
}

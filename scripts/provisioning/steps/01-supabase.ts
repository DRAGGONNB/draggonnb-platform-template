import { backOff } from 'exponential-backoff';
import { randomBytes } from 'crypto';
import { ProvisioningJob, ProvisioningResult } from '../../../lib/provisioning/types';
import { getSupabaseManagementConfig } from '../../../lib/provisioning/config';

interface SupabaseProject {
  id: string;
  ref: string;
  name: string;
  status: string;
}

interface SupabaseProjectCredentials {
  anon_key: string;
  service_role_key: string;
  db_host: string;
  db_port: number;
  db_user: string;
  db_pass: string;
}

export async function createSupabaseProject(job: ProvisioningJob): Promise<ProvisioningResult> {
  try {
    const { token, orgId } = getSupabaseManagementConfig();
    const projectName = `client-${job.clientId}-prod`;

    // Step 1: Check if project already exists (idempotency)
    const existingProject = await findProjectByName(projectName, token, orgId);
    if (existingProject) {
      console.log(`Supabase project "${projectName}" already exists, retrieving credentials...`);

      // Get credentials for existing project
      const credentials = await getProjectCredentials(existingProject.id, token);

      return {
        success: true,
        step: 'supabase-project',
        data: {
          supabaseProjectId: existingProject.id,
          supabaseProjectRef: existingProject.ref,
          supabaseAnonKey: credentials.anon_key,
          supabaseServiceRoleKey: credentials.service_role_key,
          supabaseDatabaseUrl: `postgresql://${credentials.db_user}:${credentials.db_pass}@${credentials.db_host}:${credentials.db_port}/postgres`
        }
      };
    }

    // Step 2: Create new project
    console.log(`Creating Supabase project: ${projectName}`);
    const dbPassword = generateSecurePassword();

    const project = await backOff(
      async () => {
        const response = await fetch('https://api.supabase.com/v1/projects', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: projectName,
            organization_id: orgId,
            region: 'af-south-1',
            plan: 'pro',
            db_pass: dbPassword
          })
        });

        if (response.status === 429) {
          throw new Error('Rate limited - will retry');
        }

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Failed to create project: ${error}`);
        }

        return await response.json();
      },
      {
        numOfAttempts: 5,
        startingDelay: 1000,
        timeMultiple: 2,
        maxDelay: 10000
      }
    );

    console.log(`Created Supabase project: ${project.id}`);

    // Step 3: Wait for project to be ready
    const readyProject = await waitForProjectReady(project.id, token);

    // Step 4: Get credentials
    const credentials = await getProjectCredentials(project.id, token);

    return {
      success: true,
      step: 'supabase-project',
      data: {
        supabaseProjectId: project.id,
        supabaseProjectRef: readyProject.ref,
        supabaseAnonKey: credentials.anon_key,
        supabaseServiceRoleKey: credentials.service_role_key,
        supabaseDatabaseUrl: `postgresql://${credentials.db_user}:${dbPassword}@${credentials.db_host}:${credentials.db_port}/postgres`
      }
    };

  } catch (error) {
    console.error('Supabase project creation failed:', error);
    return {
      success: false,
      step: 'supabase-project',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

export async function waitForProjectReady(projectId: string, token: string): Promise<SupabaseProject> {
  console.log(`Waiting for project ${projectId} to be ready...`);

  return await backOff(
    async () => {
      const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to check project status');
      }

      const project: SupabaseProject = await response.json();

      if (project.status !== 'ACTIVE_HEALTHY') {
        throw new Error(`Project not ready yet (status: ${project.status})`);
      }

      console.log(`Project ${projectId} is ready (status: ${project.status})`);
      return project;
    },
    {
      numOfAttempts: 36, // 3 minutes with 5s delay
      startingDelay: 5000,
      timeMultiple: 1,
      maxDelay: 5000
    }
  );
}

async function findProjectByName(name: string, token: string, orgId: string): Promise<SupabaseProject | null> {
  try {
    const response = await fetch(`https://api.supabase.com/v1/projects?organization_id=${orgId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!response.ok) {
      return null;
    }

    const projects: SupabaseProject[] = await response.json();
    return projects.find(p => p.name === name) || null;
  } catch (error) {
    console.error('Failed to search for existing project:', error);
    return null;
  }
}

async function getProjectCredentials(projectId: string, token: string): Promise<SupabaseProjectCredentials> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${projectId}/api-keys`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  if (!response.ok) {
    throw new Error('Failed to retrieve project credentials');
  }

  return await response.json();
}

function generateSecurePassword(): string {
  return randomBytes(24).toString('base64url');
}
